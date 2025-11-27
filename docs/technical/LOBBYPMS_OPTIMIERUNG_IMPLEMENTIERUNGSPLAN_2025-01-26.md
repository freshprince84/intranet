# LobbyPMS Optimierung: Implementierungsplan (2025-01-26)

**Datum:** 2025-01-26  
**Status:** 📋 PLAN - Bereit zur Implementierung  
**Problem:** 6000+ Reservierungen werden geladen, obwohl nur letzte 24h benötigt werden  
**Lösung:** Früher stoppen + Caching kombinieren

---

## 🎯 ZIEL

**Von:** 60+ Requests, 6100 Reservierungen, ~30 Sekunden  
**Zu:** 1-5 Requests, 10-50 Reservierungen, ~2-5 Sekunden  
**Verbesserung:** **10-30x schneller, 100-600x weniger Daten!**

---

## 📋 IMPLEMENTIERUNGSPLAN

### Phase 1: Früher stoppen bei Pagination (SOFORT)

**Datei:** `backend/src/services/lobbyPmsService.ts:298-421`

**Änderung:** Prüfe `creation_date` nach jeder Seite, stoppe wenn alle Reservierungen älter als `startDate` sind.

**Code-Änderung:**
```typescript
async fetchReservations(startDate: Date, endDate: Date): Promise<LobbyPmsReservation[]> {
  // ... bestehender Code bis zur while-Schleife ...
  
  let allReservations: LobbyPmsReservation[] = [];
  let page = 1;
  let hasMore = true;
  const maxPages = 200;
  let knownTotalPages: number | undefined = undefined;
  let consecutiveOldPages = 0; // ✅ NEU: Zähler für aufeinanderfolgende "alte" Seiten
  const MAX_CONSECUTIVE_OLD_PAGES = 3; // ✅ NEU: Stoppe nach 3 Seiten ohne neue Reservierungen

  while (hasMore && page <= maxPages) {
    const response = await this.axiosInstance.get<any>('/api/v1/bookings', {
      params: { ...params, page },
      validateStatus: (status) => status < 500
    });

    // ... bestehender Code zum Parsen der Response ...
    
    const pageReservations = /* ... parse response ... */;
    
    // ✅ NEU: Filtere sofort nach creation_date (statt erst am Ende)
    const recentReservations = pageReservations.filter((reservation: LobbyPmsReservation) => {
      if (!reservation.creation_date) {
        return false;
      }
      const creationDate = new Date(reservation.creation_date);
      const afterStartDate = creationDate >= startDate;
      const beforeEndDate = !endDate || creationDate <= endDate;
      return afterStartDate && beforeEndDate;
    });
    
    // ✅ NEU: Prüfe ob neue Reservierungen gefunden wurden
    if (recentReservations.length > 0) {
      // Neue Reservierungen gefunden - füge hinzu
      allReservations = allReservations.concat(recentReservations);
      consecutiveOldPages = 0; // Reset Counter
      console.log(`[LobbyPMS] Seite ${page}: ${recentReservations.length} neue Reservierungen (von ${pageReservations.length} insgesamt)`);
    } else {
      // Keine neuen Reservierungen auf dieser Seite
      consecutiveOldPages++;
      console.log(`[LobbyPMS] Seite ${page}: 0 neue Reservierungen (${consecutiveOldPages}/${MAX_CONSECUTIVE_OLD_PAGES} aufeinanderfolgende "alte" Seiten)`);
      
      // ✅ NEU: Stoppe nach X Seiten ohne neue Reservierungen
      if (consecutiveOldPages >= MAX_CONSECUTIVE_OLD_PAGES) {
        console.log(`[LobbyPMS] Stoppe Pagination: ${MAX_CONSECUTIVE_OLD_PAGES} aufeinanderfolgende Seiten ohne neue Reservierungen`);
        hasMore = false;
        break;
      }
    }

    // ... bestehender Code für Pagination-Logik ...
    
    // ✅ ENTFERNT: allReservations.concat(pageReservations) - wird jetzt oben gemacht
    // ✅ ENTFERNT: Client-seitiges Filtern am Ende - wird jetzt inline gemacht
  }

  // ✅ ENTFERNT: Client-seitiges Filtern (wird jetzt inline gemacht)
  return allReservations; // Bereits gefiltert!
}
```

**Erwartete Verbesserung:**
- Von: 60+ Requests (alle Seiten)
- Zu: 5-10 Requests (nur relevante Seiten + Buffer)
- **6-12x schneller!**

---

### Phase 2: Caching der letzten Sync-Zeit (MITTELFRISTIG)

#### 2.1 Datenbank-Schema erweitern

**Datei:** `backend/prisma/schema.prisma`

**Änderung:**
```prisma
model Branch {
  // ... bestehende Felder ...
  lobbyPmsSettings      Json?
  lobbyPmsLastSyncAt    DateTime? // ✅ NEU: Letzte erfolgreiche Sync-Zeit
}
```

**Migration:**
```bash
npx prisma migrate dev --name add_lobby_pms_last_sync_at
```

#### 2.2 Sync-Service anpassen

**Datei:** `backend/src/services/lobbyPmsReservationSyncService.ts:18-86`

**Code-Änderung:**
```typescript
static async syncReservationsForBranch(
  branchId: number,
  startDate?: Date,
  endDate?: Date
): Promise<number> {
  try {
    // Lade Branch mit lastSyncAt
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: {
        lobbyPmsLastSyncAt: true, // ✅ NEU
        organizationId: true,
        // ... andere Felder ...
      },
      include: { 
        organization: {
          select: {
            id: true,
            settings: true
          }
        }
      }
    });

    // ... bestehender Code für Settings-Prüfung ...

    // ✅ NEU: Verwende lastSyncAt wenn vorhanden, sonst letzte 24h
    let syncStartDate: Date;
    if (startDate) {
      // Explizites startDate übergeben (z.B. manueller Sync)
      syncStartDate = startDate;
    } else if (branch?.lobbyPmsLastSyncAt) {
      // Verwende letzte Sync-Zeit (z.B. vor 10 Minuten)
      syncStartDate = branch.lobbyPmsLastSyncAt;
      console.log(`[LobbyPmsSync] Branch ${branchId}: Verwende letzte Sync-Zeit: ${syncStartDate.toISOString()}`);
    } else {
      // Erster Sync: letzte 24 Stunden
      syncStartDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      console.log(`[LobbyPmsSync] Branch ${branchId}: Erster Sync, verwende letzte 24 Stunden`);
    }

    // Erstelle LobbyPMS Service für Branch
    const lobbyPmsService = await LobbyPmsService.createForBranch(branchId);

    // Hole Reservierungen von LobbyPMS und synchronisiere sie
    const syncedCount = await lobbyPmsService.syncReservations(syncStartDate);

    console.log(`[LobbyPmsSync] Branch ${branchId}: ${syncedCount} Reservierungen synchronisiert`);

    // ✅ NEU: Speichere erfolgreiche Sync-Zeit
    if (syncedCount >= 0) { // Auch bei 0 (keine neuen Reservierungen) speichern
      await prisma.branch.update({
        where: { id: branchId },
        data: {
          lobbyPmsLastSyncAt: new Date(), // Aktuelle Zeit
        }
      });
      console.log(`[LobbyPmsSync] Branch ${branchId}: Sync-Zeit gespeichert`);
    }

    return syncedCount;
  } catch (error) {
    console.error(`[LobbyPmsSync] Fehler beim Synchronisieren für Branch ${branchId}:`, error);
    throw error;
  }
}
```

**Erwartete Verbesserung:**
- Von: 6100 Reservierungen (letzte 24h)
- Zu: 10-50 Reservierungen (seit letztem Sync, z.B. 10 Minuten)
- **100-600x weniger Daten!**

---

## 📊 ERWARTETE GESAMT-VERBESSERUNG

### Vorher:
- **Requests:** 60+ (alle Seiten)
- **Daten:** 6100 Reservierungen
- **Zeit:** ~30 Sekunden

### Nachher (Phase 1 + 2):
- **Requests:** 1-5 (nur relevante Seiten)
- **Daten:** 10-50 Reservierungen
- **Zeit:** ~2-5 Sekunden

### Verbesserung:
- **Performance:** **6-15x schneller**
- **Daten-Transfer:** **100-600x weniger Daten**
- **Kombiniert:** **Dramatische Verbesserung!**

---

## 🎯 IMPLEMENTIERUNGS-REIHENFOLGE

### Schritt 1: Phase 1 implementieren (SOFORT)
1. Code-Änderung in `lobbyPmsService.ts`
2. Testen auf Server
3. Logs prüfen (sollte früher stoppen)

### Schritt 2: Phase 2 implementieren (MITTELFRISTIG)
1. Datenbank-Schema erweitern
2. Migration erstellen
3. Code-Änderung in `lobbyPmsReservationSyncService.ts`
4. Testen auf Server
5. Logs prüfen (sollte weniger Daten laden)

### Schritt 3: Kombination testen (LANGFRISTIG)
1. Beide Optimierungen zusammen testen
2. Performance messen
3. Logs analysieren

---

## ⚠️ WICHTIGE HINWEISE

### Phase 1 (Früher stoppen):
- **MAX_CONSECUTIVE_OLD_PAGES = 3** ist ein Kompromiss
  - Zu niedrig: Könnte neue Reservierungen verpassen
  - Zu hoch: Lädt zu viele unnötige Seiten
  - **Empfehlung:** Mit 3 starten, bei Bedarf anpassen

### Phase 2 (Caching):
- **Erster Sync:** Lädt trotzdem letzte 24h (kein lastSyncAt vorhanden)
- **Nach erster Sync:** Lädt nur seit letztem Sync
- **Manueller Sync:** Kann explizites `startDate` übergeben (wird nicht überschrieben)

---

## 📝 TEST-ANLEITUNG

### Test Phase 1:
```bash
# Auf Server: Sync manuell auslösen
# Logs prüfen: Sollte früher stoppen (nach 3 Seiten ohne neue Reservierungen)
```

### Test Phase 2:
```bash
# Auf Server: Sync zweimal auslösen
# Erster Sync: Sollte letzte 24h laden
# Zweiter Sync: Sollte nur seit letztem Sync laden (viel weniger Daten)
```

---

**Erstellt:** 2025-01-26  
**Status:** 📋 PLAN BEREIT - Kann implementiert werden  
**Nächster Schritt:** Phase 1 implementieren


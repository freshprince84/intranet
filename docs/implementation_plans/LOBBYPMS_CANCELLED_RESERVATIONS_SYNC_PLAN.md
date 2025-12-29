# LobbyPMS Cancelled Reservations Sync - Implementierungsplan

**Datum**: 2025-01-26  
**Status**: 📋 Planung - Prüfung erforderlich vor Implementierung

---

## Problem

Reservation 18586160 wurde vor ~10 Stunden in LobbyPMS gecancelt, wird aber nicht synchronisiert (Status bleibt `confirmed`).

**Siehe auch**: `docs/analysis/LOBBYPMS_CANCELLED_RESERVATIONS_API_ANALYSE.md`

---

## Bekannte Fakten

### LobbyPMS API-Endpunkte (aus Code-Analyse)

1. **Liste aller Reservationen**: 
   - Endpoint: `GET /api/v1/bookings`
   - Verwendet in: `fetchReservations()`, `fetchReservationsByCheckoutDate()`
   - **Unbekannt**: Werden gecancelte Reservationen in dieser Liste zurückgegeben?

2. **Einzelne Reservation per ID**:
   - Endpoint: `GET /reservations/${reservationId}`
   - Verwendet in: `fetchReservationById()` (Zeile 750-785)
   - **Funktioniert**: Methode existiert und wird verwendet

### Aktuelle Implementierung

**`syncExistingReservations()`** (Zeile 1375-1430):
- Ruft `fetchReservationsByCheckoutDate(today)` auf
- Verwendet Liste-Endpoint `/api/v1/bookings`
- **Problem**: Wenn gecancelte Reservationen NICHT in Liste enthalten sind, werden sie nicht gefunden

---

## Prüfung erforderlich (VOR Implementierung)

### Prüfung 1: Ist Reservation 18586160 in Liste enthalten?

**Test**:
```bash
# Test: Hole Liste von LobbyPMS API
GET /api/v1/bookings?per_page=100&page=1

# Prüfe: Ist Reservation 18586160 in der Liste enthalten?
# Prüfe: Hat Reservation Status 'cancelled' oder 'cancelado'?
```

### Prüfung 2: Funktioniert direkter Abruf per ID?

**Test**:
```bash
# Test: Hole Reservation direkt per ID
GET /reservations/18586160

# Prüfe: Wird Reservation zurückgegeben?
# Prüfe: Enthält Response Status 'cancelled' oder 'cancelado'?
```

### Prüfung 3: Logs prüfen

**Test**:
```bash
# Prüfe Sync-Logs
pm2 logs intranet-backend --lines 1000 | grep -i "syncExistingReservations\|18586160\|cancelled"

# Prüfe: Wird syncExistingReservations() aufgerufen?
# Prüfe: Wird Reservation 18586160 gefunden?
# Prüfe: Welcher Status wird zurückgegeben?
```

---

## Lösungsansätze (basierend auf Prüfung)

### Lösung A: Gecancelte Reservationen sind in Liste enthalten

**Problem**: Status wird nicht korrekt gemappt
**Lösung**: Status-Logik korrigieren (bereits gemacht in Zeile 1090-1098)
**Status**: ✅ Bereits implementiert

### Lösung B: Gecancelte Reservationen sind NICHT in Liste, aber per ID abrufbar

**Problem**: `fetchReservationsByCheckoutDate()` findet gecancelte Reservationen nicht
**Lösung**: Bestehende Reservationen direkt per ID abrufen

**Implementierung**:
```typescript
async syncExistingReservations(): Promise<number> {
  if (!this.branchId) {
    throw new Error('LobbyPmsService.syncExistingReservations: branchId ist nicht gesetzt!');
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  logger.log(`[LobbyPMS] Starte Aktualisierung bestehender Reservationen mit check_out_date >= ${today.toISOString()}`);

  // NEUE STRATEGIE: Finde alle bestehenden Reservationen in der DB
  // und rufe sie direkt per ID von der API ab
  const existingReservations = await prisma.reservation.findMany({
    where: {
      branchId: this.branchId,
      lobbyReservationId: { not: null },
      checkOutDate: { gte: today }
    },
    select: {
      id: true,
      lobbyReservationId: true,
      status: true,
      guestName: true
    }
  });

  logger.log(`[LobbyPMS] Gefunden ${existingReservations.length} bestehende Reservationen in der DB zur Aktualisierung`);

  let updatedCount = 0;
  let notFoundCount = 0;
  let errorCount = 0;

  // Versuche jede Reservation direkt per ID von der API abzurufen
  for (const existingReservation of existingReservations) {
    if (!existingReservation.lobbyReservationId) {
      continue;
    }

    try {
      const bookingId = existingReservation.lobbyReservationId;
      
      // Rufe Reservation direkt per ID ab
      const lobbyReservation = await this.fetchReservationById(bookingId);
      
      const statusFromApi = lobbyReservation.status || (lobbyReservation.checked_out ? 'checked_out' : lobbyReservation.checked_in ? 'checked_in' : 'unknown');
      const oldStatus = existingReservation.status;
      
      logger.log(`[LobbyPMS] Aktualisiere Reservation ${bookingId} (${existingReservation.guestName}): ${oldStatus} → ${statusFromApi}`);
      
      // syncReservation() verwendet upsert, aktualisiert also bestehende Reservationen
      const updatedReservation = await this.syncReservation(lobbyReservation);
      
      // Logge wenn Status geändert wurde
      if (updatedReservation.status === ReservationStatus.cancelled && oldStatus !== ReservationStatus.cancelled) {
        logger.log(`[LobbyPMS] ✅ Reservation ${bookingId} (${existingReservation.guestName}) wurde auf 'cancelled' aktualisiert`);
      }
      
      updatedCount++;
    } catch (error) {
      if (error instanceof Error && error.message === 'Reservierung nicht gefunden') {
        notFoundCount++;
        logger.warn(`[LobbyPMS] Reservation ${existingReservation.lobbyReservationId} (${existingReservation.guestName}) nicht in LobbyPMS API gefunden`);
      } else {
        errorCount++;
        logger.error(`[LobbyPMS] Fehler beim Aktualisieren der Reservierung ${existingReservation.lobbyReservationId}:`, error);
      }
    }
  }

  logger.log(`[LobbyPMS] Aktualisierung abgeschlossen: ${updatedCount} aktualisiert, ${notFoundCount} nicht gefunden, ${errorCount} Fehler`);
  return updatedCount;
}
```

**Vorteile**:
- Funktioniert auch wenn gecancelte Reservationen nicht in Liste enthalten sind
- Direkter Abruf per ID ist zuverlässiger
- Prüft nur Reservationen, die tatsächlich in DB existieren

**Nachteile**:
- Mehr API-Calls (ein Call pro Reservation)
- Langsamer bei vielen Reservationen

### Lösung C: Gecancelte Reservationen sind weder in Liste noch per ID abrufbar

**Problem**: LobbyPMS API gibt gecancelte Reservationen nicht zurück
**Lösung**: Andere Strategie erforderlich (z.B. Webhooks, manuelle Synchronisation)

---

## Empfohlene Lösung

**Basierend auf Code-Analyse**: Lösung B (direkter Abruf per ID)

**Begründung**:
1. `fetchReservationById()` existiert bereits und funktioniert
2. Gecancelte Reservationen könnten aus Liste gefiltert sein
3. Direkter Abruf per ID ist zuverlässiger
4. Performance ist akzeptabel (nur aktive Reservationen werden geprüft)

---

## Implementierungsschritte

### Schritt 1: Prüfung durchführen

**VOR Implementierung**:
1. Test: Reservation 18586160 per ID abrufen
2. Test: Prüfe ob in Liste enthalten
3. Logs prüfen: Wird Reservation gefunden?

### Schritt 2: Implementierung (wenn Lösung B bestätigt)

**Datei**: `backend/src/services/lobbyPmsService.ts`

**Methode**: `syncExistingReservations()` (Zeile 1375-1430)

**Änderung**: 
- Ersetze `fetchReservationsByCheckoutDate()` durch direkten Abruf per ID
- Finde alle bestehenden Reservationen in DB
- Rufe jede Reservation per `fetchReservationById()` ab
- Aktualisiere Status

### Schritt 3: Testing

**Test-Szenarien**:
1. Reservation in LobbyPMS canceln
2. Warte auf automatischen Sync
3. Prüfe ob Status auf `cancelled` aktualisiert wurde

---

## Code-Referenzen

### API-Endpunkte
- **Liste**: `backend/src/services/lobbyPmsService.ts` Zeile 452, 603 - `/api/v1/bookings`
- **Einzelne Reservation**: `backend/src/services/lobbyPmsService.ts` Zeile 758 - `/reservations/${id}`

### Methoden
- **fetchReservationById()**: Zeile 750-785
- **syncExistingReservations()**: Zeile 1375-1430 (zu ändern)

---

## Offene Fragen

1. **Werden gecancelte Reservationen in `/api/v1/bookings` zurückgegeben?**
   - Muss geprüft werden

2. **Funktioniert `/reservations/${id}` für gecancelte Reservationen?**
   - Muss geprüft werden

3. **Wie viele Reservationen mit `check_out_date >= heute` gibt es typischerweise?**
   - Performance-Überlegung für Lösung B


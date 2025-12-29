# LobbyPMS Cancelled Reservations API - Analyse und Prüfplan

**Datum**: 2025-01-26  
**Status**: 📋 Analyse - Prüfung erforderlich

---

## Problem

Reservation 18586160 wurde vor ~10 Stunden in LobbyPMS gecancelt, wird aber nicht synchronisiert (Status bleibt `confirmed`).

---

## Bekannte Fakten aus Code-Analyse

### LobbyPMS API-Endpunkte (aus Code)

1. **Liste aller Reservationen**: 
   - Endpoint: `GET /api/v1/bookings`
   - Verwendet in: `fetchReservations()` (Zeile 452), `fetchReservationsByCheckoutDate()` (Zeile 603)
   - Parameter: `per_page`, `page`, `property_id`
   - Response: `{ data: [...], meta: {...} }`

2. **Einzelne Reservation per ID**:
   - Endpoint: `GET /reservations/${reservationId}`
   - Verwendet in: `fetchReservationById()` (Zeile 758)
   - Response: `{ success: true, data: {...} }` oder direktes Objekt

### Aktuelle Implementierung

**`syncExistingReservations()`** (Zeile 1375-1430):
- Ruft `fetchReservationsByCheckoutDate(today)` auf
- `fetchReservationsByCheckoutDate()` verwendet `/api/v1/bookings` mit Pagination
- Filtert client-seitig nach `check_out_date >= heute`
- Ruft `syncReservation()` für jede gefundene Reservation auf

**Problem**: Wenn gecancelte Reservationen NICHT in der Liste `/api/v1/bookings` zurückgegeben werden, werden sie nicht gefunden.

---

## Zu prüfende Fragen

### Frage 1: Werden gecancelte Reservationen in `/api/v1/bookings` zurückgegeben?

**Prüfung erforderlich**:
- Test: Reservation 18586160 in LobbyPMS API abrufen
- Methode 1: Liste `/api/v1/bookings` durchsuchen (mit Pagination)
- Methode 2: Direkt per ID `/reservations/18586160` abrufen

**Erwartete Ergebnisse**:
- **Szenario A**: Gecancelte Reservationen sind in Liste enthalten → Problem liegt woanders
- **Szenario B**: Gecancelte Reservationen sind NICHT in Liste enthalten → Lösung: `fetchReservationById()` verwenden

### Frage 2: Funktioniert `/reservations/${id}` für gecancelte Reservationen?

**Prüfung erforderlich**:
- Test: `GET /reservations/18586160` direkt aufrufen
- Prüfen ob Response Status `cancelled` enthält

**Erwartete Ergebnisse**:
- **Szenario A**: Endpoint funktioniert, gibt Status zurück → Lösung: `fetchReservationById()` verwenden
- **Szenario B**: Endpoint gibt 404 oder keinen Status → Andere Lösung erforderlich

---

## Prüfplan

### Schritt 1: Prüfe ob Reservation 18586160 in Liste enthalten ist

**Test 1.1: Liste durchsuchen**
```bash
# Test: Hole alle Reservationen mit check_out_date >= heute
# Prüfe ob Reservation 18586160 in der Liste enthalten ist
```

**Test 1.2: Direkt per ID abrufen**
```bash
# Test: GET /reservations/18586160
# Prüfe ob Response Status 'cancelled' enthält
```

### Schritt 2: Prüfe Logs

**Was in Logs prüfen**:
1. Wird `syncExistingReservations()` aufgerufen?
2. Wie viele Reservationen werden gefunden?
3. Wird Reservation 18586160 gefunden?
4. Welcher Status wird von API zurückgegeben?

**Log-Befehle**:
```bash
# Prüfe Sync-Logs
pm2 logs intranet-backend --lines 1000 | grep -i "syncExistingReservations\|18586160\|cancelled"

# Prüfe welche Reservationen gefunden werden
pm2 logs intranet-backend --lines 1000 | grep -i "Gefunden.*Reservationen zur Aktualisierung"

# Prüfe Status-Updates
pm2 logs intranet-backend --lines 1000 | grep -i "Aktualisiere Reservation.*mit Status"
```

### Schritt 3: Manueller Test via API

**Test 3.1: Reservation per ID abrufen**
- Endpoint: `GET /reservations/18586160` (LobbyPMS API)
- Prüfe Response: Enthält `status: 'cancelled'` oder `status: 'cancelado'`?

**Test 3.2: Liste durchsuchen**
- Endpoint: `GET /api/v1/bookings?per_page=100&page=1` (LobbyPMS API)
- Prüfe: Ist Reservation 18586160 in der Liste enthalten?

---

## Mögliche Lösungen (basierend auf Prüfung)

### Lösung A: Gecancelte Reservationen sind in Liste enthalten

**Problem**: Status wird nicht korrekt gemappt oder überschrieben
**Lösung**: Status-Logik korrigieren (bereits gemacht)

### Lösung B: Gecancelte Reservationen sind NICHT in Liste enthalten, aber per ID abrufbar

**Problem**: `fetchReservationsByCheckoutDate()` findet gecancelte Reservationen nicht
**Lösung**: 
1. Finde alle bestehenden Reservationen in DB mit `check_out_date >= heute`
2. Rufe jede Reservation direkt per ID ab (`fetchReservationById()`)
3. Aktualisiere Status

**Code-Änderung**:
```typescript
async syncExistingReservations(): Promise<number> {
  // 1. Finde alle bestehenden Reservationen in DB
  const existingReservations = await prisma.reservation.findMany({
    where: {
      branchId: this.branchId,
      lobbyReservationId: { not: null },
      checkOutDate: { gte: today }
    }
  });

  // 2. Rufe jede Reservation direkt per ID ab
  for (const existingReservation of existingReservations) {
    const lobbyReservation = await this.fetchReservationById(existingReservation.lobbyReservationId);
    await this.syncReservation(lobbyReservation);
  }
}
```

### Lösung C: Gecancelte Reservationen sind weder in Liste noch per ID abrufbar

**Problem**: LobbyPMS API gibt gecancelte Reservationen nicht zurück
**Lösung**: Andere Strategie erforderlich (z.B. Webhooks, manuelle Synchronisation)

---

## Nächste Schritte

1. **JETZT prüfen**: 
   - Reservation 18586160 per ID abrufen: `GET /reservations/18586160`
   - Prüfen ob in Liste enthalten: `GET /api/v1/bookings` durchsuchen
   - Logs prüfen: Wird Reservation gefunden?

2. **Basierend auf Prüfung**: Lösung implementieren

3. **Testen**: Reservation canceln und prüfen ob Status synchronisiert wird

---

## Code-Referenzen

### API-Endpunkte
- **Liste**: `backend/src/services/lobbyPmsService.ts` Zeile 452, 603 - `/api/v1/bookings`
- **Einzelne Reservation**: `backend/src/services/lobbyPmsService.ts` Zeile 758 - `/reservations/${id}`

### Methoden
- **fetchReservationsByCheckoutDate()**: Zeile 577-708
- **fetchReservationById()**: Zeile 750-785
- **syncExistingReservations()**: Zeile 1375-1430


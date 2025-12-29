# LobbyPMS Cancelled Reservations API - Fakten

**Datum**: 2025-01-26  
**Status**: 📋 Analyse basierend auf Test-Ergebnissen

---

## Test-Ergebnisse (aus Terminal-Output)

### Reservation 18586160 (gecancelt in LobbyPMS)

**Test 1: GET /api/v1/bookings/18586160**
- ❌ Status: 404
- Error: `"No query results for model [App\\Models\\Booking]."`
- **Fazit**: Endpoint existiert nicht oder Reservation nicht gefunden

**Test 2: GET /reservations/18586160**
- ❌ Status: 404
- Error: `"Resource Not Found."`
- **Fazit**: Endpoint existiert nicht oder Reservation nicht gefunden

**Test 3: Prüfe ob in Liste /api/v1/bookings enthalten**
- ❌ Reservation NICHT in Liste enthalten
- Anzahl Reservationen in Liste: 100
- **Fazit**: Gecancelte Reservationen werden aus Liste gefiltert

---

## Bekannte Fakten aus Code-Analyse

### LobbyPMS API-Endpunkte (aus Code)

1. **Liste aller Reservationen**: 
   - Endpoint: `GET /api/v1/bookings`
   - Verwendet in: `fetchReservations()`, `fetchReservationsByCheckoutDate()`
   - **FAKT**: Gecancelte Reservationen sind NICHT in dieser Liste enthalten

2. **Einzelne Reservation per ID**:
   - Endpoint: `GET /reservations/${reservationId}` (Zeile 758)
   - Verwendet in: `fetchReservationById()`
   - **FAKT**: Gibt 404 für gecancelte Reservationen zurück

3. **Alternative Endpoints (aus Scripts)**:
   - `/api/v2/bookings/${id}` - Wird in `test-lobbypms-v2-booking-structure.ts` getestet
   - **UNBEKANNT**: Funktioniert dieser für gecancelte Reservationen?

---

## Problem

**Gecancelte Reservationen können NICHT per LobbyPMS API abgerufen werden:**
1. ❌ Nicht in Liste `/api/v1/bookings` enthalten
2. ❌ Nicht per `/reservations/${id}` abrufbar (404)
3. ❌ Nicht per `/api/v1/bookings/${id}` abrufbar (404)
4. ❓ Unbekannt: Funktioniert `/api/v2/bookings/${id}`?

---

## Zu prüfende Endpoints

### Noch nicht getestet:

1. **GET /api/v2/bookings/${id}**
   - Wird in `test-lobbypms-v2-booking-structure.ts` verwendet
   - **Muss getestet werden** für gecancelte Reservationen

2. **GET /api/v1/reservations/${id}**
   - **Muss getestet werden**

3. **GET /api/v2/reservations/${id}**
   - **Muss getestet werden**

4. **GET /bookings/${id}** (ohne /api/v1 Prefix)
   - **Muss getestet werden**

---

## Mögliche Lösungen

### Lösung A: `/api/v2/bookings/${id}` funktioniert

**Wenn `/api/v2/bookings/${id}` für gecancelte Reservationen funktioniert:**
- Ändere `fetchReservationById()` um `/api/v2/bookings/${id}` zu verwenden
- Oder: Erstelle neue Methode `fetchReservationByIdV2()`

### Lösung B: Kein Endpoint funktioniert für gecancelte Reservationen

**Wenn KEIN Endpoint für gecancelte Reservationen funktioniert:**
- **Problem**: LobbyPMS API gibt gecancelte Reservationen nicht zurück
- **Lösung**: 
  1. Status muss VOR dem Canceln synchronisiert werden
  2. Oder: Manuelle Synchronisation erforderlich
  3. Oder: Webhooks (falls verfügbar)

### Lösung C: Status wird vor Canceln gespeichert

**Wenn Reservation gecancelt wird, Status bereits bekannt:**
- Status könnte in lokaler DB gespeichert werden, bevor Cancellation
- **Problem**: Wie erkennen, dass Reservation gecancelt wurde?

---

## Nächste Schritte

### Schritt 1: Teste `/api/v2/bookings/${id}`

**Test-Script**: `backend/scripts/test-lobbypms-cancelled-reservation-endpoints.ts`

**Auf Produktivserver ausführen**:
```bash
cd /var/www/intranet/backend
npx ts-node scripts/test-lobbypms-cancelled-reservation-endpoints.ts
```

**Erwartetes Ergebnis**:
- Wenn Status 200: Endpoint funktioniert → Lösung A
- Wenn Status 404: Endpoint funktioniert nicht → Lösung B

### Schritt 2: Basierend auf Test-Ergebnis implementieren

**Wenn Lösung A (Endpoint funktioniert)**:
- Ändere `fetchReservationById()` oder erstelle neue Methode
- Verwende `/api/v2/bookings/${id}` für `syncExistingReservations()`

**Wenn Lösung B (Kein Endpoint funktioniert)**:
- Alternative Strategie erforderlich
- Status muss vor Canceln synchronisiert werden
- Oder: Manuelle Synchronisation

---

## Code-Referenzen

### API-Endpunkte
- **Liste**: `backend/src/services/lobbyPmsService.ts` Zeile 452, 603 - `/api/v1/bookings`
- **Einzelne Reservation (aktuell)**: `backend/src/services/lobbyPmsService.ts` Zeile 758 - `/reservations/${id}`
- **V2 Endpoint (zu testen)**: `/api/v2/bookings/${id}`

### Methoden
- **fetchReservationById()**: Zeile 750-785
- **syncExistingReservations()**: Zeile 1375-1430

### Test-Scripts
- **test-lobbypms-cancelled-reservation-endpoints.ts**: Testet alle möglichen Endpoints
- **test-lobbypms-v2-booking-structure.ts**: Testet `/api/v2/bookings/${id}` (für normale Reservationen)


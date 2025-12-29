# LobbyPMS Cancelled Reservations - Lösungsplan

**Datum**: 2025-01-26  
**Status**: 📋 Analyse abgeschlossen, Prüfung erforderlich

---

## Bekannte Fakten (aus Test-Ergebnissen)

### Test-Ergebnisse für Reservation 18586160 (gecancelt)

1. **GET /api/v1/bookings/18586160**
   - ❌ Status: 404
   - Error: `"No query results for model [App\\Models\\Booking]."`
   - **FAKT**: Endpoint gibt 404 zurück

2. **GET /reservations/18586160**
   - ❌ Status: 404
   - Error: `"Resource Not Found."`
   - **FAKT**: Endpoint gibt 404 zurück

3. **GET /api/v1/bookings** (Liste)
   - ❌ Reservation NICHT in Liste enthalten
   - **FAKT**: Gecancelte Reservationen werden aus Liste gefiltert

---

## Bekannte Endpoints aus Code und Scripts

### Verwendete Endpoints (aus Code-Analyse)

1. **Liste**: `GET /api/v1/bookings` ✅ Funktioniert (aber filtert gecancelte)
2. **Einzelne Reservation**: `GET /reservations/${id}` ❌ Gibt 404 für gecancelte
3. **V2 Endpoint**: `GET /api/v2/bookings/${id}` ❓ Noch nicht getestet für gecancelte

### Getestete Endpoints (aus Scripts)

- `test-lobbypms-v2-booking-structure.ts`: Testet `/api/v2/bookings/${id}` (für normale Reservationen)
- `test-lobbypms-cancel-booking.ts`: Testet verschiedene Cancel-Endpoints
- `test-lobbypms-all-endpoints.ts`: Testet systematisch alle Varianten

---

## Prüfung erforderlich

### Endpoint zu testen: `/api/v2/bookings/${id}`

**Warum**:
- Wird in `test-lobbypms-v2-booking-structure.ts` verwendet
- Könnte für gecancelte Reservationen funktionieren

**Test-Script**: `backend/scripts/test-lobbypms-cancelled-reservation-endpoints.ts`

**Auf Produktivserver ausführen**:
```bash
cd /var/www/intranet/backend
npx ts-node scripts/test-lobbypms-cancelled-reservation-endpoints.ts
```

---

## Mögliche Lösungen

### Lösung A: `/api/v2/bookings/${id}` funktioniert

**Wenn Test erfolgreich**:
- Ändere `fetchReservationById()` um `/api/v2/bookings/${id}` zu verwenden
- Oder: Erstelle neue Methode `fetchReservationByIdV2()`
- Verwende in `syncExistingReservations()` für bestehende Reservationen

**Code-Änderung**:
```typescript
async fetchReservationById(reservationId: string): Promise<LobbyPmsReservation> {
  // Versuche zuerst /api/v2/bookings/{id}
  try {
    const response = await this.axiosInstance.get(`/api/v2/bookings/${reservationId}`);
    if (response.data?.data || response.data?.id) {
      return response.data?.data || response.data;
    }
  } catch (error) {
    // Fallback auf /reservations/{id}
  }
  
  // Fallback auf bestehenden Endpoint
  const response = await this.axiosInstance.get(`/reservations/${reservationId}`);
  // ...
}
```

### Lösung B: Kein Endpoint funktioniert

**Wenn KEIN Endpoint funktioniert**:
- **Problem**: LobbyPMS API gibt gecancelte Reservationen nicht zurück
- **Lösung**: Status muss VOR dem Canceln synchronisiert werden
- **Strategie**: Häufigere Synchronisation (z.B. alle 5 Minuten statt 10)

---

## Implementierungsplan

### Schritt 1: Prüfung (JETZT)

**Test-Script ausführen auf Produktivserver**:
```bash
cd /var/www/intranet/backend
npx ts-node scripts/test-lobbypms-cancelled-reservation-endpoints.ts
```

**Prüfe Ergebnisse**:
- Funktioniert `/api/v2/bookings/${id}`?
- Welcher Status wird zurückgegeben?

### Schritt 2: Implementierung (nach Prüfung)

**Wenn Lösung A (Endpoint funktioniert)**:
- Ändere `fetchReservationById()` um `/api/v2/bookings/${id}` zu verwenden
- Teste mit Reservation 18586160

**Wenn Lösung B (Kein Endpoint funktioniert)**:
- Häufigere Synchronisation implementieren
- Oder: Alternative Strategie (Status vor Canceln speichern)

---

## Code-Referenzen

### API-Endpunkte
- **Liste**: `backend/src/services/lobbyPmsService.ts` Zeile 452, 603 - `/api/v1/bookings`
- **Einzelne Reservation**: `backend/src/services/lobbyPmsService.ts` Zeile 758 - `/reservations/${id}`
- **V2 Endpoint**: `/api/v2/bookings/${id}` (zu testen)

### Methoden
- **fetchReservationById()**: Zeile 750-785
- **syncExistingReservations()**: Zeile 1375-1430

### Test-Scripts
- **test-lobbypms-cancelled-reservation-endpoints.ts**: Testet alle Endpoints für gecancelte Reservationen
- **test-lobbypms-v2-booking-structure.ts**: Testet `/api/v2/bookings/${id}` (für normale Reservationen)


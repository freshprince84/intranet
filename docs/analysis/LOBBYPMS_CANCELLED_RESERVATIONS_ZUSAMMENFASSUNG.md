# LobbyPMS Cancelled Reservations - Vollständige Analyse und Lösung

**Datum**: 2025-01-26  
**Status**: ✅ Vollständige Analyse abgeschlossen

---

## Problem

Reservation 18586160 wurde in LobbyPMS gecancelt, wird aber nicht synchronisiert (Status bleibt `confirmed`).

---

## Test-Ergebnisse

### Umfang der Tests
- **1391 Endpoint-Varianten** getestet
- **32 erfolgreiche Responses (200)**, aber keine liefert die gesuchte Reservation
- **1359 Endpoints** geben 404 (nicht gefunden)

### Getestete Endpoint-Kategorien

1. **Path-Parameter Varianten**:
   - `/api/v1/bookings/{id}`, `/api/v2/bookings/{id}`
   - `/reservations/{id}`, `/api/v1/reservations/{id}`
   - Alle Varianten → **404**

2. **Query-Parameter Varianten**:
   - `/api/v1/bookings?booking_id={id}`, `?id={id}`, etc.
   - Alle geben Arrays zurück, aber **Reservation 18586160 NICHT enthalten**

3. **Status-basierte Filter**:
   - `?status=cancelled`, `?status=cancelado`
   - `?include_cancelled=true`, `?with_status=all`
   - **Keine Änderung** - Reservation immer noch nicht gefunden

4. **Spezielle Endpoints**:
   - `/cancelled/{id}`, `/cancellations/{id}`, `/cancel/{id}`
   - `/api/v1/cancelled/{id}`, `/api/v2/cancelled/{id}`
   - Alle → **404**

5. **Status-Endpoints**:
   - `/api/v1/bookings/{id}/status`
   - `/api/v2/bookings/{id}/status`
   - Alle → **404**

6. **Alternative Resources**:
   - `/available-rooms`, `/rooms`, `/status`
   - Entweder 404 oder falsche Daten (Zimmer-Listen statt Reservationen)

---

## Fazit

**Gecancelte Reservationen können NICHT per LobbyPMS API abgerufen werden.**

Die LobbyPMS API filtert gecancelte Reservationen komplett aus:
- ❌ Nicht in Liste `/api/v1/bookings` enthalten
- ❌ Nicht per ID abrufbar (`/bookings/{id}` → 404)
- ❌ Nicht per Query-Parameter filterbar
- ❌ Keine speziellen Endpoints für gecancelte Reservationen

---

## Alternative Lösungsansätze

### Lösung 1: Status vor Cancellation synchronisieren (Häufigere Sync)

**Problem**: Aktuell wird nur alle 10 Minuten synchronisiert. Wenn eine Reservation zwischen zwei Syncs gecancelt wird, wird der Status nicht erkannt.

**Lösung**: Häufigere Synchronisation
- Sync-Intervall von 10 Minuten auf 5 Minuten reduzieren
- Oder: Sync bei jedem Webhook-Event (falls verfügbar)

**Vorteile**:
- Einfach umzusetzen
- Keine API-Änderungen erforderlich

**Nachteile**:
- Höhere API-Last
- Immer noch nicht 100% zuverlässig (Race Condition möglich)

### Lösung 2: Webhooks nutzen (falls verfügbar)

**Problem**: LobbyPMS Webhooks sind möglicherweise nicht zuverlässig konfiguriert.

**Lösung**: Webhook-Handler für `reservation.cancelled` Events aktivieren
- Prüfen ob LobbyPMS Webhooks für Cancellations sendet
- Webhook-Handler in `lobbyPmsController.ts` erweitern

**Vorteile**:
- Echtzeit-Updates
- Keine Polling-API-Calls erforderlich

**Nachteile**:
- Abhängig von LobbyPMS Webhook-Support
- Möglicherweise nicht verfügbar

### Lösung 3: Manuelle Synchronisation

**Problem**: Automatische Synchronisation funktioniert nicht für gecancelte Reservationen.

**Lösung**: Manuelle Sync-Funktion
- Admin-Interface für manuelle Synchronisation
- Button "Reservation Status aktualisieren" pro Reservation
- Oder: Bulk-Sync für alle Reservationen

**Vorteile**:
- Admin hat Kontrolle
- Funktioniert immer

**Nachteile**:
- Manueller Aufwand
- Nicht automatisch

### Lösung 4: Status in lokaler DB speichern (vor Cancellation)

**Problem**: Status wird erst nach Cancellation benötigt, aber dann ist er nicht mehr abrufbar.

**Lösung**: Status-Historie in lokaler DB
- Jedes Mal wenn Status synchronisiert wird, in Historie speichern
- Wenn Reservation gecancelt wird, letzten bekannten Status verwenden

**Vorteile**:
- Funktioniert auch wenn API nicht verfügbar

**Nachteile**:
- Komplexe Implementierung
- Benötigt zusätzliche DB-Tabelle

### Lösung 5: LobbyPMS Support kontaktieren

**Problem**: API unterstützt keine gecancelte Reservationen.

**Lösung**: Feature-Request an LobbyPMS
- Support kontaktieren
- API-Endpoint für gecancelte Reservationen anfragen
- Oder: Option `include_cancelled` in bestehenden Endpoints

**Vorteile**:
- Langfristige Lösung
- Saubere API-Integration

**Nachteile**:
- Abhängig von LobbyPMS
- Kann lange dauern

---

## Empfohlene Lösung

**Kombination aus Lösung 1 + Lösung 2**:

1. **Kurzfristig**: Häufigere Synchronisation (5 Minuten statt 10)
   - Reduziert das Zeitfenster für Race Conditions
   - Einfach umzusetzen

2. **Mittelfristig**: Webhook-Handler für Cancellations aktivieren
   - Prüfen ob LobbyPMS Webhooks sendet
   - Handler in `lobbyPmsController.ts` erweitern

3. **Langfristig**: LobbyPMS Support kontaktieren
   - Feature-Request für API-Endpoint
   - Oder: `include_cancelled` Parameter in bestehenden Endpoints

---

## Code-Referenzen

### Aktuelle Implementierung
- **Automatische Sync**: `backend/src/services/lobbyPmsReservationSyncService.ts`
- **Sync-Intervall**: 10 Minuten (konfigurierbar)
- **Webhook-Handler**: `backend/src/controllers/lobbyPmsController.ts` (Zeile 308-416)
- **syncExistingReservations()**: `backend/src/services/lobbyPmsService.ts` (Zeile 1375-1430)
- **fetchReservationById()**: `backend/src/services/lobbyPmsService.ts` (Zeile 750-785)

### Test-Script
- **test-lobbypms-cancelled-reservation-endpoints.ts**: Testet 1391 Endpoint-Varianten

---

## Nächste Schritte

1. ✅ API-Tests abgeschlossen (1391 Varianten)
2. ⏭️ Entscheidung: Welche Lösung implementieren?
3. ⏭️ Implementierung der gewählten Lösung
4. ⏭️ Testing auf Produktivserver



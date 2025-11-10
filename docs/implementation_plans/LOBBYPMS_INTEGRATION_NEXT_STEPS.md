# LobbyPMS Integration - Nächste Schritte

## Status
✅ **Phase 0: API Configuration Tab** - 100% KOMPLETT
- Frontend-Tab implementiert
- Backend-Validierung, Verschlüsselung, Berechtigung
- Alle Standards eingehalten

---

## Nächste Schritte (Priorisiert)

### 🔴 Phase 1: Datenbank-Schema (KRITISCH)

**Was zu tun ist:**
1. Prisma-Schema erweitern:
   - `Reservation` Model hinzufügen
   - `ReservationSyncHistory` Model hinzufügen
   - Enums: `ReservationStatus`, `PaymentStatus`
   - `Task.reservationId` Feld hinzufügen

2. Migration erstellen und ausführen
3. Prisma Client neu generieren

**Dateien:**
- `backend/prisma/schema.prisma` - Erweitern
- Migration erstellen: `npx prisma migrate dev --name add_reservation_models`

**Geschätzte Zeit:** 30-60 Minuten

---

### 🟡 Phase 2: LobbyPMS Service (WICHTIG)

**Was zu tun ist:**
1. `backend/src/services/lobbyPmsService.ts` erstellen
   - API-Client für LobbyPMS
   - Funktionen:
     - `getReservations()` - Reservierungen abrufen
     - `getReservationById()` - Details abrufen
     - `updateReservationStatus()` - Status aktualisieren
     - `syncReservations()` - Synchronisation

2. Settings aus `Organization.settings` lesen
3. API-Keys entschlüsseln
4. Fehlerbehandlung

**Dateien:**
- `backend/src/services/lobbyPmsService.ts` - NEU

**Geschätzte Zeit:** 2-3 Stunden

---

### 🟡 Phase 3: Controller & Routes (WICHTIG)

**Was zu tun ist:**
1. `backend/src/controllers/lobbyPmsController.ts` erstellen
   - `getReservations()` - GET /api/lobby-pms/reservations
   - `getReservationById()` - GET /api/lobby-pms/reservations/:id
   - `syncReservations()` - POST /api/lobby-pms/sync
   - `checkIn()` - POST /api/lobby-pms/reservations/:id/check-in
   - `sendInvitation()` - POST /api/lobby-pms/reservations/:id/send-invitation

2. Routes registrieren in `backend/src/routes/`

**Dateien:**
- `backend/src/controllers/lobbyPmsController.ts` - NEU
- `backend/src/routes/lobbyPms.ts` - NEU

**Geschätzte Zeit:** 1-2 Stunden

---

### 🟢 Phase 4: Frontend - Reservierungsübersicht (NICE-TO-HAVE)

**Was zu tun ist:**
1. `frontend/src/pages/ReservationsPage.tsx` erstellen
2. Liste aller Reservierungen
3. Filter nach Status, Datum
4. Check-in-Button

**Geschätzte Zeit:** 2-3 Stunden

---

## Empfohlene Reihenfolge

### Option A: Schrittweise (Empfohlen)
1. **Phase 1** - Datenbank-Schema (30-60 Min)
2. **Phase 2** - LobbyPMS Service (2-3 Std)
3. **Phase 3** - Controller & Routes (1-2 Std)
4. **Phase 4** - Frontend (2-3 Std)

**Gesamt:** ~6-9 Stunden

### Option B: Minimal Viable Product (MVP)
1. **Phase 1** - Datenbank-Schema
2. **Phase 2** - LobbyPMS Service (nur `getReservations()`)
3. **Phase 3** - Controller (nur GET-Endpunkte)
4. Testen mit echten LobbyPMS-Daten

**Gesamt:** ~3-4 Stunden

---

## Wichtige Hinweise

### Vor Phase 1:
- ⚠️ **Server-Neustart nötig** nach Migration
- ⚠️ **Backup** der Datenbank erstellen
- ⚠️ **ENCRYPTION_KEY** muss gesetzt sein

### Vor Phase 2:
- ✅ LobbyPMS API-Dokumentation durchlesen
- ✅ API-Token testen (manuell mit Postman/curl)
- ✅ Property ID verifizieren

### Vor Phase 3:
- ✅ Service testen (Unit-Tests oder manuell)
- ✅ Fehlerbehandlung prüfen

---

## Offene Fragen

1. **LobbyPMS API-Dokumentation:**
   - Welche Endpunkte gibt es genau?
   - Wie ist die Authentifizierung?
   - Welche Datenfelder gibt es?

2. **Synchronisation:**
   - Wie oft soll synchronisiert werden?
   - Soll es automatisch (Cron) oder manuell sein?

3. **Check-in-Prozess:**
   - Was passiert genau beim Check-in?
   - Welche Daten müssen aktualisiert werden?

---

## Nächster Schritt: Phase 1

**Soll ich mit Phase 1 (Datenbank-Schema) beginnen?**

Das beinhaltet:
1. Prisma-Schema erweitern
2. Migration erstellen
3. Prisma Client neu generieren

**Wichtig:** Nach der Migration muss der Server neu gestartet werden!



# LobbyPMS Sync - Status-Update (Check-in & Payment)

## Übersicht

Die **LobbyPMS-Synchronisation** aktualisiert automatisch:
- **Check-in Status** (`checked_in` Boolean)
- **Payment Status** (`paid_out` vs `total_to_pay`)
- **Check-in-Link-Abschluss** (`checkin_online` Boolean, `holder.type_document` + `holder.document`)

**Siehe auch**: [LOBBYPMS_CHECKIN_LINK_ERKENNUNG.md](LOBBYPMS_CHECKIN_LINK_ERKENNUNG.md) - Detaillierte Beschreibung der Check-in-Link-Erkennung

## Wie funktioniert die Synchronisation?

### Automatische Synchronisation

**Scheduler:** Prüft alle **10 Minuten** automatisch auf neue/aktualisierte Reservierungen

**Code:** `backend/src/services/lobbyPmsReservationScheduler.ts`

### Manuelle Synchronisation

**API-Endpunkt:** `POST /api/lobby-pms/sync`

**Möglichkeiten:**
1. **Alle Reservierungen** einer Organisation synchronisieren
2. **Spezifische Reservierungen** synchronisieren (via `reservationIds`)

## Status-Update-Logik

### Check-in Status

**Code:** `backend/src/services/lobbyPmsService.ts` → `syncReservation()` (Zeile 871-879)

```typescript
// Status: API gibt checked_in/checked_out Booleans zurück
let status: ReservationStatus = ReservationStatus.confirmed;
if (lobbyReservation.checked_out) {
  status = ReservationStatus.checked_out;
} else if (lobbyReservation.checked_in) {
  status = ReservationStatus.checked_in;  // ✅ Wird automatisch gesetzt
} else if (lobbyReservation.status) {
  status = mapStatus(lobbyReservation.status);
}
```

**Bedingung:** Wenn LobbyPMS `checked_in: true` zurückgibt → Status wird auf `checked_in` gesetzt

### Payment Status

**Code:** `backend/src/services/lobbyPmsService.ts` → `syncReservation()` (Zeile 881-891)

```typescript
// Payment Status: API gibt paid_out und total_to_pay zurück
let paymentStatus: PaymentStatus = PaymentStatus.pending;
const paidOut = parseFloat(lobbyReservation.paid_out || '0');
const totalToPay = parseFloat(lobbyReservation.total_to_pay || lobbyReservation.total_to_pay_accommodation || '0');
if (paidOut >= totalToPay && totalToPay > 0) {
  paymentStatus = PaymentStatus.paid;  // ✅ Wird automatisch gesetzt
} else if (paidOut > 0) {
  paymentStatus = PaymentStatus.partially_paid;
} else if (lobbyReservation.payment_status) {
  paymentStatus = mapPaymentStatus(lobbyReservation.payment_status);
}
```

**Bedingung:** Wenn `paid_out >= total_to_pay && total_to_pay > 0` → Payment Status wird auf `paid` gesetzt

## Manuelle Synchronisation durchführen

### Option 1: Via API (Frontend/Postman)

**Endpoint:** `POST /api/lobby-pms/sync`

**Request Body (alle Reservierungen):**
```json
{
  "startDate": "2025-11-01T00:00:00Z",
  "endDate": "2025-12-31T23:59:59Z"
}
```

**Request Body (spezifische Reservierungen):**
```json
{
  "reservationIds": ["18241537"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "syncedCount": 1,
    "message": "1 Reservierung(en) synchronisiert"
  }
}
```

### Option 2: Via Script (auf Server)

**Script erstellen:** `backend/scripts/sync-reservation-18241537.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import { LobbyPmsService } from '../src/services/lobbyPmsService';

const prisma = new PrismaClient();

async function syncReservation18241537() {
  try {
    // Finde Reservation
    const reservation = await prisma.reservation.findFirst({
      where: { lobbyReservationId: '18241537' },
      include: { branch: true }
    });

    if (!reservation) {
      console.log('❌ Reservation nicht gefunden');
      return;
    }

    console.log(`✅ Reservation gefunden: ${reservation.id} (${reservation.guestName})`);
    console.log(`   Branch: ${reservation.branch?.name} (ID: ${reservation.branchId})`);

    if (!reservation.branchId) {
      console.log('❌ Keine Branch-ID gefunden');
      return;
    }

    // Erstelle Service
    const service = await LobbyPmsService.createForBranch(reservation.branchId);

    // Hole aktuelle Daten von LobbyPMS
    const lobbyReservation = await service.getReservationById('18241537');

    if (!lobbyReservation) {
      console.log('❌ Reservation nicht in LobbyPMS gefunden');
      return;
    }

    console.log('\n📊 LobbyPMS Daten:');
    console.log(`   Checked In: ${lobbyReservation.checked_in}`);
    console.log(`   Checked Out: ${lobbyReservation.checked_out}`);
    console.log(`   Paid Out: ${lobbyReservation.paid_out}`);
    console.log(`   Total To Pay: ${lobbyReservation.total_to_pay || lobbyReservation.total_to_pay_accommodation}`);

    // Synchronisiere
    const syncedReservation = await service.syncReservation(lobbyReservation);

    console.log('\n✅ Synchronisation abgeschlossen:');
    console.log(`   Status: ${syncedReservation.status}`);
    console.log(`   Payment Status: ${syncedReservation.paymentStatus}`);
    console.log(`   Online Check-in: ${syncedReservation.onlineCheckInCompleted}`);

  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

syncReservation18241537();
```

**Ausführen:**
```bash
cd /var/www/intranet/backend
npx ts-node scripts/sync-reservation-18241537.ts
```

### Option 3: Via Frontend (Reservations-Seite)

1. Öffne Reservations-Seite im Frontend
2. Suche nach Reservation 18241537
3. Klicke auf "Sync" Button (falls vorhanden)
4. Oder verwende "Sync All" Funktion

## Prüfung nach Synchronisation

### Script ausführen

```bash
cd /var/www/intranet/backend
npx ts-node scripts/check-reservation-status-18241537.ts
```

**Erwartete Ausgabe:**
```
✅ Reservation gefunden!
   Status: checked_in ✅
   Payment Status: paid ✅
   Online Check-in: ✅
```

### Manuelle Prüfung (SQL)

```sql
SELECT 
  id,
  "lobbyReservationId",
  "guestName",
  status,
  "paymentStatus",
  "onlineCheckInCompleted",
  "onlineCheckInCompletedAt",
  "updatedAt"
FROM "Reservation"
WHERE "lobbyReservationId" = '18241537';
```

## Problem: Reservation 18241537

### Aktueller Status (vor Sync)

- **Status:** `confirmed` (sollte `checked_in` sein)
- **Payment Status:** `pending` (sollte `paid` sein)
- **Letzte Sync:** 2025-11-30T05:24:58.637Z
- **LobbyPMS Daten (zu diesem Zeitpunkt):**
  - `checked_in: false`
  - `paid_out: 0`
  - `total_to_pay: 11880`

### Lösung: Manuelle Synchronisation

**Schritt 1:** Prüfe ob LobbyPMS jetzt aktualisierte Daten hat

**Schritt 2:** Führe manuelle Sync durch (siehe oben)

**Schritt 3:** Prüfe ob Status aktualisiert wurde

## Automatische Synchronisation aktivieren

### Scheduler prüfen

**Code:** `backend/src/services/lobbyPmsReservationScheduler.ts`

**Prüfung ob aktiv:**
```bash
pm2 logs intranet-backend | grep -i "lobby.*pms.*scheduler"
```

**Erwartete Logs:**
```
[LobbyPmsReservationScheduler] Scheduler gestartet
[LobbyPmsReservationScheduler] Prüfe Branch 3...
[LobbyPmsReservationScheduler] 5 Reservation(s) synchronisiert für Branch 3
```

### Scheduler manuell triggern

**Code:** `backend/src/services/lobbyPmsReservationScheduler.ts` → `triggerManually()`

**Via Script:**
```typescript
import { LobbyPmsReservationScheduler } from '../src/services/lobbyPmsReservationScheduler';

// Sync für spezifische Branch
await LobbyPmsReservationScheduler.triggerManually(3); // Branch ID

// Oder alle Branches
await LobbyPmsReservationScheduler.triggerManually();
```

## Häufige Probleme

### Problem 1: Sync findet Reservation nicht

**Ursache:** Reservation existiert nicht in LobbyPMS oder `lobbyReservationId` stimmt nicht

**Lösung:**
1. Prüfe ob Reservation in LobbyPMS existiert
2. Prüfe ob `lobbyReservationId` korrekt ist
3. Prüfe ob Branch korrekt zugeordnet ist

### Problem 2: Status wird nicht aktualisiert

**Ursache:** LobbyPMS hat noch nicht aktualisierte Daten

**Lösung:**
1. Prüfe in LobbyPMS ob Check-in/Payment tatsächlich durchgeführt wurde
2. Warte auf automatische Sync (alle 10 Minuten)
3. Oder führe manuelle Sync durch

### Problem 3: Payment Status bleibt pending

**Ursache:** `paid_out < total_to_pay` in LobbyPMS

**Lösung:**
1. Prüfe in LobbyPMS ob Zahlung korrekt erfasst wurde
2. Prüfe ob `paid_out` und `total_to_pay` korrekt sind
3. Bedingung: `paid_out >= total_to_pay && total_to_pay > 0` muss erfüllt sein

## Zusammenfassung

**Für Reservation 18241537:**

1. ✅ **Manuelle Sync durchführen** (via API oder Script)
2. ✅ **Status prüfen** (via Script oder SQL)
3. ✅ **Falls nicht aktualisiert:** Prüfe LobbyPMS ob Daten korrekt sind
4. ✅ **Automatische Sync** läuft alle 10 Minuten (falls aktiviert)

**Wichtig:** Die Synchronisation holt die **aktuellen Daten von LobbyPMS** und aktualisiert den lokalen Status automatisch basierend auf:
- `checked_in` Boolean → Status
- `paid_out` vs `total_to_pay` → Payment Status


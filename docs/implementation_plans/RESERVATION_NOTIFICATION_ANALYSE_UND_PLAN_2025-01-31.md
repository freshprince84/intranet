# Reservation-Notification Analyse und Plan

**Datum**: 2025-01-31  
**Status**: 📋 Analyse abgeschlossen, Planung bereit für Review

## 🎯 Zielsetzung

1. **Automatisierung der Einladungs-Mitteilung**: Mitteilung mit Zahlungslink soll 1 Tag vor Check-in-Datum um 08:00 automatisch versendet werden
2. **2. Mitteilung (Check-in-Bestätigung)**: Nur versenden wenn Status `checked_in` UND Zahlungsstatus `bezahlt`
3. **Status-Update-Fix**: Status-Updates sollen explizit anhand Reservation ID geprüft werden, nicht nach Creation Date synchronisiert werden

---

## 📊 Aktuelle Situation - Detaillierte Analyse

### 1. Automatisierte Mitteilungen - Wann wird was versendet?

#### A) Bei Reservation-Erstellung (manuell oder aus Email)

**Code**: `backend/src/controllers/reservationController.ts` (Zeile 291-518)  
**Code**: `backend/src/services/emailReservationService.ts` (Zeile 22-123)

**Ablauf:**
1. Reservation wird erstellt
2. Wenn `autoSend=true` (manuell) oder `EMAIL_RESERVATION_WHATSAPP_ENABLED=true` (Email):
   - Payment-Link wird erstellt (BoldPaymentService)
   - Check-in-Link wird erstellt (LobbyPMS oder Fallback)
   - WhatsApp-Nachricht mit beiden Links wird versendet
   - Status wird auf `notification_sent` gesetzt

**Service-Methode**: `ReservationNotificationService.sendReservationInvitation()`

**Kanal**: WhatsApp (wenn `contactType === 'phone'` und `guestPhone` vorhanden)

---

#### B) Täglich um 20:00 Uhr - Späte Check-in-Einladungen

**Code**: `backend/src/services/reservationScheduler.ts`  
**Code**: `backend/src/services/reservationNotificationService.ts` → `sendLateCheckInInvitations()` (Zeile 66-196)

**Ablauf:**
1. Scheduler prüft alle 10 Minuten, ob es 20:00 Uhr ist
2. Wenn ja: `sendLateCheckInInvitations()` wird aufgerufen
3. Für jede Organisation mit aktivierter LobbyPMS-Sync:
   - Hole Reservierungen für **morgen** mit Ankunft **nach 22:00 Uhr** (lateCheckInThreshold)
   - Für jede Reservation:
     - Synchronisiere in lokale DB
     - Prüfe ob bereits Einladung versendet wurde (`invitationSentAt`)
     - Erstelle Payment-Link (aktuell Placeholder: 100.000 COP)
     - Erstelle Check-in-Link
     - Versende Email/WhatsApp (je nach `notificationChannels`)
     - Markiere als versendet (`invitationSentAt`)

**Kanal**: Email und/oder WhatsApp (je nach `notificationChannels` in Settings)

**Bedingung**: Nur für Reservierungen mit Check-in **morgen** und Ankunft **nach 22:00 Uhr**

---

#### C) Nach Check-in UND Bezahlung - PIN-Versand (automatisch)

**Code**: `backend/src/services/lobbyPmsService.ts` → `syncReservation()` (Zeile 1152-1162)

**Ablauf:**
1. `syncReservation()` wird aufgerufen (z.B. durch LobbyPMS-Sync oder Webhook)
2. Prüft: `checkInDataUploadedChanged && paymentStatus === PaymentStatus.paid && !reservation.doorPin`
3. Wenn alle Bedingungen erfüllt:
   - Ruft `ReservationNotificationService.generatePinAndSendNotification()` auf
   - Erstellt TTLock-Passcode
   - Versendet Email/WhatsApp mit PIN

**Kanal**: Email und/oder WhatsApp (je nach `notificationChannels`)

**Bedingung**: 
- Check-in-Link wurde abgeschlossen (`checkInDataUploadedChanged`)
- Zahlungsstatus ist `paid`
- Noch kein `doorPin` vorhanden

---

#### D) Nach manuellem Check-in - Check-in-Bestätigung

**Code**: `backend/src/controllers/lobbyPmsController.ts` → `checkInReservation()` (Zeile 360-374)  
**Code**: `backend/src/services/reservationNotificationService.ts` → `sendCheckInConfirmation()` (Zeile 1577-1680)

**Ablauf:**
1. User führt manuellen Check-in durch (Frontend)
2. `POST /api/lobby-pms/check-in/:id` wird aufgerufen
3. Status wird auf `checked_in` gesetzt
4. `sendCheckInConfirmation()` wird aufgerufen
5. Erstellt TTLock-Passcode
6. Versendet Email/WhatsApp mit PIN

**Kanal**: Email und/oder WhatsApp (je nach `notificationChannels`)

**Bedingung**: Status muss `checked_in` sein

**Hinweis**: Diese Methode prüft NICHT den Zahlungsstatus!

---

### 2. Manuelle Buttons in Reservation Cards

**Code**: `frontend/src/pages/Worktracker.tsx` (Zeile 2917-2934)

**Aktuell vorhanden:**
- **Key-Button** (PIN-Generierung):
  - Frontend: `handleGeneratePinAndSend()` → öffnet Sidepane
  - Backend: `POST /api/reservations/:id/generate-pin-and-send`
  - Service: `ReservationNotificationService.generatePinAndSendNotification()`
  - Aktionen: TTLock-Passcode generieren + Email/WhatsApp mit Passcode versenden

**Nicht vorhanden:**
- **Button für Einladung** (Payment-Link + Check-in-Link):
  - Wird aktuell nur automatisch bei Erstellung versendet
  - Kein manueller Button vorhanden

**Hinweis**: Es gibt einen Plan (`RESERVATION_AUTOMATION_IMPLEMENTATION.md`), der vorsieht, einen Button für Einladungen hinzuzufügen, aber dieser ist noch nicht implementiert.

---

### 3. Scheduler-System - Standard

**Code**: `backend/src/index.ts` (Zeile 87-110)

**Aktuell verwendete Scheduler:**

1. **ReservationScheduler** (`backend/src/services/reservationScheduler.ts`):
   - Prüft alle 10 Minuten, ob es 20:00 Uhr ist
   - Ruft `sendLateCheckInInvitations()` auf
   - **Standard**: `setInterval` mit 10 Minuten Check-Interval

2. **LobbyPmsReservationScheduler** (`backend/src/services/lobbyPmsReservationScheduler.ts`):
   - Prüft alle 10 Minuten auf neue Reservierungen
   - Ruft `LobbyPmsReservationSyncService.syncReservationsForBranch()` auf
   - **Standard**: `setInterval` mit 10 Minuten Check-Interval

3. **EmailReservationScheduler** (`backend/src/services/emailReservationScheduler.ts`):
   - Prüft alle 10 Minuten auf neue Reservation-Emails
   - **Standard**: `setInterval` mit 10 Minuten Check-Interval

**Standard-Pattern**: Alle Scheduler verwenden `setInterval` mit 10 Minuten Check-Interval und prüfen dann, ob die gewünschte Zeit erreicht ist.

---

### 4. Status-Update-Mechanismus - Problem

**Code**: `backend/src/services/lobbyPmsReservationSyncService.ts` → `syncReservationsForBranch()` (Zeile 69-79)

**Aktueller Ablauf:**
1. `LobbyPmsReservationScheduler` prüft alle 10 Minuten
2. Ruft `syncReservationsForBranch()` auf
3. Diese prüft Reservierungen mit **Erstellungsdatum in den letzten 24 Stunden** (`creation_date`):
   ```typescript
   syncStartDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
   console.log(`Prüfe Reservierungen mit Erstellungsdatum in den letzten 24 Stunden`);
   ```
4. `syncReservations()` ruft `syncReservation()` für jede gefundene Reservation auf
5. `syncReservation()` aktualisiert die Reservation in der DB (inkl. Status)

**Problem:**
- Status-Updates werden nur für Reservierungen durchgeführt, die in den letzten 24 Stunden **erstellt** wurden
- Ältere Reservierungen werden nicht aktualisiert, auch wenn sich ihr Status in LobbyPMS geändert hat
- Es wird nach `creation_date` gefiltert, nicht nach `check_in_date` oder aktuellem Status

**Code**: `backend/src/services/lobbyPmsService.ts` → `syncReservations()` (Zeile 1227-1262)

**Aktueller Filter:**
- `fetchReservations()` filtert nach `creation_date >= syncStartDate`
- Nicht nach Reservation ID oder aktuellem Status

---

## 🔧 Implementierungsplan

### Phase 1: Automatisierung der Einladungs-Mitteilung (1 Tag vor Check-in, 08:00)

#### 1.1 Neuer Scheduler für tägliche Einladungen

**Datei**: `backend/src/services/reservationInvitationScheduler.ts` (NEU)

**Funktionalität:**
- Prüft alle 10 Minuten, ob es 08:00 Uhr ist
- Ruft neue Methode `sendInvitationsForTomorrow()` auf
- Sendet Einladungen für alle Reservierungen mit Check-in **morgen**

**Code-Struktur:**
```typescript
export class ReservationInvitationScheduler {
  private static checkInterval: NodeJS.Timeout | null = null;
  private static lastCheckDate: string = '';

  static start(): void {
    // Prüfe alle 10 Minuten, ob es 08:00 Uhr ist
    const CHECK_INTERVAL_MS = 10 * 60 * 1000;
    this.checkInterval = setInterval(async () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentDate = now.toDateString();

      if (currentHour === 8 && this.lastCheckDate !== currentDate) {
        this.lastCheckDate = currentDate;
        await ReservationNotificationService.sendInvitationsForTomorrow();
      }
    }, CHECK_INTERVAL_MS);
  }

  static stop(): void {
    // ...
  }
}
```

#### 1.2 Neue Service-Methode für Einladungen

**Datei**: `backend/src/services/reservationNotificationService.ts`

**Neue Methode**: `sendInvitationsForTomorrow()`

**Funktionalität:**
- Hole alle Reservierungen mit `checkInDate = morgen`
- Prüfe ob bereits Einladung versendet wurde (`invitationSentAt`)
- Für jede Reservation:
  - Erstelle Payment-Link (BoldPaymentService)
  - Erstelle Check-in-Link
  - Versende Email/WhatsApp (je nach `notificationChannels`)
  - Markiere als versendet (`invitationSentAt`)

**Code-Struktur:**
```typescript
static async sendInvitationsForTomorrow(): Promise<void> {
  // Berechne morgen (00:00:00)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setHours(23, 59, 59, 999);

  // Hole alle Reservierungen mit checkInDate = morgen
  const reservations = await prisma.reservation.findMany({
    where: {
      checkInDate: {
        gte: tomorrow,
        lte: tomorrowEnd
      },
      invitationSentAt: null, // Noch nicht versendet
      status: {
        in: ['confirmed', 'potential'] // Nur bestätigte/potenzielle Reservierungen
      }
    },
    include: {
      organization: true,
      branch: true
    }
  });

  for (const reservation of reservations) {
    // Prüfe Settings
    // Erstelle Payment-Link
    // Erstelle Check-in-Link
    // Versende Email/WhatsApp
    // Markiere als versendet
  }
}
```

#### 1.3 Scheduler in index.ts registrieren

**Datei**: `backend/src/index.ts`

**Hinzufügen:**
```typescript
// Reservation Invitation Scheduler (täglich 08:00)
import { ReservationInvitationScheduler } from './services/reservationInvitationScheduler';
ReservationInvitationScheduler.start();
console.log('✅ Reservation Invitation Scheduler gestartet (prüft täglich um 08:00)');
```

#### 1.4 Alten Scheduler anpassen oder deaktivieren

**Datei**: `backend/src/services/reservationScheduler.ts`

**Option A**: Deaktivieren (wenn neue Lösung verwendet wird)
**Option B**: Behalten für späte Check-ins (nach 22:00 Uhr)

**Empfehlung**: Option B - Behalten für späte Check-ins, da diese eine spezielle Logik haben.

---

### Phase 2: 2. Mitteilung (Check-in-Bestätigung) - Bedingung anpassen

#### 2.1 Automatischer PIN-Versand - Bedingung prüfen

**Datei**: `backend/src/services/lobbyPmsService.ts` → `syncReservation()` (Zeile 1152-1162)

**Aktuell:**
```typescript
if (checkInDataUploadedChanged && paymentStatus === PaymentStatus.paid && !reservation.doorPin) {
  // Versende PIN
}
```

**Status**: ✅ **Bereits korrekt implementiert!**

Die Bedingung prüft bereits:
- `checkInDataUploadedChanged` (Check-in-Link abgeschlossen)
- `paymentStatus === PaymentStatus.paid` (bezahlt)
- `!reservation.doorPin` (noch kein PIN vorhanden)

#### 2.2 Manueller Check-in - Bedingung hinzufügen

**Datei**: `backend/src/controllers/lobbyPmsController.ts` → `checkInReservation()` (Zeile 360-374)

**Aktuell:**
```typescript
// Sende Check-in-Bestätigung
await ReservationNotificationService.sendCheckInConfirmation(localReservation.id);
```

**Problem**: Prüft NICHT den Zahlungsstatus!

**Lösung**: Bedingung hinzufügen:
```typescript
// Sende Check-in-Bestätigung nur wenn bezahlt
if (localReservation.paymentStatus === PaymentStatus.paid) {
  try {
    await ReservationNotificationService.sendCheckInConfirmation(localReservation.id);
  } catch (error) {
    console.error('Fehler beim Versenden der Check-in-Bestätigung:', error);
  }
} else {
  console.log(`[Check-in] Reservation ${localReservation.id} ist nicht bezahlt - keine Bestätigung versendet`);
}
```

#### 2.3 Service-Methode anpassen

**Datei**: `backend/src/services/reservationNotificationService.ts` → `sendCheckInConfirmation()` (Zeile 1577-1680)

**Aktuell:**
```typescript
if (reservation.status !== ReservationStatus.checked_in) {
  throw new Error(`Reservierung ${reservationId} ist nicht eingecheckt`);
}
```

**Anpassung**: Zusätzlich Zahlungsstatus prüfen:
```typescript
if (reservation.status !== ReservationStatus.checked_in) {
  throw new Error(`Reservierung ${reservationId} ist nicht eingecheckt`);
}

if (reservation.paymentStatus !== PaymentStatus.paid) {
  throw new Error(`Reservierung ${reservationId} ist nicht bezahlt - keine Bestätigung versendet`);
}
```

---

### Phase 3: Status-Update-Fix - Explizite Prüfung nach Reservation ID

#### 3.1 Problem identifizieren

**Aktuell**: `syncReservationsForBranch()` prüft nur Reservierungen mit `creation_date` in den letzten 24 Stunden.

**Problem**: Ältere Reservierungen werden nicht aktualisiert, auch wenn sich ihr Status in LobbyPMS geändert hat.

#### 3.2 Lösung: Zwei Ansätze kombinieren

**Ansatz A**: Alle Reservierungen mit `checkInDate >= gestern` prüfen (für aktuelle/kommende Reservierungen)

**Ansatz B**: Explizite Prüfung aller Reservierungen in der DB (für Status-Updates)

**Empfehlung**: Kombination beider Ansätze

#### 3.3 Neue Methode für explizite Status-Updates

**Datei**: `backend/src/services/lobbyPmsReservationSyncService.ts`

**Neue Methode**: `syncReservationStatusesForBranch()`

**Funktionalität:**
- Hole alle Reservierungen für diesen Branch aus der DB
- Für jede Reservation:
  - Hole aktuelle Daten von LobbyPMS API (via `lobbyReservationId`)
  - Prüfe ob Status/Payment-Status sich geändert hat
  - Aktualisiere nur Status/Payment-Status (nicht alle Felder)

**Code-Struktur:**
```typescript
static async syncReservationStatusesForBranch(
  branchId: number
): Promise<number> {
  // Hole alle Reservierungen für diesen Branch
  const reservations = await prisma.reservation.findMany({
    where: {
      branchId: branchId,
      lobbyReservationId: { not: null } // Nur LobbyPMS-Reservierungen
    },
    select: {
      id: true,
      lobbyReservationId: true,
      status: true,
      paymentStatus: true
    }
  });

  const lobbyPmsService = await LobbyPmsService.createForBranch(branchId);
  let updatedCount = 0;

  for (const reservation of reservations) {
    try {
      // Hole aktuelle Daten von LobbyPMS
      const lobbyReservation = await lobbyPmsService.fetchReservationById(
        reservation.lobbyReservationId!
      );

      if (!lobbyReservation) {
        continue; // Reservation nicht mehr in LobbyPMS
      }

      // Prüfe Status-Änderungen
      const newStatus = mapStatus(lobbyReservation.status);
      const newPaymentStatus = mapPaymentStatus(lobbyReservation.paid_out, lobbyReservation.total_to_pay);

      // Aktualisiere nur wenn sich Status geändert hat
      if (reservation.status !== newStatus || reservation.paymentStatus !== newPaymentStatus) {
        await prisma.reservation.update({
          where: { id: reservation.id },
          data: {
            status: newStatus,
            paymentStatus: newPaymentStatus
          }
        });
        updatedCount++;
      }
    } catch (error) {
      console.error(`[LobbyPmsSync] Fehler beim Status-Update für Reservation ${reservation.id}:`, error);
    }
  }

  return updatedCount;
}
```

#### 3.4 Neue Methode in LobbyPmsService

**Datei**: `backend/src/services/lobbyPmsService.ts`

**Neue Methode**: `fetchReservationById()`

**Funktionalität:**
- Hole eine spezifische Reservation von LobbyPMS API
- Verwende `GET /bookings/{booking_id}` Endpoint

#### 3.5 Scheduler anpassen

**Datei**: `backend/src/services/lobbyPmsReservationScheduler.ts`

**Anpassung**: Zusätzlich Status-Updates durchführen

**Option A**: Zusätzlicher Scheduler (alle X Stunden)
**Option B**: In bestehenden Scheduler integrieren

**Empfehlung**: Option B - In bestehenden Scheduler integrieren, aber seltener ausführen (z.B. alle 2 Stunden statt alle 10 Minuten)

**Code-Struktur:**
```typescript
private static statusUpdateLastRun: Date | null = null;

private static async checkAllBranches(): Promise<void> {
  // ... bestehender Code für neue Reservierungen ...

  // Status-Updates: Alle 2 Stunden
  const now = new Date();
  const shouldUpdateStatuses = !this.statusUpdateLastRun || 
    (now.getTime() - this.statusUpdateLastRun.getTime()) > 2 * 60 * 60 * 1000;

  if (shouldUpdateStatuses) {
    this.statusUpdateLastRun = now;
    for (const branch of branches) {
      try {
        const updatedCount = await LobbyPmsReservationSyncService.syncReservationStatusesForBranch(branch.id);
        if (updatedCount > 0) {
          console.log(`[LobbyPmsReservationScheduler] ✅ Branch ${branch.id}: ${updatedCount} Status(es) aktualisiert`);
        }
      } catch (error) {
        console.error(`[LobbyPmsReservationScheduler] Fehler bei Status-Update für Branch ${branch.id}:`, error);
      }
    }
  }
}
```

#### 3.6 Alternative: Manueller Sync-Endpoint erweitern

**Datei**: `backend/src/controllers/lobbyPmsController.ts`

**Endpoint**: `POST /api/lobby-pms/sync`

**Erweiterung**: Optionaler Parameter `updateStatusesOnly: boolean`

**Code-Struktur:**
```typescript
if (updateStatusesOnly) {
  // Nur Status-Updates
  const updatedCount = await LobbyPmsReservationSyncService.syncReservationStatusesForBranch(branchId);
  return res.json({ success: true, updatedCount });
} else {
  // Normaler Sync (neue Reservierungen)
  // ...
}
```

---

## 📋 Zusammenfassung der Änderungen

### Neue Dateien:
1. `backend/src/services/reservationInvitationScheduler.ts` - Scheduler für tägliche Einladungen um 08:00

### Geänderte Dateien:
1. `backend/src/services/reservationNotificationService.ts`:
   - Neue Methode: `sendInvitationsForTomorrow()`
   - Anpassung: `sendCheckInConfirmation()` - Zahlungsstatus-Prüfung hinzufügen

2. `backend/src/controllers/lobbyPmsController.ts`:
   - Anpassung: `checkInReservation()` - Zahlungsstatus-Prüfung vor Versand

3. `backend/src/index.ts`:
   - Hinzufügen: `ReservationInvitationScheduler.start()`

4. `backend/src/services/lobbyPmsReservationSyncService.ts`:
   - Neue Methode: `syncReservationStatusesForBranch()`

5. `backend/src/services/lobbyPmsService.ts`:
   - Neue Methode: `fetchReservationById()`

6. `backend/src/services/lobbyPmsReservationScheduler.ts`:
   - Anpassung: Status-Updates integrieren (alle 2 Stunden)

---

## ⚠️ Wichtige Hinweise

1. **Scheduler-Konflikt**: Der neue `ReservationInvitationScheduler` (08:00) und der bestehende `ReservationScheduler` (20:00) können parallel laufen:
   - 08:00: Einladungen für alle Reservierungen mit Check-in morgen
   - 20:00: Späte Check-ins (nach 22:00 Uhr) - kann beibehalten werden

2. **Status-Update-Performance**: Explizite Prüfung aller Reservierungen kann bei vielen Reservierungen langsam sein. Lösung:
   - Nur Reservierungen mit `checkInDate >= gestern` prüfen
   - Oder: Batch-Processing (z.B. 100 Reservierungen pro Durchlauf)

3. **Zahlungsstatus-Prüfung**: Die Prüfung `paymentStatus === PaymentStatus.paid` muss sicherstellen, dass der Status korrekt aus LobbyPMS synchronisiert wird.

4. **Testing**: Alle Änderungen müssen getestet werden:
   - Scheduler startet korrekt
   - Einladungen werden um 08:00 versendet
   - Check-in-Bestätigung wird nur bei bezahlten Reservierungen versendet
   - Status-Updates funktionieren für alle Reservierungen (nicht nur neue)

---

## ✅ Checkliste für Implementierung

- [ ] Phase 1: ReservationInvitationScheduler erstellen
- [ ] Phase 1: `sendInvitationsForTomorrow()` implementieren
- [ ] Phase 1: Scheduler in index.ts registrieren
- [ ] Phase 2: Zahlungsstatus-Prüfung in `checkInReservation()` hinzufügen
- [ ] Phase 2: Zahlungsstatus-Prüfung in `sendCheckInConfirmation()` hinzufügen
- [ ] Phase 3: `fetchReservationById()` in LobbyPmsService implementieren
- [ ] Phase 3: `syncReservationStatusesForBranch()` implementieren
- [ ] Phase 3: Status-Updates in Scheduler integrieren
- [ ] Testing: Alle Scheduler testen
- [ ] Testing: Einladungen um 08:00 testen
- [ ] Testing: Check-in-Bestätigung nur bei bezahlten Reservierungen testen
- [ ] Testing: Status-Updates für alle Reservierungen testen
- [ ] Dokumentation aktualisieren

---

## 📝 Offene Fragen

1. **Soll der alte `ReservationScheduler` (20:00) beibehalten werden?**
   - Aktuell: Sendet nur an späte Check-ins (nach 22:00 Uhr)
   - Neue Lösung: Sendet an alle Check-ins morgen (um 08:00)
   - **Empfehlung**: Beide beibehalten (08:00 für alle, 20:00 für späte)

2. **Wie oft sollen Status-Updates durchgeführt werden?**
   - Aktuell: Alle 10 Minuten (nur neue Reservierungen)
   - Neue Lösung: Alle 2 Stunden (alle Reservierungen)
   - **Empfehlung**: Alle 2 Stunden für Status-Updates, alle 10 Minuten für neue Reservierungen

3. **Soll es einen manuellen Button für Einladungen geben?**
   - Aktuell: Nur automatisch
   - Plan: Button hinzufügen (siehe `RESERVATION_AUTOMATION_IMPLEMENTATION.md`)
   - **Empfehlung**: Erst Automatisierung implementieren, dann Button hinzufügen

---

**Ende des Plans - Bereit für Review und Implementierung**


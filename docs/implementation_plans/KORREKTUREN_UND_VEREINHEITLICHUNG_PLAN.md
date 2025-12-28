# Plan: Korrekturen und Vereinheitlichung

**Datum**: 2025-01-XX  
**Status**: 📋 Planung (noch nichts ändern)

---

## 1. updateGuestContact komplett entfernen

### Was muss entfernt werden:

#### Backend:
1. **Controller**: `backend/src/controllers/reservationController.ts`
   - Methode `updateGuestContact` (Zeile 32-290) komplett entfernen
   - Route `PUT /api/reservations/:id/guest-contact` entfernen

2. **Queue Worker**: `backend/src/queues/workers/updateGuestContactWorker.ts`
   - Komplette Datei entfernen

3. **Queue Service**: `backend/src/services/queueService.ts`
   - Methode `getUpdateGuestContactQueue()` entfernen
   - Queue-Import entfernen

4. **Routes**: `backend/src/routes/reservationRoutes.ts`
   - Route `PUT /api/reservations/:id/guest-contact` entfernen

#### Frontend:
1. **Component**: `frontend/src/components/reservations/GuestContactModal.tsx`
   - Komplette Datei entfernen

2. **Component**: `frontend/src/components/reservations/ReservationDetails.tsx`
   - Import `GuestContactModal` entfernen
   - State `showGuestContactModal` entfernen
   - Button "Kontakt hinzufügen" entfernen (Zeile 162-169)
   - Modal-Rendering entfernen (Zeile 376-383)

3. **Service**: `frontend/src/services/reservationService.ts`
   - Methode `updateGuestContact()` entfernen (Zeile 39-43)

4. **API Config**: `frontend/src/config/api.ts`
   - `UPDATE_GUEST_CONTACT` entfernen (Zeile 330)

### Abhängigkeiten prüfen:
- ✅ Keine anderen Stellen verwenden `updateGuestContact`
- ✅ Keine anderen Stellen verwenden `GuestContactModal`

---

## 2. createReservation - autoSend prüfen

### Aktuelles Verhalten:
**Code**: `backend/src/controllers/reservationController.ts` (Zeile 384-511)
- Wenn `autoSend === true` → sendet **SOFORT** nach Erstellung
- **FALSCH!** Sollte warten bis 08:00, 1 Tag vor Check-in

### Richtig ist:
**Scheduler**: `backend/src/services/reservationAutoInvitationScheduler.ts`
- Wird um **08:00** aufgerufen (Zeile 102)
- Prüft Reservierungen mit Check-in **morgen** (1 Tag vor Check-in)
- Ruft `sendReservationInvitation` auf (Zeile 164-191)
- ✅ **RICHTIG!**

### Korrektur:
**`createReservation`** sollte **NICHT** sofort senden, sondern:
- Wenn `autoSend === true` → **NICHT** sofort senden
- Scheduler wird um 08:00 automatisch senden (1 Tag vor Check-in)
- **ODER** sofort senden wenn Check-in-Datum heute oder in Vergangenheit (wenn 08:00 bereits vorbei)

**Aktuell**: `createReservation` sendet sofort (Zeile 471-511) ❌
**Sollte sein**: `createReservation` sendet nur wenn Check-in-Datum heute/vergangen, sonst wartet auf Scheduler

### Änderung:
- **Entfernen**: Zeile 471-511 (sofortiger Versand)
- **Behalten**: Nur wenn Check-in-Datum heute/vergangen → sofort senden
- **Sonst**: Scheduler sendet automatisch um 08:00, 1 Tag vor Check-in

---

## 3. Korrektur/Vereinheitlichung - Code einfacher & weniger

### Problem: Redundanzen

#### TTLock-Passcode-Versendung:
1. **`generatePinAndSendNotification`** (Zeile 1128-1499)
   - Generiert Passcode, versendet Email/WhatsApp
   - Verwendet Kontaktdaten aus Reservation
   - Prüft `notificationChannels` ❌ (sollte entfernt werden)

2. **`sendPasscodeNotification`** (Zeile 1507-2097)
   - Generiert Passcode, versendet Email/WhatsApp
   - **Anpassbare Kontaktdaten** (mehr Features)
   - Prüft `notificationChannels` ❌ (sollte entfernt werden)

3. **`sendCheckInConfirmation`** (Zeile 2104-2221)
   - Generiert Passcode, versendet Email/WhatsApp
   - Wird nach Check-in aufgerufen
   - Prüft `notificationChannels` ❌ (sollte entfernt werden)

### Vereinheitlichung:
**Option 1**: `sendPasscodeNotification` als einzige Methode
- `generatePinAndSendNotification` → ruft `sendPasscodeNotification` auf
- `sendCheckInConfirmation` → ruft `sendPasscodeNotification` auf
- **Code reduziert**: ~600 Zeilen weniger

**Option 2**: Alles in `sendPasscodeNotification` zusammenführen
- `generatePinAndSendNotification` → entfernen, durch `sendPasscodeNotification` ersetzen
- `sendCheckInConfirmation` → entfernen, durch `sendPasscodeNotification` ersetzen
- **Code reduziert**: ~800 Zeilen weniger

**Empfehlung**: Option 2 (mehr Code reduziert)

---

## 4. checkInReservation - Genau prüfen

### Frontend-Analyse:

#### Route existiert:
- **`/app/reservations/:id`** → `ReservationDetails.tsx` (App.tsx Zeile 155)

#### Details-Button:
- **NUR in Tabellenansicht** (Worktracker.tsx Zeile 3562-3575)
- Button "Details" → navigiert zu `/reservations/${reservation.id}`
- **NICHT in Card-Ansicht** (ReservationCard.tsx hat nur `onClick` prop, kein Details-Button)

#### Check-in-Button:
- **NUR in ReservationDetails.tsx** (Zeile 170-177)
- Button "Check-in durchführen" → öffnet `CheckInForm`
- `CheckInForm` ruft `PUT /api/lobby-pms/reservations/:id/check-in` auf

### User sagt:
"checkInReservation wird doch gar nie genutzt? bzw. schon ReservationDetails.tsx doch gar nicht? wie soll man von der card ansicht dahin gelangen? das ist ja nur noch in der tabellenansicht, weil du es ungefragt reingemacht & trotz diversen anweisungen nie entfernt hast."

### Tatsächlicher Flow:

#### Wenn Mitarbeiter im LobbyPMS Check-in macht:
1. LobbyPMS setzt `checked_in: true` in ihrer DB
2. **Scheduler** (`LobbyPmsReservationScheduler`) ruft alle 10 Minuten `syncReservation` auf
3. `syncReservation` erkennt `lobbyReservation.checked_in === true` (Zeile 1095)
4. `syncReservation` setzt Status auf `checked_in` (Zeile 1095)
5. **ABER**: `sendCheckInConfirmation` wird **NICHT** automatisch aufgerufen!
6. **NUR** wenn `checkInDataUploadedChanged && paymentStatus === paid` → ruft `generatePinAndSendNotification` auf (Zeile 1181-1201)

### Problem:
- **Frontend-Button** (`checkInReservation`) wird **NUR** genutzt wenn:
  - User ist in **Tabellenansicht** (nicht Card-Ansicht!)
  - User klickt Details-Button
  - User öffnet ReservationDetails
  - User klickt "Check-in durchführen"
- **Scheduler** (`syncReservation`) ruft **NICHT** `sendCheckInConfirmation` auf, nur `generatePinAndSendNotification` wenn Check-in-Link + Payment

### Lösung:
**Option 1**: `syncReservation` sollte auch `sendCheckInConfirmation` aufrufen wenn Status auf `checked_in` wechselt
- Wenn `lobbyReservation.checked_in === true` UND Status ändert sich von `confirmed`/`notification_sent` → `checked_in` → `sendCheckInConfirmation` aufrufen

**Option 2**: `checkInReservation` (Frontend-Button) + `ReservationDetails` entfernen
- Nur Scheduler verwendet werden
- **ABER**: Route existiert bereits, könnte von anderen Stellen verwendet werden

**Empfehlung**: 
- `syncReservation` sollte `sendCheckInConfirmation` aufrufen wenn Status auf `checked_in` wechselt
- `checkInReservation` (Frontend-Button) kann entfernt werden, da es nur in Tabellenansicht genutzt wird und User sagt es wird nie genutzt

---

## 5. notificationChannels - RICHTIG verwenden

### Was ist notificationChannels wirklich?
- **Zweck**: Prüft ob Email/WhatsApp Services von einer Org/Branch **überhaupt eingerichtet sind**
- **NICHT** Code von einem Script! Script setzt nur **DB-Einstellung**, Code verwendet diese
- **Sinn**: Wenn WhatsApp nicht konfiguriert ist (kein `apiKey`), sollte man es nicht versuchen zu senden

### Aktuelles Problem:
- `notificationChannels` prüft **NICHT** ob Services konfiguriert sind
- Prüft nur ob `notificationChannels.includes('email')` oder `notificationChannels.includes('whatsapp')`
- **Sollte sein**: Prüft ob `smtpHost` (Email) oder `whatsappSettings.apiKey` (WhatsApp) vorhanden sind

### Wie prüfen Services aktuell ob sie konfiguriert sind?

#### WhatsAppService:
- Prüft `whatsappSettings?.apiKey` (Zeile 139 in `whatsappService.ts`)
- Wirft Fehler wenn `apiKey` fehlt (Zeile 139-142)

#### EmailService:
- Prüft `smtpHost && smtpUser && smtpPass` (Zeile 31, 70, 98 in `emailService.ts`)
- Wirft Fehler wenn fehlt (Zeile 106-111)

### Korrektur:

#### notificationChannels sollte prüfen:
1. **Email**: Ob `smtpHost && smtpUser && smtpPass` vorhanden (Branch oder Organization Settings)
2. **WhatsApp**: Ob `whatsappSettings.apiKey` vorhanden (Branch oder Organization Settings)

#### Wo muss es hinzugefügt werden:
1. **`sendReservationInvitation`** (Zeile 489-1121):
   - **FEHLT komplett** - muss `notificationChannels` laden
   - Prüft aktuell nur `guestEmail`/`guestPhone` vorhanden
   - **Sollte prüfen**: `notificationChannels.includes('email')` UND Email-Service konfiguriert UND `guestEmail` vorhanden
   - **Sollte prüfen**: `notificationChannels.includes('whatsapp')` UND WhatsApp-Service konfiguriert UND `guestPhone` vorhanden

#### Wo wird es bereits verwendet (aber falsch):
1. **`generatePinAndSendNotification`** (Zeile 1158, 1250, 1299):
   - Prüft `notificationChannels.includes('email')` UND `guestEmail`
   - **FEHLT**: Prüfung ob Email-Service konfiguriert ist
   - Prüft `notificationChannels.includes('whatsapp')` UND `guestPhone`
   - **FEHLT**: Prüfung ob WhatsApp-Service konfiguriert ist

2. **`sendPasscodeNotification`** (Zeile 1552, 1740, 1797):
   - Gleiche Probleme wie `generatePinAndSendNotification`

3. **`sendCheckInConfirmation`** (Zeile 2134, 2174, 2184):
   - Gleiche Probleme wie `generatePinAndSendNotification`

### Lösung:
**Helper-Funktion erstellen**:
```typescript
async function isEmailConfigured(organizationId: number, branchId?: number): Promise<boolean> {
  // Prüfe Branch Settings
  if (branchId) {
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { emailSettings: true, organizationId: true }
    });
    if (branch?.emailSettings) {
      const settings = decryptBranchApiSettings(branch.emailSettings as any);
      const emailSettings = settings?.email || settings;
      if (emailSettings?.smtpHost && emailSettings?.smtpUser && emailSettings?.smtpPass) {
        return true;
      }
    }
    // Fallback auf Organization
    if (branch?.organizationId) organizationId = branch.organizationId;
  }
  
  // Prüfe Organization Settings
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { settings: true }
  });
  const orgSettings = decryptApiSettings(org?.settings as any);
  return !!(orgSettings?.smtpHost && orgSettings?.smtpUser && orgSettings?.smtpPass);
}

async function isWhatsAppConfigured(organizationId: number, branchId?: number): Promise<boolean> {
  // Prüfe Branch Settings
  if (branchId) {
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { whatsappSettings: true, organizationId: true }
    });
    if (branch?.whatsappSettings) {
      const settings = decryptBranchApiSettings(branch.whatsappSettings as any);
      const whatsappSettings = settings?.whatsapp || settings;
      if (whatsappSettings?.apiKey) {
        return true;
      }
    }
    // Fallback auf Organization
    if (branch?.organizationId) organizationId = branch.organizationId;
  }
  
  // Prüfe Organization Settings
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { settings: true }
  });
  const orgSettings = decryptApiSettings(org?.settings as any);
  return !!orgSettings?.whatsapp?.apiKey;
}
```

**Dann in allen Methoden verwenden**:
```typescript
const notificationChannels = decryptedSettings?.lobbyPms?.notificationChannels || ['email'];
const emailConfigured = await isEmailConfigured(reservation.organizationId, reservation.branchId);
const whatsappConfigured = await isWhatsAppConfigured(reservation.organizationId, reservation.branchId);

if (notificationChannels.includes('email') && emailConfigured && reservation.guestEmail) {
  // Email versenden
}

if (notificationChannels.includes('whatsapp') && whatsappConfigured && reservation.guestPhone) {
  // WhatsApp versenden
}
```

### Ergebnis:
- **Code wird korrekt**: Prüft ob Services konfiguriert sind, bevor versucht wird zu senden
- **Fehler werden vermieden**: Keine Fehler wenn Services nicht konfiguriert sind
- **Code wird konsistent**: Alle Methoden prüfen gleich

---

## Zusammenfassung

### 1. updateGuestContact entfernen:
- ✅ Controller-Methode entfernen
- ✅ Queue Worker entfernen
- ✅ Frontend Component entfernen
- ✅ API-Route entfernen
- **Code reduziert**: ~500 Zeilen weniger

### 2. createReservation autoSend korrigieren:
- ✅ Sofort-Versand entfernen (außer Check-in-Datum heute/vergangen)
- ✅ Scheduler sendet automatisch um 08:00, 1 Tag vor Check-in
- **Code reduziert**: ~40 Zeilen weniger

### 3. Vereinheitlichung:
- ✅ `generatePinAndSendNotification` → durch `sendPasscodeNotification` ersetzen
- ✅ `sendCheckInConfirmation` → durch `sendPasscodeNotification` ersetzen
- **Code reduziert**: ~800 Zeilen weniger

### 4. checkInReservation:
- ✅ **Entfernen**: `checkInReservation` (Frontend-Button) + `ReservationDetails` + `CheckInForm` (wird nur in Tabellenansicht genutzt, User sagt es wird nie genutzt)
- ✅ **Hinzufügen**: `syncReservation` sollte `sendCheckInConfirmation` aufrufen wenn Status auf `checked_in` wechselt
- **Code reduziert**: ~200 Zeilen weniger

### 5. notificationChannels - RICHTIG verwenden:
- ✅ Helper-Funktionen erstellen: `isEmailConfigured()`, `isWhatsAppConfigured()`
- ✅ `sendReservationInvitation`: `notificationChannels` laden + Service-Prüfung hinzufügen
- ✅ Alle Methoden: Service-Prüfung hinzufügen (nicht nur `notificationChannels.includes()`)
- **Code wird korrekt**: Prüft ob Services konfiguriert sind, bevor versucht wird zu senden

### Gesamt:
- **Code reduziert**: ~1590 Zeilen weniger
- **Code wird einfacher**: Weniger Redundanzen, korrekte Service-Prüfungen
- **Logik wird korrekt**: Prüft ob Services konfiguriert sind, bevor versucht wird zu senden


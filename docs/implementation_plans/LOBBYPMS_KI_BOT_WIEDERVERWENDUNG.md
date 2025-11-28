# LobbyPMS KI-Bot - Wiederverwendbare Komponenten

**Datum:** 2025-01-26  
**Status:** Analyse - Was kann wiederverwendet werden?

---

## ✅ Was bereits existiert und wiederverwendet werden kann

### 1. WhatsApp-Nachrichten versenden

**Service:** `backend/src/services/whatsappService.ts`

**Wiederverwendbare Methoden:**
- ✅ `sendMessage(to, message, template?, groupId?)` - Einfache Nachricht senden
- ✅ `sendMessageWithFallback(to, message, templateName, templateParams, reservation?)` - Hybrid: Session Message mit Fallback auf Template
- ✅ `sendCheckInInvitation(guestName, guestPhone, checkInLink, paymentLink)` - Speziell für Check-in-Einladungen

**Verwendung:**
```typescript
const whatsappService = reservation.branchId
  ? new WhatsAppService(undefined, reservation.branchId)
  : new WhatsAppService(reservation.organizationId);

await whatsappService.sendMessageWithFallback(
  guestPhone,
  message,
  'reservation_checkin_invitation',
  [guestName, checkInLink, paymentLink]
);
```

### 2. Zahlungslink erstellen

**Service:** `backend/src/services/boldPaymentService.ts`

**Wiederverwendbare Methode:**
- ✅ `createPaymentLink(reservation, amount, currency, description)` - Erstellt Bold Payment Link

**Verwendung:**
```typescript
const boldPaymentService = reservation.branchId
  ? await BoldPaymentService.createForBranch(reservation.branchId)
  : new BoldPaymentService(reservation.organizationId);

const paymentLink = await boldPaymentService.createPaymentLink(
  reservation,
  amount,
  currency,
  `Zahlung für Reservierung ${reservation.guestName}`
);
```

### 3. Check-in-Link erstellen

**Utility:** `backend/src/utils/checkInLinkUtils.ts`

**Wiederverwendbare Funktion:**
- ✅ `generateLobbyPmsCheckInLink(reservation, language?)` - Erstellt LobbyPMS Check-in-Link

**Verwendung:**
```typescript
import { generateLobbyPmsCheckInLink } from '../utils/checkInLinkUtils';

const checkInLink = generateLobbyPmsCheckInLink({
  id: reservation.id,
  lobbyReservationId: reservation.lobbyReservationId,
  guestEmail: reservation.guestEmail || ''
}, 'GB'); // Sprache: GB, ES, DE, etc.
```

### 4. Komplette Reservierungs-Einladung senden

**Service:** `backend/src/services/reservationNotificationService.ts`

**Wiederverwendbare Methode:**
- ✅ `sendReservationInvitation(reservationId, options?)` - Komplett: Payment-Link + Check-in-Link + WhatsApp/E-Mail

**Verwendung:**
```typescript
const result = await ReservationNotificationService.sendReservationInvitation(
  reservationId,
  {
    guestPhone: guestPhone,
    guestEmail: guestEmail,
    amount: amount,
    currency: currency
  }
);

// Ergebnis enthält:
// - paymentLink
// - checkInLink
// - messageSent
// - sentAt
// - error (falls Fehler)
```

**Was macht diese Methode:**
1. Erstellt Payment-Link (oder verwendet bestehenden)
2. Erstellt Check-in-Link
3. Sendet WhatsApp-Nachricht (wenn Telefonnummer vorhanden)
4. Sendet E-Mail (wenn E-Mail vorhanden)
5. Loggt Notification in Datenbank

### 5. Reservierung erstellen

**Controller:** `backend/src/controllers/reservationController.ts`

**Wiederverwendbare Methode:**
- ✅ `createReservation()` - Erstellt Reservierung in Datenbank

**Logik:**
- Erstellt Reservierung mit Status `confirmed`
- Setzt Payment-Status auf `pending`
- Automatischer Payment-Link & WhatsApp-Versand (wenn aktiviert)

**Kann direkt verwendet werden oder Service-Logik extrahieren**

### 6. Conversation State Management

**Service:** `backend/src/services/whatsappMessageHandler.ts`

**Wiederverwendbare Patterns:**
- ✅ `WhatsAppConversation` Model für State-Management
- ✅ `startRequestCreation()` / `continueConversation()` Pattern
- ✅ Context-Speicherung in `conversation.context` (JSON)

**Pattern für Reservierungserstellung:**
```typescript
// State setzen
await prisma.whatsAppConversation.update({
  where: { id: conversation.id },
  data: {
    state: 'reservation_creation',
    context: { step: 'waiting_for_check_in_date' }
  }
});

// In continueConversation() prüfen
if (conversation.state === 'reservation_creation') {
  return await this.continueReservationCreation(...);
}
```

---

## 🎯 Was muss neu implementiert werden

### 1. Verfügbarkeitsprüfung

**Neu:**
- ❌ `LobbyPmsService.checkAvailability()` - API-Endpunkt testen und implementieren
- ❌ WhatsApp Function `check_room_availability` - Function Definition und Handler

**Wiederverwendbar:**
- ✅ `LobbyPmsService.createForBranch()` - Service-Erstellung
- ✅ `WhatsAppAiService.getFunctionDefinitions()` - Function Definition hinzufügen
- ✅ `WhatsAppFunctionHandlers` - Function Handler hinzufügen

### 2. Reservierungserstellung via Bot

**Neu:**
- ❌ Mehrstufige Konversation (`startReservationCreation`, `continueReservationCreation`)
- ❌ Datum-Parsing (`parseDateFromMessage`)
- ❌ Verfügbarkeitsprüfung in Konversation

**Wiederverwendbar:**
- ✅ `ReservationNotificationService.sendReservationInvitation()` - Für Link-Versand
- ✅ `prisma.reservation.create()` - Für Reservierungserstellung
- ✅ Conversation State Management Pattern

### 3. Automatische Stornierung

**Neu:**
- ❌ `ReservationAutoCancelScheduler` - Scheduler Service
- ❌ Datenbank-Felder (`paymentDeadline`, `autoCancelEnabled`, etc.)

**Wiederverwendbar:**
- ✅ `LobbyPmsService.updateReservationStatus()` - Für LobbyPMS Stornierung
- ✅ Scheduler-Pattern (ähnlich wie `reservationScheduler.ts`)

---

## 📋 Zusammenfassung: Wiederverwendung

### ✅ Direkt wiederverwendbar:

1. **WhatsApp-Versand:**
   - `WhatsAppService.sendMessageWithFallback()` ✅
   - `WhatsAppService.sendCheckInInvitation()` ✅

2. **Payment-Link:**
   - `BoldPaymentService.createPaymentLink()` ✅

3. **Check-in-Link:**
   - `generateLobbyPmsCheckInLink()` ✅

4. **Komplette Einladung:**
   - `ReservationNotificationService.sendReservationInvitation()` ✅

5. **Reservierungserstellung:**
   - `prisma.reservation.create()` ✅
   - Logik aus `reservationController.ts` ✅

6. **Conversation State:**
   - `WhatsAppConversation` Model ✅
   - State-Management Pattern ✅

### ❌ Muss neu implementiert werden:

1. **Verfügbarkeitsprüfung:**
   - API-Endpunkt testen
   - `checkAvailability()` Methode
   - WhatsApp Function

2. **Mehrstufige Konversation:**
   - `startReservationCreation()`
   - `continueReservationCreation()`
   - Datum-Parsing

3. **Automatische Stornierung:**
   - Scheduler
   - Datenbank-Felder

---

**Erstellt:** 2025-01-26  
**Status:** ✅ ANALYSE ABGESCHLOSSEN


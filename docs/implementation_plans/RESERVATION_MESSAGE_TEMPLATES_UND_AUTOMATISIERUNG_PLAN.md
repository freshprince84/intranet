# Implementierungsplan: Konfigurierbare Mitteilungsvorlagen & Automatische Versendung

**Datum**: 2025-01-31  
**Status**: 📋 Planung

## 🎯 Zielsetzung

1. **Konfigurierbare Mitteilungsvorlagen** im Branch Edit Pane (neuer Tab "Nachrichten")
   - WhatsApp Meta Business Template Parameter konfigurierbar
   - Email-Content inhaltlich gleich wie WhatsApp Template
   - Für 3 Sprachen: EN, ES, DE
   - Für beide Mitteilungen: Check-in-Einladung + TTLock Passcode

2. **Automatische Versendung** konfigurierbar im Branch Edit Pane
   - Einstellung: Automatisches Versenden aktivieren/deaktivieren
   - Wenn aktiviert: 1 Tag vor Check-in-Date um 08:00 Uhr versenden
   - Je nach verfügbaren Kontaktdaten: Email wenn Email vorhanden, WhatsApp wenn Tel vorhanden, beides wenn beides vorhanden

3. **Sofort-Versendung beim Import**
   - Wenn Reservation später importiert wird (Check-in-Date heute oder in Vergangenheit)
   - Und Versenden 1 Tag vor Check-in-Date nicht mehr möglich ist
   - → Nachricht direkt beim Import versenden

4. **Email-Versendung bei manueller Reservation-Erstellung**
   - Wenn `contactType === 'email'` UND `reservation.guestEmail` vorhanden
   - → Email automatisch versenden (aktuell fehlt das)

---

## 📊 Aktuelle Situation - Detaillierte Analyse

### 1. Automatische Versendung bei manueller Reservation-Erstellung

**Code**: `backend/src/controllers/reservationController.ts` Zeile 471-490

**Aktuell:**
- ✅ WhatsApp wird gesendet, wenn `contactType === 'phone'` UND `reservation.guestPhone` vorhanden
- ❌ Email wird NICHT automatisch gesendet, wenn `contactType === 'email'` UND `reservation.guestEmail` vorhanden
- `sendReservationInvitation` unterstützt bereits Email (Zeile 486-600), wird aber nicht aufgerufen

**Problem:**
```typescript
// Zeile 471: Nur für phone!
if (contactType === 'phone' && reservation.guestPhone) {
  await ReservationNotificationService.sendReservationInvitation(...)
}
// ❌ FEHLT: Email-Versendung für contactType === 'email'
```

---

### 2. Import-Stellen

#### 2.1 LobbyPMS API Import

**Code**: `backend/src/services/lobbyPmsService.ts` → `syncReservation()` (Zeile 946-1165)

**Aktuell:**
- Erstellt/aktualisiert Reservation
- ❌ KEIN automatischer Versand der Check-in-Einladung beim Import
- ✅ Nur PIN-Versand wenn Check-in abgeschlossen UND bezahlt (Zeile 1152-1162)

**Aufruf-Kette:**
- `LobbyPmsReservationScheduler.checkAllBranches()` → alle 10 Minuten
- `LobbyPmsReservationSyncService.syncReservationsForBranch()`
- `LobbyPmsService.syncReservations()`
- `LobbyPmsService.syncReservation()` ← HIER wird Reservation erstellt/aktualisiert

#### 2.2 Email Import

**Code**: `backend/src/services/emailReservationService.ts` → `createReservationFromEmail()` (Zeile 23-129)

**Aktuell:**
- Erstellt Reservation
- ✅ WhatsApp-Versand nur wenn `EMAIL_RESERVATION_WHATSAPP_ENABLED=true` UND `guestPhone` vorhanden (Zeile 99-122)
- ❌ KEIN Email-Versand beim Import (auch wenn `guestEmail` vorhanden)

**Aufruf-Kette:**
- `EmailReservationScheduler.checkAllOrganizations()` → alle 10 Minuten
- `EmailReservationService.processEmail()`
- `EmailReservationService.createReservationFromEmail()` ← HIER wird Reservation erstellt

---

### 3. Aktueller Scheduler

**Code**: `backend/src/services/reservationScheduler.ts`

**Aktuell:**
- Täglich um 20:00 Uhr
- `sendLateCheckInInvitations()` → für Reservations mit Check-in morgen nach 22:00 Uhr (lateCheckInThreshold)

**Problem:**
- ❌ Kein Scheduler für 1 Tag vor Check-in um 08:00 Uhr
- ❌ Keine konfigurierbare Einstellung pro Branch

---

### 4. Template-Konfiguration

**Aktuell:**
- ❌ WhatsApp Meta Business Templates sind hardcodiert
- ❌ Email-Content ist hardcodiert in `sendCheckInInvitationEmail` und `sendCheckInConfirmationEmail`
- ❌ Nur EN und ES vorhanden, DE fehlt
- ❌ Keine Konfiguration im Branch Edit Pane

---

## 🔧 Implementierungsplan

### Phase 1: Email-Versendung bei manueller Reservation-Erstellung

**Datei**: `backend/src/controllers/reservationController.ts`

**Änderung:**
- Email-Versendung hinzufügen, wenn `contactType === 'email'` UND `reservation.guestEmail` vorhanden
- `sendReservationInvitation` unterstützt bereits Email (Zeile 486-600)

**Code-Änderung:**
```typescript
// Zeile 471-490: Erweitern um Email-Logik
if (contactType === 'phone' && reservation.guestPhone) {
  // WhatsApp-Versendung (bestehend)
  await ReservationNotificationService.sendReservationInvitation(
    reservation.id,
    {
      amount,
      currency
    }
  );
} else if (contactType === 'email' && reservation.guestEmail) {
  // NEU: Email-Versendung
  await ReservationNotificationService.sendReservationInvitation(
    reservation.id,
    {
      guestEmail: reservation.guestEmail,
      amount,
      currency
    }
  );
}
```

---

### Phase 2: Branch Settings erweitern (neuer Tab "Nachrichten")

#### 2.1 Datenbankschema erweitern

**Datei**: `backend/prisma/schema.prisma`

**Neues Feld in Branch:**
```prisma
model Branch {
  // ... bestehende Felder
  messageTemplates Json? // NEU: Konfigurierbare Mitteilungsvorlagen
  autoSendReservationInvitation Boolean? // NEU: Automatisches Versenden aktivieren/deaktivieren
}
```

**Migration:**
```sql
ALTER TABLE "Branch" ADD COLUMN "messageTemplates" JSONB;
ALTER TABLE "Branch" ADD COLUMN "autoSendReservationInvitation" BOOLEAN DEFAULT false;
```

#### 2.2 Settings-Struktur

```typescript
interface MessageTemplates {
  checkInInvitation: {
    en: {
      whatsappTemplateName: string;      // z.B. "reservation_checkin_invitation_en"
      whatsappTemplateParams: string[];   // z.B. ["{{1}}", "{{2}}", "{{3}}"]
      emailSubject: string;               // z.B. "Welcome to La Familia Hostel - Online Check-in"
      emailContent: string;                // Template-Text mit {{guestName}}, {{checkInLink}}, {{paymentLink}}
    };
    es: { /* ... */ };
    de: { /* ... */ };
  };
  checkInConfirmation: {
    en: {
      whatsappTemplateName: string;       // z.B. "reservation_checkin_completed_en"
      whatsappTemplateParams: string[];  // z.B. ["{{1}}", "{{2}}"]
      emailSubject: string;               // z.B. "Your check-in is completed - Room information"
      emailContent: string;                // Template-Text mit {{guestName}}, {{roomDisplay}}, {{doorPin}}, {{doorAppName}}
    };
    es: { /* ... */ };
    de: { /* ... */ };
  };
}
```

#### 2.3 Backend: Validation Schema

**Datei**: `backend/src/validation/branchSettingsSchema.ts`

**Hinzufügen:**
```typescript
export const messageTemplatesSchema = z.object({
  checkInInvitation: z.object({
    en: z.object({
      whatsappTemplateName: z.string(),
      whatsappTemplateParams: z.array(z.string()),
      emailSubject: z.string(),
      emailContent: z.string()
    }),
    es: z.object({ /* ... */ }),
    de: z.object({ /* ... */ })
  }),
  checkInConfirmation: z.object({
    en: z.object({ /* ... */ }),
    es: z.object({ /* ... */ }),
    de: z.object({ /* ... */ })
  })
});

export const branchSettingsSchema = z.object({
  // ... bestehende Felder
  messageTemplates: messageTemplatesSchema.optional(),
  autoSendReservationInvitation: z.boolean().optional()
});
```

#### 2.4 Backend: Controller erweitern

**Datei**: `backend/src/controllers/branchController.ts`

- `updateBranch`: `messageTemplates` und `autoSendReservationInvitation` verschlüsselt speichern (wie andere Settings)
- `getBranchById`: `messageTemplates` und `autoSendReservationInvitation` entschlüsselt zurückgeben

#### 2.5 Frontend: Branch Edit Pane erweitern

**Datei**: `frontend/src/components/BranchManagementTab.tsx`

**Neuer Tab "Nachrichten":**
- Tab-Button hinzufügen: `'whatsapp' | 'lobbypms' | 'boldpayment' | 'doorsystem' | 'email' | 'messages'`
- Neue Section mit:
  1. **Automatisches Versenden:**
     - Toggle: "Automatisches Versenden aktivieren"
     - Info-Text: "Sendet Check-in-Einladungen automatisch 1 Tag vor Check-in-Date um 08:00 Uhr"
  
  2. **Mitteilungsvorlagen:**
     - Dropdown: Mitteilungstyp (Check-in-Einladung / Check-in-Bestätigung)
     - Dropdown: Sprache (EN / ES / DE)
     - Felder:
       - WhatsApp Template Name (Text-Input)
       - WhatsApp Template Parameter (Array-Input, komma-separiert)
       - Email Betreff (Text-Input)
       - Email Inhalt (Textarea mit Variablen-Hinweis: `{{guestName}}`, `{{checkInLink}}`, `{{paymentLink}}`, etc.)
     - Vorschau-Button (zeigt gerenderten Text mit Beispielwerten)

---

### Phase 3: Service-Layer anpassen (Template-Loading)

#### 3.1 Template-Loading aus Branch Settings

**Datei**: `backend/src/services/reservationNotificationService.ts`

**Neue Methode:**
```typescript
private static async getMessageTemplate(
  branchId: number | null,
  organizationId: number,
  templateType: 'checkInInvitation' | 'checkInConfirmation',
  language: 'en' | 'es' | 'de'
): Promise<MessageTemplate | null> {
  // 1. Lade Branch Settings (falls branchId vorhanden)
  // 2. Fallback auf Organization Settings
  // 3. Fallback auf Hardcoded Defaults
  // 4. Entschlüssele messageTemplates
  // 5. Return Template für templateType + language
}
```

#### 3.2 `sendReservationInvitation` anpassen

**Datei**: `backend/src/services/reservationNotificationService.ts` (Zeile 206-600)

**Änderungen:**
- Template aus Branch Settings laden (statt hardcodiert)
- WhatsApp: Template-Name und Parameter aus Settings verwenden
- Email: Subject und Content aus Settings verwenden
- Variablen ersetzen: `{{guestName}}`, `{{checkInLink}}`, `{{paymentLink}}`
- Fallback auf Hardcoded Defaults, falls kein Template konfiguriert

#### 3.3 `generatePinAndSendNotification` anpassen

**Datei**: `backend/src/services/reservationNotificationService.ts` (Zeile 1100-1600)

**Änderungen:**
- Template aus Branch Settings laden (statt hardcodiert)
- WhatsApp: Template-Name und Parameter aus Settings verwenden
- Email: Subject und Content aus Settings verwenden
- Variablen ersetzen: `{{guestName}}`, `{{roomDisplay}}`, `{{doorPin}}`, `{{doorAppName}}`
- Fallback auf Hardcoded Defaults, falls kein Template konfiguriert

#### 3.4 `sendCheckInInvitationEmail` anpassen

**Datei**: `backend/src/services/reservationNotificationService.ts` (Zeile 1641-1810)

**Änderungen:**
- Template aus Branch Settings laden
- Subject und Content aus Template verwenden
- Variablen ersetzen
- HTML-Generierung beibehalten (Links als Buttons)

#### 3.5 `sendCheckInConfirmationEmail` anpassen

**Datei**: `backend/src/services/reservationNotificationService.ts` (Zeile 1815-1943)

**Änderungen:**
- Template aus Branch Settings laden
- Subject und Content aus Template verwenden
- Variablen ersetzen
- HTML-Generierung beibehalten

---

### Phase 4: WhatsApp Service anpassen

**Datei**: `backend/src/services/whatsappService.ts`

**Änderungen:**
- `sendCheckInInvitation`: Template-Name aus Branch Settings verwenden (statt `process.env.WHATSAPP_TEMPLATE_CHECKIN_INVITATION`)
- `sendCheckInConfirmation`: Template-Name aus Branch Settings verwenden (statt `process.env.WHATSAPP_TEMPLATE_CHECKIN_CONFIRMATION`)
- Template-Parameter aus Settings verwenden

---

### Phase 5: Neuer Scheduler für automatische Versendung (1 Tag vor Check-in um 08:00)

**Datei**: `backend/src/services/reservationAutoInvitationScheduler.ts` (NEU)

**Neue Klasse:**
```typescript
import { toZonedTime } from 'date-fns-tz';
import { getTimezoneForCountry } from '../utils/timeUtils';

export class ReservationAutoInvitationScheduler {
  private static checkInterval: NodeJS.Timeout | null = null;
  private static lastCheckDate: string = '';

  static start(): void {
    // Prüfe alle 10 Minuten
    // Für jede Organisation: Prüfe ob es 08:00 Uhr in der Zeitzone der Organisation ist
    // Wenn ja: Versende Einladungen für Reservations mit Check-in morgen
  }

  static async sendInvitationsForTomorrow(): Promise<void> {
    const now = new Date(); // UTC
    
    // 1. Hole alle Branches mit autoSendReservationInvitation = true
    // 2. Gruppiere nach Organisation (für Zeitzone-Prüfung)
    // 3. Für jede Organisation:
    //    - Hole country aus organization
    //    - Bestimme Zeitzone: getTimezoneForCountry(organization.country)
    //    - Prüfe aktuelle Zeit in Zeitzone: toZonedTime(now, timezone)
    //    - Prüfe ob currentHour === 8 (08:00 Uhr in Zeitzone der Organisation)
    //    - Wenn ja: Versende Einladungen für Reservations mit checkInDate = morgen
    // 4. Für jede Reservation:
    //    - Prüfe ob bereits versendet (invitationSentAt)
    //    - Prüfe Kontaktdaten (Email, WhatsApp)
    //    - Versende je nach verfügbaren Kontaktdaten
    //    - Setze invitationSentAt
  }
}
```

**Registrierung:**
- `backend/src/app.ts` Zeile 175-182: Scheduler starten

---

### Phase 6: Sofort-Versendung beim Import

#### 6.1 LobbyPMS Import

**Datei**: `backend/src/services/lobbyPmsService.ts` → `syncReservation()` (Zeile 946-1165)

**Änderung nach Zeile 1162 (nach PIN-Versand):**
```typescript
// NEU: Sofort-Versendung wenn Check-in-Date heute oder in Vergangenheit
// UND autoSendReservationInvitation aktiviert
// UND noch nicht versendet (invitationSentAt === null)
if (reservation.checkInDate) {
  const checkInDate = new Date(reservation.checkInDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  checkInDate.setHours(0, 0, 0, 0);
  
  // Prüfe ob Check-in-Date heute oder in Vergangenheit
  const isTodayOrPast = checkInDate <= today;
  
  // Prüfe Branch Settings: autoSendReservationInvitation
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: { autoSendReservationInvitation: true }
  });
  
  const autoSend = branch?.autoSendReservationInvitation ?? false;
  
  // Prüfe ob bereits versendet
  const alreadySent = reservation.invitationSentAt !== null;
  
  if (isTodayOrPast && autoSend && !alreadySent) {
    try {
      logger.log(`[LobbyPMS] Check-in-Date heute/vergangen → versende sofort für Reservierung ${reservation.id}`);
      const { ReservationNotificationService } = await import('./reservationNotificationService');
      await ReservationNotificationService.sendReservationInvitation(reservation.id);
      
      // Markiere als versendet
      await prisma.reservation.update({
        where: { id: reservation.id },
        data: { invitationSentAt: new Date() }
      });
    } catch (error) {
      logger.error(`[LobbyPMS] Fehler beim sofortigen Versenden für Reservierung ${reservation.id}:`, error);
      // Fehler nicht weiterwerfen, da Import erfolgreich war
    }
  }
}
```

#### 6.2 Email Import

**Datei**: `backend/src/services/emailReservationService.ts` → `createReservationFromEmail()` (Zeile 23-129)

**Änderung nach Zeile 84 (nach Reservation-Erstellung):**
```typescript
// NEU: Sofort-Versendung wenn Check-in-Date heute oder in Vergangenheit
// UND autoSendReservationInvitation aktiviert
if (reservation.checkInDate) {
  const checkInDate = new Date(reservation.checkInDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  checkInDate.setHours(0, 0, 0, 0);
  
  const isTodayOrPast = checkInDate <= today;
  
  // Prüfe Branch Settings: autoSendReservationInvitation
  const branch = reservation.branchId ? await prisma.branch.findUnique({
    where: { id: reservation.branchId },
    select: { autoSendReservationInvitation: true }
  }) : null;
  
  const autoSend = branch?.autoSendReservationInvitation ?? false;
  
  if (isTodayOrPast && autoSend) {
    try {
      logger.log(`[EmailReservation] Check-in-Date heute/vergangen → versende sofort für Reservierung ${reservation.id}`);
      const { ReservationNotificationService } = await import('./reservationNotificationService');
      
      // Versende je nach verfügbaren Kontaktdaten
      const options: any = {
        amount: parsedEmail.amount,
        currency: parsedEmail.currency || 'COP'
      };
      
      if (reservation.guestEmail) {
        options.guestEmail = reservation.guestEmail;
      }
      if (reservation.guestPhone) {
        options.guestPhone = reservation.guestPhone;
      }
      
      const result = await ReservationNotificationService.sendReservationInvitation(
        reservation.id,
        options
      );
      
      if (result.success) {
        // Markiere als versendet
        await prisma.reservation.update({
          where: { id: reservation.id },
          data: { invitationSentAt: new Date() }
        });
        logger.log(`[EmailReservation] ✅ Sofort-Versendung erfolgreich für Reservierung ${reservation.id}`);
      }
    } catch (error) {
      logger.error(`[EmailReservation] Fehler beim sofortigen Versenden für Reservierung ${reservation.id}:`, error);
      // Fehler nicht weiterwerfen, da Reservation erfolgreich erstellt wurde
    }
  }
}
```

---

### Phase 7: Default-Templates erstellen

**Datei**: `backend/src/services/reservationNotificationService.ts`

**Konstanten für Default-Templates (EN, ES, DE):**
- `DEFAULT_CHECKIN_INVITATION_TEMPLATES`
- `DEFAULT_CHECKIN_CONFIRMATION_TEMPLATES`

Diese werden verwendet, wenn keine Branch/Organization Settings vorhanden sind.

---

### Phase 8: Übersetzungen (I18N)

**Datei**: `frontend/src/locales/*.json`

**Neue Keys (für alle 3 Sprachen: de, en, es):**
```json
{
  "branches.messagesTab": "Nachrichten",
  "branches.autoSendInvitation": "Automatisches Versenden aktivieren",
  "branches.autoSendInvitationDescription": "Sendet Check-in-Einladungen automatisch 1 Tag vor Check-in-Date um 08:00 Uhr",
  "branches.messageType": "Mitteilungstyp",
  "branches.messageType.checkInInvitation": "Check-in-Einladung",
  "branches.messageType.checkInConfirmation": "Check-in-Bestätigung",
  "branches.language": "Sprache",
  "branches.language.en": "Englisch",
  "branches.language.es": "Spanisch",
  "branches.language.de": "Deutsch",
  "branches.whatsappTemplateName": "WhatsApp Template Name",
  "branches.whatsappTemplateParams": "WhatsApp Template Parameter",
  "branches.whatsappTemplateParamsHint": "Komma-separiert, z.B. {{1}}, {{2}}, {{3}}",
  "branches.emailSubject": "Email Betreff",
  "branches.emailContent": "Email Inhalt",
  "branches.templateVariables": "Verfügbare Variablen",
  "branches.templateVariables.checkInInvitation": "{{guestName}}, {{checkInLink}}, {{paymentLink}}",
  "branches.templateVariables.checkInConfirmation": "{{guestName}}, {{roomDisplay}}, {{doorPin}}, {{doorAppName}}",
  "branches.preview": "Vorschau",
  "branches.save": "Speichern",
  "branches.cancel": "Abbrechen"
}
```

**⚠️ WICHTIG**: Alle Keys müssen in `de.json`, `en.json` und `es.json` hinzugefügt werden!

---

### Phase 9: Berechtigungen (Permissions)

**Datei**: `backend/prisma/seed.ts`

**Prüfung:**
- ✅ Branches-Tabelle existiert bereits in `ALL_TABLES`
- ✅ Berechtigungen für Branches existieren bereits
- ⚠️ **KEINE neuen Permissions nötig** - Der neue Tab "Nachrichten" ist Teil der bestehenden Branch-Verwaltung

**Hinweis**: Der Tab "Nachrichten" verwendet die gleichen Permissions wie die anderen Branch-Tabs (z.B. "branches" table write permission).

---

### Phase 10: Zeitzone-Handling

**WICHTIG**: Zeitzone basierend auf Organisation/Branch-Land (wie `reservationPasscodeCleanupScheduler.ts`)

**Bestehender Standard** (aus `reservationPasscodeCleanupScheduler.ts` Zeile 151-173):
- Verwendet `reservation.organization.country` um Zeitzone zu bestimmen
- `getTimezoneForCountry(reservation.organization.country)` holt IANA-Zeitzone
- Lokale Zeit wird berechnet und dann zu UTC konvertiert für Vergleich
- Beispiel: `fromZonedTime(checkoutAt11Local, timezone)` konvertiert lokale Zeit zu UTC

**Neuer Scheduler** (`reservationAutoInvitationScheduler.ts`):
- **Für jede Reservation**: Hole `reservation.organization.country`
- **Bestimme Zeitzone**: `getTimezoneForCountry(reservation.organization.country)`
- **Prüfe aktuelle Zeit in Zeitzone der Organisation**:
  ```typescript
  const now = new Date(); // UTC
  const nowInTimezone = toZonedTime(now, timezone); // Lokale Zeit in Zeitzone der Organisation
  const currentHour = nowInTimezone.getHours();
  ```
- **Prüfe ob 08:00 Uhr**: `currentHour === 8` (in der Zeitzone der Organisation)
- **Für jede Organisation/Branch separat prüfen** (verschiedene Zeitzonen möglich)

**Geplante Uhrzeit**: **08:00 Uhr in der Zeitzone der Organisation** (nicht Server-Zeit!)

**Import**: `fromZonedTime` und `toZonedTime` von `date-fns-tz` verwenden

---

## 📋 Zusammenfassung der Änderungen

### Backend:
1. ✅ `reservationController.ts`: Email-Versendung bei manueller Erstellung
2. ✅ `schema.prisma`: `messageTemplates` und `autoSendReservationInvitation` Felder hinzufügen
3. ✅ Migration: Spalten hinzufügen
4. ✅ `branchSettingsSchema.ts`: Validation Schema
5. ✅ `branchController.ts`: Settings speichern/laden
6. ✅ `reservationNotificationService.ts`: Template-Loading und Verwendung
7. ✅ `whatsappService.ts`: Template-Namen aus Settings
8. ✅ `reservationAutoInvitationScheduler.ts`: NEU - Scheduler für 1 Tag vor Check-in um 08:00
9. ✅ `lobbyPmsService.ts`: Sofort-Versendung beim Import
10. ✅ `emailReservationService.ts`: Sofort-Versendung beim Import + Email-Versendung

### Frontend:
1. ✅ `BranchManagementTab.tsx`: Neuer Tab "Nachrichten"
2. ✅ `locales/*.json`: Übersetzungen

---

## 🔄 Reihenfolge der Implementierung

1. **Phase 1**: Email-Versendung bei manueller Erstellung
2. **Phase 2**: Branch Settings erweitern (Schema, Validation, Controller, Frontend)
3. **Phase 3**: Service-Layer anpassen (Template-Loading, Verwendung)
4. **Phase 4**: WhatsApp Service anpassen
5. **Phase 5**: Neuer Scheduler für automatische Versendung (08:00 Uhr Server-Zeit)
6. **Phase 6**: Sofort-Versendung beim Import (LobbyPMS + Email)
7. **Phase 7**: Default-Templates erstellen
8. **Phase 8**: Übersetzungen hinzufügen (I18N - de, en, es)
9. **Phase 9**: Berechtigungen prüfen (keine neuen nötig)
10. **Phase 10**: Zeitzone-Handling (Server-Zeit, konsistent mit bestehenden Schedulern)

---

## ⚠️ Wichtige Hinweise

1. **Rückwärtskompatibilität**: Fallback auf Hardcoded Defaults, falls keine Branch Settings vorhanden
2. **Verschlüsselung**: `messageTemplates` muss verschlüsselt gespeichert werden (wie andere Settings)
3. **Sprache-Erkennung**: Weiterhin über `CountryLanguageService.getLanguageForReservation()`
4. **Kontaktdaten-Prüfung**: Email wenn Email vorhanden, WhatsApp wenn Tel vorhanden, beides wenn beides vorhanden
5. **Doppel-Versendung vermeiden**: Prüfe `invitationSentAt` vor Versendung (Feld existiert bereits im Schema)
6. **Scheduler-Registrierung**: Neuer Scheduler muss in `app.ts` gestartet werden
7. **Queue-System**: Automatische Versendung über Scheduler läuft synchron (nicht über Queue), da zeitkritisch
8. **Logging**: Alle Versendungen werden in `ReservationNotificationLog` geloggt (existiert bereits)
9. **Migration für bestehende Branches**: `autoSendReservationInvitation` Default = `false` (muss explizit aktiviert werden)
10. **Template-Validierung**: Prüfe ob alle Variablen im Template vorhanden sind ({{guestName}}, {{checkInLink}}, etc.)
11. **Zeitzone**: **08:00 Uhr in der Zeitzone der Organisation** (NICHT Server-Zeit!)
    - Verwendet `reservation.organization.country` um Zeitzone zu bestimmen
    - `getTimezoneForCountry(organization.country)` holt IANA-Zeitzone
    - `toZonedTime(now, timezone)` konvertiert UTC zu lokaler Zeit der Organisation
    - Prüft `currentHour === 8` in der Zeitzone der Organisation
    - Konsistent mit `reservationPasscodeCleanupScheduler.ts` (Zeile 151-173)
12. **Standards beachtet**:
    - ✅ **I18N**: Alle UI-Texte müssen übersetzt werden (de, en, es)
    - ✅ **Permissions**: Keine neuen Permissions nötig (verwendet bestehende Branches-Permissions)
    - ✅ **Zeitzone**: Basierend auf `organization.country` (wie `reservationPasscodeCleanupScheduler.ts`)

---

## ✅ Checkliste vor Implementierung

- [x] Alle Import-Stellen identifiziert (LobbyPMS + Email)
- [x] Alle Scheduler-Stellen identifiziert
- [x] Datenbankschema-Änderungen geplant
- [x] Validation Schema erstellt
- [x] Frontend-Komponenten geplant
- [x] Übersetzungen identifiziert
- [x] Rückwärtskompatibilität sichergestellt
- [x] Fehlerbehandlung geplant
- [x] `invitationSentAt` Feld existiert bereits (keine Migration nötig)
- [x] `ReservationNotificationLog` existiert bereits (Logging vorhanden)

---

## 🧪 Test-Szenarien

### 1. Manuelle Reservation-Erstellung
- [ ] Reservation mit Email → Email wird versendet
- [ ] Reservation mit Telefon → WhatsApp wird versendet
- [ ] Reservation mit beidem → Beide werden versendet
- [ ] Template aus Branch Settings wird verwendet
- [ ] Fallback auf Defaults wenn kein Template konfiguriert

### 2. Automatische Versendung (1 Tag vor Check-in um 08:00)
- [ ] Scheduler prüft alle 10 Minuten
- [ ] Für jede Organisation: Prüft ob es 08:00 Uhr in der Zeitzone der Organisation ist
- [ ] Reservations mit Check-in morgen werden versendet
- [ ] Nur wenn `autoSendReservationInvitation = true`
- [ ] Nur wenn `invitationSentAt === null`
- [ ] Je nach Kontaktdaten: Email, WhatsApp oder beides
- [ ] Zeitzone wird aus `reservation.organization.country` bestimmt

### 3. Sofort-Versendung beim Import
- [ ] LobbyPMS Import: Reservation mit Check-in heute → sofort versendet
- [ ] LobbyPMS Import: Reservation mit Check-in gestern → sofort versendet
- [ ] LobbyPMS Import: Reservation mit Check-in morgen → NICHT sofort versendet (Scheduler)
- [ ] Email Import: Reservation mit Check-in heute → sofort versendet
- [ ] Email Import: Reservation mit Check-in gestern → sofort versendet
- [ ] Email Import: Reservation mit Check-in morgen → NICHT sofort versendet (Scheduler)

### 4. Template-Konfiguration
- [ ] Template für EN/ES/DE konfigurierbar
- [ ] Template für Check-in-Einladung konfigurierbar
- [ ] Template für Check-in-Bestätigung konfigurierbar
- [ ] Variablen werden korrekt ersetzt
- [ ] Fallback auf Defaults wenn Template fehlt

### 5. Fehlerbehandlung
- [ ] Template nicht gefunden → Fallback auf Defaults
- [ ] Email-Versendung fehlgeschlagen → Log in ReservationNotificationLog
- [ ] WhatsApp-Versendung fehlgeschlagen → Log in ReservationNotificationLog
- [ ] Payment-Link kann nicht erstellt werden → Fehler wird geloggt, aber nicht weitergeworfen

---

## 📝 Zusätzliche Überlegungen

### Queue-System vs. Synchron
- **Aktuell**: Manuelle Erstellung verwendet Queue (wenn aktiviert)
- **Neu**: Scheduler läuft synchron (nicht über Queue), da zeitkritisch
- **Grund**: Scheduler muss zu bestimmter Zeit (08:00) laufen, Queue wäre hier nicht sinnvoll

### Performance
- **Scheduler**: Prüft alle 10 Minuten
- **Zeitzone-Prüfung**: Für jede Organisation separat (verschiedene Zeitzonen möglich)
- **Query**: Hole Reservations mit `checkInDate = morgen` UND `invitationSentAt = null`
- **Index**: `checkInDate` und `invitationSentAt` sind bereits indiziert
- **Zeitzone-Berechnung**: `toZonedTime(now, timezone)` für jede Organisation (minimaler Overhead)

### Migration für bestehende Branches
- `autoSendReservationInvitation` Default = `false` (muss explizit aktiviert werden)
- `messageTemplates` = `null` (verwendet Defaults)
- Keine Breaking Changes für bestehende Branches

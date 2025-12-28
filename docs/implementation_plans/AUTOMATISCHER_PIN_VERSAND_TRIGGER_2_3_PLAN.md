# Plan: Automatischer PIN-Versand für Trigger 2 & 3 mit autoSend-Prüfung

**Datum**: 2025-01-XX  
**Status**: 📋 Analyse & Plan

## Zusammenfassung

Trigger 2 & 3 müssen analog zu Trigger 1 funktionieren:
- **Trigger 2**: LobbyPMS Check-in-Link abgeschlossen + bezahlt → PIN-Versand
- **Trigger 3**: Bold Payment Webhook (Zahlung erfolgreich) → PIN-Versand

**Anforderungen:**
1. ✅ autoSend-Prüfung (analog zu Trigger 1)
2. ✅ Email-Versendung wenn `guestEmail` vorhanden
3. ✅ WhatsApp-Versendung wenn `guestPhone` vorhanden
4. ✅ Beides versenden wenn beide vorhanden
5. ✅ Pro Branch funktionieren
6. ✅ Template-Logik (24h-Fenster, Sprache)

---

## Aktuelle Situation

### Trigger 2: LobbyPMS Check-in-Link abgeschlossen + bezahlt

**Datei**: `backend/src/services/lobbyPmsService.ts`  
**Zeilen**: 1180-1190

**Aktuell:**
- ❌ Keine autoSend-Prüfung
- ❌ Ruft `generatePinAndSendNotification()` auf
- ✅ Email wird versendet (wenn `notificationChannels.includes('email')`)
- ❌ WhatsApp ist deaktiviert (auskommentiert)

**Code:**
```typescript
if (checkInDataUploadedChanged && paymentStatus === PaymentStatus.paid && !reservation.doorPin) {
  await ReservationNotificationService.generatePinAndSendNotification(reservation.id);
}
```

---

### Trigger 3: Bold Payment Webhook

**Datei**: `backend/src/services/boldPaymentService.ts`  
**Zeilen**: 700-832

**Aktuell:**
- ❌ Keine autoSend-Prüfung
- ✅ TTLock-Passcode wird erstellt
- ❌ WhatsApp-Versendung ist auskommentiert (Zeile 834-1021)
- ✅ Ruft `generatePinAndSendNotification()` auf (Zeile 807), aber nur wenn `shouldSendPin === true`
- ⚠️ `shouldSendPin` ist `true` nur wenn Check-in-Link abgeschlossen ODER bereits eingecheckt

**Code:**
```typescript
if (shouldSendPin && ttlockCode) {
  await ReservationNotificationService.generatePinAndSendNotification(reservation.id);
}
```

---

## Analyse: generatePinAndSendNotification()

**Datei**: `backend/src/services/reservationNotificationService.ts`  
**Zeilen**: 1128-1436

**Aktuell:**
- ✅ Email-Versendung: `sendCheckInConfirmationEmail()` (Zeile 1252)
- ❌ WhatsApp-Versendung: Deaktiviert (Zeile 1298-1405, auskommentiert)
- ✅ Verwendet `notificationChannels` aus Settings
- ❌ Keine autoSend-Prüfung

**Notification Channels:**
- Lade aus `settings?.lobbyPms?.notificationChannels` (Standard: `['email']`)
- Prüft `notificationChannels.includes('email')` und `notificationChannels.includes('whatsapp')`

---

## Analyse: sendCheckInConfirmationEmail()

**Datei**: `backend/src/services/reservationNotificationService.ts`  
**Zeilen**: 2300-2442

**Funktionalität:**
- ✅ Lädt Template aus Branch Settings (mit Fallback)
- ✅ Sprache-Erkennung (EN/ES/DE)
- ✅ Ersetzt Variablen: `{{guestName}}`, `{{roomDisplay}}`, `{{roomDescription}}`, `{{doorPin}}`
- ✅ Verwendet Branch/Organization Branding

**Email-Inhalt (je nach Sprache):**

**Spanisch (ES):**
```
Hola {{guestName}},

¡Tu check-in se ha completado exitosamente!

Información de tu habitación:
- Habitación: {{roomDisplay}}
- Descripción: {{roomDescription}} (falls vorhanden)

Acceso:
- PIN de la puerta: {{doorPin}}

¡Te deseamos una estancia agradable!
```

**Englisch (EN):**
```
Hello {{guestName}},

Your check-in has been completed successfully!

Your room information:
- Room: {{roomDisplay}}
- Description: {{roomDescription}} (falls vorhanden)

Access:
- Door PIN: {{doorPin}}

We wish you a pleasant stay!
```

**Deutsch (DE):**
```
Hallo {{guestName}},

Ihr Check-in wurde erfolgreich abgeschlossen!

Ihre Zimmerinformationen:
- Zimmer: {{roomDisplay}}
- Beschreibung: {{roomDescription}} (falls vorhanden)

Zugang:
- Tür-PIN: {{doorPin}}

Wir wünschen Ihnen einen angenehmen Aufenthalt!
```

---

## Analyse: WhatsApp-Versendung (auskommentiert)

**Datei**: `backend/src/services/reservationNotificationService.ts`  
**Zeilen**: 1303-1397 (auskommentiert)

**Funktionalität (wenn aktiviert):**
- ✅ Ruft `whatsappService.sendCheckInConfirmation()` auf
- ✅ Sprache-Erkennung (EN/ES/DE)
- ✅ Lädt roomDescription aus Branch-Settings
- ✅ Formatiert Zimmer-Anzeige (Dorm vs. Private)

**WhatsApp-Nachricht (je nach Sprache):**

**Spanisch (ES) - Session Message (24h-Fenster):**
```
Hola {{guestName}},

¡Tu check-in se ha completado exitosamente!

Información de tu habitación:
- Habitación: {{roomDisplay}}
- Descripción: {{roomDescription}}

Acceso:
- PIN de la puerta: {{doorPin}}
- App: {{doorAppName}}

¡Te deseamos una estancia agradable!
```

**Spanisch (ES) - Template Message (außerhalb 24h-Fenster):**
- **Template-Name**: `reservation_checkin_completed` (ES) oder `reservation_checkin_completed_` (EN)
- **Template-Parameter**:
  - `{{1}}` = Begrüßung (z.B. "Hola Juan,")
  - `{{2}}` = Kompletter Text mit Zimmerinfo und PIN

**Englisch (EN) - Session Message (24h-Fenster):**
```
Hello {{guestName}},

Your check-in has been completed successfully!

Your room information:
- Room: {{roomDisplay}}
- Description: {{roomDescription}}

Access:
- Door PIN: {{doorPin}}
- App: {{doorAppName}}

We wish you a pleasant stay!
```

**Englisch (EN) - Template Message (außerhalb 24h-Fenster):**
- **Template-Name**: `reservation_checkin_completed_` (EN)
- **Template-Parameter**: Gleiche Struktur wie ES

---

## Analyse: autoSend-Prüfung (Trigger 1)

**Datei**: `backend/src/services/lobbyPmsService.ts`  
**Zeilen**: 1204-1210

**Code:**
```typescript
// Prüfe Branch Settings: autoSendReservationInvitation
const branch = branchId ? await prisma.branch.findUnique({
  where: { id: branchId },
  select: { autoSendReservationInvitation: true }
}) : null;

const autoSend = branch?.autoSendReservationInvitation ?? false;
```

**Logik:**
- Lade `autoSendReservationInvitation` aus Branch Settings
- Fallback: `false` (wenn Branch nicht vorhanden oder Setting nicht gesetzt)

---

## Analyse: Email-Import (Trigger 4)

**Status**: ❌ **DEAKTIVIERT** (auskommentiert)

**Datei**: `backend/src/app.ts`  
**Zeile**: 207
```typescript
// EmailReservationScheduler.start();
```

**Datei**: `backend/src/index.ts`  
- ❌ Kein Start des EmailReservationSchedulers

**Fazit:**
- Email-Import ist aktuell **nicht aktiv**
- Sollte nur aktiviert werden, wenn Email-Empfang als Alternative zu LobbyPMS API verwendet wird
- **Empfehlung**: Trigger 4 sollte nur aktiviert werden, wenn explizit gewünscht

---

## Umsetzungsplan

### Phase 1: autoSend-Prüfung für Trigger 2 & 3

#### 1.1 Trigger 2: LobbyPMS Check-in-Link abgeschlossen + bezahlt

**Datei**: `backend/src/services/lobbyPmsService.ts`  
**Zeilen**: 1180-1190

**Änderung:**
```typescript
// PIN-Versand: Wenn Check-in-Link abgeschlossen UND bezahlt → versende PIN
if (checkInDataUploadedChanged && paymentStatus === PaymentStatus.paid && !reservation.doorPin) {
  // NEU: Prüfe autoSend (analog zu Trigger 1)
  const branch = branchId ? await prisma.branch.findUnique({
    where: { id: branchId },
    select: { autoSendReservationInvitation: true }
  }) : null;
  
  const autoSend = branch?.autoSendReservationInvitation ?? false;
  
  if (autoSend) {
    try {
      logger.log(`[LobbyPMS] Check-in-Link abgeschlossen und bezahlt → versende PIN für Reservierung ${reservation.id}`);
      const { ReservationNotificationService } = await import('./reservationNotificationService');
      await ReservationNotificationService.generatePinAndSendNotification(reservation.id);
    } catch (error) {
      logger.error(`[LobbyPMS] Fehler beim Versenden der PIN für Reservierung ${reservation.id}:`, error);
    }
  } else {
    logger.log(`[LobbyPMS] autoSend ist deaktiviert → PIN wird nicht versendet für Reservierung ${reservation.id}`);
  }
}
```

---

#### 1.2 Trigger 3: Bold Payment Webhook

**Datei**: `backend/src/services/boldPaymentService.ts`  
**Zeilen**: 802-832

**Änderung:**
```typescript
// Versende PIN nur wenn Check-in-Link abgeschlossen ODER bereits eingecheckt
if (shouldSendPin && ttlockCode) {
  // NEU: Prüfe autoSend (analog zu Trigger 1)
  const branch = updatedReservation.branchId ? await prisma.branch.findUnique({
    where: { id: updatedReservation.branchId },
    select: { autoSendReservationInvitation: true }
  }) : null;
  
  const autoSend = branch?.autoSendReservationInvitation ?? false;
  
  if (autoSend) {
    try {
      logger.log(`[Bold Payment Webhook] Check-in-Link abgeschlossen/Check-in durchgeführt → versende PIN für Reservierung ${reservation.id}`);
      const { ReservationNotificationService } = await import('./reservationNotificationService');
      await ReservationNotificationService.generatePinAndSendNotification(reservation.id);
    } catch (error) {
      logger.error(`[Bold Payment Webhook] Fehler beim Versenden der PIN für Reservierung ${reservation.id}:`, error);
    }
  } else {
    logger.log(`[Bold Payment Webhook] autoSend ist deaktiviert → PIN wird nicht versendet für Reservierung ${reservation.id}`);
  }
}
```

---

### Phase 2: WhatsApp-Versendung aktivieren

#### 2.1 generatePinAndSendNotification() - WhatsApp aktivieren

**Datei**: `backend/src/services/reservationNotificationService.ts`  
**Zeilen**: 1298-1405

**Änderung:**
- ❌ Entferne Kommentar-Block (Zeile 1303-1397)
- ✅ Aktiviere WhatsApp-Versendung
- ✅ Verwende `sendPasscodeNotification()` Logik (die bereits funktioniert)

**Code:**
```typescript
// WhatsApp-Versendung mit TTLock-Code
if (notificationChannels.includes('whatsapp') && reservation.guestPhone) {
  try {
    const whatsappService = reservation.branchId
      ? new WhatsAppService(undefined, reservation.branchId)
      : new WhatsAppService(reservation.organizationId);
    
    // Ermittle Sprache für roomDescription
    const { CountryLanguageService } = require('./countryLanguageService');
    const languageCode = CountryLanguageService.getLanguageForReservation({
      guestNationality: reservation.guestNationality,
      guestPhone: reservation.guestPhone
    }) as 'en' | 'es' | 'de';
    
    // Lade roomDescription aus Branch-Settings
    const roomDescription = await this.loadRoomDescriptionFromBranchSettings(
      reservation,
      languageCode
    );
    
    // Formatiere Zimmer-Anzeige: Dorm kann "Zimmername (Bettnummer)" ODER nur Bettnummer haben, Private = roomDescription
    const isDorm = reservation.roomNumber !== null && reservation.roomNumber.trim() !== '';
    let roomDisplay: string;
    if (isDorm) {
      const roomNumber = reservation.roomNumber?.trim() || '';
      const roomName = reservation.roomDescription?.trim() || '';
      if (roomNumber.includes('(')) {
        roomDisplay = roomNumber;
      } else if (roomName && roomNumber) {
        roomDisplay = `${roomName} (${roomNumber})`;
      } else {
        roomDisplay = roomNumber || roomName || 'N/A';
      }
    } else {
      roomDisplay = reservation.roomDescription?.trim() || 'N/A';
    }
    
    // Lade WhatsApp-Template aus Branch Settings
    const whatsappTemplate = await this.getMessageTemplate(
      reservation.branchId,
      reservation.organizationId,
      'checkInConfirmation',
      languageCode
    );
    
    const greeting = languageCode === 'en' 
      ? `Hello ${reservation.guestName},`
      : `Hola ${reservation.guestName},`;
    
    // Formatiere roomDescription für Nachricht (nur wenn vorhanden)
    let contentText: string;
    if (languageCode === 'en') {
      const roomInfo = roomDescription && roomDescription !== 'N/A' 
        ? `- Room: ${roomDisplay}\n- Description: ${roomDescription}`
        : `- Room: ${roomDisplay}`;
      contentText = `Your check-in has been completed successfully!\n\nYour room information:\n${roomInfo}\n\nAccess:\n- Door PIN: ${doorPin || 'N/A'}`;
    } else {
      const roomInfo = roomDescription && roomDescription !== 'N/A'
        ? `- Habitación: ${roomDisplay}\n- Descripción: ${roomDescription}`
        : `- Habitación: ${roomDisplay}`;
      contentText = `¡Tu check-in se ha completado exitosamente!\n\nInformación de tu habitación:\n${roomInfo}\n\nAcceso:\n- PIN de la puerta: ${doorPin || 'N/A'}`;
    }
    
    // Template-Name aus Settings oder Fallback
    const templateName = whatsappTemplate?.whatsappTemplateName || 
      process.env.WHATSAPP_TEMPLATE_CHECKIN_CONFIRMATION || 
      'reservation_checkin_completed';
    
    // Template-Parameter: Ersetze Platzhalter
    const contentTextWithReplacements = contentText
      .replace(/\{\{roomNumber\}\}/g, roomDisplay)
      .replace(/\{\{roomDisplay\}\}/g, roomDisplay)
      .replace(/\{\{roomDescription\}\}/g, roomDescription && roomDescription !== 'N/A' ? roomDescription : '')
      .replace(/\{\{doorPin\}\}/g, doorPin || 'N/A')
      .replace(/\{\{guestName\}\}/g, reservation.guestName);
    
    const templateParams = whatsappTemplate?.whatsappTemplateParams?.length > 0
      ? whatsappTemplate.whatsappTemplateParams.map((param: string) => {
          return param
            .replace(/\{\{1\}\}/g, greeting)
            .replace(/\{\{2\}\}/g, contentTextWithReplacements)
            .replace(/\{\{guestName\}\}/g, reservation.guestName)
            .replace(/\{\{roomDisplay\}\}/g, roomDisplay)
            .replace(/\{\{roomNumber\}\}/g, roomDisplay)
            .replace(/\{\{roomDescription\}\}/g, roomDescription && roomDescription !== 'N/A' ? roomDescription : '')
            .replace(/\{\{doorPin\}\}/g, doorPin || 'N/A');
        })
      : [greeting, contentTextWithReplacements];
    
    const messageText = `${greeting}\n\n${contentTextWithReplacements}\n\n${languageCode === 'en' ? 'We wish you a pleasant stay!' : '¡Te deseamos una estancia agradable!'}`;
    
    whatsappSuccess = await whatsappService.sendMessageWithFallback(
      reservation.guestPhone,
      messageText,
      templateName,
      templateParams,
      {
        guestNationality: reservation.guestNationality,
        guestPhone: reservation.guestPhone
      }
    );
    
    if (whatsappSuccess) {
      logger.log(`[ReservationNotification] ✅ WhatsApp-Nachricht erfolgreich versendet für Reservierung ${reservationId}`);
      
      // Log erfolgreiche WhatsApp-Notification
      try {
        await this.logNotification(
          reservationId,
          'pin',
          'whatsapp',
          true,
          {
            sentTo: reservation.guestPhone,
            message: messageText || undefined
          }
        );
      } catch (logError) {
        logger.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags für erfolgreiche WhatsApp-Notification:`, logError);
      }
    } else {
      logger.warn(`[ReservationNotification] ⚠️ WhatsApp-Nachricht konnte nicht versendet werden für Reservierung ${reservationId}`);
      whatsappError = 'WhatsApp-Nachricht konnte nicht versendet werden';
      
      // Log fehlgeschlagene WhatsApp-Notification
      try {
        await this.logNotification(
          reservationId,
          'pin',
          'whatsapp',
          false,
          {
            sentTo: reservation.guestPhone,
            message: messageText || undefined,
            errorMessage: whatsappError
          }
        );
      } catch (logError) {
        logger.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags für fehlgeschlagene WhatsApp-Notification:`, logError);
      }
    }
  } catch (error) {
    logger.error(`[ReservationNotification] ❌ Fehler beim Versenden der WhatsApp-Nachricht:`, error);
    whatsappError = error instanceof Error ? error.message : 'Unbekannter Fehler beim Versenden der WhatsApp-Nachricht';
    
    // Log fehlgeschlagene WhatsApp-Notification
    try {
      await this.logNotification(
        reservationId,
        'pin',
        'whatsapp',
        false,
        {
          sentTo: reservation.guestPhone,
          message: messageText || undefined,
          errorMessage: whatsappError
        }
      );
    } catch (logError) {
      logger.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags für fehlgeschlagene WhatsApp-Notification:`, logError);
    }
  }
}
```

---

### Phase 3: Email & WhatsApp Versendung basierend auf Kontaktdaten

**Bereits implementiert:**
- ✅ `generatePinAndSendNotification()` prüft bereits `notificationChannels.includes('email')` und `notificationChannels.includes('whatsapp')`
- ✅ Email wird versendet wenn `reservation.guestEmail` vorhanden
- ✅ WhatsApp wird versendet wenn `reservation.guestPhone` vorhanden (nach Aktivierung)

**Keine Änderung nötig** - Logik ist bereits korrekt!

---

## Liste der versendeten Nachrichten

### Trigger 2: LobbyPMS Check-in-Link abgeschlossen + bezahlt

#### Email (wenn `guestEmail` vorhanden)

**Spanisch (ES):**
```
Hola {{guestName}},

¡Tu check-in se ha completado exitosamente!

Información de tu habitación:
- Habitación: {{roomDisplay}}
- Descripción: {{roomDescription}} (falls vorhanden)

Acceso:
- PIN de la puerta: {{doorPin}}

¡Te deseamos una estancia agradable!
```

**Englisch (EN):**
```
Hello {{guestName}},

Your check-in has been completed successfully!

Your room information:
- Room: {{roomDisplay}}
- Description: {{roomDescription}} (falls vorhanden)

Access:
- Door PIN: {{doorPin}}

We wish you a pleasant stay!
```

**Deutsch (DE):**
```
Hallo {{guestName}},

Ihr Check-in wurde erfolgreich abgeschlossen!

Ihre Zimmerinformationen:
- Zimmer: {{roomDisplay}}
- Beschreibung: {{roomDescription}} (falls vorhanden)

Zugang:
- Tür-PIN: {{doorPin}}

Wir wünschen Ihnen einen angenehmen Aufenthalt!
```

#### WhatsApp (wenn `guestPhone` vorhanden)

**Spanisch (ES) - Session Message (24h-Fenster):**
```
Hola {{guestName}},

¡Tu check-in se ha completado exitosamente!

Información de tu habitación:
- Habitación: {{roomDisplay}}
- Descripción: {{roomDescription}}

Acceso:
- PIN de la puerta: {{doorPin}}

¡Te deseamos una estancia agradable!
```

**Spanisch (ES) - Template Message (außerhalb 24h-Fenster):**
- **Template-Name**: `reservation_checkin_completed` (ES)
- **Template-Parameter**:
  - `{{1}}` = "Hola {{guestName}},"
  - `{{2}}` = Kompletter Text mit Zimmerinfo und PIN

**Englisch (EN) - Session Message (24h-Fenster):**
```
Hello {{guestName}},

Your check-in has been completed successfully!

Your room information:
- Room: {{roomDisplay}}
- Description: {{roomDescription}}

Access:
- Door PIN: {{doorPin}}

We wish you a pleasant stay!
```

**Englisch (EN) - Template Message (außerhalb 24h-Fenster):**
- **Template-Name**: `reservation_checkin_completed_` (EN)
- **Template-Parameter**: Gleiche Struktur wie ES

---

### Trigger 3: Bold Payment Webhook

**Gleiche Nachrichten wie Trigger 2** (beide verwenden `generatePinAndSendNotification()`)

---

## Checkliste

### Phase 1: autoSend-Prüfung
- [ ] Trigger 2: autoSend-Prüfung hinzufügen
- [ ] Trigger 3: autoSend-Prüfung hinzufügen
- [ ] Logging für deaktivierte autoSend hinzufügen

### Phase 2: WhatsApp-Versendung aktivieren
- [ ] `generatePinAndSendNotification()`: WhatsApp-Code aktivieren
- [ ] Template-Logik implementieren (aus Branch Settings)
- [ ] Sprache-Erkennung testen (EN/ES/DE)
- [ ] 24h-Fenster-Logik testen (Session Message vs. Template)

### Phase 3: Testing
- [ ] Trigger 2: Test mit autoSend aktiviert
- [ ] Trigger 2: Test mit autoSend deaktiviert
- [ ] Trigger 3: Test mit autoSend aktiviert
- [ ] Trigger 3: Test mit autoSend deaktiviert
- [ ] Test: Nur Email vorhanden → nur Email versendet
- [ ] Test: Nur Telefonnummer vorhanden → nur WhatsApp versendet
- [ ] Test: Beides vorhanden → beide versendet
- [ ] Test: Pro Branch (verschiedene Branches)

### Phase 4: Email-Import (Trigger 4) - Pro Branch

**Status**: ✅ Scheduler ist aktiviert (wird in `app.ts` gestartet, wenn nicht auskommentiert)

**Anforderung**: 
- Scheduler muss pro Branch prüfen (nicht pro Organization)
- Prüft `Branch.emailSettings.imap.enabled` (Schalter im Frontend: Branch Edit -> Email -> IMAP Settings (Email Reading))
- Wenn Schalter AUS → Email-Import für diesen Branch deaktiviert
- Wenn Schalter EIN → Email-Import für diesen Branch aktiviert

**Änderungen:**

#### 4.1 EmailReadingService erweitern

**Datei**: `backend/src/services/emailReadingService.ts`

**Neue Methode hinzufügen:**
```typescript
/**
 * Lädt Email-Konfiguration aus Branch-Settings (mit Fallback auf Organization)
 */
static async loadConfigFromBranch(branchId: number): Promise<EmailConfig | null> {
  try {
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { 
        emailSettings: true, 
        organizationId: true 
      }
    });

    if (!branch) {
      return null;
    }

    // Prüfe Branch Email Settings
    if (branch.emailSettings) {
      const { decryptBranchApiSettings } = await import('../utils/encryption');
      const branchSettings = decryptBranchApiSettings(branch.emailSettings as any);
      const emailSettings = branchSettings?.email || branchSettings;
      const imapConfig = emailSettings?.imap;

      // Prüfe ob IMAP aktiviert ist
      if (imapConfig?.enabled && imapConfig.host && imapConfig.user && imapConfig.password) {
        return {
          host: imapConfig.host,
          port: imapConfig.port || (imapConfig.secure ? 993 : 143),
          secure: imapConfig.secure !== false,
          user: imapConfig.user,
          password: imapConfig.password, // Bereits entschlüsselt
          folder: imapConfig.folder || 'INBOX',
          processedFolder: imapConfig.processedFolder
        };
      }
    }

    // Fallback: Lade aus Organisation
    if (branch.organizationId) {
      return await this.loadConfigFromOrganization(branch.organizationId);
    }

    return null;
  } catch (error) {
    logger.error(`[EmailReading] Fehler beim Laden der Konfiguration für Branch ${branchId}:`, error);
    // Fallback: Lade aus Organisation
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { organizationId: true }
    });
    if (branch?.organizationId) {
      return await this.loadConfigFromOrganization(branch.organizationId);
    }
    return null;
  }
}
```

#### 4.2 EmailReservationScheduler anpassen

**Datei**: `backend/src/services/emailReservationScheduler.ts`

**Änderung: Prüfe pro Branch statt pro Organization**

```typescript
/**
 * Prüft alle Branches auf neue Reservation-Emails
 */
private static async checkAllBranches(): Promise<void> {
  try {
    logger.log('[EmailReservationScheduler] Starte Email-Check für alle Branches...');

    // Hole alle Branches
    const branches = await prisma.branch.findMany({
      where: {
        organizationId: { not: null }
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    let totalProcessed = 0;

    // Prüfe jede Branch
    for (const branch of branches) {
      try {
        // Prüfe ob Email-Reading aktiviert ist (Branch Settings)
        const { decryptBranchApiSettings } = await import('../utils/encryption');
        let emailReadingEnabled = false;
        
        if (branch.emailSettings) {
          const branchSettings = decryptBranchApiSettings(branch.emailSettings as any);
          const emailSettings = branchSettings?.email || branchSettings;
          emailReadingEnabled = emailSettings?.imap?.enabled === true;
        }
        
        // Fallback: Prüfe Organization Settings
        if (!emailReadingEnabled && branch.organizationId) {
          const organization = await prisma.organization.findUnique({
            where: { id: branch.organizationId },
            select: { settings: true }
          });
          
          if (organization?.settings && typeof organization.settings === 'object') {
            const orgSettings = organization.settings as any;
            const emailReading = orgSettings.emailReading;
            emailReadingEnabled = emailReading?.enabled === true;
          }
        }

        if (!emailReadingEnabled) {
          continue; // Email-Reading für diese Branch deaktiviert
        }

        logger.log(`[EmailReservationScheduler] Prüfe Branch ${branch.id} (${branch.name})...`);

        // Prüfe auf neue Emails für diese Branch
        const processedCount = await EmailReservationService.checkForNewReservationEmailsForBranch(branch.id);
        totalProcessed += processedCount;

        if (processedCount > 0) {
          logger.log(`[EmailReservationScheduler] ✅ Branch ${branch.id}: ${processedCount} Reservation(s) erstellt`);
        }
      } catch (error) {
        logger.error(`[EmailReservationScheduler] Fehler bei Branch ${branch.id}:`, error);
        // Weiter mit nächster Branch
      }
    }

    if (totalProcessed > 0) {
      logger.log(`[EmailReservationScheduler] ✅ Insgesamt ${totalProcessed} Reservation(s) aus Emails erstellt`);
    } else {
      logger.log('[EmailReservationScheduler] Keine neuen Reservation-Emails gefunden');
    }
  } catch (error) {
    logger.error('[EmailReservationScheduler] Fehler beim Email-Check:', error);
  }
}
```

#### 4.3 EmailReservationService erweitern

**Datei**: `backend/src/services/emailReservationService.ts`

**Neue Methode hinzufügen:**
```typescript
/**
 * Prüft auf neue Reservation-Emails für eine bestimmte Branch
 * 
 * @param branchId - Branch-ID
 * @returns Anzahl verarbeiteter Emails
 */
static async checkForNewReservationEmailsForBranch(branchId: number): Promise<number> {
  try {
    // Lade Email-Konfiguration aus Branch Settings
    const emailConfig = await EmailReadingService.loadConfigFromBranch(branchId);
    if (!emailConfig) {
      logger.log(`[EmailReservation] Keine Email-Konfiguration für Branch ${branchId}`);
      return 0;
    }

    // Hole Branch mit Organization
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { organizationId: true }
    });

    if (!branch) {
      logger.log(`[EmailReservation] Branch ${branchId} nicht gefunden`);
      return 0;
    }

    // Lade Filter aus Branch oder Organization Settings
    const branchData = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { emailSettings: true }
    });

    let filters: any = {};
    
    // Prüfe Branch Settings
    if (branchData?.emailSettings) {
      const { decryptBranchApiSettings } = await import('../utils/encryption');
      const branchSettings = decryptBranchApiSettings(branchData.emailSettings as any);
      const emailSettings = branchSettings?.email || branchSettings;
      filters = emailSettings?.filters || {};
    }
    
    // Fallback: Organization Settings
    if (!filters || Object.keys(filters).length === 0) {
      const organization = await prisma.organization.findUnique({
        where: { id: branch.organizationId },
        select: { settings: true }
      });
      const orgSettings = organization?.settings as any;
      const emailReading = orgSettings?.emailReading;
      filters = emailReading?.filters || {};
    }

    // Verbinde zu Email-Server
    const emailService = new EmailReadingService(emailConfig);
    await emailService.connect();

    try {
      // Hole ungelesene Emails
      const emails = await emailService.fetchUnreadEmails({
        from: filters.from,
        subject: filters.subject
      });

      if (emails.length === 0) {
        logger.log(`[EmailReservation] Keine neuen Emails für Branch ${branchId}`);
        return 0;
      }

      logger.log(`[EmailReservation] ${emails.length} neue Email(s) gefunden für Branch ${branchId}`);

      let processedCount = 0;

      // Verarbeite jede Email
      for (const email of emails) {
        try {
          // WICHTIG: Übergebe branchId, damit Reservation der richtigen Branch zugeordnet wird
          const reservation = await this.processEmailForBranch(email, branch.organizationId, branchId);

          if (reservation) {
            processedCount++;
            logger.log(`[EmailReservation] ✅ Email ${email.messageId} erfolgreich verarbeitet (Reservation ID: ${reservation.id})`);
          } else {
            logger.log(`[EmailReservation] Email ${email.messageId} konnte nicht als Reservation erkannt werden`);
          }
        } catch (error) {
          logger.error(`[EmailReservation] Fehler beim Verarbeiten der Email ${email.messageId}:`, error);
          // Weiter mit nächster Email
        }
      }

      logger.log(`[EmailReservation] ${processedCount} von ${emails.length} Email(s) erfolgreich verarbeitet`);
      return processedCount;
    } finally {
      // Trenne Verbindung
      emailService.disconnect();
    }
  } catch (error) {
    logger.error(`[EmailReservation] Fehler beim Email-Check für Branch ${branchId}:`, error);
    throw error;
  }
}

/**
 * Verarbeitet eine Email und erstellt Reservation für eine bestimmte Branch
 */
static async processEmailForBranch(
  emailMessage: EmailMessage,
  organizationId: number,
  branchId: number
) {
  // Gleiche Logik wie processEmail(), aber mit branchId
  // ...
}
```

#### 4.4 Scheduler starten

**Datei**: `backend/src/app.ts`

**Änderung:**
```typescript
// Email-Import: Prüft pro Branch (wenn Branch.emailSettings.imap.enabled === true)
EmailReservationScheduler.start();
```

**Checkliste:**
- [ ] `EmailReadingService.loadConfigFromBranch()` implementieren
- [ ] `EmailReservationScheduler.checkAllBranches()` implementieren (statt `checkAllOrganizations()`)
- [ ] `EmailReservationService.checkForNewReservationEmailsForBranch()` implementieren
- [ ] `EmailReservationService.processEmailForBranch()` implementieren
- [ ] `EmailReservationScheduler.start()` in `app.ts` aktivieren
- [ ] Test: Branch mit `imap.enabled = true` → Email-Import aktiv
- [ ] Test: Branch mit `imap.enabled = false` → Email-Import deaktiviert

---

## Hinweise

1. **autoSend-Prüfung**: Muss pro Branch funktionieren (analog zu Trigger 1)
2. **Kontaktdaten**: Email und WhatsApp werden unabhängig voneinander versendet (wenn beide vorhanden)
3. **Template-Logik**: WhatsApp verwendet automatisch Session Message (24h-Fenster) oder Template (Fallback)
4. **Sprache**: Wird automatisch erkannt basierend auf `guestNationality` und `guestPhone`
5. **Branch Settings**: Templates werden aus Branch Settings geladen (mit Fallback auf Defaults)


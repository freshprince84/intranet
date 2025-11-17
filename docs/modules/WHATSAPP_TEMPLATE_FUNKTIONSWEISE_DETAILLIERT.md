# WhatsApp Template - Detaillierte Funktionsweise

**Datum**: 2025-01-XX  
**Status**: ✅ Template `reservation_checkin_invitation` bewilligt und einsatzbereit

## Übersicht: Wie funktioniert das Template?

Das System verwendet einen **Hybrid-Ansatz**:
1. **Zuerst**: Versucht normale WhatsApp-Nachricht (Session Message) - **günstiger**
2. **Bei Fehler**: Fallback auf Template Message - **funktioniert immer**

---

## Teil 1: Template in Meta Business Suite

### Was wurde erstellt?

**Template-Name**: `reservation_checkin_invitation`  
**Template-Sprache**: `English (en)`  
**Template-Text** (Spanisch):
```
Hola {{1}},

¡Nos complace darte la bienvenida a La Familia Hostel!

Como llegarás después de las 22:00, puedes realizar el check-in en línea ahora:
{{2}}

Por favor, realiza el pago por adelantado:
{{3}}

¡Te esperamos mañana!
```

**Variablen**:
- `{{1}}` = Gast-Name (z.B. "Juan Pérez")
- `{{2}}` = Check-in-Link (z.B. "https://...")
- `{{3}}` = Payment-Link (z.B. "https://...")

**Status**: ✅ **Approved** (bewilligt)

---

## Teil 2: Code-Implementierung

### 2.1 Wo wird das Template verwendet?

Das Template wird an **3 Stellen** verwendet:

#### Stelle 1: Automatische Check-in-Einladungen
**Datei**: `backend/src/services/reservationNotificationService.ts`  
**Methode**: `sendLateCheckInInvitations()`  
**Zeile**: 94

```typescript
await whatsappService.sendCheckInInvitation(
  reservation.guestName,
  reservation.guestPhone,
  checkInLink,
  paymentLink
);
```

**Wann wird es aufgerufen?**
- Täglich um 20:00 Uhr automatisch
- Für Gäste mit Ankunft am nächsten Tag nach 22:00 Uhr
- Nur wenn noch keine Einladung versendet wurde

#### Stelle 2: Manuelle Reservierungserstellung
**Datei**: `backend/src/controllers/reservationController.ts`  
**Methode**: `updateGuestContact()`  
**Zeile**: 155

**Wann wird es aufgerufen?**
- Wenn Telefonnummer/Email in Reservierung eingetragen wird
- Nach Status-Shift einer Reservierung

#### Stelle 3: Direkter Aufruf (optional)
**Datei**: `backend/src/services/whatsappService.ts`  
**Methode**: `sendCheckInInvitation()`  
**Zeile**: 489

---

### 2.2 Wie funktioniert `sendCheckInInvitation()`?

**Vollständiger Code** (Zeile 489-515):

```typescript
async sendCheckInInvitation(
  guestName: string,
  guestPhone: string,
  checkInLink: string,
  paymentLink: string
): Promise<boolean> {
  // 1. Erstelle Nachrichtentext (für Session Message)
  const message = `Hola ${guestName},

¡Nos complace darte la bienvenida a La Familia Hostel!

Como llegarás después de las 22:00, puedes realizar el check-in en línea ahora:

${checkInLink}

Por favor, realiza el pago por adelantado:
${paymentLink}

¡Te esperamos mañana!`;

  // 2. Template-Name (aus Environment oder Standard)
  const templateName = process.env.WHATSAPP_TEMPLATE_CHECKIN_INVITATION 
    || 'reservation_checkin_invitation';
  
  // 3. Template-Parameter (Reihenfolge muss mit {{1}}, {{2}}, {{3}} übereinstimmen)
  const templateParams = [guestName, checkInLink, paymentLink];

  // 4. Sende mit Fallback-Mechanismus
  return await this.sendMessageWithFallback(guestPhone, message, templateName, templateParams);
}
```

**Was passiert hier?**
1. Nachrichtentext wird erstellt (für Session Message)
2. Template-Name wird geladen (`reservation_checkin_invitation`)
3. Template-Parameter werden vorbereitet: `[guestName, checkInLink, paymentLink]`
4. `sendMessageWithFallback()` wird aufgerufen

---

### 2.3 Wie funktioniert `sendMessageWithFallback()`?

**Vollständiger Code** (Zeile 412-461):

```typescript
async sendMessageWithFallback(
  to: string,
  message: string,
  templateName?: string,
  templateParams?: string[]
): Promise<boolean> {
  try {
    // SCHRITT 1: Versuche Session Message (24h-Fenster)
    console.log(`[WhatsApp Service] Versuche Session Message (24h-Fenster) für ${to}...`);
    return await this.sendMessage(to, message);
    
  } catch (error) {
    // SCHRITT 2: Prüfe ob Fehler "outside 24h window" ist
    if (this.isOutside24HourWindowError(error)) {
      console.log(`[WhatsApp Service] ⚠️ 24h-Fenster abgelaufen, verwende Template Message...`);
      
      if (!templateName) {
        throw new Error('Template Message erforderlich, aber kein Template-Name angegeben');
      }

      // SCHRITT 3: Fallback: Template Message
      try {
        await this.loadSettings();
        
        if (!this.axiosInstance || !this.phoneNumberId) {
          throw new Error('WhatsApp Service nicht initialisiert');
        }

        const normalizedPhone = this.normalizePhoneNumber(to);
        
        // Formatiere Template-Parameter
        const formattedParams = templateParams?.map(text => ({
          type: 'text' as const,
          text: text
        })) || [];

        // Template-Sprache (Standard: 'en')
        const languageCode = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en';
        
        // SCHRITT 4: Sende Template Message
        return await this.sendViaWhatsAppBusiness(
          normalizedPhone, 
          message, 
          templateName, 
          formattedParams, 
          languageCode
        );
      } catch (templateError) {
        console.error('[WhatsApp Service] Fehler bei Template Message:', templateError);
        throw templateError;
      }
    } else {
      // Anderer Fehler - weiterwerfen
      console.error('[WhatsApp Service] Unbekannter Fehler bei Session Message:', error);
      throw error;
    }
  }
}
```

**Ablauf Schritt für Schritt:**

1. **Versuche Session Message**:
   - Ruft `sendMessage(to, message)` auf
   - Sendet normale Text-Nachricht
   - **Funktioniert nur**, wenn User innerhalb der letzten 24h geschrieben hat
   - **Kosten**: Günstiger (Session Pricing)

2. **Bei Fehler prüfen**:
   - `isOutside24HourWindowError(error)` prüft Fehlercode
   - Erkennt Fehler-Codes: `131047`, `131026` oder Fehlermeldungen mit "24 hour", "outside window", "template required"

3. **Fallback: Template Message**:
   - Normalisiert Telefonnummer (fügt `+` hinzu)
   - Formatiert Template-Parameter: `[{type: 'text', text: '...'}, ...]`
   - Lädt Template-Sprache: `'en'` (Standard) oder aus Environment
   - Ruft `sendViaWhatsAppBusiness()` mit Template auf

4. **Template Message senden**:
   - Erstellt Payload mit `type: 'template'`
   - Template-Name: `reservation_checkin_invitation`
   - Template-Sprache: `en`
   - Template-Parameter: `[{type: 'text', text: guestName}, {type: 'text', text: checkInLink}, {type: 'text', text: paymentLink}]`
   - Sendet an WhatsApp Business API

---

### 2.4 Wie wird die Template Message formatiert?

**Payload-Struktur** (Zeile 309-338):

```typescript
const payload: any = {
  messaging_product: 'whatsapp',
  to: '+573001234567',  // Normalisierte Telefonnummer
  type: 'template',      // Wichtig: 'template' statt 'text'
  template: {
    name: 'reservation_checkin_invitation',
    language: { code: 'en' },
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: 'Juan Pérez' },           // {{1}}
          { type: 'text', text: 'https://...' },         // {{2}}
          { type: 'text', text: 'https://...' }           // {{3}}
        ]
      }
    ]
  }
};
```

**Wichtig**:
- `type: 'template'` (nicht 'text')
- `template.name` muss exakt `reservation_checkin_invitation` sein
- `template.language.code` muss `'en'` sein (Template-Sprache)
- `parameters` müssen in der Reihenfolge `{{1}}`, `{{2}}`, `{{3}}` sein

---

## Teil 3: Testing

### Test 1: Mit aktivem 24h-Fenster (Session Message)

**Voraussetzung**: User hat innerhalb der letzten 24h an WhatsApp Business Nummer geschrieben

**Schritte**:
1. **User schreibt zuerst** an WhatsApp Business Nummer
   - Beispiel: "Hallo, ich habe eine Frage"
   - WhatsApp Business API erhält Nachricht
   - 24h-Fenster startet

2. **Reservierung erstellen** im System
   - Frontend: Reservierung anlegen
   - Telefonnummer eingeben
   - Reservierung speichern

3. **Code-Ablauf**:
   ```
   sendCheckInInvitation() 
   → sendMessageWithFallback()
   → sendMessage() (Session Message)
   → ✅ Erfolg (24h-Fenster aktiv)
   ```

4. **Erwartetes Ergebnis**:
   - ✅ Nachricht wird gesendet
   - ✅ Log: `[WhatsApp Service] Versuche Session Message (24h-Fenster)...`
   - ✅ Log: `[WhatsApp Business] ✅ Nachricht erfolgreich gesendet`
   - ✅ **Kein Template verwendet** (günstiger)

5. **Logs prüfen**:
   ```bash
   tail -f backend/logs/app.log | grep "WhatsApp"
   ```
   
   **Erwartete Logs**:
   ```
   [WhatsApp Service] Versuche Session Message (24h-Fenster) für +573001234567...
   [WhatsApp Business] Sende Nachricht an +573001234567 via Phone Number ID ...
   [WhatsApp Business] ✅ Nachricht erfolgreich gesendet. Status: 200
   ```

---

### Test 2: Ohne 24h-Fenster (Template Message)

**Voraussetzung**: User hat NICHT innerhalb der letzten 24h geschrieben (oder 24h abgelaufen)

**Schritte**:
1. **User hat NICHT geschrieben** (oder 24h abgelaufen)
   - Keine eingehende Nachricht in den letzten 24h
   - Oder: 24h-Fenster ist abgelaufen

2. **Reservierung erstellen** im System
   - Frontend: Reservierung anlegen
   - Telefonnummer eingeben
   - Reservierung speichern

3. **Code-Ablauf**:
   ```
   sendCheckInInvitation() 
   → sendMessageWithFallback()
   → sendMessage() (Session Message)
   → ❌ Fehler: "Message outside 24-hour window" (Code 131047)
   → isOutside24HourWindowError() erkennt Fehler
   → sendViaWhatsAppBusiness() mit Template
   → ✅ Erfolg (Template Message)
   ```

4. **Erwartetes Ergebnis**:
   - ✅ Nachricht wird gesendet (via Template)
   - ✅ Log: `[WhatsApp Service] Versuche Session Message (24h-Fenster)...`
   - ✅ Log: `[WhatsApp Service] ⚠️ 24h-Fenster abgelaufen, verwende Template Message...`
   - ✅ Log: `[WhatsApp Business] ✅ Nachricht erfolgreich gesendet`
   - ✅ **Template wird verwendet** (teurer, aber funktioniert immer)

5. **Logs prüfen**:
   ```bash
   tail -f backend/logs/app.log | grep "WhatsApp"
   ```
   
   **Erwartete Logs**:
   ```
   [WhatsApp Service] Versuche Session Message (24h-Fenster) für +573001234567...
   [WhatsApp Business] API Fehler: {"error":{"code":131047,"message":"Message outside 24-hour window"}}
   [WhatsApp Service] ⚠️ 24h-Fenster abgelaufen, verwende Template Message...
   [WhatsApp Business] Sende Nachricht an +573001234567 via Phone Number ID ...
   [WhatsApp Business] Payload: {"type":"template","template":{"name":"reservation_checkin_invitation","language":{"code":"en"},"components":[{"type":"body","parameters":[{"type":"text","text":"Juan Pérez"},{"type":"text","text":"https://..."},{"type":"text","text":"https://..."}]}]}}
   [WhatsApp Business] ✅ Nachricht erfolgreich gesendet. Status: 200
   ```

6. **Nachricht prüfen**:
   - WhatsApp-Nachricht sollte ankommen
   - Format sollte mit Template übereinstimmen:
     ```
     Hola Juan Pérez,
     
     ¡Nos complace darte la bienvenida a La Familia Hostel!
     
     Como llegarás después de las 22:00, puedes realizar el check-in en línea ahora:
     https://...
     
     Por favor, realiza el pago por adelantado:
     https://...
     
     ¡Te esperamos mañana!
     ```

---

## Teil 4: Fehlerbehandlung

### Fehler 1: "Template not found"

**Ursache**: Template-Name stimmt nicht überein

**Prüfung**:
1. Meta Business Suite: Template-Name prüfen (muss exakt `reservation_checkin_invitation` sein)
2. Code: Zeile 509 in `whatsappService.ts` prüfen
3. Environment-Variable: `WHATSAPP_TEMPLATE_CHECKIN_INVITATION` prüfen

**Lösung**:
- Template-Name in Meta Business Suite korrigieren
- Oder: Environment-Variable setzen: `WHATSAPP_TEMPLATE_CHECKIN_INVITATION=reservation_checkin_invitation`

---

### Fehler 2: "Template not approved"

**Ursache**: Template noch nicht genehmigt

**Prüfung**:
1. Meta Business Suite: Template-Status prüfen
2. Status sollte "Approved" sein (nicht "Pending" oder "Rejected")

**Lösung**:
- Warte auf Genehmigung (1-2 Tage)
- Bei Ablehnung: Fehlermeldung prüfen und Template korrigieren

---

### Fehler 3: "Invalid parameters"

**Ursache**: Anzahl oder Reihenfolge der Parameter stimmt nicht

**Prüfung**:
1. Template: Anzahl Variablen prüfen (sollte 3 sein: `{{1}}`, `{{2}}`, `{{3}}`)
2. Code: Zeile 512 in `whatsappService.ts` prüfen
   ```typescript
   const templateParams = [guestName, checkInLink, paymentLink];  // 3 Parameter
   ```
3. Reihenfolge muss übereinstimmen:
   - `{{1}}` = `guestName`
   - `{{2}}` = `checkInLink`
   - `{{3}}` = `paymentLink`

**Lösung**:
- Template-Variablen korrigieren
- Oder: Code-Parameter-Reihenfolge anpassen

---

### Fehler 4: "Language mismatch"

**Ursache**: Template-Sprache stimmt nicht überein

**Prüfung**:
1. Meta Business Suite: Template-Sprache prüfen (sollte "English (en)" sein)
2. Code: Zeile 449 in `whatsappService.ts` prüfen
   ```typescript
   const languageCode = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en';
   ```
3. Environment-Variable: `WHATSAPP_TEMPLATE_LANGUAGE` prüfen (sollte `en` sein oder nicht gesetzt)

**Lösung**:
- Template-Sprache in Meta Business Suite korrigieren
- Oder: Environment-Variable setzen: `WHATSAPP_TEMPLATE_LANGUAGE=en`

---

## Teil 5: Monitoring

### Logs prüfen

**Backend-Logs**:
```bash
# Alle WhatsApp-Logs
tail -f backend/logs/app.log | grep "WhatsApp"

# Nur Template-Messages
tail -f backend/logs/app.log | grep "Template Message"

# Nur Fehler
tail -f backend/logs/app.log | grep "WhatsApp.*Fehler"
```

**Erwartete Log-Meldungen**:
- `[WhatsApp Service] Versuche Session Message (24h-Fenster)...`
- `[WhatsApp Service] ⚠️ 24h-Fenster abgelaufen, verwende Template Message...`
- `[WhatsApp Business] ✅ Nachricht erfolgreich gesendet`
- `[WhatsApp Business] Payload: {...}` (zeigt Template-Parameter)

---

### Kosten überwachen

**Session Messages** (24h-Fenster):
- **Kosten**: Günstiger (Session Pricing)
- **Wann**: Innerhalb 24h nach User-Nachricht
- **Limit**: Kein Limit (außer Rate Limits)

**Template Messages** (Fallback):
- **Kosten**: Teurer (Conversation Pricing)
- **Wann**: Außerhalb 24h oder erster Kontakt
- **Limit**: Abhängig von Meta Business Account Tier

**Empfehlung**: Hybrid-Ansatz nutzen (günstiger wenn möglich)

---

## Zusammenfassung

### Was passiert beim Versand?

1. **Code ruft auf**: `whatsappService.sendCheckInInvitation(guestName, guestPhone, checkInLink, paymentLink)`

2. **Template wird vorbereitet**:
   - Template-Name: `reservation_checkin_invitation`
   - Template-Parameter: `[guestName, checkInLink, paymentLink]`
   - Template-Sprache: `en`

3. **Hybrid-Ansatz**:
   - **Zuerst**: Versucht Session Message (günstiger)
   - **Bei Fehler**: Fallback auf Template Message (funktioniert immer)

4. **Template Message wird gesendet**:
   - Payload mit `type: 'template'`
   - Template-Name und Parameter werden an WhatsApp Business API gesendet
   - WhatsApp ersetzt `{{1}}`, `{{2}}`, `{{3}}` mit Parametern

5. **Nachricht kommt an**:
   - Format entspricht Template
   - Variablen sind ersetzt
   - Gast erhält Check-in-Link und Payment-Link

---

## Teil 6: 24-Stunden-Fenster nach Template-Versand

### Wichtige Frage: Was passiert nach dem Versand einer Template Message?

**Kurze Antwort:**
- ✅ **Empfänger antwortet**: 24h-Fenster öffnet sich → Normale Session Messages möglich (günstiger)
- ❌ **Empfänger antwortet NICHT**: Kein 24h-Fenster → Du brauchst wieder ein Template für weitere Nachrichten (teurer)

**Detaillierte Erklärung**: Siehe `docs/modules/WHATSAPP_24H_FENSTER_NACH_TEMPLATE.md`

---

## Referenzen

- **Code**: `backend/src/services/whatsappService.ts`
- **Template-Erstellung**: `docs/modules/WHATSAPP_TEMPLATE_ERSTELLUNG_ANLEITUNG.md`
- **Nächste Schritte**: `docs/modules/WHATSAPP_TEMPLATE_BEWILLIGUNG_NÄCHSTE_SCHRITTE.md`
- **24h-Fenster nach Template**: `docs/modules/WHATSAPP_24H_FENSTER_NACH_TEMPLATE.md`
- **Meta WhatsApp API**: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates

---

**Erstellt**: 2025-01-XX  
**Status**: ✅ Vollständig dokumentiert  
**Version**: 1.0


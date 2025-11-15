# WhatsApp Template Messages - Analyse und Lösungsplan

## Problem

WhatsApp-Nachrichten bei Reservierungen werden nicht versendet, wenn der Empfänger nicht zuerst geschrieben hat.

## Aktueller Stand

### Was funktioniert:
- ✅ WhatsApp Business API ist konfiguriert
- ✅ Normale Text-Nachrichten werden versendet (wenn 24h-Fenster aktiv)
- ✅ Code unterstützt bereits Template Messages (optionaler Parameter)

### Was nicht funktioniert:
- ❌ Nachrichten an neue Kontakte (ohne vorherige Konversation) werden nicht versendet
- ❌ Keine Template Messages implementiert für Reservierungen

## WhatsApp Business API Regeln

### 1. Session Messages (24-Stunden-Fenster)
- **Wann**: Innerhalb von 24 Stunden nach letzter eingehender Nachricht vom User
- **Format**: Normale Text-Nachrichten (`type: 'text'`)
- **Kosten**: Günstiger (Session Pricing)
- **Aktueller Code**: ✅ Unterstützt (Standard-Verhalten)

### 2. Template Messages (Outbound)
- **Wann**: 
  - Außerhalb des 24-Stunden-Fensters
  - Bei erstem Kontakt (User hat noch nie geschrieben)
  - Für Marketing-Nachrichten
- **Format**: Template-basierte Nachrichten (`type: 'template'`)
- **Kosten**: Teurer (Conversation Pricing)
- **Voraussetzungen**:
  - Template muss in Meta Business Suite erstellt werden
  - Template muss von Meta genehmigt werden (1-2 Tage)
  - Template hat festes Format mit Variablen
- **Aktueller Code**: ⚠️ Teilweise unterstützt (Parameter vorhanden, aber nicht verwendet)

## Analyse des aktuellen Codes

### `whatsappService.ts`
```typescript
// Zeile 290-317: sendViaWhatsAppBusiness()
// - Unterstützt bereits Template Messages (optionaler Parameter)
// - ABER: Wird aktuell nicht verwendet
// - Standard: type: 'text' (Session Message)
```

### `reservationNotificationService.ts`
```typescript
// Zeile 94: sendCheckInInvitation()
// - Ruft whatsappService.sendMessage() auf
// - OHNE Template-Parameter
// - → Versucht Session Message (schlägt fehl bei neuem Kontakt)
```

### `reservationController.ts`
```typescript
// Zeile 148, 298: sendMessage()
// - Ruft whatsappService.sendMessage() auf
// - OHNE Template-Parameter
// - → Versucht Session Message (schlägt fehl bei neuem Kontakt)
```

## Lösung

### Option 1: Template Messages für Reservierungen (EMPFOHLEN)

**Vorteile:**
- ✅ Funktioniert immer (auch bei erstem Kontakt)
- ✅ Keine Abhängigkeit von 24h-Fenster
- ✅ Professioneller (genehmigte Templates)

**Nachteile:**
- ⚠️ Templates müssen erstellt und genehmigt werden (1-2 Tage)
- ⚠️ Teurer (Conversation Pricing statt Session Pricing)
- ⚠️ Templates haben festes Format (weniger flexibel)

**Implementierung:**
1. Template in Meta Business Suite erstellen
2. Template genehmigen lassen (1-2 Tage)
3. Code anpassen: Template-Parameter verwenden
4. Fallback: Bei Fehler auf Session Message zurückfallen

### Option 2: Hybrid-Ansatz (BESTE LÖSUNG)

**Vorgehen:**
1. Versuche zuerst Session Message (wenn 24h-Fenster aktiv)
2. Bei Fehler (z.B. "outside 24h window"): Fallback auf Template Message
3. Template Message als Backup

**Vorteile:**
- ✅ Günstiger (Session Messages wenn möglich)
- ✅ Funktioniert immer (Template als Fallback)
- ✅ Beste User Experience

## Implementierungsplan

### Phase 1: Template erstellen (Meta Business Suite)

**Schritte:**
1. Meta Business Suite öffnen: `https://business.facebook.com`
2. WhatsApp Business Account → **Message Templates**
3. **Create Template** klicken
4. Template konfigurieren:
   - **Name**: `reservation_checkin_invitation` (oder ähnlich)
   - **Category**: `UTILITY` (für Service-Nachrichten) oder `MARKETING`
   - **Language**: `Spanish (es)` oder `German (de)`
   - **Body**: 
     ```
     Hola {{1}},
     
     ¡Nos complace darte la bienvenida a La Familia Hostel!
     
     Como llegarás después de las 22:00, puedes realizar el check-in en línea ahora:
     {{2}}
     
     Por favor, realiza el pago por adelantado:
     {{3}}
     
     ¡Te esperamos mañana!
     ```
   - **Variables**: 
     - `{{1}}` = Guest Name
     - `{{2}}` = Check-in Link
     - `{{3}}` = Payment Link
5. **Submit** → Warte auf Genehmigung (1-2 Tage)

**Weitere Templates:**
- `reservation_checkin_confirmation` (für Check-in-Bestätigung)
- `reservation_payment_reminder` (optional)

### Phase 2: Code anpassen

#### 2.1 Template-Namen konfigurierbar machen

**Datei**: `backend/src/services/whatsappService.ts`

**Änderungen:**
- Template-Namen aus Settings laden (pro Branch/Organization)
- Oder: Environment-Variablen
- Oder: Hardcodiert (für MVP)

#### 2.2 Hybrid-Ansatz implementieren

**Datei**: `backend/src/services/whatsappService.ts`

**Neue Methode:**
```typescript
async sendMessageWithFallback(
  to: string, 
  message: string, 
  templateName?: string
): Promise<boolean> {
  try {
    // Versuche zuerst Session Message
    return await this.sendMessage(to, message);
  } catch (error) {
    // Prüfe ob Fehler "outside 24h window" ist
    if (this.isOutside24HourWindowError(error)) {
      // Fallback: Template Message
      if (templateName) {
        return await this.sendMessage(to, message, templateName);
      }
    }
    throw error;
  }
}
```

**Fehler-Erkennung:**
```typescript
private isOutside24HourWindowError(error: any): boolean {
  if (axios.isAxiosError(error)) {
    const errorData = error.response?.data;
    const errorCode = errorData?.error?.code;
    const errorMessage = errorData?.error?.message?.toLowerCase() || '';
    
    // WhatsApp Business API Fehlercodes für 24h-Fenster
    return errorCode === 131047 || // Message outside 24-hour window
           errorMessage.includes('24 hour') ||
           errorMessage.includes('outside window') ||
           errorMessage.includes('template required');
  }
  return false;
}
```

#### 2.3 Reservation Services anpassen

**Datei**: `backend/src/services/reservationNotificationService.ts`

**Änderungen:**
- `sendCheckInInvitation()`: Verwende `sendMessageWithFallback()` mit Template
- `sendCheckInConfirmation()`: Verwende `sendMessageWithFallback()` mit Template

**Datei**: `backend/src/controllers/reservationController.ts`

**Änderungen:**
- `updateGuestContact()`: Verwende `sendMessageWithFallback()` mit Template
- `createReservation()`: Verwende `sendMessageWithFallback()` mit Template

#### 2.4 Template-Konfiguration

**Option A: Environment-Variablen**
```env
WHATSAPP_TEMPLATE_CHECKIN_INVITATION=reservation_checkin_invitation
WHATSAPP_TEMPLATE_CHECKIN_CONFIRMATION=reservation_checkin_confirmation
```

**Option B: Organization/Branch Settings**
```json
{
  "whatsapp": {
    "templates": {
      "checkinInvitation": "reservation_checkin_invitation",
      "checkinConfirmation": "reservation_checkin_confirmation"
    }
  }
}
```

**Option C: Hardcodiert (für MVP)**
```typescript
const TEMPLATE_CHECKIN_INVITATION = 'reservation_checkin_invitation';
const TEMPLATE_CHECKIN_CONFIRMATION = 'reservation_checkin_confirmation';
```

### Phase 3: Template-Parameter richtig formatieren

**Wichtig**: Template Messages haben festes Format!

**Aktuelles Problem:**
- Code sendet normale Text-Nachricht
- Template benötigt Variablen-Array

**Lösung:**
```typescript
// Template Body:
// "Hola {{1}}, Link: {{2}}, Payment: {{3}}"

// Template Parameters:
payload.template = {
  name: 'reservation_checkin_invitation',
  language: { code: 'es' },
  components: [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: guestName },      // {{1}}
        { type: 'text', text: checkInLink },    // {{2}}
        { type: 'text', text: paymentLink }     // {{3}}
      ]
    }
  ]
};
```

## Detaillierter Implementierungsplan

### Schritt 1: Template in Meta erstellen

1. **Meta Business Suite** → WhatsApp Business Account
2. **Message Templates** → **Create Template**
3. **Template konfigurieren:**
   - Name: `reservation_checkin_invitation`
   - Category: `UTILITY`
   - Language: `Spanish (es)`
   - Body:
     ```
     Hola {{1}},
     
     ¡Nos complace darte la bienvenida a La Familia Hostel!
     
     Como llegarás después de las 22:00, puedes realizar el check-in en línea ahora:
     {{2}}
     
     Por favor, realiza el pago por adelantado:
     {{3}}
     
     ¡Te esperamos mañana!
     ```
4. **Submit** → Warte auf Genehmigung

### Schritt 2: Code erweitern

#### 2.1 Template-Support erweitern

**Datei**: `backend/src/services/whatsappService.ts`

**Neue Methoden:**
- `sendMessageWithFallback()` - Hybrid-Ansatz
- `isOutside24HourWindowError()` - Fehler-Erkennung
- `formatTemplateMessage()` - Template-Parameter formatieren

#### 2.2 Reservation Services anpassen

**Dateien:**
- `reservationNotificationService.ts`
- `reservationController.ts`

**Änderungen:**
- Verwende `sendMessageWithFallback()` statt `sendMessage()`
- Template-Namen übergeben

### Schritt 3: Testing

1. **Test mit aktivem 24h-Fenster:**
   - User schreibt zuerst
   - Reservierung erstellen
   - → Sollte Session Message verwenden

2. **Test ohne 24h-Fenster:**
   - User hat nicht geschrieben
   - Reservierung erstellen
   - → Sollte Template Message verwenden

3. **Test Template-Genehmigung:**
   - Template muss genehmigt sein
   - Sonst Fehler

## Kosten-Überlegungen

### Session Messages (24h-Fenster)
- **Kosten**: Günstiger
- **Wann**: Innerhalb 24h nach User-Nachricht
- **Limit**: Kein Limit (außer Rate Limits)

### Template Messages (Outbound)
- **Kosten**: Teurer (Conversation Pricing)
- **Wann**: Außerhalb 24h oder erster Kontakt
- **Limit**: Abhängig von Meta Business Account Tier

**Empfehlung**: Hybrid-Ansatz nutzen (günstiger wenn möglich)

## Nächste Schritte

1. ✅ **Analyse abgeschlossen** (dieses Dokument)
2. ⏳ **Template in Meta erstellen** (manuell, 1-2 Tage Genehmigung)
3. ⏳ **Code anpassen** (Hybrid-Ansatz implementieren)
4. ⏳ **Testing** (beide Szenarien testen)

## Referenzen

- **Meta WhatsApp Business API Docs**: https://developers.facebook.com/docs/whatsapp
- **Template Messages**: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates
- **24-Hour Window**: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages



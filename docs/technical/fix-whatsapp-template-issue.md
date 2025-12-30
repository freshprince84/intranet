# WhatsApp Template-Problem: Lösung

## Problem
- Template `reservation_confirmation` existiert NICHT in WhatsApp Business Console
- Code verwendet Standard `reservation_confirmation`, aber Template fehlt
- Session Message wird verwendet (24h-Fenster), daher keine Template-Nachricht in Console

## Lösung

### Option 1: Template erstellen (Empfohlen)

1. Gehe zu WhatsApp Business Console: https://business.facebook.com
2. Navigiere zu: **Message Templates**
3. **Create Template** klicken
4. Konfiguration:
   - **Name**: `reservation_confirmation` (exakt so!)
   - **Category**: `UTILITY`
   - **Language**: `English (en)` (oder `Spanish (es)`)
5. Template-Body:
   ```
   Hola {{1}},
   
   ¡Bienvenido a La Familia Hostel!
   
   Tu reserva ha sido confirmada.
   Cargos: {{2}}
   
   Puedes realizar el check-in en línea ahora:
   {{3}}
   
   Por favor, realiza el pago:
   {{4}}
   
   ¡Te esperamos!
   ```
6. Variablen:
   - `{{1}}` = Gast-Name
   - `{{2}}` = Betrag (z.B. "11111 COP")
   - `{{3}}` = Check-in-Link
   - `{{4}}` = Payment-Link
7. **Save** und **Submit for Review**
8. Warte auf Genehmigung (1-2 Tage)

### Option 2: Code ändern (Temporär)

Falls Template nicht erstellt werden kann, Code so ändern, dass immer Template verwendet wird:

```typescript
// In reservationController.ts, Zeile 324
// Statt sendMessageWithFallback, direkt Template verwenden:
const whatsappSuccess = await whatsappService.sendMessage(
  reservation.guestPhone,
  sentMessage,
  templateName  // Template wird immer verwendet
);
```

**⚠️ WICHTIG**: Dies funktioniert nur, wenn Template existiert!

### Option 3: Template-Name ändern

Falls `reservation_checkin_invitation` verwendet werden soll:

1. In `.env` Datei:
   ```
   WHATSAPP_TEMPLATE_RESERVATION_CONFIRMATION=reservation_checkin_invitation
   ```

2. Oder Code ändern:
   ```typescript
   const templateName = 'reservation_checkin_invitation';
   ```

**⚠️ WICHTIG**: Template-Parameter müssen übereinstimmen!

## Aktueller Status

- ✅ `reservation_checkin_invitation` existiert (im Bild sichtbar)
- ❌ `reservation_confirmation` existiert NICHT
- ✅ Session Message funktioniert (24h-Fenster)
- ❌ Template Message schlägt fehl (Template fehlt)

## Empfehlung

**Erstelle das Template `reservation_confirmation`** in der Business Console, dann funktioniert alles korrekt!


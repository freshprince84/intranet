# WhatsApp 24-Stunden-Fenster nach Template-Versand

**Datum**: 2025-01-XX  
**Status**: ✅ Wichtige Information für Template-Nutzung

## Wichtige Frage: Was passiert nach dem Versand einer Template Message?

### Kurze Antwort:

**Es gibt 2 Szenarien:**

1. ✅ **Empfänger antwortet auf Template**: 24h-Fenster öffnet sich → Du kannst normale Session Messages senden (günstiger)
2. ❌ **Empfänger antwortet NICHT**: Kein 24h-Fenster → Du brauchst wieder ein Template für weitere Nachrichten

---

## Detaillierte Erklärung

### Szenario 1: Empfänger antwortet auf Template Message

**Ablauf:**

1. **Du sendest Template Message**:
   - Template: `reservation_checkin_invitation`
   - Gast erhält Check-in-Link und Payment-Link
   - Template Message wird versendet (teurer)

2. **Empfänger antwortet**:
   - Beispiel: "Danke, ich habe bezahlt"
   - Oder: "Wann kann ich einchecken?"
   - **Wichtig**: Jede Antwort öffnet das 24h-Fenster neu!

3. **24h-Fenster öffnet sich**:
   - Ab dem Zeitpunkt der Antwort: 24 Stunden lang aktiv
   - Du kannst normale Session Messages senden
   - **Kein Template mehr nötig** (günstiger)

4. **Weitere Nachrichten senden**:
   - Innerhalb von 24h: Normale Text-Nachrichten möglich
   - Code verwendet automatisch Session Message (Hybrid-Ansatz)
   - **Kosten**: Günstiger (Session Pricing)

**Beispiel-Ablauf:**

```
Tag 1, 10:00 Uhr: Du sendest Template Message
  → Template: "Hola Juan, hier ist dein Check-in-Link..."

Tag 1, 10:15 Uhr: Empfänger antwortet "Danke!"
  → ✅ 24h-Fenster öffnet sich (bis Tag 2, 10:15 Uhr)

Tag 1, 11:00 Uhr: Du sendest normale Nachricht
  → ✅ Session Message (günstiger, kein Template nötig)
  → "Hast du noch Fragen?"

Tag 1, 14:00 Uhr: Du sendest normale Nachricht
  → ✅ Session Message (günstiger, kein Template nötig)
  → "Vergiss nicht, den Check-in zu machen!"

Tag 2, 09:00 Uhr: Du sendest normale Nachricht
  → ✅ Session Message (günstiger, 24h-Fenster noch aktiv)

Tag 2, 10:16 Uhr: Du sendest normale Nachricht
  → ❌ Fehler: "Message outside 24-hour window"
  → Code verwendet automatisch Template (Fallback)
```

---

### Szenario 2: Empfänger antwortet NICHT auf Template Message

**Ablauf:**

1. **Du sendest Template Message**:
   - Template: `reservation_checkin_invitation`
   - Gast erhält Check-in-Link und Payment-Link
   - Template Message wird versendet (teurer)

2. **Empfänger antwortet NICHT**:
   - Keine Antwort auf die Template Message
   - **Wichtig**: Kein 24h-Fenster öffnet sich!

3. **Du willst nochmal schreiben**:
   - Beispiel: "Hast du den Check-in schon gemacht?"
   - **Problem**: Kein 24h-Fenster aktiv
   - **Lösung**: Du musst wieder ein Template verwenden

4. **Weitere Nachrichten senden**:
   - **Ohne Antwort**: Immer Template nötig (teurer)
   - Code verwendet automatisch Template (Fallback)
   - **Kosten**: Teurer (Conversation Pricing)

**Beispiel-Ablauf:**

```
Tag 1, 10:00 Uhr: Du sendest Template Message
  → Template: "Hola Juan, hier ist dein Check-in-Link..."
  → Empfänger liest, antwortet aber nicht

Tag 1, 11:00 Uhr: Du willst nochmal schreiben
  → ❌ Kein 24h-Fenster aktiv (keine Antwort)
  → Code versucht Session Message → Fehler
  → Code verwendet automatisch Template (Fallback)
  → Template: "Hast du den Check-in schon gemacht?" (neues Template nötig!)

Tag 2, 10:00 Uhr: Du willst nochmal schreiben
  → ❌ Immer noch kein 24h-Fenster aktiv
  → Code verwendet automatisch Template (Fallback)
  → Template: "Erinnerung: Check-in heute!" (neues Template nötig!)
```

---

## Wichtige Regeln

### Regel 1: 24h-Fenster öffnet sich nur durch Antwort

- ✅ **Template Message senden** → Kein 24h-Fenster (nur wenn Antwort kommt)
- ✅ **Empfänger antwortet** → 24h-Fenster öffnet sich
- ✅ **Weitere Antworten** → 24h-Fenster verlängert sich (immer ab letzter Antwort)

### Regel 2: Innerhalb 24h-Fenster = Session Messages möglich

- ✅ **24h-Fenster aktiv** → Normale Text-Nachrichten möglich (günstiger)
- ✅ **Code verwendet automatisch Session Message** (Hybrid-Ansatz)
- ✅ **Kein Template nötig** (spart Kosten)

### Regel 3: Außerhalb 24h-Fenster = Template nötig

- ❌ **Kein 24h-Fenster aktiv** → Template Message nötig (teurer)
- ❌ **Code verwendet automatisch Template** (Fallback)
- ❌ **Jede weitere Nachricht braucht Template** (wenn keine Antwort)

---

## Praktische Auswirkungen

### Für dein System:

**Aktueller Code (Hybrid-Ansatz):**

```typescript
// Code versucht immer zuerst Session Message
sendMessageWithFallback(phone, message, templateName, templateParams)
  → Versucht Session Message (24h-Fenster)
  → Bei Fehler: Fallback auf Template Message
```

**Das bedeutet:**

1. **Nach Template-Versand + Antwort**:
   - ✅ Nächste Nachricht: Session Message (günstiger)
   - ✅ Code funktioniert automatisch

2. **Nach Template-Versand OHNE Antwort**:
   - ❌ Nächste Nachricht: Template Message (teurer)
   - ❌ Code verwendet automatisch Template (Fallback)
   - ⚠️ **Problem**: Du brauchst ein neues Template für jede weitere Nachricht!

---

## Lösung: Weitere Templates erstellen

### Problem:

Wenn der Empfänger nicht antwortet, brauchst du für **jede weitere Nachricht** ein neues Template.

### Lösung:

**Erstelle weitere Templates für häufige Nachrichten:**

1. **`reservation_checkin_reminder`** - Erinnerung an Check-in
   ```
   Hola {{1}},
   
   Erinnerung: Dein Check-in ist heute!
   
   Link: {{2}}
   ```

2. **`reservation_payment_reminder`** - Zahlungserinnerung
   ```
   Hola {{1}},
   
   Bitte vergiss nicht, die Zahlung durchzuführen:
   {{2}}
   ```

3. **`reservation_checkin_confirmation`** - Check-in-Bestätigung
   ```
   Hola {{1}},
   
   Dein Check-in wurde bestätigt!
   Zimmer: {{2}}
   PIN: {{3}}
   ```

**Vorteil:**
- Du kannst verschiedene Nachrichten senden
- Auch wenn Empfänger nicht antwortet
- Templates müssen nur einmal genehmigt werden

---

## Kosten-Überlegungen

### Session Messages (24h-Fenster aktiv):

- **Kosten**: Günstiger (Session Pricing)
- **Wann**: Innerhalb 24h nach letzter Antwort
- **Limit**: Kein Limit (außer Rate Limits)
- **Template nötig**: ❌ Nein

### Template Messages (24h-Fenster nicht aktiv):

- **Kosten**: Teurer (Conversation Pricing)
- **Wann**: Außerhalb 24h oder ohne Antwort
- **Limit**: Abhängig von Meta Business Account Tier
- **Template nötig**: ✅ Ja (für jede Nachricht)

**Empfehlung**: 
- Versuche, Empfänger zum Antworten zu motivieren
- Erstelle Templates für häufige Nachrichten
- Nutze Hybrid-Ansatz (Code macht das automatisch)

---

## Zusammenfassung

### Nach Template-Versand:

| Szenario | 24h-Fenster | Nächste Nachricht | Template nötig? | Kosten |
|----------|-------------|-------------------|-----------------|--------|
| **Empfänger antwortet** | ✅ Öffnet sich | Session Message | ❌ Nein | Günstiger |
| **Empfänger antwortet NICHT** | ❌ Bleibt geschlossen | Template Message | ✅ Ja | Teurer |

### Für dein System:

1. ✅ **Code funktioniert automatisch** (Hybrid-Ansatz)
2. ✅ **Nach Antwort**: Session Messages (günstiger)
3. ⚠️ **Ohne Antwort**: Template Messages (teurer, braucht Template)
4. 💡 **Empfehlung**: Weitere Templates erstellen für häufige Nachrichten

---

## Referenzen

- **Meta WhatsApp API Docs**: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages
- **Template Messages**: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates
- **24-Hour Window**: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages

---

**Erstellt**: 2025-01-XX  
**Status**: ✅ Wichtige Information dokumentiert  
**Version**: 1.0


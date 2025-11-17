# WhatsApp Template Messages - Schritt-für-Schritt Anleitung

## Übersicht

Diese Anleitung führt dich durch die Erstellung von WhatsApp Template Messages in der Meta Business Suite. Templates sind erforderlich, um Nachrichten an Kontakte zu senden, die nicht innerhalb des 24-Stunden-Fensters geschrieben haben.

## Warum Templates?

- ✅ **Funktioniert immer**: Auch bei erstem Kontakt oder außerhalb des 24h-Fensters
- ✅ **Professionell**: Genehmigte Templates von Meta
- ⚠️ **Genehmigung erforderlich**: 1-2 Tage Wartezeit
- ⚠️ **Teurer**: Conversation Pricing statt Session Pricing

## Benötigte Templates

Für die Reservierungs-Funktionalität benötigst du folgende Templates:

1. **`reservation_checkin_invitation`** - Check-in-Einladung
2. **`reservation_checkin_confirmation`** - Check-in-Bestätigung
3. **`reservation_confirmation`** - Reservierungsbestätigung (optional)

---

## Schritt 1: Meta Business Suite öffnen

1. Gehe zu: **https://business.facebook.com**
2. **Einloggen** mit deinem Meta Business Account
3. **Accounts** → **WhatsApp Accounts** auswählen
4. Dein **WhatsApp Business Account** auswählen

---

## Schritt 2: Template erstellen - Check-in-Einladung

### 2.1 Template-Bereich öffnen

1. In deinem WhatsApp Business Account: **Message Templates**
2. **Create Template** klicken

### 2.2 Template konfigurieren

**Grundinformationen:**
- **Name**: `reservation_checkin_invitation`
  - ⚠️ **WICHTIG**: Name muss exakt so sein (wird im Code verwendet)
- **Category**: `UTILITY` (für Service-Nachrichten)
  - Alternative: `MARKETING` (wenn Marketing-Nachricht)
- **Language**: `English (en)`, `Spanish (es)` oder `German (de)`
  - ⚠️ **WICHTIG**: Muss mit der Sprache im Code übereinstimmen
  - **Aktuell**: Template wurde mit "English (en)" erstellt (Code verwendet Standard 'en' ✅)
  - **Hinweis**: Template-Text kann in anderer Sprache sein als die Template-Sprache

### 2.3 Template-Body erstellen

**Template-Text:**
```
Hola {{1}},

¡Nos complace darte la bienvenida a La Familia Hostel!

Como llegarás después de las 22:00, puedes realizar el check-in en línea ahora:
{{2}}

Por favor, realiza el pago por adelantado:
{{3}}

¡Te esperamos mañana!
```

**Variablen:**
- `{{1}}` = Gast-Name (z.B. "Juan Pérez")
- `{{2}}` = Check-in-Link (z.B. "https://...")
- `{{3}}` = Payment-Link (z.B. "https://...")

**Hinweise:**
- Variablen müssen in der Reihenfolge `{{1}}`, `{{2}}`, `{{3}}` sein
- Keine Leerzeichen in Variablen (z.B. `{{ 1 }}` ist falsch)
- Maximal 1024 Zeichen im Body

### 2.4 Template speichern und einreichen

1. **Save** klicken
2. **Submit for Review** klicken
3. ⏳ **Warte auf Genehmigung** (1-2 Tage)

---

## Schritt 3: Template erstellen - Check-in-Bestätigung

### 3.1 Neues Template erstellen

1. **Message Templates** → **Create Template**

### 3.2 Template konfigurieren

**Grundinformationen:**
- **Name**: `reservation_checkin_confirmation`
- **Category**: `UTILITY`
- **Language**: `Spanish (es)`

### 3.3 Template-Body erstellen

**Template-Text:**
```
Hola {{1}},

¡Tu check-in se ha completado exitosamente!

Información de tu habitación:
- Habitación: {{2}}
- Descripción: {{3}}

Acceso:
- PIN de la puerta: {{4}}
- App: {{5}}

¡Te deseamos una estancia agradable!
```

**Variablen:**
- `{{1}}` = Gast-Name
- `{{2}}` = Zimmernummer
- `{{3}}` = Zimmerbeschreibung
- `{{4}}` = Tür-PIN
- `{{5}}` = App-Name (z.B. "TTLock")

### 3.4 Template speichern und einreichen

1. **Save** klicken
2. **Submit for Review** klicken
3. ⏳ **Warte auf Genehmigung**

---

## Schritt 4: Template erstellen - Reservierungsbestätigung (Optional)

### 4.1 Neues Template erstellen

1. **Message Templates** → **Create Template**

### 4.2 Template konfigurieren

**Grundinformationen:**
- **Name**: `reservation_confirmation`
- **Category**: `UTILITY`
- **Language**: `Spanish (es)`

### 4.3 Template-Body erstellen

**Template-Text:**
```
Hola {{1}},

¡Bienvenido a La Familia Hostel!

Tu reserva ha sido confirmada:
- Entrada: {{2}}
- Salida: {{3}}

Por favor, realiza el pago:
{{4}}

¡Te esperamos!
```

**Variablen:**
- `{{1}}` = Gast-Name
- `{{2}}` = Check-in Datum
- `{{3}}` = Check-out Datum
- `{{4}}` = Payment-Link

### 4.4 Template speichern und einreichen

1. **Save** klicken
2. **Submit for Review** klicken
3. ⏳ **Warte auf Genehmigung**

---

## Schritt 5: Template-Status prüfen

### 5.1 Status anzeigen

1. **Message Templates** → Template-Liste öffnen
2. **Status** prüfen:
   - ✅ **Approved** = Template ist genehmigt und kann verwendet werden
   - 🟡 **Pending** = Warte auf Genehmigung
   - ❌ **Rejected** = Template wurde abgelehnt (siehe Fehlermeldung)

### 5.2 Template-Name notieren

⚠️ **WICHTIG**: Notiere dir die exakten Template-Namen:
- `reservation_checkin_invitation`
- `reservation_checkin_confirmation`
- `reservation_confirmation`

Diese Namen werden im Code verwendet!

---

## Schritt 6: Template-Namen konfigurieren (Optional)

### Option A: Environment-Variablen (Empfohlen)

Füge in deiner `.env` Datei hinzu:

```env
WHATSAPP_TEMPLATE_CHECKIN_INVITATION=reservation_checkin_invitation
WHATSAPP_TEMPLATE_CHECKIN_CONFIRMATION=reservation_checkin_confirmation
WHATSAPP_TEMPLATE_RESERVATION_CONFIRMATION=reservation_confirmation
```

### Option B: Standard-Werte (Aktuell)

Der Code verwendet bereits Standard-Werte, die mit den Template-Namen übereinstimmen müssen.

---

## Schritt 7: Testing

### 7.1 Test mit aktivem 24h-Fenster

1. **User schreibt zuerst** an WhatsApp Business Nummer
2. **Reservierung erstellen** im System
3. ✅ **Erwartung**: Session Message wird verwendet (günstiger)

### 7.2 Test ohne 24h-Fenster

1. **User hat NICHT geschrieben** (oder 24h abgelaufen)
2. **Reservierung erstellen** im System
3. ✅ **Erwartung**: Template Message wird verwendet (Fallback)

### 7.3 Fehler prüfen

**Falls Fehler auftreten:**
- ❌ **"Template not found"**: Template-Name stimmt nicht überein
- ❌ **"Template not approved"**: Template noch nicht genehmigt
- ❌ **"Invalid parameters"**: Anzahl/Reihenfolge der Parameter stimmt nicht

**Logs prüfen:**
```bash
# Backend-Logs anzeigen
tail -f backend/logs/app.log | grep "WhatsApp"
```

---

## Wichtige Hinweise

### Template-Namen
- ⚠️ **Müssen EXAKT** mit den Namen im Code übereinstimmen
- **Kleinbuchstaben** verwenden
- **Unterstriche** statt Leerzeichen

### Template-Parameter
- ⚠️ **Reihenfolge ist wichtig**: `{{1}}`, `{{2}}`, `{{3}}` müssen in der richtigen Reihenfolge sein
- **Anzahl muss übereinstimmen**: Code sendet genau so viele Parameter wie im Template definiert

### Genehmigung
- ⏳ **1-2 Tage Wartezeit** ist normal
- 📧 **E-Mail-Benachrichtigung** bei Genehmigung/Ablehnung
- 🔄 **Bei Ablehnung**: Fehlermeldung prüfen und Template korrigieren

### Kosten
- 💰 **Template Messages sind teurer** als Session Messages
- 💡 **Hybrid-Ansatz**: Code versucht zuerst Session Message (günstiger), nur bei Fehler: Template

---

## Troubleshooting

### Problem: "Template not found"

**Lösung:**
1. Prüfe Template-Name in Meta Business Suite
2. Prüfe Template-Name im Code (Environment-Variablen oder Standard-Werte)
3. Stelle sicher, dass Template **genehmigt** ist

### Problem: "Template not approved"

**Lösung:**
1. Warte auf Genehmigung (1-2 Tage)
2. Prüfe Status in Meta Business Suite
3. Bei Ablehnung: Fehlermeldung prüfen und Template korrigieren

### Problem: "Invalid parameters"

**Lösung:**
1. Prüfe Anzahl der Variablen im Template (z.B. `{{1}}`, `{{2}}`, `{{3}}`)
2. Prüfe Anzahl der Parameter im Code
3. Stelle sicher, dass Reihenfolge übereinstimmt

### Problem: "Message still fails with template"

**Lösung:**
1. Prüfe ob Template in der **richtigen Sprache** erstellt wurde (aktuell: `es`)
2. Prüfe ob Template **Category** korrekt ist (`UTILITY` für Service-Nachrichten)
3. Prüfe Backend-Logs für detaillierte Fehlermeldungen

---

## Referenzen

- **Meta WhatsApp Business API Docs**: https://developers.facebook.com/docs/whatsapp
- **Template Messages Guide**: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates
- **24-Hour Window**: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages

---

## Checkliste

### Vorbereitung
- [ ] Meta Business Account erstellt
- [ ] WhatsApp Business Account erstellt
- [ ] Zugriff auf Message Templates

### Template-Erstellung
- [x] Template `reservation_checkin_invitation` erstellt
- [ ] Template `reservation_checkin_confirmation` erstellt
- [ ] Template `reservation_confirmation` erstellt (optional)
- [x] Template `reservation_checkin_invitation` eingereicht für Genehmigung

### Genehmigung
- [x] Template `reservation_checkin_invitation` genehmigt ✅ (2025-01-XX)
- [ ] Template `reservation_checkin_confirmation` genehmigt
- [ ] Template `reservation_confirmation` genehmigt (optional)

### Konfiguration
- [x] Template-Namen im Code konfiguriert (Standard-Wert: `reservation_checkin_invitation`)
- [x] Template-Sprache konfiguriert: Standard 'en' ist korrekt ✅ (Template wurde mit "English" erstellt)
- [x] Code deployed mit Template-Support (Hybrid-Ansatz implementiert)

### Testing
- [ ] Test mit aktivem 24h-Fenster erfolgreich
- [ ] Test ohne 24h-Fenster erfolgreich (Template-Fallback)
- [ ] Fehlerbehandlung getestet

---

## Nächste Schritte

Nach erfolgreicher Template-Erstellung und Genehmigung:

1. ✅ **Code ist bereits implementiert** (Hybrid-Ansatz)
2. ✅ **Template `reservation_checkin_invitation` bewilligt** (2025-01-XX)
3. ✅ **Template-Sprache konfiguriert**: Standard 'en' ist korrekt (Template wurde mit "English" erstellt)
4. ⏳ **Template testen** (mit und ohne 24h-Fenster)
5. ⏳ **Weitere Templates einreichen** (optional: `reservation_checkin_confirmation`)
6. ⏳ **Für später**: Template auf Spanisch umstellen oder neue spanische Version erstellen
7. 📊 **Monitoring**: Prüfe Logs für Template-Verwendung
8. 💰 **Kosten überwachen**: Template Messages sind teurer

**Siehe**: `docs/modules/WHATSAPP_TEMPLATE_BEWILLIGUNG_NÄCHSTE_SCHRITTE.md` für detaillierte nächste Schritte

---

**Erstellt**: 2025-01-XX  
**Status**: ✅ Implementiert  
**Version**: 1.0



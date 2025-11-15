# WhatsApp Templates erstellen - Quick Start

## 🎯 Wo genau?

### Schritt 1: Meta Business Suite öffnen

1. **Gehe zu**: https://business.facebook.com
2. **Einloggen** mit deinem Meta Business Account

### Schritt 2: WhatsApp Business Account öffnen

1. **Links im Menü**: Klicke auf **"Accounts"** (oder **"Konten"**)
2. **Untermenü**: Klicke auf **"WhatsApp Accounts"** (oder **"WhatsApp-Konten"**)
3. **Account auswählen**: Klicke auf deinen WhatsApp Business Account

### Schritt 3: Message Templates öffnen

1. **Im WhatsApp Business Account**: Suche nach **"Message Templates"** (oder **"Nachrichtenvorlagen"**)
   - Oder: **"Templates"** Tab
   - Oder: **"Vorlagen"** Tab
2. **Button**: Klicke auf **"Create Template"** (oder **"Vorlage erstellen"**)

### Schritt 4: Template erstellen

**Jetzt siehst du ein Formular:**

1. **Name**: `reservation_checkin_invitation` (exakt so!)
2. **Category**: `UTILITY` auswählen
3. **Language**: `Spanish (es)` auswählen
4. **Body**: Template-Text einfügen (siehe unten)
5. **Save** → **Submit for Review**

---

## 📝 Template 1: Check-in-Einladung

**Name**: `reservation_checkin_invitation`

**Body-Text**:
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
- `{{1}}` = Gast-Name
- `{{2}}` = Check-in-Link
- `{{3}}` = Payment-Link

---

## 📝 Template 2: Check-in-Bestätigung

**Name**: `reservation_checkin_confirmation`

**Body-Text**:
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

**Variablen**:
- `{{1}}` = Gast-Name
- `{{2}}` = Zimmernummer
- `{{3}}` = Zimmerbeschreibung
- `{{4}}` = Tür-PIN
- `{{5}}` = App-Name

---

## 📝 Template 3: Reservierungsbestätigung (Optional)

**Name**: `reservation_confirmation`

**Body-Text**:
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

**Variablen**:
- `{{1}}` = Gast-Name
- `{{2}}` = Check-in Datum
- `{{3}}` = Check-out Datum
- `{{4}}` = Payment-Link

---

## ⚠️ Wichtig

1. **Template-Namen müssen EXAKT** sein (keine Leerzeichen, keine Großbuchstaben)
2. **Variablen**: `{{1}}`, `{{2}}`, `{{3}}` (keine Leerzeichen!)
3. **Genehmigung**: 1-2 Tage Wartezeit nach "Submit for Review"
4. **Status prüfen**: In der Template-Liste → Status sollte "Approved" sein

---

## 🔍 Falls du "Message Templates" nicht findest

**Alternative Wege:**

1. **Meta for Developers**: https://developers.facebook.com
   - Deine App öffnen
   - **WhatsApp** → **Message Templates**

2. **Direkter Link** (nach Login):
   - https://business.facebook.com/wa/manage/message-templates/

3. **In WhatsApp Business Account**:
   - Oben: **"Tools"** oder **"Werkzeuge"**
   - **"Message Templates"** oder **"Nachrichtenvorlagen"**

---

## ✅ Checkliste

- [ ] Meta Business Suite geöffnet
- [ ] WhatsApp Business Account gefunden
- [ ] "Message Templates" oder "Templates" Tab gefunden
- [ ] "Create Template" Button gefunden
- [ ] Template 1 erstellt und eingereicht
- [ ] Template 2 erstellt und eingereicht
- [ ] Template 3 erstellt und eingereicht (optional)
- [ ] Auf Genehmigung warten (1-2 Tage)

---

**Vollständige Anleitung**: Siehe `docs/WHATSAPP_TEMPLATE_ERSTELLUNG_ANLEITUNG.md`



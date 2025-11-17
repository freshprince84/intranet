# WhatsApp Templates - GENAU DIESE SOLLST DU ERSTELLEN

## ✅ TEMPLATE 1: Check-in-Einladung (ERFORDERLICH)

**Name**: `reservation_checkin_invitation`  
**Category**: `UTILITY`  
**Language**: `Spanish (es)`

**Template-Text:**
```
Hola {{1}},

¡Nos complace darte la bienvenida a La Familia Hostel!

Como llegarás después de las 22:00, puedes realizar el check-in en línea ahora:
{{2}}

Por favor, realiza el pago por adelantado:
{{3}}

Por favor, escríbenos brevemente una vez que hayas completado tanto el check-in como el pago. ¡Gracias!

¡Te esperamos mañana!
```

**Variablen (in dieser Reihenfolge):**
- `{{1}}` = Gast-Name
- `{{2}}` = Check-in-Link
- `{{3}}` = Payment-Link

---

## ✅ TEMPLATE 2: Check-in-Bestätigung (ERFORDERLICH)

**Name**: `reservation_checkin_confirmation`  
**Category**: `UTILITY`  
**Language**: `Spanish (es)`

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

**Variablen (in dieser Reihenfolge):**
- `{{1}}` = Gast-Name
- `{{2}}` = Zimmernummer
- `{{3}}` = Zimmerbeschreibung
- `{{4}}` = Tür-PIN
- `{{5}}` = App-Name

---

## ⚠️ WICHTIG

1. **Namen müssen EXAKT sein**: `reservation_checkin_invitation` und `reservation_checkin_confirmation`
2. **Language**: `Spanish (es)` (weil Text auf Spanisch ist)
3. **Category**: `UTILITY`
4. **Variablen**: Keine Leerzeichen in `{{1}}`, `{{2}}`, etc.

---

---

## 🇬🇧 TEMPLATE 3: Check-in-Einladung ENGLISCH (ERFORDERLICH)

**Name**: `reservation_checkin_invitation` (gleicher Name, aber Language: English)  
**Category**: `UTILITY`  
**Language**: `English (en)`

**Template-Text:**
```
Hello {{1}},

We are pleased to welcome you to La Familia Hostel!

As you will arrive after 22:00, you can complete the online check-in now:
{{2}}

Please make the payment in advance:
{{3}}

Please write us briefly once you have completed both the check-in and payment. Thank you!

We look forward to seeing you tomorrow!
```

**Variablen (in dieser Reihenfolge):**
- `{{1}}` = Guest Name
- `{{2}}` = Check-in Link
- `{{3}}` = Payment Link

---

## 🇬🇧 TEMPLATE 4: Check-in-Bestätigung ENGLISCH (ERFORDERLICH)

**Name**: `reservation_checkin_confirmation` (gleicher Name, aber Language: English)  
**Category**: `UTILITY`  
**Language**: `English (en)`

**Template-Text:**
```
Hello {{1}},

Your check-in has been completed successfully!

Room information:
- Room: {{2}}
- Description: {{3}}

Access:
- Door PIN: {{4}}
- App: {{5}}

We wish you a pleasant stay!
```

**Variablen (in dieser Reihenfolge):**
- `{{1}}` = Guest Name
- `{{2}}` = Room Number
- `{{3}}` = Room Description
- `{{4}}` = Door PIN
- `{{5}}` = App Name

---

## ⚠️ WICHTIG: Template-Namen und Sprachen

**WhatsApp erlaubt Templates mit dem GLEICHEN Namen in VERSCHIEDENEN Sprachen!**

Das bedeutet:
- `reservation_checkin_invitation` mit Language `Spanish (es)` → Spanischer Text
- `reservation_checkin_invitation` mit Language `English (en)` → Englischer Text

**Im Code:**
- Standard ist `'es'` (Spanisch)
- Für englische Gäste: Setze `WHATSAPP_TEMPLATE_LANGUAGE=en` in `.env` ODER passe Code an, um Sprache basierend auf Gast zu wählen

---

**ZUSAMMENFASSUNG: Du musst 4 Templates erstellen:**
1. ✅ `reservation_checkin_invitation` - Spanish (es)
2. ✅ `reservation_checkin_confirmation` - Spanish (es)
3. ✅ `reservation_checkin_invitation` - English (en)
4. ✅ `reservation_checkin_confirmation` - English (en)


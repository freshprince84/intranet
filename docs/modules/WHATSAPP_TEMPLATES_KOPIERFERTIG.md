# WhatsApp Templates - Kopierfertig für Meta Business Suite

**Datum**: 2025-01-XX  
**Status**: ⏳ Bereit zur Einreichung

---

## ⚠️ WICHTIG: Template 1 muss aktualisiert werden!

Das bestehende Template `reservation_checkin_invitation` muss in Meta Business Suite aktualisiert werden mit dem neuen Text (inkl. Aufforderung zur Antwort).

---

## Template 1: Check-in-Einladung (AKTUALISIERT)

**Name**: `reservation_checkin_invitation`  
**Category**: `UTILITY`  
**Language**: `Spanish (es)` ⚠️ **WICHTIG: Spanisch, da Text auf Spanisch ist!**

**Body-Text (kopieren):**
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

**Variablen**: `{{1}}`, `{{2}}`, `{{3}}`

---

## Template 2: Check-in-Bestätigung

**Name**: `reservation_checkin_confirmation`  
**Category**: `UTILITY`  
**Language**: `Spanish (es)` ⚠️ **WICHTIG: Spanisch, da Text auf Spanisch ist!**

**Body-Text (kopieren):**
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

**Variablen**: `{{1}}`, `{{2}}`, `{{3}}`, `{{4}}`, `{{5}}`
- `{{1}}` = Gast-Name (z.B. "Juan Pérez")
- `{{2}}` = Zimmernummer (z.B. "101")
- `{{3}}` = Zimmerbeschreibung (z.B. "Zimmer mit Balkon")
- `{{4}}` = Tür-PIN (z.B. "1234")
- `{{5}}` = App-Name (z.B. "TTLock")

---

## Template 3: Reservierungsbestätigung (Optional)

**Name**: `reservation_confirmation`  
**Category**: `UTILITY`  
**Language**: `Spanish (es)` ⚠️ **WICHTIG: Spanisch, da Text auf Spanisch ist!**

**Body-Text (kopieren):**
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

**Variablen**: `{{1}}`, `{{2}}`, `{{3}}`, `{{4}}`
- `{{1}}` = Gast-Name (z.B. "Juan Pérez")
- `{{2}}` = Check-in Datum (z.B. "13/11/2025")
- `{{3}}` = Check-out Datum (z.B. "15/11/2025")
- `{{4}}` = Payment-Link (z.B. "https://...")

---

## Template 4: Check-in-Erinnerung

**Name**: `reservation_checkin_reminder`  
**Category**: `UTILITY`  
**Language**: `Spanish (es)` ⚠️ **WICHTIG: Spanisch, da Text auf Spanisch ist!**

**Body-Text (kopieren):**
```
Hola {{1}},

Recordatorio: Tu check-in es hoy.

Por favor, completa el check-in en línea:
{{2}}

Si ya lo has completado, por favor escríbenos brevemente. ¡Gracias!
```

**Variablen**: `{{1}}`, `{{2}}`
- `{{1}}` = Gast-Name (z.B. "Juan Pérez")
- `{{2}}` = Check-in-Link (z.B. "https://...")

---

## Template 5: Zahlungserinnerung

**Name**: `reservation_payment_reminder`  
**Category**: `UTILITY`  
**Language**: `Spanish (es)` ⚠️ **WICHTIG: Spanisch, da Text auf Spanisch ist!**

**Body-Text (kopieren):**
```
Hola {{1}},

Recordatorio: Por favor, completa el pago de tu reserva.

Link de pago:
{{2}}

Si ya has pagado, por favor escríbenos brevemente. ¡Gracias!
```

**Variablen**: `{{1}}`, `{{2}}`
- `{{1}}` = Gast-Name (z.B. "Juan Pérez")
- `{{2}}` = Payment-Link (z.B. "https://...")

---

## Template 6: Allgemeine Erinnerung (Optional)

**Name**: `reservation_general_reminder`  
**Category**: `UTILITY`  
**Language**: `Spanish (es)` ⚠️ **WICHTIG: Spanisch, da Text auf Spanisch ist!**

**Body-Text (kopieren):**
```
Hola {{1}},

Recordatorio: Por favor, completa el check-in y el pago de tu reserva.

Check-in: {{2}}
Pago: {{3}}

Una vez completados ambos, por favor escríbenos brevemente. ¡Gracias!
```

**Variablen**: `{{1}}`, `{{2}}`, `{{3}}`
- `{{1}}` = Gast-Name (z.B. "Juan Pérez")
- `{{2}}` = Check-in-Link (z.B. "https://...")
- `{{3}}` = Payment-Link (z.B. "https://...")

---

## Schnell-Checkliste

### Template 1 (AKTUALISIEREN):
- [ ] Meta Business Suite → Message Templates
- [ ] Template `reservation_checkin_invitation` finden
- [ ] Bearbeiten → Neuen Text einfügen
- [ ] Save → Submit for Review

### Templates 2-6 (NEU ERSTELLEN):
- [ ] Create Template
- [ ] Name, Category (`UTILITY`), Language (`Spanish (es)`) ⚠️ **WICHTIG: Spanisch!**
- [ ] Body-Text einfügen
- [ ] Variablen prüfen
- [ ] Save → Submit for Review

---

---

## ENGLISCHE VERSIONEN (English Versions)

Alle Templates sind auch auf Englisch verfügbar. Verwende die englischen Versionen für englischsprachige Gäste.

---

## Template 1 EN: Check-in-Einladung (English)

**Name**: `reservation_checkin_invitation_en`  
**Category**: `UTILITY`  
**Language**: `English (en)` ⚠️ **WICHTIG: Englisch!**

**Body-Text (kopieren):**
```
Hello {{1}},

We are pleased to welcome you to La Familia Hostel!

Since you will arrive after 22:00, you can complete the check-in online now:
{{2}}

Please make the payment in advance:
{{3}}

Please write us briefly once you have completed both the check-in and the payment. Thank you!

We look forward to seeing you tomorrow!
```

**Variablen**: `{{1}}`, `{{2}}`, `{{3}}`
- `{{1}}` = Guest Name (z.B. "John Smith")
- `{{2}}` = Check-in Link (z.B. "https://...")
- `{{3}}` = Payment Link (z.B. "https://...")

---

## Template 2 EN: Check-in-Bestätigung (English)

**Name**: `reservation_checkin_confirmation_en`  
**Category**: `UTILITY`  
**Language**: `English (en)` ⚠️ **WICHTIG: Englisch!**

**Body-Text (kopieren):**
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

**Variablen**: `{{1}}`, `{{2}}`, `{{3}}`, `{{4}}`, `{{5}}`
- `{{1}}` = Guest Name (z.B. "John Smith")
- `{{2}}` = Room Number (z.B. "101")
- `{{3}}` = Room Description (z.B. "Room with balcony")
- `{{4}}` = Door PIN (z.B. "1234")
- `{{5}}` = App Name (z.B. "TTLock")

---

## Template 3 EN: Reservierungsbestätigung (English)

**Name**: `reservation_confirmation_en`  
**Category**: `UTILITY`  
**Language**: `English (en)` ⚠️ **WICHTIG: Englisch!**

**Body-Text (kopieren):**
```
Hello {{1}},

Welcome to La Familia Hostel!

Your reservation has been confirmed:
- Check-in: {{2}}
- Check-out: {{3}}

Please make the payment:
{{4}}

We look forward to seeing you!
```

**Variablen**: `{{1}}`, `{{2}}`, `{{3}}`, `{{4}}`
- `{{1}}` = Guest Name (z.B. "John Smith")
- `{{2}}` = Check-in Date (z.B. "11/13/2025")
- `{{3}}` = Check-out Date (z.B. "11/15/2025")
- `{{4}}` = Payment Link (z.B. "https://...")

---

## Template 4 EN: Check-in-Erinnerung (English)

**Name**: `reservation_checkin_reminder_en`  
**Category**: `UTILITY`  
**Language**: `English (en)` ⚠️ **WICHTIG: Englisch!**

**Body-Text (kopieren):**
```
Hello {{1}},

Reminder: Your check-in is today.

Please complete the check-in online:
{{2}}

If you have already completed it, please write us briefly. Thank you!
```

**Variablen**: `{{1}}`, `{{2}}`
- `{{1}}` = Guest Name (z.B. "John Smith")
- `{{2}}` = Check-in Link (z.B. "https://...")

---

## Template 5 EN: Zahlungserinnerung (English)

**Name**: `reservation_payment_reminder_en`  
**Category**: `UTILITY`  
**Language**: `English (en)` ⚠️ **WICHTIG: Englisch!**

**Body-Text (kopieren):**
```
Hello {{1}},

Reminder: Please complete the payment for your reservation.

Payment link:
{{2}}

If you have already paid, please write us briefly. Thank you!
```

**Variablen**: `{{1}}`, `{{2}}`
- `{{1}}` = Guest Name (z.B. "John Smith")
- `{{2}}` = Payment Link (z.B. "https://...")

---

## Template 6 EN: Allgemeine Erinnerung (English)

**Name**: `reservation_general_reminder_en`  
**Category**: `UTILITY`  
**Language**: `English (en)` ⚠️ **WICHTIG: Englisch!**

**Body-Text (kopieren):**
```
Hello {{1}},

Reminder: Please complete the check-in and payment for your reservation.

Check-in: {{2}}
Payment: {{3}}

Once you have completed both, please write us briefly. Thank you!
```

**Variablen**: `{{1}}`, `{{2}}`, `{{3}}`
- `{{1}}` = Guest Name (z.B. "John Smith")
- `{{2}}` = Check-in Link (z.B. "https://...")
- `{{3}}` = Payment Link (z.B. "https://...")

---

## Schnell-Checkliste für englische Templates

### Templates 1-6 EN (NEU ERSTELLEN):
- [ ] Create Template
- [ ] Name mit `_en` Suffix (z.B. `reservation_checkin_invitation_en`)
- [ ] Category (`UTILITY`)
- [ ] Language (`English (en)`) ⚠️ **WICHTIG: Englisch!**
- [ ] Body-Text einfügen (englische Version)
- [ ] Variablen prüfen
- [ ] Save → Submit for Review

---

**Detaillierte Anleitung**: Siehe `docs/modules/WHATSAPP_TEMPLATES_ALLE_FUER_BEWILLIGUNG.md`


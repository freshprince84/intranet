# WhatsApp Templates - Vollständige Liste für Meta Business Suite

**Datum**: 2025-11-17  
**Status**: 📋 Übersicht aller benötigten Templates

## ⚠️ WICHTIGE REGELN

- **Template-Namen**: Müssen EXAKT mit den Namen im Code übereinstimmen (Kleinbuchstaben, Unterstriche)
- **Category**: `UTILITY` (für Service-Nachrichten)
- **Language**: `Spanish (es)` ⚠️ **WICHTIG: Template-Sprache muss mit der Text-Sprache übereinstimmen!**
  - Wenn Text auf Spanisch → Language: `Spanish (es)`
  - Wenn Text auf Englisch → Language: `English (en)`
- **Variablen**: Keine Leerzeichen in `{{1}}`, `{{2}}`, etc.
- **Genehmigung**: 1-2 Tage Wartezeit

---

## Template 1: Check-in-Einladung ✅ (WIRD VERWENDET)

**Name**: `reservation_checkin_invitation`  
**Category**: `UTILITY`  
**Language**: `Spanish (es)` ⚠️ **WICHTIG: Template-Text ist auf Spanisch, daher muss Language "Spanish (es)" sein!**  
**Status**: ✅ Existiert (muss genehmigt sein)

### Template-Body:

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

### Variablen:
- `{{1}}` = Gast-Name (z.B. "Patrick")
- `{{2}}` = Check-in-Link (z.B. "http://localhost:3000/check-in/12")
- `{{3}}` = Payment-Link (z.B. "https://checkout.bold.co/payment/LNK_...")

### Verwendung im Code:
- **Datei**: `backend/src/controllers/reservationController.ts`
- **Methode**: `createReservation()` - Zeile 317
- **Methode**: `updateGuestContact()` - Zeile 149
- **Datei**: `backend/src/services/whatsappService.ts`
- **Methode**: `sendCheckInInvitation()` - Zeile 553

---

## Template 2: Check-in-Bestätigung (TTLock-Code) ✅ (WIRD VERWENDET)

**Name**: `reservation_checkin_completed`  
**Category**: `UTILITY`  
**Language**: `Spanish (es)` ⚠️ **WICHTIG: Template-Text ist auf Spanisch, daher muss Language "Spanish (es)" sein!**  
**Status**: ✅ Existiert (muss genehmigt sein)  
**Hinweis**: ⚠️ **WICHTIG: Gleicher Name für ES und EN!** (kein `_` am Ende für Englisch)

### Template-Body (Spanisch):

```
Bienvenido,

{{1}}

{{2}}

¡Te deseamos una estancia agradable!
```

### Variablen:
- `{{1}}` = Begrüßung mit Gast-Name (z.B. "Hola Juan,")
- `{{2}}` = Kompletter Text mit Check-in-Bestätigung, Zimmerinfo und PIN (z.B. "¡Tu check-in se ha completado exitosamente! Información de tu habitación: - Habitación: 101 - Descripción: Zimmer mit Balkon Acceso: - PIN de la puerta: 1234 - App: TTLock")

### Beispiel (Spanisch):
```
Bienvenido,

Hola Juan,

¡Tu check-in se ha completado exitosamente! Información de tu habitación: - Habitación: 101 - Descripción: Zimmer mit Balkon Acceso: - PIN de la puerta: 1234 - App: TTLock

¡Te deseamos una estancia agradable!
```

### Template-Body (Englisch):

**Name**: `reservation_checkin_completed` (gleicher Name wie Spanisch!)  
**Language**: `English (en)` ⚠️ **WICHTIG: Template-Text ist auf Englisch, daher muss Language "English (en)" sein!**

```
Welcome,

{{1}}

{{2}}

We wish you a pleasant stay!
```

### Variablen (Englisch):
- `{{1}}` = Begrüßung mit Gast-Name (z.B. "Hello [Gast-Name],")
- `{{2}}` = Kompletter Text mit Check-in-Bestätigung, Zimmerinfo und PIN (z.B. "Your check-in has been completed successfully! Your room information: - Room: [Zimmernummer] - Description: [Zimmerbeschreibung] Access: - Door PIN: [PIN]")

### Beispiel (Englisch):
```
Welcome,

Hello [Gast-Name],

Your check-in has been completed successfully! Your room information: - Room: [Zimmernummer] - Description: [Zimmerbeschreibung] Access: - Door PIN: [PIN]

We wish you a pleasant stay!
```

### Verwendung im Code:
- **Datei**: `backend/src/services/whatsappService.ts`
- **Methode**: `sendCheckInConfirmation()` - Zeile 780
- **Template-Name**: `reservation_checkin_completed` (gleicher Name für ES und EN!)

---

## Template 3: Reservierungsbestätigung (OPTIONAL - NICHT VERWENDET)

**Name**: `reservation_confirmation`  
**Category**: `UTILITY`  
**Language**: `Spanish (es)` ⚠️ **WICHTIG: Template-Text ist auf Spanisch, daher muss Language "Spanish (es)" sein!**  
**Status**: ⏳ Optional (wird aktuell NICHT verwendet)

### Template-Body:

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

### Variablen:
- `{{1}}` = Gast-Name
- `{{2}}` = Check-in Datum
- `{{3}}` = Check-out Datum
- `{{4}}` = Payment-Link

### Hinweis:
- **Wird aktuell NICHT verwendet** - Code verwendet stattdessen `reservation_checkin_invitation`
- Kann später implementiert werden, wenn gewünscht

---

## Template 4: Check-in-Erinnerung (OPTIONAL)

**Name**: `reservation_checkin_reminder`  
**Category**: `UTILITY`  
**Language**: `Spanish (es)`  
**Status**: ⏳ Optional (noch nicht im Code implementiert)

### Template-Body:

```
Hola {{1}},

Recordatorio: Tu check-in es hoy.

Por favor, completa el check-in en línea:
{{2}}

Si ya lo has completado, por favor escríbenos brevemente. ¡Gracias!
```

### Variablen:
- `{{1}}` = Gast-Name
- `{{2}}` = Check-in-Link

---

## Template 5: Zahlungserinnerung (OPTIONAL)

**Name**: `reservation_payment_reminder`  
**Category**: `UTILITY`  
**Language**: `Spanish (es)`  
**Status**: ⏳ Optional (noch nicht im Code implementiert)

### Template-Body:

```
Hola {{1}},

Recordatorio: Por favor, completa el pago de tu reserva.

Link de pago:
{{2}}

Si ya has pagado, por favor escríbenos brevemente. ¡Gracias!
```

### Variablen:
- `{{1}}` = Gast-Name
- `{{2}}` = Payment-Link

---

## Template 6: Allgemeine Erinnerung (OPTIONAL)

**Name**: `reservation_general_reminder`  
**Category**: `UTILITY`  
**Language**: `Spanish (es)`  
**Status**: ⏳ Optional (noch nicht im Code implementiert)

### Template-Body:

```
Hola {{1}},

Recordatorio: Por favor, completa el check-in y el pago de tu reserva.

Check-in: {{2}}
Pago: {{3}}

Una vez completados ambos, por favor escríbenos brevemente. ¡Gracias!
```

### Variablen:
- `{{1}}` = Gast-Name
- `{{2}}` = Check-in-Link
- `{{3}}` = Payment-Link

---

## 🇬🇧 ENGLISCHE TEMPLATES (Optional)

Falls du später englische Templates erstellen möchtest, kannst du separate Templates mit englischen Texten erstellen:

### Beispiel: Englische Check-in-Einladung

**Name**: `reservation_checkin_invitation_` (mit Unterstrich am Ende für Englisch)  
**Category**: `UTILITY`  
**Language**: `English (en)`  
**Status**: ⏳ Optional

**Template-Body:**
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

**Hinweis:**
- Du kannst Templates mit dem **gleichen Namen** in **verschiedenen Sprachen** erstellen
- Oder du verwendest **verschiedene Namen** (z.B. `reservation_checkin_invitation_` für Englisch, `reservation_checkin_invitation` für Spanisch)
- Im Code kannst du dann die Sprache über `WHATSAPP_TEMPLATE_LANGUAGE` steuern oder verschiedene Template-Namen verwenden

---

## 📋 ZUSAMMENFASSUNG

### ✅ ERFORDERLICH (wird im Code verwendet):

1. **`reservation_checkin_invitation`** ✅
   - Wird verwendet bei: Reservierungserstellung, Kontaktaktualisierung, Check-in-Einladung
   - **MUSS genehmigt sein!**

### ✅ ERFORDERLICH (wird im Code verwendet):

2. **`reservation_checkin_completed`** ✅
   - Wird verwendet bei: Check-in-Bestätigung mit TTLock-Code
   - **MUSS genehmigt sein!**
   - ⚠️ **WICHTIG: Gleicher Name für ES und EN!** (kein `_` am Ende)

### ⏳ OPTIONAL (noch nicht im Code implementiert):

3. `reservation_confirmation` - Reservierungsbestätigung (wird aktuell NICHT verwendet)
4. `reservation_checkin_reminder` - Check-in-Erinnerung
5. `reservation_payment_reminder` - Zahlungserinnerung
6. `reservation_general_reminder` - Allgemeine Erinnerung

---

## 🎯 PRIORITÄTEN

### Sofort erforderlich:
1. ✅ **`reservation_checkin_invitation`** - MUSS genehmigt sein (wird aktuell verwendet)

### Sofort erforderlich:
2. ✅ **`reservation_checkin_completed`** - MUSS genehmigt sein (wird aktuell verwendet)
   - ⚠️ **WICHTIG: Gleicher Name für ES und EN!** (kein `_` am Ende)

### Später:
3. Templates 3-6 können später erstellt werden, wenn benötigt

---

## 📝 CHECKLISTE FÜR META BUSINESS SUITE

### Template 1: Check-in-Einladung
- [ ] Gehe zu: https://business.facebook.com
- [ ] WhatsApp Business Account → Message Templates
- [ ] Prüfe ob Template `reservation_checkin_invitation` existiert
- [ ] Prüfe Status: Muss "APPROVED" sein
- [ ] Prüfe Language: Muss "Spanish (es)" sein (weil Text auf Spanisch ist)
- [ ] Prüfe Phone Number ID: Muss mit `852832151250618` übereinstimmen

### Template 2: Check-in-Bestätigung (TTLock-Code)
- [ ] Gehe zu: https://business.facebook.com
- [ ] WhatsApp Business Account → Message Templates
- [ ] Prüfe ob Template `reservation_checkin_completed` existiert (ES)
- [ ] Prüfe ob Template `reservation_checkin_completed` existiert (EN) - **gleicher Name!**
- [ ] Prüfe Status: Muss "APPROVED" sein (beide Sprachen)
- [ ] Prüfe Language ES: Muss "Spanish (es)" sein
- [ ] Prüfe Language EN: Muss "English (en)" sein
- [ ] Prüfe Variablen: `{{1}}`, `{{2}}` (beide Sprachen)
- [ ] Prüfe Phone Number ID: Muss mit `852832151250618` übereinstimmen

---

## ⚠️ WICHTIGE HINWEISE

1. **Template-Namen müssen EXAKT übereinstimmen** (Kleinbuchstaben, Unterstriche)
2. **Template-Sprache muss mit Text-Sprache übereinstimmen**:
   - Spanischer Text → Language: `Spanish (es)`
   - Englischer Text → Language: `English (en)`
3. **Phone Number ID muss übereinstimmen**: `852832151250618`
4. **Template muss genehmigt sein** (Status: APPROVED) bevor es verwendet werden kann
5. **Variablen-Reihenfolge ist wichtig**: `{{1}}`, `{{2}}`, `{{3}}` müssen in der richtigen Reihenfolge sein
6. **Code ist bereits angepasst**: Standard ist jetzt 'es' (Spanisch) für spanische Templates
7. **Für englische Templates**: Setze `WHATSAPP_TEMPLATE_LANGUAGE=en` in `.env` oder verwende separate Template-Namen

---

**Erstellt**: 2025-11-17  
**Version**: 1.0


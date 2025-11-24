# WhatsApp Templates - Alle Templates zur Bewilligung

**Datum**: 2025-01-XX  
**Status**: ⏳ Bereit zur Einreichung in Meta Business Suite

## Wichtige Hinweise

- **Spanische Templates**: Template-Sprache `Spanish (es)`, Template-Name ohne Suffix (z.B. `reservation_checkin_invitation`)
- **Englische Templates**: Template-Sprache `English (en)`, Template-Name mit Unterstrich am Ende (z.B. `reservation_checkin_invitation_`)
- **Category**: `UTILITY` (für Service-Nachrichten)
- **Variablen**: Keine Leerzeichen in `{{1}}`, `{{2}}`, etc.
- **Maximale Zeichen**: 1024 Zeichen im Body

---

## Template 1: Check-in-Einladung (AKTUALISIERT)

**Name**: `reservation_checkin_invitation`  
**Category**: `UTILITY`  
**Language**: `Spanish (es)` ⚠️ **WICHTIG: Spanisch, da Text auf Spanisch ist!**  
**Status**: ⚠️ **MUSS AKTUALISIERT WERDEN** (neue Version mit Aufforderung zur Antwort)

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
- `{{1}}` = Gast-Name (z.B. "Juan Pérez")
- `{{2}}` = Check-in-Link (z.B. "https://...")
- `{{3}}` = Payment-Link (z.B. "https://...")

### Verwendung im Code:
- **Datei**: `backend/src/services/whatsappService.ts`
- **Methode**: `sendCheckInInvitation()`
- **Zeile**: 489-515

---

## Template 2: Check-in-Bestätigung

**Name**: `reservation_checkin_confirmation`  
**Category**: `UTILITY`  
**Language**: `English (en)`  
**Status**: ⏳ Neu erstellen

### Template-Body:

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

### Variablen:
- `{{1}}` = Gast-Name (z.B. "Juan Pérez")
- `{{2}}` = Zimmernummer (z.B. "101")
- `{{3}}` = Zimmerbeschreibung (z.B. "Zimmer mit Balkon")
- `{{4}}` = Tür-PIN (z.B. "1234")
- `{{5}}` = App-Name (z.B. "TTLock")

### Verwendung im Code:
- **Datei**: `backend/src/services/whatsappService.ts`
- **Methode**: `sendCheckInConfirmation()`
- **Zeile**: 529-559

---

## Template 3: Reservierungsbestätigung (Optional)

**Name**: `reservation_confirmation`  
**Category**: `UTILITY`  
**Language**: `English (en)`  
**Status**: ⏳ Neu erstellen (optional)

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
- `{{1}}` = Gast-Name (z.B. "Juan Pérez")
- `{{2}}` = Check-in Datum (z.B. "13/11/2025")
- `{{3}}` = Check-out Datum (z.B. "15/11/2025")
- `{{4}}` = Payment-Link (z.B. "https://...")

### Verwendung im Code:
- **Datei**: `backend/src/controllers/reservationController.ts`
- **Methode**: `createReservation()`
- **Zeile**: 310-317

---

## Template 4: Check-in-Erinnerung

**Name**: `reservation_checkin_reminder`  
**Category**: `UTILITY`  
**Language**: `English (en)`  
**Status**: ⏳ Neu erstellen

### Template-Body:

```
Hola {{1}},

Recordatorio: Tu check-in es hoy.

Por favor, completa el check-in en línea:
{{2}}

Si ya lo has completado, por favor escríbenos brevemente. ¡Gracias!
```

### Variablen:
- `{{1}}` = Gast-Name (z.B. "Juan Pérez")
- `{{2}}` = Check-in-Link (z.B. "https://...")

### Verwendung:
- Für Erinnerungen, wenn Check-in noch nicht abgeschlossen
- Kann später im Code implementiert werden

---

## Template 5: Zahlungserinnerung

**Name**: `reservation_payment_reminder`  
**Category**: `UTILITY`  
**Language**: `English (en)`  
**Status**: ⏳ Neu erstellen

### Template-Body:

```
Hola {{1}},

Recordatorio: Por favor, completa el pago de tu reserva.

Link de pago:
{{2}}

Si ya has pagado, por favor escríbenos brevemente. ¡Gracias!
```

### Variablen:
- `{{1}}` = Gast-Name (z.B. "Juan Pérez")
- `{{2}}` = Payment-Link (z.B. "https://...")

### Verwendung:
- Für Erinnerungen, wenn Zahlung noch nicht abgeschlossen
- Kann später im Code implementiert werden

---

## Template 6: Allgemeine Erinnerung (Optional)

**Name**: `reservation_general_reminder`  
**Category**: `UTILITY`  
**Language**: `English (en)`  
**Status**: ⏳ Neu erstellen (optional)

### Template-Body:

```
Hola {{1}},

Recordatorio: Por favor, completa el check-in y el pago de tu reserva.

Check-in: {{2}}
Pago: {{3}}

Una vez completados ambos, por favor escríbenos brevemente. ¡Gracias!
```

### Variablen:
- `{{1}}` = Gast-Name (z.B. "Juan Pérez")
- `{{2}}` = Check-in-Link (z.B. "https://...")
- `{{3}}` = Payment-Link (z.B. "https://...")

### Verwendung:
- Für allgemeine Erinnerungen
- Kann später im Code implementiert werden

---

## Checkliste für Meta Business Suite

### Vorbereitung:
- [ ] Meta Business Suite geöffnet: https://business.facebook.com
- [ ] WhatsApp Business Account ausgewählt
- [ ] Message Templates Bereich geöffnet

### Template 1: Check-in-Einladung (AKTUALISIEREN):
- [ ] Template `reservation_checkin_invitation` finden
- [ ] Template bearbeiten (oder neue Version erstellen)
- [ ] Neuen Text mit Aufforderung zur Antwort einfügen
- [ ] Variablen prüfen: `{{1}}`, `{{2}}`, `{{3}}`
- [ ] Save → Submit for Review

### Template 2: Check-in-Bestätigung:
- [ ] Create Template klicken
- [ ] Name: `reservation_checkin_confirmation`
- [ ] Category: `UTILITY`
- [ ] Language: `Spanish (es)` ⚠️ **WICHTIG: Spanisch!**
- [ ] Body-Text einfügen
- [ ] Variablen prüfen: `{{1}}`, `{{2}}`, `{{3}}`, `{{4}}`, `{{5}}`
- [ ] Save → Submit for Review

### Template 3: Reservierungsbestätigung (Optional):
- [ ] Create Template klicken
- [ ] Name: `reservation_confirmation`
- [ ] Category: `UTILITY`
- [ ] Language: `Spanish (es)` ⚠️ **WICHTIG: Spanisch!**
- [ ] Body-Text einfügen
- [ ] Variablen prüfen: `{{1}}`, `{{2}}`, `{{3}}`, `{{4}}`
- [ ] Save → Submit for Review

### Template 4: Check-in-Erinnerung:
- [ ] Create Template klicken
- [ ] Name: `reservation_checkin_reminder`
- [ ] Category: `UTILITY`
- [ ] Language: `Spanish (es)` ⚠️ **WICHTIG: Spanisch!**
- [ ] Body-Text einfügen
- [ ] Variablen prüfen: `{{1}}`, `{{2}}`
- [ ] Save → Submit for Review

### Template 5: Zahlungserinnerung:
- [ ] Create Template klicken
- [ ] Name: `reservation_payment_reminder`
- [ ] Category: `UTILITY`
- [ ] Language: `Spanish (es)` ⚠️ **WICHTIG: Spanisch!**
- [ ] Body-Text einfügen
- [ ] Variablen prüfen: `{{1}}`, `{{2}}`
- [ ] Save → Submit for Review

### Template 6: Allgemeine Erinnerung (Optional):
- [ ] Create Template klicken
- [ ] Name: `reservation_general_reminder`
- [ ] Category: `UTILITY`
- [ ] Language: `Spanish (es)` ⚠️ **WICHTIG: Spanisch!**
- [ ] Body-Text einfügen
- [ ] Variablen prüfen: `{{1}}`, `{{2}}`, `{{3}}`
- [ ] Save → Submit for Review

---

## Wichtige Regeln für Template-Erstellung

### Template-Namen:
- ⚠️ **Müssen EXAKT** mit den Namen im Code übereinstimmen
- **Kleinbuchstaben** verwenden
- **Unterstriche** statt Leerzeichen
- Keine Sonderzeichen

### Template-Variablen:
- ⚠️ **Reihenfolge ist wichtig**: `{{1}}`, `{{2}}`, `{{3}}` müssen in der richtigen Reihenfolge sein
- **Keine Leerzeichen**: `{{1}}` ist korrekt, `{{ 1 }}` ist falsch
- **Anzahl muss übereinstimmen**: Code sendet genau so viele Parameter wie im Template definiert

### Template-Sprache:
- ⚠️ **Wichtig**: Template-Sprache muss mit dem Text übereinstimmen!
- **Spanische Templates**: Template-Sprache `Spanish (es)`, Text auf Spanisch
- **Englische Templates**: Template-Sprache `English (en)`, Text auf Englisch
- Code verwendet Standard `'es'` (Spanisch), kann aber später erweitert werden für automatische Sprachauswahl

### Genehmigung:
- ⏳ **1-2 Tage Wartezeit** ist normal
- 📧 **E-Mail-Benachrichtigung** bei Genehmigung/Ablehnung
- 🔄 **Bei Ablehnung**: Fehlermeldung prüfen und Template korrigieren

---

## Englische Versionen (English Versions)

Alle Templates sind auch auf Englisch verfügbar. Die englischen Versionen haben den Suffix `_en` im Namen.

### Template-Namen (Englisch):
- `reservation_checkin_invitation_`
- `reservation_checkin_confirmation_`
- `reservation_confirmation_`
- `reservation_checkin_reminder_en`
- `reservation_payment_reminder_en`
- `reservation_general_reminder_en`

### Verwendung im Code:
Der Code kann automatisch die richtige Sprache wählen, basierend auf:
- Gast-Sprache (falls in Reservierung gespeichert)
- Organisation-Sprache
- Standard: Spanisch (`es`)

**Hinweis**: Code-Anpassungen können später gemacht werden, um automatisch die richtige Template-Version zu wählen.

---

## Nach der Genehmigung

### Code-Anpassungen (falls nötig):

1. **Template 1 aktualisieren**:
   - Code verwendet bereits `reservation_checkin_invitation`
   - Nachrichtentext im Code muss aktualisiert werden (Zeile 495-506)

2. **Template 2 konfigurieren**:
   - Code verwendet bereits `reservation_checkin_confirmation`
   - Keine Änderung nötig

3. **Template 3 konfigurieren** (optional):
   - Code verwendet bereits `reservation_confirmation`
   - Keine Änderung nötig

4. **Templates 4-6** (später implementieren):
   - Können später im Code verwendet werden
   - Für Erinnerungen und Follow-ups

5. **Mehrsprachigkeit** (später implementieren):
   - Code kann erweitert werden, um automatisch die richtige Template-Version zu wählen
   - Basierend auf Gast-Sprache oder Organisation-Sprache

---

## Referenzen

- **Template-Erstellung**: `docs/modules/WHATSAPP_TEMPLATE_ERSTELLUNG_ANLEITUNG.md`
- **Template Quick Start**: `docs/modules/WHATSAPP_TEMPLATE_ERSTELLUNG_QUICK_START.md`
- **24h-Fenster**: `docs/modules/WHATSAPP_24H_FENSTER_NACH_TEMPLATE.md`
- **Code**: `backend/src/services/whatsappService.ts`

---

**Erstellt**: 2025-01-XX  
**Status**: ⏳ Bereit zur Einreichung  
**Version**: 1.0


# LobbyPMS Integration - Frontend Positionen (Seiten & Boxen)

## Übersicht

Dieses Dokument zeigt dir **genau**, wo du jeden Use Case im Frontend siehst - welche Seite, welche Box, welche Buttons.

---

## 📍 **Seite: `/reservations` (Reservierungen-Liste)**

**Route:** `/reservations`  
**Datei:** `frontend/src/pages/ReservationsPage.tsx`  
**Komponente:** `frontend/src/components/reservations/ReservationList.tsx`

### **Was du hier siehst:**

#### **1. Toolbar-Box (oben)**
- **Suchfeld**: Suche nach Gast, E-Mail, Telefon
- **Filter-Button** (Funnel-Icon): Öffnet Filter-Panel
- **Synchronisieren-Button** (Pfeil-Icon): Manuelle Synchronisation mit LobbyPMS
  - Zeile 156-163: Button mit Spinner wenn aktiv

#### **2. Filter-Panel (ausklappbar)**
- **Status-Filter**: Dropdown (Alle, Bestätigt, Eingecheckt, Ausgecheckt, Storniert, Nicht erschienen)
- **Zahlungsstatus-Filter**: Dropdown (Alle, Ausstehend, Bezahlt, Teilweise bezahlt, Erstattet)
- **Filter zurücksetzen**: Link zum Zurücksetzen

#### **3. Reservierungs-Karten (Grid)**
- **ReservationCard** Komponenten in Grid-Layout
- **Jede Karte zeigt:**
  - **Gastname** (groß, fett)
  - **LobbyPMS ID** (klein, grau)
  - **Status-Badge** (farbig: blau=bestätigt, grün=eingecheckt, etc.)
  - **Zahlungsstatus-Badge** (farbig: orange=ausstehend, grün=bezahlt, etc.)
  - **Check-in/Check-out Datum** (Kalender-Icon)
  - **Zimmernummer** (Haus-Icon)
  - **E-Mail** (Brief-Icon)
  - **Telefon** (Telefon-Icon)
  - **Status-Icons** (unten):
    - ✅ **Online Check-in** (grün) - wenn `onlineCheckInCompleted = true`
    - ✅ **SIRE** (blau) - wenn `sireRegistered = true`
    - 💳 **PIN** (lila) - wenn `doorPin` vorhanden

#### **4. Ergebnis-Zähler (unten)**
- "X von Y Reservierungen"

### **Use Cases die du hier siehst:**

✅ **Use Case 1: Check-in-Einladung versendet**
- Siehst in jeder Karte ob Einladung versendet wurde (indirekt über Status)
- **invitationSentAt** wird nicht direkt angezeigt (aber in DB gespeichert)

✅ **Use Case 4: Task-Erstellung**
- Tasks werden automatisch erstellt, aber nicht direkt hier sichtbar
- Siehst nur die Reservierungen

✅ **Use Case 9: Synchronisation**
- **Button "Synchronisieren"** (oben rechts in Toolbar)
- Klick → synchronisiert alle Reservierungen von LobbyPMS

---

## 📍 **Seite: `/reservations/:id` (Reservierungsdetails)**

**Route:** `/reservations/:id` (z.B. `/reservations/1`)  
**Datei:** `frontend/src/components/reservations/ReservationDetails.tsx`

### **Was du hier siehst:**

#### **1. Header (oben)**
- **Zurück-Button** (Pfeil links) → zurück zur Liste
- **"Check-in durchführen"-Button** (grün, rechts) - nur wenn Status = "confirmed"
  - Zeile 131-138: Button erscheint nur wenn `canCheckIn = true`

#### **2. Details-Card (große weiße Box)**
- **Gastname** (groß, fett, oben)

##### **Linke Spalte: "Gast-Informationen"**
- **E-Mail** (Brief-Icon) - `guestEmail`
- **Telefon** (Telefon-Icon) - `guestPhone`
- **Nationalität** (User-Icon) - `guestNationality`

##### **Rechte Spalte: "Reservierungs-Informationen"**
- **Check-in Datum** (Kalender-Icon) - `checkInDate`
- **Check-out Datum** (Kalender-Icon) - `checkOutDate`
- **Zimmer** (Haus-Icon) - `roomNumber` + `roomDescription`
- **Status** (Uhr-Icon) - `status` (Bestätigt, Eingecheckt, etc.)
- **Zahlungsstatus** (Kreditkarten-Icon) - `paymentStatus`

#### **3. "Zusätzliche Informationen"-Box (unten, wenn vorhanden)**
- **Nur sichtbar wenn:** `doorPin` ODER `paymentLink` ODER `sireRegistered` vorhanden

##### **Tür-PIN Box** (lila Hintergrund)
- **Icon:** Schlüssel (KeyIcon)
- **Titel:** "Tür-PIN"
- **PIN:** Große, fetter Text (monospace)
- **App-Name:** Kleiner Text darunter (z.B. "TTLock")
- Zeile 254-269: Zeigt `doorPin` und `doorAppName`

##### **Zahlungslink Box** (blau Hintergrund)
- **Icon:** Kreditkarte (CreditCardIcon)
- **Titel:** "Zahlungslink"
- **Link:** Klickbarer Link zu Bold Payment
- Zeile 271-286: Zeigt `paymentLink`

##### **SIRE-Status Box** (grün Hintergrund)
- **Icon:** Häkchen (CheckCircleIcon)
- **Titel:** "SIRE-Status"
- **Status:** "Registriert" (grün, fett)
- **Datum:** Wann registriert (`sireRegisteredAt`)
- Zeile 288-303: Zeigt `sireRegistered`, `sireRegisteredAt`

#### **4. Check-in-Formular Modal (erscheint bei Klick auf "Check-in durchführen")**
- **Modal** (dunkler Hintergrund, zentriert)
- **Titel:** "Check-in durchführen"
- **Gast-Info:** Name und Check-in-Datum (nur Anzeige)
- **Formular:**
  - **Zimmernummer** (Pflichtfeld, Text-Input)
  - **Zimmerbeschreibung** (Optional, Textarea)
- **Buttons:**
  - **Abbrechen** (links)
  - **Check-in durchführen** (rechts, grün, mit Häkchen-Icon)

### **Use Cases die du hier siehst:**

✅ **Use Case 2: Online-Check-in**
- **NICHT hier** - Gast verwendet öffentliche Route `/check-in/:id`
- Aber: Siehst hier das Ergebnis (Status = "checked_in", `onlineCheckInCompleted = true`)

✅ **Use Case 3: Manueller Check-in**
- **Button "Check-in durchführen"** (oben rechts)
- Klick → Modal öffnet → Formular ausfüllen → Check-in durchführen

✅ **Use Case 5: Zahlungslink**
- **Zahlungslink Box** (blau) zeigt den generierten Link
- Link ist klickbar → führt zu Bold Payment

✅ **Use Case 6: WhatsApp**
- **NICHT direkt sichtbar** - WhatsApp wird automatisch versendet
- Siehst nur indirekt: `invitationSentAt` (nicht angezeigt, aber in DB)

✅ **Use Case 7: SIRE-Registrierung**
- **SIRE-Status Box** (grün) zeigt ob registriert
- Zeigt Registrierungsdatum

✅ **Use Case 8: TTLock Passcode**
- **Tür-PIN Box** (lila) zeigt die PIN
- Zeigt App-Name (TTLock)

---

## 📍 **Seite: `/check-in/:id` (Öffentliches Check-in-Formular für Gast)**

**Route:** `/check-in/:id` (z.B. `/check-in/1`)  
**Datei:** `frontend/src/components/reservations/CheckInForm.tsx`  
**WICHTIG:** Öffentliche Route (kein Login nötig)

### **Was du hier siehst:**

#### **Check-in-Formular (Modal-ähnlich)**
- **Titel:** "Check-in durchführen"
- **Gast-Info:** Name und Check-in-Datum
- **Formular-Felder:**
  - **Zimmernummer** (Pflichtfeld)
  - **Zimmerbeschreibung** (Optional)
  - **SIRE-Daten** (falls nicht vorhanden):
    - Nationalität
    - Passnummer
    - Geburtsdatum
- **Buttons:**
  - **Abbrechen**
  - **Check-in durchführen** (grün)

### **Use Cases die du hier siehst:**

✅ **Use Case 2: Online-Check-in durch Gast**
- **DIESE SEITE** - Gast öffnet Link aus E-Mail/WhatsApp
- Füllt Formular aus → Check-in wird durchgeführt
- Automatisch: SIRE-Registrierung, TTLock PIN, Bestätigung per E-Mail/WhatsApp

---

## 📍 **Seite: `/organizations` → Organisation bearbeiten → Tab "API"**

**Route:** `/organizations` → Organisation klicken → "Bearbeiten" → Tab "API"  
**Datei:** `frontend/src/components/organization/ApiConfigurationTab.tsx`  
**WICHTIG:** Nur sichtbar für Organisationen mit Land = 'CO' (Kolumbien)

### **Was du hier siehst:**

#### **1. LobbyPMS Sektion**
- **API Key** (Secret Input - versteckt/zeigen)
- **Property ID** (Text-Input)
- **Synchronisation aktiviert** (Checkbox)
- **Tasks automatisch erstellen** (Checkbox)
- **Späte Check-in Schwelle** (Text-Input, Format: "22:00")

#### **2. WhatsApp Sektion**
- **Provider** (Dropdown: Twilio / WhatsApp Business API)
- **API Key** (Secret Input)
- **API Secret** (Secret Input)
- **Phone Number ID** (Text-Input)

#### **3. Bold Payment Sektion**
- **API Key** (Secret Input) - "Llave secreta"
- **Merchant ID** (Secret Input) - "Llave de identidad"
- **Environment** (Dropdown: Sandbox / Production)

#### **4. SIRE Sektion**
- **API URL** (Text-Input)
- **API Key** (Secret Input)
- **API Secret** (Secret Input, optional)
- **Aktiviert** (Checkbox)
- **Auto-Registrierung beim Check-in** (Checkbox)
- **Property Code** (Text-Input, optional)

#### **5. TTLock Sektion**
- **Client ID** (Secret Input)
- **Client Secret** (Secret Input)
- **API URL** (Text-Input, Standard: "https://open.ttlock.com")
- **Lock IDs** (Text-Input, komma-separiert)

#### **6. Buttons (unten)**
- **Zurücksetzen** (Button)
- **Speichern** (Button, blau)

### **Use Cases die du hier konfigurierst:**

✅ **Alle Use Cases** - Hier konfigurierst du alle API-Keys und Einstellungen:
- **Use Case 1:** LobbyPMS API Key, Threshold, Channels
- **Use Case 5:** Bold Payment API Key, Merchant ID
- **Use Case 6:** WhatsApp Provider, API Keys
- **Use Case 7:** SIRE API Keys, Auto-Registrierung
- **Use Case 8:** TTLock Client ID/Secret, Lock IDs

---

## 📍 **Seite: `/tasks` (Task-Liste)**

**Route:** `/tasks` (falls Task-System vorhanden)  
**WICHTIG:** Möglicherweise nicht implementiert oder andere Route

### **Was du hier siehst (falls vorhanden):**

#### **Task-Liste**
- **Tasks mit Titel:** "Check-in: {guestName} - {checkInDate}"
- **Status:** open → in_progress → done
- **Verknüpft mit Reservierung** (`reservationId`)

### **Use Cases die du hier siehst:**

✅ **Use Case 4: Automatische Task-Erstellung**
- Siehst Tasks die automatisch für Reservierungen erstellt wurden
- Status ändert sich automatisch bei Check-in

---

## 🎯 **Zusammenfassung: Wo finde ich was?**

| Use Case | Frontend-Seite | Genau wo? |
|----------|---------------|-----------|
| **1. Check-in-Einladung** | `/reservations` | Reservierungs-Karten (Status zeigt ob versendet) |
| **2. Online-Check-in** | `/check-in/:id` | Öffentliches Formular (für Gast) |
| **3. Manueller Check-in** | `/reservations/:id` | Button "Check-in durchführen" (oben rechts) |
| **4. Task-Erstellung** | `/tasks` | Task-Liste (falls vorhanden) |
| **5. Zahlungslink** | `/reservations/:id` | "Zusätzliche Informationen" → Zahlungslink Box (blau) |
| **6. WhatsApp** | `/reservations/:id` | Indirekt (nicht direkt sichtbar, nur in DB) |
| **7. SIRE** | `/reservations/:id` | "Zusätzliche Informationen" → SIRE-Status Box (grün) |
| **8. TTLock PIN** | `/reservations/:id` | "Zusätzliche Informationen" → Tür-PIN Box (lila) |
| **9. Synchronisation** | `/reservations` | Button "Synchronisieren" (oben rechts in Toolbar) |
| **10. Payment-Webhook** | `/reservations/:id` | Zahlungsstatus ändert sich automatisch (pending → paid) |
| **Konfiguration** | `/organizations` → API Tab | Alle API-Keys und Einstellungen |

---

## 🔍 **Detaillierte Box-Beschreibungen**

### **Reservierungs-Karte (ReservationCard)**

**Position:** `/reservations` - Grid-Layout  
**Datei:** `frontend/src/components/reservations/ReservationCard.tsx`

**Box-Struktur:**
```
┌─────────────────────────────────────┐
│ Gastname (fett)          [Status]   │
│ LobbyPMS ID (klein)      [Payment]  │
├─────────────────────────────────────┤
│ 📅 Check-in - Check-out             │
│ 🏠 Zimmer 101                       │
│ ✉️ email@example.com                │
│ 📞 +573001234567                    │
├─────────────────────────────────────┤
│ ✅ Online  ✅ SIRE  💳 PIN          │
└─────────────────────────────────────┘
```

**Status-Badges:**
- **Blau** = Bestätigt (confirmed)
- **Grün** = Eingecheckt (checked_in)
- **Grau** = Ausgecheckt (checked_out)
- **Rot** = Storniert (cancelled)
- **Gelb** = Nicht erschienen (no_show)

**Zahlungsstatus-Badges:**
- **Orange** = Ausstehend (pending)
- **Grün** = Bezahlt (paid)
- **Gelb** = Teilweise bezahlt (partially_paid)
- **Lila** = Erstattet (refunded)

---

### **Reservierungsdetails (ReservationDetails)**

**Position:** `/reservations/:id`  
**Datei:** `frontend/src/components/reservations/ReservationDetails.tsx`

**Box-Struktur:**
```
┌─────────────────────────────────────┐
│ [← Zurück]    [Check-in durchführen]│
├─────────────────────────────────────┤
│ Gastname (groß, fett)               │
├──────────────────┬──────────────────┤
│ Gast-Info        │ Reservierungs-Info│
│ ✉️ E-Mail        │ 📅 Check-in      │
│ 📞 Telefon       │ 📅 Check-out     │
│ 👤 Nationalität  │ 🏠 Zimmer        │
│                  │ 🕐 Status        │
│                  │ 💳 Zahlungsstatus│
├──────────────────┴──────────────────┤
│ Zusätzliche Informationen           │
│ ┌──────────┐ ┌──────────┐ ┌────────┐│
│ │🔑 PIN    │ │💳 Link   │ │✅ SIRE ││
│ │1234      │ │Link...   │ │Registr.││
│ │TTLock    │ │          │ │Datum   ││
│ └──────────┘ └──────────┘ └────────┘│
└─────────────────────────────────────┘
```

**Farben der Info-Boxen:**
- **Lila** = Tür-PIN (`doorPin`)
- **Blau** = Zahlungslink (`paymentLink`)
- **Grün** = SIRE-Status (`sireRegistered`)

---

### **API-Konfiguration (ApiConfigurationTab)**

**Position:** `/organizations` → Organisation → Bearbeiten → Tab "API"  
**Datei:** `frontend/src/components/organization/ApiConfigurationTab.tsx`

**Box-Struktur:**
```
┌─────────────────────────────────────┐
│ 🔑 LobbyPMS                         │
│ API Key: [••••••••] [👁️]           │
│ Property ID: [______]               │
│ ☑ Synchronisation aktiviert        │
│ ☑ Tasks automatisch erstellen       │
│ Späte Check-in Schwelle: [22:00]   │
├─────────────────────────────────────┤
│ 📱 WhatsApp                          │
│ Provider: [Twilio ▼]                │
│ API Key: [••••••••] [👁️]           │
│ API Secret: [••••••••] [👁️]        │
│ Phone Number ID: [______]           │
├─────────────────────────────────────┤
│ 💳 Bold Payment                      │
│ API Key: [••••••••] [👁️]           │
│ Merchant ID: [••••••••] [👁️]        │
│ Environment: [Sandbox ▼]            │
├─────────────────────────────────────┤
│ 🏛️ SIRE                              │
│ API URL: [______]                    │
│ API Key: [••••••••] [👁️]           │
│ ☑ Aktiviert                          │
│ ☑ Auto-Registrierung beim Check-in  │
├─────────────────────────────────────┤
│ 🔐 TTLock                            │
│ Client ID: [••••••••] [👁️]          │
│ Client Secret: [••••••••] [👁️]       │
│ Lock IDs: [lock1, lock2]            │
├─────────────────────────────────────┤
│ [Zurücksetzen]  [Speichern]         │
└─────────────────────────────────────┘
```

---

## 🎨 **Visuelle Hinweise**

### **Icons die du siehst:**
- 📅 **Kalender** = Datum (Check-in, Check-out)
- 🏠 **Haus** = Zimmer
- ✉️ **Brief** = E-Mail
- 📞 **Telefon** = Telefonnummer
- 👤 **User** = Nationalität
- 💳 **Kreditkarte** = Zahlungslink, Zahlungsstatus
- 🔑 **Schlüssel** = Tür-PIN
- ✅ **Häkchen** = Status (SIRE registriert, Online Check-in)
- 🕐 **Uhr** = Status
- 🔄 **Pfeil** = Synchronisieren
- 🔍 **Lupe** = Suche
- 🎛️ **Filter** = Filter

### **Farben:**
- **Blau** = Bestätigt, Zahlungslink, SIRE-Icon
- **Grün** = Eingecheckt, Bezahlt, SIRE-Status, Check-in-Button
- **Orange** = Ausstehend (Zahlung)
- **Lila** = Tür-PIN, Erstattet
- **Rot** = Storniert, Fehler
- **Gelb** = Nicht erschienen, Teilweise bezahlt

---

## 📝 **Quick Reference**

**Hauptseiten:**
1. `/reservations` - Liste aller Reservierungen
2. `/reservations/:id` - Details einer Reservierung
3. `/check-in/:id` - Öffentliches Check-in-Formular (für Gast)
4. `/organizations` → API Tab - Konfiguration aller APIs

**Wichtigste Buttons:**
- **"Synchronisieren"** (oben rechts in `/reservations`)
- **"Check-in durchführen"** (oben rechts in `/reservations/:id`)
- **"Speichern"** (unten in API Tab)

**Wichtigste Boxen:**
- **Reservierungs-Karten** (Grid in `/reservations`)
- **Details-Card** (große Box in `/reservations/:id`)
- **Zusätzliche Informationen** (unten in Details, wenn vorhanden)
- **API-Konfiguration** (Tab in Organisation bearbeiten)



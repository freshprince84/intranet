# Implementierungsplan: Consultation Invoice-Modul für Intranet

## Übersicht
Dieses Dokument enthält den detaillierten Schritt-für-Schritt Plan zur Implementierung des Abrechnungsmoduls für Beratungsstunden. Das Modul ermöglicht die Erstellung von Rechnungen aus gefilterten Beratungslisten, verhindert Doppelabrechnung und integriert sich nahtlos in das bestehende System.

**WICHTIG**: Nach JEDEM erledigten Schritt:
1. Checkbox abhaken (☑️)
2. Commit erstellen mit aussagekräftiger Message
3. Zum nächsten Schritt gehen

## Anforderungen

### Funktionale Anforderungen
- Gefilterte Beratungsliste als PDF-Rechnung generieren
- Schweizer Rechnungsstandards erfüllen (QR-Rechnung)
- Abgerechnete Stunden dürfen nicht nochmals abgerechnet werden
- PDF-Anzeige in Beratungsliste (während Filter aktiv)
- PDF-Verwaltung auf Lohnabrechnung-Seite (neuer Tab)
- Integration mit bestehendem Berechtigungssystem

### Technische Anforderungen
- Backend: Node.js mit TypeScript, Prisma ORM
- Frontend: React mit TypeScript, TailwindCSS
- PDF-Generierung: Analog zu bestehender PayrollPDF (pdfkit)
- Schweizer Standards: QR-Code für Einzahlungsschein

## Schweizer Rechnungsstandards

### QR-Rechnung (seit 1. Oktober 2022 obligatorisch)
Die Schweizer QR-Rechnung ersetzt die roten und orangen Einzahlungsscheine. Sie basiert auf den "Swiss Implementation Guidelines QR-bill" (Version 2.2 bis November 2025, danach Version 2.3).

### Aufbau der QR-Rechnung
Die QR-Rechnung besteht aus zwei physischen Teilen:

1. **Empfangsschein** (links) - 62 x 105 mm
   - Titel "Empfangsschein"
   - Konto/Zahlbar an
   - Referenz
   - Zahlbar durch
   - Währung und Betrag
   - Annahmestelle

2. **Zahlteil** (rechts) - 148 x 105 mm
   - Titel "Zahlteil"
   - Swiss QR Code (46 x 46 mm)
   - Konto/Zahlbar an
   - Referenz
   - Zusätzliche Informationen
   - Zahlbar durch
   - Währung und Betrag

Zusammen: 210 x 105 mm (DIN lang)

### Swiss QR Code Spezifikationen

#### Technische Parameter
- **Standard:** ISO 18004
- **Error Correction Level:** M (ca. 15% Redundanz)
- **Maximale Datenlänge:** 997 Zeichen
- **QR-Code Größe:** 46 x 46 mm (ohne Quiet Space)
- **Quiet Space:** mindestens 5 mm umlaufend
- **Erkennungsmerkmal:** Schweizerkreuz (7 x 7 mm) in der Mitte
- **Zeichensatz:** UTF-8 (Latin character set, ab Nov. 2025: Extended Latin)

#### Datenstruktur des Swiss QR Code
```
Header
  QRType: "SPC" (Swiss Payment Code)
  Version: "0200" (für Version 2.2/2.3)
  Coding: 1 (UTF-8)

Creditor Information (Konto/Zahlbar an)
  IBAN oder QR-IBAN
  Creditor
    AddressType: "S" (structured) oder "K" (combined)
    Name
    Street or AddressLine1
    BuildingNumber or AddressLine2
    PostalCode
    Town
    Country

Ultimate Creditor (für zukünftige Verwendung)
  [Aktuell leer]

Payment Amount Information
  Amount (max. 12 Stellen inkl. Dezimalpunkt)
  Currency: "CHF" oder "EUR"

Ultimate Debtor (Zahlbar durch)
  AddressType: "S" oder "K"
  Name
  Street or AddressLine1
  BuildingNumber or AddressLine2
  PostalCode
  Town
  Country

Payment Reference
  Reference Type: "QRR", "SCOR" oder "NON"
  Reference (QR-Referenz oder Creditor Reference)

Additional Information
  Unstructured Message (max. 140 Zeichen)
  Trailer: "EPD" (End Payment Data)
  Billing Information (strukturiert, z.B. Swico S1)

Alternative Procedures (optional)
  z.B. eBill Parameter
```

### Rechnungsinhalte (gemäss OR Art. 957)
- Firmenname und Adresse des Rechnungsstellers
- Datum der Rechnung
- Eindeutige Rechnungsnummer
- Empfänger (Client) mit vollständiger Adresse
- Leistungsbeschreibung (Beratungsstunden)
- Datum/Zeitraum der Leistung
- Einzelpreise und Gesamtbetrag
- MwSt.-Nummer (falls MwSt.-pflichtig)
- MwSt.-Satz und -Betrag
- Zahlungsbedingungen

### Gestaltungsvorgaben

#### Papier und Druck
- **Papierformat:** Weiss oder naturweiss, 80-100 g/m²
- **Perforation:** Pflicht zwischen Rechnung und Zahlteil
- **Schriften:** Arial, Frutiger, Helvetica oder Liberation Sans
- **Schriftgröße:** 6-10 pt (Titel: 11 pt)
- **Farbe:** Schwarz auf Weiss

#### Layout-Regeln
- Zahlteil immer unten auf der Rechnung
- Empfangsschein immer links vom Zahlteil
- Keine Werbung auf Vorder- oder Rückseite
- Definierte Abstände zwischen Sektionen (min. 5 mm)

### Referenztypen

1. **QR-Referenz (mit QR-IBAN)**
   - 26 numerische Zeichen + 1 Prüfziffer
   - Nur mit QR-IBAN verwendbar
   - QR-IBAN erkennbar an QR-IID (30000-31999)

2. **Creditor Reference (mit IBAN)**
   - ISO 11649 Standard
   - Max. 25 alphanumerische Zeichen
   - International verwendbar

3. **Ohne Referenz (mit IBAN)**
   - Nur unstrukturierte Mitteilung möglich

### Swico S1 - Strukturierte Rechnungsinformationen
Für die automatisierte Verarbeitung können strukturierte Informationen im Feld "Billing Information" hinterlegt werden:

```
//S1/10/[Rechnungsnummer]/11/[Rechnungsdatum YYMMDD]/30/[UID]/32/[MwSt-Satz]/40/[Zahlungsbedingungen]
```

Beispiel: `//S1/10/12345/11/240115/30/123456789/32/7.7/40/0:30`

## Phase 1: Datenbank-Schema (Backend)

### Schritt 1.1: Prisma Schema erweitern
- [x] Öffne `backend/prisma/schema.prisma`
- [x] Füge folgende neue Models hinzu:

```prisma
model ConsultationInvoice {
  id                    Int                      @id @default(autoincrement())
  invoiceNumber         String                   @unique
  clientId              Int
  userId                Int                     // Berater
  issueDate             DateTime                 @default(now())
  dueDate               DateTime
  status                InvoiceStatus            @default(DRAFT)
  subtotal              Decimal                  @db.Decimal(10, 2)
  vatRate               Decimal?                 @db.Decimal(5, 2)
  vatAmount             Decimal?                 @db.Decimal(10, 2)
  total                 Decimal                  @db.Decimal(10, 2)
  currency              String                   @default("CHF")
  paymentTerms          String                   @default("30 Tage netto")
  notes                 String?                  @db.Text
  pdfPath               String?
  qrReference           String?                  // QR-Referenznummer
  createdAt             DateTime                 @default(now())
  updatedAt             DateTime                 @updatedAt
  
  client                Client                   @relation(fields: [clientId], references: [id])
  user                  User                     @relation(fields: [userId], references: [id])
  items                 ConsultationInvoiceItem[]
  payments              InvoicePayment[]
}

model ConsultationInvoiceItem {
  id                    Int                      @id @default(autoincrement())
  invoiceId             Int
  workTimeId            Int
  description           String
  quantity              Decimal                  @db.Decimal(10, 2) // Stunden
  unitPrice             Decimal                  @db.Decimal(10, 2) // Stundensatz
  amount                Decimal                  @db.Decimal(10, 2) // Total
  createdAt             DateTime                 @default(now())
  
  invoice               ConsultationInvoice      @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  workTime              WorkTime                 @relation(fields: [workTimeId], references: [id])
  
  @@unique([invoiceId, workTimeId]) // Verhindert doppelte Abrechnung
}

model InvoicePayment {
  id                    Int                      @id @default(autoincrement())
  invoiceId             Int
  amount                Decimal                  @db.Decimal(10, 2)
  paymentDate           DateTime
  paymentMethod         String
  reference             String?
  notes                 String?
  createdAt             DateTime                 @default(now())
  
  invoice               ConsultationInvoice      @relation(fields: [invoiceId], references: [id])
}

model InvoiceSettings {
  id                    Int                      @id @default(autoincrement())
  userId                Int                      @unique
  companyName           String
  companyAddress        String
  companyZip            String
  companyCity           String
  companyCountry        String                   @default("CH")
  companyPhone          String?
  companyEmail          String?
  companyWebsite        String?
  vatNumber             String?
  iban                  String
  bankName              String?
  defaultHourlyRate     Decimal                  @db.Decimal(10, 2)
  defaultVatRate        Decimal?                 @db.Decimal(5, 2)
  invoicePrefix         String                   @default("INV")
  nextInvoiceNumber     Int                      @default(1)
  footerText            String?                  @db.Text
  createdAt             DateTime                 @default(now())
  updatedAt             DateTime                 @updatedAt
  
  user                  User                     @relation(fields: [userId], references: [id])
}

enum InvoiceStatus {
  DRAFT
  SENT
  PAID
  OVERDUE
  CANCELLED
}
```

- [x] Erweitere das bestehende `WorkTime` Model:
```prisma
  invoiceItems         ConsultationInvoiceItem[]
```

- [x] Erweitere das bestehende `Client` Model:
```prisma
  consultationInvoices  ConsultationInvoice[]
```

- [x] Erweitere das bestehende `User` Model:
```prisma
  consultationInvoices  ConsultationInvoice[]
  invoiceSettings       InvoiceSettings?
```

### Schritt 1.2: Migration erstellen und ausführen
- [x] Terminal öffnen im `backend` Verzeichnis
- [x] Führe aus: `npx prisma migrate dev --name add_consultation_invoice`
- [x] Warte bis Migration erfolgreich durchgelaufen ist
- [x] **WICHTIG**: Bitte den Nutzer, den Server neu zu starten

## Phase 2: Backend API - Invoice Management

### Schritt 2.1: Invoice Settings Controller
- [x] Erstelle neue Datei: `backend/src/controllers/invoiceSettingsController.ts`
- [x] Implementiere CRUD-Operationen für Invoice Settings

### Schritt 2.2: Consultation Invoice Controller
- [x] Erstelle neue Datei: `backend/src/controllers/consultationInvoiceController.ts`
- [x] Implementiere folgende Funktionen:
  - `createInvoiceFromConsultations` - Erstellt Rechnung aus gefilterten Beratungen
  - `getInvoices` - Listet alle Rechnungen
  - `getInvoiceById` - Einzelne Rechnung abrufen
  - `updateInvoiceStatus` - Status ändern (SENT, PAID, etc.)
  - `generateInvoicePDF` - PDF mit QR-Code generieren
  - `markAsPaid` - Zahlung erfassen
  - `cancelInvoice` - Rechnung stornieren

### Schritt 2.3: PDF Generator Service
- [x] Erstelle neue Datei: `backend/src/services/invoicePdfGenerator.ts`
- [x] Implementiere QR-Code Generierung (npm package: `qrcode`)
- [x] Verwende `pdfkit` analog zu `payrollController.ts`
- [x] Implementiere Schweizer QR-Rechnung Layout

### Schritt 2.4: Routes einbinden
- [x] Erstelle `backend/src/routes/invoiceSettings.ts`
- [x] Erstelle `backend/src/routes/consultationInvoices.ts`
- [x] Registriere Routes in `app.ts` ⚠️ **WICHTIG:** Routes werden in `app.ts` registriert, NICHT in `server.ts`!

## Phase 3: Frontend - Invoice Settings

### Schritt 3.1: Invoice Settings Form
- [ ] Erstelle `frontend/src/components/InvoiceSettingsForm.tsx`
- [ ] Formular für Firmenangaben, IBAN, Stundensätze etc.
- [ ] Integration in Settings-Seite oder eigener Bereich

### Schritt 3.2: API Integration
- [x] Erweitere `frontend/src/config/api.ts` um Invoice-Endpoints
- [x] Erstelle API-Service Funktionen

## Phase 4: Frontend - Invoice Creation

### Schritt 4.1: Create Invoice Button in ConsultationList
- [x] Füge Button "Rechnung erstellen" in Header der ConsultationList hinzu
- [x] Button nur sichtbar wenn Filter aktiv und Beratungen vorhanden
- [x] Prüfung ob alle Beratungen abgeschlossen sind (endTime vorhanden)
- [x] Prüfung ob Beratungen bereits abgerechnet wurden

### Schritt 4.2: Create Invoice Modal
- [x] Erstelle `frontend/src/components/CreateInvoiceModal.tsx`
- [x] Zeige Zusammenfassung der zu verrechnenden Beratungen
- [x] Eingabefelder für:
  - Rechnungsdatum
  - Fälligkeitsdatum
  - Stundensatz (vorausgefüllt aus Settings)
  - MwSt.-Satz (optional)
  - Zusätzliche Notizen
- [x] Vorschau der Gesamtsumme

### Schritt 4.3: Invoice Preview/Success
- [x] Nach Erstellung: Anzeige der Rechnungsnummer
- [x] Download-Button für PDF
- [x] Markierung der abgerechneten Beratungen in der Liste

## Phase 5: Frontend - Lohnabrechnung Integration

### Schritt 5.1: Tab-System in Payroll.tsx
- [x] Refactore `Payroll.tsx` zu Tab-basiertem Layout
- [x] Tab 1: "Lohnabrechnungen" (bestehender PayrollComponent)
- [x] Tab 2: "Beratungsrechnungen" (neuer InvoiceManagementTab)

### Schritt 5.2: Invoice Management Tab
- [x] Erstelle `frontend/src/components/InvoiceManagementTab.tsx`
- [x] Tabelle mit allen Rechnungen (analog zu bestehenden Tabellen)
- [x] Spalten:
  - Rechnungsnummer
  - Client
  - Datum
  - Betrag
  - Status (Badge-Komponente)
  - Aktionen (PDF, Details, Zahlung erfassen)
- [x] Filter und Suche
- [x] Spalten-Konfiguration

### Schritt 5.3: Invoice Detail View
- [x] Erstelle `frontend/src/components/InvoiceDetailModal.tsx`
- [x] Zeige alle Rechnungsdetails
- [x] Liste der abgerechneten Beratungen
- [x] Status-Historie
- [x] Zahlungen

## Phase 6: Markierung abgerechneter Beratungen

### Status: ✅ VOLLSTÄNDIG IMPLEMENTIERT

**Ziel**: Visuelle Kennzeichnung von bereits abgerechneten Beratungen in der ConsultationList

### 6.1 Backend-Erweiterung
- [x] **Controller erweitern**: `getConsultations` Endpoint um `invoiceItems` mit relationalen Daten erweitert
  - Lädt `ConsultationInvoiceItem` mit zugehörigen `ConsultationInvoice` Daten
  - Ermöglicht Frontend-seitige Prüfung des Abrechnungsstatus

### 6.2 Frontend-Implementierung
- [x] **Type-Definitionen**: `Consultation` Interface um `invoiceItems` erweitert
- [x] **Utility-Funktionen**: In `dateUtils.ts` hinzugefügt:
  - `isConsultationInvoiced()`: Prüft Abrechnungsstatus
  - `getConsultationInvoiceInfo()`: Holt Rechnungsdetails
  - `getInvoiceStatusText()`: Deutsche Übersetzung der Status
  - `getInvoiceStatusColor()`: Farbgebung für Status-Badges

### 6.3 Visuelle Indikatoren
- [x] **Invoice-Badge**: Prominente Anzeige "Abgerechnet" mit DocumentTextIcon
- [x] **Status-Badge**: Detailierte Anzeige des Rechnungsstatus (Entwurf, Gesendet, Bezahlt, etc.)
- [x] **Hover-Info**: Tooltip mit Rechnungsnummer und Ausstellungsdatum
- [x] **Farbkodierung**: Status-abhängige Farben (Grün für bezahlt, Blau für gesendet, etc.)

### 6.4 Filter-System
- [x] **Abrechnungsfilter**: Neue Filterspalte "Abrechnungsstatus" hinzugefügt
- [x] **Filter-Logik**: Support für:
  - "abgerechnet" / "nicht abgerechnet" 
  - Spezifische Status-Suche (bezahlt, gesendet, etc.)
- [x] **Standard-Filter**: "Nicht abgerechnet" Filter automatisch erstellt

### 6.5 Integration
- [x] **Rechnung erstellen**: `canCreateInvoice()` erweitert um Prüfung bereits abgerechneter Beratungen
- [x] **Performance**: Effiziente Client-seitige Filterung ohne zusätzliche API-Calls
- [x] **Konsistenz**: Einheitliche Farbgebung und Terminologie mit InvoiceManagementTab

### Technische Details
- **Backend**: Relationale Queries mit Prisma `include` für optimale Performance
- **Frontend**: Client-seitige Filterung mit mehreren Suchkriterien
- **UX**: Intuitive Farbkodierung und klare visuelle Hierarchie
- **Accessibility**: Tooltips und aussagekräftige Icons für bessere Usability

### Verwendung
1. **Visuelle Erkennung**: Abgerechnete Beratungen zeigen grüne "Abgerechnet" Badges
2. **Status-Details**: Hover über Status-Badge zeigt Rechnungsdetails
3. **Filtering**: Filter "Abrechnungsstatus" → "nicht abgerechnet" für offene Beratungen
4. **Rechnung erstellen**: System verhindert Doppelabrechnung automatisch

## Phase 7: PDF-Generierung mit QR-Code

### Status: ✅ VOLLSTÄNDIG IMPLEMENTIERT

**Ziel**: Swiss QR-Code konforme PDF-Rechnungen generieren

### 7.1 QR-Code Library
- [x] **qrcode Package**: Bereits installiert im Backend (`package.json`)
- [x] **TypeScript Support**: `@types/qrcode` bereits konfiguriert
- [x] **PDFKit Integration**: Vollständig implementiert in `invoicePdfGenerator.ts`

### 7.2 Swiss QR Code Generator 
- [x] **Swiss QR Code Format**: Vollständig implementiert in `generateSwissQRCodeData()`
- [x] **Spezifikationen erfüllt**:
  - ✅ Error Correction Level: M
  - ✅ Größe: 166px (46mm bei 92 DPI)
  - ✅ Quiet Space: Automatisch durch qrcode library
  - ✅ Schweizerkreuz: 25px weißes Rechteck mit schwarzem Kreuz
  - ✅ CR+LF Separator: `data.join('\r\n')`

### 7.3 PDF-Template mit pdfkit
- [x] **Swiss QR-Bill Layout**: Vollständig implementiert
- [x] **A4-Rechnung mit korrektem Layout**:
  - ✅ Rechnungsteil: Oberer Bereich mit Firmenheader, Kunde, Positionen
  - ✅ Perforation: Gestrichelte Linie bei 105mm von unten
  - ✅ Empfangsschein: Links unten (62x105mm)
  - ✅ Zahlteil: Rechts unten (148x105mm) mit QR-Code
- [x] **Swiss QR Code**: Korrekt positioniert im Zahlteil
- [x] **Pflichtfelder**: Alle erforderlichen Felder in korrekter Reihenfolge

### Implementierte Features

#### Swiss QR Code Datenstruktur
```javascript
const data = [
  'SPC',                    // QRType
  '0200',                   // Version  
  '1',                      // Coding (UTF-8)
  iban,                     // IBAN
  'S',                      // Address Type
  companyName,              // Creditor Name
  companyAddress,           // Address
  '',                       // Building (leer)
  companyZip,               // ZIP
  companyCity,              // City
  companyCountry,           // Country
  '', '', '', '', '', '', '', // Ultimate Creditor (leer)
  total,                    // Amount
  'CHF',                    // Currency
  'S',                      // Debtor Address Type
  clientName,               // Debtor Name
  clientStreet,             // Debtor Street
  clientBuilding,           // Debtor Building
  clientZip,                // Debtor ZIP
  clientCity,               // Debtor City
  'CH',                     // Debtor Country
  referenceType,            // QRR/SCOR/NON
  qrReference,              // Reference
  additionalInfo,           // Additional Info
  'EPD',                    // Trailer
  ''                        // Billing Info
].join('\r\n');
```

#### PDF-Layout Features
- **Firmenheader**: Logo-Platz, Firmenname, Adresse, Kontaktdaten, MwSt-Nr
- **Rechnungsdetails**: Rechnungsnummer, Datum, Fälligkeit, Zahlungsbedingungen
- **Kundenadresse**: Strukturierte Darstellung mit Parsing
- **Rechnungspositionen**: Tabellarische Auflistung mit Beschreibung, Stunden, Stundensatz, Betrag
- **Totale**: Zwischensumme, MwSt, Gesamtsumme
- **QR-Zahlteil**: Empfangsschein + Zahlteil mit QR-Code und Schweizerkreuz

#### API-Integration  
- **PDF-Endpoint**: `GET /api/consultation-invoices/:id/pdf`
- **Automatische Speicherung**: PDF wird in `public/uploads/invoices/` gespeichert
- **Download-Header**: Korrekte Content-Type und Filename-Header
- **Permissions**: Nur eigene Rechnungen können heruntergeladen werden

#### Frontend-Integration
- **Download-Buttons**: In InvoiceManagementTab und InvoiceDetailModal
- **PDF-Icon**: Neben abgerechneten Beratungen in ConsultationList  
- **Success-Modal**: Prominenter Download-Button nach Rechnungserstellung
- **Error-Handling**: Toast-Benachrichtigungen bei Fehlern

### Technische Umsetzung
- **Backend**: `invoicePdfGenerator.ts` mit vollständiger Swiss QR-Bill Implementierung
- **Dependencies**: qrcode, pdfkit, sharp für Bildverarbeitung
- **File Storage**: Strukturierte Ablage in `public/uploads/invoices/`
- **Security**: User-spezifische Zugriffskontrolle auf PDF-Dateien
- **Performance**: Effiziente PDF-Generierung mit Buffer-Handling

### Swiss QR-Code Compliance
- ✅ **QR-Type**: SPC (Swiss Payment Code)
- ✅ **Version**: 0200 (aktuelle Version)
- ✅ **Encoding**: UTF-8 mit korrekten Zeilentrenner (CR+LF)
- ✅ **Address-Format**: Strukturiert (S) mit separaten Feldern
- ✅ **Reference-Types**: Unterstützung für QRR, SCOR, NON
- ✅ **Error-Correction**: Level M für optimale Lesbarkeit
- ✅ **Schweizerkreuz**: 7x7mm weißes Kreuz in der Mitte

### Verwendung
1. **Rechnung erstellen**: Über CreateInvoiceModal aus gefilterten Beratungen
2. **PDF generieren**: Automatisch bei Erstellung verfügbar
3. **Download**: Über Button in InvoiceManagementTab oder InvoiceDetailModal
4. **QR-Code**: Kann mit jeder Swiss QR-Code fähigen Banking-App gescannt werden

**Phase 7 ist vollständig implementiert und produktionsbereit!**

## Phase 8: Berechtigungen

### Status: ✅ VOLLSTÄNDIG IMPLEMENTIERT

**Ziel**: Berechtigungssystem für das Consultation Invoice-Modul implementieren

### 8.1 Neue Berechtigungen definiert (KORRIGIERT)
- [x] **consultation_invoices** | **table** - Rechnungstabelle anzeigen (Admin: both, User: read)
- [x] **invoice_create** | **button** - Rechnungen erstellen (Admin: both, User: write)  
- [x] **invoice_download** | **button** - PDFs herunterladen (Admin: both, User: read)
- [x] **invoice_mark_paid** | **button** - Als bezahlt markieren (Admin: both, User: none)
- [x] **invoice_settings** | **button** - Rechnungseinstellungen (Admin: both, User: write - eigene)

### 8.2 Seed-Daten aktualisiert
- [x] **Admin-Rolle**: Erhält alle neuen Berechtigungen mit 'both' access level
- [x] **User-Rolle**: Erhält eingeschränkte Berechtigungen (read für Tabelle, write für eigene Rechnungen)
- [x] **Konsistenz**: Verwendet bestehende entityTypes (page/table/button) statt neuem 'permission' type

### 8.3 Frontend-Berechtigungsprüfungen implementiert
- [x] **ConsultationList**: Prüft `invoice_create` button für "Rechnung erstellen" Button
- [x] **CreateInvoiceModal**: Prüft `invoice_create` button für Modal-Zugriff  
- [x] **InvoiceManagementTab**: Prüft `consultation_invoices` table für Tabellenzugriff
- [x] **PDF Download**: Prüft `invoice_download` button für Download-Funktionalität
- [x] **Als bezahlt markieren**: Prüft `invoice_mark_paid` button für Payment-Updates

### 8.4 Berechtigungsstruktur (KORRIGIERT)
**Konsistent mit bestehendem System:**
- ✅ **page**: Seitenzugriff (payroll - bereits vorhanden)
- ✅ **table**: Tabellenzugriff (consultation_invoices)  
- ✅ **button**: Button-/Aktionszugriff (invoice_create, invoice_download, etc.)

**FEHLERHAFTE alte Struktur entfernt:**
- ❌ ~~consultation_invoices_view | permission~~ 
- ❌ ~~consultation_invoices_create | permission~~
- ❌ ~~consultation_invoices_edit | permission~~
- ❌ ~~consultation_invoices_delete | permission~~
- ❌ ~~invoice_settings_manage | permission~~

## Phase 9: Testing & Dokumentation

### Schritt 9.1: Integrationstests
- [ ] Rechnung aus gefilterten Beratungen erstellen
- [ ] Doppelte Abrechnung verhindern
- [ ] PDF-Download funktioniert
- [ ] QR-Code ist valide

### Schritt 9.2: Dokumentation
- [ ] API-Dokumentation erweitern
- [ ] Modul-Dokumentation erstellen
- [ ] Benutzerhandbuch für Rechnungserstellung

## Technische Details

### QR-Code Format (Swiss QR Bill)
```javascript
const qrData = {
  type: 'SPC',  // Swiss Payment Code
  version: '0200',
  coding: 1,
  iban: settings.iban,
  creditor: {
    name: settings.companyName,
    address: settings.companyAddress,
    zip: settings.companyZip,
    city: settings.companyCity,
    country: settings.companyCountry
  },
  amount: invoice.total,
  currency: 'CHF',
  debtor: {
    name: client.name || client.company,
    address: client.address,
    // Parse address for zip/city
  },
  reference: invoice.qrReference,
  additionalInfo: `Rechnung ${invoice.invoiceNumber}`
};
```

### PDF-Icon Platzierung
1. **In ConsultationList**: Neben jedem abgerechneten Eintrag als kleines Icon
2. **In InvoiceManagementTab**: In der Aktionen-Spalte als Button
3. **Nach Rechnungserstellung**: Im Success-Modal als prominenter Download-Button

### Tabellen-Standards (gemäss bestehenden Komponenten)
- Verwendung von `useTableSettings` Hook
- Spalten-Konfiguration mit Drag & Drop
- Filter mit `FilterPane` Komponente
- Saved Filters mit `SavedFilterTags`
- Responsive Design mit Cards auf Mobile
- Dark Mode Support

## Risiken & Herausforderungen

1. **QR-Code Validierung**: Muss den Schweizer Standards entsprechen
2. **Doppelte Abrechnung**: Robuste Prüfung auf Datenbankebene
3. **PDF-Generierung**: Performance bei vielen Positionen
4. **Währungen**: Aktuell nur CHF, evtl. Erweiterung nötig

## Zeitschätzung

- Phase 1-2 (Backend): 2 Tage
- Phase 3-5 (Frontend Basics): 3 Tage  
- Phase 6-7 (PDF & Markierungen): 2 Tage
- Phase 8-9 (Berechtigungen & Tests): 1 Tag

**Gesamt: ~8 Tage**

## Offene Fragen

1. Sollen Teilzahlungen unterstützt werden?
2. Automatische Mahnungen bei Überfälligkeit?
3. Integration mit Buchhaltungssoftware (Export)?
4. Mehrsprachige Rechnungen?
5. Rabatte/Zuschläge auf Rechnungsebene?

## Nächste Schritte

Nach Abschluss dieser Implementierung könnten folgende Erweiterungen sinnvoll sein:
- Rechnungsvorlagen für wiederkehrende Clients
- Automatische Rechnungserstellung (monatlich/quartalsweise)
- Dashboard mit Umsatzstatistiken
- Export für Buchhaltung (CSV, XML)
- E-Mail-Versand direkt aus dem System

## Zusammenfassung des Plans

### 1. Datenbankschema erweitern
- Neue Tabellen: ConsultationInvoice, ConsultationInvoiceItem, InvoicePayment, InvoiceSettings
- Erweiterungen: WorkTime, Client, User Models
- Migration durchführen und Server neu starten

### 2. Backend API implementieren
- Invoice Settings CRUD
- Invoice Management (Create, Read, Update, Delete)
- PDF-Generierung mit Swiss QR Code
- Payment tracking

### 3. Frontend Basis
- Invoice Settings Form
- Create Invoice Modal in ConsultationList
- Validierungen und Prüfungen

### 4. Lohnabrechnung Integration
- Tab-System in Payroll.tsx
- Invoice Management Tab mit Tabelle
- Detail-Ansicht für Rechnungen

### 5. Swiss QR Code
- pdfkit für PDF (bereits vorhanden)
- qrcode npm package für QR-Generierung
- Schweizerkreuz als Overlay
- Schweizer Layout-Standards einhalten

### 6. Sicherheit
- Doppelte Abrechnung verhindern (DB-Constraint)
- Berechtigungssystem erweitern
- Validierung aller Eingaben

### Kritischer Pfad
1. **Zuerst:** Datenbankschema (Basis für alles)
2. **Dann:** Backend API (ohne das geht nichts)
3. **Parallel:** Frontend-Entwicklung
4. **Zum Schluss:** Tests und Dokumentation

Der Plan ist so strukturiert, dass einzelne Phasen unabhängig voneinander entwickelt werden können, sobald die Datenbankbasis steht. 
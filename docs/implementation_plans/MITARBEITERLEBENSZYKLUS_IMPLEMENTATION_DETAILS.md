# MITARBEITERLEBENSZYKLUS - Implementierungsdetails

**Erstellt am**: 2025-01-XX  
**Stand**: Nach Implementierung von Template- und Signatur-System

---

## 📋 Übersicht

Dieses Dokument beschreibt die technischen Details der implementierten Features für das Mitarbeiterlebenszyklus-System, insbesondere:

1. **Template-System** - Upload, Verwaltung und Auswahl von PDF-Templates
2. **Signatur-System** - Upload, Verwaltung und Integration in PDF-Generierung

---

## 🎨 Template-System

### Backend-Implementierung

#### Endpoints

**GET `/api/organizations/current/document-templates`**
- Ruft alle verfügbaren Templates für die aktuelle Organisation ab
- Response:
  ```json
  {
    "documentTemplates": {
      "employmentCertificate": {
        "path": "document-templates/template-1234567890.pdf",
        "version": "1.0",
        "uploadDate": "2025-01-XXT10:00:00Z"
      },
      "employmentContract": {
        "path": "document-templates/template-1234567891.pdf",
        "version": "1.0",
        "uploadDate": "2025-01-XXT10:00:00Z"
      }
    }
  }
  ```

**POST `/api/organizations/current/document-templates/upload`**
- Lädt ein neues Template hoch
- Request: `multipart/form-data`
  - `file`: PDF-Datei (max. 10MB)
  - `type`: "employmentCertificate" oder "employmentContract"
- Automatische Versionierung: Bei vorhandenem Template wird Version erhöht (1.0 → 1.1 → 2.0)
- Speicherung: `Organization.settings.documentTemplates[type]`

#### Dateispeicherung

- **Verzeichnis**: `backend/uploads/document-templates/`
- **Dateiname**: `template-{timestamp}-{random}.pdf`
- **Relativer Pfad**: `document-templates/{filename}` (für Datenbank)

#### Code-Stellen

- **Controller**: `backend/src/controllers/organizationController.ts`
  - `getDocumentTemplates()` - Zeile ~1360
  - `uploadDocumentTemplate()` - Zeile ~1394
- **Routes**: `backend/src/routes/organizations.ts`
  - Zeile ~70-71
- **Multer-Konfiguration**: `backend/src/controllers/organizationController.ts`
  - `templateStorage` - Zeile ~1312
  - `templateUpload` - Zeile ~1334

### Frontend-Implementierung

#### DocumentConfigurationTab

**Datei**: `frontend/src/components/organization/DocumentConfigurationTab.tsx`

**Features**:
- Template-Upload mit Typ-Auswahl (Dropdown: Arbeitszeugnis/Arbeitsvertrag)
- Template-Liste mit Versionen
- Template-Löschen (entfernt aus Organization.settings)

**Code-Stellen**:
- `loadTemplates()` - Zeile ~45
- `handleFileUpload()` - Zeile ~87
- `handleDeleteTemplate()` - Zeile ~135

#### Modal-Integration

**CertificateCreationModal.tsx**:
- Template-Auswahl mit Checkbox
- Automatische Aktivierung wenn Templates vorhanden
- Wechsel zwischen Template und PDF-Upload
- Code: Zeile ~57-59, ~100-123, ~439-479

**ContractCreationModal.tsx**:
- Gleiche Funktionalität wie CertificateCreationModal
- Code: Zeile ~60-62, ~103-126, ~525-566

**API-Integration**:
- `API_ENDPOINTS.ORGANIZATION_LIFECYCLE.DOCUMENT_TEMPLATES`
- `API_ENDPOINTS.ORGANIZATION_LIFECYCLE.UPLOAD_TEMPLATE`

---

## ✍️ Signatur-System

### Backend-Implementierung

#### Endpoints

**GET `/api/organizations/current/document-signatures`**
- Ruft alle verfügbaren Signaturen für die aktuelle Organisation ab
- Response:
  ```json
  {
    "documentSignatures": {
      "employmentCertificate": {
        "path": "document-signatures/signature-1234567890.png",
        "signerName": "Stefan Bossart",
        "signerPosition": "Geschäftsführer",
        "position": {
          "x": 400,
          "y": 100,
          "page": 1
        },
        "uploadDate": "2025-01-XXT10:00:00Z"
      },
      "employmentContract": {
        "path": "document-signatures/signature-1234567891.png",
        "signerName": "Stefan Bossart",
        "signerPosition": "Geschäftsführer",
        "position": {
          "x": 50,
          "y": 100,
          "page": 1
        },
        "uploadDate": "2025-01-XXT10:00:00Z"
      }
    }
  }
  ```

**POST `/api/organizations/current/document-signatures/upload`**
- Lädt eine neue Signatur hoch
- Request: `multipart/form-data`
  - `file`: Bild (JPEG, PNG, GIF) oder PDF (max. 5MB)
  - `type`: "employmentCertificate" oder "employmentContract"
  - `signerName`: Name des Unterzeichners (Pflichtfeld)
  - `signerPosition`: Position (optional)
  - `positionX`, `positionY`, `page`: Position im PDF (optional, Standard: x=400, y=100, page=1)
- Speicherung: `Organization.settings.documentSignatures[type]`

#### Dateispeicherung

- **Verzeichnis**: `backend/uploads/document-signatures/`
- **Dateiname**: `signature-{timestamp}-{random}.{ext}`
- **Relativer Pfad**: `document-signatures/{filename}` (für Datenbank)

#### Code-Stellen

- **Controller**: `backend/src/controllers/organizationController.ts`
  - `getDocumentSignatures()` - Zeile ~1458
  - `uploadDocumentSignature()` - Zeile ~1492
- **Routes**: `backend/src/routes/organizations.ts`
  - Zeile ~74-75
- **Multer-Konfiguration**: `backend/src/controllers/organizationController.ts`
  - `signatureStorage` - Zeile ~1323
  - `signatureUpload` - Zeile ~1346

### Frontend-Implementierung

#### DocumentConfigurationTab - Signatur-Sektion

**Datei**: `frontend/src/components/organization/DocumentConfigurationTab.tsx`

**Komponente**: `SignatureUploadSection` (Zeile ~288)

**Features**:
- Signatur-Upload-Formular mit:
  - Signatur-Typ-Auswahl (Dropdown: Arbeitszeugnis/Arbeitsvertrag)
  - Name des Unterzeichners (Pflichtfeld)
  - Position (optional)
  - Datei-Upload (JPEG, PNG, GIF, PDF)
- Signatur-Liste mit Name und Position
- Signatur-Löschen

**Code-Stellen**:
- `loadSignatures()` - Zeile ~318
- `handleFileUpload()` - Zeile ~363
- `handleDeleteSignature()` - Zeile ~429

### PDF-Generierung-Integration

#### DocumentService

**Datei**: `backend/src/services/documentService.ts`

**Funktionen**:
- `loadSignatureFromSettings()` - Zeile ~446
  - Lädt Signatur-Informationen aus Organization-Settings
  - Gibt `null` zurück wenn keine Signatur vorhanden
- `drawTextSignature()` - Zeile ~427
  - Fallback: Zeichnet Text-Unterschrift wenn keine Signatur vorhanden
- `drawContractTextSignatures()` - Zeile ~641
  - Fallback: Zeichnet Text-Unterschriften für Vertrag

**Integration in PDF-Generierung**:

**Arbeitszeugnis** (`generateCertificateContent()` - Zeile ~377):
```typescript
const signature = this.loadSignatureFromSettings(organization, 'employmentCertificate');
if (signature && signature.path) {
  // Signatur-Bild einfügen
  doc.image(signaturePath, signatureX, signatureY, {
    width: signatureWidth,
    height: signatureHeight,
    align: 'right'
  });
  // Name und Position unter Signatur
  doc.text(signature.signerName, ...);
  if (signature.signerPosition) {
    doc.text(signature.signerPosition, ...);
  }
} else {
  // Fallback: Text-Unterschrift
  this.drawTextSignature(doc, margin, yPos, pageWidth);
}
```

**Arbeitsvertrag** (`generateContractContent()` - Zeile ~592):
- Gleiche Logik wie Arbeitszeugnis
- Signatur wird links für "Arbeitgeber" platziert
- Fallback: Text-Unterschriften für Arbeitgeber und Arbeitnehmer

**Signatur-Positionierung**:
- **Arbeitszeugnis**: Rechtsbündig (Standard: x = pageWidth - margin - 100)
- **Arbeitsvertrag**: Links (Standard: x = margin)
- **Größe**: 80x40 Pixel (anpassbar)
- **Position**: Aus Settings oder Standard-Werte

---

## 🔧 Technische Details

### Dateispeicherung

**Templates**:
- Verzeichnis: `backend/uploads/document-templates/`
- Automatische Erstellung beim Server-Start
- Dateiname: `template-{timestamp}-{random}.pdf`

**Signaturen**:
- Verzeichnis: `backend/uploads/document-signatures/`
- Automatische Erstellung beim Server-Start
- Dateiname: `signature-{timestamp}-{random}.{ext}`

### Datenstruktur in Organization.settings

```typescript
{
  documentTemplates: {
    employmentCertificate: {
      path: "document-templates/template-1234567890.pdf",
      version: "1.0",
      uploadDate: "2025-01-XXT10:00:00Z"
    },
    employmentContract: {
      path: "document-templates/template-1234567891.pdf",
      version: "1.0",
      uploadDate: "2025-01-XXT10:00:00Z"
    }
  },
  documentSignatures: {
    employmentCertificate: {
      path: "document-signatures/signature-1234567890.png",
      signerName: "Stefan Bossart",
      signerPosition: "Geschäftsführer",
      position: {
        x: 400,
        y: 100,
        page: 1
      },
      uploadDate: "2025-01-XXT10:00:00Z"
    },
    employmentContract: {
      path: "document-signatures/signature-1234567891.png",
      signerName: "Stefan Bossart",
      signerPosition: "Geschäftsführer",
      position: {
        x: 50,
        y: 100,
        page: 1
      },
      uploadDate: "2025-01-XXT10:00:00Z"
    }
  }
}
```

### Fehlerbehandlung

**Template-System**:
- Fehler beim Laden: Leere Liste, keine Fehlermeldung (Templates sind optional)
- Fehler beim Upload: Fehlermeldung anzeigen, Upload abbrechen
- Fehler beim Löschen: Fehlermeldung anzeigen, Template bleibt erhalten

**Signatur-System**:
- Fehler beim Laden: Leere Liste, keine Fehlermeldung (Signaturen sind optional)
- Fehler beim Upload: Fehlermeldung anzeigen, Upload abbrechen
- Fehler beim Löschen: Fehlermeldung anzeigen, Signatur bleibt erhalten
- Fehler in PDF-Generierung: Fallback auf Text-Unterschrift

### Validierung

**Template-Upload**:
- Dateityp: Nur PDF (`application/pdf`)
- Dateigröße: Max. 10MB
- Typ: Muss "employmentCertificate" oder "employmentContract" sein

**Signatur-Upload**:
- Dateityp: JPEG, PNG, GIF oder PDF
- Dateigröße: Max. 5MB
- Typ: Muss "employmentCertificate" oder "employmentContract" sein
- Name: Pflichtfeld (nicht leer)

---

## 📝 API-Endpunkte Übersicht

### Templates

| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| GET | `/api/organizations/current/document-templates` | Templates abrufen |
| POST | `/api/organizations/current/document-templates/upload` | Template hochladen |

### Signaturen

| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| GET | `/api/organizations/current/document-signatures` | Signaturen abrufen |
| POST | `/api/organizations/current/document-signatures/upload` | Signatur hochladen |

---

## 🎯 Verwendung

### Template-Upload

1. **In OrganizationSettings**:
   - Tab "Dokumenten-Konfiguration" öffnen
   - Template-Typ auswählen (Arbeitszeugnis/Arbeitsvertrag)
   - PDF-Datei auswählen und hochladen
   - Template wird automatisch gespeichert und versioniert

2. **In CertificateCreationModal/ContractCreationModal**:
   - Modal öffnen
   - Tab "PDF hochladen" öffnen
   - Wenn Templates vorhanden: Checkbox "Template verwenden" aktivieren
   - Template aus Dropdown auswählen
   - Oder: PDF manuell hochladen

### Signatur-Upload

1. **In OrganizationSettings**:
   - Tab "Dokumenten-Konfiguration" öffnen
   - Sektion "Dokumenten-Signaturen" öffnen
   - Signatur-Typ auswählen (Arbeitszeugnis/Arbeitsvertrag)
   - Name des Unterzeichners eingeben (Pflichtfeld)
   - Position eingeben (optional)
   - Signatur-Datei auswählen und hochladen
   - Signatur wird automatisch in PDFs eingefügt

2. **In PDF-Generierung**:
   - Automatisch: Wenn Signatur in Settings vorhanden, wird sie in PDF eingefügt
   - Fallback: Wenn keine Signatur vorhanden, wird Text-Unterschrift verwendet

---

## 🔄 Nächste Schritte

### Template-System

- [ ] Template-Variablen-System (Template-PDFs mit Daten füllen)
- [ ] Template-Editor für Text-Bearbeitung
- [ ] Template-Vorschau in OrganizationSettings

### Signatur-System

- [ ] UI für Signatur-Positionierung (x, y, page)
- [ ] Signatur-Vorschau in OrganizationSettings
- [ ] Mehrere Signaturen pro Dokument-Typ

---

**Letzte Aktualisierung**: 2025-01-XX  
**Nächste Review**: Nach Implementierung der nächsten Schritte


# MODUL DOKUMENTENERKENNUNG

Dieses Dokument beschreibt die Implementierung und Funktionsweise des Moduls zur KI-basierten Dokumentenerkennung im Intranet-Projekt. Das Modul ermöglicht die automatisierte Extraktion von Informationen aus Ausweisdokumenten mittels OpenAI's GPT-4o Vision-Fähigkeiten.

## Inhaltsverzeichnis

1. [Überblick](#überblick)
2. [Komponenten](#komponenten)
3. [Technische Details](#technische-details)
4. [API-Endpunkte](#api-endpunkte)
5. [Datenmodell](#datenmodell)
6. [Benutzeroberfläche](#benutzeroberfläche)
7. [Typische Fehler und Lösungen](#typische-fehler-und-lösungen)
8. [Hinweise für Entwickler](#hinweise-für-entwickler)
9. [Datenschutz](#datenschutz)

## Überblick

Das Dokumentenerkennungsmodul ermöglicht es Benutzern, ihre Ausweisdokumente hochzuladen oder direkt per Kamera aufzunehmen und automatisch die Informationen daraus zu extrahieren. Die Erkennung erfolgt mittels OpenAI's GPT-4o und funktioniert für verschiedene Dokumenttypen wie Reisepässe, Personalausweise, Führerscheine und Aufenthaltstitel.

### Hauptfunktionen

- Automatische Erkennung von Dokumenttypen
- Extraktion von Dokumentnummer, Ausgabeland, Ausstellungsbehörde, Ausstellungs- und Ablaufdatum
- Unterstützung für Dokumentenuploads und Kameraaufnahmen
- Integriert in die Benutzerprofilverwaltung
- Administratorfunktionen zur Verifizierung von Dokumenten
- Spezielle Unterstützung für kolumbianische Dokumente (Cédula de Extranjería)

## Komponenten

Das Modul besteht aus folgenden Hauptkomponenten:

### Frontend-Komponenten

1. **IdentificationDocumentForm**: Formular zum Hinzufügen und Bearbeiten von Ausweisdokumenten
   - Dokument-Upload-Funktionalität
   - Kamera-Integration für mobile Geräte
   - Button zur automatischen Dokumentenerkennung
   - Formularfelder für manuelle Eingabe/Korrektur

2. **IdentificationDocumentList**: Listenansicht aller Dokumente eines Benutzers
   - Anzeige des Dokumenttyps, der Dokumentnummer und des Status
   - Download-Funktionalität für Dokumente
   - Verifizierungsfunktionen für Administratoren

3. **CameraCapture**: Komponente zum Aufnehmen von Fotos mittels Gerätekamera
   - Funktioniert besonders auf mobilen Geräten
   - Zeigt eine Live-Vorschau des Kamerabildes
   - Speichert Bilder als Base64-kodierte Strings

### Backend-Komponenten

1. **Document Recognition Route**: API-Route für die KI-basierte Dokumentenerkennung
   - Nimmt Base64-kodierte Bilder entgegen
   - Kommuniziert mit der OpenAI API
   - Verarbeitet die KI-Antwort und sendet strukturierte Daten zurück

2. **Identification Document Routes**: API-Routen für CRUD-Operationen
   - Erstellen, Abrufen, Aktualisieren und Löschen von Dokumenten
   - Dokumentenverifizierung durch Administratoren
   - Sicheres Speichern und Abrufen von Dokumentdateien

### Hilfsfunktionen

- **aiDocumentRecognition.ts**: Frontend-Utility zur Kommunikation mit der Erkennungs-API
- **documentRecognition.ts**: Legacy-Datei (nicht mehr im Einsatz) für lokale OCR (wurde durch OpenAI-Lösung ersetzt)

## Technische Details

### OpenAI GPT-4o Integration

Das Modul verwendet das OpenAI GPT-4o Modell zur Bildanalyse und Textextraktion aus Dokumenten. Die Anfrage erfolgt über einen Backend-Proxy, um den API-Schlüssel sicher zu verwahren.

```javascript
const openaiResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
  model: "gpt-4o",  // Aktuelle Version (ersetzt gpt-4-vision-preview)
  messages: [
    {
      role: "system",
      content: "Du bist ein Experte für Dokumentenerkennung. Extrahiere alle relevanten Informationen..."
    },
    {
      role: "user",
      content: [
        { type: "text", text: `Analysiere dieses Ausweisdokument...` },
        { type: "image_url", image_url: { url: image } }
      ]
    }
  ],
  max_tokens: 1000
});
```

### Unterstützte Dokumenttypen

Das System kann folgende Dokumenttypen erkennen und verarbeiten:

- **Reisepass** (passport)
- **Personalausweis** (national_id)
- **Führerschein** (driving_license)
- **Aufenthaltserlaubnis** (residence_permit)
- **Arbeitserlaubnis** (work_permit)
- **Steuer-ID** (tax_id)
- **Sozialversicherungsausweis** (social_security)

### Spezialfall: Kolumbianische Dokumente

Das System wurde speziell für die Erkennung der kolumbianischen "Cédula de Extranjería" optimiert, die typischerweise folgende Merkmale aufweist:

- Dokument enthält die Wörter "cédula de extranjería" oder "república de colombia"
- Dokumentnummer folgt typischerweise dem Muster "No. XXXXXXX"
- Datumsformate typischerweise im Format YYYY/MM/DD
- Enthält Begriffe wie "F. EXPEDICIÓN" (Ausstellungsdatum) und "VENCE" (Ablaufdatum)

### Datenverarbeitung

Der Datenfluss im Dokumentenerkennungsprozess:

1. Benutzer lädt ein Dokument hoch oder nimmt ein Foto auf
2. Die Bilddaten werden als Base64-String an den Server gesendet
3. Der Server leitet die Anfrage an die OpenAI API weiter
4. Die KI extrahiert relevante Informationen aus dem Bild
5. Der Server verarbeitet die KI-Antwort und gibt strukturierte Daten zurück
6. Das Frontend befüllt automatisch die entsprechenden Formularfelder
7. Der Benutzer kann die erkannten Daten überprüfen/korrigieren und speichern

## API-Endpunkte

### Dokumentenerkennung

```
POST /api/document-recognition
```

**Request-Header:**
```
Content-Type: application/json
Authorization: Bearer <JWT-Token>
```

**Request-Body:**
```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQ...",
  "documentType": "national_id"  // Optional
}
```

**Response:**
```json
{
  "documentType": "national_id",
  "documentNumber": "AB123456",
  "issueDate": "2020-01-01",
  "expiryDate": "2030-01-01",
  "issuingCountry": "Deutschland",
  "issuingAuthority": "Stadt Berlin"
}
```

### Dokumente verwalten

```
POST /api/identification-documents
GET /api/identification-documents
GET /api/identification-documents/:id
PUT /api/identification-documents/:id
DELETE /api/identification-documents/:id
PUT /api/identification-documents/:id/verify
GET /api/identification-documents/:id/download
```

## Datenmodell

Das `IdentificationDocument`-Modell in der Datenbank:

```prisma
model IdentificationDocument {
  id               Int       @id @default(autoincrement())
  userId           Int
  documentType     String
  documentNumber   String
  issueDate        DateTime?
  expiryDate       DateTime?
  issuingCountry   String
  issuingAuthority String?
  documentFile     String?   // Pfad zur gespeicherten Datei
  isVerified       Boolean   @default(false)
  verificationDate DateTime?
  verifiedBy       Int?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  
  user       User  @relation(fields: [userId], references: [id])
  verifier   User? @relation("DocumentVerifier", fields: [verifiedBy], references: [id])
}
```

## Benutzeroberfläche

### Dokument hinzufügen/bearbeiten

Die `IdentificationDocumentForm`-Komponente bietet folgende UI-Elemente:

- Dropdown zur Auswahl des Dokumenttyps
- Textfelder für Dokumentnummer, Ausstellungsland, Behörde, Datum
- Datei-Upload-Feld mit Drag & Drop-Unterstützung
- Kamera-Button für mobile Geräte
- "Daten automatisch erkennen"-Button zur KI-Analyse
- Speichern- und Abbrechen-Buttons

### Dokumentenliste

Die `IdentificationDocumentList`-Komponente zeigt:

- Tabelle aller Dokumente des Benutzers
- Status (verifiziert/nicht verifiziert)
- Aktionsbuttons (herunterladen, bearbeiten, löschen)
- Für Administratoren: Verifizieren-Button

## Typische Fehler und Lösungen

### CORS-Probleme

**Problem**: API-Anfragen werden durch CORS-Einschränkungen blockiert

**Lösung**: 
- Korrekte CORS-Konfiguration im Backend:
  ```javascript
  app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5000', 'http://localhost'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200
  }));
  ```
- Im Frontend CORS-Modus und Credentials explizit setzen:
  ```javascript
  credentials: 'include',
  mode: 'cors',
  ```

### OpenAI API-Fehler

**Problem**: Fehler mit dem OpenAI-Modell, z.B. "model_not_found"

**Lösung**:
- Verwende das aktuelle Modell "gpt-4o" anstelle von "gpt-4-vision-preview"
- Stelle sicher, dass ein gültiger API-Schlüssel in der .env-Datei konfiguriert ist
- Achte auf das korrekte Bildformat (Base64-kodiert) und eine angemessene Bildgröße

### Erkennung funktioniert nicht korrekt

**Problem**: Automatische Erkennung extrahiert keine oder falsche Daten

**Lösung**:
- Verbessere die Bildqualität (gute Beleuchtung, kein Glare, scharfes Bild)
- Stelle sicher, dass das gesamte Dokument im Bild sichtbar ist
- Bei speziellen Dokumenttypen: Gib den Dokumenttyp explizit mit (documentType)

## Hinweise für Entwickler

### Modellanpassungen

Bei Änderungen am Prisma-Schema:

1. Führe eine Migration durch: `npx prisma migrate dev --name add_document_feature`
2. Aktualisiere den Prisma-Client: `npx prisma generate`

### OpenAI API-Key

Die Anwendung benötigt einen gültigen OpenAI API-Schlüssel in der Umgebungsvariable `OPENAI_API_KEY`.

```
# In .env im Backend-Verzeichnis
OPENAI_API_KEY=sk-...
```

### Neustarts

Nach Änderungen am Backend-Code muss der Server kompiliert und neu gestartet werden:

```bash
npm run build
npm run start
```

Bitte beachte: Den Server **nicht ohne Absprache** neu starten, da dies laufende Prozesse unterbrechen kann.

## Datenschutz

Die Implementierung ist datenschutzoptimiert:

- Alle Bilddaten werden verschlüsselt über HTTPS übertragen
- Die Kommunikation mit der OpenAI API erfolgt ausschließlich über das Backend
- Dokumente werden sicher im Dateisystem gespeichert, mit Zugriffsbeschränkungen
- Nur autorisierte Benutzer können ihre eigenen Dokumente einsehen
- Administratoren können Dokumente verifizieren, jedoch nur im Rahmen ihrer Aufgaben

Das System entspricht den grundlegenden Anforderungen der DSGVO in Bezug auf die Verarbeitung personenbezogener Daten. Dokumentenspeicherung und -aufbewahrung sollten den lokalen gesetzlichen Vorgaben entsprechen.

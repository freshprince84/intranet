# MODUL DOKUMENT-ERKENNUNG

Diese Dokumentation beschreibt das Modul zur KI-basierten Erkennung und Verwaltung von Identifikationsdokumenten im Intranet-System.

## Inhaltsverzeichnis

1. [Übersicht](#übersicht)
2. [Technische Implementierung](#technische-implementierung)
3. [Abhängigkeiten](#abhängigkeiten)
4. [API-Endpunkte](#api-endpunkte)
5. [Frontend-Komponenten](#frontend-komponenten)
6. [Datenmodell](#datenmodell)
7. [Konfiguration](#konfiguration)
8. [Bekannte Probleme und Lösungen](#bekannte-probleme-und-lösungen)

## Übersicht

Das Modul "Dokument-Erkennung" ermöglicht die automatische Erkennung und Extraktion von Informationen aus verschiedenen Identifikationsdokumenten mittels KI-basierter Technologie. Das System nutzt OpenAI GPT-4o zur Bilderkennung und Textextraktion.

### Hauptfunktionen:

- Upload von Ausweisdokumenten
- Automatische Extraktion relevanter Informationen
- Validierung der extrahierten Daten
- Speicherung und Verwaltung der erkannten Dokumente
- Verknüpfung mit Benutzerprofilen

## Technische Implementierung

Das Modul besteht aus mehreren Komponenten:

1. **Backend-Routes**: Verarbeitung von Dokumentenuploads und KI-Abfragen
2. **Frontend-Komponenten**: Benutzeroberfläche für Dokumentenupload und -verwaltung
3. **AI-Service**: Integration mit OpenAI GPT-4o für die Bilderkennung
4. **Datenmodell**: Speicherung erkannter Dokumente und ihrer Eigenschaften

## Abhängigkeiten

Das Modul hat folgende wichtige Abhängigkeiten:

### Backend

- **express-validator**: Validierung der API-Anfragen
  - Wird in `routes/documentRecognition.ts` verwendet
  - **WICHTIG**: Muss explizit installiert werden: `npm install express-validator`
- **multer**: Handhabung von Datei-Uploads
- **OpenAI API**: Für die KI-basierte Dokumentenerkennung

### Frontend

- **React Dropzone**: Für den Datei-Upload
- **axios**: Für API-Anfragen

## API-Endpunkte

Das Modul stellt folgende API-Endpunkte bereit:

### POST /api/document-recognition/upload

Lädt ein Dokument hoch und sendet es zur Erkennung an die OpenAI API.

**Request:**
- Multipart/form-data mit dem Feld `document` für die Datei

**Response:**
```json
{
  "success": true,
  "data": {
    "documentId": "123",
    "documentType": "ID Card",
    "extractedData": {
      "name": "Max Mustermann",
      "dateOfBirth": "1990-01-01",
      "idNumber": "AB1234567",
      "expiryDate": "2030-01-01"
    }
  }
}
```

### GET /api/document-recognition/:userId

Ruft alle Dokumente für einen bestimmten Benutzer ab.

### DELETE /api/document-recognition/:documentId

Löscht ein Dokument aus dem System.

## Frontend-Komponenten

Das Modul umfasst folgende Frontend-Komponenten:

- **IdentificationDocumentForm**: Formular zum Hochladen und Erkennen neuer Dokumente
- **DocumentList**: Anzeige vorhandener Dokumente
- **DocumentDetail**: Detailansicht eines erkannten Dokuments

## Datenmodell

Das Modul verwendet das folgende Prisma-Datenmodell:

```prisma
model IdentificationDocument {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  documentType String
  documentNumber String?
  issuingCountry String?
  issuingDate   DateTime?
  expiryDate    DateTime?
  documentData  Json?
  status        String  @default("pending") // pending, verified, rejected
  uploadPath    String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

## Konfiguration

Das Modul verwendet folgende Konfigurationseinstellungen:

### OpenAI API

Die Konfiguration für die OpenAI API wird in einer `.env`-Datei gespeichert:

```
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4o
```

### Upload-Einstellungen

Die Upload-Einstellungen sind in der Backend-Konfiguration definiert:

```javascript
const storage = multer.diskStorage({
  destination: './uploads/documents',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
```

## Bekannte Probleme und Lösungen

### Problem: Fehler "Cannot find module 'express-validator'"

**Symptom:** Der Server startet nicht und gibt einen Fehler aus:
```
Error: Cannot find module 'express-validator'
```

**Lösung:**
1. Installieren Sie das fehlende Modul:
   ```bash
   cd backend
   npm install express-validator
   ```
2. Starten Sie den Server neu

### Problem: Fehler bei der Bilderkennung

**Symptom:** Die KI kann keine Informationen aus dem Dokument extrahieren.

**Lösungen:**
1. Stellen Sie sicher, dass das Bild eine gute Qualität hat (mindestens 300 DPI)
2. Achten Sie auf gute Beleuchtung und Ausrichtung des Dokuments
3. Überprüfen Sie, ob der OpenAI API-Schlüssel korrekt ist und über ausreichendes Guthaben verfügt

## Dateianhänge

Das System unterstützt Dateianhänge für verschiedene Entitäten:

### Unterstützte Entitäten
- **Tasks**: Vollständige Unterstützung für Anhänge mit Vorschau für Bilder
- **Requests**: Vollständige Unterstützung für Anhänge mit Vorschau für Bilder

### Funktionen
- **Drag & Drop**: Dateien können direkt in das Beschreibungsfeld gezogen werden
- **Copy & Paste**: Bilder können aus der Zwischenablage eingefügt werden
- **Manueller Upload**: Über den "Datei hinzufügen"-Button
- **Automatische Konvertierung**: Bei Genehmigung eines Requests mit Anhängen werden diese automatisch zum erstellten Task kopiert

### Implementierung
- **Frontend**: `EditTaskModal.tsx`, `CreateTaskModal.tsx`, `EditRequestModal.tsx`, `CreateRequestModal.tsx`
- **Backend**: `taskAttachmentController.ts`, `requestAttachmentController.ts`
- **Datenbank**: `TaskAttachment` und `RequestAttachment` Modelle in Prisma Schema

### Technische Details
- Dateien werden im Ordner `uploads/task-attachments` bzw. `uploads/request-attachments` gespeichert
- Die Dateinamen werden mit UUID generiert, um Kollisionen zu vermeiden
- Bei Task-Erstellung aus einem Request werden die Anhänge physisch kopiert

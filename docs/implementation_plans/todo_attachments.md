# Implementationsplan: Bilder und Dateien in To Do's

## Übersicht
Dieser Plan beschreibt die Integration von Bild- und Dateianhängen in die Beschreibung von To Do's, ähnlich wie bei modernen Messaging-Plattformen.

## Technische Anforderungen
- Copy & Paste Funktionalität für Bilder
- Drag & Drop Unterstützung für Dateien
- Vorschau der hochgeladenen Medien
- Speicherung der Dateien
- Sicherheitsaspekte

## Datenbankänderungen
### Neue Tabelle: TaskAttachments
```prisma
model TaskAttachment {
  id          Int      @id @default(autoincrement())
  taskId      Int
  fileName    String
  fileType    String
  fileSize    Int
  filePath    String
  uploadedAt  DateTime @default(now())
  task        Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
}
```

## Backend-Änderungen
1. Neue API-Endpunkte:
   - POST `/api/tasks/:taskId/attachments` - Datei hochladen
   - GET `/api/tasks/:taskId/attachments` - Anhänge abrufen
   - DELETE `/api/tasks/:taskId/attachments/:attachmentId` - Anhang löschen

2. Datei-Upload Service:
   - Implementierung eines sicheren Upload-Mechanismus
   - Validierung von Dateitypen und -größen
   - Speicherung in einem konfigurierbaren Verzeichnis

## Frontend-Änderungen
1. Komponenten:
   - `AttachmentUploader.tsx` - Handhabt Drag & Drop und Copy & Paste
   - `AttachmentPreview.tsx` - Zeigt Vorschau der hochgeladenen Dateien
   - `AttachmentList.tsx` - Listet alle Anhänge eines Tasks

2. Integration in bestehende Komponenten:
   - Erweiterung von `CreateTaskModal.tsx` und `EditTaskModal.tsx`
   - Anpassung der Beschreibungsfelder für Rich-Text-Unterstützung
   - Implementierung der Paste-Event-Handler

3. UI/UX:
   - Moderne Drag & Drop Zone
   - Fortschrittsanzeige beim Upload
   - Vorschaubilder für Bilder und Icons für andere Dateitypen

## Sicherheitsaspekte
1. Validierung:
   - Erlaubte Dateitypen (z.B. .jpg, .png, .pdf, .doc)
   - Maximale Dateigröße (z.B. 10MB)
   - Virenscanning der Uploads

2. Zugriffsrechte:
   - Nur berechtigte Benutzer können Anhänge hochladen/löschen
   - Sicherer Dateizugriff über Token-basierte URLs

## Implementierungsschritte
1. Datenbank:
   - Prisma Schema aktualisieren
   - Migration erstellen und ausführen

2. Backend:
   - Upload-Service implementieren
   - API-Endpunkte erstellen
   - Sicherheitsvalidierungen einbauen

3. Frontend:
   - Neue Komponenten erstellen
   - Integration in bestehende Modals
   - Styling und UX-Optimierung

4. Testing:
   - Unit Tests für neue Komponenten
   - Integration Tests für Upload-Funktionalität
   - Sicherheitstests für Dateihandling

## Geschätzter Aufwand
- Datenbankänderungen: 2h
- Backend-Implementierung: 8h
- Frontend-Implementierung: 12h
- Testing und Bugfixing: 8h
- Dokumentation: 2h

Gesamt: ~32h

## Risiken und Abhängigkeiten
- Speicherplatz für Uploads muss verfügbar sein
- Backup-Strategie für hochgeladene Dateien
- Performance-Implikationen bei vielen/großen Uploads
- Browser-Kompatibilität für Drag & Drop

## Nächste Schritte
1. Review des Implementationsplans
2. Priorisierung der Teilaufgaben
3. Beginn mit Datenbankänderungen
4. Iterative Implementierung der Frontend-Komponenten 
# Plan: PDF-Anhang-Vorschau Fix

## Problem-Analyse

### Hauptproblem: PDFs werden nicht in der Vorschau geladen

**Symptom:**
- PDF-Anhänge werden nur als Link mit "Öffnen" angezeigt: `<div class="p-3">LebenslaufDanielaArcilacardenas.pdf Öffnen</div>`
- Die iframe-Vorschau bleibt leer: `<div class="flex flex-col gap-3 mt-2"></div>`
- PDFs werden nicht im Browser angezeigt

**Ursache identifiziert:**

1. **Backend-Problem (KRITISCH):**
   - In `requestAttachmentController.ts` Zeile 124-126 und `taskAttachmentController.ts` Zeile 101-103 wird für PDFs `res.download()` verwendet
   - `res.download()` setzt automatisch `Content-Disposition: attachment`, was den Browser zwingt, die Datei herunterzuladen statt sie anzuzeigen
   - Für iframe-Vorschau muss `Content-Disposition: inline` gesetzt werden

2. **Frontend-Problem (möglicherweise):**
   - PDF-Erkennung könnte fehlschlagen, wenn `attachmentMetadata` nicht korrekt übergeben wird
   - URL könnte falsch konstruiert sein

3. **Browser-Problem (möglicherweise):**
   - CORS-Header könnten fehlen
   - Content-Type könnte falsch sein

## Lösung

### Phase 1: Backend-Fix (KRITISCH)

**Dateien:**
- `backend/src/controllers/requestAttachmentController.ts`
- `backend/src/controllers/taskAttachmentController.ts`

**Änderungen:**

1. **PDFs müssen mit `Content-Disposition: inline` bereitgestellt werden:**
   - Ändere die Logik in `getAttachment()` Funktionen
   - Für PDFs: `Content-Disposition: inline` setzen (wie bei Bildern)
   - Für andere Dateitypen: weiterhin `res.download()` verwenden

**Code-Änderung für `requestAttachmentController.ts`:**

```typescript
// Einzelnen Anhang abrufen
export const getAttachment = async (req: Request, res: Response) => {
  try {
    const { requestId, attachmentId } = req.params;
    const attachment = await prisma.requestAttachment.findFirst({
      where: {
        id: parseInt(attachmentId),
        requestId: parseInt(requestId),
      },
    });

    if (!attachment) {
      return res.status(404).json({ message: 'Anhang nicht gefunden' });
    }

    const filePath = path.join(UPLOAD_DIR, attachment.filePath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Datei nicht gefunden' });
    }

    // Entscheide basierend auf dem MIME-Typ, wie die Datei bereitgestellt wird
    if (attachment.fileType.startsWith('image/')) {
      // Bilder direkt anzeigen mit Cache-Kontrolle
      res.setHeader('Content-Type', attachment.fileType);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(attachment.fileName)}"`);
      res.setHeader('Cache-Control', 'max-age=31536000'); // 1 Jahr cachen
      fs.createReadStream(filePath).pipe(res);
    } else if (attachment.fileType === 'application/pdf') {
      // PDFs direkt anzeigen (für iframe-Vorschau)
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(attachment.fileName)}"`);
      res.setHeader('Cache-Control', 'max-age=31536000'); // 1 Jahr cachen
      fs.createReadStream(filePath).pipe(res);
    } else {
      // Andere Dateien als Download anbieten
      res.download(filePath, attachment.fileName);
    }
  } catch (error) {
    console.error('Fehler beim Abrufen des Anhangs:', error);
    res.status(500).json({ message: 'Fehler beim Abrufen des Anhangs' });
  }
};
```

**Gleiche Änderung für `taskAttachmentController.ts`:**

```typescript
// Einzelnes Attachment abrufen
export const getAttachment = async (req: Request, res: Response) => {
  try {
    const { taskId, attachmentId } = req.params;
    const attachment = await prisma.taskAttachment.findFirst({
      where: {
        id: parseInt(attachmentId),
        taskId: parseInt(taskId),
      },
    });

    if (!attachment) {
      return res.status(404).json({ message: 'Attachment nicht gefunden' });
    }

    const filePath = path.join(UPLOAD_DIR, attachment.filePath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Datei nicht gefunden' });
    }

    // Entscheide basierend auf dem MIME-Typ, wie die Datei bereitgestellt wird
    if (attachment.fileType.startsWith('image/')) {
      // Bilder direkt anzeigen mit Cache-Kontrolle
      res.setHeader('Content-Type', attachment.fileType);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(attachment.fileName)}"`);
      res.setHeader('Cache-Control', 'max-age=31536000'); // 1 Jahr cachen
      fs.createReadStream(filePath).pipe(res);
    } else if (attachment.fileType === 'application/pdf') {
      // PDFs direkt anzeigen (für iframe-Vorschau)
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(attachment.fileName)}"`);
      res.setHeader('Cache-Control', 'max-age=31536000'); // 1 Jahr cachen
      fs.createReadStream(filePath).pipe(res);
    } else {
      // Andere Dateien als Download anbieten
      res.download(filePath, attachment.fileName);
    }
  } catch (error) {
    console.error('Fehler beim Abrufen des Attachments:', error);
    res.status(500).json({ message: 'Fehler beim Abrufen des Attachments' });
  }
};
```

### Phase 2: Frontend-Verifikation (Optional, falls Phase 1 nicht ausreicht)

**Dateien:**
- `frontend/src/components/MarkdownPreview.tsx`
- `frontend/src/components/Requests.tsx`
- `frontend/src/pages/Worktracker.tsx`

**Prüfungen:**

1. **attachmentMetadata wird korrekt übergeben:**
   - In `Requests.tsx` Zeile 254-259 werden Anhänge geladen
   - URLs werden korrekt erstellt: `${window.location.origin}/api${API_ENDPOINTS.REQUESTS.ATTACHMENT(request.id, att.id)}`
   - `attachmentMetadata` wird in Zeile 1314 übergeben: `attachmentMetadata: request.attachments || []`

2. **PDF-Erkennung in MarkdownPreview:**
   - Zeile 206-208: Prüft `metadata?.fileType === 'application/pdf'`
   - Zeile 224-227: Fallback-Prüfung für PDFs
   - Sollte funktionieren, wenn Metadaten korrekt übergeben werden

**Falls PDF-Erkennung nicht funktioniert:**

- Debug-Logging hinzufügen in `MarkdownPreview.tsx`:
  ```typescript
  console.log('Attachment:', attachment);
  console.log('Metadata:', metadata);
  console.log('isPdf:', isPdf);
  console.log('URL:', url);
  ```

### Phase 3: Browser-Tests

**Nach Backend-Fix:**

1. **Browser-Konsole prüfen:**
   - Gibt es CORS-Fehler?
   - Gibt es 404-Fehler?
   - Gibt es Content-Type-Fehler?

2. **Network-Tab prüfen:**
   - Wird die PDF-URL korrekt aufgerufen?
   - Welche Headers werden gesendet/empfangen?
   - Ist `Content-Disposition: inline` gesetzt?

3. **iframe-Verhalten prüfen:**
   - Lädt der iframe die PDF?
   - Gibt es Fehler im iframe?

## Implementierungsreihenfolge

1. **Phase 1: Backend-Fix** (SOFORT)
   - Ändere beide Controller
   - Teste mit einem PDF-Anhang

2. **Phase 2: Frontend-Verifikation** (falls nötig)
   - Prüfe Browser-Konsole
   - Prüfe Network-Tab
   - Debug-Logging hinzufügen

3. **Phase 3: Browser-Tests** (nach Fix)
   - Teste in verschiedenen Browsern
   - Teste mit verschiedenen PDF-Größen

## Erwartetes Ergebnis

Nach dem Fix sollten:
- PDFs im iframe angezeigt werden
- Die Vorschau funktionieren
- PDFs nicht mehr automatisch heruntergeladen werden (außer über "Öffnen"-Link)

## Risiken

1. **Sicherheit:** PDFs werden jetzt inline angezeigt statt heruntergeladen
   - **Lösung:** Die Route ist bereits öffentlich (ohne Auth), daher kein zusätzliches Risiko
   - Die Anhang-ID und Request-ID/Task-ID dienen als Schutz

2. **Performance:** Große PDFs könnten langsam laden
   - **Lösung:** Cache-Header sind bereits gesetzt (1 Jahr)
   - Browser-Caching sollte helfen

3. **Browser-Kompatibilität:** Nicht alle Browser unterstützen PDFs in iframes gleich
   - **Lösung:** Fallback auf "Öffnen"-Link bleibt bestehen

## Test-Plan

### Test 1: PDF-Anhang in Request
- [ ] PDF zu Request hinzufügen
- [ ] Request in Liste öffnen
- [ ] PDF-Vorschau wird im iframe angezeigt
- [ ] "Öffnen"-Link funktioniert

### Test 2: PDF-Anhang in Task
- [ ] PDF zu Task hinzufügen
- [ ] Task in Liste öffnen
- [ ] PDF-Vorschau wird im iframe angezeigt
- [ ] "Öffnen"-Link funktioniert

### Test 3: Verschiedene PDF-Größen
- [ ] Kleine PDF (< 1MB)
- [ ] Mittlere PDF (1-10MB)
- [ ] Große PDF (> 10MB)

### Test 4: Browser-Kompatibilität
- [ ] Chrome
- [ ] Firefox
- [ ] Edge
- [ ] Safari (falls verfügbar)

## Geschätzter Aufwand

- **Phase 1:** 15-30 Minuten (Backend-Fix)
- **Phase 2:** 15-30 Minuten (Frontend-Verifikation, falls nötig)
- **Phase 3:** 15-30 Minuten (Browser-Tests)

**Gesamt:** ~1-1.5 Stunden


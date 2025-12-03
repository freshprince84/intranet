# Analyse: Anhänge-Vorschau funktioniert nicht in Card-Ansicht

**Datum:** 2025-01-30
**Status:** 🔴 **PROBLEM IDENTIFIZIERT**

---

## 🔍 PROBLEM

Die Vorschau von Anhängen funktioniert in der Card-Ansicht nicht, obwohl `attachmentMetadata` übergeben wird.

---

## 📋 ANALYSE

### 1. Datenfluss

1. **Requests.tsx (Zeile 1561):**
   ```typescript
   attachmentMetadata: request.attachments || []
   ```
   - `request.attachments` wird an `DataCard` übergeben

2. **DataCard.tsx (Zeile 297):**
   ```typescript
   <MarkdownPreview 
     content={fullDescriptionContent} 
     showImagePreview={true}
     attachmentMetadata={item.attachmentMetadata || []}
   />
   ```
   - `attachmentMetadata` wird an `MarkdownPreview` übergeben

3. **MarkdownPreview.tsx:**
   - `attachmentMetadata` wird als Prop empfangen (Zeile 159)
   - Wird in `getAttachmentMetadata()` verwendet (Zeile 354-397)
   - Wird in `renderInlineAttachments()` verwendet (Zeile 400-635)
   - Wird in `showImagePreview`-Block verwendet (Zeile 649-971)

### 2. Mögliche Probleme

#### Problem 1: `request.attachments` Format

**Requests.tsx (Zeile 446-455):**
```typescript
const attachments = (request.attachments || []).map((att: any) => ({
  id: att.id,
  fileName: att.fileName,
  fileType: att.fileType,
  fileSize: att.fileSize,
  filePath: att.filePath,
  uploadedAt: att.uploadedAt,
  url: getRequestAttachmentUrl(request.id, att.id)
}));
```

**Erwartetes Format für `attachmentMetadata` (DataCard.tsx Zeile 12-17):**
```typescript
attachmentMetadata?: Array<{
  id: number;
  fileName: string;
  fileType: string;
  url: string;
}>;
```

**✅ Format stimmt überein!**

#### Problem 2: `getRequestAttachmentUrl()` Funktion

**Mögliche Probleme:**
- Funktion gibt falsche URL zurück
- URL ist nicht korrekt formatiert
- URL fehlt Base-URL

**Zu prüfen:**
- `getRequestAttachmentUrl()` Implementierung
- URL-Format in `api.ts`

#### Problem 3: `MarkdownPreview` verwendet `attachmentMetadata` nicht korrekt

**In `showImagePreview` Block (Zeile 663-720):**
- `getAttachmentMetadata()` wird aufgerufen (Zeile 672)
- Aber: `attachmentMetadata` wird nur verwendet, wenn `attachment.alt` oder `attachment.url` mit Metadaten übereinstimmen

**Mögliches Problem:**
- Dateinamen stimmen nicht überein
- URLs stimmen nicht überein
- `attachmentMetadata` wird nicht gefunden, weil Matching-Logik fehlschlägt

#### Problem 4: Bilder werden nicht aus Markdown extrahiert

**In `extractAttachments()` (Zeile 175-262):**
- Extrahiert Bilder aus Markdown: `![alt](url)`
- Extrahiert Links aus Markdown: `[alt](url)`
- Extrahiert rohe URLs

**Mögliches Problem:**
- Wenn keine Markdown-Syntax vorhanden ist, werden Anhänge nicht extrahiert
- Anhänge müssen im Markdown-Text vorhanden sein, um erkannt zu werden

---

## 🎯 VERMUTETE URSACHE

**Hauptproblem:** Anhänge werden nur angezeigt, wenn sie im Markdown-Text als `![Dateiname](URL)` vorhanden sind. Wenn `request.attachments` vorhanden ist, aber nicht im `description`-Text referenziert ist, werden sie nicht angezeigt.

**Lösung:** `MarkdownPreview` sollte auch `attachmentMetadata` direkt rendern, wenn `showImagePreview={true}` ist, auch wenn sie nicht im Markdown-Text referenziert sind.

---

## 🔧 LÖSUNG

### Option 1: `attachmentMetadata` direkt rendern (empfohlen)

**In `MarkdownPreview.tsx` im `showImagePreview` Block:**

1. Prüfe, ob `attachmentMetadata` vorhanden ist
2. Rendere alle Anhänge aus `attachmentMetadata`, auch wenn sie nicht im Markdown-Text sind
3. Kombiniere mit bereits extrahierten Anhängen aus Markdown

### Option 2: Anhänge in Markdown-Text einfügen

**In `Requests.tsx` oder `DataCard.tsx`:**

1. Wenn `attachmentMetadata` vorhanden ist, füge Markdown-Links zum `descriptionContent` hinzu
2. Format: `![Dateiname](URL)` für Bilder, `[Dateiname](URL)` für andere Dateien

---

## 📝 NÄCHSTE SCHRITTE

1. ✅ Prüfe `getRequestAttachmentUrl()` Implementierung
2. ✅ Prüfe, ob `attachmentMetadata` korrekt übergeben wird
3. ✅ Prüfe, ob Anhänge im Markdown-Text referenziert sind
4. ⏳ Implementiere Lösung (Option 1 empfohlen)

---

**Erstellt:** 2025-01-30
**Status:** 🔴 **PROBLEM IDENTIFIZIERT - LÖSUNG AUSSTEHEND**


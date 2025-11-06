# Cerebro Editor: Wiederverwendung des bestehenden unified Editors

## Analyse

### ✅ **Bereits vorhanden in Tasks/Requests:**
- **Textarea** mit Drag & Drop / Paste Handler
- **handlePaste**: Erkennt Bilder im Clipboard
- **handleDrop**: Erkennt Drag & Drop von Dateien
- **handleDragOver**: Verhindert Standard-Verhalten
- **uploadFileAndInsertLink**: Lädt Datei hoch und fügt Markdown-Link ein
- **MarkdownPreview**: Zeigt Vorschau der eingefügten Medien/Links

### ❌ **Aktuell in Cerebro:**
- **ReactQuill** (Rich Text Editor)
- KEINE Drag & Drop Handler
- KEINE Paste Handler
- Separate Komponenten für Medien/Links

## Entscheidung

**Option A: Textarea übernehmen (wie Tasks/Requests)**
- ✅ Konsistent mit Rest der App
- ✅ Einfacher
- ✅ Funktioniert bereits
- ❌ Weniger Formatierungsmöglichkeiten

**Option B: ReactQuill beibehalten + Handler hinzufügen**
- ✅ Mehr Formatierungsmöglichkeiten
- ❌ Komplexer
- ❌ Inconsistente UX

**Empfehlung:** **Option A** - Textarea wie Tasks/Requests, da:
1. Der User sagte "wie hier in diesem chat fenster" - einfacher ist besser
2. Konsistenz ist wichtig
3. Der Code ist bereits vorhanden und funktioniert

## Implementierungsplan

### 1. Wiederverwendbaren Hook erstellen

**Datei:** `frontend/src/hooks/useUnifiedEditor.ts`

**Features:**
- Drag & Drop Handler
- Paste Handler
- File Upload Logic
- Markdown-Link-Einfügung
- Cursor-Position-Handling

**Parameter:**
- `onUpload`: Funktion zum Hochladen der Datei
- `onInsertLink`: Funktion zum Einfügen des Links
- `textareaRef`: Ref zum Textarea-Element
- `content`: Aktueller Inhalt
- `setContent`: Setter für Inhalt

### 2. Cerebro Editor umbauen

**Datei:** `frontend/src/components/cerebro/ArticleEdit.tsx`

**Änderungen:**
- ReactQuill entfernen
- Textarea verwenden (wie Tasks/Requests)
- `useUnifiedEditor` Hook verwenden
- Medien-Upload auf Cerebro-API anpassen
- MarkdownPreview für Vorschau verwenden

### 3. Upload-Funktion anpassen

Die Upload-Logik muss auf Cerebro-API angepasst werden:
- `cerebroApi.media.uploadMedia()` verwenden
- Slug statt ID verwenden
- Markdown-Link-Generierung anpassen

## Code-Struktur

```typescript
// Hook
const useUnifiedEditor = (
  textareaRef: RefObject<HTMLTextAreaElement>,
  content: string,
  setContent: (content: string) => void,
  onUpload: (file: File) => Promise<{ url: string, fileName: string }>
) => {
  // handlePaste
  // handleDrop
  // handleDragOver
  // uploadFileAndInsertLink
}

// Verwendung in ArticleEdit
const { handlePaste, handleDrop, handleDragOver } = useUnifiedEditor(
  textareaRef,
  formData.content,
  (content) => setFormData({ ...formData, content }),
  async (file) => {
    const media = await cerebroApi.media.uploadMedia(formData);
    return {
      url: `/uploads/cerebro/${media.path}`,
      fileName: media.filename
    };
  }
);
```

## Vorteile

1. **Wiederverwendbar:** Kann auch für andere Editoren verwendet werden
2. **Konsistent:** Gleiche UX wie Tasks/Requests
3. **Einfacher:** Textarea statt ReactQuill
4. **Bewährt:** Code ist bereits getestet







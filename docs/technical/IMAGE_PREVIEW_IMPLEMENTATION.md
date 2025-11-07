# Bildvorschau-Implementierung - Vollständige Anleitung

## Übersicht

Dieses Dokument beschreibt die vollständige Implementierung der Bildvorschau-Funktionalität für Requests und Tasks. Es dokumentiert alle Erkenntnisse, Fallstricke und Best Practices, die während der Entwicklung gesammelt wurden.

## Problemstellung

Bei der Implementierung von Bildvorschauen gab es mehrere Herausforderungen:

1. **Doppelte Bildanzeige**: Bilder wurden sowohl im Text als auch als separate Vorschau angezeigt
2. **Markdown-Text im Textarea**: Beim Öffnen von Edit-Modals wurde Markdown-Text für Bilder im Textarea angezeigt
3. **Inkonsistente URL-Generierung**: Attachment-URLs wurden unterschiedlich generiert
4. **Duplikate**: Bilder wurden mehrfach gerendert

## Architektur-Übersicht

### Komponenten-Hierarchie

```
DataCard (Card-Ansicht)
  └─> MarkdownPreview (showImagePreview={true})
      └─> renderFilteredAttachments() - Rendert große Bildvorschauen

EditRequestModal / EditTaskModal (Edit-Modals)
  ├─> Textarea (ohne Bild-Markdown)
  ├─> renderAttachments() - Zeigt Attachment-Tags
  └─> renderTemporaryAttachments() - Zeigt temporäre Attachments
```

### Datenfluss

1. **Beim Upload**:
   - Bild wird hochgeladen → Attachment wird erstellt
   - **WICHTIG**: Kein Markdown-Text wird ins Textarea eingefügt für Bilder
   - Attachment wird zum `attachments` State hinzugefügt

2. **Beim Speichern**:
   - Originale Beschreibung (mit Bildern) wird als Basis verwendet
   - Neue Bilder werden automatisch zum Markdown-Text hinzugefügt
   - Beschreibung wird mit Bild-Markdown gespeichert

3. **Beim Laden**:
   - Beschreibung wird geladen
   - Bild-Markdown wird aus der Beschreibung entfernt (für Textarea)
   - Originale Beschreibung wird für Card-Anzeige verwendet

4. **In der Card**:
   - `MarkdownPreview` mit `showImagePreview={true}` wird verwendet
   - Bilder werden aus dem Text entfernt
   - Bilder werden als große Vorschau gerendert

## Implementierungs-Guide

### 1. Attachment-URL-Generierung

**WICHTIG**: Immer die zentralen Hilfsfunktionen verwenden!

```typescript
import { getTaskAttachmentUrl, getRequestAttachmentUrl } from '../config/api.ts';

// ✅ RICHTIG
const imageUrl = getTaskAttachmentUrl(taskId, attachmentId);
const imageUrl = getRequestAttachmentUrl(requestId, attachmentId);

// ❌ FALSCH - Nie verwenden!
const url = `${window.location.origin}/api/tasks/${taskId}/attachments/${attachmentId}`;
```

**Warum?**
- `window.location.origin` gibt in Entwicklung `http://localhost:3000` zurück (falsch!)
- Die API läuft auf Port 5000, nicht 3000
- Die Hilfsfunktionen verwenden `API_URL`, das automatisch die richtige Umgebung berücksichtigt

### 2. Upload-Handling in Edit-Modals

#### 2.1 Upload-Funktion (`uploadFileAndInsertLink`)

```typescript
const uploadFileAndInsertLink = async (file: File) => {
  // ... Upload-Logik ...
  
  const newAttachment = response.data;
  setAttachments([...attachments, newAttachment]);

  // ✅ RICHTIG: Für Bilder KEIN Markdown ins Textarea einfügen
  if (!newAttachment.fileType.startsWith('image/')) {
    // Nur für Nicht-Bilder: Markdown-Link ins Textarea einfügen
    const insertText = `\n[${newAttachment.fileName}](${getTaskAttachmentUrl(task.id, newAttachment.id)})\n`;
    // ... Textarea-Update-Logik ...
  }
  // Für Bilder: Nichts ins Textarea einfügen!
};
```

**Wichtig:**
- Bilder werden NICHT ins Textarea eingefügt
- Andere Dateien (PDFs, etc.) werden als Link eingefügt
- Attachment wird zum State hinzugefügt (für Vorschau)

#### 2.2 Temporäre Attachments (`handleTemporaryAttachment`)

```typescript
const handleTemporaryAttachment = async (file: File) => {
  // ... Temporäres Attachment erstellen ...
  
  setTemporaryAttachments(prev => [...prev, newAttachment]);

  // ✅ RICHTIG: Für Bilder KEIN Markdown ins Textarea einfügen
  if (!file.type.startsWith('image/')) {
    const insertText = `\n[${file.name}](${t('uploadAfterCreate')})\n`;
    // ... Textarea-Update-Logik ...
  }
  // Für Bilder: Nichts ins Textarea einfügen!
};
```

### 3. Beschreibung beim Laden behandeln

#### 3.1 Initialisierung (useState)

```typescript
// ✅ RICHTIG: Bilder aus Beschreibung entfernen beim Laden
const removeImageMarkdown = (text: string): string => {
  if (!text) return '';
  // Entferne alle Bild-Markdown-Links: ![alt](url)
  return text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '').trim();
};

const [description, setDescription] = useState(removeImageMarkdown(task.description || ''));
// Speichere originale Beschreibung für Speichern
const originalDescription = task.description || '';
```

**Wichtig:**
- Beschreibung wird ohne Bilder ins Textarea geladen
- Originale Beschreibung wird für Speichern gespeichert

#### 3.2 Speichern (`handleSubmit`)

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  // ... Validierung ...
  
  // ✅ RICHTIG: Verwende originale Beschreibung als Basis
  let finalDescription = originalDescription || description || '';
  const imageAttachments = attachments.filter(att => 
    att.fileType?.startsWith('image/') && att.id
  );
  
  // Füge neue Bilder automatisch hinzu (falls noch nicht vorhanden)
  for (const attachment of imageAttachments) {
    const imageUrl = getTaskAttachmentUrl(task.id, attachment.id!);
    const imageMarkdown = `![${attachment.fileName}](${imageUrl})`;
    
    // Prüfe, ob bereits vorhanden
    const escapedFileName = attachment.fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const imagePattern = new RegExp(`!\\[${escapedFileName}\\]\\([^)]+\\)`, 'g');
    
    if (!imagePattern.test(finalDescription)) {
      // Bild-Link ist noch nicht vorhanden, füge hinzu
      finalDescription = finalDescription 
        ? `${finalDescription}\n${imageMarkdown}` 
        : imageMarkdown;
    }
  }
  
  // Speichere mit Bild-Markdown
  await axiosInstance.put(API_ENDPOINTS.TASKS.BY_ID(task.id), {
    description: finalDescription,
    // ... andere Felder ...
  });
};
```

**Wichtig:**
- Verwende `originalDescription` als Basis (enthält bereits vorhandene Bilder)
- Füge nur neue Bilder hinzu, die noch nicht im Text sind
- Speichere mit vollständigem Markdown (inkl. Bilder)

### 4. Card-Anzeige (DataCard)

#### 4.1 MarkdownPreview-Verwendung

```typescript
// ✅ RICHTIG: In DataCard.tsx
<MarkdownPreview 
  content={fullDescriptionContent}  // Originale Beschreibung mit Bildern
  showImagePreview={true}            // WICHTIG: Aktiviert Bildvorschau
  attachmentMetadata={item.attachmentMetadata || []}  // Metadaten für Erkennung
/>
```

**Wichtig:**
- Verwende `showImagePreview={true}` für Card-Anzeige
- Übergebe `attachmentMetadata` für korrekte Bild-Erkennung
- Verwende originale Beschreibung (mit Bild-Markdown)

#### 4.2 MarkdownPreview-Interna

Die `MarkdownPreview` Komponente behandelt `showImagePreview={true}` folgendermaßen:

1. **Extrahieren**: Alle Bilder aus dem Markdown-Text extrahieren
2. **Filtern**: Nur Bilder (nicht PDFs) für Vorschau auswählen
3. **Entfernen**: Bilder komplett aus dem Text entfernen
4. **Rendern**: Bilder als große Vorschau rendern

```typescript
// In MarkdownPreview.tsx
if (showImagePreview) {
  // 1. Extrahiere Anhänge
  const attachments = extractAttachments();
  
  // 2. Filtere Bilder heraus
  const imagesToRender = attachments.filter(attachment => {
    // Prüfe Metadaten für Dateityp
    let metadata = getAttachmentMetadata(attachment.alt);
    let isImage = metadata?.fileType?.startsWith('image/');
    let isPdf = metadata?.fileType === 'application/pdf';
    return isImage && !isPdf;
  });
  
  // 3. Entferne Bilder aus Text
  processedContent = processedContent.replace(imageRegex, () => {
    return ''; // Komplett entfernen
  });
  
  // 4. Rendere Bilder als große Vorschau
  return (
    <div>
      <div dangerouslySetInnerHTML={{ __html: processedContent }} />
      {renderFilteredAttachments()}  // Große Bildvorschauen
    </div>
  );
}
```

### 5. Duplikat-Vermeidung

#### 5.1 In extractAttachments()

```typescript
// ✅ RICHTIG: Duplikate basierend auf Typ, Dateiname UND URL entfernen
const uniqueAttachments = allAttachments.reduce((acc, current) => {
  const key = `${current.type}-${current.alt}-${current.url}`;
  if (!acc.some(item => `${item.type}-${item.alt}-${item.url}` === key)) {
    acc.push(current);
  }
  return acc;
}, [] as typeof allAttachments);
```

#### 5.2 In renderFilteredAttachments()

```typescript
// ✅ RICHTIG: Zusätzliche Duplikat-Entfernung vor Rendering
const uniqueImages = imagesToRender.reduce((acc, current) => {
  const key = `${current.alt}-${current.url || ''}`;
  if (!acc.some(img => `${img.alt}-${img.url || ''}` === key)) {
    acc.push(current);
  }
  return acc;
}, [] as typeof imagesToRender);
```

**Wichtig:**
- Duplikate werden sowohl beim Extrahieren als auch beim Rendern entfernt
- Vergleich basiert auf Dateiname UND URL
- Eindeutige Keys für React-Elemente verwenden

## Fallstricke und Lösungen

### Fallstrick 1: Doppelte Bildanzeige

**Problem:** Bilder werden sowohl im Text als auch als Vorschau angezeigt.

**Ursache:** 
- Bilder werden nicht aus dem Text entfernt, bevor sie gerendert werden
- `showImagePreview={true}` entfernt Bilder nicht korrekt

**Lösung:**
```typescript
// In MarkdownPreview.tsx
processedContent = processedContent.replace(imageRegex, () => {
  return ''; // Komplett entfernen, nicht durch [Bild: ...] ersetzen
});
```

### Fallstrick 2: Markdown-Text im Textarea

**Problem:** Beim Öffnen von Edit-Modals wird `![filename](url)` im Textarea angezeigt.

**Ursache:**
- Beschreibung wird direkt ins Textarea geladen, ohne Bilder zu entfernen

**Lösung:**
```typescript
// Beim Initialisieren
const removeImageMarkdown = (text: string): string => {
  return text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '').trim();
};

const [description, setDescription] = useState(removeImageMarkdown(task.description || ''));
```

### Fallstrick 3: Bilder werden beim Speichern verloren

**Problem:** Bilder werden nicht gespeichert, wenn sie nicht im Textarea sind.

**Ursache:**
- Beim Speichern wird nur `description` verwendet (ohne Bilder)
- Originale Beschreibung wird nicht verwendet

**Lösung:**
```typescript
// Verwende originale Beschreibung als Basis
let finalDescription = originalDescription || description || '';

// Füge neue Bilder hinzu
for (const attachment of imageAttachments) {
  // ... Prüfe und füge hinzu ...
}
```

### Fallstrick 4: Falsche URL-Generierung

**Problem:** Bilder werden nicht geladen, URLs sind falsch.

**Ursache:**
- `window.location.origin` wird verwendet (falscher Port in Entwicklung)

**Lösung:**
```typescript
// Immer Hilfsfunktionen verwenden
import { getTaskAttachmentUrl } from '../config/api.ts';
const url = getTaskAttachmentUrl(taskId, attachmentId);
```

### Fallstrick 5: Duplikate in Vorschau

**Problem:** Bilder werden mehrfach in der Vorschau angezeigt.

**Ursache:**
- Duplikate werden nicht entfernt
- Vergleich basiert nur auf Dateiname, nicht auf URL

**Lösung:**
```typescript
// Duplikate basierend auf Dateiname UND URL entfernen
const uniqueImages = imagesToRender.reduce((acc, current) => {
  const key = `${current.alt}-${current.url || ''}`;
  if (!acc.some(img => `${img.alt}-${img.url || ''}` === key)) {
    acc.push(current);
  }
  return acc;
}, []);
```

## Checkliste für neue Implementierungen

### ✅ Upload-Handling

- [ ] Bilder werden NICHT ins Textarea eingefügt
- [ ] Andere Dateien werden als Link ins Textarea eingefügt
- [ ] Attachment wird zum State hinzugefügt
- [ ] URL-Generierung verwendet Hilfsfunktionen

### ✅ Beschreibung beim Laden

- [ ] Bilder werden aus Beschreibung entfernt (für Textarea)
- [ ] Originale Beschreibung wird gespeichert (für Speichern)
- [ ] `removeImageMarkdown()` Funktion wird verwendet

### ✅ Speichern

- [ ] Originale Beschreibung wird als Basis verwendet
- [ ] Neue Bilder werden automatisch hinzugefügt
- [ ] Prüfung auf bereits vorhandene Bilder
- [ ] Vollständige Beschreibung (mit Bildern) wird gespeichert

### ✅ Card-Anzeige

- [ ] `MarkdownPreview` mit `showImagePreview={true}` verwendet
- [ ] `attachmentMetadata` wird übergeben
- [ ] Originale Beschreibung (mit Bildern) wird verwendet
- [ ] Keine doppelte Anzeige

### ✅ Duplikat-Vermeidung

- [ ] Duplikate werden beim Extrahieren entfernt
- [ ] Duplikate werden beim Rendern entfernt
- [ ] Vergleich basiert auf Dateiname UND URL
- [ ] Eindeutige Keys für React-Elemente

## Code-Beispiele

### Vollständiges Beispiel: EditTaskModal

```typescript
// 1. Initialisierung
const removeImageMarkdown = (text: string): string => {
  if (!text) return '';
  return text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '').trim();
};

const [description, setDescription] = useState(removeImageMarkdown(task.description || ''));
const originalDescription = task.description || '';

// 2. Upload-Handling
const uploadFileAndInsertLink = async (file: File) => {
  // ... Upload ...
  const newAttachment = response.data;
  setAttachments([...attachments, newAttachment]);
  
  // Nur für Nicht-Bilder: Markdown ins Textarea
  if (!newAttachment.fileType.startsWith('image/')) {
    const insertText = `\n[${newAttachment.fileName}](${getTaskAttachmentUrl(task.id, newAttachment.id)})\n`;
    // ... Textarea-Update ...
  }
};

// 3. Speichern
const handleSubmit = async (e: React.FormEvent) => {
  let finalDescription = originalDescription || description || '';
  const imageAttachments = attachments.filter(att => 
    att.fileType?.startsWith('image/') && att.id
  );
  
  for (const attachment of imageAttachments) {
    const imageUrl = getTaskAttachmentUrl(task.id, attachment.id!);
    const imageMarkdown = `![${attachment.fileName}](${imageUrl})`;
    const escapedFileName = attachment.fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const imagePattern = new RegExp(`!\\[${escapedFileName}\\]\\([^)]+\\)`, 'g');
    
    if (!imagePattern.test(finalDescription)) {
      finalDescription = finalDescription 
        ? `${finalDescription}\n${imageMarkdown}` 
        : imageMarkdown;
    }
  }
  
  await axiosInstance.put(API_ENDPOINTS.TASKS.BY_ID(task.id), {
    description: finalDescription,
    // ... andere Felder ...
  });
};
```

### Vollständiges Beispiel: DataCard

```typescript
// In DataCard.tsx
<MarkdownPreview 
  content={fullDescriptionContent}  // Originale Beschreibung mit Bildern
  showImagePreview={true}            // Aktiviert Bildvorschau
  attachmentMetadata={item.attachmentMetadata || []}  // Metadaten
/>
```

## Verwandte Dokumentation

- [EXPANDABLE_DESCRIPTION_IMPLEMENTATION.md](./EXPANDABLE_DESCRIPTION_IMPLEMENTATION.md) - **Expandierbare Beschreibung in DataCard**
- [ATTACHMENT_URL_FIX.md](./ATTACHMENT_URL_FIX.md) - URL-Generierung Fix
- [MARKDOWN_PREVIEW_USAGE.md](../implementation_guides/MARKDOWN_PREVIEW_USAGE.md) - MarkdownPreview Verwendung
- [MODUL_DOKUMENT_ERKENNUNG.md](../modules/MODUL_DOKUMENT_ERKENNUNG.md) - Dokumentenerkennungsmodul

## Zusammenfassung

Die Bildvorschau-Implementierung folgt diesen Prinzipien:

1. **Trennung von Anzeige und Speicherung**: Bilder werden im Textarea nicht angezeigt, aber beim Speichern hinzugefügt
2. **Zentrale URL-Generierung**: Immer Hilfsfunktionen verwenden
3. **Duplikat-Vermeidung**: Mehrfache Entfernung von Duplikaten
4. **Konsistente Behandlung**: Gleiche Logik für alle Modals und Cards

Durch Befolgen dieser Anleitung können neue Implementierungen ohne die beschriebenen Fallstricke umgesetzt werden.


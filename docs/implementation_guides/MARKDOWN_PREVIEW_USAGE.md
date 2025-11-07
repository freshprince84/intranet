# MarkdownPreview Verwendung - WICHTIG

## Übersicht

Dieses Dokument beschreibt die korrekte Verwendung der `MarkdownPreview` Komponente in verschiedenen Kontexten.

**⚠️ WICHTIG:** Für vollständige Implementierungs-Details siehe [IMAGE_PREVIEW_IMPLEMENTATION.md](../technical/IMAGE_PREVIEW_IMPLEMENTATION.md)

## Problem: Doppelte Anzeige des Inhalts

**⚠️ KRITISCH:** MarkdownPreview darf NICHT mit `showImagePreview={true}` verwendet werden, wenn der Editor-Inhalt bereits sichtbar ist!

### Falsche Verwendung (zeigt Inhalt doppelt):
```tsx
<textarea value={content} onChange={...} />
<MarkdownPreview content={content} showImagePreview={true} />
```

### Korrekte Verwendung (nur Tags):
```tsx
<textarea value={content} onChange={...} />
<MarkdownPreview 
  content={content} 
  temporaryAttachments={temporaryAttachments}
/>
```

## Regeln

### 1. In Editoren (Create/Edit Modals)

**Verwendung:**
- ✅ `showImagePreview` NICHT verwenden
- ✅ Nur `temporaryAttachments` übergeben (für Create-Modals)
- ✅ MarkdownPreview zeigt nur die Attachment-Tags, nicht den gesamten Inhalt
- ✅ Bilder werden NICHT ins Textarea eingefügt (nur Attachment-Tags darunter)

**Beispiel:**
```tsx
// In EditRequestModal.tsx / EditTaskModal.tsx
<textarea value={description} onChange={...} />
{renderAttachments()}  // Zeigt Attachment-Tags
{renderTemporaryAttachments()}  // Zeigt temporäre Attachments
{/* KEIN MarkdownPreview mit showImagePreview hier! */}
```

### 2. In View-Komponenten (Read-Only)

**Verwendung:**
- ✅ `showImagePreview={true}` verwenden
- ✅ `attachmentMetadata` übergeben (für korrekte Bild-Erkennung)
- ✅ Zeigt den gesamten gerenderten Inhalt mit großen Bildvorschauen

**Beispiel:**
```tsx
// In DataCard.tsx
<MarkdownPreview 
  content={fullDescriptionContent}  // Originale Beschreibung mit Bildern
  showImagePreview={true}            // Aktiviert Bildvorschau
  attachmentMetadata={item.attachmentMetadata || []}  // Metadaten
/>
```

### 3. In Tooltips/Hover-Vorschauen

**Verwendung:**
- ✅ `showImagePreview={true}` verwenden
- ✅ Zeigt kompletten Inhalt mit Bildvorschauen

**Beispiel:**
```tsx
// In Requests.tsx / Worktracker.tsx
<MarkdownPreview 
  content={request.description} 
  showImagePreview={true} 
/>
```

## Wichtige Erkenntnisse

### Bilder werden automatisch behandelt

Wenn `showImagePreview={true}` aktiv ist:
1. Bilder werden aus dem Text entfernt
2. Bilder werden als große Vorschau gerendert
3. Duplikate werden automatisch entfernt

### Beschreibung beim Laden behandeln

**WICHTIG:** In Edit-Modals müssen Bilder aus der Beschreibung entfernt werden:

```typescript
const removeImageMarkdown = (text: string): string => {
  if (!text) return '';
  return text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '').trim();
};

const [description, setDescription] = useState(removeImageMarkdown(task.description || ''));
const originalDescription = task.description || '';  // Für Speichern
```

### Beim Speichern Bilder hinzufügen

**WICHTIG:** Bilder müssen beim Speichern automatisch hinzugefügt werden:

```typescript
let finalDescription = originalDescription || description || '';
// Füge neue Bilder hinzu (siehe IMAGE_PREVIEW_IMPLEMENTATION.md)
```

## Betroffene Komponenten

### ✅ Korrekt implementiert:
- `CreateRequestModal.tsx` - verwendet MarkdownPreview OHNE showImagePreview
- `CreateTaskModal.tsx` - verwendet MarkdownPreview OHNE showImagePreview
- `EditRequestModal.tsx` - Bilder werden nicht ins Textarea eingefügt
- `EditTaskModal.tsx` - Bilder werden nicht ins Textarea eingefügt
- `DataCard.tsx` - verwendet `showImagePreview={true}` korrekt
- `Requests.tsx` - verwendet `showImagePreview={true}` in Tooltips
- `Worktracker.tsx` - verwendet `showImagePreview={true}` in Tooltips

### ⚠️ Bei neuen Editoren beachten:
- NIEMALS `showImagePreview={true}` in Editoren verwenden
- Bilder NICHT ins Textarea einfügen
- Originale Beschreibung für Speichern verwenden
- Siehe [IMAGE_PREVIEW_IMPLEMENTATION.md](../technical/IMAGE_PREVIEW_IMPLEMENTATION.md) für vollständige Anleitung

## Verwandte Dokumentation

- [IMAGE_PREVIEW_IMPLEMENTATION.md](../technical/IMAGE_PREVIEW_IMPLEMENTATION.md) - **Vollständige Implementierungs-Anleitung**
- [EXPANDABLE_DESCRIPTION_IMPLEMENTATION.md](../technical/EXPANDABLE_DESCRIPTION_IMPLEMENTATION.md) - **Expandierbare Beschreibung in DataCard**
- [ATTACHMENT_URL_FIX.md](../technical/ATTACHMENT_URL_FIX.md) - URL-Generierung Fix







# MarkdownPreview Verwendung - WICHTIG

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

1. **In Editoren (Create/Edit Modals):**
   - ✅ `showImagePreview` NICHT verwenden
   - ✅ Nur `temporaryAttachments` übergeben
   - ✅ MarkdownPreview zeigt nur die Attachment-Tags, nicht den gesamten Inhalt

2. **In View-Komponenten (Read-Only):**
   - ✅ `showImagePreview={true}` verwenden
   - ✅ Zeigt den gesamten gerenderten Inhalt

## Betroffene Komponenten

### ✅ Korrekt implementiert:
- `CreateRequestModal.tsx` - verwendet MarkdownPreview OHNE showImagePreview
- `CreateTaskModal.tsx` - verwendet MarkdownPreview OHNE showImagePreview
- `ArticleEdit.tsx` - jetzt korrigiert

### ⚠️ Bei neuen Editoren beachten:
- NIEMALS `showImagePreview={true}` in Editoren verwenden
- Nur Attachment-Tags anzeigen lassen
- Den gesamten Inhalt wird bereits im Textarea angezeigt







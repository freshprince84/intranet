# Attachment URL-Generierung Fix

## Problem

Attachment-URLs wurden inkonsistent generiert, was zu Problemen bei der PDF-Erkennung und Bildanzeige führte.

### Symptome

- PDFs wurden nicht korrekt erkannt und angezeigt
- Bilder wurden teilweise nicht geladen
- URLs funktionierten in der Entwicklungsumgebung nicht korrekt
- **Bilder wurden doppelt angezeigt** (sowohl im Text als auch als Vorschau)

### Ursache

**Hauptproblem:** Attachment-URLs wurden überall mit `window.location.origin` generiert:
```typescript
const url = `${window.location.origin}/api${API_ENDPOINTS.TASKS.ATTACHMENT(task.id, att.id)}`;
```

**Warum das problematisch war:**
- In der Entwicklungsumgebung läuft das Frontend auf Port 3000, die API auf Port 5000
- `window.location.origin` gibt `http://localhost:3000` zurück
- Die generierte URL war also `http://localhost:3000/api/...`, was falsch ist
- Die korrekte URL sollte `http://localhost:5000/api/...` sein

**Zusätzliche Probleme:**
- Inkonsistente URL-Generierung an verschiedenen Stellen im Code
- Keine zentrale Funktion für URL-Generierung
- Schwierige Wartung bei Änderungen der API-Struktur
- **Doppelte Bildanzeige:** Bei `showImagePreview={true}` wurden Bilder sowohl im Text (als `[Bild: ...]`) als auch durch `renderInlineAttachments()` gerendert

## Lösung

### 1. Zentrale Hilfsfunktionen erstellt

In `frontend/src/config/api.ts` wurden zwei neue Funktionen hinzugefügt:

```typescript
/**
 * Generiert eine vollständige URL für ein Task-Attachment
 * Verwendet API_URL für korrekte URL-Generierung in Entwicklung und Produktion
 */
export const getTaskAttachmentUrl = (taskId: number, attachmentId: number): string => {
  return `${API_URL}${API_ENDPOINTS.TASKS.ATTACHMENT(taskId, attachmentId)}`;
};

/**
 * Generiert eine vollständige URL für ein Request-Attachment
 * Verwendet API_URL für korrekte URL-Generierung in Entwicklung und Produktion
 */
export const getRequestAttachmentUrl = (requestId: number, attachmentId: number): string => {
  return `${API_URL}${API_ENDPOINTS.REQUESTS.ATTACHMENT(requestId, attachmentId)}`;
};
```

**Vorteile:**
- `API_URL` berücksichtigt automatisch die Umgebung (Entwicklung vs. Produktion)
- In Entwicklung: `http://localhost:5000/api` (korrekter Port)
- In Produktion: `/api` (relativer Pfad für Nginx)
- Zentrale Wartung - Änderungen nur an einer Stelle nötig

### 2. Alle Stellen aktualisiert

Die folgenden Dateien wurden aktualisiert, um die neuen Hilfsfunktionen zu verwenden:

#### `frontend/src/components/Requests.tsx`
- Import: `getRequestAttachmentUrl` hinzugefügt
- Zeile 258: Attachment-Metadaten beim Laden

#### `frontend/src/pages/Worktracker.tsx`
- Import: `getTaskAttachmentUrl` hinzugefügt
- Zeile 260: Attachment-Metadaten beim Laden

#### `frontend/src/components/EditTaskModal.tsx`
- Import: `getTaskAttachmentUrl` hinzugefügt
- 5 Stellen aktualisiert:
  - Zeile 345: Markdown-Einfügung für Bilder
  - Zeile 348: Markdown-Einfügung für andere Dateien
  - Zeile 455: Attachment-Metadaten beim Laden
  - Zeile 558: URL-Muster für Löschung
  - Zeile 1007: Bild-Vorschau im Tooltip

#### `frontend/src/components/EditRequestModal.tsx`
- Import: `getRequestAttachmentUrl` hinzugefügt
- 6 Stellen aktualisiert:
  - Zeile 292: Markdown-Einfügung für Bilder
  - Zeile 295: Markdown-Einfügung für andere Dateien
  - Zeile 321: Bild-Vorschau beim Upload
  - Zeile 456: Attachment-Metadaten beim Laden
  - Zeile 623: URL-Ersetzung nach Upload
  - Zeile 702: Bild-Vorschau im Tooltip

### 3. Doppelte Bildanzeige behoben

**Problem:** Bei `showImagePreview={true}` wurden Bilder doppelt angezeigt:
1. Im Text als `[Bild: filename]` (nach Regex-Ersetzung)
2. Als große Vorschau durch `renderFilteredAttachments()`

**Lösung:** In `MarkdownPreview.tsx` wurde die Logik angepasst:
- **ALLE** Bilder werden komplett aus dem Text entfernt (nicht durch `[Bild: ...]` ersetzt)
- Bilder werden separat als große Vorschau durch `renderFilteredAttachments()` gerendert
- Duplikate werden sowohl beim Extrahieren als auch beim Rendern entfernt
- Die Erkennung basiert auf Metadaten (`fileType.startsWith('image/')`)

**Code-Änderung:**
```typescript
// Ersetze ALLE Bilder komplett aus dem Text
processedContent = processedContent.replace(imageRegex, () => {
  return ''; // Komplett entfernen - werden separat gerendert
});

// Entferne Duplikate vor Rendering
const uniqueImages = imagesToRender.reduce((acc, current) => {
  const key = `${current.alt}-${current.url || ''}`;
  if (!acc.some(img => `${img.alt}-${img.url || ''}` === key)) {
    acc.push(current);
  }
  return acc;
}, []);
```

**Wichtig:** Siehe [IMAGE_PREVIEW_IMPLEMENTATION.md](./IMAGE_PREVIEW_IMPLEMENTATION.md) für vollständige Implementierungs-Details.

### 4. Vorher/Nachher Vergleich

**Vorher (falsch):**
```typescript
const url = `${window.location.origin}/api${API_ENDPOINTS.TASKS.ATTACHMENT(task.id, att.id)}`;
// Ergebnis in Entwicklung: http://localhost:3000/api/tasks/1/attachments/1 ❌
```

**Nachher (korrekt):**
```typescript
const url = getTaskAttachmentUrl(task.id, att.id);
// Ergebnis in Entwicklung: http://localhost:5000/api/tasks/1/attachments/1 ✅
// Ergebnis in Produktion: /api/tasks/1/attachments/1 ✅
```

## Auswirkungen

### Positive Auswirkungen

✅ **PDF-Erkennung funktioniert jetzt korrekt**
- URLs sind korrekt, Metadaten werden richtig übergeben
- PDFs werden als `application/pdf` erkannt und in iframe angezeigt

✅ **Bilder werden korrekt geladen**
- URLs zeigen auf den richtigen Server/Port
- Bilder werden in allen Umgebungen korrekt angezeigt

✅ **Keine doppelte Bildanzeige mehr**
- Bilder werden nur einmal angezeigt (als große Vorschau)
- Text bleibt sauber ohne doppelte Referenzen

✅ **Konsistente URL-Generierung**
- Alle Attachment-URLs werden auf die gleiche Weise generiert
- Einfache Wartung und Fehlerbehebung

✅ **Umgebungsunabhängig**
- Funktioniert korrekt in Entwicklung und Produktion
- Keine manuellen Anpassungen nötig

### Technische Details

**API_URL Konfiguration:**
```typescript
export const API_URL = process.env.NODE_ENV === 'development'
  ? `${API_BASE_URL}/api`  // http://localhost:5000/api
  : '/api';                 // Relativer Pfad für Produktion
```

**API_BASE_URL:**
```typescript
export const API_BASE_URL = process.env.NODE_ENV === 'development'
  ? window.location.hostname === 'localhost'
    ? 'http://localhost:5000'  // Lokale Entwicklung
    : `http://${window.location.hostname}:5000`  // Entwicklung über IP
  : ''; // Leerer String für Produktion
```

## Wartung

### Bei zukünftigen Änderungen

- **NEU:** Immer `getTaskAttachmentUrl()` oder `getRequestAttachmentUrl()` verwenden
- **NICHT:** `window.location.origin` direkt verwenden
- **NICHT:** URLs manuell zusammenbauen

### Beispiel für neue Implementierung

```typescript
// ✅ RICHTIG
import { getTaskAttachmentUrl } from '../config/api.ts';
const url = getTaskAttachmentUrl(taskId, attachmentId);

// ❌ FALSCH
const url = `${window.location.origin}/api/tasks/${taskId}/attachments/${attachmentId}`;
```

## Verwandte Dokumentation

- [IMAGE_PREVIEW_IMPLEMENTATION.md](./IMAGE_PREVIEW_IMPLEMENTATION.md) - **Vollständige Anleitung zur Bildvorschau-Implementierung**
- [EXPANDABLE_DESCRIPTION_IMPLEMENTATION.md](./EXPANDABLE_DESCRIPTION_IMPLEMENTATION.md) - **Expandierbare Beschreibung in DataCard**
- [MODUL_DOKUMENT_ERKENNUNG.md](../modules/MODUL_DOKUMENT_ERKENNUNG.md) - Dokumentenerkennungsmodul
- [ATTACHMENT_PREVIEW_FIX_PLAN.md](../implementation_plans/ATTACHMENT_PREVIEW_FIX_PLAN.md) - Attachment-Vorschau Implementierung
- [MARKDOWN_PREVIEW_USAGE.md](../implementation_guides/MARKDOWN_PREVIEW_USAGE.md) - MarkdownPreview Verwendung
- [api.ts](../../frontend/src/config/api.ts) - API-Konfiguration


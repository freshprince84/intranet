# Umsetzungsplan: Attachment-Vorschau Fix

## Problem-Analyse

### Problem 1: Doppelte Anzeige des Dateinamens
**Symptom:** Im Beschreibungsfeld wird der Dateiname mehrfach angezeigt: `"!2025-01-29_19h27_02.png 2025-01-29_19h27_02.png 2025-01-29_19h27_02.png"`

**Ursache:**
- Die `getPlainTextPreview` Funktion entfernt zwar `![alt](url)` komplett, aber:
  - Wenn mehrere Markdown-Links mit demselben Dateinamen existieren, werden sie alle entfernt
  - Der Dateiname könnte auch als Plain-Text im Beschreibungsfeld stehen (nicht nur als Markdown-Link)
  - Die Regex `replace(/!\[([^\]]*)\]\([^)]+\)/g, '')` entfernt nur Markdown-Bilder, nicht den Plain-Text

**Betroffene Dateien:**
- `frontend/src/components/shared/DataCard.tsx` (Zeile 49-65)

### Problem 2: Keine Bildvorschau wird angezeigt
**Symptom:** Bilder werden nicht als Vorschau angezeigt, sondern nur der Dateiname

**Ursachen:**
1. **URL-Erkennung:** Die Bild-Erkennung basiert auf:
   - Dateiname-Endung (`.jpg`, `.png`, etc.)
   - URL-Pattern (`.jpg`, `.png` in URL)
   - API-Endpunkte (`/api/requests/attachments/`, `/api/tasks/attachments/`)
   
   **Problem:** Bei API-Endpunkten ohne Dateiendung in der URL wird der Dateityp nicht richtig erkannt, wenn:
   - Die URL ist: `http://localhost:5000/api/tasks/123/attachments/456`
   - Der Dateiname ist: `2025-01-29_19h27_02.png`
   - Die Logik prüft: `url.includes('/api/requests/attachments/') && fileName.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)`
   - Das sollte funktionieren, ABER: Wenn `attachment.type === 'image'` nicht gesetzt ist UND die URL keine Endung hat, wird es nicht erkannt

2. **MIME-Type fehlt:** Die `extractAttachments()` Funktion setzt `type: 'image'` nur wenn es ein Markdown-Bild ist (`![]()`), aber nicht basierend auf dem tatsächlichen Dateityp

3. **Fehlende Datenbank-Abfrage:** Die Attachment-Metadaten (fileType) werden nicht aus der Datenbank geladen, um den Dateityp zu bestimmen

**Betroffene Dateien:**
- `frontend/src/components/MarkdownPreview.tsx` (Zeile 26-55, 174-186)
- `frontend/src/components/shared/DataCard.tsx` (Zeile 212-220)

### Problem 3: Externe Links zeigen keine Web-Vorschau
**Symptom:** Links wie `www.blick.ch` werden nur als einfacher Link angezeigt, nicht als Web-Vorschau (Open Graph Preview)

**Ursache:**
- Aktuell werden externe Links nur als einfache Links mit Icon angezeigt
- Es gibt keine Implementierung für Open Graph / oEmbed Preview
- Keine Backend-API zum Abrufen von Link-Metadaten

**Betroffene Dateien:**
- `frontend/src/components/MarkdownPreview.tsx` (Zeile 224-243)

### Problem 4: Upload-Pfade sind hardcodiert
**Symptom:** Upload-Pfade sind im Code hardcodiert, Settings werden nicht verwendet

**Ursache:**
- Controllers verwenden feste Pfade: `path.join(__dirname, '../../uploads/task-attachments')`
- Settings-Felder im Frontend existieren, werden aber nicht verwendet
- Keine Abfrage der Settings aus der Datenbank

**Betroffene Dateien:**
- `backend/src/controllers/taskAttachmentController.ts` (Zeile 10)
- `backend/src/controllers/requestAttachmentController.ts` (Zeile 10)
- `frontend/src/pages/Settings.tsx` (Zeile 430-443)

---

## Umsetzungsplan

### Phase 1: Doppelte Anzeige beheben

#### Schritt 1.1: Verbesserte Markdown-Bereinigung
**Datei:** `frontend/src/components/shared/DataCard.tsx`

**Änderungen:**
1. `getPlainTextPreview` Funktion verbessern:
   - Zuerst alle Markdown-Links/Bilder entfernen
   - Dann alle verbleibenden Dateinamen entfernen, die wie Attachment-Dateinamen aussehen
   - Pattern für Dateinamen: `\b\d{4}-\d{2}-\d{2}_\d{2}h\d{2}_\d{2}\.\w+\b` (z.B. `2025-01-29_19h27_02.png`)

**Code-Änderung:**
```typescript
const getPlainTextPreview = (markdown: string): string => {
  let plain = markdown
    .replace(/^#+\s+/gm, '') // Headers
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold
    .replace(/\*([^*]+)\*/g, '$1') // Italic
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // Bilder komplett entfernen
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '') // Links komplett entfernen (nicht nur alt-Text)
    .replace(/```[\s\S]*?```/g, '') // Code blocks
    .replace(/`([^`]+)`/g, '$1') // Inline code
    .replace(/^\s*[-*+]\s+/gm, '') // List items
    .replace(/^\s*\d+\.\s+/gm, '') // Numbered list
    // Entferne verbleibende Dateinamen, die wie Attachment-Dateinamen aussehen
    .replace(/\b\d{4}-\d{2}-\d{2}_\d{2}h\d{2}_\d{2}\.\w+\b/g, '')
    .replace(/\s+/g, ' ') // Mehrfache Leerzeichen zu einem
    .trim();
  
  return plain;
};
```

**Erwartetes Ergebnis:** Dateinamen werden nicht mehr im Text angezeigt

---

### Phase 2: Bildvorschau implementieren

#### Schritt 2.1: Attachment-Metadaten aus Datenbank laden
**Problem:** Die `MarkdownPreview` Komponente hat keinen Zugriff auf die Attachment-Metadaten (fileType) aus der Datenbank

**Lösung:** 
- Option A: Attachment-Metadaten als Props übergeben
- Option B: Attachment-IDs aus URLs extrahieren und API-Aufruf machen
- Option C: Attachment-Metadaten beim Laden von Requests/Tasks mitladen

**Empfehlung:** Option C - Attachment-Metadaten beim Laden mitladen

**Dateien:**
- `frontend/src/components/Requests.tsx` - Requests mit Attachments laden
- `frontend/src/components/Worktracker.tsx` - Tasks mit Attachments laden
- `frontend/src/components/shared/DataCard.tsx` - Attachment-Metadaten als Props übergeben

#### Schritt 2.2: MarkdownPreview erweitern
**Datei:** `frontend/src/components/MarkdownPreview.tsx`

**Änderungen:**
1. Neue Props hinzufügen:
```typescript
interface MarkdownPreviewProps {
  // ... bestehende Props
  attachmentMetadata?: Array<{
    id: number;
    fileName: string;
    fileType: string;
    url: string; // Vollständige URL zum Attachment
  }>;
}
```

2. `extractAttachments` Funktion erweitern:
   - URLs aus Markdown extrahieren
   - Attachment-ID aus URL extrahieren (z.B. `/api/tasks/123/attachments/456` → ID: 456)
   - Metadaten aus `attachmentMetadata` Array finden
   - `type` basierend auf `fileType` setzen

**Code-Änderung:**
```typescript
const extractAttachments = () => {
  const imageMatches = Array.from(content.matchAll(/!\[(.*?)\]\((.*?)\)/g)).map(match => {
    const url = match[2];
    const alt = match[1];
    
    // Versuche Attachment-ID aus URL zu extrahieren
    const attachmentIdMatch = url.match(/\/attachments\/(\d+)/);
    let fileType = null;
    
    if (attachmentIdMatch && attachmentMetadata) {
      const attachmentId = parseInt(attachmentIdMatch[1]);
      const metadata = attachmentMetadata.find(m => m.id === attachmentId);
      if (metadata) {
        fileType = metadata.fileType;
      }
    }
    
    // Bestimme Typ basierend auf fileType oder Dateiname
    const isImage = fileType?.startsWith('image/') || 
                   alt.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) ||
                   url.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i);
    
    return {
      type: isImage ? 'image' : 'file',
      alt: alt,
      url: url,
      isTemporary: url === "wird nach dem Erstellen hochgeladen",
      fileType: fileType
    };
  });
  
  // ... Rest der Funktion
};
```

#### Schritt 2.3: Bild-Erkennung verbessern
**Datei:** `frontend/src/components/MarkdownPreview.tsx`

**Änderungen in `renderInlineAttachments`:**
- `isImage` Prüfung erweitern um `fileType` zu berücksichtigen:
```typescript
const isImage = attachment.fileType?.startsWith('image/') ||
               attachment.type === 'image' || 
               (url && url.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i)) ||
               fileName.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) ||
               (url && (url.includes('/api/requests/attachments/') || url.includes('/api/tasks/attachments/')) && 
                (fileName.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) || !fileName.endsWith('.pdf')));
```

#### Schritt 2.4: Requests/Tasks mit Attachments laden
**Dateien:**
- `frontend/src/components/Requests.tsx`
- `frontend/src/components/Worktracker.tsx` (falls Tasks dort angezeigt werden)

**Änderungen:**
- Beim Laden von Requests/Tasks auch Attachments mitladen
- Attachment-Metadaten an `DataCard` weitergeben
- `DataCard` gibt Metadaten an `MarkdownPreview` weiter

**Code-Beispiel für Requests.tsx:**
```typescript
// Beim Laden der Requests
const requests = await axiosInstance.get(API_ENDPOINTS.REQUESTS.BASE);
const requestsWithAttachments = await Promise.all(
  requests.data.map(async (request) => {
    const attachments = await axiosInstance.get(
      API_ENDPOINTS.REQUESTS.ATTACHMENTS(request.id)
    );
    return {
      ...request,
      attachments: attachments.data.map(att => ({
        id: att.id,
        fileName: att.fileName,
        fileType: att.fileType,
        url: `${window.location.origin}/api${API_ENDPOINTS.REQUESTS.ATTACHMENT(request.id, att.id)}`
      }))
    };
  })
);
```

---

### Phase 3: Web-Vorschau für externe Links

#### Schritt 3.1: Backend-API für Link-Preview erstellen
**Neue Datei:** `backend/src/controllers/linkPreviewController.ts`

**Funktionalität:**
- Endpoint: `GET /api/link-preview?url=<encoded-url>`
- Ruft Open Graph Metadaten von der URL ab
- Gibt zurück: `{ title, description, image, url }`

**Implementierung:**
- Library verwenden: `open-graph-scraper` oder `metascraper`
- Oder: Eigenes Scraping mit `cheerio` und `axios`

**Code-Struktur:**
```typescript
export const getLinkPreview = async (req: Request, res: Response) => {
  try {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ message: 'URL fehlt' });
    }
    
    // Open Graph Metadaten abrufen
    const metadata = await fetchOpenGraphMetadata(url);
    
    res.json({
      title: metadata.title || url,
      description: metadata.description || '',
      image: metadata.image || null,
      url: url
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Link-Vorschau:', error);
    res.status(500).json({ message: 'Fehler beim Abrufen der Link-Vorschau' });
  }
};
```

#### Schritt 3.2: Route hinzufügen
**Datei:** `backend/src/routes/index.ts` oder neue Route-Datei

**Änderungen:**
- Route registrieren: `router.get('/link-preview', getLinkPreview);`

#### Schritt 3.3: Frontend-Komponente für Link-Preview
**Datei:** `frontend/src/components/MarkdownPreview.tsx`

**Änderungen:**
1. Hook für Link-Preview erstellen:
```typescript
const useLinkPreview = (url: string) => {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (!url || !url.match(/^https?:\/\//)) return;
    
    setLoading(true);
    axiosInstance.get(`/api/link-preview?url=${encodeURIComponent(url)}`)
      .then(response => setPreview(response.data))
      .catch(error => console.error('Link-Preview Fehler:', error))
      .finally(() => setLoading(false));
  }, [url]);
  
  return { preview, loading };
};
```

2. Link-Vorschau in `renderInlineAttachments` anzeigen:
```typescript
{isExternalLink ? (
  <LinkPreview url={url} alt={attachment.alt} />
) : ...}
```

3. Neue Komponente `LinkPreview`:
```typescript
const LinkPreview: React.FC<{ url: string; alt: string }> = ({ url, alt }) => {
  const { preview, loading } = useLinkPreview(url);
  
  if (loading) {
    return <div className="p-3">Lade Vorschau...</div>;
  }
  
  if (!preview) {
    // Fallback zu einfachem Link
    return (
      <div className="p-3">
        <a href={url} target="_blank" rel="noopener noreferrer">
          {alt || url}
        </a>
      </div>
    );
  }
  
  return (
    <div className="p-3 border rounded-lg bg-white dark:bg-gray-800">
      {preview.image && (
        <img src={preview.image} alt={preview.title} className="w-full h-48 object-cover rounded mb-2" />
      )}
      <div>
        <a href={url} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 dark:text-blue-400">
          {preview.title}
        </a>
        {preview.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{preview.description}</p>
        )}
      </div>
    </div>
  );
};
```

---

### Phase 4: Upload-Pfade aus Settings (Optional, niedrige Priorität)

#### Schritt 4.1: Settings-Service erstellen
**Neue Datei:** `backend/src/services/settingsService.ts`

**Funktionalität:**
- Settings aus Datenbank lesen
- Cache für Settings (optional)

#### Schritt 4.2: Controllers anpassen
**Dateien:**
- `backend/src/controllers/taskAttachmentController.ts`
- `backend/src/controllers/requestAttachmentController.ts`

**Änderungen:**
- Upload-Pfad aus Settings lesen
- Fallback auf Standard-Pfad wenn Setting nicht existiert

---

## Implementierungsreihenfolge

1. **Phase 1** - Doppelte Anzeige beheben (höchste Priorität)
2. **Phase 2** - Bildvorschau implementieren (hohe Priorität)
3. **Phase 3** - Web-Vorschau für externe Links (mittlere Priorität)
4. **Phase 4** - Upload-Pfade aus Settings (niedrige Priorität, optional)

---

## Test-Plan

### Phase 1 Tests:
- [ ] Beschreibung mit mehreren Markdown-Bildern → Keine doppelten Dateinamen im Text
- [ ] Beschreibung mit Plain-Text Dateinamen → Dateinamen werden entfernt
- [ ] Beschreibung mit gemischten Inhalten → Nur Text bleibt, keine Markdown-Syntax

### Phase 2 Tests:
- [ ] Bild-Anhang wird als große Vorschau angezeigt
- [ ] PDF-Anhang wird als iframe-Vorschau angezeigt
- [ ] Andere Dateitypen werden als Download-Link angezeigt
- [ ] API-Endpunkte ohne Dateiendung werden korrekt erkannt

### Phase 3 Tests:
- [ ] Externer Link (z.B. www.blick.ch) zeigt Web-Vorschau
- [ ] Link ohne Open Graph zeigt Fallback
- [ ] Fehlerhafte URLs zeigen Fallback

### Phase 4 Tests:
- [ ] Upload-Pfad aus Settings wird verwendet
- [ ] Fallback auf Standard-Pfad funktioniert

---

## Risiken und Abhängigkeiten

### Risiken:
1. **Performance:** Viele Attachment-Abfragen könnten langsam sein → Lösung: Batch-Loading oder Caching
2. **CORS:** Externe Link-Previews könnten CORS-Probleme haben → Lösung: Backend-Proxy
3. **Rate Limiting:** Externe APIs könnten Rate Limits haben → Lösung: Caching

### Abhängigkeiten:
- Für Phase 3: Backend-Library für Open Graph Scraping (z.B. `open-graph-scraper`)
- Für Phase 2: Keine neuen Abhängigkeiten nötig

---

## Geschätzter Aufwand

- **Phase 1:** 1-2 Stunden
- **Phase 2:** 3-4 Stunden
- **Phase 3:** 4-6 Stunden (inkl. Backend)
- **Phase 4:** 2-3 Stunden

**Gesamt:** ~10-15 Stunden


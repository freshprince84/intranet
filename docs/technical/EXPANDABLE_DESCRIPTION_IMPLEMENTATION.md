# Expandierbare Beschreibung in DataCard - Vollständige Anleitung

## Übersicht

Dieses Dokument beschreibt die vollständige Implementierung der expandierbaren Beschreibung in der `DataCard` Komponente. Es dokumentiert alle Probleme, Lösungen, Fallstricke und Best Practices, die während der Entwicklung gesammelt wurden.

## Problemstellung

Bei der Implementierung der expandierbaren Beschreibung gab es mehrere Herausforderungen:

1. **Doppelte Anzeige**: Der gesamte Text wurde immer angezeigt, auch wenn nicht expanded
2. **REST-Text wird nicht angezeigt**: Beim Ausklappen wurde der REST-Text nicht angezeigt
3. **Bilder werden nicht angezeigt**: Bilder wurden nicht angezeigt, wenn nur Bilder vorhanden waren (kein Text)
4. **Pfeil erscheint nicht**: Der Pfeil zum Ausklappen erschien nicht, wenn nur Bilder vorhanden waren
5. **Textumbruch mitten im Wort**: Der Text wurde mitten im Wort umbrochen
6. **Initialisierungsfehler**: Variablen wurden vor ihrer Initialisierung verwendet

## Architektur-Übersicht

### Komponenten-Struktur

```
DataCard
  └─> DescriptionMetadataItem (für expandierbare Beschreibungen)
      ├─> Erste Zeile (immer sichtbar)
      ├─> Pfeil zum Ausklappen (wenn mehr Text vorhanden)
      ├─> Bilder (immer sichtbar, auch wenn nicht expanded)
      └─> REST-Text (nur wenn expanded)
```

### Datenfluss

1. **Initialisierung**:
   - Beschreibung wird geladen
   - Plain Text wird extrahiert (ohne Markdown)
   - Erste Zeile wird berechnet (max. 150 Zeichen, nach Wortende)
   - `hasMoreContent` wird berechnet
   - `remainingPlainText` wird berechnet

2. **Anzeige (nicht expanded)**:
   - Nur erste Zeile wird angezeigt
   - Bilder werden angezeigt (wenn vorhanden)
   - Pfeil erscheint (wenn mehr Text vorhanden)

3. **Anzeige (expanded)**:
   - Erste Zeile wird angezeigt
   - Bilder werden angezeigt (wenn vorhanden)
   - REST-Text wird angezeigt

## Implementierungs-Guide

### 1. Plain Text Extraktion

**WICHTIG**: Markdown muss in Plain Text umgewandelt werden, um die erste Zeile korrekt zu berechnen.

```typescript
const getPlainTextPreview = (markdown: string): string => {
  let plain = markdown
    .replace(/^#+\s+/gm, '') // Headers
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold
    .replace(/\*([^*]+)\*/g, '$1') // Italic
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // Bilder komplett entfernen
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '') // Links komplett entfernen
    .replace(/```[\s\S]*?```/g, '') // Code blocks
    .replace(/`([^`]+)`/g, '$1') // Inline code
    .replace(/^\s*[-*+]\s+/gm, '') // List items
    .replace(/^\s*\d+\.\s+/gm, '') // Numbered list
    .replace(/\b\d{4}-\d{2}-\d{2}_\d{2}h\d{2}_\d{2}\.\w+\b/g, '') // Attachment-Dateinamen
    .replace(/\s+/g, ' ') // Mehrfache Leerzeichen zu einem
    .trim();
  
  return plain;
};
```

### 2. Erste Zeile Berechnung

**WICHTIG**: Die erste Zeile muss nach einem Wortende geschnitten werden, nicht mitten im Wort.

```typescript
const getFirstLine = (text: string): string => {
  const firstNewline = text.indexOf('\n');
  if (firstNewline > 0 && firstNewline < 150) {
    return text.substring(0, firstNewline);
  }
  if (text.length > 150) {
    // Suche rückwärts nach einem Wortende
    let cutPoint = 150;
    for (let i = 150; i > 100; i--) {
      if (text[i] === ' ' || text[i] === '.' || text[i] === ',' || text[i] === '!' || text[i] === '?') {
        cutPoint = i + 1;
        break;
      }
    }
    return text.substring(0, cutPoint);
  }
  return text;
};
```

**Wichtig:**
- Maximal 150 Zeichen
- Oder bis zum ersten Zeilenumbruch
- Immer nach einem Wortende schneiden (nicht mitten im Wort)

### 3. hasMoreContent Berechnung

```typescript
const fullText = getPlainTextPreview(item.descriptionContent || '');
const firstLine = getFirstLine(fullText);
const hasMoreContent = fullText.length > firstLine.length || fullText.includes('\n');
```

**Wichtig:**
- Prüft ob Text länger als erste Zeile ist
- Oder ob Zeilenumbruch vorhanden ist

### 4. remainingPlainText Berechnung

```typescript
const getRemainingText = (text: string, firstLineText: string): string => {
  if (!text || !firstLineText) return '';
  
  const firstLineIndex = text.indexOf(firstLineText);
  if (firstLineIndex === -1) {
    // Fallback: Versuche Zeilenumbruch zu finden
    const firstNewline = text.indexOf('\n');
    if (firstNewline > 0) {
      return text.substring(firstNewline + 1).trim();
    }
    // Wenn kein Zeilenumbruch, nimm Rest nach der ersten Zeile
    return text.length > firstLineText.length ? text.substring(firstLineText.length).trim() : '';
  }
  
  // Wenn Zeilenumbruch vorhanden, nimm alles danach
  const firstNewline = text.indexOf('\n', firstLineIndex);
  if (firstNewline > 0) {
    return text.substring(firstNewline + 1).trim();
  }
  
  // Wenn keine Zeilenumbruch, nimm Rest nach der ersten Zeile
  const remainingStart = firstLineIndex + firstLineText.length;
  return text.length > remainingStart 
    ? text.substring(remainingStart).trim() 
    : '';
};

const remainingPlainText = hasMoreContent ? getRemainingText(fullText, firstLine) : '';
```

**Wichtig:**
- Berechnet den REST-Text nach der ersten Zeile
- Berücksichtigt Zeilenumbrüche
- Fallback wenn erste Zeile nicht gefunden wird

### 5. Bilder-Erkennung

```typescript
const hasImages = /!\[([^\]]*)\]\([^)]+\)/.test(fullDescriptionContent);
```

**Wichtig:**
- Prüft ob Bilder im gesamten Text vorhanden sind
- Unabhängig von `remainingPlainText`

### 6. Pfeil-Anzeige

```typescript
const shouldShowExpandButton = hasMoreContent && needsExpansion;
```

**WICHTIG**: 
- Pfeil erscheint NUR wenn mehr Text vorhanden ist
- NICHT wenn nur Bilder vorhanden sind (Bilder werden immer angezeigt)

### 7. Bilder-Anzeige

```typescript
{hasImages && (
  <div 
    className={firstLine.trim() === '' ? '-mt-6' : 'mt-2'} 
    style={{ 
      marginLeft: labelRef.current ? `${labelRef.current.offsetWidth + 8}px` : 'calc(0.75rem * 5 + 0.5rem)'
    }}
  >
    <MarkdownPreview 
      content={fullDescriptionContent} 
      showImagePreview={true}
      attachmentMetadata={item.attachmentMetadata || []}
    />
  </div>
)}
```

**Wichtig:**
- Bilder werden IMMER angezeigt (auch wenn nicht expanded)
- Wenn kein Text vorhanden ist (`firstLine.trim() === ''`), wird das Bild mit `-mt-6` nach oben gerückt (auf Höhe des Labels)
- Wenn Text vorhanden ist, wird `mt-2` verwendet

### 8. REST-Text-Anzeige

```typescript
{isExpanded && hasMoreContent && (() => {
  let restContent = '';
  
  // Versuche zuerst remainingPlainText (einfachste Methode)
  if (remainingPlainText && remainingPlainText.trim() !== '') {
    restContent = remainingPlainText;
  }
  // Fallback: Schneide einfach nach firstLine.length im Plain Text
  else if (fullText.length > firstLine.length) {
    restContent = fullText.substring(firstLine.length).trim();
  }
  
  // Zeige REST-Text wenn vorhanden
  if (restContent && restContent.trim() !== '') {
    return (
      <div 
        className="mt-1" 
        style={{ 
          marginLeft: labelRef.current ? `${labelRef.current.offsetWidth + 8}px` : 'calc(0.75rem * 5 + 0.5rem)'
        }}
      >
        <div className="dark:text-gray-200 break-words text-gray-900 dark:text-white">
          {restContent.trim()}
        </div>
      </div>
    );
  }
  
  return null;
})()}
```

**Wichtig:**
- REST-Text wird nur angezeigt, wenn `isExpanded && hasMoreContent` ist
- Verwendet `remainingPlainText` wenn vorhanden
- Fallback: Schneidet einfach nach `firstLine.length`
- Verwendet `break-words` für bessere Textumbrüche

### 9. Buttons-Positionierung

```typescript
{actions ? (
  <div
    className="flex items-center space-x-2 flex-shrink-0 self-end"
    onClick={(e) => e.stopPropagation()}
  >
    {actions}
  </div>
) : (
  <div />
)}
```

**Wichtig:**
- `self-end` sorgt dafür, dass Buttons immer an der unteren rechten Ecke sind

## Fallstricke und Lösungen

### Fallstrick 1: Doppelte Anzeige des gesamten Textes

**Problem:** Der gesamte Text wurde immer angezeigt, auch wenn nicht expanded.

**Ursache:**
- `MarkdownPreview` wurde immer angezeigt, auch wenn nicht expanded
- REST-Text wurde nicht korrekt getrennt

**Lösung:**
- Bilder werden immer angezeigt (unabhängig von expanded)
- REST-Text wird nur angezeigt, wenn `isExpanded && hasMoreContent` ist

### Fallstrick 2: REST-Text wird nicht angezeigt

**Problem:** Beim Ausklappen wurde der REST-Text nicht angezeigt.

**Ursache:**
- `remainingPlainText` war leer
- `remainingMarkdown` war leer
- Keine Fallback-Logik vorhanden

**Lösung:**
- Mehrere Fallbacks implementiert
- Garantie: Wenn `hasMoreContent` true ist, wird REST-Text immer angezeigt
- Fallback: Schneidet einfach nach `firstLine.length`

### Fallstrick 3: Bilder werden nicht angezeigt

**Problem:** Bilder wurden nicht angezeigt, wenn nur Bilder vorhanden waren (kein Text).

**Ursache:**
- Bilder wurden nur angezeigt, wenn `isExpanded` true war
- `hasMoreContent` war false, wenn kein Text vorhanden war

**Lösung:**
- Bilder werden IMMER angezeigt (unabhängig von expanded)
- `hasImages` wird separat geprüft

### Fallstrick 4: Pfeil erscheint nicht

**Problem:** Der Pfeil zum Ausklappen erschien nicht, wenn nur Bilder vorhanden waren.

**Ursache:**
- Pfeil wurde nur angezeigt, wenn `hasMoreContent` true war
- `hasMoreContent` war false, wenn nur Bilder vorhanden waren

**Lösung:**
- Pfeil erscheint NUR wenn mehr Text vorhanden ist
- NICHT wenn nur Bilder vorhanden sind (Bilder werden immer angezeigt, kein Pfeil nötig)

### Fallstrick 5: Textumbruch mitten im Wort

**Problem:** Der Text wurde mitten im Wort umbrochen.

**Ursache:**
- `getFirstLine` hat einfach bei 150 Zeichen geschnitten
- Keine Suche nach Wortende

**Lösung:**
- Suche rückwärts nach einem Wortende (Leerzeichen, Punkt, Komma, etc.)
- Schneide immer nach einem Wortende

### Fallstrick 6: Initialisierungsfehler

**Problem:** `Cannot access 'remainingPlainText' before initialization`

**Ursache:**
- Debug-Log verwendete `remainingPlainText` und `remainingMarkdown` vor ihrer Initialisierung

**Lösung:**
- Debug-Log nach der Initialisierung aller Variablen verschoben
- Reihenfolge korrigiert: Variablen werden vor ihrer Verwendung initialisiert

### Fallstrick 7: Bilder-Positionierung

**Problem:** Wenn kein Text vorhanden war, wurde das Bild zu weit unten angezeigt.

**Ursache:**
- `mt-2` wurde immer verwendet
- Keine Anpassung für den Fall ohne Text

**Lösung:**
- Wenn `firstLine.trim() === ''`, wird `-mt-6` verwendet (Bild wird nach oben gerückt)
- Sonst wird `mt-2` verwendet

## Checkliste für neue Implementierungen

### ✅ Initialisierung

- [ ] `getPlainTextPreview` wird verwendet, um Plain Text zu extrahieren
- [ ] `getFirstLine` sucht nach einem Wortende (nicht mitten im Wort)
- [ ] `hasMoreContent` wird korrekt berechnet
- [ ] `remainingPlainText` wird korrekt berechnet
- [ ] `remainingMarkdown` wird korrekt berechnet
- [ ] `hasImages` wird separat geprüft
- [ ] Alle Variablen werden vor ihrer Verwendung initialisiert

### ✅ Anzeige-Logik

- [ ] Erste Zeile wird immer angezeigt
- [ ] Bilder werden immer angezeigt (wenn vorhanden)
- [ ] Pfeil erscheint nur, wenn mehr Text vorhanden ist (nicht nur wegen Bilder)
- [ ] REST-Text wird nur angezeigt, wenn `isExpanded && hasMoreContent` ist
- [ ] Bilder-Positionierung: `-mt-6` wenn kein Text, sonst `mt-2`
- [ ] Buttons haben `self-end` für Positionierung unten rechts

### ✅ Text-Extraktion

- [ ] Plain Text wird korrekt extrahiert (ohne Markdown)
- [ ] Erste Zeile wird nach Wortende geschnitten
- [ ] REST-Text wird korrekt berechnet
- [ ] Fallback-Logik ist vorhanden

## Code-Beispiele

### Vollständiges Beispiel: DescriptionMetadataItem

```typescript
const DescriptionMetadataItem: React.FC<{ item: MetadataItem }> = ({ item }) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsExpansion, setNeedsExpansion] = useState(false);
  const firstLineRef = useRef<HTMLParagraphElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  
  // 1. Plain Text extrahieren
  const getPlainTextPreview = (markdown: string): string => {
    // ... (siehe oben)
  };
  
  const fullText = getPlainTextPreview(item.descriptionContent || '');
  
  // 2. Erste Zeile berechnen (nach Wortende)
  const getFirstLine = (text: string): string => {
    // ... (siehe oben)
  };
  
  const firstLine = getFirstLine(fullText);
  const hasMoreContent = fullText.length > firstLine.length || fullText.includes('\n');
  
  // 3. REST-Text berechnen
  const getRemainingText = (text: string, firstLineText: string): string => {
    // ... (siehe oben)
  };
  
  const remainingPlainText = hasMoreContent ? getRemainingText(fullText, firstLine) : '';
  
  // 4. Bilder-Erkennung
  const fullDescriptionContent = item.descriptionContent || '';
  const hasImages = /!\[([^\]]*)\]\([^)]+\)/.test(fullDescriptionContent);
  
  // 5. Pfeil-Anzeige
  const shouldShowExpandButton = hasMoreContent && needsExpansion;
  
  return (
    <div>
      {/* Erste Zeile */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        <span>{item.label}:</span>
        <span>{firstLine}</span>
        {/* Pfeil */}
        {shouldShowExpandButton && !isExpanded && (
          <button onClick={() => setIsExpanded(true)}>
            <ChevronLeftIcon />
          </button>
        )}
        {isExpanded && (
          <button onClick={() => setIsExpanded(false)}>
            <ChevronDownIcon />
          </button>
        )}
      </div>
      
      {/* Bilder IMMER anzeigen */}
      {hasImages && (
        <div className={firstLine.trim() === '' ? '-mt-6' : 'mt-2'}>
          <MarkdownPreview 
            content={fullDescriptionContent} 
            showImagePreview={true}
            attachmentMetadata={item.attachmentMetadata || []}
          />
        </div>
      )}
      
      {/* REST-Text NUR wenn expanded */}
      {isExpanded && hasMoreContent && (
        <div className="mt-1">
          {remainingPlainText && remainingPlainText.trim() !== '' ? (
            <div className="break-words">
              {remainingPlainText.trim()}
            </div>
          ) : fullText.length > firstLine.length ? (
            <div className="break-words">
              {fullText.substring(firstLine.length).trim()}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
```

## Wichtige Regeln

### 1. Reihenfolge der Initialisierung

**WICHTIG**: Variablen müssen in der richtigen Reihenfolge initialisiert werden:

1. `fullText` (Plain Text)
2. `firstLine` (erste Zeile)
3. `hasMoreContent` (prüft ob mehr Content vorhanden)
4. `remainingPlainText` (REST-Text)
5. `remainingMarkdown` (REST-Markdown)
6. `hasImages` (Bilder-Erkennung)
7. `shouldShowExpandButton` (Pfeil-Anzeige)

**NIEMALS** Variablen vor ihrer Initialisierung verwenden!

### 2. Bilder-Anzeige

- Bilder werden IMMER angezeigt (unabhängig von expanded)
- Positionierung: `-mt-6` wenn kein Text, sonst `mt-2`
- `showImagePreview={true}` verwenden

### 3. Pfeil-Anzeige

- Pfeil erscheint NUR wenn mehr Text vorhanden ist
- NICHT wenn nur Bilder vorhanden sind
- Bedingung: `hasMoreContent && needsExpansion`

### 4. REST-Text-Anzeige

- REST-Text wird nur angezeigt, wenn `isExpanded && hasMoreContent` ist
- Verwendet `remainingPlainText` wenn vorhanden
- Fallback: Schneidet nach `firstLine.length`
- Verwendet `break-words` für bessere Textumbrüche

### 5. Text-Extraktion

- Plain Text muss korrekt extrahiert werden (ohne Markdown)
- Erste Zeile muss nach Wortende geschnitten werden
- REST-Text muss korrekt berechnet werden

## Verwandte Dokumentation

- [IMAGE_PREVIEW_IMPLEMENTATION.md](./IMAGE_PREVIEW_IMPLEMENTATION.md) - Bildvorschau-Implementierung
- [MARKDOWN_PREVIEW_USAGE.md](../implementation_guides/MARKDOWN_PREVIEW_USAGE.md) - MarkdownPreview Verwendung
- [ATTACHMENT_URL_FIX.md](./ATTACHMENT_URL_FIX.md) - Attachment URL-Generierung Fix
- [CARD_VIEW_IMPLEMENTATION_GUIDE.md](../implementation_guides/CARD_VIEW_IMPLEMENTATION_GUIDE.md) - Card-Ansicht Implementierung

## Zusammenfassung

Die expandierbare Beschreibung in DataCard folgt diesen Prinzipien:

1. **Trennung von Anzeige und Logik**: Erste Zeile, Bilder und REST-Text werden getrennt behandelt
2. **Wortende-Suche**: Text wird immer nach einem Wortende geschnitten
3. **Bilder immer sichtbar**: Bilder werden immer angezeigt, unabhängig von expanded
4. **Pfeil nur bei Text**: Pfeil erscheint nur, wenn mehr Text vorhanden ist
5. **Robuste Fallbacks**: Mehrere Fallbacks garantieren, dass REST-Text immer angezeigt wird
6. **Korrekte Initialisierung**: Variablen werden in der richtigen Reihenfolge initialisiert

Durch Befolgen dieser Anleitung können neue Implementierungen ohne die beschriebenen Fallstricke umgesetzt werden.


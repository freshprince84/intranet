# Cerebro Editor: Komplett-Überarbeitung Plan

## Aktuelle Probleme

1. **Medien-Upload funktioniert nicht:**
   - Frontend sendet `carticleSlug`
   - Backend erwartet `carticleId`
   - Lösung: Backend anpassen, um Slug zu akzeptieren

2. **Editor ist zu komplex:**
   - Separate Bereiche für Medien, Links, etc.
   - User möchte alles in einem Editor (wie Twitter/Chat)

## Neuer Editor-Ansatz

### Ziel: Twitter/Chat-ähnlicher Editor

**Features:**
- Alles in einem Editor-Fenster
- Drag & Drop für Medien (Bilder, Videos, PDFs)
- Link-Erkennung beim Einfügen/Kopieren
- Automatische Vorschau von Medien und Links direkt im Editor
- WYSIWYG-ähnlich, aber mit automatischer Erkennung

### Implementierung

#### 1. Upload-Problem beheben (SOFORT)

**Backend:** `backend/src/controllers/cerebroMediaController.ts`
- `uploadMedia` anpassen, um `carticleSlug` zu akzeptieren
- Slug in Artikel-ID umwandeln

**Frontend:** Kann bleiben wie es ist (sendet bereits Slug)

#### 2. Editor komplett umbauen

**Neue Komponente:** `frontend/src/components/cerebro/UnifiedArticleEditor.tsx`

**Features:**
- ReactQuill als Basis (behalten)
- Drag & Drop Handler für Dateien
- Paste Handler für Links und Bilder
- Automatische Erkennung von:
  - Bildern (URLs, Clipboard)
  - Videos (URLs)
  - Links (URLs)
  - PDFs (URLs)
- Vorschau-Komponenten inline im Editor
- Speichern: Medien/Links automatisch verknüpfen

**Technische Details:**
- Drag & Drop: `onDrop` Handler auf Editor-Bereich
- Paste: `onPaste` Handler für Clipboard-Events
- Link-Erkennung: Regex für URLs
- Bild-Erkennung: Prüfen ob URL auf Bild endet
- Upload: Automatisch beim Drag/Drop oder Paste

#### 3. Vereinfachte Struktur

**Entfernen:**
- `AddMedia.tsx` (nicht mehr nötig)
- `AddExternalLink.tsx` (nicht mehr nötig)
- Separate Routes für Medien/Links hinzufügen

**Behalten:**
- `ArticleEdit.tsx` wird zu `UnifiedArticleEditor.tsx` umgebaut
- Oder: `ArticleEdit.tsx` verwendet neuen `UnifiedArticleEditor`

## Implementierungsreihenfolge

1. **Upload-Problem beheben** (5 Minuten)
2. **Unified Editor erstellen** (2-3 Stunden)
3. **Alte Komponenten entfernen** (30 Minuten)

## Vorschau-Komponenten

### Medien-Vorschau (inline im Editor)
- Kleine Thumbnail-Vorschau
- Bei Klick: größere Ansicht
- X-Button zum Entfernen

### Link-Vorschau (inline im Editor)
- Automatische Meta-Tag-Extraktion
- Titel, Thumbnail, Beschreibung
- Bei Klick: extern öffnen









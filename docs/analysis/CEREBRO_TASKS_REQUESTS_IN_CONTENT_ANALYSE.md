# Analyse: Tasks & Requests direkt im Artikel-Content anzeigen

## Aktueller Stand

### Datenstruktur
- `CerebroArticleDetail` enthält:
  - `tasks: { id: string, title: string }[]`
  - `requests: { id: string, title: string }[]`
- Backend lädt Tasks/Requests mit `include: { tasks: true, requests: true }`
- Frontend zeigt aktuell:
  - Statische Karten unten: "Verknüpfte Tasks" / "Verknüpfte Requests"
  - Immer "Keine Tasks verknüpft" / "Keine Requests verknüpft" (hardcoded)

### Code-Stellen
- `frontend/src/components/cerebro/ArticleView.tsx`:
  - Zeilen 323-334: Statische Karten für Tasks/Requests
  - Zeilen 144-148: `MarkdownPreview` rendert `article.content`
- `backend/src/controllers/cerebroController.ts`:
  - Zeilen 239-240: `include: { tasks: true, requests: true }`
  - Tasks/Requests werden geladen, aber nur `id` und `title` zurückgegeben

### MarkdownPreview
- `frontend/src/components/MarkdownPreview.tsx`:
  - Erkennt Attachment-URLs (`/api/tasks/...` oder `/api/requests/...`)
  - Erkennt externe Links und rendert sie als Web-Vorschau
  - **KEINE** Erkennung für Task/Request-Links im Markdown

## Anforderung

1. Tasks & Requests direkt im Artikel-Content (Markdown) anzeigen
2. Hervorgehoben und als Vorschau darstellen
3. Separaten Karten-Bereich unten entfernen

## Optionen

### Option 1: Tasks/Requests automatisch aus `article.tasks`/`article.requests` rendern
**Vorgehen:**
- Tasks/Requests werden automatisch am Ende des Contents gerendert (vor Medien)
- Vorschau-Karten ähnlich wie externe Links
- Keine Markdown-Links erforderlich

**Vorteile:**
- Einfach zu implementieren
- Keine Markdown-Änderungen nötig
- Konsistent mit Datenbank-Verknüpfungen

**Nachteile:**
- Nicht im Markdown-Text integriert
- Position nicht frei wählbar

### Option 2: Markdown-Links erkennen und als Vorschau rendern
**Vorgehen:**
- MarkdownPreview erkennt Links wie `[Task: Titel](/app/tasks/123)` oder `[Request: Titel](/app/requests/123)`
- Diese werden als Vorschau-Karten gerendert (ähnlich externe Links)
- Zusätzlich: Automatische Anzeige von `article.tasks`/`article.requests` wenn nicht im Markdown vorhanden

**Vorteile:**
- Flexibel: Position im Text wählbar
- Konsistent mit externen Links
- Kann mit automatischer Anzeige kombiniert werden

**Nachteile:**
- Komplexer: Markdown-Parsing nötig
- Zwei Quellen: Markdown-Links + DB-Verknüpfungen

### Option 3: Hybrid (empfohlen)
**Vorgehen:**
- Automatische Anzeige von `article.tasks`/`article.requests` als Vorschau-Karten
- Position: Direkt nach dem Markdown-Content, vor den Medien
- Markdown-Links werden zusätzlich erkannt (falls vorhanden)
- Separaten Karten-Bereich entfernen

**Vorteile:**
- Einfach zu implementieren
- Flexibel (Markdown-Links möglich)
- Konsistent mit bestehenden Patterns

## Empfohlene Lösung: Option 3 (Hybrid)

### Implementierungsschritte

#### 1. Task/Request-Vorschau-Komponente erstellen
- Neue Komponente: `TaskRequestPreview.tsx`
- Rendert Task/Request als Karte mit:
  - Titel
  - Link zu `/app/tasks/{id}` oder `/app/requests/{id}`
  - Icon (Task/Request)
  - Hover-Effekt

#### 2. MarkdownPreview erweitern
- Erkennung von Task/Request-Links:
  - Pattern: `[Task: Titel](/app/tasks/123)` oder `[Request: Titel](/app/requests/123)`
  - Oder: `[Titel](/app/tasks/123)` (automatische Erkennung via URL)
- Rendern als Vorschau-Karte (ähnlich externe Links)

#### 3. ArticleView anpassen
- Automatische Anzeige von `article.tasks`/`article.requests`:
  - Nach Markdown-Content, vor Medien
  - Als Vorschau-Karten
- Separaten Karten-Bereich entfernen (Zeilen 323-334)

#### 4. Styling
- Vorschau-Karten:
  - Border, rounded corners
  - Hover-Effekt
  - Icon + Titel
  - Link zu Task/Request
  - Dark Mode Support

### Dateien zu ändern

1. **`frontend/src/components/cerebro/ArticleView.tsx`**
   - `renderContent()` erweitern: Tasks/Requests nach Content rendern
   - Karten-Bereich entfernen (Zeilen 323-334)

2. **`frontend/src/components/MarkdownPreview.tsx`** (optional)
   - Task/Request-Link-Erkennung hinzufügen
   - Vorschau-Rendering für Task/Request-Links

3. **`frontend/src/components/cerebro/TaskRequestPreview.tsx`** (neu)
   - Komponente für Task/Request-Vorschau

4. **`frontend/src/i18n/locales/*.json`**
   - Übersetzungen für "Verknüpfte Tasks" / "Verknüpfte Requests"

### Datenfluss

```
Backend (cerebroController.ts)
  ↓ include: { tasks: true, requests: true }
Frontend (cerebroApi.ts)
  ↓ CerebroArticleDetail.tasks / .requests
ArticleView.tsx
  ↓ renderContent()
    - MarkdownPreview (Content)
    - TaskRequestPreview (article.tasks)
    - TaskRequestPreview (article.requests)
    - Media (article.media)
```

## Wie werden Tasks/Requests verknüpft?

### Aktueller Stand
- **Tasks:** ✅ Verknüpfung von Task-Modal aus möglich
  - User öffnet Task-Modal → "Cerebro" Tab → `CerebroArticleSelector` → Artikel auswählen
  - Backend: `POST /api/tasks/:taskId/carticles/:carticleId`
  - Verknüpfung wird in `TaskCerebroCarticle` gespeichert

- **Requests:** ⚠️ Datenmodell vorhanden, aber KEINE Frontend-Integration
  - Datenmodell: `RequestCerebroCarticle` existiert
  - Backend: Keine API-Endpunkte gefunden (müssen implementiert werden)
  - Frontend: Keine UI in Request-Modals

- **Von Artikel-Seite:** ❌ NICHT möglich
  - Keine UI in `ArticleView.tsx` oder `ArticleEdit.tsx`
  - Keine Buttons/Selektoren für Tasks/Requests

### Lösung: Zwei Wege

#### Weg 1: Weiterhin von Task/Request-Seite (wie bisher)
- User verknüpft von Task/Request-Modal aus
- Artikel zeigt verknüpfte Tasks/Requests automatisch an

#### Weg 2: Zusätzlich von Artikel-Seite (NEU)
- Neue UI in `ArticleView.tsx` oder `ArticleEdit.tsx`
- Task/Request-Selektor (ähnlich `CerebroArticleSelector`, aber umgekehrt)
- Buttons: "Task verknüpfen" / "Request verknüpfen"
- Backend-API-Endpunkte nötig:
  - `POST /api/cerebro/carticles/:carticleId/tasks/:taskId`
  - `POST /api/cerebro/carticles/:carticleId/requests/:requestId`
  - `DELETE /api/cerebro/carticles/:carticleId/tasks/:taskId`
  - `DELETE /api/cerebro/carticles/:carticleId/requests/:requestId`

### Empfehlung: Weg 1 + Weg 2 (beide Optionen)
- Bestehende Funktionalität beibehalten (von Task/Request-Seite)
- Zusätzlich: Neue UI von Artikel-Seite aus
- Flexibler für User

## Offene Fragen

1. **Verknüpfung:** Soll von Artikel-Seite aus verknüpft werden können?
   - **Empfehlung:** Ja, zusätzlich zu bestehender Funktionalität

2. **Position:** Sollen Tasks/Requests automatisch nach dem Content angezeigt werden, oder nur wenn im Markdown verlinkt?
   - **Empfehlung:** Automatisch nach Content (einfacher, konsistent)

3. **Styling:** Sollen Tasks/Requests wie externe Links aussehen, oder anders?
   - **Empfehlung:** Ähnlich externe Links, aber mit Task/Request-Icon

4. **Markdown-Links:** Sollen Markdown-Links zu Tasks/Requests erkannt werden?
   - **Empfehlung:** Nein, nur automatische Anzeige von DB-Verknüpfungen (einfacher)

## Nächste Schritte

1. ✅ Analyse abgeschlossen
2. ⏳ Plan erstellt
3. ⏳ Implementierung (nach User-Feedback)


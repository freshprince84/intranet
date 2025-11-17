# Implementierungsplan: Cerebro High-Priority Features

## Überblick
Dieser Plan beschreibt die Umsetzung der 3 High-Priority-Features für das Cerebro-System:
1. Tag-System (komplette Implementierung)
2. Publishing/Workflow vervollständigen
3. Request-Integration (Frontend)

---

## 1. Tag-System implementieren

### Status
- ✅ Datenmodell vorhanden (`CerebroTag`)
- ❌ Backend API fehlt komplett
- ❌ Frontend UI fehlt komplett

### Backend-Implementierung

#### 1.1 Controller erstellen: `backend/src/controllers/cerebroTagsController.ts`

**Endpunkte:**
- `GET /api/cerebro/tags` - Alle Tags abrufen
  - Rückgabe: Array von Tags mit `id`, `name`, `createdAt`, `_count.carticles`
  - Sortierung: nach Name alphabetisch
  
- `GET /api/cerebro/tags/:id` - Einzelnen Tag abrufen
  - Rückgabe: Tag mit zugehörigen Artikeln
  
- `POST /api/cerebro/tags` - Neuen Tag erstellen
  - Request Body: `{ name: string }`
  - Validierung: Name muss eindeutig sein, nicht leer
  - Berechtigung: `cerebro.write`
  
- `PUT /api/cerebro/tags/:id` - Tag bearbeiten
  - Request Body: `{ name: string }`
  - Validierung: Name muss eindeutig sein (außer aktuellem Tag)
  - Berechtigung: `cerebro.write`
  
- `DELETE /api/cerebro/tags/:id` - Tag löschen
  - Prüft, ob Tag noch verwendet wird (Verknüpfungen)
  - Berechtigung: `cerebro.write`
  
- `GET /api/cerebro/carticles/:id/tags` - Tags eines Artikels abrufen
  - Rückgabe: Array von Tags des Artikels
  
- `POST /api/cerebro/carticles/:id/tags` - Tags zu Artikel hinzufügen
  - Request Body: `{ tagIds: number[] }`
  - Berechtigung: `cerebro.write`
  
- `DELETE /api/cerebro/carticles/:id/tags/:tagId` - Tag von Artikel entfernen
  - Berechtigung: `cerebro.write`

#### 1.2 Routes hinzufügen: `backend/src/routes/cerebro.ts`

Neue Routes:
```typescript
// Tag-Routen
router.get('/tags', cerebroTagsController.getAllTags);
router.get('/tags/:id', cerebroTagsController.getTagById);
router.post('/tags', authenticateToken, checkPermission('cerebro', 'write'), cerebroTagsController.createTag);
router.put('/tags/:id', authenticateToken, checkPermission('cerebro', 'write'), cerebroTagsController.updateTag);
router.delete('/tags/:id', authenticateToken, checkPermission('cerebro', 'write'), cerebroTagsController.deleteTag);

// Artikel-Tag-Verknüpfungen
router.get('/carticles/:id/tags', cerebroTagsController.getArticleTags);
router.post('/carticles/:id/tags', authenticateToken, checkPermission('cerebro', 'write'), cerebroTagsController.addTagsToArticle);
router.delete('/carticles/:id/tags/:tagId', authenticateToken, checkPermission('cerebro', 'write'), cerebroTagsController.removeTagFromArticle);
```

#### 1.3 API-Client erweitern: `frontend/src/api/cerebroApi.ts`

Neue Funktionen:
```typescript
// Tags API
const tagsApi = {
  getAllTags: async (): Promise<CerebroTag[]>
  getTagById: async (id: string): Promise<CerebroTag>
  createTag: async (name: string): Promise<CerebroTag>
  updateTag: async (id: string, name: string): Promise<CerebroTag>
  deleteTag: async (id: string): Promise<void>
  getArticleTags: async (carticleId: string): Promise<CerebroTag[]>
  addTagsToArticle: async (carticleId: string, tagIds: string[]): Promise<void>
  removeTagFromArticle: async (carticleId: string, tagId: string): Promise<void>
}

// In cerebroApi export hinzufügen:
export const cerebroApi = {
  articles: articlesApi,
  media: mediaApi,
  externalLinks: externalLinksApi,
  tags: tagsApi, // NEU
};
```

Neue Interfaces:
```typescript
export interface CerebroTag {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  articleCount?: number;
}
```

### Frontend-Implementierung

#### 1.4 Tag-Selektor-Komponente: `frontend/src/components/cerebro/TagSelector.tsx`

Features:
- Multi-Select für Tags
- Autocomplete mit bestehenden Tags
- Möglichkeit, neue Tags zu erstellen
- Anzeige bereits ausgewählter Tags als Chips
- Entfernen von Tags per X-Button

#### 1.5 ArticleEdit erweitern: `frontend/src/components/cerebro/ArticleEdit.tsx`

Änderungen:
- Tag-Selektor einfügen
- Tags beim Laden des Artikels abrufen
- Tags beim Speichern mitsenden
- Tags beim Erstellen/Updaten verwalten

#### 1.6 ArticleView erweitern: `frontend/src/components/cerebro/ArticleView.tsx`

Änderungen:
- Tags anzeigen als Chips/Badges unter dem Titel
- Klickbare Tags → Filter nach Tag in ArticleList
- Optional: Farbschema für Tags

#### 1.7 ArticleList erweitern: `frontend/src/components/cerebro/ArticleList.tsx`

Änderungen:
- Tag-Filter hinzufügen
- Multi-Tag-Filter (mehrere Tags auswählbar)
- Tag-Badges in der Artikel-Liste anzeigen

#### 1.8 API-Endpunkte in `frontend/src/config/api.ts`

Hinzufügen:
```typescript
CEREBRO: {
  // ... bestehende Endpunkte
  TAGS: {
    BASE: '/cerebro/tags',
    BY_ID: (id: number) => `/cerebro/tags/${id}`,
    ARTICLE_TAGS: (carticleId: number) => `/cerebro/carticles/${carticleId}/tags`,
  }
}
```

---

## 2. Publishing/Workflow vervollständigen

### Status
- ✅ `isPublished` Feld vorhanden (default: false)
- ❌ Backend-Filterung fehlt
- ❌ Frontend-UI fehlt

### Backend-Implementierung

#### 2.1 Controller anpassen: `backend/src/controllers/cerebroController.ts`

**Änderungen in bestehenden Endpunkten:**

- `getAllArticles`: 
  - Query-Parameter `includeDrafts?: boolean` hinzufügen
  - Wenn nicht authentifiziert ODER `includeDrafts !== true`: Nur `isPublished = true` anzeigen
  - Wenn authentifiziert UND Ersteller/Admin: Eigene Entwürfe auch anzeigen
  - Wenn Admin: Alle Entwürfe anzeigen

- `getArticleBySlug` / `getArticleById`:
  - Wenn nicht authentifiziert: Nur `isPublished = true` zurückgeben (404 wenn Entwurf)
  - Wenn authentifiziert UND Ersteller/Admin: Entwürfe auch anzeigen
  - Wenn Admin: Alle Entwürfe anzeigen

- `getArticlesStructure`:
  - Nur veröffentlichte Artikel in Struktur aufnehmen (außer für Ersteller/Admin)

- `searchArticles`:
  - Standardmäßig nur veröffentlichte Artikel
  - Query-Parameter `includeDrafts?: boolean`

- `createArticle`:
  - `isPublished` aus Request Body übernehmen (default: false)
  
- `updateArticle`:
  - `isPublished` kann gesetzt werden

#### 2.2 Helper-Funktion für Berechtigungsprüfung

Neue Funktion in `cerebroController.ts`:
```typescript
const canViewDraft = async (userId: number, article: CerebroCarticle): Promise<boolean> => {
  // Admin kann alle Entwürfe sehen
  // Ersteller kann eigene Entwürfe sehen
  // Ansonsten nur veröffentlichte Artikel
}
```

### Frontend-Implementierung

#### 2.3 ArticleEdit erweitern: `frontend/src/components/cerebro/ArticleEdit.tsx`

Änderungen:
- Checkbox "Veröffentlicht" (`isPublished`)
- Preview-Button (öffnet Artikel-Ansicht ohne Navigation)
- Status-Anzeige (Entwurf / Veröffentlicht)
- Warnung beim Speichern als Entwurf

#### 2.4 ArticleList erweitern: `frontend/src/components/cerebro/ArticleList.tsx`

Änderungen:
- Filter-Toggle "Nur veröffentlichte Artikel" / "Alle Artikel"
- Entwürfe visuell kennzeichnen (z.B. grauer Hintergrund, "Entwurf"-Badge)
- Optional: Separate Ansicht "Meine Entwürfe"

#### 2.5 ArticleView erweitern: `frontend/src/components/cerebro/ArticleView.tsx`

Änderungen:
- Warnung anzeigen, wenn Artikel ein Entwurf ist (nur für Ersteller/Admin)
- "Als Entwurf speichern" / "Veröffentlichen" Button (wenn Edit-Berechtigung)

---

## 3. Request-Integration (Frontend)

### Status
- ✅ Datenmodell vorhanden (`RequestCerebroCarticle`)
- ❓ Backend API zu prüfen
- ❌ Frontend fehlt komplett

### Schritt 1: Backend API prüfen

#### 3.1 Request-Controller prüfen: `backend/src/controllers/requestController.ts`

Prüfen, ob bereits Endpunkte existieren:
- `GET /api/requests/:id/carticles` - Verknüpfte Artikel abrufen
- `POST /api/requests/:requestId/carticles/:carticleId` - Artikel verknüpfen
- `DELETE /api/requests/:requestId/carticles/:carticleId` - Verknüpfung entfernen

Falls nicht vorhanden: Implementieren analog zu Task-Integration

#### 3.2 Request-Routes prüfen: `backend/src/routes/requests.ts`

Falls Endpunkte fehlen: Hinzufügen analog zu Task-Routes

### Frontend-Implementierung

#### 3.3 Request-Modals identifizieren

Dateien finden:
- `CreateRequestModal.tsx` (falls vorhanden)
- `EditRequestModal.tsx` (falls vorhanden)
- Request-Detail-Komponente

#### 3.4 CerebroArticleSelector integrieren

Änderungen analog zu Task-Modals:
- `CerebroArticleSelector` in Request-Modals einfügen
- State für verknüpfte Artikel
- Funktionen zum Hinzufügen/Entfernen
- API-Calls für Verknüpfungen

#### 3.5 API-Endpunkte hinzufügen: `frontend/src/config/api.ts`

```typescript
REQUESTS: {
  // ... bestehende Endpunkte
  CEREBRO: {
    BY_REQUEST: (requestId: number) => `/requests/${requestId}/carticles`,
    LINK: (requestId: number, carticleId: number) => `/requests/${requestId}/carticles/${carticleId}`,
  }
}
```

#### 3.6 Request-API erweitern: `frontend/src/api/requestApi.ts` (falls vorhanden)

Oder neue Funktionen hinzufügen.

---

## Implementierungsreihenfolge

### Phase 1: Tag-System (Höchste Priorität)
1. Backend Controller erstellen
2. Routes hinzufügen
3. API-Client erweitern
4. TagSelector-Komponente erstellen
5. ArticleEdit erweitern
6. ArticleView erweitern
7. ArticleList erweitern

### Phase 2: Publishing/Workflow
1. Backend Filterung implementieren
2. Helper-Funktionen
3. ArticleEdit erweitern
4. ArticleList erweitern
5. ArticleView erweitern

### Phase 3: Request-Integration
1. Backend API prüfen/implementieren
2. Request-Modals identifizieren
3. CerebroArticleSelector integrieren
4. Testing

---

## Testing-Checkliste

### Tag-System
- [ ] Tags erstellen/löschen
- [ ] Tags zu Artikel hinzufügen/entfernen
- [ ] Tag-Filter in ArticleList
- [ ] Tag-Anzeige in ArticleView
- [ ] Berechtigungen (nur mit write-Berechtigung)

### Publishing
- [ ] Entwürfe werden nicht öffentlich angezeigt
- [ ] Ersteller sieht eigene Entwürfe
- [ ] Admin sieht alle Entwürfe
- [ ] Veröffentlichungs-Status kann geändert werden

### Request-Integration
- [ ] Artikel können mit Requests verknüpft werden
- [ ] Verknüpfte Artikel werden angezeigt
- [ ] Verknüpfungen können entfernt werden

---

## Geschätzte Komplexität

- **Tag-System:** ~6-8 Stunden
- **Publishing:** ~3-4 Stunden
- **Request-Integration:** ~2-3 Stunden

**Gesamt:** ~11-15 Stunden

---

## Offene Fragen

1. Soll für Tags ein Farbsystem implementiert werden? (aktuell nur `name` im Schema)
2. Sollen Tags von allen Usern erstellt werden können oder nur Admins?
3. Wie sollen Entwürfe in der Struktur-Navigation behandelt werden? (Gar nicht / Grau / Separater Bereich)
4. Sollen verknüpfte Cerebro-Artikel auch in der Request-Detail-Ansicht angezeigt werden?

---

## Nächste Schritte

Nach Bestätigung des Plans:
1. Mit Tag-System beginnen
2. Schritt für Schritt implementieren
3. Nach jeder Phase testen
4. Dokumentation aktualisieren




















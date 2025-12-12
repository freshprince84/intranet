# Bildgenerierung als Standard-Funktionalität - Implementierungsplan

**Datum:** 2025-01-22  
**Status:** 📋 Planungsphase  
**Priorität:** Hoch

---

## 📋 ÜBERSICHT

Die Bildgenerierung mit Gemini API (Nano Banana) soll als **Standard-Funktionalität** im System implementiert werden, die an verschiedenen Stellen verwendet werden kann. Der erste Use Case ist die automatische Bildgenerierung für Touren.

**Anforderungen:**
- Code darf nicht kompliziert werden
- Performance darf nicht beeinträchtigt werden
- Standard-Implementierung für Wiederverwendbarkeit
- Erster Use Case: Button in Card/Table-Ansicht für Tour-Bildgenerierung

---

## 🔍 ANALYSE DER BESTEHENDEN IMPLEMENTIERUNG

### 1. Aktuelle Bildgenerierungs-Implementierung

#### 1.1 Backend Service
**Datei:** `backend/src/services/geminiImageService.ts`

**Aktueller Stand:**
- Service-Klasse `GeminiImageService` mit statischen Methoden
- `generateImage()`: Generiert einzelnes Bild aus Prompt
- `generateTourImages()`: Spezifische Methode für Tours (generiert Hauptbild, 3 Galerie-Bilder, Flyer)
- Verwendet Gemini API (`gemini-2.5-flash-image`)
- Speichert Bilder direkt in `backend/uploads/tours/`
- API-Key aus `process.env.GEMINI_API_KEY` oder Parameter

**Probleme:**
- ❌ `generateTourImages()` ist zu spezifisch für Tours
- ❌ Hardcoded Pfade (`../../uploads/tours`)
- ❌ Keine Wiederverwendbarkeit für andere Entitäten
- ❌ Keine Queue-Integration (blockiert Request)
- ❌ Keine Fehlerbehandlung für API-Limits

#### 1.2 Script für manuelle Generierung
**Datei:** `backend/scripts/generateTourImages.ts`

**Aktueller Stand:**
- CLI-Script für manuelle Bildgenerierung
- Lädt Tour-Daten aus DB oder verwendet Fallback-Daten
- Ruft `GeminiImageService.generateTourImages()` auf
- Zeigt Dateigrößen und Speicherorte

**Probleme:**
- ❌ Nur für manuelle Nutzung, nicht für Frontend-Integration
- ❌ Keine API-Integration

---

### 2. Tour-Controller und Routes

#### 2.1 Bild-Upload-Endpunkte
**Datei:** `backend/src/controllers/tourController.ts`

**Bestehende Endpunkte:**
- `POST /api/tours/:id/image` - Hauptbild hochladen (Multer)
- `POST /api/tours/:id/gallery` - Galerie-Bild hinzufügen (Multer)
- `GET /api/tours/:id/image` - Hauptbild abrufen
- `GET /api/tours/:id/gallery/:index` - Galerie-Bild abrufen
- `DELETE /api/tours/:id/gallery/:imageIndex` - Galerie-Bild löschen

**Standards:**
- ✅ Verwendet Multer für File-Upload
- ✅ Speichert in `backend/uploads/tours/`
- ✅ URL-Format: `/uploads/tours/{filename}`
- ✅ Berechtigungsprüfung mit `checkUserPermission('tour_edit', 'write', 'button')`
- ✅ Alte Bilder werden gelöscht beim Upload neuer Bilder

#### 2.2 Route-Registrierung
**Datei:** `backend/src/routes/tours.ts`

**Standards:**
- ✅ GET-Routen vor POST-Routen (damit `:id` nicht mit `/image` kollidiert)
- ✅ Auth-Middleware für alle Routen außer Export
- ✅ Organization-Middleware für alle Routen

---

### 3. Frontend Tour-Implementierung

#### 3.1 Tour-Erstellung
**Datei:** `frontend/src/components/tours/CreateTourModal.tsx`

**Aktueller Ablauf:**
1. Formular ausfüllen
2. `POST /api/tours` → Tour erstellen
3. Falls `imageFile` vorhanden: `POST /api/tours/:id/image` → Bild hochladen
4. Falls `galleryFiles` vorhanden: Für jedes Bild `POST /api/tours/:id/gallery`
5. Tour-Daten neu laden

**Standards:**
- ✅ Verwendet `axiosInstance` für API-Calls
- ✅ Verwendet `useMessage()` für Feedback
- ✅ Loading-States mit `uploadingImage`
- ✅ Error-Handling mit try/catch

#### 3.2 Tour-Anzeige (Card/Table)
**Datei:** `frontend/src/components/tours/ToursTab.tsx`

**Card-Ansicht (Zeile 912-989):**
- Grid-Layout: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- Card-Struktur:
  - Titel + Status-Badge
  - Beschreibung (line-clamp-2)
  - Type + Price
  - Action-Buttons (Edit)
- **KEIN Bild wird aktuell angezeigt**

**Table-Ansicht (Zeile 738-888):**
- Standard-Tabellen-Struktur
- Spalten: title, type, price, location, duration, branch, createdBy, isActive, actions
- Action-Buttons: Details, Edit
- **KEIN Bild wird aktuell angezeigt**

**Standards:**
- ✅ Verwendet `hasPermission()` für Button-Sichtbarkeit
- ✅ Action-Buttons mit Icons (Heroicons)
- ✅ Hover-Tooltips für Buttons
- ✅ Loading-States mit `toursLoading`
- ✅ Error-Handling mit `toursError`

#### 3.3 API-Endpunkte
**Datei:** `frontend/src/config/api.ts`

**Bestehende Endpunkte:**
```typescript
TOURS: {
    BASE: '/tours',
    BY_ID: (id: number) => `/tours/${id}`,
    BOOKINGS: (id: number) => `/tours/${id}/bookings`,
    EXPORT: '/tours/export',
    TOGGLE_ACTIVE: (id: number) => `/tours/${id}/toggle-active`,
    UPLOAD_IMAGE: (id: number) => `/tours/${id}/image`,
    UPLOAD_GALLERY: (id: number) => `/tours/${id}/gallery`,
    DELETE_GALLERY_IMAGE: (id: number, imageIndex: number) => `/tours/${id}/gallery/${imageIndex}`
}
```

**Standards:**
- ✅ Funktionen für dynamische IDs
- ✅ Konsistente Namenskonvention

---

### 4. Queue-System (für Performance)

#### 4.1 Bestehende Queue-Implementierung
**Datei:** `backend/src/services/queueService.ts`

**Verwendete Queues:**
- `reservationQueue` - Für Reservation-Erstellung
- `paymentQueue` - Für Payment-Links
- `notificationQueue` - Für Notifications

**Standards:**
- ✅ Verwendet BullMQ mit Redis
- ✅ Job-Optionen: attempts, backoff, removeOnComplete
- ✅ Health-Check für Redis-Verbindung
- ✅ Fallback wenn Queue deaktiviert

#### 4.2 Queue-Workers
**Datei:** `backend/src/queues/index.ts`

**Standards:**
- ✅ Workers starten automatisch beim Server-Start
- ✅ Concurrency konfigurierbar (`QUEUE_CONCURRENCY`)
- ✅ Error-Handling in Workers

**Vorteil für Bildgenerierung:**
- Bildgenerierung dauert ~10-30 Sekunden pro Bild
- Mit Queue: Frontend erhält sofort Response (<100ms)
- Bilder werden im Hintergrund generiert
- Keine Blockierung des Frontends

---

### 5. Standards und Patterns

#### 5.1 Button-Implementierung
**Standard (aus CODING_STANDARDS.md):**
- ✅ Icons statt Text in Buttons
- ✅ Hover-Tooltips für Accessibility
- ✅ Permission-Checks mit `hasPermission()`
- ✅ Loading-States während Operationen
- ✅ Error-Handling mit `showMessage()`

**Beispiel aus ToursTab.tsx (Zeile 920-946):**
```tsx
<button
    onClick={async () => {
        try {
            await axiosInstance.put(API_ENDPOINTS.TOURS.TOGGLE_ACTIVE(tour.id));
            showMessage(/* ... */, 'success');
            await loadTours();
        } catch (err: any) {
            showMessage(/* ... */, 'error');
        }
    }}
    className={/* ... */}
>
    {tour.isActive ? t('tours.statusActive') : t('tours.statusInactive')}
</button>
```

#### 5.2 API-Call-Pattern
**Standard:**
- ✅ Verwendet `axiosInstance` (mit Auth-Header)
- ✅ Try/Catch für Error-Handling
- ✅ `showMessage()` für User-Feedback
- ✅ Daten nach erfolgreicher Operation neu laden

#### 5.3 Bild-Anzeige
**Standard (aus IMAGE_PREVIEW_IMPLEMENTATION.md):**
- ✅ URL-Format: `${API_URL}${imageUrl}`
- ✅ Lazy-Loading mit `loading="lazy"`
- ✅ Responsive mit `object-contain`
- ✅ Fallback wenn Bild nicht vorhanden

**Aktuell in Tours:**
- ❌ Bilder werden NICHT in Cards angezeigt
- ❌ Nur `imageUrl` Feld vorhanden, aber nicht gerendert

---

## 🎯 USE CASE: TOUR-BILDGENERIERUNG

### Anforderungen

1. **Button in Card/Table-Ansicht:**
   - Button "Bilder generieren" in Tour-Card/Table-Row
   - Nur sichtbar wenn `hasPermission('tour_edit', 'write', 'button')`
   - Button zeigt Loading-State während Generierung

2. **Bildgenerierung:**
   - Generiert Hauptbild + 3 Galerie-Bilder + Flyer
   - Bilder werden direkt in Tour gespeichert
   - Alte Bilder werden ersetzt (falls vorhanden)

3. **Anzeige:**
   - Hauptbild wird in Card angezeigt (falls vorhanden)
   - Bilder werden automatisch aktualisiert nach Generierung

4. **Performance:**
   - Keine Blockierung des Frontends
   - Asynchrone Verarbeitung im Hintergrund

---

## 🏗️ ARCHITEKTUR-ENTSCHEIDUNGEN

### 1. Service-Struktur

**Option A: Generischer Service (EMPFOHLEN)**
```
GeminiImageService
├── generateImage(prompt, outputPath, apiKey) - Basis-Methode
├── generateImages(config) - Generische Methode für mehrere Bilder
└── generateTourImages(tourId, tourData, apiKey) - Tour-spezifisch (Wrapper)
```

**Vorteile:**
- ✅ Wiederverwendbar für andere Entitäten
- ✅ Einfache Erweiterung
- ✅ Klare Trennung von Logik

**Option B: Spezifische Services pro Entität**
```
GeminiImageService (Basis)
TourImageService (extends GeminiImageService)
ReservationImageService (extends GeminiImageService)
```

**Nachteile:**
- ❌ Mehr Code-Duplikation
- ❌ Komplexer

**Entscheidung:** Option A - Generischer Service mit Wrapper-Methoden

---

### 2. API-Endpunkt-Design

**Option A: Synchron (Blockierend)**
```
POST /api/tours/:id/generate-images
→ Generiert Bilder (10-30 Sekunden)
→ Response: { success: true, images: [...] }
```

**Nachteile:**
- ❌ Frontend blockiert 10-30 Sekunden
- ❌ Timeout-Risiko
- ❌ Schlechte UX

**Option B: Asynchron mit Queue (EMPFOHLEN)**
```
POST /api/tours/:id/generate-images
→ Fügt Job zur Queue hinzu (<100ms)
→ Response: { success: true, jobId: "..." }

GET /api/tours/:id/generate-images/status
→ Prüft Status des Jobs
→ Response: { status: "processing" | "completed" | "failed", progress: 50 }
```

**Vorteile:**
- ✅ Frontend erhält sofort Response
- ✅ Keine Blockierung
- ✅ Bessere UX
- ✅ Retry-Mechanismus bei Fehlern

**Entscheidung:** Option B - Asynchron mit Queue

---

### 3. Bild-Speicherung

**Aktueller Standard:**
- Bilder werden in `backend/uploads/tours/` gespeichert
- URL-Format: `/uploads/tours/{filename}`
- Dateiname: `tour-{id}-main-{timestamp}.png`

**Für generische Implementierung:**
- Upload-Verzeichnis als Parameter
- Dateiname-Pattern als Parameter
- Service sollte nur Bilder generieren, Speicherung in Controller

**Entscheidung:**
- Service generiert Bilder in temporärem Verzeichnis
- Controller übernimmt Upload-Logik (wie bei manuellem Upload)

---

### 4. Frontend-Integration

**Button-Implementierung:**

**Card-Ansicht:**
```tsx
{hasPermission('tour_edit', 'write', 'button') && (
    <button
        onClick={handleGenerateImages}
        disabled={generatingImages}
        className="..."
    >
        {generatingImages ? <Spinner /> : <PhotoIcon />}
    </button>
)
```

**Table-Ansicht:**
```tsx
case 'actions':
    return (
        <td>
            <div className="flex space-x-2">
                {/* ... andere Buttons ... */}
                {hasPermission('tour_edit', 'write', 'button') && (
                    <button onClick={() => handleGenerateImages(tour.id)}>
                        <PhotoIcon />
                    </button>
                )}
            </div>
        </td>
    );
```

**Bild-Anzeige in Card:**
```tsx
{tour.imageUrl && (
    <img 
        src={`${API_URL}${tour.imageUrl}`}
        alt={tour.title}
        className="w-full h-48 object-cover rounded-lg mb-2"
        loading="lazy"
    />
)}
```

---

## 📐 IMPLEMENTIERUNGSPLAN

### Phase 1: Service-Refactoring (Generisch)

#### 1.1 GeminiImageService erweitern
**Datei:** `backend/src/services/geminiImageService.ts`

**Änderungen:**
- `generateTourImages()` → Generischer machen
- Neue Methode: `generateImages(config)` - Generisch für alle Entitäten
- `generateTourImages()` → Wrapper um `generateImages()` mit Tour-spezifischen Prompts

**Interface:**
```typescript
interface ImageGenerationConfig {
    entityType: 'tour' | 'reservation' | 'task' | ...;
    entityId: number;
    title: string;
    description: string;
    outputDir: string;
    filenamePattern: string;
    imageTypes: ('main' | 'gallery' | 'flyer')[];
    apiKey?: string;
}
```

#### 1.2 Queue-Integration
**Datei:** `backend/src/services/queueService.ts`

**Neue Queue:**
```typescript
export function getImageGenerationQueue(): Queue {
    // Queue für Bildgenerierung
}
```

**Worker:**
```typescript
// backend/src/queues/imageGenerationWorker.ts
// Verarbeitet Bildgenerierungs-Jobs
```

---

### Phase 2: Backend API-Endpunkte

#### 2.1 Neuer Endpunkt: Bildgenerierung starten
**Datei:** `backend/src/controllers/tourController.ts`

**Neue Funktion:**
```typescript
export const generateTourImages = async (req: AuthenticatedRequest, res: Response) => {
    // 1. Berechtigung prüfen
    // 2. Tour-Daten laden
    // 3. Job zur Queue hinzufügen
    // 4. Response mit jobId zurückgeben
}
```

**Route:**
```typescript
router.post('/:id/generate-images', authMiddleware, organizationMiddleware, generateTourImages);
```

#### 2.2 Neuer Endpunkt: Status prüfen
**Datei:** `backend/src/controllers/tourController.ts`

**Neue Funktion:**
```typescript
export const getTourImageGenerationStatus = async (req: Request, res: Response) => {
    // 1. Job-Status aus Queue abrufen
    // 2. Response: { status, progress, error? }
}
```

**Route:**
```typescript
router.get('/:id/generate-images/status', authMiddleware, organizationMiddleware, getTourImageGenerationStatus);
```

#### 2.3 Worker-Implementierung
**Datei:** `backend/src/queues/imageGenerationWorker.ts`

**Job-Handler:**
```typescript
// 1. Bilder generieren mit GeminiImageService
// 2. Bilder hochladen (wie manueller Upload)
// 3. Tour-Daten aktualisieren
// 4. Job-Status aktualisieren
```

---

### Phase 3: Frontend-Integration

#### 3.1 API-Endpunkte hinzufügen
**Datei:** `frontend/src/config/api.ts`

```typescript
TOURS: {
    // ... bestehende Endpunkte ...
    GENERATE_IMAGES: (id: number) => `/tours/${id}/generate-images`,
    GENERATE_IMAGES_STATUS: (id: number) => `/tours/${id}/generate-images/status`
}
```

#### 3.2 Button in Card-Ansicht
**Datei:** `frontend/src/components/tours/ToursTab.tsx`

**Änderungen:**
- Button in Card hinzufügen (Zeile 976-988)
- Handler-Funktion `handleGenerateImages(tourId)`
- Loading-State `generatingImages[tourId]`
- Polling für Status-Updates

#### 3.3 Button in Table-Ansicht
**Datei:** `frontend/src/components/tours/ToursTab.tsx`

**Änderungen:**
- Button in Actions-Spalte hinzufügen (Zeile 844-882)
- Gleicher Handler wie Card-Ansicht

#### 3.4 Bild-Anzeige in Card
**Datei:** `frontend/src/components/tours/ToursTab.tsx`

**Änderungen:**
- Bild-Anzeige in Card hinzufügen (nach Zeile 918)
- Fallback wenn kein Bild vorhanden

---

### Phase 4: Performance-Optimierungen

#### 4.1 Queue-Konfiguration
- Concurrency: 2-3 Jobs parallel (Bildgenerierung ist CPU-intensiv)
- Timeout: 120 Sekunden (für 5 Bilder)
- Retry: 2 Versuche bei Fehlern

#### 4.2 Frontend-Polling
- Polling-Intervall: 2 Sekunden
- Max. Polling-Dauer: 60 Sekunden
- Automatisches Stoppen bei Erfolg/Fehler

#### 4.3 Caching
- Kein Caching nötig (Bilder werden direkt in DB gespeichert)
- Tour-Daten werden nach Generierung neu geladen

---

## 🔒 SICHERHEIT UND BERECHTIGUNGEN

### Berechtigungen
- **Erforderlich:** `tour_edit` mit `write` und `button`
- **Gleiche Berechtigung wie:** Tour bearbeiten, Bild hochladen

### API-Key-Verwaltung
- API-Key in `.env` als `GEMINI_API_KEY`
- Keine API-Key-Übergabe vom Frontend
- Service verwendet `process.env.GEMINI_API_KEY`

### Rate-Limiting
- Gemini API hat Rate-Limits
- Queue verhindert zu viele gleichzeitige Requests
- Retry-Mechanismus bei Rate-Limit-Fehlern

---

## 📊 PERFORMANCE-ANALYSE

### Aktuell (ohne Queue)
- **Bildgenerierung:** 10-30 Sekunden pro Bild
- **5 Bilder:** 50-150 Sekunden
- **Frontend blockiert:** Ja
- **User-Experience:** ❌ Schlecht

### Mit Queue
- **API-Response:** <100ms
- **Bildgenerierung:** 50-150 Sekunden (im Hintergrund)
- **Frontend blockiert:** Nein
- **User-Experience:** ✅ Gut

### Optimierungen
- **Parallele Generierung:** Nicht möglich (API-Limit)
- **Caching:** Nicht nötig (einmalige Generierung)
- **Lazy-Loading:** Bilder werden lazy geladen

---

## 🧪 TESTING-STRATEGIE

### Backend-Tests
1. Service-Test: `GeminiImageService.generateImage()`
2. Controller-Test: `generateTourImages()` Endpunkt
3. Queue-Test: Worker verarbeitet Job korrekt
4. Integration-Test: Vollständiger Flow

### Frontend-Tests
1. Button-Rendering (nur bei Berechtigung)
2. API-Call bei Button-Click
3. Loading-State während Generierung
4. Status-Polling
5. Bild-Anzeige nach Generierung

---

## 📝 ÜBERSETZUNGEN (I18N)

**Erforderliche Übersetzungen:**

```json
// de.json
{
  "tours": {
    "generateImages": "Bilder generieren",
    "generatingImages": "Bilder werden generiert...",
    "imagesGenerated": "Bilder erfolgreich generiert",
    "imageGenerationFailed": "Fehler bei Bildgenerierung",
    "imageGenerationProgress": "Fortschritt: {progress}%"
  }
}

// en.json
{
  "tours": {
    "generateImages": "Generate images",
    "generatingImages": "Generating images...",
    "imagesGenerated": "Images generated successfully",
    "imageGenerationFailed": "Image generation failed",
    "imageGenerationProgress": "Progress: {progress}%"
  }
}

// es.json
{
  "tours": {
    "generateImages": "Generar imágenes",
    "generatingImages": "Generando imágenes...",
    "imagesGenerated": "Imágenes generadas exitosamente",
    "imageGenerationFailed": "Error al generar imágenes",
    "imageGenerationProgress": "Progreso: {progress}%"
  }
}
```

---

## 🚀 DEPLOYMENT-ANFORDERUNGEN

### Environment-Variablen
```env
GEMINI_API_KEY=AIza...  # Muss gesetzt sein
QUEUE_ENABLED=true      # Für asynchrone Verarbeitung
REDIS_HOST=localhost    # Für Queue
REDIS_PORT=6379
```

### Dependencies
- ✅ Bereits vorhanden: `axios`, `bullmq`, `ioredis`
- ✅ Keine neuen Dependencies nötig

---

## 📋 CHECKLISTE

### Backend
- [ ] `GeminiImageService` refactoren (generisch)
- [ ] Queue für Bildgenerierung erstellen
- [ ] Worker für Bildgenerierung implementieren
- [ ] Controller-Endpunkte: `POST /api/tours/:id/generate-images`
- [ ] Controller-Endpunkte: `GET /api/tours/:id/generate-images/status`
- [ ] Berechtigungsprüfung implementieren
- [ ] Error-Handling und Logging

### Frontend
- [ ] API-Endpunkte in `api.ts` hinzufügen
- [ ] Button in Card-Ansicht hinzufügen
- [ ] Button in Table-Ansicht hinzufügen
- [ ] Handler-Funktion `handleGenerateImages()`
- [ ] Loading-State während Generierung
- [ ] Status-Polling implementieren
- [ ] Bild-Anzeige in Card hinzufügen
- [ ] Übersetzungen hinzufügen (de, en, es)
- [ ] Error-Handling und User-Feedback

### Testing
- [ ] Backend-Tests
- [ ] Frontend-Tests
- [ ] Integration-Tests
- [ ] Performance-Tests

### Dokumentation
- [ ] API-Dokumentation aktualisieren
- [ ] Service-Dokumentation aktualisieren
- [ ] User-Dokumentation (falls nötig)

---

## ⚠️ RISIKEN UND MITIGATION

### Risiko 1: API-Rate-Limits
**Mitigation:**
- Queue verhindert zu viele gleichzeitige Requests
- Retry-Mechanismus mit Backoff
- Error-Handling für Rate-Limit-Fehler

### Risiko 2: Lange Generierungszeit
**Mitigation:**
- Asynchrone Verarbeitung (keine Blockierung)
- Status-Polling für Fortschritt
- Timeout-Handling (120 Sekunden)

### Risiko 3: API-Key-Kosten
**Mitigation:**
- API-Key in `.env` (nicht im Code)
- Logging für API-Usage
- Monitoring der Kosten

---

## 🔄 ERWEITERUNGSMÖGLICHKEITEN

### Zukünftige Use Cases
1. **Reservations:** Automatische Bilder für Zimmer
2. **Tasks:** Automatische Bilder für Task-Beschreibungen
3. **Events:** Automatische Event-Flyer
4. **Products:** Automatische Produktbilder

### Generische Implementierung ermöglicht:
- Einfache Erweiterung für andere Entitäten
- Wiederverwendbarer Service
- Konsistente API-Struktur

---

## 📚 REFERENZEN

- [Gemini API Dokumentation](https://ai.google.dev/gemini-api/docs/image-generation)
- [Queue-System Dokumentation](docs/technical/QUEUE_SYSTEM.md)
- [Coding Standards](docs/core/CODING_STANDARDS.md)
- [VIBES](docs/core/VIBES.md)
- [Image Preview Implementation](docs/technical/IMAGE_PREVIEW_IMPLEMENTATION.md)

---

**Nächste Schritte:**
1. ✅ Planungsdokument erstellt
2. ⏳ Warten auf Freigabe zur Implementierung
3. ⏳ Phase 1: Service-Refactoring
4. ⏳ Phase 2: Backend API-Endpunkte
5. ⏳ Phase 3: Frontend-Integration
6. ⏳ Phase 4: Testing und Optimierung


# Memory Leaks: Vollständige Suche (2025-01-31)

**Datum:** 2025-01-31  
**Status:** 🔍 ANALYSE - Nur Suche, keine Änderungen  
**Zweck:** Systematische Suche nach allen Memory Leaks im Codebase

---

## 📊 ZUSAMMENFASSUNG

**Gefundene Memory Leaks:**
- **Event Listener ohne Cleanup:** 2 Dateien
- **setInterval ohne clearInterval:** 4 Dateien (Backend)
- **URL.createObjectURL ohne revokeObjectURL:** 9 Dateien (Frontend)
- **setTimeout ohne clearTimeout:** Mehrere potenzielle Probleme

---

## 🔴 KRITISCHE MEMORY LEAKS

### 1. Event Listener ohne Cleanup (Global)

#### 1.1 `frontend/src/services/initializeErrorHandler.ts`

**Problem:**
- `window.addEventListener('error')` wird nie entfernt
- `window.addEventListener('unhandledrejection')` wird nie entfernt

**Code (Zeilen 20-44):**
```typescript
window.addEventListener('error', (event) => {
  // ...
});

window.addEventListener('unhandledrejection', (event) => {
  // ...
});
```

**Impact:**
- Globale Event Listener bleiben für die gesamte App-Laufzeit aktiv
- Memory Leak bei jedem App-Neustart (wenn Funktion mehrfach aufgerufen wird)

**Lösung:**
- Cleanup-Funktion zurückgeben oder Event Listener nur einmal registrieren
- Prüfen, ob Funktion mehrfach aufgerufen wird

---

#### 1.2 `frontend/src/utils/claudeConsole.ts`

**Problem:**
- `window.addEventListener('error')` wird nie entfernt (Zeile 99)
- `window.addEventListener('unhandledrejection')` wird nie entfernt (Zeile 107)

**Code (Zeilen 97-110):**
```typescript
private interceptErrors() {
  // Globale Error-Handler
  window.addEventListener('error', (event) => {
    // ...
  });

  // Promise Rejection Handler
  window.addEventListener('unhandledrejection', (event) => {
    // ...
  });
}
```

**Impact:**
- Globale Event Listener bleiben für die gesamte App-Laufzeit aktiv
- Memory Leak wenn `interceptErrors()` mehrfach aufgerufen wird

**Lösung:**
- Cleanup-Funktion implementieren
- Prüfen, ob `interceptErrors()` mehrfach aufgerufen wird

---

### 2. setInterval ohne clearInterval (Backend)

#### 2.1 `backend/src/index.ts:89`

**Problem:**
- `setInterval` wird ohne `clearInterval` verwendet
- Interval läuft für die gesamte Server-Laufzeit

**Code (Zeilen 88-96):**
```typescript
let tourBookingSchedulerInterval: NodeJS.Timeout | null = null;
setInterval(async () => {
  try {
    const { TourBookingScheduler } = await import('./services/tourBookingScheduler');
    await TourBookingScheduler.checkExpiredBookings();
  } catch (error) {
    console.error('[Timer] Fehler beim Prüfen abgelaufener Tour-Buchungen:', error);
  }
}, 5 * 60 * 1000); // 5 Minuten
```

**Impact:**
- Interval läuft dauerhaft, auch wenn nicht benötigt
- Keine Möglichkeit, Interval zu stoppen

**Lösung:**
- Interval-ID speichern
- Cleanup-Funktion für Server-Shutdown implementieren

---

#### 2.2 `backend/src/index.ts:101`

**Problem:**
- `setTimeout` wird verwendet, aber kein `clearTimeout` (wenn Server vor Ablauf gestoppt wird)

**Code (Zeilen 100-108):**
```typescript
setTimeout(async () => {
  try {
    const { ReservationPasscodeCleanupScheduler } = await import('./services/reservationPasscodeCleanupScheduler');
    ReservationPasscodeCleanupScheduler.start();
  } catch (error) {
    console.error('[Timer] Fehler beim Starten des Passcode-Cleanup-Schedulers:', error);
  }
}, 1000); // Starte nach 1 Sekunde
```

**Impact:**
- Timeout läuft, auch wenn Server gestoppt wird
- Geringes Risiko, da Timeout nur einmal ausgeführt wird

**Lösung:**
- Timeout-ID speichern
- Cleanup-Funktion für Server-Shutdown implementieren

---

#### 2.3 `backend/src/app.ts:132` und `142`

**Problem:**
- Zwei `setInterval` ohne `clearInterval`

**Code (Zeilen 131-151):**
```typescript
setInterval(async () => {
  // ...
}, CHECK_INTERVAL_MS);

setInterval(async () => {
  // ...
}, MONTHLY_REPORT_CHECK_INTERVAL_MS);
```

**Impact:**
- Intervalle laufen dauerhaft
- Keine Möglichkeit, Intervalle zu stoppen

**Lösung:**
- Interval-IDs speichern
- Cleanup-Funktion für Server-Shutdown implementieren

---

#### 2.4 `backend/src/middleware/rateLimiter.ts:14`

**Problem:**
- `setInterval` ohne `clearInterval`

**Code (Zeilen 13-21):**
```typescript
// Cleanup alte Einträge alle 5 Minuten
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 5 * 60 * 1000);
```

**Impact:**
- Interval läuft dauerhaft
- Keine Möglichkeit, Interval zu stoppen

**Lösung:**
- Interval-ID speichern
- Cleanup-Funktion für Server-Shutdown implementieren

---

### 3. URL.createObjectURL ohne revokeObjectURL (Frontend)

#### 3.1 `frontend/src/pages/Settings.tsx:137`

**Problem:**
- `URL.createObjectURL(file)` wird erstellt, aber nie revokiert

**Code (Zeile 137):**
```typescript
setPreviewUrl(URL.createObjectURL(file));
```

**Impact:**
- Blob-URL bleibt im Memory, auch wenn Datei nicht mehr verwendet wird
- Memory Leak bei jedem Datei-Upload

**Lösung:**
- `URL.revokeObjectURL()` beim Unmount oder beim nächsten Upload aufrufen

---

#### 3.2 `frontend/src/components/MyDocumentsTab.tsx:137, 156`

**Problem:**
- `URL.createObjectURL(blob)` wird für Preview-URLs erstellt, aber nie revokiert

**Code (Zeilen 136-144, 155-163):**
```typescript
const blob = new Blob([response.data], { type: 'application/pdf' });
const previewUrl = window.URL.createObjectURL(blob);

setCertPreviewUrls(prev => ({ ...prev, [certId]: previewUrl }));
// ❌ Kein revokeObjectURL!
```

**Impact:**
- Blob-URLs bleiben im Memory
- Memory Leak bei jedem PDF-Preview

**Lösung:**
- `URL.revokeObjectURL()` beim Unmount oder beim Schließen des Previews aufrufen
- Cleanup-Funktion in `useEffect` implementieren

---

#### 3.3 `frontend/src/components/InvoiceSuccessModal.tsx:51`

**Problem:**
- `URL.createObjectURL(blob)` wird erstellt, aber nie revokiert

**Code (Zeilen 50-57):**
```typescript
const blob = new Blob([response.data], { type: 'application/pdf' });
const url = window.URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = `Rechnung_${invoiceNumber}.pdf`;
document.body.appendChild(link);
link.click();
// ❌ Kein revokeObjectURL!
```

**Impact:**
- Blob-URL bleibt im Memory nach Download
- Memory Leak bei jedem Download

**Lösung:**
- `URL.revokeObjectURL(url)` nach `link.click()` aufrufen

---

#### 3.4 `frontend/src/components/InvoiceDetailModal.tsx:155`

**Problem:**
- `URL.createObjectURL(blob)` wird erstellt, aber nie revokiert

**Code (Zeilen 154-160):**
```typescript
const blob = new Blob([response.data], { type: 'application/pdf' });
const url = window.URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = `Rechnung_${invoice.invoiceNumber}.pdf`;
// ❌ Kein revokeObjectURL!
```

**Impact:**
- Blob-URL bleibt im Memory nach Download
- Memory Leak bei jedem Download

**Lösung:**
- `URL.revokeObjectURL(url)` nach `link.click()` aufrufen

---

#### 3.5 `frontend/src/components/cerebro/ArticleEdit.tsx:124`

**Problem:**
- `URL.createObjectURL(file)` wird erstellt, aber nie revokiert

**Code (Zeile 124):**
```typescript
const tempUrl = URL.createObjectURL(file);
```

**Impact:**
- Blob-URL bleibt im Memory
- Memory Leak bei jedem Datei-Upload

**Lösung:**
- `URL.revokeObjectURL(tempUrl)` beim Unmount oder beim nächsten Upload aufrufen

---

#### 3.6 `frontend/src/components/ContractCreationModal.tsx:184`

**Problem:**
- `URL.createObjectURL(file)` wird erstellt, aber nie revokiert

**Code (Zeile 184):**
```typescript
const url = URL.createObjectURL(file);
setPdfPreviewUrl(url);
```

**Impact:**
- Blob-URL bleibt im Memory
- Memory Leak bei jedem PDF-Upload

**Lösung:**
- `URL.revokeObjectURL()` beim Unmount oder beim nächsten Upload aufrufen
- Cleanup-Funktion in `useEffect` implementieren

---

#### 3.7 `frontend/src/components/CertificateCreationModal.tsx:172`

**Problem:**
- `URL.createObjectURL(file)` wird erstellt, aber nie revokiert

**Code (Zeile 172):**
```typescript
const url = URL.createObjectURL(file);
setPdfPreviewUrl(url);
```

**Impact:**
- Blob-URL bleibt im Memory
- Memory Leak bei jedem PDF-Upload

**Lösung:**
- `URL.revokeObjectURL()` beim Unmount oder beim nächsten Upload aufrufen
- Cleanup-Funktion in `useEffect` implementieren

---

#### 3.8 `frontend/src/components/ContractEditModal.tsx:127`

**Problem:**
- `URL.createObjectURL(file)` wird erstellt, aber nie revokiert

**Code (Zeile 127):**
```typescript
const url = URL.createObjectURL(file);
setPdfPreviewUrl(url);
```

**Impact:**
- Blob-URL bleibt im Memory
- Memory Leak bei jedem PDF-Upload

**Lösung:**
- `URL.revokeObjectURL()` beim Unmount oder beim nächsten Upload aufrufen
- Cleanup-Funktion in `useEffect` implementieren

---

#### 3.9 `frontend/src/components/CertificateEditModal.tsx:117`

**Problem:**
- `URL.createObjectURL(file)` wird erstellt, aber nie revokiert

**Code (Zeile 117):**
```typescript
const url = URL.createObjectURL(file);
setPdfPreviewUrl(url);
```

**Impact:**
- Blob-URL bleibt im Memory
- Memory Leak bei jedem PDF-Upload

**Lösung:**
- `URL.revokeObjectURL()` beim Unmount oder beim nächsten Upload aufrufen
- Cleanup-Funktion in `useEffect` implementieren

---

## ✅ KORREKT IMPLEMENTIERT (Beispiele)

### Event Listener mit Cleanup

**Beispiele:**
- `frontend/src/components/RoleManagementTab.tsx:590` - ✅ Cleanup vorhanden
- `frontend/src/components/BranchManagementTab.tsx:597` - ✅ Cleanup vorhanden
- `frontend/src/components/TableColumnConfig.tsx:176, 193` - ✅ Cleanup vorhanden
- `frontend/src/components/ConsultationTracker.tsx:309` - ✅ Cleanup vorhanden
- `frontend/src/components/SavedFilterTags.tsx:197` - ✅ Cleanup vorhanden

### setInterval mit Cleanup

**Beispiele:**
- `frontend/src/pages/TeamWorktimeControl.tsx:136` - ✅ Cleanup vorhanden
- `frontend/src/components/WorktimeTracker.tsx:177` - ✅ Cleanup vorhanden
- `frontend/src/contexts/WorktimeContext.tsx:58` - ✅ Cleanup vorhanden
- `frontend/src/components/NotificationBell.tsx:192` - ✅ Cleanup vorhanden
- `frontend/src/contexts/FilterContext.tsx:241` - ✅ Cleanup vorhanden

### URL.createObjectURL mit revokeObjectURL

**Beispiele:**
- `frontend/src/components/MonthlyReportsTab.tsx:345` - ✅ revokeObjectURL vorhanden
- `frontend/src/components/InvoiceManagementTab.tsx:323` - ✅ revokeObjectURL vorhanden
- `frontend/src/components/WorktimeStats.tsx:323` - ✅ revokeObjectURL vorhanden
- `frontend/src/components/LifecycleView.tsx:205, 266` - ✅ revokeObjectURL vorhanden
- `frontend/src/components/tours/TourExportDialog.tsx:85, 129` - ✅ revokeObjectURL vorhanden
- `frontend/src/components/EditRequestModal.tsx:470` - ✅ revokeObjectURL vorhanden
- `frontend/src/components/EditTaskModal.tsx:682` - ✅ revokeObjectURL vorhanden
- `frontend/src/components/MarkdownPreview.tsx:305` - ✅ Cleanup vorhanden (blobUrlsRef)

---

## 📋 PRIORITÄTEN

### 🔴 HOCH (Sofort beheben)

1. **Event Listener ohne Cleanup (Global)**
   - `initializeErrorHandler.ts`
   - `claudeConsole.ts`

2. **URL.createObjectURL ohne revokeObjectURL (Download-Funktionen)**
   - `InvoiceSuccessModal.tsx`
   - `InvoiceDetailModal.tsx`

3. **URL.createObjectURL ohne revokeObjectURL (Preview-Funktionen)**
   - `MyDocumentsTab.tsx`
   - `Settings.tsx`

### 🟡 MITTEL (Bald beheben)

4. **setInterval ohne clearInterval (Backend)**
   - `backend/src/index.ts`
   - `backend/src/app.ts`
   - `backend/src/middleware/rateLimiter.ts`

5. **URL.createObjectURL ohne revokeObjectURL (Upload-Funktionen)**
   - `ContractCreationModal.tsx`
   - `CertificateCreationModal.tsx`
   - `ContractEditModal.tsx`
   - `CertificateEditModal.tsx`
   - `ArticleEdit.tsx`

---

## 🔍 WEITERE PRÜFUNGEN

### setTimeout ohne clearTimeout

**Potenzielle Probleme:**
- Viele `setTimeout`-Aufrufe haben bereits `clearTimeout` in Cleanup-Funktionen
- Einige `setTimeout`-Aufrufe in `OnboardingContext.tsx` könnten Probleme verursachen, wenn Component vor Ablauf unmounted wird
- Prüfung empfohlen: Alle `setTimeout`-Aufrufe auf korrekte Cleanup-Funktionen prüfen

### ResizeObserver und IntersectionObserver

**Status:**
- ✅ `useResizeObserver.ts` - Korrekt implementiert mit Cleanup
- ✅ `Requests.tsx:851` - IntersectionObserver mit `disconnect()` in Cleanup
- ✅ `Worktracker.tsx:1760, 1795, 1831` - IntersectionObserver mit `disconnect()` in Cleanup
- ✅ `OnboardingOverlay.tsx:38` - IntersectionObserver mit `disconnect()` in Cleanup

---

## 📝 HINWEISE

1. **Backend setInterval:**
   - Backend-Intervalle laufen für die gesamte Server-Laufzeit
   - Cleanup sollte bei Server-Shutdown implementiert werden
   - Prüfen, ob Graceful Shutdown vorhanden ist

2. **Frontend URL.createObjectURL:**
   - Blob-URLs sollten immer revokiert werden
   - Besonders wichtig bei Preview-URLs, die im State gespeichert werden
   - Cleanup beim Unmount oder beim nächsten Upload/Download

3. **Event Listener (Global):**
   - Globale Event Listener sollten nur einmal registriert werden
   - Prüfen, ob `initializeErrorHandler()` mehrfach aufgerufen wird
   - Cleanup-Funktion implementieren oder Singleton-Pattern verwenden

---

## ✅ NÄCHSTE SCHRITTE

1. **Kritische Memory Leaks beheben:**
   - Event Listener ohne Cleanup (Global)
   - URL.createObjectURL ohne revokeObjectURL (Download/Preview)

2. **Backend-Intervalle optimieren:**
   - Cleanup-Funktionen für Server-Shutdown implementieren
   - Graceful Shutdown prüfen

3. **Upload-Funktionen optimieren:**
   - URL.createObjectURL Cleanup bei allen Upload-Komponenten

4. **Testing:**
   - Memory-Profiling nach Fixes
   - Prüfen, ob Memory-Wachstum gestoppt wurde


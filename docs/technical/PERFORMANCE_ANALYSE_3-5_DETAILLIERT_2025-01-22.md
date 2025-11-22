# Performance-Analyse: Priorität 3-5 Detailliert (2025-01-22)

**Datum:** 2025-01-22  
**Status:** 🔍 Analyse abgeschlossen  
**Ziel:** Detaillierte Analyse von Priorität 3-5, warum 3 nichts gebracht hat, Nachteile von 5, und Plan für "pro Seite genau definieren"

---

## 🔍 PRIORITÄT 3: BranchCache - Warum hat es nichts gebracht?

### Historische Analyse

**Dokument:** `PERFORMANCE_ANALYSE_AKTUELL_2.md` (2025-11-22)

**Problem identifiziert:**
- Branch-Settings werden bei jedem Request entschlüsselt
- AES-256-GCM Verschlüsselung ist CPU-intensiv
- Bei 214 Requests für `/api/worktime/active`: 214 Entschlüsselungen pro Minute

**Warum BranchCache nichts gebracht hat:**
1. **BranchCache wurde nur bei `/api/branches` verwendet**
2. **`/api/worktime/active` lädt Branch-Daten mit `include: { branch: true }`**
3. **ABER: Es entschlüsselt KEINE Settings!**
4. **Der Cache löst das Problem nicht, weil `/api/worktime/active` die Settings gar nicht entschlüsselt**

### Aktuelle Situation: `/api/branches/user`

**Datei:** `backend/src/controllers/branchController.ts:167-214`

**DB-Query:**
```typescript
const userBranches = await prisma.usersBranches.findMany({
  where: {
    userId: userId,
    branch: branchFilter  // ← Komplexer Filter mit getDataIsolationFilter
  },
  include: {
    branch: {
      select: {
        id: true,
        name: true
      }
    }
  },
  orderBy: {
    branch: {
      name: 'asc'
    }
  }
});
```

**Wichtig:**
- ✅ Lädt **KEINE Settings** (nur `id` und `name`)
- ✅ **KEINE Entschlüsselung** nötig
- ⚠️ **Komplexer Filter** mit `getDataIsolationFilter` (kann langsam sein)

**Warum Caching hier helfen KÖNNTE:**
- Branches ändern sich selten
- Query wird bei jedem initialen Laden ausgeführt
- **ABER:** Filter mit `getDataIsolationFilter` könnte komplex sein

**Warum Caching hier NICHT helfen könnte:**
- Query ist relativ einfach (nur `id` und `name`)
- Filter könnte bei jedem User unterschiedlich sein (schlecht für Cache)
- Geschätzte Query-Zeit: 0.1-0.3s (nicht kritisch)

**Fazit:**
- ⚠️ BranchCache könnte helfen, aber Impact ist gering (0.1-0.3s)
- ⚠️ Filter-Komplexität könnte Cache-Hit-Rate reduzieren
- 🟡 **Niedrige Priorität** - andere Optimierungen bringen mehr

---

## 🔍 PRIORITÄT 4: OnboardingCache - Detaillierte Analyse

### Aktuelle Situation: `/api/users/onboarding/status`

**Datei:** `backend/src/controllers/userController.ts:2075-2106`

**DB-Query:**
```typescript
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: {
    onboardingCompleted: true,
    onboardingProgress: true,
    onboardingStartedAt: true,
    onboardingCompletedAt: true
  }
});
```

**Komplexität:**
- ✅ **Sehr einfache Query:** Nur User-Felder, keine Joins
- ✅ **Geschätzte Query-Zeit:** 0.05-0.1 Sekunden (sehr schnell)
- ✅ **Onboarding-Status ändert sich selten** (gut für Caching)

**Warum Caching hier helfen KÖNNTE:**
- Status ändert sich selten (nur bei Onboarding-Progress-Update)
- Wird bei jedem initialen Laden aufgerufen
- Query ist schnell, aber Cache wäre noch schneller (0.001s)

**Warum Caching hier NICHT kritisch ist:**
- Query ist bereits sehr schnell (0.05-0.1s)
- Impact ist gering (nur 0.05-0.1s Verbesserung)
- 🟡 **Niedrige Priorität** - andere Optimierungen bringen mehr

**Fazit:**
- ✅ OnboardingCache könnte implementiert werden
- ⚠️ Impact ist gering (0.05-0.1s → 0.001s)
- 🟡 **Niedrige Priorität** - andere Optimierungen bringen mehr

---

## 🔍 PRIORITÄT 5: Sequenzielle vs. Parallele Requests - Detaillierte Analyse

### Aktuelle Situation: 5 parallele Requests

**Request-Flow:**
1. `/users/profile` - 0.5-2.0s
2. `/api/worktime/active` - 0.01-0.2s
3. `/api/organizations/current` - 0.1-0.5s
4. `/api/branches/user` - 0.1-0.3s
5. `/api/users/onboarding/status` - 0.05-0.1s

**Parallele Requests:**
- Alle Requests starten gleichzeitig
- **Gesamt-Zeit:** Maximaler Wert (langsamster Request) = **0.5-2.0s**

**Sequenzielle Requests:**
- Requests werden nacheinander ausgeführt
- **Gesamt-Zeit:** Summe aller Requests = **0.76-3.1s**

### Nachteile von sequenziellen Requests

1. **Längere Gesamt-Zeit**
   - Parallele: 0.5-2.0s (langsamster Request)
   - Sequenziell: 0.76-3.1s (Summe aller Requests)
   - **Nachteil:** 50-55% langsamer!

2. **Wasserfall-Effekt**
   - Wenn Request 1 langsam ist, müssen alle anderen warten
   - Beispiel: `/users/profile` dauert 2s → alle anderen warten 2s
   - **Nachteil:** Blockiert alle nachfolgenden Requests

3. **Keine Parallelisierung**
   - Browser kann mehrere Requests parallel verarbeiten
   - Server kann mehrere Requests parallel verarbeiten
   - **Nachteil:** Unnötige Wartezeit

4. **Schlechtere User Experience**
   - User sieht nichts, bis ALLE Requests fertig sind
   - **Nachteil:** Längere Wartezeit bis erste Daten sichtbar

### Vorteile von sequenziellen Requests

1. **Priorisierung möglich**
   - Kritische Requests zuerst (User, Organization)
   - Nicht-kritische Requests später (Onboarding, Branches)
   - **Vorteil:** User sieht schneller erste Daten

2. **Weniger Server-Last**
   - Weniger gleichzeitige Requests
   - **Vorteil:** Weniger DB-Last

3. **Bessere Fehlerbehandlung**
   - Wenn kritischer Request fehlschlägt, können nicht-kritische übersprungen werden
   - **Vorteil:** Bessere Fehlerbehandlung

### Besserer Ansatz: Hybrid (Priorisierung + Lazy Loading)

**Konzept:**
1. **Kritische Requests parallel** (User, Organization)
2. **Nicht-kritische Requests später** (Onboarding, Branches)
3. **Lazy Loading** für nicht-sichtbare Daten

**Beispiel:**
```typescript
// Phase 1: Kritische Requests parallel (sofort)
const [user, organization] = await Promise.all([
  fetchCurrentUser(),
  fetchOrganization()
]);

// Phase 2: Nicht-kritische Requests später (nach 100ms)
setTimeout(() => {
  Promise.all([
    fetchBranches(),
    fetchOnboardingStatus()
  ]);
}, 100);
```

**Vorteile:**
- ✅ User sieht schneller erste Daten (User, Organization)
- ✅ Parallele Requests für kritische Daten (schneller)
- ✅ Nicht-kritische Daten werden im Hintergrund geladen
- ✅ Beste User Experience

---

## 🎯 PLAN: Pro Seite genau definieren, was wann geladen wird

### Ziel: Zuerst nur sichtbarer Teil blitzschnell, Rest im Hintergrund

### Konzept: 3-Phasen-Laden

**Phase 1: Kritische Daten (sofort, parallel)**
- User-Daten (für Header, Sidebar)
- Organization-Daten (für Kontext)
- **Ziel:** <0.5s bis erste Daten sichtbar

**Phase 2: Sichtbare Daten (nach Phase 1, parallel)**
- Worktime-Status (für WorktimeTracker)
- Branches (für Dropdowns)
- **Ziel:** <1s bis sichtbare Daten geladen

**Phase 3: Hintergrund-Daten (nach Phase 2, verzögert)**
- Onboarding-Status (für Tour)
- Alle Requests/Tasks (für Listen)
- Filter-Daten
- **Ziel:** Im Hintergrund, ohne dass User es merkt

---

## 📋 DETAILLIERTER PLAN: Pro Seite

### Dashboard-Seite

**Sichtbar beim ersten Render:**
- Header (User-Daten)
- Sidebar (User-Daten, Organization)
- WorktimeStats (Worktime-Status)
- Requests-Liste (Standard-Filter, erste 20 Einträge)

**Phase 1: Kritische Daten (sofort, parallel)**
```typescript
// 1. User-Daten (für Header, Sidebar)
fetchCurrentUser() // → /users/profile?includeSettings=false&includeInvoiceSettings=false&includeDocuments=false

// 2. Organization-Daten (für Kontext)
fetchOrganization() // → /api/organizations/current

// 3. Worktime-Status (für WorktimeStats)
checkTrackingStatus() // → /api/worktime/active (bereits gecacht)
```

**Phase 2: Sichtbare Daten (nach Phase 1, parallel)**
```typescript
// 1. Branches (für Dropdowns, falls benötigt)
loadBranches() // → /api/branches/user

// 2. Requests mit Standard-Filter (erste 20 Einträge)
fetchRequests(filterId='Aktuell', limit=20) // → /api/requests?filterId=X&limit=20
```

**Phase 3: Hintergrund-Daten (nach 2 Sekunden)**
```typescript
setTimeout(() => {
  // 1. Onboarding-Status (für Tour, falls nicht abgeschlossen)
  fetchOnboardingStatus() // → /api/users/onboarding/status
  
  // 2. Alle Requests im Hintergrund (für Filter-Wechsel)
  fetchRequests(undefined, undefined, background=true) // → /api/requests (alle)
}, 2000);
```

**Erwartete Zeiten:**
- Phase 1: 0.2-0.8s (nach Optimierungen)
- Phase 2: 0.1-0.3s (zusätzlich)
- Phase 3: Im Hintergrund (User merkt es nicht)
- **Gesamt bis sichtbar:** 0.3-1.1s ✅

---

### Worktracker-Seite

**Sichtbar beim ersten Render:**
- Header (User-Daten)
- Sidebar (User-Daten, Organization)
- WorktimeTracker (Worktime-Status)
- Tasks-Liste (Standard-Filter, erste 20 Einträge)

**Phase 1: Kritische Daten (sofort, parallel)**
```typescript
// 1. User-Daten (für Header, Sidebar)
fetchCurrentUser() // → /users/profile?includeSettings=false&includeInvoiceSettings=false&includeDocuments=false

// 2. Organization-Daten (für Kontext)
fetchOrganization() // → /api/organizations/current

// 3. Worktime-Status (für WorktimeTracker)
checkTrackingStatus() // → /api/worktime/active (bereits gecacht)
```

**Phase 2: Sichtbare Daten (nach Phase 1, parallel)**
```typescript
// 1. Branches (für Dropdowns)
loadBranches() // → /api/branches/user

// 2. Tasks mit Standard-Filter (erste 20 Einträge)
fetchTasks(filterId='Aktuell', limit=20) // → /api/tasks?filterId=X&limit=20
```

**Phase 3: Hintergrund-Daten (nach 2 Sekunden)**
```typescript
setTimeout(() => {
  // 1. Onboarding-Status (für Tour)
  fetchOnboardingStatus() // → /api/users/onboarding/status
  
  // 2. Alle Tasks im Hintergrund (für Filter-Wechsel)
  fetchTasks(undefined, undefined, background=true) // → /api/tasks (alle)
  
  // 3. Filter-Daten (für Filter-Pane)
  fetchFilters() // → /api/saved-filters?tableId=worktracker-todos
}, 2000);
```

**Erwartete Zeiten:**
- Phase 1: 0.2-0.8s (nach Optimierungen)
- Phase 2: 0.1-0.3s (zusätzlich)
- Phase 3: Im Hintergrund (User merkt es nicht)
- **Gesamt bis sichtbar:** 0.3-1.1s ✅

---

### Andere Seiten

**Gleiches Konzept:**
1. **Phase 1:** Kritische Daten (User, Organization, Worktime)
2. **Phase 2:** Sichtbare Daten (Branches, erste Einträge)
3. **Phase 3:** Hintergrund-Daten (alle Einträge, Filter, etc.)

---

## 📊 ZUSAMMENFASSUNG: Priorität 3-5

### Priorität 3: BranchCache

**Status:** 🟡 **Niedrige Priorität**
- Impact ist gering (0.1-0.3s → 0.01-0.03s)
- Filter-Komplexität könnte Cache-Hit-Rate reduzieren
- **Empfehlung:** Später implementieren, wenn andere Optimierungen fertig sind

---

### Priorität 4: OnboardingCache

**Status:** 🟡 **Niedrige Priorität**
- Impact ist gering (0.05-0.1s → 0.001s)
- Query ist bereits sehr schnell
- **Empfehlung:** Später implementieren, wenn andere Optimierungen fertig sind

---

### Priorität 5: Sequenzielle vs. Parallele Requests

**Status:** ✅ **Besserer Ansatz: Hybrid (Priorisierung + Lazy Loading)**

**Nachteile von sequenziellen Requests:**
- ❌ 50-55% langsamer (Summe vs. Maximum)
- ❌ Wasserfall-Effekt (langsamer Request blockiert alle)
- ❌ Keine Parallelisierung
- ❌ Schlechtere User Experience

**Besserer Ansatz:**
- ✅ **Phase 1:** Kritische Requests parallel (User, Organization, Worktime)
- ✅ **Phase 2:** Sichtbare Daten parallel (Branches, erste Einträge)
- ✅ **Phase 3:** Hintergrund-Daten verzögert (alle Einträge, Filter, Onboarding)

**Erwartete Verbesserung:**
- Von 0.86-3.2s → 0.3-1.1s bis sichtbar
- **Verbesserung:** 65-70% schneller bis erste Daten sichtbar!

---

## 🎯 IMPLEMENTIERUNGSPLAN

### Schritt 1: Priorität 1 & 2 implementieren ✅
- `/users/profile` optimieren (Query-Parameter)
- `/api/organizations/current` Cache verwenden

### Schritt 2: Frontend: 3-Phasen-Laden implementieren
- Phase 1: Kritische Daten parallel
- Phase 2: Sichtbare Daten parallel
- Phase 3: Hintergrund-Daten verzögert

### Schritt 3: Pro Seite genau definieren
- Dashboard: Was wird wann geladen?
- Worktracker: Was wird wann geladen?
- Andere Seiten: Gleiches Konzept

### Schritt 4: Priorität 3 & 4 (optional, später)
- BranchCache implementieren (niedrige Priorität)
- OnboardingCache implementieren (niedrige Priorität)

---

**Erstellt:** 2025-01-22  
**Status:** ✅ Analyse abgeschlossen  
**Nächste Aktion:** Priorität 1 & 2 implementieren, dann 3-Phasen-Laden


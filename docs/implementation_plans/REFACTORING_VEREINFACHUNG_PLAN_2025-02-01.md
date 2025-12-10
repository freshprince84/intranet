# Refactoring-Plan: Code-Vereinfachung ohne Funktionalität & Performance zu verschlechtern

**Datum:** 2025-02-01  
**Status:** 📋 PLAN - Noch nichts geändert  
**Oberstes Ziel:** Vereinfachung des Codes ohne Funktionalität & Performance zu verschlechtern

---

## 🎯 ZIELE

1. **Code-Vereinfachung:**
   - Weniger State-Variablen
   - Weniger useEffect-Hooks
   - Weniger komplexe Dependencies
   - Einfacher zu verstehen und zu warten

2. **Performance beibehalten:**
   - Keine Verschlechterung der Ladezeiten
   - Keine Verschlechterung der Query-Performance
   - Keine Verschlechterung der Memory-Performance

3. **Funktionalität beibehalten:**
   - Alle Features funktionieren weiterhin
   - Keine Breaking Changes
   - Keine Regressionen

---

## 📊 AKTUELLE KOMPLEXITÄT

### Frontend-Komponenten:

| Komponente | Zeilen | useState | useEffect | useCallback | useMemo | useRef | Komplexität |
|------------|--------|----------|-----------|-------------|---------|--------|-------------|
| RoleManagementTab.tsx | 2284 | 19 | 2 | 1 | 2 | 0 | 🔴 SEHR HOCH |
| OrganizationSettings.tsx | 427 | 8 | 2 | 1 | 0 | 1 | 🟡 MITTEL |
| JoinRequestsList.tsx | 561 | 9 | 2 | 0 | 1 | 2 | 🟡 MITTEL |
| TourProvidersTab.tsx | 265 | 6 | 1 | 1 | 0 | 0 | 🟢 NIEDRIG |
| MyDocumentsTab.tsx | 473 | 8 | 3 | 0 | 0 | 2 | 🟡 MITTEL |

### Backend-Controller:

| Controller | Zeilen | Komplexität | Prisma-Queries | Include-Statements |
|-----------|--------|-------------|----------------|-------------------|
| roleController.ts | 891 | 🟡 MITTEL | getAllRoles() | 3 includes |
| tourProviderController.ts | 138 | 🟢 NIEDRIG | getAllTourProviders() | 3 includes |
| lifecycleController.ts | 709 | 🟡 MITTEL | getLifecycle() | 4 includes |

---

## 🔍 IDENTIFIZIERTE PROBLEME

### Problem 1: Zu viele State-Variablen

**Beispiel: RoleManagementTab.tsx**
- 19 `useState`-Hooks
- Viele State-Variablen sind zusammengehörig
- Können in Objekten zusammengefasst werden

**Beispiel:**
```typescript
// Vorher: 8 separate States
const [isModalOpen, setIsModalOpen] = useState(false);
const [editingRole, setEditingRole] = useState<Role | null>(null);
const [roles, setRoles] = useState<Role[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [searchTerm, setSearchTerm] = useState<string>('');
const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
const [formData, setFormData] = useState<RoleFormData>({...});

// Nachher: 2 zusammengefasste States
const [uiState, setUiState] = useState({
  isModalOpen: false,
  isFilterModalOpen: false,
  loading: true,
  error: null as string | null
});

const [dataState, setDataState] = useState({
  roles: [] as Role[],
  editingRole: null as Role | null,
  searchTerm: '',
  formData: {...} as RoleFormData
});
```

**Vorteile:**
- Weniger State-Updates
- Weniger Re-Renders
- Einfacher zu verstehen

**Nachteile:**
- Größere State-Objekte
- Mehr Code für Updates

**Entscheidung:** ⚠️ **NICHT empfohlen** - React best practices empfehlen separate States für bessere Performance

### Problem 2: Zu viele useEffect-Hooks

**Beispiel: MyDocumentsTab.tsx**
- 3 `useEffect`-Hooks
- Können teilweise zusammengefasst werden

**Beispiel:**
```typescript
// Vorher: 3 separate useEffects
useEffect(() => {
  fetchDocuments();
}, [userId]);

useEffect(() => {
  certPreviewUrlsRef.current = certPreviewUrls;
}, [certPreviewUrls]);

useEffect(() => {
  contractPreviewUrlsRef.current = contractPreviewUrls;
}, [contractPreviewUrls]);

// Nachher: 1 useEffect mit mehreren Effekten
useEffect(() => {
  fetchDocuments();
  certPreviewUrlsRef.current = certPreviewUrls;
  contractPreviewUrlsRef.current = contractPreviewUrls;
}, [userId, certPreviewUrls, contractPreviewUrls]);
```

**Vorteile:**
- Weniger Hooks
- Einfacher zu verstehen

**Nachteile:**
- Mehr Dependencies
- Mehr Re-Renders

**Entscheidung:** ⚠️ **NICHT empfohlen** - Separate useEffects sind besser für Performance

### Problem 3: Komplexe Prisma-Queries

**Beispiel: getAllRoles()**
- 3 `include`-Statements
- Können durch `select` ersetzt werden

**Lösung:** ✅ **EMPFOHLEN** - Siehe Korrekturplan Phase 3

### Problem 4: Komplexe Middleware-Logik

**Beispiel: getDataIsolationFilter()**
- 100+ Zeilen Switch-Case-Logik
- Können in separate Funktionen aufgeteilt werden

**Lösung:** ✅ **EMPFOHLEN** - Siehe unten

---

## 🔧 REFACTORING-PLAN

### Phase 1: Komponenten aufteilen (PRIORITÄT 1)

#### 1.1 RoleManagementTab.tsx aufteilen

**Aktuell:** 2284 Zeilen in einer Datei

**Aufteilung:**
```
RoleManagementTab.tsx (Hauptkomponente, ~200 Zeilen)
├── RoleCard.tsx (RoleCard-Komponente, ~100 Zeilen)
├── RoleForm.tsx (Formular-Komponente, ~300 Zeilen)
├── RolePermissionsEditor.tsx (Berechtigungen-Editor, ~400 Zeilen)
├── RoleBranchesEditor.tsx (Branches-Editor, ~200 Zeilen)
├── RoleFilterPane.tsx (Filter-Pane, ~200 Zeilen)
└── hooks/
    ├── useRoleManagement.ts (Business-Logik, ~300 Zeilen)
    └── useRoleFilters.ts (Filter-Logik, ~200 Zeilen)
```

**Vorteile:**
- Einfacher zu verstehen
- Einfacher zu testen
- Einfacher zu warten
- Bessere Performance (kleinere Komponenten)

**Nachteile:**
- Mehr Dateien
- Mehr Imports

**Entscheidung:** ✅ **EMPFOHLEN**

#### 1.2 OrganizationSettings.tsx aufteilen

**Aktuell:** 427 Zeilen in einer Datei

**Aufteilung:**
```
OrganizationSettings.tsx (Hauptkomponente, ~150 Zeilen)
├── OrganizationCard.tsx (Card-Komponente, ~150 Zeilen)
├── OrganizationStats.tsx (Statistiken-Komponente, ~100 Zeilen)
└── hooks/
    └── useOrganizationData.ts (Data-Fetching, ~100 Zeilen)
```

**Vorteile:**
- Einfacher zu verstehen
- Einfacher zu testen

**Nachteile:**
- Mehr Dateien

**Entscheidung:** ✅ **EMPFOHLEN**

---

### Phase 2: Prisma-Queries optimieren (PRIORITÄT 2)

#### 2.1 include durch select ersetzen

**Siehe:** Korrekturplan Phase 3

**Vorteile:**
- Schnellere Queries
- Weniger Datenübertragung
- Bessere Performance

**Nachteile:**
- Mehr Code (select statt include)

**Entscheidung:** ✅ **EMPFOHLEN**

#### 2.2 Komplexe Queries aufteilen

**Beispiel: getLifecycle()**
- 4 `include`-Statements
- Können in separate Queries aufgeteilt werden

**Lösung:**
```typescript
// Vorher: 1 Query mit 4 includes
const lifecycle = await prisma.employeeLifecycle.findUnique({
  where: { userId },
  include: {
    lifecycleEvents: {...},
    employmentCertificates: {...},
    employmentContracts: {...},
    socialSecurityRegistrations: {...}
  }
});

// Nachher: 2 Queries (Lifecycle + Details)
const lifecycle = await prisma.employeeLifecycle.findUnique({
  where: { userId }
});

const [events, certificates, contracts, registrations] = await Promise.all([
  prisma.lifecycleEvent.findMany({ where: { lifecycleId: lifecycle.id } }),
  prisma.employmentCertificate.findMany({ where: { lifecycleId: lifecycle.id } }),
  prisma.employmentContract.findMany({ where: { lifecycleId: lifecycle.id } }),
  prisma.socialSecurityRegistration.findMany({ where: { lifecycleId: lifecycle.id } })
]);
```

**Vorteile:**
- Schnellere Queries (parallel)
- Einfacher zu verstehen

**Nachteile:**
- Mehr Queries
- Mehr Code

**Entscheidung:** ⚠️ **BEDINGT EMPFOHLEN** - Nur wenn Performance-Problem nachgewiesen

---

### Phase 3: Middleware-Logik vereinfachen (PRIORITÄT 3)

#### 3.1 getDataIsolationFilter() aufteilen

**Aktuell:** 100+ Zeilen Switch-Case-Logik

**Aufteilung:**
```typescript
// Vorher: 1 große Funktion
export const getDataIsolationFilter = (req: Request, entity: string): any => {
  switch (entity) {
    case 'task': {...}
    case 'request': {...}
    // ... 20+ Cases
  }
};

// Nachher: Separate Funktionen
export const getTaskIsolationFilter = (req: Request): any => {...};
export const getRequestIsolationFilter = (req: Request): any => {...};
export const getWorktimeIsolationFilter = (req: Request): any => {...};
// ... separate Funktionen

export const getDataIsolationFilter = (req: Request, entity: string): any => {
  const filterMap: Record<string, (req: Request) => any> = {
    'task': getTaskIsolationFilter,
    'request': getRequestIsolationFilter,
    'worktime': getWorktimeIsolationFilter,
    // ... Mapping
  };
  
  const filterFn = filterMap[entity];
  return filterFn ? filterFn(req) : {};
};
```

**Vorteile:**
- Einfacher zu verstehen
- Einfacher zu testen
- Einfacher zu warten

**Nachteile:**
- Mehr Dateien
- Mehr Code

**Entscheidung:** ✅ **EMPFOHLEN**

---

### Phase 4: Custom Hooks extrahieren (PRIORITÄT 4)

#### 4.1 Business-Logik in Hooks extrahieren

**Beispiel: RoleManagementTab.tsx**
- `fetchRoles()` → `useRoleManagement()` Hook
- `fetchBranches()` → `useRoleManagement()` Hook
- Filter-Logik → `useRoleFilters()` Hook

**Vorteile:**
- Wiederverwendbar
- Einfacher zu testen
- Einfacher zu verstehen

**Nachteile:**
- Mehr Dateien
- Mehr Abstraktion

**Entscheidung:** ✅ **EMPFOHLEN** (nur für komplexe Logik)

---

## 📋 IMPLEMENTIERUNGS-REIHENFOLGE

1. **Phase 1: Komponenten aufteilen** (2-3 Tage)
   - RoleManagementTab.tsx
   - OrganizationSettings.tsx
   - **Erwartete Verbesserung:** Code ist einfacher zu verstehen

2. **Phase 2: Prisma-Queries optimieren** (1-2 Tage)
   - include durch select ersetzen
   - **Erwartete Verbesserung:** 30-50% schnellere Queries

3. **Phase 3: Middleware-Logik vereinfachen** (1-2 Tage)
   - getDataIsolationFilter() aufteilen
   - **Erwartete Verbesserung:** Code ist einfacher zu verstehen

4. **Phase 4: Custom Hooks extrahieren** (1-2 Tage)
   - Business-Logik in Hooks extrahieren
   - **Erwartete Verbesserung:** Code ist wiederverwendbar

---

## ✅ FINALE PRÜFUNG

Nach ALLEN Phasen prüfen:

1. **Funktionalität:**
   - Alle Features funktionieren weiterhin
   - Keine Regressionen

2. **Performance:**
   - Keine Verschlechterung der Ladezeiten
   - Keine Verschlechterung der Query-Performance

3. **Code-Qualität:**
   - Code ist einfacher zu verstehen
   - Code ist einfacher zu warten
   - Code ist einfacher zu testen

---

## 🚨 WICHTIG: NACH JEDER PHASE PRÜFEN!

**NICHT** alle Phasen auf einmal machen!
**NICHT** Funktionalität oder Performance verschlechtern!

**NUR:**
- Eine Phase nach der anderen
- Nach jeder Phase **PRÜFEN** (Funktionalität + Performance)
- Weiter zur nächsten Phase

---

**Erstellt:** 2025-02-01  
**Status:** 📋 PLAN - Noch nichts geändert


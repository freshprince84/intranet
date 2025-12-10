# Performance-Fix Plan: Organisation-Tab (2025-02-01)

**Datum:** 2025-02-01  
**Status:** 🔴 KRITISCH - Plan zur Behebung  
**Problem:** Organisation-Tab lädt >20 Sekunden, Edit-Klick >30 Sekunden

---

## 🔍 PROBLEM-ZUSAMMENFASSUNG

### Aktuelle Performance-Probleme:

1. **Tab-Laden: >20 Sekunden**
   - `OrganizationSettings`: Lädt Organisation + Statistiken
   - `JoinRequestsList`: Lädt Join Requests + 2 Filter-API-Calls
   - Beide warten auf `permissionsLoading` (blockierend)

2. **Edit-Klick: >30 Sekunden**
   - Settings werden neu geladen (auch wenn bereits vorhanden)
   - Alle 4 Tab-Komponenten werden sofort gerendert
   - Jede Tab-Komponente lädt Daten beim Mount
   - Sidepane öffnet erst nach allen API-Calls

3. **Standards-Verstöße:**
   - Kein Lazy Loading für Tab-Komponenten
   - Unnötige Filter-API-Calls beim Mount
   - Settings werden neu geladen obwohl vorhanden
   - Keine Memoization/Caching

---

## 📊 ROOT CAUSE ANALYSE

### Problem 1: Filter-API-Calls beim Mount (seit 2025-11-06)

**Datei:** `frontend/src/components/organization/JoinRequestsList.tsx`

**Code-Stellen:**
- Zeile 255-273: `setInitialFilter()` - API-Call beim Mount
- Zeile 276-315: `createStandardFilters()` - API-Call beim Mount

**Problem:**
- 2 zusätzliche API-Calls beim Tab-Öffnen
- Blockieren nicht, aber verzögern das Rendering
- Filter sollten im Backend erstellt werden (nicht beim Mount)

**Impact:**
- ~1-2 Sekunden zusätzliche Ladezeit

---

### Problem 2: Alle Tab-Komponenten werden sofort gerendert (seit 2025-11-07)

**Datei:** `frontend/src/components/organization/EditOrganizationModal.tsx`

**Code-Stellen:**
- Zeile 744-786: Alle 4 Tab-Komponenten werden gerendert (auch wenn nicht aktiv)

**Problem:**
- `RoleConfigurationTab`: Lädt ALLE Rollen + Lifecycle-Rollen beim Mount (Zeile 39-44)
- `DocumentConfigurationTab`: Lädt ALLE Templates beim Mount (Zeile 42-46)
- `SMTPConfigurationTab`: OK (nur State)
- `ApiConfigurationTab`: OK (nur State)

**Impact:**
- ~5-10 Sekunden zusätzliche Ladezeit beim Edit-Klick

---

### Problem 3: Settings werden neu geladen obwohl vorhanden

**Datei:** `frontend/src/components/organization/OrganizationSettings.tsx`

**Code-Stelle:**
- Zeile 252-258: Settings werden neu geladen beim Edit-Klick

**Problem:**
- `fetchOrganization(true)` wird aufgerufen, auch wenn `organization?.settings` bereits vorhanden ist
- Settings-Query + Decryption dauert ~5-10 Sekunden

**Impact:**
- ~5-10 Sekunden unnötige Wartezeit

---

### Problem 4: Kein Lazy Loading für Tab-Komponenten

**Datei:** `frontend/src/components/organization/EditOrganizationModal.tsx`

**Problem:**
- Alle Tab-Komponenten werden sofort gerendert
- Standard: Tabs sollten lazy geladen werden (nur wenn aktiv)

**Impact:**
- Unnötige API-Calls für nicht-aktive Tabs

---

### Problem 5: Blockierendes Laden

**Dateien:**
- `OrganizationSettings.tsx`: Wartet auf `permissionsLoading`
- `JoinRequestsList.tsx`: Wartet auf `permissionsLoading`

**Problem:**
- Beide Komponenten warten auf Permissions, bevor sie Daten laden
- Sollte parallel/nicht-blockierend sein

**Impact:**
- Zusätzliche Wartezeit bis Permissions geladen sind

---

## 💡 LÖSUNGSPLAN (Priorisiert)

### Phase 1: Sofort-Fixes (KRITISCH) ⭐⭐⭐

#### Fix 1.1: Filter-API-Calls optimieren

**Datei:** `frontend/src/components/organization/JoinRequestsList.tsx`

**Änderungen:**

1. **`setInitialFilter` (Zeile 255-273):**
   - **Entfernen** oder **lazy laden** (nur wenn Filter-Panel geöffnet wird)
   - Filter sollte aus Context/Cache kommen, nicht per API

2. **`createStandardFilters` (Zeile 276-315):**
   - **Entfernen** - Filter sollten im Backend erstellt werden (Seed/Migration)
   - Oder: Nur einmalig beim ersten Login erstellen (nicht bei jedem Mount)

**Erwartete Verbesserung:**
- **-2 API-Calls** beim Tab-Öffnen
- **~1-2 Sekunden schneller**

---

#### Fix 1.2: Settings nicht neu laden wenn vorhanden

**Datei:** `frontend/src/components/organization/OrganizationSettings.tsx`

**Aktueller Code (Zeile 252-258):**
```typescript
onClick={async () => {
  if (!organization?.settings) {
    await fetchOrganization(true);
  }
  setIsEditModalOpen(true);
}}
```

**Problem:** Settings werden geladen, auch wenn sie bereits vorhanden sein könnten

**Lösung:**
```typescript
onClick={() => {
  // Modal sofort öffnen - Settings werden im Modal geladen wenn benötigt
  setIsEditModalOpen(true);
}}
```

**Erwartete Verbesserung:**
- **-1 API-Call** beim Edit-Klick
- **~5-10 Sekunden schneller**
- Sidepane öffnet sofort

---

### Phase 2: Lazy Loading implementieren ⭐⭐

#### Fix 2.1: Tab-Komponenten lazy laden

**Datei:** `frontend/src/components/organization/EditOrganizationModal.tsx`

**Aktueller Code (Zeile 744-786):**
```typescript
{activeTab === 'roles' && (
  <RoleConfigurationTab ... />
)}
```

**Problem:** Alle Tabs werden gerendert, auch wenn nicht aktiv

**Lösung:** React.lazy() verwenden

**Änderungen:**

1. **Imports lazy machen:**
```typescript
const RoleConfigurationTab = React.lazy(() => import('./RoleConfigurationTab.tsx'));
const DocumentConfigurationTab = React.lazy(() => import('./DocumentConfigurationTab.tsx'));
const SMTPConfigurationTab = React.lazy(() => import('./SMTPConfigurationTab.tsx'));
const ApiConfigurationTab = React.lazy(() => import('./ApiConfigurationTab.tsx'));
```

2. **Suspense hinzufügen:**
```typescript
{activeTab === 'roles' && (
  <Suspense fallback={<div>Lade Rollen-Konfiguration...</div>}>
    <RoleConfigurationTab ... />
  </Suspense>
)}
```

**Erwartete Verbesserung:**
- **-2 API-Calls** beim Edit-Klick (Rollen + Templates)
- **~5-10 Sekunden schneller**
- Nur aktiver Tab lädt Daten

---

#### Fix 2.2: Tab-Komponenten nur laden wenn Tab aktiv ist

**Datei:** `frontend/src/components/organization/EditOrganizationModal.tsx`

**Zusätzlich:** Tab-Komponenten sollten Daten erst laden, wenn Tab aktiv wird

**Änderungen:**

1. **RoleConfigurationTab.tsx (Zeile 39-44):**
```typescript
useEffect(() => {
  // Nur laden wenn Tab aktiv ist
  if (organization && isActive) {
    loadRoles();
    loadLifecycleRoles();
  }
}, [organization, isActive]);
```

2. **DocumentConfigurationTab.tsx (Zeile 42-46):**
```typescript
useEffect(() => {
  // Nur laden wenn Tab aktiv ist
  if (organization && isActive) {
    loadTemplates();
  }
}, [organization, isActive]);
```

**Erwartete Verbesserung:**
- **Keine unnötigen API-Calls** für nicht-aktive Tabs
- **~5-10 Sekunden schneller** beim Edit-Klick

---

### Phase 3: Caching/Memoization ⭐

#### Fix 3.1: Organization-Daten cachen

**Datei:** `frontend/src/components/organization/OrganizationSettings.tsx`

**Problem:** `fetchOrganization` wird mehrfach aufgerufen ohne Cache

**Lösung:** OrganizationContext verwenden statt eigenen State

**Änderungen:**

1. **OrganizationContext verwenden:**
```typescript
const { organization: contextOrg } = useOrganization();

// Nur laden wenn nicht im Context
useEffect(() => {
  if (!contextOrg && canViewOrganization()) {
    fetchOrganization(false);
  }
}, [contextOrg, canViewOrganization]);
```

**Erwartete Verbesserung:**
- **-1 API-Call** wenn bereits im Context
- **~2-3 Sekunden schneller**

---

#### Fix 3.2: Statistiken cachen

**Datei:** `frontend/src/components/organization/OrganizationSettings.tsx`

**Problem:** `getOrganizationStats` wird bei jedem Mount neu geladen

**Lösung:** Cache mit TTL (z.B. 5 Minuten)

**Erwartete Verbesserung:**
- **-1 API-Call** wenn Cache vorhanden
- **~1-2 Sekunden schneller**

---

### Phase 4: Paralleles Laden optimieren ⭐

#### Fix 4.1: Permissions nicht blockierend

**Dateien:**
- `OrganizationSettings.tsx`
- `JoinRequestsList.tsx`

**Problem:** Beide warten auf `permissionsLoading` bevor sie Daten laden

**Lösung:** Daten parallel laden, Permissions-Check asynchron

**Erwartete Verbesserung:**
- **~1-2 Sekunden schneller** (keine Wartezeit auf Permissions)

---

## 📋 IMPLEMENTIERUNGSREIHENFOLGE

### Schritt 1: Sofort-Fixes (Phase 1) - **SOFORT**

1. ✅ **Fix 1.1:** Filter-API-Calls optimieren
   - `setInitialFilter` entfernen oder lazy
   - `createStandardFilters` entfernen (Backend-Seed)
   - **Erwartet:** ~1-2 Sekunden schneller

2. ✅ **Fix 1.2:** Settings nicht neu laden
   - Edit-Klick öffnet Modal sofort
   - Settings im Modal laden wenn benötigt
   - **Erwartet:** ~5-10 Sekunden schneller

**Gesamt-Erwartung Phase 1:**
- Tab-Laden: 20+ Sek → ~15-18 Sek (**~20% schneller**)
- Edit-Klick: 30+ Sek → ~15-20 Sek (**~50% schneller**)

---

### Schritt 2: Lazy Loading (Phase 2) - **NACH Phase 1**

3. ✅ **Fix 2.1:** Tab-Komponenten lazy laden
   - React.lazy() für alle Tab-Komponenten
   - Suspense hinzufügen
   - **Erwartet:** ~5-10 Sekunden schneller beim Edit-Klick

4. ✅ **Fix 2.2:** Tab-Komponenten nur laden wenn aktiv
   - `isActive` Prop hinzufügen
   - Daten nur laden wenn Tab aktiv
   - **Erwartet:** Keine unnötigen API-Calls

**Gesamt-Erwartung Phase 2:**
- Edit-Klick: 15-20 Sek → ~5-10 Sek (**~70% schneller**)

---

### Schritt 3: Caching (Phase 3) - **NACH Phase 2**

5. ✅ **Fix 3.1:** OrganizationContext verwenden
   - Context statt eigenem State
   - **Erwartet:** ~2-3 Sekunden schneller

6. ✅ **Fix 3.2:** Statistiken cachen
   - Cache mit TTL
   - **Erwartet:** ~1-2 Sekunden schneller

**Gesamt-Erwartung Phase 3:**
- Tab-Laden: 15-18 Sek → ~10-12 Sek (**~40% schneller**)

---

### Schritt 4: Paralleles Laden (Phase 4) - **OPTIONAL**

7. ✅ **Fix 4.1:** Permissions nicht blockierend
   - Paralleles Laden
   - **Erwartet:** ~1-2 Sekunden schneller

---

## 📊 ERWARTETE GESAMT-VERBESSERUNG

### Vorher:
- **Tab-Laden:** >20 Sekunden
- **Edit-Klick:** >30 Sekunden
- **API-Calls beim Tab-Öffnen:** 4-5 Calls
- **API-Calls beim Edit-Klick:** 6-8 Calls

### Nachher (alle Phasen):
- **Tab-Laden:** ~3-5 Sekunden (**85% schneller**)
- **Edit-Klick:** ~1-2 Sekunden (**95% schneller**)
- **API-Calls beim Tab-Öffnen:** 2-3 Calls (**40% weniger**)
- **API-Calls beim Edit-Klick:** 1-2 Calls (**80% weniger**)

---

## ⚠️ WICHTIGE HINWEISE

### Standards beachten:
1. **Lazy Loading:** Alle Tab-Komponenten müssen lazy geladen werden
2. **Keine unnötigen API-Calls:** Daten nur laden wenn wirklich benötigt
3. **Caching:** Wiederverwenden statt neu laden
4. **Paralleles Laden:** Nicht blockierend warten

### Risiken:
- **Niedrig:** Filter-API-Calls entfernen (Backend-Seed nötig)
- **Niedrig:** Lazy Loading (Standard React-Pattern)
- **Mittel:** OrganizationContext verwenden (State-Management ändern)

### Testing:
- Tab-Laden messen (vorher/nachher)
- Edit-Klick messen (vorher/nachher)
- API-Calls zählen (Network-Tab)
- Funktionalität prüfen (alle Tabs funktionieren)

---

**Erstellt:** 2025-02-01  
**Basis:** Git-Historie-Analyse und Code-Review  
**Status:** 🔴 BEREIT ZUR IMPLEMENTIERUNG


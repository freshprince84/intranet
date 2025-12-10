# Korrekturplan: Probleme 2-4 (Roles, Providers, Organisation)

**Datum:** 2025-02-01  
**Status:** 📋 PLAN - Noch nichts geändert  
**Zweck:** Fehler in Roles, Providers und Organisation-Tabs beheben

---

## 📊 ANALYSE DER LETZTEN ÄNDERUNGEN

### Git-Historie (letzte 14 Tage):

1. **Memory Leak Fixes** (mehrere Commits)
   - ResizeObserver Memory Leak behoben
   - URL.createObjectURL() Cleanup hinzugefügt
   - Infinite Scroll begrenzt

2. **Filter-Sortierung entfernt** (`afa13d6`, `0581faa`, `af6618b`)
   - `savedSortDirections` entfernt
   - `onSortDirectionsChange` entfernt
   - `filterSortDirections` State entfernt

3. **Code Cleanup und Optimierung** (`d680267`, `8d55580`)
   - Performance-Optimierungen
   - Code-Bereinigung

4. **RoleManagementTab.tsx Änderungen** (34 Zeilen geändert)
   - Nur Performance-Optimierungen (toLowerCase() Optimierungen)
   - Keine strukturellen Änderungen

### Gefundene Probleme:

#### Problem 1: Race Conditions durch `permissionsLoading`

**Fakten:**
- `OrganizationSettings.tsx` Zeile 84-112: `useEffect` wartet auf `permissionsLoading`
- `JoinRequestsList.tsx` Zeile 87-197: `useEffect` wartet auf `permissionsLoading`
- `usePermissions.ts` Zeile 69-91: `useEffect` wartet auf `isLoading` aus `useAuth`
- **Problem:** Wenn `permissionsLoading` mehrfach ändert, werden mehrere API-Calls ausgelöst

**Ursache:**
- `hasInitialLoadRef` wird nur bei Erfolg gesetzt
- Bei Fehler wird `hasInitialLoadRef` NICHT gesetzt → nächster `permissionsLoading`-Change löst erneut API-Call aus
- Race Condition: Mehrere API-Calls parallel

#### Problem 2: Komplexe useEffect-Dependencies

**Fakten:**
- `RoleManagementTab.tsx` Zeile 644: `fetchRoles` hat Dependencies `[handleError, onError]`
- `handleError` ist aus `useError()` Hook → kann sich ändern
- `onError` ist Prop → kann sich ändern
- **Problem:** `fetchRoles` wird neu erstellt → `useEffect` wird erneut ausgelöst

**Ursache:**
- `handleError` ist nicht stabil (wird bei jedem Render neu erstellt)
- `onError` Prop kann sich ändern
- `useEffect` mit `[fetchRoles]` wird bei jeder Änderung erneut ausgelöst

#### Problem 3: Komplexe Prisma-Queries

**Fakten:**
- `getAllRoles()`: 3 `include`-Statements (permissions, branches, branch)
- `getAllTourProviders()`: 3 `include`-Statements (organization, branch, tours)
- `getDataIsolationFilter()`: Komplexe Switch-Case-Logik für verschiedene Entities

**Ursache:**
- Zu viele `include`-Statements = langsame Queries
- Komplexe Filter-Logik = langsame Queries

---

## 🔧 KORREKTURPLAN

### Phase 1: Race Conditions beheben (PRIORITÄT 1)

#### 1.1 OrganizationSettings.tsx - hasInitialLoadRef korrigieren

**Datei:** `frontend/src/components/organization/OrganizationSettings.tsx`

**Problem:**
- Zeile 97: `hasInitialLoadRef.current = true;` wird nur bei Erfolg gesetzt
- Bei Fehler wird es NICHT gesetzt → nächster `permissionsLoading`-Change löst erneut API-Call aus

**Lösung:**
```typescript
// Zeile 84-112: useEffect korrigieren
useEffect(() => {
  // Warte bis Berechtigungen geladen sind
  if (permissionsLoading) {
    return;
  }

  // Nur einmal beim initialen Load ausführen
  if (hasInitialLoadRef.current) {
    return;
  }

  const hasPermission = canViewOrganization();
  if (hasPermission) {
    hasInitialLoadRef.current = true; // ✅ SOFORT setzen, VOR API-Call
    fetchOrganization(false);
  } else {
    setError(t('organization.noPermission'));
    setLoading(false);
    hasInitialLoadRef.current = true; // ✅ AUCH bei Fehler setzen
  }
  
  // ✅ MEMORY: Cleanup - Settings aus State entfernen beim Unmount
  return () => {
    setOrganization(null);
    setStats(null);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [permissionsLoading]);
```

**Checkliste:**
- [ ] `hasInitialLoadRef.current = true;` VOR API-Call setzen
- [ ] `hasInitialLoadRef.current = true;` AUCH bei Fehler setzen
- [ ] Testen: Keine doppelten API-Calls bei `permissionsLoading`-Changes

#### 1.2 JoinRequestsList.tsx - hasInitialLoadRef korrigieren

**Datei:** `frontend/src/components/organization/JoinRequestsList.tsx`

**Problem:**
- Zeile 162: `hasInitialLoadRef.current = true;` wird nur bei Erfolg gesetzt
- Zeile 186: Kommentar sagt "Bei Fehler NICHT hasInitialLoadRef setzen" → FALSCH!

**Lösung:**
```typescript
// Zeile 87-197: useEffect korrigieren
useEffect(() => {
  // ... bestehender Code ...
  
  const fetchJoinRequests = async () => {
    // ✅ SOFORT setzen, VOR API-Call (verhindert Race Conditions)
    hasInitialLoadRef.current = true;
    
    if (!mountedRef.current) {
      logger.log('[JoinRequestsList] Component unmounted, breche ab');
      return;
    }
    
    try {
      // ... API-Call ...
      setJoinRequests(requests);
      setError(null);
    } catch (err: any) {
      // ... Error-Handling ...
      // ✅ hasInitialLoadRef bleibt true (verhindert Re-Fetch)
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  fetchJoinRequests();
}, [permissionsLoading]);
```

**Checkliste:**
- [ ] `hasInitialLoadRef.current = true;` VOR API-Call setzen
- [ ] `hasInitialLoadRef.current = true;` bleibt auch bei Fehler
- [ ] Kommentar "Bei Fehler NICHT hasInitialLoadRef setzen" entfernen
- [ ] Testen: Keine doppelten API-Calls bei `permissionsLoading`-Changes

---

### Phase 2: useEffect-Dependencies stabilisieren (PRIORITÄT 2)

#### 2.1 RoleManagementTab.tsx - fetchRoles stabilisieren

**Datei:** `frontend/src/components/RoleManagementTab.tsx`

**Problem:**
- Zeile 621-644: `fetchRoles` hat Dependencies `[handleError, onError]`
- `handleError` ist aus `useError()` Hook → kann sich ändern
- `onError` ist Prop → kann sich ändern

**Lösung:**
```typescript
// Zeile 620-644: fetchRoles stabilisieren
const fetchRoles = useCallback(async () => {
  setLoading(true);
  logger.log('DEBUGAUSGABE: Hole Rollen vom Server...');
  
  try {
    const response = await roleApi.getAll();
    logger.log('DEBUGAUSGABE: Rollen erfolgreich geholt:', response.data);
    setRoles(response.data);
    setError(null);
  } catch (error) {
    console.error('DEBUGAUSGABE: Fehler beim Abrufen der Rollen:', error);
    // ✅ Verwende handleError direkt (ohne Dependency)
    handleError(error, { 
      component: 'RoleManagementTab', 
      action: 'fetchRoles' 
    });
    // ✅ Verwende onError direkt (ohne Dependency)
    if (onError) {
      onError('Fehler beim Laden der Rollen');
    }
  } finally {
    setLoading(false);
  }
  // ✅ KEINE Dependencies - Funktion wird nur einmal erstellt
}, []); // Leere Dependencies

// ✅ Verwende useRef für handleError und onError (falls nötig)
const handleErrorRef = useRef(handleError);
const onErrorRef = useRef(onError);

useEffect(() => {
  handleErrorRef.current = handleError;
  onErrorRef.current = onError;
}, [handleError, onError]);

// ✅ Verwende Refs in fetchRoles
const fetchRoles = useCallback(async () => {
  // ... API-Call ...
  catch (error) {
    handleErrorRef.current(error, { ... });
    if (onErrorRef.current) {
      onErrorRef.current('Fehler beim Laden der Rollen');
    }
  }
}, []); // Leere Dependencies
```

**Checkliste:**
- [ ] `fetchRoles` hat leere Dependencies `[]`
- [ ] `handleError` und `onError` über Refs verwenden
- [ ] Testen: `fetchRoles` wird nur einmal erstellt

---

### Phase 3: Prisma-Queries optimieren (PRIORITÄT 3)

#### 3.1 getAllRoles() - include reduzieren

**Datei:** `backend/src/controllers/roleController.ts`

**Problem:**
- Zeile 67-93: 3 `include`-Statements (permissions, branches, branch)
- Bei vielen Rollen = langsame Query

**Lösung:**
```typescript
// Zeile 67-93: include reduzieren
let roles = await prisma.role.findMany({
  where: roleFilter,
  include: {
    permissions: {
      select: {
        id: true,
        entity: true,
        entityType: true,
        accessLevel: true
        // ✅ Nur benötigte Felder, nicht alles
      }
    },
    branches: branchId ? {
      where: { branchId },
      select: {
        id: true,
        branchId: true,
        branch: {
          select: {
            id: true,
            name: true
            // ✅ Nur benötigte Felder
          }
        }
      }
    } : {
      select: {
        id: true,
        branchId: true,
        branch: {
          select: {
            id: true,
            name: true
          }
        }
      },
      take: 10 // ✅ Limit für Branches (nicht alle laden)
    }
  },
  orderBy: { name: 'asc' }
});
```

**Checkliste:**
- [ ] `include` durch `select` ersetzen (nur benötigte Felder)
- [ ] Limit für `branches` hinzufügen (z.B. `take: 10`)
- [ ] Testen: Query ist schneller

#### 3.2 getAllTourProviders() - include reduzieren

**Datei:** `backend/src/controllers/tourProviderController.ts`

**Problem:**
- Zeile 36-63: 3 `include`-Statements (organization, branch, tours)
- `tours` hat bereits `take: 5` → gut!

**Lösung:**
```typescript
// Zeile 36-63: include durch select ersetzen
const providers = await prisma.tourProvider.findMany({
  where: whereClause,
  select: {
    id: true,
    name: true,
    contactPerson: true,
    phone: true,
    email: true,
    notes: true,
    organizationId: true,
    branchId: true,
    organization: {
      select: {
        id: true,
        name: true,
        displayName: true
      }
    },
    branch: {
      select: {
        id: true,
        name: true
      }
    },
    tours: {
      select: {
        id: true,
        title: true
      },
      take: 5
    }
  },
  orderBy: {
    name: 'asc'
  }
});
```

**Checkliste:**
- [ ] `include` durch `select` ersetzen (nur benötigte Felder)
- [ ] Testen: Query ist schneller

---

## 📋 IMPLEMENTIERUNGS-REIHENFOLGE

1. **Phase 1: Race Conditions beheben** (Sofort)
   - OrganizationSettings.tsx
   - JoinRequestsList.tsx
   - **Erwartete Verbesserung:** Keine doppelten API-Calls mehr

2. **Phase 2: useEffect-Dependencies stabilisieren** (Nach Phase 1)
   - RoleManagementTab.tsx
   - **Erwartete Verbesserung:** Keine unnötigen Re-Renders mehr

3. **Phase 3: Prisma-Queries optimieren** (Nach Phase 2)
   - getAllRoles()
   - getAllTourProviders()
   - **Erwartete Verbesserung:** 30-50% schnellere Queries

---

## ✅ FINALE PRÜFUNG

Nach ALLEN Phasen prüfen:

1. **Browser-Console prüfen:**
   - Keine doppelten API-Calls
   - Keine Fehler beim Laden

2. **Performance prüfen:**
   - Roles-Tab: < 2 Sekunden
   - Providers-Tab: < 2 Sekunden
   - Organisation-Tab: < 5 Sekunden

3. **Funktionalität prüfen:**
   - Alle Tabs funktionieren korrekt
   - Keine Race Conditions mehr
   - Keine Fehler beim Öffnen

---

**Erstellt:** 2025-02-01  
**Status:** 📋 PLAN - Noch nichts geändert


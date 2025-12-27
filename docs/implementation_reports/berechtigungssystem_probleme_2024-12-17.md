# Berechtigungssystem - Identifizierte Probleme

**Datum:** 2024-12-17  
**Status:** Analyse abgeschlossen - KEINE ÄNDERUNGEN VORGENOMMEN

---

## Problem 1: Sprachinkonsistenzen

### Beobachtungen aus den Bildern:

1. **Sidebar-Navigation:**
   - "Dashboard" (Englisch)
   - "Consultas" (Spanisch)
   - "Centro de Trabajo" (Spanisch)
   - "Nómina" (Spanisch)
   - "Cerebro" (Spanisch)
   - "Organización" (Spanisch)
   - "Análisis de Precios" (Spanisch)
   - "Configuración" (Spanisch)

2. **Organisation-Tabs:**
   - "Usuarios" (Spanisch)
   - "Roles" (Englisch)
   - "Sucursales" (Spanisch)
   - "Proveedores" (Spanisch)
   - "Organización" (Spanisch)

3. **Rolle bearbeiten Modal:**
   - "Rolle bearbeiten" (Deutsch)
   - "Nombre" (Spanisch)
   - "Descripción" (Spanisch)
   - "Detaillierte Berechtigungen" (Deutsch)
   - "Seiten" (Deutsch)
   - "Tabellen" (Deutsch)
   - "Buttons" (Englisch)
   - "Leer y editar todos" (Spanisch)
   - "Sin acceso" (Spanisch)

4. **Nicht übersetzter Key:**
   - `roles.form.allBranches` wird als Text angezeigt (grüner Tag)

---

### Identifizierte Code-Stellen:

#### 1. Fehlende Übersetzung: `roles.form.allBranches`

**Datei:** `frontend/src/components/RoleManagementTab.tsx`  
**Zeile:** 495  
**Code:**
```typescript
{t('roles.form.allBranches') || 'Alle Branches'}
```

**Problem:** Key `roles.form.allBranches` existiert nicht in den Übersetzungsdateien.

**Betroffene Dateien:**
- `frontend/src/i18n/locales/de.json` - Key fehlt
- `frontend/src/i18n/locales/en.json` - Key fehlt
- `frontend/src/i18n/locales/es.json` - Key fehlt

**Weitere Verwendung:**
- Zeile 1691: `{t('roles.form.allBranches') || 'Für alle Branches gültig'}`

---

#### 2. Falsche Übersetzung: `organisation.tabs.providers` (de.json)

**Datei:** `frontend/src/i18n/locales/de.json`  
**Zeile:** 461  
**Aktueller Wert:**
```json
"providers": "Proveedores"
```

**Problem:** Spanischer Text in deutscher Übersetzungsdatei.

**Sollte sein:**
```json
"providers": "Anbieter" // oder "Tour-Anbieter"
```

**Verwendung:**
- `frontend/src/pages/Organisation.tsx` Zeile 181: `t('organisation.tabs.providers', { defaultValue: 'Proveedores' })`

---

#### 3. Sidebar-Sprache inkonsistent

**Datei:** `frontend/src/components/Sidebar.tsx`  
**Zeilen:** 94-150

**Problem:** Sidebar verwendet `t('menu.organization')` etc., aber die geladene Sprache ist inkonsistent.

**Mögliche Ursachen:**
- User-Sprache-Einstellung ist falsch
- Organisation-Sprache überschreibt User-Sprache
- i18n-Konfiguration lädt falsche Sprache

**Übersetzungskeys in de.json (Zeile 84-94):**
```json
"menu": {
  "dashboard": "Dashboard",
  "worktracker": "Worktracker",
  "consultations": "Beratungen",
  "workcenter": "Workcenter",
  "payroll": "Lohnabrechnung",
  "cerebro": "Cerebro",
  "organization": "Organisation",
  "settings": "Einstellungen",
  "priceAnalysis": "Preisanalyse"
}
```

**Problem:** Keys sind korrekt, aber die geladene Sprache ist nicht Deutsch.

---

#### 4. RoleManagementTab - Gemischte Sprachen

**Datei:** `frontend/src/components/RoleManagementTab.tsx`

**Problemstellen:**

**a) Hardcodierte deutsche Texte:**
- Zeile 1392: `"Mehr anzeigen (${filteredAndSortedRoles.length - displayLimit} verbleibend)"`
- Zeile 1429: `"Mehr anzeigen (${filteredAndSortedRoles.length - displayLimit} verbleibend)"`

**b) Fehlende Übersetzungen für:**
- `roles.form.specificBranches` (Zeile 499)
- `roles.form.allBranches` (Zeile 495, 1691)

**c) Display-Names verwenden Übersetzungen, aber:**
- `pageDisplayNames` (Zeile 543-555) - verwendet `t('roles.pages.*')`
- `tableDisplayNames` (Zeile 557-577) - verwendet `t('roles.tables.*')`
- `buttonDisplayNames` (Zeile 579-600) - verwendet `t('roles.buttons.*')`

**Problem:** Wenn die falsche Sprache geladen ist, werden falsche Übersetzungen angezeigt.

---

## Problem 2: Organisationsübergreifende Rollen-Anzeige

### Beobachtung aus den Bildern:

- User ist "Admin • Manila" (Organisation: Manila)
- Es werden Rollen angezeigt von:
  - "Administrator mit allen Rechten" (keine Organisation?)
  - "Administrator von La Familia Hostel" (andere Organisation)
  - "Administrator von Mosaik" (andere Organisation)

**Erwartung:** Nur Rollen der Organisation "Manila" sollten sichtbar sein.

---

### Identifizierte Code-Stellen:

#### 1. Backend: `getAllRoles` - Filter-Logik

**Datei:** `backend/src/controllers/roleController.ts`  
**Zeile:** 57-112

**Code:**
```typescript
export const getAllRoles = async (req: Request, res: Response) => {
    try {
        logger.log('getAllRoles aufgerufen');
        
        // Datenisolation: Zeigt alle Rollen der Organisation oder nur eigene (wenn standalone)
        const roleFilter = getDataIsolationFilter(req as any, 'role');
        
        let roles = await prisma.role.findMany({
            where: roleFilter,
            // ...
        });
```

**Problem-Analyse:**
- `getDataIsolationFilter(req as any, 'role')` wird aufgerufen
- Wenn `req.organizationId` gesetzt ist, sollte Filter `{ organizationId: req.organizationId }` sein
- Wenn `req.organizationId` `null` ist, wird `{ organizationId: null }` zurückgegeben
- In Prisma bedeutet `{ organizationId: null }`: "Rollen wo organizationId = NULL" (Standardrollen)

---

#### 2. Backend: `getDataIsolationFilter` für 'role'

**Datei:** `backend/src/middleware/organization.ts`  
**Zeile:** 322-325

**Code:**
```typescript
case 'role':
  return {
    organizationId: req.organizationId
  };
```

**Problem-Analyse:**

**Szenario 1: `req.organizationId` ist gesetzt (z.B. 5 für Manila)**
- Filter: `{ organizationId: 5 }`
- **Erwartung:** Nur Rollen mit `organizationId = 5`
- **Status:** ✅ Sollte korrekt sein

**Szenario 2: `req.organizationId` ist `null` oder `undefined`**
- Filter: `{ organizationId: null }` oder `{ organizationId: undefined }`
- **Prisma-Verhalten:**
  - `{ organizationId: null }` → Findet Rollen wo `organizationId IS NULL` (Standardrollen)
  - `{ organizationId: undefined }` → Wird ignoriert, findet ALLE Rollen
- **Status:** ❌ **PROBLEM IDENTIFIZIERT**

**Szenario 3: `req.organizationId` ist `0` oder `false`**
- Filter: `{ organizationId: 0 }` oder `{ organizationId: false }`
- **Prisma-Verhalten:** Findet Rollen mit `organizationId = 0` oder `false`
- **Status:** ⚠️ Unwahrscheinlich, aber möglich

---

#### 3. Backend: `organizationMiddleware` setzt `req.organizationId`

**Datei:** `backend/src/middleware/organization.ts`  
**Zeile:** 17-43

**Code:**
```typescript
export const organizationMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    // ✅ PERFORMANCE: Verwende Cache statt DB-Query bei jedem Request
    const cachedData = await organizationCache.get(Number(userId));

    if (!cachedData) {
      logger.error('[organizationMiddleware] Keine aktive Rolle gefunden für userId:', userId);
      return res.status(404).json({ message: 'Keine aktive Rolle gefunden' });
    }
    
    // Füge Organisations-Kontext zum Request hinzu
    req.organizationId = cachedData.organizationId;  // ← KÖNNTE NULL SEIN!
    req.userRole = cachedData.userRole;
    req.branchId = cachedData.branchId;

    next();
  } catch (error) {
    logger.error('❌ Error in Organization Middleware:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};
```

**Problem-Analyse:**

**Wenn `cachedData.organizationId` `null` ist:**
- `req.organizationId = null`
- `getDataIsolationFilter` gibt `{ organizationId: null }` zurück
- Prisma findet Rollen mit `organizationId IS NULL` (Standardrollen)
- **Status:** ❌ **PROBLEM IDENTIFIZIERT**

**Mögliche Ursachen:**
1. User hat keine aktive Rolle mit Organisation
2. `organizationCache` enthält `organizationId: null`
3. Standardrollen (Admin, User, Hamburger) haben `organizationId: null`

---

#### 4. Frontend: `roleApi.getAll()` - Keine explizite Filterung

**Datei:** `frontend/src/api/apiClient.ts`  
**Zeile:** 82-90

**Code:**
```typescript
getAll: (branchId?: number) => {
    logger.log('DEBUGAUSGABE API-Client: roleApi.getAll wird aufgerufen', branchId ? `mit branchId=${branchId}` : '');
    const url = branchId ? `/roles?branchId=${branchId}` : '/roles';
    return apiClient.get(url);
}
```

**Datei:** `frontend/src/components/RoleManagementTab.tsx`  
**Zeile:** 746

**Code:**
```typescript
const response = await roleApi.getAll();
```

**Problem-Analyse:**
- Frontend sendet keine explizite `organizationId`
- Backend sollte `req.organizationId` aus Middleware verwenden
- **Status:** ✅ Sollte korrekt sein, WENN Backend korrekt filtert

---

#### 5. Prisma Query - Mögliche NULL-Behandlung

**Datei:** `backend/src/controllers/roleController.ts`  
**Zeile:** 67-93

**Code:**
```typescript
let roles = await prisma.role.findMany({
    where: roleFilter,
    include: {
        permissions: true,
        branches: branchId ? {
            // ...
        } : {
            // ...
        }
    },
    orderBy: { name: 'asc' }
});
```

**Problem-Analyse:**

**Wenn `roleFilter = { organizationId: null }`:**
- Prisma findet Rollen wo `organizationId IS NULL`
- Das sind Standardrollen (Admin, User, Hamburger) ohne Organisation
- **Status:** ❌ **PROBLEM IDENTIFIZIERT**

**Wenn `roleFilter = { organizationId: undefined }`:**
- Prisma ignoriert den Filter
- Findet ALLE Rollen (organisationsübergreifend)
- **Status:** ❌ **KRITISCHES PROBLEM**

---

### Zusammenfassung Problem 2:

**Hauptursache:** `getDataIsolationFilter` für 'role' gibt `{ organizationId: req.organizationId }` zurück, auch wenn `req.organizationId` `null` ist.

**Lösungsansatz:**
1. In `getDataIsolationFilter` prüfen: Wenn `req.organizationId` `null` oder `undefined` ist, KEINEN Filter zurückgeben (leeres Objekt `{}` würde ALLE Rollen finden - auch falsch!)
2. **KORREKT:** Wenn `req.organizationId` `null` ist, sollte ein Fehler zurückgegeben werden ODER nur Rollen ohne Organisation (Standardrollen) angezeigt werden
3. **BESSER:** `getDataIsolationFilter` sollte für 'role' explizit prüfen und nur Rollen der Organisation zurückgeben, wenn `req.organizationId` gesetzt ist

---

## Systematische Code-Stellen-Liste

### Problem 1: Sprachinkonsistenzen

| # | Datei | Zeile | Problem | Status |
|---|-------|-------|---------|--------|
| 1.1 | `frontend/src/i18n/locales/de.json` | 461 | `"providers": "Proveedores"` (Spanisch statt Deutsch) | ❌ |
| 1.2 | `frontend/src/i18n/locales/de.json` | - | Key `roles.form.allBranches` fehlt | ❌ |
| 1.3 | `frontend/src/i18n/locales/en.json` | - | Key `roles.form.allBranches` fehlt | ❌ |
| 1.4 | `frontend/src/i18n/locales/es.json` | - | Key `roles.form.allBranches` fehlt | ❌ |
| 1.5 | `frontend/src/i18n/locales/de.json` | - | Key `roles.form.specificBranches` fehlt | ❌ |
| 1.6 | `frontend/src/components/RoleManagementTab.tsx` | 1392, 1429 | Hardcodierte deutsche Texte "Mehr anzeigen" | ❌ |
| 1.7 | `frontend/src/components/Sidebar.tsx` | 94-150 | Sprache wird inkonsistent geladen (User-Sprache vs. Org-Sprache) | ⚠️ |

### Problem 2: Organisationsübergreifende Rollen

| # | Datei | Zeile | Problem | Status |
|---|-------|-------|---------|--------|
| 2.1 | `backend/src/middleware/organization.ts` | 322-325 | `getDataIsolationFilter` für 'role' gibt `{ organizationId: req.organizationId }` zurück, auch wenn `null` | ❌ |
| 2.2 | `backend/src/middleware/organization.ts` | 34 | `req.organizationId = cachedData.organizationId` kann `null` sein | ⚠️ |
| 2.3 | `backend/src/controllers/roleController.ts` | 62 | `getDataIsolationFilter(req as any, 'role')` wird verwendet, könnte `{ organizationId: null }` zurückgeben | ❌ |
| 2.4 | `backend/src/controllers/roleController.ts` | 67-93 | Prisma Query verwendet Filter, der `null` enthalten kann | ❌ |

---

## Empfohlene Fixes (NICHT IMPLEMENTIERT)

### Fix 1.1: Übersetzungen hinzufügen

**Datei:** `frontend/src/i18n/locales/de.json`
```json
"roles": {
  "form": {
    "allBranches": "Für alle Branches",
    "specificBranches": "Spezifische Branches"
  }
}
```

**Datei:** `frontend/src/i18n/locales/de.json` Zeile 461
```json
"providers": "Anbieter"  // Statt "Proveedores"
```

### Fix 2.1: `getDataIsolationFilter` für 'role' korrigieren

**Datei:** `backend/src/middleware/organization.ts` Zeile 322-325

**Aktuell:**
```typescript
case 'role':
  return {
    organizationId: req.organizationId
  };
```

**Sollte sein:**
```typescript
case 'role':
  // Wenn keine Organisation: Nur Standardrollen (organizationId IS NULL)
  if (!req.organizationId) {
    return {
      organizationId: null
    };
  }
  // Wenn Organisation vorhanden: Nur Rollen dieser Organisation
  return {
    organizationId: req.organizationId
  };
```

**ODER (besser):**
```typescript
case 'role':
  // Wenn keine Organisation: Fehler oder leere Liste
  if (!req.organizationId) {
    return {
      id: -1  // Garantiert keine Ergebnisse
    };
  }
  // Wenn Organisation vorhanden: Nur Rollen dieser Organisation
  return {
    organizationId: req.organizationId
  };
```

---

## Zusammenfassung

### Problem 1: Sprachinkonsistenzen
- **7 identifizierte Stellen**
- Hauptursache: Fehlende Übersetzungskeys und falsche Übersetzung in de.json
- **Backend priorisiert User-Sprache korrekt** (`getUserActiveLanguage` Zeile 1293-1294)
- **Frontend:** `languageService.getActiveLanguage()` ruft `/users/active-language` auf, sollte korrekt sein
- **Problem:** Übersetzungskeys fehlen oder werden nicht korrekt geladen

### Problem 2: Organisationsübergreifende Daten-Anzeige
- **11 Entities betroffen:** role, branch, request, worktime, client, invoice, consultationInvoice, monthlyReport, monthlyConsultationReport, cerebroCarticle, carticle, user
- **Hauptursache:** `getDataIsolationFilter` gibt `{ organizationId: req.organizationId }` zurück, auch wenn `null`/`undefined`
- **Prisma-Verhalten:**
  - `{ organizationId: null }` → Findet Einträge wo `organizationId IS NULL` (Standardrollen/Branches)
  - `{ organizationId: undefined }` → Filter wird ignoriert → **ALLE Einträge werden angezeigt**
- **Betroffene Controller:**
  - `roleController.ts` - getAllRoles verwendet getDataIsolationFilter('role')
  - `branchController.ts` - getAllBranches verwendet getDataIsolationFilter('branch')
  - `userController.ts` - verwendet getDataIsolationFilter('role', 'branch')
  - `taskController.ts`, `requestController.ts`, `analyticsController.ts` - verwenden getDataIsolationFilter für verschiedene Entities

---

**Status:** Analyse abgeschlossen, Lösungsplan erstellt in `berechtigungssystem_probleme_loesungsplan_2024-12-17.md`

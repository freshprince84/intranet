# Berechtigungssystem - Lösungsplan für identifizierte Probleme

**Datum:** 2024-12-17  
**Status:** Lösungsplan erstellt - NOCH NICHT IMPLEMENTIERT

---

## Problem 1: Sprachinkonsistenzen

### Ursache

**Backend:** `getUserActiveLanguage` priorisiert User-Sprache korrekt (Zeile 1294), aber Frontend lädt möglicherweise nicht korrekt.

**Frontend:** 
- `languageService.getActiveLanguage()` ruft `/users/active-language` auf
- `LanguageContext` lädt Sprache beim Mount
- Problem: Übersetzungskeys fehlen oder werden nicht korrekt geladen

### Identifizierte Stellen

| # | Datei | Zeile | Problem | Fix |
|---|-------|-------|---------|-----|
| 1.1 | `frontend/src/i18n/locales/de.json` | 461 | `"providers": "Proveedores"` (Spanisch) | → `"Anbieter"` |
| 1.2 | `frontend/src/i18n/locales/*.json` | - | Key `roles.form.allBranches` fehlt | Hinzufügen |
| 1.3 | `frontend/src/i18n/locales/*.json` | - | Key `roles.form.specificBranches` fehlt | Hinzufügen |
| 1.4 | `frontend/src/components/RoleManagementTab.tsx` | 1392, 1429 | Hardcodierte deutsche Texte | `t('common.showMore')` verwenden |

---

## Problem 2: Organisationsübergreifende Daten-Anzeige

### Ursache

**Kernproblem:** `getDataIsolationFilter` gibt `{ organizationId: req.organizationId }` zurück, auch wenn `req.organizationId` `null` oder `undefined` ist.

**Prisma-Verhalten:**
- `{ organizationId: null }` → Findet Einträge wo `organizationId IS NULL` (Standardrollen/Branches)
- `{ organizationId: undefined }` → Filter wird ignoriert → **ALLE Einträge werden angezeigt**

### Betroffene Entities

| Entity | Datei | Zeile | Problem |
|--------|-------|-------|---------|
| **role** | `backend/src/middleware/organization.ts` | 322-325 | Gibt `{ organizationId: req.organizationId }` zurück, auch wenn `null` |
| **branch** | `backend/src/middleware/organization.ts` | 296-308 | Gleiches Problem |
| **request** | `backend/src/middleware/organization.ts` | 293-308 | Gleiches Problem |
| **worktime** | `backend/src/middleware/organization.ts` | 293-308 | Gleiches Problem |
| **client** | `backend/src/middleware/organization.ts` | 293-308 | Gleiches Problem |
| **invoice** | `backend/src/middleware/organization.ts` | 293-308 | Gleiches Problem |
| **consultationInvoice** | `backend/src/middleware/organization.ts` | 293-308 | Gleiches Problem |
| **monthlyReport** | `backend/src/middleware/organization.ts` | 293-308 | Gleiches Problem |
| **monthlyConsultationReport** | `backend/src/middleware/organization.ts` | 293-308 | Gleiches Problem |
| **cerebroCarticle** | `backend/src/middleware/organization.ts` | 293-308 | Gleiches Problem |
| **carticle** | `backend/src/middleware/organization.ts` | 293-308 | Gleiches Problem |
| **user** | `backend/src/middleware/organization.ts` | 310-320 | Filter über `roles.some.role.organizationId`, könnte auch `null` sein |

**Gesamt:** 11 Entities betroffen (inkl. 'role' und 'branch')

---

## Lösungsplan

### Phase 1: Sprachprobleme beheben

#### 1.1 Übersetzungskeys hinzufügen

**Dateien:** `frontend/src/i18n/locales/de.json`, `en.json`, `es.json`

**Änderungen:**

**de.json:**
```json
"roles": {
  "form": {
    "allBranches": "Für alle Branches",
    "specificBranches": "Spezifische Branches"
  }
}
```

**de.json Zeile 461:**
```json
"providers": "Anbieter"  // Statt "Proveedores"
```

**en.json:**
```json
"roles": {
  "form": {
    "allBranches": "For all branches",
    "specificBranches": "Specific branches"
  }
}
```

**es.json:**
```json
"roles": {
  "form": {
    "allBranches": "Para todas las sucursales",
    "specificBranches": "Sucursales específicas"
  }
}
```

#### 1.2 Hardcodierte Texte ersetzen

**Datei:** `frontend/src/components/RoleManagementTab.tsx`

**Zeile 1392, 1429:**
```typescript
// ALT:
{`Mehr anzeigen (${filteredAndSortedRoles.length - displayLimit} verbleibend)`}

// NEU:
{t('common.showMore')} ({filteredAndSortedRoles.length - displayLimit} {t('common.remaining')})
```

---

### Phase 2: Organisations-Isolation korrigieren

#### 2.1 `getDataIsolationFilter` für alle betroffenen Entities korrigieren

**Datei:** `backend/src/middleware/organization.ts`

**Problem:** Zeile 293-325 - Alle Entities geben `{ organizationId: req.organizationId }` zurück, auch wenn `null`.

**Lösung:** Explizite Prüfung auf `null`/`undefined` und korrekte Behandlung.

**Aktueller Code (Zeile 293-325):**
```typescript
case 'request':
case 'worktime':
case 'client':
case 'branch':
case 'invoice':
case 'consultationInvoice':
case 'monthlyReport':
case 'monthlyConsultationReport':
case 'cerebroCarticle':
case 'carticle':
  // Einfache Filterung nach organizationId
  // WICHTIG: Wenn organizationId gesetzt ist, werden nur Einträge mit dieser organizationId angezeigt
  // NULL-Werte werden automatisch ausgeschlossen
  return {
    organizationId: req.organizationId
  };

case 'user':
  // User-Filterung bleibt komplex (über UserRole)
  return {
    roles: {
      some: {
        role: {
          organizationId: req.organizationId
        }
      }
    }
  };

case 'role':
  return {
    organizationId: req.organizationId
  };
```

**Neuer Code:**
```typescript
case 'request':
case 'worktime':
case 'client':
case 'branch':
case 'invoice':
case 'consultationInvoice':
case 'monthlyReport':
case 'monthlyConsultationReport':
case 'cerebroCarticle':
case 'carticle':
  // Einfache Filterung nach organizationId
  // WICHTIG: Wenn organizationId null/undefined ist, gibt es keine Ergebnisse
  if (!req.organizationId) {
    // Keine Organisation: Garantiert keine Ergebnisse (sicherer als leeres Objekt)
    return { id: -1 };
  }
  return {
    organizationId: req.organizationId
  };

case 'user':
  // User-Filterung bleibt komplex (über UserRole)
  if (!req.organizationId) {
    // Keine Organisation: Nur eigene User-Daten
    return { id: userId };
  }
  return {
    roles: {
      some: {
        role: {
          organizationId: req.organizationId
        }
      }
    }
  };

case 'role':
  // Rollen: Nur Rollen der Organisation
  if (!req.organizationId) {
    // Keine Organisation: Garantiert keine Ergebnisse
    return { id: -1 };
  }
  return {
    organizationId: req.organizationId
  };
```

**Begründung:**
- `{ id: -1 }` garantiert keine Ergebnisse (sicherer als leeres Objekt `{}`, das alle Einträge findet)
- Explizite Prüfung verhindert `null`/`undefined`-Probleme
- Code bleibt einfach und performant

---

#### 2.2 `organizationMiddleware` prüfen

**Datei:** `backend/src/middleware/organization.ts`  
**Zeile:** 17-43

**Aktueller Code:**
```typescript
req.organizationId = cachedData.organizationId;  // ← KANN NULL SEIN
```

**Problem:** Wenn `cachedData.organizationId` `null` ist, wird `req.organizationId = null` gesetzt.

**Lösung:** Keine Änderung nötig - `getDataIsolationFilter` behandelt `null` jetzt korrekt.

**Optional:** Logging hinzufügen für Debugging:
```typescript
if (!cachedData.organizationId) {
  logger.warn(`[organizationMiddleware] User ${userId} hat keine Organisation`);
}
req.organizationId = cachedData.organizationId;
```

---

### Phase 3: Weitere betroffene Stellen prüfen

#### 3.1 Alle Controller prüfen, die `getDataIsolationFilter` verwenden

**Betroffene Controller (17 Dateien):**

| Controller | Verwendet getDataIsolationFilter für | Status |
|------------|--------------------------------------|--------|
| `roleController.ts` | 'role', 'branch' | ✅ Betroffen |
| `branchController.ts` | 'branch' | ✅ Betroffen |
| `userController.ts` | 'role', 'branch' | ✅ Betroffen |
| `taskController.ts` | 'task' | ⚠️ Task hat eigene Logik (Zeile 248-291), prüft `req.organizationId` explizit |
| `requestController.ts` | 'request' | ✅ Betroffen |
| `analyticsController.ts` | 'task', 'request', 'workTime' | ✅ Betroffen |
| `worktimeController.ts` | 'worktime' | ✅ Betroffen |
| `teamWorktimeController.ts` | 'worktime' | ✅ Betroffen |
| `consultationController.ts` | 'client', 'worktime' | ✅ Betroffen |
| `clientController.ts` | 'client' | ✅ Betroffen |
| `consultationInvoiceController.ts` | 'invoice' | ✅ Betroffen |
| `monthlyConsultationReportController.ts` | 'monthlyReport' | ✅ Betroffen |
| `cerebroController.ts` | 'cerebroCarticle' | ✅ Betroffen |

**Status:** Alle verwenden `getDataIsolationFilter`, daher wird Fix in `organization.ts` alle betreffen.

**Ausnahme:** `taskController.ts` hat eigene Logik (Zeile 248-291), die `req.organizationId` explizit prüft - sollte korrekt sein, aber prüfen.

#### 3.2 Direkte Verwendung von `req.organizationId` ohne `getDataIsolationFilter`

**Gefundene Stellen:**

| Datei | Zeile | Code | Problem |
|-------|-------|------|---------|
| `organizationController.ts` | 758 | `where: { organizationId: req.organizationId }` | Könnte `null` sein |
| `organizationController.ts` | 1281 | `where: { organizationId: req.organizationId }` | Könnte `null` sein |
| `organizationController.ts` | 1379, 1387, 1404 | `where: { organizationId: req.organizationId }` | Könnte `null` sein |
| `taskController.ts` | 362 | `organizationId: req.organizationId \|\| null` | Explizit `null` gesetzt - OK |
| `requestController.ts` | 548, 852 | `organizationId: req.organizationId \|\| null` | Explizit `null` gesetzt - OK |
| `worktimeController.ts` | 123 | `organizationId: req.organizationId \|\| null` | Explizit `null` gesetzt - OK |

**Status:** 
- `organizationController.ts` verwendet `req.organizationId` direkt, **ABER** hat Prüfungen davor (z.B. Zeile 749: `if (!req.organizationId) { return res.status(400)... }`) - ✅ **GESCHÜTZT**
- Andere Controller setzen explizit `|| null` - sollte OK sein, aber prüfen ob korrekt behandelt wird

**Fazit:** Hauptproblem ist in `getDataIsolationFilter` - alle anderen Stellen sind entweder geschützt oder verwenden explizit `|| null`.

---

## Implementierungsreihenfolge

1. **Phase 1.1:** Übersetzungskeys hinzufügen (de.json, en.json, es.json)
2. **Phase 1.2:** Hardcodierte Texte ersetzen (RoleManagementTab.tsx)
3. **Phase 2.1:** `getDataIsolationFilter` korrigieren (organization.ts)
4. **Phase 2.2:** Optional: Logging hinzufügen
5. **Phase 3:** Testen mit verschiedenen Szenarien

---

## Testfälle

### Sprachprobleme

1. **User-Sprache = Spanisch, Org-Sprache = Spanisch**
   - Erwartung: Alles auf Spanisch
   - Prüfen: Sidebar, Tabs, RoleManagementTab, alle Texte

2. **User-Sprache = Deutsch, Org-Sprache = Spanisch**
   - Erwartung: Alles auf Deutsch (User hat Priorität)
   - Prüfen: Sidebar, Tabs, RoleManagementTab

3. **User-Sprache = null, Org-Sprache = Spanisch**
   - Erwartung: Alles auf Spanisch (Org als Fallback)
   - Prüfen: Sidebar, Tabs, RoleManagementTab

### Organisations-Isolation

1. **User in Organisation "Manila"**
   - Erwartung: Nur Rollen/Branches von Manila sichtbar
   - Prüfen: RoleManagementTab, BranchManagementTab

2. **User ohne Organisation (Standalone)**
   - Erwartung: Keine Rollen/Branches sichtbar (oder nur eigene)
   - Prüfen: RoleManagementTab, BranchManagementTab

3. **User wechselt Organisation**
   - Erwartung: Nur Daten der neuen Organisation sichtbar
   - Prüfen: Alle Listen aktualisieren sich

---

## Risiken und Überlegungen

### Risiko 1: `{ id: -1 }` könnte unerwartete Seiteneffekte haben

**Mitigation:** 
- Prisma ignoriert `id: -1` wenn keine Einträge mit dieser ID existieren
- Alternativ: `{ id: { in: [] } }` (leeres Array) - garantiert keine Ergebnisse

### Risiko 2: Performance-Impact

**Mitigation:**
- `{ id: -1 }` ist O(1) Lookup, sehr schnell
- Keine zusätzlichen DB-Queries nötig

### Risiko 3: Bestehende Daten mit `organizationId = null`

**Mitigation:**
- Standardrollen (Admin, User, Hamburger) haben `organizationId = null`
- Diese sollten nur für Standalone-User sichtbar sein
- Mit Fix werden sie für User mit Organisation NICHT mehr angezeigt ✅

---

## Code-Qualität

### Vereinfachung

**Vorher:**
```typescript
return {
  organizationId: req.organizationId  // Kann null sein
};
```

**Nachher:**
```typescript
if (!req.organizationId) {
  return { id: -1 };
}
return {
  organizationId: req.organizationId
};
```

**Vorteil:**
- Explizite Behandlung von Edge-Cases
- Keine versteckten `null`-Probleme
- Code ist selbstdokumentierend

### Performance

- Keine zusätzlichen DB-Queries
- `{ id: -1 }` ist sehr schnell (Index-Lookup)
- Keine Performance-Verschlechterung

---

## Zusammenfassung

### Problem 1: Sprachinkonsistenzen
- **4 Stellen** identifiziert
- **Lösung:** Übersetzungskeys hinzufügen, hardcodierte Texte ersetzen
- **Aufwand:** Niedrig (nur Übersetzungen)

### Problem 2: Organisationsübergreifende Daten
- **11 Entities** betroffen (role, branch, request, worktime, client, invoice, consultationInvoice, monthlyReport, monthlyConsultationReport, cerebroCarticle, carticle, user)
- **Lösung:** `getDataIsolationFilter` korrigieren - explizite `null`-Prüfung
- **Aufwand:** Mittel (eine zentrale Funktion ändern)

**Status:** Lösungsplan erstellt, bereit zur Implementierung.

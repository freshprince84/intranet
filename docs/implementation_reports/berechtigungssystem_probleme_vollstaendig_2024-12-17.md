# Berechtigungssystem - Vollständige Problem-Analyse & Lösungsplan

**Datum:** 2024-12-17  
**Status:** Vollständige Analyse abgeschlossen

---

## Zusammenfassung

### Problem 1: Sprachinkonsistenzen
- **4 Stellen** identifiziert
- **Ursache:** Fehlende Übersetzungskeys, falsche Übersetzung in de.json
- **Backend:** Priorisiert User-Sprache korrekt ✅
- **Frontend:** Übersetzungskeys fehlen oder werden nicht korrekt geladen

### Problem 2: Organisationsübergreifende Daten-Anzeige
- **11 Entities** betroffen (role, branch, request, worktime, client, invoice, consultationInvoice, monthlyReport, monthlyConsultationReport, cerebroCarticle, carticle, user)
- **17 Controller** verwenden `getDataIsolationFilter`
- **Ursache:** `getDataIsolationFilter` gibt `{ organizationId: req.organizationId }` zurück, auch wenn `null`/`undefined`
- **Prisma-Verhalten:** 
  - `{ organizationId: null }` → Findet Einträge wo `organizationId IS NULL`
  - `{ organizationId: undefined }` → Filter wird ignoriert → **ALLE Einträge**

---

## Problem 1: Sprachinkonsistenzen - Vollständige Liste

### 1.1 Fehlende Übersetzungskeys

| # | Datei | Zeile | Key | Problem | Fix |
|---|-------|-------|-----|---------|-----|
| 1.1.1 | `frontend/src/i18n/locales/de.json` | 461 | `organisation.tabs.providers` | Wert ist `"Proveedores"` (Spanisch) | → `"Anbieter"` |
| 1.1.2 | `frontend/src/i18n/locales/de.json` | - | `roles.form.allBranches` | Key fehlt | Hinzufügen |
| 1.1.3 | `frontend/src/i18n/locales/en.json` | - | `roles.form.allBranches` | Key fehlt | Hinzufügen |
| 1.1.4 | `frontend/src/i18n/locales/es.json` | - | `roles.form.allBranches` | Key fehlt | Hinzufügen |
| 1.1.5 | `frontend/src/i18n/locales/de.json` | - | `roles.form.specificBranches` | Key fehlt | Hinzufügen |
| 1.1.6 | `frontend/src/i18n/locales/en.json` | - | `roles.form.specificBranches` | Key fehlt | Hinzufügen |
| 1.1.7 | `frontend/src/i18n/locales/es.json` | - | `roles.form.specificBranches` | Key fehlt | Hinzufügen |

### 1.2 Hardcodierte Texte

| # | Datei | Zeile | Problem | Fix |
|---|-------|-------|---------|-----|
| 1.2.1 | `frontend/src/components/RoleManagementTab.tsx` | 1392 | Hardcodierter deutscher Text `"Mehr anzeigen (... verbleibend)"` | `t('common.showMore')` + `t('common.remaining')` |
| 1.2.2 | `frontend/src/components/RoleManagementTab.tsx` | 1429 | Hardcodierter deutscher Text `"Mehr anzeigen (... verbleibend)"` | `t('common.showMore')` + `t('common.remaining')` |

### 1.3 Sprach-Loading (Backend korrekt, Frontend prüfen)

**Backend:** `backend/src/controllers/userController.ts` Zeile 1254-1311
- ✅ Priorisiert User-Sprache (Zeile 1293-1294)
- ✅ Fallback auf Org-Sprache (Zeile 1296-1303)
- ✅ Fallback auf 'de' (Zeile 1307-1309)

**Frontend:** `frontend/src/services/languageService.ts` Zeile 38-64
- ✅ Ruft `/users/active-language` auf
- ✅ Setzt `i18n.changeLanguage(language)`

**Frontend:** `frontend/src/contexts/LanguageContext.tsx` Zeile 64-115
- ✅ Lädt Sprache beim Mount
- ✅ Setzt `i18n.changeLanguage(activeLanguage)` (Zeile 122)

**Mögliches Problem:** Wenn `i18n.changeLanguage()` nicht sofort wirkt, werden alte Übersetzungen angezeigt.

---

## Problem 2: Organisationsübergreifende Daten - Vollständige Liste

### 2.1 Betroffene Entities in `getDataIsolationFilter`

**Datei:** `backend/src/middleware/organization.ts`

| Entity | Zeile | Aktueller Code | Problem |
|--------|-------|----------------|---------|
| **role** | 322-325 | `return { organizationId: req.organizationId }` | Gibt `null` zurück wenn `req.organizationId = null` |
| **branch** | 296-308 | `return { organizationId: req.organizationId }` | Gleiches Problem |
| **request** | 293-308 | `return { organizationId: req.organizationId }` | Gleiches Problem |
| **worktime** | 293-308 | `return { organizationId: req.organizationId }` | Gleiches Problem |
| **client** | 293-308 | `return { organizationId: req.organizationId }` | Gleiches Problem |
| **invoice** | 293-308 | `return { organizationId: req.organizationId }` | Gleiches Problem |
| **consultationInvoice** | 293-308 | `return { organizationId: req.organizationId }` | Gleiches Problem |
| **monthlyReport** | 293-308 | `return { organizationId: req.organizationId }` | Gleiches Problem |
| **monthlyConsultationReport** | 293-308 | `return { organizationId: req.organizationId }` | Gleiches Problem |
| **cerebroCarticle** | 293-308 | `return { organizationId: req.organizationId }` | Gleiches Problem |
| **carticle** | 293-308 | `return { organizationId: req.organizationId }` | Gleiches Problem |
| **user** | 310-320 | `roles.some.role.organizationId: req.organizationId` | Könnte auch `null` sein |

**Gesamt:** 12 Entities betroffen

---

### 2.2 Controller, die `getDataIsolationFilter` verwenden

| Controller | Entities | Verwendungen | Status |
|------------|----------|--------------|--------|
| `roleController.ts` | 'role', 'branch' | 3x (Zeile 62, 218, 369, 525, 610, 823) | ✅ Betroffen |
| `branchController.ts` | 'branch' | 7x (Zeile 29, 278, 450, 702, 771, 829, 914) | ✅ Betroffen |
| `userController.ts` | 'role', 'branch' | 3x (Zeile 842, 1033, 2328) | ✅ Betroffen |
| `taskController.ts` | 'task' | 5x (Zeile 271, 468, 889, 977, 1041) | ⚠️ Hat eigene Logik, prüft `req.organizationId` explizit |
| `requestController.ts` | 'request' | 3x (Zeile 365, 659, 960) | ✅ Betroffen |
| `analyticsController.ts` | 'task', 'request', 'workTime' | 8x (Zeile 22, 176, 457, 651, 836, 1099, 1101, 1281, 1408, 1536, 1638) | ✅ Betroffen |
| `worktimeController.ts` | 'worktime' | 3x (Zeile 236, 307, 343) | ✅ Betroffen |
| `teamWorktimeController.ts` | 'worktime' | 4x (Zeile 22, 85, 157, 236) | ✅ Betroffen |
| `consultationController.ts` | 'client', 'worktime' | 2x (Zeile 21, 126) | ✅ Betroffen |
| `clientController.ts` | 'client' | 1x (Zeile 10) | ✅ Betroffen |
| `consultationInvoiceController.ts` | 'invoice' | 1x (Zeile 195) | ✅ Betroffen |
| `monthlyConsultationReportController.ts` | 'monthlyReport' | 1x (Zeile 22) | ✅ Betroffen |
| `cerebroController.ts` | 'cerebroCarticle' | 2x (Zeile 36, 115) | ✅ Betroffen |

**Gesamt:** 13 Controller, ~45 Verwendungen von `getDataIsolationFilter`

---

### 2.3 Direkte Verwendung von `req.organizationId` (ohne `getDataIsolationFilter`)

| Datei | Zeile | Code | Prüfung vorhanden? | Status |
|-------|-------|------|-------------------|--------|
| `organizationController.ts` | 749 | `if (!req.organizationId) { return res.status(400)... }` | ✅ Ja | ✅ Geschützt |
| `organizationController.ts` | 758 | `where: { organizationId: req.organizationId }` | ✅ Ja (Zeile 749) | ✅ Geschützt |
| `organizationController.ts` | 800 | `if (!req.organizationId) { return res.status(400)... }` | ✅ Ja | ✅ Geschützt |
| `organizationController.ts` | 1263 | `if (!req.organizationId) { return res.status(400)... }` | ✅ Ja | ✅ Geschützt |
| `organizationController.ts` | 1281 | `where: { organizationId: req.organizationId }` | ✅ Ja (Zeile 1263) | ✅ Geschützt |
| `organizationController.ts` | 1306 | `if (!req.organizationId) { return res.status(400)... }` | ✅ Ja | ✅ Geschützt |
| `organizationController.ts` | 1379, 1387, 1404 | `where: { organizationId: req.organizationId }` | ✅ Ja (Zeile 1306) | ✅ Geschützt |
| `taskController.ts` | 362 | `organizationId: req.organizationId \|\| null` | ⚠️ Explizit `null` | ⚠️ Prüfen |
| `requestController.ts` | 548, 852 | `organizationId: req.organizationId \|\| null` | ⚠️ Explizit `null` | ⚠️ Prüfen |
| `worktimeController.ts` | 123 | `organizationId: req.organizationId \|\| null` | ⚠️ Explizit `null` | ⚠️ Prüfen |

**Fazit:** 
- `organizationController.ts` ist geschützt (Prüfungen vorhanden) ✅
- Andere Controller setzen explizit `|| null` - sollte OK sein, aber prüfen ob Prisma korrekt behandelt

---

## Lösungsplan (Sauber & Regeln-konform)

### Phase 1: Sprachprobleme beheben

#### Schritt 1.1: Übersetzungskeys hinzufügen

**Dateien:** `frontend/src/i18n/locales/de.json`, `en.json`, `es.json`

**Änderungen:**

**de.json Zeile 461:**
```json
"providers": "Anbieter"  // Statt "Proveedores"
```

**de.json (in `roles.form`):**
```json
"allBranches": "Für alle Branches",
"specificBranches": "Spezifische Branches"
```

**en.json (in `roles.form`):**
```json
"allBranches": "For all branches",
"specificBranches": "Specific branches"
```

**es.json (in `roles.form`):**
```json
"allBranches": "Para todas las sucursales",
"specificBranches": "Sucursales específicas"
```

#### Schritt 1.2: Hardcodierte Texte ersetzen

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

#### Schritt 2.1: `getDataIsolationFilter` korrigieren

**Datei:** `backend/src/middleware/organization.ts`  
**Zeile:** 293-325

**Aktueller Code:**
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
- ✅ Explizite Prüfung verhindert `null`/`undefined`-Probleme
- ✅ `{ id: -1 }` garantiert keine Ergebnisse (sicherer als `{}`)
- ✅ Code bleibt einfach und performant
- ✅ Keine Performance-Verschlechterung (O(1) Lookup)
- ✅ Entspricht Regeln: Vereinfacht Code, keine Fixes/Workarounds

---

## Implementierungsreihenfolge

1. **Phase 1.1:** Übersetzungskeys hinzufügen (de.json, en.json, es.json)
2. **Phase 1.2:** Hardcodierte Texte ersetzen (RoleManagementTab.tsx)
3. **Phase 2.1:** `getDataIsolationFilter` korrigieren (organization.ts)
4. **Testen:** Mit verschiedenen Szenarien (User mit/ohne Org, verschiedene Sprachen)

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

## Code-Qualität & Regeln-Konformität

### ✅ Vereinfachung
- Code wird expliziter (keine versteckten `null`-Probleme)
- Keine zusätzliche Komplexität

### ✅ Performance
- Keine zusätzlichen DB-Queries
- `{ id: -1 }` ist O(1) Lookup
- Keine Performance-Verschlechterung

### ✅ Keine Fixes/Workarounds
- Langfristige, saubere Lösung
- Explizite Behandlung von Edge-Cases
- Keine temporären Workarounds

### ✅ Keine Memory Leaks
- Keine neuen Caches oder Listeners
- Keine Memory-Leak-Risiken

---

## Zusammenfassung

### Problem 1: Sprachinkonsistenzen
- **7 Stellen** identifiziert
- **Lösung:** Übersetzungskeys hinzufügen, hardcodierte Texte ersetzen
- **Aufwand:** Niedrig

### Problem 2: Organisationsübergreifende Daten
- **12 Entities** betroffen
- **13 Controller** verwenden `getDataIsolationFilter`
- **~45 Verwendungen** von `getDataIsolationFilter`
- **Lösung:** `getDataIsolationFilter` korrigieren - explizite `null`-Prüfung
- **Aufwand:** Mittel (eine zentrale Funktion ändern)

**Status:** Lösungsplan erstellt, bereit zur Implementierung.

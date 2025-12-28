# Berechtigungssystem - Dokumentations-Aktualisierung

**Datum:** 2024-12-28  
**Status:** 📋 ANALYSE ABGESCHLOSSEN

---

## 🔍 SYSTEMATISCHE ANALYSE: Welche Dokumente müssen aktualisiert werden?

### Durchgeführte Änderungen (Zusammenfassung)

1. **Neues AccessLevel-Format:**
   - `none`, `own_read`, `own_both`, `all_read`, `all_both`
   - Legacy-Format (`read`, `write`, `both`) wird weiterhin unterstützt

2. **EntityType-Hierarchie:**
   - PAGE > BOX/TAB > BUTTON
   - `entityType`: `'page'`, `'box'`, `'tab'`, `'button'` (nicht mehr `'table'`)

3. **Frontend-Hooks:**
   - `canView(entity, entityType)` - Prüft ob Element sichtbar ist (AccessLevel != 'none')
   - `getAccessLevel(entity, entityType)` - Gibt AccessLevel zurück
   - `canSeeAllData(entity, entityType)` - Prüft ob `all_both` oder `all_read`

4. **Backend-Middleware:**
   - `checkPermission(entity, requiredAccess, entityType)` - Setzt `permissionContext`
   - `getDataIsolationFilter(req, entity)` - Verwendet `permissionContext` für Row-Level-Isolation

5. **Ownership-Felder:**
   - `roleId` aus Ownership-Feldern für Tasks entfernt (nur bei `own_both`)
   - Nur `responsibleId` und `qualityControlId` für `own_both` bei Tasks

6. **Permission-Initialisierung:**
   - `initializePermissions()` - Initialisiert ALLE Permissions aus PERMISSION_STRUCTURE
   - Muss bei jedem Formular/Sidepane verwendet werden

7. **Tab-Filterung:**
   - Tabs werden basierend auf `canView(tabEntity, 'tab')` gefiltert
   - Tabs mit `accessLevel === 'none'` werden komplett ausgeblendet

8. **Spezielle Implementierungen:**
   - Payroll: Bei `own_both` kein Dropdown, direkt eigene Abrechnung
   - Organisation: Bearbeitung nur wenn `organization_edit` Button-Berechtigung vorhanden

---

## 📋 DOKUMENTE ZUM AKTUALISIEREN

### 1. ✅ `docs/technical/BERECHTIGUNGSSYSTEM.md` - **KRITISCH**

**Status:** ❌ VERALTET - Muss komplett überarbeitet werden

**Probleme:**
- Verwendet altes Berechtigungssystem mit `Permission.code` und `RolePermission`
- Zeigt veraltete Middleware-Implementierung (`hasPermission` mit `Permission.code`)
- Zeigt veraltetes Frontend (`AuthContext` mit `permission.code`)
- AccessLevel-Format ist veraltet (`read`, `write`, `both` statt `own_read`, `own_both`, etc.)
- EntityType ist veraltet (`'table'` statt `'tab'`)
- Keine Erwähnung von `canView()`, `getAccessLevel()`, `permissionContext`
- Keine Erwähnung von `getDataIsolationFilter()` mit `permissionContext`
- Keine Erwähnung von `initializePermissions()`
- Keine Erwähnung von `PERMISSION_STRUCTURE`
- Keine Erwähnung von Ownership-Feldern und `roleId`-Entfernung

**Was muss aktualisiert werden:**
1. **AccessLevel-Format aktualisieren:**
   - Altes Format entfernen (`read`, `write`, `both`)
   - Neues Format dokumentieren: `none`, `own_read`, `own_both`, `all_read`, `all_both`
   - Legacy-Support erwähnen

2. **EntityType-Hierarchie dokumentieren:**
   - PAGE > BOX/TAB > BUTTON
   - `'table'` ist veraltet, verwende `'tab'`

3. **Backend-Implementierung aktualisieren:**
   - `checkPermission(entity, requiredAccess, entityType)` statt `hasPermission(code)`
   - `permissionContext` dokumentieren
   - `getDataIsolationFilter(req, entity)` mit `permissionContext` dokumentieren
   - Ownership-Felder dokumentieren (ohne `roleId` für Tasks bei `own_both`)

4. **Frontend-Implementierung aktualisieren:**
   - `usePermissions()` Hook dokumentieren
   - `canView(entity, entityType)` dokumentieren
   - `getAccessLevel(entity, entityType)` dokumentieren
   - `canSeeAllData(entity, entityType)` dokumentieren
   - `hasPermission(entity, requiredAccess, entityType)` dokumentieren
   - Veraltete `AuthContext`-Beispiele entfernen

5. **Permission-Struktur dokumentieren:**
   - `PERMISSION_STRUCTURE` erwähnen
   - `permissionStructure.ts` erwähnen
   - `initializePermissions()` dokumentieren

6. **Standardrollen aktualisieren:**
   - Admin: `all_both` für alles
   - User: Selektiv `own_both`/`all_both`
   - Hamburger: Minimal, nur lesen

7. **Beispiele aktualisieren:**
   - Alle Code-Beispiele auf neues Format aktualisieren
   - Route-Beispiele aktualisieren
   - Frontend-Beispiele aktualisieren

---

### 2. ✅ `docs/user/ADMINISTRATORHANDBUCH.md` - **WICHTIG**

**Status:** ⚠️ TEILWEISE VERALTET

**Probleme:**
- Standardrollen-Beschreibung ist veraltet (Manager, HR, Mitarbeiter statt Admin, User, Hamburger)
- Berechtigungssystem-Beschreibung ist veraltet (verwendet altes Format)
- Keine Erwähnung von `own_both` vs `all_both`
- Keine Erwähnung von Tab-Filterung
- Keine Erwähnung von `canView()` für Tab-Sichtbarkeit

**Was muss aktualisiert werden:**
1. **Standardrollen aktualisieren (Zeile 143-147):**
   ```markdown
   ### Standardrollen
   
   Das System enthält folgende vordefinierte Rollen:
   - **Administrator**: Vollzugriff auf alle Systembereiche (all_both für alles)
   - **User**: Selektiver Zugriff (own_both für eigene Daten, all_both für bestimmte Bereiche)
   - **Hamburger**: Minimaler Zugriff (nur lesen, meist own_read)
   ```

2. **Berechtigungssystem-Abschnitt aktualisieren (Zeile 164-190):**
   - AccessLevel-Format aktualisieren: `none`, `own_read`, `own_both`, `all_read`, `all_both`
   - EntityType-Hierarchie dokumentieren: PAGE > BOX/TAB > BUTTON
   - Beispiele aktualisieren
   - Erwähnen, dass Tabs basierend auf Berechtigungen gefiltert werden

3. **Rollenverwaltung-Abschnitt erweitern:**
   - Erwähnen, dass Rollen pro Organisation kopiert werden können
   - Erwähnen, dass Berechtigungen granular pro Page/Box/Tab/Button eingestellt werden können
   - Erwähnen, dass `initializePermissions()` verwendet wird

---

### 3. ✅ `docs/core/IMPLEMENTATION_CHECKLIST.md` - **BEREITS AKTUALISIERT**

**Status:** ✅ AKTUELL

**Bereits enthalten:**
- Abschnitt "Permissions beim Laden von Formularen/Sidepanes initialisieren"
- `initializePermissions()` Beispiel
- Seed-File Aktualisierung
- Frontend/Backend Berechtigungen
- Verweis auf BERECHTIGUNGSSYSTEM.md

**Optional zu ergänzen:**
- Hinweis auf `canView()` für Tab-Sichtbarkeit
- Hinweis auf `getAccessLevel()` für Dropdown-Filterung
- Hinweis auf `permissionContext` im Backend

---

### 4. ✅ `docs/modules/ROLE_SWITCH.md` - **TEILWEISE VERALTET**

**Status:** ⚠️ TEILWEISE VERALTET

**Probleme:**
- AccessLevel-Format ist veraltet (Zeile 143: `'read' | 'write' | 'both' | 'none'`)
- Keine Erwähnung von `own_read`, `own_both`, `all_read`, `all_both`
- Keine Erwähnung von `canView()`, `getAccessLevel()`

**Was muss aktualisiert werden:**
1. **AccessLevel-Format aktualisieren (Zeile 143):**
   ```typescript
   accessLevel: 'none' | 'own_read' | 'own_both' | 'all_read' | 'all_both';
   ```

2. **Berechtigungsprüfung aktualisieren (Zeile 152-158):**
   - `hasPermission(entity, accessLevel, entityType)` dokumentieren
   - `canView(entity, entityType)` erwähnen
   - `getAccessLevel(entity, entityType)` erwähnen

---

### 5. ✅ `docs/user/BENUTZERHANDBUCH.md` - **WENIGER KRITISCH**

**Status:** ✅ GROßTEILS OK

**Bereits korrekt:**
- Erwähnt Berechtigungen nur allgemein
- Keine technischen Details

**Optional zu ergänzen:**
- Hinweis, dass bestimmte Tabs/Buttons basierend auf Rolle ausgeblendet werden können
- Hinweis, dass bei Lohnabrechnung bei "eigene" Berechtigung direkt eigene Abrechnung angezeigt wird

---

### 6. ✅ `docs/implementation_reports/berechtigungssystem_probleme_analyse_2024-12-17.md` - **AKTUELL**

**Status:** ✅ AKTUELL

**Bereits enthalten:**
- Vollständige Analyse aller Probleme
- Lösungsplan
- Implementierungsstatus
- Alle Fixes dokumentiert

**Optional zu ergänzen:**
- Neueste Fixes (Payroll Dropdown, Organisation Bearbeitung, Worktracker Tabs)

---

### 7. ✅ `docs/implementation_reports/berechtigungssystem_fixes_v3_2024-12-17.md` - **AKTUELL**

**Status:** ✅ AKTUELL

**Bereits enthalten:**
- Alle Fixes aus v3 dokumentiert
- Entity-Namen Korrekturen
- initializePermissions()

---

### 8. ✅ `README.md` - **VERWEIS PRÜFEN**

**Status:** ✅ OK

**Bereits korrekt:**
- Verweist auf `docs/technical/BERECHTIGUNGSSYSTEM.md` (Zeile 44)

**Keine Änderung nötig**

---

### 9. ✅ `docs/claude/README.md` - **VERWEIS PRÜFEN**

**Status:** ✅ OK

**Bereits korrekt:**
- Keine direkten Verweise auf Berechtigungssystem-Dokumentation

**Keine Änderung nötig**

---

## 📊 PRIORITÄTEN

| Dokument | Priorität | Status | Aktion |
|----------|-----------|--------|--------|
| `BERECHTIGUNGSSYSTEM.md` | 🔴 KRITISCH | ❌ VERALTET | Komplett überarbeiten |
| `ADMINISTRATORHANDBUCH.md` | 🟡 WICHTIG | ⚠️ TEILWEISE VERALTET | Standardrollen & Berechtigungssystem-Abschnitt aktualisieren |
| `ROLE_SWITCH.md` | 🟡 WICHTIG | ⚠️ TEILWEISE VERALTET | AccessLevel-Format & Berechtigungsprüfung aktualisieren |
| `IMPLEMENTATION_CHECKLIST.md` | 🟢 OK | ✅ AKTUELL | Optional: canView() & getAccessLevel() ergänzen |
| `BENUTZERHANDBUCH.md` | 🟢 OK | ✅ AKTUELL | Optional: Hinweise ergänzen |
| `berechtigungssystem_probleme_analyse_2024-12-17.md` | 🟢 OK | ✅ AKTUELL | Optional: Neueste Fixes ergänzen |

---

## 📝 KONKRETE AKTUALISIERUNGEN

### Dokument 1: `docs/technical/BERECHTIGUNGSSYSTEM.md`

**Abschnitte die komplett neu geschrieben werden müssen:**

1. **"Berechtigungscodes" (Zeile 78-112)** - ❌ ENTFERNEN
   - Altes System mit `USER_VIEW`, `TASK_CREATE`, etc.
   - Ersetzen durch neues System mit `entity` + `entityType` + `accessLevel`

2. **"Datenmodell" (Zeile 114-171)** - ⚠️ AKTUALISIEREN
   - Permission-Modell ist korrekt, aber Beispiele aktualisieren
   - AccessLevel-Format aktualisieren
   - EntityType-Liste aktualisieren (`'page'`, `'box'`, `'tab'`, `'button'`)

3. **"Backend-Implementierung" (Zeile 172-292)** - ❌ KOMPLETT NEU
   - Alte Middleware entfernen
   - Neue Middleware dokumentieren: `checkPermission()`, `permissionContext`
   - `getDataIsolationFilter()` dokumentieren
   - Ownership-Felder dokumentieren

4. **"Frontend-Implementierung" (Zeile 294-515)** - ❌ KOMPLETT NEU
   - Alten `AuthContext` entfernen
   - `usePermissions()` Hook dokumentieren
   - `canView()`, `getAccessLevel()`, `canSeeAllData()` dokumentieren
   - Beispiele aktualisieren

5. **"Bewährte Methoden" (Zeile 564-578)** - ⚠️ ERGÄNZEN
   - `canView()` für Tab-Sichtbarkeit
   - `initializePermissions()` für Formulare
   - `permissionContext` im Backend verwenden

---

### Dokument 2: `docs/user/ADMINISTRATORHANDBUCH.md`

**Abschnitte die aktualisiert werden müssen:**

1. **"Standardrollen" (Zeile 141-147)** - ⚠️ AKTUALISIEREN
   ```markdown
   ### Standardrollen
   
   Das System enthält folgende vordefinierte Rollen:
   - **Administrator**: Vollzugriff auf alle Systembereiche (all_both für alles)
   - **User**: Selektiver Zugriff (own_both für eigene Daten, all_both für bestimmte Bereiche wie Dashboard, Worktracker)
   - **Hamburger**: Minimaler Zugriff (nur lesen, meist own_read, keine Zugriff auf Organisation-Seite)
   ```

2. **"Berechtigungssystem" (Zeile 164-190)** - ⚠️ AKTUALISIEREN
   ```markdown
   ## Berechtigungssystem
   
   Das System verwendet ein granulares Berechtigungssystem mit drei Komponenten:
   
   1. **EntityType**: Definiert die Art des Objekts ('page', 'box', 'tab', 'button')
   2. **Entity**: Name des spezifischen Objekts (z.B. 'worktracker', 'todos', 'task_create')
   3. **AccessLevel**: Zugriffsebene ('none', 'own_read', 'own_both', 'all_read', 'all_both')
   
   ### AccessLevel-Bedeutung
   
   - `none`: Kein Zugriff
   - `own_read`: Nur eigene Daten lesen
   - `own_both`: Eigene Daten lesen und bearbeiten
   - `all_read`: Alle Daten lesen
   - `all_both`: Alle Daten lesen und bearbeiten (Admin)
   
   ### Hierarchie
   
   ```
   PAGE (Seitenebene - Sidebar/Footer)
     └── BOX (Container auf Seiten)
           └── TAB (Tabs innerhalb von Seiten)
                 └── BUTTON (Aktions-Buttons)
   ```
   
   ### Berechtigungen zuweisen
   
   Jede Rolle hat spezifische Berechtigungszuweisungen:
   
   ```
   {entity: 'todos', entityType: 'tab', accessLevel: 'own_both'}
   ```
   
   Dies würde Zugriff auf den To Do's Tab gewähren, aber nur für eigene Tasks.
   ```

---

### Dokument 3: `docs/modules/ROLE_SWITCH.md`

**Abschnitte die aktualisiert werden müssen:**

1. **"Permissions-Objekt" (Zeile 139-145)** - ⚠️ AKTUALISIEREN
   ```typescript
   interface Permission {
     entity: string;       // Identifiziert Seite, Box, Tab oder Button
     entityType: string;   // 'page', 'box', 'tab' oder 'button'
     accessLevel: 'none' | 'own_read' | 'own_both' | 'all_read' | 'all_both';
   }
   ```

2. **"Berechtigungsprüfung" (Zeile 148-158)** - ⚠️ AKTUALISIEREN
   - `hasPermission(entity, accessLevel, entityType)` dokumentieren
   - `canView(entity, entityType)` erwähnen
   - `getAccessLevel(entity, entityType)` erwähnen

---

## ✅ ZUSAMMENFASSUNG

**Kritische Dokumente (müssen aktualisiert werden):**
1. `docs/technical/BERECHTIGUNGSSYSTEM.md` - Komplett überarbeiten
2. `docs/user/ADMINISTRATORHANDBUCH.md` - Standardrollen & Berechtigungssystem-Abschnitt
3. `docs/modules/ROLE_SWITCH.md` - AccessLevel-Format & Berechtigungsprüfung

**Optionale Ergänzungen:**
4. `docs/core/IMPLEMENTATION_CHECKLIST.md` - canView() & getAccessLevel() ergänzen
5. `docs/user/BENUTZERHANDBUCH.md` - Hinweise ergänzen

**Bereits aktuell:**
6. `docs/implementation_reports/berechtigungssystem_probleme_analyse_2024-12-17.md`
7. `docs/implementation_reports/berechtigungssystem_fixes_v3_2024-12-17.md`
8. `README.md`
9. `docs/claude/README.md`

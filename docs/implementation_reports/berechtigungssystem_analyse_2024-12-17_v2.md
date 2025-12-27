# Berechtigungssystem - Vollständige Problemanalyse (v2)

**Datum:** 2024-12-17  
**Status:** ✅ IMPLEMENTIERT

---

## Problem 1: Roles & Branches Tab - weiterhin organisationsübergreifend

### Analyse

**Code-Pfad:**
1. `frontend/src/components/RoleManagementTab.tsx` → ruft `roleApi.getAll()` auf
2. `backend/src/routes/roles.ts` → `router.get('/', roleAuthMiddleware, getAllRoles)`
3. `backend/src/controllers/roleController.ts` Zeile 62 → `getDataIsolationFilter(req as any, 'role')`
4. `backend/src/middleware/organization.ts` Zeile 329-337 → Prüft `req.organizationId`

**Root Cause:**
Die `getDataIsolationFilter` Änderung ist KORREKT implementiert (Zeile 329-337):
```typescript
case 'role':
  if (!req.organizationId) {
    return { id: -1 };
  }
  return {
    organizationId: req.organizationId
  };
```

**ABER:** Das Problem liegt im **Cache** oder in der **aktiven Rolle des Users**:

1. `organizationMiddleware` (Zeile 34): `req.organizationId = cachedData.organizationId`
2. `organizationCache.ts` (Zeile 89): `organizationId: userRole.role.organizationId`

**Mögliche Ursachen:**
1. **Cache ist veraltet** - Der Cache hat noch alte Daten (TTL: 10 Minuten)
2. **Aktive Rolle hat `organizationId = null`** - Die globalen Rollen (Admin ID 1, User ID 2, Hamburger ID 999) haben `organizationId = null`
3. **User wechselt Organisation, aber Cache wird nicht invalidiert**

### Lösung

**Option A: Cache invalidieren nach Rollenwechsel**
- In `switchRole` API den Cache invalidieren: `organizationCache.invalidate(userId)`

**Option B: Server neustarten**
- Einfacher Test: Server neustarten um Cache zu leeren

**Option C: Debug-Logging hinzufügen**
- Log `req.organizationId` in `getAllRoles` und `getAllBranches`

---

## Problem 2: Seed File - Branches "nowhere", "haupt", "hauptsitz"

### Analyse

**Aktueller Seed (Zeile 1317-1358):**
```typescript
// La Familia Hostel Branches: Parque Poblado & Manila
const org1Branches = ['Parque Poblado', 'Manila'];

// Mosaik Branches: Sonnenhalden
const org2Branch = await prisma.branch.upsert({...});

// Hauptsitz für Standard-Organisation (Rückwärtskompatibilität)
const hauptsitzBranch = await prisma.branch.upsert({
  where: { name: 'Hauptsitz' },
  ...
});
```

**Gefundene Branches im Seed:**
- `Parque Poblado` (Org 1: La Familia Hostel)
- `Manila` (Org 1: La Familia Hostel)
- `Sonnenhalden` (Org 2: Mosaik)
- `Hauptsitz` (Standard-Organisation, für Rückwärtskompatibilität)

**NICHT im Seed gefunden:**
- `nowhere` - **NICHT im aktuellen Seed**
- `haupt` - **NICHT im aktuellen Seed**

### Ursache

Die Branches "nowhere" und "haupt" wurden wahrscheinlich:
1. Von einer **älteren Version des Seed Files** erstellt
2. **Manuell** in der Datenbank erstellt
3. Von einem **anderen Script** erstellt

### Lösung

**Option A: Manuell löschen**
- Lösche die Branches `nowhere`, `haupt`, `Hauptsitz` aus der Datenbank (falls nicht verwendet)

**Option B: Seed anpassen**
- Entferne die `Hauptsitz` Branch-Erstellung aus dem Seed (Zeile 1350-1358)
- Diese ist nur für "Rückwärtskompatibilität" und sollte nicht mehr nötig sein

**Empfehlung:**
- `Hauptsitz` entfernen aus Seed (Zeile 1350-1358)
- `nowhere` und `haupt` manuell aus DB löschen (falls existieren)

---

## Problem 3: Frontend Berechtigungen - Dropdowns zu breit & Plan nicht befolgt

### Screenshot-Analyse

Das Bild zeigt:
```
Worktracker  Leer y editar todos  ▼
└─ Registro de tiempo  Leer y editar todos  ▼
   └─ Iniciar  Leer y editar todos  ▼
   └─ Detener  Leer y editar todos  ▼
   └─ Editar   Sin acceso  ▼
   └─ Eliminar Sin acceso  ▼
```

**Probleme:**
1. **Dropdowns zu breit** - Gehen zu nah an den Text
2. **AccessLevels falsch** - Für Buttons wird "Leer y editar todos" angezeigt, sollte aber "ja/nein" sein

### Plan-Anforderungen (Use Cases)

Aus dem Plan (Zeile 53-55):
```
- PAGE worktracker  (sichtbar bzw. wird geladen: ja / nein)
    - BOX zeiterfassung
        - BUTTON starten / stoppen: ja / nein
```

**Das bedeutet:**
- Für **PAGES**: `ja / nein` (sichtbar / nicht sichtbar)
- Für **BOXES**: `ja / nein` (sichtbar / nicht sichtbar)
- Für **TABS**: `alle / nur eigene / nein` (welche Daten sichtbar)
- Für **BUTTONS**: `ja / nein` (erlaubt / nicht erlaubt)

**Aktuell implementiert:**
- Für ALLES: `none / own_read / own_both / all_read / all_both`

**Das ist FALSCH!**

### Vollständige Use Case Analyse

| Element | Plan | Aktuelle Umsetzung | Status |
|---------|------|-------------------|--------|
| **PAGE dashboard** | ja/nein | none/own_read/own_both/all_read/all_both | ❌ FALSCH |
| **BOX requests** | alle/eigene/nein | none/own_read/own_both/all_read/all_both | ⚠️ Teilweise |
| **BUTTON erstellen/bearbeiten/löschen** | ja/nein | none/own_read/own_both/all_read/all_both | ❌ FALSCH |
| **PAGE worktracker** | ja/nein | none/own_read/own_both/all_read/all_both | ❌ FALSCH |
| **BOX zeiterfassung** | ja/nein | none/own_read/own_both/all_read/all_both | ❌ FALSCH |
| **BUTTON starten/stoppen** | ja/nein | none/own_read/own_both/all_read/all_both | ❌ FALSCH |
| **TAB to do's** | alle/eigene/nein | none/own_read/own_both/all_read/all_both | ⚠️ Teilweise |
| **TAB reservations** | alle/eigene branch/nein | none/own_read/own_both/all_read/all_both | ⚠️ Teilweise |

### Korrekte AccessLevel Mapping

**Für PAGES und BUTTONS:**
- `none` = nein
- Alles andere = ja

**Für TABS und BOXES (mit Daten):**
- `none` = nein
- `own_read` = nur eigene lesen
- `own_both` = nur eigene bearbeiten
- `all_read` = alle lesen
- `all_both` = alle bearbeiten

### UI-Änderungen erforderlich

**Für PAGES:**
- Dropdown ersetzen durch Toggle (ja/nein)
- Oder: Dropdown mit nur 2 Optionen (`none` / `all_both`)

**Für BOXES (ohne Daten, z.B. zeiterfassung):**
- Dropdown ersetzen durch Toggle (ja/nein)

**Für BUTTONS:**
- Dropdown ersetzen durch Toggle (ja/nein)
- Werte: `none` = nicht erlaubt, `all_both` = erlaubt

**Für TABS und BOXES (mit Daten):**
- Dropdown mit 3 Optionen:
  - `none` = nein / nicht sichtbar
  - `own_both` = nur eigene
  - `all_both` = alle

**Hinweis:** Die `_read` Varianten können entfernt werden, da Lesen ohne Bearbeiten für die meisten Tabs nicht sinnvoll ist.

---

## Problem 4: Dropdown-Design

### Aktuelle Probleme:
1. **Zu breit** - Dropdowns gehen zu nah an Labels
2. **Unübersichtlich** - Zu viele Optionen für Buttons

### Lösung:
1. **Max-Width setzen** - `max-w-[180px]` oder `max-w-[200px]`
2. **Kürzere Labels** - z.B. "Alle" statt "Leer y editar todos"
3. **Toggle für ja/nein** - Statt Dropdown

---

## Lösungsplan (Priorisiert)

### Priorität 1: Roles/Branches Isolation

**Schritt 1:** Server neustarten um Cache zu leeren
**Schritt 2:** Debug-Logging hinzufügen in `getAllRoles` und `getAllBranches`
**Schritt 3:** Prüfen ob `req.organizationId` korrekt gesetzt wird

### Priorität 2: Seed File aufräumen

**Schritt 1:** Entferne `Hauptsitz` Branch aus Seed (Zeile 1350-1358)
**Schritt 2:** Prüfe DB auf `nowhere` und `haupt` Branches und lösche sie manuell

### Priorität 3: Frontend Berechtigungen (Plan-konform)

**Schritt 1:** AccessLevel-Typen pro EntityType definieren:
- `page`: `{ none: 'nein', all_both: 'ja' }` → Toggle
- `box` (ohne Daten): `{ none: 'nein', all_both: 'ja' }` → Toggle
- `box` (mit Daten): `{ none: 'nein', own_both: 'eigene', all_both: 'alle' }` → Dropdown 3 Optionen
- `tab`: `{ none: 'nein', own_both: 'eigene', all_both: 'alle' }` → Dropdown 3 Optionen
- `button`: `{ none: 'nein', all_both: 'ja' }` → Toggle

**Schritt 2:** `RoleManagementTab.tsx` anpassen:
- Toggle-Komponente für Pages/Buttons
- Dropdown (3 Optionen) für Tabs/Boxes mit Daten

**Schritt 3:** Dropdown-Breite begrenzen:
- `max-w-[180px]` für Dropdowns
- Kürzere Labels verwenden

---

## Zusammenfassung

| Problem | Ursache | Lösung |
|---------|---------|--------|
| Roles/Branches organisationsübergreifend | Cache veraltet oder aktive Rolle hat `organizationId = null` | Server neustarten, Debug-Logging |
| Seed Branches (nowhere, haupt, hauptsitz) | Altlasten + `Hauptsitz` im Seed | Seed bereinigen, DB manuell aufräumen |
| Frontend AccessLevels falsch | Plan nicht korrekt umgesetzt | UI anpassen: Toggle für ja/nein, Dropdown 3 Optionen für Tabs |
| Dropdowns zu breit | Kein max-width | CSS anpassen |

**Status:** Analyse abgeschlossen, Lösungsplan erstellt.

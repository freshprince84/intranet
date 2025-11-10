# Branch-System: Analyse und Implementierungsplan

## Datum
2025-01-XX

## Status
🔍 Analyse abgeschlossen - Plan erstellt

---

## 1. Aktueller Stand - Was ist umgesetzt

### 1.1 Datenbank-Schema
✅ **Vollständig implementiert**
- `Branch`-Modell existiert mit allen notwendigen Feldern
- `UsersBranches`-Modell mit `lastUsed`-Flag vorhanden
- Beziehungen zu `WorkTime`, `Task`, `Request` korrekt definiert
- `organizationId` im Branch-Modell für Datenisolation vorhanden

**Dateien:**
- `backend/prisma/schema.prisma` (Zeilen 171-196)

### 1.2 Backend API - Lesen
✅ **Teilweise implementiert**
- `GET /api/branches` - Lädt alle Branches der Organisation
- Controller: `getAllBranches` in `backend/src/controllers/branchController.ts`
- Route: `backend/src/routes/branches.ts`
- Datenisolation über `getDataIsolationFilter` implementiert

**Fehlend:**
- Keine API zum Erstellen von Branches (`POST /api/branches`)
- Keine API zum Bearbeiten von Branches (`PUT /api/branches/:id`)
- Keine API zum Löschen von Branches (`DELETE /api/branches/:id`)
- Keine API zum Wechseln des aktiven Branches (`POST /api/branches/switch`)

### 1.3 Frontend - Branch Context
✅ **Teilweise implementiert**
- `BranchContext` lädt Branches beim Start
- Speichert `selectedBranch` im `localStorage`
- Lädt gespeicherten Branch beim Start

**Probleme:**
- Lädt nicht den `lastUsed`-Branch vom Backend
- Setzt einfach die erste Branch als Standard, wenn keine im localStorage
- Keine Synchronisation mit Backend beim Branch-Wechsel

**Dateien:**
- `frontend/src/contexts/BranchContext.tsx`

### 1.4 Frontend - UI für Branch-Wechsel
✅ **UI vorhanden, aber funktioniert nicht**
- Branch-Auswahlmenü im Header vorhanden
- Zeigt alle Branches an
- Markiert aktuell ausgewählten Branch visuell

**Probleme:**
- `handleBranchSwitch` in `Header.tsx` (Zeile 106-114) ruft nur `setSelectedBranch` auf
- Keine API-Call zum Backend
- `lastUsed`-Flag wird nicht aktualisiert
- Keine Persistierung des Branch-Wechsels

**Dateien:**
- `frontend/src/components/Header.tsx` (Zeilen 106-114, 315-370)

### 1.5 Frontend - Zeiterfassung
✅ **Verwendet selectedBranch korrekt**
- `WorktimeTracker` prüft `selectedBranch` vor Start
- Sendet `branchId` beim Start der Zeiterfassung korrekt

**Problem:**
- Wenn Branch-Wechsel nicht funktioniert, bleibt der alte Branch aktiv
- Zeitmessung startet dann immer mit demselben Branch

**Dateien:**
- `frontend/src/components/WorktimeTracker.tsx` (Zeilen 202-232)

### 1.6 User-Branch-Zuordnung
⚠️ **Nicht vollständig implementiert**
- `UsersBranches`-Tabelle existiert mit `lastUsed`-Flag
- Keine API zum Laden der User-Branches mit `lastUsed`-Status
- `getCurrentUser` lädt keine Branches (nur Rollen)

**Vergleich mit Rollen-System:**
- ✅ Rollen: `switchUserRole` API existiert (analog benötigt: `switchUserBranch`)
- ✅ Rollen: `getCurrentUser` lädt Rollen mit `lastUsed`-Flag
- ❌ Branches: Keine entsprechende Funktionalität

---

## 2. Identifizierte Probleme

### 2.1 Branch-Wechsel funktioniert nicht
**Problem:**
- User kann im Top-Menü einen Branch auswählen
- Visuell wird der Branch als ausgewählt markiert
- Aber: Keine Backend-API wird aufgerufen
- `lastUsed`-Flag wird nicht aktualisiert
- Beim nächsten Login wird nicht der zuletzt verwendete Branch geladen

**Ursache:**
- `handleBranchSwitch` in `Header.tsx` ruft nur `setSelectedBranch(branchId)` auf
- Keine API-Call zu Backend
- Keine Aktualisierung von `UsersBranches.lastUsed`

**Betroffene Dateien:**
- `frontend/src/components/Header.tsx` (Zeile 106-114)

### 2.2 Zeitmessung startet immer mit demselben Branch
**Problem:**
- WorktimeTracker verwendet `selectedBranch` aus Context
- Wenn Branch-Wechsel nicht funktioniert, bleibt der alte Branch im Context
- Zeitmessung startet dann immer mit demselben Branch

**Ursache:**
- Folgeproblem von 2.1
- `selectedBranch` wird nicht korrekt aktualisiert

**Betroffene Dateien:**
- `frontend/src/components/WorktimeTracker.tsx` (Zeile 203)

### 2.3 Keine Möglichkeit, Branches zu erstellen/bearbeiten
**Problem:**
- Keine Admin-UI zum Verwalten von Branches
- Keine API-Endpunkte für CRUD-Operationen
- Branches können nur über Datenbank oder Seed-Skript erstellt werden

**Betroffene Bereiche:**
- Backend: Keine Controller-Funktionen für CREATE/UPDATE/DELETE
- Frontend: Keine Admin-Seite für Branch-Verwaltung

### 2.4 Branch-Kontext lädt nicht den lastUsed-Branch
**Problem:**
- `BranchContext` lädt beim Start alle Branches
- Setzt die erste Branch als Standard, wenn keine im localStorage
- Lädt nicht den `lastUsed`-Branch vom Backend

**Ursache:**
- Keine API zum Laden der User-Branches mit `lastUsed`-Status
- `getCurrentUser` lädt keine Branches

**Betroffene Dateien:**
- `frontend/src/contexts/BranchContext.tsx` (Zeilen 41-44)

---

## 3. Implementierungsplan

### Phase 1: Branch-Wechsel funktionsfähig machen

#### 1.1 Backend: API zum Wechseln des Branches
**Ziel:** API-Endpunkt zum Wechseln des aktiven Branches (analog zu `switchUserRole`)

**Aufgaben:**
1. Controller-Funktion `switchUserBranch` in `branchController.ts` erstellen
   - Prüft ob Branch dem User zugewiesen ist
   - Setzt alle User-Branches auf `lastUsed = false`
   - Setzt ausgewählten Branch auf `lastUsed = true`
   - Verwendet Transaktion für Konsistenz
2. Route `POST /api/branches/switch` in `branches.ts` hinzufügen
   - Erfordert Authentifizierung und Organisation-Kontext
   - Body: `{ branchId: number }`
3. API-Endpunkt in `frontend/src/config/api.ts` hinzufügen:
   ```typescript
   BRANCHES: {
       BASE: '/branches',
       BY_ID: (id: number) => `/branches/${id}`,
       SWITCH: '/branches/switch'  // NEU
   }
   ```

**Dateien:**
- `backend/src/controllers/branchController.ts` (NEU: `switchUserBranch`)
- `backend/src/routes/branches.ts` (NEU: Route)
- `frontend/src/config/api.ts` (UPDATE: API_ENDPOINTS.BRANCHES)

**Referenz:**
- `backend/src/controllers/userController.ts` (Zeilen 879-954) - `switchUserRole` als Vorlage

#### 1.2 Backend: API zum Laden der User-Branches
**Ziel:** API-Endpunkt zum Laden der Branches eines Users mit `lastUsed`-Status

**Aufgaben:**
1. Controller-Funktion `getUserBranches` in `branchController.ts` erstellen
   - Lädt alle Branches des Users aus `UsersBranches`
   - Inkludiert `lastUsed`-Flag
   - Filtert nach Organisation (Datenisolation)
2. Route `GET /api/branches/user` in `branches.ts` hinzufügen
   - Erfordert Authentifizierung
   - Gibt Branches mit `lastUsed`-Flag zurück

**Dateien:**
- `backend/src/controllers/branchController.ts` (NEU: `getUserBranches`)
- `backend/src/routes/branches.ts` (NEU: Route)
- `frontend/src/config/api.ts` (UPDATE: API_ENDPOINTS.BRANCHES)

#### 1.3 Frontend: Branch-Wechsel implementieren
**Ziel:** `handleBranchSwitch` ruft Backend-API auf und aktualisiert Context

**Aufgaben:**
1. `handleBranchSwitch` in `Header.tsx` erweitern:
   - Ruft `POST /api/branches/switch` auf
   - Bei Erfolg: `setSelectedBranch(branchId)` aufrufen
   - Bei Fehler: Fehlermeldung anzeigen
   - Optional: User-Daten neu laden (falls nötig)
2. Error-Handling hinzufügen
3. Loading-State während API-Call (optional)

**Dateien:**
- `frontend/src/components/Header.tsx` (UPDATE: `handleBranchSwitch`)

#### 1.4 Frontend: Branch-Context erweitern
**Ziel:** Lädt `lastUsed`-Branch beim Start

**Aufgaben:**
1. `BranchContext` erweitern:
   - Beim Start: `GET /api/branches/user` aufrufen
   - Branch mit `lastUsed = true` als `selectedBranch` setzen
   - Falls keine `lastUsed`-Branch: Erste Branch als Fallback
   - Falls keine Branches: `null` setzen
2. `loadBranches` erweitern:
   - Lädt User-Branches statt alle Branches
   - Setzt `lastUsed`-Branch als Standard

**Dateien:**
- `frontend/src/contexts/BranchContext.tsx` (UPDATE: `loadBranches`, useEffect)

**Alternative:**
- Statt separater API: `getCurrentUser` erweitern, um Branches mit `lastUsed` zu inkludieren
- Dann: `BranchContext` lädt Branches aus User-Objekt

---

### Phase 2: Branch-Verwaltung (CRUD)

#### 2.1 Backend: CRUD-API für Branches
**Ziel:** Vollständige CRUD-Operationen für Branches

**Aufgaben:**
1. `createBranch` in `branchController.ts`:
   - Erstellt neuen Branch
   - Setzt `organizationId` aus Request-Kontext
   - Validiert Name (eindeutig pro Organisation)
   - Erfordert Berechtigung (z.B. `branches_create`)
2. `updateBranch` in `branchController.ts`:
   - Aktualisiert Branch-Name
   - Validiert Name (eindeutig pro Organisation)
   - Erfordert Berechtigung (z.B. `branches_edit`)
3. `deleteBranch` in `branchController.ts`:
   - Prüft ob Branch verwendet wird (WorkTime, Tasks, Requests)
   - Falls verwendet: Fehler zurückgeben
   - Falls nicht verwendet: Branch löschen
   - Erfordert Berechtigung (z.B. `branches_delete`)
4. Routes in `branches.ts`:
   - `POST /api/branches` - Erstellen
   - `PUT /api/branches/:id` - Bearbeiten
   - `DELETE /api/branches/:id` - Löschen

**Dateien:**
- `backend/src/controllers/branchController.ts` (NEU: `createBranch`, `updateBranch`, `deleteBranch`)
- `backend/src/routes/branches.ts` (UPDATE: Routes)
- `frontend/src/config/api.ts` (UPDATE: API_ENDPOINTS.BRANCHES)

#### 2.2 Frontend: Admin-UI für Branch-Verwaltung
**Ziel:** Admin-Seite zum Verwalten von Branches

**Aufgaben:**
1. Neue Komponente `BranchManagement.tsx` erstellen:
   - Liste aller Branches
   - Button zum Erstellen neuer Branches
   - Edit-Button pro Branch
   - Delete-Button pro Branch (mit Bestätigung)
   - Verwendet DataCard-Komponente (falls vorhanden)
2. Modal `BranchEditModal.tsx` erstellen:
   - Formular für Name
   - Validierung
   - Create/Edit-Modus
3. Route in App hinzufügen:
   - `/settings/branches` oder `/admin/branches`
4. Navigation erweitern:
   - Link in Settings oder Admin-Menü

**Dateien:**
- `frontend/src/components/BranchManagement.tsx` (NEU)
- `frontend/src/components/BranchEditModal.tsx` (NEU)
- `frontend/src/App.tsx` (UPDATE: Route)
- Navigation-Komponente (UPDATE: Link)

**Berechtigungen:**
- Prüfen ob User Berechtigung `branches_create`, `branches_edit`, `branches_delete` hat
- Buttons entsprechend anzeigen/verstecken

---

### Phase 3: User-Branch-Zuordnung

#### 3.1 Backend: API zum Zuweisen von Branches zu Usern
**Ziel:** Admins können Branches zu Usern zuweisen

**Aufgaben:**
1. Controller-Funktion `assignBranchToUser`:
   - Erstellt `UsersBranches`-Eintrag
   - Prüft ob Zuordnung bereits existiert
   - Erfordert Berechtigung
2. Controller-Funktion `removeBranchFromUser`:
   - Löscht `UsersBranches`-Eintrag
   - Prüft ob Branch noch verwendet wird (WorkTime)
   - Erfordert Berechtigung
3. Routes:
   - `POST /api/branches/:branchId/users/:userId` - Zuweisen
   - `DELETE /api/branches/:branchId/users/:userId` - Entfernen

**Dateien:**
- `backend/src/controllers/branchController.ts` (NEU: `assignBranchToUser`, `removeBranchFromUser`)
- `backend/src/routes/branches.ts` (UPDATE: Routes)

#### 3.2 Frontend: UI zum Zuweisen von Branches
**Ziel:** In User-Verwaltung Branches zuweisen können

**Aufgaben:**
1. In User-Verwaltung erweitern:
   - Liste der zugewiesenen Branches anzeigen
   - Dropdown zum Hinzufügen von Branches
   - Button zum Entfernen von Branches
2. Optional: Separate Seite für Branch-User-Zuordnung

**Dateien:**
- User-Verwaltungskomponente (UPDATE)

---

## 4. Priorisierung

### Hoch (muss sofort behoben werden)
1. ✅ **Phase 1.1**: Backend API zum Wechseln des Branches
2. ✅ **Phase 1.2**: Backend API zum Laden der User-Branches
3. ✅ **Phase 1.3**: Frontend Branch-Wechsel implementieren
4. ✅ **Phase 1.4**: Frontend Branch-Context erweitern

**Grund:** Branch-Wechsel funktioniert aktuell nicht, Zeitmessung startet immer mit demselben Branch

### Mittel (sollte bald implementiert werden)
5. ⚠️ **Phase 2.1**: Backend CRUD-API für Branches
6. ⚠️ **Phase 2.2**: Frontend Admin-UI für Branch-Verwaltung

**Grund:** Keine Möglichkeit, Branches zu erstellen/bearbeiten ohne Datenbankzugriff

### Niedrig (kann später implementiert werden)
7. ⚠️ **Phase 3.1**: Backend API zum Zuweisen von Branches
8. ⚠️ **Phase 3.2**: Frontend UI zum Zuweisen von Branches

**Grund:** Funktionalität existiert bereits über Datenbank, kann später automatisiert werden

---

## 5. Technische Details

### 5.1 Datenbank-Schema
**Bereits vorhanden:**
```prisma
model Branch {
  id                Int                 @id @default(autoincrement())
  name              String              @unique
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt
  organizationId    Int?
  organization      Organization?       @relation(fields: [organizationId], references: [id])
  requests          Request[]
  tasks             Task[]
  users             UsersBranches[]
  workTimes         WorkTime[]
  taskStatusChanges TaskStatusHistory[]
}

model UsersBranches {
  id        Int      @id @default(autoincrement())
  userId    Int
  branchId  Int
  lastUsed  Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  branch    Branch   @relation(fields: [branchId], references: [id])
  user      User     @relation(fields: [userId], references: [id])

  @@unique([userId, branchId])
}
```

**Keine Schema-Änderungen nötig!**

### 5.2 API-Endpunkte (geplant)

#### Branch-Wechsel
```
POST /api/branches/switch
Body: { branchId: number }
Response: { success: boolean, message?: string }
```

#### User-Branches laden
```
GET /api/branches/user
Response: Branch[] mit lastUsed-Flag
```

#### Branch erstellen
```
POST /api/branches
Body: { name: string }
Response: Branch
```

#### Branch bearbeiten
```
PUT /api/branches/:id
Body: { name: string }
Response: Branch
```

#### Branch löschen
```
DELETE /api/branches/:id
Response: { success: boolean, message?: string }
```

### 5.3 Berechtigungen
**Neue Button-Berechtigungen (falls nötig):**
- `branches_create` - Branch erstellen
- `branches_edit` - Branch bearbeiten
- `branches_delete` - Branch löschen

**Bereits vorhanden:**
- `branches` - Tabelle in `tableToPageMapping` (siehe `RoleManagementTab.tsx` Zeile 136)

---

## 6. Test-Szenarien

### 6.1 Branch-Wechsel
1. User hat 3 Branches zugewiesen
2. User wählt Branch 2 im Top-Menü
3. ✅ Branch 2 wird als ausgewählt markiert
4. ✅ `lastUsed`-Flag wird in Datenbank aktualisiert
5. ✅ Beim nächsten Login wird Branch 2 geladen

### 6.2 Zeiterfassung
1. User wählt Branch 2
2. User startet Zeiterfassung
3. ✅ Zeiterfassung startet mit Branch 2
4. User wechselt zu Branch 3
5. User startet neue Zeiterfassung
6. ✅ Neue Zeiterfassung startet mit Branch 3

### 6.3 Branch-Verwaltung
1. Admin öffnet Branch-Verwaltung
2. ✅ Liste aller Branches wird angezeigt
3. Admin erstellt neuen Branch
4. ✅ Neuer Branch erscheint in Liste
5. Admin bearbeitet Branch-Name
6. ✅ Name wird aktualisiert
7. Admin löscht Branch (ohne Verwendung)
8. ✅ Branch wird gelöscht
9. Admin versucht Branch zu löschen (mit Verwendung)
10. ✅ Fehlermeldung wird angezeigt

---

## 7. Offene Fragen

1. **Berechtigungen:** Sollen alle User Branches wechseln können, oder nur bestimmte Rollen?
   - Aktuell: Alle User können wechseln (UI vorhanden)
   - Empfehlung: Alle User können wechseln, nur Admins können verwalten

2. **Branch-Zuweisung:** Wie werden Branches zu Usern zugewiesen?
   - Aktuell: Über Datenbank/Seed
   - Geplant: Über Admin-UI (Phase 3)

3. **Default-Branch:** Was passiert, wenn User keine Branches hat?
   - Aktuell: `selectedBranch = null`, Zeiterfassung zeigt Fehler
   - Empfehlung: Fehlermeldung anzeigen, Branch-Zuweisung anfordern

4. **Branch-Löschung:** Was passiert mit bestehenden WorkTimes/Tasks/Requests?
   - Aktuell: Nicht implementiert
   - Empfehlung: Löschung verhindern, wenn Branch verwendet wird

---

## 8. Referenzen

### Ähnliche Implementierungen
- **Rollen-System:** `switchUserRole` in `userController.ts` (Zeilen 879-954)
- **Rollen-Verwaltung:** `RoleManagementTab.tsx` als Vorlage für Branch-Verwaltung

### Wichtige Dateien
- `backend/src/controllers/branchController.ts` - Branch-Controller
- `backend/src/routes/branches.ts` - Branch-Routes
- `frontend/src/contexts/BranchContext.tsx` - Branch-Context
- `frontend/src/components/Header.tsx` - Branch-Wechsel UI
- `frontend/src/components/WorktimeTracker.tsx` - Verwendung von selectedBranch

---

## 9. Zusammenfassung

### Was funktioniert
✅ Datenbank-Schema vollständig
✅ Backend API zum Lesen von Branches
✅ Frontend UI für Branch-Auswahl
✅ Zeiterfassung verwendet selectedBranch

### Was nicht funktioniert
❌ Branch-Wechsel aktualisiert nicht `lastUsed`-Flag
❌ Branch-Wechsel wird nicht im Backend persistiert
❌ Zeitmessung startet immer mit demselben Branch (Folgeproblem)
❌ Keine Möglichkeit, Branches zu erstellen/bearbeiten

### Was fehlt
❌ Backend API zum Wechseln des Branches
❌ Backend API zum Laden der User-Branches mit `lastUsed`
❌ Frontend: API-Call beim Branch-Wechsel
❌ Backend CRUD-API für Branches
❌ Frontend Admin-UI für Branch-Verwaltung

---

**Nächste Schritte:**
1. Phase 1 implementieren (Branch-Wechsel funktionsfähig machen)
2. Phase 2 implementieren (Branch-Verwaltung)
3. Phase 3 implementieren (User-Branch-Zuordnung)


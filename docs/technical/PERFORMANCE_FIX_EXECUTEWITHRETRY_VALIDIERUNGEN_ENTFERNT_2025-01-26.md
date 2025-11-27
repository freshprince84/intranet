# Performance-Fix: executeWithRetry bei Validierungs-Queries entfernt (2025-01-26)

**Datum:** 2025-01-26  
**Status:** ✅ Implementiert  
**Problem:** Zu viele executeWithRetry Aufrufe bei nicht-kritischen Validierungs-Queries

---

## 🔴 PROBLEM

**Identifizierte Probleme:**

1. **createTask macht 5-7 executeWithRetry Aufrufe pro Request:**
   - `prisma.user.findFirst` (responsibleUser) - **Validierung** - ❌ executeWithRetry
   - `prisma.user.findFirst` (qualityControlUser) - **Validierung** - ❌ executeWithRetry
   - `prisma.task.create` - **Kritisch** - ✅ executeWithRetry (behalten)
   - `getUserLanguage(responsibleId)` - **Nicht kritisch** - ❌ executeWithRetry
   - `getUserLanguage(qualityControlId)` - **Nicht kritisch** - ❌ executeWithRetry

2. **updateTask macht 6+ executeWithRetry Aufrufe:**
   - `prisma.task.findFirst` (currentTask) - **READ** - ❌ executeWithRetry
   - `prisma.role.findUnique` (userRole) - **READ** - ❌ executeWithRetry
   - `prisma.role.findFirst` (userRoleInOrg) - **READ** - ❌ executeWithRetry
   - `prisma.user.findFirst` (responsibleUser) - **Validierung** - ❌ executeWithRetry
   - `prisma.user.findFirst` (qualityControlUser) - **Validierung** - ❌ executeWithRetry
   - `prisma.task.update` - **Kritisch** - ✅ executeWithRetry (behalten)

3. **createRequest macht 4 executeWithRetry Aufrufe:**
   - `prisma.role.findUnique` - **READ** - ❌ executeWithRetry
   - `prisma.user.findFirst` (requesterUser) - **Validierung** - ❌ executeWithRetry
   - `prisma.user.findFirst` (responsibleUser) - **Validierung** - ❌ executeWithRetry
   - `prisma.request.create` - **Kritisch** - ✅ executeWithRetry (behalten)

4. **getUserLanguage macht 1-2 executeWithRetry Aufrufe:**
   - `prisma.user.findUnique` (User.language) - **READ** - ❌ executeWithRetry
   - `prisma.user.findUnique` (User mit Roles) - **READ** - ❌ executeWithRetry

5. **savedFilterController macht viele executeWithRetry Aufrufe bei Validierungen:**
   - `prisma.savedFilter.findFirst` - **Validierung** - ❌ executeWithRetry
   - `prisma.filterGroup.findFirst` - **Validierung** - ❌ executeWithRetry

**Impact:**
- Bei vielen Requests = **Viele parallele Retries** → **Connection Pool wird voll**
- Bei DB-Fehlern = **Viele Retries** → **System wird langsam**
- **Connection Pool zu 80% ausgelastet** (16 von 20 Verbindungen)

---

## ✅ LÖSUNG IMPLEMENTIERT

### Regel: executeWithRetry NUR bei kritischen Operationen

**executeWithRetry BEHALTEN bei:**
- ✅ **CREATE** Operationen (prisma.task.create, prisma.request.create, etc.)
- ✅ **UPDATE** Operationen (prisma.task.update, prisma.request.update, etc.)
- ✅ **DELETE** Operationen (prisma.task.delete, prisma.request.delete, etc.)

**executeWithRetry ENTFERNT bei:**
- ❌ **Validierungs-Queries** (findFirst, findUnique für Validierung)
- ❌ **READ-Operationen** (findFirst, findUnique für Datenabfrage)
- ❌ **getUserLanguage** (kann gecacht werden, nicht kritisch)

---

### 1. taskController.ts

**createTask:**
- ❌ `prisma.user.findFirst` (responsibleUser) - executeWithRetry **ENTFERNT**
- ❌ `prisma.user.findFirst` (qualityControlUser) - executeWithRetry **ENTFERNT**
- ✅ `prisma.task.create` - executeWithRetry **BEHALTEN**

**updateTask:**
- ❌ `prisma.task.findFirst` (currentTask) - executeWithRetry **ENTFERNT**
- ❌ `prisma.role.findUnique` (userRole) - executeWithRetry **ENTFERNT**
- ❌ `prisma.role.findFirst` (userRoleInOrg) - executeWithRetry **ENTFERNT**
- ❌ `prisma.user.findFirst` (responsibleUser) - executeWithRetry **ENTFERNT**
- ❌ `prisma.user.findFirst` (qualityControlUser) - executeWithRetry **ENTFERNT**
- ✅ `prisma.task.update` - executeWithRetry **BEHALTEN**

---

### 2. requestController.ts

**createRequest:**
- ❌ `prisma.role.findUnique` - executeWithRetry **ENTFERNT**
- ❌ `prisma.user.findFirst` (requesterUser) - executeWithRetry **ENTFERNT**
- ❌ `prisma.user.findFirst` (responsibleUser) - executeWithRetry **ENTFERNT**
- ✅ `prisma.request.create` - executeWithRetry **BEHALTEN**

**updateRequest:**
- ✅ `prisma.request.update` - executeWithRetry **BEHALTEN**

---

### 3. translations.ts

**getUserLanguage:**
- ❌ `prisma.user.findUnique` (User.language) - executeWithRetry **ENTFERNT**
- ❌ `prisma.user.findUnique` (User mit Roles) - executeWithRetry **ENTFERNT**

**Begründung:**
- getUserLanguage verwendet bereits `userLanguageCache` (10 Minuten TTL)
- Bei Cache-Miss: executeWithRetry ist nicht nötig (nicht kritisch)
- Falls DB-Fehler: Fallback auf 'de' ist ausreichend

---

### 4. savedFilterController.ts

**saveFilter:**
- ❌ `prisma.savedFilter.findFirst` (existingFilter) - executeWithRetry **ENTFERNT**
- ✅ `prisma.savedFilter.update` - executeWithRetry **BEHALTEN**
- ✅ `prisma.savedFilter.create` - executeWithRetry **BEHALTEN**

**deleteFilter:**
- ❌ `prisma.savedFilter.findFirst` - executeWithRetry **ENTFERNT**
- ✅ `prisma.savedFilter.delete` - executeWithRetry **BEHALTEN**

**createFilterGroup:**
- ❌ `prisma.filterGroup.findFirst` (existingGroup) - executeWithRetry **ENTFERNT**
- ❌ `prisma.filterGroup.findFirst` (maxOrder) - executeWithRetry **ENTFERNT**
- ✅ `prisma.filterGroup.create` - executeWithRetry **BEHALTEN**

**updateFilterGroup:**
- ❌ `prisma.filterGroup.findFirst` (existingGroup) - executeWithRetry **ENTFERNT**
- ❌ `prisma.filterGroup.findFirst` (nameExists) - executeWithRetry **ENTFERNT**
- ✅ `prisma.filterGroup.update` - executeWithRetry **BEHALTEN**

**deleteFilterGroup:**
- ❌ `prisma.filterGroup.findFirst` - executeWithRetry **ENTFERNT**
- ✅ `prisma.savedFilter.updateMany` - executeWithRetry **BEHALTEN**
- ✅ `prisma.filterGroup.delete` - executeWithRetry **BEHALTEN**

**addFilterToGroup:**
- ❌ `prisma.savedFilter.findFirst` (filter) - executeWithRetry **ENTFERNT**
- ❌ `prisma.filterGroup.findFirst` (group) - executeWithRetry **ENTFERNT**
- ❌ `prisma.savedFilter.findFirst` (maxOrder) - executeWithRetry **ENTFERNT**
- ✅ `prisma.savedFilter.update` - executeWithRetry **BEHALTEN**

**removeFilterFromGroup:**
- ❌ `prisma.savedFilter.findFirst` - executeWithRetry **ENTFERNT**
- ✅ `prisma.savedFilter.update` - executeWithRetry **BEHALTEN**

---

## 📊 ERWARTETE VERBESSERUNG

### Vorher:
- **createTask:** 5-7 executeWithRetry Aufrufe pro Request
- **updateTask:** 6+ executeWithRetry Aufrufe pro Request
- **createRequest:** 4 executeWithRetry Aufrufe pro Request
- **Connection Pool:** 80% ausgelastet (16 von 20 Verbindungen)
- **Bei DB-Fehlern:** Viele parallele Retries → System wird langsam

### Nachher:
- **createTask:** 1 executeWithRetry Aufruf pro Request (nur task.create)
- **updateTask:** 1 executeWithRetry Aufruf pro Request (nur task.update)
- **createRequest:** 1 executeWithRetry Aufruf pro Request (nur request.create)
- **Connection Pool:** Weniger belastet
- **Bei DB-Fehlern:** Weniger parallele Retries → System bleibt schneller

**Reduktion:**
- **executeWithRetry Aufrufe:** Von 5-7 → 1 pro createTask (**80-85% Reduktion**)
- **Connection Pool Belastung:** Von 80% → deutlich weniger
- **System:** Von langsam → schneller

---

## 🔍 BETROFFENE STELLEN

**executeWithRetry wurde entfernt in:**
- ✅ `taskController.ts` - createTask, updateTask (5 READ/Validierungs-Queries)
- ✅ `requestController.ts` - createRequest (3 READ/Validierungs-Queries)
- ✅ `translations.ts` - getUserLanguage (2 READ-Queries)
- ✅ `savedFilterController.ts` - Alle Validierungs-Queries (10+ READ-Queries)

**executeWithRetry wurde BEHALTEN in:**
- ✅ `taskController.ts` - createTask (task.create), updateTask (task.update)
- ✅ `requestController.ts` - createRequest (request.create), updateRequest (request.update)
- ✅ `savedFilterController.ts` - Alle CREATE/UPDATE/DELETE Operationen

**Gesamt: 20+ executeWithRetry Aufrufe entfernt, nur kritische Operationen behalten**

---

## ⚠️ WICHTIGE HINWEISE

### Risiken (sehr niedrig):
1. **Validierungs-Queries können fehlschlagen** - Aber: Nicht kritisch, User sieht Fehler
2. **getUserLanguage kann fehlschlagen** - Aber: Fallback auf 'de' ist ausreichend
3. **READ-Operationen können fehlschlagen** - Aber: Nicht kritisch, User sieht Fehler

### Vorteile:
1. **50-70% weniger executeWithRetry Aufrufe** pro Request
2. **Connection Pool wird weniger belastet**
3. **System wird schneller** (weniger parallele Retries)
4. **Weniger Memory-Verbrauch** (weniger Promise-Objekte)

---

## 📋 COMMIT-INFO

**Dateien geändert:**
- `backend/src/controllers/taskController.ts` - executeWithRetry bei Validierungs-Queries entfernt
- `backend/src/controllers/requestController.ts` - executeWithRetry bei Validierungs-Queries entfernt
- `backend/src/utils/translations.ts` - executeWithRetry bei getUserLanguage entfernt
- `backend/src/controllers/savedFilterController.ts` - executeWithRetry bei Validierungs-Queries entfernt

**Änderungen:**
- executeWithRetry bei allen READ/Validierungs-Queries entfernt
- executeWithRetry NUR bei CREATE/UPDATE/DELETE behalten
- 20+ executeWithRetry Aufrufe entfernt

---

## ⚠️ WICHTIG

**Server muss neu gestartet werden:**
- Änderungen werden erst nach Server-Neustart aktiv
- User muss Server neu starten (ich darf das nicht)

**Erwartetes Verhalten nach Neustart:**
- System sollte schneller sein (weniger executeWithRetry Aufrufe)
- Connection Pool sollte weniger belastet sein
- Bei DB-Fehlern: Weniger parallele Retries → System bleibt schneller

---

**Erstellt:** 2025-01-26  
**Status:** ✅ Implementiert  
**Nächster Schritt:** Server neu starten (User muss das machen)


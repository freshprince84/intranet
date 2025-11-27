# Deployment-Anleitung: executeWithRetry bei Validierungs-Queries entfernt (2025-01-26)

**Datum:** 2025-01-26  
**Status:** ✅ Bereit zum Deployment  
**Änderung:** executeWithRetry bei READ/Validierungs-Queries entfernt, nur bei CREATE/UPDATE/DELETE behalten

---

## 📋 DEPLOYMENT-SCHRITTE

### Schritt 1: Git Pull auf Server

**SSH-Verbindung zum Server:**
```bash
ssh -i ~/.ssh/intranet_rsa root@65.109.228.106
```

**Im Server-Verzeichnis:**
```bash
cd /var/www/intranet
```

**⚠️ WICHTIG: Falls lokale Änderungen in dist/ vorhanden sind:**

```bash
# Option 1: Dist-Dateien zurücksetzen (empfohlen, da sie sowieso neu gebaut werden)
cd /var/www/intranet/backend
git checkout -- dist/
cd /var/www/intranet
git clean -fd backend/dist/

# Dann Pull
git pull
```

**⚠️ FALLS Git-Konflikt (unmerged files):**

```bash
# Unmerged files entfernen
cd /var/www/intranet
git rm backend/dist/controllers/savedFilterController.js
git rm backend/dist/controllers/savedFilterController.js.map

# Falls Dateien nicht existieren:
git rm --cached backend/dist/controllers/savedFilterController.js
git rm --cached backend/dist/controllers/savedFilterController.js.map

# Dann Pull
git pull
```

**⚠️ FALLS weiterhin Probleme:**

```bash
# Dist-Verzeichnis komplett aufräumen
cd /var/www/intranet/backend
rm -rf dist/
cd /var/www/intranet
git clean -fd backend/dist/
git pull
```

**Oder Option 2: Stash lokale Änderungen:**
```bash
cd /var/www/intranet
git stash
git pull
git stash pop  # Falls nötig (normalerweise nicht, da dist/ neu gebaut wird)
```

**Erwartetes Ergebnis:**
- Neuer Commit wird gepullt: "Performance: executeWithRetry bei Validierungs-Queries entfernt"
- Dateien wurden geändert:
  - `backend/src/controllers/taskController.ts`
  - `backend/src/controllers/requestController.ts`
  - `backend/src/utils/translations.ts`
  - `backend/src/controllers/savedFilterController.ts`

---

### Schritt 2: Backend neu bauen

**Im Backend-Verzeichnis:**
```bash
cd /var/www/intranet/backend
npm run build
```

**Erwartetes Ergebnis:**
- TypeScript wird kompiliert
- Neue `dist/controllers/taskController.js` wird erstellt
- Neue `dist/controllers/requestController.js` wird erstellt
- Neue `dist/utils/translations.js` wird erstellt
- Neue `dist/controllers/savedFilterController.js` wird erstellt
- Keine Fehler

---

### Schritt 3: Server neu starten

**⚠️ WICHTIG: Du musst den Server neu starten! (Ich darf das nicht)**

**PM2 neu starten:**
```bash
pm2 restart intranet-backend
pm2 status
```

**Erwartetes Ergebnis:**
- `intranet-backend` wird neu gestartet
- Status sollte "online" sein
- Keine Fehler in den Logs

---

### Schritt 4: Verifikation

**Logs prüfen:**
```bash
pm2 logs intranet-backend --lines 50 --nostream
```

**Erwartetes Verhalten:**
- Keine Fehler beim Start
- System sollte normal funktionieren
- **Weniger executeWithRetry Aufrufe** (nur bei CREATE/UPDATE/DELETE)

**Performance prüfen:**
- System sollte **schneller** sein (weniger executeWithRetry Aufrufe)
- Connection Pool sollte **weniger belastet** sein
- Bei DB-Fehlern: **Weniger parallele Retries** → System bleibt schneller

---

## 🔍 WAS WURDE GEÄNDERT?

### taskController.ts

**createTask:**
```typescript
// Vorher: executeWithRetry bei Validierung
const responsibleUser = await executeWithRetry(() =>
  prisma.user.findFirst({...})
);

// Nachher: Kein executeWithRetry bei Validierung
const responsibleUser = await prisma.user.findFirst({...});
```

**updateTask:**
```typescript
// Vorher: executeWithRetry bei READ-Operationen
const currentTask = await executeWithRetry(() =>
  prisma.task.findFirst({...})
);

// Nachher: Kein executeWithRetry bei READ-Operationen
const currentTask = await prisma.task.findFirst({...});
```

**BEHALTEN:**
- ✅ `prisma.task.create` - executeWithRetry (kritisch)
- ✅ `prisma.task.update` - executeWithRetry (kritisch)

---

### requestController.ts

**createRequest:**
```typescript
// Vorher: executeWithRetry bei Validierung
const requesterUser = await executeWithRetry(() =>
  prisma.user.findFirst({...})
);

// Nachher: Kein executeWithRetry bei Validierung
const requesterUser = await prisma.user.findFirst({...});
```

**BEHALTEN:**
- ✅ `prisma.request.create` - executeWithRetry (kritisch)
- ✅ `prisma.request.update` - executeWithRetry (kritisch)

---

### translations.ts

**getUserLanguage:**
```typescript
// Vorher: executeWithRetry bei READ-Operationen
const user = await executeWithRetry(() =>
  prisma.user.findUnique({...})
);

// Nachher: Kein executeWithRetry bei READ-Operationen
const user = await prisma.user.findUnique({...});
```

**Begründung:**
- getUserLanguage verwendet bereits `userLanguageCache` (10 Minuten TTL)
- Bei Cache-Miss: executeWithRetry ist nicht nötig (nicht kritisch)
- Falls DB-Fehler: Fallback auf 'de' ist ausreichend

---

### savedFilterController.ts

**Alle Validierungs-Queries:**
- ❌ `prisma.savedFilter.findFirst` - executeWithRetry **ENTFERNT**
- ❌ `prisma.filterGroup.findFirst` - executeWithRetry **ENTFERNT**

**BEHALTEN:**
- ✅ `prisma.savedFilter.create` - executeWithRetry (kritisch)
- ✅ `prisma.savedFilter.update` - executeWithRetry (kritisch)
- ✅ `prisma.savedFilter.delete` - executeWithRetry (kritisch)
- ✅ `prisma.filterGroup.create` - executeWithRetry (kritisch)
- ✅ `prisma.filterGroup.update` - executeWithRetry (kritisch)
- ✅ `prisma.filterGroup.delete` - executeWithRetry (kritisch)

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

## ⚠️ WICHTIG

**Server muss neu gestartet werden:**
- Änderungen werden erst nach Server-Neustart aktiv
- PM2 restart ist erforderlich

**Keine Breaking Changes:**
- Alle bestehenden Verwendungen funktionieren weiterhin
- Nur executeWithRetry bei nicht-kritischen Operationen entfernt

**Risiken (sehr niedrig):**
- Validierungs-Queries können fehlschlagen - Aber: Nicht kritisch, User sieht Fehler
- getUserLanguage kann fehlschlagen - Aber: Fallback auf 'de' ist ausreichend

**Vorteile:**
- 50-70% weniger executeWithRetry Aufrufe pro Request
- Connection Pool wird weniger belastet
- System wird schneller

---

## 🆘 BEI PROBLEMEN

**Falls Git Pull fehlschlägt wegen lokaler Änderungen:**
```bash
# Dist-Dateien zurücksetzen (werden beim Build neu generiert)
cd /var/www/intranet/backend
git checkout -- dist/
cd /var/www/intranet
git clean -fd backend/dist/
git pull
```

**Falls Server nicht startet:**
```bash
pm2 logs intranet-backend --lines 100
```

**Falls Fehler auftreten:**
- Prüfe Logs auf Fehlermeldungen
- Prüfe ob TypeScript-Kompilierung erfolgreich war
- Prüfe ob alle Dateien korrekt gebaut wurden

---

**Erstellt:** 2025-01-26  
**Status:** ✅ Bereit zum Deployment


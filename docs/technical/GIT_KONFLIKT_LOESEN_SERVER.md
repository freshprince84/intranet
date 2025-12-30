# Git-Konflikt lösen auf Server (2025-01-26)

**Problem:** Unmerged files in `backend/dist/` verhindern Git Pull

---

## 🔧 LÖSUNG

### Schritt 1: Unmerged Files entfernen

**Befehl:**
```bash
cd /var/www/intranet
git rm backend/dist/controllers/savedFilterController.js
git rm backend/dist/controllers/savedFilterController.js.map
```

**Falls das nicht funktioniert (weil Dateien nicht existieren):**
```bash
cd /var/www/intranet
git rm --cached backend/dist/controllers/savedFilterController.js
git rm --cached backend/dist/controllers/savedFilterController.js.map
```

**Oder: Alle unmerged files prüfen und entfernen:**
```bash
cd /var/www/intranet
git status
```

**Dann alle unmerged files entfernen:**
```bash
cd /var/www/intranet
git rm backend/dist/controllers/savedFilterController.js backend/dist/controllers/savedFilterController.js.map
```

---

### Schritt 2: Git Pull durchführen

**Befehl:**
```bash
cd /var/www/intranet
git pull
```

**Erwartetes Ergebnis:**
- Pull sollte erfolgreich sein
- Neue Commits werden gepullt

---

### Schritt 3: Dist-Verzeichnis komplett aufräumen (falls nötig)

**Falls weiterhin Probleme:**
```bash
cd /var/www/intranet/backend
rm -rf dist/
cd /var/www/intranet
git clean -fd backend/dist/
```

**Dann Pull:**
```bash
cd /var/www/intranet
git pull
```

---

### Schritt 4: Backend neu bauen

**Nach erfolgreichem Pull:**
```bash
cd /var/www/intranet/backend
npm run build
```

---

## 🆘 ALTERNATIVE: Git Reset (falls nichts funktioniert)

**⚠️ VORSICHT: Nur wenn nichts anderes funktioniert!**

```bash
cd /var/www/intranet
git reset --hard HEAD
git clean -fd
git pull
```

**Dann Backend neu bauen:**
```bash
cd /var/www/intranet/backend
npm run build
```

---

**Erstellt:** 2025-01-26  
**Status:** 🔧 Lösung für Git-Konflikt


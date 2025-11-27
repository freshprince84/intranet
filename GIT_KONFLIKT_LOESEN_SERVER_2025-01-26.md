# Git-Konflikt lösen auf Server (2025-01-26)

**Datum:** 2025-01-26  
**Status:** ⚠️ Git-Konflikt beim Pull  
**Problem:** Lokale Änderungen blockieren Git Pull

---

## 🔴 PROBLEM

**Fehler beim `git pull`:**
```
error: Your local changes to the following files would be overwritten by merge:
        backend/dist/controllers/savedFilterController.js
        backend/dist/controllers/savedFilterController.js.map
        backend/scripts/check-ttlock-org-settings.ts
error: The following untracked working tree files would be overwritten by merge:
        backend/scripts/check-ttlock-password.ts
        backend/scripts/copy-ttlock-settings-org-to-branch3.ts
        backend/scripts/debug-ttlock-settings-loading.ts
        backend/scripts/test-ttlock-manila.ts
```

---

## ✅ LÖSUNG

### Schritt 1: dist/ Dateien entfernen (generierte Dateien)

**Auf dem Server (SSH-Session):**

```bash
cd /var/www/intranet/backend

# Entferne dist/ Dateien (werden beim Build neu generiert)
git checkout -- backend/dist/controllers/savedFilterController.js
git checkout -- backend/dist/controllers/savedFilterController.js.map

# Oder: Alle dist/ Dateien entfernen
git clean -fd backend/dist/
```

---

### Schritt 2: Script-Dateien prüfen und entfernen

**Prüfe ob Script-Dateien wichtig sind:**

```bash
cd /var/www/intranet/backend

# Prüfe lokale Änderungen
git status

# Prüfe was in check-ttlock-org-settings.ts geändert wurde
git diff backend/scripts/check-ttlock-org-settings.ts
```

**Falls Script-Dateien nicht wichtig sind (temporäre Test-Scripts):**

```bash
# Entferne lokale Änderungen
git checkout -- backend/scripts/check-ttlock-org-settings.ts

# Entferne untracked Script-Dateien
rm backend/scripts/check-ttlock-password.ts
rm backend/scripts/copy-ttlock-settings-org-to-branch3.ts
rm backend/scripts/debug-ttlock-settings-loading.ts
rm backend/scripts/test-ttlock-manila.ts
```

**Falls Script-Dateien wichtig sind:**

```bash
# Committe lokale Änderungen
git add backend/scripts/check-ttlock-org-settings.ts
git commit -m "Local changes to check-ttlock-org-settings.ts"

# Füge untracked Dateien hinzu und committe
git add backend/scripts/check-ttlock-password.ts
git add backend/scripts/copy-ttlock-settings-org-to-branch3.ts
git add backend/scripts/debug-ttlock-settings-loading.ts
git add backend/scripts/test-ttlock-manila.ts
git commit -m "Add TTLock test scripts"
```

---

### Schritt 3: Git Pull erneut versuchen

**Nachdem Konflikte gelöst sind:**

```bash
cd /var/www/intranet/backend

# Pull erneut
git pull

# Sollte jetzt funktionieren
```

---

### Schritt 4: Build und Restart

```bash
# Build
npm run build

# Restart mit --update-env (wichtig für .env Änderungen!)
pm2 restart intranet-backend --update-env
pm2 status
```

---

## 🔍 ALTERNATIVE: Alles zurücksetzen (falls nichts wichtig ist)

**⚠️ WICHTIG: Nur wenn lokale Änderungen nicht wichtig sind!**

```bash
cd /var/www/intranet/backend

# Alle lokalen Änderungen verwerfen
git reset --hard HEAD

# Alle untracked Dateien entfernen
git clean -fd

# Pull
git pull

# Build
npm run build

# Restart
pm2 restart intranet-backend --update-env
```

---

## 📋 ZUSAMMENFASSUNG

### Option 1: Konflikte einzeln lösen (empfohlen)
1. `dist/` Dateien entfernen (generiert)
2. Script-Dateien prüfen und entfernen/committen
3. `git pull` erneut

### Option 2: Alles zurücksetzen (falls nichts wichtig)
1. `git reset --hard HEAD`
2. `git clean -fd`
3. `git pull`

---

**Erstellt:** 2025-01-26  
**Status:** ⚠️ Git-Konflikt beim Pull  
**Nächster Schritt:** Konflikte lösen und Pull erneut versuchen



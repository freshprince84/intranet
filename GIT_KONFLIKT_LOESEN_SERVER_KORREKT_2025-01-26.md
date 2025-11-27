# Git-Konflikt lösen - Korrekte Befehle (2025-01-26)

**Datum:** 2025-01-26  
**Status:** ⚠️ Git-Konflikt - Pfade korrigieren  
**Problem:** Wir sind bereits in `backend/`, Pfade müssen relativ zum Repository-Root sein

---

## 🔍 SCHRITT 1: Git-Status prüfen

**Auf dem Server (SSH-Session):**

```bash
cd /var/www/intranet
git status
```

**Ziel:** Sehen, welche Dateien lokal geändert wurden

---

## ✅ SCHRITT 2: Dist-Dateien entfernen (relativ zum Repository-Root)

**Wichtig:** Wir müssen zum Repository-Root (`/var/www/intranet`) wechseln!

```bash
cd /var/www/intranet

# Entferne dist/ Dateien (werden beim Build neu generiert)
git checkout -- backend/dist/controllers/savedFilterController.js
git checkout -- backend/dist/controllers/savedFilterController.js.map
```

**Falls das nicht funktioniert (Dateien existieren nicht in Git):**

```bash
cd /var/www/intranet

# Entferne Dateien direkt
rm -f backend/dist/controllers/savedFilterController.js
rm -f backend/dist/controllers/savedFilterController.js.map
```

---

## ✅ SCHRITT 3: Script-Dateien entfernen (relativ zum Repository-Root)

```bash
cd /var/www/intranet

# Entferne lokale Änderungen an check-ttlock-org-settings.ts
git checkout -- backend/scripts/check-ttlock-org-settings.ts

# Entferne untracked Script-Dateien (temporäre Test-Scripts)
rm -f backend/scripts/check-ttlock-password.ts
rm -f backend/scripts/copy-ttlock-settings-org-to-branch3.ts
rm -f backend/scripts/debug-ttlock-settings-loading.ts
rm -f backend/scripts/test-ttlock-manila.ts
```

**Falls `git checkout` nicht funktioniert:**

```bash
cd /var/www/intranet

# Prüfe was geändert wurde
git diff backend/scripts/check-ttlock-org-settings.ts

# Entferne Datei direkt (falls nicht wichtig)
rm -f backend/scripts/check-ttlock-org-settings.ts
```

---

## ✅ SCHRITT 4: Git Pull erneut

```bash
cd /var/www/intranet
git pull
```

**Sollte jetzt funktionieren!**

---

## 🆘 ALTERNATIVE: Alles zurücksetzen (falls nichts funktioniert)

**⚠️ WICHTIG: Nur wenn lokale Änderungen nicht wichtig sind!**

```bash
cd /var/www/intranet

# Alle lokalen Änderungen verwerfen
git reset --hard HEAD

# Alle untracked Dateien entfernen
git clean -fd

# Pull
git pull
```

---

## ✅ SCHRITT 5: Build und Restart

```bash
cd /var/www/intranet/backend

# Build
npm run build

# Restart mit --update-env (wichtig für .env Änderungen!)
pm2 restart intranet-backend --update-env
pm2 status
```

---

## 📋 ZUSAMMENFASSUNG

**Wichtig:** Alle Git-Befehle müssen vom Repository-Root (`/var/www/intranet`) ausgeführt werden!

**Befehle:**
1. `cd /var/www/intranet` - Zum Repository-Root
2. `git status` - Status prüfen
3. `git checkout -- backend/dist/...` oder `rm -f backend/dist/...` - Dist-Dateien entfernen
4. `git checkout -- backend/scripts/...` oder `rm -f backend/scripts/...` - Script-Dateien entfernen
5. `git pull` - Pull erneut
6. `cd backend && npm run build && pm2 restart intranet-backend --update-env` - Build und Restart

---

**Erstellt:** 2025-01-26  
**Status:** ⚠️ Git-Konflikt - Korrekte Befehle  
**Nächster Schritt:** Befehle vom Repository-Root ausführen



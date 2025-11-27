# Git-Konflikt lösen - Staged Changes (2025-01-26)

**Datum:** 2025-01-26  
**Status:** ⚠️ Git-Konflikt - Staged Changes blockieren Pull  
**Problem:** Dateien sind als "deleted" gestaged, aber existieren noch als untracked files

---

## 🔴 PROBLEM

**Git Status zeigt:**
- `Changes to be committed:` - Dateien sind als "deleted" gestaged
- `Untracked files:` - Die gleichen Dateien existieren noch als untracked

**Git kann nicht pullen, weil:**
- Dateien sind gestaged als deleted
- Aber existieren noch als untracked files
- Git weiß nicht, was zu tun ist

---

## ✅ LÖSUNG

### Schritt 1: Staged Changes zurücksetzen

```bash
cd /var/www/intranet

# Zurücksetzen der staged deletions
git restore --staged backend/dist/controllers/savedFilterController.js
git restore --staged backend/dist/controllers/savedFilterController.js.map
```

### Schritt 2: Untracked Files entfernen

```bash
cd /var/www/intranet

# Entferne untracked dist/ Dateien
rm -f backend/dist/controllers/savedFilterController.js
rm -f backend/dist/controllers/savedFilterController.js.map
```

### Schritt 3: Lokale Änderungen verwerfen

```bash
cd /var/www/intranet

# Verwerfe lokale Änderungen an package-lock.json und check-ttlock-org-settings.ts
git restore backend/package-lock.json
git restore backend/scripts/check-ttlock-org-settings.ts
```

### Schritt 4: Git Pull erneut

```bash
cd /var/www/intranet
git pull
```

**Sollte jetzt funktionieren!**

---

## 🆘 ALTERNATIVE: Alles zurücksetzen (einfacher)

**⚠️ WICHTIG: Nur wenn lokale Änderungen nicht wichtig sind!**

```bash
cd /var/www/intranet

# Alle staged changes zurücksetzen
git reset HEAD

# Alle lokalen Änderungen verwerfen
git restore .

# Alle untracked Dateien entfernen (außer .env und wichtige Dateien)
git clean -fd

# Pull
git pull
```

**Dann Build und Restart:**
```bash
cd /var/www/intranet/backend
npm run build
pm2 restart intranet-backend --update-env
```

---

## 📋 ZUSAMMENFASSUNG

**Problem:** Staged deletions + untracked files = Konflikt

**Lösung:**
1. Staged changes zurücksetzen: `git restore --staged ...`
2. Untracked files entfernen: `rm -f ...`
3. Lokale Änderungen verwerfen: `git restore ...`
4. Pull: `git pull`

**Oder einfacher:**
1. Alles zurücksetzen: `git reset HEAD && git restore . && git clean -fd`
2. Pull: `git pull`

---

**Erstellt:** 2025-01-26  
**Status:** ⚠️ Git-Konflikt - Staged Changes  
**Nächster Schritt:** Staged changes zurücksetzen und Pull erneut



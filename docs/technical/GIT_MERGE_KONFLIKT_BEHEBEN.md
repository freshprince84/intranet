# Git Merge-Konflikt auf Server beheben

## Problem
`git pull` schlägt fehl wegen unmerged files (Merge-Konflikt).

## Lösung: Optionen

### Option 1: Remote-Änderungen vorziehen (empfohlen, wenn lokale Änderungen unwichtig)

```bash
cd /var/www/intranet

# Prüfe welche Dateien betroffen sind
git status

# Alle lokalen Änderungen verwerfen und Remote-Version nehmen
git reset --hard origin/main

# Oder falls es einen laufenden Merge gibt:
git merge --abort
git reset --hard origin/main
```

### Option 2: Lokale Änderungen behalten und später mergen

```bash
cd /var/www/intranet

# Aktuellen Merge abbrechen
git merge --abort

# Lokale Änderungen stashen
git stash

# Remote-Änderungen holen
git pull origin main

# Stashed Änderungen wieder anwenden (falls gewünscht)
git stash pop
```

### Option 3: Konflikt manuell auflösen (wenn beide wichtig)

```bash
cd /var/www/intranet

# Prüfe welche Dateien betroffen sind
git status

# Öffne jede Datei mit Konflikten und löse sie manuell
# Suche nach Markierungen wie:
# <<<<<<< HEAD
# ... lokale Änderungen ...
# =======
# ... Remote-Änderungen ...
# >>>>>>> origin/main

# Nach dem Auflösen:
git add <datei>
git commit -m "Merge-Konflikt aufgelöst"
```

## Empfohlene Vorgehensweise für Server

**Da auf dem Server normalerweise keine lokalen Änderungen sein sollten:**

```bash
cd /var/www/intranet

# 1. Merge abbrechen (falls laufend)
git merge --abort

# 2. Status prüfen
git status

# 3. Remote-Version erzwingen (überschreibt lokale Änderungen)
git reset --hard origin/main

# 4. Nochmal pullen (sollte jetzt funktionieren)
git pull origin main
```

## Wichtig

⚠️ **Achtung:** `git reset --hard` löscht alle lokalen Änderungen unwiderruflich!

Nur verwenden, wenn:
- Du sicher bist, dass lokale Änderungen unwichtig sind
- Oder du weißt, was du tust

Falls du unsicher bist, verwende Option 2 (stash).


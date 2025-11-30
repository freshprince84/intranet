# Datenbank-Passwort auf Server finden

## Datum
2025-01-27

## Überblick
Anleitung zum Finden des Datenbank-Passworts auf dem Produktivserver.

---

## Methode 1: Aus .env Datei auslesen

### Schritt 1: SSH auf den Server
```bash
ssh root@65.109.228.106
# Oder mit deinem SSH-Key
```

### Schritt 2: .env Datei finden und anzeigen
```bash
# Standard-Pfad (laut Deployment-Dokumentation)
cd /var/www/intranet/backend

# Prüfe ob .env existiert
ls -la .env

# Zeige DATABASE_URL (enthält Passwort)
cat .env | grep DATABASE_URL
```

**Erwartete Ausgabe:**
```
DATABASE_URL="postgresql://intranetuser:DEIN_PASSWORT_HIER@localhost:5432/intranet?schema=public&connection_limit=20&pool_timeout=20"
```

**Format:** `postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE`

### Schritt 3: Passwort extrahieren
Das Passwort steht zwischen `:` und `@` in der DATABASE_URL.

**Beispiel:**
- `postgresql://intranetuser:meinpasswort123@localhost:5432/intranet`
- Passwort = `meinpasswort123`

---

## Methode 2: Direkt mit psql verbinden (wenn Passwort bekannt)

### Mit Passwort in Kommandozeile
```bash
# Auf dem Server
psql -h localhost -U intranetuser -d intranet
# Wird nach Passwort fragen
```

### Mit Passwort in Umgebungsvariable
```bash
# Auf dem Server
export PGPASSWORD="dein_passwort_hier"
psql -h localhost -U intranetuser -d intranet
```

### Mit DATABASE_URL
```bash
# Auf dem Server
cd /var/www/intranet/backend
source .env  # Lädt .env Variablen (falls unterstützt)
psql $DATABASE_URL
```

---

## Methode 3: Als postgres-User (falls sudo-Rechte vorhanden)

### Als postgres-User ohne Passwort
```bash
# Auf dem Server
sudo -u postgres psql -d intranet
# Kein Passwort nötig, wenn als postgres-User
```

**Vorteil:** Kein Passwort nötig, wenn du sudo-Rechte hast.

---

## Methode 4: Passwort aus DATABASE_URL extrahieren (Script)

### Einfaches Bash-Script
```bash
# Auf dem Server
cd /var/www/intranet/backend

# Extrahiere Passwort aus DATABASE_URL
DATABASE_URL=$(grep DATABASE_URL .env | cut -d '=' -f2 | tr -d '"')
PASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
echo "Passwort: $PASSWORD"
```

---

## Empfohlene Methode für SQL-Befehle

### Option A: Als postgres-User (einfachste Methode)
```bash
# Auf dem Server
sudo -u postgres psql -d intranet
```

**Dann SQL-Befehle ausführen:**
```sql
-- Alle Befehle aus RESERVATION_DUPLIKAT_BEREINIGUNG_DIRECT_SQL.md
```

### Option B: Mit Passwort aus .env
```bash
# Auf dem Server
cd /var/www/intranet/backend

# Extrahiere User und Passwort
DB_USER=$(grep DATABASE_URL .env | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(grep DATABASE_URL .env | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')

# Verbinde mit psql
PGPASSWORD=$DB_PASS psql -h localhost -U $DB_USER -d intranet
```

---

## Schnellstart für Duplikat-Bereinigung

### 1. Verbindung herstellen
```bash
# Auf dem Server
sudo -u postgres psql -d intranet
```

### 2. SQL-Befehle ausführen
Alle SQL-Befehle aus `RESERVATION_DUPLIKAT_BEREINIGUNG_DIRECT_SQL.md` können dann direkt ausgeführt werden.

### 3. Verbindung beenden
```sql
\q
```

---

## Sicherheitshinweise

⚠️ **WICHTIG:**
- Passwort nicht in Logs speichern
- Passwort nicht in Git committen
- Passwort nicht in öffentlichen Dokumenten speichern
- Nach Verwendung: Shell-History löschen (optional)

### Shell-History löschen (optional)
```bash
# Nach Verwendung
history -d $(history | grep -n "PGPASSWORD" | cut -d: -f1)
# Oder
unset PGPASSWORD
```

---

## Alternative: Prisma Studio (GUI)

Falls du eine GUI bevorzugst:

```bash
# Auf dem Server
cd /var/www/intranet/backend
npx prisma studio
```

**Vorteil:** GUI, kein Passwort nötig (nutzt DATABASE_URL aus .env)

**Nachteil:** Für SQL-Befehle nicht ideal, besser für Datenbank-Browsing

---

## Zusammenfassung

**Einfachste Methode:**
```bash
sudo -u postgres psql -d intranet
```

**Falls kein sudo:**
1. Passwort aus `.env` extrahieren
2. `PGPASSWORD=... psql -h localhost -U USERNAME -d intranet`

**Passwort finden:**
```bash
cd /var/www/intranet/backend
cat .env | grep DATABASE_URL
```


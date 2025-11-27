# Anleitung: Connection Pool auf Server prüfen (2025-01-26)

**Datum:** 2025-01-26  
**Status:** 📋 Prüfungsanleitung  
**Zweck:** Connection Pool Einstellungen auf dem Server prüfen

---

## 📋 SCHRITTE

### Schritt 1: SSH-Verbindung zum Server

**SSH-Verbindung:**
```bash
ssh -i ~/.ssh/intranet_rsa root@65.109.228.106
```

---

### Schritt 2: Ins Backend-Verzeichnis wechseln

```bash
cd /var/www/intranet/backend
```

---

### Schritt 3: Prüfungs-Script ausführen

**Option A: Script direkt ausführen (empfohlen)**
```bash
npx ts-node scripts/check-connection-pool.ts
```

**Option B: Falls ts-node nicht verfügbar**
```bash
npm run build
node dist/scripts/check-connection-pool.js
```

**Erwartetes Ergebnis:**
```
🔍 Prüfe Connection Pool Einstellungen und Status...

DATABASE_URL: postgresql://intranetuser:****@localhost:5432/intranet?schema=public

📋 1. DATABASE_URL Connection Pool Parameter:
────────────────────────────────────────────────────────────
   ❌ connection_limit: FEHLT! (Standard: 5)
   ⚠️  KRITISCH: Nur 5 Verbindungen erlaubt!
   ❌ pool_timeout: FEHLT! (Standard: 10 Sekunden)
   ⚠️  KRITISCH: Nur 10 Sekunden Timeout!

📋 2. Prisma Connection Pool Status:
────────────────────────────────────────────────────────────
   ✅ Prisma Client verbunden
   ⚠️  Connection Limit: Nicht in DATABASE_URL (Standard: 5)
   ⚠️  Pool Timeout: Nicht in DATABASE_URL (Standard: 10 Sekunden)
   ✅ Test-Query erfolgreich (15ms)

📋 3. Empfehlungen:
────────────────────────────────────────────────────────────
   ⚠️  KRITISCH: Connection Pool Parameter fehlen!
   
   DATABASE_URL muss erweitert werden:
   
   Aktuell: postgresql://intranetuser:****@localhost:5432/intranet?schema=public
   
   Empfohlen: postgresql://intranetuser:****@localhost:5432/intranet?schema=public&connection_limit=20&pool_timeout=20
```

---

### Schritt 4: .env Datei prüfen

**Prüfe aktuelle DATABASE_URL:**
```bash
cd /var/www/intranet/backend
grep DATABASE_URL .env
```

**Erwartetes Format:**
```
DATABASE_URL="postgresql://intranetuser:password@localhost:5432/intranet?schema=public"
```

**Oder (wenn bereits erweitert):**
```
DATABASE_URL="postgresql://intranetuser:password@localhost:5432/intranet?schema=public&connection_limit=20&pool_timeout=20"
```

---

### Schritt 5: Falls Connection Pool fehlt - .env bearbeiten

**⚠️ WICHTIG: Nur wenn Connection Pool Parameter fehlen!**

**1. .env Datei öffnen:**
```bash
cd /var/www/intranet/backend
nano .env
# ODER
vi .env
```

**2. DATABASE_URL finden und erweitern:**

**Finde diese Zeile:**
```
DATABASE_URL="postgresql://intranetuser:password@localhost:5432/intranet?schema=public"
```

**Ändere zu:**
```
DATABASE_URL="postgresql://intranetuser:password@localhost:5432/intranet?schema=public&connection_limit=20&pool_timeout=20"
```

**⚠️ WICHTIG:**
- Verwende `&` (nicht `?`) wenn bereits `?schema=public` vorhanden ist!
- `connection_limit=20`: Erlaubt 20 gleichzeitige Verbindungen (statt 5)
- `pool_timeout=20`: 20 Sekunden Timeout (statt 10)

**3. Speichern und schließen:**
- `nano`: `Ctrl+O` (speichern), `Ctrl+X` (schließen)
- `vi`: `:wq` (speichern und schließen)

---

### Schritt 6: Prüfung erneut ausführen

**Nach .env-Änderung:**
```bash
npx ts-node scripts/check-connection-pool.ts
```

**Erwartetes Ergebnis (nach Fix):**
```
📋 1. DATABASE_URL Connection Pool Parameter:
────────────────────────────────────────────────────────────
   ✅ connection_limit=20 ist ausreichend
   ✅ pool_timeout=20 ist ausreichend

📋 2. Prisma Connection Pool Status:
────────────────────────────────────────────────────────────
   ✅ Prisma Client verbunden
   ✅ Connection Limit: 20
   ✅ Pool Timeout: 20 Sekunden
   ✅ Test-Query erfolgreich (15ms)

📋 3. Empfehlungen:
────────────────────────────────────────────────────────────
   ✅ Connection Pool Parameter sind vorhanden
```

---

### Schritt 7: Server neu starten (NACH .env-Änderung)

**⚠️ WICHTIG: Nur wenn .env geändert wurde!**

```bash
pm2 restart intranet-backend
pm2 status
```

**Erwartetes Ergebnis:**
```
┌─────┬──────────────────┬─────────┬─────────┬──────────┐
│ id  │ name             │ status  │ restart │ uptime   │
├─────┼──────────────────┼─────────┼─────────┼──────────┤
│ 0   │ intranet-backend │ online  │ 0       │ 0s       │
└─────┴──────────────────┴─────────┴─────────┴──────────┘
```

---

### Schritt 8: Logs prüfen

**Prüfe auf Connection Pool Timeouts:**
```bash
pm2 logs intranet-backend --lines 100 --nostream | grep -i "connection pool\|timeout" | tail -20
```

**Erwartetes Ergebnis:**
- **KEINE** "connection pool timeout" Fehler
- **KEINE** "Timed out fetching a new connection" Fehler

---

## 📊 MÖGLICHE ERGEBNISSE

### ✅ Connection Pool ist korrekt konfiguriert

**Ausgabe:**
```
✅ connection_limit=20 ist ausreichend
✅ pool_timeout=20 ist ausreichend
```

**Bedeutung:**
- Connection Pool ist korrekt konfiguriert
- **Nicht das Problem** - Weiter mit executeWithRetry Implementierung

---

### ❌ Connection Pool fehlt

**Ausgabe:**
```
❌ connection_limit: FEHLT! (Standard: 5)
❌ pool_timeout: FEHLT! (Standard: 10 Sekunden)
```

**Bedeutung:**
- **Das ist wahrscheinlich das Hauptproblem!**
- Connection Pool ist zu klein (nur 5 Verbindungen)
- **Zuerst beheben**, dann executeWithRetry implementieren

**Lösung:**
- .env Datei erweitern (Schritt 5)
- Server neu starten (Schritt 7)
- Erneut prüfen (Schritt 6)

---

### ⚠️ Connection Pool ist zu niedrig

**Ausgabe:**
```
⚠️  WARNUNG: connection_limit=10 ist niedrig. Empfohlen: 20-30
```

**Bedeutung:**
- Connection Pool ist vorhanden, aber zu niedrig
- **Könnte problematisch sein** bei hoher Last

**Lösung:**
- .env Datei erweitern auf `connection_limit=20`
- Server neu starten
- Erneut prüfen

---

## 🔍 ZUSÄTZLICHE PRÜFUNGEN

### Prüfe Server-Logs auf Connection Pool Timeouts

```bash
pm2 logs intranet-backend --lines 500 --nostream | grep -i "connection pool\|timeout\|P1001\|P1008" | tail -50
```

**Suche nach:**
- "Timed out fetching a new connection"
- "Connection pool timeout"
- "P1001" (Can't reach database server)
- "P1008" (Operations timed out)

**Wenn viele Fehler:**
- **Connection Pool ist wahrscheinlich das Problem!**
- Zuerst beheben, dann executeWithRetry implementieren

---

### Prüfe PostgreSQL Verbindungen

```bash
# Als PostgreSQL User
sudo -u postgres psql -d intranet -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'intranet';"
```

**Erwartetes Ergebnis:**
- Anzahl aktiver Verbindungen sollte < connection_limit sein
- Wenn nahe an connection_limit: **Connection Pool ist zu klein!**

---

## 📋 ZUSAMMENFASSUNG

**Prüfungsreihenfolge:**
1. ✅ Script ausführen: `npx ts-node scripts/check-connection-pool.ts`
2. ✅ .env prüfen: `grep DATABASE_URL .env`
3. ✅ Falls fehlt: .env erweitern
4. ✅ Server neu starten: `pm2 restart intranet-backend`
5. ✅ Erneut prüfen: Script erneut ausführen
6. ✅ Logs prüfen: Auf Connection Pool Timeouts

**Entscheidung:**
- **Connection Pool fehlt/zu klein:** Zuerst beheben, dann executeWithRetry
- **Connection Pool ist korrekt:** Weiter mit executeWithRetry Implementierung

---

**Erstellt:** 2025-01-26  
**Status:** 📋 Prüfungsanleitung  
**Nächster Schritt:** Script auf Server ausführen


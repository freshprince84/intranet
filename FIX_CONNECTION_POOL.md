# FIX: Connection Pool Timeout - SOFORT-MASSNAHME

**Datum:** 26.11.2025 18:45 UTC  
**Status:** 🔴 KRITISCH  
**Problem:** Prisma Connection Pool Timeout verhindert alle DB-Zugriffe

---

## 🔴 PROBLEM:

**DATABASE_URL hat keine Connection Pool Einstellungen!**

**Aktuell:**
```
DATABASE_URL="postgresql://intranetuser:password@localhost:5432/intranet?schema=public"
```

**Problem:**
- Standard: `connection_limit: 5` (nur 5 Verbindungen!)
- Standard: `pool_timeout: 10` (10 Sekunden Timeout)
- **Bei mehr als 5 gleichzeitigen Requests:** Pool ist erschöpft → Timeout!
- **Alle APIs betroffen:** Können nicht auf DB zugreifen

---

## ✅ LÖSUNG:

### Schritt 1: .env Datei auf Server bearbeiten

**Auf dem Server (SSH-Session):**

```bash
cd /var/www/intranet/backend
nano .env
# ODER
vi .env
```

### Schritt 2: DATABASE_URL erweitern

**Finde diese Zeile:**
```
DATABASE_URL="postgresql://intranetuser:password@localhost:5432/intranet?schema=public"
```

**Ändere zu:**
```
DATABASE_URL="postgresql://intranetuser:password@localhost:5432/intranet?schema=public&connection_limit=20&pool_timeout=20"
```

**WICHTIG:** 
- Verwende `&` (nicht `?`) wenn bereits `?schema=public` vorhanden ist!
- `connection_limit=20`: Erlaubt 20 gleichzeitige Verbindungen (statt 5)
- `pool_timeout=20`: 20 Sekunden Timeout (statt 10)

### Schritt 3: Prüfe ob Änderung korrekt ist

```bash
cd /var/www/intranet/backend
npx ts-node scripts/check-database-url.ts
```

**Erwartetes Ergebnis:**
```
✅ connection_limit: Vorhanden (20)
✅ pool_timeout: Vorhanden (20)
```

### Schritt 4: Server neu starten

**⚠️ WICHTIG: Du musst den Server neu starten! (Ich darf das nicht)**

```bash
pm2 restart intranet-backend
pm2 status
```

### Schritt 5: Verifikation

```bash
# Prüfe Logs auf Connection Pool Timeouts
pm2 logs intranet-backend --lines 100 --nostream | grep -i "connection pool\|timeout" | tail -20

# Sollte KEINE Timeout-Fehler mehr zeigen!
```

---

## 📋 ZUSAMMENFASSUNG:

**Problem:** Connection Pool zu klein (5 Verbindungen) → Timeouts  
**Lösung:** DATABASE_URL erweitern mit `&connection_limit=20&pool_timeout=20`  
**Nach Fix:** Server neu starten → Problem sollte behoben sein

---

## ⚠️ WICHTIG:

- **Nach .env-Änderung:** Server MUSS neu gestartet werden!
- **Connection Pool:** Erhöht von 5 auf 20 Verbindungen
- **Timeout:** Erhöht von 10 auf 20 Sekunden
- **Das sollte ALLE API-Probleme beheben!**


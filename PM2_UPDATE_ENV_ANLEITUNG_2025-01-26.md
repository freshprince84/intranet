# PM2 Update Environment Variables - Anleitung (2025-01-26)

**Datum:** 2025-01-26  
**Status:** ⚠️ WICHTIG - PM2 lädt .env Änderungen nicht automatisch!  
**Problem:** Connection Pool ist noch auf 20, obwohl .env auf 30 geändert wurde

---

## 🔴 PROBLEM

**PM2 Warnung:**
```
Use --update-env to update environment variables
```

**Das bedeutet:**
- PM2 lädt `.env` Änderungen **NICHT automatisch**
- Server läuft noch mit alten Werten (`connection_limit=20`)
- Neue Werte (`connection_limit=30`) werden **NICHT** geladen

---

## ✅ LÖSUNG

### Schritt 1: PM2 mit --update-env neu starten

**Auf dem Server (SSH-Session):**

```bash
pm2 restart intranet-backend --update-env
pm2 status
```

**WICHTIG:** 
- `--update-env` Flag ist **erforderlich**
- Ohne dieses Flag werden neue `.env` Werte **NICHT** geladen

---

### Schritt 2: Verifikation

**Prüfe ob Connection Pool jetzt auf 30 ist:**

```bash
# Warte 5-10 Sekunden, dann prüfe Logs
pm2 logs intranet-backend --lines 50 --nostream | grep -i "connection_limit\|connection pool" | tail -10
```

**Erwartetes Ergebnis:**
- **KEINE** "connection_limit: 20" mehr in neuen Logs
- Neue Logs sollten "connection_limit: 30" zeigen (falls Prisma das loggt)

**Prüfe ob noch Connection Pool Timeouts auftreten:**

```bash
pm2 logs intranet-backend --lines 100 --nostream | grep -i "timed out fetching a new connection" | tail -10
```

**Erwartetes Ergebnis:**
- **KEINE** neuen "Timed out fetching a new connection" Fehler mehr
- Alte Fehler (vor dem Neustart) können noch in den Logs sein, aber keine neuen

---

## 🔍 WARUM PASSIERT DAS?

**PM2 lädt Environment-Variablen nur beim Start:**
- Beim ersten `pm2 start` werden `.env` Werte geladen
- Bei `pm2 restart` werden `.env` Werte **NICHT neu geladen**
- `--update-env` Flag erzwingt Neuladen der `.env` Datei

---

## 📋 ZUSAMMENFASSUNG

### ✅ Was zu tun ist:

1. **PM2 mit --update-env neu starten:**
   ```bash
   pm2 restart intranet-backend --update-env
   ```

2. **Verifikation:**
   - Prüfe ob noch Connection Pool Timeouts auftreten
   - System sollte jetzt schneller sein

---

**Erstellt:** 2025-01-26  
**Status:** ⚠️ WICHTIG - PM2 lädt .env Änderungen nicht automatisch!  
**Nächster Schritt:** PM2 mit --update-env neu starten


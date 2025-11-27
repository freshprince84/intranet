# Notfall-Diagnose: System-Fehler (2025-01-26)

**Status:** 🔴 KRITISCH - Viele 500-Fehler und Timeouts  
**Problem:** Datenbank scheint nicht erreichbar zu sein

---

## 🔍 SOFORT-PRÜFUNGEN

### 1. PostgreSQL läuft?

```bash
systemctl status postgresql
```

**Erwartet:** `Active: active (running)`

**Wenn nicht aktiv:**
```bash
sudo systemctl start postgresql
```

---

### 2. Server-Logs prüfen

```bash
pm2 logs intranet-backend --lines 100
```

**Was wir suchen:**
- "Can't reach database server"
- "Connection Pool Timeout"
- Prisma-Fehler
- Build-Fehler

**Bitte sende mir die letzten 50-100 Zeilen der Logs!**

---

### 3. Backend läuft?

```bash
pm2 status
```

**Erwartet:** `intranet-backend` Status: `online`

**Wenn nicht online:**
```bash
pm2 restart intranet-backend --update-env
pm2 logs intranet-backend --lines 50
```

---

### 4. Datenbank-Verbindung prüfen

```bash
cd /var/www/intranet/backend
npm run build
```

**Prüfen auf:**
- TypeScript-Fehler
- Build-Fehler

**Wenn Build fehlschlägt:** Fehlermeldung senden!

---

### 5. PostgreSQL-Verbindungen prüfen

```bash
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity WHERE state != 'idle';"
```

**Erwartet:** Zahl < 20 (Connection Pool Limit)

---

## 🔧 MÖGLICHE PROBLEME

### Problem 1: Datenbank läuft nicht

**Symptome:**
- Prisma-Fehler: "Can't reach database server"
- Alle API-Calls schlagen fehl (500)

**Lösung:**
```bash
sudo systemctl start postgresql
sudo systemctl status postgresql
```

---

### Problem 2: Backend-Build fehlgeschlagen

**Symptome:**
- TypeScript-Fehler
- Server startet nicht

**Lösung:**
```bash
cd /var/www/intranet/backend
npm run build
# Fehlermeldung senden!
```

---

### Problem 3: Connection Pool voll

**Symptome:**
- "Connection Pool Timeout"
- Viele Timeouts

**Lösung:**
```bash
# Server neu starten
pm2 restart intranet-backend --update-env

# Pool-Status prüfen
pm2 logs intranet-backend | grep "PoolMonitor"
```

---

### Problem 4: Neue Code-Änderungen haben Fehler

**Symptome:**
- TypeScript-Fehler im Build
- Runtime-Fehler in Logs

**Lösung:**
- Fehlermeldungen senden
- Ich behebe die Fehler

---

## 📋 BEFEHLE ZUM AUSFÜHREN (Reihenfolge)

**Führe diese Befehle nacheinander aus und sende mir die Ergebnisse:**

### Schritt 1: PostgreSQL-Status
```bash
systemctl status postgresql
```

### Schritt 2: PM2-Status
```bash
pm2 status
```

### Schritt 3: Backend-Logs
```bash
pm2 logs intranet-backend --lines 100
```

### Schritt 4: Backend-Build
```bash
cd /var/www/intranet/backend
npm run build
```

### Schritt 5: PostgreSQL-Verbindungen
```bash
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity WHERE state != 'idle';"
```

---

## 🚨 WICHTIG

**Bitte sende mir:**
1. ✅ Ausgabe von `systemctl status postgresql`
2. ✅ Ausgabe von `pm2 status`
3. ✅ Letzte 100 Zeilen von `pm2 logs intranet-backend`
4. ✅ Ausgabe von `npm run build` (falls Fehler)
5. ✅ Ausgabe von PostgreSQL-Verbindungen

**Dann kann ich das Problem identifizieren und beheben!**


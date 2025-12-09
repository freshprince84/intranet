# Server-Prozesse Analyse (2025-01-31)

**Datum:** 2025-01-31  
**Status:** 📊 ANALYSE ABGESCHLOSSEN  
**Zweck:** Analyse der laufenden Node.js-Prozesse und PM2-Konfiguration

---

## 📊 AKTUELLE SITUATION

### Laufende Node.js-Prozesse (aus `ps aux | grep node`):

1. **PID 70706/70707:** `node src/server.js` (seit Dec04)
   - **Status:** ❌ ALT - Sollte nicht mehr laufen
   - **RAM:** 0.5% (~23 MB)
   - **Problem:** Alte Datei, die nicht mehr existiert (`src/server.js` → sollte `dist/index.js` sein)

2. **PID 70715:** `prisma studio` (seit Dec04)
   - **Status:** ❌ SOLLTE NICHT DAUERHAFT LAUFEN
   - **RAM:** 0.6% (~25 MB)
   - **Problem:** Prisma Studio sollte nur bei Bedarf gestartet werden, nicht dauerhaft

3. **PID 276142:** `node /var/www/intranet/backend/dist/index.js` (seit 16:25)
   - **Status:** ✅ KORREKTER HAUPTPROZESS
   - **RAM:** 15.5% (~593 MB)
   - **CPU:** 28.6% (aktuell 0.3%)
   - **Laufzeit:** 24:37 CPU-Zeit
   - **Bewertung:** Normaler Memory-Verbrauch (erwartet: ~236-950 MB)

---

## 🔍 PROBLEM-ANALYSE

### Problem 1: Alte Prozesse laufen noch

**Gefundene Prozesse:**
- `node src/server.js` (PID 70706/70707) - **Seit Dec04**
- `prisma studio` (PID 70715) - **Seit Dec04**

**Ursache:**
- Diese Prozesse wurden vor Monaten gestartet und nie beendet
- `src/server.js` existiert nicht mehr (Server läuft über `dist/index.js`)

**Impact:**
- Unnötiger RAM-Verbrauch (~48 MB)
- Verwirrung bei der Prozessverwaltung
- Potenzielle Konflikte

---

### Problem 2: PM2-Konfiguration fehlt

**Aktueller Zustand:**
- Hauptprozess läuft **direkt** als `node dist/index.js` (nicht über PM2)
- Keine `ecosystem.config.js` im Repository
- PM2 wird in Dokumentation erwähnt, aber nicht verwendet

**Erwarteter Zustand (laut Dokumentation):**
- PM2 sollte verwendet werden für:
  - Automatische Neustarts bei Fehlern
  - Memory-Limits (`max_memory_restart: "1G"`)
  - Log-Management
  - Cluster-Mode (optional)

**Impact:**
- Kein automatischer Neustart bei Fehlern
- Keine Memory-Limits
- Keine zentrale Log-Verwaltung
- Keine automatische Wiederherstellung nach Server-Neustart

---

### Problem 3: Prisma Studio läuft dauerhaft

**Aktueller Zustand:**
- Prisma Studio läuft seit Dec04 (über 1 Monat)
- Wird nicht benötigt für Produktivbetrieb

**Impact:**
- Unnötiger RAM-Verbrauch (~25 MB)
- Potenzielle Sicherheitsrisiken (Datenbank-Explorer sollte nicht dauerhaft laufen)

---

## ✅ LÖSUNGSPLAN

### Schritt 1: Alte Prozesse beenden

**Auf dem Server ausführen:**

```bash
# 1. Prüfe welche Prozesse noch laufen
ps aux | grep node

# 2. Beende alte Prozesse (VORSICHT: Nur die alten, nicht den Hauptprozess!)
kill 70706 70707 70715

# 3. Prüfe ob Prozesse beendet wurden
ps aux | grep node
```

**Erwartetes Ergebnis:**
- Nur noch PID 276142 (`node /var/www/intranet/backend/dist/index.js`) läuft
- Alte Prozesse sind beendet

---

### Schritt 2: PM2-Konfiguration erstellen

**Datei erstellen:** `/var/www/intranet/backend/ecosystem.config.js`

```javascript
module.exports = {
  apps: [{
    name: "intranet-backend",
    script: "./dist/index.js",  // ✅ KORREKT: dist/index.js (nicht dist/src/server.js!)
    cwd: "/var/www/intranet/backend",
    env: {
      NODE_ENV: "production",
    },
    instances: 1,  // ✅ EINZELN: Cluster-Mode kann später aktiviert werden
    exec_mode: "fork",  // ✅ FORK: Nicht cluster (für jetzt)
    watch: false,
    max_memory_restart: "1G",  // ✅ MEMORY-LIMIT: Neustart bei 1GB
    log_date_format: "YYYY-MM-DD HH:mm:ss",
    error_file: "./logs/error.log",
    out_file: "./logs/out.log",
    merge_logs: true,
    autorestart: true,  // ✅ AUTO-RESTART: Bei Fehlern
    max_restarts: 10,  // ✅ MAX-RESTARTS: Verhindert Endlosschleife
    min_uptime: "10s",  // ✅ MIN-UPTIME: Mindestlaufzeit
  }]
};
```

**WICHTIG:**
- `script: "./dist/index.js"` (nicht `./dist/src/server.js` - das existiert nicht!)
- `cwd` muss auf `/var/www/intranet/backend` zeigen
- `logs/` Verzeichnis muss existieren

---

### Schritt 3: PM2 einrichten und Server migrieren

**Auf dem Server ausführen:**

```bash
# 1. Wechsle ins Backend-Verzeichnis
cd /var/www/intranet/backend

# 2. Erstelle logs-Verzeichnis (falls nicht vorhanden)
mkdir -p logs

# 3. Prüfe ob PM2 installiert ist
pm2 --version

# 4. Falls nicht installiert:
sudo npm install -g pm2

# 5. Stoppe aktuellen Prozess (PID 276142)
# WICHTIG: Nur wenn Server nicht kritisch läuft!
# Alternativ: Warte auf Wartungsfenster
kill 276142

# 6. Starte mit PM2
pm2 start ecosystem.config.js

# 7. Prüfe Status
pm2 status

# 8. Speichere PM2-Konfiguration
pm2 save

# 9. Konfiguriere Autostart (falls noch nicht gemacht)
pm2 startup
# → Befehl ausführen, der ausgegeben wird
```

**Erwartetes Ergebnis:**
- PM2 verwaltet den Server
- Status: `online`
- Memory: ~593 MB (normal)
- Logs werden in `logs/error.log` und `logs/out.log` geschrieben

---

### Schritt 4: Verifikation

**Prüfe PM2-Status:**

```bash
pm2 status
pm2 logs intranet-backend --lines 50 --nostream
```

**Prüfe ob alte Prozesse weg sind:**

```bash
ps aux | grep node | grep -v grep
```

**Erwartetes Ergebnis:**
- Nur noch PM2-Prozess läuft
- Keine alten Prozesse mehr
- Server funktioniert normal

---

## 📋 ZUSAMMENFASSUNG

### Aktuelle Situation:
- ✅ Hauptprozess läuft korrekt (PID 276142, ~593 MB RAM)
- ❌ Alte Prozesse laufen noch (PID 70706/70707/70715)
- ❌ PM2 wird nicht verwendet (Server läuft direkt)
- ❌ Prisma Studio läuft dauerhaft

### Empfohlene Aktionen:

1. **Sofort:**
   - Alte Prozesse beenden (PID 70706/70707/70715)
   - Prisma Studio beenden (PID 70715)

2. **Bei nächstem Wartungsfenster:**
   - PM2-Konfiguration erstellen (`ecosystem.config.js`)
   - Server auf PM2 migrieren
   - PM2 Autostart konfigurieren

3. **Optional:**
   - Cluster-Mode aktivieren (wenn mehr Performance benötigt)
   - Memory-Limits anpassen (aktuell 1GB)

---

## 🎯 ERWARTETE VERBESSERUNGEN

### Nach Bereinigung:
- **RAM-Einsparung:** ~48 MB (alte Prozesse)
- **Stabilität:** Automatische Neustarts bei Fehlern
- **Monitoring:** Zentrale Log-Verwaltung
- **Wartung:** Einfacheres Management über PM2

### Nach PM2-Migration:
- **Automatische Neustarts:** Bei Fehlern oder Memory-Limit
- **Log-Management:** Zentrale Logs in `logs/` Verzeichnis
- **Autostart:** Server startet automatisch nach Reboot
- **Monitoring:** `pm2 monit` für Live-Monitoring

---

**Erstellt:** 2025-01-31  
**Status:** 📊 ANALYSE ABGESCHLOSSEN  
**Nächste Schritte:** Alte Prozesse beenden, PM2-Konfiguration erstellen


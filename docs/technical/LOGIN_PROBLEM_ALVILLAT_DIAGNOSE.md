# Login-Problem Diagnose: alvillat (nur von ihren Geräten)

**Datum:** 2025-01-31  
**Problem:** Benutzerin `alvillat` kann sich nicht mehr einloggen - nur von ihren Geräten aus. Von anderen Geräten funktioniert es mit ihren Daten.  
**Fehlermeldung:** "Ein interner Serverfehler ist aufgetreten" (500)

---

## 🔌 SSH-VERBINDUNG ZUM SERVER

### Schritt 1: SSH-Verbindung herstellen

**Befehl:**
```bash
ssh -i ~/.ssh/intranet_rsa root@65.109.228.106
```

**Falls der SSH-Key woanders liegt:**
```bash
ssh -i /pfad/zum/key root@65.109.228.106
```

**Nach erfolgreicher Verbindung:**
- Du solltest eine Eingabeaufforderung sehen: `root@server:~#`
- Du bist jetzt auf dem Server

---

## 📊 DIAGNOSE-BEFEHLE (in dieser Reihenfolge ausführen)

### 1. PM2 Status prüfen

**Befehl:**
```bash
pm2 status
```

**Was prüfen:**
- Läuft `intranet-backend`?
- Wie viele Restarts?
- RAM/CPU-Verbrauch?

---

### 2. Server-Logs prüfen - Login-Fehler für alvillat

**Befehl 1: Letzte 500 Log-Zeilen mit Login-Fehlern**
```bash
pm2 logs intranet-backend --lines 500 --nostream | grep -iE "alvillat|login|error|fehler|500" | tail -100
```

**Befehl 2: Spezifisch nach alvillat suchen**
```bash
pm2 logs intranet-backend --lines 1000 --nostream | grep -i "alvillat" | tail -50
```

**Befehl 3: Alle 500-Fehler prüfen**
```bash
pm2 logs intranet-backend --lines 1000 --nostream | grep -iE "500|interner.*serverfehler" | tail -50
```

**Befehl 4: Login-Controller-Fehler prüfen**
```bash
pm2 logs intranet-backend --lines 1000 --nostream | grep -iE "\[LOGIN\]|authController" | tail -50
```

**Befehl 5: Vollständige Prisma-Fehler mit Details (WICHTIG!)**
```bash
cd /var/www/intranet/backend && pm2 logs intranet-backend --lines 2000 --nostream | grep -A 10 -B 5 "prisma:error\|PrismaClientKnownRequestError\|User 50" | tail -200
```

**Befehl 6: Connection Pool Probleme prüfen**
```bash
cd /var/www/intranet/backend && pm2 logs intranet-backend --lines 2000 --nostream | grep -iE "connection.*pool|pool.*full|Timed out fetching" | tail -50
```

**Was suchen:**
- `[LOGIN]` Fehlermeldungen
- Stack-Traces
- Datenbank-Fehler
- Prisma-Fehler (besonders `prisma:error` ohne Details)
- Connection Pool Timeouts
- Spezifische Fehler für User 50 (alvillat)

---

### 3. Datenbank prüfen - User alvillat

**Befehl 1: In Projektverzeichnis wechseln**
```bash
cd /var/www/intranet/backend
```

**Befehl 2: Prisma Studio starten (optional, für visuelle Prüfung)**
```bash
npx prisma studio
```
*(Hinweis: Prisma Studio läuft auf Port 5555, muss manuell gestoppt werden mit Ctrl+C)*

**Befehl 3: User-Daten direkt prüfen (via psql)**
```bash
sudo -u postgres psql -d intranet -c "SELECT id, username, email, \"profileComplete\", \"createdAt\" FROM \"User\" WHERE username ILIKE 'alvillat' OR email ILIKE 'alvillat';"
```

**Befehl 4: User-Rollen prüfen**
```bash
sudo -u postgres psql -d intranet -c "SELECT u.id, u.username, ur.id as user_role_id, ur.\"lastUsed\", r.id as role_id, r.name as role_name FROM \"User\" u LEFT JOIN \"UserRole\" ur ON u.id = ur.\"userId\" LEFT JOIN \"Role\" r ON ur.\"roleId\" = r.id WHERE u.username ILIKE 'alvillat';"
```

**Befehl 5: Prüfen ob User Rollen hat**
```bash
sudo -u postgres psql -d intranet -c "SELECT COUNT(*) as role_count FROM \"UserRole\" ur JOIN \"User\" u ON ur.\"userId\" = u.id WHERE u.username ILIKE 'alvillat';"
```

**Was prüfen:**
- Existiert der User?
- Hat der User Rollen?
- Gibt es eine aktive Rolle (lastUsed = true)?
- Ist profileComplete gesetzt?

---

### 4. Nginx-Logs prüfen - IP/User-Agent spezifische Probleme

**Befehl 1: Nginx Access-Logs prüfen**
```bash
tail -n 500 /var/log/nginx/access.log | grep -iE "alvillat|/api/auth/login" | tail -50
```

**Befehl 2: Nginx Error-Logs prüfen**
```bash
tail -n 500 /var/log/nginx/error.log | grep -iE "alvillat|/api/auth/login|500" | tail -50
```

**Befehl 3: Alle Login-Requests prüfen (letzte Stunde)**
```bash
grep "/api/auth/login" /var/log/nginx/access.log | tail -100
```

**Was prüfen:**
- Welche IP-Adressen versuchen Login?
- Welche User-Agents?
- Gibt es 500-Fehler in Nginx-Logs?
- Rate-Limiting aktiv?

---

### 5. CORS und Origin prüfen

**Befehl 1: Server-Logs nach CORS-Fehlern**
```bash
pm2 logs intranet-backend --lines 1000 --nostream | grep -iE "cors|origin.*not.*allowed" | tail -50
```

**Befehl 2: Prüfen welche Origins erlaubt sind (in app.ts/index.ts)**
```bash
cd /var/www/intranet/backend
grep -n "allowedOrigins\|origin" src/app.ts src/index.ts | head -20
```

**Was prüfen:**
- Wird der Origin von ihren Geräten blockiert?
- Gibt es CORS-Fehler in den Logs?

---

### 6. Speicher und Performance prüfen

**Befehl 1: Aktueller Memory-Verbrauch**
```bash
pm2 describe intranet-backend | grep -i "memory\|cpu"
```

**Befehl 2: System-weiter Memory-Verbrauch**
```bash
free -h
```

**Befehl 3: Prisma Connection Pool prüfen**
```bash
pm2 logs intranet-backend --lines 500 --nostream | grep -iE "prisma.*pool|connection.*pool|pool.*full" | tail -30
```

**Was prüfen:**
- Ist der Server überlastet?
- Gibt es Connection-Pool-Probleme?
- Memory-Probleme?

---

### 7. Live-Logs während Login-Versuch beobachten

**Befehl:**
```bash
pm2 logs intranet-backend --lines 0
```

**Anweisung:**
- Diesen Befehl ausführen
- **Dann** die Benutzerin bitten, einen Login-Versuch zu machen
- Logs in Echtzeit beobachten
- Nach dem Versuch: `Ctrl+C` zum Beenden

**Was beobachten:**
- Kommt der Request an?
- Welcher Fehler tritt auf?
- Stack-Trace?
- Datenbank-Fehler?

---

### 8. Datenbank-Verbindung testen

**Befehl 1: PostgreSQL-Verbindung direkt testen**
```bash
sudo -u postgres psql -d intranet -c "SELECT version();"
```

**Befehl 2: Prisma Client Status (optional)**
```bash
cd /var/www/intranet/backend
npx prisma db execute --stdin <<< "SELECT 1;"
```

**Was prüfen:**
- Funktioniert die Datenbank-Verbindung?
- Gibt es Connection-Probleme?

---

## 🔍 ANALYSE DER LOGS (basierend auf aktuellen Ergebnissen)

### ✅ Was funktioniert:
- **Login selbst funktioniert** - Zeile 931-932 zeigen erfolgreichen Login
- **User-Daten sind korrekt** - User 50 existiert, hat Rollen, profileComplete = true
- **Cache-Warming abgeschlossen** - Zeile 932 zeigt erfolgreiches Cache-Warming

### 🔴 Was nicht funktioniert:
- **Nachgelagerte Requests schlagen fehl** - Viele `prisma:error` Einträge (Zeilen 933-946)
- **Fehler betreffen User 50** - WorktimeCache, getLifecycleRoles, getUserById, etc.
- **Keine Fehlerdetails** - `prisma:error` ohne Stack-Trace oder Details

### 🎯 Vermutete Ursache:
Der Login funktioniert technisch, aber **nach dem Login schlagen viele nachgelagerte Requests fehl** (getCurrentUser, getLifecycle, etc.). Das Frontend interpretiert diese Fehler als "Login fehlgeschlagen" und zeigt "Ein interner Serverfehler ist aufgetreten".

**Mögliche Ursachen:**
1. **Connection Pool voll** - Prisma kann keine neuen Verbindungen bekommen
2. **Datenbank-Überlastung** - Zu viele gleichzeitige Requests
3. **Spezifisches Problem für User 50** - Fehler in nachgelagerten Queries für diesen User

---

## 🔍 SPEZIFISCHE PROBLEM-ANALYSE

### Mögliche Ursachen (basierend auf Symptomen):

1. **IP-basierte Blockierung**
   - Prüfe: Nginx-Logs nach IP-Adressen
   - Prüfe: Firewall-Regeln
   - Prüfe: Rate-Limiting

2. **User-Agent/Browser-spezifische Probleme**
   - Prüfe: Nginx-Logs nach User-Agent
   - Prüfe: CORS-Konfiguration

3. **Datenbank-Problem spezifisch für User**
   - Prüfe: User-Daten in Datenbank
   - Prüfe: Rollen-Zuweisung
   - Prüfe: ProfileComplete-Status

4. **Session/Cookie-Probleme**
   - Prüfe: Browser-Cookies
   - Prüfe: JWT-Token-Generierung

5. **Fehler in Login-Logik (nur bei bestimmten Bedingungen)**
   - Prüfe: Server-Logs für Stack-Traces
   - Prüfe: authController.ts Code

6. **CORS-Probleme**
   - Prüfe: Origin in CORS-Konfiguration
   - Prüfe: CORS-Fehler in Logs

---

## 📋 CHECKLISTE FÜR DIAGNOSE

- [ ] PM2 Status geprüft
- [ ] Server-Logs nach Login-Fehlern durchsucht
- [ ] User-Daten in Datenbank geprüft
- [ ] User-Rollen geprüft
- [ ] Nginx-Logs geprüft
- [ ] CORS-Konfiguration geprüft
- [ ] Live-Logs während Login-Versuch beobachtet
- [ ] Datenbank-Verbindung getestet
- [ ] Speicher/Performance geprüft

---

## 📝 WICHTIGE PFADE

- **Backend-Verzeichnis:** `/var/www/intranet/backend`
- **PM2-Logs:** `pm2 logs intranet-backend`
- **Nginx Access-Logs:** `/var/log/nginx/access.log`
- **Nginx Error-Logs:** `/var/log/nginx/error.log`
- **Backend-Logs (falls vorhanden):** `/var/www/intranet/backend/logs/`
- **.env-Datei:** `/var/www/intranet/backend/.env`

---

## 🔧 NÄCHSTE SCHRITTE NACH DIAGNOSE

1. **Logs hier posten** - Alle relevanten Log-Ausgaben hier posten
2. **Datenbank-Ergebnisse posten** - Ergebnisse der Datenbank-Abfragen posten
3. **Fehler identifizieren** - Basierend auf Logs und Datenbank-Ergebnissen
4. **Fix implementieren** - Lösung basierend auf identifiziertem Problem

---

## ✅ ROOT CAUSE IDENTIFIZIERT (2025-01-31)

**Problem:** PostgreSQL-Server ist intermittierend nicht erreichbar (`Can't reach database server at localhost:5432`)

**Siehe:** `docs/technical/LOGIN_PROBLEM_ALVILLAT_LOESUNG.md` für vollständige Lösung

---

## ⚠️ WICHTIGE HINWEISE

- **Server NICHT neu starten** ohne Absprache
- **Prisma Studio** manuell stoppen (Ctrl+C) wenn gestartet
- **Live-Logs** können sehr viel Output produzieren - nur kurz laufen lassen
- **Datenbank-Abfragen** können sensitive Daten enthalten - vorsichtig sein

---

## 📞 BEI PROBLEMEN

Falls Befehle nicht funktionieren:
1. Prüfe ob du im richtigen Verzeichnis bist: `pwd`
2. Prüfe ob PM2 installiert ist: `pm2 --version`
3. Prüfe ob Nginx läuft: `systemctl status nginx`
4. Prüfe ob PostgreSQL läuft: `systemctl status postgresql`


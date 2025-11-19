# Detaillierter Migrationsplan: app.ts → index.ts Refactoring

## Ziel

Refactoring der Backend-Struktur, um einen einheitlichen Standard zu etablieren:
- `backend/src/app.ts` → Express-App-Setup (Middleware, Routes, keine Server-Start-Logik)
- `backend/src/index.ts` → Server-Start (importiert app.ts, erstellt HTTP-Server, startet)

## Aktuelle Situation

### Was wird verwendet:
- ✅ `backend/src/index.ts` - Einstiegspunkt (package.json: `"dev": "nodemon src/index.ts"`)
- ✅ Exportiert: `server` (HTTP-Server-Instanz)

### Was existiert, aber nicht verwendet wird:
- ⚠️ `backend/src/app.ts` - Exportiert `app` (Express-App), wird NICHT importiert
- ⚠️ `backend/src/server.ts` - Importiert `app.ts`, wird NICHT verwendet

### Kritische Unterschiede zwischen index.ts und app.ts

#### Fehlende Funktionalität in index.ts (aus app.ts):
1. ❌ `emailReservationRoutes` - Route fehlt komplett
2. ❌ `EmailReservationScheduler.start()` - Scheduler wird nicht gestartet
3. ❌ Test-Route `/api/test-reservations` - fehlt
4. ❌ Test-Route `/api/admin/trigger-check-in-invitations` - fehlt
5. ⚠️ Debug-Logging für shiftRoutes - unterschiedlich (weniger detailliert)

#### Zusätzliche Funktionalität in index.ts:
1. ✅ `http` Import - für Server-Erstellung
2. ✅ Server-Start-Logik - komplett in index.ts
3. ✅ WebSocket-Setup - in index.ts
4. ✅ Graceful Shutdown - in index.ts

---

## Phase 1: Feature-Synchronisation (KRITISCH - vor Refactoring)

**Ziel:** Sicherstellen, dass `index.ts` alle Features von `app.ts` hat, bevor wir refactoren.

### Schritt 1.1: Email-Reservation-Route hinzufügen

**Datei:** `backend/src/index.ts`

**Aktion:**
1. Import hinzufügen (nach Zeile 39):
   ```typescript
   import emailReservationRoutes from './routes/emailReservations';
   ```

2. Route registrieren (nach Zeile 229, nach `/api/reservations`):
   ```typescript
   app.use('/api/reservations', reservationRoutes);
   // Email-Reservation-Integration
   app.use('/api/email-reservations', emailReservationRoutes);
   console.log('[App] /api/email-reservations Route registriert');
   ```

**Prüfpunkt:**
- [ ] Import hinzugefügt
- [ ] Route registriert
- [ ] Server startet ohne Fehler
- [ ] Route `/api/email-reservations/status` ist erreichbar (mit Auth)

---

### Schritt 1.2: EmailReservationScheduler starten

**Datei:** `backend/src/index.ts`

**Aktion:**
1. Import hinzufügen (nach Zeile 44):
   ```typescript
   import { EmailReservationScheduler } from './services/emailReservationScheduler';
   ```

2. Scheduler starten (nach Zeile 147, nach `ReservationScheduler.start()`):
   ```typescript
   // Starte Reservation Scheduler
   ReservationScheduler.start();

   // Starte Email-Reservation Scheduler
   EmailReservationScheduler.start();
   ```

**Prüfpunkt:**
- [ ] Import hinzugefügt
- [ ] Scheduler-Start hinzugefügt
- [ ] Server startet ohne Fehler
- [ ] Log zeigt: `[EmailReservationScheduler] Scheduler gestartet`

---

### Schritt 1.3: Test-Route `/api/test-reservations` hinzufügen

**Datei:** `backend/src/index.ts`

**Aktion:**
1. Test-Route hinzufügen (nach Zeile 162, nach `/api/test-route`):
   ```typescript
   // Test-Route für Reservierungen (vor authMiddleware)
   app.get('/api/test-reservations', (req: Request, res: Response) => {
     res.json({ 
       message: 'Test-Reservations-Route ist erreichbar',
       timestamp: new Date().toISOString(),
       reservationRoutesLoaded: typeof reservationRoutes !== 'undefined'
     });
   });
   ```

**Prüfpunkt:**
- [ ] Route hinzugefügt
- [ ] Server startet ohne Fehler
- [ ] Route `/api/test-reservations` ist erreichbar (GET, ohne Auth)

---

### Schritt 1.4: Test-Route `/api/admin/trigger-check-in-invitations` hinzufügen

**Datei:** `backend/src/index.ts`

**Aktion:**
1. Test-Route hinzufügen (nach Zeile 176, nach `/api/admin/trigger-monthly-reports`):
   ```typescript
   // Test-Route für manuelle Auslösung der Check-in-Einladungen
   app.post('/api/admin/trigger-check-in-invitations', async (req: Request, res: Response) => {
     try {
       await ReservationScheduler.triggerManually();
       res.json({ 
         success: true,
         message: 'Check-in-Einladungen erfolgreich versendet'
       });
     } catch (error) {
       console.error('Fehler beim manuellen Auslösen der Check-in-Einladungen:', error);
       res.status(500).json({ 
         success: false,
         message: 'Fehler beim Auslösen der Check-in-Einladungen',
         error: error instanceof Error ? error.message : 'Unbekannter Fehler'
       });
     }
   });
   ```

**Prüfpunkt:**
- [ ] Route hinzugefügt
- [ ] Server startet ohne Fehler
- [ ] Route `/api/admin/trigger-check-in-invitations` ist erreichbar (POST, ohne Auth)

---

### Schritt 1.5: Debug-Logging für shiftRoutes angleichen

**Datei:** `backend/src/index.ts`

**Aktion:**
1. Debug-Logging erweitern (Zeile 223):
   ```typescript
   // VORHER:
   app.use('/api/shifts', shiftRoutes);

   // NACHHER:
   app.use('/api/shifts', (req, res, next) => {
     console.log(`[App] 🎯 /api/shifts Route erreicht: ${req.method} ${req.path}`);
     next();
   }, shiftRoutes);
   ```

**Prüfpunkt:**
- [ ] Debug-Logging hinzugefügt
- [ ] Server startet ohne Fehler
- [ ] Log zeigt Debug-Ausgaben bei `/api/shifts` Requests

---

### Schritt 1.6: Debug-Logging für reservations Route angleichen

**Datei:** `backend/src/index.ts`

**Aktion:**
1. Debug-Logging hinzufügen (vor Zeile 229):
   ```typescript
   // Reservierungen (manuelle Erstellung) - MUSS nach lobby-pms kommen
   console.log('[App] Registriere /api/reservations Route...');
   console.log('[App] reservationRoutes:', reservationRoutes ? 'geladen' : 'FEHLT!');
   app.use('/api/reservations', (req, res, next) => {
     console.log(`[App] Reservations Route aufgerufen: ${req.method} ${req.path}`);
     next();
   }, reservationRoutes);
   console.log('[App] /api/reservations Route registriert');
   ```

**Prüfpunkt:**
- [ ] Debug-Logging hinzugefügt
- [ ] Server startet ohne Fehler
- [ ] Log zeigt Debug-Ausgaben bei `/api/reservations` Requests

---

### Schritt 1.7: Debug-Logging für shiftRoutes am Anfang hinzufügen

**Datei:** `backend/src/index.ts`

**Aktion:**
1. Debug-Logging am Anfang hinzufügen (nach Zeile 47, nach `const app = express();`):
   ```typescript
   const app = express();

   console.log('[App] ⚠️ App erstellt, shiftRoutes Type:', typeof shiftRoutes);
   console.log('[App] ⚠️ shiftRoutes vorhanden:', !!shiftRoutes);
   ```

**Prüfpunkt:**
- [ ] Debug-Logging hinzugefügt
- [ ] Server startet ohne Fehler
- [ ] Log zeigt Debug-Ausgaben beim Server-Start

---

### Schritt 1.8: Vollständige Funktionsprüfung

**Aktion:**
1. Server neu starten (vom Benutzer)
2. Alle Features testen:
   - [ ] `/api/email-reservations/status` funktioniert
   - [ ] EmailReservationScheduler läuft (Log prüfen)
   - [ ] `/api/test-reservations` funktioniert
   - [ ] `/api/admin/trigger-check-in-invitations` funktioniert
   - [ ] Alle anderen Routes funktionieren wie vorher

**Prüfpunkt:**
- [ ] Alle Features funktionieren
- [ ] Keine Regressionen
- [ ] Server läuft stabil

---

## Phase 2: Refactoring (app.ts → Express-App, index.ts → Server-Start)

**Ziel:** Trennung von Express-App-Setup und Server-Start-Logik.

### Schritt 2.1: app.ts bereinigen - Server-Start-Logik entfernen

**Datei:** `backend/src/app.ts`

**Aktion:**
1. Alle Server-Start-bezogenen Imports entfernen:
   - ❌ `import http from 'http';` (falls vorhanden) - NICHT entfernen, da nicht vorhanden
   - ✅ Behalten: Alle Route-Imports
   - ✅ Behalten: Alle Service-Imports
   - ✅ Behalten: Alle Middleware-Imports

2. Alle Server-Start-Logik entfernen (ab Zeile 241 in aktueller index.ts):
   - ❌ `const PORT = process.env.PORT || 5000;`
   - ❌ `const server = http.createServer(app);`
   - ❌ `claudeConsoleService.setupWebSocketServer(server);`
   - ❌ `server.listen(...)`
   - ❌ Graceful Shutdown Handler (`process.on('SIGTERM'/'SIGINT')`)

3. Export beibehalten:
   ```typescript
   export default app;
   ```

**Prüfpunkt:**
- [ ] app.ts enthält nur Express-App-Setup
- [ ] Keine Server-Start-Logik mehr
- [ ] Export `app` bleibt erhalten
- [ ] TypeScript kompiliert ohne Fehler

---

### Schritt 2.2: index.ts refactoren - app.ts importieren

**Datei:** `backend/src/index.ts`

**Aktion:**
1. Alle Express-App-Setup-Code entfernen (Zeilen 7-239):
   - ❌ Alle Route-Imports (werden in app.ts gemacht)
   - ❌ `const app = express();`
   - ❌ Alle Middleware-Setup
   - ❌ Alle Route-Registrierungen
   - ❌ Alle Timer/Scheduler-Start (außer Server-spezifischen)

2. app.ts importieren (am Anfang):
   ```typescript
   import dotenv from 'dotenv';
   import path from 'path';
   
   // Lade Environment-Variablen aus .env Datei
   dotenv.config({ path: path.join(__dirname, '../.env') });
   
   import http from 'http';
   import app from './app';
   import { getClaudeConsoleService } from './services/claudeConsoleService';
   import { stopWorkers } from './queues';
   ```

3. Server-Start-Logik beibehalten (ab Zeile 241):
   ```typescript
   // HTTP-Server mit WebSocket-Support erstellen
   const PORT = process.env.PORT || 5000;
   const server = http.createServer(app);
   
   // Claude Console WebSocket-Service integrieren
   const claudeConsoleService = getClaudeConsoleService();
   claudeConsoleService.setupWebSocketServer(server);
   
   // Server starten
   server.listen(PORT, () => {
     console.log(`🚀 Server läuft auf Port ${PORT}`);
     console.log(`📊 Database verfügbar`);
     console.log(`🔍 Claude API verfügbar unter /api/claude/`);
     console.log(`🖥️ Claude Console WebSocket verfügbar unter ws://localhost:${PORT}/ws/claude-console`);
   }).on('error', (err: NodeJS.ErrnoException) => {
     if (err.code === 'EADDRINUSE') {
       console.error(`\n❌ FEHLER: Port ${PORT} ist bereits belegt!`);
       console.error(`\n📋 Lösungsvorschläge:`);
       console.error(`   1. Beenden Sie den bereits laufenden Prozess auf Port ${PORT}`);
       console.error(`   2. Unter Windows: netstat -ano | findstr :${PORT}`);
       console.error(`   3. Oder verwenden Sie einen anderen Port: PORT=5001 npm run dev`);
       console.error(`\n💡 Falls der Server bereits läuft, müssen Sie ihn nicht neu starten.\n`);
       process.exit(1);
     } else {
       console.error(`\n❌ FEHLER beim Starten des Servers:`, err);
       process.exit(1);
     }
   });
   
   // Graceful Shutdown
   process.on('SIGTERM', async () => {
     console.log('SIGTERM signal empfangen. Server wird heruntergefahren...');
     await stopWorkers();
     server.close(() => {
       console.log('Server erfolgreich heruntergefahren.');
       process.exit(0);
     });
   });
   
   process.on('SIGINT', async () => {
     console.log('SIGINT signal empfangen. Server wird heruntergefahren...');
     await stopWorkers();
     server.close(() => {
       console.log('Server erfolgreich heruntergefahren.');
       process.exit(0);
     });
   });
   
   export default server;
   ```

**Prüfpunkt:**
- [ ] index.ts importiert app.ts
- [ ] index.ts enthält nur Server-Start-Logik
- [ ] Keine Route-Imports mehr in index.ts
- [ ] TypeScript kompiliert ohne Fehler

---

### Schritt 2.3: Scheduler-Start in app.ts verschieben

**Problem:** Scheduler müssen beim App-Start laufen, nicht beim Server-Start.

**Datei:** `backend/src/app.ts`

**Aktion:**
1. Scheduler-Start beibehalten (sollten in app.ts bleiben, da sie zur App gehören):
   ```typescript
   // Starte Reservation Scheduler
   ReservationScheduler.start();
   
   // Starte Email-Reservation Scheduler
   EmailReservationScheduler.start();
   
   // Starte Queue Workers (wenn aktiviert)
   startWorkers().catch((error) => {
     console.error('[App] Fehler beim Starten der Queue Workers:', error);
     // Server startet trotzdem, aber Queue funktioniert nicht
   });
   ```

**Prüfpunkt:**
- [ ] Scheduler-Start bleibt in app.ts
- [ ] Scheduler starten beim Import von app.ts

---

### Schritt 2.4: Timer in app.ts verschieben

**Problem:** Timer gehören zur App-Logik, nicht zur Server-Start-Logik.

**Datei:** `backend/src/app.ts`

**Aktion:**
1. Timer beibehalten (sollten in app.ts bleiben):
   ```typescript
   // Timer für die regelmäßige Überprüfung der Arbeitszeiten (alle 2 Minuten)
   const CHECK_INTERVAL_MS = 2 * 60 * 1000; // 2 Minuten
   setInterval(async () => {
     console.log('Starte automatische Überprüfung der Arbeitszeiten...');
     await checkAndStopExceededWorktimes();
   }, CHECK_INTERVAL_MS);
   
   // Timer für die tägliche Überprüfung der Monatsabrechnungen (alle 10 Minuten)
   // ...
   ```

**Prüfpunkt:**
- [ ] Timer bleiben in app.ts
- [ ] Timer starten beim Import von app.ts

---

### Schritt 2.5: Build-Verzeichnis löschen

**Aktion:**
1. `backend/dist/` Verzeichnis löschen:
   ```bash
   rm -rf backend/dist/
   ```

2. Neu kompilieren:
   ```bash
   cd backend
   npm run build
   ```

**Prüfpunkt:**
- [ ] dist/ Verzeichnis gelöscht
- [ ] Neu kompiliert ohne Fehler
- [ ] dist/index.js importiert dist/app.js korrekt

---

### Schritt 2.6: Server testen

**Aktion:**
1. Server neu starten (vom Benutzer)
2. Alle Features testen:
   - [ ] Server startet ohne Fehler
   - [ ] Alle Routes funktionieren
   - [ ] WebSocket funktioniert
   - [ ] Scheduler laufen
   - [ ] Timer laufen
   - [ ] Graceful Shutdown funktioniert

**Prüfpunkt:**
- [ ] Alle Features funktionieren
- [ ] Keine Regressionen
- [ ] Server läuft stabil

---

## Phase 3: server.ts entfernen (optional)

**Ziel:** Alte, nicht verwendete Datei entfernen.

### Schritt 3.1: Prüfen, ob server.ts verwendet wird

**Aktion:**
1. Prüfen, ob `server.ts` irgendwo importiert wird:
   ```bash
   grep -r "from.*server" backend/src
   grep -r "require.*server" backend/src
   ```

2. Prüfen, ob `server.ts` in package.json referenziert wird:
   ```bash
   grep -i "server" backend/package.json
   ```

**Prüfpunkt:**
- [ ] server.ts wird nirgendwo verwendet
- [ ] server.ts ist nicht in package.json

---

### Schritt 3.2: server.ts löschen

**Aktion:**
1. Datei löschen:
   ```bash
   rm backend/src/server.ts
   ```

**Prüfpunkt:**
- [ ] Datei gelöscht
- [ ] Keine Referenzen mehr vorhanden

---

## Phase 4: Dokumentation aktualisieren

**Ziel:** Alle Dokumentationsdateien auf neuen Standard aktualisieren.

### Schritt 4.1: Dokumentationsdateien identifizieren

**Gefundene Dateien mit app.ts/index.ts/server.ts Verweisen:**
1. `docs/technical/PAYROLL_COMPONENT_RESTORATION_PLAN.md` (Zeile 624)
2. `docs/implementation_plans/CONSULTATION_MODULE_IMPLEMENTATION_PART2.md` (Zeile 986)
3. `docs/implementation_plans/CONSULTATION_MODULE_IMPLEMENTATION.md`
4. `docs/implementation_plans/CONSULTATION_INVOICE_IMPLEMENTATION.md`
5. `docs/implementation_plans/MONTHLY_CONSULTATION_REPORT_IMPLEMENTATION.md`
6. `docs/implementation_plans/MULTI_TENANT_SAAS_IMPLEMENTATION.md`

### Schritt 4.2: Standard-Dokumentation aktualisieren

**Datei:** `docs/technical/ARCHITEKTUR.md`

**Aktion:**
1. Abschnitt "Backend-Server-Struktur" aktualisieren (Zeile 66-70):
   ```markdown
   ⚠️ **WICHTIG: Backend-Server-Struktur**
   - **Express-App**: `backend/src/app.ts` - Enthält Express-App-Setup (Middleware, Routes, Timer, Scheduler)
   - **Server-Start**: `backend/src/index.ts` - Importiert app.ts, erstellt HTTP-Server, startet Server
   - **Route-Registrierung**: Alle Routes werden in `backend/src/app.ts` registriert
   - **Server-Code**: Server-Start-Logik, WebSocket-Setup, Graceful Shutdown gehört in `index.ts`
   - **App-Code**: Middleware, Routes, Timer, Scheduler gehören in `app.ts`
   ```

**Prüfpunkt:**
- [ ] Dokumentation aktualisiert
- [ ] Standard klar definiert

---

### Schritt 4.3: Alle Dokumentationsdateien aktualisieren

**Aktion:**
Für jede Datei mit falschen Verweisen:

1. `app.ts` → `app.ts` (korrekt, bleibt)
2. `index.ts` → `index.ts` (korrekt, bleibt)
3. `server.ts` → `index.ts` (korrigieren)

**Dateien:**
- [ ] `docs/technical/PAYROLL_COMPONENT_RESTORATION_PLAN.md`
- [ ] `docs/implementation_plans/CONSULTATION_MODULE_IMPLEMENTATION_PART2.md`
- [ ] `docs/implementation_plans/CONSULTATION_MODULE_IMPLEMENTATION.md`
- [ ] `docs/implementation_plans/CONSULTATION_INVOICE_IMPLEMENTATION.md`
- [ ] `docs/implementation_plans/MONTHLY_CONSULTATION_REPORT_IMPLEMENTATION.md`
- [ ] `docs/implementation_plans/MULTI_TENANT_SAAS_IMPLEMENTATION.md`

**Prüfpunkt:**
- [ ] Alle Dateien aktualisiert
- [ ] Keine falschen Verweise mehr

---

### Schritt 4.4: file_classification.json aktualisieren

**Datei:** `docs/claude/metadata/file_classification.json`

**Aktion:**
1. Eintrag aktualisieren (Zeile 9):
   ```json
   {"path": "backend/src/app.ts", "module": "server", "description": "Express-App-Setup (Middleware, Routes, Timer, Scheduler)"},
   {"path": "backend/src/index.ts", "module": "server", "description": "Server-Start (importiert app.ts, erstellt HTTP-Server)"}
   ```

**Prüfpunkt:**
- [ ] file_classification.json aktualisiert
- [ ] Beschreibungen korrekt

---

## Phase 5: Verifikation und Abschluss

### Schritt 5.1: Vollständige Funktionsprüfung

**Aktion:**
1. Server neu starten (vom Benutzer)
2. Alle kritischen Features testen:
   - [ ] Login/Authentifizierung
   - [ ] Alle API-Routes
   - [ ] WebSocket-Verbindung
   - [ ] Email-Reservation-System
   - [ ] Reservation-Scheduler
   - [ ] Queue-Workers
   - [ ] Timer (Arbeitszeiten, Monatsabrechnungen)
   - [ ] Graceful Shutdown

**Prüfpunkt:**
- [ ] Alle Features funktionieren
- [ ] Keine Regressionen
- [ ] Server läuft stabil

---

### Schritt 5.2: Code-Review

**Aktion:**
1. Beide Dateien prüfen:
   - [ ] `app.ts` enthält nur Express-App-Setup
   - [ ] `index.ts` enthält nur Server-Start-Logik
   - [ ] Keine Code-Duplikation
   - [ ] Alle Imports korrekt

**Prüfpunkt:**
- [ ] Code-Struktur korrekt
- [ ] Keine Duplikationen

---

### Schritt 5.3: Dokumentation final prüfen

**Aktion:**
1. Alle Dokumentationsdateien nochmals prüfen:
   - [ ] Keine falschen Verweise mehr
   - [ ] Standard klar dokumentiert
   - [ ] Alle Implementierungspläne aktualisiert

**Prüfpunkt:**
- [ ] Dokumentation vollständig
- [ ] Keine Inkonsistenzen

---

## Rollback-Strategie

Falls etwas schief geht:

1. **Git-Status prüfen:**
   ```bash
   git status
   ```

2. **Änderungen zurücksetzen:**
   ```bash
   git checkout -- backend/src/app.ts
   git checkout -- backend/src/index.ts
   ```

3. **Oder zu vorherigem Commit:**
   ```bash
   git log --oneline -10
   git reset --hard <commit-hash>
   ```

---

## Risiken und Mitigation

| Risiko | Schweregrad | Mitigation |
|--------|-------------|------------|
| Email-Reservation funktioniert nicht | Hoch | Schritt 1.1 und 1.2 sorgfältig durchführen, testen |
| Scheduler starten nicht | Hoch | Schritt 2.3 sorgfältig prüfen, Logs kontrollieren |
| Routes funktionieren nicht | Hoch | Schritt 2.1 und 2.2 sorgfältig durchführen, alle Routes testen |
| WebSocket funktioniert nicht | Mittel | Schritt 2.2 prüfen, WebSocket-Setup testen |
| Dokumentation bleibt falsch | Mittel | Schritt 4 systematisch durchführen, alle Dateien prüfen |
| Build-Probleme | Niedrig | Schritt 2.5 durchführen, dist/ löschen |

---

## Checkliste für Durchführung

### Phase 1: Feature-Synchronisation
- [ ] Schritt 1.1: Email-Reservation-Route hinzufügen
- [ ] Schritt 1.2: EmailReservationScheduler starten
- [ ] Schritt 1.3: Test-Route `/api/test-reservations` hinzufügen
- [ ] Schritt 1.4: Test-Route `/api/admin/trigger-check-in-invitations` hinzufügen
- [ ] Schritt 1.5: Debug-Logging für shiftRoutes angleichen
- [ ] Schritt 1.6: Debug-Logging für reservations Route angleichen
- [ ] Schritt 1.7: Debug-Logging für shiftRoutes am Anfang hinzufügen
- [ ] Schritt 1.8: Vollständige Funktionsprüfung

### Phase 2: Refactoring
- [ ] Schritt 2.1: app.ts bereinigen - Server-Start-Logik entfernen
- [ ] Schritt 2.2: index.ts refactoren - app.ts importieren
- [ ] Schritt 2.3: Scheduler-Start in app.ts verschieben
- [ ] Schritt 2.4: Timer in app.ts verschieben
- [ ] Schritt 2.5: Build-Verzeichnis löschen
- [ ] Schritt 2.6: Server testen

### Phase 3: server.ts entfernen (optional)
- [ ] Schritt 3.1: Prüfen, ob server.ts verwendet wird
- [ ] Schritt 3.2: server.ts löschen

### Phase 4: Dokumentation
- [ ] Schritt 4.1: Dokumentationsdateien identifizieren
- [ ] Schritt 4.2: Standard-Dokumentation aktualisieren
- [ ] Schritt 4.3: Alle Dokumentationsdateien aktualisieren
- [ ] Schritt 4.4: file_classification.json aktualisieren

### Phase 5: Verifikation
- [ ] Schritt 5.1: Vollständige Funktionsprüfung
- [ ] Schritt 5.2: Code-Review
- [ ] Schritt 5.3: Dokumentation final prüfen

---

## Erfolgskriterien

✅ **Refactoring erfolgreich, wenn:**
1. `app.ts` enthält nur Express-App-Setup (Middleware, Routes, Timer, Scheduler)
2. `index.ts` importiert `app.ts` und enthält nur Server-Start-Logik
3. Alle Features funktionieren wie vorher (keine Regressionen)
4. Alle Dokumentationsdateien aktualisiert
5. Server läuft stabil
6. Keine Code-Duplikation mehr

---

## Nächste Schritte nach Refactoring

1. **Standard dokumentieren:**
   - In `ARCHITEKTUR.md` klar definieren
   - In `file_classification.json` aktualisieren

2. **Zukünftige Entwicklung:**
   - Neue Routes → immer in `app.ts` registrieren
   - Server-Start-Änderungen → immer in `index.ts`
   - Timer/Scheduler → immer in `app.ts`

3. **Dokumentation:**
   - Bei neuen Implementierungen immer `app.ts` verwenden
   - Nie mehr `index.ts` für Route-Registrierungen verwenden

---

**Erstellt:** 2025-01-XX
**Status:** Plan erstellt, wartet auf Genehmigung zur Umsetzung
**Verantwortlich:** Claude AI Assistant


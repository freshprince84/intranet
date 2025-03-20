# FEHLERBEHEBUNG

Diese Dokumentation enthält Informationen zu häufigen Fehlern und deren Lösungen im Intranet-System.

## Inhaltsverzeichnis

1. [Backend-Fehler](#backend-fehler)
   - [Modulabhängigkeiten](#modulabhängigkeiten)
   - [Datenbank-Fehler](#datenbank-fehler)
   - [Umgebungsvariablen](#umgebungsvariablen)
2. [Frontend-Fehler](#frontend-fehler)
   - [Build-Probleme](#build-probleme)
   - [API-Verbindungsprobleme](#api-verbindungsprobleme)
3. [Deployment-Fehler](#deployment-fehler)
   - [Server-Konfiguration](#server-konfiguration)
   - [PM2-Probleme](#pm2-probleme)
4. [Spezifische Moduleprobleme](#spezifische-moduleprobleme)
   - [Dokumentenerkennung](#dokumentenerkennung)
   - [Zeiterfassung](#zeiterfassung)
   - [Dateianhänge](#dateianhänge)

## Backend-Fehler

### Modulabhängigkeiten

#### Fehler: "Cannot find module 'modulname'"

**Symptom:** 
Der Server startet nicht und gibt einen Fehler aus wie:
```
Error: Cannot find module 'express-validator'
Require stack:
- /var/www/intranet/backend/dist/routes/documentRecognition.js
- /var/www/intranet/backend/dist/app.js
- /var/www/intranet/backend/dist/index.js
```

**Ursache:**
Eine benötigte NPM-Abhängigkeit wurde nicht installiert, aber im Code referenziert.

**Lösung:**
1. Installieren Sie das fehlende Modul:
   ```bash
   cd backend
   npm install express-validator  # oder den jeweiligen Modulnamen
   ```
2. Bauen Sie das Backend neu:
   ```bash
   npm run build
   ```
3. Starten Sie den Server neu:
   ```bash
   pm2 restart intranet-backend
   ```

**Hinweis:** Fügen Sie fehlende Abhängigkeiten auch zur `package.json` hinzu mit:
```bash
npm install express-validator --save
```

#### Fehler: Abhängigkeiten passen nicht zusammen

**Symptom:**
Fehler wie `TypeError: X is not a function` oder `Cannot read property 'Y' of undefined`

**Lösung:**
1. Überprüfen Sie die Versionen der Abhängigkeiten in `package.json`
2. Aktualisieren Sie auf kompatible Versionen:
   ```bash
   npm update
   ```
3. Bei größeren Inkompatibilitäten:
   ```bash
   rm -rf node_modules
   npm install
   ```

### Datenbank-Fehler

#### Fehler: Prisma kann keine Verbindung zur Datenbank herstellen

**Symptom:**
```
Error: P1001: Can't reach database server at `localhost`:`5432`
```

**Lösungen:**
1. Überprüfen Sie, ob PostgreSQL läuft:
   ```bash
   sudo systemctl status postgresql
   ```
2. Stellen Sie sicher, dass die Datenbank-URL in `.env` korrekt ist
3. Überprüfen Sie Firewall-Einstellungen:
   ```bash
   sudo ufw status
   ```

### Dateianhänge

#### Fehler: "Tabelle RequestAttachment existiert nicht"

**Symptom:**
In Prisma Studio erscheint die Fehlermeldung:
```
The table `(not available)` does not exist in the current database.
```

**Ursache:**
Das Prisma-Schema wurde aktualisiert, aber die Migration wurde nicht durchgeführt oder der Prisma Client wurde nicht neu generiert.

**Lösung:**
1. Führen Sie Prisma Generate aus, um den Client zu aktualisieren:
   ```bash
   cd backend
   npx prisma generate
   ```
2. Falls die Tabelle wirklich fehlt, erstellen Sie eine Migration:
   ```bash
   npx prisma migrate dev --name add_request_attachments
   ```
3. Oder nutzen Sie den direkten Push-Befehl (vorsichtig verwenden, wenn eine Migrations-Historie bereits existiert):
   ```bash
   npx prisma db push
   ```
4. Starten Sie den Server neu.

#### Fehler: "Fehler beim Hochladen der Datei"

**Symptom:**
Beim Versuch, eine Datei hochzuladen, erscheint die Meldung "Fehler beim Hochladen der Datei" oder der Upload scheint zu funktionieren, aber die Datei ist nicht verfügbar.

**Mögliche Ursachen und Lösungen:**

1. **Fehlende Upload-Verzeichnisse:**
   ```bash
   # Erstellen Sie die erforderlichen Verzeichnisse
   mkdir -p backend/uploads/task-attachments
   mkdir -p backend/uploads/request-attachments
   ```

2. **Berechtigungsprobleme:**
   ```bash
   # Berechtigungen für die Upload-Verzeichnisse setzen
   chmod 755 backend/uploads/task-attachments
   chmod 755 backend/uploads/request-attachments
   ```

3. **Datei zu groß:**
   - Standardmäßig gibt es ein Limit von 10MB pro Datei
   - Überprüfen Sie die Größenbeschränkung in der Multer-Konfiguration in `backend/src/routes/requests.ts`

#### Fehler: "Anhänge werden in Requests angezeigt, aber nicht im daraus erstellten Task"

**Symptom:**
Nach der Genehmigung eines Requests mit Anhängen fehlen die Anhänge im automatisch erstellten Task.

**Ursache:**
Die Anhangskopier-Funktion könnte fehlschlagen, möglicherweise aufgrund von Berechtigungsproblemen oder nicht existierenden Verzeichnissen.

**Lösung:**
1. Überprüfen Sie die Server-Logs auf Fehler bei `copyRequestAttachmentsToTask`
2. Stellen Sie sicher, dass beide Uploads-Verzeichnisse existieren und Schreibrechte besitzen
3. Überprüfen Sie, ob der Prisma Client korrekt generiert wurde mit den neuesten Schema-Änderungen

## Frontend-Fehler

### Build-Probleme

#### Fehler: TypeScript-Kompilierungsfehler

**Symptom:**
Build scheitert mit TypeScript-Fehlern

**Lösungen:**
1. Fehler im Code beheben
2. Falls es sich um Legacy-Code handelt, der funktionieren sollte:
   - Temporär `// @ts-ignore` vor die problematische Zeile setzen
   - Oder `any`-Typen verwenden, wo nötig

### API-Verbindungsprobleme

#### Fehler: 502 Bad Gateway

**Symptom:**
Frontend kann keine Verbindung zum Backend herstellen, 502-Fehler im Browser

**Mögliche Ursachen und Lösungen:**

1. **Backend-Server läuft nicht:**
   ```bash
   pm2 status
   # Bei Bedarf neu starten:
   pm2 restart intranet-backend
   ```

2. **Nginx-Konfigurationsprobleme:**
   ```bash
   sudo nginx -t
   # Bei Bedarf neu starten:
   sudo systemctl restart nginx
   ```

3. **CORS-Probleme:**
   - Überprüfen Sie die CORS-Konfiguration in `backend/src/app.ts`
   - Stellen Sie sicher, dass die richtigen Origins zugelassen sind

4. **Falsche API-URL im Frontend:**
   - Überprüfen Sie `frontend/src/config/api.ts`
   - Stellen Sie sicher, dass die API-URL zur Serverumgebung passt

## Deployment-Fehler

### Server-Konfiguration

#### Fehler: Nginx-Konfigurationsprobleme

**Symptom:**
Website nicht erreichbar oder 404/502 Fehler

**Lösungen:**
1. Überprüfen Sie die Nginx-Konfiguration:
   ```bash
   sudo nginx -t
   ```
2. Nginx-Error-Logs überprüfen:
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```
3. Korrigieren Sie die Konfiguration und starten Sie Nginx neu:
   ```bash
   sudo systemctl restart nginx
   ```

### PM2-Probleme

#### Fehler: PM2-Prozesse stürzen wiederholt ab

**Symptom:**
In `pm2 status` sieht man einen hohen Wert bei Neustarts

**Lösungen:**
1. PM2-Logs überprüfen:
   ```bash
   pm2 logs intranet-backend
   ```
2. Speicher- und CPU-Nutzung überprüfen:
   ```bash
   pm2 monit
   ```
3. Bei Speicherüberlastungen den Speicherlimit erhöhen:
   ```bash
   pm2 start backend/dist/index.js --name intranet-backend --max-memory-restart 300M
   ```

## Spezifische Moduleprobleme

### Dokumentenerkennung

#### Fehler: "Cannot find module 'express-validator'"

**Symptom:**
Server startet nicht und meldet fehlendes express-validator-Modul in document-recognition.js

**Lösung:**
1. Modul installieren:
   ```bash
   cd backend
   npm install express-validator
   ```
2. Server neu bauen und starten:
   ```bash
   npm run build
   pm2 restart intranet-backend
   ```

#### Fehler: Dokumentenerkennung funktioniert nicht

**Symptom:**
KI-basierte Dokumentenerkennung gibt keine oder unvollständige Ergebnisse zurück

**Lösungen:**
1. Überprüfen Sie den OpenAI API-Schlüssel in `.env`
2. Stellen Sie sicher, dass das richtige Modell verwendet wird (gpt-4o statt veraltetem gpt-4-vision-preview)
3. Überprüfen Sie die Bildqualität und -größe
4. Testen Sie, ob die OpenAI API erreichbar ist:
   ```bash
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer $OPENAI_API_KEY"
   ```

### Zeiterfassung

#### Fehler: Zeitzonenprobleme

**Symptom:**
Falsche Zeiten werden in der Arbeitszeiterfassung angezeigt

**Lösungen:**
1. Überprüfen Sie die Zeitzonenkonfiguration des Servers:
   ```bash
   timedatectl
   ```
2. Stellen Sie sicher, dass die Zeitzone in der Anwendung richtig eingestellt ist
3. Überprüfen Sie die Konvertierungsfunktionen in `frontend/src/utils/dateUtils.ts` 
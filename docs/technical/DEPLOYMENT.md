# DEPLOYMENT

Diese Dokumentation beschreibt den vollständigen Prozess für die Bereitstellung (Deployment) des Intranet-Systems in verschiedenen Umgebungen.

## Inhaltsverzeichnis

1. [Systemanforderungen](#systemanforderungen)
2. [Bereitstellungsoptionen](#bereitstellungsoptionen)
   - [Lokale Entwicklungsumgebung](#lokale-entwicklungsumgebung)
   - [Test-/Staging-Umgebung](#test-staging-umgebung)
   - [Produktionsumgebung](#produktionsumgebung)
3. [Vorbereitung](#vorbereitung)
   - [Quellcode-Verwaltung](#quellcode-verwaltung)
   - [Umgebungsvariablen](#umgebungsvariablen)
4. [Backend-Deployment](#backend-deployment)
   - [Node.js-Setup](#nodejs-setup)
   - [Datenbank-Setup](#datenbank-setup)
   - [Backend-Konfiguration](#backend-konfiguration)
   - [PM2 für Prozessverwaltung](#pm2-für-prozessverwaltung)
5. [Frontend-Deployment](#frontend-deployment)
   - [Build-Prozess](#build-prozess)
   - [Webserver-Konfiguration](#webserver-konfiguration)
6. [Docker-Deployment](#docker-deployment)
   - [Docker-Compose](#docker-compose)
   - [Container-Orchestrierung](#container-orchestrierung)
7. [CI/CD-Pipeline](#cicd-pipeline)
   - [Automatisierter Build](#automatisierter-build)
   - [Tests](#tests)
   - [Deployment-Automatisierung](#deployment-automatisierung)
8. [Backup-Strategie](#backup-strategie)
9. [Logging und Monitoring](#logging-und-monitoring)
10. [SSL/TLS-Konfiguration](#ssltls-konfiguration)
11. [Skalierung](#skalierung)
12. [Fehlerbehebung](#fehlerbehebung)

## Systemanforderungen

### Minimale Anforderungen

- **Server**: Linux-basiertes Betriebssystem (Ubuntu 20.04 LTS oder höher empfohlen)
- **CPU**: 2 Kerne
- **RAM**: 4 GB
- **Speicher**: 20 GB SSD
- **Netzwerk**: Stabile Internetverbindung

### Empfohlene Anforderungen

- **Server**: Linux-basiertes Betriebssystem (Ubuntu 20.04 LTS oder höher)
- **CPU**: 4 Kerne
- **RAM**: 8 GB
- **Speicher**: 50 GB SSD
- **Netzwerk**: Stabile Internetverbindung mit mindestens 10 Mbit/s

### Software-Anforderungen

- **Node.js**: v14.x oder höher
- **npm**: v6.x oder höher
- **PostgreSQL**: v13.x oder höher
- **Git**: Neueste Version
- **Docker** (optional): v20.x oder höher
- **Docker Compose** (optional): v1.29.x oder höher
- **Nginx**: Neueste Version als Reverse Proxy
- **PM2**: Neueste Version für Node.js-Prozessverwaltung

## Bereitstellungsoptionen

### Lokale Entwicklungsumgebung

Die lokale Entwicklungsumgebung dient zum Entwickeln und Testen von Änderungen, bevor sie in höhere Umgebungen übernommen werden.

**Setup-Schritte**:

1. Klonen des Repositorys
2. Installation der Abhängigkeiten
3. Einrichten der lokalen Datenbank
4. Starten des Backend- und Frontend-Dev-Servers

Detaillierte Anweisungen finden Sie in der [ENTWICKLUNGSUMGEBUNG.md](ENTWICKLUNGSUMGEBUNG.md).

### Test-/Staging-Umgebung

Die Test-/Staging-Umgebung spiegelt die Produktionsumgebung wider und dient zum Testen von Funktionalitäten vor dem Deployment in die Produktion.

**Empfohlenes Setup**:

- Dedizierter Server oder VM mit ähnlichen Ressourcen wie in der Produktion
- Separate Datenbank mit anonymisierten Produktionsdaten
- Identische Konfiguration wie in der Produktion

### Produktionsumgebung

Die Produktionsumgebung ist die Live-Umgebung für Endbenutzer.

**Empfohlenes Setup**:

- Dedizierter Server (physisch oder VM) mit ausreichenden Ressourcen
- Redundante Datenbank mit regelmäßigen Backups
- Load Balancer bei höherer Last
- SSL/TLS-Verschlüsselung
- Überwachungs- und Alarmsystem

## Vorbereitung

### Quellcode-Verwaltung

Das Projekt verwendet Git für die Quellcode-Verwaltung. Für das Deployment sollte ein stabiler Branch oder Tag verwendet werden.

```bash
# Repository klonen
git clone https://github.com/ihr-unternehmen/intranet.git

# In das Projektverzeichnis wechseln
cd intranet

# Auf den stabilen Branch oder Tag wechseln
git checkout main  # oder git checkout v1.0.0 für einen bestimmten Release
```

### Umgebungsvariablen

Das System verwendet Umgebungsvariablen für sensitive Konfigurationsdaten. Diese Variablen sind in der Datei `.env` definiert.

**Backend**:

Erstellen Sie eine `.env`-Datei im Backend-Verzeichnis mit den folgenden Variablen:

```
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/intranet?schema=public"

# Authentication
JWT_SECRET="your-secret-key"
JWT_EXPIRATION="24h"

# Server
PORT=5000
NODE_ENV=production

# File uploads
UPLOAD_DIR="uploads"
MAX_FILE_SIZE="10mb"

# Email (optional)
SMTP_HOST="smtp.example.com"
SMTP_PORT=587
SMTP_USER="no-reply@example.com"
SMTP_PASS="your-smtp-password"
```

**Frontend**:

Erstellen Sie eine `.env`-Datei im Frontend-Verzeichnis mit den folgenden Variablen:

```
REACT_APP_API_URL=http://your-domain.com:5000
REACT_APP_ENVIRONMENT=production
GENERATE_SOURCEMAP=false
```

Ersetzen Sie die Platzhalter durch Ihre tatsächlichen Werte.

## Backend-Deployment

### Node.js-Setup

1. Installieren Sie Node.js und npm:

```bash
curl -fsSL https://deb.nodesource.com/setup_14.x | sudo -E bash -
sudo apt install -y nodejs
```

2. Überprüfen Sie die Installation:

```bash
node -v
npm -v
```

### Datenbank-Setup

1. Installieren Sie PostgreSQL:

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

2. Erstellen Sie einen Datenbankbenutzer und eine Datenbank:

```bash
sudo -u postgres psql

postgres=# CREATE USER intranet_user WITH PASSWORD 'secure_password';
postgres=# CREATE DATABASE intranet;
postgres=# GRANT ALL PRIVILEGES ON DATABASE intranet TO intranet_user;
postgres=# \q
```

3. Konfigurieren Sie PostgreSQL für Remote-Zugriff (optional):

Bearbeiten Sie die Datei `/etc/postgresql/13/main/postgresql.conf`:

```
listen_addresses = '*'
```

Bearbeiten Sie die Datei `/etc/postgresql/13/main/pg_hba.conf`:

```
host    all             all             0.0.0.0/0            md5
```

Starten Sie PostgreSQL neu:

```bash
sudo systemctl restart postgresql
```

### Backend-Konfiguration

1. Wechseln Sie ins Backend-Verzeichnis:

```bash
cd /path/to/intranet/backend
```

2. Installieren Sie die Abhängigkeiten:

```bash
npm install --production
```

3. Stellen Sie sicher, dass ALLE erforderlichen Abhängigkeiten installiert sind, insbesondere:

```bash
# Erforderliche Abhängigkeiten für verschiedene Module
npm install express-validator # Für die Dokumentenerkennung
```

4. Überprüfen Sie die Installation mit einem Test-Start:

```bash
# Kurzer Test-Start um fehlende Abhängigkeiten zu erkennen
node dist/index.js
```

Falls Fehler wie `Cannot find module 'modul-name'` auftreten, installieren Sie die fehlenden Module:

```bash
npm install [fehlender-modul-name]
```

5. Erstellen Sie die Datenbankschemas mit Prisma:

```bash
npx prisma migrate deploy
```

6. Befüllen Sie die Datenbank mit den Seed-Daten:

```bash
npx prisma db seed
```

7. Kompilieren Sie das TypeScript-Backend:

```bash
npm run build
```

### PM2 für Prozessverwaltung

1. Installieren Sie PM2 global:

```bash
sudo npm install -g pm2
```

2. Erstellen Sie eine PM2-Konfigurationsdatei `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: "intranet-backend",
    script: "./dist/src/server.js",
    env: {
      NODE_ENV: "production",
    },
    instances: "max",
    exec_mode: "cluster",
    watch: false,
    max_memory_restart: "1G",
    log_date_format: "YYYY-MM-DD HH:mm:ss",
    error_file: "logs/error.log",
    out_file: "logs/out.log",
    merge_logs: true,
  }]
};
```

3. Starten Sie den Backend-Server mit PM2:

```bash
pm2 start ecosystem.config.js
```

4. Konfigurieren Sie PM2 für den automatischen Start beim Systemstart:

```bash
pm2 startup
pm2 save
```

## Frontend-Deployment

### Build-Prozess

1. Wechseln Sie ins Frontend-Verzeichnis:

```bash
cd /path/to/intranet/frontend
```

2. Installieren Sie die Abhängigkeiten:

```bash
npm install
```

3. Erstellen Sie den Produktions-Build:

```bash
npm run build
```

Der Build-Prozess erstellt einen optimierten Build im Verzeichnis `build/`.

### Webserver-Konfiguration

#### Nginx als Reverse Proxy

1. Installieren Sie Nginx:

```bash
sudo apt update
sudo apt install nginx
```

2. Erstellen Sie eine Nginx-Konfigurationsdatei für Ihr Intranet:

```bash
sudo nano /etc/nginx/sites-available/intranet
```

3. Fügen Sie folgende Konfiguration hinzu:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /path/to/intranet/frontend/build;
        try_files $uri $uri/ /index.html;
        
        # Caching-Konfiguration
        expires 1d;
        add_header Cache-Control "public, max-age=86400";
        
        # Browser-Caching für statische Assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico)$ {
            expires 7d;
            add_header Cache-Control "public, max-age=604800";
        }
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Websocket-Verbindungen (falls verwendet)
    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

4. Aktivieren Sie die Konfiguration und starten Sie Nginx neu:

```bash
sudo ln -s /etc/nginx/sites-available/intranet /etc/nginx/sites-enabled/
sudo nginx -t  # Überprüfen Sie die Syntax
sudo systemctl restart nginx
```

## Docker-Deployment

### Docker-Compose

Für eine containerisierte Bereitstellung kann Docker-Compose verwendet werden.

1. Erstellen Sie eine `docker-compose.yml`-Datei im Hauptverzeichnis des Projekts:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:13
    container_name: intranet-postgres
    restart: always
    environment:
      POSTGRES_USER: intranet_user
      POSTGRES_PASSWORD: secure_password
      POSTGRES_DB: intranet
    volumes:
      - postgres-data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    networks:
      - intranet-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: intranet-backend
    restart: always
    depends_on:
      - postgres
    environment:
      DATABASE_URL: postgresql://intranet_user:secure_password@postgres:5432/intranet?schema=public
      JWT_SECRET: your-secret-key
      NODE_ENV: production
      PORT: 5000
    ports:
      - "5000:5000"
    volumes:
      - ./backend/uploads:/app/uploads
      - ./backend/logs:/app/logs
    networks:
      - intranet-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: intranet-frontend
    restart: always
    depends_on:
      - backend
    ports:
      - "80:80"
    networks:
      - intranet-network

networks:
  intranet-network:
    driver: bridge

volumes:
  postgres-data:
```

2. Erstellen Sie eine `Dockerfile` im Backend-Verzeichnis:

```Dockerfile
FROM node:14-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .
RUN npm run build

EXPOSE 5000

CMD ["node", "dist/src/server.js"]
```

3. Erstellen Sie eine `Dockerfile` im Frontend-Verzeichnis:

```Dockerfile
# Build-Stage
FROM node:14-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Produktions-Stage
FROM nginx:stable-alpine

COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

4. Erstellen Sie eine `nginx.conf` im Frontend-Verzeichnis:

```nginx
server {
    listen 80;
    
    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://backend:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

5. Starten Sie die Container:

```bash
docker-compose up -d
```

### Container-Orchestrierung

Für größere Deployments oder bei Bedarf an automatisierter Skalierung und Fehlerbehebung können Sie Container-Orchestrierungstools wie Kubernetes oder Docker Swarm verwenden. Die Konfiguration dafür übersteigt den Rahmen dieses Dokuments.

## CI/CD-Pipeline

### Automatisierter Build

Sie können GitHub Actions, GitLab CI/CD oder Jenkins für automatisierte Builds einsetzen.

Beispiel für eine GitHub Actions-Konfiguration (`.github/workflows/ci.yml`):

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '14'
          
      - name: Install Backend Dependencies
        run: |
          cd backend
          npm install
          
      - name: Run Backend Tests
        run: |
          cd backend
          npm test
          
      - name: Install Frontend Dependencies
        run: |
          cd frontend
          npm install
          
      - name: Run Frontend Tests
        run: |
          cd frontend
          npm test
          
      - name: Build Backend
        run: |
          cd backend
          npm run build
          
      - name: Build Frontend
        run: |
          cd frontend
          npm run build
          
      - name: Archive Production Artifacts
        uses: actions/upload-artifact@v2
        with:
          name: build-artifacts
          path: |
            backend/dist
            frontend/build
```

### Deployment-Automatisierung

Für automatisiertes Deployment können Sie die CI/CD-Pipeline erweitern:

```yaml
  deploy:
    needs: build-and-test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    
    steps:
      - name: Download artifacts
        uses: actions/download-artifact@v2
        with:
          name: build-artifacts
          
      - name: Setup SSH
        uses: webfactory/ssh-agent@v0.5.3
        with:
          ssh-private-key: ${{ secrets.SSH_PRIVATE_KEY }}
          
      - name: Deploy to production
        run: |
          rsync -avz --delete backend/dist/ user@your-server.com:/path/to/intranet/backend/dist/
          rsync -avz --delete frontend/build/ user@your-server.com:/path/to/intranet/frontend/build/
          ssh user@your-server.com "cd /path/to/intranet/backend && pm2 restart intranet-backend"
```

## Backup-Strategie

### Datenbank-Backups

1. Erstellen Sie ein Backup-Skript:

```bash
#!/bin/bash
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/path/to/backup/directory"
FILENAME="intranet_backup_$TIMESTAMP.sql"

# Datenbank-Backup erstellen
pg_dump -U intranet_user -d intranet > "$BACKUP_DIR/$FILENAME"

# Komprimieren
gzip "$BACKUP_DIR/$FILENAME"

# Alte Backups aufräumen (optional, behält Backups der letzten 14 Tage)
find "$BACKUP_DIR" -name "intranet_backup_*.sql.gz" -type f -mtime +14 -delete
```

2. Machen Sie das Skript ausführbar und richten Sie einen Cron-Job ein:

```bash
chmod +x /path/to/backup_script.sh
```

```bash
# Crontab-Eintrag für tägliches Backup um 01:00 Uhr
0 1 * * * /path/to/backup_script.sh
```

### Dateibackups

Für Dateiuploads und andere wichtige Dateien erstellen Sie ein ähnliches Backup-Skript:

```bash
#!/bin/bash
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/path/to/backup/directory"
SOURCE_DIR="/path/to/intranet/backend/uploads"
FILENAME="uploads_backup_$TIMESTAMP.tar.gz"

# Datei-Backup erstellen und komprimieren
tar -czf "$BACKUP_DIR/$FILENAME" -C "$SOURCE_DIR" .

# Alte Backups aufräumen (optional)
find "$BACKUP_DIR" -name "uploads_backup_*.tar.gz" -type f -mtime +14 -delete
```

### Off-Site-Backups

Richten Sie regelmäßige Off-Site-Backups ein, um Daten gegen Hardwareausfälle oder Standortprobleme zu schützen:

```bash
#!/bin/bash
# Beispiel für rsync zu einem entfernten Server
rsync -avz /path/to/backup/directory/ user@backup-server.com:/path/to/remote/backup/
```

## Logging und Monitoring

### Logging

Das Backend ist mit Winston für strukturiertes Logging konfiguriert. Die Logs werden in der Produktionsumgebung in Dateien geschrieben.

Für erweiterte Logging-Funktionen können Sie ELK-Stack (Elasticsearch, Logstash, Kibana) oder ähnliche Lösungen implementieren.

### Monitoring

1. **PM2 Monitoring**:

```bash
pm2 monit
```

2. **Server-Monitoring**:

Installieren Sie Tools wie Prometheus und Grafana für umfassendes Monitoring.

3. **Uptime-Überwachung**:

Verwenden Sie Dienste wie UptimeRobot oder Pingdom, um die Verfügbarkeit zu überwachen.

## SSL/TLS-Konfiguration

### Let's Encrypt (kostenlos)

1. Installieren Sie Certbot:

```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx
```

2. Konfigurieren Sie SSL:

```bash
sudo certbot --nginx -d your-domain.com
```

3. Automatisieren Sie die Zertifikatserneuerung:

```bash
sudo systemctl status certbot.timer  # Überprüfen Sie, ob der Timer aktiv ist
```

### Nginx-Konfiguration für SSL

Aktualisieren Sie Ihre Nginx-Konfiguration:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # Optimierte SSL-Einstellungen
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # HSTS (optional)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Weitere Sicherheitsheader
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options SAMEORIGIN;
    add_header X-XSS-Protection "1; mode=block";
    
    # Rest der Konfiguration wie zuvor...
    location / {
        root /path/to/intranet/frontend/build;
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:5000;
        # Weitere Proxy-Einstellungen...
    }
}
```

## Skalierung

### Horizontale Skalierung

Für horizontale Skalierung können Sie mehrere Backend-Instanzen hinter einem Load Balancer betreiben:

1. Starten Sie mehrere Backend-Instanzen auf verschiedenen Ports:

```bash
# Instanz 1
PORT=5000 pm2 start dist/src/server.js --name="intranet-backend-1"

# Instanz 2
PORT=5001 pm2 start dist/src/server.js --name="intranet-backend-2"

# Weitere Instanzen...
```

2. Konfigurieren Sie Nginx als Load Balancer:

```nginx
upstream backend_servers {
    server localhost:5000;
    server localhost:5001;
    # Weitere Server...
}

server {
    # SSL-Konfiguration...
    
    location /api {
        proxy_pass http://backend_servers;
        # Weitere Proxy-Einstellungen...
    }
}
```

### Datenbankoptimierung

Für bessere Datenbankleistung:

1. Optimieren Sie PostgreSQL für Ihre Hardware:

Bearbeiten Sie `/etc/postgresql/13/main/postgresql.conf`:

```
# Anpassen an verfügbaren RAM
shared_buffers = 1GB  # 25% des verfügbaren RAMs
work_mem = 50MB       # Abhängig von der Anzahl gleichzeitiger Verbindungen
maintenance_work_mem = 256MB
effective_cache_size = 3GB  # 75% des verfügbaren RAMs

# Checkpoint-Einstellungen
checkpoint_timeout = 15min
checkpoint_completion_target = 0.9

# WAL-Einstellungen
wal_buffers = 16MB

# Weitere Optimierungen
random_page_cost = 1.1  # Bei SSDs
effective_io_concurrency = 200  # Bei SSDs
```

2. Indexieren Sie häufig abgefragte Spalten.

## Fehlerbehebung

### Häufige Probleme und Lösungen

1. **Backend startet nicht**:
   - Überprüfen Sie die Logs: `pm2 logs intranet-backend`
   - Überprüfen Sie die Umgebungsvariablen
   - Stellen Sie sicher, dass die Datenbank erreichbar ist

2. **Frontend zeigt "Cannot connect to server"**:
   - Überprüfen Sie, ob der Backend-Server läuft
   - Überprüfen Sie die Nginx-Konfiguration für den Proxy-Pass
   - Überprüfen Sie die Frontend-Konfiguration (API_URL)

3. **Datenbank-Verbindungsfehler**:
   - Überprüfen Sie die PostgreSQL-Logs: `sudo tail -f /var/log/postgresql/postgresql-13-main.log`
   - Überprüfen Sie die Datenbank-Verbindungszeichenfolge
   - Stellen Sie sicher, dass der Datenbankbenutzer die richtigen Berechtigungen hat

4. **SSL-Zertifikatsfehler**:
   - Überprüfen Sie den Pfad zu den Zertifikatsdateien
   - Stellen Sie sicher, dass die Zertifikate nicht abgelaufen sind
   - Erneuern Sie die Zertifikate mit `sudo certbot renew`

### Support-Ressourcen

Bei anhaltenden Problemen:

1. Überprüfen Sie die Projektdokumentation
2. Kontaktieren Sie das Entwicklungsteam
3. Öffnen Sie ein Issue im GitHub-Repository

---

Diese Dokumentation bietet eine umfassende Anleitung zur Bereitstellung des Intranet-Systems in verschiedenen Umgebungen. Passen Sie die Anweisungen bei Bedarf an Ihre spezifische Infrastruktur und Anforderungen an.

## Deployment-Struktur
```
/var/www/intranet/
├── frontend/          # Frontend Build
├── backend/           # Backend Anwendung
│   └── public/       # Öffentliche Dateien
│       └── downloads/ # Download-Bereich (APK, etc.)
└── database/         # Datenbank-Dateien
```

### Downloads-Bereich
Der `/backend/public/downloads` Ordner enthält öffentlich zugängliche Dateien:
- `intranet-app.apk`: Die mobile Android-App
- `README.md`: Dokumentation für den Download-Bereich

#### Berechtigungen
```bash
# Verzeichnis-Berechtigungen
chown -R www-data:www-data /var/www/intranet/backend/public/downloads
chmod -R 755 /var/www/intranet/backend/public/downloads

# Datei-Berechtigungen
chmod 644 /var/www/intranet/backend/public/downloads/*.apk
chmod 644 /var/www/intranet/backend/public/downloads/*.md
```

#### Nginx-Konfiguration
Der Downloads-Bereich ist über den `/downloads` Pfad erreichbar:
```nginx
location /downloads {
    alias /var/www/intranet/backend/public/downloads;
    types {
        application/vnd.android.package-archive apk;
        text/plain md;
    }
    add_header Content-Disposition "attachment" always;
}
``` 









# Deployment Details

This document stores specific details required for deployment processes, such as building and uploading the mobile app.

## Mobile App (Android APK)

*   **Build Command (run in workspace root):**
    ```bash
    cd IntranetMobileApp/android && ./gradlew assembleRelease && cd ../..
    ```
*   **Generated APK Location (relative to workspace):**
    `IntranetMobileApp/android/app/build/outputs/apk/release/app-release.apk`
*   **Backend Storage Location (relative to workspace):**
    `backend/public/downloads/intranet-app.apk`
    *(Note: The filename `intranet-app.apk` is used for consistency)*
*   **Copy Command (run in workspace root):**
    ```bash
    cp IntranetMobileApp/android/app/build/outputs/apk/release/app-release.apk backend/public/downloads/intranet-app.apk
    ```

## Server Details for SCP

*   **Server IP Address:** `65.109.228.106`
*   **SSH/SCP User:** `root`
*   **SSH Key:** `~/.ssh/intranet_rsa` (as mentioned in `SERVER_UPDATE.md` for SSH connection)
*   **Target Directory for APK on Server:** `/var/www/intranet/backend/public/downloads/`
*   **Target Filename on Server:** `intranet-app.apk`
*   **SCP Upload Command (run in workspace root):**
    ```bash
    scp -i ~/.ssh/intranet_rsa backend/public/downloads/intranet-app.apk root@65.109.228.106:/var/www/intranet/backend/public/downloads/intranet-app.apk
    ```

# Hosting mehrerer Node.js-Anwendungen auf einem Hetzner Server

## Einrichtung und Deployment-Prozess

Dieses Dokument beschreibt den sauberen und effizienten Prozess, um mehrere Node.js-Anwendungen (mit Backend und Frontend) auf demselben Hetzner Server zu hosten.

## Inhaltsverzeichnis

1. [Architekturübersicht](#architekturübersicht)
2. [Verzeichnisstruktur](#verzeichnisstruktur)
3. [Grundeinrichtung für eine neue Anwendung](#grundeinrichtung-für-eine-neue-anwendung)
4. [Nginx-Konfiguration](#nginx-konfiguration)
5. [Backend-Konfiguration mit PM2](#backend-konfiguration-mit-pm2)
6. [Deployment-Workflow](#deployment-workflow)
7. [Automation mit Shell-Skripts](#automation-mit-shell-skripts)
8. [Sicherheit und Best Practices](#sicherheit-und-best-practices)

## Architekturübersicht

Die Hosting-Architektur besteht aus:
- **Nginx** als Reverse Proxy für alle Anwendungen
- **PM2** zur Verwaltung mehrerer Node.js-Prozesse
- Separate Verzeichnisstrukturen für jede Anwendung
- Domain/Subdomain-Routing pro Anwendung

```
                  ┌─────────────────┐
                  │     Internet    │
                  └────────┬────────┘
                           │
                  ┌────────▼────────┐
                  │      Nginx      │
                  │  (Reverse Proxy)│
                  └─┬──────┬────┬───┘
                    │      │    │
        ┌───────────▼┐  ┌──▼───▼───┐  ┌───▼────────┐
        │ Anwendung 1│  │Anwendung 2│  │Anwendung 3│
        │(app1.domain│  │(app2.domain  │(app3.domain
        │.de)        │  │.de)        │ │.de)        │
        └─────┬──────┘  └─────┬─────┘  └──────┬─────┘
              │                │              │
        ┌─────▼──────┐  ┌──────▼────┐  ┌──────▼─────┐
        │ PM2 Prozess│  │PM2 Prozess│  │PM2 Prozess │
        │ (Backend 1)│  │(Backend 2)│  │(Backend 3) │
        └────────────┘  └───────────┘  └────────────┘
```

## Verzeichnisstruktur

```
/var/www/
├── anwendung1/               # Deine aktuelle Intranet-Anwendung
│   ├── backend/
│   └── frontend/
├── anwendung2/               # Neue Anwendung
│   ├── backend/
│   └── frontend/
└── anwendung3/               # Zukünftige Anwendung
    ├── backend/
    └── frontend/
```

## Grundeinrichtung für eine neue Anwendung

### 1. Verzeichnisse erstellen

```bash
# Als Root oder mit sudo
mkdir -p /var/www/anwendung2/backend
mkdir -p /var/www/anwendung2/frontend
```

### 2. Berechtigungen setzen

```bash
# Setze den richtigen Benutzer und Gruppe
chown -R dein_benutzer:dein_benutzer /var/www/anwendung2
```

### 3. Git-Repository klonen

```bash
# Wechsle ins Verzeichnis
cd /var/www/anwendung2

# Klone das Repository
git clone https://github.com/dein-username/anwendung2-repo.git .

# Wenn das Repository bereits "backend" und "frontend" Ordner enthält,
# könnte folgende Struktur entstehen:
# /var/www/anwendung2/backend/ und /var/www/anwendung2/frontend/
```

## Nginx-Konfiguration

### 1. Neue Server-Block-Datei erstellen

```bash
sudo nano /etc/nginx/sites-available/anwendung2
```

### 2. Server-Block konfigurieren

```nginx
server {
    listen 80;
    server_name anwendung2.deine-domain.de;  # Domainname oder Subdomain

    # SSL-Konfiguration (optional, mit Let's Encrypt)
    # listen 443 ssl;
    # ssl_certificate /etc/letsencrypt/live/anwendung2.deine-domain.de/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/anwendung2.deine-domain.de/privkey.pem;

    # Weiterleitung von HTTP zu HTTPS (optional)
    # if ($scheme != "https") {
    #     return 301 https://$host$request_uri;
    # }

    # Root-Verzeichnis für statische Frontend-Dateien
    root /var/www/anwendung2/frontend/build;
    index index.html index.htm;

    # Zugriff auf statische Frontend-Dateien
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend-API Proxy
    location /api {
        proxy_pass http://127.0.0.1:5001;  # Port des Backend-Servers
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Zugriff auf Medien-Dateien (falls benötigt)
    location /uploads {
        alias /var/www/anwendung2/backend/uploads;
    }

    # Andere spezifische Konfigurationen...
}
```

### 3. Die Konfiguration aktivieren

```bash
sudo ln -s /etc/nginx/sites-available/anwendung2 /etc/nginx/sites-enabled/
sudo nginx -t  # Syntax-Test
sudo systemctl restart nginx
```

## Backend-Konfiguration mit PM2

### 1. Backend-Abhängigkeiten installieren

```bash
cd /var/www/anwendung2/backend
npm install
```

### 2. .env-Datei konfigurieren

```bash
# Falls noch nicht vorhanden
cp .env.example .env
nano .env

# Wichtig: Passe den Port an, damit er nicht mit anderen Anwendungen kollidiert
# z.B. PORT=5001
```

### 3. PM2-Konfiguration

```bash
# Starte das Backend mit PM2
pm2 start npm --name "anwendung2-backend" -- start

# Speichere die PM2-Konfiguration
pm2 save

# Stelle sicher, dass PM2 beim Systemstart startet
pm2 startup
```

### 4. Frontend bauen

```bash
cd /var/www/anwendung2/frontend
npm install
npm run build
```

## Deployment-Workflow

Für zukünftige Updates der Anwendung:

### 1. Code-Aktualisierung

```bash
cd /var/www/anwendung2
git pull
```

### 2. Backend aktualisieren

```bash
cd /var/www/anwendung2/backend
npm install  # Falls neue Abhängigkeiten hinzugekommen sind
pm2 restart anwendung2-backend
```

### 3. Frontend aktualisieren

```bash
cd /var/www/anwendung2/frontend
npm install  # Falls neue Abhängigkeiten hinzugekommen sind
npm run build
```

## Automation mit Shell-Skripts

Erstelle ein Deployment-Skript (`deploy-anwendung2.sh`):

```bash
#!/bin/bash
# Deployment-Skript für Anwendung 2

echo "Starte Deployment für Anwendung 2..."

# Ins Anwendungsverzeichnis wechseln
cd /var/www/anwendung2

# Git-Updates holen
echo "Hole Code-Updates..."
git pull

# Backend aktualisieren
echo "Aktualisiere Backend..."
cd /var/www/anwendung2/backend
npm install
# Falls du DB-Migrationen durchführen musst
# npm run migrate

# Frontend aktualisieren
echo "Aktualisiere Frontend..."
cd /var/www/anwendung2/frontend
npm install
npm run build

# Backend neu starten
echo "Starte Backend neu..."
pm2 restart anwendung2-backend

echo "Deployment abgeschlossen!"
```

Mache das Skript ausführbar:

```bash
chmod +x deploy-anwendung2.sh
```

## Sicherheit und Best Practices

### 1. Port-Verwaltung

Verwende unterschiedliche Ports für verschiedene Backend-Anwendungen:
- Anwendung 1: 5000
- Anwendung 2: 5001
- Anwendung 3: 5002
usw.

### 2. Firewall-Konfiguration

Öffne nur die notwendigen Ports in der Firewall:

```bash
sudo ufw allow 80
sudo ufw allow 443
# Für SSH
sudo ufw allow 22
```

### 3. Regelmäßige Backups

Erstelle ein Backup-Skript für alle Anwendungen:

```bash
#!/bin/bash
# Backup-Skript für alle Anwendungen

DATE=$(date +%Y-%m-%d)
BACKUP_DIR=/backup

# Stelle sicher, dass das Backup-Verzeichnis existiert
mkdir -p $BACKUP_DIR

# Für jede Anwendung ein Backup erstellen
for APP in anwendung1 anwendung2 anwendung3; do
  if [ -d "/var/www/$APP" ]; then
    echo "Erstelle Backup für $APP..."
    tar -czf $BACKUP_DIR/$APP-$DATE.tar.gz /var/www/$APP
  fi
done

# Optional: Alte Backups löschen (z.B. älter als 30 Tage)
find $BACKUP_DIR -name "*.tar.gz" -type f -mtime +30 -delete

echo "Backup abgeschlossen!"
```

### 4. Monitoring

Überwache alle Anwendungen mit PM2:

```bash
pm2 monit
```

Oder mit PM2 Plus (Online-Dashboard):

```bash
pm2 plus
```

## Template für neue Anwendungen

Für jede weitere Anwendung:

1. Erstelle eine neue Server-Block-Datei in `/etc/nginx/sites-available/`
2. Aktualisiere den Port in der Nginx-Konfiguration
3. Erstelle ein PM2-Prozess mit einem eindeutigen Namen
4. Erstelle ein Deployment-Skript

Mit diesem Ansatz kannst du beliebig viele Node.js-Anwendungen auf demselben Server hosten, wobei jede ihre eigene Domain/Subdomain, Port und PM2-Prozess hat. 
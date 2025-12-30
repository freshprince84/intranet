#!/bin/bash

# Installationsskript für das Intranet-Projekt auf AWS (Ubuntu)
# Voraussetzung: Frische Ubuntu-Instanz mit SSH-Zugang

# Farben für Ausgaben
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starte Installation des Intranet-Projekts...${NC}"

# 1. System aktualisieren und Grundpakete installieren
echo -e "${YELLOW}Aktualisiere Paketlisten und installiere Grundpakete...${NC}"
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl build-essential

# 2. Node.js und npm installieren (v18)
echo -e "${YELLOW}Installiere Node.js v18 und npm...${NC}"
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node -v || { echo -e "${RED}Node.js Installation fehlgeschlagen${NC}"; exit 1; }
npm -v || { echo -e "${RED}npm Installation fehlgeschlagen${NC}"; exit 1; }
echo -e "${GREEN}Node.js $(node -v) und npm $(npm -v) erfolgreich installiert${NC}"

# 3. PostgreSQL installieren
echo -e "${YELLOW}Installiere PostgreSQL...${NC}"
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
if ! sudo systemctl status postgresql | grep "active (running)"; then
    echo -e "${RED}PostgreSQL läuft nicht${NC}"
    exit 1
fi
echo -e "${GREEN}PostgreSQL erfolgreich installiert und gestartet${NC}"

# 4. PostgreSQL konfigurieren (Benutzer: postgres, Passwort: Postgres123!, DB: intranet)
echo -e "${YELLOW}Konfiguriere PostgreSQL...${NC}"

# PostgreSQL-Version ermitteln
PG_VERSION=$(psql --version | grep -oP '\d+' | head -1)
echo -e "${GREEN}PostgreSQL Version ${PG_VERSION} erkannt${NC}"

# PostgreSQL-Authentifizierung auf md5 setzen
if [ -f "/etc/postgresql/${PG_VERSION}/main/pg_hba.conf" ]; then
    sudo sed -i 's/local   all             postgres                                peer/local   all             postgres                                md5/' /etc/postgresql/${PG_VERSION}/main/pg_hba.conf
    sudo systemctl restart postgresql
    echo -e "${GREEN}PostgreSQL-Authentifizierung auf md5 gesetzt${NC}"
else
    echo -e "${YELLOW}pg_hba.conf nicht gefunden. Überspringe Authentifizierungsänderung.${NC}"
fi

# Passwort setzen und Datenbank erstellen
sudo -u postgres psql -c "ALTER USER postgres WITH ENCRYPTED PASSWORD 'Postgres123!';" || { echo -e "${RED}Passwortänderung fehlgeschlagen${NC}"; exit 1; }
sudo -u postgres psql -c "CREATE DATABASE intranet;" 2>/dev/null || echo -e "${YELLOW}Datenbank 'intranet' existiert bereits oder konnte nicht erstellt werden${NC}"

# 5. SSH-Schlüssel für GitHub generieren (falls nicht vorhanden)
if [ ! -f ~/.ssh/id_rsa ]; then
    echo -e "${YELLOW}Generiere SSH-Schlüssel für GitHub...${NC}"
    ssh-keygen -t rsa -b 4096 -C "intranet-aws@example.com" -N "" -f ~/.ssh/id_rsa
    echo -e "${GREEN}Öffentlicher Schlüssel (füge ihn bei GitHub unter Settings > SSH and GPG keys hinzu):${NC}"
    cat ~/.ssh/id_rsa.pub
    echo -e "${YELLOW}Bitte kopiere den obigen Schlüssel und füge ihn bei GitHub hinzu. Drücke Enter, wenn fertig...${NC}"
    read -p ""
fi

# Prüfe, ob GitHub-Verbindung funktioniert
echo -e "${YELLOW}Teste SSH-Verbindung zu GitHub...${NC}"
if ! ssh -T git@github.com -o StrictHostKeyChecking=no 2>&1 | grep -q "success"; then
    echo -e "${RED}SSH-Verbindung zu GitHub fehlgeschlagen. Überprüfe den Schlüssel.${NC}"
    echo -e "${YELLOW}Alternativ: Möchtest du mit HTTPS statt SSH klonen? (j/n)${NC}"
    read -p "" use_https
    if [[ "$use_https" == "j" ]]; then
        USE_HTTPS=true
    else
        exit 1
    fi
else
    USE_HTTPS=false
    echo -e "${GREEN}SSH-Verbindung zu GitHub erfolgreich${NC}"
fi

# 6. Repository klonen
echo -e "${YELLOW}Klone das Repository...${NC}"
if [ "$USE_HTTPS" = true ]; then
    git clone https://github.com/freshprince84/intranet.git || { echo -e "${RED}Klonen fehlgeschlagen${NC}"; exit 1; }
else
    git clone git@github.com:freshprince84/intranet.git || { echo -e "${RED}Klonen fehlgeschlagen${NC}"; exit 1; }
fi
cd intranet || { echo -e "${RED}Verzeichniswechsel fehlgeschlagen${NC}"; exit 1; }
echo -e "${GREEN}Repository erfolgreich geklont${NC}"

# 7. Abhängigkeiten installieren
echo -e "${YELLOW}Installiere Projektabhängigkeiten...${NC}"
if [ -f "package.json" ]; then
    npm run install-all || { echo -e "${RED}Abhängigkeiten-Installation fehlgeschlagen${NC}"; exit 1; }
else
    echo -e "${RED}package.json nicht gefunden. Falsches Verzeichnis?${NC}"
    exit 1
fi
echo -e "${GREEN}Abhängigkeiten erfolgreich installiert${NC}"

# 8. Umgebungsvariablen konfigurieren
echo -e "${YELLOW}Konfiguriere .env-Datei...${NC}"
cd backend || { echo -e "${RED}Backend-Verzeichnis nicht gefunden${NC}"; exit 1; }
if [ ! -f ".env" ]; then
    cat <<EOL > .env
DATABASE_URL="postgresql://postgres:Postgres123!@localhost:5432/intranet?schema=public"
JWT_SECRET="ein_sehr_sicherer_geheimer_schlüssel_1234567890"
PORT=5000
EOL
    echo -e "${GREEN}.env-Datei erfolgreich erstellt${NC}"
else
    echo -e "${YELLOW}.env-Datei existiert bereits. Überspringe...${NC}"
fi

# 9. Prisma-Migration ausführen
echo -e "${YELLOW}Initialisiere die Datenbank mit Prisma...${NC}"
npx prisma migrate dev --name init || { echo -e "${RED}Prisma-Migration fehlgeschlagen${NC}"; exit 1; }
echo -e "${GREEN}Datenbank erfolgreich initialisiert${NC}"

# 10. PM2 installieren und Anwendung starten
echo -e "${YELLOW}Installiere PM2 und starte die Anwendung...${NC}"
sudo npm install -g pm2 || { echo -e "${RED}PM2-Installation fehlgeschlagen${NC}"; exit 1; }
pm2 start npm --name "backend" -- run dev
cd ../frontend || { echo -e "${RED}Frontend-Verzeichnis nicht gefunden${NC}"; exit 1; }
pm2 start npm --name "frontend" -- run dev
pm2 save || { echo -e "${RED}PM2-Konfiguration fehlgeschlagen${NC}"; exit 1; }
pm2 startup | tail -n 1 | bash || echo -e "${YELLOW}PM2-Autostart konnte nicht konfiguriert werden${NC}"
echo -e "${GREEN}PM2 erfolgreich installiert und Anwendung gestartet${NC}"

# 11. Abschluss
echo -e "${GREEN}Installation abgeschlossen!${NC}"
echo -e "${YELLOW}Backend läuft auf Port 5000, Frontend auf Port 3000.${NC}"
echo -e "${YELLOW}Vergiss nicht, die AWS Security Group zu konfigurieren (Ports 5000 und 3000 öffnen).${NC}"
echo -e "${YELLOW}Teste im Browser:${NC}"
echo -e "${YELLOW} - Backend: http://<deine-ec2-ip>:5000/api/auth/login${NC}"
echo -e "${YELLOW} - Frontend: http://<deine-ec2-ip>:3000${NC}"
echo -e "${GREEN}Login: admin / admin123${NC}"

# Systemanforderungen anzeigen
echo -e "\n${GREEN}Systemanforderungen:${NC}"
echo -e "${YELLOW}CPU: $(nproc) Kerne verfügbar (Minimum: 2 Kerne)${NC}"
echo -e "${YELLOW}RAM: $(free -h | grep Mem | awk '{print $2}') verfügbar (Minimum: 4GB)${NC}"
echo -e "${YELLOW}Festplatte: $(df -h / | grep / | awk '{print $4}') frei (Minimum: 20GB)${NC}"

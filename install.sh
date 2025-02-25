#!/bin/bash

# Installationsskript für das Intranet-Projekt auf AWS (Ubuntu)
# Voraussetzung: Frische Ubuntu-Instanz mit SSH-Zugang

# Farben für Ausgaben
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starte Installation des Intranet-Projekts...${NC}"

# 1. System aktualisieren und Grundpakete installieren
echo "Aktualisiere Paketlisten und installiere Grundpakete..."
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl

# 2. Node.js und npm installieren (v18)
echo "Installiere Node.js v18 und npm..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node -v || { echo -e "${RED}Node.js Installation fehlgeschlagen${NC}"; exit 1; }

# 3. PostgreSQL installieren
echo "Installiere PostgreSQL..."
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
sudo systemctl status postgresql | grep "active (running)" || { echo -e "${RED}PostgreSQL läuft nicht${NC}"; exit 1; }

# 4. PostgreSQL konfigurieren (Benutzer: postgres, Passwort: Postgres123!, DB: intranet)
echo "Konfiguriere PostgreSQL..."
sudo -u postgres psql -c "ALTER USER postgres WITH ENCRYPTED PASSWORD 'Postgres123!';" || { echo -e "${RED}Passwortänderung fehlgeschlagen${NC}"; exit 1; }
sudo -u postgres psql -c "CREATE DATABASE intranet;" || { echo -e "${RED}Datenbank-Erstellung fehlgeschlagen${NC}"; exit 1; }

# 5. SSH-Schlüssel für GitHub generieren (falls nicht vorhanden)
if [ ! -f ~/.ssh/id_rsa ]; then
    echo "Generiere SSH-Schlüssel für GitHub..."
    ssh-keygen -t rsa -b 4096 -C "intranet-aws@example.com" -N "" -f ~/.ssh/id_rsa
    echo "Öffentlicher Schlüssel (füge ihn bei GitHub unter Settings > SSH and GPG keys hinzu):"
    cat ~/.ssh/id_rsa.pub
    echo -e "${GREEN}Bitte kopiere den obigen Schlüssel und füge ihn bei GitHub hinzu. Drücke Enter, wenn fertig...${NC}"
    read -p ""
fi
ssh -T git@github.com 2>&1 | grep "Hi" || { echo -e "${RED}SSH-Verbindung zu GitHub fehlgeschlagen. Überprüfe den Schlüssel.${NC}"; exit 1; }

# 6. Repository klonen
echo "Klone das Repository..."
git clone git@github.com:freshprince84/intranet.git || { echo -e "${RED}Klonen fehlgeschlagen${NC}"; exit 1; }
cd intranet

# 7. Abhängigkeiten installieren
echo "Installiere Projektabhängigkeiten..."
npm run install-all || { echo -e "${RED}Abhängigkeiten-Installation fehlgeschlagen${NC}"; exit 1; }

# 8. Umgebungsvariablen konfigurieren
echo "Konfiguriere .env-Datei..."
cd backend
cat <<EOL > .env
DATABASE_URL="postgresql://postgres:Postgres123!@localhost:5432/intranet?schema=public"
JWT_SECRET="ein_sehr_sicherer_geheimer_schlüssel_1234567890"
PORT=5000
EOL
cat .env || { echo -e "${RED}Erstellen der .env-Datei fehlgeschlagen${NC}"; exit 1; }

# 9. Prisma-Migration ausführen
echo "Initialisiere die Datenbank mit Prisma..."
npx prisma migrate dev --name init || { echo -e "${RED}Prisma-Migration fehlgeschlagen${NC}"; exit 1; }

# 10. PM2 installieren und Anwendung starten
echo "Installiere PM2 und starte die Anwendung..."
sudo npm install -g pm2
pm2 start npm --name "backend" -- run dev
cd ../frontend
pm2 start npm --name "frontend" -- run dev
pm2 save || { echo -e "${RED}PM2-Konfiguration fehlgeschlagen${NC}"; exit 1; }

# 11. Abschluss
echo -e "${GREEN}Installation abgeschlossen!${NC}"
echo "Backend läuft auf Port 5000, Frontend auf Port 3000."
echo "Vergiss nicht, die AWS Security Group zu konfigurieren (Ports 5000 und 3000 öffnen)."
echo "Teste im Browser:"
echo " - Backend: http://<deine-ec2-ip>:5000/api/auth/login"
echo " - Frontend: http://<deine-ec2-ip>:3000"
echo "Login: admin / admin123"

# Server-Update-Anleitung

Diese Anleitung beschreibt die Schritte, die zur Aktualisierung des Servers nach dem Pull der neuesten Änderungen von GitHub erforderlich sind.

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

## Schritt 1: Git Pull

Zuerst müssen die neuesten Änderungen von GitHub gezogen werden:

ssh -i ~/.ssh/intranet_rsa root@65.109.228.106

sudo apt update -y && sudo apt upgrade -y && sudo apt autoremove -y && sudo apt autoclean -y
sudo apt-get update -y && sudo apt-get upgrade -y && sudo apt-get autoremove -y && sudo apt-get autoclean -y


```bash
cd /var/www/intranet
git stash  # Falls lokale Änderungen vorhanden sind
git pull
git stash pop  # Falls lokale Änderungen gestashed wurden
```

## Schritt 2: Datenbank-Migration anwenden

Als Nächstes müssen die Datenbank-Migrationen angewendet werden:

```bash
cd /var/www/intranet/backend
npx prisma migrate deploy
```

Dieser Befehl wendet alle ausstehenden Migrationen an, einschließlich der neuen Migration für das `githubPath`-Feld.

## Schritt 3: Prisma-Client aktualisieren

Der Prisma-Client muss mit den neuen Typendefinitionen aktualisiert werden:

```bash
cd /var/www/intranet/backend
npx prisma generate
```

## Schritt 4: Datenbank-Seed ausführen

Der Seed aktualisiert automatisch alle erforderlichen Daten, einschließlich der `githubPath`-Werte für die Dokumentation:

```bash
cd /var/www/intranet/backend
npx prisma db seed
```

## Schritt 5: Frontend neu bauen

Das Frontend muss neu gebaut werden, um die Änderungen zu übernehmen:

```bash
cd /var/www/intranet/frontend
npm run build



cd /var/www/intranet/backend
npm run build


## Schritt 6: Server neu starten

Je nach Konfiguration des Servers müssen verschiedene Dienste neu gestartet werden:

```bash
# Backend-Dienst über PM2 neu starten
pm2 restart intranet-backend

# Frontend-Anwendung wird über einen Webserver bereitgestellt
# Nginx neu starten (falls verwendet)
sudo systemctl restart nginx


## Wichtige Hinweise

- Führe die Schritte **genau in dieser Reihenfolge** aus
- Die Migration des `githubPath`-Feldes ist eine einmalige Operation
- Der Seed-Prozess ist robust und funktioniert sowohl vor als auch nach der Migration
- Bei Problemen überprüfe die Logs: 
  ```bash
  cd /var/www/intranet/backend
  tail -f logs/app.log
  ```
- Wie im README.md erwähnt: "Server-Neustart nur nach Absprache" 




## Server Details for SCP

*   **Server IP Address:** `65.109.228.106`
*   **SSH/SCP User:** `root`
*   **SSH Key:** `~/.ssh/intranet_rsa` (as mentioned in `SERVER_UPDATE.md` for SSH connection)
*   **Target Directory for APK on Server:** `/var/www/intranet/backend/public/downloads/`
*   **Target Filename on Server:** `intranet-app.apk`
*   **SCP Upload Command (run in workspace root):**
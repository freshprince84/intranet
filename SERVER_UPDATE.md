# Server-Update-Anleitung

Diese Anleitung beschreibt die Schritte, die zur Aktualisierung des Servers nach dem Pull der neuesten Änderungen von GitHub erforderlich sind.

## Schritt 1: Git Pull

Zuerst müssen die neuesten Änderungen von GitHub gezogen werden:

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

Jetzt kann der Datenbank-Seed ausgeführt werden, um sicherzustellen, dass alle grundlegenden Daten vorhanden sind:

```bash
cd /var/www/intranet/backend
npx prisma db seed
```

## Schritt 5: GitHub-Pfade aktualisieren

Nach der Migration und dem Seed muss das Update-Skript ausgeführt werden, um die `githubPath`-Werte für alle Artikel zu aktualisieren:

```bash
cd /var/www/intranet/backend
npm run update-github-paths
```

## Schritt 6: Frontend neu bauen

Das Frontend muss neu gebaut werden, um die Änderungen zu übernehmen:

```bash
cd /var/www/intranet/frontend
npm run build
```

## Schritt 7: Server neu starten (falls erforderlich)

Je nach Konfiguration des Servers könnte ein Neustart erforderlich sein:

```bash
# Falls PM2 verwendet wird
pm2 restart backend
pm2 restart frontend

# Falls systemd verwendet wird
sudo systemctl restart intranet-backend
sudo systemctl restart intranet-frontend
```

## Wichtige Hinweise

- Führe die Schritte **genau in dieser Reihenfolge** aus
- Der Seed-Prozess wird auch ohne das `githubPath`-Feld funktionieren
- Das Update-Skript fügt die `githubPath`-Werte hinzu, nachdem die Migration ausgeführt wurde
- Bei Problemen überprüfe die Logs: 
  ```bash
  cd /var/www/intranet/backend
  tail -f logs/app.log
  ```

Die Migration und das Update der `githubPath`-Werte sind einmalige Operationen. Zukünftige Updates erfordern möglicherweise nicht alle diese Schritte. 
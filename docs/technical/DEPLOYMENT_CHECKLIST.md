# Deployment-Checkliste für Server-Update

## Übersicht der Änderungen im Commit
- ✅ `backend/prisma/seed.ts` - Organisation-Berechtigungen hinzugefügt
- ✅ `backend/src/controllers/organizationController.ts` - Organisation-Berechtigungen aktualisiert
- ✅ Neue Migration: `20251101155554_add_task_status_history`
- ✅ Viele Frontend- und Backend-Änderungen

## Deployment-Schritte (IN DIESER REIHENFOLGE!)

### Schritt 1: Verbindung zum Server
```bash
ssh -i ~/.ssh/intranet_rsa root@65.109.228.106
```

### Schritt 2: Git Pull (Neueste Änderungen ziehen)
```bash
cd /var/www/intranet
git stash  # Falls lokale Änderungen vorhanden sind
git pull
git stash pop  # Falls lokale Änderungen gestashed wurden
```

### Schritt 3: Neue Dependencies installieren (Backend)
```bash
cd /var/www/intranet/backend
npm install
```

### Schritt 4: Neue Dependencies installieren (Frontend)
```bash
cd /var/www/intranet/frontend
npm install
```

### Schritt 5: Datenbank-Migrationen anwenden ⚠️ WICHTIG
```bash
cd /var/www/intranet/backend
npx prisma migrate deploy
```
Dies wendet die neue Migration `20251101155554_add_task_status_history` an.

### Schritt 6: Prisma-Client aktualisieren
```bash
cd /var/www/intranet/backend
npx prisma generate
```

### Schritt 7: Datenbank-Seed ausführen ⚠️ KRITISCH für Organisation-Berechtigungen
```bash
cd /var/www/intranet/backend
npx prisma db seed
```
**WICHTIG:** Dieser Schritt fügt die fehlenden Organisation-Berechtigungen hinzu:
- `organization_management` (page)
- `organization_join_requests` (table)
- `organization_users` (table)

### Schritt 8: Backend neu bauen
```bash
cd /var/www/intranet/backend
npm run build
```

### Schritt 9: Frontend neu bauen
```bash
cd /var/www/intranet/frontend
npm run build
```

### Schritt 10: Server-Dienste neu starten ⚠️ BITTE ZUERST FRAGEN!
Bitte den Server-Neustart mit dem Benutzer absprechen (gemäß README.md Regel).

```bash
# Backend-Dienst über PM2 neu starten
pm2 restart intranet-backend

# Nginx neu starten (für Frontend)
sudo systemctl restart nginx
```

## Verifikation nach dem Deployment

### 1. Backend-Logs prüfen
```bash
cd /var/www/intranet/backend
pm2 logs intranet-backend --lines 50
```

### 2. Prüfen ob Server läuft
```bash
pm2 status
```

### 3. Test: Organisation-Tab-Berechtigung
- Als Admin-User einloggen
- Zu UserManagement navigieren
- Organisation-Tab sollte jetzt sichtbar und funktionsfähig sein
- Keine "noPermission"-Fehlermeldungen mehr

## Troubleshooting

### Falls Seed-Fehler auftreten:
```bash
# Seed-Logs prüfen
cd /var/www/intranet/backend
npm run seed
```

### Falls Migration-Fehler auftreten:
```bash
# Migration-Status prüfen
cd /var/www/intranet/backend
npx prisma migrate status
```

### Falls Backend nicht startet:
```bash
# Detaillierte Logs anzeigen
pm2 logs intranet-backend --err
```

## Wichtige Hinweise

⚠️ **Server-Neustart:** Gemäß README.md-Regel: "Server-Neustart nur nach Absprache"

⚠️ **Backup:** Vor dem Deployment sollte ein Datenbank-Backup erstellt werden:
```bash
# Optional: Backup erstellen
pg_dump -U intranet_user -d intranet > /tmp/intranet_backup_$(date +%Y%m%d_%H%M%S).sql
```

⚠️ **Reihenfolge:** Die Schritte MÜSSEN in dieser Reihenfolge ausgeführt werden!

## Zusammenfassung der kritischen Schritte

1. ✅ Git Pull
2. ✅ npm install (Backend & Frontend)
3. ✅ Migrationen anwenden
4. ✅ Prisma generate
5. ✅ **Seed ausführen** (fügt Organisation-Berechtigungen hinzu)
6. ✅ Build (Backend & Frontend)
7. ⚠️ Server-Neustart (bitte absprechen!)


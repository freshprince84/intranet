# LobbyPMS Migration - Server-Befehle

**Datum:** 2025-01-26  
**Migration:** `add_lobby_pms_last_sync_at`

---

## 🚀 BEFEHLE FÜR DEN SERVER

### Option 1: Direkt SQL ausführen (EMPFOHLEN)

```bash
cd /var/www/intranet/backend
psql -U postgres -d intranet -c "ALTER TABLE \"Branch\" ADD COLUMN IF NOT EXISTS \"lobbyPmsLastSyncAt\" TIMESTAMP(3);"
```

### Option 2: Migration-Datei auf Server kopieren

Falls Option 1 nicht funktioniert:

1. Migration-Datei auf Server kopieren:
```bash
# Auf deinem lokalen Rechner (Windows):
scp backend/prisma/migrations/20250126000000_add_lobby_pms_last_sync_at/migration.sql root@65.109.228.106:/var/www/intranet/backend/prisma/migrations/20250126000000_add_lobby_pms_last_sync_at/migration.sql
```

2. Dann auf Server:
```bash
cd /var/www/intranet/backend
npx prisma migrate deploy
```

---

## ✅ VERIFIZIERUNG

Nach der Migration prüfen:

```bash
psql -U postgres -d intranet -c "\d \"Branch\""
```

Sollte `lobbyPmsLastSyncAt` in der Spaltenliste zeigen.

---

## 📝 NACH DER MIGRATION

1. Code neu kompilieren:
```bash
cd /var/www/intranet/backend
npm run build
```

2. Server neu starten (du machst das):
```bash
pm2 restart intranet-backend
```

---

**Erstellt:** 2025-01-26


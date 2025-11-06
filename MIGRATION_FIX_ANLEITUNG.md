# Lösung: Fehlgeschlagene Migration reparieren

## Problem
Migration `20250606235049_decouple_hamburger_role` ist fehlgeschlagen und blockiert alle weiteren Migrationen.

## Lösung: Migration als erledigt markieren

Es gibt zwei Möglichkeiten:

### Option 1: Migration als aufgelöst markieren (wenn Änderungen bereits angewendet wurden)

Falls die Migration teilweise ausgeführt wurde, können wir sie als "erledigt" markieren:

```bash
cd /var/www/intranet/backend
npx prisma migrate resolve --applied 20250606235049_decouple_hamburger_role
```

### Option 2: Prüfen und manuell reparieren (sicherer)

**Schritt 1: Prüfe, ob die Änderungen bereits angewendet wurden**

```bash
# Verbinde dich mit der Datenbank
cd /var/www/intranet/backend
psql $DATABASE_URL
```

Dann prüfe:

```sql
-- Prüfe ob username NOT NULL ist
SELECT column_name, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'User' AND column_name = 'username';

-- Prüfe ob die NotificationSettings Spalten noch existieren
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'NotificationSettings' 
AND column_name IN ('joinRequestApproved', 'joinRequestReceived', 'joinRequestRejected', 'organizationInvitationReceived');

-- Prüfe ob der Slug-Index existiert
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'CerebroCarticle' AND indexname = 'CerebroCarticle_slug_key';

-- Prüfe Hamburger-Rolle
SELECT id, name, "organizationId" FROM "Role" WHERE id = 999;
```

**Schritt 2a: Falls Änderungen FEHLEN - Manuell anwenden**

Falls die Änderungen noch NICHT angewendet wurden, führe diese SQL-Befehle manuell aus:

```sql
-- 1. NotificationSettings Spalten löschen (falls noch vorhanden)
ALTER TABLE "NotificationSettings" 
  DROP COLUMN IF EXISTS "joinRequestApproved",
  DROP COLUMN IF EXISTS "joinRequestReceived",
  DROP COLUMN IF EXISTS "joinRequestRejected",
  DROP COLUMN IF EXISTS "organizationInvitationReceived";

-- 2. username NOT NULL setzen (nur wenn keine NULL-Werte existieren)
-- ZUERST prüfen:
SELECT COUNT(*) FROM "User" WHERE username IS NULL;
-- Falls COUNT > 0: Zuerst NULL-Werte beheben!

-- Dann:
ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;

-- 3. Slug-Index erstellen (nur wenn kein Duplikate existieren)
-- ZUERST prüfen:
SELECT slug, COUNT(*) 
FROM "CerebroCarticle" 
GROUP BY slug 
HAVING COUNT(*) > 1;
-- Falls Duplikate existieren: Zuerst beheben!

-- Dann:
CREATE UNIQUE INDEX IF NOT EXISTS "CerebroCarticle_slug_key" ON "CerebroCarticle"("slug");

-- 4. Hamburger-Rolle entkoppeln
UPDATE "Role" SET "organizationId" = NULL WHERE id = 999;

-- Verlassen
\q
```

**Schritt 2b: Falls Änderungen bereits VORHANDEN - Als erledigt markieren**

Falls die Änderungen bereits angewendet wurden (Schema stimmt), markiere die Migration einfach als erledigt:

```bash
cd /var/www/intranet/backend
npx prisma migrate resolve --applied 20250606235049_decouple_hamburger_role
```

---

## Empfohlene Vorgehensweise

**Schnelllösung (wenn du dir sicher bist, dass die Änderungen bereits angewendet wurden):**

```bash
cd /var/www/intranet/backend

# Migration als erledigt markieren
npx prisma migrate resolve --applied 20250606235049_decouple_hamburger_role

# Dann Migration-Status prüfen
npx prisma migrate status

# Falls alles OK: Weitere Migrationen anwenden
npx prisma migrate deploy
```

**Sichere Lösung (empfohlen):**

```bash
cd /var/www/intranet/backend

# 1. Prüfe den aktuellen Status
npx prisma migrate status

# 2. Prüfe die Datenbank manuell (siehe oben)

# 3. Falls Änderungen fehlen: SQL manuell ausführen

# 4. Dann Migration als erledigt markieren
npx prisma migrate resolve --applied 20250606235049_decouple_hamburger_role

# 5. Weitere Migrationen anwenden
npx prisma migrate deploy
```

---

## Nach dem Fix: Normal weitermachen

Nachdem die fehlgeschlagene Migration aufgelöst wurde:

```bash
cd /var/www/intranet/backend

# 1. Migrationen anwenden
npx prisma migrate deploy

# 2. Prisma Client generieren
npx prisma generate

# 3. Seed ausführen
npx prisma db seed
```

---

## Fehlerursachen (für Verständnis)

Die Migration könnte fehlgeschlagen sein wegen:

1. **username NOT NULL:** Es gibt User mit `username = NULL` in der Datenbank
2. **Slug Duplikate:** Es gibt mehrere CerebroCarticle mit gleichem slug
3. **Spalten existieren nicht:** Die zu löschenden Spalten existieren bereits nicht mehr
4. **Berechtigungen:** Der Datenbank-User hat keine Rechte für ALTER TABLE

---

## Tipp: Migration-Status immer prüfen

Vor jeder Migration sollte man prüfen:

```bash
npx prisma migrate status
```

Dies zeigt:
- Welche Migrationen angewendet wurden
- Welche ausstehend sind
- Welche fehlgeschlagen sind


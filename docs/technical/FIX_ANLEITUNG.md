# Anleitung: Probleme beheben

## Problem 1: Rollen werden nicht im Prisma Studio angezeigt

**Status:** Rollen sind in der Datenbank vorhanden (4 Rollen gefunden), aber werden möglicherweise nicht korrekt angezeigt.

**Lösung:**
1. Migration anwenden:
   ```bash
   cd backend
   npx prisma migrate deploy
   ```

2. Prisma Client neu generieren:
   ```bash
   npx prisma generate
   ```

3. Prisma Studio neu starten (falls es läuft, beenden und neu starten)

## Problem 2: Benutzer können nicht gelöscht werden

**Status:** Code wurde bereits erweitert um OrganizationJoinRequest und OrganizationInvitation zu löschen.

**Lösung:**
1. Server neu starten (damit der neue Code kompiliert wird)
2. Prisma Client neu generieren:
   ```bash
   npx prisma generate
   ```

## Durchgeführte Änderungen

### Schema-Änderungen:
- ✅ `Role.name` @unique entfernt
- ✅ `@@unique([name, organizationId])` hinzugefügt

### Code-Änderungen:
- ✅ `deleteUser` erweitert um:
  - `organizationJoinRequest.deleteMany({ where: { requesterId: userId } })`
  - `organizationInvitation.deleteMany({ where: { invitedBy: userId } })`

### Migration:
- ✅ Erstellt: `20250607000000_fix_role_name_unique_constraint/migration.sql`
- ⚠️ **Noch nicht angewendet!**

## Nächste Schritte

1. **Migration anwenden:**
   ```bash
   cd backend
   npx prisma migrate deploy
   ```

2. **Prisma Client generieren:**
   ```bash
   npx prisma generate
   ```

3. **Server neu starten** (falls er läuft)

4. **Testen:**
   - Prisma Studio öffnen und prüfen ob Rollen/UserRoles angezeigt werden
   - Einen Benutzer löschen versuchen

## Falls Probleme auftreten

Wenn die Migration fehlschlägt wegen doppelter Rollennamen:
1. Prüfe ob es Rollen mit gleichen Namen in verschiedenen Organisationen gibt
2. Falls ja, benenne sie vorher um
3. Oder passe die Migration an um Duplikate zu behandeln


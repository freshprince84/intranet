# Plan: Deployment auf Hetzner Server mit Datenübertragung

## Ziel
- Aktuellen Code-Stand auf dem Hetzner Server installieren (git pull)
- Lokale Datenbank-Daten auf den Server übertragen
- **WICHTIG**: Seed-Daten auf dem Server NICHT überschreiben

## Analyse: Was sind Seed-Daten?

Aus `backend/prisma/seed.ts` werden folgende Daten als Seed-Daten erstellt:

### Geschützte Seed-Daten (NICHT überschreiben):
1. **Rollen**:
   - ID 1: Admin (global, organizationId = null)
   - ID 2: User (global, organizationId = null)
   - ID 999: Hamburger (global, organizationId = null)
   - Org-spezifische Rollen für Org 1 & 2 (Admin, User, Hamburger)

2. **Organisationen**:
   - ID 1: La Familia Hostel (name: 'la-familia-hostel')
   - ID 2: Mosaik (name: 'mosaik')
   - Default-Organisation (name: 'default')

3. **Benutzer**:
   - username: 'admin' (fixer Admin-Benutzer)
   - username: 'rebeca-benitez' (für Org 2)
   - username: 'christina-di-biaso' (für Org 2)

4. **Branches**:
   - 'Parque Poblado' (Org 1)
   - 'Manila' (Org 1)
   - 'Sonnenhalden' (Org 2)
   - 'Hauptsitz' (Standard-Org)

5. **Clients** (für Org 2):
   - 'Hampi'
   - 'Heinz Hunziker'
   - 'Rebeca Benitez'
   - 'Stiven Pino'
   - 'Urs Schmidlin'
   - Demo-Clients für Standard-Org

6. **Berechtigungen**: Alle Permission-Einträge für Seed-Rollen

7. **Demo-Daten**: Demo-WorkTimes/Beratungen

## Lösung: Selektiver Export & Import

### Strategie
1. **Export lokal**: Alle Daten exportieren, AUSSER Seed-Daten
2. **Import auf Server**: Daten importieren mit Schutz für Seed-Daten
3. **Idempotenter Import**: Bereits vorhandene Einträge werden übersprungen

## Schritt-für-Schritt Plan

### Phase 1: Lokaler Export (auf deinem Rechner)

#### Schritt 1.1: Export-Skript erstellen
Erstelle ein Skript `backend/scripts/export_data.ts`, das:
- Alle Tabellen durchgeht
- Seed-Daten identifiziert und ausschließt
- Daten als JSON exportiert

**Geschützte Daten beim Export ausschließen:**
- Rollen mit IDs 1, 2, 999 oder mit bestimmten Namen + organizationId
- Organisationen mit IDs 1, 2 oder Namen 'default'
- User mit username 'admin', 'rebeca-benitez', 'christina-di-biaso'
- Branches mit Namen 'Parque Poblado', 'Manila', 'Sonnenhalden', 'Hauptsitz'
- Clients die zu Seed-Daten gehören
- Permissions für Seed-Rollen
- Demo-WorkTimes

#### Schritt 1.2: Export ausführen
```bash
cd backend
npx ts-node scripts/export_data.ts
```

**Ausgabe**: JSON-Dateien in `export_data/`:
- `users.json` (ohne Seed-User)
- `roles.json` (ohne Seed-Rollen)
- `organizations.json` (ohne Seed-Organisationen)
- `branches.json` (ohne Seed-Branches)
- `clients.json` (ohne Seed-Clients)
- `worktimes.json` (ohne Demo-Daten)
- `tasks.json`
- `requests.json`
- `cerebro.json`
- `user_roles.json` (ohne Seed-Verknüpfungen)
- `user_branches.json` (ohne Seed-Verknüpfungen)
- `permissions.json` (ohne Seed-Permissions)
- etc.

### Phase 2: Datenübertragung auf Server

#### Schritt 2.1: Export-Daten auf Server kopieren
```bash
scp -i ~/.ssh/intranet_rsa -r export_data root@65.109.228.106:/var/www/intranet/backend/export_data
```

### Phase 3: Deployment auf Server

#### Schritt 3.1: SSH-Verbindung zum Server
```bash
ssh -i ~/.ssh/intranet_rsa root@65.109.228.106
```

#### Schritt 3.2: Git Pull
```bash
cd /var/www/intranet
git stash  # Falls lokale Änderungen vorhanden sind
git pull
git stash pop  # Falls lokale Änderungen gestashed wurden
```

#### Schritt 3.3: Dependencies installieren
```bash
cd /var/www/intranet/backend
npm install

cd /var/www/intranet/frontend
npm install
```

#### Schritt 3.4: Datenbank-Migrationen anwenden
```bash
cd /var/www/intranet/backend
npx prisma migrate deploy
```

#### Schritt 3.5: Prisma Client generieren
```bash
cd /var/www/intranet/backend
npx prisma generate
```

#### Schritt 3.6: Seed ausführen (wichtig für neue Berechtigungen!)
```bash
cd /var/www/intranet/backend
npx prisma db seed
```
**Hinweis**: Der Seed ist idempotent - er fügt nur hinzu, was fehlt, und überschreibt keine bestehenden Seed-Daten.

#### Schritt 3.7: Daten importieren (mit Seed-Schutz)
```bash
cd /var/www/intranet/backend
npx ts-node scripts/import_exported_data.ts
```

**Was passiert beim Import:**
- Prüft für jeden Eintrag, ob es Seed-Daten sind
- Überspringt Seed-Daten komplett
- Importiert nur neue Daten
- Überschreibt keine bestehenden Seed-Daten

#### Schritt 3.8: Builds
```bash
cd /var/www/intranet/backend
npm run build

cd /var/www/intranet/frontend
npm run build
```

#### Schritt 3.9: Server-Neustart (NUR nach Absprache!)
**WICHTIG**: Server-Neustart nur nach Absprache mit dem Benutzer!

```bash
# Backend-Dienst über PM2 neu starten
pm2 restart intranet-backend

# Nginx neu starten (falls verwendet)
sudo systemctl restart nginx
```

## Technische Umsetzung

### Export-Skript (`backend/scripts/export_data.ts`)

Das Skript muss:
1. Prisma Client verwenden
2. Alle Tabellen durchgehen
3. Seed-Daten identifizieren und filtern
4. JSON-Dateien erstellen
5. Metadaten exportieren (z.B. welche IDs verwendet wurden)

### Import-Skript (`backend/scripts/import_exported_data.ts`)

Das Skript muss:
1. JSON-Dateien lesen
2. Für jeden Eintrag prüfen, ob es Seed-Daten sind
3. Seed-Daten komplett überspringen
4. Andere Daten idempotent importieren (upsert)
5. Abhängigkeiten beachten (z.B. User vor UserRole)

## Seed-Daten-Schutz-Logik

### Beim Export ausschließen:
```typescript
// Rollen ausschließen
const seedRoleIds = [1, 2, 999];
const seedRoleNames = ['Admin', 'User', 'Hamburger'];

// Organisationen ausschließen
const seedOrgIds = [1, 2];
const seedOrgNames = ['la-familia-hostel', 'mosaik', 'default'];

// User ausschließen
const seedUsernames = ['admin', 'rebeca-benitez', 'christina-di-biaso'];

// Branches ausschließen
const seedBranchNames = ['Parque Poblado', 'Manila', 'Sonnenhalden', 'Hauptsitz'];
```

### Beim Import prüfen:
```typescript
function isSeedData(entity: string, data: any): boolean {
  switch(entity) {
    case 'Role':
      return seedRoleIds.includes(data.id) || 
             (seedRoleNames.includes(data.name) && data.organizationId === null);
    case 'Organization':
      return seedOrgIds.includes(data.id) || seedOrgNames.includes(data.name);
    case 'User':
      return seedUsernames.includes(data.username);
    case 'Branch':
      return seedBranchNames.includes(data.name);
    // ... etc.
  }
  return false;
}
```

## Risiken und Lösungen

### Risiko 1: Seed-Daten werden überschrieben
**Lösung**: Explizite Prüfung beim Import, Seed-Daten werden komplett übersprungen

### Risiko 2: Abhängigkeiten werden verletzt
**Lösung**: Import in korrekter Reihenfolge (Organisationen → Rollen → User → ...)

### Risiko 3: Datenkonflikte
**Lösung**: Idempotenter Import mit upsert, bestehende Einträge werden aktualisiert statt dupliziert

### Risiko 4: Große Datenmengen
**Lösung**: Batch-Import mit Progress-Anzeige

## Verifikation nach Import

1. Prüfe, dass Seed-Daten unverändert sind:
```bash
# Auf Server
cd /var/www/intranet/backend
npx prisma studio
# Prüfe: Admin-User existiert noch, Seed-Rollen sind unverändert
```

2. Prüfe, dass neue Daten importiert wurden:
```bash
# Anzahl der importierten Einträge sollte stimmen
```

## Zusammenfassung

✅ **Geht das?** Ja, mit selektivem Export/Import

✅ **Seed-Daten geschützt?** Ja, durch explizite Filterung beim Export und Prüfung beim Import

✅ **Idempotent?** Ja, Import kann mehrfach ausgeführt werden ohne Probleme

✅ **Sicher?** Ja, Seed-Daten werden nie überschrieben


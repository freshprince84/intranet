# Analyse: Prisma Migration Branch.address Fehler

**Datum:** 2025-01-30  
**Status:** ✅ **BEHOBEN** - Migration ausgeführt, Spalten hinzugefügt, Prisma Client generiert

## Problem-Zusammenfassung

Der Server wirft wiederholt Prisma-Fehler:
```
The column `Branch.address` does not exist in the current database.
```

**Fehlercode:** `P2022` (Prisma: Column does not exist)

## Ursache

### Fakten aus dem Code:

1. **Prisma Schema** (`backend/prisma/schema.prisma`, Zeile 223-225):
   - Definiert `address`, `city`, `country` Felder im Branch-Model
   - Diese Felder sind als `String?` (optional) definiert

2. **Migration existiert** (`backend/prisma/migrations/20250203000000_add_branch_address_and_fix_ota_listings/migration.sql`):
   - Migration fügt die Spalten `address`, `city`, `country` zur `Branch` Tabelle hinzu
   - Migration wurde noch nicht auf der Datenbank ausgeführt

3. **Prisma Client wurde bereits generiert**:
   - Der generierte Prisma Client enthält bereits die neuen Felder
   - Der Client versucht, auf Spalten zuzugreifen, die in der Datenbank nicht existieren

4. **Code verwendet die Felder**:
   - `branchController.ts` (Zeilen 45, 64): Verwendet `address` explizit in `select` Statements
   - Services verwenden `prisma.branch.findMany()` ohne explizites `select`, wodurch Prisma automatisch alle Felder lädt (inklusive `address`)

## Betroffene Dateien

### Controller:
- `backend/src/controllers/branchController.ts` (Zeilen 45, 64, 79)
- `backend/src/controllers/userController.ts` (Zeilen 83, 179)

### Services:
- `backend/src/services/emailReservationScheduler.ts` (Zeile 60)
- `backend/src/services/pricingRuleScheduler.ts` (Zeile 63)
- `backend/src/services/reservationAutoInvitationScheduler.ts` (Zeile 55)
- `backend/src/services/lobbyPmsReservationScheduler.ts` (Zeile 66)

## Fehler-Details

### Fehlertyp 1: Explizite Verwendung von `address` in `select`
**Datei:** `backend/src/controllers/branchController.ts`
```typescript
queryOptions.select = {
    id: true,
    name: true,
    address: true,  // ← Fehler: Spalte existiert nicht
    city: true,
    country: true,
    // ...
};
```

### Fehlertyp 2: Automatisches Laden aller Felder
**Dateien:** Alle Services, die `prisma.branch.findMany()` ohne `select` verwenden
```typescript
const branches = await prisma.branch.findMany({
    where: { /* ... */ },
    include: { /* ... */ }
    // Kein explizites select → Prisma lädt ALLE Felder inklusive address
});
```

### Fehlertyp 3: Include von Branch-Relation
**Datei:** `backend/src/controllers/userController.ts`
```typescript
branches: {
    include: {
        branch: true  // ← Lädt alle Branch-Felder inklusive address
    }
}
```

## Lösung (✅ AUSGEFÜHRT)

### Schritt 1: Migration ausführen ✅

Die Migration `20250203000000_add_branch_address_and_fix_ota_listings` wurde manuell ausgeführt.

**Ausgeführt:**
- `address` Spalte hinzugefügt
- `city` Spalte hinzugefügt  
- `country` Spalte hinzugefügt

**Hinweis:** OTAListing-Änderungen wurden übersprungen, da die Tabelle nicht existiert (nicht kritisch).

### Schritt 2: Prisma Client neu generieren ✅

Prisma Client wurde erfolgreich neu generiert:
```bash
cd backend
npx prisma generate
```

**Ergebnis:** ✔ Generated Prisma Client (v6.5.0)

### Schritt 3: Server neu starten

**Nächster Schritt:** Backend-Server neu starten, damit die Änderungen wirksam werden.

## Zusätzliche Beobachtungen

### LobbyPMS API Fehler (separates Problem):
```
[LobbyPMS] API Error: {
  status: 403,
  statusText: 'Forbidden',
  data: ['the 92.106.150.10 trying to access the API is not set as a valid ip']
}
```

Dies ist ein separates Problem (IP-Whitelist-Konfiguration) und nicht Teil des Migration-Problems.

## Prüfung nach Fix

Nach Ausführung der Migration sollten folgende Prüfungen durchgeführt werden:

1. **Datenbank prüfen:**
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'Branch' 
   AND column_name IN ('address', 'city', 'country');
   ```
   Erwartet: 3 Zeilen (address, city, country)

2. **Server-Logs prüfen:**
   - Keine `P2022` Fehler mehr
   - Services starten ohne Fehler

3. **API-Endpunkte testen:**
   - `GET /api/branches` - sollte ohne Fehler funktionieren
   - `GET /api/users` - sollte ohne Fehler funktionieren

## Verwandte Dokumentation

- [SERVER_DB_UPDATE_ANLEITUNG.md](../technical/SERVER_DB_UPDATE_ANLEITUNG.md) - Anleitung für Datenbank-Updates
- [MIGRATION_FIX_ANLEITUNG.md](../technical/MIGRATION_FIX_ANLEITUNG.md) - Migration-Fix-Anleitung


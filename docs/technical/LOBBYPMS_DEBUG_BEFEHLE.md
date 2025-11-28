# LobbyPMS Import - Debug-Befehle

**Datum:** 2025-01-27  
**Zweck:** Prüfen warum Reservierungen seit gestern nicht mehr importiert werden

---

## 1. Datenbank: Letzte Sync-Zeit prüfen

### Prisma Studio öffnen:
```bash
cd backend
npx prisma studio
```
Dann im Browser: `http://localhost:5555` → Branch-Tabelle → Branch 3 und 4 → `lobbyPmsLastSyncAt` prüfen

### Oder direkt per SQL (PostgreSQL):
```bash
# Verbindung zur Datenbank (Anpassen falls nötig)
psql -h localhost -U postgres -d intranet

# Oder wenn .env vorhanden:
# DATABASE_URL aus .env verwenden
```

**SQL-Abfragen:**
```sql
-- Prüfe letzte Sync-Zeit für Branch 3 (Manila) und 4 (Parque Poblado)
SELECT id, name, "lobbyPmsLastSyncAt", "lobbyPmsSettings"
FROM "Branch"
WHERE id IN (3, 4);

-- Prüfe letzte importierte Reservierungen
SELECT 
  id,
  "lobbyReservationId",
  "guestName",
  "checkInDate",
  "createdAt",
  "branchId"
FROM "Reservation"
WHERE "branchId" IN (3, 4)
ORDER BY "createdAt" DESC
LIMIT 20;

-- Prüfe Sync-History (letzte 20 Einträge)
SELECT 
  id,
  "reservationId",
  "syncType",
  "errorMessage",
  "createdAt"
FROM "ReservationSyncHistory"
ORDER BY "createdAt" DESC
LIMIT 20;
```

---

## 2. Server-Logs prüfen

### Wenn Server lokal läuft:
```bash
# Im Terminal wo der Server läuft nach folgenden Logs suchen:
# - [LobbyPmsReservationScheduler]
# - [LobbyPmsSync]
# - [LobbyPMS]
```

### Logs filtern (wenn in Datei):
```bash
# Windows PowerShell:
Get-Content backend\logs\*.log | Select-String "LobbyPmsReservationScheduler|LobbyPmsSync|LobbyPMS"

# Git Bash:
grep -r "LobbyPmsReservationScheduler\|LobbyPmsSync\|LobbyPMS" backend/logs/
```

### Letzte Scheduler-Ausführung prüfen:
```bash
# Suche nach letzten Scheduler-Logs
grep -r "LobbyPmsReservationScheduler" . | tail -50
```

---

## 3. API-Response testen (manuell)

### Test-Script erstellen (temporär):
```bash
cd backend
```

**Erstelle Datei:** `test-api-response.ts`
```typescript
import { LobbyPmsService } from './src/services/lobbyPmsService';
import { prisma } from './src/utils/prisma';

async function testApiResponse() {
  try {
    // Test für Branch 3 (Manila)
    const service = await LobbyPmsService.createForBranch(3);
    
    // Hole erste Seite Reservierungen
    const reservations = await (service as any).axiosInstance.get('/api/v1/bookings', {
      params: {
        per_page: 5,
        page: 1,
        property_id: (service as any).propertyId
      }
    });
    
    console.log('=== API RESPONSE STRUKTUR ===');
    console.log(JSON.stringify(reservations.data, null, 2));
    
    // Prüfe ob creation_date vorhanden ist
    if (reservations.data?.data && Array.isArray(reservations.data.data)) {
      const firstReservation = reservations.data.data[0];
      console.log('\n=== ERSTE RESERVIERUNG ===');
      console.log('Hat creation_date?', !!firstReservation.creation_date);
      console.log('creation_date Wert:', firstReservation.creation_date);
      console.log('Alle Felder:', Object.keys(firstReservation));
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Fehler:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

testApiResponse();
```

**Ausführen:**
```bash
npx ts-node backend/test-api-response.ts
```

---

## 4. Scheduler-Status prüfen

### Prüfe ob Scheduler läuft (im Code):
```bash
# Suche nach Scheduler-Start-Log
grep -r "LobbyPmsReservationScheduler.*gestartet" .
```

### Manueller Trigger (API-Endpoint falls vorhanden):
```bash
# Prüfe ob es einen manuellen Trigger-Endpoint gibt
curl -X POST http://localhost:5000/api/lobby-pms/sync-reservations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"startDate": "2025-01-26T00:00:00Z"}'
```

---

## 5. Branch-Konfiguration prüfen

### Prisma Studio:
- Branch-Tabelle → Branch 3 und 4
- Prüfe `lobbyPmsSettings`:
  - `apiKey` vorhanden?
  - `syncEnabled` = true?
  - `property_id` vorhanden?

### Oder per SQL:
```sql
-- Prüfe Branch-Konfiguration
SELECT 
  id,
  name,
  "lobbyPmsSettings",
  "lobbyPmsLastSyncAt",
  "organizationId"
FROM "Branch"
WHERE id IN (3, 4);
```

---

## 6. Prüfe ob creation_date in API-Response vorhanden ist

### Direkter API-Test (mit API-Key):
```bash
# Ersetze API_KEY und API_URL mit echten Werten
API_KEY="dein-api-key"
API_URL="https://api.lobbypms.com"

curl -X GET "${API_URL}/api/v1/bookings?per_page=5&page=1" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" | jq '.data[0] | {creation_date, id, guest_name}'
```

---

## 7. Prüfe Filter-Logik im Code

### Test ob creation_date gefiltert wird:
```bash
# Suche nach allen Stellen wo creation_date verwendet wird
grep -rn "creation_date" backend/src/services/lobbyPmsService.ts
```

**Erwartete Ausgabe:**
- Zeile 471: `if (!reservation.creation_date)`
- Zeile 474: `const creationDate = new Date(reservation.creation_date);`

---

## 8. Prüfe letzte erfolgreiche Imports

### SQL-Abfrage:
```sql
-- Letzte 10 erfolgreich importierte Reservierungen
SELECT 
  r.id,
  r."lobbyReservationId",
  r."guestName",
  r."checkInDate",
  r."createdAt",
  r."branchId",
  h."syncType",
  h."createdAt" as "syncCreatedAt"
FROM "Reservation" r
LEFT JOIN "ReservationSyncHistory" h ON h."reservationId" = r.id
WHERE r."branchId" IN (3, 4)
  AND h."syncType" = 'updated'
ORDER BY h."createdAt" DESC
LIMIT 10;
```

---

## 9. Prüfe ob Scheduler überhaupt läuft

### Im Server-Code prüfen:
```bash
# Suche nach Scheduler-Start
grep -rn "LobbyPmsReservationScheduler.start" backend/src/
```

**Erwartet:** Sollte in `backend/src/app.ts` Zeile 161 sein

### Prüfe ob Server läuft:
```bash
# Windows:
netstat -ano | findstr :5000

# Oder:
curl http://localhost:5000/api/test-route
```

---

## 10. Debug: Manueller Sync-Test

### Erstelle Test-Script: `test-manual-sync.ts`
```typescript
import { LobbyPmsReservationSyncService } from './src/services/lobbyPmsReservationSyncService';
import { prisma } from './src/utils/prisma';

async function testManualSync() {
  try {
    console.log('=== MANUELLER SYNC TEST ===');
    
    // Test für Branch 3
    const startDate = new Date('2025-01-26T00:00:00Z');
    console.log('StartDate:', startDate.toISOString());
    
    const syncedCount = await LobbyPmsReservationSyncService.syncReservationsForBranch(3, startDate);
    
    console.log(`\n✅ Sync abgeschlossen: ${syncedCount} Reservierungen synchronisiert`);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Fehler:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

testManualSync();
```

**Ausführen:**
```bash
npx ts-node backend/test-manual-sync.ts
```

---

## Checkliste der Prüfungen:

- [ ] 1. `lobbyPmsLastSyncAt` in Datenbank prüfen (wann war letzter Sync?)
- [ ] 2. Server-Logs nach Scheduler-Ausführungen durchsuchen
- [ ] 3. API-Response testen: Hat `creation_date` Feld?
- [ ] 4. Scheduler-Status: Läuft er überhaupt?
- [ ] 5. Branch-Konfiguration: API-Key und syncEnabled prüfen
- [ ] 6. Letzte importierte Reservierungen prüfen
- [ ] 7. Filter-Logik im Code prüfen
- [ ] 8. Manueller Sync-Test durchführen

---

**Wichtig:** Nach jeder Prüfung die Ergebnisse dokumentieren!


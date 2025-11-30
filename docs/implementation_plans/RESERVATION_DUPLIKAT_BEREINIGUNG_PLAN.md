# Reservation Duplikat-Bereinigung - Plan

## Datum
2025-01-27

## Überblick
Erstellung eines Scripts zur Bereinigung von Duplikaten in Reservationen. Duplikate werden identifiziert, wenn alle Felder gleich sind (inklusive `lobbyReservationId`), und es wird nur eine Reservation pro Duplikat-Gruppe behalten.

## Anforderung
- **Alle Reservationen** nach Duplikaten durchsuchen
- **Duplikat-Kriterium:** Alles gleich, inklusive `lobbyReservationId`
- **Aktion:** Duplikate finden und löschen, sodass nur noch 1x vorhanden
- **Nichts anderes löschen** oder überschreiben
- **Nur Plan erstellen**, keine Umsetzung

---

## 1. Analyse: Reservation-Struktur

### 1.1 Datenbank-Schema
**Datei:** `backend/prisma/schema.prisma` (Zeile 1106-1157)

**Wichtige Felder:**
- `id` - Primary Key (autoincrement)
- `lobbyReservationId` - UNIQUE (kann NULL sein)
- `guestName` - String (NOT NULL)
- `guestEmail` - String? (optional)
- `guestPhone` - String? (optional)
- `checkInDate` - DateTime (NOT NULL)
- `checkOutDate` - DateTime (NOT NULL)
- `organizationId` - Int (NOT NULL)
- `branchId` - Int? (optional)
- Weitere Felder: `status`, `paymentStatus`, `amount`, `currency`, etc.

### 1.2 Duplikat-Identifikation

**Problem:** `lobbyReservationId` ist UNIQUE, aber der Benutzer sagt, es gibt Duplikate mit gleicher `lobbyReservationId`.

**Mögliche Ursachen:**
1. UNIQUE Constraint wurde umgangen (z.B. durch direkte SQL-Inserts)
2. Mehrere Reservationen mit NULL `lobbyReservationId`, aber alle anderen Felder gleich
3. Datenbank-Constraint wurde temporär entfernt

**Duplikat-Kriterien:**
- **Primär:** Gleiche `lobbyReservationId` (wenn vorhanden)
- **Sekundär:** Alle relevanten Felder gleich (wenn `lobbyReservationId` NULL ist)

### 1.3 Abhängige Daten
**Datei:** `backend/prisma/schema.prisma`

**Cascade Delete:**
- `ReservationSyncHistory` - `onDelete: Cascade` (Zeile 1162)
- `ReservationNotificationLog` - `onDelete: Cascade` (Zeile 1175)
- `WhatsAppMessage` - Keine explizite Cascade-Definition (zu prüfen)
- `TourReservation` - Keine explizite Cascade-Definition (zu prüfen)

**Manuell zu prüfen:**
- `Task` - `taskId` (optional, sollte nicht gelöscht werden)
- `WorkTimeTask` - Könnte Reservation-Referenzen haben (zu prüfen)

---

## 2. Plan: Script-Erstellung

### 2.1 Script-Name
**Datei:** `backend/scripts/cleanup_reservation_duplicates.ts`

### 2.2 Funktionalität

#### Phase 1: Duplikat-Identifikation

**1.1 Duplikate nach `lobbyReservationId`:**
```typescript
// Finde alle Reservationen mit gleicher lobbyReservationId (wenn vorhanden)
const reservationsWithLobbyId = await prisma.reservation.findMany({
  where: {
    lobbyReservationId: { not: null }
  },
  orderBy: { createdAt: 'asc' }
});

// Gruppiere nach lobbyReservationId
const groupedByLobbyId = new Map<string, number[]>();
for (const res of reservationsWithLobbyId) {
  const key = res.lobbyReservationId!;
  if (!groupedByLobbyId.has(key)) {
    groupedByLobbyId.set(key, []);
  }
  groupedByLobbyId.get(key)!.push(res.id);
}

// Finde Duplikate (mehr als 1 Eintrag pro lobbyReservationId)
const duplicatesByLobbyId: Array<{ lobbyReservationId: string; ids: number[] }> = [];
for (const [lobbyId, ids] of groupedByLobbyId.entries()) {
  if (ids.length > 1) {
    duplicatesByLobbyId.push({ lobbyReservationId: lobbyId, ids });
  }
}
```

**1.2 Duplikate nach allen relevanten Feldern (wenn `lobbyReservationId` NULL):**
```typescript
// Finde alle Reservationen ohne lobbyReservationId
const reservationsWithoutLobbyId = await prisma.reservation.findMany({
  where: {
    lobbyReservationId: null
  },
  orderBy: { createdAt: 'asc' }
});

// Erstelle Vergleichs-Key aus allen relevanten Feldern
function createComparisonKey(reservation: Reservation): string {
  return [
    reservation.guestName,
    reservation.guestEmail || '',
    reservation.guestPhone || '',
    reservation.checkInDate.toISOString(),
    reservation.checkOutDate.toISOString(),
    reservation.organizationId,
    reservation.branchId || '',
    reservation.status,
    reservation.paymentStatus,
    reservation.amount?.toString() || '',
    reservation.currency || ''
  ].join('|');
}

// Gruppiere nach Vergleichs-Key
const groupedByKey = new Map<string, number[]>();
for (const res of reservationsWithoutLobbyId) {
  const key = createComparisonKey(res);
  if (!groupedByKey.has(key)) {
    groupedByKey.set(key, []);
  }
  groupedByKey.get(key)!.push(res.id);
}

// Finde Duplikate (mehr als 1 Eintrag pro Key)
const duplicatesByKey: Array<{ key: string; ids: number[] }> = [];
for (const [key, ids] of groupedByKey.entries()) {
  if (ids.length > 1) {
    duplicatesByKey.push({ key, ids });
  }
}
```

#### Phase 2: Duplikat-Bereinigung

**2.1 Welche Reservation behalten?**
- **Strategie:** Behalte die älteste Reservation (niedrigste `id` oder frühestes `createdAt`)
- **Begründung:** Älteste Reservation hat meist die vollständigsten Daten

**2.2 Lösch-Logik:**
```typescript
async function cleanupDuplicates(dryRun: boolean) {
  let totalDeleted = 0;
  let totalKept = 0;

  // 1. Bereinige Duplikate nach lobbyReservationId
  for (const duplicate of duplicatesByLobbyId) {
    const sortedIds = [...duplicate.ids].sort((a, b) => a - b);
    const toKeep = sortedIds[0];
    const toDelete = sortedIds.slice(1);

    totalKept += 1;
    totalDeleted += toDelete.length;

    if (dryRun) {
      console.log(`[DRY-RUN] Würde löschen: ${toDelete.length} Duplikate von lobbyReservationId "${duplicate.lobbyReservationId}" (IDs: ${toDelete.join(', ')})`);
      console.log(`[DRY-RUN] Würde behalten: ID ${toKeep}`);
    } else {
      await prisma.reservation.deleteMany({
        where: { id: { in: toDelete } }
      });
      console.log(`✓ ${toDelete.length} Duplikate gelöscht von lobbyReservationId "${duplicate.lobbyReservationId}"`);
    }
  }

  // 2. Bereinige Duplikate nach Vergleichs-Key
  for (const duplicate of duplicatesByKey) {
    const sortedIds = [...duplicate.ids].sort((a, b) => a - b);
    const toKeep = sortedIds[0];
    const toDelete = sortedIds.slice(1);

    totalKept += 1;
    totalDeleted += toDelete.length;

    if (dryRun) {
      console.log(`[DRY-RUN] Würde löschen: ${toDelete.length} Duplikate (IDs: ${toDelete.join(', ')})`);
      console.log(`[DRY-RUN] Würde behalten: ID ${toKeep}`);
    } else {
      await prisma.reservation.deleteMany({
        where: { id: { in: toDelete } }
      });
      console.log(`✓ ${toDelete.length} Duplikate gelöscht`);
    }
  }

  return { deleted: totalDeleted, kept: totalKept };
}
```

### 2.3 Vollständiges Script-Struktur

```typescript
#!/usr/bin/env ts-node
/**
 * Bereinigt Duplikate in Reservationen
 * 
 * Duplikat-Kriterium:
 * - Gleiche lobbyReservationId (wenn vorhanden)
 * - Oder alle relevanten Felder gleich (wenn lobbyReservationId NULL)
 * 
 * Behalten: Ältester Eintrag (niedrigste ID)
 * 
 * Verwendung:
 *   npx ts-node scripts/cleanup_reservation_duplicates.ts          # Normal-Modus
 *   npx ts-node scripts/cleanup_reservation_duplicates.ts --dry-run # Dry-Run Modus
 */

import { PrismaClient, Reservation } from '@prisma/client';

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');

// ... Implementierung ...
```

---

## 3. Sicherheitsmaßnahmen

### 3.1 Dry-Run Modus
- Script kann mit `--dry-run` Flag ausgeführt werden
- Zeigt was gelöscht würde, ohne tatsächlich zu löschen
- Ermöglicht Review vor tatsächlicher Bereinigung

### 3.2 Logging
- Detailliertes Logging aller Aktionen
- Zeigt Anzahl gefundener Duplikate
- Zeigt welche Reservationen gelöscht werden
- Zeigt welche Reservationen behalten werden

### 3.3 Abhängige Daten
- **Cascade Delete:** `ReservationSyncHistory`, `ReservationNotificationLog` werden automatisch gelöscht
- **Zu prüfen:** `WhatsAppMessage`, `TourReservation` - müssen manuell geprüft werden
- **Nicht löschen:** `Task` - `taskId` sollte nicht gelöscht werden (nur Referenz entfernen)

### 3.4 Backup-Hinweis
- Script sollte Hinweis auf Datenbank-Backup ausgeben
- Empfehlung: Backup vor Ausführung erstellen

---

## 4. Ausführungsreihenfolge

### Schritt 1: Analyse-Script (optional)
**Datei:** `backend/scripts/analyze_reservation_duplicates.ts`

**Funktionalität:**
- Analysiere alle Reservationen auf Duplikate
- Zeige Anzahl der Duplikate
- Zeige Beispiele von Duplikat-Gruppen
- Zeige Statistiken

**Ausgabe:**
- Konsolen-Output mit detaillierten Statistiken
- Anzahl Duplikate nach `lobbyReservationId`
- Anzahl Duplikate nach Vergleichs-Key

### Schritt 2: Cleanup-Script im Dry-Run Modus
```bash
npx ts-node backend/scripts/cleanup_reservation_duplicates.ts --dry-run
```

**Erwartete Ausgabe:**
- Zeigt alle gefundenen Duplikate
- Zeigt welche Reservationen gelöscht würden
- Zeigt welche Reservationen behalten würden
- Zeigt Zusammenfassung

### Schritt 3: Backup erstellen
- Datenbank-Backup erstellen
- Optional: Export der betroffenen Reservationen als JSON

### Schritt 4: Cleanup-Script tatsächlich ausführen
```bash
npx ts-node backend/scripts/cleanup_reservation_duplicates.ts
```

**Erwartete Ausgabe:**
- Zeigt alle gelöschten Duplikate
- Zeigt Zusammenfassung (gelöscht, behalten)
- Zeigt finale Statistiken

---

## 5. Erwartete Ergebnisse

### Nach Bereinigung:
- Keine Duplikate mehr in Reservationen (nach `lobbyReservationId`)
- Keine Duplikate mehr in Reservationen (nach Vergleichs-Key)
- Alle abhängigen Daten korrekt bereinigt (Cascade Delete)
- Alle Reservationen haben eindeutige `lobbyReservationId` (wenn vorhanden)

### Statistiken die erfasst werden:
- Anzahl Duplikate vor Bereinigung (nach `lobbyReservationId`)
- Anzahl Duplikate vor Bereinigung (nach Vergleichs-Key)
- Anzahl gelöschter Reservationen
- Anzahl behaltener Reservationen
- Anzahl abhängiger Einträge die mitgelöscht wurden

---

## 6. Risiken und Mitigation

### Risiko 1: Falsche Duplikat-Erkennung
- **Mitigation:** Kriterien genau definieren, Dry-Run Modus verwenden
- **Mitigation:** Vergleichs-Key nur für Reservationen ohne `lobbyReservationId` verwenden

### Risiko 2: Abhängige Daten verloren
- **Mitigation:** Prüfe alle Abhängigkeiten, Cascade Delete funktioniert automatisch
- **Mitigation:** `Task`-Referenzen sollten nicht gelöscht werden (nur `taskId` auf NULL setzen, falls nötig)

### Risiko 3: Datenverlust
- **Mitigation:** Backup vor Bereinigung, Dry-Run Modus, Logging
- **Mitigation:** Behalte immer die älteste Reservation (meist vollständigste Daten)

### Risiko 4: UNIQUE Constraint Verletzung
- **Mitigation:** Nach Bereinigung sollte `lobbyReservationId` wieder eindeutig sein
- **Mitigation:** Prüfe nach Bereinigung, ob UNIQUE Constraint wieder funktioniert

---

## 7. Vergleichs-Key Definition

### Relevante Felder für Vergleichs-Key (wenn `lobbyReservationId` NULL):

**Primäre Felder (müssen gleich sein):**
- `guestName`
- `checkInDate`
- `checkOutDate`
- `organizationId`

**Sekundäre Felder (sollten gleich sein):**
- `guestEmail`
- `guestPhone`
- `branchId`
- `status`
- `paymentStatus`
- `amount`
- `currency`

**Nicht relevante Felder (können unterschiedlich sein):**
- `id` (Primary Key)
- `createdAt` (wird für Sortierung verwendet)
- `updatedAt` (wird automatisch aktualisiert)
- `arrivalTime` (optional, kann unterschiedlich sein)
- `roomNumber` (kann sich ändern)
- `roomDescription` (kann sich ändern)
- `paymentLink` (kann sich ändern)
- `doorPin` (kann sich ändern)
- `ttlLockPassword` (kann sich ändern)
- `onlineCheckInCompleted` (kann sich ändern)
- `sireRegistered` (kann sich ändern)
- `taskId` (kann unterschiedlich sein)

---

## 8. Implementierungsstatus

- ⏳ **Geplant:** Script-Erstellung
- ⏳ **Ausstehend:** Analyse-Script (optional)
- ⏳ **Ausstehend:** Cleanup-Script
- ⏳ **Ausstehend:** Testen und validieren

---

## 9. Nächste Schritte

1. **Script erstellen:**
   - `backend/scripts/cleanup_reservation_duplicates.ts`
   - Optional: `backend/scripts/analyze_reservation_duplicates.ts`

2. **Testen:**
   - Mit kleinen Datenmengen testen
   - Dry-Run Modus testen
   - Prüfen, ob abhängige Daten korrekt gelöscht werden

3. **Ausführung auf Produktivserver:**
   - Backup erstellen
   - Dry-Run Modus ausführen
   - Review der Ergebnisse
   - Tatsächliche Bereinigung durchführen

---

## 10. Zusammenfassung

### Was wird gemacht:
- Alle Reservationen werden nach Duplikaten durchsucht
- Duplikate werden identifiziert nach:
  - Gleiche `lobbyReservationId` (wenn vorhanden)
  - Oder alle relevanten Felder gleich (wenn `lobbyReservationId` NULL)
- Duplikate werden gelöscht, nur eine Reservation pro Gruppe bleibt erhalten
- Älteste Reservation wird behalten (niedrigste ID)

### Was wird nicht gemacht:
- Keine anderen Daten werden gelöscht
- Keine Reservationen werden überschrieben
- Keine Tasks werden gelöscht (nur Referenz entfernt, falls nötig)

### Sicherheit:
- Dry-Run Modus verfügbar
- Detailliertes Logging
- Backup-Hinweis
- Cascade Delete für abhängige Daten


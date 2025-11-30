# Reservation Duplikat-Bereinigung - Direkte SQL-Befehle

## Datum
2025-01-27

## Überblick
Direkte SQL-Befehle zur Analyse und Bereinigung von Duplikaten in Reservationen. Diese Befehle können direkt auf dem Produktivserver ausgeführt werden.

---

## ⚠️ WICHTIG: Vorbereitung

### 1. Backup erstellen
```bash
# Auf dem Produktivserver
pg_dump -h localhost -U postgres -d intranet > backup_before_duplicate_cleanup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Verbindung zur Datenbank
```bash
# PostgreSQL CLI
psql -h localhost -U postgres -d intranet

# Oder via Prisma Studio
npx prisma studio
```

---

## SCHRITT 1: Analyse - Duplikate finden

### 1.1 Duplikate nach `lobbyReservationId` (wenn vorhanden)

**Befehl:**
```sql
-- Finde alle Duplikate nach lobbyReservationId
SELECT 
    "lobbyReservationId",
    COUNT(*) as anzahl,
    ARRAY_AGG(id ORDER BY id) as ids,
    ARRAY_AGG("createdAt" ORDER BY id) as created_dates
FROM "Reservation"
WHERE "lobbyReservationId" IS NOT NULL
GROUP BY "lobbyReservationId"
HAVING COUNT(*) > 1
ORDER BY anzahl DESC;
```

**Erwartete Ausgabe:**
- Zeigt alle `lobbyReservationId` die mehrfach vorkommen
- Zeigt Anzahl der Duplikate
- Zeigt alle IDs der Duplikate
- Zeigt Erstellungsdaten

**⚠️ HINWEIS:** Da `lobbyReservationId` ein UNIQUE Constraint hat, sollten hier normalerweise KEINE Duplikate erscheinen. Falls doch, ist die Datenbank-Constraint verletzt.

### 1.2 Duplikate nach allen relevanten Feldern (wenn `lobbyReservationId` NULL)

**Befehl:**
```sql
-- Finde alle Duplikate nach relevanten Feldern (wenn lobbyReservationId NULL)
SELECT 
    "guestName",
    "checkInDate",
    "checkOutDate",
    "organizationId",
    COALESCE("guestEmail", '') as guest_email,
    COALESCE("guestPhone", '') as guest_phone,
    COALESCE("branchId"::text, '') as branch_id,
    "status",
    "paymentStatus",
    COALESCE("amount"::text, '') as amount,
    COALESCE("currency", '') as currency,
    COUNT(*) as anzahl,
    ARRAY_AGG(id ORDER BY id) as ids,
    ARRAY_AGG("createdAt" ORDER BY id) as created_dates
FROM "Reservation"
WHERE "lobbyReservationId" IS NULL
GROUP BY 
    "guestName",
    "checkInDate",
    "checkOutDate",
    "organizationId",
    COALESCE("guestEmail", ''),
    COALESCE("guestPhone", ''),
    COALESCE("branchId"::text, ''),
    "status",
    "paymentStatus",
    COALESCE("amount"::text, ''),
    COALESCE("currency", '')
HAVING COUNT(*) > 1
ORDER BY anzahl DESC;
```

**Erwartete Ausgabe:**
- Zeigt alle Kombinationen von Feldern die mehrfach vorkommen
- Zeigt Anzahl der Duplikate
- Zeigt alle IDs der Duplikate
- Zeigt Erstellungsdaten

### 1.3 Zusammenfassung - Anzahl Duplikate

**Befehl:**
```sql
-- Gesamtanzahl Duplikate (nach lobbyReservationId)
SELECT 
    COUNT(*) as anzahl_duplikat_gruppen,
    SUM(cnt - 1) as anzahl_zu_loeschende_duplikate
FROM (
    SELECT 
        "lobbyReservationId",
        COUNT(*) as cnt
    FROM "Reservation"
    WHERE "lobbyReservationId" IS NOT NULL
    GROUP BY "lobbyReservationId"
    HAVING COUNT(*) > 1
) sub;

-- Gesamtanzahl Duplikate (nach Vergleichs-Key, wenn lobbyReservationId NULL)
SELECT 
    COUNT(*) as anzahl_duplikat_gruppen,
    SUM(cnt - 1) as anzahl_zu_loeschende_duplikate
FROM (
    SELECT 
        "guestName",
        "checkInDate",
        "checkOutDate",
        "organizationId",
        COALESCE("guestEmail", '') as guest_email,
        COALESCE("guestPhone", '') as guest_phone,
        COALESCE("branchId"::text, '') as branch_id,
        "status",
        "paymentStatus",
        COALESCE("amount"::text, '') as amount,
        COALESCE("currency", '') as currency,
        COUNT(*) as cnt
    FROM "Reservation"
    WHERE "lobbyReservationId" IS NULL
    GROUP BY 
        "guestName",
        "checkInDate",
        "checkOutDate",
        "organizationId",
        COALESCE("guestEmail", ''),
        COALESCE("guestPhone", ''),
        COALESCE("branchId"::text, ''),
        "status",
        "paymentStatus",
        COALESCE("amount"::text, ''),
        COALESCE("currency", '')
    HAVING COUNT(*) > 1
) sub;
```

---

## SCHRITT 2: Bereinigung - Duplikate löschen

### ⚠️ WICHTIG: Vor dem Löschen prüfen!

**1. Prüfe die Ergebnisse aus Schritt 1**
- Sind die gefundenen Duplikate wirklich Duplikate?
- Welche Reservation soll behalten werden? (Normalerweise die mit niedrigster ID)

**2. Teste mit einem einzelnen Duplikat:**
```sql
-- Beispiel: Prüfe ein spezifisches Duplikat
SELECT 
    id,
    "lobbyReservationId",
    "guestName",
    "checkInDate",
    "checkOutDate",
    "createdAt",
    "updatedAt"
FROM "Reservation"
WHERE "lobbyReservationId" = 'DEIN_LOBBY_RESERVATION_ID_HIER'
ORDER BY id;
```

### 2.1 Bereinigung - Duplikate nach `lobbyReservationId`

**⚠️ WICHTIG:** Diese Befehle löschen tatsächlich Daten! Nur ausführen, wenn du sicher bist!

**Befehl (behält älteste Reservation pro lobbyReservationId):**
```sql
-- Lösche Duplikate nach lobbyReservationId (behält älteste = niedrigste ID)
DELETE FROM "Reservation"
WHERE id IN (
    SELECT id
    FROM (
        SELECT 
            id,
            ROW_NUMBER() OVER (
                PARTITION BY "lobbyReservationId" 
                ORDER BY id ASC
            ) as rn
        FROM "Reservation"
        WHERE "lobbyReservationId" IS NOT NULL
    ) sub
    WHERE rn > 1
);
```

**Prüfe vorher, was gelöscht würde:**
```sql
-- DRY-RUN: Zeige was gelöscht würde (ohne zu löschen)
SELECT 
    id,
    "lobbyReservationId",
    "guestName",
    "checkInDate",
    "createdAt"
FROM (
    SELECT 
        id,
        "lobbyReservationId",
        "guestName",
        "checkInDate",
        "createdAt",
        ROW_NUMBER() OVER (
            PARTITION BY "lobbyReservationId" 
            ORDER BY id ASC
        ) as rn
    FROM "Reservation"
    WHERE "lobbyReservationId" IS NOT NULL
) sub
WHERE rn > 1
ORDER BY "lobbyReservationId", id;
```

### 2.2 Bereinigung - Duplikate nach Vergleichs-Key (wenn `lobbyReservationId` NULL)

**⚠️ WICHTIG:** Diese Befehle löschen tatsächlich Daten! Nur ausführen, wenn du sicher bist!

**Befehl (behält älteste Reservation pro Vergleichs-Key):**
```sql
-- Lösche Duplikate nach Vergleichs-Key (behält älteste = niedrigste ID)
DELETE FROM "Reservation"
WHERE id IN (
    SELECT id
    FROM (
        SELECT 
            id,
            ROW_NUMBER() OVER (
                PARTITION BY 
                    "guestName",
                    "checkInDate",
                    "checkOutDate",
                    "organizationId",
                    COALESCE("guestEmail", ''),
                    COALESCE("guestPhone", ''),
                    COALESCE("branchId"::text, ''),
                    "status",
                    "paymentStatus",
                    COALESCE("amount"::text, ''),
                    COALESCE("currency", '')
                ORDER BY id ASC
            ) as rn
        FROM "Reservation"
        WHERE "lobbyReservationId" IS NULL
    ) sub
    WHERE rn > 1
);
```

**Prüfe vorher, was gelöscht würde:**
```sql
-- DRY-RUN: Zeige was gelöscht würde (ohne zu löschen)
SELECT 
    id,
    "guestName",
    "checkInDate",
    "checkOutDate",
    "organizationId",
    "createdAt"
FROM (
    SELECT 
        id,
        "guestName",
        "checkInDate",
        "checkOutDate",
        "organizationId",
        "createdAt",
        ROW_NUMBER() OVER (
            PARTITION BY 
                "guestName",
                "checkInDate",
                "checkOutDate",
                "organizationId",
                COALESCE("guestEmail", ''),
                COALESCE("guestPhone", ''),
                COALESCE("branchId"::text, ''),
                "status",
                "paymentStatus",
                COALESCE("amount"::text, ''),
                COALESCE("currency", '')
            ORDER BY id ASC
        ) as rn
    FROM "Reservation"
    WHERE "lobbyReservationId" IS NULL
) sub
WHERE rn > 1
ORDER BY "guestName", "checkInDate", id;
```

---

## SCHRITT 3: Verifikation - Prüfe ob Bereinigung erfolgreich war

### 3.1 Prüfe ob noch Duplikate vorhanden sind

**Befehl:**
```sql
-- Prüfe ob noch Duplikate nach lobbyReservationId vorhanden sind
SELECT 
    "lobbyReservationId",
    COUNT(*) as anzahl
FROM "Reservation"
WHERE "lobbyReservationId" IS NOT NULL
GROUP BY "lobbyReservationId"
HAVING COUNT(*) > 1;
-- Sollte 0 Zeilen zurückgeben

-- Prüfe ob noch Duplikate nach Vergleichs-Key vorhanden sind
SELECT 
    "guestName",
    "checkInDate",
    "checkOutDate",
    "organizationId",
    COUNT(*) as anzahl
FROM "Reservation"
WHERE "lobbyReservationId" IS NULL
GROUP BY 
    "guestName",
    "checkInDate",
    "checkOutDate",
    "organizationId",
    COALESCE("guestEmail", ''),
    COALESCE("guestPhone", ''),
    COALESCE("branchId"::text, ''),
    "status",
    "paymentStatus",
    COALESCE("amount"::text, ''),
    COALESCE("currency", '')
HAVING COUNT(*) > 1;
-- Sollte 0 Zeilen zurückgeben
```

### 3.2 Prüfe abhängige Daten

**Befehl:**
```sql
-- Prüfe ob ReservationSyncHistory noch auf gelöschte Reservationen verweist
SELECT COUNT(*) as orphaned_sync_history
FROM "ReservationSyncHistory" rs
LEFT JOIN "Reservation" r ON rs."reservationId" = r.id
WHERE r.id IS NULL;
-- Sollte 0 zurückgeben (Cascade Delete sollte funktioniert haben)

-- Prüfe ob ReservationNotificationLog noch auf gelöschte Reservationen verweist
SELECT COUNT(*) as orphaned_notification_logs
FROM "ReservationNotificationLog" rn
LEFT JOIN "Reservation" r ON rn."reservationId" = r.id
WHERE r.id IS NULL;
-- Sollte 0 zurückgeben (Cascade Delete sollte funktioniert haben)
```

---

## SCHRITT 4: Zusammenfassung - Statistiken

### 4.1 Finale Statistiken

**Befehl:**
```sql
-- Gesamtanzahl Reservationen
SELECT COUNT(*) as gesamt_reservationen FROM "Reservation";

-- Reservationen mit lobbyReservationId
SELECT COUNT(*) as reservationen_mit_lobby_id 
FROM "Reservation" 
WHERE "lobbyReservationId" IS NOT NULL;

-- Reservationen ohne lobbyReservationId
SELECT COUNT(*) as reservationen_ohne_lobby_id 
FROM "Reservation" 
WHERE "lobbyReservationId" IS NULL;

-- Eindeutige lobbyReservationIds
SELECT COUNT(DISTINCT "lobbyReservationId") as eindeutige_lobby_ids
FROM "Reservation"
WHERE "lobbyReservationId" IS NOT NULL;
```

---

## ⚠️ WICHTIGE HINWEISE

### 1. Cascade Delete
- `ReservationSyncHistory` wird automatisch gelöscht (Cascade Delete)
- `ReservationNotificationLog` wird automatisch gelöscht (Cascade Delete)
- `WhatsAppMessage` - Prüfe ob Cascade Delete aktiviert ist
- `TourReservation` - Prüfe ob Cascade Delete aktiviert ist

### 2. Task-Referenzen
- Wenn eine Reservation gelöscht wird, die eine `taskId` hat, wird der Task NICHT gelöscht
- Die `taskId` wird nur entfernt (Referenz wird gelöscht)

### 3. UNIQUE Constraint
- Nach der Bereinigung sollte `lobbyReservationId` wieder eindeutig sein
- Falls der UNIQUE Constraint verletzt war, sollte er nach der Bereinigung wieder funktionieren

### 4. Transaktion
- Alle DELETE-Befehle sollten in einer Transaktion ausgeführt werden
- Falls ein Fehler auftritt, kann die Transaktion zurückgerollt werden

**Beispiel mit Transaktion:**
```sql
BEGIN;

-- Führe DELETE-Befehle aus
DELETE FROM "Reservation" WHERE ...;

-- Prüfe Ergebnisse
SELECT ...;

-- Falls alles OK:
COMMIT;

-- Falls Fehler:
ROLLBACK;
```

---

## AUSFÜHRUNGSREIHENFOLGE

1. **Backup erstellen**
2. **Schritt 1: Analyse** - Duplikate finden
3. **Review** - Prüfe ob die gefundenen Duplikate wirklich Duplikate sind
4. **DRY-RUN** - Prüfe was gelöscht würde (ohne zu löschen)
5. **Schritt 2: Bereinigung** - Duplikate löschen (in Transaktion)
6. **Schritt 3: Verifikation** - Prüfe ob Bereinigung erfolgreich war
7. **Schritt 4: Zusammenfassung** - Finale Statistiken

---

## BEISPIEL-AUSFÜHRUNG

```sql
-- 1. Analyse
SELECT "lobbyReservationId", COUNT(*) as anzahl, ARRAY_AGG(id ORDER BY id) as ids
FROM "Reservation"
WHERE "lobbyReservationId" IS NOT NULL
GROUP BY "lobbyReservationId"
HAVING COUNT(*) > 1;

-- 2. DRY-RUN (was würde gelöscht werden?)
SELECT id, "lobbyReservationId", "guestName", "createdAt"
FROM (
    SELECT id, "lobbyReservationId", "guestName", "createdAt",
           ROW_NUMBER() OVER (PARTITION BY "lobbyReservationId" ORDER BY id ASC) as rn
    FROM "Reservation"
    WHERE "lobbyReservationId" IS NOT NULL
) sub
WHERE rn > 1;

-- 3. Bereinigung (in Transaktion)
BEGIN;
DELETE FROM "Reservation"
WHERE id IN (
    SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY "lobbyReservationId" ORDER BY id ASC) as rn
        FROM "Reservation"
        WHERE "lobbyReservationId" IS NOT NULL
    ) sub WHERE rn > 1
);
-- Prüfe Ergebnisse
SELECT COUNT(*) FROM "Reservation";
COMMIT;

-- 4. Verifikation
SELECT "lobbyReservationId", COUNT(*) as anzahl
FROM "Reservation"
WHERE "lobbyReservationId" IS NOT NULL
GROUP BY "lobbyReservationId"
HAVING COUNT(*) > 1;
-- Sollte 0 Zeilen zurückgeben
```


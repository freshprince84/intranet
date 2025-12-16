# Analyse: Filtergruppen für nicht-existierende Benutzer

## Problembeschreibung

Beim Ausführen von `deploy_to_server.sh` werden Filtergruppen für Benutzer erstellt, die nicht mehr existieren oder nicht mehr aktiv sind. Diese Filter bleiben in der Datenbank und werden nicht automatisch entfernt.

## Ursachenanalyse

### 1. Seed-Logik in `backend/prisma/seed.ts`

**Aktueller Ablauf (Zeile 2365-2390):**
```typescript
// Hole alle AKTIVEN Benutzer
const allUsers = await prisma.user.findMany({
  where: { active: true },
  ...
});

// Für jeden aktiven Benutzer Filter erstellen
for (const user of allUsers) {
  await createRoleAndUserFilters(user.id, organizationId);
}
```

**Problem in `createRoleAndUserFilters` (Zeile 2279-2358):**
- Die Funktion erstellt Filter für alle Benutzer in der `users` Liste (Zeile 2280)
- Die `users` Liste wird basierend auf `organizationId` und `active: true` gefiltert (Zeile 2120-2144)
- **ABER**: Es gibt KEINE Logik, die alte Filter löscht, die für Benutzer erstellt wurden, die nicht mehr in der Liste sind

### 2. Fehlende Cleanup-Logik

**Was passiert:**
1. Beim ersten Seed: Filter werden für Benutzer A, B, C erstellt
2. Benutzer B wird deaktiviert (`active: false`)
3. Beim nächsten Seed: Filter werden nur für Benutzer A, C erstellt
4. **Filter für Benutzer B bleibt in der Datenbank**

### 3. Filter-Struktur

**Filter werden gespeichert als:**
- `SavedFilter` mit `conditions` als JSON-String
- Bedingungen enthalten User-IDs im Format: `user-{id}` (z.B. `user-123`)
- Filter gehören zu einer `FilterGroup` mit Namen "Users"/"Benutzer"/"Usuarios"

**Beispiel-Filter-Bedingung:**
```json
{
  "column": "requestedBy",
  "operator": "equals",
  "value": "user-123"
}
```

## Identifikation nicht-existierender Filter

### Methode 1: Über Filter-Bedingungen

1. **Alle Filter in "Users"-Gruppen holen:**
   ```typescript
   const usersGroups = await prisma.filterGroup.findMany({
     where: {
       name: { in: ['Users', 'Benutzer', 'Usuarios'] }
     }
   });
   ```

2. **User-IDs aus Bedingungen extrahieren:**
   ```typescript
   const userIds: number[] = [];
   filters.forEach(filter => {
     const conditions = JSON.parse(filter.conditions);
     conditions.forEach(condition => {
       if (condition.value?.startsWith('user-')) {
         const userId = parseInt(condition.value.replace('user-', ''), 10);
         if (!isNaN(userId)) {
           userIds.push(userId);
         }
       }
     });
   });
   ```

3. **Prüfen, welche User noch existieren und aktiv sind:**
   ```typescript
   const existingUsers = await prisma.user.findMany({
     where: {
       id: { in: userIds },
       active: true
     },
     select: { id: true }
   });
   const existingUserIds = new Set(existingUsers.map(u => u.id));
   ```

4. **Filter identifizieren, die für nicht-existierende User erstellt wurden:**
   - Filter, deren User-IDs nicht in `existingUserIds` sind
   - Filter, deren User-IDs nicht in der Datenbank existieren

### Methode 2: Über Filter-Namen

**Problem:** Filter-Namen sind `firstName lastName` oder `username` (Zeile 2281)
- Wenn ein Benutzer gelöscht wird, bleibt der Filter-Name bestehen
- ABER: Der Name kann nicht eindeutig einem User zugeordnet werden (könnte Duplikate geben)

**Besser:** Methode 1 verwenden (über User-IDs in Bedingungen)

## Lösungsansätze

### Lösung 1: Cleanup-Logik im Seed (EMPFOHLEN)

**Vor dem Erstellen neuer Filter:**
1. Alle Filter in "Users"-Gruppen holen
2. User-IDs aus Bedingungen extrahieren
3. Prüfen, welche User noch existieren und aktiv sind
4. Filter löschen, die für nicht-existierende/inaktive User erstellt wurden

**Implementierung in `seed.ts` vor Zeile 2280:**
```typescript
// Cleanup: Lösche Filter für nicht-existierende/inaktive User
const allUserFilters = await prisma.savedFilter.findMany({
  where: {
    groupId: usersGroup.id
  }
});

// Extrahiere User-IDs aus Filter-Bedingungen
const userIdsInFilters: number[] = [];
for (const filter of allUserFilters) {
  try {
    const conditions = JSON.parse(filter.conditions);
    conditions.forEach((condition: any) => {
      if (condition.value && typeof condition.value === 'string' && condition.value.startsWith('user-')) {
        const userId = parseInt(condition.value.replace('user-', ''), 10);
        if (!isNaN(userId)) {
          userIdsInFilters.push(userId);
        }
      }
    });
  } catch (e) {
    // Ignoriere Fehler beim Parsen
  }
}

// Prüfe welche User noch existieren und aktiv sind
if (userIdsInFilters.length > 0) {
  const existingUsers = await prisma.user.findMany({
    where: {
      id: { in: userIdsInFilters },
      active: true
    },
    select: { id: true }
  });
  const existingUserIds = new Set(existingUsers.map(u => u.id));

  // Lösche Filter für nicht-existierende/inaktive User
  for (const filter of allUserFilters) {
    try {
      const conditions = JSON.parse(filter.conditions);
      const hasValidUser = conditions.some((condition: any) => {
        if (condition.value && typeof condition.value === 'string' && condition.value.startsWith('user-')) {
          const userId = parseInt(condition.value.replace('user-', ''), 10);
          return !isNaN(userId) && existingUserIds.has(userId);
        }
        return false;
      });

      if (!hasValidUser) {
        await prisma.savedFilter.delete({
          where: { id: filter.id }
        });
        console.log(`    🗑️  Filter "${filter.name}" gelöscht (User existiert nicht mehr)`);
      }
    } catch (e) {
      // Ignoriere Fehler
    }
  }
}
```

### Lösung 2: Separates Cleanup-Script

**Erstelle ein Script `backend/scripts/cleanupUserFilters.ts`:**
- Kann manuell ausgeführt werden
- Löscht alle Filter für nicht-existierende/inaktive User
- Kann auch in `deploy_to_server.sh` eingebunden werden

### Lösung 3: Erweiterte Prüfung beim Laden

**Bereits implementiert in `filterListCache.ts` (Zeile 154-196):**
- Filtert Filter für inaktive User beim Laden
- **ABER**: Filter bleiben in der Datenbank, werden nur nicht angezeigt

**Problem:** Diese Lösung verhindert nur die Anzeige, löscht aber nicht die Filter aus der DB

## Empfohlene Lösung

**Kombination aus Lösung 1 und 2:**

1. **Im Seed:** Cleanup-Logik vor dem Erstellen neuer Filter (Lösung 1)
2. **Separates Script:** Für manuelle Bereinigung (Lösung 2)
3. **Im Deploy-Script:** Optional Cleanup-Script ausführen

## Prävention

### Änderungen in `seed.ts`

**Vor Zeile 2280 (vor dem Erstellen neuer Filter):**
- Cleanup-Logik einfügen, die alte Filter für nicht-existierende User löscht

**Nach Zeile 2358 (nach dem Erstellen neuer Filter):**
- Optional: Nochmalige Prüfung, ob alle Filter gültig sind

### Änderungen in `deploy_to_server.sh`

**Optional:** Cleanup-Script vor dem Seed ausführen:
```bash
# Cleanup: Lösche Filter für nicht-existierende User
echo "🧹 Schritt 5.5: Filter-Cleanup..."
cd /var/www/intranet/backend
npx ts-node scripts/cleanupUserFilters.ts
echo "✅ Filter-Cleanup abgeschlossen"
echo ""
```

## Identifikation betroffener Filter

### SQL-Query zur Identifikation

```sql
-- Finde alle Filter in "Users"-Gruppen
SELECT 
  sf.id,
  sf.name,
  sf."userId",
  sf."tableId",
  sf.conditions,
  fg.name as group_name
FROM "SavedFilter" sf
JOIN "FilterGroup" fg ON sf."groupId" = fg.id
WHERE fg.name IN ('Users', 'Benutzer', 'Usuarios');
```

### Prisma-Query zur Identifikation

```typescript
// 1. Hole alle "Users"-Gruppen
const usersGroups = await prisma.filterGroup.findMany({
  where: {
    name: { in: ['Users', 'Benutzer', 'Usuarios'] }
  }
});

// 2. Hole alle Filter in diesen Gruppen
const allFilters = await prisma.savedFilter.findMany({
  where: {
    groupId: { in: usersGroups.map(g => g.id) }
  }
});

// 3. Extrahiere User-IDs und prüfe Existenz
// (siehe Methode 1 oben)
```

## Zusammenfassung

**Problem:**
- Filter für nicht-existierende/inaktive Benutzer bleiben in der Datenbank
- Werden beim Seed nicht gelöscht, nur neue Filter werden erstellt

**Ursache:**
- Fehlende Cleanup-Logik im Seed-Script
- Keine Prüfung auf nicht-existierende User vor dem Erstellen neuer Filter

**Lösung:**
1. Cleanup-Logik im Seed vor dem Erstellen neuer Filter
2. Separates Cleanup-Script für manuelle Bereinigung
3. Optional: Cleanup-Script im Deploy-Script ausführen

**Identifikation:**
- Über User-IDs in Filter-Bedingungen (Format: `user-{id}`)
- Prüfung, ob User noch existieren und aktiv sind

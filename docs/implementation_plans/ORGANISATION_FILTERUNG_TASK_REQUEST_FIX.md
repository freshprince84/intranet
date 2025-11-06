# Plan: Organisation-Filterung für Tasks und Requests korrigieren

**Erstellt:** 2025-01-XX  
**Status:** Planungsphase  
**Priorität:** HOCH

## Problem

Tasks und Requests werden organisationsübergreifend angezeigt, weil:
1. Tasks/Requests haben keine direkte `organizationId`-Spalte
2. Branches haben keine `organizationId`-Spalte
3. Der aktuelle Filter prüft nur, ob beteiligte User Rollen in der aktuellen Organisation haben (`some`)
4. Wenn User Rollen in mehreren Organisationen haben, werden Tasks/Requests in allen angezeigt

## Aktuelle Situation

### Task Schema
```prisma
model Task {
  id               Int      @id
  roleId           Int?     // Optional → Role.organizationId
  responsibleId    Int?
  qualityControlId Int      // Required
  branchId         Int      // Branch hat KEINE organizationId
}
```

### Request Schema
```prisma
model Request {
  id            Int      @id
  requesterId   Int      // Required
  responsibleId Int      // Required
  branchId      Int      // Branch hat KEINE organizationId
}
```

### Aktuelle Filterlogik (PROBLEMATISCH)

**Task-Filter:**
- Wenn `roleId` gesetzt: Filter nach `role.organizationId === req.organizationId` ✅
- Wenn `roleId` null: Filter nach:
  - `responsible` hat Rolle in Org ODER `responsibleId` ist null
  - UND `qualityControl` hat Rolle in Org ← **PROBLEM: `some` erlaubt mehrere Orgs**

**Request-Filter:**
- `requester` hat Rolle in Org ← **PROBLEM: `some` erlaubt mehrere Orgs**
- UND `responsible` hat Rolle in Org ← **PROBLEM: `some` erlaubt mehrere Orgs**

## Lösung: Option 1 - organizationId direkt hinzufügen (EMPFOHLEN)

### Vorteile
- ✅ Einfache, performante Filterung (`WHERE organizationId = ?`)
- ✅ Klare Zuordnung: Jeder Task/Request gehört zu genau einer Organisation
- ✅ Keine komplexen Relation-Queries nötig
- ✅ Bessere Performance bei großen Datenmengen

### Nachteile
- ⚠️ Erfordert Datenbank-Migration
- ⚠️ Erstellung von Tasks/Requests muss angepasst werden
- ⚠️ Bestehende Tasks/Requests müssen `organizationId` zugewiesen bekommen

### Implementierungsschritte

#### Schritt 1: Schema erweitern
```prisma
model Task {
  id               Int          @id
  organizationId   Int?         // NEU: Optional für Migration
  roleId           Int?
  responsibleId    Int?
  qualityControlId Int
  branchId         Int
  organization     Organization? @relation(fields: [organizationId], references: [id])
  // ... rest
}

model Request {
  id               Int          @id
  organizationId   Int?         // NEU: Optional für Migration
  requesterId      Int
  responsibleId    Int
  branchId         Int
  organization     Organization? @relation(fields: [organizationId], references: [id])
  // ... rest
}
```

#### Schritt 2: Migration erstellen
- Migration: `organizationId` als nullable hinzufügen
- Migration: Bestehende Tasks/Requests mit `organizationId` befüllen basierend auf:
  - Task: `roleId` → `role.organizationId` ODER `qualityControl` → dessen aktive Rolle → `organizationId`
  - Request: `requester` → dessen aktive Rolle → `organizationId`
- Migration: `organizationId` auf NOT NULL setzen (optional, aber empfohlen)

#### Schritt 3: Filterlogik anpassen
```typescript
case 'task':
  if (!req.organizationId) {
    // Standalone: Nur eigene
    return { OR: [{ responsibleId: userId }, { qualityControlId: userId }] };
  }
  
  // Mit Organisation: Filter nach organizationId
  return { organizationId: req.organizationId };

case 'request':
  if (!req.organizationId) {
    // Standalone: Nur eigene
    return { OR: [{ requesterId: userId }, { responsibleId: userId }] };
  }
  
  // Mit Organisation: Filter nach organizationId
  return { organizationId: req.organizationId };
```

#### Schritt 4: Controller anpassen
- `taskController.createTask`: `organizationId` aus `req.organizationId` setzen
- `requestController.createRequest`: `organizationId` aus `req.organizationId` setzen
- `taskController.updateTask`: `organizationId` darf nicht geändert werden (oder nur mit Berechtigung)

## Alternative: Option 2 - Filterlogik verbessern (OHNE Schema-Änderung)

### Ansatz A: Nur aktive Organisation prüfen
```typescript
case 'task':
  return {
    OR: [
      { role: { organizationId: req.organizationId } },
      {
        AND: [
          { roleId: null },
          {
            qualityControl: {
              roles: {
                some: {
                  AND: [
                    { role: { organizationId: req.organizationId } },
                    { lastUsed: true } // Nur aktive Rolle
                  ]
                }
              }
            }
          },
          {
            OR: [
              { responsibleId: null },
              {
                responsible: {
                  roles: {
                    some: {
                      AND: [
                        { role: { organizationId: req.organizationId } },
                        { lastUsed: true }
                      ]
                    }
                  }
                }
              }
            ]
          }
        ]
      }
    ]
  };
```

**Problem:** Ein User kann nur eine `lastUsed: true` Rolle haben, aber wenn mehrere User beteiligt sind, müssen alle die gleiche aktive Organisation haben. Das ist zu restriktiv.

### Ansatz B: Alle Rollen müssen in der gleichen Organisation sein
```typescript
case 'task':
  // Prüfe dass qualityControl KEINE Rollen in anderen Organisationen hat
  // ODER dass qualityControl nur Rollen in dieser Organisation hat
  // ... sehr komplex und nicht performant
```

**Problem:** Zu komplex und nicht performant.

## Empfehlung

**Option 1 (organizationId direkt hinzufügen)** ist die sauberste und performanteste Lösung.

## Fragen an User

1. Sollen Tasks/Requests immer zu genau einer Organisation gehören?
2. Können Tasks/Requests zwischen Organisationen übertragen werden?
3. Sollen bestehende Tasks/Requests automatisch einer Organisation zugeordnet werden?
4. Welche Zuordnungsregel für bestehende Daten soll verwendet werden?



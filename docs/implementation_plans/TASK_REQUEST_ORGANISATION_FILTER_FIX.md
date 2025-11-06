# Behebungsplan: Task/Request Organisation-Filterung

## Problem-Analyse

### Aktuelles Problem
- Tasks und Requests haben **keine direkte `organizationId`-Spalte** in der Datenbank
- Die Filterlogik verwendet `roles: { some: { role: { organizationId: ... } } }`
- **Problem**: Wenn ein User Rollen in mehreren Organisationen hat, wird ein Task/Request in **allen** Organisationen angezeigt, wo der User eine Rolle hat

### Beispiel-Szenario
- User 1 hat Rollen in Org A (`lastUsed: true`) und Org B (`lastUsed: false`)
- User 2 hat Rollen nur in Org A
- Task 1 hat `responsibleId: 1`, `qualityControlId: 2`
- Wenn User 1 in Org B aktiv ist, wird Task 1 trotzdem angezeigt, weil User 1 eine Rolle in Org A hat (auch wenn sie nicht aktiv ist)

### Aktuelle Filterlogik (problematisch)
```typescript
// Task-Filter
{
  OR: [
    { role: { organizationId: req.organizationId } },
    {
      AND: [
        { roleId: null },
        {
          responsible: {
            roles: {
              some: {  // ❌ PROBLEM: "some" berücksichtigt ALLE Rollen, nicht nur aktive!
                role: { organizationId: req.organizationId }
              }
            }
          }
        },
        {
          qualityControl: {
            roles: {
              some: {  // ❌ PROBLEM: "some" berücksichtigt ALLE Rollen, nicht nur aktive!
                role: { organizationId: req.organizationId }
              }
            }
          }
        }
      ]
    }
  ]
}
```

## Lösungsoptionen

### Option 1: `organizationId` direkt auf Task und Request hinzufügen ⭐ EMPFOHLEN

**Vorteile:**
- ✅ Einfacher, performanter (direkter Index statt komplexer Joins)
- ✅ Klarer und konsistenter mit anderen Entitäten (Role, Client, etc. haben `organizationId`)
- ✅ Vermeidet Probleme mit Usern, die Rollen in mehreren Organisationen haben
- ✅ Filterlogik wird deutlich einfacher: `{ organizationId: req.organizationId }`

**Nachteile:**
- ⚠️ Migration notwendig (Schema-Änderung)
- ⚠️ Beim Erstellen von Tasks/Requests muss `organizationId` gesetzt werden (aus `req.organizationId`)

**Implementierung:**
1. Schema-Änderung: `organizationId` zu `Task` und `Request` hinzufügen
2. Migration erstellen und ausführen
3. Beim Erstellen von Tasks/Requests: `organizationId` aus `req.organizationId` setzen
4. Filterlogik vereinfachen: `{ organizationId: req.organizationId }`
5. Bestehende Daten migrieren: `organizationId` basierend auf `roleId` oder `responsibleId`/`qualityControlId` setzen

### Option 2: Filterlogik verbessern - nur aktive Rolle berücksichtigen

**Vorteile:**
- ✅ Keine Schema-Änderung notwendig

**Nachteile:**
- ⚠️ Komplexer (muss `lastUsed: true` prüfen)
- ⚠️ Immer noch nicht perfekt, da ein User mehrere Rollen in der gleichen Organisation haben kann
- ⚠️ Nicht klar, welche Rolle relevant ist (wenn User mehrere Rollen in der gleichen Organisation hat)
- ⚠️ Performance-Probleme durch komplexe Joins

**Implementierung:**
1. Filterlogik ändern: nur Rollen mit `lastUsed: true` in der aktiven Organisation berücksichtigen
2. Problem: Wenn User mehrere Rollen in der gleichen Organisation hat, welche ist relevant?

## Empfehlung: Option 1

**Begründung:**
- Die Filterlogik wird deutlich einfacher und performanter
- Konsistent mit anderen Entitäten im System
- Vermeidet alle Probleme mit Usern, die Rollen in mehreren Organisationen haben
- Die Migration ist einmalig, die Performance-Verbesserung ist dauerhaft

## Implementierungsplan (Option 1)

### Schritt 1: Schema-Änderung
- `backend/prisma/schema.prisma`:
  - `Task`-Modell: `organizationId Int?` hinzufügen
  - `Request`-Modell: `organizationId Int?` hinzufügen
  - Relationen zu `Organization` hinzufügen

### Schritt 2: Migration erstellen
```bash
cd backend
npx prisma migrate dev --name add_organization_id_to_tasks_requests
```

### Schritt 3: Bestehende Daten migrieren
- Script erstellen, das `organizationId` für bestehende Tasks/Requests setzt:
  - Wenn `roleId` gesetzt: `organizationId` aus `Role.organizationId` übernehmen
  - Wenn `roleId` null: `organizationId` aus der aktiven Rolle des Users übernehmen (`lastUsed: true`)

### Schritt 4: Controller-Änderungen
- `backend/src/controllers/taskController.ts`:
  - `createTask`: `organizationId: req.organizationId` setzen
  - `updateTask`: `organizationId` validieren (nur wenn geändert)
- `backend/src/controllers/requestController.ts`:
  - `createRequest`: `organizationId: req.organizationId` setzen
  - `updateRequest`: `organizationId` validieren (nur wenn geändert)

### Schritt 5: Filterlogik vereinfachen
- `backend/src/middleware/organization.ts`:
  - `getDataIsolationFilter` für `task` und `request` vereinfachen:
    ```typescript
    case 'task':
      return {
        organizationId: req.organizationId
      };
    case 'request':
      return {
        organizationId: req.organizationId
      };
    ```

### Schritt 6: Tests
- Einige Tasks/Requests mit verschiedenen Organisationen erstellen
- Prüfen, dass nur die Tasks/Requests der aktiven Organisation angezeigt werden
- Prüfen, dass beim Wechseln der Organisation die richtigen Daten angezeigt werden

## Offene Fragen
- Sollen Tasks/Requests ohne `organizationId` (null) angezeigt werden? (z.B. für Standalone-User)
- Sollen bestehende Tasks/Requests ohne `organizationId` automatisch migriert werden oder müssen sie manuell zugeordnet werden?



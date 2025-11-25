# Analyse: Task-Filterung aufheben

## Problem
Tasks werden aktuell hardcodiert gefiltert und sind nur sichtbar für User mit:
- `responsibleId` = eingeloggter User, ODER
- `qualityControlId` = eingeloggter User, ODER
- `roleId` = Rolle des eingeloggten Users

**Anforderung:** Tasks sollen für ALLE User geladen werden. Filterung soll nur im Frontend per Filterfunktion und Berechtigungen erfolgen.

## Aktuelle Filterung (2 Stellen)

### 1. `backend/src/controllers/taskController.ts` - `getAllTasks()`
**Zeile 79-109:**
```typescript
// Isolation-Filter: organizationId (wenn vorhanden)
if (organizationId) {
    const taskFilter: any = {
        organizationId: organizationId
    };
    
    // Wenn User eine aktive Rolle hat, füge roleId-Filter hinzu
    if (userRoleId) {
        taskFilter.OR = [
            { responsibleId: userId },
            { qualityControlId: userId },
            { roleId: userRoleId }
        ];
    } else {
        // Fallback: Nur eigene Tasks
        taskFilter.OR = [
            { responsibleId: userId },
            { qualityControlId: userId }
        ];
    }
    
    baseWhereConditions.push(taskFilter);
} else {
    // Standalone User: Nur eigene Tasks
    baseWhereConditions.push({
        OR: [
            { responsibleId: userId },
            { qualityControlId: userId }
        ]
    });
}
```

**Problem:** Die OR-Bedingung mit `responsibleId`, `qualityControlId`, `roleId` filtert Tasks heraus.

### 2. `backend/src/middleware/organization.ts` - `getDataIsolationFilter()`
**Zeile 165-208 (case 'task'):**
```typescript
case 'task':
  // Tasks: Nach organizationId UND (responsibleId ODER roleId ODER qualityControlId)
  const taskFilter: any = {};
  
  if (req.organizationId) {
    taskFilter.organizationId = req.organizationId;
  }
  
  const userRoleId = req.userRole?.role?.id;
  
  if (userRoleId) {
    taskFilter.OR = [
      { responsibleId: userId },
      { qualityControlId: userId },
      { roleId: userRoleId }
    ];
  } else {
    taskFilter.OR = [
      { responsibleId: userId },
      { qualityControlId: userId }
    ];
  }
  
  return taskFilter;
```

**Problem:** Gleiche Filterung wie in `taskController.ts`.

## Lösung: Filterung aufheben

### Option 1: Nur organizationId-Filter behalten
**In `taskController.ts` Zeile 79-109:**
```typescript
// Isolation-Filter: organizationId (wenn vorhanden)
if (organizationId) {
    const taskFilter: any = {
        organizationId: organizationId
    };
    // KEINE OR-Bedingung mehr - alle Tasks der Organisation werden geladen
    baseWhereConditions.push(taskFilter);
} else {
    // Standalone User: Keine Filterung (alle Tasks)
    // ODER: baseWhereConditions bleibt leer
}
```

**In `organization.ts` Zeile 165-208:**
```typescript
case 'task':
  // Tasks: Nur nach organizationId filtern (Datenisolation)
  const taskFilter: any = {};
  
  if (req.organizationId) {
    taskFilter.organizationId = req.organizationId;
  }
  
  // KEINE OR-Bedingung mehr
  return taskFilter;
```

### Option 2: Query-Parameter für "alle Tasks"
Optional: Query-Parameter `?allTasks=true` hinzufügen, um alle Tasks zu laden (für Admin/Backend-Zugriff).

## Wichtige Überlegungen

1. **Datenisolation:** `organizationId`-Filter MUSS beibehalten werden (Datenisolation zwischen Organisationen)
2. **Performance:** Wenn alle Tasks geladen werden, könnte das bei vielen Tasks langsam sein
3. **Berechtigungen:** Frontend muss dann prüfen, ob User Tasks sehen/bearbeiten darf
4. **Andere Controller:** Prüfen ob `getDataIsolationFilter()` auch an anderen Stellen für Tasks verwendet wird

## Betroffene Dateien

### Hauptfilterung (muss geändert werden):
1. **`backend/src/controllers/taskController.ts`** - `getAllTasks()` - Zeile 79-109
   - Direkte Filterung mit OR-Bedingung

2. **`backend/src/middleware/organization.ts`** - `getDataIsolationFilter()` - Zeile 165-208 (case 'task')
   - Wird von mehreren Stellen verwendet

### Verwendungen von `getDataIsolationFilter(req, 'task')`:
- `taskController.ts`:
  - `getTaskById()` - Zeile 170
  - `updateTask()` - Zeile 345
  - `deleteTask()` - Zeile 757
  - `assignTask()` - Zeile 848
  - `unassignTask()` - Zeile 912

- `analyticsController.ts`:
  - `getTaskStats()` - Zeile 18
  - `getTaskCompletionRate()` - Zeile 290
  - `getTaskPerformanceMetrics()` - Zeile 535
  - `getTaskTrends()` - Zeile 798

**WICHTIG:** Alle diese Funktionen verwenden `getDataIsolationFilter()`, daher reicht es, nur diese Funktion zu ändern!

## Lösung: Filterung aufheben

### Änderung in `organization.ts`:
**Zeile 165-208 (case 'task'):**
```typescript
case 'task':
  // Tasks: Nur nach organizationId filtern (Datenisolation)
  // Filterung nach responsibleId/roleId/qualityControlId wird im Frontend gemacht
  const taskFilter: any = {};
  
  if (req.organizationId) {
    taskFilter.organizationId = req.organizationId;
  }
  
  // KEINE OR-Bedingung mehr - alle Tasks der Organisation werden geladen
  return taskFilter;
```

### Änderung in `taskController.ts`:
**Zeile 79-109:**
```typescript
// Isolation-Filter: organizationId (wenn vorhanden)
if (organizationId) {
    const taskFilter: any = {
        organizationId: organizationId
    };
    // KEINE OR-Bedingung mehr - alle Tasks der Organisation werden geladen
    baseWhereConditions.push(taskFilter);
} else {
    // Standalone User: Keine Filterung (alle Tasks)
    // baseWhereConditions bleibt leer oder wird weggelassen
}
```

## Nächste Schritte

1. ✅ Analyse abgeschlossen
2. ⏳ Auf Bestätigung warten
3. ⏳ Implementierung (nur nach Bestätigung)


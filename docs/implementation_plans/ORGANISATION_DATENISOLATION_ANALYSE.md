# Analyse: Organisation Datenisolation Plan

**Erstellt:** 2024  
**Status:** Code-Analyse abgeschlossen  
**Zweck:** Detaillierte Code-Überprüfung und Problem-Identifikation

## ✅ Was bereits korrekt ist

1. **getDataIsolationFilter existiert** und wird bereits verwendet
   - ✅ TaskController verwendet es
   - ✅ RequestController verwendet es
   - ✅ Filter-Logik für Standalone-User funktioniert

2. **organizationMiddleware** setzt `req.organizationId` korrekt
   - ✅ Kann `null` sein für Standalone-User
   - ✅ Wird aus `lastUsed: true` Rolle geholt

3. **getUserOrganizationFilter** für User-Filterung ist korrekt implementiert

## ❌ Kritische Probleme im Plan

### Problem 1: Prisma-Relationen nicht korrekt im Plan

**Plan behauptet:**
```typescript
// Für Tasks
responsible: {
  roles: {
    some: {
      role: {
        organizationId: req.organizationId
      }
    }
  }
}
```

**Tatsächliche Relation im Schema:**
```
Task.responsibleId → User → UserRole → Role.organizationId
```

**Korrekte Prisma-Query:**
```typescript
responsible: {
  roles: {
    some: {
      role: {
        organizationId: req.organizationId
      }
    }
  }
}
```
✅ **Dieser Teil ist KORREKT!** Der Plan hat die Relationen richtig verstanden.

### Problem 2: Branches-Filter ist falsch im Plan

**Plan zeigt:**
```typescript
case 'branch':
  return {
    users: {
      some: {
        user: {
          roles: {
            some: {
              role: {
                organizationId: req.organizationId
              }
            }
          }
        }
      }
    }
  };
```

**Tatsächliche Relation:**
```
Branch → UsersBranches → User → UserRole → Role → Organization
```

**Korrekte Query:**
```typescript
case 'branch':
  if (!req.organizationId) {
    return {
      users: {
        some: {
          userId: userId
        }
      }
    };
  }
  
  return {
    users: {
      some: {
        user: {
          roles: {
            some: {
              role: {
                organizationId: req.organizationId
              }
            }
          }
        }
      }
    }
  };
```
✅ **Plan ist KORREKT!** Die Zwischentabelle `UsersBranches` wird von Prisma automatisch über `users` Relation aufgelöst.

### Problem 3: Clients-Filter muss präzisiert werden

**Plan zeigt:**
```typescript
case 'client':
  return {
    workTimes: {
      some: {
        user: {
          roles: {
            some: {
              role: {
                organizationId: req.organizationId
              }
            }
          }
        }
      }
    }
  };
```

**Korrekt, ABER:** WorkTime hat direkten `userId` FK, nicht über `user` Relation!
Tatsächlich: `WorkTime.userId → User.id`

**Prüfung im Schema:**
```
WorkTime {
  userId Int
  user User @relation(fields: [userId], references: [id])
}
```

✅ **Plan ist KORREKT!** Die Relation ist `user: { roles: ... }`, nicht `userId`.

### Problem 4: WorkTimes-Controller verwendet getDataIsolationFilter NICHT

**Aktueller Code (`worktimeController.ts:195`):**
```typescript
export const getWorktimes = async (req: Request, res: Response) => {
  let whereClause: Prisma.WorkTimeWhereInput = {
    userId: Number(userId)  // ❌ Direkt nach userId gefiltert
  };
  // ...
}
```

**Problem:** Filtert nur nach eigenem `userId`, nicht nach Organisation!

**Lösung:** Muss `getDataIsolationFilter(req, 'worktime')` verwenden.

### Problem 5: ConsultationController filtert nicht nach Organisation

**Aktueller Code (`consultationController.ts:102`):**
```typescript
export const getConsultations = async (req: Request, res: Response) => {
  let whereClause: any = {
    userId: Number(userId),  // ❌ Nur nach userId gefiltert
    clientId: { not: null }
  };
  // ...
}
```

**Problem:** Zeigt nur eigene Consultations, nicht alle der Organisation!

**Lösung:** Muss `getDataIsolationFilter(req, 'worktime')` verwenden (Consultations sind WorkTimes mit clientId).

### Problem 6: ClientController hat KEINEN Filter

**Aktueller Code (`clientController.ts:7`):**
```typescript
export const getClients = async (req: Request, res: Response) => {
  const clients = await prisma.client.findMany({
    orderBy: { name: 'asc' }
    // ❌ KEIN Filter!
  });
}
```

**Problem:** Zeigt ALLE Clients, auch von anderen Organisationen!

**Lösung:** Muss `getDataIsolationFilter(req, 'client')` verwenden.

### Problem 7: BranchController hat KEINEN Filter

**Aktueller Code (`branchController.ts:21`):**
```typescript
export const getAllBranches = async (_req: Request, res: Response) => {
  const branches = await prisma.branch.findMany({
    select: { id: true, name: true }
    // ❌ KEIN Filter!
  });
}
```

**Problem:** Zeigt ALLE Branches, auch von anderen Organisationen!

**Lösung:** Muss `getDataIsolationFilter(req, 'branch')` verwenden.

### Problem 8: RoleController zeigt ALLE Rollen

**Aktueller Code (`roleController.ts:33`):**
```typescript
export const getAllRoles = async (_req: Request, res: Response) => {
  const roles = await prisma.role.findMany({
    include: { permissions: true }
    // ❌ KEIN Filter!
  });
}
```

**Problem:** Zeigt ALLE Rollen aller Organisationen!

**Lösung:** Muss `getDataIsolationFilter(req, 'role')` verwenden.

### Problem 9: createRole verwendet hardcoded organizationId

**Aktueller Code (`roleController.ts:132`):**
```typescript
const role = await prisma.role.create({
  data: {
    name,
    description,
    organizationId: 1,  // ❌ HARDCODED!
    // ...
  }
});
```

**Problem:** Erstellt immer Rollen für Organisation 1, nicht für `req.organizationId`!

**Lösung:** Muss `req.organizationId` verwenden (kann null sein für Standalone-User, dann sollte Rolle nicht erstellt werden können).

### Problem 10: Fehlende Validierungen beim Erstellen/Bearbeiten

**Kritisch:** Keine Controller prüfen, ob zugewiesene User zur Organisation gehören!

**Beispiele:**
- `createTask`: Prüft nicht ob `responsibleId` / `qualityControlId` zur Organisation gehören
- `createRequest`: Prüft nicht ob `requesterId` / `responsibleId` zur Organisation gehören
- `updateTask`: Prüft nicht ob neue User-Zuweisungen zur Organisation gehören
- `createClient`: Keine Organisation-Prüfung (könnte problematisch sein, wenn Clients organisations-spezifisch werden)

**Lösung:** Validierungs-Middleware oder Helper-Funktion, die prüft ob User zur Organisation gehört.

## ⚠️ Weitere potentielle Probleme

### Performance-Risiken

**Filter über mehrere Joins können langsam sein:**
```typescript
responsible: {
  roles: {
    some: {
      role: {
        organizationId: req.organizationId
      }
    }
  }
}
```

**Empfehlung:**
- Indizes prüfen auf `Role.organizationId`
- Alternativ: Users der Organisation einmal holen, dann nach `responsibleId IN (...)`

**Aber:** Prisma optimiert Joins normalerweise gut, und für kleine/mittlere Organisationen sollte es kein Problem sein.

### Bestehende Daten

**Problem:** Standalone-User haben bereits Tasks/Requests/WorkTimes.
Nach Beitritt zur Organisation sollten diese weiterhin sichtbar sein.

**Aktueller Filter (Standalone):**
```typescript
if (!req.organizationId) {
  case 'task':
    return { OR: [{ responsibleId: userId }, { qualityControlId: userId }] };
}
```

**Nach Organisation-Beitritt:**
Filter würde jetzt ALLE Tasks der Organisation zeigen, aber User's eigene alte Tasks sollten auch weiterhin sichtbar sein, selbst wenn sie vor dem Beitritt erstellt wurden.

**Lösung:** Filter muss kombinieren:
- Entweder: Task gehört zur Organisation (via responsible/qualityControl)
- Oder: Task gehört dem User selbst (responsibleId = userId OR qualityControlId = userId)

**ABER:** Das könnte zu kompliziert werden. Besser: Nach Beitritt zur Organisation sieht User ALLE Tasks der Organisation (inkl. eigene alte Tasks). Das ist das erwartete Verhalten laut Plan.

## ✅ Zusammenfassung: Was ist korrekt im Plan

1. ✅ Tasks-Filter (Schritt 1.1) - Relationen sind korrekt
2. ✅ Requests-Filter (Schritt 1.2) - Relationen sind korrekt
3. ✅ WorkTimes-Filter (Schritt 1.3) - Logik ist korrekt
4. ✅ Clients-Filter (Schritt 1.4) - Relationen sind korrekt
5. ✅ Branches-Filter (Schritt 1.5) - Relationen sind korrekt (Prisma löst Zwischentabelle automatisch auf)
6. ✅ Roles-Filter (Schritt 1.6) - Direkter Filter ist korrekt

## ❌ Zusammenfassung: Was fehlt im Plan

1. ❌ **Worktimes-Controller:** Verwendet getDataIsolationFilter nicht
2. ❌ **Consultation-Controller:** Filtert nur nach userId
3. ❌ **Client-Controller:** Hat keinen Filter
4. ❌ **Branch-Controller:** Hat keinen Filter
5. ❌ **Role-Controller getAllRoles:** Hat keinen Filter
6. ❌ **Role-Controller createRole:** Verwendet hardcoded organizationId: 1
7. ❌ **Validierungen:** Keine Prüfung ob zugewiesene User zur Organisation gehören
8. ❌ **Update/Delete-Validierungen:** Keine Prüfung ob Entity zur Organisation gehört

## 🎯 Empfehlungen

### Priorität 1 (KRITISCH):
1. `getDataIsolationFilter` erweitern (Phase 1) ✅ Plan ist gut
2. Worktimes-Controller anpassen (verwendet Filter nicht!)
3. Consultation-Controller anpassen (verwendet Filter nicht!)
4. Client/Branch/Role Controller Filter hinzufügen

### Priorität 2 (WICHTIG):
1. Validierungen beim Erstellen/Bearbeiten
2. `createRole` fixen (organizationId: 1 → req.organizationId)

### Priorität 3 (NICE TO HAVE):
1. Performance-Optimierungen (falls nötig)
2. Bestehende Daten-Migration (falls nötig)

## 🚀 Fazit

**Der Plan ist grundsätzlich GUT, aber:**

1. ✅ Die Filter-Logik (Phase 1) ist korrekt und kann so umgesetzt werden
2. ❌ Phase 2 (Controller-Anpassungen) ist UNVOLLSTÄNDIG:
   - Worktimes-Controller fehlt komplett
   - Consultation-Controller fehlt komplett
   - Client/Branch/Role Controller fehlen komplett
3. ❌ Phase 3 (Validierungen) fehlt komplett im Plan

**Empfehlung:** Plan um fehlende Controller und Validierungen erweitern, dann umsetzen.

















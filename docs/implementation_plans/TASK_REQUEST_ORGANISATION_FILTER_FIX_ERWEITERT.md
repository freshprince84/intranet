# Behebungsplan: Task/Request Organisation-Filterung - Erweiterte Analyse

## Problem-Analyse

### Aktuelles Problem
- Tasks und Requests haben **keine direkte `organizationId`-Spalte**
- Die Filterlogik verwendet `roles: { some: { role: { organizationId: ... } } }`
- **Problem**: Wenn ein User Rollen in mehreren Organisationen hat, wird ein Task/Request in **allen** Organisationen angezeigt

### Betroffene Tabellen (Aktueller Stand)

#### Tabellen MIT `organizationId`:
- ✅ `OrganizationJoinRequest` (hat `organizationId`)
- ✅ `OrganizationInvitation` (hat `organizationId`)
- ✅ `Role` (hat `organizationId?` - optional)

#### Tabellen OHNE `organizationId` aber mit Filterlogik:
- ❌ `Task` - Filterung über `roleId` → `Role.organizationId` ODER `responsible/qualityControl` → `UserRole` → `Role.organizationId`
- ❌ `Request` - Filterung über `requester/responsible` → `UserRole` → `Role.organizationId`
- ❌ `User` - Filterung über `UserRole` → `Role.organizationId`
- ❌ `WorkTime` - Filterung über `userId` → `UserRole` → `Role.organizationId`
- ❌ `Client` - Filterung über `WorkTime` → `User` → `UserRole` → `Role.organizationId`
- ❌ `Branch` - Filterung über `UsersBranches` → `User` → `UserRole` → `Role.organizationId`

## Lösungsoptionen im Detail

### Option 1: `organizationId` direkt hinzufügen ⭐

**Betroffene Tabellen:**
- `Task` → `organizationId Int?` hinzufügen
- `Request` → `organizationId Int?` hinzufügen
- (Optional: `WorkTime`, `Client`, `Branch` → aber diese sind weniger kritisch)

**Vorteile:**
- ✅ Einfacher, performanter (direkter Index statt komplexer Joins)
- ✅ Query: `WHERE organizationId = ?` (Index-Scan, sehr schnell)
- ✅ Klarer und konsistenter mit anderen Entitäten
- ✅ Vermeidet Probleme mit Usern, die Rollen in mehreren Organisationen haben
- ✅ Filterlogik wird deutlich einfacher
- ✅ Bessere Performance bei großen Datenmengen

**Nachteile:**
- ⚠️ Migration notwendig (Schema-Änderung)
- ⚠️ Beim Erstellen von Tasks/Requests muss `organizationId` gesetzt werden
- ⚠️ Bestehende Daten müssen migriert werden

**Performance:**
- Query: `SELECT * FROM Task WHERE organizationId = ?` → **Index-Scan, O(log n)**
- Bei 10.000 Tasks: ~1-5ms

### Option 2: History/Log-Tabellen verwenden

**Konzept:**
- History-Tabellen für Tasks/Requests erstellen (z.B. `TaskHistory`, `RequestHistory`)
- Bei Erstellung/Änderung: `organizationId` (oder `roleId`) in History speichern
- Bei Query: JOIN zur History, um `organizationId` zu erhalten

**Betroffene Tabellen:**
- `TaskHistory` (neu) → `organizationId Int?` ODER `roleId Int?` → `Role.organizationId`
- `RequestHistory` (neu) → `organizationId Int?` ODER `roleId Int?` → `Role.organizationId`

**Vorteile:**
- ✅ History wird sowieso benötigt (geplant)
- ✅ Keine Schema-Änderung an `Task`/`Request` selbst
- ✅ Historische Daten werden automatisch richtig zugeordnet

**Nachteile:**
- ❌ **Performance-Problem**: Jede Query muss JOIN zur History machen
- ❌ Komplexer: Welche History-Eintrag ist relevant? (Erstellung, letzte Änderung?)
- ❌ Wenn kein History-Eintrag existiert, muss Fallback-Logik verwendet werden
- ❌ History-Tabellen werden sehr groß (bei vielen Änderungen)
- ❌ Inkonsistent: Neue Tasks/Requests haben History, alte nicht

**Performance-Analyse:**

**Option 2a: History mit JOIN:**
```sql
SELECT t.* FROM Task t
LEFT JOIN TaskHistory th ON t.id = th.taskId AND th.eventType = 'created'
WHERE COALESCE(th.organizationId, 
    (SELECT r.organizationId FROM Role r 
     JOIN Task t2 ON t2.roleId = r.id 
     WHERE t2.id = t.id LIMIT 1)) = ?
```
- Query: **JOIN + Subquery** → **O(n log n)** oder schlechter
- Bei 10.000 Tasks: ~50-200ms (10-40x langsamer als Option 1)

**Option 2b: History mit LEFT JOIN + Fallback:**
```sql
SELECT t.* FROM Task t
LEFT JOIN TaskHistory th ON t.id = th.taskId AND th.eventType = 'created'
LEFT JOIN Role r ON t.roleId = r.id
WHERE COALESCE(th.organizationId, r.organizationId, 
    (SELECT r2.organizationId FROM UserRole ur 
     JOIN Role r2 ON ur.roleId = r2.id 
     WHERE ur.userId = t.qualityControlId AND ur.lastUsed = true LIMIT 1)) = ?
```
- Query: **Mehrere JOINs + Subquery** → **O(n²)** oder schlechter
- Bei 10.000 Tasks: ~200-1000ms (40-200x langsamer als Option 1)

**Option 2c: History nur bei Erstellung speichern:**
- Problem: Was ist mit bestehenden Tasks/Requests ohne History?
- Fallback-Logik erforderlich (komplex, langsam)

### Option 3: Hybride Lösung (History + direkte organizationId)

**Konzept:**
- `Task` und `Request` bekommen `organizationId` direkt
- History-Tabellen speichern zusätzlich `organizationId` für Audit-Trail
- Beste aus beiden Welten

**Vorteile:**
- ✅ Beste Performance: Direkte `organizationId`-Spalte
- ✅ History für Audit-Trail und Compliance
- ✅ Keine JOINs nötig für normale Queries
- ✅ History kann für Reporting/Analytics verwendet werden

**Nachteile:**
- ⚠️ Beide Features müssen implementiert werden

## Performance-Vergleich

| Option | Query-Komplexität | Performance (10k Tasks) | Skalierbarkeit |
|--------|------------------|------------------------|----------------|
| **Option 1** (direkte `organizationId`) | O(log n) | ~1-5ms | ✅ Sehr gut |
| **Option 2a** (History JOIN) | O(n log n) | ~50-200ms | ⚠️ Akzeptabel |
| **Option 2b** (History + Fallback) | O(n²) | ~200-1000ms | ❌ Schlecht |
| **Option 3** (Hybrid) | O(log n) | ~1-5ms | ✅ Sehr gut |

## Empfehlung: Option 3 (Hybrid) ⭐⭐⭐

**Begründung:**
1. **Performance**: Direkte `organizationId`-Spalte ist **10-200x schneller** als History-JOINs
2. **Einfachheit**: Filterlogik wird trivial: `WHERE organizationId = ?`
3. **Skalierbarkeit**: Bei 100.000+ Tasks wäre Option 2 praktisch nicht nutzbar
4. **History**: History-Tabellen können trotzdem für Audit-Trail verwendet werden
5. **Konsistenz**: Konsistent mit anderen Entitäten (`Role`, `OrganizationJoinRequest`)

**Implementierung:**
1. `Task` und `Request` bekommen `organizationId Int?`
2. History-Tabellen werden später hinzugefügt (für Audit-Trail)
3. Bei Erstellung: `organizationId` direkt setzen
4. History speichert zusätzlich `organizationId` (aber nicht für Filterung verwendet)

## Alternative: Nur kritische Tabellen migrieren

Wenn Migration zu groß ist, könnten wir nur die kritischsten Tabellen migrieren:
- ✅ `Task` → `organizationId` hinzufügen
- ✅ `Request` → `organizationId` hinzufügen
- ⚠️ `WorkTime`, `Client`, `Branch` → bleiben bei aktueller Filterlogik (weniger kritisch)

## Offene Fragen

1. **Wie viele Tasks/Requests existieren aktuell?** (beeinflusst Migrations-Zeit)
2. **Wie wichtig ist die History-Funktion?** (wenn sehr wichtig, Option 3; wenn optional, Option 1)
3. **Wie viele Organisationen gibt es?** (beeinflusst Performance-Impact)
4. **Wie viele User haben Rollen in mehreren Organisationen?** (beeinflusst Problem-Schweregrad)



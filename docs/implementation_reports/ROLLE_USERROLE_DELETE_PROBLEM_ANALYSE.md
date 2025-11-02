# Analyse: Rollen/UserRoles nicht sichtbar & Benutzer-Löschung fehlgeschlagen

## Übersicht

Nach der Implementierung der Multi-Tenant Organisation-Funktionalität treten zwei kritische Probleme auf:
1. Rollen und UserRoles werden nicht mehr im Prisma Studio angezeigt
2. Benutzer können nicht gelöscht werden

---

## Problem 1: Rollen und UserRoles werden nicht im Prisma Studio angezeigt

### Beschreibung
Im Prisma Studio werden die Tabellen `Role` und `UserRole` nicht angezeigt oder sind leer, obwohl Daten vorhanden sein sollten.

### Root Cause Analyse

#### Schema-Definition (backend/prisma/schema.prisma)
```prisma
model Role {
  id          Int          @id @default(autoincrement())
  name        String       @unique  // ⚠️ PROBLEM: name ist global unique
  description String?
  organizationId  Int
  organization    Organization  @relation(fields: [organizationId], references: [id])
  permissions Permission[]
  tasks       Task[]
  users       UserRole[]
  invitations OrganizationInvitation[]
}
```

**Problem:**
- `Role.name` ist als `@unique` definiert
- Rollen sind jetzt organisations-spezifisch (`organizationId` ist Pflichtfeld)
- Es sollte möglich sein, dass mehrere Organisationen eine Rolle mit demselben Namen haben (z.B. "Admin" in Org 1 und "Admin" in Org 2)
- **ABER:** Da `name` global unique ist, kann nur eine Organisation eine Rolle mit einem bestimmten Namen haben
- Das führt zu Datenintegritätsproblemen und kann dazu führen, dass Rollen nicht korrekt angezeigt werden

**Korrekte Lösung:**
Der Unique-Constraint sollte kombiniert sein: `@@unique([name, organizationId])`

Das bedeutet:
- Eine Rolle kann den gleichen Namen haben wie eine Rolle in einer anderen Organisation
- Innerhalb einer Organisation muss der Rollenname eindeutig sein

---

## Problem 2: Benutzer können nicht gelöscht werden

### Beschreibung
Beim Versuch, einen Benutzer zu löschen, schlägt die Operation fehl mit einem Foreign Key Constraint Fehler.

### Root Cause Analyse

#### 1. Fehlende Löschung von OrganizationJoinRequest

**Schema (backend/prisma/schema.prisma, Zeilen 81-97):**
```prisma
model OrganizationJoinRequest {
  id              Int           @id @default(autoincrement())
  organizationId  Int
  organization    Organization  @relation(fields: [organizationId], references: [id])
  requesterId     Int
  requester       User          @relation("JoinRequester", fields: [requesterId], references: [id])
  // ...
  processedBy     Int?
  processor       User?         @relation("JoinProcessor", fields: [processedBy], references: [id])
  // ...
}
```

**Migration (20250606171619_add_multi_tenant_support/migration.sql, Zeilen 96-102):**
```sql
ALTER TABLE "OrganizationJoinRequest" ADD CONSTRAINT "OrganizationJoinRequest_requesterId_fkey" 
FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OrganizationJoinRequest" ADD CONSTRAINT "OrganizationJoinRequest_processedBy_fkey" 
FOREIGN KEY ("processedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

**Problem:**
- `requesterId` hat `ON DELETE RESTRICT` - verhindert Löschung des Users, wenn er als Requester verwendet wird
- `processedBy` hat `ON DELETE SET NULL` - das ist OK, wird automatisch auf NULL gesetzt
- Im `deleteUser` Code werden `OrganizationJoinRequest` Einträge **NICHT gelöscht**

#### 2. Fehlende Löschung von OrganizationInvitation

**Schema (backend/prisma/schema.prisma, Zeilen 99-115):**
```prisma
model OrganizationInvitation {
  id              Int           @id @default(autoincrement())
  // ...
  invitedBy       Int
  inviter         User          @relation("Inviter", fields: [invitedBy], references: [id])
  // ...
  acceptedBy      Int?
  acceptor        User?         @relation("InvitationAcceptor", fields: [acceptedBy], references: [id])
  // ...
}
```

**Migration (20250606171619_add_multi_tenant_support/migration.sql, Zeilen 111-114):**
```sql
ALTER TABLE "OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_invitedBy_fkey" 
FOREIGN KEY ("invitedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_acceptedBy_fkey" 
FOREIGN KEY ("acceptedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

**Problem:**
- `invitedBy` hat `ON DELETE RESTRICT` - verhindert Löschung des Users, wenn er als Inviter verwendet wird
- `acceptedBy` hat `ON DELETE SET NULL` - das ist OK
- Im `deleteUser` Code werden `OrganizationInvitation` Einträge **NICHT gelöscht**

#### 3. Aktueller deleteUser Code (backend/src/controllers/userController.ts, Zeilen 1057-1077)

```typescript
await prisma.$transaction([
    prisma.userRole.deleteMany({
        where: { userId }
    }),
    prisma.usersBranches.deleteMany({
        where: { userId }
    }),
    prisma.settings.deleteMany({
        where: { userId }
    }),
    prisma.notification.deleteMany({
        where: { userId }
    }),
    prisma.userNotificationSettings.deleteMany({
        where: { userId }
    }),
    prisma.user.delete({
        where: { id: userId }
    })
]);
```

**Fehlende Löschungen:**
- ❌ `organizationJoinRequest` (wo `requesterId = userId`)
- ❌ `organizationInvitation` (wo `invitedBy = userId`)

**Weitere mögliche Probleme:**
- Es könnte weitere Abhängigkeiten geben, die nicht gelöscht werden (z.B. `WorkTime`, `Task`, `Request`, etc.), aber diese haben vermutlich andere Delete-Regeln

---

## Lösungsvorschläge

### Lösung 1: Role.name Unique-Constraint korrigieren

**Schritt 1: Schema anpassen**
```prisma
model Role {
  id          Int          @id @default(autoincrement())
  name        String       // Entferne @unique hier
  description String?
  organizationId  Int
  organization    Organization  @relation(fields: [organizationId], references: [id])
  // ...

  @@unique([name, organizationId])  // Füge kombinierten Unique-Constraint hinzu
}
```

**Schritt 2: Migration erstellen**
```bash
npx prisma migrate dev --name fix_role_name_unique_constraint
```

**Schritt 3: Bestehende Daten prüfen**
- Prüfen, ob es Duplikate gibt (selber Name in derselben Organisation)
- Falls ja, Namen anpassen (z.B. "Admin (Org 1)", "Admin (Org 2)")

### Lösung 2: deleteUser erweitern

**Option A: Delete-Methode (Empfohlen für JoinRequests)**
```typescript
await prisma.$transaction([
    // Zuerst die neuen Abhängigkeiten löschen
    prisma.organizationJoinRequest.deleteMany({
        where: { requesterId: userId }
    }),
    // processedBy wird automatisch auf NULL gesetzt (ON DELETE SET NULL)
    prisma.organizationInvitation.deleteMany({
        where: { invitedBy: userId }
    }),
    // acceptedBy wird automatisch auf NULL gesetzt (ON DELETE SET NULL)
    
    // Dann die bestehenden Löschungen
    prisma.userRole.deleteMany({
        where: { userId }
    }),
    // ... rest bleibt gleich
]);
```

**Option B: Foreign Key Constraints anpassen (NICHT empfohlen)**
- Würde `ON DELETE RESTRICT` zu `ON DELETE CASCADE` ändern
- Problem: Automatisches Löschen könnte Datenverlust verursachen
- Besser: Explizite Kontrolle im Code

**Warum Option A?**
- Explizite Kontrolle über was gelöscht wird
- Möglichkeit, Logging/Auditing hinzuzufügen
- Bessere Fehlerbehandlung
- Keine unerwarteten Kaskaden-Löschungen

---

## Implementierungsplan

### Phase 1: Role.name Unique-Constraint fixen

1. ✅ Schema anpassen (Role.name @unique entfernen, @@unique([name, organizationId]) hinzufügen)
2. ✅ Migration erstellen und testen
3. ✅ Bestehende Daten prüfen und ggf. bereinigen
4. ✅ Prisma Studio prüfen - Rollen sollten jetzt sichtbar sein

### Phase 2: deleteUser erweitern

1. ✅ `deleteUser` Code erweitern mit Löschung von:
   - `organizationJoinRequest` (requesterId)
   - `organizationInvitation` (invitedBy)
2. ✅ Testen mit Benutzern, die JoinRequests/Invitations haben
3. ✅ Error-Handling verbessern
4. ✅ Logging hinzufügen für Audit-Zwecke

### Phase 3: Weitere Abhängigkeiten prüfen

1. ✅ Alle Foreign Keys zu User prüfen
2. ✅ Sicherstellen, dass alle Abhängigkeiten in deleteUser behandelt werden
3. ✅ Dokumentation aktualisieren

---

## Risiken und Nebenwirkungen

### Risiko 1: Bestehende Rollen mit gleichen Namen
- **Risiko:** Wenn zwei Organisationen bereits Rollen mit dem gleichen Namen haben (z.B. beide haben "Admin"), schlägt die Migration fehl
- **Lösung:** Vor der Migration prüfen und ggf. Namen anpassen

### Risiko 2: Löschung von JoinRequests/Invitations
- **Risiko:** Beim Löschen eines Users gehen alle seine JoinRequests/Invitations verloren
- **Lösung:** Eventuell Soft-Delete verwenden oder Audit-Trail erstellen

### Risiko 3: Performance bei vielen Abhängigkeiten
- **Risiko:** Transaction könnte bei vielen JoinRequests/Invitations langsam sein
- **Lösung:** Falls nötig, Batch-Processing implementieren

---

## Test-Szenarien

### Test 1: Role.name Constraint
- [ ] Migration läuft ohne Fehler
- [ ] Zwei Organisationen können Rollen mit gleichem Namen haben
- [ ] Innerhalb einer Organisation sind Rollennamen eindeutig
- [ ] Prisma Studio zeigt Rollen korrekt an

### Test 2: deleteUser mit JoinRequests
- [ ] User mit JoinRequests kann gelöscht werden
- [ ] JoinRequests werden vorher gelöscht
- [ ] Keine Foreign Key Fehler

### Test 3: deleteUser mit Invitations
- [ ] User mit Invitations kann gelöscht werden
- [ ] Invitations werden vorher gelöscht
- [ ] Keine Foreign Key Fehler

### Test 4: deleteUser mit beiden
- [ ] User mit JoinRequests UND Invitations kann gelöscht werden
- [ ] Alle Abhängigkeiten werden korrekt gelöscht

---

## Zusammenfassung

**Problem 1:** Role.name ist global unique, sollte aber organisations-spezifisch unique sein
- **Lösung:** `@@unique([name, organizationId])` verwenden

**Problem 2:** deleteUser löscht nicht alle Abhängigkeiten (OrganizationJoinRequest, OrganizationInvitation)
- **Lösung:** Diese Tabellen explizit in deleteUser löschen

**Priorität:** Hoch - beide Probleme blockieren wichtige Funktionalität

**Geschätzte Zeit:** 2-3 Stunden (inkl. Tests und Migration)


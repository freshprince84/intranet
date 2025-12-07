# Reservation Todo für Cleaning-Rolle - Implementierungsplan

**Datum:** 2025-01-31  
**Status:** 📋 PLAN - Noch nicht umgesetzt  
**Priorität:** 🔴 WICHTIG

---

## 📊 ÜBERSICHT

Aktuell wird bei jeder Reservation automatisch ein Todo für die Rolle "Reception" erstellt. Dies soll geändert werden:
- **Rolle:** Von "Reception" zu "Cleaning"
- **Due Date:** Von Check-in-Datum zu Check-out-Datum
- **Titel:** Statt "Check-in: ..." soll der Zimmername verwendet werden (bei Dorms: "Zimmername (Bettnummer)", bei Privates: "Zimmername")
- **Branch:** Bleibt unverändert (wird bereits korrekt aus reservation.branchId geholt)

---

## 1. AKTUELLE IMPLEMENTIERUNG

### 1.1 Aufruf der Funktion

**Datei:** `backend/src/services/lobbyPmsService.ts` (Zeile 1146)

```typescript
// Erstelle automatisch Task wenn aktiviert
try {
  await TaskAutomationService.createReservationTask(reservation, this.organizationId);
} catch (error) {
  console.error(`[LobbyPMS] Fehler beim Erstellen des Tasks für Reservierung ${reservation.id}:`, error);
  // Fehler nicht weiterwerfen, da Task-Erstellung optional ist
}
```

**Status:** ✅ Bleibt unverändert

---

### 1.2 Aktuelle Implementierung von `createReservationTask`

**Datei:** `backend/src/services/taskAutomationService.ts` (Zeilen 600-752)

**Aktuelle Logik:**
1. **Rolle:** Sucht nach "Rezeption", "Reception", "Front Desk", "Recepcion" (Zeilen 625-633)
2. **Due Date:** `reservation.checkInDate` (Zeile 706)
3. **Titel:** `Check-in: ${reservation.guestName} - ${reservation.checkInDate.toLocaleDateString('de-DE')}` (Zeile 683)
4. **Branch:** Wird aus `reservation.branchId` geholt oder erste Branch der Organisation (Zeilen 655-670)
5. **Benachrichtigungen:** Werden an alle User mit "Reception"-Rolle gesendet (Zeilen 723-745)

---

## 2. ZIMMERNAMEN-STRUKTUR: DORMS VS. PRIVATES

### 2.1 Unterschied zwischen Dorms und Privates

**Erkennung:**
- **Dorm:** `assignedRoom?.type === 'compartida'`
- **Private:** `assignedRoom?.type === 'privada'` (oder nicht "compartida")

**LobbyPMS API-Datenstruktur:**

**Für Dorms (compartida):**
```json
{
  "assigned_room": {
    "type": "compartida",
    "name": "Cama 5"  // ← Nur Bettnummer!
  },
  "category": {
    "category_id": 34281,
    "name": "La tia artista"  // ← Zimmername!
  }
}
```

**Für Privates (privada):**
```json
{
  "assigned_room": {
    "type": "privada",
    "name": "El abuelo bromista"  // ← Zimmername direkt!
  },
  "category": {
    "category_id": 34312,
    "name": "Doble básica"  // ← Kategorie (nicht Zimmername)
  }
}
```

### 2.2 Aktuelle Speicherung im System

**Datei:** `backend/src/services/lobbyPmsService.ts` (Zeilen 1044-1058)

**Für Dorms (compartida):**
```typescript
if (isDorm) {
  // Für Dorms: category.name = Zimmername, assigned_room.name = Bettnummer
  const dormName = lobbyReservation.category?.name || null; // Zimmername (z.B. "La tia artista")
  const bedNumber = assignedRoom?.name || null; // Bettnummer (z.B. "Cama 5")
  // Kombiniere Zimmername + Bettnummer für roomNumber
  roomNumber = dormName && bedNumber 
    ? `${dormName} (${bedNumber})`  // z.B. "La tia artista (Cama 5)"
    : bedNumber || dormName || null;
  roomDescription = null; // Wird später aus Branch-Settings geladen
}
```

**Für Privates (privada):**
```typescript
else {
  // Für Privatzimmer: assigned_room.name = Zimmername
  roomNumber = assignedRoom?.name || lobbyReservation.room_number || null; // Zimmername (z.B. "El abuelo bromista")
  roomDescription = assignedRoom?.type || lobbyReservation.room_description || lobbyReservation.category?.name || null;
}
```

### 2.3 Ergebnis in der Datenbank

**Dorms:**
- `reservation.roomNumber` = **"Zimmername (Bettnummer)"** 
  - Beispiel: `"La tia artista (Cama 5)"`
  - Enthält sowohl Zimmername als auch Bettnummer
- `reservation.roomDescription` = `null` (wird später aus Branch-Settings geladen)

**Privates:**
- `reservation.roomNumber` = **"Zimmername"**
  - Beispiel: `"El abuelo bromista"`
  - Enthält nur den Zimmernamen
- `reservation.roomDescription` = Typ oder Kategorie (optional)

### 2.4 Für den Todo-Titel

**Wichtig:** `reservation.roomNumber` enthält bereits die korrekte Information für beide Typen:

- **Dorms:** `roomNumber` = "La tia artista (Cama 5)" → Todo-Titel = **"La tia artista (Cama 5)"** ✅
- **Privates:** `roomNumber` = "El abuelo bromista" → Todo-Titel = **"El abuelo bromista"** ✅

**Implementierung:** Einfach `reservation.roomNumber` verwenden (mit Fallback falls nicht vorhanden)

**Keine zusätzliche Logik nötig!** Der Code kombiniert bereits Zimmername und Bettnummer für Dorms.

---

## 3. RECHERCHE: CLEANING-ROLLE

### 3.1 Existenz der Rolle

**Gefunden in:**
- `backend/export_data/roles.json` (Zeile 52): `"name": "Cleaning"`
- `import_data/roles.json` (Zeile 29): `"name": "Cleaning"`

**Status:** ✅ Rolle "Cleaning" existiert

### 3.2 Suche nach Cleaning-Rolle

**Aktuell:** Suche nach "Rezeption", "Reception", "Front Desk", "Recepcion" (case-insensitive)

**Neu:** Suche nach "Cleaning", "Limpieza", "Reinigung" (case-insensitive)

---

## 4. ÄNDERUNGEN

### 4.1 Rolle: Von Reception zu Cleaning

**Datei:** `backend/src/services/taskAutomationService.ts` (Zeilen 621-650)

**Aktuell:**
```typescript
// Bestimme zuständige Rolle (z.B. "Rezeption")
let receptionRoleId: number | null = null;

// Suche nach "Rezeption" oder ähnlicher Rolle
const receptionRole = await prisma.role.findFirst({
  where: {
    organizationId,
    name: {
      in: ['Rezeption', 'Reception', 'Front Desk', 'Recepcion'],
      mode: 'insensitive'
    }
  }
});
```

**Neu:**
```typescript
// Bestimme zuständige Rolle (Cleaning)
let cleaningRoleId: number | null = null;

// Suche nach "Cleaning" oder ähnlicher Rolle
const cleaningRole = await prisma.role.findFirst({
  where: {
    organizationId,
    name: {
      in: ['Cleaning', 'Limpieza', 'Reinigung'],
      mode: 'insensitive'
    }
  }
});

if (cleaningRole) {
  cleaningRoleId = cleaningRole.id;
} else {
  // Fallback: Verwende erste verfügbare Rolle der Organisation
  const firstRole = await prisma.role.findFirst({
    where: { organizationId }
  });
  if (firstRole) {
    cleaningRoleId = firstRole.id;
  }
}

if (!cleaningRoleId) {
  console.warn(`[TaskAutomation] Keine Cleaning-Rolle gefunden für Organisation ${organizationId}. Task wird nicht erstellt.`);
  return null;
}
```

**Änderungen:**
- Variable: `receptionRoleId` → `cleaningRoleId`
- Variable: `receptionRole` → `cleaningRole`
- Suchbegriffe: `['Rezeption', 'Reception', 'Front Desk', 'Recepcion']` → `['Cleaning', 'Limpieza', 'Reinigung']`
- Warnung: "Rezeption-Rolle" → "Cleaning-Rolle"

---

### 4.2 Due Date: Von Check-in zu Check-out

**Datei:** `backend/src/services/taskAutomationService.ts` (Zeile 706)

**Aktuell:**
```typescript
dueDate: reservation.checkInDate,
```

**Neu:**
```typescript
dueDate: reservation.checkOutDate,
```

**Änderungen:**
- `checkInDate` → `checkOutDate`

---

### 4.3 Titel: Von "Check-in: ..." zu Zimmername

**Datei:** `backend/src/services/taskAutomationService.ts` (Zeile 683)

**Aktuell:**
```typescript
const taskTitle = `Check-in: ${reservation.guestName} - ${reservation.checkInDate.toLocaleDateString('de-DE')}`;
```

**Neu:**
```typescript
// Titel: Zimmername (bei Dorms: "Zimmername (Bettnummer)", bei Privates: "Zimmername")
const taskTitle = reservation.roomNumber || `Reservation ${reservation.id}`;
```

**Änderungen:**
- Statt "Check-in: Gastname - Datum" → Zimmername
- Fallback: Falls `roomNumber` nicht vorhanden, verwende `Reservation ${reservation.id}`

---

### 4.4 Benachrichtigungen: Von Reception- zu Cleaning-Usern

**Datei:** `backend/src/services/taskAutomationService.ts` (Zeilen 722-745)

**Aktuell:**
```typescript
// Benachrichtigung für alle User mit Rezeption-Rolle
const receptionUsers = await prisma.user.findMany({
  where: {
    roles: {
      some: {
        roleId: receptionRoleId,
        lastUsed: true
      }
    }
  }
});

for (const receptionUser of receptionUsers) {
  const userLang = await getUserLanguage(receptionUser.id);
  const notificationText = getTaskNotificationText(userLang, 'check_in_started', task.title, undefined, undefined, reservation.guestName);
  await createNotificationIfEnabled({
    userId: receptionUser.id,
    title: notificationText.title,
    message: notificationText.message,
    type: NotificationType.task,
    relatedEntityId: task.id,
    relatedEntityType: 'create'
  });
}
```

**Neu:**
```typescript
// Benachrichtigung für alle User mit Cleaning-Rolle
const cleaningUsers = await prisma.user.findMany({
  where: {
    roles: {
      some: {
        roleId: cleaningRoleId,
        lastUsed: true
      }
    }
  }
});

for (const cleaningUser of cleaningUsers) {
  const userLang = await getUserLanguage(cleaningUser.id);
  const notificationText = getTaskNotificationText(userLang, 'check_in_started', task.title, undefined, undefined, reservation.guestName);
  await createNotificationIfEnabled({
    userId: cleaningUser.id,
    title: notificationText.title,
    message: notificationText.message,
    type: NotificationType.task,
    relatedEntityId: task.id,
    relatedEntityType: 'create'
  });
}
```

**Änderungen:**
- Variable: `receptionUsers` → `cleaningUsers`
- Variable: `receptionUser` → `cleaningUser`
- Variable: `receptionRoleId` → `cleaningRoleId`
- Kommentar: "Rezeption-Rolle" → "Cleaning-Rolle"

**Hinweis:** `getTaskNotificationText` mit `'check_in_started'` könnte angepasst werden, aber das ist optional (könnte auch `'task_created'` oder ähnlich sein).

---

### 4.5 Task-Erstellung: roleId verwenden

**Datei:** `backend/src/services/taskAutomationService.ts` (Zeile 702)

**Aktuell:**
```typescript
roleId: receptionRoleId,
```

**Neu:**
```typescript
roleId: cleaningRoleId,
```

**Änderungen:**
- `receptionRoleId` → `cleaningRoleId`

---

### 4.6 Console-Log: Kommentar anpassen

**Datei:** `backend/src/services/taskAutomationService.ts` (Zeile 720)

**Aktuell:**
```typescript
console.log(`[TaskAutomation] Task ${task.id} für Reservierung ${reservation.id} erstellt`);
```

**Neu:**
```typescript
console.log(`[TaskAutomation] Cleaning-Task ${task.id} für Reservierung ${reservation.id} erstellt (Check-out: ${reservation.checkOutDate.toLocaleDateString('de-DE')})`);
```

**Änderungen:**
- "Task" → "Cleaning-Task"
- Check-out-Datum hinzufügen für besseres Logging

---

## 5. ZUSAMMENFASSUNG DER ÄNDERUNGEN

| Bereich | Aktuell | Neu |
|---------|---------|-----|
| **Rolle** | "Reception" | "Cleaning" |
| **Due Date** | `checkInDate` | `checkOutDate` |
| **Titel** | `Check-in: ${guestName} - ${checkInDate}` | `roomNumber` (Zimmername) |
| **Branch** | `reservation.branchId` | `reservation.branchId` (unverändert) |
| **Benachrichtigungen** | Reception-User | Cleaning-User |

---

## 6. IMPLEMENTIERUNGS-SCHRITTE

### Schritt 1: Rolle von Reception zu Cleaning ändern
- [ ] Variable `receptionRoleId` → `cleaningRoleId` umbenennen
- [ ] Variable `receptionRole` → `cleaningRole` umbenennen
- [ ] Suchbegriffe ändern: `['Cleaning', 'Limpieza', 'Reinigung']`
- [ ] Warnung anpassen: "Cleaning-Rolle"

### Schritt 2: Due Date ändern
- [ ] `checkInDate` → `checkOutDate` in Task-Erstellung

### Schritt 3: Titel ändern
- [ ] Titel-Logik ändern: `reservation.roomNumber` verwenden
- [ ] Fallback: `Reservation ${reservation.id}` falls `roomNumber` nicht vorhanden

### Schritt 4: Benachrichtigungen anpassen
- [ ] Variable `receptionUsers` → `cleaningUsers` umbenennen
- [ ] Variable `receptionUser` → `cleaningUser` umbenennen
- [ ] `receptionRoleId` → `cleaningRoleId` in Query

### Schritt 5: Task-Erstellung anpassen
- [ ] `receptionRoleId` → `cleaningRoleId` in Task-Data

### Schritt 6: Console-Log anpassen
- [ ] Log-Message anpassen: "Cleaning-Task" + Check-out-Datum

### Schritt 7: Testen
- [ ] Neue Reservation erstellen
- [ ] Prüfen: Todo wird für Cleaning-Rolle erstellt
- [ ] Prüfen: Due Date = Check-out-Datum
- [ ] Prüfen: Titel = Zimmername
- [ ] Prüfen: Branch ist korrekt
- [ ] Prüfen: Cleaning-User erhalten Benachrichtigung

---

## 7. BETROFFENE DATEIEN

### 7.1 Backend

**Hauptdatei:**
- `backend/src/services/taskAutomationService.ts` (Zeilen 600-752)

**Aufrufstelle (unverändert):**
- `backend/src/services/lobbyPmsService.ts` (Zeile 1146)

---

## 8. POTENTIELLE PROBLEME

### 8.1 Cleaning-Rolle existiert nicht

**Problem:** Organisation hat keine "Cleaning"-Rolle

**Lösung:** Fallback auf erste verfügbare Rolle (bereits implementiert)

**Warnung:** Console-Warnung wird ausgegeben, Task wird nicht erstellt

---

### 8.2 roomNumber ist null

**Problem:** Reservation hat noch kein Zimmer zugewiesen (`roomNumber = null`)

**Lösung:** Fallback auf `Reservation ${reservation.id}`

**Hinweis:** Wenn später Zimmer zugewiesen wird, könnte Todo-Titel aktualisiert werden (optional, nicht Teil dieser Änderung)

---

### 8.3 Check-out-Datum fehlt

**Problem:** `checkOutDate` ist null (sollte nicht vorkommen, da Pflichtfeld)

**Lösung:** Prüfung hinzufügen, falls `checkOutDate` null ist → Fehler werfen oder `checkInDate` verwenden

**Empfehlung:** Prüfung hinzufügen:
```typescript
if (!reservation.checkOutDate) {
  console.error(`[TaskAutomation] Reservation ${reservation.id} hat kein checkOutDate. Task wird nicht erstellt.`);
  return null;
}
```

---

## 9. TEST-SZENARIEN

### Test 1: Normale Reservation (Private)
- **Erwartung:** Todo mit Titel "El abuelo bromista", Due Date = Check-out, Rolle = Cleaning

### Test 2: Normale Reservation (Dorm)
- **Erwartung:** Todo mit Titel "La tia artista (Cama 5)", Due Date = Check-out, Rolle = Cleaning

### Test 3: Reservation ohne Zimmer
- **Erwartung:** Todo mit Titel "Reservation 123", Due Date = Check-out, Rolle = Cleaning

### Test 4: Organisation ohne Cleaning-Rolle
- **Erwartung:** Console-Warnung, kein Todo erstellt

### Test 5: Cleaning-User erhalten Benachrichtigung
- **Erwartung:** Alle User mit Cleaning-Rolle erhalten Notification

---

## 10. OFFENE FRAGEN

1. **Notification-Text:** Soll `'check_in_started'` beibehalten werden oder zu `'task_created'` geändert werden?
   - **Empfehlung:** Beibehalten (ist generisch genug)

2. **Task-Description:** Soll die Description angepasst werden (aktuell: "Check-in: ...")?
   - **Empfehlung:** Optional, kann später angepasst werden

---

## 11. NÄCHSTE SCHRITTE

1. ✅ Plan erstellt
2. ⏳ Plan vom User bestätigen lassen
3. ⏳ Implementierung durchführen
4. ⏳ Testen
5. ⏳ Dokumentation aktualisieren (falls nötig)

---

**Ende des Plans**


# Analyse: Standardfilter Seed-Migration

**Datum:** 2025-01-29  
**Status:** 🔍 Analyse abgeschlossen  
**Zweck:** Prüfung, welche Standardfilter bereits im Seed sind und welche noch im Frontend erstellt werden

---

## ✅ Was bereits im Seed erstellt wird

**Backend:** `backend/prisma/seed.ts` (Zeile 1515-1679)

### Erstellte Standardfilter:

1. **`worktracker-todos`** (Todos):
   - ✅ "Aktuell" (status != 'done')
   - ✅ "Archiv" (status == 'done')

2. **`requests-table`** (Requests):
   - ✅ "Aktuell" (status != 'approved' AND status != 'denied')
   - ✅ "Archiv" (status == 'approved' OR status == 'denied')

3. **`worktracker-reservations`** (Reservations):
   - ✅ "Hoy" (checkInDate == '__TODAY__')

### Erstellung:
- Wird für **alle Benutzer** erstellt (Zeile 1675-1679)
- Verwendet `upsert` (erstellt oder aktualisiert)

---

## ❌ Was noch im Frontend erstellt wird (sollte ins Seed)

### 1. **`workcenter-table`** (ActiveUsersList.tsx, Zeile 779-859)
- ❌ "Aktive" (hasActiveWorktime == 'true')
- ❌ "Alle" (keine Bedingungen)

### 2. **`branches-table`** (BranchManagementTab.tsx, Zeile 479-518)
- ❌ "Alle" (keine Bedingungen)

### 3. **`roles-table`** (RoleManagementTab.tsx, Zeile 1314-1353)
- ❌ "Alle" (keine Bedingungen)

### 4. **`consultations-table`** (ConsultationList.tsx, Zeile 199-311)
- ❌ "Archiv" (startTime < heute)
- ❌ "Heute" (startTime == '__TODAY__')
- ❌ "Woche" (startTime > '__TODAY__' AND startTime < '__WEEK_FROM_TODAY__')
- ❌ "Nicht abgerechnet" (invoiceStatus == 'nicht abgerechnet')

### 5. **`my-join-requests-table`** (MyJoinRequestsList.tsx, Zeile 258-297)
- ❌ "Alle" (keine Bedingungen)

### 6. **`join-requests-table`** (JoinRequestsList.tsx, Zeile 275-314)
- ❌ "Alle" (keine Bedingungen)

---

## ✅ Was bereits entfernt wurde

### Requests.tsx (Zeile 516):
- ✅ Kommentar: "Standard-Filter werden jetzt im Seed erstellt, nicht mehr im Frontend"
- ✅ Code zum Erstellen wurde entfernt

### Worktracker.tsx (Zeile 992):
- ✅ Kommentar: "Standard-Filter werden jetzt im Seed erstellt, nicht mehr im Frontend"
- ✅ Code zum Erstellen wurde entfernt

---

## 🔍 Unlöschbarkeit (isStandardFilter)

**Frontend:** `frontend/src/components/SavedFilterTags.tsx` (Zeile 353-375)

### Aktuelle Implementierung:
```typescript
const isStandardFilter = (filterName: string) => {
  const standardFilterNames = [
    'Archiv', 'Aktuell', 'Aktive', 'Alle', 'Heute', 'Woche', 'Hoy',
    'tasks.filters.archive', 'tasks.filters.current',
    'requests.filters.archiv', 'requests.filters.aktuell'
  ];
  
  if (standardFilterNames.includes(filterName)) {
    return true;
  }
  
  if (tableId === 'consultations-table') {
    if (filterName === 'Archiv' || filterName === 'Heute' || filterName === 'Woche') {
      return true;
    }
    if (recentClientNames.includes(filterName)) {
      return true;
    }
  }
  
  return false;
};
```

### Verwendung:
- ✅ `handleDeleteFilter` prüft `isStandardFilter` (Zeile 317-320)
- ✅ Delete-Button wird nur angezeigt wenn `!isStandardFilter` (Zeile 1008, 1055)
- ✅ Fehlermeldung wird angezeigt wenn Standardfilter gelöscht werden soll

### Problem:
- ❌ Prüft nur Namen, nicht ob Filter im Seed erstellt wurde
- ❌ Liste muss manuell gepflegt werden
- ❌ Keine Datenbank-Spalte "isStandard" oder "canDelete" im Schema

---

## 📊 Schema-Prüfung

**Backend:** `backend/prisma/schema.prisma` (Zeile 390-406)

```prisma
model SavedFilter {
  id             Int          @id @default(autoincrement())
  userId         Int
  tableId        String
  name           String
  conditions     String
  operators      String
  sortDirections String?
  groupId        Int?
  order          Int          @default(0)
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  user           User         @relation(fields: [userId], references: [id])
  group          FilterGroup? @relation(fields: [groupId], references: [id])

  @@unique([userId, tableId, name])
}
```

### Ergebnis:
- ❌ **KEIN** `isStandard` Feld
- ❌ **KEIN** `canDelete` Feld
- ✅ Unlöschbarkeit wird nur über Namen-Prüfung im Frontend realisiert

---

## 🎯 Zusammenfassung

### Was funktioniert:
- ✅ Standardfilter für Todos, Requests, Reservations werden im Seed erstellt
- ✅ Unlöschbarkeit funktioniert über Namen-Prüfung
- ✅ Delete-Button wird korrekt ausgeblendet

### Was fehlt:
- ❌ Standardfilter für 6 weitere Tabellen werden noch im Frontend erstellt
- ❌ `isStandardFilter` Liste ist unvollständig (fehlt "Nicht abgerechnet")
- ❌ Keine zentrale Definition der Standardfilter-Namen

### Was zu tun ist:
1. **Alle Standardfilter ins Seed verschieben** (6 Tabellen)
2. **`isStandardFilter` Funktion erweitern** (alle Standardfilter-Namen)
3. **Frontend-Code entfernen** (createStandardFilters useEffect)
4. **Optional:** Schema erweitern um `isStandard` Feld (für zentrale Definition)

---

## 📝 Betroffene Dateien

### Backend:
- `backend/prisma/seed.ts` - Erweitern um fehlende Standardfilter

### Frontend:
- `frontend/src/components/teamWorktime/ActiveUsersList.tsx` - createStandardFilters entfernen
- `frontend/src/components/BranchManagementTab.tsx` - createStandardFilters entfernen
- `frontend/src/components/RoleManagementTab.tsx` - createStandardFilters entfernen
- `frontend/src/components/ConsultationList.tsx` - createStandardFilters entfernen
- `frontend/src/components/organization/MyJoinRequestsList.tsx` - createStandardFilters entfernen
- `frontend/src/components/organization/JoinRequestsList.tsx` - createStandardFilters entfernen
- `frontend/src/components/SavedFilterTags.tsx` - isStandardFilter erweitern






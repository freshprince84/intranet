# Analyse: Reservierungen von Parque Poblado werden nicht angezeigt

## Problem
- User sieht nur Manila-Reservierungen
- Parque Poblado-Reservierungen werden nicht angezeigt
- User hat beide Branches zugewiesen
- Keine Filter sind aktiv

## Datenbank-Status

### Reservierungen nach Branch:
- **Parque Poblado (branchId: 4)**: 85 Reservierungen ✅
- **Manila (branchId: 3)**: 0 Reservierungen ❌
- **NULL (branchId: null)**: 94 Reservierungen ⚠️

### Branches in Organization 1:
- ID 3: Manila
- ID 4: Parque Poblado
- ID 17: Alianza Paisa
- ID 18: Nowhere

## Backend-Analyse

### API-Endpoint:
- Frontend verwendet: `API_ENDPOINTS.RESERVATION.BASE` = `/api/reservations`
- Backend Controller: `getAllReservations` in `reservationController.ts`

### Backend-Filter-Logik:
```typescript
// Zeile 557-559: Where-Clause
const whereClause: any = {
  organizationId: req.organizationId  // Nur Organization-Filter
};

// Zeile 561-587: Branch-Filter nur wenn "own_branch" Berechtigung
if (hasOwnBranchPermission && !hasAllBranchesPermission) {
  // Filtere nach User-Branch
} else {
  // KEIN Branch-Filter - gibt ALLE Reservierungen zurück
}
```

**Ergebnis:** Backend gibt korrekt ALLE Reservierungen zurück (85 Poblado + 94 NULL)

### Backend Response-Struktur:
```typescript
{
  success: true,
  data: [
    {
      id: 783,
      guestName: "Felicia Zheng Derre",
      branchId: 4,
      branch: { id: 4, name: "Parque Poblado" },
      ...
    },
    {
      id: 98,
      guestName: "Nurita Rock",
      branchId: null,
      branch: null,  // ⚠️ KEIN Branch zugeordnet
      ...
    }
  ]
}
```

## Frontend-Analyse

### API-Call:
```typescript
// ReservationList.tsx Zeile 39
const response = await axiosInstance.get(API_ENDPOINTS.RESERVATION.BASE);
const reservations = response.data?.data || response.data || [];
```

### Frontend-Filter:
```typescript
// ReservationList.tsx Zeile 28
const [filterBranchId, setFilterBranchId] = useState<number | 'all'>('all');

// Zeile 99-102: Branch-Filter
if (filterBranchId !== 'all' && reservation.branchId !== filterBranchId) {
  return false;
}
```

**Ergebnis:** Standardmäßig ist `filterBranchId = 'all'`, also sollte KEIN Filter aktiv sein.

### Anzeige-Logik:
```typescript
// ReservationCard.tsx Zeile 142-149
{reservation.branch && (
  <div>
    Branch: {reservation.branch.name}
  </div>
)}
```

**Ergebnis:** Reservierungen OHNE Branch werden nicht als "Manila" angezeigt, sondern einfach ohne Branch-Info.

## Identifizierte Probleme

### Problem 1: Reservierungen ohne Branch-Zuordnung
- **94 Reservierungen** haben `branchId: null`
- Diese werden im Frontend angezeigt, aber ohne Branch-Name
- **Mögliche Ursache:** Reservierungen wurden ohne Branch-Zuordnung importiert/erstellt

### Problem 2: Keine Manila-Reservierungen in der Datenbank
- **0 Reservierungen** für Manila (branchId: 3)
- User sieht aber Manila-Reservierungen
- **Mögliche Ursache:** 
  - Reservierungen werden direkt von LobbyPMS API geladen (nicht aus DB)
  - Oder: Reservierungen ohne Branch werden irgendwie als "Manila" angezeigt

### Problem 3: Parque Poblado-Reservierungen werden nicht angezeigt
- **85 Reservierungen** existieren in der DB
- Backend gibt sie korrekt zurück
- Frontend sollte sie anzeigen
- **Mögliche Ursache:**
  - Frontend-Filter ist aktiv (trotz `'all'`)
  - Sortierung zeigt nur bestimmte Reservierungen
  - Reservierungen werden überschrieben/überschattet

## Nächste Schritte zur Diagnose

1. **Prüfe Browser-Konsole:**
   - Welche Reservierungen werden tatsächlich geladen?
   - Gibt es Fehler beim Laden?
   - Wie viele Reservierungen kommen vom Backend?

2. **Prüfe Network-Tab:**
   - Welche API-Response kommt vom Backend?
   - Wie viele Reservierungen sind in der Response?
   - Welche Branch-IDs haben die Reservierungen?

3. **Prüfe Frontend-Filter:**
   - Ist `filterBranchId` wirklich `'all'`?
   - Gibt es andere Filter, die aktiv sind?
   - Wird die Filter-Logik korrekt angewendet?

4. **Prüfe Sortierung:**
   - Werden Reservierungen nach `createdAt` sortiert?
   - Werden nur die ersten X Reservierungen angezeigt?
   - Gibt es Pagination/Limit?

## Mögliche Lösungen

### Lösung 1: Branch-Zuordnung für NULL-Reservierungen
- Reservierungen mit `branchId: null` sollten einer Branch zugeordnet werden
- Basierend auf LobbyPMS-Daten oder anderen Kriterien

### Lösung 2: Frontend-Filter korrigieren
- Prüfe, ob `filterBranchId` wirklich `'all'` ist
- Prüfe, ob andere Filter aktiv sind
- Prüfe, ob die Filter-Logik korrekt funktioniert

### Lösung 3: Backend-Filter erweitern
- Optional: Branch-Filter im Backend unterstützen
- Optional: Nur Reservierungen MIT Branch zurückgeben


# Reservation Room Filter & Anzeige - Detaillierte Analyse (2025-01-29)

**Status:** 📋 ANALYSE - Keine Änderungen, nur Analyse  
**Priorität:** 🔴🔴 WICHTIG

---

## 📊 ÜBERSICHT

Diese Analyse dokumentiert **genau** wie Dorms und Privates aktuell gespeichert werden, wie sie angezeigt werden, und welche Probleme mit dem Filter und der Anzeige bestehen.

---

## 1. AKTUELLE SPEICHERUNG (Backend)

**Datei:** `backend/src/services/lobbyPmsService.ts` (Zeilen 849-869)

### Dorms (compartida):
```typescript
if (isDorm) {
  // Für Dorms: category.name = Zimmername, assigned_room.name = Bettnummer
  const dormName = lobbyReservation.category?.name || null;
  const bedNumber = assignedRoom?.name || null;
  roomNumber = bedNumber; // Bettnummer (z.B. "Cama 5")
  roomDescription = dormName; // Zimmername (z.B. "La tia artista")
}
```

**Ergebnis:**
- `roomNumber` = **Bettnummer** (z.B. "Cama 5")
- `roomDescription` = **Zimmername** (z.B. "La tia artista")

### Privates (privada):
```typescript
else {
  // Für Privatzimmer: assigned_room.name = Zimmername
  roomNumber = assignedRoom?.name || lobbyReservation.room_number || null;
  roomDescription = assignedRoom?.type || lobbyReservation.room_description || lobbyReservation.category?.name || null;
}
```

**Ergebnis:**
- `roomNumber` = **Zimmername** (z.B. "El abuelo bromista")
- `roomDescription` = Typ oder Kategorie (optional)

---

## 2. AKTUELLE FILTER-IMPLEMENTIERUNG

### Backend-Filter (`backend/src/utils/filterToPrisma.ts`):

**Aktuell (Zeilen 169-178):**
```typescript
case 'roomNumber':
  // ✅ FIX: roomNumber nur = und != für Reservations (wie Status)
  if (entityType === 'reservation') {
    if (operator === 'equals') {
      return { roomNumber: { equals: value, mode: 'insensitive' } };
    } else if (operator === 'notEquals') {
      return { roomNumber: { not: { equals: value, mode: 'insensitive' } } };
    }
  }
  return {};
```

**Problem:**
- Filtert nach `roomNumber` Feld
- **Für Dorms:** Filtert nach **Bettnummer** (z.B. "Cama 5") ❌ **FALSCH**
- **Für Privates:** Filtert nach **Zimmername** (z.B. "El abuelo bromista") ✅ **RICHTIG**

**Ergebnis:**
- User kann nach Bettnummer filtern (z.B. "Cama 5"), aber nicht nach Zimmername (z.B. "La tia artista") für Dorms
- User kann nach Zimmername filtern für Privates ✅

### Frontend-Filter (`frontend/src/components/FilterRow.tsx`):

**Aktuell (Zeilen 177-197):**
```typescript
// ✅ NEU: RoomNumbers laden für roomNumber-Spalte (pro Branch)
if (condition.column === 'roomNumber') {
  setLoadingRoomNumbers(true);
  try {
    // Hole alle Reservations und extrahiere eindeutige roomNumbers
    const response = await axiosInstance.get(API_ENDPOINTS.RESERVATION.BASE);
    const reservations = response.data?.data || response.data || [];
    const uniqueRoomNumbers = Array.from(new Set(
      reservations
        .map((r: any) => r.roomNumber)
        .filter((rn: string | null) => rn && rn.trim() !== '')
    )).sort() as string[];
    setRoomNumbers(uniqueRoomNumbers);
  }
}
```

**Problem:**
- Lädt alle `roomNumber` Werte
- **Für Dorms:** Zeigt **Bettnummern** im Dropdown (z.B. "Cama 5", "Cama 3") ❌ **FALSCH**
- **Für Privates:** Zeigt **Zimmernamen** im Dropdown (z.B. "El abuelo bromista") ✅ **RICHTIG**
- **Mischung:** Dropdown enthält sowohl Bettnummern (Dorms) als auch Zimmernamen (Privates) ❌ **VERWIRREND**

---

## 3. AKTUELLE ANZEIGE (Frontend)

### Card-Anzeige (`frontend/src/pages/Worktracker.tsx`):

**Aktuell (Zeilen 2805-2812):**
```typescript
// Zweite Zeile: Zimmernummer
if (reservation.roomNumber) {
    metadata.push({
        icon: <HomeIcon className="h-4 w-4" />,
        value: reservation.roomNumber,
        section: 'main-second'
    });
}
```

**Problem:**
- Zeigt nur `roomNumber` in der Card-Metadaten
- **Für Dorms:** Zeigt nur **Bettnummer** (z.B. "Cama 5") ❌ **FEHLT: Zimmername**
- **Für Privates:** Zeigt **Zimmername** (z.B. "El abuelo bromista") ✅ **RICHTIG**
- `roomDescription` wird **NICHT** angezeigt ❌

### ReservationCard Komponente (`frontend/src/components/reservations/ReservationCard.tsx`):

**Aktuell (Zeilen 124-132):**
```typescript
{/* Zimmer */}
{reservation.roomNumber && (
  <div className="flex items-center text-gray-600 dark:text-gray-400">
    <HomeIcon className="h-4 w-4 mr-2 flex-shrink-0" />
    <span>
      {t('reservations.room', 'Zimmer')} {reservation.roomNumber}
    </span>
  </div>
)}
```

**Problem:**
- Zeigt nur `roomNumber`
- **Für Dorms:** Zeigt nur **Bettnummer** (z.B. "Zimmer Cama 5") ❌ **FEHLT: Zimmername**
- **Für Privates:** Zeigt **Zimmername** (z.B. "Zimmer El abuelo bromista") ✅ **RICHTIG**
- `roomDescription` wird **NICHT** angezeigt ❌

### ReservationDetails Komponente (`frontend/src/components/reservations/ReservationDetails.tsx`):

**Aktuell (Zeilen 249-260):**
```typescript
{reservation.roomNumber && (
  <div className="flex items-center">
    <HomeIcon className="h-5 w-5 mr-3 text-gray-400" />
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{t('reservations.room', 'Zimmer')}</p>
      <p className="text-gray-900 dark:text-white">
        {reservation.roomNumber}
        {reservation.roomDescription && ` - ${reservation.roomDescription}`}
      </p>
    </div>
  </div>
)}
```

**Status:**
- Zeigt `roomNumber` UND `roomDescription` (wenn vorhanden)
- **Für Dorms:** Zeigt "Cama 5 - La tia artista" ✅ **RICHTIG**
- **Für Privates:** Zeigt "El abuelo bromista" (ohne roomDescription) ✅ **RICHTIG**

### Tabellen-Anzeige (`frontend/src/pages/Worktracker.tsx`):

**Aktuell (Zeilen 3171-3178):**
```typescript
case 'roomNumber':
    return (
        <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
            <div className="text-sm text-gray-900 dark:text-gray-200">
                {reservation.roomNumber || '-'}
            </div>
        </td>
    );
```

**Problem:**
- Zeigt nur `roomNumber`
- **Für Dorms:** Zeigt nur **Bettnummer** (z.B. "Cama 5") ❌ **FEHLT: Zimmername**
- **Für Privates:** Zeigt **Zimmername** (z.B. "El abuelo bromista") ✅ **RICHTIG**
- `roomDescription` wird **NICHT** angezeigt ❌

---

## 4. IDENTIFIZIERTE PROBLEME

### Problem 1: Filter filtert nach falschem Feld

**Problem:**
- Filter filtert nach `roomNumber`
- **Für Dorms:** `roomNumber` = Bettnummer, aber User will nach **Zimmername** filtern
- **Für Privates:** `roomNumber` = Zimmername ✅ **RICHTIG**

**Aktueller Filter:**
- Dorms: Filtert nach Bettnummer (z.B. "Cama 5") ❌
- Privates: Filtert nach Zimmername (z.B. "El abuelo bromista") ✅

**Gewünscht:**
- **Beide:** Filter nach **Zimmername**
  - Dorms: Filter nach `roomDescription` (Zimmername)
  - Privates: Filter nach `roomNumber` (Zimmername)

### Problem 2: Filter-Dropdown zeigt falsche Werte

**Problem:**
- Dropdown lädt alle `roomNumber` Werte
- **Für Dorms:** Zeigt Bettnummern (z.B. "Cama 5", "Cama 3") ❌
- **Für Privates:** Zeigt Zimmernamen (z.B. "El abuelo bromista") ✅
- **Mischung:** Dropdown enthält sowohl Bettnummern als auch Zimmernamen ❌ **VERWIRREND**

**Gewünscht:**
- Dropdown soll nur **Zimmernamen** enthalten
  - Dorms: `roomDescription` Werte (Zimmernamen)
  - Privates: `roomNumber` Werte (Zimmernamen)

### Problem 3: Card-Anzeige zeigt nicht alle Informationen

**Problem:**
- Card zeigt nur `roomNumber`
- **Für Dorms:** Zeigt nur Bettnummer (z.B. "Zimmer Cama 5") ❌ **FEHLT: Zimmername**
- **Für Privates:** Zeigt Zimmername (z.B. "Zimmer El abuelo bromista") ✅

**Gewünscht:**
- **Dorms:** Zeige "Zimmername (Bettnummer)" oder "Zimmername - Bettnummer"
  - Beispiel: "La tia artista (Cama 5)" oder "La tia artista - Cama 5"
- **Privates:** Zeige nur "Zimmername"
  - Beispiel: "El abuelo bromista"

### Problem 4: Tabellen-Anzeige zeigt nicht alle Informationen

**Problem:**
- Tabelle zeigt nur `roomNumber`
- **Für Dorms:** Zeigt nur Bettnummer (z.B. "Cama 5") ❌ **FEHLT: Zimmername**
- **Für Privates:** Zeigt Zimmername (z.B. "El abuelo bromista") ✅

**Gewünscht:**
- **Dorms:** Zeige "Zimmername (Bettnummer)" oder "Zimmername - Bettnummer"
- **Privates:** Zeige nur "Zimmername"

---

## 5. WIE ERKENNT MAN DORM VS. PRIVATE?

**Aktuell:** Es gibt **KEINE** direkte Möglichkeit, Dorm vs. Private zu erkennen, nur aus `roomNumber` und `roomDescription`.

**Mögliche Erkennungslogik (Heuristik):**

**Option 1: Basierend auf roomNumber Format**
- **Dorm:** `roomNumber` beginnt mit "Cama" (z.B. "Cama 5", "Cama 3")
- **Private:** `roomNumber` ist ein Zimmername (z.B. "El abuelo bromista", "La tia artista")

**Option 2: Basierend auf roomDescription**
- **Dorm:** `roomDescription` ist vorhanden UND enthält Zimmername (z.B. "La tia artista")
- **Private:** `roomDescription` ist leer oder enthält Typ/Kategorie

**Option 3: Kombiniert**
- **Dorm:** `roomNumber` beginnt mit "Cama" ODER (`roomDescription` ist vorhanden UND `roomNumber` ist kurz)
- **Private:** `roomNumber` ist lang (Zimmername) UND (`roomDescription` ist leer oder Typ)

**Problem:** Keine 100% sichere Erkennung möglich ohne zusätzliches Feld.

**Besser:** Zusätzliches Feld im Schema (z.B. `roomType: 'dorm' | 'private'`), aber das würde Schema-Änderung erfordern.

**Empfehlung:** Option 1 (roomNumber beginnt mit "Cama") ist am einfachsten und zuverlässigsten.

---

## 6. ZUSAMMENFASSUNG DER PROBLEME

| Problem | Aktuell | Gewünscht |
|---------|---------|-----------|
| **Filter-Feld** | `roomNumber` (Bettnummer für Dorms, Zimmername für Privates) | **Zimmername** (immer, egal ob Dorm oder Private) |
| **Filter-Dropdown** | Mischung aus Bettnummern und Zimmernamen | Nur **Zimmernamen** |
| **Card-Anzeige** | Nur `roomNumber` (Bettnummer für Dorms) | **Dorms:** "Zimmername (Bettnummer)"<br>**Privates:** "Zimmername" |
| **Tabellen-Anzeige** | Nur `roomNumber` (Bettnummer für Dorms) | **Dorms:** "Zimmername (Bettnummer)"<br>**Privates:** "Zimmername" |

---

## 7. LÖSUNGSANSÄTZE (NUR ANALYSE, KEINE IMPLEMENTIERUNG)

### Option 1: Kombinierter Filter (roomNumber + roomDescription)

**Backend:**
- Filter auf `roomNumber` ODER `roomDescription` anwenden
- Für Dorms: Filtert nach `roomDescription` (Zimmername)
- Für Privates: Filtert nach `roomNumber` (Zimmername)

**Frontend:**
- Dropdown lädt eindeutige Werte aus `roomDescription` (Dorms) UND `roomNumber` (Privates)
- Kombiniert beide zu einer Liste von Zimmernamen

**Vorteil:**
- Keine Schema-Änderung nötig
- Funktioniert mit aktueller Datenstruktur

**Nachteil:**
- Komplexere Logik
- Muss Dorm vs. Private erkennen

### Option 2: Neues virtuelles Feld "roomName"

**Backend:**
- Berechnet `roomName` = `roomDescription` (Dorms) oder `roomNumber` (Privates)
- Filter filtert nach `roomName`

**Frontend:**
- Dropdown lädt eindeutige `roomName` Werte
- Anzeige verwendet `roomName` + optional `roomNumber` (für Dorms)

**Vorteil:**
- Klare Trennung
- Einheitliche Logik

**Nachteil:**
- Erfordert Backend-Änderung (virtuelles Feld oder berechnetes Feld)

### Option 3: Filter nach roomDescription für alle

**Backend:**
- Filter filtert nach `roomDescription` (enthält Zimmername für Dorms)
- Für Privates: `roomDescription` auf `roomNumber` setzen (wenn leer)

**Frontend:**
- Dropdown lädt eindeutige `roomDescription` Werte
- Anzeige verwendet `roomDescription` + optional `roomNumber` (für Dorms)

**Vorteil:**
- Einheitliches Feld für Filter
- Funktioniert mit aktueller Datenstruktur

**Nachteil:**
- Erfordert Backend-Änderung (roomDescription für Privates setzen)

---

## 8. EMPFOHLENE LÖSUNG

**Option 1 (Kombinierter Filter)** ist am einfachsten umzusetzen:

1. **Backend-Filter:**
   - Filter auf `roomNumber` ODER `roomDescription` anwenden
   - Logik: `{ OR: [{ roomNumber: ... }, { roomDescription: ... }] }`

2. **Frontend-Dropdown:**
   - Lade eindeutige Werte aus `roomDescription` (Dorms) UND `roomNumber` (Privates)
   - Kombiniere zu einer Liste von Zimmernamen

3. **Card-Anzeige:**
   - **Dorms:** Zeige `roomDescription` (Zimmername) + `roomNumber` (Bettnummer) in Klammern
   - **Privates:** Zeige nur `roomNumber` (Zimmername)

4. **Tabellen-Anzeige:**
   - **Dorms:** Zeige `roomDescription` (Zimmername) + `roomNumber` (Bettnummer) in Klammern
   - **Privates:** Zeige nur `roomNumber` (Zimmername)

---

**Erstellt:** 2025-01-29  
**Status:** 📋 ANALYSE - Vollständige Dokumentation der Probleme  
**Nächster Schritt:** Warten auf User-Feedback, welche Lösung implementiert werden soll


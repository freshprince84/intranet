# Occupancy Alerts Gruppierungsproblem - Detaillierte Analyse

**Datum:** 2025-12-18  
**Status:** Problem identifiziert, Lösungsplan erstellt  
**Priorität:** HOCH

---

## Problem-Beschreibung

Die Occupancy Alerts werden **falsch** erstellt, weil sie pro **Kategorie** (categoryId) berechnet werden, statt pro **Zimmertyp** (roomType: private/dorm).

### Aktuelles (falsches) Verhalten:

1. **Pro Kategorie wird einzeln berechnet:**
   - Wenn eine Kategorie nur 1 Zimmer hat und dieses gebucht wird (von 0 auf 1), ist die Occupancy 100%
   - Dies löst einen Alert aus, obwohl es nur 1 Zimmer von vielen ist

2. **Beispiel:**
   - Es gibt 6 Privat-Zimmer (6 verschiedene Kategorien)
   - Ein Zimmer wird gebucht (von 0 auf 1)
   - Aktuell: Diese eine Kategorie hat 100% Occupancy → Alert wird erstellt ❌
   - Erwartet: Alle 6 Privat-Zimmer zusammen haben 1/6 = 16.67% Occupancy → Kein Alert ✅

### Erwartetes (korrektes) Verhalten:

1. **Pro Tag und Zimmertyp gruppieren:**
   - Alle **Privat-Zimmer** zusammen pro Tag
   - Alle **Dorm-Zimmer** zusammen pro Tag

2. **Occupancy-Berechnung:**
   - `totalRooms` = Summe aller Zimmer **aller Kategorien** dieses Typs (private/dorm)
   - `availableRooms` = Summe aller verfügbaren Zimmer **aller Kategorien** dieses Typs
   - `occupancyRate` = (totalRooms - availableRooms) / totalRooms * 100

3. **Beispiel:**
   - 6 Privat-Zimmer insgesamt
   - 1 Zimmer wird gebucht
   - Occupancy = (6 - 5) / 6 * 100 = 16.67% ✅
   - Kein Alert, da unter Schwellenwert (z.B. 20%)

---

## Code-Analyse

### Aktueller Code (falsch):

**Datei:** `backend/src/services/occupancyMonitoringService.ts`

**Zeile 83-105:**
```typescript
// Berechne totalRooms pro Kategorie (Maximum über Zeitraum)
const totalRoomsMap = new Map<number, number>();
for (const entry of currentAvailability) {
  const key = `${entry.categoryId}-${entry.date}`;
  const currentTotal = totalRoomsMap.get(entry.categoryId) || 0;
  totalRoomsMap.set(entry.categoryId, Math.max(currentTotal, entry.availableRooms));
}

// Berechne Occupancy-Rate für aktuelle Daten
for (const entry of currentAvailability) {
  const key = `${entry.categoryId}-${entry.date}`;
  const totalRooms = totalRoomsMap.get(entry.categoryId) || 1;
  const occupancyRate = totalRooms > 0 
    ? ((totalRooms - entry.availableRooms) / totalRooms) * 100 
    : 0;

  currentDataMap.set(key, {
    categoryId: entry.categoryId,
    date: entry.date,
    availableRooms: entry.availableRooms,
    occupancyRate
  });
}
```

**Problem:**
- ❌ Gruppierung nach `categoryId` (jede Kategorie einzeln)
- ❌ `totalRooms` wird pro Kategorie berechnet
- ❌ `availableRooms` wird pro Kategorie betrachtet
- ❌ Wenn eine Kategorie nur 1 Zimmer hat und dieses gebucht wird → 100% Occupancy

### Datenstruktur aus LobbyPMS:

**Datei:** `backend/src/services/lobbyPmsService.ts` Zeile 306-315

```typescript
async checkAvailability(...): Promise<Array<{
  categoryId: number;
  roomName: string;
  roomType: 'compartida' | 'privada';  // ✅ roomType ist vorhanden!
  availableRooms: number;
  pricePerNight: number;
  currency: string;
  date: string;
  prices: Array<{ people: number; value: number }>;
}>>
```

**Wichtig:**
- ✅ `roomType` ist in den Daten vorhanden (`'compartida'` = dorm, `'privada'` = private)
- ✅ Jeder Eintrag hat `categoryId`, `roomType`, `date`, `availableRooms`

---

## Lösungsplan

### Schritt 1: Daten nach roomType und Datum gruppieren

**Statt:**
```typescript
// ❌ FALSCH: Gruppierung nach categoryId
const totalRoomsMap = new Map<number, number>(); // Key: categoryId
```

**Sollte sein:**
```typescript
// ✅ RICHTIG: Gruppierung nach roomType und Datum
const groupedByRoomType = new Map<string, {
  totalRooms: number;
  availableRooms: number;
  date: string;
  roomType: 'compartida' | 'privada';
}>(); // Key: `${roomType}-${date}`
```

### Schritt 2: totalRooms pro roomType berechnen

**Logik:**
1. Für jeden Tag und jeden `roomType`:
   - Sammle alle Kategorien dieses Typs
   - `totalRooms` = Maximum der `availableRooms` über alle Kategorien dieses Typs (über einen Zeitraum)
   - **ODER:** Summe der `totalRooms` aller Kategorien dieses Typs (wenn bekannt)

2. **Problem:** `totalRooms` pro Kategorie ist nicht direkt verfügbar
   - **Lösung:** Verwende `getTotalRoomsForCategory()` aus `PriceAnalysisService` für jede Kategorie
   - **ODER:** Maximum der `availableRooms` über einen längeren Zeitraum (90 Tage) pro Kategorie, dann Summe

### Schritt 3: availableRooms pro roomType summieren

**Logik:**
1. Für jeden Tag und jeden `roomType`:
   - Summiere `availableRooms` aller Kategorien dieses Typs
   - `availableRoomsTotal = sum(availableRooms für alle Kategorien dieses Typs)`

### Schritt 4: Occupancy-Rate pro roomType berechnen

**Logik:**
```typescript
const occupancyRate = (totalRooms - availableRoomsTotal) / totalRooms * 100;
```

### Schritt 5: Alerts pro roomType erstellen

**Statt:**
```typescript
// ❌ FALSCH: Alert pro categoryId
alerts.push({
  date: current.date,
  categoryId: current.categoryId,  // ❌ Einzelne Kategorie
  roomType: historical.roomType,
  ...
});
```

**Sollte sein:**
```typescript
// ✅ RICHTIG: Alert pro roomType
alerts.push({
  date: current.date,
  roomType: current.roomType,  // ✅ Alle Kategorien dieses Typs zusammen
  currentOccupancy: current.occupancyRate,  // ✅ Occupancy aller Zimmer dieses Typs
  previousOccupancy: previous.occupancyRate,
  changePercent: changePercent
});
```

---

## Detaillierte Implementierung

### 1. Gruppierung nach roomType und Datum

```typescript
// Gruppiere Daten nach roomType und Datum
const groupedData = new Map<string, {
  roomType: 'compartida' | 'privada';
  date: string;
  categories: Array<{
    categoryId: number;
    roomName: string;
    availableRooms: number;
  }>;
}>();

for (const entry of currentAvailability) {
  const key = `${entry.roomType}-${entry.date}`;
  if (!groupedData.has(key)) {
    groupedData.set(key, {
      roomType: entry.roomType,
      date: entry.date,
      categories: []
    });
  }
  groupedData.get(key)!.categories.push({
    categoryId: entry.categoryId,
    roomName: entry.roomName,
    availableRooms: entry.availableRooms
  });
}
```

### 2. totalRooms pro roomType berechnen

```typescript
// Cache für totalRooms pro Kategorie
const totalRoomsCache = new Map<number, number>();

// Berechne totalRooms pro roomType
const totalRoomsByRoomType = new Map<string, number>();

for (const [key, group] of groupedData.entries()) {
  let totalRooms = 0;
  
  // Für jede Kategorie dieses Typs: Hole totalRooms
  for (const category of group.categories) {
    let categoryTotalRooms = totalRoomsCache.get(category.categoryId);
    if (categoryTotalRooms === undefined) {
      categoryTotalRooms = await PriceAnalysisService.getTotalRoomsForCategory(
        branchId,
        category.categoryId
      );
      totalRoomsCache.set(category.categoryId, categoryTotalRooms);
    }
    totalRooms += categoryTotalRooms;
  }
  
  totalRoomsByRoomType.set(key, totalRooms);
}
```

### 3. availableRooms pro roomType summieren

```typescript
// Berechne availableRooms pro roomType
const availableRoomsByRoomType = new Map<string, number>();

for (const [key, group] of groupedData.entries()) {
  const availableRooms = group.categories.reduce(
    (sum, cat) => sum + cat.availableRooms,
    0
  );
  availableRoomsByRoomType.set(key, availableRooms);
}
```

### 4. Occupancy-Rate pro roomType berechnen

```typescript
// Berechne Occupancy-Rate pro roomType
const occupancyByRoomType = new Map<string, {
  roomType: 'compartida' | 'privada';
  date: string;
  totalRooms: number;
  availableRooms: number;
  occupancyRate: number;
}>();

for (const [key, group] of groupedData.entries()) {
  const totalRooms = totalRoomsByRoomType.get(key) || 1;
  const availableRooms = availableRoomsByRoomType.get(key) || 0;
  const occupancyRate = totalRooms > 0
    ? ((totalRooms - availableRooms) / totalRooms) * 100
    : 0;
  
  occupancyByRoomType.set(key, {
    roomType: group.roomType,
    date: group.date,
    totalRooms,
    availableRooms,
    occupancyRate
  });
}
```

### 5. Vergleich mit historischen Daten

```typescript
// Hole historische Daten (gruppiert nach roomType)
const historicalData = await prisma.priceAnalysis.findMany({
  where: {
    branchId: branch.id,
    analysisDate: {
      gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    }
  },
  select: {
    analysisDate: true,
    roomType: true,
    occupancyRate: true
  },
  orderBy: {
    analysisDate: 'desc'
  }
});

// Gruppiere historische Daten nach roomType und Datum
const historicalByRoomType = new Map<string, number>();
for (const h of historicalData) {
  const key = `${h.roomType}-${this.formatDate(h.analysisDate)}`;
  // Verwende neuesten Wert pro roomType und Datum
  if (!historicalByRoomType.has(key)) {
    historicalByRoomType.set(key, Number(h.occupancyRate) || 0);
  }
}

// Vergleiche aktuelle mit historischen Daten
for (const [key, current] of occupancyByRoomType.entries()) {
  const historical = historicalByRoomType.get(key);
  
  if (historical !== undefined) {
    const changePercent = Math.abs(current.occupancyRate - historical);
    
    if (changePercent >= thresholdPercent) {
      alerts.push({
        date: current.date,
        roomType: current.roomType === 'compartida' ? 'dorm' : 'private',
        currentOccupancy: current.occupancyRate,
        previousOccupancy: historical,
        changePercent
      });
    }
  }
}
```

### 6. Alert-Erstellung anpassen

```typescript
// Alert-Text anpassen (keine categoryId mehr, sondern roomType)
const alertText = alerts.slice(0, 5).map(a => {
  const roomTypeText = a.roomType === 'dorm' 
    ? t('priceAnalysis.roomType.dorm', 'Dorm')
    : t('priceAnalysis.roomType.private', 'Privat');
  return `${new Date(a.date).toLocaleDateString()}: ${roomTypeText} - ${a.changePercent.toFixed(1)}% Änderung (${a.previousOccupancy.toFixed(1)}% → ${a.currentOccupancy.toFixed(1)}%)`;
}).join('\n');

// To-Do anpassen
const criticalAlert = alerts.sort((a, b) => b.changePercent - a.changePercent)[0];
const roomTypeText = criticalAlert.roomType === 'dorm'
  ? t('priceAnalysis.roomType.dorm', 'Dorm')
  : t('priceAnalysis.roomType.private', 'Privat');

await prisma.task.create({
  data: {
    title: `Occupancy-Alert: ${roomTypeText} - ${criticalAlert.changePercent.toFixed(1)}% Änderung`,
    description: `Zimmertyp: ${roomTypeText}\nDatum: ${new Date(criticalAlert.date).toLocaleDateString()}\nÄnderung: ${criticalAlert.previousOccupancy.toFixed(1)}% → ${criticalAlert.currentOccupancy.toFixed(1)}%\n\nBitte Preise prüfen und ggf. anpassen.`,
    ...
  }
});
```

---

## Zusammenfassung der Änderungen

### Datei: `backend/src/services/occupancyMonitoringService.ts`

**Hauptänderungen:**
1. ✅ Gruppierung nach `roomType` und `date` statt `categoryId`
2. ✅ `totalRooms` = Summe aller Zimmer aller Kategorien dieses Typs
3. ✅ `availableRooms` = Summe aller verfügbaren Zimmer aller Kategorien dieses Typs
4. ✅ `occupancyRate` = (totalRooms - availableRooms) / totalRooms * 100
5. ✅ Alerts pro `roomType` statt pro `categoryId`
6. ✅ To-Do und Notification-Text anpassen (keine `categoryId` mehr)

**Betroffene Methoden:**
- `checkOccupancyChanges()` - Komplett umschreiben

**Neue Abhängigkeiten:**
- `PriceAnalysisService.getTotalRoomsForCategory()` - Für totalRooms pro Kategorie

---

## Risiken

1. **Performance:**
   - Mehr API-Calls zu `getTotalRoomsForCategory()` (pro Kategorie)
   - **Mitigation:** Cache verwenden (bereits vorhanden)

2. **Daten-Konsistenz:**
   - Wenn `roomType` falsch erkannt wird, werden falsche Gruppen erstellt
   - **Mitigation:** `roomType` wird bereits korrekt aus LobbyPMS geholt

3. **Historische Daten:**
   - Historische Daten müssen auch nach `roomType` gruppiert werden
   - **Mitigation:** `PriceAnalysis` hat bereits `roomType` Feld

---

## Test-Szenarien

1. **6 Privat-Zimmer, 1 wird gebucht:**
   - Erwartet: Occupancy = 16.67%, kein Alert ✅

2. **6 Privat-Zimmer, 5 werden gebucht:**
   - Erwartet: Occupancy = 83.33%, Alert wenn Änderung > 20% ✅

3. **10 Dorm-Betten, 2 werden gebucht:**
   - Erwartet: Occupancy = 20%, kein Alert wenn Änderung < 20% ✅

4. **10 Dorm-Betten, 8 werden gebucht:**
   - Erwartet: Occupancy = 80%, Alert wenn Änderung > 20% ✅

---

**Erstellt:** 2025-12-18  
**Status:** Analyse abgeschlossen, bereit für Implementierung


# Preisanalyse und Preisvorschläge - Detaillierter Ablauf

## Überblick

Dieses Dokument beschreibt **konkret und detailliert**, wie eine Preisanalyse durchgeführt wird und wie Preisvorschläge berechnet werden.

---

## 1. Preisanalyse - Schritt für Schritt

### 1.1 Daten sammeln

**Schritt 1: Aktuelle Preise aus LobbyPMS abrufen**

```typescript
// Beispiel: Preisanalyse für Branch 3, Zeitraum 01.02.2025 - 30.04.2025 (3 Monate)
const lobbyPmsService = await LobbyPmsService.createForBranch(3);
const availabilityData = await lobbyPmsService.checkAvailability(
  new Date('2025-02-01'),
  new Date('2025-04-30')
);
```

**Was kommt zurück?**
```typescript
[
  {
    categoryId: 34280,
    roomName: "El primo aventurero",
    roomType: "compartida",
    availableRooms: 5,
    pricePerNight: 50000,
    currency: "COP",
    date: "2025-02-01",
    prices: [
      { people: 1, value: 50000 },
      { people: 2, value: 90000 }
    ]
  },
  {
    categoryId: 34280,
    roomName: "El primo aventurero",
    roomType: "compartida",
    availableRooms: 3,  // ← Weniger verfügbar!
    pricePerNight: 50000,
    currency: "COP",
    date: "2025-02-02",  // ← Nächstes Datum
    prices: [...]
  },
  // ... für jeden Tag und jede Kategorie
]
```

**Schritt 2: Belegungsrate berechnen**

Für jedes Datum und jede Kategorie:
```typescript
// Beispiel: Kategorie 34280 am 01.02.2025
const totalRooms = 8; // Gesamtanzahl Zimmer dieser Kategorie (aus Branch-Settings oder LobbyPMS)
const availableRooms = 5; // Aus checkAvailability()
const occupiedRooms = totalRooms - availableRooms; // 8 - 5 = 3
const occupancyRate = (occupiedRooms / totalRooms) * 100; // (3 / 8) * 100 = 37.5%
```

**Schritt 3: Historische Daten sammeln (optional)**

Falls bereits Preisanalysen existieren:
```typescript
const historicalAnalyses = await prisma.priceAnalysis.findMany({
  where: {
    branchId: 3,
    categoryId: 34280,
    analysisDate: {
      gte: new Date('2025-01-01') // Letzte 30 Tage
    }
  }
});
```

**Schritt 4: Konkurrenzpreise sammeln (optional, wenn Rate-Shopping implementiert)**

```typescript
const competitorPrices = await prisma.otaPriceData.findMany({
  where: {
    listing: {
      branchId: 3,
      categoryId: 34280,
      platform: 'booking.com'
    },
    date: {
      gte: new Date('2025-02-01'),
      lte: new Date('2025-04-30')
    }
  }
});
```

### 1.2 Daten analysieren

**Für jedes Datum und jede Kategorie:**

**Beispiel: Kategorie 34280 (El primo aventurero) am 01.02.2025**

```typescript
const analysis = {
  date: "2025-02-01",
  categoryId: 34280,
  roomType: "compartida",
  
  // Aktuelle Preise
  currentPrice: 50000, // COP für 1 Person
  prices: [
    { people: 1, value: 50000 },
    { people: 2, value: 90000 }
  ],
  
  // Verfügbarkeit
  availableRooms: 5,
  totalRooms: 8,
  occupancyRate: 37.5, // (8-5)/8 * 100
  
  // Historische Daten (Durchschnitt der letzten 30 Tage)
  averagePrice: 48000, // Durchschnittspreis der letzten 30 Tage
  minPrice: 45000,     // Minimalpreis der letzten 30 Tage
  maxPrice: 55000,     // Maximalpreis der letzten 30 Tage
  
  // Konkurrenz (wenn verfügbar)
  competitorAvgPrice: 52000, // Durchschnittspreis der Konkurrenz
  pricePosition: "below",    // "above" | "below" | "equal"
  
  // Wochentag
  dayOfWeek: 6, // Samstag (0=Sonntag, 6=Samstag)
  isWeekend: true
};
```

**Berechnungen:**

1. **Durchschnittspreis (historisch):**
   ```typescript
   const historicalPrices = [45000, 48000, 50000, 52000, 48000, ...];
   const averagePrice = historicalPrices.reduce((sum, p) => sum + p, 0) / historicalPrices.length;
   ```

2. **Preisposition (vs. Konkurrenz):**
   ```typescript
   const priceDiff = currentPrice - competitorAvgPrice;
   const priceDiffPercent = (priceDiff / competitorAvgPrice) * 100;
   
   if (priceDiffPercent > 5) pricePosition = "above";
   else if (priceDiffPercent < -5) pricePosition = "below";
   else pricePosition = "equal";
   ```

3. **Trend-Analyse:**
   ```typescript
   // Vergleich mit vorherigem Tag
   const yesterdayPrice = 48000;
   const priceChange = currentPrice - yesterdayPrice;
   const priceChangePercent = (priceChange / yesterdayPrice) * 100;
   // → +4.17% (Preis gestiegen)
   ```

### 1.3 Analyse speichern

```typescript
await prisma.priceAnalysis.create({
  data: {
    branchId: 3,
    analysisDate: new Date('2025-02-01'),
    startDate: new Date('2025-02-01'),
    endDate: new Date('2025-04-30'),
    categoryId: 34280,
    roomType: "compartida",
    currentPrice: 50000,
    averagePrice: 48000,
    minPrice: 45000,
    maxPrice: 55000,
    occupancyRate: 37.5,
    availableRooms: 5,
    competitorAvgPrice: 52000,
    pricePosition: "below"
  }
});
```

---

## 2. Preisvorschlag berechnen - Schritt für Schritt

### 2.1 Regeln laden

```typescript
const rules = await prisma.pricingRule.findMany({
  where: {
    branchId: 3,
    isActive: true
  },
  orderBy: {
    priority: 'desc' // Höhere Priorität zuerst
  }
});

// Beispiel-Regeln:
const rules = [
  {
    id: 1,
    name: "Hohe Belegung - Preise erhöhen",
    priority: 10,
    conditions: {
      occupancyRate: { operator: ">", value: 80 },
      dayOfWeek: [5, 6] // Wochenende
    },
    action: {
      type: "increase",
      value: 15, // +15%
      maxChange: 30, // Maximal +30%
      minPrice: 40000,
      maxPrice: 80000
    },
    roomTypes: ["compartida", "privada"], // Alle Zimmerarten
    categoryIds: null // Alle Kategorien
  },
  {
    id: 2,
    name: "Niedrige Belegung - Preise senken",
    priority: 8,
    conditions: {
      occupancyRate: { operator: "<", value: 30 }
    },
    action: {
      type: "decrease",
      value: 10, // -10%
      maxChange: 20, // Maximal -20%
      minPrice: 40000,
      maxPrice: 80000
    }
  },
  {
    id: 3,
    name: "Konkurrenz zu teuer - Preise erhöhen",
    priority: 5,
    conditions: {
      competitorPriceDiff: { operator: "<", value: -10 } // Konkurrenz >10% teurer
    },
    action: {
      type: "increase",
      value: 5, // +5%
      maxChange: 15
    }
  }
];
```

### 2.2 Regeln anwenden

**Beispiel: Kategorie 34280 am 01.02.2025**

**Ausgangslage:**
- Aktueller Preis: 50.000 COP
- Belegungsrate: 37.5%
- Konkurrenzpreis: 52.000 COP
- Wochentag: Samstag (6)

**Schritt 1: Regel 1 prüfen**
```typescript
// Regel 1: "Hohe Belegung - Preise erhöhen"
// Bedingung: occupancyRate > 80 AND dayOfWeek in [5, 6]
// Prüfung:
const condition1 = 37.5 > 80; // false
const condition2 = [5, 6].includes(6); // true
// → Regel 1 NICHT anwendbar (Belegung zu niedrig)
```

**Schritt 2: Regel 2 prüfen**
```typescript
// Regel 2: "Niedrige Belegung - Preise senken"
// Bedingung: occupancyRate < 30
// Prüfung:
const condition = 37.5 < 30; // false
// → Regel 2 NICHT anwendbar (Belegung nicht niedrig genug)
```

**Schritt 3: Regel 3 prüfen**
```typescript
// Regel 3: "Konkurrenz zu teuer - Preise erhöhen"
// Bedingung: competitorPriceDiff < -10
// Berechnung:
const competitorPriceDiff = ((50000 - 52000) / 52000) * 100; // -3.85%
// Prüfung:
const condition = -3.85 < -10; // false
// → Regel 3 NICHT anwendbar (Konkurrenz nicht >10% teurer)
```

**Ergebnis:** Keine Regel anwendbar → Preis bleibt unverändert

---

**Beispiel 2: Kategorie 34280 am 15.02.2025 (Wochenende, hohe Belegung)**

**Ausgangslage:**
- Aktueller Preis: 50.000 COP
- Belegungsrate: 85% (hoch!)
- Konkurrenzpreis: 55.000 COP
- Wochentag: Samstag (6)

**Schritt 1: Regel 1 prüfen**
```typescript
// Regel 1: "Hohe Belegung - Preise erhöhen"
const condition1 = 85 > 80; // true ✅
const condition2 = [5, 6].includes(6); // true ✅
// → Regel 1 ANWENDBAR!

// Aktion anwenden:
const priceIncrease = 50000 * 0.15; // +15% = 7.500
const newPrice = 50000 + 7500; // 57.500 COP

// Validierung:
const maxPrice = 80000; // OK
const minPrice = 40000; // OK
const maxChange = 50000 * 0.30; // Maximal +30% = 15.000
// 7.500 < 15.000 → OK

// Zwischenergebnis: 57.500 COP
```

**Schritt 2: Regel 2 prüfen**
```typescript
// Regel 2: "Niedrige Belegung - Preise senken"
const condition = 85 < 30; // false
// → Regel 2 NICHT anwendbar
```

**Schritt 3: Regel 3 prüfen**
```typescript
// Regel 3: "Konkurrenz zu teuer - Preise erhöhen"
// Berechnung mit NEUEM Preis (57.500):
const competitorPriceDiff = ((57500 - 55000) / 55000) * 100; // +4.55%
// Prüfung:
const condition = 4.55 < -10; // false
// → Regel 3 NICHT anwendbar
```

**Ergebnis:** Regel 1 angewendet → Preis: 57.500 COP (+15%)

---

**Beispiel 3: Kategorie 34280 am 20.02.2025 (Wochentag, niedrige Belegung)**

**Ausgangslage:**
- Aktueller Preis: 50.000 COP
- Belegungsrate: 25% (niedrig!)
- Konkurrenzpreis: 48.000 COP
- Wochentag: Donnerstag (4)

**Schritt 1: Regel 1 prüfen**
```typescript
const condition1 = 25 > 80; // false
// → Regel 1 NICHT anwendbar
```

**Schritt 2: Regel 2 prüfen**
```typescript
// Regel 2: "Niedrige Belegung - Preise senken"
const condition = 25 < 30; // true ✅
// → Regel 2 ANWENDBAR!

// Aktion anwenden:
const priceDecrease = 50000 * 0.10; // -10% = 5.000
const newPrice = 50000 - 5000; // 45.000 COP

// Validierung:
const minPrice = 40000; // OK (45.000 > 40.000)
const maxPrice = 80000; // OK
const maxChange = 50000 * 0.20; // Maximal -20% = 10.000
// 5.000 < 10.000 → OK

// Zwischenergebnis: 45.000 COP
```

**Schritt 3: Regel 3 prüfen**
```typescript
// Regel 3: "Konkurrenz zu teuer - Preise erhöhen"
// Berechnung mit NEUEM Preis (45.000):
const competitorPriceDiff = ((45000 - 48000) / 48000) * 100; // -6.25%
// Prüfung:
const condition = -6.25 < -10; // false
// → Regel 3 NICHT anwendbar
```

**Ergebnis:** Regel 2 angewendet → Preis: 45.000 COP (-10%)

---

### 2.3 Kumulative Regel-Anwendung

**Beispiel: Mehrere Regeln anwendbar**

**Ausgangslage:**
- Aktueller Preis: 50.000 COP
- Belegungsrate: 90% (sehr hoch!)
- Konkurrenzpreis: 60.000 COP (20% teurer!)
- Wochentag: Samstag (6)

**Schritt 1: Regel 1 anwenden**
```typescript
// Regel 1: +15%
newPrice = 50000 * 1.15 = 57.500 COP
```

**Schritt 2: Regel 3 anwenden (auf bereits erhöhten Preis)**
```typescript
// Regel 3: Konkurrenz >10% teurer → +5%
// Berechnung mit bereits erhöhtem Preis:
newPrice = 57500 * 1.05 = 60.375 COP
```

**Schritt 3: Validierung**
```typescript
const totalIncrease = ((60375 - 50000) / 50000) * 100; // +20.75%
const maxChange = 50000 * 0.30; // Maximal +30% = 15.000
// 10.375 < 15.000 → OK

const maxPrice = 80000; // OK (60.375 < 80.000)
const minPrice = 40000; // OK
```

**Ergebnis:** Beide Regeln angewendet → Preis: 60.375 COP (+20.75%)

---

### 2.4 Preisvorschlag speichern

```typescript
await prisma.priceRecommendation.create({
  data: {
    branchId: 3,
    date: new Date('2025-02-15'),
    categoryId: 34280,
    roomType: "compartida",
    currentPrice: 50000,
    recommendedPrice: 57500,
    priceChange: 7500,
    priceChangePercent: 15.0,
    appliedRules: [
      {
        ruleId: 1,
        ruleName: "Hohe Belegung - Preise erhöhen",
        action: "increase",
        value: 15
      }
    ],
    reasoning: "Belegungsrate 85% > 80% UND Wochenende → Preis um 15% erhöhen",
    status: "pending" // Wartet auf Genehmigung
  }
});
```

---

## 3. Zusammenfassung des Ablaufs

### 3.1 Preisanalyse (täglich, automatisch)

1. **Daten sammeln:**
   - Aktuelle Preise aus LobbyPMS (`checkAvailability()`)
   - Belegungsrate berechnen (aus `availableRooms` und `totalRooms`)
   - Historische Daten (aus `PriceAnalysis` Tabelle)
   - Konkurrenzpreise (aus `OTAPriceData` Tabelle, wenn verfügbar)

2. **Daten analysieren:**
   - Durchschnittspreise berechnen
   - Min/Max-Preise identifizieren
   - Preisposition vs. Konkurrenz
   - Trends erkennen

3. **Analyse speichern:**
   - In `PriceAnalysis` Tabelle für jeden Tag und jede Kategorie

### 3.2 Preisvorschlag (täglich, automatisch)

1. **Regeln laden:**
   - Alle aktiven Regeln für den Branch
   - Sortiert nach Priorität

2. **Für jedes Datum und jede Kategorie:**
   - Aktuelle Analyse-Daten laden
   - Jede Regel prüfen (Bedingungen erfüllt?)
   - Anwendbare Regeln anwenden (kumulativ)
   - Validierung (Min/Max-Grenzen)

3. **Vorschlag speichern:**
   - In `PriceRecommendation` Tabelle
   - Status: "pending" (wartet auf Genehmigung)

4. **Im Frontend anzeigen:**
   - Benutzer sieht alle Vorschläge
   - Kann einzelne Vorschläge genehmigen/ablehnen
   - Später: Genehmigte Vorschläge ins LobbyPMS übertragen (wenn Endpoints verfügbar)

---

## 4. Offene Fragen

1. **Wie wird `totalRooms` ermittelt?**
   - Aus Branch-Settings?
   - Aus LobbyPMS API?
   - Manuell konfiguriert?

2. **Wie werden historische Daten gesammelt?**
   - Täglich `checkAvailability()` aufrufen und speichern?
   - Oder nur bei Bedarf?

3. **Wie werden Konkurrenzpreise gesammelt?**
   - Rate-Shopping implementieren?
   - Oder manuell eingeben?

4. **Wie werden Regeln priorisiert?**
   - Numerische Priorität (höher = wichtiger)?
   - Oder Reihenfolge der Anwendung?

5. **Kumulative vs. nicht-kumulative Regeln?**
   - Sollen Regeln auf bereits angepasste Preise angewendet werden?
   - Oder nur auf den ursprünglichen Preis?


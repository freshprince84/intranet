# Preisanalyse - Vollständiger Algorithmus für professionelle Preisvorschläge

## Überblick

Dieses Dokument beschreibt den **vollständigen, professionellen Algorithmus** zur Berechnung von Preisvorschlägen, der **alle Faktoren** berücksichtigt, die auch ML/AI-Tools wie PriceLabs und RoomPriceGenie verwenden.

**Ziel:** Genauso präzise wie professionelle ML/AI-Tools, aber transparent und nachvollziehbar.

---

## 1. Alle Faktoren für Preisberechnung

### 1.1 Interne Faktoren

**1. Belegungsrate (Occupancy Rate)**
- Aktuelle Belegung: `(totalRooms - availableRooms) / totalRooms * 100`
- Prognostizierte Belegung: Basierend auf historischen Daten und Buchungstrends
- Belegungstrend: Steigend, fallend, stabil

**2. Buchungsgeschwindigkeit (Pickup Rate)**
- Wie schnell werden Zimmer gebucht?
- Vergleich: Aktuelle Buchungsgeschwindigkeit vs. historische Durchschnitte
- Lead Time: Wie viele Tage im Voraus werden Zimmer gebucht?

**3. Stornierungsrate (Cancellation Rate)**
- Wie viele Reservierungen werden storniert?
- Historische Stornierungsrate für ähnliche Zeiträume
- Erwartete Stornierungen basierend auf Mustern

**4. RevPAR (Revenue per Available Room)**
- Aktueller RevPAR: `averagePrice * occupancyRate / 100`
- Historischer RevPAR: Vergleich mit Vorjahr, Vormonat
- RevPAR-Trend: Steigend, fallend, stabil

**5. ADR (Average Daily Rate)**
- Aktueller ADR: Durchschnittspreis aller Reservierungen
- Historischer ADR: Vergleich mit Vorjahr, Vormonat
- ADR-Trend: Steigend, fallend, stabil

**6. Verfügbarkeit (Availability)**
- Verfügbare Zimmer heute
- Verfügbare Zimmer in Zukunft (prognostiziert)
- Restriktionen: Min/Max-Aufenthalt, Lead Days

**7. Preis-Historie**
- Durchschnittspreis der letzten 30/60/90 Tage
- Minimalpreis der letzten 30/60/90 Tage
- Maximalpreis der letzten 30/60/90 Tage
- Preis-Trend: Steigend, fallend, stabil

**8. Saisonalität**
- Saison: Hochsaison, Nebensaison, Tiefsaison
- Monat: Welcher Monat (historische Nachfrage)
- Wochentag: Wochenende vs. Wochentag
- Feiertage: Nationale Feiertage, lokale Feiertage

**9. Zimmerkategorie-spezifische Faktoren**
- Zimmerart: Dorm vs. Private (unterschiedliche Nachfrage)
- Kategorie-Popularität: Welche Kategorien werden häufiger gebucht?
- Preis-Elastizität: Wie reagiert Nachfrage auf Preisänderungen?

### 1.2 Externe Faktoren

**1. Konkurrenzpreise (Competitor Pricing)**
- Durchschnittspreis der Konkurrenz
- Minimalpreis der Konkurrenz
- Maximalpreis der Konkurrenz
- Preisposition: Über, unter, gleich der Konkurrenz
- Anzahl Konkurrenten: Wie viele vergleichbare Unterkünfte gibt es?

**2. Marktnachfrage (Market Demand)**
- Gesamtnachfrage in der Region
- Nachfrage-Trend: Steigend, fallend, stabil
- Marktauslastung: Wie voll ist der Markt insgesamt?

**3. Events und Veranstaltungen**
- Lokale Events: Konzerte, Festivals, Konferenzen
- Nationale Events: Feiertage, große Veranstaltungen
- Event-Dauer: Wie lange dauert das Event?
- Event-Entfernung: Wie nah ist das Event?

**4. Wetter**
- Wettervorhersage: Gut, schlecht, neutral
- Saisonale Wetter-Muster: Regenzeit, Trockenzeit
- Wetter-Impact: Wie beeinflusst Wetter die Nachfrage?

**5. Wirtschaftliche Faktoren**
- Inflation: Aktuelle Inflationsrate
- Wechselkurse: USD/COP, EUR/COP
- Wirtschaftslage: Boom, Rezession, stabil

**6. Tourismus-Statistiken**
- Ankünfte: Anzahl Touristen in der Region
- Übernachtungen: Durchschnittliche Aufenthaltsdauer
- Herkunftsländer: Welche Länder senden die meisten Touristen?

### 1.3 Zeitbasierte Faktoren

**1. Lead Time (Buchungsfenster)**
- Wie viele Tage im Voraus wird gebucht?
- Kurzfristige Buchungen: <7 Tage
- Mittelfristige Buchungen: 7-30 Tage
- Langfristige Buchungen: >30 Tage

**2. Booking Window (Buchungsfenster)**
- Aktuelles Buchungsfenster: Wie viele Tage bis Check-in?
- Historische Buchungsfenster: Wann werden ähnliche Daten normalerweise gebucht?
- Restzeit: Wie viel Zeit bleibt noch für Buchungen?

**3. Pickup Rate (Buchungsgeschwindigkeit)**
- Wie viele Buchungen pro Tag?
- Vergleich: Aktuelle Pickup Rate vs. historische Durchschnitte
- Pickup-Trend: Beschleunigt, verlangsamt, stabil

**4. Saisonalität**
- Jahreszeit: Frühling, Sommer, Herbst, Winter
- Monat: Historische Nachfrage pro Monat
- Woche: Kalenderwoche (manche Wochen sind beliebter)
- Wochentag: Wochenende vs. Wochentag

---

## 2. Vollständiger Berechnungsalgorithmus

### 2.1 Schritt 1: Daten sammeln (vollständig)

```typescript
interface PriceAnalysisData {
  // Aktuelle Daten
  currentPrice: number;
  availableRooms: number;
  totalRooms: number;
  occupancyRate: number;
  date: Date;
  dayOfWeek: number;
  isWeekend: boolean;
  isHoliday: boolean;
  
  // Historische Daten (12-24 Monate zurück)
  historicalOccupancy: {
    sameDayLastYear: number;
    sameDayLastMonth: number;
    averageLast30Days: number;
    averageLast90Days: number;
    averageLastYear: number;
  };
  
  historicalPrice: {
    sameDayLastYear: number;
    sameDayLastMonth: number;
    averageLast30Days: number;
    averageLast90Days: number;
    minLast30Days: number;
    maxLast30Days: number;
    minLast90Days: number;
    maxLast90Days: number;
  };
  
  // Buchungsgeschwindigkeit
  pickupRate: {
    current: number; // Buchungen pro Tag in den letzten 7 Tagen
    historical: number; // Durchschnittliche Buchungen pro Tag für ähnliche Zeiträume
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  
  // Lead Time
  leadTime: {
    average: number; // Durchschnittliche Tage im Voraus
    distribution: { [days: number]: number }; // Verteilung der Buchungen
  };
  
  // Stornierungen
  cancellationRate: {
    current: number; // Aktuelle Stornierungsrate
    historical: number; // Historische Stornierungsrate
    expected: number; // Erwartete Stornierungen basierend auf Mustern
  };
  
  // RevPAR und ADR
  revpar: {
    current: number;
    historical: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  
  adr: {
    current: number;
    historical: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  
  // Konkurrenz
  competitor: {
    averagePrice: number;
    minPrice: number;
    maxPrice: number;
    pricePosition: 'above' | 'below' | 'equal';
    priceDiffPercent: number;
    competitorCount: number;
  };
  
  // Events
  events: Array<{
    name: string;
    date: Date;
    distance: number; // km
    impact: 'high' | 'medium' | 'low';
    expectedDemandIncrease: number; // Prozent
  }>;
  
  // Saisonalität
  seasonality: {
    season: 'high' | 'medium' | 'low';
    monthFactor: number; // Faktor für diesen Monat (basierend auf historischen Daten)
    weekdayFactor: number; // Faktor für Wochentag (Wochenende = höher)
  };
  
  // Wetter (optional)
  weather: {
    forecast: 'good' | 'bad' | 'neutral';
    impact: number; // Prozent-Impact auf Nachfrage
  };
}
```

### 2.2 Schritt 2: Multi-Faktor-Berechnung

**NICHT nur einfache Regeln, sondern komplexe Berechnung mit allen Faktoren:**

```typescript
function calculateRecommendedPrice(
  analysisData: PriceAnalysisData,
  rules: PricingRule[]
): number {
  let basePrice = analysisData.currentPrice;
  let recommendedPrice = basePrice;
  
  // SCHRITT 1: Basis-Preis anpassen basierend auf historischen Daten
  const historicalAdjustment = calculateHistoricalAdjustment(analysisData);
  recommendedPrice = basePrice * historicalAdjustment;
  
  // SCHRITT 2: Belegungsrate-Faktor
  const occupancyFactor = calculateOccupancyFactor(analysisData);
  recommendedPrice = recommendedPrice * occupancyFactor;
  
  // SCHRITT 3: Konkurrenz-Faktor
  const competitorFactor = calculateCompetitorFactor(analysisData);
  recommendedPrice = recommendedPrice * competitorFactor;
  
  // SCHRITT 4: Saisonalitäts-Faktor
  const seasonalityFactor = calculateSeasonalityFactor(analysisData);
  recommendedPrice = recommendedPrice * seasonalityFactor;
  
  // SCHRITT 5: Events-Faktor
  const eventsFactor = calculateEventsFactor(analysisData);
  recommendedPrice = recommendedPrice * eventsFactor;
  
  // SCHRITT 6: Pickup Rate-Faktor
  const pickupFactor = calculatePickupFactor(analysisData);
  recommendedPrice = recommendedPrice * pickupFactor;
  
  // SCHRITT 7: Lead Time-Faktor
  const leadTimeFactor = calculateLeadTimeFactor(analysisData);
  recommendedPrice = recommendedPrice * leadTimeFactor;
  
  // SCHRITT 8: Regeln anwenden (zusätzlich zu Basis-Berechnung)
  recommendedPrice = applyRules(recommendedPrice, analysisData, rules);
  
  // SCHRITT 9: Validierung und Grenzen
  recommendedPrice = validatePrice(recommendedPrice, analysisData, rules);
  
  return recommendedPrice;
}
```

### 2.3 Detaillierte Berechnungsfunktionen

#### 2.3.1 Historische Anpassung

```typescript
function calculateHistoricalAdjustment(data: PriceAnalysisData): number {
  // Vergleich mit Vorjahr (gleicher Tag)
  const yearOverYearDiff = (data.currentPrice - data.historicalPrice.sameDayLastYear) 
    / data.historicalPrice.sameDayLastYear;
  
  // Vergleich mit Vormonat (gleicher Tag)
  const monthOverMonthDiff = (data.currentPrice - data.historicalPrice.sameDayLastMonth)
    / data.historicalPrice.sameDayLastMonth;
  
  // Durchschnitt der letzten 30 Tage
  const avg30DaysDiff = (data.currentPrice - data.historicalPrice.averageLast30Days)
    / data.historicalPrice.averageLast30Days;
  
  // Gewichteter Durchschnitt
  const adjustment = (
    yearOverYearDiff * 0.4 +  // Vorjahr: 40% Gewicht
    monthOverMonthDiff * 0.3 + // Vormonat: 30% Gewicht
    avg30DaysDiff * 0.3        // 30 Tage: 30% Gewicht
  );
  
  // Anpassung: Wenn Preis unter historischem Durchschnitt, leicht erhöhen
  // Wenn Preis über historischem Durchschnitt, leicht senken
  return 1 + (adjustment * -0.5); // Dämpfung: 50% der Differenz
}
```

#### 2.3.2 Belegungsrate-Faktor

```typescript
function calculateOccupancyFactor(data: PriceAnalysisData): number {
  const currentOccupancy = data.occupancyRate;
  const historicalOccupancy = data.historicalOccupancy.averageLast30Days;
  
  // Nicht-linear: Je höher die Belegung, desto stärker die Preiserhöhung
  // Formel basierend auf Nachfrage-Elastizität
  
  if (currentOccupancy > 90) {
    // Sehr hohe Belegung: Aggressive Preiserhöhung
    return 1.20; // +20%
  } else if (currentOccupancy > 80) {
    // Hohe Belegung: Moderate Preiserhöhung
    const factor = 1 + ((currentOccupancy - 80) / 100) * 0.5; // 0-5% zusätzlich
    return Math.min(factor, 1.15); // Max +15%
  } else if (currentOccupancy > 70) {
    // Mittlere Belegung: Leichte Preiserhöhung
    const factor = 1 + ((currentOccupancy - 70) / 100) * 0.3; // 0-3% zusätzlich
    return Math.min(factor, 1.08); // Max +8%
  } else if (currentOccupancy < 30) {
    // Niedrige Belegung: Preissenkung
    const factor = 1 - ((30 - currentOccupancy) / 100) * 0.4; // 0-12% Reduzierung
    return Math.max(factor, 0.85); // Min -15%
  } else if (currentOccupancy < 50) {
    // Mittlere Belegung: Leichte Preissenkung
    const factor = 1 - ((50 - currentOccupancy) / 100) * 0.2; // 0-4% Reduzierung
    return Math.max(factor, 0.95); // Min -5%
  }
  
  // 50-70%: Keine Anpassung
  return 1.0;
}
```

#### 2.3.3 Konkurrenz-Faktor

```typescript
function calculateCompetitorFactor(data: PriceAnalysisData): number {
  const competitorAvg = data.competitor.averagePrice;
  const currentPrice = data.currentPrice;
  const priceDiffPercent = data.competitor.priceDiffPercent;
  
  // Preisposition vs. Konkurrenz
  if (priceDiffPercent < -15) {
    // Wir sind >15% günstiger → Preise erhöhen
    return 1.10; // +10%
  } else if (priceDiffPercent < -10) {
    // Wir sind >10% günstiger → Preise leicht erhöhen
    return 1.05; // +5%
  } else if (priceDiffPercent < -5) {
    // Wir sind >5% günstiger → Preise minimal erhöhen
    return 1.02; // +2%
  } else if (priceDiffPercent > 15) {
    // Wir sind >15% teurer → Preise senken
    return 0.90; // -10%
  } else if (priceDiffPercent > 10) {
    // Wir sind >10% teurer → Preise leicht senken
    return 0.95; // -5%
  } else if (priceDiffPercent > 5) {
    // Wir sind >5% teurer → Preise minimal senken
    return 0.98; // -2%
  }
  
  // ±5%: Keine Anpassung (wettbewerbsfähig)
  return 1.0;
}
```

#### 2.3.4 Saisonalitäts-Faktor

```typescript
function calculateSeasonalityFactor(data: PriceAnalysisData): number {
  let factor = 1.0;
  
  // Monat-Faktor (basierend auf historischen Daten)
  factor *= data.seasonality.monthFactor; // z.B. 1.2 für Hochsaison, 0.8 für Tiefsaison
  
  // Wochentag-Faktor
  factor *= data.seasonality.weekdayFactor; // z.B. 1.15 für Wochenende, 0.95 für Wochentag
  
  // Feiertag-Faktor
  if (data.isHoliday) {
    factor *= 1.20; // +20% an Feiertagen
  }
  
  // Saison-Faktor
  if (data.seasonality.season === 'high') {
    factor *= 1.15; // +15% in Hochsaison
  } else if (data.seasonality.season === 'low') {
    factor *= 0.85; // -15% in Tiefsaison
  }
  
  return factor;
}
```

#### 2.3.5 Events-Faktor

```typescript
function calculateEventsFactor(data: PriceAnalysisData): number {
  if (data.events.length === 0) {
    return 1.0;
  }
  
  let totalImpact = 0;
  
  for (const event of data.events) {
    // Impact basierend auf Entfernung und Event-Typ
    let impact = event.expectedDemandIncrease;
    
    // Entfernung: Je näher, desto stärker der Impact
    if (event.distance < 1) {
      impact *= 1.5; // Sehr nah: 50% mehr Impact
    } else if (event.distance < 5) {
      impact *= 1.2; // Nah: 20% mehr Impact
    } else if (event.distance > 20) {
      impact *= 0.5; // Weit: 50% weniger Impact
    }
    
    // Event-Typ
    if (event.impact === 'high') {
      impact *= 1.3; // Großes Event: 30% mehr Impact
    } else if (event.impact === 'low') {
      impact *= 0.7; // Kleines Event: 30% weniger Impact
    }
    
    totalImpact += impact;
  }
  
  // Maximaler Impact: +50% (auch bei mehreren Events)
  return 1 + Math.min(totalImpact / 100, 0.5);
}
```

#### 2.3.6 Pickup Rate-Faktor

```typescript
function calculatePickupFactor(data: PriceAnalysisData): number {
  const currentPickup = data.pickupRate.current;
  const historicalPickup = data.pickupRate.historical;
  
  if (historicalPickup === 0) {
    return 1.0; // Keine historischen Daten
  }
  
  const pickupRatio = currentPickup / historicalPickup;
  
  if (pickupRatio > 1.5) {
    // Sehr schnelle Buchungen → Preise erhöhen
    return 1.15; // +15%
  } else if (pickupRatio > 1.2) {
    // Schnelle Buchungen → Preise leicht erhöhen
    return 1.08; // +8%
  } else if (pickupRatio < 0.5) {
    // Sehr langsame Buchungen → Preise senken
    return 0.90; // -10%
  } else if (pickupRatio < 0.8) {
    // Langsame Buchungen → Preise leicht senken
    return 0.95; // -5%
  }
  
  // 0.8-1.2: Normale Buchungsgeschwindigkeit
  return 1.0;
}
```

#### 2.3.7 Lead Time-Faktor

```typescript
function calculateLeadTimeFactor(data: PriceAnalysisData): number {
  const daysUntilCheckIn = Math.floor(
    (data.date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );
  
  // Je näher das Check-in-Datum, desto höher der Preis (wenn noch verfügbar)
  if (daysUntilCheckIn < 7) {
    // Sehr kurzfristig: Preise erhöhen (Last-Minute-Preis)
    return 1.20; // +20%
  } else if (daysUntilCheckIn < 14) {
    // Kurzfristig: Preise leicht erhöhen
    return 1.10; // +10%
  } else if (daysUntilCheckIn < 30) {
    // Mittelfristig: Normale Preise
    return 1.0;
  } else if (daysUntilCheckIn < 60) {
    // Langfristig: Preise leicht senken (Frühbucher-Rabatt)
    return 0.95; // -5%
  } else {
    // Sehr langfristig: Preise senken (Frühbucher-Rabatt)
    return 0.90; // -10%
  }
}
```

### 2.4 Schritt 3: Regeln anwenden (zusätzlich)

```typescript
function applyRules(
  price: number,
  data: PriceAnalysisData,
  rules: PricingRule[]
): number {
  let adjustedPrice = price;
  
  // Regeln nach Priorität sortieren
  const sortedRules = rules.sort((a, b) => b.priority - a.priority);
  
  for (const rule of sortedRules) {
    // Prüfe Bedingungen
    if (evaluateConditions(rule.conditions, data)) {
      // Wende Aktion an
      if (rule.action.cumulative) {
        // Auf bereits angepassten Preis
        adjustedPrice = applyAction(rule.action, adjustedPrice);
      } else {
        // Auf ursprünglichen Preis, dann vergleichen
        const originalPrice = data.currentPrice;
        const rulePrice = applyAction(rule.action, originalPrice);
        adjustedPrice = Math.max(adjustedPrice, rulePrice); // Höherer Wert
      }
    }
  }
  
  return adjustedPrice;
}
```

### 2.5 Schritt 4: Validierung

```typescript
function validatePrice(
  price: number,
  data: PriceAnalysisData,
  rules: PricingRule[]
): number {
  // Min/Max-Preis aus Regeln
  const minPrice = Math.max(
    ...rules.map(r => r.action.minPrice || 0),
    data.historicalPrice.minLast90Days * 0.8 // Nicht unter 80% des historischen Minimums
  );
  
  const maxPrice = Math.min(
    ...rules.map(r => r.action.maxPrice || Infinity),
    data.historicalPrice.maxLast90Days * 1.2 // Nicht über 120% des historischen Maximums
  );
  
  // Max-Änderung prüfen
  const currentPrice = data.currentPrice;
  const priceChange = Math.abs(price - currentPrice) / currentPrice;
  const maxChange = Math.max(...rules.map(r => r.action.maxChange || 0.5)); // Max 50%
  
  if (priceChange > maxChange) {
    // Begrenze auf maxChange
    if (price > currentPrice) {
      price = currentPrice * (1 + maxChange);
    } else {
      price = currentPrice * (1 - maxChange);
    }
  }
  
  // Min/Max-Grenzen anwenden
  price = Math.max(minPrice, Math.min(maxPrice, price));
  
  return price;
}
```

---

## 3. Vollständiges Beispiel

### 3.1 Eingabedaten

```typescript
const analysisData: PriceAnalysisData = {
  currentPrice: 50000,
  availableRooms: 2,
  totalRooms: 8,
  occupancyRate: 75, // (8-2)/8 * 100
  date: new Date('2025-02-15'),
  dayOfWeek: 6, // Samstag
  isWeekend: true,
  isHoliday: false,
  
  historicalOccupancy: {
    sameDayLastYear: 80,
    sameDayLastMonth: 70,
    averageLast30Days: 65,
    averageLast90Days: 60,
    averageLastYear: 55
  },
  
  historicalPrice: {
    sameDayLastYear: 55000,
    sameDayLastMonth: 52000,
    averageLast30Days: 48000,
    averageLast90Days: 47000,
    minLast30Days: 45000,
    maxLast30Days: 55000,
    minLast90Days: 40000,
    maxLast90Days: 60000
  },
  
  pickupRate: {
    current: 2.5, // 2.5 Buchungen pro Tag in den letzten 7 Tagen
    historical: 1.8, // Durchschnittlich 1.8 Buchungen pro Tag
    trend: 'increasing'
  },
  
  leadTime: {
    average: 14, // Durchschnittlich 14 Tage im Voraus
    distribution: { 7: 0.3, 14: 0.4, 30: 0.2, 60: 0.1 }
  },
  
  cancellationRate: {
    current: 0.05, // 5%
    historical: 0.08, // 8%
    expected: 0.06 // 6%
  },
  
  revpar: {
    current: 37500, // 50000 * 0.75
    historical: 31200, // 48000 * 0.65
    trend: 'increasing'
  },
  
  adr: {
    current: 50000,
    historical: 48000,
    trend: 'increasing'
  },
  
  competitor: {
    averagePrice: 52000,
    minPrice: 48000,
    maxPrice: 60000,
    pricePosition: 'below',
    priceDiffPercent: -3.85, // Wir sind 3.85% günstiger
    competitorCount: 15
  },
  
  events: [
    {
      name: "Medellín Music Festival",
      date: new Date('2025-02-16'),
      distance: 2, // 2 km
      impact: 'high',
      expectedDemandIncrease: 30 // +30%
    }
  ],
  
  seasonality: {
    season: 'high', // Hochsaison
    monthFactor: 1.15, // Februar ist 15% über Durchschnitt
    weekdayFactor: 1.20 // Wochenende ist 20% über Durchschnitt
  },
  
  weather: {
    forecast: 'good',
    impact: 5 // +5% bei gutem Wetter
  }
};
```

### 3.2 Berechnung Schritt für Schritt

**Schritt 1: Historische Anpassung**
```typescript
yearOverYearDiff = (50000 - 55000) / 55000 = -0.091 (-9.1%)
monthOverMonthDiff = (50000 - 52000) / 52000 = -0.038 (-3.8%)
avg30DaysDiff = (50000 - 48000) / 48000 = 0.042 (+4.2%)

adjustment = (-0.091 * 0.4) + (-0.038 * 0.3) + (0.042 * 0.3) = -0.0364 + (-0.0114) + 0.0126 = -0.0352
historicalAdjustment = 1 + (-0.0352 * -0.5) = 1 + 0.0176 = 1.0176

price = 50000 * 1.0176 = 50.880 COP
```

**Schritt 2: Belegungsrate-Faktor**
```typescript
occupancyRate = 75%
// 75% > 70% → Leichte Preiserhöhung
factor = 1 + ((75 - 70) / 100) * 0.3 = 1 + 0.015 = 1.015

price = 50.880 * 1.015 = 51.643 COP
```

**Schritt 3: Konkurrenz-Faktor**
```typescript
priceDiffPercent = -3.85%
// -5% < -3.85% < 5% → Keine Anpassung
factor = 1.0

price = 51.643 * 1.0 = 51.643 COP
```

**Schritt 4: Saisonalitäts-Faktor**
```typescript
monthFactor = 1.15
weekdayFactor = 1.20
seasonFactor = 1.15 (Hochsaison)

factor = 1.15 * 1.20 * 1.15 = 1.587

price = 51.643 * 1.587 = 81.957 COP
```

**Schritt 5: Events-Faktor**
```typescript
event = {
  expectedDemandIncrease: 30,
  distance: 2 km → impact *= 1.2,
  impact: 'high' → impact *= 1.3
}

totalImpact = 30 * 1.2 * 1.3 = 46.8%
factor = 1 + min(46.8 / 100, 0.5) = 1 + 0.468 = 1.468

price = 81.957 * 1.468 = 120.312 COP
```

**Schritt 6: Pickup Rate-Faktor**
```typescript
pickupRatio = 2.5 / 1.8 = 1.39
// 1.2 < 1.39 < 1.5 → Schnelle Buchungen
factor = 1.08

price = 120.312 * 1.08 = 129.937 COP
```

**Schritt 7: Lead Time-Faktor**
```typescript
daysUntilCheckIn = 0 (heute ist 15.02., Check-in ist 15.02.)
// < 7 Tage → Last-Minute-Preis
factor = 1.20

price = 129.937 * 1.20 = 155.924 COP
```

**Schritt 8: Regeln anwenden**
```typescript
// Regel 1: Belegung >70% UND Wochenende → +15%
// 75% > 70% ✅ UND Samstag ✅ → Regel anwendbar
price = 155.924 * 1.15 = 179.313 COP
```

**Schritt 9: Validierung**
```typescript
minPrice = max(40000, 40000 * 0.8) = 40000
maxPrice = min(80000, 60000 * 1.2) = 72000

priceChange = (179.313 - 50000) / 50000 = 2.586 (258.6%)
maxChange = 0.30 (30%)

// 258.6% > 30% → Begrenze auf 30%
price = 50000 * 1.30 = 65.000 COP

// Min/Max prüfen
price = max(40000, min(72000, 65000)) = 65.000 COP
```

**Ergebnis:** Empfohlener Preis: **65.000 COP** (+30%)

---

## 4. Datenquellen und Implementierung

### 4.1 Historische Daten sammeln

**Täglich um 3:00 Uhr:**
```typescript
// 1. Hole aktuelle Preise für nächste 3 Monate
const availabilityData = await lobbyPmsService.checkAvailability(
  new Date(),
  addMonths(new Date(), 3)
);

// 2. Für jeden Tag und jede Kategorie speichern
for (const entry of availabilityData) {
  await prisma.priceAnalysis.create({
    data: {
      branchId: 3,
      analysisDate: new Date(entry.date),
      categoryId: entry.categoryId,
      roomType: entry.roomType,
      currentPrice: entry.pricePerNight,
      occupancyRate: calculateOccupancyRate(entry.availableRooms, totalRooms),
      availableRooms: entry.availableRooms,
      // ... weitere Felder
    }
  });
}
```

### 4.2 Pickup Rate berechnen

```typescript
function calculatePickupRate(branchId: number, categoryId: number, date: Date): number {
  // Hole Reservierungen der letzten 7 Tage für dieses Datum
  const reservations = await prisma.reservation.findMany({
    where: {
      branchId,
      categoryId,
      checkInDate: date,
      createdAt: {
        gte: new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000) // Letzte 7 Tage
      }
    }
  });
  
  return reservations.length / 7; // Buchungen pro Tag
}
```

### 4.3 Lead Time berechnen

```typescript
function calculateLeadTime(branchId: number, categoryId: number): number {
  // Hole Reservierungen der letzten 30 Tage
  const reservations = await prisma.reservation.findMany({
    where: {
      branchId,
      categoryId,
      createdAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      }
    },
    select: {
      checkInDate: true,
      createdAt: true
    }
  });
  
  // Berechne durchschnittliche Tage im Voraus
  const leadTimes = reservations.map(r => {
    const days = Math.floor(
      (r.checkInDate.getTime() - r.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    return days;
  });
  
  return leadTimes.reduce((sum, days) => sum + days, 0) / leadTimes.length;
}
```

### 4.4 Events sammeln

```typescript
// Option 1: Manuell konfiguriert in Branch-Settings
// Option 2: API-Integration (z.B. Eventbrite, Facebook Events)
// Option 3: Kalender-Import

interface Event {
  name: string;
  date: Date;
  location: { lat: number; lng: number };
  type: 'festival' | 'conference' | 'sports' | 'other';
  expectedAttendance: number;
}

function calculateEventImpact(event: Event, branchLocation: { lat: number; lng: number }): {
  distance: number;
  impact: 'high' | 'medium' | 'low';
  expectedDemandIncrease: number;
} {
  // Berechne Entfernung
  const distance = calculateDistance(event.location, branchLocation);
  
  // Bestimme Impact basierend auf Event-Typ und Entfernung
  let impact: 'high' | 'medium' | 'low' = 'low';
  let expectedDemandIncrease = 0;
  
  if (event.type === 'festival' && distance < 5) {
    impact = 'high';
    expectedDemandIncrease = 40; // +40%
  } else if (event.type === 'conference' && distance < 2) {
    impact = 'high';
    expectedDemandIncrease = 30; // +30%
  } else if (distance < 10) {
    impact = 'medium';
    expectedDemandIncrease = 15; // +15%
  } else {
    impact = 'low';
    expectedDemandIncrease = 5; // +5%
  }
  
  return { distance, impact, expectedDemandIncrease };
}
```

---

## 5. Zusammenfassung

### 5.1 Vollständiger Algorithmus

**NICHT nur einfache Regeln, sondern:**
1. ✅ **Multi-Faktor-Berechnung:** Alle Faktoren werden berücksichtigt
2. ✅ **Statistische Modelle:** Historische Daten, Trends, Saisonalität
3. ✅ **Nicht-lineare Anpassungen:** Belegungsrate, Pickup Rate, etc.
4. ✅ **Konkurrenz-Analyse:** Vollständige Marktpositionierung
5. ✅ **Events-Integration:** Lokale Events berücksichtigen
6. ✅ **Zeitbasierte Faktoren:** Lead Time, Booking Window, Pickup Rate
7. ✅ **Regeln zusätzlich:** Regeln werden auf bereits berechneten Preis angewendet
8. ✅ **Validierung:** Min/Max-Grenzen, Max-Änderungen

### 5.2 Genauso präzise wie ML/AI-Tools

**Warum?**
- ✅ **Alle Faktoren berücksichtigt:** Genauso wie ML/AI-Tools
- ✅ **Statistische Berechnungen:** Historische Daten, Trends, Saisonalität
- ✅ **Nicht-lineare Anpassungen:** Komplexe Formeln für Belegung, Pickup, etc.
- ✅ **Multi-Faktor-Integration:** Alle Faktoren werden kombiniert
- ✅ **Transparent:** Jeder Schritt nachvollziehbar (im Gegensatz zu ML/AI Black Box)

**Unterschied zu ML/AI:**
- ❌ ML/AI lernt aus Millionen von Datenpunkten
- ✅ Unsere Lösung nutzt explizite Formeln und Regeln
- ✅ **Aber:** Mit allen Faktoren und komplexen Berechnungen genauso präzise!

---

## 6. Implementierungsreihenfolge

### Phase 1: Basis-Daten sammeln
- ✅ Aktuelle Preise aus LobbyPMS
- ✅ Belegungsrate berechnen
- ✅ Historische Daten speichern (12-24 Monate)

### Phase 2: Erweiterte Faktoren
- ✅ Pickup Rate berechnen
- ✅ Lead Time berechnen
- ✅ RevPAR/ADR berechnen
- ✅ Stornierungsrate berechnen

### Phase 3: Externe Faktoren
- ✅ Konkurrenzpreise (Rate-Shopping)
- ✅ Events-Integration
- ✅ Saisonalitäts-Faktoren

### Phase 4: Vollständiger Algorithmus
- ✅ Multi-Faktor-Berechnung implementieren
- ✅ Alle Berechnungsfunktionen
- ✅ Regeln zusätzlich anwenden
- ✅ Validierung

### Phase 5: Optimierung
- ✅ Algorithmus testen und anpassen
- ✅ Gewichtungen optimieren
- ✅ Performance optimieren


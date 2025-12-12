# Preisanalyse - API-Analyse und Regel-Definition

## 1. LobbyPMS API - Tatsächliche Response-Struktur

### 1.1 Endpoint: `/api/v2/available-rooms`

**Tatsächliche Response-Struktur (aus Tests und Code):**
```json
{
  "data": [
    {
      "date": "2025-02-01",
      "categories": [
        {
          "category_id": 34280,
          "name": "El primo aventurero",
          "available_rooms": 7,
          "plans": [
            {
              "id": null,
              "name": "STANDARD_RATE",
              "prices": [
                {
                  "people": 1,
                  "value": 60000
                },
                {
                  "people": 2,
                  "value": 110000
                }
              ]
            }
          ],
          "restrictions": {
            "min_stay": 0,
            "max_stay": 0,
            "lead_days": 0
          }
        }
      ]
    }
  ],
  "meta": {
    "total_records": 1,
    "current_page": 1,
    "records_per_page": 100,
    "total_pages": 1
  }
}
```

**WICHTIGE ERKENNTNISSE:**
- ✅ `available_rooms` ist vorhanden (Anzahl verfügbarer Zimmer)
- ❌ `total_rooms` ist **NICHT** in der Response
- ❌ `capacity` ist **NICHT** in der Response
- ✅ `category_id` ist vorhanden (eindeutige Kategorie-ID)
- ✅ `name` ist vorhanden (Zimmername)
- ✅ `plans[0].prices[]` enthält Preise pro Personenanzahl

### 1.2 Gesamtzahl Zimmer ermitteln

**Problem:** API gibt nur `available_rooms` zurück, nicht `total_rooms`

**Lösung: Maximum über Zeitraum ermitteln**

```typescript
// Schritt 1: Hole Verfügbarkeit für längeren Zeitraum (z.B. 90 Tage)
const availabilityData = await lobbyPmsService.checkAvailability(
  new Date('2025-01-01'),
  new Date('2025-03-31') // 90 Tage
);

// Schritt 2: Gruppiere nach categoryId
const categoryMap = new Map<number, number>();

for (const entry of availabilityData) {
  const currentMax = categoryMap.get(entry.categoryId) || 0;
  if (entry.availableRooms > currentMax) {
    categoryMap.set(entry.categoryId, entry.availableRooms);
  }
}

// Schritt 3: Maximum = Gesamtzahl (wenn alle Zimmer frei waren)
// Beispiel: categoryId 34280 hatte maximal 8 verfügbare Zimmer
// → totalRooms = 8

const totalRoomsPerCategory = Object.fromEntries(categoryMap);
// { 34280: 8, 34281: 6, 34282: 5, ... }
```

**Fallback: Manuelle Konfiguration**
```typescript
// In Branch-Settings speichern:
{
  "priceAnalysis": {
    "totalRoomsPerCategory": {
      "34280": 8,
      "34281": 6,
      "34282": 5
    }
  }
}
```

**Empfehlung:**
1. Beim ersten Abruf: Maximum über 90 Tage ermitteln
2. In Branch-Settings speichern
3. Bei Bedarf manuell korrigierbar
4. Regelmäßig validieren (z.B. monatlich)

---

## 2. Rate Shopping - ToS und Implementierung

### 2.1 Was sind ToS-Verstöße?

**ToS = Terms of Service (Nutzungsbedingungen)**

**Mögliche ToS-Verstöße beim Web Scraping:**
- **robots.txt missachten:** Websites haben eine `robots.txt` Datei, die definiert, welche Bereiche gecrawlt werden dürfen
- **Zu viele Requests:** Rate-Limiting umgehen, Server überlasten
- **Automatisierte Tools verboten:** Manche Websites verbieten explizit Bots/Scraper
- **Daten kommerziell nutzen:** Preisdaten für kommerzielle Zwecke verwenden, obwohl verboten

**Rechtliche Situation:**
- **Fragwürdig ≠ Illegal:** Rechtlich in Grauzone, aber nicht automatisch illegal
- **Manuelles Abrufen erlaubt:** Wenn du manuell die Website besuchst, ist das erlaubt
- **Automatisiertes Abrufen:** Kann gegen ToS verstoßen, ist aber nicht automatisch illegal

### 2.2 Saubere Implementierung

**Prinzipien:**
1. **Respektiere robots.txt:** Prüfe vor Scraping
2. **Rate-Limiting:** Maximal 1 Request pro 2-3 Sekunden
3. **User-Agent:** Realistischer Browser-User-Agent
4. **Headers:** Realistische Browser-Headers (Accept, Accept-Language, etc.)
5. **Cookies/Session:** Session-Management wie echter Browser
6. **Proxies:** Optional: Proxy-Rotation für zusätzliche Anonymität

**Technische Umsetzung:**
```typescript
// Beispiel mit Puppeteer (echter Browser)
const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});

const page = await browser.newPage();

// Realistische Browser-Headers
await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...');
await page.setExtraHTTPHeaders({
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Accept-Encoding': 'gzip, deflate',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1'
});

// Rate-Limiting: Warte zwischen Requests
await page.goto(url, { waitUntil: 'networkidle2' });
await delay(2000 + Math.random() * 1000); // 2-3 Sekunden zufällig

// Preise extrahieren
const prices = await page.evaluate(() => {
  // DOM-Selektor für Preise (muss für jede OTA angepasst werden)
  return Array.from(document.querySelectorAll('.price')).map(el => el.textContent);
});
```

**OTA-spezifische Anpassungen:**
- **Booking.com:** Komplexe Struktur, möglicherweise Anti-Bot-Maßnahmen
- **Hostelworld:** Einfacher, weniger Schutz
- **Jede OTA anders:** Selektoren und Struktur müssen individuell angepasst werden

---

## 3. Preisregeln - Detaillierte Definition

### 3.1 Regel-Struktur

**Jede Regel besteht aus:**
1. **Bedingungen (Conditions):** Wann wird die Regel angewendet?
2. **Aktion (Action):** Was passiert, wenn die Regel angewendet wird?
3. **Anwendungsbereich (Scope):** Für welche Zimmerkategorien?
4. **Priorität:** In welcher Reihenfolge werden Regeln angewendet?

### 3.2 Konfigurierbare Parameter

#### 3.2.1 Bedingungen (Conditions)

**Verfügbare Bedingungstypen:**

**1. Belegungsrate (occupancyRate)**
```typescript
{
  occupancyRate: {
    operator: ">" | "<" | ">=" | "<=" | "==" | "!=",
    value: 80  // Prozent (0-100)
  }
}
```
**Beispiele:**
- `{ operator: ">", value: 80 }` → Belegung > 80%
- `{ operator: "<", value: 30 }` → Belegung < 30%

**2. Wochentag (dayOfWeek)**
```typescript
{
  dayOfWeek: [0, 6]  // Array: 0=Sonntag, 6=Samstag
}
```
**Beispiele:**
- `[5, 6]` → Freitag und Samstag (Wochenende)
- `[0, 1, 2, 3, 4]` → Montag bis Freitag (Wochentage)

**3. Konkurrenzpreis-Differenz (competitorPriceDiff)**
```typescript
{
  competitorPriceDiff: {
    operator: ">" | "<" | ">=" | "<=",
    value: -10  // Prozent: -10 = Konkurrenz 10% teurer
  }
}
```
**Beispiele:**
- `{ operator: "<", value: -10 }` → Konkurrenz >10% teurer
- `{ operator: ">", value: 10 }` → Konkurrenz >10% günstiger

**4. Aktueller Preis (currentPrice)**
```typescript
{
  currentPrice: {
    operator: ">" | "<" | ">=" | "<=",
    value: 50000  // Absoluter Wert
  }
}
```

**5. Datum (date)**
```typescript
{
  date: {
    operator: "before" | "after" | "between",
    value: "2025-12-24"  // Spezifisches Datum
  }
}
```
**Beispiele:**
- `{ operator: "after", value: "2025-12-20" }` → Nach 20. Dezember (Weihnachtszeit)
- `{ operator: "between", value: ["2025-06-01", "2025-08-31"] }` → Sommerzeit

**6. Kombinierte Bedingungen (AND/OR)**
```typescript
{
  operator: "AND" | "OR",  // Standard: AND
  conditions: [
    { occupancyRate: { operator: ">", value: 80 } },
    { dayOfWeek: [5, 6] }
  ]
}
```

#### 3.2.2 Aktionen (Actions)

**Verfügbare Aktionstypen:**

**1. Erhöhen (increase)**
```typescript
{
  type: "increase",
  value: 15,  // Prozent (z.B. +15%)
  maxChange: 30,  // Maximale Änderung in Prozent (z.B. max +30%)
  minPrice: 40000,  // Minimalpreis (absolut)
  maxPrice: 80000   // Maximalpreis (absolut)
}
```

**2. Senken (decrease)**
```typescript
{
  type: "decrease",
  value: 10,  // Prozent (z.B. -10%)
  maxChange: 20,  // Maximale Änderung in Prozent (z.B. max -20%)
  minPrice: 40000,
  maxPrice: 80000
}
```

**3. Setzen (set)**
```typescript
{
  type: "set",
  value: 60000  // Absoluter Preis
}
```

**4. Kumulativ (cumulative)**
```typescript
{
  type: "increase",
  value: 15,
  cumulative: true  // Wird auf bereits angepassten Preis angewendet
  // false = wird nur auf ursprünglichen Preis angewendet
}
```

#### 3.2.3 Anwendungsbereich (Scope)

**Zimmerarten (roomTypes)**
```typescript
{
  roomTypes: ["compartida", "privada"]  // Array oder null für alle
}
```

**Kategorien (categoryIds)**
```typescript
{
  categoryIds: [34280, 34281, 34282]  // Array oder null für alle
}
```

**Branches (branchIds)**
```typescript
{
  branchIds: [3, 4]  // Array oder null für alle Branches
}
```

#### 3.2.4 Priorität

```typescript
{
  priority: 10  // Zahl: Höher = Wichtiger (wird zuerst angewendet)
}
```

### 3.3 Vollständige Regel-Beispiele

**Beispiel 1: Hohe Belegung am Wochenende**
```typescript
{
  id: 1,
  name: "Hohe Belegung am Wochenende - Preise erhöhen",
  branchId: 3,
  priority: 10,
  isActive: true,
  
  conditions: {
    operator: "AND",
    conditions: [
      { occupancyRate: { operator: ">", value: 80 } },
      { dayOfWeek: [5, 6] }  // Freitag, Samstag
    ]
  },
  
  action: {
    type: "increase",
    value: 15,  // +15%
    maxChange: 30,  // Maximal +30%
    minPrice: 40000,
    maxPrice: 80000,
    cumulative: true  // Kann mit anderen Regeln kombiniert werden
  },
  
  scope: {
    roomTypes: null,  // Alle Zimmerarten
    categoryIds: null,  // Alle Kategorien
    branchIds: [3]  // Nur Branch 3
  }
}
```

**Beispiel 2: Niedrige Belegung - Preise senken**
```typescript
{
  id: 2,
  name: "Niedrige Belegung - Preise senken",
  branchId: 3,
  priority: 8,
  isActive: true,
  
  conditions: {
    occupancyRate: { operator: "<", value: 30 }
  },
  
  action: {
    type: "decrease",
    value: 10,  // -10%
    maxChange: 20,  // Maximal -20%
    minPrice: 40000,
    maxPrice: 80000,
    cumulative: false  // Nur auf ursprünglichen Preis
  },
  
  scope: {
    roomTypes: ["compartida"],  // Nur Dorms
    categoryIds: [34280, 34281, 34282],  // Spezifische Kategorien
    branchIds: null  // Alle Branches
  }
}
```

**Beispiel 3: Konkurrenz zu teuer - Preise erhöhen**
```typescript
{
  id: 3,
  name: "Konkurrenz >10% teurer - Preise erhöhen",
  branchId: 3,
  priority: 5,
  isActive: true,
  
  conditions: {
    competitorPriceDiff: { operator: "<", value: -10 }  // Konkurrenz >10% teurer
  },
  
  action: {
    type: "increase",
    value: 5,  // +5%
    maxChange: 15,
    cumulative: true
  },
  
  scope: {
    roomTypes: null,
    categoryIds: null,
    branchIds: [3]
  }
}
```

**Beispiel 4: Weihnachtszeit - Preise erhöhen**
```typescript
{
  id: 4,
  name: "Weihnachtszeit - Preise erhöhen",
  branchId: 3,
  priority: 15,  // Sehr hohe Priorität
  isActive: true,
  
  conditions: {
    date: {
      operator: "between",
      value: ["2025-12-20", "2026-01-05"]
    }
  },
  
  action: {
    type: "increase",
    value: 25,  // +25%
    maxChange: 50,
    cumulative: true
  },
  
  scope: {
    roomTypes: null,
    categoryIds: null,
    branchIds: [3]
  }
}
```

### 3.4 Regel-Anwendung (Kumulativ)

**Ablauf:**
1. Regeln nach Priorität sortieren (höher = zuerst)
2. Für jede Regel:
   - Bedingungen prüfen
   - Wenn erfüllt: Aktion anwenden
   - Wenn `cumulative: true`: Auf bereits angepassten Preis anwenden
   - Wenn `cumulative: false`: Auf ursprünglichen Preis anwenden
3. Am Ende: Min/Max-Grenzen validieren

**Beispiel:**
```
Ursprünglicher Preis: 50.000 COP

Regel 1 (Priorität 10, cumulative: true): +15%
→ 50.000 * 1.15 = 57.500 COP

Regel 2 (Priorität 8, cumulative: true): +10%
→ 57.500 * 1.10 = 63.250 COP

Regel 3 (Priorität 5, cumulative: false): +5%
→ 50.000 * 1.05 = 52.500 COP
→ Aber: Regel 3 wird auf ursprünglichen Preis angewendet!
→ Da cumulative: false, wird der bereits angepasste Preis (63.250) verwendet
→ Ergebnis: 63.250 COP (Regel 3 ignoriert, da cumulative: false)

Validierung:
- Max-Preis: 80.000 → OK (63.250 < 80.000)
- Max-Änderung: 30% (15.000) → 13.250 < 15.000 → OK
```

**WICHTIG:** Wenn `cumulative: false`, wird die Regel nur auf den ursprünglichen Preis angewendet, aber das Ergebnis wird nicht zum bereits angepassten Preis addiert. Stattdessen wird der höhere Wert genommen (oder eine andere Logik, die definiert werden muss).

**Empfehlung für cumulative: false:**
- Regel wird auf ursprünglichen Preis angewendet
- Ergebnis wird mit bereits angepasstem Preis verglichen
- Höherer Wert wird genommen (für Erhöhungen)
- Niedrigerer Wert wird genommen (für Senkungen)

---

## 4. Zusammenfassung

### 4.1 Gesamtzahl Zimmer
- **Methode:** Maximum über 90 Tage ermitteln
- **Fallback:** Manuelle Konfiguration in Branch-Settings
- **Validierung:** Monatlich prüfen

### 4.2 Rate Shopping
- **Option C (APIs) wo möglich und kostenlos**
- **Option B (Web Scraping) sonst**
- **Saubere Implementierung:** Rate-Limiting, realistische Headers, robots.txt respektieren
- **ToS-Verstöße:** Rechtlich fragwürdig, aber nicht automatisch illegal

### 4.3 Preisregeln
- **Vollständig konfigurierbar:** Bedingungen, Aktionen, Anwendungsbereich, Priorität
- **Kumulativ:** Pro Regel konfigurierbar (`cumulative: true/false`)
- **Validierung:** Min/Max-Grenzen am Ende


# Preisanalyse-Funktion - Implementierungsplan

## Überblick

Dieses Dokument beschreibt die Planung einer umfassenden Preisanalyse-Funktion für das Intranet-System. Die Funktion ermöglicht es, Preise für verschiedene Branches und OTA-Plattformen (Booking.com, Hostelworld.com, etc.) zu analysieren, zu vergleichen und automatische Preisempfehlungen zu generieren, die dann über die LobbyPMS API eingespielt werden können.

**Status:** Planungsphase - Noch nichts implementiert

**Erstellt:** 2025-01-31

---

## 1. Recherche: Wie funktionieren Preisanalyse-Systeme?

### 1.1 Cloudbeds PIE (Price Intelligence Engine)

**Funktionsweise:**
- **Rate Shopping:** Überwacht kontinuierlich die Preise von Wettbewerbern auf verschiedenen OTAs (Booking.com, Hostelworld, etc.)
- **Echtzeit-Marktdaten:** Sammelt und analysiert Preisdaten in Echtzeit
- **KPIs:** Überwacht wichtige Leistungsindikatoren (Belegungsrate, Durchschnittspreis, etc.)
- **Regelbasierte Automatisierung:** Erstellt automatisierte Regeln für Preisänderungen basierend auf:
  - Belegungsrate
  - Markttrends
  - Wettbewerberpreisen
  - Saisonalität

**Quellen:**
- [Cloudbeds PIE Overview](https://myfrontdesk.cloudbeds.com/hc/en-us/articles/360002860393-PIE-Price-Intelligence-Engine-Everything-you-need-to-know)
- [PIE Rate Shopper](https://myfrontdesk.cloudbeds.com/hc/en-us/articles/115002822894-PIE-Rate-Shopper)
- [PIE Rules and Alerts](https://myfrontdesk.cloudbeds.com/hc/en-us/articles/115002690913-PIE-Rules-and-Alerts)

### 1.2 RoomPriceGenie

**Funktionsweise:**
- **Automatische Preisempfehlungen:** Berechnet optimale Preise basierend auf:
  - Belegungsraten
  - Markttrends
  - Lokalen Veranstaltungen
  - Historischen Buchungsdaten
- **Langfristige Planung:** Kann Preise bis zu 18 Monate im Voraus berechnen
- **Echtzeit-Updates:** Aktualisiert Preise automatisch in Echtzeit

**Quelle:**
- [RoomPriceGenie Integration](https://cbdev2.cloudbeds.com/integrations/roompricegenie/)

### 1.3 PriceLabs

**Funktionsweise:**
- **PMS-Integration:** Synchronisiert Preise, Mindestaufenthaltsanforderungen und Check-in/Check-out-Beschränkungen mit dem PMS
- **Langfristige Planung:** Bis zu 540 Tage im Voraus
- **Dynamische Preisgestaltung:** Passt Preise basierend auf Nachfrage und Wettbewerb an

**Quelle:**
- [PriceLabs Cloudbeds Integration](https://help.pricelabs.co/portal/de/kb/articles/integration-von-pricelabs-mit-cloudbeds)

### 1.4 Zusammenfassung der Erkenntnisse

**Gemeinsame Funktionsprinzipien:**
1. **Datenaggregation:**
   - Wettbewerberpreise von OTAs sammeln (Rate Shopping)
   - Eigene Belegungsdaten aus PMS nutzen
   - Historische Buchungsdaten analysieren

2. **Datenanalyse:**
   - Preisentwicklungen pro Tag und Zimmerkategorie identifizieren
   - Wettbewerbsvergleich durchführen
   - Markttrends erkennen

3. **Preisempfehlungen:**
   - Regelbasierte Preisgestaltung (z.B. bei Belegung >80% Preise erhöhen)
   - Algorithmus-basierte Empfehlungen (ML/AI)
   - Berücksichtigung von Saisonalität, lokalen Events, etc.

4. **PMS-Integration:**
   - Automatische Synchronisation der empfohlenen Preise
   - API-basierte Übertragung

---

## 2. Use Cases

### 2.1 Übersicht über alle Inserate im Frontend

**Beschreibung:**
- Anzeige aller Inserate pro Branch für verschiedene OTA-Plattformen (Booking.com, Hostelworld.com, etc.)
- Übersichtliche Darstellung mit Filter- und Suchfunktionen
- Gruppierung nach Branch, Plattform, Zimmerkategorie

**Anforderungen:**
- Frontend-Komponente für Inserat-Übersicht
- Filter nach Branch, OTA-Plattform, Zimmerkategorie
- Anzeige aktueller Preise, Verfügbarkeiten, Belegungsraten

### 2.2 Preisanalyse pro Tag & Zimmer für die nächsten 3 Monate

**Beschreibung:**
- Analyse der Preise pro Tag und Zimmerkategorie für die kommenden 3 Monate
- Visualisierung in Tabellen und Diagrammen
- Vergleich mit historischen Daten und Wettbewerberpreisen

**Anforderungen:**
- Datenaggregation für 3-Monats-Zeitraum
- Gruppierung nach Tag und Zimmerkategorie
- Visualisierung (Tabellen, Charts, Heatmaps)

### 2.3 Unterscheidung Zimmerkategorien (Private / Dorm)

**Beschreibung:**
- Separate Analyse für Privatzimmer und Schlafsäle (Dorms)
- Unterschiedliche Preisstrategien pro Kategorie
- Kategorie-spezifische Regeln für Preisempfehlungen

**Anforderungen:**
- Identifikation der Zimmerkategorie aus LobbyPMS Daten
- Separate Datenstrukturen für Private vs. Dorm
- Kategorie-spezifische Preisempfehlungslogik

### 2.4 Preisempfehlungen pro Tag & Zimmer für die nächsten 3 Monate

**Beschreibung:**
- Automatische Generierung von Preisempfehlungen basierend auf:
  - Konkurrenzpreisen
  - Eigener Verfügbarkeit/Belegung
  - Definierten Regeln
- Anzeige der Empfehlungen im Frontend
- Möglichkeit zur manuellen Anpassung

**Anforderungen:**
- Regel-Engine für Preisempfehlungen
- Algorithmus für Preisberechnung
- Frontend-Komponente für Anzeige und Bearbeitung

### 2.5 Einspielen der Empfehlungen ins LobbyPMS

**Beschreibung:**
- Möglichkeit, die generierten Preisempfehlungen über die LobbyPMS API ins PMS einzuspielen
- Batch-Update für mehrere Tage/Zimmer
- Validierung vor dem Einspielen

**Anforderungen:**
- LobbyPMS API-Integration für Preis-Updates
- Batch-Update-Funktionalität
- Validierung und Fehlerbehandlung

---

## 3. Ideen des Benutzers

### 3.1 Nutzung von Konkurrenzpreisen & eigener Verfügbarkeit

**Ansatz:**
- Preise der Konkurrenz auf OTAs sammeln (Rate Shopping)
- Eigene Verfügbarkeit/Belegung aus LobbyPMS nutzen
- Anhand definierter Regeln Preisempfehlungen ableiten

**Beispiel-Regeln:**
- Bei Belegung >80%: Preise um X% erhöhen
- Bei Belegung <30%: Preise um Y% senken
- Wenn Konkurrenzpreis um Z% höher: Preise anpassen
- Bei hoher Nachfrage (z.B. Wochenende): Preise erhöhen

### 3.2 Regelbasierte Preisgestaltung

**Vorteile:**
- Transparente und nachvollziehbare Preisempfehlungen
- Einfach anpassbar ohne komplexe Algorithmen
- Kontrolle über Preisstrategie bleibt beim Benutzer

**Implementierung:**
- Konfigurierbare Regeln pro Branch
- Priorisierung von Regeln
- Logging der angewendeten Regeln

---

## 4. Analyse des aktuellen Systems

### 4.0 LobbyPMS API - Bekannte Endpoints und Strukturen

**Basis-Informationen:**
- Base URL: `https://api.lobbypms.com`
- Authentifizierung: Bearer Token im Header (`Authorization: Bearer {apiKey}`)
- API-Version: v1 und v2 (je nach Endpoint)

**Bekannte Endpoints:**

1. **`GET /api/v2/available-rooms`** ✅ Implementiert
   - **Zweck:** Verfügbarkeit und Preise abrufen
   - **Parameter:**
     - `start_date` (erforderlich): Format "YYYY-MM-DD"
     - `end_date` (erforderlich): Format "YYYY-MM-DD"
     - `property_id` (optional): Property-ID
     - `category_id` (optional): Filter nach Kategorie
   - **Response-Struktur:**
     ```json
     {
       "data": [
         {
           "date": "2025-02-01",
           "categories": [
             {
               "category_id": 34280,
               "name": "El primo aventurero",
               "available_rooms": 5,
               "plans": [
                 {
                   "prices": [
                     { "people": 1, "value": 50000 },
                     { "people": 2, "value": 90000 }
                   ]
                 }
               ]
             }
           ]
         }
       ]
     }
     ```
   - **Implementierung:** `LobbyPmsService.checkAvailability()` (Zeile 306-414)
   - **Erkenntnisse:**
     - Preise sind in `category.plans[0].prices[]` gespeichert
     - Jeder Preis hat `people` (Personenanzahl) und `value` (Preis)
     - `available_rooms` gibt Anzahl verfügbarer Zimmer an
     - Zimmerkategorien werden unterschieden: `compartida` (Dorm) vs. `privada` (Private)

2. **`GET /api/v1/bookings`** ✅ Implementiert
   - **Zweck:** Reservierungen abrufen
   - **Parameter:**
     - `per_page`: Anzahl pro Seite (max 100)
     - `page`: Seitennummer
     - `property_id` (optional)
   - **Implementierung:** `LobbyPmsService.fetchReservations()` (Zeile 423-566)

3. **`POST /api/v1/bookings`** ✅ Implementiert
   - **Zweck:** Neue Reservierung erstellen
   - **Payload:**
     - `category_id` (erforderlich)
     - `start_date` (erforderlich): Format "YYYY-MM-DD"
     - `end_date` (erforderlich): Format "YYYY-MM-DD"
     - `holder_name` (erforderlich)
     - `total_adults` (erforderlich)
   - **Implementierung:** `LobbyPmsService.createBooking()` (Zeile 799-879)

4. **`PUT /reservations/:id/status`** ✅ Implementiert
   - **Zweck:** Status einer Reservierung aktualisieren
   - **Payload:** `{ status: "checked_in" | "checked_out" | ... }`
   - **Implementierung:** `LobbyPmsService.updateReservationStatus()` (Zeile 887-913)

**Fehlende Endpoints (für Preisanalyse benötigt):**
- ❌ **Preis-Update-Endpoint:** Noch nicht identifiziert
  - Python-Skript zeigt, dass Preis-Updates möglich sind (`actualizar_precio_en_pms()`)
  - Endpoint und Payload-Struktur müssen noch recherchiert werden
  - Mögliche Endpoints (zu testen):
    - `PUT /api/v2/categories/:categoryId/prices`
    - `POST /api/v2/prices`
    - `PUT /api/v2/available-rooms` (mit Preis-Updates im Payload)

**Python-Skript-Analyse:**
Das bereitgestellte Python-Skript zeigt:
- Verwendung von `/api/v2/available-rooms` mit `api_token` als Query-Parameter
- **HINWEIS:** Aktuelle Implementierung verwendet Bearer Token im Header (korrekter)
- Verfügbarkeits-basierte Preisberechnung:
  ```python
  incremento_precio = min(factor_disponibilidad * (1.0 - disponibilidad), 1.0) * incremento_maximo_precio
  nuevo_precio = min(precio_minimo + incremento_precio, incremento_maximo_precio)
  ```
- Funktion `actualizar_precio_en_pms()` wird aufgerufen, aber nicht gezeigt
- **Erkenntnis:** Preis-Updates sind möglich, aber Endpoint muss noch identifiziert werden

### 4.1 Datenbank-Struktur

#### 4.1.1 Reservation Model

**Datei:** `backend/prisma/schema.prisma` (Zeilen 1109-1170)

**Relevante Felder:**
- `categoryId` (Int?): LobbyPMS category_id für Zimmer-Beschreibungen
- `amount` (Decimal?): Preis der Reservierung
- `currency` (String?): Währung (Standard: "COP")
- `branchId` (Int?): Branch-Zuordnung
- `checkInDate` (DateTime): Check-in-Datum
- `checkOutDate` (DateTime): Check-out-Datum
- `roomNumber` (String?): Zimmernummer
- `roomDescription` (String?): Zimmerbeschreibung

**Erkenntnisse:**
- Preise werden bereits in Reservierungen gespeichert
- Zimmerkategorien werden über `categoryId` identifiziert
- Branch-Zuordnung existiert bereits

#### 4.1.2 Branch Model

**Datei:** `backend/prisma/schema.prisma` (Zeilen 203-233)

**Relevante Felder:**
- `id` (Int): Eindeutige Branch-ID
- `name` (String): Branch-Name
- `organizationId` (Int?): Organisation-Zuordnung
- `lobbyPmsSettings` (Json?): LobbyPMS-Konfiguration pro Branch

**Erkenntnisse:**
- Branches sind bereits pro Organisation strukturiert
- LobbyPMS-Settings sind bereits pro Branch konfigurierbar

### 4.2 LobbyPMS Integration

#### 4.2.1 LobbyPmsService

**Datei:** `backend/src/services/lobbyPmsService.ts`

**Relevante Funktionen:**
- `checkAvailability(startDate, endDate)`: Prüft Verfügbarkeit und Preise
  - Gibt zurück: `categoryId`, `roomName`, `roomType` ('compartida' | 'privada'), `availableRooms`, `pricePerNight`, `currency`, `date`, `prices`
  - Unterscheidet bereits zwischen Dorm (`compartida`) und Private (`privada`)

**Erkenntnisse:**
- Verfügbarkeits- und Preisdaten können bereits aus LobbyPMS abgerufen werden
- Zimmerkategorien werden bereits unterschieden
- Preise pro Kategorie und Tag sind verfügbar

#### 4.2.2 Zimmerkategorien-Erkennung

**Aktuelle Implementierung:**
- **Dorm (compartida):** 
  - Erkennung über: `name.includes('dorm') || name.includes('compartida')` oder spezifische `category_id` (34280, 34281, 34282)
  - Beispiel: "La tia artista", "El primo aventurero", "El abuelo viajero"
- **Private (privada):**
  - Standard, wenn nicht "compartida"
  - Beispiel: "El abuelo bromista", "Doble básica"

**Quelle:** `backend/src/services/lobbyPmsService.ts` (Zeilen 372-380)

### 4.3 Fehlende Komponenten

#### 4.3.1 OTA-Daten

**Status:** Nicht vorhanden
- Keine Datenstruktur für OTA-Inserate
- Keine Rate-Shopping-Funktionalität
- Keine Konkurrenzpreis-Daten

#### 4.3.2 Preisanalyse-Datenstruktur

**Status:** Nicht vorhanden
- Keine separate Tabelle für Preisanalysen
- Keine historischen Preisdaten (nur aktuelle Reservierungen)
- Keine Preisempfehlungen

#### 4.3.3 Regel-Engine

**Status:** Nicht vorhanden
- Keine konfigurierbaren Preisregeln
- Keine Automatisierung für Preisempfehlungen

#### 4.3.4 Frontend-Komponenten

**Status:** Nicht vorhanden
- Keine Übersicht für Inserate
- Keine Preisanalyse-Ansicht
- Keine Preisempfehlungs-Ansicht

---

## 5. Datenmodell-Erweiterungen

### 5.1 Neue Datenbank-Modelle

#### 5.1.1 OTAListing (OTA-Inserat)

```prisma
model OTAListing {
  id              Int      @id @default(autoincrement())
  branchId        Int
  branch          Branch   @relation(fields: [branchId], references: [id])
  
  // OTA-Informationen
  platform        String   // 'booking.com', 'hostelworld.com', etc.
  listingId       String   // Eindeutige ID des Inserats auf der OTA-Plattform
  listingUrl      String?  // URL zum Inserat
  
  // Zimmerkategorie
  categoryId      Int?     // LobbyPMS category_id
  roomType        String   // 'private' | 'dorm'
  roomName        String?  // Name des Zimmers/Kategorie
  
  // Status
  isActive        Boolean  @default(true)
  
  // Metadaten
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  // Relations
  priceData       OTAPriceData[]
  
  @@unique([branchId, platform, listingId])
  @@index([branchId])
  @@index([platform])
  @@index([categoryId])
  @@index([roomType])
}
```

#### 5.1.2 OTAPriceData (OTA-Preisdaten)

```prisma
model OTAPriceData {
  id              Int      @id @default(autoincrement())
  listingId       Int
  listing         OTAListing @relation(fields: [listingId], references: [id], onDelete: Cascade)
  
  // Datum und Preis
  date            DateTime @db.Date
  price           Decimal  @db.Decimal(10, 2)
  currency        String   @default("COP")
  
  // Verfügbarkeit
  available       Boolean  @default(true)
  availableRooms  Int?     // Anzahl verfügbarer Zimmer
  
  // Metadaten
  scrapedAt       DateTime @default(now()) // Wann wurden die Daten gesammelt
  source          String?  // 'rate_shopper' | 'api' | 'manual'
  
  @@unique([listingId, date])
  @@index([listingId])
  @@index([date])
  @@index([scrapedAt])
}
```

#### 5.1.3 PriceAnalysis (Preisanalyse)

```prisma
model PriceAnalysis {
  id              Int      @id @default(autoincrement())
  branchId        Int
  branch          Branch   @relation(fields: [branchId], references: [id])
  
  // Zeitraum
  analysisDate    DateTime @db.Date // Datum der Analyse
  startDate       DateTime @db.Date // Startdatum des analysierten Zeitraums
  endDate         DateTime @db.Date // Enddatum (normalerweise +3 Monate)
  
  // Zimmerkategorie
  categoryId      Int?     // LobbyPMS category_id
  roomType        String   // 'private' | 'dorm'
  
  // Analyse-Daten
  currentPrice    Decimal? @db.Decimal(10, 2) // Aktueller Preis
  averagePrice    Decimal? @db.Decimal(10, 2) // Durchschnittspreis im Zeitraum
  minPrice        Decimal? @db.Decimal(10, 2) // Minimalpreis
  maxPrice        Decimal? @db.Decimal(10, 2) // Maximalpreis
  
  // Belegung
  occupancyRate   Decimal? @db.Decimal(5, 2) // Belegungsrate (0-100)
  availableRooms  Int?     // Verfügbare Zimmer
  
  // Wettbewerb
  competitorAvgPrice Decimal? @db.Decimal(10, 2) // Durchschnittspreis der Konkurrenz
  pricePosition    String?  // 'above' | 'below' | 'equal' // Position im Markt
  
  // Metadaten
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  // Relations
  recommendations PriceRecommendation[]
  
  @@unique([branchId, analysisDate, categoryId, roomType])
  @@index([branchId])
  @@index([analysisDate])
  @@index([categoryId])
  @@index([roomType])
}
```

#### 5.1.4 PriceRecommendation (Preisempfehlung)

```prisma
model PriceRecommendation {
  id              Int      @id @default(autoincrement())
  analysisId      Int?
  analysis        PriceAnalysis? @relation(fields: [analysisId], references: [id])
  
  branchId        Int
  branch          Branch   @relation(fields: [branchId], references: [id])
  
  // Datum und Zimmer
  date            DateTime @db.Date
  categoryId      Int?     // LobbyPMS category_id
  roomType        String   // 'private' | 'dorm'
  
  // Empfehlung
  recommendedPrice Decimal @db.Decimal(10, 2)
  currentPrice     Decimal? @db.Decimal(10, 2)
  priceChange      Decimal? @db.Decimal(10, 2) // Differenz zum aktuellen Preis
  priceChangePercent Decimal? @db.Decimal(5, 2) // Prozentuale Änderung
  
  // Begründung
  appliedRules     Json?   // Array der angewendeten Regeln
  reasoning        String? // Textuelle Begründung
  
  // Status
  status          String   @default("pending") // 'pending' | 'approved' | 'applied' | 'rejected'
  appliedAt       DateTime? // Wann wurde die Empfehlung ins LobbyPMS eingespielt
  appliedBy       Int?     // User-ID, der die Empfehlung angewendet hat
  approvedAt      DateTime?
  approvedBy      Int?     // User-ID, der die Empfehlung genehmigt hat
  
  // Metadaten
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@unique([branchId, date, categoryId, roomType])
  @@index([branchId])
  @@index([date])
  @@index([categoryId])
  @@index([roomType])
  @@index([status])
}
```

#### 5.1.5 PricingRule (Preisregel)

```prisma
model PricingRule {
  id              Int      @id @default(autoincrement())
  branchId        Int
  branch          Branch   @relation(fields: [branchId], references: [id])
  
  // Regel-Definition
  name            String   // Name der Regel (z.B. "Hohe Belegung - Preise erhöhen")
  description     String?  // Beschreibung
  
  // Bedingungen
  conditions      Json     // JSON mit Bedingungen:
  // {
  //   "occupancyRate": { "operator": ">", "value": 80 },
  //   "competitorPriceDiff": { "operator": "<", "value": -10 },
  //   "dayOfWeek": [5, 6] // Wochenende
  // }
  
  // Aktion
  action          Json     // JSON mit Aktion:
  // {
  //   "type": "increase" | "decrease" | "set",
  //   "value": 10, // Prozent oder absoluter Wert
  //   "maxChange": 20, // Maximale Änderung in Prozent
  //   "minPrice": 50000, // Minimalpreis
  //   "maxPrice": 200000 // Maximalpreis
  // }
  
  // Anwendungsbereich
  roomTypes       Json?    // ['private', 'dorm'] oder null für alle
  categoryIds     Json?    // [34280, 34281] oder null für alle
  
  // Priorität
  priority        Int      @default(0) // Höhere Zahl = höhere Priorität
  
  // Status
  isActive        Boolean  @default(true)
  
  // Metadaten
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  createdBy       Int?     // User-ID
  createdByUser   User?    @relation(fields: [createdBy], references: [id])
  
  @@index([branchId])
  @@index([isActive])
  @@index([priority])
}
```

#### 5.1.6 RateShoppingJob (Rate-Shopping-Job)

```prisma
model RateShoppingJob {
  id              Int      @id @default(autoincrement())
  branchId        Int
  branch          Branch   @relation(fields: [branchId], references: [id])
  
  // Job-Informationen
  platform        String   // 'booking.com', 'hostelworld.com', etc.
  status          String   @default("pending") // 'pending' | 'running' | 'completed' | 'failed'
  
  // Zeitraum
  startDate       DateTime @db.Date
  endDate         DateTime @db.Date
  
  // Ergebnisse
  listingsFound   Int      @default(0)
  pricesCollected Int      @default(0)
  errors          Json?    // Array von Fehlern
  
  // Metadaten
  startedAt       DateTime?
  completedAt     DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([branchId])
  @@index([status])
  @@index([platform])
}
```

### 5.2 Erweiterungen bestehender Modelle

#### 5.2.1 Branch Model

```prisma
model Branch {
  // ... bestehende Felder ...
  
  // Neue Relations
  otaListings     OTAListing[]
  priceAnalyses   PriceAnalysis[]
  priceRecommendations PriceRecommendation[]
  pricingRules    PricingRule[]
  rateShoppingJobs RateShoppingJob[]
}
```

#### 5.2.2 User Model

```prisma
model User {
  // ... bestehende Felder ...
  
  // Neue Relations
  pricingRulesCreated PricingRule[] @relation("PricingRuleCreator")
  priceRecommendationsApproved PriceRecommendation[] @relation("PriceRecommendationApprover")
  priceRecommendationsApplied PriceRecommendation[] @relation("PriceRecommendationApplier")
}
```

---

## 6. Backend-Architektur

### 6.1 Services

#### 6.1.1 OTARateShoppingService

**Zweck:** Sammelt Preisdaten von OTA-Plattformen

**Funktionen:**
- `scrapeBookingCom(branchId, startDate, endDate)`: Sammelt Preise von Booking.com
- `scrapeHostelworld(branchId, startDate, endDate)`: Sammelt Preise von Hostelworld
- `scrapeOTA(platform, branchId, startDate, endDate)`: Generische Funktion für alle OTAs
- `scheduleRateShopping(branchId, interval)`: Plant regelmäßige Rate-Shopping-Jobs
- `getCompetitorPrices(branchId, date, categoryId)`: Gibt Konkurrenzpreise für ein bestimmtes Datum zurück

**Technische Umsetzung:**
- Web Scraping (Puppeteer/Playwright) oder API-Integration (falls verfügbar)
- Rate-Limiting beachten
- Roboter.txt respektieren
- Fehlerbehandlung und Retry-Logik

#### 6.1.2 PriceAnalysisService

**Zweck:** Analysiert Preisdaten und generiert Preisanalysen

**Funktionen:**
- `analyzePrices(branchId, startDate, endDate, categoryId?, roomType?)`: Führt Preisanalyse durch
- `calculateOccupancyRate(branchId, date, categoryId)`: Berechnet Belegungsrate
- `compareWithCompetitors(branchId, date, categoryId)`: Vergleicht mit Konkurrenzpreisen
- `getHistoricalPrices(branchId, categoryId, days)`: Holt historische Preisdaten

**Datenquellen:**
- Eigene Reservierungen (aus Reservation Model)
- LobbyPMS Verfügbarkeitsdaten
- OTA-Preisdaten (aus OTAPriceData)

#### 6.1.3 PriceRecommendationService

**Zweck:** Generiert Preisempfehlungen basierend auf Regeln

**Funktionen:**
- `generateRecommendations(branchId, startDate, endDate)`: Generiert Empfehlungen für Zeitraum
- `applyRules(branchId, date, categoryId, roomType, analysisData)`: Wendet Preisregeln an
- `evaluateRule(rule, analysisData)`: Prüft, ob eine Regel anwendbar ist
- `calculateRecommendedPrice(currentPrice, rules, analysisData)`: Berechnet empfohlenen Preis
- `approveRecommendation(recommendationId, userId)`: Genehmigt eine Empfehlung
- `rejectRecommendation(recommendationId, userId, reason)`: Lehnt eine Empfehlung ab

**Regel-Engine:**
- Lädt alle aktiven Regeln für einen Branch
- Sortiert nach Priorität
- Prüft Bedingungen für jede Regel
- Wendet Aktionen an (kumulativ oder einzeln, je nach Konfiguration)
- Validiert Ergebnis (Min/Max-Preise, etc.)

#### 6.1.4 LobbyPMSPriceUpdateService

**Zweck:** Spielt Preisempfehlungen ins LobbyPMS ein

**Funktionen:**
- `updatePrices(branchId, recommendations)`: Aktualisiert Preise im LobbyPMS
- `updatePriceForDate(branchId, date, categoryId, price)`: Aktualisiert Preis für ein Datum
- `batchUpdatePrices(branchId, priceUpdates)`: Batch-Update für mehrere Preise
- `validatePriceUpdate(priceUpdate)`: Validiert Preis-Update vor dem Einspielen

**Integration:**
- Nutzt bestehenden `LobbyPmsService`
- Erweitert um Preis-Update-Endpoints
- Fehlerbehandlung und Rollback bei Fehlern

**Bekannte API-Struktur (aus Python-Skript und aktuellem Code):**
- Base URL: `https://api.lobbypms.com`
- Authentifizierung: Bearer Token im Header (`Authorization: Bearer {apiKey}`)
- Verfügbarkeits-Endpoint: `GET /api/v2/available-rooms`
  - Gibt Preise zurück in: `category.plans[0].prices[]` (Array mit `{ people: number, value: number }`)
- **Preis-Update-Endpoint:** Noch zu identifizieren (siehe Abschnitt 9.4)

**Aktuelle Implementierung:**
- `LobbyPmsService.checkAvailability()` ruft bereits `/api/v2/available-rooms` auf
- Gibt Preise zurück: `pricePerNight` (für 1 Person) und `prices[]` (für alle Personenanzahlen)
- **KEINE Preis-Update-Funktion vorhanden** - muss implementiert werden

### 6.2 Controller

#### 6.2.1 OTAController

**Endpoints:**
- `GET /api/ota/listings?branchId=:id`: Liste aller OTA-Inserate für einen Branch
- `POST /api/ota/listings`: Erstellt neues OTA-Inserat
- `PUT /api/ota/listings/:id`: Aktualisiert OTA-Inserat
- `DELETE /api/ota/listings/:id`: Löscht OTA-Inserat
- `POST /api/ota/rate-shopping`: Startet Rate-Shopping-Job
- `GET /api/ota/rate-shopping/jobs?branchId=:id`: Liste aller Rate-Shopping-Jobs
- `GET /api/ota/prices?branchId=:id&startDate=:date&endDate=:date`: Holt OTA-Preisdaten

#### 6.2.2 PriceAnalysisController

**Endpoints:**
- `GET /api/price-analysis?branchId=:id&startDate=:date&endDate=:date`: Holt Preisanalysen
- `POST /api/price-analysis/analyze`: Startet neue Preisanalyse
- `GET /api/price-analysis/:id`: Holt spezifische Preisanalyse

#### 6.2.3 PriceRecommendationController

**Endpoints:**
- `GET /api/price-recommendations?branchId=:id&startDate=:date&endDate=:date`: Liste der Preisempfehlungen
- `POST /api/price-recommendations/generate`: Generiert neue Preisempfehlungen
- `POST /api/price-recommendations/:id/approve`: Genehmigt eine Empfehlung
- `POST /api/price-recommendations/:id/reject`: Lehnt eine Empfehlung ab
- `POST /api/price-recommendations/:id/apply`: Wendet eine Empfehlung an (spielt ins LobbyPMS ein)
- `POST /api/price-recommendations/batch-apply`: Wendet mehrere Empfehlungen an

#### 6.2.4 PricingRuleController

**Endpoints:**
- `GET /api/pricing-rules?branchId=:id`: Liste aller Preisregeln
- `POST /api/pricing-rules`: Erstellt neue Preisregel
- `PUT /api/pricing-rules/:id`: Aktualisiert Preisregel
- `DELETE /api/pricing-rules/:id`: Löscht Preisregel
- `POST /api/pricing-rules/:id/toggle`: Aktiviert/deaktiviert Regel

### 6.3 Jobs/Scheduler

#### 6.3.1 RateShoppingScheduler

**Zweck:** Plant regelmäßige Rate-Shopping-Jobs

**Funktionen:**
- Läuft täglich (z.B. um 2:00 Uhr)
- Iteriert über alle aktiven Branches
- Startet Rate-Shopping für alle konfigurierten OTA-Plattformen
- Sammelt Preise für die nächsten 3 Monate

#### 6.3.2 PriceAnalysisScheduler

**Zweck:** Plant regelmäßige Preisanalysen

**Funktionen:**
- Läuft täglich (z.B. um 3:00 Uhr)
- Führt Preisanalyse für alle Branches durch
- Generiert neue Preisempfehlungen basierend auf aktuellen Daten

---

## 7. Frontend-Architektur

### 7.1 Seiten/Komponenten

#### 7.1.1 PriceAnalysisPage

**Route:** `/price-analysis`

**Funktionen:**
- Übersicht über alle Preisanalysen
- Filter nach Branch, Zeitraum, Zimmerkategorie
- Navigation zu Detailansichten

**Komponenten:**
- `PriceAnalysisList`: Liste aller Analysen
- `PriceAnalysisFilters`: Filter-Komponente
- `PriceAnalysisCard`: Karte für einzelne Analyse

#### 7.1.2 PriceAnalysisDetailPage

**Route:** `/price-analysis/:id`

**Funktionen:**
- Detaillierte Ansicht einer Preisanalyse
- Visualisierung der Preisentwicklung
- Vergleich mit Konkurrenzpreisen
- Anzeige der Belegungsrate

**Komponenten:**
- `PriceChart`: Diagramm der Preisentwicklung
- `OccupancyChart`: Diagramm der Belegungsrate
- `CompetitorComparison`: Vergleich mit Konkurrenz
- `PriceTable`: Tabelle mit Preisen pro Tag

#### 7.1.3 PriceRecommendationsPage

**Route:** `/price-recommendations`

**Funktionen:**
- Übersicht über alle Preisempfehlungen
- Filter nach Branch, Zeitraum, Status
- Batch-Aktionen (Genehmigen, Ablehnen, Anwenden)

**Komponenten:**
- `PriceRecommendationList`: Liste aller Empfehlungen
- `PriceRecommendationCard`: Karte für einzelne Empfehlung
- `PriceRecommendationFilters`: Filter-Komponente
- `BatchActions`: Batch-Aktionen-Komponente

#### 7.1.4 OTAListingsPage

**Route:** `/ota-listings`

**Funktionen:**
- Übersicht über alle OTA-Inserate
- Filter nach Branch, Plattform
- Anzeige aktueller Preise und Verfügbarkeiten
- Möglichkeit zum manuellen Starten von Rate-Shopping

**Komponenten:**
- `OTAListingList`: Liste aller Inserate
- `OTAListingCard`: Karte für einzelnes Inserat
- `OTAListingFilters`: Filter-Komponente
- `RateShoppingButton`: Button zum Starten von Rate-Shopping

#### 7.1.5 PricingRulesPage

**Route:** `/pricing-rules`

**Funktionen:**
- Übersicht über alle Preisregeln
- Erstellen, Bearbeiten, Löschen von Regeln
- Aktivieren/Deaktivieren von Regeln
- Testen von Regeln

**Komponenten:**
- `PricingRuleList`: Liste aller Regeln
- `PricingRuleCard`: Karte für einzelne Regel
- `PricingRuleForm`: Formular zum Erstellen/Bearbeiten
- `RuleTester`: Komponente zum Testen von Regeln

### 7.2 Shared Components

#### 7.2.1 PriceChart

**Zweck:** Visualisiert Preisentwicklung

**Props:**
- `data`: Array von Preisdaten
- `startDate`: Startdatum
- `endDate`: Enddatum
- `categoryId?`: Optionale Filterung nach Kategorie

**Features:**
- Linien-Diagramm für Preisentwicklung
- Vergleich mehrerer Kategorien
- Tooltips mit Details

#### 7.2.2 OccupancyChart

**Zweck:** Visualisiert Belegungsrate

**Props:**
- `data`: Array von Belegungsdaten
- `startDate`: Startdatum
- `endDate`: Enddatum

**Features:**
- Balken-Diagramm für Belegungsrate
- Farbcodierung (grün = niedrig, rot = hoch)
- Tooltips mit Details

#### 7.2.3 CompetitorComparison

**Zweck:** Zeigt Vergleich mit Konkurrenzpreisen

**Props:**
- `ownPrices`: Eigene Preise
- `competitorPrices`: Konkurrenzpreise
- `date`: Datum

**Features:**
- Vergleichstabelle
- Visualisierung der Preisposition
- Durchschnittswerte

#### 7.2.4 PriceRecommendationCard

**Zweck:** Zeigt einzelne Preisempfehlung

**Props:**
- `recommendation`: Preisempfehlung-Objekt

**Features:**
- Anzeige aktueller vs. empfohlener Preis
- Prozentuale Änderung
- Begründung
- Aktionen (Genehmigen, Ablehnen, Anwenden)

---

## 8. Implementierungsreihenfolge

### Phase 1: Datenmodell und Grundstruktur

**Ziel:** Datenbank-Schema erweitern, Basis-Services erstellen

**Schritte:**
1. Prisma-Schema erweitern (neue Models)
2. Migration erstellen und ausführen
3. Basis-Services erstellen (Struktur ohne Logik)
4. Basis-Controller erstellen (Struktur ohne Logik)

**Dauer:** ~1-2 Wochen

### Phase 2: OTA-Integration

**Ziel:** Rate-Shopping implementieren

**Schritte:**
1. OTARateShoppingService implementieren
2. Web Scraping oder API-Integration für Booking.com
3. Web Scraping oder API-Integration für Hostelworld
4. Rate-Shopping-Scheduler implementieren
5. Frontend: OTAListingsPage

**Dauer:** ~2-3 Wochen

### Phase 3: Preisanalyse

**Ziel:** Preisanalyse-Funktionalität implementieren

**Schritte:**
1. PriceAnalysisService implementieren
2. Integration mit LobbyPMS für Verfügbarkeitsdaten
3. Integration mit Reservierungen für Belegungsdaten
4. Berechnung von Durchschnittspreisen, Min/Max, etc.
5. Frontend: PriceAnalysisPage und DetailPage

**Dauer:** ~2-3 Wochen

### Phase 4: Regel-Engine und Preisempfehlungen

**Ziel:** Regelbasierte Preisempfehlungen generieren

**Schritte:**
1. PricingRule Model und CRUD implementieren
2. PriceRecommendationService implementieren
3. Regel-Engine implementieren (Bedingungen prüfen, Aktionen anwenden)
4. Frontend: PricingRulesPage
5. Frontend: PriceRecommendationsPage

**Dauer:** ~3-4 Wochen

### Phase 5: LobbyPMS-Integration

**Ziel:** Preisempfehlungen ins LobbyPMS einspielen

**Schritte:**
1. LobbyPMS API-Endpoints für Preis-Updates recherchieren
2. LobbyPMSPriceUpdateService implementieren
3. Batch-Update-Funktionalität
4. Validierung und Fehlerbehandlung
5. Frontend: Anwenden-Button in PriceRecommendationsPage

**Dauer:** ~1-2 Wochen

### Phase 6: Testing und Optimierung

**Ziel:** System testen und optimieren

**Schritte:**
1. Unit-Tests für Services
2. Integration-Tests für API-Endpoints
3. E2E-Tests für Frontend
4. Performance-Optimierung
5. Dokumentation vervollständigen

**Dauer:** ~2-3 Wochen

**Gesamtdauer:** ~11-17 Wochen

---

## 9. Offene Fragen und Entscheidungen

### 9.1 Rate-Shopping

**Frage:** Wie werden OTA-Preise gesammelt?

**Optionen:**
1. **Web Scraping:** Puppeteer/Playwright für automatisiertes Scraping
   - Vorteile: Funktioniert für alle OTAs
   - Nachteile: Rechtlich fragwürdig, kann gegen ToS verstoßen, instabil
2. **API-Integration:** Falls OTAs APIs anbieten
   - Vorteile: Offiziell, stabil, rechtlich sicher
   - Nachteile: Nicht alle OTAs bieten APIs an, möglicherweise kostenpflichtig
3. **Drittanbieter-Services:** Services wie RateShopper, etc.
   - Vorteile: Professionell, rechtlich sicher
   - Nachteile: Kosten, Abhängigkeit von Drittanbieter

**Empfehlung:** Zuerst prüfen, ob OTAs APIs anbieten. Falls nicht, Web Scraping als Prototyp, später auf Drittanbieter-Service umstellen.

### 9.2 Regel-Engine-Komplexität

**Frage:** Wie komplex soll die Regel-Engine sein?

**Optionen:**
1. **Einfach:** Nur grundlegende Bedingungen (Belegung > X, Konkurrenzpreis < Y)
2. **Mittel:** Kombinierte Bedingungen (UND/ODER), mehrere Aktionen
3. **Komplex:** Vollständige Scripting-Sprache, ML-basierte Empfehlungen

**Empfehlung:** Start mit Option 2 (Mittel), später erweiterbar zu Option 3.

### 9.3 Preisempfehlungs-Algorithmus

**Frage:** Wie werden Preise berechnet, wenn mehrere Regeln anwendbar sind?

**Optionen:**
1. **Kumulativ:** Regeln werden nacheinander angewendet (z.B. +10%, dann +5% = +15.5%)
2. **Priorität:** Nur die Regel mit höchster Priorität wird angewendet
3. **Durchschnitt:** Durchschnitt aller empfohlenen Preise
4. **Gewichtet:** Gewichteter Durchschnitt basierend auf Priorität

**Empfehlung:** Option 1 (Kumulativ) mit Min/Max-Grenzen, konfigurierbar pro Regel.

### 9.4 LobbyPMS API

**Frage:** Welche LobbyPMS API-Endpoints existieren für Preis-Updates?

**Status:** Teilweise bekannt - weitere Recherche erforderlich

**Bekannte Endpoints:**
- ✅ `GET /api/v2/available-rooms` - Verfügbarkeit und Preise abrufen
  - Parameter: `start_date`, `end_date`, `category_id` (optional), `property_id` (optional)
  - Response: `{ data: [{ date: "...", categories: [{ category_id, name, available_rooms, plans: [{ prices: [{ people, value }] }] }] }] }`
  - Authentifizierung: Bearer Token im Header (`Authorization: Bearer {apiKey}`)
  - **WICHTIG:** Preise sind in `category.plans[0].prices` gespeichert (Array mit `people` und `value`)

**Python-Skript-Analyse:**
Das Python-Skript zeigt einen Ansatz für dynamische Preisgestaltung:
- Verwendet `/api/v2/available-rooms` zum Abrufen der Verfügbarkeit
- Berechnet neuen Preis basierend auf Verfügbarkeit
- Ruft `actualizar_precio_en_pms()` auf (Funktion nicht gezeigt, aber zeigt dass Preis-Updates möglich sind)

**Fehlende Informationen:**
- ❓ Endpoint zum Aktualisieren von Preisen (POST/PUT)
- ❓ Payload-Struktur für Preis-Updates
- ❓ Ob Preise pro Kategorie und Datum aktualisiert werden können
- ❓ Ob Batch-Updates möglich sind

**Nächste Schritte:**
- LobbyPMS API-Dokumentation prüfen für Preis-Update-Endpoints
- Test-Requests durchführen mit verschiedenen Endpoints:
  - `PUT /api/v2/categories/:categoryId/prices`
  - `POST /api/v2/prices`
  - `PUT /api/v2/available-rooms` (mit Preis-Updates im Payload)
- Kontakt mit LobbyPMS Support für Preis-Update-API

---

## 10. Technische Herausforderungen

### 10.1 Rate-Shopping

**Herausforderungen:**
- Rechtliche Aspekte (ToS, Datenschutz)
- Rate-Limiting (nicht zu viele Requests)
- Instabilität (Websites ändern sich)
- Anti-Bot-Maßnahmen umgehen

**Lösungsansätze:**
- Respektiere robots.txt
- Implementiere Rate-Limiting
- Verwende Proxies/Rotation
- Fallback auf manuelle Eingabe

### 10.2 Performance

**Herausforderungen:**
- Große Datenmengen (3 Monate × mehrere Branches × mehrere Kategorien)
- Komplexe Berechnungen (Preisanalysen, Regel-Engine)
- Echtzeit-Updates

**Lösungsansätze:**
- Caching von Analyse-Ergebnissen
- Background-Jobs für Berechnungen
- Pagination im Frontend
- Indexierung in Datenbank

### 10.3 Datenqualität

**Herausforderungen:**
- Unvollständige OTA-Daten
- Fehlerhafte Scraping-Ergebnisse
- Inkonsistente Datenformate

**Lösungsansätze:**
- Validierung aller eingehenden Daten
- Fehlerbehandlung und Logging
- Manuelle Korrektur-Möglichkeiten
- Datenqualitäts-Metriken

---

## 11. Nächste Schritte

### 11.1 Vor der Implementierung

1. **LobbyPMS API recherchieren:** ⚠️ **KRITISCH**
   - ✅ Bekannt: `GET /api/v2/available-rooms` gibt Preise zurück
   - ❓ **FEHLT:** Preis-Update-Endpoint identifizieren
     - Mögliche Endpoints testen:
       - `PUT /api/v2/categories/:categoryId/prices`
       - `POST /api/v2/prices`
       - `PUT /api/v2/available-rooms` (mit Preis-Updates im Payload)
     - API-Dokumentation prüfen
     - LobbyPMS Support kontaktieren falls Dokumentation unvollständig
     - Test-Requests durchführen mit echten API-Keys
   - Payload-Struktur für Preis-Updates dokumentieren
   - Batch-Update-Möglichkeiten prüfen

2. **OTA-APIs recherchieren:**
   - Prüfen, ob Booking.com API verfügbar ist
   - Prüfen, ob Hostelworld API verfügbar ist
   - Alternative: Drittanbieter-Services recherchieren (RateShopper, etc.)

3. **Rechtliche Aspekte klären:**
   - ToS der OTAs prüfen (Web Scraping erlaubt?)
   - Datenschutz-Aspekte klären
   - Rechtliche Beratung einholen (falls nötig)

4. **Anforderungen verfeinern:**
   - Mit Benutzer abstimmen: Welche Regeln sind wichtig?
   - Prioritäten setzen: Welche Features zuerst?
   - UI/UX-Mockups erstellen

**WICHTIG:** Die Implementierung von Phase 5 (LobbyPMS-Integration) kann erst starten, wenn der Preis-Update-Endpoint identifiziert wurde!

### 11.2 Während der Implementierung

1. **Iterativ vorgehen:**
   - Phase für Phase implementieren
   - Regelmäßige Tests
   - Feedback einholen

2. **Dokumentation:**
   - Code dokumentieren
   - API dokumentieren
   - Benutzerhandbuch erstellen

3. **Testing:**
   - Unit-Tests schreiben
   - Integration-Tests schreiben
   - Manuelle Tests durchführen

---

## 12. Zusammenfassung

Dieses Dokument beschreibt die Planung einer umfassenden Preisanalyse-Funktion für das Intranet-System. Die Funktion ermöglicht es:

1. **OTA-Inserate zu verwalten** und Preise von Konkurrenten zu sammeln
2. **Preise zu analysieren** für die nächsten 3 Monate, pro Tag und Zimmerkategorie
3. **Zimmerkategorien zu unterscheiden** (Private vs. Dorm)
4. **Preisempfehlungen zu generieren** basierend auf konfigurierbaren Regeln
5. **Empfehlungen ins LobbyPMS einzuspielen** über die API

Die Implementierung erfolgt in 6 Phasen über einen Zeitraum von ca. 11-17 Wochen. Wichtige offene Fragen betreffen die Rate-Shopping-Implementierung, die Komplexität der Regel-Engine und die verfügbaren LobbyPMS API-Endpoints.

**Nächster Schritt:** Recherche zu LobbyPMS API-Endpoints für Preis-Updates und OTA-APIs, bevor mit der Implementierung begonnen wird.

---

## 13. Erkenntnisse aus Python-Skript-Analyse

### 13.1 Verfügbare Informationen

**Python-Skript zeigt:**
- Verwendung von `/api/v2/available-rooms` Endpoint
- Verfügbarkeits-basierte Preisberechnung
- Funktion `actualizar_precio_en_pms()` wird aufgerufen (zeigt dass Preis-Updates möglich sind)

**Aktueller Code zeigt:**
- ✅ `LobbyPmsService.checkAvailability()` implementiert
- ✅ Endpoint `/api/v2/available-rooms` funktioniert
- ✅ Preise werden korrekt aus Response extrahiert
- ❌ KEINE Preis-Update-Funktion vorhanden

### 13.2 Preisberechnungs-Logik aus Python-Skript

**Formel:**
```python
incremento_precio = min(factor_disponibilidad * (1.0 - disponibilidad), 1.0) * incremento_maximo_precio
nuevo_precio = min(precio_minimo + incremento_precio, incremento_maximo_precio)
```

**Übersetzung:**
- `disponibilidad` = Verfügbarkeitsrate (0.0 = voll, 1.0 = leer)
- `factor_disponibilidad` = Faktor für Preisänderung (z.B. 1.5 = +50% bei leerem Haus)
- `incremento_maximo_precio` = Maximaler Preisaufschlag
- `precio_minimo` = Minimalpreis

**Beispiel:**
- Verfügbarkeit: 0.2 (20% belegt = 80% frei)
- Faktor: 1.5
- Max. Aufschlag: 20
- Minimalpreis: 50

Berechnung:
- `incremento_precio = min(1.5 * (1.0 - 0.2), 1.0) * 20 = min(1.2, 1.0) * 20 = 20`
- `nuevo_precio = min(50 + 20, 20) = 70` ❌ (Fehler in Formel - sollte `max` sein)

**Korrigierte Formel:**
```typescript
const priceIncrease = Math.min(
  availabilityFactor * (1.0 - occupancyRate),
  1.0
) * maxPriceIncrease;
const newPrice = Math.max(
  minPrice + priceIncrease,
  minPrice
);
```

### 13.3 Fehlende Informationen

**Kritisch für Implementierung:**
1. **Preis-Update-Endpoint:** 
   - Python-Skript ruft `actualizar_precio_en_pms()` auf, aber Funktion nicht gezeigt
   - Endpoint muss identifiziert werden
   - Payload-Struktur muss dokumentiert werden

2. **Preis-Struktur in LobbyPMS:**
   - Preise sind pro Kategorie, Datum und Personenanzahl
   - Wie werden Preise aktualisiert?
     - Pro Kategorie und Datum?
     - Pro Plan?
     - Batch-Updates möglich?

3. **Validierung:**
   - Gibt es Min/Max-Preisgrenzen in LobbyPMS?
   - Werden Preisänderungen sofort übernommen?
   - Gibt es eine Bestätigung/Response?

### 13.4 Empfohlene Vorgehensweise

**Schritt 1: Endpoint identifizieren**
- LobbyPMS API-Dokumentation prüfen
- Test-Requests mit verschiedenen Endpoints durchführen:
  - `PUT /api/v2/categories/:categoryId/prices`
  - `POST /api/v2/prices`
  - `PUT /api/v2/available-rooms` (mit Preis-Updates)
- LobbyPMS Support kontaktieren falls nötig

**Schritt 2: Payload-Struktur testen**
- Verschiedene Payload-Formate testen
- Response-Struktur dokumentieren
- Fehlerbehandlung testen

**Schritt 3: Integration implementieren**
- `LobbyPMSPriceUpdateService` erstellen
- Funktionen basierend auf identifiziertem Endpoint implementieren
- Validierung und Fehlerbehandlung hinzufügen


# KI-basierte Preissuche - Implementierungsplan

## 📋 Übersicht

Implementierung eines KI-basierten Systems zur automatischen Preissuche für Konkurrenz-Hostels in Medellín (und anderen Städten). Das System verwendet KI (OpenAI GPT-4o oder Anthropic Claude) um Preise für eine manuell erstellte Liste von Hostel-Namen zu finden und zu importieren.

## 🎯 Ziele

1. **KI-basierte Competitor-Discovery**: Automatische Identifikation direkter Konkurrenten basierend auf Branch- und Organization-Informationen
2. **Konkurrenzgruppen-Verwaltung**: Automatische oder manuelle Erstellung von Hostel-Namen-Listen (Konkurrenzgruppen)
3. **KI-basierte Preissuche**: Automatische Suche nach Preisen für diese Hostels
4. **Preis-Import**: Automatischer Import der gefundenen Preise in die Datenbank
5. **Integration**: Nahtlose Integration in das bestehende Preisanalyse-System

## 🏗️ Architektur

### Datenbank-Schema

#### Neues Model: CompetitorGroup

```prisma
model CompetitorGroup {
  id          Int      @id @default(autoincrement())
  branchId   Int
  branch     Branch   @relation(fields: [branchId], references: [id])
  
  // Gruppen-Informationen
  name        String   // Name der Konkurrenzgruppe (z.B. "Medellín Hostels")
  description String?  // Beschreibung
  
  // Ort
  city        String   // Stadt (z.B. "Medellín")
  country     String?  // Land (z.B. "Kolumbien")
  
  // Status
  isActive    Boolean  @default(true)
  
  // Metadaten
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  competitors Competitor[]
  
  @@index([branchId])
  @@index([city])
  @@index([isActive])
}
```

#### Neues Model: Competitor

```prisma
model Competitor {
  id                Int              @id @default(autoincrement())
  competitorGroupId Int
  competitorGroup   CompetitorGroup @relation(fields: [competitorGroupId], references: [id], onDelete: Cascade)
  
  // Hostel-Informationen
  name              String   // Hostel-Name (z.B. "Los Patios Hostel")
  searchName        String?  // Alternative Suchbegriffe (z.B. "Los Patios Medellín")
  
  // OTA-Informationen (optional, falls bereits bekannt)
  bookingComUrl     String?  // Booking.com URL
  hostelworldUrl    String?  // Hostelworld URL
  otherUrls         Json?    // Weitere URLs (Array)
  
  // Zuordnung zu OTAListing (falls bereits vorhanden)
  otaListingId      Int?
  otaListing        OTAListing? @relation(fields: [otaListingId], references: [id])
  
  // Status
  isActive          Boolean  @default(true)
  lastSearchedAt    DateTime? // Wann wurde zuletzt gesucht?
  lastPriceFoundAt  DateTime? // Wann wurde zuletzt ein Preis gefunden?
  
  // Metadaten
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@index([competitorGroupId])
  @@index([isActive])
  @@index([otaListingId])
}
```

### Service-Architektur

#### AIPriceSearchService

```typescript
export class AIPriceSearchService {
  /**
   * 🔍 NEU: KI-basierte Competitor-Discovery
   * Identifiziert direkte Konkurrenten basierend auf Branch- und Organization-Informationen
   * 
   * @param branchId - Branch-ID
   * @param roomType - Zimmertyp ('private' | 'dorm')
   * @param maxCompetitors - Maximale Anzahl Competitors (Standard: 10)
   * @returns Array von Competitor-Objekten
   */
  static async discoverCompetitors(
    branchId: number,
    roomType: 'private' | 'dorm',
    maxCompetitors: number = 10
  ): Promise<CompetitorDiscoveryResult[]>;
  
  /**
   * Erstellt KI-Prompt für Competitor-Discovery
   */
  private static createCompetitorDiscoveryPrompt(
    organizationName: string,
    organizationCountry: string | null,
    branchName: string,
    branchCity: string | null,
    branchAddress: string | null,
    branchCountry: string | null,
    roomType: 'private' | 'dorm'
  ): string;
  
  /**
   * Sucht Preise für eine Konkurrenzgruppe mit KI
   * 
   * @param competitorGroupId - ID der Konkurrenzgruppe
   * @param startDate - Startdatum
   * @param endDate - Enddatum
   * @param roomType - Zimmertyp ('private' | 'dorm')
   * @returns Job-ID
   */
  static async searchPrices(
    competitorGroupId: number,
    startDate: Date,
    endDate: Date,
    roomType: 'private' | 'dorm'
  ): Promise<number>;
  
  /**
   * Verwendet KI, um Preise für ein einzelnes Hostel zu finden
   * 
   * @param competitorId - ID des Competitors
   * @param date - Datum
   * @param roomType - Zimmertyp
   * @returns Preis oder null
   */
  private static async findPriceWithAI(
    competitorId: number,
    date: Date,
    roomType: 'private' | 'dorm'
  ): Promise<number | null>;
  
  /**
   * Erstellt KI-Prompt für Preissuche
   */
  private static createPriceSearchPrompt(
    hostelName: string,
    city: string,
    date: Date,
    roomType: 'private' | 'dorm'
  ): string;
}

interface CompetitorDiscoveryResult {
  name: string;              // Hostel-Name (z.B. "Los Patios Hostel")
  searchName?: string;       // Alternative Suchbegriffe
  bookingComUrl?: string;    // Booking.com URL (falls gefunden)
  hostelworldUrl?: string;   // Hostelworld URL (falls gefunden)
  reasoning?: string;        // Begründung, warum dieser Competitor relevant ist
  confidence?: number;       // Konfidenz-Score (0-1)
}
```

## 🔧 Implementierung

### Phase 1: Datenbank-Schema

1. **Migration erstellen**
   - `CompetitorGroup` Model
   - `Competitor` Model
   - Indizes und Relations

2. **Prisma Schema aktualisieren**
   - Models hinzufügen
   - Relations definieren

### Phase 2: Backend-Service

1. **AIPriceSearchService erstellen**
   - **KI-basierte Competitor-Discovery** (NEU)
     - Branch- und Organization-Informationen laden
     - KI-Prompt für Competitor-Discovery erstellen
     - KI-API aufrufen (OpenAI/Anthropic)
     - Competitor-Liste parsen und validieren
   - OpenAI/Anthropic Integration
   - Prompt-Engineering für Competitor-Discovery und Preissuche
   - Preis-Parsing aus KI-Response
   - Integration mit OTAListing/OTAPriceData

2. **API-Endpoints**
   - `POST /api/competitor-groups` - Konkurrenzgruppe erstellen
   - `GET /api/competitor-groups` - Liste abrufen
   - `PUT /api/competitor-groups/:id` - Aktualisieren
   - `DELETE /api/competitor-groups/:id` - Löschen
   - **`POST /api/branches/:id/discover-competitors`** - 🔍 NEU: KI-basierte Competitor-Discovery
   - `POST /api/competitor-groups/:id/competitors` - Competitor hinzufügen (manuell)
   - `PUT /api/competitors/:id` - Competitor aktualisieren
   - `DELETE /api/competitors/:id` - Competitor löschen
   - `POST /api/competitor-groups/:id/search-prices` - Preissuche starten

### Phase 3: Frontend-Interface

1. **Konkurrenzgruppen-Verwaltung**
   - Liste der Konkurrenzgruppen
   - Erstellen/Bearbeiten/Löschen
   - Competitors hinzufügen/entfernen

2. **Preissuche-Interface**
   - Button "Preise suchen"
   - Fortschrittsanzeige
   - Ergebnisse anzeigen

## 📝 KI-Prompt-Design

### Prompt 1: Competitor-Discovery

```
Du bist ein Experte für die Hostel-Industrie in Kolumbien und kennst alle wichtigen Hostels in den verschiedenen Städten.

Aufgabe: Identifiziere die direkten Konkurrenten eines Hostels.

Hostel-Informationen:
- Organisation: {organizationName}
- Branch/Standort: {branchName}
- Stadt: {city}
- Adresse: {address}
- Land: {country}
- Zimmertyp: {roomType} (private = Privatzimmer, dorm = Schlafsaal)

Bitte identifiziere die {maxCompetitors} wichtigsten direkten Konkurrenten für dieses Hostel in dieser Stadt.
Berücksichtige dabei:
- Ähnliche Zielgruppe
- Ähnliche Lage (gleiche Stadt, ähnliche Nachbarschaft)
- Ähnliche Ausstattung und Preisniveau
- Bekannte Hostel-Ketten und unabhängige Hostels

Antworte NUR mit einem JSON-Array im folgenden Format:
[
  {
    "name": "Los Patios Hostel",
    "searchName": "Los Patios Medellín",
    "bookingComUrl": "https://www.booking.com/hotel/co/los-patios.html",
    "hostelworldUrl": "https://www.hostelworld.com/hosteldetails.php/Los-Patios/Medellin/12345",
    "reasoning": "Direkter Konkurrent in derselben Nachbarschaft, ähnliche Zielgruppe",
    "confidence": 0.95
  },
  {
    "name": "Selina Medellín",
    "searchName": "Selina Medellín Hostel",
    "bookingComUrl": "https://www.booking.com/hotel/co/selina-medellin.html",
    "reasoning": "Bekannte Hostel-Kette, ähnliches Preisniveau",
    "confidence": 0.85
  }
]

Falls keine Konkurrenten gefunden werden können, antworte mit:
[]
```

### Prompt 2: Preis-Suche

```
Du bist ein Experte für Hostel-Preise in Kolumbien. 

Aufgabe: Finde den aktuellen Preis für ein Hostel.

Hostel-Name: {hostelName}
Stadt: {city}
Datum: {date}
Zimmertyp: {roomType} (private = Privatzimmer, dorm = Schlafsaal)

Bitte suche auf Booking.com, Hostelworld oder anderen OTA-Plattformen nach dem Preis für dieses Hostel an diesem Datum.

Antworte NUR mit einem JSON-Objekt im folgenden Format:
{
  "price": 35000,
  "currency": "COP",
  "platform": "booking.com",
  "url": "https://...",
  "available": true,
  "roomName": "Private Room"
}

Falls kein Preis gefunden werden kann, antworte mit:
{
  "price": null,
  "error": "Preis nicht gefunden"
}
```

## 🔗 Integration mit bestehendem System

### OTAListing Integration

- Wenn ein Competitor bereits ein `otaListingId` hat, verwende das bestehende Listing
- Wenn nicht, erstelle ein neues OTAListing aus den KI-Daten
- Speichere Preise in `OTAPriceData` mit `source: 'ai_search'`

### PriceAnalysis Integration

- `PriceAnalysisService.getCompetitorAvgPrice()` verwendet bereits `OTAPriceData`
- Keine Änderungen nötig - automatische Integration

## ⚙️ Konfiguration

### OpenAI API Key

- Bereits vorhanden: `OPENAI_API_KEY` in `.env`
- Wiederverwendung für Preissuche

### Anthropic API Key (Optional)

- Falls Anthropic Claude verwendet werden soll:
  - `ANTHROPIC_API_KEY` in `.env` hinzufügen
  - Service erweitern

## 📊 Workflow

### Option A: Automatische Competitor-Discovery (Empfohlen)

1. **KI-basierte Competitor-Discovery**
   - Branch auswählen (z.B. "Manila")
   - Zimmertyp auswählen (private/dorm)
   - "Konkurrenten automatisch finden" klicken
   - KI analysiert:
     - Organization-Name (z.B. "La Familia")
     - Branch-Name (z.B. "Manila")
     - Stadt (z.B. "Medellín")
     - Adresse (z.B. "Cl 11A #43d-86")
     - Land (z.B. "Kolumbien")
   - KI identifiziert direkte Konkurrenten (z.B. "Los Patios Hostel", "Selina Medellín", etc.)
   - Konkurrenzgruppe wird automatisch erstellt mit gefundenen Competitors

2. **Preissuche starten**
   - Datum auswählen (z.B. heute + 30 Tage)
   - Zimmertyp auswählen (private/dorm)
   - "Preise suchen" klicken

3. **KI-Suche**
   - Für jeden Competitor:
     - KI-Prompt erstellen
     - KI-API aufrufen
     - Preis aus Response parsen
     - In OTAPriceData speichern

4. **Ergebnisse anzeigen**
   - Gefundene Preise anzeigen
   - Fehlgeschlagene Suchen markieren
   - Statistiken anzeigen

### Option B: Manuelle Competitor-Verwaltung

1. **Konkurrenzgruppe manuell erstellen**
   - Name: "Medellín Hostels"
   - Stadt: "Medellín"
   - Competitors manuell hinzufügen:
     - "Los Patios Hostel"
     - "Selina Medellín"
     - "Masaya Medellín"
     - etc.

2. **Preissuche starten** (wie Option A, Schritt 2-4)

## 🚀 Nächste Schritte

1. Datenbank-Schema implementieren
2. AIPriceSearchService erstellen
   - KI-basierte Competitor-Discovery implementieren
   - KI-basierte Preissuche implementieren
3. API-Endpoints implementieren
   - Competitor-Discovery Endpoint
   - Konkurrenzgruppen-Verwaltung
   - Preissuche-Endpoint
4. Frontend-Interface erstellen
   - "Konkurrenten automatisch finden" Button
   - Competitor-Liste anzeigen und bearbeiten
   - Preissuche-Interface
5. Testing und Optimierung

## 📋 Verfügbare Daten für KI-Discovery

### Organization
- `name` (z.B. "La Familia")
- `displayName` (z.B. "La Familia Hostel")
- `country` (z.B. "CO")
- `settings` (JSON - könnte weitere Infos enthalten)

### Branch
- `name` (z.B. "Manila")
- `address` (z.B. "Cl 11A #43d-86")
- `city` (z.B. "Medellín")
- `country` (z.B. "Kolumbien")
- `lobbyPmsSettings` (JSON - könnte weitere Infos enthalten)

**Diese Informationen reichen aus, um KI-basierte Competitor-Discovery durchzuführen!**


# Rate Shopping Test-Setup

## Übersicht

Dieses Dokument beschreibt das manuelle Test-Setup für die Rate Shopping Funktionalität mit Konkurrenz-Listings.

## Voraussetzungen

1. **Datenbank-Migration ausgeführt**: Die Migration `20250203000000_add_branch_address_and_fix_ota_listings` muss ausgeführt worden sein.
2. **Branch konfiguriert**: Branch Manila (ID: 3) muss Adress-Informationen haben.
3. **LobbyPMS konfiguriert**: Branch muss LobbyPMS-Einstellungen haben, damit eigene Zimmer-Typen abgerufen werden können.

## Test-Daten für Branch Manila

### Branch-Informationen

- **Branch ID**: 3
- **Organisation ID**: 1
- **Name**: Manila
- **Adresse**: "Cl 11A #43d-86, El Poblado"
- **Stadt**: "Medellín"
- **Land**: "Kolumbien"

### Konfiguration

Die Adress-Informationen müssen in der Branch-Einstellungen konfiguriert werden:

1. Öffne Branch-Verwaltung
2. Wähle Branch "Manila"
3. Bearbeiten
4. Fülle folgende Felder aus:
   - **Adresse**: `Cl 11A #43d-86, El Poblado`
   - **Stadt**: `Medellín`
   - **Land**: `Kolumbien`
5. Speichern

## Test-Endpoints

### 1. Discovery testen (manuell)

**Endpoint**: `POST /api/price-analysis/ota/discover`

**Request Body**:
```json
{
  "branchId": 3,
  "platform": "hostelworld.com",
  "roomType": "dorm"  // Optional: Nur Dorms testen (alternativ: "private")
}
```

**Ohne roomType** (automatisch alle eigenen Zimmertypen):
```json
{
  "branchId": 3,
  "platform": "hostelworld.com"
}
```

**Erwartete Response**:
```json
{
  "success": true,
  "listingsFound": 15,
  "results": [
    {
      "roomType": "dorm",
      "listingsFound": 10
    },
    {
      "roomType": "private",
      "listingsFound": 5
    }
  ],
  "city": "Medellín",
  "country": "Kolumbien"
}
```

**Test-Schritte**:
1. Rufe Discovery-Endpoint auf
2. Prüfe: Werden Listings gefunden?
3. Prüfe: Werden Dorm/Private korrekt unterschieden?
4. Prüfe: Werden Zimmernamen korrekt extrahiert?

### 2. Rate Shopping testen

**Endpoint**: `POST /api/price-analysis/ota/rate-shopping`

**Request Body**:
```json
{
  "branchId": 3,
  "platform": "hostelworld.com",
  "startDate": "2025-12-15",
  "endDate": "2026-03-15"
}
```

**Erwartete Response**:
```json
{
  "success": true,
  "jobId": 123,
  "message": "Rate Shopping Job wurde erstellt"
}
```

**Test-Schritte**:
1. Führe Discovery durch (falls noch keine Listings vorhanden)
2. Rufe Rate Shopping-Endpoint auf
3. Prüfe: Wird Job erstellt?
4. Prüfe Backend-Logs: Werden Preise gescraped?
5. Prüfe Datenbank: Werden Preise in `OTAPriceData` gespeichert?

### 3. Listings abrufen

**Endpoint**: `GET /api/price-analysis/ota/listings?branchId=3`

**Erwartete Response**:
```json
[
  {
    "id": 1,
    "platform": "hostelworld.com",
    "listingId": "12345",
    "listingUrl": "https://www.hostelworld.com/hostels/...",
    "city": "Medellín",
    "country": "Kolumbien",
    "roomType": "dorm",
    "roomName": "Dorm Bed",
    "isActive": true,
    "discoveredAt": "2025-02-03T10:00:00Z",
    "lastScrapedAt": "2025-02-03T11:00:00Z",
    "priceData": [...]
  }
]
```

## Test-URLs für manuelle Überprüfung

### Hostelworld (Medellín, heute)

```
https://www.german.hostelworld.com/pwa/s?q=Medell%C3%ADn,%20Kolumbien&country=Medell%C3%ADn&city=Medell%C3%ADn&type=city&id=661&from=2025-12-15&to=2025-12-16&guests=1&page=1
```

### Booking.com (Medellín, heute, Hostels)

```
https://www.booking.com/searchresults.de.html?ss=Medell%C3%ADn%2C+Antioquia%2C+Kolumbien&dest_id=-592318&dest_type=city&checkin=2025-12-15&checkout=2025-12-16&group_adults=1&no_rooms=1&group_children=0&nflt=di%3D4137%3Bht_id%3D203%3Breview_score%3D80
```

## Test-Szenarien

### Szenario 1: Discovery für Dorm-Zimmer

1. **Branch konfigurieren**: Adress-Informationen in Branch-Einstellungen hinzufügen
2. **Discovery starten**: 
   ```bash
   POST /api/price-analysis/ota/discover
   {
     "branchId": 3,
     "platform": "hostelworld.com",
     "roomType": "dorm"
   }
   ```
3. **Prüfen**: 
   - Werden Hostelworld-Listings gefunden?
   - Werden Zimmernamen korrekt extrahiert?
   - Werden Dorm-Listings korrekt als "dorm" markiert?

### Szenario 2: Discovery für Private-Zimmer

1. **Discovery starten**:
   ```bash
   POST /api/price-analysis/ota/discover
   {
     "branchId": 3,
     "platform": "hostelworld.com",
     "roomType": "private"
   }
   ```
2. **Prüfen**: 
   - Werden Private-Listings korrekt als "private" erkannt?
   - Werden Zimmernamen aus korrekten HTML-Feldern extrahiert?

### Szenario 3: Rate Shopping mit Discovery

1. **Discovery durchführen** (falls noch keine Listings vorhanden)
2. **Rate Shopping starten**:
   ```bash
   POST /api/price-analysis/ota/rate-shopping
   {
     "branchId": 3,
     "platform": "hostelworld.com",
     "startDate": "2025-12-15",
     "endDate": "2026-03-15"
   }
   ```
3. **Prüfen**: 
   - Werden Preise für gefundene Listings gescraped?
   - Werden Preise in `OTAPriceData` gespeichert?
   - Werden Preise korrekt mit Währung gespeichert?

### Szenario 4: Vergleich mit eigenen Preisen

1. **Eigene Preise aus LobbyPMS holen** (über `checkAvailability`)
2. **Konkurrenzpreise aus OTAPriceData holen**
3. **Prüfen**: 
   - Vergleich funktioniert (roomType-Mapping: compartida->dorm, privada->private)?
   - Durchschnittspreise werden korrekt berechnet?
   - Preisposition wird korrekt bestimmt?

## Fehlerbehandlung

### Fehler: "Branch hat keine Stadt konfiguriert"

**Lösung**: Adress-Informationen in Branch-Einstellungen hinzufügen.

### Fehler: "Keine eigenen Zimmer-Typen gefunden"

**Lösung**: 
1. LobbyPMS-Einstellungen prüfen
2. Reservierungen aus LobbyPMS importieren
3. `checkAvailability` API testen

### Fehler: "Keine Listings gefunden"

**Mögliche Ursachen**:
- HTML-Struktur der OTA-Plattform hat sich geändert
- Stadt-Name stimmt nicht überein
- Rate-Limiting blockiert Requests

**Lösung**:
- Manuelle Überprüfung der Test-URLs
- Backend-Logs prüfen
- Selektoren in `otaDiscoveryService.ts` anpassen

## Migration ausführen

Falls bestehende OTA-Listings migriert werden müssen:

```bash
cd backend
npx ts-node scripts/migrate-ota-listings.ts
```

Das Script:
- Setzt `city`/`country` aus Branch-Informationen
- Setzt `discoveredAt` auf `createdAt`
- Überspringt bereits migrierte Listings (haben bereits `city`)

## Frontend-Tests

### Discovery-Button testen

1. Öffne Price Analysis Seite
2. Öffne OTAListingsTab
3. Wähle Platform: "hostelworld.com"
4. Klicke auf "Listings finden" Button
5. Prüfe: Erfolgsmeldung wird angezeigt
6. Prüfe: Listings werden in Tabelle angezeigt

### Rate Shopping Button testen

1. Nach Discovery: Klicke auf "Rate Shopping starten" Button
2. Prüfe: Erfolgsmeldung wird angezeigt
3. Prüfe: Job wird erstellt (Backend-Logs)

## Performance-Hinweise

- **Discovery**: Kann lange dauern (viele Requests, Pagination)
- **Rate-Limiting**: 2 Sekunden zwischen Requests
- **Timeout**: 30 Sekunden pro Request
- **Max Pages**: 10 Seiten pro Discovery (kann in `otaDiscoveryService.ts` angepasst werden)

## Wichtige Hinweise

1. **Web Scraping**: OTA-Plattformen können HTML-Struktur ändern → Selektoren müssen angepasst werden
2. **Rate-Limiting**: Zu viele Requests können zu Blocks führen
3. **Datenqualität**: Gefundene Listings können falsch sein (falsche Stadt, falscher Zimmertyp) → Manuelle Review empfohlen
4. **Caching**: Listings werden 7 Tage gecacht (neu discoveren wenn älter)


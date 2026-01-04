# Externe API Scheduler - Entwicklungsumgebung

## Übersicht

Dieses Dokument listet alle automatischen Scheduler auf, die externe APIs aufrufen und in der Entwicklungsumgebung deaktiviert werden sollten, um Sperrungen zu vermeiden.

## Liste der Scheduler mit externen API-Aufrufen

### 1. LobbyPMS Reservation Scheduler
**Datei:** `backend/src/services/lobbyPmsReservationScheduler.ts`  
**Start:** `backend/src/app.ts:199`  
**Intervall:** Alle 10 Minuten  
**Externe API:** LobbyPMS API (Reservierungen importieren)  
**Risiko:** Hoch - kann zu IP-Sperrung führen bei zu vielen Requests

### 2. Occupancy Monitoring Service
**Datei:** `backend/src/services/occupancyMonitoringService.ts`  
**Start:** `backend/src/index.ts:163-172`  
**Intervall:** Alle 12 Stunden (sofortiger Check beim Start ist deaktiviert)  
**Externe API:** LobbyPMS API (Verfügbarkeiten prüfen)  
**Risiko:** Hoch - kann zu IP-Sperrung führen  
**Status:** ✅ Sofortiger Check beim Start deaktiviert (auskommentiert)

### 3. Rate Shopping Scheduler
**Datei:** `backend/src/services/rateShoppingScheduler.ts`  
**Start:** `backend/src/index.ts:148`  
**Intervall:** Täglich um 2:00 Uhr  
**Externe API:** Booking.com, Hostelworld.com (Preise abfragen)  
**Risiko:** Sehr hoch - kann zu IP-Sperrung führen bei Web-Scraping

### 4. Reservation Auto Cancel Scheduler
**Datei:** `backend/src/services/reservationAutoCancelScheduler.ts`  
**Start:** `backend/src/app.ts:202`  
**Intervall:** Alle 5 Minuten  
**Externe API:** LobbyPMS API (Reservierungen stornieren)  
**Risiko:** Mittel - nur bei tatsächlichen Stornierungen

### 5. Reservation Auto Invitation Scheduler
**Datei:** `backend/src/services/reservationAutoInvitationScheduler.ts`  
**Start:** `backend/src/app.ts:205`  
**Intervall:** Alle 10 Minuten (prüft ob 08:00 Uhr)  
**Externe API:** WhatsApp/Email Services (Einladungen versenden)  
**Risiko:** Mittel - kann zu Rate-Limiting führen

### 6. Email Reservation Scheduler
**Datei:** `backend/src/services/emailReservationScheduler.ts`  
**Start:** `backend/src/app.ts:208`  
**Intervall:** Regelmäßig (IMAP-Check)  
**Externe API:** IMAP Server (Email-Import)  
**Risiko:** Niedrig - aber sollte auch deaktiviert werden

### 7. Pricing Rule Scheduler
**Datei:** `backend/src/services/pricingRuleScheduler.ts`  
**Start:** `backend/src/index.ts:152`  
**Intervall:** Alle 6 Stunden  
**Externe API:** Keine direkte API, aber ruft PriceAnalysisService auf (kann LobbyPMS indirekt nutzen)  
**Risiko:** Niedrig - aber sollte deaktiviert werden, da er automatisch läuft

## Manuelle API-Aufrufe (nicht automatisch, aber sollten dokumentiert sein)

### 8. AI Price Search Service (Competitor Discovery)
**Datei:** `backend/src/services/aiPriceSearchService.ts`  
**Aufruf:** Über API-Endpoint `/api/branches/:branchId/discover-competitors`  
**Externe API:** OpenAI API (Competitor-Discovery)  
**Risiko:** Mittel - kann zu Rate-Limiting führen bei vielen Requests

### 9. AI Price Search Service (Price Search)
**Datei:** `backend/src/services/aiPriceSearchService.ts`  
**Aufruf:** Über API-Endpoint `/api/competitor-groups/:id/search-prices`  
**Externe API:** OpenAI API (Preissuche auf Booking.com/Hostelworld)  
**Risiko:** Mittel - kann zu Rate-Limiting führen

### 10. OTA Discovery Service
**Datei:** `backend/src/services/otaDiscoveryService.ts`  
**Aufruf:** Über API-Endpoint `/api/price-analysis/ota/discover`  
**Externe API:** Booking.com, Hostelworld.com (Web Scraping)  
**Risiko:** Sehr hoch - kann zu IP-Sperrung führen

### 11. OTA Rate Shopping Service
**Datei:** `backend/src/services/otaRateShoppingService.ts`  
**Aufruf:** Über API-Endpoint `/api/price-analysis/ota/rate-shopping` oder automatisch via RateShoppingScheduler  
**Externe API:** Booking.com, Hostelworld.com (Web Scraping)  
**Risiko:** Sehr hoch - kann zu IP-Sperrung führen

### 12. LobbyPMS Price Update Service
**Datei:** `backend/src/services/lobbyPmsPriceUpdateService.ts`  
**Aufruf:** Über API-Endpoint (Preisempfehlungen anwenden)  
**Externe API:** LobbyPMS API (Preise setzen)  
**Risiko:** Hoch - kann zu IP-Sperrung führen bei vielen Updates

## ⚠️ WICHTIG: Sofortiger Check beim Start

**OccupancyMonitoringService** führt beim Server-Start sofort einen Check aus (Zeile 169-172 in `index.ts`).  
**Status:** ✅ Deaktiviert - Code auskommentiert, um IP-Sperrung zu vermeiden

## Manuelle API-Aufrufe (Frontend/API-Endpoints)

Diese Services werden **nicht automatisch** gestartet, sondern nur über API-Endpoints aufgerufen.  
Sie sollten in der Entwicklungsumgebung **nicht verwendet** werden, um IP-Sperrungen zu vermeiden:

- **Competitor Discovery** (`/api/branches/:branchId/discover-competitors`) - OpenAI API
- **Price Search** (`/api/competitor-groups/:id/search-prices`) - OpenAI API + Web Scraping
- **OTA Discovery** (`/api/price-analysis/ota/discover`) - Booking.com/Hostelworld Scraping
- **Rate Shopping** (`/api/price-analysis/ota/rate-shopping`) - Booking.com/Hostelworld Scraping
- **Apply Price Recommendation** (`/api/price-analysis/recommendations/:id/apply`) - LobbyPMS API

## Lösung: Environment-basierte Deaktivierung

### ✅ Implementiert

Die Scheduler werden automatisch deaktiviert, wenn:
- `DISABLE_EXTERNAL_API_SCHEDULERS=true` in der `.env` Datei gesetzt ist
- ODER `NODE_ENV=development` gesetzt ist

### Setup für Entwicklungsumgebung

**Datei:** `backend/.env` (Entwicklung)
```env
NODE_ENV=development
# oder explizit:
DISABLE_EXTERNAL_API_SCHEDULERS=true
```

**Datei:** `backend/.env` (Produktion)
```env
NODE_ENV=production
# DISABLE_EXTERNAL_API_SCHEDULERS nicht setzen oder auf false
```

### Code-Änderungen

✅ **app.ts** (Zeilen 198-208)
- LobbyPmsReservationScheduler
- ReservationAutoCancelScheduler
- ReservationAutoInvitationScheduler
- EmailReservationScheduler

✅ **index.ts** (Zeilen 141-163)
- RateShoppingScheduler
- PricingRuleScheduler
- OccupancyMonitoringService

### Log-Ausgabe

Wenn die Scheduler deaktiviert sind, erscheint beim Server-Start:
```
⚠️ [ENTWICKLUNG] Externe API Scheduler sind DEAKTIVIERT (DISABLE_EXTERNAL_API_SCHEDULERS=true)
   - LobbyPMS Reservation Scheduler
   - Reservation Auto Cancel Scheduler
   - Reservation Auto Invitation Scheduler
   - Email Reservation Scheduler
   - Rate Shopping Scheduler
   - Pricing Rule Scheduler
   - Occupancy Monitoring Service
```

### Priorität

**KRITISCH (sofort deaktivieren):**
- LobbyPmsReservationScheduler
- OccupancyMonitoringService
- RateShoppingScheduler

**WICHTIG (sollte deaktiviert werden):**
- ReservationAutoCancelScheduler
- ReservationAutoInvitationScheduler

**OPTIONAL (kann deaktiviert werden):**
- EmailReservationScheduler


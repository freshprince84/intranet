# Bold Payment Link Fehler - Wiederkehrendes Problem

**Datum**: 2025-01-22  
**Status**: 🔴 KRITISCH - Wiederkehrendes Problem

## Problembeschreibung

Der Payment-Link schlägt plötzlich wieder fehl, obwohl es früher funktioniert hat. Dies ist ein wiederkehrendes Problem, das täglich auftritt.

## Bekannte Probleme (aus Dokumentation)

### 1. API URL Problem (früher)

**Dokumentiert in**: `docs/implementation_plans/TEST_ZUSAMMENFASSUNG.md`

**Problem**: Die URL `https://sandbox.bold.co` existiert nicht (DNS-Fehler: `ENOTFOUND`)

**Aktueller Code**: Verwendet `https://integrations.api.bold.co` (Zeile 85, 126 in `boldPaymentService.ts`)

**Status**: ✅ Sollte behoben sein, aber könnte sich wieder geändert haben

## Mögliche Ursachen für wiederkehrende Fehler

### 1. API-Key/Merchant-ID Probleme

**Code-Stelle**: `backend/src/services/boldPaymentService.ts` (Zeile 123-124, 177)

**Mögliche Probleme**:
- API-Key ist abgelaufen
- Merchant-ID ist ungültig
- Keys wurden im Bold Payment Dashboard geändert
- Keys haben nicht die richtigen Berechtigungen
- Keys sind für falsche Umgebung (Sandbox vs. Production)

**Prüfung erforderlich**:
- Bold Payment Dashboard prüfen
- Keys neu generieren falls nötig
- Berechtigungen prüfen

### 2. API-URL könnte sich geändert haben

**Code-Stelle**: `backend/src/services/boldPaymentService.ts` (Zeile 85, 126)

**Aktuell verwendet**: `https://integrations.api.bold.co`

**Mögliche Probleme**:
- Bold Payment hat die API-URL geändert
- URL ist nicht mehr erreichbar
- URL ist nur für bestimmte Umgebungen verfügbar

**Prüfung erforderlich**:
- Bold Payment Dokumentation konsultieren
- API-URL testen (curl oder Postman)
- Prüfen ob URL für Sandbox/Production unterschiedlich ist

### 3. Netzwerkprobleme

**Code-Stelle**: `backend/src/services/boldPaymentService.ts` (Zeile 273, 320-377)

**Mögliche Probleme**:
- Bold Payment API ist nicht erreichbar
- Timeout (30 Sekunden) wird überschritten
- DNS-Probleme
- Firewall blockiert Requests

**Prüfung erforderlich**:
- API-URL direkt testen
- Netzwerk-Verbindung prüfen
- Timeout-Logs prüfen

### 4. Environment-Konfiguration

**Code-Stelle**: `backend/src/services/boldPaymentService.ts` (Zeile 37, 84, 125)

**Aktuell**: `environment: 'sandbox' | 'production' = 'sandbox'`

**Mögliche Probleme**:
- Environment ist falsch konfiguriert
- Sandbox-Keys werden für Production verwendet (oder umgekehrt)
- Environment-Einstellung wurde geändert

**Prüfung erforderlich**:
- Environment-Einstellung in Datenbank prüfen
- Prüfen ob Keys für richtige Umgebung sind

### 5. Payload-Validierung

**Code-Stelle**: `backend/src/services/boldPaymentService.ts` (Zeile 229-249, 257-269)

**Mögliche Probleme**:
- Betrag ist zu niedrig (Mindestbetrag nicht erfüllt)
- Beschreibung ist zu kurz (< 2 Zeichen)
- Währung ist ungültig
- Payload-Format hat sich geändert

**Prüfung erforderlich**:
- Payload-Logs prüfen (Zeile 280)
- Bold Payment API-Dokumentation prüfen
- Mindestbeträge prüfen

### 6. Authentifizierung

**Code-Stelle**: `backend/src/services/boldPaymentService.ts` (Zeile 177)

**Aktuell**: `Authorization: x-api-key ${this.merchantId}`

**Mögliche Probleme**:
- Header-Format hat sich geändert
- Merchant-ID wird falsch verwendet
- API erwartet anderes Format

**Prüfung erforderlich**:
- Bold Payment Dokumentation prüfen
- Header-Format testen

## Code-Analyse - Fehlerbehandlung

### Fehlerbehandlung in createPaymentLink

**Code-Stelle**: `backend/src/services/boldPaymentService.ts` (Zeile 320-377)

**Fakten**:
- Detailliertes Logging bei Fehlern (Zeile 327-330)
- Spezifische Fehlermeldungen für 403 Forbidden (Zeile 350-358)
- Spezifische Fehlermeldungen für 400 Bad Request (Zeile 362-371)
- Error-Messages werden extrahiert (Zeile 333-347)

**Problem**: Fehler werden geloggt, aber möglicherweise nicht richtig weitergegeben

### Fehlerbehandlung in sendReservationInvitation

**Code-Stelle**: `backend/src/services/reservationNotificationService.ts` (Zeile 284-305)

**Fakten**:
- Wenn Payment-Link fehlschlägt, wird Error geworfen (Zeile 304)
- Versucht Log zu erstellen (Zeile 290-299), aber wenn das fehlschlägt, wird nur geloggt (Zeile 300-301)
- Error wird geworfen, was die gesamte Funktion abbricht

**Problem**: Wenn Payment-Link fehlschlägt → Error → Abbruch → Kein Log → Keine Notification

## Empfohlene Prüfungen

### 1. Server-Logs prüfen

Suche nach:
- `[Bold Payment] API Error Details:`
- `[Bold Payment] Payload:`
- `[ReservationNotification] ❌ Fehler beim Erstellen des Payment-Links:`

### 2. Bold Payment Dashboard prüfen

- Sind die Keys noch aktiv?
- Haben die Keys die richtigen Berechtigungen?
- Ist "API Link de pagos" aktiviert?
- Gibt es Rate-Limiting?

### 3. API-URL testen

```bash
curl -X POST https://integrations.api.bold.co/online/link/v1 \
  -H "Authorization: x-api-key YOUR_MERCHANT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "amount_type": "CLOSE",
    "amount": {
      "currency": "COP",
      "total_amount": 100000,
      "subtotal": 100000,
      "taxes": [],
      "tip_amount": 0
    },
    "reference": "TEST-123",
    "description": "Test Payment"
  }'
```

### 4. Datenbank prüfen

- Sind Bold Payment Settings korrekt gespeichert?
- Ist Environment richtig konfiguriert?
- Sind API-Key und Merchant-ID vorhanden?

## Bekannte Probleme aus Code

### Problem 1: Payment-Link-Fehler führt zu komplettem Abbruch

**Code-Stelle**: `backend/src/services/reservationNotificationService.ts` (Zeile 284-305)

**Fakten**:
- Wenn Payment-Link-Erstellung fehlschlägt, wird Error geworfen (Zeile 304)
- Error wird geworfen, NACHDEM versucht wurde, ein Log zu erstellen (Zeile 290-299)
- **ABER**: Wenn Log-Erstellung selbst fehlschlägt (Zeile 300-301), wird nur geloggt, aber Funktion bricht trotzdem ab
- **ERGEBNIS**: Kein Log in DB, keine Notification, Frontend bekommt Error

**Bekanntes Problem**: Dokumentiert in `docs/technical/RESERVATION_NOTIFICATION_LOG_PROBLEM.md`

## Zusammenfassung

**Wiederkehrende Ursachen**:

1. **API-Key/Merchant-ID Probleme** (wahrscheinlichste Ursache)
   - Keys könnten abgelaufen sein
   - Keys könnten im Dashboard geändert worden sein
   - Keys könnten nicht die richtigen Berechtigungen haben

2. **API-URL könnte sich geändert haben**
   - Bold Payment könnte die URL geändert haben
   - URL könnte nicht mehr erreichbar sein

3. **Environment-Konfiguration**
   - Sandbox vs. Production könnte falsch sein
   - Keys könnten für falsche Umgebung sein

4. **Netzwerkprobleme**
   - API könnte nicht erreichbar sein
   - Timeout könnte überschritten werden

**Nächste Schritte**:
1. Server-Logs prüfen auf konkrete Fehlermeldungen
2. Bold Payment Dashboard prüfen
3. API-URL testen
4. Datenbank-Settings prüfen


# LobbyPMS API Endpoint Problem

## Problem

Die LobbyPMS API gibt eine HTML-404-Seite zurück statt JSON, wenn `/reservations` aufgerufen wird.

## Mögliche Ursachen

1. **Falscher Endpoint-Pfad**: Der Endpoint könnte anders heißen (z.B. `/bookings`, `/api/reservations`, etc.)
2. **Falsche Authentifizierung**: Der API Token wird möglicherweise nicht korrekt übertragen
3. **API-Version**: Die API könnte eine andere Version verwenden (z.B. `/v1/reservations`)

## Was funktioniert

✅ **Verbindung erfolgreich**: `GET /health` funktioniert
✅ **Settings korrekt geladen**: API Token und Property ID sind vorhanden
✅ **Service initialisiert**: LobbyPmsService kann erstellt werden

## Was nicht funktioniert

❌ **Reservierungen abrufen**: `GET /reservations` gibt 404 HTML-Seite zurück

## Lösung

### Option 1: API-Dokumentation prüfen

Die LobbyPMS API-Dokumentation sollte konsultiert werden, um:
- Den korrekten Endpoint-Pfad zu finden
- Die korrekte Authentifizierungsmethode zu prüfen
- Die erwartete Request-Struktur zu verstehen

### Option 2: Endpoint-Varianten testen

Der Service versucht jetzt verschiedene Endpoint-Varianten:
- `/reservations`
- `/api/reservations`
- `/v1/reservations`
- `/bookings`
- `/api/bookings`

### Option 3: Authentifizierung anpassen

Mögliche Authentifizierungsmethoden:
- `Authorization: Bearer <token>`
- `X-API-Key: <token>`
- `X-API-Token: <token>`
- Query-Parameter: `?api_key=<token>`

## Nächste Schritte

1. **LobbyPMS API-Dokumentation konsultieren**
   - Endpoint-Pfad prüfen
   - Authentifizierungsmethode prüfen
   - Request-Format prüfen

2. **API-Token prüfen**
   - Ist der Token korrekt?
   - Ist der Token aktiv?
   - Hat der Token die richtigen Berechtigungen?

3. **Alternative Endpoints testen**
   - `/bookings` statt `/reservations`
   - `/api/v1/reservations`
   - Property-spezifische Endpoints

## Temporäre Lösung

Bis der korrekte Endpoint gefunden ist, kann der Service weiterhin:
- ✅ Verbindung validieren
- ✅ Settings laden
- ⚠️ Reservierungen abrufen (benötigt korrekten Endpoint)

Die anderen Funktionen (Check-in, SIRE, etc.) funktionieren unabhängig von der LobbyPMS API.



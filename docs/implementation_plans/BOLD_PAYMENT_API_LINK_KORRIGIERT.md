# ✅ Bold Payment "API Link de pagos" - Korrigiert

## Status

Die Implementierung wurde auf die korrekte API umgestellt: **"API Link de pagos"** (nicht "API pagos en línea").

## Korrekturen

### 1. API-Endpoint
- **Vorher**: `https://api.online.payments.bold.co` (falsche API)
- **Jetzt**: `https://integrations.api.bold.co` ✅

### 2. Authentifizierung
- **Vorher**: AWS SigV4 (komplex, funktionierte nicht)
- **Jetzt**: `Authorization: x-api-key <llave_de_identidad>` ✅

### 3. Endpoint
- **Vorher**: `/payment-links`
- **Jetzt**: `/online/link/v1` ✅

### 4. Payload-Struktur
- **Vorher**: Falsche Struktur
- **Jetzt**: Korrekte Struktur gemäß Dokumentation:
  ```json
  {
    "amount_type": "CLOSE",
    "amount": {
      "currency": "COP",
      "total_amount": 100000,
      "subtotal": 100000,
      "taxes": [],
      "tip_amount": 0
    },
    "reference": "RES-1-1234567890",
    "description": "Reservierung Test Gast",
    "callback_url": "..."
  }
  ```

### 5. Response-Struktur
- **Vorher**: `{ success: true, data: { url: "..." } }`
- **Jetzt**: `{ payload: { payment_link: "LNK_...", url: "https://..." }, errors: [] }` ✅

## Aktueller Fehler

```
403 Forbidden
```

## Mögliche Ursachen

1. **API nicht aktiviert**: Die "API Link de pagos" muss möglicherweise im Bold Payment Dashboard aktiviert werden
2. **Falsche Keys**: Keys müssen für "Botón de pagos" sein (laut Dokumentation verwendet API Link de pagos die gleichen Keys)
3. **Sandbox vs. Production**: Keys müssen für die richtige Umgebung sein

## Nächste Schritte

1. **Bold Payment Dashboard prüfen**:
   - Tab "API Link de pagos" aufrufen
   - Prüfen ob API aktiviert ist
   - Keys für "API Link de pagos" verwenden (falls vorhanden)

2. **Keys überprüfen**:
   - Keys aus "Botón de pagos" verwenden (laut Dokumentation)
   - Sandbox-Keys für Test-Umgebung verwenden

3. **Bold Payment Support kontaktieren**:
   - Frage: Muss "API Link de pagos" separat aktiviert werden?
   - Frage: Welche Keys werden verwendet?

## Dokumentation

- API Link de pagos: https://developers.bold.co/pagos-en-linea/api-link-de-pagos
- Authentifizierung: `Authorization: x-api-key <llave_de_identidad>`
- URL base: `https://integrations.api.bold.co`
- Endpoint: `POST /online/link/v1`

## Betrag aus LobbyPMS

**TODO**: Der Betrag muss aus der LobbyPMS-Reservierung kommen. Aktuell wird ein Placeholder verwendet:
- `const amount = 100000; // Placeholder: 100.000 COP`

Das Feld muss aus der LobbyPMS API Response identifiziert werden, sobald die API-Dokumentation verfügbar ist.



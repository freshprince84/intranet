# Bold Payment Authentifizierung - Status

## Bestätigte Konfiguration

Die Key-Zuordnung ist korrekt:
- **Llave secreta** → API Key → Secret Access Key (für AWS SigV4)
- **Llave de identidad** → Merchant ID → Access Key ID (für AWS SigV4)

## Aktueller Stand

### Implementierung
- ✅ AWS SigV4 Authentifizierung implementiert
- ✅ Region: `us-east-1` (bestätigt durch API-Fehler bei `sa-east-1`)
- ✅ Service: `execute-api`
- ✅ Key-Zuordnung: Identity Key = Access Key ID, Secret Key = Secret Access Key

### Aktueller Fehler

```
403 Forbidden: The security token included in the request is invalid.
```

### API-Fehlermeldungen

Die API bestätigt eindeutig, dass AWS SigV4 erforderlich ist:
- "Authorization header requires 'Credential' parameter"
- "Authorization header requires 'Signature' parameter"
- "Authorization header requires 'SignedHeaders' parameter"
- "Authorization header requires existence of either a 'X-Amz-Date' or a 'Date' header"

## Mögliche Ursachen

1. **Keys sind nicht korrekt**: 
   - Keys müssen aus dem Bold Payment Dashboard stammen
   - Sandbox-Keys für Test-Umgebung verwenden
   - Keys müssen für "API pagos en línea" (nicht "Botón de pagos") sein

2. **Falsche API-Endpoint**:
   - Aktuell: `https://api.online.payments.bold.co`
   - Möglicherweise gibt es einen anderen Endpoint für die API

3. **Keys sind für falschen Service**:
   - Im Bild sind die Keys für "Botón de pagos" sichtbar
   - Möglicherweise benötigt "API pagos en línea" andere Keys

## Nächste Schritte

1. **Keys überprüfen**:
   - Im Bold Payment Dashboard zu "API pagos en línea" wechseln
   - Keys für "API pagos en línea" (nicht "Botón de pagos") verwenden
   - Sicherstellen, dass Sandbox-Keys verwendet werden

2. **Bold Payment Support kontaktieren**:
   - Klärung der Authentifizierungsmethode
   - Bestätigung der Key-Zuordnung
   - Bestätigung der Region/Service
   - Frage: Welche Keys werden für "API pagos en línea" benötigt?

3. **Alternative Endpoints prüfen**:
   - Gibt es einen anderen API-Endpoint?
   - Gibt es einen Authentifizierungs-Endpoint, der einen Token zurückgibt?

## Wichtiger Hinweis

Im Bild sind die Keys für **"Botón de pagos"** (Payment Button) sichtbar. Möglicherweise benötigt die **"API pagos en línea"** (Online Payments API) andere Keys, die im Tab "API pagos en línea" im Bold Payment Dashboard zu finden sind.



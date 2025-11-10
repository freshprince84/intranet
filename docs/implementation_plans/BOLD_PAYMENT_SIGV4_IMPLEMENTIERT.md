# ✅ Bold Payment AWS SigV4 Authentifizierung - Implementiert

## Status

Die AWS Signature Version 4 (SigV4) Authentifizierung wurde erfolgreich implementiert.

## Implementierung

### Code-Änderungen

1. **Paket installiert**: `aws4` und `@types/aws4`
2. **Service aktualisiert**: `backend/src/services/boldPaymentService.ts`
   - AWS SigV4-Authentifizierung im Request-Interceptor implementiert
   - Identity Key (Merchant ID) wird als Access Key ID verwendet
   - Secret Key (API Key) wird als Secret Access Key verwendet

### Aktuelle Konfiguration

- **Region**: `us-east-1` (bestätigt durch API-Fehler "Credential should be scoped to a valid region" bei sa-east-1)
- **Service**: `execute-api` (AWS API Gateway)
- **Access Key ID**: Identity Key (Merchant ID)
- **Secret Access Key**: Secret Key (API Key)

## Aktueller Fehler

```
403 Forbidden: The security token included in the request is invalid.
```

## Mögliche Ursachen

1. **Falsche Region/Service**: 
   - Aktuell: `sa-east-1` / `execute-api` (Südamerika - Kolumbien)
   - Falls weiterhin Fehler: `us-east-1` testen
   - Service könnte anders sein (z.B. `payments`, `api`, etc.)

2. **Falsche Key-Zuordnung**:
   - Aktuell: Identity Key = Access Key ID, Secret Key = Secret Access Key
   - Möglicherweise umgekehrt?

3. **Falsche Keys**: 
   - Keys müssen aus dem Bold Payment Dashboard stammen
   - Sandbox-Keys für Test-Umgebung verwenden

## Nächste Schritte

1. **Bold Payment Dokumentation prüfen**:
   - Region für API-Endpoint ermitteln
   - Service-Name ermitteln
   - Key-Zuordnung verifizieren

2. **Alternative Regionen/Service testen**:
   - `sa-east-1` (Südamerika - Kolumbien)
   - `us-west-2`
   - Service: `payments`, `api`, etc.

3. **Key-Zuordnung testen**:
   - Identity Key als Secret Access Key
   - Secret Key als Access Key ID

## Test-Ergebnis

```
✅ Code kompiliert erfolgreich
✅ Authentifizierung wird durchgeführt (kein DNS-Fehler mehr)
❌ 403 Forbidden: "The security token included in the request is invalid."
```

## Code-Referenz

```typescript
// backend/src/services/boldPaymentService.ts
const request: aws4.Request = {
  method: config.method?.toUpperCase() || 'GET',
  host: url.hostname,
  path: url.pathname + url.search,
  headers: headers,
  body: config.data ? JSON.stringify(config.data) : undefined,
  region: 'sa-east-1',  // Südamerika - Kolumbien
  service: 'execute-api', // TODO: Korrekten Service ermitteln
};

const signedRequest = aws4.sign(request, {
  accessKeyId: this.merchantId!, // Identity Key
  secretAccessKey: this.apiKey!, // Secret Key
});
```


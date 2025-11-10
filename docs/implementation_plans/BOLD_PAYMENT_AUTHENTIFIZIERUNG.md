# ⚠️ Bold Payment Authentifizierung - Problem

## Aktueller Fehler

```
Invalid key=value pair (missing equal-sign) in Authorization header 
(hashed with SHA-256 and encoded with Base64)
```

## Problem

Die aktuelle Implementierung verwendet:
```typescript
'Authorization': `Bearer ${this.apiKey}`
```

Aber Bold Payment erwartet eine andere Authentifizierungsmethode.

## Lösung erforderlich

Die korrekte Authentifizierungsmethode muss aus der Bold Payment API-Dokumentation ermittelt werden:

**Dokumentation**: https://developers.bold.co/pagos-en-linea/api-de-pagos-en-linea/integracion

## Mögliche Authentifizierungsmethoden

1. **HMAC-Signatur** (SHA-256 + Base64)
   - Request-Body wird gehasht
   - Mit Secret Key signiert
   - Base64-kodiert
   - Im Authorization Header: `Authorization: key=value`

2. **API Key als Header**
   - `X-API-Key: {apiKey}`
   - `X-Merchant-ID: {merchantId}`

3. **Basic Auth**
   - `Authorization: Basic {base64(merchantId:apiKey)}`

## Nächste Schritte

1. **Bold Payment API-Dokumentation konsultieren**:
   - https://developers.bold.co/pagos-en-linea/api-de-pagos-en-linea/integracion
   - Abschnitt "Autenticación" oder "Authentication"

2. **Authentifizierungsmethode implementieren**:
   - Datei: `backend/src/services/boldPaymentService.ts`
   - Methode: `createAxiosInstance()`
   - Korrekte Header-Formatierung

3. **Test erneut durchführen**

## Aktueller Stand

- ✅ API URL korrekt: `https://api.online.payments.bold.co`
- ✅ Keys korrekt eingegeben
- ❌ Authentifizierungsmethode muss korrigiert werden


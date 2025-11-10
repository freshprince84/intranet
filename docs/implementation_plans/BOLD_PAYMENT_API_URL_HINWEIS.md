# ⚠️ Bold Payment API URL - WICHTIG

## Problem

Die Sandbox-URL `https://sandbox.bold.co` existiert nicht (DNS-Fehler).

## Lösung erforderlich

Die korrekte Bold Payment API URL muss aus der offiziellen Dokumentation ermittelt werden:

**Dokumentation**: https://developers.bold.co

## Mögliche URLs

Basierend auf der Dokumentation könnten die URLs sein:

1. **Production**: `https://api.bold.co`
2. **Sandbox**: 
   - `https://sandbox-api.bold.co`
   - `https://api-sandbox.bold.co`
   - `https://api.bold.co` (gleiche URL, aber andere Keys)
   - Oder eine andere URL aus der Dokumentation

## Nächste Schritte

1. **Bold Payment Dokumentation konsultieren**:
   - https://developers.bold.co/pagos-en-linea/boton-de-pagos/ambiente-pruebas
   - API-Endpoint-Informationen suchen

2. **URL in Code korrigieren**:
   - Datei: `backend/src/services/boldPaymentService.ts`
   - Zeile: ~83
   - Korrekte Sandbox-URL eintragen

3. **Test erneut durchführen**:
   ```bash
   npx ts-node scripts/test-bold-payment-link.ts 1
   ```

## Aktueller Stand

- ✅ Keys korrekt eingegeben (Secret Key → API Key, Identity Key → Merchant ID)
- ✅ Environment: Sandbox
- ❌ API URL muss korrigiert werden

## Hinweis

Es ist möglich, dass Bold Payment die gleiche API URL für Sandbox und Production verwendet, aber unterschiedliche Keys. In diesem Fall sollte die URL `https://api.bold.co` für beide Environments verwendet werden.


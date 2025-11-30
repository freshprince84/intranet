# Bold Payment Webhook - 2-Sekunden-Timeout Fix

## Problem

**Fehler:** "Fehler beim erstellen eines webhooks" in Bold Payment Dashboard

**Ursache:** Bold Payment erfordert, dass der Webhook-Endpunkt **innerhalb von 2 Sekunden** mit Status 200 antwortet.

**Aktueller Code-Problem:**
- Der Endpunkt wartet auf die vollständige Verarbeitung, bevor er antwortet
- Dies kann länger als 2 Sekunden dauern (DB-Queries, API-Calls, etc.)
- Bold Payment lehnt den Webhook ab, wenn die Antwort zu langsam ist

## Lösung

**Code-Änderung:** Sofortige Antwort (200) + Asynchrone Verarbeitung

### Vorher (Problem):

```typescript
// Wartet auf Verarbeitung, dann antwortet
await boldPaymentService.handleWebhook(payload);
res.json({ success: true, message: 'Webhook verarbeitet' });
// ⚠️ Kann > 2 Sekunden dauern!
```

### Nachher (Lösung):

```typescript
// Sofortige Antwort (innerhalb von 2 Sekunden)
res.status(200).json({ success: true, message: 'Webhook received' });

// Verarbeitung asynchron (ohne auf Response zu warten)
setImmediate(async () => {
  await boldPaymentService.handleWebhook(payload);
  // Verarbeitung kann länger dauern, aber Response wurde bereits gesendet
});
```

## Implementierung

**Datei:** `backend/src/controllers/boldPaymentController.ts`

### Wichtige Änderungen:

1. **Sofortige Response:**
   - Antwort wird sofort gesendet (Status 200)
   - Kein Warten auf Verarbeitung

2. **Asynchrone Verarbeitung:**
   - Verarbeitung läuft im Hintergrund
   - Verwendet `setImmediate()` für asynchrone Ausführung
   - Fehler werden geloggt, aber Response wurde bereits gesendet

3. **Fehlerbehandlung:**
   - Fehler in der asynchronen Verarbeitung werden geloggt
   - Response wurde bereits gesendet, daher kein Fehler-Response mehr möglich

## Bold Payment Anforderungen

Laut Dokumentation (https://developers.bold.co/webhook):

> "El endpoint debe responder inmediatamente con el código de estado 200 antes de que cualquier lógica de tu sistema provoque un error por tiempo de espera (con un máximo de 2 segundo permitido)."

**Übersetzung:**
> "Der Endpunkt muss sofort mit Status Code 200 antworten, bevor jede Logik deines Systems einen Fehler durch Timeout verursacht (mit einem Maximum von 2 Sekunden erlaubt)."

## Test

### 1. Test POST-Request

```bash
curl -X POST "https://65.109.228.106.nip.io/api/bold-payment/webhook" \
  -H "Content-Type: application/json" \
  -d '{"test": true}' \
  -v
```

**Erwartete Antwort:**
- Status: 200 (sofort, < 2 Sekunden)
- Body: `{"success": true, "message": "Webhook received"}`

### 2. Server-Logs prüfen

```bash
pm2 logs intranet-backend | grep -i "bold.*payment.*webhook"
```

**Erwartete Logs:**
```
[Bold Payment Webhook] POST Request - Empfangen: {...}
[Bold Payment Webhook] ✅ Webhook verarbeitet
```

### 3. Webhook im Dashboard erstellen

1. Bold Payment Dashboard → "Integraciones" → "Webhooks"
2. "Configurar webhook" klicken
3. URL eingeben: `https://65.109.228.106.nip.io/api/bold-payment/webhook`
4. Events auswählen
5. "Crear webhook" klicken

**Erwartetes Ergebnis:**
- ✅ Webhook wird erfolgreich erstellt
- ✅ Kein "Fehler beim erstellen eines webhooks" mehr

## Weitere Verbesserungen

### 1. Webhook-Signatur-Validierung

**TODO:** Implementiere Validierung der `x-bold-signature` Header:

```typescript
// Validiere Webhook-Signatur
const signature = req.headers['x-bold-signature'];
const secretKey = process.env.BOLD_PAYMENT_SECRET_KEY;

if (signature && secretKey) {
  // Validierung implementieren (HMAC-SHA256)
  // Siehe: https://developers.bold.co/webhook
}
```

### 2. Queue-System für Webhook-Verarbeitung

**Optional:** Verwende Queue-System für zuverlässigere Verarbeitung:

```typescript
// Statt setImmediate:
await queue.add('bold-payment-webhook', { payload });
```

## Dokumentation

- `docs/technical/BOLD_PAYMENT_WEBHOOK_SETUP.md` - Setup-Anleitung
- `docs/technical/BOLD_PAYMENT_WEBHOOK_VALIDATION_FIX.md` - GET-Request-Fix (nicht relevant)
- `docs/technical/BOLD_PAYMENT_WEBHOOK_2SEKUNDEN_FIX.md` - Dieser Fix (2-Sekunden-Timeout)

## Zusammenfassung

**Problem:** Webhook-Endpunkt antwortet zu langsam (> 2 Sekunden)

**Lösung:** Sofortige Response (200) + Asynchrone Verarbeitung

**Ergebnis:** Webhook kann erfolgreich im Bold Payment Dashboard erstellt werden


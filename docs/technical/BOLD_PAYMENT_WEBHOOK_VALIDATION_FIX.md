# Bold Payment Webhook - Validierungs-Problem beheben

## Problem

**Fehler:** "Fehler beim erstellen eines webhooks" in Bold Payment Dashboard seit 2 Tagen

**Getestet:**
- ✅ Mit `.nip.io` Domain → Fehler
- ✅ Ohne `.nip.io` Domain → Gleicher Fehler

**Fazit:** Problem liegt NICHT an der Domain-Format

## Mögliche Ursachen

### 1. Bold Payment sendet GET-Request zur Validierung

**Problem:** Viele Webhook-Provider senden einen **GET-Request** zur Validierung beim Erstellen des Webhooks. Der aktuelle Endpunkt akzeptiert nur **POST**.

**Vergleich mit WhatsApp:**
- WhatsApp sendet GET-Request mit `hub.mode`, `hub.verify_token`, `hub.challenge`
- Bold Payment könnte ähnliches machen

**Aktueller Code:**
```typescript
// backend/src/controllers/boldPaymentController.ts
export const handleWebhook = async (req: Request, res: Response) => {
  // Akzeptiert nur POST - kein GET!
  const payload = req.body;
  // ...
}
```

### 2. Bold Payment erwartet spezifische Response

**Mögliche Anforderungen:**
- Status Code 200
- Bestimmte Response-Struktur
- Bestimmte Headers
- Schnelle Antwort (< 5 Sekunden)

### 3. SSL-Zertifikat-Problem

**Mögliche Probleme:**
- Zertifikat ist selbst-signiert
- Zertifikat ist abgelaufen
- Zertifikat-Kette ist unvollständig

### 4. Timeout-Problem

**Mögliche Probleme:**
- Server antwortet zu langsam (> 30 Sekunden)
- Bold Payment hat Timeout von z.B. 10 Sekunden

### 5. CORS-Problem

**Mögliche Probleme:**
- CORS-Header fehlen
- Bold Payment sendet Preflight-Request (OPTIONS)

## Lösung: GET-Request für Validierung hinzufügen

### Code-Änderung

**Datei:** `backend/src/controllers/boldPaymentController.ts`

```typescript
export const handleWebhook = async (req: Request, res: Response) => {
  try {
    // NEU: GET-Request für Webhook-Validierung (wie WhatsApp)
    if (req.method === 'GET') {
      console.log('[Bold Payment Webhook] GET Request - Validierung:', {
        query: req.query,
        headers: {
          'user-agent': req.headers['user-agent'],
          'content-type': req.headers['content-type']
        }
      });

      // Bold Payment könnte verschiedene Validierungsmethoden verwenden
      // Option 1: Einfache Bestätigung (200 OK)
      // Option 2: Challenge-Response (wie WhatsApp)
      // Option 3: Echo des Query-Parameters

      // Für jetzt: Einfache Bestätigung
      // Falls Bold Payment einen Challenge sendet, wird dieser zurückgegeben
      const challenge = req.query.challenge || req.query.challenge_token || req.query.token;
      
      if (challenge) {
        console.log('[Bold Payment Webhook] Challenge-Response:', challenge);
        return res.status(200).send(String(challenge));
      }

      // Fallback: Einfache Bestätigung
      return res.status(200).json({ 
        success: true, 
        message: 'Webhook endpoint is active',
        timestamp: new Date().toISOString()
      });
    }

    // POST-Request: Normale Webhook-Verarbeitung
    const payload = req.body;

    // ... restlicher Code bleibt gleich ...
  } catch (error) {
    // ... Fehlerbehandlung ...
  }
};
```

### Route anpassen

**Datei:** `backend/src/routes/boldPayment.ts`

```typescript
import express from 'express';
import { handleWebhook } from '../controllers/boldPaymentController';

const router = express.Router();

/**
 * Bold Payment Webhook Route
 * 
 * WICHTIG: 
 * - GET: Für Validierung beim Erstellen des Webhooks
 * - POST: Für echte Webhook-Events
 * - Kein authMiddleware, da von Bold Payment aufgerufen
 */
router.get('/webhook', handleWebhook);  // NEU: GET für Validierung
router.post('/webhook', handleWebhook); // POST für Events

export default router;
```

## Alternative Lösungen

### Lösung 1: Response-Format anpassen

**Möglicherweise erwartet Bold Payment:**
- Status Code 200 (nicht 400 bei fehlenden Daten)
- Bestimmte Response-Struktur
- Bestimmte Headers

**Code-Änderung:**
```typescript
// Bei fehlenden Daten: 200 statt 400
if (!organizationId && !reservationId) {
  console.warn('[Bold Payment Webhook] Organisation-ID oder Reservierungs-ID fehlt');
  // NEU: 200 statt 400 für Validierung
  return res.status(200).json({
    success: true,
    message: 'Webhook endpoint is active',
    note: 'Missing organization_id or reservation_id in payload'
  });
}
```

### Lösung 2: Timeout reduzieren

**Falls Server zu langsam antwortet:**

```typescript
// Schnelle Antwort für Validierung
if (req.method === 'GET') {
  return res.status(200).json({ success: true });
}
```

### Lösung 3: CORS-Header hinzufügen

**Falls CORS-Problem:**

```typescript
// In app.ts oder middleware
app.use('/api/bold-payment/webhook', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});
```

## Prüfung

### 1. Test GET-Request

```bash
# Test GET-Request
curl -X GET "https://65.109.228.106.nip.io/api/bold-payment/webhook?challenge=test123" -v

# Erwartete Antwort:
# Status: 200
# Body: "test123" oder {"success": true, ...}
```

### 2. Test POST-Request

```bash
# Test POST-Request
curl -X POST "https://65.109.228.106.nip.io/api/bold-payment/webhook" \
  -H "Content-Type: application/json" \
  -d '{"test": true}' \
  -v
```

### 3. Server-Logs prüfen

```bash
pm2 logs intranet-backend | grep -i "bold.*payment.*webhook"
```

**Erwartete Logs bei GET:**
```
[Bold Payment Webhook] GET Request - Validierung: { query: {...}, ... }
```

## Empfohlene Implementierung

### Schritt 1: GET-Request unterstützen

**Code-Änderung in `boldPaymentController.ts`:**

```typescript
export const handleWebhook = async (req: Request, res: Response) => {
  try {
    // GET-Request für Validierung
    if (req.method === 'GET') {
      console.log('[Bold Payment Webhook] GET Request - Validierung:', {
        query: req.query,
        headers: req.headers
      });

      // Challenge-Response (falls vorhanden)
      const challenge = req.query.challenge || req.query.challenge_token || req.query.token;
      if (challenge) {
        return res.status(200).send(String(challenge));
      }

      // Einfache Bestätigung
      return res.status(200).json({ 
        success: true, 
        message: 'Webhook endpoint is active',
        timestamp: new Date().toISOString()
      });
    }

    // POST-Request: Normale Webhook-Verarbeitung
    const payload = req.body;
    // ... restlicher Code ...
  } catch (error) {
    // ... Fehlerbehandlung ...
  }
};
```

### Schritt 2: Route anpassen

**Code-Änderung in `boldPayment.ts`:**

```typescript
router.get('/webhook', handleWebhook);  // NEU
router.post('/webhook', handleWebhook);
```

### Schritt 3: Response-Format anpassen

**Bei fehlenden Daten: 200 statt 400**

```typescript
if (!organizationId && !reservationId) {
  // Für Validierung: 200 statt 400
  return res.status(200).json({
    success: true,
    message: 'Webhook endpoint is active',
    note: 'Missing organization_id or reservation_id in payload'
  });
}
```

## Nächste Schritte

1. **Code-Änderungen implementieren** (GET-Request + Route)
2. **Deployment auf Server**
3. **Test GET-Request** (curl)
4. **Webhook in Bold Payment Dashboard erstellen**
5. **Falls immer noch Fehler:** Bold Payment Support kontaktieren

## Troubleshooting

### Problem: Immer noch Fehler nach GET-Implementierung

**Mögliche Ursachen:**
1. Bold Payment erwartet andere Response
2. SSL-Zertifikat-Problem
3. Timeout-Problem
4. Bold Payment hat andere Anforderungen

**Lösung:**
1. Bold Payment Support kontaktieren
2. Nach genauen Anforderungen fragen
3. Server-Logs prüfen (ob GET-Request ankommt)
4. Alternative: LobbyPMS-Sync verwenden

## Dokumentation

- `docs/technical/BOLD_PAYMENT_WEBHOOK_SETUP.md` - Setup-Anleitung
- `docs/technical/BOLD_PAYMENT_WEBHOOK_NIPIO_PROBLEM.md` - Domain-Problem (nicht relevant)
- `docs/technical/LOBBYPMS_SYNC_STATUS_UPDATE.md` - Alternative via LobbyPMS-Sync


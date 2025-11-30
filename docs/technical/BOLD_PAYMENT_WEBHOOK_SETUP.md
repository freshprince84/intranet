# Bold Payment Webhook Setup - Vollständige Anleitung

## Übersicht

Dieses Dokument erklärt, wie der Bold Payment Webhook im Bold Payment Dashboard konfiguriert wird, damit automatisch Status-Updates (Payment & Check-in) für Reservierungen empfangen werden.

## Problem

**Aktuelles Problem:** Reservation 18241537 hat bezahlt und eingecheckt, aber beide Status wurden nicht aktualisiert, weil:
- Webhook wurde nicht empfangen (nicht im Dashboard konfiguriert)
- Oder Webhook wurde empfangen, aber Reservation konnte nicht gefunden werden

## Voraussetzungen

1. Bold Payment Account mit Zugriff auf Dashboard
2. Öffentlich erreichbare Server-URL (für Webhook)
3. Server läuft und Webhook-Endpunkt ist erreichbar

## Server-Konfiguration

### Webhook-Endpunkt

**URL:** `https://65.109.228.106.nip.io/api/bold-payment/webhook`

**Route:** `POST /api/bold-payment/webhook`

**Datei:** `backend/src/routes/boldPayment.ts`

### Environment-Variable

**Wichtig:** Die `APP_URL` muss in der `.env` Datei gesetzt sein:

```env
APP_URL=https://65.109.228.106.nip.io
```

**Prüfung auf Server:**
```bash
cd /var/www/intranet/backend
grep APP_URL .env
```

## Schritt 1: Bold Payment Dashboard öffnen

1. Gehe zu [Bold Payment Dashboard](https://bold.co/)
2. Logge dich ein mit deinem Account
3. Navigiere zu **"Integraciones"** (Integrations) im linken Menü

## Schritt 2: Webhook konfigurieren

### 2.1 Webhook erstellen

1. Klicke auf **"Configurar webhook"** (Configure webhook) Button
2. Ein Modal-Fenster öffnet sich: **"Configura el punto de conexión de tu webhook"**

### 2.2 URL eingeben

**URL des Webhook-Endpunkts:**
```
https://65.109.228.106.nip.io/api/bold-payment/webhook
```

**Wichtig:**
- Die URL muss **HTTPS** verwenden (nicht HTTP)
- Die URL muss **öffentlich erreichbar** sein
- Die Route ist `/api/bold-payment/webhook` (wie im Backend konfiguriert)

### 2.3 Events auswählen

**WICHTIG:** Wähle die folgenden Events aus:

- ✅ **"Venta aprobada"** (Approved sale) - **KRITISCH für Payment-Status-Update**
- ✅ **"Venta rechazada"** (Rejected sale) - Optional, für Fehlerbehandlung
- ✅ **"Anulación aprobada"** (Approved cancellation) - Optional
- ✅ **"Anulación rechazada"** (Rejected cancellation) - Optional

**Event-Mapping:**
- **"Venta aprobada"** → `payment.paid` oder `payment.completed` Event
- **"Venta rechazada"** → `payment.failed` Event
- **"Anulación aprobada"** → `payment.refunded` Event

**Hinweis:** Die Events werden für **alle** Payment-Tools verwendet (Payment Links, Payment Buttons, etc.)

### 2.4 Test-Webhook (optional)

- **"¿Este es un webhook de prueba?"** (Is this a test webhook?)
  - Für Tests: ✅ Aktivieren
  - Für Production: ❌ Deaktivieren

### 2.5 Webhook speichern

1. Klicke auf **"Crear webhook"** (Create webhook) Button
2. Der Webhook wird erstellt und sollte in der Liste erscheinen

## Schritt 3: Webhook testen

### 3.1 Webhook-Erreichbarkeit prüfen

**Von Server aus:**
```bash
curl -X POST https://65.109.228.106.nip.io/api/bold-payment/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "payment.paid",
    "data": {
      "reference": "RES-15120-1234567890",
      "payment_link": "LNK_4FK3BGFTTX"
    }
  }'
```

**Erwartete Antwort:**
```json
{
  "success": true,
  "message": "Webhook verarbeitet"
}
```

### 3.2 Server-Logs prüfen

**Nach einem Test-Payment:**
```bash
pm2 logs intranet-backend | grep -i "bold.*payment.*webhook"
```

**Erwartete Logs:**
```
[Bold Payment Webhook] Empfangen: { event: 'payment.paid', ... }
[Bold Payment Webhook] Event: payment.paid
[Bold Payment Webhook] Reservierung 15120 gefunden
[Bold Payment Webhook] ✅ Payment Status aktualisiert: paid
```

## Schritt 4: Webhook-Verarbeitung verstehen

### 4.1 Webhook-Flow

1. **Kunde bezahlt** → Bold Payment sendet Webhook
2. **Webhook empfangen** → `POST /api/bold-payment/webhook`
3. **Reservation finden** → Suche nach `reference` oder `metadata.reservation_id`
4. **Status aktualisieren** → `paymentStatus = 'paid'`
5. **Auto-Check-in** → Wenn Check-in-Datum erreicht, `status = 'checked_in'`

### 4.2 Webhook-Payload-Struktur

**Erwartete Struktur:**
```json
{
  "event": "payment.paid",
  "data": {
    "reference": "RES-15120-1234567890",
    "payment_link": "LNK_4FK3BGFTTX",
    "metadata": {
      "reservation_id": 15120,
      "organization_id": 1
    },
    "amount": {
      "value": 11880,
      "currency": "COP"
    }
  }
}
```

### 4.3 Reservation-Findung

**Aktueller Code sucht nach:**
1. `data.metadata?.reservation_id` (wird NICHT gesetzt beim Payment-Link-Erstellen)
2. `data.reference` → Extrahiert ID aus `RES-{id}-{timestamp}`

**Problem:** Wenn `reference` nicht im Webhook-Payload ist, wird Reservation nicht gefunden.

## Schritt 5: Troubleshooting

### Problem 1: Webhook kommt nicht an

**Symptom:** Keine Logs im Server

**Lösung:**
1. Prüfe ob Webhook im Dashboard konfiguriert ist
2. Prüfe ob URL korrekt ist (HTTPS, keine Tippfehler)
3. Prüfe ob Server erreichbar ist:
   ```bash
   curl https://65.109.228.106.nip.io/api/bold-payment/webhook
   ```
4. Prüfe Firewall/Ports (Port 443 muss offen sein)

### Problem 2: Webhook kommt an, aber Reservation nicht gefunden

**Symptom:** Logs zeigen "Reservierungs-ID nicht gefunden"

**Lösung:**
1. Prüfe Webhook-Payload in Logs:
   ```bash
   pm2 logs intranet-backend | grep -i "bold.*payment.*webhook.*empfangen"
   ```
2. Prüfe ob `reference` im Payload ist
3. Prüfe ob `reference` Format stimmt: `RES-{id}-{timestamp}`
4. Prüfe ob Reservation mit dieser ID existiert

### Problem 3: Status wird nicht aktualisiert

**Symptom:** Webhook kommt an, Reservation wird gefunden, aber Status bleibt `pending`

**Lösung:**
1. Prüfe Server-Logs auf Fehler beim Update
2. Prüfe ob Datenbank-Update erfolgreich war
3. Prüfe ob Event korrekt ist (`payment.paid` oder `payment.completed`)

### Problem 4: Auto-Check-in funktioniert nicht

**Symptom:** Payment Status wird aktualisiert, aber Check-in nicht

**Lösung:**
1. Prüfe ob Check-in-Datum erreicht/überschritten ist
2. Prüfe Logs: `[Bold Payment Webhook] ✅ Auto-Check-in durchgeführt`
3. Prüfe ob `shouldAutoCheckIn` Bedingung erfüllt ist

## Schritt 6: Webhook-Logging verbessern

**Aktueller Code:** `backend/src/services/boldPaymentService.ts` → `handleWebhook()`

**Empfohlene Verbesserungen:**

```typescript
async handleWebhook(payload: any): Promise<void> {
  try {
    const { event, data } = payload;

    // VERBESSERTES LOGGING
    console.log('[Bold Payment Webhook] ========================================');
    console.log('[Bold Payment Webhook] Event:', event);
    console.log('[Bold Payment Webhook] Vollständiger Payload:', JSON.stringify(payload, null, 2));
    console.log('[Bold Payment Webhook] Data:', JSON.stringify(data, null, 2));
    console.log('[Bold Payment Webhook] Metadata:', JSON.stringify(data?.metadata, null, 2));
    console.log('[Bold Payment Webhook] Reference:', data?.reference);
    console.log('[Bold Payment Webhook] Payment Link:', data?.payment_link);
    console.log('[Bold Payment Webhook] ========================================');

    // ... restlicher Code ...
  }
}
```

## Schritt 7: Webhook-Events im Dashboard prüfen

### 7.1 Webhook-Historie

Im Bold Payment Dashboard sollte es eine Webhook-Historie geben:
- Welche Events wurden gesendet?
- Waren sie erfolgreich?
- Welche Fehler gab es?

### 7.2 Webhook erneut senden (falls möglich)

Falls das Dashboard es unterstützt:
- Test-Event senden
- Oder Event für spezifische Zahlung erneut senden

## Checkliste

- [ ] Webhook im Bold Payment Dashboard konfiguriert
- [ ] URL korrekt: `https://65.109.228.106.nip.io/api/bold-payment/webhook`
- [ ] Event "Venta aprobada" ausgewählt
- [ ] `APP_URL` in `.env` gesetzt
- [ ] Server erreichbar (HTTPS, Port 443)
- [ ] Webhook-Endpunkt funktioniert (Test-Request)
- [ ] Server-Logs zeigen Webhook-Empfang
- [ ] Reservation wird gefunden (Reference oder Metadata)
- [ ] Payment Status wird aktualisiert
- [ ] Auto-Check-in funktioniert (wenn Check-in-Datum erreicht)

## Nächste Schritte nach Setup

1. **Test-Payment durchführen:**
   - Erstelle Test-Reservation
   - Sende Payment-Link
   - Bezahle Test-Betrag
   - Prüfe ob Webhook ankommt
   - Prüfe ob Status aktualisiert wird

2. **Monitoring einrichten:**
   - Regelmäßig Logs prüfen
   - Webhook-Historie im Dashboard prüfen
   - Fehlerhafte Webhooks identifizieren

3. **Code-Verbesserungen:**
   - Metadata beim Payment-Link-Erstellen hinzufügen (falls API unterstützt)
   - Payment-Link-ID in Datenbank speichern
   - Webhook-Logging verbessern

## Wichtige Hinweise

1. **HTTPS erforderlich:** Bold Payment akzeptiert nur HTTPS-Webhooks
2. **Öffentliche URL:** Die Webhook-URL muss von außen erreichbar sein (nicht localhost)
3. **Events:** "Venta aprobada" ist kritisch für Payment-Status-Updates
4. **Reference-Format:** Muss `RES-{id}-{timestamp}` Format haben
5. **Rate Limits:** Bold Payment hat möglicherweise Rate Limits

## Beispiel-Konfiguration

### Bold Payment Dashboard
- **URL:** `https://65.109.228.106.nip.io/api/bold-payment/webhook`
- **Events:** 
  - ✅ Venta aprobada
  - ✅ Venta rechazada
  - ✅ Anulación aprobada
  - ✅ Anulación rechazada
- **Test-Webhook:** ❌ Nein (Production)

### Server (.env)
```env
APP_URL=https://65.109.228.106.nip.io
```

## Weitere Ressourcen

- [Bold Payment API Dokumentation](https://developers.bold.co/)
- [Webhook-Dokumentation](https://developers.bold.co/pagos-en-linea/api-link-de-pagos)
- [Troubleshooting Guide](docs/technical/RESERVATION_STATUS_PROBLEM_PRUEFUNG.md)


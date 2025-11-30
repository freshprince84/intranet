# Bold Payment Webhook - Implementierungsplan

## Übersicht

Dieser Plan beschreibt die vollständige Implementierung und Konfiguration des Bold Payment Webhook-Systems, um automatische Status-Updates für Reservierungen zu ermöglichen.

## Problem-Statement

**Aktuelles Problem:**
- Reservation 18241537 (interne ID: 15120) hat bezahlt und eingecheckt
- Payment Status bleibt `pending` (sollte `paid` sein)
- Status bleibt `confirmed` (sollte `checked_in` sein)
- **Ursache:** Webhook wurde nicht empfangen oder nicht korrekt verarbeitet

**Anforderung:**
- Status soll **NICHT manuell** angepasst werden
- Status soll **automatisch** via Webhook aktualisiert werden

## Gefundene Dokumente

### 1. Webhook-Setup-Anleitung
- **Datei:** `docs/technical/BOLD_PAYMENT_WEBHOOK_SETUP.md` (NEU erstellt)
- **Inhalt:** Vollständige Anleitung zur Konfiguration im Bold Payment Dashboard

### 2. Diagnose-Dokumentation
- **Datei:** `docs/technical/RESERVATION_18241537_DIAGNOSE_UND_FIX.md`
- **Inhalt:** Detaillierte Diagnose des Problems mit Reservation 18241537

### 3. Prüfungs-Anleitung
- **Datei:** `docs/technical/RESERVATION_STATUS_PROBLEM_PRUEFUNG.md`
- **Inhalt:** Anleitung zur Problemprüfung auf dem Produktivserver

### 4. Bold Payment Probleme
- **Datei:** `docs/technical/BOLD_PAYMENT_KRITISCHES_PROBLEM_2025-01-22.md`
- **Inhalt:** Bekannte Probleme mit Bold Payment API

### 5. Bold Payment Link Fehler
- **Datei:** `docs/technical/BOLD_PAYMENT_LINK_FEHLER_WIEDERKEHREND_2025-01-22.md`
- **Inhalt:** Wiederkehrende Probleme mit Payment-Link-Erstellung

### 6. WhatsApp Webhook Setup (Referenz)
- **Datei:** `docs/technical/WHATSAPP_WEBHOOK_SETUP.md`
- **Inhalt:** Ähnliche Webhook-Setup-Anleitung für WhatsApp (als Referenz)

## Implementierungsplan

### Phase 1: Webhook-Konfiguration im Dashboard ✅

**Ziel:** Webhook im Bold Payment Dashboard korrekt konfigurieren

**Schritte:**
1. ✅ Bold Payment Dashboard öffnen
2. ✅ Zu "Integraciones" → "Webhooks" navigieren
3. ✅ Webhook erstellen:
   - **URL:** `https://65.109.228.106.nip.io/api/bold-payment/webhook`
   - **Events:** 
     - ✅ "Venta aprobada" (KRITISCH)
     - ✅ "Venta rechazada" (Optional)
     - ✅ "Anulación aprobada" (Optional)
     - ✅ "Anulación rechazada" (Optional)
4. ✅ Webhook speichern

**Dokumentation:** `docs/technical/BOLD_PAYMENT_WEBHOOK_SETUP.md` - Schritt 2

### Phase 2: Server-Konfiguration prüfen ✅

**Ziel:** Sicherstellen, dass Server bereit ist, Webhooks zu empfangen

**Schritte:**
1. ✅ Prüfe `APP_URL` in `.env`:
   ```bash
   cd /var/www/intranet/backend
   grep APP_URL .env
   ```
   Sollte sein: `APP_URL=https://65.109.228.106.nip.io`

2. ✅ Prüfe Webhook-Endpunkt erreichbar:
   ```bash
   curl -X POST https://65.109.228.106.nip.io/api/bold-payment/webhook \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   ```

3. ✅ Prüfe Route registriert:
   - Datei: `backend/src/routes/boldPayment.ts`
   - Route: `POST /api/bold-payment/webhook`

**Dokumentation:** `docs/technical/BOLD_PAYMENT_WEBHOOK_SETUP.md` - Schritt 1

### Phase 3: Webhook-Logging verbessern 🔄

**Ziel:** Bessere Diagnose durch verbessertes Logging

**Schritte:**
1. ✅ Code anpassen: `backend/src/services/boldPaymentService.ts`
2. ✅ Verbessertes Logging hinzufügen (siehe Code-Beispiel unten)
3. ✅ Deployment auf Produktivserver

**Code-Änderung:**
```typescript
// In handleWebhook(), nach Zeile 536:
console.log('[Bold Payment Webhook] ========================================');
console.log('[Bold Payment Webhook] Event:', event);
console.log('[Bold Payment Webhook] Vollständiger Payload:', JSON.stringify(payload, null, 2));
console.log('[Bold Payment Webhook] Data:', JSON.stringify(data, null, 2));
console.log('[Bold Payment Webhook] Metadata:', JSON.stringify(data?.metadata, null, 2));
console.log('[Bold Payment Webhook] Reference:', data?.reference);
console.log('[Bold Payment Webhook] Payment Link:', data?.payment_link);
console.log('[Bold Payment Webhook] ========================================');
```

**Dokumentation:** `docs/technical/BOLD_PAYMENT_WEBHOOK_SETUP.md` - Schritt 6

### Phase 4: Reservation-Findung verbessern 🔄

**Ziel:** Mehrere Wege, um Reservation zu finden

**Problem:** Aktuell wird nur nach `reference` oder `metadata.reservation_id` gesucht. Wenn beides fehlt, wird Reservation nicht gefunden.

**Lösung:** Payment-Link-ID als Fallback verwenden

**Schritte:**
1. ✅ Migration: `paymentLinkId` Feld zur Reservation hinzufügen
2. ✅ Code anpassen: Payment-Link-ID beim Erstellen speichern
3. ✅ Code anpassen: Im Webhook nach Payment-Link-ID suchen

**Migration:**
```prisma
model Reservation {
  // ... bestehende Felder ...
  paymentLink      String?
  paymentLinkId    String? // NEU: Speichere Link-ID (z.B. "LNK_4FK3BGFTTX")
  @@index([paymentLinkId])
}
```

**Code-Änderung 1:** Beim Erstellen des Payment-Links
```typescript
// In createPaymentLink(), nach Zeile 392:
await prisma.reservation.update({
  where: { id: reservation.id },
  data: { 
    paymentLink: paymentLinkUrl,
    paymentLinkId: paymentLinkId // NEU
  }
});
```

**Code-Änderung 2:** Im Webhook-Handler
```typescript
// In handleWebhook(), nach Zeile 552:
// Fallback: Suche über Payment-Link-ID
if (!reservationId && data.payment_link) {
  const reservation = await prisma.reservation.findFirst({
    where: { paymentLinkId: data.payment_link }
  });
  if (reservation) {
    reservationId = reservation.id;
    console.log(`[Bold Payment Webhook] ✅ Reservation gefunden über Payment-Link-ID: ${data.payment_link}`);
  }
}
```

**Dokumentation:** `docs/technical/RESERVATION_18241537_DIAGNOSE_UND_FIX.md` - Lösung 2

### Phase 5: Metadata hinzufügen (optional) 🔄

**Ziel:** Metadata beim Payment-Link-Erstellen hinzufügen (falls API unterstützt)

**Schritte:**
1. ✅ Bold Payment API-Dokumentation prüfen
2. ✅ Falls unterstützt: Metadata zum Payload hinzufügen
3. ✅ Code anpassen: `backend/src/services/boldPaymentService.ts`

**Code-Änderung:**
```typescript
// In createPaymentLink(), nach Zeile 362:
const payload: any = {
  // ... bestehende Felder ...
  reference: reference,
  metadata: {
    reservation_id: reservation.id,
    organization_id: reservation.organizationId,
    branch_id: reservation.branchId || null
  }
};
```

**Dokumentation:** `docs/technical/RESERVATION_18241537_DIAGNOSE_UND_FIX.md` - Lösung 1

### Phase 6: Test und Validierung ✅

**Ziel:** Sicherstellen, dass Webhook-System funktioniert

**Schritte:**
1. ✅ Test-Payment durchführen
2. ✅ Webhook-Empfang prüfen (Server-Logs)
3. ✅ Reservation-Findung prüfen
4. ✅ Status-Update prüfen
5. ✅ Auto-Check-in prüfen (wenn Check-in-Datum erreicht)

**Prüfungs-Script:**
```bash
# Auf Server:
cd /var/www/intranet/backend
npx ts-node scripts/check-reservation-status-18241537.ts
```

**Dokumentation:** `docs/technical/RESERVATION_STATUS_PROBLEM_PRUEFUNG.md`

## Priorisierung

### 🔴 KRITISCH (Sofort)
1. **Webhook im Dashboard konfigurieren** - Ohne das funktioniert nichts
2. **Server-Konfiguration prüfen** - Sicherstellen, dass Endpunkt erreichbar ist

### 🟡 WICHTIG (Kurzfristig)
3. **Webhook-Logging verbessern** - Für bessere Diagnose
4. **Reservation-Findung verbessern** - Mehrere Fallback-Mechanismen

### 🟢 OPTIONAL (Mittelfristig)
5. **Metadata hinzufügen** - Falls API unterstützt
6. **Webhook-Secret-Validierung** - Für Sicherheit

## Deployment-Plan

### Schritt 1: Code-Änderungen (lokal)
1. Webhook-Logging verbessern
2. Payment-Link-ID speichern
3. Reservation-Findung verbessern
4. Tests durchführen

### Schritt 2: Migration (Produktivserver)
1. Migration ausführen: `npx prisma migrate deploy`
2. Prisma Client aktualisieren: `npx prisma generate`

### Schritt 3: Deployment
1. Code auf Server deployen
2. Server neu starten (nach Rücksprache)
3. Logs prüfen

### Schritt 4: Validierung
1. Test-Payment durchführen
2. Webhook-Empfang prüfen
3. Status-Update prüfen

## Monitoring

### Regelmäßige Prüfungen
1. **Server-Logs:** Prüfe auf Webhook-Events
   ```bash
   pm2 logs intranet-backend | grep -i "bold.*payment.*webhook"
   ```

2. **Webhook-Historie:** Prüfe im Bold Payment Dashboard

3. **Reservation-Status:** Prüfe ob Status korrekt aktualisiert wird

### Alerts
- Wenn Webhook nicht ankommt → Alert
- Wenn Reservation nicht gefunden wird → Alert
- Wenn Status-Update fehlschlägt → Alert

## Erfolgs-Kriterien

✅ **Webhook empfangen:**
- Server-Logs zeigen Webhook-Empfang
- Webhook-Historie im Dashboard zeigt erfolgreiche Events

✅ **Reservation gefunden:**
- Logs zeigen "Reservation gefunden"
- Keine Warnungen "Reservation nicht gefunden"

✅ **Status aktualisiert:**
- Payment Status wird auf `paid` gesetzt
- Status wird auf `checked_in` gesetzt (wenn Check-in-Datum erreicht)

✅ **Keine manuellen Korrekturen:**
- Alle Status-Updates erfolgen automatisch via Webhook
- Keine manuellen SQL-Updates erforderlich

## Nächste Schritte

1. **Sofort:** Webhook im Bold Payment Dashboard konfigurieren
2. **Heute:** Server-Konfiguration prüfen und Webhook-Logging verbessern
3. **Diese Woche:** Reservation-Findung verbessern (Payment-Link-ID)
4. **Optional:** Metadata hinzufügen (falls API unterstützt)

## Dokumentation

Alle relevanten Dokumente:
- ✅ `docs/technical/BOLD_PAYMENT_WEBHOOK_SETUP.md` - Setup-Anleitung
- ✅ `docs/technical/BOLD_PAYMENT_WEBHOOK_IMPLEMENTATION_PLAN.md` - Dieser Plan
- ✅ `docs/technical/RESERVATION_18241537_DIAGNOSE_UND_FIX.md` - Diagnose
- ✅ `docs/technical/RESERVATION_STATUS_PROBLEM_PRUEFUNG.md` - Prüfungs-Anleitung


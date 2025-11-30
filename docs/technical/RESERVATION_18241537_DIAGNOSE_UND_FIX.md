# Reservation 18241537 - Diagnose und Fix

## Problem

Reservation 18241537 (interne ID: 15120) hat bezahlt und eingecheckt, aber beide Status wurden nicht aktualisiert:
- Payment Status: `pending` (sollte `paid` sein)
- Status: `confirmed` (sollte `checked_in` sein)
- Online Check-in: `false` (sollte `true` sein)

## Diagnose-Ergebnisse

### 1. Reservation-Details
- **Interne ID**: 15120
- **LobbyPMS ID**: 18241537
- **Gast**: Alejandra Villa
- **Payment Link**: `LNK_4FK3BGFTTX`
- **Letzte Aktualisierung**: 2025-11-30T05:24:58.627Z

### 2. Sync-History
- Letzte Sync: 2025-11-30T05:24:58.637Z
- **Checked In**: `false` (in LobbyPMS)
- **Paid Out**: `0` (in LobbyPMS)
- **Total To Pay**: 11880

### 3. Webhook-Events
- **KEINE Bold Payment Webhook-Events** in den Logs gefunden
- **KEINE LobbyPMS Webhook-Events** in den Logs gefunden

## Root Cause Analysis

### Problem 1: Webhook wurde nicht empfangen

**Mögliche Ursachen:**
1. Webhook-Endpunkt nicht erreichbar (Firewall, Ports)
2. Webhook wurde nicht von Bold Payment gesendet
3. Webhook wurde gesendet, aber nicht verarbeitet (Fehler in der Verarbeitung)

### Problem 2: Reservation-ID nicht im Webhook-Payload

**Aktueller Code:**
```typescript
// createPaymentLink() - KEINE Metadata!
const payload: any = {
  reference: `RES-${reservation.id}-${timestamp}`,
  // KEINE metadata mit reservation_id!
};

// handleWebhook() - Sucht nach Metadata
if (data.metadata?.reservation_id) {
  reservationId = parseInt(String(data.metadata.reservation_id), 10);
} else if (data.reference) {
  // Fallback: Extrahiere aus Reference
  const match = String(data.reference).match(/^RES-(\d+)-/);
  if (match && match[1]) {
    reservationId = parseInt(match[1], 10);
  }
}
```

**Problem:** 
- Wenn Bold Payment die `reference` nicht im Webhook-Payload zurückgibt, kann die Reservation nicht gefunden werden
- Metadata wird nicht übergeben, daher ist der Fallback auf `reference` kritisch

## Lösungsvorschläge

### Lösung 1: Metadata beim Payment-Link-Erstellen hinzufügen

**Fix:** Füge `metadata` mit `reservation_id` zum Payload hinzu (falls Bold Payment API dies unterstützt)

```typescript
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

### Lösung 2: Payment-Link-ID in Datenbank speichern

**Fix:** Speichere die Payment-Link-ID (`LNK_...`) in der Datenbank und suche danach im Webhook

```typescript
// Beim Erstellen des Payment-Links:
await prisma.reservation.update({
  where: { id: reservation.id },
  data: { 
    paymentLink: paymentLinkUrl,
    paymentLinkId: paymentLinkId // NEU: Speichere Link-ID
  }
});

// Im Webhook-Handler:
if (data.payment_link || data.link_id) {
  const linkId = data.payment_link || data.link_id;
  const reservation = await prisma.reservation.findFirst({
    where: { paymentLinkId: linkId }
  });
}
```

### Lösung 3: Webhook-Logging verbessern

**Fix:** Logge alle Webhook-Events, auch wenn Reservation nicht gefunden wird

```typescript
console.log('[Bold Payment Webhook] Vollständiger Payload:', JSON.stringify(payload, null, 2));
console.log('[Bold Payment Webhook] Event:', event);
console.log('[Bold Payment Webhook] Data:', JSON.stringify(data, null, 2));
```

## Sofort-Fix: Manuelle Status-Korrektur

Da die Reservation bereits bezahlt und eingecheckt wurde, sollte der Status manuell korrigiert werden:

### Option 1: Via Prisma Studio

```bash
cd /var/www/intranet/backend
npx prisma studio
```

Dann manuell in der GUI:
- `status` → `checked_in`
- `paymentStatus` → `paid`
- `onlineCheckInCompleted` → `true`
- `onlineCheckInCompletedAt` → Aktuelles Datum

### Option 2: Via SQL

```sql
UPDATE "Reservation" 
SET 
  status = 'checked_in',
  "paymentStatus" = 'paid',
  "onlineCheckInCompleted" = true,
  "onlineCheckInCompletedAt" = NOW(),
  "updatedAt" = NOW()
WHERE id = 15120;
```

## Langfristiger Fix: Code-Änderungen

### 1. Metadata hinzufügen (falls API unterstützt)

**Datei:** `backend/src/services/boldPaymentService.ts`

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

### 2. Payment-Link-ID speichern

**Schritt 1:** Migration für neues Feld `paymentLinkId`

```prisma
model Reservation {
  // ... bestehende Felder ...
  paymentLink      String?
  paymentLinkId    String? // NEU: Speichere Link-ID (z.B. "LNK_4FK3BGFTTX")
}
```

**Schritt 2:** Code anpassen

```typescript
// In createPaymentLink(), nach Zeile 392:
await prisma.reservation.update({
  where: { id: reservation.id },
  data: { 
    paymentLink: paymentLinkUrl,
    paymentLinkId: paymentLinkId // NEU
  }
});

// In handleWebhook(), nach Zeile 540:
// Fallback: Suche über Payment-Link-ID
if (!reservationId && data.payment_link) {
  const reservation = await prisma.reservation.findFirst({
    where: { paymentLinkId: data.payment_link }
  });
  if (reservation) {
    reservationId = reservation.id;
  }
}
```

### 3. Webhook-Logging verbessern

**Datei:** `backend/src/services/boldPaymentService.ts`

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

## Nächste Schritte

1. **Sofort:** Manuelle Status-Korrektur durchführen (siehe "Sofort-Fix")
2. **Kurzfristig:** Webhook-Logging verbessern, um zukünftige Probleme zu diagnostizieren
3. **Mittelfristig:** Payment-Link-ID in Datenbank speichern und als Fallback verwenden
4. **Langfristig:** Metadata hinzufügen (falls Bold Payment API unterstützt)

## Prüfung nach Fix

Nach dem Fix sollte geprüft werden:

1. **Webhook-Events werden empfangen:**
   ```bash
   pm2 logs intranet-backend | grep -i "bold.*payment.*webhook"
   ```

2. **Reservation wird gefunden:**
   ```bash
   pm2 logs intranet-backend | grep -i "reservation.*15120\|reservation.*18241537"
   ```

3. **Status wird aktualisiert:**
   ```bash
   npx ts-node scripts/check-reservation-status-18241537.ts
   ```

## Prävention

Um zukünftige Probleme zu vermeiden:

1. **Webhook-Monitoring:** Regelmäßig prüfen, ob Webhooks empfangen werden
2. **Logging:** Alle Webhook-Events loggen, auch bei Fehlern
3. **Fallback-Mechanismen:** Mehrere Wege, um Reservation zu finden (ID, Reference, Payment-Link-ID)
4. **Manuelle Korrektur:** Script für manuelle Status-Korrektur bei Bedarf


# LobbyPMS Reservation Import - Analyse und Plan

## Datum
2025-01-22

## Überblick
Analyse und Planung für Verbesserungen am LobbyPMS Reservation Import:
1. Zimmername für Dorms hinzufügen
2. 5% Aufschlag für Kartenzahlung bei Preisberechnung hinzufügen und ausweisen

---

## 1. Analyse: Aktueller Stand

### 1.1 Zimmername-Import

#### Aktuelle Implementierung
**Datei:** `backend/src/services/lobbyPmsService.ts` (Zeilen 592-594)

```typescript
// Zimmer-Daten aus assigned_room-Objekt
const roomNumber = lobbyReservation.assigned_room?.name || lobbyReservation.room_number || null;
const roomDescription = lobbyReservation.assigned_room?.type || lobbyReservation.room_description || lobbyReservation.category?.name || null;
```

#### API-Datenstruktur (aus `backend/lobbypms-api-discovery-results.json`)

**Für Privatzimmer (type: "privada"):**
```json
{
  "assigned_room": {
    "type": "privada",
    "name": "El abuelo bromista"  // Zimmername
  },
  "category": {
    "category_id": 34312,
    "name": "Doble básica"  // Kategorie
  }
}
```
✅ **Status:** Funktioniert korrekt - Zimmername wird importiert

**Für Dorms (type: "compartida"):**
```json
{
  "assigned_room": {
    "type": "compartida",
    "name": "Cama 5"  // Nur Bettnummer, kein Zimmername!
  },
  "category": {
    "category_id": 34281,
    "name": "La tia artista"  // Möglicherweise Zimmername?
  }
}
```
❌ **Problem:** Nur Bettnummer wird importiert, Zimmername fehlt

#### Datenbank-Schema
**Datei:** `backend/prisma/schema.prisma` (Zeilen 1113-1114)
```prisma
roomNumber       String?  // Aktuell: Bettnummer für Dorms, Zimmername für Privatzimmer
roomDescription  String?  // Aktuell: Zimmertyp (compartida/privada) oder Kategorie
```

#### Problem-Details
- **Privatzimmer:** `assigned_room.name` enthält den Zimmernamen → ✅ Funktioniert
- **Dorms:** `assigned_room.name` enthält nur die Bettnummer (z.B. "Cama 5") → ❌ Zimmername fehlt
- **Mögliche Lösung:** `category.name` könnte den Zimmernamen für Dorms enthalten (z.B. "La tia artista")
- **Zu prüfen:** Ob `category.name` tatsächlich den Zimmernamen für Dorms enthält oder nur die Kategorie

### 1.2 Preisberechnung mit 5% Aufschlag

#### Aktuelle Implementierung
**Datei:** `backend/src/services/lobbyPmsService.ts` (Zeilen 606-621)

```typescript
// Payment Status: API gibt paid_out und total_to_pay zurück
let paymentStatus: PaymentStatus = PaymentStatus.pending;
const paidOut = parseFloat(lobbyReservation.paid_out || '0');
const totalToPay = parseFloat(lobbyReservation.total_to_pay || lobbyReservation.total_to_pay_accommodation || '0');
// ... Payment Status Logik ...

// Setze amount aus totalToPay (für Payment-Link-Erstellung)
const amount = totalToPay > 0 ? totalToPay : null;
// Setze currency (Standard: COP, könnte auch aus API kommen)
const currency = lobbyReservation.currency || 'COP';
```

**Datei:** `backend/src/services/boldPaymentService.ts` (Zeilen 217-309)

```typescript
async createPaymentLink(
  reservation: Reservation,
  amount: number,  // Wird direkt verwendet, ohne Aufschlag
  currency: string = 'COP',
  description?: string
): Promise<string> {
  // ... amount wird direkt in Payload verwendet ...
  const payload: any = {
    amount_type: 'CLOSE',
    amount: {
      currency: currency,
      total_amount: amount,  // Kein 5% Aufschlag
      subtotal: amount,
      taxes: [],
      tip_amount: 0
    },
    // ...
  };
}
```

**Datei:** `backend/src/queues/workers/updateGuestContactWorker.ts` (Zeilen 84-100)

```typescript
// Konvertiere amount von Decimal zu number
let amount: number = 360000; // Default Placeholder
if (reservation.amount) {
  // ... Konvertierung ...
}
paymentLink = await boldPaymentService.createPaymentLink(
  reservation,
  amount,  // Wird direkt verwendet, ohne 5% Aufschlag
  reservation.currency || 'COP',
  `Zahlung für Reservierung ${guestName}`
);
```

#### Problem-Details
- **Aktuell:** `total_to_pay` wird direkt als `amount` gespeichert und verwendet
- **Fehlend:** 5% Aufschlag für Kartenzahlung wird nicht hinzugefügt
- **Fehlend:** Aufschlag wird nicht ausgewiesen (weder in DB noch in Payment-Link)
- **Anforderung:** 5% Aufschlag muss bei Preisberechnung hinzugefügt werden
- **Anforderung:** Aufschlag muss ausgewiesen werden (z.B. in Payment-Link-Beschreibung oder separatem Feld)

---

## 2. Plan: Implementierung

### 2.1 Zimmername für Dorms hinzufügen

#### Schritt 1: API-Datenstruktur prüfen
**Ziel:** Bestätigen, dass `category.name` den Zimmernamen für Dorms enthält

**Vorgehen:**
1. Test-Script ausführen: `backend/scripts/test-lobbypms-fetch.ts`
2. Prüfen, ob `category.name` bei Dorms den Zimmernamen enthält (z.B. "La tia artista")
3. Alternativ: LobbyPMS API-Dokumentation prüfen oder Support kontaktieren

**Erwartetes Ergebnis:**
- `category.name` enthält den Zimmernamen für Dorms
- Oder: Anderes Feld identifiziert, das den Zimmernamen enthält

#### Schritt 2: Code-Anpassung
**Datei:** `backend/src/services/lobbyPmsService.ts`

**Aktueller Code (Zeilen 592-594):**
```typescript
// Zimmer-Daten aus assigned_room-Objekt
const roomNumber = lobbyReservation.assigned_room?.name || lobbyReservation.room_number || null;
const roomDescription = lobbyReservation.assigned_room?.type || lobbyReservation.room_description || lobbyReservation.category?.name || null;
```

**Neuer Code (Vorschlag):**
```typescript
// Zimmer-Daten aus assigned_room-Objekt
const assignedRoom = lobbyReservation.assigned_room;
const isDorm = assignedRoom?.type === 'compartida';

let roomNumber: string | null = null;
let roomDescription: string | null = null;

if (isDorm) {
  // Für Dorms: category.name = Zimmername, assigned_room.name = Bettnummer
  const dormName = lobbyReservation.category?.name || null;
  const bedNumber = assignedRoom?.name || null;
  roomNumber = bedNumber; // Bettnummer (z.B. "Cama 5")
  roomDescription = dormName; // Zimmername (z.B. "La tia artista")
} else {
  // Für Privatzimmer: assigned_room.name = Zimmername
  roomNumber = assignedRoom?.name || lobbyReservation.room_number || null;
  roomDescription = assignedRoom?.type || lobbyReservation.room_description || lobbyReservation.category?.name || null;
}
```

**Alternative (falls category.name nicht der Zimmername ist):**
- Prüfen, ob es ein anderes Feld gibt (z.B. `room.name`, `dorm.name`, etc.)
- Falls nicht verfügbar: Logging hinzufügen und User informieren

#### Schritt 3: Datenbank-Schema prüfen
**Status:** ✅ Keine Änderung nötig
- `roomNumber` und `roomDescription` sind bereits vorhanden
- Für Dorms: `roomNumber` = Bettnummer, `roomDescription` = Zimmername

#### Schritt 4: Frontend-Anpassung (falls nötig)
**Zu prüfen:**
- Wie wird `roomNumber` und `roomDescription` im Frontend angezeigt?
- Müssen Anzeige-Logik angepasst werden, um Zimmername für Dorms korrekt anzuzeigen?

**Dateien zu prüfen:**
- `frontend/src/components/ReservationCard.tsx`
- `frontend/src/components/ReservationDetails.tsx`
- `frontend/src/pages/ReservationsPage.tsx`

### 2.2 5% Aufschlag für Kartenzahlung

#### Schritt 1: Datenbank-Schema erweitern (optional)
**Option A: Separates Feld für Aufschlag**
```prisma
model Reservation {
  // ... bestehende Felder ...
  amount                   Decimal?  @db.Decimal(10, 2) // Basispreis (ohne Aufschlag)
  cardPaymentSurcharge     Decimal?  @db.Decimal(10, 2) // 5% Aufschlag für Kartenzahlung
  totalAmount              Decimal?  @db.Decimal(10, 2) // Gesamtpreis (mit Aufschlag)
  currency                 String?   @default("COP")
}
```

**Option B: Nur in Payment-Link ausweisen (keine DB-Änderung)**
- Aufschlag wird nur bei Payment-Link-Erstellung hinzugefügt
- Wird in Payment-Link-Beschreibung ausgewiesen
- Keine Migration nötig

**Empfehlung:** Option B (keine DB-Änderung), da Aufschlag nur für Kartenzahlung relevant ist

#### Schritt 2: Code-Anpassung - syncReservation
**Datei:** `backend/src/services/lobbyPmsService.ts`

**Aktueller Code (Zeilen 618-621):**
```typescript
// Setze amount aus totalToPay (für Payment-Link-Erstellung)
const amount = totalToPay > 0 ? totalToPay : null;
// Setze currency (Standard: COP, könnte auch aus API kommen)
const currency = lobbyReservation.currency || 'COP';
```

**Neuer Code (Vorschlag):**
```typescript
// Setze amount aus totalToPay (Basispreis ohne Aufschlag)
const amount = totalToPay > 0 ? totalToPay : null;
// Setze currency (Standard: COP, könnte auch aus API kommen)
const currency = lobbyReservation.currency || 'COP';
// HINWEIS: 5% Aufschlag für Kartenzahlung wird bei Payment-Link-Erstellung hinzugefügt
```

**Status:** ✅ Keine Änderung nötig, da Basispreis korrekt gespeichert wird

#### Schritt 3: Code-Anpassung - createPaymentLink
**Datei:** `backend/src/services/boldPaymentService.ts`

**Aktueller Code (Zeilen 217-309):**
```typescript
async createPaymentLink(
  reservation: Reservation,
  amount: number,
  currency: string = 'COP',
  description?: string
): Promise<string> {
  // ... amount wird direkt verwendet ...
  const payload: any = {
    amount_type: 'CLOSE',
    amount: {
      currency: currency,
      total_amount: amount,  // Kein Aufschlag
      subtotal: amount,
      taxes: [],
      tip_amount: 0
    },
    // ...
  };
}
```

**Neuer Code (Vorschlag):**
```typescript
async createPaymentLink(
  reservation: Reservation,
  amount: number,
  currency: string = 'COP',
  description?: string
): Promise<string> {
  // ... Validierung ...

  // 5% Aufschlag für Kartenzahlung hinzufügen
  const CARD_PAYMENT_SURCHARGE_PERCENT = 0.05; // 5%
  const baseAmount = amount;
  const surcharge = baseAmount * CARD_PAYMENT_SURCHARGE_PERCENT;
  const totalAmount = baseAmount + surcharge;

  // Beschreibung mit Aufschlagsausweis
  const paymentDescription = (description || 
    `Reservierung ${reservation.guestName}`).substring(0, 100);
  
  const surchargeDescription = `${paymentDescription} (inkl. 5% Kartenzahlungsaufschlag)`;
  const finalDescription = surchargeDescription.substring(0, 100);

  // ... Reference, etc. ...

  const payload: any = {
    amount_type: 'CLOSE',
    amount: {
      currency: currency,
      total_amount: totalAmount,  // Mit 5% Aufschlag
      subtotal: baseAmount,  // Basispreis
      taxes: [
        {
          name: 'Kartenzahlungsaufschlag',
          amount: surcharge,
          rate: 5.0  // 5%
        }
      ],
      tip_amount: 0
    },
    reference: reference,
    description: finalDescription,  // Mit Aufschlagsausweis
    // ...
  };
}
```

#### Schritt 4: Code-Anpassung - updateGuestContactWorker
**Datei:** `backend/src/queues/workers/updateGuestContactWorker.ts`

**Status:** ✅ Keine Änderung nötig
- Worker ruft `boldPaymentService.createPaymentLink()` auf
- Aufschlag wird automatisch in `createPaymentLink()` hinzugefügt

#### Schritt 5: Frontend-Anpassung (falls nötig)
**Zu prüfen:**
- Wird der Preis im Frontend angezeigt?
- Muss der Aufschlag in der Anzeige ausgewiesen werden?

**Dateien zu prüfen:**
- `frontend/src/components/ReservationCard.tsx`
- `frontend/src/components/ReservationDetails.tsx`
- `frontend/src/pages/ReservationsPage.tsx`

---

## 3. Offene Fragen

### 3.1 Zimmername für Dorms
- **Frage:** Enthält `category.name` tatsächlich den Zimmernamen für Dorms?
- **Prüfung:** Test-Script ausführen und echte API-Response analysieren
- **Fallback:** Falls nicht verfügbar, User informieren und Logging hinzufügen

### 3.2 5% Aufschlag
- **Frage:** Soll der Aufschlag in der Datenbank gespeichert werden oder nur bei Payment-Link-Erstellung?
- **Empfehlung:** Nur bei Payment-Link-Erstellung (keine DB-Änderung nötig)
- **Frage:** Soll der Aufschlag im Frontend angezeigt werden?
- **Empfehlung:** Ja, in Payment-Link-Beschreibung ausweisen

### 3.3 Währung
- **Frage:** Gilt der 5% Aufschlag für alle Währungen?
- **Aktuell:** Standard ist COP, könnte auch USD/EUR sein
- **Empfehlung:** Aufschlag für alle Währungen anwenden

---

## 4. Implementierungsreihenfolge

### Phase 1: Zimmername für Dorms
1. ✅ API-Datenstruktur prüfen (Test-Script ausführen)
2. ⏳ Code-Anpassung in `lobbyPmsService.ts`
3. ⏳ Frontend-Anpassung (falls nötig)
4. ⏳ Testen mit echten Daten

### Phase 2: 5% Aufschlag für Kartenzahlung
1. ⏳ Code-Anpassung in `boldPaymentService.ts`
2. ⏳ Frontend-Anpassung (falls nötig)
3. ⏳ Testen mit echten Payment-Links

---

## 5. Test-Plan

### 5.1 Zimmername für Dorms
- [ ] Test mit Dorm-Reservierung: Prüfen, ob `category.name` den Zimmernamen enthält
- [ ] Test mit Privatzimmer-Reservierung: Prüfen, ob weiterhin korrekt funktioniert
- [ ] Frontend-Test: Prüfen, ob Zimmername für Dorms korrekt angezeigt wird

### 5.2 5% Aufschlag
- [ ] Test: Payment-Link mit Basispreis 100.000 COP → Erwartet: 105.000 COP
- [ ] Test: Payment-Link-Beschreibung enthält Aufschlagsausweis
- [ ] Test: Payment-Link-Payload enthält korrekte Steuer-Informationen
- [ ] Test: Verschiedene Währungen (COP, USD, EUR)

---

## 6. Dokumentation

### 6.1 Code-Kommentare
- Kommentare in `lobbyPmsService.ts` aktualisieren
- Kommentare in `boldPaymentService.ts` aktualisieren

### 6.2 API-Dokumentation
- Falls nötig: LobbyPMS API-Dokumentation aktualisieren

---

## 7. Risiken und Mitigation

### 7.1 Zimmername für Dorms
- **Risiko:** `category.name` enthält nicht den Zimmernamen
- **Mitigation:** Test-Script ausführen, Logging hinzufügen, User informieren

### 7.2 5% Aufschlag
- **Risiko:** Aufschlag wird doppelt berechnet
- **Mitigation:** Nur in `createPaymentLink()` hinzufügen, nicht in `syncReservation()`
- **Risiko:** Aufschlag wird für andere Zahlungsmethoden angewendet
- **Mitigation:** Nur bei Kartenzahlung (Payment-Link) anwenden

---

## 8. Nächste Schritte

1. **Sofort:** Test-Script ausführen, um API-Datenstruktur zu prüfen
2. **Nach Bestätigung:** Code-Anpassungen implementieren
3. **Nach Implementierung:** Tests durchführen
4. **Nach Tests:** Dokumentation aktualisieren

---

## 9. Zusammenfassung

### Problem 1: Zimmername für Dorms
- **Aktuell:** Nur Bettnummer wird importiert
- **Lösung:** `category.name` als Zimmername für Dorms verwenden
- **Status:** ✅ **IMPLEMENTIERT** (2025-01-22)

### Problem 2: 5% Aufschlag für Kartenzahlung
- **Aktuell:** Kein Aufschlag wird hinzugefügt
- **Lösung:** 5% Aufschlag bei Payment-Link-Erstellung hinzufügen und ausweisen
- **Status:** ✅ **IMPLEMENTIERT** (2025-01-22)

---

## 10. Implementierung (2025-01-22)

### 10.1 Zimmername für Dorms - Implementiert

**Datei:** `backend/src/services/lobbyPmsService.ts` (Zeilen 592-610)

**Änderung:**
- Unterscheidung zwischen Dorms (`type: "compartida"`) und Privatzimmern (`type: "privada"`)
- Für Dorms: `roomNumber` = Bettnummer (`assigned_room.name`), `roomDescription` = Zimmername (`category.name`)
- Für Privatzimmer: Unverändert - `roomNumber` = Zimmername (`assigned_room.name`)

**Code:**
```typescript
// Zimmer-Daten aus assigned_room-Objekt
// WICHTIG: Für Dorms (compartida) enthält assigned_room.name nur die Bettnummer,
// der Zimmername steht in category.name. Für Privatzimmer (privada) steht der
// Zimmername direkt in assigned_room.name.
const assignedRoom = lobbyReservation.assigned_room;
const isDorm = assignedRoom?.type === 'compartida';

let roomNumber: string | null = null;
let roomDescription: string | null = null;

if (isDorm) {
  // Für Dorms: category.name = Zimmername, assigned_room.name = Bettnummer
  const dormName = lobbyReservation.category?.name || null;
  const bedNumber = assignedRoom?.name || null;
  roomNumber = bedNumber; // Bettnummer (z.B. "Cama 5")
  roomDescription = dormName; // Zimmername (z.B. "La tia artista")
} else {
  // Für Privatzimmer: assigned_room.name = Zimmername
  roomNumber = assignedRoom?.name || lobbyReservation.room_number || null;
  roomDescription = assignedRoom?.type || lobbyReservation.room_description || lobbyReservation.category?.name || null;
}
```

**Ergebnis:**
- ✅ Dorms: Zimmername wird jetzt korrekt aus `category.name` importiert
- ✅ Privatzimmer: Funktioniert weiterhin wie bisher
- ✅ Keine Breaking Changes

### 10.2 5% Aufschlag für Kartenzahlung - Implementiert

**Datei:** `backend/src/services/boldPaymentService.ts` (Zeilen 251-280)

**Änderung:**
- 5% Aufschlag wird bei Payment-Link-Erstellung automatisch hinzugefügt
- Aufschlag wird als Steuer im Payment-Link-Payload ausgewiesen
- Beschreibung enthält Hinweis auf Aufschlag

**Code:**
```typescript
// 5% Aufschlag für Kartenzahlung hinzufügen
const CARD_PAYMENT_SURCHARGE_PERCENT = 0.05; // 5%
const baseAmount = amount;
const surcharge = Math.round(baseAmount * CARD_PAYMENT_SURCHARGE_PERCENT * 100) / 100; // Auf 2 Dezimalstellen runden
const totalAmount = baseAmount + surcharge;

// Beschreibung mit Aufschlagsausweis
const surchargeDescription = `${paymentDescription} (inkl. 5% Kartenzahlungsaufschlag)`;
const finalDescription = surchargeDescription.substring(0, 100);

// Payload gemäß API Link de pagos Dokumentation
const payload: any = {
  amount_type: 'CLOSE',
  amount: {
    currency: currency,
    total_amount: totalAmount, // Gesamtbetrag mit 5% Aufschlag
    subtotal: baseAmount, // Basispreis ohne Aufschlag
    taxes: [
      {
        name: 'Kartenzahlungsaufschlag',
        amount: surcharge,
        rate: 5.0 // 5%
      }
    ],
    tip_amount: 0
  },
  reference: reference,
  description: finalDescription, // Mit Aufschlagsausweis
};
```

**Ergebnis:**
- ✅ 5% Aufschlag wird automatisch bei Payment-Link-Erstellung hinzugefügt
- ✅ Aufschlag wird in Payment-Link-Beschreibung ausgewiesen
- ✅ Aufschlag wird als Steuer im Payment-Link-Payload übermittelt
- ✅ Basispreis wird in `subtotal` gespeichert, Gesamtbetrag in `total_amount`
- ✅ Keine Datenbank-Änderung nötig (Aufschlag nur bei Payment-Link-Erstellung)

### 10.3 Test-Ergebnisse

**Zimmername für Dorms:**
- ✅ Bestätigt: `category.name` enthält den Zimmernamen für Dorms (z.B. "La tia artista", "El primo aventurero")
- ✅ Bestätigt: `assigned_room.name` enthält nur die Bettnummer für Dorms (z.B. "Cama 5")
- ✅ Bestätigt: Für Privatzimmer funktioniert `assigned_room.name` weiterhin als Zimmername

**5% Aufschlag:**
- ⏳ Noch zu testen: Payment-Link-Erstellung mit echten Daten
- ⏳ Noch zu testen: Aufschlag-Berechnung (z.B. 100.000 COP → 105.000 COP)
- ⏳ Noch zu testen: Aufschlag-Ausweis in Payment-Link-Beschreibung

### 10.4 Nächste Schritte

1. **Tests auf Server:**
   - Test mit Dorm-Reservierung: Prüfen, ob Zimmername korrekt importiert wird
   - Test mit Privatzimmer-Reservierung: Prüfen, ob weiterhin korrekt funktioniert
   - Test: Payment-Link-Erstellung mit 5% Aufschlag

2. **Frontend-Anpassung (falls nötig):**
   - Prüfen, ob Zimmername für Dorms korrekt angezeigt wird
   - Prüfen, ob Aufschlag in Payment-Link-Beschreibung angezeigt wird

3. **Dokumentation:**
   - ✅ Analyse-Dokument aktualisiert
   - ⏳ Code-Kommentare hinzugefügt


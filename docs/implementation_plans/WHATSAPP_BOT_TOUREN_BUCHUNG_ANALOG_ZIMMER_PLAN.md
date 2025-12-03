# WhatsApp Bot - Tour-Buchung analog zu Zimmer-Reservierung - Detaillierter Implementierungsplan

**Datum:** 2025-01-30  
**Status:** PLANUNG - NICHTS UMSETZEN  
**Ziel:** Tour-Buchungen über WhatsApp Bot analog zu Zimmer-Reservierungen implementieren

---

## 📋 Zusammenfassung der Anforderungen

1. **Tour-Buchung anlegen:** Wenn ein Kunde eine Tour über WhatsApp bucht, wird eine `TourBooking` erstellt
2. **Zahlungslink versenden:** Zahlungslink wird per WhatsApp versendet mit Tour-Preis + 5% (analog zu Zimmer-Reservierungen)
3. **Barzahlung anbieten:** In der WhatsApp-Nachricht wird angeboten, die Tour in Bar an der Rezeption zwischen 09:00 & 17:30 zu bezahlen (um dem 5% Aufschlag zu entgehen, aber das nicht explizit schreiben)
4. **Webhook-Erweiterung:** Status der Tour-Buchung wird aktualisiert, sobald der Link bezahlt wurde (Webhook bereits teilweise implementiert)
5. **Tour an Reservation "heften":** Prüfen ob Reservation auf gleichen Namen besteht wie die Tour-Buchung & Tour an die Reservation "heften", falls möglich (inkl. separatem Zahlungslink)

---

## 🔍 Analyse: Was wurde für Zimmer-Reservierungen gemacht?

### 1. Reservation-Erstellung (`create_room_reservation`)

**Datei:** `backend/src/services/whatsappFunctionHandlers.ts` (Zeile 1454-1843)

**Ablauf:**
1. Parse Datum (unterstützt "today", "tomorrow", verschiedene Formate)
2. Validierung: Check-out muss mindestens 1 Tag nach Check-in liegen
3. Prüfe ob bereits "potential" Reservation existiert
4. Erstelle oder aktualisiere Reservation
5. Erstelle LobbyPMS-Buchung (nur bei Bestätigung)
6. Berechne Betrag aus Verfügbarkeitsprüfung
7. Setze Payment-Deadline (1 Stunde)
8. Erstelle Payment Link (mit Betrag + 5% automatisch durch `boldPaymentService`)
9. Versende Payment Link per WhatsApp via `ReservationNotificationService.sendReservationInvitation()`

**Wichtige Details:**
- Payment Link wird mit Betrag + 5% erstellt (automatisch in `boldPaymentService.createPaymentLink()`)
- WhatsApp-Nachricht wird über `ReservationNotificationService.sendReservationInvitation()` versendet
- Payment Link wird in `reservation.paymentLink` gespeichert

### 2. Payment Link Erstellung (`boldPaymentService.createPaymentLink`)

**Datei:** `backend/src/services/boldPaymentService.ts` (Zeile 274-474)

**Ablauf:**
1. Lädt Bold Payment Settings (Branch oder Organization)
2. Berechnet Betrag + 5% Aufschlag automatisch:
   ```typescript
   const CARD_PAYMENT_SURCHARGE_PERCENT = 0.05; // 5%
   const baseAmount = amount;
   const surcharge = Math.round(baseAmount * CARD_PAYMENT_SURCHARGE_PERCENT);
   const totalAmount = Math.round(baseAmount) + surcharge;
   ```
3. Erstellt Payment Link via Bold Payment API
4. Speichert Payment Link in `reservation.paymentLink`

**Wichtige Details:**
- Betrag + 5% wird automatisch hinzugefügt
- Payment Link wird in `reservation.paymentLink` gespeichert
- Reference-Format: `RES-{id}-{timestamp}`

### 3. WhatsApp-Versand (`ReservationNotificationService.sendReservationInvitation`)

**Datei:** `backend/src/services/reservationNotificationService.ts` (Zeile 205-1972)

**Ablauf:**
1. Lädt Reservation mit Organization
2. Prüft ob Payment Link bereits existiert (wiederverwenden)
3. Erstellt Payment Link falls nicht vorhanden
4. Erstellt Check-in-Link
5. Sendet WhatsApp-Nachricht mit:
   - Begrüßung
   - Reservierungsdetails
   - Payment Link
   - Check-in-Link
   - Hinweis auf Barzahlung (optional)

**Wichtige Details:**
- Prüft auf bestehenden Payment Link (Zeile 265-267)
- Erstellt Payment Link nur wenn nicht vorhanden
- WhatsApp-Nachricht wird in mehreren Sprachen versendet (DE/ES/EN)
- Nachricht enthält Payment Link und Check-in-Link

### 4. Webhook-Verarbeitung (`boldPaymentService.handleWebhook`)

**Datei:** `backend/src/services/boldPaymentService.ts` (Zeile 534-631)

**Ablauf:**
1. Empfängt Webhook von Bold Payment
2. Extrahiert Reservation ID aus Reference oder Metadata
3. Findet Reservation
4. Prüft ob es eine TourBooking gibt (via Payment Link)
5. Aktualisiert Payment Status:
   - Reservation: `paymentStatus = 'paid'`
   - TourBooking: `paymentStatus = 'paid'`, `amountPaid = totalPrice`, `amountPending = 0`
6. Sendet Bestätigung per WhatsApp (für TourBooking)

**Wichtige Details:**
- Webhook findet TourBooking via `paymentLink` (Zeile 573-586)
- Aktualisiert sowohl Reservation als auch TourBooking
- Sendet Bestätigung für TourBooking (Zeile 599-631)

### 5. Tour-Reservation Verknüpfung (`TourReservation`)

**Datei:** `backend/src/controllers/tourReservationController.ts`

**Model:** `TourReservation` (Prisma Schema, Zeile 1597-1624)

**Zweck:** Verknüpft eine Tour-Buchung mit einer Zimmer-Reservation

**Felder:**
- `tourId`, `bookingId`, `reservationId`
- `tourPrice`, `accommodationPrice`
- `tourPricePaid`, `tourPricePending`
- `accommodationPaid`, `accommodationPending`

**API-Endpunkte:**
- `POST /api/tour-reservations` - Verknüpfung erstellen
- `PUT /api/tour-reservations/:id` - Verknüpfung aktualisieren
- `DELETE /api/tour-reservations/:id` - Verknüpfung löschen
- `GET /api/tour-reservations/reservation/:reservationId` - Verknüpfungen einer Reservation
- `GET /api/tour-reservations/booking/:bookingId` - Verknüpfungen einer Buchung

---

## 🔍 Status: Was existiert bereits für Tour-Reservation Verknüpfung?

### ✅ Vorhanden:

1. **DB-Model `TourReservation`** (Prisma Schema, Zeile 1597-1624):
   - Verknüpft `Tour`, `TourBooking` und `Reservation`
   - Felder: `tourId`, `bookingId`, `reservationId`
   - Preisaufschlüsselung: `tourPrice`, `accommodationPrice`
   - Zahlungsstatus: `tourPricePaid`, `tourPricePending`, `accommodationPaid`, `accommodationPending`
   - Unique Constraint: `[reservationId, bookingId]` (verhindert Duplikate)

2. **Controller `tourReservationController.ts`**:
   - `POST /api/tour-reservations` - Manuelle Verknüpfung erstellen
   - `PUT /api/tour-reservations/:id` - Verknüpfung aktualisieren
   - `DELETE /api/tour-reservations/:id` - Verknüpfung löschen
   - `GET /api/tour-reservations/reservation/:reservationId` - Verknüpfungen einer Reservation
   - `GET /api/tour-reservations/booking/:bookingId` - Verknüpfungen einer Buchung

3. **Frontend-Komponente `TourReservationLinkModal.tsx`**:
   - Manuelles Verknüpfen im Frontend (Worktracker)
   - Zeigt verfügbare Reservierungen
   - Erstellt Verknüpfung mit Preisaufschlüsselung

### ❌ Fehlt noch:

1. **Automatische Suche nach Reservationen mit gleichem Namen:**
   - Funktion `findReservationByCustomerName()` existiert noch nicht
   - Sucht nach Name, Telefonnummer oder Email
   - Filtert nach Branch, Organization, Status

2. **Automatische Verknüpfung in `book_tour()`:**
   - Wird noch nicht automatisch aufgerufen
   - Erstellt `TourReservation` Verknüpfung wenn Reservation gefunden wird

---

## 🎯 Was muss für Touren implementiert werden?

### 1. Tour-Buchung anlegen (bereits vorhanden, muss erweitert werden)

**Aktueller Stand:**
- `book_tour()` existiert bereits in `whatsappFunctionHandlers.ts` (Zeile 1050-1223)
- Erstellt `TourBooking` mit allen notwendigen Feldern
- Erstellt "Dummy"-Reservation für Payment Link
- Generiert Payment Link (aber noch nicht per WhatsApp versendet)

**Was fehlt:**
- Payment Link wird noch nicht per WhatsApp versendet
- WhatsApp-Nachricht enthält noch keinen Hinweis auf Barzahlung
- Tour wird noch nicht automatisch an bestehende Reservation "geheftet"

### 2. Zahlungslink per WhatsApp versenden (neu)

**Was fehlt:**
- Service-Funktion zum Versenden von Tour-Buchungsbestätigung per WhatsApp
- WhatsApp-Nachricht mit:
  - Tour-Details
  - Payment Link (mit Tour-Preis + 5%)
  - Hinweis auf Barzahlung an Rezeption (09:00-17:30)
- Integration in `book_tour()`

### 3. Webhook-Erweiterung (teilweise vorhanden)

**Aktueller Stand:**
- Webhook findet bereits TourBooking via Payment Link (Zeile 573-586)
- Aktualisiert Payment Status (Zeile 599-631)
- Sendet Bestätigung per WhatsApp (Zeile 599-631)

**Was fehlt:**
- Keine Änderungen nötig (bereits implementiert)

### 4. Tour an Reservation "heften" (neu)

**Was fehlt:**
- Logik zum Finden von Reservationen mit gleichem Namen
- Automatische Erstellung von `TourReservation` Verknüpfung
- Separater Payment Link für Tour (zusätzlich zu Reservation Payment Link)

---

## 📊 Detaillierter Implementierungsplan

### Phase 1: Tour-Buchungsbestätigung per WhatsApp versenden

#### 1.1 Neuer Service: `TourNotificationService` (oder erweitere `TourWhatsAppService`)

**Datei:** `backend/src/services/tourWhatsAppService.ts` (erweitern)

**Neue Funktion:** `sendBookingConfirmationToCustomer()`

**Zweck:** Sendet Tour-Buchungsbestätigung per WhatsApp mit Payment Link

**Parameter:**
```typescript
static async sendBookingConfirmationToCustomer(
  bookingId: number,
  organizationId: number,
  branchId: number | null,
  paymentLink: string,
  amount: number,
  currency: string = 'COP'
): Promise<boolean>
```

**Logik:**
1. Lädt TourBooking mit Tour-Details
2. Prüft ob `customerPhone` vorhanden
3. Erstellt WhatsApp-Nachricht mit:
   - Tour-Details (Titel, Datum, Teilnehmer, Preis)
   - Payment Link
   - Hinweis auf Barzahlung an Rezeption (09:00-17:30)
   - Hinweis: "Sie können die Tour auch in Bar an der Rezeption zwischen 09:00 und 17:30 bezahlen"
4. Sendet Nachricht via `WhatsAppService`
5. Speichert Nachricht in `TourWhatsAppMessage`

**Nachricht-Format (Spanisch):**
```
¡Hola {customerName}!

Tu reserva para la tour "{tourTitle}" ha sido confirmada.

📅 Fecha: {tourDate}
👥 Participantes: {numberOfParticipants}
💰 Precio: {totalPrice} {currency}

Puedes realizar el pago en línea:
{paymentLink}

💡 También puedes pagar en efectivo en la recepción entre las 09:00 y 17:30.

¡Te esperamos!
```

**Nachricht-Format (Deutsch):**
```
Hallo {customerName}!

Ihre Reservierung für die Tour "{tourTitle}" wurde bestätigt.

📅 Datum: {tourDate}
👥 Teilnehmer: {numberOfParticipants}
💰 Preis: {totalPrice} {currency}

Sie können online bezahlen:
{paymentLink}

💡 Sie können die Tour auch in Bar an der Rezeption zwischen 09:00 und 17:30 bezahlen.

Wir freuen uns auf Sie!
```

**Nachricht-Format (Englisch):**
```
Hello {customerName}!

Your reservation for the tour "{tourTitle}" has been confirmed.

📅 Date: {tourDate}
👥 Participants: {numberOfParticipants}
💰 Price: {totalPrice} {currency}

You can pay online:
{paymentLink}

💡 You can also pay in cash at the reception between 09:00 and 17:30.

We look forward to seeing you!
```

**Sprach-Erkennung:**
- Verwende `CountryLanguageService` (wie in `ReservationNotificationService`)
- Oder: Verwende Sprache aus WhatsApp-Conversation

#### 1.2 Integration in `book_tour()`

**Datei:** `backend/src/services/whatsappFunctionHandlers.ts` (Zeile 1050-1223)

**Änderungen:**
1. Nach Erstellung des Payment Links (Zeile 1176):
   - Rufe `TourWhatsAppService.sendBookingConfirmationToCustomer()` auf
   - Übergebe `bookingId`, `organizationId`, `branchId`, `paymentLink`, `totalPrice`, `currency`

**Code-Struktur:**
```typescript
// Nach Zeile 1176 (nach Payment Link Erstellung):
if (paymentLink && (args.customerPhone || args.customerEmail)) {
  try {
    const { TourWhatsAppService } = await import('../services/tourWhatsAppService');
    await TourWhatsAppService.sendBookingConfirmationToCustomer(
      booking.id,
      branch.organizationId,
      branchId,
      paymentLink,
      totalPrice,
      tour.currency || 'COP'
    );
    console.log(`[book_tour] ✅ Buchungsbestätigung per WhatsApp gesendet`);
  } catch (whatsappError) {
    console.error('[book_tour] Fehler beim Versenden der WhatsApp-Nachricht:', whatsappError);
    // Nicht abbrechen, nur loggen
  }
}
```

### Phase 2: Tour an Reservation "heften"

#### 2.1 Funktion zum Finden von Reservationen mit gleichem Namen

**Datei:** `backend/src/services/whatsappFunctionHandlers.ts` (neue Funktion)

**Neue Funktion:** `findReservationByCustomerName()`

**Zweck:** Findet Reservationen mit gleichem Kunden-Namen (Name, Telefonnummer oder Email)

**WICHTIG:** Diese Funktion existiert noch NICHT und muss neu erstellt werden!

**Parameter:**
```typescript
private static async findReservationByCustomerName(
  customerName: string,
  customerPhone: string | null,
  customerEmail: string | null,
  branchId: number,
  organizationId: number
): Promise<Reservation | null>
```

**Logik:**
1. Normalisiere Namen (trim, lowercase)
2. Suche Reservationen mit:
   - Gleichem `guestName` (normalisiert)
   - ODER gleicher `guestPhone` (falls vorhanden)
   - ODER gleicher `guestEmail` (falls vorhanden)
   - Gleichem `branchId`
   - Gleichem `organizationId`
   - Status: `confirmed`, `notification_sent`, `checked_in` (nicht `cancelled`, `checked_out`, `no_show`)
   - Check-in/Check-out überlappen mit Tour-Datum (optional, kann später erweitert werden)
3. Sortiere nach `createdAt` (neueste zuerst)
4. Return erste passende Reservation

**Code-Struktur:**
```typescript
private static async findReservationByCustomerName(
  customerName: string,
  customerPhone: string | null,
  customerEmail: string | null,
  branchId: number,
  organizationId: number
): Promise<Reservation | null> {
  try {
    const normalizedName = customerName.trim().toLowerCase();
    
    // Suche nach Name, Telefonnummer oder Email
    const where: any = {
      organizationId: organizationId,
      branchId: branchId,
      status: {
        in: ['confirmed', 'notification_sent', 'checked_in']
      },
      OR: []
    };
    
    // Suche nach Name
    where.OR.push({
      guestName: {
        contains: normalizedName,
        mode: 'insensitive'
      }
    });
    
    // Suche nach Telefonnummer (falls vorhanden)
    if (customerPhone) {
      const { LanguageDetectionService } = await import('./languageDetectionService');
      const normalizedPhone = LanguageDetectionService.normalizePhoneNumber(customerPhone);
      where.OR.push({
        guestPhone: normalizedPhone
      });
    }
    
    // Suche nach Email (falls vorhanden)
    if (customerEmail) {
      where.OR.push({
        guestEmail: {
          equals: customerEmail.trim().toLowerCase(),
          mode: 'insensitive'
        }
      });
    }
    
    const reservations = await prisma.reservation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 1
    });
    
    return reservations.length > 0 ? reservations[0] : null;
  } catch (error) {
    console.error('[findReservationByCustomerName] Fehler:', error);
    return null;
  }
}
```

#### 2.2 Automatische Verknüpfung in `book_tour()`

**Datei:** `backend/src/services/whatsappFunctionHandlers.ts` (Zeile 1050-1223)

**Änderungen:**
1. Nach Erstellung der TourBooking (Zeile 1141):
   - Rufe `findReservationByCustomerName()` auf
   - Wenn Reservation gefunden:
     - Erstelle `TourReservation` Verknüpfung
     - Erstelle separaten Payment Link für Tour (zusätzlich zu Reservation Payment Link)
     - Speichere Tour Payment Link in `TourReservation` (optional, kann in `TourBooking.paymentLink` bleiben)

**Code-Struktur:**
```typescript
// Nach Zeile 1141 (nach TourBooking Erstellung):
// Prüfe ob Reservation mit gleichem Namen existiert
try {
  const matchingReservation = await this.findReservationByCustomerName(
    args.customerName.trim(),
    args.customerPhone?.trim() || null,
    args.customerEmail?.trim() || null,
    branchId,
    branch.organizationId
  );
  
  if (matchingReservation) {
    console.log(`[book_tour] ✅ Reservation ${matchingReservation.id} mit gleichem Namen gefunden, verknüpfe Tour-Buchung`);
    
    // Erstelle TourReservation Verknüpfung
    // WICHTIG: tourPrice = totalPrice, accommodationPrice = 0 (Tour ist zusätzlich zur Reservation)
    const tourReservation = await prisma.tourReservation.create({
      data: {
        tourId: tour.id,
        bookingId: booking.id,
        reservationId: matchingReservation.id,
        tourPrice: totalPrice,
        accommodationPrice: 0, // Tour ist zusätzlich, keine Reduzierung der Accommodation
        currency: tour.currency || 'COP',
        tourPricePending: totalPrice,
        accommodationPending: 0
      }
    });
    
    console.log(`[book_tour] ✅ TourReservation Verknüpfung erstellt: ${tourReservation.id}`);
    
    // WICHTIG: Payment Link für Tour bleibt separat (in TourBooking.paymentLink)
    // Reservation hat bereits eigenen Payment Link (in Reservation.paymentLink)
    // Beide Links können unabhängig bezahlt werden
  }
} catch (linkError) {
  console.error('[book_tour] Fehler beim Verknüpfen mit Reservation:', linkError);
  // Nicht abbrechen, nur loggen
}
```

**Wichtige Details:**
- `accommodationPrice = 0`: Tour ist zusätzlich zur Reservation, reduziert nicht den Accommodation-Preis
- `tourPrice = totalPrice`: Vollständiger Tour-Preis
- Payment Links bleiben separat: Tour Payment Link in `TourBooking.paymentLink`, Reservation Payment Link in `Reservation.paymentLink`
- **Verwendet bestehende `TourReservation` Verknüpfung** (Model und Controller existieren bereits)
- **Automatische Verknüpfung:** Wird automatisch erstellt wenn Name/Telefon/Email übereinstimmt
- **Manuelle Verknüpfung:** Kann weiterhin über Frontend (`TourReservationLinkModal`) erstellt werden

### Phase 3: Webhook-Erweiterung (bereits vorhanden, prüfen)

**Datei:** `backend/src/services/boldPaymentService.ts` (Zeile 534-631)

**Aktueller Stand:**
- Webhook findet TourBooking via Payment Link (Zeile 573-586)
- Aktualisiert Payment Status (Zeile 599-631)
- Sendet Bestätigung per WhatsApp (Zeile 599-631)

**Prüfung:**
- ✅ TourBooking wird gefunden
- ✅ Payment Status wird aktualisiert
- ✅ Bestätigung wird gesendet

**Mögliche Verbesserungen:**
- Prüfe ob `TourReservation` Verknüpfung existiert
- Aktualisiere `TourReservation.tourPricePaid` wenn Tour Payment Link bezahlt wurde
- Aktualisiere `TourReservation.tourPricePending` entsprechend

**Code-Struktur (Erweiterung):**
```typescript
// Nach Zeile 631 (nach TourBooking Update):
// Prüfe ob TourReservation Verknüpfung existiert
if (tourBooking) {
  try {
    const tourReservations = await prisma.tourReservation.findMany({
      where: {
        bookingId: tourBooking.id
      }
    });
    
    // Aktualisiere tourPricePaid für alle Verknüpfungen
    for (const tourReservation of tourReservations) {
      await prisma.tourReservation.update({
        where: { id: tourReservation.id },
        data: {
          tourPricePaid: Number(tourBooking.totalPrice),
          tourPricePending: 0
        }
      });
      
      console.log(`[Bold Payment Webhook] ✅ TourReservation ${tourReservation.id} aktualisiert`);
    }
  } catch (tourReservationError) {
    console.error('[Bold Payment Webhook] Fehler beim Aktualisieren der TourReservation:', tourReservationError);
    // Nicht abbrechen, nur loggen
  }
}
```

### Phase 4: Payment Link mit Tour-Preis + 5%

**Aktueller Stand:**
- `boldPaymentService.createPaymentLink()` fügt bereits automatisch 5% hinzu (Zeile 328-347)
- Payment Link wird mit `totalPrice` (Tour-Preis) erstellt
- 5% wird automatisch hinzugefügt

**Prüfung:**
- ✅ Betrag + 5% wird automatisch hinzugefügt
- ✅ Keine Änderungen nötig

**Wichtige Details:**
- `book_tour()` übergibt `totalPrice` (Tour-Preis × Anzahl Teilnehmer)
- `boldPaymentService.createPaymentLink()` fügt automatisch 5% hinzu
- Payment Link enthält bereits Tour-Preis + 5%

---

## 📝 Zusammenfassung: Was muss implementiert werden?

### ✅ Bereits vorhanden:
- `book_tour()` Function Handler (erstellt TourBooking)
- Payment Link Erstellung (mit automatischem +5%)
- Webhook-Verarbeitung (aktualisiert TourBooking Payment Status)
- `TourReservation` Model und Controller (Verknüpfung Tour-Reservation)

### ❌ Fehlt noch:

1. **Tour-Buchungsbestätigung per WhatsApp:**
   - `TourWhatsAppService.sendBookingConfirmationToCustomer()` erweitern
   - WhatsApp-Nachricht mit Payment Link und Barzahlungshinweis
   - Integration in `book_tour()`

2. **Tour an Reservation "heften":**
   - `findReservationByCustomerName()` Funktion erstellen
   - Automatische Verknüpfung in `book_tour()`
   - Separater Payment Link für Tour (bleibt separat)

3. **Webhook-Erweiterung (optional):**
   - `TourReservation.tourPricePaid` aktualisieren wenn Tour Payment Link bezahlt wurde

---

## 🚨 Wichtige Hinweise

1. **Payment Link + 5%:**
   - Wird bereits automatisch von `boldPaymentService.createPaymentLink()` hinzugefügt
   - Keine zusätzliche Berechnung nötig

2. **Barzahlungshinweis:**
   - Wird in WhatsApp-Nachricht erwähnt
   - Keine explizite Erwähnung des 5% Aufschlags
   - Text: "Sie können die Tour auch in Bar an der Rezeption zwischen 09:00 und 17:30 bezahlen"

3. **Tour-Reservation Verknüpfung:**
   - `accommodationPrice = 0`: Tour ist zusätzlich, reduziert nicht Accommodation-Preis
   - Payment Links bleiben separat (Tour und Reservation können unabhängig bezahlt werden)
   - Verknüpfung erfolgt automatisch wenn Name übereinstimmt

4. **Webhook:**
   - Bereits implementiert
   - Findet TourBooking via Payment Link
   - Aktualisiert Payment Status
   - Sendet Bestätigung per WhatsApp

---

## ✅ Checkliste

### Phase 1: Tour-Buchungsbestätigung per WhatsApp
- [ ] `TourWhatsAppService.sendBookingConfirmationToCustomer()` erweitern
- [ ] WhatsApp-Nachricht mit Payment Link und Barzahlungshinweis erstellen
- [ ] Integration in `book_tour()`

### Phase 2: Tour an Reservation "heften"
- [ ] `findReservationByCustomerName()` Funktion erstellen
- [ ] Automatische Verknüpfung in `book_tour()`
- [ ] Separater Payment Link für Tour (bleibt separat)

### Phase 3: Webhook-Erweiterung (optional)
- [ ] `TourReservation.tourPricePaid` aktualisieren wenn Tour Payment Link bezahlt wurde

---

**WICHTIG:** Dieser Plan ist nur eine VORBEREITUNG. NICHTS wird umgesetzt, bis der User diesen Plan ausdrücklich bestätigt hat!


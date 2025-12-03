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

## 🚨 KRITISCHE PROBLEME (aus Screenshots identifiziert)

### Problem 1: `book_tour()` unterstützt "morgen" nicht

**Aktueller Code (Zeile 1067):**
```typescript
const tourDate = new Date(args.tourDate);
if (tourDate < new Date()) {
  throw new Error('Tour-Datum muss in der Zukunft sein');
}
```

**Problem:**
- `new Date("morgen")` ergibt `Invalid Date`
- Bot sagt: "Es scheint ein Problem mit dem Tourdatum zu geben, da das angegebene Datum nicht in der Zukunft liegt"
- Keine Logik, die "morgen"/"tomorrow" in ein Datum umwandelt

**Lösung:**
- `book_tour()` muss `parseDate()` verwenden (wie `create_room_reservation()`)
- Unterstützung für "morgen"/"tomorrow"/"mañana" hinzufügen

### Problem 2: Bot ruft `check_room_availability()` statt `book_tour()` auf

**Was passiert:**
- User: "die 2., guatape. für morgen. für 2 personen"
- Bot sollte: `book_tour({ tourId: 2, tourDate: "tomorrow", numberOfParticipants: 2 })`
- Bot macht stattdessen: `check_room_availability()` → zeigt Zimmer-Verfügbarkeit

**Ursache:**
- System Prompt unterscheidet nicht klar zwischen Tour- und Zimmer-Buchung
- Bot verliert den Kontext (hat gerade Touren gezeigt, denkt aber an Zimmer)
- Bot erkennt nicht, dass "die 2." nach `get_tours()` eine Tour-ID ist

**Lösung:**
- System Prompt erweitern: Kontext-Erhaltung nach `get_tours()`
- Klare Anweisung: Wenn User Nummer wählt nach Tour-Liste → `book_tour()`
- Klare Anweisung: Wenn User Tour-Namen sagt → `book_tour()` mit tourId aus vorheriger Response

### Problem 3: Bot fragt nicht nach fehlenden Daten

**Aktueller Stand:**
- `book_tour()` wirft Fehler wenn Daten fehlen
- Bot zeigt Fehlermeldung statt nachzufragen
- Keine Rückfragen-Logik wie bei Zimmer-Reservierungen

**Lösung:**
- System Prompt erweitern: Rückfragen wenn Daten fehlen
- Analog zu `create_room_reservation()`: Prüfe ALLE erforderlichen Daten VOR Function-Call
- Wenn Daten fehlen: FRAGE nach, rufe Function NICHT auf

### Problem 4: Bot verliert Kontext zwischen Tour- und Zimmer-Buchung

**Was passiert:**
- User fragt nach Touren → Bot zeigt Touren
- User sagt "die 2., guatape. für morgen" → Bot denkt an Zimmer
- Bot zeigt Zimmer-Verfügbarkeit statt Tour zu buchen

**Ursache:**
- Keine Kontext-Erhaltung für Tour-Buchungen
- System Prompt unterscheidet nicht klar genug

**Lösung:**
- Kontext-Speicherung in Conversation (analog zu Zimmer-Buchungen)
- System Prompt: Wenn vorher `get_tours()` aufgerufen wurde, ist "die 2." eine Tour-ID

---

## 🎯 Was muss für Touren implementiert werden?

### 1. Tour-Buchung anlegen (bereits vorhanden, muss ERHEBLICH erweitert werden)

**Aktueller Stand:**
- `book_tour()` existiert bereits in `whatsappFunctionHandlers.ts` (Zeile 1050-1223)
- Erstellt `TourBooking` mit allen notwendigen Feldern
- Erstellt "Dummy"-Reservation für Payment Link
- Generiert Payment Link (aber noch nicht per WhatsApp versendet)
- ❌ Unterstützt "morgen"/"tomorrow" NICHT
- ❌ Wirft Fehler statt nachzufragen
- ❌ Keine Kontext-Erhaltung

**Was fehlt:**
- ✅ Datum-Parsing für "morgen"/"tomorrow" (wie `create_room_reservation()`)
- ✅ WhatsApp-Telefonnummer als Fallback für `customerPhone`
- ✅ Rückfragen-Logik wenn Daten fehlen
- ✅ Kontext-Erhaltung (Tour-Liste, Tour-ID aus vorheriger Response)
- ✅ Payment Link per WhatsApp versenden
- ✅ WhatsApp-Nachricht mit Barzahlungshinweis
- ✅ Tour an bestehende Reservation "heften"

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

### Phase 0: KRITISCH - `book_tour()` erweitern (Datum-Parsing, Validierung, Rückfragen)

#### 0.1 Datum-Parsing für "morgen"/"tomorrow" hinzufügen

**Datei:** `backend/src/services/whatsappFunctionHandlers.ts` (Zeile 1050-1223)

**Problem:** Aktuell wird `new Date(args.tourDate)` direkt verwendet, was "morgen" nicht parsen kann.

**Lösung:** Verwende `parseDate()` Methode (bereits vorhanden, Zeile 20-109) oder eigene Logik wie in `create_room_reservation()`.

**Code-Struktur:**
```typescript
// Ersetze Zeile 1066-1070:
// Parse Datum (unterstützt "today"/"heute"/"hoy"/"tomorrow"/"morgen"/"mañana")
let tourDate: Date;
const tourDateStr = args.tourDate.toLowerCase().trim();
if (tourDateStr === 'today' || tourDateStr === 'heute' || tourDateStr === 'hoy') {
  tourDate = new Date();
  tourDate.setHours(0, 0, 0, 0);
} else if (tourDateStr === 'tomorrow' || tourDateStr === 'morgen' || tourDateStr === 'mañana') {
  tourDate = new Date();
  tourDate.setDate(tourDate.getDate() + 1);
  tourDate.setHours(0, 0, 0, 0);
} else if (tourDateStr === 'day after tomorrow' || tourDateStr === 'übermorgen' || tourDateStr === 'pasado mañana') {
  tourDate = new Date();
  tourDate.setDate(tourDate.getDate() + 2);
  tourDate.setHours(0, 0, 0, 0);
} else {
  // Versuche verschiedene Datum-Formate zu parsen
  tourDate = this.parseDate(args.tourDate);
  if (isNaN(tourDate.getTime())) {
    throw new Error(`Ungültiges Tour-Datum: ${args.tourDate}. Format: YYYY-MM-DD, DD/MM/YYYY, DD.MM.YYYY, DD-MM-YYYY, "today"/"heute"/"hoy" oder "tomorrow"/"morgen"/"mañana"`);
  }
}

// Validierung: Tour-Datum muss in der Zukunft sein
if (tourDate < new Date()) {
  throw new Error('Tour-Datum muss in der Zukunft sein');
}
```

#### 0.2 WhatsApp-Telefonnummer als Fallback

**Datei:** `backend/src/services/whatsappFunctionHandlers.ts` (Zeile 1050-1223)

**Problem:** Aktuell wird `customerPhone` als erforderlich behandelt, aber WhatsApp-Telefonnummer wird nicht als Fallback verwendet.

**Lösung:** Analog zu `create_room_reservation()` (Zeile 1591-1595): Verwende WhatsApp-Telefonnummer als Fallback.

**Code-Struktur:**
```typescript
// Ersetze Zeile 1062-1064:
// Validierung: Mindestens eine Kontaktinformation (Telefon ODER Email) ist erforderlich
// WICHTIG: Nutze WhatsApp-Telefonnummer als Fallback, falls nicht angegeben
let customerPhone = args.customerPhone?.trim() || null;
let customerEmail = args.customerEmail?.trim() || null;

// Fallback: Nutze WhatsApp-Telefonnummer, falls vorhanden
// WICHTIG: phoneNumber wird über conversationContext übergeben (muss in whatsappAiService.ts erweitert werden)
if (!customerPhone && phoneNumber) {
  const { LanguageDetectionService } = await import('./languageDetectionService');
  customerPhone = LanguageDetectionService.normalizePhoneNumber(phoneNumber);
  console.log(`[book_tour] WhatsApp-Telefonnummer als Fallback verwendet: ${customerPhone}`);
}

if (!customerPhone && !customerEmail) {
  throw new Error('Mindestens eine Kontaktinformation (Telefonnummer oder Email) ist erforderlich für die Tour-Buchung. Bitte geben Sie Ihre Telefonnummer oder Email-Adresse an.');
}
```

**WICHTIG:** `phoneNumber` muss in `whatsappAiService.ts` an `book_tour()` übergeben werden (analog zu `create_room_reservation()`).

#### 0.3 Function Signature erweitern

**Datei:** `backend/src/services/whatsappFunctionHandlers.ts` (Zeile 1050-1055)

**Änderung:**
```typescript
static async book_tour(
  args: any,
  userId: number | null,
  roleId: number | null,
  branchId: number,
  phoneNumber?: string // NEU: WhatsApp-Telefonnummer (wird automatisch aus Context übergeben)
): Promise<any>
```

**Datei:** `backend/src/services/whatsappAiService.ts` (Zeile 200-250, Function Call)

**Änderung:** Übergebe `phoneNumber` an `book_tour()` (analog zu `create_room_reservation()`).

#### 0.4 Validierung und Fehlerbehandlung verbessern

**Aktueller Stand:**
- `book_tour()` wirft Fehler wenn Daten fehlen
- Bot zeigt Fehlermeldung statt nachzufragen

**Lösung:**
- System Prompt erweitern: Prüfe ALLE erforderlichen Daten VOR Function-Call
- Wenn Daten fehlen: FRAGE nach, rufe Function NICHT auf
- Analog zu `create_room_reservation()`: Detaillierte Validierung mit hilfreichen Fehlermeldungen

**Code-Struktur (erweitert):**
```typescript
// Erweitere Validierung (nach Zeile 1058):
// Validierung: Alle erforderlichen Parameter
if (!args.tourId) {
  throw new Error('tourId ist erforderlich. Bitte wählen Sie eine Tour aus der Liste.');
}
if (!args.tourDate) {
  throw new Error('Tour-Datum ist erforderlich. Bitte geben Sie das Datum der Tour an (z.B. "morgen" oder ein konkretes Datum).');
}
if (!args.numberOfParticipants || args.numberOfParticipants < 1) {
  throw new Error('Anzahl Teilnehmer ist erforderlich und muss mindestens 1 sein.');
}
if (!args.customerName || !args.customerName.trim()) {
  throw new Error('Name des Kunden ist erforderlich. Bitte geben Sie Ihren vollständigen Namen an.');
}

// Validierung: Mindestens eine Kontaktinformation (wird bereits oben behandelt)
```

#### 0.5 System Prompt erweitern für Rückfragen

**Datei:** `backend/src/services/whatsappAiService.ts` (Zeile 538-573)

**Erweiterung der Function Description:**
```typescript
description: 'Erstellt eine Tour-Reservation/Buchung. Generiert automatisch Payment Link und setzt Zahlungsfrist (1 Stunde). Wenn Zahlung nicht innerhalb der Frist erfolgt, wird die Buchung automatisch storniert. WICHTIG: Diese Function darf NUR aufgerufen werden, wenn ALLE erforderlichen Daten vorhanden sind: tourId, tourDate, numberOfParticipants, customerName, und mindestens eine Kontaktinformation (customerPhone oder customerEmail). WICHTIG: Wenn Daten fehlen (z.B. kein Name, kein Datum), rufe NICHT diese Function auf, sondern FRAGE nach fehlenden Daten! WICHTIG: Wenn User "morgen" sagt, verwende "tomorrow" als tourDate! Wenn User "die 2." sagt nach get_tours(), ist das tourId=2! Wenn User Tour-Namen sagt (z.B. "Guatapé"), finde tourId aus vorheriger get_tours() Response! Benötigt: tourId, tourDate (unterstützt "tomorrow"/"morgen"/"mañana"), numberOfParticipants, customerName, und mindestens eine Kontaktinformation (customerPhone oder customerEmail).'
```

**Erweiterung der Parameter Descriptions:**
```typescript
tourDate: {
  type: 'string',
  description: 'Datum der Tour (ISO-Format, z.B. "2025-01-27T10:00:00Z" oder "2025-01-27", oder "tomorrow"/"morgen"/"mañana" für morgen). WICHTIG: Wenn User "morgen" sagt, verwende "tomorrow"! Wenn User "übermorgen" sagt, verwende "day after tomorrow"! Unterstützt auch DD/MM/YYYY, DD.MM.YYYY, DD-MM-YYYY Formate.'
},
customerName: {
  type: 'string',
  description: 'Name des Kunden (ERFORDERLICH - vollständiger Name). WICHTIG: Wenn kein Name vorhanden ist, rufe NICHT diese Function auf, sondern FRAGE nach dem Namen!'
}
```

#### 0.6 System Prompt erweitern für Kontext-Erhaltung

**Datei:** `backend/src/services/whatsappAiService.ts` (Zeile 690-985, `buildSystemPrompt()`)

**Erweiterung:**
```typescript
// Füge Tour-Buchungs-Anweisungen hinzu (analog zu Zimmer-Buchungen):
prompt += '\n- book_tour: Erstelle eine Tour-Buchung (tourId, tourDate, numberOfParticipants, customerName, customerPhone/customerEmail)\n';
prompt += '  WICHTIG: Verwende diese Function wenn der User eine Tour buchen möchte!\n';
prompt += '  WICHTIG: Generiert automatisch Payment Link und setzt Zahlungsfrist (1 Stunde)\n';
prompt += '  WICHTIG: Diese Function darf NUR aufgerufen werden, wenn ALLE erforderlichen Daten vorhanden sind!\n';
prompt += '  WICHTIG: Wenn Daten fehlen (z.B. kein Name, kein Datum), rufe NICHT diese Function auf, sondern FRAGE nach fehlenden Daten!\n';
prompt += '  WICHTIG: Wenn User "morgen" sagt, verwende "tomorrow" als tourDate!\n';
prompt += '  WICHTIG: Wenn User "die 2." sagt nach get_tours(), ist das tourId=2 (die zweite Tour aus der Liste)!\n';
prompt += '  WICHTIG: Wenn User Tour-Namen sagt (z.B. "Guatapé"), finde tourId aus vorheriger get_tours() Response!\n';
prompt += '  WICHTIG: Nutze Kontext aus vorherigen Nachrichten! Wenn User vorher get_tours() aufgerufen hat, behalte die Tour-Liste im Kontext!\n';
prompt += '  WICHTIG: Wenn User "die 2., guatape. für morgen. für 2 personen" sagt, interpretiere: tourId=2 (aus get_tours()), tourDate="tomorrow", numberOfParticipants=2!\n';
prompt += '  WICHTIG: Wenn customerName fehlt → FRAGE nach dem Namen, rufe Function NICHT auf!\n';
prompt += '  WICHTIG: Wenn tourDate fehlt → FRAGE nach dem Datum, rufe Function NICHT auf!\n';
prompt += '  WICHTIG: Wenn numberOfParticipants fehlt → FRAGE nach der Anzahl, rufe Function NICHT auf!\n';
prompt += '  Beispiele:\n';
prompt += '    - "ich möchte tour 1 für morgen buchen" → book_tour({ tourId: 1, tourDate: "tomorrow", numberOfParticipants: 1, customerName: "Max Mustermann", customerPhone: "+573001234567" })\n';
prompt += '    - "die 2., guatape. für morgen. für 2 personen" → book_tour({ tourId: 2, tourDate: "tomorrow", numberOfParticipants: 2, customerName: "Max Mustermann", customerPhone: "+573001234567" })\n';
prompt += '    - User sagt "die 2." nach get_tours() → tourId=2 (aus vorheriger Response)\n';
prompt += '    - User sagt "Guatapé" → finde tourId aus get_tours() Response (z.B. tourId=2)\n';
```

**Erweiterung für Kontext-Erhaltung:**
```typescript
prompt += '\n\n=== KRITISCH: KONTEXT-NUTZUNG FÜR TOUREN ===';
prompt += '\nWICHTIG: Du MUSST ALLE Informationen aus der aktuellen UND vorherigen Nachrichten nutzen!';
prompt += '\nWICHTIG: Wenn User in einer vorherigen Nachricht get_tours() aufgerufen hat, behalte die Tour-Liste im Kontext!';
prompt += '\nWICHTIG: Wenn User "die 2." sagt nach get_tours(), ist das tourId=2 (die zweite Tour aus der Liste)!';
prompt += '\nWICHTIG: Wenn User Tour-Namen sagt (z.B. "Guatapé"), finde tourId aus der vorherigen get_tours() Response!';
prompt += '\nWICHTIG: Wenn User "morgen" sagt, verwende IMMER "tomorrow" als tourDate!';
prompt += '\nWICHTIG: Wenn User "für 2 personen" sagt, ist das numberOfParticipants=2!';
prompt += '\nWICHTIG: Kombiniere Informationen aus MEHREREN Nachrichten! Wenn User "die 2." sagt und später "für morgen", dann: tourId=2, tourDate="tomorrow"!';
prompt += '\nWICHTIG: Wenn User "die 2., guatape. für morgen. für 2 personen" sagt, hat er ALLE Informationen - rufe SOFORT book_tour auf!';
prompt += '\nWICHTIG: Wenn User nur "die 2." sagt nach get_tours(), aber Name oder Datum fehlt → FRAGE nach fehlenden Daten, rufe book_tour NICHT auf!';
prompt += '\nWICHTIG: Unterscheide klar zwischen TOUR-Buchung (book_tour) und ZIMMER-Buchung (create_room_reservation)!';
prompt += '\nWICHTIG: Wenn User nach get_tours() eine Nummer wählt (z.B. "2."), ist das IMMER eine Tour-ID, NICHT eine Zimmer-Nummer!';
prompt += '\nWICHTIG: Wenn User nach check_room_availability() eine Nummer wählt (z.B. "2."), ist das IMMER eine Zimmer-categoryId, NICHT eine Tour-ID!';
```

#### 0.7 Kontext-Speicherung in Conversation

**Datei:** `backend/src/services/whatsappFunctionHandlers.ts` (Zeile 891-971, `get_tours()`)

**Erweiterung:** Speichere Tour-Liste im Conversation Context (analog zu `check_room_availability()`).

**Code-Struktur:**
```typescript
// Nach Zeile 950 (nach Tour-Query):
// Speichere Context in Conversation (falls conversationId vorhanden)
if (conversationId) {
  try {
    const conversation = await prisma.whatsAppConversation.findUnique({
      where: { id: conversationId },
      select: { context: true }
    });
    
    if (conversation) {
      const context = (conversation.context as any) || {};
      const tourContext = context.tour || {};
      
      // Aktualisiere Context mit Tour-Liste
      const updatedContext = {
        ...tourContext,
        lastToursList: tours.map(t => ({
          id: t.id,
          title: t.title,
          price: t.price,
          location: t.location
        })),
        lastToursCheckAt: new Date().toISOString()
      };
      
      await prisma.whatsAppConversation.update({
        where: { id: conversationId },
        data: {
          context: {
            ...context,
            tour: updatedContext
          }
        }
      });
      
      console.log('[get_tours] Context aktualisiert:', {
        toursCount: tours.length
      });
    }
  } catch (contextError) {
    console.error('[get_tours] Fehler beim Speichern des Contexts:', contextError);
    // Nicht abbrechen, nur loggen
  }
}
```

**WICHTIG:** `conversationId` muss an `get_tours()` übergeben werden (analog zu `check_room_availability()`).

**Datei:** `backend/src/services/whatsappFunctionHandlers.ts` (Zeile 891-896)

**Änderung:**
```typescript
static async get_tours(
  args: any,
  userId: number | null,
  roleId: number | null,
  branchId: number,
  conversationId?: number // NEU: Conversation ID für Context-Speicherung
): Promise<any>
```

**Datei:** `backend/src/services/whatsappAiService.ts` (Function Call)

**Änderung:** Übergebe `conversationId` an `get_tours()`.

---

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

### Phase 0: KRITISCH - `book_tour()` erweitern (Datum-Parsing, Validierung, Rückfragen)
- [ ] Datum-Parsing für "morgen"/"tomorrow" hinzufügen (analog zu `create_room_reservation()`)
- [ ] WhatsApp-Telefonnummer als Fallback für `customerPhone` (analog zu `create_room_reservation()`)
- [ ] Function Signature erweitern: `phoneNumber` Parameter hinzufügen
- [ ] `whatsappAiService.ts` erweitern: `phoneNumber` an `book_tour()` übergeben
- [ ] Validierung und Fehlerbehandlung verbessern (hilfreiche Fehlermeldungen)
- [ ] System Prompt erweitern: Rückfragen wenn Daten fehlen (analog zu Zimmer-Buchungen)
- [ ] System Prompt erweitern: Kontext-Erhaltung (Tour-Liste, Tour-ID aus vorheriger Response)
- [ ] Kontext-Speicherung in Conversation: Tour-Liste nach `get_tours()` speichern
- [ ] `get_tours()` erweitern: `conversationId` Parameter hinzufügen
- [ ] `whatsappAiService.ts` erweitern: `conversationId` an `get_tours()` übergeben

### Phase 1: Tour-Buchungsbestätigung per WhatsApp
- [ ] `TourWhatsAppService.sendBookingConfirmationToCustomer()` erweitern
- [ ] WhatsApp-Nachricht mit Payment Link und Barzahlungshinweis erstellen (DE/ES/EN)
- [ ] Integration in `book_tour()`

### Phase 2: Tour an Reservation "heften"
- [ ] `findReservationByCustomerName()` Funktion erstellen
- [ ] Automatische Verknüpfung in `book_tour()`
- [ ] Separater Payment Link für Tour (bleibt separat)

### Phase 3: Webhook-Erweiterung (optional)
- [ ] `TourReservation.tourPricePaid` aktualisieren wenn Tour Payment Link bezahlt wurde

---

## 📋 Zusammenfassung: Was haben wir vergessen/übersehen?

### ✅ Jetzt im Plan enthalten:

1. **KRITISCH - Datum-Parsing:**
   - `book_tour()` unterstützt "morgen"/"tomorrow" nicht → JETZT im Plan
   - Analog zu `create_room_reservation()` implementieren

2. **KRITISCH - Bot verwechselt Tour- und Zimmer-Buchung:**
   - Bot ruft `check_room_availability()` statt `book_tour()` auf → JETZT im Plan
   - System Prompt erweitern: Kontext-Erhaltung, klare Unterscheidung

3. **KRITISCH - Bot fragt nicht nach fehlenden Daten:**
   - `book_tour()` wirft Fehler statt nachzufragen → JETZT im Plan
   - System Prompt erweitern: Rückfragen-Logik (analog zu Zimmer-Buchungen)

4. **KRITISCH - Bot verliert Kontext:**
   - Bot erkennt nicht, dass "die 2." nach `get_tours()` eine Tour-ID ist → JETZT im Plan
   - Kontext-Speicherung in Conversation implementieren

5. **WhatsApp-Telefonnummer als Fallback:**
   - `customerPhone` wird nicht aus WhatsApp-Nummer übernommen → JETZT im Plan
   - Analog zu `create_room_reservation()` implementieren

6. **Kontext-Speicherung:**
   - Tour-Liste wird nicht im Conversation Context gespeichert → JETZT im Plan
   - Analog zu `check_room_availability()` implementieren

### ❌ Was noch zu prüfen ist:

1. **Message History für besseren Kontext:**
   - Wird Message History bereits an AI übergeben?
   - Falls nicht: Sollte Message History erweitert werden?

2. **Tour-Namen-Erkennung:**
   - Bot erkennt "Guatapé" als Tour-Name?
   - Sollte Tour-Namen aus `get_tours()` Response in Context speichern?

3. **Fehlerbehandlung:**
   - Wie werden Fehler dem User angezeigt?
   - Sollten Fehlermeldungen mehrsprachig sein?

4. **Testing:**
   - Wie werden die Änderungen getestet?
   - Sollten Test-Szenarien dokumentiert werden?

---

**WICHTIG:** Dieser Plan ist nur eine VORBEREITUNG. NICHTS wird umgesetzt, bis der User diesen Plan ausdrücklich bestätigt hat!


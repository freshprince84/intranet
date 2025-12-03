# WhatsApp Bot - Tour-Buchung Fixes - Detaillierter Implementierungsplan

**Datum:** 2025-01-30  
**Status:** PLANUNG - NICHTS UMSETZEN  
**Ziel:** Zwei kritische Probleme bei Tour-Buchungen beheben

---

## 🚨 Identifizierte Probleme

### Problem 1: Zusätzliche Reservation wird erstellt

**Was passiert:**
- Bei Tour-Buchung wird immer eine neue "Dummy"-Reservation erstellt (Zeile 1339-1354)
- Auch wenn bereits eine passende Reservation existiert, wird trotzdem eine neue erstellt
- Resultat: Doppelte Reservationen mit gleichen Daten

**Aktueller Code-Ablauf:**
1. Zeile 1298: `findReservationByCustomerName()` wird aufgerufen
2. Zeile 1306-1329: Wenn Reservation gefunden → `TourReservation` wird erstellt
3. Zeile 1339-1354: **IMMER** wird danach eine neue "Dummy"-Reservation erstellt

**Probleme im Detail:**
1. `findReservationByCustomerName()` prüft **NICHT** nach Datum-Überlappung:
   - Prüft nur Name/Telefon/Email
   - Prüft **NICHT**, ob `checkInDate <= tourDate <= checkOutDate`
2. Auch wenn eine Reservation gefunden wurde, wird trotzdem eine neue "Dummy"-Reservation erstellt
3. Die gefundene Reservation wird **NICHT** für den Payment Link verwendet

**Anforderung:**
- Wenn Tour am 03.12.25 stattfindet, muss geprüft werden:
  - Reservation mit gleichem Namen
  - `checkInDate <= 03.12.25`
  - `checkOutDate >= 03.12.25`
- Wenn solche Reservation existiert → diese für Payment Link verwenden
- Nur wenn **KEINE** passende Reservation gefunden wurde → neue "Dummy"-Reservation erstellen

---

### Problem 2: Bot listet mehrmals alle Touren auf

**Was passiert:**
- User: "die 2. guatape. für morgen, 04.12.25"
- Bot sollte: `book_tour({ tourId: 2, tourDate: "tomorrow", ... })`
- Bot macht stattdessen: `get_tours()` → listet alle Touren nochmal

**Ursache:**
- System Prompt sagt zwar, dass `book_tour()` aufgerufen werden soll
- Bot erkennt nicht klar genug, dass "die 2." nach `get_tours()` eine Tour-Auswahl ist
- Bot ruft stattdessen wieder `get_tours()` auf

**Anforderung:**
- Sobald User eine Tour gewählt hat (z.B. "die 2." nach `get_tours()`), soll Bot auf diese Tour eingehen
- Bot soll `book_tour()` aufrufen, **NICHT** `get_tours()` nochmal
- Bot soll **NICHT** das gesamte Angebot nochmal auflisten

---

## 📊 Detaillierter Fix-Plan

### Fix 1: Reservation-Datum-Überlappung prüfen und bestehende Reservation verwenden

#### 1.1 `findReservationByCustomerName()` erweitern

**Datei:** `backend/src/services/whatsappFunctionHandlers.ts` (Zeile 19-77)

**Aktueller Stand:**
- Prüft nur Name/Telefon/Email
- Prüft **NICHT** nach Datum-Überlappung

**Änderungen:**
1. `tourDate` Parameter hinzufügen
2. Datum-Überlappung prüfen: `checkInDate <= tourDate <= checkOutDate`
3. Nur Reservationen zurückgeben, die auch Datum-Überlappung haben

**Neue Function Signature:**
```typescript
private static async findReservationByCustomerName(
  customerName: string,
  customerPhone: string | null,
  customerEmail: string | null,
  branchId: number,
  organizationId: number,
  tourDate: Date // NEU: Tour-Datum für Überlappungsprüfung
): Promise<any>
```

**Erweiterte WHERE-Clause:**
```typescript
const where: any = {
  organizationId: organizationId,
  branchId: branchId,
  status: {
    in: [ReservationStatus.confirmed, ReservationStatus.notification_sent, ReservationStatus.checked_in]
  },
  // NEU: Datum-Überlappung prüfen
  checkInDate: {
    lte: tourDate // checkInDate <= tourDate
  },
  checkOutDate: {
    gte: tourDate // checkOutDate >= tourDate
  },
  OR: []
};
```

**Code-Struktur:**
```typescript
private static async findReservationByCustomerName(
  customerName: string,
  customerPhone: string | null,
  customerEmail: string | null,
  branchId: number,
  organizationId: number,
  tourDate: Date // NEU: Tour-Datum für Überlappungsprüfung
): Promise<any> {
  try {
    const normalizedName = customerName.trim().toLowerCase();
    
    // Suche nach Name, Telefonnummer oder Email
    const where: any = {
      organizationId: organizationId,
      branchId: branchId,
      status: {
        in: [ReservationStatus.confirmed, ReservationStatus.notification_sent, ReservationStatus.checked_in]
      },
      // NEU: Datum-Überlappung prüfen
      // Tour-Datum muss zwischen checkInDate und checkOutDate liegen
      checkInDate: {
        lte: tourDate // checkInDate <= tourDate
      },
      checkOutDate: {
        gte: tourDate // checkOutDate >= tourDate
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

#### 1.2 `book_tour()` anpassen: Bestehende Reservation für Payment Link verwenden

**Datei:** `backend/src/services/whatsappFunctionHandlers.ts` (Zeile 1296-1373)

**Aktueller Stand:**
- Zeile 1298: `findReservationByCustomerName()` wird aufgerufen (ohne `tourDate`)
- Zeile 1306-1329: Wenn Reservation gefunden → `TourReservation` wird erstellt
- Zeile 1339-1354: **IMMER** wird danach eine neue "Dummy"-Reservation erstellt

**Änderungen:**
1. `findReservationByCustomerName()` mit `tourDate` aufrufen
2. Wenn Reservation gefunden wurde → diese für Payment Link verwenden
3. Nur wenn **KEINE** Reservation gefunden wurde → neue "Dummy"-Reservation erstellen

**Code-Struktur:**
```typescript
// Prüfe ob Reservation mit gleichem Namen existiert und verknüpfe Tour
let matchingReservation = null;
try {
  matchingReservation = await this.findReservationByCustomerName(
    args.customerName.trim(),
    customerPhone,
    customerEmail,
    branchId,
    branch.organizationId,
    tourDate // NEU: Tour-Datum übergeben
  );
  
  if (matchingReservation) {
    console.log(`[book_tour] ✅ Reservation ${matchingReservation.id} mit gleichem Namen und Datum-Überlappung gefunden, verknüpfe Tour-Buchung`);
    
    // Erstelle TourReservation Verknüpfung
    const tourReservation = await prisma.tourReservation.create({
      data: {
        tourId: tour.id,
        bookingId: booking.id,
        reservationId: matchingReservation.id,
        tourPrice: totalPrice,
        accommodationPrice: 0,
        currency: tour.currency || 'COP',
        tourPricePending: totalPrice,
        accommodationPending: 0
      }
    });
    
    console.log(`[book_tour] ✅ TourReservation Verknüpfung erstellt: ${tourReservation.id}`);
  }
} catch (linkError) {
  console.error('[book_tour] Fehler beim Verknüpfen mit Reservation:', linkError);
  // Nicht abbrechen, nur loggen
}

// Generiere Payment Link
let paymentLink: string | null = null;
if (totalPrice > 0 && (customerPhone || customerEmail)) {
  try {
    let reservationForPaymentLink;
    
    if (matchingReservation) {
      // WICHTIG: Verwende bestehende Reservation für Payment Link
      console.log(`[book_tour] Verwende bestehende Reservation ${matchingReservation.id} für Payment Link`);
      reservationForPaymentLink = matchingReservation;
    } else {
      // Nur wenn KEINE passende Reservation gefunden wurde: Erstelle "Dummy"-Reservation
      console.log(`[book_tour] Keine passende Reservation gefunden, erstelle "Dummy"-Reservation für Payment Link`);
      reservationForPaymentLink = await prisma.reservation.create({
        data: {
          guestName: args.customerName,
          guestPhone: customerPhone,
          guestEmail: customerEmail,
          checkInDate: tourDate,
          checkOutDate: new Date(tourDate.getTime() + 24 * 60 * 60 * 1000), // +1 Tag
          status: 'confirmed',
          paymentStatus: 'pending',
          amount: totalPrice,
          currency: tour.currency || 'COP',
          organizationId: branch.organizationId,
          branchId: branchId
        }
      });
    }
    
    const boldPaymentService = await BoldPaymentService.createForBranch(branchId);
    paymentLink = await boldPaymentService.createPaymentLink(
      reservationForPaymentLink,
      totalPrice,
      tour.currency || 'COP',
      `Zahlung für Tour-Buchung: ${tour.title}`
    );
    
    // Aktualisiere Buchung mit Payment Link
    await prisma.tourBooking.update({
      where: { id: booking.id },
      data: { paymentLink }
    });
  } catch (paymentError) {
    console.error('[book_tour] Fehler beim Erstellen des Payment-Links:', paymentError);
    // Nicht abbrechen, nur loggen
  }
}
```

**Wichtige Details:**
- `matchingReservation` wird außerhalb des try-catch gespeichert, damit es für Payment Link verwendet werden kann
- Wenn `matchingReservation` vorhanden → diese für Payment Link verwenden
- Nur wenn `matchingReservation === null` → neue "Dummy"-Reservation erstellen
- Payment Link wird mit der passenden Reservation erstellt (bestehend oder neu)

---

### Fix 2: System Prompt erweitern - Bot soll nicht nochmal alle Touren auflisten

#### 2.1 System Prompt erweitern für klare Tour-Auswahl

**Datei:** `backend/src/services/whatsappAiService.ts` (Zeile 770-789)

**Aktueller Stand:**
- System Prompt sagt: "Wenn User 'die 2.' sagt nach get_tours(), ist das tourId=2"
- ABER: Bot ruft trotzdem wieder `get_tours()` auf

**Änderungen:**
- Klare Anweisung: Nach `get_tours()` wenn User Tour wählt → `book_tour()` aufrufen, **NICHT** `get_tours()` nochmal
- Explizite Warnung: "NIEMALS get_tours() nochmal aufrufen, wenn User bereits eine Tour gewählt hat!"

**Erweiterte System Prompt:**
```typescript
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
// NEU: Klare Anweisung gegen wiederholtes Auflisten
prompt += '  KRITISCH: Wenn User nach get_tours() eine Tour wählt (z.B. "die 2.", "guatape", "tour 2"), rufe SOFORT book_tour() auf, NICHT get_tours() nochmal!\n';
prompt += '  KRITISCH: NIEMALS get_tours() nochmal aufrufen, wenn User bereits eine Tour gewählt hat!\n';
prompt += '  KRITISCH: Wenn User "die 2. guatape. für morgen" sagt, hat er eine Tour gewählt → rufe book_tour() auf, liste NICHT alle Touren nochmal auf!\n';
```

#### 2.2 System Prompt erweitern für get_tours() - Warnung vor wiederholtem Aufruf

**Datei:** `backend/src/services/whatsappAiService.ts` (Zeile 759-764)

**Aktueller Stand:**
- System Prompt sagt: "Hole verfügbare Touren"
- Keine Warnung vor wiederholtem Aufruf

**Änderungen:**
- Warnung hinzufügen: "NICHT nochmal aufrufen, wenn User bereits eine Tour gewählt hat!"

**Erweiterte System Prompt:**
```typescript
prompt += '\n- get_tours: Hole verfügbare Touren (type, availableFrom, availableTo, limit)\n';
prompt += '  WICHTIG: Verwende diese Function wenn der User nach Touren fragt!\n';
prompt += '  WICHTIG: Diese Function zeigt eine Liste aller verfügbaren Touren\n';
// NEU: Warnung vor wiederholtem Aufruf
prompt += '  KRITISCH: Wenn User bereits eine Tour gewählt hat (z.B. "die 2.", "guatape", "tour 2"), rufe diese Function NICHT nochmal auf!\n';
prompt += '  KRITISCH: Wenn User nach get_tours() eine Tour wählt, rufe stattdessen book_tour() auf!\n';
prompt += '  KRITISCH: Liste NICHT alle Touren nochmal auf, wenn User bereits eine Tour gewählt hat!\n';
prompt += '  Beispiele:\n';
prompt += '    - "welche touren gibt es?" → get_tours({})\n';
prompt += '    - "zeige mir alle touren" → get_tours({})\n';
prompt += '    - "¿qué tours tienen disponibles?" → get_tours({})\n';
prompt += '    - User sagt "die 2." nach get_tours() → NICHT get_tours() nochmal, sondern book_tour()!\n';
```

#### 2.3 System Prompt erweitern für Kontext-Erhaltung

**Datei:** `backend/src/services/whatsappAiService.ts` (Zeile 873-881)

**Aktueller Stand:**
- System Prompt sagt: "Wenn User nach get_tours() eine Nummer wählt, ist das eine Tour-ID"
- ABER: Keine klare Anweisung, dass `book_tour()` aufgerufen werden soll

**Änderungen:**
- Klare Anweisung: "Wenn User nach get_tours() eine Tour wählt → rufe book_tour() auf, NICHT get_tours() nochmal!"

**Erweiterte System Prompt:**
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
prompt += '\nWICHTIG: Unterscheide klar zwischen TOUR-Buchung (book_tour) und ZIMMER-Buchung (create_room_reservation)!\n';
prompt += '\nWICHTIG: Wenn User nach get_tours() eine Nummer wählt (z.B. "2."), ist das IMMER eine Tour-ID, NICHT eine Zimmer-Nummer!\n';
prompt += '\nWICHTIG: Wenn User nach check_room_availability() eine Nummer wählt (z.B. "2."), ist das IMMER eine Zimmer-categoryId, NICHT eine Tour-ID!\n';
// NEU: Klare Anweisung gegen wiederholtes Auflisten
prompt += '\nKRITISCH: Wenn User nach get_tours() eine Tour wählt (z.B. "die 2.", "guatape", "tour 2"), rufe SOFORT book_tour() auf, NICHT get_tours() nochmal!\n';
prompt += '\nKRITISCH: NIEMALS get_tours() nochmal aufrufen, wenn User bereits eine Tour gewählt hat!\n';
prompt += '\nKRITISCH: Liste NICHT alle Touren nochmal auf, wenn User bereits eine Tour gewählt hat!\n';
prompt += '\nKRITISCH: Wenn User "die 2. guatape. für morgen" sagt, hat er eine Tour gewählt → rufe book_tour() auf, liste NICHT alle Touren nochmal auf!\n';
```

---

## 📝 Zusammenfassung: Was muss geändert werden?

### Fix 1: Reservation-Datum-Überlappung

1. **`findReservationByCustomerName()` erweitern:**
   - `tourDate` Parameter hinzufügen
   - Datum-Überlappung prüfen: `checkInDate <= tourDate <= checkOutDate`
   - Nur Reservationen zurückgeben, die auch Datum-Überlappung haben

2. **`book_tour()` anpassen:**
   - `findReservationByCustomerName()` mit `tourDate` aufrufen
   - Wenn Reservation gefunden → diese für Payment Link verwenden
   - Nur wenn **KEINE** Reservation gefunden → neue "Dummy"-Reservation erstellen

### Fix 2: System Prompt erweitern

1. **System Prompt für `book_tour()` erweitern:**
   - Klare Anweisung: Nach `get_tours()` wenn User Tour wählt → `book_tour()` aufrufen, **NICHT** `get_tours()` nochmal
   - Explizite Warnung: "NIEMALS get_tours() nochmal aufrufen, wenn User bereits eine Tour gewählt hat!"

2. **System Prompt für `get_tours()` erweitern:**
   - Warnung hinzufügen: "NICHT nochmal aufrufen, wenn User bereits eine Tour gewählt hat!"

3. **System Prompt für Kontext-Erhaltung erweitern:**
   - Klare Anweisung: "Wenn User nach get_tours() eine Tour wählt → rufe book_tour() auf, NICHT get_tours() nochmal!"

---

## ✅ Checkliste

### Fix 1: Reservation-Datum-Überlappung
- [ ] `findReservationByCustomerName()` erweitern: `tourDate` Parameter hinzufügen
- [ ] `findReservationByCustomerName()` erweitern: Datum-Überlappung prüfen
- [ ] `book_tour()` anpassen: `findReservationByCustomerName()` mit `tourDate` aufrufen
- [ ] `book_tour()` anpassen: Bestehende Reservation für Payment Link verwenden
- [ ] `book_tour()` anpassen: Nur wenn keine Reservation → neue "Dummy"-Reservation erstellen

### Fix 2: System Prompt erweitern
- [ ] System Prompt für `book_tour()` erweitern: Warnung vor wiederholtem `get_tours()` Aufruf
- [ ] System Prompt für `get_tours()` erweitern: Warnung vor wiederholtem Aufruf
- [ ] System Prompt für Kontext-Erhaltung erweitern: Klare Anweisung für Tour-Auswahl

---

**WICHTIG:** Dieser Plan ist nur eine VORBEREITUNG. NICHTS wird umgesetzt, bis der User diesen Plan ausdrücklich bestätigt hat!


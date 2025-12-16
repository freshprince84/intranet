# WhatsApp Bot Reservierungsprobleme - Detaillierte Analyse und Fix-Plan

**Datum:** 2025-12-15  
**Status:** Analyse abgeschlossen, Plan erstellt  
**Priorität:** KRITISCH

---

## Zusammenfassung der identifizierten Probleme

1. **Doppelte Nachrichten** - Technische Message wird an User gesendet
2. **Falscher Name** - "ist Patrick Ammann" oder "mit Patrick Ammann" statt "Patrick Ammann"
3. **2 Betten statt 1** - Es werden zwei Reservierungen im selben Schlafsaal erstellt
4. **Doppelter Preis** - 110.000 COP statt 55.000 COP (doppelter Preis)
5. **Check-in Link fehlt** - Wird in ReservationCard nicht angezeigt
6. **Zimmername/Bettnr fehlt** - Wird in ReservationCard nicht angezeigt
7. **Kommunikation verschlechtert** - Namensabfrage und fehlende Datumsbestätigung

---

## Wichtige Fakten (Code-Analyse)

### Schema-Fakten
- `checkInLink` existiert im Schema (`backend/prisma/schema.prisma` Zeile 1247): `checkInLink String?`
- `roomNumber` existiert im Schema (Zeile 1169): `roomNumber String?`
- `roomDescription` existiert im Schema (Zeile 1170): `roomDescription String?`
- `lobbyReservationId` hat Unique-Constraint (Zeile 1162): `@unique`

### Code-Fakten
- `create_room_reservation` setzt `roomNumber` und `roomDescription` NICHT (Zeile 1991-2010)
- `checkInLink` wird generiert (Zeile 2039-2049) aber NICHT in DB gespeichert
- `checkInLink` wird NICHT in ReservationCard angezeigt (Zeile 163-210)
- 5% Aufschlag wird in `boldPaymentService.createPaymentLink` hinzugefügt (Zeile 329-345): `totalAmount = Math.round(baseAmount) + surcharge` (surcharge = baseAmount * 0.05)
- Duplikat-Prüfung existiert nur für `lobbyReservationId` (emailReservationService.ts Zeile 30-37)
- Keine Duplikat-Prüfung für `guestPhone + checkInDate + checkOutDate` in `create_room_reservation`
- KI wird nach `shouldBook=true` auch noch aufgerufen (whatsappMessageHandler.ts Zeile 259-278)
- Verfügbarkeitsprüfung wird zweimal gemacht in `create_room_reservation` (Zeile 1940 und 2056)
- `create_room_reservation` hat keine Berechtigungsprüfung (im Gegensatz zu anderen Functions)
- Keine Notifications in `create_room_reservation` (im Gegensatz zu Tour-Bookings)

---

## Problem 1: Doppelte Nachrichten

### Symptom
- Technische Message "Reservierung erfolgreich erstellt. Die AI generiert die Nachricht mit Payment-Link und Check-in-Link." wird an User gesendet
- Diese Message erscheint zweimal hintereinander

### Ursache
**Datei:** `backend/src/services/whatsappMessageHandler.ts` Zeile 252

```typescript
return bookingResult.message || 'Reservierung erfolgreich erstellt!';
```

**Problem:**
- Wenn `checkBookingContext.shouldBook = true`, wird `create_room_reservation` aufgerufen
- Die technische Message aus `create_room_reservation` (Zeile 2089) wird zurückgegeben
- Diese technische Message ist für interne Logs gedacht, nicht für den User
- Die KI muss stattdessen eine benutzerfreundliche Nachricht generieren

**Zusätzlich:**
- Die KI wird auch noch aufgerufen (Zeile 259-278), was zu einer zweiten Nachricht führt
- Code-Flow: Zeile 252 gibt technische Message zurück → Funktion endet NICHT → Zeile 259-278 ruft KI auf → Zweite Nachricht

### Lösung
1. **Technische Message nicht an User senden:**
   - In `whatsappMessageHandler.ts` Zeile 252: Statt `bookingResult.message` zurückzugeben, KI mit `bookingResult` aufrufen
   - KI generiert benutzerfreundliche Nachricht mit Payment-Link, Check-in-Link, etc.
   - Technische Message aus `create_room_reservation` Zeile 2089 entfernen oder ändern

2. **Verhindere doppelte KI-Aufruf:**
   - Nach erfolgreicher Buchung (`shouldBook = true`), KI NICHT mehr aufrufen (Zeile 259-278 überspringen)
   - Oder: Flag setzen, dass Buchung bereits stattgefunden hat

3. **Code-Änderung:**
   ```typescript
   // Zeile 252: Statt return, KI aufrufen
   if (bookingContext.shouldBook) {
     // ... create_room_reservation ...
     // Statt: return bookingResult.message;
     // KI aufrufen mit bookingResult:
     const aiResponse = await WhatsAppAiService.generateResponse(
       `Reservierung erfolgreich erstellt für ${bookingResult.guestName}.`,
       branchId,
       normalizedPhone,
       { ...conversationContext, bookingResult },
       conversation.id
     );
     return aiResponse.message;
   }
   ```

---

## Problem 2: Falscher Name - "ist Patrick Ammann" oder "mit Patrick Ammann"

### Symptom
- Name wird als "ist Patrick Ammann" oder "mit Patrick Ammann" gespeichert
- Sowohl in lokaler DB als auch in LobbyPMS per API

### Ursache
**Datei:** `backend/src/services/whatsappMessageHandler.ts` Zeile 1690-1718

**Problem in Namenserkennung:**

1. **Pattern 1 (Zeile 1692):** Erkennt "für Patrick Ammann" korrekt
   ```typescript
   const explicitNamePattern = /(?:a nombre de|name|nombre|für|para)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i;
   ```
   - Problem: Erkennt "für" aber nicht "ist" oder "mit"

2. **Pattern 2 (Zeile 1698):** Erkennt "primo aventurero für Patrick Ammann"
   ```typescript
   const nameAfterRoomPattern = /(?:primo|abuelo|tia|dorm|zimmer|habitación|apartamento|doble|básica|deluxe|estándar|singular|apartaestudio|deportista|aventurero|artista|viajero|bromista)\s+(?:für|para|,)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i;
   ```
   - Problem: Erkennt nur "für" oder "para", nicht "ist" oder "mit"

3. **Pattern 3 (Zeile 1705-1716):** Erkennt Namen am Ende der Nachricht
   - Problem: Wenn die Nachricht "ist Patrick Ammann" ist, wird "ist" als Teil des Namens erkannt

**Zusätzlich:**
- Die KI extrahiert den Namen möglicherweise falsch (ZU PRÜFEN: KI-Logs analysieren)
- In `create_room_reservation` wird `args.guestName.trim()` verwendet (Zeile 1920), aber keine Bereinigung von "ist" oder "mit"
- Name wird direkt an LobbyPMS gesendet (Zeile 1920): `args.guestName.trim()` ohne Bereinigung

### Lösung
1. **Namens-Pattern erweitern:**
   - Pattern 1 (Zeile 1692): "ist" und "mit" zu den erkannten Markern hinzufügen
     ```typescript
     const explicitNamePattern = /(?:a nombre de|name|nombre|für|para|ist|mit)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i;
     ```
   - Pattern 2 (Zeile 1698): "ist" und "mit" zu den erkannten Markern hinzufügen
     ```typescript
     const nameAfterRoomPattern = /(?:primo|abuelo|tia|dorm|zimmer|habitación|apartamento|doble|básica|deluxe|estándar|singular|apartaestudio|deportista|aventurero|artista|viajero|bromista)\s+(?:für|para|,|ist|mit)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i;
     ```

2. **Name-Bereinigung nach Extraktion:**
   - Nach Namens-Extraktion: Entferne führende Wörter wie "ist", "mit", "für", "para"
   - Funktion: `cleanGuestName(name: string): string`
   - Regex: `/^(ist|mit|für|para|a nombre de|name|nombre)\s+/i`
   - Anwendung in `checkBookingContext` nach Zeile 1718
   - Anwendung in `create_room_reservation` vor Zeile 1920

3. **KI-System Prompt:**
   - Anweisung in `whatsappAiService.ts` Zeile 1159 erweitern: "Wenn User 'ist Patrick Ammann' sagt, extrahiere nur 'Patrick Ammann' als Name, nicht 'ist Patrick Ammann'. Entferne immer führende Wörter wie 'ist', 'mit', 'für', 'para' vor dem Namen."

---

## Problem 3: 2 Betten statt 1 - Doppelte Reservierungen

### Symptom
- Es werden zwei Reservierungen im selben Schlafsaal erstellt
- Beide haben die gleichen Daten (15.12.2025 - 16.12.2025)
- Beide haben den gleichen Namen (mit Variation)

### Ursachen (Code-Analyse)

**Ursache 1: Doppelte Ausführung - FAKT**
- `checkBookingContext` gibt `shouldBook: true` zurück (Zeile 231)
- `create_room_reservation` wird aufgerufen (Zeile 236)
- ABER: Die KI wird auch noch aufgerufen (Zeile 259-278), obwohl bereits eine Buchung stattgefunden hat
- Code-Flow: Zeile 252 gibt Message zurück, aber Funktion endet nicht → Zeile 259-278 wird ausgeführt

**Ursache 2: Keine Duplikat-Prüfung für confirmed Reservierungen - FAKT**
- Duplikat-Prüfung existiert nur für `lobbyReservationId` (emailReservationService.ts Zeile 30-37)
- Keine Prüfung auf `guestPhone + checkInDate + checkOutDate` in `create_room_reservation`
- Wenn zwei Buchungen mit gleichen Daten gemacht werden, werden beide erstellt

**Ursache 3: Potential Reservation + normale Reservation - FAKT**
- Eine "potential" Reservation wird erstellt (create_potential_reservation)
- Dann wird `create_room_reservation` aufgerufen, was die "potential" Reservation bestätigt (Zeile 1974-1988)
- ABER: Wenn `existingPotentialReservation` nicht gefunden wird, wird neue Reservation erstellt (Zeile 1991-2010)
- Problem: Suche nach "potential" Reservation (Zeile 1874-1883) prüft nur auf `guestPhone + branchId + status + checkInDate + checkOutDate`
- Wenn Telefonnummer nicht normalisiert ist oder leicht abweicht, wird keine "potential" Reservation gefunden

### Lösung
1. **Verhindere doppelte Ausführung:**
   - In `whatsappMessageHandler.ts` Zeile 252: Nach erfolgreicher Buchung (`shouldBook = true`), KI NICHT mehr aufrufen
   - Code-Änderung: Nach Zeile 252 `return` hinzufügen oder `if (bookingContext.shouldBook) { ... return; }` Block erweitern

2. **Duplikat-Prüfung für confirmed Reservierungen:**
   - In `create_room_reservation` vor Zeile 1874: Prüfe auf bestehende confirmed Reservation
   - Prüfung: `guestPhone + branchId + checkInDate + checkOutDate + status = 'confirmed'`
   - Wenn gefunden: Fehler werfen oder bestehende Reservation zurückgeben
   - Code-Stelle: Nach Zeile 1865, vor Zeile 1874

3. **Bessere Potential-Reservation-Suche:**
   - Normalisiere Telefonnummer vor Suche (wird bereits gemacht, Zeile 1864)
   - Erweitere Suche: Prüfe auch auf ähnliche Namen (fuzzy matching)
   - Code-Stelle: Zeile 1874-1883

4. **Transaction für Idempotenz:**
   - Verwende Prisma Transaction, um sicherzustellen, dass nur eine Reservation erstellt wird
   - Code-Stelle: Zeile 1972-2011 in Transaction wrappen

---

## Problem 4: Doppelter Preis (110.000 statt 55.000 COP)

### Symptom
- Reservierung hat 110.000 COP statt 55.000 COP
- Das ist genau das Doppelte (55.000 × 2 = 110.000)

### Ursachen (Code-Analyse)

**Ursache 1: 5% Aufschlag wird korrekt berechnet - FAKT**
- In `boldPaymentService.createPaymentLink` Zeile 329-345: 5% Aufschlag wird korrekt berechnet
- Formel: `surcharge = Math.round(baseAmount * 0.05)`, `totalAmount = Math.round(baseAmount) + surcharge`
- Für 55.000 COP: surcharge = 2.750, totalAmount = 57.750 (NICHT 110.000)
- **FAKT:** 5% Aufschlag ist NICHT die Ursache für 110.000

**Ursache 2: Preisberechnung in create_room_reservation - FAKT**
- Zeile 1948: `estimatedAmount = nights * room.pricePerNight`
- Wenn `nights = 1` und `pricePerNight = 55000`, dann `estimatedAmount = 55000`
- Dieser Betrag wird in DB gespeichert (Zeile 1982, 2000)
- **FAKT:** Preisberechnung ist korrekt

**Ursache 3: LobbyPMS gibt möglicherweise doppelten Preis zurück - ZU PRÜFEN**
- In `syncReservation` (lobbyPmsService.ts Zeile 1085): `amount = totalToPay > 0 ? totalToPay : null`
- Wenn LobbyPMS `total_to_pay = 110000` zurückgibt, wird dieser Wert verwendet
- **ZU PRÜFEN:** Was gibt LobbyPMS in `total_to_pay` zurück?

**Ursache 4: Zwei Reservierungen mit je 55.000 = 110.000 in Summe - MÖGLICH**
- Wenn zwei Reservierungen erstellt werden (Problem 3), dann wird der Preis für beide berechnet
- Jede Reservation hat 55.000, zusammen = 110.000
- **ZU PRÜFEN:** Werden zwei Reservierungen erstellt oder eine mit 110.000?

### Lösung
1. **Logging erweitern (ZUERST):**
   - In `create_room_reservation` Zeile 1948: Logge `nights`, `room.pricePerNight`, `estimatedAmount`
   - In Zeile 1982 und 2000: Logge `estimatedAmount` vor DB-Speicherung
   - In `boldPaymentService.createPaymentLink` Zeile 331: Logge `baseAmount`, `surcharge`, `totalAmount`
   - In `syncReservation` Zeile 1085: Logge `totalToPay` aus LobbyPMS Response

2. **Preisberechnung prüfen:**
   - Prüfe ob `nights` korrekt berechnet wird (Zeile 1933): `Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))`
   - Für 1 Nacht (heute bis morgen): erwartet `nights = 1` (ZU PRÜFEN: Logging zeigt tatsächlichen Wert)
   - Erwartet `room.pricePerNight = 55000` (ZU PRÜFEN: Logging zeigt tatsächlichen Wert)

3. **LobbyPMS Preis prüfen:**
   - Nach LobbyPMS-Buchung (Zeile 1904): Hole Reservierungsdetails via `fetchReservationById`
   - Prüfe was LobbyPMS in `total_to_pay` zurückgibt
   - Wenn LobbyPMS bereits 110.000 zurückgibt, dann ist das Problem in LobbyPMS (nicht in unserem Code)

4. **5% Aufschlag prüfen:**
   - 5% Aufschlag wird korrekt berechnet (Zeile 329-345 in boldPaymentService.ts)
   - Payment-Link hat 57.750 COP (55.000 + 5%), NICHT 110.000
   - **FAKT:** 5% Aufschlag ist NICHT die Ursache

---

## Problem 5: Check-in Link wird in Card nicht angezeigt

### Symptom
- Check-in Link wird in ReservationCard nicht angezeigt
- Payment Link wird angezeigt, aber Check-in Link fehlt

### Ursache
**Datei:** `frontend/src/components/reservations/ReservationCard.tsx`

**Prüfung:**
- Zeile 124-155: Zeigt Zimmer-Informationen
- Zeile 157-163: Zeigt E-Mail
- Zeile 164-170: Zeigt Telefonnummer
- **FEHLT:** Check-in Link wird nicht angezeigt

**Zusätzlich:**
- `checkInLink` existiert im Schema (Zeile 1247): `checkInLink String?`
- Check-in Link wird generiert (Zeile 2039-2049), aber NICHT in DB gespeichert
- Check-in Link wird nur generiert, wenn E-Mail vorhanden ist (Zeile 2039): `if (reservation.guestEmail && reservation.lobbyReservationId)`
- Check-in Link wird im Return-Objekt zurückgegeben (Zeile 2086), aber nicht in DB gespeichert

### Lösung
1. **Check-in Link in DB speichern:**
   - In `create_room_reservation` Zeile 2049: Nach Generierung, Check-in Link in DB speichern
   - Code-Änderung: Nach Zeile 2049, `prisma.reservation.update` mit `checkInLink`
   - Code-Stelle: Nach Zeile 2049, vor Zeile 2051

2. **Check-in Link in ReservationCard anzeigen:**
   - In `ReservationCard.tsx` nach Zeile 171: Check-in Link anzeigen
   - Prüfe ob `reservation.checkInLink` vorhanden ist
   - Zeige Check-in Link ähnlich wie Payment Link (mit Icon und Link)
   - Code-Stelle: Nach Zeile 171, vor Zeile 174

3. **Übersetzungen hinzufügen:**
   - In `de.json`, `en.json`, `es.json`: Übersetzung für "Check-in Link" hinzufügen
   - Key: `reservations.checkInLink` (analog zu `reservations.paymentLink`)
   - Code-Stelle: `frontend/src/i18n/locales/{de,en,es}.json`

---

## Problem 6: Zimmername/Bettnr wird in Card nicht angezeigt

### Symptom
- Zimmername und Bettnummer werden in ReservationCard nicht angezeigt
- Card zeigt nur generische Informationen

### Ursache
**Datei:** `frontend/src/components/reservations/ReservationCard.tsx` Zeile 124-155

**Aktueller Code:**
```typescript
{reservation.roomNumber && (
  // Zeigt roomNumber
)}
```

**Problem:**
- `reservation.roomNumber` ist möglicherweise nicht gefüllt
- Für Dorms: `roomNumber` sollte "Zimmername (Bettnummer)" enthalten
- Für Privates: `roomDescription` sollte den Zimmernamen enthalten

**Zusätzlich:**
- In `syncReservation` (lobbyPmsService.ts Zeile 1067-1088) wird `roomNumber` und `roomDescription` gesetzt
- In `create_room_reservation` (whatsappFunctionHandlers.ts Zeile 1991-2010) werden diese Felder NICHT gesetzt
- **FAKT:** Wenn Reservation direkt erstellt wird (nicht via Sync), bleiben `roomNumber` und `roomDescription` leer

### Lösung
1. **roomNumber und roomDescription setzen in create_room_reservation:**
   - Nach LobbyPMS-Buchung (Zeile 1904 oder 1925): Hole Reservierungsdetails via `fetchReservationById`
   - Extrahiere Zimmername und Bettnummer aus LobbyPMS Response (analog zu syncReservation Zeile 1067-1088)
   - Setze `roomNumber` und `roomDescription` in DB-Update (Zeile 1974-1988 oder 1991-2010)
   - Code-Stelle: Nach Zeile 1904/1925, vor Zeile 1972

2. **Alternative: Daten aus Verfügbarkeit setzen:**
   - Wenn LobbyPMS-Details nicht verfügbar: Verwende `roomName` aus Args (Zeile 1716)
   - Für Dorms: `roomNumber = roomName`, `roomDescription = roomName`
   - Für Privates: `roomNumber = null`, `roomDescription = roomName`
   - Code-Stelle: Nach Zeile 2052-2065 (wo roomName bereits geholt wird)

3. **ReservationCard prüfen:**
   - ReservationCard zeigt bereits `roomNumber` und `roomDescription` (Zeile 124-155)
   - Problem: Diese Felder sind leer, weil sie nicht gesetzt werden
   - **FAKT:** ReservationCard-Code ist korrekt, Problem ist dass Daten fehlen

---

## Problem 7: Kommunikation verschlechtert

### Symptom
- Bot fragt nach Namen, obwohl Name bereits gegeben wurde
- Bot bestätigt nicht explizit das konkrete Datum
- Doppelte Nachrichten

### Ursache (Code-Analyse)
- System Prompt Verbesserungen wurden implementiert (whatsappAiService.ts Zeile 1159, 1144, 1070)
- Die KI interpretiert die Anweisungen möglicherweise nicht korrekt (ZU PRÜFEN: KI-Logs analysieren)
- Oder: Die Anweisungen sind nicht spezifisch genug (ZU PRÜFEN: System Prompt prüfen)
- **FAKT:** System Prompt enthält bereits Anweisungen für Namensabfrage (Zeile 1159) und Datumsbestätigung (Zeile 1144)
- **FAKT:** Context wird nach Buchung gelöscht (whatsappMessageHandler.ts Zeile 245-250)

### Lösung
1. **System Prompt präzisieren:**
   - Klarere Anweisungen für Namensabfrage
   - Explizite Anweisung für Datumsbestätigung

2. **Context-Verarbeitung verbessern:**
   - Stelle sicher, dass Name korrekt im Context gespeichert wird
   - Stelle sicher, dass Datum korrekt im Context gespeichert wird

3. **Doppelte Nachrichten beheben:**
   - Siehe Problem 1

---

## Implementierungsplan

### Phase 1: Kritische Fixes (sofort)

#### Fix 1.1: Doppelte Nachrichten beheben
**Datei:** `backend/src/services/whatsappMessageHandler.ts`

**Änderung Zeile 252:**
- Statt: `return bookingResult.message || 'Reservierung erfolgreich erstellt!';`
- Stattdessen: KI mit `bookingResult` aufrufen, benutzerfreundliche Nachricht generieren
- Nach KI-Aufruf: `return` hinzufügen, damit Zeile 259-278 nicht ausgeführt wird

**Code:**
```typescript
if (bookingContext.shouldBook) {
  // ... create_room_reservation ...
  
  // KI aufrufen statt technische Message
  const conversationContext: any = {
    userId: user?.id,
    roleId: roleId,
    userName: userWithRoles ? `${userWithRoles.firstName} ${userWithRoles.lastName}` : null,
    conversationState: conversation.state,
    groupId: groupId,
    bookingResult: bookingResult // Füge bookingResult hinzu
  };
  
  const aiResponse = await WhatsAppAiService.generateResponse(
    `Reservierung erfolgreich erstellt.`,
    branchId,
    normalizedPhone,
    conversationContext,
    conversation.id
  );
  
  return aiResponse.message; // WICHTIG: return hier, damit Zeile 259-278 nicht ausgeführt wird
}
```

**Zusätzlich:**
- Technische Message aus `create_room_reservation` Zeile 2089 entfernen oder ändern

#### Fix 1.2: Name-Bereinigung
**Datei:** `backend/src/services/whatsappMessageHandler.ts`

**Änderung Zeile 1692:**
- Pattern erweitern: `(?:a nombre de|name|nombre|für|para|ist|mit)`

**Änderung Zeile 1698:**
- Pattern erweitern: `(?:für|para|,|ist|mit)`

**Neue Funktion nach Zeile 1718:**
```typescript
function cleanGuestName(name: string): string {
  if (!name) return name;
  // Entferne führende Wörter
  return name.replace(/^(ist|mit|für|para|a nombre de|name|nombre)\s+/i, '').trim();
}
```

**Anwendung:**
- Nach Zeile 1695: `guestName = cleanGuestName(guestName);`
- Nach Zeile 1701: `guestName = cleanGuestName(guestName);`
- Nach Zeile 1714: `guestName = cleanGuestName(guestName);`

**Zusätzlich in create_room_reservation:**
- Zeile 1920: `cleanGuestName(args.guestName.trim())` verwenden

#### Fix 1.3: Doppelte Reservierungen verhindern
**Datei:** `backend/src/services/whatsappFunctionHandlers.ts`

**Änderung vor Zeile 1874:**
- Duplikat-Prüfung für confirmed Reservierungen hinzufügen:
```typescript
// Prüfe auf bestehende confirmed Reservation
const existingConfirmedReservation = searchPhone ? await prisma.reservation.findFirst({
  where: {
    guestPhone: searchPhone,
    branchId: branchId,
    status: ReservationStatus.confirmed,
    checkInDate: checkInDate,
    checkOutDate: checkOutDate
  },
  orderBy: { createdAt: 'desc' }
}) : null;

if (existingConfirmedReservation) {
  logger.warn(`[create_room_reservation] Bestehende confirmed Reservation gefunden: ${existingConfirmedReservation.id}`);
  throw new Error('Eine Reservierung mit diesen Daten existiert bereits.');
}
```

**Zusätzlich:**
- Transaction für Zeile 1972-2011 verwenden, um Race Conditions zu vermeiden

### Phase 2: Preis- und Daten-Fixes

#### Fix 2.1: Preisberechnung - Logging erweitern
**Datei:** `backend/src/services/whatsappFunctionHandlers.ts`

**Logging hinzufügen:**
- Zeile 1933: Logge `nights` Berechnung
- Zeile 1948: Logge `room.pricePerNight`, `nights`, `estimatedAmount`
- Zeile 1982, 2000: Logge `estimatedAmount` vor DB-Speicherung
- Zeile 2018: Logge `estimatedAmount` vor Payment-Link-Erstellung

**Zusätzlich in boldPaymentService.ts:**
- Zeile 331: Logge `baseAmount`, `surcharge`, `totalAmount`

#### Fix 2.2: Check-in Link in DB speichern
**Datei:** `backend/src/services/whatsappFunctionHandlers.ts`

**Änderung nach Zeile 2049:**
```typescript
if (checkInLink) {
  await prisma.reservation.update({
    where: { id: reservation.id },
    data: { checkInLink }
  });
  logger.log(`[create_room_reservation] Check-in Link in DB gespeichert: ${checkInLink}`);
}
```

#### Fix 2.3: Check-in Link in ReservationCard anzeigen
**Datei:** `frontend/src/components/reservations/ReservationCard.tsx`

**Änderung nach Zeile 171:**
```typescript
{/* Check-in Link */}
{reservation.checkInLink && (
  <div className="flex items-center text-gray-600 dark:text-gray-400">
    <LinkIcon className="h-4 w-4 mr-2 flex-shrink-0" />
    <a 
      href={reservation.checkInLink} 
      target="_blank" 
      rel="noopener noreferrer"
      className="text-blue-600 dark:text-blue-400 hover:underline"
    >
      {t('reservations.checkInLink', 'Check-in Link')}
    </a>
  </div>
)}
```

**Übersetzungen hinzufügen:**
- `frontend/src/i18n/locales/de.json`: `"reservations.checkInLink": "Check-in Link"`
- `frontend/src/i18n/locales/en.json`: `"reservations.checkInLink": "Check-in Link"`
- `frontend/src/i18n/locales/es.json`: `"reservations.checkInLink": "Enlace de Check-in"`

#### Fix 2.4: roomNumber und roomDescription setzen
**Datei:** `backend/src/services/whatsappFunctionHandlers.ts`

**Änderung nach Zeile 1925 (nach LobbyPMS-Buchung):**
```typescript
// Hole Reservierungsdetails aus LobbyPMS
let roomNumber: string | null = null;
let roomDescription: string | null = null;

try {
  const lobbyReservation = await lobbyPmsService.fetchReservationById(lobbyReservationId);
  const assignedRoom = lobbyReservation.assigned_room;
  const isDorm = assignedRoom?.type === 'compartida';
  
  if (isDorm) {
    const dormName = lobbyReservation.category?.name || null;
    const bedNumber = assignedRoom?.name || null;
    roomNumber = dormName && bedNumber ? `${dormName} (${bedNumber})` : bedNumber || dormName || null;
    roomDescription = dormName;
  } else {
    roomNumber = null;
    roomDescription = assignedRoom?.name || lobbyReservation.room_number || null;
  }
} catch (error) {
  logger.error('[create_room_reservation] Fehler beim Abrufen der Zimmer-Details:', error);
  // Fallback: Verwende roomName aus Args
  if (args.roomName) {
    roomDescription = args.roomName;
    roomNumber = args.roomType === 'compartida' ? args.roomName : null;
  }
}
```

**Änderung in DB-Update:**
- Zeile 1974-1988: Füge `roomNumber` und `roomDescription` hinzu
- Zeile 1991-2010: Füge `roomNumber` und `roomDescription` hinzu

### Phase 3: Kommunikations-Verbesserungen

#### Fix 3.1: System Prompt präzisieren
**Datei:** `backend/src/services/whatsappAiService.ts`

**Änderung Zeile 1159:**
- Präzisere Anweisung: "Wenn User 'ist Patrick Ammann' sagt, extrahiere IMMER nur 'Patrick Ammann' als Name. Entferne IMMER führende Wörter wie 'ist', 'mit', 'für', 'para' vor dem Namen."

**Änderung Zeile 1144:**
- Präzisere Anweisung: "Wenn User 'heute' sagt, bestätige IMMER das konkrete Datum explizit in deiner Antwort. Beispiel: 'Gerne, für den 15. Dezember 2025. Welche Art von Zimmer suchen Sie?'"

#### Fix 3.2: Context-Verarbeitung verbessern
**Datei:** `backend/src/services/whatsappMessageHandler.ts`

**Änderung Zeile 1915-1927:**
- Stelle sicher, dass Name korrekt im Context gespeichert wird (mit cleanGuestName)
- Stelle sicher, dass Datum korrekt im Context gespeichert wird

---

## Dateien die geändert werden müssen

1. `backend/src/services/whatsappMessageHandler.ts` - Doppelte Nachrichten, Name-Bereinigung, Context-Verarbeitung
2. `backend/src/services/whatsappFunctionHandlers.ts` - Duplikat-Prüfung, roomNumber/roomDescription, checkInLink speichern, Logging
3. `backend/src/services/whatsappAiService.ts` - System Prompt Verbesserungen
4. `frontend/src/components/reservations/ReservationCard.tsx` - Check-in Link anzeigen
5. `frontend/src/i18n/locales/de.json` - Übersetzung für Check-in Link
6. `frontend/src/i18n/locales/en.json` - Übersetzung für Check-in Link
7. `frontend/src/i18n/locales/es.json` - Übersetzung für Check-in Link
8. `backend/src/services/boldPaymentService.ts` - Logging erweitern (falls nötig)
9. `backend/src/services/lobbyPmsService.ts` - Logging erweitern (falls nötig)

---

## Test-Szenarien

1. **Name-Bereinigung:**
   - "ist Patrick Ammann" → sollte "Patrick Ammann" werden
   - "mit Patrick Ammann" → sollte "Patrick Ammann" werden
   - "für Patrick Ammann" → sollte "Patrick Ammann" werden

2. **Doppelte Reservierungen:**
   - Eine Buchung sollte nur eine Reservation erstellen
   - Prüfe ob Duplikat-Prüfung funktioniert

3. **Preis:**
   - 1 Nacht, 55.000 COP/Nacht → sollte 55.000 COP sein (ohne Aufschlag) oder 57.750 COP (mit 5% Aufschlag)
   - NICHT 110.000 COP

4. **Check-in Link:**
   - Sollte in ReservationCard angezeigt werden, wenn vorhanden

5. **Zimmername/Bettnr:**
   - Sollte in ReservationCard angezeigt werden

---

## Performance-Risiken

### Risiko 1: Zusätzliche DB-Abfragen
- Duplikat-Prüfung fügt eine zusätzliche DB-Abfrage hinzu (vor Zeile 1874)
- LobbyPMS `fetchReservationById` fügt zusätzlichen API-Call hinzu (für roomNumber/roomDescription)
- **Auswirkung:** +2 DB-Abfragen, +1 API-Call pro Reservierung
- **Mitigation:** Abfragen sind notwendig für Korrektheit, Performance-Impact ist minimal (< 100ms)

### Risiko 2: Verfügbarkeitsprüfung wird zweimal gemacht
- Zeile 1940: Verfügbarkeitsprüfung für Preisberechnung
- Zeile 2056: Verfügbarkeitsprüfung für roomName
- **Auswirkung:** Doppelte API-Calls zu LobbyPMS
- **Mitigation:** Cache-Ergebnis der ersten Prüfung, verwende für zweite Prüfung

### Risiko 3: Transaction-Overhead
- Transaction für Zeile 1972-2011 hat minimalen Performance-Impact (< 10ms)
- **Auswirkung:** Minimal, Transaction ist notwendig für Konsistenz
- **Mitigation:** Transaction nur wenn nötig (bei neuen Reservierungen, nicht bei Updates)

---

## Memory Leak Risiken

### Risiko 1: Zusätzliche API-Calls
- `fetchReservationById` fügt zusätzlichen API-Call hinzu
- **Auswirkung:** Minimal, Response wird nicht gecacht
- **Mitigation:** Response ist klein (< 10 KB), kein Memory Leak Risiko

### Risiko 2: Zusätzliche DB-Abfragen
- Duplikat-Prüfung fügt DB-Abfrage hinzu
- **Auswirkung:** Minimal, Prisma managed Connections automatisch
- **Mitigation:** Kein Memory Leak Risiko, Prisma gibt Connections zurück

### Risiko 3: Keine Timer oder Observer
- Keine `setTimeout`/`setInterval` in betroffenen Dateien
- Keine `IntersectionObserver` in betroffenen Dateien
- **Auswirkung:** Kein Memory Leak Risiko
- **Mitigation:** Nicht relevant

---

## Übersetzungen

### Fehlende Übersetzungen identifiziert
- `reservations.checkInLink` fehlt in allen 3 Sprachen
- ReservationCard verwendet bereits `t()` für alle anderen Texte (FAKT)

### Übersetzungen hinzufügen
**Dateien:**
- `frontend/src/i18n/locales/de.json`
- `frontend/src/i18n/locales/en.json`
- `frontend/src/i18n/locales/es.json`

**Keys:**
```json
{
  "reservations": {
    "checkInLink": "Check-in Link" // de: "Check-in Link", es: "Enlace de Check-in"
  }
}
```

---

## Notifications

### Status
- Keine Notifications in `create_room_reservation` (FAKT)
- Tour-Bookings haben Notifications (tourBookingController.ts Zeile 516-520)
- Reservierungen haben keine Notifications bei Erstellung

### Entscheidung erforderlich
- Sollen Notifications für Reservierungen erstellt werden?
- Wenn ja: Welche User sollen benachrichtigt werden?
- **Empfehlung:** Nicht in diesem Fix implementieren, separate Feature-Request

---

## Berechtigungen

### Status
- `create_room_reservation` hat keine Berechtigungsprüfung (FAKT)
- Andere Functions haben Berechtigungsprüfung (whatsappFunctionHandlers.ts Zeile 194-208)
- `create_room_reservation` ist für Gäste verfügbar (nicht nur Mitarbeiter)

### Entscheidung erforderlich
- Soll `create_room_reservation` Berechtigungsprüfung haben?
- Aktuell: Gäste können Reservierungen erstellen (gewollt?)
- **Empfehlung:** Nicht in diesem Fix ändern, aktuelles Verhalten beibehalten

---

## Offene Fragen / Zu prüfen

1. **Preis 110.000 statt 55.000:**
   - Was gibt LobbyPMS in `total_to_pay` zurück?
   - Werden zwei Reservierungen erstellt oder eine mit 110.000?
   - **Aktion:** Logging erweitern, dann prüfen

2. **Doppelte Reservierungen:**
   - Werden beide Reservierungen durch automatische Buchung erstellt?
   - Oder: Eine durch automatische Buchung, eine durch KI?
   - **Aktion:** Logging erweitern, dann prüfen

3. **Notifications:**
   - Sollen Notifications für Reservierungen erstellt werden?
   - **Aktion:** User fragen

4. **Berechtigungen:**
   - Soll `create_room_reservation` Berechtigungsprüfung haben?
   - **Aktion:** User fragen

---

**Erstellt:** 2025-12-15  
**Status:** Plan erstellt, alle Fakten dokumentiert, bereit für Implementierung


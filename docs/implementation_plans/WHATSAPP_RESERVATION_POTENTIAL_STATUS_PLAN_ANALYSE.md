# WhatsApp-Reservierung "Potential"-Status - Detaillierte Analyse & Risiken

## Status: ANALYSE ✅

**Datum:** 2025-01-30  
**Zweck:** Prüfung des Plans auf Vollständigkeit, Risiken, Konflikte und bereits implementierte Features

---

## 1. ✅ BEREITS IMPLEMENTIERT (wurde im Plan übersehen)

### 1.1 Payment-Link mit +5% Aufschlag

**Status:** ✅ **BEREITS IMPLEMENTIERT**

**Datei:** `backend/src/services/boldPaymentService.ts` (Zeile 328-347)

**Code:**
```typescript
// 5% Aufschlag für Kartenzahlung hinzufügen
const CARD_PAYMENT_SURCHARGE_PERCENT = 0.05; // 5%
const baseAmount = amount;
const surcharge = Math.round(baseAmount * CARD_PAYMENT_SURCHARGE_PERCENT * 100) / 100;
const totalAmount = baseAmount + surcharge;

// Beschreibung mit Aufschlagsausweis
const surchargeDescription = `${paymentDescription} (inkl. 5% Kartenzahlungsaufschlag)`;
```

**Konsequenz für Plan:**
- ❌ **Plan sagt:** "Payment-Link mit Betrag + 5% erstellen"
- ✅ **Realität:** `boldPaymentService.createPaymentLink()` fügt bereits automatisch 5% hinzu
- ✅ **Anpassung:** Keine Änderung nötig! Der Plan muss nur dokumentieren, dass +5% bereits automatisch hinzugefügt wird

### 1.2 Kontaktdaten-Validierung

**Status:** ✅ **BEREITS IMPLEMENTIERT**

**Datei:** `backend/src/services/whatsappFunctionHandlers.ts` (Zeile 1361-1374)

**Code:**
```typescript
// 4.5. Validierung: Mindestens eine Kontaktinformation (Telefon ODER Email) ist erforderlich
let guestPhone = args.guestPhone?.trim() || null;
let guestEmail = args.guestEmail?.trim() || null;

// Fallback: Nutze WhatsApp-Telefonnummer, falls vorhanden
if (!guestPhone && phoneNumber) {
  const { LanguageDetectionService } = await import('./languageDetectionService');
  guestPhone = LanguageDetectionService.normalizePhoneNumber(phoneNumber);
}

if (!guestPhone && !guestEmail) {
  throw new Error('Mindestens eine Kontaktinformation (Telefonnummer oder Email) ist erforderlich...');
}
```

**Konsequenz:** ✅ Keine Änderung nötig, bereits implementiert

### 1.3 WhatsApp-Nachrichten-Verknüpfung

**Status:** ✅ **TEILWEISE IMPLEMENTIERT**

**Datei:** `backend/src/controllers/whatsappController.ts` (Zeile 154-177)

**Code:**
```typescript
// Prüfe ob es eine Reservation zu dieser Telefonnummer gibt
const reservation = await prisma.reservation.findFirst({
  where: {
    guestPhone: normalizedPhone,
    branchId: branchId
  },
  orderBy: { checkInDate: 'desc' }
});

// Speichere Nachricht
await prisma.whatsAppMessage.create({
  data: {
    // ...
    reservationId: reservation?.id || null, // Verknüpfung wenn Reservation existiert
  }
});
```

**Problem:**
- ✅ Verknüpfung funktioniert, **ABER** nur wenn bereits eine Reservation existiert
- ❌ Bei "potential" Reservation: Nachrichten werden erst verknüpft, wenn Reservation erstellt wurde
- ✅ **Lösung:** Bei Erstellung "potential" Reservation müssen rückwirkend alle Nachrichten der Conversation verknüpft werden (wie im Plan beschrieben)

---

## 2. ⚠️ KRITISCHE RISIKEN & PROBLEME

### 2.1 LobbyPMS-Buchung wird IMMER erstellt

**Status:** ⚠️ **KRITISCHES RISIKO**

**Datei:** `backend/src/services/whatsappFunctionHandlers.ts` (Zeile 1376-1393)

**Aktueller Code:**
```typescript
// 5. Erstelle Reservierung in LobbyPMS (WICHTIG: ZUERST in LobbyPMS, dann lokal!)
let lobbyReservationId: string | null = null;
try {
  const lobbyPmsService = await LobbyPmsService.createForBranch(branchId);
  lobbyReservationId = await lobbyPmsService.createBooking(
    categoryId,
    checkInDate,
    checkOutDate,
    args.guestName.trim(),
    guestEmail || undefined,
    guestPhone || undefined,
    1
  );
  // ...
}
```

**Problem:**
- ❌ `create_room_reservation()` erstellt **IMMER** eine LobbyPMS-Buchung
- ❌ Bei "potential" Reservation darf **KEINE** LobbyPMS-Buchung erstellt werden (erst bei Bestätigung)
- ⚠️ **Risiko:** Wenn `create_room_reservation()` für "potential" Reservation aufgerufen wird, wird trotzdem LobbyPMS-Buchung erstellt

**Lösung:**
- ✅ Prüfe am Anfang von `create_room_reservation()`, ob bereits "potential" Reservation existiert
- ✅ Wenn ja: **KEINE** LobbyPMS-Buchung erstellen, nur Status aktualisieren
- ✅ LobbyPMS-Buchung erst bei Status-Update von "potential" → "confirmed"

### 2.2 Mehrere "potential" Reservierungen für dieselbe Telefonnummer

**Status:** ⚠️ **RISIKO**

**Problem:**
- Wenn User mehrere Buchungsanfragen macht (z.B. "heute" und dann "morgen"), könnten mehrere "potential" Reservierungen erstellt werden
- Bei Bestätigung: Welche Reservation soll bestätigt werden?

**Lösung:**
- ✅ Prüfe in `checkBookingContext`, ob bereits "potential" Reservation existiert
- ✅ Wenn ja: Aktualisiere bestehende Reservation (nicht neue erstellen)
- ✅ Oder: Prüfe auf `checkInDate` und `checkOutDate` Match

### 2.3 Keine automatische Bereinigung von "potential" Reservierungen

**Status:** ⚠️ **RISIKO**

**Problem:**
- Wenn User Buchungsanfrage macht, aber dann abbricht, bleibt "potential" Reservation in DB
- Keine automatische Stornierung (wie bei "confirmed" mit Payment-Deadline)

**Lösung:**
- ✅ Option 1: Keine automatische Bereinigung (wie im Plan beschrieben)
- ✅ Option 2: Scheduler, der "potential" Reservierungen nach X Tagen löscht/storniert
- ✅ **Empfehlung:** Option 1 (keine automatische Bereinigung), da User könnte später doch buchen

### 2.4 `reservationAutoCancelScheduler` prüft nur "confirmed"

**Status:** ⚠️ **RISIKO**

**Datei:** `backend/src/services/reservationAutoCancelScheduler.ts` (Zeile 30-40)

**Aktueller Code:**
```typescript
const expiredReservations = await prisma.reservation.findMany({
  where: {
    status: ReservationStatus.confirmed, // Nur "confirmed"
    paymentStatus: PaymentStatus.pending,
    paymentDeadline: { lte: now },
    autoCancelEnabled: true,
    cancelledAt: null
  }
});
```

**Problem:**
- ✅ Aktuell korrekt: Nur "confirmed" Reservierungen werden automatisch storniert
- ✅ "potential" Reservierungen haben kein `paymentDeadline`, daher werden sie nicht storniert
- ✅ **Keine Änderung nötig**, aber dokumentieren!

### 2.5 `ReservationTaskService` kennt "potential" Status nicht

**Status:** ⚠️ **RISIKO**

**Datei:** `backend/src/services/reservationTaskService.ts` (Zeile 173-189)

**Aktueller Code:**
```typescript
switch (reservation.status) {
  case 'confirmed':
    newTaskStatus = TaskStatus.open;
    break;
  case 'checked_in':
    newTaskStatus = reservation.onlineCheckInCompleted 
      ? TaskStatus.done 
      : TaskStatus.in_progress;
    break;
  // ... weitere Cases
  // ❌ FEHLT: case 'potential'
}
```

**Problem:**
- ❌ Wenn Reservation Status "potential" hat, wird Task-Status nicht aktualisiert
- ⚠️ **Risiko:** Task könnte in falschem Status bleiben

**Lösung:**
- ✅ Füge Case für "potential" hinzu: `TaskStatus.open` (oder `null` wenn kein Task erstellt werden soll)

---

## 3. ❌ FEHLENDE IMPLEMENTIERUNGEN

### 3.1 Frontend: Status-Filter kennt "potential" nicht

**Status:** ❌ **FEHLT**

**Datei:** `frontend/src/components/FilterRow.tsx` (Zeile 241-246)

**Aktueller Code:**
```typescript
<option value="confirmed">{t('reservations.status.confirmed', 'Bestätigt')}</option>
<option value="notification_sent">{t('reservations.status.notification_sent', 'Benachrichtigung gesendet')}</option>
<option value="checked_in">{t('reservations.status.checked_in', 'Eingecheckt')}</option>
<option value="checked_out">{t('reservations.status.checked_out', 'Ausgecheckt')}</option>
<option value="cancelled">{t('reservations.status.cancelled', 'Storniert')}</option>
<option value="no_show">{t('reservations.status.no_show', 'Nicht erschienen')}</option>
// ❌ FEHLT: <option value="potential">Potenzielle Reservierung</option>
```

**Lösung:**
- ✅ Füge "potential" Option hinzu
- ✅ Füge Übersetzung hinzu (DE/ES/EN)

### 3.2 `checkBookingContext` prüft nicht auf "potential" Reservation

**Status:** ❌ **FEHLT**

**Datei:** `backend/src/services/whatsappMessageHandler.ts` (Zeile 1514-1843)

**Aktueller Code:**
- Prüft auf `shouldBook`, aber prüft **NICHT** auf bestehende "potential" Reservation
- Wenn "potential" Reservation existiert, sollte diese aktualisiert werden (nicht neue erstellen)

**Lösung:**
- ✅ Prüfe am Anfang von `checkBookingContext`, ob bereits "potential" Reservation existiert
- ✅ Wenn ja: Verwende diese Reservation, aktualisiere fehlende Informationen

### 3.3 `create_room_reservation` prüft nicht auf "potential" Reservation

**Status:** ❌ **FEHLT**

**Datei:** `backend/src/services/whatsappFunctionHandlers.ts` (Zeile 1229-1540)

**Aktueller Code:**
- Erstellt immer neue Reservation
- Prüft **NICHT**, ob bereits "potential" Reservation existiert

**Lösung:**
- ✅ Prüfe am Anfang, ob "potential" Reservation existiert
- ✅ Wenn ja: Aktualisiere Status auf "confirmed", erstelle LobbyPMS-Buchung, erstelle Payment-Link
- ✅ Wenn nein: Erstelle neue Reservation (Rückwärtskompatibilität)

---

## 4. 🔄 KONFLIKTE MIT BESTEHENDEN FUNKTIONEN

### 4.1 `ReservationNotificationService.sendReservationInvitation()`

**Status:** ✅ **KEIN KONFLIKT**

**Datei:** `backend/src/services/reservationNotificationService.ts`

**Analyse:**
- ✅ Prüft bereits auf bestehenden `paymentLink` (Zeile 265-267)
- ✅ Erstellt neuen Payment-Link nur wenn keiner existiert
- ✅ **Keine Änderung nötig**, funktioniert mit "potential" Reservierungen

### 4.2 `TaskAutomationService.createReservationTask()`

**Status:** ⚠️ **MUSS ANGEPASST WERDEN**

**Problem:**
- Wird in `lobbyPmsService.syncReservation()` aufgerufen (Zeile 956)
- Wird **NICHT** in `create_room_reservation()` aufgerufen
- Bei "potential" Reservation: Soll Task erstellt werden?

**Lösung:**
- ✅ Option 1: Task erst bei Status "confirmed" (empfohlen)
- ✅ Option 2: Task auch bei "potential" erstellen, aber mit Status "open"
- ✅ **Empfehlung:** Option 1 (Task erst bei "confirmed")

### 4.3 `ReservationTaskService.syncTaskStatus()`

**Status:** ⚠️ **MUSS ANGEPASST WERDEN**

**Problem:**
- Switch-Case kennt "potential" Status nicht (siehe 2.5)

**Lösung:**
- ✅ Füge Case für "potential" hinzu: `TaskStatus.open` oder `null`

---

## 5. 📋 KORREKTUREN AM PLAN

### 5.1 Payment-Link mit +5%

**Plan sagt:**
> "Payment-Link mit Betrag + 5% erstellen"

**Korrektur:**
> "Payment-Link wird mit Betrag + 5% erstellt (bereits automatisch in `boldPaymentService.createPaymentLink()` implementiert - keine Änderung nötig)"

### 5.2 LobbyPMS-Buchung

**Plan sagt:**
> "Bei Bestätigung: LobbyPMS-Buchung wird erstellt"

**Korrektur:**
> "Bei Bestätigung: LobbyPMS-Buchung wird erstellt (aktuell wird LobbyPMS-Buchung IMMER erstellt in `create_room_reservation()` - muss angepasst werden, damit bei 'potential' Reservation KEINE LobbyPMS-Buchung erstellt wird)"

### 5.3 `create_room_reservation` Anpassung

**Plan sagt:**
> "Prüfe, ob bereits eine Reservation mit Status 'potential' existiert"

**Korrektur:**
> "Prüfe, ob bereits eine Reservation mit Status 'potential' existiert. **WICHTIG:** Wenn ja, erstelle **KEINE** LobbyPMS-Buchung, sondern nur Status-Update. LobbyPMS-Buchung wird erst bei Status-Update von 'potential' → 'confirmed' erstellt."

---

## 6. ✅ ZUSÄTZLICHE ANPASSUNGEN (im Plan fehlend)

### 6.1 Frontend Status-Filter

**Fehlt im Plan:**
- Frontend Status-Filter muss "potential" Option hinzufügen

### 6.2 `ReservationTaskService.syncTaskStatus()`

**Fehlt im Plan:**
- Switch-Case für "potential" Status hinzufügen

### 6.3 `TaskAutomationService.createReservationTask()`

**Fehlt im Plan:**
- Entscheidung: Task bei "potential" oder nur bei "confirmed"?

### 6.4 Mehrere "potential" Reservierungen

**Fehlt im Plan:**
- Logik zum Verhindern mehrerer "potential" Reservierungen für dieselbe Telefonnummer

---

## 7. 📊 ZUSAMMENFASSUNG

### ✅ Bereits implementiert (keine Änderung nötig):
1. Payment-Link mit +5% Aufschlag (automatisch in `boldPaymentService`)
2. Kontaktdaten-Validierung (Telefonnummer/Email)
3. WhatsApp-Nachrichten-Verknüpfung (teilweise, muss erweitert werden)

### ⚠️ Kritische Risiken:
1. **LobbyPMS-Buchung wird IMMER erstellt** - muss angepasst werden
2. Mehrere "potential" Reservierungen möglich - muss verhindert werden
3. Keine automatische Bereinigung - bewusst so (kein Risiko)

### ❌ Fehlende Implementierungen:
1. Frontend Status-Filter: "potential" Option fehlt
2. `checkBookingContext`: Prüft nicht auf "potential" Reservation
3. `create_room_reservation`: Prüft nicht auf "potential" Reservation
4. `ReservationTaskService`: Switch-Case für "potential" fehlt

### 🔄 Konflikte:
1. `TaskAutomationService`: Soll Task bei "potential" erstellt werden?
2. `ReservationTaskService`: Muss "potential" Status unterstützen

---

## 8. 🎯 EMPFOHLENE ANPASSUNGEN AM PLAN

1. ✅ **Dokumentiere:** Payment-Link +5% ist bereits implementiert
2. ✅ **Klarstelle:** LobbyPMS-Buchung wird NUR bei Status-Update "potential" → "confirmed" erstellt
3. ✅ **Hinzufügen:** Frontend Status-Filter Anpassung
4. ✅ **Hinzufügen:** `ReservationTaskService` Anpassung
5. ✅ **Hinzufügen:** Logik zum Verhindern mehrerer "potential" Reservierungen
6. ✅ **Hinzufügen:** Entscheidung: Task bei "potential" oder nur bei "confirmed"?


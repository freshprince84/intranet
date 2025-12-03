# WhatsApp-Reservierung mit "Potential"-Status - Implementierungsplan

## Status: PLANUNG ✅ (Aktualisiert nach Analyse)

**Letzte Aktualisierung:** 2025-01-30  
**Analyse-Dokument:** `WHATSAPP_RESERVATION_POTENTIAL_STATUS_PLAN_ANALYSE.md`

## Zusammenfassung

Aktuell werden Reservierungen erst erstellt, wenn alle Informationen vorhanden sind und der User bestätigt. Stattdessen soll:

1. **Sofort eine Reservation mit Status "potential" angelegt werden**, sobald erste Buchungsinformationen vorhanden sind
2. **Der gesamte Konversationsverlauf** in den Details angezeigt werden
3. **Bei Bestätigung** der Status auf "confirmed" geändert werden (keine neue Reservation)
4. **Zahlungslink mit Betrag + 5%** erstellt und versendet werden

---

## 1. Datenbank-Änderungen

### 1.1 ReservationStatus Enum erweitern

**Aktueller Stand:**
```prisma
enum ReservationStatus {
  confirmed
  notification_sent
  checked_in
  checked_out
  cancelled
  no_show
}
```

**Erforderliche Änderung:**
```prisma
enum ReservationStatus {
  potential        // NEU: Potenzielle Reservierung (noch nicht bestätigt)
  confirmed
  notification_sent
  checked_in
  checked_out
  cancelled
  no_show
}
```

**Migration:**
```sql
-- Migration: add_potential_status_to_reservation
-- Prisma generiert automatisch die Enum-Erweiterung
-- Keine Datenmigration nötig, da "potential" ein neuer Status ist
```

### 1.2 Reservation Model - Keine Änderungen nötig

Das `Reservation` Model hat bereits alle benötigten Felder:
- `status` - wird auf "potential" gesetzt
- `guestPhone` - WhatsApp-Telefonnummer wird automatisch gesetzt
- `guestEmail` - optional, wird abgefragt
- `amount` - wird aus Verfügbarkeitsprüfung berechnet
- `paymentLink` - wird bei Bestätigung erstellt

**Hinweis:** Konversationsverlauf wird über `WhatsAppMessage.reservationId` verknüpft (bereits vorhanden).

---

## 2. Aktueller Ablauf vs. Neuer Ablauf

### 2.1 Aktueller Ablauf

```
1. User fragt nach Verfügbarkeit → check_room_availability()
2. User gibt Daten an → Context wird gespeichert
3. User bestätigt → create_room_reservation() → Reservation mit Status "confirmed"
4. Payment-Link wird erstellt und versendet
```

**Problem:**
- Reservation wird erst bei Bestätigung erstellt
- Keine Möglichkeit, unbestätigte Anfragen zu verfolgen
- Konversationsverlauf nicht mit Reservation verknüpft

### 2.2 Neuer Ablauf

```
1. User fragt nach Verfügbarkeit → check_room_availability()
2. User gibt erste Daten an (z.B. Check-in, Check-out, Zimmer) 
   → create_potential_reservation() → Reservation mit Status "potential"
   → WhatsApp-Nachrichten werden mit reservationId verknüpft
3. Bot fragt nach Kontaktdaten (Email optional, Telefonnummer = WhatsApp-Nummer)
4. User bestätigt → update_reservation_status() → Status "potential" → "confirmed"
   → LobbyPMS-Buchung wird erstellt
   → Payment-Link mit Betrag + 5% wird erstellt und versendet
```

---

## 3. Implementierungsdetails

### 3.1 Neue Funktion: `create_potential_reservation`

**Zweck:** Erstellt sofort eine Reservation mit Status "potential", wenn erste Buchungsinformationen vorhanden sind.

**Wann wird sie aufgerufen?**
- Nach `check_room_availability()`, wenn User Zimmer auswählt oder Daten angibt
- Wenn `checkInDate`, `checkOutDate`, `roomType` und `categoryId` vorhanden sind
- **VOR** der Bestätigung durch den User

**Implementierung:**
- **Datei:** `backend/src/services/whatsappFunctionHandlers.ts`
- **Methode:** `create_potential_reservation()`
- **Parameter:**
  ```typescript
  {
    checkInDate: string;
    checkOutDate: string;
    guestName?: string; // Optional, kann später ergänzt werden
    roomType: 'compartida' | 'privada';
    categoryId: number;
    roomName?: string;
    guestPhone?: string; // WhatsApp-Telefonnummer (automatisch)
    guestEmail?: string; // Optional
  }
  ```

**Logik:**
1. Parse Datum (wie in `create_room_reservation`)
2. Berechne Betrag aus Verfügbarkeitsprüfung
3. Erstelle Reservation mit Status "potential"
4. **WICHTIG:** Keine LobbyPMS-Buchung (erst bei Bestätigung)
5. Verknüpfe WhatsApp-Nachrichten mit `reservationId` (über `conversationId`)

**Code-Struktur:**
```typescript
static async create_potential_reservation(
  args: {
    checkInDate: string;
    checkOutDate: string;
    guestName?: string;
    roomType: 'compartida' | 'privada';
    categoryId: number;
    roomName?: string;
    guestPhone?: string;
    guestEmail?: string;
  },
  userId: number | null,
  roleId: number | null,
  branchId: number,
  phoneNumber?: string // WhatsApp-Telefonnummer
): Promise<any> {
  // 1. Parse Datum
  // 2. Validierung: Mindestens Telefonnummer ODER Email
  // 3. Berechne Betrag
  // 4. Erstelle Reservation mit Status "potential"
  // 5. Verknüpfe WhatsApp-Nachrichten (über conversationId)
  // 6. KEINE LobbyPMS-Buchung (erst bei Bestätigung)
}
```

### 3.2 Anpassung: `checkBookingContext`

**Zweck:** Prüft, ob eine "potential" Reservation existiert und ob sie bestätigt werden soll.

**⚠️ WICHTIG:** Verhindert mehrere "potential" Reservierungen für dieselbe Telefonnummer!

**Änderungen:**
- **ZUERST:** Prüfe, ob bereits eine Reservation mit Status "potential" für diese Telefonnummer existiert
- **Wenn ja:**
  - Verwende diese Reservation (nicht neue erstellen)
  - Aktualisiere fehlende Informationen (z.B. guestName, guestEmail, checkInDate, checkOutDate)
  - Bei Bestätigung: `shouldBook = true` setzen (Status-Update wird in `create_room_reservation` gemacht)
- **Wenn nein:**
  - Normale Logik (erstellt neue "potential" Reservation)

**Code-Struktur:**
```typescript
// In checkBookingContext (am Anfang, nach Context-Laden):
// 1. Prüfe ob bereits "potential" Reservation existiert
const existingPotentialReservation = await prisma.reservation.findFirst({
  where: {
    guestPhone: normalizedPhone,
    branchId: branchId,
    status: ReservationStatus.potential
    // Optional: Prüfe auch auf checkInDate/checkOutDate Match
  },
  orderBy: { createdAt: 'desc' }
});

if (existingPotentialReservation) {
  // Verwende bestehende Reservation
  // Aktualisiere fehlende Informationen im Context
  bookingContext.existingReservationId = existingPotentialReservation.id;
  
  // Wenn alle Informationen vorhanden + Bestätigung:
  // shouldBook = true (Status-Update wird in create_room_reservation gemacht)
} else {
  // Normale Logik: Erstelle neue "potential" Reservation
}
```

### 3.3 Anpassung: `create_room_reservation`

**Zweck:** Wird bei Bestätigung aufgerufen, ändert Status von "potential" auf "confirmed".

**⚠️ KRITISCH:** Aktuell wird LobbyPMS-Buchung IMMER erstellt (Zeile 1376-1393). Muss angepasst werden!

**Änderungen:**
1. **ZUERST:** Prüfe, ob bereits eine Reservation mit Status "potential" existiert
2. **Wenn ja (Bestätigung einer "potential" Reservation):**
   - Aktualisiere fehlende Informationen
   - Ändere Status auf "confirmed"
   - **DANN ERST:** Erstelle LobbyPMS-Buchung (nur bei Bestätigung!)
   - Erstelle Payment-Link (automatisch mit +5% durch `boldPaymentService`)
   - Versende Payment-Link
3. **Wenn nein (neue Reservation):**
   - Erstelle neue Reservation (wie bisher, für Rückwärtskompatibilität)
   - Erstelle LobbyPMS-Buchung (wie bisher)

**Code-Struktur:**
```typescript
// In create_room_reservation:
// 1. Prüfe ob "potential" Reservation existiert
const existingPotentialReservation = await prisma.reservation.findFirst({
  where: {
    guestPhone: guestPhone || phoneNumber,
    branchId: branchId,
    status: ReservationStatus.potential,
    checkInDate: checkInDate,
    checkOutDate: checkOutDate
  },
  orderBy: { createdAt: 'desc' }
});

if (existingPotentialReservation) {
  // ⚠️ WICHTIG: KEINE LobbyPMS-Buchung hier! Nur Status-Update!
  // Aktualisiere Reservation
  const reservation = await prisma.reservation.update({
    where: { id: existingPotentialReservation.id },
    data: {
      status: ReservationStatus.confirmed,
      guestName: args.guestName.trim(),
      guestPhone: guestPhone,
      guestEmail: guestEmail,
      // ... weitere Updates
    }
  });
  
  // JETZT ERST: Erstelle LobbyPMS-Buchung (nur bei Bestätigung!)
  const lobbyPmsService = await LobbyPmsService.createForBranch(branchId);
  const lobbyReservationId = await lobbyPmsService.createBooking(
    categoryId,
    checkInDate,
    checkOutDate,
    reservation.guestName,
    reservation.guestEmail || undefined,
    reservation.guestPhone || undefined,
    1
  );
  
  // Aktualisiere Reservation mit lobbyReservationId
  await prisma.reservation.update({
    where: { id: reservation.id },
    data: { lobbyReservationId }
  });
  
  // Erstelle Payment-Link (automatisch mit +5%)
  // Versende Payment-Link
} else {
  // Erstelle neue Reservation (wie bisher)
  // Erstelle LobbyPMS-Buchung (wie bisher)
}
```

### 3.4 Payment-Link mit Betrag + 5%

**Zweck:** Zahlungslink wird mit Betrag + 5% erstellt (statt nur Betrag).

**Status:** ✅ **BEREITS IMPLEMENTIERT**

**Datei:** `backend/src/services/boldPaymentService.ts` (Zeile 328-347)

**Bereits vorhandene Implementierung:**
```typescript
// 5% Aufschlag für Kartenzahlung hinzufügen
const CARD_PAYMENT_SURCHARGE_PERCENT = 0.05; // 5%
const baseAmount = amount;
const surcharge = Math.round(baseAmount * CARD_PAYMENT_SURCHARGE_PERCENT);
const totalAmount = Math.round(baseAmount) + surcharge;

// Beschreibung mit Aufschlagsausweis
const surchargeDescription = `${paymentDescription} (inkl. 5% Kartenzahlungsaufschlag)`;
```

**Konsequenz:**
- ✅ **Keine Änderung nötig!** `boldPaymentService.createPaymentLink()` fügt bereits automatisch 5% hinzu
- ✅ Bei Bestätigung: Einfach `createPaymentLink()` mit Basisbetrag aufrufen, +5% wird automatisch hinzugefügt
- ✅ In `ReservationNotificationService.sendReservationInvitation()`: Prüft bereits auf bestehenden `paymentLink` (Zeile 265-267)

### 3.5 Konversationsverlauf anzeigen

**Zweck:** Alle WhatsApp-Nachrichten einer Reservation anzeigen.

**Bestehende Funktionalität:**
- `WhatsAppMessage` hat bereits `reservationId` Feld
- Nachrichten werden bereits mit `reservationId` verknüpft (in `whatsappController.ts`)

**Anpassung:**
- Bei Erstellung einer "potential" Reservation:
  - Verknüpfe alle Nachrichten der Conversation mit `reservationId`
  ```typescript
  // Nach Erstellung der Reservation:
  await prisma.whatsAppMessage.updateMany({
    where: {
      conversationId: conversation.id,
      reservationId: null // Nur Nachrichten ohne Reservation
    },
    data: {
      reservationId: reservation.id
    }
  });
  ```

**Frontend:**
- Zeige alle `WhatsAppMessage` mit `reservationId = reservation.id`
- Sortiere nach `sentAt` (chronologisch)

### 3.6 Kontaktdaten-Abfrage

**Zweck:** Bot fragt nach Kontaktdaten, wenn nicht vorhanden.

**Logik:**
1. **Telefonnummer:** Wird automatisch aus WhatsApp genommen (`phoneNumber`)
2. **Email:** Wird abgefragt, wenn nicht vorhanden
   - System Prompt: "Bitte geben Sie Ihre Email-Adresse an (optional, aber empfohlen für Check-in-Link)"

**Anpassung in `checkBookingContext`:**
```typescript
// Wenn Reservation erstellt wird, aber guestEmail fehlt:
if (!guestEmail && !bookingContext.guestEmail) {
  // Bot soll nach Email fragen (optional)
  // Aber Reservation wird trotzdem erstellt (mit Status "potential")
}
```

**System Prompt Anpassung:**
- "Wenn Kontaktdaten fehlen, frage danach, aber erstelle trotzdem die Reservation mit Status 'potential'"

---

## 4. Verwendung bestehender Funktionen

### 4.1 BoldPaymentService.createPaymentLink()

**Bereits vorhanden:**
- `backend/src/services/boldPaymentService.ts`
- Erstellt Payment-Link für Reservation
- **Anpassung:** Betrag + 5% übergeben

### 4.2 ReservationNotificationService.sendReservationInvitation()

**Bereits vorhanden:**
- `backend/src/services/reservationNotificationService.ts`
- Erstellt Payment-Link und versendet WhatsApp-Nachricht
- **Anpassung:** Prüfe, ob `paymentLink` bereits existiert (mit +5%), sonst erstelle neuen

### 4.3 WhatsApp-Nachrichten-Verknüpfung

**Bereits vorhanden:**
- `WhatsAppMessage.reservationId` Feld
- Nachrichten werden in `whatsappController.ts` mit `reservationId` verknüpft
- **Anpassung:** Bei Erstellung "potential" Reservation, verknüpfe alle Nachrichten der Conversation

---

## 5. System Prompt Anpassungen

### 5.1 Neue Anweisungen für KI

**In `whatsappAiService.ts` - `buildSystemPrompt()`:**

```typescript
prompt += '  WICHTIG: Reservierungsablauf:\n';
prompt += '    1. Wenn User erste Buchungsinformationen gibt (Check-in, Check-out, Zimmer) → rufe create_potential_reservation() auf\n';
prompt += '    2. Frage nach Kontaktdaten (Email optional, Telefonnummer = WhatsApp-Nummer)\n';
prompt += '    3. Wenn User bestätigt → rufe create_room_reservation() auf (ändert Status von "potential" auf "confirmed")\n';
prompt += '  WICHTIG: create_potential_reservation() erstellt sofort eine Reservation mit Status "potential"\n';
prompt += '  WICHTIG: create_room_reservation() ändert Status von "potential" auf "confirmed" (keine neue Reservation)\n';
prompt += '  WICHTIG: Payment-Link wird mit Betrag + 5% erstellt und versendet\n';
```

### 5.2 Function Definition: `create_potential_reservation`

**In `whatsappAiService.ts` - `getFunctionDefinitions()`:**

```typescript
{
  name: 'create_potential_reservation',
  description: 'Erstellt eine potenzielle Reservierung (Status "potential") mit ersten Buchungsinformationen. Wird aufgerufen, wenn User Check-in, Check-out und Zimmer angibt, aber noch nicht bestätigt hat.',
  parameters: {
    type: 'object',
    properties: {
      checkInDate: { type: 'string', description: 'Check-in Datum (Format: YYYY-MM-DD, "today", "tomorrow", etc.)' },
      checkOutDate: { type: 'string', description: 'Check-out Datum (Format: YYYY-MM-DD, "tomorrow", etc.)' },
      guestName: { type: 'string', description: 'Name des Gastes (optional, kann später ergänzt werden)' },
      roomType: { type: 'string', enum: ['compartida', 'privada'], description: 'Zimmer-Art' },
      categoryId: { type: 'number', description: 'Category ID des Zimmers (aus Verfügbarkeitsprüfung)' },
      roomName: { type: 'string', description: 'Zimmer-Name (optional)' },
      guestEmail: { type: 'string', description: 'Email-Adresse (optional, wird abgefragt wenn fehlt)' }
    },
    required: ['checkInDate', 'checkOutDate', 'roomType', 'categoryId']
  }
}
```

---

## 6. Implementierungsreihenfolge

### Phase 1: Datenbank & Grundlagen
1. ✅ ReservationStatus Enum erweitern ("potential")
2. ✅ Migration erstellen und ausführen

### Phase 2: Potential Reservation erstellen
3. ✅ `create_potential_reservation()` Funktion implementieren
4. ✅ Function Definition in `whatsappAiService.ts` hinzufügen
5. ✅ System Prompt anpassen
6. ✅ `checkBookingContext` anpassen (prüft auf bestehende "potential" Reservation)

### Phase 3: Bestätigung & Status-Update
7. ✅ `create_room_reservation` anpassen (prüft auf "potential" Reservation)
8. ✅ Status-Update von "potential" → "confirmed"
9. ✅ LobbyPMS-Buchung erstellen (nur bei Bestätigung)

### Phase 4: Payment-Link mit +5%
10. ✅ Payment-Link mit Betrag + 5% erstellen
11. ✅ `ReservationNotificationService` anpassen (prüft auf bestehenden Link)

### Phase 5: Konversationsverlauf
12. ✅ WhatsApp-Nachrichten mit `reservationId` verknüpfen (bei Erstellung "potential")
13. ✅ Frontend: Konversationsverlauf anzeigen (optional, falls nicht vorhanden)

### Phase 7: Frontend-Anpassungen
14. ✅ Status-Filter: "potential" Option hinzufügen (`FilterRow.tsx`)
15. ✅ Übersetzungen: DE/ES/EN für "potential" Status

### Phase 8: Task-Service Anpassungen
16. ✅ `ReservationTaskService.syncTaskStatus()`: Case für "potential" hinzufügen
17. ✅ Entscheidung: Task bei "potential" oder nur bei "confirmed"? (Empfehlung: nur bei "confirmed")

### Phase 6: Kontaktdaten-Abfrage
14. ✅ System Prompt: Nach Email fragen (optional)
15. ✅ Bot fragt nach Email, wenn nicht vorhanden

---

## 7. Offene Fragen / Entscheidungen

1. **Status-Name:** "potential" oder "pending"? → **"potential"** (besser für Verständnis) ✅
2. **Email Pflicht?** → **Optional** (Telefonnummer reicht) ✅
3. **Wann wird "potential" Reservation erstellt?** → **Sobald Check-in, Check-out, Zimmer und categoryId vorhanden sind** ✅
4. **Automatische Stornierung für "potential"?** → **Nein** (nur für "confirmed" mit Payment-Deadline) ✅
5. **Frontend-Anzeige:** Sollen "potential" Reservierungen separat angezeigt werden? → **Ja, mit Filter** ✅
6. **Task-Erstellung:** Task bei "potential" oder nur bei "confirmed"? → **Nur bei "confirmed"** (empfohlen) ✅
7. **Mehrere "potential" Reservierungen:** → **Verhindern durch Prüfung in `checkBookingContext`** ✅

---

## 8. Test-Szenarien

### Szenario 1: Normale Buchung
1. User: "Ich möchte ein Zimmer für heute buchen"
2. Bot: Zeigt Verfügbarkeit
3. User: "Doble estándar"
4. Bot: Erstellt "potential" Reservation → Fragt nach Email
5. User: "test@example.com"
6. Bot: Aktualisiert Reservation → Fragt nach Bestätigung
7. User: "Ja, buchen"
8. Bot: Status → "confirmed", LobbyPMS-Buchung, Payment-Link (+5%) versendet

### Szenario 2: Ohne Email
1. User: "Ich möchte ein Zimmer für heute buchen"
2. Bot: Zeigt Verfügbarkeit
3. User: "Doble estándar"
4. Bot: Erstellt "potential" Reservation → Fragt nach Email
5. User: "Nein, keine Email"
6. Bot: Aktualisiert Reservation → Fragt nach Bestätigung
7. User: "Ja, buchen"
8. Bot: Status → "confirmed", LobbyPMS-Buchung, Payment-Link (+5%) versendet (nur WhatsApp)

### Szenario 3: User bricht ab
1. User: "Ich möchte ein Zimmer für heute buchen"
2. Bot: Zeigt Verfügbarkeit
3. User: "Doble estándar"
4. Bot: Erstellt "potential" Reservation → Fragt nach Email
5. User: Keine Antwort (24h)
6. **Ergebnis:** Reservation bleibt mit Status "potential" (keine automatische Stornierung)

---

## 9. Zusammenfassung

**Kernänderungen:**
1. ✅ Neuer Status "potential" im ReservationStatus Enum
2. ✅ Neue Funktion `create_potential_reservation()` (erstellt Reservation sofort)
3. ✅ Anpassung `create_room_reservation()` (ändert Status statt neue Reservation, **WICHTIG:** LobbyPMS-Buchung nur bei Bestätigung!)
4. ✅ Payment-Link mit Betrag + 5% (**bereits implementiert** in `boldPaymentService`)
5. ✅ WhatsApp-Nachrichten-Verknüpfung mit `reservationId`
6. ✅ Kontaktdaten-Abfrage (Email optional, **bereits implementiert**)
7. ✅ Frontend Status-Filter: "potential" Option hinzufügen
8. ✅ `ReservationTaskService`: Case für "potential" Status

**Bestehende Funktionen wiederverwenden:**
- ✅ `BoldPaymentService.createPaymentLink()` (mit automatischem +5% Aufschlag - **bereits implementiert**)
- ✅ `ReservationNotificationService.sendReservationInvitation()` (prüft bereits auf bestehenden Link)
- ✅ `WhatsAppMessage.reservationId` Verknüpfung (teilweise vorhanden, muss erweitert werden)

**⚠️ Kritische Anpassungen:**
- ⚠️ `create_room_reservation()`: LobbyPMS-Buchung wird aktuell IMMER erstellt - muss angepasst werden (nur bei Bestätigung)
- ⚠️ `checkBookingContext`: Muss auf bestehende "potential" Reservation prüfen (verhindert Duplikate)
- ⚠️ `ReservationTaskService.syncTaskStatus()`: Muss "potential" Status unterstützen

**Keine neuen Services nötig:**
- Alle Funktionen können in bestehenden Services implementiert werden


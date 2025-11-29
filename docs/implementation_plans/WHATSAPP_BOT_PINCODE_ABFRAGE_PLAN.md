# WhatsApp Bot - Pincode-Abfrage Implementierungsplan

**Datum:** 2025-01-22  
**Status:** Plan - NICHTS UMSETZEN  
**Ziel:** Bot soll bei Pincode-Anfrage den BEREITS GENERIERTEN TTLock Passcode aus DB abrufen und versenden

---

## 📋 Zusammenfassung der Anforderung

**Use Case:** Gäste, die am Eingang stehen und ihren Pincode vergessen haben, sollen per WhatsApp nach ihrem Pincode fragen können.

**Anforderung:**
- Bot erkennt Anfrage nach Pincode ("pin", "code", "pincode", "código", etc.)
- Bot prüft, ob anfragende Person eine bestehende Reservation hat:
  1. **Primär:** Prüfung via Telefonnummer
  2. **Sekundär:** Falls nicht gefunden, Abfrage von Vorname & Name
  3. Bei Übereinstimmung: **BEREITS GENERIERTEN** TTLock Passcode (`doorPin`) aus DB lesen
  4. Code per WhatsApp versenden
- **WICHTIG:** Code wird NICHT generiert, nur aus DB gelesen und versendet!
- Falls kein Code vorhanden: Fehlermeldung (Code muss erst generiert werden)

---

## 🔍 Analyse: Was besteht bereits?

### ✅ Bestehender Prozess (Code-Generierung):

**Wird ausgelöst durch:**
1. **Bold Payment Webhook** (nach erfolgreicher Zahlung)
   - Datei: `backend/src/services/boldPaymentService.ts` (Zeile 695-711)
   - Generiert TTLock Passcode via `ttlockService.createTemporaryPasscode()`
   - Speichert in DB: `doorPin` und `ttlLockPassword`

2. **LobbyPMS API** (nach Check-in)
   - Status-Update löst Code-Generierung aus

3. **Button in Reservation Card** (Frontend)
   - Datei: `frontend/src/components/reservations/SendPasscodeSidepane.tsx`
   - API: `POST /api/reservations/:id/send-passcode`
   - Service: `ReservationNotificationService.sendPasscodeNotification()`
   - Generiert Code (wenn noch nicht vorhanden) und sendet ihn

**Code wird gespeichert in:**
- `reservation.doorPin` (String?) - **DAS ist das Feld, das verwendet wird!**
- `reservation.ttlLockPassword` (String?) - Wird auch befüllt, aber ist nicht das Hauptfeld

### ✅ Gast-Identifikation (WhatsApp):

- `WhatsAppGuestService.identifyGuestByPhone()` - Identifiziert via Telefonnummer
- `WhatsAppGuestService.findReservationsByDetails()` - Identifiziert via Name, Land, Geburtsdatum
- `continueGuestIdentification()` - Mehrstufige Abfrage (Vorname, Nachname, Land, Geburtsdatum)

### ❌ Problem: Code-Versand (WhatsApp)

**Aktuell:**
- Keywords: "code", "código", "codigo", "pin", "password", etc. (Zeile 213)
- Rufen `handleGuestCodeRequest()` auf (Zeile 1130)
- Verwendet `buildStatusMessage()` (Zeile 232)
- `buildStatusMessage()` verwendet `getReservationCode()` (Zeile 198)
- `getReservationCode()` hat Priorität: `lobbyReservationId` → `doorPin` → `ttlLockPassword`
- **PROBLEM:** Wenn `lobbyReservationId` vorhanden ist, wird dieser zurückgegeben, nicht der TTLock Passcode!

**Was fehlt:**
- Funktion, die NUR den TTLock Passcode aus DB liest (ohne Priorität)
- Funktion, die Code per WhatsApp versendet (ohne Links, ohne andere Codes)

---

## 🎯 Implementierungsplan

### Phase 1: Neue Funktion für TTLock Passcode-Abruf

**Datei:** `backend/src/services/whatsappGuestService.ts`

**Neue Funktion:** `getTTLockPasscode()`
- Parameter: `reservation`
- Rückgabe: `string | null` - TTLock Passcode (`doorPin`)
- Verhalten:
  - Prüft `reservation.doorPin` (das ist das Feld, das verwendet wird!)
  - Gibt den Wert zurück, falls vorhanden
  - Gibt `null` zurück, falls nicht vorhanden
  - **IGNORIERT lobbyReservationId komplett!**
  - **WICHTIG:** Code wird NICHT generiert, nur aus DB gelesen!

**Code:**
```typescript
/**
 * Gibt BEREITS GENERIERTEN TTLock Passcode zurück (aus DB)
 * IGNORIERT lobbyReservationId komplett!
 * Code wird NICHT generiert, nur gelesen!
 */
static getTTLockPasscode(reservation: any): string | null {
  // doorPin ist das Feld, das verwendet wird
  return reservation.doorPin || null;
}
```

**Neue Funktion:** `buildPincodeMessage()`
- Parameter: `reservation`, `language`
- Rückgabe: String mit NUR dem TTLock Passcode
- Verhalten:
  - Ruft `getTTLockPasscode(reservation)` auf
  - Falls vorhanden: Gibt Nachricht mit TTLock Passcode zurück
  - Falls nicht vorhanden: Gibt Fehlermeldung zurück (Code muss erst generiert werden)
  - **KEINE Payment Links, KEINE Check-in Links, NUR der Pincode!**
  - **KEINE Code-Generierung!** (Code muss bereits in DB vorhanden sein)

**Code:**
```typescript
/**
 * Erstellt Nachricht mit NUR dem BEREITS GENERIERTEN TTLock Passcode
 * Code wird NICHT generiert, nur aus DB gelesen!
 */
static buildPincodeMessage(
  reservation: any,
  language: string = 'es'
): string {
  const translations: Record<string, any> = {
    es: {
      greeting: (name: string) => `Hola ${name}!`,
      pincode: 'Tu código PIN:',
      noPincode: 'No hay código PIN disponible para esta reservación. Por favor, contacta con el personal.',
      seeYou: '¡Te esperamos!'
    },
    de: {
      greeting: (name: string) => `Hallo ${name}!`,
      pincode: 'Dein PIN-Code:',
      noPincode: 'Kein PIN-Code für diese Reservierung verfügbar. Bitte kontaktiere das Personal.',
      seeYou: 'Wir freuen uns auf dich!'
    },
    en: {
      greeting: (name: string) => `Hello ${name}!`,
      pincode: 'Your PIN code:',
      noPincode: 'No PIN code available for this reservation. Please contact the staff.',
      seeYou: 'We look forward to seeing you!'
    }
  };

  const t = translations[language] || translations.es;
  let message = t.greeting(reservation.guestName) + '\n\n';

  const pincode = this.getTTLockPasscode(reservation);
  if (pincode) {
    message += `${t.pincode} ${pincode}\n\n`;
    message += t.seeYou;
  } else {
    // Code wurde noch nicht generiert - Fehlermeldung
    message += t.noPincode;
  }

  return message;
}
```

---

### Phase 2: Handler anpassen für alle Code-Keywords

**Datei:** `backend/src/services/whatsappMessageHandler.ts`

**Option A: Handler anpassen (EINFACHER)**
- `handleGuestCodeRequest()` prüft, ob es eine Pincode-Anfrage ist
- Falls ja: Verwende `buildPincodeMessage()` statt `buildStatusMessage()`
- Falls nein: Verwende weiterhin `buildStatusMessage()`

**Option B: Neuer Handler (SAUBERER)**
- Neue Funktion `handleGuestPincodeRequest()` erstellen
- Verwendet `buildPincodeMessage()` statt `buildStatusMessage()`
- Alle Code-Keywords ("pin", "code", "pincode", etc.) rufen diesen Handler auf

**Empfehlung: Option A (einfacher, weniger Code-Duplikation)**

**Code-Struktur (Option A):**
```typescript
// In handleGuestCodeRequest(), Zeile 1130:
private static async handleGuestCodeRequest(
  phoneNumber: string,
  branchId: number,
  conversation: any,
  isPincodeRequest: boolean = false // NEU: Parameter hinzufügen
): Promise<string> {
  try {
    const reservation = await WhatsAppGuestService.identifyGuestByPhone(phoneNumber, branchId);
    
    if (reservation) {
      const language = LanguageDetectionService.detectLanguageFromPhoneNumber(phoneNumber);
      
      // NEU: Wenn Pincode-Anfrage, verwende buildPincodeMessage()
      if (isPincodeRequest) {
        return WhatsAppGuestService.buildPincodeMessage(reservation, language);
      }
      
      // Sonst: Normale Code-Anfrage mit buildStatusMessage()
      return await WhatsAppGuestService.buildStatusMessage(reservation, language);
    }
    
    // Keine Telefonnummer vorhanden - starte mehrstufige Identifikation
    await prisma.whatsAppConversation.update({
      where: { id: conversation.id },
      data: {
        state: isPincodeRequest ? 'guest_pincode_identification_name' : 'guest_identification_name',
        context: {
          step: 'name',
          collectedData: {},
          requestType: isPincodeRequest ? 'pincode' : 'code' // Markiere Request-Typ
        }
      }
    });

    const language = LanguageDetectionService.detectLanguageFromPhoneNumber(phoneNumber);
    const translations: Record<string, string> = {
      es: isPincodeRequest 
        ? 'No encontré tu reservación con tu número de teléfono. Para enviarte tu código PIN, necesito algunos datos:\n\n¿Cuál es tu nombre?'
        : 'No encontré tu reservación con tu número de teléfono. Por favor, proporciona los siguientes datos:\n\n¿Cuál es tu nombre?',
      de: isPincodeRequest
        ? 'Ich habe deine Reservierung mit deiner Telefonnummer nicht gefunden. Um dir deinen PIN-Code zu senden, benötige ich einige Daten:\n\nWie lautet dein Vorname?'
        : 'Ich habe deine Reservierung mit deiner Telefonnummer nicht gefunden. Bitte gib die folgenden Daten an:\n\nWie lautet dein Vorname?',
      en: isPincodeRequest
        ? 'I could not find your reservation with your phone number. To send you your PIN code, I need some information:\n\nWhat is your first name?'
        : 'I could not find your reservation with your phone number. Please provide the following information:\n\nWhat is your first name?'
    };

    return translations[language] || translations.es;
  } catch (error) {
    console.error('[WhatsApp Message Handler] Fehler bei Gast-Code-Anfrage:', error);
    return await this.getLanguageResponse(branchId, phoneNumber, 'error');
  }
}
```

---

### Phase 3: Conversation State für Pincode-Identifikation erweitern

**Datei:** `backend/src/services/whatsappMessageHandler.ts`

**Erweiterung:** `continueGuestIdentification()` (Zeile 1174)
- Prüfe `context.requestType === 'pincode'`
- Falls Pincode-Anfrage: Verwende `buildPincodeMessage()` statt `buildStatusMessage()`
- States: `guest_pincode_identification_name`, `guest_pincode_identification_lastname`, etc.
- **WICHTIG:** States müssen unterschiedlich sein zu `guest_identification_*`, damit beide Flows parallel funktionieren können

**Code-Struktur:**
```typescript
// In continueGuestIdentification(), Zeile 1287 und 1397:
// Nach erfolgreicher Identifikation (1 Reservation gefunden):
if (context.requestType === 'pincode') {
  // Sende NUR TTLock Passcode (aus DB, nicht generiert!)
  return WhatsAppGuestService.buildPincodeMessage(reservations[0], language);
} else {
  // Normale Code-Anfrage - sende alle Codes + Links
  return await WhatsAppGuestService.buildStatusMessage(reservations[0], language);
}
```

**Auch in handleIncomingMessage(), Zeile 218-225:**
```typescript
// Prüfe Conversation State (für mehrstufige Interaktionen)
if (conversation.state !== 'idle') {
  // Prüfe ob es Gast-Identifikation ist (normale ODER Pincode)
  if (conversation.state.startsWith('guest_identification') || 
      conversation.state.startsWith('guest_pincode_identification')) {
    return await this.continueGuestIdentification(normalizedPhone, messageText, conversation, branchId);
  }
  // ... Rest
}
```

---

### Phase 4: Keyword-Erkennung anpassen

**Datei:** `backend/src/services/whatsappMessageHandler.ts`

**Aktuell (Zeile 212-216):**
```typescript
// Keyword: "code" / "código" / "pin" / "password" - Gast-Code-Versand
const codeKeywords = ['code', 'código', 'codigo', 'pin', 'password', 'verloren', 'lost', 'perdido', 'acceso'];
if (codeKeywords.includes(normalizedText) && conversation.state === 'idle') {
  return await this.handleGuestCodeRequest(normalizedPhone, branchId, conversation);
}
```

**Neu:**
```typescript
// Keyword: "pin" / "pincode" / "code" / "código" / etc. - NUR TTLock Passcode (aus DB)
const pincodeKeywords = ['pin', 'pincode', 'pin code', 'código pin', 'codigo pin', 'code', 'código', 'codigo', 'password', 'verloren', 'lost', 'perdido', 'acceso'];
if (pincodeKeywords.includes(normalizedText) && conversation.state === 'idle') {
  // Alle Code-Keywords geben jetzt NUR TTLock Passcode zurück
  return await this.handleGuestCodeRequest(normalizedPhone, branchId, conversation, true); // true = Pincode-Anfrage
}
```

**WICHTIG:** Alle Keywords geben jetzt NUR TTLock Passcode zurück (keine Priorität mehr)!

---

## 📊 Datenbank-Änderungen

**Keine Änderungen erforderlich:**
- Alle benötigten Felder existieren bereits:
  - `Reservation.doorPin` - TTLock Passcode (wird generiert, DAS ist das Feld das verwendet wird!)
  - `Reservation.guestPhone` - Telefonnummer
  - `Reservation.guestName` - Name
  - `Reservation.guestNationality` - Land
  - `Reservation.guestBirthDate` - Geburtsdatum
  - `WhatsAppConversation.state` - Conversation State
  - `WhatsAppConversation.context` - Context (JSON)

---

## 🔧 Detaillierte Implementierung

### Schritt 1: Neue Funktionen in `WhatsAppGuestService`

**Datei:** `backend/src/services/whatsappGuestService.ts`

**Position:** Nach `buildStatusMessage()` (ca. Zeile 305)

**Funktionen:**
1. `getTTLockPasscode(reservation)` - Liest Code aus DB
2. `buildPincodeMessage(reservation, language)` - Erstellt Nachricht mit Code

---

### Schritt 2: Handler anpassen

**Datei:** `backend/src/services/whatsappMessageHandler.ts`

**Position:** `handleGuestCodeRequest()` (Zeile 1130)

**Änderungen:**
- Parameter `isPincodeRequest: boolean = false` hinzufügen
- Prüfe `isPincodeRequest` → verwende `buildPincodeMessage()` statt `buildStatusMessage()`
- Conversation State: `guest_pincode_identification_*` wenn Pincode-Anfrage

---

### Schritt 3: Conversation State erweitern

**Datei:** `backend/src/services/whatsappMessageHandler.ts`

**Position:** `continueGuestIdentification()` (Zeile 1174)

**Änderungen:**
- Prüfe `context.requestType === 'pincode'`
- Verwende `buildPincodeMessage()` statt `buildStatusMessage()`
- States: `guest_pincode_identification_*`

---

### Schritt 4: Keyword-Erkennung anpassen

**Datei:** `backend/src/services/whatsappMessageHandler.ts`

**Position:** `handleIncomingMessage()`, Zeile 213

**Änderungen:**
- Alle Code-Keywords rufen `handleGuestCodeRequest()` mit `isPincodeRequest: true` auf
- Alle geben jetzt NUR TTLock Passcode zurück

---

### Schritt 5: Conversation State Handling erweitern

**Datei:** `backend/src/services/whatsappMessageHandler.ts`

**Position:** `handleIncomingMessage()`, Zeile 218-225

**Änderungen:**
- Prüfe auch `guest_pincode_identification_*` States
- Rufe `continueGuestIdentification()` auf (funktioniert für beide)

---

## ✅ Test-Szenarien

### Test 1: Gast mit Telefonnummer fragt nach Pincode (Code vorhanden)
1. Gast sendet: "pin" oder "code" oder "pincode"
2. Bot identifiziert via Telefonnummer
3. Bot liest `doorPin` aus DB
4. Bot sendet: "Hola [Name]! Tu código PIN: [doorPin]"

### Test 2: Gast ohne Telefonnummer fragt nach Pincode (Code vorhanden)
1. Gast sendet: "pin"
2. Bot fragt: "¿Cuál es tu nombre?"
3. Gast sendet: "Juan"
4. Bot fragt: "¿Cuál es tu apellido?"
5. Gast sendet: "Pérez"
6. Bot fragt: "¿De qué país eres?"
7. Gast sendet: "Colombia"
8. Bot identifiziert Reservation
9. Bot liest `doorPin` aus DB
10. Bot sendet: "Hola Juan Pérez! Tu código PIN: [doorPin]"

### Test 3: Gast fragt nach Pincode, aber Code wurde noch nicht generiert
1. Gast sendet: "pin"
2. Bot identifiziert Reservation
3. Bot prüft: `doorPin` ist `null` oder `undefined`
4. Bot sendet: "Hola [Name]! No hay código PIN disponible para esta reservación. Por favor, contacta con el personal."
5. **Hinweis:** Code muss erst per Button in Reservation Card oder via Webhook generiert werden!

### Test 4: Code-Generierung funktioniert weiterhin
1. Button in Reservation Card wird gedrückt
2. Code wird generiert und in DB gespeichert
3. Code wird per WhatsApp/Email versendet
4. Gast kann Code später per WhatsApp abrufen

---

## 🚨 Wichtige Hinweise

1. **Code wird NICHT generiert:**
   - Bot liest nur den bereits generierten Code aus DB
   - Code muss bereits existieren (via Button oder Webhook generiert)

2. **Alle Keywords geben TTLock Passcode zurück:**
   - "pin", "code", "pincode", "código", etc. → alle geben TTLock Passcode zurück
   - Keine Priorität mehr (lobbyReservationId wird ignoriert)

3. **Unterscheidung zu bestehendem Prozess:**
   - **Bestehender Prozess:** Generiert Code (Button, Webhook) → speichert in DB → sendet
   - **Neuer Prozess:** Liest Code aus DB → sendet (keine Generierung!)

4. **Fehlerbehandlung:**
   - Falls kein Code vorhanden: Fehlermeldung senden
   - Gast muss Personal kontaktieren oder Code muss erst generiert werden

5. **Rückwärtskompatibilität:**
   - Bestehender Code-Generierungs-Prozess bleibt unverändert
   - Nur WhatsApp-Abruf wird angepasst

---

## 📝 Zusammenfassung

**Was wird implementiert:**
1. ✅ Neue Funktion `getTTLockPasscode()` - Liest Code aus DB (ohne Priorität)
2. ✅ Neue Funktion `buildPincodeMessage()` - Sendet NUR TTLock Passcode
3. ✅ Handler anpassen - Alle Code-Keywords geben TTLock Passcode zurück
4. ✅ Conversation States für Pincode-Identifikation

**Was bleibt unverändert:**
- Bestehender Code-Generierungs-Prozess (Button, Webhook)
- Gast-Identifikation wird wiederverwendet
- Keine Datenbank-Änderungen erforderlich

**Nächste Schritte:**
1. ⏳ Plan vom User bestätigen lassen
2. ⏳ Implementierung durchführen
3. ⏳ Testing
4. ⏳ Dokumentation aktualisieren

---

## 🎯 Implementierungsreihenfolge

1. **Schritt 1:** `getTTLockPasscode()` und `buildPincodeMessage()` in `WhatsAppGuestService` erstellen
2. **Schritt 2:** `handleGuestCodeRequest()` anpassen (Parameter `isPincodeRequest` hinzufügen)
3. **Schritt 3:** `continueGuestIdentification()` erweitern (Pincode-Unterstützung)
4. **Schritt 4:** Keyword-Erkennung anpassen (alle Keywords → Pincode-Anfrage)
5. **Schritt 5:** Conversation State Handling erweitern (Pincode-States)
6. **Schritt 6:** Testing (alle Szenarien durchführen)

---

## 📚 Referenzen

- `backend/src/services/whatsappGuestService.ts` - Gast-Service
- `backend/src/services/whatsappMessageHandler.ts` - Message Handler
- `backend/src/services/reservationNotificationService.ts` - Code-Generierung (bestehender Prozess)
- `backend/src/services/boldPaymentService.ts` - Bold Payment Webhook (Code-Generierung)
- `frontend/src/components/reservations/SendPasscodeSidepane.tsx` - Button für Code-Generierung
- `docs/user/WHATSAPP_BOT_NUTZUNG_ANLEITUNG.md` - Nutzungsanleitung

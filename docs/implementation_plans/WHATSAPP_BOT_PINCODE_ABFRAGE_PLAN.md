# WhatsApp Bot - Pincode-Abfrage Implementierungsplan

**Datum:** 2025-01-22  
**Status:** Plan - NICHTS UMSETZEN  
**Ziel:** Bot soll bei Pincode-Anfrage NUR den TTLock Passcode (doorPin/ttlLockPassword) zurückgeben

---

## 📋 Zusammenfassung der Anforderung

**Use Case:** Gäste, die am Eingang stehen und ihren Pincode vergessen haben, sollen per WhatsApp nach ihrem Pincode fragen können.

**Anforderung:**
- Bot erkennt Anfrage nach Pincode ("pin", "pincode", etc.)
- Bot prüft, ob anfragende Person eine bestehende Reservation hat:
  1. **Primär:** Prüfung via Telefonnummer
  2. **Sekundär:** Falls nicht gefunden, Abfrage von Vorname & Name
  3. Bei Übereinstimmung: **BEREITS GENERIERTEN** TTLock Passcode (doorPin oder ttlLockPassword) der Reservation als Antwort geben
- Bot gibt NUR den TTLock Passcode zurück (doorPin/ttlLockPassword)
- KEINE lobbyReservationId, KEINE anderen Codes, NUR der TTLock Passcode
- **WICHTIG:** Code wird NICHT generiert, nur abgerufen! (Code muss bereits per Button in Reservation Card generiert worden sein)

---

## 🔍 Analyse: Was besteht bereits?

### ✅ Bereits vorhanden:

1. **TTLock Passcode Generierung (Frontend):**
   - Button (Key-Icon) in Reservation Card öffnet `SendPasscodeSidepane`
   - `SendPasscodeSidepane` erlaubt Generierung und Versand des TTLock Passcodes
   - API: `POST /api/reservations/:id/send-passcode`
   - Service: `ReservationNotificationService.sendPasscodeNotification()`
   - **WICHTIG:** Generiert den Code (wenn noch nicht vorhanden) und speichert ihn in `reservation.doorPin` und `reservation.ttlLockPassword`

2. **Gast-Identifikation (WhatsApp):**
   - `WhatsAppGuestService.identifyGuestByPhone()` - Identifiziert via Telefonnummer
   - `WhatsAppGuestService.findReservationsByDetails()` - Identifiziert via Name, Land, Geburtsdatum
   - `continueGuestIdentification()` - Mehrstufige Abfrage (Vorname, Nachname, Land, Geburtsdatum)

3. **Code-Versand (WhatsApp - PROBLEM):**
   - `handleGuestCodeRequest()` - Verarbeitet Code-Anfragen (Zeile 1130)
   - `buildStatusMessage()` - Erstellt Nachricht mit Code + Links (Zeile 232)
   - `getReservationCode()` - Findet Code mit Priorität: lobbyReservationId → doorPin → ttlLockPassword (Zeile 198)
   - **PROBLEM:** Wenn lobbyReservationId vorhanden ist, wird dieser zurückgegeben, nicht der TTLock Passcode!

4. **Keywords:**
   - Aktuell: "code", "código", "codigo", "pin", "password", "verloren", "lost", "perdido", "acceso" (Zeile 213)
   - Diese rufen `handleGuestCodeRequest()` auf, der `buildStatusMessage()` verwendet
   - `buildStatusMessage()` verwendet `getReservationCode()` mit Priorität → FALSCH für Pincode!

### ❌ Was fehlt:

1. **Funktion, die BEREITS GENERIERTEN TTLock Passcode abruft:**
   - `getReservationCode()` hat Priorität und gibt lobbyReservationId zurück, wenn vorhanden
   - Benötigt: Funktion, die direkt `doorPin` oder `ttlLockPassword` zurückgibt (sind dasselbe)
   - **WICHTIG:** Code wird NICHT generiert, nur abgerufen! (Code muss bereits existieren)

2. **Anpassung für "pin"/"pincode":**
   - Aktuell: "pin" verwendet `buildStatusMessage()` → gibt falschen Code zurück
   - Neu: "pin"/"pincode" soll NUR den bereits generierten TTLock Passcode zurückgeben
   - Falls kein Code vorhanden: Fehlermeldung (Code muss erst generiert werden)

---

## 🎯 Implementierungsplan

### Phase 1: Neue Funktion für TTLock Passcode

**Datei:** `backend/src/services/whatsappGuestService.ts`

**Neue Funktion:** `getTTLockPasscode()`
- Parameter: `reservation`
- Rückgabe: `string | null` - TTLock Passcode (doorPin oder ttlLockPassword)
- Verhalten:
  - Prüft `reservation.doorPin` ODER `reservation.ttlLockPassword` (sind dasselbe)
  - Gibt den Wert zurück, falls vorhanden
  - Gibt `null` zurück, falls nicht vorhanden
  - **IGNORIERT lobbyReservationId komplett!**
  - **WICHTIG:** Code wird NICHT generiert, nur abgerufen! (Code muss bereits existieren)

**Neue Funktion:** `buildPincodeMessage()`
- Parameter: `reservation`, `language`
- Rückgabe: String mit NUR dem TTLock Passcode
- Verhalten:
  - Ruft `getTTLockPasscode(reservation)` auf
  - Falls vorhanden: Gibt Nachricht mit TTLock Passcode zurück
  - Falls nicht vorhanden: Gibt Fehlermeldung zurück (Code muss erst generiert werden)
  - **KEINE Payment Links, KEINE Check-in Links, NUR der Pincode!**
  - **KEINE Code-Generierung!** (Code muss bereits in DB vorhanden sein)

**Code-Struktur:**
```typescript
/**
 * Gibt TTLock Passcode zurück (doorPin oder ttlLockPassword)
 * IGNORIERT lobbyReservationId komplett!
 */
static getTTLockPasscode(reservation: any): string | null {
  // doorPin und ttlLockPassword sind dasselbe (TTLock Passcode)
  return reservation.doorPin || reservation.ttlLockPassword || null;
}

/**
 * Erstellt Nachricht mit NUR dem TTLock Passcode
 */
static buildPincodeMessage(
  reservation: any,
  language: string = 'es'
): string {
  const translations: Record<string, any> = {
    es: {
      greeting: (name: string) => `Hola ${name}!`,
      pincode: 'Tu código PIN:',
      noPincode: 'No hay código PIN disponible para esta reservación.',
      seeYou: '¡Te esperamos!'
    },
    de: {
      greeting: (name: string) => `Hallo ${name}!`,
      pincode: 'Dein PIN-Code:',
      noPincode: 'Kein PIN-Code für diese Reservierung verfügbar.',
      seeYou: 'Wir freuen uns auf dich!'
    },
    en: {
      greeting: (name: string) => `Hello ${name}!`,
      pincode: 'Your PIN code:',
      noPincode: 'No PIN code available for this reservation.',
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
    // Optional: Hinweis, dass Code erst generiert werden muss
    // message += '\n\n' + t.pincodeNotGenerated;
  }

  return message;
}
```

---

### Phase 2: Handler anpassen für "pin"/"pincode"

**Datei:** `backend/src/services/whatsappMessageHandler.ts`

**Option A: Handler anpassen (EINFACHER)**
- `handleGuestCodeRequest()` prüft, ob Keyword "pin" oder "pincode" ist
- Falls ja: Verwende `buildPincodeMessage()` statt `buildStatusMessage()`
- Falls nein: Verwende weiterhin `buildStatusMessage()`

**Option B: Neuer Handler (SAUBERER)**
- Neue Funktion `handleGuestPincodeRequest()` erstellen
- Verwendet `buildPincodeMessage()` statt `buildStatusMessage()`
- Keywords "pin", "pincode" rufen diesen Handler auf
- Keywords "code", "código" rufen weiterhin `handleGuestCodeRequest()` auf

**Code-Struktur (Option B - Neuer Handler):**
```typescript
private static async handleGuestPincodeRequest(
  phoneNumber: string,
  branchId: number,
  conversation: any
): Promise<string> {
  try {
    // Versuche zuerst via Telefonnummer zu identifizieren
    const reservation = await WhatsAppGuestService.identifyGuestByPhone(phoneNumber, branchId);
    
    if (reservation) {
      // Gast gefunden via Telefonnummer - sende NUR TTLock Passcode
      const language = LanguageDetectionService.detectLanguageFromPhoneNumber(phoneNumber);
      return WhatsAppGuestService.buildPincodeMessage(reservation, language);
    }

    // Keine Telefonnummer vorhanden - starte mehrstufige Identifikation
    await prisma.whatsAppConversation.update({
      where: { id: conversation.id },
      data: {
        state: 'guest_pincode_identification_name',
        context: {
          step: 'name',
          collectedData: {},
          requestType: 'pincode' // Markiere als Pincode-Anfrage
        }
      }
    });

    const language = LanguageDetectionService.detectLanguageFromPhoneNumber(phoneNumber);
    const translations: Record<string, string> = {
      es: 'No encontré tu reservación con tu número de teléfono. Para enviarte tu código PIN, necesito algunos datos:\n\n¿Cuál es tu nombre?',
      de: 'Ich habe deine Reservierung mit deiner Telefonnummer nicht gefunden. Um dir deinen PIN-Code zu senden, benötige ich einige Daten:\n\nWie lautet dein Vorname?',
      en: 'I could not find your reservation with your phone number. To send you your PIN code, I need some information:\n\nWhat is your first name?'
    };

    return translations[language] || translations.es;
  } catch (error) {
    console.error('[WhatsApp Message Handler] Fehler bei Pincode-Anfrage:', error);
    return await this.getLanguageResponse(branchId, phoneNumber, 'error');
  }
}
```

**Code-Struktur (Option A - Handler anpassen):**
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
    
    // ... Rest bleibt gleich
  }
}

// In handleIncomingMessage(), Zeile 213:
// Keyword: "pin" / "pincode" - NUR TTLock Passcode
const pincodeKeywords = ['pin', 'pincode', 'pin code', 'código pin', 'codigo pin'];
if (pincodeKeywords.includes(normalizedText) && conversation.state === 'idle') {
  return await this.handleGuestCodeRequest(normalizedPhone, branchId, conversation, true); // true = Pincode-Anfrage
}

// Keyword: "code" / "código" / "password" - Alle Codes + Links
const codeKeywords = ['code', 'código', 'codigo', 'password', 'verloren', 'lost', 'perdido', 'acceso'];
if (codeKeywords.includes(normalizedText) && conversation.state === 'idle') {
  return await this.handleGuestCodeRequest(normalizedPhone, branchId, conversation, false); // false = Normale Anfrage
}
```

---

### Phase 3: Conversation State für Pincode-Identifikation erweitern

**Datei:** `backend/src/services/whatsappMessageHandler.ts`

**Erweiterung:** `continueGuestIdentification()` (Zeile 1174)
- Prüfe `context.requestType === 'pincode'`
- Falls Pincode-Anfrage: Verwende `buildPincodeMessage()` statt `buildStatusMessage()`
- States: `guest_pincode_identification_name`, `guest_pincode_identification_lastname`, `guest_pincode_identification_nationality`, `guest_pincode_identification_birthdate`
- **WICHTIG:** States müssen unterschiedlich sein zu `guest_identification_*`, damit beide Flows parallel funktionieren können

**Code-Struktur:**
```typescript
// In continueGuestIdentification(), Zeile 1287 und 1397:
// Nach erfolgreicher Identifikation (1 Reservation gefunden):
if (context.requestType === 'pincode') {
  // Sende NUR TTLock Passcode
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
// Keyword: "pin" / "pincode" / "pin code" / "código pin" - NUR TTLock Passcode
const pincodeKeywords = ['pin', 'pincode', 'pin code', 'código pin', 'codigo pin'];
if (pincodeKeywords.includes(normalizedText) && conversation.state === 'idle') {
  // Option A: Neuer Handler
  return await this.handleGuestPincodeRequest(normalizedPhone, branchId, conversation);
  // ODER Option B: Bestehender Handler mit Parameter
  return await this.handleGuestCodeRequest(normalizedPhone, branchId, conversation, true);
}

// Keyword: "code" / "código" / "password" - Alle Codes + Links (OHNE "pin"!)
const codeKeywords = ['code', 'código', 'codigo', 'password', 'verloren', 'lost', 'perdido', 'acceso'];
if (codeKeywords.includes(normalizedText) && conversation.state === 'idle') {
  return await this.handleGuestCodeRequest(normalizedPhone, branchId, conversation, false);
}
```

**WICHTIG:** "pin" wird aus `codeKeywords` entfernt und zu `pincodeKeywords` verschoben!

---

## 📊 Datenbank-Änderungen

**Keine Änderungen erforderlich:**
- Alle benötigten Felder existieren bereits:
  - `Reservation.ttlLockPassword` - TTLock Passcode
  - `Reservation.guestPhone` - Telefonnummer
  - `Reservation.guestName` - Name
  - `Reservation.guestNationality` - Land
  - `Reservation.guestBirthDate` - Geburtsdatum
  - `WhatsAppConversation.state` - Conversation State
  - `WhatsAppConversation.context` - Context (JSON)

---

## 🔧 Detaillierte Implementierung

### Schritt 1: Neue Funktion `buildPincodeMessage()` in `WhatsAppGuestService`

**Datei:** `backend/src/services/whatsappGuestService.ts`

**Position:** Nach `buildStatusMessage()` (ca. Zeile 305)

**Funktion:**
- Erstellt Nachricht mit NUR dem TTLock Passcode
- Übersetzungen für es, de, en
- Fehlermeldung, falls kein TTLock Passcode vorhanden

---

### Schritt 2: Neuer Handler `handleGuestPincodeRequest()` in `WhatsAppMessageHandler`

**Datei:** `backend/src/services/whatsappMessageHandler.ts`

**Position:** Nach `handleGuestCodeRequest()` (ca. Zeile 1169)

**Funktion:**
- Identifiziert Gast via Telefonnummer
- Falls gefunden: Sende TTLock Passcode
- Falls nicht gefunden: Starte mehrstufige Identifikation mit `requestType: 'pincode'`

---

### Schritt 3: Erweiterung `continueGuestIdentification()` für Pincode-Anfragen

**Datei:** `backend/src/services/whatsappMessageHandler.ts`

**Position:** In `continueGuestIdentification()` (ca. Zeile 1174)

**Änderungen:**
- Prüfe `context.requestType === 'pincode'`
- Falls Pincode-Anfrage: Verwende `buildPincodeMessage()` statt `buildStatusMessage()`
- States: `guest_pincode_identification_*` statt `guest_identification_*`

**WICHTIG:** States müssen unterschiedlich sein, damit beide Flows parallel funktionieren können!

---

### Schritt 4: Keyword-Erkennung erweitern

**Datei:** `backend/src/services/whatsappMessageHandler.ts`

**Position:** In `handleIncomingMessage()`, nach Zeile 213

**Änderungen:**
- Neue Keywords: "pincode", "pin code", "código pin", "codigo pin"
- Handler: `handleGuestPincodeRequest()`
- **WICHTIG:** Pincode-Keywords müssen VOR "pin" geprüft werden!

---

### Schritt 5: Conversation State Handling erweitern

**Datei:** `backend/src/services/whatsappMessageHandler.ts`

**Position:** In `handleIncomingMessage()`, Zeile 218-225

**Änderungen:**
- Prüfe auch `guest_pincode_identification_*` States
- Rufe `continueGuestIdentification()` auf (funktioniert für beide)

---

## ✅ Test-Szenarien

### Test 1: Gast mit Telefonnummer fragt nach Pincode
1. Gast sendet: "pincode"
2. Bot identifiziert via Telefonnummer
3. Bot sendet: "Hola [Name]! Tu código PIN: [ttlLockPassword]"

### Test 2: Gast ohne Telefonnummer fragt nach Pincode
1. Gast sendet: "pincode"
2. Bot fragt: "¿Cuál es tu nombre?"
3. Gast sendet: "Juan"
4. Bot fragt: "¿Cuál es tu apellido?"
5. Gast sendet: "Pérez"
6. Bot fragt: "¿De qué país eres?"
7. Gast sendet: "Colombia"
8. Bot identifiziert Reservation
9. Bot sendet: "Hola Juan Pérez! Tu código PIN: [ttlLockPassword]"

### Test 3: Gast fragt nach Pincode, aber kein TTLock Passcode vorhanden
1. Gast sendet: "pincode"
2. Bot identifiziert Reservation
3. Bot sendet: "Hola [Name]! No hay código PIN disponible para esta reservación."

### Test 4: Gast fragt nach "code" (sollte weiterhin alle Codes senden)
1. Gast sendet: "code"
2. Bot identifiziert Reservation
3. Bot sendet: Code mit Priorität (lobbyReservationId → doorPin → ttlLockPassword)

---

## 🚨 Wichtige Hinweise

1. **Unterscheidung "pin" vs "pincode":**
   - "pin" → Sendet Code mit Priorität (kann lobbyReservationId, doorPin oder ttlLockPassword sein)
   - "pincode" → Sendet NUR ttlLockPassword

2. **Keyword-Reihenfolge:**
   - Pincode-Keywords müssen VOR "pin" geprüft werden (sonst wird "pincode" als "pin" erkannt)

3. **Conversation States:**
   - Neue States: `guest_pincode_identification_*` (unterschiedlich zu `guest_identification_*`)
   - Ermöglicht parallele Flows (Code-Anfrage und Pincode-Anfrage)

4. **Rückwärtskompatibilität:**
   - Bestehende Keywords ("code", "pin", etc.) funktionieren weiterhin wie bisher
   - Neue Keywords ("pincode", etc.) fügen neue Funktionalität hinzu

5. **Fehlerbehandlung:**
   - Falls kein TTLock Passcode vorhanden: Fehlermeldung senden
   - Falls keine Reservation gefunden: Bestehende Fehlermeldung verwenden

---

## 📝 Zusammenfassung

**Was wird implementiert:**
1. ✅ Neue Funktion `buildPincodeMessage()` - Sendet NUR TTLock Passcode
2. ✅ Neuer Handler `handleGuestPincodeRequest()` - Verarbeitet Pincode-Anfragen
3. ✅ Erweiterung `continueGuestIdentification()` - Unterstützt Pincode-Anfragen
4. ✅ Neue Keywords: "pincode", "pin code", "código pin", "codigo pin"
5. ✅ Conversation States für Pincode-Identifikation

**Was bleibt unverändert:**
- Bestehende Keywords ("code", "pin", etc.) funktionieren weiterhin
- Bestehende Gast-Identifikation wird wiederverwendet
- Keine Datenbank-Änderungen erforderlich

**Nächste Schritte:**
1. ⏳ Plan vom User bestätigen lassen
2. ⏳ Implementierung durchführen
3. ⏳ Testing
4. ⏳ Dokumentation aktualisieren

---

## 🎯 Implementierungsreihenfolge

1. **Schritt 1:** `buildPincodeMessage()` in `WhatsAppGuestService` erstellen
2. **Schritt 2:** `handleGuestPincodeRequest()` in `WhatsAppMessageHandler` erstellen
3. **Schritt 3:** `continueGuestIdentification()` erweitern (Pincode-Unterstützung)
4. **Schritt 4:** Keyword-Erkennung erweitern (Pincode-Keywords hinzufügen)
5. **Schritt 5:** Conversation State Handling erweitern (Pincode-States)
6. **Schritt 6:** Testing (alle Szenarien durchführen)

---

## 📚 Referenzen

- `backend/src/services/whatsappGuestService.ts` - Gast-Service
- `backend/src/services/whatsappMessageHandler.ts` - Message Handler
- `backend/src/services/whatsappAiService.ts` - KI-Service
- `docs/user/WHATSAPP_BOT_NUTZUNG_ANLEITUNG.md` - Nutzungsanleitung
- `docs/implementation_plans/WHATSAPP_BOT_ERWEITERUNG_ANALYSE_UND_PLAN.md` - Bestehende Implementierung


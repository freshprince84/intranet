# WhatsApp Bot - Pincode-Abfrage Implementierungsplan

**Datum:** 2025-01-22  
**Status:** Plan - NICHTS UMSETZEN  
**Ziel:** Bot soll bei Pincode-Anfrage NUR den TTLock Passcode zurückgeben

---

## 📋 Zusammenfassung der Anforderung

**Use Case:** Gäste, die am Eingang stehen und ihren Pincode vergessen haben, sollen per WhatsApp nach ihrem Pincode fragen können.

**Anforderung:**
- Bot erkennt Anfrage nach Pincode
- Bot prüft, ob anfragende Person eine bestehende Reservation hat:
  1. **Primär:** Prüfung via Telefonnummer
  2. **Sekundär:** Falls nicht gefunden, Abfrage von Vorname & Name
  3. Bei Übereinstimmung beider (case-insensitive): TTLock Passcode der Reservation als Antwort geben
- Bot gibt NUR den TTLock Passcode zurück (nicht lobbyReservationId oder doorPin)

---

## 🔍 Analyse: Was besteht bereits?

### ✅ Bereits vorhanden:

1. **Gast-Identifikation:**
   - `WhatsAppGuestService.identifyGuestByPhone()` - Identifiziert via Telefonnummer
   - `WhatsAppGuestService.findReservationsByDetails()` - Identifiziert via Name, Land, Geburtsdatum
   - `continueGuestIdentification()` - Mehrstufige Abfrage (Vorname, Nachname, Land, Geburtsdatum)

2. **Code-Versand:**
   - `handleGuestCodeRequest()` - Verarbeitet Code-Anfragen
   - `buildStatusMessage()` - Erstellt Nachricht mit Code + Links
   - `getReservationCode()` - Findet Code mit Priorität: lobbyReservationId → doorPin → ttlLockPassword

3. **Keywords:**
   - Aktuell: "code", "código", "codigo", "pin", "password", "verloren", "lost", "perdido", "acceso"
   - Diese senden ALLE Codes (mit Priorität)

### ❌ Was fehlt:

1. **Spezifische Pincode-Abfrage:**
   - Kein separater Handler für "pincode" (nur "pin" existiert, sendet aber alle Codes)
   - Keine Funktion, die NUR den TTLock Passcode zurückgibt

2. **Unterscheidung:**
   - Aktuell: "pin" sendet Code mit Priorität (kann lobbyReservationId oder doorPin sein)
   - Neu: "pincode" soll NUR ttlLockPassword zurückgeben

---

## 🎯 Implementierungsplan

### Phase 1: Neue Funktion für TTLock Passcode

**Datei:** `backend/src/services/whatsappGuestService.ts`

**Neue Funktion:** `buildPincodeMessage()`
- Parameter: `reservation`, `language`
- Rückgabe: String mit NUR dem TTLock Passcode
- Verhalten:
  - Prüft, ob `reservation.ttlLockPassword` vorhanden ist
  - Falls vorhanden: Gibt Nachricht mit TTLock Passcode zurück
  - Falls nicht vorhanden: Gibt Fehlermeldung zurück (kein Pincode verfügbar)

**Code-Struktur:**
```typescript
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

  if (reservation.ttlLockPassword) {
    message += `${t.pincode} ${reservation.ttlLockPassword}\n\n`;
    message += t.seeYou;
  } else {
    message += t.noPincode;
  }

  return message;
}
```

---

### Phase 2: Neuer Handler für Pincode-Anfrage

**Datei:** `backend/src/services/whatsappMessageHandler.ts`

**Neue Funktion:** `handleGuestPincodeRequest()`
- Parameter: `phoneNumber`, `branchId`, `conversation`
- Verhalten:
  1. Versuche zuerst via Telefonnummer zu identifizieren
  2. Falls gefunden: Sende TTLock Passcode via `buildPincodeMessage()`
  3. Falls nicht gefunden: Starte mehrstufige Identifikation (wie bei `handleGuestCodeRequest()`)
  4. Nach erfolgreicher Identifikation: Sende TTLock Passcode

**Code-Struktur:**
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
      // Gast gefunden via Telefonnummer - sende TTLock Passcode
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

---

### Phase 3: Conversation State für Pincode-Identifikation erweitern

**Datei:** `backend/src/services/whatsappMessageHandler.ts`

**Erweiterung:** `continueGuestIdentification()`
- Prüfe `context.requestType === 'pincode'`
- Falls Pincode-Anfrage: Verwende `buildPincodeMessage()` statt `buildStatusMessage()`
- States: `guest_pincode_identification_name`, `guest_pincode_identification_lastname`, `guest_pincode_identification_nationality`, `guest_pincode_identification_birthdate`

**Code-Struktur:**
```typescript
// In continueGuestIdentification(), nach erfolgreicher Identifikation:
if (context.requestType === 'pincode') {
  // Sende NUR TTLock Passcode
  return WhatsAppGuestService.buildPincodeMessage(reservations[0], language);
} else {
  // Normale Code-Anfrage - sende alle Codes
  return await WhatsAppGuestService.buildStatusMessage(reservations[0], language);
}
```

---

### Phase 4: Keyword-Erkennung erweitern

**Datei:** `backend/src/services/whatsappMessageHandler.ts`

**Erweiterung:** Keyword-Liste
- Neue Keywords: "pincode", "pin code", "código pin", "codigo pin"
- Handler: `handleGuestPincodeRequest()` statt `handleGuestCodeRequest()`

**Code-Struktur:**
```typescript
// In handleIncomingMessage(), nach Zeile 213:
// Keyword: "pincode" / "pin code" / "código pin" - TTLock Passcode NUR
const pincodeKeywords = ['pincode', 'pin code', 'código pin', 'codigo pin'];
if (pincodeKeywords.includes(normalizedText) && conversation.state === 'idle') {
  return await this.handleGuestPincodeRequest(normalizedPhone, branchId, conversation);
}

// Keyword: "code" / "código" / "pin" / "password" - Gast-Code-Versand (ALLE Codes)
const codeKeywords = ['code', 'código', 'codigo', 'pin', 'password', 'verloren', 'lost', 'perdido', 'acceso'];
if (codeKeywords.includes(normalizedText) && conversation.state === 'idle') {
  return await this.handleGuestCodeRequest(normalizedPhone, branchId, conversation);
}
```

**WICHTIG:** "pincode" muss VOR "pin" geprüft werden, da "pin" auch in "pincode" enthalten ist!

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


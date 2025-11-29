# WhatsApp Bot - Fixes Plan

## Übersicht

Dieser Plan dokumentiert die Fixes für die identifizierten Probleme im WhatsApp Bot.

**Datum:** 2025-01-XX  
**Status:** Planung abgeschlossen, bereit für Umsetzung

---

## Probleme identifiziert

### Problem 1: Build-Fehler - `roomType` und `categoryId` existieren nicht im Schema

**Datei:** `backend/src/services/whatsappFunctionHandlers.ts`  
**Zeile:** 1137-1138

**Problem:**
- `roomType: args.roomType` und `categoryId: args.categoryId` werden in `prisma.reservation.create()` verwendet
- Diese Felder existieren **NICHT** im Reservation Schema
- Im Schema gibt es nur: `roomNumber` und `roomDescription`
- `roomType` ist ein Parameter vom Typ `'compartida' | 'privada'` (für LobbyPMS)
- `categoryId` ist ein Parameter für LobbyPMS (wird dort verwendet, aber nicht in DB gespeichert)

**Ursache:**
- Diese Felder werden für LobbyPMS verwendet, aber nicht in der lokalen DB gespeichert
- Sie sind nur temporäre Parameter für die Funktion

**Lösung:**
- **Entfernen** von `roomType` und `categoryId` aus dem `create()` Call
- Diese Felder werden nur für LobbyPMS verwendet (Zeile 1102-1110), nicht für DB-Speicherung
- Sie sind bereits im Return-Objekt enthalten (Zeile 1210-1211), das ist OK

**Code-Änderung:**
```typescript
// VORHER (Zeile 1123-1141):
const reservation = await prisma.reservation.create({
  data: {
    guestName: args.guestName.trim(),
    guestPhone: args.guestPhone?.trim() || null,
    guestEmail: args.guestEmail?.trim() || null,
    checkInDate: checkInDate,
    checkOutDate: checkOutDate,
    status: ReservationStatus.confirmed,
    paymentStatus: PaymentStatus.pending,
    amount: estimatedAmount,
    currency: 'COP',
    organizationId: branch.organizationId,
    branchId: branchId,
    lobbyReservationId: lobbyReservationId,
    roomType: args.roomType,        // ❌ ENTFERNEN - existiert nicht im Schema
    categoryId: args.categoryId     // ❌ ENTFERNEN - existiert nicht im Schema
  }
});

// NACHHER:
const reservation = await prisma.reservation.create({
  data: {
    guestName: args.guestName.trim(),
    guestPhone: args.guestPhone?.trim() || null,
    guestEmail: args.guestEmail?.trim() || null,
    checkInDate: checkInDate,
    checkOutDate: checkOutDate,
    status: ReservationStatus.confirmed,
    paymentStatus: PaymentStatus.pending,
    amount: estimatedAmount,
    currency: 'COP',
    organizationId: branch.organizationId,
    branchId: branchId,
    lobbyReservationId: lobbyReservationId
    // ✅ roomType und categoryId entfernt - werden nur für LobbyPMS verwendet, nicht in DB gespeichert
  }
});
```

**Risiko:** Niedrig - Diese Felder werden nicht verwendet, nur entfernt

---

### Problem 2: Keyword-Erkennung zu strikt - Sätze werden nicht erkannt

**Datei:** `backend/src/services/whatsappMessageHandler.ts`  
**Zeile:** 214

**Problem:**
- "krieg ich meinen pin" wird **NICHT** erkannt
- Aktuell: `pincodeKeywords.includes(normalizedText)` prüft nur **exakte Matches**
- Keywords sind: `['pin', 'pincode', 'pin code', 'código pin', ...]`
- "krieg ich meinen pin" ist ein kompletter Satz, kein einzelnes Keyword
- `includes()` prüft nur, ob der komplette Text exakt einem Keyword entspricht

**Ursache:**
- Keyword-Liste enthält nur einzelne Wörter/Phrasen
- Prüfung ist zu strikt (exakter Match statt "enthält")

**Lösung:**
- Prüfen ob **Keywords im Text enthalten sind**, nicht nur exakte Matches
- Verwende: `pincodeKeywords.some(keyword => normalizedText.includes(keyword))`
- Das erkennt auch Sätze wie "krieg ich meinen pin" (enthält "pin")

**Code-Änderung:**
```typescript
// VORHER (Zeile 212-217):
const pincodeKeywords = ['pin', 'pincode', 'pin code', 'código pin', 'codigo pin', 'code', 'código', 'codigo', 'password', 'verloren', 'lost', 'perdido', 'acceso'];
if (pincodeKeywords.includes(normalizedText) && conversation.state === 'idle') {
  return await this.handleGuestCodeRequest(normalizedPhone, branchId, conversation, true);
}

// NACHHER:
const pincodeKeywords = ['pin', 'pincode', 'pin code', 'código pin', 'codigo pin', 'code', 'código', 'codigo', 'password', 'verloren', 'lost', 'perdido', 'acceso'];
if (pincodeKeywords.some(keyword => normalizedText.includes(keyword)) && conversation.state === 'idle') {
  return await this.handleGuestCodeRequest(normalizedPhone, branchId, conversation, true);
}
```

**Risiko:** Niedrig - Verbessert Erkennung, keine Breaking Changes

**Test-Fälle:**
- ✅ "pin" → erkannt
- ✅ "code" → erkannt
- ✅ "krieg ich meinen pin" → **JETZT erkannt** (enthält "pin")
- ✅ "habe meinen code verloren" → **JETZT erkannt** (enthält "code")
- ✅ "pincode" → erkannt

---

### Problem 3: Nationalität case-sensitive - "Colombia" vs "colombia"

**Datei:** `backend/src/services/whatsappGuestService.ts`  
**Zeile:** 86

**Problem:**
- Gast gibt "Colombia" ein, aber in DB steht "colombia" (oder umgekehrt)
- Aktuell: `guestNationality: nationality` ist **case-sensitive**
- Prisma `equals` ist standardmäßig case-sensitive
- Beispiel: "Sara Garcia" aus "Colombia" wird nicht gefunden, wenn in DB "colombia" steht

**Ursache:**
- Prisma `equals` ist case-sensitive
- Keine Normalisierung der Nationalität vor der Suche

**Lösung:**
- Verwende `mode: 'insensitive'` für case-insensitive Suche
- Ändere: `guestNationality: nationality` → `guestNationality: { equals: nationality, mode: 'insensitive' }`

**Code-Änderung:**
```typescript
// VORHER (Zeile 72-93):
const reservations = await prisma.reservation.findMany({
  where: {
    ...(branchId ? { branchId: branchId } : {}),
    checkInDate: { lte: now },
    checkOutDate: { gte: now },
    status: {
      in: ['confirmed', 'notification_sent', 'checked_in']
    },
    guestName: {
      contains: searchName,
      mode: 'insensitive'
    },
    guestNationality: nationality,  // ❌ Case-sensitive!
    // ...
  }
});

// NACHHER:
const reservations = await prisma.reservation.findMany({
  where: {
    ...(branchId ? { branchId: branchId } : {}),
    checkInDate: { lte: now },
    checkOutDate: { gte: now },
    status: {
      in: ['confirmed', 'notification_sent', 'checked_in']
    },
    guestName: {
      contains: searchName,
      mode: 'insensitive'
    },
    guestNationality: {
      equals: nationality,
      mode: 'insensitive'  // ✅ Case-insensitive!
    },
    // ...
  }
});
```

**Risiko:** Niedrig - Verbessert Matching, keine Breaking Changes

**Test-Fälle:**
- ✅ "Colombia" findet "colombia" in DB
- ✅ "colombia" findet "Colombia" in DB
- ✅ "COLOMBIA" findet "colombia" in DB

---

### Problem 4: Sprache-Erkennung - nur aus Telefonnummer, nicht aus Nachricht

**Datei:** `backend/src/services/whatsappGuestService.ts`  
**Zeile:** ~280-290 (in `buildPincodeMessage` und `buildStatusMessage`)

**Problem:**
- "krieg ich meinen pin" (Deutsch) → Bot antwortet auf Spanisch (weil Telefonnummer spanischsprachig)
- Sprache wird nur aus Telefonnummer erkannt: `LanguageDetectionService.detectLanguageFromPhoneNumber()`
- Es gibt bereits `detectLanguageFromMessage()` in `whatsappAiService.ts`, aber wird nicht verwendet

**Ursache:**
- `buildPincodeMessage()` und `buildStatusMessage()` verwenden nur Telefonnummer-basierte Erkennung
- Nachricht-basierte Erkennung existiert, wird aber nicht genutzt

**Lösung:**
- **Priorität 1:** Sprache aus Nachricht erkennen (falls vorhanden)
- **Priorität 2:** Fallback auf Telefonnummer-basierte Erkennung
- **Priorität 3:** Fallback auf Spanisch (Standard)

**Implementierung:**
1. Erstelle neue Funktion `detectLanguage(messageText, phoneNumber)` in `WhatsAppGuestService`
2. Diese Funktion:
   - Ruft `WhatsAppAiService.detectLanguageFromMessage(messageText)` auf (ist `private`, muss `public` gemacht werden)
   - Falls `null`, verwendet `LanguageDetectionService.detectLanguageFromPhoneNumber(phoneNumber)`
   - Falls auch `null`, Fallback auf `'es'`
3. Verwende diese Funktion in `buildPincodeMessage()` und `buildStatusMessage()`

**Code-Änderung 1: `whatsappAiService.ts`**
```typescript
// VORHER (Zeile 713):
private static detectLanguageFromMessage(message: string): string | null {

// NACHHER:
public static detectLanguageFromMessage(message: string): string | null {
```

**Code-Änderung 2: `whatsappGuestService.ts`**
```typescript
// NEUE FUNKTION hinzufügen (nach getTTLockPasscode):
/**
 * Erkennt Sprache für Gast-Nachricht
 * Priorität: 1. Nachricht, 2. Telefonnummer, 3. Spanisch (Fallback)
 */
static detectLanguage(messageText: string | null, phoneNumber: string): string {
  // Priorität 1: Sprache aus Nachricht
  if (messageText) {
    const { WhatsAppAiService } = require('./whatsappAiService');
    const detectedLang = WhatsAppAiService.detectLanguageFromMessage(messageText);
    if (detectedLang) {
      return detectedLang;
    }
  }
  
  // Priorität 2: Sprache aus Telefonnummer
  const { LanguageDetectionService } = require('./languageDetectionService');
  return LanguageDetectionService.detectLanguageFromPhoneNumber(phoneNumber);
}
```

**Code-Änderung 3: `whatsappGuestService.ts` - `buildPincodeMessage()`**
```typescript
// VORHER (Zeile ~310):
static buildPincodeMessage(
  reservation: any,
  language: string = 'es'
): string {

// NACHHER:
static buildPincodeMessage(
  reservation: any,
  language?: string,
  messageText?: string | null
): string {
  // Erkenne Sprache falls nicht übergeben
  if (!language && reservation.guestPhone) {
    language = this.detectLanguage(messageText || null, reservation.guestPhone);
  }
  language = language || 'es'; // Fallback
  // ... rest bleibt gleich
```

**Code-Änderung 4: `whatsappMessageHandler.ts` - `handleGuestCodeRequest()`**
```typescript
// VORHER (Zeile ~280):
const language = LanguageDetectionService.detectLanguageFromPhoneNumber(phoneNumber);
if (isPincodeRequest) {
  return WhatsAppGuestService.buildPincodeMessage(reservation, language);
}

// NACHHER:
if (isPincodeRequest) {
  return WhatsAppGuestService.buildPincodeMessage(reservation, undefined, messageText);
} else {
  const language = LanguageDetectionService.detectLanguageFromPhoneNumber(phoneNumber);
  return await WhatsAppGuestService.buildStatusMessage(reservation, language);
}
```

**Hinweis:** `buildStatusMessage()` wird an vielen Stellen aufgerufen, daher dort keine Änderung (bleibt bei Telefonnummer-basierter Erkennung für Kompatibilität)

**Risiko:** Mittel - Neue Funktion, aber mit Fallbacks sicher

**Test-Fälle:**
- ✅ "krieg ich meinen pin" (Deutsch) → Antwort auf Deutsch
- ✅ "hola, necesito mi pin" (Spanisch) → Antwort auf Spanisch
- ✅ "hello, I need my pin" (Englisch) → Antwort auf Englisch
- ✅ Keine Sprache erkannt → Fallback auf Telefonnummer → Spanisch

---

## Zusammenfassung der Fixes

| Problem | Datei | Zeile | Fix | Risiko |
|---------|-------|-------|-----|--------|
| 1. Build-Fehler `roomType`/`categoryId` | `whatsappFunctionHandlers.ts` | 1137-1138 | Entfernen aus `create()` | Niedrig |
| 2. Keyword-Erkennung zu strikt | `whatsappMessageHandler.ts` | 214 | `includes()` → `some(keyword => text.includes(keyword))` | Niedrig |
| 3. Nationalität case-sensitive | `whatsappGuestService.ts` | 86 | `mode: 'insensitive'` hinzufügen | Niedrig |
| 4. Sprache nur aus Telefonnummer | `whatsappGuestService.ts` + `whatsappAiService.ts` | ~280-290 | Neue `detectLanguage()` Funktion | Mittel |

---

## Umsetzungsreihenfolge

1. **Fix 1:** Build-Fehler beheben (kritisch, blockiert Build)
2. **Fix 2:** Keyword-Erkennung verbessern (wichtig für UX)
3. **Fix 3:** Nationalität case-insensitive (wichtig für Matching)
4. **Fix 4:** Sprache-Erkennung verbessern (nice-to-have)

---

## Testing

Nach jedem Fix:
- ✅ Build läuft ohne Fehler
- ✅ Keyword-Erkennung funktioniert mit Sätzen
- ✅ Nationalität-Matching funktioniert case-insensitive
- ✅ Sprache wird korrekt erkannt

---

## Risiken

- **Fix 1:** Keine Risiken (nur Entfernen nicht-existierender Felder)
- **Fix 2:** Keine Risiken (nur Verbesserung, keine Breaking Changes)
- **Fix 3:** Keine Risiken (nur Verbesserung, keine Breaking Changes)
- **Fix 4:** Geringes Risiko (neue Funktion, aber mit Fallbacks sicher)

---

## Status

- [x] Planung abgeschlossen
- [ ] Fix 1 umgesetzt
- [ ] Fix 2 umgesetzt
- [ ] Fix 3 umgesetzt
- [ ] Fix 4 umgesetzt
- [ ] Testing abgeschlossen


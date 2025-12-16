# WhatsApp Bot Context-Verlust und Kommunikationsprobleme - Detaillierter Fix-Plan

**Datum:** 2025-12-16  
**Status:** Plan erstellt, bereit für Implementierung  
**Priorität:** KRITISCH

**⚠️ WICHTIG:** Diese Fixes sind **temporäre Lösungen**. Für langfristige Lösung siehe: `WHATSAPP_BOT_SYSTEMATISCHER_REFACTORING_PLAN.md`

---

## 📚 Dokumente-Analyse

### Gelesene Dokumente für diese Analyse:

1. **Problem-Analysen:**
   - `docs/technical/WHATSAPP_BOT_PROBLEME_DETAILLIERTE_ANALYSE.md` (2025-01-26) - Erste detaillierte Analyse
   - `docs/implementation_plans/WHATSAPP_BOT_FIXES_PLAN.md` - Fixes Plan
   - `docs/implementation_plans/WHATSAPP_BOT_RESERVATION_PROBLEME_FIXES_PLAN.md` (2025-12-15) - Reservierungsprobleme
   - `docs/implementation_reports/WHATSAPP_BOT_RESERVATION_PROBLEME_FIXES_REPORT.md` - Fixes Report

2. **Architektur-Dokumentation:**
   - `docs/technical/ARCHITEKTUR.md` - Systemarchitektur
   - `docs/implementation_plans/LOBBYPMS_KI_BOT_WIEDERVERWENDUNG.md` - Wiederverwendbarkeit
   - `docs/implementation_plans/WHATSAPP_BRANCH_INTEGRATION.md` - Branch-Integration
   - `docs/implementation_plans/LOBBYPMS_KI_BOT_BUCHUNGSSYSTEM_PLAN.md` - Buchungssystem

3. **Implementierungspläne:**
   - `docs/implementation_plans/WHATSAPP_BOT_ERWEITERUNG_ANALYSE_UND_PLAN.md` - Erweiterungen
   - `docs/implementation_plans/WHATSAPP_BOT_FUNCTION_CALLING_IMPLEMENTIERUNG.md` - Function Calling

4. **Technische Dokumentation:**
   - `docs/technical/WHATSAPP_AI_KONFIGURATION.md` - KI-Konfiguration
   - `docs/user/WHATSAPP_BOT_NUTZUNG_ANLEITUNG.md` - Nutzungsanleitung

### Neue Erkenntnisse:

**Problem:** Gleiche Probleme treten immer wieder auf, weil:
- ❌ Keine zentrale, systematische Architektur
- ❌ Code-Duplikation und inkonsistente Patterns
- ❌ Fehlende Standardisierung für Wiederverwendbarkeit
- ❌ Ad-hoc Fixes ohne systematische Lösung

**Lösung:** Siehe `WHATSAPP_BOT_SYSTEMATISCHER_REFACTORING_PLAN.md` für langfristige Lösung.

**Diese Fixes:** Temporäre Lösungen, die die aktuellen Probleme beheben, aber nicht die Grundursache lösen.

---

## Zusammenfassung der identifizierten Probleme

1. **"morgen" wird nicht geparst** → `checkInDate` fehlt im Context → KI greift auf "heute" zurück
2. **Context wird nicht konsistent genutzt** → KI verliert Informationen zwischen Nachrichten
3. **categoryId fehlt wenn nur roomName gegeben wird** → KI fragt erneut nach Zimmer
4. **Sprach-Erkennung nicht konsistent** → Sprachwechsel (Deutsch → Spanisch)
5. **Context-Prüfung für Name greift nicht** → Name wird erneut abgefragt

---

## Wichtige Fakten (Code-Analyse)

### Parsing-Fakten
- `whatsappMessageHandler.ts` Zeile 1677-1684: Nur "para mañana" wird geparst, nicht "morgen" alleine
- `whatsappMessageHandler.ts` Zeile 1699-1707: "checkin" und "checkout" werden geparst
- `whatsappMessageHandler.ts` Zeile 1749-1890: `roomName` wird extrahiert, aber `categoryId` fehlt wenn `lastAvailabilityCheck` nicht vorhanden ist

### Context-Fakten
- `whatsappMessageHandler.ts` Zeile 1909-1928: Context wird in DB gespeichert
- `whatsappMessageHandler.ts` Zeile 1930-1950: `categoryId` wird aus `lastAvailabilityCheck` geholt, wenn `roomName` vorhanden ist
- `whatsappAiService.ts` Zeile 1153: System Prompt sagt "verwende Context", aber wenn `checkInDate` fehlt, kann KI es nicht nutzen

### Sprach-Erkennung-Fakten
- `LanguageDetectionService.detectLanguageFromPhoneNumber` wird verwendet
- Sprache wird pro Nachricht erkannt, nicht konsistent über Conversation

---

## Problem 1: "morgen" wird nicht geparst

### Symptom
- User: "hast du betten für morgen?"
- Bot zeigt Verfügbarkeit für "morgen" korrekt
- Später: Bot sagt "Check-in ist für heute möglich" (statt "morgen")

### Ursache
**Datei:** `backend/src/services/whatsappMessageHandler.ts` Zeile 1677-1684

**Problem:**
- Es wird nur "para mañana" geparst, nicht "morgen" alleine
- Wenn der User "hast du betten für morgen?" sagt, wird `checkInDate` nicht auf `'tomorrow'` gesetzt
- Der Context enthält kein `checkInDate`, daher greift die KI auf "heute" zurück

**Code-Stelle:**
```typescript
// Zeile 1677-1684: Nur "para mañana" wird geparst
if (normalizedMessage.includes('para mañana') || normalizedMessage.includes('para manana')) {
  checkInDate = 'tomorrow';
  // ...
}
// FEHLT: Parsing für "morgen" alleine
```

### Lösung
**Datei:** `backend/src/services/whatsappMessageHandler.ts` Zeile 1685 (nach "para mañana" Parsing)

**Änderungen:**
- Parsing für "morgen" alleine hinzufügen (auch "tomorrow", "mañana")
- Parsing für "heute" alleine hinzufügen (auch "today", "hoy")
- Parsing für "übermorgen" alleine hinzufügen (auch "day after tomorrow", "pasado mañana")

**Code-Änderung:**
```typescript
// Nach Zeile 1684: Parsing für relative Daten alleine (ohne "para")
// Parse "morgen" / "tomorrow" / "mañana" alleine
if (normalizedMessage.includes('morgen') || normalizedMessage.includes('tomorrow') || normalizedMessage.includes('mañana')) {
  // Prüfe ob es nicht bereits "para mañana" war (wurde oben schon geparst)
  if (!checkInDate || checkInDate !== 'tomorrow') {
    checkInDate = 'tomorrow';
    logger.log(`[checkBookingContext] "morgen" erkannt, setze checkInDate = 'tomorrow'`);
  }
}

// Parse "heute" / "today" / "hoy" alleine
if (normalizedMessage.includes('heute') || normalizedMessage.includes('today') || normalizedMessage.includes('hoy')) {
  // Prüfe ob es nicht bereits "para hoy" war
  if (!checkInDate || checkInDate !== 'today') {
    checkInDate = 'today';
    logger.log(`[checkBookingContext] "heute" erkannt, setze checkInDate = 'today'`);
  }
}

// Parse "übermorgen" / "day after tomorrow" / "pasado mañana" alleine
if (normalizedMessage.includes('übermorgen') || normalizedMessage.includes('day after tomorrow') || normalizedMessage.includes('pasado mañana')) {
  if (!checkInDate || checkInDate !== 'day after tomorrow') {
    checkInDate = 'day after tomorrow';
    logger.log(`[checkBookingContext] "übermorgen" erkannt, setze checkInDate = 'day after tomorrow'`);
  }
}
```

**Risiken:**
- **Niedrig:** Parsing ist bereits vorhanden für "para mañana", nur Erweiterung für alleine stehende Wörter
- **Falsch-Positiv:** Wenn User "morgen" in anderem Kontext sagt (z.B. "morgen Abend"), wird es trotzdem geparst
  - **Mitigation:** Prüfe ob "morgen" als eigenständiges Wort vorkommt (mit Leerzeichen davor/nachher)

**Performance-Impact:**
- **Minimal:** +3 String-Operationen pro Nachricht (< 1ms)

**Memory Leak Risiken:**
- **Keine:** Keine neuen Timer oder Observer

---

## Problem 2: Context wird nicht konsistent genutzt

### Symptom
- User gibt Daten: "17.12.25 bis 18.12.25"
- Bot fragt später: "para hoy?" (statt die gegebenen Daten zu verwenden)

### Ursache
**Datei:** `backend/src/services/whatsappAiService.ts` Zeile 1150-1164

**Problem:**
- System Prompt sagt zwar "verwende Context", aber wenn `checkInDate` im Context fehlt oder falsch ist, greift die KI auf Defaults zurück
- KI prüft nicht explizit, ob Context-Daten vorhanden sind, bevor sie verwendet werden

**Code-Stelle:**
```typescript
// Zeile 1153: System Prompt
prompt += '\nWICHTIG: Wenn User in einer vorherigen Nachricht "heute" gesagt hat, verwende es IMMER als checkInDate!';
// Problem: Wenn "morgen" nicht geparst wurde, steht kein checkInDate im Context
```

### Lösung
**Datei:** `backend/src/services/whatsappAiService.ts` Zeile 1150-1164

**Änderungen:**
- System Prompt erweitern: Explizite Anweisung, Context-Daten zu prüfen
- Anweisung hinzufügen: Wenn Context-Daten vorhanden sind, IMMER diese verwenden, nicht nachfragen
- Anweisung hinzufügen: Wenn User explizite Daten gibt (z.B. "17.12.25"), diese IMMER verwenden, auch wenn Context "heute" sagt

**Code-Änderung:**
```typescript
// Nach Zeile 1154: Erweiterte Context-Nutzung
prompt += '\nWICHTIG: Context-Prüfung - KRITISCH BEACHTEN:\n';
prompt += '  1. Prüfe IMMER zuerst, ob bookingContext.checkInDate vorhanden ist → verwende diesen Wert!\n';
prompt += '  2. Prüfe IMMER zuerst, ob bookingContext.checkOutDate vorhanden ist → verwende diesen Wert!\n';
prompt += '  3. Prüfe IMMER zuerst, ob bookingContext.roomName vorhanden ist → verwende diesen Wert!\n';
prompt += '  4. Prüfe IMMER zuerst, ob bookingContext.guestName vorhanden ist → verwende diesen Wert!\n';
prompt += '  5. Wenn bookingContext.checkInDate = "tomorrow" oder "morgen" → verwende IMMER "tomorrow" als checkInDate, NICHT "today"!\n';
prompt += '  6. Wenn User explizite Daten gibt (z.B. "17.12.25"), verwende IMMER diese Daten, auch wenn Context andere Daten hat!\n';
prompt += '  7. Wenn Context-Daten vorhanden sind, frage NICHT erneut nach diesen Daten!\n';
prompt += '  8. Wenn bookingContext.lastAvailabilityCheck vorhanden ist, verwende diese Zimmer-Liste für categoryId-Zuordnung!\n';
```

**Risiken:**
- **Niedrig:** Nur System Prompt-Änderung, keine Code-Änderung
- **KI-Verhalten:** KI könnte Context-Daten überschreiben, wenn User neue Daten gibt
  - **Mitigation:** Anweisung 6: Explizite Daten haben Priorität

**Performance-Impact:**
- **Kein:** Nur System Prompt-Erweiterung

**Memory Leak Risiken:**
- **Keine:** Keine Code-Änderung

---

## Problem 3: categoryId fehlt wenn nur roomName gegeben wird

### Symptom
- User: "primo aventurero, 1 bett"
- Bot fragt später erneut: "welches Zimmer möchten Sie buchen?"

### Ursache
**Datei:** `backend/src/services/whatsappMessageHandler.ts` Zeile 1930-1950

**Problem:**
- `categoryId` wird aus `lastAvailabilityCheck` geholt, wenn `roomName` vorhanden ist
- Wenn `lastAvailabilityCheck` fehlt oder nicht aktuell ist, wird `categoryId` nicht gesetzt
- Die KI sieht dann `roomName` ohne `categoryId` und fragt erneut nach dem Zimmer

**Code-Stelle:**
```typescript
// Zeile 1930-1950: categoryId wird aus lastAvailabilityCheck geholt
if (updatedContext.roomName && !updatedContext.categoryId && updatedContext.lastAvailabilityCheck) {
  // ...
}
// Problem: Wenn lastAvailabilityCheck fehlt, wird categoryId nicht gesetzt
```

### Lösung
**Datei:** `backend/src/services/whatsappMessageHandler.ts` Zeile 1930-1950

**Änderungen:**
- Wenn `roomName` vorhanden ist, aber `categoryId` fehlt und `lastAvailabilityCheck` fehlt:
  - Rufe `check_room_availability` auf, um aktuelle Verfügbarkeit zu holen
  - Extrahiere `categoryId` aus der Response
  - Speichere `categoryId` im Context

**Code-Änderung:**
```typescript
// Nach Zeile 1950: Fallback wenn lastAvailabilityCheck fehlt
if (updatedContext.roomName && !updatedContext.categoryId && !updatedContext.lastAvailabilityCheck) {
  // Fallback: Hole Verfügbarkeit, um categoryId zu finden
  try {
    logger.log(`[checkBookingContext] roomName vorhanden, aber categoryId und lastAvailabilityCheck fehlen, hole Verfügbarkeit`);
    
    // Verwende checkInDate aus Context oder "today" als Fallback
    const availabilityCheckInDate = updatedContext.checkInDate || 'today';
    const availabilityCheckOutDate = updatedContext.checkOutDate || 'tomorrow';
    
    // Rufe check_room_availability auf (ohne conversationId, um keine Endlosschleife zu verursachen)
    const { WhatsAppFunctionHandlers } = await import('./whatsappFunctionHandlers');
    const availabilityResult = await WhatsAppFunctionHandlers.check_room_availability(
      {
        startDate: availabilityCheckInDate,
        endDate: availabilityCheckOutDate,
        roomType: updatedContext.roomType
      },
      null, // userId
      null, // roleId
      branchId,
      conversation.id // conversationId für Context-Speicherung
    );
    
    // Suche roomName in availabilityResult.rooms
    if (availabilityResult.rooms && availabilityResult.rooms.length > 0) {
      const roomNameLower = updatedContext.roomName.toLowerCase();
      const roomNameWithoutArticle = roomNameLower.replace(/^(el|la|los|las|un|una)\s+/, '');
      
      const matchingRoom = availabilityResult.rooms.find(room => {
        const rNameLower = room.name.toLowerCase();
        return rNameLower === roomNameLower ||
               rNameLower.includes(roomNameWithoutArticle) ||
               (roomNameWithoutArticle && rNameLower.includes(roomNameWithoutArticle));
      });
      
      if (matchingRoom) {
        updatedContext.categoryId = matchingRoom.categoryId;
        updatedContext.roomType = matchingRoom.type as 'compartida' | 'privada';
        logger.log(`[checkBookingContext] categoryId aus Verfügbarkeitsprüfung gefunden: ${matchingRoom.categoryId} für ${matchingRoom.name}`);
        
        // Speichere aktualisierten Context
        await prisma.whatsAppConversation.update({
          where: { id: conversation.id },
          data: {
            context: {
              ...context,
              booking: updatedContext
            }
          }
        });
      }
    }
  } catch (error) {
    logger.error('[checkBookingContext] Fehler beim Abrufen der Verfügbarkeit für categoryId:', error);
    // Weiter ohne categoryId (KI wird nachfragen)
  }
}
```

**Risiken:**
- **Mittel:** Zusätzlicher API-Call zu LobbyPMS
- **Endlosschleife:** Wenn `check_room_availability` den Context aktualisiert, könnte es zu einer Endlosschleife kommen
  - **Mitigation:** Prüfe ob `lastAvailabilityCheck` bereits vorhanden ist, bevor du `check_room_availability` aufrufst
- **Performance:** Zusätzlicher API-Call (+200-500ms)

**Performance-Impact:**
- **Mittel:** +1 API-Call zu LobbyPMS pro Nachricht (wenn `roomName` ohne `categoryId`)
- **Impact:** +200-500ms pro Nachricht (nur wenn Fallback benötigt wird)

**Memory Leak Risiken:**
- **Keine:** Keine Timer oder Observer, API-Responses sind klein

---

## Problem 4: Sprach-Erkennung nicht konsistent

### Symptom
- Konversation auf Deutsch, Bot wechselt plötzlich zu Spanisch

### Ursache
**Datei:** `backend/src/services/whatsappAiService.ts` (Sprach-Erkennung)

**Problem:**
- Sprache wird pro Nachricht erkannt (`LanguageDetectionService.detectLanguageFromPhoneNumber`)
- Sprache wird nicht im Conversation Context gespeichert
- Wenn Telefonnummer nicht eindeutig ist, kann die Sprache wechseln

**Code-Stelle:**
- Sprache wird in `buildSystemPrompt` verwendet, aber nicht konsistent über Conversation

### Lösung
**Datei:** `backend/src/services/whatsappMessageHandler.ts` (Context-Speicherung)

**Änderungen:**
- Sprache im Conversation Context speichern (beim ersten Mal)
- Wenn Sprache bereits im Context vorhanden ist, diese verwenden
- Nur wenn keine Sprache im Context vorhanden ist, neu erkennen

**Code-Änderung:**
```typescript
// In handleIncomingMessage, nach Zeile 230 (nach checkBookingContext):
// Prüfe ob Sprache im Context vorhanden ist
const context = conversation.context || {};
const savedLanguage = context.language;

// Wenn Sprache nicht im Context vorhanden ist, erkenne sie
let language: string;
if (savedLanguage) {
  language = savedLanguage;
  logger.log(`[WhatsApp Message Handler] Sprache aus Context: ${language}`);
} else {
  const { LanguageDetectionService } = await import('./languageDetectionService');
  language = LanguageDetectionService.detectLanguageFromPhoneNumber(normalizedPhone);
  
  // Speichere Sprache im Context
  await prisma.whatsAppConversation.update({
    where: { id: conversation.id },
    data: {
      context: {
        ...context,
        language: language
      }
    }
  });
  logger.log(`[WhatsApp Message Handler] Sprache erkannt und gespeichert: ${language}`);
}

// Übergebe language an WhatsAppAiService.generateResponse
```

**Risiken:**
- **Niedrig:** Nur Context-Speicherung
- **Falsch-Erkennung:** Wenn Sprache beim ersten Mal falsch erkannt wird, bleibt sie falsch
  - **Mitigation:** User kann Sprache explizit ändern (z.B. "auf Deutsch" oder "en español")

**Performance-Impact:**
- **Minimal:** +1 DB-Update beim ersten Mal (< 10ms)

**Memory Leak Risiken:**
- **Keine:** Keine Timer oder Observer

---

## Problem 5: Context-Prüfung für Name greift nicht

### Symptom
- User: "Mein Name ist Patrick Ammann"
- Bot fragt später: "ist Patrick Ammann der richtige Name?"

### Ursache
**Datei:** `backend/src/services/whatsappAiService.ts` Zeile 1159-1160

**Problem:**
- System Prompt sagt zwar "verwende Context", aber die KI prüft nicht explizit, ob Name bereits im Context vorhanden ist
- KI fragt erneut nach Name, auch wenn er bereits gegeben wurde

**Code-Stelle:**
```typescript
// Zeile 1159-1160: System Prompt
prompt += '\nWICHTIG: Namensabfrage optimieren - Wenn Name bereits im Context vorhanden ist (z.B. User hat "Patrick Ammann" in vorheriger Nachricht gesagt), frage: "Ist Patrick Ammann Ihr vollständiger Name?" statt "Wie lautet Ihr vollständiger Name?"!';
prompt += '\nWICHTIG: Wenn User den bereits genannten Namen bestätigt (z.B. "ja" oder "genau"), verwende diesen Namen direkt für die Buchung, frage NICHT nochmal!';
// Problem: KI prüft nicht explizit, ob Name bereits im Context vorhanden ist
```

### Lösung
**Datei:** `backend/src/services/whatsappAiService.ts` Zeile 1159-1160

**Änderungen:**
- System Prompt erweitern: Explizite Anweisung, Context für Name zu prüfen
- Anweisung hinzufügen: Wenn `bookingContext.guestName` vorhanden ist, NICHT nach Name fragen
- Anweisung hinzufügen: Wenn User Name bestätigt (z.B. "ja", "genau"), verwende Name direkt

**Code-Änderung:**
```typescript
// Nach Zeile 1160: Erweiterte Name-Context-Prüfung
prompt += '\nWICHTIG: Name-Context-Prüfung - KRITISCH BEACHTEN:\n';
prompt += '  1. Prüfe IMMER zuerst, ob bookingContext.guestName vorhanden ist!\n';
prompt += '  2. Wenn bookingContext.guestName vorhanden ist, verwende diesen Namen IMMER, frage NICHT erneut nach Name!\n';
prompt += '  3. Wenn bookingContext.guestName vorhanden ist und User "ja", "genau", "correcto", "sí" sagt, verwende bookingContext.guestName direkt für create_room_reservation!\n';
prompt += '  4. Wenn bookingContext.guestName vorhanden ist, aber User einen neuen Namen gibt, verwende den NEUEN Namen (User korrigiert sich)\n';
prompt += '  5. Wenn bookingContext.guestName NICHT vorhanden ist, frage nach Name\n';
```

**Risiken:**
- **Niedrig:** Nur System Prompt-Änderung
- **KI-Verhalten:** KI könnte Name überschreiben, wenn User neuen Namen gibt
  - **Mitigation:** Anweisung 4: Neuer Name hat Priorität (User korrigiert sich)

**Performance-Impact:**
- **Kein:** Nur System Prompt-Erweiterung

**Memory Leak Risiken:**
- **Keine:** Keine Code-Änderung

---

## Übersetzungen

**Status:** ✅ Keine neuen Übersetzungen nötig
- Alle User-Nachrichten sind bereits übersetzt
- Bot-Antworten werden von KI generiert (mehrsprachig)

---

## Notifications

**Status:** ✅ Keine neuen Notifications nötig
- Context-Verlust-Fixes betreffen nur interne Logik
- Keine neuen Events, die Notifications auslösen

---

## Berechtigungen

**Status:** ✅ Keine neuen Berechtigungen nötig
- Context-Verlust-Fixes betreffen nur interne Logik
- Keine neuen Funktionen, die Berechtigungen benötigen

---

## Performance-Impact Gesamt

- **Problem 1:** +3 String-Operationen (< 1ms)
- **Problem 2:** Kein Impact (nur System Prompt)
- **Problem 3:** +1 API-Call zu LobbyPMS (+200-500ms, nur wenn Fallback benötigt wird)
- **Problem 4:** +1 DB-Update beim ersten Mal (< 10ms)
- **Problem 5:** Kein Impact (nur System Prompt)

**Gesamt-Impact:** < 600ms zusätzlich pro Nachricht (nur wenn Fallback benötigt wird)

---

## Memory Leak Risiken

**Status:** ✅ Keine Risiken identifiziert
- Keine Timer oder Observer hinzugefügt
- Prisma managed Connections automatisch
- API-Responses sind klein (< 10 KB)

---

## Implementierungsreihenfolge

1. **Problem 1:** "morgen" wird nicht geparst (einfach, niedriges Risiko)
2. **Problem 2:** Context wird nicht konsistent genutzt (System Prompt, kein Risiko)
3. **Problem 4:** Sprach-Erkennung nicht konsistent (einfach, niedriges Risiko)
4. **Problem 5:** Context-Prüfung für Name (System Prompt, kein Risiko)
5. **Problem 3:** categoryId fehlt (komplex, mittleres Risiko, API-Call)

---

## Test-Plan

1. **Problem 1 Test:**
   - User: "hast du betten für morgen?"
   - Erwartung: `checkInDate = 'tomorrow'` im Context
   - Bot sollte später "morgen" verwenden, nicht "heute"

2. **Problem 2 Test:**
   - User: "17.12.25 bis 18.12.25"
   - Erwartung: Bot verwendet diese Daten, fragt nicht "para hoy?"

3. **Problem 3 Test:**
   - User: "primo aventurero, 1 bett"
   - Erwartung: `categoryId` wird aus Verfügbarkeit geholt, Bot fragt nicht erneut nach Zimmer

4. **Problem 4 Test:**
   - User: Konversation auf Deutsch starten
   - Erwartung: Bot bleibt auf Deutsch, wechselt nicht zu Spanisch

5. **Problem 5 Test:**
   - User: "Mein Name ist Patrick Ammann"
   - Erwartung: Bot verwendet diesen Namen, fragt nicht erneut nach Name

---

---

## ⚠️ WICHTIG: Langfristige Lösung

**Diese Fixes sind temporäre Lösungen.** Sie beheben die aktuellen Probleme, aber lösen nicht die Grundursache.

**Für langfristige Lösung siehe:**
- `docs/implementation_plans/WHATSAPP_BOT_SYSTEMATISCHER_REFACTORING_PLAN.md`

**Langfristige Lösung beinhaltet:**
- Zentrale Core Services (MessageParserService, ContextService, LanguageService)
- Wiederverwendbare Architektur für alle Kanäle (WhatsApp, Email, Instagram, Facebook, Twitter)
- Standardisierte Patterns, die zukünftige Probleme verhindern
- Systematische Struktur statt ad-hoc Fixes

**Empfehlung:**
1. **Sofort:** Diese temporären Fixes implementieren (behebt aktuelle Probleme)
2. **Parallel:** Systematisches Refactoring planen (verhindert zukünftige Probleme)
3. **Danach:** Schrittweise Migration zu neuer Architektur

---

**Erstellt:** 2025-12-16  
**Aktualisiert:** 2025-12-16 (mit neuen Erkenntnissen aus Historie-Analyse)  
**Status:** ✅ Plan erstellt, bereit für Implementierung  
**⚠️ WICHTIG:** Temporäre Lösung - Langfristige Lösung siehe Refactoring-Plan

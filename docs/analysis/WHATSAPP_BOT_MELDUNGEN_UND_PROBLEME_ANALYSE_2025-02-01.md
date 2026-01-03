# WhatsApp Bot - Meldungen und Probleme: Vollständige Analyse

**Datum:** 2025-02-01  
**Status:** 📋 Analyse & Plan - KEINE ÄNDERUNGEN  
**Zweck:** Vollständige Analyse aller Meldungen, Probleme und Funktionsweise des WhatsApp Bots

---

## 📊 EXECUTIVE SUMMARY

### Warum gibt es Meldungen?

Die Meldungen entstehen durch:
1. **Fehlerbehandlung** - System loggt alle Fehler für Debugging
2. **Status-Updates** - WhatsApp Webhooks senden Status-Updates (sent, delivered, read, failed)
3. **Warnungen** - System warnt bei potenziellen Problemen (z.B. fehlende Konfiguration)
4. **Information** - System loggt wichtige Schritte für Nachvollziehbarkeit

### Hauptprobleme identifiziert:

1. **🔴 KRITISCH: OAuth Access Token ungültig**
   - Fehler: "Invalid OAuth access token - Cannot parse access token" (Code 190)
   - Template-Fallback wird nicht ausgeführt
   - Nachrichten werden nicht versendet

2. **🟡 HOCH: 24h-Fenster-Fehlerbehandlung**
   - Template-Fallback funktioniert nur bei erkannten 24h-Fenster-Fehlern
   - Andere Fehler werden nicht als Fallback-Kandidaten erkannt

3. **🟡 MITTEL: Doppelte Nachrichten**
   - KI generiert manchmal mehrere Antworten
   - Oder: WhatsApp teilt lange Nachrichten auf

4. **🟡 MITTEL: Falsche Datumsinterpretation**
   - KI interpretiert "heute" manchmal falsch
   - Function Definition unterstützt "today"/"heute" nicht explizit genug

5. **🟡 MITTEL: Sprache inkonsistent**
   - Deutsche Nachrichten werden nicht immer als Deutsch erkannt
   - Fallback auf Telefonnummer-Sprache (manchmal falsch)

---

## 🔍 DETAILLIERTE PROBLEM-ANALYSE

### Problem 1: OAuth Access Token ungültig (KRITISCH)

**Status:** 🔴 **KRITISCH - AKTUELLES PROBLEM**

**Fehlermeldung:**
```
"Invalid OAuth access token - Cannot parse access token"
Code: 190, Type: OAuthException
```

**Ursache:**
- WhatsApp Access Token ist abgelaufen oder ungültig
- Token kann nicht geparst werden
- Session Message schlägt fehl

**Aktueller Ablauf:**
1. `sendMessageWithFallback` versucht Session Message (24h-Fenster)
2. `sendMessage` ruft `sendViaWhatsAppBusiness` auf
3. WhatsApp API gibt OAuth-Fehler zurück (Code 190)
4. `isOutside24HourWindowError` prüft nur auf Code 131047 (24h-Fenster)
5. OAuth-Fehler wird **NICHT** als 24h-Fenster-Fehler erkannt
6. Template-Fallback wird **NICHT** ausgeführt
7. Error wird weitergeworfen
8. Nachricht wird **NICHT** versendet

**Code-Stellen:**
- `backend/src/services/whatsappService.ts` Zeile 670-833: `sendMessageWithFallback`
- `backend/src/services/whatsappService.ts` Zeile 396-417: `isOutside24HourWindowError`
- `backend/src/services/whatsappService.ts` Zeile 218-249: `sendMessage`

**Dokumentation:**
- `docs/technical/RESERVATION_WHATSAPP_NACHRICHT_PROBLEM_ANALYSE.md`

**Lösungsansätze:**
1. **Option 1:** Template-Fallback immer versuchen (nicht nur bei 24h-Fenster-Fehler)
2. **Option 2:** OAuth-Fehler als Fallback-Kandidat erkennen
3. **Option 3:** Access Token automatisch erneuern

---

### Problem 2: 24h-Fenster-Fehlerbehandlung

**Status:** 🟡 **HOCH - TEILWEISE BEHOBEN**

**Problem:**
- Template-Fallback wird nur bei erkannten 24h-Fenster-Fehlern ausgeführt
- Andere Fehler (z.B. OAuth-Fehler) werden nicht als Fallback-Kandidaten erkannt

**Aktueller Code:**
```typescript
// backend/src/services/whatsappService.ts Zeile 757-777
const is24HourWindowError = this.isOutside24HourWindowError(error);

if (is24HourWindowError) {
  logger.log(`[WhatsApp Service] ⚠️ 24h-Fenster abgelaufen, verwende Template Message...`);
} else {
  logger.log(`[WhatsApp Service] ⚠️ Session Message fehlgeschlagen (${errorMessage}), versuche Template Message als Fallback...`);
}

// Template-Fallback versuchen (wenn Template-Name vorhanden)
// WICHTIG: Template-Fallback wird jetzt bei ALLEN Fehlern versucht, nicht nur bei 24h-Fenster-Fehlern
if (!templateName) {
  // ...
  throw error;
}
```

**Status:**
- ✅ Template-Fallback wird bei ALLEN Fehlern versucht (Code wurde bereits angepasst)
- ⚠️ Aber: Nur wenn `templateName` vorhanden ist
- ⚠️ Problem: Wenn `templateName` fehlt, wird Error weitergeworfen

**Dokumentation:**
- `docs/technical/RESERVATION_WHATSAPP_NACHRICHT_PROBLEM_ANALYSE.md`

---

### Problem 3: Doppelte Nachrichten

**Status:** 🟡 **MITTEL - TEILWEISE BEHOBEN**

**Problem:**
- Bot sendet manchmal mehrere Nachrichten für eine Anfrage
- Ursache unklar: KI generiert mehrere Antworten oder WhatsApp teilt auf

**Analyse:**
- Logs zeigen: Nur EINE Function Call wird gemacht
- Aber: Mehrere Nachrichten werden versendet
- Wahrscheinlich: KI generiert mehrere Antworten in einem Response

**Code-Stellen:**
- `backend/src/services/whatsappAiService.ts` Zeile 308-457: Function Calling und Response-Generierung

**Dokumentation:**
- `docs/technical/WHATSAPP_BOT_PROBLEM_ANALYSE.md` - Abschnitt "3 Nachrichten Problem"

**Status:**
- ⚠️ Problem noch nicht vollständig behoben
- ⚠️ Ursache noch nicht eindeutig identifiziert

---

### Problem 4: Falsche Datumsinterpretation

**Status:** 🟡 **MITTEL - TEILWEISE BEHOBEN**

**Problem:**
- KI interpretiert "heute" manchmal als falsches Datum
- Beispiel: "heute" wird als '2025-01-26' interpretiert statt aktuelles Datum

**Ursache:**
- Function Definition unterstützt "today"/"heute" nicht explizit genug
- KI muss selbst das Datum parsen
- KI verwendet möglicherweise veraltetes Datum

**Code-Stellen:**
- `backend/src/services/whatsappFunctionHandlers.ts` Zeile 713-984: `check_room_availability`
- `backend/src/services/whatsappFunctionHandlers.ts` Zeile 94-183: `parseDate`

**Status:**
- ✅ Function Definition unterstützt "today"/"heute"/"hoy" (Zeile 729-731)
- ✅ `parseDate` unterstützt relative Daten (Zeile 98-114)
- ⚠️ Aber: KI interpretiert manchmal trotzdem falsch

**Dokumentation:**
- `docs/technical/WHATSAPP_BOT_PROBLEM_ANALYSE.md` - Abschnitt "Falsche Daten"

---

### Problem 5: Sprache inkonsistent

**Status:** 🟡 **MITTEL - TEILWEISE BEHOBEN**

**Problem:**
- Deutsche Nachrichten werden nicht immer als Deutsch erkannt
- Fallback auf Telefonnummer-Sprache (manchmal falsch)
- Bot antwortet in falscher Sprache

**Ursache:**
- Deutsche Indikatoren zu schwach
- "haben", "wir", "heute", "frei", "zimmer" sind nicht in der Liste
- Nur: "hallo", "guten tag", "danke", "bitte", etc.

**Code-Stellen:**
- `backend/src/services/whatsappAiService.ts` Zeile 1248-1326: `detectLanguageFromMessage`
- `backend/src/services/languageDetectionService.ts`: Telefonnummer-Sprache-Mapping

**Status:**
- ✅ Deutsche Indikatoren erweitert (Zeile 1263-1268)
- ⚠️ Aber: Fallback auf Telefonnummer-Sprache kann noch falsch sein

**Dokumentation:**
- `docs/technical/WHATSAPP_BOT_PROBLEM_ANALYSE.md` - Abschnitt "Sprache"
- `docs/technical/WHATSAPP_BOT_PROBLEME_DETAILLIERTE_ANALYSE.md` - Abschnitt "Sprache inkonsistent"

---

## 🏗️ WIE FUNKTIONIERT DER BOT GENAU?

### Architektur-Übersicht

Der WhatsApp Bot besteht aus mehreren Schichten:

```
WhatsApp Webhook (whatsappController.ts)
    ↓
WhatsApp Message Handler (whatsappMessageHandler.ts)
    ↓
Core Services (chatbot/)
    ├── MessageParserService (Nachricht parsen)
    ├── ContextService (Kontext verwalten)
    ├── LanguageService (Sprache erkennen & konsistent halten)
    └── ConversationService (Konversations-Status verwalten)
    ↓
WhatsApp AI Service (whatsappAiService.ts)
    ├── PromptBuilder (System Prompt erstellen)
    └── OpenAI GPT-4o (KI-Antwort generieren)
    ↓
Function Handlers (whatsappFunctionHandlers.ts)
    ├── check_room_availability
    ├── create_room_reservation
    ├── get_tours
    ├── book_tour
    ├── get_requests (Mitarbeiter)
    ├── get_todos (Mitarbeiter)
    ├── get_worktime (Mitarbeiter)
    ├── get_cerebro_articles (Mitarbeiter)
    └── get_user_info (Mitarbeiter)
    ↓
WhatsApp Service (whatsappService.ts)
    └── sendMessageWithFallback (Nachricht versenden)
```

---

### Detaillierter Ablauf

#### 1. Eingehende Nachricht empfangen

**Datei:** `backend/src/controllers/whatsappController.ts`

**Ablauf:**
1. WhatsApp Webhook empfängt POST-Request
2. Prüft ob es eine eingehende Nachricht ist (nicht Status-Update)
3. Identifiziert Branch via Phone Number ID
4. Speichert Nachricht in Datenbank (`WhatsAppMessage`)
5. Ruft `WhatsAppMessageHandler.handleIncomingMessage()` auf

**Code-Stellen:**
- Zeile 18-357: `handleWebhook`
- Zeile 103-357: Eingehende Nachricht verarbeiten

---

#### 2. Nachricht verarbeiten

**Datei:** `backend/src/services/whatsappMessageHandler.ts`

**Ablauf:**
1. **Telefonnummer normalisieren** (Zeile 39)
2. **User identifizieren** via Telefonnummer (Zeile 46)
3. **Conversation laden/erstellen** (Zeile 127)
4. **Nachricht normalisieren** via `WhatsAppMessageNormalizer` (Zeile 130)
5. **Context laden** via `ContextService` (Zeile 131)
6. **Nachricht parsen** via `MessageParserService` (Zeile 132-136)
7. **Context aktualisieren** mit geparsten Daten (Zeile 137-138)
8. **Sprache erkennen** via `LanguageService` (Zeile 140-149)
9. **ConversationState berechnen** via `ConversationService` (Zeile 156-164)

**Code-Stellen:**
- Zeile 30-392: `handleIncomingMessage`

---

#### 3. Keyword-Erkennung

**Datei:** `backend/src/services/whatsappMessageHandler.ts`

**Keywords:**
- "requests", "todos", "to do's" → Liste aller Requests/Tasks
- "request", "todo" → Starte Request/Task-Erstellung
- "code", "código", "pin" → Gast-Code-Versand

**Code-Stellen:**
- Zeile 241-246: "todos" Keyword
- Zeile 257-260: "todo" Keyword (Task-Erstellung)
- Zeile 230-240: "requests" Keyword

---

#### 4. KI-Antwort generieren

**Datei:** `backend/src/services/whatsappAiService.ts`

**Ablauf:**
1. **Branch und KI-Konfiguration laden** (Zeile 46-137)
2. **Sprache erkennen** via `LanguageService` (Zeile 142-176)
3. **System Prompt bauen** via `PromptBuilder` (Zeile 183)
4. **Function Definitions laden** (Zeile 189)
5. **Message History laden** (falls conversationId vorhanden) (Zeile 201-266)
6. **OpenAI API aufrufen** (Zeile 294-304)
7. **Function Calls verarbeiten** (falls vorhanden) (Zeile 309-401)
8. **Finale Antwort generieren** (Zeile 428-450)

**Code-Stellen:**
- Zeile 34-466: `generateResponse`

---

#### 5. Function Calling

**Datei:** `backend/src/services/whatsappFunctionHandlers.ts`

**Verfügbare Functions:**

**Für ALLE (Gäste + Mitarbeiter):**
- `check_room_availability` - Zimmerverfügbarkeit prüfen
- `get_tours` - Verfügbare Touren holen
- `get_tour_details` - Tour-Details holen
- `book_tour` - Tour buchen
- `create_potential_reservation` - Potenzielle Reservierung erstellen
- `create_room_reservation` - Zimmer-Reservierung erstellen

**Nur für Mitarbeiter (userId vorhanden):**
- `get_requests` - Requests holen
- `get_todos` - Todos/Tasks holen
- `get_worktime` - Arbeitszeiten holen
- `get_cerebro_articles` - Cerebro-Artikel holen
- `get_user_info` - User-Informationen holen

**Code-Stellen:**
- Zeile 187-292: `get_requests`
- Zeile 297-400: `get_todos`
- Zeile 405-528: `get_worktime`
- Zeile 533-644: `get_cerebro_articles`
- Zeile 649-708: `get_user_info`
- Zeile 713-984: `check_room_availability`
- Zeile 989-1127: `get_tours`
- Zeile 1132-1217: `get_tour_details`
- Zeile 1222-1503: `book_tour`
- Zeile 1513-1738: `create_potential_reservation`
- Zeile 1740-2234: `create_room_reservation`

---

#### 6. System Prompt erstellen

**Datei:** `backend/src/services/chatbot/PromptBuilder.ts`

**Komponenten:**
1. **Language-Instructions** (Zeile 496-534) - Sprach-Anweisungen (mehrfach wiederholt)
2. **Base-Prompt** (Zeile 81-102) - Basis-Prompt aus AI-Config
3. **Context-Instructions** (Zeile 111-136) - Kontext-Nutzung
4. **Function-Instructions** (Zeile 146-182) - Function-Anweisungen
   - Room Availability Instructions (Zeile 187-235)
   - Tour Instructions (Zeile 240-300)
   - Room Reservation Instructions (Zeile 305-359)
   - Employee Instructions (Zeile 364-378)
   - General Function Instructions (Zeile 383-407)
   - Booking Context Instructions (Zeile 412-450)
   - Tour Context Instructions (Zeile 455-475)
   - General Context Instructions (Zeile 480-488)
5. **Channel-spezifische Instructions** (Zeile 543-552)

**Code-Stellen:**
- Zeile 36-72: `buildPrompt` (Hauptmethode)
- Zeile 496-534: `getLanguageInstructions`
- Zeile 187-235: `getRoomAvailabilityInstructions`
- Zeile 240-300: `getTourInstructions`
- Zeile 305-359: `getRoomReservationInstructions`

---

#### 7. Nachricht versenden

**Datei:** `backend/src/services/whatsappService.ts`

**Ablauf:**
1. **Session Message versuchen** (24h-Fenster) (Zeile 741-750)
2. **Bei Fehler:** Prüfe ob 24h-Fenster-Fehler (Zeile 757)
3. **Template-Fallback** (falls Template-Name vorhanden) (Zeile 765-833)
4. **Nachricht in DB speichern** (Zeile 180-250)

**Code-Stellen:**
- Zeile 670-833: `sendMessageWithFallback`
- Zeile 218-249: `sendMessage`
- Zeile 294-391: `sendViaWhatsAppBusiness`
- Zeile 396-417: `isOutside24HourWindowError`

---

### Context-Management

**Datei:** `backend/src/services/chatbot/ContextService.ts`

**Funktionen:**
- Context speichern (in `WhatsAppConversation.context`)
- Context laden
- Context aktualisieren (merge mit neuen Daten)
- Context validieren

**Context-Struktur:**
```typescript
{
  language: 'es' | 'de' | 'en',
  booking: {
    checkInDate?: string,
    checkOutDate?: string,
    guestName?: string,
    roomType?: 'compartida' | 'privada',
    roomName?: string,
    categoryId?: number,
    lastAvailabilityCheck?: {
      startDate: string,
      endDate: string,
      rooms: Array<{ categoryId, name, type, availableRooms }>
    }
  },
  tour: {
    lastToursList?: Array<{ id, title, price, location }>,
    lastToursCheckAt?: string
  }
}
```

---

### Language-Management

**Datei:** `backend/src/services/chatbot/LanguageService.ts`

**Funktionen:**
- Sprache aus Nachricht erkennen
- Sprache aus Telefonnummer erkennen (Ländercode)
- Sprach-Konsistenz sicherstellen (speichert Sprache im Context)
- Sprache aus Context verwenden (höchste Priorität)

**Priorität:**
1. Sprache aus Context (höchste Priorität)
2. Sprache aus Nachricht
3. Sprache aus Telefonnummer (Fallback)

---

### Conversation State Management

**Datei:** `backend/src/services/chatbot/ConversationService.ts`

**Funktionen:**
- ConversationState berechnen
- Prüfen ob Buchung ausgeführt werden soll
- Prüfen ob Tour-Buchung ausgeführt werden soll
- Fehlende Informationen identifizieren

**ConversationState:**
```typescript
{
  shouldBook: boolean,
  shouldBookTour: boolean,
  missingInfo?: string[]
}
```

---

## 📋 ZUSAMMENFASSUNG DER MELDUNGEN

### Log-Meldungen (normal)

**Information (logger.log):**
- Telefonnummer normalisiert
- User identifiziert
- Conversation geladen/erstellt
- Sprache erkannt
- Function Calls erkannt
- Function ausgeführt
- Nachricht versendet

**Warnungen (logger.warn):**
- KI enabled ist undefined (Rückwärtskompatibilität)
- Sprache aus conversationContext überschreibt erkannte Sprache
- Session Message gab false zurück
- Template-Name fehlt für Fallback

**Fehler (logger.error):**
- Branch WhatsApp Settings nicht gefunden
- KI-Konfiguration nicht gefunden
- KI ist explizit deaktiviert
- OPENAI_API_KEY nicht gesetzt
- Function Fehler
- OpenAI API Fehler
- Fehler beim Laden der Message History

---

### Problem-Meldungen (kritisch)

**1. OAuth Access Token ungültig:**
```
"Invalid OAuth access token - Cannot parse access token"
Code: 190, Type: OAuthException
```
- **Ursache:** WhatsApp Access Token abgelaufen/ungültig
- **Auswirkung:** Nachrichten werden nicht versendet
- **Status:** 🔴 KRITISCH

**2. 24h-Fenster-Fehler:**
```
Code: 131047
```
- **Ursache:** 24h-Fenster abgelaufen
- **Auswirkung:** Session Message schlägt fehl, Template-Fallback wird ausgeführt
- **Status:** ✅ BEHOBEN (Template-Fallback funktioniert)

**3. Function Fehler:**
```
[WhatsApp AI Service] Function Fehler: { name, error }
```
- **Ursache:** Function Handler wirft Error
- **Auswirkung:** Fehlermeldung wird übersetzt und an KI zurückgegeben
- **Status:** ✅ BEHOBEN (Fehler werden übersetzt)

---

## 🎯 AKTUELLE PROBLEME (Priorität)

### 🔴 KRITISCH (sofort beheben)

1. **OAuth Access Token ungültig**
   - **Problem:** Nachrichten werden nicht versendet
   - **Lösung:** Access Token erneuern oder Template-Fallback immer versuchen
   - **Dokumentation:** `docs/technical/RESERVATION_WHATSAPP_NACHRICHT_PROBLEM_ANALYSE.md`

### 🟡 HOCH (sollte behoben werden)

2. **Template-Fallback nur bei templateName**
   - **Problem:** Wenn templateName fehlt, wird Error weitergeworfen
   - **Lösung:** Template-Fallback auch ohne templateName versuchen (mit Standard-Template)
   - **Code-Stelle:** `backend/src/services/whatsappService.ts` Zeile 768-777

3. **Doppelte Nachrichten**
   - **Problem:** Bot sendet manchmal mehrere Nachrichten
   - **Lösung:** Prüfe Antwort-Länge, verhindere mehrfache Antworten
   - **Dokumentation:** `docs/technical/WHATSAPP_BOT_PROBLEM_ANALYSE.md`

### 🟢 MITTEL (kann später behoben werden)

4. **Falsche Datumsinterpretation**
   - **Problem:** KI interpretiert "heute" manchmal falsch
   - **Lösung:** Function Definition erweitern, Datumsparsing verbessern
   - **Status:** ✅ Teilweise behoben (Function unterstützt "today"/"heute")

5. **Sprache inkonsistent**
   - **Problem:** Deutsche Nachrichten werden nicht immer erkannt
   - **Lösung:** Deutsche Indikatoren erweitern
   - **Status:** ✅ Teilweise behoben (Indikatoren erweitert)

---

## 📚 DOKUMENTATION

### Problem-Dokumentationen

1. **RESERVATION_WHATSAPP_NACHRICHT_PROBLEM_ANALYSE.md**
   - OAuth Access Token Problem
   - 24h-Fenster-Fehlerbehandlung
   - Template-Fallback Logik

2. **WHATSAPP_BOT_PROBLEM_ANALYSE.md**
   - 3 Nachrichten Problem
   - Falsche Daten
   - Sprache inkonsistent
   - Performance

3. **WHATSAPP_BOT_PROBLEME_DETAILLIERTE_ANALYSE.md**
   - create_room_reservation Function fehlt (BEHOBEN)
   - "Apartamento doble" wird als 0 angezeigt (BEHOBEN)
   - Bot fragt nach Daten statt zu buchen (BEHOBEN)
   - Sprache inkonsistent (TEILWEISE BEHOBEN)

4. **WHATSAPP_BOT_RESERVATION_PROBLEME_FIXES_REPORT.md**
   - Doppelte Nachrichten (BEHOBEN)
   - Falscher Name (BEHOBEN)
   - 2 Betten statt 1 (BEHOBEN)
   - Doppelter Preis (LOGGING ERWEITERT)
   - Check-in Link fehlt (BEHOBEN)
   - Zimmername/Bettnr fehlt (BEHOBEN)

---

## 🔧 TECHNISCHE DETAILS

### Function Calling Flow

1. **KI entscheidet:** Soll Function aufgerufen werden?
2. **Function Definition:** KI sieht verfügbare Functions
3. **Function Call:** KI ruft Function mit Parametern auf
4. **Function Handler:** Führt Function aus
5. **Result:** Function Result wird an KI zurückgegeben
6. **Finale Antwort:** KI generiert finale Antwort mit Function Results

**Code-Stellen:**
- `backend/src/services/whatsappAiService.ts` Zeile 308-401: Function Calling
- `backend/src/services/whatsappFunctionHandlers.ts`: Alle Function Handlers

---

### Prompt-Struktur

**Aufbau:**
1. Language-Instructions (2x wiederholt für maximale Betonung)
2. Base-Prompt (aus AI-Config)
3. Context-Instructions (dynamisch basierend auf Context)
4. Function-Instructions (dynamisch basierend auf verfügbaren Functions)
5. Channel-spezifische Instructions (WhatsApp)

**Code-Stellen:**
- `backend/src/services/chatbot/PromptBuilder.ts` Zeile 36-72: `buildPrompt`

---

### Context-Speicherung

**Wo wird Context gespeichert?**
- `WhatsAppConversation.context` (JSON-Feld in Datenbank)

**Wann wird Context aktualisiert?**
- Nach jeder Nachricht (mit geparsten Daten)
- Nach Function Calls (z.B. `check_room_availability` speichert Verfügbarkeit)
- Nach Buchungen (speichert Buchungsdaten)

**Code-Stellen:**
- `backend/src/services/chatbot/ContextService.ts`: Context-Management
- `backend/src/services/whatsappFunctionHandlers.ts` Zeile 911-962: Context-Speicherung in `check_room_availability`

---

## 🎯 ZUSAMMENFASSUNG

### Warum gibt es Meldungen?

1. **Normaler Betrieb:** System loggt alle wichtigen Schritte
2. **Fehlerbehandlung:** System loggt Fehler für Debugging
3. **Status-Updates:** WhatsApp Webhooks senden Status-Updates
4. **Warnungen:** System warnt bei potenziellen Problemen

### Was sind die Probleme?

1. **🔴 KRITISCH:** OAuth Access Token ungültig → Nachrichten werden nicht versendet
2. **🟡 HOCH:** Template-Fallback nur bei templateName → Fehler werden weitergeworfen
3. **🟡 MITTEL:** Doppelte Nachrichten → Ursache noch unklar
4. **🟢 MITTEL:** Falsche Datumsinterpretation → Teilweise behoben
5. **🟢 MITTEL:** Sprache inkonsistent → Teilweise behoben

### Wie funktioniert der Bot?

1. **Webhook empfängt Nachricht** → `whatsappController.ts`
2. **Nachricht verarbeiten** → `whatsappMessageHandler.ts`
3. **Core Services nutzen** → `chatbot/` (Parser, Context, Language, Conversation)
4. **KI-Antwort generieren** → `whatsappAiService.ts`
5. **Function Calls ausführen** → `whatsappFunctionHandlers.ts`
6. **Nachricht versenden** → `whatsappService.ts`

**Architektur:**
- Modulare Struktur mit Core Services
- Wiederverwendbar für andere Kanäle (Email, Instagram, etc.)
- Context-Management für Konversations-Kontinuität
- Language-Management für Sprach-Konsistenz

---

**Erstellt:** 2025-02-01  
**Status:** 📋 Analyse & Plan - KEINE ÄNDERUNGEN  
**Nächste Schritte:** Prioritäten mit Benutzer besprechen


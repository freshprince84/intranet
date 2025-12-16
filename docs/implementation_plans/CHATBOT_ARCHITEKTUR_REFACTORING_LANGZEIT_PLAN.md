# Chatbot-Architektur Refactoring - Langzeit-Plan

**Datum:** 2025-12-16  
**Status:** Plan erstellt  
**Priorität:** KRITISCH - Langfristige, saubere Lösung

---

## 📚 Dokumente-Analyse

### Gelesene Dokumente für diese Analyse:

**Grundlegende Dokumentation:**
- `.cursor/rules/immer.mdc` - Grundregeln (keine Fixes, nur langfristige Lösungen)
- `README.md` - Projektübersicht
- `docs/claude/readme.md` - Claude-spezifische Informationen
- `docs/core/VIBES.md` - Coding-Stil (Code vereinfachen, Performance erhöhen)
- `docs/core/CODING_STANDARDS.md` - Coding-Standards
- `docs/technical/ARCHITEKTUR.md` - Systemarchitektur

**Problem-Analysen:**
- `docs/technical/WHATSAPP_BOT_PROBLEME_DETAILLIERTE_ANALYSE.md` (2025-01-26)
- `docs/implementation_plans/WHATSAPP_BOT_RESERVATION_PROBLEME_FIXES_PLAN.md` (2025-12-15)
- `docs/implementation_plans/WHATSAPP_BOT_CONTEXT_VERLUST_FIXES_PLAN.md` (2025-12-16)
- `docs/implementation_plans/WHATSAPP_BOT_SYSTEMATISCHER_REFACTORING_PLAN.md` (2025-12-16)

**Implementierungspläne:**
- `docs/implementation_plans/LOBBYPMS_KI_BOT_BUCHUNGSSYSTEM_PLAN.md`
- `docs/implementation_plans/LOBBYPMS_KI_BOT_WIEDERVERWENDUNG.md`
- `docs/implementation_plans/WHATSAPP_BRANCH_INTEGRATION.md`

**Implementierungs-Reports:**
- `docs/implementation_reports/WHATSAPP_BOT_RESERVATION_PROBLEME_FIXES_REPORT.md`

---

## 🔍 Aktuelle Situation: Code-Analyse

### Fakten aus Code-Analyse:

**Datei:** `backend/src/services/whatsappMessageHandler.ts`
- **Zeilen:** 2008 Zeilen
- **Verantwortlichkeiten:** 
  - Nachrichtenverarbeitung (Zeile 25-340)
  - Keyword-Erkennung (Zeile 200-250)
  - Context-Management (Zeile 1590-1996)
  - Parsing-Logik (Zeile 1654-1890)
  - Business-Logik (Zeile 230-340)
  - WhatsApp-spezifische Logik (vermischt)

**Datei:** `backend/src/services/whatsappAiService.ts`
- **Zeilen:** 1319 Zeilen
- **Verantwortlichkeiten:**
  - KI-Integration (Zeile 32-434)
  - System Prompt (Zeile 930-1208)
  - Sprach-Erkennung (Zeile 137-148)
  - Function Calling (Zeile 434-929)

**Probleme (Fakten aus Code):**
1. Parsing-Logik ist in `whatsappMessageHandler.ts` Zeile 1677-1890 verstreut
2. Context-Management ist in `whatsappMessageHandler.ts` Zeile 1909-1928 verstreut
3. Sprach-Erkennung ist in `whatsappAiService.ts` Zeile 137-148 und `whatsappMessageHandler.ts` verstreut
4. System Prompt wird ad-hoc erweitert in `whatsappAiService.ts` Zeile 1150-1206
5. Keine Wiederverwendbarkeit für andere Kanäle (Email, Instagram, Facebook, Twitter)

---

## 🎯 Ziel: Langfristige, saubere Architektur

### Architektur-Prinzipien (basierend auf VIBES.md und CODING_STANDARDS.md):

1. **DRY (Don't Repeat Yourself):**
   - Parsing-Logik nur einmal implementieren
   - Context-Management nur einmal implementieren
   - Sprach-Erkennung nur einmal implementieren

2. **Separation of Concerns:**
   - Message Handler: Nur Routing und Orchestrierung
   - Parsing Service: Zentrale Parsing-Logik
   - Context Service: Zentrale Context-Verwaltung
   - Language Service: Zentrale Sprach-Erkennung
   - AI Service: Nur KI-Integration

3. **Single Responsibility:**
   - Jede Klasse hat eine klare Verantwortung
   - Keine Code-Duplikation
   - Wiederverwendbare Services

4. **Code-Vereinfachung:**
   - Code kürzen, nicht aufblasen
   - Komplexität reduzieren
   - Performance erhöhen

5. **Wiederverwendbarkeit:**
   - Core Services sind channel-agnostisch
   - Wiederverwendbar für WhatsApp, Email, Instagram, Facebook, Twitter
   - Wiederverwendbar für verschiedene Zielgruppen (Gäste, Mitarbeiter)

---

## 📐 Neue Architektur-Struktur

### Verzeichnisstruktur:

```
backend/src/services/
├── chatbot/                          # NEU: Channel-agnostische Core Services
│   ├── MessageParserService.ts       # Zentrale Parsing-Logik
│   ├── ContextService.ts             # Zentrale Context-Verwaltung
│   ├── LanguageService.ts            # Zentrale Sprach-Erkennung
│   ├── ConversationService.ts       # Zentrale Conversation-Logik
│   └── PromptBuilder.ts              # Strukturierte Prompt-Architektur
│
├── whatsapp/                         # NEU: WhatsApp-spezifische Schicht
│   ├── WhatsAppMessageHandler.ts     # Nur WhatsApp-spezifische Logik
│   └── WhatsAppMessageNormalizer.ts  # WhatsApp-Nachrichten-Normalisierung
│
├── email/                            # ZUKÜNFTIG: Email-spezifische Schicht
│   └── EmailMessageHandler.ts
│
├── instagram/                        # ZUKÜNFTIG: Instagram-spezifische Schicht
│   └── InstagramMessageHandler.ts
│
└── [bestehende Services bleiben]
```

---

## 🔧 Phase 1: Core Services erstellen

### 1.1 MessageParserService

**Datei:** `backend/src/services/chatbot/MessageParserService.ts`

**Verantwortung:**
- Zentrale Parsing-Logik für alle Message-Typen
- Wiederverwendbar für alle Kanäle
- Code-Vereinfachung: Alle Parsing-Logik an einem Ort

**Interface:**
```typescript
export interface ParsedMessage {
  dates?: {
    checkIn?: string | null;
    checkOut?: string | null;
  };
  name?: string | null;
  room?: {
    name?: string | null;
    categoryId?: number | null;
    type?: 'compartida' | 'privada' | null;
  };
  intent?: 'booking' | 'availability' | 'code' | 'status' | 'tour' | 'other';
}

export class MessageParserService {
  /**
   * Parst eine Nachricht und extrahiert alle relevanten Informationen
   */
  static parseMessage(message: string, context?: any, availableRooms?: any[]): ParsedMessage;
  
  /**
   * Parst Datum aus Nachricht
   */
  static parseDate(message: string, context?: any): string | null;
  
  /**
   * Parst Datumsbereich aus Nachricht
   */
  static parseDateRange(message: string, context?: any): { checkIn: string, checkOut: string } | null;
  
  /**
   * Parst relativen Datumsbegriff (heute, morgen, übermorgen)
   */
  static parseRelativeDate(message: string): 'today' | 'tomorrow' | 'day after tomorrow' | null;
  
  /**
   * Parst Name aus Nachricht
   */
  static parseName(message: string): string | null;
  
  /**
   * Bereinigt Name von führenden Wörtern
   */
  static cleanName(name: string): string;
  
  /**
   * Parst Zimmer-Name und categoryId aus Nachricht
   */
  static parseRoom(message: string, availableRooms?: any[]): { roomName: string, categoryId: number, type: 'compartida' | 'privada' } | null;
  
  /**
   * Parst Intent aus Nachricht
   */
  static parseIntent(message: string): 'booking' | 'availability' | 'code' | 'status' | 'tour' | 'other';
}
```

**Migration:**
- Zeile 1677-1708 aus `whatsappMessageHandler.ts` → `MessageParserService.parseDate()` und `parseDateRange()`
- Zeile 1710-1740 aus `whatsappMessageHandler.ts` → `MessageParserService.parseName()`
- Zeile 1749-1890 aus `whatsappMessageHandler.ts` → `MessageParserService.parseRoom()`
- Zeile 2003-2007 aus `whatsappMessageHandler.ts` → `MessageParserService.cleanName()`

**Code-Vereinfachung:**
- Alle Parsing-Logik an einem Ort
- Wiederverwendbar für alle Kanäle
- Testbar und wartbar

---

### 1.2 ContextService

**Datei:** `backend/src/services/chatbot/ContextService.ts`

**Verantwortung:**
- Zentrale Context-Verwaltung
- Standardisierte Context-Struktur
- Wiederverwendbar für alle Kanäle

**Interface:**
```typescript
export interface ConversationContext {
  language: string; // IMMER vorhanden
  booking?: {
    checkInDate?: string;
    checkOutDate?: string;
    guestName?: string;
    roomType?: 'compartida' | 'privada';
    categoryId?: number;
    roomName?: string;
    lastAvailabilityCheck?: {
      startDate: string;
      endDate: string;
      rooms: Array<{
        categoryId: number;
        name: string;
        type: 'compartida' | 'privada';
        availableRooms: number;
      }>;
    };
  };
  tour?: {
    tourId?: number;
    tourDate?: string;
    numberOfParticipants?: number;
    customerName?: string;
  };
}

export class ContextService {
  /**
   * Lädt Context aus Conversation
   */
  static async getContext(conversationId: number, conversationModel: 'WhatsAppConversation' | 'EmailConversation' | 'InstagramConversation'): Promise<ConversationContext>;
  
  /**
   * Aktualisiert Context in Conversation
   */
  static async updateContext(conversationId: number, updates: Partial<ConversationContext>, conversationModel: 'WhatsAppConversation' | 'EmailConversation' | 'InstagramConversation'): Promise<void>;
  
  /**
   * Löscht Context
   */
  static async clearContext(conversationId: number, conversationModel: 'WhatsAppConversation' | 'EmailConversation' | 'InstagramConversation'): Promise<void>;
  
  /**
   * Prüft ob alle Buchungsinformationen vorhanden sind
   */
  static hasAllBookingInfo(context: ConversationContext): boolean;
  
  /**
   * Prüft ob alle Tour-Informationen vorhanden sind
   */
  static hasAllTourInfo(context: ConversationContext): boolean;
  
  /**
   * Merged ParsedMessage mit Context
   */
  static mergeWithContext(parsed: ParsedMessage, context: ConversationContext): ConversationContext;
}
```

**Migration:**
- Zeile 1909-1928 aus `whatsappMessageHandler.ts` → `ContextService.updateContext()`
- Zeile 1955-1959 aus `whatsappMessageHandler.ts` → `ContextService.hasAllBookingInfo()`
- Context-Struktur standardisieren

**Code-Vereinfachung:**
- Context-Management an einem Ort
- Standardisierte Struktur
- Wiederverwendbar für alle Kanäle

---

### 1.3 LanguageService

**Datei:** `backend/src/services/chatbot/LanguageService.ts`

**Verantwortung:**
- Zentrale Sprach-Erkennung
- Sprach-Konsistenz über Conversation
- Wiederverwendbar für alle Kanäle

**Interface:**
```typescript
export class LanguageService {
  /**
   * Erkennt Sprache aus Nachricht, Telefonnummer oder Context
   */
  static detectLanguage(message: string, phoneNumber?: string, context?: ConversationContext): string;
  
  /**
   * Stellt Sprach-Konsistenz über Conversation sicher
   */
  static async ensureLanguageConsistency(conversationId: number, detectedLanguage: string, conversationModel: 'WhatsAppConversation' | 'EmailConversation' | 'InstagramConversation'): Promise<string>;
  
  /**
   * Lädt Sprache aus Context
   */
  static async getLanguageFromContext(conversationId: number, conversationModel: 'WhatsAppConversation' | 'EmailConversation' | 'InstagramConversation'): Promise<string | null>;
  
  /**
   * Speichert Sprache im Context
   */
  static async saveLanguageToContext(conversationId: number, language: string, conversationModel: 'WhatsAppConversation' | 'EmailConversation' | 'InstagramConversation'): Promise<void>;
}
```

**Migration:**
- Zeile 137-148 aus `whatsappAiService.ts` → `LanguageService.detectLanguage()`
- Sprach-Konsistenz-Logik → `LanguageService.ensureLanguageConsistency()`

**Code-Vereinfachung:**
- Sprach-Erkennung an einem Ort
- Konsistenz-Logik zentralisiert
- Wiederverwendbar für alle Kanäle

---

### 1.4 ConversationService

**Datei:** `backend/src/services/chatbot/ConversationService.ts`

**Verantwortung:**
- Zentrale Conversation-Logik
- State-Management
- Flow-Control
- Wiederverwendbar für alle Kanäle

**Interface:**
```typescript
export interface ConversationState {
  shouldBook?: boolean;
  shouldBookTour?: boolean;
  shouldCheckAvailability?: boolean;
  missingInfo?: string[];
}

export class ConversationService {
  /**
   * Verarbeitet Nachricht und bestimmt nächste Aktion
   */
  static async processMessage(
    message: string,
    parsed: ParsedMessage,
    context: ConversationContext,
    language: string,
    conversationId: number,
    conversationModel: 'WhatsAppConversation' | 'EmailConversation' | 'InstagramConversation',
    branchId: number
  ): Promise<ConversationState>;
  
  /**
   * Bestimmt ob Buchung ausgeführt werden soll
   */
  static shouldExecuteBooking(context: ConversationContext, parsed: ParsedMessage): boolean;
  
  /**
   * Bestimmt ob Tour-Buchung ausgeführt werden soll
   */
  static shouldExecuteTourBooking(context: ConversationContext, parsed: ParsedMessage): boolean;
  
  /**
   * Bestimmt fehlende Informationen
   */
  static getMissingInfo(context: ConversationContext, intent: string): string[];
}
```

**Migration:**
- Zeile 1961-1989 aus `whatsappMessageHandler.ts` → `ConversationService.shouldExecuteBooking()`
- Business-Logik → `ConversationService.processMessage()`

**Code-Vereinfachung:**
- Conversation-Logik zentralisiert
- Wiederverwendbar für alle Kanäle

---

### 1.5 PromptBuilder

**Datei:** `backend/src/services/chatbot/PromptBuilder.ts`

**Verantwortung:**
- Strukturierte Prompt-Erstellung
- Modulare Prompt-Komponenten
- Wiederverwendbar für verschiedene Kanäle

**Interface:**
```typescript
export class PromptBuilder {
  /**
   * Baut System Prompt aus modularen Komponenten
   */
  static buildPrompt(
    language: string,
    context?: ConversationContext,
    channel?: 'whatsapp' | 'email' | 'instagram' | 'facebook' | 'twitter',
    aiConfig?: AIConfig
  ): string;
  
  /**
   * Basis-Prompt (immer vorhanden)
   */
  private static getBasePrompt(language: string, aiConfig?: AIConfig): string;
  
  /**
   * Context-Instructions (dynamisch basierend auf Context)
   */
  private static getContextInstructions(context: ConversationContext, language: string): string;
  
  /**
   * Parsing-Instructions (dynamisch basierend auf parsed Data)
   */
  private static getParsingInstructions(parsed: ParsedMessage, language: string): string;
  
  /**
   * Function-Instructions (dynamisch basierend auf verfügbaren Functions)
   */
  private static getFunctionInstructions(functions: any[], language: string, context?: ConversationContext): string;
  
  /**
   * Language-Instructions (immer vorhanden)
   */
  private static getLanguageInstructions(language: string): string;
  
  /**
   * Channel-spezifische Instructions
   */
  private static getChannelSpecificInstructions(channel: string, language: string): string;
}
```

**Migration:**
- Zeile 930-1208 aus `whatsappAiService.ts` → `PromptBuilder.buildPrompt()`
- System Prompt in modulare Komponenten aufteilen

**Code-Vereinfachung:**
- Prompt-Erstellung strukturiert
- Modulare Komponenten statt ad-hoc Erweiterungen
- Wiederverwendbar für alle Kanäle

---

## 🔧 Phase 2: WhatsApp-spezifische Schicht refactoren

### 2.1 WhatsAppMessageHandler refactoren

**Datei:** `backend/src/services/whatsapp/whatsappMessageHandler.ts` (NEU)

**Verantwortung:**
- Nur WhatsApp-spezifische Logik
- Verwendet Core Services
- Code-Vereinfachung: Von 2008 Zeilen auf ~300 Zeilen

**Neue Struktur:**
```typescript
export class WhatsAppMessageHandler {
  /**
   * Verarbeitet eingehende WhatsApp-Nachricht
   */
  static async handleIncomingMessage(
    phoneNumber: string,
    messageText: string,
    branchId: number,
    mediaUrl?: string,
    groupId?: string
  ): Promise<string> {
    // 1. Normalisiere Nachricht (WhatsApp-spezifisch)
    const normalizedMessage = WhatsAppMessageNormalizer.normalize(messageText);
    
    // 2. Lade oder erstelle Conversation
    const conversation = await this.getOrCreateConversation(phoneNumber, branchId, groupId);
    
    // 3. Verwende Core Services
    const language = await LanguageService.ensureLanguageConsistency(
      conversation.id,
      LanguageService.detectLanguage(normalizedMessage, phoneNumber),
      'WhatsAppConversation'
    );
    
    const context = await ContextService.getContext(conversation.id, 'WhatsAppConversation');
    
    const parsed = MessageParserService.parseMessage(normalizedMessage, context);
    
    // 4. Business-Logik (Core Services)
    const conversationState = await ConversationService.processMessage(
      normalizedMessage,
      parsed,
      context,
      language,
      conversation.id,
      'WhatsAppConversation',
      branchId
    );
    
    // 5. Aktualisiere Context mit parsed Data
    const updatedContext = ContextService.mergeWithContext(parsed, context);
    await ContextService.updateContext(conversation.id, updatedContext, 'WhatsAppConversation');
    
    // 6. Führe Aktionen aus (basierend auf conversationState)
    if (conversationState.shouldBook) {
      return await this.executeBooking(updatedContext, conversation, branchId, phoneNumber, language);
    }
    
    if (conversationState.shouldBookTour) {
      return await this.executeTourBooking(updatedContext, conversation, branchId, phoneNumber, language);
    }
    
    // 7. KI-Antwort generieren
    return await this.generateAIResponse(normalizedMessage, updatedContext, language, conversation.id, branchId);
  }
  
  /**
   * Führt Buchung aus
   */
  private static async executeBooking(context: ConversationContext, conversation: any, branchId: number, phoneNumber: string, language: string): Promise<string>;
  
  /**
   * Generiert KI-Antwort
   */
  private static async generateAIResponse(message: string, context: ConversationContext, language: string, conversationId: number, branchId: number): Promise<string>;
}
```

**Migration:**
- Business-Logik → Core Services
- Nur WhatsApp-spezifische Logik bleibt
- Code-Vereinfachung: Von 2008 Zeilen auf ~300 Zeilen

---

### 2.2 WhatsAppMessageNormalizer

**Datei:** `backend/src/services/whatsapp/WhatsAppMessageNormalizer.ts` (NEU)

**Verantwortung:**
- WhatsApp-spezifische Nachrichten-Normalisierung
- Emoji-Entfernung
- WhatsApp-Formatierung

**Interface:**
```typescript
export class WhatsAppMessageNormalizer {
  /**
   * Normalisiert WhatsApp-Nachricht
   */
  static normalize(message: string): string;
  
  /**
   * Entfernt Emojis
   */
  static removeEmojis(message: string): string;
  
  /**
   * Normalisiert WhatsApp-Formatierung
   */
  static normalizeFormatting(message: string): string;
}
```

---

## 🔧 Phase 3: AI Service refactoren

### 3.1 WhatsAppAiService refactoren

**Datei:** `backend/src/services/whatsapp/whatsappAiService.ts` (NEU)

**Verantwortung:**
- Nur KI-Integration
- Verwendet PromptBuilder
- Code-Vereinfachung: Von 1319 Zeilen auf ~400 Zeilen

**Neue Struktur:**
```typescript
export class WhatsAppAiService {
  /**
   * Generiert KI-Antwort
   */
  static async generateResponse(
    message: string,
    branchId: number,
    phoneNumber: string,
    conversationContext?: ConversationContext,
    conversationId?: number
  ): Promise<AIResponse> {
    // 1. Lade Branch-Konfiguration
    const aiConfig = await this.loadAIConfig(branchId);
    
    // 2. Erkenne Sprache
    const language = LanguageService.detectLanguage(message, phoneNumber, conversationContext);
    
    // 3. Baue Prompt (strukturiert)
    const systemPrompt = PromptBuilder.buildPrompt(language, conversationContext, 'whatsapp', aiConfig);
    
    // 4. Rufe OpenAI API auf
    const response = await this.callOpenAI(message, systemPrompt, language, conversationContext, conversationId);
    
    return response;
  }
  
  /**
   * Ruft OpenAI API auf
   */
  private static async callOpenAI(message: string, systemPrompt: string, language: string, context?: ConversationContext, conversationId?: number): Promise<AIResponse>;
}
```

**Migration:**
- Zeile 930-1208 aus `whatsappAiService.ts` → `PromptBuilder.buildPrompt()`
- Prompt-Erstellung strukturiert

**Code-Vereinfachung:**
- System Prompt modularisiert
- Code-Vereinfachung: Von 1319 Zeilen auf ~400 Zeilen

---

## 📊 Vergleich: Vorher vs. Nachher

### Vorher (Aktuell):

**Dateien:**
- `whatsappMessageHandler.ts`: 2008 Zeilen
- `whatsappAiService.ts`: 1319 Zeilen
- **Gesamt:** 3327 Zeilen

**Probleme (Fakten):**
- Parsing-Logik in `whatsappMessageHandler.ts` Zeile 1677-1890 (213 Zeilen)
- Context-Management in `whatsappMessageHandler.ts` Zeile 1909-1928 (19 Zeilen)
- Sprach-Erkennung in `whatsappAiService.ts` Zeile 137-148 (11 Zeilen) und `whatsappMessageHandler.ts` verstreut
- System Prompt in `whatsappAiService.ts` Zeile 930-1208 (278 Zeilen)
- Code-Duplikation: Parsing-Logik wird mehrfach verwendet
- Nicht wiederverwendbar für andere Kanäle

### Nachher (Refactored):

**Dateien:**
- `chatbot/MessageParserService.ts`: ~400 Zeilen (NEU)
- `chatbot/ContextService.ts`: ~200 Zeilen (NEU)
- `chatbot/LanguageService.ts`: ~150 Zeilen (NEU)
- `chatbot/ConversationService.ts`: ~300 Zeilen (NEU)
- `chatbot/PromptBuilder.ts`: ~500 Zeilen (NEU)
- `whatsapp/whatsappMessageHandler.ts`: ~300 Zeilen (refactored)
- `whatsapp/whatsappAiService.ts`: ~400 Zeilen (refactored)
- **Gesamt:** ~2250 Zeilen

**Vorteile (Fakten):**
- Code-Vereinfachung: Von 3327 Zeilen auf ~2250 Zeilen (32% Reduktion)
- Parsing-Logik zentralisiert: Nur in `MessageParserService.ts`
- Context-Management zentralisiert: Nur in `ContextService.ts`
- Sprach-Erkennung zentralisiert: Nur in `LanguageService.ts`
- System Prompt strukturiert: Modulare Komponenten in `PromptBuilder.ts`
- Wiederverwendbar: Core Services für alle Kanäle
- Testbar: Jeder Service unabhängig testbar

---

## 🎯 Implementierungsreihenfolge

### Phase 1: Core Services erstellen (KRITISCH)

**Ziel:** Zentrale Services erstellen, die von allen Kanälen verwendet werden können

**Schritte:**
1. `MessageParserService.ts` erstellen
   - Alle Parsing-Logik migrieren
   - Standardisierte Patterns
   - Wiederverwendbar

2. `ContextService.ts` erstellen
   - Context-Struktur standardisieren
   - Context-Management zentralisieren
   - Wiederverwendbar

3. `LanguageService.ts` erstellen
   - Sprach-Erkennung zentralisieren
   - Sprach-Konsistenz sicherstellen
   - Wiederverwendbar

4. `ConversationService.ts` erstellen
   - Conversation-Logik zentralisieren
   - State-Management
   - Wiederverwendbar

5. `PromptBuilder.ts` erstellen
   - System Prompt modularisieren
   - Strukturierte Komponenten
   - Wiederverwendbar

**Zeitplan:** 2-3 Wochen

---

### Phase 2: WhatsApp-Refactoring

**Ziel:** WhatsApp-spezifische Schicht refactoren, Core Services verwenden

**Schritte:**
1. `WhatsAppMessageNormalizer.ts` erstellen
2. `whatsappMessageHandler.ts` refactoren
   - Business-Logik → Core Services
   - Nur WhatsApp-spezifische Logik bleibt
3. `whatsappAiService.ts` refactoren
   - PromptBuilder verwenden
   - Code-Vereinfachung

**Zeitplan:** 1 Woche

---

### Phase 3: Testing & Validation

**Ziel:** Tests schreiben, Integration-Tests, Regression-Tests

**Schritte:**
1. Unit-Tests für Core Services
2. Integration-Tests für WhatsApp-Refactoring
3. Regression-Tests für bestehende Funktionalität

**Zeitplan:** 1 Woche

---

## 📋 Konkrete Implementierungs-Schritte

### Schritt 1: MessageParserService erstellen

**Datei:** `backend/src/services/chatbot/MessageParserService.ts`

**Code-Struktur:**
```typescript
export class MessageParserService {
  /**
   * Parst eine Nachricht und extrahiert alle relevanten Informationen
   */
  static parseMessage(message: string, context?: ConversationContext, availableRooms?: any[]): ParsedMessage {
    const normalized = message.toLowerCase().trim();
    
    return {
      dates: this.parseDates(normalized, context),
      name: this.parseName(message),
      room: this.parseRoom(normalized, availableRooms),
      intent: this.parseIntent(normalized)
    };
  }
  
  /**
   * Parst Datum aus Nachricht
   */
  private static parseDates(message: string, context?: ConversationContext): { checkIn?: string, checkOut?: string } | null {
    // Alle Datum-Parsing-Logik hier
    // - "morgen", "tomorrow", "mañana" → 'tomorrow'
    // - "heute", "today", "hoy" → 'today'
    // - "17.12.25", "17/12/25", etc. → '2025-12-17'
    // - "17.12.25 bis 18.12.25" → { checkIn: '2025-12-17', checkOut: '2025-12-18' }
  }
  
  /**
   * Parst Name aus Nachricht
   */
  private static parseName(message: string): string | null {
    // Alle Name-Parsing-Logik hier
    // - "ist Patrick Ammann" → "Patrick Ammann"
    // - "mit Patrick Ammann" → "Patrick Ammann"
    // - "für Patrick Ammann" → "Patrick Ammann"
  }
  
  /**
   * Bereinigt Name von führenden Wörtern
   */
  static cleanName(name: string): string {
    if (!name) return name;
    return name.replace(/^(ist|mit|für|para|a nombre de|name|nombre)\s+/i, '').trim();
  }
  
  /**
   * Parst Zimmer-Name und categoryId aus Nachricht
   */
  private static parseRoom(message: string, availableRooms?: any[]): { roomName: string, categoryId: number, type: 'compartida' | 'privada' } | null {
    // Alle Room-Parsing-Logik hier
    // - Suche in availableRooms
    // - Fuzzy-Matching
    // - Fallback-Logik
  }
  
  /**
   * Parst Intent aus Nachricht
   */
  private static parseIntent(message: string): 'booking' | 'availability' | 'code' | 'status' | 'tour' | 'other' {
    // Intent-Erkennung
  }
}
```

**Migration:**
- Zeile 1677-1708 aus `whatsappMessageHandler.ts` → `parseDates()`
- Zeile 1710-1740 aus `whatsappMessageHandler.ts` → `parseName()`
- Zeile 1749-1890 aus `whatsappMessageHandler.ts` → `parseRoom()`
- Zeile 2003-2007 aus `whatsappMessageHandler.ts` → `cleanName()`

---

### Schritt 2: ContextService erstellen

**Datei:** `backend/src/services/chatbot/ContextService.ts`

**Code-Struktur:**
```typescript
export class ContextService {
  /**
   * Lädt Context aus Conversation
   */
  static async getContext(conversationId: number, conversationModel: 'WhatsAppConversation' | 'EmailConversation' | 'InstagramConversation'): Promise<ConversationContext> {
    const model = this.getPrismaModel(conversationModel);
    const conversation = await prisma[model].findUnique({
      where: { id: conversationId },
      select: { context: true }
    });
    
    const context = (conversation?.context as ConversationContext) || { language: 'es' };
    
    // Stelle sicher, dass language immer vorhanden ist
    if (!context.language) {
      context.language = 'es';
    }
    
    return context;
  }
  
  /**
   * Aktualisiert Context in Conversation
   */
  static async updateContext(conversationId: number, updates: Partial<ConversationContext>, conversationModel: 'WhatsAppConversation' | 'EmailConversation' | 'InstagramConversation'): Promise<void> {
    const currentContext = await this.getContext(conversationId, conversationModel);
    const updatedContext = { ...currentContext, ...updates };
    
    const model = this.getPrismaModel(conversationModel);
    await prisma[model].update({
      where: { id: conversationId },
      data: { context: updatedContext }
    });
  }
  
  /**
   * Prüft ob alle Buchungsinformationen vorhanden sind
   */
  static hasAllBookingInfo(context: ConversationContext): boolean {
    const booking = context.booking;
    if (!booking) return false;
    
    return !!(
      booking.checkInDate &&
      booking.checkOutDate &&
      booking.roomType &&
      (booking.categoryId || !booking.roomName)
    );
  }
  
  /**
   * Merged ParsedMessage mit Context
   */
  static mergeWithContext(parsed: ParsedMessage, context: ConversationContext): ConversationContext {
    const updated: ConversationContext = { ...context };
    
    // Merge dates
    if (parsed.dates) {
      if (!updated.booking) updated.booking = {};
      if (parsed.dates.checkIn) updated.booking.checkInDate = parsed.dates.checkIn;
      if (parsed.dates.checkOut) updated.booking.checkOutDate = parsed.dates.checkOut;
    }
    
    // Merge name
    if (parsed.name) {
      if (!updated.booking) updated.booking = {};
      updated.booking.guestName = parsed.name;
    }
    
    // Merge room
    if (parsed.room) {
      if (!updated.booking) updated.booking = {};
      if (parsed.room.name) updated.booking.roomName = parsed.room.name;
      if (parsed.room.categoryId) updated.booking.categoryId = parsed.room.categoryId;
      if (parsed.room.type) updated.booking.roomType = parsed.room.type;
    }
    
    return updated;
  }
  
  /**
   * Gibt Prisma Model-Name zurück
   */
  private static getPrismaModel(conversationModel: string): string {
    return conversationModel;
  }
}
```

**Migration:**
- Zeile 1909-1928 aus `whatsappMessageHandler.ts` → `updateContext()`
- Zeile 1955-1959 aus `whatsappMessageHandler.ts` → `hasAllBookingInfo()`

---

### Schritt 3: LanguageService erstellen

**Datei:** `backend/src/services/chatbot/LanguageService.ts`

**Code-Struktur:**
```typescript
export class LanguageService {
  /**
   * Erkennt Sprache aus Nachricht, Telefonnummer oder Context
   */
  static detectLanguage(message: string, phoneNumber?: string, context?: ConversationContext): string {
    // Priorität 1: Aus Nachricht
    const fromMessage = WhatsAppAiService.detectLanguageFromMessage(message);
    if (fromMessage) return fromMessage;
    
    // Priorität 2: Aus Context
    if (context?.language) return context.language;
    
    // Priorität 3: Aus Telefonnummer
    if (phoneNumber) {
      return LanguageDetectionService.detectLanguageFromPhoneNumber(phoneNumber);
    }
    
    // Fallback
    return 'es';
  }
  
  /**
   * Stellt Sprach-Konsistenz über Conversation sicher
   */
  static async ensureLanguageConsistency(conversationId: number, detectedLanguage: string, conversationModel: 'WhatsAppConversation' | 'EmailConversation' | 'InstagramConversation'): Promise<string> {
    const context = await ContextService.getContext(conversationId, conversationModel);
    
    // Wenn Sprache bereits im Context, verwende diese
    if (context.language) {
      return context.language;
    }
    
    // Sonst: Speichere erkannte Sprache
    await ContextService.updateContext(conversationId, { language: detectedLanguage }, conversationModel);
    return detectedLanguage;
  }
}
```

**Migration:**
- Zeile 137-148 aus `whatsappAiService.ts` → `detectLanguage()`
- Sprach-Konsistenz-Logik → `ensureLanguageConsistency()`

---

### Schritt 4: ConversationService erstellen

**Datei:** `backend/src/services/chatbot/ConversationService.ts`

**Code-Struktur:**
```typescript
export class ConversationService {
  /**
   * Verarbeitet Nachricht und bestimmt nächste Aktion
   */
  static async processMessage(
    message: string,
    parsed: ParsedMessage,
    context: ConversationContext,
    language: string,
    conversationId: number,
    conversationModel: 'WhatsAppConversation' | 'EmailConversation' | 'InstagramConversation',
    branchId: number
  ): Promise<ConversationState> {
    // Merge parsed mit context
    const updatedContext = ContextService.mergeWithContext(parsed, context);
    
    // Speichere updated context
    await ContextService.updateContext(conversationId, updatedContext, conversationModel);
    
    // Bestimme nächste Aktion
    const state: ConversationState = {};
    
    if (parsed.intent === 'booking' && this.shouldExecuteBooking(updatedContext, parsed)) {
      state.shouldBook = true;
    }
    
    if (parsed.intent === 'tour' && this.shouldExecuteTourBooking(updatedContext, parsed)) {
      state.shouldBookTour = true;
    }
    
    if (parsed.intent === 'availability') {
      state.shouldCheckAvailability = true;
    }
    
    // Bestimme fehlende Informationen
    if (state.shouldBook || state.shouldBookTour) {
      state.missingInfo = this.getMissingInfo(updatedContext, parsed.intent || 'other');
    }
    
    return state;
  }
  
  /**
   * Bestimmt ob Buchung ausgeführt werden soll
   */
  static shouldExecuteBooking(context: ConversationContext, parsed: ParsedMessage): boolean {
    // Prüfe ob alle Informationen vorhanden sind
    if (!ContextService.hasAllBookingInfo(context)) {
      return false;
    }
    
    // Prüfe ob Name gerade gegeben wurde
    const nameWasJustProvided = parsed.name && !context.booking?.guestName;
    const hasActiveBookingRequest = context.booking?.checkInDate || context.booking?.lastAvailabilityCheck;
    
    // Wenn Name gerade gegeben wurde und alle Daten vorhanden sind, buchen
    if (nameWasJustProvided && hasActiveBookingRequest) {
      return true;
    }
    
    // Wenn Intent booking ist und alle Daten vorhanden sind, buchen
    if (parsed.intent === 'booking' && hasActiveBookingRequest) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Bestimmt fehlende Informationen
   */
  static getMissingInfo(context: ConversationContext, intent: string): string[] {
    const missing: string[] = [];
    
    if (intent === 'booking') {
      if (!context.booking?.checkInDate) missing.push('checkInDate');
      if (!context.booking?.checkOutDate) missing.push('checkOutDate');
      if (!context.booking?.guestName) missing.push('guestName');
      if (!context.booking?.roomType) missing.push('roomType');
      if (context.booking?.roomName && !context.booking?.categoryId) missing.push('categoryId');
    }
    
    return missing;
  }
}
```

**Migration:**
- Zeile 1961-1989 aus `whatsappMessageHandler.ts` → `shouldExecuteBooking()`
- Business-Logik → `processMessage()`

---

### Schritt 5: PromptBuilder erstellen

**Datei:** `backend/src/services/chatbot/PromptBuilder.ts`

**Code-Struktur:**
```typescript
export class PromptBuilder {
  /**
   * Baut System Prompt aus modularen Komponenten
   */
  static buildPrompt(
    language: string,
    context?: ConversationContext,
    channel?: 'whatsapp' | 'email' | 'instagram' | 'facebook' | 'twitter',
    aiConfig?: AIConfig
  ): string {
    const components: string[] = [];
    
    // 1. Basis-Prompt
    components.push(this.getBasePrompt(language, aiConfig));
    
    // 2. Language-Instructions
    components.push(this.getLanguageInstructions(language));
    
    // 3. Context-Instructions (dynamisch)
    if (context) {
      components.push(this.getContextInstructions(context, language));
    }
    
    // 4. Function-Instructions (dynamisch)
    components.push(this.getFunctionInstructions([], language, context));
    
    // 5. Channel-spezifische Instructions
    if (channel) {
      components.push(this.getChannelSpecificInstructions(channel, language));
    }
    
    return components.join('\n\n');
  }
  
  /**
   * Basis-Prompt (immer vorhanden)
   */
  private static getBasePrompt(language: string, aiConfig?: AIConfig): string {
    let prompt = aiConfig?.systemPrompt || 'Du bist ein hilfreicher Assistent.';
    
    if (aiConfig?.rules && aiConfig.rules.length > 0) {
      prompt += '\n\nRegeln:\n';
      aiConfig.rules.forEach((rule: string, index: number) => {
        prompt += `${index + 1}. ${rule}\n`;
      });
    }
    
    if (aiConfig?.sources && aiConfig.sources.length > 0) {
      prompt += '\n\nVerfügbare Quellen für Informationen:\n';
      aiConfig.sources.forEach((source: string, index: number) => {
        prompt += `${index + 1}. ${source}\n`;
      });
      prompt += '\nVerwende diese Quellen als Referenz, wenn relevant.';
    }
    
    return prompt;
  }
  
  /**
   * Context-Instructions (dynamisch basierend auf Context)
   */
  private static getContextInstructions(context: ConversationContext, language: string): string {
    let instructions = '\n\n=== KRITISCH: KONTEXT-NUTZUNG ===\n';
    instructions += 'WICHTIG: Du MUSST ALLE Informationen aus der aktuellen UND vorherigen Nachrichten nutzen!\n';
    instructions += 'WICHTIG: Effizienz - Prüfe IMMER zuerst, ob alle Informationen bereits im Context vorhanden sind, bevor du nachfragst!\n';
    
    // Dynamische Instructions basierend auf Context
    if (context.booking) {
      if (context.booking.checkInDate) {
        instructions += `WICHTIG: checkInDate ist bereits im Context: ${context.booking.checkInDate} - verwende diesen Wert!\n`;
      }
      if (context.booking.checkOutDate) {
        instructions += `WICHTIG: checkOutDate ist bereits im Context: ${context.booking.checkOutDate} - verwende diesen Wert!\n`;
      }
      if (context.booking.guestName) {
        instructions += `WICHTIG: guestName ist bereits im Context: ${context.booking.guestName} - verwende diesen Wert, frage NICHT erneut nach Name!\n`;
      }
      if (context.booking.roomName) {
        instructions += `WICHTIG: roomName ist bereits im Context: ${context.booking.roomName} - verwende diesen Wert!\n`;
      }
    }
    
    return instructions;
  }
  
  /**
   * Function-Instructions (dynamisch basierend auf verfügbaren Functions)
   */
  private static getFunctionInstructions(functions: any[], language: string, context?: ConversationContext): string {
    // Function-Instructions aus bestehendem Code migrieren
    // Strukturiert in modulare Komponenten
  }
  
  /**
   * Language-Instructions (immer vorhanden)
   */
  private static getLanguageInstructions(language: string): string {
    const translations: Record<string, string> = {
      es: 'WICHTIG: Antworte IMMER auf Spanisch!',
      de: 'WICHTIG: Antworte IMMER auf Deutsch!',
      en: 'WICHTIG: Antworte IMMER auf Englisch!'
    };
    return translations[language] || translations.es;
  }
  
  /**
   * Channel-spezifische Instructions
   */
  private static getChannelSpecificInstructions(channel: string, language: string): string {
    // Channel-spezifische Instructions
    // WhatsApp: Emoji-Support, etc.
    // Email: Formale Sprache, etc.
    // Instagram: Hashtags, etc.
  }
}
```

**Migration:**
- Zeile 930-1208 aus `whatsappAiService.ts` → `PromptBuilder.buildPrompt()`
- System Prompt in modulare Komponenten aufteilen

---

## ✅ Erfolgs-Kriterien

### Nach Refactoring:

1. **Code-Vereinfachung:**
   - Code-Reduktion: Von 3327 Zeilen auf ~2250 Zeilen (32% Reduktion)
   - Parsing-Logik nur in `MessageParserService.ts`
   - Context-Management nur in `ContextService.ts`
   - Sprach-Erkennung nur in `LanguageService.ts`

2. **Wiederverwendbarkeit:**
   - Core Services können für Email, Instagram, Facebook, Twitter verwendet werden
   - Nur Channel-spezifische Schicht muss neu implementiert werden
   - Beispiel: Email-Integration benötigt nur `EmailMessageHandler.ts` (verwendet Core Services)

3. **Standardisierung:**
   - Einheitliche Context-Struktur
   - Einheitliche Parsing-Patterns
   - Einheitliche Sprach-Erkennung

4. **Wartbarkeit:**
   - Änderungen an Parsing-Logik → nur `MessageParserService.ts`
   - Änderungen an Context → nur `ContextService.ts`
   - Änderungen an Sprach-Erkennung → nur `LanguageService.ts`
   - Änderungen an System Prompt → nur `PromptBuilder.ts`

5. **Testbarkeit:**
   - Core Services sind unabhängig testbar
   - Mocking einfach möglich
   - Integration-Tests möglich

6. **Performance:**
   - Code-Vereinfachung führt zu besserer Performance
   - Weniger Code-Duplikation
   - Effizientere Verarbeitung

---

## 🚨 Risiken und Mitigation

### Risiko 1: Breaking Changes

**Mitigation:**
- Schrittweise Migration
- Alte Code-Pfade bleiben zunächst erhalten
- Neue Code-Pfade verwenden Core Services
- Alte Code-Pfade werden schrittweise migriert

### Risiko 2: Performance-Impact

**Mitigation:**
- Core Services sind lightweight
- Keine zusätzlichen DB-Queries
- Caching wo möglich
- Code-Vereinfachung führt zu besserer Performance

### Risiko 3: Komplexität

**Mitigation:**
- Klare Verantwortlichkeiten
- Gute Dokumentation
- Code-Reviews
- Code-Vereinfachung statt Komplexität

---

## 📅 Zeitplan

### Phase 1: Core Services (2-3 Wochen)
- MessageParserService
- ContextService
- LanguageService
- ConversationService
- PromptBuilder

### Phase 2: WhatsApp-Refactoring (1 Woche)
- WhatsAppMessageNormalizer
- WhatsAppMessageHandler refactoren
- WhatsAppAiService refactoren

### Phase 3: Testing & Validation (1 Woche)
- Unit-Tests für Core Services
- Integration-Tests
- Regression-Tests

**Gesamt:** 4-5 Wochen

---

## 🎯 Nächste Schritte

1. **Sofort:** Core Services erstellen (verhindert zukünftige Probleme)
2. **Danach:** WhatsApp-Refactoring (schrittweise Migration)
3. **Zukünftig:** Email, Instagram, Facebook, Twitter Integration (verwendet Core Services)

---

---

## ✅ Bestätigung: Alle aktuellen Funktionen bleiben verfügbar

**WICHTIG:** Nach dem Refactoring bleiben alle aktuellen Funktionen vollständig verfügbar und funktionsfähig.

### Verfügbare Funktionen (unverändert):

**Datei:** `backend/src/services/whatsappFunctionHandlers.ts`

**Alle Funktionen bleiben unverändert:**

1. **`check_room_availability`** (Zeile 688)
   - Prüft Zimmerverfügbarkeit für einen Zeitraum
   - Verfügbar für: Alle (Gäste + Mitarbeiter)
   - Parameter: `startDate`, `endDate`, `roomType`, `branchId`

2. **`create_room_reservation`** (Zeile 1715)
   - Erstellt Zimmer-Reservation
   - Verfügbar für: Alle (Gäste + Mitarbeiter)
   - Parameter: `checkInDate`, `checkOutDate`, `guestName`, `roomType`, `categoryId`, `roomName`, `guestPhone`, `guestEmail`

3. **`create_potential_reservation`** (Zeile 1488)
   - Erstellt potenzielle Reservation (Status "potential")
   - Verfügbar für: Alle (Gäste + Mitarbeiter)
   - Parameter: `checkInDate`, `checkOutDate`, `roomType`, `categoryId`, `roomName`, `guestName` (optional)

4. **`get_tours`** (Zeile 964)
   - Holt verfügbare Touren
   - Verfügbar für: Alle (Gäste + Mitarbeiter)
   - Parameter: `type`, `availableFrom`, `availableTo`, `limit`

5. **`get_tour_details`** (Zeile 1107)
   - Holt detaillierte Informationen zu einer Tour
   - Verfügbar für: Alle (Gäste + Mitarbeiter)
   - Parameter: `tourId`

6. **`book_tour`** (Zeile 1197)
   - Erstellt Tour-Buchung
   - Verfügbar für: Alle (Gäste + Mitarbeiter)
   - Parameter: `tourId`, `tourDate`, `numberOfParticipants`, `customerName`, `customerPhone`, `customerEmail`

7. **`get_requests`** (Zeile 187)
   - Holt Requests (Solicitudes)
   - Verfügbar für: Nur Mitarbeiter (mit Berechtigung `table_requests`)
   - Parameter: `status`, `dueDate`, `userId`

8. **`get_todos`** (Zeile 292)
   - Holt Todos/Tasks
   - Verfügbar für: Nur Mitarbeiter (mit Berechtigung `table_tasks`)
   - Parameter: `status`, `dueDate`, `userId`

9. **`get_worktime`** (Zeile 395)
   - Holt Arbeitszeiten
   - Verfügbar für: Nur Mitarbeiter (mit Berechtigung `page_worktracker`)
   - Parameter: `date`, `startDate`, `endDate`, `userId`

10. **`get_cerebro_articles`** (Zeile 518)
    - Holt Cerebro-Artikel
    - Verfügbar für: Nur Mitarbeiter (mit Berechtigung `cerebro`)
    - Parameter: `searchTerm`, `tags`, `userId`

11. **`get_user_info`** (Zeile 629)
    - Holt User-Informationen
    - Verfügbar für: Nur Mitarbeiter (eigene Daten)
    - Parameter: `userId`

### Was ändert sich beim Refactoring:

**NICHT geändert:**
- ✅ Alle Function Handlers bleiben unverändert
- ✅ Alle Function Definitions bleiben unverändert
- ✅ Alle Parameter bleiben unverändert
- ✅ Alle Berechtigungsprüfungen bleiben unverändert
- ✅ Alle Business-Logik bleibt unverändert

**Geändert:**
- ✅ Nur die Art, wie Funktionen aufgerufen werden (über Core Services statt direkt im MessageHandler)
- ✅ Parsing-Logik wird zentralisiert (aber Funktionen bleiben gleich)
- ✅ Context-Management wird zentralisiert (aber Funktionen bleiben gleich)

### Beispiel: Wie Funktionen nach Refactoring aufgerufen werden:

**Vorher:**
```typescript
// whatsappMessageHandler.ts
const bookingResult = await WhatsAppFunctionHandlers.create_room_reservation(
  bookingContext.bookingData!,
  user?.id || null,
  roleId,
  branchId,
  normalizedPhone
);
```

**Nachher:**
```typescript
// whatsappMessageHandler.ts (refactored)
// Parsing und Context-Management über Core Services
const parsed = MessageParserService.parseMessage(message, context);
const updatedContext = ContextService.mergeWithContext(parsed, context);

// Function Handler bleibt GLEICH
const bookingResult = await WhatsAppFunctionHandlers.create_room_reservation(
  {
    checkInDate: updatedContext.booking.checkInDate,
    checkOutDate: updatedContext.booking.checkOutDate,
    guestName: updatedContext.booking.guestName,
    roomType: updatedContext.booking.roomType,
    categoryId: updatedContext.booking.categoryId,
    roomName: updatedContext.booking.roomName
  },
  user?.id || null,
  roleId,
  branchId,
  normalizedPhone
);
```

**Ergebnis:** Funktionen bleiben identisch, nur die Vorbereitung der Daten ändert sich (über Core Services).

---

**Erstellt:** 2025-12-16  
**Status:** ✅ Plan erstellt, bereit für Implementierung  
**Priorität:** KRITISCH - Langfristige, saubere Lösung

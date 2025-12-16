# WhatsApp Bot - Systematischer Refactoring-Plan

**Datum:** 2025-12-16  
**Status:** Analyse abgeschlossen, Refactoring-Plan erstellt  
**Priorität:** KRITISCH - Verhindert zukünftige Probleme

---

## 📋 Zusammenfassung

**Problem:** Gleiche Probleme treten immer wieder auf (Context-Verlust, Parsing-Fehler, Sprachwechsel, etc.)

**Ursache:** 
- Keine zentrale, systematische Architektur
- Code-Duplikation und inkonsistente Patterns
- Fehlende Standardisierung für Wiederverwendbarkeit
- Ad-hoc Fixes ohne systematische Lösung

**Ziel:**
- Saubere, systematisch strukturierte Chatbot-Architektur
- Wiederverwendbar für verschiedene Kanäle (WhatsApp, Email, Instagram, Facebook, Twitter)
- Wiederverwendbar für verschiedene Zielgruppen (Gäste, Mitarbeiter, etc.)
- Standardisierte Patterns, die zukünftige Probleme verhindern

---

## 📚 Dokumente-Analyse: Was wurde bereits gemacht?

### Gelesene Dokumente (für diese Analyse):

1. **Grundlegende Architektur:**
   - `docs/technical/ARCHITEKTUR.md` - Systemarchitektur
   - `docs/implementation_plans/LOBBYPMS_KI_BOT_WIEDERVERWENDUNG.md` - Wiederverwendbarkeit
   - `docs/implementation_plans/WHATSAPP_BRANCH_INTEGRATION.md` - Branch-Integration

2. **Problem-Analysen:**
   - `docs/technical/WHATSAPP_BOT_PROBLEME_DETAILLIERTE_ANALYSE.md` (2025-01-26) - Erste detaillierte Analyse
   - `docs/implementation_plans/WHATSAPP_BOT_FIXES_PLAN.md` - Fixes Plan
   - `docs/implementation_plans/WHATSAPP_BOT_RESERVATION_PROBLEME_FIXES_PLAN.md` (2025-12-15) - Reservierungsprobleme
   - `docs/implementation_plans/WHATSAPP_BOT_CONTEXT_VERLUST_FIXES_PLAN.md` (2025-12-16) - Context-Verlust

3. **Implementierungspläne:**
   - `docs/implementation_plans/LOBBYPMS_KI_BOT_BUCHUNGSSYSTEM_PLAN.md` - Buchungssystem
   - `docs/implementation_plans/WHATSAPP_BOT_ERWEITERUNG_ANALYSE_UND_PLAN.md` - Erweiterungen
   - `docs/implementation_plans/WHATSAPP_BOT_FUNCTION_CALLING_IMPLEMENTIERUNG.md` - Function Calling

4. **Implementierungs-Reports:**
   - `docs/implementation_reports/WHATSAPP_BOT_RESERVATION_PROBLEME_FIXES_REPORT.md` - Fixes Report

5. **Technische Dokumentation:**
   - `docs/technical/WHATSAPP_AI_KONFIGURATION.md` - KI-Konfiguration
   - `docs/user/WHATSAPP_BOT_NUTZUNG_ANLEITUNG.md` - Nutzungsanleitung

---

## 🔍 Historie-Analyse: Warum treten Probleme immer wieder auf?

### Problem 1: Context-Verlust

**Historie:**
- **2025-01-26:** Problem identifiziert in `WHATSAPP_BOT_PROBLEME_DETAILLIERTE_ANALYSE.md`
- **2025-12-15:** Problem wieder aufgetreten → `WHATSAPP_BOT_RESERVATION_PROBLEME_FIXES_PLAN.md`
- **2025-12-16:** Problem wieder aufgetreten → `WHATSAPP_BOT_CONTEXT_VERLUST_FIXES_PLAN.md`

**Ursache:**
- Context wird in verschiedenen Stellen unterschiedlich gespeichert
- Keine zentrale Context-Management-Klasse
- Parsing-Logik ist über mehrere Dateien verteilt
- Keine Standardisierung für Context-Struktur

### Problem 2: Parsing-Fehler ("morgen", "heute", etc.)

**Historie:**
- **2025-01-26:** Problem identifiziert (Datum-Parsing)
- **2025-12-15:** Problem wieder aufgetreten (Name-Parsing: "ist Patrick Ammann")
- **2025-12-16:** Problem wieder aufgetreten ("morgen" wird nicht geparst)

**Ursache:**
- Parsing-Logik ist in `whatsappMessageHandler.ts` verstreut
- Keine zentrale Parsing-Service-Klasse
- Verschiedene Patterns für ähnliche Probleme
- Keine Wiederverwendbarkeit

### Problem 3: Sprach-Erkennung inkonsistent

**Historie:**
- **2025-01-26:** Problem identifiziert (DE/CH → falsche Sprache)
- **2025-12-15:** Fix implementiert (Sprache aus Nachricht)
- **2025-12-16:** Problem wieder aufgetreten (Sprachwechsel)

**Ursache:**
- Sprache wird an verschiedenen Stellen unterschiedlich erkannt
- Keine zentrale Sprach-Management-Klasse
- Context speichert Sprache nicht konsistent
- Keine Standardisierung

### Problem 4: System Prompt wird immer länger

**Historie:**
- **2025-01-26:** System Prompt erweitert
- **2025-12-15:** System Prompt erweitert (Name-Bereinigung, Datumsbestätigung)
- **2025-12-16:** System Prompt erweitert (Context-Prüfung)

**Ursache:**
- System Prompt wird ad-hoc erweitert
- Keine strukturierte Prompt-Architektur
- Keine Wiederverwendbarkeit für verschiedene Kanäle
- Keine Standardisierung

---

## 🎯 Systematische Lösung: Refactoring zu sauberer Architektur

### Architektur-Prinzipien

1. **Separation of Concerns:**
   - **Message Handler:** Nur Routing und Orchestrierung
   - **Parsing Service:** Zentrale Parsing-Logik
   - **Context Service:** Zentrale Context-Verwaltung
   - **Language Service:** Zentrale Sprach-Erkennung
   - **AI Service:** Nur KI-Integration, keine Business-Logik

2. **Single Responsibility:**
   - Jede Klasse hat eine klare Verantwortung
   - Keine Code-Duplikation
   - Wiederverwendbare Services

3. **Dependency Injection:**
   - Services sind unabhängig voneinander
   - Testbar und austauschbar
   - Wiederverwendbar für verschiedene Kanäle

4. **Standardisierung:**
   - Einheitliche Patterns für alle Kanäle
   - Einheitliche Context-Struktur
   - Einheitliche Parsing-Logik

---

## 📐 Neue Architektur-Struktur

### 1. Message Processing Layer (Channel-agnostisch)

```
MessageProcessor (Abstract Base Class)
├── WhatsAppMessageProcessor (extends MessageProcessor)
├── EmailMessageProcessor (extends MessageProcessor)
├── InstagramMessageProcessor (extends MessageProcessor)
└── FacebookMessageProcessor (extends MessageProcessor)
```

**Verantwortung:**
- Nachricht empfangen
- Channel-spezifische Normalisierung
- Weiterleitung an Core Services

### 2. Core Services (Channel-agnostisch)

```
ChatbotCoreServices
├── MessageParserService
│   ├── DateParser
│   ├── NameParser
│   ├── RoomParser
│   └── IntentParser
├── ContextService
│   ├── ContextStorage
│   ├── ContextRetrieval
│   └── ContextValidation
├── LanguageService
│   ├── LanguageDetection
│   ├── LanguageConsistency
│   └── LanguageContext
└── ConversationService
    ├── StateManagement
    ├── FlowControl
    └── ResponseGeneration
```

**Verantwortung:**
- Zentrale Business-Logik
- Wiederverwendbar für alle Kanäle
- Testbar und austauschbar

### 3. AI Integration Layer

```
AIService (Abstract Base Class)
├── OpenAIService (extends AIService)
│   ├── PromptBuilder
│   ├── FunctionCalling
│   └── ResponseGeneration
└── AlternativeAIService (extends AIService)
```

**Verantwortung:**
- KI-Integration
- Prompt-Management
- Function Calling

### 4. Function Handlers (Business Logic)

```
FunctionHandlers
├── ReservationHandlers
│   ├── CheckAvailability
│   ├── CreateReservation
│   └── UpdateReservation
├── GuestHandlers
│   ├── GetCode
│   ├── GetStatus
│   └── SendLinks
└── EmployeeHandlers
    ├── GetRequests
    ├── GetTodos
    └── GetWorktime
```

**Verantwortung:**
- Business-Logik für Functions
- Datenbank-Interaktionen
- API-Integrationen

---

## 🔧 Refactoring-Schritte

### Phase 1: Core Services extrahieren (KRITISCH)

**Ziel:** Zentrale Services erstellen, die von allen Kanälen verwendet werden können

#### 1.1 MessageParserService erstellen

**Datei:** `backend/src/services/chatbot/MessageParserService.ts`

**Verantwortung:**
- Zentrale Parsing-Logik für alle Message-Typen
- Wiederverwendbar für alle Kanäle

**Methoden:**
```typescript
class MessageParserService {
  // Datum-Parsing
  static parseDate(message: string, context?: any): Date | null;
  static parseDateRange(message: string, context?: any): { checkIn: Date, checkOut: Date } | null;
  static parseRelativeDate(message: string): 'today' | 'tomorrow' | 'day after tomorrow' | null;
  
  // Name-Parsing
  static parseName(message: string): string | null;
  static cleanName(name: string): string;
  
  // Room-Parsing
  static parseRoomName(message: string, availableRooms?: any[]): { roomName: string, categoryId: number } | null;
  
  // Intent-Parsing
  static parseIntent(message: string): 'booking' | 'availability' | 'code' | 'status' | 'other';
}
```

**Migration:**
- Alle Parsing-Logik aus `whatsappMessageHandler.ts` → `MessageParserService`
- Alle Parsing-Logik aus `checkBookingContext()` → `MessageParserService`

#### 1.2 ContextService erstellen

**Datei:** `backend/src/services/chatbot/ContextService.ts`

**Verantwortung:**
- Zentrale Context-Verwaltung
- Standardisierte Context-Struktur
- Wiederverwendbar für alle Kanäle

**Methoden:**
```typescript
class ContextService {
  // Context-Struktur (Standardisiert)
  interface ConversationContext {
    language: string; // IMMER vorhanden
    booking?: {
      checkInDate?: string;
      checkOutDate?: string;
      guestName?: string;
      roomType?: 'compartida' | 'privada';
      categoryId?: number;
      roomName?: string;
      lastAvailabilityCheck?: any;
    };
    // Weitere Context-Typen...
  }
  
  // Context-Management
  static async getContext(conversationId: number): Promise<ConversationContext>;
  static async updateContext(conversationId: number, updates: Partial<ConversationContext>): Promise<void>;
  static async clearContext(conversationId: number): Promise<void>;
  
  // Context-Validierung
  static hasAllBookingInfo(context: ConversationContext): boolean;
  static hasAllTourInfo(context: ConversationContext): boolean;
}
```

**Migration:**
- Context-Struktur standardisieren
- Alle Context-Zugriffe über `ContextService`
- Context-Validierung zentralisieren

#### 1.3 LanguageService erweitern

**Datei:** `backend/src/services/chatbot/LanguageService.ts`

**Verantwortung:**
- Zentrale Sprach-Erkennung
- Sprach-Konsistenz über Conversation
- Wiederverwendbar für alle Kanäle

**Methoden:**
```typescript
class LanguageService {
  // Sprach-Erkennung
  static detectLanguage(message: string, phoneNumber?: string, context?: any): string;
  
  // Sprach-Konsistenz
  static async ensureLanguageConsistency(conversationId: number, detectedLanguage: string): Promise<string>;
  static async getLanguageFromContext(conversationId: number): Promise<string | null>;
  
  // Sprach-Context
  static async saveLanguageToContext(conversationId: number, language: string): Promise<void>;
}
```

**Migration:**
- Alle Sprach-Erkennung über `LanguageService`
- Sprache immer im Context speichern
- Sprach-Konsistenz über Conversation sicherstellen

### Phase 2: WhatsApp-spezifische Schicht refactoren

**Ziel:** WhatsApp-spezifische Logik von Core Services trennen

#### 2.1 WhatsAppMessageHandler refactoren

**Datei:** `backend/src/services/whatsapp/whatsappMessageHandler.ts`

**Neue Struktur:**
```typescript
class WhatsAppMessageHandler {
  // Nur WhatsApp-spezifische Logik
  static async handleIncomingMessage(
    phoneNumber: string,
    messageText: string,
    branchId: number,
    mediaUrl?: string,
    groupId?: string
  ): Promise<string> {
    // 1. Normalisiere Nachricht (WhatsApp-spezifisch)
    const normalizedMessage = this.normalizeWhatsAppMessage(messageText);
    
    // 2. Verwende Core Services
    const language = await LanguageService.ensureLanguageConsistency(conversationId, 
      LanguageService.detectLanguage(normalizedMessage, phoneNumber));
    
    const context = await ContextService.getContext(conversationId);
    
    const parsedData = MessageParserService.parseMessage(normalizedMessage, context);
    
    // 3. Business-Logik (Core Services)
    const response = await ConversationService.processMessage(
      normalizedMessage,
      parsedData,
      context,
      language,
      conversationId
    );
    
    // 4. WhatsApp-spezifische Antwort-Formatierung
    return this.formatWhatsAppResponse(response);
  }
}
```

**Migration:**
- Business-Logik → Core Services
- Nur WhatsApp-spezifische Logik bleibt
- Verwendet Core Services

### Phase 3: System Prompt standardisieren

**Ziel:** Strukturierte Prompt-Architektur statt ad-hoc Erweiterungen

#### 3.1 PromptBuilder erstellen

**Datei:** `backend/src/services/chatbot/PromptBuilder.ts`

**Verantwortung:**
- Strukturierte Prompt-Erstellung
- Wiederverwendbar für verschiedene Kanäle
- Modulare Prompt-Komponenten

**Struktur:**
```typescript
class PromptBuilder {
  // Basis-Prompt (immer vorhanden)
  private basePrompt: string;
  
  // Modulare Komponenten
  private contextInstructions: string;
  private parsingInstructions: string;
  private functionInstructions: string;
  private languageInstructions: string;
  
  // Prompt-Erstellung
  buildPrompt(language: string, context?: any, channel?: string): string {
    return [
      this.basePrompt,
      this.contextInstructions,
      this.parsingInstructions,
      this.functionInstructions,
      this.languageInstructions,
      this.getChannelSpecificInstructions(channel)
    ].join('\n\n');
  }
  
  // Dynamische Erweiterungen (statt ad-hoc)
  addContextInstructions(context: any): void;
  addParsingInstructions(parsedData: any): void;
  addFunctionInstructions(functions: any[]): void;
}
```

**Migration:**
- System Prompt in modulare Komponenten aufteilen
- Ad-hoc Erweiterungen → strukturierte Komponenten
- Wiederverwendbar für verschiedene Kanäle

---

## 📊 Vergleich: Vorher vs. Nachher

### Vorher (Aktuell):

```
whatsappMessageHandler.ts (2000+ Zeilen)
├── Parsing-Logik (verstreut)
├── Context-Management (verstreut)
├── Sprach-Erkennung (verstreut)
├── Business-Logik (verstreut)
└── WhatsApp-spezifische Logik (vermischt)
```

**Probleme:**
- ❌ Code-Duplikation
- ❌ Inkonsistente Patterns
- ❌ Nicht wiederverwendbar
- ❌ Schwer testbar
- ❌ Probleme treten immer wieder auf

### Nachher (Refactored):

```
Core Services (Channel-agnostisch)
├── MessageParserService (zentral, wiederverwendbar)
├── ContextService (zentral, standardisiert)
├── LanguageService (zentral, konsistent)
└── ConversationService (zentral, strukturiert)

WhatsApp Layer (Channel-spezifisch)
└── WhatsAppMessageHandler (nur WhatsApp-spezifische Logik)

AI Layer
└── PromptBuilder (strukturiert, modular)
```

**Vorteile:**
- ✅ Keine Code-Duplikation
- ✅ Konsistente Patterns
- ✅ Wiederverwendbar für alle Kanäle
- ✅ Testbar und wartbar
- ✅ Probleme werden systematisch verhindert

---

## 🎯 Implementierungsreihenfolge

### Phase 1: Core Services (KRITISCH - Verhindert zukünftige Probleme)

1. **MessageParserService** erstellen
   - Alle Parsing-Logik migrieren
   - Standardisierte Patterns
   - Wiederverwendbar

2. **ContextService** erstellen
   - Context-Struktur standardisieren
   - Context-Management zentralisieren
   - Wiederverwendbar

3. **LanguageService** erweitern
   - Sprach-Konsistenz sicherstellen
   - Wiederverwendbar

### Phase 2: WhatsApp-Refactoring

4. **WhatsAppMessageHandler** refactoren
   - Business-Logik → Core Services
   - Nur WhatsApp-spezifische Logik bleibt

### Phase 3: Prompt-Standardisierung

5. **PromptBuilder** erstellen
   - Strukturierte Prompt-Architektur
   - Modulare Komponenten

### Phase 4: Testing & Validation

6. **Tests** schreiben
   - Core Services testen
   - Integration-Tests
   - Regression-Tests

---

## 📋 Konkrete Migration-Schritte

### Schritt 1: MessageParserService erstellen

**Datei:** `backend/src/services/chatbot/MessageParserService.ts`

**Code-Struktur:**
```typescript
export class MessageParserService {
  // Datum-Parsing (zentralisiert)
  static parseDate(message: string, context?: any): Date | null {
    // Alle Datum-Parsing-Logik hier
    // - "morgen", "tomorrow", "mañana"
    // - "heute", "today", "hoy"
    // - "17.12.25", "17/12/25", etc.
  }
  
  // Name-Parsing (zentralisiert)
  static parseName(message: string): string | null {
    // Alle Name-Parsing-Logik hier
    // - "ist Patrick Ammann" → "Patrick Ammann"
    // - "mit Patrick Ammann" → "Patrick Ammann"
    // - "für Patrick Ammann" → "Patrick Ammann"
  }
  
  // Room-Parsing (zentralisiert)
  static parseRoom(message: string, availableRooms?: any[]): { roomName: string, categoryId: number } | null {
    // Alle Room-Parsing-Logik hier
  }
}
```

**Migration:**
- Zeile 1677-1740 aus `whatsappMessageHandler.ts` → `MessageParserService.parseDate()`
- Zeile 1710-1740 aus `whatsappMessageHandler.ts` → `MessageParserService.parseName()`
- Zeile 1749-1890 aus `whatsappMessageHandler.ts` → `MessageParserService.parseRoom()`

### Schritt 2: ContextService erstellen

**Datei:** `backend/src/services/chatbot/ContextService.ts`

**Code-Struktur:**
```typescript
export class ContextService {
  // Standardisierte Context-Struktur
  interface ConversationContext {
    language: string; // IMMER vorhanden
    booking?: BookingContext;
    // Weitere Context-Typen...
  }
  
  // Context-Management
  static async getContext(conversationId: number): Promise<ConversationContext> {
    const conversation = await prisma.whatsAppConversation.findUnique({
      where: { id: conversationId }
    });
    return (conversation?.context as ConversationContext) || { language: 'es' };
  }
  
  static async updateContext(conversationId: number, updates: Partial<ConversationContext>): Promise<void> {
    const currentContext = await this.getContext(conversationId);
    const updatedContext = { ...currentContext, ...updates };
    
    await prisma.whatsAppConversation.update({
      where: { id: conversationId },
      data: { context: updatedContext }
    });
  }
  
  // Context-Validierung
  static hasAllBookingInfo(context: ConversationContext): boolean {
    const booking = context.booking;
    return !!(
      booking?.checkInDate &&
      booking?.checkOutDate &&
      booking?.roomType &&
      (booking?.categoryId || !booking?.roomName)
    );
  }
}
```

**Migration:**
- Zeile 1909-1928 aus `whatsappMessageHandler.ts` → `ContextService.updateContext()`
- Zeile 1955-1959 aus `whatsappMessageHandler.ts` → `ContextService.hasAllBookingInfo()`

### Schritt 3: LanguageService erweitern

**Datei:** `backend/src/services/chatbot/LanguageService.ts`

**Code-Struktur:**
```typescript
export class LanguageService {
  // Sprach-Erkennung (zentralisiert)
  static detectLanguage(message: string, phoneNumber?: string, context?: any): string {
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
  
  // Sprach-Konsistenz (NEU)
  static async ensureLanguageConsistency(conversationId: number, detectedLanguage: string): Promise<string> {
    const context = await ContextService.getContext(conversationId);
    
    // Wenn Sprache bereits im Context, verwende diese
    if (context.language) {
      return context.language;
    }
    
    // Sonst: Speichere erkannte Sprache
    await ContextService.updateContext(conversationId, { language: detectedLanguage });
    return detectedLanguage;
  }
}
```

**Migration:**
- Zeile 137-148 aus `whatsappAiService.ts` → `LanguageService.detectLanguage()`
- Neue Methode: `ensureLanguageConsistency()` für Sprach-Konsistenz

---

## ✅ Erfolgs-Kriterien

### Nach Refactoring:

1. **Keine Code-Duplikation:**
   - Parsing-Logik nur in `MessageParserService`
   - Context-Management nur in `ContextService`
   - Sprach-Erkennung nur in `LanguageService`

2. **Wiederverwendbarkeit:**
   - Core Services können für Email, Instagram, Facebook, Twitter verwendet werden
   - Nur Channel-spezifische Schicht muss neu implementiert werden

3. **Standardisierung:**
   - Einheitliche Context-Struktur
   - Einheitliche Parsing-Patterns
   - Einheitliche Sprach-Erkennung

4. **Wartbarkeit:**
   - Änderungen an Parsing-Logik → nur `MessageParserService`
   - Änderungen an Context → nur `ContextService`
   - Änderungen an Sprach-Erkennung → nur `LanguageService`

5. **Testbarkeit:**
   - Core Services sind unabhängig testbar
   - Mocking einfach möglich
   - Integration-Tests möglich

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

### Risiko 3: Komplexität

**Mitigation:**
- Klare Verantwortlichkeiten
- Gute Dokumentation
- Code-Reviews

---

## 📅 Zeitplan

### Phase 1: Core Services (1-2 Wochen)
- MessageParserService
- ContextService
- LanguageService

### Phase 2: WhatsApp-Refactoring (1 Woche)
- WhatsAppMessageHandler refactoren
- Alte Code-Pfade migrieren

### Phase 3: Prompt-Standardisierung (1 Woche)
- PromptBuilder erstellen
- System Prompt modularisieren

### Phase 4: Testing & Validation (1 Woche)
- Tests schreiben
- Integration-Tests
- Regression-Tests

**Gesamt:** 4-5 Wochen

---

## 🎯 Nächste Schritte

1. **Sofort:** Core Services erstellen (verhindert zukünftige Probleme)
2. **Parallel:** Context-Verlust-Fixes implementieren (mit neuen Core Services)
3. **Danach:** WhatsApp-Refactoring (schrittweise Migration)

---

**Erstellt:** 2025-12-16  
**Status:** ✅ Plan erstellt, bereit für Implementierung  
**Priorität:** KRITISCH - Verhindert zukünftige Probleme

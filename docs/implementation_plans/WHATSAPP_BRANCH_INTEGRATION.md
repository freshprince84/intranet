# WhatsApp-Integration pro Standort mit KI-Antworten und Keyword-Erkennung

## Überblick

Implementierung einer WhatsApp-Integration, die pro Standort (Branch) funktioniert und folgende Features bietet:
- WhatsApp-Integration pro Standort (aktuell nur pro Organisation) - **MIGRATION ERFORDERLICH**
- **Mehrere Branches können dieselbe WhatsApp-Nummer verwenden** (Phone Number ID Mapping)
- KI-Antworten basierend auf Landesvorwahl der Telefonnummer (OpenAI GPT-4o)
- Keyword-basierte API-Aufrufe ("requests", "to do's")
- Interaktive Request/Task-Erstellung via WhatsApp
- Telefonnummer im User-Profil speichern
- **Konfigurierbare KI-Prompts/Regeln/Quellen pro Branch**

## Aktueller Stand

### Bereits vorhanden:
- ✅ WhatsApp Service (`whatsappService.ts`) - funktioniert pro Organisation
- ✅ WhatsApp Webhook Controller (`whatsappController.ts`) - verarbeitet nur LobbyPMS Reservierungen
- ✅ Branch-Model existiert mit `organizationId` Verknüpfung
- ✅ Request- und Task-APIs existieren
- ✅ User-Model hat `country` und `language` Felder
- ✅ OpenAI GPT-4o bereits im Projekt verwendet (Dokumentenerkennung)
- ✅ Branch "Manila" existiert in Organisation 1

### Bestehende WhatsApp-Verwendung:
- `sendMessage()` - in `whatsappService.ts`
- `sendCheckInInvitation()` - in `reservationNotificationService.ts`
- `sendCheckInConfirmation()` - in `reservationNotificationService.ts`
- Verwendet in: `reservationController.ts`, `boldPaymentService.ts`, `lobbyPmsController.ts`

### Fehlend:
- ❌ `phoneNumber` Feld im User-Model
- ❌ WhatsApp Settings pro Branch (aktuell nur pro Organisation)
- ❌ **Migration der bestehenden WhatsApp Settings von Organization zu Branch "Manila"**
- ❌ Keyword-Erkennung im Webhook
- ❌ KI-Antworten basierend auf Landesvorwahl
- ❌ Interaktive Request/Task-Erstellung
- ❌ User-Identifikation via Telefonnummer
- ❌ **KI-Service mit konfigurierbaren Prompts/Regeln/Quellen**

## Implementierungsplan

### Phase 0: Migration der bestehenden WhatsApp Settings

**WICHTIG**: Diese Phase muss ZUERST durchgeführt werden, damit bestehende Funktionalität erhalten bleibt!

#### 0.1 Datenbankschema: Branch WhatsApp Settings hinzufügen
**Datei**: `backend/prisma/schema.prisma`

```prisma
model Branch {
  // ... bestehende Felder ...
  whatsappSettings Json? // WhatsApp-Konfiguration pro Branch
  whatsappConversations WhatsAppConversation[]
}
```

**Migration erstellen**:
```bash
npx prisma migrate dev --name add_whatsapp_settings_to_branch
```

#### 0.2 Migrations-Script: WhatsApp Settings von Organization zu Branch "Manila"
**Neue Datei**: `backend/scripts/migrate-whatsapp-to-branch.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function migrateWhatsAppSettings() {
  try {
    console.log('🚀 Migriere WhatsApp Settings von Organization zu Branch "Manila"...\n');

    // 1. Lade Organisation 1
    const organization = await prisma.organization.findUnique({
      where: { id: 1 },
      select: {
        id: true,
        name: true,
        displayName: true,
        settings: true
      }
    });

    if (!organization) {
      throw new Error('Organisation 1 nicht gefunden!');
    }

    console.log(`✅ Organisation gefunden: ${organization.displayName}`);

    // 2. Lade Branch "Manila" in Organisation 1
    const branch = await prisma.branch.findFirst({
      where: {
        name: 'Manila',
        organizationId: 1
      }
    });

    if (!branch) {
      throw new Error('Branch "Manila" in Organisation 1 nicht gefunden!');
    }

    console.log(`✅ Branch gefunden: ${branch.name} (ID: ${branch.id})`);

    // 3. Extrahiere WhatsApp Settings aus Organization
    const orgSettings = organization.settings as any;
    const whatsappSettings = orgSettings?.whatsapp;

    if (!whatsappSettings || !whatsappSettings.apiKey) {
      console.log('⚠️  Keine WhatsApp Settings in Organisation gefunden. Überspringe Migration.');
      return;
    }

    console.log(`✅ WhatsApp Settings gefunden in Organisation:`);
    console.log(`   - Provider: ${whatsappSettings.provider}`);
    console.log(`   - Phone Number ID: ${whatsappSettings.phoneNumberId}`);
    console.log(`   - API Key vorhanden: ${!!whatsappSettings.apiKey}`);

    // 4. Speichere WhatsApp Settings in Branch
    await prisma.branch.update({
      where: { id: branch.id },
      data: {
        whatsappSettings: {
          provider: whatsappSettings.provider,
          apiKey: whatsappSettings.apiKey,
          apiSecret: whatsappSettings.apiSecret,
          phoneNumberId: whatsappSettings.phoneNumberId,
          businessAccountId: whatsappSettings.businessAccountId
        }
      }
    });

    console.log(`\n✅ WhatsApp Settings erfolgreich zu Branch "Manila" migriert!`);
    console.log(`\n⚠️  WICHTIG: Prüfe nach Migration, ob alles funktioniert!`);
    console.log(`   - Bestehende WhatsApp-Funktionalität sollte weiterhin funktionieren`);
    console.log(`   - Settings sind jetzt in Branch statt Organization`);

  } catch (error) {
    console.error('❌ Fehler bei Migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateWhatsAppSettings();
```

**Ausführen**:
```bash
cd backend
npx ts-node scripts/migrate-whatsapp-to-branch.ts
```

#### 0.3 WhatsApp Service: Branch-Unterstützung hinzufügen (Rückwärtskompatibel)
**Datei**: `backend/src/services/whatsappService.ts`

**Änderungen**:
- Constructor akzeptiert jetzt `branchId` ODER `organizationId`
- `loadSettings()` prüft zuerst Branch, dann Organization (Fallback)
- **Bestehende Aufrufe mit `organizationId` funktionieren weiterhin**

```typescript
export class WhatsAppService {
  private organizationId?: number;
  private branchId?: number;
  // ... bestehende Felder ...

  constructor(organizationId?: number, branchId?: number) {
    if (!organizationId && !branchId) {
      throw new Error('Entweder organizationId oder branchId muss angegeben werden');
    }
    this.organizationId = organizationId;
    this.branchId = branchId;
  }

  private async loadSettings(): Promise<void> {
    // 1. Versuche Branch Settings zu laden
    if (this.branchId) {
      const branch = await prisma.branch.findUnique({
        where: { id: this.branchId },
        select: { whatsappSettings: true, organizationId: true }
      });

      if (branch?.whatsappSettings) {
        // Branch hat eigene WhatsApp Settings
        const settings = branch.whatsappSettings as any;
        this.provider = settings.provider || 'twilio';
        this.apiKey = settings.apiKey;
        this.apiSecret = settings.apiSecret;
        this.phoneNumberId = settings.phoneNumberId;
        this.businessAccountId = settings.businessAccountId;
        this.axiosInstance = this.createAxiosInstance();
        return;
      }

      // Fallback: Lade Organization Settings
      if (branch?.organizationId) {
        this.organizationId = branch.organizationId;
      }
    }

    // 2. Lade Organization Settings (Fallback oder wenn nur organizationId)
    if (this.organizationId) {
      const organization = await prisma.organization.findUnique({
        where: { id: this.organizationId },
        select: { settings: true }
      });

      if (organization?.settings) {
        const settings = decryptApiSettings(organization.settings as any);
        const whatsappSettings = settings?.whatsapp;
        // ... bestehende Logik ...
      }
    }

    throw new Error('WhatsApp Settings nicht gefunden');
  }

  /**
   * Statische Methode: Erstellt Service für Branch
   */
  static async getServiceForBranch(branchId: number): Promise<WhatsAppService> {
    const service = new WhatsAppService(undefined, branchId);
    await service.loadSettings();
    return service;
  }

  /**
   * Statische Methode: Erstellt Service für Organization (Rückwärtskompatibel)
   */
  static async getServiceForOrganization(organizationId: number): Promise<WhatsAppService> {
    const service = new WhatsAppService(organizationId);
    await service.loadSettings();
    return service;
  }
}
```

#### 0.4 Bestehende Aufrufe anpassen (schrittweise)
**Dateien zu aktualisieren**:
- `backend/src/services/reservationNotificationService.ts`
- `backend/src/controllers/reservationController.ts`
- `backend/src/services/boldPaymentService.ts`
- `backend/src/controllers/lobbyPmsController.ts`

**Strategie**: 
- Schritt 1: Alle Aufrufe auf `getServiceForBranch()` umstellen (mit branchId aus Reservation)
- Schritt 2: Testen, ob alles funktioniert
- Schritt 3: Alte `organizationId`-Aufrufe entfernen

**Beispiel**:
```typescript
// ALT:
const whatsappService = new WhatsAppService(organizationId);
await whatsappService.sendMessage(...);

// NEU:
const whatsappService = await WhatsAppService.getServiceForBranch(branchId);
await whatsappService.sendMessage(...);
```

### Phase 1: Datenbankschema-Erweiterungen

#### 1.1 User-Model: phoneNumber hinzufügen
**Datei**: `backend/prisma/schema.prisma`

```prisma
model User {
  // ... bestehende Felder ...
  phoneNumber String? // WhatsApp-Telefonnummer (mit Ländercode, z.B. +573001234567)
  whatsappConversations WhatsAppConversation[]
}
```

**Migration erstellen**:
```bash
npx prisma migrate dev --name add_phone_number_to_user
```

#### 1.2 Phone Number ID Mapping (für mehrere Branches mit derselben Nummer)
**Neue Tabelle**: `WhatsAppPhoneNumberMapping`

```prisma
model WhatsAppPhoneNumberMapping {
  id              Int       @id @default(autoincrement())
  phoneNumberId   String    // WhatsApp Business API Phone Number ID
  branchId        Int       // Branch, der diese Nummer verwendet
  isPrimary       Boolean   @default(false) // Primäre Nummer für diesen Branch
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  branch          Branch    @relation(fields: [branchId], references: [id])

  @@unique([phoneNumberId, branchId])
  @@index([phoneNumberId])
  @@index([branchId])
}
```

**Relation hinzufügen**:
- `Branch.phoneNumberMappings`

**Migration erstellen**:
```bash
npx prisma migrate dev --name add_whatsapp_phone_number_mapping
```

**Verwendung**:
- Mehrere Branches können dieselbe `phoneNumberId` verwenden
- Webhook identifiziert Branch via `phoneNumberId` → Mapping → Branch

#### 1.3 WhatsApp Conversation State Management
**Neue Tabelle**: `WhatsAppConversation`

```prisma
model WhatsAppConversation {
  id              Int       @id @default(autoincrement())
  phoneNumber     String    // Telefonnummer des Users (mit Ländercode)
  userId          Int?      // User-ID (falls identifiziert)
  branchId        Int       // Branch, zu dem die Konversation gehört
  state           String    // "idle", "request_creation", "task_creation", "waiting_for_responsible", etc.
  context         Json?     // Kontext-Daten (z.B. teilweise erstellter Request)
  lastMessageAt   DateTime  @default(now())
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  branch          Branch    @relation(fields: [branchId], references: [id])
  user            User?     @relation(fields: [userId], references: [id])

  @@unique([phoneNumber, branchId])
  @@index([phoneNumber])
  @@index([branchId])
  @@index([userId])
}
```

**Migration erstellen**:
```bash
npx prisma migrate dev --name add_whatsapp_conversation
```

#### 1.4 Branch KI-Konfiguration
**Erweitere Branch.whatsappSettings JSON**:

```typescript
interface BranchWhatsAppSettings {
  provider?: 'twilio' | 'whatsapp-business-api';
  apiKey?: string;
  apiSecret?: string;
  phoneNumberId?: string;
  businessAccountId?: string;
  
  // NEU: KI-Konfiguration
  ai?: {
    enabled?: boolean;
    model?: string; // "gpt-4o", "gpt-4", etc.
    systemPrompt?: string; // Basis-System-Prompt
    rules?: string[]; // Array von Regeln/Anweisungen
    sources?: string[]; // Array von Quellen/URLs für Context
    temperature?: number; // 0.0 - 2.0
    maxTokens?: number;
  };
}
```

**Beispiel**:
```json
{
  "provider": "whatsapp-business-api",
  "apiKey": "...",
  "phoneNumberId": "...",
  "ai": {
    "enabled": true,
    "model": "gpt-4o",
    "systemPrompt": "Du bist ein hilfreicher Assistent für La Familia Hostel in Manila. Du hilfst Mitarbeitern bei Fragen zu Requests, Tasks und allgemeinen Anfragen.",
    "rules": [
      "Antworte immer auf Spanisch, es sei denn der User fragt auf Deutsch oder Englisch",
      "Sei freundlich und professionell",
      "Wenn du eine Frage nicht beantworten kannst, verweise auf den Administrator"
    ],
    "sources": [
      "https://wiki.example.com/manila-procedures",
      "https://wiki.example.com/faq"
    ],
    "temperature": 0.7,
    "maxTokens": 500
  }
}
```

### Phase 2: Backend-Implementierung

#### 2.1 WhatsApp AI Service
**Neue Datei**: `backend/src/services/whatsappAiService.ts`

```typescript
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { decryptApiSettings } from '../utils/encryption';

const prisma = new PrismaClient();

export interface AIResponse {
  message: string;
  language: string;
}

export class WhatsAppAiService {
  /**
   * Generiert KI-Antwort basierend auf Nachricht und Branch-Konfiguration
   */
  static async generateResponse(
    message: string,
    branchId: number,
    phoneNumber: string,
    conversationContext?: any
  ): Promise<AIResponse> {
    // 1. Lade Branch und KI-Konfiguration
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { whatsappSettings: true }
    });

    if (!branch?.whatsappSettings) {
      throw new Error('Branch WhatsApp Settings nicht gefunden');
    }

    const settings = branch.whatsappSettings as any;
    const aiConfig = settings.ai;

    if (!aiConfig?.enabled) {
      throw new Error('KI ist für diesen Branch nicht aktiviert');
    }

    // 2. Erkenne Sprache aus Telefonnummer
    const language = LanguageDetectionService.detectLanguageFromPhoneNumber(phoneNumber);

    // 3. Baue System Prompt
    const systemPrompt = this.buildSystemPrompt(aiConfig, language, conversationContext);

    // 4. Rufe OpenAI API auf
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY nicht gesetzt');
    }

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: aiConfig.model || 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: aiConfig.temperature || 0.7,
        max_tokens: aiConfig.maxTokens || 500
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        }
      }
    );

    const aiMessage = response.data.choices[0].message.content;

    return {
      message: aiMessage,
      language
    };
  }

  /**
   * Baut System Prompt aus Konfiguration
   */
  private static buildSystemPrompt(
    aiConfig: any,
    language: string,
    conversationContext?: any
  ): string {
    let prompt = aiConfig.systemPrompt || 'Du bist ein hilfreicher Assistent.';

    // Füge Regeln hinzu
    if (aiConfig.rules && aiConfig.rules.length > 0) {
      prompt += '\n\nRegeln:\n';
      aiConfig.rules.forEach((rule: string, index: number) => {
        prompt += `${index + 1}. ${rule}\n`;
      });
    }

    // Füge Sprachanweisung hinzu
    const languageInstructions: Record<string, string> = {
      es: 'Antworte auf Spanisch.',
      de: 'Antworte auf Deutsch.',
      en: 'Answer in English.'
    };
    prompt += `\n${languageInstructions[language] || languageInstructions.es}`;

    // Füge Context hinzu (falls vorhanden)
    if (conversationContext) {
      prompt += `\n\nKontext: ${JSON.stringify(conversationContext)}`;
    }

    return prompt;
  }
}
```

#### 2.2 Language Detection Service
**Neue Datei**: `backend/src/services/languageDetectionService.ts`

```typescript
export class LanguageDetectionService {
  /**
   * Erkennt Sprache basierend auf Landesvorwahl
   */
  static detectLanguageFromPhoneNumber(phoneNumber: string): string {
    const countryCodeMap: Record<string, string> = {
      '57': 'es', // Kolumbien
      '49': 'de', // Deutschland
      '41': 'de', // Schweiz (Standard)
      '1': 'en',  // USA/Kanada
      '34': 'es', // Spanien
      '33': 'fr', // Frankreich
      '39': 'it', // Italien
      '44': 'en', // UK
    };
    
    const normalized = phoneNumber.replace(/[\s-]/g, '');
    if (normalized.startsWith('+')) {
      for (let len = 3; len >= 1; len--) {
        const code = normalized.substring(1, 1 + len);
        if (countryCodeMap[code]) {
          return countryCodeMap[code];
        }
      }
    }
    
    return 'es'; // Fallback
  }
}
```

#### 2.3 WhatsApp Message Handler Service
**Neue Datei**: `backend/src/services/whatsappMessageHandler.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import { WhatsAppAiService } from './whatsappAiService';
import { LanguageDetectionService } from './languageDetectionService';

const prisma = new PrismaClient();

export class WhatsAppMessageHandler {
  /**
   * Verarbeitet eingehende WhatsApp-Nachricht
   */
  static async handleIncomingMessage(
    phoneNumber: string,
    messageText: string,
    branchId: number,
    mediaUrl?: string
  ): Promise<string> {
    // 1. Identifiziere User via phoneNumber
    const user = await this.identifyUser(phoneNumber, branchId);

    // 2. Lade/Erstelle Conversation State
    const conversation = await this.getOrCreateConversation(phoneNumber, branchId, user?.id);

    // 3. Prüfe Keywords
    const normalizedText = messageText.toLowerCase().trim();
    
    if (normalizedText === 'requests' || normalizedText === 'request') {
      if (user) {
        return await this.handleRequestsKeyword(user.id, branchId, conversation);
      }
      return await this.getLanguageResponse(branchId, phoneNumber, 'requests_require_auth');
    }

    if (normalizedText === 'todos' || normalizedText === 'to do\'s' || normalizedText === 'todo') {
      if (user) {
        return await this.handleTodosKeyword(user.id, branchId, conversation);
      }
      return await this.getLanguageResponse(branchId, phoneNumber, 'todos_require_auth');
    }

    if (normalizedText === 'request' && conversation.state === 'idle') {
      return await this.startRequestCreation(phoneNumber, branchId, conversation);
    }

    if (normalizedText === 'todo' && conversation.state === 'idle') {
      return await this.startTaskCreation(phoneNumber, branchId, conversation);
    }

    // 4. Prüfe Conversation State
    if (conversation.state !== 'idle') {
      return await this.continueConversation(phoneNumber, branchId, messageText, mediaUrl, conversation);
    }

    // 5. KI-Antwort generieren
    try {
      const aiResponse = await WhatsAppAiService.generateResponse(
        messageText,
        branchId,
        phoneNumber,
        { userId: user?.id, conversationState: conversation.state }
      );
      return aiResponse.message;
    } catch (error) {
      console.error('[WhatsApp Message Handler] KI-Fehler:', error);
      return await this.getLanguageResponse(branchId, phoneNumber, 'ai_error');
    }
  }

  /**
   * Identifiziert User via Telefonnummer
   */
  private static async identifyUser(phoneNumber: string, branchId: number): Promise<any | null> {
    // Normalisiere Telefonnummer
    const normalized = phoneNumber.replace(/[\s-]/g, '');
    
    const user = await prisma.user.findFirst({
      where: {
        phoneNumber: normalized,
        branches: {
          some: {
            branchId: branchId
          }
        }
      }
    });

    return user;
  }

  /**
   * Lädt oder erstellt Conversation
   */
  private static async getOrCreateConversation(
    phoneNumber: string,
    branchId: number,
    userId?: number
  ): Promise<any> {
    const normalized = phoneNumber.replace(/[\s-]/g, '');
    
    let conversation = await prisma.whatsAppConversation.findUnique({
      where: {
        phoneNumber_branchId: {
          phoneNumber: normalized,
          branchId: branchId
        }
      }
    });

    if (!conversation) {
      conversation = await prisma.whatsAppConversation.create({
        data: {
          phoneNumber: normalized,
          branchId: branchId,
          userId: userId || null,
          state: 'idle'
        }
      });
    } else {
      // Update lastMessageAt
      conversation = await prisma.whatsAppConversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() }
      });
    }

    return conversation;
  }

  /**
   * Verarbeitet Keyword "requests"
   */
  private static async handleRequestsKeyword(
    userId: number,
    branchId: number,
    conversation: any
  ): Promise<string> {
    const requests = await prisma.request.findMany({
      where: {
        OR: [
          { requesterId: userId },
          { responsibleId: userId }
        ],
        branchId: branchId
      },
      include: {
        requester: { select: { firstName: true, lastName: true } },
        responsible: { select: { firstName: true, lastName: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    const language = LanguageDetectionService.detectLanguageFromPhoneNumber(conversation.phoneNumber);
    
    const translations: Record<string, any> = {
      es: {
        title: 'Tus Requests:',
        none: 'No tienes requests.',
        item: (r: any) => `• ${r.title} (${r.status})`
      },
      de: {
        title: 'Deine Requests:',
        none: 'Du hast keine Requests.',
        item: (r: any) => `• ${r.title} (${r.status})`
      },
      en: {
        title: 'Your Requests:',
        none: 'You have no requests.',
        item: (r: any) => `• ${r.title} (${r.status})`
      }
    };

    const t = translations[language] || translations.es;

    if (requests.length === 0) {
      return t.none;
    }

    let message = t.title + '\n\n';
    requests.forEach(r => {
      message += t.item(r) + '\n';
    });

    return message;
  }

  /**
   * Verarbeitet Keyword "todos"
   */
  private static async handleTodosKeyword(
    userId: number,
    branchId: number,
    conversation: any
  ): Promise<string> {
    const tasks = await prisma.task.findMany({
      where: {
        OR: [
          { responsibleId: userId },
          { qualityControlId: userId }
        ],
        branchId: branchId
      },
      include: {
        responsible: { select: { firstName: true, lastName: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    const language = LanguageDetectionService.detectLanguageFromPhoneNumber(conversation.phoneNumber);
    
    const translations: Record<string, any> = {
      es: {
        title: 'Tus To-Dos:',
        none: 'No tienes to-dos.',
        item: (t: any) => `• ${t.title} (${t.status})`
      },
      de: {
        title: 'Deine To-Dos:',
        none: 'Du hast keine To-Dos.',
        item: (t: any) => `• ${t.title} (${t.status})`
      },
      en: {
        title: 'Your To-Dos:',
        none: 'You have no to-dos.',
        item: (t: any) => `• ${t.title} (${t.status})`
      }
    };

    const t = translations[language] || translations.es;

    if (tasks.length === 0) {
      return t.none;
    }

    let message = t.title + '\n\n';
    tasks.forEach(task => {
      message += t.item(task) + '\n';
    });

    return message;
  }

  /**
   * Startet Request-Erstellung
   */
  private static async startRequestCreation(
    phoneNumber: string,
    branchId: number,
    conversation: any
  ): Promise<string> {
    // Setze State auf "request_creation"
    await prisma.whatsAppConversation.update({
      where: { id: conversation.id },
      data: {
        state: 'request_creation',
        context: { step: 'waiting_for_responsible' }
      }
    });

    const language = LanguageDetectionService.detectLanguageFromPhoneNumber(phoneNumber);
    
    const translations: Record<string, string> = {
      es: 'Para quién?',
      de: 'Für wen?',
      en: 'For whom?'
    };

    return translations[language] || translations.es;
  }

  /**
   * Startet Task-Erstellung
   */
  private static async startTaskCreation(
    phoneNumber: string,
    branchId: number,
    conversation: any
  ): Promise<string> {
    // Ähnlich wie Request-Erstellung
    // ...
  }

  /**
   * Setzt Conversation fort
   */
  private static async continueConversation(
    phoneNumber: string,
    branchId: number,
    messageText: string,
    mediaUrl: string | undefined,
    conversation: any
  ): Promise<string> {
    // Implementierung für mehrstufige Interaktionen
    // ...
    return 'Not implemented yet';
  }

  /**
   * Holt sprachspezifische Antwort
   */
  private static async getLanguageResponse(
    branchId: number,
    phoneNumber: string,
    key: string
  ): Promise<string> {
    const language = LanguageDetectionService.detectLanguageFromPhoneNumber(phoneNumber);
    
    const responses: Record<string, Record<string, string>> = {
      requests_require_auth: {
        es: 'Debes estar registrado para ver tus requests. Bitte füge deine Telefonnummer zu deinem Profil hinzu.',
        de: 'Du musst registriert sein, um deine Requests zu sehen. Bitte füge deine Telefonnummer zu deinem Profil hinzu.',
        en: 'You must be registered to see your requests. Please add your phone number to your profile.'
      },
      todos_require_auth: {
        es: 'Debes estar registrado para ver tus to-dos.',
        de: 'Du musst registriert sein, um deine To-Dos zu sehen.',
        en: 'You must be registered to see your to-dos.'
      },
      ai_error: {
        es: 'Lo siento, hubo un error al procesar tu mensaje.',
        de: 'Entschuldigung, es gab einen Fehler bei der Verarbeitung deiner Nachricht.',
        en: 'Sorry, there was an error processing your message.'
      }
    };

    return responses[key]?.[language] || responses[key]?.es || 'Error';
  }
}
```

#### 2.4 WhatsApp Webhook Controller erweitern
**Datei**: `backend/src/controllers/whatsappController.ts`

**Änderungen**:
- Branch-Identifikation via Phone Number ID Mapping
- Keyword-Erkennung
- Integration mit `WhatsAppMessageHandler`
- Unterstützung für Bilder/Medien

```typescript
export const handleWebhook = async (req: Request, res: Response) => {
  try {
    // ... bestehende Webhook-Verifizierung ...

    // Eingehende Nachricht
    if (value?.messages?.[0]) {
      const message = value.messages[0];
      const fromNumber = message.from;
      const messageText = message.text?.body || '';
      const mediaUrl = message.image?.id || message.document?.id;
      const phoneNumberId = value.metadata?.phone_number_id;

      // 1. Identifiziere Branch via Phone Number ID
      const branchId = await identifyBranchFromPhoneNumberId(phoneNumberId);

      if (!branchId) {
        console.error('[WhatsApp Webhook] Branch nicht gefunden für Phone Number ID:', phoneNumberId);
        return res.status(200).json({ success: false, error: 'Branch nicht gefunden' });
      }

      // 2. Verarbeite Nachricht
      const response = await WhatsAppMessageHandler.handleIncomingMessage(
        fromNumber,
        messageText,
        branchId,
        mediaUrl
      );

      // 3. Sende Antwort
      const whatsappService = await WhatsAppService.getServiceForBranch(branchId);
      await whatsappService.sendMessage(fromNumber, response);

      return res.status(200).json({ success: true });
    }
  } catch (error) {
    // ... Fehlerbehandlung ...
  }
};

/**
 * Identifiziert Branch via Phone Number ID
 */
async function identifyBranchFromPhoneNumberId(phoneNumberId: string): Promise<number | null> {
  // 1. Prüfe Phone Number Mapping
  const mapping = await prisma.whatsAppPhoneNumberMapping.findFirst({
    where: { phoneNumberId },
    select: { branchId: true }
  });

  if (mapping) {
    return mapping.branchId;
  }

  // 2. Fallback: Suche Branch mit dieser phoneNumberId in Settings
  const branch = await prisma.branch.findFirst({
    where: {
      whatsappSettings: {
        path: ['phoneNumberId'],
        equals: phoneNumberId
      }
    },
    select: { id: true }
  });

  return branch?.id || null;
}
```

### Phase 3: Frontend-Implementierung

#### 3.1 User-Profil: phoneNumber-Feld hinzufügen
**Datei**: `frontend/src/pages/Profile.tsx`

**Änderungen**: Siehe ursprünglicher Plan

#### 3.2 Branch Settings: WhatsApp-Konfiguration
**Neue Komponente**: `frontend/src/components/branch/BranchWhatsAppSettings.tsx`

**Features**:
- WhatsApp Settings pro Branch konfigurieren
- KI-Konfiguration (System Prompt, Regeln, Quellen)
- Test-Nachricht senden

#### 3.3 Übersetzungen hinzufügen
**Dateien**: `frontend/src/i18n/locales/*.json`

### Phase 4: Testing & Dokumentation

#### 4.1 Testing
- Migration testen (bestehende Funktionalität muss weiterhin funktionieren)
- Branch-Identifikation testen
- Keyword-Erkennung testen
- KI-Antworten testen
- Interaktive Request/Task-Erstellung testen

#### 4.2 Dokumentation
- **Neue Datei**: `docs/modules/MODUL_WHATSAPP_BRANCH.md`
- Migration-Anleitung
- Konfiguration pro Branch
- KI-Konfiguration
- Keyword-Referenz

## Wichtige Hinweise

### Migration
- **Phase 0 MUSS zuerst durchgeführt werden**, damit bestehende Funktionalität erhalten bleibt
- Nach Migration: Prüfen, ob alle bestehenden WhatsApp-Aufrufe funktionieren
- Schrittweise Umstellung auf Branch-basierte Aufrufe

### Mehrere Branches mit derselben Nummer
- Phone Number ID Mapping ermöglicht mehrere Branches pro Nummer
- Webhook identifiziert Branch via Mapping
- Jeder Branch kann eigene KI-Konfiguration haben

### KI-Integration
- Verwendet OpenAI GPT-4o (bereits im Projekt)
- Konfigurierbar pro Branch (System Prompt, Regeln, Quellen)
- Sprache wird automatisch aus Telefonnummer erkannt

## Nächste Schritte

1. ✅ Plan erstellen (dieses Dokument)
2. ⏳ Plan vom User bestätigen lassen
3. ⏳ **Phase 0: Migration** (KRITISCH - zuerst!)
4. ⏳ Phase 1: Datenbankschema-Erweiterungen
5. ⏳ Phase 2: Backend-Implementierung
6. ⏳ Phase 3: Frontend-Implementierung
7. ⏳ Phase 4: Testing & Dokumentation

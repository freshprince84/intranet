# LobbyPMS Branch-Migration - Detaillierte Implementierungsplanung

## Status: Vollständige Analyse abgeschlossen ✅

Dieses Dokument enthält die **komplette, detaillierte Analyse** aller betroffenen Komponenten und die exakte Implementierungsplanung für die Migration von Reservierungen von Organisation-basiert zu Branch-basiert.

**Siehe auch:**
- [LOBBYPMS_EMAIL_SERVICE_BRANCH_SUPPORT.md](LOBBYPMS_EMAIL_SERVICE_BRANCH_SUPPORT.md) - Detaillierte Email-Service Branch-Support Implementierung

---

## 1. Datenbank-Schema Änderungen

### 1.1 Reservation Model

**Aktueller Stand:**
```prisma
model Reservation {
  id                       Int
  // ... Felder ...
  organizationId           Int
  organization             Organization @relation(fields: [organizationId], references: [id])
  // ❌ FEHLT: branchId
}
```

**Erforderliche Änderung:**
```prisma
model Reservation {
  id                       Int
  // ... Felder ...
  organizationId           Int
  organization             Organization @relation(fields: [organizationId], references: [id])
  branchId                 Int?                         // NEU: Optional für Rückwärtskompatibilität
  branch                   Branch?                      @relation(fields: [branchId], references: [id])
  
  @@index([organizationId])
  @@index([branchId])                                    // NEU: Index für Branch-Queries
  @@index([checkInDate])
  @@index([status])
  @@index([lobbyReservationId])
}
```

**Migration:**
```sql
-- Migration: add_branch_to_reservation
ALTER TABLE "Reservation" ADD COLUMN "branchId" INTEGER;
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_branchId_fkey" 
  FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Reservation_branchId_idx" ON "Reservation"("branchId");
```

**Wichtig:**
- `branchId` ist **optional** (nullable) für Rückwärtskompatibilität
- Bestehende Reservierungen bleiben ohne `branchId`
- Neue Reservierungen (via API-Import) erhalten automatisch `branchId`

### 1.2 Branch Model

**Aktueller Stand:**
```prisma
model Branch {
  id                    Int
  name                  String
  organizationId        Int?
  whatsappSettings      Json? // ✅ Bereits vorhanden
  // ❌ FEHLT: lobbyPmsSettings
  // ❌ FEHLT: boldPaymentSettings
  // ❌ FEHLT: doorSystemSettings
  // ❌ FEHLT: emailSettings
}
```

**Erforderliche Änderung:**
```prisma
model Branch {
  id                    Int
  name                  String
  organizationId        Int?
  whatsappSettings      Json? // ✅ Bereits vorhanden
  lobbyPmsSettings      Json? // NEU: LobbyPMS-Konfiguration pro Branch
  boldPaymentSettings   Json? // NEU: Bold Payment-Konfiguration pro Branch
  doorSystemSettings    Json? // NEU: TTLock/Türsystem-Konfiguration pro Branch
  emailSettings         Json? // NEU: Email-Konfiguration pro Branch (SMTP + IMAP)
  reservations          Reservation[] // NEU: Relation zu Reservierungen
}
```

**Migration:**
```sql
-- Migration: add_branch_settings_for_all_services
ALTER TABLE "Branch" ADD COLUMN "lobbyPmsSettings" JSONB;
ALTER TABLE "Branch" ADD COLUMN "boldPaymentSettings" JSONB;
ALTER TABLE "Branch" ADD COLUMN "doorSystemSettings" JSONB;
ALTER TABLE "Branch" ADD COLUMN "emailSettings" JSONB;
```

**Settings-Struktur (Beispiel):**

**Branch.lobbyPmsSettings:**
```json
{
  "apiUrl": "https://api.lobbypms.com",
  "apiKey": "<verschlüsselt>",
  "propertyId": "optional",
  "syncEnabled": true,
  "autoCreateTasks": true,
  "lateCheckInThreshold": "22:00",
  "notificationChannels": ["email", "whatsapp"],
  "autoSendReservationInvitation": true
}
```

**Branch.boldPaymentSettings:**
```json
{
  "apiKey": "<verschlüsselt>",
  "merchantId": "<verschlüsselt>",
  "environment": "sandbox" | "production"
}
```

**Branch.doorSystemSettings:**
```json
{
  "clientId": "<verschlüsselt>",
  "clientSecret": "<verschlüsselt>",
  "username": "<verschlüsselt>",
  "password": "<verschlüsselt>",
  "lockIds": [12345, 67890],
  "appName": "TTLock"
}
```

**Branch.emailSettings:**
```json
{
  "smtpHost": "smtp.example.com",
  "smtpPort": 587,
  "smtpUser": "noreply@branch.com",
  "smtpPass": "<verschlüsselt>",
  "smtpFromEmail": "noreply@branch.com",
  "smtpFromName": "Branch Name",
  "imap": {
    "enabled": true,
    "host": "imap.example.com",
    "port": 993,
    "secure": true,
    "user": "contact@branch.com",
    "password": "<verschlüsselt>",
    "folder": "INBOX",
    "processedFolder": "Processed"
  }
}
```

---

## 2. Backend Services - Branch-Support

### 2.1 BoldPaymentService

**Aktueller Stand:**
- Constructor: `constructor(organizationId: number)`
- Lädt Settings aus `Organization.settings.boldPayment`
- **Kein Branch-Support**

**Erforderliche Änderungen:**

**Datei:** `backend/src/services/boldPaymentService.ts`

**1. Constructor erweitern:**
```typescript
export class BoldPaymentService {
  private organizationId?: number;
  private branchId?: number; // NEU
  private apiKey?: string;
  private merchantId?: string;
  private environment: 'sandbox' | 'production' = 'sandbox';
  private apiUrl: string;
  private axiosInstance: AxiosInstance;

  constructor(organizationId?: number, branchId?: number) {
    if (!organizationId && !branchId) {
      throw new Error('Entweder organizationId oder branchId muss angegeben werden');
    }
    this.organizationId = organizationId;
    this.branchId = branchId;
  }
}
```

**2. loadSettings() erweitern:**
```typescript
private async loadSettings(): Promise<void> {
  // 1. Versuche Branch Settings zu laden (wenn branchId gesetzt)
  if (this.branchId) {
    const branch = await prisma.branch.findUnique({
      where: { id: this.branchId },
      select: { 
        boldPaymentSettings: true, 
        organizationId: true 
      }
    });

    if (branch?.boldPaymentSettings) {
      try {
        const settings = decryptBranchApiSettings(branch.boldPaymentSettings as any);
        const boldPaymentSettings = settings?.boldPayment || settings;

        if (boldPaymentSettings?.apiKey) {
          this.apiKey = boldPaymentSettings.apiKey;
          this.merchantId = boldPaymentSettings.merchantId;
          this.environment = boldPaymentSettings.environment || 'sandbox';
          this.apiUrl = 'https://integrations.api.bold.co';
          this.axiosInstance = this.createAxiosInstance();
          return; // Erfolgreich geladen
        }
      } catch (error) {
        console.warn(`[BoldPayment] Fehler beim Laden der Branch Settings:`, error);
        // Fallback auf Organization Settings
      }

      // Fallback: Lade Organization Settings
      if (branch.organizationId) {
        this.organizationId = branch.organizationId;
      }
    } else if (branch?.organizationId) {
      // Branch hat keine Settings, aber Organization ID
      this.organizationId = branch.organizationId;
    }
  }

  // 2. Lade Organization Settings (Fallback oder wenn nur organizationId)
  if (this.organizationId) {
    const organization = await prisma.organization.findUnique({
      where: { id: this.organizationId },
      select: { settings: true }
    });

    if (!organization?.settings) {
      throw new Error(`Bold Payment ist nicht für Organisation ${this.organizationId} konfiguriert`);
    }

    const settings = decryptApiSettings(organization.settings as any);
    const boldPaymentSettings = settings?.boldPayment;

    if (!boldPaymentSettings?.apiKey) {
      throw new Error(`Bold Payment API Key ist nicht für Organisation ${this.organizationId} konfiguriert`);
    }

    this.apiKey = boldPaymentSettings.apiKey;
    this.merchantId = boldPaymentSettings.merchantId;
    this.environment = boldPaymentSettings.environment || 'sandbox';
    this.apiUrl = 'https://integrations.api.bold.co';
    this.axiosInstance = this.createAxiosInstance();
    return;
  }

  throw new Error('Bold Payment Settings nicht gefunden (weder Branch noch Organization)');
}
```

**3. Statische Factory-Methode:**
```typescript
static async createForBranch(branchId: number): Promise<BoldPaymentService> {
  const service = new BoldPaymentService(undefined, branchId);
  await service.loadSettings();
  return service;
}
```

**Verwendungsstellen ändern (8x):**

1. **`backend/src/services/reservationNotificationService.ts`** (2x):
   - Zeile 245: `new BoldPaymentService(reservation.organizationId)`
   - → `reservation.branchId ? await BoldPaymentService.createForBranch(reservation.branchId) : new BoldPaymentService(reservation.organizationId)`

2. **`backend/src/controllers/reservationController.ts`** (1x):
   - Zeile 139: `new BoldPaymentService(reservation.organizationId)`
   - → `reservation.branchId ? await BoldPaymentService.createForBranch(reservation.branchId) : new BoldPaymentService(reservation.organizationId)`

3. **`backend/src/services/boldPaymentService.ts`** (1x - im Webhook):
   - Zeile 435: `new BoldPaymentService(updatedReservation.organizationId)`
   - → `updatedReservation.branchId ? await BoldPaymentService.createForBranch(updatedReservation.branchId) : new BoldPaymentService(updatedReservation.organizationId)`

4. **`backend/src/queues/workers/updateGuestContactWorker.ts`** (1x):
   - Zeile 75: `new BoldPaymentService(organizationId)`
   - → Muss `reservation.branchId` aus Reservation holen, dann: `reservation.branchId ? await BoldPaymentService.createForBranch(reservation.branchId) : new BoldPaymentService(organizationId)`

5. **`backend/src/controllers/boldPaymentController.ts`** (2x):
   - Zeile 52: `new BoldPaymentService(reservation.organizationId)`
   - Zeile 69: `new BoldPaymentService(parseInt(organizationId))`
   - → Beide müssen `reservation.branchId` prüfen

6. **`backend/scripts/test-bold-payment-link.ts`** (1x):
   - Zeile 44: `new BoldPaymentService(organizationId)`
   - → Kann bleiben (Test-Script), oder erweitern für Branch-Tests

### 2.2 TTLockService

**Aktueller Stand:**
- Constructor: `constructor(organizationId: number)`
- Lädt Settings aus `Organization.settings.doorSystem`
- **Kein Branch-Support**

**Erforderliche Änderungen:**

**Datei:** `backend/src/services/ttlockService.ts`

**Änderungen identisch zu BoldPaymentService:**
1. Constructor erweitern: `constructor(organizationId?: number, branchId?: number)`
2. `loadSettings()` erweitern: Lade aus `Branch.doorSystemSettings` (mit Fallback)
3. Statische Factory-Methode: `static async createForBranch(branchId: number)`

**Verwendungsstellen ändern (8x):**

1. **`backend/src/services/reservationNotificationService.ts`** (2x):
   - Zeile 724: `new TTLockService(reservation.organizationId)`
   - Zeile 875: `new TTLockService(reservation.organizationId)`
   - → `reservation.branchId ? await TTLockService.createForBranch(reservation.branchId) : new TTLockService(reservation.organizationId)`

2. **`backend/src/controllers/reservationController.ts`** (1x):
   - Zeile 152: `new TTLockService(reservation.organizationId)`
   - → `reservation.branchId ? await TTLockService.createForBranch(reservation.branchId) : new TTLockService(reservation.organizationId)`

3. **`backend/src/services/boldPaymentService.ts`** (1x - im Webhook):
   - Zeile 435: `new TTLockService(updatedReservation.organizationId)`
   - → `updatedReservation.branchId ? await TTLockService.createForBranch(updatedReservation.branchId) : new TTLockService(updatedReservation.organizationId)`

4. **`backend/src/queues/workers/updateGuestContactWorker.ts`** (1x):
   - Zeile 99: `new TTLockService(organizationId)`
   - → Muss `reservation.branchId` aus Reservation holen

5. **`backend/src/controllers/ttlockController.ts`** (3x):
   - Zeile 19, 77, 116: `new TTLockService(organizationId)`
   - → Diese Controller-Methoden müssen prüfen, ob sie für eine Reservation aufgerufen werden oder direkt für eine Organisation
   - **Problem**: TTLock-Controller hat keine Reservation-Kontext
   - **Lösung**: Controller bleibt Organisation-basiert (für manuelle Lock-Verwaltung), nur Reservation-bezogene Aufrufe ändern

### 2.3 WhatsAppService

**Aktueller Stand:**
- ✅ **Bereits Branch-fähig!**
- Constructor: `constructor(organizationId?: number, branchId?: number)`
- Lädt Settings aus `Branch.whatsappSettings` (mit Fallback)
- **⚠️ PROBLEM**: Wird überall mit `organizationId` aufgerufen!

**Erforderliche Änderungen:**

**Nur Aufrufe korrigieren (6x):**

1. **`backend/src/services/reservationNotificationService.ts`** (3x):
   - Zeile 137: `new WhatsAppService(organization.id)`
   - Zeile 328: `new WhatsAppService(reservation.organizationId)`
   - Zeile 916: `new WhatsAppService(reservation.organizationId)`
   - → `reservation.branchId ? new WhatsAppService(undefined, reservation.branchId) : new WhatsAppService(reservation.organizationId)`

2. **`backend/src/controllers/reservationController.ts`** (1x):
   - Zeile 202: `new WhatsAppService(reservation.organizationId)`
   - → `reservation.branchId ? new WhatsAppService(undefined, reservation.branchId) : new WhatsAppService(reservation.organizationId)`

3. **`backend/src/services/boldPaymentService.ts`** (1x - im Webhook):
   - Zeile 474: `new WhatsAppService(updatedReservation.organizationId)`
   - → `updatedReservation.branchId ? new WhatsAppService(undefined, updatedReservation.branchId) : new WhatsAppService(updatedReservation.organizationId)`

4. **`backend/src/queues/workers/updateGuestContactWorker.ts`** (1x):
   - Zeile 153: `new WhatsAppService(organizationId)`
   - → Muss `reservation.branchId` aus Reservation holen

### 2.5 LobbyPmsService

**Aktueller Stand:**
- Constructor: `constructor(organizationId: number)`
- Lädt Settings aus `Organization.settings.lobbyPms`
- **Kein Branch-Support**

**Erforderliche Änderungen:**

**Datei:** `backend/src/services/lobbyPmsService.ts`

**Änderungen identisch zu BoldPaymentService:**
1. Constructor erweitern: `constructor(organizationId?: number, branchId?: number)`
2. `loadSettings()` erweitern: Lade aus `Branch.lobbyPmsSettings` (mit Fallback)
3. Endpoint korrigieren: `/api/v1/bookings` statt `/reservations`
4. Statische Factory-Methode: `static async createForBranch(branchId: number)`

**Verwendungsstellen ändern:**
- Alle Aufrufe in `LobbyPmsReservationSyncService` (neu zu erstellen)
- Alle Aufrufe in `lobbyPmsController.ts` müssen prüfen, ob Reservation `branchId` hat

---

## 3. Backend APIs - Branch-Filter

### 3.1 GET /api/reservations

**Aktueller Stand:**
```typescript
// backend/src/controllers/reservationController.ts
export const getAllReservations = async (req: Request, res: Response) => {
  const reservations = await prisma.reservation.findMany({
    where: {
      organizationId: req.organizationId // ❌ Nur Organization-Filter
    },
    include: {
      organization: { ... },
      task: true
      // ❌ FEHLT: branch
    }
  });
}
```

**Erforderliche Änderung:**
```typescript
export const getAllReservations = async (req: Request, res: Response) => {
  const { branchId } = req.query; // NEU: Optional Branch-Filter
  
  const whereClause: any = {
    organizationId: req.organizationId
  };
  
  // NEU: Branch-Filter (wenn angegeben)
  if (branchId) {
    const branchIdNum = parseInt(branchId as string, 10);
    if (!isNaN(branchIdNum)) {
      whereClause.branchId = branchIdNum;
    }
  }
  
  const reservations = await prisma.reservation.findMany({
    where: whereClause,
    include: {
      organization: { ... },
      branch: { // NEU: Branch-Relation
        select: {
          id: true,
          name: true
        }
      },
      task: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
}
```

**API-Usage:**
- `GET /api/reservations` - Alle Reservierungen der Organisation
- `GET /api/reservations?branchId=1` - Nur Reservierungen von Branch 1

### 3.2 GET /api/lobby-pms/reservations

**Aktueller Stand:**
```typescript
// backend/src/controllers/lobbyPmsController.ts
export const getReservations = async (req: AuthenticatedRequest, res: Response) => {
  const service = new LobbyPmsService(organizationId); // ❌ Nur Organization
  // ...
}
```

**Erforderliche Änderung:**
- Diese API ist für LobbyPMS-Sync, nicht für lokale Reservierungen
- Kann bleiben wie es ist (für LobbyPMS API-Abfragen)
- Oder erweitern für Branch-spezifische LobbyPMS-Abfragen

### 3.3 Alle anderen Reservation-APIs

**Prüfen ob Branch-Filter nötig:**
- `GET /api/reservations/:id` - Einzelne Reservation (kann bleiben)
- `POST /api/reservations` - Neue Reservation erstellen (muss `branchId` akzeptieren)
- `PUT /api/reservations/:id/guest-contact` - Kann bleiben
- `POST /api/reservations/:id/send-invitation` - Kann bleiben
- `POST /api/reservations/:id/generate-pin-and-send` - Kann bleiben
- `GET /api/reservations/:id/notification-logs` - Kann bleiben

**Wichtig:** Alle APIs müssen `branch` in `include` haben, damit Frontend Branch-Name anzeigen kann.

---

## 4. Task-Erstellung

### 4.1 TaskAutomationService.createReservationTask()

**Aktueller Stand:**
```typescript
// backend/src/services/taskAutomationService.ts
static async createReservationTask(reservation: Reservation, organizationId: number) {
  // ...
  // Hole erste Branch der Organisation (für Task)
  const branch = await prisma.branch.findFirst({
    where: { organizationId } // ❌ Findet Branch über Organization
  });
  
  const task = await prisma.task.create({
    data: {
      // ...
      branchId: branch.id, // ❌ Verwendet gefundene Branch, nicht reservation.branchId
      // ...
    }
  });
}
```

**Erforderliche Änderung:**
```typescript
static async createReservationTask(reservation: Reservation, organizationId: number) {
  // ...
  
  // NEU: Verwende reservation.branchId falls vorhanden, sonst Fallback
  let branchId: number;
  
  if (reservation.branchId) {
    // Reservierung hat bereits Branch-Zuordnung
    branchId = reservation.branchId;
  } else {
    // Fallback: Hole erste Branch der Organisation
    const branch = await prisma.branch.findFirst({
      where: { organizationId }
    });
    
    if (!branch) {
      console.warn(`[TaskAutomation] Keine Branch gefunden für Organisation ${organizationId}. Task wird nicht erstellt.`);
      return null;
    }
    
    branchId = branch.id;
  }
  
  const task = await prisma.task.create({
    data: {
      // ...
      branchId: branchId, // ✅ Verwendet reservation.branchId oder Fallback
      // ...
    }
  });
}
```

**Verwendungsstellen:**
- `backend/src/services/lobbyPmsService.ts` (Zeile 393): `TaskAutomationService.createReservationTask(reservation, this.organizationId)`
- → Kann bleiben, `createReservationTask()` prüft intern `reservation.branchId`

---

## 5. Verschlüsselung

### 5.1 Branch-Settings Verschlüsselung

**Aktueller Stand:**
- `encryptApiSettings()` und `decryptApiSettings()` funktionieren nur für `OrganizationSettings`
- Branch-Settings werden nicht verschlüsselt

**Erforderliche Änderungen:**

**Datei:** `backend/src/utils/encryption.ts`

**1. Neue Funktionen hinzufügen:**
```typescript
/**
 * Verschlüsselt alle API-Keys in BranchSettings
 * 
 * @param settings - BranchSettings Objekt (z.B. boldPaymentSettings, doorSystemSettings, etc.)
 * @returns Settings mit verschlüsselten API-Keys
 */
export const encryptBranchApiSettings = (settings: any): any => {
  if (!settings || typeof settings !== 'object') {
    return settings;
  }

  const encrypted = { ...settings };

  // Bold Payment
  if (encrypted.apiKey) {
    encrypted.apiKey = encryptSecret(encrypted.apiKey);
  }
  if (encrypted.merchantId) {
    encrypted.merchantId = encryptSecret(encrypted.merchantId);
  }

  // TTLock
  if (encrypted.clientId) {
    encrypted.clientId = encryptSecret(encrypted.clientId);
  }
  if (encrypted.clientSecret) {
    encrypted.clientSecret = encryptSecret(encrypted.clientSecret);
  }
  if (encrypted.username) {
    encrypted.username = encryptSecret(encrypted.username);
  }
  if (encrypted.password) {
    encrypted.password = encryptSecret(encrypted.password);
  }

  // LobbyPMS
  if (encrypted.apiKey) {
    encrypted.apiKey = encryptSecret(encrypted.apiKey);
  }

  // WhatsApp (bereits in Branch.whatsappSettings)
  if (encrypted.apiKey) {
    encrypted.apiKey = encryptSecret(encrypted.apiKey);
  }
  if (encrypted.apiSecret) {
    encrypted.apiSecret = encryptSecret(encrypted.apiSecret);
  }

  return encrypted;
};

/**
 * Entschlüsselt alle API-Keys in BranchSettings
 * 
 * @param settings - BranchSettings Objekt mit verschlüsselten Keys
 * @returns Settings mit entschlüsselten API-Keys
 */
export const decryptBranchApiSettings = (settings: any): any => {
  if (!settings || typeof settings !== 'object') {
    return settings;
  }

  const decrypted = { ...settings };

  // Versuche alle möglichen verschlüsselten Felder zu entschlüsseln
  const encryptedFields = ['apiKey', 'apiSecret', 'merchantId', 'clientId', 'clientSecret', 'username', 'password', 'smtpPass'];
  
  for (const field of encryptedFields) {
    if (decrypted[field] && typeof decrypted[field] === 'string' && decrypted[field].includes(':')) {
      try {
        decrypted[field] = decryptSecret(decrypted[field]);
      } catch (error) {
        console.error(`Error decrypting ${field}:`, error);
        // Bei Fehler: Feld bleibt wie es ist
      }
    }
  }

  // Email IMAP Password (verschachtelt)
  if (decrypted.imap?.password && typeof decrypted.imap.password === 'string' && decrypted.imap.password.includes(':')) {
    try {
      decrypted.imap = {
        ...decrypted.imap,
        password: decryptSecret(decrypted.imap.password)
      };
    } catch (error) {
      console.error('Error decrypting imap.password:', error);
    }
  }

  return decrypted;
};
```

**2. Verwendung in Controllers:**
- `backend/src/controllers/branchController.ts`: Beim Speichern von Branch-Settings `encryptBranchApiSettings()` verwenden
- Beim Laden von Branch-Settings `decryptBranchApiSettings()` verwenden

**3. Backend API Erweiterung (KRITISCH - wurde in Planung übersehen):**

**Datei:** `backend/src/controllers/branchController.ts`

**3.1 `getAllBranches()` erweitern:**
- `select` muss ALLE Settings-Felder zurückgeben:
  - `whatsappSettings: true`
  - `lobbyPmsSettings: true` ✅ NEU
  - `boldPaymentSettings: true` ✅ NEU
  - `doorSystemSettings: true` ✅ NEU
  - `emailSettings: true` ✅ NEU
- Entschlüsselung für ALLE Settings (nicht nur WhatsApp):
  - Verwende `decryptBranchApiSettings()` für jedes Settings-Feld
  - Fehlerbehandlung pro Settings-Feld (Settings bleiben verschlüsselt bei Fehler)

**3.2 `updateBranch()` erweitern:**
- Request-Body erweitern: Alle Settings-Felder akzeptieren
  - `whatsappSettings`, `lobbyPmsSettings`, `boldPaymentSettings`, `doorSystemSettings`, `emailSettings`
- Verschlüsselung für ALLE Settings:
  - Verwende `encryptBranchApiSettings()` für jedes Settings-Feld
  - Fehlerbehandlung pro Settings-Feld
- `updateData` erweitern: Alle Settings-Felder in Update-Query
- Response `select` erweitern: Alle Settings-Felder zurückgeben
- Entschlüsselung für Response: Alle Settings-Felder entschlüsseln

---

## 6. Validierung

### 6.1 Zod-Schema für Branch-Settings

**Erforderliche Änderungen:**

**Neue Datei:** `backend/src/validation/branchSettingsSchema.ts`

```typescript
import { z } from 'zod';

export const branchLobbyPmsSettingsSchema = z.object({
  apiUrl: z.string().url().optional(),
  apiKey: z.string().min(1, 'API Key ist erforderlich'),
  propertyId: z.string().optional(),
  syncEnabled: z.boolean().default(true),
  autoCreateTasks: z.boolean().default(true),
  lateCheckInThreshold: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  notificationChannels: z.array(z.enum(['email', 'whatsapp'])).default(['email']),
  autoSendReservationInvitation: z.boolean().default(true)
});

export const branchBoldPaymentSettingsSchema = z.object({
  apiKey: z.string().min(1, 'API Key ist erforderlich'),
  merchantId: z.string().min(1, 'Merchant ID ist erforderlich'),
  environment: z.enum(['sandbox', 'production']).default('sandbox')
});

export const branchDoorSystemSettingsSchema = z.object({
  clientId: z.string().min(1, 'Client ID ist erforderlich'),
  clientSecret: z.string().min(1, 'Client Secret ist erforderlich'),
  username: z.string().min(1, 'Username ist erforderlich'),
  password: z.string().min(1, 'Password ist erforderlich'),
  lockIds: z.array(z.number()).min(1, 'Mindestens eine Lock ID ist erforderlich'),
  appName: z.string().default('TTLock')
});

export const branchSireSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  autoRegisterOnCheckIn: z.boolean().default(false),
  apiUrl: z.string().url().optional(),
  apiKey: z.string().optional(),
  apiSecret: z.string().optional(),
  propertyCode: z.string().optional()
}).refine(
  (data) => !data.enabled || (data.apiUrl && data.apiKey),
  {
    message: 'API URL und API Key sind erforderlich wenn SIRE aktiviert ist',
    path: ['apiKey']
  }
);
```

**Verwendung in Controllers:**
- `backend/src/controllers/branchController.ts`: Validierung beim Update von Branch-Settings

**Neue Schemas für Email-Settings:**
```typescript
export const branchEmailSettingsSchema = z.object({
  smtpHost: z.string().min(1, 'SMTP Host ist erforderlich'),
  smtpPort: z.number().min(1).max(65535),
  smtpUser: z.string().email('SMTP User muss eine gültige E-Mail sein'),
  smtpPass: z.string().min(1, 'SMTP Passwort ist erforderlich'),
  smtpFromEmail: z.string().email().optional(),
  smtpFromName: z.string().optional(),
  imap: z.object({
    enabled: z.boolean().default(false),
    host: z.string().min(1).optional(),
    port: z.number().min(1).max(65535).optional(),
    secure: z.boolean().default(true),
    user: z.string().email().optional(),
    password: z.string().optional(),
    folder: z.string().default('INBOX'),
    processedFolder: z.string().optional()
  }).optional()
}).refine(
  (data) => !data.imap?.enabled || (data.imap.host && data.imap.user && data.imap.password),
  {
    message: 'IMAP Host, User und Password sind erforderlich wenn IMAP aktiviert ist',
    path: ['imap']
  }
);
```

---

## 7. Frontend

### 7.1 Branch-Settings UI

**Erforderliche Änderungen:**

**Datei:** `frontend/src/components/BranchManagementTab.tsx`

**Neue Tabs/Sections hinzufügen:**

1. **LobbyPMS Settings Tab**
   - API-Token (verschlüsselt speichern)
   - Property ID (optional)
   - Sync-Einstellungen
   - Auto-Create-Tasks
   - Late Check-in Threshold
   - Notification Channels
   - Auto-Send Reservation Invitation

2. **Bold Payment Settings Tab**
   - API Key (verschlüsselt)
   - Merchant ID (verschlüsselt)
   - Environment (sandbox/production)

3. **TTLock Settings Tab**
   - Client ID (verschlüsselt)
   - Client Secret (verschlüsselt)
   - Username (verschlüsselt)
   - Password (verschlüsselt)
   - Lock IDs (Array)
   - App Name

4. **Email Settings Tab** (NEU)
   - SMTP Host
   - SMTP Port
   - SMTP User
   - SMTP Pass (verschlüsselt)
   - SMTP From Email
   - SMTP From Name
   - IMAP Settings (optional):
     - Enabled
     - Host
     - Port
     - Secure
     - User
     - Password (verschlüsselt)
     - Folder
     - Processed Folder

**Bereits vorhanden:**
- ✅ WhatsApp Settings Tab (bereits implementiert)

### 7.2 Reservation-Liste erweitern

**Erforderliche Änderungen:**

**Datei:** `frontend/src/components/reservations/ReservationList.tsx`

**1. Branch-Filter hinzufügen:**
```typescript
const [filterBranch, setFilterBranch] = useState<number | null>(null);
const [branches, setBranches] = useState<Branch[]>([]);

// Lade Branches
useEffect(() => {
  const loadBranches = async () => {
    const response = await fetch('/api/branches');
    const data = await response.json();
    setBranches(data);
  };
  loadBranches();
}, []);

// Filtere Reservierungen
const filteredReservations = reservations.filter((reservation) => {
  // ... bestehende Filter ...
  
  // NEU: Branch-Filter
  if (filterBranch && reservation.branchId !== filterBranch) {
    return false;
  }
  
  return true;
});
```

**2. Branch-Spalte in Tabelle anzeigen:**
```typescript
// In der Tabelle:
{columns.includes('branch') && (
  <td>{reservation.branch?.name || 'N/A'}</td>
)}
```

**3. Branch-Dropdown-Filter:**
```typescript
<select 
  value={filterBranch || ''} 
  onChange={(e) => setFilterBranch(e.target.value ? parseInt(e.target.value) : null)}
>
  <option value="">Alle Branches</option>
  {branches.map(branch => (
    <option key={branch.id} value={branch.id}>{branch.name}</option>
  ))}
</select>
```

**Datei:** `frontend/src/pages/Worktracker.tsx`

**Ähnliche Änderungen für Reservierungen in Worktracker**

### 7.3 Reservation-Details

**Erforderliche Änderungen:**

**Datei:** `frontend/src/components/reservations/ReservationDetails.tsx` (falls vorhanden)

- Branch-Name anzeigen
- Link zu Branch-Settings (falls Admin)

### 7.4 TypeScript-Types

**Erforderliche Änderungen:**

**Datei:** `frontend/src/types/reservation.ts`

```typescript
export interface Reservation {
  // ... bestehende Felder ...
  branchId?: number; // NEU
  branch?: { // NEU
    id: number;
    name: string;
  };
}
```

**Datei:** `frontend/src/types/branch.ts` (neu oder erweitern)

```typescript
export interface Branch {
  id: number;
  name: string;
  organizationId?: number;
  whatsappSettings?: BranchWhatsAppSettings;
  lobbyPmsSettings?: BranchLobbyPmsSettings; // NEU
  boldPaymentSettings?: BranchBoldPaymentSettings; // NEU
  doorSystemSettings?: BranchDoorSystemSettings; // NEU
  emailSettings?: BranchEmailSettings; // NEU
}

export interface BranchLobbyPmsSettings {
  apiUrl?: string;
  apiKey?: string;
  propertyId?: string;
  syncEnabled: boolean;
  autoCreateTasks?: boolean;
  lateCheckInThreshold?: string;
  notificationChannels?: ('email' | 'whatsapp')[];
  autoSendReservationInvitation?: boolean;
}

export interface BranchBoldPaymentSettings {
  apiKey: string;
  merchantId: string;
  environment: 'sandbox' | 'production';
}

export interface BranchDoorSystemSettings {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  lockIds: number[];
  appName?: string;
}

export interface BranchEmailSettings {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass?: string; // Verschlüsselt
  smtpFromEmail?: string;
  smtpFromName?: string;
  imap?: {
    enabled: boolean;
    host?: string;
    port?: number;
    secure?: boolean;
    user?: string;
    password?: string; // Verschlüsselt
    folder?: string;
    processedFolder?: string;
  };
}
```

---

## 8. Berechtigungen - Rollenbasierte Steuerung

### 8.1 Aktueller Stand

**Middleware:**
- `authMiddleware`: Prüft User-Authentifizierung
- `organizationMiddleware`: Setzt `req.organizationId` und `req.branchId` (aus `UsersBranches`)
- **Aktuell:** Reservierungen werden nur nach `organizationId` gefiltert, nicht nach `branchId`

**Berechtigungssystem:**
- Berechtigungen werden über `Permission` Tabelle gesteuert
- `entity`: z.B. "reservations", "table_reservations"
- `entityType`: "page", "table", "button"
- `accessLevel`: "read", "write", "both", "none"

### 8.2 Neue Berechtigung: Reservierungen pro Branch

**Anforderung:** Je nach Rolle sollen User **alle Reservierungen** ODER **nur Reservierungen des aktuellen Branches** sehen.

**Lösung:** Neue Berechtigung einführen

**Option 1: Neue Entity für Branch-Filter**
- `entity: "table_reservations_all_branches"` - Alle Reservierungen sehen
- `entity: "table_reservations_own_branch"` - Nur eigene Branch-Reservierungen sehen

**Option 2: AccessLevel erweitern**
- `accessLevel: "read_all_branches"` - Alle Reservierungen
- `accessLevel: "read_own_branch"` - Nur eigene Branch

**Empfehlung:** Option 1 (neue Entity) - klarer und einfacher zu prüfen

### 8.3 Implementierung

**1. Neue Berechtigung in Datenbank:**
```typescript
// Für Rollen, die ALLE Reservierungen sehen sollen:
Permission.create({
  roleId: adminRoleId,
  entity: "table_reservations_all_branches",
  entityType: "table",
  accessLevel: "read"
});

// Für Rollen, die nur EIGENE Branch-Reservierungen sehen sollen:
Permission.create({
  roleId: userRoleId,
  entity: "table_reservations_own_branch",
  entityType: "table",
  accessLevel: "read"
});
```

**2. Controller erweitern:**
```typescript
// backend/src/controllers/reservationController.ts
export const getAllReservations = async (req: Request, res: Response) => {
  // Prüfe Berechtigung
  const hasAllBranchesPermission = await checkUserPermission(
    req.userId,
    req.roleId,
    'table_reservations_all_branches',
    'read',
    'table'
  );
  
  const hasOwnBranchPermission = await checkUserPermission(
    req.userId,
    req.roleId,
    'table_reservations_own_branch',
    'read',
    'table'
  );
  
  const whereClause: any = {
    organizationId: req.organizationId
  };
  
  // Wenn nur "own_branch" Berechtigung: Filtere nach Branch
  if (hasOwnBranchPermission && !hasAllBranchesPermission) {
    if (req.branchId) {
      whereClause.branchId = req.branchId;
    } else {
      // User hat keine aktive Branch → keine Reservierungen
      return res.json({ success: true, data: [] });
    }
  }
  // Wenn "all_branches" Berechtigung: Kein Branch-Filter (alle Reservierungen)
  
  const reservations = await prisma.reservation.findMany({
    where: whereClause,
    include: {
      organization: { ... },
      branch: { ... },
      task: true
    }
  });
}
```

**3. Seed-Script erweitern:**
- Admin-Rolle: `table_reservations_all_branches` Berechtigung
- User-Rolle: `table_reservations_own_branch` Berechtigung

---

## 9. Migration & Rollout

### 9.1 Bestehende Reservierungen

**Strategie:**
- Bestehende Reservierungen bleiben ohne `branchId` (optional)
- Fallback-Logik in allen Services:
  - Wenn `reservation.branchId` vorhanden: Verwende Branch-Settings
  - Wenn `reservation.branchId` fehlt: Verwende Organisation-Settings

**Manuelle Zuordnung (optional):**
- Frontend-UI zum Zuordnen bestehender Reservierungen zu Branches
- Bulk-Update-Funktion

### 9.2 Email-Import ersetzen

**Vorgehen:**
1. `EmailReservationScheduler` aus `backend/src/index.ts` entfernen
2. `EmailReservationService` bleibt im Code (für Notfall)
3. `LobbyPmsReservationScheduler` aktivieren

**Code-Änderungen:**
```typescript
// backend/src/index.ts

// ALT:
// import { EmailReservationScheduler } from './services/emailReservationScheduler';
// EmailReservationScheduler.start();

// NEU:
import { LobbyPmsReservationScheduler } from './services/lobbyPmsReservationScheduler';
LobbyPmsReservationScheduler.start();
```

### 9.3 Webhook-Handler

**Problem:** Bold Payment Webhooks verwenden `organizationId`

**Datei:** `backend/src/services/boldPaymentService.ts` - `handleWebhook()`

**Erforderliche Änderung:**
```typescript
async handleWebhook(payload: any): Promise<void> {
  // ... bestehender Code ...
  
  const reservation = await prisma.reservation.findFirst({
    where: { paymentLink: { contains: reference } },
    include: { branch: true } // NEU: Branch-Relation
  });
  
  if (reservation?.branchId) {
    // Verwende Branch-Services
    const ttlockService = await TTLockService.createForBranch(reservation.branchId);
    const whatsappService = new WhatsAppService(undefined, reservation.branchId);
  } else {
    // Fallback auf Organisation
    const ttlockService = new TTLockService(reservation.organizationId);
    const whatsappService = new WhatsAppService(reservation.organizationId);
  }
}
```

---

## 10. Tests

### 10.1 Unit-Tests

**Erforderliche Tests:**

1. **BoldPaymentService:**
   - Test: Branch-Settings laden
   - Test: Fallback auf Organisation-Settings
   - Test: Verschlüsselung/Entschlüsselung

2. **TTLockService:**
   - Test: Branch-Settings laden
   - Test: Fallback auf Organisation-Settings

3. **SireService:**
   - Test: Branch-Settings laden
   - Test: Fallback auf Organisation-Settings

4. **WhatsAppService:**
   - Test: Branch-Settings verwenden (bereits vorhanden, aber prüfen)

5. **LobbyPmsService:**
   - Test: Branch-Settings laden
   - Test: Endpoint `/api/v1/bookings`

6. **TaskAutomationService:**
   - Test: `reservation.branchId` verwenden
   - Test: Fallback auf Organisation-Branch

### 10.2 Integration-Tests

**Erforderliche Tests:**

1. **Reservation-API:**
   - Test: `GET /api/reservations?branchId=1`
   - Test: `POST /api/reservations` mit `branchId`
   - Test: Branch-Relation in Response

2. **Service-Aufrufe:**
   - Test: BoldPayment mit Branch-Settings
   - Test: TTLock mit Branch-Settings
   - Test: SIRE mit Branch-Settings
   - Test: WhatsApp mit Branch-Settings

3. **LobbyPMS-Sync:**
   - Test: Reservierungen werden mit `branchId` erstellt
   - Test: Services verwenden Branch-Settings

### 10.3 E2E-Tests

**Erforderliche Tests:**

1. **Vollständiger Flow:**
   - LobbyPMS-Import → Reservation mit `branchId`
   - Payment-Link-Erstellung mit Branch-Settings
   - TTLock-Passcode mit Branch-Settings
   - WhatsApp-Versand mit Branch-Settings

---

## 11. Monitoring & Logging

### 11.1 Branch-spezifisches Logging

**Erforderliche Änderungen:**

**Alle Services:**
- Logge welcher Branch verwendet wird
- Logge ob Branch-Settings oder Organisation-Settings verwendet werden

**Beispiel:**
```typescript
console.log(`[BoldPayment] Verwende ${reservation.branchId ? `Branch ${reservation.branchId}` : `Organisation ${reservation.organizationId}`} Settings`);
```

### 11.2 Sync-Status pro Branch

**Erforderliche Änderungen:**

**LobbyPmsReservationScheduler:**
- Logge Sync-Status pro Branch
- Logge Anzahl synchronisierter Reservierungen pro Branch
- Logge Fehler pro Branch

**Beispiel:**
```typescript
console.log(`[LobbyPMS Sync] Branch ${branchId}: ${syncedCount} Reservierungen synchronisiert`);
```

---

## 12. Zusammenfassung - Alle Änderungen

### 12.1 Datenbank (2 Migrationen + 1 Data-Migration)

1. **Migration 1:** `add_branch_to_reservation`
   - `Reservation.branchId` hinzufügen (optional)
   - Index erstellen

2. **Migration 2:** `add_branch_settings_for_all_services`
   - `Branch.lobbyPmsSettings` hinzufügen
   - `Branch.boldPaymentSettings` hinzufügen
   - `Branch.doorSystemSettings` hinzufügen
   - `Branch.emailSettings` hinzufügen
   - **HINWEIS:** `Branch.sireSettings` wurde entfernt (SIRE-Integration nicht mehr benötigt)

3. **Data-Migration:** `migrate-reservations-to-manila.ts`
   - Alle bestehenden Reservierungen (Organisation 1, branchId = NULL) → Branch "Manila" zuordnen

### 12.2 Backend Services (6 Services)

1. **BoldPaymentService:** Branch-Support hinzufügen (~8 Aufrufe ändern)
2. **TTLockService:** Branch-Support hinzufügen (~8 Aufrufe ändern)
3. **WhatsAppService:** ✅ Bereits Branch-fähig, nur Aufrufe korrigieren (~6 Aufrufe)
4. **LobbyPmsService:** Branch-Support hinzufügen + Endpoint korrigieren
5. **EmailService:** Branch-Support hinzufügen (SMTP + IMAP)
6. **SireService:** ❌ **ENTFERNT** - SIRE-Integration nicht mehr benötigt

### 12.3 Backend APIs (2 Controller)

1. **reservationController.ts:**
   - `getAllReservations()`: Branch-Filter + Berechtigungsprüfung
   - `createReservation()`: `branchId` akzeptieren
   - Alle APIs: `branch` in `include` hinzufügen
   - **Berechtigungsprüfung:** `table_reservations_all_branches` vs `table_reservations_own_branch`

2. **branchController.ts:** ✅ **KRITISCH - wurde in Planung übersehen**
   - `getAllBranches()`: ALLE Settings-Felder zurückgeben (nicht nur WhatsApp)
     - `select` erweitern: `lobbyPmsSettings`, `boldPaymentSettings`, `doorSystemSettings`, `emailSettings`
     - Entschlüsselung für ALLE Settings-Felder
   - `updateBranch()`: ALLE Settings-Felder verarbeiten
     - Request-Body erweitern: Alle Settings-Felder akzeptieren
     - Verschlüsselung für ALLE Settings-Felder
     - Response `select` erweitern: Alle Settings-Felder zurückgeben
     - Entschlüsselung für Response: Alle Settings-Felder entschlüsseln

### 12.4 Backend Utilities (2 Dateien)

1. **encryption.ts:** Branch-Settings Verschlüsselung hinzufügen
2. **validation/branchSettingsSchema.ts:** Zod-Schemas erstellen

### 12.5 Backend Tasks (1 Service)

1. **taskAutomationService.ts:** `reservation.branchId` verwenden

### 12.6 Frontend (4 Komponenten)

1. **BranchManagementTab.tsx:** 5 neue Settings-Tabs (inkl. Email-Settings)
2. **ReservationList.tsx:** Branch-Filter + Branch-Spalte
3. **Worktracker.tsx:** Branch-Filter für Reservierungen
4. **types/reservation.ts + types/branch.ts:** TypeScript-Types erweitern

### 12.7 Code-Änderungen (Gesamt)

- **~30 Stellen** müssen geändert werden (Service-Aufrufe inkl. Email-Service)
- **~6 neue Dateien** erstellen
- **~12 Dateien** erweitern
- 2 Datenbank-Migrationen + 1 Data-Migration
- 6 Services erweitern (inkl. EmailService)
- 4 Frontend-Komponenten erweitern
- Neue Berechtigungen: `table_reservations_all_branches`, `table_reservations_own_branch`

---

## 13. Implementierungsreihenfolge

### Phase 1: Datenbank (KRITISCH)
1. Migration 1: `Reservation.branchId`
2. Migration 2: Branch-Settings-Felder (inkl. `emailSettings`)
3. Data-Migration: Bestehende Reservierungen → Branch "Manila"

### Phase 2: Verschlüsselung & Validierung
1. `encryptBranchApiSettings()` / `decryptBranchApiSettings()` (inkl. Email-Settings)
2. Zod-Schemas für Branch-Settings (inkl. `branchEmailSettingsSchema`)

### Phase 3: Services Branch-Support
1. BoldPaymentService
2. TTLockService
3. LobbyPmsService
4. WhatsAppService (nur Aufrufe korrigieren)
5. EmailService (SMTP + IMAP)
6. **SIRE-Entfernung:** Alle SIRE-Referenzen entfernen (schema.prisma, organizationSettingsSchema.ts, urlValidation.ts, sireService.ts)

### Phase 4: APIs & Controller
1. `getAllReservations()` Branch-Filter + Berechtigungsprüfung
2. Alle APIs `branch` in `include`
3. **`branchController.ts` erweitern (KRITISCH - wurde in Planung übersehen):**
   - `getAllBranches()`: Alle Settings-Felder zurückgeben + Entschlüsselung
   - `updateBranch()`: Alle Settings-Felder verarbeiten + Verschlüsselung
4. TaskAutomationService
5. Neue Berechtigungen in Seed-Script

### Phase 5: Frontend
1. Branch-Settings UI (inkl. Email-Settings Tab)
2. Reservation-Liste Branch-Filter
3. TypeScript-Types

### Phase 6: LobbyPMS-Sync
1. LobbyPmsReservationSyncService (neu)
2. LobbyPmsReservationScheduler (neu)
3. Email-Import deaktivieren

### Phase 7: Tests & Monitoring
1. Unit-Tests
2. Integration-Tests
3. Logging erweitern

---

## 14. Risiken & Fallbacks

### 14.1 Risiken

1. **Finanzielle Verluste:** Falsche Zahlungslinks → Geld geht an falsches Konto
2. **Sicherheit:** Falsche TTLock Passcodes → Gäste können nicht einchecken
3. **Dateninkonsistenz:** Branch-Zuordnung geht verloren
4. **Email-Versand:** Falsche SMTP-Settings → E-Mails gehen nicht an

### 14.2 Fallbacks

**Alle Services haben Fallback-Logik:**
- Wenn `reservation.branchId` vorhanden: Verwende Branch-Settings
- Wenn `reservation.branchId` fehlt: Verwende Organisation-Settings

**Migration:**
- Bestehende Reservierungen bleiben ohne `branchId`
- Fallback auf Organisation-Settings funktioniert weiterhin

---

## 15. Offene Fragen - Geklärt

### 15.1 Berechtigungen ✅

**Entscheidung:** Keine Branch-spezifischen Berechtigungen (Option 1)
- Alle User einer Organisation können alle Reservierungen sehen
- Branch-Filter ist nur für Anzeige, nicht für Sicherheit
- Siehe Abschnitt 8 für Details

### 15.2 Email-Settings ✅

**Entscheidung:** **Email-Settings MÜSSEN pro Branch sein!**

**Aktueller Stand:**
- Email-Settings sind in `Organization.settings` gespeichert:
  - `smtpHost`, `smtpPort`, `smtpUser`, `smtpPass`, `smtpFromEmail`, `smtpFromName`
- `emailService.ts` lädt Settings aus Organisation
- `emailReadingService.ts` lädt IMAP-Settings aus Organisation

**Erforderliche Änderungen:**

**1. Datenbank-Schema:**
```prisma
model Branch {
  // ... bestehende Felder ...
  emailSettings Json? // NEU: Email-Konfiguration pro Branch
}
```

**2. Email-Settings-Struktur:**
```json
{
  "smtpHost": "smtp.example.com",
  "smtpPort": 587,
  "smtpUser": "noreply@branch.com",
  "smtpPass": "<verschlüsselt>",
  "smtpFromEmail": "noreply@branch.com",
  "smtpFromName": "Branch Name",
  "imap": {
    "enabled": true,
    "host": "imap.example.com",
    "port": 993,
    "secure": true,
    "user": "contact@branch.com",
    "password": "<verschlüsselt>",
    "folder": "INBOX",
    "processedFolder": "Processed"
  }
}
```

**3. emailService.ts erweitern:**
- Constructor: `createTransporter(organizationId?: number, branchId?: number)`
- Lade Settings aus `Branch.emailSettings` (mit Fallback auf Organisation)
- Verschlüsselung für `smtpPass`

**4. emailReadingService.ts erweitern:**
- `loadConfigFromOrganization()` → `loadConfigFromBranch(branchId: number)`
- Lade IMAP-Settings aus `Branch.emailSettings.imap`
- Fallback auf Organisation-Settings

**5. Verwendungsstellen ändern:**
- Alle Aufrufe von `sendEmail()`, `sendRegistrationEmail()`, etc. müssen `branchId` übergeben
- Reservation-bezogene Email-Aufrufe: `reservation.branchId` verwenden

### 15.3 Migration bestehender Reservierungen ✅

**Entscheidung:** **Alle bestehenden Reservierungen werden automatisch Branch "Manila" zugeordnet**

**Details:**
- Organisation: 1 (La Familia Hostel)
- Branch: "Manila" (muss in Organisation 1 existieren)
- Alle Reservierungen mit `organizationId = 1` und `branchId = NULL` erhalten `branchId` des Branches "Manila"

**Migration-Script:**
```typescript
// backend/scripts/migrate-reservations-to-manila.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateReservationsToManila() {
  try {
    console.log('🚀 Migriere bestehende Reservierungen zu Branch "Manila"...\n');

    // 1. Finde Branch "Manila" in Organisation 1
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

    // 2. Finde alle Reservierungen ohne branchId in Organisation 1
    const reservations = await prisma.reservation.findMany({
      where: {
        organizationId: 1,
        branchId: null
      }
    });

    console.log(`📋 Gefunden: ${reservations.length} Reservierungen ohne branchId`);

    if (reservations.length === 0) {
      console.log('✅ Keine Reservierungen zu migrieren');
      return;
    }

    // 3. Update alle Reservierungen
    const result = await prisma.reservation.updateMany({
      where: {
        organizationId: 1,
        branchId: null
      },
      data: {
        branchId: branch.id
      }
    });

    console.log(`✅ ${result.count} Reservierungen zu Branch "Manila" migriert`);
    console.log('\n✅ Migration abgeschlossen!');

  } catch (error) {
    console.error('❌ Fehler bei Migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateReservationsToManila();
```

**Wichtig:**
- Migration muss **NACH** Schema-Migration (Phase 1) ausgeführt werden
- Migration muss **VOR** Service-Änderungen (Phase 3) ausgeführt werden
- Alle bestehenden Reservierungen erhalten `branchId` von Branch "Manila"

---

## 16. Entscheidungen getroffen ✅

### 16.1 Berechtigungen
- ✅ **Rollenbasierte Branch-Berechtigungen**
- Neue Berechtigungen: `table_reservations_all_branches` vs `table_reservations_own_branch`
- Admin-Rollen: Alle Reservierungen sehen
- User-Rollen: Nur Reservierungen des aktuellen Branches sehen
- Implementierung in `getAllReservations()` Controller

### 16.2 Email-Settings
- ✅ **Email-Settings MÜSSEN pro Branch sein**
- `Branch.emailSettings` Feld hinzufügen
- `emailService.ts` erweitern (Branch-Support)
- `emailReadingService.ts` erweitern (Branch-Support)
- Verschlüsselung für `smtpPass` und `imap.password`

### 16.3 Migration bestehender Reservierungen
- ✅ **Alle bestehenden Reservierungen → Branch "Manila"**

### 16.4 SIRE-Integration entfernt ✅
- **Entscheidung:** SIRE-Integration wird nicht mehr benötigt
- **Entfernte Komponenten:**
  - `backend/src/services/sireService.ts` (Datei gelöscht)
  - `backend/prisma/schema.prisma`: `Branch.sireSettings` Feld entfernt
  - `backend/src/validation/organizationSettingsSchema.ts`: `sireSchema` entfernt
  - `backend/src/utils/urlValidation.ts`: SIRE URL-Validierung entfernt
  - `backend/src/controllers/lobbyPmsController.ts`: `registerSire()`, `getSireStatus()` entfernt
  - `backend/src/routes/lobbyPms.ts`: SIRE-Routes entfernt
  - `frontend/src/components/BranchManagementTab.tsx`: SIRE Settings Tab entfernt

### 16.5 Backend API Erweiterung (Planungsfehler korrigiert) ✅
- **Problem:** `branchController.ts` Erweiterung wurde in Planung übersehen
- **Korrigiert:**
  - `getAllBranches()`: Alle Settings-Felder zurückgeben + Entschlüsselung
  - `updateBranch()`: Alle Settings-Felder verarbeiten + Verschlüsselung
- **Siehe Abschnitt 5.2 für Details**

### 16.6 Frontend UI-Verbesserungen ✅
- **Sidepane dynamische Breite:** `sm:min-w-[500px] sm:max-w-[600px]` (verhindert horizontalen Scroll)
- **Branch Cards Abstände:** `mb-4` entfernt, nur `space-y-4` verwendet (Standard siehe `docs/core/VIBES.md`)
- Organisation: 1 (La Familia Hostel)
- Branch: "Manila" (muss in Organisation 1 existieren)
- Migration-Script: `migrate-reservations-to-manila.ts`

---

## 17. Nächste Schritte

1. ✅ Vollständige Analyse abgeschlossen
2. ✅ Offene Fragen geklärt
3. ⏳ Implementierung starten (Phase 1: Datenbank)


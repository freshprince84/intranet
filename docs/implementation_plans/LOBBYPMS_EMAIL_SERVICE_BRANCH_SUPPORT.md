# Email-Service Branch-Support - Detaillierte Implementierung

## Überblick

Email-Settings müssen pro Branch konfigurierbar sein (nicht pro Organisation).

## Aktueller Stand

**Datei:** `backend/src/services/emailService.ts`

- `createTransporter(organizationId?: number)` - Lädt SMTP-Settings aus Organisation
- `sendEmail()`, `sendRegistrationEmail()`, `sendPasswordResetEmail()` - Alle verwenden `organizationId`

**Datei:** `backend/src/services/emailReadingService.ts`

- `loadConfigFromOrganization(organizationId: number)` - Lädt IMAP-Settings aus Organisation

## Erforderliche Änderungen

### 1. Datenbank-Schema

**Bereits geplant in:** `LOBBYPMS_BRANCH_MIGRATION_DETAILLIERT.md` - Phase 1

```prisma
model Branch {
  // ...
  emailSettings Json? // NEU: Email-Konfiguration pro Branch
}
```

### 2. emailService.ts erweitern

**Datei:** `backend/src/services/emailService.ts`

**Änderung 1: createTransporter() erweitern**
```typescript
// ALT:
const createTransporter = async (organizationId?: number) => {
  // Lädt Settings aus Organisation
}

// NEU:
const createTransporter = async (organizationId?: number, branchId?: number) => {
  let smtpHost: string | undefined;
  let smtpPort: number = 587;
  let smtpUser: string | undefined;
  let smtpPass: string | undefined;

  // 1. Versuche Branch Settings zu laden (wenn branchId gesetzt)
  if (branchId) {
    try {
      const branch = await prisma.branch.findUnique({
        where: { id: branchId },
        select: { 
          emailSettings: true, 
          organizationId: true 
        }
      });

      if (branch?.emailSettings) {
        try {
          const settings = decryptBranchApiSettings(branch.emailSettings as any);
          const emailSettings = settings?.email || settings;

          if (emailSettings?.smtpHost && emailSettings?.smtpUser && emailSettings?.smtpPass) {
            smtpHost = emailSettings.smtpHost;
            smtpPort = emailSettings.smtpPort || 587;
            smtpUser = emailSettings.smtpUser;
            smtpPass = emailSettings.smtpPass; // Bereits entschlüsselt
            console.log(`📧 Nutze Branch-spezifische SMTP-Einstellungen für Branch ${branchId}`);
            // Weiter zu Transporter-Erstellung
          }
        } catch (error) {
          console.warn(`[EMAIL] Fehler beim Laden der Branch Settings:`, error);
          // Fallback auf Organisation Settings
        }

        // Fallback: Lade Organization Settings
        if (!smtpHost && branch.organizationId) {
          organizationId = branch.organizationId;
        }
      } else if (branch?.organizationId) {
        // Branch hat keine Settings, aber Organization ID
        organizationId = branch.organizationId;
      }
    } catch (error) {
      console.warn(`[EMAIL] Fehler beim Laden der Branch Settings:`, error);
      // Fallback auf Organisation Settings
    }
  }

  // 2. Lade Organization Settings (Fallback oder wenn nur organizationId)
  if (organizationId && (!smtpHost || !smtpUser || !smtpPass)) {
    // ... bestehender Code ...
  }

  // 3. Fallback zu globalen Umgebungsvariablen
  if (!smtpHost || !smtpUser || !smtpPass) {
    // ... bestehender Code ...
  }

  // ... Transporter-Erstellung ...
}
```

**Änderung 2: sendEmail() erweitern**
```typescript
// ALT:
export const sendEmail = async (
  email: string,
  subject: string,
  html: string,
  text?: string,
  organizationId?: number
): Promise<boolean> => {
  const transporter = await createTransporter(organizationId);
  // ...
}

// NEU:
export const sendEmail = async (
  email: string,
  subject: string,
  html: string,
  text?: string,
  organizationId?: number,
  branchId?: number // NEU
): Promise<boolean> => {
  const transporter = await createTransporter(organizationId, branchId);
  // ...
}
```

**Änderung 3: sendRegistrationEmail() erweitern**
```typescript
// ALT:
export const sendRegistrationEmail = async (
  email: string,
  username: string,
  password: string,
  organizationId?: number
): Promise<boolean> => {
  const transporter = await createTransporter(organizationId);
  // ...
}

// NEU:
export const sendRegistrationEmail = async (
  email: string,
  username: string,
  password: string,
  organizationId?: number,
  branchId?: number // NEU
): Promise<boolean> => {
  const transporter = await createTransporter(organizationId, branchId);
  // ...
}
```

**Änderung 4: sendPasswordResetEmail() erweitern**
```typescript
// ALT:
export const sendPasswordResetEmail = async (
  email: string,
  username: string,
  resetLink: string,
  organizationId?: number
): Promise<boolean> => {
  const transporter = await createTransporter(organizationId);
  // ...
}

// NEU:
export const sendPasswordResetEmail = async (
  email: string,
  username: string,
  resetLink: string,
  organizationId?: number,
  branchId?: number // NEU
): Promise<boolean> => {
  const transporter = await createTransporter(organizationId, branchId);
  // ...
}
```

**Änderung 5: From-Einstellungen aus Branch-Settings**
```typescript
// In sendEmail(), sendRegistrationEmail(), sendPasswordResetEmail():
// Lade From-Einstellungen aus Branch-Settings (mit Fallback)

let fromEmail = process.env.SMTP_USER || 'noreply@intranet.local';
let fromName = 'Intranet';

if (branchId) {
  try {
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { emailSettings: true, name: true }
    });
    
    if (branch?.emailSettings) {
      const settings = decryptBranchApiSettings(branch.emailSettings as any);
      const emailSettings = settings?.email || settings;
      
      if (emailSettings?.smtpFromEmail) {
        fromEmail = emailSettings.smtpFromEmail;
      }
      if (emailSettings?.smtpFromName) {
        fromName = emailSettings.smtpFromName;
      } else if (branch.name) {
        fromName = branch.name;
      }
    }
  } catch (error) {
    console.warn('⚠️ Fehler beim Laden der Branch-From-Einstellungen:', error);
  }
}

// Fallback auf Organisation (bestehender Code)
if (organizationId && fromEmail === (process.env.SMTP_USER || 'noreply@intranet.local')) {
  // ... bestehender Code ...
}
```

### 3. emailReadingService.ts erweitern

**Datei:** `backend/src/services/emailReadingService.ts`

**Änderung: loadConfigFromBranch() hinzufügen**
```typescript
/**
 * Lädt Email-Konfiguration aus Branch-Settings
 */
static async loadConfigFromBranch(branchId: number): Promise<EmailConfig | null> {
  try {
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { 
        emailSettings: true, 
        organizationId: true 
      }
    });

    if (!branch?.emailSettings) {
      // Fallback: Lade aus Organisation
      if (branch?.organizationId) {
        return await this.loadConfigFromOrganization(branch.organizationId);
      }
      return null;
    }

    const branchSettings = decryptBranchApiSettings(branch.emailSettings as any);
    const emailSettings = branchSettings?.email || branchSettings;
    const imapConfig = emailSettings?.imap;

    if (!imapConfig || !imapConfig.enabled || !imapConfig.host || !imapConfig.user || !imapConfig.password) {
      // Fallback: Lade aus Organisation
      if (branch.organizationId) {
        return await this.loadConfigFromOrganization(branch.organizationId);
      }
      return null;
    }

    return {
      host: imapConfig.host,
      port: imapConfig.port || (imapConfig.secure ? 993 : 143),
      secure: imapConfig.secure !== false,
      user: imapConfig.user,
      password: imapConfig.password, // Bereits entschlüsselt
      folder: imapConfig.folder || 'INBOX',
      processedFolder: imapConfig.processedFolder
    };
  } catch (error) {
    console.error(`[EmailReading] Fehler beim Laden der Konfiguration für Branch ${branchId}:`, error);
    // Fallback: Lade aus Organisation
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { organizationId: true }
    });
    if (branch?.organizationId) {
      return await this.loadConfigFromOrganization(branch.organizationId);
    }
    return null;
  }
}
```

### 4. Verwendungsstellen ändern

**Reservation-bezogene Email-Aufrufe:**

1. **`backend/src/services/reservationNotificationService.ts`**
   - Alle `sendEmail()` Aufrufe müssen `reservation.branchId` übergeben
   - Beispiel: `sendEmail(..., reservation.organizationId, reservation.branchId)`

2. **`backend/src/controllers/authController.ts`**
   - `sendRegistrationEmail()` - Kann `branchId` optional übergeben (wenn User Branch zugeordnet)

3. **`backend/src/controllers/passwordResetController.ts`**
   - `sendPasswordResetEmail()` - Kann `branchId` optional übergeben

**Email-Reading (Email-Import):**

- **WICHTIG:** Email-Import wird durch LobbyPMS API-Import ersetzt
- `EmailReservationScheduler` wird deaktiviert
- Falls Email-Reading weiterhin genutzt wird: Muss pro Branch konfiguriert werden

### 5. Frontend: Email-Settings Tab

**Datei:** `frontend/src/components/BranchManagementTab.tsx`

**Neuer Tab: Email Settings**

- SMTP Host
- SMTP Port
- SMTP User
- SMTP Pass (verschlüsselt speichern)
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

### 6. Verschlüsselung

**Bereits geplant in:** `LOBBYPMS_BRANCH_MIGRATION_DETAILLIERT.md` - Abschnitt 5

- `encryptBranchApiSettings()` erweitern für `smtpPass` und `imap.password`
- `decryptBranchApiSettings()` erweitern für `smtpPass` und `imap.password`

### 7. Validierung

**Bereits geplant in:** `LOBBYPMS_BRANCH_MIGRATION_DETAILLIERT.md` - Abschnitt 6

- `branchEmailSettingsSchema` Zod-Schema erstellen

## Zusammenfassung

- ✅ `Branch.emailSettings` Feld hinzufügen
- ✅ `emailService.ts` erweitern (Branch-Support)
- ✅ `emailReadingService.ts` erweitern (Branch-Support)
- ✅ Alle Email-Aufrufe `branchId` übergeben
- ✅ Frontend: Email-Settings Tab
- ✅ Verschlüsselung für Email-Settings
- ✅ Validierung für Email-Settings


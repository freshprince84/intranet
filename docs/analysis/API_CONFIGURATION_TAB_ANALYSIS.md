# Analyse: API Configuration Tab

## Datum
2024-12-19

## Überblick
Diese Analyse vergleicht die Implementierung des `ApiConfigurationTab` mit den bestehenden Standards, Dokumentation und Code-Patterns.

---

## ✅ Standards eingehalten

### Design-Standards
- ✅ Konsistente Border-Styling (`border border-gray-200 dark:border-gray-700 rounded-lg p-4`)
- ✅ Dark Mode Support vollständig implementiert
- ✅ Formularelemente folgen den Design-Standards
- ✅ Secret-Input-Komponente mit Show/Hide-Toggle (gut implementiert)
- ✅ Button-Styling konsistent mit anderen Tabs

### Coding-Standards
- ✅ TypeScript-Interfaces definiert (`Props`)
- ✅ Import-Pfade mit `.ts/.tsx` Suffix (korrekt für Frontend)
- ✅ Fehlerbehandlung mit try-catch
- ✅ Loading-States implementiert
- ✅ i18n-Integration vorhanden

---

## ⚠️ Risiken und Probleme

### 🔴 KRITISCH: Sicherheit

#### 1. Keine Verschlüsselung der API-Keys
**Problem:**
- API-Keys werden als Klartext in der Datenbank gespeichert (JSONB-Feld)
- Keine Verschlüsselung auf Datenbankebene sichtbar
- Bei Datenbankzugriff könnten alle Secrets kompromittiert werden

**Risiko:** HOCH
- Bei Datenbank-Leak sind alle API-Keys sichtbar
- Compliance-Probleme (DSGVO, PCI-DSS bei Payment-Keys)

**Empfehlung:**
```typescript
// Backend: Verschlüsselung vor dem Speichern
import crypto from 'crypto';

const encryptSecret = (secret: string): string => {
  const algorithm = 'aes-256-gcm';
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  // ... Verschlüsselung
};

const decryptSecret = (encrypted: string): string => {
  // ... Entschlüsselung
};
```

#### 2. Keine Validierung der API-URLs
**Problem:**
- URLs werden nicht validiert
- Könnte SSRF (Server-Side Request Forgery) ermöglichen
- Keine Prüfung auf gültige Domains

**Risiko:** MITTEL-HOCH

**Empfehlung:**
```typescript
// Frontend: URL-Validierung
const validateUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    const allowedDomains = [
      'app.lobbypms.com',
      'open.ttlock.com',
      'api.sire.gov.co',
      // ... weitere erlaubte Domains
    ];
    return allowedDomains.some(domain => parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
};
```

#### 3. Keine Berechtigungsprüfung im Frontend
**Problem:**
- Keine `usePermissions` Hook-Verwendung sichtbar
- Tab ist nur durch `selectedCountry === 'CO'` geschützt
- Keine Prüfung, ob User `organization_management` (write) Berechtigung hat

**Risiko:** MITTEL

**Empfehlung:**
```typescript
import { usePermissions } from '../../hooks/usePermissions.ts';

const ApiConfigurationTab: React.FC<Props> = ({ organization, onSave }) => {
  const { canManageOrganization } = usePermissions();
  
  if (!canManageOrganization()) {
    return <div>Keine Berechtigung</div>;
  }
  // ...
};
```

### 🟡 MITTEL: Validierung

#### 4. Keine Frontend-Validierung
**Problem:**
- Keine Validierung der Pflichtfelder vor dem Submit
- SMTP-Tab hat Validierung (`if (!smtpSettings.smtpHost || ...)`)
- API-Tab hat keine Validierung

**Risiko:** NIEDRIG-MITTEL

**Empfehlung:**
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Validierung
  if (apiSettings.lobbyPmsSyncEnabled && !apiSettings.lobbyPmsApiUrl) {
    showMessage(t('organization.api.validation.apiUrlRequired'), 'error');
    return;
  }
  
  if (apiSettings.lobbyPmsSyncEnabled && !apiSettings.lobbyPmsApiKey) {
    showMessage(t('organization.api.validation.apiKeyRequired'), 'error');
    return;
  }
  
  // ... weitere Validierungen
};
```

#### 5. Backend-Validierung zu permissiv
**Problem:**
- `settings: z.record(z.any()).optional()` akzeptiert alles
- Keine Struktur-Validierung für API-Settings
- Keine Prüfung auf gültige Werte

**Risiko:** MITTEL

**Empfehlung:**
```typescript
// Backend: Spezifisches Schema für API-Settings
const apiSettingsSchema = z.object({
  lobbyPms: z.object({
    apiUrl: z.string().url().optional(),
    apiKey: z.string().min(1).optional(),
    propertyId: z.string().optional(),
    syncEnabled: z.boolean().optional(),
    autoCreateTasks: z.boolean().optional(),
    lateCheckInThreshold: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  }).optional(),
  doorSystem: z.object({
    provider: z.enum(['ttlock']).optional(),
    apiUrl: z.string().url().optional(),
    clientId: z.string().optional(),
    clientSecret: z.string().optional(),
  }).optional(),
  // ... weitere Schemas
});
```

### 🟢 NIEDRIG: Konsistenz und UX

#### 6. Fehlender "Clear"-Button
**Problem:**
- SMTP-Tab hat `handleClear()` Funktion
- API-Tab hat keinen Clear-Button
- Inkonsistente UX

**Empfehlung:**
```typescript
const handleClear = () => {
  setApiSettings({
    lobbyPmsApiUrl: '',
    lobbyPmsApiKey: '',
    // ... alle Felder zurücksetzen
  });
};

// Im JSX:
<button type="button" onClick={handleClear} className="...">
  {t('common.clear')}
</button>
```

#### 7. Fehlende Test-Buttons
**Problem:**
- Keine Möglichkeit, API-Verbindungen zu testen
- User weiß nicht, ob Konfiguration funktioniert
- SMTP-Tab hat auch keine Test-Funktion (konsistent, aber könnte verbessert werden)

**Empfehlung:**
```typescript
const testConnection = async (service: 'lobbyPms' | 'ttlock' | 'sire' | 'boldPayment') => {
  try {
    setTesting(service);
    const response = await axiosInstance.post('/api/organization/test-connection', {
      service,
      settings: apiSettings
    });
    showMessage(t('organization.api.testSuccess'), 'success');
  } catch (error) {
    showMessage(t('organization.api.testError'), 'error');
  } finally {
    setTesting(null);
  }
};
```

#### 8. TypeScript-Typisierung verbessern
**Problem:**
- `settings as any` wird verwendet
- Keine explizite Typisierung für `OrganizationSettings`

**Empfehlung:**
```typescript
// frontend/src/types/organization.ts
export interface OrganizationSettings {
  lobbyPms?: {
    apiUrl?: string;
    apiKey?: string;
    propertyId?: string;
    syncEnabled?: boolean;
    autoCreateTasks?: boolean;
    lateCheckInThreshold?: string;
  };
  doorSystem?: {
    provider?: 'ttlock';
    apiUrl?: string;
    clientId?: string;
    clientSecret?: string;
  };
  sire?: {
    apiUrl?: string;
    apiKey?: string;
    apiSecret?: string;
    enabled?: boolean;
    autoRegisterOnCheckIn?: boolean;
    propertyCode?: string;
  };
  boldPayment?: {
    apiKey?: string;
    merchantId?: string;
    environment?: 'sandbox' | 'production';
  };
}

// In ApiConfigurationTab.tsx:
const settings = organization.settings as OrganizationSettings;
```

---

## 📋 Vergleich mit SMTPConfigurationTab

### Ähnlichkeiten ✅
- Beide verwenden ähnliche Struktur
- Beide haben Secret-Input-Komponenten
- Beide verwenden `organizationService.updateOrganization()`
- Beide haben Loading-States

### Unterschiede ⚠️
| Feature | SMTP Tab | API Tab | Empfehlung |
|---------|----------|---------|------------|
| Validierung | ✅ Pflichtfelder | ❌ Keine | API Tab sollte Validierung haben |
| Clear-Button | ✅ Vorhanden | ❌ Fehlt | API Tab sollte Clear-Button haben |
| Berechtigung | ❓ Nicht sichtbar | ❌ Fehlt | Beide sollten Berechtigung prüfen |

---

## 🔍 Fehlende Features

### 1. API-Verbindungstest
- Keine Möglichkeit, Konfiguration zu testen
- User muss speichern und hoffen, dass es funktioniert

### 2. Validierungs-Feedback
- Keine visuelle Markierung für ungültige Felder
- Keine Inline-Validierung

### 3. Dokumentations-Links
- Keine Links zu API-Dokumentationen
- User muss selbst suchen

### 4. Environment-Hinweise
- Bold Payment hat Environment-Auswahl
- Aber keine Warnung bei Production-Modus

---

## ✅ Empfohlene Verbesserungen (Priorität)

### 🔴 HOCH (Sicherheit)
1. **Verschlüsselung der API-Keys** - Implementieren vor Produktion
2. **URL-Validierung** - SSRF-Schutz
3. **Berechtigungsprüfung** - Frontend + Backend

### 🟡 MITTEL (Validierung & Konsistenz)
4. **Frontend-Validierung** - Pflichtfelder prüfen
5. **Backend-Schema-Validierung** - Strukturierte Validierung
6. **Clear-Button** - Konsistenz mit SMTP-Tab

### 🟢 NIEDRIG (UX)
7. **Test-Buttons** - API-Verbindungen testen
8. **TypeScript-Typisierung** - `OrganizationSettings` Interface
9. **Dokumentations-Links** - Hilfreiche Links zu APIs

---

## 📝 Code-Beispiele für Verbesserungen

### 1. Verschlüsselung (Backend)
```typescript
// backend/src/utils/encryption.ts
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!;
const ALGORITHM = 'aes-256-gcm';

export const encrypt = (text: string): string => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
};

export const decrypt = (encryptedText: string): string => {
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    Buffer.from(ivHex, 'hex')
  );
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};
```

### 2. URL-Validierung (Frontend)
```typescript
// frontend/src/utils/urlValidation.ts
const ALLOWED_DOMAINS = {
  lobbyPms: ['app.lobbypms.com'],
  ttlock: ['open.ttlock.com'],
  sire: ['api.sire.gov.co'],
  boldPayment: ['api.bold.co', 'sandbox.bold.co'],
};

export const validateApiUrl = (url: string, service: keyof typeof ALLOWED_DOMAINS): boolean => {
  try {
    const parsed = new URL(url);
    return ALLOWED_DOMAINS[service].some(domain => 
      parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
};
```

### 3. Berechtigungsprüfung (Frontend)
```typescript
// In ApiConfigurationTab.tsx
import { usePermissions } from '../../hooks/usePermissions.ts';

const ApiConfigurationTab: React.FC<Props> = ({ organization, onSave }) => {
  const { canManageOrganization, loading: permissionsLoading } = usePermissions();
  
  if (permissionsLoading) {
    return <div>Loading...</div>;
  }
  
  if (!canManageOrganization()) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">{t('organization.api.noPermission')}</p>
      </div>
    );
  }
  
  // ... Rest der Komponente
};
```

---

## 🎯 Zusammenfassung

### Was gut ist:
- ✅ Design-Standards eingehalten
- ✅ Dark Mode Support
- ✅ Secret-Input-Komponente gut implementiert
- ✅ Konsistente Struktur mit anderen Tabs

### Was verbessert werden muss:
- 🔴 **KRITISCH**: Verschlüsselung der API-Keys
- 🔴 **KRITISCH**: URL-Validierung (SSRF-Schutz)
- 🟡 **WICHTIG**: Berechtigungsprüfung
- 🟡 **WICHTIG**: Frontend-Validierung
- 🟢 **NICE-TO-HAVE**: Clear-Button, Test-Buttons, bessere Typisierung

### Nächste Schritte:
1. Verschlüsselung implementieren (Backend)
2. URL-Validierung hinzufügen (Frontend + Backend)
3. Berechtigungsprüfung hinzufügen (Frontend)
4. Validierung implementieren (Frontend + Backend)
5. Clear-Button hinzufügen (Frontend)
6. TypeScript-Typisierung verbessern (Frontend)



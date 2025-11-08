# MITARBEITERLEBENSZYKLUS - Detaillierte Komponenten-Spezifikationen

## Dokumentationsstatus
- **Erstellt am**: 2025-01-XX
- **Status**: Detaillierte Ausarbeitung
- **Version**: 1.0
- **Zweck**: Vollständige Spezifikation aller Komponenten mit Code-Integration und bestehenden Standards

## Inhaltsverzeichnis

1. [Integration mit bestehendem Code](#integration-mit-bestehendem-code)
2. [API-Endpunkte](#api-endpunkte)
3. [Frontend-Komponenten - Detaillierte Spezifikationen](#frontend-komponenten---detaillierte-spezifikationen)
4. [Backend-Integration](#backend-integration)
5. [Bestehende Komponenten - Erweiterungen](#bestehende-komponenten---erweiterungen)
6. [Sicherstellung - Keine Breaking Changes](#sicherstellung---keine-breaking-changes)

---

## Integration mit bestehendem Code

### Bestehende Patterns und Standards

#### 1. Tab-Implementierung

**Bestehende Implementierung** (siehe `Profile.tsx` und `UserManagementTab.tsx`):

```52:52:frontend/src/pages/Profile.tsx
  const [activeTab, setActiveTab] = useState<'profile' | 'documents'>('profile');
```

```80:80:frontend/src/components/UserManagementTab.tsx
  const [activeUserTab, setActiveUserTab] = useState<'details' | 'documents' | 'roles'>('details');
```

**Tab-Navigation Pattern**:
```tsx
<div className="border-b border-gray-200 dark:border-gray-700">
  <nav className="-mb-px flex space-x-8">
    <button
      onClick={() => setActiveTab('tab1')}
      className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
        activeTab === 'tab1'
          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
      }`}
    >
      Tab 1
    </button>
  </nav>
</div>
```

**Integration für neue Tabs**:
- `Profile.tsx`: Erweitere `activeTab` um `'lifecycle' | 'myDocuments'`
- `UserManagementTab.tsx`: Erweitere `activeUserTab` um `'lifecycle'`

#### 2. Modal/Sidepane Pattern

**Bestehende Implementierung** (siehe `CreateTaskModal.tsx` und `EditOrganizationModal.tsx`):

```80:150:frontend/src/components/CreateTaskModal.tsx
const CreateTaskModal = ({ isOpen, onClose, onTaskCreated }: CreateTaskModalProps) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { openSidepane, closeSidepane } = useSidepane();
    const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth > 1070);
    
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [assigneeType, setAssigneeType] = useState<'user' | 'role'>('user');
    const [responsibleId, setResponsibleId] = useState<number | ''>('');
    const [roleId, setRoleId] = useState<number | ''>('');
    const [qualityControlId, setQualityControlId] = useState<number | ''>('');
    const [branchId, setBranchId] = useState<number | ''>('');
    const [dueDate, setDueDate] = useState('');
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
    const [selectedArticles, setSelectedArticles] = useState<CerebroArticle[]>([]);
    const [activeTab, setActiveTab] = useState<'data' | 'cerebro'>('data');
    const [temporaryAttachments, setTemporaryAttachments] = useState<TaskAttachment[]>([]);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
```

**WICHTIG**: Alle neuen Modals müssen dieses Pattern befolgen:
- Mobile (<640px): Klassisches Modal mit Overlay
- Desktop (≥640px, ≤1070px): Sidepane MIT Overlay
- Large Desktop (>1070px): Sidepane OHNE Overlay
- Position: `top-16` (beginnt unter Topbar)
- Animation: `transform transition-transform duration-350 ease-out` mit `cubic-bezier(0.25, 0.46, 0.45, 0.94)`

#### 3. File-Upload Pattern

**Bestehende Implementierung** (siehe `EditTaskModal.tsx`):

```751:756:frontend/src/components/EditTaskModal.tsx
                            <input
                                ref={fileInputRef}
                                type="file"
                                onChange={handleFileUpload}
                                className="hidden"
                            />
```

**Pattern für neue File-Uploads**:
- Verstecktes `<input type="file">` mit `ref={fileInputRef}`
- Button zum Öffnen: `onClick={() => fileInputRef.current?.click()}`
- Upload-Handler: `handleFileUpload` mit `FormData` und `axiosInstance.post`

#### 4. PDF-Vorschau Pattern

**Bestehende Implementierung** (siehe `MarkdownPreview.tsx`):

```295:318:frontend/src/components/MarkdownPreview.tsx
            ) : isPdf ? (
              // PDF-Vorschau
              <div className="p-3">
                <div className="flex items-center mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm font-medium dark:text-gray-200">{attachment.alt}</span>
                  <a 
                    href={url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="ml-auto text-blue-600 dark:text-blue-400 hover:underline text-sm"
                  >
                    Öffnen
                  </a>
                </div>
                <iframe 
                  src={`${url}#view=FitH`} 
                  className="w-full rounded border dark:border-gray-600"
                  style={{ height: '400px' }}
                  title={attachment.alt}
                />
              </div>
```

**Pattern für PDF-Vorschau in neuen Komponenten**:
- Verwende `<iframe>` mit `src={pdfUrl}#view=FitH`
- Höhe: `400px` oder `max-h-96` für responsive
- Download-Link zusätzlich anbieten

#### 5. Container-Struktur Pattern

**Bestehende Implementierung** (siehe `Profile.tsx`):

```207:208:frontend/src/pages/Profile.tsx
    <div className="min-h-screen dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-0 px-2 -mt-6 sm:-mt-3 lg:-mt-3 sm:px-4 lg:px-6">
```

**Standard-Box-Struktur**:
```tsx
<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
  {/* Box-Inhalt */}
</div>
```

**WICHTIG**: Alle neuen Komponenten müssen diese Container-Struktur befolgen!

---

## API-Endpunkte

### Neue Endpunkte in `frontend/src/config/api.ts`

```typescript
// Erweitere API_ENDPOINTS
export const API_ENDPOINTS = {
  // ... bestehende Endpunkte ...
  
  // Mitarbeiterlebenszyklus
  EMPLOYEE_LIFECYCLE: {
    // User-spezifische Endpunkte
    BY_USER: (userId: number) => `/users/${userId}/lifecycle`,
    STATUS: (userId: number) => `/users/${userId}/lifecycle/status`,
    UPDATE_STATUS: (userId: number) => `/users/${userId}/lifecycle/status`,
    
    // Dokumente
    CERTIFICATES: (userId: number) => `/users/${userId}/lifecycle/certificates`,
    CERTIFICATE: (userId: number, certificateId: number) => `/users/${userId}/lifecycle/certificates/${certificateId}`,
    CERTIFICATE_GENERATE: (userId: number) => `/users/${userId}/lifecycle/certificates/generate`,
    CERTIFICATE_DOWNLOAD: (userId: number, certificateId: number) => `/users/${userId}/lifecycle/certificates/${certificateId}/download`,
    
    CONTRACTS: (userId: number) => `/users/${userId}/lifecycle/contracts`,
    CONTRACT: (userId: number, contractId: number) => `/users/${userId}/lifecycle/contracts/${contractId}`,
    CONTRACT_GENERATE: (userId: number) => `/users/${userId}/lifecycle/contracts/generate`,
    CONTRACT_DOWNLOAD: (userId: number, contractId: number) => `/users/${userId}/lifecycle/contracts/${contractId}/download`,
    
    // Sozialversicherungen
    SOCIAL_SECURITY: (userId: number) => `/users/${userId}/lifecycle/social-security`,
    SOCIAL_SECURITY_UPDATE: (userId: number, type: string) => `/users/${userId}/lifecycle/social-security/${type}`,
    
    // Tasks (automatisch erstellt)
    TASKS: (userId: number) => `/users/${userId}/lifecycle/tasks`,
  },
  
  // Organisation-spezifische Endpunkte
  ORGANIZATIONS: {
    // ... bestehende Endpunkte ...
    LIFECYCLE_ROLES: '/organizations/current/lifecycle-roles',
    DOCUMENT_TEMPLATES: '/organizations/current/document-templates',
    DOCUMENT_SIGNATURES: '/organizations/current/document-signatures',
    DOCUMENT_SETTINGS: '/organizations/current/document-settings',
  },
};
```

### Backend-Routen (zu erstellen)

**Datei**: `backend/src/routes/users.ts` (erweitern)

```typescript
// Neue Routen hinzufügen
router.get('/:id/lifecycle', organizationMiddleware, lifecycleController.getLifecycle);
router.get('/:id/lifecycle/status', organizationMiddleware, lifecycleController.getStatus);
router.put('/:id/lifecycle/status', organizationMiddleware, lifecycleController.updateStatus);

// Dokumente
router.get('/:id/lifecycle/certificates', organizationMiddleware, lifecycleController.getCertificates);
router.post('/:id/lifecycle/certificates/generate', organizationMiddleware, lifecycleController.generateCertificate);
router.get('/:id/lifecycle/certificates/:certificateId', organizationMiddleware, lifecycleController.getCertificate);
router.get('/:id/lifecycle/certificates/:certificateId/download', organizationMiddleware, lifecycleController.downloadCertificate);
router.put('/:id/lifecycle/certificates/:certificateId', organizationMiddleware, lifecycleController.updateCertificate);

// Verträge (identisch zu Certificates)
router.get('/:id/lifecycle/contracts', organizationMiddleware, lifecycleController.getContracts);
router.post('/:id/lifecycle/contracts/generate', organizationMiddleware, lifecycleController.generateContract);
// ... etc.
```

**Datei**: `backend/src/routes/organizations.ts` (erweitern)

```typescript
// Neue Routen hinzufügen
router.get('/current/lifecycle-roles', organizationMiddleware, organizationController.getLifecycleRoles);
router.put('/current/lifecycle-roles', organizationMiddleware, organizationController.updateLifecycleRoles);

router.get('/current/document-templates', organizationMiddleware, organizationController.getDocumentTemplates);
router.post('/current/document-templates', organizationMiddleware, organizationController.uploadDocumentTemplate);

router.get('/current/document-signatures', organizationMiddleware, organizationController.getDocumentSignatures);
router.post('/current/document-signatures', organizationMiddleware, organizationController.uploadDocumentSignature);

router.get('/current/document-settings', organizationMiddleware, organizationController.getDocumentSettings);
router.put('/current/document-settings', organizationMiddleware, organizationController.updateDocumentSettings);
```

---

## Frontend-Komponenten - Detaillierte Spezifikationen

### 1. Profile.tsx - Erweiterung

**Datei**: `frontend/src/pages/Profile.tsx`

**Änderungen**:
1. Erweitere `activeTab` State:
```typescript
const [activeTab, setActiveTab] = useState<'profile' | 'documents' | 'lifecycle' | 'myDocuments'>('profile');
```

2. Füge neue Tab-Buttons hinzu (nach Zeile 252):
```tsx
<button
  onClick={() => setActiveTab('lifecycle')}
  className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
    activeTab === 'lifecycle'
      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
  }`}
>
  <UserCircleIcon className="h-5 w-5 inline mr-2" />
  {t('profile.lifecycle')}
</button>
<button
  onClick={() => setActiveTab('myDocuments')}
  className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
    activeTab === 'myDocuments'
      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
  }`}
>
  <DocumentTextIcon className="h-5 w-5 inline mr-2" />
  {t('profile.myDocuments')}
</button>
```

3. Füge Tab-Content hinzu (nach Zeile 538):
```tsx
{activeTab === 'lifecycle' && user && (
  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
    <LifecycleTab userId={user.id} />
  </div>
)}

{activeTab === 'myDocuments' && user && (
  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
    <MyDocumentsTab userId={user.id} />
  </div>
)}
```

**WICHTIG**: Bestehende Tabs (`'profile'` und `'documents'`) bleiben unverändert!

---

### 2. UserManagementTab.tsx - Erweiterung

**Datei**: `frontend/src/components/UserManagementTab.tsx`

**Änderungen**:
1. Erweitere `activeUserTab` State (Zeile 80):
```typescript
const [activeUserTab, setActiveUserTab] = useState<'details' | 'documents' | 'roles' | 'lifecycle'>('details');
```

2. Füge neuen Tab-Button hinzu (nach Zeile 575):
```tsx
<button
  onClick={() => setActiveUserTab('lifecycle')}
  className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
    activeUserTab === 'lifecycle'
      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
  }`}
>
  <UserCircleIcon className="h-5 w-5 inline mr-2" />
  {t('users.lifecycle')}
</button>
```

3. Füge Tab-Content hinzu (nach Zeile 853):
```tsx
{activeUserTab === 'lifecycle' && selectedUser && (
  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
    <LifecycleView userId={selectedUser.id} />
  </div>
)}
```

**WICHTIG**: Bestehende Tabs (`'details'`, `'documents'`, `'roles'`) bleiben unverändert!

---

### 3. EditOrganizationModal.tsx - Erweiterung

**Datei**: `frontend/src/components/organization/EditOrganizationModal.tsx`

**Änderungen**:
1. Füge Tab-State hinzu (nach Zeile 35):
```typescript
const [activeTab, setActiveTab] = useState<'general' | 'smtp' | 'roles' | 'documents'>('general');
```

2. Erweitere Modal-Header (nach Zeile 376) um Tab-Navigation:
```tsx
<div className="border-b border-gray-200 dark:border-gray-700">
  <nav className="-mb-px flex space-x-4" aria-label="Tabs">
    <button
      type="button"
      onClick={() => setActiveTab('general')}
      className={`${
        activeTab === 'general'
          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
      } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
    >
      {t('organization.tabs.general')}
    </button>
    <button
      type="button"
      onClick={() => setActiveTab('smtp')}
      className={`${
        activeTab === 'smtp'
          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
      } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
    >
      {t('organization.tabs.smtp')}
    </button>
    <button
      type="button"
      onClick={() => setActiveTab('roles')}
      className={`${
        activeTab === 'roles'
          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
      } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
    >
      {t('organization.tabs.roles')}
    </button>
    <button
      type="button"
      onClick={() => setActiveTab('documents')}
      className={`${
        activeTab === 'documents'
          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
      } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
    >
      {t('organization.tabs.documents')}
    </button>
  </nav>
</div>
```

3. Ersetze Formular-Inhalt durch Tab-Content:
```tsx
<div className="p-4 overflow-y-auto flex-1 min-h-0">
  {activeTab === 'general' && (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Bestehender Formular-Inhalt */}
    </form>
  )}
  
  {activeTab === 'smtp' && (
    <div>
      {/* SMTP-Einstellungen (falls vorhanden) */}
    </div>
  )}
  
  {activeTab === 'roles' && (
    <RoleConfigurationTab 
      organization={organization}
      onSave={handleSubmit}
    />
  )}
  
  {activeTab === 'documents' && (
    <DocumentConfigurationTab 
      organization={organization}
      onSave={handleSubmit}
    />
  )}
</div>
```

**WICHTIG**: Bestehende Funktionalität (`'general'` Tab) bleibt unverändert!

---

### 4. EditTaskModal.tsx - Erweiterung

**Datei**: `frontend/src/components/EditTaskModal.tsx`

**Änderungen**:
1. Prüfe ob Task ein Lebenszyklus-Task ist (nach Zeile 677):
```typescript
const isLifecycleTask = task.title?.includes('ARL') || 
                        task.title?.includes('EPS') || 
                        task.title?.includes('Pension') || 
                        task.title?.includes('Caja') ||
                        task.description?.includes('lifecycle');
```

2. Füge neue Boxen für Lebenszyklus-Tasks hinzu (nach Tab-Content, vor Submit-Button):
```tsx
{isLifecycleTask && (
  <>
    <TaskDataBox task={task} />
    <EmailTemplateBox task={task} />
    <SocialSecurityCompletionBox task={task} onComplete={handleTaskComplete} />
  </>
)}
```

**WICHTIG**: Bestehende Funktionalität bleibt unverändert! Neue Boxen werden nur angezeigt, wenn Task ein Lebenszyklus-Task ist.

---

## Neue Komponenten - Detaillierte Spezifikationen

### 1. LifecycleTab.tsx

**Datei**: `frontend/src/components/profile/LifecycleTab.tsx` (NEU)

**Zweck**: Lebenszyklus-Status im Profil anzeigen (Mitarbeiter)

**Props**:
```typescript
interface LifecycleTabProps {
  userId: number;
}
```

**Struktur**:
```tsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../config/axios.ts';
import { API_ENDPOINTS } from '../../config/api.ts';
import OnboardingProgressBar from '../lifecycle/OnboardingProgressBar.tsx';
import SocialSecurityStatusBox from '../lifecycle/SocialSecurityStatusBox.tsx';

const LifecycleTab: React.FC<LifecycleTabProps> = ({ userId }) => {
  const { t } = useTranslation();
  const [lifecycle, setLifecycle] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLifecycle();
  }, [userId]);

  const loadLifecycle = async () => {
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.EMPLOYEE_LIFECYCLE.BY_USER(userId));
      setLifecycle(response.data);
    } catch (error) {
      console.error('Fehler beim Laden des Lebenszyklus:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Laden...</div>;
  }

  return (
    <div className="space-y-6">
      <OnboardingProgressBar lifecycle={lifecycle} />
      <SocialSecurityStatusBox lifecycle={lifecycle} />
    </div>
  );
};

export default LifecycleTab;
```

**Container-Struktur**: Keine zusätzliche Box (wird bereits von `Profile.tsx` bereitgestellt)

---

### 2. MyDocumentsTab.tsx

**Datei**: `frontend/src/components/profile/MyDocumentsTab.tsx` (NEU)

**Zweck**: Eigene Dokumente anzeigen (Mitarbeiter)

**Props**:
```typescript
interface MyDocumentsTabProps {
  userId: number;
}
```

**Struktur**:
```tsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../config/axios.ts';
import { API_ENDPOINTS } from '../../config/api.ts';
import CertificateList from '../lifecycle/CertificateList.tsx';
import ContractList from '../lifecycle/ContractList.tsx';

const MyDocumentsTab: React.FC<MyDocumentsTabProps> = ({ userId }) => {
  const { t } = useTranslation();
  const [certificates, setCertificates] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, [userId]);

  const loadDocuments = async () => {
    try {
      const [certsRes, contractsRes] = await Promise.all([
        axiosInstance.get(API_ENDPOINTS.EMPLOYEE_LIFECYCLE.CERTIFICATES(userId)),
        axiosInstance.get(API_ENDPOINTS.EMPLOYEE_LIFECYCLE.CONTRACTS(userId))
      ]);
      setCertificates(certsRes.data);
      setContracts(contractsRes.data);
    } catch (error) {
      console.error('Fehler beim Laden der Dokumente:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Laden...</div>;
  }

  return (
    <div className="space-y-6">
      <CertificateList certificates={certificates} userId={userId} readOnly={true} />
      <ContractList contracts={contracts} userId={userId} readOnly={true} />
    </div>
  );
};

export default MyDocumentsTab;
```

**Container-Struktur**: Keine zusätzliche Box (wird bereits von `Profile.tsx` bereitgestellt)

---

### 3. LifecycleView.tsx

**Datei**: `frontend/src/components/user/LifecycleView.tsx` (NEU)

**Zweck**: Lebenszyklus-Status im User-Detail anzeigen (HR/Admin)

**Props**:
```typescript
interface LifecycleViewProps {
  userId: number;
}
```

**Struktur**:
```tsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '../../hooks/usePermissions.ts';
import axiosInstance from '../../config/axios.ts';
import { API_ENDPOINTS } from '../../config/api.ts';
import { PlusIcon } from '@heroicons/react/24/outline';
import CertificateList from '../lifecycle/CertificateList.tsx';
import ContractList from '../lifecycle/ContractList.tsx';
import CertificateCreationModal from '../lifecycle/CertificateCreationModal.tsx';
import ContractCreationModal from '../lifecycle/ContractCreationModal.tsx';
import OnboardingProgressBar from '../lifecycle/OnboardingProgressBar.tsx';
import SocialSecurityStatusBox from '../lifecycle/SocialSecurityStatusBox.tsx';

const LifecycleView: React.FC<LifecycleViewProps> = ({ userId }) => {
  const { t } = useTranslation();
  const { isHR } = usePermissions();
  const [lifecycle, setLifecycle] = useState<any>(null);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      const [lifecycleRes, certsRes, contractsRes] = await Promise.all([
        axiosInstance.get(API_ENDPOINTS.EMPLOYEE_LIFECYCLE.BY_USER(userId)),
        axiosInstance.get(API_ENDPOINTS.EMPLOYEE_LIFECYCLE.CERTIFICATES(userId)),
        axiosInstance.get(API_ENDPOINTS.EMPLOYEE_LIFECYCLE.CONTRACTS(userId))
      ]);
      setLifecycle(lifecycleRes.data);
      setCertificates(certsRes.data);
      setContracts(contractsRes.data);
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Laden...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Status-Box */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold mb-4">{t('lifecycle.status')}</h3>
        <OnboardingProgressBar lifecycle={lifecycle} />
        <SocialSecurityStatusBox lifecycle={lifecycle} />
      </div>

      {/* Dokumente-Box */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{t('lifecycle.documents')}</h3>
          {isHR() && (
            <div className="flex space-x-2">
              <button
                onClick={() => setIsCertificateModalOpen(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                <PlusIcon className="h-5 w-5 inline mr-2" />
                {t('lifecycle.createCertificate')}
              </button>
              <button
                onClick={() => setIsContractModalOpen(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                <PlusIcon className="h-5 w-5 inline mr-2" />
                {t('lifecycle.createContract')}
              </button>
            </div>
          )}
        </div>
        <CertificateList certificates={certificates} userId={userId} readOnly={!isHR()} onRefresh={loadData} />
        <ContractList contracts={contracts} userId={userId} readOnly={!isHR()} onRefresh={loadData} />
      </div>

      {/* Modals */}
      {isCertificateModalOpen && (
        <CertificateCreationModal
          isOpen={isCertificateModalOpen}
          onClose={() => setIsCertificateModalOpen(false)}
          userId={userId}
          onSuccess={loadData}
        />
      )}
      {isContractModalOpen && (
        <ContractCreationModal
          isOpen={isContractModalOpen}
          onClose={() => setIsContractModalOpen(false)}
          userId={userId}
          onSuccess={loadData}
        />
      )}
    </div>
  );
};

export default LifecycleView;
```

**Container-Struktur**: Verwendet Standard-Box-Struktur für jede Sektion

---

### 4. CertificateCreationModal.tsx

**Datei**: `frontend/src/components/lifecycle/CertificateCreationModal.tsx` (NEU)

**Zweck**: Arbeitszeugnis erstellen (HR)

**Props**:
```typescript
interface CertificateCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  onSuccess?: () => void;
}
```

**Struktur** (folgt Modal/Sidepane Pattern):
```tsx
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, ArrowPathIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useSidepane } from '../../contexts/SidepaneContext.tsx';
import axiosInstance from '../../config/axios.ts';
import { API_ENDPOINTS } from '../../config/api.ts';

const CertificateCreationModal: React.FC<CertificateCreationModalProps> = ({
  isOpen,
  onClose,
  userId,
  onSuccess
}) => {
  const { t } = useTranslation();
  const { openSidepane, closeSidepane } = useSidepane();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth > 1070);
  const [activeTab, setActiveTab] = useState<'data' | 'text'>('data');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [pdfPreview, setPdfPreview] = useState<string | null>(null);

  // Sidepane-Status verwalten
  useEffect(() => {
    if (isOpen) {
      openSidepane();
    } else {
      closeSidepane();
    }
    return () => {
      closeSidepane();
    };
  }, [isOpen, openSidepane, closeSidepane]);

  // Responsive Erkennung
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 640);
      setIsLargeScreen(window.innerWidth > 1070);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Mobile: Klassisches Modal
  if (isMobile) {
    return (
      <Dialog open={isOpen} onClose={onClose} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-4xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl modal-scroll-container">
            {/* Modal-Inhalt mit Tabs */}
            {/* ... */}
          </Dialog.Panel>
        </div>
      </Dialog>
    );
  }

  // Desktop: Sidepane
  return (
    <>
      {/* Backdrop */}
      {isOpen && !isLargeScreen && (
        <div 
          className="fixed inset-0 bg-black/10 transition-opacity sidepane-overlay sidepane-backdrop z-40" 
          aria-hidden="true" 
          onClick={onClose}
          style={{
            opacity: isOpen ? 1 : 0,
            transition: 'opacity 300ms ease-out'
          }}
        />
      )}
      
      {/* Sidepane */}
      <div 
        className={`fixed top-16 bottom-0 right-0 max-w-4xl w-full bg-white dark:bg-gray-800 shadow-xl sidepane-panel sidepane-panel-container transform z-50 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{
          transition: 'transform 350ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          pointerEvents: isOpen ? 'auto' : 'none'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 flex-shrink-0">
          <h2 className="text-lg font-semibold dark:text-white">
            {t('lifecycle.createCertificate')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-4 px-4" aria-label="Tabs">
            <button
              type="button"
              onClick={() => setActiveTab('data')}
              className={`${
                activeTab === 'data'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
            >
              {t('lifecycle.tabs.data')}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('text')}
              className={`${
                activeTab === 'text'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
            >
              {t('lifecycle.tabs.text')}
            </button>
          </nav>
        </div>

        {/* Content mit Scroll */}
        <div className="p-4 overflow-y-auto flex-1 min-h-0 modal-scroll-content">
          {activeTab === 'data' && (
            <div className="space-y-4">
              {/* Daten-Eingabe */}
            </div>
          )}
          {activeTab === 'text' && (
            <div className="space-y-4">
              {/* PDF-Vorschau */}
              {pdfPreview && (
                <div className="mb-4">
                  <iframe 
                    src={`${pdfPreview}#view=FitH`} 
                    className="w-full rounded border dark:border-gray-600"
                    style={{ height: '400px' }}
                    title="PDF-Vorschau"
                  />
                </div>
              )}
              {/* Text-Bearbeitung */}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t dark:border-gray-700 gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? (
              <ArrowPathIcon className="h-5 w-5 animate-spin" />
            ) : (
              <CheckIcon className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default CertificateCreationModal;
```

**WICHTIG**: 
- Folgt exakt dem Modal/Sidepane Pattern von `CreateTaskModal.tsx`
- Verwendet `modal-scroll-container` und `modal-scroll-content` für große Inhalte
- PDF-Vorschau mit `<iframe>` (wie in `MarkdownPreview.tsx`)

---

### 5. ContractCreationModal.tsx

**Datei**: `frontend/src/components/lifecycle/ContractCreationModal.tsx` (NEU)

**Zweck**: Arbeitsvertrag erstellen (HR)

**Struktur**: Identisch zu `CertificateCreationModal.tsx`, aber für Verträge

**Props**:
```typescript
interface ContractCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  onSuccess?: () => void;
}
```

---

### 6. CertificateList.tsx

**Datei**: `frontend/src/components/lifecycle/CertificateList.tsx` (NEU)

**Zweck**: Liste aller Arbeitszeugnisse anzeigen

**Props**:
```typescript
interface CertificateListProps {
  certificates: any[];
  userId: number;
  readOnly?: boolean;
  onRefresh?: () => void;
}
```

**Struktur**:
```tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { PencilIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { API_ENDPOINTS } from '../../config/api.ts';
import { format } from 'date-fns';

const CertificateList: React.FC<CertificateListProps> = ({
  certificates,
  userId,
  readOnly = false,
  onRefresh
}) => {
  const { t } = useTranslation();

  const handleDownload = (certificateId: number) => {
    const url = `${API_ENDPOINTS.EMPLOYEE_LIFECYCLE.CERTIFICATE_DOWNLOAD(userId, certificateId)}`;
    window.open(url, '_blank');
  };

  if (certificates.length === 0) {
    return (
      <div className="text-gray-500 dark:text-gray-400 text-sm">
        {t('lifecycle.noCertificates')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="text-md font-semibold">{t('lifecycle.certificates')}</h4>
      <div className="space-y-2">
        {certificates.map((cert) => (
          <div
            key={cert.id}
            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
          >
            <div>
              <div className="font-medium">{t('lifecycle.certificate')} {cert.id}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {format(new Date(cert.createdAt), 'dd.MM.yyyy')}
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handleDownload(cert.id)}
                className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-md"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
              </button>
              {!readOnly && (
                <button
                  onClick={() => {/* Öffne Edit-Modal */}}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CertificateList;
```

---

### 7. ContractList.tsx

**Datei**: `frontend/src/components/lifecycle/ContractList.tsx` (NEU)

**Zweck**: Liste aller Arbeitsverträge anzeigen

**Struktur**: Identisch zu `CertificateList.tsx`, aber für Verträge

---

### 8. OnboardingProgressBar.tsx

**Datei**: `frontend/src/components/lifecycle/OnboardingProgressBar.tsx` (NEU)

**Zweck**: Onboarding-Fortschritt visuell anzeigen

**Props**:
```typescript
interface OnboardingProgressBarProps {
  lifecycle: any;
}
```

**Struktur**:
```tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

const OnboardingProgressBar: React.FC<OnboardingProgressBarProps> = ({ lifecycle }) => {
  const { t } = useTranslation();

  const steps = [
    { key: 'passport', label: t('lifecycle.steps.passport') },
    { key: 'arl', label: t('lifecycle.steps.arl') },
    { key: 'eps', label: t('lifecycle.steps.eps') },
    { key: 'pension', label: t('lifecycle.steps.pension') },
    { key: 'caja', label: t('lifecycle.steps.caja') }
  ];

  const getStepStatus = (key: string) => {
    // Logik basierend auf lifecycle-Status
    return 'pending'; // 'completed' | 'pending' | 'not_required'
  };

  const completedSteps = steps.filter(step => getStepStatus(step.key) === 'completed').length;
  const progress = (completedSteps / steps.length) * 100;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-md font-semibold">{t('lifecycle.onboardingProgress')}</h4>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {completedSteps} / {steps.length}
        </span>
      </div>
      
      {/* Progress-Bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {steps.map((step, index) => {
          const status = getStepStatus(step.key);
          return (
            <div key={step.key} className="flex items-center space-x-2">
              {status === 'completed' && (
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
              )}
              {status === 'pending' && (
                <ClockIcon className="h-5 w-5 text-yellow-500" />
              )}
              {status === 'not_required' && (
                <XCircleIcon className="h-5 w-5 text-gray-400" />
              )}
              <span className="text-sm">{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OnboardingProgressBar;
```

---

### 9. SocialSecurityStatusBox.tsx

**Datei**: `frontend/src/components/lifecycle/SocialSecurityStatusBox.tsx` (NEU)

**Zweck**: Status aller Sozialversicherungen anzeigen

**Props**:
```typescript
interface SocialSecurityStatusBoxProps {
  lifecycle: any;
}
```

**Struktur**:
```tsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

const SocialSecurityStatusBox: React.FC<SocialSecurityStatusBoxProps> = ({ lifecycle }) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const insurances = [
    { key: 'arl', label: t('lifecycle.arl') },
    { key: 'eps', label: t('lifecycle.eps') },
    { key: 'pension', label: t('lifecycle.pension') },
    { key: 'caja', label: t('lifecycle.caja') }
  ];

  const getStatus = (key: string) => {
    return lifecycle?.socialSecurity?.[key] || 'pending';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'registered':
        return 'text-green-600 dark:text-green-400';
      case 'pending':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'not_required':
        return 'text-gray-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-2">
      <h4 className="text-md font-semibold">{t('lifecycle.socialSecurity')}</h4>
      {insurances.map((insurance) => {
        const status = getStatus(insurance.key);
        const isExpanded = expanded[insurance.key];
        
        return (
          <div key={insurance.key} className="border border-gray-300 dark:border-gray-700 rounded-lg">
            <button
              onClick={() => setExpanded({ ...expanded, [insurance.key]: !isExpanded })}
              className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <div className="flex items-center space-x-2">
                <span className="font-medium">{insurance.label}</span>
                <span className={`text-sm ${getStatusColor(status)}`}>
                  {t(`lifecycle.status.${status}`)}
                </span>
              </div>
              {isExpanded ? (
                <ChevronUpIcon className="h-5 w-5" />
              ) : (
                <ChevronDownIcon className="h-5 w-5" />
              )}
            </button>
            {isExpanded && (
              <div className="p-3 border-t border-gray-300 dark:border-gray-700">
                {/* Details */}
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {lifecycle?.socialSecurity?.[insurance.key]?.details || t('lifecycle.noDetails')}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default SocialSecurityStatusBox;
```

---

### 10. TaskDataBox.tsx

**Datei**: `frontend/src/components/lifecycle/TaskDataBox.tsx` (NEU)

**Zweck**: Automatisch generierte Daten anzeigen (Legal)

**Props**:
```typescript
interface TaskDataBoxProps {
  task: any;
}
```

**Struktur**:
```tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ClipboardDocumentIcon } from '@heroicons/react/24/outline';

const TaskDataBox: React.FC<TaskDataBoxProps> = ({ task }) => {
  const { t } = useTranslation();

  // Extrahiere automatisch generierte Daten aus task.description oder task.metadata
  const autoGeneratedData = task.metadata?.autoGeneratedData || {};

  const handleCopyData = () => {
    const dataString = JSON.stringify(autoGeneratedData, null, 2);
    navigator.clipboard.writeText(dataString);
    // Zeige Erfolgs-Message
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <ClipboardDocumentIcon className="h-5 w-5 mr-2" />
          {t('lifecycle.autoGeneratedData')}
        </h3>
        <button
          onClick={handleCopyData}
          className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
        >
          {t('lifecycle.copyData')}
        </button>
      </div>
      <div className="space-y-2">
        {Object.entries(autoGeneratedData).map(([key, value]) => (
          <div key={key} className="flex">
            <span className="font-medium w-1/3">{t(`lifecycle.${key}`)}:</span>
            <span className="text-gray-600 dark:text-gray-400">{String(value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TaskDataBox;
```

---

### 11. EmailTemplateBox.tsx

**Datei**: `frontend/src/components/lifecycle/EmailTemplateBox.tsx` (NEU)

**Zweck**: Email-Vorlage generieren und versenden (Legal)

**Props**:
```typescript
interface EmailTemplateBoxProps {
  task: any;
}
```

**Struktur**:
```tsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EnvelopeIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import axiosInstance from '../../config/axios.ts';
import { API_ENDPOINTS } from '../../config/api.ts';

const EmailTemplateBox: React.FC<EmailTemplateBoxProps> = ({ task }) => {
  const { t } = useTranslation();
  const [emailTemplate, setEmailTemplate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleGenerateTemplate = async () => {
    setLoading(true);
    try {
      // API-Call zum Generieren der Email-Vorlage
      const response = await axiosInstance.post(`/api/tasks/${task.id}/generate-email`);
      setEmailTemplate(response.data.template);
    } catch (error) {
      console.error('Fehler beim Generieren der Email-Vorlage:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    setLoading(true);
    try {
      // API-Call zum Versenden der Email
      await axiosInstance.post(`/api/tasks/${task.id}/send-email`, {
        template: emailTemplate
      });
      setEmailSent(true);
    } catch (error) {
      console.error('Fehler beim Versenden der Email:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <EnvelopeIcon className="h-5 w-5 mr-2" />
          {t('lifecycle.emailTemplate')}
        </h3>
        <button
          onClick={handleGenerateTemplate}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {t('lifecycle.generateTemplate')}
        </button>
      </div>
      
      {emailTemplate && (
        <div className="space-y-4">
          <textarea
            value={emailTemplate}
            onChange={(e) => setEmailTemplate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
            rows={10}
          />
          <div className="flex justify-end">
            <button
              onClick={handleSendEmail}
              disabled={loading || emailSent}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center"
            >
              <PaperAirplaneIcon className="h-5 w-5 mr-2" />
              {emailSent ? t('lifecycle.emailSent') : t('lifecycle.sendEmail')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailTemplateBox;
```

---

### 12. SocialSecurityCompletionBox.tsx

**Datei**: `frontend/src/components/lifecycle/SocialSecurityCompletionBox.tsx` (NEU)

**Zweck**: Sozialversicherungs-Anmeldung abschließen (Legal)

**Props**:
```typescript
interface SocialSecurityCompletionBoxProps {
  task: any;
  onComplete?: () => void;
}
```

**Struktur**:
```tsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckIcon } from '@heroicons/react/24/outline';
import axiosInstance from '../../config/axios.ts';

const SocialSecurityCompletionBox: React.FC<SocialSecurityCompletionBoxProps> = ({
  task,
  onComplete
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    registrationNumber: '',
    provider: '',
    registrationDate: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // API-Call zum Abschließen der Anmeldung
      await axiosInstance.post(`/api/tasks/${task.id}/complete-registration`, formData);
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Fehler beim Abschließen der Anmeldung:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6 mb-4">
      <h3 className="text-lg font-semibold mb-4">{t('lifecycle.completeRegistration')}</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('lifecycle.registrationNumber')}
          </label>
          <input
            type="text"
            value={formData.registrationNumber}
            onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('lifecycle.provider')}
          </label>
          <input
            type="text"
            value={formData.provider}
            onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('lifecycle.registrationDate')}
          </label>
          <input
            type="date"
            value={formData.registrationDate}
            onChange={(e) => setFormData({ ...formData, registrationDate: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('lifecycle.notes')}
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
            rows={3}
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center"
          >
            <CheckIcon className="h-5 w-5 mr-2" />
            {t('lifecycle.complete')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SocialSecurityCompletionBox;
```

---

### 13. RoleConfigurationTab.tsx

**Datei**: `frontend/src/components/organization/RoleConfigurationTab.tsx` (NEU)

**Zweck**: Rollen-Konfiguration (Admin)

**Props**:
```typescript
interface RoleConfigurationTabProps {
  organization: any;
  onSave?: () => void;
}
```

**Struktur**:
```tsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../config/axios.ts';
import { API_ENDPOINTS } from '../../config/api.ts';
import RoleSelector from './RoleSelector.tsx';
import StandardRoleAssignmentButton from './StandardRoleAssignmentButton.tsx';

const RoleConfigurationTab: React.FC<RoleConfigurationTabProps> = ({
  organization,
  onSave
}) => {
  const { t } = useTranslation();
  const [roles, setRoles] = useState<any[]>([]);
  const [lifecycleRoles, setLifecycleRoles] = useState<any>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRoles();
    loadLifecycleRoles();
  }, [organization]);

  const loadRoles = async () => {
    try {
      const response = await axiosInstance.get('/api/roles');
      setRoles(response.data);
    } catch (error) {
      console.error('Fehler beim Laden der Rollen:', error);
    }
  };

  const loadLifecycleRoles = async () => {
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.ORGANIZATIONS.LIFECYCLE_ROLES);
      setLifecycleRoles(response.data.lifecycleRoles || {});
    } catch (error) {
      console.error('Fehler beim Laden der Lebenszyklus-Rollen:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await axiosInstance.put(API_ENDPOINTS.ORGANIZATIONS.LIFECYCLE_ROLES, {
        lifecycleRoles
      });
      if (onSave) {
        onSave();
      }
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold mb-4">Lebenszyklus-Rollen</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('organization.lifecycleRoles.admin')}
            </label>
            <RoleSelector
              roles={roles}
              value={lifecycleRoles.adminRoleId}
              onChange={(roleId) => setLifecycleRoles({ ...lifecycleRoles, adminRoleId: roleId })}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('organization.lifecycleRoles.hr')}
            </label>
            <RoleSelector
              roles={roles}
              value={lifecycleRoles.hrRoleId}
              onChange={(roleId) => setLifecycleRoles({ ...lifecycleRoles, hrRoleId: roleId })}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('organization.lifecycleRoles.legal')}
            </label>
            <RoleSelector
              roles={roles}
              value={lifecycleRoles.legalRoleId}
              onChange={(roleId) => setLifecycleRoles({ ...lifecycleRoles, legalRoleId: roleId })}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('organization.lifecycleRoles.employees')}
            </label>
            {/* Multi-Select für Mitarbeiter-Rollen */}
          </div>
        </div>
        
        <div className="mt-4">
          <StandardRoleAssignmentButton
            onAssign={(roles) => setLifecycleRoles(roles)}
          />
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleConfigurationTab;
```

---

### 14. DocumentConfigurationTab.tsx

**Datei**: `frontend/src/components/organization/DocumentConfigurationTab.tsx` (NEU)

**Zweck**: Dokumenten-Konfiguration (Admin/HR)

**Struktur**: Ähnlich zu `RoleConfigurationTab.tsx`, aber für Dokumenten-Templates, Signaturen und Einstellungen

---

### 15. Weitere Komponenten

Die restlichen Komponenten (`RoleSelector.tsx`, `StandardRoleAssignmentButton.tsx`, `SignatureUploadModal.tsx`, `CertificateEditModal.tsx`, `ContractEditModal.tsx`) folgen den gleichen Patterns und Standards wie oben beschrieben.

---

## Backend-Integration

### usePermissions Hook - Erweiterung

**Datei**: `frontend/src/hooks/usePermissions.ts`

**Erweiterung** (nach Zeile 100):
```typescript
const [lifecycleRoles, setLifecycleRoles] = useState<any>(null);

// Lade Lebenszyklus-Rollen-Konfiguration
useEffect(() => {
  const loadLifecycleRoles = async () => {
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.ORGANIZATIONS.LIFECYCLE_ROLES);
      setLifecycleRoles(response.data.lifecycleRoles);
    } catch (error) {
      console.error('Fehler beim Laden der Lebenszyklus-Rollen:', error);
      setLifecycleRoles(null);
    }
  };
  
  if (user && currentRole) {
    loadLifecycleRoles();
  }
}, [user, currentRole]);

/**
 * Prüft ob User eine Lebenszyklus-Rolle hat
 */
const hasLifecycleRole = useCallback((roleType: 'admin' | 'hr' | 'legal'): boolean => {
  if (!user || !currentRole || !lifecycleRoles) {
    // Fallback: Standard-Prüfung
    return checkDefaultLifecycleRole(currentRole, roleType);
  }
  
  const targetRoleId = lifecycleRoles[`${roleType}RoleId`];
  if (!targetRoleId) return false;
  
  return currentRole.id === targetRoleId;
}, [user, currentRole, lifecycleRoles]);

/**
 * Prüft Standard-Rollen (Fallback)
 */
const checkDefaultLifecycleRole = (role: Role, roleType: 'admin' | 'hr' | 'legal'): boolean => {
  const roleName = role.name.toLowerCase();
  
  if (roleType === 'admin' || roleType === 'hr') {
    return roleName.includes('admin') || roleName.includes('administrator');
  }
  
  if (roleType === 'legal') {
    return roleName === 'derecho';
  }
  
  return false;
};

/**
 * Convenience-Funktionen
 */
const isHR = useCallback((): boolean => {
  return hasLifecycleRole('hr') || hasLifecycleRole('admin');
}, [hasLifecycleRole]);

const isLegal = useCallback((): boolean => {
  return hasLifecycleRole('legal') || hasLifecycleRole('admin');
}, [hasLifecycleRole]);

return {
  // ... bestehende Returns ...
  hasLifecycleRole,
  isHR,
  isLegal,
  lifecycleRoles
};
```

---

## Sicherstellung - Keine Breaking Changes

### Checkliste

- [x] **Profile.tsx**: Bestehende Tabs (`'profile'`, `'documents'`) bleiben unverändert
- [x] **UserManagementTab.tsx**: Bestehende Tabs (`'details'`, `'documents'`, `'roles'`) bleiben unverändert
- [x] **EditOrganizationModal.tsx**: Bestehende Funktionalität (`'general'` Tab) bleibt unverändert
- [x] **EditTaskModal.tsx**: Bestehende Funktionalität bleibt unverändert, neue Boxen nur für Lebenszyklus-Tasks
- [x] **usePermissions.ts**: Bestehende Funktionen bleiben unverändert, nur Erweiterungen
- [x] **API-Endpunkte**: Neue Endpunkte, keine Änderungen an bestehenden
- [x] **Container-Strukturen**: Alle neuen Komponenten folgen bestehenden Standards
- [x] **Modal/Sidepane Pattern**: Alle neuen Modals folgen bestehenden Patterns
- [x] **File-Upload Pattern**: Alle neuen File-Uploads folgen bestehenden Patterns
- [x] **PDF-Vorschau Pattern**: Alle neuen PDF-Vorschauen folgen bestehenden Patterns

---

## Zusammenfassung

Diese detaillierte Spezifikation stellt sicher, dass:

1. **Alle Komponenten** den bestehenden Standards folgen
2. **Keine Breaking Changes** an bestehenden Komponenten vorgenommen werden
3. **Integration** nahtlos in bestehende Strukturen erfolgt
4. **Patterns** konsistent über alle neuen Komponenten hinweg verwendet werden
5. **Code-Referenzen** zu bestehenden Implementierungen vorhanden sind

Die Implementierung kann nun schrittweise erfolgen, wobei jeder Schritt auf dieser Spezifikation basiert.


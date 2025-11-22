# Implementierungs-Checkliste

Diese Checkliste MUSS bei JEDER neuen Feature-Implementierung befolgt werden. Sie stellt sicher, dass alle kritischen Aspekte berücksichtigt werden.

## ⚠️ KRITISCH: Diese Punkte sind VERBINDLICH

### 1. ✅ Übersetzungen (I18N) - **MUSS IMMER GEMACHT WERDEN!**

**⚠️ WICHTIGSTE REGEL: Übersetzungen sind TEIL DER IMPLEMENTIERUNG, nicht optional!**

**Vor JEDER Feature-Implementierung:**

- [ ] **ALLE Texte identifiziert**, die in der UI angezeigt werden
- [ ] **Übersetzungskeys in `de.json` hinzugefügt** (Deutsch als Basis)
- [ ] **Übersetzungskeys in `en.json` hinzugefügt** (Englisch)
- [ ] **Übersetzungskeys in `es.json` hinzugefügt** (Spanisch)
- [ ] **ALLE hardcoded Texte durch `t()` ersetzt** (keine deutschen Strings im Code!)
- [ ] **`useTranslation()` Hook importiert und verwendet**
- [ ] **In allen 3 Sprachen getestet** (de, en, es)

**Dateien:**
- `frontend/src/i18n/locales/de.json`
- `frontend/src/i18n/locales/en.json`
- `frontend/src/i18n/locales/es.json`

**Standard-Format:**
```tsx
// ✅ RICHTIG
const { t } = useTranslation();
<h2>{t('featureName.title', { defaultValue: 'Titel' })}</h2>

// ❌ FALSCH - Hardcoded Text
<h2>Titel</h2>
```

**Siehe auch:**
- [CODING_STANDARDS.md](CODING_STANDARDS.md) - Abschnitt "Übersetzungen"
- [TRANSLATION_PROGRESS.md](../implementation_reports/TRANSLATION_PROGRESS.md) - Übersetzungsfortschritt

---

### 2. ✅ Button-Design - **KEIN TEXT IN BUTTONS!**

- [ ] **Buttons sind Icon-only** (kein sichtbarer Text)
- [ ] **Text ist im `title` Attribut** (für Tooltips)
- [ ] **Passendes Icon verwendet** (CheckIcon, XMarkIcon, TrashIcon, etc.)
- [ ] **Style entspricht Standard** (siehe DESIGN_STANDARDS.md)

**Siehe auch:**
- [CODING_STANDARDS.md](CODING_STANDARDS.md) - Abschnitt "Button-Implementierung"
- [DESIGN_STANDARDS.md](DESIGN_STANDARDS.md) - Abschnitt "Buttons und Aktionselemente"

---

### 3. ✅ Berechtigungen - **MUSS IMMER GEMACHT WERDEN!**

**⚠️ WICHTIGSTE REGEL: Berechtigungen sind TEIL DER IMPLEMENTIERUNG, nicht optional!**

**Bei JEDER neuen Seite/Tabelle/Button:**

#### 3.1 Seed-File aktualisieren (`backend/prisma/seed.ts`)

- [ ] **Neue Seite hinzugefügt** → Zu `ALL_PAGES` Array hinzufügen
- [ ] **Neue Tabelle hinzugefügt** → Zu `ALL_TABLES` Array hinzufügen
- [ ] **Neuer Button hinzugefügt** → Zu `ALL_BUTTONS` Array hinzufügen
- [ ] **Berechtigungen für alle Rollen definiert** (Admin, User, Hamburger)
- [ ] **Seed-File getestet** → `npx prisma db seed` ausführen

**Beispiel:**
```typescript
// backend/prisma/seed.ts

// Neue Seite hinzufügen
const ALL_PAGES = [
  'dashboard',
  'worktracker',
  'new_feature_page', // ← NEU
  // ...
];

// Neue Tabelle hinzufügen
const ALL_TABLES = [
  'requests',
  'new_feature_table', // ← NEU
  // ...
];

// Neuer Button hinzufügen
const ALL_BUTTONS = [
  'user_create',
  'new_feature_button', // ← NEU
  // ...
];

// Berechtigungen für Rollen definieren
const adminPermissionMap: Record<string, AccessLevel> = {
  'page_new_feature_page': 'both', // ← NEU
  'table_new_feature_table': 'both', // ← NEU
  'button_new_feature_button': 'both', // ← NEU
  // ...
};
```

#### 3.2 Frontend-Berechtigungen (`frontend/src/`)

- [ ] **`usePermissions()` Hook importiert** → `import { usePermissions } from '../hooks/usePermissions.ts';`
- [ ] **Berechtigungen für Seiten geprüft** → `hasPermission('new_feature_page', 'read', 'page')`
- [ ] **Berechtigungen für Tabellen geprüft** → `hasPermission('new_feature_table', 'read', 'table')`
- [ ] **Berechtigungen für Buttons geprüft** → `hasPermission('new_feature_button', 'write', 'button')`
- [ ] **UI-Elemente basierend auf Berechtigungen angezeigt/versteckt**

**Beispiel:**
```tsx
// ✅ RICHTIG
import { usePermissions } from '../hooks/usePermissions.ts';

const MyComponent = () => {
  const { hasPermission } = usePermissions();
  
  return (
    <div>
      {hasPermission('new_feature_page', 'read', 'page') && (
        <div>Inhalt</div>
      )}
      {hasPermission('new_feature_button', 'write', 'button') && (
        <button>Action</button>
      )}
    </div>
  );
};
```

#### 3.3 Backend-Berechtigungen (`backend/src/`)

- [ ] **`checkPermission` Middleware importiert** → `import { checkPermission } from '../middleware/permissionMiddleware.ts';`
- [ ] **Berechtigungen in API-Routen geprüft** → `checkPermission('new_feature_page', 'read', 'page')`
- [ ] **Backend-Validierung implementiert** (nicht nur Frontend!)

**Beispiel:**
```typescript
// ✅ RICHTIG
import { checkPermission } from '../middleware/permissionMiddleware.ts';

router.get(
  '/api/new-feature',
  authenticate,
  checkPermission('new_feature_page', 'read', 'page'),
  controller.getNewFeature
);
```

**Siehe auch:**
- [BERECHTIGUNGSSYSTEM.md](../technical/BERECHTIGUNGSSYSTEM.md) - Vollständige Berechtigungssystem-Dokumentation
- `backend/prisma/seed.ts` - Seed-File mit allen Berechtigungen
- `frontend/src/hooks/usePermissions.ts` - Frontend-Berechtigungs-Hook
- `backend/src/middleware/permissionMiddleware.ts` - Backend-Berechtigungs-Middleware

---

### 4. ✅ Fehlerbehandlung

- [ ] **Try-Catch-Blöcke für async Operationen**
- [ ] **Benutzerfreundliche Fehlermeldungen** (übersetzt!)
- [ ] **Loading-States implementiert**
- [ ] **Validierung von User-Input**

---

### 5. ✅ Code-Qualität

- [ ] **TypeScript-Typen definiert** (keine `any`!)
- [ ] **Import-Pfade korrekt** (Frontend: mit .ts/.tsx, Backend: ohne)
- [ ] **DRY-Prinzip befolgt** (keine Duplikation)
- [ ] **Kommentare für komplexe Logik**

---

### 4. ✅ Notifications - **MUSS IMMER GEMACHT WERDEN!**

**⚠️ WICHTIGSTE REGEL: Notifications sind TEIL DER IMPLEMENTIERUNG, nicht optional!**

**Bei JEDER neuen Aktion, die benachrichtigt werden soll:**

#### 4.1 Backend-Notification erstellen (`backend/src/controllers/`)

- [ ] **`createNotificationIfEnabled` importiert** → `import { createNotificationIfEnabled } from './notificationController';`
- [ ] **Notification aufgerufen** mit korrekten Parametern:
  - `userId`: Empfänger der Notification
  - `type`: NotificationType (task, request, user, role, worktime, system, etc.)
  - `relatedEntityId`: ID der zugehörigen Entity (Task, Request, etc.)
  - `relatedEntityType`: Typ der Aktion (`'create'`, `'update'`, `'delete'`, `'status'`, `'start'`, `'stop'`, etc.)
  - `title`: Übersetzter Titel (aus translations.ts)
  - `message`: Übersetzte Nachricht (aus translations.ts)

**⚠️ WICHTIG:**
- **NICHT verwenden:** `targetId` und `targetType` (veraltet!)
- **IMMER verwenden:** `relatedEntityId` und `relatedEntityType`

**Beispiel:**
```typescript
// ✅ RICHTIG
import { createNotificationIfEnabled } from './notificationController';
import { NotificationType } from '@prisma/client';
import { getTaskNotificationText, getUserLanguage } from '../utils/translations';

// In Controller-Funktion:
const language = await getUserLanguage(userId);
const notificationText = getTaskNotificationText(
  language,
  'assigned',
  task.title
);

await createNotificationIfEnabled({
  userId: assignedUserId,
  title: notificationText.title,
  message: notificationText.message,
  type: NotificationType.task,
  relatedEntityId: task.id,
  relatedEntityType: 'assigned' // oder 'create', 'update', 'delete', 'status'
});
```

#### 4.2 Backend-Übersetzungen (`backend/src/utils/translations.ts`)

- [ ] **Neue Notification-Funktion hinzugefügt** (z.B. `getNewFeatureNotificationText`)
- [ ] **Übersetzungen für alle 3 Sprachen** (de, es, en)
- [ ] **Funktion exportiert** und in Controller verwendet

**Beispiel:**
```typescript
// backend/src/utils/translations.ts

// Übersetzungen definieren
const newFeatureNotifications: Record<string, NewFeatureNotificationTranslations> = {
  de: {
    created: (featureName: string) => ({
      title: 'Neues Feature erstellt',
      message: `Das Feature "${featureName}" wurde erfolgreich erstellt.`
    }),
    updated: (featureName: string) => ({
      title: 'Feature aktualisiert',
      message: `Das Feature "${featureName}" wurde aktualisiert.`
    })
  },
  es: { /* ... */ },
  en: { /* ... */ }
};

// Funktion exportieren
export function getNewFeatureNotificationText(
  language: string,
  type: 'created' | 'updated',
  featureName: string
): { title: string; message: string } {
  const lang = language in newFeatureNotifications ? language : 'de';
  const translations = newFeatureNotifications[lang];
  
  switch (type) {
    case 'created':
      return translations.created(featureName);
    case 'updated':
      return translations.updated(featureName);
    default:
      return translations.created(featureName);
  }
}
```

#### 4.3 Frontend-Übersetzungen (`frontend/src/i18n/locales/`)

- [ ] **Notification-Texte in `de.json` hinzugefügt** (falls im Frontend angezeigt)
- [ ] **Notification-Texte in `en.json` hinzugefügt**
- [ ] **Notification-Texte in `es.json` hinzugefügt**

**Beispiel:**
```json
// frontend/src/i18n/locales/de.json
{
  "notifications": {
    "newFeature": {
      "created": "Neues Feature erstellt",
      "updated": "Feature aktualisiert"
    }
  }
}
```

**Siehe auch:**
- [NOTIFICATION_SYSTEM.md](../modules/NOTIFICATION_SYSTEM.md) - Vollständige Notification-System-Dokumentation
- `backend/src/controllers/notificationController.ts` - Notification-Controller
- `backend/src/utils/translations.ts` - Backend-Übersetzungen für Notifications

---

### 5. ✅ Fehlerbehandlung

- [ ] **Try-Catch-Blöcke für async Operationen**
- [ ] **Benutzerfreundliche Fehlermeldungen** (übersetzt!)
- [ ] **Loading-States implementiert**
- [ ] **Validierung von User-Input**

---

### 6. ✅ Code-Qualität

- [ ] **TypeScript-Typen definiert** (keine `any`!)
- [ ] **Import-Pfade korrekt** (Frontend: mit .ts/.tsx, Backend: ohne)
- [ ] **DRY-Prinzip befolgt** (keine Duplikation)
- [ ] **Kommentare für komplexe Logik**

---

### 7. ✅ Testing

- [ ] **In allen 3 Sprachen getestet** (de, en, es)
- [ ] **Funktionalität getestet**
- [ ] **Berechtigungen getestet** (Frontend + Backend)
- [ ] **Notifications getestet** (werden korrekt erstellt und angezeigt)
- [ ] **Fehlerbehandlung getestet**

---

## 📋 Quick-Check vor jedem Commit

Vor jedem Commit diese 6 Fragen stellen:

1. **Sind ALLE Texte übersetzt?** → `grep -r '"[A-ZÄÖÜ]' frontend/src --include="*.tsx" | grep -v "t("`
2. **Sind ALLE Buttons Icon-only?** → Kein Text in Buttons, nur Icons + title-Attribut
3. **Sind Berechtigungen implementiert?** → Seed-File aktualisiert? Frontend + Backend geprüft?
4. **Sind Notifications implementiert?** → createNotificationIfEnabled aufgerufen? Übersetzungen hinzugefügt?
5. **Funktioniert es in allen Sprachen?** → In de, en, es testen
6. **Sind alle DB-Einträge erstellt?** → Seed-File ausgeführt? Berechtigungen in DB vorhanden?

---

## 🚨 Häufige Fehler vermeiden

### ❌ FALSCH: Hardcoded Text
```tsx
<h2>Neues Feature</h2>
<button>Speichern</button>
```

### ✅ RICHTIG: Übersetzt
```tsx
const { t } = useTranslation();
<h2>{t('newFeature.title', { defaultValue: 'Neues Feature' })}</h2>
<button title={t('common.save', { defaultValue: 'Speichern' })}>
  <CheckIcon className="h-4 w-4" />
</button>
```

---

## 📚 Weitere Ressourcen

- [CODING_STANDARDS.md](CODING_STANDARDS.md) - Vollständige Coding-Standards
- [DESIGN_STANDARDS.md](DESIGN_STANDARDS.md) - UI/UX-Standards
- [VIBES.md](VIBES.md) - Coding-Stil und Best Practices
- [TRANSLATION_PROGRESS.md](../implementation_reports/TRANSLATION_PROGRESS.md) - Übersetzungsfortschritt

---

**WICHTIG:** Diese Checkliste ist VERBINDLICH. Features ohne vollständige:
- ❌ Übersetzungen werden NICHT akzeptiert!
- ❌ Berechtigungen werden NICHT akzeptiert!
- ❌ Notifications (falls erforderlich) werden NICHT akzeptiert!


# Onboarding-System Implementierungsplan

## Übersicht

Dieses Dokument beschreibt die vollständige Implementierung eines Onboarding-Systems für neue Benutzer. Das System führt neue Benutzer schrittweise durch die wichtigsten Funktionen und Prozesse der Anwendung mit Hilfe von modalen Dialogen.

## Zielsetzung

- Neue Benutzer erhalten eine strukturierte Einführung in die Anwendung
- Schritt-für-Schritt-Anleitungen für Kernfunktionen
- Prozessorientierte Führung (nicht nur seitenorientiert)
- Möglichkeit, die Tour zu überspringen oder später fortzusetzen
- Fortschritt wird gespeichert, damit die Tour bei Unterbrechung fortgesetzt werden kann

## Architektur-Entscheidungen

### Technologie-Stack

- **Modal-Komponente**: `@headlessui/react` Dialog (bereits im Projekt verwendet)
- **State Management**: React Context API (OnboardingContext)
- **Persistenz**: Backend API + LocalStorage (Fallback)
- **i18n**: Bestehende i18n-Infrastruktur (de, es, en)
- **Styling**: Tailwind CSS (konsistent mit bestehendem Design)

### Warum keine externe Library?

- **react-joyride**: Zu komplex für unsere Anforderungen, zusätzliche Dependency
- **intro.js**: Nicht React-native, würde Design-System brechen
- **shepherd.js**: Ähnlich wie intro.js, nicht optimal für React
- **Eigene Lösung**: Passt perfekt zu bestehendem Design-System, volle Kontrolle, keine zusätzlichen Dependencies

## Datenbank-Änderungen

### 1. User-Modell erweitern

**Datei**: `backend/prisma/schema.prisma`

```prisma
model User {
  // ... bestehende Felder ...
  onboardingCompleted Boolean @default(false)
  onboardingProgress  Json?   // Speichert den Fortschritt: { currentStep: number, completedSteps: number[] }
  onboardingStartedAt DateTime?
  onboardingCompletedAt DateTime?
  onboardingEvents   OnboardingEvent[] // Analytics-Tracking
}
```

**Migration erstellen**:
```bash
npx prisma migrate dev --name add_onboarding_fields
```

### 2. OnboardingEvent-Modell für Analytics

**Datei**: `backend/prisma/schema.prisma`

```prisma
model OnboardingEvent {
  id          Int      @id @default(autoincrement())
  userId      Int
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  stepId      String   // ID des Onboarding-Schritts
  stepTitle   String   // Titel des Schritts (für Reports)
  action      String   // 'started', 'completed', 'skipped', 'cancelled'
  duration    Int?     // Dauer in Sekunden (für 'completed')
  createdAt   DateTime @default(now())
  
  @@index([userId])
  @@index([stepId])
  @@index([createdAt])
}
```

**Migration erstellen**:
```bash
npx prisma migrate dev --name add_onboarding_events
```

### 3. Backend API-Endpunkte

**Neue Endpunkte in `backend/src/routes/users.ts`**:
- `PUT /api/users/onboarding/complete` - Markiert Onboarding als abgeschlossen
- `PUT /api/users/onboarding/progress` - Speichert Fortschritt
- `GET /api/users/onboarding/status` - Gibt Onboarding-Status zurück
- `POST /api/users/onboarding/event` - Speichert Onboarding-Event (Analytics)
- `PUT /api/users/onboarding/reset` - Setzt Onboarding zurück (für Settings)
- `GET /api/users/onboarding/analytics` - Gibt Analytics-Daten zurück (für Admins)

**Controller-Methoden in `backend/src/controllers/userController.ts`**:
- `updateOnboardingStatus` - Aktualisiert Onboarding-Status
- `updateOnboardingProgress` - Speichert Fortschritt
- `getOnboardingStatus` - Gibt Status zurück
- `trackOnboardingEvent` - Speichert Onboarding-Event
- `resetOnboarding` - Setzt Onboarding zurück
- `getOnboardingAnalytics` - Gibt Analytics-Daten zurück (nur für Admins)

## Frontend-Implementierung

### 1. Onboarding-Kontext erstellen

**Datei**: `frontend/src/contexts/OnboardingContext.tsx`

**Funktionalität**:
- Verwaltet den aktuellen Onboarding-Status
- Speichert Fortschritt lokal und im Backend
- Bietet Methoden zum Starten, Fortsetzen, Überspringen und Beenden der Tour
- Synchronisiert mit Backend

**State**:
```typescript
interface OnboardingState {
  isActive: boolean;
  currentStep: number;
  completedSteps: number[];
  tourData: OnboardingStep[];
  isLoading: boolean;
}
```

### 2. Onboarding-Komponente

**Datei**: `frontend/src/components/OnboardingTour.tsx`

**Funktionalität**:
- Rendert modale Dialoge für jeden Schritt
- Navigation (Zurück, Weiter, Überspringen)
- Fortschrittsanzeige
- Highlighting von UI-Elementen (optional, mit Overlay)
- Responsive Design (Mobile/Desktop)

**Props**:
```typescript
interface OnboardingTourProps {
  steps: OnboardingStep[];
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  onSkip: () => void;
}
```

**Design**:
- Konsistent mit bestehenden Modals (Dialog von @headlessui/react)
- Dark Mode Support
- Mobile-first Responsive Design
- Fortschrittsbalken oben im Modal
- Buttons: "Zurück", "Weiter", "Überspringen", "Tour beenden"

### 3. Onboarding-Step-Definitionen

**Datei**: `frontend/src/config/onboardingSteps.ts`

**Struktur**:
```typescript
interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS-Selector für zu highlightendes Element
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  route?: string; // Route, die für diesen Schritt aktiv sein muss
  action?: 'navigate' | 'wait' | 'click'; // Erwartete Aktion
  order: number; // Reihenfolge
  page: string; // Seite, auf der dieser Schritt erscheint
  process?: string; // Prozess, zu dem dieser Schritt gehört
  requiredPermissions?: {
    entity: string;
    entityType: 'page' | 'table' | 'button';
    accessLevel: 'read' | 'write' | 'both';
  }[]; // Berechtigungen, die für diesen Schritt erforderlich sind
  roleFilter?: string[]; // Rollen, für die dieser Schritt angezeigt wird ('User', 'Hamburger', 'Admin')
}
```

**WICHTIG: Berechtigungsbasierte Filterung**

Die Onboarding-Schritte müssen basierend auf den Berechtigungen des Benutzers gefiltert werden:

- **User-Rolle (ID 2)**: Hat Zugriff auf dashboard, worktracker, consultations, payroll, cerebro, settings, profile, organization_management
- **Hamburger-Rolle (ID 999)**: Hat nur Zugriff auf dashboard, settings, profile, cerebro (KEIN organization_management!)
- **Admin-Rolle (ID 1)**: Hat Zugriff auf alles

**Filterung in OnboardingContext**:
```typescript
const filterStepsByPermissions = (steps: OnboardingStep[], permissions: Permission[], currentRole: Role): OnboardingStep[] => {
  return steps.filter(step => {
    // Prüfe Rollen-Filter
    if (step.roleFilter && !step.roleFilter.includes(currentRole.name)) {
      return false;
    }
    
    // Prüfe Berechtigungen
    if (step.requiredPermissions) {
      return step.requiredPermissions.every(reqPerm => {
        const userPerm = permissions.find(p => 
          p.entity === reqPerm.entity && 
          p.entityType === reqPerm.entityType
        );
        if (!userPerm) return false;
        
        // Prüfe accessLevel
        return (
          userPerm.accessLevel === 'both' ||
          (reqPerm.accessLevel === 'read' && ['read', 'write', 'both'].includes(userPerm.accessLevel)) ||
          (reqPerm.accessLevel === 'write' && ['write', 'both'].includes(userPerm.accessLevel))
        );
      });
    }
    
    return true;
  });
};
```

**Prozessorientierte Schritte** (Beispiele):

1. **Dashboard-Übersicht** (Seite: dashboard)
   - Willkommen
   - Dashboard-Layout erklären
   - Requests-Bereich erklären

2. **Request erstellen** (Prozess: request-creation)
   - Request-Button finden
   - Request-Formular ausfüllen
   - Request absenden

3. **Task-Management** (Prozess: task-management)
   - Worktracker-Seite öffnen
   - Task erstellen
   - Task-Status ändern

4. **Zeiterfassung** (Prozess: time-tracking)
   - Zeiterfassung starten
   - Zeiterfassung stoppen
   - Zeiten anzeigen

5. **Cerebro Wiki** (Prozess: knowledge-base)
   - Cerebro öffnen
   - Artikel suchen
   - Artikel erstellen

### 4. Integration in App.tsx

**Änderungen in `frontend/src/App.tsx`**:
- OnboardingProvider hinzufügen
- OnboardingTour-Komponente rendern
- Prüfung beim ersten Login: Startet Onboarding automatisch, wenn `onboardingCompleted === false`

### 5. Integration in Layout.tsx

**Änderungen in `frontend/src/components/Layout.tsx`**:
- Prüft Onboarding-Status beim Laden
- Zeigt Onboarding-Tour an, wenn aktiv
- Verhindert Navigation während aktiver Tour (optional)

### 6. i18n-Übersetzungen

**WICHTIG: Sprachunterstützung**

Das System unterstützt drei Sprachen:
- **Deutsch (de)**: Frontend Standard-Sprache (fallbackLng: 'de')
- **Spanisch (es)**: Backend Standard-Sprache (User.language @default("es"))
- **Englisch (en)**: Zusätzliche Sprache

**Hinweis**: Neue Benutzer erhalten standardmäßig Spanisch (es) im Backend, aber das Frontend verwendet Deutsch als Fallback. Die Onboarding-Tour muss in allen drei Sprachen verfügbar sein und die Sprache des Benutzers respektieren.

**Dateien**: 
- `frontend/src/i18n/locales/de.json`
- `frontend/src/i18n/locales/es.json`
- `frontend/src/i18n/locales/en.json`

**Neue Übersetzungsschlüssel** (müssen in ALLE drei Sprachen):

**Deutsch (de.json)**:
```json
{
  "onboarding": {
    "welcome": {
      "title": "Willkommen im Intranet!",
      "description": "Wir führen Sie durch die wichtigsten Funktionen..."
    },
    "navigation": {
      "back": "Zurück",
      "next": "Weiter",
      "skip": "Überspringen",
      "complete": "Tour beenden",
      "restart": "Tour neu starten"
    },
    "progress": {
      "step": "Schritt",
      "of": "von"
    },
    "steps": {
      "dashboard_overview": {
        "title": "Dashboard-Übersicht",
        "description": "Das Dashboard zeigt Ihnen alle wichtigen Informationen auf einen Blick..."
      },
      "create_request": {
        "title": "Request erstellen",
        "description": "Erstellen Sie einen neuen Request, um Anfragen oder Anträge zu stellen..."
      }
    }
  },
  "settings": {
    "onboarding": {
      "restart": "Onboarding-Tour neu starten",
      "restartDescription": "Starten Sie die Einführungstour erneut, um die wichtigsten Funktionen kennenzulernen."
    }
  }
}
```

**Spanisch (es.json)**:
```json
{
  "onboarding": {
    "welcome": {
      "title": "¡Bienvenido a la Intranet!",
      "description": "Te guiaremos a través de las funciones más importantes..."
    },
    "navigation": {
      "back": "Atrás",
      "next": "Siguiente",
      "skip": "Omitir",
      "complete": "Terminar tour",
      "restart": "Reiniciar tour"
    },
    "progress": {
      "step": "Paso",
      "of": "de"
    },
    "steps": {
      "dashboard_overview": {
        "title": "Vista general del Dashboard",
        "description": "El Dashboard muestra toda la información importante de un vistazo..."
      },
      "create_request": {
        "title": "Crear solicitud",
        "description": "Crea una nueva solicitud para hacer peticiones o solicitudes..."
      }
    }
  },
  "settings": {
    "onboarding": {
      "restart": "Reiniciar tour de introducción",
      "restartDescription": "Inicia el tour de introducción nuevamente para conocer las funciones más importantes."
    }
  }
}
```

**Englisch (en.json)**:
```json
{
  "onboarding": {
    "welcome": {
      "title": "Welcome to the Intranet!",
      "description": "We'll guide you through the most important features..."
    },
    "navigation": {
      "back": "Back",
      "next": "Next",
      "skip": "Skip",
      "complete": "End tour",
      "restart": "Restart tour"
    },
    "progress": {
      "step": "Step",
      "of": "of"
    },
    "steps": {
      "dashboard_overview": {
        "title": "Dashboard Overview",
        "description": "The Dashboard shows you all important information at a glance..."
      },
      "create_request": {
        "title": "Create Request",
        "description": "Create a new request to submit inquiries or applications..."
      }
    }
  },
  "settings": {
    "onboarding": {
      "restart": "Restart onboarding tour",
      "restartDescription": "Start the introduction tour again to learn about the most important features."
    }
  }
}
```

## Implementierungsreihenfolge

### Phase 1: Backend-Grundlagen
1. ✅ Prisma Schema erweitern
2. ✅ Migration erstellen
3. ✅ API-Endpunkte implementieren
4. ✅ Controller-Methoden erstellen
5. ✅ Tests schreiben

### Phase 2: Frontend-Kernkomponenten
1. ✅ OnboardingContext erstellen
2. ✅ OnboardingTour-Komponente erstellen
3. ✅ Onboarding-Step-Definitionen erstellen
4. ✅ i18n-Übersetzungen hinzufügen

### Phase 3: Integration
1. ✅ OnboardingProvider in App.tsx integrieren
2. ✅ OnboardingTour in Layout.tsx integrieren
3. ✅ Automatischer Start beim ersten Login
4. ✅ Fortschritt speichern und laden

### Phase 4: Schritt-Definitionen
1. ✅ Dashboard-Schritte definieren
2. ✅ Request-Erstellung-Schritte definieren
3. ✅ Task-Management-Schritte definieren
4. ✅ Zeiterfassungs-Schritte definieren
5. ✅ Cerebro-Schritte definieren
6. ✅ Weitere Prozess-Schritte definieren

### Phase 5: Testing & Optimierung
1. ✅ Unit-Tests für Context
2. ✅ Integration-Tests für Tour
3. ✅ E2E-Tests für komplette Tour
4. ✅ Mobile-Responsiveness testen
5. ✅ Dark Mode testen
6. ✅ Performance optimieren

## Detaillierte Schritt-Definitionen

### Prozess 1: Dashboard-Übersicht

**Schritt 1.1: Willkommen**
- **Route**: `/dashboard`
- **Position**: center
- **Target**: Kein (Willkommens-Modal)
- **Inhalt**: Begrüßung, Erklärung des Onboarding-Prozesses
- **Aktion**: Benutzer klickt "Weiter"

**Schritt 1.2: Dashboard-Layout**
- **Route**: `/dashboard`
- **Position**: top
- **Target**: `[data-onboarding="dashboard-header"]`
- **Inhalt**: Erklärung des Dashboard-Layouts
- **Aktion**: Benutzer klickt "Weiter"

**Schritt 1.3: Requests-Bereich**
- **Route**: `/dashboard`
- **Position**: top
- **Target**: `[data-onboarding="requests-section"]`
- **Inhalt**: Erklärung des Requests-Bereichs
- **Aktion**: Benutzer klickt "Weiter"

**Schritt 1.4: Worktime-Statistiken**
- **Route**: `/dashboard`
- **Position**: top
- **Target**: `[data-onboarding="worktime-stats"]`
- **Inhalt**: Erklärung der Zeiterfassungs-Statistiken
- **Aktion**: Benutzer klickt "Weiter"

### Prozess 2: Request erstellen

**Schritt 2.1: Request-Button finden**
- **Route**: `/dashboard`
- **Position**: bottom
- **Target**: `[data-onboarding="create-request-button"]`
- **Inhalt**: "Klicken Sie hier, um einen neuen Request zu erstellen"
- **Aktion**: Benutzer klickt auf Request-Button (Tour pausiert, Modal öffnet sich)

**Schritt 2.2: Request-Formular**
- **Route**: `/dashboard` (Modal offen)
- **Position**: center
- **Target**: `[data-onboarding="request-form"]`
- **Inhalt**: Erklärung der Request-Formularfelder
- **Aktion**: Benutzer füllt Formular aus (optional, kann übersprungen werden)

**Schritt 2.3: Request absenden**
- **Route**: `/dashboard` (Modal offen)
- **Position**: bottom
- **Target**: `[data-onboarding="request-submit"]`
- **Inhalt**: "Klicken Sie auf 'Erstellen', um den Request abzusenden"
- **Aktion**: Benutzer klickt "Erstellen" (Tour setzt fort nach Modal-Schließung)

### Prozess 3: Task-Management

**Schritt 3.1: Worktracker öffnen**
- **Route**: `/dashboard`
- **Position**: left
- **Target**: `[data-onboarding="worktracker-menu"]`
- **Inhalt**: "Klicken Sie hier, um zum Worktracker zu gelangen"
- **Aktion**: Benutzer navigiert zu `/worktracker`

**Schritt 3.2: Task-Liste**
- **Route**: `/worktracker`
- **Position**: top
- **Target**: `[data-onboarding="task-list"]`
- **Inhalt**: Erklärung der Task-Liste
- **Aktion**: Benutzer klickt "Weiter"

**Schritt 3.3: Task erstellen**
- **Route**: `/worktracker`
- **Position**: bottom
- **Target**: `[data-onboarding="create-task-button"]`
- **Inhalt**: "Erstellen Sie einen neuen Task"
- **Aktion**: Benutzer klickt auf Task-Button

### Prozess 4: Zeiterfassung

**Schritt 4.1: Zeiterfassung starten**
- **Route**: `/worktracker`
- **Position**: top
- **Target**: `[data-onboarding="start-worktime"]`
- **Inhalt**: "Starten Sie die Zeiterfassung"
- **Aktion**: Benutzer startet Zeiterfassung

**Schritt 4.2: Zeiterfassung stoppen**
- **Route**: `/worktracker`
- **Position**: top
- **Target**: `[data-onboarding="stop-worktime"]`
- **Inhalt**: "Stoppen Sie die Zeiterfassung"
- **Aktion**: Benutzer stoppt Zeiterfassung

### Prozess 5: Cerebro Wiki

**Schritt 5.1: Cerebro öffnen**
- **Route**: `/worktracker` (oder andere)
- **Position**: left
- **Target**: `[data-onboarding="cerebro-menu"]`
- **Inhalt**: "Öffnen Sie das Cerebro Wiki"
- **Aktion**: Benutzer navigiert zu `/cerebro`

**Schritt 5.2: Artikel suchen**
- **Route**: `/cerebro`
- **Position**: top
- **Target**: `[data-onboarding="cerebro-search"]`
- **Inhalt**: "Suchen Sie nach Artikeln"
- **Aktion**: Benutzer klickt "Weiter"

## Technische Details

### Highlighting von UI-Elementen

**Aktueller Standard im Projekt**: 
- Modals verwenden `@headlessui/react` Dialog
- Mobile: Vollbild-Modal mit `bg-black/30` Overlay
- Desktop: Sidepane (rechts) mit `bg-black/10` Overlay
- **KEIN Highlighting von Elementen** - nur Modals/Sidepanes

**Empfehlung: Overlay mit Spotlight** (neue Funktionalität für Onboarding)

Da es bisher kein Highlighting gibt, implementieren wir ein einfaches Overlay-System:

```typescript
// Overlay-Komponente
const OnboardingOverlay = ({ target, isActive }) => {
  if (!isActive || !target) return null;
  
  const element = document.querySelector(target);
  if (!element) return null;
  
  const rect = element.getBoundingClientRect();
  
  return (
    <>
      {/* Dunkles Overlay über gesamte Seite */}
      <div className="fixed inset-0 z-40 bg-black/50" />
      
      {/* Spotlight auf Ziel-Element (durch SVG-Mask) */}
      <svg className="fixed inset-0 z-40 pointer-events-none">
        <defs>
          <mask id="spotlight">
            <rect width="100%" height="100%" fill="black" />
            <rect
              x={rect.left}
              y={rect.top}
              width={rect.width}
              height={rect.height}
              fill="white"
              rx="8"
            />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="black"
          opacity="0.5"
          mask="url(#spotlight)"
        />
      </svg>
      
      {/* Border um Ziel-Element */}
      <div 
        className="absolute z-50 border-4 border-blue-500 rounded-lg pointer-events-none"
        style={{
          left: rect.left - 4,
          top: rect.top - 4,
          width: rect.width + 8,
          height: rect.height + 8,
        }}
      />
    </>
  );
};
```

**Warum dieser Ansatz?**
- Konsistent mit bestehendem Modal-Design (Overlay-Pattern)
- Einfach zu implementieren
- Funktioniert mit allen Elementen
- Keine zusätzlichen Dependencies
- Responsive und Dark Mode kompatibel

### Navigation während Tour

**Entscheidung: Navigation erlauben**

- Benutzer kann frei navigieren während der Tour
- Tour passt sich an aktuelle Route an
- Nur Schritte für aktuelle Route werden angezeigt
- Tour kann jederzeit abgebrochen werden ("Tour beenden" Button)
- Tour kann in Settings später wieder aktiviert werden

### Fortschritt speichern

**Backend-Speicherung**:
```typescript
// In userController.ts
updateOnboardingProgress: async (req, res) => {
  const { currentStep, completedSteps } = req.body;
  const userId = req.userId;
  
  await prisma.user.update({
    where: { id: userId },
    data: {
      onboardingProgress: {
        currentStep,
        completedSteps
      }
    }
  });
}
```

**LocalStorage-Fallback**:
```typescript
// In OnboardingContext.tsx
const saveProgress = (progress) => {
  localStorage.setItem('onboardingProgress', JSON.stringify(progress));
  // Versuche Backend-Speicherung
  api.updateOnboardingProgress(progress).catch(console.error);
};
```

### Analytics/Tracking

**Event-Tracking**:
```typescript
// In OnboardingContext.tsx
const trackEvent = async (stepId: string, stepTitle: string, action: 'started' | 'completed' | 'skipped' | 'cancelled', duration?: number) => {
  try {
    await api.post('/users/onboarding/event', {
      stepId,
      stepTitle,
      action,
      duration
    });
  } catch (error) {
    console.error('Fehler beim Tracking:', error);
    // Fehler blockieren nicht die Tour
  }
};
```

**Analytics-Endpunkt für Admins**:
```typescript
// In userController.ts
getOnboardingAnalytics: async (req, res) => {
  // Nur für Admins
  if (!isAdmin(req.userId)) {
    return res.status(403).json({ message: 'Keine Berechtigung' });
  }
  
  const events = await prisma.onboardingEvent.findMany({
    include: {
      user: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          email: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
  
  // Gruppiere nach User
  const analytics = events.reduce((acc, event) => {
    const userId = event.userId;
    if (!acc[userId]) {
      acc[userId] = {
        user: event.user,
        steps: [],
        completedSteps: 0,
        skippedSteps: 0,
        totalDuration: 0
      };
    }
    acc[userId].steps.push(event);
    if (event.action === 'completed') {
      acc[userId].completedSteps++;
      if (event.duration) {
        acc[userId].totalDuration += event.duration;
      }
    } else if (event.action === 'skipped') {
      acc[userId].skippedSteps++;
    }
    return acc;
  }, {});
  
  res.json({ analytics: Object.values(analytics) });
}
```

### Tour in Settings wieder aktivieren

**Settings-Seite erweitern**:
```typescript
// In Settings.tsx
const handleRestartOnboarding = async () => {
  try {
    await api.put('/users/onboarding/reset');
    // Tour startet automatisch beim nächsten Seitenwechsel
    navigate('/dashboard');
  } catch (error) {
    showMessage('Fehler beim Zurücksetzen der Tour', 'error');
  }
};

// In Settings-UI
<button onClick={handleRestartOnboarding}>
  {t('settings.onboarding.restart')}
</button>
```

**Backend-Endpunkt**:
```typescript
// In userController.ts
resetOnboarding: async (req, res) => {
  const userId = req.userId;
  
  await prisma.user.update({
    where: { id: userId },
    data: {
      onboardingCompleted: false,
      onboardingProgress: null,
      onboardingStartedAt: null,
      onboardingCompletedAt: null
    }
  });
  
  res.json({ message: 'Onboarding zurückgesetzt' });
}
```

## Design-Spezifikationen

### Modal-Design

**Größe**:
- Desktop: max-width 500px
- Mobile: full-width mit Padding

**Layout**:
```
┌─────────────────────────────────┐
│ [Fortschrittsbalken]            │
├─────────────────────────────────┤
│ [Titel]                         │
│ [Beschreibung]                  │
│                                 │
│ [Optional: Bild/Icon]           │
├─────────────────────────────────┤
│ [Zurück] [Weiter] [Überspringen]│
└─────────────────────────────────┘
```

**Farben** (konsistent mit Design-Standards):
- Hintergrund: `bg-white dark:bg-gray-800`
- Border: `border-gray-300 dark:border-gray-700`
- Primär-Button: `bg-blue-600 hover:bg-blue-700`
- Sekundär-Button: `bg-gray-200 dark:bg-gray-700`

### Fortschrittsbalken

```typescript
const ProgressBar = ({ current, total }) => (
  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
    <div 
      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
      style={{ width: `${(current / total) * 100}%` }}
    />
  </div>
);
```

## Fehlerbehandlung

### Szenarien

1. **Element nicht gefunden**
   - Fallback: Modal in Center positionieren
   - Warnung in Console
   - Tour setzt fort

2. **Route nicht erreichbar**
   - Warte auf Route-Wechsel
   - Timeout nach 5 Sekunden
   - Überspringe Schritt oder zeige Fehler

3. **Backend-Fehler**
   - LocalStorage als Fallback
   - Retry-Mechanismus
   - Warnung an Benutzer (optional)

## Performance-Optimierungen

1. **Lazy Loading**: Onboarding-Komponenten nur laden, wenn benötigt
2. **Memoization**: React.memo für OnboardingTour
3. **Debouncing**: Fortschritt-Speicherung debounced (500ms)
4. **Code Splitting**: Onboarding-Code in separatem Chunk

## Testing-Strategie

### Unit Tests
- OnboardingContext-Logik
- Schritt-Navigation
- Fortschritt-Speicherung

### Integration Tests
- Tour-Start/Stop
- Schritt-Wechsel
- Route-Navigation

### E2E Tests
- Komplette Tour durchlaufen
- Tour überspringen
- Tour fortsetzen nach Reload

## Rollout-Strategie

### Phase 1: Beta-Testing
- Aktivierung für Test-Benutzer
- Feedback sammeln
- Anpassungen vornehmen

### Phase 2: Graduelle Einführung
- Aktivierung für neue Benutzer
- Bestehende Benutzer können Tour manuell starten

### Phase 3: Vollständige Aktivierung
- Alle neuen Benutzer erhalten Tour automatisch
- Bestehende Benutzer können Tour in Settings starten

## Wartung und Erweiterung

### Neue Schritte hinzufügen
1. Schritt in `onboardingSteps.ts` definieren
2. Übersetzungen hinzufügen
3. Optional: `data-onboarding` Attribute in Komponenten hinzufügen

### Tour anpassen
- Schritte können in Backend konfiguriert werden (spätere Erweiterung)
- Admin-Interface für Tour-Konfiguration (optional)

## Berechtigungsbasierte Schritt-Filterung

### Wichtige Erkenntnisse

1. **Neue Benutzer (Registrierung)**: Erhalten automatisch **User-Rolle (ID 2)**
   - Hat Zugriff auf: dashboard, worktracker, consultations, payroll, cerebro, settings, profile, organization_management
   - **KEIN** Zugriff auf: team_worktime_control

2. **Benutzer, die einer Organisation beitreten**: Erhalten zusätzlich **Hamburger-Rolle (ID 999)**
   - Hat Zugriff auf: dashboard, settings, profile, cerebro
   - **KEIN** Zugriff auf: worktracker, consultations, payroll, organization_management, team_worktime_control

3. **Admin-Rolle (ID 1)**: Hat Zugriff auf alles

### Implementierung

- Onboarding-Schritte müssen basierend auf Berechtigungen gefiltert werden
- Nur Schritte für Seiten/Funktionen anzeigen, auf die der Benutzer Zugriff hat
- `requiredPermissions` in Schritt-Definitionen verwenden
- `roleFilter` für Rollen-spezifische Schritte

### Beispiel-Schritte mit Berechtigungen

```typescript
// Schritt nur für User-Rolle (nicht für Hamburger)
{
  id: 'worktracker_overview',
  title: 'Worktracker',
  description: 'Verwalten Sie Ihre Aufgaben...',
  route: '/worktracker',
  requiredPermissions: [
    { entity: 'worktracker', entityType: 'page', accessLevel: 'read' }
  ],
  roleFilter: ['User', 'Admin']
}

// Schritt nur für Hamburger-Rolle
{
  id: 'cerebro_basics',
  title: 'Cerebro Wiki',
  description: 'Lesen Sie Artikel im Wiki...',
  route: '/cerebro',
  requiredPermissions: [
    { entity: 'cerebro', entityType: 'page', accessLevel: 'read' }
  ],
  roleFilter: ['Hamburger', 'User', 'Admin']
}
```

## Zusammenfassung der Entscheidungen

1. ✅ **Navigation während Tour**: Erlaubt - Benutzer kann frei navigieren
2. ✅ **Highlighting-Stil**: Overlay mit Spotlight (neue Funktionalität, konsistent mit Modal-Design)
3. ✅ **Tour für bestehende Benutzer**: In Settings verfügbar ("Tour neu starten")
4. ✅ **Prozess- vs. Seitenorientierung**: Beide - Prozessorientiert als Hauptansatz
5. ✅ **Berechtigungen**: Schritte werden basierend auf Benutzer-Berechtigungen gefiltert
6. ✅ **Analytics**: Vollständiges Tracking welcher User welchen Schritt wann absolviert hat
7. ✅ **Tour abbrechen**: Möglich, kann später in Settings wieder aktiviert werden

## Nächste Schritte

1. ✅ Plan reviewen und bestätigen
2. ✅ Backend-Implementierung starten (Schema, API-Endpunkte, Analytics)
3. ✅ Frontend-Kernkomponenten implementieren (Context, Tour-Komponente, Overlay)
4. ✅ Berechtigungsbasierte Filterung implementieren
5. ✅ Erste Schritt-Definitionen erstellen (mit Berechtigungen)
6. ✅ Settings-Integration (Tour neu starten)
7. ✅ Analytics-Dashboard (optional, für Admins)
8. ✅ Testing durchführen
9. ✅ Feedback einholen und anpassen


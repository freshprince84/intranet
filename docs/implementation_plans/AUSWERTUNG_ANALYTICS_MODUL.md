# Auswertungs- und Analytics-Integration - Implementierungsvorschlag

## Inhaltsverzeichnis

1. [Zusammenfassung](#zusammenfassung)
2. [Analyse der bestehenden Systemfunktionalität](#analyse-der-bestehenden-systemfunktionalität)
3. [Anforderungsdefinition](#anforderungsdefinition)
4. [Datenverfügbarkeit und -struktur](#datenverfügbarkeit-und--struktur)
5. [Best Practices und Empfehlungen](#best-practices-und-empfehlungen)
6. [Vorschlag: Integration in bestehende Module](#vorschlag-integration-in-bestehende-module)
7. [Technische Implementierung](#technische-implementierung)
8. [Benutzeroberfläche und Navigation](#benutzeroberfläche-und-navigation)
9. [Berechtigungskonzept](#berechtigungskonzept)
10. [Implementierungsplan](#implementierungsplan)

---

## Zusammenfassung

Dieses Dokument analysiert die Anforderungen für Analytics- und Auswertungsfunktionen im Intranet-System. **Wichtig: Keine neuen Menüpunkte!** Stattdessen werden die Funktionen in bestehende Module integriert:

**Hauptanforderungen:**
- To-Do-Statuswechsel-Übersicht für bestimmte Rollen in Organisationen
- Analyse innerhalb von Schichten (Workcenter/Branch) und Zeiträumen (Woche, Monat, Jahr)
- Häufigkeitsanalyse: Welche To-Dos von wem wie oft erledigt/nicht erledigt werden
- Request-Analyse: Welcher User hat welche/wie viele Requests erstellt

**Integration-Strategie:**
- **Workcenter** (`/team-worktime-control`): Erweitern mit To-Do- und Request-Analytics-Tabs
- **Worktracker** (`/worktracker`): Ergänzen um Analytics-Bereich (optional)
- **Dashboard** (`/dashboard`): Widgets für schnellen Überblick

---

## Analyse der bestehenden Systemfunktionalität

### 1. Datenstruktur

#### Tasks (To-Dos)
- **Modell**: `Task` in `backend/prisma/schema.prisma`
- **Status-Typen**: `open`, `in_progress`, `improval`, `quality_control`, `done`
- **Zuweisungen**: 
  - `responsibleId` (optional, User)
  - `qualityControlId` (required, User)
  - `roleId` (optional, für Rollen-basierte Zuweisung)
- **Orte**: `branchId` (Workcenter)
- **Zeitstempel**: `createdAt`, `updatedAt`
- **Status-Änderungen**: Werden aktuell über `updatedAt` getrackt, aber **kein explizites Audit-Log** vorhanden

#### Requests
- **Modell**: `Request` in `backend/prisma/schema.prisma`
- **Status-Typen**: `approval`, `approved`, `to_improve`, `denied`
- **Zuweisungen**:
  - `requesterId` (User, der Request erstellt hat)
  - `responsibleId` (User, der für Request zuständig ist)
- **Orte**: `branchId` (Workcenter)
- **Zeitstempel**: `createdAt`, `updatedAt`

#### WorkTime (Schichten)
- **Modell**: `WorkTime` in `backend/prisma/schema.prisma`
- **Felder**:
  - `userId` (User)
  - `branchId` (Workcenter/Branch)
  - `startTime`, `endTime` (Schichtzeitraum)
  - `createdAt`, `updatedAt`
- **Verknüpfung mit Tasks**: Über `WorkTimeTask` (Many-to-Many)

#### Organisationen und Rollen
- **Multi-Tenant-System**: Organisationen mit organisationsspezifischen Rollen
- **Rollen**: `Role` mit `organizationId`
- **User-Rollen**: `UserRole` verbindet User mit Rollen
- **Berechtigungen**: `Permission` mit rollenbasierter Zugriffssteuerung

### 2. Bestehende Controller und API-Endpunkte

#### Task Controller (`backend/src/controllers/taskController.ts`)
- Status-Änderungen werden verarbeitet, aber **kein Audit-Log** erstellt
- Benachrichtigungen werden bei Statusänderungen versendet
- Aktuell wird nur `updatedAt` bei Statusänderungen aktualisiert

#### Request Controller (`backend/src/controllers/requestController.ts`)
- Requests können erstellt, aktualisiert und abgerufen werden
- `createdAt` zeigt Erstellungszeitpunkt
- `requesterId` zeigt, wer den Request erstellt hat

### 3. Bestehende Frontend-Komponenten

#### Navigation (`frontend/src/components/Sidebar.tsx`)
- Aktuell vorhandene Menüpunkte:
  - Dashboard
  - Worktracker
  - Beratungen
  - Workcenter
  - Lohnabrechnung
  - Cerebro
  - Organisation
  - Einstellungen
- Gruppierung: `main`, `management`, `settings`

#### Berechtigungssystem
- Rollenbasiert über `Permission`-System
- Frontend-Check über `usePermissions()` Hook
- Seiten-basierte Berechtigungen (`page`-Typ)

---

## Anforderungsdefinition

### 1. To-Do-Statuswechsel-Analyse

**Zielgruppe**: Bestimmte Rollen in Organisationen (z.B. Manager, Team-Leader, Admins)

**Anforderungen:**
- Übersicht: Welche To-Dos hat ein User erledigt/nicht erledigt
- **Zeitraum-Filterung**:
  - Schicht (basierend auf WorkTime startTime/endTime)
  - Woche (kalendarische Woche)
  - Monat (kalendarischer Monat)
  - Jahr (kalendarisches Jahr)
- **Workcenter-Filterung**: Innerhalb eines bestimmten Branches/Workcenters
- **Status-Änderungen**: Welche To-Dos haben Statuswechsel erfahren (z.B. von `open` → `done`)
- **Verantwortlichkeit**: Zeigen, wer für welchen To-Do verantwortlich war

### 2. To-Do-Häufigkeitsanalyse

**Zielgruppe**: Bestimmte Rollen in Organisationen

**Anforderungen:**
- **Welche To-Dos von wem wie oft erledigt**: 
  - Häufigste erledigte To-Dos pro User
  - Häufigste nicht erledigte To-Dos pro User
  - Vergleich zwischen Usern (Leaderboards)
- **Zeitraum-Filterung**: Woche, Monat, Jahr
- **Workcenter-Filterung**: Nach Branch/Workcenter

### 3. Request-Analyse

**Zielgruppe**: Bestimmte Rollen in Organisationen

**Anforderungen:**
- **Welcher User hat welche Requests erstellt**:
  - Liste aller Requests pro User
  - Anzahl der Requests pro User
  - Request-Status-Verteilung pro User
- **Zeitraum-Filterung**: Woche, Monat, Jahr
- **Workcenter-Filterung**: Nach Branch/Workcenter

### 4. Ergänzende Anforderungen

- **Rollenbasierte Zugriffssteuerung**: Nur bestimmte Rollen können Auswertungen sehen
- **Multi-Tenant**: Auswertungen sollen organisationsspezifisch sein
- **Performance**: Auswertungen sollten performant sein (Aggregation, Caching)

---

## Datenverfügbarkeit und -struktur

### Vorhandene Daten

✅ **Verfügbar:**
- Task-Status (aktueller Status)
- Task-Zuweisungen (responsibleId, qualityControlId, roleId)
- Task-Branches (branchId)
- Task-Zeitstempel (createdAt, updatedAt)
- Request-Ersteller (requesterId)
- Request-Status
- Request-Zeitstempel (createdAt, updatedAt)
- WorkTime-Daten (Schichten mit startTime/endTime)
- WorkTime-Branches (branchId)
- WorkTime-User
- Organisationen und Rollen

⚠️ **Nicht vorhanden (muss ergänzt werden):**
- **Task-Status-Audit-Log**: Aktuell gibt es kein explizites Log für Statusänderungen
  - **Lösung**: Neues `TaskStatusHistory`-Modell erstellen (siehe technische Implementierung)

### Datenaggregation

Für die Auswertungen müssen folgende Aggregationen durchgeführt werden:

1. **Task-Statuswechsel pro Zeitraum**:
   - Filterung nach `updatedAt` im Zeitraum
   - Gruppierung nach User (`responsibleId` oder `qualityControlId`)
   - Gruppierung nach Branch (`branchId`)
   - Status-Wechsel-Tracking (mit `TaskStatusHistory`)

2. **Task-Erfüllungsrate pro User**:
   - Count von Tasks mit Status `done` pro User
   - Count von Tasks mit anderen Status pro User
   - Berechnung der Erfüllungsrate

3. **Request-Statistiken pro User**:
   - Count von Requests pro `requesterId`
   - Gruppierung nach Status
   - Filterung nach Zeitraum (`createdAt`)

4. **Schicht-basierte Analyse**:
   - Verknüpfung von Tasks mit WorkTimes über `WorkTimeTask`
   - Filterung von Tasks innerhalb einer Schicht (startTime bis endTime)

---

## Best Practices und Empfehlungen

Basierend auf Web-Recherche und Best Practices:

### 1. Platzierung von Analytics-Dashboards

**Empfehlung:**
- **Separates Analytics-Modul** in der Navigation
- **Unter "Management"-Gruppe** in der Sidebar (neben "Organisation")
- **Zusätzlich**: Analytics-Widgets im Dashboard für schnellen Überblick

**Begründung:**
- Analytics sind Management-funktionalität, passt zu "Management"-Gruppe
- Separate Seite ermöglicht detaillierte Analysen ohne Hauptfunktionen zu stören
- Widgets im Dashboard geben schnellen Überblick

### 2. UI/UX-Best Practices

- **Filter-First-Ansatz**: Nutzer wählt zuerst Filter (Zeitraum, Branch, User), dann werden Ergebnisse angezeigt
- **Verschiedene Visualisierungen**: 
  - Tabellen für detaillierte Daten
  - Diagramme/Charts für Übersichten
  - Karten für Zusammenfassungen
- **Export-Funktionalität**: PDF/Excel-Export für Berichte
- **Interaktive Filter**: Schnellfilter für häufig verwendete Zeiträume (heute, diese Woche, dieser Monat)

### 3. Performance-Best Practices

- **Aggregation auf Datenbank-Ebene**: Komplexe Berechnungen in PostgreSQL durchführen
- **Caching**: Ergebnisse für häufige Queries cachen (z.B. tägliche Aggregationen)
- **Pagination**: Große Datenmengen paginieren
- **Indizierung**: Indizes auf `updatedAt`, `createdAt`, `userId`, `branchId` für schnelle Filterung

### 4. Rollenbasierte Zugriffssteuerung

- **Granulare Berechtigungen**:
  - `analytics_view`: Basis-Zugriff auf Analytics
  - `analytics_view_all`: Alle Daten sehen (ohne Organisation-Filter)
  - `analytics_export`: Export-Funktionen nutzen
- **Organisations-Isolation**: User sehen nur Daten ihrer Organisation

---

## Vorschlag: Integration in bestehende Module

### Strategie: Keine neuen Menüpunkte

**Prinzip:** Alle Analytics-Funktionen werden in bestehende Module integriert, um die Navigation schlank zu halten und die User Experience zu verbessern.

### 1. Workcenter-Integration (Hauptplatzierung)

**Route**: `/team-worktime-control` (bestehend)

**Erweiterung**: Workcenter wird um **Tab-Navigation** erweitert:

```
Workcenter
├── Tab 1: Arbeitszeiten & Aktivitäten (bestehend, ERWEITERT)
│   ├── Aktive Benutzer & Zeiterfassungen (bestehend)
│   ├── [NEU] To-Dos pro Benutzer (für ausgewähltes Datum)
│   │   └── Erledigt / Nicht erledigt pro User
│   └── [NEU] Requests pro Benutzer (für ausgewähltes Datum)
│       └── Erstellt / Verantwortlich pro User
│   Ziel: "Wer hat wann gearbeitet + was wurde gemacht"
│
├── Tab 2: To-Do-Auswertungen (NEU)
│   ├── Was wurde gemacht (nicht wer) - Zeitreihenfolge
│   ├── Statuswechsel-Übersicht (von wem, aber Fokus auf "was")
│   ├── Häufigkeitsanalyse (Erledigungsrate)
│   └── Schicht-basierte To-Do-Analysen
│   Ziel: "Was wurde heute/gestern der Reihe nach gemacht (oder nicht)"
│
└── Tab 3: Request-Auswertungen (NEU)
    ├── Was wurde angefragt (nicht wer) - Zeitreihenfolge
    ├── Request-Statistiken pro User (von wem, aber Fokus auf "was")
    ├── Request-Status-Verteilung
    └── Zeitraum-Analysen
    Ziel: "Was wurde heute/gestern angefragt der Reihe nach"
```

**Konzept-Unterschied:**

**Tab 1: User-zentrierte Detailansicht**
- Fokus: **Wer** hat **wann** gearbeitet
- Erweitert um: **Was** hat dieser User gemacht (To-Dos + Requests)
- Pro User, pro Tag: Vollständiges Bild der Aktivität
- Use Case: "Wie war der Tag von User X?" / "Was hat User Y heute gemacht?"

**Tab 2 & 3: Aktivitäts-zentrierte Übersichten**
- Fokus: **Was** wurde gemacht (nicht wer)
- Zeitreihenfolge der Aktivitäten
- Aggregierte Statistiken
- Use Case: "Was wurde heute insgesamt gemacht?" / "Welche To-Dos/Requests gab es heute?"

**Begründung:**
- **Intuitives UX**: Wenig Klicks, alle Infos pro User auf einen Blick (Tab 1)
- Workcenter zeigt bereits **Arbeitszeiten und Schichten** → natürliche Erweiterung
- Workcenter ist bereits **Management-orientiert** → Analytics passen thematisch
- **Gemeinsame Filter** (Datum, Branch, User) können wiederverwendet werden
- **Kein zusätzlicher Menüpunkt** → einfachere Navigation

### 2. Worktracker-Integration (Optional)

**Route**: `/worktracker` (bestehend)

**Erweiterung**: Optional Analytics-Bereich im Worktracker (z.B. Sidepane oder erweiterte Ansicht)

```
Worktracker
├── [Bestehend] Task-Liste & Filter
└── [Optional] Analytics-Sidepane
    └── Erfüllungsrate & Statistiken für aktuellen Filter
```

**Begründung:**
- Für User, die direkt im Worktracker arbeiten
- Kann als **Sidepane/Modal** integriert werden (nicht zwingend sichtbar)

### 3. Dashboard-Widgets (Übersicht)

**Route**: `/dashboard` (bestehend)

**Erweiterung**: Widgets für schnellen Überblick:

```
Dashboard
├── [Bestehend] Existierende Widgets
└── [NEU] Analytics-Widgets (nur für berechtigte Rollen)
    ├── Kompakte To-Do-Übersicht
    ├── Request-Statistik
    └── Link zu detaillierten Analysen in Workcenter
```

**Begründung:**
- **Schneller Überblick** ohne Navigation
- **Link zu Details** in Workcenter für vertiefende Analysen

---

## Technische Implementierung

### 1. Datenbank-Erweiterungen

#### Neues Modell: `TaskStatusHistory`

```prisma
model TaskStatusHistory {
  id          Int       @id @default(autoincrement())
  taskId      Int
  userId      Int       // User, der Status geändert hat
  oldStatus   TaskStatus?
  newStatus   TaskStatus
  changedAt   DateTime  @default(now())
  branchId    Int       // Branch zum Zeitpunkt der Änderung
  task        Task      @relation(fields: [taskId], references: [id])
  user        User      @relation(fields: [userId], references: [id])
  branch      Branch    @relation(fields: [branchId], references: [id])

  @@index([taskId])
  @@index([userId])
  @@index([changedAt])
  @@index([branchId])
}
```

**Ergänzungen in bestehenden Modellen:**

```prisma
model Task {
  // ... bestehende Felder
  statusHistory TaskStatusHistory[]
}

model User {
  // ... bestehende Felder
  taskStatusChanges TaskStatusHistory[]
}

model Branch {
  // ... bestehende Felder
  taskStatusChanges TaskStatusHistory[]
}
```

**Migration**: Neue Migration erstellen für `TaskStatusHistory`-Tabelle

### 2. Backend-Implementierung

#### Neuer Controller: `analyticsController.ts`

**API-Endpunkte:**

```typescript
// To-Do-Auswertungen
GET /api/analytics/todos/status-changes
  Query-Parameter: userId?, branchId?, startDate, endDate, period (week|month|year)
  
GET /api/analytics/todos/completion-rate
  Query-Parameter: userId?, branchId?, startDate, endDate
  
GET /api/analytics/todos/frequency
  Query-Parameter: userId?, branchId?, startDate, endDate, status?

// Request-Auswertungen
GET /api/analytics/requests/by-user
  Query-Parameter: userId?, branchId?, startDate, endDate
  
GET /api/analytics/requests/statistics
  Query-Parameter: branchId?, startDate, endDate

// Schicht-Analysen
GET /api/analytics/shifts/todos
  Query-Parameter: workTimeId?, branchId?, startDate, endDate
```

#### Task-Controller-Erweiterung

**Anpassung in `taskController.ts`:**

Bei Statusänderungen (`updateTask`):
- Erstelle `TaskStatusHistory`-Eintrag
- Speichere `oldStatus`, `newStatus`, `userId`, `branchId`, `changedAt`

### 3. Frontend-Implementierung

#### Workcenter-Erweiterung

**Hauptänderung: `frontend/src/pages/TeamWorktimeControl.tsx`**

```typescript
const TeamWorktimeControl: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'worktimes' | 'todos' | 'requests'>('worktimes');
  // ... bestehender State
  // ... bestehende Funktionen
  
  return (
    <div>
      {/* Bestehende Header */}
      
      {/* Tab-Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('worktimes')}
            className={activeTab === 'worktimes' ? 'active-tab' : 'tab'}
          >
            Arbeitszeiten & Aktivitäten
          </button>
          <button
            onClick={() => setActiveTab('todos')}
            className={activeTab === 'todos' ? 'active-tab' : 'tab'}
          >
            To-Do-Auswertungen
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={activeTab === 'requests' ? 'active-tab' : 'tab'}
          >
            Request-Auswertungen
          </button>
        </nav>
      </div>
      
      {/* Tab-Content */}
      {activeTab === 'worktimes' && (
        <ActiveUsersList 
          {...existingProps}
          showTodos={true}      // NEU: To-Dos anzeigen
          showRequests={true}   // NEU: Requests anzeigen
          selectedDate={selectedDate}
        />
      )}
      {activeTab === 'todos' && (
        <TodoAnalyticsTab
          selectedDate={selectedDate}
          selectedBranch={selectedBranch}
          selectedUser={selectedUser}
        />
      )}
      {activeTab === 'requests' && (
        <RequestAnalyticsTab
          selectedDate={selectedDate}
          selectedBranch={selectedBranch}
          selectedUser={selectedUser}
        />
      )}
    </div>
  );
};
```

#### ActiveUsersList-Erweiterung

**Erweiterung: `frontend/src/components/teamWorktime/ActiveUsersList.tsx`**

```typescript
interface ActiveUsersListProps {
  // ... bestehende Props
  showTodos?: boolean;      // NEU
  showRequests?: boolean;   // NEU
  selectedDate: string;     // Für To-Do/Request-Filterung
}

const ActiveUsersList: React.FC<ActiveUsersListProps> = ({
  // ... bestehende Props
  showTodos = false,
  showRequests = false,
  selectedDate
}) => {
  const [userTodos, setUserTodos] = useState<Record<number, Task[]>>({});
  const [userRequests, setUserRequests] = useState<Record<number, Request[]>>({});
  const [expandedUsers, setExpandedUsers] = useState<Set<number>>(new Set());
  
  // Lade To-Dos für User (wenn showTodos aktiv)
  useEffect(() => {
    if (showTodos && selectedDate) {
      loadUserTodos(selectedDate);
    }
  }, [showTodos, selectedDate]);
  
  // Lade Requests für User (wenn showRequests aktiv)
  useEffect(() => {
    if (showRequests && selectedDate) {
      loadUserRequests(selectedDate);
    }
  }, [showRequests, selectedDate]);
  
  // Render erweitert um To-Dos/Requests pro User
  return (
    <div>
      {groupedUsers.map((group) => (
        <div key={group.user.id}>
          {/* Bestehende User-Zeile */}
          
          {/* Erweiterte Info (wenn aktiv) */}
          {(showTodos || showRequests) && (
            <div className="mt-2 ml-4 border-l-2 border-gray-200 pl-4">
              {showTodos && (
                <div>
                  <h4>To-Dos ({selectedDate}):</h4>
                  <TodoSummary 
                    todos={userTodos[group.user.id] || []}
                    userId={group.user.id}
                  />
                </div>
              )}
              {showRequests && (
                <div>
                  <h4>Requests ({selectedDate}):</h4>
                  <RequestSummary 
                    requests={userRequests[group.user.id] || []}
                    userId={group.user.id}
                  />
                </div>
              )}
              <button onClick={() => toggleExpand(group.user.id)}>
                {expandedUsers.has(group.user.id) ? 'Weniger anzeigen ▲' : 'Details anzeigen ▼'}
              </button>
              
              {expandedUsers.has(group.user.id) && (
                <div>
                  {/* Vollständige Liste */}
                  {showTodos && <TodoList todos={userTodos[group.user.id] || []} />}
                  {showRequests && <RequestList requests={userRequests[group.user.id] || []} />}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
```

#### Neue Tab-Komponenten

1. **`frontend/src/components/teamWorktime/TodoAnalyticsTab.tsx`**
   - To-Do-Statuswechsel-Übersicht
   - Häufigkeitsanalyse
   - Tabellen und Diagramme

2. **`frontend/src/components/teamWorktime/RequestAnalyticsTab.tsx`**
   - Request-Statistiken
   - User-basierte Übersichten

#### Neue Komponenten

1. **`frontend/src/components/analytics/TodoStatusChart.tsx`**
   - Chart für Statuswechsel (z.B. mit Recharts oder Chart.js)

2. **`frontend/src/components/analytics/UserCompletionRate.tsx`**
   - Übersicht über Erfüllungsraten pro User

#### Routing

**Keine Routing-Änderung nötig!** Alles bleibt in `/team-worktime-control`.

### 4. Berechtigungssystem

#### Neue Berechtigungen

- `analytics_view` - Basis-Zugriff auf Analytics
- `analytics_view_all` - Alle Daten sehen (ohne Org-Filter)
- `analytics_export` - Export-Funktionen

#### Middleware-Integration

```typescript
// In analyticsController.ts
import { hasPermission } from '../middleware/auth.middleware';

router.get('/todos/status-changes', 
  authenticate, 
  hasPermission('analytics_view'), 
  getTodoStatusChanges
);
```

---

## Benutzeroberfläche und Navigation

### 1. Keine Sidebar-Änderung nötig

**Vorteil:** Die Navigation bleibt unverändert. Alle Analytics sind über **Workcenter** erreichbar.

### 2. Workcenter-Erweiterung

**Erweiterung in `frontend/src/pages/TeamWorktimeControl.tsx`:**

```
┌─────────────────────────────────────────────────┐
│  Workcenter                                      │
├─────────────────────────────────────────────────┤
│  [Bestehende Filter: Datum, Branch, User]       │
│  (Bleiben über allen Tabs sichtbar)             │
├─────────────────────────────────────────────────┤
│  [Tab-Navigation]                               │
│  Arbeitszeiten & Aktivitäten | To-Dos | Requests│
│  ───────────────┬───────────────┴────────────── │
├─────────────────────────────────────────────────┤
│                                                  │
│  TAB 1: Arbeitszeiten & Aktivitäten             │
│  ┌───────────────────────────────────────────┐ │
│  │ User | Zeiten | To-Dos (erledigt/nicht)   │ │
│  │       |        | Requests (erstellt/...)   │ │
│  │ ──────┴────────┴────────────────────────── │ │
│  │ Max Mustermann                             │ │
│  │  08:00-17:00 (8.5h)                        │ │
│  │  To-Dos: ✓ 3 erledigt | ✗ 1 offen         │ │
│  │  Requests: 2 erstellt | 1 verantwortlich  │ │
│  │  [Details anzeigen ▼]                      │ │
│  │    → Liste aller To-Dos mit Status        │ │
│  │    → Liste aller Requests                  │ │
│  └───────────────────────────────────────────┘ │
│                                                  │
│  TAB 2: To-Do-Auswertungen                       │
│  ┌───────────────────────────────────────────┐ │
│  │ Zeit | To-Do | Status | Von wem            │ │
│  │ 08:15 | Task A | ✓ Erledigt | Max          │ │
│  │ 10:30 | Task B | ✗ Offen | Anna            │ │
│  │ 14:20 | Task C | → In Bearbeitung | Max    │ │
│  │ ...                                       │ │
│  │                                              │ │
│  │ Statistiken:                                │ │
│  │ - 12 erledigt, 3 offen, 2 in Bearbeitung   │ │
│  │ - Diagramm: Statusverteilung                │ │
│  └───────────────────────────────────────────┘ │
│                                                  │
│  TAB 3: Request-Auswertungen                     │
│  ┌───────────────────────────────────────────┐ │
│  │ Zeit | Request | Status | Von wem          │ │
│  │ 09:00 | Request A | ✓ Genehmigt | Max      │ │
│  │ 11:30 | Request B | ⏳ Offen | Anna         │ │
│  │ 15:45 | Request C | ✗ Abgelehnt | Max      │ │
│  │ ...                                       │ │
│  │                                              │ │
│  │ Statistiken:                                │ │
│  │ - 8 genehmigt, 2 offen, 1 abgelehnt        │ │
│  │ - Diagramm: Statusverteilung                │ │
│  └───────────────────────────────────────────┘ │
│                                                  │
└─────────────────────────────────────────────────┘
```

### 3. Tab-Navigation in Workcenter

**Implementierung:**
- **Tabs** oberhalb des Inhalts (wie in anderen Modulen)
- **Gemeinsame Filter** (Datum, Branch, User) bleiben über allen Tabs sichtbar
- **Tab-Wechsel** lädt entsprechende Daten

### 4. Tab 1: Arbeitszeiten & Aktivitäten (Erweiterung)

**Struktur:**

**Erweiterte User-Liste mit To-Dos und Requests:**

```
User-Karte/Zeile erweitert:
┌─────────────────────────────────────────────────┐
│ Max Mustermann                    [Bearbeiten] │
│ ─────────────────────────────────────────────   │
│ Arbeitszeit: 08:00 - 17:00 (8.5h)              │
│                                                 │
│ To-Dos (heute):                                 │
│   ✓ Task A - Erledigt um 14:30                 │
│   ✓ Task B - Erledigt um 16:00                 │
│   ✓ Task C - Erledigt um 16:45                 │
│   ✗ Task D - Offen                             │
│   📊 3 erledigt | 1 offen                      │
│                                                 │
│ Requests (heute):                               │
│   ✓ Request A - Genehmigt um 10:00             │
│   ✓ Request B - Genehmigt um 11:30             │
│   📊 2 erstellt                                │
│                                                 │
│ [Details anzeigen ▼] / [Details ausblenden ▲] │
└─────────────────────────────────────────────────┘
```

**Details-Ansicht (expandierbar):**
- Vollständige Liste aller To-Dos mit Status, Zeitstempel
- Vollständige Liste aller Requests mit Status, Zeitstempel
- Optional: Direkte Links zu To-Do/Request-Details

**Filterung:**
- Pro ausgewähltes **Datum** (wie bisher)
- To-Dos/Requests werden für dieses Datum gefiltert
- Zeigt nur To-Dos/Requests, die mit dem User in Verbindung stehen:
  - To-Dos: `responsibleId` oder `qualityControlId` = User
  - Requests: `requesterId` oder `responsibleId` = User

### 5. Tab 2: To-Do-Auswertungen

**Struktur:**

**Zeitreihenfolge der To-Dos:**

- **Hauptansicht**: Liste aller To-Dos chronologisch
  - Zeit | To-Do-Titel | Status | Von wem | Zu wem
  - Filterbar nach Status, User, Branch

- **Statistiken:**
  - Anzahl erledigt / offen / in Bearbeitung
  - Diagramm: Statusverteilung
  - Erfüllungsrate pro User

- **Fokus**: **Was** wurde gemacht (nicht wer)

### 6. Tab 3: Request-Auswertungen

**Struktur:**

**Zeitreihenfolge der Requests:**

- **Hauptansicht**: Liste aller Requests chronologisch
  - Zeit | Request-Titel | Status | Von wem | Zu wem
  - Filterbar nach Status, User, Branch

- **Statistiken:**
  - Anzahl genehmigt / offen / abgelehnt
  - Diagramm: Statusverteilung
  - Request-Rate pro User

- **Fokus**: **Was** wurde angefragt (nicht wer)

---

## Berechtigungskonzept

### Rollen mit Analytics-Zugriff

**Empfohlene Rollen:**
- **Admin**: Vollzugriff (`analytics_view_all`)
- **Manager**: Analytics für eigene Organisation (`analytics_view`)
- **Team-Leader**: Analytics für eigenes Team (`analytics_view` mit eingeschränkten Filtern)

### Berechtigungsprüfung

1. **Organisations-Isolation**: 
   - User sieht nur Daten seiner aktuellen Organisation
   - Filterung über User-Rollen (`UserRole` mit `organizationId`)

2. **Branch-Filterung**:
   - User sieht nur Branches, zu denen er Zugriff hat (`UsersBranches`)

3. **User-Filterung**:
   - Manager können nur ihre Team-User sehen
   - Admins können alle User sehen

---

## Implementierungsplan

### Phase 1: Datenbank-Erweiterung

1. ✅ `TaskStatusHistory`-Modell erstellen
2. ✅ Migration erstellen
3. ✅ Task-Controller erweitern (Status-History speichern)

### Phase 2: Backend-API

1. ✅ `analyticsController.ts` erstellen (oder in `teamWorktimeController.ts` integrieren)
2. ✅ API-Endpunkte implementieren
3. ✅ Berechtigungsprüfung integrieren
4. ✅ Aggregationen implementieren

### Phase 3: Frontend-Workcenter-Erweiterung

1. ✅ Tab-Navigation in `TeamWorktimeControl.tsx` hinzufügen
2. ✅ Bestehende Filter wiederverwenden
3. ✅ `ActiveUsersList.tsx` erweitern:
   - To-Dos pro User anzeigen (für ausgewähltes Datum)
   - Requests pro User anzeigen (für ausgewähltes Datum)
   - Expandierbare Detailansicht
4. ✅ `TodoAnalyticsTab.tsx` Komponente erstellen
5. ✅ `RequestAnalyticsTab.tsx` Komponente erstellen

### Phase 4: Frontend-Auswertungen

1. ✅ To-Do-Auswertungsansicht (Tab 2)
2. ✅ Request-Auswertungsansicht (Tab 3)
3. ✅ Schicht-Analysen (integriert in To-Do-Tab)
4. ✅ Diagramme/Visualisierungen

### Phase 5: Dashboard-Widgets (Optional)

1. ✅ Dashboard-Widget für To-Do-Übersicht
2. ✅ Dashboard-Widget für Request-Statistiken

### Phase 6: Testing und Optimierung

1. ✅ Performance-Tests
2. ✅ Caching-Implementierung
3. ✅ Export-Funktionalität (Optional)

---

## Offene Fragen / Entscheidungsbedarf

1. **Status-History für alte Tasks**: Sollten bereits existierende Tasks rückwirkend eine History bekommen? (Empfehlung: Nein, nur ab Implementierung)

2. **Retention**: Wie lange sollen Status-History-Daten gespeichert werden? (Empfehlung: Unbegrenzt für Analysen)

3. **Caching-Strategie**: Welche Caching-Strategie soll verwendet werden? (Empfehlung: Redis für tägliche Aggregationen)

4. **Export-Format**: Welche Export-Formate sollen unterstützt werden? (Empfehlung: PDF und Excel)

5. **Echtzeit vs. Batch**: Sollen Auswertungen in Echtzeit berechnet werden oder als Batch-Jobs? (Empfehlung: Echtzeit mit Caching für Performance)

---

## Zusammenfassung

**Empfohlene Integration:**
- **Kein neuer Menüpunkt!** Alle Analytics werden in **Workcenter** integriert
- **Route**: `/team-worktime-control` (bestehend, erweitert)
- **Berechtigung**: Rollenbasiert (`team_worktime_control` mit erweiterten Rechten)
- **Navigation**: Tab-Navigation innerhalb von Workcenter

**Hauptfunktionen:**

**Tab 1: Arbeitszeiten & Aktivitäten (User-zentriert)**
1. Arbeitszeiten pro User (bestehend)
2. **NEU**: To-Dos pro User (für ausgewähltes Datum)
   - Erledigt / Nicht erledigt
   - Expandierbare Detailansicht
3. **NEU**: Requests pro User (für ausgewähltes Datum)
   - Erstellt / Verantwortlich
   - Expandierbare Detailansicht

**Tab 2: To-Do-Auswertungen (Aktivitäts-zentriert)**
1. Zeitreihenfolge aller To-Dos (was wurde wann gemacht)
2. To-Do-Statuswechsel-Analyse (mit neuer `TaskStatusHistory`)
3. To-Do-Häufigkeitsanalyse
4. Schicht-basierte Analysen

**Tab 3: Request-Auswertungen (Aktivitäts-zentriert)**
1. Zeitreihenfolge aller Requests (was wurde wann angefragt)
2. Request-Statistiken pro User
3. Request-Status-Verteilung
4. Zeitraum-Analysen

**Technische Änderungen:**
1. Neue Datenbank-Tabelle: `TaskStatusHistory`
2. Task-Controller erweitern (History speichern)
3. Analytics-Controller (oder Integration in `teamWorktimeController`)
4. Workcenter-Komponente erweitern mit Tab-Navigation
5. Neue Tab-Komponenten für Analytics

**Vorteile dieser Lösung:**
- ✅ **Weniger Menüpunkte** → einfachere Navigation
- ✅ **Thematisch passend** → Analytics zu Arbeitszeiten/Schichten
- ✅ **Wiederverwendung** → Gemeinsame Filter (Datum, Branch, User)
- ✅ **Bestehende Infrastruktur** → Nutzt vorhandene Workcenter-Funktionalität
- ✅ **Bessere UX** → Alles an einem Ort für Manager/Admins

Dieser Vorschlag bietet eine benutzerfreundliche Lösung, die nahtlos in die bestehende Workcenter-Struktur integriert wird.



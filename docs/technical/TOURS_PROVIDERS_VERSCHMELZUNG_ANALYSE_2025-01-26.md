# Analyse: Tours & Providers Verschmelzung

**Datum:** 2025-01-26  
**Ziel:** Tab "Gestion de Tours" aus Worktracker entfernen und mit Tab "Proveedores" in Organisation verschmelzen

## 1. Aktuelle Situation

### 1.1 Worktracker - Tours Tab

**Datei:** `frontend/src/pages/Worktracker.tsx`

**Position:** Zeile 3702-3714 (Tab-Button), Zeile 4956-5271 (Tab-Content)

**Funktionalität:**
- Tab-Button mit MapIcon (Zeile 3702-3714)
- Table View für Touren (Zeile 4956-5168)
- Card View für Touren (Zeile 5172-5271)
- Tour-States (Zeile 384-410):
  - `tours`, `allTours`, `toursLoading`, `toursError`
  - `tourSearchTerm`
  - `tourFilterConditions`, `tourFilterLogicalOperators`, `tourFilterSortDirections`
  - `tourActiveFilterName`, `tourSelectedFilterId`
  - Modals: `isCreateTourModalOpen`, `isEditTourModalOpen`, `isTourDetailsModalOpen`, `isTourBookingsModalOpen`, `isTourExportDialogOpen`
  - `selectedTour`, `selectedTourId`
- Tour-Funktionen:
  - `loadTours()` (Zeile 831-874)
  - `applyTourFilterConditions()` (Zeile 911-916)
  - `resetTourFilterConditions()` (Zeile 918-925)
  - `handleTourFilterChange()` (Zeile 927-931)
  - `handleTourSort()` (Zeile 1109-1116)
  - `filteredAndSortedTours` (useMemo, Zeile 1948)
- Tour-Spalten-Konfiguration (Zeile 2528-3859)
- Tour-Export-Dialog (Zeile 2484-2527)
- Tour-Create-Button (Zeile 3658-3673)
- Berechtigungsprüfung: `hasPermission('tours', 'read', 'table')` (Zeile 3702)

**Abhängigkeiten:**
- Tour-Komponenten (vermutlich in `frontend/src/components/tours/`)
- Tour-Modals (CreateTourModal, EditTourModal, TourDetailsModal, etc.)
- Tour-Export-Dialog
- API-Endpoints: `API_ENDPOINTS.TOURS.*`

### 1.2 Organisation - Providers Tab

**Datei:** `frontend/src/pages/Organisation.tsx`

**Position:** Zeile 177-195 (Tab-Button), Zeile 270-284 (Tab-Content)

**Funktionalität:**
- Tab-Button mit TruckIcon (Zeile 177-195)
- Rendert `TourProvidersTab` Komponente (Zeile 272)
- Berechtigungsprüfung: `canViewProviders` (Zeile 179, 186)
- PRO-Badge wenn nicht berechtigt (Zeile 190-194)

**TourProvidersTab Komponente:**
- **Datei:** `frontend/src/components/tours/TourProvidersTab.tsx`
- Zeigt Liste der Tour-Provider (Card-View)
- Create/Edit/Delete Funktionalität
- Suche nach Providern
- Modals: `CreateTourProviderModal`, `EditTourProviderModal`
- Berechtigungen: `hasPermission('tour_providers', 'write', 'table')`

### 1.3 UserManagementTab - Active/Inactive Switch

**Datei:** `frontend/src/components/UserManagementTab.tsx`

**Position:** Zeile 759-782

**Implementierung:**
- State: `userFilterTab` mit Typ `'active' | 'inactive'` (Zeile 92)
- Zwei Buttons nebeneinander:
  - "Active" Button (Zeile 760-770):
    - Aktiv: `bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400`
    - Inaktiv: `bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600`
  - "Inactive" Button (Zeile 771-781):
    - Aktiv: `bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400`
    - Inaktiv: `bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600`
- Beide Buttons: `px-3 py-1.5 rounded-full text-sm font-medium transition-colors`
- Filtert Benutzer basierend auf `userFilterTab` State

## 2. Geplante Änderungen

### 2.1 Worktracker.tsx - Tours Tab entfernen

**Zu entfernende Elemente:**

1. **Tab-Button** (Zeile 3702-3714):
   - Button mit MapIcon und "Touren" Text
   - onClick Handler: `setActiveTab('tours')`
   - Berechtigungsprüfung: `hasPermission('tours', 'read', 'table')`

2. **Tab-Content** (Zeile 4956-5271):
   - Table View (Zeile 4956-5168)
   - Card View (Zeile 5172-5271)
   - "Show More" Button (Zeile 5271-5276)

3. **Tour-States** (Zeile 384-410):
   - Alle Tour-bezogenen States entfernen oder in neue Komponente verschieben

4. **Tour-Funktionen:**
   - `loadTours()` (Zeile 831-874)
   - `applyTourFilterConditions()` (Zeile 911-916)
   - `resetTourFilterConditions()` (Zeile 918-925)
   - `handleTourFilterChange()` (Zeile 927-931)
   - `handleTourSort()` (Zeile 1109-1116)
   - `filteredAndSortedTours` useMemo (Zeile 1948)

5. **Tour-UI-Elemente:**
   - Tour-Export-Dialog Button (Zeile 2484-2527)
   - Tour-Create-Button (Zeile 3658-3673)
   - Tour-Spalten-Konfiguration (Zeile 2528-3859)
   - Tour-Suchfeld-Logik (Zeile 3737-3746)
   - Tour-Filter-Modal-Integration

6. **activeTab Type:**
   - Von `'todos' | 'reservations' | 'tours' | 'tourBookings'` zu `'todos' | 'reservations' | 'tourBookings'` ändern (Zeile 360)

7. **useEffect für Tours:**
   - useEffect entfernen, der Tours lädt wenn Tab aktiv ist (Zeile 877-881)

8. **Tour-Modals:**
   - Alle Tour-Modal-States und -Rendering entfernen
   - Modals: CreateTourModal, EditTourModal, TourDetailsModal, TourBookingsModal, TourExportDialog

### 2.2 Organisation.tsx - Providers Tab erweitern

**Neue Struktur:**

1. **Tab-Button bleibt gleich** (Zeile 177-195)
   - Name kann optional geändert werden zu "Touren & Provider" oder bleibt "Proveedores"

2. **Tab-Content erweitern** (Zeile 270-284):
   - Statt nur `TourProvidersTab` zu rendern
   - Switch einbauen (wie UserManagementTab)
   - Bedingtes Rendering: Tours oder Providers

3. **Switch-Implementierung:**
   - State: `const [providersViewMode, setProvidersViewMode] = useState<'tours' | 'providers'>('tours');`
   - Zwei Buttons:
     - "Touren" Button (grün wenn aktiv)
     - "Proveedores" Button (rot wenn aktiv)
   - Gleiches Styling wie UserManagementTab Switch

### 2.3 Neue Komponente: ToursTab.tsx

**Neue Datei:** `frontend/src/components/tours/ToursTab.tsx`

**Funktionalität:**
- Alle Tour-Funktionalität aus Worktracker übernehmen
- Table View und Card View
- Tour-States verwalten
- Tour-Funktionen (loadTours, Filter, Sort, etc.)
- Tour-Modals integrieren
- Tour-Export-Dialog
- Tour-Create-Button
- Tour-Spalten-Konfiguration
- Tour-Suchfeld
- Tour-Filter-Modal-Integration

**Props:**
```typescript
interface ToursTabProps {
    onError: (error: string) => void;
}
```

### 2.4 TourProvidersTab.tsx - Anpassungen

**Datei:** `frontend/src/components/tours/TourProvidersTab.tsx`

**Änderungen:**
- Keine Änderungen nötig
- Bleibt wie bisher

### 2.5 Organisation.tsx - Erweiterte Implementierung

**Neue Struktur im Tab-Content:**

```tsx
) : activeTabState === 'providers' ? (
  canViewProviders ? (
    <div className="space-y-4">
      {/* Switch für Tours/Providers */}
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setProvidersViewMode('tours')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            providersViewMode === 'tours'
              ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
          }`}
        >
          {t('tours.title', 'Touren')}
        </button>
        <button
          type="button"
          onClick={() => setProvidersViewMode('providers')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            providersViewMode === 'providers'
              ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
          }`}
        >
          {t('organisation.tabs.providers', { defaultValue: 'Proveedores' })}
        </button>
      </div>
      
      {/* Bedingtes Rendering */}
      {providersViewMode === 'tours' ? (
        <ToursTab onError={handleError} />
      ) : (
        <TourProvidersTab onError={handleError} />
      )}
    </div>
  ) : (
    // PRO-Feature-Message bleibt gleich
  )
)
```

## 3. Detaillierte Schritte

### Schritt 1: Neue Komponente ToursTab.tsx erstellen

1. Datei erstellen: `frontend/src/components/tours/ToursTab.tsx`
2. Alle Tour-Funktionalität aus Worktracker.tsx extrahieren:
   - Tour-States
   - Tour-Funktionen (loadTours, Filter, Sort, etc.)
   - Tour-UI (Table View, Card View)
   - Tour-Modals
   - Tour-Export-Dialog
   - Tour-Create-Button
   - Tour-Spalten-Konfiguration
   - Tour-Suchfeld
   - Tour-Filter-Modal-Integration
3. Props-Interface definieren
4. onError-Prop für Fehlerbehandlung

### Schritt 2: Worktracker.tsx bereinigen

1. Tours Tab-Button entfernen (Zeile 3702-3714)
2. Tours Tab-Content entfernen (Zeile 4956-5271)
3. Tour-States entfernen (Zeile 384-410)
4. Tour-Funktionen entfernen (loadTours, Filter, Sort, etc.)
5. Tour-UI-Elemente entfernen (Export-Button, Create-Button, Spalten-Konfiguration, etc.)
6. Tour-Modals entfernen
7. activeTab Type anpassen (Zeile 360)
8. useEffect für Tours entfernen (Zeile 877-881)
9. Tour-Suchfeld-Logik entfernen (Zeile 3737-3746)
10. Tour-Filter-Modal-Integration entfernen
11. Tour-Importe entfernen (falls nicht mehr benötigt)

### Schritt 3: Organisation.tsx erweitern

1. State für Switch hinzufügen: `providersViewMode`
2. ToursTab importieren
3. Switch-UI hinzufügen (wie UserManagementTab)
4. Bedingtes Rendering implementieren
5. Übersetzungen prüfen/ergänzen

### Schritt 4: Übersetzungen prüfen

1. `frontend/src/i18n/locales/de.json`
2. `frontend/src/i18n/locales/en.json`
3. `frontend/src/i18n/locales/es.json`
4. Neue Übersetzungen für Switch-Buttons hinzufügen (falls nötig)

### Schritt 5: Berechtigungen prüfen

1. Tours-Berechtigungen bleiben gleich: `hasPermission('tours', 'read', 'table')`
2. Providers-Berechtigungen bleiben gleich: `hasPermission('tour_providers', 'write', 'table')`
3. In ToursTab.tsx Berechtigungen prüfen

## 4. Abhängigkeiten und Imports

### 4.1 Worktracker.tsx - Zu entfernende Imports

- Tour-bezogene Imports prüfen und entfernen
- Tour-Modals-Imports entfernen
- Tour-Types-Imports können bleiben (falls für TourBookings benötigt)

### 4.2 Organisation.tsx - Neue Imports

- `ToursTab` importieren
- Keine weiteren Imports nötig (Switch ist inline)

### 4.3 ToursTab.tsx - Benötigte Imports

- Alle Tour-bezogenen Imports aus Worktracker.tsx übernehmen
- Tour-Modals-Imports
- Tour-Types-Imports
- API-Endpoints
- axiosInstance
- usePermissions
- useMessage
- useTranslation
- Alle UI-Komponenten (Table, Cards, Modals, etc.)

## 5. Potenzielle Probleme

### 5.1 TourBookings Tab

- TourBookings Tab bleibt im Worktracker (Zeile 3715-3727)
- TourBookings verwendet möglicherweise Tour-Daten
- Prüfen ob TourBookings weiterhin funktioniert ohne Tours Tab

### 5.2 Berechtigungen

- Tours-Berechtigungen müssen in ToursTab.tsx geprüft werden
- Providers-Berechtigungen bleiben in TourProvidersTab.tsx

### 5.3 State-Management

- Tour-States müssen vollständig in ToursTab.tsx verschoben werden
- Keine geteilten States zwischen Worktracker und ToursTab

### 5.4 Filter-System

- Tour-Filter-System muss in ToursTab.tsx integriert werden
- Filter-Modal-Integration muss funktionieren

## 6. Test-Checkliste

Nach der Implementierung prüfen:

1. ✅ Tours Tab ist aus Worktracker entfernt
2. ✅ Providers Tab in Organisation zeigt Switch
3. ✅ Switch wechselt zwischen Tours und Providers
4. ✅ Tours werden korrekt angezeigt (Table View)
5. ✅ Tours werden korrekt angezeigt (Card View)
6. ✅ Tour-Create funktioniert
7. ✅ Tour-Edit funktioniert
8. ✅ Tour-Details funktionieren
9. ✅ Tour-Export funktioniert
10. ✅ Tour-Filter funktionieren
11. ✅ Tour-Sort funktioniert
12. ✅ Tour-Suche funktioniert
13. ✅ Providers werden korrekt angezeigt
14. ✅ Provider-Create funktioniert
15. ✅ Provider-Edit funktioniert
16. ✅ Provider-Delete funktioniert
17. ✅ Berechtigungen werden korrekt geprüft
18. ✅ TourBookings Tab funktioniert weiterhin im Worktracker
19. ✅ Übersetzungen sind vorhanden (de, en, es)
20. ✅ Responsive Design funktioniert

## 7. Zusammenfassung

**Zu entfernende Dateien/Code:**
- Worktracker.tsx: Tours Tab komplett entfernen (~2000 Zeilen Code)

**Neue Dateien:**
- `frontend/src/components/tours/ToursTab.tsx` (neue Komponente)

**Zu ändernde Dateien:**
- `frontend/src/pages/Worktracker.tsx` (Tours Tab entfernen)
- `frontend/src/pages/Organisation.tsx` (Switch hinzufügen, ToursTab integrieren)
- `frontend/src/i18n/locales/*.json` (Übersetzungen prüfen/ergänzen)

**Bleibt unverändert:**
- `frontend/src/components/tours/TourProvidersTab.tsx`
- Tour-Modals (CreateTourModal, EditTourModal, etc.)
- API-Endpoints
- Tour-Types


# Implementierungsplan: RoleManagementTab Modernisierung für Intranet

## Übersicht
Dieses Dokument enthält den detaillierten Schritt-für-Schritt Plan zur Modernisierung der RoleManagementTab-Komponente. Die Änderungen bringen die Komponente auf den aktuellen UI-Standard mit Sidepanes, korrekten Scrollbalken und standardisierten Aktionen. Jeder Schritt hat eine Checkbox zum Abhaken nach Fertigstellung.

**WICHTIG**: Nach JEDEM erledigten Schritt:
1. Checkbox abhaken (☑️)
2. Commit erstellen mit aussagekräftiger Message
3. Zum nächsten Schritt gehen

## Analysierte Probleme

### 1. Aktuelle Modal-Implementation
- **Problem**: Verwendet veraltete Modal-Dialoge statt moderne Sidepanes
- **Standard**: InvoiceManagementTab zeigt moderne Sidepane-Implementation
- **Auswirkung**: Inkonsistente UI-Erfahrung

### 2. Fehlende Scrollbalken-Standardisierung
- **Problem**: Keine einheitlichen Scrollbalken wie in anderen Komponenten
- **Standard**: InvoiceManagementTab zeigt korrekte Scrollbalken-Implementation
- **Auswirkung**: Schlechte UX bei längeren Listen

### 3. Nicht-Standard Schnell-Aktionen
- **Problem**: Custom Schnell-Aktionen entsprechen nicht dem Standard
- **Standard**: Notifications Tab zeigt "alle" Switch pro Kategorie
- **Auswirkung**: Verwirrung für Benutzer durch verschiedene Interaction-Patterns

### 4. Datei-Größe-Problem
- **Problem**: RoleManagementTab.tsx ist zu groß für effiziente Bearbeitung (1511 Zeilen)
- **Lösung**: Aufteilen in logische Sub-Komponenten
- **Auswirkung**: Bessere Wartbarkeit und Bearbeitbarkeit

### 5. **🚨 KRITISCHES PROBLEM: Permission-System inline statt zentral**
- **Problem**: Gesamte Permission-Struktur ist in RoleManagementTab.tsx hardcodiert
- **Details analysiert**:
  - **140+ Zeilen Permission-Konstanten** (Zeilen 24-165): `defaultPages`, `defaultTables`, `defaultButtons`, `alwaysVisiblePages`, `tableToPageMapping`, `buttonToPageMapping`
  - **Permission-Bulk-Funktionen** (Zeilen 729-777): `setAllPagePermissions()`, `setAllTablePermissions()`, `setAllButtonPermissions()`
  - **200+ Zeilen Permission-UI** (Zeilen 1371-1487): Hierarchische Switch-Darstellung
- **Bestehende UX/Funktionalität (MUSS beibehalten werden)**:
  - ✅ 3-stufige Hierarchie: Pages → Tables → Buttons  
  - ✅ AlwaysVisiblePages (`['dashboard', 'worktracker', 'cerebro', 'settings', 'profile']`) sind disabled
  - ✅ Bulk-Actions: 3 Dropdown-Selects für "Alle Seiten/Tabellen/Buttons"
  - ✅ Hierarchische UI: Seiten als Hauptelemente, Tabellen/Buttons als Unterpunkte mit `└` Symbol
  - ✅ EXAKT gleiche Permission-Logic: `hasPermission(entity, accessLevel, entityType)`
- **Auswirkung**: 
  - Keine zentrale Permission-Konfiguration im System
  - Schwer erweiterbar für neue Module  
  - Code-Duplikation bei Permission-Checks
  - Backend/Frontend Permission-Listen können divergieren

## Phase 1: Permission-System Refactoring (PRIORITÄT 1)

### Schritt 1.1: Permission-Konstanten-System erstellen
- [ ] **KRITISCH**: Erstelle zentrale Permission-Konfiguration
- [ ] Erstelle neue Datei: `frontend/src/constants/permissionConfig.ts`
- [ ] Extrahiere alle Permission-Konstanten aus RoleManagementTab.tsx:

```typescript
// frontend/src/constants/permissionConfig.ts

export interface PermissionEntity {
  id: string;
  label: string;
  type: 'page' | 'table' | 'button';
  module: string;
  parentEntity?: string;
}

export interface PermissionModule {
  id: string;
  name: string;
  pages: PermissionEntity[];
  tables: PermissionEntity[];
  buttons: PermissionEntity[];
}

// ZENTRALE PERMISSION-STRUKTUR (synchron mit Backend)
export const PERMISSION_MODULES: PermissionModule[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    pages: [{ id: 'dashboard', label: 'Dashboard', type: 'page', module: 'dashboard' }],
    tables: [{ id: 'requests', label: 'Anfragen', type: 'table', module: 'dashboard', parentEntity: 'dashboard' }],
    buttons: []
  },
  {
    id: 'worktracker',
    name: 'Worktracker',
    pages: [{ id: 'worktracker', label: 'Worktracker', type: 'page', module: 'worktracker' }],
    tables: [
      { id: 'tasks', label: 'Aufgaben', type: 'table', module: 'worktracker', parentEntity: 'worktracker' },
      { id: 'worktime', label: 'Arbeitszeit', type: 'table', module: 'worktracker', parentEntity: 'worktracker' }
    ],
    buttons: [
      { id: 'todo_create', label: 'Todo erstellen', type: 'button', module: 'worktracker', parentEntity: 'worktracker' },
      { id: 'todo_edit', label: 'Todo bearbeiten', type: 'button', module: 'worktracker', parentEntity: 'worktracker' },
      { id: 'worktime_start', label: 'Arbeitszeit starten', type: 'button', module: 'worktracker', parentEntity: 'worktracker' }
    ]
  }
  // ... weitere Module
];

// AUTOMATISCH GENERIERTE MAPPINGS
export const ENTITY_TO_MODULE_MAPPING = PERMISSION_MODULES.reduce((acc, module) => {
  [...module.pages, ...module.tables, ...module.buttons].forEach(entity => {
    acc[entity.id] = module.id;
  });
  return acc;
}, {} as Record<string, string>);

export const TABLE_TO_PAGE_MAPPING = PERMISSION_MODULES.reduce((acc, module) => {
  module.tables.forEach(table => {
    if (table.parentEntity) {
      acc[table.id] = table.parentEntity;
    }
  });
  return acc;
}, {} as Record<string, string>);

export const BUTTON_TO_PAGE_MAPPING = PERMISSION_MODULES.reduce((acc, module) => {
  module.buttons.forEach(button => {
    if (button.parentEntity) {
      acc[button.id] = button.parentEntity;
    }
  });
  return acc;
}, {} as Record<string, string>);
```

- [ ] **CHECKPOINT**: Zentrale Permission-Konfiguration erstellt

### Schritt 1.2: Permission-Utilities erstellen
- [ ] Erstelle neue Datei: `frontend/src/utils/permissionUtils.ts`
- [ ] Implementiere wiederverwendbare Permission-Logic:

```typescript
// frontend/src/utils/permissionUtils.ts

import { PERMISSION_MODULES, PermissionEntity } from '../constants/permissionConfig.ts';
import { Permission, AccessLevel } from '../types/interfaces.ts';

export class PermissionUtils {
  
  // Generiert Standard-Permissions für eine neue Rolle
  static generateDefaultPermissions(): Permission[] {
    const permissions: Permission[] = [];
    
    PERMISSION_MODULES.forEach(module => {
      [...module.pages, ...module.tables, ...module.buttons].forEach(entity => {
        permissions.push({
          entity: entity.id,
          entityType: entity.type,
          accessLevel: 'none'
        });
      });
    });
    
    return permissions;
  }
  
  // Filtert Permissions nach Typ
  static filterPermissionsByType(permissions: Permission[], type: 'page' | 'table' | 'button'): Permission[] {
    return permissions.filter(p => p.entityType === type);
  }
  
  // Findet abhängige Entitäten (Tabellen und Buttons einer Seite)
  static getDependentEntities(pageId: string): PermissionEntity[] {
    const module = PERMISSION_MODULES.find(m => 
      m.pages.some(p => p.id === pageId)
    );
    
    if (!module) return [];
    
    return [
      ...module.tables.filter(t => t.parentEntity === pageId),
      ...module.buttons.filter(b => b.parentEntity === pageId)
    ];
  }
  
  // Prüft, ob eine Entität immer sichtbar sein soll
  static isAlwaysVisible(entityId: string): boolean {
    const alwaysVisiblePages = ['dashboard', 'settings', 'profile'];
    return alwaysVisiblePages.includes(entityId);
  }
  
  // Gruppiert Permissions hierarchisch
  static groupPermissionsHierarchically(permissions: Permission[]): { [pageId: string]: { page: Permission; tables: Permission[]; buttons: Permission[] } } {
    const grouped: { [pageId: string]: { page: Permission; tables: Permission[]; buttons: Permission[] } } = {};
    
    const pagePermissions = this.filterPermissionsByType(permissions, 'page');
    
    pagePermissions.forEach(pagePerm => {
      const dependentEntities = this.getDependentEntities(pagePerm.entity);
      
      grouped[pagePerm.entity] = {
        page: pagePerm,
        tables: permissions.filter(p => 
          dependentEntities.some(e => e.id === p.entity && e.type === 'table')
        ),
        buttons: permissions.filter(p => 
          dependentEntities.some(e => e.id === p.entity && e.type === 'button')
        )
      };
    });
    
    return grouped;
  }
}
```

- [ ] **CHECKPOINT**: Permission-Utils implementiert

### Schritt 1.3: Permission-Components erstellen
- [ ] Erstelle neue Datei: `frontend/src/components/permissions/PermissionToggle.tsx`
- [ ] Implementiere wiederverwendbare Permission-Toggle:

```typescript
// frontend/src/components/permissions/PermissionToggle.tsx

import React from 'react';
import { Permission, AccessLevel } from '../../types/interfaces.ts';

interface PermissionToggleProps {
  permission: Permission;
  label: string;
  disabled?: boolean;
  onChange: (permission: Permission) => void;
  className?: string;
}

const PermissionToggle: React.FC<PermissionToggleProps> = ({
  permission,
  label,
  disabled = false,
  onChange,
  className = ""
}) => {
  const isActive = ['read', 'write', 'both'].includes(permission.accessLevel);
  
  const handleToggle = () => {
    if (disabled) return;
    
    const newAccessLevel: AccessLevel = isActive ? 'none' : 'both';
    onChange({
      ...permission,
      accessLevel: newAccessLevel
    });
  };
  
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <span className={`text-sm ${disabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 dark:text-gray-300'}`}>
        {label}
      </span>
      <label className={`inline-flex items-center ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
        <input
          type="checkbox"
          className="sr-only peer"
          checked={isActive}
          disabled={disabled}
          onChange={handleToggle}
        />
        <div className="relative w-9 h-5 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:start-[1px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 dark:peer-checked:bg-blue-700">
        </div>
      </label>
    </div>
  );
};

export default PermissionToggle;
```

- [ ] **CHECKPOINT**: Wiederverwendbare Permission-Toggle erstellt

### Schritt 1.4: Hierarchisches Permission-Panel erstellen
- [ ] Erstelle neue Datei: `frontend/src/components/permissions/HierarchicalPermissionPanel.tsx`
- [ ] Implementiere strukturierte Permission-Anzeige:

```typescript
// frontend/src/components/permissions/HierarchicalPermissionPanel.tsx

import React from 'react';
import { Permission, AccessLevel } from '../../types/interfaces.ts';
import { PermissionUtils } from '../../utils/permissionUtils.ts';
import { PERMISSION_MODULES } from '../../constants/permissionConfig.ts';
import PermissionToggle from './PermissionToggle.tsx';

interface HierarchicalPermissionPanelProps {
  permissions: Permission[];
  onPermissionChange: (permissions: Permission[]) => void;
  onBulkChange?: (type: 'page' | 'table' | 'button', accessLevel: AccessLevel) => void;
}

const HierarchicalPermissionPanel: React.FC<HierarchicalPermissionPanelProps> = ({
  permissions,
  onPermissionChange,
  onBulkChange
}) => {
  const groupedPermissions = PermissionUtils.groupPermissionsHierarchically(permissions);
  
  const handlePermissionChange = (updatedPermission: Permission) => {
    const newPermissions = permissions.map(p => 
      p.entity === updatedPermission.entity && p.entityType === updatedPermission.entityType
        ? updatedPermission
        : p
    );
    onPermissionChange(newPermissions);
  };
  
  return (
    <div className="space-y-6">
      {/* Bulk-Aktionen */}
      {onBulkChange && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Schnell-Aktionen
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Alle Seiten aktivieren</span>
              <button
                onClick={() => onBulkChange('page', 'both')}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Aktivieren
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Alle Tabellen aktivieren</span>
              <button
                onClick={() => onBulkChange('table', 'both')}
                className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
              >
                Aktivieren
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Alle Buttons aktivieren</span>
              <button
                onClick={() => onBulkChange('button', 'both')}
                className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Aktivieren
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Hierarchische Permission-Struktur */}
      <div className="space-y-4">
        {Object.entries(groupedPermissions).map(([pageId, group]) => {
          const pageEntity = PERMISSION_MODULES
            .flatMap(m => m.pages)
            .find(p => p.id === pageId);
          
          return (
            <div key={pageId} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              {/* Seiten-Permission */}
              <PermissionToggle
                permission={group.page}
                label={`📄 ${pageEntity?.label || pageId}`}
                disabled={PermissionUtils.isAlwaysVisible(pageId)}
                onChange={handlePermissionChange}
                className="font-medium"
              />
              
              {/* Tabellen-Permissions */}
              {group.tables.length > 0 && (
                <div className="mt-3 pl-6 border-l-2 border-gray-200 dark:border-gray-700 space-y-2">
                  {group.tables.map(tablePermission => {
                    const tableEntity = PERMISSION_MODULES
                      .flatMap(m => m.tables)
                      .find(t => t.id === tablePermission.entity);
                    
                    return (
                      <PermissionToggle
                        key={tablePermission.entity}
                        permission={tablePermission}
                        label={`└ 📊 ${tableEntity?.label || tablePermission.entity}`}
                        onChange={handlePermissionChange}
                        className="text-sm"
                      />
                    );
                  })}
                </div>
              )}
              
              {/* Button-Permissions */}
              {group.buttons.length > 0 && (
                <div className="mt-2 pl-6 border-l-2 border-gray-200 dark:border-gray-700 space-y-1">
                  {group.buttons.map(buttonPermission => {
                    const buttonEntity = PERMISSION_MODULES
                      .flatMap(m => m.buttons)
                      .find(b => b.id === buttonPermission.entity);
                    
                    return (
                      <PermissionToggle
                        key={buttonPermission.entity}
                        permission={buttonPermission}
                        label={`└ 🔘 ${buttonEntity?.label || buttonPermission.entity}`}
                        onChange={handlePermissionChange}
                        className="text-xs"
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HierarchicalPermissionPanel;
```

- [ ] **CHECKPOINT**: Hierarchisches Permission-Panel erstellt

## Phase 2: Vorbereitung und UI-Refactoring

### Schritt 1.2: Sub-Komponenten planen
- [ ] Plane Aufteilung in logische Komponenten:
  - `RoleEditSidepane.tsx` - Rolle bearbeiten
  - `PermissionEditSidepane.tsx` - Berechtigungen bearbeiten
  - `RoleActionsPanel.tsx` - Standard-Aktionen Panel
  - `RoleListTable.tsx` - Tabellen-Komponente
- [ ] Identifiziere gemeinsame States und Props
- [ ] **CHECKPOINT**: Refactoring-Plan dokumentiert

### Schritt 1.3: Backup erstellen
- [ ] Erstelle Backup von `RoleManagementTab.tsx`
- [ ] Kopiere zu `RoleManagementTab.backup.tsx`
- [ ] **WICHTIG**: Stelle sicher, dass keine laufende Zeiterfassung oder kritische Aktionen aktiv sind

## Phase 2: Sub-Komponenten erstellen

### Schritt 2.1: RoleEditSidepane Komponente erstellen
- [ ] Erstelle neue Datei: `frontend/src/components/roleManagement/RoleEditSidepane.tsx`
- [ ] Verwende InvoiceManagementTab Sidepane als Vorlage (Zeilen mit Sidepane-Pattern)
- [ ] Extrahiere Rolle-Edit-Logic aus RoleManagementTab
- [ ] Implementiere Sidepane-Interface:

```typescript
interface RoleEditSidepaneProps {
  isOpen: boolean;
  onClose: () => void;
  role: Role | null;
  onSave: (role: Role) => void;
  permissions: Permission[];
}

const RoleEditSidepane: React.FC<RoleEditSidepaneProps> = ({
  isOpen,
  onClose,
  role,
  onSave,
  permissions
}) => {
  // Sidepane-Implementation basierend auf InvoiceManagementTab-Pattern
  return (
    <div className={`fixed inset-y-0 right-0 z-50 w-96 bg-white dark:bg-gray-800 shadow-xl transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      {/* Sidepane Content */}
    </div>
  );
};
```

- [ ] **WICHTIG**: Behalte alle bestehenden Role-Edit-Funktionalitäten bei
- [ ] **CHECKPOINT**: RoleEditSidepane funktional und getestet

### Schritt 2.2: PermissionEditSidepane Komponente erstellen
- [ ] Erstelle neue Datei: `frontend/src/components/roleManagement/PermissionEditSidepane.tsx`
- [ ] Extrahiere Permission-Edit-Logic aus RoleManagementTab
- [ ] Implementiere analog zu RoleEditSidepane
- [ ] **WICHTIG**: Standard-Switches BLEIBEN wie sie sind (Settings-Standard)
- [ ] **CHECKPOINT**: PermissionEditSidepane funktional und getestet

### Schritt 2.3: RoleActionsPanel Komponente erstellen
- [ ] Erstelle neue Datei: `frontend/src/components/roleManagement/RoleActionsPanel.tsx`
- [ ] Analysiere Notifications Tab "alle" Switch Pattern
- [ ] Implementiere Standard-Aktionen nach Notifications-Pattern:

```typescript
// Standard-Pattern: "Alle" Switch pro Kategorie
const RoleActionsPanel: React.FC = () => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        Rollen-Aktionen
      </h3>
      
      {/* Standard: "Alle" Toggles pro Kategorie */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Alle Admin-Rollen aktivieren
          </span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Alle Benutzer-Rollen aktivieren
          </span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **WICHTIG**: ENTFERNE alle nicht-standard Schnell-Aktionen
- [ ] **CHECKPOINT**: RoleActionsPanel entspricht Notifications-Standard

### Schritt 2.4: RoleListTable Komponente erstellen
- [ ] Erstelle neue Datei: `frontend/src/components/roleManagement/RoleListTable.tsx`
- [ ] Extrahiere Tabellen-Logic aus RoleManagementTab
- [ ] Implementiere Scrollbalken nach InvoiceManagementTab-Standard:

```typescript
// Standard-Scrollbalken-Implementation
<div className="overflow-x-auto">
  <div className="max-h-96 overflow-y-auto"> {/* Wie InvoiceManagementTab */}
    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
      {/* Tabellen-Content */}
    </table>
  </div>
</div>
```

- [ ] **CHECKPOINT**: RoleListTable mit Standard-Scrollbalken funktional

## Phase 3: Haupt-Komponente refactorieren

### Schritt 3.1: RoleManagementTab States anpassen
- [ ] Öffne `frontend/src/components/RoleManagementTab.tsx`
- [ ] Entferne Modal-States und ersetze durch Sidepane-States:

```typescript
// ENTFERNEN: Modal-States
// const [showRoleModal, setShowRoleModal] = useState(false);

// HINZUFÜGEN: Sidepane-States
const [isRoleEditSidepaneOpen, setIsRoleEditSidepaneOpen] = useState(false);
const [isPermissionEditSidepaneOpen, setIsPermissionEditSidepaneOpen] = useState(false);
const [selectedRole, setSelectedRole] = useState<Role | null>(null);
```

- [ ] **CHECKPOINT**: States erfolgreich migriert

### Schritt 3.2: Import Sub-Komponenten
- [ ] Füge Imports für alle neuen Sub-Komponenten hinzu:

```typescript
import RoleEditSidepane from './roleManagement/RoleEditSidepane.tsx';
import PermissionEditSidepane from './roleManagement/PermissionEditSidepane.tsx';
import RoleActionsPanel from './roleManagement/RoleActionsPanel.tsx';
import RoleListTable from './roleManagement/RoleListTable.tsx';
```

- [ ] **CHECKPOINT**: Alle Imports funktional

### Schritt 3.3: JSX-Structure vereinfachen
- [ ] Ersetze komplexe Inline-JSX durch Sub-Komponenten-Aufrufe:

```typescript
return (
  <div className="space-y-6">
    {/* Standard-Aktionen Panel */}
    <RoleActionsPanel />
    
    {/* Rollen-Tabelle mit Standard-Scrollbalken */}
    <RoleListTable 
      roles={roles}
      onEditRole={(role) => {
        setSelectedRole(role);
        setIsRoleEditSidepaneOpen(true);
      }}
      onEditPermissions={(role) => {
        setSelectedRole(role);
        setIsPermissionEditSidepaneOpen(true);
      }}
    />
    
    {/* Sidepanes */}
    <RoleEditSidepane
      isOpen={isRoleEditSidepaneOpen}
      onClose={() => setIsRoleEditSidepaneOpen(false)}
      role={selectedRole}
      onSave={handleRoleSave}
      permissions={permissions}
    />
    
    <PermissionEditSidepane
      isOpen={isPermissionEditSidepaneOpen}
      onClose={() => setIsPermissionEditSidepaneOpen(false)}
      role={selectedRole}
      onSave={handlePermissionSave}
      permissions={permissions}
    />
  </div>
);
```

- [ ] **CHECKPOINT**: JSX vereinfacht und strukturiert

### Schritt 3.4: Handler-Funktionen anpassen
- [ ] Passe alle Event-Handler für Sidepane-Pattern an
- [ ] Entferne Modal-spezifische Handler
- [ ] Implementiere Sidepane-Handler nach InvoiceManagementTab-Pattern
- [ ] **CHECKPOINT**: Alle Handler funktional

## Phase 4: Scrollbalken-Standardisierung

### Schritt 4.1: InvoiceManagementTab Scrollbalken analysieren
- [ ] Öffne `frontend/src/components/InvoiceManagementTab.tsx`
- [ ] Identifiziere Scrollbalken-Klassen und -Struktur
- [ ] Dokumentiere Standard-Pattern für Wiederverwendung
- [ ] **REFERENZ**: InvoiceManagementTab Zeilen mit `overflow-y-auto`

### Schritt 4.2: Standard-Scrollbalken implementieren
- [ ] Wende InvoiceManagementTab Scrollbalken-Pattern auf RoleListTable an
- [ ] Stelle sicher, dass `max-h-96 overflow-y-auto` korrekt angewendet wird
- [ ] Teste Scrollverhalten bei verschiedenen Datenmengen
- [ ] **CHECKPOINT**: Scrollbalken funktional und konsistent

### Schritt 4.3: Responsive Scrollbalken testen
- [ ] Teste Scrollbalken auf verschiedenen Bildschirmgrößen
- [ ] Stelle sicher, dass horizontales Scrollen (`overflow-x-auto`) funktioniert
- [ ] Prüfe Scrollbalken in Dark/Light Mode
- [ ] **CHECKPOINT**: Scrollbalken responsive und theme-kompatibel

## Phase 5: Standard-Aktionen implementieren

### Schritt 5.1: Schnell-Aktionen identifizieren und entfernen
- [ ] Identifiziere alle nicht-standard Schnell-Aktionen in RoleManagementTab
- [ ] Dokumentiere entfernte Aktionen (für eventuelle Wiederherstellung)
- [ ] Entferne Custom-Action-Buttons und deren Handler
- [ ] **WICHTIG**: Dokumentiere entfernte Funktionalität im Code-Kommentar

### Schritt 5.2: Notifications Tab "alle" Switch Pattern analysieren
- [ ] Öffne Settings > Notifications Tab
- [ ] Analysiere "alle" Switch Implementation
- [ ] Dokumentiere Pattern für RoleActionsPanel
- [ ] **REFERENZ**: Notifications Tab zeigt Standard-Pattern

### Schritt 5.3: Standard-Aktionen implementieren
- [ ] Implementiere "Alle Admin-Rollen aktivieren" Switch
- [ ] Implementiere "Alle Benutzer-Rollen aktivieren" Switch
- [ ] Implementiere "Alle Gast-Rollen aktivieren" Switch (falls anwendbar)
- [ ] Verwende exakt das gleiche Switch-Design wie Notifications Tab
- [ ] **CHECKPOINT**: Standard-Aktionen funktional

### Schritt 5.4: Switch-Verhalten implementieren
- [ ] Implementiere "Alle"-Logic für jeden Switch:

```typescript
const handleAllAdminRolesToggle = (enabled: boolean) => {
  const adminRoles = roles.filter(role => role.type === 'admin');
  adminRoles.forEach(role => {
    updateRoleStatus(role.id, enabled);
  });
};
```

- [ ] Stelle sicher, dass Switches den aktuellen Status korrekt reflektieren
- [ ] **CHECKPOINT**: Switch-Logic funktional

## Phase 6: Dokumentation und Standards

### Schritt 6.1: Komponenten-Dokumentation erstellen
- [ ] Erstelle `docs/components/ROLEMANAGEMENT_COMPONENTS.md`
- [ ] Dokumentiere alle neuen Sub-Komponenten
- [ ] Dokumentiere Standard-Patterns:
  - Sidepane-Pattern (basierend auf InvoiceManagementTab)
  - Scrollbalken-Standard
  - "Alle" Switch Pattern (basierend auf Notifications)
- [ ] **CHECKPOINT**: Dokumentation vollständig

### Schritt 6.2: UI-Standards dokumentieren
- [ ] Ergänze `docs/core/DESIGN_STANDARDS.md` um:
  - Sidepane vs Modal Guidelines
  - Scrollbalken-Standards
  - Standard-Aktionen-Patterns
- [ ] Dokumentiere BEIBEHALTENE Standards:
  - Role-Switches bleiben wie in Settings (Standard)
  - Permission-Switches bleiben wie in Settings (Standard)
- [ ] **CHECKPOINT**: Standards dokumentiert

### Schritt 6.3: Migration Guide erstellen
- [ ] Dokumentiere Änderungen für andere Entwickler
- [ ] Erstelle Before/After Screenshots (optional)
- [ ] Dokumentiere entfernte Funktionalitäten
- [ ] **CHECKPOINT**: Migration Guide erstellt

## Phase 7: Testing und Validierung

### Schritt 7.1: Funktionalitäts-Tests
- [ ] Teste alle Rolle-Edit-Funktionen über Sidepane
- [ ] Teste alle Permission-Edit-Funktionen über Sidepane
- [ ] Teste "Alle" Switches für verschiedene Rollen-Kategorien
- [ ] Teste Scrollbalken mit verschiedenen Datenmengen
- [ ] **CHECKPOINT**: Alle Funktionen getestet

### Schritt 7.2: UI/UX-Tests
- [ ] Teste Sidepane-Animationen
- [ ] Teste Responsive-Verhalten
- [ ] Teste Dark/Light Mode Kompatibilität
- [ ] Vergleiche mit InvoiceManagementTab für Konsistenz
- [ ] Vergleiche Standard-Aktionen mit Notifications Tab
- [ ] **CHECKPOINT**: UI/UX konsistent

### Schritt 7.3: Performance-Tests
- [ ] Teste Datei-Lade-Performance nach Refactoring
- [ ] Teste Memory-Usage bei großen Rollen-Listen
- [ ] Teste Sidepane-Performance bei schnellem Öffnen/Schließen
- [ ] **CHECKPOINT**: Performance zufriedenstellend

### Schritt 7.4: Regressions-Tests
- [ ] Teste alle bestehenden Rollen-Management-Funktionen
- [ ] Stelle sicher, dass keine Funktionalität verloren ging
- [ ] Teste Integration mit anderen Komponenten
- [ ] **CHECKPOINT**: Keine Regressionen gefunden

## Phase 8: Cleanup und Finalisierung

### Schritt 8.1: Code-Cleanup
- [ ] Entferne auskommentierte alte Code-Blöcke
- [ ] Entferne unused Imports
- [ ] Optimiere alle Sub-Komponenten
- [ ] **CHECKPOINT**: Code sauber und optimiert

### Schritt 8.2: Datei-Größe validieren
- [ ] Messe neue Datei-Größe von RoleManagementTab.tsx
- [ ] Stelle sicher, dass Datei-Größe deutlich reduziert wurde
- [ ] Dokumentiere Größen-Verbesserung
- [ ] **CHECKPOINT**: Datei-Größe-Problem gelöst

### Schritt 8.3: Final-Tests
- [ ] Kompletter End-to-End Test aller Funktionen
- [ ] Test in verschiedenen Browsern
- [ ] Test mit verschiedenen Benutzer-Rollen
- [ ] **CHECKPOINT**: Alle Tests bestanden

## Phase 0: 🚨 Permission-System Modularisierung (MUSS ZUERST) 

**WICHTIG**: Die bestehende UX und Funktionalität bleibt **100% identisch**. Wir modularisieren nur die Code-Struktur.

### Schritt 0.1: Zentrale Permission-Konfiguration erstellen
- [ ] **KRITISCH**: Erstelle `frontend/src/constants/permissionSystem.ts`
- [ ] Extrahiere alle inline Konstanten aus RoleManagementTab.tsx **1:1**:

```typescript
// frontend/src/constants/permissionSystem.ts

// 🚨 WICHTIG: 1:1 KOPIE der bestehenden Konstanten (KEINE Änderungen!)
export const alwaysVisiblePages = ['dashboard', 'worktracker', 'cerebro', 'settings', 'profile'];

export const defaultPages = [
  'dashboard',
  'worktracker', 
  'consultations',
  'team_worktime_control',
  'payroll',
  'usermanagement',
  'cerebro',
  'settings',
  'profile'
];

export const defaultTables = [
  'requests',           // auf dashboard
  'tasks',             // auf worktracker  
  'users',             // auf usermanagement
  'roles',             // auf usermanagement
  'team_worktime',     // auf team_worktime_control
  'worktime',          // auf worktracker
  'clients',           // auf consultations
  'consultation_invoices', // auf consultations
  'branches',          // auf settings/system
  'notifications',     // allgemein
  'settings',          // auf settings
  'monthly_reports'    // auf consultations/reports
];

export const defaultButtons = [
  'database_reset_table', 'database_logs',
  'invoice_create', 'invoice_download', 'invoice_mark_paid', 'invoice_settings',
  'todo_create', 'todo_edit', 'todo_delete', 'task_create', 'task_edit', 'task_delete',
  'user_create', 'user_edit', 'user_delete', 'role_assign', 'role_create', 'role_edit', 'role_delete',
  'worktime_start', 'worktime_stop', 'worktime_edit', 'worktime_delete', 'cerebro',
  'consultation_start', 'consultation_stop', 'consultation_edit',
  'client_create', 'client_edit', 'client_delete',
  'settings_system', 'settings_notifications', 'settings_profile',
  'payroll_generate', 'payroll_export', 'payroll_edit'
];

// EXAKT gleiche Mappings wie aktuell
export const tableToPageMapping = {
  'requests': 'dashboard',
  'tasks': 'worktracker',
  'users': 'usermanagement',
  'roles': 'usermanagement',
  'team_worktime': 'team_worktime_control',
  'worktime': 'worktracker',
  'clients': 'consultations',
  'consultation_invoices': 'consultations',
  'branches': 'settings',
  'notifications': 'general',
  'settings': 'settings',
  'monthly_reports': 'consultations'
};

export const buttonToPageMapping = {
  'database_reset_table': 'settings',
  'database_logs': 'settings',
  // ... alle bestehenden Mappings 1:1 kopieren
};
```

- [ ] **CHECKPOINT**: Alle Konstanten 1:1 extrahiert (KEINE UX-Änderung)

### Schritt 0.2: Permission-Utilities für exakt gleiche Funktionalität
- [ ] Erstelle `frontend/src/utils/permissionHelpers.ts`
- [ ] Implementiere **EXAKT gleiche Funktionen** wie aktuell:

```typescript
// frontend/src/utils/permissionHelpers.ts

import { defaultPages, defaultTables, defaultButtons, alwaysVisiblePages } from '../constants/permissionSystem.ts';
import { AccessLevel } from '../types/interfaces.ts';

export class PermissionHelpers {
  
  // EXAKT gleiche Funktion wie RoleManagementTab.setAllPagePermissions
  static setAllPagePermissions(currentPermissions: Permission[], accessLevel: AccessLevel): Permission[] {
    const newPermissions = [...currentPermissions];
    
    currentPermissions
      .filter(p => p.entityType === 'page' && !alwaysVisiblePages.includes(p.entity))
      .forEach(permission => {
        const permIndex = currentPermissions.indexOf(permission);
        newPermissions[permIndex] = { ...permission, accessLevel };
      });
    
    return newPermissions;
  }

  // EXAKT gleiche Funktion wie RoleManagementTab.setAllTablePermissions
  static setAllTablePermissions(currentPermissions: Permission[], accessLevel: AccessLevel): Permission[] {
    const newPermissions = [...currentPermissions];
    
    currentPermissions
      .filter(p => p.entityType === 'table')
      .forEach(permission => {
        const permIndex = currentPermissions.indexOf(permission);
        newPermissions[permIndex] = { ...permission, accessLevel };
      });
    
    return newPermissions;
  }

  // EXAKT gleiche Funktion wie RoleManagementTab.setAllButtonPermissions  
  static setAllButtonPermissions(currentPermissions: Permission[], accessLevel: AccessLevel): Permission[] {
    const newPermissions = [...currentPermissions];
    
    currentPermissions
      .filter(p => p.entityType === 'button')
      .forEach(permission => {
        const permIndex = currentPermissions.indexOf(permission);
        newPermissions[permIndex] = { ...permission, accessLevel };
      });
    
    return newPermissions;
  }

  // Generiert Standard-Permissions exakt wie aktuell
  static generateStandardPermissions(): Permission[] {
    return [
      // Seiten-Berechtigungen  
      ...defaultPages.map(page => ({
        entity: page,
        entityType: 'page',
        accessLevel: alwaysVisiblePages.includes(page) ? 'both' as AccessLevel : 'none' as AccessLevel
      })),
      // Tabellen-Berechtigungen
      ...defaultTables.map(table => ({
        entity: table,
        entityType: 'table', 
        accessLevel: 'none' as AccessLevel
      })),
      // Button-Berechtigungen
      ...defaultButtons.map(button => ({
        entity: button,
        entityType: 'button',
        accessLevel: 'none' as AccessLevel
      }))
    ];
  }
}
```

- [ ] **CHECKPOINT**: Funktionalität 1:1 repliziert (KEINE UX-Änderung)

### Schritt 0.3: RoleManagementTab refactorieren (ohne UX-Änderung)
- [ ] **KRITISCH**: Ersetze nur die Konstanten-Definitionen:
  - Entferne Zeilen 24-165 (Konstanten-Definitionen)
  - Importiere von `permissionSystem.ts`
  - Ersetze `setAllPagePermissions()` etc. durch `PermissionHelpers.setAllPagePermissions()`
- [ ] **UI bleibt 100% identisch** - Keine Sidepanes, keine Component-Änderungen
- [ ] **CHECKPOINT**: RoleManagementTab.tsx um ~140 Zeilen reduziert (1511 → ~1370)

### Schritt 0.4: System-weite Permission-Verwendung standardisieren
- [ ] **ÜBERALL im System**: Ersetze lokale Permission-Konstanten durch zentrales System
- [ ] Update alle Komponenten die Permission-Entities verwenden:
  - `frontend/src/hooks/usePermissions.ts` - Verwende zentrale Konstanten
  - `frontend/src/components/Sidebar.tsx` - Verwende zentrale alwaysVisiblePages  
  - `backend/prisma/seed.ts` - Synchronisiere mit Frontend-Konstanten
- [ ] **CHECKPOINT**: Einheitliches Permission-System überall

### Schritt 0.5: Backend/Frontend Synchronisation validieren
- [ ] **KRITISCH**: Vergleiche Frontend-Konstanten mit Backend `ALL_PAGES`, `ALL_TABLES`, `ALL_BUTTONS`
- [ ] Stelle sicher, dass beide Systems **exakt identisch** sind
- [ ] Update Backend falls Unterschiede gefunden werden
- [ ] **CHECKPOINT**: 100% Frontend/Backend Sync validiert

## Phase 1: UI-Modernisierung (Nach Permission-Modularisierung)

**WICHTIG**: Erst nach Phase 0 - Permission-System muss zuerst modularisiert werden.

### Schritt 1.1: Modal zu Sidepane Modernisierung vorbereiten
- [ ] Analysiere InvoiceManagementTab Sidepane-Pattern (Referenz-Implementation)
- [ ] Identifiziere alle Modal-States in RoleManagementTab die zu Sidepane-States werden müssen
- [ ] Plane Transition: `isModalOpen` → `isRoleEditSidepaneOpen`
- [ ] **CHECKPOINT**: Transition-Plan dokumentiert

### Schritt 1.2: Sub-Komponenten für bessere Wartbarkeit
- [ ] Erstelle `frontend/src/components/roleManagement/RoleEditSidepane.tsx`
- [ ] Extrahiere Role-Edit-Logic aus RoleManagementTab (Permission-UI bleibt identisch)
- [ ] Implementiere Sidepane mit InvoiceManagementTab-Pattern
- [ ] **CHECKPOINT**: RoleEditSidepane funktional

### Schritt 1.3: Permission-Edit als separate Sidepane
- [ ] Erstelle `frontend/src/components/roleManagement/PermissionEditSidepane.tsx`
- [ ] Verwende **modularisierte** Permission-System-Komponenten aus Phase 0
- [ ] **UI und UX bleiben 100% identisch** - nur in separater Sidepane
- [ ] **CHECKPOINT**: PermissionEditSidepane funktional

## Abschluss-Checkliste

- [ ] **🚨 KRITISCH**: Permission-System komplett refactoriert und modularisiert
- [ ] **🚨 KRITISCH**: 400+ Zeilen inline Permission-Logic eliminiert  
- [ ] **🚨 KRITISCH**: Wiederverwendbare Permission-Components erstellt
- [ ] Alle Sub-Komponenten erstellt und funktional
- [ ] Sidepanes nach InvoiceManagementTab-Standard implementiert
- [ ] Scrollbalken nach InvoiceManagementTab-Standard implementiert  
- [ ] Standard-Aktionen nach Notifications-Tab-Pattern implementiert
- [ ] Nicht-Standard Schnell-Aktionen entfernt
- [ ] Datei-Größe-Problem durch Refactoring gelöst (1511 → ~700 Zeilen)
- [ ] Dokumentation aktualisiert
- [ ] Alle Tests bestanden
- [ ] Code sauber und optimiert

## 🚨 KRITISCHE ERKENNTNISSE: Permission-System Analysis

### **✅ Bestehende Funktionalität die 100% beibehalten werden muss:**

1. **Perfekte Hierarchische Struktur**: Pages → Tables → Buttons
   - `defaultPages` (9 Seiten), `defaultTables` (12 Tabellen), `defaultButtons` (30+ Buttons)
   - `tableToPageMapping`, `buttonToPageMapping` für korrekte Zuordnungen

2. **AlwaysVisiblePages Konzept funktioniert perfekt**:
   - `['dashboard', 'worktracker', 'cerebro', 'settings', 'profile']`
   - Diese sind disabled und haben immer `'both'` accessLevel

3. **Bulk-Actions UI ist Standard-konform**:
   - 3 Dropdown-Selects: "Alle Seiten", "Alle Tabellen", "Alle Buttons"  
   - Funktionen: `setAllPagePermissions()`, `setAllTablePermissions()`, `setAllButtonPermissions()`

4. **Hierarchische UI-Darstellung ist optimal**:
   - Seiten als Hauptelemente mit Switch
   - Tabellen als Unterpunkte: `└ tablename`
   - Buttons als Unterpunkte: `└ 🔘 buttonname`

5. **Permission-Logic funktioniert systemweit**:
   - `usePermissions()` Hook mit `hasPermission(entity, accessLevel, entityType)`
   - Backend `checkPermission` middleware funktioniert

### **🎯 Problem: Nur Code-Struktur, NICHT Funktionalität**
- **140+ Zeilen Konstanten** inline statt zentral (Zeilen 24-165)
- **Bulk-Functions** inline statt wiederverwendbar (Zeilen 729-777) 
- **Gleiche Permission-Listen** in Backend + Frontend getrennt verwaltet

### **✅ Lösung: Code modularisieren, UX beibehalten**
```
frontend/src/
├── constants/
│   └── permissionSystem.ts     # Zentrale Konstanten (1:1 Kopie)
├── utils/ 
│   └── permissionHelpers.ts    # Bulk-Functions (1:1 Funktionalität)
└── components/
    └── RoleManagementTab.tsx   # ~1370 Zeilen (statt 1511)
```

**KEINE neuen UI-Komponenten - bestehende UI funktioniert perfekt!**

### **Wichtige Standards-Referenzen**

### Sidepane-Pattern (InvoiceManagementTab)
- Rechts-seitige Sidepane mit Slide-Animation
- `translate-x-full` zu `translate-x-0` Transition
- Z-Index 50 für Overlay
- Feste Breite (w-96)

### Scrollbalken-Standard (InvoiceManagementTab)
- `overflow-x-auto` für horizontales Scrollen
- `max-h-96 overflow-y-auto` für vertikales Scrollen
- Konsistente Tabellen-Struktur

### Standard-Aktionen Pattern (Notifications Tab)
- "Alle" Toggle pro Kategorie
- Switch-Design mit Peer-Selectors
- Konsistente Spacing und Typography
- Toggle-States reflektieren aktuellen Status

### BEIBEHALTENE Standards (Settings)
- Role-Switches bleiben unverändert
- Permission-Switches bleiben unverändert
- Einstellungs-spezifische UI-Elemente bleiben standard

### **🎯 NEUER Permission-Standard**
- **Zentrale Konfiguration**: Alle Permissions in `permissionConfig.ts`
- **Hierarchische Struktur**: Module → Pages → Tables → Buttons
- **Automatische Mappings**: Generiert aus Struktur, nicht hardcodiert
- **Wiederverwendbare Components**: `PermissionToggle`, `HierarchicalPermissionPanel`
- **Type-Safe**: TypeScript Interfaces für Permission-Entitäten

## Datei-Struktur nach Refactoring

```
frontend/src/
├── constants/
│   └── permissionConfig.ts (NEU - Zentrale Permission-Struktur)
├── utils/
│   └── permissionUtils.ts (NEU - Permission-Logic-Utils)
├── components/
│   ├── permissions/ (NEU - Wiederverwendbare Permission-Components)
│   │   ├── PermissionToggle.tsx
│   │   └── HierarchicalPermissionPanel.tsx
│   ├── RoleManagementTab.tsx (~700 Zeilen, reduziert von 1511)
│   └── roleManagement/ (Neue Sub-Komponenten)
│       ├── RoleEditSidepane.tsx
│       ├── PermissionEditSidepane.tsx
│       ├── RoleActionsPanel.tsx
│       └── RoleListTable.tsx
```

## Hinweise für die Implementierung

### 🚨 **KRITISCHE REIHENFOLGE** (MUSS eingehalten werden)
1. **ZUERST Phase 0**: Permission-System Modularisierung (verhindert Code-Duplikation überall)
2. **DANN Phase 1+**: UI-Modernisierung (Sidepanes, Scrollbalken, etc.)

### **Implementierungs-Guidelines**
1. **IMMER** nach jedem Schritt testen
2. **STARTE MIT Phase 0**: Permission-System **Code-Struktur** modularisieren 
3. **BEHALTE UX 100% IDENTISCH**: Keine UI-Änderungen in Phase 0
4. **BENUTZE** InvoiceManagementTab als Referenz für Sidepanes (Phase 1)
5. **BENUTZE** Notifications Tab als Referenz für Standard-Aktionen (Phase 1)
6. **BEHALTE** alle bestehenden Permission-Standards bei:
   - AlwaysVisiblePages bleiben disabled
   - Bulk-Actions bleiben als 3 Dropdown-Selects
   - Hierarchische UI bleibt mit `└` Symbolen
   - Permission-Logic bleibt identisch

### **Permission-System Validierung**
- **NIEMALS** bestehende Permission-Funktionalität ändern
- **1:1 KOPIE** aller Konstanten von RoleManagementTab → zentrale Dateien
- **SYNCHRONISIERE** Frontend-Konstanten mit Backend-Seed-Data  
- **TESTE** Permission-Checks nach jeder Änderung
- **VALIDIERE** Backend/Frontend Permission-Listen sind identisch 
/**
 * PermissionEditor - Komponente zum Bearbeiten von Berechtigungen gemäß Plan
 * 
 * Rendert die hierarchische Berechtigungsstruktur:
 * PAGE > BOX/TAB > BUTTON
 * 
 * Mit korrekten Ausprägungen:
 * - PAGE: ja/nein (binary)
 * - BOX/TAB: alle/eigene/nein (ternary)
 * - BUTTON: je nach Definition (binary oder ternary)
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  PERMISSION_STRUCTURE,
  PermissionPage,
  PermissionBox,
  PermissionTab,
  PermissionButton,
  PermissionOptions,
  getAccessLevelOptions
} from '../config/permissionStructure.ts';
import { AccessLevel } from '../types/interfaces.ts';
import { AccessLevel as NewAccessLevel, convertLegacyAccessLevel } from '../config/permissions.ts';

interface Permission {
  entity: string;
  entityType: string;
  accessLevel: AccessLevel;
}

interface PermissionEditorProps {
  permissions: Permission[];
  onChange: (permissions: Permission[]) => void;
  disabled?: boolean;
}

// Hilfsfunktion: Übersetze Label (falls es ein Standard-Label ist)
const translateLabel = (label: string, t: (key: string) => string): string => {
  // Standard-Button-Labels übersetzen
  const labelMap: Record<string, string> = {
    'Erstellen': t('common.create'),
    'Bearbeiten': t('common.edit'),
    'Löschen': t('common.delete'),
    'Starten': t('common.start') || 'Starten',
    'Stoppen': t('common.stop') || 'Stoppen',
    'Planen': t('common.plan') || 'Planen',
    'Client anlegen': t('roles.buttons.client_create') || 'Client anlegen',
    'Anbieter erstellen': t('roles.buttons.tour_provider_create') || 'Anbieter erstellen',
    'Anbieter bearbeiten': t('roles.buttons.tour_provider_edit') || 'Anbieter bearbeiten',
    'Anbieter löschen': t('roles.buttons.tour_provider_delete') || 'Anbieter löschen',
    'Tour erstellen': t('roles.buttons.tour_create') || 'Tour erstellen',
    'Tour bearbeiten': t('roles.buttons.tour_edit') || 'Tour bearbeiten',
    'Tour löschen': t('roles.buttons.tour_delete') || 'Tour löschen',
    'Tausch-Anfragen': t('common.exchangeRequests') || 'Tausch-Anfragen'
  };
  
  return labelMap[label] || label;
};

// Hilfsfunktion: Finde Permission für Entity
const findPermission = (permissions: Permission[], entity: string): Permission | undefined => {
  return permissions.find(p => p.entity === entity);
};

// Hilfsfunktion: Aktualisiere Permission
const updatePermission = (
  permissions: Permission[],
  entity: string,
  entityType: string,
  newAccessLevel: string
): Permission[] => {
  const existingIndex = permissions.findIndex(p => p.entity === entity);
  
  if (existingIndex >= 0) {
    const newPermissions = [...permissions];
    newPermissions[existingIndex] = {
      ...newPermissions[existingIndex],
      accessLevel: newAccessLevel as AccessLevel
    };
    return newPermissions;
  }
  
  // Falls nicht vorhanden, hinzufügen
  return [
    ...permissions,
    { entity, entityType, accessLevel: newAccessLevel as AccessLevel }
  ];
};

// AccessLevel Dropdown Komponente
const AccessLevelDropdown: React.FC<{
  value: AccessLevel;
  options: PermissionOptions;
  onChange: (value: string) => void;
  disabled?: boolean;
}> = ({ value, options, onChange, disabled }) => {
  const { t } = useTranslation();
  const normalizedValue = convertLegacyAccessLevel(value);
  const optionValues = getAccessLevelOptions(options);
  
  // Normalisiere Wert auf gültige Option
  const displayValue = optionValues.includes(normalizedValue as any)
    ? normalizedValue
    : (normalizedValue === 'own_read' || normalizedValue === 'own_both')
      ? (optionValues.includes('own_both') ? 'own_both' : 'all_both')
      : (normalizedValue === 'all_read' || normalizedValue === 'all_both')
        ? 'all_both'
        : 'none';

  const getColorClass = (level: string): string => {
    switch (level) {
      case 'none': return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
      case 'own_both': return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300';
      case 'all_both': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  return (
    <select
      value={displayValue}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`text-xs px-1.5 py-0.5 ${getColorClass(displayValue)} rounded border-0 cursor-pointer focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed max-w-[90px]`}
    >
      {optionValues.map((level) => (
        <option key={level} value={level}>
          {t(`roles.accessLevels.${level}`)}
        </option>
      ))}
    </select>
  );
};

// Button-Eintrag rendern
const ButtonEntry: React.FC<{
  button: PermissionButton;
  permissions: Permission[];
  onChange: (permissions: Permission[]) => void;
  disabled?: boolean;
}> = ({ button, permissions, onChange, disabled }) => {
  const { t } = useTranslation();
  const perm = findPermission(permissions, button.entity);
  const currentValue = perm?.accessLevel || 'none';

  return (
    <div className="flex items-center justify-between mt-1 pl-12 border-l-2 border-gray-300 dark:border-gray-600">
      <span className="text-xs text-gray-600 dark:text-gray-400 truncate mr-2">└ {translateLabel(button.label, t)}</span>
      <AccessLevelDropdown
        value={currentValue}
        options={button.options}
        onChange={(newValue) => {
          onChange(updatePermission(permissions, button.entity, 'button', newValue));
        }}
        disabled={disabled}
      />
    </div>
  );
};

// Tab-Eintrag rendern
const TabEntry: React.FC<{
  tab: PermissionTab;
  permissions: Permission[];
  onChange: (permissions: Permission[]) => void;
  disabled?: boolean;
}> = ({ tab, permissions, onChange, disabled }) => {
  const { t } = useTranslation();
  const perm = findPermission(permissions, tab.entity);
  const currentValue = perm?.accessLevel || 'none';

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between pl-6 border-l-2 border-blue-300 dark:border-blue-600">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate mr-2">└ {translateLabel(tab.label, t)}</span>
        <AccessLevelDropdown
          value={currentValue}
          options={tab.options}
          onChange={(newValue) => {
            onChange(updatePermission(permissions, tab.entity, 'tab', newValue));
          }}
          disabled={disabled}
        />
      </div>
      {tab.buttons?.map((button) => (
        <ButtonEntry
          key={button.entity}
          button={button}
          permissions={permissions}
          onChange={onChange}
          disabled={disabled}
        />
      ))}
    </div>
  );
};

// Box-Eintrag rendern
const BoxEntry: React.FC<{
  box: PermissionBox;
  permissions: Permission[];
  onChange: (permissions: Permission[]) => void;
  disabled?: boolean;
}> = ({ box, permissions, onChange, disabled }) => {
  const { t } = useTranslation();
  const perm = findPermission(permissions, box.entity);
  const currentValue = perm?.accessLevel || 'none';

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between pl-6 border-l-2 border-purple-300 dark:border-purple-600">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate mr-2">└ {translateLabel(box.label, t)}</span>
        {box.options ? (
          <AccessLevelDropdown
            value={currentValue}
            options={box.options}
            onChange={(newValue) => {
              onChange(updatePermission(permissions, box.entity, 'box', newValue));
            }}
            disabled={disabled}
          />
        ) : (
          <span className="text-xs text-gray-400">-</span>
        )}
      </div>
      {box.buttons?.map((button) => (
        <ButtonEntry
          key={button.entity}
          button={button}
          permissions={permissions}
          onChange={onChange}
          disabled={disabled}
        />
      ))}
      {box.tabs?.map((tab) => (
        <TabEntry
          key={tab.entity}
          tab={tab}
          permissions={permissions}
          onChange={onChange}
          disabled={disabled}
        />
      ))}
    </div>
  );
};

// Page-Eintrag rendern
const PageEntry: React.FC<{
  page: PermissionPage;
  permissions: Permission[];
  onChange: (permissions: Permission[]) => void;
  disabled?: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ page, permissions, onChange, disabled, isExpanded, onToggle }) => {
  const { t } = useTranslation();
  const perm = findPermission(permissions, page.entity);
  const currentValue = perm?.accessLevel || 'none';
  const hasChildren = (page.boxes && page.boxes.length > 0) || (page.tabs && page.tabs.length > 0);

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 pb-3 mb-3">
      <div 
        className="flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded p-1"
        onClick={hasChildren ? onToggle : undefined}
      >
        <div className="flex items-center gap-2">
          {hasChildren && (
            <span className={`text-gray-400 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
              ▶
            </span>
          )}
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{translateLabel(page.label, t)}</span>
        </div>
        <AccessLevelDropdown
          value={currentValue}
          options={page.options}
          onChange={(newValue) => {
            onChange(updatePermission(permissions, page.entity, 'page', newValue));
          }}
          disabled={disabled}
        />
      </div>
      
      {isExpanded && hasChildren && (
        <div className="mt-2 ml-4">
          {page.boxes?.map((box) => (
            <BoxEntry
              key={box.entity}
              box={box}
              permissions={permissions}
              onChange={onChange}
              disabled={disabled}
            />
          ))}
          {page.tabs?.map((tab) => (
            <TabEntry
              key={tab.entity}
              tab={tab}
              permissions={permissions}
              onChange={onChange}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Hauptkomponente
const PermissionEditor: React.FC<PermissionEditorProps> = ({
  permissions,
  onChange,
  disabled = false
}) => {
  const { t } = useTranslation();
  const [expandedPages, setExpandedPages] = React.useState<Set<string>>(new Set());

  const togglePage = (pageEntity: string) => {
    const newExpanded = new Set(expandedPages);
    if (newExpanded.has(pageEntity)) {
      newExpanded.delete(pageEntity);
    } else {
      newExpanded.add(pageEntity);
    }
    setExpandedPages(newExpanded);
  };

  const expandAll = () => {
    setExpandedPages(new Set(PERMISSION_STRUCTURE.map(p => p.entity)));
  };

  const collapseAll = () => {
    setExpandedPages(new Set());
  };

  // Setze alle Permissions auf einen Wert
  const setAllTo = (value: string) => {
    let newPermissions = [...permissions];
    PERMISSION_STRUCTURE.forEach(page => {
      newPermissions = updatePermission(newPermissions, page.entity, 'page', value);
      page.boxes?.forEach(box => {
        if (box.options) {
          newPermissions = updatePermission(newPermissions, box.entity, 'box', value);
        }
        box.buttons?.forEach(button => {
          newPermissions = updatePermission(newPermissions, button.entity, 'button', value);
        });
        box.tabs?.forEach(tab => {
          newPermissions = updatePermission(newPermissions, tab.entity, 'tab', value);
          tab.buttons?.forEach(button => {
            newPermissions = updatePermission(newPermissions, button.entity, 'button', value);
          });
        });
      });
      page.tabs?.forEach(tab => {
        newPermissions = updatePermission(newPermissions, tab.entity, 'tab', value);
        tab.buttons?.forEach(button => {
          newPermissions = updatePermission(newPermissions, button.entity, 'button', value);
        });
      });
    });
    onChange(newPermissions);
  };

  return (
    <div className="space-y-2">
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          type="button"
          onClick={expandAll}
          className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200"
        >
          {t('common.expandAll') || 'Alle aufklappen'}
        </button>
        <button
          type="button"
          onClick={collapseAll}
          className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200"
        >
          {t('common.collapseAll') || 'Alle zuklappen'}
        </button>
        <button
          type="button"
          onClick={() => setAllTo('all_both')}
          className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded hover:bg-green-200"
        >
          {t('roles.form.setAllToYes')}
        </button>
        <button
          type="button"
          onClick={() => setAllTo('none')}
          className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded hover:bg-red-200"
        >
          {t('roles.form.setAllToNo')}
        </button>
      </div>

      {/* Permission Structure */}
      <div className="border rounded-lg p-4 dark:border-gray-600 max-h-[400px] overflow-y-auto">
        {PERMISSION_STRUCTURE.map((page) => (
          <PageEntry
            key={page.entity}
            page={page}
            permissions={permissions}
            onChange={onChange}
            disabled={disabled}
            isExpanded={expandedPages.has(page.entity)}
            onToggle={() => togglePage(page.entity)}
          />
        ))}
      </div>
    </div>
  );
};

export default PermissionEditor;

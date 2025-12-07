import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  ClipboardIcon, 
  LinkIcon,
  EyeIcon,
  EyeSlashIcon,
  KeyIcon,
  ShieldCheckIcon,
  ClockIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { usePermissions } from '../hooks/usePermissions.ts';
import { useAuth } from '../hooks/useAuth.tsx';
import { passwordManagerApi, PasswordEntry } from '../services/passwordManagerApi.ts';
import { toast } from 'react-toastify';
import PasswordEntrySidepane from './PasswordEntrySidepane.tsx';
import PasswordEntryPermissionsModal from './PasswordEntryPermissionsModal.tsx';
import PasswordEntryAuditLogsModal from './PasswordEntryAuditLogsModal.tsx';
import FilterPane from './FilterPane.tsx';
import SavedFilterTags from './SavedFilterTags.tsx';
import { FilterCondition } from './FilterRow.tsx';
import { applyFilters } from '../utils/filterLogic.ts';

// TableID für gespeicherte Filter
const PASSWORD_MANAGER_TABLE_ID = 'password-manager-table';

const PasswordManagerTab: React.FC = () => {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const { user } = useAuth();
  const [entries, setEntries] = useState<PasswordEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateSidepaneOpen, setIsCreateSidepaneOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PasswordEntry | null>(null);
  const [viewingPassword, setViewingPassword] = useState<number | null>(null);
  const [viewedPasswords, setViewedPasswords] = useState<Record<number, string>>({});
  const [permissionsEntryId, setPermissionsEntryId] = useState<number | null>(null);
  const [auditLogsEntryId, setAuditLogsEntryId] = useState<number | null>(null);
  
  // Filter State Management (Controlled Mode)
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([]);
  const [filterLogicalOperators, setFilterLogicalOperators] = useState<('AND' | 'OR')[]>([]);
  const [isFilterPaneOpen, setIsFilterPaneOpen] = useState(false);
  const [activeFilterName, setActiveFilterName] = useState<string>('');
  const [selectedFilterId, setSelectedFilterId] = useState<number | null>(null);
  
  // Spalten-Definitionen für Filter
  const availableColumns = useMemo(() => [
    { id: 'title', label: t('passwordManager.entryTitle') },
    { id: 'url', label: t('passwordManager.entryUrl') },
    { id: 'username', label: t('passwordManager.entryUsername') },
    { id: 'notes', label: t('passwordManager.entryNotes') },
    { id: 'createdAt', label: t('passwordManager.sortByCreated') },
    { id: 'updatedAt', label: t('passwordManager.sortByUpdated') },
    { id: 'createdBy', label: t('common.createdBy') }
  ], [t]);

  // Prüfe Berechtigungen
  const canView = hasPermission('password_manager', 'read', 'page');
  const canCreate = hasPermission('password_entry_create', 'write', 'button');
  const canEdit = hasPermission('password_manager', 'write', 'page');
  const canDelete = hasPermission('password_manager', 'write', 'page');

  // Lade Einträge
  useEffect(() => {
    if (canView) {
      loadEntries();
    }
  }, [canView]);

  const loadEntries = async () => {
    try {
      setIsLoading(true);
      const data = await passwordManagerApi.getAll();
      setEntries(data);
    } catch (error: any) {
      console.error('Error loading password entries:', error);
      toast.error(t('passwordManager.error') || 'Fehler beim Laden der Einträge');
    } finally {
      setIsLoading(false);
    }
  };

  // URL-Validierung
  const isValidUrl = (urlString: string): boolean => {
    if (!urlString) return false;
    
    try {
      const url = new URL(urlString);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  // Passwort kopieren
  const handleCopyPassword = async (entry: PasswordEntry) => {
    try {
      // Prüfe ob Passwort bereits geladen wurde
      if (!viewedPasswords[entry.id]) {
        const passwordData = await passwordManagerApi.getPassword(entry.id);
        setViewedPasswords(prev => ({ ...prev, [entry.id]: passwordData.password }));
      }
      
      const password = viewedPasswords[entry.id];
      await navigator.clipboard.writeText(password);
      
      // Audit-Log für copy_password erstellen
      try {
        await passwordManagerApi.logPasswordCopy(entry.id);
      } catch (logError) {
        // Nicht kritisch, nur loggen
        console.warn('Error logging password copy:', logError);
      }
      
      toast.success(t('passwordManager.passwordCopied'));
    } catch (error: any) {
      console.error('Error copying password:', error);
      toast.error(t('passwordManager.errorCopyingPassword'));
    }
  };

  // Öffnen & Passwort kopieren
  const handleOpenAndCopy = async (entry: PasswordEntry) => {
    try {
      // Passwort abrufen (entschlüsselt) - erstellt automatisch Audit-Log
      if (!viewedPasswords[entry.id]) {
        const passwordData = await passwordManagerApi.getPassword(entry.id);
        setViewedPasswords(prev => ({ ...prev, [entry.id]: passwordData.password }));
      }
      
      const password = viewedPasswords[entry.id];
      await navigator.clipboard.writeText(password);
      
      // Audit-Log für copy_password erstellen
      try {
        await passwordManagerApi.logPasswordCopy(entry.id);
      } catch (logError) {
        // Nicht kritisch, nur loggen
        console.warn('Error logging password copy:', logError);
      }
      
      // URL in neuem Tab öffnen (nur wenn gültig)
      if (entry.url && isValidUrl(entry.url)) {
        window.open(entry.url, '_blank', 'noopener,noreferrer');
        toast.success(t('passwordManager.passwordCopiedAndOpened'));
      } else {
        toast.success(t('passwordManager.passwordCopied'));
      }
    } catch (error: any) {
      console.error('Error opening and copying password:', error);
      toast.error(t('passwordManager.errorCopyingPassword'));
    }
  };

  // Passwort anzeigen
  const handleShowPassword = async (entry: PasswordEntry) => {
    try {
      if (!viewedPasswords[entry.id]) {
        const passwordData = await passwordManagerApi.getPassword(entry.id);
        setViewedPasswords(prev => ({ ...prev, [entry.id]: passwordData.password }));
      }
      setViewingPassword(entry.id);
    } catch (error: any) {
      console.error('Error showing password:', error);
      toast.error(t('passwordManager.error') || 'Fehler beim Anzeigen des Passworts');
    }
  };

  // Eintrag löschen
  const handleDelete = async (entry: PasswordEntry) => {
    if (!window.confirm(t('passwordManager.deleteConfirm'))) {
      return;
    }

    try {
      await passwordManagerApi.delete(entry.id);
      setEntries(prev => prev.filter(e => e.id !== entry.id));
      toast.success(t('passwordManager.deleteEntry') || 'Eintrag erfolgreich gelöscht');
    } catch (error: any) {
      console.error('Error deleting entry:', error);
      toast.error(error.response?.data?.message || t('passwordManager.error') || 'Fehler beim Löschen');
    }
  };

  // Eintrag bearbeiten
  const handleEdit = (entry: PasswordEntry) => {
    setEditingEntry(entry);
    setIsCreateSidepaneOpen(true);
  };

  // Eintrag erstellt/aktualisiert
  const handleEntrySaved = (entry: PasswordEntry) => {
    if (editingEntry) {
      // Update
      setEntries(prev => prev.map(e => e.id === entry.id ? entry : e));
      setEditingEntry(null);
    } else {
      // Create
      setEntries(prev => [entry, ...prev]);
    }
    setIsCreateSidepaneOpen(false);
    setEditingEntry(null);
  };

  // Sidepane schließen
  const handleSidepaneClose = () => {
    setIsCreateSidepaneOpen(false);
    setEditingEntry(null);
  };

  // Filter-Funktionen
  const applyFilterConditions = (conditions: FilterCondition[], operators: ('AND' | 'OR')[]) => {
    setFilterConditions(conditions);
    setFilterLogicalOperators(operators);
  };

  const resetFilterConditions = () => {
    setFilterConditions([]);
    setFilterLogicalOperators([]);
    setActiveFilterName('');
    setSelectedFilterId(null);
  };

  const handleFilterChange = (name: string, id: number | null, conditions: FilterCondition[], operators: ('AND' | 'OR')[]) => {
    setActiveFilterName(name);
    setSelectedFilterId(id);
    applyFilterConditions(conditions, operators);
  };

  // Column Evaluators für Filter
  const columnEvaluators: any = {
    'title': (item: PasswordEntry, cond: FilterCondition) => {
      const value = item.title?.toLowerCase() || '';
      return evaluateTextCondition(value, cond);
    },
    'url': (item: PasswordEntry, cond: FilterCondition) => {
      const value = item.url?.toLowerCase() || '';
      return evaluateTextCondition(value, cond);
    },
    'username': (item: PasswordEntry, cond: FilterCondition) => {
      const value = item.username?.toLowerCase() || '';
      return evaluateTextCondition(value, cond);
    },
    'notes': (item: PasswordEntry, cond: FilterCondition) => {
      const value = item.notes?.toLowerCase() || '';
      return evaluateTextCondition(value, cond);
    },
    'createdAt': (item: PasswordEntry, cond: FilterCondition) => {
      return evaluateDateCondition(new Date(item.createdAt), cond);
    },
    'updatedAt': (item: PasswordEntry, cond: FilterCondition) => {
      return evaluateDateCondition(new Date(item.updatedAt), cond);
    },
    'createdBy': (item: PasswordEntry, cond: FilterCondition) => {
      const value = item.createdBy ? `${item.createdBy.firstName} ${item.createdBy.lastName}`.toLowerCase() : '';
      return evaluateTextCondition(value, cond);
    }
  };

  const evaluateTextCondition = (value: string, cond: FilterCondition): boolean => {
    const condValue = (cond.value || '').toLowerCase();
    switch (cond.operator) {
      case 'equals': return value === condValue;
      case 'contains': return value.includes(condValue);
      case 'startsWith': return value.startsWith(condValue);
      case 'endsWith': return value.endsWith(condValue);
      case 'isNull': return !value;
      case 'isNotNull': return !!value;
      default: return false;
    }
  };

  const evaluateDateCondition = (date: Date, cond: FilterCondition): boolean => {
    const condDate = cond.value ? new Date(cond.value) : null;
    if (!condDate || isNaN(condDate.getTime())) return false;
    
    const dateMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const condMidnight = new Date(condDate.getFullYear(), condDate.getMonth(), condDate.getDate());
    
    switch (cond.operator) {
      case 'equals': return dateMidnight.getTime() === condMidnight.getTime();
      case 'before': return dateMidnight.getTime() < condMidnight.getTime();
      case 'after': return dateMidnight.getTime() > condMidnight.getTime();
      default: return false;
    }
  };

  const getFieldValue = (item: PasswordEntry, columnId: string): any => {
    switch (columnId) {
      case 'title': return item.title;
      case 'url': return item.url;
      case 'username': return item.username;
      case 'notes': return item.notes;
      case 'createdAt': return item.createdAt;
      case 'updatedAt': return item.updatedAt;
      case 'createdBy': return item.createdBy ? `${item.createdBy.firstName} ${item.createdBy.lastName}` : '';
      default: return (item as any)[columnId];
    }
  };

  // Gefilterte und sortierte Einträge
  const filteredAndSortedEntries = useMemo(() => {
    let filtered = [...entries];

    // Filter anwenden
    if (filterConditions.length > 0) {
      filtered = applyFilters(
        filtered,
        filterConditions,
        filterLogicalOperators,
        getFieldValue,
        columnEvaluators
      );
    }

    // ❌ ENTFERNT: Filter-Sortierung - Filter-Sortierung wurde entfernt (Phase 1)
      // Standard-Sortierung: nach createdAt desc
      filtered.sort((a, b) => {
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();
        return bTime - aTime;
      });

    return filtered;
  }, [entries, filterConditions, filterLogicalOperators]);

  if (!canView) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
        <p className="text-gray-600 dark:text-gray-400">
          {t('passwordManager.error') || 'Keine Berechtigung für den Passwort-Manager'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header-Bereich: Create-Button links, Filter-Button rechts */}
      <div className="flex items-center justify-between mb-4">
        {/* Linke Seite: Create-Button */}
        <div className="flex items-center">
          {canCreate && (
            <div className="relative group">
              <button
                onClick={() => {
                  setEditingEntry(null);
                  setIsCreateSidepaneOpen(true);
                }}
                className="bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 p-1.5 rounded-full hover:bg-blue-50 dark:hover:bg-gray-600 border border-blue-200 dark:border-gray-600 shadow-sm flex items-center justify-center"
                style={{ width: '30.19px', height: '30.19px' }}
                aria-label={t('passwordManager.createEntry')}
              >
                <PlusIcon className="h-4 w-4" />
              </button>
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                {t('passwordManager.createEntry')}
              </div>
            </div>
          )}
        </div>
        
        {/* Rechte Seite: Filter-Button */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              className={`p-2 rounded-md border ${filterConditions.length > 0 ? 'border-blue-300 bg-blue-50 text-blue-600' : 'border-gray-300 hover:bg-gray-100'}`}
              onClick={() => setIsFilterPaneOpen(!isFilterPaneOpen)}
              title={t('common.filter')}
            >
              <FunnelIcon className="h-5 w-5" />
              {filterConditions.length > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center">
                  {filterConditions.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Filter-Panel */}
      {isFilterPaneOpen && (
        <div className="px-3 sm:px-4 md:px-6">
          <FilterPane
            columns={availableColumns}
            onApply={applyFilterConditions}
            onReset={resetFilterConditions}
            savedConditions={filterConditions}
            savedOperators={filterLogicalOperators}
            tableId={PASSWORD_MANAGER_TABLE_ID}
          />
        </div>
      )}

      {/* Gespeicherte Filter als Tags */}
      <div className="px-3 sm:px-4 md:px-6">
        <SavedFilterTags
          tableId={PASSWORD_MANAGER_TABLE_ID}
          onSelectFilter={(conditions, operators) => applyFilterConditions(conditions, operators)}
          onReset={resetFilterConditions}
          activeFilterName={activeFilterName}
          selectedFilterId={selectedFilterId}
          onFilterChange={handleFilterChange}
          defaultFilterName="Alle Einträge" // ✅ FIX: Hardcodiert (konsistent mit DB)
        />
      </div>

      {/* Liste der Einträge */}
      {isLoading ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6 text-center">
          <p className="text-gray-600 dark:text-gray-400">{t('passwordManager.loading')}</p>
        </div>
      ) : filteredAndSortedEntries.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            {filterConditions.length > 0 ? t('passwordManager.noEntriesFiltered', 'Keine Einträge gefunden') : t('passwordManager.noEntries')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAndSortedEntries.map(entry => (
            <div
              key={entry.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {entry.title}
                  </h3>
                  
                  {entry.url && (
                    <div className="mb-2">
                      <a
                        href={entry.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                        onClick={(e) => {
                          if (!isValidUrl(entry.url || '')) {
                            e.preventDefault();
                            toast.error(t('passwordManager.urlInvalid'));
                          }
                        }}
                      >
                        <LinkIcon className="h-4 w-4" />
                        {entry.url}
                      </a>
                    </div>
                  )}

                  {entry.username && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      <span className="font-medium">{t('passwordManager.entryUsername')}:</span> {entry.username}
                    </p>
                  )}

                  {viewingPassword === entry.id && viewedPasswords[entry.id] && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1 font-mono">
                      <span className="font-medium">{t('passwordManager.entryPassword')}:</span> {viewedPasswords[entry.id]}
                    </p>
                  )}

                  {entry.notes && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      {entry.notes}
                    </p>
                  )}

                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    {/* Passwort anzeigen */}
                    <div className="relative group">
                      <button
                        onClick={() => handleShowPassword(entry)}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                        title={viewingPassword === entry.id ? t('passwordManager.hidePassword') : t('passwordManager.showPassword')}
                      >
                        {viewingPassword === entry.id ? (
                          <EyeSlashIcon className="h-5 w-5" />
                        ) : (
                          <EyeIcon className="h-5 w-5" />
                        )}
                      </button>
                      <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                        {viewingPassword === entry.id ? t('passwordManager.hidePassword') : t('passwordManager.showPassword')}
                      </div>
                    </div>

                    {/* Passwort kopieren */}
                    <div className="relative group">
                      <button
                        onClick={() => handleCopyPassword(entry)}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                        title={t('passwordManager.copyPassword')}
                      >
                        <ClipboardIcon className="h-5 w-5" />
                      </button>
                      <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                        {t('passwordManager.copyPassword')}
                      </div>
                    </div>

                    {/* Öffnen & Passwort kopieren */}
                    {entry.url && (
                      <div className="relative group">
                        <button
                          onClick={() => handleOpenAndCopy(entry)}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md"
                          title={t('passwordManager.openAndCopy')}
                        >
                          <LinkIcon className="h-5 w-5" />
                        </button>
                        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                          {t('passwordManager.openAndCopy')}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 ml-4 flex-wrap">
                  {user && entry.createdById === user.id && (
                    <>
                      <button
                        onClick={() => setPermissionsEntryId(entry.id)}
                        className="p-2 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-md"
                        title={t('passwordManager.managePermissions')}
                      >
                        <ShieldCheckIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setAuditLogsEntryId(entry.id)}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900/20 rounded-md"
                        title={t('passwordManager.auditLogs')}
                      >
                        <ClockIcon className="h-5 w-5" />
                      </button>
                    </>
                  )}
                  {canEdit && (
                    <button
                      onClick={() => handleEdit(entry)}
                      className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md"
                      title={t('passwordManager.editEntry')}
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(entry)}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                      title={t('passwordManager.deleteEntry')}
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sidepane für Create/Edit */}
      <PasswordEntrySidepane
        isOpen={isCreateSidepaneOpen}
        onClose={handleSidepaneClose}
        entry={editingEntry}
        onEntrySaved={handleEntrySaved}
      />

      {/* Berechtigungen-Modal */}
      {permissionsEntryId && (
        <PasswordEntryPermissionsModal
          isOpen={!!permissionsEntryId}
          onClose={() => setPermissionsEntryId(null)}
          entryId={permissionsEntryId}
          onPermissionsUpdated={() => {
            loadEntries();
            setPermissionsEntryId(null);
          }}
        />
      )}

      {/* Audit-Logs-Modal */}
      {auditLogsEntryId && (
        <PasswordEntryAuditLogsModal
          isOpen={!!auditLogsEntryId}
          onClose={() => setAuditLogsEntryId(null)}
          entryId={auditLogsEntryId}
        />
      )}
    </div>
  );
};

export default PasswordManagerTab;


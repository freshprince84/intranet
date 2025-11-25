import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  ClipboardIcon, 
  LinkIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  KeyIcon,
  ShieldCheckIcon,
  ClockIcon,
  ArrowsUpDownIcon
} from '@heroicons/react/24/outline';
import { usePermissions } from '../hooks/usePermissions.ts';
import { useAuth } from '../hooks/useAuth.tsx';
import { passwordManagerApi, PasswordEntry } from '../services/passwordManagerApi.ts';
import { toast } from 'react-toastify';
import PasswordEntrySidepane from './PasswordEntrySidepane.tsx';
import PasswordEntryPermissionsModal from './PasswordEntryPermissionsModal.tsx';
import PasswordEntryAuditLogsModal from './PasswordEntryAuditLogsModal.tsx';

const PasswordManagerTab: React.FC = () => {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const { user } = useAuth();
  const [entries, setEntries] = useState<PasswordEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateSidepaneOpen, setIsCreateSidepaneOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PasswordEntry | null>(null);
  const [viewingPassword, setViewingPassword] = useState<number | null>(null);
  const [viewedPasswords, setViewedPasswords] = useState<Record<number, string>>({});
  const [permissionsEntryId, setPermissionsEntryId] = useState<number | null>(null);
  const [auditLogsEntryId, setAuditLogsEntryId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'title' | 'createdAt' | 'updatedAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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

  // Gefilterte und sortierte Einträge
  const filteredAndSortedEntries = React.useMemo(() => {
    let filtered = entries.filter(entry => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        entry.title.toLowerCase().includes(searchLower) ||
        entry.url?.toLowerCase().includes(searchLower) ||
        entry.username?.toLowerCase().includes(searchLower) ||
        entry.notes?.toLowerCase().includes(searchLower)
      );
    });

    // Sortierung
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      if (sortBy === 'title') {
        aValue = a.title.toLowerCase();
        bValue = b.title.toLowerCase();
      } else if (sortBy === 'createdAt') {
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
      } else {
        aValue = new Date(a.updatedAt).getTime();
        bValue = new Date(b.updatedAt).getTime();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [entries, searchTerm, sortBy, sortOrder]);

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
      {/* Header mit Suchleiste, Sortierung und Erstellen-Button */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex-1 relative min-w-[200px]">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('passwordManager.searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div className="flex items-center gap-2">
          {/* Sortierung */}
          <div className="flex items-center gap-2">
            <ArrowsUpDownIcon className="h-5 w-5 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'title' | 'createdAt' | 'updatedAt')}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
            >
              <option value="title">{t('passwordManager.sortByTitle')}</option>
              <option value="createdAt">{t('passwordManager.sortByCreated')}</option>
              <option value="updatedAt">{t('passwordManager.sortByUpdated')}</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              title={sortOrder === 'asc' ? t('passwordManager.sortAsc') : t('passwordManager.sortDesc')}
            >
              <ArrowsUpDownIcon className="h-5 w-5" />
            </button>
          </div>
          {canCreate && (
            <button
              onClick={() => {
                setEditingEntry(null);
                setIsCreateSidepaneOpen(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 flex items-center gap-2"
            >
              <PlusIcon className="h-5 w-5" />
              {t('passwordManager.createEntry')}
            </button>
          )}
        </div>
      </div>

      {/* Liste der Einträge */}
      {isLoading ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6 text-center">
          <p className="text-gray-600 dark:text-gray-400">{t('passwordManager.loading')}</p>
        </div>
      ) : filteredAndSortedEntries.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            {searchTerm ? t('passwordManager.noEntries') : t('passwordManager.noEntries')}
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
                    <button
                      onClick={() => handleShowPassword(entry)}
                      className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-1"
                    >
                      <EyeIcon className="h-4 w-4" />
                      {viewingPassword === entry.id ? t('passwordManager.hidePassword') : t('passwordManager.showPassword')}
                    </button>

                    {/* Passwort kopieren */}
                    <button
                      onClick={() => handleCopyPassword(entry)}
                      className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-1"
                    >
                      <ClipboardIcon className="h-4 w-4" />
                      {t('passwordManager.copyPassword')}
                    </button>

                    {/* Öffnen & Passwort kopieren */}
                    {entry.url && (
                      <button
                        onClick={() => handleOpenAndCopy(entry)}
                        className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800 flex items-center gap-1"
                      >
                        <LinkIcon className="h-4 w-4" />
                        {t('passwordManager.openAndCopy')}
                      </button>
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


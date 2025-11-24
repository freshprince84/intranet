import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, CheckIcon, ArrowPathIcon, KeyIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useSidepane } from '../contexts/SidepaneContext.tsx';
import { passwordManagerApi, PasswordEntry, CreatePasswordEntryData, UpdatePasswordEntryData } from '../services/passwordManagerApi.ts';
import { toast } from 'react-toastify';

interface PasswordEntrySidepaneProps {
  isOpen: boolean;
  onClose: () => void;
  entry?: PasswordEntry | null;
  onEntrySaved: (entry: PasswordEntry) => void;
}

const PasswordEntrySidepane: React.FC<PasswordEntrySidepaneProps> = ({ isOpen, onClose, entry, onEntrySaved }) => {
  const { t } = useTranslation();
  const { openSidepane, closeSidepane } = useSidepane();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth > 1070);
  
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [notes, setNotes] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatingPassword, setGeneratingPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | 'veryStrong' | null>(null);

  // Bildschirmgröße überwachen
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 640);
      setIsLargeScreen(window.innerWidth > 1070);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

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

  // Formular-Daten laden (wenn Bearbeitung)
  useEffect(() => {
    if (isOpen) {
      if (entry) {
        setTitle(entry.title || '');
        setUrl(entry.url || '');
        setUsername(entry.username || '');
        setPassword(entry.password || '');
        setNotes(entry.notes || '');
        setShowPassword(false);
      } else {
        // Neuer Eintrag - Formular zurücksetzen
        setTitle('');
        setUrl('');
        setUsername('');
        setPassword('');
        setNotes('');
        setShowPassword(false);
      }
      setError(null);
      setPasswordStrength(null);
    }
  }, [isOpen, entry]);

  // Passwort-Stärke berechnen
  useEffect(() => {
    if (password) {
      calculatePasswordStrength(password);
    } else {
      setPasswordStrength(null);
    }
  }, [password]);

  const calculatePasswordStrength = (pwd: string) => {
    let strength = 0;
    
    if (pwd.length >= 8) strength++;
    if (pwd.length >= 12) strength++;
    if (pwd.length >= 16) strength++;
    if (/[a-z]/.test(pwd)) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength++;
    
    if (strength <= 2) {
      setPasswordStrength('weak');
    } else if (strength <= 4) {
      setPasswordStrength('medium');
    } else if (strength <= 6) {
      setPasswordStrength('strong');
    } else {
      setPasswordStrength('veryStrong');
    }
  };

  const getPasswordStrengthColor = () => {
    switch (passwordStrength) {
      case 'weak': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'strong': return 'bg-blue-500';
      case 'veryStrong': return 'bg-green-500';
      default: return 'bg-gray-300';
    }
  };

  const getPasswordStrengthText = () => {
    switch (passwordStrength) {
      case 'weak': return t('passwordManager.passwordStrengthWeak');
      case 'medium': return t('passwordManager.passwordStrengthMedium');
      case 'strong': return t('passwordManager.passwordStrengthStrong');
      case 'veryStrong': return t('passwordManager.passwordStrengthVeryStrong');
      default: return '';
    }
  };

  // URL-Validierung
  const isValidUrl = (urlString: string): boolean => {
    if (!urlString) return true; // Leere URL ist erlaubt
    
    try {
      const url = new URL(urlString);
      // Nur http:// und https:// erlauben
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  // Passwort generieren
  const handleGeneratePassword = async () => {
    try {
      setGeneratingPassword(true);
      const response = await passwordManagerApi.generatePassword({
        length: 16,
        includeNumbers: true,
        includeSymbols: true
      });
      setPassword(response.password);
      setShowPassword(true);
    } catch (error: any) {
      console.error('Error generating password:', error);
      toast.error(t('passwordManager.error') || 'Fehler beim Generieren des Passworts');
    } finally {
      setGeneratingPassword(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validierung
      if (!title.trim()) {
        setError(t('passwordManager.titleRequired'));
        setLoading(false);
        return;
      }

      if (!password.trim()) {
        setError(t('passwordManager.passwordRequired'));
        setLoading(false);
        return;
      }

      if (url && !isValidUrl(url)) {
        setError(t('passwordManager.urlInvalid'));
        setLoading(false);
        return;
      }

      if (entry) {
        // Update
        const updateData: UpdatePasswordEntryData = {
          title: title.trim(),
          url: url.trim() || undefined,
          username: username.trim() || undefined,
          password: password.trim(),
          notes: notes.trim() || undefined
        };
        
        const updatedEntry = await passwordManagerApi.update(entry.id, updateData);
        onEntrySaved(updatedEntry);
        toast.success(t('passwordManager.editEntry') || 'Eintrag erfolgreich aktualisiert');
      } else {
        // Create
        const createData: CreatePasswordEntryData = {
          title: title.trim(),
          url: url.trim() || undefined,
          username: username.trim() || undefined,
          password: password.trim(),
          notes: notes.trim() || undefined
        };
        
        const newEntry = await passwordManagerApi.create(createData);
        onEntrySaved(newEntry);
        toast.success(t('passwordManager.createEntry') || 'Eintrag erfolgreich erstellt');
      }

      handleClose();
    } catch (error: any) {
      console.error('Error saving password entry:', error);
      setError(error.response?.data?.message || error.message || t('passwordManager.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setUrl('');
    setUsername('');
    setPassword('');
    setNotes('');
    setShowPassword(false);
    setError(null);
    setPasswordStrength(null);
    onClose();
  };

  // Mobile: Modal
  if (isMobile) {
    return (
      <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 flex-shrink-0">
              <Dialog.Title className="text-lg font-semibold dark:text-white">
                {entry ? t('passwordManager.editEntry') : t('passwordManager.createEntry')}
              </Dialog.Title>
              <button
                onClick={handleClose}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 min-h-0">
              {error && (
                <div className="mb-4 p-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('passwordManager.entryTitle')} *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('passwordManager.entryUrl')}
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="https://example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('passwordManager.entryUsername')}
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('passwordManager.entryPassword')} *
                  </label>
                  <div className="mt-1 flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 pr-10 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                      >
                        {showPassword ? (
                          <EyeSlashIcon className="h-5 w-5" />
                        ) : (
                          <EyeIcon className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      disabled={generatingPassword}
                      className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      title={t('passwordManager.generatePassword')}
                    >
                      {generatingPassword ? (
                        <ArrowPathIcon className="h-5 w-5 animate-spin" />
                      ) : (
                        <KeyIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {passwordStrength && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getPasswordStrengthColor()} transition-all duration-300`}
                            style={{ width: passwordStrength === 'weak' ? '25%' : passwordStrength === 'medium' ? '50%' : passwordStrength === 'strong' ? '75%' : '100%' }}
                          />
                        </div>
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {getPasswordStrengthText()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('passwordManager.entryNotes')}
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <div className="relative group">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                      {t('passwordManager.cancel')}
                    </div>
                  </div>
                  <div className="relative group">
                    <button
                      type="submit"
                      className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      disabled={loading}
                    >
                      {loading ? (
                        <ArrowPathIcon className="h-5 w-5 animate-spin" />
                      ) : (
                        <CheckIcon className="h-5 w-5" />
                      )}
                    </button>
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                      {loading ? t('common.saving') : t('passwordManager.save')}
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    );
  }

  // Desktop: Sidepane
  return (
    <>
      {/* Backdrop nur bei <= 1070px */}
      {isOpen && !isLargeScreen && (
        <div 
          className="fixed inset-0 bg-black/10 sidepane-overlay sidepane-backdrop z-40" 
          aria-hidden="true"
          style={{
            opacity: isOpen ? 1 : 0,
            transition: 'opacity 300ms ease-out'
          }}
        />
      )}
      
      {/* Sidepane */}
      <div 
        className={`fixed top-16 bottom-0 right-0 max-w-sm w-full bg-white dark:bg-gray-800 shadow-xl sidepane-panel sidepane-panel-container transform z-50 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{
          transition: 'transform 350ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          pointerEvents: isOpen ? 'auto' : 'none'
        }}
        aria-hidden={!isOpen}
        role="dialog"
        aria-modal={isOpen}
      >
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 flex-shrink-0">
          <h2 className="text-lg font-semibold dark:text-white">
            {entry ? t('passwordManager.editEntry') : t('passwordManager.createEntry')}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 min-h-0">
          {error && (
            <div className="mb-4 p-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('passwordManager.entryTitle')} *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('passwordManager.entryUrl')}
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="https://example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('passwordManager.entryUsername')}
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('passwordManager.entryPassword')} *
              </label>
              <div className="mt-1 flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 pr-10 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  disabled={generatingPassword}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  title={t('passwordManager.generatePassword')}
                >
                  {generatingPassword ? (
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                  ) : (
                    <KeyIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
              {passwordStrength && (
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getPasswordStrengthColor()} transition-all duration-300`}
                        style={{ width: passwordStrength === 'weak' ? '25%' : passwordStrength === 'medium' ? '50%' : passwordStrength === 'strong' ? '75%' : '100%' }}
                      />
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {getPasswordStrengthText()}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('passwordManager.entryNotes')}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <div className="relative group">
                <button
                  type="button"
                  onClick={handleClose}
                  className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                  {t('passwordManager.cancel')}
                </div>
              </div>
              <div className="relative group">
                <button
                  type="submit"
                  className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  disabled={loading}
                >
                  {loading ? (
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                  ) : (
                    <CheckIcon className="h-5 w-5" />
                  )}
                </button>
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                  {loading ? t('common.saving') : t('passwordManager.save')}
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default PasswordEntrySidepane;


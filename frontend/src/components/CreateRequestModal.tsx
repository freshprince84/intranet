import React, { useState, useEffect, useRef } from 'react';
import axiosInstance from '../config/axios.ts'; // Importiere die konfigurierte axios-Instanz
import { useAuth } from '../hooks/useAuth.tsx';
import { API_ENDPOINTS } from '../config/api.ts';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import MarkdownPreview from './MarkdownPreview.tsx';

interface User {
  id: number;
  firstName: string;
  username: string;
  branchId?: number; // Optional, falls in manchen Kontexten nicht verfügbar
}

interface Branch {
  id: number;
  name: string;
}

interface RequestAttachment {
  id?: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath?: string;
  uploadedAt?: string;
  file?: File; // Für temporäre Anhänge vor dem Hochladen
}

interface CreateRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestCreated: () => void;
}

const CreateRequestModal = ({ isOpen, onClose, onRequestCreated }: CreateRequestModalProps) => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    responsible_id: '',
    branch_id: '',
    due_date: '',
    create_todo: false
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const [temporaryAttachments, setTemporaryAttachments] = useState<RequestAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Lade Benutzer und Niederlassungen beim Öffnen des Modals
  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Nicht authentifiziert');
          return;
        }

        console.log('Lade Daten für CreateRequestModal...');
        
        try {
          const [usersResponse, branchesResponse] = await Promise.all([
            axiosInstance.get(API_ENDPOINTS.USERS.DROPDOWN),
            axiosInstance.get(API_ENDPOINTS.BRANCHES.BASE)
          ]);

          console.log('Benutzer geladen:', usersResponse.data.length);
          console.log('Niederlassungen geladen:', branchesResponse.data.length);
          
          setUsers(usersResponse.data || []);
          setBranches(branchesResponse.data || []);

          // Voreinstellungen setzen
          if (user) {
            // 1. Verantwortlicher: Aktueller Benutzer
            setFormData(prevData => ({ 
              ...prevData, 
              responsible_id: user.id.toString() 
            }));

            // 2. Niederlassung: Aktuell gewählte Niederlassung des Benutzers
            // Fallback: erste verfügbare Niederlassung verwenden
            if (branchesResponse.data && branchesResponse.data.length > 0) {
              // Wir versuchen, die vom Benutzer zuletzt genutzte Niederlassung zu verwenden
              // Falls nicht verfügbar, verwenden wir die erste Niederlassung
              const userBranch = branchesResponse.data[0]?.id.toString();
              setFormData(prevData => ({ 
                ...prevData, 
                branch_id: userBranch 
              }));
            }

            // 3. Fälligkeitsdatum: Datum "jetzt + 2 Wochen"
            const twoWeeksFromNow = new Date();
            twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);
            const formattedDate = twoWeeksFromNow.toISOString().split('T')[0]; // Format: YYYY-MM-DD
            setFormData(prevData => ({ 
              ...prevData, 
              due_date: formattedDate 
            }));
          }
        } catch (err) {
          console.error('Fehler beim Laden der Daten:', err);
          
          // Einfachere Fehlerbehandlung ohne axios-Import
          const axiosError = err as any;
          if (axiosError.code === 'ERR_NETWORK') {
            setError('Verbindung zum Server konnte nicht hergestellt werden. Bitte stellen Sie sicher, dass der Server läuft.');
          } else {
            setError(`Fehler beim Laden der Daten: ${axiosError.response?.data?.message || axiosError.message}`);
          }
        }
      } catch (err) {
        console.error('Unerwarteter Fehler:', err);
        setError('Ein unerwarteter Fehler ist aufgetreten');
      }
    };

    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  // Überprüfung der Bildschirmgröße
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    // Initial prüfen
    checkScreenSize();
    
    // Event-Listener für Größenänderungen
    window.addEventListener('resize', checkScreenSize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  // Formatiere den Benutzernamen (erstes Wort vom Vornamen + erstes Wort vom Benutzernamen)
  const formatUserName = (user: User) => {
    const firstName = user.firstName?.split(' ')[0];
    const username = user.username?.split(' ')[0];
    
    // Wenn kein firstName vorhanden ist, nur username anzeigen
    if (!firstName) {
      return username || 'Unbekannt';
    }
    
    // Standard: firstName (username)
    return `${firstName} (${username})`;
  };

  const handlePaste = async (event: React.ClipboardEvent) => {
    const items = event.clipboardData.items;
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      // Prüfen, ob das eingefügte Element ein Bild ist
      if (item.type.indexOf('image') === 0) {
        event.preventDefault(); // Standardeingabe verhindern
        
        const file = item.getAsFile();
        if (file) {
          await handleTemporaryAttachment(file);
        }
        return;
      }
    }
  };

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      await handleTemporaryAttachment(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleTemporaryAttachment = async (file: File) => {
    setUploading(true);
    setError(null);

    try {
      // Erstelle einen temporären Anhang
      const newAttachment: RequestAttachment = {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        file: file // Speichern der Datei für späteren Upload
      };
      
      setTemporaryAttachments(prev => [...prev, newAttachment]);

      // Füge einen Link/Vorschau in die Beschreibung ein
      let insertText = '';
      if (file.type.startsWith('image/')) {
        // Hinweis: Wir verwenden hier den Platzhalter, da die Datei erst nach dem Erstellen hochgeladen wird
        // Die tatsächliche URL wird nach dem erfolgreichen Upload im Backend gesetzt
        insertText = `\n![${file.name}](wird nach dem Erstellen hochgeladen)\n`;
      } else {
        // Für andere Dateien einen temporären Platzhalter
        insertText = `\n[${file.name}](wird nach dem Erstellen hochgeladen)\n`;
      }
      
      // Füge den Link an der aktuellen Cursorposition ein
      if (textareaRef.current) {
        const cursorPos = textareaRef.current.selectionStart;
        const textBefore = formData.description.substring(0, cursorPos);
        const textAfter = formData.description.substring(cursorPos);
        
        setFormData({
          ...formData,
          description: textBefore + insertText + textAfter
        });
        
        // Setze den Cursor hinter den eingefügten Link
        setTimeout(() => {
          if (textareaRef.current) {
            const newPos = cursorPos + insertText.length;
            textareaRef.current.selectionStart = newPos;
            textareaRef.current.selectionEnd = newPos;
            textareaRef.current.focus();
          }
        }, 0);
      } else {
        setFormData({
          ...formData,
          description: formData.description + insertText
        });
      }
    } catch (err) {
      console.error('Fehler beim Verarbeiten der Datei:', err);
      // Einfachere Fehlerbehandlung ohne axios-Import
      const axiosError = err as any;
      setError(axiosError.response?.data?.message || axiosError.message || 'Ein unerwarteter Fehler ist aufgetreten');
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    await handleTemporaryAttachment(file);
    
    // Zurücksetzen des Datei-Inputs
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveTemporaryAttachment = (index: number) => {
    // Hole den zu entfernenden Anhang
    const attachmentToRemove = temporaryAttachments[index];
    
    if (attachmentToRemove) {
      // Entferne den Anhang aus der Liste
      setTemporaryAttachments(prev => prev.filter((_, i) => i !== index));
      
      // Entferne auch den Anhang aus der Beschreibung
      if (attachmentToRemove.fileName) {
        // Je nach Dateityp können verschiedene Markdown-Formate in der Beschreibung sein
        const imagePattern = new RegExp(`!\\[${attachmentToRemove.fileName}\\]\\(wird nach dem Erstellen hochgeladen\\)`, 'g');
        const linkPattern = new RegExp(`\\[${attachmentToRemove.fileName}\\]\\(wird nach dem Erstellen hochgeladen\\)`, 'g');
        
        // Ersetze alle Vorkommen durch leeren Text
        const newDescription = formData.description
          .replace(imagePattern, '')
          .replace(linkPattern, '')
          // Entferne überschüssige Leerzeilen, die durch das Entfernen entstehen könnten
          .replace(/\n{3,}/g, '\n\n');
        
        setFormData({
          ...formData,
          description: newDescription
        });
      }
    }
  };

  const uploadTemporaryAttachments = async (requestId: number) => {
    if (temporaryAttachments.length === 0) return;
    
    try {
      setLoading(true);
      
      // Upload jeder temporären Datei
      for (const attachment of temporaryAttachments) {
        if (!attachment.file) continue;
        
        const formData = new FormData();
        formData.append('file', attachment.file);
        
        await axiosInstance.post(
          API_ENDPOINTS.REQUESTS.ATTACHMENTS(requestId),
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );
      }
      
      console.log(`${temporaryAttachments.length} Anhänge erfolgreich hochgeladen.`);
    } catch (err) {
      console.error('Fehler beim Hochladen der Anhänge:', err);
      // Wir zeigen hier keinen Fehler, da der Request bereits erstellt wurde
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Nicht authentifiziert');
      if (!user?.id) throw new Error('Benutzer-ID nicht gefunden');

      // Validiere die IDs
      const responsibleId = parseInt(formData.responsible_id);
      const branchId = parseInt(formData.branch_id);

      if (isNaN(responsibleId) || isNaN(branchId)) {
        throw new Error('Ungültige ID-Werte für Verantwortlichen oder Niederlassung');
      }

      const response = await axiosInstance.post(API_ENDPOINTS.REQUESTS.BASE, 
        {
          title: formData.title,
          description: formData.description || '',
          responsible_id: responsibleId,
          branch_id: branchId,
          requested_by_id: user.id,
          due_date: formData.due_date || null,
          create_todo: formData.create_todo,
          status: 'approval'
        }
      );

      if (response.status !== 201) {
        throw new Error('Fehler beim Erstellen des Requests');
      }

      // Lade temporäre Anhänge hoch, falls vorhanden
      await uploadTemporaryAttachments(response.data.id);

      onRequestCreated();
      onClose();
      setFormData({
        title: '',
        description: '',
        responsible_id: '',
        branch_id: '',
        due_date: '',
        create_todo: false
      });
      setTemporaryAttachments([]);
    } catch (err) {
      console.error('Create Request Error:', err);
      // Einfachere Fehlerbehandlung ohne axios-Import
      const axiosError = err as any;
      setError(axiosError.response?.data?.message || axiosError.message || 'Fehler beim Erstellen des Requests');
    } finally {
      setLoading(false);
    }
  };

  const renderTemporaryAttachments = () => {
    if (temporaryAttachments.length === 0) return null;
    
    return (
      <div className="mt-2">
        <ul className="flex flex-wrap gap-2">
          {temporaryAttachments.map((attachment, index) => (
            <li key={index} className="inline-flex items-center bg-gray-100 rounded-md px-2 py-1 relative group">
              <span className="text-sm font-medium text-gray-800">
                {attachment.fileName}
              </span>
              <div className="flex ml-2">
                <button
                  type="button"
                  onClick={() => handleRemoveTemporaryAttachment(index)}
                  className="text-red-600 hover:text-red-900 ml-1"
                  title="Entfernen"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {/* Tooltip für Bildvorschau bei Bild-Dateien */}
              {attachment.fileType.startsWith('image/') && attachment.file && (
                <div className="absolute z-10 invisible group-hover:visible bg-white p-2 rounded-md shadow-lg -top-32 left-0 border border-gray-200">
                  <img 
                    src={URL.createObjectURL(attachment.file)}
                    alt={attachment.fileName}
                    className="max-w-[200px] max-h-[150px] object-contain"
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  if (!isOpen) return null;

  // Für Mobile (unter 640px) - klassisches Modal
  if (isMobile) {
    return (
      <Dialog open={isOpen} onClose={onClose} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <Dialog.Title className="text-lg font-semibold dark:text-white">
                Neuer Request
              </Dialog.Title>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-4">
              {error && (
                <div className="mb-4 p-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Titel</label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="description_request_create" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Beschreibung
                  </label>
                  <div className="relative">
                    <textarea
                      ref={textareaRef}
                      id="description_request_create"
                      rows={6}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      onPaste={handlePaste}
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      placeholder="Text, Bilder oder Dateien hier einfügen..."
                    />
                    {/* Heftklammer-Icon zum Hinzufügen von Dateien */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-2 left-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400 focus:outline-none"
                      title="Datei hinzufügen"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    {uploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-800 bg-opacity-70 dark:bg-opacity-70">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Wird hochgeladen...</span>
                      </div>
                    )}
                  </div>
                  {renderTemporaryAttachments()}
                  {formData.description && (
                    <div className="mt-3">
                      <MarkdownPreview 
                        content={formData.description} 
                        temporaryAttachments={temporaryAttachments}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Verantwortlicher</label>
                  <select
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm"
                    value={formData.responsible_id}
                    onChange={(e) => setFormData({ ...formData, responsible_id: e.target.value })}
                  >
                    <option value="">Bitte wählen...</option>
                    {Array.isArray(users) && users.map(user => (
                      <option key={user.id} value={user.id}>
                        {formatUserName(user)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Niederlassung</label>
                  <select
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm"
                    value={formData.branch_id}
                    onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                  >
                    <option value="">Bitte wählen...</option>
                    {Array.isArray(branches) && branches.map(branch => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fälligkeitsdatum</label>
                  <input
                    type="date"
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="create_todo"
                    className="rounded border-gray-300 text-blue-600 dark:bg-gray-700 dark:text-gray-300"
                    checked={formData.create_todo}
                    onChange={(e) => setFormData({ ...formData, create_todo: e.target.checked })}
                  />
                  <label htmlFor="create_todo" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Todo automatisch erstellen
                  </label>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="mr-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-800"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-800 rounded-md hover:bg-blue-700 dark:hover:bg-blue-900"
                    disabled={loading}
                  >
                    {loading ? 'Wird erstellt...' : 'Erstellen'}
                  </button>
                </div>
              </form>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    );
  }

  // Für Desktop (ab 640px) - Sidepane
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      {/* Semi-transparenter Hintergrund für den Rest der Seite */}
      <div 
        className="fixed inset-0 bg-black/10 transition-opacity" 
        aria-hidden="true" 
        onClick={onClose}
      />
      
      {/* Sidepane von rechts einfahren */}
      <div 
        className={`fixed inset-y-0 right-0 max-w-sm w-full bg-white dark:bg-gray-800 shadow-xl transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <Dialog.Title className="text-lg font-semibold dark:text-white">
            Neuer Request
          </Dialog.Title>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto h-full">
          {error && (
            <div className="mb-4 p-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Titel</label>
              <input
                type="text"
                required
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="description_request_create" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Beschreibung
              </label>
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  id="description_request_create"
                  rows={6}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  onPaste={handlePaste}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  placeholder="Text, Bilder oder Dateien hier einfügen..."
                />
                {/* Heftklammer-Icon zum Hinzufügen von Dateien */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-2 left-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400 focus:outline-none"
                  title="Datei hinzufügen"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-800 bg-opacity-70 dark:bg-opacity-70">
                    <span className="text-sm text-gray-600 dark:text-gray-300">Wird hochgeladen...</span>
                  </div>
                )}
              </div>
              {renderTemporaryAttachments()}
              {formData.description && (
                <div className="mt-3">
                  <MarkdownPreview 
                    content={formData.description} 
                    temporaryAttachments={temporaryAttachments}
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Verantwortlicher</label>
              <select
                required
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm"
                value={formData.responsible_id}
                onChange={(e) => setFormData({ ...formData, responsible_id: e.target.value })}
              >
                <option value="">Bitte wählen...</option>
                {Array.isArray(users) && users.map(user => (
                  <option key={user.id} value={user.id}>
                    {formatUserName(user)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Niederlassung</label>
              <select
                required
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm"
                value={formData.branch_id}
                onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
              >
                <option value="">Bitte wählen...</option>
                {Array.isArray(branches) && branches.map(branch => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fälligkeitsdatum</label>
              <input
                type="date"
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="create_todo_sidepane"
                className="rounded border-gray-300 text-blue-600 dark:bg-gray-700 dark:text-gray-300"
                checked={formData.create_todo}
                onChange={(e) => setFormData({ ...formData, create_todo: e.target.checked })}
              />
              <label htmlFor="create_todo_sidepane" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                Todo automatisch erstellen
              </label>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={onClose}
                className="mr-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-800"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-800 rounded-md hover:bg-blue-700 dark:hover:bg-blue-900"
                disabled={loading}
              >
                {loading ? 'Wird erstellt...' : 'Erstellen'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Dialog>
  );
};

export default CreateRequestModal; 
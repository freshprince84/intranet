import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios'; // Für type checking
import axiosInstance from '../config/axios.ts'; // Importiere die konfigurierte axios-Instanz
import { useAuth } from '../hooks/useAuth.tsx';
import { API_ENDPOINTS } from '../config/api.ts';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

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
            axiosInstance.get(API_ENDPOINTS.USERS.BASE),
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
          
          if (axios.isAxiosError(err)) {
            if (err.code === 'ERR_NETWORK') {
              setError('Verbindung zum Server konnte nicht hergestellt werden. Bitte stellen Sie sicher, dass der Server läuft.');
            } else {
              setError(`Fehler beim Laden der Daten: ${err.response?.data?.message || err.message}`);
            }
          } else {
            setError('Ein unerwarteter Fehler ist aufgetreten');
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
    const firstName = user.firstName.split(' ')[0];
    const username = user.username.split(' ')[0];
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
        // Für Bilder einen temporären Platzhalter einfügen
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
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || err.message);
      } else {
        setError('Ein unerwarteter Fehler ist aufgetreten');
      }
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
    setTemporaryAttachments(prev => prev.filter((_, i) => i !== index));
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
      setError(err instanceof Error ? err.message : 'Fehler beim Erstellen des Requests');
    } finally {
      setLoading(false);
    }
  };

  const renderTemporaryAttachments = () => {
    if (temporaryAttachments.length === 0) return null;
    
    return (
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700">Temporäre Anhänge</h3>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Datei hinzufügen
          </button>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
        <ul className="divide-y divide-gray-200">
          {temporaryAttachments.map((attachment, index) => (
            <li key={index} className="py-3 flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-900">
                  {attachment.fileName}
                </span>
                <span className="ml-2 text-sm text-gray-500">
                  ({Math.round(attachment.fileSize / 1024)} KB)
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveTemporaryAttachment(index)}
                className="text-red-600 hover:text-red-900"
              >
                Entfernen
              </button>
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
          <Dialog.Panel className="mx-auto max-w-xl w-full bg-white rounded-lg shadow-xl">
            <div className="flex items-center justify-between p-4 border-b">
              <Dialog.Title className="text-lg font-semibold">
                Neuer Request
              </Dialog.Title>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-4">
              {error && (
                <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Titel</label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Beschreibung</label>
                  <div className="relative">
                    <textarea
                      ref={textareaRef}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      onPaste={handlePaste}
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      placeholder="Text, Bilder oder Dateien hier einfügen..."
                    />
                    {uploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70">
                        <span className="text-sm text-gray-600">Wird verarbeitet...</span>
                      </div>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Tipp: Bilder können direkt per Copy & Paste oder Drag & Drop eingefügt werden!
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Verantwortlicher</label>
                  <select
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
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
                  <label className="block text-sm font-medium text-gray-700">Niederlassung</label>
                  <select
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
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
                  <label className="block text-sm font-medium text-gray-700">Fälligkeitsdatum</label>
                  <input
                    type="date"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="create_todo"
                    className="rounded border-gray-300 text-blue-600"
                    checked={formData.create_todo}
                    onChange={(e) => setFormData({ ...formData, create_todo: e.target.checked })}
                  />
                  <label htmlFor="create_todo" className="ml-2 block text-sm text-gray-700">
                    Todo automatisch erstellen
                  </label>
                </div>

                {renderTemporaryAttachments()}

                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="mr-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
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
        className={`fixed inset-y-0 right-0 max-w-sm w-full bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <Dialog.Title className="text-lg font-semibold">
            Neuer Request
          </Dialog.Title>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto h-full">
          {error && (
            <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Titel</label>
              <input
                type="text"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Beschreibung</label>
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  onPaste={handlePaste}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  placeholder="Text, Bilder oder Dateien hier einfügen..."
                />
                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70">
                    <span className="text-sm text-gray-600">Wird verarbeitet...</span>
                  </div>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Tipp: Bilder können direkt per Copy & Paste oder Drag & Drop eingefügt werden!
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Verantwortlicher</label>
              <select
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
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
              <label className="block text-sm font-medium text-gray-700">Niederlassung</label>
              <select
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
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
              <label className="block text-sm font-medium text-gray-700">Fälligkeitsdatum</label>
              <input
                type="date"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="create_todo_sidepane"
                className="rounded border-gray-300 text-blue-600"
                checked={formData.create_todo}
                onChange={(e) => setFormData({ ...formData, create_todo: e.target.checked })}
              />
              <label htmlFor="create_todo_sidepane" className="ml-2 block text-sm text-gray-700">
                Todo automatisch erstellen
              </label>
            </div>

            {renderTemporaryAttachments()}

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={onClose}
                className="mr-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
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
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import axiosInstance from '../config/axios.ts';
import { API_ENDPOINTS } from '../config/api.ts';
import { useAuth } from '../hooks/useAuth.tsx';
import { usePermissions } from '../hooks/usePermissions.ts';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface EditRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestUpdated: () => void;
  request: {
    id: number;
    title: string;
    description?: string;
    responsible: {
      id: number;
    };
    branch: {
      id: number;
    };
    dueDate: string | null;
    createTodo: boolean;
    attachments?: RequestAttachment[];
  };
}

interface User {
  id: number;
  firstName: string;
  username: string;
}

interface Branch {
  id: number;
  name: string;
}

interface RequestAttachment {
  id: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  uploadedAt: string;
}

const EditRequestModal = ({
  isOpen,
  onClose,
  onRequestUpdated,
  request
}: EditRequestModalProps) => {
  const { user } = useAuth();
  const [title, setTitle] = useState(request.title);
  const [description, setDescription] = useState(request.description || '');
  const [responsibleId, setResponsibleId] = useState(request.responsible.id);
  const [branchId, setBranchId] = useState(request.branch.id);
  const [dueDate, setDueDate] = useState(request.dueDate ? request.dueDate.split('T')[0] : '');
  const [createTodo, setCreateTodo] = useState(request.createTodo);
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const [attachments, setAttachments] = useState<RequestAttachment[]>(request.attachments || []);
  const [uploading, setUploading] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { hasPermission } = usePermissions();
  const canDeleteRequest = hasPermission('requests', 'both', 'table');

  // Responsive Design: Überwache Fensterbreite
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 640);
    };

    // Initialer Check
    checkScreenSize();

    // Event Listener für Größenänderungen
    window.addEventListener('resize', checkScreenSize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchData();
      fetchAttachments();
    }
  }, [isOpen]);

  const fetchData = async () => {
    try {
      setError(null);
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Nicht authentifiziert');
        return;
      }

      const [usersResponse, branchesResponse] = await Promise.all([
        axiosInstance.get(API_ENDPOINTS.USERS.BASE),
        axiosInstance.get(API_ENDPOINTS.BRANCHES.BASE)
      ]);

      setUsers(usersResponse.data || []);
      setBranches(branchesResponse.data || []);
    } catch (err) {
      console.error('Unerwarteter Fehler:', err);
      
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
  };

  const fetchAttachments = async () => {
    try {
      setError(null);
      const response = await axiosInstance.get(API_ENDPOINTS.REQUESTS.ATTACHMENTS(request.id));
      setAttachments(response.data || []);
    } catch (err) {
      console.error('Fehler beim Laden der Anhänge:', err);
      // Setze eine leere Anhangliste im Fehlerfall, damit die Komponente nicht abstürzt
      setAttachments([]);
      
      // Zeige einen benutzerfreundlichen Fehler an, aber lass die Komponente weiterlaufen
      if (axios.isAxiosError(err)) {
        const errorMessage = err.response?.data?.message || err.message;
        console.warn(`Anhänge konnten nicht geladen werden: ${errorMessage}`);
        // Setze keinen Fehler in state, damit der Dialog trotzdem nutzbar bleibt
        // Nur Warnung in der Konsole
      } else {
        console.warn('Ein unerwarteter Fehler ist beim Laden der Anhänge aufgetreten');
      }
    }
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
          await uploadFileAndInsertLink(file);
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
      await uploadFileAndInsertLink(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const uploadFileAndInsertLink = async (file: File) => {
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axiosInstance.post(
        API_ENDPOINTS.REQUESTS.ATTACHMENTS(request.id),
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      const newAttachment = response.data;
      setAttachments([...attachments, newAttachment]);

      // Füge einen Link/Vorschau in die Beschreibung ein
      let insertText = '';
      if (newAttachment.fileType.startsWith('image/')) {
        // Für Bilder einen Markdown-Image-Link einfügen
        insertText = `\n![${newAttachment.fileName}](${API_ENDPOINTS.REQUESTS.ATTACHMENT(request.id, newAttachment.id)})\n`;
      } else {
        // Für andere Dateien einen normalen Link
        insertText = `\n[${newAttachment.fileName}](${API_ENDPOINTS.REQUESTS.ATTACHMENT(request.id, newAttachment.id)})\n`;
      }
      
      // Füge den Link an der aktuellen Cursorposition ein
      if (textareaRef.current) {
        const cursorPos = textareaRef.current.selectionStart;
        const textBefore = description.substring(0, cursorPos);
        const textAfter = description.substring(cursorPos);
        
        setDescription(textBefore + insertText + textAfter);
        
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
        setDescription(description + insertText);
      }
    } catch (err) {
      console.error('Fehler beim Hochladen der Datei:', err);
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
    await uploadFileAndInsertLink(file);
    
    // Zurücksetzen des Datei-Inputs
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    try {
      setError(null);
      await axiosInstance.delete(API_ENDPOINTS.REQUESTS.ATTACHMENT(request.id, attachmentId));
      setAttachments(attachments.filter(attachment => attachment.id !== attachmentId));
    } catch (err) {
      console.error('Fehler beim Löschen des Anhangs:', err);
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || err.message);
      } else {
        setError('Ein unerwarteter Fehler ist aufgetreten');
      }
    }
  };

  const handleDownloadAttachment = async (attachment: RequestAttachment) => {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.REQUESTS.ATTACHMENT(request.id, attachment.id),
        { responseType: 'blob' }
      );
      
      // Blob-URL erstellen und Download auslösen
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', attachment.fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Fehler beim Herunterladen des Anhangs:', err);
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || err.message);
      } else {
        setError('Ein unerwarteter Fehler ist aufgetreten');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      // Validiere die IDs
      const requestId = request.id;
      const validResponsibleId = Number(responsibleId);
      const validBranchId = Number(branchId);

      if (isNaN(validResponsibleId) || isNaN(validBranchId)) {
        throw new Error('Ungültige ID-Werte für Verantwortlichen oder Niederlassung');
      }

      await axiosInstance.put(
        API_ENDPOINTS.REQUESTS.BY_ID(requestId),
        {
          title,
          description,
          responsible_id: validResponsibleId,
          branch_id: validBranchId,
          due_date: dueDate || null,
          create_todo: createTodo
        }
      );

      onRequestUpdated();
      onClose();
    } catch (err) {
      console.error('Update Error:', err);
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || err.message);
      } else {
        setError('Ein unerwarteter Fehler ist aufgetreten');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    
    try {
      setLoading(true);
      
      await axiosInstance.delete(API_ENDPOINTS.REQUESTS.BY_ID(request.id));

      onRequestUpdated();
      onClose();
    } catch (err) {
      console.error('Delete Error:', err);
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || err.message);
      } else {
        setError('Ein unerwarteter Fehler ist aufgetreten');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderAttachments = () => (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-700">Anhänge</h3>
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
      {attachments.length > 0 ? (
        <ul className="divide-y divide-gray-200">
          {attachments.map((attachment) => (
            <li key={attachment.id} className="py-3 flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-900">
                  {attachment.fileName}
                </span>
                <span className="ml-2 text-sm text-gray-500">
                  ({Math.round(attachment.fileSize / 1024)} KB)
                </span>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => handleDownloadAttachment(attachment)}
                  className="text-blue-600 hover:text-blue-900 mr-3"
                >
                  Herunterladen
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteAttachment(attachment.id)}
                  className="text-red-600 hover:text-red-900"
                >
                  Entfernen
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">Keine Anhänge vorhanden.</p>
      )}
    </div>
  );

  if (!isOpen) return null;

  const renderForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Titel</label>
        <input
          type="text"
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Beschreibung</label>
        <div className="relative">
          <textarea
            ref={textareaRef}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onPaste={handlePaste}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            placeholder="Text, Bilder oder Dateien hier einfügen..."
          />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70">
              <span className="text-sm text-gray-600">Wird hochgeladen...</span>
            </div>
          )}
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Tipp: Bilder können direkt per Copy & Paste oder Drag & Drop eingefügt werden!
        </p>
      </div>

      {/* Attachments-Bereich */}
      {renderAttachments()}

      <div>
        <label className="block text-sm font-medium text-gray-700">Verantwortlicher</label>
        <select
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          value={responsibleId}
          onChange={(e) => setResponsibleId(Number(e.target.value))}
        >
          {users.map(user => (
            <option key={user.id} value={user.id}>
              {user.firstName} {user.username ? `(${user.username})` : ''}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Niederlassung</label>
        <select
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          value={branchId}
          onChange={(e) => setBranchId(Number(e.target.value))}
        >
          {branches.map(branch => (
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
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="create_todo"
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          checked={createTodo}
          onChange={(e) => setCreateTodo(e.target.checked)}
        />
        <label htmlFor="create_todo" className="ml-2 block text-sm text-gray-700">
          Todo automatisch erstellen
        </label>
      </div>

      <div className="flex justify-between">
        {canDeleteRequest && (
          <button
            type="button"
            onClick={handleDelete}
            className={`px-4 py-2 text-sm font-medium ${
              confirmDelete ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700'
            } rounded-md`}
          >
            {confirmDelete ? 'Bestätigen' : 'Löschen'}
          </button>
        )}
        <div className="flex space-x-2 ml-auto">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
            disabled={loading}
          >
            Abbrechen
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? 'Wird gespeichert...' : 'Speichern'}
          </button>
        </div>
      </div>
    </form>
  );

  // Für Mobile (unter 640px) - klassisches Modal
  if (isMobile) {
    return (
      <Dialog open={isOpen} onClose={onClose} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-xl w-full bg-white rounded-lg shadow-xl">
            <div className="flex items-center justify-between p-4 border-b">
              <Dialog.Title className="text-lg font-semibold">
                Request bearbeiten
              </Dialog.Title>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[calc(100vh-150px)]">
              {error && (
                <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
                  {error}
                </div>
              )}
              {renderForm()}
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
            Request bearbeiten
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

          {renderForm()}
        </div>
      </div>
    </Dialog>
  );
};

export default EditRequestModal; 
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../config/axios.ts';
import { API_ENDPOINTS, getRequestAttachmentUrl } from '../config/api.ts';
import { useAuth } from '../hooks/useAuth.tsx';
import { usePermissions } from '../hooks/usePermissions.ts';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, TrashIcon, CheckIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import MarkdownPreview from './MarkdownPreview.tsx';
import { useSidepane } from '../contexts/SidepaneContext.tsx';

interface Request {
  id: number;
  title: string;
  status: 'approval' | 'approved' | 'to_improve' | 'denied';
  type?: 'vacation' | 'improvement_suggestion' | 'sick_leave' | 'employment_certificate' | 'other';
  isPrivate?: boolean;
  requestedBy: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
  };
  responsible: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
  };
  branch: {
    id: number;
    name: string;
  };
  dueDate: string;
  createTodo: boolean;
  description?: string;
  attachments?: RequestAttachment[];
}

interface EditRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestUpdated: (updatedRequest: Request) => void;
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
  id?: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath?: string;
  uploadedAt?: string;
  file?: File; // Für temporäre Anhänge vor dem Hochladen
}

const EditRequestModal = ({
  isOpen,
  onClose,
  onRequestUpdated,
  request
}: EditRequestModalProps) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  
  // Entferne Bild-Markdown-Links aus der Beschreibung (für Textarea-Anzeige)
  const removeImageMarkdown = (text: string): string => {
    if (!text) return '';
    // Entferne alle Bild-Markdown-Links: ![alt](url)
    return text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '').trim();
  };
  
  // Debug: Log aktuelle Sprache und verfügbare Übersetzungen
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('EditRequestModal - Aktuelle Sprache:', i18n.language);
      console.log('EditRequestModal - Verfügbare Sprachen:', i18n.languages);
      console.log('EditRequestModal - createRequest.editRequest.title:', t('createRequest.editRequest.title'));
      console.log('EditRequestModal - createRequest.editRequest.form.title:', t('createRequest.editRequest.form.title'));
    }
  }, [i18n.language, t]);
  const { openSidepane, closeSidepane } = useSidepane();
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth > 1070);
  const [title, setTitle] = useState(request.title);
  const [description, setDescription] = useState(removeImageMarkdown(request.description || ''));
  const [responsibleId, setResponsibleId] = useState(request.responsible.id);
  const [branchId, setBranchId] = useState(request.branch.id);
  const [type, setType] = useState<'vacation' | 'improvement_suggestion' | 'sick_leave' | 'employment_certificate' | 'other'>(request.type || 'other');
  const [isPrivate, setIsPrivate] = useState(request.isPrivate || false);
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
  const [temporaryAttachments, setTemporaryAttachments] = useState<RequestAttachment[]>([]);
  // Liste der während der Bearbeitung hochgeladenen Attachments (für Cleanup bei Abbrechen)
  const [uploadedDuringEdit, setUploadedDuringEdit] = useState<number[]>([]);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // ✅ MEMORY LEAK FIX: Track Blob-URLs für Cleanup
  const blobUrlsRef = useRef<Set<string>>(new Set());
  
  const { hasPermission } = usePermissions();
  const canDeleteRequest = hasPermission('requests', 'both', 'table');

  // Cleanup: Lösche hochgeladene Attachments wenn Modal ohne Speichern geschlossen wird
  useEffect(() => {
    if (!isOpen && uploadedDuringEdit.length > 0) {
      // Modal wurde geschlossen - lösche alle während der Bearbeitung hochgeladenen Attachments
      const cleanup = async () => {
        for (const attachmentId of uploadedDuringEdit) {
          try {
            await axiosInstance.delete(API_ENDPOINTS.REQUESTS.ATTACHMENT(request.id, attachmentId));
            console.log(`Attachment ${attachmentId} gelöscht (Modal ohne Speichern geschlossen)`);
          } catch (err) {
            console.error(`Fehler beim Löschen von Attachment ${attachmentId}:`, err);
          }
        }
        setUploadedDuringEdit([]);
      };
      cleanup();
    }
  }, [isOpen, uploadedDuringEdit, request.id]);

  // Responsive Design: Überwache Fensterbreite
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 640);
      setIsLargeScreen(window.innerWidth > 1070);
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

  // ✅ MEMORY LEAK FIX: Cleanup Blob-URLs beim Unmount
  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach(url => {
        URL.revokeObjectURL(url);
      });
      blobUrlsRef.current.clear();
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

  useEffect(() => {
    if (isOpen) {
      fetchData();
      fetchAttachments();
      // Aktualisiere State wenn Request-Props sich ändern
      setTitle(request.title);
      setDescription(removeImageMarkdown(request.description || ''));
      setResponsibleId(request.responsible.id);
      setBranchId(request.branch.id);
      setType((request as any).type || 'other');
      setIsPrivate((request as any).isPrivate || false);
      setDueDate(request.dueDate ? request.dueDate.split('T')[0] : '');
      setCreateTodo(request.createTodo);
    }
  }, [isOpen, request]);

  const fetchData = async () => {
    try {
      setError(null);
      const token = localStorage.getItem('token');
      if (!token) {
        setError(t('createRequest.editRequest.errors.notAuthenticated'));
        return;
      }

      const [usersResponse, branchesResponse] = await Promise.all([
        axiosInstance.get(API_ENDPOINTS.USERS.DROPDOWN),
        axiosInstance.get(API_ENDPOINTS.BRANCHES.BASE)
      ]);

      setUsers(usersResponse.data || []);
      setBranches(branchesResponse.data || []);
    } catch (err) {
      console.error('Unerwarteter Fehler:', err);
      
      // Einfachere Fehlerbehandlung ohne axios-Import
      const axiosError = err as any;
      if (axiosError.code === 'ERR_NETWORK') {
        setError(t('createRequest.editRequest.errors.connectionError'));
      } else {
        setError(`${t('createRequest.editRequest.errors.loadError')}: ${axiosError.response?.data?.message || axiosError.message}`);
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
      // Einfachere Fehlerbehandlung ohne axios-Import
      const axiosError = err as any;
      const errorMessage = axiosError.response?.data?.message || axiosError.message;
      console.warn(`Anhänge konnten nicht geladen werden: ${errorMessage}`);
      // Setze keinen Fehler in state, damit der Dialog trotzdem nutzbar bleibt
      // Nur Warnung in der Konsole
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
      // Bei Edit-Modals sofort hochladen (wie bei Tasks)
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
      // Merke diese Attachment-ID für mögliches Cleanup
      setUploadedDuringEdit(prev => [...prev, newAttachment.id]);

      // Für Bilder: KEIN Markdown-Link ins Textarea einfügen (wird beim Speichern automatisch hinzugefügt)
      // Für andere Dateien: Link ins Textarea einfügen
      if (!newAttachment.fileType.startsWith('image/')) {
        const insertText = `\n[${newAttachment.fileName}](${getRequestAttachmentUrl(request.id, newAttachment.id)})\n`;
        
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
      }

      // Erstelle ein Element für das Vorschaubild und füge es dem Dokument hinzu
      const img = document.createElement('img');
      img.src = getRequestAttachmentUrl(request.id, newAttachment.id);
      img.alt = newAttachment.fileName;
      img.classList.add('hidden'); // Verstecken

      document.body.appendChild(img);

      // Warte bis das Bild geladen ist und bestimme dann seine Dimensionen
      img.onload = () => {
        document.body.removeChild(img);

        // Je nach Größe entscheide, ob ein großes oder kleines Bild eingefügt wird
      }
    } catch (err) {
      console.error('Fehler beim Hochladen der Datei:', err);
      // Einfachere Fehlerbehandlung ohne axios-Import
      const axiosError = err as any;
      setError(axiosError.response?.data?.message || axiosError.message || t('createRequest.editRequest.errors.unknownError'));
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    // Bei Edit-Modals sofort hochladen (wie bei Tasks)
    await uploadFileAndInsertLink(file);
    
    // Zurücksetzen des Datei-Inputs
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    try {
      setError(null);
      
      // Finde den zu entfernenden Anhang
      const attachmentToRemove = attachments.find(a => a.id === attachmentId);
      
      if (attachmentToRemove) {
        await axiosInstance.delete(API_ENDPOINTS.REQUESTS.ATTACHMENT(request.id, attachmentId));
        
        // Entferne den Anhang aus der Liste
        setAttachments(attachments.filter(attachment => attachment.id !== attachmentId));
        
        // Entferne auch die Verweise im Beschreibungstext
        if (attachmentToRemove.fileName) {
          // Erzeuge URL-Muster für diesen Anhang
          const escapedFileName = attachmentToRemove.fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          
          // Suche nach Bild- und Link-Markdown
          const imagePattern = new RegExp(`!\\[(.*?)\\]\\(${escapedFileName}\\)`, 'g');
          const linkPattern = new RegExp(`\\[(.*?)\\]\\(${escapedFileName}\\)`, 'g');
          
          // Bereinige die Beschreibung
          const newDescription = description
            .replace(imagePattern, '')
            .replace(linkPattern, '')
            // Entferne überschüssige Leerzeilen, die durch das Entfernen entstehen könnten
            .replace(/\n{3,}/g, '\n\n');
          
          setDescription(newDescription);
        }
      }
    } catch (err) {
      console.error('Fehler beim Löschen des Anhangs:', err);
      // Einfachere Fehlerbehandlung ohne axios-Import
      const axiosError = err as any;
      setError(axiosError.response?.data?.message || axiosError.message || t('createRequest.editRequest.errors.unknownError'));
    }
  };

  const handleDownloadAttachment = async (attachment: RequestAttachment) => {
    try {
      if (attachment.id === undefined) {
        throw new Error('Anhang-ID fehlt');
      }
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
      // ✅ MEMORY LEAK FIX: URL nach Verwendung freigeben
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Fehler beim Herunterladen des Anhangs:', err);
      // Einfachere Fehlerbehandlung ohne axios-Import
      const axiosError = err as any;
      setError(axiosError.response?.data?.message || axiosError.message || t('createRequest.editRequest.errors.unknownError'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error(t('createRequest.editRequest.errors.notAuthenticated'));
      
      // Keine Validierung notwendig, da bereits Zahlen vorliegen
      // Direkte Verwendung der Zustände

      // Verwende description (vom Textarea) als Basis
      // Füge Markdown-Links für Bilder automatisch hinzu (falls noch nicht vorhanden)
      const originalDescription = request.description || '';
      let finalDescription = description || ''; // WICHTIG: Verwende description als Basis, nicht originalDescription
      const imageAttachments = attachments.filter(att => att.fileType?.startsWith('image/') && att.id);
      
      // Extrahiere bereits vorhandene Bilder aus originalDescription (falls vorhanden)
      const existingImagePattern = /!\[([^\]]*)\]\([^)]+\)/g;
      const existingImages: string[] = [];
      let match;
      if (originalDescription) {
        while ((match = existingImagePattern.exec(originalDescription)) !== null) {
          existingImages.push(match[0]);
        }
      }
      
      // Füge alle Bilder hinzu (sowohl neue als auch bereits vorhandene)
      for (const attachment of imageAttachments) {
        const imageUrl = getRequestAttachmentUrl(request.id, attachment.id!);
        const imageMarkdown = `![${attachment.fileName}](${imageUrl})`;
        
        // Prüfe, ob dieser Bild-Link bereits in der Beschreibung vorhanden ist
        const escapedFileName = attachment.fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const imagePattern = new RegExp(`!\\[${escapedFileName}\\]\\([^)]+\\)`, 'g');
        
        if (!imagePattern.test(finalDescription)) {
          // Bild-Link ist noch nicht in der Beschreibung, füge ihn hinzu
          finalDescription = finalDescription ? `${finalDescription}\n${imageMarkdown}` : imageMarkdown;
        }
      }
      
      // Füge auch bereits vorhandene Bilder hinzu, die nicht in attachments sind (z.B. von anderen Quellen)
      for (const existingImage of existingImages) {
        if (!finalDescription.includes(existingImage)) {
          finalDescription = finalDescription ? `${finalDescription}\n${existingImage}` : existingImage;
        }
      }

      await axiosInstance.put(API_ENDPOINTS.REQUESTS.BY_ID(request.id), {
        title: title,
        description: finalDescription,
        responsible_id: responsibleId,
        branch_id: branchId,
        type: type,
        is_private: isPrivate,
        due_date: dueDate || null,
        create_todo: createTodo,
      });

      // Hole den aktualisierten Request vom Server (inkl. Attachments)
      const updatedResponse = await axiosInstance.get(API_ENDPOINTS.REQUESTS.BY_ID(request.id));
      
      // Attachments sind bereits in der Response enthalten
      // URL-Generierung für Attachments hinzufügen
      if (updatedResponse.data.attachments) {
        updatedResponse.data.attachments = updatedResponse.data.attachments.map((att: any) => ({
          id: att.id,
          fileName: att.fileName,
          fileType: att.fileType,
          fileSize: att.fileSize,
          filePath: att.filePath,
          uploadedAt: att.uploadedAt,
          url: getRequestAttachmentUrl(request.id, att.id)
        }));
      } else {
        updatedResponse.data.attachments = [];
      }

      // Erfolgreiches Update - Schließe das Modal
      // Reset uploadedDuringEdit da erfolgreich gespeichert
      setUploadedDuringEdit([]);
      onClose();
      if (onRequestUpdated) {
        // Übergebe den aktualisierten Request an den Callback
        onRequestUpdated(updatedResponse.data);
      }
    } catch (err) {
      console.error('Fehler beim Aktualisieren des Requests:', err);
      // Einfachere Fehlerbehandlung ohne axios-Import
      const axiosError = err as any;
      setError(axiosError.response?.data?.message || axiosError.message || t('createRequest.editRequest.errors.unknownError'));
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

      // Beim Löschen brauchen wir keinen Request-Update, aber der Callback wird für Konsistenz aufgerufen
      // Der Parent muss die Liste aktualisieren (wird in Requests.tsx implementiert)
      onClose();
    } catch (err) {
      console.error('Delete Error:', err);
      // Einfachere Fehlerbehandlung ohne axios-Import
      const axiosError = err as any;
      setError(axiosError.response?.data?.message || axiosError.message || t('createRequest.editRequest.errors.unknownError'));
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTemporaryAttachment = (index: number) => {
    // Finde den zu entfernenden Anhang
    const attachmentToRemove = temporaryAttachments[index];
    
    if (attachmentToRemove) {
      // Entferne den Anhang aus dem temporaryAttachments-Array
      setTemporaryAttachments(temporaryAttachments.filter((_, i) => i !== index));
      
      // Entferne auch den Verweis im Beschreibungstext
      if (attachmentToRemove.fileName) {
        // Suche nach Bild- und Link-Markdown mit dem Dateinamen
        const escapedFileName = attachmentToRemove.fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const uploadText = t('createRequest.editRequest.form.uploadAfterCreate');
        const imagePattern = new RegExp(`!\\[${escapedFileName}\\]\\(${uploadText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`, 'g');
        const linkPattern = new RegExp(`\\[${escapedFileName}\\]\\(${uploadText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`, 'g');
        
        // Bereinige die Beschreibung
        const newDescription = description
          .replace(imagePattern, '')
          .replace(linkPattern, '')
          // Entferne überschüssige Leerzeilen, die durch das Entfernen entstehen könnten
          .replace(/\n{3,}/g, '\n\n');
        
        setDescription(newDescription);
      }
    }
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

      // Für Bilder: KEIN Markdown-Link ins Textarea einfügen (wird beim Speichern automatisch hinzugefügt)
      // Für andere Dateien: Link ins Textarea einfügen
      if (!file.type.startsWith('image/')) {
        const insertText = `\n[${file.name}](${t('createRequest.editRequest.form.uploadAfterCreate')})\n`;
        
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
      }
    } catch (err) {
      console.error('Fehler beim Verarbeiten der Datei:', err);
      // Einfachere Fehlerbehandlung ohne axios-Import
      const axiosError = err as any;
      setError(axiosError.response?.data?.message || axiosError.message || t('createRequest.editRequest.errors.unknownError'));
    } finally {
      setUploading(false);
    }
  };

  const uploadTemporaryAttachments = async () => {
    if (temporaryAttachments.length === 0) return;
    
    try {
      setLoading(true);
      
      let updatedDescription = description;
      const uploadText = t('createRequest.editRequest.form.uploadAfterCreate');
      
      // Upload jeder temporären Datei und aktualisiere die URLs im Beschreibungstext
      for (const attachment of temporaryAttachments) {
        if (!attachment.file) continue;
        
        const formData = new FormData();
        formData.append('file', attachment.file);
        
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
        
        // Für Bilder: Prüfe, ob bereits im Text vorhanden, sonst hinzufügen
        if (newAttachment.fileType.startsWith('image/')) {
          const fileName = attachment.fileName;
          const escapedFileName = fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const imagePattern = new RegExp(`!\\[${escapedFileName}\\]\\([^)]+\\)`, 'g');
          
          if (!imagePattern.test(updatedDescription)) {
            // Bild-Link ist noch nicht in der Beschreibung, füge ihn hinzu
            const realUrl = getRequestAttachmentUrl(request.id, newAttachment.id);
            updatedDescription = updatedDescription ? `${updatedDescription}\n![${fileName}](${realUrl})` : `![${fileName}](${realUrl})`;
          } else {
            // Ersetze Platzhalter durch echte URL, falls vorhanden
            const placeholderPattern = new RegExp(`!\\[${escapedFileName}\\]\\(${uploadText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`, 'g');
            const realUrl = getRequestAttachmentUrl(request.id, newAttachment.id);
            updatedDescription = updatedDescription.replace(placeholderPattern, `![${fileName}](${realUrl})`);
          }
        } else {
          // Für andere Dateien: Ersetze Platzhalter durch echte URL
          const fileName = attachment.fileName;
          const escapedFileName = fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const placeholderLinkPattern = new RegExp(`\\[${escapedFileName}\\]\\(${uploadText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`, 'g');
          const realUrl = getRequestAttachmentUrl(request.id, newAttachment.id);
          updatedDescription = updatedDescription.replace(placeholderLinkPattern, `[${fileName}](${realUrl})`);
        }
      }
      
      // Aktualisiere die Beschreibung mit den echten URLs
      if (updatedDescription !== description) {
        await axiosInstance.put(API_ENDPOINTS.REQUESTS.BY_ID(request.id), {
          title: title,
          description: updatedDescription,
          responsible_id: responsibleId,
          branch_id: branchId,
          due_date: dueDate || null,
          create_todo: createTodo,
        });
        setDescription(updatedDescription);
      }
      
      console.log(`${temporaryAttachments.length} Anhänge erfolgreich hochgeladen.`);
      // Nach erfolgreichem Upload leeren wir die temporären Anhänge
      setTemporaryAttachments([]);
    } catch (err) {
      console.error('Fehler beim Hochladen der Anhänge:', err);
      // Wir zeigen hier keinen Fehler, da der Request bereits aktualisiert wurde
    } finally {
      setLoading(false);
    }
  };

  const renderAttachments = () => {
    if (attachments.length === 0) return null;
    
    return (
      <div className="mt-2">
        <ul className="flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <li key={attachment.id || `temp-${attachment.fileName}`} className="inline-flex items-center bg-gray-100 rounded-md px-2 py-1 relative group">
              <span className="text-sm font-medium text-gray-800">
                {attachment.fileName}
              </span>
              <div className="flex ml-2">
                <div className="relative group mr-1">
                  <button
                    type="button"
                    onClick={() => handleDownloadAttachment(attachment)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                    {t('createRequest.editRequest.form.download')}
                  </div>
                </div>
                <div className="relative group ml-1">
                  <button
                    type="button"
                    onClick={() => attachment.id !== undefined && handleDeleteAttachment(attachment.id)}
                    className="text-red-600 hover:text-red-900"
                    disabled={attachment.id === undefined}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                    {t('createRequest.editRequest.form.remove')}
                  </div>
                </div>
              </div>
              {/* Tooltip für Bildvorschau bei Bild-Dateien */}
              {attachment.fileType.startsWith('image/') && attachment.id && (
                <div className="absolute z-10 bg-white p-2 rounded-md shadow-lg -top-32 left-0 border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                  <img 
                    src={getRequestAttachmentUrl(request.id, attachment.id)}
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

  const renderTemporaryAttachments = () => {
    if (temporaryAttachments.length === 0) return null;
    
    return (
      <div className="mt-2">
        <ul className="flex flex-wrap gap-2">
          {temporaryAttachments.map((attachment, index) => (
            <li key={`temp-${index}`} className="inline-flex items-center bg-gray-100 rounded-md px-2 py-1 relative group">
              <span className="text-sm font-medium text-gray-800">
                {attachment.fileName}
              </span>
              <div className="flex ml-2">
                <div className="relative group ml-1">
                  <button
                    type="button"
                    onClick={() => handleRemoveTemporaryAttachment(index)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                    {t('createRequest.editRequest.form.remove')}
                  </div>
                </div>
              </div>
              {/* Tooltip für Bildvorschau bei Bild-Dateien */}
              {attachment.fileType.startsWith('image/') && attachment.file && (
                <div className="absolute z-10 bg-white p-2 rounded-md shadow-lg -top-32 left-0 border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                  <ImagePreviewWithCleanup file={attachment.file} alt={attachment.fileName} blobUrlsRef={blobUrlsRef} />
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  if (!isOpen) return null;

  const renderForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('createRequest.editRequest.form.title')}</label>
        <input
          type="text"
          required
          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="description_request_edit" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('createRequest.editRequest.form.description')}
        </label>
        <div className="relative">
          <textarea
            ref={textareaRef}
            rows={isMobile ? 5 : 10}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onPaste={handlePaste}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          />
          {/* Heftklammer-Icon zum Hinzufügen von Dateien */}
          <div className="relative group absolute bottom-2 left-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400 focus:outline-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
              {t('createRequest.editRequest.form.fileUpload')}
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            className="hidden"
          />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-800 bg-opacity-70 dark:bg-opacity-70">
              <span className="text-sm text-gray-600 dark:text-gray-300">{t('createRequest.editRequest.form.uploading')}</span>
            </div>
          )}
        </div>
        {renderAttachments()}
        {renderTemporaryAttachments()}
        {/* Bilder werden NICHT ins Textarea eingefügt */}
        {/* Beim Speichern werden sie automatisch zum Markdown-Text hinzugefügt (für Card-Anzeige) */}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('createRequest.editRequest.form.responsible')}</label>
        <select
          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          value={responsibleId}
          onChange={(e) => setResponsibleId(Number(e.target.value))}
        >
          {users.map(user => (
            <option key={user.id} value={user.id}>
              {user.firstName} ({user.username})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('createRequest.editRequest.form.branch')}</label>
        <select
          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('createRequest.editRequest.form.type')}</label>
        <select
          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          value={type}
          onChange={(e) => setType(e.target.value as any)}
        >
          <option value="vacation">{t('requests.types.vacation')}</option>
          <option value="improvement_suggestion">{t('requests.types.improvement_suggestion')}</option>
          <option value="sick_leave">{t('requests.types.sick_leave')}</option>
          <option value="employment_certificate">{t('requests.types.employment_certificate')}</option>
          <option value="other">{t('requests.types.other')}</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('createRequest.editRequest.form.dueDate')}</label>
        <input
          type="date"
          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="is_private_edit"
          className="rounded border-gray-300 text-blue-600 dark:bg-gray-700 dark:border-gray-600"
          checked={isPrivate}
          onChange={(e) => setIsPrivate(e.target.checked)}
        />
        <label htmlFor="is_private_edit" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
          {t('createRequest.editRequest.form.isPrivate')}
        </label>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="create_todo_edit"
          className="rounded border-gray-300 text-blue-600 dark:bg-gray-700 dark:border-gray-600"
          checked={createTodo}
          onChange={(e) => setCreateTodo(e.target.checked)}
        />
        <label htmlFor="create_todo_edit" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
          {t('createRequest.editRequest.form.createTodo')}
        </label>
      </div>

      <div className="flex justify-between pt-4">
        {canDeleteRequest && (
          <button
            type="button"
            onClick={handleDelete}
            className={`p-2 rounded-md ${
              confirmDelete
                ? 'bg-red-600 text-white dark:bg-red-700 dark:text-white hover:bg-red-700 dark:hover:bg-red-600'
                : 'text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300'
            }`}
            title={confirmDelete ? t('createRequest.editRequest.form.confirmDelete') : t('createRequest.editRequest.form.delete')}
          >
            {confirmDelete ? (
              <CheckIcon className="h-5 w-5" />
            ) : (
              <TrashIcon className="h-5 w-5" />
            )}
          </button>
        )}
        <div className="flex gap-2">
          <div className="relative group">
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
              {t('createRequest.editRequest.form.cancel')}
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
              {loading ? t('createRequest.editRequest.form.saving') : t('createRequest.editRequest.form.save')}
            </div>
          </div>
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
          <Dialog.Panel className="mx-auto max-w-xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <Dialog.Title className="text-lg font-semibold dark:text-white">
                {t('createRequest.editRequest.title')}
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

              {renderForm()}
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    );
  }

  // Für Desktop (ab 640px) - Sidepane
  // WICHTIG: Sidepane muss IMMER gerendert bleiben für Transition
  return (
    <>
      {/* Backdrop - nur wenn offen und <= 1070px */}
      {isOpen && !isLargeScreen && (
        <div 
          className="fixed inset-0 bg-black/10 transition-opacity sidepane-overlay sidepane-backdrop z-40" 
          aria-hidden="true" 
          onClick={onClose}
          style={{
            opacity: isOpen ? 1 : 0,
            transition: 'opacity 300ms ease-out'
          }}
        />
      )}
      
      {/* Sidepane - IMMER gerendert, Position wird via Transform geändert */}
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
            {t('createRequest.editRequest.title')}
          </h2>
          <button
            onClick={onClose}
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

          {renderForm()}
        </div>
      </div>
    </>
  );
};

export default EditRequestModal; 
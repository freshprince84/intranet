import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../config/axios.ts';
import { API_ENDPOINTS } from '../config/api.ts';
import { usePermissions } from '../hooks/usePermissions.ts';
import CerebroArticleSelector from './CerebroArticleSelector.tsx';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, TrashIcon, CheckIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth.tsx';
import MarkdownPreview from './MarkdownPreview.tsx';
import { useSidepane } from '../contexts/SidepaneContext.tsx';

interface User {
    id: number;
    firstName: string;
    lastName: string;
}

interface Role {
    id: number;
    name: string;
}

interface Branch {
    id: number;
    name: string;
}

interface TaskAttachment {
    id: number;
    fileName: string;
    fileType: string;
    fileSize: number;
    filePath: string;
    uploadedAt: string;
    file?: File;
}

interface CerebroArticle {
    id: number;
    title: string;
    slug: string;
    content?: string;
}

interface Task {
    id: number;
    title: string;
    description: string | null;
    status: 'open' | 'in_progress' | 'improval' | 'quality_control' | 'done';
    responsible: {
        id: number;
        firstName: string;
        lastName: string;
    } | null;
    responsibleId: number | null;
    role: {
        id: number;
        name: string;
    } | null;
    roleId: number | null;
    qualityControl: {
        id: number;
        firstName: string;
        lastName: string;
    } | null;
    branch: {
        id: number;
        name: string;
    };
    dueDate: string | null;
    requestId: number | null;
    attachments?: TaskAttachment[];
}

interface EditTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTaskUpdated: (updatedTask: Task) => void;
    task: Task;
}

const EditTaskModal: React.FC<EditTaskModalProps> = ({ isOpen, onClose, onTaskUpdated, task }) => {
    const { t } = useTranslation();
    const { hasPermission } = usePermissions();
    const { user } = useAuth();
    const { openSidepane, closeSidepane } = useSidepane();
    const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth > 1070);
    
    const [title, setTitle] = useState(task.title || '');
    const [description, setDescription] = useState(task.description || '');
    const [status, setStatus] = useState(task.status || 'open');
    const [assigneeType, setAssigneeType] = useState<'user' | 'role'>(task.roleId ? 'role' : 'user');
    const [responsibleId, setResponsibleId] = useState<number | null>(task.responsibleId || null);
    const [roleId, setRoleId] = useState<number | null>(task.roleId || null);
    const [qualityControlId, setQualityControlId] = useState<number | null>(task.qualityControl?.id || null);
    const [branchId, setBranchId] = useState<number>(task.branch?.id || 0);
    const [attachments, setAttachments] = useState<TaskAttachment[]>(task.attachments || []);
    const [temporaryAttachments, setTemporaryAttachments] = useState<TaskAttachment[]>([]);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Formatiere das Datum im Format YYYY-MM-DD für das HTML-Datumseingabefeld
    const formatDate = (dateString: string | null): string | null => {
        if (!dateString) return null;
        
        // Versuche das Datum zu parsen
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return null; // Ungültiges Datum
        
        // Formatiere als YYYY-MM-DD
        return date.toISOString().split('T')[0];
    };

    const [dueDate, setDueDate] = useState<string | null>(formatDate(task.dueDate));
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
    const [linkedArticles, setLinkedArticles] = useState<CerebroArticle[]>([]);
    const [activeTab, setActiveTab] = useState<'data' | 'cerebro'>('data');

    const canDeleteTask = hasPermission('tasks', 'both', 'table');

    // Responsive Design: Überwache Fensterbreite
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 640);
            setIsLargeScreen(window.innerWidth > 1070);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
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
            fetchUsers();
            fetchRoles();
            fetchBranches();
            fetchLinkedArticles();
            fetchAttachments();
        }
    }, [isOpen, task.id]);

    const fetchUsers = async () => {
        try {
            setError(null);
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Nicht authentifiziert');
                return;
            }
            
            const response = await axiosInstance.get(API_ENDPOINTS.USERS.DROPDOWN);
            setUsers(response.data || []);
        } catch (err) {
            console.error('Fehler beim Laden der Benutzer:', err);
            
            // Einfachere Fehlerbehandlung ohne axios-Import
            const axiosError = err as any;
            if (axiosError.code === 'ERR_NETWORK') {
                setError(t('tasks.editTask.errors.connectionError'));
            } else {
                setError(`${t('tasks.editTask.errors.loadUsersError')}: ${axiosError.response?.data?.message || axiosError.message}`);
            }
        }
    };

    const fetchRoles = async () => {
        try {
            setError(null);
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Nicht authentifiziert');
                return;
            }
            
            const response = await axiosInstance.get(API_ENDPOINTS.ROLES.BASE);
            setRoles(response.data || []);
        } catch (err) {
            console.error('Fehler beim Laden der Rollen:', err);
            
            // Einfachere Fehlerbehandlung ohne axios-Import
            const axiosError = err as any;
            if (axiosError.code === 'ERR_NETWORK') {
                setError(t('tasks.editTask.errors.connectionError'));
            } else {
                setError(`${t('tasks.editTask.errors.loadRolesError')}: ${axiosError.response?.data?.message || axiosError.message}`);
            }
        }
    };

    const fetchBranches = async () => {
        try {
            setError(null);
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Nicht authentifiziert');
                return;
            }
            
            const response = await axiosInstance.get(API_ENDPOINTS.BRANCHES.BASE);
            setBranches(response.data || []);
        } catch (err) {
            console.error('Fehler beim Laden der Niederlassungen:', err);
            
            // Einfachere Fehlerbehandlung ohne axios-Import
            const axiosError = err as any;
            if (axiosError.code === 'ERR_NETWORK') {
                setError(t('tasks.editTask.errors.connectionError'));
            } else {
                setError(`${t('tasks.editTask.errors.loadBranchesError')}: ${axiosError.response?.data?.message || axiosError.message}`);
            }
        }
    };

    const fetchLinkedArticles = async () => {
        try {
            setError(null);
            const response = await axiosInstance.get(API_ENDPOINTS.TASKS.CARTICLES(task.id));
            setLinkedArticles(response.data || []);
        } catch (err) {
            console.error('Fehler beim Laden der verknüpften Artikel:', err);
            
            // Einfachere Fehlerbehandlung ohne axios-Import
            const axiosError = err as any;
            setError(axiosError.response?.data?.message || axiosError.message || 'Ein unerwarteter Fehler ist aufgetreten');
        }
    };

    const fetchAttachments = async () => {
        try {
            setError(null);
            const response = await axiosInstance.get(API_ENDPOINTS.TASKS.ATTACHMENTS(task.id));
            setAttachments(response.data || []);
        } catch (err) {
            console.error('Fehler beim Laden der Anhänge:', err);
            
            // Einfachere Fehlerbehandlung ohne axios-Import
            const axiosError = err as any;
            setError(axiosError.response?.data?.message || axiosError.message || 'Ein unerwarteter Fehler ist aufgetreten');
            setAttachments([]);
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
                API_ENDPOINTS.TASKS.ATTACHMENTS(task.id),
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );

            const newAttachment = response.data;
            setAttachments([...attachments, newAttachment]);

            // Bild in den text einfügen
            let insertText = '';
            if (newAttachment.fileType.startsWith('image/')) {
                // Für Bilder einen Markdown-Image-Link einfügen mit vollständiger URL
                insertText = `\n![${newAttachment.fileName}](${window.location.origin}/api${API_ENDPOINTS.TASKS.ATTACHMENT(task.id, newAttachment.id)})\n`;
            } else {
                // Für andere Dateien einen normalen Link mit vollständiger URL
                insertText = `\n[${newAttachment.fileName}](${window.location.origin}/api${API_ENDPOINTS.TASKS.ATTACHMENT(task.id, newAttachment.id)})\n`;
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
        await uploadFileAndInsertLink(file);
        
        // Zurücksetzen des Datei-Inputs
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            // Validierung
            if (!title || !status || !branchId) {
                setError(t('tasks.editTask.errors.fillAllFields'));
                setLoading(false);
                return;
            }

            // Überprüfen, ob entweder Benutzer oder Rolle ausgewählt wurde
            if (assigneeType === 'user' && !responsibleId) {
                setError(t('tasks.editTask.form.chooseUser'));
                setLoading(false);
                return;
            }
            
            if (assigneeType === 'role' && !roleId) {
                setError(t('tasks.editTask.form.chooseRole'));
                setLoading(false);
                return;
            }

            // Basis-Daten für die Anfrage
            const taskData: any = {
                title,
                description,
                status,
                qualityControlId,
                branchId,
                dueDate
            };

            // Entweder responsibleId oder roleId hinzufügen, nicht beides
            if (assigneeType === 'user') {
                taskData.responsibleId = responsibleId;
                taskData.roleId = null; // Rolle explizit auf null setzen, um sie zu entfernen
            } else if (assigneeType === 'role') {
                taskData.roleId = roleId;
                taskData.responsibleId = null; // Benutzer explizit auf null setzen, um ihn zu entfernen
            }

            const response = await axiosInstance.put(`${API_ENDPOINTS.TASKS.BASE}/${task.id}`, taskData);

            console.log('Task aktualisiert:', response.data);
            // Übergebe den aktualisierten Task an den Callback
            onTaskUpdated(response.data);
            onClose();
        } catch (err) {
            console.error('Fehler beim Aktualisieren des Tasks:', err);
            
            // Einfachere Fehlerbehandlung ohne axios-Import
            const axiosError = err as any;
            setError(axiosError.response?.data?.message || axiosError.message || 'Ein unerwarteter Fehler ist aufgetreten');
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
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Nicht authentifiziert');
                return;
            }

            await axiosInstance.delete(API_ENDPOINTS.TASKS.BY_ID(task.id));

            // Beim Löschen wird kein Task zurückgegeben, daher undefined übergeben
            onTaskUpdated(undefined as any);
            onClose();
        } catch (err) {
            console.error('Delete Error:', err);
            
            // Einfachere Fehlerbehandlung ohne axios-Import
            const axiosError = err as any;
            setError(axiosError.response?.data?.message || axiosError.message || 'Ein unerwarteter Fehler ist aufgetreten');
        }
    };

    const handleAddArticle = async (article: CerebroArticle) => {
        try {
            setError(null);
            
            await axiosInstance.post(
                API_ENDPOINTS.TASKS.LINK_CARTICLE(task.id, article.id)
            );
            
            setLinkedArticles(prev => [...prev, article]);
        } catch (err) {
            console.error('Fehler beim Verknüpfen des Artikels:', err);
            
            // Einfachere Fehlerbehandlung ohne axios-Import
            const axiosError = err as any;
            setError(axiosError.response?.data?.message || axiosError.message || 'Ein unerwarteter Fehler ist aufgetreten');
        }
    };
    
    const handleRemoveArticle = async (articleId: number) => {
        try {
            setError(null);
            
            await axiosInstance.delete(
                API_ENDPOINTS.TASKS.UNLINK_CARTICLE(task.id, articleId)
            );
            
            setLinkedArticles(prev => prev.filter(a => a.id !== articleId));
        } catch (err) {
            console.error('Fehler beim Entfernen der Artikelverknüpfung:', err);
            
            // Einfachere Fehlerbehandlung ohne axios-Import
            const axiosError = err as any;
            setError(axiosError.response?.data?.message || axiosError.message || 'Ein unerwarteter Fehler ist aufgetreten');
        }
    };

    const handleDeleteAttachment = async (attachmentId: number) => {
        try {
            setError(null);
            
            // Finde den zu entfernenden Anhang
            const attachmentToRemove = attachments.find(a => a.id === attachmentId);
            
            if (attachmentToRemove) {
                await axiosInstance.delete(API_ENDPOINTS.TASKS.ATTACHMENT(task.id, attachmentId));
                
                // Entferne den Anhang aus der Liste
                setAttachments(attachments.filter(attachment => attachment.id !== attachmentId));
                
                // Entferne auch die Verweise im Beschreibungstext
                if (attachmentToRemove.fileName) {
                    // Erzeuge URL-Muster für diesen Anhang
                    const attachmentUrl = `${window.location.origin}/api${API_ENDPOINTS.TASKS.ATTACHMENT(task.id, attachmentId)}`;
                    const escapedAttachmentUrl = attachmentUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    
                    // Suche nach Bild- und Link-Markdown
                    const imagePattern = new RegExp(`!\\[(.*?)\\]\\(${escapedAttachmentUrl}\\)`, 'g');
                    const linkPattern = new RegExp(`\\[(.*?)\\]\\(${escapedAttachmentUrl}\\)`, 'g');
                    
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
            setError(axiosError.response?.data?.message || axiosError.message || 'Ein unerwarteter Fehler ist aufgetreten');
        }
    };

    const handleDownloadAttachment = async (attachment: TaskAttachment) => {
        try {
            const response = await axiosInstance.get(
                API_ENDPOINTS.TASKS.ATTACHMENT(task.id, attachment.id),
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
            
            // Einfachere Fehlerbehandlung ohne axios-Import
            const axiosError = err as any;
            setError(axiosError.response?.data?.message || axiosError.message || 'Ein unerwarteter Fehler ist aufgetreten');
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
                const uploadText = t('tasks.editTask.form.uploadAfterCreate');
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

    const renderForm = () => (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tabs Navigation */}
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                    <button
                        type="button"
                        className={`${
                            activeTab === 'data'
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'
                        } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
                        onClick={() => setActiveTab('data')}
                    >
                        Daten
                    </button>
                    <button
                        type="button"
                        className={`${
                            activeTab === 'cerebro'
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'
                        } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
                        onClick={() => setActiveTab('cerebro')}
                    >
                        Cerebro Artikel
                    </button>
                </nav>
            </div>

            {/* Data Tab Content */}
            {activeTab === 'data' && (
                <>
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            {t('tasks.editTask.form.title')}
                        </label>
                        <input
                            type="text"
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="description_edit" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            {t('tasks.editTask.form.description')}
                        </label>
                        <div className="relative">
                            <textarea
                                ref={textareaRef}
                                id="description_edit"
                                rows={6}
                                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                onPaste={handlePaste}
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                placeholder={t('tasks.editTask.form.descriptionPlaceholder')}
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute bottom-2 left-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400 focus:outline-none"
                                title={t('tasks.editTask.form.fileUpload')}
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
                                    <span className="text-sm text-gray-600 dark:text-gray-300">{t('tasks.editTask.form.uploading')}</span>
                                </div>
                            )}
                        </div>
                        {renderAttachments()}
                        {renderTemporaryAttachments()}
                        {/* MarkdownPreview entfernt: Bei Edit-Modals werden Anhänge bereits durch renderAttachments() 
                            und renderTemporaryAttachments() angezeigt, Beschreibung nur im Textarea */}
                    </div>

                    <div>
                        <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            {t('tasks.editTask.form.status')}
                        </label>
                        <select
                            id="status"
                            value={status}
                            onChange={(e) => setStatus(e.target.value as Task['status'])}
                            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        >
                            <option value="open">{t('tasks.status.open')}</option>
                            <option value="in_progress">{t('tasks.status.in_progress')}</option>
                            <option value="improval">{t('tasks.status.improval')}</option>
                            <option value="quality_control">{t('tasks.status.quality_control')}</option>
                            <option value="done">{t('tasks.status.done')}</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            {t('tasks.editTask.form.responsibleFor')} *
                        </label>
                        <div className="flex space-x-4">
                            <label className="inline-flex items-center">
                                <input
                                    type="radio"
                                    className="form-radio text-blue-600 dark:bg-gray-700 dark:border-gray-600"
                                    name="assigneeType"
                                    value="user"
                                    checked={assigneeType === 'user'}
                                    onChange={() => {
                                        setAssigneeType('user');
                                        setRoleId(null);
                                    }}
                                />
                                <span className="ml-2 dark:text-gray-300">{t('tasks.editTask.form.user')}</span>
                            </label>
                            <label className="inline-flex items-center">
                                <input
                                    type="radio"
                                    className="form-radio text-blue-600 dark:bg-gray-700 dark:border-gray-600"
                                    name="assigneeType"
                                    value="role"
                                    checked={assigneeType === 'role'}
                                    onChange={() => {
                                        setAssigneeType('role');
                                        setResponsibleId(null);
                                    }}
                                />
                                <span className="ml-2 dark:text-gray-300">{t('tasks.editTask.form.role')}</span>
                            </label>
                        </div>
                    </div>

                    {assigneeType === 'user' ? (
                        <div>
                            <label htmlFor="responsible" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('tasks.editTask.form.responsibleUser')} *
                            </label>
                            <select
                                id="responsible"
                                value={responsibleId === null ? '' : responsibleId}
                                onChange={(e) => setResponsibleId(e.target.value ? Number(e.target.value) : null)}
                                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                required={assigneeType === 'user'}
                            >
                                <option value="">{t('tasks.editTask.form.pleaseSelect')}</option>
                                {Array.isArray(users) && users.map(user => (
                                    <option key={user.id} value={user.id}>
                                        {user.firstName} {user.lastName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <div>
                            <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('tasks.editTask.form.responsibleRole')} *
                            </label>
                            <select
                                id="role"
                                value={roleId === null ? '' : roleId}
                                onChange={(e) => setRoleId(e.target.value ? Number(e.target.value) : null)}
                                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                required={assigneeType === 'role'}
                            >
                                <option value="">{t('tasks.editTask.form.pleaseSelect')}</option>
                                {Array.isArray(roles) && roles.map(role => (
                                    <option key={role.id} value={role.id}>
                                        {role.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label htmlFor="qualityControl" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            {t('tasks.editTask.form.qualityControl')}
                        </label>
                        <select
                            id="qualityControl"
                            value={qualityControlId === null ? '' : qualityControlId}
                            onChange={(e) => setQualityControlId(e.target.value ? Number(e.target.value) : null)}
                            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        >
                            <option value="">{t('tasks.editTask.form.noQualityControl')}</option>
                            {Array.isArray(users) && users.map(user => (
                                <option key={user.id} value={user.id}>
                                    {user.firstName} {user.lastName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="branch" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            {t('tasks.editTask.form.branch')}
                        </label>
                        <select
                            id="branch"
                            value={branchId === 0 ? '' : branchId}
                            onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : 0)}
                            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            required
                        >
                            <option value="">Bitte wählen</option>
                            {Array.isArray(branches) && branches.map(branch => (
                                <option key={branch.id} value={branch.id}>
                                    {branch.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            {t('tasks.editTask.form.dueDate')}
                        </label>
                        <input
                            type="date"
                            id="dueDate"
                            value={dueDate || ''}
                            onChange={(e) => {
                                // Wenn das Feld leer ist, setze auf null
                                if (!e.target.value) {
                                    setDueDate(null);
                                } else {
                                    // Ansonsten behalte das Format YYYY-MM-DD bei
                                    setDueDate(e.target.value);
                                }
                            }}
                            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                    </div>
                </>
            )}

            {/* Cerebro Articles Tab Content */}
            {activeTab === 'cerebro' && (
                <div>
                    {linkedArticles.length > 0 && (
                        <div className="mb-4">
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('tasks.editTask.form.linkedCerebroArticles')}</h3>
                            <ul className="space-y-2">
                                {linkedArticles.map(article => (
                                    <li key={article.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded">
                                        <a 
                                            href={`/cerebro/articles/${article.slug}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                                        >
                                            {article.title}
                                        </a>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveArticle(article.id)}
                                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                        >
                                            {t('tasks.editTask.form.remove')}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <CerebroArticleSelector 
                        onArticleSelected={handleAddArticle}
                        excludeArticleIds={linkedArticles.map(a => a.id)}
                        selectedArticles={linkedArticles}
                        onArticleRemove={handleRemoveArticle}
                    />
                </div>
            )}
                
            <div className="flex justify-between pt-4">
                {canDeleteTask && (
                    <button
                        type="button"
                        onClick={handleDelete}
                        className={`p-2 rounded-md ${
                            confirmDelete
                                ? 'bg-red-600 text-white dark:bg-red-700 dark:text-white hover:bg-red-700 dark:hover:bg-red-600'
                                : 'text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300'
                        }`}
                        title={confirmDelete ? t('tasks.editTask.form.confirmDelete') : t('tasks.editTask.form.delete')}
                    >
                        {confirmDelete ? (
                            <CheckIcon className="h-5 w-5" />
                        ) : (
                            <TrashIcon className="h-5 w-5" />
                        )}
                    </button>
                )}
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                        title={t('tasks.editTask.form.cancel')}
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                    <button
                        type="submit"
                        className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title={loading ? t('tasks.editTask.form.saving') : t('tasks.editTask.form.save')}
                        disabled={loading}
                    >
                        {loading ? (
                            <ArrowPathIcon className="h-5 w-5 animate-spin" />
                        ) : (
                            <CheckIcon className="h-5 w-5" />
                        )}
                    </button>
                </div>
            </div>
        </form>
    );

    const renderAttachments = () => {
        if (attachments.length === 0) return null;
        
        return (
            <div className="mt-2">
                <ul className="flex flex-wrap gap-2">
                    {attachments.map((attachment) => (
                        <li key={attachment.id} className="inline-flex items-center bg-gray-100 dark:bg-gray-700 rounded-md px-2 py-1 relative group">
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-300">
                                {attachment.fileName}
                            </span>
                            <div className="flex ml-2">
                                <button
                                    type="button"
                                    onClick={() => handleDownloadAttachment(attachment)}
                                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-1"
                                    title={t('tasks.editTask.form.download')}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDeleteAttachment(attachment.id)}
                                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 ml-1"
                                    title="Entfernen"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            {/* Tooltip für Bildvorschau bei Bild-Dateien */}
                            {attachment.fileType.startsWith('image/') && (
                                <div className="absolute z-10 invisible group-hover:visible bg-white dark:bg-gray-800 p-2 rounded-md shadow-lg -top-32 left-0 border border-gray-200 dark:border-gray-600">
                                    <img 
                                        src={`${window.location.origin}/api${API_ENDPOINTS.TASKS.ATTACHMENT(task.id, attachment.id)}`}
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
                        <li key={`temp-${index}`} className="inline-flex items-center bg-gray-100 dark:bg-gray-700 rounded-md px-2 py-1 relative group">
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-300">
                                {attachment.fileName}
                            </span>
                            <div className="flex ml-2">
                                <button
                                    type="button"
                                    onClick={() => handleRemoveTemporaryAttachment(index)}
                                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 ml-1"
                                    title="Entfernen"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            {/* Tooltip für Bildvorschau bei Bild-Dateien */}
                            {attachment.fileType?.startsWith('image/') && attachment.file && (
                                <div className="absolute z-10 invisible group-hover:visible bg-white dark:bg-gray-800 p-2 rounded-md shadow-lg -top-32 left-0 border border-gray-200 dark:border-gray-600">
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
                                {t('tasks.editTask.title')}
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
                            {t('tasks.editTask.title')}
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

export default EditTaskModal; 
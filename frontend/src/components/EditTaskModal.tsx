import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import axiosInstance from '../config/axios.ts';
import { API_ENDPOINTS, API_URL } from '../config/api.ts';
import { usePermissions } from '../hooks/usePermissions.ts';
import CerebroArticleSelector from './CerebroArticleSelector.tsx';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth.tsx';
import MarkdownPreview from './MarkdownPreview.tsx';

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

interface Task {
    id: number;
    title: string;
    description: string | null;
    status: 'open' | 'in_progress' | 'improval' | 'quality_control' | 'done';
    responsibleId?: number | null;
    roleId?: number | null;
    responsible?: User | null;
    role?: Role | null;
    qualityControl?: User | null;
    qualityControlId?: number | null;
    branch?: Branch | null;
    branchId?: number | null;
    dueDate: string | null;
    attachments?: TaskAttachment[];
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

interface EditTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTaskUpdated: () => void;
    task: Task;
}

const EditTaskModal: React.FC<EditTaskModalProps> = ({ isOpen, onClose, onTaskUpdated, task }) => {
    const { hasPermission } = usePermissions();
    const { user } = useAuth();
    
    const [title, setTitle] = useState(task.title || '');
    const [description, setDescription] = useState(task.description || '');
    const [status, setStatus] = useState(task.status || 'open');
    const [assigneeType, setAssigneeType] = useState<'user' | 'role'>((task as any).roleId ? 'role' : 'user');
    const [responsibleId, setResponsibleId] = useState<number | null>(task.responsible?.id || null);
    const [roleId, setRoleId] = useState<number | null>((task as any).role?.id || null);
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
        const handleResize = () => setIsMobile(window.innerWidth < 640);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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
            
            const response = await axiosInstance.get(API_ENDPOINTS.USERS.BASE);
            setUsers(response.data || []);
        } catch (err) {
            console.error('Fehler beim Laden der Benutzer:', err);
            
            if (axios.isAxiosError(err)) {
                if (err.code === 'ERR_NETWORK') {
                    setError('Verbindung zum Server konnte nicht hergestellt werden. Bitte stellen Sie sicher, dass der Server läuft.');
                } else {
                    setError(`Fehler beim Laden der Benutzer: ${err.response?.data?.message || err.message}`);
                }
            } else {
                setError('Ein unerwarteter Fehler ist aufgetreten');
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
            
            if (axios.isAxiosError(err)) {
                if (err.code === 'ERR_NETWORK') {
                    setError('Verbindung zum Server konnte nicht hergestellt werden. Bitte stellen Sie sicher, dass der Server läuft.');
                } else {
                    setError(`Fehler beim Laden der Rollen: ${err.response?.data?.message || err.message}`);
                }
            } else {
                setError('Ein unerwarteter Fehler ist aufgetreten');
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
            
            if (axios.isAxiosError(err)) {
                if (err.code === 'ERR_NETWORK') {
                    setError('Verbindung zum Server konnte nicht hergestellt werden. Bitte stellen Sie sicher, dass der Server läuft.');
                } else {
                    setError(`Fehler beim Laden der Niederlassungen: ${err.response?.data?.message || err.message}`);
                }
            } else {
                setError('Ein unerwarteter Fehler ist aufgetreten');
            }
        }
    };

    const fetchLinkedArticles = async () => {
        if (!isOpen) return;
        
        try {
            setLoading(true);
            setError(null);
            
            const response = await axiosInstance.get(
                API_ENDPOINTS.TASKS.CARTICLES(task.id)
            );
            
            setLinkedArticles(response.data || []);
        } catch (err) {
            console.error('Fehler beim Laden der verknüpften Artikel:', err);
            if (axios.isAxiosError(err)) {
                setError(err.response?.data?.message || err.message);
            } else {
                setError('Ein unerwarteter Fehler ist aufgetreten');
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchAttachments = async () => {
        try {
            setError(null);
            const response = await axiosInstance.get(API_ENDPOINTS.TASKS.ATTACHMENTS(task.id));
            setAttachments(response.data || []);
        } catch (err) {
            console.error('Fehler beim Laden der Anhänge:', err);
            if (axios.isAxiosError(err)) {
                setError(err.response?.data?.message || err.message);
            } else {
                setError('Ein unerwarteter Fehler ist aufgetreten');
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

            // Füge einen Link/Vorschau in die Beschreibung ein
            let insertText = '';
            if (newAttachment.fileType.startsWith('image/')) {
                // Für Bilder einen Markdown-Image-Link einfügen mit vollständiger URL
                insertText = `\n![${newAttachment.fileName}](${API_URL}${API_ENDPOINTS.TASKS.ATTACHMENT(task.id, newAttachment.id)})\n`;
            } else {
                // Für andere Dateien einen normalen Link mit vollständiger URL
                insertText = `\n[${newAttachment.fileName}](${API_URL}${API_ENDPOINTS.TASKS.ATTACHMENT(task.id, newAttachment.id)})\n`;
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            // Validierung
            if (!title || (!responsibleId && !roleId) || !status || !branchId) {
                setError('Bitte füllen Sie alle erforderlichen Felder aus');
                setLoading(false);
                return;
            }

            if (responsibleId && roleId) {
                setError('Bitte wählen Sie entweder einen verantwortlichen Benutzer ODER eine Rolle aus, nicht beides');
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
            if (assigneeType === 'user' && responsibleId) {
                taskData.responsibleId = responsibleId;
            } else if (assigneeType === 'role' && roleId) {
                taskData.roleId = roleId;
            }

            const response = await axiosInstance.put(`${API_ENDPOINTS.TASKS.BASE}/${task.id}`, taskData);

            console.log('Task aktualisiert:', response.data);
            onTaskUpdated();
            onClose();
        } catch (err) {
            console.error('Fehler beim Aktualisieren des Tasks:', err);
            
            if (axios.isAxiosError(err)) {
                setError(err.response?.data?.error || err.message);
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
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Nicht authentifiziert');
                return;
            }

            await axiosInstance.delete(API_ENDPOINTS.TASKS.BY_ID(task.id));

            onTaskUpdated();
            onClose();
        } catch (err) {
            console.error('Delete Error:', err);
            if (axios.isAxiosError(err)) {
                setError(err.response?.data?.message || err.message);
            } else {
                setError('Ein unerwarteter Fehler ist aufgetreten');
            }
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
            if (axios.isAxiosError(err)) {
                setError(err.response?.data?.message || err.message);
            } else {
                setError('Ein unerwarteter Fehler ist aufgetreten');
            }
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
            if (axios.isAxiosError(err)) {
                setError(err.response?.data?.message || err.message);
            } else {
                setError('Ein unerwarteter Fehler ist aufgetreten');
            }
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
                    const attachmentUrl = `${API_URL}${API_ENDPOINTS.TASKS.ATTACHMENT(task.id, attachmentId)}`;
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
            if (axios.isAxiosError(err)) {
                setError(err.response?.data?.message || err.message);
            } else {
                setError('Ein unerwarteter Fehler ist aufgetreten');
            }
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
            if (axios.isAxiosError(err)) {
                setError(err.response?.data?.message || err.message);
            } else {
                setError('Ein unerwarteter Fehler ist aufgetreten');
            }
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
                const imagePattern = new RegExp(`!\\[${escapedFileName}\\]\\(wird nach dem Erstellen hochgeladen\\)`, 'g');
                const linkPattern = new RegExp(`\\[${escapedFileName}\\]\\(wird nach dem Erstellen hochgeladen\\)`, 'g');
                
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
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                    <button
                        type="button"
                        className={`${
                            activeTab === 'data'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
                        onClick={() => setActiveTab('data')}
                    >
                        Daten
                    </button>
                    <button
                        type="button"
                        className={`${
                            activeTab === 'cerebro'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                            Titel
                        </label>
                        <input
                            type="text"
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="description_edit" className="block text-sm font-medium text-gray-700">
                            Beschreibung
                        </label>
                        <div className="relative">
                            <textarea
                                ref={textareaRef}
                                id="description_edit"
                                rows={6}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                onPaste={handlePaste}
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                placeholder="Text, Bilder oder Dateien hier einfügen..."
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute bottom-2 left-2 text-gray-400 hover:text-gray-600 focus:outline-none"
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
                                <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70">
                                    <span className="text-sm text-gray-600">Wird hochgeladen...</span>
                                </div>
                            )}
                        </div>
                        {renderAttachments()}
                        {renderTemporaryAttachments()}
                        {description && (
                            <div className="mt-3">
                                <MarkdownPreview 
                                    content={description}
                                    temporaryAttachments={temporaryAttachments}
                                />
                            </div>
                        )}
                    </div>

                    <div>
                        <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                            Status
                        </label>
                        <select
                            id="status"
                            value={status}
                            onChange={(e) => setStatus(e.target.value as Task['status'])}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="open">Offen</option>
                            <option value="in_progress">In Bearbeitung</option>
                            <option value="improval">Nachbesserung</option>
                            <option value="quality_control">Qualitätskontrolle</option>
                            <option value="done">Erledigt</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            Verantwortlich für *
                        </label>
                        <div className="flex space-x-4">
                            <label className="inline-flex items-center">
                                <input
                                    type="radio"
                                    className="form-radio text-blue-600"
                                    name="assigneeType"
                                    value="user"
                                    checked={assigneeType === 'user'}
                                    onChange={() => {
                                        setAssigneeType('user');
                                        setRoleId(null);
                                    }}
                                />
                                <span className="ml-2">Benutzer</span>
                            </label>
                            <label className="inline-flex items-center">
                                <input
                                    type="radio"
                                    className="form-radio text-blue-600"
                                    name="assigneeType"
                                    value="role"
                                    checked={assigneeType === 'role'}
                                    onChange={() => {
                                        setAssigneeType('role');
                                        setResponsibleId(null);
                                    }}
                                />
                                <span className="ml-2">Rolle</span>
                            </label>
                        </div>
                    </div>

                    {assigneeType === 'user' ? (
                        <div>
                            <label htmlFor="responsible" className="block text-sm font-medium text-gray-700">
                                Verantwortlicher Benutzer *
                            </label>
                            <select
                                id="responsible"
                                value={responsibleId || ''}
                                onChange={(e) => setResponsibleId(e.target.value ? Number(e.target.value) : null)}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                required={assigneeType === 'user'}
                            >
                                <option value="">Bitte wählen</option>
                                {users.map(user => (
                                    <option key={user.id} value={user.id}>
                                        {user.firstName} {user.lastName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <div>
                            <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                                Verantwortliche Rolle *
                            </label>
                            <select
                                id="role"
                                value={roleId || ''}
                                onChange={(e) => setRoleId(e.target.value ? Number(e.target.value) : null)}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                required={assigneeType === 'role'}
                            >
                                <option value="">Bitte wählen</option>
                                {Array.isArray(roles) && roles.map(role => (
                                    <option key={role.id} value={role.id}>
                                        {role.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label htmlFor="qualityControl" className="block text-sm font-medium text-gray-700">
                            Qualitätskontrolle
                        </label>
                        <select
                            id="qualityControl"
                            value={qualityControlId || ''}
                            onChange={(e) => setQualityControlId(e.target.value ? Number(e.target.value) : null)}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="">Keine Qualitätskontrolle</option>
                            {users.map(user => (
                                <option key={user.id} value={user.id}>
                                    {user.firstName} {user.lastName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="branch" className="block text-sm font-medium text-gray-700">
                            Niederlassung
                        </label>
                        <select
                            id="branch"
                            value={branchId}
                            onChange={(e) => setBranchId(Number(e.target.value))}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            required
                        >
                            <option value="">Bitte wählen</option>
                            {branches.map(branch => (
                                <option key={branch.id} value={branch.id}>
                                    {branch.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">
                            Fälligkeitsdatum
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
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                </>
            )}

            {/* Cerebro Articles Tab Content */}
            {activeTab === 'cerebro' && (
                <div>
                    {linkedArticles.length > 0 && (
                        <div className="mb-4">
                            <h3 className="text-sm font-medium text-gray-700 mb-2">Verknüpfte Cerebro-Artikel</h3>
                            <ul className="space-y-2">
                                {linkedArticles.map(article => (
                                    <li key={article.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                                        <a 
                                            href={`/cerebro/articles/${article.slug}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:underline"
                                        >
                                            {article.title}
                                        </a>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveArticle(article.id)}
                                            className="text-red-600 hover:text-red-800"
                                        >
                                            Entfernen
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
                        className={`px-4 py-2 rounded-md ${
                            confirmDelete
                                ? 'bg-red-600 text-white'
                                : 'bg-white text-red-600 border border-red-300'
                        }`}
                    >
                        {confirmDelete ? 'Bestätigen' : 'Löschen'}
                    </button>
                )}
                <div className="flex space-x-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                        Abbrechen
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        {loading ? 'Wird gespeichert...' : 'Speichern'}
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
                        <li key={attachment.id} className="inline-flex items-center bg-gray-100 rounded-md px-2 py-1 relative group">
                            <span className="text-sm font-medium text-gray-800">
                                {attachment.fileName}
                            </span>
                            <div className="flex ml-2">
                                <button
                                    type="button"
                                    onClick={() => handleDownloadAttachment(attachment)}
                                    className="text-blue-600 hover:text-blue-900 mr-1"
                                    title="Herunterladen"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDeleteAttachment(attachment.id)}
                                    className="text-red-600 hover:text-red-900 ml-1"
                                    title="Entfernen"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            {/* Tooltip für Bildvorschau bei Bild-Dateien */}
                            {attachment.fileType.startsWith('image/') && (
                                <div className="absolute z-10 invisible group-hover:visible bg-white p-2 rounded-md shadow-lg -top-32 left-0 border border-gray-200">
                                    <img 
                                        src={`${API_URL}${API_ENDPOINTS.TASKS.ATTACHMENT(task.id, attachment.id)}`}
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
                            {attachment.fileType?.startsWith('image/') && attachment.file && (
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
                    <Dialog.Panel className="mx-auto max-w-xl w-full bg-white rounded-lg shadow-xl">
                        <div className="flex items-center justify-between p-4 border-b">
                            <Dialog.Title className="text-lg font-semibold">
                                Aufgabe bearbeiten
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
                        Aufgabe bearbeiten
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

export default EditTaskModal; 
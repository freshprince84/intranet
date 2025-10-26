import React, { useState, useEffect, useRef } from 'react';
import axiosInstance from '../config/axios.ts';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { API_ENDPOINTS } from '../config/api.ts';
import { useAuth } from '../hooks/useAuth.tsx';
import CerebroArticleSelector from './CerebroArticleSelector.tsx';
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

interface CerebroArticle {
    id: number;
    title: string;
    slug: string;
    content?: string;
}

interface TaskAttachment {
    id?: number;
    fileName: string;
    fileType: string;
    fileSize: number;
    filePath?: string;
    uploadedAt?: string;
    file?: File; // Für temporäre Anhänge vor dem Hochladen
}

interface CreateTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTaskCreated: () => void;
}

const CreateTaskModal = ({ isOpen, onClose, onTaskCreated }: CreateTaskModalProps) => {
    const { user } = useAuth();
    
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [assigneeType, setAssigneeType] = useState<'user' | 'role'>('user');
    const [responsibleId, setResponsibleId] = useState<number | ''>('');
    const [roleId, setRoleId] = useState<number | ''>('');
    const [qualityControlId, setQualityControlId] = useState<number | ''>('');
    const [branchId, setBranchId] = useState<number | ''>('');
    const [dueDate, setDueDate] = useState('');
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
    const [selectedArticles, setSelectedArticles] = useState<CerebroArticle[]>([]);
    const [activeTab, setActiveTab] = useState<'data' | 'cerebro'>('data');
    const [temporaryAttachments, setTemporaryAttachments] = useState<TaskAttachment[]>([]);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const getDefaultDueDate = () => {
        const date = new Date();
        date.setDate(date.getDate() + 7);
        return date.toISOString().split('T')[0];
    };

    useEffect(() => {
        if (isOpen) {
            fetchUsers();
            fetchRoles();
            fetchBranches();
            
            if (user) {
                setQualityControlId(user.id);
            }
            
            setDueDate(getDefaultDueDate());
        }
    }, [isOpen, user]);

    useEffect(() => {
        if (branches.length > 0 && branchId === '') {
            if (branches.length === 1) {
                setBranchId(branches[0].id);
            } else if (branches.length > 1) {
                setBranchId(branches[0].id);
            }
        }
    }, [branches, branchId]);
    
    useEffect(() => {
        // Prüfen der Bildschirmgröße beim Mounten
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

    const fetchUsers = async () => {
        try {
            setError(null);
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Nicht authentifiziert');
                return;
            }

            console.log('Lade Benutzer für CreateTaskModal...');
            
            const response = await axiosInstance.get(API_ENDPOINTS.USERS.DROPDOWN);
            
            console.log('Benutzer geladen:', response.data.length);
            setUsers(response.data || []);
        } catch (err) {
            console.error('Fehler beim Laden der Benutzer:', err);
            
            // Einfachere Fehlerbehandlung ohne axios-Import
            const axiosError = err as any;
            if (axiosError.code === 'ERR_NETWORK') {
                setError('Verbindung zum Server konnte nicht hergestellt werden. Bitte stellen Sie sicher, dass der Server läuft.');
            } else {
                setError(`Fehler beim Laden der Benutzer: ${axiosError.response?.data?.message || axiosError.message}`);
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
                setError('Verbindung zum Server konnte nicht hergestellt werden. Bitte stellen Sie sicher, dass der Server läuft.');
            } else {
                setError(`Fehler beim Laden der Rollen: ${axiosError.response?.data?.message || axiosError.message}`);
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

            console.log('Lade Niederlassungen für CreateTaskModal...');
            
            const response = await axiosInstance.get(API_ENDPOINTS.BRANCHES.BASE);
            
            console.log('Niederlassungen geladen:', response.data.length);
            setBranches(response.data || []);
        } catch (err) {
            console.error('Fehler beim Laden der Niederlassungen:', err);
            
            // Einfachere Fehlerbehandlung ohne axios-Import
            const axiosError = err as any;
            if (axiosError.code === 'ERR_NETWORK') {
                setError('Verbindung zum Server konnte nicht hergestellt werden. Bitte stellen Sie sicher, dass der Server läuft.');
            } else {
                setError(`Fehler beim Laden der Niederlassungen: ${axiosError.response?.data?.message || axiosError.message}`);
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
            const newAttachment: TaskAttachment = {
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
        await handleTemporaryAttachment(file);
        
        // Zurücksetzen des Datei-Inputs
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
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

    const uploadTemporaryAttachments = async (taskId: number) => {
        if (temporaryAttachments.length === 0) return;
        
        try {
            setLoading(true);
            
            // Upload jeder temporären Datei
            for (const attachment of temporaryAttachments) {
                if (!attachment.file) continue;
                
                const formData = new FormData();
                formData.append('file', attachment.file);
                
                await axiosInstance.post(
                    API_ENDPOINTS.TASKS.ATTACHMENTS(taskId),
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
            // Wir zeigen hier keinen Fehler, da der Task bereits erstellt wurde
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            // Validierung
            if (!title || (!responsibleId && !roleId) || !branchId) {
                setError('Bitte füllen Sie alle erforderlichen Felder aus');
                setLoading(false);
                return;
            }

            if (responsibleId && roleId) {
                setError('Bitte wählen Sie entweder einen verantwortlichen Benutzer ODER eine Rolle aus, nicht beides');
                setLoading(false);
                return;
            }

            const token = localStorage.getItem('token');
            if (!token) {
                setError('Nicht authentifiziert');
                setLoading(false);
                return;
            }

            // Validiere die IDs
            const branch = Number(branchId);
            const qualityControl = qualityControlId ? Number(qualityControlId) : null;
            const responsible = responsibleId ? Number(responsibleId) : null;
            const role = roleId ? Number(roleId) : null;

            if ((responsibleId && isNaN(responsible!)) || 
                (roleId && isNaN(role!)) || 
                isNaN(branch) || 
                (qualityControlId && isNaN(qualityControl!))) {
                setError('Ungültige ID-Werte');
                setLoading(false);
                return;
            }

            // Basisdaten für die Anfrage vorbereiten
            const taskData: any = {
                title,
                description,
                status: 'open',
                qualityControlId: qualityControl,
                branchId: branch,
                dueDate
            };

            // Nur ein Feld hinzufügen - entweder responsibleId oder roleId, aber nicht beide
            if (assigneeType === 'user' && responsibleId) {
                taskData.responsibleId = responsibleId;
            } else if (assigneeType === 'role' && roleId) {
                taskData.roleId = roleId;
            }

            const response = await axiosInstance.post(API_ENDPOINTS.TASKS.BASE, taskData);

            const newTaskId = response.data.id;
            
            // Verknüpfe Cerebro-Artikel, falls vorhanden
            if (selectedArticles.length > 0) {
                await Promise.all(
                    selectedArticles.map(article => 
                        axiosInstance.post(API_ENDPOINTS.TASKS.LINK_CARTICLE(newTaskId, article.id))
                    )
                );
            }
            
            // Lade temporäre Anhänge hoch, falls vorhanden
            await uploadTemporaryAttachments(newTaskId);
            
            console.log('Task erfolgreich erstellt:', response.data);
            onTaskCreated();
            handleClose();
        } catch (err) {
            console.error('Fehler beim Erstellen des Tasks:', err);
            
            // Einfachere Fehlerbehandlung ohne axios-Import
            const axiosError = err as any;
            setError(axiosError.response?.data?.error || axiosError.message || 'Ein unerwarteter Fehler ist aufgetreten');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setTitle('');
        setDescription('');
        setAssigneeType('user');
        setResponsibleId('');
        setRoleId('');
        setQualityControlId('');
        setBranchId('');
        setDueDate('');
        setError(null);
        setSelectedArticles([]);
        setTemporaryAttachments([]);
        onClose();
    };

    const handleAddArticle = (article: CerebroArticle) => {
        setSelectedArticles(prev => [...prev, article]);
    };
    
    const handleRemoveArticle = (articleId: number) => {
        setSelectedArticles(prev => prev.filter(a => a.id !== articleId));
    };

    // Für Mobile (unter 640px) - klassisches Modal
    if (isMobile) {
        return (
            <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
                <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
                
                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <Dialog.Panel className="mx-auto max-w-xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl">
                        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                            <Dialog.Title className="text-lg font-semibold dark:text-white">
                                Neue Aufgabe erstellen
                            </Dialog.Title>
                            <button
                                onClick={handleClose}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                            >
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>

                        <TaskForm 
                            error={error}
                            title={title}
                            setTitle={setTitle}
                            description={description}
                            setDescription={setDescription}
                            assigneeType={assigneeType}
                            setAssigneeType={setAssigneeType}
                            responsibleId={responsibleId}
                            setResponsibleId={setResponsibleId}
                            roleId={roleId}
                            setRoleId={setRoleId}
                            qualityControlId={qualityControlId}
                            setQualityControlId={setQualityControlId}
                            branchId={branchId}
                            setBranchId={setBranchId}
                            dueDate={dueDate}
                            setDueDate={setDueDate}
                            users={users}
                            roles={roles}
                            branches={branches}
                            loading={loading}
                            handleSubmit={handleSubmit}
                            handleClose={handleClose}
                            selectedArticles={selectedArticles}
                            onArticleSelect={handleAddArticle}
                            onArticleRemove={handleRemoveArticle}
                            uploading={uploading}
                            temporaryAttachments={temporaryAttachments}
                            onFileUpload={handleFileUpload}
                            onRemoveAttachment={handleRemoveTemporaryAttachment}
                            textareaRef={textareaRef}
                            fileInputRef={fileInputRef}
                            handlePaste={handlePaste}
                            handleDrop={handleDrop}
                            handleDragOver={handleDragOver}
                        />
                    </Dialog.Panel>
                </div>
            </Dialog>
        );
    }
    
    // Für Desktop (ab 640px) - Sidepane
    return (
        <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
            {/* Semi-transparenter Hintergrund für den Rest der Seite */}
            <div 
                className="fixed inset-0 bg-black/10 transition-opacity" 
                aria-hidden="true" 
                onClick={handleClose}
            />
            
            {/* Sidepane von rechts einfahren */}
            <div 
                className={`fixed inset-y-0 right-0 max-w-sm w-full bg-white dark:bg-gray-800 shadow-xl transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                    <Dialog.Title className="text-lg font-semibold dark:text-white">
                        Neue Aufgabe erstellen
                    </Dialog.Title>
                    <button
                        onClick={handleClose}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    >
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-4 overflow-y-auto h-full">
                    <TaskForm 
                        error={error}
                        title={title}
                        setTitle={setTitle}
                        description={description}
                        setDescription={setDescription}
                        assigneeType={assigneeType}
                        setAssigneeType={setAssigneeType}
                        responsibleId={responsibleId}
                        setResponsibleId={setResponsibleId}
                        roleId={roleId}
                        setRoleId={setRoleId}
                        qualityControlId={qualityControlId}
                        setQualityControlId={setQualityControlId}
                        branchId={branchId}
                        setBranchId={setBranchId}
                        dueDate={dueDate}
                        setDueDate={setDueDate}
                        users={users}
                        roles={roles}
                        branches={branches}
                        loading={loading}
                        handleSubmit={handleSubmit}
                        handleClose={handleClose}
                        selectedArticles={selectedArticles}
                        onArticleSelect={handleAddArticle}
                        onArticleRemove={handleRemoveArticle}
                        uploading={uploading}
                        temporaryAttachments={temporaryAttachments}
                        onFileUpload={handleFileUpload}
                        onRemoveAttachment={handleRemoveTemporaryAttachment}
                        textareaRef={textareaRef}
                        fileInputRef={fileInputRef}
                        handlePaste={handlePaste}
                        handleDrop={handleDrop}
                        handleDragOver={handleDragOver}
                    />
                </div>
            </div>
        </Dialog>
    );
};

// Ausgelagerte Formular-Komponente, um Code-Duplizierung zu vermeiden
interface TaskFormProps {
    error: string | null;
    title: string;
    setTitle: (value: string) => void;
    description: string;
    setDescription: (value: string) => void;
    assigneeType: 'user' | 'role';
    setAssigneeType: (value: 'user' | 'role') => void;
    responsibleId: number | '';
    setResponsibleId: (value: number | '') => void;
    roleId: number | '';
    setRoleId: (value: number | '') => void;
    qualityControlId: number | '';
    setQualityControlId: (value: number | '') => void;
    branchId: number | '';
    setBranchId: (value: number | '') => void;
    dueDate: string;
    setDueDate: (value: string) => void;
    users: User[];
    roles: Role[];
    branches: Branch[];
    loading: boolean;
    handleSubmit: (e: React.FormEvent) => Promise<void>;
    handleClose: () => void;
    selectedArticles: CerebroArticle[];
    onArticleSelect: (article: CerebroArticle) => void;
    onArticleRemove: (articleId: number) => void;
    uploading?: boolean;
    temporaryAttachments?: TaskAttachment[];
    onFileUpload?: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
    onRemoveAttachment?: (index: number) => void;
    textareaRef?: React.RefObject<HTMLTextAreaElement>;
    fileInputRef?: React.RefObject<HTMLInputElement>;
    handlePaste?: (event: React.ClipboardEvent) => Promise<void>;
    handleDrop?: (event: React.DragEvent) => Promise<void>;
    handleDragOver?: (event: React.DragEvent) => void;
}

const TaskForm: React.FC<TaskFormProps> = ({
    error,
    title,
    setTitle,
    description,
    setDescription,
    assigneeType,
    setAssigneeType,
    responsibleId,
    setResponsibleId,
    roleId,
    setRoleId,
    qualityControlId,
    setQualityControlId,
    branchId,
    setBranchId,
    dueDate,
    setDueDate,
    users,
    roles,
    branches,
    loading,
    handleSubmit,
    handleClose,
    selectedArticles,
    onArticleSelect,
    onArticleRemove,
    uploading = false,
    temporaryAttachments = [],
    onFileUpload,
    onRemoveAttachment,
    textareaRef,
    fileInputRef,
    handlePaste,
    handleDrop,
    handleDragOver,
}) => {
    const [activeTab, setActiveTab] = useState<'data' | 'cerebro'>('data');
    
    return (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {error && (
                <div className="bg-red-100 dark:bg-red-900 border-l-4 border-red-500 dark:border-red-700 text-red-700 dark:text-red-300 p-4 mb-4">
                    <p>{error}</p>
                </div>
            )}

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
                            Titel *
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

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="description_sidepane" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Beschreibung
                            </label>
                            <div className="relative">
                                <textarea
                                    ref={textareaRef}
                                    id="description_task_create"
                                    rows={6}
                                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    onPaste={handlePaste}
                                    onDrop={handleDrop}
                                    onDragOver={handleDragOver}
                                    placeholder="Text, Bilder oder Dateien hier einfügen..."
                                />
                                {/* Heftklammer-Icon zum Hinzufügen von Dateien */}
                                <button
                                    type="button"
                                    onClick={() => fileInputRef?.current?.click()}
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
                                    onChange={onFileUpload}
                                    className="hidden"
                                />
                                {uploading && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-800 bg-opacity-70 dark:bg-opacity-70">
                                        <span className="text-sm text-gray-500 dark:text-gray-400">Wird hochgeladen...</span>
                                    </div>
                                )}
                            </div>
                            {/* Anzeige der temporären Anhänge direkt unter dem Textfeld */}
                            {temporaryAttachments && temporaryAttachments.length > 0 && (
                                <div className="mt-2">
                                    <ul className="flex flex-wrap gap-2">
                                        {temporaryAttachments.map((attachment, index) => (
                                            <li key={index} className="inline-flex items-center bg-gray-100 dark:bg-gray-700 rounded-md px-2 py-1 relative group">
                                                <span className="text-sm font-medium text-gray-800 dark:text-gray-300">
                                                    {attachment.fileName}
                                                </span>
                                                <div className="flex ml-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => onRemoveAttachment?.(index)}
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
                                                    <div className="absolute z-10 invisible group-hover:visible bg-white dark:bg-gray-800 p-2 rounded-md shadow-lg -top-32 left-0 border border-gray-200 dark:border-gray-700">
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
                            )}
                            {description && (
                                <div className="mt-3">
                                    <MarkdownPreview 
                                        content={description} 
                                        temporaryAttachments={temporaryAttachments}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Verantwortlich für *
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
                                        setRoleId('');
                                    }}
                                />
                                <span className="ml-2 dark:text-gray-300">Benutzer</span>
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
                                        setResponsibleId('');
                                    }}
                                />
                                <span className="ml-2 dark:text-gray-300">Rolle</span>
                            </label>
                        </div>
                    </div>

                    {assigneeType === 'user' ? (
                        <div>
                            <label htmlFor="responsible" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Verantwortlicher Benutzer *
                            </label>
                            <select
                                id="responsible"
                                value={responsibleId}
                                onChange={(e) => setResponsibleId(e.target.value ? Number(e.target.value) : '')}
                                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                required
                            >
                                <option value="">Bitte wählen</option>
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
                                Verantwortliche Rolle *
                            </label>
                            <select
                                id="role"
                                value={roleId}
                                onChange={(e) => setRoleId(e.target.value ? Number(e.target.value) : '')}
                                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                required
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
                        <label htmlFor="qualityControl" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Qualitätskontrolle
                        </label>
                        <select
                            id="qualityControl"
                            value={qualityControlId}
                            onChange={(e) => setQualityControlId(e.target.value ? Number(e.target.value) : '')}
                            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        >
                            <option value="">Keine Qualitätskontrolle</option>
                            {Array.isArray(users) && users.map(user => (
                                <option key={user.id} value={user.id}>
                                    {user.firstName} {user.lastName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="branch" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Niederlassung *
                        </label>
                        <select
                            id="branch"
                            value={branchId}
                            onChange={(e) => setBranchId(Number(e.target.value))}
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
                            Fälligkeitsdatum
                        </label>
                        <input
                            type="date"
                            id="dueDate"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                    </div>
                </>
            )}

            {/* Cerebro Articles Tab Content */}
            {activeTab === 'cerebro' && (
                <div>
                    <div className="mb-4">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Verknüpfte Cerebro-Artikel</h3>
                        
                        {selectedArticles.length > 0 ? (
                            <ul className="mt-2 space-y-2">
                                {selectedArticles.map(article => (
                                    <li key={article.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded">
                                        <span className="dark:text-gray-300">{article.title}</span>
                                        <button
                                            type="button"
                                            onClick={() => onArticleRemove(article.id)}
                                            className="text-red-600 hover:text-red-800"
                                        >
                                            Entfernen
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Keine Artikel verknüpft</p>
                        )}
                    </div>
                    
                    <CerebroArticleSelector
                        onArticleSelected={onArticleSelect}
                        excludeArticleIds={selectedArticles.map(a => a.id)}
                        selectedArticles={selectedArticles}
                        onArticleRemove={onArticleRemove}
                    />
                </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
                <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                >
                    Abbrechen
                </button>
                <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-700 dark:hover:bg-blue-800"
                    disabled={loading}
                >
                    {loading ? 'Wird erstellt...' : 'Erstellen'}
                </button>
            </div>
        </form>
    );
};

export default CreateTaskModal; 
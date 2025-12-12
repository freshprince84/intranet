import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@headlessui/react';
import { PencilIcon, TrashIcon, PlusIcon, XMarkIcon, CheckIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { API_ENDPOINTS } from '../config/api.ts';
import axiosInstance from '../config/axios.ts';
import { usePermissions } from '../hooks/usePermissions.ts';
import FilterPane from '../components/FilterPane.tsx';
import SavedFilterTags from '../components/SavedFilterTags.tsx';
import { useFilterContext } from '../contexts/FilterContext.tsx';
import { FilterCondition } from '../components/FilterRow.tsx';
import { useSidepane } from '../contexts/SidepaneContext.tsx';
import RoomDescriptionsSection from './branches/RoomDescriptionsSection.tsx';
import { useError } from '../contexts/ErrorContext.tsx';
import { logger } from '../utils/logger.ts';

interface Branch {
    id: number;
    name: string;
    whatsappSettings?: any;
    lobbyPmsSettings?: any;
    boldPaymentSettings?: any;
    doorSystemSettings?: any;
    emailSettings?: any;
}

interface BranchManagementTabProps {
}

// BranchCard-Komponente für mobile und Desktop-Ansicht
const BranchCard: React.FC<{
    branch: Branch;
    onEdit: (branch: Branch) => void;
    onDelete: (branchId: number) => void;
    canEdit: boolean;
    canDelete: boolean;
}> = ({ branch, onEdit, onDelete, canEdit, canDelete }) => {
    const { t } = useTranslation();
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
            {/* Header mit Branchname und Aktionen */}
            <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">{branch.name}</h3>
                
                <div className="flex space-x-2">
                    {canEdit && (
                        <div className="relative group">
                            <button
                                onClick={() => onEdit(branch)}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1"
                            >
                                <PencilIcon className="h-5 w-5" />
                            </button>
                            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                {t('common.edit', { defaultValue: 'Bearbeiten' })}
                            </div>
                        </div>
                    )}
                    
                    {canDelete && (
                        <div className="relative group">
                            <button
                                onClick={() => onDelete(branch.id)}
                                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-1"
                            >
                                <TrashIcon className="h-5 w-5" />
                            </button>
                            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                {t('common.delete', { defaultValue: 'Löschen' })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// TableID für gespeicherte Filter
const BRANCHES_TABLE_ID = 'branches-table';

const BranchManagementTab: React.FC<BranchManagementTabProps> = () => {
    const { t } = useTranslation();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({ 
        name: '',
        whatsappSettings: {
            provider: 'whatsapp-business-api' as 'twilio' | 'whatsapp-business-api',
            apiKey: '',
            apiSecret: '',
            phoneNumberId: '',
            ai: {
                enabled: false,
                model: 'gpt-4o',
                systemPrompt: '',
                rules: [] as string[],
                sources: [] as string[],
                temperature: 0.7,
                maxTokens: 500
            }
        },
        lobbyPmsSettings: {
            apiUrl: '',
            apiKey: '',
            propertyId: '',
            syncEnabled: true,
            autoCreateTasks: false,
            lateCheckInThreshold: '22:00',
            notificationChannels: ['email'] as string[],
            autoSendInvitation: false
        },
        boldPaymentSettings: {
            apiKey: '',
            merchantId: '',
            environment: 'sandbox' as 'sandbox' | 'production'
        },
        doorSystemSettings: {
            clientId: '',
            clientSecret: '',
            username: '',
            password: '',
            apiUrl: 'https://euopen.ttlock.com',
            lockIds: [] as string[],
            appName: 'TTLock'
        },
        emailSettings: {
            smtpHost: '',
            smtpPort: 587,
            smtpUser: '',
            smtpPass: '',
            smtpFromEmail: '',
            smtpFromName: '',
            imap: {
                enabled: false,
                host: '',
                port: 993,
                secure: true,
                user: '',
                password: '',
                folder: 'INBOX',
                processedFolder: ''
            }
        },
        messageTemplates: {
            checkInInvitation: {
                en: {
                    whatsappTemplateName: '',
                    whatsappTemplateParams: [] as string[],
                    emailSubject: '',
                    emailContent: ''
                },
                es: {
                    whatsappTemplateName: '',
                    whatsappTemplateParams: [] as string[],
                    emailSubject: '',
                    emailContent: ''
                },
                de: {
                    whatsappTemplateName: '',
                    whatsappTemplateParams: [] as string[],
                    emailSubject: '',
                    emailContent: ''
                }
            },
            checkInConfirmation: {
                en: {
                    whatsappTemplateName: '',
                    whatsappTemplateParams: [] as string[],
                    emailSubject: '',
                    emailContent: ''
                },
                es: {
                    whatsappTemplateName: '',
                    whatsappTemplateParams: [] as string[],
                    emailSubject: '',
                    emailContent: ''
                },
                de: {
                    whatsappTemplateName: '',
                    whatsappTemplateParams: [] as string[],
                    emailSubject: '',
                    emailContent: ''
                }
            }
        },
        autoSendReservationInvitation: false
    });
    const [activeSettingsTab, setActiveSettingsTab] = useState<'whatsapp' | 'lobbypms' | 'boldpayment' | 'doorsystem' | 'email' | 'messages'>('whatsapp');
    const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
    const [selectedTemplateType, setSelectedTemplateType] = useState<'checkInInvitation' | 'checkInConfirmation'>('checkInInvitation');
    const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'es' | 'de'>('en');
    const [searchTerm, setSearchTerm] = useState('');
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([]);
    const [filterLogicalOperators, setFilterLogicalOperators] = useState<('AND' | 'OR')[]>([]);
    const [activeFilterName, setActiveFilterName] = useState<string>('');
    const [selectedFilterId, setSelectedFilterId] = useState<number | null>(null);
    const [displayLimit, setDisplayLimit] = useState(10);
    const { hasPermission } = usePermissions();
    const { openSidepane, closeSidepane } = useSidepane();
    const { handleError: handleErrorContext } = useError();

    // Berechtigungen prüfen
    const canCreate = hasPermission('branches', 'write', 'table');
    const canEdit = hasPermission('branches', 'write', 'table');
    const canDelete = hasPermission('branches', 'write', 'table');

    // Branches laden
    const fetchBranches = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axiosInstance.get(API_ENDPOINTS.BRANCHES.BASE);
            setBranches(response.data);
        } catch (error: any) {
            console.error('Fehler beim Laden der Niederlassungen:', error);
            handleErrorContext(error);
        } finally {
            setLoading(false);
        }
    }, [handleErrorContext]);

    useEffect(() => {
        fetchBranches();
    }, [fetchBranches]);

    // Sidepane öffnen/schließen basierend auf Modal-Status
    useEffect(() => {
        if (isModalOpen) {
            openSidepane();
        } else {
            closeSidepane();
        }
        
        return () => {
            closeSidepane();
        };
    }, [isModalOpen, openSidepane, closeSidepane]);

    // Formular zurücksetzen
    const resetForm = () => {
        setFormData({ 
            name: '',
            whatsappSettings: {
                provider: 'whatsapp-business-api' as 'twilio' | 'whatsapp-business-api',
                apiKey: '',
                apiSecret: '',
                phoneNumberId: '',
                ai: {
                    enabled: false,
                    model: 'gpt-4o',
                    systemPrompt: '',
                    rules: [] as string[],
                    sources: [] as string[],
                    temperature: 0.7,
                    maxTokens: 500
                }
            },
            lobbyPmsSettings: {
                apiUrl: '',
                apiKey: '',
                propertyId: '',
                syncEnabled: true,
                autoCreateTasks: false,
                lateCheckInThreshold: '22:00',
                notificationChannels: ['email'] as string[],
                autoSendInvitation: false
            },
            boldPaymentSettings: {
                apiKey: '',
                merchantId: '',
                environment: 'sandbox' as 'sandbox' | 'production'
            },
            doorSystemSettings: {
                clientId: '',
                clientSecret: '',
                username: '',
                password: '',
                apiUrl: 'https://euopen.ttlock.com',
                lockIds: [] as string[],
                appName: 'TTLock'
            },
            sireSettings: {
                enabled: false,
                autoRegisterOnCheckIn: false,
                apiUrl: '',
                apiKey: '',
                apiSecret: '',
                propertyCode: ''
            },
            emailSettings: {
                smtpHost: '',
                smtpPort: 587,
                smtpUser: '',
                smtpPass: '',
                smtpFromEmail: '',
                smtpFromName: '',
                imap: {
                    enabled: false,
                    host: '',
                    port: 993,
                    secure: true,
                    user: '',
                    password: '',
                    folder: 'INBOX',
                    processedFolder: ''
                }
            },
            messageTemplates: {
                checkInInvitation: {
                    en: {
                        whatsappTemplateName: '',
                        whatsappTemplateParams: [] as string[],
                        emailSubject: '',
                        emailContent: ''
                    },
                    es: {
                        whatsappTemplateName: '',
                        whatsappTemplateParams: [] as string[],
                        emailSubject: '',
                        emailContent: ''
                    },
                    de: {
                        whatsappTemplateName: '',
                        whatsappTemplateParams: [] as string[],
                        emailSubject: '',
                        emailContent: ''
                    }
                },
                checkInConfirmation: {
                    en: {
                        whatsappTemplateName: '',
                        whatsappTemplateParams: [] as string[],
                        emailSubject: '',
                        emailContent: ''
                    },
                    es: {
                        whatsappTemplateName: '',
                        whatsappTemplateParams: [] as string[],
                        emailSubject: '',
                        emailContent: ''
                    },
                    de: {
                        whatsappTemplateName: '',
                        whatsappTemplateParams: [] as string[],
                        emailSubject: '',
                        emailContent: ''
                    }
                }
            },
            autoSendReservationInvitation: false
        });
        setActiveSettingsTab('whatsapp');
        setEditingBranch(null);
    };

    // Modal öffnen für neue Branch
    const handleCreate = () => {
        resetForm();
        setIsModalOpen(true);
    };

    // Modal öffnen für Bearbeitung
    const handleEdit = async (branch: Branch) => {
        setEditingBranch(branch);
        const existingWhatsapp = branch.whatsappSettings || {};
        const existingLobbyPms = branch.lobbyPmsSettings || {};
        // Bold Payment Settings: Prüfe ob es ein String ist (JSON) oder bereits ein Objekt
        let existingBoldPayment: any = branch.boldPaymentSettings;
        console.log('[BranchManagementTab] Branch.boldPaymentSettings (roh):', branch.boldPaymentSettings);
        console.log('[BranchManagementTab] Branch.boldPaymentSettings (typ):', typeof branch.boldPaymentSettings);
        if (!existingBoldPayment) {
            existingBoldPayment = {};
        } else if (typeof existingBoldPayment === 'string') {
            try {
                existingBoldPayment = JSON.parse(existingBoldPayment);
            } catch (e) {
                console.error('Fehler beim Parsen von boldPaymentSettings:', e);
                existingBoldPayment = {};
            }
        }
        console.log('[BranchManagementTab] existingBoldPayment (verarbeitet):', existingBoldPayment);
        console.log('[BranchManagementTab] existingBoldPayment.apiKey:', existingBoldPayment.apiKey);
        console.log('[BranchManagementTab] existingBoldPayment.merchantId:', existingBoldPayment.merchantId);
        const existingDoorSystem = branch.doorSystemSettings || {};
        const existingEmail = branch.emailSettings || {};
        const existingMessageTemplates = (branch as any).messageTemplates || {};
        const existingAutoSend = (branch as any).autoSendReservationInvitation || false;
        
        const newFormData = { 
            name: branch.name,
            whatsappSettings: {
                provider: existingWhatsapp.provider || 'whatsapp-business-api',
                apiKey: existingWhatsapp.apiKey || '',
                apiSecret: existingWhatsapp.apiSecret || '',
                phoneNumberId: existingWhatsapp.phoneNumberId || '',
                ai: existingWhatsapp.ai || {
                    enabled: false,
                    model: 'gpt-4o',
                    systemPrompt: '',
                    rules: [],
                    sources: [],
                    temperature: 0.7,
                    maxTokens: 500
                }
            },
            lobbyPmsSettings: {
                apiUrl: existingLobbyPms.apiUrl || '',
                apiKey: existingLobbyPms.apiKey || '',
                propertyId: existingLobbyPms.propertyId || '',
                syncEnabled: existingLobbyPms.syncEnabled !== undefined ? existingLobbyPms.syncEnabled : true,
                autoCreateTasks: existingLobbyPms.autoCreateTasks || false,
                lateCheckInThreshold: existingLobbyPms.lateCheckInThreshold || '22:00',
                notificationChannels: existingLobbyPms.notificationChannels || ['email'],
                autoSendInvitation: existingLobbyPms.autoSendInvitation || false
            },
            boldPaymentSettings: {
                apiKey: existingBoldPayment.apiKey || '',
                merchantId: existingBoldPayment.merchantId || '',
                environment: existingBoldPayment.environment || 'sandbox'
            },
            doorSystemSettings: {
                clientId: existingDoorSystem.clientId || '',
                clientSecret: existingDoorSystem.clientSecret || '',
                username: existingDoorSystem.username || '',
                password: existingDoorSystem.password || '',
                apiUrl: existingDoorSystem.apiUrl || 'https://euopen.ttlock.com',
                lockIds: existingDoorSystem.lockIds || [],
                appName: existingDoorSystem.appName || 'TTLock'
            },
            emailSettings: {
                smtpHost: existingEmail.smtpHost || '',
                smtpPort: existingEmail.smtpPort || 587,
                smtpUser: existingEmail.smtpUser || '',
                smtpPass: existingEmail.smtpPass || '',
                smtpFromEmail: existingEmail.smtpFromEmail || '',
                smtpFromName: existingEmail.smtpFromName || '',
                imap: existingEmail.imap || {
                    enabled: false,
                    host: '',
                    port: 993,
                    secure: true,
                    user: '',
                    password: '',
                    folder: 'INBOX',
                    processedFolder: ''
                }
            },
            messageTemplates: existingMessageTemplates || {
                checkInInvitation: {
                    en: { whatsappTemplateName: '', whatsappTemplateParams: [], emailSubject: '', emailContent: '' },
                    es: { whatsappTemplateName: '', whatsappTemplateParams: [], emailSubject: '', emailContent: '' },
                    de: { whatsappTemplateName: '', whatsappTemplateParams: [], emailSubject: '', emailContent: '' }
                },
                checkInConfirmation: {
                    en: { whatsappTemplateName: '', whatsappTemplateParams: [], emailSubject: '', emailContent: '' },
                    es: { whatsappTemplateName: '', whatsappTemplateParams: [], emailSubject: '', emailContent: '' },
                    de: { whatsappTemplateName: '', whatsappTemplateParams: [], emailSubject: '', emailContent: '' }
                }
            },
            autoSendReservationInvitation: existingAutoSend
        };
        console.log('[BranchManagementTab] newFormData.boldPaymentSettings:', newFormData.boldPaymentSettings);
        setFormData(newFormData);
        setIsModalOpen(true);
    };

    // Modal schließen
    const handleCloseModal = () => {
        setIsModalOpen(false);
        resetForm();
    };

    // Formular absenden
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.name.trim()) {
            handleErrorContext({ message: t('branches.nameRequired') });
            return;
        }

        try {
            if (editingBranch) {
                // Branch aktualisieren
                await axiosInstance.put(API_ENDPOINTS.BRANCHES.UPDATE(editingBranch.id), {
                    name: formData.name.trim(),
                    whatsappSettings: formData.whatsappSettings,
                    lobbyPmsSettings: formData.lobbyPmsSettings,
                    boldPaymentSettings: formData.boldPaymentSettings,
                    doorSystemSettings: formData.doorSystemSettings,
                    emailSettings: formData.emailSettings,
                    messageTemplates: formData.messageTemplates,
                    autoSendReservationInvitation: formData.autoSendReservationInvitation
                });
            } else {
                // Neue Branch erstellen
                await axiosInstance.post(API_ENDPOINTS.BRANCHES.CREATE, {
                    name: formData.name.trim()
                });
            }
            
            await fetchBranches();
            handleCloseModal();
        } catch (error: any) {
            console.error('Fehler beim Speichern der Niederlassung:', error);
            handleErrorContext(error);
        }
    };

    // Branch löschen
    const handleDelete = async (branchId: number) => {
        if (!window.confirm(t('branches.deleteConfirm', { defaultValue: 'Möchten Sie diese Niederlassung wirklich löschen?' }))) {
            return;
        }

        try {
            await axiosInstance.delete(API_ENDPOINTS.BRANCHES.DELETE(branchId));
            await fetchBranches();
        } catch (error: any) {
            console.error('Fehler beim Löschen der Niederlassung:', error);
            handleErrorContext(error);
        }
    };

    // Funktion zum Zählen der aktiven Filter
    const getActiveFilterCount = () => {
        return filterConditions.length;
    };

    // Filtern und sortieren der Branches
    const filteredAndSortedBranches = useMemo(() => {
        return branches
            .filter(branch => {
                // Globale Suche
                if (searchTerm) {
                    const searchLower = searchTerm.toLowerCase();
                    const matchesSearch = branch.name.toLowerCase().includes(searchLower);
                    
                    if (!matchesSearch) return false;
                }
                
                // Prüfe erweiterte Filterbedingungen, wenn vorhanden
                if (filterConditions.length > 0) {
                    let result = filterConditions.length > 0;
                    
                    for (let i = 0; i < filterConditions.length; i++) {
                        const condition = filterConditions[i];
                        let conditionMet = false;
                        
                        switch (condition.column) {
                            case 'name':
                                // ✅ OPTIMIERUNG: toLowerCase() nur einmal pro Wert
                                const branchNameLower = branch.name.toLowerCase();
                                const conditionValueLower = (condition.value as string || '').toLowerCase();
                                if (condition.operator === 'equals') {
                                    conditionMet = branchNameLower === conditionValueLower;
                                } else if (condition.operator === 'contains') {
                                    conditionMet = branchNameLower.includes(conditionValueLower);
                                } else if (condition.operator === 'startsWith') {
                                    conditionMet = branchNameLower.startsWith(conditionValueLower);
                                }
                                break;
                        }
                        
                        // Verknüpfe das Ergebnis dieser Bedingung mit dem Gesamtergebnis
                        if (i === 0) {
                            result = conditionMet;
                        } else {
                            const operator = filterLogicalOperators[i - 1];
                            result = operator === 'AND' ? (result && conditionMet) : (result || conditionMet);
                        }
                    }
                    
                    if (!result) return false;
                }
                
                return true;
            })
            .sort((a, b) => {
                // ✅ OPTIMIERUNG: toLowerCase() für konsistente Sortierung
                return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
            });
    }, [branches, searchTerm, filterConditions, filterLogicalOperators]);

    // Funktion zum Anwenden von Filterbedingungen
    const applyFilterConditions = (conditions: FilterCondition[], operators: ('AND' | 'OR')[]) => {
        setFilterConditions(conditions);
        setFilterLogicalOperators(operators);
    };
    
    // Funktion zum Zurücksetzen der Filter
    const resetFilterConditions = () => {
        setFilterConditions([]);
        setFilterLogicalOperators([]);
        setActiveFilterName('');
        setSelectedFilterId(null);
    };
    
    // Filter Change Handler (Controlled Mode)
    const handleFilterChange = async (name: string, id: number | null, conditions: FilterCondition[], operators: ('AND' | 'OR')[]) => {
        setActiveFilterName(name);
        setSelectedFilterId(id);
        applyFilterConditions(conditions, operators);
    };
    
    // ✅ STANDARD: Filter-Laden und Default-Filter-Anwendung
    const filterContext = useFilterContext();
    const { loadFilters } = filterContext;
    
    useEffect(() => {
        const initialize = async () => {
            // 1. Filter laden (wartet auf State-Update)
            const filters = await loadFilters(BRANCHES_TABLE_ID);
            
            // 2. Default-Filter anwenden (IMMER vorhanden!)
            const defaultFilter = filters.find(f => f.name === 'Alle');
            if (defaultFilter) {
                await handleFilterChange(
                    defaultFilter.name,
                    defaultFilter.id,
                    defaultFilter.conditions,
                    defaultFilter.operators
                );
                return; // Filter wird angewendet
            }
            
            // 3. Fallback: Kein Filter (sollte nie passieren)
            // BranchManagementTab filtert client-seitig, daher keine Daten-Lade-Funktion nötig
        };
        
        initialize();
    }, [loadFilters, handleFilterChange]);

    // Standard-Filter erstellen und speichern
    useEffect(() => {
        const createStandardFilters = async () => {
            try {
                const token = localStorage.getItem('token');
                
                if (!token) {
                    console.error(t('common.notAuthenticated'));
                    return;
                }

                // Prüfen, ob die Standard-Filter bereits existieren
                const existingFiltersResponse = await axiosInstance.get(
                    API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(BRANCHES_TABLE_ID)
                );

                const existingFilters = existingFiltersResponse.data || [];
                const alleFilterExists = existingFilters.some((filter: any) => filter.name === 'Alle');

                // Erstelle "Alle"-Filter, wenn er noch nicht existiert
                if (!alleFilterExists) {
                    const alleFilter = {
                        tableId: BRANCHES_TABLE_ID,
                        name: 'Alle',
                        conditions: [],
                        operators: []
                    };

                    await axiosInstance.post(
                        API_ENDPOINTS.SAVED_FILTERS.BASE,
                        alleFilter
                    );
                    if (process.env.NODE_ENV === 'development') {
                    logger.log(t('branches.filterCreated'));
                    }
                }
            } catch (error) {
                console.error(t('branches.createStandardFiltersError'), error);
            }
        };

        createStandardFilters();
    }, []);


    // Branches rendern
    const renderBranches = () => {
        if (filteredAndSortedBranches.length === 0) {
            return (
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded text-center">
                    <p className="text-gray-600 dark:text-gray-400">
                        {t('branches.noBranches', { defaultValue: 'Keine Niederlassungen gefunden. Erstellen Sie eine neue Niederlassung mit dem Button oben.' })}
                    </p>
                </div>
            );
        }
        
        // Card-Ansicht
        return (
            <>
                <div className="space-y-4">
                    {filteredAndSortedBranches.slice(0, displayLimit).map((branch) => (
                        <BranchCard 
                            key={branch.id} 
                            branch={branch} 
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            canEdit={canEdit}
                            canDelete={canDelete}
                        />
                    ))}
                </div>
                
                {/* "Mehr anzeigen" Button */}
                {filteredAndSortedBranches.length > displayLimit && (
                    <div className="mt-4 flex justify-center">
                        <button
                            className="px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-300 rounded-md hover:bg-blue-50 dark:bg-gray-800 dark:text-blue-400 dark:border-gray-700 dark:hover:bg-gray-700"
                            onClick={() => setDisplayLimit(prevLimit => prevLimit + 10)}
                        >
                            {t('common.showMore', { defaultValue: 'Mehr anzeigen' })} ({filteredAndSortedBranches.length - displayLimit} {t('common.remaining', { defaultValue: 'verbleibend' })})
                        </button>
                    </div>
                )}
            </>
        );
    };

    // Mobile-Erkennung
    const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
    
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 640);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div>
            {/* Spaltenanzeige und Suche */}
            <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                    {/* Linke Seite: "Neue Niederlassung erstellen"-Button */}
                    <div className="flex items-center">
                        {canCreate && (
                            <div className="relative group">
                                <button
                                    onClick={handleCreate}
                                    className="bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 p-1.5 rounded-full hover:bg-blue-50 dark:hover:bg-gray-700 border border-blue-200 dark:border-gray-700 shadow-sm flex items-center justify-center"
                                    style={{ width: '30.19px', height: '30.19px' }}
                                    aria-label={t('branches.create', { defaultValue: 'Neue Niederlassung' })}
                                >
                                    <PlusIcon className="h-4 w-4" />
                                </button>
                                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                    {t('branches.create', { defaultValue: 'Neue Niederlassung' })}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Mitte: Titel - Kein Titel in der Mitte notwendig bei dieser Komponente, da der Tab-Header bereits den Titel zeigt */}
                    <div></div>
                    
                    {/* Rechte Seite: Suchfeld, Filter-Button */}
                    <div className="flex items-center gap-1.5">
                        <input
                            type="text"
                            placeholder={t('common.search', { defaultValue: 'Suchen...' })}
                            className="w-[200px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <div className="relative group ml-1">
                            <button
                                className={`p-2 rounded-md ${getActiveFilterCount() > 0 ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'} relative`}
                                onClick={() => setIsFilterModalOpen(!isFilterModalOpen)}
                            >
                                <FunnelIcon className="w-5 h-5" />
                                {getActiveFilterCount() > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center">
                                        {getActiveFilterCount()}
                                    </span>
                                )}
                            </button>
                            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                {t('common.filter', { defaultValue: 'Filter' })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filter-Modal */}
                {isFilterModalOpen && (
                    <FilterPane
                        columns={[
                            { id: 'name', label: t('branches.name', { defaultValue: 'Name' }) }
                        ]}
                        onApply={applyFilterConditions}
                        onReset={resetFilterConditions}
                        savedConditions={filterConditions}
                        savedOperators={filterLogicalOperators}
                        tableId={BRANCHES_TABLE_ID}
                    />
                )}
                
                {/* Gespeicherte Filter als Tags anzeigen */}
                <SavedFilterTags
                    tableId={BRANCHES_TABLE_ID}
                    onSelectFilter={applyFilterConditions}
                    onReset={resetFilterConditions}
                    activeFilterName={activeFilterName}
                    selectedFilterId={selectedFilterId}
                    onFilterChange={handleFilterChange}
                    defaultFilterName="Alle"
                />

                {loading ? (
                    <div className="flex justify-center items-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                ) : (
                    renderBranches()
                )}
            </div>

            {/* Modal/Sidepane für Branch-Erstellung/Bearbeitung */}
            {isModalOpen && (
                <>
                    {/* Mobile (unter 640px) - Modal */}
                    {isMobile ? (
                        <Dialog open={isModalOpen} onClose={handleCloseModal} className="relative z-50">
                            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
                            
                            <div className="fixed inset-0 flex items-center justify-center p-4">
                                <Dialog.Panel className="mx-auto max-w-sm w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl">
                                    {/* Header */}
                                    <div className="px-6 py-4 border-b dark:border-gray-700 flex-shrink-0">
                                        <div className="flex items-center justify-between">
                                            <Dialog.Title className="text-lg font-semibold dark:text-white">
                                                {editingBranch 
                                                    ? t('branches.edit', { defaultValue: 'Niederlassung bearbeiten' })
                                                    : t('branches.create', { defaultValue: 'Neue Niederlassung' })
                                                }
                                            </Dialog.Title>
                                            <button
                                                onClick={handleCloseModal}
                                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                            >
                                                <XMarkIcon className="h-6 w-6" />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {/* Form */}
                                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                {t('branches.name', { defaultValue: 'Name' })}
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                required
                                                autoFocus
                                            />
                                        </div>

                                        {/* Settings Tabs - nur beim Bearbeiten */}
                                        {editingBranch && (
                                            <>
                                                {/* Tab Navigation */}
                                                <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
                                                    <nav className="-mb-px flex space-x-2 overflow-x-auto">
                                                        {['whatsapp', 'lobbypms', 'boldpayment', 'doorsystem', 'email', 'messages'].map((tab) => (
                                                            <button
                                                                key={tab}
                                                                type="button"
                                                                onClick={() => setActiveSettingsTab(tab as any)}
                                                                className={`py-2 px-2 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                                                                    activeSettingsTab === tab
                                                                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                                                }`}
                                                            >
                                                                {tab === 'whatsapp' ? 'WhatsApp' : tab === 'lobbypms' ? 'LobbyPMS' : tab === 'boldpayment' ? 'Bold Payment' : tab === 'doorsystem' ? 'TTLock' : tab === 'email' ? 'Email' : t('branches.messagesTab', { defaultValue: 'Nachrichten' })}
                                                            </button>
                                                        ))}
                                                    </nav>
                                                </div>

                                                {/* Tab Content */}
                                                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                                    {/* WhatsApp Settings Tab */}
                                                    {activeSettingsTab === 'whatsapp' && (
                                                        <div>
                                                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                                                                WhatsApp Settings
                                                            </h4>
                                                
                                                <div className="space-y-4">
                                                    <div>
                                                        <label htmlFor="whatsappProvider" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                            Provider
                                                        </label>
                                                        <select
                                                            id="whatsappProvider"
                                                            value={formData.whatsappSettings.provider}
                                                            onChange={(e) => setFormData({
                                                                ...formData,
                                                                whatsappSettings: {
                                                                    ...formData.whatsappSettings,
                                                                    provider: e.target.value as 'twilio' | 'whatsapp-business-api'
                                                                }
                                                            })}
                                                            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                        >
                                                            <option value="twilio">Twilio</option>
                                                            <option value="whatsapp-business-api">WhatsApp Business API</option>
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <label htmlFor="whatsappApiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                            API Key / Access Token
                                                        </label>
                                                        <div className="relative">
                                                            <input
                                                                type={showSecrets['whatsappApiKey'] ? 'text' : 'password'}
                                                                id="whatsappApiKey"
                                                                value={formData.whatsappSettings.apiKey}
                                                                onChange={(e) => setFormData({
                                                                    ...formData,
                                                                    whatsappSettings: {
                                                                        ...formData.whatsappSettings,
                                                                        apiKey: e.target.value
                                                                    }
                                                                })}
                                                                placeholder="API Key / Access Token"
                                                                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2 pr-10"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowSecrets(prev => ({ ...prev, whatsappApiKey: !prev.whatsappApiKey }))}
                                                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                                            >
                                                                {showSecrets['whatsappApiKey'] ? (
                                                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0L3 3m3.29 3.29L12 12m-5.71-5.71L12 12" />
                                                                    </svg>
                                                                ) : (
                                                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                    </svg>
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label htmlFor="whatsappPhoneNumberId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                            Phone Number ID
                                                        </label>
                                                        <input
                                                            type="text"
                                                            id="whatsappPhoneNumberId"
                                                            value={formData.whatsappSettings.phoneNumberId}
                                                            onChange={(e) => setFormData({
                                                                ...formData,
                                                                whatsappSettings: {
                                                                    ...formData.whatsappSettings,
                                                                    phoneNumberId: e.target.value
                                                                }
                                                            })}
                                                            placeholder="Phone Number ID"
                                                            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label htmlFor="whatsappApiSecret" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                            API Secret
                                                        </label>
                                                        <div className="relative">
                                                            <input
                                                                type={showSecrets['whatsappApiSecret'] ? 'text' : 'password'}
                                                                id="whatsappApiSecret"
                                                                value={formData.whatsappSettings.apiSecret}
                                                                onChange={(e) => setFormData({
                                                                    ...formData,
                                                                    whatsappSettings: {
                                                                        ...formData.whatsappSettings,
                                                                        apiSecret: e.target.value
                                                                    }
                                                                })}
                                                                placeholder="API Secret"
                                                                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2 pr-10"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowSecrets(prev => ({ ...prev, whatsappApiSecret: !prev.whatsappApiSecret }))}
                                                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                                            >
                                                                {showSecrets['whatsappApiSecret'] ? (
                                                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0L3 3m3.29 3.29L12 12m-5.71-5.71L12 12" />
                                                                    </svg>
                                                                ) : (
                                                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                    </svg>
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* AI Configuration */}
                                                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <h5 className="text-sm font-semibold text-gray-900 dark:text-white">
                                                                KI-Konfiguration (AI)
                                                            </h5>
                                                            <label className="relative inline-flex items-center cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={formData.whatsappSettings.ai.enabled}
                                                                    onChange={(e) => setFormData({
                                                                        ...formData,
                                                                        whatsappSettings: {
                                                                            ...formData.whatsappSettings,
                                                                            ai: {
                                                                                ...formData.whatsappSettings.ai,
                                                                                enabled: e.target.checked
                                                                            }
                                                                        }
                                                                    })}
                                                                    className="sr-only peer"
                                                                />
                                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                                                <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                                                                    {formData.whatsappSettings.ai.enabled ? 'Aktiviert' : 'Deaktiviert'}
                                                                </span>
                                                            </label>
                                                        </div>

                                                        {formData.whatsappSettings.ai.enabled && (
                                                            <div className="space-y-4">
                                                                <div>
                                                                    <label htmlFor="aiModel" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                        Modell
                                                                    </label>
                                                                    <select
                                                                        id="aiModel"
                                                                        value={formData.whatsappSettings.ai.model}
                                                                        onChange={(e) => setFormData({
                                                                            ...formData,
                                                                            whatsappSettings: {
                                                                                ...formData.whatsappSettings,
                                                                                ai: {
                                                                                    ...formData.whatsappSettings.ai,
                                                                                    model: e.target.value
                                                                                }
                                                                            }
                                                                        })}
                                                                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                    >
                                                                        <option value="gpt-4o">GPT-4o</option>
                                                                        <option value="gpt-4">GPT-4</option>
                                                                        <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                                                                    </select>
                                                                </div>

                                                                <div>
                                                                    <label htmlFor="aiSystemPrompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                        System Prompt
                                                                    </label>
                                                                    <textarea
                                                                        id="aiSystemPrompt"
                                                                        value={formData.whatsappSettings.ai.systemPrompt}
                                                                        onChange={(e) => setFormData({
                                                                            ...formData,
                                                                            whatsappSettings: {
                                                                                ...formData.whatsappSettings,
                                                                                ai: {
                                                                                    ...formData.whatsappSettings.ai,
                                                                                    systemPrompt: e.target.value
                                                                                }
                                                                            }
                                                                        })}
                                                                        rows={4}
                                                                        placeholder="Du bist ein hilfreicher Assistent für..."
                                                                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                    />
                                                                </div>

                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                        Regeln (eine pro Zeile)
                                                                    </label>
                                                                    <textarea
                                                                        value={formData.whatsappSettings.ai.rules.join('\n')}
                                                                        onChange={(e) => setFormData({
                                                                            ...formData,
                                                                            whatsappSettings: {
                                                                                ...formData.whatsappSettings,
                                                                                ai: {
                                                                                    ...formData.whatsappSettings.ai,
                                                                                    rules: e.target.value.split('\n').filter(r => r.trim())
                                                                                }
                                                                            }
                                                                        })}
                                                                        rows={3}
                                                                        placeholder="Antworte immer auf Spanisch&#10;Sei freundlich und professionell"
                                                                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                    />
                                                                </div>

                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                        Quellen/URLs (eine pro Zeile)
                                                                    </label>
                                                                    <textarea
                                                                        value={formData.whatsappSettings.ai.sources.join('\n')}
                                                                        onChange={(e) => setFormData({
                                                                            ...formData,
                                                                            whatsappSettings: {
                                                                                ...formData.whatsappSettings,
                                                                                ai: {
                                                                                    ...formData.whatsappSettings.ai,
                                                                                    sources: e.target.value.split('\n').filter(s => s.trim())
                                                                                }
                                                                            }
                                                                        })}
                                                                        rows={2}
                                                                        placeholder="https://wiki.example.com/manila-procedures&#10;https://wiki.example.com/faq"
                                                                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                    />
                                                                </div>

                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div>
                                                                        <label htmlFor="aiTemperature" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                            Temperature ({formData.whatsappSettings.ai.temperature})
                                                                        </label>
                                                                        <input
                                                                            type="range"
                                                                            id="aiTemperature"
                                                                            min="0"
                                                                            max="2"
                                                                            step="0.1"
                                                                            value={formData.whatsappSettings.ai.temperature}
                                                                            onChange={(e) => setFormData({
                                                                                ...formData,
                                                                                whatsappSettings: {
                                                                                    ...formData.whatsappSettings,
                                                                                    ai: {
                                                                                        ...formData.whatsappSettings.ai,
                                                                                        temperature: parseFloat(e.target.value)
                                                                                    }
                                                                                }
                                                                            })}
                                                                            className="mt-1 block w-full"
                                                                        />
                                                                    </div>

                                                                    <div>
                                                                        <label htmlFor="aiMaxTokens" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                            Max Tokens
                                                                        </label>
                                                                        <input
                                                                            type="number"
                                                                            id="aiMaxTokens"
                                                                            min="100"
                                                                            max="4000"
                                                                            step="100"
                                                                            value={formData.whatsappSettings.ai.maxTokens}
                                                                            onChange={(e) => setFormData({
                                                                                ...formData,
                                                                                whatsappSettings: {
                                                                                    ...formData.whatsappSettings,
                                                                                    ai: {
                                                                                        ...formData.whatsappSettings.ai,
                                                                                        maxTokens: parseInt(e.target.value) || 500
                                                                                    }
                                                                                }
                                                                            })}
                                                                            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                                    {/* LobbyPMS Settings Tab */}
                                                    {activeSettingsTab === 'lobbypms' && (
                                                        <div>
                                                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                                                                LobbyPMS Settings
                                                            </h4>
                                                            <div className="space-y-4">
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                        API URL
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        value={formData.lobbyPmsSettings.apiUrl}
                                                                        onChange={(e) => setFormData({
                                                                            ...formData,
                                                                            lobbyPmsSettings: { ...formData.lobbyPmsSettings, apiUrl: e.target.value }
                                                                        })}
                                                                        placeholder="https://api.lobbypms.com"
                                                                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                        API Key
                                                                    </label>
                                                                    <input
                                                                        type={showSecrets['lobbyPmsApiKey'] ? 'text' : 'password'}
                                                                        value={formData.lobbyPmsSettings.apiKey}
                                                                        onChange={(e) => setFormData({
                                                                            ...formData,
                                                                            lobbyPmsSettings: { ...formData.lobbyPmsSettings, apiKey: e.target.value }
                                                                        })}
                                                                        placeholder="API Key"
                                                                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                        Property ID
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        value={formData.lobbyPmsSettings.propertyId}
                                                                        onChange={(e) => setFormData({
                                                                            ...formData,
                                                                            lobbyPmsSettings: { ...formData.lobbyPmsSettings, propertyId: e.target.value }
                                                                        })}
                                                                        placeholder="Property ID"
                                                                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                    />
                                                                </div>
                                                            </div>
                                                            
                                                            {/* Zimmer-Beschreibungen Sektion */}
                                                            {editingBranch && (
                                                                <RoomDescriptionsSection branchId={editingBranch.id} />
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Bold Payment Settings Tab */}
                                                    {activeSettingsTab === 'boldpayment' && (
                                                        <div>
                                                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                                                                Bold Payment Settings
                                                            </h4>
                                                            <div className="space-y-4">
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                        API Key
                                                                    </label>
                                                                    <input
                                                                        type={showSecrets['boldPaymentApiKey'] ? 'text' : 'password'}
                                                                        value={formData.boldPaymentSettings.apiKey}
                                                                        onChange={(e) => setFormData({
                                                                            ...formData,
                                                                            boldPaymentSettings: { ...formData.boldPaymentSettings, apiKey: e.target.value }
                                                                        })}
                                                                        placeholder="API Key"
                                                                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                        Merchant ID
                                                                    </label>
                                                                    <input
                                                                        type={showSecrets['boldPaymentMerchantId'] ? 'text' : 'password'}
                                                                        value={formData.boldPaymentSettings.merchantId}
                                                                        onChange={(e) => setFormData({
                                                                            ...formData,
                                                                            boldPaymentSettings: { ...formData.boldPaymentSettings, merchantId: e.target.value }
                                                                        })}
                                                                        placeholder="Merchant ID"
                                                                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                        Environment
                                                                    </label>
                                                                    <select
                                                                        value={formData.boldPaymentSettings.environment}
                                                                        onChange={(e) => setFormData({
                                                                            ...formData,
                                                                            boldPaymentSettings: { ...formData.boldPaymentSettings, environment: e.target.value as 'sandbox' | 'production' }
                                                                        })}
                                                                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                    >
                                                                        <option value="sandbox">Sandbox</option>
                                                                        <option value="production">Production</option>
                                                                    </select>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* TTLock Settings Tab */}
                                                    {activeSettingsTab === 'doorsystem' && (
                                                        <div>
                                                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                                                                TTLock Settings
                                                            </h4>
                                                            <div className="space-y-4">
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                        Client ID
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        value={formData.doorSystemSettings.clientId}
                                                                        onChange={(e) => setFormData({
                                                                            ...formData,
                                                                            doorSystemSettings: { ...formData.doorSystemSettings, clientId: e.target.value }
                                                                        })}
                                                                        placeholder="Client ID"
                                                                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                        Client Secret
                                                                    </label>
                                                                    <input
                                                                        type={showSecrets['doorSystemClientSecret'] ? 'text' : 'password'}
                                                                        value={formData.doorSystemSettings.clientSecret}
                                                                        onChange={(e) => setFormData({
                                                                            ...formData,
                                                                            doorSystemSettings: { ...formData.doorSystemSettings, clientSecret: e.target.value }
                                                                        })}
                                                                        placeholder="Client Secret"
                                                                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                        Username
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        value={formData.doorSystemSettings.username}
                                                                        onChange={(e) => setFormData({
                                                                            ...formData,
                                                                            doorSystemSettings: { ...formData.doorSystemSettings, username: e.target.value }
                                                                        })}
                                                                        placeholder="Username"
                                                                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                        Password
                                                                    </label>
                                                                    <input
                                                                        type={showSecrets['doorSystemPassword'] ? 'text' : 'password'}
                                                                        value={formData.doorSystemSettings.password}
                                                                        onChange={(e) => setFormData({
                                                                            ...formData,
                                                                            doorSystemSettings: { ...formData.doorSystemSettings, password: e.target.value }
                                                                        })}
                                                                        placeholder="Password"
                                                                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Email Settings Tab */}
                                                    {activeSettingsTab === 'email' && (
                                                        <div>
                                                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                                                                Email Settings
                                                            </h4>
                                                            <div className="space-y-4">
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                        SMTP Host
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        value={formData.emailSettings.smtpHost}
                                                                        onChange={(e) => setFormData({
                                                                            ...formData,
                                                                            emailSettings: { ...formData.emailSettings, smtpHost: e.target.value }
                                                                        })}
                                                                        placeholder="smtp.example.com"
                                                                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                        SMTP Port
                                                                    </label>
                                                                    <input
                                                                        type="number"
                                                                        value={formData.emailSettings.smtpPort}
                                                                        onChange={(e) => setFormData({
                                                                            ...formData,
                                                                            emailSettings: { ...formData.emailSettings, smtpPort: parseInt(e.target.value) || 587 }
                                                                        })}
                                                                        placeholder="587"
                                                                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                        SMTP User
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        value={formData.emailSettings.smtpUser}
                                                                        onChange={(e) => setFormData({
                                                                            ...formData,
                                                                            emailSettings: { ...formData.emailSettings, smtpUser: e.target.value }
                                                                        })}
                                                                        placeholder="user@example.com"
                                                                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                        SMTP Password
                                                                    </label>
                                                                    <div className="relative">
                                                                        <input
                                                                            type={showSecrets['emailSmtpPass'] ? 'text' : 'password'}
                                                                            value={formData.emailSettings.smtpPass}
                                                                            onChange={(e) => setFormData({
                                                                                ...formData,
                                                                                emailSettings: { ...formData.emailSettings, smtpPass: e.target.value }
                                                                            })}
                                                                            placeholder="Password"
                                                                            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2 pr-10"
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setShowSecrets({ ...showSecrets, emailSmtpPass: !showSecrets['emailSmtpPass'] })}
                                                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                                                        >
                                                                            {showSecrets['emailSmtpPass'] ? (
                                                                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0L3 3m3.29 3.29L12 12m-5.71-5.71L12 12" />
                                                                                </svg>
                                                                            ) : (
                                                                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                                </svg>
                                                                            )}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                        SMTP From Email
                                                                    </label>
                                                                    <input
                                                                        type="email"
                                                                        value={formData.emailSettings.smtpFromEmail}
                                                                        onChange={(e) => setFormData({
                                                                            ...formData,
                                                                            emailSettings: { ...formData.emailSettings, smtpFromEmail: e.target.value }
                                                                        })}
                                                                        placeholder="noreply@example.com"
                                                                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                        SMTP From Name
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        value={formData.emailSettings.smtpFromName}
                                                                        onChange={(e) => setFormData({
                                                                            ...formData,
                                                                            emailSettings: { ...formData.emailSettings, smtpFromName: e.target.value }
                                                                        })}
                                                                        placeholder="Branch Name"
                                                                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                    />
                                                                </div>

                                                                {/* IMAP Settings Section */}
                                                                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                                                                    <div className="flex items-center justify-between mb-4">
                                                                        <h5 className="text-sm font-semibold text-gray-900 dark:text-white">
                                                                            IMAP Settings (Email Reading)
                                                                        </h5>
                                                                        <label className="relative inline-flex items-center cursor-pointer">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={formData.emailSettings.imap.enabled}
                                                                                onChange={(e) => setFormData({
                                                                                    ...formData,
                                                                                    emailSettings: {
                                                                                        ...formData.emailSettings,
                                                                                        imap: {
                                                                                            ...formData.emailSettings.imap,
                                                                                            enabled: e.target.checked
                                                                                        }
                                                                                    }
                                                                                })}
                                                                                className="sr-only peer"
                                                                            />
                                                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                                                            <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                                                                                {formData.emailSettings.imap.enabled ? 'Enabled' : 'Disabled'}
                                                                            </span>
                                                                        </label>
                                                                    </div>

                                                                    {formData.emailSettings.imap.enabled && (
                                                                        <div className="space-y-4">
                                                                            <div>
                                                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                                    IMAP Host
                                                                                </label>
                                                                                <input
                                                                                    type="text"
                                                                                    value={formData.emailSettings.imap.host}
                                                                                    onChange={(e) => setFormData({
                                                                                        ...formData,
                                                                                        emailSettings: {
                                                                                            ...formData.emailSettings,
                                                                                            imap: { ...formData.emailSettings.imap, host: e.target.value }
                                                                                        }
                                                                                    })}
                                                                                    placeholder="imap.example.com"
                                                                                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                                    IMAP Port
                                                                                </label>
                                                                                <input
                                                                                    type="number"
                                                                                    value={formData.emailSettings.imap.port}
                                                                                    onChange={(e) => setFormData({
                                                                                        ...formData,
                                                                                        emailSettings: {
                                                                                            ...formData.emailSettings,
                                                                                            imap: { ...formData.emailSettings.imap, port: parseInt(e.target.value) || 993 }
                                                                                        }
                                                                                    })}
                                                                                    placeholder="993"
                                                                                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <label className="relative inline-flex items-center cursor-pointer">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={formData.emailSettings.imap.secure}
                                                                                        onChange={(e) => setFormData({
                                                                                            ...formData,
                                                                                            emailSettings: {
                                                                                                ...formData.emailSettings,
                                                                                                imap: { ...formData.emailSettings.imap, secure: e.target.checked }
                                                                                            }
                                                                                        })}
                                                                                        className="sr-only peer"
                                                                                    />
                                                                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                                                                    <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                                                                                        Secure (SSL/TLS)
                                                                                    </span>
                                                                                </label>
                                                                            </div>
                                                                            <div>
                                                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                                    IMAP User
                                                                                </label>
                                                                                <input
                                                                                    type="text"
                                                                                    value={formData.emailSettings.imap.user}
                                                                                    onChange={(e) => setFormData({
                                                                                        ...formData,
                                                                                        emailSettings: {
                                                                                            ...formData.emailSettings,
                                                                                            imap: { ...formData.emailSettings.imap, user: e.target.value }
                                                                                        }
                                                                                    })}
                                                                                    placeholder="user@example.com"
                                                                                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                                    IMAP Password
                                                                                </label>
                                                                                <div className="relative">
                                                                                    <input
                                                                                        type={showSecrets['emailImapPass'] ? 'text' : 'password'}
                                                                                        value={formData.emailSettings.imap.password}
                                                                                        onChange={(e) => setFormData({
                                                                                            ...formData,
                                                                                            emailSettings: {
                                                                                                ...formData.emailSettings,
                                                                                                imap: { ...formData.emailSettings.imap, password: e.target.value }
                                                                                            }
                                                                                        })}
                                                                                        placeholder="Password"
                                                                                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2 pr-10"
                                                                                    />
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => setShowSecrets({ ...showSecrets, emailImapPass: !showSecrets['emailImapPass'] })}
                                                                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                                                                    >
                                                                                        {showSecrets['emailImapPass'] ? (
                                                                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0L3 3m3.29 3.29L12 12m-5.71-5.71L12 12" />
                                                                                            </svg>
                                                                                        ) : (
                                                                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                                            </svg>
                                                                                        )}
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                            <div>
                                                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                                    IMAP Folder
                                                                                </label>
                                                                                <input
                                                                                    type="text"
                                                                                    value={formData.emailSettings.imap.folder}
                                                                                    onChange={(e) => setFormData({
                                                                                        ...formData,
                                                                                        emailSettings: {
                                                                                            ...formData.emailSettings,
                                                                                            imap: { ...formData.emailSettings.imap, folder: e.target.value }
                                                                                        }
                                                                                    })}
                                                                                    placeholder="INBOX"
                                                                                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                                    Processed Folder (optional)
                                                                                </label>
                                                                                <input
                                                                                    type="text"
                                                                                    value={formData.emailSettings.imap.processedFolder}
                                                                                    onChange={(e) => setFormData({
                                                                                        ...formData,
                                                                                        emailSettings: {
                                                                                            ...formData.emailSettings,
                                                                                            imap: { ...formData.emailSettings.imap, processedFolder: e.target.value }
                                                                                        }
                                                                                    })}
                                                                                    placeholder="Processed"
                                                                                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        )}

                                        {/* Buttons */}
                                        <div className="flex justify-end pt-4 gap-2">
                                            <div className="relative group">
                                                <button
                                                    type="button"
                                                    onClick={handleCloseModal}
                                                    className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                                                >
                                                    <XMarkIcon className="h-5 w-5" />
                                                </button>
                                                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                                    {t('common.cancel', { defaultValue: 'Abbrechen' })}
                                                </div>
                                            </div>
                                            <div className="relative group">
                                                <button
                                                    type="submit"
                                                    className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-800 transition-colors"
                                                >
                                                    <CheckIcon className="h-5 w-5" />
                                                </button>
                                                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                                    {editingBranch ? t('common.update', { defaultValue: 'Aktualisieren' }) : t('common.create', { defaultValue: 'Erstellen' })}
                                                </div>
                                            </div>
                                        </div>
                                    </form>
                                </Dialog.Panel>
                            </div>
                        </Dialog>
                    ) : (
                        // Desktop - Sidepane (dynamische Breite basierend auf Tab-Anzahl)
                        <div className="fixed inset-y-0 right-0 w-full sm:min-w-[500px] sm:max-w-[600px] bg-white dark:bg-gray-800 shadow-xl z-50 flex flex-col">
                            {/* Header */}
                            <div className="px-6 py-4 border-b dark:border-gray-700 flex-shrink-0">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-semibold dark:text-white">
                                        {editingBranch 
                                            ? t('branches.edit', { defaultValue: 'Niederlassung bearbeiten' })
                                            : t('branches.create', { defaultValue: 'Neue Niederlassung' })
                                        }
                                    </h2>
                                    <button
                                        onClick={handleCloseModal}
                                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                    >
                                        <XMarkIcon className="h-6 w-6" />
                                    </button>
                                </div>
                            </div>
                            
                            {/* Form */}
                            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                                <div className="flex-1 overflow-y-auto min-h-0">
                                    <div className="p-6 space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                {t('branches.name', { defaultValue: 'Name' })}
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                required
                                                autoFocus
                                            />
                                        </div>

                                        {/* Settings Tabs - nur beim Bearbeiten */}
                                        {editingBranch && (
                                            <>
                                                {/* Tab Navigation */}
                                                <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
                                                    <nav className="-mb-px flex space-x-2 overflow-x-auto">
                                                        {['whatsapp', 'lobbypms', 'boldpayment', 'doorsystem', 'email', 'messages'].map((tab) => (
                                                            <button
                                                                key={tab}
                                                                type="button"
                                                                onClick={() => setActiveSettingsTab(tab as any)}
                                                                className={`py-2 px-2 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                                                                    activeSettingsTab === tab
                                                                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                                                }`}
                                                            >
                                                                {tab === 'whatsapp' ? 'WhatsApp' : tab === 'lobbypms' ? 'LobbyPMS' : tab === 'boldpayment' ? 'Bold Payment' : tab === 'doorsystem' ? 'TTLock' : tab === 'email' ? 'Email' : t('branches.messagesTab', { defaultValue: 'Nachrichten' })}
                                                            </button>
                                                        ))}
                                                    </nav>
                                                </div>

                                                {/* Tab Content */}
                                                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                                    {/* WhatsApp Settings Tab */}
                                                    {activeSettingsTab === 'whatsapp' && (
                                                        <div>
                                                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                                                                WhatsApp Settings
                                                            </h4>
                                                            
                                                            <div className="space-y-4">
                                                                <div>
                                                                    <label htmlFor="whatsappProviderDesktop" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                        Provider
                                                                    </label>
                                                                    <select
                                                                        id="whatsappProviderDesktop"
                                                                        value={formData.whatsappSettings.provider}
                                                                        onChange={(e) => setFormData({
                                                                            ...formData,
                                                                            whatsappSettings: {
                                                                                ...formData.whatsappSettings,
                                                                                provider: e.target.value as 'twilio' | 'whatsapp-business-api'
                                                                            }
                                                                        })}
                                                                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                    >
                                                                        <option value="twilio">Twilio</option>
                                                                        <option value="whatsapp-business-api">WhatsApp Business API</option>
                                                                    </select>
                                                                </div>

                                                    <div>
                                                        <label htmlFor="whatsappApiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                            API Key / Access Token
                                                        </label>
                                                        <div className="relative">
                                                            <input
                                                                type={showSecrets['whatsappApiKey'] ? 'text' : 'password'}
                                                                id="whatsappApiKey"
                                                                value={formData.whatsappSettings.apiKey}
                                                                onChange={(e) => setFormData({
                                                                    ...formData,
                                                                    whatsappSettings: {
                                                                        ...formData.whatsappSettings,
                                                                        apiKey: e.target.value
                                                                    }
                                                                })}
                                                                placeholder="API Key / Access Token"
                                                                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2 pr-10"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowSecrets(prev => ({ ...prev, whatsappApiKey: !prev.whatsappApiKey }))}
                                                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                                            >
                                                                {showSecrets['whatsappApiKey'] ? (
                                                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0L3 3m3.29 3.29L12 12m-5.71-5.71L12 12" />
                                                                    </svg>
                                                                ) : (
                                                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                    </svg>
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label htmlFor="whatsappPhoneNumberId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                            Phone Number ID
                                                        </label>
                                                        <input
                                                            type="text"
                                                            id="whatsappPhoneNumberId"
                                                            value={formData.whatsappSettings.phoneNumberId}
                                                            onChange={(e) => setFormData({
                                                                ...formData,
                                                                whatsappSettings: {
                                                                    ...formData.whatsappSettings,
                                                                    phoneNumberId: e.target.value
                                                                }
                                                            })}
                                                            placeholder="Phone Number ID"
                                                            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label htmlFor="whatsappApiSecretDesktop" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                            API Secret
                                                        </label>
                                                        <div className="relative">
                                                            <input
                                                                type={showSecrets['whatsappApiSecret'] ? 'text' : 'password'}
                                                                id="whatsappApiSecretDesktop"
                                                                value={formData.whatsappSettings.apiSecret}
                                                                onChange={(e) => setFormData({
                                                                    ...formData,
                                                                    whatsappSettings: {
                                                                        ...formData.whatsappSettings,
                                                                        apiSecret: e.target.value
                                                                    }
                                                                })}
                                                                placeholder="API Secret"
                                                                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2 pr-10"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowSecrets(prev => ({ ...prev, whatsappApiSecret: !prev.whatsappApiSecret }))}
                                                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                                            >
                                                                {showSecrets['whatsappApiSecret'] ? (
                                                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0L3 3m3.29 3.29L12 12m-5.71-5.71L12 12" />
                                                                    </svg>
                                                                ) : (
                                                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                    </svg>
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* AI Configuration */}
                                                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <h5 className="text-sm font-semibold text-gray-900 dark:text-white">
                                                                KI-Konfiguration (AI)
                                                            </h5>
                                                            <label className="relative inline-flex items-center cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={formData.whatsappSettings.ai.enabled}
                                                                    onChange={(e) => setFormData({
                                                                        ...formData,
                                                                        whatsappSettings: {
                                                                            ...formData.whatsappSettings,
                                                                            ai: {
                                                                                ...formData.whatsappSettings.ai,
                                                                                enabled: e.target.checked
                                                                            }
                                                                        }
                                                                    })}
                                                                    className="sr-only peer"
                                                                />
                                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                                                <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                                                                    {formData.whatsappSettings.ai.enabled ? 'Aktiviert' : 'Deaktiviert'}
                                                                </span>
                                                            </label>
                                                        </div>

                                                        {formData.whatsappSettings.ai.enabled && (
                                                            <div className="space-y-4">
                                                                <div>
                                                                    <label htmlFor="aiModelDesktop" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                        Modell
                                                                    </label>
                                                                    <select
                                                                        id="aiModelDesktop"
                                                                        value={formData.whatsappSettings.ai.model}
                                                                        onChange={(e) => setFormData({
                                                                            ...formData,
                                                                            whatsappSettings: {
                                                                                ...formData.whatsappSettings,
                                                                                ai: {
                                                                                    ...formData.whatsappSettings.ai,
                                                                                    model: e.target.value
                                                                                }
                                                                            }
                                                                        })}
                                                                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                    >
                                                                        <option value="gpt-4o">GPT-4o</option>
                                                                        <option value="gpt-4">GPT-4</option>
                                                                        <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                                                                    </select>
                                                                </div>

                                                                <div>
                                                                    <label htmlFor="aiSystemPromptDesktop" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                        System Prompt
                                                                    </label>
                                                                    <textarea
                                                                        id="aiSystemPromptDesktop"
                                                                        value={formData.whatsappSettings.ai.systemPrompt}
                                                                        onChange={(e) => setFormData({
                                                                            ...formData,
                                                                            whatsappSettings: {
                                                                                ...formData.whatsappSettings,
                                                                                ai: {
                                                                                    ...formData.whatsappSettings.ai,
                                                                                    systemPrompt: e.target.value
                                                                                }
                                                                            }
                                                                        })}
                                                                        rows={4}
                                                                        placeholder="Du bist ein hilfreicher Assistent für..."
                                                                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                    />
                                                                </div>

                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                        Regeln (eine pro Zeile)
                                                                    </label>
                                                                    <textarea
                                                                        value={formData.whatsappSettings.ai.rules.join('\n')}
                                                                        onChange={(e) => setFormData({
                                                                            ...formData,
                                                                            whatsappSettings: {
                                                                                ...formData.whatsappSettings,
                                                                                ai: {
                                                                                    ...formData.whatsappSettings.ai,
                                                                                    rules: e.target.value.split('\n').filter(r => r.trim())
                                                                                }
                                                                            }
                                                                        })}
                                                                        rows={3}
                                                                        placeholder="Antworte immer auf Spanisch&#10;Sei freundlich und professionell"
                                                                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                    />
                                                                </div>

                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                        Quellen/URLs (eine pro Zeile)
                                                                    </label>
                                                                    <textarea
                                                                        value={formData.whatsappSettings.ai.sources.join('\n')}
                                                                        onChange={(e) => setFormData({
                                                                            ...formData,
                                                                            whatsappSettings: {
                                                                                ...formData.whatsappSettings,
                                                                                ai: {
                                                                                    ...formData.whatsappSettings.ai,
                                                                                    sources: e.target.value.split('\n').filter(s => s.trim())
                                                                                }
                                                                            }
                                                                        })}
                                                                        rows={2}
                                                                        placeholder="https://wiki.example.com/manila-procedures&#10;https://wiki.example.com/faq"
                                                                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                    />
                                                                </div>

                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div>
                                                                        <label htmlFor="aiTemperatureDesktop" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                            Temperature ({formData.whatsappSettings.ai.temperature})
                                                                        </label>
                                                                        <input
                                                                            type="range"
                                                                            id="aiTemperatureDesktop"
                                                                            min="0"
                                                                            max="2"
                                                                            step="0.1"
                                                                            value={formData.whatsappSettings.ai.temperature}
                                                                            onChange={(e) => setFormData({
                                                                                ...formData,
                                                                                whatsappSettings: {
                                                                                    ...formData.whatsappSettings,
                                                                                    ai: {
                                                                                        ...formData.whatsappSettings.ai,
                                                                                        temperature: parseFloat(e.target.value)
                                                                                    }
                                                                                }
                                                                            })}
                                                                            className="mt-1 block w-full"
                                                                        />
                                                                    </div>

                                                                    <div>
                                                                        <label htmlFor="aiMaxTokensDesktop" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                            Max Tokens
                                                                        </label>
                                                                        <input
                                                                            type="number"
                                                                            id="aiMaxTokensDesktop"
                                                                            min="100"
                                                                            max="4000"
                                                                            step="100"
                                                                            value={formData.whatsappSettings.ai.maxTokens}
                                                                            onChange={(e) => setFormData({
                                                                                ...formData,
                                                                                whatsappSettings: {
                                                                                    ...formData.whatsappSettings,
                                                                                    ai: {
                                                                                        ...formData.whatsappSettings.ai,
                                                                                        maxTokens: parseInt(e.target.value) || 500
                                                                                    }
                                                                                }
                                                                            })}
                                                                            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                                    {/* LobbyPMS Settings Tab */}
                                                    {activeSettingsTab === 'lobbypms' && (
                                                        <div>
                                                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                                                                LobbyPMS Settings
                                                            </h4>
                                                            <div className="space-y-4">
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                        API URL
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        value={formData.lobbyPmsSettings.apiUrl}
                                                                        onChange={(e) => setFormData({
                                                                            ...formData,
                                                                            lobbyPmsSettings: { ...formData.lobbyPmsSettings, apiUrl: e.target.value }
                                                                        })}
                                                                        placeholder="https://api.lobbypms.com"
                                                                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                        API Key
                                                                    </label>
                                                                    <input
                                                                        type={showSecrets['lobbyPmsApiKey'] ? 'text' : 'password'}
                                                                        value={formData.lobbyPmsSettings.apiKey}
                                                                        onChange={(e) => setFormData({
                                                                            ...formData,
                                                                            lobbyPmsSettings: { ...formData.lobbyPmsSettings, apiKey: e.target.value }
                                                                        })}
                                                                        placeholder="API Key"
                                                                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                        Property ID
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        value={formData.lobbyPmsSettings.propertyId}
                                                                        onChange={(e) => setFormData({
                                                                            ...formData,
                                                                            lobbyPmsSettings: { ...formData.lobbyPmsSettings, propertyId: e.target.value }
                                                                        })}
                                                                        placeholder="Property ID"
                                                                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                    />
                                                                </div>
                                                            </div>
                                                            
                                                            {/* Zimmer-Beschreibungen Sektion */}
                                                            {editingBranch && (
                                                                <RoomDescriptionsSection branchId={editingBranch.id} />
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Bold Payment Settings Tab */}
                                                    {activeSettingsTab === 'boldpayment' && (
                                                        <div>
                                                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                                                                Bold Payment Settings
                                                            </h4>
                                                            <div className="space-y-4">
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                        API Key
                                                                    </label>
                                                                    <input
                                                                        type={showSecrets['boldPaymentApiKey'] ? 'text' : 'password'}
                                                                        value={formData.boldPaymentSettings.apiKey}
                                                                        onChange={(e) => setFormData({
                                                                            ...formData,
                                                                            boldPaymentSettings: { ...formData.boldPaymentSettings, apiKey: e.target.value }
                                                                        })}
                                                                        placeholder="API Key"
                                                                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                        Merchant ID
                                                                    </label>
                                                                    <input
                                                                        type={showSecrets['boldPaymentMerchantId'] ? 'text' : 'password'}
                                                                        value={formData.boldPaymentSettings.merchantId}
                                                                        onChange={(e) => setFormData({
                                                                            ...formData,
                                                                            boldPaymentSettings: { ...formData.boldPaymentSettings, merchantId: e.target.value }
                                                                        })}
                                                                        placeholder="Merchant ID"
                                                                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                        Environment
                                                                    </label>
                                                                    <select
                                                                        value={formData.boldPaymentSettings.environment}
                                                                        onChange={(e) => setFormData({
                                                                            ...formData,
                                                                            boldPaymentSettings: { ...formData.boldPaymentSettings, environment: e.target.value as 'sandbox' | 'production' }
                                                                        })}
                                                                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                    >
                                                                        <option value="sandbox">Sandbox</option>
                                                                        <option value="production">Production</option>
                                                                    </select>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* TTLock Settings Tab */}
                                                    {activeSettingsTab === 'doorsystem' && (
                                                        <div>
                                                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                                                                TTLock Settings
                                                            </h4>
                                                            <div className="space-y-4">
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                        Client ID
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        value={formData.doorSystemSettings.clientId}
                                                                        onChange={(e) => setFormData({
                                                                            ...formData,
                                                                            doorSystemSettings: { ...formData.doorSystemSettings, clientId: e.target.value }
                                                                        })}
                                                                        placeholder="Client ID"
                                                                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                        Client Secret
                                                                    </label>
                                                                    <input
                                                                        type={showSecrets['doorSystemClientSecret'] ? 'text' : 'password'}
                                                                        value={formData.doorSystemSettings.clientSecret}
                                                                        onChange={(e) => setFormData({
                                                                            ...formData,
                                                                            doorSystemSettings: { ...formData.doorSystemSettings, clientSecret: e.target.value }
                                                                        })}
                                                                        placeholder="Client Secret"
                                                                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                        Username
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        value={formData.doorSystemSettings.username}
                                                                        onChange={(e) => setFormData({
                                                                            ...formData,
                                                                            doorSystemSettings: { ...formData.doorSystemSettings, username: e.target.value }
                                                                        })}
                                                                        placeholder="Username"
                                                                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                        Password
                                                                    </label>
                                                                    <input
                                                                        type={showSecrets['doorSystemPassword'] ? 'text' : 'password'}
                                                                        value={formData.doorSystemSettings.password}
                                                                        onChange={(e) => setFormData({
                                                                            ...formData,
                                                                            doorSystemSettings: { ...formData.doorSystemSettings, password: e.target.value }
                                                                        })}
                                                                        placeholder="Password"
                                                                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Email Settings Tab */}
                                                    {activeSettingsTab === 'email' && (
                                                        <div>
                                                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                                                                Email Settings
                                                            </h4>
                                                            <div className="space-y-4">
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                        SMTP Host
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        value={formData.emailSettings.smtpHost}
                                                                        onChange={(e) => setFormData({
                                                                            ...formData,
                                                                            emailSettings: { ...formData.emailSettings, smtpHost: e.target.value }
                                                                        })}
                                                                        placeholder="smtp.example.com"
                                                                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                        SMTP Port
                                                                    </label>
                                                                    <input
                                                                        type="number"
                                                                        value={formData.emailSettings.smtpPort}
                                                                        onChange={(e) => setFormData({
                                                                            ...formData,
                                                                            emailSettings: { ...formData.emailSettings, smtpPort: parseInt(e.target.value) || 587 }
                                                                        })}
                                                                        placeholder="587"
                                                                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                        SMTP User
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        value={formData.emailSettings.smtpUser}
                                                                        onChange={(e) => setFormData({
                                                                            ...formData,
                                                                            emailSettings: { ...formData.emailSettings, smtpUser: e.target.value }
                                                                        })}
                                                                        placeholder="user@example.com"
                                                                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                        SMTP Password
                                                                    </label>
                                                                    <div className="relative">
                                                                        <input
                                                                            type={showSecrets['emailSmtpPass'] ? 'text' : 'password'}
                                                                            value={formData.emailSettings.smtpPass}
                                                                            onChange={(e) => setFormData({
                                                                                ...formData,
                                                                                emailSettings: { ...formData.emailSettings, smtpPass: e.target.value }
                                                                            })}
                                                                            placeholder="Password"
                                                                            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2 pr-10"
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setShowSecrets({ ...showSecrets, emailSmtpPass: !showSecrets['emailSmtpPass'] })}
                                                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                                                        >
                                                                            {showSecrets['emailSmtpPass'] ? (
                                                                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0L3 3m3.29 3.29L12 12m-5.71-5.71L12 12" />
                                                                                </svg>
                                                                            ) : (
                                                                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                                </svg>
                                                                            )}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                        SMTP From Email
                                                                    </label>
                                                                    <input
                                                                        type="email"
                                                                        value={formData.emailSettings.smtpFromEmail}
                                                                        onChange={(e) => setFormData({
                                                                            ...formData,
                                                                            emailSettings: { ...formData.emailSettings, smtpFromEmail: e.target.value }
                                                                        })}
                                                                        placeholder="noreply@example.com"
                                                                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                        SMTP From Name
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        value={formData.emailSettings.smtpFromName}
                                                                        onChange={(e) => setFormData({
                                                                            ...formData,
                                                                            emailSettings: { ...formData.emailSettings, smtpFromName: e.target.value }
                                                                        })}
                                                                        placeholder="Branch Name"
                                                                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                    />
                                                                </div>

                                                                {/* IMAP Settings Section */}
                                                                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                                                                    <div className="flex items-center justify-between mb-4">
                                                                        <h5 className="text-sm font-semibold text-gray-900 dark:text-white">
                                                                            IMAP Settings (Email Reading)
                                                                        </h5>
                                                                        <label className="relative inline-flex items-center cursor-pointer">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={formData.emailSettings.imap.enabled}
                                                                                onChange={(e) => setFormData({
                                                                                    ...formData,
                                                                                    emailSettings: {
                                                                                        ...formData.emailSettings,
                                                                                        imap: {
                                                                                            ...formData.emailSettings.imap,
                                                                                            enabled: e.target.checked
                                                                                        }
                                                                                    }
                                                                                })}
                                                                                className="sr-only peer"
                                                                            />
                                                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                                                            <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                                                                                {formData.emailSettings.imap.enabled ? 'Enabled' : 'Disabled'}
                                                                            </span>
                                                                        </label>
                                                                    </div>

                                                                    {formData.emailSettings.imap.enabled && (
                                                                        <div className="space-y-4">
                                                                            <div>
                                                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                                    IMAP Host
                                                                                </label>
                                                                                <input
                                                                                    type="text"
                                                                                    value={formData.emailSettings.imap.host}
                                                                                    onChange={(e) => setFormData({
                                                                                        ...formData,
                                                                                        emailSettings: {
                                                                                            ...formData.emailSettings,
                                                                                            imap: { ...formData.emailSettings.imap, host: e.target.value }
                                                                                        }
                                                                                    })}
                                                                                    placeholder="imap.example.com"
                                                                                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                                    IMAP Port
                                                                                </label>
                                                                                <input
                                                                                    type="number"
                                                                                    value={formData.emailSettings.imap.port}
                                                                                    onChange={(e) => setFormData({
                                                                                        ...formData,
                                                                                        emailSettings: {
                                                                                            ...formData.emailSettings,
                                                                                            imap: { ...formData.emailSettings.imap, port: parseInt(e.target.value) || 993 }
                                                                                        }
                                                                                    })}
                                                                                    placeholder="993"
                                                                                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <label className="relative inline-flex items-center cursor-pointer">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={formData.emailSettings.imap.secure}
                                                                                        onChange={(e) => setFormData({
                                                                                            ...formData,
                                                                                            emailSettings: {
                                                                                                ...formData.emailSettings,
                                                                                                imap: { ...formData.emailSettings.imap, secure: e.target.checked }
                                                                                            }
                                                                                        })}
                                                                                        className="sr-only peer"
                                                                                    />
                                                                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                                                                    <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                                                                                        Secure (SSL/TLS)
                                                                                    </span>
                                                                                </label>
                                                                            </div>
                                                                            <div>
                                                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                                    IMAP User
                                                                                </label>
                                                                                <input
                                                                                    type="text"
                                                                                    value={formData.emailSettings.imap.user}
                                                                                    onChange={(e) => setFormData({
                                                                                        ...formData,
                                                                                        emailSettings: {
                                                                                            ...formData.emailSettings,
                                                                                            imap: { ...formData.emailSettings.imap, user: e.target.value }
                                                                                        }
                                                                                    })}
                                                                                    placeholder="user@example.com"
                                                                                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                                    IMAP Password
                                                                                </label>
                                                                                <div className="relative">
                                                                                    <input
                                                                                        type={showSecrets['emailImapPass'] ? 'text' : 'password'}
                                                                                        value={formData.emailSettings.imap.password}
                                                                                        onChange={(e) => setFormData({
                                                                                            ...formData,
                                                                                            emailSettings: {
                                                                                                ...formData.emailSettings,
                                                                                                imap: { ...formData.emailSettings.imap, password: e.target.value }
                                                                                            }
                                                                                        })}
                                                                                        placeholder="Password"
                                                                                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2 pr-10"
                                                                                    />
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => setShowSecrets({ ...showSecrets, emailImapPass: !showSecrets['emailImapPass'] })}
                                                                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                                                                    >
                                                                                        {showSecrets['emailImapPass'] ? (
                                                                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0L3 3m3.29 3.29L12 12m-5.71-5.71L12 12" />
                                                                                            </svg>
                                                                                        ) : (
                                                                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                                            </svg>
                                                                                        )}
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                            <div>
                                                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                                    IMAP Folder
                                                                                </label>
                                                                                <input
                                                                                    type="text"
                                                                                    value={formData.emailSettings.imap.folder}
                                                                                    onChange={(e) => setFormData({
                                                                                        ...formData,
                                                                                        emailSettings: {
                                                                                            ...formData.emailSettings,
                                                                                            imap: { ...formData.emailSettings.imap, folder: e.target.value }
                                                                                        }
                                                                                    })}
                                                                                    placeholder="INBOX"
                                                                                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                                    Processed Folder (optional)
                                                                                </label>
                                                                                <input
                                                                                    type="text"
                                                                                    value={formData.emailSettings.imap.processedFolder}
                                                                                    onChange={(e) => setFormData({
                                                                                        ...formData,
                                                                                        emailSettings: {
                                                                                            ...formData.emailSettings,
                                                                                            imap: { ...formData.emailSettings.imap, processedFolder: e.target.value }
                                                                                        }
                                                                                    })}
                                                                                    placeholder="Processed"
                                                                                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Messages Tab */}
                                                    {activeSettingsTab === 'messages' && (
                                                        <div>
                                                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                                                                {t('branches.messagesTab', { defaultValue: 'Nachrichten' })}
                                                            </h4>
                                                            <div className="space-y-4">
                                                                {/* Automatisches Versenden */}
                                                                <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                                                                    <div className="flex items-center justify-between">
                                                                        <div>
                                                                            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                                                                                {t('branches.autoSendInvitation', { defaultValue: 'Automatisches Versenden aktivieren' })}
                                                                            </label>
                                                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                                {t('branches.autoSendInvitationDescription', { defaultValue: 'Sendet Check-in-Einladungen automatisch 1 Tag vor Check-in-Date um 08:00 Uhr' })}
                                                                            </p>
                                                                        </div>
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={formData.autoSendReservationInvitation}
                                                                            onChange={(e) => setFormData({
                                                                                ...formData,
                                                                                autoSendReservationInvitation: e.target.checked
                                                                            })}
                                                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                                        />
                                                                    </div>
                                                                </div>

                                                                {/* Mitteilungsvorlagen */}
                                                                <div>
                                                                    <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                                                                        {t('branches.messageTemplates', { defaultValue: 'Mitteilungsvorlagen' })}
                                                                    </h5>
                                                                    
                                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                                                                        {t('branches.messageTemplatesDescription', { defaultValue: 'Konfiguriere die Vorlagen für Check-in-Einladungen und Check-in-Bestätigungen' })}
                                                                    </p>

                                                                    {/* Template Type Selector */}
                                                                    <div className="mb-4">
                                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                                            {t('branches.messageType', { defaultValue: 'Mitteilungstyp' })}
                                                                        </label>
                                                                        <select
                                                                            value={selectedTemplateType}
                                                                            onChange={(e) => setSelectedTemplateType(e.target.value as 'checkInInvitation' | 'checkInConfirmation')}
                                                                            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                        >
                                                                            <option value="checkInInvitation">
                                                                                {t('branches.messageType.checkInInvitation', { defaultValue: 'Check-in-Einladung' })}
                                                                            </option>
                                                                            <option value="checkInConfirmation">
                                                                                {t('branches.messageType.checkInConfirmation', { defaultValue: 'Check-in-Bestätigung' })}
                                                                            </option>
                                                                        </select>
                                                                    </div>

                                                                    {/* Language Selector */}
                                                                    <div className="mb-4">
                                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                                            {t('branches.language', { defaultValue: 'Sprache' })}
                                                                        </label>
                                                                        <select
                                                                            value={selectedLanguage}
                                                                            onChange={(e) => setSelectedLanguage(e.target.value as 'en' | 'es' | 'de')}
                                                                            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                        >
                                                                            <option value="en">{t('branches.language.en', { defaultValue: 'Englisch' })}</option>
                                                                            <option value="es">{t('branches.language.es', { defaultValue: 'Spanisch' })}</option>
                                                                            <option value="de">{t('branches.language.de', { defaultValue: 'Deutsch' })}</option>
                                                                        </select>
                                                                    </div>

                                                                    {/* Template Fields */}
                                                                    {(() => {
                                                                        const currentTemplate = formData.messageTemplates?.[selectedTemplateType]?.[selectedLanguage] || {
                                                                            whatsappTemplateName: '',
                                                                            whatsappTemplateParams: [] as string[],
                                                                            emailSubject: '',
                                                                            emailContent: ''
                                                                        };
                                                                        
                                                                        return (
                                                                            <div className="space-y-4">
                                                                                <div>
                                                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                                        {t('branches.whatsappTemplateName', { defaultValue: 'WhatsApp Template Name' })}
                                                                                    </label>
                                                                                    <input
                                                                                        type="text"
                                                                                        value={currentTemplate.whatsappTemplateName || ''}
                                                                                        onChange={(e) => {
                                                                                            setFormData({
                                                                                                ...formData,
                                                                                                messageTemplates: {
                                                                                                    ...formData.messageTemplates,
                                                                                                    [selectedTemplateType]: {
                                                                                                        ...formData.messageTemplates?.[selectedTemplateType],
                                                                                                        [selectedLanguage]: {
                                                                                                            ...currentTemplate,
                                                                                                            whatsappTemplateName: e.target.value
                                                                                                        }
                                                                                                    }
                                                                                                }
                                                                                            });
                                                                                        }}
                                                                                        placeholder="reservation_checkin_invitation_en"
                                                                                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                                    />
                                                                                </div>

                                                                                <div>
                                                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                                        {t('branches.whatsappTemplateParams', { defaultValue: 'WhatsApp Template Parameter' })}
                                                                                    </label>
                                                                                    <input
                                                                                        type="text"
                                                                                        value={Array.isArray(currentTemplate.whatsappTemplateParams) ? currentTemplate.whatsappTemplateParams.join(', ') : (currentTemplate.whatsappTemplateParams || '')}
                                                                                        onChange={(e) => {
                                                                                            const params = e.target.value.split(',').map(p => p.trim()).filter(p => p);
                                                                                            setFormData({
                                                                                                ...formData,
                                                                                                messageTemplates: {
                                                                                                    ...formData.messageTemplates,
                                                                                                    [selectedTemplateType]: {
                                                                                                        ...formData.messageTemplates?.[selectedTemplateType],
                                                                                                        [selectedLanguage]: {
                                                                                                            ...currentTemplate,
                                                                                                            whatsappTemplateParams: params
                                                                                                        }
                                                                                                    }
                                                                                                }
                                                                                            });
                                                                                        }}
                                                                                        placeholder="{{1}}, {{2}}, {{3}}"
                                                                                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                                    />
                                                                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                                                        {t('branches.whatsappTemplateParamsHint', { defaultValue: 'Komma-separiert, z.B. {{1}}, {{2}}, {{3}}' })}
                                                                                    </p>
                                                                                </div>

                                                                                <div>
                                                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                                        {t('branches.emailSubject', { defaultValue: 'Email Betreff' })}
                                                                                    </label>
                                                                                    <input
                                                                                        type="text"
                                                                                        value={currentTemplate.emailSubject || ''}
                                                                                        onChange={(e) => {
                                                                                            setFormData({
                                                                                                ...formData,
                                                                                                messageTemplates: {
                                                                                                    ...formData.messageTemplates,
                                                                                                    [selectedTemplateType]: {
                                                                                                        ...formData.messageTemplates?.[selectedTemplateType],
                                                                                                        [selectedLanguage]: {
                                                                                                            ...currentTemplate,
                                                                                                            emailSubject: e.target.value
                                                                                                        }
                                                                                                    }
                                                                                                }
                                                                                            });
                                                                                        }}
                                                                                        placeholder="Welcome to La Familia Hostel - Online Check-in"
                                                                                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                                    />
                                                                                </div>

                                                                                <div>
                                                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                                        {t('branches.emailContent', { defaultValue: 'Email Inhalt' })}
                                                                                    </label>
                                                                                    <textarea
                                                                                        rows={10}
                                                                                        value={currentTemplate.emailContent || ''}
                                                                                        onChange={(e) => {
                                                                                            setFormData({
                                                                                                ...formData,
                                                                                                messageTemplates: {
                                                                                                    ...formData.messageTemplates,
                                                                                                    [selectedTemplateType]: {
                                                                                                        ...formData.messageTemplates?.[selectedTemplateType],
                                                                                                        [selectedLanguage]: {
                                                                                                            ...currentTemplate,
                                                                                                            emailContent: e.target.value
                                                                                                        }
                                                                                                    }
                                                                                                }
                                                                                            });
                                                                                        }}
                                                                                        placeholder="Hello {{guestName}}, ..."
                                                                                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                                                    />
                                                                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                                                        {t('branches.templateVariables', { defaultValue: 'Verfügbare Variablen' })}: 
                                                                                        <span className="font-mono">
                                                                                            {selectedTemplateType === 'checkInInvitation' 
                                                                                                ? t('branches.templateVariables.checkInInvitation', { defaultValue: '{{guestName}}, {{checkInLink}}, {{paymentLink}}' })
                                                                                                : t('branches.templateVariables.checkInConfirmation', { defaultValue: '{{guestName}}, {{roomDisplay}}, {{doorPin}}, {{doorAppName}}' })
                                                                                            }
                                                                                        </span>
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Buttons */}
                                <div className="flex justify-end pt-4 gap-2 px-6 pb-6 border-t dark:border-gray-700">
                                    <div className="relative group">
                                        <button
                                            type="button"
                                            onClick={handleCloseModal}
                                            className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                                        >
                                            <XMarkIcon className="h-5 w-5" />
                                        </button>
                                        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                            {t('common.cancel', { defaultValue: 'Abbrechen' })}
                                        </div>
                                    </div>
                                    <div className="relative group">
                                        <button
                                            type="submit"
                                            className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-800 transition-colors"
                                        >
                                            <CheckIcon className="h-5 w-5" />
                                        </button>
                                        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                            {editingBranch ? t('common.update', { defaultValue: 'Aktualisieren' }) : t('common.create', { defaultValue: 'Erstellen' })}
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default BranchManagementTab;

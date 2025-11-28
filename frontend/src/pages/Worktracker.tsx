import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { CircularProgress } from '@mui/material';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.tsx';
import { usePermissions } from '../hooks/usePermissions.ts';
import { useTableSettings } from '../hooks/useTableSettings.ts';
import TableColumnConfig from '../components/TableColumnConfig.tsx';
import { PencilIcon, TrashIcon, PlusIcon, ArrowLeftIcon, ArrowRightIcon, CheckCircleIcon, ArrowsUpDownIcon, FunnelIcon, XMarkIcon, DocumentDuplicateIcon, InformationCircleIcon, ClipboardDocumentListIcon, ArrowPathIcon, Squares2X2Icon, TableCellsIcon, UserIcon, BuildingOfficeIcon, CalendarIcon, ChevronLeftIcon, ChevronRightIcon, HomeIcon, EnvelopeIcon, PhoneIcon, LinkIcon, CurrencyDollarIcon, ClockIcon, KeyIcon, PaperAirplaneIcon, MapIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import CreateTaskModal from '../components/CreateTaskModal.tsx';
import EditTaskModal from '../components/EditTaskModal.tsx';
import CreateReservationModal from '../components/reservations/CreateReservationModal.tsx';
import TourBookingsModal from '../components/tours/TourBookingsModal.tsx';
import CreateTourBookingModal from '../components/tours/CreateTourBookingModal.tsx';
import EditTourBookingModal from '../components/tours/EditTourBookingModal.tsx';
import TourReservationLinkModal from '../components/tours/TourReservationLinkModal.tsx';
import SendInvitationSidepane from '../components/reservations/SendInvitationSidepane.tsx';
import SendPasscodeSidepane from '../components/reservations/SendPasscodeSidepane.tsx';
import ReservationNotificationLogs from '../components/reservations/ReservationNotificationLogs.tsx';
import { Reservation, ReservationStatus, PaymentStatus } from '../types/reservation.ts';
import { Tour, TourType, TourBooking } from '../types/tour.ts';
import { useNavigate } from 'react-router-dom';
import useMessage from '../hooks/useMessage.ts';
import WorktimeTracker from '../components/WorktimeTracker.tsx';
import WorktimeList from '../components/WorktimeList.tsx';
import { API_ENDPOINTS, getTaskAttachmentUrl } from '../config/api.ts';
import axiosInstance from '../config/axios.ts';
import FilterPane from '../components/FilterPane.tsx';
import { FilterCondition } from '../components/FilterRow.tsx';
import SavedFilterTags from '../components/SavedFilterTags.tsx';
import { applyFilters, evaluateDateCondition, evaluateUserRoleCondition, evaluateResponsibleAndQualityControl } from '../utils/filterLogic.ts';
import { toast } from 'react-toastify';
import MarkdownPreview from '../components/MarkdownPreview.tsx';
import { getExpiryStatus, getExpiryColorClasses, createDueDateMetadataItem } from '../utils/expiryUtils.ts';
import { getStatusText, getStatusColor } from '../utils/statusUtils.tsx';
import DataCard, { MetadataItem } from '../components/shared/DataCard.tsx';
import CardGrid from '../components/shared/CardGrid.tsx';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { reservationService } from '../services/reservationService.ts';

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
    attachments?: Array<{
        id: number;
        fileName: string;
        fileType: string;
        fileSize?: number;
        filePath?: string;
        uploadedAt?: string;
        url: string;
    }>;
}

interface SortConfig {
    key: keyof Task | 'responsible.firstName' | 'qualityControl.firstName' | 'branch.name';
    direction: 'asc' | 'desc';
}

interface ReservationSortConfig {
    key: 'guestName' | 'status' | 'paymentStatus' | 'checkInDate' | 'checkOutDate' | 'roomNumber' | 'branch' | 'guestEmail' | 'guestPhone' | 'amount' | 'arrivalTime' | 'branch.name';
    direction: 'asc' | 'desc';
}


// Standard-Spaltenreihenfolge (wird in der Komponente neu definiert)
const defaultColumnOrder = ['title', 'responsibleAndQualityControl', 'status', 'dueDate', 'branch', 'actions'];

// Definiere eine tableId für die To-Dos Tabelle
const TODOS_TABLE_ID = 'worktracker-todos';

// Definiere eine tableId für die Reservations Tabelle
const RESERVATIONS_TABLE_ID = 'worktracker-reservations';


// Card-Einstellungen Standardwerte
const defaultCardMetadata = ['title', 'status', 'responsible', 'qualityControl', 'branch', 'dueDate', 'description'];
const defaultCardColumnOrder = ['title', 'status', 'responsible', 'qualityControl', 'branch', 'dueDate', 'description'];
const defaultCardSortDirections: Record<string, 'asc' | 'desc'> = {
  title: 'asc',
  status: 'asc',
  responsible: 'asc',
  qualityControl: 'asc',
  branch: 'asc',
  dueDate: 'asc',
  description: 'asc'
};

// Default Sortierrichtungen für Reservations Card-Metadaten
const defaultReservationCardSortDirections: Record<string, 'asc' | 'desc'> = {
  guestName: 'asc',
  status: 'asc',
  paymentStatus: 'asc',
  checkInDate: 'desc',  // Neueste zuerst (wie aktuell hardcoded)
  checkOutDate: 'desc',
  roomNumber: 'asc',
  branch: 'asc',
  guestEmail: 'asc',
  guestPhone: 'asc',
  amount: 'desc',
  arrivalTime: 'desc'
};

// Mapping zwischen Tabellen-Spalten-IDs und Card-Metadaten-IDs
// Tabellen-Spalte -> Card-Metadaten (kann Array sein für 1:N Mapping)
const tableToCardMapping: Record<string, string[]> = {
  'title': ['title'],
  'status': ['status'],
  'responsibleAndQualityControl': ['responsible', 'qualityControl'], // 1 Tabelle-Spalte -> 2 Card-Metadaten
  'branch': ['branch'],
  'dueDate': ['dueDate'],
  'actions': [], // Keine Card-Entsprechung
  'description': ['description'] // Nur in Cards verfügbar
};

// Reverse Mapping: Card-Metadaten -> Tabellen-Spalten
const cardToTableMapping: Record<string, string> = {
  'title': 'title',
  'status': 'status',
  'responsible': 'responsibleAndQualityControl',
  'qualityControl': 'responsibleAndQualityControl',
  'branch': 'branch',
  'dueDate': 'dueDate',
  'description': 'description'
};

// Helfer-Funktion: Tabellen-Spalte ausgeblendet -> Card-Metadaten ausblenden
const getHiddenCardMetadata = (hiddenTableColumns: string[]): Set<string> => {
  const hiddenCardMetadata = new Set<string>();
  hiddenTableColumns.forEach(tableCol => {
    const cardMetadata = tableToCardMapping[tableCol] || [];
    cardMetadata.forEach(cardMeta => hiddenCardMetadata.add(cardMeta));
  });
  return hiddenCardMetadata;
};

// Helfer-Funktion: Card-Metadaten zu Tabellen-Spalten konvertieren
const getCardMetadataFromColumnOrder = (columnOrder: string[]): string[] => {
  const cardMetadata: string[] = [];
  columnOrder.forEach(tableCol => {
    const cardMeta = tableToCardMapping[tableCol];
    if (cardMeta && cardMeta.length > 0) {
      cardMetadata.push(...cardMeta);
    }
  });
  // Beschreibung hinzufügen, wenn nicht schon vorhanden
  if (!cardMetadata.includes('description')) {
    cardMetadata.push('description');
  }
  return cardMetadata;
};

// Reservations: Tabellen-Spalte -> Card-Metadaten (1:1 Mapping)
const reservationTableToCardMapping: Record<string, string[]> = {
  'guestName': ['guestName'],
  'status': ['status'],
  'paymentStatus': ['paymentStatus'],
  'checkInDate': ['checkInDate'],
  'checkOutDate': ['checkOutDate'],
  'roomNumber': ['roomNumber'],
  'branch': ['branch'],
  'guestEmail': ['guestEmail'],
  'guestPhone': ['guestPhone'],
  'amount': ['amount'],
  'arrivalTime': ['arrivalTime'],
  'actions': [] // Keine Card-Entsprechung
};

// Reservations: Reverse Mapping: Card-Metadaten -> Tabellen-Spalten (1:1 Mapping)
const reservationCardToTableMapping: Record<string, string> = {
  'guestName': 'guestName',
  'status': 'status',
  'paymentStatus': 'paymentStatus',
  'checkInDate': 'checkInDate',
  'checkOutDate': 'checkOutDate',
  'roomNumber': 'roomNumber',
  'branch': 'branch',
  'guestEmail': 'guestEmail',
  'guestPhone': 'guestPhone',
  'amount': 'amount',
  'arrivalTime': 'arrivalTime'
};

// Tours: Tabellen-Spalte -> Card-Metadaten (1:1 Mapping)
const tourTableToCardMapping: Record<string, string[]> = {
  'title': ['title'],
  'type': ['type'],
  'price': ['price'],
  'location': ['location'],
  'duration': ['duration'],
  'branch': ['branch'],
  'createdBy': ['createdBy'],
  'isActive': ['isActive'],
  'actions': [] // Keine Card-Entsprechung
};

// Tours: Reverse Mapping: Card-Metadaten -> Tabellen-Spalten (1:1 Mapping)
const tourCardToTableMapping: Record<string, string> = {
  'title': 'title',
  'type': 'type',
  'price': 'price',
  'location': 'location',
  'duration': 'duration',
  'branch': 'branch',
  'createdBy': 'createdBy',
  'isActive': 'isActive'
};

// Tours: Helfer-Funktion: Tabellen-Spalte ausgeblendet -> Card-Metadaten ausblenden
const getTourHiddenCardMetadata = (hiddenTableColumns: string[]): Set<string> => {
  const hiddenCardMetadata = new Set<string>();
  hiddenTableColumns.forEach(tableCol => {
    const cardMetadata = tourTableToCardMapping[tableCol] || [];
    cardMetadata.forEach(cardMeta => hiddenCardMetadata.add(cardMeta));
  });
  return hiddenCardMetadata;
};

// Tours: Helfer-Funktion: Card-Metadaten zu Tabellen-Spalten konvertieren
const getTourCardMetadataFromColumnOrder = (columnOrder: string[]): string[] => {
  const cardMetadata: string[] = [];
  columnOrder.forEach(tableCol => {
    const cardMeta = tourTableToCardMapping[tableCol] || [];
    if (cardMeta.length > 0) {
      cardMetadata.push(...cardMeta);
    }
  });
  return cardMetadata;
};

// Reservations: Helfer-Funktion: Tabellen-Spalte ausgeblendet -> Card-Metadaten ausblenden
const getReservationHiddenCardMetadata = (hiddenTableColumns: string[]): Set<string> => {
  const hiddenCardMetadata = new Set<string>();
  hiddenTableColumns.forEach(tableCol => {
    const cardMetadata = reservationTableToCardMapping[tableCol] || [];
    cardMetadata.forEach(cardMeta => hiddenCardMetadata.add(cardMeta));
  });
  return hiddenCardMetadata;
};

// Reservations: Helfer-Funktion: Card-Metadaten zu Tabellen-Spalten konvertieren
const getReservationCardMetadataFromColumnOrder = (columnOrder: string[]): string[] => {
  const cardMetadata: string[] = [];
  columnOrder.forEach(tableCol => {
    const cardMeta = reservationTableToCardMapping[tableCol];
    if (cardMeta && cardMeta.length > 0) {
      cardMetadata.push(...cardMeta);
    }
  });
  return cardMetadata;
};

const Worktracker: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { hasPermission, permissions } = usePermissions();
    const location = useLocation();
    const navigate = useNavigate();
    const { showMessage } = useMessage();
    
    // Definiere die verfügbaren Spalten für die Tabelle (dynamisch aus Übersetzungen)
    const availableColumns = useMemo(() => [
        { id: 'title', label: t('tasks.columns.title'), shortLabel: t('tasks.columns.title') },
        { id: 'status', label: t('tasks.columns.status'), shortLabel: t('tasks.columns.status') },
        { id: 'responsibleAndQualityControl', label: t('tasks.columns.responsibleAndQualityControl'), shortLabel: t('tasks.columns.responsibleAndQualityControl').split('/')[0] },
        { id: 'branch', label: t('tasks.columns.branch'), shortLabel: t('tasks.columns.branch').substring(0, 5) },
        { id: 'dueDate', label: t('tasks.columns.dueDate'), shortLabel: t('tasks.columns.dueDate').substring(0, 5) },
        { id: 'actions', label: t('tasks.columns.actions'), shortLabel: t('common.actions').substring(0, 3) },
    ], [t]);

    // Definiere zusätzliche Spalten, die nur für den Filter verfügbar sind, nicht für die Tabellenanzeige
    const filterOnlyColumns = useMemo(() => [
        { id: 'responsible', label: t('tasks.columns.responsible'), shortLabel: t('tasks.columns.responsible').substring(0, 3) },
        { id: 'qualityControl', label: t('tasks.columns.qualityControl'), shortLabel: t('tasks.columns.qualityControl').substring(0, 2) },
    ], [t]);
    
    // Reservations-Spalten
    const availableReservationColumns = useMemo(() => [
        { id: 'guestName', label: t('reservations.columns.guestName', 'Gast'), shortLabel: t('reservations.columns.guestName', 'Gast').substring(0, 4) },
        { id: 'status', label: t('reservations.columns.status', 'Status'), shortLabel: t('reservations.columns.status', 'Status').substring(0, 3) },
        { id: 'paymentStatus', label: t('reservations.columns.paymentStatus', 'Zahlungsstatus'), shortLabel: t('reservations.columns.paymentStatus', 'Zahlungsstatus').substring(0, 3) },
        { id: 'checkInDate', label: t('reservations.columns.checkInDate', 'Check-in'), shortLabel: t('reservations.columns.checkInDate', 'Check-in').substring(0, 5) },
        { id: 'checkOutDate', label: t('reservations.columns.checkOutDate', 'Check-out'), shortLabel: t('reservations.columns.checkOutDate', 'Check-out').substring(0, 5) },
        { id: 'roomNumber', label: t('reservations.columns.roomNumber', 'Zimmer'), shortLabel: t('reservations.columns.roomNumber', 'Zimmer').substring(0, 3) },
        { id: 'branch', label: t('reservations.columns.branch', 'Niederlassung'), shortLabel: t('reservations.columns.branch', 'Niederlassung').substring(0, 5) },
        { id: 'guestEmail', label: t('reservations.columns.guestEmail', 'E-Mail'), shortLabel: t('reservations.columns.guestEmail', 'E-Mail').substring(0, 3) },
        { id: 'guestPhone', label: t('reservations.columns.guestPhone', 'Telefon'), shortLabel: t('reservations.columns.guestPhone', 'Telefon').substring(0, 3) },
        { id: 'amount', label: t('reservations.columns.amount', 'Betrag'), shortLabel: t('reservations.columns.amount', 'Betrag').substring(0, 3) },
        { id: 'arrivalTime', label: t('reservations.columns.arrivalTime', 'Ankunftszeit'), shortLabel: t('reservations.columns.arrivalTime', 'Ankunftszeit').substring(0, 3) },
        { id: 'actions', label: t('reservations.columns.actions', 'Aktionen'), shortLabel: t('common.actions').substring(0, 3) },
    ], [t]);
    
    // Reservations Filter-Spalten (zusätzliche Spalten nur für Filter)
    const reservationFilterOnlyColumns = useMemo(() => [
        { id: 'onlineCheckInCompleted', label: t('reservations.columns.onlineCheckInCompleted', 'Online Check-in'), shortLabel: t('reservations.columns.onlineCheckInCompleted', 'Online Check-in').substring(0, 3) },
        { id: 'doorPin', label: t('reservations.columns.doorPin', 'Tür-PIN'), shortLabel: t('reservations.columns.doorPin', 'Tür-PIN').substring(0, 3) },
    ], [t]);
    
    
    // Status-Übersetzungen (verwende zentrale Utils mit Übersetzungsunterstützung)
    // WICHTIG: Funktionalität bleibt identisch - nur Code-Duplikation entfernt!
    const getStatusLabel = (status: Task['status']): string => {
        return getStatusText(status, 'task', t);
    };
    // Tab-State
    const [activeTab, setActiveTab] = useState<'todos' | 'reservations' | 'tourBookings'>('todos');
    
    const [tasks, setTasks] = useState<Task[]>([]);
    const [allTasks, setAllTasks] = useState<Task[]>([]); // Alle Tasks (für Hintergrund-Laden und Filter-Wechsel)
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // ✅ Infinite Scroll für Anzeige (KEINE Pagination beim Laden)
    const [tasksDisplayLimit, setTasksDisplayLimit] = useState<number>(20); // Initial: 20 Items (wird basierend auf viewMode gesetzt)
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<Task['status'] | 'all'>('all');
    
    // Reservations-States
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [reservationsLoading, setReservationsLoading] = useState(false);
    const [reservationsError, setReservationsError] = useState<string | null>(null);
    const [reservationSearchTerm, setReservationSearchTerm] = useState('');
    const [reservationFilterStatus, setReservationFilterStatus] = useState<ReservationStatus | 'all'>('all');
    const [reservationFilterPaymentStatus, setReservationFilterPaymentStatus] = useState<PaymentStatus | 'all'>('all');
    
    const [isCreateReservationModalOpen, setIsCreateReservationModalOpen] = useState(false);
    const [syncingReservations, setSyncingReservations] = useState(false);
    const [generatingPinForReservation, setGeneratingPinForReservation] = useState<number | null>(null);
    const [selectedReservationForInvitation, setSelectedReservationForInvitation] = useState<Reservation | null>(null);
    const [isSendInvitationSidepaneOpen, setIsSendInvitationSidepaneOpen] = useState(false);
    const [selectedReservationForPasscode, setSelectedReservationForPasscode] = useState<Reservation | null>(null);
    const [isSendPasscodeSidepaneOpen, setIsSendPasscodeSidepaneOpen] = useState(false);
    
    // Tour-Bookings States
    const [tourBookings, setTourBookings] = useState<TourBooking[]>([]);
    const [allTourBookings, setAllTourBookings] = useState<TourBooking[]>([]);
    const [tourBookingsLoading, setTourBookingsLoading] = useState(false);
    const [tourBookingsError, setTourBookingsError] = useState<string | null>(null);
    const [tourBookingsSearchTerm, setTourBookingsSearchTerm] = useState('');
    const [selectedBookingForLink, setSelectedBookingForLink] = useState<TourBooking | null>(null);
    const [isTourReservationLinkModalOpen, setIsTourReservationLinkModalOpen] = useState(false);
    const [isCreateTourBookingModalOpen, setIsCreateTourBookingModalOpen] = useState(false);
    const [isEditTourBookingModalOpen, setIsEditTourBookingModalOpen] = useState(false);
    const [selectedBookingForEdit, setSelectedBookingForEdit] = useState<TourBooking | null>(null);
    
    // Reservations Filter States (analog zu Tasks)
    const [reservationFilterConditions, setReservationFilterConditions] = useState<FilterCondition[]>([]);
    const [reservationFilterLogicalOperators, setReservationFilterLogicalOperators] = useState<('AND' | 'OR')[]>([]);
    const [reservationFilterSortDirections, setReservationFilterSortDirections] = useState<Array<{ column: string; direction: 'asc' | 'desc'; priority: number; conditionIndex: number }>>([]);
    const [reservationActiveFilterName, setReservationActiveFilterName] = useState<string>('');
    const [reservationSelectedFilterId, setReservationSelectedFilterId] = useState<number | null>(null);
    
    // State für erweiterte Filterbedingungen
    const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([]);
    const [filterLogicalOperators, setFilterLogicalOperators] = useState<('AND' | 'OR')[]>([]);
    const [filterSortDirections, setFilterSortDirections] = useState<Array<{ column: string; direction: 'asc' | 'desc'; priority: number; conditionIndex: number }>>([]);
    
    // Filter State Management (Controlled Mode)
    const [activeFilterName, setActiveFilterName] = useState<string>('');
    const [selectedFilterId, setSelectedFilterId] = useState<number | null>(null);
    
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    // Tabellen-Header-Sortierung (nur für Tabellen-Ansicht)
    const [tableSortConfig, setTableSortConfig] = useState<SortConfig>({ key: 'dueDate', direction: 'asc' });
    // Tabellen-Header-Sortierung für Reservations (nur für Tabellen-Ansicht)
    const [reservationTableSortConfig, setReservationTableSortConfig] = useState<ReservationSortConfig>({ key: 'checkInDate', direction: 'desc' });
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [copiedTask, setCopiedTask] = useState<Task | null>(null);

    // ✅ MEMORY: Cleanup - Alle großen Arrays beim Unmount löschen
    useEffect(() => {
        return () => {
            // Tasks
            setTasks([]);
            setAllTasks([]);
            
            // Reservations
            setReservations([]);
            
            // Tour Bookings
            setTourBookings([]);
            setAllTourBookings([]);
            
            // Filter States (können auch groß sein)
            setFilterConditions([]);
            setReservationFilterConditions([]);
        };
    }, []); // Nur beim Unmount ausführen

    // ✅ MEMORY: allTasks intelligent löschen (nur wenn nicht mehr benötigt - Best Practice)
    // Löscht wenn: Standardfilter aktiviert wird ODER Tab gewechselt wird
    useEffect(() => {
        // Löschen wenn Standardfilter aktiviert wird (allTasks nicht mehr benötigt)
        if (selectedFilterId && allTasks.length > 0) {
            if (process.env.NODE_ENV === 'development') {
                console.log('🧹 allTasks gelöscht (Standardfilter aktiviert)');
            }
            setAllTasks([]);
            return;
        }
        
        // Löschen wenn Tab gewechselt wird (allTasks nicht mehr benötigt)
        if (activeTab !== 'todos' && allTasks.length > 0) {
            if (process.env.NODE_ENV === 'development') {
                console.log('🧹 allTasks gelöscht (Tab gewechselt)');
            }
            setAllTasks([]);
        }
    }, [selectedFilterId, activeTab, allTasks.length]);

    // ✅ MEMORY: allTourBookings intelligent löschen (nur wenn nicht mehr benötigt - Best Practice)
    // Löscht wenn: Tab gewechselt wird
    useEffect(() => {
        if (activeTab !== 'tourBookings' && allTourBookings.length > 0) {
            if (process.env.NODE_ENV === 'development') {
                console.log('🧹 allTourBookings gelöscht (Tab gewechselt)');
            }
            setAllTourBookings([]);
        }
    }, [activeTab, allTourBookings.length]);

    // Tabellen-Einstellungen laden - Tasks
    const {
        settings: tasksSettings,
        isLoading: isLoadingTasksSettings,
        updateColumnOrder: updateTasksColumnOrder,
        updateHiddenColumns: updateTasksHiddenColumns,
        toggleColumnVisibility: toggleTasksColumnVisibility,
        isColumnVisible: isTasksColumnVisible,
        updateViewMode: updateTasksViewMode
    } = useTableSettings('worktracker_tasks', {
        defaultColumnOrder,
        defaultHiddenColumns: [],
        defaultViewMode: 'cards'
    });
    
    // Tabellen-Einstellungen laden - Reservations
    const defaultReservationColumnOrder = ['guestName', 'status', 'paymentStatus', 'checkInDate', 'checkOutDate', 'roomNumber', 'branch', 'actions'];
    const {
        settings: reservationsSettings,
        isLoading: isLoadingReservationsSettings,
        updateColumnOrder: updateReservationsColumnOrder,
        updateHiddenColumns: updateReservationsHiddenColumns,
        toggleColumnVisibility: toggleReservationsColumnVisibility,
        isColumnVisible: isReservationsColumnVisible,
        updateViewMode: updateReservationsViewMode
    } = useTableSettings('worktracker-reservations', {
        defaultColumnOrder: defaultReservationColumnOrder,
        defaultHiddenColumns: [],
        defaultViewMode: 'cards'
    });
    
    // Dynamische Settings basierend auf activeTab
    const settings = activeTab === 'todos' ? tasksSettings : reservationsSettings;
    const isLoadingSettings = activeTab === 'todos' ? isLoadingTasksSettings : isLoadingReservationsSettings;
    const updateColumnOrder = activeTab === 'todos' ? updateTasksColumnOrder : updateReservationsColumnOrder;
    const updateHiddenColumns = activeTab === 'todos' ? updateTasksHiddenColumns : updateReservationsHiddenColumns;
    const toggleColumnVisibility = activeTab === 'todos' ? toggleTasksColumnVisibility : toggleReservationsColumnVisibility;
    const isColumnVisible = activeTab === 'todos' ? isTasksColumnVisible : isReservationsColumnVisible;
    const updateViewMode = activeTab === 'todos' ? updateTasksViewMode : updateReservationsViewMode;

    const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
    const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
    const [reservationsDisplayLimit, setReservationsDisplayLimit] = useState<number>(10); // Für Reservations (wird zu displayLimit)

    // Expand/Collapse States für Reservations (analog zu MonthlyReports)
    const [expandedReservationRows, setExpandedReservationRows] = useState<Set<number>>(new Set());

    // View-Mode aus Settings laden
    const viewMode = settings.viewMode || 'cards';

    // Abgeleitete Werte für Card-Ansicht aus Tabellen-Settings
    // Card-Metadaten-Reihenfolge aus columnOrder ableiten
    const cardMetadataOrder = useMemo(() => {
        if (activeTab === 'todos') {
            return getCardMetadataFromColumnOrder(settings.columnOrder || defaultColumnOrder);
        } else {
            return getReservationCardMetadataFromColumnOrder(settings.columnOrder || defaultReservationColumnOrder);
        }
    }, [settings.columnOrder, activeTab]);

    // Versteckte Card-Metadaten aus hiddenColumns ableiten
    const hiddenCardMetadata = useMemo(() => {
        if (activeTab === 'todos') {
            return getHiddenCardMetadata(settings.hiddenColumns || []);
        } else {
            return getReservationHiddenCardMetadata(settings.hiddenColumns || []);
        }
    }, [settings.hiddenColumns, activeTab]);

    // Sichtbare Card-Metadaten (alle Card-Metadaten minus versteckte)
    const visibleCardMetadata = useMemo(() => {
        return new Set(cardMetadataOrder.filter(meta => !hiddenCardMetadata.has(meta)));
    }, [cardMetadataOrder, hiddenCardMetadata]);

    // Lokale Sortierrichtungen für Tasks Cards (nicht persistiert)
    const [taskCardSortDirections, setTaskCardSortDirections] = useState<Record<string, 'asc' | 'desc'>>(() => {
        return defaultCardSortDirections;
    });

    // Handler für Sortierrichtung-Änderung bei Tasks
    const handleTaskCardSortDirectionChange = (columnId: string, direction: 'asc' | 'desc') => {
        setTaskCardSortDirections(prev => ({
            ...prev,
            [columnId]: direction
        }));
    };

    // Lokale Sortierrichtungen für Reservations Cards (nicht persistiert)
    const [reservationCardSortDirections, setReservationCardSortDirections] = useState<Record<string, 'asc' | 'desc'>>(() => {
        return defaultReservationCardSortDirections;
    });

    // Handler für Sortierrichtung-Änderung bei Reservations
    const handleReservationCardSortDirectionChange = (columnId: string, direction: 'asc' | 'desc') => {
        setReservationCardSortDirections(prev => ({
            ...prev,
            [columnId]: direction
        }));
    };


    // Toggle-Funktion für Expand/Collapse bei Reservations
    const toggleReservationExpanded = (reservationId: number) => {
        setExpandedReservationRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(reservationId)) {
                newSet.delete(reservationId);
            } else {
                newSet.add(reservationId);
            }
            return newSet;
        });
    };

    // CSS-Klasse für Container-Box setzen (für CSS-basierte Schattierungs-Entfernung)
    useEffect(() => {
        const wrappers = document.querySelectorAll('.dashboard-tasks-wrapper');
        wrappers.forEach(wrapper => {
            if (viewMode === 'cards') {
                wrapper.classList.add('cards-mode');
            } else {
                wrapper.classList.remove('cards-mode');
            }
        });
    }, [viewMode]);

    // Ref um sicherzustellen, dass loadTasks nur einmal beim Mount aufgerufen wird
    // (auch bei React.StrictMode doppelter Ausführung)
    const hasLoadedRef = useRef(false);

    // ✅ PERFORMANCE: loadTasks als useCallback (stabile Referenz für useEffect)
    // ❌ KEINE Pagination mehr - immer ALLE Ergebnisse laden
    const loadTasks = useCallback(async (
        filterId?: number, 
        filterConditions?: any[], 
        background = false
    ) => {
        try {
            if (!background) {
                setLoading(true);
            }
            
            // Baue Query-Parameter (❌ KEINE limit/offset Parameter mehr)
            const params: any = {};
            if (filterId) {
                params.filterId = filterId;
            } else if (filterConditions && filterConditions.length > 0) {
                params.filterConditions = JSON.stringify({
                    conditions: filterConditions,
                    operators: filterLogicalOperators
                });
            }
            
            const response = await axiosInstance.get(API_ENDPOINTS.TASKS.BASE, { params });
            const tasksData = response.data;
            
            // ✅ ALLE Tasks werden geladen (kein limit/offset)
            // Attachments sind bereits in der Response enthalten
            // URL-Generierung für Attachments hinzufügen
            // Sicherstellen, dass keine undefined/null Werte im Array sind
            const tasksWithAttachments = tasksData
                .filter((task: Task) => task != null)
                .map((task: Task) => {
                    const attachments = (task.attachments || [])
                        .filter((att: any) => att != null)
                        .map((att: any) => ({
                            id: att.id,
                            fileName: att.fileName,
                            fileType: att.fileType,
                            fileSize: att.fileSize,
                            filePath: att.filePath,
                            uploadedAt: att.uploadedAt,
                            url: getTaskAttachmentUrl(task.id, att.id)
                        }));
                    
                    return {
                        ...task,
                        attachments: attachments
                    };
                });
            
            // ✅ MEMORY: Nur max 100 Items im State behalten (alte Items automatisch entfernen)
            const MAX_ITEMS_IN_STATE = 100;
            const tasksToStore = tasksWithAttachments.length > MAX_ITEMS_IN_STATE
                ? tasksWithAttachments.slice(-MAX_ITEMS_IN_STATE)
                : tasksWithAttachments;
            
            if (background) {
                // Hintergrund-Laden: Speichere in allTasks
                if (process.env.NODE_ENV === 'development') {
                    console.log('📋 Alle Tasks im Hintergrund geladen:', tasksWithAttachments.length, 'Tasks');
                }
                setAllTasks(tasksToStore);
            } else {
                // Initiales Laden: Ersetze Tasks (ALLE werden geladen)
                if (process.env.NODE_ENV === 'development') {
                    console.log('📋 Tasks geladen:', tasksWithAttachments.length, 'Tasks (alle)');
                }
                setTasks(tasksToStore);
                // ✅ Initial displayLimit setzen (abhängig von viewMode)
                setTasksDisplayLimit(viewMode === 'cards' ? 10 : 20);
            }
            setError(null);
        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Fehler beim Laden der Tasks:', error);
            }
            if (!background) {
                setError(t('worktime.messages.tasksLoadError'));
            }
        } finally {
            if (!background) {
                setLoading(false);
            }
        }
    }, [filterLogicalOperators, t, viewMode]);
    
    // ❌ loadMoreTasks entfernt - nicht mehr nötig (Infinite Scroll nur für Anzeige)

    const handleGeneratePinAndSend = async (reservationId: number) => {
        try {
            setGeneratingPinForReservation(reservationId);
            await reservationService.generatePinAndSend(reservationId);
            showMessage(t('reservations.pinGeneratedAndSent', 'PIN-Code generiert und Mitteilung versendet'), 'success');
            await loadReservations(); // Aktualisiere Liste
        } catch (error: any) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Fehler beim Generieren des PIN-Codes und Versenden der Mitteilung:', error);
            }
            showMessage(
                error.response?.data?.message || t('reservations.pinGenerateError', 'Fehler beim Generieren des PIN-Codes und Versenden der Mitteilung'),
                'error'
            );
        } finally {
            setGeneratingPinForReservation(null);
        }
    };

    // Funktion zum Laden der Reservations (mit Filter-Parameter)
    const loadReservations = async (filterId?: number, filterConditions?: any[]) => {
        try {
            setReservationsLoading(true);
            setReservationsError(null);
            
            // Baue Query-Parameter (Filter server-seitig)
            const params: any = {};
            if (filterId) {
                params.filterId = filterId;
            } else if (filterConditions && filterConditions.length > 0) {
                params.filterConditions = JSON.stringify({
                    conditions: filterConditions,
                    operators: reservationFilterLogicalOperators
                });
            }
            
            const response = await axiosInstance.get(API_ENDPOINTS.RESERVATION.BASE, { params });
            const reservationsData = response.data?.data || response.data || [];
            
            // ✅ ALLE gefilterten Reservierungen werden geladen (server-seitig gefiltert)
            if (process.env.NODE_ENV === 'development') {
                console.log('📋 Reservations geladen:', reservationsData.length, 'Reservations (alle, gefiltert)');
            }
            
            // ✅ MEMORY: Nur max 100 Items im State behalten (alte Items automatisch entfernen)
            const MAX_ITEMS_IN_STATE = 100;
            const reservationsToStore = reservationsData.length > MAX_ITEMS_IN_STATE
                ? reservationsData.slice(-MAX_ITEMS_IN_STATE)
                : reservationsData;
            
            setReservations(reservationsToStore);
            // ✅ Initial displayLimit setzen (abhängig von viewMode)
            setReservationsDisplayLimit(viewMode === 'cards' ? 10 : 20);
        } catch (err: any) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Fehler beim Laden der Reservations:', err);
            }
            const errorMessage = err.response?.data?.message || t('reservations.loadError', 'Fehler beim Laden der Reservations');
            setReservationsError(errorMessage);
            showMessage(errorMessage, 'error');
        } finally {
            setReservationsLoading(false);
        }
    };

    // ✅ Initialer Filter-Load für Reservations (wie bei Tasks)
    useEffect(() => {
        const setInitialReservationFilter = async () => {
            try {
                const response = await axiosInstance.get(API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(RESERVATIONS_TABLE_ID));
                const filters = response.data;
                
                const aktuellFilter = filters.find((filter: any) => filter.name === t('reservations.filters.current', 'Aktuell'));
                if (aktuellFilter) {
                    setReservationActiveFilterName(t('reservations.filters.current', 'Aktuell'));
                    setReservationSelectedFilterId(aktuellFilter.id);
                    applyReservationFilterConditions(aktuellFilter.conditions, aktuellFilter.operators);
                    // ✅ Lade Reservierungen mit Filter
                    await loadReservations(aktuellFilter.id);
                } else {
                    // Kein Filter: Lade alle Reservierungen
                    await loadReservations();
                }
            } catch (error) {
                console.error('Fehler beim Setzen des initialen Filters:', error);
                // Fallback: Lade alle Reservierungen
                await loadReservations();
            }
        };
        
        if (activeTab === 'reservations' && hasPermission('reservations', 'read', 'table')) {
            setInitialReservationFilter();
        }
    }, [activeTab]);
    
    // Infinite Scroll Handler für Tasks
    // ✅ PERFORMANCE: filterConditions als useRef verwenden (verhindert Re-Render-Loops)
    const filterConditionsRef = useRef(filterConditions);
    useEffect(() => {
        filterConditionsRef.current = filterConditions;
    }, [filterConditions]);
    
    // ✅ MEMORY: Event Listener mit useRef (nur einmal registrieren, verhindert Memory-Leak)
    // ✅ Infinite Scroll für Anzeige (nicht für Laden)
    const scrollHandlerRef = useRef<() => void>();
    useEffect(() => {
        scrollHandlerRef.current = () => {
            // Prüfe ob User nahe am Ende der Seite ist
            if (
                activeTab === 'todos' &&
                window.innerHeight + window.scrollY >= document.documentElement.offsetHeight - 1000 &&
                tasksDisplayLimit < filteredAndSortedTasks.length
            ) {
                // ✅ Infinite Scroll für Anzeige: Zeige weitere Items
                const increment = viewMode === 'cards' ? 10 : 20;
                setTasksDisplayLimit(prev => prev + increment);
            }
        };
        
        const handleScroll = () => scrollHandlerRef.current?.();
        
        window.addEventListener('scroll', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, [activeTab, tasksDisplayLimit, filteredAndSortedTasks.length, reservationsDisplayLimit, filteredAndSortedReservations.length, viewMode]);
    
    // Funktion zum Laden der Tour-Buchungen
    const loadTourBookings = async () => {
        try {
            setTourBookingsLoading(true);
            setTourBookingsError(null);
            const response = await axiosInstance.get(API_ENDPOINTS.TOUR_BOOKINGS.BASE);
            const bookingsData = response.data?.data || response.data || [];
            if (process.env.NODE_ENV === 'development') {
                console.log('📋 Tour-Buchungen geladen:', bookingsData.length, 'Buchungen');
            }
            setTourBookings(bookingsData);
            setAllTourBookings(bookingsData);
        } catch (err: any) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Fehler beim Laden der Tour-Buchungen:', err);
            }
            const errorMessage = err.response?.data?.message || t('tourBookings.loadError', 'Fehler beim Laden der Tour-Buchungen');
            setTourBookingsError(errorMessage);
            showMessage(errorMessage, 'error');
        } finally {
            setTourBookingsLoading(false);
        }
    };
    
    // Lade Tour-Buchungen, wenn Tab aktiv ist
    useEffect(() => {
        if (activeTab === 'tourBookings' && hasPermission('tour_bookings', 'read', 'table')) {
            loadTourBookings();
        }
    }, [activeTab]);
    

    // ✅ FIX: Duplikate entfernt - Initial Tasks laden (nur einmal, auch bei React.StrictMode)
    useEffect(() => {
        if (!hasLoadedRef.current) {
            hasLoadedRef.current = true;
            loadTasks();
        }
    }, [loadTasks]);

    // URL-Parameter für editTask verarbeiten
    useEffect(() => {
        if (tasks.length > 0) {
            const queryParams = new URLSearchParams(location.search);
            const editTaskId = queryParams.get('editTask');
            
            if (editTaskId) {
                const taskId = parseInt(editTaskId, 10);
                if (!isNaN(taskId)) {
                    const task = tasks.find(t => t.id === taskId);
                    if (task) {
                        setSelectedTask(task);
                        setIsEditModalOpen(true);
                    }
                }
            }
        }
    }, [tasks, location.search]);

    // Standard-Filter erstellen und speichern
    useEffect(() => {
        const createStandardFilters = async () => {
            try {
                const token = localStorage.getItem('token');
                
                if (!token) {
                    if (process.env.NODE_ENV === 'development') {
                        console.error('Nicht authentifiziert');
                    }
                    return;
                }

                // Prüfen, ob die Standard-Filter bereits existieren
                const existingFiltersResponse = await axiosInstance.get(
                    `${API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(TODOS_TABLE_ID)}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );

                const existingFilters = existingFiltersResponse.data || [];
                const archivFilterExists = existingFilters.some(filter => filter.name === 'Archiv');
                const aktuellFilterExists = existingFilters.some(filter => filter.name === 'Aktuell');

                // Erstelle "Archiv"-Filter, wenn er noch nicht existiert
                if (!archivFilterExists) {
                    const archivFilter = {
                        tableId: TODOS_TABLE_ID,
                        name: 'Archiv', // Immer auf Deutsch speichern, wird beim Anzeigen übersetzt
                        conditions: [
                            { column: 'status', operator: 'equals', value: 'done' }
                        ],
                        operators: []
                    };

                    await axiosInstance.post(
                        `${API_ENDPOINTS.SAVED_FILTERS.BASE}`,
                        archivFilter,
                        {
                            headers: {
                                Authorization: `Bearer ${token}`
                            }
                        }
                    );
                }

                // Erstelle "Aktuell"-Filter, wenn er noch nicht existiert
                if (!aktuellFilterExists) {
                    const aktuellFilter = {
                        tableId: TODOS_TABLE_ID,
                        name: 'Aktuell', // Immer auf Deutsch speichern, wird beim Anzeigen übersetzt
                        conditions: [
                            { column: 'status', operator: 'notEquals', value: 'done' }
                        ],
                        operators: []
                    };

                    await axiosInstance.post(
                        `${API_ENDPOINTS.SAVED_FILTERS.BASE}`,
                        aktuellFilter,
                        {
                            headers: {
                                Authorization: `Bearer ${token}`
                            }
                        }
                    );
                }
            } catch (error) {
                if (process.env.NODE_ENV === 'development') {
                    console.error('Fehler beim Erstellen der Standard-Filter:', error);
                }
            }
        };

        createStandardFilters();
    }, []);

    // getStatusColor und getStatusText werden jetzt von statusUtils verwendet (siehe getStatusLabel oben)

    const handleStatusChange = async (taskId: number, newStatus: Task['status']) => {
        try {
            // Optimistisches Update: State sofort aktualisieren
            setTasks(prevTasks => {
                const validTasks = prevTasks.filter(task => task != null);
                return validTasks.map(task => 
                    task.id === taskId ? { ...task, status: newStatus } : task
                );
            });

            await axiosInstance.patch(API_ENDPOINTS.TASKS.BY_ID(taskId), { status: newStatus });
            toast.success(t('worktime.messages.taskUpdated'));
        } catch (error) {
            // Rollback bei Fehler: Vollständiges Reload
            if (process.env.NODE_ENV === 'development') {
                console.error('Fehler beim Aktualisieren des Status:', error);
            }
            loadTasks();
                toast.error(t('worktime.messages.taskUpdatedError'));
        }
    };

    const handleEditClick = (task: Task) => {
        setSelectedTask(task);
        setIsEditModalOpen(true);
    };

    const isResponsibleForTask = (task: Task) => {
        if (task.responsible) {
            return task.responsible.id === user?.id;
        } else if (task.role) {
            // Prüfe, ob der Benutzer die angegebene Rolle hat
            return user?.roles?.some(userRole => userRole.role?.id === task.role?.id) || false;
        }
        return false;
    };

    const isQualityControlForTask = (task: Task) => {
        return task.qualityControl?.id === user?.id;
    };

    const handleSort = (key: SortConfig['key']) => {
        // Nur für Tabellen-Ansicht (Header-Sortierung)
        if (viewMode === 'table') {
            setTableSortConfig(current => ({
                key,
                direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
            }));
        }
    };

    const handleReservationSort = (key: ReservationSortConfig['key']) => {
        // Nur für Tabellen-Ansicht (Header-Sortierung)
        if (viewMode === 'table' && activeTab === 'reservations') {
            setReservationTableSortConfig(current => ({
                key,
                direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
            }));
        }
    };


    const renderStatusButtons = (task: Task): JSX.Element[] => {
        const buttons: JSX.Element[] = [];
        
        // Prüfe, ob der Benutzer Schreibberechtigungen für Tasks hat
        const canModifyTasks = hasPermission('tasks', 'write', 'table');
        
        if (!canModifyTasks) return buttons;
        
        // Zurück-Button (links)
        if (task.status === 'in_progress' && isResponsibleForTask(task)) {
            buttons.push(
                <div className="relative group">
                    <button
                        key="back"
                        onClick={() => handleStatusChange(task.id, 'open')}
                        className="p-1.5 bg-red-600 dark:bg-red-500 text-white rounded hover:bg-red-700 dark:hover:bg-red-600"
                    >
                        <ArrowLeftIcon className="h-5 w-5" />
                    </button>
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                        {t('tasks.actions.backToOpen')}
                    </div>
                </div>
            );
        } else if (task.status === 'quality_control' && isResponsibleForTask(task)) {
            buttons.push(
                <div className="relative group">
                    <button
                        key="back"
                        onClick={() => handleStatusChange(task.id, 'in_progress')}
                        className="p-1.5 bg-red-600 dark:bg-red-500 text-white rounded hover:bg-red-700 dark:hover:bg-red-600"
                    >
                        <ArrowLeftIcon className="h-5 w-5" />
                    </button>
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                        {t('tasks.actions.backToInProgress')}
                    </div>
                </div>
            );
        } else if (task.status === 'done' && isQualityControlForTask(task)) {
            buttons.push(
                <div className="relative group">
                    <button
                        key="back"
                        onClick={() => handleStatusChange(task.id, 'quality_control')}
                        className="p-2 bg-red-600 dark:bg-red-500 text-white rounded hover:bg-red-700 dark:hover:bg-red-600"
                    >
                        <ArrowLeftIcon className="h-6 w-6" />
                    </button>
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                        {t('tasks.actions.backToQualityControl')}
                    </div>
                </div>
            );
        }

        // Weiter-Button (rechts)
        if (task.status === 'open' && isResponsibleForTask(task)) {
            buttons.push(
                <div className="relative group">
                    <button
                        key="forward"
                        onClick={() => handleStatusChange(task.id, 'in_progress')}
                        className="p-1.5 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600"
                    >
                        <ArrowRightIcon className="h-5 w-5" />
                    </button>
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                        {t('tasks.actions.setInProgress')}
                    </div>
                </div>
            );
        } else if (task.status === 'in_progress' && isResponsibleForTask(task)) {
            buttons.push(
                <div className="relative group">
                    <button
                        key="forward"
                        onClick={() => handleStatusChange(task.id, 'quality_control')}
                        className="p-1.5 bg-purple-600 dark:bg-purple-500 text-white rounded hover:bg-purple-700 dark:hover:bg-purple-600"
                    >
                        <ArrowRightIcon className="h-5 w-5" />
                    </button>
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                        {t('tasks.actions.setQualityControl')}
                    </div>
                </div>
            );
        } else if (task.status === 'quality_control' && isQualityControlForTask(task)) {
            buttons.push(
                <div className="relative group">
                    <button
                        key="forward"
                        onClick={() => handleStatusChange(task.id, 'done')}
                        className="p-1.5 bg-green-600 dark:bg-green-500 text-white rounded hover:bg-green-700 dark:hover:bg-green-600"
                    >
                        <ArrowRightIcon className="h-5 w-5" />
                    </button>
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                        {t('tasks.actions.markDone')}
                    </div>
                </div>
            );
        }

        return buttons;
    };

    const getActiveFilterCount = () => {
        if (activeTab === 'todos') {
            return filterConditions.length;
        } else if (activeTab === 'reservations') {
            return reservationFilterConditions.length;
        }
        return 0;
    };

    const applyFilterConditions = (conditions: FilterCondition[], operators: ('AND' | 'OR')[], sortDirections?: Array<{ column: string; direction: 'asc' | 'desc'; priority: number; conditionIndex: number }>) => {
        setFilterConditions(conditions);
        setFilterLogicalOperators(operators);
        if (sortDirections !== undefined) {
            // Sicherstellen, dass sortDirections ein Array ist
            const validSortDirections = Array.isArray(sortDirections) ? sortDirections : [];
            setFilterSortDirections(validSortDirections);
        }
    };
    
    const resetFilterConditions = () => {
        setFilterConditions([]);
        setFilterLogicalOperators([]);
        setFilterSortDirections([]);
        setActiveFilterName('');
        setSelectedFilterId(null);
    };
    
    // Reservations Filter Functions
    const applyReservationFilterConditions = (conditions: FilterCondition[], operators: ('AND' | 'OR')[], sortDirections?: Array<{ column: string; direction: 'asc' | 'desc'; priority: number; conditionIndex: number }>) => {
        setReservationFilterConditions(conditions);
        setReservationFilterLogicalOperators(operators);
        if (sortDirections !== undefined) {
            const validSortDirections = Array.isArray(sortDirections) ? sortDirections : [];
            setReservationFilterSortDirections(validSortDirections);
        }
    };
    
    const resetReservationFilterConditions = () => {
        setReservationFilterConditions([]);
        setReservationFilterLogicalOperators([]);
        setReservationFilterSortDirections([]);
        setReservationActiveFilterName('');
        setReservationSelectedFilterId(null);
    };
    
    // Filter Change Handler (Controlled Mode)
    const handleFilterChange = async (name: string, id: number | null, conditions: FilterCondition[], operators: ('AND' | 'OR')[], sortDirections?: Array<{ column: string; direction: 'asc' | 'desc'; priority: number; conditionIndex: number }>) => {
        if (activeTab === 'todos') {
            setActiveFilterName(name);
            setSelectedFilterId(id);
            applyFilterConditions(conditions, operators, sortDirections);
            // Table-Header-Sortierung zurücksetzen, damit Filter-Sortierung übernimmt
            setTableSortConfig({ key: 'dueDate', direction: 'asc' });
            
            // ✅ Filter zurücksetzen bei Filter-Wechsel
            setTasksDisplayLimit(viewMode === 'cards' ? 10 : 20);
            
            // Wenn Filter-ID vorhanden (Standardfilter): Server-seitig laden
            // Sonst: Client-seitig filtern (komplexe Filter)
            if (id) {
                await loadTasks(id, undefined, false); // ❌ KEINE Pagination mehr
            }
            // Wenn kein ID: Client-seitiges Filtering wird automatisch durch filteredAndSortedTasks angewendet
        } else if (activeTab === 'reservations') {
            setReservationActiveFilterName(name);
            setReservationSelectedFilterId(id);
            applyReservationFilterConditions(conditions, operators, sortDirections);
            // Table-Header-Sortierung zurücksetzen, damit Filter-Sortierung übernimmt
            setReservationTableSortConfig({ key: 'checkInDate', direction: 'desc' });
        }
    };
    
    const handleReservationFilterChange = async (name: string, id: number | null, conditions: FilterCondition[], operators: ('AND' | 'OR')[], sortDirections?: Array<{ column: string; direction: 'asc' | 'desc'; priority: number; conditionIndex: number }>) => {
        setReservationActiveFilterName(name);
        setReservationSelectedFilterId(id);
        applyReservationFilterConditions(conditions, operators, sortDirections);
        setReservationTableSortConfig({ key: 'checkInDate', direction: 'desc' });
        
        // ✅ Filter zurücksetzen bei Filter-Wechsel
        setReservationsDisplayLimit(viewMode === 'cards' ? 10 : 20);
        
        // ✅ Lade Reservierungen mit Filter (server-seitig)
        if (id) {
            await loadReservations(id);
        } else if (conditions.length > 0) {
            await loadReservations(undefined, conditions);
        } else {
            await loadReservations(); // Kein Filter
        }
    };

    const getStatusPriority = (status: Task['status']): number => {
        switch (status) {
            case 'open': return 1;
            case 'in_progress': return 2;
            case 'improval': return 3;
            case 'quality_control': return 4;
            case 'done': return 5;
            default: return 99; // Fallback für unbekannte Status
        }
    };

    // Status-Farben für Reservations
    const getReservationStatusColor = (status: ReservationStatus): string => {
        switch (status) {
            case ReservationStatus.CONFIRMED:
                return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
            case ReservationStatus.NOTIFICATION_SENT:
                return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200';
            case ReservationStatus.CHECKED_IN:
                return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
            case ReservationStatus.CHECKED_OUT:
                return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
            case ReservationStatus.CANCELLED:
                return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
            case ReservationStatus.NO_SHOW:
                return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
            default:
                return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
        }
    };

    const getPaymentStatusColor = (status: PaymentStatus): string => {
        switch (status) {
            case PaymentStatus.PAID:
                return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
            case PaymentStatus.PARTIALLY_PAID:
                return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
            case PaymentStatus.REFUNDED:
                return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200';
            case PaymentStatus.PENDING:
            default:
                return 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200';
        }
    };

    const filteredAndSortedTasks = useMemo(() => {
        // Verwende allTasks, wenn verfügbar und kein Standardfilter aktiv (für komplexe Filter)
        // Sonst verwende tasks (bereits server-seitig gefiltert)
        const tasksToFilter = (allTasks.length > 0 && !selectedFilterId) ? allTasks : tasks;
        
        if (process.env.NODE_ENV === 'development') {
            console.log('🔄 Filtere Tasks:', tasksToFilter.length, 'Tasks vorhanden');
            console.log('🔄 Filterbedingungen:', filterConditions);
            console.log('🔄 Verwende:', allTasks.length > 0 && !selectedFilterId ? 'allTasks (client-seitig)' : 'tasks (server-seitig gefiltert)');
        }
        
        // Sicherstellen, dass keine undefined/null Werte im Array sind
        const validTasks = tasksToFilter.filter(task => task != null);
        const filtered = validTasks
            .filter(task => {
                // Globale Suchfunktion
                if (searchTerm) {
                    const searchLower = searchTerm.toLowerCase();
                    const matchesSearch = 
                        task.title.toLowerCase().includes(searchLower) ||
                        (task.description && task.description.toLowerCase().includes(searchLower)) ||
                        (task.responsible ? `${task.responsible.firstName} ${task.responsible.lastName}`.toLowerCase().includes(searchLower) : false) ||
                        (task.role ? task.role.name.toLowerCase().includes(searchLower) : false) ||
                        (task.qualityControl && `${task.qualityControl.firstName} ${task.qualityControl.lastName}`.toLowerCase().includes(searchLower)) ||
                        task.branch.name.toLowerCase().includes(searchLower);
                    
                    if (!matchesSearch) return false;
                }
                
                // Wenn erweiterte Filterbedingungen definiert sind, wende diese an
                if (filterConditions.length > 0) {
                    // Column-Evaluatoren für Tasks mit korrekter User/Role-Logik
                    const columnEvaluators: any = {
                        'title': (task: Task, cond: FilterCondition) => {
                            const value = (cond.value as string || '').toLowerCase();
                            if (!task.title || typeof task.title !== 'string') {
                                if (process.env.NODE_ENV === 'development') {
                                    console.error('title evaluator: task.title ist undefined oder kein String', { task, cond });
                                }
                                return null;
                            }
                            const title = task.title.toLowerCase();
                            if (!title || typeof title !== 'string') {
                                if (process.env.NODE_ENV === 'development') {
                                    console.error('title evaluator: title nach toLowerCase() ist undefined oder kein String', { task, cond, title });
                                }
                                return null;
                            }
                            if (cond.operator === 'equals') return task.title === cond.value;
                            if (cond.operator === 'contains') return title.includes(value);
                            if (cond.operator === 'startsWith') return title.startsWith(value);
                            if (cond.operator === 'endsWith') {
                                if (title === undefined || title === null) {
                                    console.error('title evaluator: title ist undefined/null vor endsWith', { task, cond, title, value });
                                    return false;
                                }
                                return title.endsWith(value);
                            }
                            return null;
                        },
                        'status': (task: Task, cond: FilterCondition) => {
                            if (cond.operator === 'equals') return task.status === cond.value;
                            if (cond.operator === 'notEquals') return task.status !== cond.value;
                            return null;
                        },
                        'responsible': (task: Task, cond: FilterCondition) => {
                            // Unterstützt user-{id} und role-{id} Format
                            const responsibleName = task.responsible
                                ? `${task.responsible.firstName} ${task.responsible.lastName}`
                                : task.role
                                    ? task.role.name
                                    : '';
                            return evaluateUserRoleCondition(
                                task.responsible?.id || null,
                                task.role?.id || null,
                                cond,
                                responsibleName
                            );
                        },
                        'qualityControl': (task: Task, cond: FilterCondition) => {
                            // Unterstützt nur user-{id} Format (keine Rollen)
                            const qualityControlName = task.qualityControl
                                ? `${task.qualityControl.firstName} ${task.qualityControl.lastName}`
                                : '';
                            return evaluateUserRoleCondition(
                                task.qualityControl?.id || null,
                                null, // QualityControl hat keine Rollen
                                cond,
                                qualityControlName
                            );
                        },
                        'responsibleAndQualityControl': (task: Task, cond: FilterCondition) => {
                            // Unterstützt user-{id} und role-{id} Format für beide Felder
                            const responsibleName = task.responsible
                                ? `${task.responsible.firstName} ${task.responsible.lastName}`
                                : task.role
                                    ? task.role.name
                                    : '';
                            const qualityControlName = task.qualityControl
                                ? `${task.qualityControl.firstName} ${task.qualityControl.lastName}`
                                : '';
                            return evaluateResponsibleAndQualityControl(
                                task.responsible?.id || null,
                                task.role?.id || null,
                                task.qualityControl?.id || null,
                                cond,
                                responsibleName,
                                qualityControlName
                            );
                        },
                        'branch': (task: Task, cond: FilterCondition) => {
                            const branchName = task.branch.name.toLowerCase();
                            const value = (cond.value as string || '').toLowerCase();
                            if (cond.operator === 'equals') return branchName === value;
                            if (cond.operator === 'contains') return branchName.includes(value);
                            return null;
                        },
                        'dueDate': (task: Task, cond: FilterCondition) => {
                            return evaluateDateCondition(task.dueDate, cond);
                        }
                    };

                    const getFieldValue = (task: Task, columnId: string): any => {
                        switch (columnId) {
                            case 'title': return task.title;
                            case 'status': return task.status;
                            case 'responsible': return task.responsible
                                ? `${task.responsible.firstName} ${task.responsible.lastName}`
                                : task.role
                                    ? task.role.name
                                    : '';
                            case 'qualityControl': return task.qualityControl
                                ? `${task.qualityControl.firstName} ${task.qualityControl.lastName}`
                                : '';
                            case 'responsibleAndQualityControl': return task.responsible
                                ? `${task.responsible.firstName} ${task.responsible.lastName}`
                                : task.role
                                    ? task.role.name
                                    : '';
                            case 'branch': return task.branch.name;
                            case 'dueDate': return task.dueDate;
                            default: return (task as any)[columnId];
                        }
                    };

                    // Wende Filter mit zentraler Logik an (nur für dieses einzelne Item)
                    const filtered = applyFilters(
                        [task],
                        filterConditions,
                        filterLogicalOperators,
                        getFieldValue,
                        columnEvaluators
                    );
                    
                    if (filtered.length === 0) return false;
                }
                
                return true;
            });
        
        if (process.env.NODE_ENV === 'development') {
            console.log('✅ Gefilterte Tasks:', filtered.length, 'von', tasks.length);
        }
        
        // Hilfsfunktion zum Extrahieren von Werten für Sortierung
        const getSortValue = (task: Task, columnId: string): any => {
            switch (columnId) {
                case 'title':
                    return task.title.toLowerCase();
                case 'status':
                    return getStatusPriority(task.status);
                case 'responsible':
                case 'responsibleAndQualityControl':
                    return task.responsible ? `${task.responsible.firstName} ${task.responsible.lastName}`.toLowerCase() : (task.role ? `Rolle: ${task.role.name}`.toLowerCase() : '');
                case 'qualityControl':
                    return task.qualityControl ? `${task.qualityControl.firstName} ${task.qualityControl.lastName}`.toLowerCase() : '';
                case 'branch':
                    return task.branch.name.toLowerCase();
                case 'dueDate':
                    return task.dueDate ? new Date(task.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
                case 'description':
                    return (task.description || '').toLowerCase();
                default:
                    return '';
            }
        };
        
        const sorted = filtered.sort((a, b) => {
            // 1. Priorität: Table-Header-Sortierung (temporäre Überschreibung, auch wenn Filter aktiv)
            if (viewMode === 'table' && tableSortConfig.key) {
                const valueA = getSortValue(a, tableSortConfig.key);
                const valueB = getSortValue(b, tableSortConfig.key);
                
                let comparison = 0;
                if (typeof valueA === 'number' && typeof valueB === 'number') {
                    comparison = valueA - valueB;
                } else {
                    comparison = String(valueA).localeCompare(String(valueB));
                }
                
                if (comparison !== 0) {
                    return tableSortConfig.direction === 'asc' ? comparison : -comparison;
                }
            }
            
            // 2. Priorität: Filter-Sortierrichtungen (wenn Filter aktiv)
            if (filterSortDirections.length > 0 && filterConditions.length > 0) {
                // Sortiere nach Priorität (1, 2, 3, ...)
                const sortedByPriority = [...filterSortDirections].sort((sd1, sd2) => sd1.priority - sd2.priority);
                
                for (const sortDir of sortedByPriority) {
                    const valueA = getSortValue(a, sortDir.column);
                    const valueB = getSortValue(b, sortDir.column);
                    
                    let comparison = 0;
                    if (typeof valueA === 'number' && typeof valueB === 'number') {
                        comparison = valueA - valueB;
                    } else {
                        comparison = String(valueA).localeCompare(String(valueB));
                    }
                    
                    if (sortDir.direction === 'desc') {
                        comparison = -comparison;
                    }
                    
                    if (comparison !== 0) {
                        return comparison;
                    }
                }
                return 0;
            }
            
            // 3. Priorität: Cards-Mode Multi-Sortierung (wenn kein Filter aktiv, Cards-Mode)
            if (viewMode === 'cards' && filterConditions.length === 0) {
                const sortableColumns = cardMetadataOrder.filter(colId => visibleCardMetadata.has(colId));
                
                for (const columnId of sortableColumns) {
                    const direction = taskCardSortDirections[columnId] || 'asc';
                    const valueA = getSortValue(a, columnId);
                    const valueB = getSortValue(b, columnId);
                    
                    let comparison = 0;
                    if (typeof valueA === 'number' && typeof valueB === 'number') {
                        comparison = valueA - valueB;
                    } else {
                        comparison = String(valueA).localeCompare(String(valueB));
                    }
                    
                    if (direction === 'desc') {
                        comparison = -comparison;
                    }
                    
                    if (comparison !== 0) {
                        return comparison;
                    }
                }
                return 0;
            }
            
            // 4. Priorität: Tabellen-Mode Einzel-Sortierung (wenn kein Filter aktiv, Table-Mode)
            if (viewMode === 'table' && filterConditions.length === 0 && tableSortConfig.key) {
                const valueA = getSortValue(a, tableSortConfig.key);
                const valueB = getSortValue(b, tableSortConfig.key);
                
                let comparison = 0;
                if (typeof valueA === 'number' && typeof valueB === 'number') {
                    comparison = valueA - valueB;
                } else {
                    comparison = String(valueA).localeCompare(String(valueB));
                }
                
                if (comparison !== 0) {
                    return tableSortConfig.direction === 'asc' ? comparison : -comparison;
                }
            }
            
            // 5. Fallback: Standardsortierung (wenn keine benutzerdefinierte Sortierung)
            const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
            const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
            
            if (aDate !== bDate) {
                return aDate - bDate;
            }
            
            const aStatusPrio = getStatusPriority(a.status);
            const bStatusPrio = getStatusPriority(b.status);
            
            if (aStatusPrio !== bStatusPrio) {
                return aStatusPrio - bStatusPrio;
            }
            
            return a.title.localeCompare(b.title);
        });
        
        if (process.env.NODE_ENV === 'development') {
            console.log('✅ Gefilterte und sortierte Tasks:', sorted.length);
        }
        return sorted;
    }, [tasks, allTasks, selectedFilterId, searchTerm, tableSortConfig, getStatusPriority, filterConditions, filterLogicalOperators, filterSortDirections, viewMode, cardMetadataOrder, visibleCardMetadata, taskCardSortDirections]);

    // Filter- und Sortierlogik für Reservations
    const filteredAndSortedReservations = useMemo(() => {
        if (process.env.NODE_ENV === 'development') {
            console.log('🔄 Filtere Reservations:', reservations.length, 'Reservations vorhanden');
        }
        const validReservations = reservations.filter(reservation => reservation != null);
        
        let filtered = validReservations.filter(reservation => {
            // Status-Filter
            if (reservationFilterStatus !== 'all' && reservation.status !== reservationFilterStatus) {
                return false;
            }
            
            // Payment-Status-Filter
            if (reservationFilterPaymentStatus !== 'all' && reservation.paymentStatus !== reservationFilterPaymentStatus) {
                return false;
            }
            
            // Such-Filter
            if (reservationSearchTerm) {
                const searchLower = reservationSearchTerm.toLowerCase();
                const matchesSearch = 
                    (reservation.guestName && reservation.guestName.toLowerCase().includes(searchLower)) ||
                    (reservation.guestEmail && reservation.guestEmail.toLowerCase().includes(searchLower)) ||
                    (reservation.guestPhone && reservation.guestPhone.toLowerCase().includes(searchLower)) ||
                    (reservation.roomNumber && reservation.roomNumber.toLowerCase().includes(searchLower)) ||
                    (reservation.lobbyReservationId && reservation.lobbyReservationId.toLowerCase().includes(searchLower));
                
                if (!matchesSearch) return false;
            }
            
            return true;
        });

        // Erweiterte Filterbedingungen anwenden
        if (reservationFilterConditions.length > 0) {
            // Column-Evaluatoren für Reservations (analog zu Tasks)
            const columnEvaluators: any = {
                'guestName': (reservation: Reservation, cond: FilterCondition) => {
                    const value = (cond.value as string || '').toLowerCase();
                    const guestName = (reservation.guestName || '').toLowerCase();
                    if (cond.operator === 'equals') return reservation.guestName === cond.value;
                    if (cond.operator === 'contains') return guestName.includes(value);
                    if (cond.operator === 'startsWith') return guestName.startsWith(value);
                    if (cond.operator === 'endsWith') return guestName.endsWith(value);
                    return null;
                },
                'status': (reservation: Reservation, cond: FilterCondition) => {
                    if (cond.operator === 'equals') return reservation.status === cond.value;
                    if (cond.operator === 'notEquals') return reservation.status !== cond.value;
                    return null;
                },
                'paymentStatus': (reservation: Reservation, cond: FilterCondition) => {
                    if (cond.operator === 'equals') return reservation.paymentStatus === cond.value;
                    if (cond.operator === 'notEquals') return reservation.paymentStatus !== cond.value;
                    return null;
                },
                'checkInDate': (reservation: Reservation, cond: FilterCondition) => {
                    return evaluateDateCondition(reservation.checkInDate, cond);
                },
                'checkOutDate': (reservation: Reservation, cond: FilterCondition) => {
                    return evaluateDateCondition(reservation.checkOutDate, cond);
                },
                'arrivalTime': (reservation: Reservation, cond: FilterCondition) => {
                    return evaluateDateCondition(reservation.arrivalTime, cond);
                },
                'amount': (reservation: Reservation, cond: FilterCondition) => {
                    const amount = typeof reservation.amount === 'string' 
                        ? parseFloat(reservation.amount) 
                        : (reservation.amount || 0);
                    const compareValue = parseFloat(String(cond.value));
                    if (isNaN(compareValue)) return false;
                    if (cond.operator === 'equals') return Math.abs(amount - compareValue) < 0.01;
                    if (cond.operator === 'greaterThan') return amount > compareValue;
                    if (cond.operator === 'lessThan') return amount < compareValue;
                    return null;
                },
                'roomNumber': (reservation: Reservation, cond: FilterCondition) => {
                    const value = (cond.value as string || '').toLowerCase();
                    const roomNumber = (reservation.roomNumber || '').toLowerCase();
                    if (cond.operator === 'equals') return reservation.roomNumber === cond.value;
                    if (cond.operator === 'contains') return roomNumber.includes(value);
                    if (cond.operator === 'startsWith') return roomNumber.startsWith(value);
                    if (cond.operator === 'endsWith') return roomNumber.endsWith(value);
                    return null;
                },
                'guestEmail': (reservation: Reservation, cond: FilterCondition) => {
                    const value = (cond.value as string || '').toLowerCase();
                    const guestEmail = (reservation.guestEmail || '').toLowerCase();
                    if (cond.operator === 'equals') return reservation.guestEmail === cond.value;
                    if (cond.operator === 'contains') return guestEmail.includes(value);
                    if (cond.operator === 'startsWith') return guestEmail.startsWith(value);
                    if (cond.operator === 'endsWith') return guestEmail.endsWith(value);
                    return null;
                },
                'guestPhone': (reservation: Reservation, cond: FilterCondition) => {
                    const value = (cond.value as string || '').toLowerCase();
                    const guestPhone = (reservation.guestPhone || '').toLowerCase();
                    if (cond.operator === 'equals') return reservation.guestPhone === cond.value;
                    if (cond.operator === 'contains') return guestPhone.includes(value);
                    if (cond.operator === 'startsWith') return guestPhone.startsWith(value);
                    if (cond.operator === 'endsWith') return guestPhone.endsWith(value);
                    return null;
                },
                'branch': (reservation: Reservation, cond: FilterCondition) => {
                    const branchName = (reservation.branch?.name || '').toLowerCase();
                    const value = (cond.value as string || '').toLowerCase();
                    if (cond.operator === 'equals') return branchName === value;
                    if (cond.operator === 'contains') return branchName.includes(value);
                    return null;
                },
                'doorPin': (reservation: Reservation, cond: FilterCondition) => {
                    const value = (cond.value as string || '').toLowerCase();
                    const doorPin = (reservation.doorPin || '').toLowerCase();
                    if (cond.operator === 'equals') return reservation.doorPin === cond.value;
                    if (cond.operator === 'contains') return doorPin.includes(value);
                    if (cond.operator === 'startsWith') return doorPin.startsWith(value);
                    if (cond.operator === 'endsWith') return doorPin.endsWith(value);
                    return null;
                },
                'onlineCheckInCompleted': (reservation: Reservation, cond: FilterCondition) => {
                    const value = cond.value === 'true' || cond.value === true || cond.value === '1';
                    if (cond.operator === 'equals') return reservation.onlineCheckInCompleted === value;
                    if (cond.operator === 'notEquals') return reservation.onlineCheckInCompleted !== value;
                    return null;
                }
            };

            const getFieldValue = (reservation: Reservation, columnId: string): any => {
                switch (columnId) {
                    case 'guestName': return reservation.guestName || '';
                    case 'status': return reservation.status || '';
                    case 'paymentStatus': return reservation.paymentStatus || '';
                    case 'roomNumber': return reservation.roomNumber || '';
                    case 'branch': return reservation.branch?.name || '';
                    case 'guestEmail': return reservation.guestEmail || '';
                    case 'guestPhone': return reservation.guestPhone || '';
                    case 'lobbyReservationId': return reservation.lobbyReservationId || '';
                    case 'checkInDate': return reservation.checkInDate;
                    case 'checkOutDate': return reservation.checkOutDate;
                    case 'amount': return reservation.amount;
                    case 'arrivalTime': return reservation.arrivalTime;
                    case 'doorPin': return reservation.doorPin || '';
                    case 'onlineCheckInCompleted': return reservation.onlineCheckInCompleted;
                    default: {
                        const value = (reservation as any)[columnId];
                        if (value == null) return '';
                        if (typeof value === 'string') return value;
                        if (typeof value === 'number') return String(value);
                        if (typeof value === 'boolean') return String(value);
                        return String(value);
                    }
                }
            };

            filtered = applyFilters(
                filtered,
                reservationFilterConditions,
                reservationFilterLogicalOperators,
                getFieldValue,
                columnEvaluators
            );
        }
        
        // Hilfsfunktion zum Extrahieren von Werten für Sortierung
        const getReservationSortValue = (reservation: Reservation, columnId: string): any => {
            switch (columnId) {
                case 'guestName':
                    return (reservation.guestName || '').toLowerCase();
                case 'status':
                    return reservation.status.toLowerCase();
                case 'paymentStatus':
                    return reservation.paymentStatus.toLowerCase();
                case 'checkInDate':
                    return reservation.checkInDate ? new Date(reservation.checkInDate).getTime() : 0;
                case 'checkOutDate':
                    return reservation.checkOutDate ? new Date(reservation.checkOutDate).getTime() : 0;
                case 'roomNumber':
                    return (reservation.roomNumber || '').toLowerCase();
                case 'branch':
                case 'branch.name':
                    return (reservation.branch?.name || '').toLowerCase();
                case 'guestEmail':
                    return (reservation.guestEmail || '').toLowerCase();
                case 'guestPhone':
                    return (reservation.guestPhone || '').toLowerCase();
                case 'amount':
                    return typeof reservation.amount === 'string' ? parseFloat(reservation.amount) : (reservation.amount || 0);
                case 'arrivalTime':
                    return reservation.arrivalTime ? new Date(reservation.arrivalTime).getTime() : 0;
                default:
                    return '';
            }
        };
        
        // Sortierung basierend auf Prioritäten
        const sorted = filtered.sort((a, b) => {
            // 1. Priorität: Table-Header-Sortierung (temporäre Überschreibung, auch wenn Filter aktiv)
            if (viewMode === 'table' && reservationTableSortConfig.key) {
                const valueA = getReservationSortValue(a, reservationTableSortConfig.key);
                const valueB = getReservationSortValue(b, reservationTableSortConfig.key);
                
                let comparison = 0;
                if (typeof valueA === 'number' && typeof valueB === 'number') {
                    comparison = valueA - valueB;
                } else {
                    comparison = String(valueA).localeCompare(String(valueB));
                }
                
                if (comparison !== 0) {
                    return reservationTableSortConfig.direction === 'asc' ? comparison : -comparison;
                }
            }
            
            // 2. Priorität: Filter-Sortierrichtungen (wenn Filter aktiv)
            if (reservationFilterSortDirections.length > 0 && reservationFilterConditions.length > 0) {
                // Sortiere nach Priorität (1, 2, 3, ...)
                const sortedByPriority = [...reservationFilterSortDirections].sort((sd1, sd2) => sd1.priority - sd2.priority);
                
                for (const sortDir of sortedByPriority) {
                    const valueA = getReservationSortValue(a, sortDir.column);
                    const valueB = getReservationSortValue(b, sortDir.column);
                    
                    let comparison = 0;
                    if (typeof valueA === 'number' && typeof valueB === 'number') {
                        comparison = valueA - valueB;
                    } else {
                        comparison = String(valueA).localeCompare(String(valueB));
                    }
                    
                    if (sortDir.direction === 'desc') {
                        comparison = -comparison;
                    }
                    
                    if (comparison !== 0) {
                        return comparison;
                    }
                }
                return 0;
            }
            
            // 3. Priorität: Cards-Mode Multi-Sortierung (wenn kein Filter aktiv, Cards-Mode)
            if (viewMode === 'cards' && reservationFilterConditions.length === 0) {
                const sortableColumns = cardMetadataOrder.filter(colId => visibleCardMetadata.has(colId));
                
                for (const columnId of sortableColumns) {
                    const direction = reservationCardSortDirections[columnId] || 'asc';
                    const valueA = getReservationSortValue(a, columnId);
                    const valueB = getReservationSortValue(b, columnId);
                    
                    let comparison = 0;
                    if (typeof valueA === 'number' && typeof valueB === 'number') {
                        comparison = valueA - valueB;
                    } else {
                        comparison = String(valueA).localeCompare(String(valueB));
                    }
                    
                    if (direction === 'desc') {
                        comparison = -comparison;
                    }
                    
                    if (comparison !== 0) {
                        return comparison;
                    }
                }
                return 0;
            }
            
            // 4. Priorität: Tabellen-Mode Einzel-Sortierung (wenn kein Filter aktiv, Table-Mode)
            if (viewMode === 'table' && reservationFilterConditions.length === 0 && reservationTableSortConfig.key) {
                const valueA = getReservationSortValue(a, reservationTableSortConfig.key);
                const valueB = getReservationSortValue(b, reservationTableSortConfig.key);
                
                let comparison = 0;
                if (typeof valueA === 'number' && typeof valueB === 'number') {
                    comparison = valueA - valueB;
                } else {
                    comparison = String(valueA).localeCompare(String(valueB));
                }
                
                if (comparison !== 0) {
                    return reservationTableSortConfig.direction === 'asc' ? comparison : -comparison;
                }
            }
            
            // 5. Fallback: Check-in-Datum (neueste zuerst)
            return new Date(b.checkInDate).getTime() - new Date(a.checkInDate).getTime();
        });
        
        if (process.env.NODE_ENV === 'development') {
            console.log('✅ Gefilterte und sortierte Reservations:', sorted.length);
        }
        return sorted;
    }, [reservations, reservationFilterStatus, reservationFilterPaymentStatus, reservationSearchTerm, reservationFilterConditions, reservationFilterLogicalOperators, reservationFilterSortDirections, viewMode, cardMetadataOrder, visibleCardMetadata, reservationCardSortDirections, reservationTableSortConfig]);
    

    // Handler für das Verschieben von Spalten per Drag & Drop
    const handleMoveColumn = (dragIndex: number, hoverIndex: number) => {
        // Neue Spaltenreihenfolge erstellen
        const newColumnOrder = [...settings.columnOrder];
        const draggedColumn = newColumnOrder[dragIndex];
        
        // Spalten neu anordnen
        newColumnOrder.splice(dragIndex, 1); // Entferne die gezogene Spalte
        newColumnOrder.splice(hoverIndex, 0, draggedColumn); // Füge sie an der neuen Position ein
        
        // Aktualisiere die Spaltenreihenfolge
        updateColumnOrder(newColumnOrder);
    };

    // Handler für Drag & Drop direkt in der Tabelle
    const handleDragStart = (columnId: string) => {
        setDraggedColumn(columnId);
    };

    const handleDragOver = (e: React.DragEvent, columnId: string) => {
        e.preventDefault();
        if (draggedColumn && draggedColumn !== columnId) {
            setDragOverColumn(columnId);
        }
    };

    const handleDrop = (e: React.DragEvent, columnId: string) => {
        e.preventDefault();
        if (draggedColumn && draggedColumn !== columnId) {
            const dragIndex = settings.columnOrder.indexOf(draggedColumn);
            const hoverIndex = settings.columnOrder.indexOf(columnId);
            
            if (dragIndex > -1 && hoverIndex > -1) {
                handleMoveColumn(dragIndex, hoverIndex);
            }
        }
        setDraggedColumn(null);
        setDragOverColumn(null);
    };

    const handleDragEnd = () => {
        setDraggedColumn(null);
        setDragOverColumn(null);
    };

    // Filtern und sortieren der Spalten gemäß den Benutzereinstellungen
    // Sicherstellen, dass alle Spalten aus defaultColumnOrder in columnOrder enthalten sind
    const completeColumnOrder = useMemo(() => {
        const currentOrder = settings.columnOrder || [];
        // Sicherstellen, dass keine undefined/null Werte im Array sind
        const validOrder = currentOrder.filter(id => id != null && typeof id === 'string');
        // Fehlende Spalten aus defaultColumnOrder hinzufügen (dynamisch basierend auf activeTab)
        const defaultOrder = activeTab === 'todos' ? defaultColumnOrder : defaultReservationColumnOrder;
        const missingColumns = defaultOrder.filter(id => !validOrder.includes(id));
        return [...validOrder, ...missingColumns];
    }, [settings.columnOrder, activeTab, defaultColumnOrder, defaultReservationColumnOrder]);

    const visibleColumnIds = completeColumnOrder.filter(id => id != null && typeof id === 'string' && isColumnVisible(id));

    // Funktion zum Kopieren eines Tasks
    const handleCopyTask = async (task: Task) => {
        try {
            // Kopie des Tasks erstellen mit angepasstem Titel
            const copiedTaskData = {
                title: `${task.title}-Kopie`,
                description: task.description,
                status: 'open', // Immer als "offen" erstellen
                responsibleId: task.responsible ? task.responsible.id : null,
                roleId: task.role ? task.role.id : null,
                qualityControlId: task.qualityControl?.id || null,
                branchId: task.branch.id,
                dueDate: task.dueDate
            };

            // Task erstellen
            const response = await axiosInstance.post(
                API_ENDPOINTS.TASKS.BASE,
                copiedTaskData
            );

            // Optimistisches Update: Neuen Task zur Liste hinzufügen statt vollständigem Reload
            setTasks(prevTasks => [response.data, ...prevTasks]);
            
            // Bearbeitungsmodal für den kopierten Task öffnen
            setSelectedTask(response.data);
            setIsEditModalOpen(true);
            
        } catch (err) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Fehler beim Kopieren des Tasks:', err);
            }
            // Einfachere Fehlerbehandlung ohne axios-Import
            const axiosError = err as any;
            setError(axiosError.response?.data?.message || axiosError.message || 'Ein unerwarteter Fehler ist aufgetreten');
        }
    };

    const handleDeleteTask = async (taskId: number) => {
        if (window.confirm(t('worktime.messages.taskDeleteConfirm'))) {
            if (process.env.NODE_ENV === 'development') {
                console.log('🗑️ Starte Löschung von Task:', taskId);
                console.log('📋 Aktuelle Tasks vor Löschung:', tasks.length);
            }
            
            // Optimistisches Update: Task sofort aus Liste entfernen für sofortiges Feedback
            // Sicherstellen, dass keine undefined/null Werte im Array bleiben
            setTasks(prevTasks => {
                const filtered = prevTasks.filter(task => task != null && task.id !== taskId);
                if (process.env.NODE_ENV === 'development') {
                    console.log('📋 Tasks nach Filterung:', filtered.length, 'von', prevTasks.length);
                }
                return filtered;
            });

            try {
                if (process.env.NODE_ENV === 'development') {
                    console.log('📡 Sende Delete-Request...');
                }
                await axiosInstance.delete(API_ENDPOINTS.TASKS.BY_ID(taskId));
                if (process.env.NODE_ENV === 'development') {
                    console.log('✅ Delete erfolgreich');
                }
                // Erfolgs-Rückmeldung anzeigen
                toast.success(t('worktime.messages.taskDeleted'));
            } catch (error) {
                // Rollback bei Fehler: Vollständiges Reload
                if (process.env.NODE_ENV === 'development') {
                    console.error('❌ Fehler beim Löschen der Aufgabe:', error);
                }
                loadTasks();
                toast.error(t('worktime.messages.taskDeletedError'));
            }
        }
    };

    const handleSaveTask = async (task: Task) => {
        try {
            await axiosInstance.put(API_ENDPOINTS.TASKS.BY_ID(task.id), task);
            // Aktualisiere die Aufgabenliste
            loadTasks();
            setIsEditModalOpen(false);
            setSelectedTask(null);
            toast.success(t('worktime.messages.taskUpdated'));
        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Fehler beim Speichern der Aufgabe:', error);
            }
            toast.error(t('worktime.messages.taskSaveError'));
        }
    };

    return (
        <div className="min-h-screen dark:bg-gray-900">
            <div className="max-w-7xl mx-auto py-0 px-2 -mt-6 sm:-mt-3 lg:-mt-3 sm:px-4 lg:px-6">
                {/* Neu angeordnete UI-Elemente in einer Zeile */}
                <div className="w-full mb-4">
                    {/* Auf mobilen Geräten wird diese Reihenfolge angezeigt - Tasks oben, Zeiterfassung unten */}
                    <div className="block sm:hidden w-full">
                    {/* Tasks */}
                        <div className="dashboard-tasks-wrapper bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 w-full mb-20">
                            <div className="flex items-center justify-between px-3 sm:px-4 md:px-6">
                                {/* Linke Seite: "Neuer Task"-Button */}
                                <div className="flex items-center">
                                    {hasPermission('tasks', 'write', 'table') && (
                                        <div className="relative group">
                                            <button 
                                                onClick={() => setIsCreateModalOpen(true)}
                                                className="bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 p-1.5 rounded-full hover:bg-blue-50 dark:hover:bg-gray-600 border border-blue-200 dark:border-gray-600 shadow-sm flex items-center justify-center"
                                                style={{ width: '30.19px', height: '30.19px' }}
                                                aria-label={t('tasks.createTask')}
                                            >
                                                <PlusIcon className="h-4 w-4" />
                                            </button>
                                            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                                {t('tasks.createTask')}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Mitte: Tab-Navigation */}
                                <div className="flex items-center">
                                    <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto overflow-y-hidden">
                                        <button
                                            onClick={() => setActiveTab('todos')}
                                            className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm flex-shrink-0 flex items-center gap-1.5 ${
                                                activeTab === 'todos'
                                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                            }`}
                                        >
                                            <CheckCircleIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                                            {t('tasks.title', "To Do's")}
                                        </button>
                                        {hasPermission('reservations', 'read', 'table') && (
                                            <button
                                                onClick={() => setActiveTab('reservations')}
                                                className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm flex-shrink-0 flex items-center gap-1.5 ${
                                                    activeTab === 'reservations'
                                                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                                }`}
                                            >
                                                <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                                                {t('reservations.title', 'Reservations')}
                                            </button>
                                        )}
                                        {hasPermission('tour_bookings', 'read', 'table') && (
                                            <button
                                                onClick={() => setActiveTab('tourBookings')}
                                                className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm flex-shrink-0 flex items-center gap-1.5 ${
                                                    activeTab === 'tourBookings'
                                                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                                }`}
                                            >
                                                <ClipboardDocumentListIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                                                {t('tourBookings.title', 'Tour-Buchungen')}
                                            </button>
                                        )}
                                    </nav>
                                </div>
                                
                                {/* Rechte Seite: Suchfeld, Sync-Button (nur Reservations), Filter-Button, Status-Filter, Spalten-Konfiguration */}
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="text"
                                        placeholder={t('common.search') + '...'}
                                        className="w-[120px] sm:w-[200px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                        value={activeTab === 'todos' ? searchTerm : reservationSearchTerm}
                                        onChange={(e) => {
                                            if (activeTab === 'todos') {
                                                setSearchTerm(e.target.value);
                                            } else {
                                                setReservationSearchTerm(e.target.value);
                                            }
                                        }}
                                    />
                                    
                                    {/* Sync-Button für Reservations */}
                                    {activeTab === 'reservations' && (
                                        <div className="relative group">
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        setSyncingReservations(true);
                                                        await axiosInstance.post(API_ENDPOINTS.RESERVATIONS.SYNC);
                                                        showMessage(t('reservations.syncSuccess', 'Reservations erfolgreich synchronisiert'), 'success');
                                                        await loadReservations();
                                                    } catch (err: any) {
                                                        if (process.env.NODE_ENV === 'development') {
                                                            console.error('Fehler beim Synchronisieren:', err);
                                                        }
                                                        showMessage(
                                                            err.response?.data?.message || t('reservations.syncError', 'Fehler beim Synchronisieren'),
                                                            'error'
                                                        );
                                                    } finally {
                                                        setSyncingReservations(false);
                                                    }
                                                }}
                                                disabled={syncingReservations}
                                                className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <ArrowPathIcon className={`h-5 w-5 ${syncingReservations ? 'animate-spin' : ''}`} />
                                            </button>
                                            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                                {syncingReservations ? t('reservations.syncing', 'Synchronisiere...') : t('reservations.sync', 'Synchronisieren')}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* View-Mode Toggle */}
                                    <div className="relative group">
                                        <button
                                            className={`p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                                viewMode === 'cards' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : ''
                                            }`}
                                            onClick={() => updateViewMode(viewMode === 'table' ? 'cards' : 'table')}
                                        >
                                            {viewMode === 'table' ? (
                                                <Squares2X2Icon className="h-5 w-5" />
                                            ) : (
                                                <TableCellsIcon className="h-5 w-5" />
                                            )}
                                        </button>
                                        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                            {viewMode === 'table' ? t('common.viewAsCards') : t('common.viewAsTable')}
                                        </div>
                                    </div>
                                    
                                    {/* Filter-Button */}
                                    <div className="relative group ml-1">
                                        <button
                                            className={`p-2 rounded-md ${getActiveFilterCount() > 0 ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-gray-700'} relative`}
                                            onClick={() => setIsFilterModalOpen(!isFilterModalOpen)}
                                        >
                                            <FunnelIcon className="h-5 w-5" />
                                            {getActiveFilterCount() > 0 && (
                                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center">
                                                    {getActiveFilterCount()}
                                                </span>
                                            )}
                                        </button>
                                        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                            {t('common.filter')}
                                        </div>
                                    </div>
                                    
                                    
                                    {/* Spalten-Konfiguration */}
                                    <div className="ml-1">
                                        <TableColumnConfig 
                                            columns={activeTab === 'todos'
                                                ? (viewMode === 'cards'
                                                    ? [
                                                        { id: 'title', label: t('tasks.columns.title') },
                                                        { id: 'status', label: t('tasks.columns.status') },
                                                        { id: 'responsible', label: t('tasks.columns.responsible') },
                                                        { id: 'qualityControl', label: t('tasks.columns.qualityControl') },
                                                        { id: 'branch', label: t('tasks.columns.branch') },
                                                        { id: 'dueDate', label: t('tasks.columns.dueDate') },
                                                        { id: 'description', label: t('tasks.columns.description') }
                                                    ]
                                                    : availableColumns)
                                                : activeTab === 'reservations'
                                                ? (viewMode === 'cards'
                                                    ? [
                                                        { id: 'guestName', label: t('reservations.columns.guestName', 'Gast') },
                                                        { id: 'status', label: t('reservations.columns.status', 'Status') },
                                                        { id: 'paymentStatus', label: t('reservations.columns.paymentStatus', 'Zahlungsstatus') },
                                                        { id: 'checkInDate', label: t('reservations.columns.checkInDate', 'Check-in') },
                                                        { id: 'checkOutDate', label: t('reservations.columns.checkOutDate', 'Check-out') },
                                                        { id: 'roomNumber', label: t('reservations.columns.roomNumber', 'Zimmer') },
                                                        { id: 'guestEmail', label: t('reservations.columns.guestEmail', 'E-Mail') },
                                                        { id: 'guestPhone', label: t('reservations.columns.guestPhone', 'Telefon') },
                                                        { id: 'amount', label: t('reservations.columns.amount', 'Betrag') },
                                                        { id: 'arrivalTime', label: t('reservations.columns.arrivalTime', 'Ankunftszeit') }
                                                    ]
                                                    : availableReservationColumns)
                                                : []}
                                            visibleColumns={viewMode === 'cards'
                                                ? Array.from(visibleCardMetadata)
                                                : visibleColumnIds}
                                            columnOrder={viewMode === 'cards'
                                                ? cardMetadataOrder
                                                : settings.columnOrder}
                                            onToggleColumnVisibility={(columnId) => {
                                                if (viewMode === 'cards') {
                                                    // Für Cards: Mapping zurück zu Tabellen-Spalten
                                                    const tableColumn = cardToTableMapping[columnId];
                                                    if (tableColumn) {
                                                        // Spezielle Logik für responsibleAndQualityControl
                                                        if (tableColumn === 'responsibleAndQualityControl') {
                                                            // Prüfe ob beide bereits ausgeblendet sind
                                                            const otherCardMeta = columnId === 'responsible' ? 'qualityControl' : 'responsible';
                                                            const otherHidden = hiddenCardMetadata.has(otherCardMeta);
                                                            const currentlyHidden = settings.hiddenColumns.includes(tableColumn);
                                                            
                                                            if (currentlyHidden && !otherHidden) {
                                                                // Eine der beiden wird wieder angezeigt, also responsibleAndQualityControl wieder anzeigen
                                                                toggleColumnVisibility(tableColumn);
                                                            } else if (!currentlyHidden && otherHidden) {
                                                                // Die andere ist bereits ausgeblendet, also responsibleAndQualityControl ausblenden
                                                                toggleColumnVisibility(tableColumn);
                                                            } else if (!currentlyHidden) {
                                                                // Erste wird ausgeblendet, responsibleAndQualityControl ausblenden
                                                                toggleColumnVisibility(tableColumn);
                                                            } else {
                                                                // Beide sind ausgeblendet, eine wird wieder angezeigt
                                                                toggleColumnVisibility(tableColumn);
                                                            }
                                                        } else {
                                                            // Normale Spalte: direkt ein/ausblenden
                                                            toggleColumnVisibility(tableColumn);
                                                        }
                                                    }
                                                } else {
                                                    toggleColumnVisibility(columnId);
                                                }
                                            }}
                                            onMoveColumn={viewMode === 'cards'
                                                ? (dragIndex: number, hoverIndex: number) => {
                                                    const newCardOrder = [...cardMetadataOrder];
                                                    const dragged = newCardOrder[dragIndex];
                                                    newCardOrder.splice(dragIndex, 1);
                                                    newCardOrder.splice(hoverIndex, 0, dragged);
                                                    
                                                    // Konvertiere zurück zu Tabellen-Spalten-Reihenfolge
                                                    const newTableOrder: string[] = [];
                                                    const usedTableColumns = new Set<string>();
                                                    
                                                    newCardOrder.forEach(cardMeta => {
                                                        const tableCol = cardToTableMapping[cardMeta];
                                                        if (tableCol && !usedTableColumns.has(tableCol)) {
                                                            usedTableColumns.add(tableCol);
                                                            newTableOrder.push(tableCol);
                                                        }
                                                    });
                                                    
                                                    // Füge fehlende Tabellen-Spalten hinzu
                                                    availableColumns.forEach(col => {
                                                        if (!newTableOrder.includes(col.id) && col.id !== 'actions') {
                                                            newTableOrder.push(col.id);
                                                        }
                                                    });
                                                    
                                                    updateColumnOrder(newTableOrder);
                                                }
                                                : handleMoveColumn}
                                            buttonTitle={viewMode === 'cards' ? t('tableColumn.sortAndDisplay') : t('tableColumn.configure')}
                                            modalTitle={viewMode === 'cards' ? t('tableColumn.sortAndDisplay') : t('tableColumn.configure')}
                                            sortDirections={viewMode === 'cards' && activeTab === 'todos'
                                                ? taskCardSortDirections
                                                : viewMode === 'cards' && activeTab === 'reservations' 
                                                ? reservationCardSortDirections 
                                                : undefined}
                                            onSortDirectionChange={viewMode === 'cards' && activeTab === 'todos'
                                                ? handleTaskCardSortDirectionChange
                                                : viewMode === 'cards' && activeTab === 'reservations'
                                                ? handleReservationCardSortDirectionChange
                                                : undefined}
                                            showSortDirection={viewMode === 'cards' && (activeTab === 'todos' || activeTab === 'reservations')}
                                            onClose={() => {}}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Filter-Pane */}
                            {isFilterModalOpen && (
                                <div className={viewMode === 'cards' ? '-mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6' : 'px-3 sm:px-4 md:px-6'}>
                                    {activeTab === 'todos' ? (
                                        <FilterPane
                                            columns={[...availableColumns, ...filterOnlyColumns]}
                                            onApply={applyFilterConditions}
                                            onReset={resetFilterConditions}
                                            savedConditions={filterConditions}
                                            savedOperators={filterLogicalOperators}
                                            savedSortDirections={filterSortDirections}
                                            onSortDirectionsChange={setFilterSortDirections}
                                            tableId={TODOS_TABLE_ID}
                                        />
                                    ) : (
                                        <FilterPane
                                            columns={[...availableReservationColumns, ...reservationFilterOnlyColumns]}
                                            onApply={applyReservationFilterConditions}
                                            onReset={resetReservationFilterConditions}
                                            savedConditions={reservationFilterConditions}
                                            savedOperators={reservationFilterLogicalOperators}
                                            savedSortDirections={reservationFilterSortDirections}
                                            onSortDirectionsChange={setReservationFilterSortDirections}
                                            tableId={RESERVATIONS_TABLE_ID}
                                        />
                                    )}
                                </div>
                            )}

                            {/* Gespeicherte Filter als Tags anzeigen */}
                            {(
                                <div className={viewMode === 'cards' ? '-mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6' : 'px-3 sm:px-4 md:px-6'}>
                                    <SavedFilterTags
                                    tableId={activeTab === 'todos' ? TODOS_TABLE_ID : RESERVATIONS_TABLE_ID}
                                    onSelectFilter={activeTab === 'todos' ? applyFilterConditions : applyReservationFilterConditions}
                                    onReset={activeTab === 'todos' ? resetFilterConditions : resetReservationFilterConditions}
                                    activeFilterName={activeTab === 'todos' ? activeFilterName : reservationActiveFilterName}
                                    selectedFilterId={activeTab === 'todos' ? selectedFilterId : reservationSelectedFilterId}
                                    onFilterChange={activeTab === 'todos' ? handleFilterChange : handleReservationFilterChange}
                                    defaultFilterName={activeTab === 'todos' ? t('tasks.filters.current') : t('reservations.filters.current', 'Aktuell')}
                                />
                                </div>
                            )}
                            
                            {/* Tabelle oder Cards - nur aktiven Tab rendern */}
                            {activeTab === 'todos' && viewMode === 'table' ? (
                                /* Tabellen-Ansicht - Tasks */
                                <div className="overflow-x-auto -mx-3 sm:-mx-4 md:-mx-6">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        <thead className="bg-gray-50 dark:bg-gray-700">
                                            <tr>
                                                {visibleColumnIds.map((columnId) => {
                                                    const column = availableColumns.find(col => col.id === columnId);
                                                    if (!column) return null;
                                                    
                                                    return (
                                                        <th
                                                            key={columnId}
                                                            scope="col"
                                                            className={`px-3 sm:px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ${columnId === dragOverColumn ? 'bg-blue-100 dark:bg-blue-800' : ''}`}
                                                            draggable={true}
                                                            onDragStart={() => handleDragStart(columnId)}
                                                            onDragOver={(e) => handleDragOver(e, columnId)}
                                                            onDrop={(e) => handleDrop(e, columnId)}
                                                            onDragEnd={handleDragEnd}
                                                        >
                                                            <div className="flex items-center">
                                                                {window.innerWidth <= 640 ? column.shortLabel : column.label}
                                                                {columnId !== 'actions' && (
                                                                    <button 
                                                                        onClick={() => handleSort(columnId as keyof Task)}
                                                                        className="ml-1 focus:outline-none"
                                                                    >
                                                                        <ArrowsUpDownIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </th>
                                                    );
                                                })}
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                            {loading ? (
                                                <tr>
                                                    <td colSpan={visibleColumnIds.length} className="px-3 sm:px-4 md:px-6 py-4 text-center">
                                                        <div className="flex justify-center">
                                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-gray-100"></div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : error ? (
                                                <tr>
                                                    <td colSpan={visibleColumnIds.length} className="px-6 py-4 text-center text-red-600 dark:text-red-400">
                                                        {error}
                                                    </td>
                                                </tr>
                                            ) : filteredAndSortedTasks.length === 0 ? (
                                                <tr>
                                                    <td colSpan={visibleColumnIds.length} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                                                        <div className="flex flex-col items-center justify-center gap-4">
                                                        <ClipboardDocumentListIcon className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                                                        <div className="text-sm">{t('tasks.noTasksFound')}</div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            <>
                                            {filteredAndSortedTasks.slice(0, tasksDisplayLimit).map(task => {
                                            const expiryStatus = getExpiryStatus(task.dueDate, 'todo', undefined, task.title, task.description);
                                            const expiryColors = getExpiryColorClasses(expiryStatus);
                                            
                                            return (
                                                <tr 
                                                    key={task.id} 
                                                    className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                                                        expiryStatus !== 'none' ? `${expiryColors.bgClass} ${expiryColors.borderClass} border-l-4` : ''
                                                    }`}
                                                >
                                                    {visibleColumnIds.map(columnId => {
                                                    switch (columnId) {
                                                        case 'title':
                                                            return (
                                                                <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4">
                                                                    <div className="text-sm text-gray-900 dark:text-gray-200 break-words flex items-center">
                                                                        {task.title}
                                                                            {task.description && (
                                                                                <div className="ml-2 relative group">
                                                                                    <button 
                                                                                        className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                                                                                    >
                                                                                        <InformationCircleIcon className="h-5 w-5" />
                                                                                    </button>
                                                                                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                                                                        {t('tasks.showDescription')}
                                                                                    </div>
                                                                                    <div className="absolute left-0 mt-2 p-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 shadow-lg rounded-md border border-gray-200 dark:border-gray-700 w-144 max-h-96 overflow-y-auto min-w-[36rem] z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                                                                                        <MarkdownPreview content={task.description} showImagePreview={true} />
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                );
                                                            case 'status':
                                                                return (
                                                                    <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
                                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(task.status, 'task')} dark:bg-opacity-30 status-col`}>
                                                                            {task.status}
                                                                        </span>
                                                                    </td>
                                                                );
                                                            case 'responsibleAndQualityControl':
                                                                return (
                                                                    <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
                                                                        <div className="flex flex-col">
                                                                            <div className="text-sm text-gray-900 dark:text-gray-200">
                                                                                <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">{t('tasks.columns.responsible')}:</span>
                                                                                <span className="text-xs text-gray-500 dark:text-gray-400 inline sm:hidden">{t('tasks.columns.responsible').substring(0, 3)}:</span><br />
                                                                                {task.responsible ? `${task.responsible.firstName} ${task.responsible.lastName}` : task.role ? task.role.name : '-'}
                                                                            </div>
                                                                            <div className="text-sm text-gray-900 dark:text-gray-200 mt-1">
                                                                                <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">{t('tasks.qualityControlLabel')}</span>
                                                                                <span className="text-xs text-gray-500 dark:text-gray-400 inline sm:hidden">{t('tasks.columns.qualityControl').substring(0, 2)}:</span><br />
                                                                                {task.qualityControl ? `${task.qualityControl.firstName} ${task.qualityControl.lastName}` : '-'}
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                );
                                                            case 'branch':
                                                                return (
                                                                    <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
                                                                        <div className="text-sm text-gray-900 dark:text-gray-200">{task.branch.name}</div>
                                                                    </td>
                                                                );
                                                            case 'dueDate':
                                                                const expiryStatusForDate = getExpiryStatus(task.dueDate, 'todo', undefined, task.title, task.description);
                                                                const expiryColorsForDate = getExpiryColorClasses(expiryStatusForDate);
                                                                return (
                                                                    <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
                                                                        <div className={`text-sm ${expiryStatusForDate !== 'none' ? expiryColorsForDate.textClass : 'text-gray-900 dark:text-gray-200'}`}>
                                                                            {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}
                                                                            {expiryStatusForDate !== 'none' && (
                                                                                <span className="ml-2 text-xs">⚠</span>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                );
                                                            case 'actions':
                                                                return (
                                                                    <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
                                                                        <div className="flex space-x-2 action-buttons">
                                                                            <div className="status-buttons">
                                                                                {renderStatusButtons(task)}
                                                                            </div>
                                                                            {hasPermission('tasks', 'write', 'table') && (
                                                                                <div className="relative group">
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            setSelectedTask(task);
                                                                                            setIsEditModalOpen(true);
                                                                                        }}
                                                                                        className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                                                                    >
                                                                                        <PencilIcon className="h-4 w-4" />
                                                                                    </button>
                                                                                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                                                                        {t('common.edit')}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                            {hasPermission('tasks', 'both', 'table') && (
                                                                                <div className="relative group">
                                                                                    <button
                                                                                        onClick={() => handleCopyTask(task)}
                                                                                        className="p-1.5 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                                                                                    >
                                                                                        <DocumentDuplicateIcon className="h-4 w-4" />
                                                                                    </button>
                                                                                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                                                                        {t('tasks.actions.copy')}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                            {hasPermission('tasks', 'delete', 'table') && (
                                                                                <div className="relative group">
                                                                                    <button
                                                                                        onClick={() => handleDeleteTask(task.id)}
                                                                                        className="p-1.5 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                                                                    >
                                                                                        <TrashIcon className="h-4 w-4" />
                                                                                    </button>
                                                                                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                                                                        {t('common.delete')}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                );
                                                            default:
                                                                return null;
                                                        }
                                                    })}
                                                    </tr>
                                                );
                                            })}
                                            </>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            ) : activeTab === 'todos' ? (
                                /* Card-Ansicht - Tasks - ohne Box-Schattierung, Cards auf voller Breite */
                                <div className="-mx-3 sm:-mx-4 md:-mx-6">
                                    {/* ✅ PERFORMANCE: Skeleton-Loading für LCP-Element (sofort sichtbar, auch ohne Daten) */}
                                    {loading && tasks.length === 0 ? (
                                        <CardGrid>
                                            {Array(3).fill(null).map((_, i) => (
                                                <div key={`skeleton-${i}`} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-3 sm:p-4 md:p-5 lg:p-6 shadow-sm">
                                                    <div className="space-y-4">
                                                        {/* LCP-Element: Titel-Skeleton */}
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
                                                            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded flex-1 min-w-0"></div>
                                                        </div>
                                                        {/* Status-Skeleton */}
                                                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                                                        {/* Metadaten-Skeleton */}
                                                        <div className="space-y-2">
                                                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                                                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                                                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </CardGrid>
                                    ) : error ? (
                                        <div className="flex justify-center py-12 text-red-600 dark:text-red-400">
                                            {error}
                                        </div>
                                    ) : filteredAndSortedTasks.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                                            <ClipboardDocumentListIcon className="h-10 w-10 mb-4 text-gray-400 dark:text-gray-500" />
                                            <div className="text-sm">Keine To Do's gefunden</div>
                                        </div>
                                    ) : (
                                        <CardGrid>
                                            {filteredAndSortedTasks.slice(0, tasksDisplayLimit).map(task => {
                                                const expiryStatus = getExpiryStatus(task.dueDate, 'todo', undefined, task.title, task.description);
                                                
                                                // Metadaten basierend auf sichtbaren Einstellungen - strukturiert nach Position
                                                const metadata: MetadataItem[] = [];
                                                
                                                // Links: Niederlassung
                                                if (visibleCardMetadata.has('branch')) {
                                                    metadata.push({
                                                        icon: <BuildingOfficeIcon className="h-4 w-4" />,
                                                        label: t('tasks.columns.branch'),
                                                        value: task.branch.name,
                                                        section: 'left'
                                                    });
                                                }
                                                
                                                // Haupt-Metadaten: Verantwortlicher & Qualitätskontrolle
                                                if (visibleCardMetadata.has('responsible')) {
                                                    // Benutzernamen auf 4 Zeichen kürzen
                                                    const responsibleValue = task.responsible ? `${task.responsible.firstName} ${task.responsible.lastName}` : (task.role ? task.role.name : '-');
                                                    const shortenedName = responsibleValue.length > 4 && responsibleValue !== '-' ? responsibleValue.substring(0, 4) : responsibleValue;
                                                    metadata.push({
                                                        icon: <UserIcon className="h-4 w-4" />,
                                                        label: t('tasks.columns.responsible'),
                                                        value: shortenedName,
                                                        section: 'main'
                                                    });
                                                }
                                                if (visibleCardMetadata.has('qualityControl')) {
                                                    // Benutzernamen auf 4 Zeichen kürzen
                                                    const qualityControlValue = task.qualityControl ? `${task.qualityControl.firstName} ${task.qualityControl.lastName}` : '-';
                                                    const shortenedName = qualityControlValue.length > 4 && qualityControlValue !== '-' ? qualityControlValue.substring(0, 4) : qualityControlValue;
                                                    metadata.push({
                                                        icon: <UserIcon className="h-4 w-4" />,
                                                        label: t('tasks.columns.qualityControl'),
                                                        value: shortenedName,
                                                        section: 'main-second'
                                                    });
                                                }
                                                
                                                // Rechts: Fälligkeit (erste Zeile rechts, neben Status)
                                                if (visibleCardMetadata.has('dueDate')) {
                                                    const dueDateItem = createDueDateMetadataItem(
                                                        task.dueDate,
                                                        'todo',
                                                        task.title,
                                                        task.description,
                                                        <CalendarIcon className="h-4 w-4" />,
                                                        t('tasks.columns.dueDate'),
                                                        (date) => format(date, 'dd.MM.yyyy', { locale: de }),
                                                        false // Keine Badge-Art, nur Text
                                                    );
                                                    metadata.push({
                                                        ...dueDateItem,
                                                        section: 'right-inline' // Neue Section für inline rechts (neben Status)
                                                    });
                                                }
                                                
                                                // Full-Width: Beschreibung
                                                if (visibleCardMetadata.has('description') && task.description) {
                                                    metadata.push({
                                                        label: t('tasks.columns.description'),
                                                        value: '',
                                                        descriptionContent: task.description,
                                                        attachmentMetadata: task.attachments || [], // Attachment-Metadaten für Vorschau
                                                        section: 'full'
                                                    });
                                                }
                                                
                                                // Action-Buttons
                                                const actionButtons = (
                                                    <div className="flex items-center space-x-2">
                                                        {/* Status-Buttons */}
                                                        <div className="status-buttons">
                                                            {renderStatusButtons(task)}
                                                        </div>
                                                        {hasPermission('tasks', 'write', 'table') && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedTask(task);
                                                                    setIsEditModalOpen(true);
                                                                }}
                                                                                    className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                                                                >
                                                                <PencilIcon className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                        {hasPermission('tasks', 'both', 'table') && (
                                                            <div className="relative group">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleCopyTask(task);
                                                                    }}
                                                                    className="p-1.5 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                                                                >
                                                                    <DocumentDuplicateIcon className="h-4 w-4" />
                                                                </button>
                                                                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                                                    {t('tasks.actions.copy')}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                                
                                                return (
                                                    <DataCard
                                                        key={task.id}
                                                        title={
                                                          <span>
                                                            <span className="text-xs text-gray-600 dark:text-gray-400">{task.id}:</span>{' '}
                                                            <span>{task.title}</span>
                                                          </span>
                                                        }
                                                        status={{
                                                            label: getStatusText(task.status, 'task', t),
                                                            color: getStatusColor(task.status, 'task'),
                                                            onPreviousClick: undefined,
                                                            onNextClick: undefined
                                                        }}
                                                        metadata={metadata}
                                                        actions={actionButtons}
                                                    />
                                                );
                                            })}
                                        </CardGrid>
                                    )}
                                </div>
                            ) : null}
                            
                            {/* ❌ Loading Indicator entfernt - Infinite Scroll lädt keine Daten mehr, nur Anzeige */}
                            
                            {/* Reservations Rendering - Cards */}
                            {activeTab === 'reservations' && viewMode === 'cards' && (
                                <div className="-mx-3 sm:-mx-4 md:-mx-6">
                                    {reservationsLoading ? (
                                        <div className="flex justify-center py-12">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-gray-100"></div>
                                        </div>
                                    ) : reservationsError ? (
                                        <div className="flex justify-center py-12 text-red-600 dark:text-red-400">
                                            {reservationsError}
                                        </div>
                                    ) : filteredAndSortedReservations.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                                            <CalendarIcon className="h-10 w-10 mb-4 text-gray-400 dark:text-gray-500" />
                                            <div className="text-sm">
                                                {reservationSearchTerm || reservationFilterStatus !== 'all' || reservationFilterPaymentStatus !== 'all'
                                                    ? t('reservations.noResults', 'Keine Reservations gefunden')
                                                    : t('reservations.noReservations', 'Keine Reservations vorhanden')}
                                            </div>
                                        </div>
                                    ) : (
                                        <CardGrid>
                                            {filteredAndSortedReservations.slice(0, reservationsDisplayLimit).map(reservation => {
                                                const formatDate = (dateString: string) => {
                                                    try {
                                                        // Extrahiere nur den Datumsteil (YYYY-MM-DD) und parse als lokales Datum
                                                        // Dies verhindert Zeitzone-Konvertierung, die zu einem Tag-Versatz führt
                                                        const date = new Date(dateString);
                                                        // Verwende UTC-Methoden, um nur den Datumsteil zu extrahieren (ohne Zeitzone)
                                                        const year = date.getUTCFullYear();
                                                        const month = date.getUTCMonth();
                                                        const day = date.getUTCDate();
                                                        // Erstelle lokales Datum aus den UTC-Werten
                                                        const localDate = new Date(year, month, day);
                                                        return format(localDate, 'dd.MM.yyyy', { locale: de });
                                                    } catch {
                                                        return dateString;
                                                    }
                                                };
                                                
                                                // Metadaten für Reservation-Card
                                                const metadata: MetadataItem[] = [];
                                                
                                                // Haupt-Metadaten: Check-in/Check-out (rechts oben, unverändert)
                                                metadata.push({
                                                    icon: <CalendarIcon className="h-4 w-4" />,
                                                    label: t('reservations.checkInOut', 'Check-in/Check-out'),
                                                    value: `${formatDate(reservation.checkInDate)} - ${formatDate(reservation.checkOutDate)}`,
                                                    section: 'main'
                                                });
                                                
                                                // Zweite Zeile: Zimmernummer
                                                if (reservation.roomNumber) {
                                                    metadata.push({
                                                        icon: <HomeIcon className="h-4 w-4" />,
                                                        value: reservation.roomNumber,
                                                        section: 'main-second'
                                                    });
                                                }
                                                
                                                // Links: Telefon/Email unter Titel (gleiche Zeile wie Status)
                                                if (reservation.guestEmail) {
                                                    metadata.push({
                                                        icon: <EnvelopeIcon className="h-4 w-4" />,
                                                        value: reservation.guestEmail,
                                                        section: 'left'
                                                    });
                                                }
                                                if (reservation.guestPhone) {
                                                    metadata.push({
                                                        icon: <PhoneIcon className="h-4 w-4" />,
                                                        value: reservation.guestPhone,
                                                        section: 'left'
                                                    });
                                                }
                                                
                                                // Links: Branch (nach Telefon/Email)
                                                if (reservation.branch) {
                                                    metadata.push({
                                                        icon: <BuildingOfficeIcon className="h-4 w-4" />,
                                                        value: reservation.branch.name,
                                                        section: 'left'
                                                    });
                                                }
                                                
                                                // Mitte: Zahlungslink (gleiche Höhe wie Payment Status)
                                                if (reservation.paymentLink) {
                                                    metadata.push({
                                                        icon: <LinkIcon className="h-4 w-4" />,
                                                        value: (
                                                            <a 
                                                                href={reservation.paymentLink} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="text-gray-900 dark:text-white break-all"
                                                            >
                                                                {t('reservations.paymentLink', 'Zahlungslink')}
                                                            </a>
                                                        ),
                                                        section: 'center'
                                                    });
                                                }
                                                
                                                // Mitte: Check-in Link (direkt unter Zahlungslink)
                                                // WICHTIG: Verwende lobbyReservationId (LobbyPMS booking_id) als codigo, nicht die interne ID
                                                const codigo = reservation.lobbyReservationId || reservation.id.toString();
                                                const checkInLink = reservation.guestEmail 
                                                    ? `https://app.lobbypms.com/checkinonline/confirmar?codigo=${codigo}&email=${encodeURIComponent(reservation.guestEmail)}&lg=GB`
                                                    : null;
                                                if (checkInLink) {
                                                    metadata.push({
                                                    icon: <LinkIcon className="h-4 w-4" />,
                                                    value: (
                                                        <div className="relative group">
                                                            <a 
                                                                href={checkInLink} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="text-gray-900 dark:text-white"
                                                            >
                                                                {t('reservations.checkInLink', 'Check-in Link')}
                                                            </a>
                                                            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                                                {checkInLink}
                                                            </div>
                                                        </div>
                                                    ),
                                                    section: 'center'
                                                    });
                                                }
                                                
                                                // Rechts: Reservation Status als erstes Badge (mit Label)
                                                metadata.push({
                                                    label: t('reservations.status', 'Status'),
                                                    value: (
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${getReservationStatusColor(reservation.status)}`}>
                                                            {t(`reservations.status.${reservation.status}`, reservation.status)}
                                                        </span>
                                                    ),
                                                    section: 'right'
                                                });
                                                
                                                // Rechts: Payment Status als zweites Badge (direkt unter Reservation Status)
                                                metadata.push({
                                                    label: t('reservations.paymentStatus', 'Zahlungsstatus'),
                                                    value: (
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${getPaymentStatusColor(reservation.paymentStatus)}`}>
                                                            {t(`reservations.paymentStatus.${reservation.paymentStatus}`, reservation.paymentStatus)}
                                                        </span>
                                                    ),
                                                    section: 'right'
                                                });
                                                
                                                // Betrag und Währung (wenn vorhanden)
                                                if (reservation.amount) {
                                                    const amountValue = typeof reservation.amount === 'string' 
                                                        ? parseFloat(reservation.amount).toFixed(2)
                                                        : typeof reservation.amount === 'number'
                                                        ? reservation.amount.toFixed(2)
                                                        : '0.00';
                                                    metadata.push({
                                                        icon: <CurrencyDollarIcon className="h-4 w-4" />,
                                                        label: t('reservations.amount', 'Betrag'),
                                                        value: `${amountValue} ${reservation.currency || 'COP'}`,
                                                        section: 'right'
                                                    });
                                                }
                                                
                                                // Ankunftszeit (wenn vorhanden)
                                                if (reservation.arrivalTime) {
                                                    const formatDateTime = (dateString: string) => {
                                                        try {
                                                            return format(new Date(dateString), 'dd.MM.yyyy HH:mm', { locale: de });
                                                        } catch {
                                                            return dateString;
                                                        }
                                                    };
                                                    metadata.push({
                                                        icon: <ClockIcon className="h-4 w-4" />,
                                                        label: t('reservations.arrivalTime', 'Ankunftszeit'),
                                                        value: formatDateTime(reservation.arrivalTime),
                                                        section: 'right'
                                                    });
                                                }
                                                
                                                // Tür-PIN (wenn vorhanden)
                                                if (reservation.doorPin) {
                                                    metadata.push({
                                                        icon: <KeyIcon className="h-4 w-4" />,
                                                        label: reservation.doorAppName || t('reservations.doorPin', 'Tür-PIN'),
                                                        value: reservation.doorPin,
                                                        section: 'right'
                                                    });
                                                }
                                                
                                                // Online Check-in Status
                                                if (reservation.onlineCheckInCompleted) {
                                                    metadata.push({
                                                        icon: <CheckCircleIcon className="h-4 w-4 text-green-600" />,
                                                        label: t('reservations.onlineCheckIn', 'Online Check-in'),
                                                        value: t('reservations.completed', 'Abgeschlossen'),
                                                        section: 'right'
                                                    });
                                                }
                                                
                                                // Action-Button für PIN-Generierung und Mitteilungsversand
                                                const hasWritePermission = hasPermission('reservations', 'write', 'table');
                                                // Debug: Log für Berechtigungsprüfung (nur für erste Reservation) - IMMER loggen
                                                if (reservation.id === filteredAndSortedReservations[0]?.id) {
                                                    console.log('[Reservations] Berechtigungsprüfung:', {
                                                        hasWritePermission,
                                                        reservationId: reservation.id,
                                                        entity: 'reservations',
                                                        accessLevel: 'write',
                                                        entityType: 'table',
                                                        actionButtonsWillBeCreated: hasWritePermission
                                                    });
                                                }
                                                const actionButtons = hasWritePermission ? (
                                                    <div className="flex items-center space-x-2">
                                                        {/* Einladung senden Button */}
                                                        <div className="relative group">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedReservationForInvitation(reservation);
                                                                    setIsSendInvitationSidepaneOpen(true);
                                                                }}
                                                                className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                                            >
                                                                <PaperAirplaneIcon className="h-4 w-4" />
                                                            </button>
                                                            <div className="absolute right-full mr-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                                                {t('reservations.sendInvitation.title')}
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Key-Button für PIN-Generierung */}
                                                        <div className="relative group">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedReservationForPasscode(reservation);
                                                                    setIsSendPasscodeSidepaneOpen(true);
                                                                }}
                                                                className="p-1.5 text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
                                                            >
                                                                <KeyIcon className="h-4 w-4" />
                                                            </button>
                                                            <div className="absolute right-full mr-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                                                {t('reservations.sendPasscode.title')}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : null;
                                                
                                                // Expandable Content für Details - zeigt alle Notification-Logs
                                                const isExpanded = expandedReservationRows.has(reservation.id);
                                                const expandableContent = (
                                                    <div className="mt-2 pt-3">
                                                        <ReservationNotificationLogs reservationId={reservation.id} />
                                                    </div>
                                                );
                                                
                                                return (
                                                    <DataCard
                                                        key={reservation.id}
                                                        title={reservation.guestName}
                                                        subtitle={reservation.lobbyReservationId ? `ID: ${reservation.lobbyReservationId}` : undefined}
                                                        metadata={metadata}
                                                        actions={actionButtons}
                                                        expandable={expandableContent ? {
                                                            isExpanded: isExpanded,
                                                            content: expandableContent,
                                                            onToggle: () => toggleReservationExpanded(reservation.id)
                                                        } : undefined}
                                                    />
                                                );
                                            })}
                                        </CardGrid>
                                    )}
                                </div>
                            )}
                            
                            {/* Reservations Rendering - Tabelle (optional, analog zu Tasks) */}
                            {activeTab === 'reservations' && viewMode === 'table' && (
                                <div className="overflow-x-auto -mx-3 sm:-mx-4 md:-mx-6">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        <thead className="bg-gray-50 dark:bg-gray-700">
                                            <tr>
                                                {visibleColumnIds.map((columnId) => {
                                                    const column = availableReservationColumns.find(col => col.id === columnId);
                                                    if (!column) return null;
                                                    
                                                    return (
                                                        <th
                                                            key={columnId}
                                                            scope="col"
                                                            className={`px-3 sm:px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ${columnId === dragOverColumn ? 'bg-blue-100 dark:bg-blue-800' : ''}`}
                                                            draggable={true}
                                                            onDragStart={() => handleDragStart(columnId)}
                                                            onDragOver={(e) => handleDragOver(e, columnId)}
                                                            onDrop={(e) => handleDrop(e, columnId)}
                                                            onDragEnd={handleDragEnd}
                                                        >
                                                            <div className="flex items-center">
                                                                {window.innerWidth <= 640 ? column.shortLabel : column.label}
                                                                {columnId !== 'actions' && (
                                                                    <button 
                                                                        onClick={() => handleReservationSort(columnId as ReservationSortConfig['key'])}
                                                                        className="ml-1 focus:outline-none"
                                                                    >
                                                                        <ArrowsUpDownIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </th>
                                                    );
                                                })}
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                            {reservationsLoading ? (
                                                <tr>
                                                    <td colSpan={visibleColumnIds.length} className="px-3 sm:px-4 md:px-6 py-4 text-center">
                                                        <div className="flex justify-center">
                                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-gray-100"></div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : reservationsError ? (
                                                <tr>
                                                    <td colSpan={visibleColumnIds.length} className="px-6 py-4 text-center text-red-600 dark:text-red-400">
                                                        {reservationsError}
                                                    </td>
                                                </tr>
                                            ) : filteredAndSortedReservations.length === 0 ? (
                                                <tr>
                                                    <td colSpan={visibleColumnIds.length} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                                                        <div className="flex flex-col items-center justify-center gap-4">
                                                            <CalendarIcon className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                                                            <div className="text-sm">
                                                                {reservationSearchTerm || reservationFilterStatus !== 'all' || reservationFilterPaymentStatus !== 'all'
                                                                    ? t('reservations.noResults', 'Keine Reservations gefunden')
                                                                    : t('reservations.noReservations', 'Keine Reservations vorhanden')}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                <>
                                                    {filteredAndSortedReservations.slice(0, reservationsDisplayLimit).map(reservation => {
                                                        const formatDate = (dateString: string) => {
                                                            try {
                                                                return format(new Date(dateString), 'dd.MM.yyyy', { locale: de });
                                                            } catch {
                                                                return dateString;
                                                            }
                                                        };
                                                        
                                                        return (
                                                            <tr 
                                                                key={reservation.id} 
                                                                className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                                                                onClick={() => navigate(`/reservations/${reservation.id}`)}
                                                            >
                                                                {visibleColumnIds.map(columnId => {
                                                                    switch (columnId) {
                                                                        case 'guestName':
                                                                            return (
                                                                                <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4">
                                                                                    <div className="text-sm text-gray-900 dark:text-gray-200 break-words">
                                                                                        {reservation.guestName}
                                                                                        {reservation.lobbyReservationId && (
                                                                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                                                                ID: {reservation.lobbyReservationId}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </td>
                                                                            );
                                                                        case 'status':
                                                                            return (
                                                                                <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
                                                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getReservationStatusColor(reservation.status)}`}>
                                                                                        {t(`reservations.status.${reservation.status}`, reservation.status)}
                                                                                    </span>
                                                                                </td>
                                                                            );
                                                                        case 'paymentStatus':
                                                                            return (
                                                                                <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
                                                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPaymentStatusColor(reservation.paymentStatus)}`}>
                                                                                        {t(`reservations.paymentStatus.${reservation.paymentStatus}`, reservation.paymentStatus)}
                                                                                    </span>
                                                                                </td>
                                                                            );
                                                                        case 'checkInDate':
                                                                        case 'checkOutDate':
                                                                            return (
                                                                                <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
                                                                                    <div className="text-sm text-gray-900 dark:text-gray-200">
                                                                                        {formatDate(columnId === 'checkInDate' ? reservation.checkInDate : reservation.checkOutDate)}
                                                                                    </div>
                                                                                </td>
                                                                            );
                                                                        case 'roomNumber':
                                                                            return (
                                                                                <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
                                                                                    <div className="text-sm text-gray-900 dark:text-gray-200">
                                                                                        {reservation.roomNumber || '-'}
                                                                                    </div>
                                                                                </td>
                                                                            );
                                                                        case 'branch':
                                                                            return (
                                                                                <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
                                                                                    <div className="text-sm text-gray-900 dark:text-gray-200">
                                                                                        {reservation.branch?.name || '-'}
                                                                                    </div>
                                                                                </td>
                                                                            );
                                                                        case 'guestEmail':
                                                                            return (
                                                                                <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
                                                                                    <div className="text-sm text-gray-900 dark:text-gray-200">
                                                                                        {reservation.guestEmail || '-'}
                                                                                    </div>
                                                                                </td>
                                                                            );
                                                                        case 'guestPhone':
                                                                            return (
                                                                                <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
                                                                                    <div className="text-sm text-gray-900 dark:text-gray-200">
                                                                                        {reservation.guestPhone || '-'}
                                                                                    </div>
                                                                                </td>
                                                                            );
                                                                        case 'amount':
                                                                            const amountValue = typeof reservation.amount === 'string' 
                                                                                ? parseFloat(reservation.amount).toFixed(2)
                                                                                : typeof reservation.amount === 'number'
                                                                                ? reservation.amount.toFixed(2)
                                                                                : '0.00';
                                                                            return (
                                                                                <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
                                                                                    <div className="text-sm text-gray-900 dark:text-gray-200">
                                                                                        {amountValue} {reservation.currency || 'COP'}
                                                                                    </div>
                                                                                </td>
                                                                            );
                                                                        case 'arrivalTime':
                                                                            return (
                                                                                <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
                                                                                    <div className="text-sm text-gray-900 dark:text-gray-200">
                                                                                        {reservation.arrivalTime ? format(new Date(reservation.arrivalTime), 'dd.MM.yyyy HH:mm', { locale: de }) : '-'}
                                                                                    </div>
                                                                                </td>
                                                                            );
                                                                        case 'actions':
                                                                            return (
                                                                                <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
                                                                                    <div className="flex space-x-2 action-buttons">
                                                                                        {hasPermission('reservations', 'write', 'table') && (
                                                                                            <>
                                                                                                {/* Einladung senden Button */}
                                                                                                <div className="relative group">
                                                                                                    <button
                                                                                                        onClick={(e) => {
                                                                                                            e.stopPropagation();
                                                                                                            setSelectedReservationForInvitation(reservation);
                                                                                                            setIsSendInvitationSidepaneOpen(true);
                                                                                                        }}
                                                                                                        className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                                                                                    >
                                                                                                        <PaperAirplaneIcon className="h-4 w-4" />
                                                                                                    </button>
                                                                                                    <div className="absolute right-full mr-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                                                                                        {t('reservations.sendInvitation.title')}
                                                                                                    </div>
                                                                                                </div>
                                                                                                
                                                                                                {/* Key-Button für PIN-Generierung */}
                                                                                                <div className="relative group">
                                                                                                    <button
                                                                                                        onClick={(e) => {
                                                                                                            e.stopPropagation();
                                                                                                            setSelectedReservationForPasscode(reservation);
                                                                                                            setIsSendPasscodeSidepaneOpen(true);
                                                                                                        }}
                                                                                                        className="p-1.5 text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
                                                                                                    >
                                                                                                        <KeyIcon className="h-4 w-4" />
                                                                                                    </button>
                                                                                                    <div className="absolute right-full mr-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                                                                                        {t('reservations.sendPasscode.title')}
                                                                                                    </div>
                                                                                                </div>
                                                                                                
                                                                                                {/* Details Button */}
                                                                                                <div className="relative group">
                                                                                                    <button
                                                                                                        onClick={(e) => {
                                                                                                            e.stopPropagation();
                                                                                                            navigate(`/reservations/${reservation.id}`);
                                                                                                        }}
                                                                                                        className="p-1.5 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
                                                                                                    >
                                                                                                        <InformationCircleIcon className="h-4 w-4" />
                                                                                                    </button>
                                                                                                    <div className="absolute right-full mr-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                                                                                        {t('common.viewDetails')}
                                                                                                    </div>
                                                                                                </div>
                                                                                            </>
                                                                                        )}
                                                                                    </div>
                                                                                </td>
                                                                            );
                                                                        default:
                                                                            return null;
                                                                    }
                                                                })}
                                                            </tr>
                                                        );
                                                    })}
                                                </>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            
                            {/* ❌ "Mehr anzeigen" Button entfernt - Infinite Scroll macht das automatisch */}
                        </div>
                        
                        {/* Zeiterfassung - auf Mobilgeräten fixiert über dem Footermenü */}
                        <div className="fixed bottom-13 left-0 right-0 w-full bg-white dark:bg-gray-800 z-9 shadow-lg border-t-0 dark:border-t dark:border-gray-700">
                            <WorktimeTracker />
                        </div>
                    </div>

                    {/* Auf größeren Geräten bleibt die ursprüngliche Reihenfolge - Zeiterfassung oben, Tasks unten */}
                    <div className="hidden sm:block">
                        {/* Zeiterfassung */}
                        <div className="mb-8">
                            <WorktimeTracker />
                        </div>
                        
                        {/* Tasks - vollständiger Inhalt für Desktop-Ansicht */}
                        <div className="dashboard-tasks-wrapper bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 w-full mb-20">
                            <div className="flex items-center mb-4 justify-between px-3 sm:px-4 md:px-6">
                                {/* Linke Seite: "Neuer Task/Reservation"-Button */}
                                <div className="flex items-center">
                                    {activeTab === 'todos' && hasPermission('tasks', 'write', 'table') && (
                                        <div className="relative group">
                                            <button
                                                onClick={() => setIsCreateModalOpen(true)}
                                                className="bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 p-1.5 rounded-full hover:bg-blue-50 dark:hover:bg-gray-600 border border-blue-200 dark:border-gray-600 shadow-sm flex items-center justify-center"
                                                style={{ width: '30.19px', height: '30.19px' }}
                                                aria-label={t('tasks.createTask')}
                                                data-onboarding="create-task-button"
                                            >
                                                <PlusIcon className="h-4 w-4" />
                                            </button>
                                            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                                {t('tasks.createTask')}
                                            </div>
                                        </div>
                                    )}
                                    {activeTab === 'reservations' && hasPermission('reservations', 'write', 'table') && (
                                        <div className="relative group">
                                            <button
                                                onClick={() => setIsCreateReservationModalOpen(true)}
                                                className="bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 p-1.5 rounded-full hover:bg-blue-50 dark:hover:bg-gray-600 border border-blue-200 dark:border-gray-600 shadow-sm flex items-center justify-center"
                                                style={{ width: '30.19px', height: '30.19px' }}
                                                aria-label={t('reservations.createReservation.button', 'Neue Reservierung')}
                                            >
                                                <PlusIcon className="h-4 w-4" />
                                            </button>
                                            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                                {t('reservations.createReservation.button', 'Neue Reservierung')}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Mitte: Tab-Navigation */}
                                <div className="flex items-center">
                                    <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto overflow-y-hidden">
                                        <button
                                            onClick={() => setActiveTab('todos')}
                                            className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm flex-shrink-0 flex items-center gap-1.5 ${
                                                activeTab === 'todos'
                                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                            }`}
                                        >
                                            <CheckCircleIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                                            {t('tasks.title', "To Do's")}
                                        </button>
                                        {hasPermission('reservations', 'read', 'table') && (
                                            <button
                                                onClick={() => setActiveTab('reservations')}
                                                className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm flex-shrink-0 flex items-center gap-1.5 ${
                                                    activeTab === 'reservations'
                                                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                                }`}
                                            >
                                                <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                                                {t('reservations.title', 'Reservations')}
                                            </button>
                                        )}
                                        {hasPermission('tour_bookings', 'read', 'table') && (
                                            <button
                                                onClick={() => setActiveTab('tourBookings')}
                                                className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm flex-shrink-0 flex items-center gap-1.5 ${
                                                    activeTab === 'tourBookings'
                                                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                                }`}
                                            >
                                                <ClipboardDocumentListIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                                                {t('tourBookings.title', 'Tour-Buchungen')}
                                            </button>
                                        )}
                                    </nav>
                                </div>
                                
                                {/* Rechte Seite: Suchfeld, Sync-Button (nur Reservations), Filter-Button, Status-Filter, Spalten-Konfiguration */}
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="text"
                                        placeholder={t('common.search') + '...'}
                                        className="w-[120px] sm:w-[200px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                        value={activeTab === 'todos' ? searchTerm : reservationSearchTerm}
                                        onChange={(e) => {
                                            if (activeTab === 'todos') {
                                                setSearchTerm(e.target.value);
                                            } else {
                                                setReservationSearchTerm(e.target.value);
                                            }
                                        }}
                                    />
                                    
                                    {/* Sync-Button für Reservations */}
                                    {activeTab === 'reservations' && (
                                        <div className="relative group">
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        setSyncingReservations(true);
                                                        await axiosInstance.post(API_ENDPOINTS.RESERVATIONS.SYNC);
                                                        showMessage(t('reservations.syncSuccess', 'Reservations erfolgreich synchronisiert'), 'success');
                                                        await loadReservations();
                                                    } catch (err: any) {
                                                        if (process.env.NODE_ENV === 'development') {
                                                            console.error('Fehler beim Synchronisieren:', err);
                                                        }
                                                        showMessage(
                                                            err.response?.data?.message || t('reservations.syncError', 'Fehler beim Synchronisieren'),
                                                            'error'
                                                        );
                                                    } finally {
                                                        setSyncingReservations(false);
                                                    }
                                                }}
                                                disabled={syncingReservations}
                                                className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <ArrowPathIcon className={`h-5 w-5 ${syncingReservations ? 'animate-spin' : ''}`} />
                                            </button>
                                            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                                {syncingReservations ? t('reservations.syncing', 'Synchronisiere...') : t('reservations.sync', 'Synchronisieren')}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* View-Mode Toggle */}
                                    <div className="relative group">
                                        <button
                                            className={`p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                                viewMode === 'cards' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : ''
                                            }`}
                                            onClick={() => updateViewMode(viewMode === 'table' ? 'cards' : 'table')}
                                        >
                                            {viewMode === 'table' ? (
                                                <Squares2X2Icon className="h-5 w-5" />
                                            ) : (
                                                <TableCellsIcon className="h-5 w-5" />
                                            )}
                                        </button>
                                        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                            {viewMode === 'table' ? t('common.viewAsCards') : t('common.viewAsTable')}
                                        </div>
                                    </div>
                                    
                                    {/* Filter-Button */}
                                    <div className="relative group ml-1">
                                        <button
                                            className={`p-2 rounded-md ${getActiveFilterCount() > 0 ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-gray-700'} relative`}
                                            onClick={() => setIsFilterModalOpen(!isFilterModalOpen)}
                                        >
                                            <FunnelIcon className="h-5 w-5" />
                                            {getActiveFilterCount() > 0 && (
                                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center">
                                                    {getActiveFilterCount()}
                                                </span>
                                            )}
                                        </button>
                                        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                            {t('common.filter')}
                                        </div>
                                    </div>
                                    
                                    {/* Spalten-Konfiguration */}
                                    <div className="ml-1">
                                        <TableColumnConfig
                                            columns={activeTab === 'todos'
                                                ? (viewMode === 'cards'
                                                    ? [
                                                        { id: 'title', label: t('tasks.columns.title') },
                                                        { id: 'status', label: t('tasks.columns.status') },
                                                        { id: 'responsible', label: t('tasks.columns.responsible') },
                                                        { id: 'qualityControl', label: t('tasks.columns.qualityControl') },
                                                        { id: 'branch', label: t('tasks.columns.branch') },
                                                        { id: 'dueDate', label: t('tasks.columns.dueDate') },
                                                        { id: 'description', label: t('tasks.columns.description') }
                                                    ]
                                                    : availableColumns)
                                                : activeTab === 'reservations'
                                                ? (viewMode === 'cards'
                                                    ? [
                                                        { id: 'guestName', label: t('reservations.columns.guestName', 'Gast') },
                                                        { id: 'status', label: t('reservations.columns.status', 'Status') },
                                                        { id: 'paymentStatus', label: t('reservations.columns.paymentStatus', 'Zahlungsstatus') },
                                                        { id: 'checkInDate', label: t('reservations.columns.checkInDate', 'Check-in') },
                                                        { id: 'checkOutDate', label: t('reservations.columns.checkOutDate', 'Check-out') },
                                                        { id: 'roomNumber', label: t('reservations.columns.roomNumber', 'Zimmer') },
                                                        { id: 'guestEmail', label: t('reservations.columns.guestEmail', 'E-Mail') },
                                                        { id: 'guestPhone', label: t('reservations.columns.guestPhone', 'Telefon') },
                                                        { id: 'amount', label: t('reservations.columns.amount', 'Betrag') },
                                                        { id: 'arrivalTime', label: t('reservations.columns.arrivalTime', 'Ankunftszeit') }
                                                    ]
                                                    : availableReservationColumns)
                                                : []}
                                            visibleColumns={viewMode === 'cards'
                                                ? Array.from(visibleCardMetadata)
                                                : visibleColumnIds}
                                            columnOrder={viewMode === 'cards'
                                                ? cardMetadataOrder
                                                : settings.columnOrder}
                                            onToggleColumnVisibility={(columnId) => {
                                                if (viewMode === 'cards') {
                                                    if (activeTab === 'todos') {
                                                        const tableColumn = cardToTableMapping[columnId];
                                                        if (tableColumn) {
                                                            // Spezielle Logik für responsibleAndQualityControl
                                                            if (tableColumn === 'responsibleAndQualityControl') {
                                                                // Prüfe ob beide bereits ausgeblendet sind
                                                                const otherCardMeta = columnId === 'responsible' ? 'qualityControl' : 'responsible';
                                                                const otherHidden = hiddenCardMetadata.has(otherCardMeta);
                                                                const currentlyHidden = settings.hiddenColumns.includes(tableColumn);
                                                                
                                                                if (currentlyHidden && !otherHidden) {
                                                                    // Eine der beiden wird wieder angezeigt, also responsibleAndQualityControl wieder anzeigen
                                                                    toggleColumnVisibility(tableColumn);
                                                                } else if (!currentlyHidden && otherHidden) {
                                                                    // Die andere ist bereits ausgeblendet, also responsibleAndQualityControl ausblenden
                                                                    toggleColumnVisibility(tableColumn);
                                                                } else if (!currentlyHidden) {
                                                                    // Erste wird ausgeblendet, responsibleAndQualityControl ausblenden
                                                                    toggleColumnVisibility(tableColumn);
                                                                } else {
                                                                    // Beide sind ausgeblendet, eine wird wieder angezeigt
                                                                    toggleColumnVisibility(tableColumn);
                                                                }
                                                            } else {
                                                                // Normale Spalte: direkt ein/ausblenden
                                                                toggleColumnVisibility(tableColumn);
                                                            }
                                                        }
                                                    } else if (activeTab === 'reservations') {
                                                        // Reservations: 1:1 Mapping
                                                        const tableColumn = reservationCardToTableMapping[columnId];
                                                        if (tableColumn) {
                                                            toggleColumnVisibility(tableColumn);
                                                        }
                                                    }
                                                } else {
                                                    toggleColumnVisibility(columnId);
                                                }
                                            }}
                                            onMoveColumn={viewMode === 'cards'
                                                ? (dragIndex: number, hoverIndex: number) => {
                                                    const newCardOrder = [...cardMetadataOrder];
                                                    const dragged = newCardOrder[dragIndex];
                                                    newCardOrder.splice(dragIndex, 1);
                                                    newCardOrder.splice(hoverIndex, 0, dragged);
                                                    
                                                    const newTableOrder: string[] = [];
                                                    const usedTableColumns = new Set<string>();
                                                    
                                                    if (activeTab === 'todos') {
                                                        newCardOrder.forEach(cardMeta => {
                                                            const tableCol = cardToTableMapping[cardMeta];
                                                            if (tableCol && !usedTableColumns.has(tableCol)) {
                                                                usedTableColumns.add(tableCol);
                                                                newTableOrder.push(tableCol);
                                                            }
                                                        });
                                                        
                                                        availableColumns.forEach(col => {
                                                            if (!newTableOrder.includes(col.id) && col.id !== 'actions') {
                                                                newTableOrder.push(col.id);
                                                            }
                                                        });
                                                    } else if (activeTab === 'reservations') {
                                                        // Reservations: 1:1 Mapping
                                                        newCardOrder.forEach(cardMeta => {
                                                            const tableCol = reservationCardToTableMapping[cardMeta];
                                                            if (tableCol && !usedTableColumns.has(tableCol)) {
                                                                usedTableColumns.add(tableCol);
                                                                newTableOrder.push(tableCol);
                                                            }
                                                        });
                                                        
                                                        availableReservationColumns.forEach(col => {
                                                            if (!newTableOrder.includes(col.id) && col.id !== 'actions') {
                                                                newTableOrder.push(col.id);
                                                            }
                                                        });
                                                    }
                                                    
                                                    updateColumnOrder(newTableOrder);
                                                }
                                                : handleMoveColumn}
                                            buttonTitle={viewMode === 'cards' ? t('tableColumn.sortAndDisplay') : t('tableColumn.configure')}
                                            modalTitle={viewMode === 'cards' ? t('tableColumn.sortAndDisplay') : t('tableColumn.configure')}
                                            sortDirections={viewMode === 'cards' && activeTab === 'todos'
                                                ? taskCardSortDirections
                                                : viewMode === 'cards' && activeTab === 'reservations' 
                                                ? reservationCardSortDirections 
                                                : undefined}
                                            onSortDirectionChange={viewMode === 'cards' && activeTab === 'todos'
                                                ? handleTaskCardSortDirectionChange
                                                : viewMode === 'cards' && activeTab === 'reservations'
                                                ? handleReservationCardSortDirectionChange
                                                : undefined}
                                            showSortDirection={viewMode === 'cards' && (activeTab === 'todos' || activeTab === 'reservations')}
                                            onClose={() => {}}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Filter-Pane */}
                            {isFilterModalOpen && (
                                <div className={viewMode === 'cards' ? '-mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6' : 'px-3 sm:px-4 md:px-6'}>
                                    {activeTab === 'todos' ? (
                                        <FilterPane
                                            columns={[...availableColumns, ...filterOnlyColumns]}
                                            onApply={applyFilterConditions}
                                            onReset={resetFilterConditions}
                                            savedConditions={filterConditions}
                                            savedOperators={filterLogicalOperators}
                                            savedSortDirections={filterSortDirections}
                                            onSortDirectionsChange={setFilterSortDirections}
                                            tableId={TODOS_TABLE_ID}
                                        />
                                    ) : (
                                        <FilterPane
                                            columns={[...availableReservationColumns, ...reservationFilterOnlyColumns]}
                                            onApply={applyReservationFilterConditions}
                                            onReset={resetReservationFilterConditions}
                                            savedConditions={reservationFilterConditions}
                                            savedOperators={reservationFilterLogicalOperators}
                                            savedSortDirections={reservationFilterSortDirections}
                                            onSortDirectionsChange={setReservationFilterSortDirections}
                                            tableId={RESERVATIONS_TABLE_ID}
                                        />
                                    )}
                                </div>
                            )}

                            {/* Gespeicherte Filter als Tags anzeigen */}
                            <SavedFilterTags
                                tableId={activeTab === 'todos' ? TODOS_TABLE_ID : RESERVATIONS_TABLE_ID}
                                onSelectFilter={activeTab === 'todos' ? applyFilterConditions : applyReservationFilterConditions}
                                onReset={activeTab === 'todos' ? resetFilterConditions : resetReservationFilterConditions}
                                activeFilterName={activeTab === 'todos' ? activeFilterName : reservationActiveFilterName}
                                selectedFilterId={activeTab === 'todos' ? selectedFilterId : reservationSelectedFilterId}
                                onFilterChange={activeTab === 'todos' ? handleFilterChange : handleReservationFilterChange}
                                defaultFilterName={activeTab === 'todos' ? t('tasks.filters.current') : t('reservations.filters.current', 'Aktuell')}
                            />

                            {/* Tabelle oder Cards */}
                            {activeTab === 'todos' && viewMode === 'table' ? (
                                /* Tabellen-Ansicht - Tasks */
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700" data-onboarding="task-list">
                                        <thead className="bg-gray-50 dark:bg-gray-700">
                                            <tr>
                                                {visibleColumnIds.map((columnId) => {
                                                    const column = availableColumns.find(col => col.id === columnId);
                                                    if (!column) return null;

                                                    return (
                                                        <th 
                                                            key={columnId}
                                                            scope="col"
                                                            className={`px-3 sm:px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ${columnId === dragOverColumn ? 'bg-blue-100 dark:bg-blue-800' : ''}`}
                                                            draggable={true}
                                                            onDragStart={() => handleDragStart(columnId)}
                                                            onDragOver={(e) => handleDragOver(e, columnId)}
                                                            onDrop={(e) => handleDrop(e, columnId)}
                                                            onDragEnd={handleDragEnd}
                                                        >
                                                            <div className="flex items-center">
                                                                {window.innerWidth <= 640 ? column.shortLabel : column.label}
                                                                {columnId !== 'actions' && (
                                                                    <button 
                                                                        onClick={() => handleSort(columnId as keyof Task)}
                                                                        className="ml-1 focus:outline-none"
                                                                    >
                                                                        <ArrowsUpDownIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </th>
                                                    );
                                                })}
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                            {loading ? (
                                                <tr>
                                                    <td colSpan={visibleColumnIds.length} className="px-3 sm:px-4 md:px-6 py-4 text-center">
                                                        <div className="flex justify-center">
                                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-gray-100"></div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : error ? (
                                                <tr>
                                                    <td colSpan={visibleColumnIds.length} className="px-6 py-4 text-center text-red-600 dark:text-red-400">
                                                        {error}
                                                    </td>
                                                </tr>
                                            ) : filteredAndSortedTasks.length === 0 ? (
                                                <tr>
                                                    <td colSpan={visibleColumnIds.length} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                                                        <div className="flex flex-col items-center justify-center gap-4">
                                                        <ClipboardDocumentListIcon className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                                                        <div className="text-sm">{t('tasks.noTasksFound')}</div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            <>
                                            {filteredAndSortedTasks.slice(0, tasksDisplayLimit).map(task => {
                                            const expiryStatus = getExpiryStatus(task.dueDate, 'todo', undefined, task.title, task.description);
                                            const expiryColors = getExpiryColorClasses(expiryStatus);
                                            
                                            return (
                                                <tr 
                                                    key={task.id} 
                                                    className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                                                        expiryStatus !== 'none' ? `${expiryColors.bgClass} ${expiryColors.borderClass} border-l-4` : ''
                                                    }`}
                                                >
                                                    {visibleColumnIds.map(columnId => {
                                                    switch (columnId) {
                                                        case 'title':
                                                            return (
                                                                <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4">
                                                                    <div className="text-sm text-gray-900 dark:text-gray-200 break-words flex items-center">
                                                                        {task.title}
                                                                            {task.description && (
                                                                                <div className="ml-2 relative group">
                                                                                    <button 
                                                                                        className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                                                                                    >
                                                                                        <InformationCircleIcon className="h-5 w-5" />
                                                                                    </button>
                                                                                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                                                                        {t('tasks.showDescription')}
                                                                                    </div>
                                                                                    <div className="absolute left-0 mt-2 p-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 shadow-lg rounded-md border border-gray-200 dark:border-gray-700 w-144 max-h-96 overflow-y-auto min-w-[36rem] z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                                                                                        <MarkdownPreview content={task.description} showImagePreview={true} />
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                );
                                                            case 'status':
                                                                return (
                                                                    <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
                                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(task.status, 'task')} dark:bg-opacity-30 status-col`}>
                                                                            {task.status}
                                                                        </span>
                                                                    </td>
                                                                );
                                                            case 'responsibleAndQualityControl':
                                                                return (
                                                                    <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
                                                                        <div className="flex flex-col">
                                                                            <div className="text-sm text-gray-900 dark:text-gray-200">
                                                                                <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">{t('tasks.columns.responsible')}:</span>
                                                                                <span className="text-xs text-gray-500 dark:text-gray-400 inline sm:hidden">{t('tasks.columns.responsible').substring(0, 3)}:</span><br />
                                                                                {task.responsible ? `${task.responsible.firstName} ${task.responsible.lastName}` : task.role ? task.role.name : '-'}
                                                                            </div>
                                                                            <div className="text-sm text-gray-900 dark:text-gray-200 mt-1">
                                                                                <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">{t('tasks.qualityControlLabel')}</span>
                                                                                <span className="text-xs text-gray-500 dark:text-gray-400 inline sm:hidden">{t('tasks.columns.qualityControl').substring(0, 2)}:</span><br />
                                                                                {task.qualityControl ? `${task.qualityControl.firstName} ${task.qualityControl.lastName}` : '-'}
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                );
                                                            case 'branch':
                                                                return (
                                                                    <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
                                                                        <div className="text-sm text-gray-900 dark:text-gray-200">{task.branch.name}</div>
                                                                    </td>
                                                                );
                                                            case 'dueDate':
                                                                const expiryStatusForDate2 = getExpiryStatus(task.dueDate, 'todo', undefined, task.title, task.description);
                                                                const expiryColorsForDate2 = getExpiryColorClasses(expiryStatusForDate2);
                                                                return (
                                                                    <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
                                                                        <div className={`text-sm ${expiryStatusForDate2 !== 'none' ? expiryColorsForDate2.textClass : 'text-gray-900 dark:text-gray-200'}`}>
                                                                            {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}
                                                                            {expiryStatusForDate2 !== 'none' && (
                                                                                <span className="ml-2 text-xs">⚠</span>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                );
                                                            case 'actions':
                                                                return (
                                                                    <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
                                                                        <div className="flex space-x-2 action-buttons">
                                                                            <div className="status-buttons">
                                                                                {renderStatusButtons(task)}
                                                                            </div>
                                                                            {hasPermission('tasks', 'write', 'table') && (
                                                                                <div className="relative group">
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            setSelectedTask(task);
                                                                                            setIsEditModalOpen(true);
                                                                                        }}
                                                                                        className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                                                                    >
                                                                                        <PencilIcon className="h-4 w-4" />
                                                                                    </button>
                                                                                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                                                                        {t('common.edit')}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                            {hasPermission('tasks', 'both', 'table') && (
                                                                                <div className="relative group">
                                                                                    <button
                                                                                        onClick={() => handleCopyTask(task)}
                                                                                        className="p-1.5 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                                                                                    >
                                                                                        <DocumentDuplicateIcon className="h-4 w-4" />
                                                                                    </button>
                                                                                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                                                                        {t('tasks.actions.copy')}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                            {hasPermission('tasks', 'delete', 'table') && (
                                                                                <div className="relative group">
                                                                                    <button
                                                                                        onClick={() => handleDeleteTask(task.id)}
                                                                                        className="p-1.5 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                                                                    >
                                                                                        <TrashIcon className="h-4 w-4" />
                                                                                    </button>
                                                                                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                                                                        {t('common.delete')}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                );
                                                            default:
                                                                return null;
                                                        }
                                                    })}
                                                    </tr>
                                                );
                                            })}
                                            </>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            ) : activeTab === 'todos' ? (
                                /* Card-Ansicht - Tasks - ohne Box-Schattierung, Cards auf voller Breite */
                                <div className="-mx-3 sm:-mx-4 md:-mx-6">
                                    {/* ✅ PERFORMANCE: Skeleton-Loading für LCP-Element (sofort sichtbar, auch ohne Daten) */}
                                    {loading && tasks.length === 0 ? (
                                        <CardGrid>
                                            {Array(3).fill(null).map((_, i) => (
                                                <div key={`skeleton-${i}`} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-3 sm:p-4 md:p-5 lg:p-6 shadow-sm">
                                                    <div className="space-y-4">
                                                        {/* LCP-Element: Titel-Skeleton */}
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
                                                            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded flex-1 min-w-0"></div>
                                                        </div>
                                                        {/* Status-Skeleton */}
                                                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                                                        {/* Metadaten-Skeleton */}
                                                        <div className="space-y-2">
                                                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                                                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                                                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </CardGrid>
                                    ) : error ? (
                                        <div className="flex justify-center py-12 text-red-600 dark:text-red-400">
                                            {error}
                                        </div>
                                    ) : filteredAndSortedTasks.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                                            <ClipboardDocumentListIcon className="h-10 w-10 mb-4 text-gray-400 dark:text-gray-500" />
                                            <div className="text-sm">Keine To Do's gefunden</div>
                                        </div>
                                    ) : (
                                        <CardGrid>
                                            {filteredAndSortedTasks.slice(0, tasksDisplayLimit).map(task => {
                                                const expiryStatus = getExpiryStatus(task.dueDate, 'todo', undefined, task.title, task.description);
                                                
                                                // Metadaten basierend auf sichtbaren Einstellungen - strukturiert nach Position
                                                const metadata: MetadataItem[] = [];
                                                
                                                // Links: Niederlassung
                                                if (visibleCardMetadata.has('branch')) {
                                                    metadata.push({
                                                        icon: <BuildingOfficeIcon className="h-4 w-4" />,
                                                        label: t('tasks.columns.branch'),
                                                        value: task.branch.name,
                                                        section: 'left'
                                                    });
                                                }
                                                
                                                // Haupt-Metadaten: Verantwortlicher & Qualitätskontrolle
                                                if (visibleCardMetadata.has('responsible')) {
                                                    // Benutzernamen auf 4 Zeichen kürzen
                                                    const responsibleValue = task.responsible ? `${task.responsible.firstName} ${task.responsible.lastName}` : (task.role ? task.role.name : '-');
                                                    const shortenedName = responsibleValue.length > 4 && responsibleValue !== '-' ? responsibleValue.substring(0, 4) : responsibleValue;
                                                    metadata.push({
                                                        icon: <UserIcon className="h-4 w-4" />,
                                                        label: t('tasks.columns.responsible'),
                                                        value: shortenedName,
                                                        section: 'main'
                                                    });
                                                }
                                                if (visibleCardMetadata.has('qualityControl')) {
                                                    // Benutzernamen auf 4 Zeichen kürzen
                                                    const qualityControlValue = task.qualityControl ? `${task.qualityControl.firstName} ${task.qualityControl.lastName}` : '-';
                                                    const shortenedName = qualityControlValue.length > 4 && qualityControlValue !== '-' ? qualityControlValue.substring(0, 4) : qualityControlValue;
                                                    metadata.push({
                                                        icon: <UserIcon className="h-4 w-4" />,
                                                        label: t('tasks.columns.qualityControl'),
                                                        value: shortenedName,
                                                        section: 'main-second'
                                                    });
                                                }
                                                
                                                // Rechts: Fälligkeit (erste Zeile rechts, neben Status)
                                                if (visibleCardMetadata.has('dueDate')) {
                                                    const dueDateItem = createDueDateMetadataItem(
                                                        task.dueDate,
                                                        'todo',
                                                        task.title,
                                                        task.description,
                                                        <CalendarIcon className="h-4 w-4" />,
                                                        t('tasks.columns.dueDate'),
                                                        (date) => format(date, 'dd.MM.yyyy', { locale: de }),
                                                        false // Keine Badge-Art, nur Text
                                                    );
                                                    metadata.push({
                                                        ...dueDateItem,
                                                        section: 'right-inline' // Neue Section für inline rechts (neben Status)
                                                    });
                                                }
                                                
                                                // Full-Width: Beschreibung
                                                if (visibleCardMetadata.has('description') && task.description) {
                                                    metadata.push({
                                                        label: t('tasks.columns.description'),
                                                        value: '',
                                                        descriptionContent: task.description,
                                                        attachmentMetadata: task.attachments || [], // Attachment-Metadaten für Vorschau
                                                        section: 'full'
                                                    });
                                                }
                                                
                                                // Action-Buttons
                                                const actionButtons = (
                                                    <div className="flex items-center space-x-2">
                                                        {/* Status-Buttons */}
                                                        <div className="status-buttons">
                                                            {renderStatusButtons(task)}
                                                        </div>
                                                        {hasPermission('tasks', 'write', 'table') && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedTask(task);
                                                                    setIsEditModalOpen(true);
                                                                }}
                                                                                    className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                                                                >
                                                                <PencilIcon className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                        {hasPermission('tasks', 'both', 'table') && (
                                                            <div className="relative group">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleCopyTask(task);
                                                                    }}
                                                                    className="p-1.5 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                                                                >
                                                                    <DocumentDuplicateIcon className="h-4 w-4" />
                                                                </button>
                                                                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                                                    {t('tasks.actions.copy')}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                                
                                                return (
                                                    <DataCard
                                                        key={task.id}
                                                        title={
                                                          <span>
                                                            <span className="text-xs text-gray-600 dark:text-gray-400">{task.id}:</span>{' '}
                                                            <span>{task.title}</span>
                                                          </span>
                                                        }
                                                        status={{
                                                            label: getStatusText(task.status, 'task', t),
                                                            color: getStatusColor(task.status, 'task'),
                                                            onPreviousClick: undefined,
                                                            onNextClick: undefined
                                                        }}
                                                        metadata={metadata}
                                                        actions={actionButtons}
                                                    />
                                                );
                                            })}
                                        </CardGrid>
                                    )}
                                </div>
                            ) : null}
                            
                            {/* ❌ Loading Indicator entfernt - Infinite Scroll lädt keine Daten mehr, nur Anzeige */}
                            
                            {/* Reservations Rendering - Desktop - Cards */}
                            {activeTab === 'reservations' && viewMode === 'cards' && (
                                <div className="-mx-3 sm:-mx-4 md:-mx-6">
                                    {reservationsLoading ? (
                                        <div className="flex justify-center py-12">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-gray-100"></div>
                                        </div>
                                    ) : reservationsError ? (
                                        <div className="flex justify-center py-12 text-red-600 dark:text-red-400">
                                            {reservationsError}
                                        </div>
                                    ) : filteredAndSortedReservations.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                                            <CalendarIcon className="h-10 w-10 mb-4 text-gray-400 dark:text-gray-500" />
                                            <div className="text-sm">
                                                {reservationSearchTerm || reservationFilterStatus !== 'all' || reservationFilterPaymentStatus !== 'all'
                                                    ? t('reservations.noResults', 'Keine Reservations gefunden')
                                                    : t('reservations.noReservations', 'Keine Reservations vorhanden')}
                                            </div>
                                        </div>
                                    ) : (
                                        <CardGrid>
                                            {filteredAndSortedReservations.slice(0, reservationsDisplayLimit).map(reservation => {
                                                const formatDate = (dateString: string) => {
                                                    try {
                                                        // Extrahiere nur den Datumsteil (YYYY-MM-DD) und parse als lokales Datum
                                                        // Dies verhindert Zeitzone-Konvertierung, die zu einem Tag-Versatz führt
                                                        const date = new Date(dateString);
                                                        // Verwende UTC-Methoden, um nur den Datumsteil zu extrahieren (ohne Zeitzone)
                                                        const year = date.getUTCFullYear();
                                                        const month = date.getUTCMonth();
                                                        const day = date.getUTCDate();
                                                        // Erstelle lokales Datum aus den UTC-Werten
                                                        const localDate = new Date(year, month, day);
                                                        return format(localDate, 'dd.MM.yyyy', { locale: de });
                                                    } catch {
                                                        return dateString;
                                                    }
                                                };
                                                
                                                // Metadaten für Reservation-Card
                                                const metadata: MetadataItem[] = [];
                                                
                                                // Haupt-Metadaten: Check-in/Check-out (rechts oben, unverändert)
                                                metadata.push({
                                                    icon: <CalendarIcon className="h-4 w-4" />,
                                                    label: t('reservations.checkInOut', 'Check-in/Check-out'),
                                                    value: `${formatDate(reservation.checkInDate)} - ${formatDate(reservation.checkOutDate)}`,
                                                    section: 'main'
                                                });
                                                
                                                // Zweite Zeile: Zimmernummer
                                                if (reservation.roomNumber) {
                                                    metadata.push({
                                                        icon: <HomeIcon className="h-4 w-4" />,
                                                        value: reservation.roomNumber,
                                                        section: 'main-second'
                                                    });
                                                }
                                                
                                                // Links: Telefon/Email unter Titel (gleiche Zeile wie Status)
                                                if (reservation.guestEmail) {
                                                    metadata.push({
                                                        icon: <EnvelopeIcon className="h-4 w-4" />,
                                                        value: reservation.guestEmail,
                                                        section: 'left'
                                                    });
                                                }
                                                if (reservation.guestPhone) {
                                                    metadata.push({
                                                        icon: <PhoneIcon className="h-4 w-4" />,
                                                        value: reservation.guestPhone,
                                                        section: 'left'
                                                    });
                                                }
                                                
                                                // Links: Branch (nach Telefon/Email)
                                                if (reservation.branch) {
                                                    metadata.push({
                                                        icon: <BuildingOfficeIcon className="h-4 w-4" />,
                                                        value: reservation.branch.name,
                                                        section: 'left'
                                                    });
                                                }
                                                
                                                // Mitte: Zahlungslink (gleiche Höhe wie Payment Status)
                                                if (reservation.paymentLink) {
                                                    metadata.push({
                                                        icon: <LinkIcon className="h-4 w-4" />,
                                                        value: (
                                                            <a 
                                                                href={reservation.paymentLink} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="text-gray-900 dark:text-white break-all"
                                                            >
                                                                {t('reservations.paymentLink', 'Zahlungslink')}
                                                            </a>
                                                        ),
                                                        section: 'center'
                                                    });
                                                }
                                                
                                                // Mitte: Check-in Link (direkt unter Zahlungslink)
                                                // WICHTIG: Verwende lobbyReservationId (LobbyPMS booking_id) als codigo, nicht die interne ID
                                                const codigo = reservation.lobbyReservationId || reservation.id.toString();
                                                const checkInLink = reservation.guestEmail 
                                                    ? `https://app.lobbypms.com/checkinonline/confirmar?codigo=${codigo}&email=${encodeURIComponent(reservation.guestEmail)}&lg=GB`
                                                    : null;
                                                if (checkInLink) {
                                                    metadata.push({
                                                    icon: <LinkIcon className="h-4 w-4" />,
                                                    value: (
                                                        <div className="relative group">
                                                            <a 
                                                                href={checkInLink} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="text-gray-900 dark:text-white"
                                                            >
                                                                {t('reservations.checkInLink', 'Check-in Link')}
                                                            </a>
                                                            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                                                {checkInLink}
                                                            </div>
                                                        </div>
                                                    ),
                                                    section: 'center'
                                                    });
                                                }
                                                
                                                // Rechts: Reservation Status als erstes Badge (mit Label)
                                                metadata.push({
                                                    label: t('reservations.status', 'Status'),
                                                    value: (
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${getReservationStatusColor(reservation.status)}`}>
                                                            {t(`reservations.status.${reservation.status}`, reservation.status)}
                                                        </span>
                                                    ),
                                                    section: 'right'
                                                });
                                                
                                                // Rechts: Payment Status als zweites Badge (direkt unter Reservation Status)
                                                metadata.push({
                                                    label: t('reservations.paymentStatus', 'Zahlungsstatus'),
                                                    value: (
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${getPaymentStatusColor(reservation.paymentStatus)}`}>
                                                            {t(`reservations.paymentStatus.${reservation.paymentStatus}`, reservation.paymentStatus)}
                                                        </span>
                                                    ),
                                                    section: 'right'
                                                });
                                                
                                                // Betrag und Währung (wenn vorhanden)
                                                if (reservation.amount) {
                                                    const amountValue = typeof reservation.amount === 'string' 
                                                        ? parseFloat(reservation.amount).toFixed(2)
                                                        : typeof reservation.amount === 'number'
                                                        ? reservation.amount.toFixed(2)
                                                        : '0.00';
                                                    metadata.push({
                                                        icon: <CurrencyDollarIcon className="h-4 w-4" />,
                                                        label: t('reservations.amount', 'Betrag'),
                                                        value: `${amountValue} ${reservation.currency || 'COP'}`,
                                                        section: 'right'
                                                    });
                                                }
                                                
                                                // Ankunftszeit (wenn vorhanden)
                                                if (reservation.arrivalTime) {
                                                    const formatDateTime = (dateString: string) => {
                                                        try {
                                                            return format(new Date(dateString), 'dd.MM.yyyy HH:mm', { locale: de });
                                                        } catch {
                                                            return dateString;
                                                        }
                                                    };
                                                    metadata.push({
                                                        icon: <ClockIcon className="h-4 w-4" />,
                                                        label: t('reservations.arrivalTime', 'Ankunftszeit'),
                                                        value: formatDateTime(reservation.arrivalTime),
                                                        section: 'right'
                                                    });
                                                }
                                                
                                                // Tür-PIN (wenn vorhanden)
                                                if (reservation.doorPin) {
                                                    metadata.push({
                                                        icon: <KeyIcon className="h-4 w-4" />,
                                                        label: reservation.doorAppName || t('reservations.doorPin', 'Tür-PIN'),
                                                        value: reservation.doorPin,
                                                        section: 'right'
                                                    });
                                                }
                                                
                                                // Online Check-in Status
                                                if (reservation.onlineCheckInCompleted) {
                                                    metadata.push({
                                                        icon: <CheckCircleIcon className="h-4 w-4 text-green-600" />,
                                                        label: t('reservations.onlineCheckIn', 'Online Check-in'),
                                                        value: t('reservations.completed', 'Abgeschlossen'),
                                                        section: 'right'
                                                    });
                                                }
                                                
                                                // Action-Buttons für Einladung senden und PIN-Generierung
                                                const hasWritePermission = hasPermission('reservations', 'write', 'table');
                                                const actionButtons = hasWritePermission ? (
                                                    <div className="flex items-center space-x-2">
                                                        {/* Einladung senden Button */}
                                                        <div className="relative group">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedReservationForInvitation(reservation);
                                                                    setIsSendInvitationSidepaneOpen(true);
                                                                }}
                                                                className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                                            >
                                                                <PaperAirplaneIcon className="h-4 w-4" />
                                                            </button>
                                                            <div className="absolute right-full mr-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                                                {t('reservations.sendInvitation.title')}
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Key-Button für PIN-Generierung */}
                                                        <div className="relative group">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedReservationForPasscode(reservation);
                                                                    setIsSendPasscodeSidepaneOpen(true);
                                                                }}
                                                                className="p-1.5 text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
                                                            >
                                                                <KeyIcon className="h-4 w-4" />
                                                            </button>
                                                            <div className="absolute right-full mr-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                                                {t('reservations.sendPasscode.title')}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : null;
                                                
                                                // Expandable Content für Details - zeigt alle Notification-Logs
                                                const isExpanded = expandedReservationRows.has(reservation.id);
                                                const expandableContent = (
                                                    <div className="mt-2 pt-3">
                                                        <ReservationNotificationLogs reservationId={reservation.id} />
                                                    </div>
                                                );
                                                
                                                return (
                                                    <DataCard
                                                        key={reservation.id}
                                                        title={reservation.guestName}
                                                        subtitle={reservation.lobbyReservationId ? `ID: ${reservation.lobbyReservationId}` : undefined}
                                                        metadata={metadata}
                                                        actions={actionButtons}
                                                        expandable={expandableContent ? {
                                                            isExpanded: isExpanded,
                                                            content: expandableContent,
                                                            onToggle: () => toggleReservationExpanded(reservation.id)
                                                        } : undefined}
                                                    />
                                                );
                                            })}
                                        </CardGrid>
                                    )}
                                </div>
                            )}
                            
                            {/* Reservations Rendering - Desktop - Tabelle */}
                            {activeTab === 'reservations' && viewMode === 'table' && (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        <thead className="bg-gray-50 dark:bg-gray-700">
                                            <tr>
                                                {visibleColumnIds.map((columnId) => {
                                                    const column = availableReservationColumns.find(col => col.id === columnId);
                                                    if (!column) return null;
                                                    
                                                    return (
                                                        <th
                                                            key={columnId}
                                                            scope="col"
                                                            className={`px-3 sm:px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ${columnId === dragOverColumn ? 'bg-blue-100 dark:bg-blue-800' : ''}`}
                                                            draggable={true}
                                                            onDragStart={() => handleDragStart(columnId)}
                                                            onDragOver={(e) => handleDragOver(e, columnId)}
                                                            onDrop={(e) => handleDrop(e, columnId)}
                                                            onDragEnd={handleDragEnd}
                                                        >
                                                            <div className="flex items-center">
                                                                {window.innerWidth <= 640 ? column.shortLabel : column.label}
                                                                {columnId !== 'actions' && (
                                                                    <button 
                                                                        onClick={() => handleReservationSort(columnId as ReservationSortConfig['key'])}
                                                                        className="ml-1 focus:outline-none"
                                                                    >
                                                                        <ArrowsUpDownIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </th>
                                                    );
                                                })}
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                            {reservationsLoading ? (
                                                <tr>
                                                    <td colSpan={visibleColumnIds.length} className="px-3 sm:px-4 md:px-6 py-4 text-center">
                                                        <div className="flex justify-center">
                                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-gray-100"></div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : reservationsError ? (
                                                <tr>
                                                    <td colSpan={visibleColumnIds.length} className="px-6 py-4 text-center text-red-600 dark:text-red-400">
                                                        {reservationsError}
                                                    </td>
                                                </tr>
                                            ) : filteredAndSortedReservations.length === 0 ? (
                                                <tr>
                                                    <td colSpan={visibleColumnIds.length} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                                                        <div className="flex flex-col items-center justify-center gap-4">
                                                            <CalendarIcon className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                                                            <div className="text-sm">
                                                                {reservationSearchTerm || reservationFilterStatus !== 'all' || reservationFilterPaymentStatus !== 'all'
                                                                    ? t('reservations.noResults', 'Keine Reservations gefunden')
                                                                    : t('reservations.noReservations', 'Keine Reservations vorhanden')}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                <>
                                                    {filteredAndSortedReservations.slice(0, reservationsDisplayLimit).map(reservation => {
                                                        const formatDate = (dateString: string) => {
                                                            try {
                                                                return format(new Date(dateString), 'dd.MM.yyyy', { locale: de });
                                                            } catch {
                                                                return dateString;
                                                            }
                                                        };
                                                        
                                                        return (
                                                            <tr 
                                                                key={reservation.id} 
                                                                className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                                                                onClick={() => navigate(`/reservations/${reservation.id}`)}
                                                            >
                                                                {visibleColumnIds.map(columnId => {
                                                                    switch (columnId) {
                                                                        case 'guestName':
                                                                            return (
                                                                                <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4">
                                                                                    <div className="text-sm text-gray-900 dark:text-gray-200 break-words">
                                                                                        {reservation.guestName}
                                                                                        {reservation.lobbyReservationId && (
                                                                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                                                                ID: {reservation.lobbyReservationId}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </td>
                                                                            );
                                                                        case 'status':
                                                                            return (
                                                                                <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
                                                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getReservationStatusColor(reservation.status)}`}>
                                                                                        {t(`reservations.status.${reservation.status}`, reservation.status)}
                                                                                    </span>
                                                                                </td>
                                                                            );
                                                                        case 'paymentStatus':
                                                                            return (
                                                                                <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
                                                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPaymentStatusColor(reservation.paymentStatus)}`}>
                                                                                        {t(`reservations.paymentStatus.${reservation.paymentStatus}`, reservation.paymentStatus)}
                                                                                    </span>
                                                                                </td>
                                                                            );
                                                                        case 'checkInDate':
                                                                        case 'checkOutDate':
                                                                            return (
                                                                                <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
                                                                                    <div className="text-sm text-gray-900 dark:text-gray-200">
                                                                                        {formatDate(columnId === 'checkInDate' ? reservation.checkInDate : reservation.checkOutDate)}
                                                                                    </div>
                                                                                </td>
                                                                            );
                                                                        case 'roomNumber':
                                                                            return (
                                                                                <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
                                                                                    <div className="text-sm text-gray-900 dark:text-gray-200">
                                                                                        {reservation.roomNumber || '-'}
                                                                                    </div>
                                                                                </td>
                                                                            );
                                                                        case 'branch':
                                                                            return (
                                                                                <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
                                                                                    <div className="text-sm text-gray-900 dark:text-gray-200">
                                                                                        {reservation.branch?.name || '-'}
                                                                                    </div>
                                                                                </td>
                                                                            );
                                                                        case 'guestEmail':
                                                                            return (
                                                                                <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
                                                                                    <div className="text-sm text-gray-900 dark:text-gray-200">
                                                                                        {reservation.guestEmail || '-'}
                                                                                    </div>
                                                                                </td>
                                                                            );
                                                                        case 'guestPhone':
                                                                            return (
                                                                                <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
                                                                                    <div className="text-sm text-gray-900 dark:text-gray-200">
                                                                                        {reservation.guestPhone || '-'}
                                                                                    </div>
                                                                                </td>
                                                                            );
                                                                        case 'amount':
                                                                            const amountValue = typeof reservation.amount === 'string' 
                                                                                ? parseFloat(reservation.amount).toFixed(2)
                                                                                : typeof reservation.amount === 'number'
                                                                                ? reservation.amount.toFixed(2)
                                                                                : '0.00';
                                                                            return (
                                                                                <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
                                                                                    <div className="text-sm text-gray-900 dark:text-gray-200">
                                                                                        {amountValue} {reservation.currency || 'COP'}
                                                                                    </div>
                                                                                </td>
                                                                            );
                                                                        case 'arrivalTime':
                                                                            return (
                                                                                <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
                                                                                    <div className="text-sm text-gray-900 dark:text-gray-200">
                                                                                        {reservation.arrivalTime ? format(new Date(reservation.arrivalTime), 'dd.MM.yyyy HH:mm', { locale: de }) : '-'}
                                                                                    </div>
                                                                                </td>
                                                                            );
                                                                        case 'actions':
                                                                            return (
                                                                                <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
                                                                                    <div className="flex space-x-2 action-buttons">
                                                                                        {hasPermission('reservations', 'write', 'table') && (
                                                                                            <>
                                                                                                {/* Einladung senden Button */}
                                                                                                <div className="relative group">
                                                                                                    <button
                                                                                                        onClick={(e) => {
                                                                                                            e.stopPropagation();
                                                                                                            setSelectedReservationForInvitation(reservation);
                                                                                                            setIsSendInvitationSidepaneOpen(true);
                                                                                                        }}
                                                                                                        className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                                                                                    >
                                                                                                        <PaperAirplaneIcon className="h-4 w-4" />
                                                                                                    </button>
                                                                                                    <div className="absolute right-full mr-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                                                                                        {t('reservations.sendInvitation.title')}
                                                                                                    </div>
                                                                                                </div>
                                                                                                
                                                                                                {/* Key-Button für PIN-Generierung */}
                                                                                                <div className="relative group">
                                                                                                    <button
                                                                                                        onClick={(e) => {
                                                                                                            e.stopPropagation();
                                                                                                            setSelectedReservationForPasscode(reservation);
                                                                                                            setIsSendPasscodeSidepaneOpen(true);
                                                                                                        }}
                                                                                                        className="p-1.5 text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
                                                                                                    >
                                                                                                        <KeyIcon className="h-4 w-4" />
                                                                                                    </button>
                                                                                                    <div className="absolute right-full mr-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                                                                                        {t('reservations.sendPasscode.title')}
                                                                                                    </div>
                                                                                                </div>
                                                                                                
                                                                                                {/* Details Button */}
                                                                                                <div className="relative group">
                                                                                                    <button
                                                                                                        onClick={(e) => {
                                                                                                            e.stopPropagation();
                                                                                                            navigate(`/reservations/${reservation.id}`);
                                                                                                        }}
                                                                                                        className="p-1.5 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
                                                                                                    >
                                                                                                        <InformationCircleIcon className="h-4 w-4" />
                                                                                                    </button>
                                                                                                    <div className="absolute right-full mr-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                                                                                        {t('common.viewDetails')}
                                                                                                    </div>
                                                                                                </div>
                                                                                            </>
                                                                                        )}
                                                                                    </div>
                                                                                </td>
                                                                            );
                                                                        default:
                                                                            return null;
                                                                    }
                                                                })}
                                                            </tr>
                                                        );
                                                    })}
                                                </>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            
                            {/* ❌ "Mehr anzeigen" Button entfernt - Infinite Scroll macht das automatisch */}
                            
                            
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Die Modals für beide Ansichten (mobil und desktop) */}
            <CreateTaskModal 
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onTaskCreated={(newTask) => {
                    // Optimistisches Update: Neuen Task zur Liste hinzufügen statt vollständigem Reload
                    if (newTask != null) {
                        setTasks(prevTasks => {
                            const validTasks = prevTasks.filter(task => task != null);
                            return [newTask, ...validTasks];
                        });
                        setIsEditModalOpen(true);
                        setSelectedTask(newTask);
                    }
                }}
            />
            
            {selectedTask && (
                <EditTaskModal
                    isOpen={isEditModalOpen}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setSelectedTask(null);
                    }}
                    onTaskUpdated={(updatedTask) => {
                        // Optimistisches Update: Task in Liste aktualisieren statt vollständigem Reload
                        if (updatedTask != null) {
                            setTasks(prevTasks => 
                                prevTasks
                                    .filter(task => task != null)
                                    .map(task => 
                                        task.id === updatedTask.id ? updatedTask : task
                                    )
                            );
                            setIsEditModalOpen(false);
                            setSelectedTask(null);
                            toast.success(t('worktime.messages.taskUpdated'));
                        }
                    }}
                    task={selectedTask}
                />
            )}
            
            {/* Create Reservation Modal */}
            <CreateReservationModal
                isOpen={isCreateReservationModalOpen}
                onClose={() => setIsCreateReservationModalOpen(false)}
                onReservationCreated={async (newReservation) => {
                    // Wechsle zum Reservations-Tab
                    setActiveTab('reservations');
                    // Lade Reservations neu, um den aktualisierten Status zu erhalten
                    await loadReservations();
                }}
            />
            
            {/* Send Invitation Sidepane */}
            {selectedReservationForInvitation && (
                <SendInvitationSidepane
                    isOpen={isSendInvitationSidepaneOpen}
                    onClose={() => {
                        setIsSendInvitationSidepaneOpen(false);
                        setSelectedReservationForInvitation(null);
                    }}
                    reservation={selectedReservationForInvitation}
                    onSuccess={async () => {
                        // Lade Reservations neu, um den aktualisierten Status zu erhalten
                        await loadReservations();
                    }}
                />
            )}

            {/* Send Passcode Sidepane */}
            {selectedReservationForPasscode && (
                <SendPasscodeSidepane
                    isOpen={isSendPasscodeSidepaneOpen}
                    onClose={() => {
                        setIsSendPasscodeSidepaneOpen(false);
                        setSelectedReservationForPasscode(null);
                    }}
                    reservation={selectedReservationForPasscode}
                    onSuccess={async () => {
                        // Lade Reservations neu, um den aktualisierten Status zu erhalten
                        await loadReservations();
                    }}
                />
            )}
            
            {/* Tour Bookings Tab Content */}
            {activeTab === 'tourBookings' && (
                <div className="space-y-4">
                    {/* Header mit Create-Button */}
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {t('tourBookings.title', 'Tour-Buchungen')}
                        </h2>
                        {hasPermission('tour_bookings', 'write', 'table') && (
                            <button
                                onClick={() => setIsCreateTourBookingModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                            >
                                <PlusIcon className="h-5 w-5" />
                                {t('tourBookings.create', 'Neue Buchung')}
                            </button>
                        )}
                    </div>

                    {/* Suche */}
                    <div className="max-w-md">
                        <input
                            type="text"
                            placeholder={t('common.search', 'Suchen...')}
                            value={tourBookingsSearchTerm}
                            onChange={(e) => setTourBookingsSearchTerm(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {tourBookingsLoading ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            {t('common.loading')}
                        </div>
                    ) : tourBookingsError ? (
                        <div className="text-center py-8 text-red-500 dark:text-red-400">
                            {tourBookingsError}
                        </div>
                    ) : tourBookings.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            {t('tourBookings.noBookings', 'Keine Buchungen vorhanden')}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-800">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            {t('tourBookings.tour', 'Tour')}
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            {t('tourBookings.customerName', 'Kunde')}
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            {t('tourBookings.tourDate', 'Tour-Datum')}
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            {t('tourBookings.numberOfParticipants', 'Teilnehmer')}
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            {t('tourBookings.totalPrice', 'Gesamtpreis')}
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            {t('tourBookings.paymentStatus', 'Zahlungsstatus')}
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            {t('tourBookings.status', 'Status')}
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            {t('tourBookings.bookedBy', 'Gebucht von')}
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            {t('common.actions', 'Aktionen')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {tourBookings
                                        .filter(booking => {
                                            if (!tourBookingsSearchTerm) return true;
                                            const search = tourBookingsSearchTerm.toLowerCase();
                                            return (
                                                booking.customerName?.toLowerCase().includes(search) ||
                                                booking.customerEmail?.toLowerCase().includes(search) ||
                                                booking.tour?.title?.toLowerCase().includes(search) ||
                                                booking.customerPhone?.includes(search)
                                            );
                                        })
                                        .map((booking) => (
                                            <tr key={booking.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {booking.tour?.title || '-'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900 dark:text-white">
                                                        {booking.customerName}
                                                    </div>
                                                    {booking.customerEmail && (
                                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                                            {booking.customerEmail}
                                                        </div>
                                                    )}
                                                    {booking.customerPhone && (
                                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                                            {booking.customerPhone}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900 dark:text-white">
                                                        {format(new Date(booking.tourDate), 'dd.MM.yyyy', { locale: de })}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900 dark:text-white">
                                                        {booking.numberOfParticipants}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                                        {Number(booking.totalPrice).toLocaleString()} {booking.currency}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 py-1 text-xs rounded-full ${
                                                        booking.paymentStatus === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                                        booking.paymentStatus === 'partially_paid' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                                        booking.paymentStatus === 'pending' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                                                        'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                    }`}>
                                                        {t(`tourBookings.paymentStatus.${booking.paymentStatus}`, booking.paymentStatus)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 py-1 text-xs rounded-full ${
                                                        booking.status === 'confirmed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                                        booking.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                                        booking.status === 'completed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                                        'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                                                    }`}>
                                                        {t(`tourBookings.status.${booking.status}`, booking.status)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {booking.bookedBy ? (
                                                        <div className="text-sm text-gray-900 dark:text-white">
                                                            {booking.bookedBy.firstName} {booking.bookedBy.lastName}
                                                        </div>
                                                    ) : (
                                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                                            -
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <div className="flex items-center gap-2">
                                                        {hasPermission('tour_bookings', 'write', 'table') && (
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedBookingForEdit(booking);
                                                                    setIsEditTourBookingModalOpen(true);
                                                                }}
                                                                className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                                                                title={t('common.edit', 'Bearbeiten')}
                                                            >
                                                                <PencilIcon className="h-5 w-5" />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => {
                                                                setSelectedBookingForLink(booking);
                                                                setIsTourReservationLinkModalOpen(true);
                                                            }}
                                                            className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
                                                            title={t('tours.reservationLink.title', 'Mit Reservation verknüpfen')}
                                                        >
                                                            <LinkIcon className="h-5 w-5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
            
            {/* Create Tour Booking Modal */}
            <CreateTourBookingModal
                isOpen={isCreateTourBookingModalOpen}
                onClose={() => setIsCreateTourBookingModalOpen(false)}
                onBookingCreated={async (newBooking) => {
                    await loadTourBookings();
                }}
            />

            {/* Edit Tour Booking Modal */}
            <EditTourBookingModal
                isOpen={isEditTourBookingModalOpen}
                onClose={() => {
                    setIsEditTourBookingModalOpen(false);
                    setSelectedBookingForEdit(null);
                }}
                booking={selectedBookingForEdit}
                onBookingUpdated={async (updatedBooking) => {
                    await loadTourBookings();
                }}
            />

            {/* Tour Reservation Link Modal */}
            {selectedBookingForLink && (
                <TourReservationLinkModal
                    isOpen={isTourReservationLinkModalOpen}
                    onClose={() => {
                        setIsTourReservationLinkModalOpen(false);
                        setSelectedBookingForLink(null);
                    }}
                    booking={selectedBookingForLink}
                    onLinked={async () => {
                        await loadTourBookings();
                    }}
                />
            )}
        </div>
    );
};

export default Worktracker; 
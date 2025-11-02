import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowsUpDownIcon,
  DocumentArrowDownIcon,
  PlusIcon,
  CurrencyDollarIcon,
  ChevronDownIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  ArrowPathIcon,
  CalendarIcon,
  ClockIcon,
  Squares2X2Icon,
  TableCellsIcon,
  UserIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { API_ENDPOINTS } from '../config/api.ts';
import axiosInstance from '../config/axios.ts';
import { usePermissions } from '../hooks/usePermissions.ts';
import { useTableSettings } from '../hooks/useTableSettings.ts';
import TableColumnConfig from '../components/TableColumnConfig.tsx';
import FilterPane from '../components/FilterPane.tsx';
import SavedFilterTags from '../components/SavedFilterTags.tsx';
import InvoiceDetailModal from '../components/InvoiceDetailModal.tsx';
import { FilterCondition } from '../components/FilterRow.tsx';
import { applyFilters } from '../utils/filterLogic.ts';
import { toast } from 'react-toastify';
import { useSidepane } from '../contexts/SidepaneContext.tsx';
import DataCard, { MetadataItem } from '../components/shared/DataCard.tsx';
import CardGrid from '../components/shared/CardGrid.tsx';

interface ConsultationInvoice {
  id: number;
  invoiceNumber: string;
  clientId: number;
  userId: number;
  issueDate: string;
  dueDate: string;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  subtotal: number;
  vatRate?: number;
  vatAmount?: number;
  total: number;
  currency: string;
  paymentTerms: string;
  notes?: string;
  pdfPath?: string;
  qrReference?: string;
  createdAt: string;
  updatedAt: string;
  client: {
    id: number;
    name: string;
    company?: string;
    email?: string;
  };
  user: {
    id: number;
    firstName: string;
    lastName: string;
  };
  items: Array<{
    id: number;
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
  payments?: Array<{
    id: number;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    reference?: string;
  }>;
}

interface SortConfig {
  key: keyof ConsultationInvoice | 'client.name';
  direction: 'asc' | 'desc';
}

// Standardreihenfolge der Spalten (IDs)
const defaultColumnOrder = ['expand', 'invoiceNumber', 'client', 'issueDate', 'dueDate', 'total', 'status', 'actions'];
const INVOICES_TABLE_ID = 'invoice-management';

// Card-Einstellungen Standardwerte
const defaultCardMetadata = ['invoiceNumber', 'client', 'issueDate', 'dueDate', 'total', 'status'];
const defaultCardColumnOrder = ['invoiceNumber', 'client', 'issueDate', 'dueDate', 'total', 'status'];
const defaultCardSortDirections: Record<string, 'asc' | 'desc'> = {
  invoiceNumber: 'asc',
  client: 'asc',
  issueDate: 'desc',
  dueDate: 'asc',
  total: 'asc',
  status: 'asc'
};

// Mapping zwischen Tabellen-Spalten-IDs und Card-Metadaten-IDs
const tableToCardMapping: Record<string, string[]> = {
  'expand': [], // Keine Card-Entsprechung
  'invoiceNumber': ['invoiceNumber'],
  'client': ['client'],
  'issueDate': ['issueDate'],
  'dueDate': ['dueDate'],
  'total': ['total'],
  'status': ['status'],
  'actions': [] // Keine Card-Entsprechung
};

// Reverse Mapping: Card-Metadaten -> Tabellen-Spalten
const cardToTableMapping: Record<string, string> = {
  'invoiceNumber': 'invoiceNumber',
  'client': 'client',
  'issueDate': 'issueDate',
  'dueDate': 'dueDate',
  'total': 'total',
  'status': 'status'
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
  return cardMetadata;
};


interface InvoiceManagementTabProps {
  selectedInvoiceId?: number | null;
}

const InvoiceManagementTab: React.FC<InvoiceManagementTabProps> = ({ selectedInvoiceId: initialSelectedInvoiceId }) => {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const { openSidepane, closeSidepane } = useSidepane();
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth > 1070);
  const [invoices, setInvoices] = useState<ConsultationInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ 
    key: 'issueDate', 
    direction: 'desc' 
  });
  
  // Filter States
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([]);
  const [filterLogicalOperators, setFilterLogicalOperators] = useState<('AND' | 'OR')[]>([]);
  
  // Filter State Management (Controlled Mode)
  const [activeFilterName, setActiveFilterName] = useState<string>('');
  const [selectedFilterId, setSelectedFilterId] = useState<number | null>(null);
  
  // Detail Modal State
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(initialSelectedInvoiceId || null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  // Expand/Collapse States (nach Tasks & Requests Standard)
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  
  // Sidepane States (nach Tasks & Requests Standard) 
  const [isEditSidepaneOpen, setIsEditSidepaneOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<ConsultationInvoice | null>(null);
  
  // Position States für Position-Bearbeitung innerhalb Sidepane
  const [editingPositions, setEditingPositions] = useState<Record<number, any[]>>({});
  
  // Berechtigungsprüfungen
  const canViewInvoices = hasPermission('consultation_invoices', 'read', 'table');
  const canEditInvoices = hasPermission('invoice_mark_paid', 'write', 'button');
  const canDownloadInvoices = hasPermission('invoice_download', 'read', 'button');
  
  // Table Settings
  const {
    settings,
    isLoading: isLoadingSettings,
    updateColumnOrder,
    updateHiddenColumns,
    toggleColumnVisibility,
    isColumnVisible,
    updateViewMode
  } = useTableSettings(INVOICES_TABLE_ID, {
    defaultColumnOrder,
    defaultHiddenColumns: [],
    defaultViewMode: 'cards'
  });

  const [isColumnConfigOpen, setIsColumnConfigOpen] = useState(false);

  // Verfügbare Spalten (dynamisch aus Übersetzungen)
  const availableColumns = useMemo(() => [
    { id: 'expand', label: '', shortLabel: '' }, // Expand-Button Spalte
    { id: 'invoiceNumber', label: t('invoices.columns.invoiceNumber'), shortLabel: t('invoices.columns.invoiceNumber').substring(0, 2) },
    { id: 'client', label: t('invoices.columns.client'), shortLabel: t('invoices.columns.client') },
    { id: 'issueDate', label: t('invoices.columns.issueDate'), shortLabel: t('common.today').substring(0, 3) },
    { id: 'dueDate', label: t('invoices.columns.dueDate'), shortLabel: t('invoices.columns.dueDate').substring(0, 5) },
    { id: 'total', label: t('invoices.columns.total'), shortLabel: t('invoices.columns.total') },
    { id: 'status', label: t('invoices.columns.status'), shortLabel: t('invoices.columns.status') },
    { id: 'actions', label: t('common.actions'), shortLabel: t('common.actions').substring(0, 3) }
  ], [t]);
  
  // Status-Konfiguration (mit Übersetzungen)
  const statusConfig = useMemo(() => ({
    DRAFT: { label: t('invoices.status.draft'), color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
    SENT: { label: t('invoices.status.sent'), color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
    PAID: { label: t('invoices.status.paid'), color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
    OVERDUE: { label: t('invoices.status.overdue'), color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
    CANCELLED: { label: t('invoices.status.cancelled'), color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' }
  }), [t]);
  
  const getStatusBadge = (status: ConsultationInvoice['status']) => {
    const config = statusConfig[status];
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  // View-Mode aus Settings laden
  const viewMode = settings.viewMode || 'cards';
  
  // Lokale Sortierrichtungen für Cards (nicht persistiert)
  const [cardSortDirections, setCardSortDirections] = useState<Record<string, 'asc' | 'desc'>>(() => {
    return defaultCardSortDirections;
  });

  // Abgeleitete Werte für Card-Ansicht aus Tabellen-Settings
  const cardMetadataOrder = useMemo(() => {
    return getCardMetadataFromColumnOrder(settings.columnOrder || defaultColumnOrder);
  }, [settings.columnOrder]);

  // Versteckte Card-Metadaten aus hiddenColumns ableiten
  const hiddenCardMetadata = useMemo(() => {
    return getHiddenCardMetadata(settings.hiddenColumns || []);
  }, [settings.hiddenColumns]);

  // Sichtbare Card-Metadaten (alle Card-Metadaten minus versteckte)
  const visibleCardMetadata = useMemo(() => {
    return new Set(cardMetadataOrder.filter(meta => !hiddenCardMetadata.has(meta)));
  }, [cardMetadataOrder, hiddenCardMetadata]);

  // CSS-Klasse für Container-Box setzen (für CSS-basierte Schattierungs-Entfernung)
  useEffect(() => {
    const wrapper = document.querySelector('.dashboard-invoices-wrapper');
    if (wrapper) {
      if (viewMode === 'cards') {
        wrapper.classList.add('cards-mode');
      } else {
        wrapper.classList.remove('cards-mode');
      }
    }
  }, [viewMode]);

  useEffect(() => {
    loadInvoices();
  }, []);

  // Auto-open detail modal wenn selectedInvoiceId von außen gesetzt wird
  useEffect(() => {
    if (initialSelectedInvoiceId && invoices.length > 0) {
      const invoice = invoices.find(inv => inv.id === initialSelectedInvoiceId);
      if (invoice) {
        setSelectedInvoiceId(initialSelectedInvoiceId);
        setIsDetailModalOpen(true);
      }
    }
  }, [initialSelectedInvoiceId, invoices]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(API_ENDPOINTS.CONSULTATION_INVOICES.BASE);
      setInvoices(response.data);
      setError(null);
    } catch (error: any) {
      console.error('Fehler beim Laden der Rechnungen:', error);
      setError('Fehler beim Laden der Rechnungen');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key: SortConfig['key']) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleDownloadPdf = async (invoiceId: number, invoiceNumber: string) => {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.CONSULTATION_INVOICES.GENERATE_PDF(invoiceId),
        { 
          responseType: 'blob',
          headers: {
            'Accept': 'application/pdf'
          }
        }
      );
      
      // Erstelle Blob und Download-Link
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Rechnung_${invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF erfolgreich heruntergeladen');
    } catch (error: any) {
      console.error('Fehler beim Download der PDF:', error);
      toast.error(error.response?.data?.message || 'Fehler beim Download der PDF');
    }
  };

  const handleMarkAsPaid = async (invoiceId: number) => {
    try {
      await axiosInstance.post(
        API_ENDPOINTS.CONSULTATION_INVOICES.MARK_PAID(invoiceId),
        {
          amount: invoices.find(inv => inv.id === invoiceId)?.total || 0,
          paymentDate: new Date().toISOString(),
          paymentMethod: 'Manual',
          reference: 'Manuelle Zahlung'
        }
      );
      
      toast.success('Rechnung als bezahlt markiert');
      loadInvoices(); // Refresh list
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Fehler beim Markieren als bezahlt');
    }
  };

  // Expand/Collapse Handler (nach Tasks & Requests Standard)
  const toggleExpanded = (invoiceId: number) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(invoiceId)) {
        newSet.delete(invoiceId);
      } else {
        newSet.add(invoiceId);
      }
      return newSet;
    });
  };

  // Überwache Bildschirmgröße
  useEffect(() => {
    const handleResize = () => {
      setIsLargeScreen(window.innerWidth > 1070);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sidepane-Status verwalten
  useEffect(() => {
    if (isEditSidepaneOpen) {
      openSidepane();
    } else {
      closeSidepane();
    }
    
    return () => {
      closeSidepane();
    };
  }, [isEditSidepaneOpen, openSidepane, closeSidepane]);

  // Sidepane Handler (nach Tasks & Requests Standard)
  const openEditSidepane = (invoice: ConsultationInvoice) => {
    setEditingInvoice(invoice);
    setIsEditSidepaneOpen(true);
  };

  const closeEditSidepane = () => {
    setIsEditSidepaneOpen(false);
    setEditingInvoice(null);
    setEditingPositions({});
  };

  // Filter-Funktionen
  const applyFilterConditions = (conditions: FilterCondition[], operators: ('AND' | 'OR')[]) => {
    setFilterConditions(conditions);
    setFilterLogicalOperators(operators);
  };

  const resetFilterConditions = () => {
    setFilterConditions([]);
    setFilterLogicalOperators([]);
    setActiveFilterName('');
    setSelectedFilterId(null);
  };
  
  // Filter Change Handler (Controlled Mode)
  const handleFilterChange = (name: string, id: number | null, conditions: FilterCondition[], operators: ('AND' | 'OR')[]) => {
    setActiveFilterName(name);
    setSelectedFilterId(id);
    applyFilterConditions(conditions, operators);
  };

  // Gefilterte und sortierte Rechnungen
  const filteredAndSortedInvoices = useMemo(() => {
    let filtered = invoices;

    // Globale Suche
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(invoice => 
        invoice.invoiceNumber.toLowerCase().includes(searchLower) ||
        invoice.client.name.toLowerCase().includes(searchLower) ||
        (invoice.client.company && invoice.client.company.toLowerCase().includes(searchLower)) ||
        `${invoice.user.firstName} ${invoice.user.lastName}`.toLowerCase().includes(searchLower)
      );
    }

    // Erweiterte Filter anwenden mit zentraler Filter-Logik
    if (filterConditions.length > 0) {
      // Column-Evaluatoren für Invoices (exakt gleiche Logik wie vorher)
      const columnEvaluators: any = {
        'client': (invoice: ConsultationInvoice, cond: FilterCondition) => {
          const clientName = invoice.client.name.toLowerCase();
          const value = (cond.value as string || '').toLowerCase();
          if (cond.operator === 'contains') return clientName.includes(value);
          if (cond.operator === 'equals') return invoice.client.name === cond.value;
          return null;
        },
        'status': (invoice: ConsultationInvoice, cond: FilterCondition) => {
          if (cond.operator === 'equals') return invoice.status === cond.value;
          return null;
        },
        'total': (invoice: ConsultationInvoice, cond: FilterCondition) => {
          const amount = invoice.total;
          const compareValue = parseFloat(cond.value as string);
          if (isNaN(compareValue)) return false;
          if (cond.operator === 'greaterThan') return amount > compareValue;
          if (cond.operator === 'lessThan') return amount < compareValue;
          if (cond.operator === 'equals') return Math.abs(amount - compareValue) < 0.01;
          return null;
        }
      };

      const getFieldValue = (invoice: ConsultationInvoice, columnId: string): any => {
        switch (columnId) {
          case 'client': return invoice.client.name;
          case 'status': return invoice.status;
          case 'total': return invoice.total;
          default: return (invoice as any)[columnId];
        }
      };

      filtered = applyFilters(
        filtered,
        filterConditions,
        filterLogicalOperators,
        getFieldValue,
        columnEvaluators
      );
    }

    // Sortierung
    if (viewMode === 'cards') {
      // Multi-Sortierung für Cards-Mode
      const sortableColumns = cardMetadataOrder.filter(colId => visibleCardMetadata.has(colId));
      
      filtered.sort((a, b) => {
        for (const columnId of sortableColumns) {
          const direction = cardSortDirections[columnId] || 'asc';
          let valueA: any, valueB: any;
          
          switch (columnId) {
            case 'invoiceNumber':
              valueA = a.invoiceNumber.toLowerCase();
              valueB = b.invoiceNumber.toLowerCase();
              break;
            case 'client':
              valueA = a.client.name.toLowerCase();
              valueB = b.client.name.toLowerCase();
              break;
            case 'issueDate':
              valueA = new Date(a.issueDate).getTime();
              valueB = new Date(b.issueDate).getTime();
              break;
            case 'dueDate':
              valueA = new Date(a.dueDate).getTime();
              valueB = new Date(b.dueDate).getTime();
              break;
            case 'total':
              valueA = Number(a.total);
              valueB = Number(b.total);
              break;
            case 'status':
              valueA = a.status.toLowerCase();
              valueB = b.status.toLowerCase();
              break;
            default:
              continue; // Überspringe unbekannte Spalten
          }
          
          // Vergleich basierend auf Typ
          let comparison = 0;
          if (typeof valueA === 'number' && typeof valueB === 'number') {
            comparison = valueA - valueB;
          } else {
            comparison = String(valueA).localeCompare(String(valueB));
          }
          
          // Sortierrichtung anwenden
          if (direction === 'desc') {
            comparison = -comparison;
          }
          
          // Wenn unterschiedlich, gebe Vergleich zurück
          if (comparison !== 0) {
            return comparison;
          }
        }
        return 0; // Alle Spalten identisch
      });
    } else {
      // Tabellen-Mode: Einzel-Sortierung wie bisher
      filtered.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortConfig.key) {
          case 'issueDate':
            aValue = new Date(a.issueDate).getTime();
            bValue = new Date(b.issueDate).getTime();
            break;
          case 'dueDate':
            aValue = new Date(a.dueDate).getTime();
            bValue = new Date(b.dueDate).getTime();
            break;
          case 'client.name':
            aValue = a.client.name;
            bValue = b.client.name;
            break;
          case 'total':
            aValue = a.total;
            bValue = b.total;
            break;
          case 'invoiceNumber':
            aValue = a.invoiceNumber;
            bValue = b.invoiceNumber;
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [invoices, searchTerm, filterConditions, filterLogicalOperators, sortConfig, viewMode, cardMetadataOrder, visibleCardMetadata, cardSortDirections]);

  const renderSortableHeader = (columnId: string, label: string, sortKey?: SortConfig['key']) => (
    <th
      key={columnId}
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none"
      onClick={() => sortKey && handleSort(sortKey)}
    >
      <div className="flex items-center space-x-1">
        <span>{label}</span>
        {sortKey && sortConfig.key === sortKey && (
          <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
        )}
      </div>
    </th>
  );

  if (loading && invoices.length === 0) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  // Prüfe Berechtigungen
  if (!canViewInvoices) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
              Keine Berechtigung
            </h3>
            <div className="mt-2 text-sm text-red-700 dark:text-red-300">
              <p>Sie haben keine Berechtigung, Rechnungen anzuzeigen.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Beratungsrechnungen
        </h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsFilterModalOpen(true)}
            className={`p-2 rounded-md ${
              filterConditions.length > 0
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            } hover:bg-gray-200 dark:hover:bg-gray-600 relative`}
            title="Filter"
          >
            <FunnelIcon className="h-5 w-5" />
            {filterConditions.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 dark:bg-blue-500 text-white rounded-full text-xs flex items-center justify-center">
                {filterConditions.length}
              </span>
            )}
          </button>
          {/* View-Mode Toggle */}
          <button
            type="button"
            className={`p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 ${
              viewMode === 'cards' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : ''
            }`}
            onClick={() => updateViewMode(viewMode === 'table' ? 'cards' : 'table')}
            title={viewMode === 'table' ? t('common.viewAsCards') : t('common.viewAsTable')}
          >
            {viewMode === 'table' ? (
              <Squares2X2Icon className="h-5 w-5" />
            ) : (
              <TableCellsIcon className="h-5 w-5" />
            )}
          </button>
          
          <button
            onClick={() => setIsColumnConfigOpen(true)}
            className="p-2 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
            title={viewMode === 'cards' ? t('tableColumn.sortAndDisplay') : t('tableColumn.configure')}
          >
            <ArrowsUpDownIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Suchfeld */}
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="Rechnungen durchsuchen..."
        />
      </div>

      {/* Gespeicherte Filter */}
      <SavedFilterTags
        tableId={INVOICES_TABLE_ID}
        onSelectFilter={applyFilterConditions}
        onReset={resetFilterConditions}
        activeFilterName={activeFilterName}
        selectedFilterId={selectedFilterId}
        onFilterChange={handleFilterChange}
      />

      {/* Tabelle oder Cards */}
      {error ? (
        <div className="text-center text-red-600 dark:text-red-400 py-6">
          {error}
        </div>
      ) : viewMode === 'table' ? (
        /* Tabellen-Ansicht */
        <div className="dashboard-invoices-wrapper overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {settings.columnOrder
                  .filter(columnId => isColumnVisible(columnId))
                  .map(columnId => {
                    const column = availableColumns.find(col => col.id === columnId);
                    if (!column) return null;
                    
                    switch (columnId) {
                      case 'expand':
                        return (
                          <th key="expand" className="px-6 py-3 text-left w-12">
                            {/* Leerer Header für Expand-Spalte */}
                          </th>
                        );
                      case 'invoiceNumber':
                        return renderSortableHeader('invoiceNumber', column.label, 'invoiceNumber');
                      case 'client':
                        return renderSortableHeader('client', column.label, 'client.name');
                      case 'issueDate':
                        return renderSortableHeader('issueDate', column.label, 'issueDate');
                      case 'dueDate':
                        return renderSortableHeader('dueDate', column.label, 'dueDate');
                      case 'total':
                        return renderSortableHeader('total', column.label, 'total');
                      case 'status':
                        return renderSortableHeader('status', column.label, 'status');
                      default:
                        return renderSortableHeader(columnId, column.label);
                    }
                  })}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredAndSortedInvoices.map((invoice) => (
                <React.Fragment key={invoice.id}>
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    {isColumnVisible('expand') && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleExpanded(invoice.id)}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          title={expandedRows.has(invoice.id) ? 'Einklappen' : 'Ausklappen'}
                        >
                          <ChevronDownIcon 
                            className={`h-4 w-4 transition-transform ${
                              expandedRows.has(invoice.id) ? 'rotate-180' : ''
                            }`} 
                          />
                        </button>
                      </td>
                    )}

                    {isColumnVisible('invoiceNumber') && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-200">
                        {invoice.invoiceNumber}
                      </td>
                    )}
                    
                    {isColumnVisible('client') && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                        <div>
                          <div className="font-medium">{invoice.client.name}</div>
                          {invoice.client.company && (
                            <div className="text-gray-500 dark:text-gray-400 text-xs">
                              {invoice.client.company}
                            </div>
                          )}
                        </div>
                      </td>
                    )}
                    
                    {isColumnVisible('issueDate') && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                        {format(new Date(invoice.issueDate), 'dd.MM.yyyy', { locale: de })}
                      </td>
                    )}
                    
                    {isColumnVisible('dueDate') && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                        {format(new Date(invoice.dueDate), 'dd.MM.yyyy', { locale: de })}
                      </td>
                    )}
                    
                    {isColumnVisible('total') && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                        {invoice.currency} {Number(invoice.total).toFixed(2)}
                      </td>
                    )}
                    
                    {isColumnVisible('status') && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(invoice.status)}
                      </td>
                    )}
                    
                    {isColumnVisible('actions') && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => openEditSidepane(invoice)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                            title={t('common.edit')}
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          {canDownloadInvoices && (
                            <button
                              onClick={() => handleDownloadPdf(invoice.id, invoice.invoiceNumber)}
                              className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                              title="PDF herunterladen"
                            >
                              <DocumentArrowDownIcon className="h-5 w-5" />
                            </button>
                          )}
                          {canEditInvoices && invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
                            <button
                              onClick={() => handleMarkAsPaid(invoice.id)}
                              className="text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-300"
                              title="Als bezahlt markieren"
                            >
                              <CurrencyDollarIcon className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>

                  {/* Erweiterte Details-Zeile */}
                  {expandedRows.has(invoice.id) && (
                    <tr className="bg-gray-50 dark:bg-gray-900">
                      <td colSpan={settings.columnOrder.filter(col => isColumnVisible(col)).length} className="px-6 py-4">
                        <div className="space-y-4">
                          <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                            Rechnungsdetails & Positionen
                          </h4>
                          
                          {/* Rechnungsinformationen */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Rechnungsnummer
                              </label>
                              <div className="text-sm text-gray-900 dark:text-gray-200">
                                {invoice.invoiceNumber}
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Berater
                              </label>
                              <div className="text-sm text-gray-900 dark:text-gray-200">
                                {invoice.user ? `${invoice.user.firstName} ${invoice.user.lastName}` : 'Unbekannt'}
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Zahlungsbedingungen
                              </label>
                              <div className="text-sm text-gray-900 dark:text-gray-200">
                                {invoice.paymentTerms}
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Untertotal
                              </label>
                              <div className="text-sm text-gray-900 dark:text-gray-200">
                                {invoice.currency} {Number(invoice.subtotal).toFixed(2)}
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                MwSt.
                              </label>
                              <div className="text-sm text-gray-900 dark:text-gray-200">
                                {invoice.vatAmount ? `${invoice.currency} ${Number(invoice.vatAmount).toFixed(2)} (${invoice.vatRate}%)` : 'Keine MwSt.'}
                              </div>
                            </div>
                          </div>

                          {/* Notizen */}
                          {invoice.notes && (
                            <div className="mb-6">
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Notizen
                              </label>
                              <div className="text-sm text-gray-900 dark:text-gray-200 bg-white dark:bg-gray-800 p-3 rounded border">
                                {invoice.notes}
                              </div>
                            </div>
                          )}

                          {/* Rechnungspositionen */}
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <h5 className="text-md font-medium text-gray-900 dark:text-white">
                                Rechnungspositionen ({invoice.items?.length || 0})
                              </h5>
                              <button
                                onClick={() => openEditSidepane(invoice)}
                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                              >
                                <PencilIcon className="h-4 w-4 mr-2" />
                                Positionen bearbeiten
                              </button>
                            </div>
                            
                            {invoice.items && invoice.items.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                  <thead className="bg-gray-100 dark:bg-gray-700">
                                    <tr>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Beschreibung
                                      </th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Menge/Stunden
                                      </th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Stundensatz
                                      </th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Betrag
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {invoice.items.map((item) => (
                                      <tr key={item.id}>
                                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-200">
                                          {item.description}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-200">
                                          {Number(item.quantity).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-200">
                                          {invoice.currency} {Number(item.unitPrice).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-200">
                                          {invoice.currency} {Number(item.amount).toFixed(2)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                                Keine Rechnungspositionen vorhanden
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Card-Ansicht */
        <div className="dashboard-invoices-wrapper">
          {filteredAndSortedInvoices.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
              {t('invoices.noInvoicesFound')}
            </div>
          ) : (
            <CardGrid gap="md">
              {filteredAndSortedInvoices.map((invoice) => {
                const isExpanded = expandedRows.has(invoice.id);

                // Metadaten für Card aufbauen
                const metadata: MetadataItem[] = [];

                if (visibleCardMetadata.has('invoiceNumber')) {
                  metadata.push({
                    label: t('invoices.columns.invoiceNumber'),
                    value: invoice.invoiceNumber,
                    icon: <DocumentArrowDownIcon className="h-4 w-4" />
                  });
                }

                if (visibleCardMetadata.has('client')) {
                  metadata.push({
                    label: t('invoices.columns.client'),
                    value: invoice.client.company 
                      ? `${invoice.client.name} (${invoice.client.company})`
                      : invoice.client.name,
                    icon: <BuildingOfficeIcon className="h-4 w-4" />
                  });
                }

                if (visibleCardMetadata.has('issueDate')) {
                  metadata.push({
                    label: t('invoices.columns.issueDate'),
                    value: format(new Date(invoice.issueDate), 'dd.MM.yyyy', { locale: de }),
                    icon: <CalendarIcon className="h-4 w-4" />
                  });
                }

                if (visibleCardMetadata.has('dueDate')) {
                  metadata.push({
                    label: t('invoices.columns.dueDate'),
                    value: format(new Date(invoice.dueDate), 'dd.MM.yyyy', { locale: de }),
                    icon: <CalendarIcon className="h-4 w-4" />
                  });
                }

                if (visibleCardMetadata.has('total')) {
                  metadata.push({
                    label: t('invoices.columns.total'),
                    value: `${invoice.currency} ${Number(invoice.total).toFixed(2)}`,
                    icon: <CurrencyDollarIcon className="h-4 w-4" />
                  });
                }

                // Status wird über das status-Prop der DataCard angezeigt, nicht als Metadata
                // Status-Konfiguration
                const statusConfig = {
                  DRAFT: { label: t('invoices.status.draft'), color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
                  SENT: { label: t('invoices.status.sent'), color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
                  PAID: { label: t('invoices.status.paid'), color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
                  OVERDUE: { label: t('invoices.status.overdue'), color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
                  CANCELLED: { label: t('invoices.status.cancelled'), color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' }
                };
                const invoiceStatus = statusConfig[invoice.status];

                // Action-Buttons
                const actions = (
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => openEditSidepane(invoice)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      title="Bearbeiten"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    {canDownloadInvoices && (
                      <button
                        onClick={() => handleDownloadPdf(invoice.id, invoice.invoiceNumber)}
                        className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                        title="PDF herunterladen"
                      >
                        <DocumentArrowDownIcon className="h-5 w-5" />
                      </button>
                    )}
                    {canEditInvoices && invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
                      <button
                        onClick={() => handleMarkAsPaid(invoice.id)}
                        className="text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-300"
                        title="Als bezahlt markieren"
                      >
                        <CurrencyDollarIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                );

                // Expandable Content für Details
                const expandableContent = (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      Rechnungsdetails & Positionen
                    </h4>
                    
                    {/* Rechnungsinformationen */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Rechnungsnummer
                        </label>
                        <div className="text-sm text-gray-900 dark:text-gray-200">
                          {invoice.invoiceNumber}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Berater
                        </label>
                        <div className="text-sm text-gray-900 dark:text-gray-200">
                          {invoice.user ? `${invoice.user.firstName} ${invoice.user.lastName}` : 'Unbekannt'}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Zahlungsbedingungen
                        </label>
                        <div className="text-sm text-gray-900 dark:text-gray-200">
                          {invoice.paymentTerms}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Untertotal
                        </label>
                        <div className="text-sm text-gray-900 dark:text-gray-200">
                          {invoice.currency} {Number(invoice.subtotal).toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          MwSt.
                        </label>
                        <div className="text-sm text-gray-900 dark:text-gray-200">
                          {invoice.vatAmount ? `${invoice.currency} ${Number(invoice.vatAmount).toFixed(2)} (${invoice.vatRate}%)` : 'Keine MwSt.'}
                        </div>
                      </div>
                    </div>

                    {/* Notizen */}
                    {invoice.notes && (
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Notizen
                        </label>
                        <div className="text-sm text-gray-900 dark:text-gray-200 bg-white dark:bg-gray-800 p-3 rounded border">
                          {invoice.notes}
                        </div>
                      </div>
                    )}

                    {/* Rechnungspositionen */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="text-md font-medium text-gray-900 dark:text-white">
                          Rechnungspositionen ({invoice.items?.length || 0})
                        </h5>
                        <button
                          onClick={() => openEditSidepane(invoice)}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                        >
                          <PencilIcon className="h-4 w-4 mr-2" />
                          Positionen bearbeiten
                        </button>
                      </div>
                      
                      {invoice.items && invoice.items.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-100 dark:bg-gray-700">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                  Beschreibung
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                  Menge/Stunden
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                  Stundensatz
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                  Betrag
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                              {invoice.items.map((item) => (
                                <tr key={item.id}>
                                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-200">
                                    {item.description}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-200">
                                    {Number(item.quantity).toFixed(2)}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-200">
                                    {invoice.currency} {Number(item.unitPrice).toFixed(2)}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-200">
                                    {invoice.currency} {Number(item.amount).toFixed(2)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                          Keine Rechnungspositionen vorhanden
                        </div>
                      )}
                    </div>
                  </div>
                );

                return (
                  <DataCard
                    key={invoice.id}
                    title={invoice.invoiceNumber}
                    status={{
                      label: invoiceStatus.label,
                      color: invoiceStatus.color
                    }}
                    metadata={metadata}
                    actions={actions}
                    expandable={{
                      isExpanded: isExpanded,
                      content: expandableContent,
                      onToggle: () => toggleExpanded(invoice.id)
                    }}
                  />
                );
              })}
            </CardGrid>
          )}
        </div>
      )}

      {/* Filter Modal */}
      {isFilterModalOpen && (
        <FilterPane
          columns={[
            { id: 'client', label: t('invoices.columns.client') },
            { id: 'status', label: t('invoices.columns.status') },
            { id: 'total', label: `${t('invoices.columns.total')} (CHF)` }
          ]}
          onApply={applyFilterConditions}
          onReset={resetFilterConditions}
          savedConditions={filterConditions}
          savedOperators={filterLogicalOperators}
          tableId={INVOICES_TABLE_ID}
        />
      )}

      {/* Column Config Modal */}
      {isColumnConfigOpen && (
        <TableColumnConfig
          isOpen={isColumnConfigOpen}
          onClose={() => setIsColumnConfigOpen(false)}
          columns={availableColumns}
          columnOrder={settings.columnOrder}
          hiddenColumns={settings.hiddenColumns}
          onToggleVisibility={(columnId) => toggleColumnVisibility(columnId)}
          onReorderColumns={(newOrder) => updateColumnOrder(newOrder)}
        />
      )}

      {/* Detail Modal */}
      {isDetailModalOpen && selectedInvoiceId && (
        <InvoiceDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedInvoiceId(null);
          }}
          invoiceId={selectedInvoiceId}
          onInvoiceUpdated={loadInvoices}
        />
      )}

      {/* Edit Sidepane (nach Tasks & Requests Standard) */}
      {isEditSidepaneOpen && editingInvoice && (
        <div className="fixed inset-0 overflow-hidden z-50" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
          <div className="absolute inset-0 overflow-hidden">
            {/* Backdrop - nur bei <= 1070px */}
            {!isLargeScreen && (
              <div className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity sidepane-overlay sidepane-backdrop" onClick={closeEditSidepane}></div>
            )}
            
            {/* Panel - beginnt unter der Topbar */}
            <div className="fixed top-16 bottom-0 right-0 pl-10 max-w-full flex sidepane-panel sidepane-panel-container" style={{
              transition: 'transform 350ms cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            }}>
              <div className="w-screen max-w-2xl">
                <div className="h-full flex flex-col bg-white dark:bg-gray-800 shadow-xl overflow-y-scroll">
                  {/* Header */}
                  <div className="px-4 py-6 bg-gray-50 dark:bg-gray-700 sm:px-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-medium text-gray-900 dark:text-white" id="slide-over-title">
                        Rechnung bearbeiten: {editingInvoice.invoiceNumber}
                      </h2>
                      <div className="ml-3 h-7 flex items-center">
                        <button
                          type="button"
                          className="bg-gray-50 dark:bg-gray-700 rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          onClick={closeEditSidepane}
                        >
                          <span className="sr-only">Panel schließen</span>
                          <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 px-4 py-6 sm:px-6">
                    <div className="space-y-6">
                      
                      {/* Grundinformationen */}
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                          Grundinformationen
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                              Rechnungsnummer
                            </label>
                            <input
                              type="text"
                              value={editingInvoice.invoiceNumber}
                              disabled
                              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                              Status
                            </label>
                            <select
                              value={editingInvoice.status}
                              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            >
                              <option value="DRAFT">Entwurf</option>
                              <option value="SENT">Gesendet</option>
                              <option value="PAID">Bezahlt</option>
                              <option value="OVERDUE">Überfällig</option>
                              <option value="CANCELLED">Storniert</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                              Rechnungsdatum
                            </label>
                            <input
                              type="date"
                              value={editingInvoice.issueDate.split('T')[0]}
                              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                              Fälligkeitsdatum
                            </label>
                            <input
                              type="date"
                              value={editingInvoice.dueDate.split('T')[0]}
                              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Notizen */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Notizen
                        </label>
                        <textarea
                          rows={3}
                          value={editingInvoice.notes || ''}
                          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          placeholder="Zusätzliche Notizen zur Rechnung..."
                        />
                      </div>

                      {/* Rechnungspositionen */}
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                            Rechnungspositionen
                          </h3>
                          <button
                            type="button"
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            <PlusIcon className="h-4 w-4 mr-2" />
                            Position hinzufügen
                          </button>
                        </div>

                        <div className="space-y-3">
                          {editingInvoice.items?.map((item, index) => (
                            <div key={item.id || index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                <div className="sm:col-span-2">
                                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                                    Beschreibung
                                  </label>
                                  <input
                                    type="text"
                                    value={item.description}
                                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                                    Stunden
                                  </label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={item.quantity}
                                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                                    Stundensatz
                                  </label>
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={item.unitPrice}
                                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                    />
                                    <button
                                      type="button"
                                      className="mt-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                      title="Position löschen"
                                    >
                                      <TrashIcon className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                              <div className="mt-2 text-right">
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                  Betrag: {editingInvoice.currency} {Number(item.amount).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Totals */}
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Untertotal:</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {editingInvoice.currency} {Number(editingInvoice.subtotal).toFixed(2)}
                            </span>
                          </div>
                          {editingInvoice.vatAmount && (
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                MwSt. ({editingInvoice.vatRate}%):
                              </span>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {editingInvoice.currency} {Number(editingInvoice.vatAmount).toFixed(2)}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-600">
                            <span className="text-base font-medium text-gray-900 dark:text-white">Total:</span>
                            <span className="text-base font-bold text-gray-900 dark:text-white">
                              {editingInvoice.currency} {Number(editingInvoice.total).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex-shrink-0 px-4 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                        onClick={closeEditSidepane}
                        title="Abbrechen"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-800"
                        title="Speichern"
                      >
                        <CheckIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceManagementTab; 
import React, { useState, useEffect, useMemo } from 'react';
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowsUpDownIcon,
  DocumentArrowDownIcon,
  EyeIcon,
  PlusIcon,
  CurrencyDollarIcon
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
import { toast } from 'react-toastify';

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
  key: keyof ConsultationInvoice | 'client.name' | 'user.name';
  direction: 'asc' | 'desc';
}

// Verfügbare Spalten
const availableColumns = [
  { id: 'invoiceNumber', label: 'Rechnungsnummer', shortLabel: 'Nr.' },
  { id: 'client', label: 'Kunde', shortLabel: 'Kunde' },
  { id: 'issueDate', label: 'Rechnungsdatum', shortLabel: 'Datum' },
  { id: 'dueDate', label: 'Fälligkeitsdatum', shortLabel: 'Fällig' },
  { id: 'total', label: 'Betrag', shortLabel: 'Betrag' },
  { id: 'status', label: 'Status', shortLabel: 'Status' },
  { id: 'user', label: 'Berater', shortLabel: 'Berater' },
  { id: 'actions', label: 'Aktionen', shortLabel: 'Akt.' }
];

const defaultColumnOrder = availableColumns.map(col => col.id);
const INVOICES_TABLE_ID = 'invoice-management';

const getStatusBadge = (status: ConsultationInvoice['status']) => {
  const statusConfig = {
    DRAFT: { label: 'Entwurf', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
    SENT: { label: 'Gesendet', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
    PAID: { label: 'Bezahlt', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
    OVERDUE: { label: 'Überfällig', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
    CANCELLED: { label: 'Storniert', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' }
  };

  const config = statusConfig[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
};

const InvoiceManagementTab: React.FC = () => {
  const { hasPermission } = usePermissions();
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
  
  // Detail Modal State
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
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
    isColumnVisible
  } = useTableSettings(INVOICES_TABLE_ID, {
    defaultColumnOrder,
    defaultHiddenColumns: []
  });

  const [isColumnConfigOpen, setIsColumnConfigOpen] = useState(false);

  useEffect(() => {
    loadInvoices();
  }, []);

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

  const handleShowDetails = (invoiceId: number) => {
    setSelectedInvoiceId(invoiceId);
    setIsDetailModalOpen(true);
  };

  // Filter-Funktionen
  const applyFilterConditions = (conditions: FilterCondition[], operators: ('AND' | 'OR')[]) => {
    setFilterConditions(conditions);
    setFilterLogicalOperators(operators);
  };

  const resetFilterConditions = () => {
    setFilterConditions([]);
    setFilterLogicalOperators([]);
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

    // Erweiterte Filter anwenden
    if (filterConditions.length > 0) {
      filtered = filtered.filter(invoice => {
        let result = true;
        
        for (let i = 0; i < filterConditions.length; i++) {
          const condition = filterConditions[i];
          let conditionMet = false;
          
          switch (condition.column) {
            case 'client':
              const clientName = invoice.client.name;
              if (condition.operator === 'contains') {
                conditionMet = clientName.toLowerCase().includes((condition.value as string || '').toLowerCase());
              } else if (condition.operator === 'equals') {
                conditionMet = clientName === condition.value;
              }
              break;
              
            case 'status':
              if (condition.operator === 'equals') {
                conditionMet = invoice.status === condition.value;
              }
              break;
              
            case 'total':
              const amount = invoice.total;
              const compareValue = parseFloat(condition.value as string);
              
              if (condition.operator === 'greaterThan') {
                conditionMet = amount > compareValue;
              } else if (condition.operator === 'lessThan') {
                conditionMet = amount < compareValue;
              } else if (condition.operator === 'equals') {
                conditionMet = Math.abs(amount - compareValue) < 0.01;
              }
              break;
          }
          
          // Logische Verknüpfung
          if (i === 0) {
            result = conditionMet;
          } else {
            const operator = filterLogicalOperators[i - 1];
            if (operator === 'AND') {
              result = result && conditionMet;
            } else {
              result = result || conditionMet;
            }
          }
        }
        
        return result;
      });
    }

    // Sortierung
    const sorted = [...filtered].sort((a, b) => {
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
        case 'user.name':
          aValue = `${a.user.firstName} ${a.user.lastName}`;
          bValue = `${b.user.firstName} ${b.user.lastName}`;
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

    return sorted;
  }, [invoices, searchTerm, filterConditions, filterLogicalOperators, sortConfig]);

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
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            } hover:bg-gray-200 dark:hover:bg-gray-600`}
            title="Filter"
          >
            <FunnelIcon className="h-5 w-5" />
            {filterConditions.length > 0 && (
              <span className="ml-1 text-xs">{filterConditions.length}</span>
            )}
          </button>
          <button
            onClick={() => setIsColumnConfigOpen(true)}
            className="p-2 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
            title="Spalten konfigurieren"
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
        onApplyFilter={(filter) => {
          const conditions = JSON.parse(filter.conditions);
          const operators = JSON.parse(filter.operators);
          applyFilterConditions(conditions, operators);
        }}
      />

      {/* Tabelle */}
      {error ? (
        <div className="text-center text-red-600 dark:text-red-400 py-6">
          {error}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {settings.columnOrder
                  .filter(columnId => isColumnVisible(columnId))
                  .map(columnId => {
                    const column = availableColumns.find(col => col.id === columnId);
                    if (!column) return null;
                    
                    switch (columnId) {
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
                      case 'user':
                        return renderSortableHeader('user', column.label, 'user.name');
                      default:
                        return renderSortableHeader(columnId, column.label);
                    }
                  })}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredAndSortedInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
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
                  
                  {isColumnVisible('user') && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                      {invoice.user ? `${invoice.user.firstName} ${invoice.user.lastName}` : 'Unbekannt'}
                    </td>
                  )}
                  
                  {isColumnVisible('actions') && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {canDownloadInvoices && (
                          <button
                            onClick={() => handleDownloadPdf(invoice.id, invoice.invoiceNumber)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                            title="PDF herunterladen"
                          >
                            <DocumentArrowDownIcon className="h-5 w-5" />
                          </button>
                        )}
                        {canViewInvoices && (
                          <button
                            onClick={() => handleShowDetails(invoice.id)}
                            className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
                            title="Details anzeigen"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </button>
                        )}
                        {canEditInvoices && invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
                          <button
                            onClick={() => handleMarkAsPaid(invoice.id)}
                            className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                            title="Als bezahlt markieren"
                          >
                            <CurrencyDollarIcon className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Filter Modal */}
      {isFilterModalOpen && (
        <FilterPane
          isOpen={isFilterModalOpen}
          onClose={() => setIsFilterModalOpen(false)}
          onApply={applyFilterConditions}
          onReset={resetFilterConditions}
          availableColumns={[
            { id: 'client', label: 'Kunde' },
            { id: 'status', label: 'Status' },
            { id: 'total', label: 'Betrag (CHF)' }
          ]}
          tableId={INVOICES_TABLE_ID}
          initialConditions={filterConditions}
          initialOperators={filterLogicalOperators}
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
    </div>
  );
};

export default InvoiceManagementTab; 
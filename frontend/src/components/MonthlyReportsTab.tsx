import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { 
  DocumentArrowDownIcon, 
  TrashIcon, 
  PlusIcon,
  EyeIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  CalendarIcon,
  Squares2X2Icon,
  TableCellsIcon,
  BuildingOfficeIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import axiosInstance from '../config/axios.ts';
import { API_ENDPOINTS } from '../config/api.ts';
import { toast } from 'react-toastify';
import { MonthlyConsultationReport, UnbilledConsultationsCheck } from '../types/monthlyConsultationReport.ts';
import { calculateDuration } from '../utils/dateUtils.ts';
import { useSidepane } from '../contexts/SidepaneContext.tsx';
import { useTableSettings } from '../hooks/useTableSettings.ts';
import DataCard, { MetadataItem } from './shared/DataCard.tsx';
import CardGrid from './shared/CardGrid.tsx';

interface MonthlyReportsTabProps {
  selectedReportId?: number | null;
}

// Standardreihenfolge der Spalten (IDs)
const defaultColumnOrder = ['expand', 'reportNumber', 'period', 'recipient', 'totalHours', 'status', 'actions'];
const MONTHLY_REPORTS_TABLE_ID = 'monthly-reports-table';

// Card-Einstellungen Standardwerte
const defaultCardMetadata = ['reportNumber', 'period', 'recipient', 'totalHours', 'status'];
const defaultCardColumnOrder = ['reportNumber', 'period', 'recipient', 'totalHours', 'status'];
const defaultCardSortDirections: Record<string, 'asc' | 'desc'> = {
  reportNumber: 'asc',
  period: 'desc',
  recipient: 'asc',
  totalHours: 'desc',
  status: 'asc'
};

// Mapping zwischen Tabellen-Spalten-IDs und Card-Metadaten-IDs
const tableToCardMapping: Record<string, string[]> = {
  'expand': [], // Keine Card-Entsprechung
  'reportNumber': ['reportNumber'],
  'period': ['period'],
  'recipient': ['recipient'],
  'totalHours': ['totalHours'],
  'status': ['status'],
  'actions': [] // Keine Card-Entsprechung
};

// Reverse Mapping: Card-Metadaten -> Tabellen-Spalten
const cardToTableMapping: Record<string, string> = {
  'reportNumber': 'reportNumber',
  'period': 'period',
  'recipient': 'recipient',
  'totalHours': 'totalHours',
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

const MonthlyReportsTab: React.FC<MonthlyReportsTabProps> = ({ selectedReportId }) => {
  const { t } = useTranslation();
  const { openSidepane, closeSidepane } = useSidepane();
  
  // Definition der verfügbaren Spalten (dynamisch aus Übersetzungen)
  const availableColumns = useMemo(() => [
    { id: 'expand', label: '', shortLabel: '' }, // Expand-Button Spalte
    { id: 'reportNumber', label: t('analytics.monthlyReports.columns.reportNumber'), shortLabel: t('analytics.monthlyReports.shortLabels.reportNumber') },
    { id: 'period', label: t('analytics.monthlyReports.columns.period'), shortLabel: t('analytics.monthlyReports.shortLabels.period') },
    { id: 'recipient', label: t('analytics.monthlyReports.columns.recipient'), shortLabel: t('analytics.monthlyReports.shortLabels.recipient') },
    { id: 'totalHours', label: t('analytics.monthlyReports.columns.totalHours'), shortLabel: t('analytics.monthlyReports.shortLabels.totalHours') },
    { id: 'status', label: t('analytics.monthlyReports.columns.status'), shortLabel: t('analytics.monthlyReports.shortLabels.status') },
    { id: 'actions', label: t('analytics.monthlyReports.columns.actions'), shortLabel: t('analytics.monthlyReports.shortLabels.actions') }
  ], [t]);
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth > 1070);
  const [reports, setReports] = useState<MonthlyConsultationReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [unbilledCheck, setUnbilledCheck] = useState<UnbilledConsultationsCheck | null>(null);
  const selectedReportRef = useRef<HTMLTableRowElement>(null);
  
  // Expand/Collapse States (nach Tasks & Requests Standard)
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Table Settings
  const {
    settings,
    isLoading: isLoadingSettings,
    updateColumnOrder,
    updateHiddenColumns,
    toggleColumnVisibility,
    isColumnVisible,
    updateViewMode
  } = useTableSettings(MONTHLY_REPORTS_TABLE_ID, {
    defaultColumnOrder,
    defaultHiddenColumns: [],
    defaultViewMode: 'cards'
  });

  // View-Mode aus Settings laden
  const viewMode = settings.viewMode || 'cards';
  
  // Lokale Sortierrichtungen für Cards (nicht persistiert)
  const [cardSortDirections, setCardSortDirections] = useState<Record<string, 'asc' | 'desc'>>(() => {
    return defaultCardSortDirections;
  });

  // Abgeleitete Werte für Card-Ansicht aus Tabellen-Settings
  const cardMetadataOrder = React.useMemo(() => {
    return getCardMetadataFromColumnOrder(settings.columnOrder || defaultColumnOrder);
  }, [settings.columnOrder]);

  // Versteckte Card-Metadaten aus hiddenColumns ableiten
  const hiddenCardMetadata = React.useMemo(() => {
    return getHiddenCardMetadata(settings.hiddenColumns || []);
  }, [settings.hiddenColumns]);

  // Sichtbare Card-Metadaten (alle Card-Metadaten minus versteckte)
  const visibleCardMetadata = React.useMemo(() => {
    return new Set(cardMetadataOrder.filter(meta => !hiddenCardMetadata.has(meta)));
  }, [cardMetadataOrder, hiddenCardMetadata]);

  // CSS-Klasse für Container-Box setzen (für CSS-basierte Schattierungs-Entfernung)
  useEffect(() => {
    const wrapper = document.querySelector('.dashboard-monthly-reports-wrapper');
    if (wrapper) {
      if (viewMode === 'cards') {
        wrapper.classList.add('cards-mode');
      } else {
        wrapper.classList.remove('cards-mode');
      }
    }
  }, [viewMode]);

  // Sortierte Reports für Cards-Mode
  const sortedReports = React.useMemo(() => {
    if (viewMode === 'cards') {
      const sorted = [...reports];
      const sortableColumns = cardMetadataOrder.filter(colId => visibleCardMetadata.has(colId));
      
      sorted.sort((a, b) => {
        for (const columnId of sortableColumns) {
          const direction = cardSortDirections[columnId] || 'asc';
          let valueA: any, valueB: any;
          
          switch (columnId) {
            case 'reportNumber':
              valueA = a.reportNumber.toLowerCase();
              valueB = b.reportNumber.toLowerCase();
              break;
            case 'period':
              valueA = new Date(a.periodStart).getTime();
              valueB = new Date(b.periodStart).getTime();
              break;
            case 'recipient':
              valueA = a.recipient.toLowerCase();
              valueB = b.recipient.toLowerCase();
              break;
            case 'totalHours':
              valueA = Number(a.totalHours);
              valueB = Number(b.totalHours);
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
      
      return sorted;
    }
    return reports;
  }, [reports, viewMode, cardMetadataOrder, visibleCardMetadata, cardSortDirections]);
  
  // Sidepane States - Ersetzt durch Client-Beratungen-Sidepane
  const [isClientConsultationsSidepaneOpen, setIsClientConsultationsSidepaneOpen] = useState(false);
  const [editingClientId, setEditingClientId] = useState<number | null>(null);
  const [editingClientName, setEditingClientName] = useState<string>('');
  const [clientConsultations, setClientConsultations] = useState<any[]>([]);
  const [loadingConsultations, setLoadingConsultations] = useState(false);

  useEffect(() => {
    loadReports();
    checkUnbilledConsultations();
  }, []);

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
    if (isClientConsultationsSidepaneOpen) {
      openSidepane();
    } else {
      closeSidepane();
    }
    
    return () => {
      closeSidepane();
    };
  }, [isClientConsultationsSidepaneOpen, openSidepane, closeSidepane]);

  // Auto-scroll to selected report
  useEffect(() => {
    if (selectedReportId && reports.length > 0 && selectedReportRef.current) {
      selectedReportRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Highlight the row temporarily
      selectedReportRef.current.style.backgroundColor = '#dbeafe';
      setTimeout(() => {
        if (selectedReportRef.current) {
          selectedReportRef.current.style.backgroundColor = '';
        }
      }, 2000);
    }
  }, [selectedReportId, reports]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(API_ENDPOINTS.MONTHLY_CONSULTATION_REPORTS.BASE);
      setReports(response.data);
    } catch (error: any) {
      console.error('Fehler beim Laden der Monatsberichte:', error);
      toast.error('Fehler beim Laden der Monatsberichte');
    } finally {
      setLoading(false);
    }
  };

  const checkUnbilledConsultations = async () => {
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.MONTHLY_CONSULTATION_REPORTS.CHECK_UNBILLED);
      setUnbilledCheck(response.data);
    } catch (error) {
      console.error('Fehler beim Prüfen der nicht-abgerechneten Beratungen:', error);
    }
  };

  const handleGenerateReport = async () => {
    console.log('DEBUG: handleGenerateReport called');
    try {
      const response = await axiosInstance.post(API_ENDPOINTS.MONTHLY_CONSULTATION_REPORTS.GENERATE_AUTOMATIC);
      console.log('DEBUG: API response:', response);
      await loadReports();
      toast.success('Monatsbericht erfolgreich erstellt');
    } catch (error: any) {
      console.error('DEBUG: Error generating report:', error);
      console.log('DEBUG: Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      toast.error(error.response?.data?.message || 'Fehler beim Erstellen des Monatsberichts');
    }
  };

  const downloadPDF = async (report: MonthlyConsultationReport) => {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.MONTHLY_CONSULTATION_REPORTS.PDF(report.id),
        { responseType: 'blob' }
      );
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${report.reportNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Fehler beim Download des PDFs');
    }
  };

  const deleteReport = async (reportId: number) => {
    if (!window.confirm('Möchten Sie diesen Monatsbericht wirklich löschen?')) {
      return;
    }

    try {
      await axiosInstance.delete(API_ENDPOINTS.MONTHLY_CONSULTATION_REPORTS.BY_ID(reportId));
      setReports(prev => prev.filter(r => r.id !== reportId));
      toast.success('Monatsbericht gelöscht');
      checkUnbilledConsultations();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Fehler beim Löschen des Monatsberichts');
    }
  };

  // Expand/Collapse Handler (nach Tasks & Requests Standard)
  const toggleExpanded = (reportId: number) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reportId)) {
        newSet.delete(reportId);
      } else {
        newSet.add(reportId);
      }
      return newSet;
    });
  };

  // Ersetzt openEditSidepane - wird nicht mehr benötigt
  const openClientConsultationsSidepane = async (clientId: number, clientName: string, reportId: number) => {
    setEditingClientId(clientId);
    setEditingClientName(clientName);
    setIsClientConsultationsSidepaneOpen(true);
    
    // Lade die Beratungen für diesen Client im Berichtszeitraum
    await loadClientConsultations(clientId, reportId);
  };

  const closeClientConsultationsSidepane = () => {
    setIsClientConsultationsSidepaneOpen(false);
    setEditingClientId(null);
    setEditingClientName('');
    setClientConsultations([]);
  };

  const loadClientConsultations = async (clientId: number, reportId: number) => {
    try {
      setLoadingConsultations(true);
      // Hole die Report-Details um den Zeitraum zu bekommen
      const report = reports.find(r => r.id === reportId);
      if (!report) return;

      const response = await axiosInstance.get(`${API_ENDPOINTS.CONSULTATIONS.BASE}?clientId=${clientId}&from=${report.periodStart}&to=${report.periodEnd}`);
      setClientConsultations(response.data);
    } catch (error) {
      console.error('Fehler beim Laden der Client-Beratungen:', error);
      toast.error('Fehler beim Laden der Beratungen');
    } finally {
      setLoadingConsultations(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'GENERATED':
        return <ClockIcon className="h-5 w-5 text-blue-500" />;
      case 'SENT':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'ARCHIVED':
        return <EyeIcon className="h-5 w-5 text-gray-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'GENERATED':
        return 'Erstellt';
      case 'SENT':
        return 'Versendet';
      case 'ARCHIVED':
        return 'Archiviert';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Monatsabrechnungen
        </h2>
      </div>

      {/* Unbilled Consultations Warning */}
      {unbilledCheck?.hasUnbilledConsultations && (
        <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-3" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Nicht-abgerechnete Beratungen gefunden
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                Sie haben {unbilledCheck.count} nicht-abgerechnete Beratungen. 
                Erstellen Sie einen Monatsbericht für diese Zeiträume.
              </p>
              <button
                onClick={handleGenerateReport}
                disabled={generating}
                className="mt-3 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-yellow-800 dark:text-yellow-200 bg-yellow-100 dark:bg-yellow-800 hover:bg-yellow-200 dark:hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                {generating ? 'Erstelle...' : 'Monatsbericht erstellen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reports List */}
      {viewMode === 'table' ? (
        /* Tabellen-Ansicht */
        <div className="dashboard-monthly-reports-wrapper bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left w-12">
                {/* Expand-Button Spalte */}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Berichtsnummer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Zeitraum
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Empfänger
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Stunden
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {reports.map((report) => (
              <React.Fragment key={report.id}>
                <tr 
                  className="hover:bg-gray-50 dark:hover:bg-gray-700" 
                  ref={selectedReportId === report.id ? selectedReportRef : null}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleExpanded(report.id)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      title={expandedRows.has(report.id) ? 'Einklappen' : 'Ausklappen'}
                    >
                      <ChevronDownIcon 
                        className={`h-4 w-4 transition-transform ${
                          expandedRows.has(report.id) ? 'rotate-180' : ''
                        }`} 
                      />
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {report.reportNumber}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {format(new Date(report.generatedAt), 'dd.MM.yyyy HH:mm', { locale: de })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {format(new Date(report.periodStart), 'dd.MM.yyyy', { locale: de })} - {' '}
                    {format(new Date(report.periodEnd), 'dd.MM.yyyy', { locale: de })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {report.recipient}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {Number(report.totalHours).toFixed(2)} h
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(report.status)}
                      <span className="ml-2 text-sm text-gray-900 dark:text-white">
                        {getStatusText(report.status)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => downloadPDF(report)}
                        className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                        title="PDF herunterladen"
                      >
                        <DocumentArrowDownIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>

                {/* Erweiterte Details-Zeile */}
                {expandedRows.has(report.id) && (
                  <tr className="bg-gray-50 dark:bg-gray-900">
                    <td colSpan={7} className="px-6 py-4">
                      <div className="space-y-4">
                        {/* Abrechnungspositionen - Ohne Detail-Informationen darüber */}
                        <div>
                          <h5 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                            Abrechnungspositionen ({report.items?.length || 0})
                          </h5>
                          
                          {report.items && report.items.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-100 dark:bg-gray-700">
                                  <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                      Client
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                      Anzahl Beratungen
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                      Stunden
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                      Aktionen
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                  {report.items.map((item) => (
                                    <tr key={item.id}>
                                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-200">
                                        {item.clientName}
                                      </td>
                                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-200">
                                        {item.consultationCount}
                                      </td>
                                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-200 font-semibold">
                                        {Number(item.totalHours).toFixed(2)} h
                                      </td>
                                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-200">
                                        <button
                                          onClick={() => openClientConsultationsSidepane(item.clientId, item.clientName, report.id)}
                                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                          title="Beratungen bearbeiten"
                                        >
                                          <PencilIcon className="h-4 w-4" />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                              Keine Abrechnungspositionen vorhanden
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
        <div className="dashboard-monthly-reports-wrapper">
          {sortedReports.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
              Keine Monatsberichte gefunden
            </div>
          ) : (
            <CardGrid gap="md">
              {sortedReports.map((report) => {
                const isExpanded = expandedRows.has(report.id);

                // Metadaten für Card aufbauen
                const metadata: MetadataItem[] = [];

                if (visibleCardMetadata.has('reportNumber')) {
                  metadata.push({
                    label: 'Berichtsnummer',
                    value: report.reportNumber,
                    icon: <DocumentArrowDownIcon className="h-4 w-4" />
                  });
                }

                if (visibleCardMetadata.has('period')) {
                  metadata.push({
                    label: 'Zeitraum',
                    value: `${format(new Date(report.periodStart), 'dd.MM.yyyy', { locale: de })} - ${format(new Date(report.periodEnd), 'dd.MM.yyyy', { locale: de })}`,
                    icon: <CalendarIcon className="h-4 w-4" />
                  });
                }

                if (visibleCardMetadata.has('recipient')) {
                  metadata.push({
                    label: 'Empfänger',
                    value: report.recipient,
                    icon: <BuildingOfficeIcon className="h-4 w-4" />
                  });
                }

                if (visibleCardMetadata.has('totalHours')) {
                  metadata.push({
                    label: 'Stunden',
                    value: `${Number(report.totalHours).toFixed(2)} h`,
                    icon: <ClockIcon className="h-4 w-4" />
                  });
                }

                // Status-Konfiguration
                const statusConfig = {
                  GENERATED: { label: 'Erstellt', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
                  SENT: { label: 'Versendet', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
                  ARCHIVED: { label: 'Archiviert', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' }
                };
                const reportStatus = statusConfig[report.status];

                // Action-Buttons
                const actions = (
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => downloadPDF(report)}
                      className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                      title="PDF herunterladen"
                    >
                      <DocumentArrowDownIcon className="h-5 w-5" />
                    </button>
                  </div>
                );

                // Expandable Content für Details
                const expandableContent = (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h5 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                      Abrechnungspositionen ({report.items?.length || 0})
                    </h5>
                    
                    {report.items && report.items.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gray-100 dark:bg-gray-700">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Client
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Anzahl Beratungen
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Stunden
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Aktionen
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {report.items.map((item) => (
                              <tr key={item.id}>
                                <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-200">
                                  {item.clientName}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-200">
                                  {item.consultationCount}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-200 font-semibold">
                                  {Number(item.totalHours).toFixed(2)} h
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-200">
                                  <button
                                    onClick={() => openClientConsultationsSidepane(item.clientId, item.clientName, report.id)}
                                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                    title="Beratungen bearbeiten"
                                  >
                                    <PencilIcon className="h-4 w-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                        Keine Abrechnungspositionen vorhanden
                      </div>
                    )}
                  </div>
                );

                return (
                  <DataCard
                    key={report.id}
                    title={report.reportNumber}
                    subtitle={format(new Date(report.generatedAt), 'dd.MM.yyyy HH:mm', { locale: de })}
                    status={{
                      label: reportStatus.label,
                      color: reportStatus.color
                    }}
                    metadata={metadata}
                    actions={actions}
                    expandable={{
                      isExpanded: isExpanded,
                      content: expandableContent,
                      onToggle: () => toggleExpanded(report.id)
                    }}
                  />
                );
              })}
            </CardGrid>
          )}
        </div>
      )}

      {/* Client Consultations Sidepane (Ersetzt das alte Edit Sidepane) */}
      {isClientConsultationsSidepaneOpen && editingClientId && (
        <div className="fixed inset-0 overflow-hidden z-50" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
          <div className="absolute inset-0 overflow-hidden">
            {/* Backdrop - nur bei <= 1070px */}
            {!isLargeScreen && (
              <div className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity sidepane-overlay sidepane-backdrop" onClick={closeClientConsultationsSidepane}></div>
            )}
            
            {/* Panel - beginnt unter der Topbar */}
            <div className="fixed top-16 bottom-0 right-0 pl-10 max-w-full flex sidepane-panel sidepane-panel-container" style={{
              transition: 'transform 350ms cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            }}>
              <div className="w-screen max-w-3xl">
                <div className="h-full flex flex-col bg-white dark:bg-gray-800 shadow-xl overflow-y-scroll">
                  {/* Header */}
                  <div className="px-4 py-6 bg-gray-50 dark:bg-gray-700 sm:px-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-medium text-gray-900 dark:text-white" id="slide-over-title">
                        Beratungen bearbeiten: {editingClientName}
                      </h2>
                      <div className="ml-3 h-7 flex items-center">
                        <button
                          type="button"
                          className="bg-gray-50 dark:bg-gray-700 rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          onClick={closeClientConsultationsSidepane}
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
                      
                      {/* Info */}
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          Hier können Sie die einzelnen Beratungen für <strong>{editingClientName}</strong> bearbeiten, löschen oder neue hinzufügen.
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                          Beratungen ({clientConsultations.length})
                        </h3>
                        <button
                          type="button"
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <PlusIcon className="h-4 w-4 mr-2" />
                          Beratung hinzufügen
                        </button>
                      </div>

                      {/* Consultations List */}
                      {loadingConsultations ? (
                        <div className="text-center py-4">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Lade Beratungen...</p>
                        </div>
                      ) : clientConsultations.length > 0 ? (
                        <div className="space-y-3">
                          {clientConsultations.map((consultation) => (
                            <div key={consultation.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-4">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                                        Startzeit
                                      </label>
                                      <input
                                        type="datetime-local"
                                        value={consultation.startTime ? new Date(consultation.startTime).toISOString().slice(0, 16) : ''}
                                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                                        Endzeit
                                      </label>
                                      <input
                                        type="datetime-local"
                                        value={consultation.endTime ? new Date(consultation.endTime).toISOString().slice(0, 16) : ''}
                                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                      />
                                    </div>
                                    <div className="flex-1">
                                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                                        Notizen
                                      </label>
                                      <input
                                        type="text"
                                        value={consultation.notes || ''}
                                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                        placeholder="Beratungsnotizen..."
                                      />
                                    </div>
                                  </div>
                                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                    Dauer: {consultation.endTime ? calculateDuration(consultation.startTime, consultation.endTime) : 'Läuft...'}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2 ml-4">
                                  <button
                                    type="button"
                                    className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                                    title="Speichern"
                                  >
                                    <CheckIcon className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                    title="Löschen"
                                  >
                                    <TrashIcon className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                          <ClockIcon className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                          <p>Keine Beratungen für diesen Client gefunden</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex-shrink-0 px-4 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        className="bg-white dark:bg-gray-600 py-2 px-4 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        onClick={closeClientConsultationsSidepane}
                      >
                        Schließen
                      </button>
                      <button
                        type="button"
                        className="bg-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Alle Änderungen speichern
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

export default MonthlyReportsTab; 
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { 
  DocumentArrowDownIcon, 
  TrashIcon, 
  PlusIcon,
  EyeIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import axiosInstance from '../config/axios.ts';
import { API_ENDPOINTS } from '../config/api.ts';
import { toast } from 'react-toastify';
import { MonthlyConsultationReport, UnbilledConsultationsCheck } from '../types/monthlyConsultationReport.ts';

const MonthlyReportsTab: React.FC = () => {
  const [reports, setReports] = useState<MonthlyConsultationReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [unbilledCheck, setUnbilledCheck] = useState<UnbilledConsultationsCheck | null>(null);

  useEffect(() => {
    loadReports();
    checkUnbilledConsultations();
  }, []);

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
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
        {reports.length === 0 ? (
          <div className="p-6 text-center">
            <DocumentArrowDownIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Keine Monatsberichte vorhanden
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Sobald Sie Beratungen erfassen, können Sie Monatsberichte erstellen.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Bericht
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
                  <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
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
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          title="PDF herunterladen"
                        >
                          <DocumentArrowDownIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => deleteReport(report.id)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          title="Bericht löschen"
                        >
                          <TrashIcon className="h-5 w-5" />
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
    </div>
  );
};

export default MonthlyReportsTab; 
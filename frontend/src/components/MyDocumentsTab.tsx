import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../config/axios.ts';
import { API_ENDPOINTS } from '../config/api.ts';
import { 
  DocumentTextIcon, 
  ArrowDownTrayIcon,
  CalendarIcon,
  UserIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import useMessage from '../hooks/useMessage.ts';

interface MyDocumentsTabProps {
  userId: number;
}

interface Certificate {
  id: number;
  certificateType: string;
  issueDate: string;
  templateUsed: string | null;
  templateVersion: string | null;
  isLatest: boolean;
  generatedBy: number | null;
  generatedByUser: {
    id: number;
    firstName: string;
    lastName: string;
  } | null;
  createdAt: string;
}

interface Contract {
  id: number;
  contractType: string;
  startDate: string;
  endDate: string | null;
  salary: number | null;
  workingHours: number | null;
  position: string | null;
  templateUsed: string | null;
  templateVersion: string | null;
  isLatest: boolean;
  generatedBy: number | null;
  generatedByUser: {
    id: number;
    firstName: string;
    lastName: string;
  } | null;
  createdAt: string;
}

const MyDocumentsTab: React.FC<MyDocumentsTabProps> = ({ userId }) => {
  const { t } = useTranslation();
  const { showMessage } = useMessage();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingCertId, setDownloadingCertId] = useState<number | null>(null);
  const [downloadingContractId, setDownloadingContractId] = useState<number | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, [userId]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const [certsResponse, contractsResponse] = await Promise.all([
        axiosInstance.get(API_ENDPOINTS.LIFECYCLE.CERTIFICATES(userId)),
        axiosInstance.get(API_ENDPOINTS.LIFECYCLE.CONTRACTS(userId))
      ]);
      setCertificates(certsResponse.data?.certificates || []);
      setContracts(contractsResponse.data?.contracts || []);
      setError(null);
    } catch (err: any) {
      console.error('Fehler beim Laden der Dokumente:', err);
      if (err.response?.status === 404) {
        const errorMsg = 'Lebenszyklus nicht gefunden. Bitte kontaktieren Sie HR, um einen Lebenszyklus-Eintrag zu erstellen.';
        setError(errorMsg);
        showMessage(errorMsg, 'error');
      } else {
        const errorMsg = err.response?.data?.message || 'Fehler beim Abrufen der Arbeitszeugnisse';
        setError(errorMsg);
        showMessage(errorMsg, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCertificate = async (certId: number) => {
    setDownloadingCertId(certId);
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.LIFECYCLE.CERTIFICATE_DOWNLOAD(userId, certId),
        {
          responseType: 'blob'
        }
      );
      
      // Erstelle Download-Link
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `arbeitszeugnis-${certId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      showMessage('Arbeitszeugnis erfolgreich heruntergeladen', 'success');
    } catch (err: any) {
      console.error('Fehler beim Herunterladen:', err);
      showMessage('Fehler beim Herunterladen des Arbeitszeugnisses', 'error');
    } finally {
      setDownloadingCertId(null);
    }
  };

  const handleDownloadContract = async (contractId: number) => {
    setDownloadingContractId(contractId);
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.LIFECYCLE.CONTRACT_DOWNLOAD(userId, contractId),
        {
          responseType: 'blob'
        }
      );
      
      // Erstelle Download-Link
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `arbeitsvertrag-${contractId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      showMessage('Arbeitsvertrag erfolgreich heruntergeladen', 'success');
    } catch (err: any) {
      console.error('Fehler beim Herunterladen:', err);
      showMessage('Fehler beim Herunterladen des Arbeitsvertrags', 'error');
    } finally {
      setDownloadingContractId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-4">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Arbeitszeugnisse */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold dark:text-white flex items-center">
            <DocumentTextIcon className="h-5 w-5 mr-2" />
            Arbeitszeugnisse
          </h3>
        </div>

        {certificates.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <DocumentTextIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>Keine Arbeitszeugnisse verfügbar</p>
            <p className="text-sm mt-2">
              Dokumente werden von HR oder Admin erstellt. Kontaktieren Sie HR, um ein Arbeitszeugnis anzufordern.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {certificates.map((cert) => (
              <div
                key={cert.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-medium dark:text-white">
                        Arbeitszeugnis
                        {cert.certificateType !== 'employment' && ` (${cert.certificateType})`}
                      </h4>
                      {cert.isLatest && (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 flex items-center">
                          <CheckCircleIcon className="h-3 w-3 mr-1" />
                          Aktuell
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center space-x-2">
                        <CalendarIcon className="h-4 w-4" />
                        <span>Ausgestellt am: {formatDate(cert.issueDate)}</span>
                      </div>
                      {cert.generatedByUser && (
                        <div className="flex items-center space-x-2">
                          <UserIcon className="h-4 w-4" />
                          <span>
                            Erstellt von: {cert.generatedByUser.firstName} {cert.generatedByUser.lastName}
                          </span>
                        </div>
                      )}
                      {cert.templateVersion && (
                        <div className="text-xs text-gray-500 dark:text-gray-500">
                          Template-Version: {cert.templateVersion}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownloadCertificate(cert.id)}
                    disabled={downloadingCertId === cert.id}
                    className="ml-4 p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Arbeitszeugnis herunterladen"
                  >
                    {downloadingCertId === cert.id ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    ) : (
                      <ArrowDownTrayIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Arbeitsverträge */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold dark:text-white flex items-center">
            <DocumentTextIcon className="h-5 w-5 mr-2" />
            Arbeitsverträge
          </h3>
        </div>

        {contracts.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <DocumentTextIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>Keine Arbeitsverträge verfügbar</p>
            <p className="text-sm mt-2">
              Dokumente werden von HR oder Admin erstellt. Kontaktieren Sie HR, um einen Arbeitsvertrag anzufordern.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {contracts.map((contract) => (
              <div
                key={contract.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-medium dark:text-white">
                        Arbeitsvertrag
                        {contract.contractType !== 'employment' && ` (${contract.contractType})`}
                      </h4>
                      {contract.isLatest && (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 flex items-center">
                          <CheckCircleIcon className="h-3 w-3 mr-1" />
                          Aktuell
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center space-x-2">
                        <CalendarIcon className="h-4 w-4" />
                        <span>
                          {formatDate(contract.startDate)}
                          {contract.endDate && ` - ${formatDate(contract.endDate)}`}
                        </span>
                      </div>
                      {contract.position && (
                        <div>Position: {contract.position}</div>
                      )}
                      {contract.salary && (
                        <div>Gehalt: {contract.salary.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</div>
                      )}
                      {contract.workingHours && (
                        <div>Arbeitsstunden: {contract.workingHours}h/Woche</div>
                      )}
                      {contract.generatedByUser && (
                        <div className="flex items-center space-x-2">
                          <UserIcon className="h-4 w-4" />
                          <span>
                            Erstellt von: {contract.generatedByUser.firstName} {contract.generatedByUser.lastName}
                          </span>
                        </div>
                      )}
                      {contract.templateVersion && (
                        <div className="text-xs text-gray-500 dark:text-gray-500">
                          Template-Version: {contract.templateVersion}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownloadContract(contract.id)}
                    disabled={downloadingContractId === contract.id}
                    className="ml-4 p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Arbeitsvertrag herunterladen"
                  >
                    {downloadingContractId === contract.id ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    ) : (
                      <ArrowDownTrayIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyDocumentsTab;


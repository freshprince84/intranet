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
  const [certPreviewUrls, setCertPreviewUrls] = useState<Record<number, string>>({});
  const [contractPreviewUrls, setContractPreviewUrls] = useState<Record<number, string>>({});
  const [loadingPreviews, setLoadingPreviews] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetchDocuments();
  }, [userId]);

  // Cleanup: Revoke Object URLs when component unmounts
  useEffect(() => {
    return () => {
      setCertPreviewUrls(prev => {
        Object.values(prev).forEach(url => {
          if (url) window.URL.revokeObjectURL(url);
        });
        return {};
      });
      setContractPreviewUrls(prev => {
        Object.values(prev).forEach(url => {
          if (url) window.URL.revokeObjectURL(url);
        });
        return {};
      });
    };
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const [certsResponse, contractsResponse] = await Promise.all([
        axiosInstance.get(API_ENDPOINTS.LIFECYCLE.CERTIFICATES(userId)),
        axiosInstance.get(API_ENDPOINTS.LIFECYCLE.CONTRACTS(userId))
      ]);
      const fetchedCerts = certsResponse.data?.certificates || [];
      const fetchedContracts = contractsResponse.data?.contracts || [];
      
      setCertificates(fetchedCerts);
      setContracts(fetchedContracts);
      setError(null);
      
      // Load PDF previews for certificates
      fetchedCerts.forEach((cert: Certificate) => {
        loadCertificatePreview(cert.id);
      });
      
      // Load PDF previews for contracts
      fetchedContracts.forEach((contract: Contract) => {
        loadContractPreview(contract.id);
      });
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

  const loadCertificatePreview = async (certId: number) => {
    try {
      setLoadingPreviews(prev => ({ ...prev, [certId]: true }));
      const response = await axiosInstance.get(
        `${API_ENDPOINTS.LIFECYCLE.CERTIFICATE_DOWNLOAD(userId, certId)}?preview=true`,
        { responseType: 'blob' }
      );
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const previewUrl = window.URL.createObjectURL(blob);
      
      setCertPreviewUrls(prev => ({ ...prev, [certId]: previewUrl }));
    } catch (err: any) {
      console.error('Fehler beim Laden der PDF-Vorschau:', err);
    } finally {
      setLoadingPreviews(prev => ({ ...prev, [certId]: false }));
    }
  };

  const loadContractPreview = async (contractId: number) => {
    try {
      setLoadingPreviews(prev => ({ ...prev, [contractId]: true }));
      const response = await axiosInstance.get(
        `${API_ENDPOINTS.LIFECYCLE.CONTRACT_DOWNLOAD(userId, contractId)}?preview=true`,
        { responseType: 'blob' }
      );
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const previewUrl = window.URL.createObjectURL(blob);
      
      setContractPreviewUrls(prev => ({ ...prev, [contractId]: previewUrl }));
    } catch (err: any) {
      console.error('Fehler beim Laden der PDF-Vorschau:', err);
    } finally {
      setLoadingPreviews(prev => ({ ...prev, [contractId]: false }));
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
            {t('lifecycle.certificates')}
          </h3>
        </div>

        {certificates.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <DocumentTextIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>{t('lifecycle.noCertificates')}</p>
            <p className="text-sm mt-2">
              {t('lifecycle.certificatesInfo')}
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
                        {t('lifecycle.certificate')}
                        {cert.certificateType !== 'employment' && ` (${cert.certificateType})`}
                      </h4>
                      {cert.isLatest && (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 flex items-center">
                          <CheckCircleIcon className="h-3 w-3 mr-1" />
                          {t('lifecycle.current')}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center space-x-2">
                        <CalendarIcon className="h-4 w-4" />
                        <span>{t('lifecycle.issuedOn')} {formatDate(cert.issueDate)}</span>
                      </div>
                      {cert.generatedByUser && (
                        <div className="flex items-center space-x-2">
                          <UserIcon className="h-4 w-4" />
                          <span>
                            {t('lifecycle.createdBy')} {cert.generatedByUser.firstName} {cert.generatedByUser.lastName}
                          </span>
                        </div>
                      )}
                      {cert.templateVersion && (
                        <div className="text-xs text-gray-500 dark:text-gray-500">
                          {t('lifecycle.templateVersion')} {cert.templateVersion}
                        </div>
                      )}
                    </div>
                    {/* PDF-Vorschau */}
                    <div className="mt-3 border rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-700/50">
                      {loadingPreviews[cert.id] ? (
                        <div className="flex justify-center items-center" style={{ height: '400px' }}>
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                      ) : certPreviewUrls[cert.id] ? (
                        <iframe 
                          src={certPreviewUrls[cert.id]}
                          className="w-full rounded border dark:border-gray-600"
                          style={{ height: '400px' }}
                          title={t('lifecycle.certificate')}
                        />
                      ) : (
                        <div className="flex justify-center items-center text-gray-500 dark:text-gray-400" style={{ height: '400px' }}>
                          <p>{t('lifecycle.previewError', { defaultValue: 'Vorschau konnte nicht geladen werden' })}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownloadCertificate(cert.id)}
                    disabled={downloadingCertId === cert.id}
                    className="ml-4 p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                    title={t('lifecycle.downloadCertificate')}
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
            {t('lifecycle.contracts')}
          </h3>
        </div>

        {contracts.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <DocumentTextIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>{t('lifecycle.noContracts')}</p>
            <p className="text-sm mt-2">
              {t('lifecycle.contractsInfo')}
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
                        {t('lifecycle.contract')}
                        {contract.contractType !== 'employment' && ` (${contract.contractType})`}
                      </h4>
                      {contract.isLatest && (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 flex items-center">
                          <CheckCircleIcon className="h-3 w-3 mr-1" />
                          {t('lifecycle.current')}
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
                        <div>{t('lifecycle.position')} {contract.position}</div>
                      )}
                      {contract.salary && (
                        <div>{t('lifecycle.salary')} {contract.salary.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</div>
                      )}
                      {contract.workingHours && (
                        <div>{t('lifecycle.workingHours')} {contract.workingHours}h/Woche</div>
                      )}
                      {contract.generatedByUser && (
                        <div className="flex items-center space-x-2">
                          <UserIcon className="h-4 w-4" />
                          <span>
                            {t('lifecycle.createdBy')} {contract.generatedByUser.firstName} {contract.generatedByUser.lastName}
                          </span>
                        </div>
                      )}
                      {contract.templateVersion && (
                        <div className="text-xs text-gray-500 dark:text-gray-500">
                          {t('lifecycle.templateVersion')} {contract.templateVersion}
                        </div>
                      )}
                    </div>
                    {/* PDF-Vorschau */}
                    <div className="mt-3 border rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-700/50">
                      {loadingPreviews[contract.id] ? (
                        <div className="flex justify-center items-center" style={{ height: '400px' }}>
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                      ) : contractPreviewUrls[contract.id] ? (
                        <iframe 
                          src={contractPreviewUrls[contract.id]}
                          className="w-full rounded border dark:border-gray-600"
                          style={{ height: '400px' }}
                          title={t('lifecycle.contract')}
                        />
                      ) : (
                        <div className="flex justify-center items-center text-gray-500 dark:text-gray-400" style={{ height: '400px' }}>
                          <p>{t('lifecycle.previewError', { defaultValue: 'Vorschau konnte nicht geladen werden' })}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownloadContract(contract.id)}
                    disabled={downloadingContractId === contract.id}
                    className="ml-4 p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                    title={t('lifecycle.downloadContract')}
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


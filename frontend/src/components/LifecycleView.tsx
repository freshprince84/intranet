import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../config/axios.ts';
import { API_ENDPOINTS } from '../config/api.ts';
import { 
  CheckCircleIcon, 
  ClockIcon, 
  XCircleIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
  PlusIcon,
  PencilIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { usePermissions } from '../hooks/usePermissions.ts';
import useMessage from '../hooks/useMessage.ts';
import CertificateCreationModal from './CertificateCreationModal.tsx';
import ContractCreationModal from './ContractCreationModal.tsx';
import CertificateEditModal from './CertificateEditModal.tsx';
import ContractEditModal from './ContractEditModal.tsx';

interface LifecycleViewProps {
  userId: number;
  userName: string;
}

interface LifecycleData {
  lifecycle: {
    id: number;
    status: string;
    onboardingStartedAt: string | null;
    onboardingCompletedAt: string | null;
    contractStartDate: string | null;
    contractEndDate: string | null;
  };
  progress: {
    completed: number;
    total: number;
    percent: number;
  };
  socialSecurityRegistrations?: Array<{
    id: number;
    registrationType: string;
    status: string;
    registrationNumber: string | null;
    provider: string | null;
    registrationDate: string | null;
  }>;
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

const LifecycleView: React.FC<LifecycleViewProps> = ({ userId, userName }) => {
  const { t } = useTranslation();
  const { isHR } = usePermissions();
  const { showMessage } = useMessage();
  
  const [lifecycleData, setLifecycleData] = useState<LifecycleData | null>(null);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal States
  const [isCertificateCreateModalOpen, setIsCertificateCreateModalOpen] = useState(false);
  const [isContractCreateModalOpen, setIsContractCreateModalOpen] = useState(false);
  const [editingCertificate, setEditingCertificate] = useState<Certificate | null>(null);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  
  const [downloadingCertId, setDownloadingCertId] = useState<number | null>(null);
  const [downloadingContractId, setDownloadingContractId] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [lifecycleResponse, certsResponse, contractsResponse] = await Promise.all([
        axiosInstance.get(API_ENDPOINTS.LIFECYCLE.BY_USER(userId)),
        axiosInstance.get(API_ENDPOINTS.LIFECYCLE.CERTIFICATES(userId)),
        axiosInstance.get(API_ENDPOINTS.LIFECYCLE.CONTRACTS(userId))
      ]);
      
      setLifecycleData(lifecycleResponse.data);
      setCertificates(certsResponse.data?.certificates || []);
      setContracts(contractsResponse.data?.contracts || []);
      setError(null);
    } catch (err: any) {
      console.error('Fehler beim Laden der Lebenszyklus-Daten:', err);
      setError(err.response?.data?.message || 'Fehler beim Laden der Daten');
      showMessage('Fehler beim Laden der Daten', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCertificate = async (certId: number) => {
    setDownloadingCertId(certId);
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.LIFECYCLE.CERTIFICATE_DOWNLOAD(userId, certId),
        { responseType: 'blob' }
      );
      
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
        { responseType: 'blob' }
      );
      
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

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; labelKey: string }> = {
      onboarding: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300', labelKey: 'lifecycle.status.onboarding' },
      active: { color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300', labelKey: 'lifecycle.status.active' },
      contract_change: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300', labelKey: 'lifecycle.status.contract_change' },
      offboarding: { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300', labelKey: 'lifecycle.status.offboarding' },
      archived: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', labelKey: 'lifecycle.status.archived' }
    };

    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', labelKey: status };
    
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        {t(config.labelKey) || status}
      </span>
    );
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

  if (!lifecycleData) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
        <p className="text-gray-500 dark:text-gray-400">{t('lifecycle.noData') || 'Keine Lebenszyklus-Daten verfügbar'}</p>
      </div>
    );
  }

  const { lifecycle, progress, socialSecurityRegistrations = [] } = lifecycleData;

  return (
    <div className="space-y-6">
      {/* Status-Box */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold dark:text-white flex items-center">
            <BuildingOfficeIcon className="h-5 w-5 mr-2" />
            {t('lifecycle.statusTitle')}
          </h3>
          {getStatusBadge(lifecycle.status)}
        </div>

        <div className="space-y-2 text-sm">
          {lifecycle.onboardingStartedAt && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">{t('lifecycle.onboardingStarted')}</span>
              <span className="dark:text-white">
                {new Date(lifecycle.onboardingStartedAt).toLocaleDateString('de-DE')}
              </span>
            </div>
          )}
          {lifecycle.onboardingCompletedAt && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">{t('lifecycle.onboardingCompleted')}</span>
              <span className="dark:text-white">
                {new Date(lifecycle.onboardingCompletedAt).toLocaleDateString('de-DE')}
              </span>
            </div>
          )}
          {lifecycle.contractStartDate && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">{t('lifecycle.contractStart')}</span>
              <span className="dark:text-white">
                {new Date(lifecycle.contractStartDate).toLocaleDateString('de-DE')}
              </span>
            </div>
          )}
          {lifecycle.contractEndDate && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">{t('lifecycle.contractEnd')}</span>
              <span className="dark:text-white">
                {new Date(lifecycle.contractEndDate).toLocaleDateString('de-DE')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Progress-Bar */}
      {lifecycle.status === 'onboarding' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold dark:text-white mb-4">{t('lifecycle.progressTitle')}</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600 dark:text-gray-400">
                {t('lifecycle.progressSteps', { completed: progress.completed, total: progress.total })}
              </span>
              <span className="font-medium dark:text-white">{progress.percent}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress.percent}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Dokumente - Arbeitszeugnisse */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold dark:text-white flex items-center">
            <DocumentTextIcon className="h-5 w-5 mr-2" />
            {t('lifecycle.certificates')}
          </h3>
          {isHR() && (
            <button
              onClick={() => setIsCertificateCreateModalOpen(true)}
              className="bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 p-1.5 rounded-full hover:bg-blue-50 dark:hover:bg-gray-700 border border-blue-200 dark:border-gray-700 shadow-sm flex items-center justify-center"
              style={{ width: '30.19px', height: '30.19px' }}
              title={t('lifecycle.createCertificate')}
              aria-label={t('lifecycle.createCertificate')}
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        {certificates.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <DocumentTextIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>{t('lifecycle.noCertificates')}</p>
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
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    {isHR() && (
                      <button
                        onClick={() => setEditingCertificate(cert)}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition"
                        title={t('lifecycle.edit')}
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDownloadCertificate(cert.id)}
                      disabled={downloadingCertId === cert.id}
                      className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                      title={t('lifecycle.download')}
                    >
                      {downloadingCertId === cert.id ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      ) : (
                        <ArrowDownTrayIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dokumente - Arbeitsverträge */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold dark:text-white flex items-center">
            <DocumentTextIcon className="h-5 w-5 mr-2" />
            {t('lifecycle.contracts')}
          </h3>
          {isHR() && (
            <button
              onClick={() => setIsContractCreateModalOpen(true)}
              className="bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 p-1.5 rounded-full hover:bg-blue-50 dark:hover:bg-gray-700 border border-blue-200 dark:border-gray-700 shadow-sm flex items-center justify-center"
              style={{ width: '30.19px', height: '30.19px' }}
              title={t('lifecycle.createContract')}
              aria-label={t('lifecycle.createContract')}
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        {contracts.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <DocumentTextIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>{t('lifecycle.noContracts')}</p>
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
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    {isHR() && (
                      <button
                        onClick={() => setEditingContract(contract)}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition"
                        title={t('lifecycle.edit')}
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDownloadContract(contract.id)}
                      disabled={downloadingContractId === contract.id}
                      className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                      title={t('lifecycle.download')}
                    >
                      {downloadingContractId === contract.id ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      ) : (
                        <ArrowDownTrayIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Social Security Status */}
      {socialSecurityRegistrations.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold dark:text-white mb-4 flex items-center">
            <DocumentTextIcon className="h-5 w-5 mr-2" />
            {t('lifecycle.socialSecurity')}
          </h3>
          <div className="space-y-3">
            {socialSecurityRegistrations.map((registration) => (
              <div
                key={registration.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  {registration.status === 'registered' ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  ) : registration.status === 'pending' ? (
                    <ClockIcon className="h-5 w-5 text-yellow-500" />
                  ) : (
                    <XCircleIcon className="h-5 w-5 text-red-500" />
                  )}
                  <div>
                    <div className="font-medium dark:text-white uppercase">
                      {registration.registrationType}
                    </div>
                    {registration.provider && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {registration.provider}
                      </div>
                    )}
                    {registration.registrationNumber && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Nr: {registration.registrationNumber}
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-sm font-medium dark:text-white">
                  {t(`lifecycle.socialSecurityStatus.${registration.status}`) || registration.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <CertificateCreationModal
        isOpen={isCertificateCreateModalOpen}
        onClose={() => setIsCertificateCreateModalOpen(false)}
        onCertificateCreated={() => {
          fetchData();
          setIsCertificateCreateModalOpen(false);
        }}
        userId={userId}
        userName={userName}
      />

      <ContractCreationModal
        isOpen={isContractCreateModalOpen}
        onClose={() => setIsContractCreateModalOpen(false)}
        onContractCreated={() => {
          fetchData();
          setIsContractCreateModalOpen(false);
        }}
        userId={userId}
        userName={userName}
      />

      {editingCertificate && (
        <CertificateEditModal
          isOpen={!!editingCertificate}
          onClose={() => setEditingCertificate(null)}
          onCertificateUpdated={() => {
            fetchData();
            setEditingCertificate(null);
          }}
          userId={userId}
          certificate={editingCertificate}
        />
      )}

      {editingContract && (
        <ContractEditModal
          isOpen={!!editingContract}
          onClose={() => setEditingContract(null)}
          onContractUpdated={() => {
            fetchData();
            setEditingContract(null);
          }}
          userId={userId}
          contract={editingContract}
        />
      )}
    </div>
  );
};

export default LifecycleView;


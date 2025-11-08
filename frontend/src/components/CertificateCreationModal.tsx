import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, CheckIcon, DocumentTextIcon, CalendarIcon, UserIcon } from '@heroicons/react/24/outline';
import axiosInstance from '../config/axios.ts';
import { API_ENDPOINTS } from '../config/api.ts';
import { useAuth } from '../hooks/useAuth.tsx';
import { usePermissions } from '../hooks/usePermissions.ts';
import { useSidepane } from '../contexts/SidepaneContext.tsx';
import useMessage from '../hooks/useMessage.ts';

interface CertificateCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCertificateCreated: () => void;
  userId: number;
  userName: string;
}

interface UserData {
  firstName: string;
  lastName: string;
  identificationNumber: string | null;
  contractStartDate: string | null;
  contractEndDate: string | null;
  contractType: string | null;
  salary: number | null;
  position: string | null;
}

const CertificateCreationModal: React.FC<CertificateCreationModalProps> = ({
  isOpen,
  onClose,
  onCertificateCreated,
  userId,
  userName
}) => {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const { isHR, loading: permissionsLoading } = usePermissions();
  const { openSidepane, closeSidepane } = useSidepane();
  const { showMessage } = useMessage();
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth > 1070);
  const [activeTab, setActiveTab] = useState<'data' | 'text'>('data');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form-Daten
  const [userData, setUserData] = useState<UserData | null>(null);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [certificateType, setCertificateType] = useState('employment');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Prüfe Berechtigung (nur wenn Berechtigungen geladen sind)
  useEffect(() => {
    if (permissionsLoading) {
      return; // Warte bis Berechtigungen geladen sind
    }
    
    if (!isHR()) {
      showMessage('Nur HR oder Admin können Arbeitszeugnisse erstellen', 'error');
      onClose();
    }
  }, [isHR, permissionsLoading, onClose, showMessage]);

  // Responsive Erkennung
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
      setIsLargeScreen(window.innerWidth > 1070);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sidepane-Status verwalten
  useEffect(() => {
    if (isOpen) {
      openSidepane();
      fetchUserData();
    } else {
      closeSidepane();
    }
    
    return () => {
      closeSidepane();
    };
  }, [isOpen, openSidepane, closeSidepane]);

  const fetchUserData = async () => {
    try {
      const [userResponse, lifecycleResponse] = await Promise.all([
        axiosInstance.get(API_ENDPOINTS.USERS.BY_ID(userId)),
        axiosInstance.get(API_ENDPOINTS.LIFECYCLE.BY_USER(userId))
      ]);

      const user = userResponse.data;
      const lifecycle = lifecycleResponse.data.lifecycle;

      setUserData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        identificationNumber: user.identificationNumber || null,
        contractStartDate: lifecycle?.contractStartDate || null,
        contractEndDate: lifecycle?.contractEndDate || null,
        contractType: lifecycle?.contractType || null,
        salary: user.salary || null,
        position: null // TODO: Aus Rollen ableiten
      });
    } catch (err: any) {
      console.error('Fehler beim Laden der User-Daten:', err);
      setError('Fehler beim Laden der Daten');
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        showMessage('Nur PDF-Dateien sind erlaubt', 'error');
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB
        showMessage('Datei ist zu groß (max. 10MB)', 'error');
        return;
      }
      setPdfFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!pdfFile) {
      showMessage('Bitte wählen Sie eine PDF-Datei aus', 'error');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Upload PDF
      const formData = new FormData();
      formData.append('file', pdfFile);
      
      // TODO: Temporär - später wird PDF generiert
      // Für jetzt: Upload zu einem temporären Endpoint oder direkt speichern
      // Da wir noch keinen Upload-Endpoint haben, müssen wir das PDF erstmal als Base64 speichern
      // oder einen Upload-Endpoint erstellen
      
      // Workaround: Erstelle Certificate mit temporärem pdfPath
      // In Phase 5 wird das durch PDF-Generierung ersetzt
      const certificateData = {
        certificateType,
        issueDate: new Date(issueDate),
        pdfPath: `temp-${Date.now()}-${pdfFile.name}`, // Temporär
        templateUsed: null,
        templateVersion: null
      };

      await axiosInstance.post(
        API_ENDPOINTS.LIFECYCLE.CERTIFICATES(userId),
        certificateData
      );

      showMessage('Arbeitszeugnis erfolgreich erstellt', 'success');
      onCertificateCreated();
      onClose();
      
      // Reset form
      setPdfFile(null);
      setIssueDate(new Date().toISOString().split('T')[0]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      console.error('Fehler beim Erstellen des Arbeitszeugnisses:', err);
      setError(err.response?.data?.message || 'Fehler beim Erstellen des Arbeitszeugnisses');
      showMessage('Fehler beim Erstellen des Arbeitszeugnisses', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isHR()) {
    return null;
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      {/* Overlay - nur auf Mobile und Desktop (nicht Large Desktop) */}
      {(!isLargeScreen || isMobile) && (
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      )}

      <div className="fixed inset-0 flex items-start justify-end p-0 sm:p-0">
        <Dialog.Panel
          className={`
            ${isMobile ? 'w-full h-full' : isLargeScreen ? 'w-[600px]' : 'w-[600px]'}
            ${isMobile ? '' : 'top-16'}
            bg-white dark:bg-gray-800 shadow-xl
            transform transition-transform duration-350 ease-out
            ${isMobile ? 'rounded-none' : 'rounded-l-lg'}
            flex flex-col
            max-h-[calc(100vh-4rem)]
          `}
          style={{
            animation: isMobile ? 'none' : 'slideIn 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex items-center space-x-3">
              <DocumentTextIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <Dialog.Title className="text-xl font-semibold dark:text-white">
                Arbeitszeugnis erstellen
              </Dialog.Title>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Für: <span className="font-medium dark:text-white">{userName}</span>
              </p>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
              <nav className="-mb-px flex space-x-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('data')}
                  className={`${
                    activeTab === 'data'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
                >
                  Daten
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('text')}
                  className={`${
                    activeTab === 'text'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
                >
                  PDF hochladen
                </button>
              </nav>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-4">
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            {/* Tab Content */}
            {activeTab === 'data' && (
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-4">
                  <h3 className="text-sm font-semibold dark:text-white mb-3">
                    Automatisch erkannte Daten
                  </h3>
                  <div className="space-y-2 text-sm">
                    {userData && (
                      <>
                        <div className="flex items-center space-x-2">
                          <UserIcon className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600 dark:text-gray-400">Name:</span>
                          <span className="dark:text-white">
                            {userData.firstName} {userData.lastName}
                          </span>
                        </div>
                        {userData.identificationNumber && (
                          <div className="flex items-center space-x-2">
                            <DocumentTextIcon className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-400">Cédula:</span>
                            <span className="dark:text-white">{userData.identificationNumber}</span>
                          </div>
                        )}
                        {userData.contractStartDate && (
                          <div className="flex items-center space-x-2">
                            <CalendarIcon className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-400">Eintrittsdatum:</span>
                            <span className="dark:text-white">
                              {new Date(userData.contractStartDate).toLocaleDateString('de-DE')}
                            </span>
                          </div>
                        )}
                        {userData.contractEndDate && (
                          <div className="flex items-center space-x-2">
                            <CalendarIcon className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-400">Austrittsdatum:</span>
                            <span className="dark:text-white">
                              {new Date(userData.contractEndDate).toLocaleDateString('de-DE')}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Ausstellungsdatum
                  </label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Zertifikat-Typ
                  </label>
                  <select
                    value={certificateType}
                    onChange={(e) => setCertificateType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  >
                    <option value="employment">Arbeitszeugnis</option>
                    <option value="salary">Gehaltsbescheinigung</option>
                    <option value="work_experience">Arbeitsbescheinigung</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === 'text' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    PDF-Datei hochladen
                  </label>
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    {!pdfFile ? (
                      <div>
                        <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                        >
                          PDF-Datei auswählen
                        </button>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                          oder Datei hierher ziehen
                        </p>
                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                          Max. 10MB
                        </p>
                      </div>
                    ) : (
                      <div>
                        <DocumentTextIcon className="mx-auto h-12 w-12 text-green-500 mb-4" />
                        <p className="text-sm font-medium dark:text-white">{pdfFile.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setPdfFile(null);
                            if (fileInputRef.current) {
                              fileInputRef.current.value = '';
                            }
                          }}
                          className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                        >
                          Datei entfernen
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4">
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    <strong>Hinweis:</strong> Die PDF-Generierung wird in Phase 5 implementiert. 
                    Aktuell können Sie eine PDF-Datei hochladen.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !pdfFile}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Wird erstellt...</span>
                </>
              ) : (
                <>
                  <CheckIcon className="h-4 w-4" />
                  <span>Erstellen</span>
                </>
              )}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default CertificateCreationModal;


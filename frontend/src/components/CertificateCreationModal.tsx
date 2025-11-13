import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, CheckIcon, DocumentTextIcon, CalendarIcon, UserIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
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
  const { isHR, isAdmin, loading: permissionsLoading } = usePermissions();
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
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [availableTemplates, setAvailableTemplates] = useState<Array<{type: string; version: string; path: string}>>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [useTemplate, setUseTemplate] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Prüfe Berechtigung (nur wenn Berechtigungen geladen sind)
  useEffect(() => {
    if (permissionsLoading) {
      return; // Warte bis Berechtigungen geladen sind
    }
    
    if (!isHR() && !isAdmin()) {
      showMessage('Nur HR oder Admin können Arbeitszeugnisse erstellen', 'error');
      onClose();
    }
  }, [isHR, isAdmin, permissionsLoading, onClose, showMessage]);

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
      fetchTemplates();
    } else {
      closeSidepane();
    }
    
    return () => {
      closeSidepane();
    };
  }, [isOpen, openSidepane, closeSidepane]);

  const fetchTemplates = async () => {
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.ORGANIZATION_LIFECYCLE.DOCUMENT_TEMPLATES);
      const documentTemplates = response.data.documentTemplates || {};
      const templates: Array<{type: string; version: string; path: string}> = [];
      
      if (documentTemplates.employmentCertificate) {
        templates.push({
          type: 'employmentCertificate',
          version: documentTemplates.employmentCertificate.version,
          path: documentTemplates.employmentCertificate.path
        });
      }
      
      setAvailableTemplates(templates);
      if (templates.length > 0) {
        setSelectedTemplate(templates[0].type);
        setUseTemplate(true);
      }
    } catch (err: any) {
      console.error('Fehler beim Laden der Templates:', err);
      // Kein Fehler anzeigen, Templates sind optional
    }
  };

  const fetchUserData = async () => {
    try {
      const [userResponse, lifecycleResponse] = await Promise.all([
        axiosInstance.get(API_ENDPOINTS.USERS.BY_ID(userId)),
        axiosInstance.get(API_ENDPOINTS.LIFECYCLE.BY_USER(userId))
      ]);

      const user = userResponse.data;
      const lifecycle = lifecycleResponse.data.lifecycle;

      const userDataObj = {
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        identificationNumber: user.identificationNumber || null,
        contractStartDate: lifecycle?.contractStartDate || null,
        contractEndDate: lifecycle?.contractEndDate || null,
        contractType: lifecycle?.contractType || null,
        salary: user.salary || null,
        position: null // TODO: Aus Rollen ableiten
      };

      setUserData(userDataObj);

      // Automatische Vorausfüllung: Ausstellungsdatum auf heute setzen (wenn noch nicht gesetzt)
      if (!issueDate || issueDate === new Date().toISOString().split('T')[0]) {
        setIssueDate(new Date().toISOString().split('T')[0]);
      }
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
      setUseTemplate(false); // Deaktiviere Template wenn PDF hochgeladen wird
      // Erstelle Preview-URL
      const url = URL.createObjectURL(file);
      setPdfPreviewUrl(url);
    }
  };

  // Cleanup: Revoke Object URL beim Unmount oder wenn Datei entfernt wird
  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl);
      }
    };
  }, [pdfPreviewUrl]);

  const validateForm = (): string | null => {
    if (!useTemplate && !pdfFile) {
      return 'Bitte wählen Sie ein Template oder laden Sie eine PDF-Datei hoch';
    }
    if (!issueDate) {
      return 'Bitte geben Sie ein Ausstellungsdatum an';
    }
    const issueDateObj = new Date(issueDate);
    if (isNaN(issueDateObj.getTime())) {
      return 'Ungültiges Ausstellungsdatum';
    }
    if (issueDateObj > new Date()) {
      return 'Ausstellungsdatum darf nicht in der Zukunft liegen';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Client-seitige Validierung
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      showMessage(validationError, 'error');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let pdfPath: string | undefined = undefined;
      let templateUsed: string | null = null;
      let templateVersion: string | null = null;

      // Wenn Template verwendet werden soll und kein PDF hochgeladen wurde
      if (useTemplate && selectedTemplate && !pdfFile) {
        const template = availableTemplates.find(t => t.type === selectedTemplate);
        if (template) {
          templateUsed = template.type;
          templateVersion = template.version;
          // PDF wird vom Backend generiert
        }
      } else if (pdfFile) {
        // PDF wurde hochgeladen - verwende dieses
        pdfPath = `temp-${Date.now()}-${pdfFile.name}`; // Temporär
      } else {
        showMessage('Bitte wählen Sie ein Template oder laden Sie eine PDF-Datei hoch', 'error');
        setLoading(false);
        return;
      }

      const certificateData = {
        certificateType,
        issueDate: new Date(issueDate),
        pdfPath,
        templateUsed,
        templateVersion
      };

      await axiosInstance.post(
        API_ENDPOINTS.LIFECYCLE.CERTIFICATES(userId),
        certificateData
      );

      showMessage('Arbeitszeugnis erfolgreich erstellt', 'success');
      onCertificateCreated();
      onClose();
      
      // Reset form
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl);
        setPdfPreviewUrl(null);
      }
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

  if (!isHR() && !isAdmin()) {
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
                    Ausstellungsdatum <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => {
                      const value = e.target.value;
                      setIssueDate(value);
                      // Validierung: Datum darf nicht in der Zukunft liegen
                      if (value && new Date(value) > new Date()) {
                        setError('Ausstellungsdatum darf nicht in der Zukunft liegen');
                      } else {
                        setError(null); // Clear error when valid
                      }
                    }}
                    max={new Date().toISOString().split('T')[0]}
                    className={`w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:text-white ${
                      error && issueDate && new Date(issueDate) > new Date()
                        ? 'border-red-500 dark:border-red-500' 
                        : error && !issueDate
                        ? 'border-red-500 dark:border-red-500'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                    required
                    aria-invalid={(!issueDate || (issueDate && new Date(issueDate) > new Date())) ? true : undefined}
                    aria-describedby={(!issueDate || (issueDate && new Date(issueDate) > new Date())) ? "issueDate-error" : undefined}
                  />
                  {error && (!issueDate || (issueDate && new Date(issueDate) > new Date())) && (
                    <p id="issueDate-error" className="mt-1 text-xs text-red-600 dark:text-red-400">
                      {error}
                    </p>
                  )}
                  {!error && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Das Datum darf nicht in der Zukunft liegen
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Zertifikat-Typ <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={certificateType}
                    onChange={(e) => setCertificateType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                    required
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
                {/* Template-Auswahl */}
                {availableTemplates.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Template verwenden
                    </label>
                    <div className="flex items-center space-x-3 mb-4">
                      <input
                        type="checkbox"
                        checked={useTemplate}
                        onChange={(e) => {
                          setUseTemplate(e.target.checked);
                          if (e.target.checked && pdfFile) {
                            // Wenn Template aktiviert wird, entferne PDF
                            setPdfFile(null);
                            if (pdfPreviewUrl) {
                              URL.revokeObjectURL(pdfPreviewUrl);
                              setPdfPreviewUrl(null);
                            }
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label className="text-sm text-gray-700 dark:text-gray-300">
                        Template für automatische PDF-Generierung verwenden
                      </label>
                    </div>
                    {useTemplate && (
                      <select
                        value={selectedTemplate || ''}
                        onChange={(e) => setSelectedTemplate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white mb-4"
                      >
                        {availableTemplates.map((template) => (
                          <option key={template.type} value={template.type}>
                            Arbeitszeugnis (Version {template.version})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {useTemplate ? 'ODER PDF-Datei hochladen' : 'PDF-Datei hochladen'} {!useTemplate && <span className="text-red-500">*</span>}
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
                            if (pdfPreviewUrl) {
                              URL.revokeObjectURL(pdfPreviewUrl);
                              setPdfPreviewUrl(null);
                            }
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

                {/* PDF-Vorschau */}
                {pdfPreviewUrl && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      PDF-Vorschau
                    </label>
                    <div className="border rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-700/50">
                      <iframe 
                        src={`${pdfPreviewUrl}#view=FitH`}
                        className="w-full rounded border dark:border-gray-600"
                        style={{ height: '400px' }}
                        title="PDF-Vorschau"
                      />
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              title="Abbrechen"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || (!pdfFile && !useTemplate)}
              className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
              title={loading ? 'Wird erstellt...' : 'Erstellen'}
            >
              {loading ? (
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
              ) : (
                <CheckIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default CertificateCreationModal;


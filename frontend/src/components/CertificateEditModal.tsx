import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, CheckIcon, DocumentTextIcon, CalendarIcon } from '@heroicons/react/24/outline';
import axiosInstance from '../config/axios.ts';
import { API_ENDPOINTS } from '../config/api.ts';
import { usePermissions } from '../hooks/usePermissions.ts';
import { useSidepane } from '../contexts/SidepaneContext.tsx';
import useMessage from '../hooks/useMessage.ts';

interface Certificate {
  id: number;
  certificateType: string;
  issueDate: string;
  templateUsed: string | null;
  templateVersion: string | null;
  isLatest: boolean;
}

interface CertificateEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCertificateUpdated: () => void;
  userId: number;
  certificate: Certificate;
}

const CertificateEditModal: React.FC<CertificateEditModalProps> = ({
  isOpen,
  onClose,
  onCertificateUpdated,
  userId,
  certificate
}) => {
  const { t } = useTranslation();
  const { isHR } = usePermissions();
  const { openSidepane, closeSidepane } = useSidepane();
  const { showMessage } = useMessage();
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth > 1070);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form-Daten
  const [issueDate, setIssueDate] = useState(
    certificate.issueDate ? new Date(certificate.issueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  );
  const [certificateType, setCertificateType] = useState(certificate.certificateType || 'employment');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [existingPdfUrl, setExistingPdfUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Prüfe Berechtigung
  useEffect(() => {
    if (!isHR()) {
      showMessage('Nur HR oder Admin können Arbeitszeugnisse bearbeiten', 'error');
      onClose();
    }
  }, [isHR, onClose, showMessage]);

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
      // Lade bestehende PDF-URL wenn vorhanden
      if (certificate.id) {
        setExistingPdfUrl(API_ENDPOINTS.LIFECYCLE.CERTIFICATE_DOWNLOAD(userId, certificate.id));
      }
    } else {
      closeSidepane();
    }
    
    return () => {
      closeSidepane();
    };
  }, [isOpen, openSidepane, closeSidepane, certificate.id, userId]);

  // Cleanup: Revoke Object URL beim Unmount oder wenn Datei entfernt wird
  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl);
      }
    };
  }, [pdfPreviewUrl]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        showMessage('Nur PDF-Dateien sind erlaubt', 'error');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        showMessage('Datei ist zu groß (max. 10MB)', 'error');
        return;
      }
      setPdfFile(file);
      // Erstelle Preview-URL für neue Datei
      const url = URL.createObjectURL(file);
      setPdfPreviewUrl(url);
      setExistingPdfUrl(null); // Verstecke bestehende PDF wenn neue hochgeladen wird
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError(null);

    try {
      const updateData: any = {
        issueDate: new Date(issueDate),
        certificateType
      };

      // Nur pdfPath aktualisieren, wenn neue Datei hochgeladen wurde
      if (pdfFile) {
        updateData.pdfPath = `temp-${Date.now()}-${pdfFile.name}`;
        updateData.templateVersion = certificate.templateVersion || '1.0';
      }

      await axiosInstance.put(
        API_ENDPOINTS.LIFECYCLE.CERTIFICATE(userId, certificate.id),
        updateData
      );

      showMessage('Arbeitszeugnis erfolgreich aktualisiert', 'success');
      onCertificateUpdated();
      onClose();
      
      // Reset form
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl);
        setPdfPreviewUrl(null);
      }
      setPdfFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      console.error('Fehler beim Aktualisieren des Arbeitszeugnisses:', err);
      setError(err.response?.data?.message || 'Fehler beim Aktualisieren des Arbeitszeugnisses');
      showMessage('Fehler beim Aktualisieren des Arbeitszeugnisses', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isHR()) {
    return null;
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
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
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex items-center space-x-3">
              <DocumentTextIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <Dialog.Title className="text-xl font-semibold dark:text-white">
                Arbeitszeugnis bearbeiten
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
            {error && (
              <div className="mb-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-4">
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ausstellungsdatum
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
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  aria-invalid={issueDate && new Date(issueDate) > new Date() ? true : undefined}
                  aria-describedby={issueDate && new Date(issueDate) > new Date() ? "issueDate-error" : undefined}
                />
                {error && issueDate && new Date(issueDate) > new Date() && (
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

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  PDF-Datei aktualisieren (optional)
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
                        Neue PDF-Datei auswählen
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
                          setExistingPdfUrl(API_ENDPOINTS.LIFECYCLE.CERTIFICATE_DOWNLOAD(userId, certificate.id));
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

                {/* PDF-Vorschau */}
                {(pdfPreviewUrl || existingPdfUrl) && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      PDF-Vorschau
                    </label>
                    <div className="border rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-700/50">
                      <iframe 
                        src={`${pdfPreviewUrl || existingPdfUrl}${pdfPreviewUrl ? '#view=FitH' : '?preview=true#view=FitH'}`}
                        className="w-full rounded border dark:border-gray-600"
                        style={{ height: '400px' }}
                        title="PDF-Vorschau"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  <strong>Hinweis:</strong> Wenn Sie eine neue PDF-Datei hochladen, wird die alte Version ersetzt.
                  Eine neue Version wird erstellt (isLatest = true).
                </p>
              </div>
            </form>
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
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Wird aktualisiert...</span>
                </>
              ) : (
                <>
                  <CheckIcon className="h-4 w-4" />
                  <span>Aktualisieren</span>
                </>
              )}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default CertificateEditModal;


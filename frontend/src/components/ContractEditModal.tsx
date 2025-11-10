import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, CheckIcon, DocumentTextIcon, CalendarIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import axiosInstance from '../config/axios.ts';
import { API_ENDPOINTS } from '../config/api.ts';
import { usePermissions } from '../hooks/usePermissions.ts';
import { useSidepane } from '../contexts/SidepaneContext.tsx';
import useMessage from '../hooks/useMessage.ts';

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
}

interface ContractEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContractUpdated: () => void;
  userId: number;
  contract: Contract;
}

const ContractEditModal: React.FC<ContractEditModalProps> = ({
  isOpen,
  onClose,
  onContractUpdated,
  userId,
  contract
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
  const [contractType, setContractType] = useState(contract.contractType || 'employment');
  const [startDate, setStartDate] = useState(
    contract.startDate ? new Date(contract.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    contract.endDate ? new Date(contract.endDate).toISOString().split('T')[0] : ''
  );
  const [salary, setSalary] = useState(contract.salary ? contract.salary.toString() : '');
  const [workingHours, setWorkingHours] = useState(contract.workingHours ? contract.workingHours.toString() : '');
  const [position, setPosition] = useState(contract.position || '');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [existingPdfUrl, setExistingPdfUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Prüfe Berechtigung
  useEffect(() => {
    if (!isHR()) {
      showMessage('Nur HR oder Admin können Arbeitsverträge bearbeiten', 'error');
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
      if (contract.id) {
        setExistingPdfUrl(API_ENDPOINTS.LIFECYCLE.CONTRACT_DOWNLOAD(userId, contract.id));
      }
    } else {
      closeSidepane();
    }
    
    return () => {
      closeSidepane();
    };
  }, [isOpen, openSidepane, closeSidepane, contract.id, userId]);

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

    if (!startDate) {
      showMessage('Bitte geben Sie ein Startdatum an', 'error');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const updateData: any = {
        contractType,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        salary: salary ? parseFloat(salary) : null,
        workingHours: workingHours ? parseFloat(workingHours) : null,
        position: position || null
      };

      // Nur pdfPath aktualisieren, wenn neue Datei hochgeladen wurde
      if (pdfFile) {
        updateData.pdfPath = `temp-${Date.now()}-${pdfFile.name}`;
        updateData.templateVersion = contract.templateVersion || '1.0';
      }

      await axiosInstance.put(
        API_ENDPOINTS.LIFECYCLE.CONTRACT(userId, contract.id),
        updateData
      );

      showMessage('Arbeitsvertrag erfolgreich aktualisiert', 'success');
      onContractUpdated();
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
      console.error('Fehler beim Aktualisieren des Arbeitsvertrags:', err);
      setError(err.response?.data?.message || 'Fehler beim Aktualisieren des Arbeitsvertrags');
      showMessage('Fehler beim Aktualisieren des Arbeitsvertrags', 'error');
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
                Arbeitsvertrag bearbeiten
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
                  Vertragstyp <span className="text-red-500">*</span>
                </label>
                <select
                  value={contractType}
                  onChange={(e) => setContractType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                >
                  <option value="employment">Arbeitsvertrag</option>
                  <option value="amendment">Vertragsänderung</option>
                  <option value="extension">Vertragsverlängerung</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Startdatum <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    const value = e.target.value;
                    setStartDate(value);
                    // Wenn Enddatum gesetzt ist, prüfe ob es nach Startdatum liegt
                    if (endDate && value && new Date(endDate) < new Date(value)) {
                      setError('Enddatum muss nach dem Startdatum liegen');
                    } else {
                      setError(null); // Clear error when valid
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:text-white ${
                    error && !startDate 
                      ? 'border-red-500 dark:border-red-500' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  required
                  aria-invalid={!startDate ? true : undefined}
                  aria-describedby={!startDate ? "startDate-error" : undefined}
                />
                {error && !startDate && (
                  <p id="startDate-error" className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {error}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Enddatum (optional)
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    const value = e.target.value;
                    setEndDate(value);
                    // Wenn Enddatum gesetzt wird, prüfe ob es nach Startdatum liegt
                    if (value && startDate && new Date(value) < new Date(startDate)) {
                      setError('Enddatum muss nach dem Startdatum liegen');
                    } else {
                      setError(null); // Clear error when valid
                    }
                  }}
                  min={startDate || undefined}
                  className={`w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:text-white ${
                    error && endDate && startDate && new Date(endDate) < new Date(startDate)
                      ? 'border-red-500 dark:border-red-500' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  aria-invalid={endDate && startDate && new Date(endDate) < new Date(startDate) ? true : undefined}
                  aria-describedby={endDate && startDate && new Date(endDate) < new Date(startDate) ? "endDate-error" : undefined}
                />
                {error && endDate && startDate && new Date(endDate) < new Date(startDate) && (
                  <p id="endDate-error" className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {error}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Position
                </label>
                <input
                  type="text"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  placeholder="z.B. Frontend-Entwickler"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Gehalt (optional)
                </label>
                <div className="relative">
                  <CurrencyDollarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    value={salary}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSalary(value);
                      // Validierung: Gehalt darf nicht negativ sein
                      if (value && parseFloat(value) < 0) {
                        setError('Gehalt darf nicht negativ sein');
                      } else {
                        setError(null); // Clear error when valid
                      }
                    }}
                    className={`w-full pl-10 pr-3 py-2 border rounded-md dark:bg-gray-700 dark:text-white ${
                      error && salary && parseFloat(salary) < 0
                        ? 'border-red-500 dark:border-red-500' 
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    aria-invalid={salary && parseFloat(salary) < 0 ? true : undefined}
                    aria-describedby={salary && parseFloat(salary) < 0 ? "salary-error" : undefined}
                  />
                </div>
                {error && salary && parseFloat(salary) < 0 && (
                  <p id="salary-error" className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {error}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Arbeitsstunden/Woche (optional)
                </label>
                <input
                  type="number"
                  value={workingHours}
                  onChange={(e) => {
                    const value = e.target.value;
                    setWorkingHours(value);
                    // Validierung: Arbeitsstunden müssen zwischen 0 und 168 liegen
                    if (value && (parseFloat(value) < 0 || parseFloat(value) > 168)) {
                      setError('Arbeitsstunden müssen zwischen 0 und 168 liegen');
                    } else {
                      setError(null); // Clear error when valid
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:text-white ${
                    error && workingHours && (parseFloat(workingHours) < 0 || parseFloat(workingHours) > 168)
                      ? 'border-red-500 dark:border-red-500' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="40"
                  step="0.1"
                  min="0"
                  max="168"
                  aria-invalid={workingHours && (parseFloat(workingHours) < 0 || parseFloat(workingHours) > 168) ? true : undefined}
                  aria-describedby={workingHours && (parseFloat(workingHours) < 0 || parseFloat(workingHours) > 168) ? "workingHours-error" : undefined}
                />
                {error && workingHours && (parseFloat(workingHours) < 0 || parseFloat(workingHours) > 168) && (
                  <p id="workingHours-error" className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {error}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Maximal 168 Stunden pro Woche (24h × 7 Tage)
                </p>
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
                          setExistingPdfUrl(API_ENDPOINTS.LIFECYCLE.CONTRACT_DOWNLOAD(userId, contract.id));
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
              disabled={loading || !startDate}
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

export default ContractEditModal;


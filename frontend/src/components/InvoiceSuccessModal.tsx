import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { 
  CheckCircleIcon, 
  XMarkIcon, 
  DocumentArrowDownIcon,
  EyeIcon 
} from '@heroicons/react/24/outline';
import { API_ENDPOINTS } from '../config/api.ts';
import axiosInstance from '../config/axios.ts';
import { useTranslation } from 'react-i18next';
import useMessage from '../hooks/useMessage.ts';

interface InvoiceSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: number;
  invoiceNumber: string;
  totalAmount: string;
  clientName: string;
}

const InvoiceSuccessModal: React.FC<InvoiceSuccessModalProps> = ({
  isOpen,
  onClose,
  invoiceId,
  invoiceNumber,
  totalAmount,
  clientName
}) => {
  const { t } = useTranslation();
  const { showMessage } = useMessage();
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      
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
      
      showMessage(t('invoice.downloadSuccess', { defaultValue: 'PDF erfolgreich heruntergeladen' }), 'success');
    } catch (error: any) {
      console.error('Fehler beim Download der PDF:', error);
      showMessage(error.response?.data?.message || t('invoice.downloadError', { defaultValue: 'Fehler beim Download der PDF' }), 'error');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleViewInvoiceManagement = () => {
    // TODO: Navigation zur Rechnungsverwaltung (wird in Phase 5 implementiert)
    showMessage(t('invoice.invoiceManagementPhase5', { defaultValue: 'Rechnungsverwaltung wird in Phase 5 implementiert' }), 'info');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl">
          <div className="p-6">
            {/* Header mit Success Icon */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <CheckCircleIcon className="h-8 w-8 text-green-500 mr-3" />
                <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white">
                  Rechnung erstellt
                </Dialog.Title>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Success Inhalt */}
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <h3 className="font-medium text-green-800 dark:text-green-200 mb-2">
                  Rechnung erfolgreich erstellt
                </h3>
                <div className="text-sm text-green-700 dark:text-green-300 space-y-1">
                  <p><strong>Rechnungsnummer:</strong> {invoiceNumber}</p>
                  <p><strong>Kunde:</strong> {clientName}</p>
                  <p><strong>Betrag:</strong> CHF {totalAmount}</p>
                </div>
              </div>

              {/* Hinweise */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                  Nächste Schritte
                </h4>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• PDF herunterladen und an Kunde senden</li>
                  <li>• Beratungen sind nun als abgerechnet markiert</li>
                  <li>• Rechnung in der Rechnungsverwaltung verwalten</li>
                </ul>
              </div>
            </div>

            {/* Aktionen */}
            <div className="mt-6 flex flex-col space-y-3">
              <button
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {downloadingPdf ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    PDF wird generiert...
                  </>
                ) : (
                  <>
                    <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                    PDF herunterladen
                  </>
                )}
              </button>

              <button
                onClick={handleViewInvoiceManagement}
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                <EyeIcon className="h-5 w-5 mr-2" />
                Zur Rechnungsverwaltung
              </button>

              <button
                onClick={onClose}
                className="w-full px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                Schließen
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default InvoiceSuccessModal; 
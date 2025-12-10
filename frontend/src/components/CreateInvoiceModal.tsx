import React, { useState, useEffect, useCallback } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, CheckIcon, ArrowPathIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { API_ENDPOINTS } from '../config/api.ts';
import axiosInstance from '../config/axios.ts';
import { usePermissions } from '../hooks/usePermissions.ts';
import useMessage from '../hooks/useMessage.ts';
import { Consultation } from '../types/client.ts';
import { calculateDuration, formatTime } from '../utils/dateUtils.ts';
import { format } from 'date-fns';
import InvoiceSuccessModal from './InvoiceSuccessModal.tsx';

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultations: Consultation[];
  onInvoiceCreated: (invoiceId: number) => void;
}

interface InvoiceSettings {
  companyName: string;
  companyAddress: string;
  companyZip: string;
  companyCity: string;
  companyCountry: string;
  companyPhone?: string;
  companyEmail?: string;
  vatNumber?: string;
  iban: string;
  defaultHourlyRate: number;
  defaultVatRate?: number;
  invoicePrefix: string;
  nextInvoiceNumber: number;
}

interface CreatedInvoice {
  id: number;
  invoiceNumber: string;
  total: number;
  clientName: string;
}

const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({
  isOpen,
  onClose,
  consultations,
  onInvoiceCreated
}) => {
  const { t } = useTranslation();
  const { showMessage } = useMessage();
  const { hasPermission } = usePermissions();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<InvoiceSettings | null>(null);
  const [createdInvoice, setCreatedInvoice] = useState<CreatedInvoice | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [formData, setFormData] = useState({
    issueDate: format(new Date(), 'yyyy-MM-dd'),
    dueDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    hourlyRate: 0,
    vatRate: 0,
    notes: ''
  });

  // Berechtigungsprüfung
  const canCreateInvoices = hasPermission('invoice_create', 'write', 'button');
  
  // loadInvoiceSettings Funktion MUSS vor useEffect definiert werden
  const loadInvoiceSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(API_ENDPOINTS.INVOICE_SETTINGS.BASE);
      const settingsData = response.data;
      
      setSettings(settingsData);
      setFormData(prev => ({
        ...prev,
        hourlyRate: settingsData.defaultHourlyRate || 0,
        vatRate: settingsData.defaultVatRate || 0
      }));
    } catch (error: any) {
      console.error('Fehler beim Laden der Rechnungseinstellungen:', error);
      if (error.response?.status === 404) {
        showMessage(t('invoice.settingsNotConfigured', { defaultValue: 'Bitte konfigurieren Sie zuerst Ihre Rechnungseinstellungen' }), 'error');
      } else {
        showMessage(t('invoice.loadSettingsError', { defaultValue: 'Fehler beim Laden der Rechnungseinstellungen' }), 'error');
      }
    } finally {
      setLoading(false);
    }
  }, []);
  
  // useEffect MUSS vor allen frühen Returns stehen!
  useEffect(() => {
    if (isOpen) {
      loadInvoiceSettings();
    }
  }, [isOpen, loadInvoiceSettings]);

  // Berechtigungsprüfung - NACH useEffect
  if (!canCreateInvoices) {
    return (
      <Dialog open={isOpen} onClose={onClose} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Keine Berechtigung
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Sie haben keine Berechtigung, Rechnungen zu erstellen.
              </p>
              <button
                onClick={onClose}
                className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                title="Schließen"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!settings) {
      showMessage(t('invoice.settingsNotLoaded', { defaultValue: 'Rechnungseinstellungen konnten nicht geladen werden' }), 'error');
      return;
    }

    if (consultations.length === 0) {
      showMessage(t('invoice.noConsultations', { defaultValue: 'Keine Beratungen zum Abrechnen vorhanden' }), 'error');
      return;
    }

    // Validiere, dass alle Consultations den gleichen Client haben
    const uniqueClientIds = [...new Set(consultations.map(c => c.clientId))];
    if (uniqueClientIds.length > 1) {
      showMessage(t('invoice.differentClients', { defaultValue: 'Alle Beratungen müssen den gleichen Kunden haben' }), 'error');
      return;
    }

    const clientId = uniqueClientIds[0];
    if (!clientId) {
      showMessage(t('invoice.noValidClient', { defaultValue: 'Kein gültiger Kunde in den Beratungen gefunden' }), 'error');
      return;
    }

    try {
      setLoading(true);

      const response = await axiosInstance.post(
        API_ENDPOINTS.CONSULTATION_INVOICES.CREATE_FROM_CONSULTATIONS,
        {
          consultationIds: consultations.map(c => c.id),
          clientId: clientId,
          issueDate: formData.issueDate,
          dueDate: formData.dueDate,
          hourlyRate: formData.hourlyRate,
          vatRate: formData.vatRate || 0,
          notes: formData.notes
        }
      );
      
      const invoice = response.data;
      const clientName = consultations[0]?.client?.name || 'Unbekannt';
      
      setCreatedInvoice({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        total: invoice.total,
        clientName: clientName
      });
      
      setShowSuccessModal(true);
      onInvoiceCreated(invoice.id);
      
    } catch (error: any) {
      showMessage(error.response?.data?.message || t('invoice.createError', { defaultValue: 'Fehler beim Erstellen der Rechnung' }), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCloseAll = () => {
    setShowSuccessModal(false);
    setCreatedInvoice(null);
    onClose();
  };

  // Berechnungen für die Kostenübersicht
  const totalHours = consultations.reduce((sum, consultation) => {
    if (consultation.endTime) {
      const duration = calculateDuration(consultation.startTime, consultation.endTime);
      const hours = parseFloat(duration.replace('h', '').replace(',', '.'));
      return sum + hours;
    }
    return sum;
  }, 0);

  const estimatedTotal = totalHours * formData.hourlyRate;
  const vatAmount = formData.vatRate > 0 ? (estimatedTotal * formData.vatRate / 100) : 0;
  const totalWithVat = estimatedTotal + vatAmount;

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen && !showSuccessModal} onClose={onClose} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-2xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl">
            <form onSubmit={handleSubmit} className="p-6">
              <div className="flex items-center justify-between mb-6">
                <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white">
                  Rechnung erstellen
                </Dialog.Title>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Beratungen Übersicht */}
              <div className="mb-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                  Zu verrechnende Beratungen
                </h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {consultations.map((consultation) => (
                    <div key={consultation.id} className="flex justify-between items-center text-sm">
                      <div>
                        <span className="text-gray-900 dark:text-white">
                          {consultation.client?.name} - {formatTime(consultation.startTime)}
                        </span>
                      </div>
                      <span className="text-gray-600 dark:text-gray-400">
                        {calculateDuration(consultation.startTime, consultation.endTime)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 flex justify-between text-sm font-medium">
                  <span>Gesamtdauer:</span>
                  <span>{totalHours.toFixed(2)}h</span>
                </div>
              </div>

              {/* Rechnungsdetails */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Rechnungsdatum
                  </label>
                  <input
                    type="date"
                    name="issueDate"
                    value={formData.issueDate}
                    onChange={handleChange}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Fälligkeitsdatum
                  </label>
                  <input
                    type="date"
                    name="dueDate"
                    value={formData.dueDate}
                    onChange={handleChange}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Stundensatz (CHF)
                  </label>
                  <input
                    type="number"
                    name="hourlyRate"
                    value={formData.hourlyRate}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    MwSt.-Satz (%)
                  </label>
                  <input
                    type="number"
                    name="vatRate"
                    value={formData.vatRate}
                    onChange={handleChange}
                    step="0.1"
                    min="0"
                    max="100"
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {/* Notizen */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Zusätzliche Notizen
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={3}
                  className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Optionale Notizen zur Rechnung..."
                />
              </div>

              {/* Kostenübersicht */}
              <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-3">
                  Kostenübersicht
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Beratungszeit ({totalHours.toFixed(2)}h × CHF {formData.hourlyRate}):</span>
                    <span>CHF {estimatedTotal.toFixed(2)}</span>
                  </div>
                  {formData.vatRate > 0 && (
                    <div className="flex justify-between">
                      <span>MwSt. ({formData.vatRate}%):</span>
                      <span>CHF {vatAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-blue-200 dark:border-blue-700 pt-2 flex justify-between font-medium">
                    <span>Gesamtbetrag:</span>
                    <span>CHF {totalWithVat.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                  title={t('common.cancel')}
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
                <button
                  type="submit"
                  disabled={loading || !settings || totalHours === 0}
                  className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={loading ? 'Erstelle Rechnung...' : 'Rechnung erstellen'}
                >
                  {loading ? (
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                  ) : (
                    <DocumentTextIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Success Modal */}
      {showSuccessModal && createdInvoice && (
        <InvoiceSuccessModal
          isOpen={showSuccessModal}
          onClose={handleCloseAll}
          invoiceId={createdInvoice.id}
          invoiceNumber={createdInvoice.invoiceNumber}
          totalAmount={Number(createdInvoice.total).toFixed(2)}
          clientName={createdInvoice.clientName}
        />
      )}
    </>
  );
};

export default CreateInvoiceModal; 
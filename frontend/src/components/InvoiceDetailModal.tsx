import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { 
  XMarkIcon, 
  DocumentArrowDownIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  UserIcon,
  BuildingOfficeIcon,
  ClockIcon,
  LinkIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { API_ENDPOINTS } from '../config/api.ts';
import axiosInstance from '../config/axios.ts';
import { toast } from 'react-toastify';
import { calculateDuration, formatTime } from '../utils/dateUtils.ts';

interface InvoiceDetail {
  id: number;
  invoiceNumber: string;
  clientId: number;
  userId: number;
  issueDate: string;
  dueDate: string;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  subtotal: number;
  vatRate?: number;
  vatAmount?: number;
  total: number;
  currency: string;
  paymentTerms: string;
  notes?: string;
  pdfPath?: string;
  qrReference?: string;
  createdAt: string;
  updatedAt: string;
  client: {
    id: number;
    name: string;
    company?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  items: Array<{
    id: number;
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    workTime: {
      id: number;
      startTime: string;
      endTime: string;
      notes?: string;
      branch: {
        name: string;
      };
    };
  }>;
  payments: Array<{
    id: number;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    reference?: string;
    notes?: string;
    createdAt: string;
  }>;
}

interface InvoiceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: number;
  onInvoiceUpdated: () => void;
}

const getStatusBadge = (status: InvoiceDetail['status']) => {
  const statusConfig = {
    DRAFT: { label: 'Entwurf', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
    SENT: { label: 'Gesendet', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
    PAID: { label: 'Bezahlt', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
    OVERDUE: { label: 'Überfällig', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
    CANCELLED: { label: 'Storniert', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' }
  };

  const config = statusConfig[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
};

const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  isOpen,
  onClose,
  invoiceId,
  onInvoiceUpdated
}) => {
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMarkingAsPaid, setIsMarkingAsPaid] = useState(false);

  useEffect(() => {
    if (isOpen && invoiceId) {
      loadInvoiceDetails();
    }
  }, [isOpen, invoiceId]);

  const loadInvoiceDetails = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(API_ENDPOINTS.CONSULTATION_INVOICES.BY_ID(invoiceId));
      setInvoice(response.data);
      setError(null);
    } catch (error: any) {
      console.error('Fehler beim Laden der Rechnungsdetails:', error);
      setError('Fehler beim Laden der Rechnungsdetails');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!invoice) return;
    
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.CONSULTATION_INVOICES.GENERATE_PDF(invoice.id),
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
      link.download = `Rechnung_${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF erfolgreich heruntergeladen');
    } catch (error: any) {
      console.error('Fehler beim Download der PDF:', error);
      toast.error(error.response?.data?.message || 'Fehler beim Download der PDF');
    }
  };

  const handleMarkAsPaid = async () => {
    if (!invoice) return;

    try {
      setIsMarkingAsPaid(true);
      
      await axiosInstance.post(
        API_ENDPOINTS.CONSULTATION_INVOICES.MARK_PAID(invoice.id),
        {
          amount: invoice.total,
          paymentDate: new Date().toISOString(),
          paymentMethod: 'Manual',
          reference: 'Manuelle Zahlung'
        }
      );
      
      toast.success('Rechnung als bezahlt markiert');
      loadInvoiceDetails(); // Refresh details
      onInvoiceUpdated(); // Refresh parent list
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Fehler beim Markieren als bezahlt');
    } finally {
      setIsMarkingAsPaid(false);
    }
  };

  const getTotalPaid = () => {
    if (!invoice?.payments) return 0;
    return invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  };

  const getRemainingAmount = () => {
    if (!invoice) return 0;
    return Number(invoice.total) - getTotalPaid();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-4xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white">
                  Rechnungsdetails
                </Dialog.Title>
                {invoice && getStatusBadge(invoice.status)}
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {loading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ) : error ? (
              <div className="text-center text-red-600 dark:text-red-400 py-6">
                {error}
              </div>
            ) : invoice ? (
              <div className="space-y-6">
                {/* Rechnungsinformationen */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Rechnungsinformationen
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Rechnungsnummer
                      </label>
                      <p className="text-gray-900 dark:text-white font-mono">
                        {invoice.invoiceNumber}
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Rechnungsdatum
                      </label>
                      <p className="text-gray-900 dark:text-white">
                        {format(new Date(invoice.issueDate), 'dd.MM.yyyy', { locale: de })}
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Fälligkeitsdatum
                      </label>
                      <p className="text-gray-900 dark:text-white">
                        {format(new Date(invoice.dueDate), 'dd.MM.yyyy', { locale: de })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Client und Berater Informationen */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Client */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-blue-800 dark:text-blue-200 mb-3 flex items-center">
                      <UserIcon className="h-5 w-5 mr-2" />
                      Kunde
                    </h3>
                    <div className="space-y-2 text-sm">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {invoice.client.name}
                      </p>
                      {invoice.client.company && (
                        <p className="text-gray-600 dark:text-gray-400">
                          {invoice.client.company}
                        </p>
                      )}
                      {invoice.client.email && (
                        <p className="text-gray-600 dark:text-gray-400">
                          {invoice.client.email}
                        </p>
                      )}
                      {invoice.client.phone && (
                        <p className="text-gray-600 dark:text-gray-400">
                          {invoice.client.phone}
                        </p>
                      )}
                      {invoice.client.address && (
                        <p className="text-gray-600 dark:text-gray-400">
                          {invoice.client.address}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Berater */}
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-green-800 dark:text-green-200 mb-3 flex items-center">
                      <BuildingOfficeIcon className="h-5 w-5 mr-2" />
                      Berater
                    </h3>
                    <div className="space-y-2 text-sm">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {invoice.user.firstName} {invoice.user.lastName}
                      </p>
                      <p className="text-gray-600 dark:text-gray-400">
                        {invoice.user.email}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Beratungen */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                    <ClockIcon className="h-5 w-5 mr-2" />
                    Abgerechnete Beratungen ({invoice.items.length})
                  </h3>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Datum & Zeit
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Dauer
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Niederlassung
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Stundensatz
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Betrag
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {invoice.items.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                              <div>
                                <div className="font-medium">
                                  {formatTime(item.workTime.startTime)}
                                </div>
                                <div className="text-gray-500 dark:text-gray-400 text-xs">
                                  {format(new Date(item.workTime.startTime), 'dd.MM.yyyy', { locale: de })}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                              {calculateDuration(item.workTime.startTime, item.workTime.endTime)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                              {item.workTime.branch.name}
                            </td>
                            <td className="px-4 py-2 text-right text-sm text-gray-900 dark:text-gray-200">
                              {invoice.currency} {Number(item.unitPrice).toFixed(2)}
                            </td>
                            <td className="px-4 py-2 text-right text-sm text-gray-900 dark:text-gray-200">
                              {invoice.currency} {Number(item.amount).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Rechnungssumme */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Rechnungssumme
                  </h3>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Zwischensumme:</span>
                      <span>{invoice.currency} {Number(invoice.subtotal).toFixed(2)}</span>
                    </div>
                    {invoice.vatRate && invoice.vatAmount && (
                      <div className="flex justify-between">
                        <span>MwSt. ({Number(invoice.vatRate).toFixed(1)}%):</span>
                        <span>{invoice.currency} {Number(invoice.vatAmount).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-2 font-bold">
                      <span>Gesamtbetrag:</span>
                      <span>{invoice.currency} {Number(invoice.total).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Zahlungen */}
                {invoice.payments.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                      <CurrencyDollarIcon className="h-5 w-5 mr-2" />
                      Zahlungen ({invoice.payments.length})
                    </h3>
                    
                    <div className="space-y-3">
                      {invoice.payments.map((payment) => (
                        <div
                          key={payment.id}
                          className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-green-800 dark:text-green-200">
                                {invoice.currency} {Number(payment.amount).toFixed(2)}
                              </p>
                              <p className="text-sm text-green-600 dark:text-green-400">
                                {format(new Date(payment.paymentDate), 'dd.MM.yyyy HH:mm', { locale: de })}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {payment.paymentMethod}
                                {payment.reference && ` - ${payment.reference}`}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {/* Zahlungsübersicht */}
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-blue-600 dark:text-blue-400">Bezahlt:</span>
                            <span className="ml-2 font-medium">
                              {invoice.currency} {getTotalPaid().toFixed(2)}
                            </span>
                          </div>
                          <div>
                            <span className="text-blue-600 dark:text-blue-400">Ausstehend:</span>
                            <span className="ml-2 font-medium">
                              {invoice.currency} {getRemainingAmount().toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notizen */}
                {invoice.notes && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      Notizen
                    </h3>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                      <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                        {invoice.notes}
                      </p>
                    </div>
                  </div>
                )}

                {/* Aktionen */}
                <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={handleDownloadPdf}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                    PDF herunterladen
                  </button>
                  
                  {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && getRemainingAmount() > 0 && (
                    <button
                      onClick={handleMarkAsPaid}
                      disabled={isMarkingAsPaid}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isMarkingAsPaid ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Verarbeitung...
                        </>
                      ) : (
                        <>
                          <CurrencyDollarIcon className="h-5 w-5 mr-2" />
                          Als bezahlt markieren
                        </>
                      )}
                    </button>
                  )}
                  
                  <button
                    onClick={onClose}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Schließen
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default InvoiceDetailModal; 
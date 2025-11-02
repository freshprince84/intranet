import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { IdentificationDocument } from '../types/interfaces.ts';
import * as idDocApi from '../api/identificationDocumentApi.ts';
import useMessage from '../hooks/useMessage.ts';
import IdentificationDocumentForm from './IdentificationDocumentForm.tsx';
import { useAuth } from '../hooks/useAuth.tsx';

interface IdentificationDocumentListProps {
  userId: number;
  isAdmin?: boolean;
}

const IdentificationDocumentList: React.FC<IdentificationDocumentListProps> = ({ userId, isAdmin = false }) => {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<IdentificationDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDocument, setEditingDocument] = useState<IdentificationDocument | null>(null);
  const [isDownloading, setIsDownloading] = useState<number | null>(null);
  const { showMessage } = useMessage();
  const { user: currentUser } = useAuth();

  // Dokumente laden
  const loadDocuments = async () => {
    setLoading(true);
    try {
      const docs = await idDocApi.getUserDocuments(userId);
      setDocuments(docs);
      setError(null);
    } catch (err: any) {
      setError(err.message || t('identificationDocuments.loadError'));
      showMessage(t('identificationDocuments.loadError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Beim Laden der Komponente und wenn sich die userId ändert
  useEffect(() => {
    loadDocuments();
  }, [userId]);

  // Dokument löschen
  const handleDeleteDocument = async (docId: number) => {
    if (window.confirm(t('identificationDocuments.deleteConfirm'))) {
      try {
        await idDocApi.deleteDocument(docId);
        showMessage(t('identificationDocuments.deleteSuccess'), 'success');
        loadDocuments();
      } catch (err: any) {
        showMessage(`${t('identificationDocuments.deleteError')}: ${err.message || 'Unbekannter Fehler'}`, 'error');
      }
    }
  };

  // Dokument verifizieren (nur für Admins)
  const handleVerifyDocument = async (docId: number) => {
    if (!currentUser) {
      showMessage(t('identificationDocuments.notAuthenticated'), 'error');
      return;
    }
    
    try {
      await idDocApi.verifyDocument(docId, currentUser.id);
      showMessage(t('identificationDocuments.verifySuccess'), 'success');
      loadDocuments();
    } catch (err: any) {
      showMessage(`${t('identificationDocuments.verifyError')}: ${err.message || 'Unbekannter Fehler'}`, 'error');
    }
  };

  // Dokument herunterladen
  const handleDownloadDocument = async (docId: number) => {
    setIsDownloading(docId);
    try {
      const url = idDocApi.getDocumentDownloadUrl(docId);
      // Öffnen des Links in einem neuen Tab
      window.open(url, '_blank');
    } catch (err: any) {
      showMessage(`${t('identificationDocuments.downloadError')}: ${err.message || 'Unbekannter Fehler'}`, 'error');
    } finally {
      setIsDownloading(null);
    }
  };

  // Dokumenttyp formatieren
  const formatDocumentType = (type: string): string => {
    const typeMap: Record<string, string> = {
      passport: t('identificationDocuments.types.passport'),
      national_id: t('identificationDocuments.types.national_id'),
      driving_license: t('identificationDocuments.types.driving_license'),
      residence_permit: t('identificationDocuments.types.residence_permit'),
      work_permit: t('identificationDocuments.types.work_permit'),
      tax_id: t('identificationDocuments.types.tax_id'),
      social_security: t('identificationDocuments.types.social_security'),
    };
    
    return typeMap[type] || type;
  };

  // Datum formatieren
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('de-DE');
    } catch {
      return dateString;
    }
  };

  if (showAddForm) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
        <h3 className="text-lg font-medium mb-4">{t('identificationDocuments.addDocument')}</h3>
        <IdentificationDocumentForm
          userId={userId}
          onDocumentSaved={() => {
            setShowAddForm(false);
            loadDocuments();
          }}
          onCancel={() => setShowAddForm(false)}
        />
      </div>
    );
  }

  if (editingDocument) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
        <h3 className="text-lg font-medium mb-4">{t('identificationDocuments.editDocument')}</h3>
        <IdentificationDocumentForm
          userId={userId}
          document={editingDocument}
          onDocumentSaved={() => {
            setEditingDocument(null);
            loadDocuments();
          }}
          onCancel={() => setEditingDocument(null)}
        />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">{t('identificationDocuments.title')}</h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
        >
          {t('identificationDocuments.newDocument')}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
        </div>
      ) : error ? (
        <div className="text-red-600 p-4">{error}</div>
      ) : documents.length === 0 ? (
        <div className="text-gray-500 dark:text-gray-400 p-4">
          {t('identificationDocuments.noDocuments')}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('identificationDocuments.columns.type')}
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('identificationDocuments.columns.number')}
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('identificationDocuments.columns.country')}
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('identificationDocuments.columns.validFrom')}
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('identificationDocuments.columns.validTo')}
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('identificationDocuments.columns.status')}
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('identificationDocuments.columns.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
              {documents.map((doc) => (
                <tr key={doc.id}>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                    {formatDocumentType(doc.documentType)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                    {doc.documentNumber}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                    {doc.issuingCountry}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                    {formatDate(doc.issueDate)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                    {formatDate(doc.expiryDate)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm">
                    {doc.isVerified ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100">
                        {t('identificationDocuments.status.verified')}
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-100">
                        {t('identificationDocuments.status.pending')}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleDownloadDocument(doc.id)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        disabled={isDownloading === doc.id}
                      >
                        {isDownloading === doc.id ? t('identificationDocuments.actions.downloading') : t('identificationDocuments.actions.view')}
                      </button>
                      <button
                        onClick={() => setEditingDocument(doc)}
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                      >
                        {t('identificationDocuments.actions.edit')}
                      </button>
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        {t('identificationDocuments.actions.delete')}
                      </button>
                      {isAdmin && !doc.isVerified && (
                        <button
                          onClick={() => handleVerifyDocument(doc.id)}
                          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                        >
                          {t('identificationDocuments.actions.verify')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default IdentificationDocumentList; 
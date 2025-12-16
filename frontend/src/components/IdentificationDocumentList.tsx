import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { IdentificationDocument } from '../types/interfaces.ts';
import * as idDocApi from '../api/identificationDocumentApi.ts';
import useMessage from '../hooks/useMessage.ts';
import IdentificationDocumentForm from './IdentificationDocumentForm.tsx';
import { useAuth } from '../hooks/useAuth.tsx';
import axiosInstance from '../config/axios.ts';
import { API_ENDPOINTS } from '../config/api.ts';
import { EyeIcon, ArrowDownTrayIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

interface IdentificationDocumentListProps {
  userId: number;
  isAdmin?: boolean;
}

const IdentificationDocumentList = forwardRef<{ loadDocuments: () => void }, IdentificationDocumentListProps>(
  ({ userId, isAdmin = false }, ref) => {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<IdentificationDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDocument, setEditingDocument] = useState<IdentificationDocument | null>(null);
  const [viewingDocument, setViewingDocument] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState<number | null>(null);
  const [previewUrls, setPreviewUrls] = useState<Record<number, string>>({});
  const [loadingPreviews, setLoadingPreviews] = useState<Record<number, boolean>>({});
  const [previewContentTypes, setPreviewContentTypes] = useState<Record<number, string>>({});
  const previewUrlsRef = useRef<Record<number, string>>({});
  const { showMessage } = useMessage();
  const { user: currentUser } = useAuth();

  // Dokumente laden
  const loadDocuments = async () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4b31729e-838f-41ed-a421-2153ac4e6c3c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'IdentificationDocumentList.tsx:27',message:'loadDocuments called',data:{userId,timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    setLoading(true);
    try {
      const docs = await idDocApi.getUserDocuments(userId);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4b31729e-838f-41ed-a421-2153ac4e6c3c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'IdentificationDocumentList.tsx:30',message:'Documents loaded from API',data:{docCount:docs?.length||0,docIds:docs?.map(d=>d.id)||[]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      setDocuments(docs);
      setError(null);
    } catch (err: any) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4b31729e-838f-41ed-a421-2153ac4e6c3c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'IdentificationDocumentList.tsx:33',message:'Error loading documents',data:{error:err.message||'unknown'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      setError(err.message || t('identificationDocuments.loadError'));
      showMessage(t('identificationDocuments.loadError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Beim Laden der Komponente und wenn sich die userId ändert
  useEffect(() => {
    if (userId) {
    loadDocuments();
    }
  }, [userId]);

  // Zusätzlich: Lade auch beim Mount (wenn Komponente sichtbar wird)
  useEffect(() => {
    if (userId) {
      loadDocuments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Leeres Dependency-Array = nur beim Mount

  // Exponiere loadDocuments über Ref
  useImperativeHandle(ref, () => ({
    loadDocuments
  }));

  // Cleanup: Revoke alle Preview URLs beim Unmount
  useEffect(() => {
    previewUrlsRef.current = previewUrls;
  }, [previewUrls]);

  useEffect(() => {
    return () => {
      // Revoke alle Preview URLs beim Unmount
      Object.values(previewUrlsRef.current).forEach(url => {
        window.URL.revokeObjectURL(url);
      });
    };
  }, []);

  // Dokument-Vorschau laden (für Anzeige im iframe)
  const loadDocumentPreview = async (docId: number) => {
    try {
      setLoadingPreviews(prev => ({ ...prev, [docId]: true }));
      const response = await axiosInstance.get(
        `${API_ENDPOINTS.IDENTIFICATION_DOCUMENTS.DOWNLOAD(docId)}?preview=true`,
        { responseType: 'blob' }
      );
      
      // Bestimme MIME-Typ aus Response
      const contentType = response.headers['content-type'] || 'application/pdf';
      const blob = new Blob([response.data], { type: contentType });
      const previewUrl = window.URL.createObjectURL(blob);
      
      setPreviewUrls(prev => ({ ...prev, [docId]: previewUrl }));
      setPreviewContentTypes(prev => ({ ...prev, [docId]: contentType }));
    } catch (err: any) {
      console.error('Fehler beim Laden der Dokument-Vorschau:', err);
      showMessage(t('identificationDocuments.previewError', { defaultValue: 'Vorschau konnte nicht geladen werden' }), 'error');
    } finally {
      setLoadingPreviews(prev => ({ ...prev, [docId]: false }));
    }
  };

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

  // Dokument anzeigen (öffnet Vorschau)
  const handleViewDocument = async (docId: number) => {
    // Wenn Preview bereits geladen, zeige Modal
    if (previewUrls[docId]) {
      setViewingDocument(docId);
      return;
    }
    
    // Sonst lade Preview
    await loadDocumentPreview(docId);
    setViewingDocument(docId);
  };

  // Dokument herunterladen
  const handleDownloadDocument = async (docId: number) => {
    setIsDownloading(docId);
    try {
      // Verwende axios mit responseType: 'blob' für authentifizierten Download
      const response = await axiosInstance.get(
        API_ENDPOINTS.IDENTIFICATION_DOCUMENTS.DOWNLOAD(docId),
        { responseType: 'blob' }
      );
      
      // Erstelle Download-Link aus Blob
      const contentType = response.headers['content-type'] || 'application/pdf';
      const blob = new Blob([response.data], { type: contentType });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      // Versuche Dateinamen aus Content-Disposition Header zu extrahieren
      const contentDisposition = response.headers['content-disposition'];
      let fileName = `document-${docId}`;
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (fileNameMatch) {
          fileName = decodeURIComponent(fileNameMatch[1]);
        }
      }
      
      // Bestimme Dateiendung basierend auf Content-Type
      if (!fileName.includes('.')) {
        if (contentType === 'application/pdf') {
          fileName += '.pdf';
        } else if (contentType.startsWith('image/jpeg')) {
          fileName += '.jpg';
        } else if (contentType.startsWith('image/png')) {
          fileName += '.png';
        }
      }
      
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      showMessage(t('identificationDocuments.downloadSuccess', { defaultValue: 'Dokument erfolgreich heruntergeladen' }), 'success');
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

  // Dokument-Vorschau Modal
  if (viewingDocument !== null) {
    const doc = documents.find(d => d.id === viewingDocument);
    const previewUrl = previewUrls[viewingDocument];
    const isLoading = loadingPreviews[viewingDocument];
    const contentType = previewContentTypes[viewingDocument] || 'application/pdf';
    const isImage = contentType.startsWith('image/');

    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">
            {doc ? formatDocumentType(doc.documentType) : t('identificationDocuments.viewDocument', { defaultValue: 'Dokument anzeigen' })}
          </h3>
          <div className="flex space-x-2">
            <button
              onClick={() => handleDownloadDocument(viewingDocument)}
              className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
              disabled={isDownloading === viewingDocument}
            >
              {isDownloading === viewingDocument ? t('identificationDocuments.actions.downloading') : t('identificationDocuments.actions.download', { defaultValue: 'Herunterladen' })}
            </button>
            <button
              onClick={() => {
                setViewingDocument(null);
                // Cleanup: Revoke URL nach 1 Sekunde (wenn Modal geschlossen wird)
                setTimeout(() => {
                  if (previewUrls[viewingDocument]) {
                    window.URL.revokeObjectURL(previewUrls[viewingDocument]);
                    setPreviewUrls(prev => {
                      const newUrls = { ...prev };
                      delete newUrls[viewingDocument];
                      return newUrls;
                    });
                    setPreviewContentTypes(prev => {
                      const newTypes = { ...prev };
                      delete newTypes[viewingDocument];
                      return newTypes;
                    });
                  }
                }, 1000);
              }}
              className="px-3 py-1 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700"
            >
              {t('common.close', { defaultValue: 'Schließen' })}
            </button>
          </div>
        </div>
        <div className="border rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-700/50">
          {isLoading ? (
            <div className="flex justify-center items-center" style={{ height: '400px' }}>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : previewUrl ? (
            isImage ? (
              <div className="flex justify-center items-center" style={{ maxHeight: '80vh' }}>
                <img
                  src={previewUrl}
                  alt={doc ? formatDocumentType(doc.documentType) : 'Dokument'}
                  className="max-h-[80vh] w-full object-contain"
                />
              </div>
            ) : (
              <iframe 
                src={`${previewUrl}#view=FitH`}
                className="w-full rounded border dark:border-gray-600"
                style={{ height: '80vh' }}
                title={doc ? formatDocumentType(doc.documentType) : 'Dokument'}
              />
            )
          ) : (
            <div className="flex justify-center items-center text-gray-500 dark:text-gray-400" style={{ height: '400px' }}>
              <p>{t('identificationDocuments.previewError', { defaultValue: 'Vorschau konnte nicht geladen werden' })}</p>
            </div>
          )}
        </div>
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
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleViewDocument(doc.id)}
                        className="p-2 rounded-md text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        disabled={loadingPreviews[doc.id]}
                        title={t('identificationDocuments.actions.view')}
                      >
                        {loadingPreviews[doc.id] ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        ) : (
                          <EyeIcon className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDownloadDocument(doc.id)}
                        className="p-2 rounded-md text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                        disabled={isDownloading === doc.id}
                        title={t('identificationDocuments.actions.download', { defaultValue: 'Herunterladen' })}
                      >
                        {isDownloading === doc.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                        ) : (
                          <ArrowDownTrayIcon className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        onClick={() => setEditingDocument(doc)}
                        className="p-2 rounded-md text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                        title={t('identificationDocuments.actions.edit')}
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="p-2 rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        title={t('identificationDocuments.actions.delete')}
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                      {isAdmin && !doc.isVerified && (
                        <button
                          onClick={() => handleVerifyDocument(doc.id)}
                          className="p-2 rounded-md text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                          title={t('identificationDocuments.actions.verify')}
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
});

export default IdentificationDocumentList; 
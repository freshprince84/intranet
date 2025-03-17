import React, { useState, useEffect } from 'react';
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
      setError(err.message || 'Fehler beim Laden der Dokumente');
      showMessage('Fehler beim Laden der Dokumente', 'error');
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
    if (window.confirm('Sind Sie sicher, dass Sie dieses Dokument löschen möchten?')) {
      try {
        await idDocApi.deleteDocument(docId);
        showMessage('Dokument erfolgreich gelöscht', 'success');
        loadDocuments();
      } catch (err: any) {
        showMessage(`Fehler beim Löschen: ${err.message || 'Unbekannter Fehler'}`, 'error');
      }
    }
  };

  // Dokument verifizieren (nur für Admins)
  const handleVerifyDocument = async (docId: number) => {
    if (!currentUser) {
      showMessage('Benutzer nicht authentifiziert', 'error');
      return;
    }
    
    try {
      await idDocApi.verifyDocument(docId, currentUser.id);
      showMessage('Dokument erfolgreich verifiziert', 'success');
      loadDocuments();
    } catch (err: any) {
      showMessage(`Fehler bei der Verifizierung: ${err.message || 'Unbekannter Fehler'}`, 'error');
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
      showMessage(`Fehler beim Herunterladen: ${err.message || 'Unbekannter Fehler'}`, 'error');
    } finally {
      setIsDownloading(null);
    }
  };

  // Dokumenttyp formatieren
  const formatDocumentType = (type: string): string => {
    const typeMap: Record<string, string> = {
      passport: 'Reisepass',
      national_id: 'Personalausweis',
      driving_license: 'Führerschein',
      residence_permit: 'Aufenthaltserlaubnis',
      work_permit: 'Arbeitserlaubnis',
      tax_id: 'Steuer-ID',
      social_security: 'Sozialversicherungsausweis',
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
        <h3 className="text-lg font-medium mb-4">Neues Dokument hinzufügen</h3>
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
        <h3 className="text-lg font-medium mb-4">Dokument bearbeiten</h3>
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
        <h3 className="text-lg font-medium">Identifikationsdokumente</h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
        >
          Neues Dokument
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
          Keine Dokumente vorhanden. Fügen Sie ein neues Dokument hinzu.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Typ
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Nummer
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Land
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Gültig von
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Gültig bis
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Aktionen
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
                        Verifiziert
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-100">
                        Ausstehend
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
                        {isDownloading === doc.id ? 'Lädt...' : 'Anzeigen'}
                      </button>
                      <button
                        onClick={() => setEditingDocument(doc)}
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                      >
                        Bearbeiten
                      </button>
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Löschen
                      </button>
                      {isAdmin && !doc.isVerified && (
                        <button
                          onClick={() => handleVerifyDocument(doc.id)}
                          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                        >
                          Verifizieren
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
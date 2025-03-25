import apiClient from './apiClient.ts';
import { API_URL, API_ENDPOINTS } from '../config/api.ts';
import { IdentificationDocument } from '../types/interfaces.ts';

// Alle Dokumente eines Benutzers abrufen
export const getUserDocuments = async (userId: number): Promise<IdentificationDocument[]> => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.IDENTIFICATION_DOCUMENTS.BY_USER(userId));
    return response.data;
  } catch (error) {
    console.error('Fehler beim Abrufen der Identifikationsdokumente:', error);
    throw error;
  }
};

// Dokument hinzufügen mit Datei-Upload
export const addDocumentWithFile = async (
  userId: number,
  formData: FormData
): Promise<IdentificationDocument> => {
  try {
    const response = await apiClient.post(
      API_ENDPOINTS.IDENTIFICATION_DOCUMENTS.BY_USER(userId),
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Fehler beim Hinzufügen des Dokuments:', error);
    throw error;
  }
};

// Dokument hinzufügen mit Kamerabild
export const addDocumentWithCameraImage = async (
  userId: number,
  imageData: string,
  documentData: {
    documentType: string;
    documentNumber: string;
    issuingCountry: string;
    issueDate?: string;
    expiryDate?: string;
    issuingAuthority?: string;
  }
): Promise<IdentificationDocument> => {
  try {
    const response = await apiClient.post(
      API_ENDPOINTS.IDENTIFICATION_DOCUMENTS.BY_USER(userId),
      {
        ...documentData,
        imageData
      }
    );
    return response.data;
  } catch (error) {
    console.error('Fehler beim Hinzufügen des Dokuments mit Kamera:', error);
    throw error;
  }
};

// Dokument aktualisieren mit Datei-Upload
export const updateDocumentWithFile = async (
  docId: number,
  formData: FormData
): Promise<IdentificationDocument> => {
  try {
    const response = await apiClient.put(
      API_ENDPOINTS.IDENTIFICATION_DOCUMENTS.BY_ID(docId),
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Dokuments:', error);
    throw error;
  }
};

// Dokument aktualisieren mit Kamerabild
export const updateDocumentWithCameraImage = async (
  docId: number,
  imageData: string,
  documentData: {
    documentNumber?: string;
    issuingCountry?: string;
    issueDate?: string;
    expiryDate?: string;
    issuingAuthority?: string;
  }
): Promise<IdentificationDocument> => {
  try {
    const response = await apiClient.put(
      API_ENDPOINTS.IDENTIFICATION_DOCUMENTS.BY_ID(docId),
      {
        ...documentData,
        imageData
      }
    );
    return response.data;
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Dokuments mit Kamera:', error);
    throw error;
  }
};

// Dokument löschen
export const deleteDocument = async (docId: number): Promise<void> => {
  try {
    await apiClient.delete(API_ENDPOINTS.IDENTIFICATION_DOCUMENTS.BY_ID(docId));
  } catch (error) {
    console.error('Fehler beim Löschen des Dokuments:', error);
    throw error;
  }
};

// Dokument verifizieren
export const verifyDocument = async (docId: number, adminId: number): Promise<void> => {
  try {
    await apiClient.post(
      API_ENDPOINTS.IDENTIFICATION_DOCUMENTS.VERIFY(docId),
      { adminId }
    );
  } catch (error) {
    console.error('Fehler bei der Verifizierung des Dokuments:', error);
    throw error;
  }
};

// URL für das Herunterladen des Dokuments generieren
export const getDocumentDownloadUrl = (docId: number): string => {
  // Verwende window.location.origin für eine robuste absolute URL
  return `${window.location.origin}/api${API_ENDPOINTS.IDENTIFICATION_DOCUMENTS.DOWNLOAD(docId)}`;
}; 
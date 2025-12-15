import { recognizeDocumentWithAI } from './aiDocumentRecognition.ts';
import axiosInstance from '../config/axios.ts';

export interface DocumentUploadResult {
  success: boolean;
  message: string;
}

export const handleDirectDocumentUpload = async (
  file: File,
  userId: number,
  onSuccess?: () => void,
  onError?: (error: string) => void
): Promise<DocumentUploadResult> => {
  try {
    // 1. Konvertiere zu base64
    const imageData = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    
    // 2. KI-Erkennung
    const recognizedData = await recognizeDocumentWithAI(imageData);
    
    // 3. Dokument speichern
    const formData = new FormData();
    formData.append('documentFile', file);
    if (recognizedData.documentType) formData.append('documentType', recognizedData.documentType);
    if (recognizedData.documentNumber) formData.append('documentNumber', recognizedData.documentNumber);
    if (recognizedData.issueDate) formData.append('issueDate', recognizedData.issueDate);
    if (recognizedData.expiryDate) formData.append('expiryDate', recognizedData.expiryDate);
    if (recognizedData.issuingCountry) formData.append('issuingCountry', recognizedData.issuingCountry);
    if (recognizedData.firstName) formData.append('firstName', recognizedData.firstName);
    if (recognizedData.lastName) formData.append('lastName', recognizedData.lastName);
    if (recognizedData.birthday) formData.append('birthday', recognizedData.birthday);
    if (recognizedData.gender) formData.append('gender', recognizedData.gender);
    if (recognizedData.country) formData.append('country', recognizedData.country);
    
    await axiosInstance.post(`/identification-documents/${userId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    
    if (onSuccess) onSuccess();
    
    return {
      success: true,
      message: 'Dokument erfolgreich hochgeladen'
    };
  } catch (error: any) {
    const errorMessage = error.response?.data?.error || error.message || 'Fehler beim Hochladen des Dokuments';
    if (onError) onError(errorMessage);
    return {
      success: false,
      message: errorMessage
    };
  }
};


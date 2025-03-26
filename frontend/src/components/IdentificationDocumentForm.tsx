import React, { useState, useEffect } from 'react';
import { IdentificationDocument } from '../types/interfaces.ts';
import * as idDocApi from '../api/identificationDocumentApi.ts';
import useMessage from '../hooks/useMessage.ts';
import { isMobile } from '../utils/deviceDetection.ts';
import CameraCapture from './CameraCapture.tsx';
import { recognizeDocument } from '../utils/documentRecognition.ts';
import { recognizeDocumentWithAI } from '../utils/aiDocumentRecognition.ts';
import { CameraIcon, DocumentTextIcon, ArrowPathIcon as SpinnerIcon } from '@heroicons/react/24/outline';

// Liste der Dokumenttypen
const documentTypes = [
  { value: 'passport', label: 'Reisepass' },
  { value: 'national_id', label: 'Personalausweis' },
  { value: 'driving_license', label: 'Führerschein' },
  { value: 'residence_permit', label: 'Aufenthaltserlaubnis' },
  { value: 'work_permit', label: 'Arbeitserlaubnis' },
  { value: 'tax_id', label: 'Steuer-ID' },
  { value: 'social_security', label: 'Sozialversicherungsausweis' },
];

interface IdentificationDocumentFormProps {
  userId: number;
  document?: IdentificationDocument;
  onDocumentSaved: () => void;
  onCancel: () => void;
}

const IdentificationDocumentForm: React.FC<IdentificationDocumentFormProps> = ({
  userId,
  document,
  onDocumentSaved,
  onCancel,
}) => {
  const [documentType, setDocumentType] = useState(document?.documentType || '');
  const [documentNumber, setDocumentNumber] = useState(document?.documentNumber || '');
  const [issueDate, setIssueDate] = useState(document?.issueDate ? document.issueDate.substring(0, 10) : '');
  const [expiryDate, setExpiryDate] = useState(document?.expiryDate ? document.expiryDate.substring(0, 10) : '');
  const [issuingCountry, setIssuingCountry] = useState(document?.issuingCountry || '');
  const [issuingAuthority, setIssuingAuthority] = useState(document?.issuingAuthority || '');
  const [file, setFile] = useState<File | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState<boolean>(false);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  
  const { showMessage } = useMessage();
  
  // Behandle Änderungen der Datei
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setImageData(null); // Zurücksetzen des Kamerabilds, wenn eine Datei ausgewählt wird
    }
  };
  
  // Behandle Kameraaufnahme
  const handleCameraCapture = (capturedImageData: string) => {
    setImageData(capturedImageData);
    setShowCamera(false);
    setFile(null); // Zurücksetzen der Datei, wenn ein Bild aufgenommen wird
  };
  
  // Abbrechen der Kameraaufnahme
  const handleCameraCancel = () => {
    setShowCamera(false);
  };
  
  // Funktion zur automatischen Dokumentenerkennung
  const handleAutoRecognize = async () => {
    try {
      setIsRecognizing(true);
      setRecognitionError(null);
      
      // Stelle sicher, dass ein Bild vorhanden ist
      if (!file && !imageData) {
        throw new Error("Bitte lade zuerst ein Dokument hoch oder nimm ein Foto auf");
      }
      
      // Verwende das hochgeladene Bild oder das aufgenommene Foto
      let documentImage: string | null = null;
      
      if (file) {
        // Konvertiere Datei zu base64
        documentImage = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      } else if (imageData) {
        documentImage = imageData;
      }
      
      if (!documentImage) {
        throw new Error("Kann keine Bilddaten finden");
      }
      
      // KI-basierte Dokumentenerkennung starten
      const recognizedData = await recognizeDocumentWithAI(documentImage);
      
      console.log("Erkannte Daten:", recognizedData);
      
      // Formularfelder mit erkannten Daten befüllen
      if (recognizedData.documentType) {
        setDocumentType(recognizedData.documentType);
      }
      
      if (recognizedData.documentNumber) {
        setDocumentNumber(recognizedData.documentNumber);
      }
      
      if (recognizedData.issueDate) {
        setIssueDate(recognizedData.issueDate);
      }
      
      if (recognizedData.expiryDate) {
        setExpiryDate(recognizedData.expiryDate);
      }
      
      if (recognizedData.issuingCountry) {
        setIssuingCountry(recognizedData.issuingCountry);
      }
      
      if (recognizedData.issuingAuthority) {
        setIssuingAuthority(recognizedData.issuingAuthority);
      }
      
      // Erfolgsmeldung anzeigen
      showMessage('Dokument wurde erfolgreich erkannt', 'success');
      
    } catch (error) {
      console.error("Fehler bei der automatischen Erkennung:", error);
      setRecognitionError((error as Error).message);
      showMessage('Fehler bei der Dokumentenerkennung: ' + (error as Error).message, 'error');
    } finally {
      setIsRecognizing(false);
    }
  };
  
  // Formular absenden
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!documentType || !documentNumber || !issuingCountry) {
      showMessage('Bitte füllen Sie alle Pflichtfelder aus', 'error');
      return;
    }
    
    setIsLoading(true);
    
    try {
      if (document) {
        // Aktualisieren eines bestehenden Dokuments
        if (file) {
          // Mit Datei aktualisieren
          const formData = new FormData();
          if (documentNumber) formData.append('documentNumber', documentNumber);
          if (issueDate) formData.append('issueDate', issueDate);
          if (expiryDate) formData.append('expiryDate', expiryDate);
          if (issuingCountry) formData.append('issuingCountry', issuingCountry);
          if (issuingAuthority) formData.append('issuingAuthority', issuingAuthority);
          formData.append('documentFile', file);
          
          await idDocApi.updateDocumentWithFile(document.id, formData);
        } else if (imageData) {
          // Mit Kamerabild aktualisieren
          await idDocApi.updateDocumentWithCameraImage(
            document.id,
            imageData,
            {
              documentNumber,
              issuingCountry,
              issueDate,
              expiryDate,
              issuingAuthority
            }
          );
        } else {
          // Nur Textdaten aktualisieren
          const formData = new FormData();
          if (documentNumber) formData.append('documentNumber', documentNumber);
          if (issueDate) formData.append('issueDate', issueDate);
          if (expiryDate) formData.append('expiryDate', expiryDate);
          if (issuingCountry) formData.append('issuingCountry', issuingCountry);
          if (issuingAuthority) formData.append('issuingAuthority', issuingAuthority);
          
          await idDocApi.updateDocumentWithFile(document.id, formData);
        }
        
        showMessage('Dokument erfolgreich aktualisiert', 'success');
      } else {
        // Erstellen eines neuen Dokuments
        if (file) {
          // Mit Datei erstellen
          const formData = new FormData();
          formData.append('documentType', documentType);
          formData.append('documentNumber', documentNumber);
          formData.append('issuingCountry', issuingCountry);
          if (issueDate) formData.append('issueDate', issueDate);
          if (expiryDate) formData.append('expiryDate', expiryDate);
          if (issuingAuthority) formData.append('issuingAuthority', issuingAuthority);
          formData.append('documentFile', file);
          
          await idDocApi.addDocumentWithFile(userId, formData);
        } else if (imageData) {
          // Mit Kamerabild erstellen
          await idDocApi.addDocumentWithCameraImage(
            userId,
            imageData,
            {
              documentType,
              documentNumber,
              issuingCountry,
              issueDate,
              expiryDate,
              issuingAuthority
            }
          );
        } else {
          // Ohne Bild erstellen
          const formData = new FormData();
          formData.append('documentType', documentType);
          formData.append('documentNumber', documentNumber);
          formData.append('issuingCountry', issuingCountry);
          if (issueDate) formData.append('issueDate', issueDate);
          if (expiryDate) formData.append('expiryDate', expiryDate);
          if (issuingAuthority) formData.append('issuingAuthority', issuingAuthority);
          
          await idDocApi.addDocumentWithFile(userId, formData);
        }
        
        showMessage('Dokument erfolgreich hinzugefügt', 'success');
      }
      
      onDocumentSaved();
    } catch (error: any) {
      showMessage(`Fehler: ${error.response?.data?.error || 'Unbekannter Fehler'}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Wenn die Kamera angezeigt wird
  if (showCamera) {
    return <CameraCapture onCapture={handleCameraCapture} onCancel={handleCameraCancel} />;
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="documentType" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Dokumenttyp <span className="text-red-600 dark:text-red-400">*</span>
        </label>
        <select
          id="documentType"
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value)}
          className="mt-1 block w-full py-2 px-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:text-white"
          required
        >
          <option value="">Bitte auswählen</option>
          {documentTypes.map((type) => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
      </div>
      
      <div>
        <label htmlFor="documentNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Dokumentnummer <span className="text-red-600 dark:text-red-400">*</span>
        </label>
        <input
          type="text"
          id="documentNumber"
          value={documentNumber}
          onChange={(e) => setDocumentNumber(e.target.value)}
          className="mt-1 block w-full py-2 px-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:text-white"
          required
        />
      </div>
      
      <div>
        <label htmlFor="issuingCountry" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Ausstellungsland <span className="text-red-600 dark:text-red-400">*</span>
        </label>
        <input
          type="text"
          id="issuingCountry"
          value={issuingCountry}
          onChange={(e) => setIssuingCountry(e.target.value)}
          className="mt-1 block w-full py-2 px-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:text-white"
          required
        />
      </div>
      
      <div>
        <label htmlFor="issuingAuthority" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Ausstellende Behörde
        </label>
        <input
          type="text"
          id="issuingAuthority"
          value={issuingAuthority}
          onChange={(e) => setIssuingAuthority(e.target.value)}
          className="mt-1 block w-full py-2 px-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:text-white"
        />
      </div>
      
      <div>
        <label htmlFor="issueDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Ausstellungsdatum
        </label>
        <input
          type="date"
          id="issueDate"
          value={issueDate}
          onChange={(e) => setIssueDate(e.target.value)}
          className="mt-1 block w-full py-2 px-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:text-white"
        />
      </div>
      
      <div>
        <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Ablaufdatum
        </label>
        <input
          type="date"
          id="expiryDate"
          value={expiryDate}
          onChange={(e) => setExpiryDate(e.target.value)}
          className="mt-1 block w-full py-2 px-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:text-white"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Dokumentbild
        </label>
        <div className="mt-1 flex items-center space-x-2">
          <label className="flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer">
            <DocumentTextIcon className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400" />
            Datei hochladen
            <input type="file" className="sr-only" onChange={handleFileChange} accept="image/*" />
          </label>
          
          {isMobile() && (
            <button
              type="button"
              onClick={() => setShowCamera(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              <CameraIcon className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400" />
              Foto aufnehmen
            </button>
          )}
          
          <button
            type="button"
            onClick={handleAutoRecognize}
            disabled={isRecognizing || (!file && !imageData)}
            className={`inline-flex items-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium ${
              isRecognizing || (!file && !imageData)
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-300 dark:border-gray-700 cursor-not-allowed'
                : 'border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50'
            }`}
          >
            {isRecognizing ? (
              <>
                <SpinnerIcon className="h-5 w-5 mr-2 animate-spin" />
                Erkennung läuft...
              </>
            ) : (
              'Automatisch erkennen'
            )}
          </button>
        </div>
        
        {file && (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Ausgewählte Datei: {file.name}
          </p>
        )}
        
        {imageData && (
          <div className="mt-2">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Aufgenommenes Bild:</p>
            <img src={imageData} alt="Aufgenommenes Dokument" className="max-h-40 border dark:border-gray-700 rounded" />
          </div>
        )}
        
        {recognitionError && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
            Fehler bei der Erkennung: {recognitionError}
          </p>
        )}
      </div>
      
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
        >
          Abbrechen
        </button>
        
        <button
          type="submit"
          className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
          disabled={isLoading}
        >
          {isLoading ? 'Wird gespeichert...' : document ? 'Aktualisieren' : 'Speichern'}
        </button>
      </div>
    </form>
  );
};

export default IdentificationDocumentForm; 
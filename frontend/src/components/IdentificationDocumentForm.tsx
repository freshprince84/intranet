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
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="documentType">
          Dokumenttyp *
        </label>
        <select
          id="documentType"
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
          disabled={document !== undefined}  // Typ kann bei bestehenden Dokumenten nicht geändert werden
        >
          <option value="">Bitte auswählen</option>
          {documentTypes.map((type) => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="documentNumber">
          Dokumentnummer *
        </label>
        <input
          type="text"
          id="documentNumber"
          value={documentNumber}
          onChange={(e) => setDocumentNumber(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
        />
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="issuingCountry">
          Ausstellendes Land *
        </label>
        <input
          type="text"
          id="issuingCountry"
          value={issuingCountry}
          onChange={(e) => setIssuingCountry(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
        />
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="issuingAuthority">
          Ausstellende Behörde
        </label>
        <input
          type="text"
          id="issuingAuthority"
          value={issuingAuthority}
          onChange={(e) => setIssuingAuthority(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="issueDate">
            Ausstellungsdatum
          </label>
          <input
            type="date"
            id="issueDate"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="expiryDate">
            Ablaufdatum
          </label>
          <input
            type="date"
            id="expiryDate"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Dokument
        </label>
        
        <div className="mt-1 flex items-center space-x-2">
          <input
            type="file"
            id="documentFile"
            onChange={handleFileChange}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm"
            accept="image/*,application/pdf"
          />
          {isMobile() && (
            <button
              type="button"
              onClick={() => setShowCamera(true)}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <CameraIcon className="h-4 w-4 mr-1" />
              Foto
            </button>
          )}
          
          {(file || imageData) && (
            <button
              type="button"
              onClick={handleAutoRecognize}
              disabled={isRecognizing}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400"
            >
              {isRecognizing ? (
                <>
                  <SpinnerIcon className="animate-spin h-4 w-4 mr-1" />
                  Erkennung läuft...
                </>
              ) : (
                <>
                  <DocumentTextIcon className="h-4 w-4 mr-1" />
                  Daten automatisch erkennen
                </>
              )}
            </button>
          )}
        </div>
        
        {recognitionError && (
          <p className="mt-1 text-sm text-red-600">
            {recognitionError}
          </p>
        )}
        
        {imageData && (
          <div className="mt-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">Bild aufgenommen</p>
            <img 
              src={imageData} 
              alt="Vorschau" 
              className="mt-1 h-32 object-contain border border-gray-300 rounded"
            />
          </div>
        )}
        
        {document?.documentFile && !file && !imageData && (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Aktuelles Dokument vorhanden. Neues Dokument hochladen oder Foto aufnehmen, um es zu ersetzen.
          </p>
        )}
      </div>
      
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? 'Wird gespeichert...' : document ? 'Aktualisieren' : 'Speichern'}
        </button>
      </div>
    </form>
  );
};

export default IdentificationDocumentForm; 
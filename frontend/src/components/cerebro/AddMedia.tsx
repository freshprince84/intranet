import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { cerebroApi } from '../../api/cerebroApi.ts';
import { usePermissions } from '../../hooks/usePermissions.ts';

const AddMedia: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Zustand
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  
  // Überprüfen der Berechtigungen
  const canAddMedia = hasPermission('cerebro_media', 'write', 'cerebro');
  
  // Datei auswählen
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      setSelectedFile(null);
      setFileName('');
      return;
    }
    
    const file = files[0];
    setSelectedFile(file);
    setFileName(file.name);
    
    // Prüfen, ob der Dateityp unterstützt wird
    if (!isFileTypeSupported(file)) {
      setError('Dieser Dateityp wird nicht unterstützt. Erlaubt sind Bilder, PDFs und Videos.');
    } else {
      setError(null);
    }
  };
  
  // Prüfen, ob der Dateityp unterstützt wird
  const isFileTypeSupported = (file: File): boolean => {
    const supportedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'video/mp4',
      'video/webm'
    ];
    
    return supportedTypes.includes(file.type);
  };
  
  // Datei hochladen Button
  const handleSelectFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Dateinamen ändern
  const handleFileNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileName(e.target.value);
  };
  
  // Formular absenden
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      setError('Bitte wählen Sie eine Datei aus.');
      return;
    }
    
    if (!fileName.trim()) {
      setError('Bitte geben Sie einen Dateinamen ein.');
      return;
    }
    
    if (!slug) {
      setError('Artikel-ID fehlt.');
      return;
    }
    
    if (!isFileTypeSupported(selectedFile)) {
      setError('Dieser Dateityp wird nicht unterstützt. Erlaubt sind Bilder, PDFs und Videos.');
      return;
    }
    
    try {
      setLoading(true);
      setProgress(0);
      
      // FormData erstellen
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('filename', fileName.trim());
      formData.append('carticleSlug', slug);
      
      // Medien hochladen mit Fortschrittsanzeige
      await cerebroApi.media.uploadMedia(formData, (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        setProgress(percentCompleted);
      });
      
      // Zurück zum Artikel navigieren
      navigate(`/cerebro/${slug}`);
    } catch (err) {
      console.error('Fehler beim Hochladen der Datei:', err);
      setError('Fehler beim Hochladen der Datei. Bitte versuchen Sie es später erneut.');
      setLoading(false);
    }
  };
  
  // Keine Berechtigung
  if (!canAddMedia) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Sie haben keine Berechtigung, Medien hinzuzufügen.
        </div>
        <button
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
          onClick={() => navigate(`/cerebro/${slug}`)}
        >
          Zurück zum Artikel
        </button>
      </div>
    );
  }
  
  // Dateityp-Icon bestimmen
  const getFileTypeIcon = () => {
    if (!selectedFile) return null;
    
    const fileType = selectedFile.type;
    
    if (fileType.startsWith('image/')) {
      return (
        <div className="w-full max-h-60 overflow-hidden bg-gray-100 border rounded mb-4">
          <img 
            src={URL.createObjectURL(selectedFile)} 
            alt="Vorschau" 
            className="w-full h-auto object-contain max-h-60"
          />
        </div>
      );
    }
    
    if (fileType === 'application/pdf') {
      return (
        <div className="flex items-center justify-center h-32 bg-red-50 border rounded mb-4">
          <div className="text-center">
            <div className="text-red-600 text-4xl mb-2">PDF</div>
            <div className="text-sm text-gray-600">{selectedFile.name}</div>
          </div>
        </div>
      );
    }
    
    if (fileType.startsWith('video/')) {
      return (
        <div className="w-full max-h-60 overflow-hidden bg-gray-100 border rounded mb-4">
          <video 
            src={URL.createObjectURL(selectedFile)} 
            controls
            className="w-full h-auto max-h-60"
          >
            Ihr Browser unterstützt das Video-Tag nicht.
          </video>
        </div>
      );
    }
    
    return (
      <div className="flex items-center justify-center h-32 bg-gray-50 border rounded mb-4">
        <div className="text-center">
          <div className="text-gray-600 text-4xl mb-2">Datei</div>
          <div className="text-sm text-gray-600">{selectedFile.name}</div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Medien hinzufügen</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit}>
          {/* Dateivorschau */}
          {selectedFile ? (
            getFileTypeIcon()
          ) : (
            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center mb-4 cursor-pointer hover:border-blue-500 transition-colors"
              onClick={handleSelectFile}
            >
              <div className="text-gray-500">
                <div className="text-4xl mb-2">+</div>
                <p>Klicken Sie, um eine Datei auszuwählen</p>
                <p className="text-sm mt-1">
                  Unterstützte Dateitypen: JPG, PNG, GIF, WEBP, PDF, MP4, WEBM
                </p>
              </div>
            </div>
          )}
          
          {/* Verstecktes Datei-Input-Feld */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,video/mp4,video/webm"
          />
          
          {/* Dateiname */}
          <div className="mb-4">
            <label htmlFor="fileName" className="block text-gray-700 font-medium mb-2">
              Dateiname *
            </label>
            <input
              type="text"
              id="fileName"
              value={fileName}
              onChange={handleFileNameChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Dateiname"
              required
            />
          </div>
          
          {/* Datei auswählen Button */}
          <div className="mb-6">
            <button
              type="button"
              onClick={handleSelectFile}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              {selectedFile ? 'Andere Datei auswählen' : 'Datei auswählen'}
            </button>
            {selectedFile && (
              <span className="ml-2 text-sm text-gray-600">
                Dateigröße: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </span>
            )}
          </div>
          
          {/* Fortschrittsanzeige */}
          {loading && progress > 0 && (
            <div className="mb-6">
              <div className="relative pt-1">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <span className="text-xs font-semibold inline-block text-blue-600">
                      Upload-Fortschritt
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold inline-block text-blue-600">
                      {progress}%
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden h-2 text-xs flex rounded bg-blue-200">
                  <div
                    style={{ width: `${progress}%` }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
                  ></div>
                </div>
              </div>
            </div>
          )}
          
          {/* Buttons */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate(`/cerebro/${slug}`)}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
              disabled={loading}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading || !selectedFile}
            >
              {loading ? (
                <>
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></span>
                  Hochladen...
                </>
              ) : (
                'Datei hochladen'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMedia; 
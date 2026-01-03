import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cerebroApi } from '../../api/cerebroApi.ts';
import { usePermissions } from '../../hooks/usePermissions.ts';
import { XMarkIcon, PlusIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

// ✅ MEMORY LEAK FIX: Komponente für Medien-Vorschau mit Cleanup
interface MediaPreviewWithCleanupProps {
  file: File;
  alt: string;
  blobUrlsRef: React.MutableRefObject<Set<string>>;
  type: 'image' | 'video';
  className?: string;
}

const MediaPreviewWithCleanup: React.FC<MediaPreviewWithCleanupProps> = ({ file, alt, blobUrlsRef, type, className = "w-full h-auto object-contain max-h-60" }) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const blobUrl = URL.createObjectURL(file);
    blobUrlsRef.current.add(blobUrl);
    setUrl(blobUrl);

    return () => {
      URL.revokeObjectURL(blobUrl);
      blobUrlsRef.current.delete(blobUrl);
    };
  }, [file, blobUrlsRef]);

  if (!url) return null;

  if (type === 'image') {
    return <img src={url} alt={alt} className={className} />;
  }

  return (
    <video src={url} controls className={className}>
      {alt}
    </video>
  );
};

const AddMedia: React.FC = () => {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const fileInputRef = useRef<HTMLInputElement>(null);
  // ✅ MEMORY LEAK FIX: Track Blob-URLs für Cleanup
  const blobUrlsRef = useRef<Set<string>>(new Set());
  
  // Zustand
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  
  // ✅ BUTTON-BERECHTIGUNGEN: Korrekte Button-Entität verwenden
  const canAddMedia = hasPermission('cerebro_media_upload', 'write', 'button');
  
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
      setError(t('cerebroMedia.fileTypeNotSupported'));
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
      setError(t('cerebroMedia.pleaseSelectFile'));
      return;
    }
    
    if (!fileName.trim()) {
      setError(t('cerebroMedia.pleaseEnterFileName'));
      return;
    }
    
    if (!slug) {
      setError(t('cerebroMedia.articleIdMissing'));
      return;
    }
    
    if (!isFileTypeSupported(selectedFile)) {
      setError(t('cerebroMedia.fileTypeNotSupported'));
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
      setError(t('cerebroMedia.uploadError'));
      setLoading(false);
    }
  };
  
  // Keine Berechtigung
  if (!canAddMedia) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {t('cerebroMedia.noPermission')}
        </div>
        <button
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
          onClick={() => navigate(`/cerebro/${slug}`)}
        >
          {t('cerebroMedia.backToArticle')}
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
          <MediaPreviewWithCleanup 
            file={selectedFile} 
            alt="Vorschau" 
            blobUrlsRef={blobUrlsRef}
            type="image"
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
          <MediaPreviewWithCleanup 
            file={selectedFile} 
            alt={t('cerebroMedia.videoNotSupported')} 
            blobUrlsRef={blobUrlsRef}
            type="video"
            className="w-full h-auto max-h-60"
          />
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
      <h1 className="text-2xl font-bold mb-6">{t('cerebroMedia.title')}</h1>
      
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
                <p>{t('cerebroMedia.clickToSelectFile')}</p>
                <p className="text-sm mt-1">
                  {t('cerebroMedia.supportedFileTypes')}
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
              {t('cerebroMedia.fileNameRequired')}
            </label>
            <input
              type="text"
              id="fileName"
              value={fileName}
              onChange={handleFileNameChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('cerebroMedia.fileName')}
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
              {selectedFile ? t('cerebroMedia.selectOtherFile') : t('cerebroMedia.selectFile')}
            </button>
            {selectedFile && (
              <span className="ml-2 text-sm text-gray-600">
                {t('cerebroMedia.fileSize')} {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
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
                      {t('cerebroMedia.uploadProgress')}
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
              className="p-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
              title={t('common.cancel')}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
            <button
              type="submit"
              className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || !selectedFile}
              title={loading ? t('cerebroMedia.uploading') : t('cerebroMedia.uploadFile')}
            >
              {loading ? (
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
              ) : (
                <PlusIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMedia; 
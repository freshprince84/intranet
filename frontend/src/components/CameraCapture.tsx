import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { isMobile } from '../utils/deviceDetection.ts';
import { XMarkIcon, CameraIcon, ArrowPathIcon, CheckIcon } from '@heroicons/react/24/outline';

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  onCancel: () => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onCancel }) => {
  const { t } = useTranslation();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Starte die Kamera
  const startCamera = async () => {
    try {
      // Rücksetzen des Fehlers
      setError(null);
      
      // Versuche, die Kamera zu verwenden (Rückkamera bevorzugt)
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Fehler beim Zugriff auf die Kamera:', error);
      setError(t('camera.accessError'));
    }
  };

  // Stoppe die Kamera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  // Nehme ein Bild auf
  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg', 0.9); // 90% Qualität für bessere Kompression
        setCapturedImage(imageData);
        stopCamera();
      }
    }
  };

  // Bild bestätigen
  const confirmImage = () => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  };

  // Neues Bild aufnehmen
  const retakeImage = () => {
    setCapturedImage(null);
    startCamera();
  };

  // Kamera beim Laden der Komponente starten
  useEffect(() => {
    if (isMobile()) {
      startCamera();
    }
    
    // Aufräumen beim Entfernen der Komponente
    return () => {
      stopCamera();
    };
  }, []);

  // Falls kein mobiles Gerät, zeige eine Meldung
  if (!isMobile()) {
    return (
      <div className="p-4 text-center dark:bg-gray-800 dark:text-white">
        <p className="mb-4">{t('camera.onlyMobile')}</p>
        <button 
          className="p-2 bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 rounded-md"
          onClick={onCancel}
          title={t('camera.back')}
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="camera-capture p-2 dark:bg-gray-800">
      <canvas ref={canvasRef} className="hidden" />
      
      {error && (
        <div className="error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded mb-4">
          <p>{error}</p>
          <button 
            className="mt-2 p-2 bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 rounded-md"
            onClick={onCancel}
            title={t('camera.back')}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      )}
      
      {!error && !capturedImage ? (
        <>
          <div className="video-container mb-4 rounded overflow-hidden border border-gray-300 dark:border-gray-700">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-auto"
            />
          </div>
          
          <div className="flex justify-between">
            <button 
              className="p-2 bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 rounded-md"
              onClick={onCancel}
              title="Abbrechen"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
            <button 
              className="p-2 bg-blue-500 dark:bg-blue-600 text-white rounded-md hover:bg-blue-600 dark:hover:bg-blue-700"
              onClick={captureImage}
              title="Foto aufnehmen"
            >
              <CameraIcon className="h-5 w-5" />
            </button>
          </div>
        </>
      ) : !error && capturedImage ? (
        <>
          <div className="preview-container mb-4 rounded overflow-hidden border border-gray-300 dark:border-gray-700">
            <img 
              src={capturedImage} 
              alt="Aufgenommenes Dokument" 
              className="w-full h-auto"
            />
          </div>
          
          <div className="flex justify-between">
            <button 
              className="p-2 bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 rounded-md"
              onClick={retakeImage}
              title="Neu aufnehmen"
            >
              <ArrowPathIcon className="h-5 w-5" />
            </button>
            <button 
              className="p-2 bg-green-500 dark:bg-green-600 text-white rounded-md hover:bg-green-600 dark:hover:bg-green-700"
              onClick={confirmImage}
              title="Verwenden"
            >
              <CheckIcon className="h-5 w-5" />
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default CameraCapture; 
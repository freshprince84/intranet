import React, { useState, useRef, useEffect } from 'react';
import { isMobile } from '../utils/deviceDetection.ts';

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  onCancel: () => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onCancel }) => {
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
      setError('Kamerazugriff nicht möglich. Bitte prüfen Sie die Berechtigungen und stellen Sie sicher, dass Ihr Gerät eine Kamera hat.');
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
      <div className="p-4 text-center">
        <p className="mb-4">Kamerafunktion ist nur auf mobilen Geräten verfügbar.</p>
        <button 
          className="px-4 py-2 bg-gray-200 rounded-md"
          onClick={onCancel}
        >
          Zurück
        </button>
      </div>
    );
  }

  return (
    <div className="camera-capture p-2">
      <canvas ref={canvasRef} className="hidden" />
      
      {error && (
        <div className="error bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
          <button 
            className="mt-2 px-4 py-2 bg-gray-200 rounded-md"
            onClick={onCancel}
          >
            Zurück
          </button>
        </div>
      )}
      
      {!error && !capturedImage ? (
        <>
          <div className="video-container mb-4 rounded overflow-hidden border border-gray-300">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-auto"
            />
          </div>
          
          <div className="flex justify-between">
            <button 
              className="px-4 py-2 bg-gray-200 rounded-md"
              onClick={onCancel}
            >
              Abbrechen
            </button>
            <button 
              className="px-4 py-2 bg-blue-500 text-white rounded-md"
              onClick={captureImage}
            >
              Foto aufnehmen
            </button>
          </div>
        </>
      ) : !error && capturedImage ? (
        <>
          <div className="preview-container mb-4 rounded overflow-hidden border border-gray-300">
            <img 
              src={capturedImage} 
              alt="Aufgenommenes Dokument" 
              className="w-full h-auto"
            />
          </div>
          
          <div className="flex justify-between">
            <button 
              className="px-4 py-2 bg-gray-200 rounded-md"
              onClick={retakeImage}
            >
              Neu aufnehmen
            </button>
            <button 
              className="px-4 py-2 bg-green-500 text-white rounded-md"
              onClick={confirmImage}
            >
              Verwenden
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default CameraCapture; 
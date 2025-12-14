import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@headlessui/react';
import { 
  XMarkIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { getTourImageUrl, getTourGalleryImageUrl } from '../../config/api.ts';

interface TourImageLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  tourId: number;
  initialImageIndex?: number;
  imageUrl?: string | null;
  galleryUrls?: string[] | null;
  tourTitle?: string;
}

const TourImageLightbox: React.FC<TourImageLightboxProps> = ({
  isOpen,
  onClose,
  tourId,
  initialImageIndex = 0,
  imageUrl,
  galleryUrls,
  tourTitle
}) => {
  const { t } = useTranslation();
  
  // State
  const [currentImageIndex, setCurrentImageIndex] = useState(initialImageIndex);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // Konstruiere Bild-Array: Hauptbild + Galerie
  const images: string[] = [];
  if (imageUrl) {
    images.push(getTourImageUrl(tourId)); // Index 0
  }
  if (galleryUrls && galleryUrls.length > 0) {
    galleryUrls.forEach((_, index) => {
      images.push(getTourGalleryImageUrl(tourId, index)); // Index 1+
    });
  }

  // Reset state wenn Lightbox geöffnet wird
  useEffect(() => {
    if (isOpen) {
      setCurrentImageIndex(initialImageIndex);
      setZoomLevel(1.0);
      setImageLoading(true);
      setImageError(false);
    }
  }, [isOpen, initialImageIndex]);

  // Navigation
  const handlePrevious = useCallback(() => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
      setImageLoading(true);
      setImageError(false);
      setZoomLevel(1.0);
    }
  }, [currentImageIndex]);

  const handleNext = useCallback(() => {
    if (currentImageIndex < images.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
      setImageLoading(true);
      setImageError(false);
      setZoomLevel(1.0);
    }
  }, [currentImageIndex, images.length]);

  // Zoom
  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => {
      if (prev >= 3.0) return 3.0;
      if (prev < 1.5) return 1.5;
      if (prev < 2.0) return 2.0;
      if (prev < 2.5) return 2.5;
      return 3.0;
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => {
      if (prev <= 1.0) return 1.0;
      if (prev > 2.5) return 2.5;
      if (prev > 2.0) return 2.0;
      if (prev > 1.5) return 1.5;
      return 1.0;
    });
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoomLevel(1.0);
  }, []);

  // Bild-Events
  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  // Keyboard-Navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && currentImageIndex > 0) {
        handlePrevious();
      } else if (e.key === 'ArrowRight' && currentImageIndex < images.length - 1) {
        handleNext();
      } else if ((e.key === '+' || e.key === '=') && !e.shiftKey) {
        handleZoomIn();
      } else if (e.key === '-' || (e.key === '_' && e.shiftKey)) {
        handleZoomOut();
      } else if (e.key === '0') {
        handleZoomReset();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentImageIndex, images.length, handlePrevious, handleNext, handleZoomIn, handleZoomOut, handleZoomReset, onClose]);

  // Prüfe ob Bilder vorhanden
  if (images.length === 0) {
    return null;
  }

  const currentImage = images[currentImageIndex];
  const canGoPrevious = currentImageIndex > 0;
  const canGoNext = currentImageIndex < images.length - 1;
  const canZoomIn = zoomLevel < 3.0;
  const canZoomOut = zoomLevel > 1.0;

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/80" aria-hidden="true" />
      
      {/* Dialog Panel */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-7xl w-full h-full flex flex-col bg-black/90 rounded-lg shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
            <div className="flex items-center gap-4">
              <Dialog.Title className="text-lg font-semibold text-white">
                {tourTitle && `${tourTitle} - `}
                {t('tours.imageLightbox.title', 'Bild {{current}} von {{total}}', {
                  current: currentImageIndex + 1,
                  total: images.length
                })}
              </Dialog.Title>
              
              {/* Zoom Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleZoomOut}
                  disabled={!canZoomOut}
                  className="p-2 text-white hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label={t('tours.imageLightbox.zoomOut', 'Verkleinern')}
                  title={t('tours.imageLightbox.zoomOut', 'Verkleinern')}
                >
                  <MagnifyingGlassMinusIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={handleZoomReset}
                  className="p-2 text-white hover:bg-gray-700 rounded transition-colors"
                  aria-label={t('tours.imageLightbox.zoomReset', 'Zoom zurücksetzen')}
                  title={t('tours.imageLightbox.zoomReset', 'Zoom zurücksetzen')}
                >
                  <ArrowPathIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={handleZoomIn}
                  disabled={!canZoomIn}
                  className="p-2 text-white hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label={t('tours.imageLightbox.zoomIn', 'Vergrößern')}
                  title={t('tours.imageLightbox.zoomIn', 'Vergrößern')}
                >
                  <MagnifyingGlassPlusIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-white hover:bg-gray-700 rounded transition-colors"
              aria-label={t('tours.imageLightbox.close', 'Schließen')}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 relative overflow-hidden flex items-center justify-center">
            {/* Previous Button */}
            {images.length > 1 && (
              <button
                onClick={handlePrevious}
                disabled={!canGoPrevious}
                className="absolute left-4 z-10 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                aria-label={t('tours.imageLightbox.previous', 'Vorheriges Bild')}
              >
                <ChevronLeftIcon className="h-6 w-6" />
              </button>
            )}

            {/* Image Container */}
            <div className="flex-1 flex items-center justify-center h-full p-4">
              {imageLoading && !imageError && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-white">
                    <ArrowPathIcon className="h-8 w-8 animate-spin" />
                    <p className="mt-2 text-sm">{t('tours.imageLightbox.loading', 'Bild wird geladen...')}</p>
                  </div>
                </div>
              )}
              
              {imageError && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-white text-center">
                    <p className="text-lg">{t('tours.imageLightbox.error', 'Bild konnte nicht geladen werden')}</p>
                  </div>
                </div>
              )}
              
              {!imageError && (
                <img
                  src={currentImage}
                  alt={`${tourTitle || 'Tour'} - Bild ${currentImageIndex + 1}`}
                  className={`max-w-full max-h-full object-contain transition-transform duration-200 ${
                    imageLoading ? 'opacity-0' : 'opacity-100'
                  }`}
                  style={{
                    transform: `scale(${zoomLevel})`,
                    cursor: zoomLevel > 1.0 ? 'move' : 'default'
                  }}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                />
              )}
            </div>

            {/* Next Button */}
            {images.length > 1 && (
              <button
                onClick={handleNext}
                disabled={!canGoNext}
                className="absolute right-4 z-10 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                aria-label={t('tours.imageLightbox.next', 'Nächstes Bild')}
              >
                <ChevronRightIcon className="h-6 w-6" />
              </button>
            )}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default TourImageLightbox;


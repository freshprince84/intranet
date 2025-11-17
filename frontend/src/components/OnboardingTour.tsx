import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useOnboarding } from '../contexts/OnboardingContext.tsx';
import OnboardingOverlay from './OnboardingOverlay.tsx';
import { useLocation } from 'react-router-dom';

const OnboardingTour: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const {
    isActive,
    currentStep,
    filteredSteps,
    isLoading,
    modalDismissed,
    nextStep,
    previousStep,
    skipStep,
    stopTour,
    dismissModal,
    completeStep,
    trackEvent
  } = useOnboarding();

  const [stepStartTime, setStepStartTime] = useState<number>(Date.now());
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const isDismissingRef = useRef<boolean>(false); // Verhindert mehrfache Aufrufe

  // Aktueller Schritt
  const currentStepData = filteredSteps[currentStep];

  // Prüfe ob aktueller Schritt zur aktuellen Route passt
  // Bei Navigations-Schritten: Modal auch auf aktueller Route anzeigen (damit Link sichtbar ist)
  // WICHTIG: Tour sollte auch auf /profile und /organization funktionieren (wenn User dorthin umgeleitet wurde)
  const isStepForCurrentRoute = currentStepData?.route 
    ? (currentStepData.action === 'navigate' 
        ? location.pathname === currentStepData.route || 
          (currentStepData.route === '/dashboard' && location.pathname.startsWith('/dashboard')) ||
          (currentStepData.route === '/profile' && location.pathname === '/profile') ||
          (currentStepData.route === '/organization' && location.pathname === '/organization')
        : location.pathname === currentStepData.route || 
          (currentStepData.route === '/dashboard' && location.pathname.startsWith('/dashboard')) ||
          (currentStepData.route === '/profile' && location.pathname === '/profile') ||
          (currentStepData.route === '/organization' && location.pathname === '/organization'))
    : true;

  // Mobile-Erkennung
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Track Step-Start
  useEffect(() => {
    if (isActive && currentStepData) {
      setStepStartTime(Date.now());
      trackEvent(currentStepData.id, t(currentStepData.title), 'started');
    }
  }, [isActive, currentStep, currentStepData, trackEvent, t]);

  // Tour nicht anzeigen wenn nicht aktiv oder kein Schritt
  if (!isActive || !currentStepData || isLoading) {
    return null;
  }

  // Tour nicht anzeigen wenn Schritt nicht für aktuelle Route
  if (!isStepForCurrentRoute) {
    return null;
  }

  // Modal nicht anzeigen, wenn es geschlossen wurde
  if (modalDismissed) {
    return null;
  }

  const handleNext = async () => {
    // Bei 'wait' Aktion: Nicht automatisch weiter, sondern warten bis Schritt abgeschlossen ist
    if (currentStepData?.action === 'wait') {
      // Schritt sollte bereits durch completeStep() abgeschlossen worden sein
      // Wenn nicht, warte noch
      return;
    }
    
    if (currentStepData) {
      const duration = Math.floor((Date.now() - stepStartTime) / 1000);
      await completeStep(currentStepData.id, t(currentStepData.title), duration);
    }
    nextStep();
  };

  const handlePrevious = () => {
    previousStep();
  };

  const handleSkip = async () => {
    if (isDismissingRef.current) return; // Verhindere mehrfache Aufrufe
    isDismissingRef.current = true;
    try {
      // Schritt als dismissed markieren (wie X-Button)
      await dismissModal();
      // Zum nächsten Schritt weitergehen
      nextStep();
    } finally {
      setTimeout(() => {
        isDismissingRef.current = false;
      }, 300);
    }
  };

  const handleComplete = async () => {
    if (currentStepData) {
      const duration = Math.floor((Date.now() - stepStartTime) / 1000);
      await completeStep(currentStepData.id, t(currentStepData.title), duration);
    }
    stopTour();
  };

  const progress = filteredSteps.length > 0 
    ? ((currentStep + 1) / filteredSteps.length) * 100 
    : 0;

  // Position für Modal berechnen
  const getModalPosition = () => {
    if (!currentStepData.target) {
      return 'center';
    }
    return currentStepData.position || 'bottom';
  };

  const modalPosition = getModalPosition();

  return (
    <>
      {/* Overlay mit Highlighting */}
      {currentStepData.target && (
        <OnboardingOverlay target={currentStepData.target} isActive={isActive} />
      )}

      {/* Modal für Onboarding-Schritt - z-index niedriger als Topmenu */}
      <Dialog 
        open={isActive && !modalDismissed} 
        onClose={(e) => {
          // Verhindere mehrfache Aufrufe
          if (isDismissingRef.current) return;
          isDismissingRef.current = true;
          dismissModal();
          setTimeout(() => {
            isDismissingRef.current = false;
          }, 300);
        }} 
        className="relative" 
        style={{ zIndex: 40 }}
      >
        {/* Backdrop */}
        <div className="fixed inset-0 bg-transparent" aria-hidden="true" />

        {/* Modal */}
        <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none overflow-y-auto">
          <Dialog.Panel
            className={`
              mx-auto max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl pointer-events-auto
              ${modalPosition === 'center' ? 'transform-none my-auto' : ''}
              ${modalPosition === 'top' ? 'self-start mt-4' : ''}
              ${modalPosition === 'bottom' ? 'self-end mb-4' : ''}
              ${modalPosition === 'left' ? 'self-center mr-auto ml-4' : ''}
              ${modalPosition === 'right' ? 'self-center ml-auto mr-4' : ''}
              max-h-[80vh] overflow-y-auto
            `}
          >
            {/* Fortschrittsbalken */}
            <div className="px-6 pt-4">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                {t('onboarding.progress.step')} {currentStep + 1} {t('onboarding.progress.of')} {filteredSteps.length}
              </div>
            </div>

            {/* Header */}
            <div className="px-6 pt-4 pb-2">
              <div className="flex items-center justify-between">
                <Dialog.Title className="text-lg font-semibold dark:text-white">
                  {t(currentStepData.title)}
                </Dialog.Title>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (isDismissingRef.current) return; // Verhindere mehrfache Aufrufe
                    isDismissingRef.current = true;
                    dismissModal();
                    setTimeout(() => {
                      isDismissingRef.current = false;
                    }, 300);
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  aria-label={t('common.close')}
                  title={t('onboarding.dismissModal') || 'Modal schließen (kann später wieder geöffnet werden)'}
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-4">
              <p className="text-gray-700 dark:text-gray-300 break-words whitespace-pre-wrap">
                {t(currentStepData.description)}
              </p>
            </div>

            {/* Footer mit Buttons */}
            <div className="px-6 pb-4 flex items-center justify-between gap-2">
              <div className="flex gap-2">
                {currentStep > 0 && (
                  <button
                    onClick={handlePrevious}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <ChevronLeftIcon className="h-4 w-4" />
                      {t('onboarding.navigation.back')}
                    </div>
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                {currentStepData?.action !== 'wait' && (
                  <button
                    onClick={handleSkip}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    {t('onboarding.navigation.skip')}
                  </button>
                )}
                {/* "Siguiente" Button nur anzeigen, wenn Schritt KEINE Navigation erfordert */}
                {currentStepData?.action !== 'navigate' && currentStepData?.action !== 'wait' && (
                  currentStep === filteredSteps.length - 1 ? (
                    <button
                      onClick={handleComplete}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {t('onboarding.navigation.complete')}
                    </button>
                  ) : (
                    <button
                      onClick={handleNext}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        {t('onboarding.navigation.next')}
                        <ChevronRightIcon className="h-4 w-4" />
                      </div>
                    </button>
                  )
                )}
                {currentStepData?.action === 'wait' && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 px-4 py-2">
                    {t('onboarding.waiting') || 'Bitte vervollständigen Sie Ihr Profil...'}
                  </div>
                )}
              </div>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </>
  );
};

export default OnboardingTour;


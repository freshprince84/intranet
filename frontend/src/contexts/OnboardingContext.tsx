import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.tsx';
import { usePermissions } from '../hooks/usePermissions.ts';
import axiosInstance from '../config/axios.ts';
import { API_ENDPOINTS } from '../config/api.ts';

// Onboarding-Step-Interface
export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS-Selector für zu highlightendes Element
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  route?: string; // Route, die für diesen Schritt aktiv sein muss
  action?: 'navigate' | 'wait' | 'click'; // Erwartete Aktion
  order: number; // Reihenfolge
  page: string; // Seite, auf der dieser Schritt erscheint
  process?: string; // Prozess, zu dem dieser Schritt gehört
  requiredPermissions?: {
    entity: string;
    entityType: 'page' | 'table' | 'button';
    accessLevel: 'read' | 'write' | 'both';
  }[];
  roleFilter?: string[]; // Rollen, für die dieser Schritt angezeigt wird
}

// Onboarding-Status-Interface
interface OnboardingStatus {
  onboardingCompleted: boolean;
  onboardingProgress: {
    currentStep: number;
    completedSteps: number[];
  } | null;
  onboardingStartedAt: string | null;
  onboardingCompletedAt: string | null;
}

// OnboardingContext-Interface
interface OnboardingContextType {
  isActive: boolean;
  currentStep: number;
  completedSteps: number[];
  steps: OnboardingStep[];
  filteredSteps: OnboardingStep[];
  isLoading: boolean;
  startTour: () => Promise<void>;
  stopTour: () => Promise<void>;
  nextStep: () => void;
  previousStep: () => void;
  skipStep: () => void;
  completeStep: (stepId: string, stepTitle: string, duration?: number) => Promise<void>;
  trackEvent: (stepId: string, stepTitle: string, action: 'started' | 'completed' | 'skipped' | 'cancelled', duration?: number) => Promise<void>;
  resetTour: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const OnboardingProvider: React.FC<{ children: React.ReactNode; steps: OnboardingStep[] }> = ({ children, steps }) => {
  const { user } = useAuth();
  const { permissions, currentRole } = usePermissions();
  const location = useLocation();
  const [isActive, setIsActive] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [status, setStatus] = useState<OnboardingStatus | null>(null);

  // Filtere Schritte basierend auf Berechtigungen
  const filterStepsByPermissions = useCallback((stepsToFilter: OnboardingStep[]): OnboardingStep[] => {
    if (!permissions || !currentRole) {
      return stepsToFilter;
    }

    return stepsToFilter.filter(step => {
      // Prüfe Rollen-Filter
      if (step.roleFilter && !step.roleFilter.includes(currentRole.name)) {
        return false;
      }

      // Prüfe Berechtigungen
      if (step.requiredPermissions) {
        return step.requiredPermissions.every(reqPerm => {
          const userPerm = permissions.find(p =>
            p.entity === reqPerm.entity &&
            p.entityType === reqPerm.entityType
          );
          if (!userPerm) return false;

          // Prüfe accessLevel
          return (
            userPerm.accessLevel === 'both' ||
            (reqPerm.accessLevel === 'read' && ['read', 'write', 'both'].includes(userPerm.accessLevel)) ||
            (reqPerm.accessLevel === 'write' && ['write', 'both'].includes(userPerm.accessLevel))
          );
        });
      }

      return true;
    });
  }, [permissions, currentRole]);

  const filteredSteps = filterStepsByPermissions(steps);

  // Track Event (MUSS VOR startTour definiert werden, da startTour es verwendet)
  const trackEvent = useCallback(async (
    stepId: string,
    stepTitle: string,
    action: 'started' | 'completed' | 'skipped' | 'cancelled',
    duration?: number
  ) => {
    try {
      await axiosInstance.post(API_ENDPOINTS.USERS.ONBOARDING.EVENT, {
        stepId,
        stepTitle,
        action,
        duration
      });
    } catch (error) {
      console.error('Fehler beim Tracking:', error);
      // Fehler blockieren nicht die Tour
    }
  }, []);

  // Tour starten (MUSS VOR useEffect definiert werden, der es verwendet)
  const startTour = useCallback(async () => {
    if (!user) return;

    setIsActive(true);
    setCurrentStep(0);
    setCompletedSteps([]);

    // Track Start-Event
    await trackEvent('tour', 'Onboarding Tour', 'started');

    // Speichere Start-Zeitpunkt
    try {
      await axiosInstance.put(API_ENDPOINTS.USERS.ONBOARDING.PROGRESS, {
        currentStep: 0,
        completedSteps: [],
        onboardingStartedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Fehler beim Speichern des Start-Zeitpunkts:', error);
    }
  }, [user, trackEvent]);

  // Lade Onboarding-Status beim Start
  useEffect(() => {
    const loadStatus = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Warte kurz, damit User vollständig geladen ist (verhindert Race Condition)
      await new Promise(resolve => setTimeout(resolve, 100));

      try {
        const response = await axiosInstance.get(API_ENDPOINTS.USERS.ONBOARDING.STATUS);
        const statusData: OnboardingStatus = response.data;
        setStatus(statusData);

        if (!statusData.onboardingCompleted) {
          // Wenn Onboarding nicht abgeschlossen, lade Fortschritt
          if (statusData.onboardingProgress) {
            setCurrentStep(statusData.onboardingProgress.currentStep);
            setCompletedSteps(statusData.onboardingProgress.completedSteps);
          }
          // Starte Tour automatisch, wenn noch nicht gestartet
          // WICHTIG: Tour startet auch wenn User zu /profile umgeleitet wird
          if (!statusData.onboardingStartedAt) {
            // Warte noch etwas, damit UI vollständig geladen ist
            setTimeout(async () => {
              await startTour();
            }, 500);
          } else {
            setIsActive(true);
          }
        }
      } catch (error) {
        console.error('Fehler beim Laden des Onboarding-Status:', error);
        // Fallback: Lade aus LocalStorage
        const savedProgress = localStorage.getItem('onboardingProgress');
        if (savedProgress) {
          try {
            const progress = JSON.parse(savedProgress);
            setCurrentStep(progress.currentStep || 0);
            setCompletedSteps(progress.completedSteps || []);
          } catch (e) {
            console.error('Fehler beim Parsen des gespeicherten Fortschritts:', e);
          }
        }
        // Auch bei Fehler: Tour starten, wenn noch nicht gestartet (für neue User)
        const savedStarted = localStorage.getItem('onboardingStartedAt');
        if (!savedStarted) {
          setTimeout(async () => {
            await startTour();
          }, 500);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadStatus();
  }, [user, startTour]);

  // Speichere Fortschritt
  const saveProgress = useCallback(async (step: number, completed: number[]) => {
    const progress = { currentStep: step, completedSteps: completed };
    
    // LocalStorage als Fallback
    localStorage.setItem('onboardingProgress', JSON.stringify(progress));
    
    // Backend-Speicherung
    try {
      await axiosInstance.put(API_ENDPOINTS.USERS.ONBOARDING.PROGRESS, progress);
    } catch (error) {
      console.error('Fehler beim Speichern des Fortschritts:', error);
      // Fehler blockieren nicht die Tour
    }
  }, []);


  // Automatischer Schritt-Wechsel bei Navigation (für action: 'navigate' Schritte)
  useEffect(() => {
    if (!isActive || !filteredSteps.length || currentStep >= filteredSteps.length) {
      return;
    }

    const currentStepData = filteredSteps[currentStep];
    const nextStepData = filteredSteps[currentStep + 1];

    // Prüfe ob aktueller Schritt ein Navigations-Schritt ist
    if (currentStepData?.action === 'navigate' && nextStepData) {
      // Prüfe ob zur Ziel-Route des nächsten Schritts navigiert wurde
      const isOnTargetRoute = nextStepData.route 
        ? location.pathname === nextStepData.route || 
          (nextStepData.route === '/dashboard' && location.pathname.startsWith('/dashboard'))
        : false;

      if (isOnTargetRoute) {
        // Automatisch zum nächsten Schritt wechseln
        const stepIndex = filteredSteps.findIndex(s => s.id === currentStepData.id);
        const newCompletedSteps = stepIndex !== -1 && !completedSteps.includes(stepIndex)
          ? [...completedSteps, stepIndex]
          : completedSteps;
        
        if (stepIndex !== -1 && !completedSteps.includes(stepIndex)) {
          // Event tracken
          trackEvent(
            currentStepData.id,
            currentStepData.title,
            'completed',
            0 // Dauer ist 0, da automatisch gewechselt wurde
          );
        }
        // Zum nächsten Schritt wechseln
        const newStep = currentStep + 1;
        setCurrentStep(newStep);
        setCompletedSteps(newCompletedSteps);
        saveProgress(newStep, newCompletedSteps);
      }
    }
  }, [location.pathname, isActive, currentStep, filteredSteps, completedSteps, saveProgress, trackEvent]);


  // Tour stoppen
  const stopTour = useCallback(async () => {
    setIsActive(false);
    
    // Track Cancel-Event
    if (filteredSteps[currentStep]) {
      await trackEvent(
        filteredSteps[currentStep].id,
        filteredSteps[currentStep].title,
        'cancelled'
      );
    }
  }, [currentStep, filteredSteps, trackEvent]);

  // Tour abschließen
  const completeTour = useCallback(async () => {
    setIsActive(false);
    
    try {
      await axiosInstance.put(API_ENDPOINTS.USERS.ONBOARDING.COMPLETE);
      setStatus(prev => prev ? { ...prev, onboardingCompleted: true } : null);
    } catch (error) {
      console.error('Fehler beim Abschließen der Tour:', error);
    }
  }, []);

  // Nächster Schritt
  const nextStep = useCallback(() => {
    if (currentStep < filteredSteps.length - 1) {
      const newStep = currentStep + 1;
      setCurrentStep(newStep);
      saveProgress(newStep, completedSteps);
    } else {
      // Tour beenden
      completeTour();
    }
  }, [currentStep, filteredSteps.length, completedSteps, saveProgress, completeTour]);

  // Vorheriger Schritt
  const previousStep = useCallback(() => {
    if (currentStep > 0) {
      const newStep = currentStep - 1;
      setCurrentStep(newStep);
      saveProgress(newStep, completedSteps);
    }
  }, [currentStep, completedSteps, saveProgress]);

  // Schritt überspringen
  const skipStep = useCallback(async () => {
    if (filteredSteps[currentStep]) {
      await trackEvent(
        filteredSteps[currentStep].id,
        filteredSteps[currentStep].title,
        'skipped'
      );
    }
    nextStep();
  }, [currentStep, filteredSteps, trackEvent, nextStep]);

  // Schritt abschließen
  const completeStep = useCallback(async (
    stepId: string,
    stepTitle: string,
    duration?: number
  ) => {
    const stepIndex = filteredSteps.findIndex(s => s.id === stepId);
    if (stepIndex !== -1 && !completedSteps.includes(stepIndex)) {
      setCompletedSteps(prev => [...prev, stepIndex]);
      await trackEvent(stepId, stepTitle, 'completed', duration);
    }
  }, [filteredSteps, completedSteps, trackEvent]);

  // Tour zurücksetzen
  const resetTour = useCallback(async () => {
    try {
      await axiosInstance.put(API_ENDPOINTS.USERS.ONBOARDING.RESET);
      setStatus(null);
      setCurrentStep(0);
      setCompletedSteps([]);
      setIsActive(false);
      localStorage.removeItem('onboardingProgress');
    } catch (error) {
      console.error('Fehler beim Zurücksetzen der Tour:', error);
      throw error;
    }
  }, []);

  return (
    <OnboardingContext.Provider
      value={{
        isActive,
        currentStep,
        completedSteps,
        steps: filteredSteps,
        filteredSteps,
        isLoading,
        startTour,
        stopTour,
        nextStep,
        previousStep,
        skipStep,
        completeStep,
        trackEvent,
        resetTour
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding muss innerhalb eines OnboardingProviders verwendet werden');
  }
  return context;
};


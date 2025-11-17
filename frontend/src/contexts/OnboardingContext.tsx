import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  showCondition?: 'hasInactiveOrgRole'; // Bedingung, wann dieser Schritt angezeigt werden soll
}

// Onboarding-Status-Interface
interface OnboardingStatus {
  onboardingCompleted: boolean;
  onboardingProgress: {
    currentStep: number;
    completedSteps: number[];
    dismissedSteps?: number[]; // Schritte die vom User weggeklickt wurden
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
  modalDismissed: boolean;
  startTour: () => Promise<void>;
  stopTour: () => Promise<void>;
  dismissModal: () => void; // Modal temporär schließen
  showModal: () => void; // Modal wieder anzeigen
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
  const { permissions, currentRole, isProfileComplete } = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const [isActive, setIsActive] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [dismissedSteps, setDismissedSteps] = useState<number[]>([]); // Schritte die vom User weggeklickt wurden
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [modalDismissed, setModalDismissed] = useState<boolean>(false); // Modal temporär geschlossen
  const modalDismissedRef = useRef<boolean>(false); // Ref für aktuellen modalDismissed-Wert

  // Prüfe ob User eine inaktive Rolle mit Organisation hat
  const hasInactiveOrgRole = useCallback((): boolean => {
    if (!user || !user.roles) return false;
    
    // Finde aktive Rolle (lastUsed: true)
    const activeRole = user.roles.find((r: any) => r.lastUsed === true);
    
    // Wenn aktive Rolle bereits eine Organisation hat, keine neue Rolle vorhanden
    if (activeRole?.role?.organization !== null) {
      return false;
    }
    
    // Prüfe ob es eine Rolle mit Organisation gibt, die nicht aktiv ist
    const hasInactiveOrgRole = user.roles.some((r: any) => 
      !r.lastUsed && r.role.organization !== null
    );
    
    return hasInactiveOrgRole;
  }, [user]);

  // Prüfe ob User ein Identitätsdokument hochladen muss (nur für Kolumbien)
  const needsIdentificationDocument = useCallback((): boolean => {
    if (!user || !user.roles) return false;
    
    // Finde aktive Rolle mit Organisation
    const activeRole = user.roles.find((r: any) => r.lastUsed === true && r.role.organization !== null);
    
    if (!activeRole) {
      return false; // Keine aktive Rolle mit Organisation
    }
    
    // Prüfe ob Organisation in Kolumbien ist
    const organization = activeRole.role.organization;
    if (organization?.country !== 'CO') {
      return false; // Nur für Kolumbien
    }
    
    // Prüfe ob User bereits ein Identitätsdokument hat
    const hasDocument = user.identificationDocuments && user.identificationDocuments.length > 0;
    
    return !hasDocument; // Nur anzeigen wenn kein Dokument vorhanden
  }, [user]);

  // Prüfe ob User keine Organisation hat
  const hasNoOrganization = useCallback((): boolean => {
    if (!user || !user.roles) return true; // Keine Rollen = keine Organisation
    
    // Prüfe ob User eine Rolle mit Organisation hat
    const hasOrg = user.roles.some((r: any) => r.role.organization !== null);
    
    return !hasOrg; // true wenn KEINE Organisation vorhanden
  }, [user]);

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

      // Prüfe showCondition
      if (step.showCondition === 'hasInactiveOrgRole') {
        if (!hasInactiveOrgRole()) {
          return false;
        }
      }
      
      if (step.showCondition === 'needsIdentificationDocument') {
        if (!needsIdentificationDocument()) {
          return false;
        }
      }
      
      if (step.showCondition === 'hasNoOrganization') {
        if (!hasNoOrganization()) {
          return false;
        }
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
  }, [permissions, currentRole, hasInactiveOrgRole, needsIdentificationDocument, hasNoOrganization]);

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

    // Prüfe ob Profil vollständig ist (username, email, language)
    const profileComplete = isProfileComplete();
    const hasOrganization = user.roles?.some((r: any) => r.role.organization !== null) || false;
    
    // Finde Schritte
    const profileStepIndex = filteredSteps.findIndex(s => s.id === 'profile_complete');
    const organizationStepIndex = filteredSteps.findIndex(s => s.id === 'join_or_create_organization');
    const welcomeStepIndex = filteredSteps.findIndex(s => s.id === 'welcome');
    
    let initialStep = 0;
    
    if (!profileComplete && profileStepIndex !== -1) {
      // Profil unvollständig → Starte mit Profil-Schritt
      initialStep = profileStepIndex;
    } else if (!hasOrganization && welcomeStepIndex !== -1) {
      // Profil vollständig, aber keine Organisation → Starte mit Welcome auf Dashboard, dann zur Organisation
      initialStep = welcomeStepIndex;
    } else if (hasOrganization && welcomeStepIndex !== -1) {
      // Profil vollständig und Organisation vorhanden → Starte mit Welcome-Schritt
      initialStep = welcomeStepIndex;
    }
    
    setIsActive(true);
    setCurrentStep(initialStep);
    setCompletedSteps([]);

    // Modal nur anzeigen, wenn es nicht explizit geschlossen wurde
    if (!modalDismissedRef.current) {
      setModalDismissed(false);
    }

    // Navigiere zur entsprechenden Seite
    if (!profileComplete && location.pathname !== '/profile') {
      navigate('/profile');
    } else if (!hasOrganization && organizationStepIndex !== -1 && location.pathname !== '/organization') {
      navigate('/organization');
    } else if (location.pathname !== '/dashboard') {
      // Immer zum Dashboard navigieren (für Welcome-Schritt)
      navigate('/dashboard');
    }

    // Track Start-Event
    await trackEvent('tour', 'Onboarding Tour', 'started');

    // Speichere Start-Zeitpunkt
    try {
      await axiosInstance.put(API_ENDPOINTS.USERS.ONBOARDING.PROGRESS, {
        currentStep: initialStep,
        completedSteps: [],
        dismissedSteps: [],
        onboardingStartedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Fehler beim Speichern des Start-Zeitpunkts:', error);
    }
  }, [user, trackEvent, filteredSteps, isProfileComplete, location.pathname, navigate]);

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
          // Prüfe ob Profil vollständig ist (username, email, language)
          const profileComplete = isProfileComplete();
          const hasOrganization = user.roles?.some((r: any) => r.role.organization !== null) || false;
          
          // Wenn Profil vollständig ist UND Tour bereits gestartet wurde, setze Tour fort
          if (profileComplete && statusData.onboardingStartedAt) {
            // Profil vollständig und Tour bereits gestartet → Tour fortsetzen
            if (statusData.onboardingProgress) {
              setCurrentStep(statusData.onboardingProgress.currentStep);
              setCompletedSteps(statusData.onboardingProgress.completedSteps || []);
              setDismissedSteps(statusData.onboardingProgress.dismissedSteps || []);
            }
            setIsActive(true);
            // Prüfe ob aktueller Schritt dismissed ist
            const currentStepIndex = statusData.onboardingProgress?.currentStep || 0;
            if (statusData.onboardingProgress?.dismissedSteps?.includes(currentStepIndex)) {
              setModalDismissed(true);
              modalDismissedRef.current = true;
            } else if (!modalDismissedRef.current) {
              setModalDismissed(false);
            }
          } else if (!profileComplete) {
            // Profil unvollständig → Tour starten/fortsetzen
            if (statusData.onboardingProgress) {
              setCurrentStep(statusData.onboardingProgress.currentStep);
              setCompletedSteps(statusData.onboardingProgress.completedSteps || []);
              setDismissedSteps(statusData.onboardingProgress.dismissedSteps || []);
            }
            if (!statusData.onboardingStartedAt) {
              setTimeout(() => {
                startTour();
              }, 500);
            } else {
              setIsActive(true);
              const currentStepIndex = statusData.onboardingProgress?.currentStep || 0;
              if (statusData.onboardingProgress?.dismissedSteps?.includes(currentStepIndex)) {
                setModalDismissed(true);
                modalDismissedRef.current = true;
              } else if (!modalDismissedRef.current) {
                setModalDismissed(false);
              }
            }
          } else if (!hasOrganization) {
            // Profil vollständig, aber keine Organisation → Tour starten mit Organisation-Schritt
            if (statusData.onboardingProgress) {
              setCurrentStep(statusData.onboardingProgress.currentStep);
              setCompletedSteps(statusData.onboardingProgress.completedSteps || []);
              setDismissedSteps(statusData.onboardingProgress.dismissedSteps || []);
            }
            if (!statusData.onboardingStartedAt) {
              setTimeout(() => {
                startTour();
              }, 500);
            } else {
              setIsActive(true);
              const currentStepIndex = statusData.onboardingProgress?.currentStep || 0;
              if (statusData.onboardingProgress?.dismissedSteps?.includes(currentStepIndex)) {
                setModalDismissed(true);
                modalDismissedRef.current = true;
              } else if (!modalDismissedRef.current) {
                setModalDismissed(false);
              }
            }
          } else {
            // Profil vollständig und Organisation vorhanden, aber Tour noch nicht gestartet → Tour starten mit Welcome
            if (!statusData.onboardingStartedAt) {
              setTimeout(() => {
                startTour();
              }, 500);
            } else {
              setIsActive(true);
              const currentStepIndex = statusData.onboardingProgress?.currentStep || 0;
              if (statusData.onboardingProgress?.dismissedSteps?.includes(currentStepIndex)) {
                setModalDismissed(true);
                modalDismissedRef.current = true;
              } else if (!modalDismissedRef.current) {
                setModalDismissed(false);
              }
            }
          }
        } else {
          // Onboarding bereits abgeschlossen → Tour nicht anzeigen
          setIsActive(false);
          setModalDismissed(true);
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
          setTimeout(() => {
            startTour();
          }, 500);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // startTour aus Dependencies entfernt, da es zu häufigen Re-Renders führt

  // Speichere Fortschritt
  const saveProgress = useCallback(async (step: number, completed: number[], dismissed?: number[]) => {
    const progress = { 
      currentStep: step, 
      completedSteps: completed,
      dismissedSteps: dismissed !== undefined ? dismissed : dismissedSteps
    };
    
    // LocalStorage als Fallback
    localStorage.setItem('onboardingProgress', JSON.stringify(progress));
    
    // Backend-Speicherung
    try {
      await axiosInstance.put(API_ENDPOINTS.USERS.ONBOARDING.PROGRESS, progress);
    } catch (error) {
      console.error('Fehler beim Speichern des Fortschritts:', error);
      // Fehler blockieren nicht die Tour
    }
  }, [dismissedSteps]);


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
        saveProgress(newStep, newCompletedSteps, dismissedSteps);
      }
    }
  }, [location.pathname, isActive, currentStep, filteredSteps, completedSteps, saveProgress, trackEvent]);

  // Modal wieder anzeigen, wenn Route wechselt (wenn Modal geschlossen war)
  // ABER: Nur wenn Profil unvollständig ist (nur wenn User Mitglied einer Organisation ist)
  // WICHTIG: Nur auf Route-Wechsel reagieren, nicht auf modalDismissed-Änderung
  const previousPathname = useRef<string>(location.pathname);
  
  // Aktualisiere Ref, wenn modalDismissed sich ändert
  useEffect(() => {
    modalDismissedRef.current = modalDismissed;
  }, [modalDismissed]);
  
  useEffect(() => {
    // Nur reagieren, wenn sich die Route geändert hat (nicht bei modalDismissed-Änderung)
    if (isActive && modalDismissedRef.current && previousPathname.current !== location.pathname) {
      previousPathname.current = location.pathname;
      
      // Prüfe ob Profil vollständig ist (nur wenn User Mitglied einer Organisation ist)
      const hasOrganization = user?.roles?.some((r: any) => r.role.organization !== null) || false;
      const profileComplete = hasOrganization ? isProfileComplete() : true; // Vor Organisation: Profil gilt als vollständig
      
      // Nur wenn Profil unvollständig ist, Modal wieder anzeigen
      if (!profileComplete) {
        // Modal bei jedem Route-Wechsel wieder anzeigen (Dashboard, Settings, etc.)
        // WICHTIG: Kleine Verzögerung, damit Route-Wechsel abgeschlossen ist
        const timer = setTimeout(() => {
          setModalDismissed(false);
        }, 100);
        return () => clearTimeout(timer);
      }
    } else if (previousPathname.current !== location.pathname) {
      // Route hat sich geändert, aber Modal war nicht geschlossen → Pathname aktualisieren
      previousPathname.current = location.pathname;
    }
  }, [location.pathname, isActive, user, isProfileComplete]); // modalDismissed aus Dependencies entfernt

  // Modal temporär schließen (nicht die Tour stoppen)
  // WICHTIG: Verhindere, dass Modal sofort wieder geöffnet wird
  // Speichere dismissed Step persistent, damit er beim nächsten Login nicht mehr angezeigt wird
  // Wird sowohl vom X-Button als auch von "Omitir" verwendet
  const dismissModal = useCallback(async () => {
    setModalDismissed(true);
    // Setze Ref, damit useEffect nicht sofort wieder öffnet
    modalDismissedRef.current = true;
    
    // Speichere aktuellen Schritt als dismissed
    if (currentStep !== undefined && !dismissedSteps.includes(currentStep)) {
      const newDismissedSteps = [...dismissedSteps, currentStep];
      setDismissedSteps(newDismissedSteps);
      
      // Speichere persistent im Backend
      try {
        await saveProgress(currentStep, completedSteps, newDismissedSteps);
      } catch (error) {
        console.error('Fehler beim Speichern des dismissed Steps:', error);
      }
    }
    
    // Track Skip-Event für Analytics
    if (filteredSteps[currentStep]) {
      await trackEvent(
        filteredSteps[currentStep].id,
        filteredSteps[currentStep].title,
        'skipped'
      );
    }
  }, [currentStep, dismissedSteps, completedSteps, saveProgress, filteredSteps, trackEvent]);

  // Modal wieder anzeigen
  const showModal = useCallback(() => {
    setModalDismissed(false);
  }, []);

  // Tour stoppen (wird aufgerufen wenn User die Tour komplett abbrechen möchte)
  // WICHTIG: "Omitir" ruft jetzt dismissModal() auf, nicht stopTour()
  const stopTour = useCallback(async () => {
    setIsActive(false);
    setModalDismissed(true);
    modalDismissedRef.current = true;
    
    // Track Cancel-Event
    if (filteredSteps[currentStep]) {
      await trackEvent(
        filteredSteps[currentStep].id,
        filteredSteps[currentStep].title,
        'cancelled'
      );
    }
    
    // Tour als abgeschlossen markieren (nur wenn explizit gewünscht)
    try {
      await axiosInstance.put(API_ENDPOINTS.USERS.ONBOARDING.COMPLETE);
      setStatus(prev => prev ? { ...prev, onboardingCompleted: true } : null);
    } catch (error) {
      console.error('Fehler beim Markieren der Tour als abgeschlossen:', error);
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
      saveProgress(newStep, completedSteps, dismissedSteps);
    } else {
      // Tour beenden
      completeTour();
    }
  }, [currentStep, filteredSteps.length, completedSteps, dismissedSteps, saveProgress, completeTour]);

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
      const newCompletedSteps = [...completedSteps, stepIndex];
      setCompletedSteps(newCompletedSteps);
      await trackEvent(stepId, stepTitle, 'completed', duration);
      
      // Wenn Profil-Schritt abgeschlossen, automatisch zum nächsten Schritt wechseln
      if (stepId === 'profile_complete' && currentStep === stepIndex) {
        // Warte kurz, damit UI aktualisiert werden kann
        setTimeout(() => {
          setCurrentStep(prevStep => {
            if (prevStep < filteredSteps.length - 1) {
              const nextStepIndex = prevStep + 1;
              saveProgress(nextStepIndex, newCompletedSteps, dismissedSteps);
              
              // Navigiere zum Dashboard, wenn nächster Schritt dort ist
              const nextStep = filteredSteps[nextStepIndex];
              if (nextStep?.route && nextStep.route !== '/profile') {
                navigate(nextStep.route);
              }
              
              return nextStepIndex;
            }
            return prevStep;
          });
        }, 500);
      }
      
      // Wenn switch_role_after_join Schritt abgeschlossen, automatisch zum nächsten Schritt wechseln
      if (stepId === 'switch_role_after_join' && currentStep === stepIndex) {
        // Warte kurz, damit UI aktualisiert werden kann
        setTimeout(() => {
          setCurrentStep(prevStep => {
            if (prevStep < filteredSteps.length - 1) {
              const nextStepIndex = prevStep + 1;
              saveProgress(nextStepIndex, newCompletedSteps, dismissedSteps);
              
              // Navigiere zum nächsten Schritt
              const nextStep = filteredSteps[nextStepIndex];
              if (nextStep?.route) {
                navigate(nextStep.route);
              }
              
              return nextStepIndex;
            }
            return prevStep;
          });
        }, 500);
      }
      
      // Wenn join_or_create_organization Schritt abgeschlossen, automatisch zum nächsten Schritt wechseln
      if (stepId === 'join_or_create_organization' && currentStep === stepIndex) {
        // Warte kurz, damit UI aktualisiert werden kann
        setTimeout(() => {
          setCurrentStep(prevStep => {
            if (prevStep < filteredSteps.length - 1) {
              const nextStepIndex = prevStep + 1;
              saveProgress(nextStepIndex, newCompletedSteps, dismissedSteps);
              
              // Navigiere zum nächsten Schritt (switch_role_after_join oder welcome)
              const nextStep = filteredSteps[nextStepIndex];
              if (nextStep?.route) {
                navigate(nextStep.route);
              }
              
              return nextStepIndex;
            }
            return prevStep;
          });
        }, 500);
      }
      
      // Wenn welcome Schritt abgeschlossen und User keine Organisation hat, automatisch zur Organisation navigieren
      if (stepId === 'welcome' && currentStep === stepIndex) {
        const hasOrganization = user?.roles?.some((r: any) => r.role.organization !== null) || false;
        if (!hasOrganization) {
          // Finde Organisation-Schritt
          const orgStepIndex = filteredSteps.findIndex(s => s.id === 'join_or_create_organization');
          if (orgStepIndex !== -1) {
            // Warte kurz, damit UI aktualisiert werden kann
            setTimeout(() => {
              setCurrentStep(orgStepIndex);
              saveProgress(orgStepIndex, newCompletedSteps, dismissedSteps);
              
              // Navigiere zur Organisation-Seite
              const orgStep = filteredSteps[orgStepIndex];
              if (orgStep?.route) {
                navigate(orgStep.route);
              }
            }, 500);
          }
        }
      }
    }
  }, [filteredSteps, completedSteps, trackEvent, currentStep, saveProgress, navigate, user]);

  // Automatischer Schritt-Wechsel wenn User einer Organisation beigetreten ist
  useEffect(() => {
    if (!isActive || !user || !filteredSteps.length || currentStep >= filteredSteps.length) {
      return;
    }

    const currentStepData = filteredSteps[currentStep];
    
    // Prüfe ob aktueller Schritt join_or_create_organization ist
    if (currentStepData?.id === 'join_or_create_organization') {
      // Prüfe ob User jetzt eine Organisation hat
      const hasOrganization = user.roles?.some((r: any) => r.role.organization !== null) || false;
      
      if (hasOrganization) {
        // User hat Organisation → Schritt automatisch abschließen
        const stepIndex = filteredSteps.findIndex(s => s.id === 'join_or_create_organization');
        if (stepIndex !== -1 && !completedSteps.includes(stepIndex)) {
          completeStep('join_or_create_organization', currentStepData.title, 0);
        }
      }
    }
  }, [user, isActive, currentStep, filteredSteps, completedSteps, completeStep]);

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
        modalDismissed,
        startTour,
        stopTour,
        dismissModal,
        showModal,
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


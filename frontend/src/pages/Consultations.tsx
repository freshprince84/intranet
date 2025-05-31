import React, { useCallback, useRef } from 'react';
import { usePermissions } from '../hooks/usePermissions.ts';
import ConsultationTracker from '../components/ConsultationTracker.tsx';
import ConsultationList, { ConsultationListRef } from '../components/ConsultationList.tsx';

const Consultations: React.FC = () => {
  const { hasPermission } = usePermissions();
  const consultationListRef = useRef<ConsultationListRef>(null);

  // Callback-Funktion für das Neuladen der Beratungsliste (normale Aktionen)
  const handleConsultationChange = useCallback(() => {
    // Triggert ein Neuladen der Beratungsliste ohne Filter-Änderung
    consultationListRef.current?.refresh();
  }, []);

  // Callback-Funktion für das Starten einer Beratung (Filter wechseln)
  const handleConsultationStarted = useCallback((clientName: string) => {
    // Triggert ein Neuladen der Beratungsliste UND wechselt zum Client-Filter
    consultationListRef.current?.refresh();
    consultationListRef.current?.activateClientFilter?.(clientName);
  }, []);

  // Prüfe Berechtigungen
  if (!hasPermission('consultations', 'read')) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Keine Berechtigung
              </h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                <p>Sie haben keine Berechtigung, Beratungen anzuzeigen.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-0 px-0 -mt-6 sm:-mt-3 lg:-mt-3 sm:px-4 lg:px-6">
      <div className="py-1 space-y-6">
        {/* Consultation Tracker */}
        <div className="px-2 sm:px-0">
          <ConsultationTracker 
            onConsultationChange={handleConsultationChange}
            onConsultationStarted={handleConsultationStarted}
          />
        </div>

        {/* Consultation List */}
        <ConsultationList 
          ref={consultationListRef}
          onConsultationChange={handleConsultationChange}
        />
      </div>
    </div>
  );
};

export default Consultations; 
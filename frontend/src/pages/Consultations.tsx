import React from 'react';
import { usePermissions } from '../hooks/usePermissions.ts';
import ConsultationTracker from '../components/ConsultationTracker.tsx';
import ConsultationList from '../components/ConsultationList.tsx';

const Consultations: React.FC = () => {
  const { hasPermission } = usePermissions();

  // Prüfe Berechtigungen
  if (!hasPermission('consultations', 'read')) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
          <p className="text-red-800 dark:text-red-200">
            Sie haben keine Berechtigung, diese Seite zu sehen.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-0 px-0 -mt-6 sm:-mt-3 lg:-mt-3 sm:px-4 lg:px-6">
      <div className="py-1 space-y-6">
        {/* Consultation Tracker Box */}
        <div className="px-2 sm:px-0">
          <ConsultationTracker />
        </div>
        
        {/* Consultation List Box */}
        <ConsultationList />
      </div>
    </div>
  );
};

export default Consultations; 
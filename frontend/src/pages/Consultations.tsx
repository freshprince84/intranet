import React from 'react';
import { usePermissions } from '../hooks/usePermissions.ts';
import ConsultationTracker from '../components/ConsultationTracker.tsx';
import ConsultationList from '../components/ConsultationList.tsx';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Seitentitel */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
          <ClipboardDocumentListIcon className="h-8 w-8 mr-3" />
          Beratungen
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Verwalten Sie Ihre Kundenberatungen und erfassen Sie wichtige Notizen
        </p>
      </div>

      {/* Consultation Tracker */}
      <div className="mb-8">
        <ConsultationTracker />
      </div>

      {/* Consultation List */}
      <div>
        <ConsultationList />
      </div>
    </div>
  );
};

export default Consultations; 
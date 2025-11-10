import React from 'react';
import { ErrorCategory, ErrorSeverity } from '../services/ErrorHandler.ts';
import { 
  ExclamationCircleIcon, 
  InformationCircleIcon, 
  ExclamationTriangleIcon,
  ShieldExclamationIcon
} from '@heroicons/react/24/outline';

interface ErrorDisplayProps {
  message: string;
  category?: ErrorCategory;
  severity?: ErrorSeverity;
  onClose?: () => void;
  className?: string;
}

/**
 * Komponente zur Anzeige von Fehlermeldungen mit verschiedenen Stilen basierend auf der Fehlerkategorie
 * und Schweregrad.
 */
const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  message,
  category = ErrorCategory.GENERAL,
  severity = ErrorSeverity.ERROR,
  onClose,
  className = ''
}) => {
  // Stileinstellungen basierend auf dem Schweregrad
  const getSeverityStyles = () => {
    switch (severity) {
      case ErrorSeverity.INFO:
        return 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      case ErrorSeverity.WARNING:
        return 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
      case ErrorSeverity.CRITICAL:
        return 'bg-red-100 dark:bg-red-900/40 text-red-900 dark:text-red-300 border-red-300 dark:border-red-800';
      case ErrorSeverity.ERROR:
      default:
        return 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800';
    }
  };

  // Icon basierend auf Kategorie und Schweregrad auswählen
  const getIcon = () => {
    if (severity === ErrorSeverity.CRITICAL) {
      return <ExclamationCircleIcon className="h-5 w-5 text-red-500 dark:text-red-400" />;
    }

    switch (category) {
      case ErrorCategory.AUTHENTICATION:
      case ErrorCategory.PERMISSION:
        return <ShieldExclamationIcon className="h-5 w-5 dark:text-gray-300" />;
      case ErrorCategory.VALIDATION:
        return <ExclamationTriangleIcon className="h-5 w-5 dark:text-gray-300" />;
      case ErrorCategory.NETWORK:
      case ErrorCategory.API:
      case ErrorCategory.GENERAL:
      default:
        return <ExclamationCircleIcon className="h-5 w-5 dark:text-gray-300" />;
    }
  };

  return (
    <div className={`rounded-md p-4 border ${getSeverityStyles()} ${className}`} role="alert">
      <div className="flex">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium dark:text-gray-100">
            {category && <span className="font-bold">{category}: </span>}
            {message}
          </h3>
        </div>
        {onClose && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                  severity === ErrorSeverity.CRITICAL || severity === ErrorSeverity.ERROR
                    ? 'text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 focus:ring-red-600 dark:focus:ring-red-800'
                    : severity === ErrorSeverity.WARNING
                    ? 'text-yellow-500 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 focus:ring-yellow-600 dark:focus:ring-yellow-800'
                    : 'text-blue-500 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 focus:ring-blue-600 dark:focus:ring-blue-800'
                }`}
                onClick={onClose}
              >
                <span className="sr-only">Schließen</span>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorDisplay; 
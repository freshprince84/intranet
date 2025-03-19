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
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case ErrorSeverity.WARNING:
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case ErrorSeverity.CRITICAL:
        return 'bg-red-100 text-red-900 border-red-300';
      case ErrorSeverity.ERROR:
      default:
        return 'bg-red-50 text-red-700 border-red-200';
    }
  };

  // Icon basierend auf Kategorie und Schweregrad auswählen
  const getIcon = () => {
    if (severity === ErrorSeverity.CRITICAL) {
      return <ExclamationCircleIcon className="h-5 w-5 text-red-500" />;
    }

    switch (category) {
      case ErrorCategory.AUTHENTICATION:
      case ErrorCategory.PERMISSION:
        return <ShieldExclamationIcon className="h-5 w-5" />;
      case ErrorCategory.VALIDATION:
        return <ExclamationTriangleIcon className="h-5 w-5" />;
      case ErrorCategory.NETWORK:
      case ErrorCategory.API:
      case ErrorCategory.GENERAL:
      default:
        return <ExclamationCircleIcon className="h-5 w-5" />;
    }
  };

  return (
    <div className={`rounded-md p-4 border ${getSeverityStyles()} ${className}`} role="alert">
      <div className="flex">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium">
            {category && <span className="font-bold">{category}: </span>}
            {message}
          </h3>
        </div>
        {onClose && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  severity === ErrorSeverity.CRITICAL || severity === ErrorSeverity.ERROR
                    ? 'text-red-500 hover:bg-red-100 focus:ring-red-600'
                    : severity === ErrorSeverity.WARNING
                    ? 'text-yellow-500 hover:bg-yellow-100 focus:ring-yellow-600'
                    : 'text-blue-500 hover:bg-blue-100 focus:ring-blue-600'
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
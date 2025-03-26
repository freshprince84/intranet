import React, { Component, ErrorInfo, ReactNode } from 'react';
import ErrorDisplay from './ErrorDisplay.tsx';
import { ErrorCategory, ErrorSeverity } from '../services/ErrorHandler.ts';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary-Komponente zum Abfangen unbehandelter Fehler in der Komponenten-Hierarchie
 * und Anzeigen einer Fallback-UI statt des abgestürzten Komponenten-Baums.
 */
class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Aktualisiere den State, damit beim nächsten Render der Fallback angezeigt wird
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Logge den Fehler in der Konsole
    console.error('ErrorBoundary hat einen Fehler abgefangen:', error, errorInfo);
    
    // Rufe den optionalen onError-Handler auf, falls vorhanden
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  public render() {
    if (this.state.hasError) {
      // Wenn ein benutzerdefinierter Fallback bereitgestellt wurde, verwende diesen
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // Ansonsten zeige eine standardmäßige Fehleranzeige
      return (
        <div className="error-boundary p-4 border border-red-300 dark:border-red-800 rounded-md bg-red-50 dark:bg-red-900/30 dark:text-white">
          <ErrorDisplay
            message={`Ein unerwarteter Fehler ist aufgetreten: ${this.state.error?.message || 'Unbekannter Fehler'}`}
            category={ErrorCategory.GENERAL}
            severity={ErrorSeverity.ERROR}
          />
          <div className="mt-4">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-700 focus:ring-opacity-50 dark:focus:ring-offset-gray-800"
            >
              Zurücksetzen
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 
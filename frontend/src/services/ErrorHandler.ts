/**
 * ErrorHandler Service
 * 
 * Bietet eine zentrale Fehlerbehandlungslogik für die gesamte Anwendung.
 * Berücksichtigt verschiedene Fehlertypen (API, Client, Netzwerk, etc.)
 * und bietet standardisierte Fehlerausgaben.
 */

import { AxiosError } from 'axios';

// Fehlerkategorien
export enum ErrorCategory {
  API = 'API-Fehler',
  VALIDATION = 'Validierungsfehler',
  NETWORK = 'Netzwerkfehler',
  AUTHENTICATION = 'Authentifizierungsfehler',
  PERMISSION = 'Berechtigungsfehler',
  GENERAL = 'Allgemeiner Fehler'
}

// Fehlerprioritäten
export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

// Fehler-Detailstruktur
export interface ErrorDetails {
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  timestamp: Date;
  originalError?: any;
  code?: string | number;
  context?: Record<string, any>;
}

// Hilfsklasse zur einheitlichen Fehlerbehandlung
class ErrorHandler {
  
  // Callback für die Fehlerdarstellung in der UI
  private onErrorCallback: (message: string) => void = () => {};
  
  // Errors in dev console loggen
  private logErrors: boolean = true;
  
  // ErrorHandler konfigurieren
  public configure(options: {
    onError?: (message: string) => void;
    logErrors?: boolean;
  }) {
    if (options.onError) {
      this.onErrorCallback = options.onError;
    }
    
    if (options.logErrors !== undefined) {
      this.logErrors = options.logErrors;
    }
  }
  
  /**
   * Fehler verarbeiten und standardisieren
   */
  public handleError(error: any, context?: Record<string, any>): ErrorDetails {
    // Standardwerte
    let message = 'Ein unbekannter Fehler ist aufgetreten';
    let category = ErrorCategory.GENERAL;
    let severity = ErrorSeverity.ERROR;
    let code: string | number | undefined = undefined;
    
    // Axios-Fehler (API-Antworten)
    if (this.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      
      // HTTP-Statuscode
      code = axiosError.response?.status;
      
      // Fehlertyp nach Statuscode kategorisieren
      if (code) {
        if (code === 401 || code === 403) {
          category = ErrorCategory.AUTHENTICATION;
          message = 'Authentifizierungsfehler: Sie haben keine Berechtigung für diese Aktion';
        } else if (code === 404) {
          category = ErrorCategory.API;
          message = 'Die angeforderte Ressource wurde nicht gefunden';
        } else if (code === 422) {
          category = ErrorCategory.VALIDATION;
          message = 'Validierungsfehler: Bitte überprüfen Sie Ihre Eingaben';
        } else if (code >= 500) {
          category = ErrorCategory.API;
          severity = ErrorSeverity.CRITICAL;
          message = 'Ein Serverfehler ist aufgetreten. Bitte versuchen Sie es später erneut';
        }
      }
      
      // Detaillierte Fehlermeldung aus der API-Antwort extrahieren, falls vorhanden
      if (axiosError.response?.data) {
        const responseData = axiosError.response.data as any;
        if (responseData.message) {
          message = responseData.message;
        } else if (typeof responseData === 'string') {
          message = responseData;
        }
      }
      
      // Bei Netzwerkfehlern
      if (axiosError.code === 'ERR_NETWORK' || axiosError.code === 'ECONNABORTED') {
        category = ErrorCategory.NETWORK;
        message = 'Es konnte keine Verbindung zum Server hergestellt werden. Bitte überprüfen Sie Ihre Internetverbindung';
      }
      
    } else if (error instanceof Error) {
      // Standard JS Error
      message = error.message || 'Ein Fehler ist aufgetreten';
      
      // Spezifische Fehlertypen analysieren
      if (error.name === 'ValidationError') {
        category = ErrorCategory.VALIDATION;
      } else if (error.name === 'AuthenticationError') {
        category = ErrorCategory.AUTHENTICATION;
      }
    } else if (typeof error === 'string') {
      // Fehler als String
      message = error;
    }
    
    // Details zusammenbauen
    const errorDetails: ErrorDetails = {
      message,
      category,
      severity,
      timestamp: new Date(),
      originalError: error,
      code,
      context
    };
    
    // In die Konsole loggen (für Entwicklung)
    if (this.logErrors) {
      console.error(`[${errorDetails.category}] ${errorDetails.message}`, {
        severity: errorDetails.severity,
        code: errorDetails.code,
        context: errorDetails.context,
        originalError: errorDetails.originalError
      });
    }
    
    // Callback für UI-Benachrichtigung aufrufen
    this.onErrorCallback(errorDetails.message);
    
    return errorDetails;
  }
  
  /**
   * Validierungsfehler verarbeiten
   */
  public handleValidationError(message: string, fieldErrors?: Record<string, string>): ErrorDetails {
    const errorDetails = this.handleError({
      name: 'ValidationError',
      message: message
    }, { fieldErrors });
    
    errorDetails.category = ErrorCategory.VALIDATION;
    errorDetails.severity = ErrorSeverity.WARNING;
    
    return errorDetails;
  }
  
  /**
   * Berechtigungsfehler verarbeiten
   */
  public handlePermissionError(message: string = 'Sie haben nicht die erforderlichen Berechtigungen für diese Aktion'): ErrorDetails {
    const errorDetails = this.handleError({
      name: 'PermissionError',
      message: message
    });
    
    errorDetails.category = ErrorCategory.PERMISSION;
    
    return errorDetails;
  }
  
  /**
   * Aufgabenspezifischen Fehler verarbeiten
   */
  public handleTaskError(message: string, taskId?: number): ErrorDetails {
    return this.handleError({ 
      message 
    }, { 
      taskId,
      source: 'TaskManagement'
    });
  }

  /**
   * Prüfen, ob es sich um einen Axios-Fehler handelt
   */
  private isAxiosError(error: any): boolean {
    return error && error.isAxiosError === true;
  }
}

// Exportiere eine Singleton-Instanz, damit der ErrorHandler in der gesamten App konsistent ist
export const errorHandler = new ErrorHandler();

export default errorHandler; 
import errorHandler from './ErrorHandler.ts';

/**
 * Initialisiert den ErrorHandler mit globalen Einstellungen
 * Diese Funktion sollte beim Starten der Anwendung aufgerufen werden
 */
export function initializeErrorHandler() {
  errorHandler.configure({
    // Hier könnte ein global verfügbarer Benachrichtigungsdienst eingebunden werden
    onError: (message) => {
      console.error(`[Global Error]: ${message}`);
      // Hier könnte eine globale UI-Benachrichtigung angezeigt werden
    },
    // In Produktionsumgebung auf false setzen, um keine sensiblen Daten zu loggen
    logErrors: process.env.NODE_ENV !== 'production'
  });
  
  // Unbehandelte Fehler global abfangen
  window.addEventListener('error', (event) => {
    console.error('Unbehandelter Fehler aufgetreten:', event.error);
    errorHandler.handleError(event.error, {
      type: 'UnhandledError',
      origin: event.filename,
      lineNumber: event.lineno,
      columnNumber: event.colno
    });
    
    // Verhindern, dass der Browser seinen eigenen Fehler zeigt
    event.preventDefault();
    return true;
  });
  
  // Unbehandelte Promise-Rejections global abfangen
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unbehandelte Promise-Rejection aufgetreten:', event.reason);
    errorHandler.handleError(event.reason, {
      type: 'UnhandledRejection'
    });
    
    // Verhindern, dass der Browser seine eigene Fehlermeldung zeigt
    event.preventDefault();
    return true;
  });
  
  logger.log('ErrorHandler erfolgreich initialisiert');
}

export default initializeErrorHandler; 
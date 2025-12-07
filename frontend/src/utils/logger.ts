/**
 * Logger Utility - Wrappt console.log Statements für Production
 * 
 * Verwendung:
 * - logger.log() - Nur in Development
 * - logger.debug() - Nur in Development
 * - logger.info() - Nur in Development
 * - logger.warn() - Immer (auch in Production)
 * - logger.error() - Immer (auch in Production)
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
  warn: (...args: any[]) => {
    // Warnungen immer anzeigen (auch in Production)
    console.warn(...args);
  },
  error: (...args: any[]) => {
    // Fehler immer anzeigen (auch in Production)
    console.error(...args);
  }
};


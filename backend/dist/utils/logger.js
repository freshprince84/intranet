"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const isDevelopment = process.env.NODE_ENV === 'development';
exports.logger = {
    log: (...args) => {
        if (isDevelopment) {
            console.log(...args);
        }
    },
    debug: (...args) => {
        if (isDevelopment) {
            console.debug(...args);
        }
    },
    info: (...args) => {
        if (isDevelopment) {
            console.info(...args);
        }
    },
    warn: (...args) => {
        // Warnungen immer anzeigen (auch in Production)
        console.warn(...args);
    },
    error: (...args) => {
        // Fehler immer anzeigen (auch in Production)
        console.error(...args);
    }
};
//# sourceMappingURL=logger.js.map
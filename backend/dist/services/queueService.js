"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateGuestContactQueue = exports.paymentQueue = exports.notificationQueue = exports.reservationQueue = void 0;
exports.getReservationQueue = getReservationQueue;
exports.getNotificationQueue = getNotificationQueue;
exports.getPaymentQueue = getPaymentQueue;
exports.getUpdateGuestContactQueue = getUpdateGuestContactQueue;
exports.checkQueueHealth = checkQueueHealth;
exports.getRedisConnection = getRedisConnection;
exports.closeQueues = closeQueues;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = require("../utils/logger");
/**
 * Redis-Connection für BullMQ
 * Konfiguriert über Environment-Variablen
 * Lazy Connect: Verbindung wird erst beim ersten Gebrauch hergestellt
 */
let connection = null;
/**
 * Erstellt oder gibt die Redis-Verbindung zurück
 * Lazy Initialization: Verbindung wird nur erstellt, wenn sie gebraucht wird
 */
function getConnection() {
    if (!connection) {
        const queueEnabled = process.env.QUEUE_ENABLED === 'true';
        connection = new ioredis_1.default({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD || undefined,
            db: parseInt(process.env.REDIS_DB || '0'),
            family: 4, // IPv4 erzwingen (wichtig für Memurai auf Windows)
            maxRetriesPerRequest: null, // Wichtig für BullMQ
            lazyConnect: true, // Verbindung wird erst beim ersten Gebrauch hergestellt
            enableOfflineQueue: false, // Keine Offline-Queue, um Fehler zu vermeiden
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
        });
        // Error-Handler: Nur einmal loggen, nicht bei jedem Fehler
        let lastErrorTime = 0;
        const ERROR_LOG_INTERVAL = 60000; // 1 Minute zwischen Fehler-Logs
        connection.on('error', (error) => {
            const now = Date.now();
            // Nur loggen, wenn QUEUE_ENABLED=true ist oder wenn letzter Fehler länger her ist
            if (queueEnabled && (now - lastErrorTime > ERROR_LOG_INTERVAL)) {
                logger_1.logger.error('[Queue Service] Redis-Verbindungsfehler:', error.message);
                lastErrorTime = now;
            }
        });
        connection.on('connect', () => {
            logger_1.logger.log('[Queue Service] ✅ Redis-Verbindung hergestellt');
        });
        connection.on('ready', () => {
            logger_1.logger.log('[Queue Service] ✅ Redis bereit');
        });
    }
    return connection;
}
/**
 * Reservation Queue
 * Verarbeitet Jobs für Reservierungs-Erstellung und -Updates
 * Lazy Initialization: Queue wird nur erstellt, wenn gebraucht
 */
let reservationQueueInstance = null;
function getReservationQueue() {
    if (!reservationQueueInstance) {
        reservationQueueInstance = new bullmq_1.Queue('reservation', {
            connection: getConnection(),
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000,
                },
                removeOnComplete: {
                    age: 24 * 3600, // 24 Stunden
                    count: 1000, // Max 1000 Jobs
                },
                removeOnFail: {
                    age: 7 * 24 * 3600, // 7 Tage für Debugging
                },
            },
        });
    }
    return reservationQueueInstance;
}
// Export für Rückwärtskompatibilität
exports.reservationQueue = new Proxy({}, {
    get(target, prop) {
        const queue = getReservationQueue();
        const value = queue[prop];
        // Wenn es eine Funktion ist, binde sie an die Queue-Instanz
        if (typeof value === 'function') {
            return value.bind(queue);
        }
        return value;
    },
});
/**
 * Notification Queue
 * Verarbeitet Jobs für Benachrichtigungen (WhatsApp, E-Mail)
 * Lazy Initialization: Queue wird nur erstellt, wenn gebraucht
 */
let notificationQueueInstance = null;
function getNotificationQueue() {
    if (!notificationQueueInstance) {
        notificationQueueInstance = new bullmq_1.Queue('notification', {
            connection: getConnection(),
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000,
                },
                removeOnComplete: {
                    age: 24 * 3600,
                    count: 1000,
                },
                removeOnFail: {
                    age: 7 * 24 * 3600,
                },
            },
        });
    }
    return notificationQueueInstance;
}
// Export für Rückwärtskompatibilität
exports.notificationQueue = new Proxy({}, {
    get(target, prop) {
        const queue = getNotificationQueue();
        const value = queue[prop];
        // Wenn es eine Funktion ist, binde sie an die Queue-Instanz
        if (typeof value === 'function') {
            return value.bind(queue);
        }
        return value;
    },
});
/**
 * Payment Queue
 * Verarbeitet Jobs für Payment-Link-Erstellung
 * Lazy Initialization: Queue wird nur erstellt, wenn gebraucht
 */
let paymentQueueInstance = null;
function getPaymentQueue() {
    if (!paymentQueueInstance) {
        paymentQueueInstance = new bullmq_1.Queue('payment', {
            connection: getConnection(),
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000,
                },
                removeOnComplete: {
                    age: 24 * 3600,
                    count: 1000,
                },
                removeOnFail: {
                    age: 7 * 24 * 3600,
                },
            },
        });
    }
    return paymentQueueInstance;
}
// Export für Rückwärtskompatibilität
exports.paymentQueue = new Proxy({}, {
    get(target, prop) {
        const queue = getPaymentQueue();
        const value = queue[prop];
        // Wenn es eine Funktion ist, binde sie an die Queue-Instanz
        if (typeof value === 'function') {
            return value.bind(queue);
        }
        return value;
    },
});
/**
 * Update Guest Contact Queue
 * Verarbeitet Jobs für Guest Contact Updates (Payment-Link, TTLock, WhatsApp)
 * Lazy Initialization: Queue wird nur erstellt, wenn gebraucht
 */
let updateGuestContactQueueInstance = null;
function getUpdateGuestContactQueue() {
    if (!updateGuestContactQueueInstance) {
        updateGuestContactQueueInstance = new bullmq_1.Queue('update-guest-contact', {
            connection: getConnection(),
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000,
                },
                removeOnComplete: {
                    age: 24 * 3600,
                    count: 1000,
                },
                removeOnFail: {
                    age: 7 * 24 * 3600,
                },
            },
        });
    }
    return updateGuestContactQueueInstance;
}
// Export für Rückwärtskompatibilität
exports.updateGuestContactQueue = new Proxy({}, {
    get(target, prop) {
        const queue = getUpdateGuestContactQueue();
        const value = queue[prop];
        // Wenn es eine Funktion ist, binde sie an die Queue-Instanz
        if (typeof value === 'function') {
            return value.bind(queue);
        }
        return value;
    },
});
/**
 * Health-Check für Redis-Verbindung
 * @returns true wenn Redis erreichbar ist
 */
function checkQueueHealth() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const conn = getConnection();
            // Versuche Verbindung herzustellen, falls noch nicht verbunden
            if (conn.status !== 'ready' && conn.status !== 'connecting') {
                yield conn.connect().catch(() => {
                    // Ignoriere Verbindungsfehler beim Health-Check
                });
            }
            yield conn.ping();
            return true;
        }
        catch (error) {
            // Nur loggen, wenn QUEUE_ENABLED=true ist
            const queueEnabled = process.env.QUEUE_ENABLED === 'true';
            if (queueEnabled) {
                logger_1.logger.error('[Queue Service] Redis-Verbindung fehlgeschlagen:', error);
            }
            return false;
        }
    });
}
/**
 * Gibt die Redis-Connection zurück (für Worker)
 */
function getRedisConnection() {
    return getConnection();
}
/**
 * Schließt alle Queue-Verbindungen
 * Wird beim Graceful Shutdown aufgerufen
 */
function closeQueues() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const queues = [
                reservationQueueInstance,
                notificationQueueInstance,
                paymentQueueInstance,
                updateGuestContactQueueInstance,
            ].filter((q) => q !== null);
            if (queues.length > 0) {
                yield Promise.all(queues.map((q) => q.close()));
            }
            if (connection && connection.status !== 'end') {
                yield connection.quit();
            }
            logger_1.logger.log('[Queue Service] Alle Queues geschlossen');
        }
        catch (error) {
            logger_1.logger.error('[Queue Service] Fehler beim Schließen der Queues:', error);
        }
    });
}
//# sourceMappingURL=queueService.js.map
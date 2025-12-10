import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { logger } from '../utils/logger';

/**
 * Redis-Connection für BullMQ
 * Konfiguriert über Environment-Variablen
 * Lazy Connect: Verbindung wird erst beim ersten Gebrauch hergestellt
 */
let connection: IORedis | null = null;

/**
 * Erstellt oder gibt die Redis-Verbindung zurück
 * Lazy Initialization: Verbindung wird nur erstellt, wenn sie gebraucht wird
 */
function getConnection(): IORedis {
  if (!connection) {
    const queueEnabled = process.env.QUEUE_ENABLED === 'true';
    
    connection = new IORedis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0'),
      family: 4, // IPv4 erzwingen (wichtig für Memurai auf Windows)
      maxRetriesPerRequest: null, // Wichtig für BullMQ
      lazyConnect: true, // Verbindung wird erst beim ersten Gebrauch hergestellt
      enableOfflineQueue: true, // Queue Befehle wenn Redis kurzzeitig nicht erreichbar
      retryStrategy: (times: number) => {
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
        logger.error('[Queue Service] Redis-Verbindungsfehler:', error.message);
        lastErrorTime = now;
      }
    });

    connection.on('connect', () => {
      logger.log('[Queue Service] ✅ Redis-Verbindung hergestellt');
    });

    connection.on('ready', () => {
      logger.log('[Queue Service] ✅ Redis bereit');
    });
  }
  
  return connection;
}

/**
 * Reservation Queue
 * Verarbeitet Jobs für Reservierungs-Erstellung und -Updates
 * Lazy Initialization: Queue wird nur erstellt, wenn gebraucht
 */
let reservationQueueInstance: Queue | null = null;
export function getReservationQueue(): Queue {
  if (!reservationQueueInstance) {
    reservationQueueInstance = new Queue('reservation', {
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
export const reservationQueue = new Proxy({} as Queue, {
  get(target, prop) {
    const queue = getReservationQueue();
    const value = queue[prop as keyof Queue];
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
let notificationQueueInstance: Queue | null = null;
export function getNotificationQueue(): Queue {
  if (!notificationQueueInstance) {
    notificationQueueInstance = new Queue('notification', {
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
export const notificationQueue = new Proxy({} as Queue, {
  get(target, prop) {
    const queue = getNotificationQueue();
    const value = queue[prop as keyof Queue];
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
let paymentQueueInstance: Queue | null = null;
export function getPaymentQueue(): Queue {
  if (!paymentQueueInstance) {
    paymentQueueInstance = new Queue('payment', {
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
export const paymentQueue = new Proxy({} as Queue, {
  get(target, prop) {
    const queue = getPaymentQueue();
    const value = queue[prop as keyof Queue];
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
let updateGuestContactQueueInstance: Queue | null = null;
export function getUpdateGuestContactQueue(): Queue {
  if (!updateGuestContactQueueInstance) {
    updateGuestContactQueueInstance = new Queue('update-guest-contact', {
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
export const updateGuestContactQueue = new Proxy({} as Queue, {
  get(target, prop) {
    const queue = getUpdateGuestContactQueue();
    const value = queue[prop as keyof Queue];
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
export async function checkQueueHealth(): Promise<boolean> {
  try {
    const conn = getConnection();
    // Versuche Verbindung herzustellen, falls noch nicht verbunden
    if (conn.status !== 'ready' && conn.status !== 'connecting') {
      await conn.connect().catch(() => {
        // Ignoriere Verbindungsfehler beim Health-Check
      });
    }
    await conn.ping();
    return true;
  } catch (error) {
    // Nur loggen, wenn QUEUE_ENABLED=true ist
    const queueEnabled = process.env.QUEUE_ENABLED === 'true';
    if (queueEnabled) {
      logger.error('[Queue Service] Redis-Verbindung fehlgeschlagen:', error);
    }
    return false;
  }
}

/**
 * Gibt die Redis-Connection zurück (für Worker)
 */
export function getRedisConnection(): IORedis {
  return getConnection();
}

/**
 * Schließt alle Queue-Verbindungen
 * Wird beim Graceful Shutdown aufgerufen
 */
export async function closeQueues(): Promise<void> {
  try {
    const queues = [
      reservationQueueInstance,
      notificationQueueInstance,
      paymentQueueInstance,
      updateGuestContactQueueInstance,
    ].filter((q) => q !== null) as Queue[];

    if (queues.length > 0) {
      await Promise.all(queues.map((q) => q.close()));
    }

    if (connection && connection.status !== 'end') {
      await connection.quit();
    }
    logger.log('[Queue Service] Alle Queues geschlossen');
  } catch (error) {
    logger.error('[Queue Service] Fehler beim Schließen der Queues:', error);
  }
}


import { Worker as BullMQWorker } from 'bullmq';
import { createReservationWorker } from './workers/reservationWorker';
import { createUpdateGuestContactWorker } from './workers/updateGuestContactWorker';
import { createImageGenerationWorker } from './workers/imageGenerationWorker';
import { checkQueueHealth, getRedisConnection } from '../services/queueService';
import { logger } from '../utils/logger';

let workers: BullMQWorker[] = [];

/**
 * Startet alle Queue-Workers
 * Wird beim Server-Start aufgerufen
 */
export async function startWorkers(): Promise<void> {
  // Prüfe Redis-Verbindung
  const isHealthy = await checkQueueHealth();
  if (!isHealthy) {
    logger.error('[Queue] ⚠️ Redis nicht verfügbar - Workers werden nicht gestartet');
    logger.error('[Queue] Stelle sicher, dass Redis läuft und die Verbindung korrekt konfiguriert ist');
    return;
  }

  const queueEnabled = process.env.QUEUE_ENABLED === 'true';
  if (!queueEnabled) {
    logger.log('[Queue] Queue-System ist deaktiviert (QUEUE_ENABLED=false)');
    return;
  }

  logger.log('[Queue] Starte Workers...');

  try {
    const connection = getRedisConnection();

    // Reservation Worker
    const reservationWorker = createReservationWorker(connection);
    workers.push(reservationWorker);

    reservationWorker.on('completed', (job) => {
      logger.log(`[Queue] ✅ Reservation Job ${job.id} erfolgreich abgeschlossen`);
    });

    reservationWorker.on('failed', (job, err) => {
      logger.error(`[Queue] ❌ Reservation Job ${job?.id} fehlgeschlagen:`, err.message);
    });

    reservationWorker.on('error', (err) => {
      logger.error('[Queue] ❌ Reservation Worker-Fehler:', err);
    });

    // Update Guest Contact Worker
    const updateGuestContactWorker = createUpdateGuestContactWorker(connection);
    workers.push(updateGuestContactWorker);

    updateGuestContactWorker.on('completed', (job) => {
      logger.log(`[Queue] ✅ UpdateGuestContact Job ${job.id} erfolgreich abgeschlossen`);
    });

    updateGuestContactWorker.on('failed', (job, err) => {
      logger.error(`[Queue] ❌ UpdateGuestContact Job ${job?.id} fehlgeschlagen:`, err.message);
    });

    updateGuestContactWorker.on('error', (err) => {
      logger.error('[Queue] ❌ UpdateGuestContact Worker-Fehler:', err);
    });

    // Image Generation Worker
    const imageGenerationWorker = createImageGenerationWorker(connection);
    workers.push(imageGenerationWorker);

    imageGenerationWorker.on('completed', (job) => {
      logger.log(`[Queue] ✅ Image Generation Job ${job.id} erfolgreich abgeschlossen`);
    });

    imageGenerationWorker.on('failed', (job, err) => {
      logger.error(`[Queue] ❌ Image Generation Job ${job?.id} fehlgeschlagen:`, err.message);
    });

    imageGenerationWorker.on('error', (err) => {
      logger.error('[Queue] ❌ Image Generation Worker-Fehler:', err);
    });

    logger.log('[Queue] ✅ Workers gestartet');
    logger.log(`[Queue] Concurrency: ${process.env.QUEUE_CONCURRENCY || '5'} Jobs parallel`);
  } catch (error) {
    logger.error('[Queue] ❌ Fehler beim Starten der Workers:', error);
    throw error;
  }
}

/**
 * Stoppt alle Queue-Workers
 * Wird beim Graceful Shutdown aufgerufen
 */
export async function stopWorkers(): Promise<void> {
  logger.log('[Queue] Stoppe Workers...');
  try {
    await Promise.all(workers.map((worker) => worker.close()));
    workers = [];
    logger.log('[Queue] ✅ Workers gestoppt');
  } catch (error) {
    logger.error('[Queue] ❌ Fehler beim Stoppen der Workers:', error);
  }
}


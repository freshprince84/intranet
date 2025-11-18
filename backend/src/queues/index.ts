import { Worker as BullMQWorker } from 'bullmq';
import { createReservationWorker } from './workers/reservationWorker';
import { createUpdateGuestContactWorker } from './workers/updateGuestContactWorker';
import { checkQueueHealth, getRedisConnection } from '../services/queueService';

let workers: BullMQWorker[] = [];

/**
 * Startet alle Queue-Workers
 * Wird beim Server-Start aufgerufen
 */
export async function startWorkers(): Promise<void> {
  // Prüfe Redis-Verbindung
  const isHealthy = await checkQueueHealth();
  if (!isHealthy) {
    console.error('[Queue] ⚠️ Redis nicht verfügbar - Workers werden nicht gestartet');
    console.error('[Queue] Stelle sicher, dass Redis läuft und die Verbindung korrekt konfiguriert ist');
    return;
  }

  const queueEnabled = process.env.QUEUE_ENABLED === 'true';
  if (!queueEnabled) {
    console.log('[Queue] Queue-System ist deaktiviert (QUEUE_ENABLED=false)');
    return;
  }

  console.log('[Queue] Starte Workers...');

  try {
    const connection = getRedisConnection();

    // Reservation Worker
    const reservationWorker = createReservationWorker(connection);
    workers.push(reservationWorker);

    reservationWorker.on('completed', (job) => {
      console.log(`[Queue] ✅ Reservation Job ${job.id} erfolgreich abgeschlossen`);
    });

    reservationWorker.on('failed', (job, err) => {
      console.error(`[Queue] ❌ Reservation Job ${job?.id} fehlgeschlagen:`, err.message);
    });

    reservationWorker.on('error', (err) => {
      console.error('[Queue] ❌ Reservation Worker-Fehler:', err);
    });

    // Update Guest Contact Worker
    const updateGuestContactWorker = createUpdateGuestContactWorker(connection);
    workers.push(updateGuestContactWorker);

    updateGuestContactWorker.on('completed', (job) => {
      console.log(`[Queue] ✅ UpdateGuestContact Job ${job.id} erfolgreich abgeschlossen`);
    });

    updateGuestContactWorker.on('failed', (job, err) => {
      console.error(`[Queue] ❌ UpdateGuestContact Job ${job?.id} fehlgeschlagen:`, err.message);
    });

    updateGuestContactWorker.on('error', (err) => {
      console.error('[Queue] ❌ UpdateGuestContact Worker-Fehler:', err);
    });

    console.log('[Queue] ✅ Workers gestartet');
    console.log(`[Queue] Concurrency: ${process.env.QUEUE_CONCURRENCY || '5'} Jobs parallel`);
  } catch (error) {
    console.error('[Queue] ❌ Fehler beim Starten der Workers:', error);
    throw error;
  }
}

/**
 * Stoppt alle Queue-Workers
 * Wird beim Graceful Shutdown aufgerufen
 */
export async function stopWorkers(): Promise<void> {
  console.log('[Queue] Stoppe Workers...');
  try {
    await Promise.all(workers.map((worker) => worker.close()));
    workers = [];
    console.log('[Queue] ✅ Workers gestoppt');
  } catch (error) {
    console.error('[Queue] ❌ Fehler beim Stoppen der Workers:', error);
  }
}


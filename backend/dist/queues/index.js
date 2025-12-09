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
Object.defineProperty(exports, "__esModule", { value: true });
exports.startWorkers = startWorkers;
exports.stopWorkers = stopWorkers;
const reservationWorker_1 = require("./workers/reservationWorker");
const updateGuestContactWorker_1 = require("./workers/updateGuestContactWorker");
const queueService_1 = require("../services/queueService");
const logger_1 = require("../utils/logger");
let workers = [];
/**
 * Startet alle Queue-Workers
 * Wird beim Server-Start aufgerufen
 */
function startWorkers() {
    return __awaiter(this, void 0, void 0, function* () {
        // Prüfe Redis-Verbindung
        const isHealthy = yield (0, queueService_1.checkQueueHealth)();
        if (!isHealthy) {
            logger_1.logger.error('[Queue] ⚠️ Redis nicht verfügbar - Workers werden nicht gestartet');
            logger_1.logger.error('[Queue] Stelle sicher, dass Redis läuft und die Verbindung korrekt konfiguriert ist');
            return;
        }
        const queueEnabled = process.env.QUEUE_ENABLED === 'true';
        if (!queueEnabled) {
            logger_1.logger.log('[Queue] Queue-System ist deaktiviert (QUEUE_ENABLED=false)');
            return;
        }
        logger_1.logger.log('[Queue] Starte Workers...');
        try {
            const connection = (0, queueService_1.getRedisConnection)();
            // Reservation Worker
            const reservationWorker = (0, reservationWorker_1.createReservationWorker)(connection);
            workers.push(reservationWorker);
            reservationWorker.on('completed', (job) => {
                logger_1.logger.log(`[Queue] ✅ Reservation Job ${job.id} erfolgreich abgeschlossen`);
            });
            reservationWorker.on('failed', (job, err) => {
                logger_1.logger.error(`[Queue] ❌ Reservation Job ${job === null || job === void 0 ? void 0 : job.id} fehlgeschlagen:`, err.message);
            });
            reservationWorker.on('error', (err) => {
                logger_1.logger.error('[Queue] ❌ Reservation Worker-Fehler:', err);
            });
            // Update Guest Contact Worker
            const updateGuestContactWorker = (0, updateGuestContactWorker_1.createUpdateGuestContactWorker)(connection);
            workers.push(updateGuestContactWorker);
            updateGuestContactWorker.on('completed', (job) => {
                logger_1.logger.log(`[Queue] ✅ UpdateGuestContact Job ${job.id} erfolgreich abgeschlossen`);
            });
            updateGuestContactWorker.on('failed', (job, err) => {
                logger_1.logger.error(`[Queue] ❌ UpdateGuestContact Job ${job === null || job === void 0 ? void 0 : job.id} fehlgeschlagen:`, err.message);
            });
            updateGuestContactWorker.on('error', (err) => {
                logger_1.logger.error('[Queue] ❌ UpdateGuestContact Worker-Fehler:', err);
            });
            logger_1.logger.log('[Queue] ✅ Workers gestartet');
            logger_1.logger.log(`[Queue] Concurrency: ${process.env.QUEUE_CONCURRENCY || '5'} Jobs parallel`);
        }
        catch (error) {
            logger_1.logger.error('[Queue] ❌ Fehler beim Starten der Workers:', error);
            throw error;
        }
    });
}
/**
 * Stoppt alle Queue-Workers
 * Wird beim Graceful Shutdown aufgerufen
 */
function stopWorkers() {
    return __awaiter(this, void 0, void 0, function* () {
        logger_1.logger.log('[Queue] Stoppe Workers...');
        try {
            yield Promise.all(workers.map((worker) => worker.close()));
            workers = [];
            logger_1.logger.log('[Queue] ✅ Workers gestoppt');
        }
        catch (error) {
            logger_1.logger.error('[Queue] ❌ Fehler beim Stoppen der Workers:', error);
        }
    });
}
//# sourceMappingURL=index.js.map
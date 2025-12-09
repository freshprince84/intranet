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
exports.EmailReservationScheduler = void 0;
const emailReservationService_1 = require("./emailReservationService");
const prisma_1 = require("../utils/prisma");
const logger_1 = require("../utils/logger");
/**
 * Scheduler für automatische Email-Reservation-Verarbeitung
 *
 * Prüft regelmäßig auf neue Reservation-Emails und erstellt automatisch Reservationen
 */
class EmailReservationScheduler {
    /**
     * Startet den Scheduler
     *
     * Prüft alle 10 Minuten auf neue Emails für alle Organisationen mit aktivierter Email-Reading-Konfiguration
     */
    static start() {
        if (this.isRunning) {
            logger_1.logger.log('[EmailReservationScheduler] Scheduler läuft bereits');
            return;
        }
        logger_1.logger.log('[EmailReservationScheduler] Scheduler gestartet');
        // Prüfe alle 10 Minuten
        const CHECK_INTERVAL_MS = 10 * 60 * 1000; // 10 Minuten
        this.checkInterval = setInterval(() => __awaiter(this, void 0, void 0, function* () {
            yield this.checkAllOrganizations();
        }), CHECK_INTERVAL_MS);
        // Führe sofort einen Check aus beim Start
        this.checkAllOrganizations();
        this.isRunning = true;
    }
    /**
     * Stoppt den Scheduler
     */
    static stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
            this.isRunning = false;
            logger_1.logger.log('[EmailReservationScheduler] Scheduler gestoppt');
        }
    }
    /**
     * Prüft alle Organisationen auf neue Reservation-Emails
     */
    static checkAllOrganizations() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                logger_1.logger.log('[EmailReservationScheduler] Starte Email-Check für alle Organisationen...');
                // Hole alle Organisationen
                const organizations = yield prisma_1.prisma.organization.findMany({
                    select: {
                        id: true,
                        name: true,
                        settings: true
                    }
                });
                let totalProcessed = 0;
                // Prüfe jede Organisation
                for (const org of organizations) {
                    try {
                        // Prüfe ob Email-Reading aktiviert ist
                        if (!org.settings || typeof org.settings !== 'object') {
                            continue;
                        }
                        const orgSettings = org.settings;
                        const emailReading = orgSettings.emailReading;
                        // ⚠️ WICHTIG: Email-Reading für Organisation 1 (La Familia Hostel) ist STANDARDMÄSSIG aktiviert
                        // Das Seed-Script stellt sicher, dass Email-Reading für Organisation 1 immer aktiviert ist
                        if (!emailReading || !emailReading.enabled) {
                            // Für Organisation 1: Warnung, wenn Email-Reading deaktiviert ist
                            if (org.id === 1) {
                                logger_1.logger.warn(`[EmailReservationScheduler] ⚠️ Email-Reading für Organisation 1 ist deaktiviert - sollte standardmäßig aktiviert sein!`);
                            }
                            continue;
                        }
                        logger_1.logger.log(`[EmailReservationScheduler] Prüfe Organisation ${org.id} (${org.name})...`);
                        // Prüfe auf neue Emails
                        const processedCount = yield emailReservationService_1.EmailReservationService.checkForNewReservationEmails(org.id);
                        totalProcessed += processedCount;
                        if (processedCount > 0) {
                            logger_1.logger.log(`[EmailReservationScheduler] ✅ Organisation ${org.id}: ${processedCount} Reservation(s) erstellt`);
                        }
                    }
                    catch (error) {
                        logger_1.logger.error(`[EmailReservationScheduler] Fehler bei Organisation ${org.id}:`, error);
                        // Weiter mit nächster Organisation
                    }
                }
                if (totalProcessed > 0) {
                    logger_1.logger.log(`[EmailReservationScheduler] ✅ Insgesamt ${totalProcessed} Reservation(s) aus Emails erstellt`);
                }
                else {
                    logger_1.logger.log('[EmailReservationScheduler] Keine neuen Reservation-Emails gefunden');
                }
            }
            catch (error) {
                logger_1.logger.error('[EmailReservationScheduler] Fehler beim Email-Check:', error);
            }
        });
    }
    /**
     * Führt manuell einen Email-Check für eine bestimmte Organisation aus (für Tests)
     */
    static triggerManually(organizationId) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.logger.log('[EmailReservationScheduler] Manueller Trigger...');
            if (organizationId) {
                // Prüfe nur eine Organisation
                try {
                    const processedCount = yield emailReservationService_1.EmailReservationService.checkForNewReservationEmails(organizationId);
                    logger_1.logger.log(`[EmailReservationScheduler] Manueller Check für Organisation ${organizationId}: ${processedCount} Reservation(s) erstellt`);
                    return processedCount;
                }
                catch (error) {
                    logger_1.logger.error(`[EmailReservationScheduler] Fehler beim manuellen Check für Organisation ${organizationId}:`, error);
                    throw error;
                }
            }
            else {
                // Prüfe alle Organisationen
                yield this.checkAllOrganizations();
                return 0; // Anzahl wird in checkAllOrganizations geloggt
            }
        });
    }
}
exports.EmailReservationScheduler = EmailReservationScheduler;
EmailReservationScheduler.checkInterval = null;
EmailReservationScheduler.isRunning = false;
//# sourceMappingURL=emailReservationScheduler.js.map
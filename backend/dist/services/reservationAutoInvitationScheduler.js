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
exports.ReservationAutoInvitationScheduler = void 0;
const reservationNotificationService_1 = require("./reservationNotificationService");
const date_fns_tz_1 = require("date-fns-tz");
const timeUtils_1 = require("../utils/timeUtils");
const prisma_1 = require("../utils/prisma");
const logger_1 = require("../utils/logger");
/**
 * Scheduler für automatische Reservierungs-Einladungen
 *
 * Sendet Check-in-Einladungen automatisch 1 Tag vor Check-in-Date um 08:00 Uhr
 * in der Zeitzone der Organisation (nicht Server-Zeit!)
 */
class ReservationAutoInvitationScheduler {
    /**
     * Startet den Scheduler
     *
     * Prüft alle 10 Minuten, ob es 08:00 Uhr in der Zeitzone der Organisation ist
     */
    static start() {
        logger_1.logger.log('[ReservationAutoInvitationScheduler] Scheduler gestartet');
        // Prüfe alle 10 Minuten
        const CHECK_INTERVAL_MS = 10 * 60 * 1000; // 10 Minuten
        this.checkInterval = setInterval(() => __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.checkAndSendInvitations();
            }
            catch (error) {
                logger_1.logger.error('[ReservationAutoInvitationScheduler] Fehler beim Prüfen:', error);
            }
        }), CHECK_INTERVAL_MS);
    }
    /**
     * Stoppt den Scheduler
     */
    static stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
            logger_1.logger.log('[ReservationAutoInvitationScheduler] Scheduler gestoppt');
        }
    }
    /**
     * Prüft alle Organisationen und sendet Einladungen für Reservations mit Check-in morgen
     */
    static checkAndSendInvitations() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const now = new Date(); // UTC
            // Hole alle Branches mit autoSendReservationInvitation = true
            const branches = yield prisma_1.prisma.branch.findMany({
                where: {
                    autoSendReservationInvitation: true
                },
                include: {
                    organization: {
                        select: {
                            id: true,
                            country: true
                        }
                    }
                }
            });
            if (branches.length === 0) {
                return; // Keine Branches mit aktiviertem automatischen Versand
            }
            // Gruppiere Branches nach Organisation (für Zeitzone-Prüfung)
            const branchesByOrg = new Map();
            for (const branch of branches) {
                if (!branch.organizationId)
                    continue;
                if (!branchesByOrg.has(branch.organizationId)) {
                    branchesByOrg.set(branch.organizationId, []);
                }
                branchesByOrg.get(branch.organizationId).push(branch);
            }
            // Prüfe für jede Organisation, ob es 08:00 Uhr in ihrer Zeitzone ist
            for (const [organizationId, orgBranches] of branchesByOrg.entries()) {
                const organization = (_a = orgBranches[0]) === null || _a === void 0 ? void 0 : _a.organization;
                if (!(organization === null || organization === void 0 ? void 0 : organization.country)) {
                    logger_1.logger.warn(`[ReservationAutoInvitationScheduler] Organisation ${organizationId} hat kein country - überspringe`);
                    continue;
                }
                // Bestimme Zeitzone der Organisation
                const timezone = (0, timeUtils_1.getTimezoneForCountry)(organization.country);
                // Prüfe aktuelle Zeit in Zeitzone der Organisation
                const nowInTimezone = (0, date_fns_tz_1.toZonedTime)(now, timezone);
                const currentHour = nowInTimezone.getHours();
                const currentDate = nowInTimezone.toDateString();
                // Prüfe ob es 08:00 Uhr ist (und heute noch nicht gesendet)
                if (currentHour === 8 && this.lastCheckDate !== currentDate) {
                    logger_1.logger.log(`[ReservationAutoInvitationScheduler] Es ist 08:00 Uhr in Zeitzone ${timezone} für Organisation ${organizationId} - starte Versand...`);
                    this.lastCheckDate = currentDate;
                    try {
                        yield this.sendInvitationsForTomorrow(orgBranches, organizationId);
                        logger_1.logger.log(`[ReservationAutoInvitationScheduler] Versand abgeschlossen für Organisation ${organizationId}`);
                    }
                    catch (error) {
                        logger_1.logger.error(`[ReservationAutoInvitationScheduler] Fehler beim Versand für Organisation ${organizationId}:`, error);
                    }
                }
            }
        });
    }
    /**
     * Sendet Einladungen für Reservations mit Check-in morgen
     */
    static sendInvitationsForTomorrow(branches, organizationId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Berechne morgen in UTC (für Datenbank-Query)
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            const tomorrowEnd = new Date(tomorrow);
            tomorrowEnd.setHours(23, 59, 59, 999);
            logger_1.logger.log(`[ReservationAutoInvitationScheduler] Suche Reservations mit Check-in morgen (${tomorrow.toISOString()} - ${tomorrowEnd.toISOString()})...`);
            // Hole Reservations mit Check-in morgen UND noch nicht versendet
            const reservations = yield prisma_1.prisma.reservation.findMany({
                where: {
                    branchId: {
                        in: branches.map(b => b.id)
                    },
                    checkInDate: {
                        gte: tomorrow,
                        lte: tomorrowEnd
                    },
                    invitationSentAt: null // Noch nicht versendet
                },
                include: {
                    organization: {
                        select: {
                            id: true,
                            country: true
                        }
                    }
                }
            });
            logger_1.logger.log(`[ReservationAutoInvitationScheduler] Gefunden: ${reservations.length} Reservations`);
            for (const reservation of reservations) {
                try {
                    // Prüfe ob Kontaktdaten vorhanden
                    if (!reservation.guestEmail && !reservation.guestPhone) {
                        logger_1.logger.warn(`[ReservationAutoInvitationScheduler] Reservation ${reservation.id} hat keine Kontaktdaten - überspringe`);
                        continue;
                    }
                    logger_1.logger.log(`[ReservationAutoInvitationScheduler] Versende Einladung für Reservation ${reservation.id}...`);
                    // Versende Einladung (je nach verfügbaren Kontaktdaten)
                    const options = {};
                    if (reservation.guestEmail) {
                        options.guestEmail = reservation.guestEmail;
                    }
                    if (reservation.guestPhone) {
                        options.guestPhone = reservation.guestPhone;
                    }
                    const result = yield reservationNotificationService_1.ReservationNotificationService.sendReservationInvitation(reservation.id, options);
                    if (result.success) {
                        // Markiere als versendet
                        yield prisma_1.prisma.reservation.update({
                            where: { id: reservation.id },
                            data: { invitationSentAt: new Date() }
                        });
                        logger_1.logger.log(`[ReservationAutoInvitationScheduler] ✅ Einladung versendet für Reservation ${reservation.id}`);
                    }
                    else {
                        logger_1.logger.warn(`[ReservationAutoInvitationScheduler] ⚠️ Einladung fehlgeschlagen für Reservation ${reservation.id}: ${result.error}`);
                    }
                }
                catch (error) {
                    logger_1.logger.error(`[ReservationAutoInvitationScheduler] Fehler bei Reservation ${reservation.id}:`, error);
                    // Weiter mit nächster Reservation
                }
            }
        });
    }
    /**
     * Führt manuell den Versand aus (für Tests)
     */
    static triggerManually() {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.logger.log('[ReservationAutoInvitationScheduler] Manueller Trigger...');
            try {
                yield this.checkAndSendInvitations();
                logger_1.logger.log('[ReservationAutoInvitationScheduler] Manueller Versand erfolgreich');
            }
            catch (error) {
                logger_1.logger.error('[ReservationAutoInvitationScheduler] Fehler beim manuellen Versand:', error);
                throw error;
            }
        });
    }
}
exports.ReservationAutoInvitationScheduler = ReservationAutoInvitationScheduler;
ReservationAutoInvitationScheduler.checkInterval = null;
ReservationAutoInvitationScheduler.lastCheckDate = '';
//# sourceMappingURL=reservationAutoInvitationScheduler.js.map
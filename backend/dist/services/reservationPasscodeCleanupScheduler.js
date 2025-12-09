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
exports.ReservationPasscodeCleanupScheduler = void 0;
const prisma_1 = require("../utils/prisma");
const ttlockService_1 = require("./ttlockService");
const timeUtils_1 = require("../utils/timeUtils");
const date_fns_tz_1 = require("date-fns-tz");
const logger_1 = require("../utils/logger");
/**
 * Scheduler für automatische Löschung von TTLock Passcodes nach Checkout
 *
 * Prüft täglich um 11:00 Uhr (lokale Zeit der Organisation) Reservations mit abgelaufenem Checkout
 * und löscht die Passcodes per TTLock API
 */
class ReservationPasscodeCleanupScheduler {
    /**
     * Startet den Scheduler
     *
     * Prüft alle 1 Stunde, ob es 11:00 Uhr ist
     * Wenn ja, löscht Passcodes von Reservations mit abgelaufenem Checkout
     */
    static start() {
        if (this.checkInterval) {
            logger_1.logger.log('[ReservationPasscodeCleanup] Scheduler läuft bereits');
            return;
        }
        logger_1.logger.log('[ReservationPasscodeCleanup] Starte Scheduler...');
        // Prüfe alle 1 Stunde, ob es 11:00 Uhr ist
        this.checkInterval = setInterval(() => __awaiter(this, void 0, void 0, function* () {
            const now = new Date();
            const currentHour = now.getHours();
            const currentDate = now.toDateString();
            // Prüfe ob es 11:00 Uhr ist
            // Und ob wir heute noch nicht geprüft haben
            if (currentHour === 11 && this.lastCheckDate !== currentDate) {
                logger_1.logger.log('[ReservationPasscodeCleanup] Starte tägliche Passcode-Löschung (11:00 Uhr)...');
                this.lastCheckDate = currentDate;
                try {
                    yield this.checkAndCleanupPasscodes();
                    logger_1.logger.log('[ReservationPasscodeCleanup] Passcode-Löschung erfolgreich abgeschlossen');
                }
                catch (error) {
                    logger_1.logger.error('[ReservationPasscodeCleanup] Fehler beim Löschen der Passcodes:', error);
                }
            }
        }), this.CHECK_INTERVAL);
        logger_1.logger.log('[ReservationPasscodeCleanup] Scheduler gestartet (prüft täglich um 11:00 Uhr)');
    }
    /**
     * Stoppt den Scheduler
     */
    static stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
            this.lastCheckDate = '';
            logger_1.logger.log('[ReservationPasscodeCleanup] Scheduler gestoppt');
        }
    }
    /**
     * Prüft und löscht Passcodes von Reservations mit abgelaufenem Checkout
     * Öffentlich für Timer-Zugriff
     */
    static checkAndCleanupPasscodes() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const now = new Date();
                // Finde alle Reservations mit:
                // 1. doorPin vorhanden (Passcode existiert)
                // 2. ttlLockId vorhanden (TTLock konfiguriert)
                // 3. checkOutDate vorhanden
                // 4. Noch nicht gelöscht (doorPin ist noch gesetzt)
                const reservationsWithPasscodes = yield prisma_1.prisma.reservation.findMany({
                    where: {
                        doorPin: { not: null },
                        ttlLockId: { not: null },
                        checkOutDate: { not: null }
                    },
                    include: {
                        organization: {
                            select: {
                                id: true,
                                country: true
                            }
                        },
                        branch: {
                            select: {
                                id: true,
                                doorSystemSettings: true
                            }
                        }
                    }
                });
                if (reservationsWithPasscodes.length === 0) {
                    return; // Keine Reservations mit Passcodes
                }
                logger_1.logger.log(`[ReservationPasscodeCleanup] ${reservationsWithPasscodes.length} Reservations mit Passcodes gefunden`);
                let deletedCount = 0;
                let skippedCount = 0;
                let errorCount = 0;
                for (const reservation of reservationsWithPasscodes) {
                    try {
                        // Prüfe ob Checkout + 11:00 lokale Zeit überschritten ist
                        const shouldDelete = yield this.shouldDeletePasscode(reservation, now);
                        if (!shouldDelete) {
                            skippedCount++;
                            continue;
                        }
                        // Lösche Passcode
                        const deleted = yield this.deletePasscode(reservation);
                        if (deleted) {
                            deletedCount++;
                            logger_1.logger.log(`[ReservationPasscodeCleanup] ✅ Passcode für Reservation ${reservation.id} gelöscht`);
                        }
                        else {
                            skippedCount++;
                            logger_1.logger.log(`[ReservationPasscodeCleanup] ⚠️ Passcode für Reservation ${reservation.id} nicht gefunden oder bereits gelöscht`);
                        }
                    }
                    catch (error) {
                        errorCount++;
                        logger_1.logger.error(`[ReservationPasscodeCleanup] ❌ Fehler beim Löschen des Passcodes für Reservation ${reservation.id}:`, error);
                        // Weiter mit nächster Reservierung
                    }
                }
                if (deletedCount > 0 || skippedCount > 0 || errorCount > 0) {
                    logger_1.logger.log(`[ReservationPasscodeCleanup] Zusammenfassung: ${deletedCount} gelöscht, ${skippedCount} übersprungen, ${errorCount} Fehler`);
                }
            }
            catch (error) {
                logger_1.logger.error('[ReservationPasscodeCleanup] Fehler beim Prüfen der Reservations:', error);
            }
        });
    }
    /**
     * Prüft ob der Passcode gelöscht werden sollte (Checkout + 11:00 lokale Zeit überschritten)
     */
    static shouldDeletePasscode(reservation, now) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (!reservation.checkOutDate || !((_a = reservation.organization) === null || _a === void 0 ? void 0 : _a.country)) {
                return false;
            }
            // Bestimme Zeitzone der Organisation
            const timezone = (0, timeUtils_1.getTimezoneForCountry)(reservation.organization.country);
            // Checkout-Datum extrahieren (ist UTC in DB)
            const checkoutDate = new Date(reservation.checkOutDate);
            // Hole lokales Datum (ohne Zeit) in der Zeitzone der Organisation
            const checkoutLocalDate = checkoutDate.toLocaleDateString('en-CA', { timeZone: timezone }); // Format: YYYY-MM-DD
            // Erstelle Datum 11:00:00 in lokaler Zeitzone
            const checkoutAt11Local = new Date(`${checkoutLocalDate}T11:00:00`);
            // Konvertiere lokale Zeit (11:00 in timezone) zu UTC für Vergleich
            const checkoutAt11UTC = (0, date_fns_tz_1.fromZonedTime)(checkoutAt11Local, timezone);
            // Prüfe ob jetzt nach Checkout + 11:00 ist
            return now >= checkoutAt11UTC;
        });
    }
    /**
     * Löscht den Passcode einer Reservation per TTLock API
     */
    static deletePasscode(reservation) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (!reservation.doorPin || !reservation.ttlLockId) {
                return false;
            }
            try {
                // Erstelle TTLockService für Branch oder Organisation
                let ttlockService;
                if (reservation.branchId && ((_a = reservation.branch) === null || _a === void 0 ? void 0 : _a.doorSystemSettings)) {
                    // Verwende Branch-spezifische Settings
                    ttlockService = yield ttlockService_1.TTLockService.createForBranch(reservation.branchId);
                }
                else {
                    // Verwende Organisation-Settings
                    ttlockService = new ttlockService_1.TTLockService(reservation.organizationId);
                }
                // Lösche Passcode per doorPin
                const deleted = yield ttlockService.deletePasscodeByPin(reservation.ttlLockId, reservation.doorPin);
                if (deleted) {
                    // Passcode erfolgreich gelöscht - markiere in DB (optional, für Frontend-Anzeige)
                    // Wir löschen NICHT doorPin aus der DB, sondern markieren nur als gelöscht
                    // Frontend zeigt dann durchgestrichen & rot an
                    // TODO: Optional - Flag hinzufügen wenn gewünscht
                    logger_1.logger.log(`[ReservationPasscodeCleanup] Passcode für Reservation ${reservation.id} erfolgreich gelöscht`);
                }
                return deleted;
            }
            catch (error) {
                logger_1.logger.error(`[ReservationPasscodeCleanup] Fehler beim Löschen des Passcodes:`, error);
                throw error;
            }
        });
    }
}
exports.ReservationPasscodeCleanupScheduler = ReservationPasscodeCleanupScheduler;
ReservationPasscodeCleanupScheduler.checkInterval = null;
ReservationPasscodeCleanupScheduler.lastCheckDate = '';
ReservationPasscodeCleanupScheduler.CHECK_INTERVAL = 60 * 60 * 1000; // Alle 1 Stunde prüfen ob es 11:00 ist
//# sourceMappingURL=reservationPasscodeCleanupScheduler.js.map
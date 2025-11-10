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
exports.ReservationScheduler = void 0;
const reservationNotificationService_1 = require("./reservationNotificationService");
/**
 * Scheduler für automatische Reservierungs-Benachrichtigungen
 *
 * Führt täglich um 20:00 Uhr den Versand von Check-in-Einladungen aus
 */
class ReservationScheduler {
    /**
     * Startet den Scheduler
     *
     * Prüft alle 10 Minuten, ob es 20:00 Uhr ist
     * Wenn ja, sendet Check-in-Einladungen
     */
    static start() {
        console.log('[ReservationScheduler] Scheduler gestartet');
        // Prüfe alle 10 Minuten
        const CHECK_INTERVAL_MS = 10 * 60 * 1000; // 10 Minuten
        this.checkInterval = setInterval(() => __awaiter(this, void 0, void 0, function* () {
            const now = new Date();
            const currentHour = now.getHours();
            const currentDate = now.toDateString();
            // Prüfe ob es zwischen 20:00 und 20:10 Uhr ist
            // Und ob wir heute noch nicht gesendet haben
            if (currentHour === 20 && this.lastCheckDate !== currentDate) {
                console.log('[ReservationScheduler] Starte tägliche Check-in-Einladungen...');
                this.lastCheckDate = currentDate;
                try {
                    yield reservationNotificationService_1.ReservationNotificationService.sendLateCheckInInvitations();
                    console.log('[ReservationScheduler] Check-in-Einladungen erfolgreich versendet');
                }
                catch (error) {
                    console.error('[ReservationScheduler] Fehler beim Versand:', error);
                }
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
            console.log('[ReservationScheduler] Scheduler gestoppt');
        }
    }
    /**
     * Führt manuell den Versand aus (für Tests)
     */
    static triggerManually() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('[ReservationScheduler] Manueller Trigger...');
            try {
                yield reservationNotificationService_1.ReservationNotificationService.sendLateCheckInInvitations();
                console.log('[ReservationScheduler] Manueller Versand erfolgreich');
            }
            catch (error) {
                console.error('[ReservationScheduler] Fehler beim manuellen Versand:', error);
                throw error;
            }
        });
    }
}
exports.ReservationScheduler = ReservationScheduler;
ReservationScheduler.checkInterval = null;
ReservationScheduler.lastCheckDate = '';
//# sourceMappingURL=reservationScheduler.js.map
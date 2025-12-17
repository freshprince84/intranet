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
exports.RateShoppingScheduler = void 0;
const otaRateShoppingService_1 = require("./otaRateShoppingService");
const prisma_1 = require("../utils/prisma");
const logger_1 = require("../utils/logger");
/**
 * Scheduler für automatisches Rate Shopping
 *
 * Führt täglich um 2:00 Uhr Rate Shopping für alle aktiven Branches durch
 * Sammelt Preise für die nächsten 3 Monate
 */
class RateShoppingScheduler {
    /**
     * Startet den Scheduler
     *
     * Prüft täglich um 2:00 Uhr auf neue Preise für alle Branches
     */
    static start() {
        if (this.isRunning) {
            logger_1.logger.log('[RateShoppingScheduler] Scheduler läuft bereits');
            return;
        }
        logger_1.logger.log('[RateShoppingScheduler] Scheduler gestartet');
        // Prüfe täglich um 2:00 Uhr
        const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 Stunden
        // Berechne Zeit bis zur nächsten 2:00 Uhr
        const now = new Date();
        const nextRun = new Date();
        nextRun.setHours(2, 0, 0, 0);
        // Wenn es bereits nach 2:00 Uhr ist, setze auf morgen
        if (now.getTime() >= nextRun.getTime()) {
            nextRun.setDate(nextRun.getDate() + 1);
        }
        const msUntilNextRun = nextRun.getTime() - now.getTime();
        logger_1.logger.log(`[RateShoppingScheduler] Nächster Lauf: ${nextRun.toISOString()} (in ${Math.round(msUntilNextRun / 1000 / 60)} Minuten)`);
        // Warte bis zur nächsten 2:00 Uhr, dann starte Intervall
        setTimeout(() => {
            // Führe sofort einen Check aus
            this.checkAllBranches();
            // Dann alle 24 Stunden
            this.checkInterval = setInterval(() => __awaiter(this, void 0, void 0, function* () {
                yield this.checkAllBranches();
            }), CHECK_INTERVAL_MS);
        }, msUntilNextRun);
        this.isRunning = true;
    }
    /**
     * Stoppt den Scheduler
     */
    static stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        this.isRunning = false;
        logger_1.logger.log('[RateShoppingScheduler] Scheduler gestoppt');
    }
    /**
     * Prüft alle Branches und startet Rate Shopping
     */
    static checkAllBranches() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                logger_1.logger.log('[RateShoppingScheduler] Starte Rate Shopping für alle Branches');
                // Hole alle Branches
                const branches = yield prisma_1.prisma.branch.findMany();
                if (branches.length === 0) {
                    logger_1.logger.log('[RateShoppingScheduler] Keine Branches gefunden');
                    return;
                }
                // Berechne Datum für nächste 3 Monate
                const startDate = new Date();
                const endDate = new Date();
                endDate.setMonth(endDate.getMonth() + 3);
                // Unterstützte Plattformen
                const platforms = ['booking.com', 'hostelworld.com'];
                // Für jeden Branch
                for (const branch of branches) {
                    // Prüfe, ob es aktive Listings für diesen Branch gibt
                    const listings = yield prisma_1.prisma.oTAListing.findMany({
                        where: {
                            branchId: branch.id,
                            isActive: true
                        },
                        select: {
                            platform: true
                        },
                        distinct: ['platform']
                    });
                    if (listings.length === 0) {
                        logger_1.logger.log(`[RateShoppingScheduler] Keine aktiven Listings für Branch ${branch.id} (${branch.name})`);
                        continue;
                    }
                    // Für jede Plattform mit Listings
                    for (const listing of listings) {
                        try {
                            logger_1.logger.log(`[RateShoppingScheduler] Starte Rate Shopping für Branch ${branch.id} (${branch.name}), Platform: ${listing.platform}`);
                            yield otaRateShoppingService_1.OTARateShoppingService.runRateShopping(branch.id, listing.platform, startDate, endDate);
                            // Rate-Limiting: Warte 5 Sekunden zwischen Branches/Plattformen
                            yield new Promise(resolve => setTimeout(resolve, 5000));
                        }
                        catch (error) {
                            logger_1.logger.error(`[RateShoppingScheduler] Fehler beim Rate Shopping für Branch ${branch.id}, Platform ${listing.platform}:`, error);
                        }
                    }
                }
                logger_1.logger.log('[RateShoppingScheduler] Rate Shopping für alle Branches abgeschlossen');
            }
            catch (error) {
                logger_1.logger.error('[RateShoppingScheduler] Fehler beim Prüfen aller Branches:', error);
            }
        });
    }
}
exports.RateShoppingScheduler = RateShoppingScheduler;
RateShoppingScheduler.checkInterval = null;
RateShoppingScheduler.isRunning = false;
//# sourceMappingURL=rateShoppingScheduler.js.map
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
exports.OccupancyMonitoringService = void 0;
const lobbyPmsService_1 = require("./lobbyPmsService");
const prisma_1 = require("../utils/prisma");
const logger_1 = require("../utils/logger");
const notificationController_1 = require("../controllers/notificationController");
const client_1 = require("@prisma/client");
const translations_1 = require("../utils/translations");
/**
 * Service für Occupancy-Monitoring
 *
 * Überwacht schnelle Occupancy-Änderungen und erstellt Alerts/To-Dos bei kritischen Änderungen
 */
class OccupancyMonitoringService {
    /**
     * Prüft Occupancy-Änderungen für einen Branch
     *
     * Vergleicht aktuelle Occupancy mit vorherigen Werten und erstellt Alerts bei schnellen Änderungen
     *
     * @param branchId - Branch-ID
     * @param daysAhead - Anzahl Tage im Voraus zu prüfen (default: 30)
     * @param thresholdPercent - Schwellenwert für schnelle Änderung in Prozent (default: 20%)
     */
    static checkOccupancyChanges(branchId_1) {
        return __awaiter(this, arguments, void 0, function* (branchId, daysAhead = 30, thresholdPercent = 20) {
            try {
                logger_1.logger.log(`[OccupancyMonitoring] Prüfe Occupancy-Änderungen für Branch ${branchId} (${daysAhead} Tage im Voraus)`);
                // Lade Branch
                const branch = yield prisma_1.prisma.branch.findUnique({
                    where: { id: branchId },
                    select: {
                        id: true,
                        name: true,
                        organizationId: true
                    }
                });
                if (!branch) {
                    throw new Error(`Branch ${branchId} nicht gefunden`);
                }
                // Hole aktuelle Occupancy-Daten aus LobbyPMS
                const lobbyPmsService = yield lobbyPmsService_1.LobbyPmsService.createForBranch(branchId);
                const startDate = new Date();
                startDate.setHours(0, 0, 0, 0);
                const endDate = new Date();
                endDate.setDate(endDate.getDate() + daysAhead);
                endDate.setHours(23, 59, 59, 999);
                const currentAvailability = yield lobbyPmsService.checkAvailability(startDate, endDate);
                // Hole historische Occupancy-Daten aus PriceAnalysis (falls vorhanden)
                // Oder verwende letzte Analyse als Vergleich
                const historicalAnalyses = yield prisma_1.prisma.priceAnalysis.findMany({
                    where: {
                        branchId: branch.id,
                        analysisDate: {
                            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Letzte 7 Tage
                        }
                    },
                    select: {
                        analysisDate: true,
                        categoryId: true,
                        roomType: true,
                        occupancyRate: true
                    },
                    orderBy: {
                        analysisDate: 'desc'
                    }
                });
                // Gruppiere aktuelle Daten nach Kategorie und Datum
                const currentDataMap = new Map();
                // Berechne totalRooms pro Kategorie (Maximum über Zeitraum)
                const totalRoomsMap = new Map();
                for (const entry of currentAvailability) {
                    const key = `${entry.categoryId}-${entry.date}`;
                    const currentTotal = totalRoomsMap.get(entry.categoryId) || 0;
                    totalRoomsMap.set(entry.categoryId, Math.max(currentTotal, entry.availableRooms));
                }
                // Berechne Occupancy-Rate für aktuelle Daten
                for (const entry of currentAvailability) {
                    const key = `${entry.categoryId}-${entry.date}`;
                    const totalRooms = totalRoomsMap.get(entry.categoryId) || 1;
                    const occupancyRate = totalRooms > 0
                        ? ((totalRooms - entry.availableRooms) / totalRooms) * 100
                        : 0;
                    currentDataMap.set(key, {
                        categoryId: entry.categoryId,
                        date: entry.date,
                        availableRooms: entry.availableRooms,
                        occupancyRate
                    });
                }
                // Vergleiche mit historischen Daten
                let alertCount = 0;
                const alerts = [];
                for (const [key, current] of currentDataMap.entries()) {
                    // Finde historische Daten für gleiche Kategorie und ähnliches Datum (±1 Tag)
                    const historical = historicalAnalyses.find(h => {
                        const hDate = new Date(h.analysisDate);
                        const cDate = new Date(current.date);
                        const daysDiff = Math.abs((hDate.getTime() - cDate.getTime()) / (1000 * 60 * 60 * 24));
                        return h.categoryId === current.categoryId && daysDiff <= 1;
                    });
                    if (historical && historical.occupancyRate !== null) {
                        const changePercent = Math.abs(current.occupancyRate - Number(historical.occupancyRate));
                        // Prüfe ob Änderung über Schwellenwert liegt
                        if (changePercent >= thresholdPercent) {
                            alerts.push({
                                date: current.date,
                                categoryId: current.categoryId,
                                roomType: historical.roomType,
                                currentOccupancy: current.occupancyRate,
                                previousOccupancy: Number(historical.occupancyRate),
                                changePercent
                            });
                            alertCount++;
                        }
                    }
                }
                // Erstelle Notifications/To-Dos für kritische Änderungen
                if (alerts.length > 0) {
                    logger_1.logger.log(`[OccupancyMonitoring] Branch ${branchId}: ${alerts.length} kritische Occupancy-Änderungen erkannt`);
                    // Erstelle Notification für alle User der Organisation mit Rezeption-relevanten Rollen
                    // Suche nach Rollen mit Namen wie "Admin", "Reception", "Manager" etc.
                    const receptionUsers = yield prisma_1.prisma.user.findMany({
                        where: {
                            roles: {
                                some: {
                                    role: {
                                        organizationId: branch.organizationId,
                                        name: {
                                            in: ['Admin', 'Reception', 'Manager', 'Owner']
                                        }
                                    }
                                }
                            }
                        },
                        select: {
                            id: true
                        }
                    });
                    for (const user of receptionUsers) {
                        const language = yield (0, translations_1.getUserLanguage)(user.id);
                        const alertText = alerts.slice(0, 5).map(a => `${new Date(a.date).toLocaleDateString()}: ${a.changePercent.toFixed(1)}% Änderung (${a.previousOccupancy.toFixed(1)}% → ${a.currentOccupancy.toFixed(1)}%)`).join('\n');
                        const notificationText = (0, translations_1.getPriceAnalysisNotificationText)(language, 'occupancyAlert', {
                            branchName: branch.name,
                            alertCount: alerts.length,
                            details: alertText
                        });
                        yield (0, notificationController_1.createNotificationIfEnabled)({
                            userId: user.id,
                            type: client_1.NotificationType.system,
                            title: notificationText.title,
                            message: notificationText.message,
                            relatedEntityType: 'price_analysis',
                            relatedEntityId: branch.id
                        });
                    }
                    // Erstelle To-Do für kritischste Änderung
                    const criticalAlert = alerts.sort((a, b) => b.changePercent - a.changePercent)[0];
                    // Finde Kategorie-Name
                    const categoryInfo = currentAvailability.find(a => a.categoryId === criticalAlert.categoryId && a.date === criticalAlert.date);
                    if (categoryInfo) {
                        // Erstelle To-Do für ersten Rezeption-User
                        if (receptionUsers.length > 0) {
                            const firstUser = receptionUsers[0];
                            yield prisma_1.prisma.task.create({
                                data: {
                                    title: `Occupancy-Alert: ${categoryInfo.roomName} - ${criticalAlert.changePercent.toFixed(1)}% Änderung`,
                                    description: `Kategorie: ${categoryInfo.roomName}\nDatum: ${new Date(criticalAlert.date).toLocaleDateString()}\nÄnderung: ${criticalAlert.previousOccupancy.toFixed(1)}% → ${criticalAlert.currentOccupancy.toFixed(1)}%\n\nBitte Preise prüfen und ggf. anpassen.`,
                                    status: 'open',
                                    responsibleId: firstUser.id,
                                    qualityControlId: firstUser.id,
                                    organizationId: branch.organizationId,
                                    branchId: branch.id,
                                    dueDate: new Date(criticalAlert.date)
                                }
                            });
                            logger_1.logger.log(`[OccupancyMonitoring] To-Do erstellt für kritische Occupancy-Änderung: ${categoryInfo.roomName}`);
                        }
                    }
                }
                logger_1.logger.log(`[OccupancyMonitoring] Branch ${branchId}: ${alertCount} Alerts erstellt`);
                return alertCount;
            }
            catch (error) {
                logger_1.logger.error(`[OccupancyMonitoring] Fehler beim Prüfen der Occupancy-Änderungen für Branch ${branchId}:`, error);
                throw error;
            }
        });
    }
    /**
     * Prüft alle Branches mit LobbyPMS-Integration
     */
    static checkAllBranches() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                logger_1.logger.log('[OccupancyMonitoring] Starte Occupancy-Prüfung für alle Branches');
                // Hole alle Branches mit LobbyPMS-Integration
                const branches = yield prisma_1.prisma.branch.findMany({
                    where: {
                        lobbyPmsSettings: {
                            not: null
                        }
                    },
                    select: {
                        id: true,
                        name: true
                    }
                });
                if (branches.length === 0) {
                    logger_1.logger.log('[OccupancyMonitoring] Keine Branches mit LobbyPMS-Integration gefunden');
                    return;
                }
                logger_1.logger.log(`[OccupancyMonitoring] Gefunden: ${branches.length} Branch(es) mit LobbyPMS-Integration`);
                for (const branch of branches) {
                    try {
                        yield this.checkOccupancyChanges(branch.id, 30, 20); // 30 Tage, 20% Schwellenwert
                    }
                    catch (error) {
                        logger_1.logger.error(`[OccupancyMonitoring] Fehler bei Branch ${branch.id}:`, error);
                    }
                }
                logger_1.logger.log('[OccupancyMonitoring] Occupancy-Prüfung für alle Branches abgeschlossen');
            }
            catch (error) {
                logger_1.logger.error('[OccupancyMonitoring] Fehler beim Prüfen aller Branches:', error);
            }
        });
    }
}
exports.OccupancyMonitoringService = OccupancyMonitoringService;
//# sourceMappingURL=occupancyMonitoringService.js.map
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
exports.triggerMonthlyReportCheck = exports.checkAndGenerateMonthlyReports = void 0;
const client_1 = require("@prisma/client");
const monthlyConsultationReportController_1 = require("../controllers/monthlyConsultationReportController");
const notificationController_1 = require("../controllers/notificationController");
const notificationValidation_1 = require("../validation/notificationValidation");
const prisma = new client_1.PrismaClient();
/**
 * Überprüft und erstellt automatische Monatsabrechnungen für alle Benutzer
 * die die automatische Funktion aktiviert haben und deren Stichdatum heute ist
 */
const checkAndGenerateMonthlyReports = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('Starte automatische Überprüfung für Monatsabrechnungen...');
        const today = new Date();
        const currentDay = today.getDate();
        // Hole alle Benutzer mit aktivierter automatischer Monatsabrechnung
        // deren Stichdatum heute ist
        const usersWithActiveReports = yield prisma.invoiceSettings.findMany({
            where: {
                monthlyReportEnabled: true,
                monthlyReportDay: currentDay,
                monthlyReportRecipient: {
                    not: null
                }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            }
        });
        console.log(`${usersWithActiveReports.length} Benutzer haben heute (${currentDay}.) ihre Monatsstichtag-Konfiguration`);
        for (const userSettings of usersWithActiveReports) {
            try {
                console.log(`Verarbeite automatische Monatsabrechnung für Benutzer ${userSettings.user.firstName} ${userSettings.user.lastName} (ID: ${userSettings.userId})`);
                // Prüfe, ob bereits ein Bericht für den aktuellen Zeitraum existiert
                const { periodStart, periodEnd } = calculateReportPeriod(currentDay, today);
                const existingReport = yield prisma.monthlyConsultationReport.findFirst({
                    where: {
                        userId: userSettings.userId,
                        periodStart: {
                            gte: periodStart,
                            lt: new Date(periodStart.getTime() + 24 * 60 * 60 * 1000) // +1 Tag Toleranz
                        }
                    }
                });
                if (existingReport) {
                    console.log(`Bericht für Benutzer ${userSettings.userId} existiert bereits (ID: ${existingReport.id})`);
                    continue;
                }
                // Erstelle Mock Request/Response für den Controller
                const mockReq = {
                    userId: userSettings.userId.toString(),
                    body: {}
                };
                let lastStatusCode = 0;
                const mockRes = {
                    status: (code) => {
                        lastStatusCode = code;
                        return mockRes;
                    },
                    json: (data) => {
                        if (data.message && !data.message.includes('Für diesen Zeitraum existiert bereits')) {
                            console.log(`Automatische Monatsabrechnung für Benutzer ${userSettings.userId}: ${data.message}`);
                            // Bei Erfolg: Benachrichtigung senden
                            if (lastStatusCode === 201 || lastStatusCode === 200) {
                                (0, notificationController_1.createNotificationIfEnabled)({
                                    userId: userSettings.userId,
                                    title: 'Monatsabrechnung erstellt',
                                    message: `Ihre automatische Monatsabrechnung für den Zeitraum ${periodStart.toLocaleDateString('de-DE')} - ${periodEnd.toLocaleDateString('de-DE')} wurde erfolgreich erstellt.`,
                                    type: notificationValidation_1.NotificationType.system,
                                    relatedEntityId: data.id || null,
                                    relatedEntityType: 'monthly_report_generated'
                                }).catch(err => console.error('Fehler beim Erstellen der Benachrichtigung:', err));
                            }
                        }
                        return mockRes;
                    }
                };
                // Rufe die automatische Generierung auf
                yield (0, monthlyConsultationReportController_1.generateAutomaticMonthlyReport)(mockReq, mockRes);
            }
            catch (userError) {
                console.error(`Fehler bei automatischer Monatsabrechnung für Benutzer ${userSettings.userId}:`, userError);
                // Fehler-Benachrichtigung senden
                try {
                    yield (0, notificationController_1.createNotificationIfEnabled)({
                        userId: userSettings.userId,
                        title: 'Fehler bei Monatsabrechnung',
                        message: 'Bei der automatischen Erstellung Ihrer Monatsabrechnung ist ein Fehler aufgetreten. Bitte erstellen Sie diese manuell.',
                        type: notificationValidation_1.NotificationType.system,
                        relatedEntityType: 'monthly_report_error'
                    });
                }
                catch (notificationError) {
                    console.error('Fehler beim Erstellen der Fehler-Benachrichtigung:', notificationError);
                }
            }
        }
        console.log('Automatische Überprüfung für Monatsabrechnungen abgeschlossen.');
    }
    catch (error) {
        console.error('Fehler bei der automatischen Monatsabrechnungsgenerierung:', error);
    }
});
exports.checkAndGenerateMonthlyReports = checkAndGenerateMonthlyReports;
/**
 * Berechnet den Zeitraum für die Monatsabrechnung basierend auf dem Stichdatum
 */
function calculateReportPeriod(reportDay, today) {
    let periodEnd;
    let periodStart;
    if (today.getDate() >= reportDay) {
        // Aktueller Monat: vom reportDay des Vormonats bis reportDay-1 des aktuellen Monats
        periodEnd = new Date(today.getFullYear(), today.getMonth(), reportDay - 1, 23, 59, 59);
        periodStart = new Date(today.getFullYear(), today.getMonth() - 1, reportDay);
    }
    else {
        // Vormonat: vom reportDay des Vor-Vormonats bis reportDay-1 des Vormonats  
        periodEnd = new Date(today.getFullYear(), today.getMonth() - 1, reportDay - 1, 23, 59, 59);
        periodStart = new Date(today.getFullYear(), today.getMonth() - 2, reportDay);
    }
    return { periodStart, periodEnd };
}
/**
 * Manuelle Ausführung für Testzwecke
 */
const triggerMonthlyReportCheck = () => __awaiter(void 0, void 0, void 0, function* () {
    const startTime = Date.now();
    yield (0, exports.checkAndGenerateMonthlyReports)();
    const duration = Date.now() - startTime;
    return {
        message: `Monatsabrechnungsprüfung erfolgreich ausgeführt in ${duration}ms`,
        processedUsers: 0 // TODO: Rückgabewert aus checkAndGenerateMonthlyReports
    };
});
exports.triggerMonthlyReportCheck = triggerMonthlyReportCheck;
//# sourceMappingURL=monthlyReportScheduler.js.map
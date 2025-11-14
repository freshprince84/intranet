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
exports.getUserLanguage = getUserLanguage;
exports.getWorktimeNotificationText = getWorktimeNotificationText;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
/**
 * Ruft die aktive Sprache eines Users ab
 * Priorität: User.language > Organisation.language > 'de'
 */
function getUserLanguage(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const user = yield prisma.user.findUnique({
                where: { id: userId },
                select: {
                    language: true,
                    roles: {
                        where: {
                            lastUsed: true
                        },
                        include: {
                            role: {
                                include: {
                                    organization: {
                                        select: {
                                            settings: true
                                        }
                                    }
                                }
                            }
                        },
                        take: 1
                    }
                }
            });
            if (!user) {
                return 'de'; // Fallback
            }
            // Priorität 1: User-Sprache
            if (user.language && user.language.trim() !== '') {
                return user.language;
            }
            // Priorität 2: Organisation-Sprache
            const userRole = user.roles[0];
            if ((_a = userRole === null || userRole === void 0 ? void 0 : userRole.role) === null || _a === void 0 ? void 0 : _a.organization) {
                const orgSettings = userRole.role.organization.settings;
                if (orgSettings === null || orgSettings === void 0 ? void 0 : orgSettings.language) {
                    return orgSettings.language;
                }
            }
            // Priorität 3: Fallback
            return 'de';
        }
        catch (error) {
            console.error('Fehler beim Abrufen der User-Sprache:', error);
            return 'de';
        }
    });
}
/**
 * Übersetzungen für Worktime-Notifications
 */
const worktimeNotifications = {
    de: {
        startTitle: 'Zeiterfassung gestartet',
        startMessage: (branchName) => `Zeiterfassung für ${branchName} wurde gestartet.`,
        stopTitle: 'Zeiterfassung beendet',
        stopMessage: (branchName) => `Zeiterfassung für ${branchName} wurde beendet.`,
        autoStopTitle: 'Zeiterfassung automatisch beendet',
        autoStopMessage: (hours) => `Deine Zeiterfassung wurde automatisch beendet, da die tägliche Arbeitszeit von ${hours}h erreicht wurde.`
    },
    es: {
        startTitle: 'Registro de tiempo iniciado',
        startMessage: (branchName) => `El registro de tiempo para ${branchName} ha sido iniciado.`,
        stopTitle: 'Registro de tiempo detenido',
        stopMessage: (branchName) => `El registro de tiempo para ${branchName} ha sido detenido.`,
        autoStopTitle: 'Registro de tiempo detenido automáticamente',
        autoStopMessage: (hours) => `Tu registro de tiempo ha sido detenido automáticamente, ya que se alcanzó el tiempo de trabajo diario de ${hours}h.`
    },
    en: {
        startTitle: 'Time tracking started',
        startMessage: (branchName) => `Time tracking for ${branchName} has been started.`,
        stopTitle: 'Time tracking stopped',
        stopMessage: (branchName) => `Time tracking for ${branchName} has been stopped.`,
        autoStopTitle: 'Time tracking automatically stopped',
        autoStopMessage: (hours) => `Your time tracking has been automatically stopped, as the daily working time of ${hours}h has been reached.`
    }
};
/**
 * Gibt die übersetzte Notification-Nachricht für Worktime-Events zurück
 */
function getWorktimeNotificationText(language, type, branchName, hours) {
    // Fallback auf Deutsch wenn Sprache nicht unterstützt
    const lang = language in worktimeNotifications ? language : 'de';
    const translations = worktimeNotifications[lang];
    switch (type) {
        case 'start':
            return {
                title: translations.startTitle,
                message: translations.startMessage(branchName || '')
            };
        case 'stop':
            return {
                title: translations.stopTitle,
                message: translations.stopMessage(branchName || '')
            };
        case 'auto_stop':
            return {
                title: translations.autoStopTitle,
                message: translations.autoStopMessage(hours || 8)
            };
        default:
            return {
                title: translations.stopTitle,
                message: translations.stopMessage(branchName || '')
            };
    }
}
//# sourceMappingURL=translations.js.map
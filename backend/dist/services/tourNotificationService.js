"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.TourNotificationService = void 0;
const prisma_1 = require("../utils/prisma");
const client_1 = require("@prisma/client");
const notificationController_1 = require("../controllers/notificationController");
/**
 * Service für Tour-Benachrichtigungen
 */
class TourNotificationService {
    /**
     * Sendet Notification: Tour gebucht (an alle in org)
     */
    static notifyTourBooked(tourBookingId, tourId, organizationId, bookedByUserId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const tour = yield prisma_1.prisma.tour.findUnique({
                    where: { id: tourId },
                    select: { title: true }
                });
                const bookedBy = yield prisma_1.prisma.user.findUnique({
                    where: { id: bookedByUserId },
                    select: { firstName: true, lastName: true, username: true }
                });
                const tourTitle = (tour === null || tour === void 0 ? void 0 : tour.title) || 'Tour';
                const bookedByName = bookedBy
                    ? `${bookedBy.firstName || ''} ${bookedBy.lastName || ''}`.trim() || bookedBy.username
                    : 'Unbekannt';
                // Alle User in der Organisation finden
                const users = yield prisma_1.prisma.user.findMany({
                    where: {
                        roles: {
                            some: {
                                role: {
                                    organizationId: organizationId
                                }
                            }
                        },
                        active: true
                    },
                    select: { id: true }
                });
                // Notification an alle User senden
                for (const user of users) {
                    yield (0, notificationController_1.createNotificationIfEnabled)({
                        userId: user.id,
                        title: 'Tour gebucht',
                        message: `${bookedByName} hat die Tour "${tourTitle}" gebucht.`,
                        type: client_1.NotificationType.system,
                        relatedEntityId: tourBookingId,
                        relatedEntityType: 'tour_booking'
                    });
                }
                console.log(`[TourNotification] ✅ Tour-Buchung Notification gesendet an ${users.length} User in Org ${organizationId}`);
            }
            catch (error) {
                console.error('[TourNotification] ⚠️ Fehler beim Senden der Tour-Buchung Notification:', error);
            }
        });
    }
    /**
     * Sendet Notification: Tour angefragt (an definierte Rolle in branch in org)
     * Nur bei externer Tour
     */
    static notifyTourRequested(tourBookingId, tourId, organizationId, branchId, bookedByUserId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const tour = yield prisma_1.prisma.tour.findUnique({
                    where: { id: tourId },
                    select: { title: true, type: true }
                });
                // Nur bei externer Tour
                if ((tour === null || tour === void 0 ? void 0 : tour.type) !== 'external') {
                    return;
                }
                const bookedBy = yield prisma_1.prisma.user.findUnique({
                    where: { id: bookedByUserId },
                    select: { firstName: true, lastName: true, username: true }
                });
                const tourTitle = (tour === null || tour === void 0 ? void 0 : tour.title) || 'Tour';
                const bookedByName = bookedBy
                    ? `${bookedBy.firstName || ''} ${bookedBy.lastName || ''}`.trim() || bookedBy.username
                    : 'Unbekannt';
                // Lade Organisation-Settings, um die Rolle zu finden
                const organization = yield prisma_1.prisma.organization.findUnique({
                    where: { id: organizationId },
                    select: { settings: true }
                });
                // Entschlüssele Settings
                const { decryptApiSettings } = yield Promise.resolve().then(() => __importStar(require('../utils/encryption')));
                const decryptedSettings = (organization === null || organization === void 0 ? void 0 : organization.settings)
                    ? decryptApiSettings(organization.settings)
                    : null;
                // Rolle für Tour-Anfragen (z.B. 'tour_manager' oder ähnlich)
                // Falls nicht definiert, verwende Admin-Rolle
                const tourRequestRoleName = ((_a = decryptedSettings === null || decryptedSettings === void 0 ? void 0 : decryptedSettings.tours) === null || _a === void 0 ? void 0 : _a.requestNotificationRole) || 'admin';
                // Finde User mit dieser Rolle in der Branch/Org
                const role = yield prisma_1.prisma.role.findFirst({
                    where: {
                        organizationId,
                        name: { contains: tourRequestRoleName, mode: 'insensitive' }
                    },
                    select: { id: true }
                });
                if (!role) {
                    console.log(`[TourNotification] ⚠️ Rolle "${tourRequestRoleName}" nicht gefunden, verwende Admin-Rolle`);
                    // Fallback: Admin-Rolle
                    const adminRole = yield prisma_1.prisma.role.findFirst({
                        where: {
                            organizationId,
                            name: { contains: 'admin', mode: 'insensitive' }
                        },
                        select: { id: true }
                    });
                    if (!adminRole) {
                        console.log(`[TourNotification] ⚠️ Admin-Rolle nicht gefunden, überspringe Notification`);
                        return;
                    }
                    // Sende an alle User mit Admin-Rolle
                    const adminUsers = yield prisma_1.prisma.user.findMany({
                        where: {
                            roles: {
                                some: {
                                    roleId: adminRole.id
                                }
                            },
                            active: true
                        },
                        select: { id: true }
                    });
                    for (const user of adminUsers) {
                        yield (0, notificationController_1.createNotificationIfEnabled)({
                            userId: user.id,
                            title: 'Externe Tour angefragt',
                            message: `${bookedByName} hat eine Anfrage für die externe Tour "${tourTitle}" gestellt.`,
                            type: client_1.NotificationType.system,
                            relatedEntityId: tourBookingId,
                            relatedEntityType: 'tour_booking_request'
                        });
                    }
                }
                else {
                    // Sende an alle User mit der definierten Rolle
                    const roleUsers = yield prisma_1.prisma.user.findMany({
                        where: {
                            roles: {
                                some: {
                                    roleId: role.id
                                }
                            },
                            active: true
                        },
                        select: { id: true }
                    });
                    for (const user of roleUsers) {
                        yield (0, notificationController_1.createNotificationIfEnabled)({
                            userId: user.id,
                            title: 'Externe Tour angefragt',
                            message: `${bookedByName} hat eine Anfrage für die externe Tour "${tourTitle}" gestellt.`,
                            type: client_1.NotificationType.system,
                            relatedEntityId: tourBookingId,
                            relatedEntityType: 'tour_booking_request'
                        });
                    }
                }
                console.log(`[TourNotification] ✅ Tour-Anfrage Notification gesendet`);
            }
            catch (error) {
                console.error('[TourNotification] ⚠️ Fehler beim Senden der Tour-Anfrage Notification:', error);
            }
        });
    }
    /**
     * Sendet Notification: Tour bezahlt
     */
    static notifyTourPaid(tourBookingId, tourId, organizationId, bookedByUserId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const tour = yield prisma_1.prisma.tour.findUnique({
                    where: { id: tourId },
                    select: { title: true }
                });
                const tourTitle = (tour === null || tour === void 0 ? void 0 : tour.title) || 'Tour';
                // Notification an den Buchenden User
                yield (0, notificationController_1.createNotificationIfEnabled)({
                    userId: bookedByUserId,
                    title: 'Tour bezahlt',
                    message: `Die Tour "${tourTitle}" wurde erfolgreich bezahlt.`,
                    type: client_1.NotificationType.system,
                    relatedEntityId: tourBookingId,
                    relatedEntityType: 'tour_booking_paid'
                });
                console.log(`[TourNotification] ✅ Tour-Bezahlung Notification gesendet`);
            }
            catch (error) {
                console.error('[TourNotification] ⚠️ Fehler beim Senden der Tour-Bezahlung Notification:', error);
            }
        });
    }
    /**
     * Sendet Notification: Tour gecancelt von Kunde
     */
    static notifyTourCancelledByCustomer(tourBookingId, tourId, organizationId, bookedByUserId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const tour = yield prisma_1.prisma.tour.findUnique({
                    where: { id: tourId },
                    select: { title: true }
                });
                const bookedBy = yield prisma_1.prisma.user.findUnique({
                    where: { id: bookedByUserId },
                    select: { firstName: true, lastName: true, username: true }
                });
                const tourTitle = (tour === null || tour === void 0 ? void 0 : tour.title) || 'Tour';
                const bookedByName = bookedBy
                    ? `${bookedBy.firstName || ''} ${bookedBy.lastName || ''}`.trim() || bookedBy.username
                    : 'Unbekannt';
                // Alle User in der Organisation finden
                const users = yield prisma_1.prisma.user.findMany({
                    where: {
                        roles: {
                            some: {
                                role: {
                                    organizationId: organizationId
                                }
                            }
                        },
                        active: true
                    },
                    select: { id: true }
                });
                // Notification an alle User senden
                for (const user of users) {
                    yield (0, notificationController_1.createNotificationIfEnabled)({
                        userId: user.id,
                        title: 'Tour storniert',
                        message: `Die Tour "${tourTitle}" wurde von ${bookedByName} storniert.`,
                        type: client_1.NotificationType.system,
                        relatedEntityId: tourBookingId,
                        relatedEntityType: 'tour_booking_cancelled_customer'
                    });
                }
                console.log(`[TourNotification] ✅ Tour-Stornierung (Kunde) Notification gesendet an ${users.length} User`);
            }
            catch (error) {
                console.error('[TourNotification] ⚠️ Fehler beim Senden der Tour-Stornierung Notification:', error);
            }
        });
    }
    /**
     * Sendet Notification: Tour gecancelt von Anbieter
     */
    static notifyTourCancelledByProvider(tourBookingId, tourId, organizationId, bookedByUserId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const tour = yield prisma_1.prisma.tour.findUnique({
                    where: { id: tourId },
                    select: { title: true, externalProvider: true }
                });
                const providerName = ((_a = tour === null || tour === void 0 ? void 0 : tour.externalProvider) === null || _a === void 0 ? void 0 : _a.name) || 'Anbieter';
                const tourTitle = (tour === null || tour === void 0 ? void 0 : tour.title) || 'Tour';
                // Notification an den Buchenden User
                yield (0, notificationController_1.createNotificationIfEnabled)({
                    userId: bookedByUserId,
                    title: 'Tour storniert',
                    message: `Die Tour "${tourTitle}" wurde vom Anbieter "${providerName}" storniert.`,
                    type: client_1.NotificationType.system,
                    relatedEntityId: tourBookingId,
                    relatedEntityType: 'tour_booking_cancelled_provider'
                });
                // Auch an alle User in der Organisation
                const users = yield prisma_1.prisma.user.findMany({
                    where: {
                        roles: {
                            some: {
                                role: {
                                    organizationId: organizationId
                                }
                            }
                        },
                        active: true
                    },
                    select: { id: true }
                });
                for (const user of users) {
                    if (user.id !== bookedByUserId) {
                        yield (0, notificationController_1.createNotificationIfEnabled)({
                            userId: user.id,
                            title: 'Tour storniert',
                            message: `Die Tour "${tourTitle}" wurde vom Anbieter "${providerName}" storniert.`,
                            type: client_1.NotificationType.system,
                            relatedEntityId: tourBookingId,
                            relatedEntityType: 'tour_booking_cancelled_provider'
                        });
                    }
                }
                console.log(`[TourNotification] ✅ Tour-Stornierung (Anbieter) Notification gesendet`);
            }
            catch (error) {
                console.error('[TourNotification] ⚠️ Fehler beim Senden der Tour-Stornierung (Anbieter) Notification:', error);
            }
        });
    }
}
exports.TourNotificationService = TourNotificationService;
//# sourceMappingURL=tourNotificationService.js.map
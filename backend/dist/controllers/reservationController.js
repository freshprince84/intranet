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
exports.getReservationById = exports.getReservationNotificationLogs = exports.sendPasscode = exports.generatePinAndSendNotification = exports.sendReservationInvitation = exports.getAllReservations = exports.createReservation = exports.updateGuestContact = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../utils/prisma");
const whatsappService_1 = require("../services/whatsappService");
const boldPaymentService_1 = require("../services/boldPaymentService");
const ttlockService_1 = require("../services/ttlockService");
const reservationNotificationService_1 = require("../services/reservationNotificationService");
const queueService_1 = require("../services/queueService");
const checkInLinkUtils_1 = require("../utils/checkInLinkUtils");
const permissionMiddleware_1 = require("../middleware/permissionMiddleware");
const logger_1 = require("../utils/logger");
const filterToPrisma_1 = require("../utils/filterToPrisma");
const organization_1 = require("../middleware/organization");
const filterCache_1 = require("../services/filterCache");
/**
 * Utility: Erkennt ob ein String eine Telefonnummer oder Email ist
 */
function detectContactType(value) {
    // Email-Format: enthält @ und .
    if (value.includes('@') && value.includes('.')) {
        return 'email';
    }
    // Telefonnummer: enthält nur Ziffern, +, Leerzeichen, Bindestriche
    return 'phone';
}
/**
 * PUT /api/reservations/:id/guest-contact
 * Aktualisiert Telefonnummer/Email des Gastes und sendet WhatsApp-Nachricht
 */
const updateGuestContact = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const { contact } = req.body; // Ein Feld: automatische Erkennung
        if (!contact || typeof contact !== 'string' || contact.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Kontaktinformation (Telefonnummer oder Email) ist erforderlich'
            });
        }
        const reservationId = parseInt(id, 10);
        if (isNaN(reservationId)) {
            return res.status(400).json({
                success: false,
                message: 'Ungültige Reservierungs-ID'
            });
        }
        // Hole Reservierung
        const reservation = yield prisma_1.prisma.reservation.findUnique({
            where: { id: reservationId },
            include: { organization: true }
        });
        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: 'Reservierung nicht gefunden'
            });
        }
        // Erkenne ob es Telefonnummer oder Email ist
        const contactType = detectContactType(contact.trim());
        const updateData = {
            status: 'notification_sent'
        };
        if (contactType === 'phone') {
            updateData.guestPhone = contact.trim();
        }
        else {
            updateData.guestEmail = contact.trim();
        }
        // Aktualisiere Reservierung
        const updatedReservation = yield prisma_1.prisma.reservation.update({
            where: { id: reservationId },
            data: updateData,
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true,
                        displayName: true,
                        settings: true,
                    },
                },
                branch: {
                    select: {
                        id: true,
                        name: true,
                        doorSystemSettings: true,
                    },
                },
            },
        });
        // NEU: Queue-basierte Verarbeitung (wenn aktiviert)
        const queueEnabled = process.env.QUEUE_ENABLED === 'true';
        const isQueueHealthy = queueEnabled ? yield (0, queueService_1.checkQueueHealth)() : false;
        if (queueEnabled && isQueueHealthy && contactType === 'phone' && updatedReservation.guestPhone) {
            // Füge Job zur Queue hinzu
            try {
                yield queueService_1.updateGuestContactQueue.add('update-guest-contact', {
                    reservationId: updatedReservation.id,
                    organizationId: reservation.organizationId,
                    contact: contact.trim(),
                    contactType: contactType,
                    guestPhone: updatedReservation.guestPhone,
                    guestName: updatedReservation.guestName,
                }, {
                    priority: 1, // Hohe Priorität für manuelle Updates
                    jobId: `update-guest-contact-${updatedReservation.id}`, // Eindeutige ID für Idempotenz
                });
                logger_1.logger.log(`[Reservation] ✅ Job zur Queue hinzugefügt für Guest Contact Update ${updatedReservation.id}`);
                // Sofortige Antwort - Job läuft im Hintergrund
                // Frontend lädt Reservierung neu (onSuccess), daher sind sentMessage/sentMessageAt null ok
                return res.json({
                    success: true,
                    data: Object.assign(Object.assign({}, updatedReservation), { sentMessage: null, sentMessageAt: null }),
                    message: 'Kontaktinformation aktualisiert. Benachrichtigung wird im Hintergrund versendet.',
                });
            }
            catch (queueError) {
                logger_1.logger.error('[Reservation] Fehler beim Hinzufügen zur Queue, verwende Fallback:', queueError);
                // Fallback auf synchrone Logik
            }
        }
        // FALLBACK: Alte synchrone Logik (wenn Queue deaktiviert oder Fehler)
        // Sende WhatsApp-Nachricht (wenn Telefonnummer vorhanden)
        let sentMessage = null;
        let sentMessageAt = null;
        if (contactType === 'phone' && updatedReservation.guestPhone) {
            try {
                // Erstelle Zahlungslink
                const boldPaymentService = updatedReservation.branchId
                    ? yield boldPaymentService_1.BoldPaymentService.createForBranch(updatedReservation.branchId)
                    : new boldPaymentService_1.BoldPaymentService(reservation.organizationId);
                // TODO: Hole Betrag aus Reservierung (aus syncHistory oder extra Feld)
                const amount = 360000; // Placeholder - sollte aus Reservierung kommen
                const paymentLink = yield boldPaymentService.createPaymentLink(updatedReservation, amount, 'COP', `Zahlung für Reservierung ${updatedReservation.guestName}`);
                // Erstelle TTLock Passcode (wenn konfiguriert)
                let ttlockCode = null;
                try {
                    const ttlockService = updatedReservation.branchId
                        ? yield ttlockService_1.TTLockService.createForBranch(updatedReservation.branchId)
                        : new ttlockService_1.TTLockService(reservation.organizationId);
                    // Lade Settings aus Branch oder Organisation
                    const { decryptApiSettings, decryptBranchApiSettings } = yield Promise.resolve().then(() => __importStar(require('../utils/encryption')));
                    let doorSystemSettings = null;
                    if (updatedReservation.branchId && ((_a = updatedReservation.branch) === null || _a === void 0 ? void 0 : _a.doorSystemSettings)) {
                        const branchSettings = decryptBranchApiSettings(updatedReservation.branch.doorSystemSettings);
                        doorSystemSettings = (branchSettings === null || branchSettings === void 0 ? void 0 : branchSettings.doorSystem) || branchSettings;
                    }
                    else {
                        const settings = decryptApiSettings(reservation.organization.settings);
                        doorSystemSettings = settings === null || settings === void 0 ? void 0 : settings.doorSystem;
                    }
                    if ((doorSystemSettings === null || doorSystemSettings === void 0 ? void 0 : doorSystemSettings.lockIds) && doorSystemSettings.lockIds.length > 0) {
                        const lockId = doorSystemSettings.lockIds[0];
                        ttlockCode = yield ttlockService.createTemporaryPasscode(lockId, updatedReservation.checkInDate, updatedReservation.checkOutDate, `Guest: ${updatedReservation.guestName}`);
                        // Speichere TTLock Code in Reservierung
                        yield prisma_1.prisma.reservation.update({
                            where: { id: reservationId },
                            data: {
                                doorPin: ttlockCode,
                                doorAppName: 'TTLock',
                                ttlLockId: lockId,
                                ttlLockPassword: ttlockCode,
                            },
                        });
                    }
                }
                catch (ttlockError) {
                    logger_1.logger.error('[Reservation] Fehler beim Erstellen des TTLock Passcodes:', ttlockError);
                    // Weiter ohne TTLock Code
                }
                // Erstelle Nachrichtentext
                const checkInDateStr = updatedReservation.checkInDate.toLocaleDateString('es-ES');
                const checkOutDateStr = updatedReservation.checkOutDate.toLocaleDateString('es-ES');
                sentMessage = `Hola ${updatedReservation.guestName},

¡Bienvenido a La Familia Hostel!

Tu reserva ha sido confirmada:
- Entrada: ${checkInDateStr}
- Salida: ${checkOutDateStr}

Por favor, realiza el pago:
${paymentLink}

${ttlockCode ? `Tu código de acceso TTLock:
${ttlockCode}

` : ''}¡Te esperamos!`;
                // Sende WhatsApp-Nachricht (mit Fallback auf Template)
                const whatsappService = updatedReservation.branchId
                    ? new whatsappService_1.WhatsAppService(undefined, updatedReservation.branchId)
                    : new whatsappService_1.WhatsAppService(reservation.organizationId);
                // Basis-Template-Name (wird in sendMessageWithFallback basierend auf Sprache angepasst)
                // Spanisch: reservation_checkin_invitation, Englisch: reservation_checkin_invitation_
                const templateName = process.env.WHATSAPP_TEMPLATE_RESERVATION_CONFIRMATION || 'reservation_checkin_invitation';
                // Template-Parameter: {{1}} = Gast-Name, {{2}} = Check-in-Link, {{3}} = Payment-Link
                // WICHTIG: Check-in-Link IMMER mit der ursprünglich importierten E-Mail generieren
                // (reservation.guestEmail), nicht mit der geänderten E-Mail aus updatedReservation
                // Der Check-in-Link muss immer die Original-E-Mail verwenden, die beim Import verwendet wurde
                // WICHTIG: Verwende lobbyReservationId (LobbyPMS booking_id) als codigo, nicht die interne ID
                const reservationForCheckInLink = {
                    id: reservation.id,
                    lobbyReservationId: reservation.lobbyReservationId,
                    guestEmail: reservation.guestEmail || ''
                };
                const checkInLink = (0, checkInLinkUtils_1.generateLobbyPmsCheckInLink)(reservationForCheckInLink);
                const templateParams = [updatedReservation.guestName, checkInLink, paymentLink];
                yield whatsappService.sendMessageWithFallback(updatedReservation.guestPhone, sentMessage, templateName, templateParams, {
                    guestNationality: updatedReservation.guestNationality,
                    guestPhone: updatedReservation.guestPhone
                });
                sentMessageAt = new Date();
                // Speichere versendete Nachricht in Reservierung
                yield prisma_1.prisma.reservation.update({
                    where: { id: reservationId },
                    data: {
                        sentMessage,
                        sentMessageAt,
                        paymentLink,
                    },
                });
                logger_1.logger.log(`[Reservation] WhatsApp-Nachricht versendet für Reservierung ${reservationId}`);
            }
            catch (whatsappError) {
                logger_1.logger.error('[Reservation] Fehler beim Versenden der WhatsApp-Nachricht:', whatsappError);
                // Fehler nicht weiterwerfen, Status wurde bereits aktualisiert
            }
        }
        res.json({
            success: true,
            data: Object.assign(Object.assign({}, updatedReservation), { sentMessage,
                sentMessageAt }),
        });
    }
    catch (error) {
        logger_1.logger.error('[Reservation] Fehler beim Aktualisieren der Kontaktinformation:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Fehler beim Aktualisieren der Kontaktinformation'
        });
    }
});
exports.updateGuestContact = updateGuestContact;
/**
 * POST /api/reservations
 * Erstellt eine neue Reservierung manuell
 */
const createReservation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        logger_1.logger.log('[Reservation] createReservation aufgerufen');
        logger_1.logger.log('[Reservation] organizationId:', req.organizationId);
        logger_1.logger.log('[Reservation] Body:', req.body);
        const { guestName, contact, amount, currency = 'COP' } = req.body;
        // Validierung
        if (!guestName || typeof guestName !== 'string' || guestName.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Gast-Name ist erforderlich'
            });
        }
        if (!contact || typeof contact !== 'string' || contact.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Kontaktinformation (Telefonnummer oder Email) ist erforderlich'
            });
        }
        if (!amount || typeof amount !== 'number' || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Betrag muss eine positive Zahl sein'
            });
        }
        if (!req.organizationId) {
            return res.status(400).json({
                success: false,
                message: 'Organisation-ID fehlt'
            });
        }
        // Erkenne ob es Telefonnummer oder Email ist
        const contactType = detectContactType(contact.trim());
        // WICHTIG: checkOutDate muss nach checkInDate liegen (mindestens 1 Tag später)
        // Beim funktionierenden Code 7149923045 waren die Daten unterschiedlich
        const checkInDate = new Date();
        const checkOutDate = new Date(checkInDate);
        checkOutDate.setDate(checkOutDate.getDate() + 1); // +1 Tag
        // Hole Branch-ID aus Request (falls vorhanden) oder erste Branch der Organisation
        let branchId = req.branchId || null;
        if (!branchId) {
            const branch = yield prisma_1.prisma.branch.findFirst({
                where: { organizationId: req.organizationId },
                orderBy: { id: 'asc' }
            });
            branchId = (branch === null || branch === void 0 ? void 0 : branch.id) || null;
        }
        const reservationData = {
            guestName: guestName.trim(),
            checkInDate: checkInDate,
            checkOutDate: checkOutDate, // Mindestens 1 Tag nach checkInDate
            status: client_1.ReservationStatus.confirmed,
            paymentStatus: client_1.PaymentStatus.pending,
            amount: amount,
            currency: currency,
            organizationId: req.organizationId,
            branchId: branchId
        };
        if (contactType === 'phone') {
            reservationData.guestPhone = contact.trim();
        }
        else {
            reservationData.guestEmail = contact.trim();
        }
        // Erstelle Reservierung
        let reservation = yield prisma_1.prisma.reservation.create({
            data: reservationData,
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true,
                        displayName: true,
                        settings: true
                    }
                }
            }
        });
        // Prüfe Einstellung: Automatischer Versand aktiviert?
        const organization = reservation.organization;
        const settings = organization.settings;
        const autoSend = ((_a = settings === null || settings === void 0 ? void 0 : settings.lobbyPms) === null || _a === void 0 ? void 0 : _a.autoSendReservationInvitation) !== false; // Default: true (Rückwärtskompatibilität)
        // NEU: Queue-basierte Verarbeitung (wenn aktiviert UND autoSend = true)
        const queueEnabled = process.env.QUEUE_ENABLED === 'true';
        const isQueueHealthy = queueEnabled ? yield (0, queueService_1.checkQueueHealth)() : false;
        if (autoSend && queueEnabled && isQueueHealthy && contactType === 'phone' && reservation.guestPhone) {
            // Füge Job zur Queue hinzu
            try {
                yield queueService_1.reservationQueue.add('process-reservation', {
                    reservationId: reservation.id,
                    organizationId: reservation.organizationId,
                    amount: amount,
                    currency: currency,
                    contactType: contactType,
                    guestPhone: reservation.guestPhone,
                    guestName: reservation.guestName,
                }, {
                    priority: 1, // Hohe Priorität für manuelle Reservierungen
                    jobId: `reservation-${reservation.id}`, // Eindeutige ID für Idempotenz
                });
                logger_1.logger.log(`[Reservation] ✅ Job zur Queue hinzugefügt für Reservierung ${reservation.id}`);
                // Hole aktuelle Reservierung (ohne Updates)
                const finalReservation = yield prisma_1.prisma.reservation.findUnique({
                    where: { id: reservation.id },
                    include: {
                        organization: {
                            select: {
                                id: true,
                                name: true,
                                displayName: true,
                                settings: true
                            }
                        },
                        task: true
                    }
                });
                // Sofortige Antwort - Job läuft im Hintergrund
                return res.status(201).json({
                    success: true,
                    data: finalReservation || reservation,
                    message: 'Reservierung erstellt. Benachrichtigung wird im Hintergrund versendet.',
                });
            }
            catch (queueError) {
                logger_1.logger.error('[Reservation] Fehler beim Hinzufügen zur Queue, verwende Fallback:', queueError);
                // Fallback auf synchrone Logik
            }
        }
        // Wenn autoSend = false, überspringe automatischen Versand
        if (!autoSend) {
            logger_1.logger.log(`[Reservation] Automatischer Versand ist deaktiviert für Organisation ${reservation.organizationId}`);
            // Hole aktuelle Reservierung
            const finalReservation = yield prisma_1.prisma.reservation.findUnique({
                where: { id: reservation.id },
                include: {
                    organization: {
                        select: {
                            id: true,
                            name: true,
                            displayName: true,
                            settings: true
                        }
                    },
                    task: true
                }
            });
            return res.status(201).json({
                success: true,
                data: finalReservation || reservation,
                message: 'Reservierung erstellt. Benachrichtigung kann manuell versendet werden.',
            });
        }
        // FALLBACK: Synchrone Logik (wenn Queue deaktiviert oder Fehler)
        // Verwende neue Service-Methode sendReservationInvitation()
        if (contactType === 'phone' && reservation.guestPhone) {
            try {
                const result = yield reservationNotificationService_1.ReservationNotificationService.sendReservationInvitation(reservation.id, {
                    amount,
                    currency
                });
                if (result.success) {
                    logger_1.logger.log(`[Reservation] ✅ Reservierung ${reservation.id} erstellt und WhatsApp-Nachricht erfolgreich versendet`);
                }
                else {
                    logger_1.logger.warn(`[Reservation] ⚠️ Reservierung ${reservation.id} erstellt, aber WhatsApp-Nachricht fehlgeschlagen: ${result.error}`);
                }
            }
            catch (error) {
                logger_1.logger.error('[Reservation] ❌ Fehler beim Versenden der WhatsApp-Nachricht:', error);
                // Fehler nicht weiterwerfen, Reservierung wurde bereits erstellt
            }
        }
        else if (contactType === 'email' && reservation.guestEmail) {
            // NEU: Email-Versendung für contactType === 'email'
            try {
                const result = yield reservationNotificationService_1.ReservationNotificationService.sendReservationInvitation(reservation.id, {
                    guestEmail: reservation.guestEmail,
                    amount,
                    currency
                });
                if (result.success) {
                    logger_1.logger.log(`[Reservation] ✅ Reservierung ${reservation.id} erstellt und Email erfolgreich versendet`);
                }
                else {
                    logger_1.logger.warn(`[Reservation] ⚠️ Reservierung ${reservation.id} erstellt, aber Email fehlgeschlagen: ${result.error}`);
                }
            }
            catch (error) {
                logger_1.logger.error('[Reservation] ❌ Fehler beim Versenden der Email:', error);
                // Fehler nicht weiterwerfen, Reservierung wurde bereits erstellt
            }
        }
        // Hole die aktuelle Reservierung mit allen Feldern (inkl. Updates wie sentMessage, status, etc.)
        const finalReservation = yield prisma_1.prisma.reservation.findUnique({
            where: { id: reservation.id },
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true,
                        displayName: true,
                        settings: true
                    }
                },
                task: true
            }
        });
        res.status(201).json({
            success: true,
            data: finalReservation || reservation
        });
    }
    catch (error) {
        logger_1.logger.error('[Reservation] Fehler beim Erstellen der Reservierung:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Fehler beim Erstellen der Reservierung'
        });
    }
});
exports.createReservation = createReservation;
/**
 * GET /api/reservations
 * Holt alle Reservierungen für die aktuelle Organisation (mit Branch-Filter basierend auf Berechtigungen)
 */
const getAllReservations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        logger_1.logger.log('[Reservation] getAllReservations aufgerufen, organizationId:', req.organizationId);
        if (!req.organizationId) {
            return res.status(400).json({
                success: false,
                message: 'Organisation-ID fehlt'
            });
        }
        const userId = parseInt(req.userId, 10);
        const roleId = parseInt(req.roleId, 10);
        if (isNaN(userId) || isNaN(roleId)) {
            return res.status(401).json({
                success: false,
                message: 'Nicht authentifiziert'
            });
        }
        // Prüfe Berechtigungen
        const hasAllBranchesPermission = yield (0, permissionMiddleware_1.checkUserPermission)(userId, roleId, 'reservations_all_branches', 'read', 'table');
        const hasOwnBranchPermission = yield (0, permissionMiddleware_1.checkUserPermission)(userId, roleId, 'reservations_own_branch', 'read', 'table');
        // Wenn keine der beiden Berechtigungen vorhanden, prüfe Fallback auf alte Berechtigung
        let hasReservationsPermission = false;
        if (!hasAllBranchesPermission && !hasOwnBranchPermission) {
            hasReservationsPermission = yield (0, permissionMiddleware_1.checkUserPermission)(userId, roleId, 'reservations', 'read', 'table');
        }
        // Wenn keine Berechtigung vorhanden, verweigere Zugriff
        if (!hasAllBranchesPermission && !hasOwnBranchPermission && !hasReservationsPermission) {
            return res.status(403).json({
                success: false,
                message: 'Keine Berechtigung zum Anzeigen von Reservierungen'
            });
        }
        // Filter-Parameter aus Query lesen
        const filterId = req.query.filterId;
        const filterConditions = req.query.filterConditions
            ? JSON.parse(req.query.filterConditions)
            : undefined;
        // ✅ PAGINATION: limit/offset Parameter wieder einführen
        const limit = req.query.limit
            ? parseInt(req.query.limit, 10)
            : 20; // Standard: 20 Items
        const offset = req.query.offset
            ? parseInt(req.query.offset, 10)
            : 0; // Standard: 0
        // ✅ BRANCH-FILTER: branchId Query-Parameter unterstützen
        const queryBranchId = req.query.branchId
            ? parseInt(req.query.branchId, 10)
            : undefined;
        // ✅ ROLLEN-ISOLATION: Baue Where-Clause basierend auf Rolle
        const whereClause = {
            organizationId: req.organizationId
        };
        // ✅ BRANCH-FILTER: Wenn branchId als Query-Parameter übergeben wurde, verwende diesen (hat Priorität)
        if (queryBranchId && !isNaN(queryBranchId)) {
            whereClause.branchId = queryBranchId;
            logger_1.logger.log(`[Reservation] Filtere nach Branch ${queryBranchId} (Query-Parameter)`);
        }
        // Admin/Owner: Alle Reservations der Organisation (kein Branch-Filter, außer Query-Parameter)
        else if ((0, organization_1.isAdminOrOwner)(req)) {
            // Kein Branch-Filter für Admin/Owner (wenn kein Query-Parameter)
            logger_1.logger.log(`[Reservation] Admin/Owner: Zeige alle Reservations der Organisation`);
        }
        else {
            // User/Andere Rollen: Nur Reservations der eigenen Branch
            // OPTIMIERUNG: Verwende branchId aus Request-Kontext statt zusätzlicher Query
            // Wenn nur "own_branch" Berechtigung: Filtere nach Branch
            if (hasOwnBranchPermission && !hasAllBranchesPermission) {
                // Hole branchId aus Request-Kontext (wird in organization-Middleware gesetzt)
                const branchId = req.branchId;
                if (branchId) {
                    whereClause.branchId = branchId;
                    logger_1.logger.log(`[Reservation] Filtere nach Branch ${branchId} (own_branch Berechtigung)`);
                }
                else {
                    // Fallback: Hole branchId aus UsersBranches (falls nicht im Request-Kontext)
                    const userBranch = yield prisma_1.prisma.usersBranches.findFirst({
                        where: {
                            userId: userId,
                            branch: {
                                organizationId: req.organizationId
                            }
                        },
                        select: {
                            branchId: true
                        }
                    });
                    if (userBranch === null || userBranch === void 0 ? void 0 : userBranch.branchId) {
                        whereClause.branchId = userBranch.branchId;
                        logger_1.logger.log(`[Reservation] Filtere nach Branch ${userBranch.branchId} (own_branch Berechtigung, aus DB)`);
                    }
                    else {
                        // User hat keine aktive Branch → keine Reservierungen
                        logger_1.logger.log(`[Reservation] User hat keine aktive Branch, gebe leeres Array zurück`);
                        return res.json({
                            success: true,
                            data: [],
                            totalCount: 0,
                            hasMore: false
                        });
                    }
                }
            }
            else if (hasAllBranchesPermission) {
                // Wenn "all_branches" Berechtigung: Kein Branch-Filter (alle Reservierungen)
                logger_1.logger.log(`[Reservation] User hat all_branches Berechtigung, zeige alle Reservations`);
            }
            else if (hasReservationsPermission) {
                // ✅ FIX: Alte "reservations" Berechtigung → Zeige alle Reservierungen der Organisation
                logger_1.logger.log(`[Reservation] User hat alte 'reservations' Berechtigung, zeige alle Reservations der Organisation`);
            }
            else {
                // Keine Berechtigung → keine Reservierungen
                logger_1.logger.log(`[Reservation] User hat keine Berechtigung, gebe leeres Array zurück`);
                return res.json({
                    success: true,
                    data: [],
                    totalCount: 0,
                    hasMore: false
                });
            }
        }
        // Filter-Bedingungen konvertieren (falls vorhanden)
        let filterWhereClause = {};
        if (filterId) {
            // OPTIMIERUNG: Lade Filter aus Cache (vermeidet DB-Query)
            const filterData = yield filterCache_1.filterCache.get(parseInt(filterId, 10));
            if (filterData) {
                const conditions = JSON.parse(filterData.conditions);
                const operators = JSON.parse(filterData.operators);
                filterWhereClause = (0, filterToPrisma_1.convertFilterConditionsToPrismaWhere)(conditions, operators, 'reservation', req);
                // ✅ SICHERHEIT: Validiere Filter gegen Datenisolation
                filterWhereClause = (0, filterToPrisma_1.validateFilterAgainstIsolation)(filterWhereClause, req, 'reservation');
            }
        }
        else if (filterConditions) {
            // Direkte Filter-Bedingungen
            filterWhereClause = (0, filterToPrisma_1.convertFilterConditionsToPrismaWhere)(filterConditions.conditions || filterConditions, filterConditions.operators || [], 'reservation', req);
            // ✅ SICHERHEIT: Validiere Filter gegen Datenisolation
            filterWhereClause = (0, filterToPrisma_1.validateFilterAgainstIsolation)(filterWhereClause, req, 'reservation');
        }
        // Kombiniere alle Filter-Bedingungen
        const baseWhereConditions = [whereClause];
        if (Object.keys(filterWhereClause).length > 0) {
            baseWhereConditions.push(filterWhereClause);
        }
        const finalWhereClause = baseWhereConditions.length === 1
            ? baseWhereConditions[0]
            : { AND: baseWhereConditions };
        // ✅ PAGINATION: totalCount für Infinite Scroll
        const totalCount = yield prisma_1.prisma.reservation.count({
            where: finalWhereClause
        });
        const reservations = yield prisma_1.prisma.reservation.findMany({
            where: finalWhereClause,
            // ✅ PAGINATION: Nur limit Items laden, offset überspringen
            take: limit,
            skip: offset,
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true,
                        displayName: true
                    }
                },
                branch: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                task: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        // ✅ PAGINATION: Response mit totalCount für Infinite Scroll
        res.json({
            success: true,
            data: reservations,
            totalCount: totalCount,
            limit: limit,
            offset: offset,
            hasMore: offset + reservations.length < totalCount
        });
    }
    catch (error) {
        logger_1.logger.error('[Reservation] Fehler beim Abrufen der Reservierungen:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Fehler beim Abrufen der Reservierungen'
        });
    }
});
exports.getAllReservations = getAllReservations;
/**
 * POST /api/reservations/:id/send-invitation
 * Sendet Reservation-Einladung manuell (mit optionalen Parametern)
 */
const sendReservationInvitation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const reservationId = parseInt(id, 10);
        const organizationId = req.organizationId;
        const { guestPhone, guestEmail, customMessage, amount, currency } = req.body;
        if (isNaN(reservationId)) {
            return res.status(400).json({
                success: false,
                message: 'Ungültige Reservierungs-ID'
            });
        }
        if (!organizationId) {
            return res.status(400).json({
                success: false,
                message: 'Organisation-ID fehlt'
            });
        }
        // Prüfe ob Reservierung existiert und zur Organisation gehört
        const reservation = yield prisma_1.prisma.reservation.findFirst({
            where: {
                id: reservationId,
                organizationId: organizationId
            }
        });
        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: 'Reservierung nicht gefunden oder gehört nicht zur Organisation'
            });
        }
        logger_1.logger.log(`[Reservation] Sende Einladung für Reservierung ${reservationId}`);
        logger_1.logger.log(`[Reservation] Organization ID: ${organizationId}`);
        logger_1.logger.log(`[Reservation] Optionale Parameter:`, { guestPhone, guestEmail, customMessage, amount, currency });
        // Rufe Service-Methode auf
        try {
            const result = yield reservationNotificationService_1.ReservationNotificationService.sendReservationInvitation(reservationId, {
                guestPhone,
                guestEmail,
                customMessage,
                amount,
                currency
            });
            if (result.success) {
                logger_1.logger.log(`[Reservation] ✅ Einladung erfolgreich versendet für Reservierung ${reservationId}`);
                return res.json({
                    success: true,
                    data: {
                        reservationId,
                        paymentLink: result.paymentLink,
                        checkInLink: result.checkInLink,
                        messageSent: result.messageSent,
                        sentAt: result.sentAt
                    },
                    message: 'Einladung erfolgreich versendet'
                });
            }
            else {
                logger_1.logger.warn(`[Reservation] ⚠️ Einladung teilweise fehlgeschlagen für Reservierung ${reservationId}: ${result.error}`);
                return res.status(207).json({
                    success: false,
                    data: {
                        reservationId,
                        paymentLink: result.paymentLink,
                        checkInLink: result.checkInLink,
                        messageSent: result.messageSent,
                        sentAt: result.sentAt,
                        error: result.error
                    },
                    message: result.error || 'Einladung konnte nicht vollständig versendet werden'
                });
            }
        }
        catch (error) {
            logger_1.logger.error(`[Reservation] ❌ Fehler bei Einladung für Reservierung ${reservationId}:`, error);
            const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
            return res.status(500).json({
                success: false,
                message: `Fehler beim Versenden der Einladung: ${errorMessage}`
            });
        }
    }
    catch (error) {
        logger_1.logger.error('[Reservation] Fehler in sendReservationInvitation:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Fehler beim Versenden der Einladung'
        });
    }
});
exports.sendReservationInvitation = sendReservationInvitation;
/**
 * POST /api/reservations/:id/generate-pin-and-send
 * Generiert PIN-Code und sendet Mitteilung (unabhängig von Zahlungsstatus/Check-in-Status)
 */
const generatePinAndSendNotification = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const reservationId = parseInt(id, 10);
        const organizationId = req.organizationId;
        if (isNaN(reservationId)) {
            return res.status(400).json({
                success: false,
                message: 'Ungültige Reservierungs-ID'
            });
        }
        if (!organizationId) {
            return res.status(400).json({
                success: false,
                message: 'Organisation-ID fehlt'
            });
        }
        // Prüfe ob Reservierung existiert und zur Organisation gehört
        const reservation = yield prisma_1.prisma.reservation.findFirst({
            where: {
                id: reservationId,
                organizationId: organizationId
            }
        });
        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: 'Reservierung nicht gefunden oder gehört nicht zur Organisation'
            });
        }
        logger_1.logger.log(`[Reservation] Generiere PIN und sende Mitteilung für Reservierung ${reservationId}`);
        logger_1.logger.log(`[Reservation] Organization ID: ${organizationId}`);
        // Rufe Service-Methode auf, die unabhängig vom Check-in-Status funktioniert
        try {
            yield reservationNotificationService_1.ReservationNotificationService.generatePinAndSendNotification(reservationId);
            logger_1.logger.log(`[Reservation] ✅ PIN-Generierung abgeschlossen für Reservierung ${reservationId}`);
        }
        catch (error) {
            logger_1.logger.error(`[Reservation] ❌ Fehler bei PIN-Generierung für Reservierung ${reservationId}:`, error);
            if (error instanceof Error) {
                logger_1.logger.error(`[Reservation] Fehlermeldung: ${error.message}`);
                logger_1.logger.error(`[Reservation] Stack: ${error.stack}`);
            }
            throw error;
        }
        // Hole aktualisierte Reservierung
        const updatedReservation = yield prisma_1.prisma.reservation.findUnique({
            where: { id: reservationId },
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true,
                        displayName: true
                    }
                }
            }
        });
        // Prüfe ob PIN tatsächlich generiert wurde
        const pinGenerated = (updatedReservation === null || updatedReservation === void 0 ? void 0 : updatedReservation.doorPin) !== null && (updatedReservation === null || updatedReservation === void 0 ? void 0 : updatedReservation.doorPin) !== undefined;
        res.json({
            success: true,
            data: updatedReservation,
            message: pinGenerated
                ? 'PIN-Code generiert und Mitteilung versendet'
                : 'Mitteilung versendet, aber PIN-Code konnte nicht generiert werden (TTLock Fehler)'
        });
    }
    catch (error) {
        logger_1.logger.error('[Reservation] Fehler beim Generieren des PIN-Codes und Versenden der Mitteilung:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Fehler beim Generieren des PIN-Codes und Versenden der Mitteilung'
        });
    }
});
exports.generatePinAndSendNotification = generatePinAndSendNotification;
/**
 * POST /api/reservations/:id/send-passcode
 * Sendet TTLock Passcode mit anpassbaren Kontaktdaten
 */
const sendPasscode = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const reservationId = parseInt(id, 10);
        const organizationId = req.organizationId;
        const { guestPhone, guestEmail, customMessage } = req.body;
        if (isNaN(reservationId)) {
            return res.status(400).json({
                success: false,
                message: 'Ungültige Reservierungs-ID'
            });
        }
        if (!organizationId) {
            return res.status(400).json({
                success: false,
                message: 'Organisation-ID fehlt'
            });
        }
        // Prüfe ob Reservierung existiert und zur Organisation gehört
        const reservation = yield prisma_1.prisma.reservation.findFirst({
            where: {
                id: reservationId,
                organizationId: organizationId
            },
            include: {
                organization: true,
                branch: true
            }
        });
        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: 'Reservierung nicht gefunden oder gehört nicht zur Organisation'
            });
        }
        // Validierung: Mindestens eine Kontaktinfo muss vorhanden sein
        const finalGuestPhone = guestPhone || reservation.guestPhone;
        const finalGuestEmail = guestEmail || reservation.guestEmail;
        if (!finalGuestPhone && !finalGuestEmail) {
            return res.status(400).json({
                success: false,
                message: 'Mindestens eine Telefonnummer oder E-Mail-Adresse ist erforderlich'
            });
        }
        logger_1.logger.log(`[Reservation] Sende Passcode für Reservierung ${reservationId}`);
        logger_1.logger.log(`[Reservation] Guest Phone: ${finalGuestPhone || 'N/A'}`);
        logger_1.logger.log(`[Reservation] Guest Email: ${finalGuestEmail || 'N/A'}`);
        // Rufe Service-Methode auf
        try {
            yield reservationNotificationService_1.ReservationNotificationService.sendPasscodeNotification(reservationId, {
                guestPhone: finalGuestPhone || undefined,
                guestEmail: finalGuestEmail || undefined,
                customMessage: customMessage || undefined
            });
            logger_1.logger.log(`[Reservation] ✅ Passcode-Versendung abgeschlossen für Reservierung ${reservationId}`);
        }
        catch (error) {
            logger_1.logger.error(`[Reservation] ❌ Fehler bei Passcode-Versendung für Reservierung ${reservationId}:`, error);
            if (error instanceof Error) {
                logger_1.logger.error(`[Reservation] Fehlermeldung: ${error.message}`);
                logger_1.logger.error(`[Reservation] Stack: ${error.stack}`);
            }
            throw error;
        }
        // Hole aktualisierte Reservierung
        const updatedReservation = yield prisma_1.prisma.reservation.findUnique({
            where: { id: reservationId },
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true,
                        displayName: true
                    }
                }
            }
        });
        // Prüfe ob PIN tatsächlich generiert wurde
        const pinGenerated = (updatedReservation === null || updatedReservation === void 0 ? void 0 : updatedReservation.doorPin) !== null && (updatedReservation === null || updatedReservation === void 0 ? void 0 : updatedReservation.doorPin) !== undefined;
        res.json({
            success: true,
            data: updatedReservation,
            message: pinGenerated
                ? 'Passcode generiert und Mitteilung versendet'
                : 'Mitteilung versendet, aber Passcode konnte nicht generiert werden (TTLock Fehler)'
        });
    }
    catch (error) {
        logger_1.logger.error('[Reservation] Fehler beim Versenden des Passcodes:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Fehler beim Versenden des Passcodes'
        });
    }
});
exports.sendPasscode = sendPasscode;
/**
 * GET /api/reservations/:id/notification-logs
 * Gibt Notification-Logs UND WhatsApp-Nachrichten zurück
 * Holt Log-Historie für eine Reservation
 */
const getReservationNotificationLogs = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const organizationId = req.organizationId;
        if (!organizationId) {
            return res.status(401).json({
                success: false,
                message: 'Organisation nicht gefunden'
            });
        }
        const reservationId = parseInt(id, 10);
        if (isNaN(reservationId)) {
            return res.status(400).json({
                success: false,
                message: 'Ungültige Reservierungs-ID'
            });
        }
        // Prüfe ob Reservation existiert und zur Organisation gehört
        const reservation = yield prisma_1.prisma.reservation.findFirst({
            where: {
                id: reservationId,
                organizationId: organizationId
            }
        });
        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: 'Reservierung nicht gefunden'
            });
        }
        // Lade Notification-Logs
        const logs = yield prisma_1.prisma.reservationNotificationLog.findMany({
            where: {
                reservationId: reservationId
            },
            orderBy: {
                sentAt: 'desc' // Neueste zuerst
            }
        });
        // Lade WhatsApp-Nachrichten (eingehend und ausgehend)
        const whatsappMessages = yield prisma_1.prisma.whatsAppMessage.findMany({
            where: {
                reservationId: reservationId
            },
            orderBy: {
                sentAt: 'desc' // Neueste zuerst
            }
        });
        return res.json({
            success: true,
            data: {
                notificationLogs: logs,
                whatsappMessages: whatsappMessages
            }
        });
    }
    catch (error) {
        logger_1.logger.error('[Reservation] Fehler beim Laden der Notification-Logs:', error);
        return res.status(500).json({
            success: false,
            message: 'Fehler beim Laden der Notification-Logs'
        });
    }
});
exports.getReservationNotificationLogs = getReservationNotificationLogs;
const getReservationById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const reservationId = parseInt(id, 10);
        if (isNaN(reservationId)) {
            return res.status(400).json({
                success: false,
                message: 'Ungültige Reservierungs-ID'
            });
        }
        const reservation = yield prisma_1.prisma.reservation.findUnique({
            where: { id: reservationId },
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true,
                        displayName: true
                    }
                },
                task: {
                    select: {
                        id: true,
                        title: true,
                        status: true
                    }
                }
            }
        });
        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: 'Reservierung nicht gefunden'
            });
        }
        logger_1.logger.log('[Reservation] getReservationById - Status:', reservation.status);
        logger_1.logger.log('[Reservation] getReservationById - PaymentStatus:', reservation.paymentStatus);
        res.json({
            success: true,
            data: reservation
        });
    }
    catch (error) {
        logger_1.logger.error('[Reservation] Fehler beim Abrufen der Reservierung:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Fehler beim Abrufen der Reservierung'
        });
    }
});
exports.getReservationById = getReservationById;
//# sourceMappingURL=reservationController.js.map
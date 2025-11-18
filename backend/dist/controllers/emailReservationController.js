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
exports.triggerScheduler = exports.parseEmail = exports.getStatus = exports.checkEmails = void 0;
const emailReservationService_1 = require("../services/emailReservationService");
const emailReservationParser_1 = require("../services/emailReservationParser");
const emailReservationScheduler_1 = require("../services/emailReservationScheduler");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
/**
 * POST /api/email-reservations/check
 * Manueller Email-Check (für Tests)
 */
const checkEmails = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const organizationId = req.organizationId;
        if (!organizationId) {
            return res.status(400).json({
                success: false,
                message: 'Organisation-ID fehlt'
            });
        }
        console.log(`[EmailReservationController] Manueller Email-Check für Organisation ${organizationId}`);
        const processedCount = yield emailReservationService_1.EmailReservationService.checkForNewReservationEmails(organizationId);
        res.json({
            success: true,
            message: `${processedCount} Reservation(s) aus Email(s) erstellt`,
            processedCount
        });
    }
    catch (error) {
        console.error('[EmailReservationController] Fehler beim Email-Check:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Fehler beim Email-Check'
        });
    }
});
exports.checkEmails = checkEmails;
/**
 * GET /api/email-reservations/status
 * Status der Email-Integration
 */
const getStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const organizationId = req.organizationId;
        if (!organizationId) {
            return res.status(400).json({
                success: false,
                message: 'Organisation-ID fehlt'
            });
        }
        // Lade Organisation-Settings
        const organization = yield prisma.organization.findUnique({
            where: { id: organizationId },
            select: { settings: true, name: true }
        });
        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organisation nicht gefunden'
            });
        }
        const orgSettings = organization.settings;
        const emailReading = orgSettings === null || orgSettings === void 0 ? void 0 : orgSettings.emailReading;
        const status = {
            enabled: (emailReading === null || emailReading === void 0 ? void 0 : emailReading.enabled) || false,
            provider: (emailReading === null || emailReading === void 0 ? void 0 : emailReading.provider) || null,
            imap: (emailReading === null || emailReading === void 0 ? void 0 : emailReading.imap) ? {
                host: emailReading.imap.host,
                port: emailReading.imap.port,
                secure: emailReading.imap.secure,
                folder: emailReading.imap.folder,
                processedFolder: emailReading.imap.processedFolder
            } : null,
            filters: (emailReading === null || emailReading === void 0 ? void 0 : emailReading.filters) || null,
            schedulerRunning: emailReservationScheduler_1.EmailReservationScheduler.isRunning || false
        };
        res.json({
            success: true,
            data: status
        });
    }
    catch (error) {
        console.error('[EmailReservationController] Fehler beim Abrufen des Status:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Fehler beim Abrufen des Status'
        });
    }
});
exports.getStatus = getStatus;
/**
 * POST /api/email-reservations/parse
 * Test-Parsing einer Email (Body: emailContent)
 */
const parseEmail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { emailContent, emailHtml } = req.body;
        if (!emailContent || typeof emailContent !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'emailContent ist erforderlich'
            });
        }
        console.log('[EmailReservationController] Test-Parsing einer Email...');
        const parsedEmail = emailReservationParser_1.EmailReservationParser.parseReservationEmail(emailContent, emailHtml);
        if (!parsedEmail) {
            return res.json({
                success: false,
                message: 'Email konnte nicht als Reservation geparst werden',
                parsedData: null
            });
        }
        res.json({
            success: true,
            message: 'Email erfolgreich geparst',
            parsedData: {
                reservationCode: parsedEmail.reservationCode,
                guestName: parsedEmail.guestName,
                guestEmail: parsedEmail.guestEmail,
                guestPhone: parsedEmail.guestPhone,
                checkInDate: parsedEmail.checkInDate.toISOString(),
                checkOutDate: parsedEmail.checkOutDate.toISOString(),
                amount: parsedEmail.amount,
                currency: parsedEmail.currency,
                nights: parsedEmail.nights,
                rooms: parsedEmail.rooms,
                guests: parsedEmail.guests,
                nationality: parsedEmail.nationality,
                commission: parsedEmail.commission
            }
        });
    }
    catch (error) {
        console.error('[EmailReservationController] Fehler beim Parsing:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Fehler beim Parsing'
        });
    }
});
exports.parseEmail = parseEmail;
/**
 * POST /api/email-reservations/trigger-scheduler
 * Triggert manuell den Scheduler (für Tests)
 */
const triggerScheduler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const organizationId = req.organizationId;
        console.log('[EmailReservationController] Manueller Scheduler-Trigger...');
        const processedCount = yield emailReservationScheduler_1.EmailReservationScheduler.triggerManually(organizationId);
        res.json({
            success: true,
            message: 'Scheduler erfolgreich getriggert',
            processedCount
        });
    }
    catch (error) {
        console.error('[EmailReservationController] Fehler beim Scheduler-Trigger:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Fehler beim Scheduler-Trigger'
        });
    }
});
exports.triggerScheduler = triggerScheduler;
//# sourceMappingURL=emailReservationController.js.map
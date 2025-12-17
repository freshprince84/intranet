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
exports.ConversationService = void 0;
const ContextService_1 = require("./ContextService");
const logger_1 = require("../../utils/logger");
/**
 * Conversation Service
 *
 * Zentrale Conversation-Logik
 * State-Management
 * Flow-Control
 * Wiederverwendbar für alle Kanäle (WhatsApp, Email, Instagram, Facebook, Twitter)
 */
class ConversationService {
    /**
     * Verarbeitet Nachricht und bestimmt nächste Aktion
     *
     * @param message - Die eingehende Nachricht
     * @param parsed - Geparste Nachricht
     * @param context - Conversation Context
     * @param language - Sprache
     * @param conversationId - ID der Conversation
     * @param conversationModel - Prisma Model-Name
     * @param branchId - Branch ID
     * @returns Conversation State mit nächsten Aktionen
     */
    static processMessage(message, parsed, context, language, conversationId, conversationModel, branchId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Merge parsed mit context
                const updatedContext = ContextService_1.ContextService.mergeWithContext(parsed, context);
                // Speichere updated context
                yield ContextService_1.ContextService.updateContext(conversationId, updatedContext, conversationModel);
                // Bestimme nächste Aktion
                const state = {};
                if (parsed.intent === 'booking' && this.shouldExecuteBooking(updatedContext, parsed)) {
                    state.shouldBook = true;
                }
                if (parsed.intent === 'tour' && this.shouldExecuteTourBooking(updatedContext, parsed)) {
                    state.shouldBookTour = true;
                }
                if (parsed.intent === 'availability') {
                    state.shouldCheckAvailability = true;
                }
                // Bestimme fehlende Informationen
                if (state.shouldBook || state.shouldBookTour) {
                    state.missingInfo = this.getMissingInfo(updatedContext, parsed.intent || 'other');
                }
                return state;
            }
            catch (error) {
                logger_1.logger.error('[ConversationService] Fehler bei processMessage:', error);
                return {};
            }
        });
    }
    /**
     * Bestimmt ob Buchung ausgeführt werden soll
     *
     * Prüft ob alle erforderlichen Informationen vorhanden sind und ob eine aktive Buchungsanfrage existiert
     *
     * @param context - Conversation Context
     * @param parsed - Geparste Nachricht
     * @returns true wenn Buchung ausgeführt werden soll
     */
    static shouldExecuteBooking(context, parsed) {
        var _a, _b, _c;
        // Prüfe ob alle Informationen vorhanden sind
        if (!ContextService_1.ContextService.hasAllBookingInfo(context)) {
            return false;
        }
        // Prüfe ob Name gerade gegeben wurde
        const nameWasJustProvided = parsed.name && !((_a = context.booking) === null || _a === void 0 ? void 0 : _a.guestName);
        const hasActiveBookingRequest = ((_b = context.booking) === null || _b === void 0 ? void 0 : _b.checkInDate) || ((_c = context.booking) === null || _c === void 0 ? void 0 : _c.lastAvailabilityCheck);
        // Wenn Name gerade gegeben wurde und alle Daten vorhanden sind, buchen
        if (nameWasJustProvided && hasActiveBookingRequest) {
            return true;
        }
        // Wenn Intent booking ist und alle Daten vorhanden sind, buchen
        if (parsed.intent === 'booking' && hasActiveBookingRequest) {
            return true;
        }
        return false;
    }
    /**
     * Bestimmt ob Tour-Buchung ausgeführt werden soll
     *
     * @param context - Conversation Context
     * @param parsed - Geparste Nachricht
     * @returns true wenn Tour-Buchung ausgeführt werden soll
     */
    static shouldExecuteTourBooking(context, parsed) {
        // Prüfe ob alle Informationen vorhanden sind
        if (!ContextService_1.ContextService.hasAllTourInfo(context)) {
            return false;
        }
        // Wenn Intent tour ist und alle Daten vorhanden sind, buchen
        if (parsed.intent === 'tour') {
            return true;
        }
        return false;
    }
    /**
     * Bestimmt fehlende Informationen
     *
     * @param context - Conversation Context
     * @param intent - Intent der Nachricht
     * @returns Array mit fehlenden Informationen
     */
    static getMissingInfo(context, intent) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        const missing = [];
        if (intent === 'booking') {
            if (!((_a = context.booking) === null || _a === void 0 ? void 0 : _a.checkInDate))
                missing.push('checkInDate');
            if (!((_b = context.booking) === null || _b === void 0 ? void 0 : _b.checkOutDate))
                missing.push('checkOutDate');
            if (!((_c = context.booking) === null || _c === void 0 ? void 0 : _c.guestName))
                missing.push('guestName');
            if (!((_d = context.booking) === null || _d === void 0 ? void 0 : _d.roomType))
                missing.push('roomType');
            if (((_e = context.booking) === null || _e === void 0 ? void 0 : _e.roomName) && !((_f = context.booking) === null || _f === void 0 ? void 0 : _f.categoryId))
                missing.push('categoryId');
        }
        if (intent === 'tour') {
            if (!((_g = context.tour) === null || _g === void 0 ? void 0 : _g.tourId))
                missing.push('tourId');
            if (!((_h = context.tour) === null || _h === void 0 ? void 0 : _h.tourDate))
                missing.push('tourDate');
            if (!((_j = context.tour) === null || _j === void 0 ? void 0 : _j.numberOfParticipants))
                missing.push('numberOfParticipants');
            if (!((_k = context.tour) === null || _k === void 0 ? void 0 : _k.customerName))
                missing.push('customerName');
        }
        return missing;
    }
}
exports.ConversationService = ConversationService;
//# sourceMappingURL=ConversationService.js.map
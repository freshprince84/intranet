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
exports.ReservationTaskService = void 0;
const client_1 = require("@prisma/client");
const notificationController_1 = require("../controllers/notificationController");
const translations_1 = require("../utils/translations");
const prisma_1 = require("../utils/prisma");
const logger_1 = require("../utils/logger");
/**
 * Service für Reservierungs-Task-Management
 *
 * Verwaltet Status-Updates von Tasks basierend auf Reservierungs-Events
 */
class ReservationTaskService {
    /**
     * Aktualisiert Task-Status beim Check-in
     *
     * @param reservationId - ID der Reservierung
     * @param userId - ID des Users, der den Check-in durchführt
     */
    static updateTaskOnCheckIn(reservationId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // Finde Task zur Reservierung
                const task = yield prisma_1.prisma.task.findUnique({
                    where: { reservationId: reservationId },
                    include: {
                        reservation: true,
                        responsible: true
                    }
                });
                if (!task) {
                    logger_1.logger.log(`[ReservationTaskService] Kein Task gefunden für Reservierung ${reservationId}`);
                    return;
                }
                // Setze verantwortlichen User
                const updatedTask = yield prisma_1.prisma.task.update({
                    where: { id: task.id },
                    data: {
                        status: client_1.TaskStatus.in_progress,
                        responsibleId: userId
                    }
                });
                logger_1.logger.log(`[ReservationTaskService] Task ${task.id} auf "in_progress" gesetzt für Check-in`);
                // Erstelle WorkTime-Eintrag (Start)
                // TODO: Implementiere WorkTime-Erfassung für Check-in-Prozess
                // await this.startWorkTime(task.id, userId);
                // Aktualisiere Reservierungs-Status
                if (task.reservation) {
                    yield prisma_1.prisma.reservation.update({
                        where: { id: reservationId },
                        data: {
                            status: 'checked_in'
                        }
                    });
                }
                // Benachrichtigung für Quality Control
                if (task.qualityControlId) {
                    const userLang = yield (0, translations_1.getUserLanguage)(task.qualityControlId);
                    const notificationText = (0, translations_1.getTaskNotificationText)(userLang, 'check_in_started', task.title, undefined, undefined, (_a = task.reservation) === null || _a === void 0 ? void 0 : _a.guestName);
                    yield (0, notificationController_1.createNotificationIfEnabled)({
                        userId: task.qualityControlId,
                        title: notificationText.title,
                        message: notificationText.message,
                        type: client_1.NotificationType.task,
                        relatedEntityId: task.id,
                        relatedEntityType: 'update'
                    });
                }
            }
            catch (error) {
                logger_1.logger.error(`[ReservationTaskService] Fehler beim Aktualisieren des Tasks:`, error);
                throw error;
            }
        });
    }
    /**
     * Schließt Task ab nach erfolgreichem Check-in
     *
     * @param reservationId - ID der Reservierung
     * @param userId - ID des Users, der den Check-in durchführt
     * @param durationMinutes - Dauer des Check-ins in Minuten
     */
    static completeTaskOnCheckIn(reservationId, userId, durationMinutes) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // Finde Task zur Reservierung
                const task = yield prisma_1.prisma.task.findUnique({
                    where: { reservationId: reservationId },
                    include: {
                        reservation: true
                    }
                });
                if (!task) {
                    logger_1.logger.log(`[ReservationTaskService] Kein Task gefunden für Reservierung ${reservationId}`);
                    return;
                }
                // Aktualisiere Task-Status auf "done"
                const updatedTask = yield prisma_1.prisma.task.update({
                    where: { id: task.id },
                    data: {
                        status: client_1.TaskStatus.done,
                        responsibleId: userId
                    }
                });
                logger_1.logger.log(`[ReservationTaskService] Task ${task.id} auf "done" gesetzt`);
                // Erstelle WorkTime-Eintrag (Ende)
                if (durationMinutes) {
                    // TODO: Implementiere WorkTime-Erfassung
                    // await this.endWorkTime(task.id, userId, durationMinutes);
                }
                // Aktualisiere Reservierungs-Status
                if (task.reservation) {
                    yield prisma_1.prisma.reservation.update({
                        where: { id: reservationId },
                        data: {
                            status: 'checked_in',
                            onlineCheckInCompleted: true,
                            onlineCheckInCompletedAt: new Date()
                        }
                    });
                }
                // Benachrichtigung für Quality Control
                if (task.qualityControlId) {
                    const userLang = yield (0, translations_1.getUserLanguage)(task.qualityControlId);
                    const notificationText = (0, translations_1.getTaskNotificationText)(userLang, 'check_in_completed', task.title || '', undefined, undefined, (_a = task.reservation) === null || _a === void 0 ? void 0 : _a.guestName);
                    yield (0, notificationController_1.createNotificationIfEnabled)({
                        userId: task.qualityControlId,
                        title: notificationText.title,
                        message: notificationText.message,
                        type: client_1.NotificationType.task,
                        relatedEntityId: task.id,
                        relatedEntityType: 'update'
                    });
                }
            }
            catch (error) {
                logger_1.logger.error(`[ReservationTaskService] Fehler beim Abschließen des Tasks:`, error);
                throw error;
            }
        });
    }
    /**
     * Aktualisiert Task-Status basierend auf Reservierungs-Status
     *
     * @param reservationId - ID der Reservierung
     */
    static syncTaskStatus(reservationId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const reservation = yield prisma_1.prisma.reservation.findUnique({
                    where: { id: reservationId },
                    include: {
                        task: true
                    }
                });
                if (!reservation || !reservation.task) {
                    return;
                }
                // Synchronisiere Task-Status mit Reservierungs-Status
                let newTaskStatus = null;
                switch (reservation.status) {
                    case 'potential':
                        // "potential" Reservation: Task bleibt offen (wird erst bei "confirmed" erstellt)
                        newTaskStatus = client_1.TaskStatus.open;
                        break;
                    case 'confirmed':
                        newTaskStatus = client_1.TaskStatus.open;
                        break;
                    case 'checked_in':
                        newTaskStatus = reservation.onlineCheckInCompleted
                            ? client_1.TaskStatus.done
                            : client_1.TaskStatus.in_progress;
                        break;
                    case 'checked_out':
                        newTaskStatus = client_1.TaskStatus.done;
                        break;
                    case 'cancelled':
                    case 'no_show':
                        newTaskStatus = client_1.TaskStatus.done; // Task als erledigt markieren
                        break;
                }
                if (newTaskStatus && reservation.task.status !== newTaskStatus) {
                    yield prisma_1.prisma.task.update({
                        where: { id: reservation.task.id },
                        data: { status: newTaskStatus }
                    });
                    logger_1.logger.log(`[ReservationTaskService] Task ${reservation.task.id} Status synchronisiert: ${newTaskStatus}`);
                }
            }
            catch (error) {
                logger_1.logger.error(`[ReservationTaskService] Fehler beim Synchronisieren des Task-Status:`, error);
                throw error;
            }
        });
    }
}
exports.ReservationTaskService = ReservationTaskService;
//# sourceMappingURL=reservationTaskService.js.map
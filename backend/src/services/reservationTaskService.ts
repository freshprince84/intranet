import { Reservation, TaskStatus, NotificationType } from '@prisma/client';
import { createNotificationIfEnabled } from '../controllers/notificationController';
import { getUserLanguage, getTaskNotificationText } from '../utils/translations';
import { prisma } from '../utils/prisma';

/**
 * Service für Reservierungs-Task-Management
 * 
 * Verwaltet Status-Updates von Tasks basierend auf Reservierungs-Events
 */
export class ReservationTaskService {
  /**
   * Aktualisiert Task-Status beim Check-in
   * 
   * @param reservationId - ID der Reservierung
   * @param userId - ID des Users, der den Check-in durchführt
   */
  static async updateTaskOnCheckIn(reservationId: number, userId: number): Promise<void> {
    try {
      // Finde Task zur Reservierung
      const task = await prisma.task.findUnique({
        where: { reservationId: reservationId },
        include: {
          reservation: true,
          responsible: true
        }
      });

      if (!task) {
        console.log(`[ReservationTaskService] Kein Task gefunden für Reservierung ${reservationId}`);
        return;
      }

      // Setze verantwortlichen User
      const updatedTask = await prisma.task.update({
        where: { id: task.id },
        data: {
          status: TaskStatus.in_progress,
          responsibleId: userId
        }
      });

      console.log(`[ReservationTaskService] Task ${task.id} auf "in_progress" gesetzt für Check-in`);

      // Erstelle WorkTime-Eintrag (Start)
      // TODO: Implementiere WorkTime-Erfassung für Check-in-Prozess
      // await this.startWorkTime(task.id, userId);

      // Aktualisiere Reservierungs-Status
      if (task.reservation) {
        await prisma.reservation.update({
          where: { id: reservationId },
          data: {
            status: 'checked_in' as any
          }
        });
      }

      // Benachrichtigung für Quality Control
      if (task.qualityControlId) {
        const userLang = await getUserLanguage(task.qualityControlId);
        const notificationText = getTaskNotificationText(userLang, 'check_in_started', task.title, undefined, undefined, task.reservation?.guestName);
        await createNotificationIfEnabled({
          userId: task.qualityControlId,
          title: notificationText.title,
          message: notificationText.message,
          type: NotificationType.task,
          relatedEntityId: task.id,
          relatedEntityType: 'update'
        });
      }
    } catch (error) {
      console.error(`[ReservationTaskService] Fehler beim Aktualisieren des Tasks:`, error);
      throw error;
    }
  }

  /**
   * Schließt Task ab nach erfolgreichem Check-in
   * 
   * @param reservationId - ID der Reservierung
   * @param userId - ID des Users, der den Check-in durchführt
   * @param durationMinutes - Dauer des Check-ins in Minuten
   */
  static async completeTaskOnCheckIn(
    reservationId: number,
    userId: number,
    durationMinutes?: number
  ): Promise<void> {
    try {
      // Finde Task zur Reservierung
      const task = await prisma.task.findUnique({
        where: { reservationId: reservationId },
        include: {
          reservation: true
        }
      });

      if (!task) {
        console.log(`[ReservationTaskService] Kein Task gefunden für Reservierung ${reservationId}`);
        return;
      }

      // Aktualisiere Task-Status auf "done"
      const updatedTask = await prisma.task.update({
        where: { id: task.id },
        data: {
          status: TaskStatus.done,
          responsibleId: userId
        }
      });

      console.log(`[ReservationTaskService] Task ${task.id} auf "done" gesetzt`);

      // Erstelle WorkTime-Eintrag (Ende)
      if (durationMinutes) {
        // TODO: Implementiere WorkTime-Erfassung
        // await this.endWorkTime(task.id, userId, durationMinutes);
      }

      // Aktualisiere Reservierungs-Status
      if (task.reservation) {
        await prisma.reservation.update({
          where: { id: reservationId },
          data: {
            status: 'checked_in' as any,
            onlineCheckInCompleted: true,
            onlineCheckInCompletedAt: new Date()
          }
        });
      }

      // Benachrichtigung für Quality Control
      if (task.qualityControlId) {
        const userLang = await getUserLanguage(task.qualityControlId);
        const notificationText = getTaskNotificationText(userLang, 'check_in_completed', task.title || '', undefined, undefined, task.reservation?.guestName);
        await createNotificationIfEnabled({
          userId: task.qualityControlId,
          title: notificationText.title,
          message: notificationText.message,
          type: NotificationType.task,
          relatedEntityId: task.id,
          relatedEntityType: 'update'
        });
      }
    } catch (error) {
      console.error(`[ReservationTaskService] Fehler beim Abschließen des Tasks:`, error);
      throw error;
    }
  }

  /**
   * Aktualisiert Task-Status basierend auf Reservierungs-Status
   * 
   * @param reservationId - ID der Reservierung
   */
  static async syncTaskStatus(reservationId: number): Promise<void> {
    try {
      const reservation = await prisma.reservation.findUnique({
        where: { id: reservationId },
        include: {
          task: true
        }
      });

      if (!reservation || !reservation.task) {
        return;
      }

      // Synchronisiere Task-Status mit Reservierungs-Status
      let newTaskStatus: TaskStatus | null = null;

      switch (reservation.status) {
        case 'confirmed':
          newTaskStatus = TaskStatus.open;
          break;
        case 'checked_in':
          newTaskStatus = reservation.onlineCheckInCompleted 
            ? TaskStatus.done 
            : TaskStatus.in_progress;
          break;
        case 'checked_out':
          newTaskStatus = TaskStatus.done;
          break;
        case 'cancelled':
        case 'no_show':
          newTaskStatus = TaskStatus.done; // Task als erledigt markieren
          break;
      }

      if (newTaskStatus && reservation.task.status !== newTaskStatus) {
        await prisma.task.update({
          where: { id: reservation.task.id },
          data: { status: newTaskStatus }
        });

        console.log(`[ReservationTaskService] Task ${reservation.task.id} Status synchronisiert: ${newTaskStatus}`);
      }
    } catch (error) {
      console.error(`[ReservationTaskService] Fehler beim Synchronisieren des Task-Status:`, error);
      throw error;
    }
  }
}



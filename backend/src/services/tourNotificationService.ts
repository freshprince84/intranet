import { prisma } from '../utils/prisma';
import { NotificationType } from '@prisma/client';
import { createNotificationIfEnabled } from '../controllers/notificationController';
import { getUserLanguage, getTourNotificationText } from '../utils/translations';
import { logger } from '../utils/logger';

/**
 * Service für Tour-Benachrichtigungen
 */
export class TourNotificationService {
  /**
   * Sendet Notification: Tour gebucht (an alle in org)
   */
  static async notifyTourBooked(
    tourBookingId: number,
    tourId: number,
    organizationId: number,
    bookedByUserId: number
  ): Promise<void> {
    try {
      const tour = await prisma.tour.findUnique({
        where: { id: tourId },
        select: { title: true }
      });

      const bookedBy = await prisma.user.findUnique({
        where: { id: bookedByUserId },
        select: { firstName: true, lastName: true, username: true }
      });

      const tourTitle = tour?.title || 'Tour';
      const bookedByName = bookedBy 
        ? `${bookedBy.firstName || ''} ${bookedBy.lastName || ''}`.trim() || bookedBy.username
        : 'Unbekannt';

      // Alle User in der Organisation finden
      const users = await prisma.user.findMany({
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
        const userLanguage = await getUserLanguage(user.id);
        const notificationText = getTourNotificationText(
          userLanguage,
          'booked',
          bookedByName,
          tourTitle
        );
        
        await createNotificationIfEnabled({
          userId: user.id,
          title: notificationText.title,
          message: notificationText.message,
          type: NotificationType.system,
          relatedEntityId: tourBookingId,
          relatedEntityType: 'tour_booking'
        });
      }

      logger.log(`[TourNotification] ✅ Tour-Buchung Notification gesendet an ${users.length} User in Org ${organizationId}`);
    } catch (error) {
      logger.error('[TourNotification] ⚠️ Fehler beim Senden der Tour-Buchung Notification:', error);
    }
  }

  /**
   * Sendet Notification: Tour angefragt (an definierte Rolle in branch in org)
   * Nur bei externer Tour
   */
  static async notifyTourRequested(
    tourBookingId: number,
    tourId: number,
    organizationId: number,
    branchId: number | null,
    bookedByUserId: number
  ): Promise<void> {
    try {
      const tour = await prisma.tour.findUnique({
        where: { id: tourId },
        select: { title: true, type: true }
      });

      // Nur bei externer Tour
      if (tour?.type !== 'external') {
        return;
      }

      const bookedBy = await prisma.user.findUnique({
        where: { id: bookedByUserId },
        select: { firstName: true, lastName: true, username: true }
      });

      const tourTitle = tour?.title || 'Tour';
      const bookedByName = bookedBy 
        ? `${bookedBy.firstName || ''} ${bookedBy.lastName || ''}`.trim() || bookedBy.username
        : 'Unbekannt';

      // Lade Organisation-Settings, um die Rolle zu finden
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { settings: true }
      });

      // Entschlüssele Settings
      const { decryptApiSettings } = await import('../utils/encryption');
      const decryptedSettings = organization?.settings 
        ? decryptApiSettings(organization.settings as any)
        : null;

      // Rolle für Tour-Anfragen (z.B. 'tour_manager' oder ähnlich)
      // Falls nicht definiert, verwende Admin-Rolle
      const tourRequestRoleName = decryptedSettings?.tours?.requestNotificationRole || 'admin';

      // Finde User mit dieser Rolle in der Branch/Org
      const role = await prisma.role.findFirst({
        where: {
          organizationId,
          name: { contains: tourRequestRoleName, mode: 'insensitive' }
        },
        select: { id: true }
      });

      if (!role) {
        logger.log(`[TourNotification] ⚠️ Rolle "${tourRequestRoleName}" nicht gefunden, verwende Admin-Rolle`);
        // Fallback: Admin-Rolle
        const adminRole = await prisma.role.findFirst({
          where: {
            organizationId,
            name: { contains: 'admin', mode: 'insensitive' }
          },
          select: { id: true }
        });

        if (!adminRole) {
          logger.log(`[TourNotification] ⚠️ Admin-Rolle nicht gefunden, überspringe Notification`);
          return;
        }

        // Sende an alle User mit Admin-Rolle
        const adminUsers = await prisma.user.findMany({
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
          const userLanguage = await getUserLanguage(user.id);
          const notificationText = getTourNotificationText(
            userLanguage,
            'requested',
            bookedByName,
            tourTitle
          );
          
          await createNotificationIfEnabled({
            userId: user.id,
            title: notificationText.title,
            message: notificationText.message,
            type: NotificationType.system,
            relatedEntityId: tourBookingId,
            relatedEntityType: 'tour_booking_request'
          });
        }
      } else {
        // Sende an alle User mit der definierten Rolle
        const roleUsers = await prisma.user.findMany({
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
          const userLanguage = await getUserLanguage(user.id);
          const notificationText = getTourNotificationText(
            userLanguage,
            'requested',
            bookedByName,
            tourTitle
          );
          
          await createNotificationIfEnabled({
            userId: user.id,
            title: notificationText.title,
            message: notificationText.message,
            type: NotificationType.system,
            relatedEntityId: tourBookingId,
            relatedEntityType: 'tour_booking_request'
          });
        }
      }

      logger.log(`[TourNotification] ✅ Tour-Anfrage Notification gesendet`);
    } catch (error) {
      logger.error('[TourNotification] ⚠️ Fehler beim Senden der Tour-Anfrage Notification:', error);
    }
  }

  /**
   * Sendet Notification: Tour bezahlt
   */
  static async notifyTourPaid(
    tourBookingId: number,
    tourId: number,
    organizationId: number,
    bookedByUserId: number
  ): Promise<void> {
    try {
      const tour = await prisma.tour.findUnique({
        where: { id: tourId },
        select: { title: true }
      });

      const tourTitle = tour?.title || 'Tour';

      // Notification an den Buchenden User
      const userLanguage = await getUserLanguage(bookedByUserId);
      const notificationText = getTourNotificationText(
        userLanguage,
        'paid',
        undefined,
        tourTitle
      );
      
      await createNotificationIfEnabled({
        userId: bookedByUserId,
        title: notificationText.title,
        message: notificationText.message,
        type: NotificationType.system,
        relatedEntityId: tourBookingId,
        relatedEntityType: 'tour_booking_paid'
      });

      logger.log(`[TourNotification] ✅ Tour-Bezahlung Notification gesendet`);
    } catch (error) {
      logger.error('[TourNotification] ⚠️ Fehler beim Senden der Tour-Bezahlung Notification:', error);
    }
  }

  /**
   * Sendet Notification: Tour gecancelt von Kunde
   */
  static async notifyTourCancelledByCustomer(
    tourBookingId: number,
    tourId: number,
    organizationId: number,
    bookedByUserId: number
  ): Promise<void> {
    try {
      const tour = await prisma.tour.findUnique({
        where: { id: tourId },
        select: { title: true }
      });

      const bookedBy = await prisma.user.findUnique({
        where: { id: bookedByUserId },
        select: { firstName: true, lastName: true, username: true }
      });

      const tourTitle = tour?.title || 'Tour';
      const bookedByName = bookedBy 
        ? `${bookedBy.firstName || ''} ${bookedBy.lastName || ''}`.trim() || bookedBy.username
        : 'Unbekannt';

      // Alle User in der Organisation finden
      const users = await prisma.user.findMany({
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
        const userLanguage = await getUserLanguage(user.id);
        const notificationText = getTourNotificationText(
          userLanguage,
          'cancelled_by_customer',
          bookedByName,
          tourTitle
        );
        
        await createNotificationIfEnabled({
          userId: user.id,
          title: notificationText.title,
          message: notificationText.message,
          type: NotificationType.system,
          relatedEntityId: tourBookingId,
          relatedEntityType: 'tour_booking_cancelled_customer'
        });
      }

      logger.log(`[TourNotification] ✅ Tour-Stornierung (Kunde) Notification gesendet an ${users.length} User`);
    } catch (error) {
      logger.error('[TourNotification] ⚠️ Fehler beim Senden der Tour-Stornierung Notification:', error);
    }
  }

  /**
   * Sendet Notification: Tour gecancelt von Anbieter
   */
  static async notifyTourCancelledByProvider(
    tourBookingId: number,
    tourId: number,
    organizationId: number,
    bookedByUserId: number
  ): Promise<void> {
    try {
      const tour = await prisma.tour.findUnique({
        where: { id: tourId },
        select: { title: true, externalProvider: true }
      });

      const providerName = tour?.externalProvider?.name || 'Anbieter';
      const tourTitle = tour?.title || 'Tour';

      // Notification an den Buchenden User
      const bookedByLanguage = await getUserLanguage(bookedByUserId);
      const bookedByNotificationText = getTourNotificationText(
        bookedByLanguage,
        'cancelled_by_provider',
        undefined,
        tourTitle,
        providerName
      );
      
      await createNotificationIfEnabled({
        userId: bookedByUserId,
        title: bookedByNotificationText.title,
        message: bookedByNotificationText.message,
        type: NotificationType.system,
        relatedEntityId: tourBookingId,
        relatedEntityType: 'tour_booking_cancelled_provider'
      });

      // Auch an alle User in der Organisation
      const users = await prisma.user.findMany({
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
          const userLanguage = await getUserLanguage(user.id);
          const notificationText = getTourNotificationText(
            userLanguage,
            'cancelled_by_provider',
            undefined,
            tourTitle,
            providerName
          );
          
          await createNotificationIfEnabled({
            userId: user.id,
            title: notificationText.title,
            message: notificationText.message,
            type: NotificationType.system,
            relatedEntityId: tourBookingId,
            relatedEntityType: 'tour_booking_cancelled_provider'
          });
        }
      }

      logger.log(`[TourNotification] ✅ Tour-Stornierung (Anbieter) Notification gesendet`);
    } catch (error) {
      logger.error('[TourNotification] ⚠️ Fehler beim Senden der Tour-Stornierung (Anbieter) Notification:', error);
    }
  }
}


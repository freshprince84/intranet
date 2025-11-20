import { Request, Response } from 'express';
import { EmailReservationService } from '../services/emailReservationService';
import { EmailReservationParser } from '../services/emailReservationParser';
import { EmailReservationScheduler } from '../services/emailReservationScheduler';
import { prisma } from '../utils/prisma';

/**
 * POST /api/email-reservations/check
 * Manueller Email-Check (für Tests)
 */
export const checkEmails = async (req: Request, res: Response) => {
  try {
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organisation-ID fehlt'
      });
    }

    console.log(`[EmailReservationController] Manueller Email-Check für Organisation ${organizationId}`);

    const processedCount = await EmailReservationService.checkForNewReservationEmails(organizationId);

    res.json({
      success: true,
      message: `${processedCount} Reservation(s) aus Email(s) erstellt`,
      processedCount
    });
  } catch (error) {
    console.error('[EmailReservationController] Fehler beim Email-Check:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Fehler beim Email-Check'
    });
  }
};

/**
 * GET /api/email-reservations/status
 * Status der Email-Integration
 */
export const getStatus = async (req: Request, res: Response) => {
  try {
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organisation-ID fehlt'
      });
    }

    // Lade Organisation-Settings
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true, name: true }
    });

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organisation nicht gefunden'
      });
    }

    const orgSettings = organization.settings as any;
    const emailReading = orgSettings?.emailReading;

    const status = {
      enabled: emailReading?.enabled || false,
      provider: emailReading?.provider || null,
      imap: emailReading?.imap ? {
        host: emailReading.imap.host,
        port: emailReading.imap.port,
        secure: emailReading.imap.secure,
        folder: emailReading.imap.folder,
        processedFolder: emailReading.imap.processedFolder
      } : null,
      filters: emailReading?.filters || null,
      schedulerRunning: EmailReservationScheduler.isRunning || false
    };

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('[EmailReservationController] Fehler beim Abrufen des Status:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Fehler beim Abrufen des Status'
    });
  }
};

/**
 * POST /api/email-reservations/parse
 * Test-Parsing einer Email (Body: emailContent)
 */
export const parseEmail = async (req: Request, res: Response) => {
  try {
    const { emailContent, emailHtml } = req.body;

    if (!emailContent || typeof emailContent !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'emailContent ist erforderlich'
      });
    }

    console.log('[EmailReservationController] Test-Parsing einer Email...');

    const parsedEmail = EmailReservationParser.parseReservationEmail(
      emailContent,
      emailHtml
    );

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
  } catch (error) {
    console.error('[EmailReservationController] Fehler beim Parsing:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Fehler beim Parsing'
    });
  }
};

/**
 * POST /api/email-reservations/trigger-scheduler
 * Triggert manuell den Scheduler (für Tests)
 */
export const triggerScheduler = async (req: Request, res: Response) => {
  try {
    const organizationId = req.organizationId;

    console.log('[EmailReservationController] Manueller Scheduler-Trigger...');

    const processedCount = await EmailReservationScheduler.triggerManually(organizationId);

    res.json({
      success: true,
      message: 'Scheduler erfolgreich getriggert',
      processedCount
    });
  } catch (error) {
    console.error('[EmailReservationController] Fehler beim Scheduler-Trigger:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Fehler beim Scheduler-Trigger'
    });
  }
};


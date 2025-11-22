import { Request, Response } from 'express';
import { LobbyPmsService } from '../services/lobbyPmsService';
import { getDataIsolationFilter } from '../middleware/organization';
import { ReservationTaskService } from '../services/reservationTaskService';
import { ReservationNotificationService } from '../services/reservationNotificationService';
import { prisma } from '../utils/prisma';

interface AuthenticatedRequest extends Request {
  userId: string;
  organizationId: number;
}

/**
 * GET /api/lobby-pms/reservations
 * Ruft Reservierungen ab (mit optionalen Filtern)
 */
export const getReservations = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { startDate, endDate, status } = req.query;
    const organizationId = req.organizationId;

    // Prüfe ob LobbyPMS für diese Organisation konfiguriert ist
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true }
    });

    if (!organization?.settings) {
      return res.status(400).json({ 
        message: 'LobbyPMS ist nicht für diese Organisation konfiguriert' 
      });
    }

    const settings = organization.settings as any;
    if (!settings.lobbyPms?.syncEnabled) {
      return res.status(400).json({ 
        message: 'LobbyPMS Synchronisation ist nicht aktiviert' 
      });
    }

    const service = new LobbyPmsService(organizationId);

    let reservations;
    if (startDate && endDate) {
      // Zeitraum-basierte Abfrage
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      reservations = await service.fetchReservations(start, end);
    } else {
      // Standard: Nächste 7 Tage
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 7);
      reservations = await service.fetchReservations(start, end);
    }

    // Filtere nach Status wenn angegeben
    if (status) {
      reservations = reservations.filter(r => 
        r.status?.toLowerCase() === (status as string).toLowerCase()
      );
    }

    // Hole lokale Reservierungen für Vergleich
    const localReservations = await prisma.reservation.findMany({
      where: {
        organizationId,
        lobbyReservationId: {
          in: reservations.map(r => r.id)
        }
      }
    });

    // Kombiniere Daten
    const combinedReservations = reservations.map(lobbyRes => {
      const localRes = localReservations.find(lr => lr.lobbyReservationId === lobbyRes.id);
      return {
        ...lobbyRes,
        localId: localRes?.id,
        synced: !!localRes,
        localStatus: localRes?.status,
        localPaymentStatus: localRes?.paymentStatus,
      };
    });

    res.json({
      success: true,
      data: combinedReservations,
      count: combinedReservations.length
    });
  } catch (error) {
    console.error('Error fetching reservations:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Fehler beim Abrufen der Reservierungen'
    });
  }
};

/**
 * GET /api/lobby-pms/reservations/:id
 * Ruft Details einer spezifischen Reservierung ab
 */
export const getReservationById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = req.organizationId;

    const service = new LobbyPmsService(organizationId);
    const lobbyReservation = await service.fetchReservationById(id);

    // Hole lokale Reservierung falls vorhanden
    const localReservation = await prisma.reservation.findUnique({
      where: { lobbyReservationId: id },
      include: {
        task: true,
        syncHistory: {
          orderBy: { syncedAt: 'desc' },
          take: 10
        }
      }
    });

    res.json({
      success: true,
      data: {
        lobby: lobbyReservation,
        local: localReservation,
        synced: !!localReservation
      }
    });
  } catch (error) {
    console.error('Error fetching reservation:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Fehler beim Abrufen der Reservierung'
    });
  }
};

/**
 * POST /api/lobby-pms/sync
 * Manuelle Synchronisation von Reservierungen
 * 
 * Sync alle Branches der Organisation (wie automatischer Scheduler)
 * Mit Fallback auf Organisation-Settings
 */
export const syncReservations = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { startDate, endDate, reservationIds } = req.body;
    const organizationId = req.organizationId;

    // Wenn spezifische Reservierungen: Finde Branch über property_id
    if (reservationIds && Array.isArray(reservationIds)) {
      const { findBranchByPropertyId } = await import('../services/lobbyPmsService');
      let syncedCount = 0;
      let errors: string[] = [];
      
      // Erstelle temporären Service für fetchReservationById (ohne branchId)
      const tempService = new LobbyPmsService(organizationId);
      // Lade Settings, damit apiKey verfügbar ist
      await (tempService as any).loadSettings();
      
      for (const reservationId of reservationIds) {
        try {
          const lobbyReservation = await tempService.fetchReservationById(reservationId);
          
          // Finde Branch über property_id UND apiKey (für eindeutige Zuordnung)
          // WICHTIG: Da beide Branches die gleiche propertyId haben können, muss auch der apiKey geprüft werden
          const branchId = lobbyReservation.property_id 
            ? await findBranchByPropertyId(
                lobbyReservation.property_id, 
                (tempService as any).apiKey, // API Key aus Service
                organizationId
              )
            : null;
          
          if (!branchId) {
            errors.push(`Reservierung ${reservationId}: Keine Branch gefunden für property_id ${lobbyReservation.property_id}`);
            continue;
          }
          
          // Erstelle Service mit branchId
          const service = await LobbyPmsService.createForBranch(branchId);
          await service.syncReservation(lobbyReservation);
          syncedCount++;
        } catch (error) {
          errors.push(`Reservierung ${reservationId}: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
        }
      }
      
      return res.json({
        success: true,
        syncedCount,
        errors: errors.length > 0 ? errors : undefined
      });
    }

    // NEU: Sync alle Branches der Organisation (wie automatischer Scheduler)
    const { LobbyPmsReservationSyncService } = await import('../services/lobbyPmsReservationSyncService');

    // Hole alle Branches der Organisation
    const branches = await prisma.branch.findMany({
      where: {
        organizationId: organizationId
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            settings: true
          }
        }
      }
    });

    let totalSynced = 0;
    const branchResults: Array<{ branchId: number; branchName: string; syncedCount: number; error?: string }> = [];

    // Sync jede Branch (wie im automatischen Scheduler)
    for (const branch of branches) {
      try {
        // Prüfe ob LobbyPMS Sync aktiviert ist (gleiche Logik wie Scheduler)
        const branchSettings = branch.lobbyPmsSettings as any;
        const orgSettings = branch.organization?.settings as any;
        
        const { decryptBranchApiSettings, decryptApiSettings } = await import('../utils/encryption');
        const decryptedBranchSettings = branchSettings ? decryptBranchApiSettings(branchSettings) : null;
        const decryptedOrgSettings = orgSettings ? decryptApiSettings(orgSettings) : null;
        
        const lobbyPmsSettings = decryptedBranchSettings || decryptedOrgSettings?.lobbyPms;

        if (!lobbyPmsSettings?.apiKey) {
          branchResults.push({
            branchId: branch.id,
            branchName: branch.name,
            syncedCount: 0,
            error: 'Kein LobbyPMS API Key konfiguriert'
          });
          continue; // Kein API Key konfiguriert
        }

        if (lobbyPmsSettings.syncEnabled === false) {
          branchResults.push({
            branchId: branch.id,
            branchName: branch.name,
            syncedCount: 0,
            error: 'LobbyPMS Sync ist deaktiviert'
          });
          continue; // Sync deaktiviert
        }

        // Synchronisiere Reservierungen für diesen Branch
        const syncStartDate = startDate ? new Date(startDate) : undefined;
        const syncEndDate = endDate ? new Date(endDate) : undefined;
        
        const syncedCount = await LobbyPmsReservationSyncService.syncReservationsForBranch(
          branch.id,
          syncStartDate,
          syncEndDate
        );
        
        totalSynced += syncedCount;
        branchResults.push({
          branchId: branch.id,
          branchName: branch.name,
          syncedCount: syncedCount
        });
      } catch (error) {
        branchResults.push({
          branchId: branch.id,
          branchName: branch.name,
          syncedCount: 0,
          error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
        // Weiter mit nächster Branch
      }
    }

    res.json({
      success: true,
      syncedCount: totalSynced,
      branchResults: branchResults,
      errors: branchResults.filter(r => r.error).map(r => `${r.branchName}: ${r.error}`)
    });
  } catch (error) {
    console.error('Error syncing reservations:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Fehler beim Synchronisieren der Reservierungen'
    });
  }
};

/**
 * PUT /api/lobby-pms/reservations/:id/check-in
 * Führt Check-in durch (aktualisiert Status in LobbyPMS und lokal)
 */
export const checkInReservation = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = req.organizationId;

    // Hole lokale Reservierung
    const localReservation = await prisma.reservation.findUnique({
      where: { lobbyReservationId: id },
      include: { task: true, branch: true }
    });

    if (!localReservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservierung nicht gefunden'
      });
    }

    // Aktualisiere Status in LobbyPMS
    const service = localReservation.branchId
      ? await LobbyPmsService.createForBranch(localReservation.branchId)
      : new LobbyPmsService(organizationId);
    await service.updateReservationStatus(id, 'checked_in');

    // Aktualisiere lokale Reservierung
    const updatedReservation = await prisma.reservation.update({
      where: { id: localReservation.id },
      data: {
        status: 'checked_in' as any,
        onlineCheckInCompleted: true,
        onlineCheckInCompletedAt: new Date()
      },
      include: { branch: true }
    });

      // Aktualisiere verknüpften Task falls vorhanden
      const userId = parseInt(req.userId);
      await ReservationTaskService.completeTaskOnCheckIn(localReservation.id, userId);

      // Sende Check-in-Bestätigung
      try {
        await ReservationNotificationService.sendCheckInConfirmation(localReservation.id);
      } catch (error) {
        console.error('Fehler beim Versenden der Check-in-Bestätigung:', error);
        // Fehler nicht weiterwerfen, da Bestätigung optional ist
      }

      res.json({
        success: true,
        data: updatedReservation
      });
  } catch (error) {
    console.error('Error checking in reservation:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Fehler beim Check-in'
    });
  }
};

/**
 * POST /api/lobby-pms/webhook
 * Empfängt Webhooks von LobbyPMS
 * 
 * Webhook-Events können sein:
 * - reservation.created
 * - reservation.updated
 * - reservation.status_changed
 * - reservation.cancelled
 */
export const handleWebhook = async (req: Request, res: Response) => {
  try {
    const { event, data } = req.body;

    // Validiere Webhook-Secret (falls konfiguriert)
    // TODO: Implementiere Webhook-Secret-Validierung

    console.log(`[LobbyPMS Webhook] Event: ${event}`, data);

    // Bestimme Organisation aus Webhook-Daten
    // TODO: Wie identifizieren wir die Organisation aus dem Webhook?
    // Mögliche Ansätze:
    // 1. Property ID im Webhook
    // 2. Webhook-Secret pro Organisation
    // 3. Custom Header

    // Für jetzt: Suche nach Organisation mit passender Property ID
    const propertyId = data?.property_id;
    if (!propertyId) {
      return res.status(400).json({
        success: false,
        message: 'Property ID fehlt im Webhook'
      });
    }

    const organization = await prisma.organization.findFirst({
      where: {
        settings: {
          path: ['lobbyPms', 'propertyId'],
          equals: propertyId
        }
      }
    });

    if (!organization) {
      console.warn(`[LobbyPMS Webhook] Organisation nicht gefunden für Property ID: ${propertyId}`);
      return res.status(404).json({
        success: false,
        message: 'Organisation nicht gefunden'
      });
    }

    // Finde Branch über property_id UND apiKey (für eindeutige Zuordnung)
    // WICHTIG: Da beide Branches die gleiche propertyId haben können, muss auch der apiKey geprüft werden
    const { findBranchByPropertyId } = await import('../services/lobbyPmsService');
    const tempService = new LobbyPmsService(organization.id);
    // Lade Settings, damit apiKey verfügbar ist
    await (tempService as any).loadSettings();
    const branchId = await findBranchByPropertyId(
      propertyId, 
      (tempService as any).apiKey, // API Key aus Service
      organization.id
    );
    
    if (!branchId) {
      console.warn(`[LobbyPMS Webhook] Keine Branch gefunden für Property ID: ${propertyId}`);
      return res.status(404).json({
        success: false,
        message: 'Branch nicht gefunden'
      });
    }

    // Erstelle Service mit branchId
    const service = await LobbyPmsService.createForBranch(branchId);

    // Verarbeite Webhook-Event
    switch (event) {
      case 'reservation.created':
      case 'reservation.updated':
        if (data?.id) {
          await service.syncReservation(data);
        }
        break;

      case 'reservation.status_changed':
        case 'reservation.checked_in':
        if (data?.id) {
          await service.updateReservationStatus(data.id, data.status || 'checked_in');
          // Aktualisiere lokale Reservierung
          const localReservation = await prisma.reservation.findUnique({
            where: { lobbyReservationId: data.id }
          });
          if (localReservation) {
            await prisma.reservation.update({
              where: { id: localReservation.id },
              data: {
                status: data.status === 'checked_in' ? 'checked_in' : localReservation.status,
                onlineCheckInCompleted: data.status === 'checked_in',
                onlineCheckInCompletedAt: data.status === 'checked_in' ? new Date() : null
              }
            });
          }
        }
        break;

      default:
        console.log(`[LobbyPMS Webhook] Unbekanntes Event: ${event}`);
    }

    // Bestätige Webhook-Empfang
    res.json({ success: true, message: 'Webhook verarbeitet' });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Fehler beim Verarbeiten des Webhooks'
    });
  }
};

/**
 * GET /api/lobby-pms/validate
 * Validiert die LobbyPMS API-Verbindung
 */
export const validateConnection = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.organizationId;
    const service = new LobbyPmsService(organizationId);
    const isValid = await service.validateConnection();

    res.json({
      success: isValid,
      message: isValid ? 'Verbindung erfolgreich' : 'Verbindung fehlgeschlagen'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Fehler bei der Validierung'
    });
  }
};



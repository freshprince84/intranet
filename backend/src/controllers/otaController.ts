import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { OTARateShoppingService } from '../services/otaRateShoppingService';
import { OTADiscoveryService } from '../services/otaDiscoveryService';
import { LobbyPmsService } from '../services/lobbyPmsService';
import { createNotificationIfEnabled } from './notificationController';
import { NotificationType } from '@prisma/client';
import { getPriceAnalysisNotificationText, getUserLanguage } from '../utils/translations';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prisma';

/**
 * Controller für OTA Rate Shopping
 */
export const otaController = {
  /**
   * Ruft OTA-Listings ab
   * GET /api/ota/listings
   */
  getListings: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const branchId = req.query.branchId 
        ? parseInt(req.query.branchId as string, 10) 
        : undefined;

      if (!branchId) {
        return res.status(400).json({ 
          message: 'branchId ist erforderlich' 
        });
      }

      const listings = await OTARateShoppingService.getListings(branchId);

      res.json(listings);
    } catch (error: any) {
      logger.error('Fehler beim Abrufen der OTA-Listings:', error);
      res.status(500).json({ 
        message: 'Fehler beim Abrufen der OTA-Listings',
        error: error.message 
      });
    }
  },

  /**
   * Führt Rate Shopping durch
   * POST /api/ota/rate-shopping
   */
  runRateShopping: async (req: AuthenticatedRequest, res: Response) => {
    logger.warn('[OTA Controller] ⚡ runRateShopping aufgerufen');
    try {
      const { branchId, platform, startDate, endDate } = req.body;
      logger.warn(`[OTA Controller] 📋 Request Body:`, JSON.stringify({ branchId, platform, startDate, endDate }));

      if (!branchId || !platform || !startDate || !endDate) {
        logger.warn('[OTA Controller] ❌ Fehlende Parameter:', JSON.stringify({ branchId, platform, startDate, endDate }));
        return res.status(400).json({ 
          message: 'branchId, platform, startDate und endDate sind erforderlich' 
        });
      }

      logger.warn(`[OTA Controller] 🔄 Rufe OTARateShoppingService.runRateShopping auf...`);
      const jobId = await OTARateShoppingService.runRateShopping(
        branchId,
        platform,
        new Date(startDate),
        new Date(endDate)
      );
      logger.warn(`[OTA Controller] ✅ Job erstellt mit ID: ${jobId}`);

      // Notification erstellen (wird später bei Job-Abschluss aktualisiert)
      const userId = req.userId ? parseInt(req.userId, 10) : undefined;
      if (userId) {
        try {
          const language = await getUserLanguage(userId);
          const notificationText = getPriceAnalysisNotificationText(
            language,
            'rateShoppingCompleted',
            platform
          );
          
          // Notification wird später bei Job-Abschluss/Fehler aktualisiert
          // Hier nur als Info-Notification
          await createNotificationIfEnabled({
            userId,
            title: 'Rate Shopping gestartet',
            message: `Rate Shopping für ${platform} wurde gestartet.`,
            type: NotificationType.system,
            relatedEntityId: jobId,
            relatedEntityType: 'started'
          });
        } catch (error) {
          logger.error('Fehler beim Erstellen der Notification:', error);
        }
      }

      res.json({
        success: true,
        jobId,
        message: 'Rate Shopping Job wurde erstellt'
      });
    } catch (error: any) {
      logger.error('Fehler beim Erstellen des Rate Shopping Jobs:', error);
      res.status(500).json({ 
        message: 'Fehler beim Erstellen des Rate Shopping Jobs',
        error: error.message 
      });
    }
  },

  /**
   * Discovere Konkurrenz-Listings auf OTA-Plattformen
   * POST /api/price-analysis/ota/discover
   */
  discoverListings: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { branchId, platform, roomType } = req.body;
      
      if (!branchId || !platform) {
        return res.status(400).json({ 
          message: 'branchId und platform sind erforderlich' 
        });
      }

      // 1. Hole Branch mit Adress-Informationen
      const branch = await prisma.branch.findUnique({
        where: { id: branchId },
        select: { 
          city: true, 
          country: true, 
          name: true,
          organizationId: true
        }
      });

      if (!branch) {
        return res.status(404).json({ message: 'Branch nicht gefunden' });
      }

      if (!branch.city) {
        return res.status(400).json({ 
          message: 'Branch hat keine Stadt konfiguriert. Bitte Adress-Informationen in Branch-Einstellungen hinzufügen.' 
        });
      }

      // 2. Hole eigene Zimmer-Typen aus LobbyPMS (falls roomType nicht explizit angegeben)
      let roomTypesToDiscover: ('private' | 'dorm')[] = [];
      
      if (roomType) {
        // Manuelles Testen: Nur einen Zimmertyp discoveren
        roomTypesToDiscover = [roomType];
      } else {
        // Automatisch: Alle eigenen Zimmertypen discoveren
        const lobbyPmsService = await LobbyPmsService.createForBranch(branchId);
        const ownRooms = await lobbyPmsService.checkAvailability(
          new Date(), 
          new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // Nächste 90 Tage
        );
        const uniqueRoomTypes = [...new Set(ownRooms.map(r => 
          r.roomType === 'compartida' ? 'dorm' : 'private'
        ))];
        roomTypesToDiscover = uniqueRoomTypes as ('private' | 'dorm')[];
      }

      if (roomTypesToDiscover.length === 0) {
        return res.status(400).json({ 
          message: 'Keine eigenen Zimmer-Typen gefunden. Bitte zuerst Reservierungen aus LobbyPMS importieren.' 
        });
      }

      // 3. Discovere Listings für jeden Zimmertyp
      let totalListingsFound = 0;
      const results: Array<{ roomType: string; listingsFound: number }> = [];

      for (const rt of roomTypesToDiscover) {
        const discovered = await OTADiscoveryService.discoverListings(
          branch.city,
          branch.country,
          rt,
          platform
        );

        // 4. Speichere gefundene Listings
        let savedCount = 0;
        for (const listing of discovered) {
          try {
            await prisma.oTAListing.upsert({
              where: {
                platform_listingId_city: {
                  platform: listing.platform,
                  listingId: listing.listingId,
                  city: listing.city
                }
              },
              update: {
                listingUrl: listing.listingUrl,
                roomName: listing.roomName,
                lastScrapedAt: new Date(),
                isActive: true
              },
              create: {
                platform: listing.platform,
                listingId: listing.listingId,
                listingUrl: listing.listingUrl,
                city: listing.city,
                country: listing.country,
                roomType: listing.roomType,
                roomName: listing.roomName,
                branchId: branchId, // Optional: Für Filterung
                isActive: true,
                discoveredAt: new Date()
              }
            });
            savedCount++;
          } catch (error: any) {
            logger.error(`Fehler beim Speichern eines Listings:`, error.message);
          }
        }

        totalListingsFound += savedCount;
        results.push({ roomType: rt, listingsFound: savedCount });
      }

      res.json({
        success: true,
        listingsFound: totalListingsFound,
        results: results,
        city: branch.city,
        country: branch.country
      });
    } catch (error: any) {
      logger.error('Fehler beim Discoveren von OTA-Listings:', error);
      res.status(500).json({ 
        message: 'Fehler beim Discoveren von OTA-Listings',
        error: error.message 
      });
    }
  }
};


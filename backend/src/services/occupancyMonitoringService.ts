import { LobbyPmsService } from './lobbyPmsService';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { createNotificationIfEnabled } from '../controllers/notificationController';
import { NotificationType } from '@prisma/client';
import { getPriceAnalysisNotificationText, getUserLanguage } from '../utils/translations';

/**
 * Service für Occupancy-Monitoring
 * 
 * Überwacht schnelle Occupancy-Änderungen und erstellt Alerts/To-Dos bei kritischen Änderungen
 */
export class OccupancyMonitoringService {
  /**
   * Prüft Occupancy-Änderungen für einen Branch
   * 
   * Vergleicht aktuelle Occupancy mit vorherigen Werten und erstellt Alerts bei schnellen Änderungen
   * 
   * @param branchId - Branch-ID
   * @param daysAhead - Anzahl Tage im Voraus zu prüfen (default: 30)
   * @param thresholdPercent - Schwellenwert für schnelle Änderung in Prozent (default: 20%)
   */
  static async checkOccupancyChanges(
    branchId: number,
    daysAhead: number = 30,
    thresholdPercent: number = 20
  ): Promise<number> {
    try {
      logger.log(`[OccupancyMonitoring] Prüfe Occupancy-Änderungen für Branch ${branchId} (${daysAhead} Tage im Voraus)`);

      // Lade Branch
      const branch = await prisma.branch.findUnique({
        where: { id: branchId },
        select: {
          id: true,
          name: true,
          organizationId: true
        }
      });

      if (!branch) {
        throw new Error(`Branch ${branchId} nicht gefunden`);
      }

      // Hole aktuelle Occupancy-Daten aus LobbyPMS
      const lobbyPmsService = await LobbyPmsService.createForBranch(branchId);
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + daysAhead);
      endDate.setHours(23, 59, 59, 999);

      const currentAvailability = await lobbyPmsService.checkAvailability(startDate, endDate);

      // Hole historische Occupancy-Daten aus PriceAnalysis (falls vorhanden)
      // Oder verwende letzte Analyse als Vergleich
      const historicalAnalyses = await prisma.priceAnalysis.findMany({
        where: {
          branchId: branch.id,
          analysisDate: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Letzte 7 Tage
          }
        },
        select: {
          analysisDate: true,
          categoryId: true,
          roomType: true,
          occupancyRate: true
        },
        orderBy: {
          analysisDate: 'desc'
        }
      });

      // Gruppiere aktuelle Daten nach roomType und Datum
      // WICHTIG: Bei Privatzimmern (privada) werden ALLE Kategorien zusammen betrachtet
      // Bei Dorms (compartida) wird jede Kategorie einzeln betrachtet
      const currentDataMap = new Map<string, {
        categoryId: number | null; // null für gruppierte Privatzimmer
        date: string;
        availableRooms: number;
        totalRooms: number;
        occupancyRate: number;
        roomType: 'compartida' | 'privada';
        roomName?: string; // Für Dorms: Kategorie-Name, für Privates: "Privatzimmer"
      }>();

      // Schritt 1: Berechne totalRooms
      // Für Dorms: pro Kategorie (Maximum über Zeitraum)
      // Für Privates: Maximum pro Kategorie über Zeitraum, dann Summe aller Maxima
      const dormTotalRoomsMap = new Map<number, number>(); // Für Dorms: categoryId -> max totalRooms
      const privateCategoryMaxMap = new Map<number, number>(); // Für Privates: categoryId -> max totalRooms (über Zeitraum)

      for (const entry of currentAvailability) {
        if (entry.roomType === 'compartida') {
          // Dorm: Maximum pro Kategorie über Zeitraum
          const currentTotal = dormTotalRoomsMap.get(entry.categoryId) || 0;
          dormTotalRoomsMap.set(entry.categoryId, Math.max(currentTotal, entry.availableRooms));
        } else {
          // Privatzimmer: Maximum pro Kategorie über Zeitraum
          const currentTotal = privateCategoryMaxMap.get(entry.categoryId) || 0;
          privateCategoryMaxMap.set(entry.categoryId, Math.max(currentTotal, entry.availableRooms));
        }
      }

      // Berechne Gesamtzahl aller Privatzimmer (Summe aller Maxima)
      const totalPrivateRooms = Array.from(privateCategoryMaxMap.values()).reduce((sum, max) => sum + max, 0);

      // Schritt 2: Gruppiere Daten und berechne Occupancy-Rate
      // Für Dorms: pro Kategorie und Datum
      // Für Privates: alle Kategorien zusammen pro Datum
      const privateDataByDate = new Map<string, {
        availableRooms: number;
        totalRooms: number;
        categoryIds: number[];
      }>();

      for (const entry of currentAvailability) {
        if (entry.roomType === 'compartida') {
          // Dorm: pro Kategorie
          const key = `compartida-${entry.categoryId}-${entry.date}`;
          const totalRooms = dormTotalRoomsMap.get(entry.categoryId) || 1;
          const occupancyRate = totalRooms > 0 
            ? ((totalRooms - entry.availableRooms) / totalRooms) * 100 
            : 0;

          currentDataMap.set(key, {
            categoryId: entry.categoryId,
            date: entry.date,
            availableRooms: entry.availableRooms,
            totalRooms,
            occupancyRate,
            roomType: 'compartida',
            roomName: entry.roomName
          });
        } else {
          // Privatzimmer: sammle alle zusammen pro Datum
          const existing = privateDataByDate.get(entry.date);
          if (existing) {
            existing.availableRooms += entry.availableRooms;
            existing.categoryIds.push(entry.categoryId);
          } else {
            privateDataByDate.set(entry.date, {
              availableRooms: entry.availableRooms,
              totalRooms: 0, // Wird später gesetzt
              categoryIds: [entry.categoryId]
            });
          }
        }
      }

      // Schritt 3: Berechne Occupancy-Rate für gruppierte Privatzimmer
      // Verwende Gesamtzahl aller Privatzimmer (Summe aller Maxima) für alle Daten
      for (const [date, data] of privateDataByDate.entries()) {
        data.totalRooms = totalPrivateRooms;
        const occupancyRate = totalPrivateRooms > 0 
          ? ((totalPrivateRooms - data.availableRooms) / totalPrivateRooms) * 100 
          : 0;

        const key = `privada-${date}`;
        currentDataMap.set(key, {
          categoryId: null, // null = alle Privatzimmer zusammen
          date,
          availableRooms: data.availableRooms,
          totalRooms: totalPrivateRooms,
          occupancyRate,
          roomType: 'privada',
          roomName: 'Privatzimmer'
        });
      }

      // Vergleiche mit historischen Daten
      // WICHTIG: Bei Privatzimmern müssen historische Daten ebenfalls gruppiert werden
      let alertCount = 0;
      const alerts: Array<{
        date: string;
        categoryId: number | null;
        roomType: 'compartida' | 'privada';
        currentOccupancy: number;
        previousOccupancy: number;
        changePercent: number;
        roomName?: string;
      }> = [];

      // Gruppiere historische Daten für Privatzimmer (alle zusammen pro Datum)
      const historicalPrivateByDate = new Map<string, {
        occupancyRate: number;
        count: number;
      }>();

      for (const h of historicalAnalyses) {
        if (h.roomType === 'privada' && h.occupancyRate !== null) {
          const dateKey = new Date(h.analysisDate).toISOString().split('T')[0];
          const existing = historicalPrivateByDate.get(dateKey);
          if (existing) {
            // Durchschnitt der Occupancy-Rates für alle Privatzimmer an diesem Tag
            existing.occupancyRate = (existing.occupancyRate * existing.count + Number(h.occupancyRate)) / (existing.count + 1);
            existing.count += 1;
          } else {
            historicalPrivateByDate.set(dateKey, {
              occupancyRate: Number(h.occupancyRate),
              count: 1
            });
          }
        }
      }

      for (const [key, current] of currentDataMap.entries()) {
        let historicalOccupancy: number | null = null;

        if (current.roomType === 'compartida') {
          // Dorm: Finde historische Daten für gleiche Kategorie und ähnliches Datum (±1 Tag)
          const historical = historicalAnalyses.find(h => {
            if (h.roomType !== 'compartida' || h.categoryId !== current.categoryId) return false;
            const hDate = new Date(h.analysisDate);
            const cDate = new Date(current.date);
            const daysDiff = Math.abs((hDate.getTime() - cDate.getTime()) / (1000 * 60 * 60 * 24));
            return daysDiff <= 1;
          });

          if (historical && historical.occupancyRate !== null) {
            historicalOccupancy = Number(historical.occupancyRate);
          }
        } else {
          // Privatzimmer: Finde gruppierte historische Daten für ähnliches Datum (±1 Tag)
          const cDate = new Date(current.date);
          for (const [hDateKey, hData] of historicalPrivateByDate.entries()) {
            const hDate = new Date(hDateKey);
            const daysDiff = Math.abs((hDate.getTime() - cDate.getTime()) / (1000 * 60 * 60 * 24));
            if (daysDiff <= 1) {
              historicalOccupancy = hData.occupancyRate;
              break;
            }
          }
        }

        if (historicalOccupancy !== null) {
          const changePercent = Math.abs(current.occupancyRate - historicalOccupancy);
          
          // Prüfe ob Änderung über Schwellenwert liegt
          if (changePercent >= thresholdPercent) {
            alerts.push({
              date: current.date,
              categoryId: current.categoryId,
              roomType: current.roomType,
              currentOccupancy: current.occupancyRate,
              previousOccupancy: historicalOccupancy,
              changePercent,
              roomName: current.roomName
            });
            alertCount++;
          }
        }
      }

      // Erstelle Notifications/To-Dos für kritische Änderungen
      if (alerts.length > 0) {
        logger.log(`[OccupancyMonitoring] Branch ${branchId}: ${alerts.length} kritische Occupancy-Änderungen erkannt`);

        // Erstelle Notification für alle User der Organisation mit Rezeption-relevanten Rollen
        // Suche nach Rollen mit Namen wie "Admin", "Reception", "Manager" etc.
        const receptionUsers = await prisma.user.findMany({
          where: {
            roles: {
              some: {
                role: {
                  organizationId: branch.organizationId,
                  name: {
                    in: ['Admin', 'Reception', 'Manager', 'Owner']
                  }
                }
              }
            }
          },
          select: {
            id: true
          }
        });

        for (const user of receptionUsers) {
          const language = await getUserLanguage(user.id);
          const alertText = alerts.slice(0, 5).map(a => 
            `${new Date(a.date).toLocaleDateString()}: ${a.changePercent.toFixed(1)}% Änderung (${a.previousOccupancy.toFixed(1)}% → ${a.currentOccupancy.toFixed(1)}%)`
          ).join('\n');

          const notificationText = getPriceAnalysisNotificationText(
            language,
            'occupancyAlert',
            {
              branchName: branch.name,
              alertCount: alerts.length,
              details: alertText
            }
          );

          await createNotificationIfEnabled({
            userId: user.id,
            type: NotificationType.system,
            title: notificationText.title,
            message: notificationText.message,
            relatedEntityType: 'price_analysis',
            relatedEntityId: branch.id
          });
        }

        // Erstelle To-Do für kritischste Änderung
        const criticalAlert = alerts.sort((a, b) => b.changePercent - a.changePercent)[0];
        
        // Bestimme Anzeige-Name
        let displayName: string;
        if (criticalAlert.roomType === 'privada') {
          // Privatzimmer: Verwende "Privatzimmer" statt einzelner Kategorie
          displayName = 'Privatzimmer';
        } else {
          // Dorm: Finde Kategorie-Name aus currentAvailability
          const categoryInfo = currentAvailability.find(a => 
            a.categoryId === criticalAlert.categoryId && a.date === criticalAlert.date
          );
          displayName = categoryInfo?.roomName || `Dorm (Kategorie ${criticalAlert.categoryId})`;
        }

        // Erstelle To-Do für ersten Rezeption-User
        if (receptionUsers.length > 0) {
          const firstUser = receptionUsers[0];
          await prisma.task.create({
            data: {
              title: `Occupancy-Alert: ${displayName} - ${criticalAlert.changePercent.toFixed(1)}% Änderung`,
              description: `${criticalAlert.roomType === 'privada' ? 'Alle Privatzimmer' : 'Kategorie'}: ${displayName}\nDatum: ${new Date(criticalAlert.date).toLocaleDateString()}\nÄnderung: ${criticalAlert.previousOccupancy.toFixed(1)}% → ${criticalAlert.currentOccupancy.toFixed(1)}%\n\nBitte Preise prüfen und ggf. anpassen.`,
              status: 'open',
              responsibleId: firstUser.id,
              qualityControlId: firstUser.id,
              organizationId: branch.organizationId,
              branchId: branch.id,
              dueDate: new Date(criticalAlert.date)
            }
          });
          logger.log(`[OccupancyMonitoring] To-Do erstellt für kritische Occupancy-Änderung: ${displayName}`);
        }
      }

      logger.log(`[OccupancyMonitoring] Branch ${branchId}: ${alertCount} Alerts erstellt`);

      return alertCount;
    } catch (error) {
      logger.error(`[OccupancyMonitoring] Fehler beim Prüfen der Occupancy-Änderungen für Branch ${branchId}:`, error);
      throw error;
    }
  }

  /**
   * Prüft alle Branches mit LobbyPMS-Integration
   */
  static async checkAllBranches(): Promise<void> {
    try {
      logger.log('[OccupancyMonitoring] Starte Occupancy-Prüfung für alle Branches');

      // Hole alle Branches mit LobbyPMS-Integration
      const branches = await prisma.branch.findMany({
        where: {
          lobbyPmsSettings: {
            not: null
          }
        },
        select: {
          id: true,
          name: true
        }
      });

      if (branches.length === 0) {
        logger.log('[OccupancyMonitoring] Keine Branches mit LobbyPMS-Integration gefunden');
        return;
      }

      logger.log(`[OccupancyMonitoring] Gefunden: ${branches.length} Branch(es) mit LobbyPMS-Integration`);

      for (const branch of branches) {
        try {
          await this.checkOccupancyChanges(branch.id, 30, 20); // 30 Tage, 20% Schwellenwert
        } catch (error) {
          logger.error(`[OccupancyMonitoring] Fehler bei Branch ${branch.id}:`, error);
        }
      }

      logger.log('[OccupancyMonitoring] Occupancy-Prüfung für alle Branches abgeschlossen');
    } catch (error) {
      logger.error('[OccupancyMonitoring] Fehler beim Prüfen aller Branches:', error);
    }
  }
}


import { Reservation } from '@prisma/client';
import { createHash } from 'crypto';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

/**
 * Service für die Gruppierung zusammenhängender Reservationen
 * 
 * Gruppiert Reservationen basierend auf:
 * - Gleichem Check-in/Check-out Datum
 * - Gleichen Kontaktdaten (Email UND/ODER Telefon - exakte Übereinstimmung)
 * - Gleicher Branch
 */
export class ReservationGroupingService {
  
  /**
   * Berechnet den Gruppen-Identifier für eine Reservation
   * 
   * Der Identifier basiert auf:
   * - checkInDate (nur Datum, ohne Zeit)
   * - checkOutDate (nur Datum, ohne Zeit)
   * - Kontaktdaten (Email oder Telefon, exakt)
   * - branchId (Reservationen werden nur innerhalb derselben Branch gruppiert)
   * 
   * @param reservation - Reservation-Daten
   * @returns Gruppen-Identifier (SHA256 Hash) oder null wenn keine Kontaktdaten vorhanden
   */
  static calculateGroupId(reservation: {
    checkInDate: Date;
    checkOutDate: Date;
    guestEmail?: string | null;
    guestPhone?: string | null;
    branchId?: number | null;
  }): string | null {
    // Ohne Kontaktdaten keine Gruppierung möglich
    if (!reservation.guestEmail && !reservation.guestPhone) {
      return null;
    }

    // Datum normalisieren (nur Datum, ohne Zeit)
    const checkInStr = new Date(reservation.checkInDate).toISOString().split('T')[0];
    const checkOutStr = new Date(reservation.checkOutDate).toISOString().split('T')[0];
    
    // Kontaktdaten normalisieren
    // Priorität: Email + Telefon > nur Email > nur Telefon
    const email = reservation.guestEmail?.toLowerCase().trim() || '';
    const phone = reservation.guestPhone?.replace(/[\s\-\(\)]/g, '').trim() || '';
    
    // Branch-ID für Gruppierung innerhalb derselben Branch
    const branchId = reservation.branchId?.toString() || '0';
    
    // Erzeuge eindeutigen Identifier
    // Format: checkIn|checkOut|email|phone|branchId
    const identifier = `${checkInStr}|${checkOutStr}|${email}|${phone}|${branchId}`;
    
    // SHA256 Hash für kompakten Identifier
    const hash = createHash('sha256').update(identifier).digest('hex').substring(0, 32);
    
    return hash;
  }

  /**
   * Findet alle Reservationen mit gleichem Gruppen-Identifier
   * 
   * @param reservationGroupId - Gruppen-Identifier
   * @returns Array von Reservationen, sortiert nach createdAt (älteste zuerst)
   */
  static async findGroupMembers(reservationGroupId: string): Promise<Reservation[]> {
    if (!reservationGroupId) {
      return [];
    }

    return prisma.reservation.findMany({
      where: { reservationGroupId },
      orderBy: { createdAt: 'asc' }
    });
  }

  /**
   * Aktualisiert den Primär-Status für eine Gruppe
   * 
   * Die älteste Reservation (nach createdAt) wird zur primären Reservation
   * Nur die primäre Reservation erhält die Mitteilung
   * 
   * @param reservationGroupId - Gruppen-Identifier
   * @returns Anzahl der aktualisierten Reservationen
   */
  static async updateGroupPrimaryStatus(reservationGroupId: string): Promise<number> {
    if (!reservationGroupId) {
      return 0;
    }

    const members = await this.findGroupMembers(reservationGroupId);
    
    if (members.length === 0) {
      return 0;
    }

    // Erste (älteste) Reservation ist primär
    const primaryId = members[0].id;
    
    let updatedCount = 0;
    
    for (const member of members) {
      const shouldBePrimary = member.id === primaryId;
      
      // Nur aktualisieren wenn sich Status ändert
      if (member.isPrimaryInGroup !== shouldBePrimary) {
        await prisma.reservation.update({
          where: { id: member.id },
          data: { isPrimaryInGroup: shouldBePrimary }
        });
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      logger.log(`[ReservationGrouping] Gruppe ${reservationGroupId}: ${members.length} Mitglieder, primär: ${primaryId}`);
    }

    return updatedCount;
  }

  /**
   * Weist eine Reservation einer Gruppe zu und aktualisiert den Primär-Status
   * 
   * @param reservation - Reservation (mindestens id, checkInDate, checkOutDate, guestEmail, guestPhone, branchId)
   * @returns Aktualisierte Reservation mit reservationGroupId und isPrimaryInGroup
   */
  static async assignToGroup(reservation: Reservation): Promise<Reservation> {
    const groupId = this.calculateGroupId({
      checkInDate: reservation.checkInDate,
      checkOutDate: reservation.checkOutDate,
      guestEmail: reservation.guestEmail,
      guestPhone: reservation.guestPhone,
      branchId: reservation.branchId
    });

    if (!groupId) {
      // Keine Gruppierung möglich - Reservation bleibt primär
      logger.log(`[ReservationGrouping] Reservation ${reservation.id}: Keine Kontaktdaten, keine Gruppierung`);
      return reservation;
    }

    // Prüfe ob bereits andere Reservationen in dieser Gruppe existieren
    const existingMembers = await prisma.reservation.findMany({
      where: {
        reservationGroupId: groupId,
        id: { not: reservation.id } // Nicht die aktuelle Reservation
      },
      orderBy: { createdAt: 'asc' }
    });

    // Bestimme ob diese Reservation primär sein soll
    // Primär = keine anderen Mitglieder ODER älteste Reservation
    let isPrimary = existingMembers.length === 0;
    
    if (!isPrimary && existingMembers.length > 0) {
      // Prüfe ob aktuelle Reservation älter ist als alle anderen
      const oldestExisting = existingMembers[0];
      isPrimary = reservation.createdAt < oldestExisting.createdAt;
    }

    // Aktualisiere die Reservation
    const updated = await prisma.reservation.update({
      where: { id: reservation.id },
      data: {
        reservationGroupId: groupId,
        isPrimaryInGroup: isPrimary
      }
    });

    // Wenn diese Reservation primär wird, müssen andere auf nicht-primär gesetzt werden
    if (isPrimary && existingMembers.length > 0) {
      await prisma.reservation.updateMany({
        where: {
          reservationGroupId: groupId,
          id: { not: reservation.id }
        },
        data: { isPrimaryInGroup: false }
      });
      
      logger.log(`[ReservationGrouping] Reservation ${reservation.id} ist neue primäre Reservation für Gruppe ${groupId} (${existingMembers.length + 1} Mitglieder)`);
    } else if (!isPrimary) {
      logger.log(`[ReservationGrouping] Reservation ${reservation.id} zur Gruppe ${groupId} hinzugefügt (nicht primär, ${existingMembers.length + 1} Mitglieder)`);
    } else {
      logger.log(`[ReservationGrouping] Reservation ${reservation.id} ist erste in Gruppe ${groupId}`);
    }

    return updated;
  }

  /**
   * Migriert bestehende Reservationen und weist sie Gruppen zu
   * 
   * Verarbeitet nur Reservationen mit Check-in heute oder in der Zukunft
   * 
   * @param branchId - Optional: Nur Reservationen dieser Branch migrieren
   * @returns Anzahl der migrierten Reservationen
   */
  static async migrateExistingReservations(branchId?: number): Promise<{ processed: number; grouped: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const whereClause: any = {
      checkInDate: { gte: today },
      reservationGroupId: null // Nur Reservationen ohne Gruppe
    };

    if (branchId) {
      whereClause.branchId = branchId;
    }

    const reservations = await prisma.reservation.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' }
    });

    logger.log(`[ReservationGrouping] Migriere ${reservations.length} bestehende Reservationen...`);

    let groupedCount = 0;

    for (const reservation of reservations) {
      const groupId = this.calculateGroupId({
        checkInDate: reservation.checkInDate,
        checkOutDate: reservation.checkOutDate,
        guestEmail: reservation.guestEmail,
        guestPhone: reservation.guestPhone,
        branchId: reservation.branchId
      });

      if (groupId) {
        await this.assignToGroup(reservation);
        groupedCount++;
      }
    }

    logger.log(`[ReservationGrouping] Migration abgeschlossen: ${reservations.length} verarbeitet, ${groupedCount} gruppiert`);

    return { processed: reservations.length, grouped: groupedCount };
  }

  /**
   * Berechnet den Gesamtbetrag aller Reservationen einer Gruppe
   * 
   * @param reservationGroupId - Gruppen-Identifier
   * @returns Gesamtbetrag und Währung
   */
  static async calculateGroupTotal(reservationGroupId: string): Promise<{ total: number; currency: string; count: number }> {
    const members = await this.findGroupMembers(reservationGroupId);
    
    if (members.length === 0) {
      return { total: 0, currency: 'COP', count: 0 };
    }

    // Währung von der ersten Reservation (alle sollten gleich sein)
    const currency = members[0].currency || 'COP';
    
    const total = members.reduce((sum, r) => sum + Number(r.amount || 0), 0);

    return { total, currency, count: members.length };
  }
}


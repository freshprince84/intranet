import { prisma } from '../utils/prisma';

/**
 * Berechnet Kommission für eine Tour-Buchung
 * 
 * Logik:
 * - Liest tour.totalCommission oder tour.totalCommissionPercent
 * - Liest tour.sellerCommissionPercent oder tour.sellerCommissionFixed
 * - Berechnet: sellerCommission = (totalCommission * sellerCommissionPercent / 100) ODER sellerCommission = sellerCommissionFixed
 * - Speichert in booking.commissionAmount
 */
export async function calculateCommission(bookingId: number): Promise<number> {
  const booking = await prisma.tourBooking.findUnique({
    where: { id: bookingId },
    include: {
      tour: true
    }
  });

  if (!booking) {
    throw new Error(`Buchung ${bookingId} nicht gefunden`);
  }

  const tour = booking.tour;
  let totalCommission: number = 0;

  // Berechne Gesamtkommission
  if (tour.totalCommission) {
    // Fixe Zahl
    totalCommission = Number(tour.totalCommission);
  } else if (tour.totalCommissionPercent && booking.totalPrice) {
    // Prozent vom Gesamtpreis
    totalCommission = Number(booking.totalPrice) * Number(tour.totalCommissionPercent) / 100;
  }

  // Berechne Verkäufer-Kommission
  let sellerCommission: number = 0;

  if (tour.sellerCommissionFixed) {
    // Fixe Zahl
    sellerCommission = Number(tour.sellerCommissionFixed);
  } else if (tour.sellerCommissionPercent && totalCommission > 0) {
    // Prozent von Gesamtkommission
    sellerCommission = totalCommission * Number(tour.sellerCommissionPercent) / 100;
  }

  // Speichere Kommission
  await prisma.tourBooking.update({
    where: { id: bookingId },
    data: {
      commissionAmount: sellerCommission,
      commissionCalculatedAt: new Date()
    }
  });

  return sellerCommission;
}

/**
 * Holt Kommissionen eines Mitarbeiters
 */
export async function getUserCommissions(
  userId: number,
  startDate: Date,
  endDate: Date
): Promise<{
  totalCommissions: number;
  bookings: Array<{
    id: number;
    tourTitle: string;
    commissionAmount: number;
    bookingDate: Date;
  }>;
}> {
  const bookings = await prisma.tourBooking.findMany({
    where: {
      bookedById: userId,
      bookingDate: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      tour: {
        select: {
          id: true,
          title: true
        }
      }
    },
    orderBy: {
      bookingDate: 'desc'
    }
  });

  const totalCommissions = bookings.reduce((sum, booking) => {
    return sum + (booking.commissionAmount ? Number(booking.commissionAmount) : 0);
  }, 0);

  return {
    totalCommissions,
    bookings: bookings.map(booking => ({
      id: booking.id,
      tourTitle: booking.tour.title,
      commissionAmount: booking.commissionAmount ? Number(booking.commissionAmount) : 0,
      bookingDate: booking.bookingDate
    }))
  };
}

/**
 * Statistiken für Mitarbeiter
 */
export async function getUserCommissionStats(
  userId: number,
  startDate: Date,
  endDate: Date
): Promise<{
  totalCommissions: number;
  totalBookings: number;
  averageCommission: number;
  byTourType: {
    own: number;
    external: number;
  };
  tourSales: Array<{
    tourId: number;
    tourTitle: string;
    salesCount: number;
    totalCommission: number;
  }>;
}> {
  const bookings = await prisma.tourBooking.findMany({
    where: {
      bookedById: userId,
      bookingDate: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      tour: {
        select: {
          id: true,
          title: true,
          type: true
        }
      }
    }
  });

  const totalCommissions = bookings.reduce((sum, booking) => {
    return sum + (booking.commissionAmount ? Number(booking.commissionAmount) : 0);
  }, 0);

  const totalBookings = bookings.length;
  const averageCommission = totalBookings > 0 ? totalCommissions / totalBookings : 0;

  // Nach Tour-Typ gruppieren
  const byTourType = {
    own: 0,
    external: 0
  };

  bookings.forEach(booking => {
    const commission = booking.commissionAmount ? Number(booking.commissionAmount) : 0;
    if (booking.tour.type === 'own') {
      byTourType.own += commission;
    } else {
      byTourType.external += commission;
    }
  });

  // Welche Tour wurde von wem wie oft verkauft
  const tourSalesMap = new Map<number, {
    tourId: number;
    tourTitle: string;
    salesCount: number;
    totalCommission: number;
  }>();

  bookings.forEach(booking => {
    const tourId = booking.tour.id;
    const existing = tourSalesMap.get(tourId);
    const commission = booking.commissionAmount ? Number(booking.commissionAmount) : 0;

    if (existing) {
      existing.salesCount++;
      existing.totalCommission += commission;
    } else {
      tourSalesMap.set(tourId, {
        tourId,
        tourTitle: booking.tour.title,
        salesCount: 1,
        totalCommission: commission
      });
    }
  });

  const tourSales = Array.from(tourSalesMap.values()).sort((a, b) => b.salesCount - a.salesCount);

  return {
    totalCommissions,
    totalBookings,
    averageCommission,
    byTourType,
    tourSales
  };
}


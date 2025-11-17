/**
 * Reservation Types für Frontend
 */

export enum ReservationStatus {
  CONFIRMED = 'confirmed',
  NOTIFICATION_SENT = 'notification_sent',
  CHECKED_IN = 'checked_in',
  CHECKED_OUT = 'checked_out',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  PARTIALLY_PAID = 'partially_paid',
  REFUNDED = 'refunded'
}

export interface Reservation {
  id: number;
  lobbyReservationId?: string | null;
  guestName: string;
  guestEmail?: string | null;
  guestPhone?: string | null;
  checkInDate: string; // ISO date string
  checkOutDate: string; // ISO date string
  arrivalTime?: string | null; // ISO datetime string
  roomNumber?: string | null;
  roomDescription?: string | null;
  status: ReservationStatus;
  paymentStatus: PaymentStatus;
  amount?: number | string | null; // Betrag der Reservierung
  currency?: string | null; // Währung (COP, USD, EUR, etc.)
  paymentLink?: string | null;
  doorPin?: string | null;
  doorAppName?: string | null;
  ttlLockId?: string | null;
  ttlLockPassword?: string | null;
  onlineCheckInCompleted: boolean;
  onlineCheckInCompletedAt?: string | null; // ISO datetime string
  sireRegistered: boolean;
  sireRegistrationId?: string | null;
  sireRegisteredAt?: string | null; // ISO datetime string
  sireRegistrationError?: string | null;
  sentMessage?: string | null; // Versendete WhatsApp-Nachricht
  sentMessageAt?: string | null; // ISO datetime string
  guestNationality?: string | null;
  guestPassportNumber?: string | null;
  guestBirthDate?: string | null; // ISO date string
  organizationId: number;
  taskId?: number | null;
  createdAt: string; // ISO datetime string
  updatedAt: string; // ISO datetime string
}

export interface ReservationSyncHistory {
  id: number;
  reservationId: number;
  syncType: 'created' | 'updated' | 'status_changed';
  syncData?: any;
  success: boolean;
  errorMessage?: string | null;
  syncedAt: string; // ISO datetime string
}


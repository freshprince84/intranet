import axiosInstance from '../config/axios.ts';
import { logger } from '../utils/logger.ts';
import { Reservation } from '../types/reservation.ts';
import { API_ENDPOINTS } from '../config/api.ts';

// WICHTIG: axiosInstance hat bereits baseURL mit /api, daher nur /reservations hier
const API_BASE = '/reservations';

export interface CreateReservationData {
  guestName: string;
  contact: string; // Telefonnummer oder Email
  amount: number;
  currency?: string; // Default: "COP"
}

export const reservationService = {
  /**
   * Erstellt eine neue Reservierung
   */
  async create(data: CreateReservationData): Promise<Reservation> {
    logger.log('[reservationService] POST zu:', API_BASE);
    logger.log('[reservationService] Daten:', data);
    const response = await axiosInstance.post(API_BASE, data);
    logger.log('[reservationService] Response:', response);
    return response.data.data || response.data;
  },

  /**
   * Holt eine Reservierung nach ID
   */
  async getById(id: number): Promise<Reservation> {
    const response = await axiosInstance.get(`${API_BASE}/${id}`);
    return response.data.data || response.data;
  },

  /**
   * Aktualisiert Kontaktinformation (Telefonnummer oder Email)
   */
  async updateGuestContact(id: number, contact: string): Promise<Reservation> {
    const response = await axiosInstance.put(`${API_BASE}/${id}/guest-contact`, {
      contact
    });
    return response.data.data || response.data;
  },

  /**
   * Generiert PIN-Code und sendet Mitteilung (unabhängig von Zahlungsstatus/Check-in-Status)
   */
  async generatePinAndSend(id: number): Promise<Reservation> {
    const response = await axiosInstance.post(API_ENDPOINTS.RESERVATION.GENERATE_PIN_AND_SEND(id));
    return response.data.data || response.data;
  },

  /**
   * Sendet Reservation-Einladung manuell (mit optionalen Parametern)
   */
  async sendInvitation(
    id: number,
    options?: {
      guestPhone?: string;
      guestEmail?: string;
      customMessage?: string;
      amount?: number;
      currency?: string;
    }
  ): Promise<Reservation> {
    const response = await axiosInstance.post(
      API_ENDPOINTS.RESERVATION.SEND_INVITATION(id),
      options || {}
    );
    return response.data.data || response.data;
  },

  /**
   * Sendet TTLock Passcode mit anpassbaren Kontaktdaten
   */
  async sendPasscode(
    id: number,
    options?: {
      guestPhone?: string;
      guestEmail?: string;
      customMessage?: string;
    }
  ): Promise<Reservation> {
    const response = await axiosInstance.post(
      API_ENDPOINTS.RESERVATION.SEND_PASSCODE(id),
      options || {}
    );
    return response.data.data || response.data;
  },

  /**
   * Holt Notification-Logs UND WhatsApp-Nachrichten für eine Reservierung
   */
  async getNotificationLogs(id: number): Promise<{
    notificationLogs: ReservationNotificationLog[];
    whatsappMessages: WhatsAppMessage[];
  }> {
    const response = await axiosInstance.get(
      API_ENDPOINTS.RESERVATION.NOTIFICATION_LOGS(id)
    );
    const data = response.data.data || response.data;
    // Rückwärtskompatibilität: Wenn nur Array zurückgegeben wird, als notificationLogs behandeln
    if (Array.isArray(data)) {
      return {
        notificationLogs: data,
        whatsappMessages: []
      };
    }
    return data;
  }
};

export interface ReservationNotificationLog {
  id: number;
  reservationId: number;
  notificationType: 'invitation' | 'pin' | 'checkin_confirmation';
  channel: 'whatsapp' | 'email' | 'both';
  success: boolean;
  sentAt: string; // ISO datetime string
  sentTo?: string | null;
  message?: string | null;
  paymentLink?: string | null;
  checkInLink?: string | null;
  errorMessage?: string | null;
  createdAt: string; // ISO datetime string
}

export interface WhatsAppMessage {
  id: number;
  reservationId?: number | null;
  branchId: number;
  conversationId?: number | null;
  direction: 'outgoing' | 'incoming';
  phoneNumber: string;
  message: string;
  messageId?: string | null;
  status?: 'sent' | 'delivered' | 'read' | 'failed' | null;
  errorMessage?: string | null;
  sentAt: string; // ISO datetime string
  createdAt: string; // ISO datetime string
  updatedAt: string; // ISO datetime string
}


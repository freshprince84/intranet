/**
 * Mock LobbyPMS Service für Tests ohne echte API
 * 
 * Simuliert LobbyPMS API-Aufrufe mit Test-Daten
 */

import { LobbyPmsReservation } from './lobbyPmsService';

/**
 * Mock-Daten für Reservierungen
 */
const MOCK_RESERVATIONS: LobbyPmsReservation[] = [
  {
    id: 'RES-001',
    guest_name: 'Juan Pérez',
    guest_email: 'juan.perez@example.com',
    guest_phone: '+573001234567',
    check_in_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Morgen
    check_out_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Übermorgen
    arrival_time: '23:00',
    room_number: '101',
    room_description: 'Einzelzimmer mit Bad',
    status: 'confirmed',
    payment_status: 'pending',
    amount: 150000,
    currency: 'COP',
    guest_nationality: 'CO',
    guest_passport_number: 'AB123456',
    guest_birth_date: '1990-01-15'
  },
  {
    id: 'RES-002',
    guest_name: 'Maria García',
    guest_email: 'maria.garcia@example.com',
    guest_phone: '+573007654321',
    check_in_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Morgen
    check_out_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Übermorgen
    arrival_time: '22:30',
    room_number: '102',
    room_description: 'Doppelzimmer',
    status: 'confirmed',
    payment_status: 'pending',
    amount: 250000,
    currency: 'COP',
    guest_nationality: 'ES',
    guest_passport_number: 'CD789012',
    guest_birth_date: '1985-05-20'
  },
  {
    id: 'RES-003',
    guest_name: 'Carlos Rodríguez',
    guest_email: 'carlos.rodriguez@example.com',
    guest_phone: '+573009876543',
    check_in_date: new Date().toISOString().split('T')[0], // Heute
    check_out_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    arrival_time: '14:00',
    room_number: '201',
    room_description: 'Dormitorio 4-Bett',
    status: 'checked_in',
    payment_status: 'paid',
    amount: 80000,
    currency: 'COP',
    guest_nationality: 'MX',
    guest_passport_number: 'EF345678',
    guest_birth_date: '1992-08-10'
  }
];

/**
 * Mock LobbyPMS Service
 * 
 * Verwendet Test-Daten statt echter API-Aufrufe
 */
export class MockLobbyPmsService {
  private organizationId: number;

  constructor(organizationId: number) {
    this.organizationId = organizationId;
  }

  /**
   * Ruft Mock-Reservierungen ab
   */
  async fetchReservations(startDate: Date, endDate: Date): Promise<LobbyPmsReservation[]> {
    console.log('[MockLobbyPms] fetchReservations:', { startDate, endDate });
    
    // Filtere nach Datum
    return MOCK_RESERVATIONS.filter(res => {
      const checkIn = new Date(res.check_in_date);
      return checkIn >= startDate && checkIn <= endDate;
    });
  }

  /**
   * Ruft Mock-Reservierungen für morgen ab
   */
  async fetchTomorrowReservations(arrivalTimeThreshold?: string): Promise<LobbyPmsReservation[]> {
    console.log('[MockLobbyPms] fetchTomorrowReservations:', { arrivalTimeThreshold });
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    let filtered = MOCK_RESERVATIONS.filter(res => {
      const checkIn = new Date(res.check_in_date);
      return checkIn >= tomorrow && checkIn < dayAfter;
    });

    // Filtere nach Ankunftszeit wenn angegeben
    if (arrivalTimeThreshold) {
      filtered = filtered.filter(res => {
        if (!res.arrival_time) return false;
        const [thresholdHour, thresholdMin] = arrivalTimeThreshold.split(':').map(Number);
        const [arrivalHour, arrivalMin] = res.arrival_time.split(':').map(Number);
        
        const thresholdMinutes = thresholdHour * 60 + thresholdMin;
        const arrivalMinutes = arrivalHour * 60 + arrivalMin;
        
        return arrivalMinutes >= thresholdMinutes;
      });
    }

    return filtered;
  }

  /**
   * Ruft Mock-Reservierung nach ID ab
   */
  async fetchReservationById(reservationId: string): Promise<LobbyPmsReservation> {
    console.log('[MockLobbyPms] fetchReservationById:', reservationId);
    
    const reservation = MOCK_RESERVATIONS.find(r => r.id === reservationId);
    if (!reservation) {
      throw new Error(`Reservierung ${reservationId} nicht gefunden`);
    }
    return reservation;
  }

  /**
   * Validiert Verbindung (Mock - immer erfolgreich)
   */
  async validateConnection(): Promise<boolean> {
    console.log('[MockLobbyPms] validateConnection');
    return true;
  }

  /**
   * Synchronisiert Reservierung (Mock - gibt Reservierung zurück)
   */
  async syncReservation(lobbyReservation: LobbyPmsReservation): Promise<any> {
    console.log('[MockLobbyPms] syncReservation:', lobbyReservation.id);
    
    // Simuliere Synchronisation - gibt einfach die Reservierung zurück
    // In der echten Implementierung würde hier die DB aktualisiert
    return {
      id: Math.floor(Math.random() * 1000),
      lobbyReservationId: lobbyReservation.id,
      guestName: lobbyReservation.guest_name,
      guestEmail: lobbyReservation.guest_email,
      guestPhone: lobbyReservation.guest_phone,
      checkInDate: new Date(lobbyReservation.check_in_date),
      checkOutDate: new Date(lobbyReservation.check_out_date),
      status: lobbyReservation.status,
      paymentStatus: lobbyReservation.payment_status,
      organizationId: this.organizationId
    };
  }
}


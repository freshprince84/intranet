/**
 * Utility-Funktionen für Check-in-Link-Generierung
 * 
 * Generiert LobbyPMS Online-Check-in-Links im Format:
 * https://app.lobbypms.com/checkinonline/confirmar?codigo={codigo}&email={email}&lg={lg}
 */

export interface ReservationForCheckInLink {
  id: number;
  guestEmail: string; // Email ist erforderlich
}

/**
 * Generiert einen LobbyPMS Online-Check-in-Link
 * 
 * @param reservation - Reservierung mit id und guestEmail (erforderlich)
 * @param language - Sprache für den Link (Standard: 'GB' für Englisch)
 * @returns LobbyPMS Check-in-Link
 */
export function generateLobbyPmsCheckInLink(
  reservation: ReservationForCheckInLink,
  language: string = 'GB'
): string {
  // Verwende immer die interne Reservierungs-ID als codigo
  const codigo = reservation.id.toString();
  
  // Email ist erforderlich
  const email = reservation.guestEmail;
  
  // Erstelle URL mit Parametern
  const baseUrl = 'https://app.lobbypms.com/checkinonline/confirmar';
  const params = new URLSearchParams();
  params.append('codigo', codigo);
  params.append('email', email);
  params.append('lg', language);
  
  return `${baseUrl}?${params.toString()}`;
}


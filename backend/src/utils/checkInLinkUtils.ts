/**
 * Utility-Funktionen für Check-in-Link-Generierung
 * 
 * Generiert LobbyPMS Online-Check-in-Links im Format:
 * https://app.lobbypms.com/checkinonline/confirmar?codigo={codigo}&email={email}&lg={lg}
 */

export interface ReservationForCheckInLink {
  id: number;
  lobbyReservationId?: string | null; // LobbyPMS booking_id (sollte verwendet werden)
  guestEmail: string; // Email ist erforderlich
}

/**
 * Generiert einen LobbyPMS Online-Check-in-Link
 * 
 * @param reservation - Reservierung mit lobbyReservationId (oder id als Fallback) und guestEmail (erforderlich)
 * @param language - Sprache für den Link (Standard: 'GB' für Englisch)
 * @returns LobbyPMS Check-in-Link
 */
export function generateLobbyPmsCheckInLink(
  reservation: ReservationForCheckInLink,
  language: string = 'GB'
): string {
  // WICHTIG: Verwende lobbyReservationId (LobbyPMS booking_id) als codigo, nicht die interne ID
  // Fallback auf id nur wenn lobbyReservationId nicht vorhanden (z.B. bei manuell erstellten Reservierungen)
  const codigo = (reservation.lobbyReservationId || reservation.id.toString());
  
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


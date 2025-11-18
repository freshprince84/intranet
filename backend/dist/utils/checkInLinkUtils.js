"use strict";
/**
 * Utility-Funktionen für Check-in-Link-Generierung
 *
 * Generiert LobbyPMS Online-Check-in-Links im Format:
 * https://app.lobbypms.com/checkinonline/confirmar?codigo={codigo}&email={email}&lg={lg}
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateLobbyPmsCheckInLink = generateLobbyPmsCheckInLink;
/**
 * Generiert einen LobbyPMS Online-Check-in-Link
 *
 * @param reservation - Reservierung mit id und guestEmail (erforderlich)
 * @param language - Sprache für den Link (Standard: 'GB' für Englisch)
 * @returns LobbyPMS Check-in-Link
 */
function generateLobbyPmsCheckInLink(reservation, language = 'GB') {
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
//# sourceMappingURL=checkInLinkUtils.js.map
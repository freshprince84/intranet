"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppMessageParser = void 0;
const logger_1 = require("../utils/logger");
class WhatsAppMessageParser {
    /**
     * Parst eine WhatsApp-Nachricht im LobbyPMS-Format
     *
     * @param message - Die zu parsende Nachricht
     * @returns Geparste Daten oder null wenn Format nicht erkannt
     */
    static parseReservationMessage(message) {
        try {
            // Prüfe ob es eine LobbyPMS Reservierungsnachricht ist
            if (!message.includes('Se ha generado una nueva reserva') &&
                !message.includes('nueva reserva desde el motor de reservas')) {
                return null;
            }
            const lines = message.split('\n').map(line => line.trim()).filter(line => line.length > 0);
            const data = {};
            for (const line of lines) {
                // Propiedad: La Familia Hostel - Manila
                if (line.startsWith('Propiedad:')) {
                    data.propertyName = line.replace('Propiedad:', '').trim();
                }
                // Reserva: 18036808
                else if (line.startsWith('Reserva:')) {
                    data.reservationId = line.replace('Reserva:', '').trim();
                }
                // Titular: Bryan Vuithier
                else if (line.startsWith('Titular:')) {
                    data.guestName = line.replace('Titular:', '').trim();
                }
                // Entrada: 13/11/2025
                else if (line.startsWith('Entrada:')) {
                    const dateStr = line.replace('Entrada:', '').trim();
                    data.checkInDate = this.parseDate(dateStr);
                }
                // Salida: 15/11/2025
                else if (line.startsWith('Salida:')) {
                    const dateStr = line.replace('Salida:', '').trim();
                    data.checkOutDate = this.parseDate(dateStr);
                }
                // Cargos: COP 360,000
                else if (line.startsWith('Cargos:')) {
                    const cargoStr = line.replace('Cargos:', '').trim();
                    const parsed = this.parseAmount(cargoStr);
                    data.amount = parsed.amount;
                    data.currency = parsed.currency;
                }
                // Habitaciones: 1
                else if (line.startsWith('Habitaciones:')) {
                    data.rooms = parseInt(line.replace('Habitaciones:', '').trim(), 10) || 1;
                }
                // Huéspedes: 2
                else if (line.startsWith('Huéspedes:')) {
                    data.guests = parseInt(line.replace('Huéspedes:', '').trim(), 10) || 1;
                }
            }
            // Validiere dass alle erforderlichen Felder vorhanden sind
            if (!data.reservationId || !data.guestName || !data.checkInDate || !data.checkOutDate || !data.amount) {
                logger_1.logger.warn('[WhatsAppMessageParser] Unvollständige Daten:', data);
                return null;
            }
            return {
                propertyName: data.propertyName || 'Unknown',
                reservationId: data.reservationId,
                guestName: data.guestName,
                checkInDate: data.checkInDate,
                checkOutDate: data.checkOutDate,
                amount: data.amount,
                currency: data.currency || 'COP',
                rooms: data.rooms || 1,
                guests: data.guests || 1
            };
        }
        catch (error) {
            logger_1.logger.error('[WhatsAppMessageParser] Fehler beim Parsen:', error);
            return null;
        }
    }
    /**
     * Parst ein Datum im Format DD/MM/YYYY
     */
    static parseDate(dateStr) {
        const parts = dateStr.split('/');
        if (parts.length !== 3) {
            throw new Error(`Ungültiges Datumsformat: ${dateStr}`);
        }
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Monate sind 0-indexiert
        const year = parseInt(parts[2], 10);
        return new Date(year, month, day);
    }
    /**
     * Parst einen Betrag im Format "COP 360,000" oder "360,000 COP"
     */
    static parseAmount(amountStr) {
        // Entferne Leerzeichen und finde Währung
        const upperStr = amountStr.toUpperCase();
        let currency = 'COP';
        if (upperStr.includes('COP')) {
            currency = 'COP';
        }
        else if (upperStr.includes('USD')) {
            currency = 'USD';
        }
        else if (upperStr.includes('EUR')) {
            currency = 'EUR';
        }
        // Extrahiere Zahl (entferne alles außer Ziffern und Kommas)
        const numberStr = amountStr.replace(/[^\d,]/g, '').replace(',', '');
        const amount = parseFloat(numberStr) || 0;
        return { amount, currency };
    }
}
exports.WhatsAppMessageParser = WhatsAppMessageParser;
//# sourceMappingURL=whatsappMessageParser.js.map
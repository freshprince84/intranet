"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageParserService = void 0;
const logger_1 = require("../../utils/logger");
/**
 * Message Parser Service
 *
 * Zentrale Parsing-Logik für alle Message-Typen
 * Wiederverwendbar für alle Kanäle (WhatsApp, Email, Instagram, Facebook, Twitter)
 */
class MessageParserService {
    /**
     * Parst eine Nachricht und extrahiert alle relevanten Informationen
     *
     * @param message - Die zu parsende Nachricht
     * @param context - Optional: Conversation Context für besseres Parsing
     * @param availableRooms - Optional: Verfügbare Zimmer für Room-Parsing
     * @returns Geparste Nachricht mit allen extrahierten Informationen
     */
    static parseMessage(message, context, availableRooms) {
        var _a, _b;
        const normalized = message.toLowerCase().trim();
        return {
            dates: this.parseDates(message, context),
            name: this.parseName(message),
            room: this.parseRoom(message, availableRooms || ((_b = (_a = context === null || context === void 0 ? void 0 : context.booking) === null || _a === void 0 ? void 0 : _a.lastAvailabilityCheck) === null || _b === void 0 ? void 0 : _b.rooms)),
            intent: this.parseIntent(normalized)
        };
    }
    /**
     * Parst Datum aus Nachricht
     *
     * Unterstützt:
     * - Relative Daten: "heute", "morgen", "übermorgen", "today", "tomorrow", "day after tomorrow"
     * - Datumsformate: YYYY-MM-DD, DD/MM/YYYY, DD.MM.YYYY, DD-MM-YYYY, DD/MM, DD.MM
     * - Datumsbereiche: "von X bis Y", "X bis Y"
     *
     * @param message - Die zu parsende Nachricht
     * @param context - Optional: Conversation Context für besseres Parsing
     * @returns Geparste Daten mit checkIn und checkOut
     */
    static parseDates(message, context) {
        var _a, _b;
        const normalized = message.toLowerCase().trim();
        let checkInDate = null;
        let checkOutDate = null;
        // Parse relative dates
        const relativeDate = this.parseRelativeDate(normalized);
        if (relativeDate) {
            checkInDate = relativeDate;
        }
        // Parse "para mañana" + "1 noche"
        if (normalized.includes('para mañana') || normalized.includes('para manana')) {
            checkInDate = 'tomorrow';
            if (normalized.includes('1 noche') || normalized.includes('una noche') ||
                normalized.includes('1 nacht') || normalized.includes('eine nacht')) {
                checkOutDate = 'day after tomorrow';
            }
        }
        // Parse "1 noche" / "1 nacht" allgemein (auch ohne "para mañana")
        if (normalized.includes('1 noche') || normalized.includes('una noche') ||
            normalized.includes('1 nacht') || normalized.includes('eine nacht')) {
            if (checkInDate && !checkOutDate) {
                // Wenn checkInDate bereits gesetzt ist, setze checkOutDate auf +1 Tag
                if (checkInDate === 'tomorrow' || checkInDate === 'morgen' || checkInDate === 'mañana') {
                    checkOutDate = 'day after tomorrow';
                }
                else if (checkInDate === 'today' || checkInDate === 'heute' || checkInDate === 'hoy') {
                    checkOutDate = 'tomorrow';
                }
            }
        }
        // Parse "checkin" und "checkout"
        const checkInMatch = message.match(/checkin[:\s]+([^\s,]+)/i) || message.match(/check-in[:\s]+([^\s,]+)/i);
        const checkOutMatch = message.match(/checkout[:\s]+([^\s,]+)/i) || message.match(/check-out[:\s]+([^\s,]+)/i);
        if (checkInMatch) {
            checkInDate = checkInMatch[1].trim();
        }
        if (checkOutMatch) {
            checkOutDate = checkOutMatch[1].trim();
        }
        // Parse date ranges first (z.B. "19.12.-20.12.", "19.12.25-20.12.25", "19.12-20.12")
        const dateRangePattern = /(\d{1,2})[\.\/-](\d{1,2})(?:\.(\d{2,4}))?\s*[-–—]\s*(\d{1,2})[\.\/-](\d{1,2})(?:\.(\d{2,4}))?/i;
        const dateRangeMatch = message.match(dateRangePattern);
        if (dateRangeMatch) {
            // Erster Datum (Check-in)
            const day1 = parseInt(dateRangeMatch[1], 10);
            const month1 = parseInt(dateRangeMatch[2], 10);
            const year1Str = dateRangeMatch[3];
            let year1;
            if (year1Str) {
                year1 = parseInt(year1Str, 10);
                if (year1 < 100)
                    year1 = 2000 + year1;
            }
            else {
                year1 = new Date().getFullYear();
            }
            checkInDate = `${year1}-${month1.toString().padStart(2, '0')}-${day1.toString().padStart(2, '0')}`;
            // Zweiter Datum (Check-out)
            const day2 = parseInt(dateRangeMatch[4], 10);
            const month2 = parseInt(dateRangeMatch[5], 10);
            const year2Str = dateRangeMatch[6];
            let year2;
            if (year2Str) {
                year2 = parseInt(year2Str, 10);
                if (year2 < 100)
                    year2 = 2000 + year2;
            }
            else {
                // Wenn kein Jahr für Check-out, verwende gleiches Jahr wie Check-in
                year2 = year1;
                // Wenn Check-out Monat kleiner als Check-in Monat, ist es nächstes Jahr
                if (month2 < month1 || (month2 === month1 && day2 < day1)) {
                    year2 = year1 + 1;
                }
            }
            checkOutDate = `${year2}-${month2.toString().padStart(2, '0')}-${day2.toString().padStart(2, '0')}`;
        }
        else {
            // Parse einzelne date formats (DD/MM/YYYY, DD.MM.YYYY, DD-MM-YYYY, DD/MM, DD.MM, DD.MM.YY)
            const dateFormats = [
                /(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})/, // DD/MM/YYYY oder DD/MM/YY
                /(\d{1,2})[\/\.-](\d{1,2})/, // DD/MM (aktuelles Jahr)
            ];
            for (const format of dateFormats) {
                const match = message.match(format);
                if (match) {
                    const day = parseInt(match[1], 10);
                    const month = parseInt(match[2], 10);
                    let year;
                    if (match[3]) {
                        year = parseInt(match[3], 10);
                        // Wenn Jahr 2-stellig, interpretiere als 20XX
                        if (year < 100) {
                            year = 2000 + year;
                        }
                    }
                    else {
                        year = new Date().getFullYear();
                    }
                    // Format: YYYY-MM-DD
                    const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                    if (!checkInDate) {
                        checkInDate = dateStr;
                    }
                    else if (!checkOutDate) {
                        checkOutDate = dateStr;
                    }
                    break;
                }
            }
        }
        // Parse date ranges ("von X bis Y", "X bis Y")
        const rangeMatch = message.match(/(?:von|from|desde)\s+([^\s]+)\s+(?:bis|to|hasta)\s+([^\s]+)/i);
        if (rangeMatch) {
            checkInDate = this.normalizeDate(rangeMatch[1]);
            checkOutDate = this.normalizeDate(rangeMatch[2]);
        }
        // Wenn Bestätigung vorhanden, verwende checkInDate aus Context falls vorhanden
        const hasConfirmation = normalized.includes('ja') || normalized.includes('sí') || normalized.includes('yes') ||
            normalized.includes('ok') || normalized.includes('genau') || normalized.includes('correcto');
        if (hasConfirmation && !checkInDate && ((_a = context === null || context === void 0 ? void 0 : context.booking) === null || _a === void 0 ? void 0 : _a.checkInDate)) {
            checkInDate = context.booking.checkInDate;
        }
        // Wenn Bestätigung vorhanden, verwende checkOutDate aus Context falls vorhanden
        if (hasConfirmation && !checkOutDate && ((_b = context === null || context === void 0 ? void 0 : context.booking) === null || _b === void 0 ? void 0 : _b.checkOutDate)) {
            checkOutDate = context.booking.checkOutDate;
        }
        if (!checkInDate && !checkOutDate) {
            return null;
        }
        return {
            checkIn: checkInDate,
            checkOut: checkOutDate
        };
    }
    /**
     * Parst relativen Datumsbegriff (heute, morgen, übermorgen)
     *
     * @param message - Die zu parsende Nachricht (normalisiert)
     * @returns Normalisierter relativer Datumsbegriff oder null
     */
    static parseRelativeDate(message) {
        const normalized = message.toLowerCase().trim();
        if (normalized.includes('today') || normalized.includes('heute') || normalized.includes('hoy')) {
            return 'today';
        }
        if (normalized.includes('tomorrow') || normalized.includes('morgen') || normalized.includes('mañana') || normalized.includes('manana')) {
            return 'tomorrow';
        }
        if (normalized.includes('day after tomorrow') || normalized.includes('übermorgen') || normalized.includes('pasado mañana')) {
            return 'day after tomorrow';
        }
        return null;
    }
    /**
     * Normalisiert ein Datum zu einem Standard-Format
     *
     * @param dateStr - Datum als String
     * @returns Normalisiertes Datum (YYYY-MM-DD oder relative Date)
     */
    static normalizeDate(dateStr) {
        const relative = this.parseRelativeDate(dateStr.toLowerCase());
        if (relative) {
            return relative;
        }
        // Versuche verschiedene Datumsformate zu parsen
        const formats = [
            /(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})/, // DD/MM/YYYY
            /(\d{1,2})[\/\.-](\d{1,2})/, // DD/MM (aktuelles Jahr)
        ];
        for (const format of formats) {
            const match = dateStr.match(format);
            if (match) {
                const day = parseInt(match[1], 10);
                const month = parseInt(match[2], 10);
                const year = match[3] ? parseInt(match[3], 10) : new Date().getFullYear();
                return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            }
        }
        return dateStr; // Fallback: Original zurückgeben
    }
    /**
     * Parst Name aus Nachricht
     *
     * Unterstützt:
     * - Explizite Marker: "für Patrick Ammann", "a nombre de Juan Pérez", "ist Patrick Ammann", "mit Patrick Ammann"
     * - Namen nach Zimmer-Namen oder Kommas
     * - Namen am Ende der Nachricht (wenn Nachricht mit Großbuchstaben beginnt)
     *
     * @param message - Die zu parsende Nachricht
     * @returns Geparster Name oder null
     */
    static parseName(message) {
        // 1. Explizite Marker (z.B. "für Patrick Ammann", "a nombre de Juan Pérez", "ist Patrick Ammann", "mit Patrick Ammann", "Ich heisse Patrick Ammann", "Ich heiße Patrick Ammann")
        const explicitNamePattern = /(?:a nombre de|name|nombre|für|para|ist|mit|ich heisse|ich heiße|ich heiβe|me llamo|mi nombre es|my name is)\s+([A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß]+)+)/i;
        const explicitNameMatch = message.match(explicitNamePattern);
        if (explicitNameMatch) {
            const name = explicitNameMatch[1].trim();
            return this.cleanName(name);
        }
        // 2. Namen nach Zimmer-Namen oder Kommas (z.B. "primo aventurero für Patrick Ammann" oder "dorm, Patrick Ammann")
        const nameAfterRoomPattern = /(?:primo|abuelo|tia|dorm|zimmer|habitación|apartamento|doble|básica|deluxe|estándar|singular|apartaestudio|deportista|aventurero|artista|viajero|bromista)\s+(?:für|para|,|ist|mit)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i;
        const nameAfterRoomMatch = message.match(nameAfterRoomPattern);
        if (nameAfterRoomMatch) {
            const name = nameAfterRoomMatch[1].trim();
            return this.cleanName(name);
        }
        // 3. Namen am Ende der Nachricht (wenn Nachricht mit Großbuchstaben beginnt und 2+ Wörter hat)
        // Nur wenn keine anderen Buchungsinformationen erkannt wurden
        const words = message.trim().split(/\s+/);
        if (words.length >= 2 && words.length <= 4 &&
            words[0][0] === words[0][0].toUpperCase() &&
            words[1][0] === words[1][0].toUpperCase()) {
            // Potentieller Name (z.B. "Patrick Ammann")
            const potentialName = words.join(' ');
            // Prüfe ob es wie ein Name aussieht (mindestens 2 Wörter, beide mit Großbuchstaben)
            if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+$/.test(potentialName)) {
                return this.cleanName(potentialName);
            }
        }
        return null;
    }
    /**
     * Bereinigt Name von führenden Wörtern
     *
     * Entfernt Wörter wie "ist", "mit", "für", "para", "a nombre de", "name", "nombre"
     *
     * @param name - Roher Name
     * @returns Bereinigter Name
     */
    static cleanName(name) {
        if (!name)
            return name;
        // Entferne führende Wörter
        return name.replace(/^(ist|mit|für|para|a nombre de|name|nombre|ich heisse|ich heiße|ich heiβe|me llamo|mi nombre es|my name is)\s+/i, '').trim();
    }
    /**
     * Parst Zimmer-Name und categoryId aus Nachricht
     *
     * Unterstützt:
     * - Exakte Übereinstimmung mit verfügbaren Zimmern
     * - Teilübereinstimmung (mindestens 2 Wörter)
     * - Fuzzy-Matching (ähnliche Wörter)
     * - Fallback: Erste verfügbare Kategorie der gewählten Art
     *
     * @param message - Die zu parsende Nachricht
     * @param availableRooms - Optional: Verfügbare Zimmer für Matching
     * @returns Geparstes Zimmer mit name, categoryId und type
     */
    static parseRoom(message, availableRooms) {
        if (!availableRooms || availableRooms.length === 0) {
            // Wenn keine verfügbaren Zimmer, versuche nur roomType zu erkennen
            const normalized = message.toLowerCase().trim();
            if (normalized.includes('compartida') || normalized.includes('dorm') || normalized.includes('cama')) {
                return {
                    roomName: null,
                    categoryId: null,
                    type: 'compartida'
                };
            }
            if (normalized.includes('privada') || normalized.includes('habitación') || normalized.includes('zimmer')) {
                return {
                    roomName: null,
                    categoryId: null,
                    type: 'privada'
                };
            }
            return null;
        }
        const normalized = message.toLowerCase().trim();
        let roomName = null;
        let categoryId = null;
        let roomType = null;
        // Parse Zimmer-Art
        if (normalized.includes('compartida') || normalized.includes('dorm') || normalized.includes('cama')) {
            roomType = 'compartida';
        }
        else if (normalized.includes('privada') || normalized.includes('habitación') || normalized.includes('zimmer')) {
            roomType = 'privada';
        }
        // Versuche Zimmer-Name aus Nachricht zu finden (auch Teilübereinstimmung)
        let foundMatch = false;
        for (const room of availableRooms) {
            const roomNameLower = room.name.toLowerCase().trim();
            const nameParts = roomNameLower.split(' ').filter(part => part.length > 2);
            // Entferne Artikel aus beiden Strings für Vergleich
            const roomNameWithoutArticle = roomNameLower.replace(/^(el|la|los|las|un|una)\s+/, '');
            const messageWithoutArticle = normalized.replace(/\b(el|la|los|las|un|una)\s+/g, '');
            // 1. Exakte Übereinstimmung (mit oder ohne Artikel)
            if (normalized.includes(roomNameLower) ||
                normalized.includes(roomNameWithoutArticle) ||
                messageWithoutArticle.includes(roomNameWithoutArticle)) {
                roomName = room.name;
                categoryId = room.categoryId;
                roomType = room.type;
                foundMatch = true;
                logger_1.logger.log(`[MessageParserService] Zimmer gefunden (exakt): ${room.name} (categoryId: ${categoryId}, type: ${roomType})`);
                break;
            }
            // 2. Teilübereinstimmung: Prüfe ob mindestens 2 Wörter des Zimmer-Namens in der Nachricht vorkommen
            // WICHTIG: Ignoriere Artikel und kurze Wörter (< 3 Zeichen)
            const matchingParts = nameParts.filter(part => {
                // Prüfe ob das Wort in der Nachricht vorkommt (auch als Teilwort)
                return normalized.includes(part) || messageWithoutArticle.includes(part);
            });
            if (matchingParts.length >= 2) {
                roomName = room.name;
                categoryId = room.categoryId;
                roomType = room.type;
                foundMatch = true;
                logger_1.logger.log(`[MessageParserService] Zimmer gefunden (Teilübereinstimmung, ${matchingParts.length} Wörter): ${room.name} (categoryId: ${categoryId}, type: ${roomType})`);
                break;
            }
            // 3. Fuzzy-Matching: Prüfe auf ähnliche Wörter (z.B. "abuel" vs "abuelo", "el abuel viajero" vs "el abuelo viajero")
            // Entferne letzte Buchstaben für Vergleich (z.B. "abuelo" -> "abuel", "viajero" -> "viajer")
            const fuzzyRoomName = roomNameWithoutArticle.replace(/(o|a|e|s)$/g, '');
            const fuzzyMessage = messageWithoutArticle.replace(/(o|a|e|s)$/g, '');
            // Prüfe ob fuzzyRoomName in fuzzyMessage enthalten ist (auch als Teilstring)
            // Oder ob beide ähnlich sind (mindestens 70% Übereinstimmung)
            if (fuzzyMessage.includes(fuzzyRoomName) || fuzzyRoomName.includes(fuzzyMessage)) {
                roomName = room.name;
                categoryId = room.categoryId;
                roomType = room.type;
                foundMatch = true;
                logger_1.logger.log(`[MessageParserService] Zimmer gefunden (fuzzy): ${room.name} (categoryId: ${categoryId}, type: ${roomType})`);
                break;
            }
            // 3.5. Erweiterte Fuzzy-Suche: Prüfe einzelne Wörter (z.B. "abuel" in "abuelo viajero")
            const fuzzyRoomWords = fuzzyRoomName.split(' ').filter(w => w.length > 3);
            const fuzzyMessageWords = fuzzyMessage.split(' ').filter(w => w.length > 3);
            let fuzzyWordMatches = 0;
            for (const roomWord of fuzzyRoomWords) {
                for (const msgWord of fuzzyMessageWords) {
                    // Prüfe ob Wörter ähnlich sind (Teilübereinstimmung)
                    if (msgWord.includes(roomWord) || roomWord.includes(msgWord)) {
                        fuzzyWordMatches++;
                        break;
                    }
                }
            }
            // Wenn mindestens 2 Wörter übereinstimmen, ist es ein Match
            if (fuzzyWordMatches >= 2) {
                roomName = room.name;
                categoryId = room.categoryId;
                roomType = room.type;
                foundMatch = true;
                logger_1.logger.log(`[MessageParserService] Zimmer gefunden (erweiterte fuzzy, ${fuzzyWordMatches} Wörter): ${room.name} (categoryId: ${categoryId}, type: ${roomType})`);
                break;
            }
        }
        // 4. FALLBACK: Wenn kein Match gefunden wurde, aber roomType bekannt ist (z.B. "privada"),
        // und der User einen Zimmernamen sagt, der nicht in category.name steht (Privates),
        // dann nimm die erste verfügbare Kategorie dieser Art
        if (!foundMatch && roomType) {
            const availableRoomsOfType = availableRooms.filter(r => r.type === roomType);
            if (availableRoomsOfType.length > 0) {
                // Wenn nur eine Kategorie dieser Art verfügbar ist, nimm sie
                if (availableRoomsOfType.length === 1) {
                    roomName = availableRoomsOfType[0].name;
                    categoryId = availableRoomsOfType[0].categoryId;
                    logger_1.logger.log(`[MessageParserService] Fallback: Einzige verfügbare ${roomType} Kategorie verwendet: ${roomName} (categoryId: ${categoryId})`);
                }
                else {
                    // Mehrere Kategorien verfügbar - versuche nach Kategorie-Namen zu suchen
                    // (z.B. "doble básica", "apartamento doble")
                    const categoryKeywords = ['doble', 'básica', 'básico', 'estándar', 'estandar', 'apartamento', 'singular', 'deluxe'];
                    const messageCategoryMatch = categoryKeywords.find(keyword => normalized.includes(keyword));
                    if (messageCategoryMatch) {
                        // Suche nach Kategorie, die das Keyword enthält
                        const matchingCategory = availableRoomsOfType.find(r => r.name.toLowerCase().includes(messageCategoryMatch));
                        if (matchingCategory) {
                            roomName = matchingCategory.name;
                            categoryId = matchingCategory.categoryId;
                            logger_1.logger.log(`[MessageParserService] Fallback: Kategorie gefunden durch Keyword "${messageCategoryMatch}": ${roomName} (categoryId: ${categoryId})`);
                        }
                    }
                    // Wenn immer noch kein Match, nimm die erste verfügbare
                    if (!categoryId && availableRoomsOfType.length > 0) {
                        roomName = availableRoomsOfType[0].name;
                        categoryId = availableRoomsOfType[0].categoryId;
                        logger_1.logger.log(`[MessageParserService] Fallback: Erste verfügbare ${roomType} Kategorie verwendet: ${roomName} (categoryId: ${categoryId})`);
                    }
                }
            }
        }
        if (!roomName && !categoryId && !roomType) {
            return null;
        }
        return {
            roomName: roomName || '',
            categoryId: categoryId || 0,
            type: roomType || 'compartida'
        };
    }
    /**
     * Parst Intent aus Nachricht
     *
     * Erkennt die Absicht des Users:
     * - booking: Buchungsanfrage
     * - availability: Verfügbarkeitsanfrage
     * - code: Code-Anfrage (PIN, etc.)
     * - status: Status-Anfrage
     * - tour: Tour-Anfrage
     * - other: Sonstiges
     *
     * @param message - Die zu parsende Nachricht (normalisiert)
     * @returns Erkannte Absicht
     */
    static parseIntent(message) {
        const normalized = message.toLowerCase().trim();
        // Booking-Keywords
        if (normalized.includes('reservar') || normalized.includes('buchen') || normalized.includes('buche') ||
            normalized.includes('reservame') || normalized.includes('quiero reservar') || normalized.includes('ich möchte buchen') ||
            normalized.includes('reservación') || normalized.includes('reservation')) {
            return 'booking';
        }
        // Availability-Keywords
        if (normalized.includes('disponible') || normalized.includes('verfügbar') || normalized.includes('available') ||
            normalized.includes('libre') || normalized.includes('frei') || normalized.includes('free') ||
            normalized.includes('tienen habitacion') || normalized.includes('haben wir zimmer') ||
            normalized.includes('qué hay') || normalized.includes('was gibt es')) {
            return 'availability';
        }
        // Tour-Keywords
        if (normalized.includes('tour') || normalized.includes('tours') || normalized.includes('excursión') ||
            normalized.includes('excursion') || normalized.includes('ausflug')) {
            return 'tour';
        }
        // Code-Keywords
        if (normalized.includes('pin') || normalized.includes('code') || normalized.includes('código') ||
            normalized.includes('passcode') || normalized.includes('contraseña')) {
            return 'code';
        }
        // Status-Keywords
        if (normalized.includes('status') || normalized.includes('estado') || normalized.includes('reservación') ||
            normalized.includes('reservation') || normalized.includes('buchung')) {
            return 'status';
        }
        return 'other';
    }
}
exports.MessageParserService = MessageParserService;
//# sourceMappingURL=MessageParserService.js.map
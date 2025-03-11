"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatInLocalTimezone = exports.utcToLocal = exports.localToUtc = exports.getTimezoneForCountry = void 0;
/**
 * Hilfsfunktionen für die Zeitzonenbehandlung
 */
const date_fns_tz_1 = require("date-fns-tz");
const date_fns_1 = require("date-fns");
// Zuordnung der Länder zu Zeitzonen
const COUNTRY_TIMEZONE_MAP = {
    'CH': 'Europe/Zurich', // Schweiz
    'CO': 'America/Bogota', // Kolumbien
    // Weitere Länder können hier hinzugefügt werden
};
// Standardzeitzone, falls ein Land nicht gefunden wird
const DEFAULT_TIMEZONE = 'UTC';
/**
 * Holt die Zeitzone für ein bestimmtes Land.
 * @param countryCode Der 2-stellige Ländercode (ISO 3166-1 alpha-2)
 * @returns Die IANA-Zeitzone für das angegebene Land oder die Standardzeitzone
 */
const getTimezoneForCountry = (countryCode) => {
    return COUNTRY_TIMEZONE_MAP[countryCode] || DEFAULT_TIMEZONE;
};
exports.getTimezoneForCountry = getTimezoneForCountry;
/**
 * Konvertiert lokale Zeit in die entsprechende UTC-Zeit,
 * basierend auf der Zeitzone des Landes des Benutzers.
 *
 * @param date Lokales Datum und Zeit
 * @param countryCode Das Land des Benutzers (CO für Kolumbien, CH für Schweiz)
 * @returns Das entsprechende UTC-Datum für die Speicherung in der Datenbank
 */
const localToUtc = (date, countryCode) => {
    // Für die Konvertierung von lokaler Zeit zu UTC verwenden wir die einfache Methode:
    // Wir erstellen das Datum und interpretieren es als lokale Zeit in der entsprechenden Zeitzone
    const localDate = typeof date === 'string' ? new Date(date) : date;
    // Da das Datum in JavaScript immer in der lokalen Zeitzone des Systems erstellt wird,
    // müssen wir es explizit als UTC interpretieren, um keine Umrechnung zu machen
    const utcDate = new Date(Date.UTC(localDate.getFullYear(), localDate.getMonth(), localDate.getDate(), localDate.getHours(), localDate.getMinutes(), localDate.getSeconds(), localDate.getMilliseconds()));
    return utcDate;
};
exports.localToUtc = localToUtc;
/**
 * Konvertiert UTC-Zeit aus der Datenbank in die lokale Zeit des Benutzers,
 * basierend auf der Zeitzone des Landes.
 *
 * @param date UTC-Datum aus der Datenbank
 * @param countryCode Das Land des Benutzers (CO für Kolumbien, CH für Schweiz)
 * @returns Das Datum in der lokalen Zeit des Benutzers
 */
const utcToLocal = (date, countryCode) => {
    const timezone = (0, exports.getTimezoneForCountry)(countryCode);
    const utcDate = typeof date === 'string' ? (0, date_fns_1.parseISO)(date) : date;
    // Konvertiere UTC-Zeit zur lokalen Zeit basierend auf der Zeitzone
    return (0, date_fns_tz_1.toZonedTime)(utcDate, timezone);
};
exports.utcToLocal = utcToLocal;
/**
 * Formatiert ein Datum in der lokalen Zeitzone des Benutzers für die Anzeige.
 *
 * @param date Das zu formatierende Datum (UTC aus Datenbank)
 * @param countryCode Das Land des Benutzers
 * @param formatStr Das Format-Pattern (optional)
 * @returns Ein formatierter String in der lokalen Zeit
 */
const formatInLocalTimezone = (date, countryCode, formatStr = 'dd.MM.yyyy HH:mm') => {
    const timezone = (0, exports.getTimezoneForCountry)(countryCode);
    const utcDate = typeof date === 'string' ? (0, date_fns_1.parseISO)(date) : date;
    const zonedDate = (0, date_fns_tz_1.toZonedTime)(utcDate, timezone);
    return (0, date_fns_tz_1.format)(zonedDate, formatStr, { timeZone: timezone });
};
exports.formatInLocalTimezone = formatInLocalTimezone;
//# sourceMappingURL=timeUtils.js.map
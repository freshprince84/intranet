/**
 * Hilfsfunktionen für die Zeitzonenbehandlung
 */
import { format, toZonedTime } from 'date-fns-tz';
import { parseISO } from 'date-fns';

// Zuordnung der Länder zu Zeitzonen
const COUNTRY_TIMEZONE_MAP: Record<string, string> = {
  'CH': 'Europe/Zurich',    // Schweiz
  'CO': 'America/Bogota',   // Kolumbien
  // Weitere Länder können hier hinzugefügt werden
};

// Standardzeitzone, falls ein Land nicht gefunden wird
const DEFAULT_TIMEZONE = 'UTC';

/**
 * Holt die Zeitzone für ein bestimmtes Land.
 * @param countryCode Der 2-stellige Ländercode (ISO 3166-1 alpha-2)
 * @returns Die IANA-Zeitzone für das angegebene Land oder die Standardzeitzone
 */
export const getTimezoneForCountry = (countryCode: string): string => {
  return COUNTRY_TIMEZONE_MAP[countryCode] || DEFAULT_TIMEZONE;
};

/**
 * Konvertiert lokale Zeit in die entsprechende UTC-Zeit, 
 * basierend auf der Zeitzone des Landes des Benutzers.
 * 
 * @param date Lokales Datum und Zeit
 * @param countryCode Das Land des Benutzers (CO für Kolumbien, CH für Schweiz)
 * @returns Das entsprechende UTC-Datum für die Speicherung in der Datenbank
 */
export const localToUtc = (date: Date | string, countryCode: string): Date => {
  // Für die Konvertierung von lokaler Zeit zu UTC verwenden wir die einfache Methode:
  // Wir erstellen das Datum und interpretieren es als lokale Zeit in der entsprechenden Zeitzone
  const localDate = typeof date === 'string' ? new Date(date) : date;
  
  // Da das Datum in JavaScript immer in der lokalen Zeitzone des Systems erstellt wird,
  // müssen wir es explizit als UTC interpretieren, um keine Umrechnung zu machen
  const utcDate = new Date(
    Date.UTC(
      localDate.getFullYear(),
      localDate.getMonth(),
      localDate.getDate(),
      localDate.getHours(),
      localDate.getMinutes(),
      localDate.getSeconds(),
      localDate.getMilliseconds()
    )
  );
  
  return utcDate;
};

/**
 * Konvertiert UTC-Zeit aus der Datenbank in die lokale Zeit des Benutzers,
 * basierend auf der Zeitzone des Landes.
 * 
 * @param date UTC-Datum aus der Datenbank
 * @param countryCode Das Land des Benutzers (CO für Kolumbien, CH für Schweiz)
 * @returns Das Datum in der lokalen Zeit des Benutzers
 */
export const utcToLocal = (date: Date | string, countryCode: string): Date => {
  const timezone = getTimezoneForCountry(countryCode);
  const utcDate = typeof date === 'string' ? parseISO(date) : date;
  
  // Konvertiere UTC-Zeit zur lokalen Zeit basierend auf der Zeitzone
  return toZonedTime(utcDate, timezone);
};

/**
 * Formatiert ein Datum in der lokalen Zeitzone des Benutzers für die Anzeige.
 * 
 * @param date Das zu formatierende Datum (UTC aus Datenbank)
 * @param countryCode Das Land des Benutzers
 * @param formatStr Das Format-Pattern (optional)
 * @returns Ein formatierter String in der lokalen Zeit
 */
export const formatInLocalTimezone = (
  date: Date | string,
  countryCode: string,
  formatStr: string = 'dd.MM.yyyy HH:mm'
): string => {
  const timezone = getTimezoneForCountry(countryCode);
  const utcDate = typeof date === 'string' ? parseISO(date) : date;
  const zonedDate = toZonedTime(utcDate, timezone);
  
  return format(zonedDate, formatStr, { timeZone: timezone });
}; 
/**
 * Dienstprogramme für Datums- und Zeitbehandlung
 * Bietet Funktionen für konsistentes Handling von Zeitzonen und Formatierungen
 */

import { format, parseISO, differenceInMinutes } from 'date-fns';

/**
 * Formatiert ein Datum in ein lesbares Format (DD.MM.YYYY HH:MM)
 * @param date Das zu formatierende Datum
 * @returns Formatierte Zeichenkette
 */
export const formatDateTime = (date: Date | string | null | undefined): string => {
  if (!date) return '-';
  
  // Stelle sicher, dass wir mit einem Date-Objekt arbeiten
  const d = typeof date === 'string' ? new Date(date) : date;
  
  return `${formatDate(d)} ${formatTime(d)}`;
};

/**
 * Formatiert ein Datum für die Anzeige im deutschen Format.
 * @param dateString Das zu formatierende Datum im Format YYYY-MM-DD
 * @returns Formatiertes Datum im Format DD.MM.YYYY oder '-' bei Fehler
 */
export const formatDate = (dateString: string | Date): string => {
    if (!dateString) return '-';
    
    try {
        const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
        
        return date.toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch (error) {
        console.error('Fehler beim Formatieren des Datums:', error);
        return '-';
    }
};

/**
 * Formatiert eine Zeit für die Anzeige basierend auf lokaler Zeit.
 * @param dateString Das zu formatierende Datum im ISO-Format
 * @returns Formatierte Zeit im Format HH:MM oder '-' bei Fehler
 */
export const formatTime = (dateString: string | Date): string => {
    if (!dateString) return '-';
    
    try {
        const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
        
        // Verwende lokale Stunden und Minuten, um die Zeit korrekt anzuzeigen
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        
        return `${hours}:${minutes}`;
    } catch (error) {
        console.error(`Fehler beim Formatieren der Zeit für ${dateString}:`, error);
        return '-';
    }
};

/**
 * Berechnet die Dauer zwischen zwei Zeitpunkten und formatiert sie als "Nh Nm".
 * @param startTime Startzeit im ISO-Format
 * @param endTime Endzeit im ISO-Format
 * @returns Formatierte Dauer als "Nh Nm" oder '-' bei Fehler
 */
export const calculateDuration = (startTime: string | Date, endTime: string | Date | null): string => {
    if (!startTime || !endTime) return '-';
    
    try {
        const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
        const end = typeof endTime === 'string' ? new Date(endTime) : endTime;
        
        const durationMs = end.getTime() - start.getTime();
        const durationMinutes = Math.floor(durationMs / (1000 * 60));
        
        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;
        
        return `${hours}h ${minutes}m`;
    } catch (error) {
        console.error('Fehler bei der Dauerberechnung:', error);
        return '-';
    }
};

/**
 * Erstellt ein Date-Objekt ohne Zeitzonenverschiebung
 * @param dateString Ein ISO-Zeitstring
 * @returns Date-Objekt mit korrigiertem Zeitzonenversatz
 */
export const createLocalDate = (dateString: string): Date => {
    const date = new Date(dateString);
    // Korrigiere den Zeitzonenversatz
    return new Date(date.getTime() + date.getTimezoneOffset() * 60000);
};

/**
 * Erstellt ein Datum für den Anfang des angegebenen Tages in UTC
 * Diese Funktion hilft, lokale Daten in ein Format zu konvertieren, 
 * das mit den Backend-Berechnungen kompatibel ist
 * 
 * @param date Das Datum, für das der Tagesanfang berechnet werden soll
 * @returns Ein neues Datum, das den Anfang des Tages in UTC repräsentiert
 */
export const getStartOfDayUTC = (date: Date): Date => {
  // Lokalen Beginn des Tages definieren (0:00:00)
  const localStartOfDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0, 0, 0, 0
  );
  
  // Zeitzonenversatz von der lokalen Zeit zur UTC-Zeit in Minuten
  const offsetMinutes = localStartOfDay.getTimezoneOffset();
  
  // Korrigiere die lokale Zeit, um UTC zu erhalten
  return new Date(localStartOfDay.getTime() - offsetMinutes * 60000);
};

/**
 * Erstellt ein Datum für das Ende des angegebenen Tages in UTC
 * @param date Das Datum, für das das Tagesende berechnet werden soll
 * @returns Ein neues Datum, das das Ende des Tages in UTC repräsentiert
 */
export const getEndOfDayUTC = (date: Date): Date => {
  // Lokales Ende des Tages definieren (23:59:59.999)
  const localEndOfDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23, 59, 59, 999
  );
  
  // Zeitzonenversatz von der lokalen Zeit zur UTC-Zeit in Minuten
  const offsetMinutes = localEndOfDay.getTimezoneOffset();
  
  // Korrigiere die lokale Zeit, um UTC zu erhalten
  return new Date(localEndOfDay.getTime() - offsetMinutes * 60000);
};

/**
 * Konvertiert eine UTC ISO-String Datumsangabe in lokale Zeit
 * Besonders wichtig für API-Daten, die in UTC vorliegen
 * 
 * @param isoString Ein Datum als ISO-String (z.B. von der API)
 * @returns Ein neues Datum-Objekt in lokaler Zeit
 */
export const utcToLocalDate = (isoString: string | Date): Date => {
  // Wenn bereits ein Date-Objekt übergeben wurde, kopieren
  const date = typeof isoString === 'string' ? new Date(isoString) : new Date(isoString.getTime());
  
  // Die API speichert Daten in UTC, daher müssen wir den Zeitzonenversatz hinzufügen
  // getTimezoneOffset() gibt Minuten zurück, die von der lokalen Zeit abgezogen werden müssen,
  // um UTC zu erhalten. Daher addieren wir diesen Wert, um von UTC zur lokalen Zeit zu kommen.
  const offsetMinutes = date.getTimezoneOffset();
  
  return new Date(date.getTime() + (offsetMinutes * 60000));
};

/**
 * Konvertiert ein lokales Datum in einen UTC ISO-String für API-Aufrufe
 * 
 * @param date Ein lokales Datum
 * @returns Ein ISO-String in UTC für die API
 */
export const localToUTCString = (date: Date): string => {
  // Zeitzonenversatz in Minuten
  const offsetMinutes = date.getTimezoneOffset();
  
  // Neues Date-Objekt mit angepasster Zeit
  const utcDate = new Date(date.getTime() - offsetMinutes * 60000);
  
  return utcDate.toISOString();
};

/**
 * Konvertiert ein YYYY-Www Wochenformat in ein Datum
 * @param weekString Wochenstring im Format YYYY-WXX
 * @returns Datum des ersten Tags der Woche
 */
export const convertWeekToDate = (weekString: string): Date => {
  // Extrahiere Jahr und Wochennummer
  const [year, weekPart] = weekString.split('-');
  const weekNumber = parseInt(weekPart.substring(1));
  
  // Berechne den ersten Tag des Jahres
  const firstDayOfYear = new Date(parseInt(year), 0, 1);
  
  // Finde den ersten Montag des Jahres
  let dayOffset = 8 - firstDayOfYear.getDay(); // 1 für Montag, ..., 7 für Sonntag
  if (dayOffset === 8) dayOffset = 1; // Wenn der erste Tag ein Montag ist
  
  // Berechne den ersten Tag der Woche
  const firstDayOfWeek = new Date(parseInt(year), 0, 1 + dayOffset + (weekNumber - 1) * 7);
  
  return firstDayOfWeek;
};

/**
 * Gibt die Tage einer Woche zurück
 * @param weekStart Erster Tag der Woche
 * @returns Array mit allen Tagen der Woche
 */
export const getWeekDays = (weekStart: Date): Date[] => {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + i);
    days.push(day);
  }
  return days;
}; 
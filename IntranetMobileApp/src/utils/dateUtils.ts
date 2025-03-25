/**
 * Dienstprogramme für Datums- und Zeitbehandlung
 * Bietet Funktionen für konsistentes Handling von Zeitzonen und Formatierungen
 */

/**
 * Formatiert ein Datum in ein lesbares Format (DD.MM.YYYY HH:MM:SS)
 * @param date Das zu formatierende Datum
 * @returns Formatierte Zeichenkette
 */
export const formatDateTime = (date: Date | string | null | undefined): string => {
  if (!date) return '-';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  return `${formatDate(d)} ${formatTime(d)}`;
};

/**
 * Formatiert ein Datum in ein lesbares Datumsformat (DD.MM.YYYY)
 * @param date Das zu formatierende Datum
 * @returns Formatierte Zeichenkette
 */
export const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return '-';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  // Verwende lokale Zeit für Anzeige
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  return `${day}.${month}.${year}`;
};

/**
 * Formatiert ein Datum in ein lesbares Zeitformat (HH:MM:SS)
 * @param date Das zu formatierende Datum
 * @returns Formatierte Zeichenkette
 */
export const formatTime = (date: Date | string | null | undefined): string => {
  if (!date) return '-';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  // Verwende lokale Zeit für Anzeige
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  return `${hours}:${minutes}:${seconds}`;
};

/**
 * Berechnet die Dauer zwischen zwei Datumsangaben
 * @param start Startdatum
 * @param end Enddatum
 * @returns Formatierte Dauer im Format "XXh YYmin"
 */
export const calculateDuration = (
  start: Date | string | null | undefined, 
  end: Date | string | null | undefined
): string => {
  if (!start || !end) return '-';
  
  const startDate = typeof start === 'string' ? new Date(start) : start;
  const endDate = typeof end === 'string' ? new Date(end) : end;
  
  // Differenz in Millisekunden
  const diff = endDate.getTime() - startDate.getTime();
  
  if (diff < 0) return '0h 0min'; // Negative Zeiten verhindern
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${hours}h ${minutes}min`;
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
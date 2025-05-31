import { format, parseISO, differenceInMinutes, parse, getWeek, getYear, addDays, startOfWeek } from 'date-fns';
import { de } from 'date-fns/locale';

/**
 * Utility-Funktionen für die Datums- und Zeitverarbeitung im Frontend.
 * Diese Funktionen sorgen für eine konsistente Handhabung von Datum und Zeit
 * in allen Komponenten.
 */

/**
 * Formatiert ein Datum für die Anzeige im deutschen Format.
 * @param dateString Das zu formatierende Datum im Format YYYY-MM-DD
 * @returns Formatiertes Datum im Format DD.MM.YYYY oder '-' bei Fehler
 */
export const formatDate = (dateString: string): string => {
    if (!dateString) return '-';
    
    try {
        // Wir erstellen ein neues Date-Objekt und setzen die Uhrzeit auf 12:00 Mittag
        // um Probleme mit Zeitzonen zu vermeiden
        const dateParts = dateString.split('-');
        if (dateParts.length !== 3) return '-';
        
        const year = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1; // Monate sind 0-basiert in JavaScript
        const day = parseInt(dateParts[2]);
        
        const date = new Date(year, month, day, 12, 0, 0);
        
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
 * Formatiert eine Zeit für die Anzeige basierend auf UTC.
 * @param dateString Das zu formatierende Datum im ISO-Format
 * @returns Formatierte Zeit im Format HH:MM oder '-' bei Fehler
 */
export const formatTime = (dateString: string): string => {
    if (!dateString) return '-';
    
    try {
        // Direkt aus dem ISO-String die Uhrzeit extrahieren ohne Umrechnung
        const date = parseISO(dateString);
        
        // Verwende UTC-Stunden und -Minuten, um die DB-Zeit direkt zu zeigen
        const hours = date.getUTCHours().toString().padStart(2, '0');
        const minutes = date.getUTCMinutes().toString().padStart(2, '0');
        
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
export const calculateDuration = (startTime: string, endTime: string | null): string => {
    if (!startTime || !endTime) return '-';
    
    try {
        // Entferne das 'Z' am Ende der ISO-Strings, um Zeitzonenumrechnungen zu verhindern
        const startISOString = startTime.endsWith('Z') 
            ? startTime.substring(0, startTime.length - 1)
            : startTime;
        
        const endISOString = endTime.endsWith('Z') 
            ? endTime.substring(0, endTime.length - 1)
            : endTime;
        
        const start = new Date(startISOString);
        const end = new Date(endISOString);
        
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
 * Konvertiert ein Wochenformat (YYYY-Www) in ein Datum (YYYY-MM-DD) für den Montag dieser Woche.
 * @param weekString Wochenformat im Format YYYY-Www
 * @returns Datum des Montags der Woche im Format YYYY-MM-DD
 */
export const convertWeekToDate = (weekString: string): string => {
    try {
        // Format: YYYY-Www
        const year = parseInt(weekString.substring(0, 4));
        const week = parseInt(weekString.substring(6));
        
        // Alternative Methode zur Berechnung des Montags für eine Kalenderwoche
        // Statt parse mit yyyy und ww (was einen Fehler verursacht) verwenden wir
        // einen direkten Algorithmus zur Berechnung
        
        // 1. Beginne mit dem ersten Tag des Jahres
        const firstDayOfYear = new Date(Date.UTC(year, 0, 1, 12, 0, 0));
        
        // 2. Finde den ersten Donnerstag des Jahres (für ISO-Wochen)
        // Verschiebe den Tag, bis wir am ersten Donnerstag sind
        const dayOfWeek = firstDayOfYear.getUTCDay(); // 0 = Sonntag, 4 = Donnerstag
        const daysToThursday = dayOfWeek <= 4 ? 4 - dayOfWeek : 11 - dayOfWeek; // Falls Sonntag ist 7
        const firstThursday = new Date(Date.UTC(year, 0, 1 + daysToThursday, 12, 0, 0));
        
        // 3. Der erste Donnerstag ist immer in der ersten Woche
        // Jetzt berechnen wir den Donnerstag der gewünschten Woche
        const targetThursday = new Date(Date.UTC(
            firstThursday.getUTCFullYear(),
            firstThursday.getUTCMonth(),
            firstThursday.getUTCDate() + (7 * (week - 1)),
            12, 0, 0
        ));
        
        // 4. Berechne den Montag dieser Woche (3 Tage vor dem Donnerstag)
        const monday = new Date(Date.UTC(
            targetThursday.getUTCFullYear(),
            targetThursday.getUTCMonth(),
            targetThursday.getUTCDate() - 3,
            12, 0, 0
        ));
        
        // Formatiere das Datum als YYYY-MM-DD
        const formattedDate = format(monday, 'yyyy-MM-dd');
        
        // Protokolliere das berechnete Datum für Debug-Zwecke
        console.log(`Konvertierte Woche ${weekString} zu Datum: ${formattedDate} (Wochentag: ${format(monday, 'EEEE', { locale: de })})`);
        
        // Zusätzliche Sicherheitsüberprüfung: Stelle sicher, dass es ein Montag ist
        if (format(monday, 'EEEE', { locale: de }) !== 'Montag') {
            console.warn(`Berechnetes Datum ist kein Montag! Korrigiere...`);
            // Finde den nächsten Montag
            const correctedMonday = startOfWeek(monday, { weekStartsOn: 1 });
            return format(correctedMonday, 'yyyy-MM-dd');
        }
        
        return formattedDate;
    } catch (error) {
        console.error('Fehler beim Konvertieren des Wochendatums:', error);
        // Im Fehlerfall den letzten Montag als Fallback verwenden
        const fallbackMonday = startOfWeek(new Date(), { weekStartsOn: 1 });
        return format(fallbackMonday, 'yyyy-MM-dd');
    }
};

/**
 * Prüft, ob ein Worktime-Eintrag für den ausgewählten Tag relevant ist.
 * @param worktime Der Worktime-Eintrag
 * @param selectedDate Ausgewähltes Datum im Format YYYY-MM-DD
 * @returns true, wenn der Eintrag für den ausgewählten Tag relevant ist
 */
export const isWorktimeRelevantForSelectedDate = (worktime: any, selectedDate: string): boolean => {
    try {
        if (!worktime || !worktime.startTime) return false;
        
        // Extrahiere nur den Datumsteil (YYYY-MM-DD) aus dem startTime ISO-String
        const dateOnly = worktime.startTime.split('T')[0];
        
        // Vergleiche mit selectedDate
        return dateOnly === selectedDate;
    } catch (error) {
        console.error("Fehler beim Prüfen der Relevanz eines Worktime-Eintrags:", error);
        return false;
    }
};

/**
 * Berechnet die Wochentage von Montag bis Sonntag basierend auf einem Startdatum.
 * @param weekStartDate Montag der Woche im Format YYYY-MM-DD
 * @returns Array von Objekten mit date und day Eigenschaften
 */
export const getWeekDays = (weekStartDate: string): Array<{ date: string; day: string }> => {
    if (!weekStartDate) return [];
    
    // Beginne mit dem angegebenen Datum als Montag
    const weekStart = new Date(weekStartDate);
    
    // Berechne alle 7 Tage der Woche
    const weekDays: Array<{ date: string; day: string }> = [];
    for (let i = 0; i < 7; i++) {
        const day = addDays(weekStart, i);
        const dayInfo = {
            date: format(day, 'yyyy-MM-dd'),
            day: format(day, 'EEEE', { locale: de })
        };
        weekDays.push(dayInfo);
    }
    
    return weekDays;
};

/**
 * Formatiert ein ISO-DateTime für die Anzeige im deutschen Format mit Uhrzeit.
 * Diese Funktion wird speziell für Cerebro-Artikel verwendet.
 * @param dateTimeString Das zu formatierende Datum im ISO-Format (z.B. 2023-06-15T14:30:00Z)
 * @returns Formatiertes Datum und Uhrzeit im Format DD.MM.YYYY HH:MM
 */
export const formatDateTimeForCerebro = (dateTimeString: string): string => {
    if (!dateTimeString) return '-';
    
    try {
        const date = new Date(dateTimeString);
        
        // Datum und Uhrzeit im deutschen Format
        return date.toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        console.error('Fehler beim Formatieren des Datums und der Zeit:', error);
        return '-';
    }
};

/**
 * Hilfsfunktionen für die Datumsbehandlung im Frontend
 */

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

/* CLAUDE-ANCHOR: TIMEZONE-CONVERSION-001 - Zentrale Timezone-sichere Konvertierung für datetime-local Inputs */
/**
 * KRITISCH: Konvertiert datetime-local Input-Werte korrekt für die API.
 * 
 * PROBLEM: datetime-local gibt lokale Zeit zurück (z.B. "2024-01-15T14:01")
 * Wenn wir einfach ":00.000" anhängen, wird es als UTC interpretiert → 5h Unterschied!
 * 
 * LÖSUNG: Explizit als lokale Zeit interpretieren und korrekt formatieren.
 * 
 * @param datetimeLocalValue Wert aus datetime-local Input (Format: "YYYY-MM-DDTHH:mm")
 * @returns ISO-String der als lokale Zeit interpretiert wird (ohne 'Z' Suffix)
 * 
 * @example
 * Input: "2024-01-15T14:01" (User gibt 14:01 ein)
 * Output: "2024-01-15T14:01:00.000" (wird als lokale Zeit gespeichert)
 * Nicht: "2024-01-15T14:01:00.000Z" (würde als UTC interpretiert)
 */
export const convertDatetimeLocalToApi = (datetimeLocalValue: string): string => {
    if (!datetimeLocalValue) {
        throw new Error('Datetime-local Wert ist erforderlich');
    }
    
    try {
        // datetime-local Format: "YYYY-MM-DDTHH:mm"
        // Wir fügen nur Sekunden und Millisekunden hinzu, KEIN 'Z' Suffix
        const apiFormat = `${datetimeLocalValue}:00.000`;
        
        // Zusätzliche Validierung: Prüfe ob das Format gültig ist
        if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}$/.test(apiFormat)) {
            throw new Error(`Ungültiges Datumsformat: ${apiFormat}`);
        }
        
        return apiFormat;
    } catch (error) {
        console.error('Fehler bei der Datetime-Local Konvertierung:', error);
        throw new Error(`Konvertierung von datetime-local fehlgeschlagen: ${datetimeLocalValue}`);
    }
};

/**
 * KRITISCH: Konvertiert API-Zeitstempel zurück zu datetime-local Format.
 * 
 * Wird verwendet beim Bearbeiten von Zeiten - konvertiert DB-Zeit zurück zu Input-Format.
 * Behandelt sowohl UTC-Timestamps (mit 'Z') als auch lokale Timestamps (ohne 'Z').
 * 
 * @param apiTimestamp Zeitstempel aus der API (ISO-String)
 * @returns Formatiert für datetime-local Input (Format: "YYYY-MM-DDTHH:mm")
 * 
 * @example
 * Input: "2024-01-15T14:01:00.000Z" (UTC aus DB)
 * Output: "2024-01-15T14:01" (für datetime-local Input)
 */
export const convertApiToDatetimeLocal = (apiTimestamp: string): string => {
    if (!apiTimestamp) {
        throw new Error('API-Timestamp ist erforderlich');
    }
    
    try {
        // Entferne das 'Z' am Ende des Strings, damit JS den Zeitstempel nicht als UTC interpretiert
        // Dies ist wichtig für konsistente Zeitbehandlung
        const localISOString = apiTimestamp.endsWith('Z')
            ? apiTimestamp.substring(0, apiTimestamp.length - 1)
            : apiTimestamp;
        
        const date = new Date(localISOString);
        
        // Validierung: Prüfe ob das Datum gültig ist
        if (isNaN(date.getTime())) {
            throw new Error(`Ungültiger Zeitstempel: ${apiTimestamp}`);
        }
        
        // Formatiere für datetime-local Input: "YYYY-MM-DDTHH:mm"
        const formattedDate = format(date, 'yyyy-MM-dd');
        const formattedTime = format(date, 'HH:mm');
        
        return `${formattedDate}T${formattedTime}`;
    } catch (error) {
        console.error('Fehler bei der API-zu-Datetime-Local Konvertierung:', error);
        throw new Error(`Konvertierung von API-Timestamp fehlgeschlagen: ${apiTimestamp}`);
    }
}; 
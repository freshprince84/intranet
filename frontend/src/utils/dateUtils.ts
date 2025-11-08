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
 * Berechnet die Quinzena (15-Tage-Periode) für ein gegebenes Datum.
 * Quinzenas sind monatsbasiert:
 * - Erste Quinzena: 1.-15. des Monats
 * - Zweite Quinzena: 16. bis letzter Tag des Monats
 * @param date Datum im Format YYYY-MM-DD
 * @returns Quinzena-String im Format YYYY-MM-Qq (z.B. "2025-01-Q1" für erste Quinzena Januar)
 */
export const getQuinzenaFromDate = (date: string): string => {
    try {
        const dateObj = new Date(date + 'T12:00:00');
        const year = dateObj.getFullYear();
        const month = dateObj.getMonth() + 1; // 1-12
        const day = dateObj.getDate();
        
        // Erste Quinzena: 1.-15., Zweite Quinzena: 16.-Monatsende
        const quinzena = day <= 15 ? 1 : 2;
        
        return `${year}-${String(month).padStart(2, '0')}-Q${quinzena}`;
    } catch (error) {
        console.error('Fehler beim Berechnen der Quinzena:', error);
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth() + 1;
        return `${year}-${String(month).padStart(2, '0')}-Q1`;
    }
};

/**
 * Konvertiert eine Quinzena (YYYY-MM-Qq) in das Startdatum (erster Tag der Quinzena).
 * @param quinzenaString Quinzena im Format YYYY-MM-Qq (z.B. "2025-01-Q1")
 * @returns Datum des ersten Tages der Quinzena im Format YYYY-MM-DD
 */
export const convertQuinzenaToDate = (quinzenaString: string): string => {
    try {
        // Format: YYYY-MM-Qq oder YYYY-Qqq (für Rückwärtskompatibilität)
        let year: number, month: number, quinzena: number;
        
        if (quinzenaString.includes('-Q')) {
            // Format: YYYY-MM-Qq oder YYYY-Qqq
            const parts = quinzenaString.split('-Q');
            const datePart = parts[0];
            quinzena = parseInt(parts[1]);
            
            if (datePart.includes('-')) {
                // Format: YYYY-MM-Qq
                const dateParts = datePart.split('-');
                year = parseInt(dateParts[0]);
                month = parseInt(dateParts[1]);
            } else {
                // Format: YYYY-Qqq (Rückwärtskompatibilität - berechne Monat basierend auf Quinzena)
                year = parseInt(datePart);
                // Für alte Format: Q1 = Jan, Q2 = Feb, etc. (vereinfacht)
                month = Math.ceil(quinzena / 2);
            }
        } else {
            throw new Error('Ungültiges Quinzena-Format');
        }
        
        // Erste Quinzena beginnt am 1., zweite am 16.
        const startDay = quinzena === 1 ? 1 : 16;
        
        const quinzenaStart = new Date(Date.UTC(year, month - 1, startDay, 12, 0, 0));
        return format(quinzenaStart, 'yyyy-MM-dd');
    } catch (error) {
        console.error('Fehler beim Konvertieren der Quinzena:', error);
        const fallback = startOfWeek(new Date(), { weekStartsOn: 1 });
        return format(fallback, 'yyyy-MM-dd');
    }
};

/**
 * Berechnet alle Tage einer Quinzena basierend auf einem Startdatum.
 * Erste Quinzena: 15 Tage (1.-15.), Zweite Quinzena: variabel (16.-Monatsende)
 * @param quinzenaStartDate Erster Tag der Quinzena im Format YYYY-MM-DD
 * @returns Array von Objekten mit date und day Eigenschaften
 */
export const getQuinzenaDays = (quinzenaStartDate: string): Array<{ date: string; day: string }> => {
    if (!quinzenaStartDate) return [];
    
    const start = new Date(quinzenaStartDate);
    const year = start.getFullYear();
    const month = start.getMonth(); // 0-11
    const day = start.getDate();
    
    // Bestimme Anzahl der Tage in der Quinzena
    let daysCount: number;
    if (day === 1) {
        // Erste Quinzena: immer 15 Tage
        daysCount = 15;
    } else {
        // Zweite Quinzena: 16. bis Monatsende
        // Berechne letzter Tag des Monats
        const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
        daysCount = lastDayOfMonth - 15; // 16. bis Monatsende
    }
    
    const quinzenaDays: Array<{ date: string; day: string }> = [];
    
    for (let i = 0; i < daysCount; i++) {
        const currentDay = addDays(start, i);
        const dayInfo = {
            date: format(currentDay, 'yyyy-MM-dd'),
            day: format(currentDay, 'EEEE', { locale: de })
        };
        quinzenaDays.push(dayInfo);
    }
    
    return quinzenaDays;
};

/**
 * Berechnet die aktuelle Quinzena im Format YYYY-MM-Qq.
 * @returns Quinzena-String im Format YYYY-MM-Qq (z.B. "2025-01-Q1")
 */
export const getCurrentQuinzena = (): string => {
    const today = new Date();
    return getQuinzenaFromDate(format(today, 'yyyy-MM-dd'));
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

/**
 * Formatiert die Gesamtdauer einer Liste von Beratungen in Stunden und Minuten.
 * Berücksichtigt nur abgeschlossene Beratungen (mit endTime).
 * 
 * @param consultations Array von Consultation-Objekten
 * @returns Formatierte Gesamtdauer als "Xh Ym" oder "0h 0m" bei leerer Liste
 * 
 * @example
 * // Bei Beratungen mit Gesamtdauer von 125 Minuten
 * formatTotalDuration(consultations) // "2h 5m"
 */
export const formatTotalDuration = (consultations: Array<{ startTime: string; endTime: string | null }>): string => {
    try {
        // Berechne die Gesamtdauer in Minuten
        const totalMinutes = consultations.reduce((total, consultation) => {
            // Nur abgeschlossene Beratungen berücksichtigen
            if (!consultation.endTime) return total;
            
            // Berechne Dauer dieser Beratung in Minuten
            const startTime = consultation.startTime.endsWith('Z') 
                ? consultation.startTime.substring(0, consultation.startTime.length - 1)
                : consultation.startTime;
            
            const endTime = consultation.endTime.endsWith('Z') 
                ? consultation.endTime.substring(0, consultation.endTime.length - 1)
                : consultation.endTime;
            
            const start = new Date(startTime);
            const end = new Date(endTime);
            
            const durationMs = end.getTime() - start.getTime();
            const durationMinutes = Math.floor(durationMs / (1000 * 60));
            
            return total + durationMinutes;
        }, 0);
        
        // Konvertiere zu Stunden und Minuten
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        
        return `${hours}h ${minutes}m`;
    } catch (error) {
        console.error('Fehler bei der Formatierung der Gesamtdauer:', error);
        return '0h 0m';
    }
};

/**
 * Prüft, ob eine Beratung bereits abgerechnet wurde.
 * 
 * @param consultation Consultation-Objekt
 * @returns true wenn abgerechnet, false wenn nicht
 */
export const isConsultationInvoiced = (consultation: { invoiceItems?: Array<{ invoice: { status: string } }> }): boolean => {
    return !!(consultation.invoiceItems && consultation.invoiceItems.length > 0);
};

/**
 * Holt die Rechnungsinformationen einer Beratung.
 * 
 * @param consultation Consultation-Objekt
 * @returns Rechnungsinfo oder null wenn nicht abgerechnet
 */
export const getConsultationInvoiceInfo = (consultation: { invoiceItems?: Array<{ invoice: { id: number; invoiceNumber: string; status: string; issueDate: string; total: number } }> }) => {
    if (!consultation.invoiceItems || consultation.invoiceItems.length === 0) {
        return null;
    }
    
    // Nimm die erste (und normalerweise einzige) Rechnung
    const firstItem = consultation.invoiceItems[0];
    return firstItem.invoice;
};

/**
 * Erstellt einen benutzerfreundlichen Text für den Rechnungsstatus.
 * 
 * @param status Rechnungsstatus
 * @returns Deutscher Status-Text
 */
export const getInvoiceStatusText = (status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED'): string => {
    const statusMap = {
        'DRAFT': 'Entwurf',
        'SENT': 'Gesendet',
        'PAID': 'Bezahlt',
        'OVERDUE': 'Überfällig',
        'CANCELLED': 'Storniert'
    };
    return statusMap[status] || status;
};

/**
 * Gibt die Farbe für einen Rechnungsstatus zurück.
 * 
 * @param status Rechnungsstatus
 * @returns CSS-Klassen für die Statusfarbe
 */
export const getInvoiceStatusColor = (status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED'): string => {
    const colorMap = {
        'DRAFT': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        'SENT': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
        'PAID': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        'OVERDUE': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
        'CANCELLED': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
}; 
import axiosInstance from '../config/axios.ts';

/**
 * API-Funktionen für die Zeiterfassung
 */

interface WorktimeEntry {
  id: number;
  startTime: string;
  endTime: string | null;
  userId: number;
  branch: {
    id: number;
    name: string;
  };
  isDeleted?: boolean;
}

/**
 * Startet eine neue Zeiterfassung
 * @param userId Benutzer-ID
 * @param startTime Startzeit (ISO-String)
 * @param comment Optionaler Kommentar
 * @returns Die erstellte Zeiterfassung
 */
export const startWorktime = async (
  userId: number, 
  startTime: string, 
  comment?: string
) => {
  try {
    const response = await axiosInstance.post('/worktime', {
      userId,
      startTime,
      comment
    });
    return response.data;
  } catch (error) {
    console.error('Fehler beim Starten der Zeiterfassung:', error);
    throw error;
  }
};

/**
 * Stoppt eine laufende Zeiterfassung
 * @param userId Benutzer-ID
 * @param endTime Endzeit (ISO-String)
 * @returns Die aktualisierte Zeiterfassung
 */
export const stopWorktime = async (
  userId: number,
  endTime: string
) => {
  try {
    const response = await axiosInstance.put(`/worktime/stop/${userId}`, {
      endTime
    });
    return response.data;
  } catch (error) {
    console.error('Fehler beim Stoppen der Zeiterfassung:', error);
    throw error;
  }
};

/**
 * Holt alle Zeiterfassungen eines Benutzers für einen bestimmten Tag
 * @param userId Benutzer-ID
 * @param date Datum im Format YYYY-MM-DD
 * @returns Liste der Zeiterfassungen
 */
export const getWorktimesByUserAndDate = async (
  userId: number,
  date: string
) => {
  try {
    const response = await axiosInstance.get(`/worktime/user/${userId}/date/${date}`);
    return response.data;
  } catch (error) {
    console.error('Fehler beim Abrufen der Zeiterfassungen:', error);
    throw error;
  }
};

/**
 * Aktualisiert eine einzelne Zeiterfassung
 * @param entryId ID der Zeiterfassung
 * @param data Update-Daten (startTime, endTime)
 * @returns Die aktualisierte Zeiterfassung
 */
export const updateWorktimeEntry = async (
  entryId: number,
  data: { startTime?: string; endTime?: string | null }
) => {
  try {
    // Sende die Daten unverändert, ohne weitere Zeitzonenkonvertierung
    const response = await axiosInstance.put(`/worktime/${entryId}`, data);
    return response.data;
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Zeiterfassung:', error);
    throw error;
  }
};

/**
 * Löscht eine Zeiterfassung
 * @param entryId ID der Zeiterfassung
 * @returns Status der Löschoperation
 */
export const deleteWorktimeEntry = async (entryId: number) => {
  try {
    const response = await axiosInstance.delete(`/worktime/${entryId}`);
    return response.data;
  } catch (error) {
    console.error('Fehler beim Löschen der Zeiterfassung:', error);
    throw error;
  }
};

/**
 * Führt mehrere Aktualisierungen von Zeiterfassungen in einem Batch durch
 * @param entries Liste der zu aktualisierenden Zeiterfassungen
 * @returns Status der Batch-Operation
 */
export const updateWorktimeEntries = async (entries: WorktimeEntry[]) => {
  try {
    // Filtern, um nur Einträge zu behalten, die aktualisiert oder gelöscht werden sollen
    const entriesToUpdate = entries.filter(entry => !entry.isDeleted);
    const entriesToDelete = entries.filter(entry => entry.isDeleted).map(entry => entry.id);
    
    // Sequentiell jeden Eintrag aktualisieren
    // Dabei nur die wirklich notwendigen Felder extrahieren
    const updatePromises = entriesToUpdate.map(entry => 
      axiosInstance.put(`/worktime/${entry.id}`, {
        startTime: entry.startTime,  // ISO-String ohne Zeitzone
        endTime: entry.endTime       // ISO-String ohne Zeitzone oder null
      })
    );
    
    // Sequentiell jeden zu löschenden Eintrag löschen
    const deletePromises = entriesToDelete.map(id => 
      axiosInstance.delete(`/worktime/${id}`)
    );
    
    // Alle Promises ausführen
    await Promise.all([...updatePromises, ...deletePromises]);
    
    return { success: true };
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Zeiterfassungen:', error);
    throw error;
  }
}; 
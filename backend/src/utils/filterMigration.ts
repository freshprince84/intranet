/**
 * Zentrale Migration-Logik für Filter sortDirections
 * 
 * Konvertiert altes Format (Record/Objekt) zu neuem Format (Array)
 * Altes Format: { "status": "asc", "branch": "desc" }
 * Neues Format: [{ column: "status", direction: "asc", priority: 1 }, ...]
 */

export interface SortDirection {
  column: string;
  direction: 'asc' | 'desc';
  priority: number;
  conditionIndex?: number;
}

/**
 * Migriert sortDirections von altem Format (Objekt) zu neuem Format (Array)
 * 
 * @param sortDirectionsJson - JSON-String aus Datenbank
 * @returns Array von SortDirection-Objekten
 */
export function migrateSortDirections(sortDirectionsJson: string | null | undefined): SortDirection[] {
  if (!sortDirectionsJson) {
    return [];
  }

  try {
    // Prüfe, ob es ein "null" String ist
    if (sortDirectionsJson.trim() === 'null' || sortDirectionsJson.trim() === '') {
      return [];
    }

    const parsed = JSON.parse(sortDirectionsJson);

    // Neues Format: Bereits ein Array
    if (Array.isArray(parsed)) {
      return parsed;
    }

    // Altes Format: Objekt/Record
    if (typeof parsed === 'object' && parsed !== null) {
      return Object.entries(parsed).map(([column, direction], index) => ({
        column,
        direction: direction as 'asc' | 'desc',
        priority: index + 1
      }));
    }

    // Unbekanntes Format: Leeres Array zurückgeben
    return [];
  } catch (e) {
    console.error('Fehler beim Parsen von sortDirections:', e);
    return [];
  }
}


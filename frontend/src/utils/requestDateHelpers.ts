/**
 * Berechnet das Mindestdatum für due_date basierend auf Request Type
 * @param type - Der Request Type
 * @returns Datum im Format YYYY-MM-DD
 */
export const getMinDateForType = (type: string): string => {
  const today = new Date();
  const minDate = new Date(today);
  
  switch (type) {
    case 'vacation':
    case 'event':
    case 'permit':
      // +1 Monat
      minDate.setMonth(minDate.getMonth() + 1);
      break;
    case 'improvement_suggestion':
    case 'sick_leave':
    case 'employment_certificate':
    case 'other':
      // +1 Woche
      minDate.setDate(minDate.getDate() + 7);
      break;
    case 'buy_order':
    case 'repair':
      // Heute (keine Änderung)
      break;
    default:
      // Default: +1 Woche
      minDate.setDate(minDate.getDate() + 7);
  }
  
  return minDate.toISOString().split('T')[0];
};

/**
 * Berechnet das Voreingestellte Datum für due_date basierend auf Request Type
 * @param type - Der Request Type
 * @returns Datum im Format YYYY-MM-DD
 */
export const getDefaultDateForType = (type: string): string => {
  return getMinDateForType(type); // Gleiche Logik wie Mindestdatum
};


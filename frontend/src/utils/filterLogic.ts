/**
 * Zentrale Filter-Logik zur Eliminierung von Code-Duplikation
 * 
 * Diese Datei konsolidiert die Filter-Logik, die zuvor in mehreren Komponenten
 * dupliziert war (Requests.tsx, Worktracker.tsx, InvoiceManagementTab.tsx, etc.)
 * 
 * WICHTIG: Die Logik ist exakt identisch mit der vorherigen Implementierung.
 * Nur die Code-Duplikation wurde entfernt, keine Funktionalitätsänderung!
 */

import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

export interface FilterCondition {
  column: string;
  operator: string;
  value: string | number | Date | null;
}

/**
 * Evaluates a single filter condition against a field value
 * @param fieldValue - The value to test against
 * @param condition - The filter condition to apply
 * @returns true if condition is met, false otherwise
 */
export const evaluateCondition = (
  fieldValue: any,
  condition: FilterCondition
): boolean => {
  const { operator, value } = condition;
  
  // Sicherstellen, dass value definiert ist
  if (value === undefined) {
    console.error('evaluateCondition: value ist undefined', condition);
    return false;
  }
  
  // Handle null/undefined values
  if (fieldValue == null && value == null) {
    return operator === 'equals';
  }
  if (fieldValue == null || value == null) {
    if (operator === 'notEquals') return true;
    return false;
  }

  // String operations
  // Sicherstellen, dass fieldValue und value Strings sind, bevor toLowerCase() aufgerufen wird
  let strField: string = '';
  let strValue: string = '';
  
  try {
    // Konvertiere fieldValue zu String, auch wenn es ein Objekt ist
    const fieldValueStr = fieldValue == null ? '' : (typeof fieldValue === 'string' ? fieldValue : String(fieldValue));
    if (typeof fieldValueStr !== 'string') {
      return false;
    }
    const lowerField = fieldValueStr.toLowerCase();
    if (lowerField === undefined || lowerField === null || typeof lowerField !== 'string') {
      return false;
    }
    strField = lowerField;
    
    // Konvertiere value zu String, auch wenn es ein Objekt ist
    const valueStr = value == null ? '' : (typeof value === 'string' ? value : String(value));
    if (typeof valueStr !== 'string') {
      return false;
    }
    const lowerValue = valueStr.toLowerCase();
    if (lowerValue === undefined || lowerValue === null || typeof lowerValue !== 'string') {
      return false;
    }
    strValue = lowerValue;
  } catch (error) {
    // Falls toLowerCase() fehlschlägt, gebe false zurück
    return false;
  }

  // Sicherstellen, dass strField und strValue Strings sind und nicht undefined
  if (typeof strField !== 'string' || typeof strValue !== 'string' || strField === undefined || strValue === undefined || strField === null || strValue === null) {
    return false;
  }

  switch (operator) {
    case 'equals':
      return strField === strValue;
    case 'notEquals':
      return strField !== strValue;
    case 'contains':
      return strField.includes(strValue);
    case 'startsWith':
      return strField.startsWith(strValue);
    case 'endsWith':
      // Explizite Prüfung, dass strField und strValue Strings sind, bevor endsWith aufgerufen wird
      if (strField === undefined || strField === null) {
        console.error('endsWith: strField ist undefined/null', { strField, strValue, fieldValue, value, condition });
        return false;
      }
      if (strValue === undefined || strValue === null) {
        console.error('endsWith: strValue ist undefined/null', { strField, strValue, fieldValue, value, condition });
        return false;
      }
      if (typeof strField !== 'string') {
        console.error('endsWith: strField ist kein String', { strField, typeof: typeof strField, strValue, fieldValue, value, condition });
        return false;
      }
      if (typeof strValue !== 'string') {
        console.error('endsWith: strValue ist kein String', { strField, strValue, typeof: typeof strValue, fieldValue, value, condition });
        return false;
      }
      try {
        return strField.endsWith(strValue);
      } catch (error) {
        console.error('endsWith: Fehler bei endsWith-Aufruf', error, { strField, strValue, fieldValue, value, condition });
        return false;
      }
    case 'before':
    case 'after': {
      // Date operations
      const fieldDate = new Date(fieldValue);
      const valueDate = new Date(value as string);
      if (isNaN(fieldDate.getTime()) || isNaN(valueDate.getTime())) {
        return false;
      }
      return operator === 'before' 
        ? fieldDate < valueDate 
        : fieldDate > valueDate;
    }
    case 'greaterThan':
    case 'lessThan': {
      // Numeric operations
      const fieldNum = parseFloat(String(fieldValue));
      const valueNum = parseFloat(String(value));
      if (isNaN(fieldNum) || isNaN(valueNum)) {
        return false;
      }
      return operator === 'greaterThan'
        ? fieldNum > valueNum
        : fieldNum < valueNum;
    }
    default:
      return true;
  }
};

/**
 * Type for getting field values from items
 */
export type GetFieldValue<T> = (item: T, columnId: string) => any;

/**
 * Type for column-specific evaluation handlers
 * Returns true if condition is met, false otherwise
 */
export type ColumnEvaluator<T> = (item: T, condition: FilterCondition) => boolean | null;

/**
 * Applies filter conditions to an array of items
 * 
 * @param items - Array of items to filter
 * @param conditions - Array of filter conditions
 * @param operators - Array of logical operators ('AND' | 'OR') between conditions
 * @param getFieldValue - Function to extract field values from items
 * @param columnEvaluators - Optional map of column-specific evaluators for custom logic
 * @returns Filtered array of items
 * 
 * @example
 * // Standard usage with getFieldValue
 * const filtered = applyFilters(items, conditions, operators, (item, col) => item[col]);
 * 
 * // With custom column evaluators
 * const filtered = applyFilters(
 *   items,
 *   conditions,
 *   operators,
 *   (item, col) => item[col],
 *   {
 *     'responsible': (item, condition) => {
 *       // Custom logic for responsible column
 *       return evaluateUserRoleCondition(item.responsible?.id, item.role?.id, condition);
 *     }
 *   }
 * );
 */
export const applyFilters = <T>(
  items: T[],
  conditions: FilterCondition[],
  operators: ('AND' | 'OR')[],
  getFieldValue: GetFieldValue<T>,
  columnEvaluators?: Record<string, ColumnEvaluator<T>>
): T[] => {
  if (conditions.length === 0) {
    return items;
  }

  return items.filter(item => {
    let result = true;

    for (let i = 0; i < conditions.length; i++) {
      const condition = conditions[i];
      let conditionMet = false;

      // Check if there's a custom evaluator for this column
      if (columnEvaluators && columnEvaluators[condition.column]) {
        const customResult = columnEvaluators[condition.column](item, condition);
        if (customResult !== null) {
          conditionMet = customResult;
        } else {
          // Fallback to standard evaluation if custom evaluator returns null
          const fieldValue = getFieldValue(item, condition.column);
          conditionMet = evaluateCondition(fieldValue, condition);
        }
      } else {
        // Standard evaluation
        const fieldValue = getFieldValue(item, condition.column);
        conditionMet = evaluateCondition(fieldValue, condition);
      }

      // Apply logical operators
      if (i === 0) {
        result = conditionMet;
      } else {
        const operator = operators[i - 1] || 'AND';
        result = operator === 'AND' 
          ? (result && conditionMet) 
          : (result || conditionMet);
      }
    }

    return result;
  });
};

/**
 * Helper function to evaluate date conditions with proper date comparison
 * Supports __TODAY__ as a dynamic date value
 * 
 * WICHTIG: Extrahiert nur den Datumsteil (Jahr, Monat, Tag) ohne Zeitzone,
 * um Zeitzone-Konvertierungsprobleme zu vermeiden (verhindert Tag-Versatz)
 */
export const evaluateDateCondition = (
  dateValue: Date | string | null | undefined,
  condition: FilterCondition
): boolean => {
  if (!dateValue) {
    return false;
  }

  const date = new Date(dateValue);
  if (isNaN(date.getTime())) {
    return false;
  }

  // Extrahiere nur den Datumsteil (Jahr, Monat, Tag) mit UTC-Methoden
  // Dies verhindert Zeitzone-Konvertierung, die zu einem Tag-Versatz führt
  const dateYear = date.getUTCFullYear();
  const dateMonth = date.getUTCMonth();
  const dateDay = date.getUTCDate();
  // Erstelle lokales Date-Objekt aus den UTC-Werten (ohne Zeitzone)
  const normalizedDate = new Date(dateYear, dateMonth, dateDay);

  // ✅ PHASE 5: Handle Zeitraum-Platzhalter (__THIS_WEEK__, __THIS_MONTH__, __THIS_YEAR__)
  // Diese funktionieren analog zu __TODAY__, aber für Zeiträume
  try {
    if (condition.value === '__THIS_WEEK__') {
      if (condition.operator === 'equals') {
        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
        weekEnd.setHours(23, 59, 59, 999);
        // Prüfe, ob normalizedDate innerhalb des Zeitraums liegt
        return normalizedDate >= weekStart && normalizedDate <= weekEnd;
      }
      // Für andere Operatoren (before, after) verwende Woche als einzelnes Datum
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
      weekEnd.setHours(23, 59, 59, 999);
      if (condition.operator === 'before') {
        return normalizedDate < weekEnd;
      } else if (condition.operator === 'after') {
        return normalizedDate > weekStart;
      }
      return false;
    } else if (condition.value === '__THIS_MONTH__') {
      if (condition.operator === 'equals') {
        const monthStart = startOfMonth(new Date());
        monthStart.setHours(0, 0, 0, 0);
        const monthEnd = endOfMonth(new Date());
        monthEnd.setHours(23, 59, 59, 999);
        // Prüfe, ob normalizedDate innerhalb des Zeitraums liegt
        return normalizedDate >= monthStart && normalizedDate <= monthEnd;
      }
      // Für andere Operatoren (before, after) verwende Monat als einzelnes Datum
      const monthStart = startOfMonth(new Date());
      monthStart.setHours(0, 0, 0, 0);
      const monthEnd = endOfMonth(new Date());
      monthEnd.setHours(23, 59, 59, 999);
      if (condition.operator === 'before') {
        return normalizedDate < monthEnd;
      } else if (condition.operator === 'after') {
        return normalizedDate > monthStart;
      }
      return false;
    } else if (condition.value === '__THIS_YEAR__') {
      if (condition.operator === 'equals') {
        const yearStart = startOfYear(new Date());
        yearStart.setHours(0, 0, 0, 0);
        const yearEnd = endOfYear(new Date());
        yearEnd.setHours(23, 59, 59, 999);
        // Prüfe, ob normalizedDate innerhalb des Zeitraums liegt
        return normalizedDate >= yearStart && normalizedDate <= yearEnd;
      }
      // Für andere Operatoren (before, after) verwende Jahr als einzelnes Datum
      const yearStart = startOfYear(new Date());
      yearStart.setHours(0, 0, 0, 0);
      const yearEnd = endOfYear(new Date());
      yearEnd.setHours(23, 59, 59, 999);
      if (condition.operator === 'before') {
        return normalizedDate < yearEnd;
      } else if (condition.operator === 'after') {
        return normalizedDate > yearStart;
      }
      return false;
    }

    // Handle __TODAY__, __WEEK_START__, __WEEK_END__, __MONTH_START__, __MONTH_END__, __YEAR_START__, __YEAR_END__ dynamic dates
    let conditionDate: Date;
    if (condition.value === '__TODAY__') {
      // Get today's date in local timezone (set to midnight)
      const localToday = new Date();
      localToday.setHours(0, 0, 0, 0);
      conditionDate = localToday;
    } else if (condition.value === '__WEEK_START__') {
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      weekStart.setHours(0, 0, 0, 0);
      conditionDate = weekStart;
    } else if (condition.value === '__WEEK_END__') {
      const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
      weekEnd.setHours(23, 59, 59, 999);
      conditionDate = weekEnd;
    } else if (condition.value === '__MONTH_START__') {
      const monthStart = startOfMonth(new Date());
      monthStart.setHours(0, 0, 0, 0);
      conditionDate = monthStart;
    } else if (condition.value === '__MONTH_END__') {
      const monthEnd = endOfMonth(new Date());
      monthEnd.setHours(23, 59, 59, 999);
      conditionDate = monthEnd;
    } else if (condition.value === '__YEAR_START__') {
      const yearStart = startOfYear(new Date());
      yearStart.setHours(0, 0, 0, 0);
      conditionDate = yearStart;
    } else if (condition.value === '__YEAR_END__') {
      const yearEnd = endOfYear(new Date());
      yearEnd.setHours(23, 59, 59, 999);
      conditionDate = yearEnd;
    } else {
      const conditionDateRaw = new Date(condition.value as string);
      if (isNaN(conditionDateRaw.getTime())) {
        return false;
      }
      // Extrahiere nur den Datumsteil (Jahr, Monat, Tag) mit UTC-Methoden
      // Dies verhindert Zeitzone-Konvertierung, die zu einem Tag-Versatz führt
      const conditionYear = conditionDateRaw.getUTCFullYear();
      const conditionMonth = conditionDateRaw.getUTCMonth();
      const conditionDay = conditionDateRaw.getUTCDate();
      // Erstelle lokales Date-Objekt aus den UTC-Werten (ohne Zeitzone)
      conditionDate = new Date(conditionYear, conditionMonth, conditionDay);
    }

    switch (condition.operator) {
      case 'equals':
        return normalizedDate.getTime() === conditionDate.getTime();
      case 'before':
        return normalizedDate < conditionDate;
      case 'after':
        return normalizedDate > conditionDate;
      default:
        return true;
    }
  } catch (error) {
    // ✅ PHASE 5: Error Handling für ungültige Platzhalter-Werte
    console.error(`[evaluateDateCondition] Error with placeholder ${condition.value}:`, error);
    return false; // Fallback: Filter schließt Datensatz aus
  }
};

/**
 * Helper function to evaluate user/role conditions with user-{id} or role-{id} format
 * Supports both user-{id} and role-{id} formats, plus text fallback for legacy support
 */
export const evaluateUserRoleCondition = (
  userId: number | null | undefined,
  roleId: number | null | undefined,
  condition: FilterCondition,
  textValue?: string  // Optional: text representation for fallback (e.g. "John Doe")
): boolean => {
  const value = condition.value as string || '';
  
  // Handle user-{id} format
  if (value.startsWith('user-')) {
    const targetUserId = parseInt(value.replace('user-', ''), 10);
    if (isNaN(targetUserId)) return false;
    const matches = userId === targetUserId;
    // Unterstütze notEquals Operator
    if (condition.operator === 'notEquals') {
      return !matches;
    }
    return matches;
  }
  
  // Handle role-{id} format
  if (value.startsWith('role-')) {
    const targetRoleId = parseInt(value.replace('role-', ''), 10);
    if (isNaN(targetRoleId)) return false;
    const matches = roleId === targetRoleId;
    // Unterstütze notEquals Operator
    if (condition.operator === 'notEquals') {
      return !matches;
    }
    return matches;
  }
  
  // Empty value matches all
  if (value === '') {
    return true;
  }
  
  // Fallback to text comparison (legacy support)
  if (textValue !== undefined) {
    const textValueLower = textValue.toLowerCase();
    const valueLower = value.toLowerCase();
    if (condition.operator === 'equals') {
      return textValueLower === valueLower;
    } else if (condition.operator === 'notEquals') {
      return textValueLower !== valueLower;
    } else if (condition.operator === 'contains') {
      return textValueLower.includes(valueLower);
    }
  }
  
  return false;
};

/**
 * Helper function for combined responsible/qualityControl filter (specific to Tasks)
 */
export const evaluateResponsibleAndQualityControl = (
  responsibleId: number | null | undefined,
  responsibleRoleId: number | null | undefined,
  qualityControlId: number | null | undefined,
  condition: FilterCondition,
  responsibleText?: string,
  qualityControlText?: string
): boolean => {
  const value = condition.value as string || '';
  
  // Handle user-{id} format - matches either responsible OR qualityControl
  if (value.startsWith('user-')) {
    const targetUserId = parseInt(value.replace('user-', ''), 10);
    if (isNaN(targetUserId)) return false;
    const matches = (responsibleId === targetUserId) || (qualityControlId === targetUserId);
    // Unterstütze notEquals Operator
    if (condition.operator === 'notEquals') {
      return !matches;
    }
    return matches;
  }
  
  // Handle role-{id} format - only matches with responsible role
  if (value.startsWith('role-')) {
    const targetRoleId = parseInt(value.replace('role-', ''), 10);
    if (isNaN(targetRoleId)) return false;
    const matches = responsibleRoleId === targetRoleId;
    // Unterstütze notEquals Operator
    if (condition.operator === 'notEquals') {
      return !matches;
    }
    return matches;
  }
  
  // Empty value matches all
  if (value === '') {
    return true;
  }
  
  // Fallback to text comparison (legacy support)
  const valueLower = value.toLowerCase();
  if (condition.operator === 'equals') {
    return (responsibleText?.toLowerCase() === valueLower) || (qualityControlText?.toLowerCase() === valueLower);
  } else if (condition.operator === 'notEquals') {
    return (responsibleText?.toLowerCase() !== valueLower) && (qualityControlText?.toLowerCase() !== valueLower);
  } else if (condition.operator === 'contains') {
    return (responsibleText?.toLowerCase()?.includes(valueLower) ?? false) || (qualityControlText?.toLowerCase()?.includes(valueLower) ?? false);
  }
  
  return false;
};


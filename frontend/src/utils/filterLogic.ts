/**
 * Zentrale Filter-Logik zur Eliminierung von Code-Duplikation
 * 
 * Diese Datei konsolidiert die Filter-Logik, die zuvor in mehreren Komponenten
 * dupliziert war (Requests.tsx, Worktracker.tsx, InvoiceManagementTab.tsx, etc.)
 * 
 * WICHTIG: Die Logik ist exakt identisch mit der vorherigen Implementierung.
 * Nur die Code-Duplikation wurde entfernt, keine Funktionalitätsänderung!
 */

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
  let strField: string;
  let strValue: string;
  
  try {
    strField = typeof fieldValue === 'string' ? fieldValue.toLowerCase() : String(fieldValue ?? '').toLowerCase();
    strValue = typeof value === 'string' ? value.toLowerCase() : String(value ?? '').toLowerCase();
  } catch (error) {
    // Falls toLowerCase() fehlschlägt, gebe false zurück
    return false;
  }

  // Sicherstellen, dass strField und strValue Strings sind
  if (typeof strField !== 'string' || typeof strValue !== 'string' || strField === undefined || strValue === undefined) {
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
      return strField.endsWith(strValue);
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

  // Handle __TODAY__ dynamic date
  let conditionDate: Date;
  if (condition.value === '__TODAY__') {
    // Get today's date in local timezone (set to midnight)
    const localToday = new Date();
    localToday.setHours(0, 0, 0, 0);
    conditionDate = localToday;
  } else {
    conditionDate = new Date(condition.value as string);
    if (isNaN(conditionDate.getTime())) {
      return false;
    }
  }

  // Normalize both dates to midnight for accurate comparison
  const normalizedDate = new Date(date);
  normalizedDate.setHours(0, 0, 0, 0);
  const normalizedConditionDate = new Date(conditionDate);
  normalizedConditionDate.setHours(0, 0, 0, 0);

  switch (condition.operator) {
    case 'equals':
      return normalizedDate.getTime() === normalizedConditionDate.getTime();
    case 'before':
      return normalizedDate < normalizedConditionDate;
    case 'after':
      return normalizedDate > normalizedConditionDate;
    default:
      return true;
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
    return (responsibleText?.toLowerCase().includes(valueLower)) || (qualityControlText?.toLowerCase().includes(valueLower));
  }
  
  return false;
};


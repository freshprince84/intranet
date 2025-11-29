import { Prisma } from '@prisma/client';
import { Request } from 'express';
import { isAdminOrOwner } from '../middleware/organization';

/**
 * Filter-Bedingung (wie im Frontend verwendet)
 */
export interface FilterCondition {
  column: string;
  operator: string;
  value: string | number | Date | null;
}

/**
 * Konvertiert Filter-Bedingungen in Prisma Where-Klauseln
 * 
 * Unterstützt:
 * - Einfache Operatoren: equals, notEquals, contains, startsWith, endsWith
 * - Datum-Operatoren: before, after (mit __TODAY__ Unterstützung)
 * - Zahlen-Operatoren: greaterThan, lessThan
 * - UND/ODER-Verknüpfungen
 * - User/Role-Filter (user-{id}, role-{id})
 * 
 * @param conditions - Array von Filter-Bedingungen
 * @param operators - Array von logischen Operatoren ('AND' | 'OR')
 * @param entityType - Entity-Typ ('request' | 'task' | 'tour' | 'tour_booking' | 'reservation') für spezielle Logik
 * @returns Prisma Where-Klausel
 */
export function convertFilterConditionsToPrismaWhere(
  conditions: FilterCondition[],
  operators: ('AND' | 'OR')[],
  entityType: 'request' | 'task' | 'tour' | 'tour_booking' | 'reservation'
): Prisma.RequestWhereInput | Prisma.TaskWhereInput | Prisma.TourWhereInput | Prisma.TourBookingWhereInput | Prisma.ReservationWhereInput | {} {
  if (conditions.length === 0) {
    return {};
  }

  // Konvertiere jede Bedingung in eine Prisma Where-Klausel
  const prismaConditions: any[] = [];

  for (const cond of conditions) {
    const whereClause = convertSingleCondition(cond, entityType);
    if (Object.keys(whereClause).length > 0) {
      prismaConditions.push(whereClause);
    }
  }

  if (prismaConditions.length === 0) {
    return {};
  }

  // UND/ODER-Verknüpfungen
  if (operators.length === 0 || operators.every(op => op === 'AND')) {
    // Alle UND: Kombiniere mit AND
    return { AND: prismaConditions };
  } else if (operators.every(op => op === 'OR')) {
    // Alle ODER: Kombiniere mit OR
    return { OR: prismaConditions };
  } else {
    // Gemischte Verknüpfungen: Gruppiere nach Operator-Sequenz
    const grouped: any[] = [];
    let currentGroup: any[] = [prismaConditions[0]];

    for (let i = 1; i < prismaConditions.length; i++) {
      const operator = operators[i - 1];
      if (operator === 'AND') {
        currentGroup.push(prismaConditions[i]);
      } else {
        // ODER: Aktuelle Gruppe abschließen, neue Gruppe starten
        if (currentGroup.length > 0) {
          grouped.push(currentGroup.length === 1 ? currentGroup[0] : { AND: currentGroup });
        }
        currentGroup = [prismaConditions[i]];
      }
    }

    if (currentGroup.length > 0) {
      grouped.push(currentGroup.length === 1 ? currentGroup[0] : { AND: currentGroup });
    }

    return grouped.length === 1 ? grouped[0] : { OR: grouped };
  }
}

/**
 * Konvertiert eine einzelne Filter-Bedingung in eine Prisma Where-Klausel
 */
function convertSingleCondition(
  condition: FilterCondition,
  entityType: 'request' | 'task' | 'tour' | 'tour_booking' | 'reservation'
): any {
  const { column, operator, value } = condition;

  switch (column) {
    case 'status':
      if (operator === 'equals') {
        return { status: value };
      } else if (operator === 'notEquals') {
        return { status: { not: value } };
      }
      return {};

    case 'title':
      if (operator === 'equals') {
        return { title: { equals: value, mode: 'insensitive' } };
      } else if (operator === 'contains') {
        return { title: { contains: value as string, mode: 'insensitive' } };
      } else if (operator === 'startsWith') {
        return { title: { startsWith: value as string, mode: 'insensitive' } };
      } else if (operator === 'endsWith') {
        return { title: { endsWith: value as string, mode: 'insensitive' } };
      }
      return {};

    case 'type':
      if (operator === 'equals') {
        return { type: value };
      } else if (operator === 'notEquals') {
        return { type: { not: value } };
      }
      return {};

    case 'dueDate':
    case 'tourDate':
    case 'bookingDate':
    case 'checkInDate':
    case 'checkOutDate':
      return convertDateCondition(value, operator, column);

    case 'responsible':
      return convertUserRoleCondition(value, operator, entityType, 'responsible');

    case 'qualityControl':
      if (entityType === 'task') {
        return convertUserRoleCondition(value, operator, entityType, 'qualityControl');
      }
      return {};

    case 'requestedBy':
      if (entityType === 'request') {
        return convertUserRoleCondition(value, operator, entityType, 'requestedBy');
      }
      return {};

    case 'createdBy':
      if (entityType === 'tour') {
        return convertUserRoleCondition(value, operator, entityType, 'createdBy');
      }
      return {};

    case 'bookedBy':
      if (entityType === 'tour_booking') {
        return convertUserRoleCondition(value, operator, entityType, 'bookedBy');
      }
      return {};

    case 'branch':
      return convertBranchCondition(value, operator);

    default:
      // Fallback für unbekannte Spalten
      return {};
  }
}

/**
 * Konvertiert Datum-Bedingungen
 * @param value - Der Datumswert (Date, string oder '__TODAY__')
 * @param operator - Der Operator ('equals', 'before', 'after')
 * @param fieldName - Der Name des Feldes ('dueDate', 'checkInDate', 'checkOutDate', etc.)
 */
function convertDateCondition(value: any, operator: string, fieldName: string = 'dueDate'): any {
  // Handle __TODAY__ dynamic date
  let dateValue: Date;
  if (value === '__TODAY__') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dateValue = today;
  } else {
    dateValue = new Date(value);
    if (isNaN(dateValue.getTime())) {
      return {};
    }
  }

  if (operator === 'equals') {
    const startOfDay = new Date(dateValue);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateValue);
    endOfDay.setHours(23, 59, 59, 999);
    return { [fieldName]: { gte: startOfDay, lte: endOfDay } };
  } else if (operator === 'before') {
    return { [fieldName]: { lt: dateValue } };
  } else if (operator === 'after') {
    return { [fieldName]: { gt: dateValue } };
  }

  return {};
}

/**
 * Konvertiert User/Role-Bedingungen
 */
function convertUserRoleCondition(
  value: any,
  operator: string,
  entityType: 'request' | 'task' | 'tour' | 'tour_booking' | 'reservation',
  field: 'responsible' | 'qualityControl' | 'requestedBy' | 'createdBy' | 'bookedBy'
): any {
  if (typeof value !== 'string') {
    return {};
  }

  // Handle user-{id} format
  if (value.startsWith('user-')) {
    const userId = parseInt(value.replace('user-', ''), 10);
    if (isNaN(userId)) {
      return {};
    }

    if (field === 'responsible') {
      if (entityType === 'task') {
        return operator === 'notEquals'
          ? { responsibleId: { not: userId } }
          : { responsibleId: userId };
      } else if (entityType === 'request') {
        return operator === 'notEquals'
          ? { responsibleId: { not: userId } }
          : { responsibleId: userId };
      }
    } else if (field === 'qualityControl' && entityType === 'task') {
      return operator === 'notEquals'
        ? { qualityControlId: { not: userId } }
        : { qualityControlId: userId };
    } else if (field === 'requestedBy' && entityType === 'request') {
      return operator === 'notEquals'
        ? { requesterId: { not: userId } }
        : { requesterId: userId };
    } else if (field === 'createdBy' && entityType === 'tour') {
      return operator === 'notEquals'
        ? { createdById: { not: userId } }
        : { createdById: userId };
    } else if (field === 'bookedBy' && entityType === 'tour_booking') {
      return operator === 'notEquals'
        ? { bookedById: { not: userId } }
        : { bookedById: userId };
    }
  }

  // Handle role-{id} format
  if (value.startsWith('role-')) {
    const roleId = parseInt(value.replace('role-', ''), 10);
    if (isNaN(roleId)) {
      return {};
    }

    if (field === 'responsible' && entityType === 'task') {
      return operator === 'notEquals'
        ? { roleId: { not: roleId } }
        : { roleId: roleId };
    }
    // Requests haben keine roleId
  }

  return {};
}

/**
 * Konvertiert Branch-Bedingungen
 */
function convertBranchCondition(value: any, operator: string): any {
  if (typeof value === 'string') {
    if (operator === 'equals') {
      return { branch: { name: { equals: value, mode: 'insensitive' } } };
    } else if (operator === 'contains') {
      return { branch: { name: { contains: value, mode: 'insensitive' } } };
    }
  }
  return {};
}

/**
 * ✅ SICHERHEIT: Validiert Filter gegen Datenisolation
 * Entfernt Branch- und Organization-Filter für Nicht-Admin-User
 * 
 * @param filterWhereClause - Die konvertierte Prisma Where-Klausel
 * @param req - Request-Objekt für Rollen-Prüfung
 * @param entityType - Entity-Typ für spezielle Logik
 * @returns Bereinigte Prisma Where-Klausel
 */
export function validateFilterAgainstIsolation(
  filterWhereClause: any,
  req: Request,
  entityType: 'request' | 'task' | 'tour' | 'tour_booking' | 'reservation'
): any {
  // Admin/Owner: Keine Validierung nötig - sehen alles
  if (isAdminOrOwner(req)) {
    return filterWhereClause;
  }

  // Wenn kein Filter vorhanden, nichts zu validieren
  if (!filterWhereClause || Object.keys(filterWhereClause).length === 0) {
    return filterWhereClause;
  }

  // Rekursive Funktion zum Entfernen von Branch/Organization-Filtern
  const removeIsolationFilters = (clause: any): any => {
    if (!clause || typeof clause !== 'object') {
      return clause;
    }

    // Neues Objekt für bereinigte Klausel
    const cleaned: any = {};

    for (const [key, value] of Object.entries(clause)) {
      // Ignoriere branchId und organizationId direkt
      if (key === 'branchId' || key === 'organizationId') {
        // Entferne diese Filter für Nicht-Admin
        continue;
      }

      // Ignoriere branch-Relation (enthält branchId)
      if (key === 'branch') {
        // Entferne Branch-Filter komplett
        continue;
      }

      // Handle AND/OR Arrays
      if (key === 'AND' || key === 'OR') {
        if (Array.isArray(value)) {
          const cleanedArray = value
            .map(item => removeIsolationFilters(item))
            .filter(item => item !== null && item !== undefined && Object.keys(item).length > 0);
          
          if (cleanedArray.length > 0) {
            cleaned[key] = cleanedArray.length === 1 ? cleanedArray[0] : cleanedArray;
          }
        } else {
          cleaned[key] = removeIsolationFilters(value);
        }
        continue;
      }

      // Rekursiv für verschachtelte Objekte
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const cleanedValue = removeIsolationFilters(value);
        if (cleanedValue && Object.keys(cleanedValue).length > 0) {
          cleaned[key] = cleanedValue;
        }
      } else {
        // Einfache Werte beibehalten
        cleaned[key] = value;
      }
    }

    return Object.keys(cleaned).length > 0 ? cleaned : {};
  };

  return removeIsolationFilters(filterWhereClause);
}


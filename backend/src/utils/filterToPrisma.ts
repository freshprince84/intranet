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
 * - Placeholder: __CURRENT_BRANCH__, __CURRENT_USER__, __CURRENT_ROLE__
 * 
 * @param conditions - Array von Filter-Bedingungen
 * @param operators - Array von logischen Operatoren ('AND' | 'OR')
 * @param entityType - Entity-Typ ('request' | 'task' | 'tour' | 'tour_booking' | 'reservation') für spezielle Logik
 * @param req - Optional: Request-Objekt für Placeholder-Auflösung (__CURRENT_BRANCH__, __CURRENT_USER__, __CURRENT_ROLE__)
 * @returns Prisma Where-Klausel
 */
export function convertFilterConditionsToPrismaWhere(
  conditions: FilterCondition[],
  operators: ('AND' | 'OR')[],
  entityType: 'request' | 'task' | 'tour' | 'tour_booking' | 'reservation',
  req?: Request
): Prisma.RequestWhereInput | Prisma.TaskWhereInput | Prisma.TourWhereInput | Prisma.TourBookingWhereInput | Prisma.ReservationWhereInput | {} {
  if (conditions.length === 0) {
    return {};
  }

  // Konvertiere jede Bedingung in eine Prisma Where-Klausel
  const prismaConditions: any[] = [];

  for (const cond of conditions) {
    const whereClause = convertSingleCondition(cond, entityType, req);
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
  entityType: 'request' | 'task' | 'tour' | 'tour_booking' | 'reservation',
  req?: Request
): any {
  const { column, operator, value } = condition;
  
  // ✅ PHASE 4: Placeholder auflösen (__CURRENT_BRANCH__, __CURRENT_USER__, __CURRENT_ROLE__)
  let resolvedValue = value;
  if (typeof value === 'string' && req) {
    if (value === '__CURRENT_BRANCH__') {
      const branchId = (req as any).branchId;
      if (branchId) {
        resolvedValue = branchId;
      } else {
        return {}; // Kein Branch verfügbar
      }
    } else if (value === '__CURRENT_USER__') {
      const userId = parseInt(req.userId as string, 10);
      if (!isNaN(userId)) {
        resolvedValue = `user-${userId}`;
      } else {
        return {}; // Kein User verfügbar
      }
    } else if (value === '__CURRENT_ROLE__') {
      const roleId = parseInt((req as any).roleId as string, 10);
      if (!isNaN(roleId)) {
        resolvedValue = `role-${roleId}`;
      } else {
        return {}; // Keine Rolle verfügbar
      }
    }
  }

  switch (column) {
    case 'status':
      if (operator === 'equals') {
        return { status: resolvedValue };
      } else if (operator === 'notEquals') {
        return { status: { not: resolvedValue } };
      }
      return {};

    case 'title':
      // ✅ FIX: title wird für Reservations nicht unterstützt (haben kein title-Feld)
      if (entityType !== 'reservation') {
        if (operator === 'equals') {
          return { title: { equals: resolvedValue, mode: 'insensitive' } };
        } else if (operator === 'contains') {
          return { title: { contains: resolvedValue as string, mode: 'insensitive' } };
        } else if (operator === 'startsWith') {
          return { title: { startsWith: resolvedValue as string, mode: 'insensitive' } };
        } else if (operator === 'endsWith') {
          return { title: { endsWith: resolvedValue as string, mode: 'insensitive' } };
        }
      }
      return {};

    case 'type':
      // ✅ FIX: type wird für Reservations nicht unterstützt (haben kein type-Feld)
      if (entityType !== 'reservation') {
        if (operator === 'equals') {
          return { type: resolvedValue };
        } else if (operator === 'notEquals') {
          return { type: { not: resolvedValue } };
        }
      }
      return {};

    case 'dueDate':
    case 'tourDate':
    case 'bookingDate':
    case 'checkInDate':
    case 'checkOutDate':
      return convertDateCondition(resolvedValue, operator, column);

    case 'Deadline':
    case 'deadline':
      // ✅ FIX: Deadline → paymentDeadline (korrekter Feldname im Schema)
      if (entityType === 'reservation') {
        return convertDateCondition(resolvedValue, operator, 'paymentDeadline');
      }
      return {};

    // ✅ Reservations-spezifische Felder
    case 'guestName':
      if (entityType === 'reservation') {
        if (operator === 'equals') {
          return { guestName: { equals: resolvedValue, mode: 'insensitive' } };
        } else if (operator === 'contains') {
          return { guestName: { contains: resolvedValue as string, mode: 'insensitive' } };
        } else if (operator === 'startsWith') {
          return { guestName: { startsWith: resolvedValue as string, mode: 'insensitive' } };
        } else if (operator === 'endsWith') {
          return { guestName: { endsWith: resolvedValue as string, mode: 'insensitive' } };
        }
      }
      return {};

    case 'paymentStatus':
      if (entityType === 'reservation') {
        if (operator === 'equals') {
          return { paymentStatus: resolvedValue };
        } else if (operator === 'notEquals') {
          return { paymentStatus: { not: resolvedValue } };
        }
      }
      return {};

    case 'roomNumber':
      // ✅ FIX: Für Reservations: Filter nach Zimmername (roomNumber ODER roomDescription)
      // Dorms: roomDescription = Zimmername, roomNumber = Bettnummer
      // Privates: roomNumber = Zimmername, roomDescription = optional
      if (entityType === 'reservation') {
        if (operator === 'equals') {
          // OR: Suche in beiden Feldern (Zimmername kann in roomNumber oder roomDescription sein)
          return {
            OR: [
              { roomNumber: { equals: resolvedValue, mode: 'insensitive' } },
              { roomDescription: { equals: resolvedValue, mode: 'insensitive' } }
            ]
          };
        } else if (operator === 'notEquals') {
          // AND: Beide Felder müssen nicht gleich sein
          return {
            AND: [
              { roomNumber: { not: { equals: resolvedValue, mode: 'insensitive' } } },
              { roomDescription: { not: { equals: resolvedValue, mode: 'insensitive' } } }
            ]
          };
        }
      }
      return {};

    case 'guestEmail':
      if (entityType === 'reservation') {
        if (operator === 'equals') {
          return { guestEmail: { equals: resolvedValue, mode: 'insensitive' } };
        } else if (operator === 'contains') {
          return { guestEmail: { contains: resolvedValue as string, mode: 'insensitive' } };
        }
      }
      return {};

    case 'guestPhone':
      if (entityType === 'reservation') {
        if (operator === 'equals') {
          return { guestPhone: { equals: resolvedValue, mode: 'insensitive' } };
        } else if (operator === 'contains') {
          return { guestPhone: { contains: resolvedValue as string, mode: 'insensitive' } };
        }
      }
      return {};

    case 'amount':
      if (entityType === 'reservation') {
        if (operator === 'equals') {
          return { amount: resolvedValue };
        } else if (operator === 'greaterThan') {
          return { amount: { gt: resolvedValue } };
        } else if (operator === 'lessThan') {
          return { amount: { lt: resolvedValue } };
        }
      }
      return {};

    case 'arrivalTime':
      if (entityType === 'reservation') {
        return convertDateCondition(resolvedValue, operator, 'arrivalTime');
      }
      return {};

    case 'onlineCheckInCompleted':
      if (entityType === 'reservation') {
        // ✅ Konvertiere Wert zu Boolean (resolvedValue ist string | number | Date)
        const boolValue = typeof resolvedValue === 'boolean' 
          ? resolvedValue 
          : (resolvedValue === 'true' || resolvedValue === '1' || resolvedValue === 1);
        if (operator === 'equals') {
          return { onlineCheckInCompleted: boolValue };
        } else if (operator === 'notEquals') {
          return { onlineCheckInCompleted: { not: boolValue } };
        }
      }
      return {};

    case 'doorPin':
      if (entityType === 'reservation') {
        if (operator === 'equals') {
          return { doorPin: { equals: resolvedValue, mode: 'insensitive' } };
        } else if (operator === 'contains') {
          return { doorPin: { contains: resolvedValue as string, mode: 'insensitive' } };
        }
      }
      return {};

    case 'responsible':
      return convertUserRoleCondition(resolvedValue, operator, entityType, 'responsible');

    case 'qualityControl':
      if (entityType === 'task') {
        return convertUserRoleCondition(resolvedValue, operator, entityType, 'qualityControl');
      }
      return {};

    case 'requestedBy':
      if (entityType === 'request') {
        return convertUserRoleCondition(resolvedValue, operator, entityType, 'requestedBy');
      }
      return {};

    case 'createdBy':
      if (entityType === 'tour') {
        return convertUserRoleCondition(resolvedValue, operator, entityType, 'createdBy');
      }
      return {};

    case 'bookedBy':
      if (entityType === 'tour_booking') {
        return convertUserRoleCondition(resolvedValue, operator, entityType, 'bookedBy');
      }
      return {};

    case 'branch':
      return convertBranchCondition(resolvedValue, operator, req);

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
  // ✅ PHASE 4: Handle __TODAY__, __TOMORROW__, __YESTERDAY__ dynamic dates
  let dateValue: Date;
  if (value === '__TODAY__') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dateValue = today;
  } else if (value === '__TOMORROW__') {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    dateValue = tomorrow;
  } else if (value === '__YESTERDAY__') {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    dateValue = yesterday;
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
function convertBranchCondition(value: any, operator: string, req?: Request): any {
  // ✅ PHASE 4: __CURRENT_BRANCH__ Placeholder auflösen
  let resolvedValue = value;
  if (typeof value === 'string' && value === '__CURRENT_BRANCH__' && req) {
    const branchId = (req as any).branchId;
    if (branchId) {
      // Wenn branchId verfügbar, filtere direkt nach branchId
      if (operator === 'equals') {
        return { branchId: branchId };
      } else if (operator === 'notEquals') {
        return { branchId: { not: branchId } };
      }
      return {};
    } else {
      return {}; // Kein Branch verfügbar
    }
  }
  
  if (typeof resolvedValue === 'string') {
    if (operator === 'equals') {
      return { branch: { name: { equals: resolvedValue, mode: 'insensitive' } } };
    } else if (operator === 'contains') {
      return { branch: { name: { contains: resolvedValue, mode: 'insensitive' } } };
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


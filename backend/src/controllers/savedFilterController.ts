import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import { filterCache } from '../services/filterCache';

// Schnittstellendefinitionen
interface SortDirection {
  column: string;
  direction: 'asc' | 'desc';
  priority: number;
}

interface SavedFilterRequest {
  tableId: string;
  name: string;
  conditions: any[];
  operators: string[];
  sortDirections?: SortDirection[];
}

interface FilterGroupRequest {
  tableId: string;
  name: string;
}

// Funktion zum Abrufen aller gespeicherten Filter eines Benutzers für eine Tabelle
export const getUserSavedFilters = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId, 10);
    const { tableId } = req.params;

    if (isNaN(userId)) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    if (!tableId) {
      return res.status(400).json({ message: 'Table ID ist erforderlich' });
    }

    // Überprüfe, ob der SavedFilter-Typ in Prisma existiert
    try {
      const savedFilters = await prisma.savedFilter.findMany({
        where: {
          userId,
          tableId
        }
      });

      // Parse die JSON-Strings zurück in Arrays
      const parsedFilters = savedFilters.map(filter => {
        let sortDirections: SortDirection[] = [];
        if (filter.sortDirections) {
          try {
            // Prüfe, ob es ein "null" String ist
            if (filter.sortDirections.trim() === 'null' || filter.sortDirections.trim() === '') {
              sortDirections = [];
            } else {
              const parsed = JSON.parse(filter.sortDirections);
              // Migration: Altes Format (Record) zu neuem Format (Array) konvertieren
              if (Array.isArray(parsed)) {
                sortDirections = parsed;
              } else if (typeof parsed === 'object' && parsed !== null) {
                // Altes Format: { "status": "asc", "branch": "desc" }
                sortDirections = Object.entries(parsed).map(([column, direction], index) => ({
                  column,
                  direction: direction as 'asc' | 'desc',
                  priority: index + 1
                }));
              }
            }
          } catch (e) {
            console.error('Fehler beim Parsen von sortDirections:', e);
            sortDirections = [];
          }
        }
        
        return {
          id: filter.id,
          userId: filter.userId,
          tableId: filter.tableId,
          name: filter.name,
          conditions: JSON.parse(filter.conditions),
          operators: JSON.parse(filter.operators),
          sortDirections,
          groupId: filter.groupId,
          order: filter.order,
          createdAt: filter.createdAt,
          updatedAt: filter.updatedAt
        };
      });

      return res.status(200).json(parsedFilters);
    } catch (prismaError) {
      console.error('Prisma-Fehler beim Abrufen der Filter:', prismaError);
      return res.status(500).json({ message: 'Fehler beim Zugriff auf die Datenbank' });
    }
  } catch (error) {
    console.error('Fehler beim Abrufen der gespeicherten Filter:', error);
    return res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Funktion zum Speichern eines Filters
export const saveFilter = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId, 10);
    const { tableId, name, conditions, operators, sortDirections } = req.body as SavedFilterRequest;

    if (isNaN(userId)) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    if (!tableId) {
      return res.status(400).json({ message: 'Table ID ist erforderlich' });
    }

    if (!name) {
      return res.status(400).json({ message: 'Filter-Name ist erforderlich' });
    }

    // Konvertiere Arrays in JSON-Strings für die Datenbank
    const conditionsJson = JSON.stringify(conditions || []);
    const operatorsJson = JSON.stringify(operators || []);
    const sortDirectionsJson = JSON.stringify(sortDirections || {});

    // Überprüfe, ob der SavedFilter-Typ in Prisma existiert
    try {
      // Prüfe, ob bereits ein Filter mit diesem Namen existiert
      const existingFilter = await prisma.savedFilter.findFirst({
        where: {
          userId,
          tableId,
          name
        }
      });

      let filter;

      if (existingFilter) {
        // Aktualisiere bestehenden Filter
        filter = await prisma.savedFilter.update({
          where: {
            id: existingFilter.id
          },
          data: {
            conditions: conditionsJson,
            operators: operatorsJson,
            sortDirections: sortDirectionsJson
          }
        });
        // Cache invalidieren
        filterCache.invalidate(existingFilter.id);
      } else {
        // Erstelle neuen Filter
        filter = await prisma.savedFilter.create({
          data: {
            userId,
            tableId,
            name,
            conditions: conditionsJson,
            operators: operatorsJson,
            sortDirections: sortDirectionsJson
          }
        });
      }

      // Parse die JSON-Strings zurück in Arrays für die Antwort
      let sortDirections: SortDirection[] = [];
      if (filter.sortDirections) {
        try {
          // Prüfe, ob es ein "null" String ist
          if (filter.sortDirections.trim() === 'null' || filter.sortDirections.trim() === '') {
            sortDirections = [];
          } else {
            const parsed = JSON.parse(filter.sortDirections);
            // Migration: Altes Format (Record) zu neuem Format (Array) konvertieren
            if (Array.isArray(parsed)) {
              sortDirections = parsed;
            } else if (typeof parsed === 'object' && parsed !== null) {
              // Altes Format: { "status": "asc", "branch": "desc" }
              sortDirections = Object.entries(parsed).map(([column, direction], index) => ({
                column,
                direction: direction as 'asc' | 'desc',
                priority: index + 1
              }));
            }
          }
        } catch (e) {
          console.error('Fehler beim Parsen von sortDirections:', e);
          sortDirections = [];
        }
      }
      
      const parsedFilter = {
        id: filter.id,
        userId: filter.userId,
        tableId: filter.tableId,
        name: filter.name,
        conditions: JSON.parse(filter.conditions),
        operators: JSON.parse(filter.operators),
        sortDirections,
        groupId: filter.groupId,
        order: filter.order,
        createdAt: filter.createdAt,
        updatedAt: filter.updatedAt
      };

      return res.status(200).json(parsedFilter);
    } catch (prismaError) {
      console.error('Prisma-Fehler beim Speichern des Filters:', prismaError);
      return res.status(500).json({ message: 'Fehler beim Zugriff auf die Datenbank' });
    }
  } catch (error) {
    console.error('Fehler beim Speichern des Filters:', error);
    return res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Funktion zum Löschen eines gespeicherten Filters
export const deleteFilter = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId, 10);
    const filterId = parseInt(req.params.id, 10);

    if (isNaN(userId)) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    if (isNaN(filterId)) {
      return res.status(400).json({ message: 'Ungültige Filter-ID' });
    }

    // Überprüfe, ob der SavedFilter-Typ in Prisma existiert
    try {
      // Prüfe, ob der Filter existiert und dem Benutzer gehört
      const existingFilter = await prisma.savedFilter.findFirst({
        where: {
          id: filterId,
          userId
        }
      });

      if (!existingFilter) {
        return res.status(404).json({ message: 'Filter nicht gefunden oder keine Berechtigung zum Löschen' });
      }

      // Lösche den Filter
      await prisma.savedFilter.delete({
        where: {
          id: filterId
        }
      });
      // Cache invalidieren
      filterCache.invalidate(filterId);

      return res.status(200).json({ message: 'Filter erfolgreich gelöscht' });
    } catch (prismaError) {
      console.error('Prisma-Fehler beim Löschen des Filters:', prismaError);
      return res.status(500).json({ message: 'Fehler beim Zugriff auf die Datenbank' });
    }
  } catch (error) {
    console.error('Fehler beim Löschen des Filters:', error);
    return res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// ========== FILTER GROUP FUNCTIONS ==========

// Funktion zum Erstellen einer Filter-Gruppe
export const createFilterGroup = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId, 10);
    const { tableId, name } = req.body as FilterGroupRequest;

    if (isNaN(userId)) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    if (!tableId) {
      return res.status(400).json({ message: 'Table ID ist erforderlich' });
    }

    if (!name) {
      return res.status(400).json({ message: 'Gruppen-Name ist erforderlich' });
    }

    try {
      // Prüfe, ob bereits eine Gruppe mit diesem Namen existiert
      const existingGroup = await prisma.filterGroup.findFirst({
        where: {
          userId,
          tableId,
          name
        }
      });

      if (existingGroup) {
        return res.status(400).json({ message: 'Eine Gruppe mit diesem Namen existiert bereits' });
      }

      // Finde die höchste order-Nummer für diese Tabelle
      const maxOrder = await prisma.filterGroup.findFirst({
        where: {
          userId,
          tableId
        },
        orderBy: {
          order: 'desc'
        },
        select: {
          order: true
        }
      });

      const newOrder = maxOrder ? maxOrder.order + 1 : 0;

      // Erstelle neue Gruppe
      const group = await prisma.filterGroup.create({
        data: {
          userId,
          tableId,
          name,
          order: newOrder
        }
      });

      return res.status(200).json({
        id: group.id,
        userId: group.userId,
        tableId: group.tableId,
        name: group.name,
        order: group.order,
        filters: [],
        createdAt: group.createdAt,
        updatedAt: group.updatedAt
      });
    } catch (prismaError) {
      console.error('Prisma-Fehler beim Erstellen der Gruppe:', prismaError);
      return res.status(500).json({ message: 'Fehler beim Zugriff auf die Datenbank' });
    }
  } catch (error) {
    console.error('Fehler beim Erstellen der Filter-Gruppe:', error);
    return res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Funktion zum Abrufen aller Filter-Gruppen eines Benutzers für eine Tabelle
export const getFilterGroups = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId, 10);
    const { tableId } = req.params;

    if (isNaN(userId)) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    if (!tableId) {
      return res.status(400).json({ message: 'Table ID ist erforderlich' });
    }

    try {
      const groups = await prisma.filterGroup.findMany({
        where: {
          userId,
          tableId
        },
        include: {
          filters: {
            orderBy: {
              order: 'asc'
            }
          }
        },
        orderBy: {
          order: 'asc'
        }
      });

      // Parse die JSON-Strings der Filter zurück in Arrays
      const parsedGroups = groups.map(group => ({
        id: group.id,
        userId: group.userId,
        tableId: group.tableId,
        name: group.name,
        order: group.order,
        filters: group.filters.map(filter => ({
          id: filter.id,
          userId: filter.userId,
          tableId: filter.tableId,
          name: filter.name,
          conditions: JSON.parse(filter.conditions),
          operators: JSON.parse(filter.operators),
          sortDirections: filter.sortDirections ? JSON.parse(filter.sortDirections) : {},
          groupId: filter.groupId,
          order: filter.order,
          createdAt: filter.createdAt,
          updatedAt: filter.updatedAt
        })),
        createdAt: group.createdAt,
        updatedAt: group.updatedAt
      }));

      return res.status(200).json(parsedGroups);
    } catch (prismaError) {
      console.error('Prisma-Fehler beim Abrufen der Gruppen:', prismaError);
      return res.status(500).json({ message: 'Fehler beim Zugriff auf die Datenbank' });
    }
  } catch (error) {
    console.error('Fehler beim Abrufen der Filter-Gruppen:', error);
    return res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Funktion zum Aktualisieren einer Filter-Gruppe (umbenennen)
export const updateFilterGroup = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId, 10);
    const groupId = parseInt(req.params.id, 10);
    const { name } = req.body;

    if (isNaN(userId)) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    if (isNaN(groupId)) {
      return res.status(400).json({ message: 'Ungültige Gruppen-ID' });
    }

    if (!name) {
      return res.status(400).json({ message: 'Gruppen-Name ist erforderlich' });
    }

    try {
      // Prüfe, ob die Gruppe existiert und dem Benutzer gehört
      const existingGroup = await prisma.filterGroup.findFirst({
        where: {
          id: groupId,
          userId
        }
      });

      if (!existingGroup) {
        return res.status(404).json({ message: 'Gruppe nicht gefunden oder keine Berechtigung' });
      }

      // Prüfe, ob bereits eine andere Gruppe mit diesem Namen existiert
      const nameExists = await prisma.filterGroup.findFirst({
        where: {
          userId,
          tableId: existingGroup.tableId,
          name,
          id: {
            not: groupId
          }
        }
      });

      if (nameExists) {
        return res.status(400).json({ message: 'Eine Gruppe mit diesem Namen existiert bereits' });
      }

      // Aktualisiere die Gruppe
      const updatedGroup = await prisma.filterGroup.update({
        where: {
          id: groupId
        },
        data: {
          name
        },
        include: {
          filters: {
            orderBy: {
              order: 'asc'
            }
          }
        }
      });

      // Parse die JSON-Strings der Filter zurück in Arrays
      const parsedGroup = {
        id: updatedGroup.id,
        userId: updatedGroup.userId,
        tableId: updatedGroup.tableId,
        name: updatedGroup.name,
        order: updatedGroup.order,
        filters: updatedGroup.filters.map(filter => ({
          id: filter.id,
          userId: filter.userId,
          tableId: filter.tableId,
          name: filter.name,
          conditions: JSON.parse(filter.conditions),
          operators: JSON.parse(filter.operators),
          groupId: filter.groupId,
          order: filter.order,
          createdAt: filter.createdAt,
          updatedAt: filter.updatedAt
        })),
        createdAt: updatedGroup.createdAt,
        updatedAt: updatedGroup.updatedAt
      };

      return res.status(200).json(parsedGroup);
    } catch (prismaError) {
      console.error('Prisma-Fehler beim Aktualisieren der Gruppe:', prismaError);
      return res.status(500).json({ message: 'Fehler beim Zugriff auf die Datenbank' });
    }
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Filter-Gruppe:', error);
    return res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Funktion zum Löschen einer Filter-Gruppe
export const deleteFilterGroup = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId, 10);
    const groupId = parseInt(req.params.id, 10);

    if (isNaN(userId)) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    if (isNaN(groupId)) {
      return res.status(400).json({ message: 'Ungültige Gruppen-ID' });
    }

    try {
      // Prüfe, ob die Gruppe existiert und dem Benutzer gehört
      const existingGroup = await prisma.filterGroup.findFirst({
        where: {
          id: groupId,
          userId
        },
        include: {
          filters: true
        }
      });

      if (!existingGroup) {
        return res.status(404).json({ message: 'Gruppe nicht gefunden oder keine Berechtigung' });
      }

      // Entferne alle Filter aus der Gruppe (setze groupId = null)
      await prisma.savedFilter.updateMany({
        where: {
          groupId: groupId
        },
        data: {
          groupId: null,
          order: 0
        }
      });

      // Lösche die Gruppe
      await prisma.filterGroup.delete({
        where: {
          id: groupId
        }
      });

      return res.status(200).json({ message: 'Gruppe erfolgreich gelöscht' });
    } catch (prismaError) {
      console.error('Prisma-Fehler beim Löschen der Gruppe:', prismaError);
      return res.status(500).json({ message: 'Fehler beim Zugriff auf die Datenbank' });
    }
  } catch (error) {
    console.error('Fehler beim Löschen der Filter-Gruppe:', error);
    return res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Funktion zum Hinzufügen eines Filters zu einer Gruppe
export const addFilterToGroup = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId, 10);
    const filterId = parseInt(req.params.filterId, 10);
    const groupId = parseInt(req.params.groupId, 10);

    if (isNaN(userId)) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    if (isNaN(filterId)) {
      return res.status(400).json({ message: 'Ungültige Filter-ID' });
    }

    if (isNaN(groupId)) {
      return res.status(400).json({ message: 'Ungültige Gruppen-ID' });
    }

    try {
      // Prüfe, ob der Filter existiert und dem Benutzer gehört
      const filter = await prisma.savedFilter.findFirst({
        where: {
          id: filterId,
          userId
        }
      });

      if (!filter) {
        return res.status(404).json({ message: 'Filter nicht gefunden oder keine Berechtigung' });
      }

      // Prüfe, ob die Gruppe existiert und dem Benutzer gehört
      const group = await prisma.filterGroup.findFirst({
        where: {
          id: groupId,
          userId,
          tableId: filter.tableId // Gruppe muss zur gleichen Tabelle gehören
        }
      });

      if (!group) {
        return res.status(404).json({ message: 'Gruppe nicht gefunden oder keine Berechtigung' });
      }

      // Finde die höchste order-Nummer in der Gruppe
      const maxOrder = await prisma.savedFilter.findFirst({
        where: {
          groupId: groupId
        },
        orderBy: {
          order: 'desc'
        },
        select: {
          order: true
        }
      });

      const newOrder = maxOrder ? maxOrder.order + 1 : 0;

      // Füge Filter zur Gruppe hinzu
      const updatedFilter = await prisma.savedFilter.update({
        where: {
          id: filterId
        },
        data: {
          groupId: groupId,
          order: newOrder
        }
      });

      // Parse die JSON-Strings zurück in Arrays
      const parsedFilter = {
        id: updatedFilter.id,
        userId: updatedFilter.userId,
        tableId: updatedFilter.tableId,
        name: updatedFilter.name,
        conditions: JSON.parse(updatedFilter.conditions),
        operators: JSON.parse(updatedFilter.operators),
        groupId: updatedFilter.groupId,
        order: updatedFilter.order,
        createdAt: updatedFilter.createdAt,
        updatedAt: updatedFilter.updatedAt
      };

      return res.status(200).json(parsedFilter);
    } catch (prismaError) {
      console.error('Prisma-Fehler beim Hinzufügen des Filters zur Gruppe:', prismaError);
      return res.status(500).json({ message: 'Fehler beim Zugriff auf die Datenbank' });
    }
  } catch (error) {
    console.error('Fehler beim Hinzufügen des Filters zur Gruppe:', error);
    return res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Funktion zum Entfernen eines Filters aus einer Gruppe
export const removeFilterFromGroup = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId, 10);
    const filterId = parseInt(req.params.filterId, 10);

    if (isNaN(userId)) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    if (isNaN(filterId)) {
      return res.status(400).json({ message: 'Ungültige Filter-ID' });
    }

    try {
      // Prüfe, ob der Filter existiert und dem Benutzer gehört
      const filter = await prisma.savedFilter.findFirst({
        where: {
          id: filterId,
          userId
        }
      });

      if (!filter) {
        return res.status(404).json({ message: 'Filter nicht gefunden oder keine Berechtigung' });
      }

      // Entferne Filter aus der Gruppe
      const updatedFilter = await prisma.savedFilter.update({
        where: {
          id: filterId
        },
        data: {
          groupId: null,
          order: 0
        }
      });

      // Parse die JSON-Strings zurück in Arrays
      const parsedFilter = {
        id: updatedFilter.id,
        userId: updatedFilter.userId,
        tableId: updatedFilter.tableId,
        name: updatedFilter.name,
        conditions: JSON.parse(updatedFilter.conditions),
        operators: JSON.parse(updatedFilter.operators),
        groupId: updatedFilter.groupId,
        order: updatedFilter.order,
        createdAt: updatedFilter.createdAt,
        updatedAt: updatedFilter.updatedAt
      };

      return res.status(200).json(parsedFilter);
    } catch (prismaError) {
      console.error('Prisma-Fehler beim Entfernen des Filters aus der Gruppe:', prismaError);
      return res.status(500).json({ message: 'Fehler beim Zugriff auf die Datenbank' });
    }
  } catch (error) {
    console.error('Fehler beim Entfernen des Filters aus der Gruppe:', error);
    return res.status(500).json({ message: 'Interner Serverfehler' });
  }
}; 
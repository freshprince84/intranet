"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeFilterFromGroup = exports.addFilterToGroup = exports.deleteFilterGroup = exports.updateFilterGroup = exports.getFilterGroups = exports.createFilterGroup = exports.deleteFilter = exports.saveFilter = exports.getUserSavedFilters = void 0;
const prisma_1 = require("../utils/prisma");
const filterCache_1 = require("../services/filterCache");
const filterListCache_1 = require("../services/filterListCache");
const logger_1 = require("../utils/logger");
// Funktion zum Abrufen aller gespeicherten Filter eines Benutzers für eine Tabelle
// ✅ PERFORMANCE: Verwendet FilterListCache statt direkter DB-Query
const getUserSavedFilters = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
            // ✅ PERFORMANCE: Verwende FilterListCache statt direkter DB-Query
            const parsedFilters = yield filterListCache_1.filterListCache.getFilters(userId, tableId);
            if (!parsedFilters) {
                return res.status(500).json({ message: 'Fehler beim Laden der Filter' });
            }
            return res.status(200).json(parsedFilters);
        }
        catch (prismaError) {
            logger_1.logger.error('Prisma-Fehler beim Abrufen der Filter:', prismaError);
            return res.status(500).json({ message: 'Fehler beim Zugriff auf die Datenbank' });
        }
    }
    catch (error) {
        logger_1.logger.error('Fehler beim Abrufen der gespeicherten Filter:', error);
        return res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.getUserSavedFilters = getUserSavedFilters;
// Funktion zum Speichern eines Filters
const saveFilter = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.userId, 10);
        const { tableId, name, conditions, operators } = req.body;
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
        // Überprüfe, ob der SavedFilter-Typ in Prisma existiert
        try {
            // Prüfe, ob bereits ein Filter mit diesem Namen existiert
            // READ-Operation: executeWithRetry NICHT nötig (nicht kritisch)
            const existingFilter = yield prisma_1.prisma.savedFilter.findFirst({
                where: {
                    userId,
                    tableId,
                    name
                }
            });
            let filter;
            if (existingFilter) {
                // Aktualisiere bestehenden Filter
                // ✅ PERFORMANCE: executeWithRetry für DB-Query
                filter = yield (0, prisma_1.executeWithRetry)(() => prisma_1.prisma.savedFilter.update({
                    where: {
                        id: existingFilter.id
                    },
                    data: {
                        conditions: conditionsJson,
                        operators: operatorsJson
                    }
                }));
                // Cache invalidieren
                filterCache_1.filterCache.invalidate(existingFilter.id);
                filterListCache_1.filterListCache.invalidate(userId, tableId);
            }
            else {
                // Erstelle neuen Filter
                // ✅ PERFORMANCE: executeWithRetry für DB-Query
                filter = yield (0, prisma_1.executeWithRetry)(() => prisma_1.prisma.savedFilter.create({
                    data: {
                        userId,
                        tableId,
                        name,
                        conditions: conditionsJson,
                        operators: operatorsJson
                    }
                }));
                // Cache invalidieren
                filterListCache_1.filterListCache.invalidate(userId, tableId);
            }
            const parsedFilter = {
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
            };
            return res.status(200).json(parsedFilter);
        }
        catch (prismaError) {
            logger_1.logger.error('Prisma-Fehler beim Speichern des Filters:', prismaError);
            return res.status(500).json({ message: 'Fehler beim Zugriff auf die Datenbank' });
        }
    }
    catch (error) {
        logger_1.logger.error('Fehler beim Speichern des Filters:', error);
        return res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.saveFilter = saveFilter;
// Funktion zum Löschen eines gespeicherten Filters
const deleteFilter = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
            // READ-Operation: executeWithRetry NICHT nötig (nicht kritisch)
            const existingFilter = yield prisma_1.prisma.savedFilter.findFirst({
                where: {
                    id: filterId,
                    userId
                }
            });
            if (!existingFilter) {
                return res.status(404).json({ message: 'Filter nicht gefunden oder keine Berechtigung zum Löschen' });
            }
            // Lösche den Filter
            // ✅ PERFORMANCE: executeWithRetry für DB-Query
            yield (0, prisma_1.executeWithRetry)(() => prisma_1.prisma.savedFilter.delete({
                where: {
                    id: filterId
                }
            }));
            // Cache invalidieren
            filterCache_1.filterCache.invalidate(filterId);
            filterListCache_1.filterListCache.invalidate(userId, existingFilter.tableId);
            return res.status(200).json({ message: 'Filter erfolgreich gelöscht' });
        }
        catch (prismaError) {
            logger_1.logger.error('Prisma-Fehler beim Löschen des Filters:', prismaError);
            return res.status(500).json({ message: 'Fehler beim Zugriff auf die Datenbank' });
        }
    }
    catch (error) {
        logger_1.logger.error('Fehler beim Löschen des Filters:', error);
        return res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.deleteFilter = deleteFilter;
// ========== FILTER GROUP FUNCTIONS ==========
// Funktion zum Erstellen einer Filter-Gruppe
const createFilterGroup = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.userId, 10);
        const { tableId, name } = req.body;
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
            // READ-Operation: executeWithRetry NICHT nötig (nicht kritisch)
            const existingGroup = yield prisma_1.prisma.filterGroup.findFirst({
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
            // READ-Operation: executeWithRetry NICHT nötig (nicht kritisch)
            const maxOrder = yield prisma_1.prisma.filterGroup.findFirst({
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
            // ✅ PERFORMANCE: executeWithRetry für DB-Query
            const group = yield (0, prisma_1.executeWithRetry)(() => prisma_1.prisma.filterGroup.create({
                data: {
                    userId,
                    tableId,
                    name,
                    order: newOrder
                }
            }));
            // Cache invalidieren
            filterListCache_1.filterListCache.invalidate(userId, tableId);
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
        }
        catch (prismaError) {
            logger_1.logger.error('Prisma-Fehler beim Erstellen der Gruppe:', prismaError);
            return res.status(500).json({ message: 'Fehler beim Zugriff auf die Datenbank' });
        }
    }
    catch (error) {
        logger_1.logger.error('Fehler beim Erstellen der Filter-Gruppe:', error);
        return res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.createFilterGroup = createFilterGroup;
// Funktion zum Abrufen aller Filter-Gruppen eines Benutzers für eine Tabelle
// ✅ PERFORMANCE: Verwendet FilterListCache statt direkter DB-Query
const getFilterGroups = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
            // ✅ PERFORMANCE: Verwende FilterListCache statt direkter DB-Query
            const parsedGroups = yield filterListCache_1.filterListCache.getFilterGroups(userId, tableId);
            if (!parsedGroups) {
                return res.status(500).json({ message: 'Fehler beim Laden der Filter-Gruppen' });
            }
            return res.status(200).json(parsedGroups);
        }
        catch (prismaError) {
            logger_1.logger.error('Prisma-Fehler beim Abrufen der Gruppen:', prismaError);
            return res.status(500).json({ message: 'Fehler beim Zugriff auf die Datenbank' });
        }
    }
    catch (error) {
        logger_1.logger.error('Fehler beim Abrufen der Filter-Gruppen:', error);
        return res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.getFilterGroups = getFilterGroups;
// Funktion zum Aktualisieren einer Filter-Gruppe (umbenennen)
const updateFilterGroup = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
            // READ-Operation: executeWithRetry NICHT nötig (nicht kritisch)
            const existingGroup = yield prisma_1.prisma.filterGroup.findFirst({
                where: {
                    id: groupId,
                    userId
                }
            });
            if (!existingGroup) {
                return res.status(404).json({ message: 'Gruppe nicht gefunden oder keine Berechtigung' });
            }
            // Prüfe, ob bereits eine andere Gruppe mit diesem Namen existiert
            // READ-Operation: executeWithRetry NICHT nötig (nicht kritisch)
            const nameExists = yield prisma_1.prisma.filterGroup.findFirst({
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
            // ✅ PERFORMANCE: executeWithRetry für DB-Query
            const updatedGroup = yield (0, prisma_1.executeWithRetry)(() => prisma_1.prisma.filterGroup.update({
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
            }));
            // Cache invalidieren
            filterListCache_1.filterListCache.invalidate(userId, existingGroup.tableId);
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
        }
        catch (prismaError) {
            logger_1.logger.error('Prisma-Fehler beim Aktualisieren der Gruppe:', prismaError);
            return res.status(500).json({ message: 'Fehler beim Zugriff auf die Datenbank' });
        }
    }
    catch (error) {
        logger_1.logger.error('Fehler beim Aktualisieren der Filter-Gruppe:', error);
        return res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.updateFilterGroup = updateFilterGroup;
// Funktion zum Löschen einer Filter-Gruppe
const deleteFilterGroup = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
            // READ-Operation: executeWithRetry NICHT nötig (nicht kritisch)
            const existingGroup = yield prisma_1.prisma.filterGroup.findFirst({
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
            // ✅ PERFORMANCE: executeWithRetry für DB-Query
            yield (0, prisma_1.executeWithRetry)(() => prisma_1.prisma.savedFilter.updateMany({
                where: {
                    groupId: groupId
                },
                data: {
                    groupId: null,
                    order: 0
                }
            }));
            // Lösche die Gruppe
            // ✅ PERFORMANCE: executeWithRetry für DB-Query
            yield (0, prisma_1.executeWithRetry)(() => prisma_1.prisma.filterGroup.delete({
                where: {
                    id: groupId
                }
            }));
            // Cache invalidieren
            filterListCache_1.filterListCache.invalidate(userId, existingGroup.tableId);
            return res.status(200).json({ message: 'Gruppe erfolgreich gelöscht' });
        }
        catch (prismaError) {
            logger_1.logger.error('Prisma-Fehler beim Löschen der Gruppe:', prismaError);
            return res.status(500).json({ message: 'Fehler beim Zugriff auf die Datenbank' });
        }
    }
    catch (error) {
        logger_1.logger.error('Fehler beim Löschen der Filter-Gruppe:', error);
        return res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.deleteFilterGroup = deleteFilterGroup;
// Funktion zum Hinzufügen eines Filters zu einer Gruppe
const addFilterToGroup = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
            // READ-Operation: executeWithRetry NICHT nötig (nicht kritisch)
            const filter = yield prisma_1.prisma.savedFilter.findFirst({
                where: {
                    id: filterId,
                    userId
                }
            });
            if (!filter) {
                return res.status(404).json({ message: 'Filter nicht gefunden oder keine Berechtigung' });
            }
            // Prüfe, ob die Gruppe existiert und dem Benutzer gehört
            // READ-Operation: executeWithRetry NICHT nötig (nicht kritisch)
            const group = yield prisma_1.prisma.filterGroup.findFirst({
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
            // READ-Operation: executeWithRetry NICHT nötig (nicht kritisch)
            const maxOrder = yield prisma_1.prisma.savedFilter.findFirst({
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
            // ✅ PERFORMANCE: executeWithRetry für DB-Query
            const updatedFilter = yield (0, prisma_1.executeWithRetry)(() => prisma_1.prisma.savedFilter.update({
                where: {
                    id: filterId
                },
                data: {
                    groupId: groupId,
                    order: newOrder
                }
            }));
            // Cache invalidieren
            filterListCache_1.filterListCache.invalidate(userId, filter.tableId);
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
        }
        catch (prismaError) {
            logger_1.logger.error('Prisma-Fehler beim Hinzufügen des Filters zur Gruppe:', prismaError);
            return res.status(500).json({ message: 'Fehler beim Zugriff auf die Datenbank' });
        }
    }
    catch (error) {
        logger_1.logger.error('Fehler beim Hinzufügen des Filters zur Gruppe:', error);
        return res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.addFilterToGroup = addFilterToGroup;
// Funktion zum Entfernen eines Filters aus einer Gruppe
const removeFilterFromGroup = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
            // READ-Operation: executeWithRetry NICHT nötig (nicht kritisch)
            const filter = yield prisma_1.prisma.savedFilter.findFirst({
                where: {
                    id: filterId,
                    userId
                }
            });
            if (!filter) {
                return res.status(404).json({ message: 'Filter nicht gefunden oder keine Berechtigung' });
            }
            // Entferne Filter aus der Gruppe
            // ✅ PERFORMANCE: executeWithRetry für DB-Query
            const updatedFilter = yield (0, prisma_1.executeWithRetry)(() => prisma_1.prisma.savedFilter.update({
                where: {
                    id: filterId
                },
                data: {
                    groupId: null,
                    order: 0
                }
            }));
            // Cache invalidieren
            filterListCache_1.filterListCache.invalidate(userId, filter.tableId);
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
        }
        catch (prismaError) {
            logger_1.logger.error('Prisma-Fehler beim Entfernen des Filters aus der Gruppe:', prismaError);
            return res.status(500).json({ message: 'Fehler beim Zugriff auf die Datenbank' });
        }
    }
    catch (error) {
        logger_1.logger.error('Fehler beim Entfernen des Filters aus der Gruppe:', error);
        return res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.removeFilterFromGroup = removeFilterFromGroup;
//# sourceMappingURL=savedFilterController.js.map
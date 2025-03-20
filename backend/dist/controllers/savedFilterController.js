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
exports.deleteFilter = exports.saveFilter = exports.getUserSavedFilters = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Funktion zum Abrufen aller gespeicherten Filter eines Benutzers für eine Tabelle
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
        // Überprüfe, ob der SavedFilter-Typ in Prisma existiert
        try {
            const savedFilters = yield prisma.savedFilter.findMany({
                where: {
                    userId,
                    tableId
                }
            });
            // Parse die JSON-Strings zurück in Arrays
            const parsedFilters = savedFilters.map(filter => ({
                id: filter.id,
                userId: filter.userId,
                tableId: filter.tableId,
                name: filter.name,
                conditions: JSON.parse(filter.conditions),
                operators: JSON.parse(filter.operators),
                createdAt: filter.createdAt,
                updatedAt: filter.updatedAt
            }));
            return res.status(200).json(parsedFilters);
        }
        catch (prismaError) {
            console.error('Prisma-Fehler beim Abrufen der Filter:', prismaError);
            return res.status(500).json({ message: 'Fehler beim Zugriff auf die Datenbank' });
        }
    }
    catch (error) {
        console.error('Fehler beim Abrufen der gespeicherten Filter:', error);
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
            const existingFilter = yield prisma.savedFilter.findFirst({
                where: {
                    userId,
                    tableId,
                    name
                }
            });
            let filter;
            if (existingFilter) {
                // Aktualisiere bestehenden Filter
                filter = yield prisma.savedFilter.update({
                    where: {
                        id: existingFilter.id
                    },
                    data: {
                        conditions: conditionsJson,
                        operators: operatorsJson
                    }
                });
            }
            else {
                // Erstelle neuen Filter
                filter = yield prisma.savedFilter.create({
                    data: {
                        userId,
                        tableId,
                        name,
                        conditions: conditionsJson,
                        operators: operatorsJson
                    }
                });
            }
            // Parse die JSON-Strings zurück in Arrays für die Antwort
            const parsedFilter = {
                id: filter.id,
                userId: filter.userId,
                tableId: filter.tableId,
                name: filter.name,
                conditions: JSON.parse(filter.conditions),
                operators: JSON.parse(filter.operators),
                createdAt: filter.createdAt,
                updatedAt: filter.updatedAt
            };
            return res.status(200).json(parsedFilter);
        }
        catch (prismaError) {
            console.error('Prisma-Fehler beim Speichern des Filters:', prismaError);
            return res.status(500).json({ message: 'Fehler beim Zugriff auf die Datenbank' });
        }
    }
    catch (error) {
        console.error('Fehler beim Speichern des Filters:', error);
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
            const existingFilter = yield prisma.savedFilter.findFirst({
                where: {
                    id: filterId,
                    userId
                }
            });
            if (!existingFilter) {
                return res.status(404).json({ message: 'Filter nicht gefunden oder keine Berechtigung zum Löschen' });
            }
            // Lösche den Filter
            yield prisma.savedFilter.delete({
                where: {
                    id: filterId
                }
            });
            return res.status(200).json({ message: 'Filter erfolgreich gelöscht' });
        }
        catch (prismaError) {
            console.error('Prisma-Fehler beim Löschen des Filters:', prismaError);
            return res.status(500).json({ message: 'Fehler beim Zugriff auf die Datenbank' });
        }
    }
    catch (error) {
        console.error('Fehler beim Löschen des Filters:', error);
        return res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.deleteFilter = deleteFilter;
//# sourceMappingURL=savedFilterController.js.map
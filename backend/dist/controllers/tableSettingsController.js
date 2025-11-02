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
exports.saveUserTableSettings = exports.getUserTableSettings = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Funktion zum Abrufen der Tabelleneinstellungen eines Benutzers für eine bestimmte Tabelle
const getUserTableSettings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.userId, 10);
        const { tableId } = req.params;
        if (isNaN(userId)) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        if (!tableId) {
            return res.status(400).json({ message: 'Table ID ist erforderlich' });
        }
        // Versuche, bestehende Einstellungen zu finden
        const settings = yield prisma.userTableSettings.findUnique({
            where: {
                userId_tableId: {
                    userId,
                    tableId
                }
            }
        });
        if (!settings) {
            // Wenn keine Einstellungen gefunden wurden, gib Standardwerte zurück
            return res.json({
                tableId,
                columnOrder: [],
                hiddenColumns: []
            });
        }
        // Einstellungen zurückgeben (JSON-Strings in Arrays konvertieren)
        const response = {
            id: settings.id,
            tableId: settings.tableId,
            columnOrder: JSON.parse(settings.columnOrder),
            hiddenColumns: JSON.parse(settings.hiddenColumns)
        };
        if (settings.viewMode) {
            response.viewMode = settings.viewMode;
        }
        res.json(response);
    }
    catch (error) {
        console.error('Error in getUserTableSettings:', error);
        res.status(500).json({
            message: 'Fehler beim Abrufen der Tabelleneinstellungen',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.getUserTableSettings = getUserTableSettings;
// Funktion zum Speichern der Tabelleneinstellungen eines Benutzers für eine bestimmte Tabelle
const saveUserTableSettings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.userId, 10);
        const { tableId, columnOrder, hiddenColumns, viewMode } = req.body;
        if (isNaN(userId)) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        if (!tableId) {
            return res.status(400).json({ message: 'Table ID ist erforderlich' });
        }
        // Konvertiere Arrays in JSON-Strings für die Datenbank
        const columnOrderJson = JSON.stringify(columnOrder || []);
        const hiddenColumnsJson = JSON.stringify(hiddenColumns || []);
        // Prüfe, ob bereits Einstellungen für diese Tabelle existieren
        const existingSettings = yield prisma.userTableSettings.findUnique({
            where: {
                userId_tableId: {
                    userId,
                    tableId
                }
            }
        });
        let settings;
        if (existingSettings) {
            // Aktualisiere bestehende Einstellungen
            settings = yield prisma.userTableSettings.update({
                where: {
                    userId_tableId: {
                        userId,
                        tableId
                    }
                },
                data: {
                    columnOrder: columnOrderJson,
                    hiddenColumns: hiddenColumnsJson,
                    viewMode: viewMode || null
                }
            });
        }
        else {
            // Erstelle neue Einstellungen
            settings = yield prisma.userTableSettings.create({
                data: {
                    userId,
                    tableId,
                    columnOrder: columnOrderJson,
                    hiddenColumns: hiddenColumnsJson,
                    viewMode: viewMode || null
                }
            });
        }
        // Aktualisierte Einstellungen zurückgeben (JSON-Strings in Arrays konvertieren)
        const response = {
            id: settings.id,
            tableId: settings.tableId,
            columnOrder: JSON.parse(settings.columnOrder),
            hiddenColumns: JSON.parse(settings.hiddenColumns)
        };
        if (settings.viewMode) {
            response.viewMode = settings.viewMode;
        }
        res.json(response);
    }
    catch (error) {
        console.error('Error in saveUserTableSettings:', error);
        res.status(500).json({
            message: 'Fehler beim Speichern der Tabelleneinstellungen',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.saveUserTableSettings = saveUserTableSettings;
//# sourceMappingURL=tableSettingsController.js.map
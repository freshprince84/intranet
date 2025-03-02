import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthenticatedRequest extends Request {
    userId: string;
}

// Interface für die Tabelleneinstellungen
interface TableSettingsRequest {
    tableId: string;
    columnOrder: string[];
    hiddenColumns: string[];
}

// Funktion zum Abrufen der Tabelleneinstellungen eines Benutzers für eine bestimmte Tabelle
export const getUserTableSettings = async (req: AuthenticatedRequest, res: Response) => {
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
        const settings = await prisma.userTableSettings.findUnique({
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
        res.json({
            id: settings.id,
            tableId: settings.tableId,
            columnOrder: JSON.parse(settings.columnOrder),
            hiddenColumns: JSON.parse(settings.hiddenColumns)
        });
    } catch (error) {
        console.error('Error in getUserTableSettings:', error);
        res.status(500).json({ 
            message: 'Fehler beim Abrufen der Tabelleneinstellungen', 
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
};

// Funktion zum Speichern der Tabelleneinstellungen eines Benutzers für eine bestimmte Tabelle
export const saveUserTableSettings = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = parseInt(req.userId, 10);
        const { tableId, columnOrder, hiddenColumns } = req.body as TableSettingsRequest;

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
        const existingSettings = await prisma.userTableSettings.findUnique({
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
            settings = await prisma.userTableSettings.update({
                where: {
                    userId_tableId: {
                        userId,
                        tableId
                    }
                },
                data: {
                    columnOrder: columnOrderJson,
                    hiddenColumns: hiddenColumnsJson
                }
            });
        } else {
            // Erstelle neue Einstellungen
            settings = await prisma.userTableSettings.create({
                data: {
                    userId,
                    tableId,
                    columnOrder: columnOrderJson,
                    hiddenColumns: hiddenColumnsJson
                }
            });
        }

        // Aktualisierte Einstellungen zurückgeben (JSON-Strings in Arrays konvertieren)
        res.json({
            id: settings.id,
            tableId: settings.tableId,
            columnOrder: JSON.parse(settings.columnOrder),
            hiddenColumns: JSON.parse(settings.hiddenColumns)
        });
    } catch (error) {
        console.error('Error in saveUserTableSettings:', error);
        res.status(500).json({ 
            message: 'Fehler beim Speichern der Tabelleneinstellungen', 
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
}; 
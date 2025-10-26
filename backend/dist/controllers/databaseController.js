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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDatabaseLogs = exports.deleteDemoClients = exports.getResetableTables = exports.resetTable = void 0;
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const prisma = new client_1.PrismaClient();
// Logger für Database Operations
const logDatabaseOperation = (operation, userId, status, error) => {
    const logEntry = {
        timestamp: new Date().toISOString(),
        operation,
        userId,
        status,
        error
    };
    const logPath = path_1.default.join(__dirname, '../../logs/database-operations.log');
    const logDir = path_1.default.dirname(logPath);
    // Stelle sicher, dass das Log-Verzeichnis existiert
    if (!fs_1.default.existsSync(logDir)) {
        fs_1.default.mkdirSync(logDir, { recursive: true });
    }
    fs_1.default.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
    console.log('Database Operation:', logEntry);
};
/**
 * Alle Daten aus einer spezifischen Tabelle löschen und Seeds neu laden
 * NUR für Tabellen mit Seed-Daten erlaubt
 */
const resetTable = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { tableName, adminPassword } = req.body;
        const userId = req.userId;
        if (!tableName || !adminPassword) {
            return res.status(400).json({
                message: 'Tabellenname und Admin-Passwort sind erforderlich'
            });
        }
        logDatabaseOperation(`reset_table_${tableName}`, userId, 'start');
        // 1. Validiere Admin-Berechtigung
        const user = yield prisma.user.findFirst({
            where: {
                id: Number(userId),
                roles: {
                    some: {
                        role: {
                            name: 'Admin'
                        }
                    }
                }
            }
        });
        if (!user) {
            logDatabaseOperation(`reset_table_${tableName}`, userId, 'error', 'Nicht autorisiert');
            return res.status(403).json({ message: 'Keine Berechtigung für diese Operation' });
        }
        // 2. Validiere Admin-Passwort
        const validPassword = yield bcrypt_1.default.compare(adminPassword, user.password);
        if (!validPassword) {
            logDatabaseOperation(`reset_table_${tableName}`, userId, 'error', 'Falsches Passwort');
            return res.status(401).json({ message: 'Falsches Admin-Passwort' });
        }
        // 3. Validiere Tabellennamen (NUR Tabellen mit Seed-Daten)
        const allowedTables = [
            'permission',
            'role',
            'branch',
            'client'
        ];
        if (!allowedTables.includes(tableName)) {
            logDatabaseOperation(`reset_table_${tableName}`, userId, 'error', 'Tabelle nicht erlaubt oder hat keine Seed-Daten');
            return res.status(400).json({
                message: 'Diese Tabelle kann nicht zurückgesetzt werden (keine Seed-Daten verfügbar)',
                allowedTables
            });
        }
        // 4. Führe Reset in Transaction aus
        yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Spezielle Behandlung für verschiedene Tabellen
            switch (tableName) {
                case 'permission':
                    yield tx.permission.deleteMany({});
                    break;
                case 'role':
                    // Lösche abhängige Daten zuerst
                    yield tx.userRole.deleteMany({});
                    yield tx.permission.deleteMany({});
                    yield tx.role.deleteMany({});
                    break;
                case 'branch':
                    yield tx.branch.deleteMany({});
                    break;
                case 'client':
                    yield tx.client.deleteMany({});
                    break;
                default:
                    // Generische Löschung für andere Tabellen
                    yield tx[tableName].deleteMany({});
            }
        }));
        // 5. Führe Seed für diese Tabelle aus
        try {
            yield runSeedForTable(tableName);
        }
        catch (seedError) {
            logDatabaseOperation(`reset_table_${tableName}`, userId, 'error', `Seed Fehler: ${seedError}`);
            return res.status(500).json({
                message: 'Tabelle wurde geleert, aber Seed-Daten konnten nicht geladen werden',
                error: seedError instanceof Error ? seedError.message : 'Unbekannter Seed-Fehler'
            });
        }
        logDatabaseOperation(`reset_table_${tableName}`, userId, 'success');
        res.json({
            message: `Tabelle ${tableName} wurde erfolgreich zurückgesetzt und mit Seed-Daten befüllt`,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logDatabaseOperation(`reset_table_${req.body.tableName}`, req.userId, 'error', error instanceof Error ? error.message : 'Unbekannter Fehler');
        console.error('Fehler beim Zurücksetzen der Tabelle:', error);
        res.status(500).json({
            message: 'Fehler beim Zurücksetzen der Tabelle',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.resetTable = resetTable;
/**
 * Verfügbare Tabellen für Reset abrufen
 * NUR Tabellen mit Seed-Daten
 */
const getResetableTables = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const allowedTables = [
            {
                name: 'permission',
                displayName: 'Berechtigungen',
                description: 'Alle Rollenberechtigungen (werden durch Seed-Daten wiederhergestellt)',
                hasSeed: true,
                danger: 'medium'
            },
            {
                name: 'role',
                displayName: 'Rollen',
                description: 'Alle Benutzerrollen inkl. Berechtigungen (werden durch Seed-Daten wiederhergestellt)',
                hasSeed: true,
                danger: 'high'
            },
            {
                name: 'branch',
                displayName: 'Niederlassungen',
                description: 'Alle Niederlassungen (Standard-Niederlassungen werden wiederhergestellt)',
                hasSeed: true,
                danger: 'medium'
            },
            {
                name: 'client',
                displayName: 'Demo-Clients',
                description: 'Alle Clients (Demo-Clients werden wiederhergestellt)',
                hasSeed: true,
                danger: 'low'
            }
        ];
        res.json(allowedTables);
    }
    catch (error) {
        console.error('Fehler beim Abrufen der Tabellen:', error);
        res.status(500).json({ message: 'Fehler beim Abrufen der Tabellen' });
    }
});
exports.getResetableTables = getResetableTables;
/**
 * Seed für spezifische Tabelle ausführen
 */
function runSeedForTable(tableName) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            const seedPath = path_1.default.join(__dirname, '../../prisma/seed.ts');
            (0, child_process_1.exec)(`npx ts-node ${seedPath} --table=${tableName}`, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                    return;
                }
                if (stderr) {
                    console.warn('Seed stderr:', stderr);
                }
                console.log('Seed stdout:', stdout);
                resolve();
            });
        });
    });
}
/**
 * NUR Demo-Clients löschen (ohne Seed-Neuaufbau)
 */
const deleteDemoClients = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { adminPassword } = req.body;
        const userId = req.userId;
        if (!adminPassword) {
            return res.status(400).json({
                message: 'Admin-Passwort ist erforderlich'
            });
        }
        logDatabaseOperation('delete_demo_clients', userId, 'start');
        // 1. Validiere Admin-Berechtigung
        const user = yield prisma.user.findFirst({
            where: {
                id: Number(userId),
                roles: {
                    some: {
                        role: {
                            name: 'Admin'
                        }
                    }
                }
            }
        });
        if (!user) {
            logDatabaseOperation('delete_demo_clients', userId, 'error', 'Nicht autorisiert');
            return res.status(403).json({ message: 'Keine Berechtigung für diese Operation' });
        }
        // 2. Validiere Admin-Passwort
        const validPassword = yield bcrypt_1.default.compare(adminPassword, user.password);
        if (!validPassword) {
            logDatabaseOperation('delete_demo_clients', userId, 'error', 'Falsches Passwort');
            return res.status(401).json({ message: 'Falsches Admin-Passwort' });
        }
        // 3. Definiere Demo-Client Namen (synchron mit seed.ts)
        const demoClientNames = [
            'Musterfirma GmbH',
            'Max Müller',
            'Beispiel AG',
            'Tech Startup XYZ'
        ];
        // 4. Lösche nur Demo-Clients
        const result = yield prisma.client.deleteMany({
            where: {
                name: {
                    in: demoClientNames
                }
            }
        });
        logDatabaseOperation('delete_demo_clients', userId, 'success');
        res.json({
            message: `${result.count} Demo-Clients wurden erfolgreich gelöscht`,
            count: result.count,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logDatabaseOperation('delete_demo_clients', req.userId, 'error', error instanceof Error ? error.message : 'Unbekannter Fehler');
        console.error('Fehler beim Löschen der Demo-Clients:', error);
        res.status(500).json({
            message: 'Fehler beim Löschen der Demo-Clients',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.deleteDemoClients = deleteDemoClients;
/**
 * Database-Logs abrufen (für Audit)
 */
const getDatabaseLogs = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const logPath = path_1.default.join(__dirname, '../../logs/database-operations.log');
        if (!fs_1.default.existsSync(logPath)) {
            return res.json([]);
        }
        const logContent = fs_1.default.readFileSync(logPath, 'utf-8');
        const logs = logContent
            .split('\n')
            .filter(line => line.trim())
            .map(line => {
            try {
                return JSON.parse(line);
            }
            catch (_a) {
                return null;
            }
        })
            .filter(log => log !== null)
            .reverse() // Neueste zuerst
            .slice(0, 50); // Nur die letzten 50 Einträge
        res.json(logs);
    }
    catch (error) {
        console.error('Fehler beim Lesen der Database-Logs:', error);
        res.status(500).json({ message: 'Fehler beim Lesen der Logs' });
    }
});
exports.getDatabaseLogs = getDatabaseLogs;
//# sourceMappingURL=databaseController.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaudeConsoleService = exports.getClaudeConsoleService = void 0;
const ws_1 = require("ws");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class ClaudeConsoleService {
    constructor() {
        this.wss = null;
        this.clients = new Set();
        this.logHistory = [];
        // Log-Datei im logs-Verzeichnis erstellen
        const logsDir = path_1.default.join(__dirname, '../../logs');
        if (!fs_1.default.existsSync(logsDir)) {
            fs_1.default.mkdirSync(logsDir, { recursive: true });
        }
        this.logFile = path_1.default.join(logsDir, 'claude-console.log');
    }
    setupWebSocketServer(server) {
        this.wss = new ws_1.WebSocketServer({
            server,
            path: '/ws/claude-console'
        });
        this.wss.on('connection', (ws, request) => {
            console.log('🔗 Claude Console client connected');
            this.clients.add(ws);
            // Sende bisherige Log-History an neuen Client
            this.sendLogHistory(ws);
            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message.toString());
                    this.handleMessage(data);
                }
                catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            });
            ws.on('close', () => {
                console.log('🔌 Claude Console client disconnected');
                this.clients.delete(ws);
            });
            ws.on('error', (error) => {
                console.error('🚨 Claude Console WebSocket error:', error);
                this.clients.delete(ws);
            });
        });
        console.log('🚀 Claude Console WebSocket server initialized');
    }
    handleMessage(message) {
        if (message.type === 'console-log') {
            this.processLogEntry(message.data);
        }
    }
    processLogEntry(logEntry) {
        // Formatiere Log-Eintrag für Ausgabe
        const timestamp = new Date(logEntry.timestamp).toLocaleString();
        const levelIcon = this.getLevelIcon(logEntry.level);
        const userInfo = logEntry.userId ? ` [User: ${logEntry.userId}]` : '';
        const url = new URL(logEntry.url).pathname;
        const logLine = `${timestamp} ${levelIcon} ${logEntry.level.toUpperCase()}${userInfo} [${url}]: ${logEntry.message}`;
        // Ausgabe in Konsole
        this.outputToConsole(logEntry.level, logLine, logEntry);
        // In Datei schreiben
        this.writeToFile(logLine, logEntry);
        // In History speichern (begrenzt auf 1000 Einträge)
        this.logHistory.push(logEntry);
        if (this.logHistory.length > 1000) {
            this.logHistory = this.logHistory.slice(-500);
        }
        // An alle Claude-Clients weiterleiten (für Live-Monitoring)
        this.broadcastToClients({
            type: 'log-update',
            data: logEntry
        });
    }
    getLevelIcon(level) {
        switch (level) {
            case 'error': return '🚨';
            case 'warn': return '⚠️';
            case 'info': return 'ℹ️';
            case 'debug': return '🐛';
            default: return '📝';
        }
    }
    outputToConsole(level, logLine, logEntry) {
        // Verwende entsprechende Console-Methode
        switch (level) {
            case 'error':
                console.error(`\x1b[31m${logLine}\x1b[0m`);
                if (logEntry.stack) {
                    console.error(`\x1b[90m${logEntry.stack}\x1b[0m`);
                }
                break;
            case 'warn':
                console.warn(`\x1b[33m${logLine}\x1b[0m`);
                break;
            case 'info':
                console.info(`\x1b[36m${logLine}\x1b[0m`);
                break;
            case 'debug':
                console.debug(`\x1b[90m${logLine}\x1b[0m`);
                break;
            default:
                console.log(`\x1b[37m${logLine}\x1b[0m`);
        }
        // Zusätzliche Informationen bei komplexeren Objekten
        if (logEntry.args.length > 0 && typeof logEntry.args[0] === 'object') {
            console.log('\x1b[90mArguments:\x1b[0m', logEntry.args);
        }
    }
    writeToFile(logLine, logEntry) {
        try {
            const fullLogEntry = JSON.stringify(Object.assign(Object.assign({}, logEntry), { formattedMessage: logLine })) + '\n';
            fs_1.default.appendFile(this.logFile, fullLogEntry, (err) => {
                if (err) {
                    console.error('Error writing to Claude console log file:', err);
                }
            });
        }
        catch (error) {
            console.error('Error serializing log entry:', error);
        }
    }
    sendLogHistory(ws) {
        if (this.logHistory.length > 0) {
            try {
                ws.send(JSON.stringify({
                    type: 'log-history',
                    data: this.logHistory.slice(-50) // Nur die letzten 50 Einträge
                }));
            }
            catch (error) {
                console.error('Error sending log history:', error);
            }
        }
    }
    broadcastToClients(message) {
        this.clients.forEach(client => {
            if (client.readyState === ws_1.WebSocket.OPEN) {
                try {
                    client.send(JSON.stringify(message));
                }
                catch (error) {
                    console.error('Error broadcasting to client:', error);
                    this.clients.delete(client);
                }
            }
        });
    }
    // Public API für Claude-Zugriff
    getRecentLogs(limit = 50) {
        return this.logHistory.slice(-limit);
    }
    getLogsByLevel(level, limit = 50) {
        return this.logHistory
            .filter(entry => entry.level === level)
            .slice(-limit);
    }
    getLogsByUser(userId, limit = 50) {
        return this.logHistory
            .filter(entry => entry.userId === userId)
            .slice(-limit);
    }
    getLogsByTimeRange(startTime, endTime) {
        return this.logHistory.filter(entry => {
            const entryTime = new Date(entry.timestamp);
            return entryTime >= startTime && entryTime <= endTime;
        });
    }
    searchLogs(searchTerm, limit = 50) {
        const regex = new RegExp(searchTerm, 'i');
        return this.logHistory
            .filter(entry => regex.test(entry.message) ||
            entry.args.some(arg => typeof arg === 'string' && regex.test(arg)))
            .slice(-limit);
    }
    getLogStats() {
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const byLevel = {};
        const byUser = {};
        let lastHour = 0;
        this.logHistory.forEach(entry => {
            // Nach Level
            byLevel[entry.level] = (byLevel[entry.level] || 0) + 1;
            // Nach User
            if (entry.userId) {
                byUser[entry.userId] = (byUser[entry.userId] || 0) + 1;
            }
            // Letzte Stunde
            if (new Date(entry.timestamp) > oneHourAgo) {
                lastHour++;
            }
        });
        return {
            total: this.logHistory.length,
            byLevel,
            byUser,
            lastHour
        };
    }
}
exports.ClaudeConsoleService = ClaudeConsoleService;
// Singleton-Instanz
let claudeConsoleService = null;
const getClaudeConsoleService = () => {
    if (!claudeConsoleService) {
        claudeConsoleService = new ClaudeConsoleService();
    }
    return claudeConsoleService;
};
exports.getClaudeConsoleService = getClaudeConsoleService;
//# sourceMappingURL=claudeConsoleService.js.map
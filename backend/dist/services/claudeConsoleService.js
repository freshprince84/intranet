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
        this.maxLogFileSize = 10 * 1024 * 1024; // 10MB
        this.maxLogFiles = 5; // Behalte 5 rotierte Dateien
        this.cleanupInterval = null;
        // Log-Datei im logs-Verzeichnis erstellen
        const logsDir = path_1.default.join(__dirname, '../../logs');
        if (!fs_1.default.existsSync(logsDir)) {
            fs_1.default.mkdirSync(logsDir, { recursive: true });
        }
        this.logFile = path_1.default.join(logsDir, 'claude-console.log');
        // Starte Cleanup-Task alle 30 Minuten
        this.startCleanupTask();
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
            // Prüfe Dateigröße vor dem Schreiben
            this.checkLogRotation(() => {
                fs_1.default.appendFile(this.logFile, fullLogEntry, (err) => {
                    if (err) {
                        console.error('Error writing to Claude console log file:', err);
                    }
                });
            });
        }
        catch (error) {
            console.error('Error serializing log entry:', error);
        }
    }
    checkLogRotation(callback) {
        fs_1.default.stat(this.logFile, (err, stats) => {
            if (err) {
                // Datei existiert noch nicht, einfach erstellen
                callback();
                return;
            }
            if (stats.size >= this.maxLogFileSize) {
                this.rotateLogFile(() => callback());
            }
            else {
                callback();
            }
        });
    }
    rotateLogFile(callback) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedFile = this.logFile.replace('.log', `-${timestamp}.log`);
        // Verschiebe aktuelle Log-Datei
        fs_1.default.rename(this.logFile, rotatedFile, (err) => {
            if (err) {
                console.error('Error rotating log file:', err);
                callback();
                return;
            }
            console.log(`📦 Claude console log rotated: ${rotatedFile}`);
            // Bereinige alte Log-Dateien
            this.cleanupOldLogFiles();
            callback();
        });
    }
    cleanupOldLogFiles() {
        const logsDir = path_1.default.dirname(this.logFile);
        const logBaseName = path_1.default.basename(this.logFile, '.log');
        fs_1.default.readdir(logsDir, (err, files) => {
            if (err) {
                console.error('Error reading logs directory:', err);
                return;
            }
            // Finde alle rotierten Log-Dateien
            const logFiles = files
                .filter(file => file.startsWith(logBaseName) && file.endsWith('.log') && file !== path_1.default.basename(this.logFile))
                .map(file => ({
                name: file,
                path: path_1.default.join(logsDir, file),
                stat: fs_1.default.statSync(path_1.default.join(logsDir, file))
            }))
                .sort((a, b) => b.stat.mtime.getTime() - a.stat.mtime.getTime());
            // Lösche überschüssige Dateien
            if (logFiles.length > this.maxLogFiles) {
                const filesToDelete = logFiles.slice(this.maxLogFiles);
                filesToDelete.forEach(file => {
                    fs_1.default.unlink(file.path, (err) => {
                        if (err) {
                            console.error(`Error deleting old log file ${file.name}:`, err);
                        }
                        else {
                            console.log(`🗑️ Deleted old Claude console log: ${file.name}`);
                        }
                    });
                });
            }
        });
    }
    startCleanupTask() {
        // Bereinige alle 30 Minuten
        this.cleanupInterval = setInterval(() => {
            this.performMaintenance();
        }, 30 * 60 * 1000);
        console.log('🧹 Claude console cleanup task started (every 30 minutes)');
    }
    performMaintenance() {
        console.log('🧹 Performing Claude console maintenance...');
        // 1. Bereinige Memory-Log-History
        if (this.logHistory.length > 1000) {
            const before = this.logHistory.length;
            this.logHistory = this.logHistory.slice(-500);
            console.log(`📝 Memory log cleanup: ${before} -> ${this.logHistory.length} entries`);
        }
        // 2. Bereinige alte Log-Dateien
        this.cleanupOldLogFiles();
        // 3. Bereinige sehr alte Logs (älter als 7 Tage) aus Memory
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const beforeCount = this.logHistory.length;
        this.logHistory = this.logHistory.filter(entry => new Date(entry.timestamp) > sevenDaysAgo);
        if (beforeCount !== this.logHistory.length) {
            console.log(`🗑️ Removed ${beforeCount - this.logHistory.length} old memory logs (>7 days)`);
        }
        console.log('✅ Claude console maintenance completed');
    }
    cleanup() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        this.performMaintenance();
        console.log('🧹 Claude console service cleaned up');
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
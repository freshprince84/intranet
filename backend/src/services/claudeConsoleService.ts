import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import fs from 'fs';
import path from 'path';

interface LogEntry {
  timestamp: string;
  level: 'log' | 'warn' | 'error' | 'info' | 'debug';
  message: string;
  args: any[];
  stack?: string;
  url: string;
  userAgent: string;
  userId?: string;
}

interface ClaudeMessage {
  type: 'console-log' | 'performance' | 'api-request';
  data: LogEntry;
}

class ClaudeConsoleService {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private logHistory: LogEntry[] = [];
  private logFile: string;

  constructor() {
    // Log-Datei im logs-Verzeichnis erstellen
    const logsDir = path.join(__dirname, '../../logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    this.logFile = path.join(logsDir, 'claude-console.log');
  }

  public setupWebSocketServer(server: Server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws/claude-console'
    });

    this.wss.on('connection', (ws: WebSocket, request) => {
      console.log('🔗 Claude Console client connected');
      this.clients.add(ws);

      // Sende bisherige Log-History an neuen Client
      this.sendLogHistory(ws);

      ws.on('message', (message: Buffer) => {
        try {
          const data: ClaudeMessage = JSON.parse(message.toString());
          this.handleMessage(data);
        } catch (error) {
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

  private handleMessage(message: ClaudeMessage) {
    if (message.type === 'console-log') {
      this.processLogEntry(message.data);
    }
  }

  private processLogEntry(logEntry: LogEntry) {
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

  private getLevelIcon(level: string): string {
    switch (level) {
      case 'error': return '🚨';
      case 'warn': return '⚠️';
      case 'info': return 'ℹ️';
      case 'debug': return '🐛';
      default: return '📝';
    }
  }

  private outputToConsole(level: string, logLine: string, logEntry: LogEntry) {
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

  private writeToFile(logLine: string, logEntry: LogEntry) {
    try {
      const fullLogEntry = JSON.stringify({
        ...logEntry,
        formattedMessage: logLine
      }) + '\n';
      
      fs.appendFile(this.logFile, fullLogEntry, (err) => {
        if (err) {
          console.error('Error writing to Claude console log file:', err);
        }
      });
    } catch (error) {
      console.error('Error serializing log entry:', error);
    }
  }

  private sendLogHistory(ws: WebSocket) {
    if (this.logHistory.length > 0) {
      try {
        ws.send(JSON.stringify({
          type: 'log-history',
          data: this.logHistory.slice(-50) // Nur die letzten 50 Einträge
        }));
      } catch (error) {
        console.error('Error sending log history:', error);
      }
    }
  }

  private broadcastToClients(message: any) {
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(JSON.stringify(message));
        } catch (error) {
          console.error('Error broadcasting to client:', error);
          this.clients.delete(client);
        }
      }
    });
  }

  // Public API für Claude-Zugriff
  public getRecentLogs(limit: number = 50): LogEntry[] {
    return this.logHistory.slice(-limit);
  }

  public getLogsByLevel(level: string, limit: number = 50): LogEntry[] {
    return this.logHistory
      .filter(entry => entry.level === level)
      .slice(-limit);
  }

  public getLogsByUser(userId: string, limit: number = 50): LogEntry[] {
    return this.logHistory
      .filter(entry => entry.userId === userId)
      .slice(-limit);
  }

  public getLogsByTimeRange(startTime: Date, endTime: Date): LogEntry[] {
    return this.logHistory.filter(entry => {
      const entryTime = new Date(entry.timestamp);
      return entryTime >= startTime && entryTime <= endTime;
    });
  }

  public searchLogs(searchTerm: string, limit: number = 50): LogEntry[] {
    const regex = new RegExp(searchTerm, 'i');
    return this.logHistory
      .filter(entry => 
        regex.test(entry.message) || 
        entry.args.some(arg => 
          typeof arg === 'string' && regex.test(arg)
        )
      )
      .slice(-limit);
  }

  public getLogStats(): {
    total: number;
    byLevel: Record<string, number>;
    byUser: Record<string, number>;
    lastHour: number;
  } {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const byLevel: Record<string, number> = {};
    const byUser: Record<string, number> = {};
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

// Singleton-Instanz
let claudeConsoleService: ClaudeConsoleService | null = null;

export const getClaudeConsoleService = (): ClaudeConsoleService => {
  if (!claudeConsoleService) {
    claudeConsoleService = new ClaudeConsoleService();
  }
  return claudeConsoleService;
};

export { ClaudeConsoleService }; 
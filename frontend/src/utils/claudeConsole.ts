// Claude Console Bridge - Leitet Frontend-Logs an Backend weiter

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

class ClaudeConsole {
  private ws: WebSocket | null = null;
  private logBuffer: LogEntry[] = [];
  private isConnected = false;
  private reconnectInterval: number | null = null;

  constructor() {
    this.initializeWebSocket();
    this.interceptConsole();
    this.interceptErrors();
  }

  private initializeWebSocket() {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // WebSocket läuft auf Backend-Port 5000, nicht Frontend-Port 3000
      const backendHost = window.location.hostname + ':5000';
      const wsUrl = `${protocol}//${backendHost}/ws/claude-console`;
      
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('🔗 Claude Console Bridge connected');
        this.isConnected = true;
        this.flushBuffer();
        
        if (this.reconnectInterval) {
          clearInterval(this.reconnectInterval);
          this.reconnectInterval = null;
        }
      };

      this.ws.onclose = () => {
        console.log('🔌 Claude Console Bridge disconnected');
        this.isConnected = false;
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('🚨 Claude Console Bridge error:', error);
      };

    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (!this.reconnectInterval) {
      this.reconnectInterval = window.setInterval(() => {
        if (!this.isConnected) {
          this.initializeWebSocket();
        }
      }, 5000);
    }
  }

  private interceptConsole() {
    const originalMethods = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info,
      debug: console.debug
    };

    // Überschreibe console-Methoden
    Object.keys(originalMethods).forEach(level => {
      const originalMethod = originalMethods[level as keyof typeof originalMethods];
      
      (console as any)[level] = (...args: any[]) => {
        // Rufe originale Methode auf
        originalMethod.apply(console, args);
        
        // Sende an Claude
        this.sendLog(level as LogEntry['level'], args);
      };
    });
  }

  private interceptErrors() {
    // Globale Error-Handler
    window.addEventListener('error', (event) => {
      this.sendLog('error', [
        `${event.message} at ${event.filename}:${event.lineno}:${event.colno}`,
        event.error
      ], event.error?.stack);
    });

    // Promise Rejection Handler
    window.addEventListener('unhandledrejection', (event) => {
      this.sendLog('error', [
        'Unhandled Promise Rejection:',
        event.reason
      ], event.reason?.stack);
    });
  }

  private sendLog(level: LogEntry['level'], args: any[], stack?: string) {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' '),
      args: args.map(arg => {
        // Serialisiere komplexe Objekte
        try {
          return JSON.parse(JSON.stringify(arg));
        } catch {
          return String(arg);
        }
      }),
      stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      userId: this.getCurrentUserId()
    };

    if (this.isConnected && this.ws) {
      try {
        this.ws.send(JSON.stringify({
          type: 'console-log',
          data: logEntry
        }));
      } catch (error) {
        this.logBuffer.push(logEntry);
      }
    } else {
      this.logBuffer.push(logEntry);
    }

    // Buffer-Größe begrenzen
    if (this.logBuffer.length > 1000) {
      this.logBuffer = this.logBuffer.slice(-500);
    }
  }

  private flushBuffer() {
    if (this.logBuffer.length > 0 && this.isConnected && this.ws) {
      this.logBuffer.forEach(entry => {
        try {
          this.ws!.send(JSON.stringify({
            type: 'console-log',
            data: entry
          }));
        } catch (error) {
          console.error('Failed to flush log entry:', error);
        }
      });
      this.logBuffer = [];
    }
  }

  private getCurrentUserId(): string | undefined {
    // Versuche User-ID aus verschiedenen Quellen zu holen
    try {
      // LocalStorage
      const authData = localStorage.getItem('auth-user');
      if (authData) {
        const user = JSON.parse(authData);
        return user.id || user.username;
      }

      // Cookie
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'userId') {
          return value;
        }
      }
    } catch (error) {
      // Ignore errors
    }
    return undefined;
  }

  // Manuelle Log-Methode für spezielle Claude-Nachrichten
  public claudeLog(message: string, data?: any) {
    this.sendLog('info', [`[CLAUDE] ${message}`, data]);
  }

  // Performance-Monitoring
  public logPerformance(name: string, duration: number) {
    this.sendLog('info', [`[PERFORMANCE] ${name}: ${duration}ms`]);
  }

  // API-Request Monitoring
  public logApiRequest(method: string, url: string, status: number, duration: number) {
    this.sendLog('info', [`[API] ${method} ${url} - ${status} (${duration}ms)`]);
  }
}

// Globale Instanz
let claudeConsole: ClaudeConsole | null = null;

export const initClaudeConsole = () => {
  if (!claudeConsole && typeof window !== 'undefined') {
    claudeConsole = new ClaudeConsole();
  }
  return claudeConsole;
};

export const getClaudeConsole = () => claudeConsole; 
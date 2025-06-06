import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getClaudeConsoleService } from '../services/claudeConsoleService';

const router = Router();
const prisma = new PrismaClient();

// Sicherheits-Middleware für Claude-Endpunkte
const claudeAuth = (req: Request, res: Response, next: any) => {
  const authHeader = req.headers.authorization;
  const claudeToken = process.env.CLAUDE_API_TOKEN || 'claude-dev-token';
  
  if (!authHeader || authHeader !== `Bearer ${claudeToken}`) {
    return res.status(401).json({ error: 'Unauthorized Claude access' });
  }
  next();
};

// Alle Claude-Routen verwenden die Authentifizierung
router.use(claudeAuth);

// Tabellen-Übersicht
router.get('/tables', async (req: Request, res: Response) => {
  try {
    const tables = await prisma.$queryRaw`
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `;
    res.json(tables);
  } catch (error) {
    console.error('Claude DB Error:', error);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// Sichere SELECT-Query-Ausführung
router.post('/query', async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    
    // Sicherheitsprüfungen
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    // Nur SELECT-Queries erlauben
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery.startsWith('select')) {
      return res.status(403).json({ error: 'Only SELECT queries allowed' });
    }
    
    // Gefährliche Keywords blockieren
    const dangerousKeywords = ['drop', 'delete', 'insert', 'update', 'truncate', 'alter', 'create'];
    const hassDangerous = dangerousKeywords.some(keyword => 
      cleanQuery.includes(keyword)
    );
    
    if (hassDangerous) {
      return res.status(403).json({ error: 'Query contains forbidden keywords' });
    }
    
    // Query-Länge begrenzen
    if (query.length > 2000) {
      return res.status(413).json({ error: 'Query too long' });
    }
    
    const result = await prisma.$queryRawUnsafe(query);
    res.json({
      query,
      result,
      rowCount: Array.isArray(result) ? result.length : 1
    });
  } catch (error) {
    console.error('Claude Query Error:', error);
    res.status(500).json({ 
      error: 'Query execution failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Datenbankstatistiken
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const userCount = await prisma.user.count();
    const taskCount = await prisma.task.count();
    const worktimeCount = await prisma.workTime.count();
    const requestCount = await prisma.request.count();
    
    const stats = {
      users: userCount,
      tasks: taskCount,
      workTimes: worktimeCount,
      requests: requestCount,
      timestamp: new Date().toISOString()
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Claude Stats Error:', error);
    res.status(500).json({ error: 'Failed to get database stats' });
  }
});

// Spezifische Tabellen-Daten mit Pagination
router.get('/table/:tableName', async (req: Request, res: Response) => {
  try {
    const { tableName } = req.params;
    const { limit = 10, offset = 0 } = req.query;
    
    // Erlaubte Tabellen definieren (Whitelist)
    const allowedTables = [
      'User', 'Task', 'Request', 'WorkTime', 'Role', 'Permission',
      'Branch', 'Settings', 'Notification', 'CerebroCarticle',
      'Client', 'ConsultationInvoice'
    ];
    
    if (!allowedTables.includes(tableName)) {
      return res.status(403).json({ error: 'Table access not allowed' });
    }
    
    const limitNum = Math.min(parseInt(limit as string) || 10, 100);
    const offsetNum = parseInt(offset as string) || 0;
    
    // Verwende Prisma-Model basierend auf Tabellenname
    const model = (prisma as any)[tableName.toLowerCase()];
    if (!model) {
      return res.status(404).json({ error: 'Table not found' });
    }
    
    const data = await model.findMany({
      take: limitNum,
      skip: offsetNum,
      orderBy: { id: 'desc' }
    });
    
    const total = await model.count();
    
    res.json({
      tableName,
      data,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        total,
        hasMore: offsetNum + limitNum < total
      }
    });
  } catch (error) {
    console.error('Claude Table Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch table data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Frontend Console Logs abrufen
router.get('/console/logs', async (req: Request, res: Response) => {
  try {
    const { level, user, search, limit = 50 } = req.query;
    const consoleService = getClaudeConsoleService();
    
    let logs;
    
    if (search) {
      logs = consoleService.searchLogs(search as string, parseInt(limit as string));
    } else if (level) {
      logs = consoleService.getLogsByLevel(level as string, parseInt(limit as string));
    } else if (user) {
      logs = consoleService.getLogsByUser(user as string, parseInt(limit as string));
    } else {
      logs = consoleService.getRecentLogs(parseInt(limit as string));
    }
    
    res.json({
      logs,
      total: logs.length
    });
  } catch (error) {
    console.error('Claude Console Logs Error:', error);
    res.status(500).json({ error: 'Failed to fetch console logs' });
  }
});

// Console-Statistiken
router.get('/console/stats', async (req: Request, res: Response) => {
  try {
    const consoleService = getClaudeConsoleService();
    const stats = consoleService.getLogStats();
    
    res.json(stats);
  } catch (error) {
    console.error('Claude Console Stats Error:', error);
    res.status(500).json({ error: 'Failed to get console stats' });
  }
});

// Console-Logs nach Zeitraum
router.get('/console/timerange', async (req: Request, res: Response) => {
  try {
    const { start, end } = req.query;
    
    if (!start || !end) {
      return res.status(400).json({ error: 'Start and end time required' });
    }
    
    const startTime = new Date(start as string);
    const endTime = new Date(end as string);
    
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }
    
    const consoleService = getClaudeConsoleService();
    const logs = consoleService.getLogsByTimeRange(startTime, endTime);
    
    res.json({
      logs,
      total: logs.length,
      timeRange: {
        start: startTime.toISOString(),
        end: endTime.toISOString()
      }
    });
  } catch (error) {
    console.error('Claude Console Timerange Error:', error);
    res.status(500).json({ error: 'Failed to fetch logs by time range' });
  }
});

// Live Console Stream (für Entwicklung)
router.get('/console/stream', async (req: Request, res: Response) => {
  try {
    // Server-Sent Events für Live-Stream
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    // Sende ping alle 30 Sekunden
    const pingInterval = setInterval(() => {
      res.write('event: ping\ndata: ping\n\n');
    }, 30000);

    // Cleanup bei Verbindungsabbruch
    req.on('close', () => {
      clearInterval(pingInterval);
      res.end();
    });

    // Initiale Nachricht
    res.write('event: connected\ndata: Claude Console Stream connected\n\n');
    
  } catch (error) {
    console.error('Claude Console Stream Error:', error);
    res.status(500).json({ error: 'Failed to start console stream' });
  }
});

// Manuelles Log-Housekeeping
router.post('/console/cleanup', async (req: Request, res: Response) => {
  try {
    const consoleService = getClaudeConsoleService();
    consoleService.cleanup();
    
    res.json({
      success: true,
      message: 'Log-Housekeeping erfolgreich durchgeführt',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Fehler beim manuellen Log-Housekeeping:', error);
    res.status(500).json({
      error: 'Fehler beim Log-Housekeeping',
      message: error instanceof Error ? error.message : 'Unbekannter Fehler'
    });
  }
});

export default router; 
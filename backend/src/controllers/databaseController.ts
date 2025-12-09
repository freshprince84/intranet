import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

interface AuthenticatedRequest extends Request {
  userId: string;
}

// Logger für Database Operations
const logDatabaseOperation = (operation: string, userId: string, status: 'start' | 'success' | 'error', error?: string) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    operation,
    userId,
    status,
    error
  };
  
  const logPath = path.join(__dirname, '../../logs/database-operations.log');
  const logDir = path.dirname(logPath);
  
  // Stelle sicher, dass das Log-Verzeichnis existiert
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
  logger.log('Database Operation:', logEntry);
};

/**
 * Alle Daten aus einer spezifischen Tabelle löschen und Seeds neu laden
 * NUR für Tabellen mit Seed-Daten erlaubt
 */
export const resetTable = async (req: AuthenticatedRequest, res: Response) => {
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
    const user = await prisma.user.findFirst({
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
    const validPassword = await bcrypt.compare(adminPassword, user.password);
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
    await prisma.$transaction(async (tx) => {
      // Spezielle Behandlung für verschiedene Tabellen
      switch (tableName) {
        case 'permission':
          await tx.permission.deleteMany({});
          break;
        case 'role':
          // Lösche abhängige Daten zuerst
          await tx.userRole.deleteMany({});
          await tx.permission.deleteMany({});
          await tx.role.deleteMany({});
          break;
        case 'branch':
          await tx.branch.deleteMany({});
          break;
        case 'client':
          await tx.client.deleteMany({});
          break;
        default:
          // Generische Löschung für andere Tabellen
          await (tx as any)[tableName].deleteMany({});
      }
    });

    // 5. Führe Seed für diese Tabelle aus
    try {
      await runSeedForTable(tableName);
    } catch (seedError) {
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

  } catch (error) {
    logDatabaseOperation(`reset_table_${req.body.tableName}`, req.userId, 'error', error instanceof Error ? error.message : 'Unbekannter Fehler');
    logger.error('Fehler beim Zurücksetzen der Tabelle:', error);
    res.status(500).json({ 
      message: 'Fehler beim Zurücksetzen der Tabelle',
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    });
  }
};

/**
 * Verfügbare Tabellen für Reset abrufen
 * NUR Tabellen mit Seed-Daten
 */
export const getResetableTables = async (req: AuthenticatedRequest, res: Response) => {
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
  } catch (error) {
    logger.error('Fehler beim Abrufen der Tabellen:', error);
    res.status(500).json({ message: 'Fehler beim Abrufen der Tabellen' });
  }
};

/**
 * Seed für spezifische Tabelle ausführen
 */
async function runSeedForTable(tableName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const seedPath = path.join(__dirname, '../../prisma/seed.ts');
    exec(`npx ts-node ${seedPath} --table=${tableName}`, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      if (stderr) {
        logger.warn('Seed stderr:', stderr);
      }
      logger.log('Seed stdout:', stdout);
      resolve();
    });
  });
}

/**
 * NUR Demo-Clients löschen (ohne Seed-Neuaufbau)
 */
export const deleteDemoClients = async (req: AuthenticatedRequest, res: Response) => {
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
    const user = await prisma.user.findFirst({
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
    const validPassword = await bcrypt.compare(adminPassword, user.password);
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

    // 4. Hole zuerst alle Clients, um zu überprüfen, welche Demo-Clients existieren
    const allClients = await prisma.client.findMany({
      select: { id: true, name: true }
    });

    // Filtere die Demo-Client IDs
    const demoClientIds = allClients
      .filter(client => demoClientNames.includes(client.name))
      .map(client => client.id);

    logger.log(`Gefundene Demo-Clients: ${demoClientIds.length}`, demoClientIds);

    // 5. Lösche nur Demo-Clients in einer Transaction
    let deletedCount = 0;
    
    if (demoClientIds.length > 0) {
      await prisma.$transaction(async (tx) => {
        // Lösche jeden Demo-Client
        for (const clientId of demoClientIds) {
          try {
            await tx.client.delete({
              where: { id: clientId }
            });
            deletedCount++;
          } catch (deleteError) {
            logger.error(`Fehler beim Löschen von Client ID ${clientId}:`, deleteError);
            // Weiter mit den anderen Clients in der Transaction
          }
        }
      });
    }

    logDatabaseOperation('delete_demo_clients', userId, 'success');
    res.json({ 
      message: deletedCount > 0 
        ? `${deletedCount} Demo-Clients wurden erfolgreich gelöscht`
        : 'Keine Demo-Clients gefunden',
      count: deletedCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logDatabaseOperation('delete_demo_clients', req.userId, 'error', error instanceof Error ? error.message : 'Unbekannter Fehler');
    logger.error('Fehler beim Löschen der Demo-Clients:', error);
    res.status(500).json({ 
      message: 'Fehler beim Löschen der Demo-Clients',
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    });
  }
};

/**
 * Database-Logs abrufen (für Audit)
 */
export const getDatabaseLogs = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const logPath = path.join(__dirname, '../../logs/database-operations.log');
    
    if (!fs.existsSync(logPath)) {
      return res.json([]);
    }

    const logContent = fs.readFileSync(logPath, 'utf-8');
    const logs = logContent
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(log => log !== null)
      .reverse() // Neueste zuerst
      .slice(0, 50); // Nur die letzten 50 Einträge

    res.json(logs);
  } catch (error) {
    logger.error('Fehler beim Lesen der Database-Logs:', error);
    res.status(500).json({ message: 'Fehler beim Lesen der Logs' });
  }
}; 
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

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
  console.log('Database Operation:', logEntry);
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
    console.error('Fehler beim Zurücksetzen der Tabelle:', error);
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
    console.error('Fehler beim Abrufen der Tabellen:', error);
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
        console.warn('Seed stderr:', stderr);
      }
      console.log('Seed stdout:', stdout);
      resolve();
    });
  });
}

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
    console.error('Fehler beim Lesen der Database-Logs:', error);
    res.status(500).json({ message: 'Fehler beim Lesen der Logs' });
  }
}; 
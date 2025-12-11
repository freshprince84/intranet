import dotenv from 'dotenv';
import path from 'path';

// Lade Environment-Variablen aus .env Datei
dotenv.config({ path: path.join(__dirname, '../.env') });

import http from 'http';
import app, { cleanupTimers as cleanupAppTimers } from './app';
import { cleanupRateLimiter } from './middleware/rateLimiter';
import { getClaudeConsoleService } from './services/claudeConsoleService';
import { stopWorkers } from './queues';
import { prisma } from './utils/prisma';
import { logger } from './utils/logger';
import { cacheCleanupService } from './services/cacheCleanupService';

// ENCRYPTION_KEY-Prüfung beim Start
const encryptionKey = process.env.ENCRYPTION_KEY;
if (!encryptionKey) {
  logger.error('\n❌ KRITISCHER FEHLER: ENCRYPTION_KEY ist nicht gesetzt!');
  logger.error('   Der Passwort-Manager benötigt einen Verschlüsselungsschlüssel.');
  logger.error('   Bitte setzen Sie ENCRYPTION_KEY in der .env Datei.');
  logger.error('   Generierung: node -e "logger.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"\n');
  process.exit(1);
}

if (encryptionKey.length !== 64) {
  logger.error('\n❌ KRITISCHER FEHLER: ENCRYPTION_KEY hat falsche Länge!');
  logger.error(`   Erwartet: 64 hex characters (32 bytes)`);
  logger.error(`   Aktuell: ${encryptionKey.length} characters`);
  logger.error('   Generierung: node -e "logger.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"\n');
  process.exit(1);
}

logger.log('✅ ENCRYPTION_KEY validiert');

// HTTP-Server mit WebSocket-Support erstellen
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Claude Console WebSocket-Service integrieren
const claudeConsoleService = getClaudeConsoleService();
claudeConsoleService.setupWebSocketServer(server);

// ✅ FIX: Warte auf DB-Verbindung bevor Server startet
const startServer = async () => {
  try {
    // Prisma Connection mit Retry
    let connected = false;
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        await prisma.$connect();
        logger.log('✅ Prisma DB-Verbindung hergestellt');
        connected = true;
        break;
      } catch (err) {
        logger.warn(`[Prisma] Verbindungsversuch ${attempt}/5 fehlgeschlagen, retry in 2s...`);
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    if (!connected) {
      logger.error('❌ Konnte keine DB-Verbindung herstellen nach 5 Versuchen!');
      process.exit(1);
    }
  } catch (err) {
    logger.error('❌ DB-Verbindungsfehler:', err);
    process.exit(1);
  }

  // Server starten
  server.listen(PORT, () => {
    logger.log(`🚀 Server läuft auf Port ${PORT}`);
    logger.log(`📊 Database verfügbar`);
    logger.log(`🔍 Claude API verfügbar unter /api/claude/`);
    logger.log(`🖥️ Claude Console WebSocket verfügbar unter ws://localhost:${PORT}/ws/claude-console`);
  });
};

startServer();

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(`\n❌ FEHLER: Port ${PORT} ist bereits belegt!`);
    logger.error(`\n📋 Lösungsvorschläge:`);
    logger.error(`   1. Beenden Sie den bereits laufenden Prozess auf Port ${PORT}`);
    logger.error(`   2. Unter Windows: netstat -ano | findstr :${PORT}`);
    logger.error(`   3. Oder verwenden Sie einen anderen Port: PORT=5001 npm run dev`);
    logger.error(`\n💡 Falls der Server bereits läuft, müssen Sie ihn nicht neu starten.\n`);
    process.exit(1);
  } else {
    logger.error(`\n❌ FEHLER beim Starten des Servers:`, err);
    process.exit(1);
  }
});

// Graceful Shutdown
process.on('SIGTERM', async () => {
  logger.log('SIGTERM signal empfangen. Server wird heruntergefahren...');
  await stopWorkers();
  // ✅ MEMORY: Cleanup Timer
  cleanupTimers(); // index.ts Timer
  cleanupAppTimers(); // app.ts Timer
  cleanupRateLimiter(); // rateLimiter Timer
  // ✅ PERFORMANCE: Prisma-Instanz disconnecten
  await prisma.$disconnect();
  server.close(() => {
    logger.log('Server erfolgreich heruntergefahren.');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.log('SIGINT signal empfangen. Server wird heruntergefahren...');
  await stopWorkers();
  // ✅ MEMORY: Cleanup Timer
  cleanupTimers(); // index.ts Timer
  cleanupAppTimers(); // app.ts Timer
  cleanupRateLimiter(); // rateLimiter Timer
  // ✅ PERFORMANCE: Prisma-Instanz disconnecten
  await prisma.$disconnect();
  server.close(() => {
    logger.log('Server erfolgreich heruntergefahren.');
    process.exit(0);
  });
});

// ✅ MEMORY: Timer für automatische Stornierung von Tour-Buchungen (alle 5 Minuten)
let tourBookingSchedulerInterval: NodeJS.Timeout | null = null;
tourBookingSchedulerInterval = setInterval(async () => {
  try {
    const { TourBookingScheduler } = await import('./services/tourBookingScheduler');
    await TourBookingScheduler.checkExpiredBookings();
  } catch (error) {
    logger.error('[Timer] Fehler beim Prüfen abgelaufener Tour-Buchungen:', error);
  }
}, 5 * 60 * 1000); // 5 Minuten

logger.log('✅ Tour-Booking-Scheduler Timer gestartet (prüft alle 5 Minuten)');

// ✅ MEMORY: Starte Reservation Passcode Cleanup Scheduler (prüft täglich um 11:00 Uhr)
let passcodeCleanupTimeout: NodeJS.Timeout | null = null;
passcodeCleanupTimeout = setTimeout(async () => {
  try {
    const { ReservationPasscodeCleanupScheduler } = await import('./services/reservationPasscodeCleanupScheduler');
    ReservationPasscodeCleanupScheduler.start();
  } catch (error) {
    logger.error('[Timer] Fehler beim Starten des Passcode-Cleanup-Schedulers:', error);
  }
}, 1000); // Starte nach 1 Sekunde

// ✅ MEMORY: Cleanup-Funktion für Server-Shutdown
export const cleanupTimers = () => {
  if (tourBookingSchedulerInterval) {
    clearInterval(tourBookingSchedulerInterval);
    tourBookingSchedulerInterval = null;
    logger.log('✅ Tour-Booking-Scheduler Timer gestoppt');
  }
  if (passcodeCleanupTimeout) {
    clearTimeout(passcodeCleanupTimeout);
    passcodeCleanupTimeout = null;
    logger.log('✅ Passcode-Cleanup-Timeout gestoppt');
  }
  // ✅ MEMORY-LEAK-FIX: Cache-Cleanup-Service stoppen
  cacheCleanupService.stop();
};

logger.log('✅ Reservation-Passcode-Cleanup-Scheduler wird gestartet (prüft täglich um 11:00 Uhr)');

// ✅ MEMORY-LEAK-FIX: Starte Cache-Cleanup-Service
cacheCleanupService.start();

export default server;

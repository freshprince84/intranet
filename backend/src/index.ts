import dotenv from 'dotenv';
import path from 'path';

// Lade Environment-Variablen aus .env Datei
dotenv.config({ path: path.join(__dirname, '../.env') });

import http from 'http';
import app from './app';
import { getClaudeConsoleService } from './services/claudeConsoleService';
import { stopWorkers } from './queues';
import { prisma, getAllPrismaPools } from './utils/prisma';

// ENCRYPTION_KEY-Prüfung beim Start
const encryptionKey = process.env.ENCRYPTION_KEY;
if (!encryptionKey) {
  console.error('\n❌ KRITISCHER FEHLER: ENCRYPTION_KEY ist nicht gesetzt!');
  console.error('   Der Passwort-Manager benötigt einen Verschlüsselungsschlüssel.');
  console.error('   Bitte setzen Sie ENCRYPTION_KEY in der .env Datei.');
  console.error('   Generierung: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"\n');
  process.exit(1);
}

if (encryptionKey.length !== 64) {
  console.error('\n❌ KRITISCHER FEHLER: ENCRYPTION_KEY hat falsche Länge!');
  console.error(`   Erwartet: 64 hex characters (32 bytes)`);
  console.error(`   Aktuell: ${encryptionKey.length} characters`);
  console.error('   Generierung: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"\n');
  process.exit(1);
}

console.log('✅ ENCRYPTION_KEY validiert');

// HTTP-Server mit WebSocket-Support erstellen
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Claude Console WebSocket-Service integrieren
const claudeConsoleService = getClaudeConsoleService();
claudeConsoleService.setupWebSocketServer(server);

// Server starten
server.listen(PORT, () => {
  console.log(`🚀 Server läuft auf Port ${PORT}`);
  console.log(`📊 Database verfügbar`);
  console.log(`🔍 Claude API verfügbar unter /api/claude/`);
  console.log(`🖥️ Claude Console WebSocket verfügbar unter ws://localhost:${PORT}/ws/claude-console`);
}).on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ FEHLER: Port ${PORT} ist bereits belegt!`);
    console.error(`\n📋 Lösungsvorschläge:`);
    console.error(`   1. Beenden Sie den bereits laufenden Prozess auf Port ${PORT}`);
    console.error(`   2. Unter Windows: netstat -ano | findstr :${PORT}`);
    console.error(`   3. Oder verwenden Sie einen anderen Port: PORT=5001 npm run dev`);
    console.error(`\n💡 Falls der Server bereits läuft, müssen Sie ihn nicht neu starten.\n`);
    process.exit(1);
  } else {
    console.error(`\n❌ FEHLER beim Starten des Servers:`, err);
    process.exit(1);
  }
});

// Graceful Shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal empfangen. Server wird heruntergefahren...');
  await stopWorkers();
  // ✅ PERFORMANCE: Alle Prisma-Pools disconnecten
  const pools = getAllPrismaPools();
  await Promise.all(pools.map(pool => pool.$disconnect()));
  server.close(() => {
    console.log('Server erfolgreich heruntergefahren.');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal empfangen. Server wird heruntergefahren...');
  await stopWorkers();
  // ✅ PERFORMANCE: Alle Prisma-Pools disconnecten
  const pools = getAllPrismaPools();
  await Promise.all(pools.map(pool => pool.$disconnect()));
  server.close(() => {
    console.log('Server erfolgreich heruntergefahren.');
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
    console.error('[Timer] Fehler beim Prüfen abgelaufener Tour-Buchungen:', error);
  }
}, 5 * 60 * 1000); // 5 Minuten

console.log('✅ Tour-Booking-Scheduler Timer gestartet (prüft alle 5 Minuten)');

// ✅ MEMORY: Starte Reservation Passcode Cleanup Scheduler (prüft täglich um 11:00 Uhr)
let passcodeCleanupTimeout: NodeJS.Timeout | null = null;
passcodeCleanupTimeout = setTimeout(async () => {
  try {
    const { ReservationPasscodeCleanupScheduler } = await import('./services/reservationPasscodeCleanupScheduler');
    ReservationPasscodeCleanupScheduler.start();
  } catch (error) {
    console.error('[Timer] Fehler beim Starten des Passcode-Cleanup-Schedulers:', error);
  }
}, 1000); // Starte nach 1 Sekunde

// ✅ MEMORY: Cleanup-Funktion für Server-Shutdown
export const cleanupTimers = () => {
  if (tourBookingSchedulerInterval) {
    clearInterval(tourBookingSchedulerInterval);
    tourBookingSchedulerInterval = null;
    console.log('✅ Tour-Booking-Scheduler Timer gestoppt');
  }
  if (passcodeCleanupTimeout) {
    clearTimeout(passcodeCleanupTimeout);
    passcodeCleanupTimeout = null;
    console.log('✅ Passcode-Cleanup-Timeout gestoppt');
  }
};

console.log('✅ Reservation-Passcode-Cleanup-Scheduler wird gestartet (prüft täglich um 11:00 Uhr)');

export default server;

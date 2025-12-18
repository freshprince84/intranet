"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.cleanupTimers = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Lade Environment-Variablen aus .env Datei
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../.env') });
const http_1 = __importDefault(require("http"));
const app_1 = __importStar(require("./app"));
const rateLimiter_1 = require("./middleware/rateLimiter");
const claudeConsoleService_1 = require("./services/claudeConsoleService");
const queues_1 = require("./queues");
const prisma_1 = require("./utils/prisma");
const logger_1 = require("./utils/logger");
const cacheCleanupService_1 = require("./services/cacheCleanupService");
// ENCRYPTION_KEY-Prüfung beim Start
const encryptionKey = process.env.ENCRYPTION_KEY;
if (!encryptionKey) {
    logger_1.logger.error('\n❌ KRITISCHER FEHLER: ENCRYPTION_KEY ist nicht gesetzt!');
    logger_1.logger.error('   Der Passwort-Manager benötigt einen Verschlüsselungsschlüssel.');
    logger_1.logger.error('   Bitte setzen Sie ENCRYPTION_KEY in der .env Datei.');
    logger_1.logger.error('   Generierung: node -e "logger.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"\n');
    process.exit(1);
}
if (encryptionKey.length !== 64) {
    logger_1.logger.error('\n❌ KRITISCHER FEHLER: ENCRYPTION_KEY hat falsche Länge!');
    logger_1.logger.error(`   Erwartet: 64 hex characters (32 bytes)`);
    logger_1.logger.error(`   Aktuell: ${encryptionKey.length} characters`);
    logger_1.logger.error('   Generierung: node -e "logger.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"\n');
    process.exit(1);
}
logger_1.logger.log('✅ ENCRYPTION_KEY validiert');
// HTTP-Server mit WebSocket-Support erstellen
const PORT = process.env.PORT || 5000;
const server = http_1.default.createServer(app_1.default);
// Claude Console WebSocket-Service integrieren
const claudeConsoleService = (0, claudeConsoleService_1.getClaudeConsoleService)();
claudeConsoleService.setupWebSocketServer(server);
// ✅ FIX: Warte auf DB-Verbindung bevor Server startet
const startServer = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Prisma Connection mit Retry
        let connected = false;
        for (let attempt = 1; attempt <= 5; attempt++) {
            try {
                yield prisma_1.prisma.$connect();
                logger_1.logger.log('✅ Prisma DB-Verbindung hergestellt');
                connected = true;
                break;
            }
            catch (err) {
                logger_1.logger.warn(`[Prisma] Verbindungsversuch ${attempt}/5 fehlgeschlagen, retry in 2s...`);
                yield new Promise(r => setTimeout(r, 2000));
            }
        }
        if (!connected) {
            logger_1.logger.error('❌ Konnte keine DB-Verbindung herstellen nach 5 Versuchen!');
            process.exit(1);
        }
    }
    catch (err) {
        logger_1.logger.error('❌ DB-Verbindungsfehler:', err);
        process.exit(1);
    }
    // Server starten
    server.listen(PORT, () => {
        logger_1.logger.log(`🚀 Server läuft auf Port ${PORT}`);
        logger_1.logger.log(`📊 Database verfügbar`);
        logger_1.logger.log(`🔍 Claude API verfügbar unter /api/claude/`);
        logger_1.logger.log(`🖥️ Claude Console WebSocket verfügbar unter ws://localhost:${PORT}/ws/claude-console`);
    });
});
startServer();
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        logger_1.logger.error(`\n❌ FEHLER: Port ${PORT} ist bereits belegt!`);
        logger_1.logger.error(`\n📋 Lösungsvorschläge:`);
        logger_1.logger.error(`   1. Beenden Sie den bereits laufenden Prozess auf Port ${PORT}`);
        logger_1.logger.error(`   2. Unter Windows: netstat -ano | findstr :${PORT}`);
        logger_1.logger.error(`   3. Oder verwenden Sie einen anderen Port: PORT=5001 npm run dev`);
        logger_1.logger.error(`\n💡 Falls der Server bereits läuft, müssen Sie ihn nicht neu starten.\n`);
        process.exit(1);
    }
    else {
        logger_1.logger.error(`\n❌ FEHLER beim Starten des Servers:`, err);
        process.exit(1);
    }
});
// Graceful Shutdown
process.on('SIGTERM', () => __awaiter(void 0, void 0, void 0, function* () {
    logger_1.logger.log('SIGTERM signal empfangen. Server wird heruntergefahren...');
    yield (0, queues_1.stopWorkers)();
    // ✅ MEMORY: Cleanup Timer
    yield (0, exports.cleanupTimers)(); // index.ts Timer
    (0, app_1.cleanupTimers)(); // app.ts Timer
    (0, rateLimiter_1.cleanupRateLimiter)(); // rateLimiter Timer
    // ✅ PERFORMANCE: Prisma-Instanz disconnecten
    yield prisma_1.prisma.$disconnect();
    server.close(() => {
        logger_1.logger.log('Server erfolgreich heruntergefahren.');
        process.exit(0);
    });
}));
process.on('SIGINT', () => __awaiter(void 0, void 0, void 0, function* () {
    logger_1.logger.log('SIGINT signal empfangen. Server wird heruntergefahren...');
    yield (0, queues_1.stopWorkers)();
    // ✅ MEMORY: Cleanup Timer
    yield (0, exports.cleanupTimers)(); // index.ts Timer
    (0, app_1.cleanupTimers)(); // app.ts Timer
    (0, rateLimiter_1.cleanupRateLimiter)(); // rateLimiter Timer
    // ✅ PERFORMANCE: Prisma-Instanz disconnecten
    yield prisma_1.prisma.$disconnect();
    server.close(() => {
        logger_1.logger.log('Server erfolgreich heruntergefahren.');
        process.exit(0);
    });
}));
// ✅ MEMORY: Timer für automatische Stornierung von Tour-Buchungen (alle 5 Minuten)
let tourBookingSchedulerInterval = null;
tourBookingSchedulerInterval = setInterval(() => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { TourBookingScheduler } = yield Promise.resolve().then(() => __importStar(require('./services/tourBookingScheduler')));
        yield TourBookingScheduler.checkExpiredBookings();
    }
    catch (error) {
        logger_1.logger.error('[Timer] Fehler beim Prüfen abgelaufener Tour-Buchungen:', error);
    }
}), 5 * 60 * 1000); // 5 Minuten
logger_1.logger.log('✅ Tour-Booking-Scheduler Timer gestartet (prüft alle 5 Minuten)');
// ✅ MEMORY: Starte Reservation Passcode Cleanup Scheduler (prüft täglich um 11:00 Uhr)
let passcodeCleanupTimeout = null;
passcodeCleanupTimeout = setTimeout(() => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { ReservationPasscodeCleanupScheduler } = yield Promise.resolve().then(() => __importStar(require('./services/reservationPasscodeCleanupScheduler')));
        ReservationPasscodeCleanupScheduler.start();
        // Rate Shopping Scheduler
        const { RateShoppingScheduler } = yield Promise.resolve().then(() => __importStar(require('./services/rateShoppingScheduler')));
        RateShoppingScheduler.start();
        // Pricing Rule Scheduler (Preisregeln automatisch ausführen)
        const { PricingRuleScheduler } = yield Promise.resolve().then(() => __importStar(require('./services/pricingRuleScheduler')));
        PricingRuleScheduler.start();
        // Occupancy Monitoring Scheduler (Occupancy-Änderungen überwachen)
        const { OccupancyMonitoringService } = yield Promise.resolve().then(() => __importStar(require('./services/occupancyMonitoringService')));
        // Prüfe alle 12 Stunden auf Occupancy-Änderungen
        setInterval(() => __awaiter(void 0, void 0, void 0, function* () {
            yield OccupancyMonitoringService.checkAllBranches();
        }), 12 * 60 * 60 * 1000); // 12 Stunden
        // Führe sofort einen Check aus
        OccupancyMonitoringService.checkAllBranches().catch(err => {
            logger_1.logger.error('[OccupancyMonitoring] Fehler beim ersten Check:', err);
        });
    }
    catch (error) {
        logger_1.logger.error('[Timer] Fehler beim Starten des Passcode-Cleanup-Schedulers:', error);
    }
}), 1000); // Starte nach 1 Sekunde
// ✅ MEMORY: Cleanup-Funktion für Server-Shutdown
const cleanupTimers = () => __awaiter(void 0, void 0, void 0, function* () {
    if (tourBookingSchedulerInterval) {
        clearInterval(tourBookingSchedulerInterval);
        tourBookingSchedulerInterval = null;
        logger_1.logger.log('✅ Tour-Booking-Scheduler Timer gestoppt');
    }
    if (passcodeCleanupTimeout) {
        clearTimeout(passcodeCleanupTimeout);
        passcodeCleanupTimeout = null;
        logger_1.logger.log('✅ Passcode-Cleanup-Timeout gestoppt');
    }
    // ✅ MEMORY-LEAK-FIX: Cache-Cleanup-Service stoppen
    cacheCleanupService_1.cacheCleanupService.stop();
    // Rate Shopping Scheduler stoppen
    try {
        const { RateShoppingScheduler } = yield Promise.resolve().then(() => __importStar(require('./services/rateShoppingScheduler')));
        RateShoppingScheduler.stop();
    }
    catch (error) {
        logger_1.logger.error('[Cleanup] Fehler beim Stoppen des Rate Shopping Schedulers:', error);
    }
    // Pricing Rule Scheduler stoppen
    try {
        const { PricingRuleScheduler } = yield Promise.resolve().then(() => __importStar(require('./services/pricingRuleScheduler')));
        PricingRuleScheduler.stop();
    }
    catch (error) {
        logger_1.logger.error('[Cleanup] Fehler beim Stoppen des Pricing Rule Schedulers:', error);
    }
});
exports.cleanupTimers = cleanupTimers;
logger_1.logger.log('✅ Reservation-Passcode-Cleanup-Scheduler wird gestartet (prüft täglich um 11:00 Uhr)');
// ✅ MEMORY-LEAK-FIX: Starte Cache-Cleanup-Service
cacheCleanupService_1.cacheCleanupService.start();
exports.default = server;
//# sourceMappingURL=index.js.map
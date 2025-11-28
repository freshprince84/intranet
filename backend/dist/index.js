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
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Lade Environment-Variablen aus .env Datei
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../.env') });
const http_1 = __importDefault(require("http"));
const app_1 = __importDefault(require("./app"));
const claudeConsoleService_1 = require("./services/claudeConsoleService");
const queues_1 = require("./queues");
const prisma_1 = require("./utils/prisma");
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
const server = http_1.default.createServer(app_1.default);
// Claude Console WebSocket-Service integrieren
const claudeConsoleService = (0, claudeConsoleService_1.getClaudeConsoleService)();
claudeConsoleService.setupWebSocketServer(server);
// Server starten
server.listen(PORT, () => {
    console.log(`🚀 Server läuft auf Port ${PORT}`);
    console.log(`📊 Database verfügbar`);
    console.log(`🔍 Claude API verfügbar unter /api/claude/`);
    console.log(`🖥️ Claude Console WebSocket verfügbar unter ws://localhost:${PORT}/ws/claude-console`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ FEHLER: Port ${PORT} ist bereits belegt!`);
        console.error(`\n📋 Lösungsvorschläge:`);
        console.error(`   1. Beenden Sie den bereits laufenden Prozess auf Port ${PORT}`);
        console.error(`   2. Unter Windows: netstat -ano | findstr :${PORT}`);
        console.error(`   3. Oder verwenden Sie einen anderen Port: PORT=5001 npm run dev`);
        console.error(`\n💡 Falls der Server bereits läuft, müssen Sie ihn nicht neu starten.\n`);
        process.exit(1);
    }
    else {
        console.error(`\n❌ FEHLER beim Starten des Servers:`, err);
        process.exit(1);
    }
});
// Graceful Shutdown
process.on('SIGTERM', () => __awaiter(void 0, void 0, void 0, function* () {
    console.log('SIGTERM signal empfangen. Server wird heruntergefahren...');
    yield (0, queues_1.stopWorkers)();
    // ✅ PERFORMANCE: Alle Prisma-Pools disconnecten
    const pools = (0, prisma_1.getAllPrismaPools)();
    yield Promise.all(pools.map(pool => pool.$disconnect()));
    server.close(() => {
        console.log('Server erfolgreich heruntergefahren.');
        process.exit(0);
    });
}));
process.on('SIGINT', () => __awaiter(void 0, void 0, void 0, function* () {
    console.log('SIGINT signal empfangen. Server wird heruntergefahren...');
    yield (0, queues_1.stopWorkers)();
    // ✅ PERFORMANCE: Alle Prisma-Pools disconnecten
    const pools = (0, prisma_1.getAllPrismaPools)();
    yield Promise.all(pools.map(pool => pool.$disconnect()));
    server.close(() => {
        console.log('Server erfolgreich heruntergefahren.');
        process.exit(0);
    });
}));
// Timer für automatische Stornierung von Tour-Buchungen (alle 5 Minuten)
let tourBookingSchedulerInterval = null;
setInterval(() => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { TourBookingScheduler } = yield Promise.resolve().then(() => __importStar(require('./services/tourBookingScheduler')));
        yield TourBookingScheduler.checkExpiredBookings();
    }
    catch (error) {
        console.error('[Timer] Fehler beim Prüfen abgelaufener Tour-Buchungen:', error);
    }
}), 5 * 60 * 1000); // 5 Minuten
console.log('✅ Tour-Booking-Scheduler Timer gestartet (prüft alle 5 Minuten)');
exports.default = server;
//# sourceMappingURL=index.js.map
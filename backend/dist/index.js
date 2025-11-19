"use strict";
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
    server.close(() => {
        console.log('Server erfolgreich heruntergefahren.');
        process.exit(0);
    });
}));
process.on('SIGINT', () => __awaiter(void 0, void 0, void 0, function* () {
    console.log('SIGINT signal empfangen. Server wird heruntergefahren...');
    yield (0, queues_1.stopWorkers)();
    server.close(() => {
        console.log('Server erfolgreich heruntergefahren.');
        process.exit(0);
    });
}));
exports.default = server;
//# sourceMappingURL=index.js.map
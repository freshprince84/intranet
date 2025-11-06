"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const app_1 = __importDefault(require("./app"));
const claudeConsoleService_1 = require("./services/claudeConsoleService");
const PORT = process.env.PORT || 5000;
// HTTP-Server erstellen
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
process.on('SIGTERM', () => {
    console.log('SIGTERM signal empfangen. Server wird heruntergefahren...');
    claudeConsoleService.cleanup();
    server.close(() => {
        console.log('Server erfolgreich heruntergefahren.');
        process.exit(0);
    });
});
process.on('SIGINT', () => {
    console.log('SIGINT signal empfangen. Server wird heruntergefahren...');
    claudeConsoleService.cleanup();
    server.close(() => {
        console.log('Server erfolgreich heruntergefahren.');
        process.exit(0);
    });
});
exports.default = server;
//# sourceMappingURL=server.js.map
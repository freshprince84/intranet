import dotenv from 'dotenv';
import path from 'path';

// Lade Environment-Variablen aus .env Datei
dotenv.config({ path: path.join(__dirname, '../.env') });

import http from 'http';
import app from './app';
import { getClaudeConsoleService } from './services/claudeConsoleService';
import { stopWorkers } from './queues';

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
  server.close(() => {
    console.log('Server erfolgreich heruntergefahren.');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal empfangen. Server wird heruntergefahren...');
  await stopWorkers();
  server.close(() => {
    console.log('Server erfolgreich heruntergefahren.');
    process.exit(0);
  });
});

export default server;

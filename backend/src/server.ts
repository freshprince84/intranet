import http from 'http';
import app from './app';
import { getClaudeConsoleService } from './services/claudeConsoleService';

const PORT = process.env.PORT || 5000;

// HTTP-Server erstellen
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
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal empfangen. Server wird heruntergefahren...');
  server.close(() => {
    console.log('Server erfolgreich heruntergefahren.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal empfangen. Server wird heruntergefahren...');
  server.close(() => {
    console.log('Server erfolgreich heruntergefahren.');
    process.exit(0);
  });
});

export default server; 
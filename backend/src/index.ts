import app from './app';
import dotenv from 'dotenv';

dotenv.config();

const PORT = Number(process.env.PORT) || 5000;
const HOST = '0.0.0.0';

console.log('Server wird gestartet...');
console.log(`Konfigurierter Port: ${PORT}`);
console.log(`Konfigurierter Host: ${HOST}`);

// Versuch, alle asynchronen Initialisierungen zu tracken
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unbehandelte Promise-Ablehnung beim Serverstart:', reason);
});

app.listen(PORT, HOST, () => {
  console.log(`API läuft auf http://${HOST}:${PORT}/api`);
}); 
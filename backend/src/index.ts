import app from './app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
    console.log(`API erreichbar unter: http://localhost:${PORT}/api`);
    console.log('Alle Routen registriert und aktiv.');
}); 
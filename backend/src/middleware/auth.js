const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const authMiddleware = async (req, res, next) => {
    try {
        console.log('Auth Headers:', req.headers); // Debug-Log
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log('Keine Auth Header gefunden oder falsches Format'); // Debug-Log
            return res.status(401).json({ message: 'Keine Authentifizierung vorhanden' });
        }

        const token = authHeader.split(' ')[1];
        console.log('Token gefunden:', token.substring(0, 20) + '...'); // Debug-Log
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Token decoded:', decoded); // Debug-Log
        
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId }
        });
        
        if (!user) {
            console.log('Benutzer nicht gefunden für ID:', decoded.userId); // Debug-Log
            return res.status(401).json({ message: 'Benutzer nicht gefunden' });
        }

        // Setze nur die userId, da wir den User bei Bedarf neu laden
        req.userId = decoded.userId;
        next();
    } catch (error) {
        console.error('Auth-Middleware Fehler:', error); // Debug-Log
        res.status(401).json({ message: 'Ungültiger Token', error: error.message });
    }
};

module.exports = { authMiddleware }; 
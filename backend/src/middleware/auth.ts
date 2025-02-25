import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Die globale Interface-Definition wird aus express.d.ts verwendet

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('Auth Headers:', req.headers); // Debug-Log
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Keine Auth Header gefunden oder falsches Format'); // Debug-Log
      return res.status(401).json({ message: 'Keine Authentifizierung vorhanden' });
    }

    const token = authHeader.split(' ')[1];
    console.log('Token gefunden:', token.substring(0, 20) + '...'); // Debug-Log

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as {
      userId: number;
      username: string;
    };
    console.log('Token decoded:', decoded); // Debug-Log

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      console.log('Benutzer nicht gefunden für ID:', decoded.userId); // Debug-Log
      return res.status(401).json({ message: 'Benutzer nicht gefunden' });
    }

    req.userId = decoded.userId;
    next();
  } catch (error: unknown) {
    console.error('Auth-Middleware Fehler:', error); // Debug-Log
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    res.status(401).json({ message: 'Ungültiger Token', error: errorMessage });
  }
}; 
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Erweitere den Request-Typ, um den Benutzer hinzuzufügen
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        email: string;
        roles: string[];
      };
      userId: string; // Für Abwärtskompatibilität - als string, weil parseInt in permissionMiddleware verwendet wird
      roleId: string; // Für Abwärtskompatibilität - als string, weil parseInt in permissionMiddleware verwendet wird
    }
  }
}

// Middleware zur Überprüfung des JWT-Tokens
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('Auth Headers:', req.headers);
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Kein Token bereitgestellt' });
    }

    console.log('Token gefunden:', token.substring(0, 20) + '...');

    // JWT-Secret aus der Umgebungsvariable
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('JWT_SECRET ist nicht definiert');
      return res.status(500).json({ message: 'Interner Server-Fehler' });
    }

    // Token verifizieren
    jwt.verify(token, secret, async (err: any, decoded: any) => {
      if (err) {
        console.error('Token-Verifizierung fehlgeschlagen:', err);
        return res.status(403).json({ message: 'Ungültiges oder abgelaufenes Token' });
      }

      console.log('Token decoded:', decoded);

      // Für Abwärtskompatibilität
      if (decoded.userId) {
        req.userId = decoded.userId.toString(); // Als String speichern
        req.roleId = decoded.roleId.toString(); // Als String speichern
        console.log('Typ von req.userId:', typeof req.userId, 'Wert:', req.userId);
        console.log('Typ von req.roleId:', typeof req.roleId, 'Wert:', req.roleId);
      }

      // Benutzer aus der Datenbank abrufen
      const user = await prisma.user.findUnique({
        where: { id: Number(decoded.userId) },
        include: {
          roles: {
            include: {
              role: true
            }
          }
        }
      });

      if (!user) {
        return res.status(404).json({ message: 'Benutzer nicht gefunden' });
      }

      // Benutzerinformationen zum Request hinzufügen
      req.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles.map(ur => ur.role.name)
      };

      next();
    });
  } catch (error) {
    console.error('Fehler bei der Authentifizierung:', error);
    res.status(500).json({ message: 'Interner Server-Fehler' });
  }
};

// Export der Middleware unter beiden Namen für Kompatibilität
export const authMiddleware = authenticateToken; 
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Middleware zur Überprüfung der Benutzerrolle
export const checkRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Prüfen, ob der Benutzer authentifiziert ist
      if (!req.user) {
        return res.status(401).json({ message: 'Nicht authentifiziert' });
      }

      // Prüfen, ob der Benutzer eine der erlaubten Rollen hat
      const hasAllowedRole = req.user.roles.some(role => allowedRoles.includes(role));

      if (!hasAllowedRole) {
        return res.status(403).json({ 
          message: 'Zugriff verweigert. Sie haben nicht die erforderlichen Berechtigungen.',
          requiredRoles: allowedRoles,
          userRoles: req.user.roles
        });
      }

      next();
    } catch (error) {
      logger.error('Fehler bei der Rollenprüfung:', error);
      res.status(500).json({ message: 'Interner Server-Fehler' });
    }
  };
}; 
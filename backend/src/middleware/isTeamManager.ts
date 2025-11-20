import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';

/**
 * Middleware zur Überprüfung, ob ein Benutzer die Berechtigung hat, als Team-Manager zu agieren
 */
export const isTeamManager = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    // Hole den Benutzer mit seiner aktiven Rolle und deren Berechtigungen
    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
      include: {
        roles: {
          where: { lastUsed: true },
          include: {
            role: {
              include: {
                permissions: true
              }
            }
          }
        }
      }
    });

    if (!user || user.roles.length === 0) {
      return res.status(403).json({ message: 'Keine aktive Rolle gefunden' });
    }

    // Prüfe, ob der Benutzer die Berechtigung für team_worktime_control hat
    const activeRole = user.roles[0].role;
    const hasTeamWorktimeControlPermission = activeRole.permissions.some(
      permission => 
        permission.entity === 'team_worktime_control' && 
        permission.entityType === 'page' && 
        (permission.accessLevel === 'both' || permission.accessLevel === 'write')
    );

    // Prüfe, ob der Benutzer die Berechtigung für team_worktime hat
    const hasTeamWorktimePermission = activeRole.permissions.some(
      permission => 
        permission.entity === 'team_worktime' && 
        permission.entityType === 'table' && 
        (permission.accessLevel === 'both' || permission.accessLevel === 'write')
    );

    if (!hasTeamWorktimeControlPermission || !hasTeamWorktimePermission) {
      return res.status(403).json({ message: 'Keine ausreichenden Berechtigungen für Team Worktime Control' });
    }

    // Benutzer hat die erforderlichen Berechtigungen
    next();
  } catch (error) {
    console.error('Fehler bei der Überprüfung der Team-Manager-Berechtigung:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
}; 
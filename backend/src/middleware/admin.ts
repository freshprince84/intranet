import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

export const adminMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId; // Von der authMiddleware gesetzt
        
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }

        const user = await prisma.user.findUnique({
            where: { id: Number(userId) },
            include: {
                roles: true
            }
        });

        if (!user) {
            return res.status(404).json({ message: 'Benutzer nicht gefunden' });
        }

        // Type-Safety für die Rollen
        type UserWithRoles = typeof user & {
            roles: Role[];
        };
        
        const userWithRoles = user as UserWithRoles;
        const isAdmin = userWithRoles.roles.some((role: Role) => role.name === 'admin');

        if (!isAdmin) {
            return res.status(403).json({ message: 'Keine Administratorrechte' });
        }

        next();
    } catch (error: unknown) {
        logger.error('Fehler in der Admin-Middleware:', error);
        res.status(500).json({ message: 'Interner Server-Fehler' });
    }
}; 
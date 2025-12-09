import { Request, Response } from 'express';
import { 
    validateNotificationSettings, 
    validateUserNotificationSettings 
} from '../validation/notificationValidation';
import { prisma } from '../utils/prisma';
import { notificationSettingsCache } from '../services/notificationSettingsCache';
import { logger } from '../utils/logger';

// System-weite Notification-Einstellungen abrufen
export const getNotificationSettings = async (req: Request, res: Response) => {
    try {
        const settings = await prisma.notificationSettings.findFirst();
        
        // Standardeinstellungen, falls keine existieren
        if (!settings) {
            return res.json({
                taskCreate: true,
                taskUpdate: true,
                taskDelete: true,
                taskStatusChange: true,
                requestCreate: true,
                requestUpdate: true,
                requestDelete: true,
                requestStatusChange: true,
                userCreate: true,
                userUpdate: true,
                userDelete: true,
                roleCreate: true,
                roleUpdate: true,
                roleDelete: true,
                worktimeStart: true,
                worktimeStop: true
            });
        }
        
        res.json(settings);
    } catch (error) {
        logger.error('Fehler beim Abrufen der Notification-Einstellungen:', error);
        res.status(500).json({ message: 'Interner Server-Fehler' });
    }
};

// System-weite Notification-Einstellungen aktualisieren (Admin only)
export const updateNotificationSettings = async (req: Request, res: Response) => {
    try {
        const data = req.body;
        
        // Validierung
        const validationError = validateNotificationSettings(data);
        if (validationError) {
            return res.status(400).json({ message: validationError });
        }
        
        // Prüfen, ob bereits Einstellungen existieren
        const existingSettings = await prisma.notificationSettings.findFirst();
        
        let settings;
        if (existingSettings) {
            // Aktualisieren existierender Einstellungen
            settings = await prisma.notificationSettings.update({
                where: { id: existingSettings.id },
                data
            });
        } else {
            // Erstellen neuer Einstellungen
            settings = await prisma.notificationSettings.create({
                data
            });
        }
        
        // Cache invalidation nach Update
        notificationSettingsCache.invalidateSystemSettings();
        
        res.json(settings);
    } catch (error) {
        logger.error('Fehler beim Aktualisieren der Notification-Einstellungen:', error);
        res.status(500).json({ message: 'Interner Server-Fehler' });
    }
};

// Benutzer-spezifische Notification-Einstellungen abrufen
export const getUserNotificationSettings = async (req: Request, res: Response) => {
    logger.log('[SettingsController] getUserNotificationSettings aufgerufen');
    
    try {
        // Korrekte Extraktion der userId mit mehr Fehlertoleranz
        let userId: number | string | undefined = req.user?.id;
        
        if (!userId && req.userId) {
            userId = req.userId;
            logger.log('[SettingsController] userId aus req.userId extrahiert:', userId);
        }
        
        if (!userId) {
            logger.log('[SettingsController] Kein userId gefunden');
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        
        // userId in number umwandeln, falls es ein String ist
        let numericUserId: number;
        if (typeof userId === 'string') {
            numericUserId = parseInt(userId, 10);
            if (isNaN(numericUserId)) {
                logger.error('[SettingsController] Ungültige userId (keine Zahl):', userId);
                return res.status(400).json({ message: 'Ungültige Benutzer-ID' });
            }
            logger.log('[SettingsController] String-userId in Zahl umgewandelt:', numericUserId);
        } else {
            numericUserId = userId;
        }
        
        logger.log('[SettingsController] Lade Benachrichtigungseinstellungen für Benutzer:', numericUserId);
        
        // Überprüfe, ob der Prisma-Client verfügbar ist
        if (!prisma) {
            logger.error('[SettingsController] Prisma-Client nicht verfügbar');
            return res.status(500).json({ message: 'Interner Datenbankfehler' });
        }
        
        // Benutzereinstellungen abrufen
        const settings = await prisma.userNotificationSettings.findFirst({
            where: { userId: numericUserId }
        });
        
        logger.log('[SettingsController] Gefundene Einstellungen:', settings ? 'Ja' : 'Nein');
        
        // Wenn keine benutzer-spezifischen Einstellungen, dann System-Einstellungen abrufen
        if (!settings) {
            logger.log('[SettingsController] Keine Benutzereinstellungen gefunden, lade System-Einstellungen');
            const systemSettings = await prisma.notificationSettings.findFirst();
            
            logger.log('[SettingsController] System-Einstellungen geladen:', !!systemSettings);
            
            // Default-Einstellungen mit Systemwerten oder Standardwerten
            return res.json({
                userId: numericUserId,
                taskCreate: systemSettings?.taskCreate ?? true,
                taskUpdate: systemSettings?.taskUpdate ?? true,
                taskDelete: systemSettings?.taskDelete ?? true,
                taskStatusChange: systemSettings?.taskStatusChange ?? true,
                requestCreate: systemSettings?.requestCreate ?? true,
                requestUpdate: systemSettings?.requestUpdate ?? true,
                requestDelete: systemSettings?.requestDelete ?? true,
                requestStatusChange: systemSettings?.requestStatusChange ?? true,
                userCreate: systemSettings?.userCreate ?? true,
                userUpdate: systemSettings?.userUpdate ?? true,
                userDelete: systemSettings?.userDelete ?? true,
                roleCreate: systemSettings?.roleCreate ?? true,
                roleUpdate: systemSettings?.roleUpdate ?? true,
                roleDelete: systemSettings?.roleDelete ?? true,
                worktimeStart: systemSettings?.worktimeStart ?? true,
                worktimeStop: systemSettings?.worktimeStop ?? true
            });
        }
        
        logger.log('[SettingsController] Sende Benutzereinstellungen zurück');
        res.json(settings);
    } catch (error) {
        logger.error('[SettingsController] Fehler beim Abrufen der Benutzer-Notification-Einstellungen:', error);
        res.status(500).json({ 
            message: 'Fehler beim Abrufen der Benachrichtigungseinstellungen',
            error: error instanceof Error ? error.message : String(error)
        });
    }
};

// Benutzer-spezifische Notification-Einstellungen aktualisieren
export const updateUserNotificationSettings = async (req: Request, res: Response) => {
    try {
        // Korrekte Extraktion der userId aus dem req.user-Objekt oder fallback auf req.userId
        let userId: number;
        
        if (req.user && req.user.id) {
            userId = req.user.id;
        } else if (req.userId) {
            userId = parseInt(req.userId.toString());
        } else {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        
        logger.log('Aktualisiere Benachrichtigungseinstellungen für Benutzer:', userId);
        
        const data = { ...req.body, userId };
        
        // Validierung
        const validationError = validateUserNotificationSettings(data);
        if (validationError) {
            return res.status(400).json({ message: validationError });
        }
        
        // Prüfen, ob bereits Einstellungen existieren
        const existingSettings = await prisma.userNotificationSettings.findFirst({
            where: { userId }
        });
        
        let settings;
        if (existingSettings) {
            // Aktualisieren existierender Einstellungen
            settings = await prisma.userNotificationSettings.update({
                where: { id: existingSettings.id },
                data
            });
        } else {
            // Erstellen neuer Einstellungen
            settings = await prisma.userNotificationSettings.create({
                data
            });
        }
        
        // Cache invalidation nach Update
        notificationSettingsCache.invalidateUserSettings(userId);
        
        res.json(settings);
    } catch (error) {
        logger.error('Fehler beim Aktualisieren der Benutzer-Notification-Einstellungen:', error);
        res.status(500).json({ message: 'Interner Server-Fehler' });
    }
}; 
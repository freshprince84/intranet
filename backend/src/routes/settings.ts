import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { checkRole } from '../middleware/roleCheck';
import {
    getNotificationSettings,
    updateNotificationSettings,
    getUserNotificationSettings,
    updateUserNotificationSettings
} from '../controllers/settingsController';
import sharp from 'sharp';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Erweitere den Request-Typ
declare module 'express-serve-static-core' {
    interface Request {
        userId?: string;
    }
}

const router = Router();

// Debug-Middleware für alle Settings-Routen
router.use((req, res, next) => {
    console.log('Settings Router aufgerufen:', {
        method: req.method,
        path: req.path,
        originalUrl: req.originalUrl,
        userId: req.userId || 'nicht verfügbar',
        user: req.user || 'nicht verfügbar',
        headers: req.headers,
        body: req.body
    });
    next();
});

// Konfiguriere multer für Datei-Upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'uploads', 'logos');
        console.log('Upload Verzeichnis:', uploadDir);
        
        if (!fs.existsSync(uploadDir)) {
            console.log('Erstelle Upload-Verzeichnis');
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Verwende einen festen Dateinamen basierend auf der Dateierweiterung
        const fileExtension = path.extname(file.originalname).toLowerCase();
        const filename = 'logo' + fileExtension;
        console.log('Generierter Dateiname:', filename);
        
        // Lösche bestehende Logo-Dateien, um stets nur ein Logo zu haben
        const uploadDir = path.join(process.cwd(), 'uploads', 'logos');
        try {
            const files = fs.readdirSync(uploadDir);
            files.forEach(existingFile => {
                if (existingFile.startsWith('logo')) {
                    const filePath = path.join(uploadDir, existingFile);
                    fs.unlinkSync(filePath);
                    console.log('Bestehende Datei gelöscht:', filePath);
                }
            });
        } catch (error) {
            console.error('Fehler beim Löschen bestehender Dateien:', error);
        }
        
        cb(null, filename);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: (req, file, cb) => {
        console.log('Datei-Filter:', file);
        const allowedTypes = ['image/jpeg', 'image/png'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Nur JPEG und PNG Dateien sind erlaubt'));
        }
    }
});

// ÖFFENTLICHE ROUTEN (ohne Authentifizierung)

// GET /logo - Öffentliche Route 
router.get('/logo', (req, res) => {
    try {
        console.log('Aktuelles Arbeitsverzeichnis (CWD):', process.cwd());
        console.log('__dirname:', __dirname);
        
        const uploadDir = path.join(process.cwd(), 'uploads', 'logos');
        console.log('Suche Logo in:', uploadDir);
        
        if (!fs.existsSync(uploadDir)) {
            console.log('Upload Verzeichnis existiert nicht');
            return res.status(404).json({ message: 'Kein Logo gefunden' });
        }

        // Prüfe, ob Verzeichnis lesbar ist
        try {
            fs.accessSync(uploadDir, fs.constants.R_OK);
            console.log('Verzeichnis ist lesbar');
        } catch (error) {
            console.error('Verzeichnis ist nicht lesbar:', error);
            return res.status(500).json({ message: 'Fehler beim Zugriff auf das Logo-Verzeichnis' });
        }

        const files = fs.readdirSync(uploadDir);
        console.log('Gefundene Dateien:', files);
        
        // Suche nach logo.png oder logo.jpg
        const logoFile = files.find(file => 
            file === 'logo.png' || 
            file === 'logo.jpg' || 
            file === 'logo.jpeg'
        );

        console.log('Gefundenes Logo:', logoFile || 'Keines');

        if (!logoFile) {
            console.log('Kein Logo gefunden');
            return res.status(404).json({ message: 'Kein Logo gefunden' });
        }

        const logoPath = path.join(uploadDir, logoFile);
        console.log('Vollständiger Pfad zum Logo:', logoPath);
        
        // Prüfe, ob Datei existiert und lesbar ist
        try {
            fs.accessSync(logoPath, fs.constants.R_OK);
            console.log('Logo-Datei ist lesbar');
        } catch (error) {
            console.error('Logo-Datei ist nicht lesbar:', error);
            return res.status(500).json({ message: 'Fehler beim Zugriff auf die Logo-Datei' });
        }

        // Prüfe Dateigröße
        const stats = fs.statSync(logoPath);
        console.log('Logo-Dateigröße:', stats.size, 'Bytes');
        
        if (stats.size === 0) {
            console.error('Logo-Datei ist leer');
            return res.status(500).json({ message: 'Logo-Datei ist leer' });
        }

        console.log('Sende Logo:', logoPath);
        
        // Der Header muss für Bilder korrekt gesetzt werden
        const mimeTypes = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg'
        };
        const ext = path.extname(logoPath).toLowerCase();
        const contentType = mimeTypes[ext as keyof typeof mimeTypes] || 'application/octet-stream';
        res.setHeader('Content-Type', contentType);
        
        res.sendFile(logoPath);
    } catch (error) {
        console.error('Fehler beim Abrufen des Logos:', error);
        res.status(500).json({ 
            message: 'Interner Server-Fehler beim Abrufen des Logos',
            error: error instanceof Error ? error.message : String(error)
        });
    }
});

// GET /logo/base64 - Öffentliche alternative Logo-Route
router.get('/logo/base64', (req, res) => {
    try {
        console.log('Aktuelles Arbeitsverzeichnis (CWD):', process.cwd());
        console.log('__dirname:', __dirname);
        
        const uploadDir = path.join(process.cwd(), 'uploads', 'logos');
        console.log('Suche Logo in:', uploadDir);
        
        if (!fs.existsSync(uploadDir)) {
            console.log('Upload Verzeichnis existiert nicht');
            return res.status(404).json({ message: 'Kein Logo gefunden' });
        }

        const files = fs.readdirSync(uploadDir);
        console.log('Gefundene Dateien:', files);
        
        // Suche nach logo.png oder logo.jpg
        const logoFile = files.find(file => 
            file === 'logo.png' || 
            file === 'logo.jpg' || 
            file === 'logo.jpeg'
        );

        console.log('Gefundenes Logo:', logoFile || 'Keines');

        if (!logoFile) {
            console.log('Kein Logo gefunden');
            return res.status(404).json({ message: 'Kein Logo gefunden' });
        }

        const logoPath = path.join(uploadDir, logoFile);
        console.log('Vollständiger Pfad zum Logo:', logoPath);
        
        // Datei als Base64 lesen
        const fileData = fs.readFileSync(logoPath);
        const base64Data = fileData.toString('base64');
        
        // MIME-Typ bestimmen
        const ext = path.extname(logoPath).toLowerCase();
        let mimeType = 'application/octet-stream';
        if (ext === '.png') mimeType = 'image/png';
        if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
        
        // Als JSON mit Data-URL zurückgeben
        return res.json({ 
            logo: `data:${mimeType};base64,${base64Data}`,
            mime: mimeType,
            size: fileData.length
        });
    } catch (error) {
        console.error('Fehler beim Abrufen des Logos als Base64:', error);
        res.status(500).json({ 
            message: 'Interner Server-Fehler beim Abrufen des Logos',
            error: error instanceof Error ? error.message : String(error)
        });
    }
});

// GET /logo/mobile - Mobile App Icons
router.get('/logo/mobile', async (req, res) => {
    try {
        const uploadDir = path.join(process.cwd(), 'uploads', 'logos');
        if (!fs.existsSync(uploadDir)) {
            return res.status(404).json({ message: 'Kein Logo gefunden' });
        }

        const files = fs.readdirSync(uploadDir);
        const logoFile = files.find(file => 
            file === 'logo.png' || 
            file === 'logo.jpg' || 
            file === 'logo.jpeg'
        );

        if (!logoFile) {
            return res.status(404).json({ message: 'Kein Logo gefunden' });
        }

        const logoPath = path.join(uploadDir, logoFile);
        const logoBuffer = fs.readFileSync(logoPath);

        // iOS Icon Größen
        const iosSizes = [
            { size: 20, scale: 2 },
            { size: 20, scale: 3 },
            { size: 29, scale: 2 },
            { size: 29, scale: 3 },
            { size: 40, scale: 2 },
            { size: 40, scale: 3 },
            { size: 60, scale: 2 },
            { size: 60, scale: 3 },
            { size: 1024, scale: 1 }
        ];

        // Android Icon Größen
        const androidSizes = [48, 72, 96, 144, 192];

        const iosIcons = await Promise.all(
            iosSizes.map(async ({ size, scale }) => {
                const actualSize = size * scale;
                const icon = await sharp(logoBuffer)
                    .resize(actualSize, actualSize, {
                        fit: 'contain',
                        background: { r: 255, g: 255, b: 255, alpha: 0 }
                    })
                    .png()
                    .toBuffer();
                return {
                    size: `${size}x${size}`,
                    scale: `${scale}x`,
                    data: icon.toString('base64')
                };
            })
        );

        const androidIcons = await Promise.all(
            androidSizes.map(async (size) => {
                const icon = await sharp(logoBuffer)
                    .resize(size, size, {
                        fit: 'contain',
                        background: { r: 255, g: 255, b: 255, alpha: 0 }
                    })
                    .png()
                    .toBuffer();
                return {
                    size: `${size}x${size}`,
                    data: icon.toString('base64')
                };
            })
        );

        res.json({
            ios: iosIcons,
            android: androidIcons
        });
    } catch (error) {
        console.error('Fehler beim Generieren der Mobile Icons:', error);
        res.status(500).json({ 
            message: 'Interner Server-Fehler beim Generieren der Mobile Icons',
            error: error instanceof Error ? error.message : String(error)
        });
    }
});

// AUTHENTIFIZIERUNGS-MIDDLEWARE für alle folgenden Routen
router.use(authenticateToken);

// GESCHÜTZTE ROUTEN (mit Authentifizierung)

// Test-Route (authentifiziert)
router.get('/', (req, res) => {
    res.json({ message: 'Settings Route ist erreichbar' });
});

router.get('/test', (req, res) => {
    res.json({ message: 'Settings Test Route funktioniert' });
});

// POST /logo (nur für authentifizierte Benutzer)
router.post('/logo', authenticateToken, async (req, res) => {
    console.log('Logo Upload Route erreicht');
    console.log('Request Headers:', req.headers);
    
    upload.single('logo')(req, res, async (err) => {
        if (err) {
            console.error('Upload Fehler:', err);
            return res.status(400).json({ 
                message: err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE'
                    ? 'Datei ist zu groß (maximal 5MB erlaubt)'
                    : err.message
            });
        }

        if (!req.file) {
            console.error('Keine Datei im Request gefunden');
            return res.status(400).json({ message: 'Keine Datei hochgeladen' });
        }

        try {
            console.log('Datei erfolgreich hochgeladen:', req.file);
            
            // Lese Logo als Base64
            const fileData = fs.readFileSync(req.file.path);
            const base64Data = fileData.toString('base64');
            
            // MIME-Typ bestimmen
            const ext = path.extname(req.file.path).toLowerCase();
            let mimeType = 'image/png';
            if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
            
            // Erstelle Data-URL
            const base64Logo = `data:${mimeType};base64,${base64Data}`;
            
            // Finde Organisation des Users
            const userId = parseInt(req.userId || '0', 10);
            if (!userId) {
                return res.status(401).json({ message: 'Nicht authentifiziert' });
            }
            
            const userRole = await prisma.userRole.findFirst({
                where: { 
                    userId: userId,
                    lastUsed: true 
                },
                include: {
                    role: {
                        include: {
                            organization: true
                        }
                    }
                }
            });
            
            if (!userRole?.role.organization) {
                return res.status(404).json({ message: 'Keine Organisation gefunden' });
            }
            
            // Speichere Logo in Datenbank
            await prisma.organization.update({
                where: { id: userRole.role.organization.id },
                data: { logo: base64Logo }
            });
            
            console.log('Logo erfolgreich in Datenbank gespeichert für Organisation:', userRole.role.organization.id);
            
            res.status(200).json({ 
                message: 'Logo erfolgreich hochgeladen',
                filename: req.file.filename
            });
        } catch (error) {
            console.error('Fehler beim Speichern des Logos in Datenbank:', error);
            res.status(500).json({ 
                message: 'Fehler beim Speichern des Logos',
                error: error instanceof Error ? error.message : 'Unbekannter Fehler'
            });
        }
    });
});

// System-weite Benachrichtigungseinstellungen abrufen
router.get('/notifications', getNotificationSettings);

// System-weite Benachrichtigungseinstellungen aktualisieren (nur Admin)
router.put('/notifications', checkRole(['admin']), updateNotificationSettings);

// Benutzer-spezifische Benachrichtigungseinstellungen abrufen
router.get('/notifications/user', getUserNotificationSettings);

// Benutzer-spezifische Benachrichtigungseinstellungen aktualisieren
router.put('/notifications/user', updateUserNotificationSettings);

export default router; 
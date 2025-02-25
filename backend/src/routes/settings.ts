import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';

// Erweitere den Request-Typ
declare module 'express-serve-static-core' {
    interface Request {
        userId?: string;
    }
}

const router = Router();

// Debug-Middleware für alle Settings-Routen
router.use((req, res, next) => {
    console.log('Settings Route Handler:', {
        method: req.method,
        path: req.path,
        headers: req.headers,
        body: req.body
    });
    next();
});

// Test-Route
router.get('/', (req, res) => {
    res.json({ message: 'Settings Route ist erreichbar' });
});

router.get('/test', (req, res) => {
    res.json({ message: 'Settings Test Route funktioniert' });
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
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = 'logo-' + uniqueSuffix + path.extname(file.originalname);
        console.log('Generierter Dateiname:', filename);
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

// POST /logo
router.post('/logo', (req, res) => {
    console.log('Logo Upload Route erreicht');
    console.log('Request Headers:', req.headers);
    
    upload.single('logo')(req, res, (err) => {
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

        console.log('Datei erfolgreich hochgeladen:', req.file);
        res.status(200).json({ 
            message: 'Logo erfolgreich hochgeladen',
            filename: req.file.filename
        });
    });
});

// GET /logo
router.get('/logo', (req, res) => {
    try {
        const uploadDir = path.join(process.cwd(), 'uploads', 'logos');
        console.log('Suche Logo in:', uploadDir);
        
        if (!fs.existsSync(uploadDir)) {
            console.log('Upload Verzeichnis existiert nicht');
            return res.status(404).json({ message: 'Kein Logo gefunden' });
        }

        const files = fs.readdirSync(uploadDir);
        console.log('Gefundene Dateien:', files);
        
        const latestLogo = files
            .filter(file => file.startsWith('logo-'))
            .sort()
            .reverse()[0];

        if (!latestLogo) {
            console.log('Kein Logo gefunden');
            return res.status(404).json({ message: 'Kein Logo gefunden' });
        }

        const logoPath = path.join(uploadDir, latestLogo);
        console.log('Sende Logo:', logoPath);
        res.sendFile(logoPath);
    } catch (error) {
        console.error('Fehler beim Abrufen des Logos:', error);
        res.status(500).json({ 
            message: 'Interner Server-Fehler beim Abrufen des Logos' 
        });
    }
});

export default router; 
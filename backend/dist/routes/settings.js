"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const router = (0, express_1.Router)();
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
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path_1.default.join(process.cwd(), 'uploads', 'logos');
        console.log('Upload Verzeichnis:', uploadDir);
        if (!fs_1.default.existsSync(uploadDir)) {
            console.log('Erstelle Upload-Verzeichnis');
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = 'logo-' + uniqueSuffix + path_1.default.extname(file.originalname);
        console.log('Generierter Dateiname:', filename);
        cb(null, filename);
    }
});
const upload = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: (req, file, cb) => {
        console.log('Datei-Filter:', file);
        const allowedTypes = ['image/jpeg', 'image/png'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
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
                message: err instanceof multer_1.default.MulterError && err.code === 'LIMIT_FILE_SIZE'
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
        const uploadDir = path_1.default.join(process.cwd(), 'uploads', 'logos');
        console.log('Suche Logo in:', uploadDir);
        if (!fs_1.default.existsSync(uploadDir)) {
            console.log('Upload Verzeichnis existiert nicht');
            return res.status(404).json({ message: 'Kein Logo gefunden' });
        }
        const files = fs_1.default.readdirSync(uploadDir);
        console.log('Gefundene Dateien:', files);
        const latestLogo = files
            .filter(file => file.startsWith('logo-'))
            .sort()
            .reverse()[0];
        if (!latestLogo) {
            console.log('Kein Logo gefunden');
            return res.status(404).json({ message: 'Kein Logo gefunden' });
        }
        const logoPath = path_1.default.join(uploadDir, latestLogo);
        console.log('Sende Logo:', logoPath);
        res.sendFile(logoPath);
    }
    catch (error) {
        console.error('Fehler beim Abrufen des Logos:', error);
        res.status(500).json({
            message: 'Interner Server-Fehler beim Abrufen des Logos'
        });
    }
});
exports.default = router;
//# sourceMappingURL=settings.js.map
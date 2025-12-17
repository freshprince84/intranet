"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const auth_1 = require("../middleware/auth");
const roleCheck_1 = require("../middleware/roleCheck");
const settingsController_1 = require("../controllers/settingsController");
const sharp_1 = __importDefault(require("sharp"));
const prisma_1 = require("../utils/prisma");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
// Debug-Middleware für alle Settings-Routen
router.use((req, res, next) => {
    logger_1.logger.log('Settings Router aufgerufen:', {
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
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path_1.default.join(process.cwd(), 'uploads', 'logos');
        logger_1.logger.log('Upload Verzeichnis:', uploadDir);
        if (!fs_1.default.existsSync(uploadDir)) {
            logger_1.logger.log('Erstelle Upload-Verzeichnis');
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Verwende einen festen Dateinamen basierend auf der Dateierweiterung
        const fileExtension = path_1.default.extname(file.originalname).toLowerCase();
        const filename = 'logo' + fileExtension;
        logger_1.logger.log('Generierter Dateiname:', filename);
        // Lösche bestehende Logo-Dateien, um stets nur ein Logo zu haben
        const uploadDir = path_1.default.join(process.cwd(), 'uploads', 'logos');
        try {
            const files = fs_1.default.readdirSync(uploadDir);
            files.forEach(existingFile => {
                if (existingFile.startsWith('logo')) {
                    const filePath = path_1.default.join(uploadDir, existingFile);
                    fs_1.default.unlinkSync(filePath);
                    logger_1.logger.log('Bestehende Datei gelöscht:', filePath);
                }
            });
        }
        catch (error) {
            logger_1.logger.error('Fehler beim Löschen bestehender Dateien:', error);
        }
        cb(null, filename);
    }
});
const upload = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: (req, file, cb) => {
        logger_1.logger.log('Datei-Filter:', file);
        const allowedTypes = ['image/jpeg', 'image/png'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Nur JPEG und PNG Dateien sind erlaubt'));
        }
    }
});
// ÖFFENTLICHE ROUTEN (ohne Authentifizierung)
// GET /logo - Öffentliche Route 
router.get('/logo', (req, res) => {
    try {
        logger_1.logger.log('Aktuelles Arbeitsverzeichnis (CWD):', process.cwd());
        logger_1.logger.log('__dirname:', __dirname);
        const uploadDir = path_1.default.join(process.cwd(), 'uploads', 'logos');
        logger_1.logger.log('Suche Logo in:', uploadDir);
        if (!fs_1.default.existsSync(uploadDir)) {
            logger_1.logger.log('Upload Verzeichnis existiert nicht');
            return res.status(404).json({ message: 'Kein Logo gefunden' });
        }
        // Prüfe, ob Verzeichnis lesbar ist
        try {
            fs_1.default.accessSync(uploadDir, fs_1.default.constants.R_OK);
            logger_1.logger.log('Verzeichnis ist lesbar');
        }
        catch (error) {
            logger_1.logger.error('Verzeichnis ist nicht lesbar:', error);
            return res.status(500).json({ message: 'Fehler beim Zugriff auf das Logo-Verzeichnis' });
        }
        const files = fs_1.default.readdirSync(uploadDir);
        logger_1.logger.log('Gefundene Dateien:', files);
        // Suche nach logo.png oder logo.jpg
        const logoFile = files.find(file => file === 'logo.png' ||
            file === 'logo.jpg' ||
            file === 'logo.jpeg');
        logger_1.logger.log('Gefundenes Logo:', logoFile || 'Keines');
        if (!logoFile) {
            logger_1.logger.log('Kein Logo gefunden');
            return res.status(404).json({ message: 'Kein Logo gefunden' });
        }
        const logoPath = path_1.default.join(uploadDir, logoFile);
        logger_1.logger.log('Vollständiger Pfad zum Logo:', logoPath);
        // Prüfe, ob Datei existiert und lesbar ist
        try {
            fs_1.default.accessSync(logoPath, fs_1.default.constants.R_OK);
            logger_1.logger.log('Logo-Datei ist lesbar');
        }
        catch (error) {
            logger_1.logger.error('Logo-Datei ist nicht lesbar:', error);
            return res.status(500).json({ message: 'Fehler beim Zugriff auf die Logo-Datei' });
        }
        // Prüfe Dateigröße
        const stats = fs_1.default.statSync(logoPath);
        logger_1.logger.log('Logo-Dateigröße:', stats.size, 'Bytes');
        if (stats.size === 0) {
            logger_1.logger.error('Logo-Datei ist leer');
            return res.status(500).json({ message: 'Logo-Datei ist leer' });
        }
        logger_1.logger.log('Sende Logo:', logoPath);
        // Der Header muss für Bilder korrekt gesetzt werden
        const mimeTypes = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg'
        };
        const ext = path_1.default.extname(logoPath).toLowerCase();
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        res.setHeader('Content-Type', contentType);
        res.sendFile(logoPath);
    }
    catch (error) {
        logger_1.logger.error('Fehler beim Abrufen des Logos:', error);
        res.status(500).json({
            message: 'Interner Server-Fehler beim Abrufen des Logos',
            error: error instanceof Error ? error.message : String(error)
        });
    }
});
// GET /logo/base64 - Öffentliche alternative Logo-Route
router.get('/logo/base64', (req, res) => {
    try {
        logger_1.logger.log('Aktuelles Arbeitsverzeichnis (CWD):', process.cwd());
        logger_1.logger.log('__dirname:', __dirname);
        const uploadDir = path_1.default.join(process.cwd(), 'uploads', 'logos');
        logger_1.logger.log('Suche Logo in:', uploadDir);
        if (!fs_1.default.existsSync(uploadDir)) {
            logger_1.logger.log('Upload Verzeichnis existiert nicht');
            return res.status(404).json({ message: 'Kein Logo gefunden' });
        }
        const files = fs_1.default.readdirSync(uploadDir);
        logger_1.logger.log('Gefundene Dateien:', files);
        // Suche nach logo.png oder logo.jpg
        const logoFile = files.find(file => file === 'logo.png' ||
            file === 'logo.jpg' ||
            file === 'logo.jpeg');
        logger_1.logger.log('Gefundenes Logo:', logoFile || 'Keines');
        if (!logoFile) {
            logger_1.logger.log('Kein Logo gefunden');
            return res.status(404).json({ message: 'Kein Logo gefunden' });
        }
        const logoPath = path_1.default.join(uploadDir, logoFile);
        logger_1.logger.log('Vollständiger Pfad zum Logo:', logoPath);
        // Datei als Base64 lesen
        const fileData = fs_1.default.readFileSync(logoPath);
        const base64Data = fileData.toString('base64');
        // MIME-Typ bestimmen
        const ext = path_1.default.extname(logoPath).toLowerCase();
        let mimeType = 'application/octet-stream';
        if (ext === '.png')
            mimeType = 'image/png';
        if (ext === '.jpg' || ext === '.jpeg')
            mimeType = 'image/jpeg';
        // Als JSON mit Data-URL zurückgeben
        return res.json({
            logo: `data:${mimeType};base64,${base64Data}`,
            mime: mimeType,
            size: fileData.length
        });
    }
    catch (error) {
        logger_1.logger.error('Fehler beim Abrufen des Logos als Base64:', error);
        res.status(500).json({
            message: 'Interner Server-Fehler beim Abrufen des Logos',
            error: error instanceof Error ? error.message : String(error)
        });
    }
});
// GET /logo/mobile - Mobile App Icons
router.get('/logo/mobile', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const uploadDir = path_1.default.join(process.cwd(), 'uploads', 'logos');
        if (!fs_1.default.existsSync(uploadDir)) {
            return res.status(404).json({ message: 'Kein Logo gefunden' });
        }
        const files = fs_1.default.readdirSync(uploadDir);
        const logoFile = files.find(file => file === 'logo.png' ||
            file === 'logo.jpg' ||
            file === 'logo.jpeg');
        if (!logoFile) {
            return res.status(404).json({ message: 'Kein Logo gefunden' });
        }
        const logoPath = path_1.default.join(uploadDir, logoFile);
        const logoBuffer = fs_1.default.readFileSync(logoPath);
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
        const iosIcons = yield Promise.all(iosSizes.map((_a) => __awaiter(void 0, [_a], void 0, function* ({ size, scale }) {
            const actualSize = size * scale;
            const icon = yield (0, sharp_1.default)(logoBuffer)
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
        })));
        const androidIcons = yield Promise.all(androidSizes.map((size) => __awaiter(void 0, void 0, void 0, function* () {
            const icon = yield (0, sharp_1.default)(logoBuffer)
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
        })));
        res.json({
            ios: iosIcons,
            android: androidIcons
        });
    }
    catch (error) {
        logger_1.logger.error('Fehler beim Generieren der Mobile Icons:', error);
        res.status(500).json({
            message: 'Interner Server-Fehler beim Generieren der Mobile Icons',
            error: error instanceof Error ? error.message : String(error)
        });
    }
}));
// AUTHENTIFIZIERUNGS-MIDDLEWARE für alle folgenden Routen
router.use(auth_1.authenticateToken);
// GESCHÜTZTE ROUTEN (mit Authentifizierung)
// Test-Route (authentifiziert)
router.get('/', (req, res) => {
    res.json({ message: 'Settings Route ist erreichbar' });
});
router.get('/test', (req, res) => {
    res.json({ message: 'Settings Test Route funktioniert' });
});
// POST /logo (nur für authentifizierte Benutzer)
router.post('/logo', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    logger_1.logger.log('Logo Upload Route erreicht');
    logger_1.logger.log('Request Headers:', req.headers);
    upload.single('logo')(req, res, (err) => __awaiter(void 0, void 0, void 0, function* () {
        if (err) {
            logger_1.logger.error('Upload Fehler:', err);
            return res.status(400).json({
                message: err instanceof multer_1.default.MulterError && err.code === 'LIMIT_FILE_SIZE'
                    ? 'Datei ist zu groß (maximal 5MB erlaubt)'
                    : err.message
            });
        }
        if (!req.file) {
            logger_1.logger.error('Keine Datei im Request gefunden');
            return res.status(400).json({ message: 'Keine Datei hochgeladen' });
        }
        try {
            logger_1.logger.log('Datei erfolgreich hochgeladen:', req.file);
            // Lese Logo als Base64
            const fileData = fs_1.default.readFileSync(req.file.path);
            const base64Data = fileData.toString('base64');
            // MIME-Typ bestimmen
            const ext = path_1.default.extname(req.file.path).toLowerCase();
            let mimeType = 'image/png';
            if (ext === '.jpg' || ext === '.jpeg')
                mimeType = 'image/jpeg';
            // Erstelle Data-URL
            const base64Logo = `data:${mimeType};base64,${base64Data}`;
            // Finde Organisation des Users
            const userId = parseInt(req.userId || '0', 10);
            if (!userId) {
                return res.status(401).json({ message: 'Nicht authentifiziert' });
            }
            const userRole = yield prisma_1.prisma.userRole.findFirst({
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
            if (!(userRole === null || userRole === void 0 ? void 0 : userRole.role.organization)) {
                return res.status(404).json({ message: 'Keine Organisation gefunden' });
            }
            // Speichere Logo in Datenbank
            yield prisma_1.prisma.organization.update({
                where: { id: userRole.role.organization.id },
                data: { logo: base64Logo }
            });
            logger_1.logger.log('Logo erfolgreich in Datenbank gespeichert für Organisation:', userRole.role.organization.id);
            res.status(200).json({
                message: 'Logo erfolgreich hochgeladen',
                filename: req.file.filename
            });
        }
        catch (error) {
            logger_1.logger.error('Fehler beim Speichern des Logos in Datenbank:', error);
            res.status(500).json({
                message: 'Fehler beim Speichern des Logos',
                error: error instanceof Error ? error.message : 'Unbekannter Fehler'
            });
        }
    }));
}));
// System-weite Benachrichtigungseinstellungen abrufen
router.get('/notifications', settingsController_1.getNotificationSettings);
// System-weite Benachrichtigungseinstellungen aktualisieren (nur Admin)
router.put('/notifications', (0, roleCheck_1.checkRole)(['admin']), settingsController_1.updateNotificationSettings);
// Benutzer-spezifische Benachrichtigungseinstellungen abrufen
router.get('/notifications/user', settingsController_1.getUserNotificationSettings);
// Benutzer-spezifische Benachrichtigungseinstellungen aktualisieren
router.put('/notifications/user', settingsController_1.updateUserNotificationSettings);
// POST /branding/extract-and-generate-template - Branding-Extraktion + E-Mail-Template-Generierung
router.post('/branding/extract-and-generate-template', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.userId || '0', 10);
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        // Lade Organisation des Users
        const userRole = yield prisma_1.prisma.userRole.findFirst({
            where: {
                userId: userId,
                lastUsed: true
            },
            include: {
                role: {
                    include: {
                        organization: true
                    }
                },
                user: {
                    select: { email: true }
                }
            }
        });
        if (!(userRole === null || userRole === void 0 ? void 0 : userRole.role.organization)) {
            return res.status(404).json({ message: 'Keine Organisation gefunden' });
        }
        const organization = userRole.role.organization;
        const userEmail = userRole.user.email;
        if (!organization.logo || organization.logo.trim() === '') {
            return res.status(400).json({ message: 'Kein Logo vorhanden. Bitte laden Sie zuerst ein Logo hoch.' });
        }
        // Schritt 1: Branding-Extraktion
        logger_1.logger.log('[Settings] Starte Branding-Extraktion für Organisation:', organization.id);
        const { OrganizationBrandingService } = yield Promise.resolve().then(() => __importStar(require('../services/organizationBrandingService')));
        const branding = yield OrganizationBrandingService.extractBrandingFromLogo(organization.logo);
        // Lade aktuelle Settings
        const currentSettings = (organization.settings && typeof organization.settings === 'object')
            ? organization.settings
            : {};
        // Speichere Branding in Settings
        yield prisma_1.prisma.organization.update({
            where: { id: organization.id },
            data: {
                settings: Object.assign(Object.assign({}, currentSettings), { branding: branding })
            }
        });
        logger_1.logger.log('[Settings] Branding erfolgreich extrahiert und gespeichert:', {
            hasPrimaryColor: !!branding.colors.primary,
            hasSecondaryColor: !!branding.colors.secondary,
            hasAccentColor: !!branding.colors.accent
        });
        // Schritt 2: E-Mail-Template-Generierung (Test)
        logger_1.logger.log('[Settings] Generiere Test-E-Mail-Template');
        const { generateEmailTemplate } = yield Promise.resolve().then(() => __importStar(require('../services/emailService')));
        const { sendEmail } = yield Promise.resolve().then(() => __importStar(require('../services/emailService')));
        const testContent = `
      <p>Hallo,</p>
      <p>Dies ist eine Test-E-Mail zur Überprüfung Ihrer Corporate Identity.</p>
      <p>Die folgenden Informationen wurden aus Ihrem Logo extrahiert:</p>
      <ul>
        ${branding.colors.primary ? `<li><strong>Hauptfarbe:</strong> <span style="color: ${branding.colors.primary};">${branding.colors.primary}</span></li>` : ''}
        ${branding.colors.secondary ? `<li><strong>Sekundärfarbe:</strong> <span style="color: ${branding.colors.secondary};">${branding.colors.secondary}</span></li>` : ''}
        ${branding.colors.accent ? `<li><strong>Akzentfarbe:</strong> <span style="color: ${branding.colors.accent};">${branding.colors.accent}</span></li>` : ''}
      </ul>
      <p>Diese Farben werden nun in allen E-Mails Ihrer Organisation verwendet.</p>
      <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
    `;
        const testHtml = generateEmailTemplate({
            logo: organization.logo,
            branding: branding,
            headerTitle: organization.displayName || organization.name,
            content: testContent,
            language: 'de'
        });
        // Sende Test-E-Mail
        const emailSent = yield sendEmail(userEmail, 'Test: Corporate Identity für E-Mails', testHtml, 'Dies ist eine Test-E-Mail zur Überprüfung Ihrer Corporate Identity.', organization.id);
        if (!emailSent) {
            logger_1.logger.warn('[Settings] Test-E-Mail konnte nicht versendet werden');
        }
        res.status(200).json({
            message: 'Branding erfolgreich extrahiert und Test-E-Mail versendet',
            branding: {
                hasPrimaryColor: !!branding.colors.primary,
                hasSecondaryColor: !!branding.colors.secondary,
                hasAccentColor: !!branding.colors.accent,
                primaryColor: branding.colors.primary || null
            },
            testEmailSent: emailSent
        });
    }
    catch (error) {
        logger_1.logger.error('[Settings] Fehler bei Branding-Extraktion und Template-Generierung:', error);
        res.status(500).json({
            message: 'Fehler bei Branding-Extraktion',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
}));
exports.default = router;
//# sourceMappingURL=settings.js.map
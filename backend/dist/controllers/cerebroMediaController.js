"use strict";
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
exports.updateMedia = exports.deleteMedia = exports.getMediaById = exports.getMediaByArticle = exports.uploadMedia = exports.upload = void 0;
const client_1 = require("@prisma/client");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const prisma = new client_1.PrismaClient();
// Konfiguration für Multer (Datei-Upload)
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path_1.default.join(__dirname, '../../uploads/cerebro');
        // Stelle sicher, dass das Verzeichnis existiert
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generiere einen eindeutigen Dateinamen
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});
// Dateifilter für erlaubte MIME-Typen
const fileFilter = (req, file, cb) => {
    // Erlaubte MIME-Typen
    const allowedMimeTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf',
        'video/mp4', 'video/webm'
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error('Nicht unterstützter Dateityp. Erlaubt sind Bilder (JPEG, PNG, GIF, WEBP), PDFs und Videos (MP4, WEBM).'));
    }
};
// Multer-Konfiguration exportieren
exports.upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB Limit
    }
});
/**
 * Medien hochladen
 */
const uploadMedia = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Keine Datei hochgeladen' });
        }
        const { carticleId } = req.body;
        const userId = parseInt(req.userId, 10);
        if (!carticleId) {
            // Lösche die Datei, wenn kein Artikel angegeben ist
            fs_1.default.unlinkSync(req.file.path);
            return res.status(400).json({ message: 'Artikel-ID ist erforderlich' });
        }
        // Prüfen, ob der Artikel existiert
        const article = yield prisma.$queryRaw `
            SELECT * FROM "CerebroCarticle" WHERE id = ${parseInt(carticleId, 10)}
        `;
        if (!article || (Array.isArray(article) && article.length === 0)) {
            // Lösche die Datei, wenn der Artikel nicht existiert
            fs_1.default.unlinkSync(req.file.path);
            return res.status(404).json({ message: 'Artikel nicht gefunden' });
        }
        // Speichere die Mediendaten in der Datenbank
        const media = yield prisma.$queryRaw `
            INSERT INTO "CerebroMedia" (
                path, 
                filename, 
                mimetype, 
                size, 
                "carticleId", 
                "createdById", 
                "createdAt", 
                "updatedAt"
            )
            VALUES (
                ${req.file.path.replace(/\\/g, '/')}, 
                ${req.file.originalname}, 
                ${req.file.mimetype}, 
                ${req.file.size}, 
                ${parseInt(carticleId, 10)}, 
                ${userId}, 
                NOW(), 
                NOW()
            )
            RETURNING *
        `;
        res.status(201).json(media[0]);
    }
    catch (error) {
        console.error('Fehler beim Hochladen der Mediendatei:', error);
        // Lösche die Datei bei einem Fehler
        if (req.file) {
            fs_1.default.unlinkSync(req.file.path);
        }
        res.status(500).json({ message: 'Fehler beim Hochladen der Mediendatei' });
    }
});
exports.uploadMedia = uploadMedia;
/**
 * Medien für einen Artikel abrufen
 */
const getMediaByArticle = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { carticleId } = req.params;
        const articleId = parseInt(carticleId, 10);
        if (isNaN(articleId)) {
            return res.status(400).json({ message: 'Ungültige Artikel-ID' });
        }
        // Prüfen, ob der Artikel existiert
        const article = yield prisma.$queryRaw `
            SELECT * FROM "CerebroCarticle" WHERE id = ${articleId}
        `;
        if (!article || (Array.isArray(article) && article.length === 0)) {
            return res.status(404).json({ message: 'Artikel nicht gefunden' });
        }
        // Medien für den Artikel abrufen
        const media = yield prisma.$queryRaw `
            SELECT m.*, u.username as creatorName
            FROM "CerebroMedia" m
            JOIN "User" u ON m."createdById" = u.id
            WHERE m."carticleId" = ${articleId}
            ORDER BY m."createdAt" DESC
        `;
        res.status(200).json(media);
    }
    catch (error) {
        console.error('Fehler beim Abrufen der Mediendateien:', error);
        res.status(500).json({ message: 'Fehler beim Abrufen der Mediendateien' });
    }
});
exports.getMediaByArticle = getMediaByArticle;
/**
 * Einzelne Mediendatei abrufen
 */
const getMediaById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const mediaId = parseInt(id, 10);
        if (isNaN(mediaId)) {
            return res.status(400).json({ message: 'Ungültige Medien-ID' });
        }
        // Mediendatei abrufen
        const media = yield prisma.$queryRaw `
            SELECT m.*, u.username as creatorName, ca.title as articleTitle
            FROM "CerebroMedia" m
            JOIN "User" u ON m."createdById" = u.id
            JOIN "CerebroCarticle" ca ON m."carticleId" = ca.id
            WHERE m.id = ${mediaId}
        `;
        if (!media || (Array.isArray(media) && media.length === 0)) {
            return res.status(404).json({ message: 'Mediendatei nicht gefunden' });
        }
        res.status(200).json(media[0]);
    }
    catch (error) {
        console.error('Fehler beim Abrufen der Mediendatei:', error);
        res.status(500).json({ message: 'Fehler beim Abrufen der Mediendatei' });
    }
});
exports.getMediaById = getMediaById;
/**
 * Mediendatei löschen
 */
const deleteMedia = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const mediaId = parseInt(id, 10);
        if (isNaN(mediaId)) {
            return res.status(400).json({ message: 'Ungültige Medien-ID' });
        }
        // Mediendatei abrufen
        const media = yield prisma.$queryRaw `
            SELECT * FROM "CerebroMedia" WHERE id = ${mediaId}
        `;
        if (!media || (Array.isArray(media) && media.length === 0)) {
            return res.status(404).json({ message: 'Mediendatei nicht gefunden' });
        }
        // Datei vom Dateisystem löschen
        const filePath = media[0].path;
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
        }
        // Mediendatei aus der Datenbank löschen
        yield prisma.$queryRaw `
            DELETE FROM "CerebroMedia" WHERE id = ${mediaId}
        `;
        res.status(200).json({ message: 'Mediendatei erfolgreich gelöscht' });
    }
    catch (error) {
        console.error('Fehler beim Löschen der Mediendatei:', error);
        res.status(500).json({ message: 'Fehler beim Löschen der Mediendatei' });
    }
});
exports.deleteMedia = deleteMedia;
/**
 * Mediendatei aktualisieren (nur Dateiname)
 */
const updateMedia = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { filename } = req.body;
        const mediaId = parseInt(id, 10);
        if (isNaN(mediaId)) {
            return res.status(400).json({ message: 'Ungültige Medien-ID' });
        }
        if (!filename) {
            return res.status(400).json({ message: 'Dateiname ist erforderlich' });
        }
        // Prüfen, ob die Mediendatei existiert
        const media = yield prisma.$queryRaw `
            SELECT * FROM "CerebroMedia" WHERE id = ${mediaId}
        `;
        if (!media || (Array.isArray(media) && media.length === 0)) {
            return res.status(404).json({ message: 'Mediendatei nicht gefunden' });
        }
        // Mediendatei aktualisieren
        const updatedMedia = yield prisma.$queryRaw `
            UPDATE "CerebroMedia"
            SET filename = ${filename}, "updatedAt" = NOW()
            WHERE id = ${mediaId}
            RETURNING *
        `;
        res.status(200).json(updatedMedia[0]);
    }
    catch (error) {
        console.error('Fehler beim Aktualisieren der Mediendatei:', error);
        res.status(500).json({ message: 'Fehler beim Aktualisieren der Mediendatei' });
    }
});
exports.updateMedia = updateMedia;
//# sourceMappingURL=cerebroMediaController.js.map
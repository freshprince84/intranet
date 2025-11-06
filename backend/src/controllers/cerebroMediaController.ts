import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

// Konfiguration für Multer (Datei-Upload)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads/cerebro');
        // Stelle sicher, dass das Verzeichnis existiert
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generiere einen eindeutigen Dateinamen
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});

// Dateifilter für erlaubte MIME-Typen
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Erlaubte MIME-Typen
    const allowedMimeTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf',
        'video/mp4', 'video/webm'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Nicht unterstützter Dateityp. Erlaubt sind Bilder (JPEG, PNG, GIF, WEBP), PDFs und Videos (MP4, WEBM).'));
    }
};

// Multer-Konfiguration exportieren
export const upload = multer({ 
    storage, 
    fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB Limit
    }
});

/**
 * Medien hochladen
 */
export const uploadMedia = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Keine Datei hochgeladen' });
        }
        
        const { carticleId, carticleSlug } = req.body;
        const userId = parseInt(req.userId, 10);
        
        let articleId: number | null = null;
        
        // Unterstütze sowohl carticleId als auch carticleSlug
        if (carticleId) {
            articleId = parseInt(carticleId, 10);
        } else if (carticleSlug) {
            // Artikel nach Slug suchen
            const article = await prisma.cerebroCarticle.findUnique({
                where: { slug: carticleSlug },
                select: { id: true }
            });
            
            if (!article) {
                fs.unlinkSync(req.file.path);
                return res.status(404).json({ message: 'Artikel nicht gefunden' });
            }
            
            articleId = article.id;
        } else {
            // Lösche die Datei, wenn kein Artikel angegeben ist
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ message: 'Artikel-ID oder Artikel-Slug ist erforderlich' });
        }
        
        // Prüfen, ob der Artikel existiert
        const article = await prisma.$queryRaw`
            SELECT * FROM "CerebroCarticle" WHERE id = ${articleId}
        `;
        
        if (!article || (Array.isArray(article) && article.length === 0)) {
            // Lösche die Datei, wenn der Artikel nicht existiert
            fs.unlinkSync(req.file.path);
            return res.status(404).json({ message: 'Artikel nicht gefunden' });
        }
        
        // Speichere die Mediendaten in der Datenbank
        const media = await prisma.$queryRaw`
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
                ${articleId}, 
                ${userId}, 
                NOW(), 
                NOW()
            )
            RETURNING *
        `;
        
        res.status(201).json(media[0]);
    } catch (error) {
        console.error('Fehler beim Hochladen der Mediendatei:', error);
        
        // Lösche die Datei bei einem Fehler
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({ message: 'Fehler beim Hochladen der Mediendatei' });
    }
};

/**
 * Medien für einen Artikel abrufen
 */
export const getMediaByArticle = async (req: Request, res: Response) => {
    try {
        const { carticleId } = req.params;
        const articleId = parseInt(carticleId, 10);
        
        if (isNaN(articleId)) {
            return res.status(400).json({ message: 'Ungültige Artikel-ID' });
        }
        
        // Prüfen, ob der Artikel existiert
        const article = await prisma.$queryRaw`
            SELECT * FROM "CerebroCarticle" WHERE id = ${articleId}
        `;
        
        if (!article || (Array.isArray(article) && article.length === 0)) {
            return res.status(404).json({ message: 'Artikel nicht gefunden' });
        }
        
        // Medien für den Artikel abrufen
        const media = await prisma.$queryRaw`
            SELECT m.*, u.username as creatorName
            FROM "CerebroMedia" m
            JOIN "User" u ON m."createdById" = u.id
            WHERE m."carticleId" = ${articleId}
            ORDER BY m."createdAt" DESC
        `;
        
        res.status(200).json(media);
    } catch (error) {
        console.error('Fehler beim Abrufen der Mediendateien:', error);
        res.status(500).json({ message: 'Fehler beim Abrufen der Mediendateien' });
    }
};

/**
 * Einzelne Mediendatei abrufen
 */
export const getMediaById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const mediaId = parseInt(id, 10);
        
        if (isNaN(mediaId)) {
            return res.status(400).json({ message: 'Ungültige Medien-ID' });
        }
        
        // Mediendatei abrufen
        const media = await prisma.$queryRaw`
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
    } catch (error) {
        console.error('Fehler beim Abrufen der Mediendatei:', error);
        res.status(500).json({ message: 'Fehler beim Abrufen der Mediendatei' });
    }
};

/**
 * Mediendatei löschen
 */
export const deleteMedia = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const mediaId = parseInt(id, 10);
        
        if (isNaN(mediaId)) {
            return res.status(400).json({ message: 'Ungültige Medien-ID' });
        }
        
        // Mediendatei abrufen
        const media = await prisma.$queryRaw`
            SELECT * FROM "CerebroMedia" WHERE id = ${mediaId}
        `;
        
        if (!media || (Array.isArray(media) && media.length === 0)) {
            return res.status(404).json({ message: 'Mediendatei nicht gefunden' });
        }
        
        // Datei vom Dateisystem löschen
        const filePath = media[0].path;
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        
        // Mediendatei aus der Datenbank löschen
        await prisma.$queryRaw`
            DELETE FROM "CerebroMedia" WHERE id = ${mediaId}
        `;
        
        res.status(200).json({ message: 'Mediendatei erfolgreich gelöscht' });
    } catch (error) {
        console.error('Fehler beim Löschen der Mediendatei:', error);
        res.status(500).json({ message: 'Fehler beim Löschen der Mediendatei' });
    }
};

/**
 * Mediendatei aktualisieren (nur Dateiname)
 */
export const updateMedia = async (req: Request, res: Response) => {
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
        const media = await prisma.$queryRaw`
            SELECT * FROM "CerebroMedia" WHERE id = ${mediaId}
        `;
        
        if (!media || (Array.isArray(media) && media.length === 0)) {
            return res.status(404).json({ message: 'Mediendatei nicht gefunden' });
        }
        
        // Mediendatei aktualisieren
        const updatedMedia = await prisma.$queryRaw`
            UPDATE "CerebroMedia"
            SET filename = ${filename}, "updatedAt" = NOW()
            WHERE id = ${mediaId}
            RETURNING *
        `;
        
        res.status(200).json(updatedMedia[0]);
    } catch (error) {
        console.error('Fehler beim Aktualisieren der Mediendatei:', error);
        res.status(500).json({ message: 'Fehler beim Aktualisieren der Mediendatei' });
    }
}; 
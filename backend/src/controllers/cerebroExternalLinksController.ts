import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import * as cheerio from 'cheerio';

const prisma = new PrismaClient();

/**
 * Hilfsfunktion zum Extrahieren von Metadaten aus einer URL
 */
const extractMetadata = async (url: string) => {
    try {
        // Standardwerte
        let type = 'link';
        let title = '';
        let thumbnail = '';
        
        // URL-Typ erkennen
        if (url.includes('drive.google.com')) {
            type = 'google_drive';
            
            // Google Drive ID extrahieren
            const driveId = url.match(/[-\w]{25,}/);
            if (driveId) {
                thumbnail = `https://drive.google.com/thumbnail?id=${driveId[0]}`;
            }
        } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
            type = 'youtube';
            
            // YouTube Video ID extrahieren
            let videoId = '';
            if (url.includes('youtube.com/watch')) {
                const urlObj = new URL(url);
                videoId = urlObj.searchParams.get('v') || '';
            } else if (url.includes('youtu.be/')) {
                videoId = url.split('youtu.be/')[1].split('?')[0];
            }
            
            if (videoId) {
                thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
            }
        }
        
        // Versuche, Metadaten aus der Webseite zu extrahieren
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 5000
        });
        
        const $ = cheerio.load(response.data);
        
        // Titel aus Meta-Tags oder Titel-Tag extrahieren
        title = $('meta[property="og:title"]').attr('content') || 
                $('meta[name="twitter:title"]').attr('content') || 
                $('title').text() || 
                url;
        
        // Thumbnail aus Meta-Tags extrahieren, falls noch nicht gesetzt
        if (!thumbnail) {
            thumbnail = $('meta[property="og:image"]').attr('content') || 
                       $('meta[name="twitter:image"]').attr('content') || 
                       '';
        }
        
        return { type, title, thumbnail };
    } catch (error) {
        console.error('Fehler beim Extrahieren der Metadaten:', error);
        return { type: 'link', title: url, thumbnail: '' };
    }
};

/**
 * Externen Link erstellen
 */
export const createExternalLink = async (req: Request, res: Response) => {
    try {
        const { url, title, carticleId } = req.body;
        const userId = parseInt(req.userId, 10);
        
        if (!url) {
            return res.status(400).json({ message: 'URL ist erforderlich' });
        }
        
        if (!carticleId) {
            return res.status(400).json({ message: 'Artikel-ID ist erforderlich' });
        }
        
        // Prüfen, ob der Artikel existiert
        const article = await prisma.$queryRaw`
            SELECT * FROM "CerebroCarticle" WHERE id = ${parseInt(carticleId, 10)}
        `;
        
        if (!article || (Array.isArray(article) && article.length === 0)) {
            return res.status(404).json({ message: 'Artikel nicht gefunden' });
        }
        
        // Metadaten extrahieren
        const metadata = await extractMetadata(url);
        
        // Link erstellen
        const link = await prisma.$queryRaw`
            INSERT INTO "CerebroExternalLink" (
                url, 
                title, 
                type, 
                "carticleId", 
                "createdById", 
                "createdAt", 
                "updatedAt"
            )
            VALUES (
                ${url}, 
                ${title || metadata.title}, 
                ${metadata.type}, 
                ${parseInt(carticleId, 10)}, 
                ${userId}, 
                NOW(), 
                NOW()
            )
            RETURNING *
        `;
        
        const linkData = link[0];
        
        // Markdown-Link zum Artikelinhalt hinzufügen
        // Verwende den bereits geladenen Artikel (content ist in SELECT * enthalten)
        if (article && Array.isArray(article) && article.length > 0) {
            const currentContent = article[0].content || '';
            const linkTitle = title || metadata.title || url;
            
            // Markdown-Link erstellen
            const markdownLink = `\n\n[🔗 ${linkTitle}](${url})`;
            
            // Link zum Inhalt hinzufügen
            const updatedContent = currentContent + markdownLink;
            
            await prisma.$queryRaw`
                UPDATE "CerebroCarticle"
                SET content = ${updatedContent}, "updatedAt" = NOW()
                WHERE id = ${parseInt(carticleId, 10)}
            `;
        }
        
        res.status(201).json({
            ...linkData,
            metadata
        });
    } catch (error) {
        console.error('Fehler beim Erstellen des externen Links:', error);
        res.status(500).json({ message: 'Fehler beim Erstellen des externen Links' });
    }
};

/**
 * Links für einen Artikel abrufen
 */
export const getLinksByArticle = async (req: Request, res: Response) => {
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
        
        // Links für den Artikel abrufen
        const links = await prisma.$queryRaw`
            SELECT l.*, u.username as creatorName
            FROM "CerebroExternalLink" l
            JOIN "User" u ON l."createdById" = u.id
            WHERE l."carticleId" = ${articleId}
            ORDER BY l."createdAt" DESC
        `;
        
        res.status(200).json(links);
    } catch (error) {
        console.error('Fehler beim Abrufen der externen Links:', error);
        res.status(500).json({ message: 'Fehler beim Abrufen der externen Links' });
    }
};

/**
 * Einzelnen Link abrufen
 */
export const getLinkById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const linkId = parseInt(id, 10);
        
        if (isNaN(linkId)) {
            return res.status(400).json({ message: 'Ungültige Link-ID' });
        }
        
        // Link abrufen
        const link = await prisma.$queryRaw`
            SELECT l.*, u.username as creatorName, ca.title as articleTitle
            FROM "CerebroExternalLink" l
            JOIN "User" u ON l."createdById" = u.id
            JOIN "CerebroCarticle" ca ON l."carticleId" = ca.id
            WHERE l.id = ${linkId}
        `;
        
        if (!link || (Array.isArray(link) && link.length === 0)) {
            return res.status(404).json({ message: 'Link nicht gefunden' });
        }
        
        res.status(200).json(link[0]);
    } catch (error) {
        console.error('Fehler beim Abrufen des Links:', error);
        res.status(500).json({ message: 'Fehler beim Abrufen des Links' });
    }
};

/**
 * Vorschau für eine URL generieren
 */
export const getLinkPreview = async (req: Request, res: Response) => {
    try {
        const { url } = req.query;
        
        if (!url || typeof url !== 'string') {
            return res.status(400).json({ message: 'URL ist erforderlich' });
        }
        
        // Metadaten extrahieren
        const metadata = await extractMetadata(url);
        
        res.status(200).json(metadata);
    } catch (error) {
        console.error('Fehler beim Generieren der Link-Vorschau:', error);
        res.status(500).json({ message: 'Fehler beim Generieren der Link-Vorschau' });
    }
};

/**
 * Link aktualisieren
 */
export const updateLink = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { title } = req.body;
        const linkId = parseInt(id, 10);
        
        if (isNaN(linkId)) {
            return res.status(400).json({ message: 'Ungültige Link-ID' });
        }
        
        if (!title) {
            return res.status(400).json({ message: 'Titel ist erforderlich' });
        }
        
        // Prüfen, ob der Link existiert
        const link = await prisma.$queryRaw`
            SELECT * FROM "CerebroExternalLink" WHERE id = ${linkId}
        `;
        
        if (!link || (Array.isArray(link) && link.length === 0)) {
            return res.status(404).json({ message: 'Link nicht gefunden' });
        }
        
        // Link aktualisieren
        const updatedLink = await prisma.$queryRaw`
            UPDATE "CerebroExternalLink"
            SET title = ${title}, "updatedAt" = NOW()
            WHERE id = ${linkId}
            RETURNING *
        `;
        
        res.status(200).json(updatedLink[0]);
    } catch (error) {
        console.error('Fehler beim Aktualisieren des Links:', error);
        res.status(500).json({ message: 'Fehler beim Aktualisieren des Links' });
    }
};

/**
 * Link löschen
 */
export const deleteLink = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const linkId = parseInt(id, 10);
        
        if (isNaN(linkId)) {
            return res.status(400).json({ message: 'Ungültige Link-ID' });
        }
        
        // Prüfen, ob der Link existiert
        const link = await prisma.$queryRaw`
            SELECT * FROM "CerebroExternalLink" WHERE id = ${linkId}
        `;
        
        if (!link || (Array.isArray(link) && link.length === 0)) {
            return res.status(404).json({ message: 'Link nicht gefunden' });
        }
        
        // Link löschen
        await prisma.$queryRaw`
            DELETE FROM "CerebroExternalLink" WHERE id = ${linkId}
        `;
        
        res.status(200).json({ message: 'Link erfolgreich gelöscht' });
    } catch (error) {
        console.error('Fehler beim Löschen des Links:', error);
        res.status(500).json({ message: 'Fehler beim Löschen des Links' });
    }
}; 
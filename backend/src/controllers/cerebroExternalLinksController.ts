import { Request, Response } from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

/**
 * Hilfsfunktion zum Extrahieren von Metadaten aus einer URL
 */
const extractMetadata = async (url: string) => {
    try {
        // ✅ FIX: URL-Validierung vor Metadaten-Extraktion
        try {
            const urlObj = new URL(url);
            // Prüfe ob es eine gültige URL ist (nicht nur IP-Adresse oder lokale Adresse)
            if (!urlObj.hostname || urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1') {
                return { type: 'link', title: url, thumbnail: '' };
            }
            // Prüfe ob Hostname nur Zahlen enthält (z.B. "17.35.00")
            if (/^[\d.]+$/.test(urlObj.hostname)) {
                return { type: 'link', title: url, thumbnail: '' };
            }
        } catch (urlError) {
            // URL ist ungültig
            logger.warn('[extractMetadata] Ungültige URL:', url);
            return { type: 'link', title: url, thumbnail: '' };
        }
        
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
            
            // Stelle sicher, dass relative URLs absolut werden
            if (thumbnail && !thumbnail.startsWith('http')) {
                try {
                    const urlObj = new URL(url);
                    thumbnail = new URL(thumbnail, `${urlObj.protocol}//${urlObj.host}`).toString();
                } catch (e) {
                    logger.error('[extractMetadata] Fehler beim Konvertieren der Thumbnail-URL:', e);
                }
            }
        }
        
        logger.log('[extractMetadata] Extrahierte Metadaten:', {
            url,
            title,
            thumbnail: thumbnail || '(kein Thumbnail)',
            type
        });
        
        return { type, title, thumbnail };
    } catch (error: any) {
        logger.error('[extractMetadata] Fehler beim Extrahieren der Metadaten:', error?.message || error);
        logger.error('[extractMetadata] Stack:', error?.stack);
        return { type: 'link', title: url, thumbnail: '' };
    }
};

/**
 * Externen Link erstellen
 */
export const createExternalLink = async (req: Request, res: Response) => {
    try {
        const { url, title, carticleId, carticleSlug } = req.body;
        const userId = parseInt(req.userId, 10);
        
        if (!url) {
            return res.status(400).json({ message: 'URL ist erforderlich' });
        }
        
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
                return res.status(404).json({ message: 'Artikel nicht gefunden' });
            }
            
            articleId = article.id;
        } else {
            return res.status(400).json({ message: 'Artikel-ID oder Artikel-Slug ist erforderlich' });
        }
        
        // Prüfen, ob der Artikel existiert
        const article = await prisma.$queryRaw`
            SELECT * FROM "CerebroCarticle" WHERE id = ${articleId}
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
                ${articleId}, 
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
                WHERE id = ${articleId}
            `;
        }
        
        res.status(201).json({
            ...linkData,
            metadata
        });
    } catch (error) {
        logger.error('Fehler beim Erstellen des externen Links:', error);
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
        logger.error('Fehler beim Abrufen der externen Links:', error);
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
        logger.error('Fehler beim Abrufen des Links:', error);
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
        
        logger.log('[getLinkPreview] Lade Metadaten für URL:', url);
        
        // Metadaten extrahieren
        const metadata = await extractMetadata(url);
        
        logger.log('[getLinkPreview] Metadaten erhalten:', {
            title: metadata.title,
            thumbnail: metadata.thumbnail,
            type: metadata.type
        });
        
        res.status(200).json(metadata);
    } catch (error) {
        logger.error('[getLinkPreview] Fehler beim Generieren der Link-Vorschau:', error);
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
        logger.error('Fehler beim Aktualisieren des Links:', error);
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
        logger.error('Fehler beim Löschen des Links:', error);
        res.status(500).json({ message: 'Fehler beim Löschen des Links' });
    }
};

/**
 * Hilfsfunktion zum Extrahieren des Pfads aus einer GitHub-URL
 */
const extractPathFromGitHubUrl = (url: string): string | null => {
    try {
        // Unterstütze verschiedene GitHub-URL-Formate:
        // - https://raw.githubusercontent.com/owner/repo/branch/path/to/file.md
        // - https://github.com/owner/repo/blob/branch/path/to/file.md
        // - https://github.com/owner/repo/tree/branch/path/to/file.md
        
        if (url.includes('raw.githubusercontent.com')) {
            // Format: https://raw.githubusercontent.com/owner/repo/branch/path/to/file.md
            const match = url.match(/raw\.githubusercontent\.com\/[^\/]+\/[^\/]+\/[^\/]+\/(.+)$/);
            if (match && match[1]) {
                return decodeURIComponent(match[1]);
            }
        } else if (url.includes('github.com')) {
            // Format: https://github.com/owner/repo/blob/branch/path/to/file.md
            // oder: https://github.com/owner/repo/tree/branch/path/to/file.md
            const match = url.match(/github\.com\/[^\/]+\/[^\/]+\/(?:blob|tree)\/[^\/]+\/(.+)$/);
            if (match && match[1]) {
                return decodeURIComponent(match[1]);
            }
        }
        
        return null;
    } catch (error) {
        logger.error('[extractPathFromGitHubUrl] Fehler beim Extrahieren des Pfads:', error);
        return null;
    }
};

/**
 * Admin-Funktion: Korrigiere alle GitHub-Links basierend auf githubPath der Artikel
 */
export const fixGitHubLinks = async (req: Request, res: Response) => {
    try {
        logger.log('[fixGitHubLinks] Starte Korrektur der GitHub-Links...');
        
        // Alle GitHub-Links abrufen
        const allLinks = await prisma.$queryRaw`
            SELECT * FROM "CerebroExternalLink"
            WHERE type = 'github_markdown'
            ORDER BY id
        ` as any[];
        
        logger.log(`[fixGitHubLinks] Gefunden: ${allLinks.length} GitHub-Links`);
        
        // Alle Artikel mit githubPath abrufen
        const articlesWithGithubPath = await prisma.$queryRaw`
            SELECT id, slug, title, "githubPath" FROM "CerebroCarticle"
            WHERE "githubPath" IS NOT NULL AND "githubPath" != ''
            ORDER BY id
        ` as any[];
        
        logger.log(`[fixGitHubLinks] Gefunden: ${articlesWithGithubPath.length} Artikel mit githubPath`);
        
        let corrected = 0;
        let notFound = 0;
        const corrections: Array<{ linkId: number; oldArticleId: number; newArticleId: number; path: string }> = [];
        
        // Für jeden Link prüfen, ob er dem richtigen Artikel zugeordnet ist
        for (const link of allLinks) {
            const pathFromUrl = extractPathFromGitHubUrl(link.url);
            
            if (!pathFromUrl) {
                logger.log(`[fixGitHubLinks] Link ${link.id}: Konnte Pfad nicht aus URL extrahieren: ${link.url}`);
                notFound++;
                continue;
            }
            
            // Suche Artikel mit passendem githubPath
            const matchingArticle = articlesWithGithubPath.find((article: any) => {
                const articlePath = article.githubPath?.trim();
                if (!articlePath) return false;
                
                // Normalisiere Pfade (entferne führende/trailing Slashes, normalisiere Pfad-Trennzeichen)
                const normalizedUrlPath = pathFromUrl.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
                const normalizedArticlePath = articlePath.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
                
                return normalizedUrlPath === normalizedArticlePath || 
                       normalizedUrlPath.endsWith(normalizedArticlePath) ||
                       normalizedArticlePath.endsWith(normalizedUrlPath);
            });
            
            if (matchingArticle && matchingArticle.id !== link.carticleId) {
                // Link ist falsch zugeordnet - korrigiere
                logger.log(`[fixGitHubLinks] Link ${link.id}: Korrigiere von Artikel ${link.carticleId} zu Artikel ${matchingArticle.id} (${matchingArticle.slug})`);
                logger.log(`  URL-Pfad: ${pathFromUrl}`);
                logger.log(`  Artikel githubPath: ${matchingArticle.githubPath}`);
                
                await prisma.$queryRaw`
                    UPDATE "CerebroExternalLink"
                    SET "carticleId" = ${matchingArticle.id}, "updatedAt" = NOW()
                    WHERE id = ${link.id}
                `;
                
                corrected++;
                corrections.push({
                    linkId: link.id,
                    oldArticleId: link.carticleId,
                    newArticleId: matchingArticle.id,
                    path: pathFromUrl
                });
            } else if (!matchingArticle) {
                logger.log(`[fixGitHubLinks] Link ${link.id}: Kein passender Artikel gefunden für Pfad: ${pathFromUrl}`);
                notFound++;
            }
        }
        
        logger.log(`[fixGitHubLinks] Abgeschlossen: ${corrected} Links korrigiert, ${notFound} Links ohne passenden Artikel`);
        
        res.status(200).json({
            message: 'GitHub-Links erfolgreich korrigiert',
            totalLinks: allLinks.length,
            corrected,
            notFound,
            corrections
        });
    } catch (error) {
        logger.error('[fixGitHubLinks] Fehler beim Korrigieren der GitHub-Links:', error);
        res.status(500).json({ message: 'Fehler beim Korrigieren der GitHub-Links' });
    }
}; 
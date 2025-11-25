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
exports.fixGitHubLinks = exports.deleteLink = exports.updateLink = exports.getLinkPreview = exports.getLinkById = exports.getLinksByArticle = exports.createExternalLink = void 0;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const prisma_1 = require("../utils/prisma");
/**
 * Hilfsfunktion zum Extrahieren von Metadaten aus einer URL
 */
const extractMetadata = (url) => __awaiter(void 0, void 0, void 0, function* () {
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
        }
        else if (url.includes('youtube.com') || url.includes('youtu.be')) {
            type = 'youtube';
            // YouTube Video ID extrahieren
            let videoId = '';
            if (url.includes('youtube.com/watch')) {
                const urlObj = new URL(url);
                videoId = urlObj.searchParams.get('v') || '';
            }
            else if (url.includes('youtu.be/')) {
                videoId = url.split('youtu.be/')[1].split('?')[0];
            }
            if (videoId) {
                thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
            }
        }
        // Versuche, Metadaten aus der Webseite zu extrahieren
        const response = yield axios_1.default.get(url, {
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
                }
                catch (e) {
                    console.error('[extractMetadata] Fehler beim Konvertieren der Thumbnail-URL:', e);
                }
            }
        }
        console.log('[extractMetadata] Extrahierte Metadaten:', {
            url,
            title,
            thumbnail: thumbnail || '(kein Thumbnail)',
            type
        });
        return { type, title, thumbnail };
    }
    catch (error) {
        console.error('[extractMetadata] Fehler beim Extrahieren der Metadaten:', (error === null || error === void 0 ? void 0 : error.message) || error);
        console.error('[extractMetadata] Stack:', error === null || error === void 0 ? void 0 : error.stack);
        return { type: 'link', title: url, thumbnail: '' };
    }
});
/**
 * Externen Link erstellen
 */
const createExternalLink = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { url, title, carticleId, carticleSlug } = req.body;
        const userId = parseInt(req.userId, 10);
        if (!url) {
            return res.status(400).json({ message: 'URL ist erforderlich' });
        }
        let articleId = null;
        // Unterstütze sowohl carticleId als auch carticleSlug
        if (carticleId) {
            articleId = parseInt(carticleId, 10);
        }
        else if (carticleSlug) {
            // Artikel nach Slug suchen
            const article = yield prisma_1.prisma.cerebroCarticle.findUnique({
                where: { slug: carticleSlug },
                select: { id: true }
            });
            if (!article) {
                return res.status(404).json({ message: 'Artikel nicht gefunden' });
            }
            articleId = article.id;
        }
        else {
            return res.status(400).json({ message: 'Artikel-ID oder Artikel-Slug ist erforderlich' });
        }
        // Prüfen, ob der Artikel existiert
        const article = yield prisma_1.prisma.$queryRaw `
            SELECT * FROM "CerebroCarticle" WHERE id = ${articleId}
        `;
        if (!article || (Array.isArray(article) && article.length === 0)) {
            return res.status(404).json({ message: 'Artikel nicht gefunden' });
        }
        // Metadaten extrahieren
        const metadata = yield extractMetadata(url);
        // Link erstellen
        const link = yield prisma_1.prisma.$queryRaw `
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
            yield prisma_1.prisma.$queryRaw `
                UPDATE "CerebroCarticle"
                SET content = ${updatedContent}, "updatedAt" = NOW()
                WHERE id = ${articleId}
            `;
        }
        res.status(201).json(Object.assign(Object.assign({}, linkData), { metadata }));
    }
    catch (error) {
        console.error('Fehler beim Erstellen des externen Links:', error);
        res.status(500).json({ message: 'Fehler beim Erstellen des externen Links' });
    }
});
exports.createExternalLink = createExternalLink;
/**
 * Links für einen Artikel abrufen
 */
const getLinksByArticle = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { carticleId } = req.params;
        const articleId = parseInt(carticleId, 10);
        if (isNaN(articleId)) {
            return res.status(400).json({ message: 'Ungültige Artikel-ID' });
        }
        // Prüfen, ob der Artikel existiert
        const article = yield prisma_1.prisma.$queryRaw `
            SELECT * FROM "CerebroCarticle" WHERE id = ${articleId}
        `;
        if (!article || (Array.isArray(article) && article.length === 0)) {
            return res.status(404).json({ message: 'Artikel nicht gefunden' });
        }
        // Links für den Artikel abrufen
        const links = yield prisma_1.prisma.$queryRaw `
            SELECT l.*, u.username as creatorName
            FROM "CerebroExternalLink" l
            JOIN "User" u ON l."createdById" = u.id
            WHERE l."carticleId" = ${articleId}
            ORDER BY l."createdAt" DESC
        `;
        res.status(200).json(links);
    }
    catch (error) {
        console.error('Fehler beim Abrufen der externen Links:', error);
        res.status(500).json({ message: 'Fehler beim Abrufen der externen Links' });
    }
});
exports.getLinksByArticle = getLinksByArticle;
/**
 * Einzelnen Link abrufen
 */
const getLinkById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const linkId = parseInt(id, 10);
        if (isNaN(linkId)) {
            return res.status(400).json({ message: 'Ungültige Link-ID' });
        }
        // Link abrufen
        const link = yield prisma_1.prisma.$queryRaw `
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
    }
    catch (error) {
        console.error('Fehler beim Abrufen des Links:', error);
        res.status(500).json({ message: 'Fehler beim Abrufen des Links' });
    }
});
exports.getLinkById = getLinkById;
/**
 * Vorschau für eine URL generieren
 */
const getLinkPreview = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { url } = req.query;
        if (!url || typeof url !== 'string') {
            return res.status(400).json({ message: 'URL ist erforderlich' });
        }
        console.log('[getLinkPreview] Lade Metadaten für URL:', url);
        // Metadaten extrahieren
        const metadata = yield extractMetadata(url);
        console.log('[getLinkPreview] Metadaten erhalten:', {
            title: metadata.title,
            thumbnail: metadata.thumbnail,
            type: metadata.type
        });
        res.status(200).json(metadata);
    }
    catch (error) {
        console.error('[getLinkPreview] Fehler beim Generieren der Link-Vorschau:', error);
        res.status(500).json({ message: 'Fehler beim Generieren der Link-Vorschau' });
    }
});
exports.getLinkPreview = getLinkPreview;
/**
 * Link aktualisieren
 */
const updateLink = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const link = yield prisma_1.prisma.$queryRaw `
            SELECT * FROM "CerebroExternalLink" WHERE id = ${linkId}
        `;
        if (!link || (Array.isArray(link) && link.length === 0)) {
            return res.status(404).json({ message: 'Link nicht gefunden' });
        }
        // Link aktualisieren
        const updatedLink = yield prisma_1.prisma.$queryRaw `
            UPDATE "CerebroExternalLink"
            SET title = ${title}, "updatedAt" = NOW()
            WHERE id = ${linkId}
            RETURNING *
        `;
        res.status(200).json(updatedLink[0]);
    }
    catch (error) {
        console.error('Fehler beim Aktualisieren des Links:', error);
        res.status(500).json({ message: 'Fehler beim Aktualisieren des Links' });
    }
});
exports.updateLink = updateLink;
/**
 * Link löschen
 */
const deleteLink = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const linkId = parseInt(id, 10);
        if (isNaN(linkId)) {
            return res.status(400).json({ message: 'Ungültige Link-ID' });
        }
        // Prüfen, ob der Link existiert
        const link = yield prisma_1.prisma.$queryRaw `
            SELECT * FROM "CerebroExternalLink" WHERE id = ${linkId}
        `;
        if (!link || (Array.isArray(link) && link.length === 0)) {
            return res.status(404).json({ message: 'Link nicht gefunden' });
        }
        // Link löschen
        yield prisma_1.prisma.$queryRaw `
            DELETE FROM "CerebroExternalLink" WHERE id = ${linkId}
        `;
        res.status(200).json({ message: 'Link erfolgreich gelöscht' });
    }
    catch (error) {
        console.error('Fehler beim Löschen des Links:', error);
        res.status(500).json({ message: 'Fehler beim Löschen des Links' });
    }
});
exports.deleteLink = deleteLink;
/**
 * Hilfsfunktion zum Extrahieren des Pfads aus einer GitHub-URL
 */
const extractPathFromGitHubUrl = (url) => {
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
        }
        else if (url.includes('github.com')) {
            // Format: https://github.com/owner/repo/blob/branch/path/to/file.md
            // oder: https://github.com/owner/repo/tree/branch/path/to/file.md
            const match = url.match(/github\.com\/[^\/]+\/[^\/]+\/(?:blob|tree)\/[^\/]+\/(.+)$/);
            if (match && match[1]) {
                return decodeURIComponent(match[1]);
            }
        }
        return null;
    }
    catch (error) {
        console.error('[extractPathFromGitHubUrl] Fehler beim Extrahieren des Pfads:', error);
        return null;
    }
};
/**
 * Admin-Funktion: Korrigiere alle GitHub-Links basierend auf githubPath der Artikel
 */
const fixGitHubLinks = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('[fixGitHubLinks] Starte Korrektur der GitHub-Links...');
        // Alle GitHub-Links abrufen
        const allLinks = yield prisma_1.prisma.$queryRaw `
            SELECT * FROM "CerebroExternalLink"
            WHERE type = 'github_markdown'
            ORDER BY id
        `;
        console.log(`[fixGitHubLinks] Gefunden: ${allLinks.length} GitHub-Links`);
        // Alle Artikel mit githubPath abrufen
        const articlesWithGithubPath = yield prisma_1.prisma.$queryRaw `
            SELECT id, slug, title, "githubPath" FROM "CerebroCarticle"
            WHERE "githubPath" IS NOT NULL AND "githubPath" != ''
            ORDER BY id
        `;
        console.log(`[fixGitHubLinks] Gefunden: ${articlesWithGithubPath.length} Artikel mit githubPath`);
        let corrected = 0;
        let notFound = 0;
        const corrections = [];
        // Für jeden Link prüfen, ob er dem richtigen Artikel zugeordnet ist
        for (const link of allLinks) {
            const pathFromUrl = extractPathFromGitHubUrl(link.url);
            if (!pathFromUrl) {
                console.log(`[fixGitHubLinks] Link ${link.id}: Konnte Pfad nicht aus URL extrahieren: ${link.url}`);
                notFound++;
                continue;
            }
            // Suche Artikel mit passendem githubPath
            const matchingArticle = articlesWithGithubPath.find((article) => {
                var _a;
                const articlePath = (_a = article.githubPath) === null || _a === void 0 ? void 0 : _a.trim();
                if (!articlePath)
                    return false;
                // Normalisiere Pfade (entferne führende/trailing Slashes, normalisiere Pfad-Trennzeichen)
                const normalizedUrlPath = pathFromUrl.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
                const normalizedArticlePath = articlePath.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
                return normalizedUrlPath === normalizedArticlePath ||
                    normalizedUrlPath.endsWith(normalizedArticlePath) ||
                    normalizedArticlePath.endsWith(normalizedUrlPath);
            });
            if (matchingArticle && matchingArticle.id !== link.carticleId) {
                // Link ist falsch zugeordnet - korrigiere
                console.log(`[fixGitHubLinks] Link ${link.id}: Korrigiere von Artikel ${link.carticleId} zu Artikel ${matchingArticle.id} (${matchingArticle.slug})`);
                console.log(`  URL-Pfad: ${pathFromUrl}`);
                console.log(`  Artikel githubPath: ${matchingArticle.githubPath}`);
                yield prisma_1.prisma.$queryRaw `
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
            }
            else if (!matchingArticle) {
                console.log(`[fixGitHubLinks] Link ${link.id}: Kein passender Artikel gefunden für Pfad: ${pathFromUrl}`);
                notFound++;
            }
        }
        console.log(`[fixGitHubLinks] Abgeschlossen: ${corrected} Links korrigiert, ${notFound} Links ohne passenden Artikel`);
        res.status(200).json({
            message: 'GitHub-Links erfolgreich korrigiert',
            totalLinks: allLinks.length,
            corrected,
            notFound,
            corrections
        });
    }
    catch (error) {
        console.error('[fixGitHubLinks] Fehler beim Korrigieren der GitHub-Links:', error);
        res.status(500).json({ message: 'Fehler beim Korrigieren der GitHub-Links' });
    }
});
exports.fixGitHubLinks = fixGitHubLinks;
//# sourceMappingURL=cerebroExternalLinksController.js.map
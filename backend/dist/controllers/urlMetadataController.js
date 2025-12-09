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
exports.getUrlMetadata = void 0;
const axios_1 = __importDefault(require("axios"));
const cheerio_1 = __importDefault(require("cheerio"));
const logger_1 = require("../utils/logger");
/**
 * Extrahiert Metadaten einer URL (Titel, Beschreibung, Bild)
 * Verwendet Open Graph und Twitter Card Tags
 */
const getUrlMetadata = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { url } = req.query;
        if (!url || typeof url !== 'string') {
            res.status(400).json({ message: 'URL parameter fehlt oder ist ungültig' });
            return;
        }
        // Sende Request zur URL und hole HTML-Inhalt
        const response = yield axios_1.default.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml',
                'Accept-Language': 'en-US,en;q=0.9,de;q=0.8'
            },
            timeout: 5000, // 5 Sekunden Timeout
            maxRedirects: 5,
            validateStatus: (status) => status < 500 // Akzeptiere auch 4xx Statuscode
        });
        // Nur fortfahren wenn der Status zwischen 200-299 liegt
        if (response.status >= 200 && response.status < 300) {
            const html = response.data;
            const $ = cheerio_1.default.load(html);
            // Extrahiere Metadaten mit Priorität: Open Graph > Twitter Card > Standard HTML Tags
            const metadata = {
                url: url,
                title: getMetaTag($, 'og:title') || getMetaTag($, 'twitter:title') || $('title').text() || '',
                description: getMetaTag($, 'og:description') || getMetaTag($, 'twitter:description') || getMetaTag($, 'description') || '',
                image: getMetaTag($, 'og:image') || getMetaTag($, 'twitter:image') || getFaviconUrl($, url) || '',
                domain: new URL(url).hostname,
            };
            // Stelle sicher, dass Bildpfad absolut ist
            if (metadata.image && !metadata.image.startsWith('http')) {
                try {
                    const urlObj = new URL(url);
                    metadata.image = new URL(metadata.image, `${urlObj.protocol}//${urlObj.host}`).toString();
                }
                catch (e) {
                    // Bei ungültiger URL Bild-URL auf leer setzen
                    metadata.image = '';
                }
            }
            res.json(metadata);
        }
        else {
            // Bei Nicht-2xx-Statuscodes einen Fallback verwenden
            throw new Error(`Failed to fetch URL: HTTP ${response.status}`);
        }
    }
    catch (error) {
        logger_1.logger.error('Fehler beim Abrufen der URL-Metadaten:', error);
        // Fallback-Antwort mit begrenzten Informationen
        try {
            const domain = new URL(req.query.url).hostname;
            res.json({
                url: req.query.url,
                title: domain,
                description: '',
                image: getFaviconUrlFromDomain(domain),
                domain: domain,
            });
        }
        catch (e) {
            res.status(500).json({ message: 'Fehler beim Abrufen der URL-Metadaten' });
        }
    }
});
exports.getUrlMetadata = getUrlMetadata;
/**
 * Hilfsfunktion zum Extrahieren von Meta-Tags
 */
function getMetaTag($, name) {
    // Prüfe Open Graph und andere Meta-Tags
    const ogTag = $(`meta[property="${name}"]`).attr('content');
    if (ogTag)
        return ogTag;
    // Prüfe name-Attribute (für Standard-Meta-Tags)
    const nameTag = $(`meta[name="${name}"]`).attr('content');
    if (nameTag)
        return nameTag;
    return '';
}
/**
 * Versucht, die Favicon-URL zu finden
 */
function getFaviconUrl($, url) {
    // Versuche zuerst ein Favicon aus den Link-Tags zu bekommen
    const faviconLink = $('link[rel="icon"], link[rel="shortcut icon"]').attr('href');
    if (faviconLink) {
        if (faviconLink.startsWith('http')) {
            return faviconLink;
        }
        else {
            try {
                const urlObj = new URL(url);
                return new URL(faviconLink, `${urlObj.protocol}//${urlObj.host}`).toString();
            }
            catch (e) {
                // Ignoriere Fehler
            }
        }
    }
    // Fallback zum Google Favicon Service
    return getFaviconUrlFromDomain(new URL(url).hostname);
}
/**
 * Holt Favicon von Google Favicon Service
 */
function getFaviconUrlFromDomain(domain) {
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}
//# sourceMappingURL=urlMetadataController.js.map
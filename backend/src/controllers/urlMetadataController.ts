import { Request, Response } from 'express';
import axios from 'axios';
import cheerio from 'cheerio';

/**
 * Extrahiert Metadaten einer URL (Titel, Beschreibung, Bild)
 * Verwendet Open Graph und Twitter Card Tags
 */
export const getUrlMetadata = async (req: Request, res: Response): Promise<void> => {
  try {
    const { url } = req.query;
    
    if (!url || typeof url !== 'string') {
      res.status(400).json({ message: 'URL parameter fehlt oder ist ungültig' });
      return;
    }

    // Sende Request zur URL und hole HTML-Inhalt
    const response = await axios.get(url, {
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
      const $ = cheerio.load(html);
      
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
        } catch (e) {
          // Bei ungültiger URL Bild-URL auf leer setzen
          metadata.image = '';
        }
      }

      res.json(metadata);
    } else {
      // Bei Nicht-2xx-Statuscodes einen Fallback verwenden
      throw new Error(`Failed to fetch URL: HTTP ${response.status}`);
    }
  } catch (error) {
    console.error('Fehler beim Abrufen der URL-Metadaten:', error);
    
    // Fallback-Antwort mit begrenzten Informationen
    try {
      const domain = new URL(req.query.url as string).hostname;
      res.json({
        url: req.query.url,
        title: domain,
        description: '',
        image: getFaviconUrlFromDomain(domain),
        domain: domain,
      });
    } catch (e) {
      res.status(500).json({ message: 'Fehler beim Abrufen der URL-Metadaten' });
    }
  }
};

/**
 * Hilfsfunktion zum Extrahieren von Meta-Tags
 */
function getMetaTag($: any, name: string): string {
  // Prüfe Open Graph und andere Meta-Tags
  const ogTag = $(`meta[property="${name}"]`).attr('content');
  if (ogTag) return ogTag;
  
  // Prüfe name-Attribute (für Standard-Meta-Tags)
  const nameTag = $(`meta[name="${name}"]`).attr('content');
  if (nameTag) return nameTag;
  
  return '';
}

/**
 * Versucht, die Favicon-URL zu finden
 */
function getFaviconUrl($: any, url: string): string {
  // Versuche zuerst ein Favicon aus den Link-Tags zu bekommen
  const faviconLink = $('link[rel="icon"], link[rel="shortcut icon"]').attr('href');
  if (faviconLink) {
    if (faviconLink.startsWith('http')) {
      return faviconLink;
    } else {
      try {
        const urlObj = new URL(url);
        return new URL(faviconLink, `${urlObj.protocol}//${urlObj.host}`).toString();
      } catch (e) {
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
function getFaviconUrlFromDomain(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
} 
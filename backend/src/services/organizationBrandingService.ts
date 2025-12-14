import axios from 'axios';
import sharp from 'sharp';
import { logger } from '../utils/logger';

/**
 * Branding-Informationen aus Logo
 */
export interface BrandingInfo {
  colors: {
    primary?: string;      // HEX
    secondary?: string;    // HEX
    accent?: string;       // HEX
    palette?: string[];   // Array von HEX-Farben
  };
  fonts?: {
    primary?: string;      // Schriftart-Name
    style?: string;        // z.B. "modern", "classic", "bold"
  };
  style?: {
    mood?: string;         // z.B. "professional", "playful", "elegant"
    layout?: string;       // z.B. "minimalist", "busy", "balanced"
  };
}

/**
 * Farb-Palette aus Logo
 */
export interface ColorPalette {
  primary: string;
  secondary?: string;
  accent?: string;
  palette: string[];
}

/**
 * Service für Corporate Identity-Extraktion aus Organisations-Logos
 */
export class OrganizationBrandingService {
  private static readonly API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
  private static readonly VISION_MODEL = 'gemini-1.5-flash';

  /**
   * Extrahiert Branding-Informationen aus Logo
   * Versucht zuerst vollständige CI mit Gemini Vision, dann Fallback auf Farb-Extraktion
   */
  static async extractBrandingFromLogo(logoBase64: string): Promise<BrandingInfo> {
    try {
      // Versuche vollständige CI-Extraktion mit Gemini Vision
      const fullBranding = await this.analyzeLogoWithGemini(logoBase64);
      if (fullBranding) {
        logger.log('[OrganizationBrandingService] Vollständige CI mit Gemini Vision extrahiert');
        return fullBranding;
      }
    } catch (error: any) {
      logger.warn('[OrganizationBrandingService] Gemini Vision Analyse fehlgeschlagen, verwende Fallback:', error.message);
    }

    // Fallback: Nur Farb-Extraktion mit sharp
    try {
      const colorPalette = await this.extractColorsFromLogo(logoBase64);
      logger.log('[OrganizationBrandingService] Farben mit sharp extrahiert (Fallback)');
      return {
        colors: {
          primary: colorPalette.primary,
          secondary: colorPalette.secondary,
          accent: colorPalette.accent,
          palette: colorPalette.palette
        }
      };
    } catch (error: any) {
      logger.error('[OrganizationBrandingService] Farb-Extraktion fehlgeschlagen:', error);
      // Letzter Fallback: Leeres Branding
      return { colors: {} };
    }
  }

  /**
   * Analysiert Logo mit Gemini Vision API
   * Extrahiert vollständige Corporate Identity (Farben, Schriftarten, Stil)
   */
  private static async analyzeLogoWithGemini(logoBase64: string): Promise<BrandingInfo | null> {
    try {
      const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
      
      if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY nicht gesetzt');
      }

      // Parse Base64-String (entferne data:image/...;base64, Präfix falls vorhanden)
      let imageData = logoBase64;
      let mimeType = 'image/png';
      
      if (logoBase64.startsWith('data:')) {
        const matches = logoBase64.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          mimeType = matches[1];
          imageData = matches[2];
        } else {
          // Fallback: Versuche ohne Präfix
          imageData = logoBase64.replace(/^data:image\/[^;]+;base64,/, '');
        }
      }

      const cleanApiKey = GEMINI_API_KEY.trim().replace(/\s/g, '');
      const url = `${this.API_BASE_URL}/models/${this.VISION_MODEL}:generateContent`;

      const prompt = `Analysiere dieses Logo und extrahiere die Corporate Identity im JSON-Format. 
      Antworte NUR mit einem gültigen JSON-Objekt, keine zusätzlichen Erklärungen.
      
      Struktur:
      {
        "colors": {
          "primary": "#HEX-Farbe der Hauptfarbe",
          "secondary": "#HEX-Farbe der Sekundärfarbe (falls vorhanden)",
          "accent": "#HEX-Farbe der Akzentfarbe (falls vorhanden)",
          "palette": ["#HEX1", "#HEX2", ...] // Array der wichtigsten Farben
        },
        "fonts": {
          "primary": "Name der Hauptschriftart (falls erkennbar, z.B. 'Arial', 'Helvetica', 'serif', 'sans-serif')",
          "style": "Stil der Schriftart (z.B. 'modern', 'classic', 'bold', 'elegant', 'playful')"
        },
        "style": {
          "mood": "Stimmung des Logos (z.B. 'professional', 'playful', 'elegant', 'modern', 'classic')",
          "layout": "Layout-Stil (z.B. 'minimalist', 'busy', 'balanced', 'clean')"
        }
      }
      
      Wenn Informationen nicht erkennbar sind, lasse die Felder weg oder setze sie auf null.`;

      const response = await axios.post(
        url,
        {
          contents: [{
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: imageData
                }
              }
            ]
          }]
        },
        {
          headers: {
            'x-goog-api-key': cleanApiKey,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 Sekunden Timeout
        }
      );

      // Extrahiere JSON aus Response
      const textResponse = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textResponse) {
        throw new Error('Keine Text-Antwort von Gemini Vision');
      }

      // Versuche JSON zu extrahieren (kann in Code-Blöcken sein)
      let jsonText = textResponse.trim();
      
      // Entferne Markdown Code-Blöcke falls vorhanden
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Versuche JSON zu parsen
      const brandingData = JSON.parse(jsonText) as BrandingInfo;

      // Validiere und normalisiere Daten
      const branding: BrandingInfo = {
        colors: {
          primary: brandingData.colors?.primary || undefined,
          secondary: brandingData.colors?.secondary || undefined,
          accent: brandingData.colors?.accent || undefined,
          palette: brandingData.colors?.palette || undefined
        }
      };

      // Füge Fonts hinzu falls vorhanden
      if (brandingData.fonts?.primary || brandingData.fonts?.style) {
        branding.fonts = {
          primary: brandingData.fonts?.primary || undefined,
          style: brandingData.fonts?.style || undefined
        };
      }

      // Füge Style hinzu falls vorhanden
      if (brandingData.style?.mood || brandingData.style?.layout) {
        branding.style = {
          mood: brandingData.style?.mood || undefined,
          layout: brandingData.style?.layout || undefined
        };
      }

      return branding;
    } catch (error: any) {
      logger.error('[OrganizationBrandingService] Fehler bei Gemini Vision Analyse:', {
        error: error.message,
        response: error.response?.data
      });
      return null;
    }
  }

  /**
   * Extrahiert Farben aus Logo mit sharp (Fallback)
   */
  static async extractColorsFromLogo(logoBase64: string): Promise<ColorPalette> {
    try {
      // Parse Base64-String
      let imageData = logoBase64;
      if (logoBase64.startsWith('data:')) {
        imageData = logoBase64.replace(/^data:image\/[^;]+;base64,/, '');
      }

      // Konvertiere Base64 zu Buffer
      const imageBuffer = Buffer.from(imageData, 'base64');

      // Resize für schnellere Verarbeitung (max 200x200)
      const resized = await sharp(imageBuffer)
        .resize(200, 200, { fit: 'inside', withoutEnlargement: true })
        .toBuffer();

      // Extrahiere Rohdaten für Farb-Analyse
      const { data, info } = await sharp(resized)
        .raw()
        .toBuffer({ resolveWithObject: true });

      // Zähle Farb-Häufigkeiten
      const colorCounts = new Map<string, number>();
      const pixelCount = info.width * info.height;
      const channels = info.channels;

      for (let i = 0; i < data.length; i += channels) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = channels === 4 ? data[i + 3] : 255;

        // Ignoriere transparente Pixel
        if (a < 128) continue;

        const hex = `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
        colorCounts.set(hex, (colorCounts.get(hex) || 0) + 1);
      }

      // Sortiere nach Häufigkeit
      const sortedColors = Array.from(colorCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([color]) => color);

      // Filtere zu ähnliche Farben (min. 30 HEX-Unterschied)
      const filteredColors: string[] = [];
      for (const color of sortedColors) {
        const isSimilar = filteredColors.some(existing => {
          const diff = this.colorDifference(color, existing);
          return diff < 30; // Schwellenwert für ähnliche Farben
        });
        if (!isSimilar) {
          filteredColors.push(color);
        }
      }

      // Extrahiere Hauptfarben
      const primary = filteredColors[0] || '#000000';
      const secondary = filteredColors[1] || filteredColors[0] || '#000000';
      const accent = filteredColors[2] || filteredColors[1] || filteredColors[0] || '#000000';

      return {
        primary,
        secondary: secondary !== primary ? secondary : undefined,
        accent: accent !== primary && accent !== secondary ? accent : undefined,
        palette: filteredColors.slice(0, 8) // Max. 8 Farben
      };
    } catch (error: any) {
      logger.error('[OrganizationBrandingService] Fehler bei Farb-Extraktion:', error);
      throw error;
    }
  }

  /**
   * Berechnet Farb-Unterschied zwischen zwei HEX-Farben
   */
  private static colorDifference(color1: string, color2: string): number {
    const rgb1 = this.hexToRgb(color1);
    const rgb2 = this.hexToRgb(color2);
    
    if (!rgb1 || !rgb2) return 1000; // Sehr großer Unterschied bei ungültigen Farben
    
    const rDiff = Math.abs(rgb1.r - rgb2.r);
    const gDiff = Math.abs(rgb1.g - rgb2.g);
    const bDiff = Math.abs(rgb1.b - rgb2.b);
    
    // Euklidische Distanz im RGB-Raum
    return Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
  }

  /**
   * Konvertiert HEX zu RGB
   */
  private static hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  /**
   * Erstellt Prompt-Teil für Branding-Informationen
   */
  static buildBrandingPrompt(branding: BrandingInfo): string {
    const parts: string[] = [];

    // Farben
    if (branding.colors.primary) {
      parts.push(`Verwende die Hauptfarbe ${branding.colors.primary}`);
      if (branding.colors.secondary) {
        parts.push(`und die Sekundärfarbe ${branding.colors.secondary}`);
      }
      if (branding.colors.accent) {
        parts.push(`mit Akzentfarbe ${branding.colors.accent}`);
      }
      parts.push('als Corporate Identity-Farben.');
    } else if (branding.colors.palette && branding.colors.palette.length > 0) {
      parts.push(`Verwende die Farbpalette: ${branding.colors.palette.join(', ')}`);
    }

    // Schriftarten
    if (branding.fonts?.style) {
      parts.push(`Verwende einen ${branding.fonts.style} Schriftstil`);
      if (branding.fonts.primary) {
        parts.push(`(ähnlich wie ${branding.fonts.primary})`);
      }
      parts.push('für Text-Elemente.');
    }

    // Stil
    if (branding.style?.mood) {
      parts.push(`Der Stil soll ${branding.style.mood} sein`);
      if (branding.style.layout) {
        parts.push(`mit ${branding.style.layout} Layout`);
      }
      parts.push('.');
    }

    return parts.length > 0 ? parts.join(' ') : '';
  }
}


import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import { BrandingInfo } from './organizationBrandingService';

/**
 * Generische Konfiguration für Bildgenerierung
 */
export interface ImageGenerationConfig {
  entityType: 'tour' | 'reservation' | 'task' | 'event' | 'product';
  entityId: number;
  title: string;
  description: string;
  outputDir: string;
  filenamePattern: string;
  imageTypes: ('main' | 'gallery' | 'flyer')[];
  apiKey?: string;
  branding?: BrandingInfo;
}

/**
 * Gemini Image Generation Service (Nano Banana)
 * 
 * Generiert Bilder mit Google Gemini API (gemini-2.5-flash-image)
 * Dokumentation: https://ai.google.dev/gemini-api/docs/image-generation
 */
export class GeminiImageService {
  private static readonly API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
  private static readonly MODEL = 'gemini-2.5-flash-image';

  /**
   * Generiert ein Bild aus einem Text-Prompt
   */
  static async generateImage(
    prompt: string,
    outputPath: string,
    apiKey?: string
  ): Promise<string> {
    try {
      const GEMINI_API_KEY = apiKey || process.env.GEMINI_API_KEY;
      
      if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY nicht gesetzt. Bitte in .env hinterlegen oder als Parameter übergeben.');
      }

      logger.log('[GeminiImageService] Starte Bildgenerierung:', { 
        prompt: prompt.substring(0, 100),
        apiKeyLength: GEMINI_API_KEY.length,
        apiKeyPrefix: GEMINI_API_KEY.substring(0, 10) + '...'
      });

      // API-URL ohne Query-Parameter
      const url = `${this.API_BASE_URL}/models/${this.MODEL}:generateContent`;
      
      // Entferne Leerzeichen und Zeilenumbrüche vom API-Schlüssel
      const cleanApiKey = GEMINI_API_KEY.trim().replace(/\s/g, '');
      
      logger.log('[GeminiImageService] API Request Details:', {
        url,
        apiKeyClean: cleanApiKey.substring(0, 10) + '...',
        model: this.MODEL
      });
      
      const response = await axios.post(
        url,
        {
          contents: [{
            parts: [
              { text: prompt }
            ]
          }]
        },
        {
          headers: {
            'x-goog-api-key': cleanApiKey,
            'Content-Type': 'application/json'
          },
          timeout: 60000 // 60 Sekunden Timeout
        }
      );

      // Extrahiere Bild aus Response
      const parts = response.data.candidates?.[0]?.content?.parts || [];
      
      for (const part of parts) {
        if (part.inlineData) {
          // Base64 dekodieren
          const imageData = part.inlineData.data;
          const imageBuffer = Buffer.from(imageData, 'base64');
          
          // Stelle sicher, dass Verzeichnis existiert
          const dir = path.dirname(outputPath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          
          // Speichere Bild
          fs.writeFileSync(outputPath, imageBuffer);
          
          logger.log('[GeminiImageService] Bild erfolgreich generiert:', outputPath);
          return outputPath;
        }
      }

      throw new Error('Kein Bild in der API-Antwort gefunden');
    } catch (error: any) {
      logger.error('[GeminiImageService] Fehler bei Bildgenerierung:', {
        error: error.message,
        response: error.response?.data
      });
      throw error;
    }
  }

  /**
   * Generiert mehrere Bilder basierend auf Konfiguration
   * Generische Methode für alle Entitäten
   */
  static async generateImages(
    config: ImageGenerationConfig
  ): Promise<{ mainImage?: string; galleryImages: string[]; flyer?: string }> {
    // Stelle sicher, dass Verzeichnis existiert
    if (!fs.existsSync(config.outputDir)) {
      fs.mkdirSync(config.outputDir, { recursive: true });
    }

    const timestamp = Date.now();
    const result: { mainImage?: string; galleryImages: string[]; flyer?: string } = {
      galleryImages: []
    };

    // Hauptbild generieren (falls gewünscht)
    if (config.imageTypes.includes('main')) {
      const mainImagePrompt = this.buildMainImagePrompt(config.title, config.description, config.entityType, config.branding);
      const mainImagePath = path.join(
        config.outputDir,
        config.filenamePattern.replace('{type}', 'main').replace('{timestamp}', timestamp.toString())
      );
      await this.generateImage(mainImagePrompt, mainImagePath, config.apiKey);
      result.mainImage = mainImagePath;
    }

    // Galerie-Bilder generieren (falls gewünscht)
    if (config.imageTypes.includes('gallery')) {
      const galleryPrompts = this.buildGalleryPrompts(config.title, config.description, config.entityType, config.branding);
      for (let i = 0; i < galleryPrompts.length; i++) {
        const galleryPath = path.join(
          config.outputDir,
          config.filenamePattern.replace('{type}', `gallery-${i}`).replace('{timestamp}', timestamp.toString())
        );
        await this.generateImage(galleryPrompts[i], galleryPath, config.apiKey);
        result.galleryImages.push(galleryPath);
      }
    }

    // Flyer generieren (falls gewünscht)
    if (config.imageTypes.includes('flyer')) {
      const flyerPrompt = this.buildFlyerPrompt(config.title, config.description, config.entityType, config.branding);
      const flyerPath = path.join(
        config.outputDir,
        config.filenamePattern.replace('{type}', 'flyer').replace('{timestamp}', timestamp.toString())
      );
      await this.generateImage(flyerPrompt, flyerPath, config.apiKey);
      result.flyer = flyerPath;
    }

    return result;
  }

  /**
   * Erstellt Prompt für Hauptbild
   */
  private static buildMainImagePrompt(title: string, description: string, entityType: string, branding?: BrandingInfo): string {
    const brandingPrompt = branding ? this.buildBrandingPromptPart(branding) : '';
    
    if (entityType === 'tour') {
      return `Create a beautiful, professional tourism promotional image for "${title}". ${description}. 
      The image should be vibrant, inviting, and showcase the destination. 
      Style: Professional travel photography, high quality, colorful, appealing to tourists. 
      Include scenic views, cultural elements, and adventure activities. 
      ${brandingPrompt}
      Aspect ratio: 16:9, high resolution.`.trim();
    }
    // Fallback für andere Entitäten
    return `Create a beautiful, professional promotional image for "${title}". ${description}. 
    Style: Professional photography, high quality, colorful, appealing. 
    ${brandingPrompt}
    Aspect ratio: 16:9, high resolution.`.trim();
  }

  /**
   * Erstellt Prompts für Galerie-Bilder
   */
  private static buildGalleryPrompts(title: string, description: string, entityType: string, branding?: BrandingInfo): string[] {
    const brandingPrompt = branding ? this.buildBrandingPromptPart(branding) : '';
    
    if (entityType === 'tour') {
      return [
        `Create a stunning landscape photo showcasing the main attraction from "${title}". ${description}. 
        Style: Professional travel photography, golden hour lighting, vibrant colors. 
        ${brandingPrompt}`.trim(),
        
        `Create an image showing tourists enjoying activities from "${title}". ${description}. 
        Style: Candid travel photography, people having fun, authentic experience. 
        ${brandingPrompt}`.trim(),
        
        `Create a beautiful cultural or architectural detail image from "${title}". ${description}. 
        Style: Professional travel photography, focus on local culture and heritage. 
        ${brandingPrompt}`.trim()
      ];
    }
    // Fallback für andere Entitäten
    return [
      `Create a professional image showcasing "${title}". ${description}. 
      Style: Professional photography, high quality, vibrant colors. 
      ${brandingPrompt}`.trim(),
      
      `Create another professional image for "${title}". ${description}. 
      Style: Professional photography, different angle or perspective. 
      ${brandingPrompt}`.trim(),
      
      `Create a detail image for "${title}". ${description}. 
      Style: Professional photography, focus on key features. 
      ${brandingPrompt}`.trim()
    ];
  }

  /**
   * Erstellt Prompt für Flyer
   */
  private static buildFlyerPrompt(title: string, description: string, entityType: string, branding?: BrandingInfo): string {
    const brandingPrompt = branding ? this.buildBrandingPromptPart(branding) : '';
    
    if (entityType === 'tour') {
      return `Create a professional, eye-catching tour flyer/poster for "${title}". 
      ${description}
      
      Requirements:
      - Professional design, travel brochure style
      - Include tour title prominently
      - Show key highlights and attractions
      - Include visual elements that represent the tour activities
      - Colorful, inviting design
      - Text should be readable and well-placed
      - Aspect ratio: 3:4 (portrait orientation for flyer)
      - High resolution, print-ready quality
      ${brandingPrompt ? `- ${brandingPrompt}` : ''}
      
      Style: Professional travel agency flyer, modern design, vibrant colors, appealing to tourists.`.trim();
    }
    // Fallback für andere Entitäten
    return `Create a professional, eye-catching flyer/poster for "${title}". 
    ${description}
    
    Requirements:
    - Professional design
    - Include title prominently
    - Show key features
    - Colorful, inviting design
    - Text should be readable and well-placed
    - Aspect ratio: 3:4 (portrait orientation)
    - High resolution, print-ready quality
    ${brandingPrompt ? `- ${brandingPrompt}` : ''}`.trim();
  }

  /**
   * Erstellt Prompt-Teil für Branding-Informationen
   */
  private static buildBrandingPromptPart(branding: BrandingInfo): string {
    const parts: string[] = [];

    // Farben
    if (branding.colors.primary) {
      parts.push(`Use the primary color ${branding.colors.primary}`);
      if (branding.colors.secondary) {
        parts.push(`and secondary color ${branding.colors.secondary}`);
      }
      if (branding.colors.accent) {
        parts.push(`with accent color ${branding.colors.accent}`);
      }
      parts.push('as the main corporate identity colors throughout the image.');
    } else if (branding.colors.palette && branding.colors.palette.length > 0) {
      parts.push(`Use the color palette: ${branding.colors.palette.join(', ')} as corporate identity colors.`);
    }

    // Schriftarten
    if (branding.fonts?.style) {
      parts.push(`Use a ${branding.fonts.style} typography style`);
      if (branding.fonts.primary) {
        parts.push(`(similar to ${branding.fonts.primary})`);
      }
      parts.push('for any text elements.');
    }

    // Stil
    if (branding.style?.mood) {
      parts.push(`The overall mood should be ${branding.style.mood}`);
      if (branding.style.layout) {
        parts.push(`with a ${branding.style.layout} layout style`);
      }
      parts.push('.');
    }

    return parts.length > 0 ? parts.join(' ') : '';
  }

  /**
   * Generiert mehrere Bilder für eine Tour
   * Wrapper um generateImages() mit Tour-spezifischen Einstellungen
   */
  static async generateTourImages(
    tourId: number,
    tourTitle: string,
    tourDescription: string,
    apiKey?: string,
    branding?: BrandingInfo
  ): Promise<{ mainImage: string; galleryImages: string[]; flyer: string }> {
    const TOURS_UPLOAD_DIR = path.join(__dirname, '../../uploads/tours');
    
    const config: ImageGenerationConfig = {
      entityType: 'tour',
      entityId: tourId,
      title: tourTitle,
      description: tourDescription,
      outputDir: TOURS_UPLOAD_DIR,
      filenamePattern: `tour-${tourId}-{type}-{timestamp}.png`,
      imageTypes: ['main', 'gallery', 'flyer'],
      apiKey,
      branding
    };

    const result = await this.generateImages(config);

    // Type-Safety: Stelle sicher, dass alle Bilder vorhanden sind
    if (!result.mainImage || !result.flyer || result.galleryImages.length === 0) {
      throw new Error('Nicht alle Bilder konnten generiert werden');
    }

    return {
      mainImage: result.mainImage,
      galleryImages: result.galleryImages,
      flyer: result.flyer
    };
  }
}


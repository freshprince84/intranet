import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

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
      const mainImagePrompt = this.buildMainImagePrompt(config.title, config.description, config.entityType);
      const mainImagePath = path.join(
        config.outputDir,
        config.filenamePattern.replace('{type}', 'main').replace('{timestamp}', timestamp.toString())
      );
      await this.generateImage(mainImagePrompt, mainImagePath, config.apiKey);
      result.mainImage = mainImagePath;
    }

    // Galerie-Bilder generieren (falls gewünscht)
    if (config.imageTypes.includes('gallery')) {
      const galleryPrompts = this.buildGalleryPrompts(config.title, config.description, config.entityType);
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
      const flyerPrompt = this.buildFlyerPrompt(config.title, config.description, config.entityType);
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
  private static buildMainImagePrompt(title: string, description: string, entityType: string): string {
    if (entityType === 'tour') {
      return `Create a beautiful, professional tourism promotional image for "${title}". ${description}. 
      The image should be vibrant, inviting, and showcase the destination. 
      Style: Professional travel photography, high quality, colorful, appealing to tourists. 
      Include scenic views, cultural elements, and adventure activities. 
      Aspect ratio: 16:9, high resolution.`;
    }
    // Fallback für andere Entitäten
    return `Create a beautiful, professional promotional image for "${title}". ${description}. 
    Style: Professional photography, high quality, colorful, appealing. 
    Aspect ratio: 16:9, high resolution.`;
  }

  /**
   * Erstellt Prompts für Galerie-Bilder
   */
  private static buildGalleryPrompts(title: string, description: string, entityType: string): string[] {
    if (entityType === 'tour') {
      return [
        `Create a stunning landscape photo showcasing the main attraction from "${title}". ${description}. 
        Style: Professional travel photography, golden hour lighting, vibrant colors.`,
        
        `Create an image showing tourists enjoying activities from "${title}". ${description}. 
        Style: Candid travel photography, people having fun, authentic experience.`,
        
        `Create a beautiful cultural or architectural detail image from "${title}". ${description}. 
        Style: Professional travel photography, focus on local culture and heritage.`
      ];
    }
    // Fallback für andere Entitäten
    return [
      `Create a professional image showcasing "${title}". ${description}. 
      Style: Professional photography, high quality, vibrant colors.`,
      
      `Create another professional image for "${title}". ${description}. 
      Style: Professional photography, different angle or perspective.`,
      
      `Create a detail image for "${title}". ${description}. 
      Style: Professional photography, focus on key features.`
    ];
  }

  /**
   * Erstellt Prompt für Flyer
   */
  private static buildFlyerPrompt(title: string, description: string, entityType: string): string {
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
      
      Style: Professional travel agency flyer, modern design, vibrant colors, appealing to tourists.`;
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
    - High resolution, print-ready quality`;
  }

  /**
   * Generiert mehrere Bilder für eine Tour
   * Wrapper um generateImages() mit Tour-spezifischen Einstellungen
   */
  static async generateTourImages(
    tourId: number,
    tourTitle: string,
    tourDescription: string,
    apiKey?: string
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
      apiKey
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


import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

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
   * Generiert mehrere Bilder für eine Tour
   */
  static async generateTourImages(
    tourId: number,
    tourTitle: string,
    tourDescription: string,
    apiKey?: string
  ): Promise<{ mainImage: string; galleryImages: string[]; flyer: string }> {
    const TOURS_UPLOAD_DIR = path.join(__dirname, '../../uploads/tours');
    if (!fs.existsSync(TOURS_UPLOAD_DIR)) {
      fs.mkdirSync(TOURS_UPLOAD_DIR, { recursive: true });
    }

    const timestamp = Date.now();
    
    // Hauptbild: Attraktives Tour-Bild
    const mainImagePrompt = `Create a beautiful, professional tourism promotional image for "${tourTitle}". ${tourDescription}. 
    The image should be vibrant, inviting, and showcase the destination. 
    Style: Professional travel photography, high quality, colorful, appealing to tourists. 
    Include scenic views, cultural elements, and adventure activities. 
    Aspect ratio: 16:9, high resolution.`;
    
    const mainImagePath = path.join(TOURS_UPLOAD_DIR, `tour-${tourId}-main-${timestamp}.png`);
    await this.generateImage(mainImagePrompt, mainImagePath, apiKey);

    // Galerie-Bilder: Verschiedene Aspekte der Tour
    const galleryPrompts = [
      `Create a stunning landscape photo showcasing the main attraction from "${tourTitle}". ${tourDescription}. 
      Style: Professional travel photography, golden hour lighting, vibrant colors.`,
      
      `Create an image showing tourists enjoying activities from "${tourTitle}". ${tourDescription}. 
      Style: Candid travel photography, people having fun, authentic experience.`,
      
      `Create a beautiful cultural or architectural detail image from "${tourTitle}". ${tourDescription}. 
      Style: Professional travel photography, focus on local culture and heritage.`
    ];

    const galleryImages: string[] = [];
    for (let i = 0; i < galleryPrompts.length; i++) {
      const galleryPath = path.join(TOURS_UPLOAD_DIR, `tour-${tourId}-gallery-${i}-${timestamp}.png`);
      await this.generateImage(galleryPrompts[i], galleryPath, apiKey);
      galleryImages.push(galleryPath);
    }

    // Flyer: Professioneller Tour-Flyer
    const flyerPrompt = `Create a professional, eye-catching tour flyer/poster for "${tourTitle}". 
    ${tourDescription}
    
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
    
    const flyerPath = path.join(TOURS_UPLOAD_DIR, `tour-${tourId}-flyer-${timestamp}.png`);
    await this.generateImage(flyerPrompt, flyerPath, apiKey);

    return {
      mainImage: mainImagePath,
      galleryImages,
      flyer: flyerPath
    };
  }
}


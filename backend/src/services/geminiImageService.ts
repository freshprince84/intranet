import axios from 'axios';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
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
  logoBase64?: string; // Logo als Base64-String für Overlay
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
      
      // Logo hinzufügen (falls vorhanden)
      if (config.logoBase64) {
        await this.addLogoToImage(mainImagePath, config.logoBase64);
      }
      
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
        
        // Logo hinzufügen (falls vorhanden)
        if (config.logoBase64) {
          await this.addLogoToImage(galleryPath, config.logoBase64);
        }
        
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
      
      // Logo hinzufügen (falls vorhanden)
      if (config.logoBase64) {
        await this.addLogoToImage(flyerPath, config.logoBase64);
      }
      
      result.flyer = flyerPath;
    }

    return result;
  }

  /**
   * Erstellt Prompt für Hauptbild
   */
  private static buildMainImagePrompt(title: string, description: string, entityType: string, branding?: BrandingInfo): string {
    const brandingPrompt = branding ? this.buildBrandingPromptPart(branding) : '';
    
    // Extrahiere relevante Informationen aus Beschreibung (ohne Text zu generieren)
    const contextInfo = this.extractVisualContext(description);
    
    if (entityType === 'tour') {
      return `Create a realistic, professional tourism promotional photograph. 
      
      Context: This image represents a tour about ${title}. ${contextInfo}
      
      Requirements:
      - Realistic photography of actual existing places and destinations
      - NO TEXT, NO WORDS, NO LETTERS, NO WRITING anywhere in the image
      - Professional travel photography style, high quality, vibrant colors
      - Showcase real scenic views, authentic cultural elements, and genuine adventure activities
      - The image should be vibrant, inviting, and represent the actual destination accurately
      - Use natural lighting and authentic photography techniques
      - Avoid any fictional or invented elements
      ${brandingPrompt}
      
      Technical: Aspect ratio 16:9, high resolution, professional quality.
      CRITICAL: Do not include any text, words, letters, or writing in the image.`.trim();
    }
    // Fallback für andere Entitäten
    return `Create a realistic, professional promotional photograph.
    
    Context: This image represents ${title}. ${contextInfo}
    
    Requirements:
    - Realistic photography of actual existing places or products
    - NO TEXT, NO WORDS, NO LETTERS, NO WRITING anywhere in the image
    - Professional photography style, high quality, vibrant colors
    - Authentic representation without fictional elements
    ${brandingPrompt}
    
    Technical: Aspect ratio 16:9, high resolution.
    CRITICAL: Do not include any text, words, letters, or writing in the image.`.trim();
  }

  /**
   * Erstellt Prompts für Galerie-Bilder
   */
  private static buildGalleryPrompts(title: string, description: string, entityType: string, branding?: BrandingInfo): string[] {
    const brandingPrompt = branding ? this.buildBrandingPromptPart(branding) : '';
    const contextInfo = this.extractVisualContext(description);
    
    if (entityType === 'tour') {
      return [
        `Create a realistic, stunning landscape photograph of the main attraction from the tour about ${title}. ${contextInfo}
        
        Requirements:
        - Realistic photography of actual existing places
        - NO TEXT, NO WORDS, NO LETTERS, NO WRITING anywhere in the image
        - Professional travel photography, golden hour lighting, vibrant colors
        - Authentic representation of real destinations
        ${brandingPrompt}
        
        CRITICAL: Do not include any text, words, letters, or writing in the image.`.trim(),
        
        `Create a realistic photograph showing tourists enjoying activities from the tour about ${title}. ${contextInfo}
        
        Requirements:
        - Realistic photography of actual people and places
        - NO TEXT, NO WORDS, NO LETTERS, NO WRITING anywhere in the image
        - Candid travel photography style, people having fun, authentic experience
        - Natural, unposed moments in real locations
        ${brandingPrompt}
        
        CRITICAL: Do not include any text, words, letters, or writing in the image.`.trim(),
        
        `Create a realistic photograph of cultural or architectural details from the tour about ${title}. ${contextInfo}
        
        Requirements:
        - Realistic photography of actual existing cultural or architectural elements
        - NO TEXT, NO WORDS, NO LETTERS, NO WRITING anywhere in the image
        - Professional travel photography, focus on authentic local culture and heritage
        - Real details from genuine locations
        ${brandingPrompt}
        
        CRITICAL: Do not include any text, words, letters, or writing in the image.`.trim()
      ];
    }
    // Fallback für andere Entitäten
    return [
      `Create a realistic, professional photograph showcasing ${title}. ${contextInfo}
      
      Requirements:
      - Realistic photography of actual existing places or products
      - NO TEXT, NO WORDS, NO LETTERS, NO WRITING anywhere in the image
      - Professional photography, high quality, vibrant colors
      ${brandingPrompt}
      
      CRITICAL: Do not include any text, words, letters, or writing in the image.`.trim(),
      
      `Create another realistic, professional photograph for ${title}. ${contextInfo}
      
      Requirements:
      - Realistic photography, different angle or perspective
      - NO TEXT, NO WORDS, NO LETTERS, NO WRITING anywhere in the image
      - Authentic representation
      ${brandingPrompt}
      
      CRITICAL: Do not include any text, words, letters, or writing in the image.`.trim(),
      
      `Create a realistic detail photograph for ${title}. ${contextInfo}
      
      Requirements:
      - Realistic photography of actual key features
      - NO TEXT, NO WORDS, NO LETTERS, NO WRITING anywhere in the image
      - Professional photography, focus on authentic details
      ${brandingPrompt}
      
      CRITICAL: Do not include any text, words, letters, or writing in the image.`.trim()
    ];
  }

  /**
   * Erstellt Prompt für Flyer
   * 
   * HINWEIS: Flyer können Text enthalten, aber wir verwenden hier trotzdem eine realistische Basis
   * und fügen Text später per Overlay hinzu (falls gewünscht)
   */
  private static buildFlyerPrompt(title: string, description: string, entityType: string, branding?: BrandingInfo): string {
    const brandingPrompt = branding ? this.buildBrandingPromptPart(branding) : '';
    const contextInfo = this.extractVisualContext(description);
    
    if (entityType === 'tour') {
      return `Create a realistic, professional tour flyer/poster design background for a tour about ${title}. ${contextInfo}
      
      Requirements:
      - Realistic photography-based design, travel brochure style
      - Show real key highlights and attractions from actual destinations
      - Include authentic visual elements that represent the actual tour activities
      - Colorful, inviting design with realistic imagery
      - Professional travel agency flyer style, modern design, vibrant colors
      - Use real photographs of actual places as background elements
      - NO TEXT, NO WORDS, NO LETTERS, NO WRITING in the image (text will be added separately)
      - Aspect ratio: 3:4 (portrait orientation for flyer)
      - High resolution, print-ready quality
      ${brandingPrompt ? `- ${brandingPrompt}` : ''}
      
      CRITICAL: Do not include any text, words, letters, or writing in the image. Use only realistic photography of actual places.`.trim();
    }
    // Fallback für andere Entitäten
    return `Create a realistic, professional flyer/poster design background for ${title}. ${contextInfo}
    
    Requirements:
    - Realistic photography-based design
    - Show real key features from actual places or products
    - Colorful, inviting design with authentic imagery
    - NO TEXT, NO WORDS, NO LETTERS, NO WRITING in the image (text will be added separately)
    - Aspect ratio: 3:4 (portrait orientation)
    - High resolution, print-ready quality
    ${brandingPrompt ? `- ${brandingPrompt}` : ''}
    
    CRITICAL: Do not include any text, words, letters, or writing in the image.`.trim();
  }

  /**
   * Extrahiert visuellen Kontext aus Beschreibung, ohne Text zu generieren
   * Entfernt Markdown, Listen-Symbole, etc. und fokussiert auf visuelle Elemente
   */
  private static extractVisualContext(description: string): string {
    if (!description) return '';
    
    // Entferne Markdown-Formatierung
    let cleaned = description
      .replace(/\*\*/g, '') // Bold
      .replace(/\*/g, '') // Italic/List
      .replace(/#{1,6}\s/g, '') // Headers
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Links
      .replace(/!\[([^\]]*)\]\([^\)]+\)/g, '') // Images
      .replace(/`([^`]+)`/g, '$1') // Code
      .replace(/\n{2,}/g, '. ') // Mehrfache Zeilenumbrüche
      .replace(/\n/g, '. ') // Einzelne Zeilenumbrüche
      .replace(/\s+/g, ' ') // Mehrfache Leerzeichen
      .trim();
    
    // Fokussiere auf visuelle Elemente (Orte, Aktivitäten, Sehenswürdigkeiten)
    // Entferne Preise, Zeiten, technische Details
    cleaned = cleaned
      .replace(/\d+\s*(COP|USD|EUR|€|\$)/gi, '') // Preise
      .replace(/\d+\s*(Stunden|hours|horas)/gi, '') // Dauer
      .replace(/\d+\s*(Teilnehmer|participants|participantes)/gi, '') // Teilnehmer
      .replace(/Price:.*?\./gi, '') // Preis-Zeilen
      .replace(/Location:.*?\./gi, '') // Location-Zeilen (behalte aber den Ort selbst)
      .trim();
    
    // Kürze auf maximal 200 Zeichen für Kontext
    if (cleaned.length > 200) {
      cleaned = cleaned.substring(0, 197) + '...';
    }
    
    return cleaned ? `The tour involves: ${cleaned}` : '';
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
   * Fügt Logo oben rechts auf ein Bild hinzu
   */
  private static async addLogoToImage(imagePath: string, logoBase64: string): Promise<void> {
    try {
      // Parse Base64-String
      let imageData = logoBase64;
      if (logoBase64.startsWith('data:')) {
        imageData = logoBase64.replace(/^data:image\/[^;]+;base64,/, '');
      }

      // Konvertiere Base64 zu Buffer
      const logoBuffer = Buffer.from(imageData, 'base64');

      // Lade das generierte Bild
      const image = sharp(imagePath);
      const imageMetadata = await image.metadata();
      const imageWidth = imageMetadata.width || 1920;
      const imageHeight = imageMetadata.height || 1080;

      // Berechne Logo-Größe (10% der Bildbreite, max. 200px)
      const logoSize = Math.min(imageWidth * 0.1, 200);
      const padding = Math.max(logoSize * 0.1, 10); // 10% des Logos oder min. 10px

      // Resize Logo
      const resizedLogo = await sharp(logoBuffer)
        .resize(Math.round(logoSize), Math.round(logoSize), {
          fit: 'inside',
          withoutEnlargement: true
        })
        .png()
        .toBuffer();

      // Position: oben rechts
      const left = imageWidth - logoSize - padding;
      const top = padding;

      // Composite Logo auf Bild
      await image
        .composite([
          {
            input: resizedLogo,
            left: Math.round(left),
            top: Math.round(top)
          }
        ])
        .toFile(imagePath);

      logger.log(`[GeminiImageService] Logo hinzugefügt zu ${imagePath}`);
    } catch (error: any) {
      logger.warn(`[GeminiImageService] Fehler beim Hinzufügen des Logos zu ${imagePath}:`, error.message);
      // Fehler ist nicht kritisch, Bild bleibt ohne Logo
    }
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
    branding?: BrandingInfo,
    logoBase64?: string
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
      branding,
      logoBase64
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


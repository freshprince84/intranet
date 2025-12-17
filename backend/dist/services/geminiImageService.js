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
exports.GeminiImageService = void 0;
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const sharp_1 = __importDefault(require("sharp"));
const logger_1 = require("../utils/logger");
/**
 * Gemini Image Generation Service (Nano Banana)
 *
 * Generiert Bilder mit Google Gemini API (gemini-2.5-flash-image)
 * Dokumentation: https://ai.google.dev/gemini-api/docs/image-generation
 */
class GeminiImageService {
    /**
     * Generiert ein Bild aus einem Text-Prompt
     */
    static generateImage(prompt, outputPath, apiKey) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            try {
                const GEMINI_API_KEY = apiKey || process.env.GEMINI_API_KEY;
                if (!GEMINI_API_KEY) {
                    throw new Error('GEMINI_API_KEY nicht gesetzt. Bitte in .env hinterlegen oder als Parameter übergeben.');
                }
                logger_1.logger.log('[GeminiImageService] Starte Bildgenerierung:', {
                    prompt: prompt.substring(0, 100),
                    apiKeyLength: GEMINI_API_KEY.length,
                    apiKeyPrefix: GEMINI_API_KEY.substring(0, 10) + '...'
                });
                // API-URL ohne Query-Parameter
                const url = `${this.API_BASE_URL}/models/${this.MODEL}:generateContent`;
                // Entferne Leerzeichen und Zeilenumbrüche vom API-Schlüssel
                const cleanApiKey = GEMINI_API_KEY.trim().replace(/\s/g, '');
                logger_1.logger.log('[GeminiImageService] API Request Details:', {
                    url,
                    apiKeyClean: cleanApiKey.substring(0, 10) + '...',
                    model: this.MODEL
                });
                const response = yield axios_1.default.post(url, {
                    contents: [{
                            parts: [
                                { text: prompt }
                            ]
                        }]
                }, {
                    headers: {
                        'x-goog-api-key': cleanApiKey,
                        'Content-Type': 'application/json'
                    },
                    timeout: 60000 // 60 Sekunden Timeout
                });
                // Extrahiere Bild aus Response
                const parts = ((_c = (_b = (_a = response.data.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) || [];
                for (const part of parts) {
                    if (part.inlineData) {
                        // Base64 dekodieren
                        const imageData = part.inlineData.data;
                        const imageBuffer = Buffer.from(imageData, 'base64');
                        // Stelle sicher, dass Verzeichnis existiert
                        const dir = path_1.default.dirname(outputPath);
                        if (!fs_1.default.existsSync(dir)) {
                            fs_1.default.mkdirSync(dir, { recursive: true });
                        }
                        // Speichere Bild
                        fs_1.default.writeFileSync(outputPath, imageBuffer);
                        logger_1.logger.log('[GeminiImageService] Bild erfolgreich generiert:', outputPath);
                        return outputPath;
                    }
                }
                throw new Error('Kein Bild in der API-Antwort gefunden');
            }
            catch (error) {
                logger_1.logger.error('[GeminiImageService] Fehler bei Bildgenerierung:', {
                    error: error.message,
                    response: (_d = error.response) === null || _d === void 0 ? void 0 : _d.data
                });
                throw error;
            }
        });
    }
    /**
     * Generiert mehrere Bilder basierend auf Konfiguration
     * Generische Methode für alle Entitäten
     */
    static generateImages(config) {
        return __awaiter(this, void 0, void 0, function* () {
            // Stelle sicher, dass Verzeichnis existiert
            if (!fs_1.default.existsSync(config.outputDir)) {
                fs_1.default.mkdirSync(config.outputDir, { recursive: true });
            }
            const timestamp = Date.now();
            const result = {
                galleryImages: []
            };
            // Hauptbild generieren (falls gewünscht)
            if (config.imageTypes.includes('main')) {
                const mainImagePrompt = this.buildMainImagePrompt(config.title, config.description, config.entityType, config.branding);
                const mainImagePath = path_1.default.join(config.outputDir, config.filenamePattern.replace('{type}', 'main').replace('{timestamp}', timestamp.toString()));
                yield this.generateImage(mainImagePrompt, mainImagePath, config.apiKey);
                // Logo hinzufügen (falls vorhanden)
                if (config.logoBase64) {
                    yield this.addLogoToImage(mainImagePath, config.logoBase64);
                }
                result.mainImage = mainImagePath;
            }
            // Galerie-Bilder generieren (falls gewünscht)
            if (config.imageTypes.includes('gallery')) {
                const galleryPrompts = this.buildGalleryPrompts(config.title, config.description, config.entityType, config.branding);
                for (let i = 0; i < galleryPrompts.length; i++) {
                    const galleryPath = path_1.default.join(config.outputDir, config.filenamePattern.replace('{type}', `gallery-${i}`).replace('{timestamp}', timestamp.toString()));
                    yield this.generateImage(galleryPrompts[i], galleryPath, config.apiKey);
                    // Logo hinzufügen (falls vorhanden)
                    if (config.logoBase64) {
                        yield this.addLogoToImage(galleryPath, config.logoBase64);
                    }
                    result.galleryImages.push(galleryPath);
                }
            }
            // Flyer generieren (falls gewünscht)
            if (config.imageTypes.includes('flyer')) {
                logger_1.logger.log('[generateImages] Starte Flyer-Generierung', {
                    title: config.title,
                    hasBranding: !!config.branding,
                    hasLogo: !!config.logoBase64
                });
                const flyerPrompt = this.buildFlyerPrompt(config.title, config.description, config.entityType, config.branding);
                const flyerPath = path_1.default.join(config.outputDir, config.filenamePattern.replace('{type}', 'flyer').replace('{timestamp}', timestamp.toString()));
                logger_1.logger.log('[generateImages] Flyer-Prompt erstellt, starte Generierung', {
                    promptLength: flyerPrompt.length,
                    outputPath: flyerPath
                });
                yield this.generateImage(flyerPrompt, flyerPath, config.apiKey);
                // Logo hinzufügen (falls vorhanden)
                if (config.logoBase64) {
                    logger_1.logger.log('[generateImages] Füge Logo zum Flyer hinzu');
                    yield this.addLogoToImage(flyerPath, config.logoBase64);
                }
                result.flyer = flyerPath;
                logger_1.logger.log('[generateImages] Flyer erfolgreich generiert', { flyerPath });
            }
            else {
                logger_1.logger.warn('[generateImages] Flyer-Generierung übersprungen - nicht in imageTypes', {
                    imageTypes: config.imageTypes
                });
            }
            return result;
        });
    }
    /**
     * Erstellt Prompt für Hauptbild
     */
    static buildMainImagePrompt(title, description, entityType, branding) {
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
    static buildGalleryPrompts(title, description, entityType, branding) {
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
    static buildFlyerPrompt(title, description, entityType, branding) {
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
    static extractVisualContext(description) {
        if (!description)
            return '';
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
    static buildBrandingPromptPart(branding) {
        var _a, _b;
        const parts = [];
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
        }
        else if (branding.colors.palette && branding.colors.palette.length > 0) {
            parts.push(`Use the color palette: ${branding.colors.palette.join(', ')} as corporate identity colors.`);
        }
        // Schriftarten
        if ((_a = branding.fonts) === null || _a === void 0 ? void 0 : _a.style) {
            parts.push(`Use a ${branding.fonts.style} typography style`);
            if (branding.fonts.primary) {
                parts.push(`(similar to ${branding.fonts.primary})`);
            }
            parts.push('for any text elements.');
        }
        // Stil
        if ((_b = branding.style) === null || _b === void 0 ? void 0 : _b.mood) {
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
    static addLogoToImage(imagePath, logoBase64) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Parse Base64-String
                let imageData = logoBase64;
                if (logoBase64.startsWith('data:')) {
                    imageData = logoBase64.replace(/^data:image\/[^;]+;base64,/, '');
                }
                // Konvertiere Base64 zu Buffer
                const logoBuffer = Buffer.from(imageData, 'base64');
                // Lade das generierte Bild
                const image = (0, sharp_1.default)(imagePath);
                const imageMetadata = yield image.metadata();
                const imageWidth = imageMetadata.width || 1920;
                const imageHeight = imageMetadata.height || 1080;
                // Berechne Logo-Größe (10% der Bildbreite, max. 200px)
                const logoSize = Math.min(imageWidth * 0.1, 200);
                const padding = Math.max(logoSize * 0.1, 10); // 10% des Logos oder min. 10px
                // Resize Logo
                const resizedLogo = yield (0, sharp_1.default)(logoBuffer)
                    .resize(Math.round(logoSize), Math.round(logoSize), {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                    .png()
                    .toBuffer();
                // Position: oben rechts
                const left = imageWidth - logoSize - padding;
                const top = padding;
                // WICHTIG: Verwende temporäre Datei, da sharp nicht die gleiche Datei als Input und Output verwenden kann
                const tempPath = imagePath + '.tmp';
                // Composite Logo auf Bild und schreibe in temporäre Datei
                yield image
                    .composite([
                    {
                        input: resizedLogo,
                        left: Math.round(left),
                        top: Math.round(top)
                    }
                ])
                    .toFile(tempPath);
                // Ersetze Original-Datei durch temporäre Datei
                fs_1.default.renameSync(tempPath, imagePath);
                logger_1.logger.log(`[GeminiImageService] Logo hinzugefügt zu ${imagePath}`);
            }
            catch (error) {
                logger_1.logger.warn(`[GeminiImageService] Fehler beim Hinzufügen des Logos zu ${imagePath}:`, error.message);
                // Lösche temporäre Datei falls vorhanden
                const tempPath = imagePath + '.tmp';
                if (fs_1.default.existsSync(tempPath)) {
                    try {
                        fs_1.default.unlinkSync(tempPath);
                    }
                    catch (unlinkError) {
                        // Ignoriere Fehler beim Löschen der temporären Datei
                    }
                }
                // Fehler ist nicht kritisch, Bild bleibt ohne Logo
            }
        });
    }
    /**
     * Generiert mehrere Bilder für eine Tour
     * Wrapper um generateImages() mit Tour-spezifischen Einstellungen
     *
     * WICHTIG: Der Flyer wird als Hauptbild (imageUrl) verwendet, nicht mainImage!
     */
    static generateTourImages(tourId, tourTitle, tourDescription, apiKey, branding, logoBase64) {
        return __awaiter(this, void 0, void 0, function* () {
            const TOURS_UPLOAD_DIR = path_1.default.join(__dirname, '../../uploads/tours');
            const config = {
                entityType: 'tour',
                entityId: tourId,
                title: tourTitle,
                description: tourDescription,
                outputDir: TOURS_UPLOAD_DIR,
                filenamePattern: `tour-${tourId}-{type}-{timestamp}.png`,
                imageTypes: ['gallery', 'flyer'], // Nur Flyer + Galerie, kein mainImage mehr
                apiKey,
                branding,
                logoBase64
            };
            const result = yield this.generateImages(config);
            // Type-Safety: Stelle sicher, dass Flyer und Galerie-Bilder vorhanden sind
            if (!result.flyer) {
                logger_1.logger.error('[generateTourImages] Flyer wurde nicht generiert', {
                    imageTypes: config.imageTypes,
                    resultKeys: Object.keys(result),
                    hasFlyer: !!result.flyer,
                    galleryCount: result.galleryImages.length
                });
                throw new Error('Flyer konnte nicht generiert werden');
            }
            if (result.galleryImages.length === 0) {
                logger_1.logger.error('[generateTourImages] Keine Galerie-Bilder generiert', {
                    imageTypes: config.imageTypes,
                    resultKeys: Object.keys(result)
                });
                throw new Error('Galerie-Bilder konnten nicht generiert werden');
            }
            logger_1.logger.log('[generateTourImages] Bilder erfolgreich generiert', {
                hasFlyer: !!result.flyer,
                flyerPath: result.flyer,
                galleryCount: result.galleryImages.length
            });
            return {
                flyer: result.flyer,
                galleryImages: result.galleryImages
            };
        });
    }
}
exports.GeminiImageService = GeminiImageService;
GeminiImageService.API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
GeminiImageService.MODEL = 'gemini-2.5-flash-image';
//# sourceMappingURL=geminiImageService.js.map
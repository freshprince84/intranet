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
                const mainImagePrompt = this.buildMainImagePrompt(config.title, config.description, config.entityType);
                const mainImagePath = path_1.default.join(config.outputDir, config.filenamePattern.replace('{type}', 'main').replace('{timestamp}', timestamp.toString()));
                yield this.generateImage(mainImagePrompt, mainImagePath, config.apiKey);
                result.mainImage = mainImagePath;
            }
            // Galerie-Bilder generieren (falls gewünscht)
            if (config.imageTypes.includes('gallery')) {
                const galleryPrompts = this.buildGalleryPrompts(config.title, config.description, config.entityType);
                for (let i = 0; i < galleryPrompts.length; i++) {
                    const galleryPath = path_1.default.join(config.outputDir, config.filenamePattern.replace('{type}', `gallery-${i}`).replace('{timestamp}', timestamp.toString()));
                    yield this.generateImage(galleryPrompts[i], galleryPath, config.apiKey);
                    result.galleryImages.push(galleryPath);
                }
            }
            // Flyer generieren (falls gewünscht)
            if (config.imageTypes.includes('flyer')) {
                const flyerPrompt = this.buildFlyerPrompt(config.title, config.description, config.entityType);
                const flyerPath = path_1.default.join(config.outputDir, config.filenamePattern.replace('{type}', 'flyer').replace('{timestamp}', timestamp.toString()));
                yield this.generateImage(flyerPrompt, flyerPath, config.apiKey);
                result.flyer = flyerPath;
            }
            return result;
        });
    }
    /**
     * Erstellt Prompt für Hauptbild
     */
    static buildMainImagePrompt(title, description, entityType) {
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
    static buildGalleryPrompts(title, description, entityType) {
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
    static buildFlyerPrompt(title, description, entityType) {
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
    static generateTourImages(tourId, tourTitle, tourDescription, apiKey) {
        return __awaiter(this, void 0, void 0, function* () {
            const TOURS_UPLOAD_DIR = path_1.default.join(__dirname, '../../uploads/tours');
            const config = {
                entityType: 'tour',
                entityId: tourId,
                title: tourTitle,
                description: tourDescription,
                outputDir: TOURS_UPLOAD_DIR,
                filenamePattern: `tour-${tourId}-{type}-{timestamp}.png`,
                imageTypes: ['main', 'gallery', 'flyer'],
                apiKey
            };
            const result = yield this.generateImages(config);
            // Type-Safety: Stelle sicher, dass alle Bilder vorhanden sind
            if (!result.mainImage || !result.flyer || result.galleryImages.length === 0) {
                throw new Error('Nicht alle Bilder konnten generiert werden');
            }
            return {
                mainImage: result.mainImage,
                galleryImages: result.galleryImages,
                flyer: result.flyer
            };
        });
    }
}
exports.GeminiImageService = GeminiImageService;
GeminiImageService.API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
GeminiImageService.MODEL = 'gemini-2.5-flash-image';
//# sourceMappingURL=geminiImageService.js.map
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
exports.OrganizationBrandingService = void 0;
const axios_1 = __importDefault(require("axios"));
const sharp_1 = __importDefault(require("sharp"));
const logger_1 = require("../utils/logger");
/**
 * Service für Corporate Identity-Extraktion aus Organisations-Logos
 */
class OrganizationBrandingService {
    /**
     * Extrahiert Branding-Informationen aus Logo
     * Versucht zuerst vollständige CI mit Gemini Vision, dann Fallback auf Farb-Extraktion
     */
    static extractBrandingFromLogo(logoBase64) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Versuche vollständige CI-Extraktion mit Gemini Vision
                const fullBranding = yield this.analyzeLogoWithGemini(logoBase64);
                if (fullBranding) {
                    logger_1.logger.log('[OrganizationBrandingService] Vollständige CI mit Gemini Vision extrahiert');
                    return fullBranding;
                }
            }
            catch (error) {
                logger_1.logger.warn('[OrganizationBrandingService] Gemini Vision Analyse fehlgeschlagen, verwende Fallback:', error.message);
            }
            // Fallback: Nur Farb-Extraktion mit sharp
            try {
                const colorPalette = yield this.extractColorsFromLogo(logoBase64);
                logger_1.logger.log('[OrganizationBrandingService] Farben mit sharp extrahiert (Fallback)');
                return {
                    colors: {
                        primary: colorPalette.primary,
                        secondary: colorPalette.secondary,
                        accent: colorPalette.accent,
                        palette: colorPalette.palette
                    }
                };
            }
            catch (error) {
                logger_1.logger.error('[OrganizationBrandingService] Farb-Extraktion fehlgeschlagen:', error);
                // Letzter Fallback: Leeres Branding
                return { colors: {} };
            }
        });
    }
    /**
     * Analysiert Logo mit Gemini Vision API
     * Extrahiert vollständige Corporate Identity (Farben, Schriftarten, Stil)
     */
    static analyzeLogoWithGemini(logoBase64) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
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
                    }
                    else {
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
                const response = yield axios_1.default.post(url, {
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
                }, {
                    headers: {
                        'x-goog-api-key': cleanApiKey,
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000 // 30 Sekunden Timeout
                });
                // Extrahiere JSON aus Response
                const textResponse = (_e = (_d = (_c = (_b = (_a = response.data.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.text;
                if (!textResponse) {
                    throw new Error('Keine Text-Antwort von Gemini Vision');
                }
                // Versuche JSON zu extrahieren (kann in Code-Blöcken sein)
                let jsonText = textResponse.trim();
                // Entferne Markdown Code-Blöcke falls vorhanden
                jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                // Versuche JSON zu parsen
                const brandingData = JSON.parse(jsonText);
                // Validiere und normalisiere Daten
                const branding = {
                    colors: {
                        primary: ((_f = brandingData.colors) === null || _f === void 0 ? void 0 : _f.primary) || undefined,
                        secondary: ((_g = brandingData.colors) === null || _g === void 0 ? void 0 : _g.secondary) || undefined,
                        accent: ((_h = brandingData.colors) === null || _h === void 0 ? void 0 : _h.accent) || undefined,
                        palette: ((_j = brandingData.colors) === null || _j === void 0 ? void 0 : _j.palette) || undefined
                    }
                };
                // Füge Fonts hinzu falls vorhanden
                if (((_k = brandingData.fonts) === null || _k === void 0 ? void 0 : _k.primary) || ((_l = brandingData.fonts) === null || _l === void 0 ? void 0 : _l.style)) {
                    branding.fonts = {
                        primary: ((_m = brandingData.fonts) === null || _m === void 0 ? void 0 : _m.primary) || undefined,
                        style: ((_o = brandingData.fonts) === null || _o === void 0 ? void 0 : _o.style) || undefined
                    };
                }
                // Füge Style hinzu falls vorhanden
                if (((_p = brandingData.style) === null || _p === void 0 ? void 0 : _p.mood) || ((_q = brandingData.style) === null || _q === void 0 ? void 0 : _q.layout)) {
                    branding.style = {
                        mood: ((_r = brandingData.style) === null || _r === void 0 ? void 0 : _r.mood) || undefined,
                        layout: ((_s = brandingData.style) === null || _s === void 0 ? void 0 : _s.layout) || undefined
                    };
                }
                return branding;
            }
            catch (error) {
                logger_1.logger.error('[OrganizationBrandingService] Fehler bei Gemini Vision Analyse:', {
                    error: error.message,
                    response: (_t = error.response) === null || _t === void 0 ? void 0 : _t.data
                });
                return null;
            }
        });
    }
    /**
     * Extrahiert Farben aus Logo mit sharp (Fallback)
     */
    static extractColorsFromLogo(logoBase64) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Parse Base64-String
                let imageData = logoBase64;
                if (logoBase64.startsWith('data:')) {
                    imageData = logoBase64.replace(/^data:image\/[^;]+;base64,/, '');
                }
                // Konvertiere Base64 zu Buffer
                const imageBuffer = Buffer.from(imageData, 'base64');
                // Resize für schnellere Verarbeitung (max 200x200)
                const resized = yield (0, sharp_1.default)(imageBuffer)
                    .resize(200, 200, { fit: 'inside', withoutEnlargement: true })
                    .toBuffer();
                // Extrahiere Rohdaten für Farb-Analyse
                const { data, info } = yield (0, sharp_1.default)(resized)
                    .raw()
                    .toBuffer({ resolveWithObject: true });
                // Zähle Farb-Häufigkeiten
                const colorCounts = new Map();
                const pixelCount = info.width * info.height;
                const channels = info.channels;
                for (let i = 0; i < data.length; i += channels) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    const a = channels === 4 ? data[i + 3] : 255;
                    // Ignoriere transparente Pixel
                    if (a < 128)
                        continue;
                    const hex = `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
                    colorCounts.set(hex, (colorCounts.get(hex) || 0) + 1);
                }
                // Sortiere nach Häufigkeit
                const sortedColors = Array.from(colorCounts.entries())
                    .sort((a, b) => b[1] - a[1])
                    .map(([color]) => color);
                // Filtere zu ähnliche Farben (min. 30 HEX-Unterschied)
                const filteredColors = [];
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
            }
            catch (error) {
                logger_1.logger.error('[OrganizationBrandingService] Fehler bei Farb-Extraktion:', error);
                throw error;
            }
        });
    }
    /**
     * Berechnet Farb-Unterschied zwischen zwei HEX-Farben
     */
    static colorDifference(color1, color2) {
        const rgb1 = this.hexToRgb(color1);
        const rgb2 = this.hexToRgb(color2);
        if (!rgb1 || !rgb2)
            return 1000; // Sehr großer Unterschied bei ungültigen Farben
        const rDiff = Math.abs(rgb1.r - rgb2.r);
        const gDiff = Math.abs(rgb1.g - rgb2.g);
        const bDiff = Math.abs(rgb1.b - rgb2.b);
        // Euklidische Distanz im RGB-Raum
        return Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
    }
    /**
     * Konvertiert HEX zu RGB
     */
    static hexToRgb(hex) {
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
    static buildBrandingPrompt(branding) {
        var _a, _b;
        const parts = [];
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
        }
        else if (branding.colors.palette && branding.colors.palette.length > 0) {
            parts.push(`Verwende die Farbpalette: ${branding.colors.palette.join(', ')}`);
        }
        // Schriftarten
        if ((_a = branding.fonts) === null || _a === void 0 ? void 0 : _a.style) {
            parts.push(`Verwende einen ${branding.fonts.style} Schriftstil`);
            if (branding.fonts.primary) {
                parts.push(`(ähnlich wie ${branding.fonts.primary})`);
            }
            parts.push('für Text-Elemente.');
        }
        // Stil
        if ((_b = branding.style) === null || _b === void 0 ? void 0 : _b.mood) {
            parts.push(`Der Stil soll ${branding.style.mood} sein`);
            if (branding.style.layout) {
                parts.push(`mit ${branding.style.layout} Layout`);
            }
            parts.push('.');
        }
        return parts.length > 0 ? parts.join(' ') : '';
    }
}
exports.OrganizationBrandingService = OrganizationBrandingService;
OrganizationBrandingService.API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
OrganizationBrandingService.VISION_MODEL = 'gemini-1.5-flash';
//# sourceMappingURL=organizationBrandingService.js.map
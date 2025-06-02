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
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const auth_1 = require("../middleware/auth");
// CommonJS-Stil Import für express-validator
const expressValidator = require('express-validator');
const { body, validationResult } = expressValidator;
const router = express_1.default.Router();
/**
 * POST /api/document-recognition
 * Sendet ein Bild an die OpenAI API zur Dokumentenerkennung
 */
router.post('/', [
    auth_1.authMiddleware, // Nur authentifizierte Benutzer dürfen diese API nutzen
    body('image').isString().withMessage('Bild muss als Base64-String übermittelt werden'),
    body('documentType').optional().isString()
], (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        console.log('Dokumenterkennung-Anfrage empfangen');
        // Validiere die Eingabeparameter
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('Validierungsfehler:', errors.array());
            return res.status(400).json({ errors: errors.array() });
        }
        // Prüfe, ob das Bild im Request vorhanden ist
        if (!req.body.image) {
            console.log('Kein Bild im Request gefunden');
            return res.status(400).json({ error: 'Kein Bild im Request' });
        }
        // Stelle sicher, dass ein API-Key vorhanden ist
        const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
        if (!OPENAI_API_KEY) {
            console.error('OpenAI API-Key fehlt in den Umgebungsvariablen');
            return res.status(500).json({
                error: 'Server-Konfigurationsfehler. Bitte kontaktieren Sie den Administrator.'
            });
        }
        const { image, documentType } = req.body;
        console.log('Starte Dokumentenanalyse mit OpenAI...');
        // Erstelle die Anfrage an die OpenAI API (GPT-4 Vision)
        try {
            const openaiResponse = yield axios_1.default.post('https://api.openai.com/v1/chat/completions', {
                model: "gpt-4o",
                messages: [
                    {
                        role: "system",
                        content: "Du bist ein Experte für Dokumentenerkennung. Extrahiere alle relevanten Informationen aus dem Ausweisdokument und gib die Daten in einem strukturierten JSON-Format zurück. Beachte folgende Felder: documentType (mögliche Werte: passport, national_id, driving_license, residence_permit), documentNumber, issueDate (ISO-Format YYYY-MM-DD), expiryDate (ISO-Format YYYY-MM-DD), issuingCountry, issuingAuthority."
                    },
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: `Analysiere dieses Ausweisdokument und extrahiere alle relevanten Daten in ein strukturiertes JSON-Format.${documentType ? ` Es handelt sich um ein Dokument vom Typ: ${documentType}.` : ''}`
                            },
                            {
                                type: "image_url",
                                image_url: {
                                    url: image
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 1000
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`
                }
            });
            console.log('OpenAI-Antwort erhalten');
            // Extrahiere den JSON-Teil aus der Antwort
            const aiResponse = openaiResponse.data.choices[0].message.content;
            // Versuche, JSON aus der Antwort zu extrahieren (falls die Antwort Text enthält)
            let documentData;
            try {
                // Wenn die Antwort direkt ein JSON-Objekt ist
                if (aiResponse.trim().startsWith('{')) {
                    documentData = JSON.parse(aiResponse);
                }
                else {
                    // Suche nach JSON-Code-Block in der Antwort
                    const jsonMatch = aiResponse.match(/\`\`\`json\n([\s\S]*?)\n\`\`\`/) ||
                        aiResponse.match(/\`\`\`\n([\s\S]*?)\n\`\`\`/) ||
                        aiResponse.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        documentData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
                    }
                    else {
                        throw new Error('Konnte kein JSON in der KI-Antwort finden');
                    }
                }
            }
            catch (parseError) {
                console.error('Fehler beim Parsen der KI-Antwort:', parseError);
                return res.status(500).json({
                    error: 'Fehler bei der Verarbeitung der KI-Antwort',
                    aiResponse
                });
            }
            console.log('Dokumentdaten erfolgreich extrahiert:', documentData);
            // Sende die Dokumentdaten zurück
            return res.json(documentData);
        }
        catch (openaiError) {
            console.error('Fehler bei der Anfrage an OpenAI:', openaiError.message);
            console.error('OpenAI Status:', (_a = openaiError.response) === null || _a === void 0 ? void 0 : _a.status);
            console.error('OpenAI Daten:', (_b = openaiError.response) === null || _b === void 0 ? void 0 : _b.data);
            return res.status(500).json({
                error: 'Fehler bei der Anfrage an OpenAI API',
                message: openaiError.message,
                details: (_c = openaiError.response) === null || _c === void 0 ? void 0 : _c.data
            });
        }
    }
    catch (error) {
        console.error('Allgemeiner Fehler bei der KI-Dokumentenerkennung:', error);
        return res.status(500).json({
            error: 'Fehler bei der Dokumentenerkennung',
            message: error.message
        });
    }
}));
// Einfache Test-Route ohne Auth-Middleware, um zu überprüfen, ob der Router funktioniert
router.get('/test', (req, res) => {
    res.json({ message: 'Document Recognition API ist erreichbar', timestamp: new Date().toISOString() });
});
exports.default = router;
//# sourceMappingURL=documentRecognition.js.map
import express, { Request, Response } from 'express';
import axios from 'axios';
import { authMiddleware } from '../middleware/auth';

// CommonJS-Stil Import für express-validator
const expressValidator = require('express-validator');
const { body, validationResult } = expressValidator;

const router = express.Router();

/**
 * POST /api/document-recognition
 * Sendet ein Bild an die OpenAI API zur Dokumentenerkennung
 */
router.post('/', [
  authMiddleware, // Nur authentifizierte Benutzer dürfen diese API nutzen
  body('image').isString().withMessage('Bild muss als Base64-String übermittelt werden'),
  body('documentType').optional().isString()
], async (req: Request, res: Response) => {
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
      const openaiResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Du bist ein Experte für Dokumentenerkennung. Extrahiere alle relevanten Informationen aus dem Ausweisdokument und gib die Daten in einem strukturierten JSON-Format zurück. Beachte folgende Felder: documentType (mögliche Werte: passport, national_id, driving_license, residence_permit, cedula_colombia), documentNumber, issueDate (ISO-Format YYYY-MM-DD), expiryDate (ISO-Format YYYY-MM-DD), issuingCountry, issuingAuthority, firstName, lastName, birthday (ISO-Format YYYY-MM-DD), gender (mögliche Werte: male, female, other oder null falls nicht erkennbar). Für kolumbianische Dokumente (Cédula): Extrahiere auch firstName, lastName, birthday und gender falls möglich."
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
        } else {
          // Suche nach JSON-Code-Block in der Antwort
          const jsonMatch = aiResponse.match(/\`\`\`json\n([\s\S]*?)\n\`\`\`/) || 
                            aiResponse.match(/\`\`\`\n([\s\S]*?)\n\`\`\`/) ||
                            aiResponse.match(/\{[\s\S]*\}/);
          
          if (jsonMatch) {
            documentData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
          } else {
            throw new Error('Konnte kein JSON in der KI-Antwort finden');
          }
        }
      } catch (parseError) {
        console.error('Fehler beim Parsen der KI-Antwort:', parseError);
        return res.status(500).json({ 
          error: 'Fehler bei der Verarbeitung der KI-Antwort', 
          aiResponse 
        });
      }

      console.log('Dokumentdaten erfolgreich extrahiert:', documentData);
      // Sende die Dokumentdaten zurück
      return res.json(documentData);
    } catch (openaiError: any) {
      console.error('Fehler bei der Anfrage an OpenAI:', openaiError.message);
      console.error('OpenAI Status:', openaiError.response?.status);
      console.error('OpenAI Daten:', openaiError.response?.data);
      
      return res.status(500).json({ 
        error: 'Fehler bei der Anfrage an OpenAI API',
        message: openaiError.message,
        details: openaiError.response?.data
      });
    }
  } catch (error: any) {
    console.error('Allgemeiner Fehler bei der KI-Dokumentenerkennung:', error);
    return res.status(500).json({ 
      error: 'Fehler bei der Dokumentenerkennung',
      message: error.message
    });
  }
});

// Einfache Test-Route ohne Auth-Middleware, um zu überprüfen, ob der Router funktioniert
router.get('/test', (req: Request, res: Response) => {
  res.json({ message: 'Document Recognition API ist erreichbar', timestamp: new Date().toISOString() });
});

export default router; 
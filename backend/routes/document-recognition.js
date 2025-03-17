const express = require('express');
const router = express.Router();
const axios = require('axios');
const { body, validationResult } = require('express-validator');

// Umgebungsvariable für den OpenAI API-Key (alternativ in .env Datei speichern)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/**
 * POST /api/document-recognition
 * Sendet ein Bild an die OpenAI API zur Dokumentenerkennung
 */
router.post('/', [
  body('image').isString().withMessage('Bild muss als Base64-String übermittelt werden'),
  body('documentType').optional().isString()
], async (req, res) => {
  try {
    // Validiere die Eingabeparameter
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Stelle sicher, dass ein API-Key vorhanden ist
    if (!OPENAI_API_KEY) {
      console.error('OpenAI API-Key fehlt in den Umgebungsvariablen');
      return res.status(500).json({ 
        error: 'Server-Konfigurationsfehler. Bitte kontaktieren Sie den Administrator.' 
      });
    }

    const { image, documentType } = req.body;
    
    // Erstelle die Anfrage an die OpenAI API (GPT-4 Vision)
    const openaiResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Du bist ein Experte für Dokumentenerkennung. Extrahiere alle relevanten Informationen aus dem Ausweisdokument und gib die Daten in einem strukturierten JSON-Format zurück. Beachte folgende Felder: documentType, documentNumber, issueDate, expiryDate, issuingCountry, issuingAuthority."
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
    } catch (error) {
      console.error('Fehler beim Parsen der KI-Antwort:', error);
      return res.status(500).json({ 
        error: 'Fehler bei der Verarbeitung der KI-Antwort', 
        aiResponse 
      });
    }

    // Sende die Dokumentdaten zurück
    res.json(documentData);
  } catch (error) {
    console.error('Fehler bei der KI-Dokumentenerkennung:', error);
    res.status(500).json({ 
      error: 'Fehler bei der Dokumentenerkennung',
      message: error.message
    });
  }
});

module.exports = router; 
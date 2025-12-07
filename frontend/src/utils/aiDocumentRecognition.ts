import { IdentificationDocument } from '../types/interfaces.ts';
import { API_URL } from '../config/api.ts';
import { logger } from './logger.ts';

/**
 * KI-basierte Dokumenterkennung
 * Diese Funktion sendet ein Bild an die OpenAI API (über einen einfachen Proxy)
 * und erhält strukturierte Dokumentdaten zurück
 * 
 * Kostenhinweis: Die OpenAI API ist kostenpflichtig, aber sehr günstig für diesen Anwendungsfall
 * (ca. 0,01-0,02€ pro Erkennung mit GPT-4 Vision)
 */
export const recognizeDocumentWithAI = async (imageData: string): Promise<Partial<IdentificationDocument>> => {
  try {
    logger.log('Starte KI-basierte Dokumentenerkennung...');
    
    // Überprüfe das Bild-Format
    if (!imageData.startsWith('data:image')) {
      // Wenn es kein Data-URL ist, konvertiere es
      if (imageData.startsWith('/9j/')) {
        imageData = 'data:image/jpeg;base64,' + imageData;
      } else if (imageData.startsWith('iVBOR')) {
        imageData = 'data:image/png;base64,' + imageData;
      } else {
        // Generisches Format
        imageData = 'data:image/jpeg;base64,' + imageData;
      }
    }
    
    // Hole den Auth-Token aus dem lokalen Speicher
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Nicht authentifiziert. Bitte melden Sie sich an.');
    }
    
    // Die vollständige API-URL verwenden
    const apiEndpoint = `${API_URL}/document-recognition`;
    logger.log('Verwende API-Endpunkt:', apiEndpoint);
    
    // POST-Anfrage an den API-Endpunkt (ohne nachgestellten Schrägstrich)
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include', // Cookies und Auth-Daten senden
      mode: 'cors', // Explizit CORS-Modus aktivieren
      body: JSON.stringify({ 
        image: imageData,
        // Optional weitere Parameter wie Dokumenttyp
        documentType: 'id_card' 
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API-Anfrage fehlgeschlagen: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    logger.log('KI-Ergebnis:', result);
    
    return result;
  } catch (error) {
    console.error('Fehler bei der KI-basierten Dokumentenerkennung:', error);
    
    // Bei Fehlern ein leeres Objekt zurückgeben
    return {}; 
  }
}; 
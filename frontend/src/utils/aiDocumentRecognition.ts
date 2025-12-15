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
export const recognizeDocumentWithAI = async (imageData: string): Promise<Partial<IdentificationDocument & { firstName?: string; lastName?: string; birthday?: string; gender?: string; country?: string }>> => {
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
        image: imageData
        // documentType wird nicht gesendet, damit AI den Typ automatisch erkennt
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API-Anfrage fehlgeschlagen: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    logger.log('KI-Ergebnis:', result);
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4b31729e-838f-41ed-a421-2153ac4e6c3c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'aiDocumentRecognition.ts:61',message:'AI recognition result received',data:{hasFirstName:!!result.firstName,hasLastName:!!result.lastName,hasBirthday:!!result.birthday,resultKeys:Object.keys(result),resultEmpty:Object.keys(result).length===0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    return result;
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4b31729e-838f-41ed-a421-2153ac4e6c3c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'aiDocumentRecognition.ts:65',message:'AI recognition error',data:{error:error instanceof Error?error.message:'unknown',errorType:error instanceof Error?error.constructor.name:'unknown'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    console.error('Fehler bei der KI-basierten Dokumentenerkennung:', error);
    
    // Bei Fehlern ein leeres Objekt zurückgeben
    return {}; 
  }
}; 
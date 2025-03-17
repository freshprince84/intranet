import { IdentificationDocument } from '../types/interfaces.ts';
import { getWorker, terminateWorker, recognizeImage } from './tesseractWorker.ts';

// Zeitliche Muster für verschiedene Länder
const DATE_PATTERNS = [
  // Deutsches Format: TT.MM.JJJJ
  { regex: /(\d{1,2})\.(\d{1,2})\.(\d{4})/, format: (d: string, m: string, y: string) => `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}` },
  // ISO Format: JJJJ-MM-TT
  { regex: /(\d{4})-(\d{1,2})-(\d{1,2})/, format: (y: string, m: string, d: string) => `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}` },
  // US Format: MM/TT/JJJJ
  { regex: /(\d{1,2})\/(\d{1,2})\/(\d{4})/, format: (m: string, d: string, y: string) => `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}` },
  // Kolumbianisches Format: JJJJ/MM/TT
  { regex: /(\d{4})\/(\d{1,2})\/(\d{1,2})/, format: (y: string, m: string, d: string) => `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}` },
];

// Dokumenttypen und Erkennungsmuster
const DOCUMENT_PATTERNS = {
  passport: {
    type: 'passport',
    patterns: {
      documentNumber: [/Pass\s?Nr\.?:?\s*([A-Z0-9]+)/i, /Passnummer:?\s*([A-Z0-9]+)/i, /Passport\s?No\.?:?\s*([A-Z0-9]+)/i],
      issueDate: [/Ausstellungsdatum:?\s*([\d\.\/\-]+)/i, /Date of issue:?\s*([\d\.\/\-]+)/i, /F\.\s?expedición:?\s*([\d\.\/\-]+)/i],
      expiryDate: [/Gültig bis:?\s*([\d\.\/\-]+)/i, /Expiry date:?\s*([\d\.\/\-]+)/i, /Vence:?\s*([\d\.\/\-]+)/i],
      issuingAuthority: [/Ausstellende Behörde:?\s*([^\.]+)/i, /Authority:?\s*([^\.]+)/i],
      issuingCountry: [/Staatsangehörigkeit:?\s*([A-Za-z\s]+)/i, /Nationality:?\s*([A-Za-z\s]+)/i, /Nacionalidad:?\s*([A-Za-z\s]+)/i]
    }
  },
  national_id: {
    type: 'national_id',
    patterns: {
      documentNumber: [/Ausweisnummer:?\s*([A-Z0-9]+)/i, /ID\s?No\.?:?\s*([A-Z0-9]+)/i, /No\.?\s*([0-9]+)/i],
      issueDate: [/Ausstellungsdatum:?\s*([\d\.\/\-]+)/i, /Date of issue:?\s*([\d\.\/\-]+)/i, /F\.\s?expedición:?\s*([\d\.\/\-]+)/i],
      expiryDate: [/Gültig bis:?\s*([\d\.\/\-]+)/i, /Expiry date:?\s*([\d\.\/\-]+)/i, /Vence:?\s*([\d\.\/\-]+)/i],
      issuingAuthority: [/Ausstellende Behörde:?\s*([^\.]+)/i, /Authority:?\s*([^\.]+)/i],
      issuingCountry: [/Staatsangehörigkeit:?\s*([A-Za-z\s]+)/i, /Nationality:?\s*([A-Za-z\s]+)/i, /Nacionalidad:?\s*([A-Za-z\s]+)/i]
    }
  },
  driving_license: {
    type: 'driving_license',
    patterns: {
      documentNumber: [/Führerscheinnummer:?\s*([A-Z0-9]+)/i, /License\s?No\.?:?\s*([A-Z0-9]+)/i],
      issueDate: [/Ausstellungsdatum:?\s*([\d\.\/\-]+)/i, /Date of issue:?\s*([\d\.\/\-]+)/i],
      expiryDate: [/Gültig bis:?\s*([\d\.\/\-]+)/i, /Expiry date:?\s*([\d\.\/\-]+)/i],
      issuingAuthority: [/Ausstellende Behörde:?\s*([^\.]+)/i, /Authority:?\s*([^\.]+)/i],
      issuingCountry: [/([A-Za-z]+)$/, /Nationality:?\s*([A-Za-z\s]+)/i]
    }
  },
  residence_permit: {
    type: 'residence_permit',
    patterns: {
      documentNumber: [/No\.?\s*([0-9]+)/i, /Número:?\s*([0-9]+)/i],
      issueDate: [/F\.\s?Expedición:?\s*([\d\.\/\-]+)/i, /Fecha de expedición:?\s*([\d\.\/\-]+)/i],
      expiryDate: [/Vence:?\s*([\d\.\/\-]+)/i, /Fecha de vencimiento:?\s*([\d\.\/\-]+)/i],
      issuingAuthority: [/República\s+de\s+Colombia/i, /Migración Colombia/i],
      issuingCountry: [/Colombia/i, /República\s+de\s+Colombia/i]
    }
  }
};

/**
 * Erkennt einen Datumsstring und konvertiert ihn in das ISO-Format (YYYY-MM-DD)
 */
const recognizeDate = (text: string): string | null => {
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern.regex);
    if (match) {
      // Remove the full match (at index 0) and use the capture groups
      const groups = match.slice(1) as string[];
      return pattern.format(groups[0], groups[1], groups[2]);
    }
  }
  return null;
};

/**
 * Extrahiert einen Wert aus Text basierend auf regulären Ausdrücken
 */
const extractValue = (text: string, patterns: RegExp[]): string | null => {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
};

/**
 * Erkennt den Dokumenttyp basierend auf dem erkannten Text
 */
const detectDocumentType = (text: string): string | null => {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('reisepass') || lowerText.includes('passport')) {
    return 'passport';
  }
  
  if (lowerText.includes('personalausweis') || lowerText.includes('identity card') || lowerText.includes('id card')) {
    return 'national_id';
  }
  
  if (lowerText.includes('führerschein') || lowerText.includes('driving licence') || lowerText.includes('driving license')) {
    return 'driving_license';
  }
  
  if (lowerText.includes('cédula de extranjería') || lowerText.includes('cedula de extranjeria') || 
      lowerText.includes('república de colombia') || lowerText.includes('visitante')) {
    return 'residence_permit';
  }
  
  return null;
};

/**
 * Extraktion für kolumbianische Ausweise
 */
const extractColombianID = (text: string): Partial<IdentificationDocument> => {
  console.log('Erkenne kolumbianischen Ausweis');
  
  const result: Partial<IdentificationDocument> = {
    documentType: 'residence_permit',
    issuingCountry: 'Colombia'
  };
  
  // Suche nach Dokumentnummer
  const numberMatch = text.match(/No\.\s*(\d+)/i) || text.match(/(\d{7,})/);
  if (numberMatch) {
    result.documentNumber = numberMatch[1];
    console.log('Erkannte kolumbianische ID-Nummer:', result.documentNumber);
  }
  
  // Suche nach Ausstellungsdatum (F. EXPEDICIÓN)
  const issueDateMatch = text.match(/F\.\s*EXPEDICIÓN:?\s*([\d\/]+)/i) || 
                          text.match(/EXPEDICIÓN:?\s*([\d\/]+)/i);
  if (issueDateMatch) {
    const rawDate = issueDateMatch[1];
    const dateFormatted = recognizeDate(rawDate);
    if (dateFormatted) {
      result.issueDate = dateFormatted;
      console.log('Erkanntes Ausstellungsdatum:', result.issueDate);
    }
  }
  
  // Suche nach Ablaufdatum (VENCE)
  const expiryDateMatch = text.match(/VENCE:?\s*([\d\/]+)/i);
  if (expiryDateMatch) {
    const rawDate = expiryDateMatch[1];
    const dateFormatted = recognizeDate(rawDate);
    if (dateFormatted) {
      result.expiryDate = dateFormatted;
      console.log('Erkanntes Ablaufdatum:', result.expiryDate);
    }
  }
  
  return result;
};

/**
 * Hauptfunktion für die Dokumentenerkennung
 * Verarbeitet das Bild und extrahiert strukturierte Daten
 */
export const recognizeDocument = async (imageData: string): Promise<Partial<IdentificationDocument>> => {
  try {
    // Statusanzeige im Konsolenlog
    console.log('Starte Dokumentenerkennung...');
    
    // Bildanalyse direkt mit der neuen Funktion
    const data = await recognizeImage(imageData);
    
    console.log('Bild verarbeitet. Erkannter Text:', data.text);
    
    const text = data.text;
    
    // Spezielle Erkennung für kolumbianische Dokumente
    if (text.toLowerCase().includes('colombia') || 
        text.toLowerCase().includes('cédula') || 
        text.toLowerCase().includes('extranjería') ||
        text.toLowerCase().includes('visitante')) {
      return extractColombianID(text);
    }
    
    // Dokumenttyp erkennen
    const documentType = detectDocumentType(text) || '';
    console.log('Erkannter Dokumenttyp:', documentType);
    
    // Leeres Ergebnisobjekt
    const result: Partial<IdentificationDocument> = {
      documentType
    };
    
    // Wenn wir den Dokumenttyp erkannt haben und Erkennungsmuster dafür haben
    if (documentType && DOCUMENT_PATTERNS[documentType as keyof typeof DOCUMENT_PATTERNS]) {
      const patterns = DOCUMENT_PATTERNS[documentType as keyof typeof DOCUMENT_PATTERNS].patterns;
      
      // Extrahiere Dokumentnummer
      const documentNumber = extractValue(text, patterns.documentNumber);
      if (documentNumber) {
        result.documentNumber = documentNumber;
        console.log('Erkannte Dokumentnummer:', documentNumber);
      }
      
      // Extrahiere Ausstellungsland
      const issuingCountry = extractValue(text, patterns.issuingCountry);
      if (issuingCountry) {
        result.issuingCountry = issuingCountry;
        console.log('Erkanntes Ausstellungsland:', issuingCountry);
      }
      
      // Extrahiere ausstellende Behörde
      const issuingAuthority = extractValue(text, patterns.issuingAuthority);
      if (issuingAuthority) {
        result.issuingAuthority = issuingAuthority;
        console.log('Erkannte ausstellende Behörde:', issuingAuthority);
      }
      
      // Extrahiere Ausstellungsdatum
      const issueDateText = extractValue(text, patterns.issueDate);
      if (issueDateText) {
        const issueDate = recognizeDate(issueDateText);
        if (issueDate) {
          result.issueDate = issueDate;
          console.log('Erkanntes Ausstellungsdatum:', issueDate);
        }
      }
      
      // Extrahiere Ablaufdatum
      const expiryDateText = extractValue(text, patterns.expiryDate);
      if (expiryDateText) {
        const expiryDate = recognizeDate(expiryDateText);
        if (expiryDate) {
          result.expiryDate = expiryDate;
          console.log('Erkanntes Ablaufdatum:', expiryDate);
        }
      }
    }
    
    return result;
    
  } catch (error) {
    console.error('Fehler bei der Dokumentenerkennung:', error);
    throw new Error('Die Dokumentenerkennung konnte nicht durchgeführt werden: ' + (error as Error).message);
  }
}; 
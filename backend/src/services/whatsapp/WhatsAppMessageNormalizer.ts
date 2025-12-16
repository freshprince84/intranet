/**
 * WhatsApp Message Normalizer
 * 
 * WhatsApp-spezifische Nachrichten-Normalisierung
 * Emoji-Entfernung
 * WhatsApp-Formatierung
 */
export class WhatsAppMessageNormalizer {
  /**
   * Normalisiert WhatsApp-Nachricht
   * 
   * Führt alle Normalisierungs-Schritte durch:
   * - Trim Whitespace
   * - Entfernt Emojis (optional)
   * - Normalisiert Formatierung
   * 
   * @param message - Die zu normalisierende Nachricht
   * @param removeEmojis - Optional: Emojis entfernen (Standard: false)
   * @returns Normalisierte Nachricht
   */
  static normalize(message: string, removeEmojis: boolean = false): string {
    if (!message) return '';
    
    let normalized = message.trim();
    
    // Entferne Emojis falls gewünscht
    if (removeEmojis) {
      normalized = this.removeEmojis(normalized);
    }
    
    // Normalisiere Formatierung
    normalized = this.normalizeFormatting(normalized);
    
    return normalized;
  }

  /**
   * Entfernt Emojis aus Nachricht
   * 
   * @param message - Die zu bereinigende Nachricht
   * @returns Nachricht ohne Emojis
   */
  static removeEmojis(message: string): string {
    if (!message) return '';
    
    // Emoji-Regex: Entfernt alle Emoji-Zeichen
    // Unterstützt Unicode-Emojis (U+1F300 - U+1F9FF, etc.)
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F1E0}-\u{1F1FF}]/gu;
    
    return message.replace(emojiRegex, '').trim();
  }

  /**
   * Normalisiert WhatsApp-Formatierung
   * 
   * Normalisiert:
   * - Mehrfache Leerzeichen
   * - Zeilenumbrüche
   * - Sonderzeichen
   * 
   * @param message - Die zu normalisierende Nachricht
   * @returns Normalisierte Nachricht
   */
  static normalizeFormatting(message: string): string {
    if (!message) return '';
    
    let normalized = message;
    
    // Entferne mehrfache Leerzeichen
    normalized = normalized.replace(/\s+/g, ' ');
    
    // Normalisiere Zeilenumbrüche (behalte einzelne Zeilenumbrüche, entferne mehrfache)
    normalized = normalized.replace(/\n{3,}/g, '\n\n');
    
    // Trim Whitespace am Anfang und Ende
    normalized = normalized.trim();
    
    return normalized;
  }
}

import { ConversationContext } from './MessageParserService';

/**
 * AI Config Interface
 * 
 * Konfiguration für KI-System
 */
export interface AIConfig {
  enabled?: boolean;
  model?: string;
  systemPrompt?: string;
  rules?: string[];
  sources?: string[];
  temperature?: number;
  maxTokens?: number;
}

/**
 * Prompt Builder
 * 
 * Strukturierte Prompt-Erstellung
 * Modulare Prompt-Komponenten
 * Wiederverwendbar für verschiedene Kanäle
 */
export class PromptBuilder {
  /**
   * Baut System Prompt aus modularen Komponenten
   * 
   * @param language - Sprache ('es', 'de', 'en')
   * @param context - Optional: Conversation Context
   * @param channel - Optional: Channel ('whatsapp', 'email', 'instagram', 'facebook', 'twitter')
   * @param aiConfig - Optional: AI-Konfiguration
   * @param conversationContext - Optional: Conversation Context (für Function Instructions)
   * @returns Vollständiger System Prompt
   */
  static buildPrompt(
    language: string,
    context?: ConversationContext | any,
    channel?: 'whatsapp' | 'email' | 'instagram' | 'facebook' | 'twitter',
    aiConfig?: AIConfig,
    conversationContext?: any
  ): string {
    const components: string[] = [];
    
    // WICHTIG: Sprache aus Context verwenden, falls vorhanden (für Konsistenz)
    const finalLanguage = (context && typeof context === 'object' && context.language) 
      ? context.language 
      : language;
    
    // 1. Language-Instructions (ganz am Anfang für maximale Priorität)
    const languageInstruction = this.getLanguageInstructions(finalLanguage);
    components.push(languageInstruction);
    // OPTIMIERUNG: Wiederholung entfernt - eine Anweisung reicht aus (~500-800 Tokens gespart)
    
    // 2. Basis-Prompt
    components.push(this.getBasePrompt(finalLanguage, aiConfig));
    
    // 3. Context-Instructions (dynamisch basierend auf Context)
    if (context && typeof context === 'object') {
      components.push(this.getContextInstructions(context, finalLanguage));
    }
    
    // 4. Function-Instructions (dynamisch basierend auf verfügbaren Functions)
    components.push(this.getFunctionInstructions([], finalLanguage, conversationContext || context));
    
    // 5. Channel-spezifische Instructions
    if (channel) {
      components.push(this.getChannelSpecificInstructions(channel, finalLanguage));
    }
    
    return components.join('\n\n');
  }

  /**
   * Basis-Prompt (immer vorhanden)
   * 
   * @param language - Sprache
   * @param aiConfig - Optional: AI-Konfiguration
   * @returns Basis-Prompt
   */
  private static getBasePrompt(language: string, aiConfig?: AIConfig): string {
    let prompt = aiConfig?.systemPrompt || 'Du bist ein hilfreicher Assistent.';

    // Füge Regeln hinzu
    if (aiConfig?.rules && aiConfig.rules.length > 0) {
      prompt += '\n\nRegeln:\n';
      aiConfig.rules.forEach((rule: string, index: number) => {
        prompt += `${index + 1}. ${rule}\n`;
      });
    }

    // Füge Quellen/Context hinzu (falls vorhanden)
    if (aiConfig?.sources && aiConfig.sources.length > 0) {
      prompt += '\n\nVerfügbare Quellen für Informationen:\n';
      aiConfig.sources.forEach((source: string, index: number) => {
        prompt += `${index + 1}. ${source}\n`;
      });
      prompt += '\nVerwende diese Quellen als Referenz, wenn relevant.';
    }

    return prompt;
  }

  /**
   * Context-Instructions (dynamisch basierend auf Context)
   * 
   * @param context - Conversation Context
   * @param language - Sprache
   * @returns Context-Instructions
   */
  private static getContextInstructions(context: ConversationContext, language: string): string {
    let instructions = '\n\n=== KRITISCH: KONTEXT-NUTZUNG ===\n';
    instructions += 'WICHTIG: Du MUSST ALLE Informationen aus der aktuellen UND vorherigen Nachrichten nutzen!\n';
    instructions += 'WICHTIG: Effizienz - Prüfe IMMER zuerst, ob alle Informationen bereits im Context vorhanden sind, bevor du nachfragst!\n';
    instructions += 'KRITISCH: Kontext-Informationen sind NUR für dich intern - gib sie NIEMALS direkt an den User weiter!\n';
    instructions += 'KRITISCH: Wenn User eine Frage stellt, beantworte die Frage direkt - erwähne KEINE Kontext-Informationen wie "Esa información ya está en el contexto"!\n';
    instructions += 'KRITISCH: Kontext-Informationen sind nur dazu da, dass du weißt, welche Daten bereits vorhanden sind - nutze sie für Function Calls, aber erwähne sie NICHT in deiner Antwort!\n';
    
    // Dynamische Instructions basierend auf Context (nur für interne Nutzung)
    if (context.booking) {
      if (context.booking.checkInDate) {
        instructions += `INTERN: checkInDate ist bereits im Context: ${context.booking.checkInDate} - verwende diesen Wert für Function Calls, erwähne ihn NICHT in der Antwort, es sei denn User fragt danach!\n`;
      }
      if (context.booking.checkOutDate) {
        instructions += `INTERN: checkOutDate ist bereits im Context: ${context.booking.checkOutDate} - verwende diesen Wert für Function Calls, erwähne ihn NICHT in der Antwort, es sei denn User fragt danach!\n`;
      }
      if (context.booking.guestName) {
        instructions += `INTERN: guestName ist bereits im Context: ${context.booking.guestName} - verwende diesen Wert für Function Calls, frage NICHT erneut nach Name, erwähne ihn NICHT in der Antwort, es sei denn User fragt danach!\n`;
      }
      if (context.booking.roomName) {
        instructions += `INTERN: roomName ist bereits im Context: ${context.booking.roomName} - verwende diesen Wert für Function Calls, erwähne ihn NICHT in der Antwort, es sei denn User fragt danach!\n`;
      }
    }
    
    return instructions;
  }

  /**
   * Function-Instructions (dynamisch basierend auf verfügbaren Functions)
   * 
   * @param functions - Array mit Function Definitions
   * @param language - Sprache
   * @param conversationContext - Optional: Conversation Context (für User-ID Prüfung)
   * @returns Function-Instructions
   */
  private static getFunctionInstructions(
    functions: any[],
    language: string,
    conversationContext?: any
  ): string {
    // Diese Methode wird den vollständigen Function-Instructions-Text zurückgeben
    // Da der Text sehr lang ist, wird er in separate Methoden aufgeteilt
    let prompt = '\n\nVerfügbare Funktionen:\n';
    
    // Zimmerverfügbarkeit - IMMER verfügbar
    prompt += this.getRoomAvailabilityInstructions(language);
    
    // Tour-Funktionen - IMMER verfügbar
    prompt += this.getTourInstructions(language);
    
    // Zimmer-Buchung - IMMER verfügbar
    prompt += this.getRoomReservationInstructions(language);
    
    // Andere Funktionen - nur für Mitarbeiter
    if (conversationContext?.userId) {
      prompt += this.getEmployeeInstructions(language);
    }
    
    // Allgemeine Function-Hinweise
    prompt += this.getGeneralFunctionInstructions(language);
    
    // Context-Nutzung für Buchungen
    prompt += this.getBookingContextInstructions(language);
    
    // Context-Nutzung für Touren
    prompt += this.getTourContextInstructions(language);
    
    // Allgemeine Context-Nutzung
    prompt += this.getGeneralContextInstructions(language);
    
    return prompt;
  }

  /**
   * Room Availability Instructions
   */
  private static getRoomAvailabilityInstructions(language: string): string {
    let prompt = '- check_room_availability: Prüfe Zimmerverfügbarkeit für einen Zeitraum (startDate, endDate, roomType)\n';
    prompt += '  WICHTIG: Verwende IMMER diese Function wenn der User nach Zimmerverfügbarkeit fragt!\n';
    prompt += '  WICHTIG: Rufe diese Function NICHT mehrfach auf, wenn bereits Verfügbarkeitsinformationen vorhanden sind!\n';
    prompt += '  WICHTIG: Wenn der User bereits ein Zimmer ausgewählt hat (z.B. "ja, el tia artista"), rufe diese Function NICHT erneut auf!\n';
    prompt += '  WICHTIG: Zeige ALLE verfügbaren Zimmer aus dem Function-Ergebnis an, nicht nur einige!\n';
    prompt += '  WICHTIG: Jedes Zimmer im Function-Ergebnis muss in der Antwort erwähnt werden!\n';
    prompt += '  WICHTIG: Wenn User nur "heute" sagt, verwende startDate: "today" und lasse endDate leer (zeigt nur heute, nicht heute+morgen)!\n';
    prompt += '  WICHTIG: Wenn User nur "morgen" sagt, verwende startDate: "tomorrow" und lasse endDate leer (zeigt nur morgen)!\n';
    prompt += '  WICHTIG: Terminologie beachten - IMMER in der erkannten Sprache!\n';
    
    if (language === 'es') {
      prompt += '    - Bei compartida: Verwende "camas" (beds), NICHT "habitaciones"!\n';
      prompt += '    - Bei privada: Verwende "habitaciones" (rooms), NICHT "camas"!\n';
      prompt += '    - Beispiel compartida: "4 camas disponibles" oder "1 cama disponible"\n';
      prompt += '    - Beispiel privada: "1 habitación disponible" oder "2 habitaciones disponibles"\n';
      prompt += '    - Kategorien: "Habitaciones compartidas" (nicht "Dorm-Zimmer") und "Habitaciones privadas" (nicht "Privates Zimmer")\n';
    } else if (language === 'en') {
      prompt += '    - Bei compartida: Verwende "beds", NICHT "rooms"!\n';
      prompt += '    - Bei privada: Verwende "rooms", NICHT "beds"!\n';
      prompt += '    - Beispiel compartida: "4 beds available" oder "1 bed available"\n';
      prompt += '    - Beispiel privada: "1 room available" oder "2 rooms available"\n';
      prompt += '    - Kategorien: "Shared rooms" (nicht "Dorm-Zimmer") und "Private rooms" (nicht "Privates Zimmer")\n';
    } else {
      prompt += '    - Bei compartida: Verwende "Betten", NICHT "Zimmer"!\n';
      prompt += '    - Bei privada: Verwende "Zimmer", NICHT "Betten"!\n';
      prompt += '    - Beispiel compartida: "4 Betten verfügbar" oder "1 Bett verfügbar"\n';
      prompt += '    - Beispiel privada: "1 Zimmer verfügbar" oder "2 Zimmer verfügbar"\n';
      prompt += '    - Kategorien: "Dorm-Zimmer" (compartida) und "Privates Zimmer" (privada)\n';
    }
    
    prompt += '  WICHTIG: Übersetze ALLE Begriffe aus Function Results in die erkannte Sprache!\n';
    prompt += '  WICHTIG: Wenn Function Results "Dorm-Zimmer" oder "Privates Zimmer" enthalten, übersetze diese IMMER!\n';
    prompt += '  WICHTIG: Wenn Function Results einen Fehler enthalten (error-Feld), erkläre den Fehler in der erkannten Sprache und gib hilfreiche Anweisungen!\n';
    prompt += '  WICHTIG: Bei Fehlern in Function Results: Erkläre den Fehler auf ' + (language === 'es' ? 'Spanisch' : language === 'en' ? 'Englisch' : 'Deutsch') + ' und gib dem User hilfreiche Anweisungen, was zu tun ist!\n';
    prompt += '  KRITISCH: Wenn User "dorm", "dormitory", "Schlafsaal" oder "compartida" sagt → roomType ist "compartida"! Rufe SOFORT check_room_availability mit roomType="compartida" auf, frage NICHT nochmal nach dem Typ!\n';
    prompt += '  KRITISCH: Wenn User "private", "privada", "Zimmer" oder "habitación" sagt → roomType ist "privada"! Rufe SOFORT check_room_availability mit roomType="privada" auf, frage NICHT nochmal nach dem Typ!\n';
    prompt += '  KRITISCH: Wenn roomType bereits im Context vorhanden ist (z.B. User hat "dorm" gesagt) → verwende diesen roomType und rufe check_room_availability direkt auf, frage NICHT nochmal nach dem Typ!\n';
    prompt += '  Beispiele:\n';
    prompt += '    - "tienen habitacion para hoy?" → check_room_availability({ startDate: "today" })\n';
    prompt += '    - "Haben wir Zimmer frei morgen?" → check_room_availability({ startDate: "tomorrow" })\n';
    prompt += '    - "Haben wir Zimmer frei vom 1.2. bis 3.2.?" → check_room_availability({ startDate: "2025-02-01", endDate: "2025-02-03" })\n';
    prompt += '    - "gibt es Dorm-Zimmer frei?" → check_room_availability({ startDate: "today", roomType: "compartida" })\n';
    prompt += '    - "¿tienen habitaciones privadas disponibles?" → check_room_availability({ startDate: "today", roomType: "privada" })\n';
    prompt += '    - "do you have rooms for tonight?" → check_room_availability({ startDate: "today" })\n';
    prompt += '    - User sagt "dorm" → check_room_availability({ startDate: "today", roomType: "compartida" }) - NICHT nach Typ fragen!\n';
    
    return prompt;
  }

  /**
   * Tour Instructions
   */
  private static getTourInstructions(language: string): string {
    let prompt = '\n- get_tours: Hole verfügbare Touren (type, availableFrom, availableTo, limit)\n';
    prompt += '  WICHTIG: Verwende diese Function wenn der User nach Touren fragt!\n';
    prompt += '  WICHTIG: Diese Function zeigt eine Liste aller verfügbaren Touren\n';
    prompt += '  KRITISCH: Bei get_tours() NUR Flyer-Bilder senden, ABSOLUT KEINEN Text!\n';
    prompt += '  KRITISCH: Jede Tour hat ein imageUrl-Feld - verwende dieses als Flyer-Bild!\n';
    prompt += '  KRITISCH: Format für Flyer-Bilder: ![Tour-Titel](/api/tours/{tourId}/image) - verwende IMMER /api/tours/{tourId}/image als URL!\n';
    prompt += '  KRITISCH: Deine Antwort muss NUR Markdown-Bildreferenzen enthalten, KEINEN anderen Text!\n';
    prompt += '  KRITISCH: Beispiel für get_tours() Antwort: ![Comuna 13](/api/tours/1/image)\\n![Guatapé](/api/tours/2/image)\\n![Tour 3](/api/tours/3/image)\n';
    prompt += '  KRITISCH: KEINE Tour-Namen als Text, KEINE Beschreibungen, KEINE Preise - NUR die Bildreferenzen!\n';
    prompt += '  KRITISCH: Der Text wird automatisch nach den Bildern hinzugefügt, du musst NICHTS schreiben!\n';
    prompt += '  KRITISCH: Wenn User bereits eine Tour gewählt hat (z.B. "die 2.", "guatape", "tour 2"), rufe diese Function NICHT nochmal auf!\n';
    prompt += '  KRITISCH: Wenn User nach get_tours() eine Tour wählt, rufe stattdessen book_tour() auf!\n';
    prompt += '  KRITISCH: Liste NICHT alle Touren nochmal auf, wenn User bereits eine Tour gewählt hat!\n';
    prompt += '  Beispiele:\n';
    prompt += '    - "welche touren gibt es?" → get_tours({})\n';
    prompt += '    - "zeige mir alle touren" → get_tours({})\n';
    prompt += '    - "¿qué tours tienen disponibles?" → get_tours({})\n';
    prompt += '    - User sagt "die 2." nach get_tours() → NICHT get_tours() nochmal, sondern book_tour()!\n';
    
    prompt += '\n- get_tour_details: Hole detaillierte Informationen zu einer Tour (tourId)\n';
    prompt += '  WICHTIG: Verwende diese Function wenn der User Details zu einer spezifischen Tour wissen möchte!\n';
    prompt += '  WICHTIG: Diese Function gibt imageUrl (Hauptbild) und galleryUrls (Galerie-Bilder) zurück!\n';
    prompt += '  KRITISCH: Bei get_tour_details() NUR Bilder senden (Hauptbild + alle Galerie-Bilder), ABSOLUT KEINEN Text!\n';
    prompt += '  KRITISCH: Wenn imageUrl vorhanden ist, füge IMMER das Hauptbild ein: ![Tour-Name](imageUrl)\n';
    prompt += '  KRITISCH: Wenn galleryUrls vorhanden sind, füge ALLE Galerie-Bilder ein: ![Bild 1](galleryUrls[0])\\n![Bild 2](galleryUrls[1])\\n![Bild 3](galleryUrls[2])\n';
    prompt += '  KRITISCH: Format für Bilder: ![Tour-Titel](/api/tours/{tourId}/image) und ![Galerie-Bild](/api/tours/{tourId}/gallery/{index})\n';
    prompt += '  KRITISCH: Deine Antwort muss NUR Markdown-Bildreferenzen enthalten, KEINEN anderen Text!\n';
    prompt += '  KRITISCH: Beispiel für get_tour_details() Antwort: ![Guatapé](/api/tours/2/image)\\n![Galerie 1](/api/tours/2/gallery/0)\\n![Galerie 2](/api/tours/2/gallery/1)\n';
    prompt += '  KRITISCH: KEINE Tour-Namen als Text, KEINE Beschreibungen, KEINE Details - NUR die Bildreferenzen!\n';
    prompt += '  KRITISCH: Der Text wird automatisch nach den Bildern hinzugefügt, du musst NICHTS schreiben!\n';
    prompt += '  Beispiele:\n';
    prompt += '    - "zeige mir details zu tour 1" → get_tour_details({ tourId: 1 })\n';
    prompt += '    - "was ist in tour 5 inkludiert?" → get_tour_details({ tourId: 5 })\n';
    prompt += '    - "gibt es bilder zu tour 2?" → get_tour_details({ tourId: 2 })\n';
    
    prompt += '\n- book_tour: Erstelle eine Tour-Buchung (tourId, tourDate, numberOfParticipants, customerName, customerPhone/customerEmail)\n';
    prompt += '  WICHTIG: Verwende diese Function wenn der User eine Tour buchen möchte!\n';
    prompt += '  WICHTIG: Generiert automatisch Payment Link und setzt Zahlungsfrist (1 Stunde)\n';
    prompt += '  WICHTIG: Diese Function darf NUR aufgerufen werden, wenn ALLE erforderlichen Daten vorhanden sind!\n';
    prompt += '  WICHTIG: Wenn Daten fehlen (z.B. kein Name, kein Datum), rufe NICHT diese Function auf, sondern FRAGE nach fehlenden Daten!\n';
    prompt += '  WICHTIG: Wenn User "morgen" sagt, verwende "tomorrow" als tourDate!\n';
    prompt += '  WICHTIG: Wenn User "die 2." sagt nach get_tours(), ist das tourId=2 (die zweite Tour aus der Liste)!\n';
    prompt += '  WICHTIG: Wenn User Tour-Namen sagt (z.B. "Guatapé"), finde tourId aus vorheriger get_tours() Response!\n';
    prompt += '  WICHTIG: Nutze Kontext aus vorherigen Nachrichten! Wenn User vorher get_tours() aufgerufen hat, behalte die Tour-Liste im Kontext!\n';
    prompt += '  WICHTIG: Wenn User "die 2., guatape. für morgen. für 2 personen" sagt, interpretiere: tourId=2 (aus get_tours()), tourDate="tomorrow", numberOfParticipants=2!\n';
    prompt += '  WICHTIG: Wenn customerName fehlt → FRAGE nach dem Namen, rufe Function NICHT auf!\n';
    prompt += '  WICHTIG: Wenn tourDate fehlt → FRAGE nach dem Datum, rufe Function NICHT auf!\n';
    prompt += '  WICHTIG: Wenn numberOfParticipants fehlt → FRAGE nach der Anzahl, rufe Function NICHT auf!\n';
    prompt += '  KRITISCH: Wenn User nach get_tours() eine Tour wählt (z.B. "die 2.", "guatape", "tour 2"), rufe SOFORT book_tour() auf, NICHT get_tours() nochmal!\n';
    prompt += '  KRITISCH: NIEMALS get_tours() nochmal aufrufen, wenn User bereits eine Tour gewählt hat!\n';
    prompt += '  KRITISCH: Wenn User "die 2. guatape. für morgen" sagt, hat er eine Tour gewählt → rufe book_tour() auf, liste NICHT alle Touren nochmal auf!\n';
    prompt += '  Beispiele:\n';
    prompt += '    - "ich möchte tour 1 für morgen buchen" → book_tour({ tourId: 1, tourDate: "tomorrow", numberOfParticipants: 1, customerName: "Max Mustermann", customerPhone: "+573001234567" })\n';
    prompt += '    - "reservar tour 3 para mañana" → book_tour({ tourId: 3, tourDate: "tomorrow", numberOfParticipants: 1, customerName: "Juan Pérez", customerEmail: "juan@example.com" })\n';
    prompt += '    - "die 2., guatape. für morgen. für 2 personen" → book_tour({ tourId: 2, tourDate: "tomorrow", numberOfParticipants: 2, customerName: "Max Mustermann", customerPhone: "+573001234567" })\n';
    prompt += '    - User sagt "die 2." nach get_tours() → tourId=2 (aus vorheriger Response), rufe book_tour() auf, NICHT get_tours() nochmal!\n';
    prompt += '    - User sagt "Guatapé" → finde tourId aus get_tours() Response (z.B. tourId=2), rufe book_tour() auf, NICHT get_tours() nochmal!\n';
    
    return prompt;
  }

  /**
   * Room Reservation Instructions
   */
  private static getRoomReservationInstructions(language: string): string {
    // Diese Methode enthält den vollständigen Text für create_room_reservation Instructions
    // Da der Text sehr lang ist, wird er hier gekürzt dargestellt
    // In der tatsächlichen Implementierung würde hier der vollständige Text stehen
    let prompt = '\n- create_room_reservation: Erstelle eine Zimmer-Reservation (checkInDate, checkOutDate, guestName, roomType, categoryId optional)\n';
    prompt += '  WICHTIG: Verwende diese Function wenn der User ein ZIMMER buchen möchte (NICHT für Touren)!\n';
    prompt += '  WICHTIG: Unterscheide klar zwischen ZIMMER (create_room_reservation) und TOUREN (book_tour)!\n';
    prompt += '  WICHTIG: Wenn der User "reservar", "buchen", "buche", "buche mir", "reservame", "ich möchte buchen", "ich möchte reservieren", "quiero reservar", "quiero hacer una reserva" sagt → create_room_reservation!\n';
    prompt += '  WICHTIG: Wenn User "buche [Zimmer-Name]" oder "quiero reservar [Zimmer-Name]" sagt (z.B. "buche el abuelo viajero", "quiero reservar una doble estándar"), erkenne dies als Buchungsanfrage!\n';
    prompt += '  WICHTIG: Wenn User "buche [Zimmer-Name] von [Datum] auf [Datum] für [Name]" sagt, hat er ALLE Informationen - rufe SOFORT create_room_reservation auf!\n';
    prompt += '  WICHTIG: Wenn User einen Zimmer-Namen sagt (z.B. "doble estándar", "apartamento doble", "primo deportista"), erkenne dies IMMER als Zimmer-Name aus der Verfügbarkeitsliste, NICHT als sozialen Begriff!\n';
    prompt += '  WICHTIG: Zimmer-Namen aus Verfügbarkeitsliste: "doble estándar", "doble básica", "doble deluxe", "apartamento doble", "apartamento singular", "apartaestudio", "primo deportista", "el primo aventurero", "la tia artista", "el abuelo viajero"!\n';
    prompt += '  WICHTIG: Terminologie - Wenn du Dorm-Zimmer (compartida) auflistest, verwende "Dorm-Zimmer" oder "Schlafsaal" in der Frage, NICHT "Bett"! Beispiel: "Welches Dorm-Zimmer möchten Sie buchen?" oder "Welchen Schlafsaal möchten Sie buchen?" statt "welches Bett"!\n';
    prompt += '  KRITISCH: Wenn User "dorm", "dormitory", "Schlafsaal" oder "compartida" sagt → roomType ist "compartida"! Rufe SOFORT check_room_availability mit roomType="compartida" auf, frage NICHT nochmal nach dem Typ!\n';
    prompt += '  KRITISCH: Wenn User "private", "privada", "Zimmer" oder "habitación" sagt → roomType ist "privada"! Rufe SOFORT check_room_availability mit roomType="privada" auf, frage NICHT nochmal nach dem Typ!\n';
    prompt += '  KRITISCH: Wenn roomType bereits im Context vorhanden ist (z.B. User hat "dorm" gesagt) → verwende diesen roomType und rufe check_room_availability direkt auf, frage NICHT nochmal nach dem Typ!\n';
    prompt += '  WICHTIG: Wenn der User eine Nummer wählt (z.B. "2.") nach Verfügbarkeitsanzeige → create_room_reservation mit categoryId!\n';
    prompt += '  WICHTIG: Wenn der User einen Zimmer-Namen sagt (z.B. "la tia artista", "el primo aventurero", "el abuelo viajero") → finde die categoryId aus der vorherigen check_room_availability Response!\n';
    prompt += '  WICHTIG: Wenn User in vorheriger Nachricht "heute" gesagt hat → verwende "today" als checkInDate!\n';
    prompt += '  WICHTIG: Wenn User "von heute auf morgen" sagt → checkInDate="today", checkOutDate="tomorrow"!\n';
    prompt += '  WICHTIG: Wenn User "para mañana" + "1 noche" sagt, dann: checkInDate="tomorrow", checkOutDate="day after tomorrow"!\n';
    prompt += '  WICHTIG: Wenn User "04/12" oder "04.12" sagt, erkenne dies als Datum (04. Dezember, aktuelles Jahr)!\n';
    prompt += '  WICHTIG: Wenn User nach Buchung Daten gibt (z.B. "01.dez bis 02.dez") → rufe create_room_reservation auf, NICHT check_room_availability!\n';
    prompt += '  WICHTIG: Alle Reservierungen sind Branch-spezifisch (Branch wird automatisch aus Context verwendet)\n';
    prompt += '  WICHTIG: Reservierungsablauf - KRITISCH BEACHTEN:\n';
    prompt += '    1. Wenn User erste Buchungsinformationen gibt (Check-in, Check-out, Zimmer) ABER noch nicht ALLE Daten hat (z.B. kein Name, keine categoryId) → rufe create_potential_reservation() auf\n';
    prompt += '    2. FRAGE IMMER nach fehlenden Daten (z.B. "Wie lautet Ihr vollständiger Name?" oder "Für welches Zimmer möchten Sie buchen?")\n';
    prompt += '    3. create_room_reservation() darf NUR aufgerufen werden, wenn ALLE erforderlichen Daten vorhanden sind: checkInDate, checkOutDate, guestName (vollständiger Name), roomType, categoryId\n';
    prompt += '    4. Wenn guestName fehlt → rufe create_potential_reservation() auf und FRAGE nach dem Namen!\n';
    prompt += '    5. Wenn categoryId fehlt → rufe create_potential_reservation() auf und FRAGE nach dem Zimmer!\n';
    prompt += '  WICHTIG: create_potential_reservation() erstellt sofort eine Reservation mit Status "potential" (ohne LobbyPMS-Buchung, guestName optional)\n';
    prompt += '  WICHTIG: create_room_reservation() ändert Status von "potential" auf "confirmed" (keine neue Reservation) und erstellt LobbyPMS-Buchung (guestName ERFORDERLICH!)\n';
    prompt += '  WICHTIG: Payment-Link wird mit Betrag + 5% erstellt (automatisch in boldPaymentService)\n';
    prompt += '  WICHTIG: Wenn User direkt ALLE Daten gibt (Check-in, Check-out, Zimmer, Name) → rufe SOFORT create_room_reservation() auf (keine "potential" Reservation nötig)\n';
    prompt += '  WICHTIG: NIEMALS create_room_reservation() aufrufen, wenn guestName fehlt! Immer erst create_potential_reservation() und dann nachfragen!\n';
    prompt += '  WICHTIG: Nach create_room_reservation() - KRITISCH BEACHTEN:\n';
    prompt += '    1. Das Return-Objekt enthält: paymentLink, checkInLink (kann null sein), checkInDate, checkOutDate, guestName, amount, currency\n';
    prompt += '    2. DU MUSST eine vollständige Nachricht generieren mit:\n';
    prompt += '       - Reservierungsbestätigung (Gast-Name, Zimmer, Check-in/Check-out Datum)\n';
    prompt += '       - Payment-Link (immer vorhanden, aus paymentLink)\n';
    prompt += '       - Check-in-Link NUR wenn checkInLink NICHT null ist! Wenn checkInLink null ist, erwähne KEINEN Check-in-Link!\n';
    prompt += '       - Hinweis für Check-in: "Falls Ankunft nach 18:00 (NICHT 22:00!), bitte Check-in-Link vor Ankunft erledigen, damit PIN-Code zugesendet wird" - NUR wenn checkInLink vorhanden ist!\n';
    prompt += '       - Zahlungsfrist: "Bitte zahlen Sie innerhalb von 1 Stunde, sonst wird die Reservierung automatisch storniert"\n';
    prompt += '    3. Verwende IMMER 18:00 (NICHT 22:00!) für den Ankunfts-Hinweis!\n';
    prompt += '    4. KRITISCH: Wenn checkInLink null ist, schreibe KEINE Nachricht über Check-in-Link! KEINE widersprüchlichen Nachrichten wie "Check-in-Link nicht vorhanden"!\n';
    prompt += '    5. KRITISCH: Wenn checkInLink vorhanden ist, zeige den Link und den Hinweis für 18:00!\n';
    prompt += '    6. Die Nachricht muss in der erkannten Sprache sein (Spanisch/Deutsch/Englisch) - IMMER konsistent, KEIN Sprach-Wechsel!\n';
    prompt += '  Beispiele:\n';
    prompt += '    - "reservame 1 cama en el primo aventurero für heute, 1 nacht" → create_room_reservation({ checkInDate: "today", checkOutDate: "tomorrow", guestName: "Max Mustermann", roomType: "compartida", categoryId: 34280 })\n';
    prompt += '    - "ich möchte das Zimmer 2 buchen vom 1.12. bis 3.12." → create_room_reservation({ checkInDate: "2025-12-01", checkOutDate: "2025-12-04", guestName: "Max Mustermann", roomType: "compartida", categoryId: 34281 })\n';
    prompt += '    - "reservar habitación privada bis zum 3.12." → create_room_reservation({ checkInDate: "today", checkOutDate: "2025-12-04", guestName: "Juan Pérez", roomType: "privada" })\n';
    prompt += '    - "heute buchen" → FRAGE: "Für wie viele Nächte möchten Sie buchen?" oder "Bis wann möchten Sie bleiben?" (checkOutDate ist erforderlich!)\n';
    
    return prompt;
  }

  /**
   * Employee Instructions (nur für Mitarbeiter)
   */
  private static getEmployeeInstructions(language: string): string {
    let prompt = '- get_requests: Hole Requests basierend auf Filtern (status, dueDate) - NUR für Mitarbeiter\n';
    prompt += '- get_todos: Hole Todos/Tasks basierend auf Filtern (status, dueDate) - NUR für Mitarbeiter\n';
    prompt += '- get_worktime: Hole Arbeitszeiten für einen User (date, startDate, endDate) - NUR für Mitarbeiter\n';
    prompt += '- get_cerebro_articles: Hole Cerebro-Artikel basierend auf Suchbegriffen oder Tags - NUR für Mitarbeiter\n';
    prompt += '- get_user_info: Hole User-Informationen (Name, Email, Rollen) - NUR für Mitarbeiter\n';
    prompt += '\nWICHTIG: Wenn der User nach seiner Identität fragt (z.B. "quien soy", "who am I", "wer bin ich", "dime quien soy", "cuál es mi nombre"), rufe IMMER get_user_info() auf!\n';
    prompt += '\nBeispiele für Mitarbeiter-Funktionen:';
    prompt += '\n  - "quien soy" / "who am I" / "wer bin ich" → get_user_info()';
    prompt += '\n  - "solicitudes abiertas de hoy" → get_requests({ status: "approval", dueDate: "today" })';
    prompt += '\n  - "wie lange habe ich heute gearbeitet" → get_worktime({ date: "today" })';
    prompt += '\n  - "welche cerebro artikel gibt es zu notfällen" → get_cerebro_articles({ tags: ["notfall"] })';
    
    return prompt;
  }

  /**
   * General Function Instructions
   */
  private static getGeneralFunctionInstructions(language: string): string {
    let prompt = '\n\nWICHTIG: Wenn der User nach Zimmerverfügbarkeit fragt, verwende IMMER check_room_availability!';
    prompt += '\nWICHTIG: Wenn der User nach Touren fragt, verwende IMMER get_tours oder get_tour_details!';
    prompt += '\nWICHTIG: Wenn der User eine Tour buchen möchte, verwende IMMER book_tour!';
    prompt += '\nWICHTIG: Wenn der User ein ZIMMER buchen möchte (z.B. "reservar", "buchen", "buche", "buche mir", "reservame", "ich möchte buchen", "ich möchte reservieren"), verwende IMMER create_room_reservation!';
    prompt += '\nWICHTIG: Unterscheide klar zwischen TOUR-Buchung (book_tour) und ZIMMER-Buchung (create_room_reservation)!';
    prompt += '\nWICHTIG: Wenn User nach get_tours() eine Nummer wählt (z.B. "2."), ist das IMMER eine Tour-ID, NICHT eine Zimmer-Nummer!';
    prompt += '\nWICHTIG: Wenn User nach check_room_availability() eine Nummer wählt (z.B. "2."), ist das IMMER eine Zimmer-categoryId, NICHT eine Tour-ID!';
    prompt += '\nWICHTIG: Wenn User "buche [Zimmer-Name]" sagt (z.B. "buche el abuelo viajero"), erkenne dies als vollständige Buchungsanfrage und rufe create_room_reservation auf!';
    prompt += '\nWICHTIG: Wenn User "buche [Zimmer-Name] von [Datum] auf [Datum] für [Name]" sagt, hat er ALLE Informationen gegeben - rufe SOFORT create_room_reservation auf!';
    prompt += '\nWICHTIG: Unterscheide klar zwischen ZIMMER (create_room_reservation) und TOUREN (book_tour)!';
    prompt += '\nWICHTIG: Wenn der User eine Nummer wählt (z.B. "2.") nach Verfügbarkeitsanzeige, prüfe ob ALLE Daten vorhanden sind (Name, Check-in, Check-out). Wenn Name fehlt → create_potential_reservation() und FRAGE nach Name!';
    prompt += '\nWICHTIG: Wenn der User sagt "reservame 1 cama" oder "buche mir 1 bett" oder ähnlich, prüfe ob ALLE Daten vorhanden sind. Wenn Name fehlt → create_potential_reservation() und FRAGE nach Name!';
    prompt += '\nWICHTIG: Wenn User einen Zimmer-Namen sagt (z.B. "la tia artista"), finde die categoryId aus der vorherigen check_room_availability Response. Wenn Name fehlt → create_potential_reservation() und FRAGE nach Name!';
    prompt += '\nWICHTIG: Fehlerbehandlung - Wenn Zimmer-Name nicht in Verfügbarkeitsliste gefunden wird, frage: "Dieses Zimmer ist nicht verfügbar. Möchten Sie ein anderes Zimmer wählen?" und zeige verfügbare Alternativen!';
    prompt += '\nWICHTIG: Wenn User in vorheriger Nachricht "heute" gesagt hat, verwende "today" als checkInDate!';
    prompt += '\nWICHTIG: Wenn User nach einer Buchungsanfrage Daten gibt (z.B. "01.dez bis 02.dez"), prüfe ob ALLE Daten vorhanden sind. Wenn Name fehlt → create_potential_reservation() und FRAGE nach Name!';
    prompt += '\nWICHTIG: Beispiel: User sagt "apartamento doble para el 7. de diciembre entonces. 1 noche" → Name fehlt! → rufe create_potential_reservation() auf und FRAGE: "Wie lautet Ihr vollständiger Name?"';
    prompt += '\nAntworte NICHT, dass du keinen Zugriff hast - nutze stattdessen die Function!';
    prompt += '\nWICHTIG: Wenn check_room_availability mehrere Zimmer zurückgibt, zeige ALLE Zimmer in der Antwort an!';
    prompt += '\nWICHTIG: Jedes Zimmer im Function-Ergebnis (rooms Array) muss in der Antwort erwähnt werden!';
    prompt += '\nWICHTIG: Wenn get_tours mehrere Touren zurückgibt, sende ALLE Flyer-Bilder (ein Bild pro Tour)!';
    
    return prompt;
  }

  /**
   * Booking Context Instructions
   */
  private static getBookingContextInstructions(language: string): string {
    let prompt = '\n\n=== KRITISCH: KONTEXT-NUTZUNG ===';
    prompt += '\nWICHTIG: Du MUSST ALLE Informationen aus der aktuellen UND vorherigen Nachrichten nutzen!';
    prompt += '\nWICHTIG: Effizienz - Prüfe IMMER zuerst, ob alle Informationen bereits im Context vorhanden sind, bevor du nachfragst! Kombiniere alle verfügbaren Informationen aus Context und aktueller Nachricht!';
    prompt += '\nWICHTIG: Wenn User in einer vorherigen Nachricht "heute" gesagt hat, verwende es IMMER als checkInDate!';
    prompt += '\nWICHTIG: Datumsbestätigung - Wenn User "heute" sagt, bestätige das konkrete Datum explizit in deiner Antwort! Beispiel: "Gerne, für den [Datum]. Welche Art von Zimmer suchen Sie?"';
    prompt += '\nWICHTIG: Wenn User in einer vorherigen Nachricht "checkin 02.12. und checkout 03.12." gesagt hat, verwende diese Daten IMMER!';
    prompt += '\nWICHTIG: Wenn User in einer vorherigen Nachricht einen Zimmer-Namen gesagt hat (z.B. "el abuelo viajero"), behalte diesen IMMER im Kontext!';
    prompt += '\nWICHTIG: Wenn User in einer vorherigen Nachricht "dorm" oder "privada" gesagt hat, behalte diese Information IMMER!';
    prompt += '\nWICHTIG: Wenn User in einer vorherigen Nachricht einen Namen gesagt hat (z.B. "Patrick Ammann"), verwende diesen als guestName!';
    prompt += '\nWICHTIG: Namensabfrage optimieren - Wenn Name bereits im Context vorhanden ist (z.B. User hat "Patrick Ammann" in vorheriger Nachricht gesagt), frage: "Ist Patrick Ammann Ihr vollständiger Name?" statt "Wie lautet Ihr vollständiger Name?"!';
    prompt += '\nWICHTIG: Wenn User den bereits genannten Namen bestätigt (z.B. "ja" oder "genau"), verwende diesen Namen direkt für die Buchung, frage NICHT nochmal!';
    prompt += '\nWICHTIG: Kombiniere Informationen aus MEHREREN Nachrichten! Wenn User "heute" sagt und später "1 nacht", dann: checkInDate="today", checkOutDate="tomorrow"!';
    prompt += '\nWICHTIG: Wenn User "1" sagt nachdem er "heute" gesagt hat, interpretiere es als "1 Nacht"!';
    prompt += '\nWICHTIG: Wenn User strukturierte Antworten gibt (z.B. "1. hoy, 02/12. 3. 1 4. sara"), interpretiere: 1. = Check-in, 3. = Nächte, 4. = Name!';
    prompt += '\nWICHTIG: Wenn User widersprüchliche Informationen gibt (z.B. erst "sí" dann "para mañana"), verwende IMMER die LETZTE/NEUESTE Information!';
    prompt += '\nWICHTIG: Wenn User "ja" sagt nachdem du eine Frage gestellt hast, interpretiere es als Bestätigung deiner Vorschläge!';
    prompt += '\nWICHTIG: Wenn User "ja", "sí", "yes" sagt nachdem du eine Frage gestellt hast, interpretiere es als Bestätigung und führe die Aktion aus!';
    prompt += '\nWICHTIG: Wenn User "ja, ich bestätige, bitte buchen" oder "ja ich möchte buchen" oder "sí, quiero reservar" sagt, rufe SOFORT create_room_reservation auf!';
    prompt += '\nWICHTIG: Wenn User "ja" oder "sí" sagt nachdem du eine Buchungsbestätigung gefragt hast (z.B. "Möchten Sie buchen?"), rufe SOFORT create_room_reservation auf!';
    prompt += '\nWICHTIG: Wenn User "sí" sagt, verliere NICHT den Kontext! Nutze die Informationen aus vorherigen Nachrichten und führe die Buchung aus!';
    prompt += '\nWICHTIG: Wenn User "ok, buchen" oder "ok, reservar" sagt und ALLE Informationen vorhanden sind, rufe SOFORT create_room_reservation auf!';
    prompt += '\nWICHTIG: checkOutDate ist ERFORDERLICH und muss mindestens 1 Tag nach checkInDate liegen! "heute bis heute" gibt es NICHT!';
    prompt += '\nWICHTIG: Wenn User nur "heute" sagt ohne Check-out, frage: "Für wie viele Nächte möchten Sie buchen?" oder "Bis wann möchten Sie bleiben?"';
    prompt += '\nWICHTIG: "bis zum 3." bedeutet Check-out am 4. (Check-out ist immer am Morgen des nächsten Tages)! Wenn User "bis zum 3.12." sagt, verwende checkOutDate: "2025-12-04"!';
    prompt += '\nWICHTIG: "1 Nacht" bedeutet: Check-out ist 1 Tag nach Check-in! Wenn Check-in "heute" und User sagt "1 Nacht", dann checkOutDate: "tomorrow"!';
    prompt += '\nWICHTIG: "von heute auf morgen" bedeutet: checkInDate="today", checkOutDate="tomorrow"!';
    prompt += '\nWICHTIG: "von [Datum] auf [Datum]" bedeutet: checkInDate=[erstes Datum], checkOutDate=[zweites Datum]!';
    prompt += '\nWICHTIG: Wenn User "02.12.25 bis 03.12.25" sagt, bedeutet das: checkInDate="2025-12-02", checkOutDate="2025-12-04" (Check-out ist am Morgen des 4.12.)!';
    prompt += '\nWICHTIG: Wenn User "para mañana" sagt und "1 noche" oder "una noche", bedeutet das: checkInDate="tomorrow", checkOutDate="day after tomorrow" (übermorgen)!';
    prompt += '\nWICHTIG: Datum-Formate erkennen: "04/12", "04.12", "04-12" = 04. Dezember (aktuelles Jahr)! Wenn User "04/12" sagt nach Check-in, ist das das Check-out Datum!';
    prompt += '\nWICHTIG: Wenn User "04/12" sagt und Check-in bereits "mañana" ist, dann: checkInDate="tomorrow", checkOutDate="2025-12-04"!';
    prompt += '\nWICHTIG: Wenn User nur "reservar" sagt (ohne weitere Details), aber bereits Zimmer und Daten in vorherigen Nachrichten genannt hat, rufe create_room_reservation mit diesen Informationen auf!';
    prompt += '\nWICHTIG: Wenn User "reservar" sagt und alle Informationen vorhanden sind (Zimmer-Name, Daten, Name), rufe create_room_reservation direkt auf, frage NICHT nach Details!';
    prompt += '\nWICHTIG: Wenn User "ok, buchen" sagt und du bereits alle Informationen hast (Check-in, Check-out, Zimmer, Name), rufe create_room_reservation SOFORT auf!';
    prompt += '\nWICHTIG: Zeige NICHT nochmal Verfügbarkeit, wenn User bereits "buchen" oder "reservar" gesagt hat! Rufe direkt create_room_reservation auf!';
    
    return prompt;
  }

  /**
   * Tour Context Instructions
   */
  private static getTourContextInstructions(language: string): string {
    let prompt = '\n\n=== KRITISCH: KONTEXT-NUTZUNG FÜR TOUREN ===';
    prompt += '\nWICHTIG: Du MUSST ALLE Informationen aus der aktuellen UND vorherigen Nachrichten nutzen!';
    prompt += '\nWICHTIG: Wenn User in einer vorherigen Nachricht get_tours() aufgerufen hat, behalte die Tour-Liste im Kontext!';
    prompt += '\nWICHTIG: Wenn User "die 2." sagt nach get_tours(), ist das tourId=2 (die zweite Tour aus der Liste)!';
    prompt += '\nWICHTIG: Wenn User Tour-Namen sagt (z.B. "Guatapé"), finde tourId aus der vorherigen get_tours() Response!';
    prompt += '\nWICHTIG: Wenn User "morgen" sagt, verwende IMMER "tomorrow" als tourDate!';
    prompt += '\nWICHTIG: Wenn User "für 2 personen" sagt, ist das numberOfParticipants=2!';
    prompt += '\nWICHTIG: Kombiniere Informationen aus MEHREREN Nachrichten! Wenn User "die 2." sagt und später "für morgen", dann: tourId=2, tourDate="tomorrow"!';
    prompt += '\nWICHTIG: Wenn User "die 2., guatape. für morgen. für 2 personen" sagt, hat er ALLE Informationen - rufe SOFORT book_tour auf!';
    prompt += '\nWICHTIG: Wenn User nur "die 2." sagt nach get_tours(), aber Name oder Datum fehlt → FRAGE nach fehlenden Daten, rufe book_tour NICHT auf!';
    prompt += '\nWICHTIG: Unterscheide klar zwischen TOUR-Buchung (book_tour) und ZIMMER-Buchung (create_room_reservation)!';
    prompt += '\nWICHTIG: Wenn User nach get_tours() eine Nummer wählt (z.B. "2."), ist das IMMER eine Tour-ID, NICHT eine Zimmer-Nummer!';
    prompt += '\nWICHTIG: Wenn User nach check_room_availability() eine Nummer wählt (z.B. "2."), ist das IMMER eine Zimmer-categoryId, NICHT eine Tour-ID!';
    prompt += '\nKRITISCH: Wenn User nach get_tours() eine Tour wählt (z.B. "die 2.", "guatape", "tour 2"), rufe SOFORT book_tour() auf, NICHT get_tours() nochmal!';
    prompt += '\nKRITISCH: NIEMALS get_tours() nochmal aufrufen, wenn User bereits eine Tour gewählt hat!';
    prompt += '\nKRITISCH: Liste NICHT alle Touren nochmal auf, wenn User bereits eine Tour gewählt hat!';
    prompt += '\nKRITISCH: Wenn User "die 2. guatape. für morgen" sagt, hat er eine Tour gewählt → rufe book_tour() auf, liste NICHT alle Touren nochmal auf!';
    
    return prompt;
  }

  /**
   * General Context Instructions
   */
  private static getGeneralContextInstructions(language: string): string {
    let prompt = '\n\n=== ALLGEMEINE KONTEXT-NUTZUNG ===\n';
    prompt += 'KRITISCH: Kontext-Informationen sind NUR für dich intern - gib sie NIEMALS direkt an den User weiter!\n';
    prompt += 'KRITISCH: Wenn User eine Frage stellt (z.B. "do you have rooms for tonight?"), beantworte die Frage direkt - erwähne KEINE Kontext-Informationen!\n';
    prompt += 'KRITISCH: Kontext-Informationen wie "roomName", "checkInDate", etc. sind nur dazu da, dass du weißt, welche Daten bereits vorhanden sind - nutze sie für Function Calls, aber erwähne sie NICHT in deiner Antwort!\n';
    prompt += 'KRITISCH: Wenn User eine neue Frage stellt, die nichts mit dem Kontext zu tun hat, ignoriere den Kontext und beantworte die Frage direkt!\n';
    prompt += 'KRITISCH: NIEMALS antworten mit "Esa información ya está en el contexto" oder ähnlichen Sätzen - beantworte die Frage direkt!\n';
    return prompt;
  }

  /**
   * Language-Instructions (immer vorhanden)
   * 
   * @param language - Sprache
   * @returns Language-Instructions
   */
  private static getLanguageInstructions(language: string): string {
    const languageInstructions: Record<string, string> = {
      es: '=== KRITISCH: SPRACH-ANWEISUNG ===\n' +
          'DU MUSST IMMER UND AUSSCHLIESSLICH AUF SPANISCH ANTWORTEN!\n' +
          'Die gesamte Antwort muss vollständig auf Spanisch sein.\n' +
          'Verwende KEIN Deutsch, KEIN Englisch, NUR Spanisch.\n' +
          'Alle Texte, Erklärungen, Fragen und Antworten müssen auf Spanisch sein.\n' +
          'Auch wenn der System Prompt auf Deutsch ist, antworte IMMER auf Spanisch.\n' +
          'Wenn du Function Results interpretierst, erkläre sie auf Spanisch.\n' +
          'Wenn du Fragen stellst, stelle sie auf Spanisch.\n' +
          'Wenn du Fehler meldest, melde sie auf Spanisch.\n' +
          'ANTWORTE NUR AUF SPANISCH - KEINE AUSNAHME!\n' +
          '=== ENDE SPRACH-ANWEISUNG ===\n',
      de: '=== KRITISCH: SPRACH-ANWEISUNG ===\n' +
          'DU MUSST IMMER UND AUSSCHLIESSLICH AUF DEUTSCH ANTWORTEN!\n' +
          'Die gesamte Antwort muss vollständig auf Deutsch sein.\n' +
          'Verwende KEIN Spanisch, KEIN Englisch, NUR Deutsch.\n' +
          'Alle Texte, Erklärungen, Fragen und Antworten müssen auf Deutsch sein.\n' +
          'Auch wenn der System Prompt auf Deutsch ist, antworte IMMER auf Deutsch.\n' +
          'Wenn du Function Results interpretierst, erkläre sie auf Deutsch.\n' +
          'Wenn du Fragen stellst, stelle sie auf Deutsch.\n' +
          'Wenn du Fehler meldest, melde sie auf Deutsch.\n' +
          'ANTWORTE NUR AUF DEUTSCH - KEINE AUSNAHME!\n' +
          '=== ENDE SPRACH-ANWEISUNG ===\n',
      en: '=== CRITICAL: LANGUAGE INSTRUCTION ===\n' +
          'YOU MUST ALWAYS AND EXCLUSIVELY ANSWER IN ENGLISH!\n' +
          'The entire response must be completely in English.\n' +
          'Use NO Spanish, NO German, ONLY English.\n' +
          'All texts, explanations, questions and answers must be in English.\n' +
          'Even if the system prompt is in German, ALWAYS answer in English.\n' +
          'When you interpret Function Results, explain them in English.\n' +
          'When you ask questions, ask them in English.\n' +
          'When you report errors, report them in English.\n' +
          'ANSWER ONLY IN ENGLISH - NO EXCEPTION!\n' +
          '=== END LANGUAGE INSTRUCTION ===\n'
    };
    
    return languageInstructions[language] || languageInstructions.es;
  }

  /**
   * Channel-spezifische Instructions
   * 
   * @param channel - Channel
   * @param language - Sprache
   * @returns Channel-spezifische Instructions
   */
  private static getChannelSpecificInstructions(
    channel: string,
    language: string
  ): string {
    // Channel-spezifische Instructions können hier hinzugefügt werden
    // WhatsApp: Emoji-Support, etc.
    // Email: Formale Sprache, etc.
    // Instagram: Hashtags, etc.
    return '';
  }
}

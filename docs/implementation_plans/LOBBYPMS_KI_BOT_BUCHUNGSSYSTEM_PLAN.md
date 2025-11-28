# LobbyPMS KI-Bot Buchungssystem - Analyse und Implementierungsplan

**Datum:** 2025-01-26  
**Status:** Analyse & Plan - NICHTS UMSETZEN  
**Ziel:** KI-Bot soll Zugang zum Buchungssystem haben und Reservierungen erstellen, Zahlungs- und Check-in-Links senden können, sowie automatische Stornierung bei nicht bezahlten Reservierungen

---

## 📋 Zusammenfassung der Anforderungen

1. **Verfügbarkeitsprüfung:** Bot soll angeben können, ob Zimmer/Betten frei sind & zu welchem Preis
2. **Reservierung erstellen:** Bot soll auf Wunsch eine Reservierung erstellen können
   - **WICHTIG:** Bot muss ALLE notwendigen Informationen abfragen:
     - Von wann bis wann (Check-in/Check-out Datum)
     - Name des Gastes
     - Art des Zimmers (private oder dorm)
   - Mehrstufige Konversation (ähnlich wie Request/Task-Erstellung)
3. **Zahlungslink & Check-in-Link:** Bot soll auf Wunsch Zahlungslink & Check-in-Link erstellen & senden können
4. **Automatische Stornierung:** Wenn Zahlung nicht innerhalb einer bestimmten Frist (z.B. 1h) gezahlt ist, soll die Reservierung automatisch storniert werden

**Technische Anforderung:**
- Entweder direkt LobbyPMS API verwenden, oder über die Website buchen
- Wir haben keine LobbyPMS API-Dokumentation, nur die Befehle die umgesetzt sind & funktionieren
- Von bestehenden Implementierungen ableiten
- **WICHTIG:** Alles zuerst testen, auch APIs. Keine Vermutungen!

---

## 🔍 Analyse: Was besteht bereits?

### 1. LobbyPMS API-Integration

**Dateien:**
- `backend/src/services/lobbyPmsService.ts` - Hauptservice für LobbyPMS API
- `backend/src/controllers/lobbyPmsController.ts` - Controller für LobbyPMS Endpoints
- `backend/src/services/lobbyPmsReservationSyncService.ts` - Sync-Service

**Bereits vorhandene Funktionen:**
- ✅ `fetchReservations(startDate, endDate)` - Reservierungen abrufen
- ✅ `fetchReservationById(reservationId)` - Reservierungsdetails abrufen
- ✅ `syncReservation(lobbyReservation)` - Reservierung synchronisieren
- ✅ `updateReservationStatus(reservationId, status)` - Status aktualisieren
- ✅ Authentifizierung mit Bearer Token
- ✅ Branch-basierte Konfiguration

**Bekannte API-Endpunkte (aus `backend/lobbypms-api-discovery-results.json`):**
- ✅ `GET /api/v1/bookings` - Funktioniert (Status 200)
- ⚠️ `GET /api/v2/available-rooms` - Benötigt `start_date` Parameter (Status 422 ohne Parameter)
- ❌ `GET /api/v2/reservations` - Nicht gefunden (Status 404)
- ❌ `GET /api/v2/bookings` - Nicht gefunden (Status 404)
- ❌ `GET /api/v1/reservations` - Nicht gefunden (Status 404)

**API-Response-Struktur (aus bestehenden Implementierungen):**
```typescript
interface LobbyPmsReservation {
  booking_id: string;
  creation_date: string; // "YYYY-MM-DD HH:mm:ss"
  start_date: string; // "YYYY-MM-DD" - Check-in
  end_date: string; // "YYYY-MM-DD" - Check-out
  holder: {
    name: string;
    surname: string;
    second_surname?: string;
    email: string;
    phone: string;
    pais: string; // Nationalität
  };
  assigned_room: {
    type: "compartida" | "privada";
    name: string; // Zimmername oder Bettnummer
  };
  category: {
    category_id: number;
    name: string; // Zimmername (für Dorms)
  };
  total_to_pay: number;
  total_to_pay_accommodation: number;
  paid_out: number;
  currency: string;
  checked_in: boolean;
  checked_out: boolean;
  // ... weitere Felder
}
```

### 2. WhatsApp KI-Bot

**Dateien:**
- `backend/src/services/whatsappMessageHandler.ts` - Hauptlogik für Nachrichtenverarbeitung
- `backend/src/services/whatsappAiService.ts` - OpenAI GPT-4o Integration mit Function Calling
- `backend/src/services/whatsappFunctionHandlers.ts` - Function Handler für OpenAI Function Calling
- `backend/src/controllers/whatsappController.ts` - Webhook-Endpoint

**Bereits vorhandene Features:**
- ✅ OpenAI GPT-4o Integration
- ✅ Function Calling (für Mitarbeiter)
- ✅ Branch-basierte Konfiguration
- ✅ Sprach-Erkennung
- ✅ Conversation State Management
- ✅ User-Identifikation via Telefonnummer

**Bereits vorhandene Functions:**
- ✅ `get_requests` - Requests abrufen
- ✅ `get_todos` - Todos abrufen
- ✅ `get_worktime` - Arbeitszeiten abrufen
- ✅ `get_cerebro_articles` - Cerebro-Artikel abrufen
- ✅ `get_user_info` - User-Informationen abrufen

**Fehlt:**
- ❌ Functions für LobbyPMS (Verfügbarkeit, Reservierung erstellen, etc.)

### 3. Reservierungserstellung

**Dateien:**
- `backend/src/controllers/reservationController.ts` - Controller für Reservierungen
- `backend/src/services/whatsappReservationService.ts` - Reservierungserstellung aus WhatsApp
- `backend/src/services/emailReservationService.ts` - Reservierungserstellung aus E-Mail

**Bereits vorhandene Funktionen:**
- ✅ `createReservation()` - Manuelle Reservierungserstellung
- ✅ `createReservationFromMessage()` - Aus WhatsApp-Nachricht
- ✅ `createReservationFromEmail()` - Aus E-Mail
- ✅ Automatischer Payment-Link-Erstellung (wenn Telefonnummer vorhanden)
- ✅ Automatischer WhatsApp-Versand nach Erstellung

**Datenbank-Schema:**
```prisma
model Reservation {
  id                       Int
  lobbyReservationId       String?  @unique // ID aus LobbyPMS
  guestName                String
  guestEmail               String?
  guestPhone               String?
  checkInDate              DateTime
  checkOutDate             DateTime
  status                   ReservationStatus
  paymentStatus            PaymentStatus
  amount                   Decimal?
  currency                 String?
  paymentLink              String? // Bold Payment Link
  // ... weitere Felder
}
```

### 4. Zahlungslink & Check-in-Link

**Dateien:**
- `backend/src/services/boldPaymentService.ts` - Bold Payment Integration
- `backend/src/services/reservationNotificationService.ts` - Notification Service
- `backend/src/utils/checkInLinkUtils.ts` - Check-in-Link-Generierung

**Bereits vorhandene Funktionen:**
- ✅ `createPaymentLink(reservation, amount, currency)` - Bold Payment Link erstellen
- ✅ `generateLobbyPmsCheckInLink(reservation)` - LobbyPMS Check-in-Link generieren
- ✅ `sendReservationInvitation(reservationId, options)` - Zahlungslink & Check-in-Link senden
- ✅ Automatischer Versand nach Reservierungserstellung (wenn aktiviert)

**Check-in-Link-Format:**
```
https://app.lobbypms.com/checkinonline/confirmar?codigo={lobbyReservationId}&email={guestEmail}&lg={language}
```

**Payment-Link:**
- Wird über Bold Payment API erstellt
- Wird in `reservation.paymentLink` gespeichert

### 5. Automatische Stornierung

**Status:** ❌ **NICHT IMPLEMENTIERT**

**Was fehlt:**
- ❌ Job/Scheduler für automatische Stornierung
- ❌ Prüfung des Zahlungsstatus nach Frist
- ❌ Stornierung in LobbyPMS (via API oder manuell)
- ❌ Datenbank-Feld für Stornierungsfrist (`paymentDeadline` oder ähnlich)
- ❌ Benachrichtigung bei Stornierung

**Bestehende Scheduler:**
- ✅ `backend/src/services/reservationScheduler.ts` - Tägliche Ausführung
- ✅ `backend/src/services/lobbyPmsReservationScheduler.ts` - Sync-Scheduler
- ✅ Queue-System (BullMQ) für asynchrone Verarbeitung

---

## 📊 Verfügbarkeitsprüfung - Analyse

### Option 1: LobbyPMS API `/api/v2/available-rooms`

**Status:** ⚠️ **TEILWEISE FUNKTIONIERT**

**Bekannt:**
- Endpunkt existiert: `GET /api/v2/available-rooms`
- Benötigt `start_date` Parameter (Status 422 ohne Parameter)
- Weitere Parameter unbekannt (müssen getestet werden)

**Zu testen:**
- Welche Parameter werden akzeptiert? (`start_date`, `end_date`, `property_id`, etc.)
- Welche Daten werden zurückgegeben? (Verfügbare Zimmer, Preise, etc.)
- Format der Response

**Implementierung:**
```typescript
// In lobbyPmsService.ts
async checkAvailability(startDate: Date, endDate: Date): Promise<AvailabilityResult[]> {
  // GET /api/v2/available-rooms?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
  // Response-Struktur muss getestet werden
}
```

### Option 2: Über Website buchen

**Status:** ❓ **UNBEKANNT**

**Vorteile:**
- Funktioniert garantiert (wie normale Buchung)
- Keine API-Limits
- Vollständige Funktionalität

**Nachteile:**
- Web Scraping erforderlich (fragil, kann brechen)
- Langsamer als API
- Komplexer zu implementieren
- Wartungsaufwand bei Website-Änderungen

**Empfehlung:** Nur als Fallback, wenn API nicht funktioniert

### Option 3: Aus bestehenden Reservierungen ableiten

**Status:** ✅ **MÖGLICH**

**Idee:**
- Hole alle Reservierungen für Zeitraum
- Berechne Verfügbarkeit basierend auf belegten Zimmern
- Problem: Benötigt vollständige Liste aller Zimmer (nicht in API verfügbar)

**Empfehlung:** Nicht praktikabel ohne vollständige Zimmerliste

---

## 🎯 Implementierungsplan

### Phase 1: Verfügbarkeitsprüfung implementieren

#### Schritt 1.1: API-Endpunkt testen ✅ ABGESCHLOSSEN

**Status:** ✅ **GETESTET UND DOKUMENTIERT**

**Ergebnisse:**
- ✅ Endpunkt funktioniert: `GET /api/v2/available-rooms`
- ✅ Erforderliche Parameter: `start_date` (YYYY-MM-DD), `end_date` (YYYY-MM-DD)
- ✅ Response-Struktur bekannt (siehe `docs/technical/LOBBYPMS_API_TEST_ERGEBNISSE_2025-01-26.md`)

**Response-Struktur (GETESTET):**
```json
{
  "data": [
    {
      "date": "2025-11-29",
      "categories": [
        {
          "category_id": 34280,
          "name": "El primo aventurero",
          "available_rooms": 7,
          "plans": [
            {
              "id": null,
              "name": "STANDARD_RATE",
              "prices": [
                {
                  "people": 1,
                  "value": 60000
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

**Wichtige Erkenntnisse:**
- `category_id` = Zimmerkategorie-ID
- `name` = Zimmername
- `available_rooms` = Anzahl verfügbarer Zimmer
- `plans[0].prices[0].value` = Preis pro Person
- `plans[0].prices[0].people` = Anzahl Personen
- ⚠️ `room_type` Parameter wird ignoriert (alle Zimmerarten werden zurückgegeben)

**Vorgehen:**
1. Test-Script erstellen: `backend/scripts/test-lobbypms-availability.ts`
2. **Systematisch alle Parameter-Kombinationen testen:**
   - `start_date` (erforderlich - bekannt aus Status 422)
   - `end_date` (testen ob optional oder erforderlich)
   - `property_id` (testen ob optional oder erforderlich)
   - `category_id` (testen ob unterstützt)
   - `room_type` (testen ob unterstützt: "compartida", "privada")
   - `adults` / `guests` (testen ob Anzahl Gäste unterstützt wird)
   - Verschiedene Datumsformate testen (YYYY-MM-DD, DD/MM/YYYY, etc.)
3. **Response-Struktur vollständig dokumentieren:**
   - Welche Felder werden zurückgegeben?
   - Welche Datentypen?
   - Welche Werte für room_type?
   - Wie werden Preise formatiert?
4. **Fehlerbehandlung testen:**
   - Was passiert bei ungültigen Datumsformaten?
   - Was passiert bei Datum in der Vergangenheit?
   - Was passiert bei fehlenden Parametern?
5. **Ergebnisse dokumentieren:**
   - Erstelle `docs/technical/LOBBYPMS_AVAILABILITY_API_TEST_ERGEBNISSE.md`
   - Dokumentiere ALLE getesteten Parameter-Kombinationen
   - Dokumentiere Response-Struktur mit Beispielen
   - Dokumentiere Fehlerfälle

**Test-Script Struktur:**
```typescript
// backend/scripts/test-lobbypms-availability.ts
async function testAvailabilityApi() {
  const service = await LobbyPmsService.createForBranch(1); // Branch ID 1
  
  // Test 1: Nur start_date (erforderlich)
  console.log('Test 1: Nur start_date');
  try {
    const result = await service.axiosInstance.get('/api/v2/available-rooms', {
      params: { start_date: '2025-02-01' }
    });
    console.log('✅ Erfolg:', JSON.stringify(result.data, null, 2));
  } catch (error) {
    console.log('❌ Fehler:', error.response?.data || error.message);
  }
  
  // Test 2: start_date + end_date
  // Test 3: start_date + property_id
  // Test 4: start_date + room_type
  // ... alle Kombinationen testen
}
```

**Erwartete Response (MUSS GETESTET WERDEN - KEINE VERMUTUNG!):**
```json
{
  "data": [
    {
      "room_id": 123,
      "room_name": "La tia artista",
      "room_type": "compartida",
      "available_beds": 3,
      "total_beds": 8,
      "price_per_night": 45000,
      "currency": "COP"
    }
  ]
}
```
**⚠️ WICHTIG:** Diese Struktur ist nur eine Vermutung! Muss getestet werden!

#### Schritt 1.2: Service-Methode implementieren ✅ BEREIT

**Status:** ✅ Tests abgeschlossen, Response-Struktur bekannt

**Datei:** `backend/src/services/lobbyPmsService.ts`

**Neue Methode (Struktur basierend auf Test-Ergebnissen):**
```typescript
/**
 * Prüft Verfügbarkeit von Zimmern/Betten für einen Zeitraum
 * 
 * @param startDate - Check-in Datum
 * @param endDate - Check-out Datum
 * @param roomType - Optional: Filter nach Zimmerart ("compartida" | "privada")
 * @returns Array von verfügbaren Zimmern/Betten mit Preisen
 */
async checkAvailability(
  startDate: Date, 
  endDate: Date
): Promise<AvailabilityResult[]> {
  // Lade Settings falls noch nicht geladen
  if (!this.apiKey) {
    await this.loadSettings();
  }

  try {
    // Parameter basierend auf Test-Ergebnissen
    // WICHTIG: start_date UND end_date sind ERFORDERLICH!
    const params: any = {
      start_date: this.formatDate(startDate), // Format: "YYYY-MM-DD"
      end_date: this.formatDate(endDate) // Format: "YYYY-MM-DD"
    };

    if (this.propertyId) {
      params.property_id = this.propertyId; // Optional
    }

    // WICHTIG: room_type Parameter wird ignoriert (aus Tests bekannt)
    // Stattdessen: Filtere nach category_id oder name

    const response = await this.axiosInstance.get<any>(
      '/api/v2/available-rooms',
      { params }
    );

    // Response-Struktur basierend auf Test-Ergebnissen
    // Struktur: { data: [{ date: "...", categories: [...] }] }
    const responseData = response.data.data || [];
    
    // Flache alle Kategorien für alle Daten
    const allCategories: AvailabilityResult[] = [];
    
    for (const dateEntry of responseData) {
      const date = dateEntry.date;
      const categories = dateEntry.categories || [];
      
      for (const category of categories) {
        // Hole Preis für 1 Person (Standard)
        const priceForOnePerson = category.plans?.[0]?.prices?.find((p: any) => p.people === 1);
        const price = priceForOnePerson?.value || 0;
        
        // Bestimme room_type aus Namen oder category_id
        // Heuristik: Namen mit "Dorm", "Compartida" = compartida, sonst privada
        const name = category.name?.toLowerCase() || '';
        let roomType: 'compartida' | 'privada' = 'privada';
        if (name.includes('dorm') || name.includes('compartida') || 
            category.category_id === 34280 || category.category_id === 34281) {
          roomType = 'compartida';
        }
        
        allCategories.push({
          categoryId: category.category_id,
          roomName: category.name,
          roomType: roomType,
          availableRooms: category.available_rooms || 0,
          pricePerNight: price,
          currency: 'COP', // Standard aus Tests
          date: date,
          prices: category.plans?.[0]?.prices || [] // Alle Preise (verschiedene Personenanzahl)
        });
      }
    }
    
    return allCategories;
  } catch (error) {
    // Fehlerbehandlung basierend auf Test-Ergebnissen
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<any>;
      throw new Error(
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        `LobbyPMS API Fehler: ${axiosError.message}`
      );
    }
    throw error;
  }
}

/**
 * Formatiert Datum als YYYY-MM-DD
 */
private formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

interface AvailabilityResult {
  categoryId: number; // LobbyPMS category_id
  roomName: string; // Name der Zimmerkategorie
  roomType: 'compartida' | 'privada'; // Abgeleitet aus Name/category_id
  availableRooms: number; // Anzahl verfügbarer Zimmer
  pricePerNight: number; // Preis pro Nacht (für 1 Person)
  currency: string; // Währung (Standard: COP)
  date: string; // Datum (YYYY-MM-DD)
  prices: Array<{ // Alle Preise (verschiedene Personenanzahl)
    people: number;
    value: number;
  }>;
}
```

**WICHTIG:** 
- Alle Feldnamen müssen aus Test-Ergebnissen übernommen werden
- Keine Vermutungen über Response-Struktur
- Fehlerbehandlung basierend auf tatsächlichen Fehlermeldungen

#### Schritt 1.3: WhatsApp Function hinzufügen

**Datei:** `backend/src/services/whatsappAiService.ts`

**Neue Function Definition:**
```typescript
{
  type: 'function',
  function: {
    name: 'check_room_availability',
    description: 'Prüft Verfügbarkeit von Zimmern/Betten für einen Zeitraum. Gibt zurück, welche Zimmer/Betten frei sind und zu welchem Preis.',
    parameters: {
      type: 'object',
      properties: {
        startDate: {
          type: 'string',
          description: 'Check-in Datum im Format YYYY-MM-DD. Verwende "today" für heute, "tomorrow" für morgen.'
        },
        endDate: {
          type: 'string',
          description: 'Check-out Datum im Format YYYY-MM-DD. Wenn nicht angegeben, wird 1 Nacht angenommen.'
        },
        branchId: {
          type: 'number',
          description: 'Branch ID (optional, verwendet aktuellen Branch wenn nicht angegeben)'
        }
      },
      required: ['startDate']
    }
  }
}
```

**Datei:** `backend/src/services/whatsappFunctionHandlers.ts`

**Neue Function Handler:**
```typescript
/**
 * Prüft Verfügbarkeit von Zimmern/Betten
 */
export async function check_room_availability(
  args: { startDate: string; endDate?: string; branchId?: number },
  userId: number | null,
  roleId: number | null,
  branchId: number
): Promise<any> {
  try {
    // Parse Datum
    const startDate = parseDate(args.startDate);
    const endDate = args.endDate ? parseDate(args.endDate) : addDays(startDate, 1);
    
    // Erstelle LobbyPMS Service
    const effectiveBranchId = args.branchId || branchId;
    const service = await LobbyPmsService.createForBranch(effectiveBranchId);
    
    // Prüfe Verfügbarkeit
    const availability = await service.checkAvailability(startDate, endDate);
    
    return {
      success: true,
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      availability: availability.map(item => ({
        roomName: item.roomName,
        roomType: item.roomType,
        availableBeds: item.availableBeds,
        totalBeds: item.totalBeds,
        pricePerNight: item.pricePerNight,
        currency: item.currency
      }))
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    };
  }
}
```

### Phase 2: Reservierungserstellung via Bot

#### Schritt 2.1: Mehrstufige Konversation implementieren

**WICHTIG:** Bot muss ALLE Informationen abfragen:
- Von wann bis wann (Check-in/Check-out Datum)
- Name des Gastes
- Art des Zimmers (private oder dorm)

**Vorgehen:** Ähnlich wie `startRequestCreation()` und `continueConversation()` für Requests/Tasks

**Datei:** `backend/src/services/whatsappMessageHandler.ts`

**Neue Methoden:**

1. **Keyword-Erkennung für Reservierungserstellung:**
```typescript
// In handleIncomingMessage(), nach anderen Keywords
const reservationKeywords = ['reservierung', 'reservation', 'buchung', 'booking', 'quiero reservar', 'quiero una habitación'];
if (reservationKeywords.some(keyword => normalizedText.includes(keyword)) && conversation.state === 'idle') {
  return await this.startReservationCreation(normalizedPhone, branchId, conversation);
}
```

2. **Start der Reservierungserstellung:**
```typescript
/**
 * Startet Reservierungserstellung (mehrstufige Konversation)
 */
private static async startReservationCreation(
  phoneNumber: string,
  branchId: number,
  conversation: any
): Promise<string> {
  try {
    // Setze State auf "reservation_creation"
    await prisma.whatsAppConversation.update({
      where: { id: conversation.id },
      data: {
        state: 'reservation_creation',
        context: { step: 'waiting_for_check_in_date' }
      }
    });

    const language = LanguageDetectionService.detectLanguageFromPhoneNumber(phoneNumber);
    
    const translations: Record<string, string> = {
      es: '¡Perfecto! Te ayudo a crear una reservación.\n\n¿Cuándo quieres hacer el check-in? (Por ejemplo: 15/02/2025 o mañana)',
      de: 'Perfekt! Ich helfe dir bei der Reservierung.\n\nWann möchtest du einchecken? (Zum Beispiel: 15.02.2025 oder morgen)',
      en: 'Perfect! I\'ll help you create a reservation.\n\nWhen do you want to check in? (For example: 02/15/2025 or tomorrow)'
    };

    return translations[language] || translations.es;
  } catch (error) {
    console.error('[WhatsApp Message Handler] Fehler beim Starten der Reservierungserstellung:', error);
    return await this.getLanguageResponse(branchId, phoneNumber, 'error');
  }
}
```

3. **Fortsetzung der Konversation:**
```typescript
// In continueConversation(), nach request_creation und task_creation
if (conversation.state === 'reservation_creation') {
  return await this.continueReservationCreation(phoneNumber, branchId, messageText, conversation);
}
```

4. **Fortsetzung der Reservierungserstellung:**
```typescript
/**
 * Setzt Reservierungserstellung fort
 */
private static async continueReservationCreation(
  phoneNumber: string,
  branchId: number,
  messageText: string,
  conversation: any
): Promise<string> {
  try {
    const context = conversation.context as any || {};
    const step = context.step || '';
    const language = LanguageDetectionService.detectLanguageFromPhoneNumber(phoneNumber);

    // Schritt 1: Check-in Datum
    if (step === 'waiting_for_check_in_date') {
      const checkInDate = this.parseDateFromMessage(messageText, language);
      
      if (!checkInDate) {
        const translations: Record<string, string> = {
          es: 'No pude entender la fecha. Por favor, escribe la fecha de check-in en formato DD/MM/YYYY (por ejemplo: 15/02/2025) o di "mañana", "pasado mañana", etc.',
          de: 'Ich konnte das Datum nicht verstehen. Bitte schreibe das Check-in Datum im Format TT.MM.JJJJ (z.B. 15.02.2025) oder sage "morgen", "übermorgen", etc.',
          en: 'I couldn\'t understand the date. Please write the check-in date in format MM/DD/YYYY (e.g. 02/15/2025) or say "tomorrow", "day after tomorrow", etc.'
        };
        return translations[language] || translations.es;
      }

      // Update Context
      await prisma.whatsAppConversation.update({
        where: { id: conversation.id },
        data: {
          context: {
            ...context,
            step: 'waiting_for_check_out_date',
            checkInDate: checkInDate.toISOString()
          }
        }
      });

      const translations: Record<string, string> = {
        es: `Check-in: ${this.formatDate(checkInDate, language)}\n\n¿Cuándo quieres hacer el check-out? (Por ejemplo: 18/02/2025 o en 3 días)`,
        de: `Check-in: ${this.formatDate(checkInDate, language)}\n\nWann möchtest du auschecken? (Zum Beispiel: 18.02.2025 oder in 3 Tagen)`,
        en: `Check-in: ${this.formatDate(checkInDate, language)}\n\nWhen do you want to check out? (For example: 02/18/2025 or in 3 days)`
      };
      return translations[language] || translations.es;
    }

    // Schritt 2: Check-out Datum
    if (step === 'waiting_for_check_out_date') {
      const checkInDate = new Date(context.checkInDate);
      const checkOutDate = this.parseDateFromMessage(messageText, language, checkInDate);
      
      if (!checkOutDate) {
        const translations: Record<string, string> = {
          es: 'No pude entender la fecha. Por favor, escribe la fecha de check-out en formato DD/MM/YYYY (por ejemplo: 18/02/2025) o di "en 3 días", etc.',
          de: 'Ich konnte das Datum nicht verstehen. Bitte schreibe das Check-out Datum im Format TT.MM.JJJJ (z.B. 18.02.2025) oder sage "in 3 Tagen", etc.',
          en: 'I couldn\'t understand the date. Please write the check-out date in format MM/DD/YYYY (e.g. 02/18/2025) or say "in 3 days", etc.'
        };
        return translations[language] || translations.es;
      }

      // Validierung: Check-out muss nach Check-in liegen
      if (checkOutDate <= checkInDate) {
        const translations: Record<string, string> = {
          es: 'El check-out debe ser después del check-in. Por favor, escribe una fecha posterior.',
          de: 'Das Check-out muss nach dem Check-in sein. Bitte schreibe ein späteres Datum.',
          en: 'Check-out must be after check-in. Please write a later date.'
        };
        return translations[language] || translations.es;
      }

      // Update Context
      await prisma.whatsAppConversation.update({
        where: { id: conversation.id },
        data: {
          context: {
            ...context,
            step: 'waiting_for_guest_name',
            checkOutDate: checkOutDate.toISOString()
          }
        }
      });

      const translations: Record<string, string> = {
        es: `Check-out: ${this.formatDate(checkOutDate, language)}\n\n¿Cuál es el nombre del huésped? (Nombre completo)`,
        de: `Check-out: ${this.formatDate(checkOutDate, language)}\n\nWie lautet der Name des Gastes? (Vollständiger Name)`,
        en: `Check-out: ${this.formatDate(checkOutDate, language)}\n\nWhat is the guest's name? (Full name)`
      };
      return translations[language] || translations.es;
    }

    // Schritt 3: Gästename
    if (step === 'waiting_for_guest_name') {
      const guestName = messageText.trim();
      
      if (guestName.length < 2) {
        const translations: Record<string, string> = {
          es: 'El nombre parece muy corto. Por favor, escribe el nombre completo del huésped.',
          de: 'Der Name scheint zu kurz zu sein. Bitte schreibe den vollständigen Namen des Gastes.',
          en: 'The name seems too short. Please write the full name of the guest.'
        };
        return translations[language] || translations.es;
      }

      // Update Context
      await prisma.whatsAppConversation.update({
        where: { id: conversation.id },
        data: {
          context: {
            ...context,
            step: 'waiting_for_room_type',
            guestName: guestName
          }
        }
      });

      const translations: Record<string, string> = {
        es: `Huésped: ${guestName}\n\n¿Qué tipo de habitación prefieres?\n- Privada (habitación privada)\n- Dorm (cama en habitación compartida)\n\nEscribe "privada" o "dorm"`,
        de: `Gast: ${guestName}\n\nWelche Art von Zimmer bevorzugst du?\n- Privat (privates Zimmer)\n- Dorm (Bett im Mehrbettzimmer)\n\nSchreibe "privat" oder "dorm"`,
        en: `Guest: ${guestName}\n\nWhat type of room do you prefer?\n- Private (private room)\n- Dorm (bed in shared room)\n\nWrite "private" or "dorm"`
      };
      return translations[language] || translations.es;
    }

    // Schritt 4: Zimmerart
    if (step === 'waiting_for_room_type') {
      const normalizedText = messageText.toLowerCase().trim();
      let roomType: 'compartida' | 'privada' | null = null;
      
      // Erkenne Zimmerart
      if (normalizedText.includes('privada') || normalizedText.includes('private') || normalizedText.includes('privat')) {
        roomType = 'privada';
      } else if (normalizedText.includes('dorm') || normalizedText.includes('compartida') || normalizedText.includes('shared')) {
        roomType = 'compartida';
      }
      
      if (!roomType) {
        const translations: Record<string, string> = {
          es: 'No pude entender el tipo de habitación. Por favor, escribe "privada" o "dorm".',
          de: 'Ich konnte die Zimmerart nicht verstehen. Bitte schreibe "privat" oder "dorm".',
          en: 'I couldn\'t understand the room type. Please write "private" or "dorm".'
        };
        return translations[language] || translations.es;
      }

      // Update Context
      await prisma.whatsAppConversation.update({
        where: { id: conversation.id },
        data: {
          context: {
            ...context,
            step: 'waiting_for_confirmation',
            roomType: roomType
          }
        }
      });

      // Prüfe Verfügbarkeit
      const checkInDate = new Date(context.checkInDate);
      const checkOutDate = new Date(context.checkOutDate);
      
      try {
        const service = await LobbyPmsService.createForBranch(branchId);
        const availability = await service.checkAvailability(checkInDate, checkOutDate, roomType);
        
        // Filtere nach Zimmerart
        const filteredAvailability = availability.filter(item => item.roomType === roomType);
        
        if (filteredAvailability.length === 0) {
          const translations: Record<string, string> = {
            es: `Lo siento, no hay ${roomType === 'privada' ? 'habitaciones privadas' : 'camas en dorms'} disponibles para estas fechas.`,
            de: `Entschuldigung, es sind keine ${roomType === 'privada' ? 'Privatzimmer' : 'Betten in Dorms'} für diese Daten verfügbar.`,
            en: `Sorry, there are no ${roomType === 'privada' ? 'private rooms' : 'beds in dorms'} available for these dates.`
          };
          return translations[language] || translations.es;
        }

        // Zeige verfügbare Optionen
        let availabilityText = '';
        filteredAvailability.forEach(item => {
          availabilityText += `- ${item.roomName}: ${item.availableBeds} ${roomType === 'privada' ? 'disponible' : 'camas disponibles'} - ${item.pricePerNight} ${item.currency}/noche\n`;
        });

        const translations: Record<string, string> = {
          es: `Resumen de la reservación:\n\nCheck-in: ${this.formatDate(checkInDate, language)}\nCheck-out: ${this.formatDate(checkOutDate, language)}\nHuésped: ${context.guestName}\nTipo: ${roomType === 'privada' ? 'Privada' : 'Dorm'}\n\nDisponibilidad:\n${availabilityText}\n\n¿Confirmas esta reservación? (Escribe "sí" o "confirmar")`,
          de: `Zusammenfassung der Reservierung:\n\nCheck-in: ${this.formatDate(checkInDate, language)}\nCheck-out: ${this.formatDate(checkOutDate, language)}\nGast: ${context.guestName}\nTyp: ${roomType === 'privada' ? 'Privat' : 'Dorm'}\n\nVerfügbarkeit:\n${availabilityText}\n\nBestätigst du diese Reservierung? (Schreibe "ja" oder "bestätigen")`,
          en: `Reservation summary:\n\nCheck-in: ${this.formatDate(checkInDate, language)}\nCheck-out: ${this.formatDate(checkOutDate, language)}\nGuest: ${context.guestName}\nType: ${roomType === 'privada' ? 'Private' : 'Dorm'}\n\nAvailability:\n${availabilityText}\n\nDo you confirm this reservation? (Write "yes" or "confirm")`
        };
        return translations[language] || translations.es;
      } catch (error) {
        console.error('[WhatsApp Message Handler] Fehler bei Verfügbarkeitsprüfung:', error);
        const translations: Record<string, string> = {
          es: 'Hubo un error al verificar la disponibilidad. Por favor, intenta de nuevo más tarde.',
          de: 'Es gab einen Fehler bei der Verfügbarkeitsprüfung. Bitte versuche es später erneut.',
          en: 'There was an error checking availability. Please try again later.'
        };
        return translations[language] || translations.es;
      }
    }

    // Schritt 5: Bestätigung
    if (step === 'waiting_for_confirmation') {
      const normalizedText = messageText.toLowerCase().trim();
      const isConfirmed = normalizedText.includes('sí') || normalizedText.includes('si') || 
                         normalizedText.includes('yes') || normalizedText.includes('ja') ||
                         normalizedText.includes('confirmar') || normalizedText.includes('confirm') ||
                         normalizedText.includes('bestätigen');
      
      if (!isConfirmed) {
        // Zurück zu Schritt 1
        await prisma.whatsAppConversation.update({
          where: { id: conversation.id },
          data: {
            state: 'idle',
            context: {}
          }
        });
        
        const translations: Record<string, string> = {
          es: 'Reservación cancelada. Si necesitas algo más, solo escríbeme.',
          de: 'Reservierung abgebrochen. Wenn du etwas anderes brauchst, schreibe mir einfach.',
          en: 'Reservation cancelled. If you need anything else, just write to me.'
        };
        return translations[language] || translations.es;
      }

      // Erstelle Reservierung
      try {
        const checkInDate = new Date(context.checkInDate);
        const checkOutDate = new Date(context.checkOutDate);
        const guestName = context.guestName;
        const roomType = context.roomType;

        // Hole Branch für organizationId
        const branch = await prisma.branch.findUnique({
          where: { id: branchId },
          select: { organizationId: true }
        });

        // Berechne Betrag (vereinfacht - sollte aus Verfügbarkeit kommen)
        // TODO: Preis aus Verfügbarkeitsprüfung übernehmen
        const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
        const estimatedAmount = nights * 50000; // Platzhalter - sollte aus Verfügbarkeit kommen

        // Erstelle Reservierung
        const reservation = await prisma.reservation.create({
          data: {
            guestName: guestName,
            checkInDate: checkInDate,
            checkOutDate: checkOutDate,
            status: ReservationStatus.confirmed,
            paymentStatus: PaymentStatus.pending,
            amount: estimatedAmount,
            currency: 'COP',
            organizationId: branch?.organizationId || 1,
            branchId: branchId,
            paymentDeadline: new Date(Date.now() + 60 * 60 * 1000), // 1 Stunde
            autoCancelEnabled: true
          }
        });

        // Setze State zurück
        await prisma.whatsAppConversation.update({
          where: { id: conversation.id },
          data: {
            state: 'idle',
            context: {}
          }
        });

        // Versende Links (wenn Telefonnummer vorhanden)
        if (phoneNumber) {
          try {
            await ReservationNotificationService.sendReservationInvitation(
              reservation.id,
              {
                guestPhone: phoneNumber,
                amount: estimatedAmount,
                currency: 'COP'
              }
            );
          } catch (error) {
            console.error('[WhatsApp Message Handler] Fehler beim Versand der Links:', error);
          }
        }

        const translations: Record<string, string> = {
          es: `✅ Reservación creada exitosamente!\n\nID: ${reservation.id}\nHuésped: ${guestName}\nCheck-in: ${this.formatDate(checkInDate, language)}\nCheck-out: ${this.formatDate(checkOutDate, language)}\n\n${phoneNumber ? 'Se han enviado los enlaces de pago y check-in por WhatsApp.' : 'Por favor, envía los enlaces de pago y check-in manualmente.'}`,
          de: `✅ Reservierung erfolgreich erstellt!\n\nID: ${reservation.id}\nGast: ${guestName}\nCheck-in: ${this.formatDate(checkInDate, language)}\nCheck-out: ${this.formatDate(checkOutDate, language)}\n\n${phoneNumber ? 'Zahlungs- und Check-in-Links wurden per WhatsApp gesendet.' : 'Bitte sende die Zahlungs- und Check-in-Links manuell.'}`,
          en: `✅ Reservation created successfully!\n\nID: ${reservation.id}\nGuest: ${guestName}\nCheck-in: ${this.formatDate(checkInDate, language)}\nCheck-out: ${this.formatDate(checkOutDate, language)}\n\n${phoneNumber ? 'Payment and check-in links have been sent via WhatsApp.' : 'Please send the payment and check-in links manually.'}`
        };
        return translations[language] || translations.es;
      } catch (error) {
        console.error('[WhatsApp Message Handler] Fehler beim Erstellen der Reservierung:', error);
        const translations: Record<string, string> = {
          es: 'Hubo un error al crear la reservación. Por favor, intenta de nuevo más tarde.',
          de: 'Es gab einen Fehler beim Erstellen der Reservierung. Bitte versuche es später erneut.',
          en: 'There was an error creating the reservation. Please try again later.'
        };
        return translations[language] || translations.es;
      }
    }

    return await this.getLanguageResponse(branchId, phoneNumber, 'error');
  } catch (error) {
    console.error('[WhatsApp Message Handler] Fehler bei Reservierungserstellung:', error);
    return await this.getLanguageResponse(branchId, phoneNumber, 'error');
  }
}

/**
 * Parst Datum aus Nachricht (unterstützt verschiedene Formate)
 */
private static parseDateFromMessage(
  message: string, 
  language: string,
  referenceDate?: Date
): Date | null {
  // Implementierung: Parse verschiedene Datumsformate
  // "15/02/2025", "15.02.2025", "02/15/2025", "mañana", "tomorrow", "in 3 days", etc.
  // TODO: Implementieren
  return null;
}

/**
 * Formatiert Datum für Anzeige
 */
private static formatDate(date: Date, language: string): string {
  // Implementierung: Format basierend auf Sprache
  // TODO: Implementieren
  return date.toLocaleDateString();
}
```

#### Schritt 2.2: Datum-Parsing implementieren

**Datei:** `backend/src/services/whatsappMessageHandler.ts`

**Neue Hilfsmethoden:**
```typescript
/**
 * Parst Datum aus Nachricht (unterstützt verschiedene Formate)
 */
private static parseDateFromMessage(
  message: string, 
  language: string,
  referenceDate: Date = new Date()
): Date | null {
  const normalizedMessage = message.toLowerCase().trim();
  
  // Relative Daten
  if (normalizedMessage.includes('mañana') || normalizedMessage.includes('tomorrow') || normalizedMessage.includes('morgen')) {
    const date = new Date(referenceDate);
    date.setDate(date.getDate() + 1);
    return date;
  }
  
  if (normalizedMessage.includes('pasado mañana') || normalizedMessage.includes('day after tomorrow') || normalizedMessage.includes('übermorgen')) {
    const date = new Date(referenceDate);
    date.setDate(date.getDate() + 2);
    return date;
  }
  
  // "in X days"
  const inDaysMatch = normalizedMessage.match(/in (\d+) (day|días|tagen)/i);
  if (inDaysMatch) {
    const days = parseInt(inDaysMatch[1], 10);
    const date = new Date(referenceDate);
    date.setDate(date.getDate() + days);
    return date;
  }
  
  // Datumsformate: DD/MM/YYYY, DD.MM.YYYY, MM/DD/YYYY, YYYY-MM-DD
  const dateFormats = [
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // DD/MM/YYYY oder MM/DD/YYYY
    /(\d{1,2})\.(\d{1,2})\.(\d{4})/, // DD.MM.YYYY
    /(\d{4})-(\d{1,2})-(\d{1,2})/     // YYYY-MM-DD
  ];
  
  for (const format of dateFormats) {
    const match = normalizedMessage.match(format);
    if (match) {
      let day: number, month: number, year: number;
      
      if (format === dateFormats[2]) {
        // YYYY-MM-DD
        year = parseInt(match[1], 10);
        month = parseInt(match[2], 10);
        day = parseInt(match[3], 10);
      } else {
        // DD/MM/YYYY oder DD.MM.YYYY
        day = parseInt(match[1], 10);
        month = parseInt(match[2], 10);
        year = parseInt(match[3], 10);
        
        // Heuristik: Wenn Tag > 12, dann ist es sicher DD/MM/YYYY
        // Sonst: Abhängig von Sprache (DE/ES: DD/MM, EN: MM/DD)
        if (day <= 12 && month <= 12) {
          if (language === 'en') {
            // EN: MM/DD/YYYY
            [day, month] = [month, day];
          }
          // DE/ES: DD/MM/YYYY (bleibt wie ist)
        }
      }
      
      const date = new Date(year, month - 1, day);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }
  
  return null;
}
```

#### Schritt 2.3: API-Endpunkt für Reservierungserstellung testen ✅ TEILWEISE

**Status:** ✅ Endpunkt existiert, benötigt `category_id`

**Ergebnisse aus Tests:**
- ✅ Endpunkt `/api/v1/bookings` existiert (Status 422, nicht 404)
- ❌ Endpunkte `/api/v2/bookings`, `/api/v1/reservations`, `/api/v2/reservations` existieren nicht (404)
- ✅ Erforderliche Felder: `category_id` (mindestens)

**Nächste Schritte:**
- Test mit `category_id` durchführen (siehe `test-lobbypms-create-booking-with-category.ts`)
- Weitere erforderliche Felder identifizieren

**Test-Script:** `backend/scripts/test-lobbypms-create-booking-with-category.ts`

**Falls API nicht vollständig funktioniert:**
- Alternative: Reservierung nur lokal erstellen (ohne LobbyPMS)
- Oder: Website-Scraping (nur als letzter Ausweg)

**Datei:** `backend/src/services/whatsappFunctionHandlers.ts`

**Neue Function Handler:**
```typescript
/**
 * Erstellt eine neue Reservierung
 */
export async function create_reservation(
  args: {
    guestName: string;
    checkInDate: string;
    checkOutDate: string;
    guestPhone?: string;
    guestEmail?: string;
    amount: number;
    currency?: string;
    branchId?: number;
  },
  userId: number | null,
  roleId: number | null,
  branchId: number
): Promise<any> {
  try {
    // Validierung
    if (!args.guestName || !args.checkInDate || !args.checkOutDate || !args.amount) {
      return {
        success: false,
        error: 'Fehlende erforderliche Parameter: guestName, checkInDate, checkOutDate, amount'
      };
    }

    // Parse Datum
    const checkInDate = parseDate(args.checkInDate);
    const checkOutDate = parseDate(args.checkOutDate);
    
    // Validierung: checkOutDate muss nach checkInDate liegen
    if (checkOutDate <= checkInDate) {
      return {
        success: false,
        error: 'Check-out Datum muss nach Check-in Datum liegen'
      };
    }

    // Hole Organization ID aus Branch
    const effectiveBranchId = args.branchId || branchId;
    const branch = await prisma.branch.findUnique({
      where: { id: effectiveBranchId },
      select: { organizationId: true }
    });

    if (!branch) {
      return {
        success: false,
        error: 'Branch nicht gefunden'
      };
    }

    // Erstelle Reservierung (verwende bestehenden Controller)
    // WICHTIG: Muss über HTTP Request gehen, da Controller-Logik verwendet werden soll
    // Alternative: Direkt Service-Logik verwenden (besser)
    const reservation = await prisma.reservation.create({
      data: {
        guestName: args.guestName.trim(),
        checkInDate: checkInDate,
        checkOutDate: checkOutDate,
        guestPhone: args.guestPhone?.trim() || null,
        guestEmail: args.guestEmail?.trim() || null,
        status: ReservationStatus.confirmed,
        paymentStatus: PaymentStatus.pending,
        amount: args.amount,
        currency: args.currency || 'COP',
        organizationId: branch.organizationId,
        branchId: effectiveBranchId
      }
    });

    // Automatischer Payment-Link & Check-in-Link Versand (wenn aktiviert)
    // WICHTIG: Nur wenn Telefonnummer vorhanden (für WhatsApp)
    if (args.guestPhone) {
      try {
        await ReservationNotificationService.sendReservationInvitation(
          reservation.id,
          {
            guestPhone: args.guestPhone,
            amount: args.amount,
            currency: args.currency || 'COP'
          }
        );
      } catch (error) {
        console.error('[WhatsApp Function] Fehler beim Versand der Links:', error);
        // Fehler nicht weiterwerfen, Reservierung wurde erstellt
      }
    }

    return {
      success: true,
      reservationId: reservation.id,
      guestName: reservation.guestName,
      checkInDate: formatDate(reservation.checkInDate),
      checkOutDate: formatDate(reservation.checkOutDate),
      amount: reservation.amount,
      currency: reservation.currency,
      paymentLink: reservation.paymentLink || null,
      checkInLink: generateLobbyPmsCheckInLink(reservation) || null,
      message: args.guestPhone 
        ? 'Reservierung erstellt. Zahlungslink und Check-in-Link wurden per WhatsApp gesendet.'
        : 'Reservierung erstellt. Bitte Zahlungslink und Check-in-Link manuell senden.'
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    };
  }
}
```

### Phase 3: Zahlungslink & Check-in-Link Versand

#### Schritt 3.1: WhatsApp Function hinzufügen

**Status:** ✅ **BEREITS VORHANDEN** (wird automatisch bei Reservierungserstellung versendet)

**Optional:** Separate Function für manuellen Versand

**Datei:** `backend/src/services/whatsappAiService.ts`

**Neue Function Definition:**
```typescript
{
  type: 'function',
  function: {
    name: 'send_reservation_links',
    description: 'Sendet Zahlungslink und Check-in-Link für eine bestehende Reservierung per WhatsApp oder E-Mail.',
    parameters: {
      type: 'object',
      properties: {
        reservationId: {
          type: 'number',
          description: 'ID der Reservierung'
        },
        guestPhone: {
          type: 'string',
          description: 'Telefonnummer für WhatsApp-Versand (optional, verwendet Reservierungs-Telefonnummer wenn nicht angegeben)'
        },
        guestEmail: {
          type: 'string',
          description: 'E-Mail-Adresse für E-Mail-Versand (optional, verwendet Reservierungs-E-Mail wenn nicht angegeben)'
        }
      },
      required: ['reservationId']
    }
  }
}
```

**Datei:** `backend/src/services/whatsappFunctionHandlers.ts`

**Neue Function Handler:**
```typescript
/**
 * Sendet Zahlungslink und Check-in-Link für eine Reservierung
 */
export async function send_reservation_links(
  args: {
    reservationId: number;
    guestPhone?: string;
    guestEmail?: string;
  },
  userId: number | null,
  roleId: number | null,
  branchId: number
): Promise<any> {
  try {
    // Hole Reservierung
    const reservation = await prisma.reservation.findUnique({
      where: { id: args.reservationId }
    });

    if (!reservation) {
      return {
        success: false,
        error: 'Reservierung nicht gefunden'
      };
    }

    // Verwende angegebene Kontaktdaten oder Reservierungs-Kontaktdaten
    const guestPhone = args.guestPhone || reservation.guestPhone;
    const guestEmail = args.guestEmail || reservation.guestEmail;

    if (!guestPhone && !guestEmail) {
      return {
        success: false,
        error: 'Keine Kontaktinformationen verfügbar (Telefonnummer oder E-Mail erforderlich)'
      };
    }

    // Sende Links
    const result = await ReservationNotificationService.sendReservationInvitation(
      reservation.id,
      {
        guestPhone: guestPhone || undefined,
        guestEmail: guestEmail || undefined,
        amount: reservation.amount ? Number(reservation.amount) : undefined,
        currency: reservation.currency || 'COP'
      }
    );

    return {
      success: result.success,
      paymentLink: result.paymentLink || null,
      checkInLink: result.checkInLink || null,
      messageSent: result.messageSent,
      sentAt: result.sentAt ? formatDate(result.sentAt) : null,
      error: result.error || null
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    };
  }
}
```

### Phase 4: Automatische Stornierung bei nicht bezahlten Reservierungen

#### Schritt 4.1: Datenbank-Schema erweitern

**Datei:** `backend/prisma/schema.prisma`

**Erweiterung Reservation Model:**
```prisma
model Reservation {
  // ... bestehende Felder ...
  paymentDeadline        DateTime? // Frist für Zahlung (wird bei Erstellung gesetzt)
  autoCancelEnabled      Boolean   @default(true) // Automatische Stornierung aktiviert
  cancelledAt            DateTime? // Wann wurde storniert
  cancelledBy            String? // Wer hat storniert ("system" für automatisch, User-ID für manuell)
  cancellationReason     String? // Grund für Stornierung
}
```

**Migration:**
```bash
npx prisma migrate dev --name add_reservation_payment_deadline
```

#### Schritt 4.2: Payment-Deadline bei Reservierungserstellung setzen

**Datei:** `backend/src/controllers/reservationController.ts`

**Erweiterung `createReservation()`:**
```typescript
// Nach Reservierungserstellung
const paymentDeadline = new Date();
paymentDeadline.setHours(paymentDeadline.getHours() + 1); // 1 Stunde Frist (konfigurierbar)

const reservation = await prisma.reservation.create({
  data: {
    // ... bestehende Felder ...
    paymentDeadline: paymentDeadline,
    autoCancelEnabled: true // Standard: aktiviert
  }
});
```

**Datei:** `backend/src/services/whatsappFunctionHandlers.ts`

**Erweiterung `create_reservation()`:**
```typescript
// Setze Payment-Deadline (konfigurierbar, Standard: 1 Stunde)
const paymentDeadlineHours = process.env.RESERVATION_PAYMENT_DEADLINE_HOURS || 1;
const paymentDeadline = new Date();
paymentDeadline.setHours(paymentDeadline.getHours() + paymentDeadlineHours);

const reservation = await prisma.reservation.create({
  data: {
    // ... bestehende Felder ...
    paymentDeadline: paymentDeadline,
    autoCancelEnabled: true
  }
});
```

#### Schritt 4.3: Scheduler für automatische Stornierung

**Neue Datei:** `backend/src/services/reservationAutoCancelScheduler.ts`

```typescript
import { prisma } from '../utils/prisma';
import { ReservationStatus, PaymentStatus } from '@prisma/client';
import { LobbyPmsService } from './lobbyPmsService';

/**
 * Scheduler für automatische Stornierung von nicht bezahlten Reservierungen
 */
export class ReservationAutoCancelScheduler {
  private static checkInterval: NodeJS.Timeout | null = null;
  private static readonly CHECK_INTERVAL = 5 * 60 * 1000; // Alle 5 Minuten prüfen

  /**
   * Startet den Scheduler
   */
  static start(): void {
    if (this.checkInterval) {
      console.log('[ReservationAutoCancel] Scheduler läuft bereits');
      return;
    }

    console.log('[ReservationAutoCancel] Starte Scheduler...');
    
    // Sofortige Prüfung beim Start
    this.checkAndCancelReservations();

    // Regelmäßige Prüfung
    this.checkInterval = setInterval(() => {
      this.checkAndCancelReservations();
    }, this.CHECK_INTERVAL);

    console.log('[ReservationAutoCancel] Scheduler gestartet (alle 5 Minuten)');
  }

  /**
   * Stoppt den Scheduler
   */
  static stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('[ReservationAutoCancel] Scheduler gestoppt');
    }
  }

  /**
   * Prüft und storniert Reservierungen, die nicht bezahlt wurden
   */
  private static async checkAndCancelReservations(): Promise<void> {
    try {
      const now = new Date();

      // Finde Reservierungen, die:
      // 1. Status "confirmed" haben
      // 2. Payment-Status "pending" haben
      // 3. Payment-Deadline überschritten ist
      // 4. Auto-Cancel aktiviert ist
      const expiredReservations = await prisma.reservation.findMany({
        where: {
          status: ReservationStatus.confirmed,
          paymentStatus: PaymentStatus.pending,
          paymentDeadline: {
            lte: now // Deadline überschritten
          },
          autoCancelEnabled: true,
          cancelledAt: null // Noch nicht storniert
        },
        include: {
          organization: {
            select: {
              id: true,
              settings: true
            }
          },
          branch: {
            select: {
              id: true,
              lobbyPmsSettings: true
            }
          }
        }
      });

      if (expiredReservations.length === 0) {
        return; // Keine abgelaufenen Reservierungen
      }

      console.log(`[ReservationAutoCancel] ${expiredReservations.length} Reservierungen gefunden, die storniert werden müssen`);

      for (const reservation of expiredReservations) {
        try {
          await this.cancelReservation(reservation);
        } catch (error) {
          console.error(`[ReservationAutoCancel] Fehler beim Stornieren der Reservierung ${reservation.id}:`, error);
          // Weiter mit nächster Reservierung
        }
      }
    } catch (error) {
      console.error('[ReservationAutoCancel] Fehler beim Prüfen der Reservierungen:', error);
    }
  }

  /**
   * Storniert eine Reservierung
   */
  private static async cancelReservation(reservation: any): Promise<void> {
    console.log(`[ReservationAutoCancel] Storniere Reservierung ${reservation.id} (Gast: ${reservation.guestName})`);

    // 1. Storniere in LobbyPMS (falls lobbyReservationId vorhanden)
    if (reservation.lobbyReservationId && reservation.branch?.lobbyPmsSettings) {
      try {
        const service = await LobbyPmsService.createForBranch(reservation.branchId!);
        await service.updateReservationStatus(
          reservation.lobbyReservationId,
          'cancelled'
        );
        console.log(`[ReservationAutoCancel] Reservierung ${reservation.id} in LobbyPMS storniert`);
      } catch (error) {
        console.error(`[ReservationAutoCancel] Fehler beim Stornieren in LobbyPMS:`, error);
        // Weiter mit lokaler Stornierung
      }
    }

    // 2. Aktualisiere lokale Reservierung
    await prisma.reservation.update({
      where: { id: reservation.id },
      data: {
        status: ReservationStatus.cancelled,
        cancelledAt: new Date(),
        cancelledBy: 'system',
        cancellationReason: 'Zahlung nicht innerhalb der Frist erfolgt'
      }
    });

    console.log(`[ReservationAutoCancel] Reservierung ${reservation.id} erfolgreich storniert`);

    // 3. Optional: Benachrichtigung an Gast senden (wenn gewünscht)
    // TODO: Implementieren wenn gewünscht
  }
}
```

#### Schritt 4.4: Scheduler in Server starten

**Datei:** `backend/src/index.ts`

**Hinzufügen:**
```typescript
import { ReservationAutoCancelScheduler } from './services/reservationAutoCancelScheduler';

// Nach Server-Start
ReservationAutoCancelScheduler.start();
```

#### Schritt 4.5: Konfigurierbare Frist

**Datei:** `.env`

**Hinzufügen:**
```env
# Reservierung Payment-Deadline (in Stunden)
RESERVATION_PAYMENT_DEADLINE_HOURS=1
```

**Datei:** `backend/src/controllers/reservationController.ts`

**Erweiterung:**
```typescript
// Lade konfigurierbare Frist
const paymentDeadlineHours = parseInt(
  process.env.RESERVATION_PAYMENT_DEADLINE_HOURS || '1',
  10
);
const paymentDeadline = new Date();
paymentDeadline.setHours(paymentDeadline.getHours() + paymentDeadlineHours);
```

---

## 📝 Zusammenfassung: Was fehlt noch?

### Code

1. **Verfügbarkeitsprüfung:**
   - ❌ Test-Script für `/api/v2/available-rooms` Endpunkt
   - ❌ `checkAvailability()` Methode in `lobbyPmsService.ts`
   - ❌ `check_room_availability` Function in `whatsappAiService.ts` und `whatsappFunctionHandlers.ts`

2. **Reservierungserstellung via Bot:**
   - ❌ `create_reservation` Function in `whatsappAiService.ts` und `whatsappFunctionHandlers.ts`
   - ⚠️ Payment-Deadline bei Reservierungserstellung setzen (in `reservationController.ts` und `whatsappFunctionHandlers.ts`)

3. **Zahlungslink & Check-in-Link Versand:**
   - ✅ Bereits vorhanden (automatisch bei Reservierungserstellung)
   - ⚠️ Optional: Separate Function `send_reservation_links` für manuellen Versand

4. **Automatische Stornierung:**
   - ❌ Datenbank-Migration für `paymentDeadline`, `autoCancelEnabled`, `cancelledAt`, `cancelledBy`, `cancellationReason`
   - ❌ `ReservationAutoCancelScheduler` Service
   - ❌ Scheduler in `index.ts` starten
   - ❌ Payment-Deadline bei Reservierungserstellung setzen
   - ❌ LobbyPMS Stornierung (via `updateReservationStatus` mit Status 'cancelled')

### Datenbank

1. **Reservation Model erweitern:**
   ```prisma
   paymentDeadline        DateTime?
   autoCancelEnabled      Boolean   @default(true)
   cancelledAt            DateTime?
   cancelledBy            String?
   cancellationReason     String?
   ```

### Konfiguration

1. **Environment Variables:**
   ```env
   RESERVATION_PAYMENT_DEADLINE_HOURS=1
   ```

### Dokumentation

1. **API-Endpunkt Dokumentation:**
   - `/api/v2/available-rooms` Parameter und Response-Struktur dokumentieren
   - Nach Test-Ergebnissen aktualisieren

2. **Function Calling Dokumentation:**
   - Neue Functions in WhatsApp Bot Dokumentation aufnehmen
   - Beispiele für Bot-Nutzung hinzufügen

---

## 🚀 Implementierungsreihenfolge

### Schritt 1: API-Endpunkte testen ✅ TEILWEISE ABGESCHLOSSEN

**Status:**
1. ✅ **Verfügbarkeits-API getestet** - Funktioniert! Response-Struktur bekannt
2. ⚠️ **Reservierungserstellungs-API getestet** - Endpunkt existiert, benötigt `category_id`
3. ❌ **Stornierungs-API** - Noch nicht getestet

**Nächste Tests:**
1. Reservierungserstellung mit `category_id` testen:
   ```bash
   npx ts-node scripts/test-lobbypms-create-booking-with-category.ts
   ```

2. Stornierungs-API testen:
   ```bash
   npx ts-node scripts/test-lobbypms-cancel-booking.ts [booking_id]
   ```

### Schritt 2: Verfügbarkeitsprüfung implementieren (Priorität: HOCH)
1. Service-Methode `checkAvailability()` implementieren (basierend auf Test-Ergebnissen)
2. WhatsApp Function `check_room_availability` hinzufügen
3. Testen

### Schritt 3: Reservierungserstellung via Bot (Priorität: HOCH)
1. Mehrstufige Konversation implementieren:
   - Keyword-Erkennung
   - `startReservationCreation()` Methode
   - `continueReservationCreation()` Methode
   - Datum-Parsing implementieren
2. Payment-Deadline bei Erstellung setzen
3. Testen (komplette Konversation durchspielen)

### Schritt 4: Automatische Stornierung (Priorität: MITTEL)
1. Datenbank-Migration erstellen
2. Scheduler implementieren
3. Scheduler in Server starten
4. Testen

### Schritt 5: Optional - Manueller Link-Versand (Priorität: NIEDRIG)
1. Separate Function `send_reservation_links` hinzufügen
2. Testen

---

## ⚠️ Offene Fragen / Zu klären (MÜSSEN GETESTET WERDEN!)

**WICHTIG:** Alle Fragen müssen durch Tests beantwortet werden, keine Vermutungen!

1. **LobbyPMS API `/api/v2/available-rooms` (MUSS GETESTET WERDEN):**
   - ❓ Welche Parameter werden akzeptiert? (start_date, end_date, property_id, room_type, etc.)
   - ❓ Welche Daten werden zurückgegeben? (Feldnamen, Datentypen, Struktur)
   - ❓ Funktioniert der Endpunkt zuverlässig?
   - ❓ Welche Fehlermeldungen gibt es bei ungültigen Parametern?
   - ❓ Wie werden Preise formatiert?
   - ❓ Wie wird Verfügbarkeit angezeigt? (Anzahl Betten, Zimmer, etc.)

2. **Reservierungserstellung in LobbyPMS (MUSS GETESTET WERDEN):**
   - ❓ Gibt es einen API-Endpunkt zum Erstellen von Reservierungen?
   - ❓ Welcher Endpunkt? (POST /api/v1/bookings, POST /api/v2/bookings, etc.)
   - ❓ Welche Payload-Struktur wird erwartet?
   - ❓ Welche Felder sind erforderlich?
   - ❓ Oder müssen Reservierungen über die Website erstellt werden?
   - ❓ Falls Website: Wie funktioniert der Buchungsprozess? (nur als letzter Ausweg)

3. **Stornierung in LobbyPMS (MUSS GETESTET WERDEN):**
   - ❓ Funktioniert `updateReservationStatus(reservationId, 'cancelled')`?
   - ❓ Oder gibt es einen separaten Stornierungs-Endpunkt?
   - ❓ Welche Parameter werden benötigt?
   - ❓ Welche Response wird zurückgegeben?

4. **Payment-Deadline:**
   - ❓ Soll die Frist konfigurierbar pro Branch/Organisation sein?
   - ❓ Oder global für alle Reservierungen?
   - ❓ Standard-Frist: 1 Stunde? (zu klären)

5. **Benachrichtigung bei Stornierung:**
   - ❓ Soll der Gast bei automatischer Stornierung benachrichtigt werden?
   - ❓ Per WhatsApp oder E-Mail?
   - ❓ Welche Nachricht soll gesendet werden?

6. **Datum-Parsing:**
   - ❓ Welche Datumsformate sollen unterstützt werden?
   - ❓ Wie mit verschiedenen Sprachen umgehen? (DD/MM/YYYY vs MM/DD/YYYY)
   - ❓ Relative Daten ("morgen", "in 3 Tagen") in verschiedenen Sprachen

7. **Preisberechnung:**
   - ❓ Wie wird der Preis für die Reservierung berechnet?
   - ❓ Soll Preis aus Verfügbarkeitsprüfung übernommen werden?
   - ❓ Oder manuell eingeben?

---

---

## 🎯 WICHTIGSTE PUNKTE - ZUSAMMENFASSUNG

### ⚠️ KRITISCH: Tests zuerst!

**NICHTS implementieren ohne vorherige Tests!**

1. **API-Endpunkte testen:**
   - `/api/v2/available-rooms` - Alle Parameter-Kombinationen testen
   - Reservierungserstellungs-Endpunkt - Existiert er? Welche Struktur?
   - Stornierungs-Endpunkt - Funktioniert `updateReservationStatus`?

2. **Ergebnisse dokumentieren:**
   - Alle Test-Ergebnisse in separaten Dokumenten festhalten
   - Response-Strukturen vollständig dokumentieren
   - Fehlerfälle dokumentieren

### 📋 Mehrstufige Konversation

**Bot muss ALLE Informationen abfragen:**
1. Check-in Datum
2. Check-out Datum
3. Gästename
4. Zimmerart (private oder dorm)
5. Bestätigung

**Implementierung:**
- Ähnlich wie `startRequestCreation()` und `continueConversation()`
- Conversation State: `reservation_creation`
- Context speichert alle Schritte
- Datum-Parsing für verschiedene Formate und Sprachen

### 🔍 Verfügbarkeitsprüfung

**Vor Implementierung:**
- API-Endpunkt vollständig testen
- Response-Struktur dokumentieren
- Parameter-Kombinationen testen

**Nach Tests:**
- Service-Methode basierend auf tatsächlichen Ergebnissen implementieren
- Keine Vermutungen über Feldnamen oder Struktur

### 💰 Preisberechnung

**Zu klären:**
- Soll Preis aus Verfügbarkeitsprüfung übernommen werden?
- Oder manuell eingeben?
- Wie mit verschiedenen Zimmerarten umgehen?

### ⏰ Automatische Stornierung

**Implementierung:**
- Scheduler alle 5 Minuten
- Prüft Reservierungen mit überschrittener Payment-Deadline
- Storniert in LobbyPMS (wenn API funktioniert)
- Aktualisiert lokale Reservierung

**Zu klären:**
- Soll Gast benachrichtigt werden?
- Welche Nachricht?

---

**Erstellt:** 2025-01-26  
**Status:** ⚠️ PROBLEME IDENTIFIZIERT - Plan muss aktualisiert werden  
**Letzte Aktualisierung:** 2025-01-26 (Probleme aus User-Feedback)

---

## 🚨 AKTUELLE PROBLEME (2025-01-26)

### Problem 1: Sprache nur teilweise korrekt
**Status:** ⚠️ Teilweise behoben, aber noch nicht vollständig

**Ursache:**
- Deutsche Indikatoren wurden erweitert, aber funktionieren noch nicht zuverlässig
- "Haben wir Zimmer frei heute?" wird nicht als Deutsch erkannt

**Bereits implementiert:**
- ✅ Deutsche Indikatoren erweitert: "haben", "wir", "heute", "frei", "zimmer", etc.
- ✅ Function Definition unterstützt "today"/"heute"/"hoy"

**Noch zu prüfen:**
- ❓ Warum wird Deutsch immer noch nicht erkannt?
- ❓ Ist die Spracherkennung-Logik korrekt?
- ❓ Werden die neuen Indikatoren überhaupt verwendet?

### Problem 2: "primo deportista" fehlt weiterhin
**Status:** ❌ NICHT BEHOBEN

**Mögliche Ursachen:**
1. **API gibt es nicht zurück:**
   - Muss getestet werden mit `test-check-all-categories.ts`
   - Prüfen ob "primo deportista" in API-Response enthalten ist

2. **Filterung filtert es aus:**
   - `roomType`-Bestimmung: "primo deportista" wird als "privada" klassifiziert (Zeile 368-372 in `lobbyPmsService.ts`)
   - Hardcoded `category_id`-Checks: Nur 34280 und 34281 sind als "compartida" markiert
   - "primo deportista" hat möglicherweise eine andere `category_id`

3. **KI zeigt es nicht an:**
   - System Prompt sagt "zeige ALLE Zimmer", aber KI ignoriert es
   - Function-Ergebnis enthält es, aber KI filtert es in der Antwort

**Zu prüfen:**
- ❓ Gibt die API "primo deportista" zurück? (Test-Script ausführen)
- ❓ Welche `category_id` hat "primo deportista"?
- ❓ Wird es in der Function-Response zurückgegeben?
- ❓ Wird es in den Logs geloggt?

### Problem 3: Zimmer kann nicht gebucht werden
**Status:** ❌ NICHT IMPLEMENTIERT

**Ursache:**
- ❌ Es gibt KEINE Function `create_reservation` oder `book_room` für Zimmer!
- ✅ Es gibt nur `book_tour` für Touren
- ✅ Plan existiert in Dokumentation (Phase 2), aber nicht implementiert

**Was fehlt:**
1. **Function Definition:** `create_reservation` oder `book_room` in `whatsappAiService.ts`
2. **Function Handler:** `create_reservation` oder `book_room` in `whatsappFunctionHandlers.ts`
3. **Mehrstufige Konversation:** Ähnlich wie `startRequestCreation()` für Requests
4. **LobbyPMS API Integration:** Reservierung in LobbyPMS erstellen (falls API funktioniert)
5. **Payment Link & Check-in Link:** Automatisch generieren und senden

**Bereits vorhanden (wiederverwendbar):**
- ✅ `ReservationNotificationService.sendReservationInvitation()` - Payment-Link + Check-in-Link + WhatsApp
- ✅ `BoldPaymentService.createPaymentLink()` - Zahlungslink erstellen
- ✅ `generateLobbyPmsCheckInLink()` - Check-in-Link erstellen
- ✅ `prisma.reservation.create()` - Reservierung in DB erstellen

**Was implementiert werden muss:**
- ❌ Function Definition für `create_reservation` oder `book_room`
- ❌ Function Handler für `create_reservation` oder `book_room`
- ❌ Mehrstufige Konversation (Check-in, Check-out, Name, Zimmerart, Bestätigung)
- ❌ LobbyPMS API Integration (falls API funktioniert)
- ❌ Automatischer Payment-Deadline (1 Stunde)

### Problem 4: Vermischung von Themen (Zimmer vs. Touren)
**Status:** ❌ NICHT BEHOBEN

**Ursache:**
- Bot verwechselt Zimmer-Reservationen mit Touren
- Beispiel: User fragt nach "El primo aventurero" (Zimmer) → Bot antwortet mit Tour-Informationen

**Mögliche Ursachen:**
1. **System Prompt zu unklar:**
   - Keine klare Unterscheidung zwischen "Zimmer" und "Tour"
   - KI kann nicht richtig zwischen beiden unterscheiden

2. **Function Names zu ähnlich:**
   - `check_room_availability` vs. `get_tours`
   - `book_tour` vs. (fehlende) `create_reservation`

3. **Kontext fehlt:**
   - Wenn User "El primo aventurero" sagt, weiß KI nicht ob es ein Zimmer oder eine Tour ist
   - Keine Unterscheidung im System Prompt

**Zu prüfen:**
- ❓ Wie unterscheidet die KI zwischen Zimmern und Touren?
- ❓ Gibt es Keywords die helfen könnten?
- ❓ Sollte der System Prompt expliziter sein?

**Fix nötig:**
- System Prompt erweitern: Klare Unterscheidung zwischen "Zimmer/Reservation" und "Tour"
- Beispiele hinzufügen: "El primo aventurero" = Zimmer, nicht Tour
- Function Descriptions erweitern: Explizit sagen wann welche Function verwendet werden soll

---

## 📋 UPDATED IMPLEMENTIERUNGSPLAN

### Priorität 1: "primo deportista" Problem lösen

#### Schritt 1.1: Test-Script ausführen
**Befehl:**
```bash
cd /var/www/intranet/backend
npx ts-node scripts/test-check-all-categories.ts 3 2025-11-28 2025-11-29
```

**Zu prüfen:**
- Gibt die API "primo deportista" zurück?
- Welche `category_id` hat es?
- Welche `roomType` wird zugewiesen?
- Wird es in den Logs geloggt?

#### Schritt 1.2: Logs prüfen
**Befehl:**
```bash
pm2 logs intranet-backend --lines 200 --nostream | grep "check_room_availability\|primo deportista"
```

**Zu prüfen:**
- Wird "primo deportista" in den Logs geloggt?
- Wird es in der Function-Response zurückgegeben?
- Wird es an die KI übergeben?

#### Schritt 1.3: Fix implementieren (nach Analyse)
**Mögliche Fixes:**
1. **Wenn API es nicht zurückgibt:**
   - API-Parameter prüfen
   - Property-ID prüfen
   - Datum prüfen

2. **Wenn Filterung es ausschließt:**
   - `roomType`-Bestimmung anpassen
   - Hardcoded `category_id`-Checks erweitern
   - Filterung entfernen/anpassen

3. **Wenn KI es nicht anzeigt:**
   - System Prompt noch expliziter machen
   - Function-Response-Format prüfen
   - KI-Response prüfen

### Priorität 2: Zimmer-Buchung implementieren

#### Schritt 2.1: Function Definition hinzufügen
**Datei:** `backend/src/services/whatsappAiService.ts`

**Neue Function:**
```typescript
{
  type: 'function',
  function: {
    name: 'create_room_reservation',
    description: 'Erstellt eine Zimmer-Reservation für den aktuellen Branch. WICHTIG: Nur für ZIMMER verwenden, NICHT für Touren! Benötigt: checkInDate, checkOutDate, guestName, roomType (compartida/privada), categoryId (optional, aus check_room_availability), guestPhone (optional), guestEmail (optional). Generiert automatisch Payment Link und Check-in-Link. Setzt Payment-Deadline auf 1 Stunde.',
    parameters: {
      type: 'object',
      properties: {
        checkInDate: { 
          type: 'string', 
          description: 'Check-in Datum (YYYY-MM-DD oder "today"/"heute"/"hoy"). Verwende IMMER "today" wenn der User "heute" sagt!' 
        },
        checkOutDate: { 
          type: 'string', 
          description: 'Check-out Datum (YYYY-MM-DD oder "today"/"heute"/"hoy")' 
        },
        guestName: { 
          type: 'string', 
          description: 'Name des Gastes (vollständiger Name)' 
        },
        roomType: { 
          type: 'string', 
          enum: ['compartida', 'privada'], 
          description: 'Zimmerart: "compartida" für Dorm-Zimmer, "privada" für private Zimmer' 
        },
        categoryId: { 
          type: 'number', 
          description: 'Category ID des Zimmers (optional, aus check_room_availability Ergebnis). Wenn User eine Nummer wählt (z.B. "2."), verwende die categoryId des entsprechenden Zimmers aus der Liste.' 
        },
        guestPhone: { 
          type: 'string', 
          description: 'Telefonnummer des Gastes (optional, wird aus WhatsApp-Kontext verwendet wenn nicht angegeben)' 
        },
        guestEmail: { 
          type: 'string', 
          description: 'E-Mail des Gastes (optional)' 
        }
      },
      required: ['checkInDate', 'checkOutDate', 'guestName', 'roomType']
    }
  }
}
```

**WICHTIG:**
- Function verwendet IMMER `branchId` aus Context (wird automatisch übergeben)
- Reservierung wird IMMER für den aktuellen Branch erstellt
- Keine `branchId` als Parameter nötig (wird aus Context verwendet)

#### Schritt 2.2: Function Handler implementieren
**Datei:** `backend/src/services/whatsappFunctionHandlers.ts`

**Neue Function (VOLLSTÄNDIG):**
```typescript
/**
 * Erstellt eine Zimmer-Reservation für den aktuellen Branch
 * WICHTIG: Nur für ZIMMER, nicht für Touren!
 */
static async create_room_reservation(
  args: {
    checkInDate: string;
    checkOutDate: string;
    guestName: string;
    roomType: 'compartida' | 'privada';
    categoryId?: number;
    guestPhone?: string;
    guestEmail?: string;
  },
  userId: number | null,
  roleId: number | null,
  branchId: number // WICHTIG: Wird automatisch aus Context übergeben
): Promise<any> {
  try {
    // 1. Parse Datum (unterstützt "today"/"heute"/"hoy")
    let checkInDate: Date;
    const checkInDateStr = args.checkInDate.toLowerCase().trim();
    if (checkInDateStr === 'today' || checkInDateStr === 'heute' || checkInDateStr === 'hoy') {
      checkInDate = new Date();
      checkInDate.setHours(0, 0, 0, 0);
    } else {
      checkInDate = new Date(args.checkInDate);
      if (isNaN(checkInDate.getTime())) {
        throw new Error(`Ungültiges Check-in Datum: ${args.checkInDate}`);
      }
    }

    let checkOutDate: Date;
    const checkOutDateStr = args.checkOutDate.toLowerCase().trim();
    if (checkOutDateStr === 'today' || checkOutDateStr === 'heute' || checkOutDateStr === 'hoy') {
      checkOutDate = new Date();
      checkOutDate.setHours(23, 59, 59, 999);
    } else {
      checkOutDate = new Date(args.checkOutDate);
      if (isNaN(checkOutDate.getTime())) {
        throw new Error(`Ungültiges Check-out Datum: ${args.checkOutDate}`);
      }
    }

    // 2. Validierung: Check-out muss nach Check-in liegen
    if (checkOutDate <= checkInDate) {
      throw new Error('Check-out Datum muss nach Check-in Datum liegen');
    }

    // 3. Hole Branch für organizationId (WICHTIG: branchId aus Context verwenden!)
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { 
        id: true,
        name: true,
        organizationId: true 
      }
    });

    if (!branch) {
      throw new Error(`Branch ${branchId} nicht gefunden`);
    }

    // 4. Berechne Betrag (vereinfacht - sollte aus Verfügbarkeitsprüfung kommen)
    // TODO: Preis aus categoryId/Verfügbarkeitsprüfung übernehmen
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
    const estimatedAmount = nights * 50000; // Platzhalter - sollte aus Verfügbarkeit kommen

    // 5. Erstelle Reservierung in DB (WICHTIG: branchId setzen!)
    const reservation = await prisma.reservation.create({
      data: {
        guestName: args.guestName.trim(),
        guestPhone: args.guestPhone?.trim() || null,
        guestEmail: args.guestEmail?.trim() || null,
        checkInDate: checkInDate,
        checkOutDate: checkOutDate,
        status: ReservationStatus.confirmed,
        paymentStatus: PaymentStatus.pending,
        amount: estimatedAmount,
        currency: 'COP',
        organizationId: branch.organizationId,
        branchId: branchId, // WICHTIG: Branch-spezifisch!
        paymentDeadline: new Date(Date.now() + 60 * 60 * 1000), // 1 Stunde
        autoCancelEnabled: true
      }
    });

    // 6. Erstelle Payment Link (wenn Telefonnummer vorhanden)
    let paymentLink: string | null = null;
    if (args.guestPhone || reservation.guestPhone) {
      try {
        const boldPaymentService = await BoldPaymentService.createForBranch(branchId);
        paymentLink = await boldPaymentService.createPaymentLink(
          reservation,
          estimatedAmount,
          'COP',
          `Zahlung für Reservierung ${reservation.guestName}`
        );
        
        // Aktualisiere Reservierung mit Payment Link
        await prisma.reservation.update({
          where: { id: reservation.id },
          data: { paymentLink }
        });
      } catch (error) {
        console.error('[create_room_reservation] Fehler beim Erstellen des Payment-Links:', error);
        // Nicht abbrechen, nur loggen
      }
    }

    // 7. Sende Links per WhatsApp (wenn Telefonnummer vorhanden)
    let linksSent = false;
    if (args.guestPhone || reservation.guestPhone) {
      try {
        await ReservationNotificationService.sendReservationInvitation(
          reservation.id,
          {
            guestPhone: args.guestPhone || reservation.guestPhone || undefined,
            amount: estimatedAmount,
            currency: 'COP'
          }
        );
        linksSent = true;
      } catch (error) {
        console.error('[create_room_reservation] Fehler beim Versand der Links:', error);
        // Nicht abbrechen, nur loggen
      }
    }

    // 8. Return Ergebnis
    return {
      success: true,
      reservationId: reservation.id,
      branchId: branchId, // WICHTIG: Branch-ID zurückgeben
      branchName: branch.name,
      guestName: reservation.guestName,
      checkInDate: checkInDate.toISOString().split('T')[0],
      checkOutDate: checkOutDate.toISOString().split('T')[0],
      roomType: args.roomType,
      categoryId: args.categoryId || null,
      amount: estimatedAmount,
      currency: 'COP',
      paymentLink: paymentLink,
      paymentDeadline: reservation.paymentDeadline?.toISOString() || null,
      linksSent: linksSent,
      message: linksSent 
        ? 'Reservierung erstellt. Zahlungslink und Check-in-Link wurden per WhatsApp gesendet. Bitte zahlen Sie innerhalb von 1 Stunde, sonst wird die Reservierung automatisch storniert.'
        : 'Reservierung erstellt. Bitte Zahlungslink und Check-in-Link manuell senden. Bitte zahlen Sie innerhalb von 1 Stunde, sonst wird die Reservierung automatisch storniert.'
    };
  } catch (error: any) {
    console.error('[WhatsApp Function Handlers] create_room_reservation Fehler:', error);
    throw error;
  }
}
```

**WICHTIG:**
- ✅ `branchId` wird IMMER aus Context verwendet (Parameter, nicht aus args)
- ✅ Reservierung wird IMMER für den aktuellen Branch erstellt
- ✅ Payment Link wird mit `BoldPaymentService.createForBranch(branchId)` erstellt
- ✅ Check-in Link wird automatisch generiert (via `ReservationNotificationService`)
- ✅ Payment-Deadline wird auf 1 Stunde gesetzt
- ✅ Auto-Cancel ist aktiviert

#### Schritt 2.3: System Prompt erweitern
**Datei:** `backend/src/services/whatsappAiService.ts`

**Erweiterungen:**
- Klare Unterscheidung: "Zimmer/Reservation" vs. "Tour"
- Beispiele für Zimmer-Namen: "El primo aventurero", "El abuelo viajero", "primo deportista", "La tia artista"
- Anweisung: `create_room_reservation` für Zimmer, `book_tour` für Touren
- Anweisung: Wenn User eine Nummer wählt (z.B. "2."), verwende die `categoryId` des entsprechenden Zimmers
- Anweisung: Wenn User sagt "reserviere mir das" oder "buchen", verwende `create_room_reservation`
- WICHTIG: Alle Reservierungen sind Branch-spezifisch (Bot ist pro Branch)

### Priorität 3: Sprache vollständig beheben (DE/ES/EN)

#### Schritt 3.1: Sprach-Erkennung aus Telefonnummer korrigieren
**Datei:** `backend/src/services/languageDetectionService.ts`

**Problem identifiziert:**
- Zeile 18: Deutschland (49) → 'en' (sollte 'de' sein!)
- Zeile 19: Schweiz (41) → 'es' (sollte 'de' sein!)

**Fix:**
```typescript
const countryCodeMap: Record<string, string> = {
  '57': 'es', // Kolumbien
  '49': 'de', // Deutschland → DEUTSCH (korrigiert!)
  '41': 'de', // Schweiz → DEUTSCH (korrigiert!)
  '1': 'en',  // USA/Kanada
  '34': 'es', // Spanien
  '33': 'fr', // Frankreich → Französisch (optional)
  '39': 'it', // Italien → Italienisch (optional)
  '44': 'en', // UK
  '52': 'es', // Mexiko
  '54': 'es', // Argentinien
  '55': 'pt', // Brasilien → Portugiesisch (optional)
  // ... weitere
};
```

#### Schritt 3.2: Sprach-Erkennung aus Nachricht verbessern
**Datei:** `backend/src/services/whatsappAiService.ts`

**Bereits vorhanden:**
- ✅ Deutsche Indikatoren erweitert: "haben", "wir", "heute", "frei", "zimmer", etc.
- ✅ Spanische Indikatoren vorhanden
- ✅ Englische Indikatoren vorhanden

**Zu prüfen:**
- Werden die neuen deutschen Indikatoren verwendet?
- Funktioniert `detectLanguageFromMessage()` korrekt?
- Wird `finalLanguage` korrekt gesetzt?

**Mögliche Verbesserungen:**
- Weitere deutsche Wörter hinzufügen: "reservieren", "buchen", "zimmer", "bett", "preis", "kosten", "nacht", "tage"
- Weitere spanische Wörter: "reservar", "habitación", "cama", "precio", "noche", "días"
- Weitere englische Wörter: "reserve", "book", "room", "bed", "price", "night", "days"

#### Schritt 3.3: Sprach-Konsistenz sicherstellen
**Datei:** `backend/src/services/whatsappAiService.ts`

**Problem:**
- Bot antwortet manchmal in falscher Sprache (z.B. Deutsch → Spanisch)

**Fix:**
- System Prompt erweitern: "Antworte IMMER in derselben Sprache wie der User!"
- Language Instruction am Anfang des Prompts (bereits vorhanden, aber prüfen ob funktioniert)
- Fallback: Wenn Sprache nicht erkannt wird, verwende Telefonnummer-Sprache (aber korrigiert!)

**WICHTIG:**
- ✅ DE/ES/EN müssen mindestens funktionieren
- ✅ Bot muss in derselben Sprache antworten wie User schreibt
- ✅ Language Instruction hat höchste Priorität im System Prompt

### Priorität 4: Vermischung von Themen beheben (Zimmer vs. Touren)

#### Schritt 4.1: System Prompt erweitern
**Datei:** `backend/src/services/whatsappAiService.ts`

**Erweiterungen:**
- Explizite Unterscheidung: "Zimmer/Reservation" vs. "Tour"
- Beispiele für Zimmer-Namen: "El primo aventurero", "El abuelo viajero", "primo deportista", "La tia artista"
- Anweisung: Wenn User Zimmer-Namen sagt → `check_room_availability` oder `create_room_reservation`
- Anweisung: Wenn User Tour-Namen sagt → `get_tours` oder `book_tour`
- Anweisung: Wenn User "reserviere", "buchen", "reservar", "book" sagt → Prüfe Kontext:
  - Wenn vorher Zimmer-Verfügbarkeit gezeigt wurde → `create_room_reservation`
  - Wenn vorher Touren gezeigt wurden → `book_tour`
  - Wenn unklar → Frage nach, aber NICHT "Möchtest du ein Zimmer buchen oder handelt es sich um eine Tour?" (zu verwirrend!)

**WICHTIG:**
- Bot ist pro Branch → Alle Reservierungen sind Branch-spezifisch
- Zimmer-Namen sind Branch-spezifisch (z.B. "El primo aventurero" existiert nur in bestimmten Branches)
- Tour-Namen sind Branch-spezifisch (oder global, je nach Konfiguration)

---

## 🔍 BRANCH-SPEZIFITÄT - WICHTIG!

### Aktueller Status:
- ✅ `check_room_availability` verwendet bereits `branchId` aus Context (Zeile 572, 575)
- ✅ `LobbyPmsService.createForBranch(branchId)` wird verwendet
- ✅ Reservierungen haben `branchId` Feld im Schema
- ✅ `ReservationNotificationService` verwendet `branchId` für Payment Links

### Was sichergestellt werden muss:

1. **create_room_reservation:**
   - ✅ `branchId` wird aus Context übergeben (Parameter, nicht aus args)
   - ✅ Reservierung wird IMMER für den aktuellen Branch erstellt
   - ✅ Payment Link wird mit `BoldPaymentService.createForBranch(branchId)` erstellt
   - ✅ Check-in Link wird automatisch generiert (Branch-spezifisch)

2. **System Prompt:**
   - Anweisung: "Alle Reservierungen sind Branch-spezifisch. Verwende IMMER den Branch aus dem Kontext."
   - Anweisung: "Zeige nur Zimmer/Touren des aktuellen Branches an."

3. **Verfügbarkeitsprüfung:**
   - ✅ Bereits implementiert: `LobbyPmsService.createForBranch(branchId)`
   - ✅ API verwendet Branch-spezifische Settings (propertyId, apiKey)

4. **Reservierungen:**
   - ✅ Schema hat `branchId` Feld
   - ✅ Alle Reservierungen müssen `branchId` haben
   - ✅ Filterung nach Branch in Queries (bereits vorhanden in `reservationController.ts`)

---

## ❓ OFFENE FRAGEN

1. **"primo deportista":**
   - ❓ Gibt die API es zurück? (Muss getestet werden)
   - ❓ Welche `category_id` hat es?
   - ❓ Wird es in den Logs geloggt?
   - ❓ Ist es Branch-spezifisch? (Welcher Branch hat "primo deportista"?)

2. **Zimmer-Buchung:**
   - ✅ Entscheidung: KI kann direkt `create_room_reservation` aufrufen (keine mehrstufige Konversation nötig)
   - ✅ Informationen: Check-in, Check-out, Name, Zimmerart, Category ID (optional)
   - ✅ Kontext-Erkennung: KI soll Informationen aus vorherigen Nachrichten ableiten können
   - ❓ Soll LobbyPMS API verwendet werden? (Muss getestet werden)
   - ❓ Oder nur lokal erstellen? (Wahrscheinlich nur lokal, da API-Tests noch ausstehen)

3. **LobbyPMS API:**
   - ❓ Funktioniert die Reservierungserstellung-API? (Muss getestet werden)
   - ❓ Welche Parameter sind erforderlich?
   - ❓ Oder soll nur lokal erstellt werden? (Wahrscheinlich nur lokal für jetzt)

4. **Preisberechnung:**
   - ❓ Soll Preis aus `check_room_availability` übernommen werden?
   - ❓ Oder manuell berechnet? (Aktuell: Platzhalter 50.000 COP/Nacht)
   - ❓ Wie mit verschiedenen Personenanzahl umgehen?

5. **Auswahl-Verarbeitung:**
   - ❓ Wenn User "2." wählt, wie wird die `categoryId` zugeordnet?
   - ❓ Soll die KI die `categoryId` aus der vorherigen `check_room_availability` Response verwenden?
   - ❓ Oder soll der User explizit die `categoryId` angeben?

---

## ✅ ZUSAMMENFASSUNG DER ANFORDERUNGEN

### Muss funktionieren:
1. ✅ **Sprache:** DE/ES/EN müssen mindestens funktionieren
2. ✅ **Branch-Spezifität:** Bot ist pro Branch → Alle Reservierungen sind Branch-spezifisch
3. ✅ **Zimmer-Buchung:** `create_room_reservation` Function implementieren
4. ✅ **Vermischung:** Klare Unterscheidung zwischen Zimmer und Touren
5. ✅ **"primo deportista":** Problem lösen (Test-Script ausführen)

### Implementierungsreihenfolge:
1. **Priorität 1:** "primo deportista" Problem lösen (Test-Script)
2. **Priorität 2:** `create_room_reservation` implementieren (mit Branch-Spezifität)
3. **Priorität 3:** Sprache korrigieren (DE/ES/EN)
4. **Priorität 4:** Vermischung beheben (System Prompt)

---

**Erstellt:** 2025-01-26  
**Status:** ⚠️ PROBLEME IDENTIFIZIERT - Plan aktualisiert  
**Nächster Schritt:** Test-Script ausführen, Logs prüfen, dann Fixes implementieren

---

## 🧪 TEST-SCRIPTS ERSTELLT

### Verfügbare Test-Scripts:

1. **`backend/scripts/test-lobbypms-availability.ts`**
   - Testet `/api/v2/available-rooms` Endpunkt
   - Verschiedene Parameter-Kombinationen
   - Speichert Ergebnisse in `lobbypms-availability-test-results.json`

2. **`backend/scripts/test-lobbypms-create-booking.ts`**
   - Testet verschiedene Endpunkte zum Erstellen von Reservierungen
   - Verschiedene Payload-Strukturen
   - Speichert Ergebnisse in `lobbypms-create-booking-test-results.json`

3. **`backend/scripts/test-lobbypms-cancel-booking.ts`**
   - Testet Stornierungs-Endpunkte
   - Testet `updateReservationStatus()` mit 'cancelled'
   - Verwendung: `npx ts-node backend/scripts/test-lobbypms-cancel-booking.ts [booking_id]`

### Server-Befehle zum Ausführen:

**WICHTIG:** Diese Befehle auf dem Server ausführen!

```bash
# 1. Verfügbarkeits-API testen
cd /path/to/intranet/backend
npx ts-node scripts/test-lobbypms-availability.ts

# 2. Reservierungserstellungs-API testen
npx ts-node scripts/test-lobbypms-create-booking.ts

# 3. Stornierungs-API testen (mit booking_id)
npx ts-node scripts/test-lobbypms-cancel-booking.ts [booking_id]

# Oder ohne booking_id (verwendet erste Reservierung aus DB)
npx ts-node scripts/test-lobbypms-cancel-booking.ts
```

**Ergebnisse:**
- Verfügbarkeit: `backend/lobbypms-availability-test-results.json`
- Booking Creation: `backend/lobbypms-create-booking-test-results.json`
- Cancel: Wird in Console ausgegeben

---

## 📋 WIEDERVERWENDBARE KOMPONENTEN

Siehe: `docs/implementation_plans/LOBBYPMS_KI_BOT_WIEDERVERWENDUNG.md`

**Zusammenfassung:**
- ✅ `ReservationNotificationService.sendReservationInvitation()` - Komplett: Payment-Link + Check-in-Link + WhatsApp
- ✅ `BoldPaymentService.createPaymentLink()` - Zahlungslink erstellen
- ✅ `generateLobbyPmsCheckInLink()` - Check-in-Link erstellen
- ✅ `WhatsAppService.sendMessageWithFallback()` - WhatsApp-Nachricht senden
- ✅ Conversation State Management Pattern
- ✅ Reservierungserstellung (prisma.reservation.create)


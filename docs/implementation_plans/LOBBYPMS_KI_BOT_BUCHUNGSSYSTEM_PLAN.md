# LobbyPMS KI-Bot Buchungssystem - Analyse und Implementierungsplan

**Datum:** 2025-01-26  
**Status:** Analyse & Plan - NICHTS UMSETZEN  
**Ziel:** KI-Bot soll Zugang zum Buchungssystem haben und Reservierungen erstellen, Zahlungs- und Check-in-Links senden können, sowie automatische Stornierung bei nicht bezahlten Reservierungen

---

## 📋 Zusammenfassung der Anforderungen

1. **Verfügbarkeitsprüfung:** Bot soll angeben können, ob Zimmer/Betten frei sind & zu welchem Preis
2. **Reservierung erstellen:** Bot soll auf Wunsch eine Reservierung erstellen können
3. **Zahlungslink & Check-in-Link:** Bot soll auf Wunsch Zahlungslink & Check-in-Link erstellen & senden können
4. **Automatische Stornierung:** Wenn Zahlung nicht innerhalb einer bestimmten Frist (z.B. 1h) gezahlt ist, soll die Reservierung automatisch storniert werden

**Technische Anforderung:**
- Entweder direkt LobbyPMS API verwenden, oder über die Website buchen
- Wir haben keine LobbyPMS API-Dokumentation, nur die Befehle die umgesetzt sind & funktionieren
- Von bestehenden Implementierungen ableiten

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

#### Schritt 1.1: API-Endpunkt testen

**Ziel:** Herausfinden, welche Parameter `/api/v2/available-rooms` akzeptiert und welche Daten zurückgegeben werden

**Vorgehen:**
1. Test-Script erstellen: `backend/scripts/test-lobbypms-availability.ts`
2. Verschiedene Parameter-Kombinationen testen:
   - `start_date` (erforderlich)
   - `end_date` (optional?)
   - `property_id` (optional?)
   - `category_id` (optional?)
   - `room_type` (optional?)
3. Response-Struktur dokumentieren
4. Fehlerbehandlung testen

**Erwartete Response (zu verifizieren):**
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

#### Schritt 1.2: Service-Methode implementieren

**Datei:** `backend/src/services/lobbyPmsService.ts`

**Neue Methode:**
```typescript
/**
 * Prüft Verfügbarkeit von Zimmern/Betten für einen Zeitraum
 * 
 * @param startDate - Check-in Datum
 * @param endDate - Check-out Datum
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
    const params: any = {
      start_date: this.formatDate(startDate), // Format: "YYYY-MM-DD"
      end_date: this.formatDate(endDate)
    };

    if (this.propertyId) {
      params.property_id = this.propertyId;
    }

    const response = await this.axiosInstance.get<any>(
      '/api/v2/available-rooms',
      { params }
    );

    // Response-Struktur muss getestet werden
    // Annahme: { data: [...] } oder direkt Array
    const availabilityData = response.data.data || response.data || [];
    
    return availabilityData.map((item: any) => ({
      roomId: item.room_id,
      roomName: item.room_name || item.name,
      roomType: item.room_type || item.type,
      availableBeds: item.available_beds || item.available,
      totalBeds: item.total_beds || item.total,
      pricePerNight: item.price_per_night || item.price,
      currency: item.currency || 'COP'
    }));
  } catch (error) {
    // Fehlerbehandlung
    throw error;
  }
}

interface AvailabilityResult {
  roomId: number;
  roomName: string;
  roomType: 'compartida' | 'privada';
  availableBeds: number;
  totalBeds: number;
  pricePerNight: number;
  currency: string;
}
```

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

#### Schritt 2.1: WhatsApp Function hinzufügen

**Datei:** `backend/src/services/whatsappAiService.ts`

**Neue Function Definition:**
```typescript
{
  type: 'function',
  function: {
    name: 'create_reservation',
    description: 'Erstellt eine neue Reservierung. Benötigt Gästename, Check-in/Check-out Datum, Kontaktinformationen und Betrag.',
    parameters: {
      type: 'object',
      properties: {
        guestName: {
          type: 'string',
          description: 'Name des Gastes (Vor- und Nachname)'
        },
        checkInDate: {
          type: 'string',
          description: 'Check-in Datum im Format YYYY-MM-DD'
        },
        checkOutDate: {
          type: 'string',
          description: 'Check-out Datum im Format YYYY-MM-DD'
        },
        guestPhone: {
          type: 'string',
          description: 'Telefonnummer des Gastes (optional, aber empfohlen für WhatsApp-Versand)'
        },
        guestEmail: {
          type: 'string',
          description: 'E-Mail-Adresse des Gastes (optional)'
        },
        amount: {
          type: 'number',
          description: 'Betrag der Reservierung'
        },
        currency: {
          type: 'string',
          description: 'Währung (Standard: COP)',
          default: 'COP'
        },
        branchId: {
          type: 'number',
          description: 'Branch ID (optional, verwendet aktuellen Branch wenn nicht angegeben)'
        }
      },
      required: ['guestName', 'checkInDate', 'checkOutDate', 'amount']
    }
  }
}
```

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

### Schritt 1: Verfügbarkeitsprüfung (Priorität: HOCH)
1. Test-Script erstellen und ausführen
2. API-Endpunkt dokumentieren
3. Service-Methode implementieren
4. WhatsApp Function hinzufügen
5. Testen

### Schritt 2: Reservierungserstellung via Bot (Priorität: HOCH)
1. WhatsApp Function hinzufügen
2. Payment-Deadline bei Erstellung setzen
3. Testen

### Schritt 3: Automatische Stornierung (Priorität: MITTEL)
1. Datenbank-Migration erstellen
2. Scheduler implementieren
3. Scheduler in Server starten
4. Testen

### Schritt 4: Optional - Manueller Link-Versand (Priorität: NIEDRIG)
1. Separate Function `send_reservation_links` hinzufügen
2. Testen

---

## ⚠️ Offene Fragen / Zu klären

1. **LobbyPMS API `/api/v2/available-rooms`:**
   - Welche Parameter werden akzeptiert?
   - Welche Daten werden zurückgegeben?
   - Funktioniert der Endpunkt zuverlässig?

2. **Reservierungserstellung in LobbyPMS:**
   - Gibt es einen API-Endpunkt zum Erstellen von Reservierungen?
   - Oder müssen Reservierungen über die Website erstellt werden?
   - Falls Website: Wie funktioniert der Buchungsprozess?

3. **Stornierung in LobbyPMS:**
   - Funktioniert `updateReservationStatus(reservationId, 'cancelled')`?
   - Oder gibt es einen separaten Stornierungs-Endpunkt?

4. **Payment-Deadline:**
   - Soll die Frist konfigurierbar pro Branch/Organisation sein?
   - Oder global für alle Reservierungen?

5. **Benachrichtigung bei Stornierung:**
   - Soll der Gast bei automatischer Stornierung benachrichtigt werden?
   - Per WhatsApp oder E-Mail?

---

**Erstellt:** 2025-01-26  
**Status:** ✅ ANALYSE ABGESCHLOSSEN - Plan erstellt, NICHTS UMSETZEN


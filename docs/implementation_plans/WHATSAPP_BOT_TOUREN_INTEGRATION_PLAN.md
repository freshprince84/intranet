# WhatsApp Bot - Touren-Integration - Analyse und Implementierungsplan

**Datum:** 2025-01-26  
**Status:** Analyse & Plan - NICHTS UMSETZEN  
**Ziel:** KI-Bot soll Zugang zu Touren haben, Auskunft geben, Bilder versenden, Reservierungen erstellen können, Zahlungslink erhalten, nach Zahlung Tour buchen & Bestätigung erhalten, automatische Stornierung bei nicht bezahlter Zahlung

---

## 📋 Zusammenfassung der Anforderungen

1. **Tour-Informationen abrufen:**
   - Bot soll Auskunft über Touren geben können
   - Bilder von Touren versenden können
   - Informationen aus allen Feldern liefern können

2. **Tour-Reservierung erstellen:**
   - Bot soll auf Wunsch eine Reservation für eine Tour erstellen können
   - Zahlungslink erhalten
   - Nach Zahlung: Tour buchen & Bestätigung erhalten

3. **Automatische Stornierung:**
   - Sollte die Zahlung nicht innerhalb einer bestimmten Frist (z.B. 1h) gezahlt sein, soll die Reservation wieder storniert werden

4. **Bestehende Komponenten verwenden:**
   - Bestehende Tour-Komponenten sollen verwendet werden

---

## 🔍 Analyse: Was besteht bereits?

### 1. Tour-Infrastruktur

**Datenbank-Models:**
- ✅ `Tour` Model existiert (id, title, description, type, price, imageUrl, galleryUrls, etc.)
- ✅ `TourBooking` Model existiert (id, tourId, customerName, customerPhone, customerEmail, paymentStatus, paymentLink, etc.)
- ✅ `TourReservation` Model existiert (Verknüpfung Tour <-> Reservation)
- ✅ `TourProvider` Model existiert (externe Anbieter)
- ✅ `TourWhatsAppMessage` Model existiert (Kommunikation mit Anbietern)

**Backend-Controller:**
- ✅ `tourController.ts` - CRUD für Touren
- ✅ `tourBookingController.ts` - CRUD für Buchungen, Payment-Link-Generierung
- ✅ `tourReservationController.ts` - Verknüpfung Tour-Reservation
- ✅ `tourProviderController.ts` - CRUD für Anbieter

**Backend-Services:**
- ✅ `tourWhatsAppService.ts` - WhatsApp-Kommunikation mit externen Anbietern
- ✅ `tourNotificationService.ts` - Notifications für Touren
- ✅ `commissionService.ts` - Kommissions-Berechnung
- ✅ `boldPaymentService.ts` - Payment-Link-Generierung (bereits für TourBookings verwendet)

**Frontend-Komponenten:**
- ✅ `ToursTab.tsx` - Tour-Verwaltung im Worktracker
- ✅ `TourDetailsModal.tsx` - Tour-Details anzeigen
- ✅ `CreateTourBookingModal.tsx` - Buchung erstellen
- ✅ `TourBookingsModal.tsx` - Buchungen anzeigen
- ✅ `TourReservationLinkModal.tsx` - Tour mit Reservation verknüpfen

**API-Endpunkte:**
- ✅ `GET /api/tours` - Alle Touren
- ✅ `GET /api/tours/:id` - Einzelne Tour
- ✅ `POST /api/tour-bookings` - Buchung erstellen (generiert bereits Payment Link)
- ✅ `GET /api/tour-bookings` - Alle Buchungen

### 2. WhatsApp Bot-Infrastruktur

**Bestehende Services:**
- ✅ `whatsappMessageHandler.ts` - Hauptlogik für Nachrichtenverarbeitung
- ✅ `whatsappAiService.ts` - OpenAI GPT-4o Integration mit Function Calling
- ✅ `whatsappFunctionHandlers.ts` - Function Handlers (get_requests, get_todos, get_worktime, get_cerebro_articles, get_user_info)
- ✅ `whatsappGuestService.ts` - Gast-Identifikation (identifyGuestByPhone, checkReservationStatus, getPaymentLink, getCheckInLink)

**Bestehende Function Calling:**
- ✅ OpenAI Function Calling implementiert
- ✅ Function Definitions werden dynamisch generiert
- ✅ Function Handlers mit Berechtigungsprüfung
- ✅ Context wird an KI übergeben (userId, roleId, branchId)

**Bestehende Features:**
- ✅ Keyword-Erkennung (requests, todos)
- ✅ User-Identifikation via Telefonnummer
- ✅ Conversation State Management
- ✅ Branch-basierte Konfiguration
- ✅ Sprach-Erkennung
- ✅ Gruppen-Chat-Unterstützung

### 3. Payment-Infrastruktur

**Bold Payment Service:**
- ✅ `boldPaymentService.ts` - Erstellt Payment Links
- ✅ `createPaymentLink()` - Generiert Payment Link für Reservationen
- ✅ Webhook-Handler für Zahlungs-Updates
- ✅ Payment Status wird automatisch aktualisiert (via Webhook)

**TourBooking Payment:**
- ✅ Payment Link wird bei Buchungserstellung generiert (in `createTourBooking`)
- ✅ Workaround: Erstellt "Dummy"-Reservation für Payment Link (Bold Payment erwartet Reservation)
- ✅ Payment Link wird in `tourBooking.paymentLink` gespeichert

### 4. Automatische Stornierung

**Reservation Model:**
- ❌ `paymentDeadline` Feld existiert NICHT im Schema (nur in Planungsdokumenten erwähnt)
- ❌ `autoCancelEnabled` Feld existiert NICHT im Schema
- ❌ Kein automatischer Scheduler für Stornierungen vorhanden

**TourBooking Model:**
- ❌ `paymentDeadline` Feld existiert NICHT
- ❌ `autoCancelEnabled` Feld existiert NICHT
- ❌ Kein automatischer Scheduler für Stornierungen vorhanden

**Bestehende Scheduler:**
- ✅ `reservationScheduler.ts` existiert (für andere Zwecke)
- ✅ Queue-System (BullMQ mit Redis) existiert
- ✅ Timer-System existiert (in `backend/src/index.ts`)

---

## 🎯 Was fehlt noch?

### 1. Datenbank-Erweiterungen

**TourBooking Model erweitern:**
```prisma
model TourBooking {
  // ... bestehende Felder ...
  
  // NEU: Automatische Stornierung
  paymentDeadline    DateTime?  // Frist für Zahlung (z.B. jetzt + 1h)
  autoCancelEnabled  Boolean    @default(false) // Automatische Stornierung aktiviert?
  reservedUntil      DateTime?  // Bis wann ist die Reservation reserviert (für Anzeige)
}
```

**Migration erforderlich:**
- Neue Felder zu `TourBooking` hinzufügen
- Index auf `paymentDeadline` für effiziente Queries

### 2. WhatsApp Bot - Tour-Funktionen

**Neue Function Handlers:**
- ❌ `get_tours()` - Holt verfügbare Touren
- ❌ `get_tour_details()` - Holt Details einer Tour (inkl. Bilder)
- ❌ `book_tour()` - Erstellt Tour-Reservation/Buchung
- ❌ `get_tour_images()` - Holt Bilder einer Tour

**Erweiterungen:**
- ❌ Function Definitions in `whatsappAiService.ts` hinzufügen
- ❌ System Prompt erweitern (Tour-Informationen)
- ❌ Bild-Versand via WhatsApp (Media Messages)

### 3. Automatische Stornierung

**Neuer Service:**
- ❌ `tourBookingScheduler.ts` - Prüft abgelaufene Reservierungen und storniert sie

**Timer/Job:**
- ❌ Regelmäßiger Job (z.B. alle 5 Minuten) prüft `TourBooking` mit:
  - `autoCancelEnabled = true`
  - `paymentDeadline < now()`
  - `paymentStatus = 'pending'`
- ❌ Storniert automatisch und sendet WhatsApp-Nachricht

**Integration:**
- ❌ Bei Buchungserstellung: Setze `paymentDeadline` (z.B. jetzt + 1h)
- ❌ Setze `autoCancelEnabled = true` (konfigurierbar)
- ❌ Timer registrieren in `backend/src/index.ts`

### 4. Zahlungs-Webhook für TourBookings

**Bold Payment Webhook:**
- ⚠️ Aktuell: Webhook aktualisiert nur `Reservation` Model
- ❌ Erweitern: Webhook soll auch `TourBooking` aktualisieren können
- ❌ Mapping: Payment Link → TourBooking finden
- ❌ Nach Zahlung: Tour buchen (Status auf "confirmed"), Bestätigung senden

**Problem:**
- Aktuell wird "Dummy"-Reservation für Payment Link erstellt
- Webhook aktualisiert nur die Dummy-Reservation
- TourBooking wird nicht automatisch aktualisiert

**Lösung:**
- Option 1: Webhook erweitern, um auch TourBookings zu finden (via Payment Link)
- Option 2: TourBooking direkt mit Bold Payment verknüpfen (ohne Dummy-Reservation)
- Option 3: Nach Webhook-Update: Suche TourBooking via Dummy-Reservation

### 5. Bild-Versand via WhatsApp

**WhatsApp Media Messages:**
- ❌ Service erweitern: `whatsappService.ts` - Media Messages senden
- ❌ Funktion: `sendTourImage(phoneNumber, imageUrl, branchId)`
- ❌ Funktion: `sendTourGallery(phoneNumber, galleryUrls, branchId)`

**Integration:**
- ❌ In Function Handler: Wenn Tour-Details abgefragt werden, Bilder mitschicken
- ❌ In Buchungsbestätigung: Tour-Bild mitschicken

---

## 📊 Detaillierter Implementierungsplan

### Phase 1: Datenbank-Erweiterungen

**Schritt 1.1: Prisma Schema erweitern**

**Datei:** `backend/prisma/schema.prisma`

```prisma
model TourBooking {
  // ... bestehende Felder ...
  
  // NEU: Automatische Stornierung
  paymentDeadline    DateTime?  // Frist für Zahlung (z.B. jetzt + 1h)
  autoCancelEnabled  Boolean    @default(false) // Automatische Stornierung aktiviert?
  reservedUntil      DateTime?  // Bis wann ist die Reservation reserviert (für Anzeige)
  
  // ... bestehende Felder ...
  
  @@index([paymentDeadline]) // NEU: Index für effiziente Queries
}
```

**Schritt 1.2: Migration erstellen**

```bash
npx prisma migrate dev --name add_tour_booking_payment_deadline
```

**Schritt 1.3: TypeScript-Typen aktualisieren**

**Datei:** `frontend/src/types/tour.ts`

```typescript
export interface TourBooking {
  // ... bestehende Felder ...
  paymentDeadline?: string | null;
  autoCancelEnabled?: boolean;
  reservedUntil?: string | null;
  // ... bestehende Felder ...
}
```

### Phase 2: WhatsApp Bot - Tour-Funktionen

**Schritt 2.1: Function Handlers erweitern**

**Datei:** `backend/src/services/whatsappFunctionHandlers.ts`

**Neue Funktionen hinzufügen:**

```typescript
/**
 * Holt verfügbare Touren
 */
static async get_tours(
  args: any,
  userId: number | null,
  roleId: number | null,
  branchId: number
): Promise<any> {
  try {
    // Filter: isActive = true, availableFrom <= heute <= availableTo
    const where: any = {
      isActive: true,
      organization: {
        branches: {
          some: { id: branchId }
        }
      }
    };
    
    // Datum-Filter (optional)
    if (args.availableFrom) {
      where.availableFrom = { lte: new Date(args.availableFrom) };
    }
    if (args.availableTo) {
      where.availableTo = { gte: new Date(args.availableTo) };
    }
    
    // Typ-Filter (optional)
    if (args.type) {
      where.type = args.type; // 'own' oder 'external'
    }
    
    const tours = await prisma.tour.findMany({
      where,
      include: {
        branch: {
          select: { id: true, name: true }
        }
      },
      orderBy: { title: 'asc' },
      take: args.limit || 20
    });
    
    return tours.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description || '',
      type: t.type,
      price: t.price ? Number(t.price) : null,
      currency: t.currency || 'COP',
      duration: t.duration,
      maxParticipants: t.maxParticipants,
      minParticipants: t.minParticipants,
      location: t.location,
      meetingPoint: t.meetingPoint,
      imageUrl: t.imageUrl,
      hasGallery: !!t.galleryUrls && Array.isArray(t.galleryUrls) && t.galleryUrls.length > 0
    }));
  } catch (error: any) {
    console.error('[WhatsApp Function Handlers] get_tours Fehler:', error);
    throw error;
  }
}

/**
 * Holt Details einer Tour (inkl. Bilder-URLs)
 */
static async get_tour_details(
  args: any,
  userId: number | null,
  roleId: number | null,
  branchId: number
): Promise<any> {
  try {
    if (!args.tourId) {
      throw new Error('tourId ist erforderlich');
    }
    
    const tour = await prisma.tour.findUnique({
      where: { id: parseInt(args.tourId, 10) },
      include: {
        branch: {
          select: { id: true, name: true }
        },
        externalProvider: {
          select: { id: true, name: true, phone: true }
        }
      }
    });
    
    if (!tour) {
      throw new Error('Tour nicht gefunden');
    }
    
    // Parse galleryUrls (JSON)
    let galleryUrls: string[] = [];
    if (tour.galleryUrls) {
      try {
        galleryUrls = typeof tour.galleryUrls === 'string' 
          ? JSON.parse(tour.galleryUrls) 
          : tour.galleryUrls;
      } catch (e) {
        console.warn('[get_tour_details] Fehler beim Parsen von galleryUrls:', e);
      }
    }
    
    return {
      id: tour.id,
      title: tour.title,
      description: tour.description || '',
      type: tour.type,
      price: tour.price ? Number(tour.price) : null,
      currency: tour.currency || 'COP',
      duration: tour.duration,
      maxParticipants: tour.maxParticipants,
      minParticipants: tour.minParticipants,
      location: tour.location,
      meetingPoint: tour.meetingPoint,
      includes: tour.includes,
      excludes: tour.excludes,
      requirements: tour.requirements,
      imageUrl: tour.imageUrl,
      galleryUrls: galleryUrls,
      availableFrom: tour.availableFrom?.toISOString() || null,
      availableTo: tour.availableTo?.toISOString() || null,
      branch: tour.branch ? { id: tour.branch.id, name: tour.branch.name } : null,
      externalProvider: tour.externalProvider ? {
        id: tour.externalProvider.id,
        name: tour.externalProvider.name,
        phone: tour.externalProvider.phone
      } : null
    };
  } catch (error: any) {
    console.error('[WhatsApp Function Handlers] get_tour_details Fehler:', error);
    throw error;
  }
}

/**
 * Erstellt eine Tour-Reservation/Buchung
 */
static async book_tour(
  args: any,
  userId: number | null,
  roleId: number | null,
  branchId: number
): Promise<any> {
  try {
    // Validierung
    if (!args.tourId || !args.tourDate || !args.numberOfParticipants || !args.customerName) {
      throw new Error('Fehlende erforderliche Parameter: tourId, tourDate, numberOfParticipants, customerName');
    }
    
    if (!args.customerPhone && !args.customerEmail) {
      throw new Error('Mindestens eine Kontaktinformation (customerPhone oder customerEmail) ist erforderlich');
    }
    
    // Parse Datum
    const tourDate = new Date(args.tourDate);
    if (tourDate < new Date()) {
      throw new Error('Tour-Datum muss in der Zukunft sein');
    }
    
    // Hole Branch für organizationId
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { organizationId: true }
    });
    
    if (!branch) {
      throw new Error('Branch nicht gefunden');
    }
    
    // Hole Tour
    const tour = await prisma.tour.findUnique({
      where: { id: parseInt(args.tourId, 10) },
      include: {
        externalProvider: true
      }
    });
    
    if (!tour) {
      throw new Error('Tour nicht gefunden');
    }
    
    if (!tour.isActive) {
      throw new Error('Tour ist nicht aktiv');
    }
    
    // Validierung: Anzahl Teilnehmer
    if (tour.minParticipants && args.numberOfParticipants < tour.minParticipants) {
      throw new Error(`Mindestens ${tour.minParticipants} Teilnehmer erforderlich`);
    }
    if (tour.maxParticipants && args.numberOfParticipants > tour.maxParticipants) {
      throw new Error(`Maximal ${tour.maxParticipants} Teilnehmer erlaubt`);
    }
    
    // Berechne Gesamtpreis
    const totalPrice = tour.price 
      ? Number(tour.price) * args.numberOfParticipants 
      : 0;
    
    // Erstelle Buchung via API (rufe Controller auf)
    // ODER: Direkt Prisma verwenden (wie in tourBookingController)
    const booking = await prisma.tourBooking.create({
      data: {
        tourId: tour.id,
        tourDate: tourDate,
        numberOfParticipants: args.numberOfParticipants,
        totalPrice: totalPrice,
        currency: tour.currency || 'COP',
        customerName: args.customerName.trim(),
        customerEmail: args.customerEmail?.trim() || null,
        customerPhone: args.customerPhone?.trim() || null,
        customerNotes: args.customerNotes?.trim() || null,
        bookedById: userId || null,
        organizationId: branch.organizationId,
        branchId: branchId,
        isExternal: tour.type === 'external',
        amountPending: totalPrice,
        // NEU: Automatische Stornierung
        paymentDeadline: new Date(Date.now() + 60 * 60 * 1000), // 1 Stunde
        autoCancelEnabled: true,
        reservedUntil: new Date(Date.now() + 60 * 60 * 1000) // 1 Stunde
      },
      include: {
        tour: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });
    
    // Generiere Payment Link (analog zu tourBookingController)
    let paymentLink: string | null = null;
    if (totalPrice > 0 && (args.customerPhone || args.customerEmail)) {
      try {
        // Erstelle "Dummy"-Reservation für Payment Link
        const dummyReservation = await prisma.reservation.create({
          data: {
            guestName: args.customerName,
            guestPhone: args.customerPhone || null,
            guestEmail: args.customerEmail || null,
            checkInDate: tourDate,
            checkOutDate: new Date(tourDate.getTime() + 24 * 60 * 60 * 1000), // +1 Tag
            status: 'confirmed',
            paymentStatus: 'pending',
            amount: totalPrice,
            currency: tour.currency || 'COP',
            organizationId: branch.organizationId,
            branchId: branchId
          }
        });
        
        const boldPaymentService = await BoldPaymentService.createForBranch(branchId);
        paymentLink = await boldPaymentService.createPaymentLink(
          dummyReservation,
          totalPrice,
          tour.currency || 'COP',
          `Zahlung für Tour-Buchung: ${tour.title}`
        );
        
        // Aktualisiere Buchung mit Payment Link
        await prisma.tourBooking.update({
          where: { id: booking.id },
          data: { paymentLink }
        });
      } catch (paymentError) {
        console.error('[book_tour] Fehler beim Erstellen des Payment-Links:', paymentError);
        // Nicht abbrechen, nur loggen
      }
    }
    
    // Berechne Kommission (falls bookedById vorhanden)
    if (userId) {
      try {
        const { calculateCommission } = await import('../services/commissionService');
        await calculateCommission(booking.id);
      } catch (commissionError) {
        console.error('[book_tour] Fehler bei Kommissions-Berechnung:', commissionError);
      }
    }
    
    // Bei externer Tour: WhatsApp-Nachricht an Anbieter senden
    if (tour.type === 'external' && tour.externalProvider?.phone) {
      try {
        const { TourWhatsAppService } = await import('../services/tourWhatsAppService');
        await TourWhatsAppService.sendBookingRequestToProvider(
          booking.id,
          branch.organizationId,
          branchId
        );
      } catch (whatsappError) {
        console.error('[book_tour] Fehler beim Senden der WhatsApp-Nachricht:', whatsappError);
      }
    }
    
    return {
      success: true,
      bookingId: booking.id,
      tourTitle: tour.title,
      tourDate: tourDate.toISOString(),
      numberOfParticipants: args.numberOfParticipants,
      totalPrice: totalPrice,
      currency: tour.currency || 'COP',
      paymentLink: paymentLink,
      paymentDeadline: booking.paymentDeadline?.toISOString() || null,
      message: `Tour-Buchung erstellt. Bitte zahlen Sie innerhalb von 1 Stunde, sonst wird die Buchung automatisch storniert.`
    };
  } catch (error: any) {
    console.error('[WhatsApp Function Handlers] book_tour Fehler:', error);
    throw error;
  }
}
```

**Schritt 2.2: Function Definitions hinzufügen**

**Datei:** `backend/src/services/whatsappAiService.ts`

**Erweitere `getFunctionDefinitions()`:**

```typescript
private static getFunctionDefinitions(): any[] {
  return [
    // ... bestehende Functions ...
    {
      type: 'function',
      function: {
        name: 'get_tours',
        description: 'Holt verfügbare Touren. Filtere nach Typ, Datum, etc.',
        parameters: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['own', 'external'],
              description: 'Tour-Typ (own = eigene Tour, external = externe Tour)'
            },
            availableFrom: {
              type: 'string',
              description: 'Verfügbar ab (ISO-Datum, z.B. "2025-01-27")'
            },
            availableTo: {
              type: 'string',
              description: 'Verfügbar bis (ISO-Datum)'
            },
            limit: {
              type: 'number',
              description: 'Maximale Anzahl Ergebnisse (Standard: 20)'
            }
          }
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'get_tour_details',
        description: 'Holt detaillierte Informationen zu einer Tour (inkl. Bilder, Beschreibung, Preise, etc.)',
        parameters: {
          type: 'object',
          properties: {
            tourId: {
              type: 'number',
              description: 'ID der Tour'
            }
          },
          required: ['tourId']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'book_tour',
        description: 'Erstellt eine Tour-Reservation/Buchung. Generiert automatisch Payment Link und setzt Zahlungsfrist (1h).',
        parameters: {
          type: 'object',
          properties: {
            tourId: {
              type: 'number',
              description: 'ID der Tour'
            },
            tourDate: {
              type: 'string',
              description: 'Datum der Tour (ISO-Format, z.B. "2025-01-27T10:00:00Z")'
            },
            numberOfParticipants: {
              type: 'number',
              description: 'Anzahl Teilnehmer'
            },
            customerName: {
              type: 'string',
              description: 'Name des Kunden'
            },
            customerPhone: {
              type: 'string',
              description: 'Telefonnummer des Kunden (optional, falls customerEmail vorhanden)'
            },
            customerEmail: {
              type: 'string',
              description: 'E-Mail des Kunden (optional, falls customerPhone vorhanden)'
            },
            customerNotes: {
              type: 'string',
              description: 'Zusätzliche Notizen (optional)'
            }
          },
          required: ['tourId', 'tourDate', 'numberOfParticipants', 'customerName']
        }
      }
    }
  ];
}
```

**Schritt 2.3: System Prompt erweitern**

**Datei:** `backend/src/services/whatsappAiService.ts`

**Erweitere `buildSystemPrompt()`:**

```typescript
// Füge Tour-Informationen hinzu:
// "Du kannst auch Informationen über Touren abrufen. Verwende get_tours() um verfügbare Touren zu finden, get_tour_details() um Details zu einer Tour zu erhalten, und book_tour() um eine Tour zu buchen."
```

### Phase 3: Bild-Versand via WhatsApp

**Schritt 3.1: WhatsApp Service erweitern**

**Datei:** `backend/src/services/whatsappService.ts`

**Neue Funktion hinzufügen:**

```typescript
/**
 * Sendet ein Bild via WhatsApp
 */
async sendImage(
  phoneNumber: string,
  imageUrl: string,
  caption?: string
): Promise<void> {
  // Implementierung: Media Message via WhatsApp Business API
  // Endpoint: POST /v1/messages
  // media_id oder URL verwenden
}
```

**Schritt 3.2: Tour-Bilder versenden**

**Datei:** `backend/src/services/whatsappFunctionHandlers.ts`

**Erweitere `get_tour_details()`:**

```typescript
// Nach dem Abrufen der Tour-Details:
// Wenn imageUrl vorhanden: Sende Bild via WhatsApp
if (tour.imageUrl && phoneNumber) {
  try {
    const { WhatsAppService } = await import('../services/whatsappService');
    const whatsappService = await WhatsAppService.createForBranch(branchId);
    await whatsappService.sendImage(
      phoneNumber,
      tour.imageUrl,
      `Tour: ${tour.title}`
    );
  } catch (error) {
    console.error('[get_tour_details] Fehler beim Senden des Bildes:', error);
  }
}
```

### Phase 4: Automatische Stornierung

**Schritt 4.1: Scheduler Service erstellen**

**Datei:** `backend/src/services/tourBookingScheduler.ts`

```typescript
import { prisma } from '../utils/prisma';
import { TourWhatsAppService } from './tourWhatsAppService';

export class TourBookingScheduler {
  /**
   * Prüft abgelaufene Reservierungen und storniert sie automatisch
   */
  static async checkExpiredBookings(): Promise<void> {
    try {
      const now = new Date();
      
      // Finde abgelaufene Buchungen
      const expiredBookings = await prisma.tourBooking.findMany({
        where: {
          autoCancelEnabled: true,
          paymentDeadline: {
            lt: now // paymentDeadline < jetzt
          },
          paymentStatus: 'pending', // Noch nicht bezahlt
          status: {
            not: 'cancelled' // Noch nicht storniert
          }
        },
        include: {
          tour: {
            select: {
              id: true,
              title: true,
              organizationId: true
            }
          },
          branch: {
            select: {
              id: true
            }
          }
        }
      });
      
      console.log(`[TourBookingScheduler] Gefunden ${expiredBookings.length} abgelaufene Buchungen`);
      
      for (const booking of expiredBookings) {
        try {
          // Storniere Buchung
          await prisma.tourBooking.update({
            where: { id: booking.id },
            data: {
              status: 'cancelled',
              cancelledBy: 'system',
              cancelledAt: now,
              cancelledReason: 'Automatische Stornierung: Zahlung nicht innerhalb der Frist erhalten'
            }
          });
          
          // Sende WhatsApp-Nachricht an Kunden (falls Telefonnummer vorhanden)
          if (booking.customerPhone && booking.tour) {
            try {
              await TourWhatsAppService.sendCancellationToCustomer(
                booking.id,
                booking.tour.organizationId,
                booking.branchId || null,
                'Automatische Stornierung: Zahlung nicht innerhalb der Frist erhalten'
              );
            } catch (whatsappError) {
              console.error(`[TourBookingScheduler] Fehler beim Senden der WhatsApp-Nachricht für Buchung ${booking.id}:`, whatsappError);
            }
          }
          
          console.log(`[TourBookingScheduler] ✅ Buchung ${booking.id} automatisch storniert`);
        } catch (error) {
          console.error(`[TourBookingScheduler] Fehler beim Stornieren der Buchung ${booking.id}:`, error);
        }
      }
    } catch (error) {
      console.error('[TourBookingScheduler] Fehler:', error);
    }
  }
}
```

**Schritt 4.2: Timer registrieren**

**Datei:** `backend/src/index.ts`

```typescript
// Füge Timer hinzu (alle 5 Minuten)
setInterval(async () => {
  try {
    const { TourBookingScheduler } = await import('./services/tourBookingScheduler');
    await TourBookingScheduler.checkExpiredBookings();
  } catch (error) {
    console.error('[Timer] Fehler beim Prüfen abgelaufener Buchungen:', error);
  }
}, 5 * 60 * 1000); // 5 Minuten
```

### Phase 5: Zahlungs-Webhook für TourBookings

**Schritt 5.1: Webhook erweitern**

**Datei:** `backend/src/controllers/boldPaymentController.ts`

**Erweitere `handleWebhook()`:**

```typescript
// Nach dem Update der Reservation:
// Prüfe ob es eine TourBooking gibt, die mit dieser Reservation verknüpft ist
// ODER: Suche TourBooking via Payment Link

// Option 1: Suche TourBooking via Payment Link
const tourBooking = await prisma.tourBooking.findFirst({
  where: {
    paymentLink: paymentLinkUrl // Payment Link aus Webhook
  },
  include: {
    tour: {
      select: {
        id: true,
        title: true,
        organizationId: true
      }
    }
  }
});

if (tourBooking) {
  // Aktualisiere TourBooking Payment Status
  await prisma.tourBooking.update({
    where: { id: tourBooking.id },
    data: {
      paymentStatus: 'paid',
      amountPaid: tourBooking.totalPrice,
      amountPending: 0
    }
  });
  
  // Sende Bestätigung via WhatsApp
  if (tourBooking.customerPhone && tourBooking.tour) {
    try {
      const { TourWhatsAppService } = await import('../services/tourWhatsAppService');
      await TourWhatsAppService.sendConfirmationToCustomer(
        tourBooking.id,
        tourBooking.tour.organizationId,
        tourBooking.branchId || null
      );
    } catch (whatsappError) {
      console.error('[Bold Payment Webhook] Fehler beim Senden der Bestätigung:', whatsappError);
    }
  }
}
```

---

## 📝 Zusammenfassung: Was muss implementiert werden?

### ✅ Bereits vorhanden:
- Tour-Infrastruktur (Models, Controller, Services, Frontend)
- WhatsApp Bot-Infrastruktur (Message Handler, AI Service, Function Calling)
- Payment-Link-Generierung (Bold Payment)
- Gast-Identifikation (WhatsApp Guest Service)

### ❌ Fehlt noch:

1. **Datenbank:**
   - `TourBooking.paymentDeadline` Feld
   - `TourBooking.autoCancelEnabled` Feld
   - `TourBooking.reservedUntil` Feld
   - Migration erstellen

2. **WhatsApp Bot:**
   - `get_tours()` Function Handler
   - `get_tour_details()` Function Handler
   - `book_tour()` Function Handler
   - Function Definitions in `whatsappAiService.ts`
   - System Prompt erweitern

3. **Bild-Versand:**
   - `whatsappService.sendImage()` Funktion
   - Integration in `get_tour_details()`

4. **Automatische Stornierung:**
   - `tourBookingScheduler.ts` Service
   - Timer in `backend/src/index.ts`
   - Bei Buchungserstellung: `paymentDeadline` setzen

5. **Zahlungs-Webhook:**
   - Webhook erweitern für TourBookings
   - Nach Zahlung: Bestätigung senden

---

## 🚨 Wichtige Hinweise

1. **Payment Link Workaround:**
   - Aktuell wird "Dummy"-Reservation für Payment Link erstellt
   - Webhook muss erweitert werden, um auch TourBookings zu finden
   - Alternative: TourBooking direkt mit Bold Payment verknüpfen (erfordert API-Änderungen)

2. **Automatische Stornierung:**
   - Frist ist konfigurierbar (aktuell: 1h, kann in `book_tour()` angepasst werden)
   - Timer läuft alle 5 Minuten (kann angepasst werden)
   - Stornierung sendet WhatsApp-Nachricht an Kunden

3. **Berechtigungen:**
   - Tour-Funktionen sollten für alle User verfügbar sein (Gäste können Touren buchen)
   - Keine speziellen Berechtigungen erforderlich (Touren sind öffentlich)

4. **Bilder:**
   - Bilder müssen über öffentliche URLs erreichbar sein
   - WhatsApp Business API unterstützt Media Messages
   - Fallback: Bild-URL in Text-Nachricht senden

---

## ✅ Checkliste

### Phase 1: Datenbank
- [ ] Prisma Schema erweitern
- [ ] Migration erstellen
- [ ] TypeScript-Typen aktualisieren

### Phase 2: WhatsApp Bot - Tour-Funktionen
- [ ] `get_tours()` Function Handler implementieren
- [ ] `get_tour_details()` Function Handler implementieren
- [ ] `book_tour()` Function Handler implementieren
- [ ] Function Definitions hinzufügen
- [ ] System Prompt erweitern

### Phase 3: Bild-Versand
- [ ] `whatsappService.sendImage()` implementieren
- [ ] Integration in `get_tour_details()`

### Phase 4: Automatische Stornierung
- [ ] `tourBookingScheduler.ts` erstellen
- [ ] Timer registrieren
- [ ] Bei Buchungserstellung: `paymentDeadline` setzen

### Phase 5: Zahlungs-Webhook
- [ ] Webhook erweitern für TourBookings
- [ ] Nach Zahlung: Bestätigung senden

---

**WICHTIG:** Dieser Plan ist nur eine VORBEREITUNG. NICHTS wird umgesetzt, bis der User diesen Plan ausdrücklich bestätigt hat!


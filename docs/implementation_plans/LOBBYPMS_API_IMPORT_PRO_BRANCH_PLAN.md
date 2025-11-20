# LobbyPMS API Import pro Branch - Implementierungsplan

## Überblick

Dieser Plan beschreibt die Umstellung des automatischen Reservierungs-Imports von Email-basiert (pro Organisation) auf API-basiert (pro Branch) mit LobbyPMS.

**⚠️ KRITISCH**: Da Reservierungen pro Branch sind, müssen **ALLE** abhängigen Services auch pro Branch funktionieren:
- LobbyPMS API (Token pro Branch)
- Bold Payment (Zahlungslink pro Branch)
- TTLock (Türsystem pro Branch)
- WhatsApp (Nachrichten pro Branch) - ✅ Bereits Branch-fähig, aber nicht verwendet!
- SIRE (Gästeregistrierung pro Branch)

**WICHTIG:** Für die **vollständige, detaillierte Implementierungsplanung** siehe:
- **[LOBBYPMS_BRANCH_MIGRATION_DETAILLIERT.md](LOBBYPMS_BRANCH_MIGRATION_DETAILLIERT.md)** - ⭐ **HAUPTDOKUMENT**: Komplette Analyse aller betroffenen Komponenten mit exakten Code-Änderungen
- [LOBBYPMS_BRANCH_SERVICES_ANALYSE.md](LOBBYPMS_BRANCH_SERVICES_ANALYSE.md) - Detaillierte Analyse aller Service-Abhängigkeiten

Dieses Dokument (LOBBYPMS_API_IMPORT_PRO_BRANCH_PLAN.md) ist die **Übersicht** und **High-Level-Planung**. Für die Implementierung sollte **LOBBYPMS_BRANCH_MIGRATION_DETAILLIERT.md** verwendet werden.

## Aktueller Stand - Analyse

### ✅ Was funktioniert bereits

1. **Email-basierter Import (pro Organisation)**
   - `EmailReservationService.checkForNewReservationEmails(organizationId)`
   - `EmailReservationScheduler.checkAllOrganizations()` - iteriert über alle Organisationen
   - Läuft alle 10 Minuten
   - Erstellt Reservierungen mit `organizationId` (KEIN `branchId`)

2. **LobbyPMS Service**
   - `LobbyPmsService` existiert bereits
   - Verwendet `organizationId` im Constructor
   - **⚠️ PROBLEM**: Endpoint ist falsch (`/reservations` statt `/api/v1/bookings`)

3. **Reservation Model**
   - Vollständig implementiert
   - **⚠️ PROBLEM**: Hat `organizationId` aber KEIN `branchId` Feld

4. **Branch-Struktur**
   - Branches existieren und haben `organizationId`
   - Branch hat bereits `whatsappSettings` (Json)
   - **⚠️ PROBLEM**: Branch hat KEINE `lobbyPmsSettings`

### ❌ Was fehlt / muss geändert werden

1. **Datenbank-Schema**
   - `Reservation.branchId` Feld fehlt
   - `Branch.lobbyPmsSettings` Feld fehlt (oder in `whatsappSettings` integrieren?)

2. **LobbyPMS Service**
   - Endpoint muss auf `/api/v1/bookings` geändert werden
   - Muss Branch-Support haben (nicht nur Organisation)

3. **Import-Service**
   - Neuer Service: `LobbyPmsReservationSyncService` (pro Branch)
   - Ersetzt `EmailReservationService` für API-Import

4. **Scheduler**
   - Neuer Scheduler: `LobbyPmsReservationScheduler` (pro Branch)
   - Ersetzt `EmailReservationScheduler` für API-Import

5. **Mapping**
   - LobbyPMS API Response → Reservation Model Mapping
   - Branch-Zuordnung: Wie wird eine Reservation einem Branch zugeordnet?

## LobbyPMS API - Bekannte Endpoints

### ✅ Funktionsfähige Endpoints (getestet)

1. **Reservierungen abrufen:**
   ```
   GET /api/v1/bookings
   GET /api/v1/bookings?page=1&per_page=50
   GET /api/v1/bookings?start_date=2025-11-20&end_date=2025-11-27
   GET /api/v1/bookings/{booking_id}
   ```

2. **Verfügbare Zimmer:**
   ```
   GET /api/v2/available-rooms?start_date=2025-11-20&end_date=2025-11-27
   ```

### API Response-Struktur

```typescript
// GET /api/v1/bookings
{
  data: [
    {
      booking_id: 18113730,
      creation_date: "2025-11-19 22:46:05",
      category: { category_id: 34281, name: "La tia artista" },
      assigned_room: { type: "compartida", name: "Cama 5" },
      channel: { channel_id: 18251, name: "Hostelworld.com" },
      start_date: "2025-11-20",
      end_date: "2025-11-21",
      checkin_online: false,
      holder: {
        client_id: 15009875,
        email: "adele.keib@orange.fr",
        nombre: "Adèle",
        primer_apellido: "Keib",
        telefono: "33785198236",
        pais: "Francia"
      },
      guests: [...],
      total_guests: 1,
      paid_out: "23400.00",
      total_to_pay_accommodation: "31200.00",
      total_to_pay: "23400.00",
      checked_in: false,
      checked_out: false
    }
  ],
  meta: {
    total_records: 100,
    current_page: 1,
    records_per_page: 100,
    total_pages: 1
  }
}
```

## Implementierungsplan

### Phase 1: Datenbank-Schema Erweiterung

#### 1.1 Reservation Model erweitern

**Datei:** `backend/prisma/schema.prisma`

```prisma
model Reservation {
  // ... bestehende Felder ...
  organizationId           Int
  organization             Organization                 @relation(fields: [organizationId], references: [id])
  branchId                 Int?                         // NEU: Optional, für Branch-Zuordnung
  branch                   Branch?                      @relation(fields: [branchId], references: [id])
  // ... restliche Felder ...
  
  @@index([organizationId])
  @@index([branchId])                                    // NEU: Index für Branch
  @@index([checkInDate])
  @@index([status])
  @@index([lobbyReservationId])
}
```

**Migration:**
- Migration erstellen: `npx prisma migrate dev --name add_branch_to_reservation`
- **⚠️ WICHTIG**: `branchId` ist optional, damit bestehende Reservierungen nicht betroffen sind

#### 1.2 Branch Model erweitern

**⚠️ KRITISCH**: Alle Services müssen pro Branch konfigurierbar sein!

```prisma
model Branch {
  // ... bestehende Felder ...
  whatsappSettings      Json? // ✅ Bereits vorhanden: WhatsApp-Konfiguration pro Branch
  lobbyPmsSettings      Json? // NEU: LobbyPMS-Konfiguration pro Branch
  boldPaymentSettings   Json? // NEU: Bold Payment-Konfiguration pro Branch
  doorSystemSettings    Json? // NEU: TTLock/Türsystem-Konfiguration pro Branch
  sireSettings          Json? // NEU: SIRE-Konfiguration pro Branch
  reservations          Reservation[] // NEU: Relation zu Reservierungen
}
```

**Empfehlung:** Separate Felder für bessere Klarheit und einfachere Verschlüsselung

**Migration:**
- Migration erstellen: `npx prisma migrate dev --name add_branch_settings_for_all_services`

### Phase 2: LobbyPMS Service Anpassung

#### 2.1 LobbyPmsService erweitern

**Datei:** `backend/src/services/lobbyPmsService.ts`

**Änderungen:**

1. **Endpoint korrigieren:**
   ```typescript
   // ALT: '/reservations'
   // NEU: '/api/v1/bookings'
   const response = await this.axiosInstance.get<any>('/api/v1/bookings', {
     params: {
       start_date: startDate.toISOString().split('T')[0],
       end_date: endDate.toISOString().split('T')[0],
     }
   });
   ```

2. **Response-Parsing anpassen:**
   ```typescript
   // LobbyPMS gibt { data: [...], meta: {...} } zurück
   if (responseData && responseData.data && Array.isArray(responseData.data)) {
     return responseData.data;
   }
   ```

3. **Branch-Support hinzufügen:**
   - Neuer Constructor-Parameter: `branchId?: number`
   - Lade Settings aus Branch statt Organisation (wenn branchId vorhanden)
   - Fallback auf Organisation-Settings (Rückwärtskompatibilität)

**Neue Methode:**
```typescript
static async createForBranch(branchId: number): Promise<LobbyPmsService> {
  // Lade Branch mit Settings
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    include: { organization: true }
  });
  
  // Prüfe Branch-Settings, fallback auf Organisation-Settings
  const settings = branch?.lobbyPmsSettings || branch?.organization?.settings?.lobbyPms;
  
  if (!settings?.apiKey) {
    throw new Error(`LobbyPMS ist nicht für Branch ${branchId} konfiguriert`);
  }
  
  return new LobbyPmsService(branch.organizationId, branchId, settings);
}
```

#### 2.2 Daten-Mapping

**Neue Datei:** `backend/src/services/lobbyPmsMappingService.ts`

```typescript
export interface LobbyPmsBooking {
  booking_id: number;
  creation_date: string;
  start_date: string;
  end_date: string;
  holder: {
    client_id: number;
    email?: string;
    nombre: string;
    primer_apellido?: string;
    telefono?: string;
    pais?: string;
  };
  assigned_room?: {
    type: string;
    name: string;
  };
  category?: {
    category_id: number;
    name: string;
  };
  total_to_pay_accommodation?: string;
  total_to_pay?: string;
  paid_out?: string;
  checked_in: boolean;
  checked_out: boolean;
  // ... weitere Felder
}

export class LobbyPmsMappingService {
  /**
   * Mappt LobbyPMS Booking auf Reservation Model
   */
  static mapBookingToReservation(
    booking: LobbyPmsBooking,
    organizationId: number,
    branchId?: number
  ): any {
    // Gast-Name zusammenstellen
    const guestName = [
      booking.holder.nombre,
      booking.holder.primer_apellido
    ].filter(Boolean).join(' ').trim() || 'Unbekannt';

    return {
      lobbyReservationId: String(booking.booking_id),
      guestName: guestName,
      guestEmail: booking.holder.email || null,
      guestPhone: booking.holder.telefono || null,
      checkInDate: new Date(booking.start_date),
      checkOutDate: new Date(booking.end_date),
      roomNumber: booking.assigned_room?.name || null,
      roomDescription: booking.category?.name || null,
      status: this.mapStatus(booking),
      paymentStatus: this.mapPaymentStatus(booking),
      amount: this.parseAmount(booking.total_to_pay_accommodation || booking.total_to_pay),
      currency: 'COP', // Default, könnte aus Settings kommen
      organizationId: organizationId,
      branchId: branchId || null
    };
  }

  private static mapStatus(booking: LobbyPmsBooking): ReservationStatus {
    if (booking.checked_out) return ReservationStatus.checked_out;
    if (booking.checked_in) return ReservationStatus.checked_in;
    return ReservationStatus.confirmed;
  }

  private static mapPaymentStatus(booking: LobbyPmsBooking): PaymentStatus {
    const paid = parseFloat(booking.paid_out || '0');
    const total = parseFloat(booking.total_to_pay || '0');
    
    if (paid >= total) return PaymentStatus.paid;
    if (paid > 0) return PaymentStatus.partially_paid;
    return PaymentStatus.pending;
  }

  private static parseAmount(amount: string | undefined): number | null {
    if (!amount) return null;
    const parsed = parseFloat(amount);
    return isNaN(parsed) ? null : parsed;
  }
}
```

### Phase 3: Neuer Sync-Service (pro Branch)

#### 3.1 LobbyPmsReservationSyncService erstellen

**Neue Datei:** `backend/src/services/lobbyPmsReservationSyncService.ts`

```typescript
import { PrismaClient, Reservation } from '@prisma/client';
import { LobbyPmsService } from './lobbyPmsService';
import { LobbyPmsMappingService, LobbyPmsBooking } from './lobbyPmsMappingService';

const prisma = new PrismaClient();

export class LobbyPmsReservationSyncService {
  /**
   * Synchronisiert Reservierungen für einen Branch
   * 
   * @param branchId - Branch-ID
   * @param startDate - Startdatum (optional, default: heute)
   * @param endDate - Enddatum (optional, default: +30 Tage)
   * @returns Anzahl synchronisierter Reservierungen
   */
  static async syncReservationsForBranch(
    branchId: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<number> {
    try {
      // Lade Branch mit Organisation
      const branch = await prisma.branch.findUnique({
        where: { id: branchId },
        include: { organization: true }
      });

      if (!branch) {
        throw new Error(`Branch ${branchId} nicht gefunden`);
      }

      if (!branch.organizationId) {
        throw new Error(`Branch ${branchId} hat keine Organisation`);
      }

      // Prüfe ob LobbyPMS für Branch konfiguriert ist
      const branchSettings = branch.lobbyPmsSettings as any;
      const orgSettings = branch.organization?.settings as any;
      const lobbyPmsSettings = branchSettings?.lobbyPms || orgSettings?.lobbyPms;

      if (!lobbyPmsSettings?.apiKey) {
        console.log(`[LobbyPmsSync] Branch ${branchId} hat keinen LobbyPMS API Key konfiguriert`);
        return 0;
      }

      if (!lobbyPmsSettings?.syncEnabled) {
        console.log(`[LobbyPmsSync] LobbyPMS Sync ist für Branch ${branchId} deaktiviert`);
        return 0;
      }

      // Erstelle LobbyPMS Service
      const lobbyPmsService = await LobbyPmsService.createForBranch(branchId);

      // Datum-Bereich bestimmen
      const syncStartDate = startDate || new Date();
      const syncEndDate = endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      // Hole Reservierungen von LobbyPMS
      const bookings = await lobbyPmsService.fetchReservations(syncStartDate, syncEndDate);

      console.log(`[LobbyPmsSync] Branch ${branchId}: ${bookings.length} Reservierungen von LobbyPMS abgerufen`);

      let syncedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;

      // Verarbeite jede Reservierung
      for (const booking of bookings) {
        try {
          const reservation = await this.syncSingleReservation(
            booking as LobbyPmsBooking,
            branch.organizationId,
            branchId
          );

          if (reservation) {
            syncedCount++;
          } else {
            skippedCount++;
          }
        } catch (error) {
          console.error(`[LobbyPmsSync] Fehler beim Synchronisieren der Reservierung ${booking.booking_id}:`, error);
          errorCount++;
        }
      }

      console.log(`[LobbyPmsSync] Branch ${branchId}: ${syncedCount} synchronisiert, ${skippedCount} übersprungen, ${errorCount} Fehler`);

      return syncedCount;
    } catch (error) {
      console.error(`[LobbyPmsSync] Fehler beim Synchronisieren für Branch ${branchId}:`, error);
      throw error;
    }
  }

  /**
   * Synchronisiert eine einzelne Reservierung
   */
  private static async syncSingleReservation(
    booking: LobbyPmsBooking,
    organizationId: number,
    branchId: number
  ): Promise<Reservation | null> {
    // Prüfe auf Duplikate
    const existingReservation = await prisma.reservation.findUnique({
      where: { lobbyReservationId: String(booking.booking_id) }
    });

    if (existingReservation) {
      // Update bestehende Reservierung
      const mappedData = LobbyPmsMappingService.mapBookingToReservation(
        booking,
        organizationId,
        branchId
      );

      const updated = await prisma.reservation.update({
        where: { id: existingReservation.id },
        data: mappedData
      });

      // Sync-History
      await prisma.reservationSyncHistory.create({
        data: {
          reservationId: updated.id,
          syncType: 'updated',
          syncData: booking as any
        }
      });

      return updated;
    }

    // Erstelle neue Reservierung
    const mappedData = LobbyPmsMappingService.mapBookingToReservation(
      booking,
      organizationId,
      branchId
    );

    const reservation = await prisma.reservation.create({
      data: mappedData
    });

    // Sync-History
    await prisma.reservationSyncHistory.create({
      data: {
        reservationId: reservation.id,
        syncType: 'created',
        syncData: booking as any
      }
    });

    // Automatisch Task erstellen (wenn aktiviert)
    try {
      const { TaskAutomationService } = await import('./taskAutomationService');
      await TaskAutomationService.createReservationTask(reservation, organizationId);
    } catch (error) {
      console.error(`[LobbyPmsSync] Fehler beim Erstellen des Tasks für Reservierung ${reservation.id}:`, error);
    }

    return reservation;
  }
}
```

### Phase 4: Neuer Scheduler (pro Branch)

#### 4.1 LobbyPmsReservationScheduler erstellen

**Neue Datei:** `backend/src/services/lobbyPmsReservationScheduler.ts`

```typescript
import { LobbyPmsReservationSyncService } from './lobbyPmsReservationSyncService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Scheduler für automatische LobbyPMS Reservierungs-Synchronisation
 * 
 * Prüft regelmäßig auf neue Reservierungen für alle Branches mit aktivierter LobbyPMS-Sync
 */
export class LobbyPmsReservationScheduler {
  private static checkInterval: NodeJS.Timeout | null = null;
  public static isRunning = false;

  /**
   * Startet den Scheduler
   * 
   * Prüft alle 10 Minuten auf neue Reservierungen für alle Branches mit aktivierter LobbyPMS-Sync
   */
  static start(): void {
    if (this.isRunning) {
      console.log('[LobbyPmsScheduler] Scheduler läuft bereits');
      return;
    }

    console.log('[LobbyPmsScheduler] Scheduler gestartet');

    // Prüfe alle 10 Minuten
    const CHECK_INTERVAL_MS = 10 * 60 * 1000; // 10 Minuten

    this.checkInterval = setInterval(async () => {
      await this.checkAllBranches();
    }, CHECK_INTERVAL_MS);

    // Führe sofort einen Check aus beim Start
    this.checkAllBranches();

    this.isRunning = true;
  }

  /**
   * Stoppt den Scheduler
   */
  static stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      this.isRunning = false;
      console.log('[LobbyPmsScheduler] Scheduler gestoppt');
    }
  }

  /**
   * Prüft alle Branches auf neue Reservierungen
   */
  private static async checkAllBranches(): Promise<void> {
    try {
      console.log('[LobbyPmsScheduler] Starte Sync für alle Branches...');

      // Hole alle Branches mit Organisation
      const branches = await prisma.branch.findMany({
        where: {
          organizationId: { not: null }
        },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              settings: true
            }
          }
        }
      });

      let totalProcessed = 0;

      // Prüfe jede Branch
      for (const branch of branches) {
        try {
          // Prüfe ob LobbyPMS Sync aktiviert ist
          const branchSettings = branch.lobbyPmsSettings as any;
          const orgSettings = branch.organization?.settings as any;
          const lobbyPmsSettings = branchSettings?.lobbyPms || orgSettings?.lobbyPms;

          if (!lobbyPmsSettings?.syncEnabled) {
            continue;
          }

          console.log(`[LobbyPmsScheduler] Prüfe Branch ${branch.id} (${branch.name})...`);

          // Synchronisiere Reservierungen
          const processedCount = await LobbyPmsReservationSyncService.syncReservationsForBranch(branch.id);
          totalProcessed += processedCount;

          if (processedCount > 0) {
            console.log(`[LobbyPmsScheduler] ✅ Branch ${branch.id}: ${processedCount} Reservierung(en) synchronisiert`);
          }
        } catch (error) {
          console.error(`[LobbyPmsScheduler] Fehler bei Branch ${branch.id}:`, error);
          // Weiter mit nächster Branch
        }
      }

      if (totalProcessed > 0) {
        console.log(`[LobbyPmsScheduler] ✅ Insgesamt ${totalProcessed} Reservierung(en) synchronisiert`);
      } else {
        console.log('[LobbyPmsScheduler] Keine neuen Reservierungen gefunden');
      }
    } catch (error) {
      console.error('[LobbyPmsScheduler] Fehler beim Sync:', error);
    }
  }

  /**
   * Führt manuell einen Sync für eine bestimmte Branch aus (für Tests)
   */
  static async triggerManually(branchId?: number): Promise<number> {
    console.log('[LobbyPmsScheduler] Manueller Trigger...');

    if (branchId) {
      // Prüfe nur eine Branch
      try {
        const processedCount = await LobbyPmsReservationSyncService.syncReservationsForBranch(branchId);
        console.log(`[LobbyPmsScheduler] Manueller Sync für Branch ${branchId}: ${processedCount} Reservierung(en) synchronisiert`);
        return processedCount;
      } catch (error) {
        console.error(`[LobbyPmsScheduler] Fehler beim manuellen Sync für Branch ${branchId}:`, error);
        throw error;
      }
    } else {
      // Prüfe alle Branches
      await this.checkAllBranches();
      return 0; // Anzahl wird in checkAllBranches geloggt
    }
  }
}
```

#### 4.2 Scheduler in index.ts registrieren

**Datei:** `backend/src/index.ts`

```typescript
import { LobbyPmsReservationScheduler } from './services/lobbyPmsReservationScheduler';

// ... bestehender Code ...

// Starte LobbyPMS Reservation Scheduler
LobbyPmsReservationScheduler.start();
console.log('📅 LobbyPMS Reservation Scheduler gestartet');
```

### Phase 5: Branch-Zuordnung

#### 5.1 ✅ Lösung: Token-basierte Zuordnung

**EINFACHE LÖSUNG**: Jeder Branch hat einen eigenen LobbyPMS API Token.

**Logik:**
- Branch hat eigenen Token → Alle Reservierungen, die mit diesem Token abgerufen werden, gehören automatisch zu diesem Branch
- **Kein Mapping nötig!** Die Zuordnung erfolgt automatisch über den verwendeten Token
- Jeder Token in LobbyPMS ist bereits einem Property/Branch zugeordnet

**Vorteile:**
- ✅ Einfach und klar
- ✅ Keine komplexe Mapping-Logik nötig
- ✅ Automatische Zuordnung
- ✅ Keine Fehlerquellen durch falsche Zuordnung

**Beispiel:**
- Branch "Manila" hat Token `8LwykKjLq7uziBRLxL1INGCLSsKfYWc5KIXTnRqZ28wTvSQehrIsToUJ3a5V`
- Alle Reservierungen, die mit diesem Token abgerufen werden, gehören automatisch zu Branch "Manila"
- Keine weitere Zuordnungs-Logik nötig!

#### 5.2 Branch-Settings Schema

```typescript
interface BranchLobbyPmsSettings {
  apiUrl?: string; // Default: "https://api.lobbypms.com"
  apiKey: string; // ERFORDERLICH: LobbyPMS API Token für diesen Branch
  propertyId?: string; // Optional: Property ID (falls nötig)
  syncEnabled: boolean; // Aktiviert/Deaktiviert den automatischen Sync
  autoCreateTasks?: boolean; // Automatisch Tasks erstellen
  lateCheckInThreshold?: string; // z.B. "22:00"
  notificationChannels?: ('email' | 'whatsapp')[];
  autoSendReservationInvitation?: boolean; // Default: true
}
```

**Wichtig:**
- `apiKey` ist **erforderlich** für aktivierte Branches
- Jeder Branch kann einen eigenen Token haben
- Falls kein Token: Sync wird übersprungen
- Fallback auf Organisation-Settings möglich (für Rückwärtskompatibilität)

### Phase 6: Service-Branch-Support (KRITISCH!)

#### 6.1 BoldPaymentService Branch-Support

**Datei:** `backend/src/services/boldPaymentService.ts`

**Änderungen:**
1. Constructor erweitern: `constructor(organizationId?: number, branchId?: number)`
2. `loadSettings()` erweitern: Lade aus `Branch.boldPaymentSettings` (mit Fallback auf Organisation)
3. Neue Methode: `static async createForBranch(branchId: number)`

**Verwendungsstellen ändern (8x):**
- `reservationNotificationService.ts`: 2x
- `reservationController.ts`: 1x
- `boldPaymentService.ts`: 1x (im Webhook)
- `updateGuestContactWorker.ts`: 1x
- `boldPaymentController.ts`: 2x

**Pattern:**
```typescript
// ALT:
const boldPaymentService = new BoldPaymentService(reservation.organizationId);

// NEU:
const boldPaymentService = reservation.branchId
  ? await BoldPaymentService.createForBranch(reservation.branchId)
  : new BoldPaymentService(reservation.organizationId);
```

#### 6.2 TTLockService Branch-Support

**Datei:** `backend/src/services/ttlockService.ts`

**Änderungen:**
1. Constructor erweitern: `constructor(organizationId?: number, branchId?: number)`
2. `loadSettings()` erweitern: Lade aus `Branch.doorSystemSettings` (mit Fallback auf Organisation)
3. Neue Methode: `static async createForBranch(branchId: number)`

**Verwendungsstellen ändern (8x):**
- `reservationNotificationService.ts`: 2x
- `reservationController.ts`: 1x
- `boldPaymentService.ts`: 1x (im Webhook)
- `updateGuestContactWorker.ts`: 1x
- `ttlockController.ts`: 3x

#### 6.3 SireService Branch-Support

**Datei:** `backend/src/services/sireService.ts`

**Änderungen:**
1. Constructor erweitern: `constructor(organizationId?: number, branchId?: number)`
2. `loadSettings()` erweitern: Lade aus `Branch.sireSettings` (mit Fallback auf Organisation)
3. Neue Methode: `static async createForBranch(branchId: number)`

**Verwendungsstellen ändern (3x):**
- `lobbyPmsController.ts`: 3x (checkInReservation, registerSire, getSireStatus)

#### 6.4 WhatsAppService Aufrufe korrigieren

**⚠️ WICHTIG**: WhatsAppService hat bereits Branch-Support, wird aber nicht verwendet!

**Datei:** `backend/src/services/whatsappService.ts`
- ✅ Bereits Branch-fähig!
- ❌ Wird überall mit `organizationId` aufgerufen

**Verwendungsstellen ändern (6x):**
- `reservationNotificationService.ts`: 3x
- `reservationController.ts`: 1x
- `boldPaymentService.ts`: 1x
- `updateGuestContactWorker.ts`: 1x

**Pattern:**
```typescript
// ALT:
const whatsappService = new WhatsAppService(reservation.organizationId);

// NEU:
const whatsappService = reservation.branchId
  ? new WhatsAppService(undefined, reservation.branchId)
  : new WhatsAppService(reservation.organizationId);
```

### Phase 7: Frontend-Anpassungen

#### 7.1 Branch-Settings UI erweitern

**Datei:** `frontend/src/components/branch/BranchManagementTab.tsx` (erweitern)

**Neue Tabs/Sections:**
1. **LobbyPMS Settings Tab**
   - API-Token pro Branch
   - Property ID
   - Sync-Einstellungen

2. **Bold Payment Settings Tab**
   - API Key pro Branch
   - Merchant ID pro Branch
   - Environment (sandbox/production)

3. **TTLock Settings Tab**
   - Client ID/Secret pro Branch
   - Username/Password pro Branch
   - Lock IDs pro Branch

4. **SIRE Settings Tab**
   - API URL/Key/Secret pro Branch
   - Property Code pro Branch
   - Auto-Registrierung aktivieren

**Bereits vorhanden:**
- ✅ WhatsApp Settings Tab (bereits implementiert)

#### 7.2 Reservation-Liste erweitern

- Branch-Filter hinzufügen
- Branch-Spalte in Tabelle anzeigen
- Branch-Zuordnung bearbeiten (falls nötig)

### Phase 8: Migration & Rollout

#### 8.1 Bestehende Reservierungen

- **Option A**: Bestehende Reservierungen bleiben ohne `branchId` (optional)
- **Option B**: Manuelle Zuordnung über Frontend
- **Empfehlung**: Option A (optional, kann später zugeordnet werden)

**Fallback-Logik:**
- Wenn `reservation.branchId` vorhanden: Verwende Branch-Settings
- Wenn `reservation.branchId` fehlt: Verwende Organisation-Settings (Rückwärtskompatibilität)

#### 8.2 Email-Import ersetzen

**Vorgehen:**
1. `EmailReservationScheduler` aus `index.ts` entfernen
2. `EmailReservationService` kann im Code bleiben (für späteren Fall)
3. **⚠️ WICHTIG**: Email-Import-Code wird NICHT gelöscht, nur deaktiviert
4. Falls nötig: Kann aus altem Git-Commit wiederhergestellt werden

**Code-Änderungen:**
```typescript
// backend/src/index.ts

// ALT:
// import { EmailReservationScheduler } from './services/emailReservationScheduler';
// EmailReservationScheduler.start();

// NEU:
import { LobbyPmsReservationScheduler } from './services/lobbyPmsReservationScheduler';
LobbyPmsReservationScheduler.start();
```

#### 8.3 Webhook-Handler anpassen

**Problem:** Bold Payment Webhooks verwenden `organizationId`

**Datei:** `backend/src/services/boldPaymentService.ts` - `handleWebhook()`

**Änderung:**
- Webhook findet Reservation via `reference`
- Reservation hat jetzt `branchId`
- Services müssen mit `branchId` aufgerufen werden

**Code:**
```typescript
// In handleWebhook():
const reservation = await prisma.reservation.findFirst({
  where: { paymentLink: { contains: reference } }
});

if (reservation?.branchId) {
  // Verwende Branch-Services
  const ttlockService = await TTLockService.createForBranch(reservation.branchId);
  const whatsappService = new WhatsAppService(undefined, reservation.branchId);
} else {
  // Fallback auf Organisation
  const ttlockService = new TTLockService(reservation.organizationId);
  const whatsappService = new WhatsAppService(reservation.organizationId);
}
```

#### 7.3 Testing

1. **Unit-Tests**: Mapping-Service, Sync-Service
2. **Integration-Tests**: API-Calls, Datenbank-Operationen
3. **E2E-Tests**: Vollständiger Sync-Prozess

## Zusammenfassung der Änderungen

### Datenbank
- ✅ `Reservation.branchId` (optional) - für Branch-Zuordnung
- ✅ `Branch.lobbyPmsSettings` (Json) - LobbyPMS-Konfiguration pro Branch
- ✅ `Branch.boldPaymentSettings` (Json) - Bold Payment-Konfiguration pro Branch
- ✅ `Branch.doorSystemSettings` (Json) - TTLock-Konfiguration pro Branch
- ✅ `Branch.sireSettings` (Json) - SIRE-Konfiguration pro Branch
- ✅ Migrationen erstellen

### Backend Services - LobbyPMS
- ✅ `LobbyPmsService` - Endpoint korrigieren (`/api/v1/bookings`), Branch-Support
- ✅ `LobbyPmsMappingService` - NEU: Daten-Mapping (LobbyPMS → Reservation)
- ✅ `LobbyPmsReservationSyncService` - NEU: Sync pro Branch (Token-basiert)
- ✅ `LobbyPmsReservationScheduler` - NEU: Scheduler pro Branch (ersetzt Email-Scheduler)

### Backend Services - Abhängige Services (KRITISCH!)
- ✅ `BoldPaymentService` - Branch-Support hinzufügen (~8 Aufrufe ändern)
- ✅ `TTLockService` - Branch-Support hinzufügen (~8 Aufrufe ändern)
- ✅ `SireService` - Branch-Support hinzufügen (~3 Aufrufe ändern)
- ✅ `WhatsAppService` - ✅ Bereits Branch-fähig, nur Aufrufe korrigieren (~6 Aufrufe)

### Frontend
- ✅ Branch-Settings UI für LobbyPMS (API-Token pro Branch)
- ✅ Branch-Settings UI für Bold Payment
- ✅ Branch-Settings UI für TTLock
- ✅ Branch-Settings UI für SIRE
- ✅ Reservation-Liste erweitern (Branch-Filter, Branch-Spalte)

### Ersetzungen
- ❌ `EmailReservationScheduler` - wird durch `LobbyPmsReservationScheduler` ersetzt
- ⚠️ `EmailReservationService` - bleibt im Code (für Notfall), wird nicht mehr verwendet

### Code-Änderungen (Aufrufe)
- ~22 Stellen müssen geändert werden (von `organizationId` auf `branchId`)
- Alle Reservation-bezogenen Service-Aufrufe müssen angepasst werden

## ✅ Entscheidungen getroffen

1. **Branch-Zuordnung**: ✅ **Token-basiert**
   - Jeder Branch hat eigenen LobbyPMS API Token
   - Alle Reservierungen, die mit diesem Token abgerufen werden, gehören automatisch zu diesem Branch
   - Kein Mapping nötig!

2. **API-Token**: ✅ **Pro Branch**
   - Jeder Branch kann einen eigenen Token konfigurieren
   - Token wird in `Branch.lobbyPmsSettings.apiKey` gespeichert
   - Fallback auf Organisation-Settings möglich (für Rückwärtskompatibilität)

3. **Email-Import**: ✅ **Komplett ersetzen**
   - Email-Import wird durch API-Import ersetzt
   - Kann später aus altem Commit wiederhergestellt werden, falls nötig
   - `EmailReservationScheduler` wird deaktiviert/entfernt

4. **Migration**: ✅ **Bestehende Reservierungen**
   - `branchId` ist optional
   - Bestehende Reservierungen bleiben ohne `branchId` (können später manuell zugeordnet werden)

## Nächste Schritte

1. ✅ Plan erstellen (DIESER PLAN)
2. ✅ Plan mit Benutzer besprechen
3. ✅ Entscheidungen getroffen:
   - ✅ Token pro Branch
   - ✅ Token-basierte Zuordnung
   - ✅ Email-Import komplett ersetzen
   - ✅ Alle Services müssen pro Branch funktionieren
4. ⏳ Implementierung starten (Phase 1: Datenbank)

## ✅ Finale Klärung

**Branch-Zuordnung:**
- ✅ Jeder Branch hat eigenen LobbyPMS API Token
- ✅ Alle Reservierungen, die mit diesem Token abgerufen werden, gehören automatisch zu diesem Branch
- ✅ Keine komplexe Mapping-Logik nötig
- ✅ Einfach und klar

**Email-Import:**
- ✅ Wird komplett durch API-Import ersetzt
- ✅ Code bleibt erhalten (kann aus Git wiederhergestellt werden)
- ✅ `EmailReservationScheduler` wird deaktiviert

**Service-Abhängigkeiten:**
- ✅ Alle Services müssen pro Branch konfigurierbar sein
- ✅ Bold Payment, TTLock, SIRE, WhatsApp - alle pro Branch
- ✅ Fallback auf Organisation-Settings für Rückwärtskompatibilität

## ⚠️ KRITISCHE RISIKEN OHNE DIESE ÄNDERUNGEN

### Risiko 1: Finanzielle Verluste (KRITISCH)
- Falsche Zahlungslinks → Geld geht an falsches Konto
- **Wahrscheinlichkeit:** HOCH
- **Impact:** KRITISCH

### Risiko 2: Sicherheitsproblem (HOCH)
- Falsche TTLock Passcodes → Gäste können nicht einchecken oder haben Zugang zu falscher Tür
- **Wahrscheinlichkeit:** HOCH
- **Impact:** HOCH

### Risiko 3: Compliance-Verstöße (MITTEL)
- Falsche SIRE-Registrierungen → Bußgelder möglich
- **Wahrscheinlichkeit:** MITTEL
- **Impact:** MITTEL

### Risiko 4: Dateninkonsistenz (MITTEL)
- Branch-Zuordnung geht verloren → Reporting falsch
- **Wahrscheinlichkeit:** HOCH
- **Impact:** MITTEL

## 📋 Checkliste - Was noch zu prüfen ist

### ⚠️ Weitere mögliche Probleme

1. **Task-Erstellung**: Werden Tasks pro Branch erstellt?
   - `TaskAutomationService.createReservationTask()` - prüfen ob Branch-Support nötig
   - Tasks haben bereits `branchId` Feld

2. **Email-Versand**: Gibt es Branch-spezifische Email-Settings?
   - SMTP-Settings sind aktuell pro Organisation
   - Falls pro Branch nötig: `Branch.emailSettings` hinzufügen

3. **Webhooks**: Bold Payment Webhooks - wie werden sie zugeordnet?
   - Webhook-Handler verwendet `organizationId`
   - Muss auf `branchId` umgestellt werden (siehe Phase 8.3)

4. **Reporting**: Reservierungs-Statistiken pro Branch?
   - Frontend-Filter müssen Branch-Support haben
   - Backend-APIs müssen Branch-Filter unterstützen

5. **Berechtigungen**: Wer kann Reservierungen pro Branch sehen/bearbeiten?
   - Middleware prüft `organizationId`
   - Muss auch `branchId` prüfen (falls Branch-spezifische Berechtigungen nötig)

6. **Migration**: Bestehende Reservierungen ohne branchId?
   - Wie werden sie behandelt?
   - Fallback-Logik nötig (siehe Phase 8.1)

7. **Tests**: Alle Services müssen mit Branch-Settings getestet werden
   - Unit-Tests erweitern
   - Integration-Tests pro Branch

8. **Verschlüsselung**: Branch-Settings müssen verschlüsselt werden
   - `encryptApiSettings()` erweitern für Branch-Settings
   - `decryptApiSettings()` erweitern für Branch-Settings

9. **Validierung**: Branch-Settings Schema-Validierung
   - Zod-Schema für Branch-Settings erstellen
   - Validierung in Controller/Service

10. **Frontend-Validierung**: Branch-Settings UI-Validierung
    - Pflichtfelder pro Service
    - Fehlerbehandlung


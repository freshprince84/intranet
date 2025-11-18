# Queue-System Implementierung - Detaillierter Plan

## Status: Planungsphase - NOCH NICHT UMGESETZT

**WICHTIG**: Dieses Dokument beschreibt die geplante Implementierung eines Queue-Systems mit BullMQ. Die Implementierung erfolgt schrittweise mit vollständiger Rückwärtskompatibilität.

---

## 1. Technologie-Vergleich und Entscheidung

### 1.1 Vergleich: BullMQ vs. Alternativen

#### BullMQ (Empfehlung) ✅
**Warum BullMQ?**
- **Modernste Version**: BullMQ ist die aktuelle, aktiv entwickelte Version (Bull ist Legacy)
- **TypeScript-Support**: Native TypeScript-Unterstützung
- **Bessere Performance**: Optimiert für moderne Node.js-Versionen
- **Aktive Community**: Regelmäßige Updates und Bugfixes
- **Redis-basiert**: Skalierbar, persistent, zuverlässig
- **Feature-Complete**: Retry, Priorisierung, Rate Limiting, Monitoring

**Nachteile:**
- Benötigt Redis (neue Infrastruktur-Komponente)
- Zusätzliche Dependency

#### Alternativen (verworfen)

**Bull (Legacy)**
- ❌ Nicht mehr aktiv entwickelt
- ❌ Ältere API
- ❌ Weniger Features

**Agenda (MongoDB-basiert)**
- ❌ Benötigt MongoDB (haben wir nicht)
- ❌ Weniger Features als BullMQ

**Bee-Queue (Redis-basiert)**
- ❌ Weniger Features
- ❌ Kleinere Community

**Node-Cron + Custom Queue**
- ❌ Zu viel Custom-Entwicklung
- ❌ Fehlende Features (Retry, Monitoring, etc.)

### 1.2 Entscheidung: BullMQ

**Begründung:**
- Beste Langzeit-Investition
- Enterprise-ready
- Universell einsetzbar für alle Background-Jobs
- Professionelles Monitoring möglich

---

## 2. Infrastruktur-Anforderungen

### 2.1 Redis-Installation

**Option A: Lokale Redis-Instanz (Development)**
```bash
# Windows (mit WSL oder Docker)
docker run -d -p 6379:6379 redis:7-alpine

# Linux/Mac
brew install redis  # Mac
sudo apt-get install redis-server  # Linux
```

**Option B: Redis Cloud (Production)**
- Redis Cloud Account erstellen
- Connection String in Environment-Variablen

**Option C: Docker Compose (Empfohlen für Development)**
```yaml
# docker-compose.yml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

volumes:
  redis-data:
```

### 2.2 Environment-Variablen

**Neue Variablen in `.env`:**
```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=  # Optional, nur wenn Redis Passwort hat
REDIS_DB=0  # Standard: 0

# Queue Configuration
QUEUE_ENABLED=true  # Feature-Flag für schrittweise Migration
QUEUE_CONCURRENCY=5  # Anzahl paralleler Worker
```

### 2.3 Dependencies

**Neue Packages:**
```json
{
  "dependencies": {
    "bullmq": "^5.x.x",
    "ioredis": "^5.x.x"  // Redis-Client für BullMQ
  }
}
```

---

## 3. Architektur-Übersicht

### 3.1 Komponenten-Struktur

```
backend/src/
├── queues/
│   ├── index.ts                    # Queue-Initialisierung
│   ├── reservationQueue.ts         # Reservierungs-Jobs
│   ├── notificationQueue.ts        # Benachrichtigungs-Jobs
│   ├── paymentQueue.ts             # Payment-Link-Jobs
│   └── workers/
│       ├── reservationWorker.ts    # Worker für Reservierungs-Jobs
│       ├── notificationWorker.ts   # Worker für Benachrichtigungen
│       └── paymentWorker.ts        # Worker für Payment-Links
├── services/
│   ├── queueService.ts             # Service für Job-Erstellung
│   └── ... (bestehende Services)
└── controllers/
    └── ... (bestehende Controller - werden angepasst)
```

### 3.2 Datenfluss

**Aktuell (synchron):**
```
Frontend → Controller → Service → External API → DB Update → Response
         [2-6 Sekunden blockiert]
```

**Neu (mit Queue):**
```
Frontend → Controller → Queue.add() → Response (<50ms)
                                    ↓
                              Worker → Service → External API → DB Update
                              [läuft im Hintergrund]
```

---

## 4. Detaillierte Implementierung

### 4.1 Phase 1: Grund-Setup (Infrastruktur)

#### Schritt 1.1: Redis-Setup
**Ziel**: Redis installieren und konfigurieren

**Aktionen:**
1. Redis installieren (siehe 2.1)
2. Redis-Verbindung testen
3. Environment-Variablen setzen

**Risiken:**
- ⚠️ Redis muss laufen, sonst funktioniert Queue nicht
- **Mitigation**: Health-Check für Redis-Verbindung

#### Schritt 1.2: Dependencies installieren
```bash
cd backend
npm install bullmq ioredis
npm install --save-dev @types/ioredis
```

#### Schritt 1.3: Queue-Service erstellen
**Datei**: `backend/src/services/queueService.ts`

```typescript
import { Queue, QueueOptions } from 'bullmq';
import IORedis from 'ioredis';

// Redis-Connection
const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
  maxRetriesPerRequest: null, // Wichtig für BullMQ
});

// Queue-Instanzen
export const reservationQueue = new Queue('reservation', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 24 * 3600, // 24 Stunden
      count: 1000, // Max 1000 Jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // 7 Tage
    },
  },
});

export const notificationQueue = new Queue('notification', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

export const paymentQueue = new Queue('payment', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

// Health-Check
export async function checkQueueHealth(): Promise<boolean> {
  try {
    await connection.ping();
    return true;
  } catch (error) {
    console.error('[Queue] Redis-Verbindung fehlgeschlagen:', error);
    return false;
  }
}
```

**Warum diese Struktur?**
- Separate Queues für verschiedene Job-Typen → bessere Priorisierung
- Health-Check für Monitoring
- Konfigurierbare Retry-Strategien

---

### 4.2 Phase 2: Worker-Implementierung

#### Schritt 2.1: Reservation Worker
**Datei**: `backend/src/queues/workers/reservationWorker.ts`

```typescript
import { Worker, Job } from 'bullmq';
import { BoldPaymentService } from '../../services/boldPaymentService';
import { WhatsAppService } from '../../services/whatsappService';
import { PrismaClient, ReservationStatus } from '@prisma/client';

const prisma = new PrismaClient();

interface ReservationJobData {
  reservationId: number;
  organizationId: number;
  amount: number;
  currency: string;
  contactType: 'phone' | 'email';
  guestPhone?: string;
  guestEmail?: string;
  guestName: string;
}

export function createReservationWorker(connection: any): Worker {
  return new Worker<ReservationJobData>(
    'reservation',
    async (job: Job<ReservationJobData>) => {
      const { reservationId, organizationId, amount, currency, contactType, guestPhone, guestEmail, guestName } = job.data;

      console.log(`[Reservation Worker] Verarbeite Job für Reservierung ${reservationId}`);

      let paymentLink: string | null = null;
      let sentMessage: string | null = null;
      let sentMessageAt: Date | null = null;

      // Schritt 1: Payment-Link erstellen (wenn Telefonnummer vorhanden)
      if (contactType === 'phone' && guestPhone) {
        try {
          const boldPaymentService = new BoldPaymentService(organizationId);
          const reservation = await prisma.reservation.findUnique({
            where: { id: reservationId }
          });

          if (!reservation) {
            throw new Error(`Reservierung ${reservationId} nicht gefunden`);
          }

          paymentLink = await boldPaymentService.createPaymentLink(
            reservation,
            amount,
            currency,
            `Zahlung für Reservierung ${guestName}`
          );

          console.log(`[Reservation Worker] Payment-Link erstellt: ${paymentLink}`);
        } catch (error) {
          console.error('[Reservation Worker] Fehler beim Erstellen des Payment-Links:', error);
          throw error; // Wird von BullMQ automatisch retried
        }
      }

      // Schritt 2: WhatsApp-Nachricht senden (wenn Telefonnummer vorhanden)
      if (contactType === 'phone' && guestPhone && paymentLink) {
        try {
          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
          const checkInLink = `${frontendUrl}/check-in/${reservationId}`;

          sentMessage = `Hola ${guestName},

¡Bienvenido a La Familia Hostel!

Tu reserva ha sido confirmada.
Cargos: ${amount} ${currency}

Puedes realizar el check-in en línea ahora:
${checkInLink}

Por favor, realiza el pago:
${paymentLink}

¡Te esperamos!`;

          const whatsappService = new WhatsAppService(organizationId);
          const templateName = process.env.WHATSAPP_TEMPLATE_RESERVATION_CONFIRMATION || 'reservation_checkin_invitation';
          const templateParams = [
            guestName,
            checkInLink,
            paymentLink
          ];

          const whatsappSuccess = await whatsappService.sendMessageWithFallback(
            guestPhone,
            sentMessage,
            templateName,
            templateParams
          );

          if (!whatsappSuccess) {
            throw new Error('WhatsApp-Nachricht konnte nicht versendet werden');
          }

          sentMessageAt = new Date();
          console.log(`[Reservation Worker] WhatsApp-Nachricht erfolgreich versendet`);
        } catch (error) {
          console.error('[Reservation Worker] Fehler beim Versenden der WhatsApp-Nachricht:', error);
          throw error; // Wird von BullMQ automatisch retried
        }
      }

      // Schritt 3: Reservierung aktualisieren
      try {
        await prisma.reservation.update({
          where: { id: reservationId },
          data: {
            sentMessage,
            sentMessageAt,
            paymentLink,
            status: sentMessage ? ('notification_sent' as ReservationStatus) : undefined,
          }
        });

        console.log(`[Reservation Worker] ✅ Reservierung ${reservationId} erfolgreich verarbeitet`);
      } catch (error) {
        console.error('[Reservation Worker] Fehler beim Aktualisieren der Reservierung:', error);
        throw error;
      }

      return {
        success: true,
        paymentLink,
        messageSent: !!sentMessage,
      };
    },
    {
      connection,
      concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '5'),
      limiter: {
        max: 10, // Max 10 Jobs pro Sekunde
        duration: 1000,
      },
    }
  );
}
```

**Warum diese Implementierung?**
- ✅ Exakt gleiche Logik wie vorher → Funktionalität bleibt identisch
- ✅ Automatische Retries bei Fehlern
- ✅ Rate Limiting für externe APIs
- ✅ Detailliertes Logging

**Risiken:**
- ⚠️ Worker muss laufen, sonst werden Jobs nicht verarbeitet
- **Mitigation**: Worker-Start in `app.ts`, Health-Check

#### Schritt 2.2: Worker-Initialisierung
**Datei**: `backend/src/queues/index.ts`

```typescript
import IORedis from 'ioredis';
import { createReservationWorker } from './workers/reservationWorker';
import { checkQueueHealth } from '../services/queueService';

const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
  maxRetriesPerRequest: null,
});

let workers: any[] = [];

export async function startWorkers(): Promise<void> {
  // Prüfe Redis-Verbindung
  const isHealthy = await checkQueueHealth();
  if (!isHealthy) {
    console.error('[Queue] ⚠️ Redis nicht verfügbar - Workers werden nicht gestartet');
    return;
  }

  console.log('[Queue] Starte Workers...');

  // Reservation Worker
  const reservationWorker = createReservationWorker(connection);
  workers.push(reservationWorker);

  // Weitere Worker hier hinzufügen...

  console.log('[Queue] ✅ Workers gestartet');
}

export async function stopWorkers(): Promise<void> {
  console.log('[Queue] Stoppe Workers...');
  await Promise.all(workers.map(worker => worker.close()));
  workers = [];
  await connection.quit();
  console.log('[Queue] ✅ Workers gestoppt');
}
```

**Integration in `app.ts`:**
```typescript
import { startWorkers, stopWorkers } from './queues';

// Nach Server-Start
startWorkers().catch(console.error);

// Graceful Shutdown
process.on('SIGTERM', async () => {
  await stopWorkers();
  process.exit(0);
});
```

---

### 4.3 Phase 3: Controller-Anpassung

#### Schritt 3.1: Reservation Controller anpassen
**Datei**: `backend/src/controllers/reservationController.ts`

**WICHTIG**: Feature-Flag für schrittweise Migration!

```typescript
import { reservationQueue } from '../services/queueService';

export const createReservation = async (req: Request, res: Response) => {
  try {
    // ... bestehende Validierung bleibt identisch ...

    // Erstelle Reservierung (bleibt synchron - muss sofort in DB sein)
    let reservation = await prisma.reservation.create({
      data: reservationData,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            displayName: true,
            settings: true
          }
        }
      }
    });

    // NEU: Queue-basierte Verarbeitung (wenn aktiviert)
    const queueEnabled = process.env.QUEUE_ENABLED === 'true';

    if (queueEnabled && contactType === 'phone' && reservation.guestPhone) {
      // Füge Job zur Queue hinzu
      await reservationQueue.add(
        'process-reservation',
        {
          reservationId: reservation.id,
          organizationId: reservation.organizationId,
          amount: amount,
          currency: currency,
          contactType: contactType,
          guestPhone: reservation.guestPhone,
          guestName: reservation.guestName,
        },
        {
          priority: 1, // Hohe Priorität für manuelle Reservierungen
          jobId: `reservation-${reservation.id}`, // Eindeutige ID
        }
      );

      console.log(`[Reservation] Job zur Queue hinzugefügt für Reservierung ${reservation.id}`);

      // Hole aktuelle Reservierung (ohne Updates)
      const finalReservation = await prisma.reservation.findUnique({
        where: { id: reservation.id },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              displayName: true,
              settings: true
            }
          },
          task: true
        }
      });

      // Sofortige Antwort - Job läuft im Hintergrund
      return res.status(201).json({
        success: true,
        data: finalReservation || reservation,
        message: 'Reservierung erstellt. Benachrichtigung wird im Hintergrund versendet.',
      });
    }

    // FALLBACK: Alte synchrone Logik (wenn Queue deaktiviert)
    // ... bestehender Code bleibt unverändert ...
    // (kompletter Block von Zeile 288-397 bleibt als Fallback)

    // ... Rest bleibt identisch ...
  } catch (error) {
    // ... Fehlerbehandlung bleibt identisch ...
  }
};
```

**Warum diese Implementierung?**
- ✅ Feature-Flag ermöglicht schrittweise Migration
- ✅ Fallback auf alte Logik wenn Queue deaktiviert
- ✅ Funktionalität bleibt 100% identisch
- ✅ Sofortige Antwort für Frontend

**Risiken:**
- ⚠️ Wenn Queue deaktiviert, muss alte Logik funktionieren
- **Mitigation**: Fallback-Code bleibt unverändert

---

## 5. Alle betroffenen Stellen mit konkreten Vorteilen

### 5.1 Reservation-Erstellung (PRIMÄRER USE CASE)

**Aktuelle Stelle:**
- `backend/src/controllers/reservationController.ts` → `createReservation()` (Zeile 206-426)

**Aktuelles Problem:**
- Frontend blockiert 2-6 Sekunden
- Payment-Link-Erstellung: ~1-3 Sekunden
- WhatsApp-Versand: ~1-3 Sekunden
- Sequentiell ausgeführt

**Nach Migration:**
- Frontend erhält Antwort in <50ms
- Payment-Link und WhatsApp laufen parallel im Hintergrund
- Worker können mehrere Jobs parallel verarbeiten

**Konkreter Vorteil:**
- **Performance**: 99% schneller für Frontend (von 2-6s auf <50ms)
- **UX**: Kein "Laden"-Spinner mehr
- **Skalierbarkeit**: Mehrere Reservierungen gleichzeitig möglich
- **Zuverlässigkeit**: Automatische Retries bei Fehlern

**Migration:**
- Feature-Flag `QUEUE_ENABLED=true`
- Controller-Code anpassen (siehe 4.3)
- Worker implementieren (siehe 4.2)

---

### 5.2 Reservation Update (Guest Contact)

**Aktuelle Stelle:**
- `backend/src/controllers/reservationController.ts` → `updateGuestContact()` (Zeile 26-200)

**Aktuelles Problem:**
- Blockiert während Payment-Link-Erstellung
- Blockiert während TTLock-Passcode-Generierung
- Blockiert während WhatsApp-Versand

**Nach Migration:**
- Sofortige Antwort
- Alle Operationen im Hintergrund

**Konkreter Vorteil:**
- **Performance**: 95% schneller
- **UX**: Sofortiges Feedback
- **Zuverlässigkeit**: Retry bei TTLock-Fehlern

**Migration:**
- Neuer Job-Typ: `update-guest-contact`
- Worker-Implementierung ähnlich wie Reservation

---

### 5.3 Check-in-Bestätigung

**Aktuelle Stelle:**
- `backend/src/controllers/lobbyPmsController.ts` → `checkInReservation()` (Zeile 201-283)
- `backend/src/services/reservationNotificationService.ts` → `sendCheckInConfirmation()` (Zeile 292-372)

**Aktuelles Problem:**
- TTLock-Passcode-Generierung: ~1-2 Sekunden
- WhatsApp/E-Mail-Versand: ~1-3 Sekunden
- Blockiert Check-in-Prozess

**Nach Migration:**
- Check-in sofort abgeschlossen
- Benachrichtigung im Hintergrund

**Konkreter Vorteil:**
- **Performance**: Gast kann sofort weiterarbeiten
- **UX**: Schnellerer Check-in-Prozess
- **Zuverlässigkeit**: Retry bei TTLock-Fehlern

**Migration:**
- Neuer Job-Typ: `send-check-in-confirmation`
- Worker für TTLock + Notification

---

### 5.4 Späte Check-in-Einladungen (Scheduled)

**Aktuelle Stelle:**
- `backend/src/services/reservationNotificationService.ts` → `sendLateCheckInInvitations()` (Zeile 23-125)
- Wird von `ReservationScheduler` täglich um 20:00 Uhr aufgerufen

**Aktuelles Problem:**
- Verarbeitet alle Reservierungen sequentiell
- Bei 10 Reservierungen: ~30-60 Sekunden
- Blockiert Scheduler-Thread

**Nach Migration:**
- Jede Reservierung als separater Job
- Parallele Verarbeitung
- Scheduler sofort fertig

**Konkreter Vorteil:**
- **Performance**: 10x schneller (parallel statt sequentiell)
- **Skalierbarkeit**: Kann 100+ Reservierungen verarbeiten
- **Zuverlässigkeit**: Einzelne Fehler blockieren nicht alle

**Migration:**
- Scheduler erstellt Jobs statt direkt zu verarbeiten
- Worker verarbeitet Jobs parallel

---

### 5.5 PIN-Generierung und Versand

**Aktuelle Stelle:**
- `backend/src/controllers/reservationController.ts` → `generatePinAndSendNotification()` (Zeile 479-561)
- `backend/src/services/reservationNotificationService.ts` → `generatePinAndSendNotification()` (Zeile 132-285)

**Aktuelles Problem:**
- TTLock-Passcode: ~1-2 Sekunden
- WhatsApp-Versand: ~1-3 Sekunden
- Blockiert Request

**Nach Migration:**
- Sofortige Antwort
- PIN-Generierung im Hintergrund

**Konkreter Vorteil:**
- **Performance**: 90% schneller
- **UX**: Sofortiges Feedback

---

### 5.6 WhatsApp-Webhook-Antworten

**Aktuelle Stelle:**
- `backend/src/controllers/whatsappController.ts` → `handleWebhook()` (Zeile 17-164)

**Aktuelles Problem:**
- Antwort-Nachricht blockiert Webhook
- Webhook sollte schnell antworten (Timeout-Risiko)

**Nach Migration:**
- Webhook antwortet sofort
- Nachricht wird im Hintergrund gesendet

**Konkreter Vorteil:**
- **Zuverlässigkeit**: Kein Webhook-Timeout mehr
- **Performance**: Webhook antwortet in <100ms

---

### 5.7 SIRE-Registrierung

**Aktuelle Stelle:**
- `backend/src/controllers/lobbyPmsController.ts` → `checkInReservation()` (Zeile 238-262)
- `backend/src/controllers/lobbyPmsController.ts` → `registerSire()` (Zeile 410-456)

**Aktuelles Problem:**
- SIRE-API kann langsam sein (~2-5 Sekunden)
- Blockiert Check-in-Prozess

**Nach Migration:**
- Check-in sofort abgeschlossen
- SIRE-Registrierung im Hintergrund

**Konkreter Vorteil:**
- **Performance**: Check-in 80% schneller
- **UX**: Gast kann sofort weiterarbeiten

---

### 5.8 Monatsabrechnungen (PDF-Generierung)

**Aktuelle Stelle:**
- `backend/src/services/monthlyReportScheduler.ts` → `checkAndGenerateMonthlyReports()` (Zeile 23-88)

**Aktuelles Problem:**
- PDF-Generierung kann bei vielen Consultations langsam sein
- Blockiert Scheduler

**Nach Migration:**
- Jede Abrechnung als separater Job
- Parallele Verarbeitung

**Konkreter Vorteil:**
- **Performance**: 5-10x schneller
- **Skalierbarkeit**: Kann viele Abrechnungen parallel verarbeiten

---

### 5.9 Task-Automatisierung

**Aktuelle Stelle:**
- `backend/src/services/taskAutomationService.ts` → verschiedene `create*Task()` Methoden
- Wird von mehreren Controllern aufgerufen

**Aktuelles Problem:**
- Task-Erstellung blockiert Hauptprozess
- Bei mehreren Tasks: sequentiell

**Nach Migration:**
- Tasks werden im Hintergrund erstellt
- Parallele Erstellung möglich

**Konkreter Vorteil:**
- **Performance**: Hauptprozess nicht blockiert
- **Skalierbarkeit**: Viele Tasks parallel

---

### 5.10 Lifecycle-Erstellung

**Aktuelle Stelle:**
- `backend/src/controllers/lifecycleController.ts` → `createLifecycle()` (mehrere Stellen)
- `backend/src/controllers/userController.ts` → `createUser()` (Zeile 1535-1734)

**Aktuelles Problem:**
- Lifecycle-Erstellung kann komplex sein
- Blockiert User-Erstellung

**Nach Migration:**
- User sofort erstellt
- Lifecycle im Hintergrund

**Konkreter Vorteil:**
- **Performance**: User-Erstellung schneller
- **UX**: Sofortiges Feedback

---

## 6. Risikostellen und Mitigation

### 6.1 Redis-Verfügbarkeit

**Risiko**: Wenn Redis nicht verfügbar ist, funktioniert Queue nicht

**Mitigation:**
1. Health-Check vor Worker-Start
2. Fallback auf synchrone Logik wenn Queue deaktiviert
3. Feature-Flag `QUEUE_ENABLED` für schrittweise Migration
4. Monitoring für Redis-Verbindung

**Code:**
```typescript
const queueEnabled = process.env.QUEUE_ENABLED === 'true' && await checkQueueHealth();

if (queueEnabled) {
  // Queue-basierte Verarbeitung
} else {
  // Fallback auf synchrone Logik
}
```

---

### 6.2 Worker-Ausfall

**Risiko**: Wenn Worker nicht läuft, werden Jobs nicht verarbeitet

**Mitigation:**
1. Worker-Start in `app.ts` (automatisch beim Server-Start)
2. Health-Check für Worker-Status
3. Monitoring-Dashboard
4. Alerting bei Worker-Ausfall

**Code:**
```typescript
// In app.ts
startWorkers().catch((error) => {
  console.error('[Queue] Fehler beim Starten der Workers:', error);
  // Server startet trotzdem, aber Queue funktioniert nicht
});
```

---

### 6.3 Job-Fehler

**Risiko**: Jobs können fehlschlagen (API-Fehler, etc.)

**Mitigation:**
1. Automatische Retries (3 Versuche mit Exponential Backoff)
2. Dead Letter Queue für fehlgeschlagene Jobs
3. Detailliertes Logging
4. Monitoring für fehlgeschlagene Jobs

**Konfiguration:**
```typescript
defaultJobOptions: {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000,
  },
  removeOnFail: {
    age: 7 * 24 * 3600, // 7 Tage für Debugging
  },
}
```

---

### 6.4 Datenkonsistenz

**Risiko**: Job läuft, aber DB-Update fehlschlägt

**Mitigation:**
1. Transaktionen für kritische Updates
2. Idempotenz: Jobs können mehrfach ausgeführt werden
3. Status-Tracking in DB

**Code:**
```typescript
// Job-ID basierend auf Reservation-ID
jobId: `reservation-${reservation.id}`

// Prüfe ob bereits verarbeitet
const reservation = await prisma.reservation.findUnique({
  where: { id: reservationId }
});

if (reservation.sentMessage) {
  console.log('Bereits verarbeitet, überspringe');
  return;
}
```

---

### 6.5 Frontend-Erwartungen

**Risiko**: Frontend erwartet sofortige Updates (z.B. `sentMessage`, `paymentLink`)

**Mitigation:**
1. Frontend zeigt "Wird verarbeitet..." Status
2. Polling für Job-Status (optional)
3. WebSocket für Echtzeit-Updates (optional, später)

**Frontend-Anpassung:**
```typescript
// In CreateReservationModal.tsx
const [processingStatus, setProcessingStatus] = useState<'pending' | 'processing' | 'completed'>('pending');

// Nach Reservation-Erstellung
if (response.data.message?.includes('im Hintergrund')) {
  setProcessingStatus('processing');
  // Optional: Polling für Status
  pollReservationStatus(reservation.id);
}
```

---

## 7. Migration-Strategie

### 7.1 Schrittweise Migration

**Phase 1: Setup (Woche 1)**
1. Redis installieren
2. Dependencies installieren
3. Queue-Service erstellen
4. Worker-Grundstruktur

**Phase 2: Erste Migration (Woche 2)**
1. Reservation-Erstellung migrieren
2. Feature-Flag aktivieren
3. Testing
4. Monitoring einrichten

**Phase 3: Weitere Migrationen (Woche 3-4)**
1. Check-in-Bestätigung
2. Guest Contact Update
3. Scheduled Jobs

**Phase 4: Vollständige Migration (Woche 5)**
1. Alle Stellen migriert
2. Alte synchrone Logik entfernen (optional)
3. Dokumentation aktualisieren

---

### 7.2 Rollback-Strategie

**Wenn Probleme auftreten:**
1. Feature-Flag auf `false` setzen
2. System läuft mit alter Logik weiter
3. Keine Datenverluste (Jobs bleiben in Queue)

**Code:**
```typescript
// Einfacher Rollback
QUEUE_ENABLED=false
```

---

## 8. Testing-Strategie

### 8.1 Unit-Tests

**Zu testen:**
- Queue-Service-Initialisierung
- Worker-Logik
- Job-Daten-Validierung

**Beispiel:**
```typescript
describe('Reservation Worker', () => {
  it('sollte Payment-Link erstellen', async () => {
    // Mock Services
    // Erstelle Test-Job
    // Prüfe Ergebnis
  });
});
```

---

### 8.2 Integration-Tests

**Zu testen:**
- Controller → Queue → Worker → DB
- Fehlerbehandlung
- Retry-Logik

---

### 8.3 E2E-Tests

**Zu testen:**
- Frontend → Backend → Queue → Worker
- Vollständiger Flow
- Status-Updates

---

## 9. Monitoring und Observability

### 9.1 Queue-Monitoring

**BullMQ Board (Optional):**
```bash
npm install @bull-board/express @bull-board/api
```

**Eigene Monitoring-Endpoints:**
```typescript
// GET /api/admin/queue/stats
app.get('/api/admin/queue/stats', async (req, res) => {
  const reservationStats = await reservationQueue.getJobCounts();
  res.json({
    reservation: reservationStats,
    // ...
  });
});
```

---

### 9.2 Logging

**Strukturiertes Logging:**
```typescript
console.log('[Queue] Job gestartet', {
  jobId: job.id,
  reservationId: job.data.reservationId,
  timestamp: new Date().toISOString(),
});
```

---

## 10. Performance-Verbesserungen (konkret)

### 10.1 Reservation-Erstellung

**Vorher:**
- Frontend blockiert: 2-6 Sekunden
- Sequentiell: Payment → WhatsApp

**Nachher:**
- Frontend blockiert: <50ms (99% schneller)
- Parallel: Payment + WhatsApp gleichzeitig
- Skalierbar: Mehrere Reservierungen parallel

**Messbare Verbesserung:**
- Response-Zeit: 2-6s → <50ms
- Durchsatz: 1 Reservierung/min → 10+ Reservierungen/min

---

### 10.2 Scheduled Jobs

**Vorher:**
- 10 Reservierungen: ~30-60 Sekunden (sequentiell)

**Nachher:**
- 10 Reservierungen: ~3-6 Sekunden (parallel, 5 Worker)
- 100 Reservierungen: ~20-40 Sekunden (statt 5-10 Minuten)

**Messbare Verbesserung:**
- Verarbeitungszeit: 10x schneller
- Skalierbarkeit: Linear mit Worker-Anzahl

---

## 11. Dokumentation

### 11.1 Code-Dokumentation

**Jede Queue/Worker dokumentieren:**
- Job-Typ
- Erwartete Daten
- Retry-Strategie
- Fehlerbehandlung

---

### 11.2 Benutzer-Dokumentation

**Update:**
- `docs/modules/NOTIFICATION_SYSTEM.md`
- `docs/implementation_plans/LOBBYPMS_INTEGRATION.md`

**Neue Dokumentation:**
- `docs/technical/QUEUE_SYSTEM.md`

---

## 12. Checkliste für Implementierung

### Phase 1: Setup
- [ ] Redis installieren und konfigurieren
- [ ] Dependencies installieren (`bullmq`, `ioredis`)
- [ ] Environment-Variablen setzen
- [ ] Queue-Service erstellen
- [ ] Health-Check implementieren

### Phase 2: Worker
- [ ] Reservation Worker implementieren
- [ ] Worker-Initialisierung in `app.ts`
- [ ] Graceful Shutdown implementieren
- [ ] Logging einrichten

### Phase 3: Controller
- [ ] `createReservation` anpassen
- [ ] Feature-Flag implementieren
- [ ] Fallback-Logik testen
- [ ] Frontend-Anpassung (optional)

### Phase 4: Testing
- [ ] Unit-Tests schreiben
- [ ] Integration-Tests
- [ ] E2E-Tests
- [ ] Performance-Tests

### Phase 5: Migration
- [ ] Feature-Flag aktivieren
- [ ] Monitoring einrichten
- [ ] Produktions-Test
- [ ] Weitere Stellen migrieren

### Phase 6: Dokumentation
- [ ] Code dokumentieren
- [ ] Technische Dokumentation aktualisieren
- [ ] Migration-Guide erstellen

---

## 13. Zusammenfassung

**Was wird implementiert:**
- BullMQ Queue-System mit Redis
- Worker für Background-Jobs
- Schrittweise Migration mit Feature-Flag
- Vollständige Rückwärtskompatibilität

**Vorteile:**
- 99% schnellere Frontend-Response
- Automatische Retries
- Skalierbarkeit
- Monitoring
- 15+ Stellen profitieren

**Risiken:**
- Redis-Abhängigkeit (mit Health-Check + Fallback)
- Worker muss laufen (mit Auto-Start)
- Datenkonsistenz (mit Transaktionen + Idempotenz)

**Nächste Schritte:**
1. Redis installieren
2. Dependencies installieren
3. Grund-Setup implementieren
4. Erste Migration (Reservation-Erstellung)
5. Testing
6. Produktions-Deployment

---

**Status**: Planungsphase - Bereit für Implementierung nach Bestätigung


# Email-Reservation-Parsing - Implementierungsplan

## Überblick

Da kein direkter Zugriff auf die LobbyPMS-API möglich ist, sollen Reservation-Emails von lobbybookings.com automatisch ausgelesen, geparst und als Reservationen im System erstellt werden. Jede Email entspricht einer Reservation.

## Ziel

Automatische Extraktion von Reservation-Daten aus Emails und Erstellung von Reservationen im System mit automatischem WhatsApp-Versand.

## Anforderungen

### Zu extrahierende Daten aus Email

Basierend auf dem Email-Beispiel (siehe Bild):

1. **Reservation Code**: `6057955462` (z.B. aus "Recibiste una nueva reserva de Booking.com para La Familia Hostel - Manila" oder explizit als "Reserva: 6057955462")
2. **Gast-Name**: `Nastassia Yankouskaya` (aus "Titular:")
3. **Kontaktinformation**: 
   - Email: `nyanko.690495@guest.booking.com` (aus "Email del huésped:")
   - ODER Telefonnummer (falls vorhanden)
4. **Check-in-Datum**: `17/11/2025` (aus "Check in: 17/11/2025")
5. **Check-out-Datum**: `21/11/2025` (aus "Check out: 21/11/2025")
6. **Betrag**: `COP 186600` (aus "Total: COP 186600")
7. **Währung**: `COP` (aus "Total: COP 186600")

### Zusätzliche Informationen (optional)

- **Nächte**: `4 noches` (aus "4 noches, 1 habitaciones, 1 huéspedes")
- **Zimmer**: `1 habitaciones`
- **Gäste**: `1 huéspedes`
- **Nationalität**: `Bielorrusia` (aus "Titular: Nastassia Yankouskaya Bielorrusia")
- **Kommission**: `COP 27990` (aus "Comisión: COP 27990")

## Aktueller Stand im System

### ✅ Bereits vorhanden

1. **Reservation-Erstellung** (`backend/src/controllers/reservationController.ts`)
   - `createReservation()` - Erstellt Reservation mit `guestName`, `contact`, `amount`, `currency`
   - Automatische Erkennung von Telefonnummer vs. Email via `detectContactType()`
   - Automatischer WhatsApp-Versand nach Erstellung (wenn Telefonnummer vorhanden)
   - Payment-Link-Erstellung via `BoldPaymentService`
   - Check-in-Link-Generierung

2. **WhatsApp-Service** (`backend/src/services/whatsappService.ts`)
   - Vollständig implementiert
   - Template-basierte Nachrichten
   - Automatischer Versand nach Reservation-Erstellung

3. **Email-Service** (`backend/src/services/emailService.ts`)
   - **NUR für Senden** implementiert (SMTP via nodemailer)
   - **KEIN Email-Empfang** implementiert

4. **KI-basierte Text-Extraktion** (`backend/src/routes/documentRecognition.ts`)
   - OpenAI GPT-4 Vision für Dokumentenerkennung
   - Kann als Vorlage für Email-Parsing dienen

5. **WhatsApp-Message-Parser** (`backend/src/services/whatsappMessageParser.ts`)
   - Beispiel für strukturiertes Parsing von Text-Nachrichten
   - Kann als Vorlage für Email-Parsing dienen

### ❌ Fehlt

1. **Email-Empfang** (IMAP/POP3)
2. **Email-Parsing** (KI oder Regex-basiert)
3. **Automatische Email-Überwachung** (Scheduler)
4. **Deduplizierung** (verhindert doppelte Reservationen)

## Technische Optionen

### Option 1: IMAP-basierter Email-Empfang (Empfohlen)

**Vorteile:**
- Standard-Protokoll, funktioniert mit allen Email-Providern
- Kann auf bestimmte Ordner/Filter zugreifen
- Kann Emails als "gelesen" markieren
- Kann Emails verschieben/löschen

**Nachteile:**
- Erfordert IMAP-Zugangsdaten
- Erfordert kontinuierliche Verbindung oder Polling

**Implementierung:**
- Bibliothek: `imap` (npm package `imap`) oder `node-imap`
- Alternative: `mailparser` für Email-Parsing

### Option 2: Email-Webhook (Falls verfügbar)

**Vorteile:**
- Echtzeit-Verarbeitung
- Keine kontinuierliche Verbindung nötig

**Nachteile:**
- Nicht alle Email-Provider unterstützen Webhooks
- Erfordert öffentlich erreichbaren Endpoint (HTTPS)

**Implementierung:**
- Webhook-Endpoint: `/api/email-webhook/reservation`
- Validierung via Secret/Token

### Option 3: Gmail API / Outlook API

**Vorteile:**
- Offizielle APIs mit guter Dokumentation
- OAuth2-Authentifizierung
- Push-Notifications möglich

**Nachteile:**
- Provider-spezifisch
- OAuth2-Setup erforderlich

**Implementierung:**
- Gmail API: `googleapis` npm package
- Outlook API: `@microsoft/microsoft-graph-client`

## Parsing-Strategien

### Strategie 1: Regex-basiertes Parsing (Schnell, aber fragil)

**Vorteile:**
- Schnell
- Keine externen API-Calls
- Geringe Kosten

**Nachteile:**
- Fragil bei Email-Format-Änderungen
- Muss für verschiedene Email-Formate angepasst werden

**Implementierung:**
```typescript
// Beispiel-Patterns
const reservationCodePattern = /Reserva:\s*(\d+)/i;
const guestNamePattern = /Titular:\s*([^\n]+)/i;
const checkInPattern = /Check in:\s*(\d{2}\/\d{2}\/\d{4})/i;
const totalPattern = /Total:\s*([A-Z]{3})\s*(\d+)/i;
```

### Strategie 2: KI-basiertes Parsing (Robust, aber teurer)

**Vorteile:**
- Robust gegen Format-Änderungen
- Kann verschiedene Email-Formate verarbeiten
- Kann auch unstrukturierte Emails parsen

**Nachteile:**
- Langsamer (API-Call)
- Kosten (OpenAI API)
- Abhängigkeit von externem Service

**Implementierung:**
- OpenAI GPT-4 für Text-Extraktion
- Ähnlich wie `documentRecognition.ts`
- System-Prompt: "Extrahiere Reservation-Daten aus dieser Email..."

### Strategie 3: Hybrid (Regex + KI-Fallback)

**Vorteile:**
- Schnell für Standard-Emails (Regex)
- Robust für unerwartete Formate (KI)

**Nachteile:**
- Komplexere Implementierung

**Implementierung:**
1. Versuche zuerst Regex-Parsing
2. Falls Parsing fehlschlägt oder unvollständig → KI-Parsing

## Implementierungsplan

### Phase 1: Email-Empfang (IMAP)

#### 1.1 Dependencies installieren

```bash
npm install imap mailparser --save
npm install @types/imap @types/mailparser --save-dev
```

#### 1.2 Email-Reading-Service erstellen

**Datei:** `backend/src/services/emailReadingService.ts`

**Funktionen:**
- `connectToMailbox()` - Verbindung zu IMAP-Server
- `fetchUnreadEmails()` - Holt ungelesene Emails
- `markAsRead()` - Markiert Email als gelesen
- `moveToFolder()` - Verschiebt Email in Ordner (z.B. "Processed")

**Konfiguration:**
- IMAP-Host, Port, User, Password
- Ordner-Name für zu verarbeitende Emails (z.B. "INBOX")
- Filter: Nur Emails von `notification@lobbybookings.com` oder mit Betreff "Nueva reserva"

#### 1.3 Organisation-Settings erweitern

**Erweiterung:** `Organization.settings` JSON-Struktur

```typescript
interface OrganizationSettings {
  // ... bestehende Settings ...
  emailReading?: {
    enabled: boolean;
    provider: 'imap' | 'gmail-api' | 'outlook-api';
    imap?: {
      host: string;
      port: number;
      secure: boolean; // TLS/SSL
      user: string;
      password: string; // Verschlüsselt speichern!
      folder: string; // z.B. "INBOX"
      processedFolder?: string; // z.B. "Processed"
    };
    filters?: {
      from?: string[]; // z.B. ["notification@lobbybookings.com"]
      subject?: string[]; // z.B. ["Nueva reserva", "New reservation"]
    };
  };
}
```

### Phase 2: Email-Parsing

#### 2.1 Email-Parser-Service erstellen

**Datei:** `backend/src/services/emailReservationParser.ts`

**Funktionen:**
- `parseReservationEmail(emailContent: string, emailHtml?: string): ParsedReservationEmail | null`
- `extractReservationCode(text: string): string | null`
- `extractGuestName(text: string): string | null`
- `extractContactInfo(text: string): { email?: string; phone?: string }`
- `extractDates(text: string): { checkIn: Date; checkOut: Date } | null`
- `extractAmount(text: string): { amount: number; currency: string } | null`

**Interface:**
```typescript
interface ParsedReservationEmail {
  reservationCode: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  checkInDate: Date;
  checkOutDate: Date;
  amount: number;
  currency: string;
  nights?: number;
  rooms?: number;
  guests?: number;
  nationality?: string;
  commission?: number;
}
```

#### 2.2 Regex-Patterns definieren

**Patterns für spanische Emails (lobbybookings.com):**

```typescript
const patterns = {
  reservationCode: [
    /Reserva:\s*(\d+)/i,
    /reservation code:\s*(\d+)/i,
    /código de reserva:\s*(\d+)/i
  ],
  guestName: [
    /Titular:\s*([^\n]+)/i,
    /Guest:\s*([^\n]+)/i,
    /Huésped:\s*([^\n]+)/i
  ],
  guestEmail: [
    /Email del huésped:\s*([^\s\n]+)/i,
    /Guest email:\s*([^\s\n]+)/i,
    /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i // Fallback: allgemeines Email-Pattern
  ],
  checkInDate: [
    /Check in:\s*(\d{2})\/(\d{2})\/(\d{4})/i,
    /Entrada:\s*(\d{2})\/(\d{2})\/(\d{4})/i
  ],
  checkOutDate: [
    /Check out:\s*(\d{2})\/(\d{2})\/(\d{4})/i,
    /Salida:\s*(\d{2})\/(\d{2})\/(\d{4})/i
  ],
  total: [
    /Total:\s*([A-Z]{3})\s*(\d+[\d,.]*)/i,
    /Total:\s*(\d+[\d,.]*)\s*([A-Z]{3})/i
  ],
  nights: [
    /(\d+)\s*noches?/i,
    /(\d+)\s*nights?/i
  ]
};
```

#### 2.3 KI-Parsing (Optional, als Fallback)

**Datei:** `backend/src/services/emailReservationParser.ts` (erweitert)

**Funktion:**
- `parseWithAI(emailContent: string): Promise<ParsedReservationEmail | null>`

**Implementierung:**
- Ähnlich wie `documentRecognition.ts`
- OpenAI GPT-4 für Text-Extraktion
- System-Prompt: "Extrahiere Reservation-Daten aus dieser Email im JSON-Format..."

### Phase 3: Reservation-Erstellung aus Email

#### 3.1 Email-Reservation-Service erstellen

**Datei:** `backend/src/services/emailReservationService.ts`

**Funktionen:**
- `createReservationFromEmail(parsedEmail: ParsedReservationEmail, organizationId: number): Promise<Reservation>`
- `checkDuplicate(reservationCode: string, organizationId: number): Promise<boolean>`

**Logik:**
1. Prüfe auf Duplikate (via `lobbyReservationId` oder `reservationCode`)
2. Erstelle Reservation via `reservationController.createReservation()`
3. Speichere Email-Metadaten (Message-ID, Empfangszeit) für Tracking

#### 3.2 Deduplizierung

**Strategie:**
- Verwende `reservationCode` als `lobbyReservationId` in Reservation-Model
- Prüfe vor Erstellung: `WHERE lobbyReservationId = reservationCode`
- Falls bereits vorhanden → Skip oder Update

**Erweiterung Reservation-Model (optional):**
```prisma
model Reservation {
  // ... bestehende Felder ...
  emailMessageId String? // Email Message-ID für Tracking
  emailReceivedAt DateTime? // Wann wurde Email empfangen
  emailParsedAt DateTime? // Wann wurde Email geparst
}
```

### Phase 4: Automatisierung (Scheduler)

#### 4.1 Email-Check-Scheduler erstellen

**Datei:** `backend/src/services/emailReservationScheduler.ts`

**Funktionen:**
- `checkForNewReservationEmails()` - Prüft auf neue Emails und verarbeitet sie

**Cron-Job:**
- Alle 5-15 Minuten: Email-Check
- Oder: Kontinuierliche IMAP-Connection mit IDLE (Push)

**Implementierung:**
```typescript
import cron from 'node-cron';

export class EmailReservationScheduler {
  static start() {
    // Alle 10 Minuten
    cron.schedule('*/10 * * * *', async () => {
      await EmailReservationService.checkForNewReservationEmails();
    });
  }
}
```

#### 4.2 Integration in index.ts

**Datei:** `backend/src/index.ts` ⚠️ **WICHTIG:** Server-Code gehört in `index.ts`, NICHT in `app.ts`! Die Datei `app.ts` existiert, wird aber NICHT verwendet.

**Erweiterung:**
```typescript
import { EmailReservationScheduler } from './services/emailReservationScheduler';

// Starte Email-Check-Scheduler
EmailReservationScheduler.start();
```

### Phase 5: Controller & API-Endpoints

#### 5.1 Email-Reservation-Controller erstellen

**Datei:** `backend/src/controllers/emailReservationController.ts`

**Endpoints:**
- `POST /api/email-reservations/check` - Manueller Email-Check (für Tests)
- `GET /api/email-reservations/status` - Status der Email-Integration
- `POST /api/email-reservations/parse` - Test-Parsing einer Email (Body: emailContent)

#### 5.2 Routes registrieren

**Datei:** `backend/src/routes/emailReservations.ts`

```typescript
import express from 'express';
import { emailReservationController } from '../controllers/emailReservationController';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permissionMiddleware';

const router = express.Router();

router.post('/check', authenticate, requirePermission('reservations:create'), emailReservationController.checkEmails);
router.get('/status', authenticate, requirePermission('reservations:read'), emailReservationController.getStatus);
router.post('/parse', authenticate, requirePermission('reservations:create'), emailReservationController.parseEmail);

export default router;
```

**Registrierung in index.ts:** ⚠️ **WICHTIG:** Routes werden in `index.ts` registriert, NICHT in `app.ts`!
```typescript
app.use('/api/email-reservations', emailReservationsRoutes);
```

### Phase 6: Fehlerbehandlung & Logging

#### 6.1 Error-Handling

**Strategien:**
- Parsing-Fehler: Logge Email-Inhalt für manuelle Nachbearbeitung
- Duplikat-Erkennung: Logge, aber werfe keinen Fehler
- Reservation-Erstellungs-Fehler: Retry-Logik oder manuelle Nachbearbeitung

#### 6.2 Email-Processing-History

**Optional:** Tracking-Tabelle für verarbeitete Emails

```prisma
model EmailProcessingHistory {
  id            Int      @id @default(autoincrement())
  messageId      String   @unique // Email Message-ID
  from           String
  subject        String
  receivedAt     DateTime
  parsedAt       DateTime?
  processedAt    DateTime?
  reservationId  Int?
  reservation    Reservation? @relation(fields: [reservationId], references: [id])
  status         String   // 'pending', 'parsed', 'created', 'error'
  errorMessage   String?
  rawContent     String?  // Gespeichert für Debugging
  organizationId Int
  organization   Organization @relation(fields: [organizationId], references: [id])
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([messageId])
  @@index([organizationId])
  @@index([status])
}
```

## Datenfluss

```
1. Email empfangen (IMAP)
   ↓
2. Email-Parsing (Regex oder KI)
   ↓
3. Deduplizierung prüfen (lobbyReservationId)
   ↓
4. Reservation erstellen (createReservation)
   ↓
5. Automatischer WhatsApp-Versand (bereits implementiert)
   ↓
6. Email als "gelesen" markieren / verschieben
```

## Konfiguration

### Environment-Variablen

```env
# Email-Reading (optional, falls nicht in Org-Settings)
EMAIL_IMAP_HOST=imap.gmail.com
EMAIL_IMAP_PORT=993
EMAIL_IMAP_USER=reservations@example.com
EMAIL_IMAP_PASS=encrypted_password
EMAIL_IMAP_FOLDER=INBOX
EMAIL_IMAP_PROCESSED_FOLDER=Processed

# KI-Parsing (optional, für Fallback)
OPENAI_API_KEY=sk-...
```

### Organisation-Settings

```json
{
  "emailReading": {
    "enabled": true,
    "provider": "imap",
    "imap": {
      "host": "imap.gmail.com",
      "port": 993,
      "secure": true,
      "user": "reservations@example.com",
      "password": "encrypted_password",
      "folder": "INBOX",
      "processedFolder": "Processed"
    },
    "filters": {
      "from": ["notification@lobbybookings.com"],
      "subject": ["Nueva reserva", "New reservation"]
    }
  }
}
```

## Sicherheit

### Verschlüsselung

- **Email-Passwörter**: Verschlüsselt in Organisation-Settings speichern (wie andere API-Keys)
- **IMAP-Verbindung**: TLS/SSL verwenden (Port 993)

### Berechtigungen

- Email-Reading nur für berechtigte Benutzer (z.B. `reservations:create`)
- Organisation-Isolation: Jede Organisation hat eigene Email-Konfiguration

## Testing

### Test-Emails

1. **Erstelle Test-Email** mit bekanntem Format
2. **Teste Parsing** via `/api/email-reservations/parse`
3. **Teste vollständigen Flow** via `/api/email-reservations/check`

### Mock-Email-Service

**Optional:** Mock-Service für Tests ohne echte Email-Verbindung

**Datei:** `backend/src/services/mockEmailReadingService.ts`

## Offene Fragen / Zu klären

1. **Email-Provider**: Welcher Email-Provider wird verwendet? (Gmail, Outlook, eigener Server?)
2. **Email-Account**: Soll ein dedizierter Account erstellt werden oder bestehender verwendet?
3. **Parsing-Strategie**: Regex oder KI? (Empfehlung: Hybrid)
4. **Deduplizierung**: Wie genau? (Empfehlung: `lobbyReservationId`)
5. **Fehlerbehandlung**: Was passiert bei Parsing-Fehlern? (Empfehlung: Loggen + manuelle Nachbearbeitung)
6. **Email-Aufbewahrung**: Sollen verarbeitete Emails gelöscht oder archiviert werden?

## Nächste Schritte

1. **Email-Account einrichten** (falls noch nicht vorhanden)
2. **IMAP-Zugangsdaten beschaffen**
3. **Test-Email senden** und Format analysieren
4. **Phase 1 implementieren** (Email-Empfang)
5. **Phase 2 implementieren** (Email-Parsing)
6. **Phase 3 implementieren** (Reservation-Erstellung)
7. **Phase 4 implementieren** (Automatisierung)
8. **Testing** mit echten Emails

## Code-Referenzen

### Bestehende Services (als Vorlage)

- `backend/src/services/emailService.ts` - Email-Versand (SMTP)
- `backend/src/services/whatsappMessageParser.ts` - Text-Parsing (Vorlage)
- `backend/src/routes/documentRecognition.ts` - KI-basierte Extraktion (Vorlage)
- `backend/src/controllers/reservationController.ts` - Reservation-Erstellung
- `backend/src/services/reservationScheduler.ts` - Scheduler (Vorlage)

### Datenbank-Modelle

- `backend/prisma/schema.prisma` - Reservation Model (Zeile 1047-1092)

## Implementierungsreihenfolge

### Schritt 1: Email-Empfang (IMAP)
- [ ] Dependencies installieren (`imap`, `mailparser`)
- [ ] `emailReadingService.ts` erstellen
- [ ] Organisation-Settings erweitern
- [ ] Test-Verbindung zu Email-Server

### Schritt 2: Email-Parsing
- [ ] `emailReservationParser.ts` erstellen
- [ ] Regex-Patterns definieren
- [ ] Test-Parsing mit Beispiel-Email
- [ ] Optional: KI-Parsing als Fallback

### Schritt 3: Reservation-Erstellung
- [ ] `emailReservationService.ts` erstellen
- [ ] Deduplizierung implementieren
- [ ] Integration mit `reservationController.createReservation()`
- [ ] Test: Reservation aus Email erstellen

### Schritt 4: Automatisierung
- [ ] `emailReservationScheduler.ts` erstellen
- [ ] Cron-Job konfigurieren
- [ ] Integration in `index.ts` ⚠️ **WICHTIG:** Server-Code gehört in `index.ts`, NICHT in `app.ts`!
- [ ] Test: Automatische Verarbeitung

### Schritt 5: API-Endpoints
- [ ] `emailReservationController.ts` erstellen
- [ ] Routes registrieren
- [ ] Berechtigungen prüfen
- [ ] API-Tests

### Schritt 6: Fehlerbehandlung & Logging
- [ ] Error-Handling implementieren
- [ ] Logging erweitern
- [ ] Optional: `EmailProcessingHistory` Model

### Schritt 7: Dokumentation
- [ ] Setup-Anleitung erstellen
- [ ] API-Dokumentation aktualisieren
- [ ] Troubleshooting-Guide

## Wichtige Hinweise

- ⚠️ **Server-Neustart**: Nach Schema-Änderungen muss der Server neu gestartet werden (nur nach Absprache!)
- ⚠️ **Email-Passwörter**: Verschlüsselt speichern (wie andere API-Keys)
- ⚠️ **IMAP-Verbindung**: TLS/SSL verwenden (Port 993)
- ⚠️ **Deduplizierung**: Wichtig, um doppelte Reservationen zu vermeiden
- ⚠️ **Fehlerbehandlung**: Robust implementieren, da Email-Formate variieren können
- ⚠️ **Testing**: Ausführlich testen mit echten Emails vor Produktiv-Start


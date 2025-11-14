# WhatsApp LobbyPMS Reservierungsprozess - Implementierungsplan

**Datum**: 2025-01-20  
**Status**: ✅ Implementiert

## Übersicht

Automatischer Prozess zur Erstellung von Reservierungen aus WhatsApp-Nachrichten von LobbyPMS und Versand von Zahlungslink + TTLock Code an Gäste.

## Prozessablauf

1. **WhatsApp-Nachricht empfangen** (von LobbyPMS an Business WhatsApp-Nummer)
2. **Nachricht parsen** und Reservierung automatisch erstellen
3. **Nach erstem Status-Shift**: Modal für Telefonnummer/Email des Gastes
4. **Nach Eingabe**: WhatsApp-Nachricht mit Zahlungslink + TTLock Code senden

## Technische Details

### 1. WhatsApp Webhook Handler

**Datei**: `backend/src/controllers/whatsappController.ts` (neu)
**Route**: `POST /api/whatsapp/webhook`

**Funktion**:
- Empfängt eingehende WhatsApp-Nachrichten
- Identifiziert Nachrichten von LobbyPMS (anhand Format)
- Parst Nachricht und extrahiert Reservierungsdaten

**Nachrichtenformat** (von LobbyPMS):
```
🏨 Hola, Se ha generado una nueva reserva desde el motor de reservas:

Propiedad: La Familia Hostel - Manila
Reserva: 18036808
Titular: Bryan Vuithier
Entrada: 13/11/2025
Salida: 15/11/2025
Cargos: COP 360,000
Habitaciones: 1
Huéspedes: 2
👉 Para más detalles, revisa la plataforma en:
https://app.lobbypms.com/
```

**Zu extrahierende Daten**:
- `Propiedad`: Property Name (zur Organisation-Identifikation)
- `Reserva`: LobbyPMS Reservierungs-ID
- `Titular`: Gast-Name
- `Entrada`: Check-in Datum (DD/MM/YYYY)
- `Salida`: Check-out Datum (DD/MM/YYYY)
- `Cargos`: Betrag (z.B. "COP 360,000")
- `Habitaciones`: Anzahl Zimmer
- `Huéspedes`: Anzahl Gäste

### 2. Nachricht-Parser

**Datei**: `backend/src/services/whatsappMessageParser.ts` (neu)

**Funktion**:
- Parst WhatsApp-Nachricht nach definiertem Format
- Extrahiert strukturierte Daten
- Validiert Format

**Interface**:
```typescript
interface ParsedReservationMessage {
  propertyName: string;
  reservationId: string;
  guestName: string;
  checkInDate: Date;
  checkOutDate: Date;
  amount: number;
  currency: string;
  rooms: number;
  guests: number;
}
```

### 3. Automatische Reservierungserstellung

**Datei**: `backend/src/services/whatsappReservationService.ts` (neu)

**Funktion**:
- Erstellt Reservierung aus geparster Nachricht
- Identifiziert Organisation anhand Property Name
- Erstellt Reservation mit Status `confirmed`
- Speichert `lobbyReservationId`

**Logik**:
1. ✅ **Hardcodiert**: Organisation ID = 1 (aktuell)
2. Erstelle Reservation mit:
   - `lobbyReservationId`: Reservierungs-ID aus Nachricht
   - `guestName`: Titular
   - `checkInDate`: Entrada (parsed)
   - `checkOutDate`: Salida (parsed)
   - `status`: `confirmed`
   - `paymentStatus`: `pending`
   - `guestPhone`: `null` (wird später eingetragen)
   - `guestEmail`: `null` (wird später eingetragen)
   - `organizationId`: 1 (hardcodiert)

### 4. Frontend: Modal nach Status-Shift

**Datei**: `frontend/src/components/reservations/GuestContactModal.tsx` (neu)

**Trigger**: Nach erstem Status-Shift einer Reservierung (wenn `guestPhone` und `guestEmail` beide `null`)

**Funktion**:
- Modal zur Eingabe von Telefonnummer oder Email
- Validierung der Eingabe
- API-Call zum Update der Reservierung

**UI**:
- ✅ **Ein Input-Feld**, das automatisch erkennt ob es Tel oder Email ist
- Validierung: Muss ausgefüllt sein
- "Speichern" Button
- Nach Speichern: Automatisch Status-Shift auf `notification_sent`

### 5. Backend: API-Endpunkt für Update

**Datei**: `backend/src/controllers/reservationController.ts` (neu oder erweitern)

**Route**: `PUT /api/reservations/:id/guest-contact`

**Funktion**:
- Aktualisiert `guestPhone` und/oder `guestEmail` (automatische Erkennung)
- Nach Update: Automatisch WhatsApp-Nachricht senden
- Status-Shift auf `notification_sent`
- Speichert versendete Nachricht in DB (für Anzeige)

**Request Body**:
```typescript
{
  guestPhone?: string;
  guestEmail?: string;
}
```

### 6. WhatsApp-Nachricht mit Zahlungslink + TTLock Code

**Datei**: `backend/src/services/reservationNotificationService.ts` (erweitern)

**Funktion**: `sendReservationWelcomeMessage(reservationId: number)`

**Ablauf**:
1. Hole Reservierung aus DB
2. Erstelle Bold Payment Link (mit Betrag aus Reservierung)
3. Erstelle TTLock Passcode (wenn konfiguriert)
4. Sende WhatsApp-Nachricht an `guestPhone`

**Nachrichtentext**:
```
Hola {guestName},

¡Bienvenido a {propertyName}!

Tu reserva ha sido confirmada:
- Entrada: {checkInDate}
- Salida: {checkOutDate}
- Cargos: {amount} {currency}

Por favor, realiza el pago:
{paymentLink}

Tu código de acceso TTLock:
{ttlockCode}

¡Te esperamos!
```

## Dateistruktur

### Backend (neu)
- `backend/src/controllers/whatsappController.ts` - WhatsApp Webhook Handler
- `backend/src/services/whatsappMessageParser.ts` - Nachricht-Parser
- `backend/src/services/whatsappReservationService.ts` - Reservierungserstellung
- `backend/src/controllers/reservationController.ts` - Reservation Controller (neu)
- `backend/src/routes/whatsapp.ts` - WhatsApp Routes (neu)
- `backend/src/routes/reservations.ts` - Reservation Routes (neu)

### Backend (Schema-Änderungen)
- `backend/prisma/schema.prisma` - ReservationStatus Enum erweitern: `notification_sent` hinzufügen
- `backend/prisma/schema.prisma` - Reservation Model: `sentMessage` Feld hinzufügen (für versendete Nachricht)

### Frontend (neu)
- `frontend/src/components/reservations/GuestContactModal.tsx` - Modal für Telefonnummer/Email
- `frontend/src/services/reservationService.ts` - Reservation Service (erweitern)

### Backend (erweitern)
- `backend/src/services/reservationNotificationService.ts` - `sendReservationWelcomeMessage()` hinzufügen

## Implementierungsschritte

### Phase 1: Schema & Migration ✅
1. ✅ ReservationStatus Enum erweitert: `notification_sent` hinzugefügt
2. ✅ Reservation Model erweitert: `sentMessage` und `sentMessageAt` Felder hinzugefügt
3. ✅ Migration erstellt: `20250120120000_add_notification_sent_status_and_sent_message`

### Phase 2: Backend - WhatsApp Webhook ✅
1. ✅ WhatsApp Webhook Handler erstellt (`whatsappController.ts`)
2. ✅ Nachricht-Parser implementiert (`whatsappMessageParser.ts`)
3. ✅ Reservierungserstellung implementiert (`whatsappReservationService.ts`)
4. ✅ Routes erstellt (`whatsapp.ts`)

### Phase 3: Backend - Update & Versand ✅
1. ✅ API-Endpunkt für Guest Contact Update (`reservationController.ts`)
2. ✅ WhatsApp-Nachricht-Versand implementiert (mit Zahlungslink + TTLock Code)
3. ✅ Status-Shift auf `notification_sent` implementiert
4. ✅ Versendete Nachricht wird in DB gespeichert

### Phase 4: Frontend - Modal ✅
1. ✅ GuestContactModal Komponente erstellt
2. ✅ Integration in ReservationDetails
3. ✅ API-Service erstellt (`reservationService.ts`)
4. ✅ Types erweitert (ReservationStatus, Reservation Interface)
5. ✅ Übersetzungen hinzugefügt (DE)

## Entscheidungen

1. **Organisation-Identifikation**: 
   - ✅ **Hardcodiert für Organisation 1** (aktuell)
   - In Zukunft: Lobby ID / API Token mit Niederlassung verknüpft (1:1)
   - Aktuell: Bleibt bei Organisation

2. **Status-Shift Trigger**: 
   - ✅ Phone/Email wird **immer fehlen** (nicht in Nachricht enthalten)
   - ✅ Reservation steht auf Status `confirmed` nach Erstellung
   - ✅ Bei Status-Shift → Modal für Tel/Email
   - ✅ **Ein Feld**, das automatisch erkennt ob es Tel oder Email ist
   - ✅ Nach Eingabe: Automatisch Shift auf Status `notification_sent` (NEUER STATUS)
   - ✅ Möglichkeit, die versendete Nachricht zu sehen (speichern in DB)

3. **WhatsApp Business API Webhook**: 
   - WhatsApp Business API Webhook konfigurieren
   - Webhook-Verifizierung implementieren
   - Nachrichten-Format validieren

4. **Fehlerbehandlung**: 
   - Fehler-Logging
   - Retry-Mechanismus
   - Benachrichtigung an Admin

## Abhängigkeiten

- ✅ WhatsApp Business API konfiguriert
- ✅ TTLock Service funktioniert
- ✅ Bold Payment Service funktioniert
- ✅ Reservation Model existiert
- ✅ LobbyPMS Integration existiert

## Testing

1. **Unit Tests**:
   - Nachricht-Parser
   - Reservierungserstellung
   - WhatsApp-Nachricht-Versand

2. **Integration Tests**:
   - End-to-End: WhatsApp-Nachricht → Reservierung → Modal → WhatsApp-Versand
   - Fehlerbehandlung

3. **Manual Tests**:
   - WhatsApp-Nachricht von LobbyPMS simulieren
   - Modal öffnen und Daten eingeben
   - WhatsApp-Nachricht empfangen

## Dokumentation

Nach Implementierung:
- ✅ Prozess dokumentieren
- ✅ API-Endpunkte dokumentieren
- ✅ Frontend-Komponenten dokumentieren
- ✅ Deployment-Hinweise


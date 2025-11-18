# Reservation-Automatisierung - Implementierungsplan

**Datum**: 2025-01-XX  
**Status**: 📋 Planung abgeschlossen, bereit für Implementierung

## 🎯 Ziel

Aktuell werden bei Erstellung einer Reservation automatisch:
- ✅ Online Check-in-Link erstellt
- ✅ Zahlungslink erstellt  
- ✅ WhatsApp-Nachricht mit beiden Links versendet

**Ziel**: Diese Aktionen sollen nicht mehr zwingend automatisch bei Erstellung passieren, sondern:
1. **Manuell per Button auslösbar** (analog zum Schlüssel-Button für TTLock-Passcode)
2. **Umschaltbar zwischen automatisch und manuell** (Einstellung)
3. **Sidepane zum Bearbeiten** vor dem Versand (Kontaktinfo + Nachricht editierbar)

## 📋 Aktueller Stand - Bestätigt

### ✅ Automatische Aktionen bei Reservation-Erstellung

**Manuelle Erstellung** (`backend/src/controllers/reservationController.ts`):
- **Mit Queue**: Job wird hinzugefügt, verarbeitet im Hintergrund
- **Ohne Queue**: Synchrone Verarbeitung
- **Aktionen**:
  1. Payment-Link erstellen (BoldPaymentService)
  2. Check-in-Link erstellen (LobbyPMS oder Fallback)
  3. WhatsApp-Nachricht versenden (mit beiden Links)
  4. Status auf `notification_sent` setzen

**Erstellung aus Email** (`backend/src/services/emailReservationService.ts`):
- Nur wenn `EMAIL_RESERVATION_WHATSAPP_ENABLED=true`
- Gleiche Aktionen wie oben

### ✅ Schlüssel-Button (analog)

- **Frontend**: `handleGeneratePinAndSend()` in Worktracker.tsx
- **Backend**: `POST /api/reservations/:id/generate-pin-and-send`
- **Service**: `ReservationNotificationService.generatePinAndSendNotification()`
- **Aktionen**: TTLock-Passcode generieren + WhatsApp/E-Mail mit Passcode versenden
- **Button bleibt immer sichtbar** (auch nach Versand)

## 🔧 Implementierungsplan

### Phase 1: Service-Methode extrahieren

**Datei**: `backend/src/services/reservationNotificationService.ts`

**Neue Methode**:
```typescript
/**
 * Sendet Reservation-Einladung (Payment-Link + Check-in-Link + WhatsApp)
 * 
 * @param reservationId - ID der Reservierung
 * @param options - Optionale Parameter (Kontaktinfo, Nachricht)
 */
static async sendReservationInvitation(
  reservationId: number,
  options?: {
    guestPhone?: string;
    guestEmail?: string;
    customMessage?: string;
  }
): Promise<{
  success: boolean;
  paymentLink?: string;
  checkInLink?: string;
  messageSent: boolean;
  sentAt?: Date;
}>
```

**Logik**:
1. Reservation aus DB laden
2. Payment-Link erstellen (BoldPaymentService)
3. Check-in-Link erstellen (generateLobbyPmsCheckInLink)
4. WhatsApp-Nachricht versenden (mit beiden Links)
5. Reservation aktualisieren (Status, Links, Nachricht, Timestamp)
6. **Log-Eintrag erstellen** (siehe Phase 6)

**Fehlerbehandlung** (Vorschlag):
- **Teilweise erfolgreich**: Payment-Link erstellt, aber WhatsApp fehlgeschlagen
  - ✅ Payment-Link trotzdem speichern
  - ✅ Check-in-Link trotzdem speichern
  - ⚠️ Status bleibt auf `confirmed` (nicht `notification_sent`)
  - ✅ Fehler in Log speichern
  - ✅ User bekommt detaillierte Fehlermeldung zurück
- **Komplett fehlgeschlagen**: Payment-Link konnte nicht erstellt werden
  - ❌ Keine Links speichern
  - ❌ Status bleibt auf `confirmed`
  - ✅ Fehler in Log speichern
  - ✅ User bekommt Fehlermeldung zurück

### Phase 2: Einstellung hinzufügen

**Datei**: `backend/src/validation/organizationSettingsSchema.ts`

**Neues Feld**:
```typescript
lobbyPms?: {
  // ... bestehende Felder
  autoSendReservationInvitation?: boolean; // Default: true (Rückwärtskompatibilität)
}
```

**Datei**: `frontend/src/types/organization.ts`

**Erweitern**:
```typescript
lobbyPms?: {
  // ... bestehende Felder
  autoSendReservationInvitation?: boolean;
}
```

**Platzierung der Einstellung** (Vorschlag):
- **Organisation-Settings** → **API-Tab** → **LobbyPMS-Sektion**
- Checkbox: "Automatisch Einladung bei Reservation-Erstellung senden"
- Default: `true` (für Rückwärtskompatibilität)
- Gilt als Default für alle neuen Reservations der Organisation

**Datei**: `frontend/src/components/organization/ApiConfigurationTab.tsx`

**UI hinzufügen** in LobbyPMS-Sektion:
```tsx
<div className="mb-4">
  <label className="flex items-center">
    <input
      type="checkbox"
      checked={settings.lobbyPms?.autoSendReservationInvitation !== false}
      onChange={(e) => {
        setSettings({
          ...settings,
          lobbyPms: {
            ...settings.lobbyPms,
            autoSendReservationInvitation: e.target.checked
          }
        });
      }}
      className="mr-2"
    />
    <span>Automatisch Einladung bei Reservation-Erstellung senden</span>
  </label>
</div>
```

### Phase 3: Controller anpassen

**Datei**: `backend/src/controllers/reservationController.ts`

**`createReservation` anpassen**:
```typescript
// Nach Reservation-Erstellung:
const organization = reservation.organization;
const settings = organization.settings as any;
const autoSend = settings?.lobbyPms?.autoSendReservationInvitation !== false; // Default: true

if (autoSend && contactType === 'phone' && reservation.guestPhone) {
  // Queue oder synchron (wie bisher)
  if (queueEnabled && isQueueHealthy) {
    await reservationQueue.add(...);
  } else {
    // Synchrone Verarbeitung
    await ReservationNotificationService.sendReservationInvitation(reservation.id);
  }
}
```

**Datei**: `backend/src/queues/workers/reservationWorker.ts`

**Anpassen**: Verwendet jetzt `sendReservationInvitation()` statt direkter Logik

**Datei**: `backend/src/services/emailReservationService.ts`

**Anpassen**: Verwendet jetzt `sendReservationInvitation()` statt direkter Logik

### Phase 4: Neuer API-Endpunkt

**Datei**: `backend/src/controllers/reservationController.ts`

**Neue Funktion**:
```typescript
/**
 * POST /api/reservations/:id/send-invitation
 * Sendet Reservation-Einladung manuell (mit optionalen Parametern)
 */
export const sendReservationInvitation = async (req: Request, res: Response) => {
  // Validierung
  // Reservation laden
  // sendReservationInvitation() aufrufen mit optionalen Parametern
  // Response zurückgeben
}
```

**Datei**: `backend/src/routes/reservations.ts`

**Neue Route**:
```typescript
router.post('/:id/send-invitation', (req, res, next) => {
  sendReservationInvitation(req, res).catch(next);
});
```

**Request Body** (optional):
```typescript
{
  guestPhone?: string;  // Überschreibt Reservation.guestPhone
  guestEmail?: string;  // Überschreibt Reservation.guestEmail
  customMessage?: string; // Überschreibt Standard-Nachricht
}
```

### Phase 5: Frontend-Sidepane

**Neue Datei**: `frontend/src/components/reservations/SendInvitationSidepane.tsx`

**Komponente**:
- Sidepane-Pattern (wie CreateReservationModal, OffboardingStartModal)
- **Felder**:
  1. **Kontaktinfo**:
     - Telefonnummer (Input, Default: Reservation.guestPhone)
     - E-Mail (Input, Default: Reservation.guestEmail)
  2. **Nachricht**:
     - Textarea mit fertiger Nachricht (editierbar)
     - Variablen: {{guestName}}, {{checkInLink}}, {{paymentLink}}
     - Preview der finalen Nachricht
  3. **Buttons**:
     - "Abbrechen"
     - "Senden" (disabled wenn keine Kontaktinfo)

**Props**:
```typescript
interface SendInvitationSidepaneProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: Reservation;
  onSuccess: () => void;
}
```

**Logik**:
1. Bei Öffnen: Reservation-Daten laden
2. Payment-Link und Check-in-Link vorab generieren (oder beim Senden?)
3. Standard-Nachricht generieren
4. User kann Kontaktinfo und Nachricht bearbeiten
5. Beim Senden: API-Endpunkt aufrufen mit bearbeiteten Daten
6. Erfolg/Fehler anzeigen

**Datei**: `frontend/src/services/reservationService.ts`

**Neue Methode**:
```typescript
async sendInvitation(
  id: number,
  options?: {
    guestPhone?: string;
    guestEmail?: string;
    customMessage?: string;
  }
): Promise<Reservation> {
  const response = await axiosInstance.post(
    API_ENDPOINTS.RESERVATION.SEND_INVITATION(id),
    options
  );
  return response.data.data || response.data;
}
```

**Datei**: `frontend/src/config/api.ts`

**Neuer Endpunkt**:
```typescript
SEND_INVITATION: (id: number) => `/reservations/${id}/send-invitation`
```

### Phase 6: Button in Frontend

**Datei**: `frontend/src/pages/Worktracker.tsx`

**Button hinzufügen** (links neben Key-Button):
```tsx
// In Card-Actions (Zeile ~3118)
const actionButtons = hasWritePermission ? (
  <div className="flex items-center space-x-2">
    {/* NEU: Einladung senden Button */}
    <div className="relative group">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setSelectedReservationForInvitation(reservation);
          setIsSendInvitationSidepaneOpen(true);
        }}
        className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        title={t('reservations.sendInvitation', 'Einladung senden')}
      >
        <PaperAirplaneIcon className="h-4 w-4" />
      </button>
      <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
        {t('reservations.sendInvitation', 'Einladung senden')}
      </div>
    </div>
    
    {/* Bestehender Key-Button */}
    <div className="relative group">
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleGeneratePinAndSend(reservation.id);
        }}
        // ... bestehender Code
      >
        {/* ... */}
      </button>
    </div>
  </div>
) : null;
```

**Mobile/Desktop Unterschiede**:
- **Mobile**: Buttons nebeneinander, kompakt
- **Desktop**: Buttons nebeneinander, mit Tooltip
- **Responsive**: `space-x-2` für Abstand, `p-1.5` für Touch-Targets

**State hinzufügen**:
```typescript
const [selectedReservationForInvitation, setSelectedReservationForInvitation] = useState<Reservation | null>(null);
const [isSendInvitationSidepaneOpen, setIsSendInvitationSidepaneOpen] = useState(false);
```

**Sidepane rendern**:
```tsx
{selectedReservationForInvitation && (
  <SendInvitationSidepane
    isOpen={isSendInvitationSidepaneOpen}
    onClose={() => {
      setIsSendInvitationSidepaneOpen(false);
      setSelectedReservationForInvitation(null);
    }}
    reservation={selectedReservationForInvitation}
    onSuccess={() => {
      loadReservations();
      setIsSendInvitationSidepaneOpen(false);
      setSelectedReservationForInvitation(null);
    }}
  />
)}
```

**Auch in Tabelle-Ansicht** (Zeile ~3200):
- Gleicher Button in Actions-Spalte

### Phase 7: Log-Historie

**Datenbank-Schema** (Prisma):

**Neue Tabelle**: `ReservationNotificationLog`

```prisma
model ReservationNotificationLog {
  id                Int       @id @default(autoincrement())
  reservationId     Int
  notificationType  String    // 'invitation', 'pin', 'checkin_confirmation'
  channel           String    // 'whatsapp', 'email', 'both'
  success           Boolean
  sentAt            DateTime
  sentTo            String?   // Telefonnummer oder E-Mail
  message           String?   // Versendete Nachricht
  paymentLink       String?   // Falls relevant
  checkInLink       String?   // Falls relevant
  errorMessage      String?   // Falls Fehler
  createdAt         DateTime  @default(now())
  
  reservation       Reservation @relation(fields: [reservationId], references: [id], onDelete: Cascade)
  
  @@index([reservationId])
  @@index([sentAt])
}
```

**Migration erstellen**:
```bash
npx prisma migrate dev --name add_reservation_notification_log
```

**Service erweitern**:

**Datei**: `backend/src/services/reservationNotificationService.ts`

**Log-Methode**:
```typescript
private static async logNotification(
  reservationId: number,
  notificationType: 'invitation' | 'pin' | 'checkin_confirmation',
  channel: 'whatsapp' | 'email' | 'both',
  success: boolean,
  data: {
    sentTo?: string;
    message?: string;
    paymentLink?: string;
    checkInLink?: string;
    errorMessage?: string;
  }
): Promise<void> {
  await prisma.reservationNotificationLog.create({
    data: {
      reservationId,
      notificationType,
      channel,
      success,
      sentAt: new Date(),
      ...data
    }
  });
}
```

**In `sendReservationInvitation()` verwenden**:
- Bei Erfolg: Log mit `success: true`
- Bei Fehler: Log mit `success: false` + `errorMessage`

**API-Endpunkt für Logs**:

**Datei**: `backend/src/controllers/reservationController.ts`

```typescript
/**
 * GET /api/reservations/:id/notification-logs
 * Holt Log-Historie für eine Reservation
 */
export const getReservationNotificationLogs = async (req: Request, res: Response) => {
  // Validierung
  // Logs aus DB laden
  // Response zurückgeben
}
```

**Frontend-Anzeige**:

**Datei**: `frontend/src/components/reservations/ReservationDetails.tsx`

**Log-Sektion hinzufügen**:
```tsx
{/* Notification Logs */}
<ReservationNotificationLogs reservationId={reservation.id} />
```

**Neue Komponente**: `frontend/src/components/reservations/ReservationNotificationLogs.tsx`

- Tabelle mit Logs
- Sortiert nach `sentAt` (neueste zuerst)
- Zeigt: Typ, Kanal, Erfolg, Zeit, Details

## 📁 Dateien, die geändert werden müssen

### Backend

1. **`backend/src/services/reservationNotificationService.ts`**
   - Neue Methode `sendReservationInvitation()`
   - Log-Methode `logNotification()`

2. **`backend/src/controllers/reservationController.ts`**
   - `createReservation()` anpassen (Einstellung prüfen)
   - Neue Funktion `sendReservationInvitation()`
   - Neue Funktion `getReservationNotificationLogs()`

3. **`backend/src/queues/workers/reservationWorker.ts`**
   - Verwendet jetzt `sendReservationInvitation()`

4. **`backend/src/services/emailReservationService.ts`**
   - Verwendet jetzt `sendReservationInvitation()`

5. **`backend/src/routes/reservations.ts`**
   - Neue Route `POST /:id/send-invitation`
   - Neue Route `GET /:id/notification-logs`

6. **`backend/src/validation/organizationSettingsSchema.ts`**
   - Neues Feld `autoSendReservationInvitation`

7. **`backend/prisma/schema.prisma`**
   - Neues Model `ReservationNotificationLog`

8. **Migration**
   - `npx prisma migrate dev --name add_reservation_notification_log`

### Frontend

1. **`frontend/src/types/organization.ts`**
   - Erweitern `OrganizationSettings`

2. **`frontend/src/types/reservation.ts`**
   - Neuer Type `ReservationNotificationLog` (optional)

3. **`frontend/src/services/reservationService.ts`**
   - Neue Methode `sendInvitation()`
   - Neue Methode `getNotificationLogs()`

4. **`frontend/src/config/api.ts`**
   - Neuer Endpunkt `SEND_INVITATION`
   - Neuer Endpunkt `NOTIFICATION_LOGS`

5. **`frontend/src/components/organization/ApiConfigurationTab.tsx`**
   - UI für Einstellung `autoSendReservationInvitation`

6. **`frontend/src/pages/Worktracker.tsx`**
   - Button hinzufügen (Card + Tabelle)
   - State für Sidepane
   - Sidepane rendern

7. **`frontend/src/components/reservations/SendInvitationSidepane.tsx`** (NEU)
   - Sidepane-Komponente

8. **`frontend/src/components/reservations/ReservationNotificationLogs.tsx`** (NEU)
   - Log-Anzeige-Komponente

9. **`frontend/src/components/reservations/ReservationDetails.tsx`**
   - Log-Sektion hinzufügen

10. **`frontend/src/i18n/locales/*.json`**
    - Übersetzungen für neue Texte

## 🎨 UI/UX Details

### Button-Design

- **Icon**: `PaperAirplaneIcon` (von Heroicons)
- **Farbe**: Blau (analog zu anderen Action-Buttons)
- **Position**: Links neben Key-Button
- **Tooltip**: "Einladung senden"
- **Mobile**: Kompakt, Touch-freundlich
- **Desktop**: Mit Hover-Tooltip

### Sidepane-Design

- **Pattern**: Wie `CreateReservationModal`, `OffboardingStartModal`
- **Breite**: `max-w-sm` (wie andere Sidepanes)
- **Felder**:
  - Kontaktinfo (Telefonnummer, E-Mail) - Input-Felder
  - Nachricht - Textarea (mehrzeilig, editierbar)
  - Preview der finalen Nachricht (optional)
- **Buttons**: Abbrechen (links), Senden (rechts, primary)

### Responsive

- **Mobile** (`< 640px`): Dialog (Modal)
- **Desktop** (`>= 640px`): Sidepane von rechts
- **Large Screen** (`>= 1070px`): Sidepane ohne Backdrop

## ⚠️ Risiken & Herausforderungen

### 1. Rückwärtskompatibilität

- **Lösung**: Default `autoSendReservationInvitation = true`
- Bestehende Reservations funktionieren weiterhin automatisch

### 2. Fehlerbehandlung

- **Vorschlag**: Teilweise erfolgreich = Links speichern, Status bleibt `confirmed`
- **Vorschlag**: Komplett fehlgeschlagen = Nichts speichern, Fehler zurückgeben
- **Log**: Immer Log-Eintrag erstellen (Erfolg + Fehler)

### 3. Performance

- **Payment-Link-Erstellung**: Kann langsam sein (externe API)
- **Lösung**: Beim Öffnen des Sidepanes bereits im Hintergrund starten?
- **Alternative**: Beim Senden starten, Loading-State zeigen

### 4. Duplikate vermeiden

- **Prüfung**: Bereits `sentMessageAt` vorhanden?
- **Lösung**: Button bleibt sichtbar, aber Sidepane zeigt Warnung "Bereits versendet am..."
- **Option**: Erneut senden erlauben (mit Bestätigung)

### 5. Nachricht-Variablen

- **Variablen**: `{{guestName}}`, `{{checkInLink}}`, `{{paymentLink}}`
- **Ersetzung**: Beim Senden durch tatsächliche Werte ersetzen
- **Preview**: Optional im Sidepane zeigen

## ✅ Checkliste

### Backend
- [ ] Service-Methode `sendReservationInvitation()` implementieren
- [ ] Einstellung `autoSendReservationInvitation` hinzufügen
- [ ] Controller `createReservation()` anpassen
- [ ] Neuer Endpunkt `POST /:id/send-invitation`
- [ ] Worker anpassen
- [ ] EmailReservationService anpassen
- [ ] Log-Model erstellen
- [ ] Migration erstellen
- [ ] Log-Methode implementieren
- [ ] Endpunkt für Logs `GET /:id/notification-logs`

### Frontend
- [ ] Types erweitern
- [ ] Service-Methode `sendInvitation()` implementieren
- [ ] API-Endpunkt hinzufügen
- [ ] Einstellung in ApiConfigurationTab hinzufügen
- [ ] Button in Worktracker.tsx hinzufügen (Card + Tabelle)
- [ ] SendInvitationSidepane-Komponente erstellen
- [ ] ReservationNotificationLogs-Komponente erstellen
- [ ] Log-Sektion in ReservationDetails hinzufügen
- [ ] Übersetzungen hinzufügen
- [ ] Responsive Design testen

### Testing
- [ ] Automatischer Versand testen (Einstellung an)
- [ ] Manueller Versand testen (Einstellung aus)
- [ ] Sidepane testen (Kontaktinfo + Nachricht bearbeiten)
- [ ] Fehlerbehandlung testen (teilweise/komplett fehlgeschlagen)
- [ ] Log-Historie testen
- [ ] Mobile/Desktop testen
- [ ] Queue-Integration testen

## 📝 Offene Fragen (beantwortet)

1. ✅ **Button sichtbar bleiben**: Ja, wie Key-Button
2. ✅ **Position**: Links neben Key-Button in Card (unter Beschreibung)
3. ✅ **Queue für manuell**: Nein, synchron
4. ✅ **Fehlerbehandlung**: Vorschlag implementiert (teilweise erfolgreich)
5. ✅ **Log-Historie**: Ja, implementiert
6. ✅ **Sidepane**: Implementiert mit Kontaktinfo + Nachricht bearbeiten
7. ✅ **Einstellung**: Organisation-Settings → API-Tab → LobbyPMS-Sektion

## 📊 Implementierungsfortschritt

### ✅ Abgeschlossen (Backend)

**Phase 1: Service-Methode extrahieren** ✅
- ✅ `sendReservationInvitation()` in `ReservationNotificationService` erstellt
- ✅ Unterstützt optionale Parameter (Kontaktinfo, Nachricht, Betrag)
- ✅ Fehlerbehandlung implementiert (teilweise/komplett fehlgeschlagen)
- ✅ Decimal-zu-Number-Konvertierung für `amount` hinzugefügt

**Phase 2: Einstellung hinzufügen** ✅
- ✅ Schema erweitert (`organizationSettingsSchema.ts`)
- ✅ Types erweitert (`organization.ts`)
- ✅ UI in `ApiConfigurationTab.tsx` hinzugefügt
- ✅ Default: `true` (Rückwärtskompatibilität)

**Phase 3: Controller anpassen** ✅
- ✅ `createReservation()` prüft jetzt Einstellung `autoSendReservationInvitation`
- ✅ Wenn `false`: Nur Reservation speichern, kein automatischer Versand
- ✅ Wenn `true` (Default): Automatischer Versand wie bisher
- ✅ Synchrone Logik verwendet jetzt neue Service-Methode

**Phase 4: Neuer API-Endpunkt** ✅
- ✅ `POST /api/reservations/:id/send-invitation` erstellt
- ✅ Unterstützt optionale Parameter (guestPhone, guestEmail, customMessage, amount, currency)
- ✅ Route in `routes/reservations.ts` hinzugefügt (vor `/:id` platziert)
- ✅ Fehlerbehandlung mit Status 207 für teilweise erfolgreich

**Phase 5: Worker und EmailReservationService umstellen** ✅
- ✅ `reservationWorker.ts` verwendet jetzt `sendReservationInvitation()`
- ✅ `emailReservationService.ts` verwendet jetzt `sendReservationInvitation()`
- ✅ Code-Duplikation entfernt
- ✅ Nicht mehr benötigte Imports entfernt

### 🔄 In Arbeit

**Phase 6: Frontend-Sidepane** ✅
- ✅ `SendInvitationSidepane.tsx` erstellt
- ✅ Kontaktinfo editierbar (Telefonnummer, E-Mail)
- ✅ Nachricht editierbar (mit Variablen)
- ✅ Service-Methode `sendInvitation()` in `reservationService.ts`
- ✅ API-Endpunkt in `api.ts` hinzugefügt
- ✅ Responsive Design (Mobile/Desktop)

**Phase 7: Button in Frontend** ✅
- ✅ Button in Card-Ansicht (links neben Key-Button)
- ✅ Button in Tabelle-Ansicht
- ✅ Responsive Design (Mobile/Desktop)
- ✅ Sidepane-Rendering in `Worktracker.tsx`
- ✅ State-Management für Sidepane

### ⏳ Ausstehend

**Phase 8: Log-Historie - Schema** ✅
- ✅ Prisma Schema erweitert (`ReservationNotificationLog` Model)
- ✅ Migration erstellt (`20251118142722_add_reservation_notification_log`)
- ✅ Indizes hinzugefügt (reservationId, sentAt, notificationType, success)
- ✅ Foreign Key mit CASCADE DELETE

**Phase 9: Log-Methode** ✅
- ✅ `logNotification()` implementiert (private static method)
- ✅ In `sendReservationInvitation()` integriert (Erfolg + Fehler)
- ✅ Logs werden bei erfolgreichem und fehlgeschlagenem Versand erstellt
- ✅ Fehlerbehandlung: Log-Fehler beeinträchtigen nicht die Hauptfunktionalität

**Phase 10: Frontend-Log-Anzeige** ✅
- ✅ `ReservationNotificationLogs.tsx` erstellt
- ✅ In `ReservationDetails.tsx` eingebunden
- ✅ API-Endpunkt `GET /:id/notification-logs` erstellt
- ✅ Service-Methode `getNotificationLogs()` hinzugefügt
- ✅ TypeScript-Interface `ReservationNotificationLog` definiert
- ✅ UI mit Icons, Farben (Erfolg/Fehler), Links und Fehlermeldungen

## 🚀 Nächste Schritte

1. ✅ **Backend abgeschlossen** (Phase 1-5)
2. 🔄 **Frontend starten** (Phase 6-7)
3. ⏳ **Log-Historie** (Phase 8-10)
4. ⏳ **Testing** (jede Phase einzeln testen)
5. ⏳ **Dokumentation finalisieren**

## 🔒 SICHERHEITSPLAN - KEINE DATEN LÖSCHEN!

### ✅ Garantien

**1. KEINE Daten werden gelöscht:**
- ✅ Migration fügt nur neue Tabelle `ReservationNotificationLog` hinzu
- ✅ Keine DROP-Statements in der Migration
- ✅ Keine ALTER TABLE DROP COLUMN
- ✅ Keine DELETE-Statements
- ✅ Bestehende Reservation-Daten bleiben unverändert
- ✅ Bestehende Organization-Settings bleiben unverändert

**2. Bestehende Funktionalität bleibt erhalten:**
- ✅ Default `autoSendReservationInvitation = true` → automatischer Versand funktioniert weiterhin
- ✅ Bestehende Reservations werden nicht beeinflusst
- ✅ Queue-Integration bleibt unverändert
- ✅ EmailReservationService bleibt funktionsfähig

**3. Rückwärtskompatibilität:**
- ✅ Wenn Einstellung nicht gesetzt ist → Default `true` (automatisch)
- ✅ Bestehende Code-Pfade funktionieren weiterhin
- ✅ Keine Breaking Changes in API

### 📋 Sicherheits-Checkliste VOR Implementierung

**Backup erstellen:**
```bash
# Auf dem Server (wenn Produktion)
pg_dump -U postgres -d intranet > backup_before_reservation_automation_$(date +%Y%m%d_%H%M%S).sql
```

**Migration prüfen:**
- ✅ Migration enthält nur `CREATE TABLE` (keine DROP, ALTER DROP, DELETE)
- ✅ Migration ist idempotent (kann mehrfach ausgeführt werden)
- ✅ Keine Datenänderungen an bestehenden Tabellen

**Code-Änderungen prüfen:**
- ✅ Nur neue Methoden hinzufügen (keine bestehenden löschen)
- ✅ Bestehende Methoden erweitern (nicht ersetzen)
- ✅ Default-Werte sicherstellen (Rückwärtskompatibilität)

### 🛡️ Was wird geändert (DETAILIERT)

#### Backend - KEINE Datenänderungen

1. **Service-Methode hinzufügen** (`reservationNotificationService.ts`)
   - ✅ NEUE Methode `sendReservationInvitation()` (nur hinzufügen)
   - ✅ NEUE Methode `logNotification()` (nur hinzufügen)
   - ❌ KEINE bestehenden Methoden löschen
   - ❌ KEINE bestehenden Methoden ändern (außer Refactoring)

2. **Controller erweitern** (`reservationController.ts`)
   - ✅ `createReservation()` erweitern (Einstellung prüfen)
   - ✅ NEUE Funktion `sendReservationInvitation()` (nur hinzufügen)
   - ✅ NEUE Funktion `getReservationNotificationLogs()` (nur hinzufügen)
   - ❌ KEINE bestehenden Funktionen löschen

3. **Worker anpassen** (`reservationWorker.ts`)
   - ✅ Verwendet neue Service-Methode (Refactoring)
   - ✅ Gleiche Logik, nur andere Methode
   - ❌ KEINE Funktionalität entfernt

4. **EmailReservationService anpassen**
   - ✅ Verwendet neue Service-Methode (Refactoring)
   - ✅ Gleiche Logik, nur andere Methode
   - ❌ KEINE Funktionalität entfernt

5. **Schema erweitern** (`schema.prisma`)
   - ✅ NEUE Tabelle `ReservationNotificationLog` (nur hinzufügen)
   - ✅ NEUES Feld in `OrganizationSettings` (optional, Default `true`)
   - ❌ KEINE bestehenden Tabellen ändern
   - ❌ KEINE bestehenden Spalten löschen

6. **Migration**
   - ✅ Nur `CREATE TABLE ReservationNotificationLog`
   - ✅ Nur `CREATE INDEX` Statements
   - ❌ KEINE `DROP TABLE`
   - ❌ KEINE `ALTER TABLE DROP COLUMN`
   - ❌ KEINE `DELETE` Statements

#### Frontend - KEINE Datenänderungen

1. **Types erweitern**
   - ✅ NEUE Types hinzufügen
   - ❌ KEINE bestehenden Types ändern

2. **Service erweitern**
   - ✅ NEUE Methoden hinzufügen
   - ❌ KEINE bestehenden Methoden löschen

3. **UI erweitern**
   - ✅ NEUE Komponenten hinzufügen
   - ✅ Bestehende Komponenten erweitern (Button hinzufügen)
   - ❌ KEINE bestehenden Komponenten löschen

### ⚠️ Potenzielle Risiken (und wie sie vermieden werden)

**1. Migration schlägt fehl:**
- **Risiko**: Niedrig (nur CREATE TABLE)
- **Vermeidung**: Migration vorher testen (lokal)
- **Rollback**: Migration kann rückgängig gemacht werden (DROP TABLE)

**2. Default-Wert falsch gesetzt:**
- **Risiko**: Niedrig (Default `true` = automatisch)
- **Vermeidung**: Explizite Prüfung `!== false` (Default `true`)
- **Test**: Vorher testen, dass automatischer Versand weiterhin funktioniert

**3. Refactoring bricht bestehende Funktionalität:**
- **Risiko**: Mittel
- **Vermeidung**: 
  - Schrittweise Refactoring (erst neue Methode, dann umstellen)
  - Tests nach jedem Schritt
  - Alte Logik als Fallback behalten

**4. Log-Tabelle wird zu groß:**
- **Risiko**: Niedrig (nur Logs, keine kritischen Daten)
- **Vermeidung**: Indizes auf `reservationId` und `sentAt`
- **Optional**: Später Cleanup-Job für alte Logs

### 🔄 Rollback-Plan (falls etwas schiefgeht)

**1. Migration rückgängig machen:**
```sql
-- NUR wenn nötig (normalerweise nicht erforderlich)
DROP TABLE IF EXISTS "ReservationNotificationLog";
```

**2. Code-Änderungen rückgängig:**
```bash
# Git Reset (wenn noch nicht committed)
git reset --hard HEAD

# Oder Git Revert (wenn bereits committed)
git revert <commit-hash>
```

**3. Einstellung zurücksetzen:**
- Einstellung `autoSendReservationInvitation` auf `true` setzen (oder löschen)
- System funktioniert dann wieder wie vorher

### ✅ Verifikation nach Implementierung

**1. Datenbank prüfen:**
```sql
-- Prüfen ob neue Tabelle existiert
SELECT * FROM information_schema.tables 
WHERE table_name = 'ReservationNotificationLog';

-- Prüfen ob bestehende Daten noch da sind
SELECT COUNT(*) FROM "Reservation";
SELECT COUNT(*) FROM "Organization";
```

**2. Funktionalität testen:**
- ✅ Automatischer Versand funktioniert (Einstellung `true`)
- ✅ Manueller Versand funktioniert (Button)
- ✅ Bestehende Reservations funktionieren weiterhin
- ✅ Queue-Integration funktioniert weiterhin

**3. Logs prüfen:**
- ✅ Log-Einträge werden erstellt
- ✅ Logs sind mit Reservations verknüpft

### 📝 Zusammenfassung

**✅ GARANTIERT:**
- Keine Daten werden gelöscht
- Keine bestehenden Tabellen werden geändert
- Keine bestehenden Spalten werden gelöscht
- Bestehende Funktionalität bleibt erhalten
- Rückwärtskompatibilität ist gewährleistet

**✅ NUR HINZUGEFÜGT:**
- Neue Tabelle `ReservationNotificationLog` (nur Logs)
- Neue Service-Methode `sendReservationInvitation()`
- Neue API-Endpunkte (nur hinzufügen)
- Neue UI-Komponenten (nur hinzufügen)
- Optionales Feld in Settings (Default `true`)

**❌ NICHT GELÖSCHT:**
- Keine Tabellen
- Keine Spalten
- Keine Daten
- Keine Funktionalität

## 🚀 Deployment auf Produktivserver

### Voraussetzungen

- ✅ Code ist committed und getestet
- ✅ Migration wurde lokal getestet
- ✅ Backup der Datenbank wurde erstellt

### Schritt-für-Schritt Anleitung

#### 1. Backup erstellen

```bash
# Auf dem Produktivserver
pg_dump -U postgres -d intranet > backup_before_reservation_automation_$(date +%Y%m%d_%H%M%S).sql
```

#### 2. Code deployen

```bash
# Git Pull (oder Deployment-Prozess)
git pull origin main  # oder entsprechender Branch

# Dependencies installieren (falls nötig)
npm install
```

#### 3. Migration ausführen

```bash
# Im Backend-Verzeichnis
cd backend

# Migration ausführen
npx prisma migrate deploy

# ODER falls migrate deploy nicht verfügbar:
npx prisma migrate resolve --applied 20251118142722_add_reservation_notification_log
npx prisma migrate deploy
```

**Wichtig**: Die Migration `20251118142722_add_reservation_notification_log` muss ausgeführt werden.

#### 4. Prisma Client neu generieren

```bash
# Im Backend-Verzeichnis
npx prisma generate
```

**Wichtig**: Ohne diesen Schritt wird der TypeScript-Fehler `Property 'reservationNotificationLog' does not exist` auftreten.

#### 5. Server neu starten

```bash
# Backend-Server neu starten
# (Je nach Setup: pm2 restart, systemctl restart, etc.)
pm2 restart backend
# ODER
systemctl restart intranet-backend
# ODER
npm run start
```

#### 6. Frontend bauen (falls nötig)

```bash
# Im Frontend-Verzeichnis
cd frontend
npm run build
```

#### 7. Verifikation

**Backend prüfen:**
```bash
# Prüfen ob Migration erfolgreich war
psql -U postgres -d intranet -c "\d ReservationNotificationLog"
```

**Frontend prüfen:**
- Button "Einladung senden" sollte sichtbar sein
- Sidepane sollte sich öffnen
- Log-Historie sollte in ReservationDetails angezeigt werden

**Funktionalität testen:**
1. Neue Reservation erstellen (sollte NICHT automatisch senden, wenn Einstellung auf `false`)
2. Button "Einladung senden" klicken
3. Sidepane öffnet sich
4. Nachricht bearbeiten und senden
5. Log-Eintrag sollte in ReservationDetails erscheinen

### ⚠️ Wichtige Hinweise

1. **Migration ist sicher**: Die Migration fügt nur eine neue Tabelle hinzu, keine Daten werden gelöscht oder geändert.

2. **Prisma Client MUSS neu generiert werden**: Nach der Migration muss `npx prisma generate` ausgeführt werden, sonst funktioniert der Code nicht.

3. **Default-Verhalten**: Wenn die Einstellung `autoSendReservationInvitation` nicht gesetzt ist, ist der Default `true` (automatischer Versand wie bisher).

4. **Rückwärtskompatibilität**: Bestehende Reservations funktionieren weiterhin wie vorher.

### 🔍 Troubleshooting

**Fehler: `Property 'reservationNotificationLog' does not exist`**
- Lösung: `npx prisma generate` im Backend-Verzeichnis ausführen

**Fehler: `Table "ReservationNotificationLog" does not exist`**
- Lösung: Migration ausführen mit `npx prisma migrate deploy`

**Fehler: Migration bereits angewendet**
- Lösung: `npx prisma migrate resolve --applied 20251118142722_add_reservation_notification_log` ausführen

**Button erscheint nicht im Frontend**
- Lösung: Frontend neu bauen und Browser-Cache leeren

### 📋 Checkliste für Produktivserver-Deployment

- [ ] Backup der Datenbank erstellt
- [ ] Code deployed (git pull / deployment)
- [ ] Dependencies installiert (`npm install`)
- [ ] Migration ausgeführt (`npx prisma migrate deploy`)
- [ ] Prisma Client neu generiert (`npx prisma generate`)
- [ ] Backend-Server neu gestartet
- [ ] Frontend neu gebaut (falls nötig)
- [ ] Migration verifiziert (Tabelle existiert)
- [ ] Funktionalität getestet (Button, Sidepane, Logs)

### 🔑 Kritische Schritte (NICHT vergessen!)

1. **`npx prisma generate`** - MUSS nach Migration ausgeführt werden!
2. **Migration ausführen** - `npx prisma migrate deploy`
3. **Server neu starten** - Backend muss neu gestartet werden

Ohne diese 3 Schritte funktioniert das Feature nicht!


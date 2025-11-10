# Mock-Daten für LobbyPMS Integration

## Übersicht

Da die LobbyPMS API-Dokumentation noch aussteht, wurden Mock-Daten und Services erstellt, um die Entwicklung und das Testen der Integration zu ermöglichen.

## Mock-Services

### MockLobbyPmsService

**Datei**: `backend/src/services/mockLobbyPmsService.ts`

**Funktionen**:
- `fetchReservations()` - Gibt Mock-Reservierungen zurück
- `fetchTomorrowReservations()` - Gibt Mock-Reservierungen für morgen zurück
- `fetchReservationById()` - Gibt Mock-Reservierung nach ID zurück
- `validateConnection()` - Simuliert erfolgreiche Verbindung
- `syncReservation()` - Simuliert Synchronisation

**Verwendung**:
```typescript
import { MockLobbyPmsService } from './services/mockLobbyPmsService';

const mockService = new MockLobbyPmsService(organizationId);
const reservations = await mockService.fetchTomorrowReservations('22:00');
```

## Mock-Daten in Datenbank

### Script zum Erstellen

**Datei**: `backend/scripts/create-mock-reservations.ts`

**Ausführung**:
```bash
cd backend
npx ts-node scripts/create-mock-reservations.ts [organizationId]
```

**Erstellt 3 Test-Reservierungen**:
1. **Juan Pérez** - Check-in morgen 23:00, Status: confirmed, Payment: pending
2. **Maria García** - Check-in morgen 22:30, Status: confirmed, Payment: pending
3. **Carlos Rodríguez** - Check-in heute 14:00, Status: checked_in, Payment: paid

## Mock-Daten Struktur

### Reservierungen

- **LobbyPMS IDs**: `MOCK-RES-001`, `MOCK-RES-002`, `MOCK-RES-003`
- **Gäste**: Vollständige Daten (Name, E-Mail, Telefon, Nationalität, Passnummer, Geburtsdatum)
- **Zimmer**: Verschiedene Zimmernummern und Beschreibungen
- **Status**: Verschiedene Status (confirmed, checked_in)
- **Zahlungen**: Verschiedene Zahlungsstatus (pending, paid)

## Verwendung für Tests

### Frontend-Tests

Die Frontend-Komponenten können mit Mock-Daten getestet werden:

1. **Mock-Daten in DB erstellen**:
   ```bash
   npx ts-node scripts/create-mock-reservations.ts 1
   ```

2. **Frontend öffnen**: `/reservations`
3. **Reservierungen sollten angezeigt werden**

### Backend-Tests

Für Backend-Tests kann `MockLobbyPmsService` verwendet werden:

```typescript
// In Tests
import { MockLobbyPmsService } from '../services/mockLobbyPmsService';

const mockService = new MockLobbyPmsService(1);
const reservations = await mockService.fetchTomorrowReservations('22:00');
```

## Wechsel zur echten API

Sobald die LobbyPMS API-Dokumentation verfügbar ist:

1. **LobbyPmsService aktualisieren** mit korrekten Endpoints
2. **MockLobbyPmsService entfernen** oder als Fallback behalten
3. **Mock-Daten aus DB löschen** (optional):
   ```sql
   DELETE FROM "Reservation" WHERE "lobbyReservationId" LIKE 'MOCK-%';
   ```

## Vorteile

- ✅ Entwicklung kann parallel zur API-Dokumentation weitergehen
- ✅ Frontend kann vollständig getestet werden
- ✅ Services können isoliert getestet werden
- ✅ Keine Abhängigkeit von externen APIs während Entwicklung


# LobbyPMS Integration - Fehlende Komponenten

## Übersicht

Die Services (TTLock, Bold Payment, WhatsApp, SIRE) sind **vollständig implementiert**, aber es fehlen einige **API-Endpoints** und **Webhook-Routen** für direkten Zugriff und Tests.

## ✅ Was vorhanden ist

### Services (100% implementiert)
- ✅ **TTLockService** - Vollständig implementiert
- ✅ **BoldPaymentService** - Vollständig implementiert (inkl. handleWebhook Methode)
- ✅ **WhatsAppService** - Vollständig implementiert
- ✅ **SireService** - Vollständig implementiert

### Verwendung
- ✅ Alle Services werden **intern verwendet** über:
  - `ReservationNotificationService` (E-Mail/WhatsApp-Versand)
  - `checkInReservation` Controller (TTLock PIN, SIRE-Registrierung)
  - Automatische Prozesse

## ❌ Was fehlt

### 1. Bold Payment Webhook Route ⚠️ WICHTIG

**Problem**: `BoldPaymentService.handleWebhook()` existiert, aber es gibt keine Route dafür.

**Benötigt**:
```typescript
// backend/src/routes/boldPayment.ts (NEU)
POST /api/bold-payment/webhook
```

**Auswirkung**: 
- Payment-Status-Updates werden nicht automatisch verarbeitet
- Manuelle Status-Abfrage erforderlich

### 2. TTLock API-Endpoints (Optional)

**Fehlt**: Direkte Endpoints für TTLock-Operationen

**Könnte nützlich sein**:
- `GET /api/ttlock/locks` - Liste aller Locks
- `POST /api/ttlock/passcodes` - Passcode erstellen
- `DELETE /api/ttlock/passcodes/:id` - Passcode löschen
- `GET /api/ttlock/locks/:id/info` - Lock-Informationen

**Auswirkung**: 
- Keine direkte Verwaltung über API möglich
- Funktioniert aber über Check-in-Prozess

### 3. WhatsApp Test-Endpoints (Optional)

**Fehlt**: Endpoints zum Testen von WhatsApp-Nachrichten

**Könnte nützlich sein**:
- `POST /api/whatsapp/test` - Test-Nachricht senden
- `POST /api/whatsapp/send` - Nachricht senden

**Auswirkung**: 
- Keine direkten Tests möglich
- Funktioniert aber über ReservationNotificationService

### 4. SIRE Endpoints (Teilweise vorhanden)

**Vorhanden**:
- ✅ `POST /api/lobby-pms/reservations/:id/register-sire`
- ✅ `GET /api/lobby-pms/reservations/:id/sire-status`

**Fehlt** (Optional):
- `POST /api/sire/registrations/:id/update` - Registrierung aktualisieren
- `DELETE /api/sire/registrations/:id` - Registrierung löschen

**Auswirkung**: 
- Basis-Funktionalität vorhanden
- Erweiterte Verwaltung fehlt

## 🔧 Empfohlene Implementierungen

### Priorität 1: Bold Payment Webhook (WICHTIG)

**Warum wichtig**: 
- Automatische Payment-Status-Updates
- Keine manuelle Abfrage nötig

**Implementierung**:
1. Route erstellen: `backend/src/routes/boldPayment.ts`
2. Controller-Funktion: `handleBoldPaymentWebhook`
3. In `app.ts` registrieren

### Priorität 2: TTLock Endpoints (Optional)

**Warum nützlich**:
- Direkte Verwaltung von Locks
- Tests ohne Check-in-Prozess
- Frontend-Integration möglich

### Priorität 3: Test-Endpoints (Optional)

**Warum nützlich**:
- Einfacheres Testen der Services
- Debugging erleichtert
- Frontend-Tests möglich

## 📋 Implementierungsplan

### Schritt 1: Bold Payment Webhook Route

**Datei**: `backend/src/routes/boldPayment.ts` (NEU)
**Datei**: `backend/src/controllers/boldPaymentController.ts` (NEU)

### Schritt 2: TTLock Routes (Optional)

**Datei**: `backend/src/routes/ttlock.ts` (NEU)
**Datei**: `backend/src/controllers/ttlockController.ts` (NEU)

### Schritt 3: Test-Endpoints (Optional)

**Datei**: `backend/src/routes/integrationTests.ts` (NEU)

## ⚠️ Wichtige Hinweise

### Services funktionieren bereits
- Alle Services werden **intern korrekt verwendet**
- Automatisierungen funktionieren
- **Nur direkte API-Zugriffe fehlen**

### Webhook ist kritisch
- **Bold Payment Webhook sollte implementiert werden**
- Andere sind optional

### Sicherheit
- Webhook-Routen benötigen **Webhook-Secret-Validierung**
- Test-Endpoints sollten **nur in Development** verfügbar sein


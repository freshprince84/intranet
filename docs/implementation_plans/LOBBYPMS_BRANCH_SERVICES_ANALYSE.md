# LobbyPMS Branch-Services Analyse - Kritische Abhängigkeiten

## Problemstellung

Wenn Reservierungen pro Branch sind, müssen **ALLE** abhängigen Services auch pro Branch funktionieren:
- ✅ LobbyPMS API (Token pro Branch) - bereits geplant
- ❌ Bold Payment (Zahlungslink) - aktuell pro Organisation
- ❌ TTLock (Türsystem) - aktuell pro Organisation
- ❌ WhatsApp (Nachrichten) - **hat bereits Branch-Support, wird aber nicht verwendet!**
- ❌ SIRE (Gästeregistrierung) - aktuell pro Organisation

## Aktueller Stand - Detaillierte Analyse

### ✅ WhatsAppService - Bereits Branch-fähig!

**Status:** ✅ **Bereits implementiert!**

**Code:** `backend/src/services/whatsappService.ts`
- Constructor akzeptiert `branchId?: number`
- Lädt Settings aus `Branch.whatsappSettings` (mit Fallback auf Organisation)
- **⚠️ PROBLEM**: Wird überall mit `organizationId` aufgerufen, nicht mit `branchId`!

**Verwendungsstellen (alle falsch):**
```typescript
// ❌ FALSCH: reservationNotificationService.ts (3x)
const whatsappService = new WhatsAppService(reservation.organizationId);

// ❌ FALSCH: reservationController.ts (1x)
const whatsappService = new WhatsAppService(reservation.organizationId);

// ❌ FALSCH: boldPaymentService.ts (1x)
const whatsappService = new WhatsAppService(updatedReservation.organizationId);

// ❌ FALSCH: updateGuestContactWorker.ts (1x)
const whatsappService = new WhatsAppService(organizationId);
```

**Lösung:** Alle Aufrufe ändern zu:
```typescript
// ✅ RICHTIG:
const whatsappService = new WhatsAppService(undefined, reservation.branchId);
```

### ❌ BoldPaymentService - Nur Organisation

**Status:** ❌ **Kein Branch-Support**

**Code:** `backend/src/services/boldPaymentService.ts`
- Constructor: `constructor(organizationId: number)`
- Lädt Settings aus `Organization.settings.boldPayment`
- **Kein Branch-Support!**

**Verwendungsstellen (8x):**
- `reservationNotificationService.ts`: 2x
- `reservationController.ts`: 1x
- `boldPaymentService.ts`: 1x (im Webhook)
- `updateGuestContactWorker.ts`: 1x
- `boldPaymentController.ts`: 2x
- `test-bold-payment-link.ts`: 1x

**Was fehlt:**
1. `Branch.boldPaymentSettings` (Json) Feld
2. Branch-Support im Constructor
3. Settings-Loading aus Branch (mit Fallback)

### ❌ TTLockService - Nur Organisation

**Status:** ❌ **Kein Branch-Support**

**Code:** `backend/src/services/ttlockService.ts`
- Constructor: `constructor(organizationId: number)`
- Lädt Settings aus `Organization.settings.doorSystem`
- **Kein Branch-Support!**

**Verwendungsstellen (8x):**
- `reservationNotificationService.ts`: 2x
- `reservationController.ts`: 1x
- `boldPaymentService.ts`: 1x (im Webhook)
- `updateGuestContactWorker.ts`: 1x
- `ttlockController.ts`: 3x

**Was fehlt:**
1. `Branch.doorSystemSettings` (Json) Feld
2. Branch-Support im Constructor
3. Settings-Loading aus Branch (mit Fallback)

### ❌ SireService - Nur Organisation

**Status:** ❌ **Kein Branch-Support**

**Code:** `backend/src/services/sireService.ts`
- Constructor: `constructor(organizationId: number)`
- Lädt Settings aus `Organization.settings.sire`
- **Kein Branch-Support!**

**Verwendungsstellen (3x):**
- `lobbyPmsController.ts`: 3x (checkInReservation, registerSire, getSireStatus)

**Was fehlt:**
1. `Branch.sireSettings` (Json) Feld
2. Branch-Support im Constructor
3. Settings-Loading aus Branch (mit Fallback)

## Datenbank-Schema - Erweiterungen nötig

### Aktueller Stand

```prisma
model Branch {
  id                    Int
  name                  String
  organizationId        Int?
  whatsappSettings      Json? // ✅ Bereits vorhanden
  // ❌ FEHLT: lobbyPmsSettings
  // ❌ FEHLT: boldPaymentSettings
  // ❌ FEHLT: doorSystemSettings
  // ❌ FEHLT: sireSettings
}
```

### Erweiterung nötig

```prisma
model Branch {
  id                    Int
  name                  String
  organizationId        Int?
  whatsappSettings      Json? // ✅ Bereits vorhanden
  lobbyPmsSettings      Json? // NEU: LobbyPMS-Konfiguration pro Branch
  boldPaymentSettings   Json? // NEU: Bold Payment-Konfiguration pro Branch
  doorSystemSettings    Json? // NEU: TTLock/Türsystem-Konfiguration pro Branch
  sireSettings          Json? // NEU: SIRE-Konfiguration pro Branch
}
```

## Kritische Probleme identifiziert

### Problem 1: WhatsApp wird nicht Branch-basiert verwendet

**Symptom:**
- WhatsAppService hat Branch-Support
- Wird aber überall mit `organizationId` aufgerufen
- Branch-Settings werden ignoriert!

**Risiko:** ⚠️ **HOCH**
- Falsche WhatsApp-Nummern werden verwendet
- Nachrichten gehen an falsche Accounts
- Branch-spezifische Konfiguration wird ignoriert

**Lösung:**
- Alle Aufrufe ändern: `new WhatsAppService(undefined, reservation.branchId)`
- Prüfen ob `reservation.branchId` vorhanden ist
- Fallback auf `organizationId` wenn `branchId` fehlt (Rückwärtskompatibilität)

### Problem 2: Bold Payment - Falsche Merchant IDs

**Symptom:**
- Bold Payment verwendet `organizationId`
- Reservierungen sind pro Branch
- Zahlungslinks werden mit falscher Merchant ID erstellt

**Risiko:** ⚠️ **KRITISCH**
- Zahlungen gehen an falsche Merchant Accounts
- Finanzielle Verluste möglich!
- Keine Zuordnung zu Branch

**Lösung:**
- BoldPaymentService Branch-Support hinzufügen
- `Branch.boldPaymentSettings` Feld hinzufügen
- Alle Aufrufe ändern: `new BoldPaymentService(reservation.branchId)` (mit branchId-Parameter)

### Problem 3: TTLock - Falsche Locks

**Symptom:**
- TTLock verwendet `organizationId`
- Reservierungen sind pro Branch
- Passcodes werden für falsche Locks erstellt

**Risiko:** ⚠️ **HOCH**
- Gäste erhalten Passcodes für falsche Türen
- Sicherheitsproblem!
- Check-in funktioniert nicht

**Lösung:**
- TTLockService Branch-Support hinzufügen
- `Branch.doorSystemSettings` Feld hinzufügen
- Jeder Branch hat eigene `lockIds`

### Problem 4: SIRE - Falsche Property Codes

**Symptom:**
- SIRE verwendet `organizationId`
- Reservierungen sind pro Branch
- Gäste werden mit falschem Property Code registriert

**Risiko:** ⚠️ **MITTEL**
- Falsche Registrierung bei SIRE
- Compliance-Probleme
- Mögliche Bußgelder

**Lösung:**
- SireService Branch-Support hinzufügen
- `Branch.sireSettings` Feld hinzufügen
- Jeder Branch hat eigenen `propertyCode`

## Widersprüche und Konflikte

### Widerspruch 1: WhatsApp hat Branch-Support, wird aber nicht genutzt

**Konflikt:**
- Code unterstützt Branches
- Verwendung ignoriert Branch-Support
- Branch-Settings existieren, werden aber nicht geladen

**Ursache:** 
- Branch-Support wurde nachträglich hinzugefügt
- Bestehende Aufrufe wurden nicht aktualisiert

### Widerspruch 2: Reservation.branchId fehlt

**Konflikt:**
- Services sollen pro Branch funktionieren
- Reservierungen haben kein `branchId` Feld
- Services können nicht wissen, zu welchem Branch eine Reservation gehört

**Ursache:**
- Reservation-Schema wurde nicht erweitert
- Migration fehlt

### Widerspruch 3: Branch-Settings fehlen

**Konflikt:**
- Services sollen aus Branch-Settings laden
- Branch hat nur `whatsappSettings`
- BoldPayment, TTLock, SIRE Settings fehlen

**Ursache:**
- Schema-Erweiterung fehlt
- Migration fehlt

## Risiken

### Risiko 1: Finanzielle Verluste (KRITISCH)

**Szenario:**
- Branch "Manila" hat eigene Bold Payment Merchant ID
- Reservation wird mit `organizationId` erstellt
- Zahlungslink verwendet falsche Merchant ID
- Zahlung geht an falsches Konto

**Wahrscheinlichkeit:** ⚠️ **HOCH** (wenn mehrere Branches verschiedene Merchant IDs haben)

**Impact:** 💰 **KRITISCH** (Geldverlust)

### Risiko 2: Sicherheitsproblem (HOCH)

**Szenario:**
- Branch "Manila" hat eigene TTLock Locks
- Reservation wird mit `organizationId` erstellt
- Passcode wird für falschen Lock erstellt
- Gast kann nicht einchecken oder hat Zugang zu falscher Tür

**Wahrscheinlichkeit:** ⚠️ **HOCH**

**Impact:** 🔒 **HOCH** (Sicherheit, Gastzufriedenheit)

### Risiko 3: Compliance-Verstöße (MITTEL)

**Szenario:**
- Branch "Manila" hat eigenen SIRE Property Code
- Reservation wird mit `organizationId` erstellt
- Gast wird mit falschem Property Code registriert
- SIRE-Meldepflicht nicht erfüllt

**Wahrscheinlichkeit:** ⚠️ **MITTEL**

**Impact:** ⚖️ **MITTEL** (Bußgelder möglich)

### Risiko 4: Dateninkonsistenz (MITTEL)

**Szenario:**
- Reservierungen werden pro Branch importiert
- Services verwenden weiterhin `organizationId`
- Branch-Zuordnung geht verloren
- Reporting und Analytics falsch

**Wahrscheinlichkeit:** ⚠️ **HOCH**

**Impact:** 📊 **MITTEL** (Datenqualität)

## Lösungsansatz

### Phase 1: Datenbank-Schema erweitern

1. `Reservation.branchId` hinzufügen (optional)
2. `Branch.lobbyPmsSettings` hinzufügen
3. `Branch.boldPaymentSettings` hinzufügen
4. `Branch.doorSystemSettings` hinzufügen
5. `Branch.sireSettings` hinzufügen

### Phase 2: Services erweitern

1. **BoldPaymentService**: Branch-Support hinzufügen
2. **TTLockService**: Branch-Support hinzufügen
3. **SireService**: Branch-Support hinzufügen
4. **WhatsAppService**: ✅ Bereits vorhanden, nur Aufrufe korrigieren

### Phase 3: Alle Aufrufe aktualisieren

**Pattern:**
```typescript
// ALT:
const service = new Service(reservation.organizationId);

// NEU:
const service = reservation.branchId 
  ? new Service(undefined, reservation.branchId) // Branch-Support
  : new Service(reservation.organizationId); // Fallback für alte Reservierungen
```

**Dateien zu ändern:**
- `reservationNotificationService.ts` (8x)
- `reservationController.ts` (3x)
- `boldPaymentService.ts` (2x)
- `updateGuestContactWorker.ts` (3x)
- `lobbyPmsController.ts` (3x)
- `ttlockController.ts` (3x)
- `boldPaymentController.ts` (2x)

### Phase 4: Frontend erweitern

1. Branch-Settings UI für alle Services
2. LobbyPMS Settings pro Branch
3. Bold Payment Settings pro Branch
4. TTLock Settings pro Branch
5. SIRE Settings pro Branch

## Checkliste - Was noch fehlt?

### ✅ Bereits identifiziert
- [x] Reservation.branchId Feld
- [x] Branch.lobbyPmsSettings Feld
- [x] Branch.boldPaymentSettings Feld
- [x] Branch.doorSystemSettings Feld
- [x] Branch.sireSettings Feld
- [x] BoldPaymentService Branch-Support
- [x] TTLockService Branch-Support
- [x] SireService Branch-Support
- [x] WhatsAppService Aufrufe korrigieren

### ⚠️ Weitere mögliche Probleme

1. **Task-Erstellung**: ✅ Tasks haben bereits branchId, aber...
   - `TaskAutomationService.createReservationTask()` findet Branch über `organizationId`
   - **Problem**: Wenn Reservation `branchId` hat, sollte direkt verwendet werden!
   - **Lösung**: `createReservationTask()` prüfen: `reservation.branchId ?? findBranchFromOrganization()`

2. **Email-Versand**: Gibt es Branch-spezifische Email-Settings?
   - SMTP-Settings sind aktuell pro Organisation
   - Falls pro Branch nötig: `Branch.emailSettings` hinzufügen
   - **Status**: Noch nicht geklärt, ob nötig

3. **Webhooks**: Bold Payment Webhooks - wie werden sie zugeordnet?
   - Webhook-Handler verwendet `organizationId`
   - Muss auf `branchId` umgestellt werden
   - **Siehe**: Phase 8.3 im Hauptplan

4. **Frontend-Filter**: Reservierungs-Statistiken pro Branch?
   - **Problem**: Frontend-Filter haben KEINEN Branch-Filter!
   - `ReservationList.tsx`: Kein Branch-Filter
   - `Worktracker.tsx`: Kein Branch-Filter für Reservierungen
   - **Lösung**: Branch-Filter hinzufügen (Dropdown mit Branches)

5. **Backend-APIs**: Reservierungs-APIs müssen Branch-Filter unterstützen
   - `GET /api/reservations` - Branch-Filter hinzufügen
   - `GET /api/reservations?branchId=1` - Query-Parameter
   - Middleware/Controller prüfen

6. **Berechtigungen**: Wer kann Reservierungen pro Branch sehen/bearbeiten?
   - Middleware prüft `organizationId`
   - Muss auch `branchId` prüfen (falls Branch-spezifische Berechtigungen nötig)
   - **Status**: Noch nicht geklärt, ob Branch-spezifische Berechtigungen nötig

7. **Migration**: Bestehende Reservierungen ohne branchId?
   - Wie werden sie behandelt?
   - Fallback-Logik nötig (siehe Phase 8.1 im Hauptplan)

8. **Tests**: Alle Services müssen mit Branch-Settings getestet werden
   - Unit-Tests erweitern
   - Integration-Tests pro Branch
   - E2E-Tests für Branch-Sync

9. **Verschlüsselung**: Branch-Settings müssen verschlüsselt werden
   - `encryptApiSettings()` erweitern für Branch-Settings
   - `decryptApiSettings()` erweitern für Branch-Settings
   - **Status**: Verschlüsselung existiert bereits für Organisation-Settings, muss für Branch erweitert werden

10. **Validierung**: Branch-Settings Schema-Validierung
    - Zod-Schema für Branch-Settings erstellen
    - Validierung in Controller/Service
    - Frontend-Validierung

11. **Frontend-Types**: TypeScript-Types für Branch-Settings
    - `Branch` Interface erweitern
    - `BranchSettings` Interface erstellen
    - Alle Settings-Typen definieren

12. **API-Response**: Reservation-API muss branchId zurückgeben
    - Frontend erwartet `branchId` in Reservation-Objekt
    - Backend muss `branchId` in Response inkludieren
    - Prisma `include` erweitern

13. **Reservation-Details**: Reservation-Detail-Ansicht muss Branch anzeigen
    - Branch-Name in Details anzeigen
    - Branch-Settings-Link (falls Admin)
    - Branch-Filter in Liste

14. **Scheduler-Logging**: Branch-spezifisches Logging
    - Welcher Branch wurde synchronisiert?
    - Wie viele Reservierungen pro Branch?
    - Fehler pro Branch loggen

15. **Monitoring**: Branch-spezifisches Monitoring
    - Sync-Status pro Branch
    - Fehlerrate pro Branch
    - Letzter Sync-Zeitpunkt pro Branch

## Zusammenfassung

### Kritische Änderungen nötig

1. **Datenbank**: 5 neue Felder (branchId + 4 Settings-Felder)
2. **Services**: 3 Services erweitern (BoldPayment, TTLock, SIRE)
3. **Aufrufe**: ~22 Stellen ändern (von organizationId auf branchId)
4. **Frontend**: 4 neue Settings-Tabs pro Branch

### Risiken ohne Änderungen

- 💰 **KRITISCH**: Falsche Zahlungslinks (Geldverlust)
- 🔒 **HOCH**: Falsche TTLock Passcodes (Sicherheit)
- ⚖️ **MITTEL**: Falsche SIRE-Registrierungen (Compliance)
- 📊 **MITTEL**: Dateninkonsistenz (Reporting)

### Empfehlung

**⚠️ WICHTIG**: Diese Änderungen sind **KRITISCH** und müssen **VOR** dem Go-Live implementiert werden!

Ohne diese Änderungen:
- Reservierungen werden pro Branch importiert
- Aber alle Services verwenden weiterhin Organisation-Settings
- Führt zu falschen Zahlungslinks, Passcodes, Registrierungen


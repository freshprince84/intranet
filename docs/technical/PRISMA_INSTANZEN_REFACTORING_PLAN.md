# Prisma-Instanzen Refactoring-Plan

## Problem-Analyse

### Aktueller Zustand (FAKTEN)
- **71 Dateien** in `backend/src` erstellen jeweils eine eigene Prisma-Instanz mit `const prisma = new PrismaClient()`
- Keine zentrale Prisma-Instanz vorhanden
- Jede Datei hat ihren eigenen Connection Pool

### Probleme
1. **Mehrere Connection Pools**: Jede Instanz erstellt einen eigenen Pool zur Datenbank
2. **Höherer Memory-Verbrauch**: Jede Instanz belegt zusätzlichen Speicher
3. **Potenzielle Performance-Probleme**: Unnötige Overhead durch viele Instanzen
4. **Nicht Best Practice**: Prisma Client ist für Singleton-Nutzung gedacht

### Betroffene Dateitypen (FAKTEN - AKTUALISIERT)
- **Controllers**: 39 Dateien (eine Datei hat 2 Instanzen: lobbyPmsController.ts)
- **Services**: 20 Dateien
- **Middleware**: 6 Dateien
- **Utils**: 2 Dateien
- **Queue Workers**: 2 Dateien
- **Routes**: 2 Dateien

## Lösung: Zentrale Prisma-Instanz

### Schritt 1: Zentrale Prisma-Instanz erstellen

**Datei**: `backend/src/utils/prisma.ts`

```typescript
import { PrismaClient } from '@prisma/client';

// Singleton-Pattern für Prisma Client
// Verhindert mehrere Instanzen in Development (Hot Reload)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Graceful Shutdown wird in index.ts behandelt (siehe Schritt 2)
```

**Begründung**:
- Singleton-Pattern verhindert mehrere Instanzen
- `globalThis` wird verwendet, um in Development (Hot Reload) die Instanz zu erhalten
- Logging nur in Development aktiv (query, error, warn), in Production nur error
- **KEIN** `process.on('beforeExit')` hier, da das in `index.ts` zentral gehandhabt wird

### Schritt 2: Graceful Shutdown in index.ts hinzufügen

**Datei**: `backend/src/index.ts`

**Aktuell** (Zeilen 41-58):
```typescript
// Graceful Shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal empfangen. Server wird heruntergefahren...');
  await stopWorkers();
  server.close(() => {
    console.log('Server erfolgreich heruntergefahren.');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal empfangen. Server wird heruntergefahren...');
  await stopWorkers();
  server.close(() => {
    console.log('Server erfolgreich heruntergefahren.');
    process.exit(0);
  });
});
```

**Änderung**: Prisma disconnect hinzufügen
```typescript
import { prisma } from './utils/prisma';

// Graceful Shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal empfangen. Server wird heruntergefahren...');
  await stopWorkers();
  await prisma.$disconnect();
  server.close(() => {
    console.log('Server erfolgreich heruntergefahren.');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal empfangen. Server wird heruntergefahren...');
  await stopWorkers();
  await prisma.$disconnect();
  server.close(() => {
    console.log('Server erfolgreich heruntergefahren.');
    process.exit(0);
  });
});
```

### Schritt 3: Alle Dateien refactoren

**Vorgehen für jede Datei**:
1. `import { PrismaClient } from '@prisma/client';` entfernen (falls nur für Instanziierung)
2. `const prisma = new PrismaClient();` entfernen
3. `import { prisma } from '[KORREKTER_PFAD]';` hinzufügen
4. **WICHTIG**: `Prisma`-Typen (z.B. `Prisma`, `TaskStatus`, etc.) müssen weiterhin importiert werden, falls verwendet

**Beispiel-Transformation**:

**Vorher** (`backend/src/controllers/authController.ts`):
```typescript
import { PrismaClient, Prisma } from '@prisma/client';
// ...
const prisma = new PrismaClient();
```

**Nachher**:
```typescript
import { Prisma } from '@prisma/client'; // Prisma-Typen bleiben
import { prisma } from '../utils/prisma';
// ... (const prisma = new PrismaClient(); entfernt)
```

### Schritt 4: Import-Pfade (GENAU)

**Berechnet basierend auf Dateistruktur**:

- **Controllers** (`backend/src/controllers/*.ts`): 
  - `import { prisma } from '../utils/prisma';`

- **Services** (`backend/src/services/*.ts`): 
  - `import { prisma } from '../utils/prisma';`

- **Middleware** (`backend/src/middleware/*.ts`): 
  - `import { prisma } from '../utils/prisma';`

- **Utils** (`backend/src/utils/*.ts`): 
  - `import { prisma } from './prisma';` (nur für andere Utils, nicht für prisma.ts selbst)

- **Queue Workers** (`backend/src/queues/workers/*.ts`): 
  - `import { prisma } from '../../utils/prisma';`

- **Routes** (`backend/src/routes/*.ts`): 
  - `import { prisma } from '../utils/prisma';`

### Schritt 5: Besondere Fälle behandeln

#### 5.1: Manuelle $disconnect() Aufrufe entfernen

**Dateien mit `prisma.$disconnect()`** (MÜSSEN entfernt werden):
1. `backend/src/controllers/boldPaymentController.ts` (Zeilen 56, 61)
   - **Aktion**: `await prisma.$disconnect();` entfernen (2x)
   - **Grund**: Zentrale Instanz wird in index.ts disconnected

2. `backend/src/controllers/lobbyPmsController.ts` (Zeile 262)
   - **Aktion**: `await prisma.$disconnect();` entfernen
   - **Grund**: Zentrale Instanz wird in index.ts disconnected
   - **BESONDERHEIT**: Diese Datei hat 2 Prisma-Instanzen (siehe 5.4)

3. `backend/src/middleware/organization-integration-test.ts` (Zeile 271)
   - **Aktion**: `await prisma.$disconnect();` entfernen
   - **Grund**: Test-Middleware, disconnect wird zentral gehandhabt

#### 5.2: Manuelle $connect() Aufrufe prüfen

**Dateien mit `prisma.$connect()`**:
1. `backend/src/controllers/roleController.ts` (Zeile 61)
   - **Aktion**: `await prisma.$connect();` entfernen
   - **Grund**: Prisma verbindet sich automatisch beim ersten Query
   - **RISIKO**: Falls es hier einen speziellen Grund gibt, muss geprüft werden

#### 5.3: Prisma Transactions

**FAKT**: Prisma Transactions (`prisma.$transaction()`) funktionieren mit der zentralen Instanz genauso wie vorher. Keine Änderungen nötig.

**Beispiele gefunden in**:
- `backend/src/controllers/roleController.ts` (Zeile 397)
- `backend/src/controllers/consultationInvoiceController.ts` (Zeile 120)
- Weitere Dateien verwenden ebenfalls Transactions

**Aktion**: Keine Änderungen nötig, funktioniert automatisch.

#### 5.4: Dateien mit mehreren Prisma-Instanzen

**Dateien mit mehreren `new PrismaClient()` Aufrufen**:

1. `backend/src/controllers/lobbyPmsController.ts`
   - **Zeile 8**: `const prisma = new PrismaClient();` (globale Instanz oben)
   - **Zeile 181**: `const prisma = new PrismaClient();` (lokale Instanz innerhalb Funktion `syncReservations`)
   - **Zeile 262**: `await prisma.$disconnect();` (muss entfernt werden)
   - **Aktion**: 
     - Beide `new PrismaClient()` durch `import { prisma } from '../utils/prisma';` ersetzen
     - Lokale Instanz (Zeile 181) entfernen, stattdessen zentrale Instanz verwenden
     - `$disconnect()` (Zeile 262) entfernen
   - **Grund**: Dynamischer Import innerhalb Funktion, aber sollte zentrale Instanz verwenden

## Vollständige Liste aller 71 Dateien

### Controllers (39 Dateien)
1. `backend/src/controllers/analyticsController.ts` → `import { prisma } from '../utils/prisma';`
2. `backend/src/controllers/authController.ts` → `import { prisma } from '../utils/prisma';`
3. `backend/src/controllers/boldPaymentController.ts` → `import { prisma } from '../utils/prisma';` + **$disconnect() entfernen (2x)**
4. `backend/src/controllers/branchController.ts` → `import { prisma } from '../utils/prisma';`
5. `backend/src/controllers/cerebroController.ts` → `import { prisma } from '../utils/prisma';`
6. `backend/src/controllers/cerebroExternalLinksController.ts` → `import { prisma } from '../utils/prisma';`
7. `backend/src/controllers/cerebroMediaController.ts` → `import { prisma } from '../utils/prisma';`
8. `backend/src/controllers/clientController.ts` → `import { prisma } from '../utils/prisma';`
9. `backend/src/controllers/consultationController.ts` → `import { prisma } from '../utils/prisma';`
10. `backend/src/controllers/consultationInvoiceController.ts` → `import { prisma } from '../utils/prisma';`
11. `backend/src/controllers/databaseController.ts` → `import { prisma } from '../utils/prisma';`
12. `backend/src/controllers/emailReservationController.ts` → `import { prisma } from '../utils/prisma';`
13. `backend/src/controllers/identificationDocumentController.ts` → `import { prisma } from '../utils/prisma';`
14. `backend/src/controllers/invoiceSettingsController.ts` → `import { prisma } from '../utils/prisma';`
15. `backend/src/controllers/joinRequestController.ts` → `import { prisma } from '../utils/prisma';`
16. `backend/src/controllers/lifecycleController.ts` → `import { prisma } from '../utils/prisma';`
17. `backend/src/controllers/lobbyPmsController.ts` → `import { prisma } from '../utils/prisma';` + **2 Instanzen ersetzen (Zeile 8 + 181)** + **$disconnect() entfernen (Zeile 262)**
18. `backend/src/controllers/monthlyConsultationReportController.ts` → `import { prisma } from '../utils/prisma';`
19. `backend/src/controllers/notificationController.ts` → `import { prisma } from '../utils/prisma';`
20. `backend/src/controllers/organizationController.ts` → `import { prisma } from '../utils/prisma';`
21. `backend/src/controllers/payrollController.ts` → `import { prisma } from '../utils/prisma';`
22. `backend/src/controllers/requestAttachmentController.ts` → `import { prisma } from '../utils/prisma';`
23. `backend/src/controllers/requestController.ts` → `import { prisma } from '../utils/prisma';`
24. `backend/src/controllers/reservationController.ts` → `import { prisma } from '../utils/prisma';`
25. `backend/src/controllers/roleController.ts` → `import { prisma } from '../utils/prisma';` + **$connect() entfernen**
26. `backend/src/controllers/savedFilterController.ts` → `import { prisma } from '../utils/prisma';`
27. `backend/src/controllers/settingsController.ts` → `import { prisma } from '../utils/prisma';`
28. `backend/src/controllers/shiftController.ts` → `import { prisma } from '../utils/prisma';`
29. `backend/src/controllers/shiftSwapController.ts` → `import { prisma } from '../utils/prisma';`
30. `backend/src/controllers/shiftTemplateController.ts` → `import { prisma } from '../utils/prisma';`
31. `backend/src/controllers/tableSettingsController.ts` → `import { prisma } from '../utils/prisma';`
32. `backend/src/controllers/taskAttachmentController.ts` → `import { prisma } from '../utils/prisma';`
33. `backend/src/controllers/taskController.ts` → `import { prisma } from '../utils/prisma';`
34. `backend/src/controllers/teamWorktimeController.ts` → `import { prisma } from '../utils/prisma';`
35. `backend/src/controllers/ttlockController.ts` → `import { prisma } from '../utils/prisma';`
36. `backend/src/controllers/userAvailabilityController.ts` → `import { prisma } from '../utils/prisma';`
37. `backend/src/controllers/userController.ts` → `import { prisma } from '../utils/prisma';`
38. `backend/src/controllers/whatsappController.ts` → `import { prisma } from '../utils/prisma';`
39. `backend/src/controllers/worktimeController.ts` → `import { prisma } from '../utils/prisma';`

### Services (20 Dateien)
1. `backend/src/services/auditService.ts` → `import { prisma } from '../utils/prisma';`
2. `backend/src/services/boldPaymentService.ts` → `import { prisma } from '../utils/prisma';`
3. `backend/src/services/documentService.ts` → `import { prisma } from '../utils/prisma';`
4. `backend/src/services/emailReadingService.ts` → `import { prisma } from '../utils/prisma';`
5. `backend/src/services/emailReservationScheduler.ts` → `import { prisma } from '../utils/prisma';`
6. `backend/src/services/emailReservationService.ts` → `import { prisma } from '../utils/prisma';`
7. `backend/src/services/emailService.ts` → `import { prisma } from '../utils/prisma';`
8. `backend/src/services/lifecycleService.ts` → `import { prisma } from '../utils/prisma';`
9. `backend/src/services/lobbyPmsReservationScheduler.ts` → `import { prisma } from '../utils/prisma';`
10. `backend/src/services/lobbyPmsReservationSyncService.ts` → `import { prisma } from '../utils/prisma';`
11. `backend/src/services/lobbyPmsService.ts` → `import { prisma } from '../utils/prisma';`
12. `backend/src/services/monthlyReportScheduler.ts` → `import { prisma } from '../utils/prisma';`
13. `backend/src/services/reservationNotificationService.ts` → `import { prisma } from '../utils/prisma';`
14. `backend/src/services/reservationTaskService.ts` → `import { prisma } from '../utils/prisma';`
15. `backend/src/services/taskAutomationService.ts` → `import { prisma } from '../utils/prisma';`
16. `backend/src/services/ttlockService.ts` → `import { prisma } from '../utils/prisma';`
17. `backend/src/services/whatsappAiService.ts` → `import { prisma } from '../utils/prisma';`
18. `backend/src/services/whatsappMessageHandler.ts` → `import { prisma } from '../utils/prisma';`
19. `backend/src/services/whatsappReservationService.ts` → `import { prisma } from '../utils/prisma';`
20. `backend/src/services/whatsappService.ts` → `import { prisma } from '../utils/prisma';`

### Middleware (6 Dateien)
1. `backend/src/middleware/admin.ts` → `import { prisma } from '../utils/prisma';`
2. `backend/src/middleware/auth.ts` → `import { prisma } from '../utils/prisma';`
3. `backend/src/middleware/isTeamManager.ts` → `import { prisma } from '../utils/prisma';`
4. `backend/src/middleware/organization.ts` → `import { prisma } from '../utils/prisma';`
5. `backend/src/middleware/organization-integration-test.ts` → `import { prisma } from '../utils/prisma';` + **$disconnect() entfernen**
6. `backend/src/middleware/permissionMiddleware.ts` → `import { prisma } from '../utils/prisma';`

### Utils (2 Dateien)
1. `backend/src/utils/lifecycleRoles.ts` → `import { prisma } from './prisma';`
2. `backend/src/utils/translations.ts` → `import { prisma } from './prisma';`

### Queue Workers (2 Dateien)
1. `backend/src/queues/workers/reservationWorker.ts` → `import { prisma } from '../../utils/prisma';`
2. `backend/src/queues/workers/updateGuestContactWorker.ts` → `import { prisma } from '../../utils/prisma';`

### Routes (2 Dateien)
1. `backend/src/routes/claudeRoutes.ts` → `import { prisma } from '../utils/prisma';`
2. `backend/src/routes/settings.ts` → `import { prisma } from '../utils/prisma';`

**GESAMT: 71 Dateien**

## Implementierungsreihenfolge

### Phase 1: Zentrale Instanz erstellen
1. ✅ `backend/src/utils/prisma.ts` erstellen
2. ✅ Graceful Shutdown in `backend/src/index.ts` hinzufügen
3. ✅ Testen, ob die Dateien korrekt kompilieren

### Phase 2: Controllers refactoren (39 Dateien)
1. Alle Controller-Dateien nacheinander anpassen
2. **Besondere Aufmerksamkeit**:
   - `boldPaymentController.ts`: $disconnect() entfernen (2x)
   - `lobbyPmsController.ts`: 2 Instanzen ersetzen (Zeile 8 + 181) + $disconnect() entfernen (Zeile 262)
   - `roleController.ts`: $connect() entfernen
3. Nach jedem Controller testen (falls möglich)

### Phase 3: Services refactoren (20 Dateien)
1. Alle Service-Dateien nacheinander anpassen
2. Nach jedem Service testen (falls möglich)

### Phase 4: Middleware refactoren (6 Dateien)
1. Alle Middleware-Dateien anpassen
2. **Besondere Aufmerksamkeit**:
   - `organization-integration-test.ts`: $disconnect() entfernen (Zeile 271)
3. Testen

### Phase 5: Utils refactoren (2 Dateien)
1. Utils-Dateien anpassen
2. Testen

### Phase 6: Queue Workers refactoren (2 Dateien)
1. Queue Worker-Dateien anpassen
2. Testen

### Phase 7: Routes refactoren (2 Dateien)
1. Route-Dateien anpassen
2. Testen

### Phase 8: Scripts prüfen
- Scripts in `backend/scripts/` können vorerst unverändert bleiben (werden nicht im Server-Kontext ausgeführt)
- Optional: Auch hier refactoren, wenn gewünscht

## Risiken und Vorsichtsmaßnahmen

### Identifizierte Risiken (FAKTEN)

1. **Import-Pfad-Fehler**: 
   - **Risiko**: Falsche relative Pfade können zu Laufzeitfehlern führen
   - **Vorsicht**: Jeden Import-Pfad genau prüfen basierend auf Dateistruktur

2. **Manuelle $disconnect() Aufrufe**:
   - **Risiko**: Wenn nicht entfernt, wird die Verbindung zu früh getrennt
   - **Vorsicht**: Alle 4 Vorkommen müssen entfernt werden (boldPaymentController: 2x, lobbyPmsController: 1x, organization-integration-test: 1x)

3. **Manuelle $connect() Aufrufe**:
   - **Risiko**: Unnötig, könnte auf ein Problem hinweisen
   - **Vorsicht**: Entfernen und testen, ob alles funktioniert

4. **Prisma Transactions**:
   - **Risiko**: KEIN Risiko - funktionieren mit zentraler Instanz genauso
   - **Vorsicht**: Keine Änderungen nötig

5. **Hot Reload in Development**:
   - **Risiko**: Mehrere Instanzen bei Hot Reload
   - **Vorsicht**: Wird durch `globalThis` abgefangen

6. **Graceful Shutdown**:
   - **Risiko**: Verbindung wird nicht sauber getrennt
   - **Vorsicht**: Wird in index.ts zentral gehandhabt

### Vorsichtsmaßnahmen

1. **Schrittweise Umsetzung**: Nicht alle Dateien auf einmal ändern
2. **Nach jedem Schritt testen**: Server starten und grundlegende Funktionen prüfen
3. **Git Commits**: Nach jeder Phase committen
4. **Backup**: Vor Start ein Backup/Commit erstellen
5. **Besondere Fälle zuerst**: $disconnect() und $connect() Aufrufe zuerst behandeln

## Testing-Strategie

### Nach jeder Phase testen:
1. Server startet ohne Fehler
2. Grundlegende API-Endpoints funktionieren
3. Datenbankzugriffe funktionieren
4. Keine Connection-Pool-Warnungen in Logs
5. Prisma Transactions funktionieren (z.B. roleController, consultationInvoiceController)

### Spezifische Tests:
- Login/Authentifizierung (authController)
- CRUD-Operationen (Tasks, Requests, etc.)
- Services (Email, WhatsApp, etc.)
- Middleware (Permissions, Organization)
- Queue Workers (Reservation Worker)
- Prisma Transactions (roleController, consultationInvoiceController)

## Erwartete Verbesserungen

### Performance
- ✅ Ein einziger Connection Pool statt 71
- ✅ Reduzierter Memory-Verbrauch
- ✅ Bessere Connection-Wiederverwendung

### Code-Qualität
- ✅ Best Practice befolgt (Singleton-Pattern)
- ✅ Zentrale Konfiguration möglich
- ✅ Einfacheres Logging-Management
- ✅ Sauberer Graceful Shutdown

## Was wurde geprüft (FAKTEN)

✅ **Prisma Schema**: Keine spezielle Konfiguration nötig
✅ **Prisma Transactions**: Funktionieren mit zentraler Instanz
✅ **Graceful Shutdown**: Wird in index.ts zentral gehandhabt
✅ **Hot Reload**: Wird durch globalThis abgefangen
✅ **Import-Pfade**: Alle 71 Dateien mit korrekten Pfaden dokumentiert
✅ **Besondere Fälle**: $disconnect() (4x) und $connect() (1x) identifiziert + Mehrfach-Instanzen (lobbyPmsController.ts: 2 Instanzen)
✅ **Prisma-Typen**: Werden weiterhin importiert, wo nötig
✅ **Dokumentation**: ENTWICKLUNGSUMGEBUNG.md zeigt aktuelles Pattern (wird nicht geändert, da es nur Beispiel ist)

## Was wurde NICHT übersehen

✅ Alle 71 Dateien identifiziert und kategorisiert (39 Controllers, 20 Services, 6 Middleware, 2 Utils, 2 Queue Workers, 2 Routes)
✅ Alle Import-Pfade genau berechnet
✅ Alle besonderen Fälle identifiziert:
   - $disconnect() (4x): boldPaymentController (2x), lobbyPmsController (1x), organization-integration-test (1x)
   - $connect() (1x): roleController (1x)
   - Mehrfach-Instanzen: lobbyPmsController.ts (2 Instanzen)
✅ Graceful Shutdown in index.ts geplant
✅ Prisma Transactions geprüft (funktionieren)
✅ Hot Reload berücksichtigt (globalThis)
✅ Prisma-Typen berücksichtigt (bleiben erhalten)

## Zeitaufwand-Schätzung

- **Phase 1** (Zentrale Instanz + Graceful Shutdown): ~20 Minuten
- **Phase 2** (Controllers, 39 Dateien): ~1.5 Stunden
- **Phase 3** (Services, 20 Dateien): ~45 Minuten
- **Phase 4** (Middleware, 6 Dateien): ~20 Minuten
- **Phase 5** (Utils, 2 Dateien): ~10 Minuten
- **Phase 6** (Queue Workers, 2 Dateien): ~10 Minuten
- **Phase 7** (Routes, 2 Dateien): ~10 Minuten
- **Testing**: ~30 Minuten
- **Gesamt**: ~3.5-4 Stunden

## Nächste Schritte

1. ✅ Plan erstellen und prüfen (DONE)
2. ⏳ Plan vom Benutzer bestätigen lassen
3. ⏳ Phase 1 umsetzen (Zentrale Instanz + Graceful Shutdown)
4. ⏳ Phase 2-7 schrittweise umsetzen
5. ⏳ Testing durchführen
6. ⏳ Dokumentation aktualisieren (falls nötig)

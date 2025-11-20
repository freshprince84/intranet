# Prisma-Instanzen Refactoring-Plan

## Problem-Analyse

### Aktueller Zustand
- **71 Dateien** in `backend/src` erstellen jeweils eine eigene Prisma-Instanz mit `const prisma = new PrismaClient()`
- Keine zentrale Prisma-Instanz vorhanden
- Jede Datei hat ihren eigenen Connection Pool

### Probleme
1. **Mehrere Connection Pools**: Jede Instanz erstellt einen eigenen Pool zur Datenbank
2. **Höherer Memory-Verbrauch**: Jede Instanz belegt zusätzlichen Speicher
3. **Potenzielle Performance-Probleme**: Unnötige Overhead durch viele Instanzen
4. **Nicht Best Practice**: Prisma Client ist für Singleton-Nutzung gedacht

### Betroffene Dateitypen
- Controllers (z.B. `authController.ts`, `taskController.ts`, etc.)
- Services (z.B. `emailService.ts`, `whatsappService.ts`, etc.)
- Middleware (z.B. `auth.ts`, `organization.ts`, etc.)
- Utils (z.B. `translations.ts`, `lifecycleRoles.ts`)
- Queue Workers (z.B. `reservationWorker.ts`, `updateGuestContactWorker.ts`)

## Lösung: Zentrale Prisma-Instanz

### Schritt 1: Zentrale Prisma-Instanz erstellen

**Datei**: `backend/src/utils/prisma.ts`

```typescript
import { PrismaClient } from '@prisma/client';

// Singleton-Pattern für Prisma Client
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

// Graceful Shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
```

**Begründung**:
- Singleton-Pattern verhindert mehrere Instanzen
- `globalThis` wird verwendet, um in Development (Hot Reload) die Instanz zu erhalten
- Graceful Shutdown für sauberes Trennen der Verbindung
- Logging nur in Development aktiv

### Schritt 2: Alle Dateien refactoren

**Vorgehen**:
1. In jeder betroffenen Datei:
   - `import { PrismaClient } from '@prisma/client';` entfernen
   - `const prisma = new PrismaClient();` entfernen
   - `import { prisma } from '../utils/prisma';` hinzufügen (Pfad anpassen je nach Dateistruktur)

**Beispiel-Transformation**:

**Vorher** (`backend/src/controllers/authController.ts`):
```typescript
import { PrismaClient, Prisma } from '@prisma/client';
// ...
const prisma = new PrismaClient();
```

**Nachher**:
```typescript
import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../utils/prisma';
// ... (const prisma = new PrismaClient(); entfernt)
```

### Schritt 3: Import-Pfade anpassen

Je nach Dateistruktur müssen die Import-Pfade angepasst werden:

- **Controllers**: `import { prisma } from '../utils/prisma';`
- **Services**: `import { prisma } from '../utils/prisma';`
- **Middleware**: `import { prisma } from '../utils/prisma';`
- **Utils**: `import { prisma } from './prisma';` (wenn in utils/)
- **Queue Workers**: `import { prisma } from '../../utils/prisma';` (wenn in queues/workers/)

### Schritt 4: Prisma-Typen beibehalten

**Wichtig**: `Prisma`-Typen müssen weiterhin importiert werden, falls verwendet:
```typescript
import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../utils/prisma';
```

## Implementierungsreihenfolge

### Phase 1: Zentrale Instanz erstellen
1. ✅ `backend/src/utils/prisma.ts` erstellen
2. ✅ Testen, ob die Datei korrekt kompiliert

### Phase 2: Controllers refactoren (ca. 30 Dateien)
1. Alle Controller-Dateien nacheinander anpassen
2. Nach jedem Controller testen (falls möglich)

### Phase 3: Services refactoren (ca. 20 Dateien)
1. Alle Service-Dateien nacheinander anpassen
2. Nach jedem Service testen (falls möglich)

### Phase 4: Middleware refactoren (ca. 5 Dateien)
1. Alle Middleware-Dateien anpassen
2. Testen

### Phase 5: Utils refactoren (ca. 2 Dateien)
1. Utils-Dateien anpassen
2. Testen

### Phase 6: Queue Workers refactoren (ca. 2 Dateien)
1. Queue Worker-Dateien anpassen
2. Testen

### Phase 7: Scripts prüfen
- Scripts in `backend/scripts/` können vorerst unverändert bleiben (werden nicht im Server-Kontext ausgeführt)
- Optional: Auch hier refactoren, wenn gewünscht

## Risiken und Vorsichtsmaßnahmen

### Risiken
1. **Import-Pfad-Fehler**: Falsche relative Pfade können zu Laufzeitfehlern führen
2. **Hot Reload**: In Development könnte es zu Problemen kommen (wird durch `globalThis` abgefangen)
3. **Graceful Shutdown**: Muss getestet werden

### Vorsichtsmaßnahmen
1. **Schrittweise Umsetzung**: Nicht alle Dateien auf einmal ändern
2. **Nach jedem Schritt testen**: Server starten und grundlegende Funktionen prüfen
3. **Git Commits**: Nach jeder Phase committen
4. **Backup**: Vor Start ein Backup/Commit erstellen

## Testing-Strategie

### Nach jeder Phase testen:
1. Server startet ohne Fehler
2. Grundlegende API-Endpoints funktionieren
3. Datenbankzugriffe funktionieren
4. Keine Connection-Pool-Warnungen in Logs

### Spezifische Tests:
- Login/Authentifizierung
- CRUD-Operationen (Tasks, Requests, etc.)
- Services (Email, WhatsApp, etc.)
- Middleware (Permissions, Organization)

## Erwartete Verbesserungen

### Performance
- ✅ Ein einziger Connection Pool statt 71
- ✅ Reduzierter Memory-Verbrauch
- ✅ Bessere Connection-Wiederverwendung

### Code-Qualität
- ✅ Best Practice befolgt (Singleton-Pattern)
- ✅ Zentrale Konfiguration möglich
- ✅ Einfacheres Logging-Management

## Zeitaufwand-Schätzung

- **Phase 1** (Zentrale Instanz): ~15 Minuten
- **Phase 2-6** (Refactoring): ~2-3 Stunden (abhängig von Tests)
- **Phase 7** (Scripts, optional): ~30 Minuten
- **Gesamt**: ~3-4 Stunden

## Nächste Schritte

1. ✅ Plan erstellen (DONE)
2. ⏳ Plan vom Benutzer bestätigen lassen
3. ⏳ Phase 1 umsetzen (Zentrale Instanz)
4. ⏳ Phase 2-6 schrittweise umsetzen
5. ⏳ Testing durchführen
6. ⏳ Dokumentation aktualisieren (falls nötig)


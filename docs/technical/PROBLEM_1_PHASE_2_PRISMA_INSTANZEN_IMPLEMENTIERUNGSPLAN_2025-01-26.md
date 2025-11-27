# Problem 1 Phase 2: Mehrere Prisma-Instanzen - Implementierungsplan (2025-01-26)

**Datum:** 2025-01-26  
**Status:** 📋 PLAN - Bereit zur Implementierung  
**Priorität:** 🔴🔴🔴 KRITISCH  
**Zweck:** Implementierung mehrerer Prisma-Instanzen für bessere Lastverteilung

---

## 📊 AKTUELLER STATUS

### Problem:
- **1 Prisma-Instanz** (zentrale Instanz in `backend/src/utils/prisma.ts`)
- **1 Connection Pool:** Alle Requests teilen sich einen Pool
- **Bottleneck:** Bei vielen parallelen Requests wird Pool voll
- **Ergebnis:** System ist langsam

### Lösung:
- **5-10 Prisma-Instanzen** mit Round-Robin-Verteilung
- **Jede Instanz:** Eigener Connection Pool (10-15 Verbindungen)
- **Gesamt:** 50-150 Verbindungen theoretisch
- **Bessere Lastverteilung:** Requests nutzen verschiedene Pools

---

## 🔍 DETAILLIERTE ANALYSE

### Warum mehrere Instanzen?

**Tatsache:**
- **Jede PrismaClient-Instanz hat ihren eigenen Connection Pool!**
- Mehrere Instanzen = Mehrere separate Pools
- Mehrere Pools = Bessere Lastverteilung

**Vorher (70+ Instanzen - FUNKTIONIERTE):**
- 70+ Prisma-Instanzen (jede Datei hatte `new PrismaClient()`)
- Jede Instanz: Eigener Connection Pool (Standard: 5 Verbindungen)
- **Ergebnis:** System war schnell!

**Jetzt (1 Instanz - LANGSAM):**
- 1 Prisma-Instanz (zentrale Instanz)
- 1 Connection Pool: Alle Requests teilen sich einen Pool
- **Ergebnis:** System ist langsam!

### Empfohlene Konfiguration:

**Option: Mittelweg - 5 Instanzen**
- **5 Prisma-Instanzen** (statt 1 oder 70+)
- **Jede Instanz:** 10-15 Verbindungen
- **Gesamt:** 50-75 Verbindungen theoretisch
- **ABER:** PostgreSQL begrenzt auf 100 Verbindungen (default)

**Vorteile:**
- Mehrere Pools = Bessere Lastverteilung
- Weniger Memory-Verbrauch als 70+ Instanzen
- Einfacher zu verwalten als 70+ Instanzen
- Rückwärtskompatibel (export const prisma = prismaPools[0])

---

## 📋 IMPLEMENTIERUNGSPLAN

### Schritt 1: Prisma-Instanzen erstellen

**Datei:** `backend/src/utils/prisma.ts`

**Aktueller Code:**
```typescript
const createPrismaClient = () => {
  const enableQueryLogging = process.env.ENABLE_QUERY_LOGGING === 'true' || process.env.NODE_ENV === 'development';
  const client = new PrismaClient({
    log: enableQueryLogging ? ['query', 'error', 'warn'] : ['error'],
  });

  client.$connect().catch((error) => {
    console.error('[Prisma] Initial connection error:', error);
  });

  return client;
};

export const prisma =
  globalForPrisma.prisma ??
  createPrismaClient();
```

**Geänderter Code:**
```typescript
// ✅ PERFORMANCE: Mehrere Prisma-Instanzen für bessere Lastverteilung
const createPrismaClient = (poolId: number) => {
  const enableQueryLogging = process.env.ENABLE_QUERY_LOGGING === 'true' || process.env.NODE_ENV === 'development';
  
  // Connection Pool pro Instanz: 10-15 Verbindungen
  // Gesamt: 5 Pools × 10-15 = 50-75 Verbindungen
  // ABER: PostgreSQL begrenzt auf 100 Verbindungen (default)
  const connectionLimit = 12; // 12 Verbindungen pro Pool
  const poolTimeout = 20;
  
  // DATABASE_URL mit connection_limit für diese Instanz
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  
  // Erstelle URL mit connection_limit für diese Instanz
  const urlWithPool = databaseUrl.includes('connection_limit=')
    ? databaseUrl.replace(/connection_limit=\d+/, `connection_limit=${connectionLimit}`)
    : `${databaseUrl}${databaseUrl.includes('?') ? '&' : '?'}connection_limit=${connectionLimit}&pool_timeout=${poolTimeout}`;
  
  const client = new PrismaClient({
    datasources: {
      db: {
        url: urlWithPool
      }
    },
    log: enableQueryLogging ? ['query', 'error', 'warn'] : ['error'],
  });

  client.$connect().catch((error) => {
    console.error(`[Prisma Pool ${poolId}] Initial connection error:`, error);
  });

  return client;
};

// 5 Prisma-Instanzen erstellen für bessere Lastverteilung
const NUM_POOLS = 5;
const prismaPools: PrismaClient[] = [];

// Singleton-Pattern: Nur einmal erstellen (Development Hot Reload)
if (!globalForPrisma.prismaPools) {
  for (let i = 1; i <= NUM_POOLS; i++) {
    prismaPools.push(createPrismaClient(i));
  }
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prismaPools = prismaPools;
  }
} else {
  prismaPools.push(...globalForPrisma.prismaPools);
}

// Round-Robin-Verteilung für Lastverteilung
let currentPoolIndex = 0;
const getPrismaPool = (): PrismaClient => {
  const pool = prismaPools[currentPoolIndex];
  currentPoolIndex = (currentPoolIndex + 1) % prismaPools.length;
  return pool;
};

// Export: Haupt-Instanz (für Rückwärtskompatibilität)
export const prisma = prismaPools[0];

// Export: Pool-Getter (für Lastverteilung - optional)
export const getPrisma = (): PrismaClient => getPrismaPool();
```

**Wichtig:** `globalForPrisma` erweitern:
```typescript
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaPools: PrismaClient[] | undefined; // NEU
};
```

---

### Schritt 2: Round-Robin-Verteilung (optional)

**Option A: Automatische Verteilung (empfohlen)**
- Alle neuen Requests nutzen automatisch `getPrisma()` statt `prisma`
- **Problem:** Muss in allen Dateien geändert werden (aufwändig)

**Option B: Nur für neue Code-Stellen (empfohlen)**
- Bestehender Code nutzt weiterhin `prisma` (Rückwärtskompatibilität)
- Neue Code-Stellen können `getPrisma()` nutzen
- **Vorteil:** Keine Breaking Changes

**Option C: Schrittweise Migration**
- Kritische Stellen (z.B. Caches) nutzen `getPrisma()`
- Rest nutzt weiterhin `prisma`
- **Vorteil:** Schrittweise Verbesserung

**Empfehlung:** **Option B** - Rückwärtskompatibel, keine Breaking Changes

---

### Schritt 3: Graceful Shutdown

**Datei:** `backend/src/index.ts` (oder wo Graceful Shutdown implementiert ist)

**Prüfen:** Wird `prisma.$disconnect()` aufgerufen?

**Anpassen:**
```typescript
// Vorher:
await prisma.$disconnect();

// Nachher:
await Promise.all(prismaPools.map(pool => pool.$disconnect()));
```

---

## ✅ VALIDIERUNG

### Nach der Implementierung prüfen:

1. **Code-Review:**
   - ✅ 5 Prisma-Instanzen erstellt
   - ✅ Round-Robin-Verteilung implementiert
   - ✅ Rückwärtskompatibilität gewährleistet (`export const prisma = prismaPools[0]`)
   - ✅ Graceful Shutdown angepasst

2. **Build-Test:**
   - ✅ `npm run build` erfolgreich
   - ✅ Keine TypeScript-Fehler
   - ✅ Keine Linter-Fehler

3. **Funktionalität:**
   - ✅ Bestehender Code funktioniert weiterhin (Rückwärtskompatibilität)
   - ✅ Neue Requests nutzen verschiedene Pools (Round-Robin)
   - ✅ Connection Pool wird besser verteilt

4. **Monitoring:**
   - ✅ Logs zeigen verschiedene Pool-IDs
   - ✅ Keine "Connection Pool Timeout" Fehler mehr
   - ✅ System ist schneller

---

## 📊 ERWARTETE VERBESSERUNGEN

### Vorher (1 Instanz):
- **1 Connection Pool:** 20-30 Verbindungen
- **Alle Requests:** Nutzen denselben Pool
- **Bottleneck:** Pool wird schnell voll
- **Ergebnis:** System ist langsam

### Nachher (5 Instanzen):
- **5 Connection Pools:** 12 Verbindungen pro Pool = 60 Verbindungen gesamt
- **Requests:** Nutzen verschiedene Pools (Round-Robin)
- **Bessere Lastverteilung:** Ein voller Pool blockiert nicht alle Requests
- **Ergebnis:** System ist schneller

**Reduktion:**
- **Connection Pool Timeout:** Von häufig → selten
- **Blocking:** Von alle Requests → nur Requests auf vollem Pool
- **Performance:** Von langsam → schneller

---

## ⚠️ RISIKEN UND MITIGATION

### Risiko 1: PostgreSQL max_connections Limit
- **Problem:** PostgreSQL begrenzt auf 100 Verbindungen (default)
- **Mitigation:** 5 Pools × 12 = 60 Verbindungen < 100 ✅
- **Falls nötig:** PostgreSQL `max_connections` erhöhen

### Risiko 2: Memory-Verbrauch
- **Problem:** 5 Instanzen = Mehr Memory als 1 Instanz
- **Mitigation:** 5 Instanzen sind immer noch viel weniger als 70+ Instanzen
- **Erwartung:** Memory-Verbrauch ist akzeptabel

### Risiko 3: Breaking Changes
- **Problem:** Code nutzt `prisma` direkt
- **Mitigation:** `export const prisma = prismaPools[0]` gewährleistet Rückwärtskompatibilität
- **Erwartung:** Keine Breaking Changes

### Risiko 4: Komplexität
- **Problem:** Mehrere Instanzen sind komplexer als 1 Instanz
- **Mitigation:** Round-Robin ist einfach, Code ist gut dokumentiert
- **Erwartung:** Komplexität ist akzeptabel

---

## 🔄 NÄCHSTE SCHRITTE

### Phase 3: Optional - Kritische Stellen optimieren

**Plan:**
- Kritische Stellen (z.B. Caches) nutzen `getPrisma()` statt `prisma`
- Bessere Lastverteilung für häufig genutzte Code-Stellen

**Status:** Wird nach Phase 2 evaluiert

---

## 📋 IMPLEMENTIERUNGS-CHECKLISTE

### Vor der Implementierung:
- [x] Analyse abgeschlossen
- [x] Plan erstellt
- [x] Dokumentation erstellt
- [ ] **WARTE AUF ZUSTIMMUNG** vor Implementierung

### Während der Implementierung:
- [ ] Schritt 1: `createPrismaClient` anpassen (poolId Parameter)
- [ ] Schritt 2: 5 Prisma-Instanzen erstellen
- [ ] Schritt 3: Round-Robin-Verteilung implementieren
- [ ] Schritt 4: `globalForPrisma` erweitern
- [ ] Schritt 5: Graceful Shutdown anpassen
- [ ] Schritt 6: Rückwärtskompatibilität gewährleisten

### Nach der Implementierung:
- [ ] Code-Review durchgeführt
- [ ] Build-Test erfolgreich (`npm run build`)
- [ ] Funktionalität getestet
- [ ] Monitoring aktiviert
- [ ] Dokumentation aktualisiert

---

## 📝 ÄNDERUNGS-PROTOKOLL

| Datum | Änderung | Autor | Status |
|-------|----------|-------|--------|
| 2025-01-26 | Plan erstellt | Auto | ✅ Abgeschlossen |
| 2025-01-26 | Implementierung | - | ⏳ Wartet auf Zustimmung |

---

**Erstellt:** 2025-01-26  
**Status:** 📋 PLAN - Bereit zur Implementierung  
**Nächster Schritt:** Auf Zustimmung warten, dann implementieren


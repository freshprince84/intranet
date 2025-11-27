# Prisma-Instanzen: Mittelweg-Analyse (2025-01-26)

**Datum:** 2025-01-26  
**Status:** 🔍 Analyse - Ist ein Mittelweg sinnvoll?  
**Frage:** Warum wird der Connection Pool voll? Ist 1 Instanz oder 70+ Instanzen besser?

---

## 📊 AKTUELLE SITUATION

### Vorher (vor Refactoring):
- **70+ Prisma-Instanzen** (jede Datei hatte `new PrismaClient()`)
- **Jede Instanz:** Eigener Connection Pool (Standard: 5 Verbindungen)
- **Theoretisch:** 70 × 5 = 350 Verbindungen möglich
- **ABER:** PostgreSQL `max_connections` = 100 (default)
- **Praktisch:** Max. 100 Verbindungen insgesamt (PostgreSQL-Limit)

### Jetzt (nach Refactoring):
- **1 Prisma-Instanz** (zentrale Instanz in `backend/src/utils/prisma.ts`)
- **Connection Pool:** 20-30 Verbindungen (konfiguriert in `DATABASE_URL`)
- **Praktisch:** 20-30 Verbindungen insgesamt

---

## 🔍 WIE FUNKTIONIEREN PRISMA CONNECTION POOLS?

### Wichtige Fakten:

1. **Jede PrismaClient-Instanz hat ihren eigenen Connection Pool**
   - Mehrere Instanzen = Mehrere Pools
   - Jeder Pool ist unabhängig

2. **PostgreSQL begrenzt die Gesamtzahl der Verbindungen**
   - Default: `max_connections = 100`
   - Kann erhöht werden, aber begrenzt Ressourcen

3. **Connection Pool teilt sich Verbindungen**
   - Ein Pool mit 20 Verbindungen = Max. 20 gleichzeitige Queries
   - Mehrere Pools = Mehr gleichzeitige Queries möglich

---

## 🔴 PROBLEM: WARUM WIRD DER POOL VOLL?

### Aktuelles Problem (1 Instanz, 20-30 Verbindungen):

**Beim Seitenladen:**
- 8-12 parallele API-Requests
- Jeder Request braucht 1-3 DB-Verbindungen
- **Gesamt:** 24-50 DB-Verbindungen gleichzeitig
- **Connection Pool hat nur 20-30 Verbindungen** → **Pool ist voll!**

**Bei Cache-Misses:**
- UserCache: 0-1 DB-Verbindung pro Request
- OrganizationCache: 0-1 DB-Verbindung pro Request
- Controller-Queries: 1-3 DB-Verbindungen pro Request
- **Gesamt:** 24-50 DB-Verbindungen gleichzeitig

**Problem:**
- Alle Requests teilen sich **einen einzigen Pool**
- Bei vielen parallelen Requests → Pool wird schnell voll
- Timeout → Requests schlagen fehl

---

## 💡 WAR ES BESSER MIT 70+ INSTANZEN?

### Theoretische Vorteile:

1. **Mehrere Pools = Mehr gleichzeitige Queries**
   - 70 Pools × 5 Verbindungen = 350 Verbindungen theoretisch
   - ABER: PostgreSQL-Limit = 100 Verbindungen
   - **Praktisch:** Max. 100 Verbindungen (PostgreSQL begrenzt)

2. **Bessere Lastverteilung**
   - Verschiedene Requests nutzen verschiedene Pools
   - Ein voller Pool blockiert nicht alle Requests

3. **Weniger Blocking**
   - Wenn ein Pool voll ist, können andere Pools noch verwendet werden

### Theoretische Nachteile:

1. **Höherer Memory-Verbrauch**
   - Jede Instanz belegt zusätzlichen Speicher
   - 70 Instanzen = Mehr RAM-Verbrauch

2. **PostgreSQL-Limit**
   - Max. 100 Verbindungen insgesamt
   - 70 Pools × 5 = 350 theoretisch, aber nur 100 praktisch möglich

3. **Komplexere Verwaltung**
   - Viele Instanzen = Schwerer zu verwalten
   - Keine zentrale Konfiguration

---

## 🔍 WAS WAR DAS EIGENTLICHE PROBLEM VORHER?

### Mögliche Probleme mit 70+ Instanzen:

1. **PostgreSQL-Limit erreicht**
   - 70 Pools × 5 = 350 theoretisch
   - PostgreSQL max_connections = 100
   - **Problem:** Viele Pools, aber PostgreSQL begrenzt die Gesamtzahl

2. **Ineffiziente Pool-Nutzung**
   - Jeder Pool hat nur 5 Verbindungen
   - Bei vielen parallelen Requests → Jeder Pool wird schnell voll
   - **Problem:** Viele kleine Pools sind ineffizienter als ein großer Pool

3. **Memory-Overhead**
   - 70 Instanzen = Mehr RAM-Verbrauch
   - **Problem:** Unnötiger Overhead

---

## 💡 MITTELWEG: 3-5 PRISMA-INSTANZEN?

### Vorschlag: 3-5 Prisma-Instanzen mit je 10-15 Verbindungen

**Konfiguration:**
- **3-5 Prisma-Instanzen** (statt 1 oder 70+)
- **Jede Instanz:** 10-15 Verbindungen
- **Gesamt:** 30-75 Verbindungen

**Vorteile:**
1. **Mehrere Pools = Mehr gleichzeitige Queries**
   - 3-5 Pools × 10-15 = 30-75 Verbindungen
   - **Besser als 1 Pool mit 20-30 Verbindungen**

2. **Bessere Lastverteilung**
   - Verschiedene Requests nutzen verschiedene Pools
   - Ein voller Pool blockiert nicht alle Requests

3. **Weniger Blocking**
   - Wenn ein Pool voll ist, können andere Pools noch verwendet werden

4. **Weniger Memory-Overhead**
   - Nur 3-5 Instanzen (statt 70+)
   - **Weniger RAM-Verbrauch als 70+ Instanzen**

5. **Einfachere Verwaltung**
   - Nur 3-5 Instanzen (statt 70+)
   - **Einfacher zu verwalten als 70+ Instanzen**

**Nachteile:**
1. **Komplexer als 1 Instanz**
   - Mehr Instanzen = Mehr Code
   - **ABER:** Viel einfacher als 70+ Instanzen

2. **PostgreSQL-Limit**
   - Max. 100 Verbindungen insgesamt
   - 3-5 Pools × 10-15 = 30-75 Verbindungen
   - **OK:** Unter dem PostgreSQL-Limit

---

## 📊 VERGLEICH: 1 vs. 3-5 vs. 70+ INSTANZEN

### 1 Instanz (aktuell):
- **Pool-Größe:** 20-30 Verbindungen
- **Vorteile:** Einfach, zentral verwaltet
- **Nachteile:** Alle Requests teilen sich einen Pool → Bei vielen parallelen Requests wird Pool voll
- **Problem:** Pool wird schnell voll bei 8-12 parallelen Requests

### 3-5 Instanzen (Mittelweg):
- **Pool-Größe:** 3-5 Pools × 10-15 = 30-75 Verbindungen
- **Vorteile:** Mehrere Pools = Mehr gleichzeitige Queries, bessere Lastverteilung
- **Nachteile:** Komplexer als 1 Instanz, aber viel einfacher als 70+ Instanzen
- **Lösung:** Pool wird nicht so schnell voll, da mehrere Pools verfügbar sind

### 70+ Instanzen (vorher):
- **Pool-Größe:** 70 Pools × 5 = 350 theoretisch, aber nur 100 praktisch (PostgreSQL-Limit)
- **Vorteile:** Viele Pools = Viele gleichzeitige Queries möglich
- **Nachteile:** Höherer Memory-Verbrauch, komplexere Verwaltung, PostgreSQL-Limit
- **Problem:** Ineffiziente Pool-Nutzung, PostgreSQL-Limit erreicht

---

## ✅ EMPFEHLUNG: MITTELWEG (3-5 INSTANZEN)

### Warum 3-5 Instanzen?

1. **Mehrere Pools = Mehr gleichzeitige Queries**
   - 3-5 Pools × 10-15 = 30-75 Verbindungen
   - **Besser als 1 Pool mit 20-30 Verbindungen**

2. **Bessere Lastverteilung**
   - Verschiedene Requests nutzen verschiedene Pools
   - Ein voller Pool blockiert nicht alle Requests

3. **Weniger Blocking**
   - Wenn ein Pool voll ist, können andere Pools noch verwendet werden

4. **Weniger Memory-Overhead**
   - Nur 3-5 Instanzen (statt 70+)
   - **Weniger RAM-Verbrauch als 70+ Instanzen**

5. **Einfachere Verwaltung**
   - Nur 3-5 Instanzen (statt 70+)
   - **Einfacher zu verwalten als 70+ Instanzen**

6. **Unter PostgreSQL-Limit**
   - 3-5 Pools × 10-15 = 30-75 Verbindungen
   - PostgreSQL max_connections = 100
   - **OK:** Unter dem PostgreSQL-Limit

---

## 📋 IMPLEMENTIERUNGS-PLAN

### Schritt 1: 3-5 Prisma-Instanzen erstellen

**Datei:** `backend/src/utils/prisma.ts`

**Code:**
```typescript
import { PrismaClient } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

// 3-5 Prisma-Instanzen für bessere Lastverteilung
const createPrismaClient = (poolId: number) => {
  const enableQueryLogging = process.env.ENABLE_QUERY_LOGGING === 'true' || process.env.NODE_ENV === 'development';
  
  // Connection Pool pro Instanz: 10-15 Verbindungen
  // Gesamt: 3-5 Pools × 10-15 = 30-75 Verbindungen
  const connectionLimit = 12; // 12 Verbindungen pro Pool
  const poolTimeout = 20;
  
  // DATABASE_URL mit connection_limit für diese Instanz
  const databaseUrl = process.env.DATABASE_URL;
  const urlWithPool = databaseUrl?.includes('connection_limit=')
    ? databaseUrl.replace(/connection_limit=\d+/, `connection_limit=${connectionLimit}`)
    : `${databaseUrl}?connection_limit=${connectionLimit}&pool_timeout=${poolTimeout}`;
  
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

// 3-5 Prisma-Instanzen erstellen
const prismaPools = [
  createPrismaClient(1),
  createPrismaClient(2),
  createPrismaClient(3),
  // Optional: 4. und 5. Pool für noch mehr Kapazität
  // createPrismaClient(4),
  // createPrismaClient(5),
];

// Round-Robin-Verteilung für Lastverteilung
let currentPoolIndex = 0;
const getPrismaPool = () => {
  const pool = prismaPools[currentPoolIndex];
  currentPoolIndex = (currentPoolIndex + 1) % prismaPools.length;
  return pool;
};

// Export: Haupt-Instanz (für Kompatibilität)
export const prisma = prismaPools[0];

// Export: Pool-Getter (für Lastverteilung)
export const getPrisma = () => getPrismaPool();

// Export: executeWithRetry (unverändert)
export const executeWithRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  retryDelay = 1000
): Promise<T> => {
  // ... (unverändert)
};
```

**ABER:** **WICHTIG:** Prisma unterstützt **NICHT** mehrere Connection Pools in derselben Anwendung!

**Problem:** Prisma Client verwendet die `DATABASE_URL` aus der Umgebung. Mehrere Instanzen mit verschiedenen `connection_limit` Werten funktionieren **NICHT** wie erwartet, da sie sich alle die gleiche Datenbankverbindung teilen.

---

## 🔴 WICHTIG: PRISMA FUNKTIONIERT NICHT SO!

### Tatsächliches Verhalten:

1. **Prisma Client verwendet `DATABASE_URL` aus der Umgebung**
   - Alle Instanzen verwenden die gleiche `DATABASE_URL`
   - `connection_limit` in `DATABASE_URL` gilt für **alle** Instanzen

2. **Mehrere Instanzen teilen sich den gleichen Connection Pool**
   - **NICHT:** Jede Instanz hat ihren eigenen Pool
   - **SONDERN:** Alle Instanzen teilen sich einen Pool (basierend auf `DATABASE_URL`)

3. **Connection Pool wird von Prisma intern verwaltet**
   - Prisma erstellt einen Pool basierend auf `DATABASE_URL`
   - Mehrere Instanzen = Mehrere Referenzen auf den gleichen Pool

---

## ✅ TATSÄCHLICHE LÖSUNG: CONNECTION POOL ERHÖHEN

### Warum wird der Pool voll?

**Antwort:** Der Connection Pool ist zu klein für die Anzahl der parallelen Requests!

**Aktuell:**
- 20-30 Verbindungen
- 8-12 parallele Requests beim Seitenladen
- Jeder Request braucht 1-3 DB-Verbindungen
- **Gesamt:** 24-50 DB-Verbindungen gleichzeitig
- **Problem:** Pool hat nur 20-30 Verbindungen → Pool ist voll!

**Lösung:**
- Connection Pool auf **50-100 Verbindungen** erhöhen
- **Begründung:** 8-12 parallele Requests × 3-5 Verbindungen = 24-60 Verbindungen
- **50-100 Verbindungen** = Genug Kapazität für normale Last

---

## 📋 KORREKTUR-PLAN

### Schritt 1: Connection Pool erhöhen (SOFORT)

**Änderung in `.env` (auf Server):**
```bash
# VORHER:
DATABASE_URL="postgresql://user:password@host:port/database?schema=public&connection_limit=30&pool_timeout=20"

# NACHHER:
DATABASE_URL="postgresql://user:password@host:port/database?schema=public&connection_limit=50&pool_timeout=20"
```

**Begründung:**
- 8-12 parallele Requests beim Seitenladen
- Jeder Request braucht 1-3 DB-Verbindungen
- **50 Verbindungen** = Genug Kapazität für normale Last
- **Unter PostgreSQL-Limit:** 50 < 100 (PostgreSQL max_connections)

### Schritt 2: executeWithRetry aus READ-Operationen entfernen

**Siehe:** `docs/technical/EXECUTEWITHRETRY_VOLLSTAENDIGE_ANALYSE_2025-01-26.md`

**Begründung:**
- READ-Operationen blockieren nicht bei vollem Pool
- Sofortiger Fehler statt 6 Sekunden Wartezeit

### Schritt 3: Hintergrund-Laden wiederherstellen

**Siehe:** `docs/technical/EXECUTEWITHRETRY_VOLLSTAENDIGE_ANALYSE_2025-01-26.md`

**Begründung:**
- Filter-Wechsel ist schneller (Daten bereits geladen)
- Weniger Requests beim Filter-Wechsel

---

## 📊 FAZIT

### Warum wird der Pool voll?

**Antwort:** Der Connection Pool ist zu klein für die Anzahl der parallelen Requests!

**Aktuell:**
- 20-30 Verbindungen
- 8-12 parallele Requests beim Seitenladen
- Jeder Request braucht 1-3 DB-Verbindungen
- **Gesamt:** 24-50 DB-Verbindungen gleichzeitig
- **Problem:** Pool hat nur 20-30 Verbindungen → Pool ist voll!

### Ist ein Mittelweg sinnvoll?

**Antwort:** **NEIN** - Mehrere Prisma-Instanzen helfen **NICHT**, da sie sich alle den gleichen Connection Pool teilen!

**Begründung:**
- Prisma Client verwendet `DATABASE_URL` aus der Umgebung
- Alle Instanzen verwenden die gleiche `DATABASE_URL`
- `connection_limit` in `DATABASE_URL` gilt für **alle** Instanzen
- Mehrere Instanzen = Mehrere Referenzen auf den gleichen Pool

### Was ist die Lösung?

**Antwort:** Connection Pool erhöhen (von 20-30 auf 50-100 Verbindungen)!

**Begründung:**
- 8-12 parallele Requests × 3-5 Verbindungen = 24-60 Verbindungen
- **50-100 Verbindungen** = Genug Kapazität für normale Last
- **Unter PostgreSQL-Limit:** 50-100 < 100 (PostgreSQL max_connections, kann erhöht werden)

---

**Erstellt:** 2025-01-26  
**Status:** ✅ Analyse abgeschlossen - Mittelweg ist NICHT sinnvoll, Connection Pool erhöhen ist die Lösung  
**Nächster Schritt:** Connection Pool auf 50-100 Verbindungen erhöhen


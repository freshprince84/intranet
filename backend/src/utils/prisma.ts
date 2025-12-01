import { PrismaClient } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

// Singleton-Pattern für Prisma Client
// Verhindert mehrere Instanzen in Development (Hot Reload)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaPools: PrismaClient[] | undefined;
};

// ✅ PERFORMANCE: Mehrere Prisma-Instanzen für bessere Lastverteilung
const createPrismaClient = (poolId: number) => {
  const enableQueryLogging = process.env.ENABLE_QUERY_LOGGING === 'true' || process.env.NODE_ENV === 'development';
  
  // Connection Pool pro Instanz: 10 Verbindungen
  // Gesamt: 10 Pools × 10 = 100 Verbindungen (optimal für PostgreSQL-Limit)
  // PostgreSQL begrenzt auf 100 Verbindungen (default)
  const connectionLimit = 10; // 10 Verbindungen pro Pool
  const poolTimeout = 20;
  
  // DATABASE_URL mit connection_limit für diese Instanz
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  
  // ✅ PERFORMANCE: Erstelle URL mit connection_limit für diese Instanz
  // WICHTIG: Entferne ALLE connection_limit Parameter aus DATABASE_URL und setze neu
  let urlWithPool: string;
  try {
    const url = new URL(databaseUrl.replace(/^postgresql:/, 'http:'));
    // Entferne connection_limit und pool_timeout falls vorhanden
    url.searchParams.delete('connection_limit');
    url.searchParams.delete('pool_timeout');
    // Setze neue Werte
    url.searchParams.set('connection_limit', connectionLimit.toString());
    url.searchParams.set('pool_timeout', poolTimeout.toString());
    urlWithPool = url.toString().replace(/^http:/, 'postgresql:');
  } catch {
    // Fallback: Einfache String-Ersetzung wenn URL-Parsing fehlschlägt
    urlWithPool = databaseUrl.includes('connection_limit=')
      ? databaseUrl.replace(/[?&]connection_limit=\d+/, '').replace(/connection_limit=\d+[&?]/, '')
        .replace(/[?&]pool_timeout=\d+/, '').replace(/pool_timeout=\d+[&?]/, '')
        + (databaseUrl.includes('?') ? '&' : '?') + `connection_limit=${connectionLimit}&pool_timeout=${poolTimeout}`
      : `${databaseUrl}${databaseUrl.includes('?') ? '&' : '?'}connection_limit=${connectionLimit}&pool_timeout=${poolTimeout}`;
  }
  
  const client = new PrismaClient({
    datasources: {
      db: {
        url: urlWithPool
      }
    },
    log: enableQueryLogging ? ['query', 'error', 'warn'] : ['error'],
  });
  
  // Prisma reconnect bei geschlossenen Verbindungen
  client.$connect().catch((error) => {
    console.error(`[Prisma Pool ${poolId}] Initial connection error:`, error);
  });

  return client;
};

// 10 Prisma-Instanzen erstellen für bessere Lastverteilung
// 10 × 10 = 100 Verbindungen (optimal für PostgreSQL max_connections = 100)
const NUM_POOLS = 10;
let prismaPools: PrismaClient[] = [];

// Singleton-Pattern: Nur einmal erstellen (Development Hot Reload)
if (!globalForPrisma.prismaPools) {
  console.log(`[Prisma] Erstelle ${NUM_POOLS} Prisma-Instanzen für Round-Robin-Verteilung...`);
  for (let i = 1; i <= NUM_POOLS; i++) {
    prismaPools.push(createPrismaClient(i));
  }
  console.log(`[Prisma] ✅ ${NUM_POOLS} Prisma-Instanzen erstellt (${NUM_POOLS} × 10 = ${NUM_POOLS * 10} Verbindungen)`);
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prismaPools = prismaPools;
  } else {
    // In Production auch speichern, damit Pools nicht bei jedem Import neu erstellt werden
    globalForPrisma.prismaPools = prismaPools;
  }
} else {
  console.log(`[Prisma] Verwende existierende Prisma-Instanzen (${globalForPrisma.prismaPools.length} Pools)`);
  prismaPools = globalForPrisma.prismaPools;
}

// ✅ PERFORMANCE: Pool-Status-Tracking für intelligente Auswahl
interface PoolStatus {
  activeQueries: number; // Anzahl aktiver Queries (Schätzung)
  lastUsed: number; // Timestamp des letzten Zugriffs
  totalQueries: number; // Gesamtanzahl Queries (für Monitoring)
}

const poolStatuses: PoolStatus[] = prismaPools.map(() => ({
  activeQueries: 0,
  lastUsed: Date.now(),
  totalQueries: 0
}));

// ✅ PERFORMANCE: Intelligente Pool-Auswahl statt Round-Robin
// Wählt Pool mit den wenigsten aktiven Queries (Schätzung)
const getPrismaPool = (): PrismaClient => {
  // Finde Pool mit den wenigsten aktiven Queries
  let bestPoolIndex = 0;
  let minActiveQueries = poolStatuses[0].activeQueries;
  
  for (let i = 1; i < poolStatuses.length; i++) {
    if (poolStatuses[i].activeQueries < minActiveQueries) {
      minActiveQueries = poolStatuses[i].activeQueries;
      bestPoolIndex = i;
    }
  }
  
  // Wenn mehrere Pools gleich wenig haben, wähle den zuletzt genutzten (Round-Robin-Fallback)
  if (minActiveQueries === poolStatuses[bestPoolIndex].activeQueries) {
    // Finde alle Pools mit minimalen aktiven Queries
    const candidates = poolStatuses
      .map((status, index) => ({ status, index }))
      .filter(({ status }) => status.activeQueries === minActiveQueries)
      .sort((a, b) => a.status.lastUsed - b.status.lastUsed); // Ältester zuerst
    
    if (candidates.length > 0) {
      bestPoolIndex = candidates[0].index;
    }
  }
  
  const pool = prismaPools[bestPoolIndex];
  const poolId = bestPoolIndex + 1;
  
  // Update Pool-Status
  poolStatuses[bestPoolIndex].activeQueries++;
  poolStatuses[bestPoolIndex].lastUsed = Date.now();
  poolStatuses[bestPoolIndex].totalQueries++;
  
  // Logging bei jedem 100. Zugriff
  if (poolStatuses[bestPoolIndex].totalQueries % 100 === 0) {
    const avgActive = poolStatuses.reduce((sum, s) => sum + s.activeQueries, 0) / poolStatuses.length;
    console.log(`[Prisma] Intelligente Pool-Auswahl: Pool ${poolId}/${prismaPools.length} (aktive Queries: ${poolStatuses[bestPoolIndex].activeQueries}, Durchschnitt: ${avgActive.toFixed(1)})`);
  }
  
  return pool;
};

// ✅ HELPER: Query beendet - reduziere aktive Queries
export const releasePoolQuery = (poolIndex: number) => {
  if (poolIndex >= 0 && poolIndex < poolStatuses.length) {
    poolStatuses[poolIndex].activeQueries = Math.max(0, poolStatuses[poolIndex].activeQueries - 1);
  }
};

// ✅ PERFORMANCE: prisma export nutzt intelligente Pool-Auswahl für Lastverteilung
// Jeder Zugriff auf prisma.* nutzt den Pool mit den wenigsten aktiven Queries
// WICHTIG: Proxy leitet alle Property-Zugriffe (prisma.user, prisma.task, etc.) an intelligente Auswahl weiter
const prismaProxy = new Proxy({} as PrismaClient, {
  get(target, prop) {
    // Für jeden Property-Zugriff: Nutze intelligente Pool-Auswahl
    const pool = getPrismaPool();
    const poolIndex = prismaPools.indexOf(pool);
    
    // Wrapper für async Operations: Track Query-Start und -Ende
    const originalProp = (pool as any)[prop];
    
    // Wenn es eine Funktion ist (z.B. findMany, create, etc.), wrappe sie
    if (typeof originalProp === 'function') {
      return function(...args: any[]) {
        const result = originalProp.apply(pool, args);
        
        // Wenn es ein Promise ist, tracke Start und Ende
        if (result && typeof result.then === 'function') {
          // Query startet - bereits in getPrismaPool() gezählt
          return result.finally(() => {
            // Query beendet - reduziere Counter
            releasePoolQuery(poolIndex);
          });
        }
        
        return result;
      };
    }
    
    return originalProp;
  }
});

// Export: Round-Robin Proxy (automatische Lastverteilung)
export const prisma = prismaProxy;

// Export: Pool-Getter (für explizite Nutzung - optional)
export const getPrisma = (): PrismaClient => getPrismaPool();

// Export: Alle Pools (für Graceful Shutdown)
export const getAllPrismaPools = (): PrismaClient[] => prismaPools;

// ✅ Helper-Funktion für Retry bei DB-Fehlern
// WICHTIG: Keine disconnect/connect Logik - Prisma reconnect automatisch!
export const executeWithRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  retryDelay = 1000
): Promise<T> => {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // 🔴 KRITISCH: Connection Pool Timeout = Sofortiger Fehler, kein Retry!
      // Retry würde das Problem verschlimmern (noch mehr Requests → Pool noch voller)
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.message.includes('Timed out fetching a new connection from the connection pool')
      ) {
        console.error(`[Prisma] 🔴 Connection Pool Timeout - Kein Retry! Pool ist voll.`);
        // ✅ MONITORING: Pool-Status loggen bei Timeout
        try {
          const { monitorConnectionPool } = await import('./poolMonitor');
          await monitorConnectionPool();
        } catch (monitorError) {
          // Monitoring-Fehler nicht kritisch
        }
        throw error; // Sofort werfen, kein Retry!
      }
      
      // Prüfe ob es ein DB-Verbindungsfehler ist
      if (
        error instanceof PrismaClientKnownRequestError &&
        (error.code === 'P1001' || // Can't reach database server
         error.code === 'P1008' || // Operations timed out
         error.message.includes('Server has closed the connection') ||
         error.message.includes("Can't reach database server"))
      ) {
        console.warn(`[Prisma] DB connection error (attempt ${attempt}/${maxRetries}):`, error.message);
        
        if (attempt < maxRetries) {
          // Retry mit Delay - Prisma reconnect automatisch, keine manuelle disconnect/connect nötig!
            await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
          console.log(`[Prisma] Retrying after ${attempt} attempt(s) - Prisma will reconnect automatically`);
        }
      } else {
        // Kein DB-Verbindungsfehler - sofort werfen
        throw error;
      }
    }
  }
  
  throw lastError || new Error('Operation failed after retries');
};

// Graceful Shutdown wird in index.ts behandelt


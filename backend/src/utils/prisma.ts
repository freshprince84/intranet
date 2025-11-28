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

// Round-Robin-Verteilung für Lastverteilung
let currentPoolIndex = 0;
let poolUsageCount = 0; // Zähler für Pool-Nutzung
const getPrismaPool = (): PrismaClient => {
  const pool = prismaPools[currentPoolIndex];
  const poolId = currentPoolIndex + 1;
  currentPoolIndex = (currentPoolIndex + 1) % prismaPools.length;
  poolUsageCount++;
  // Logging bei jedem 100. Zugriff, um zu sehen welche Pools genutzt werden
  if (poolUsageCount % 100 === 0) {
    console.log(`[Prisma] Round-Robin: Nutze Pool ${poolId}/${prismaPools.length} (Zugriff #${poolUsageCount})`);
  }
  return pool;
};

// ✅ PERFORMANCE: prisma export nutzt automatisch Round-Robin für Lastverteilung
// Jeder Zugriff auf prisma.* nutzt einen anderen Pool
// WICHTIG: Proxy leitet alle Property-Zugriffe (prisma.user, prisma.task, etc.) an Round-Robin weiter
const prismaProxy = new Proxy({} as PrismaClient, {
  get(target, prop) {
    // Für jeden Property-Zugriff: Nutze Round-Robin
    const pool = getPrismaPool();
    return (pool as any)[prop];
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


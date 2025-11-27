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
  
  // Connection Pool pro Instanz: 10-15 Verbindungen
  // Gesamt: 5 Pools × 12 = 60 Verbindungen
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

  // Prisma reconnect bei geschlossenen Verbindungen
  client.$connect().catch((error) => {
    console.error(`[Prisma Pool ${poolId}] Initial connection error:`, error);
  });

  return client;
};

// 5 Prisma-Instanzen erstellen für bessere Lastverteilung
const NUM_POOLS = 5;
let prismaPools: PrismaClient[] = [];

// Singleton-Pattern: Nur einmal erstellen (Development Hot Reload)
if (!globalForPrisma.prismaPools) {
  for (let i = 1; i <= NUM_POOLS; i++) {
    prismaPools.push(createPrismaClient(i));
  }
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prismaPools = prismaPools;
  }
} else {
  prismaPools = globalForPrisma.prismaPools;
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


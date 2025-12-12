import { PrismaClient } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

// Singleton-Pattern für Prisma Client
// Verhindert mehrere Instanzen in Development (Hot Reload)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// ✅ PERFORMANCE: Connection Pool - Werte aus DATABASE_URL verwenden oder Defaults
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  
// Extrahiere connection_limit aus DATABASE_URL oder nutze Default
const urlParams = new URLSearchParams(databaseUrl.split('?')[1] || '');
const connectionLimit = parseInt(urlParams.get('connection_limit') || '10', 10); // Default: 10 (nicht 25!)
const poolTimeout = parseInt(urlParams.get('pool_timeout') || '30', 10); // Default: 30s
  
const enableQueryLogging = process.env.ENABLE_QUERY_LOGGING === 'true' || process.env.NODE_ENV === 'development';

// ✅ Nutze DATABASE_URL direkt - Werte werden dort konfiguriert
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: enableQueryLogging ? ['query', 'error', 'warn'] : ['error'],
  });
  
  if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
} else {
  // In Production auch speichern, damit Instanz nicht bei jedem Import neu erstellt wird
  globalForPrisma.prisma = prisma;
    }

// Prisma reconnect bei geschlossenen Verbindungen
prisma.$connect().catch((error) => {
  console.error('[Prisma] Initial connection error:', error);
});

console.log(`[Prisma] ✅ Singleton-Instanz erstellt (connection_limit: ${connectionLimit})`);

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

/**
 * Helper-Funktion für Soft Delete Filter
 * Verwendet in allen Queries, die Tasks/Requests abfragen
 * 
 * @returns Prisma Where-Klausel für nicht gelöschte Einträge
 */
export const getNotDeletedFilter = () => ({
    deletedAt: null
});

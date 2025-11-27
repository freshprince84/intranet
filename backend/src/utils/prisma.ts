import { PrismaClient } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

// Singleton-Pattern für Prisma Client
// Verhindert mehrere Instanzen in Development (Hot Reload)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// ✅ PERFORMANCE: Prisma Client mit reconnect-Logik
const createPrismaClient = () => {
  // TEMPORÄR: Query-Logging aktivieren für Performance-Analyse
  const enableQueryLogging = process.env.ENABLE_QUERY_LOGGING === 'true' || process.env.NODE_ENV === 'development';
  const client = new PrismaClient({
    log: enableQueryLogging ? ['query', 'error', 'warn'] : ['error'],
  });

  // ✅ Reconnect-Logik: Bei DB-Verbindungsfehlern reconnect versuchen
  const originalQuery = (client as any).$connect;
  
  // Prisma reconnect bei geschlossenen Verbindungen
  client.$connect().catch((error) => {
    console.error('[Prisma] Initial connection error:', error);
  });

  return client;
};

export const prisma =
  globalForPrisma.prisma ??
  createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

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


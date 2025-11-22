import { PrismaClient } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

// Singleton-Pattern für Prisma Client
// Verhindert mehrere Instanzen in Development (Hot Reload)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// ✅ PERFORMANCE: Prisma Client mit reconnect-Logik
const createPrismaClient = () => {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
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

// ✅ Helper-Funktion für reconnect bei DB-Fehlern
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
          // Versuche reconnect
          try {
            await prisma.$disconnect();
            await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
            await prisma.$connect();
            console.log(`[Prisma] Reconnected after ${attempt} attempt(s)`);
          } catch (reconnectError) {
            console.error('[Prisma] Reconnect failed:', reconnectError);
          }
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


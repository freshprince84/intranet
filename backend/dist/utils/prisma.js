"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeWithRetry = exports.getAllPrismaPools = exports.getPrisma = exports.prisma = void 0;
const client_1 = require("@prisma/client");
const library_1 = require("@prisma/client/runtime/library");
// Singleton-Pattern für Prisma Client
// Verhindert mehrere Instanzen in Development (Hot Reload)
const globalForPrisma = globalThis;
// ✅ PERFORMANCE: Mehrere Prisma-Instanzen für bessere Lastverteilung
const createPrismaClient = (poolId) => {
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
    let urlWithPool;
    try {
        const url = new URL(databaseUrl.replace(/^postgresql:/, 'http:'));
        // Entferne connection_limit und pool_timeout falls vorhanden
        url.searchParams.delete('connection_limit');
        url.searchParams.delete('pool_timeout');
        // Setze neue Werte
        url.searchParams.set('connection_limit', connectionLimit.toString());
        url.searchParams.set('pool_timeout', poolTimeout.toString());
        urlWithPool = url.toString().replace(/^http:/, 'postgresql:');
    }
    catch (_a) {
        // Fallback: Einfache String-Ersetzung wenn URL-Parsing fehlschlägt
        urlWithPool = databaseUrl.includes('connection_limit=')
            ? databaseUrl.replace(/[?&]connection_limit=\d+/, '').replace(/connection_limit=\d+[&?]/, '')
                .replace(/[?&]pool_timeout=\d+/, '').replace(/pool_timeout=\d+[&?]/, '')
                + (databaseUrl.includes('?') ? '&' : '?') + `connection_limit=${connectionLimit}&pool_timeout=${poolTimeout}`
            : `${databaseUrl}${databaseUrl.includes('?') ? '&' : '?'}connection_limit=${connectionLimit}&pool_timeout=${poolTimeout}`;
    }
    const client = new client_1.PrismaClient({
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
let prismaPools = [];
// Singleton-Pattern: Nur einmal erstellen (Development Hot Reload)
if (!globalForPrisma.prismaPools) {
    console.log(`[Prisma] Erstelle ${NUM_POOLS} Prisma-Instanzen für Round-Robin-Verteilung...`);
    for (let i = 1; i <= NUM_POOLS; i++) {
        prismaPools.push(createPrismaClient(i));
    }
    console.log(`[Prisma] ✅ ${NUM_POOLS} Prisma-Instanzen erstellt (${NUM_POOLS} × 10 = ${NUM_POOLS * 10} Verbindungen)`);
    if (process.env.NODE_ENV !== 'production') {
        globalForPrisma.prismaPools = prismaPools;
    }
    else {
        // In Production auch speichern, damit Pools nicht bei jedem Import neu erstellt werden
        globalForPrisma.prismaPools = prismaPools;
    }
}
else {
    console.log(`[Prisma] Verwende existierende Prisma-Instanzen (${globalForPrisma.prismaPools.length} Pools)`);
    prismaPools = globalForPrisma.prismaPools;
}
// Round-Robin-Verteilung für Lastverteilung
let currentPoolIndex = 0;
let poolUsageCount = 0; // Zähler für Pool-Nutzung
const getPrismaPool = () => {
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
const prismaProxy = new Proxy({}, {
    get(target, prop) {
        // Für jeden Property-Zugriff: Nutze Round-Robin
        const pool = getPrismaPool();
        return pool[prop];
    }
});
// Export: Round-Robin Proxy (automatische Lastverteilung)
exports.prisma = prismaProxy;
// Export: Pool-Getter (für explizite Nutzung - optional)
const getPrisma = () => getPrismaPool();
exports.getPrisma = getPrisma;
// Export: Alle Pools (für Graceful Shutdown)
const getAllPrismaPools = () => prismaPools;
exports.getAllPrismaPools = getAllPrismaPools;
// ✅ Helper-Funktion für Retry bei DB-Fehlern
// WICHTIG: Keine disconnect/connect Logik - Prisma reconnect automatisch!
const executeWithRetry = (operation_1, ...args_1) => __awaiter(void 0, [operation_1, ...args_1], void 0, function* (operation, maxRetries = 3, retryDelay = 1000) {
    let lastError = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return yield operation();
        }
        catch (error) {
            lastError = error;
            // 🔴 KRITISCH: Connection Pool Timeout = Sofortiger Fehler, kein Retry!
            // Retry würde das Problem verschlimmern (noch mehr Requests → Pool noch voller)
            if (error instanceof library_1.PrismaClientKnownRequestError &&
                error.message.includes('Timed out fetching a new connection from the connection pool')) {
                console.error(`[Prisma] 🔴 Connection Pool Timeout - Kein Retry! Pool ist voll.`);
                // ✅ MONITORING: Pool-Status loggen bei Timeout
                try {
                    const { monitorConnectionPool } = yield Promise.resolve().then(() => __importStar(require('./poolMonitor')));
                    yield monitorConnectionPool();
                }
                catch (monitorError) {
                    // Monitoring-Fehler nicht kritisch
                }
                throw error; // Sofort werfen, kein Retry!
            }
            // Prüfe ob es ein DB-Verbindungsfehler ist
            if (error instanceof library_1.PrismaClientKnownRequestError &&
                (error.code === 'P1001' || // Can't reach database server
                    error.code === 'P1008' || // Operations timed out
                    error.message.includes('Server has closed the connection') ||
                    error.message.includes("Can't reach database server"))) {
                console.warn(`[Prisma] DB connection error (attempt ${attempt}/${maxRetries}):`, error.message);
                if (attempt < maxRetries) {
                    // Retry mit Delay - Prisma reconnect automatisch, keine manuelle disconnect/connect nötig!
                    yield new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
                    console.log(`[Prisma] Retrying after ${attempt} attempt(s) - Prisma will reconnect automatically`);
                }
            }
            else {
                // Kein DB-Verbindungsfehler - sofort werfen
                throw error;
            }
        }
    }
    throw lastError || new Error('Operation failed after retries');
});
exports.executeWithRetry = executeWithRetry;
// Graceful Shutdown wird in index.ts behandelt
//# sourceMappingURL=prisma.js.map
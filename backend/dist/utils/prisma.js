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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeWithRetry = exports.prisma = void 0;
const client_1 = require("@prisma/client");
const library_1 = require("@prisma/client/runtime/library");
// Singleton-Pattern für Prisma Client
// Verhindert mehrere Instanzen in Development (Hot Reload)
const globalForPrisma = globalThis;
// ✅ PERFORMANCE: Prisma Client mit reconnect-Logik
const createPrismaClient = () => {
    // TEMPORÄR: Query-Logging aktivieren für Performance-Analyse
    const enableQueryLogging = process.env.ENABLE_QUERY_LOGGING === 'true' || process.env.NODE_ENV === 'development';
    const client = new client_1.PrismaClient({
        log: enableQueryLogging ? ['query', 'error', 'warn'] : ['error'],
    });
    // ✅ Reconnect-Logik: Bei DB-Verbindungsfehlern reconnect versuchen
    const originalQuery = client.$connect;
    // Prisma reconnect bei geschlossenen Verbindungen
    client.$connect().catch((error) => {
        console.error('[Prisma] Initial connection error:', error);
    });
    return client;
};
exports.prisma = (_a = globalForPrisma.prisma) !== null && _a !== void 0 ? _a : createPrismaClient();
if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = exports.prisma;
}
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
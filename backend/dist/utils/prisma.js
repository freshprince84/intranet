"use strict";
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
    const client = new client_1.PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
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
// ✅ Helper-Funktion für reconnect bei DB-Fehlern
const executeWithRetry = (operation_1, ...args_1) => __awaiter(void 0, [operation_1, ...args_1], void 0, function* (operation, maxRetries = 3, retryDelay = 1000) {
    let lastError = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return yield operation();
        }
        catch (error) {
            lastError = error;
            // Prüfe ob es ein DB-Verbindungsfehler ist
            if (error instanceof library_1.PrismaClientKnownRequestError &&
                (error.code === 'P1001' || // Can't reach database server
                    error.code === 'P1008' || // Operations timed out
                    error.message.includes('Server has closed the connection') ||
                    error.message.includes("Can't reach database server"))) {
                console.warn(`[Prisma] DB connection error (attempt ${attempt}/${maxRetries}):`, error.message);
                if (attempt < maxRetries) {
                    // Versuche reconnect
                    try {
                        yield exports.prisma.$disconnect();
                        yield new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
                        yield exports.prisma.$connect();
                        console.log(`[Prisma] Reconnected after ${attempt} attempt(s)`);
                    }
                    catch (reconnectError) {
                        console.error('[Prisma] Reconnect failed:', reconnectError);
                    }
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
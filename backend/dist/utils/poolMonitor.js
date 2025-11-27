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
Object.defineProperty(exports, "__esModule", { value: true });
exports.monitorConnectionPool = monitorConnectionPool;
exports.getConnectionPoolStatus = getConnectionPoolStatus;
const prisma_1 = require("./prisma");
/**
 * ✅ MONITORING: Connection Pool-Nutzung überwachen
 *
 * Prüft die aktuelle Anzahl der aktiven PostgreSQL-Verbindungen
 * und gibt Warnung aus, wenn Pool zu voll ist.
 */
function monitorConnectionPool() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        try {
            // Prüfe aktive Verbindungen direkt in PostgreSQL
            const result = yield prisma_1.prisma.$queryRaw `
      SELECT count(*) as count 
      FROM pg_stat_activity 
      WHERE datname = current_database()
      AND state != 'idle'
    `;
            const activeConnections = Number(((_a = result[0]) === null || _a === void 0 ? void 0 : _a.count) || 0);
            // Prüfe max_connections
            const maxConnectionsResult = yield prisma_1.prisma.$queryRaw `
      SHOW max_connections
    `;
            const maxConnections = parseInt(((_b = maxConnectionsResult[0]) === null || _b === void 0 ? void 0 : _b.max_connections) || '100', 10);
            // Berechne Auslastung
            const utilizationPercent = (activeConnections / maxConnections) * 100;
            // Warnung wenn Pool zu voll (> 80%)
            if (utilizationPercent > 80) {
                console.warn(`[PoolMonitor] ⚠️ Connection Pool hoch ausgelastet: ${activeConnections}/${maxConnections} (${utilizationPercent.toFixed(1)}%)`);
            }
            else if (utilizationPercent > 50) {
                console.log(`[PoolMonitor] ℹ️ Connection Pool: ${activeConnections}/${maxConnections} (${utilizationPercent.toFixed(1)}%)`);
            }
        }
        catch (error) {
            // Fehler beim Monitoring nicht kritisch - nur loggen
            console.error('[PoolMonitor] Fehler beim Überwachen des Connection Pools:', error);
        }
    });
}
/**
 * ✅ MONITORING: Connection Pool-Status abrufen
 *
 * Gibt aktuelle Pool-Statistiken zurück (für API-Endpoint)
 */
function getConnectionPoolStatus() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        try {
            const result = yield prisma_1.prisma.$queryRaw `
      SELECT count(*) as count 
      FROM pg_stat_activity 
      WHERE datname = current_database()
      AND state != 'idle'
    `;
            const activeConnections = Number(((_a = result[0]) === null || _a === void 0 ? void 0 : _a.count) || 0);
            const maxConnectionsResult = yield prisma_1.prisma.$queryRaw `
      SHOW max_connections
    `;
            const maxConnections = parseInt(((_b = maxConnectionsResult[0]) === null || _b === void 0 ? void 0 : _b.max_connections) || '100', 10);
            const utilizationPercent = (activeConnections / maxConnections) * 100;
            let status = 'ok';
            if (utilizationPercent > 90) {
                status = 'critical';
            }
            else if (utilizationPercent > 80) {
                status = 'warning';
            }
            return {
                activeConnections,
                maxConnections,
                utilizationPercent: Math.round(utilizationPercent * 10) / 10,
                status
            };
        }
        catch (error) {
            console.error('[PoolMonitor] Fehler beim Abrufen des Pool-Status:', error);
            return {
                activeConnections: 0,
                maxConnections: 0,
                utilizationPercent: 0,
                status: 'ok'
            };
        }
    });
}
//# sourceMappingURL=poolMonitor.js.map
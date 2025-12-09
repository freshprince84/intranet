import { prisma } from './prisma';
import { logger } from './logger';

/**
 * ✅ MONITORING: Connection Pool-Nutzung überwachen
 * 
 * Prüft die aktuelle Anzahl der aktiven PostgreSQL-Verbindungen
 * und gibt Warnung aus, wenn Pool zu voll ist.
 */
export async function monitorConnectionPool(): Promise<void> {
  try {
    // Prüfe aktive Verbindungen direkt in PostgreSQL
    const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*) as count 
      FROM pg_stat_activity 
      WHERE datname = current_database()
      AND state != 'idle'
    `;
    
    const activeConnections = Number(result[0]?.count || 0);
    
    // Prüfe max_connections
    const maxConnectionsResult = await prisma.$queryRaw<Array<{ max_connections: string }>>`
      SHOW max_connections
    `;
    const maxConnections = parseInt(maxConnectionsResult[0]?.max_connections || '100', 10);
    
    // Berechne Auslastung
    const utilizationPercent = (activeConnections / maxConnections) * 100;
    
    // Warnung wenn Pool zu voll (> 80%)
    if (utilizationPercent > 80) {
      logger.warn(`[PoolMonitor] ⚠️ Connection Pool hoch ausgelastet: ${activeConnections}/${maxConnections} (${utilizationPercent.toFixed(1)}%)`);
    } else if (utilizationPercent > 50) {
      logger.log(`[PoolMonitor] ℹ️ Connection Pool: ${activeConnections}/${maxConnections} (${utilizationPercent.toFixed(1)}%)`);
    }
  } catch (error) {
    // Fehler beim Monitoring nicht kritisch - nur loggen
    logger.error('[PoolMonitor] Fehler beim Überwachen des Connection Pools:', error);
  }
}

/**
 * ✅ MONITORING: Connection Pool-Status abrufen
 * 
 * Gibt aktuelle Pool-Statistiken zurück (für API-Endpoint)
 */
export async function getConnectionPoolStatus(): Promise<{
  activeConnections: number;
  maxConnections: number;
  utilizationPercent: number;
  status: 'ok' | 'warning' | 'critical';
}> {
  try {
    const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*) as count 
      FROM pg_stat_activity 
      WHERE datname = current_database()
      AND state != 'idle'
    `;
    
    const activeConnections = Number(result[0]?.count || 0);
    
    const maxConnectionsResult = await prisma.$queryRaw<Array<{ max_connections: string }>>`
      SHOW max_connections
    `;
    const maxConnections = parseInt(maxConnectionsResult[0]?.max_connections || '100', 10);
    
    const utilizationPercent = (activeConnections / maxConnections) * 100;
    
    let status: 'ok' | 'warning' | 'critical' = 'ok';
    if (utilizationPercent > 90) {
      status = 'critical';
    } else if (utilizationPercent > 80) {
      status = 'warning';
    }
    
    return {
      activeConnections,
      maxConnections,
      utilizationPercent: Math.round(utilizationPercent * 10) / 10,
      status
    };
  } catch (error) {
    logger.error('[PoolMonitor] Fehler beim Abrufen des Pool-Status:', error);
    return {
      activeConnections: 0,
      maxConnections: 0,
      utilizationPercent: 0,
      status: 'ok'
    };
  }
}


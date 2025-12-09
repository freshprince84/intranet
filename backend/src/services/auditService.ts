import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

/**
 * Audit-Log Service
 * 
 * Protokolliert alle wichtigen Änderungen für Nachvollziehbarkeit und Compliance
 * 
 * HINWEIS: Aktuell wird Logging in Console gemacht.
 * Später kann ein AuditLog-Model hinzugefügt werden für persistente Speicherung.
 */

export interface AuditLogEntry {
  organizationId: number;
  userId: number;
  action: string;
  entityType: string;
  entityId: number;
  changes: Record<string, { oldValue?: any; newValue?: any }>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Erstellt einen Audit-Log-Eintrag
 * 
 * @param entry - Audit-Log-Daten
 */
export const logAuditEvent = async (entry: AuditLogEntry): Promise<void> => {
  try {
    // Aktuell: Console-Logging
    // Später: In AuditLog-Tabelle speichern
    logger.log('[AUDIT]', JSON.stringify({
      timestamp: new Date().toISOString(),
      organizationId: entry.organizationId,
      userId: entry.userId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      changes: entry.changes,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent
    }, null, 2));

    // TODO: Wenn AuditLog-Model existiert:
    // await prisma.auditLog.create({ data: { ... } });
  } catch (error) {
    logger.error('Error logging audit event:', error);
    // Fehler beim Logging sollten die Hauptoperation nicht blockieren
  }
};

/**
 * Protokolliert Settings-Änderungen
 * 
 * @param organizationId - ID der Organisation
 * @param userId - ID des Users, der die Änderung vorgenommen hat
 * @param oldSettings - Alte Settings
 * @param newSettings - Neue Settings
 * @param ipAddress - IP-Adresse des Requests
 * @param userAgent - User-Agent des Requests
 */
export const logSettingsChange = async (
  organizationId: number,
  userId: number,
  oldSettings: any,
  newSettings: any,
  ipAddress?: string,
  userAgent?: string
): Promise<void> => {
  // Finde geänderte Felder
  const changes: Record<string, { oldValue?: any; newValue?: any }> = {};

  // Prüfe API-Settings-Änderungen
  const apiFields = [
    'lobbyPms.apiKey',
    'lobbyPms.apiUrl',
    'lobbyPms.syncEnabled',
    'doorSystem.clientSecret',
    'doorSystem.clientId',
    'sire.apiKey',
    'sire.apiSecret',
    'sire.enabled',
    'boldPayment.apiKey',
    'boldPayment.environment',
    'whatsapp.apiKey',
    'whatsapp.apiSecret',
    'whatsapp.provider'
  ];

  for (const field of apiFields) {
    const [section, key] = field.split('.');
    const oldValue = oldSettings?.[section]?.[key];
    const newValue = newSettings?.[section]?.[key];

    if (oldValue !== newValue) {
      // Bei Secrets: Nur anzeigen dass geändert wurde, nicht den Wert
      if (key === 'apiKey' || key === 'apiSecret' || key === 'clientSecret' || key === 'smtpPass') {
        changes[field] = {
          oldValue: oldValue ? '***' : undefined,
          newValue: newValue ? '***' : undefined
        };
      } else {
        changes[field] = { oldValue, newValue };
      }
    }
  }

  if (Object.keys(changes).length > 0) {
    await logAuditEvent({
      organizationId,
      userId,
      action: 'settings_update',
      entityType: 'organization',
      entityId: organizationId,
      changes,
      ipAddress,
      userAgent
    });
  }
};



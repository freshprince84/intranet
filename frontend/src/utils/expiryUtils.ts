/**
 * Utility-Funktionen für die Bestimmung des Ablauf-Status von Requests und Todos
 * 
 * Diese Utilities sind wiederverwendbar für alle Tabellen/Komponenten, die dueDate anzeigen.
 */
import React from 'react';

/**
 * Bestimmt den Ablauf-Status eines Items basierend auf dueDate
 */
export type ExpiryStatus = 'none' | 'expired' | 'critical';

/**
 * Konfiguration für Ablauf-Schwellenwerte
 */
export interface ExpiryThresholds {
  criticalHours: number; // Nach wie vielen Stunden wird es kritisch (rot)?
}

/**
 * Standard-Schwellenwerte für verschiedene Item-Typen
 */
export const DEFAULT_EXPIRY_THRESHOLDS: Record<'request' | 'todo', ExpiryThresholds> = {
  request: {
    criticalHours: 24 // Nach 24h wird ein Request kritisch (rot)
  },
  todo: {
    criticalHours: 24 // Nach 24h wird ein Todo kritisch (rot)
  }
};

/**
 * Bestimmt den Typ eines Todos basierend auf Titel und Beschreibung
 * @param title Der Titel des Todos
 * @param description Die Beschreibung des Todos
 * @returns 'hourly' | 'daily' | 'standard'
 */
export function getTodoType(title: string, description?: string | null): 'hourly' | 'daily' | 'standard' {
  const titleLower = title.toLowerCase();
  const descLower = (description || '').toLowerCase();
  
  if (titleLower.includes('stündlich') || descLower.includes('stündlich')) {
    return 'hourly';
  }
  if (titleLower.includes('täglich') || descLower.includes('täglich')) {
    return 'daily';
  }
  return 'standard';
}

/**
 * Schwellenwerte für verschiedene Todo-Typen
 */
const TODO_EXPIRY_THRESHOLDS: Record<string, ExpiryThresholds> = {
  hourly: { criticalHours: 2 },    // Stündliche Todos: nach 2h kritisch
  daily: { criticalHours: 6 },     // Tägliche Todos: nach 6h kritisch
  standard: { criticalHours: 24 }  // Standard: nach 24h kritisch
};

/**
 * Bestimmt den Ablauf-Status eines Items
 * 
 * @param dueDate Das Fälligkeitsdatum (optional)
 * @param type Der Typ des Items ('request' oder 'todo')
 * @param customThresholds Optionale benutzerdefinierte Schwellenwerte
 * @param title Optional: Titel für Todo-Typ-Erkennung
 * @param description Optional: Beschreibung für Todo-Typ-Erkennung
 * @returns 'none' | 'expired' | 'critical'
 */
export function getExpiryStatus(
  dueDate: string | null | undefined,
  type: 'request' | 'todo' = 'request',
  customThresholds?: ExpiryThresholds,
  title?: string,
  description?: string | null
): ExpiryStatus {
  if (!dueDate) {
    return 'none';
  }

  const now = new Date();
  const due = new Date(dueDate);
  const hoursOverdue = (now.getTime() - due.getTime()) / (1000 * 60 * 60);

  // Wenn nicht abgelaufen
  if (hoursOverdue <= 0) {
    return 'none';
  }

  // Bestimme Schwellenwerte
  let thresholds: ExpiryThresholds;
  
  if (customThresholds) {
    thresholds = customThresholds;
  } else if (type === 'todo' && title) {
    // Für Todos: Typ-basierte Schwellenwerte
    const todoType = getTodoType(title, description);
    thresholds = TODO_EXPIRY_THRESHOLDS[todoType];
  } else {
    thresholds = DEFAULT_EXPIRY_THRESHOLDS[type];
  }

  // Wenn über kritischem Schwellenwert
  if (hoursOverdue >= thresholds.criticalHours) {
    return 'critical';
  }

  // Wenn abgelaufen aber noch nicht kritisch
  return 'expired';
}

/**
 * Gibt die CSS-Klassen für die Ablauf-Markierung zurück
 * 
 * @param status Der Ablauf-Status
 * @returns CSS-Klassen für Border und Hintergrund
 */
export function getExpiryColorClasses(status: ExpiryStatus): {
  borderClass: string;
  bgClass: string;
  textClass: string;
  badgeClass: string; // Für Badge-artige Darstellung (z.B. im Header)
} {
  switch (status) {
    case 'expired':
      return {
        borderClass: 'border-orange-500 dark:border-orange-600',
        bgClass: 'bg-orange-50 dark:bg-orange-900/20',
        textClass: 'text-orange-700 dark:text-orange-300',
        badgeClass: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
      };
    case 'critical':
      return {
        borderClass: 'border-red-500 dark:border-red-600',
        bgClass: 'bg-red-50 dark:bg-red-900/20',
        textClass: 'text-red-700 dark:text-red-700',
        badgeClass: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
      };
    default:
      return {
        borderClass: '',
        bgClass: '',
        textClass: '',
        badgeClass: ''
      };
  }
}

/**
 * Gibt die Highlight-Farbe für DataCard zurück
 * 
 * @param status Der Ablauf-Status
 * @returns 'orange' | 'red' | undefined
 */
export function getExpiryHighlightColor(status: ExpiryStatus): 'orange' | 'red' | undefined {
  switch (status) {
    case 'expired':
      return 'orange';
    case 'critical':
      return 'red';
    default:
      return undefined;
  }
}

/**
 * Erstellt ein MetadataItem für dueDate mit automatischer Farbmarkierung bei Ablauf
 * 
 * @param dueDate Das Fälligkeitsdatum
 * @param type Der Typ des Items ('request' oder 'todo')
 * @param title Optional: Titel für Todo-Typ-Erkennung
 * @param description Optional: Beschreibung für Todo-Typ-Erkennung
 * @param icon Das Icon für das Metadaten-Item
 * @param label Das Label für das Metadaten-Item
 * @param formatDate Function zum Formatieren des Datums
 * @returns MetadataItem mit farblich markiertem dueDate
 */
export function createDueDateMetadataItem(
  dueDate: string | null | undefined,
  type: 'request' | 'todo' = 'request',
  title?: string,
  description?: string | null,
  icon?: React.ReactNode,
  label: string = 'Fälligkeit',
  formatDate: (date: Date) => string = (date) => date.toLocaleDateString(),
  useBadge: boolean = false // Für Badge-artige Darstellung im Header
): { icon?: React.ReactNode; label: string; value: string; className?: string } {
  const expiryStatus = getExpiryStatus(dueDate, type, undefined, title, description);
  const expiryColors = getExpiryColorClasses(expiryStatus);
  
  return {
    icon,
    label,
    value: dueDate ? formatDate(new Date(dueDate)) : '-',
    className: expiryStatus !== 'none' 
      ? (useBadge ? expiryColors.badgeClass : expiryColors.textClass)
      : undefined
  };
}


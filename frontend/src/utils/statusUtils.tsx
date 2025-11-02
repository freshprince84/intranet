/**
 * Zentrale Status-Utils zur Eliminierung von Code-Duplikation
 * 
 * Diese Datei konsolidiert Status-Farben und -Texte, die zuvor in mehreren Komponenten
 * dupliziert waren (Requests.tsx, Worktracker.tsx, TodoAnalyticsTab.tsx, etc.)
 * 
 * WICHTIG: Die Logik ist exakt identisch mit der vorherigen Implementierung.
 * Nur die Code-Duplikation wurde entfernt, keine Funktionalitätsänderung!
 */

import React from 'react';

/**
 * Gibt die CSS-Klasse für einen Status zurück
 * @param status - Der Status-String
 * @param processType - Optional: 'task' oder 'request' für spezifische Status
 * @returns CSS-Klassen-String für den Status
 */
export const getStatusColor = (status: string, processType?: 'task' | 'request' | 'invoice'): string => {
  // Task Status-Farben (exakt wie in Worktracker.tsx vorher)
  if (processType === 'task') {
    switch(status) {
      case 'open':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'improval':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'quality_control':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'done':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  }
  
  // Request Status-Farben
  if (processType === 'request') {
    switch(status) {
      case 'approval':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'to_improve':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'denied':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  }
  
  // Invoice Status-Farben
  if (processType === 'invoice') {
    switch(status) {
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'SENT':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'PAID':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'OVERDUE':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'CANCELLED':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  }
  
  // Fallback für unbekannte Status
  return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
};

/**
 * Übersetzungs-Funktion Typ (z.B. react-i18next's t() Funktion)
 */
export type TranslationFunction = (key: string) => string;

/**
 * Gibt den übersetzten Status-Text zurück
 * @param status - Der Status-String
 * @param processType - Optional: 'task' oder 'request' für spezifische Status
 * @param t - Optional: Übersetzungsfunktion (z.B. von react-i18next)
 * @returns Übersetzter Status-Text
 */
export const getStatusText = (
  status: string, 
  processType?: 'task' | 'request' | 'invoice',
  t?: TranslationFunction
): string => {
  // Wenn Übersetzungsfunktion vorhanden, verwende diese
  if (t) {
    if (processType === 'task') {
      const translationKey = `tasks.status.${status}`;
      const translated = t(translationKey);
      // Falls Übersetzung gefunden (nicht gleich key), verwende diese
      if (translated !== translationKey) {
        return translated;
      }
    }
    if (processType === 'request') {
      const translationKey = `requests.status.${status}`;
      const translated = t(translationKey);
      // Falls Übersetzung gefunden (nicht gleich key), verwende diese
      if (translated !== translationKey) {
        return translated;
      }
    }
    if (processType === 'invoice') {
      const translationKey = `invoices.status.${status.toLowerCase()}`;
      const translated = t(translationKey);
      if (translated !== translationKey) {
        return translated;
      }
    }
  }
  
  // Tasks (hardcoded - keine Übersetzungen in Code gefunden)
  if (processType === 'task') {
    switch(status) {
      case 'open': return 'Offen';
      case 'in_progress': return 'In Bearbeitung';
      case 'improval': return 'Nachbesserung';
      case 'quality_control': return 'Qualitätskontrolle';
      case 'done': return 'Erledigt';
      default: return status;
    }
  }
  
  // Requests (Fallback wenn keine Übersetzung)
  if (processType === 'request') {
    switch(status) {
      case 'approval': return 'Offen';
      case 'approved': return 'Genehmigt';
      case 'to_improve': return 'Nachbesserung';
      case 'denied': return 'Abgelehnt';
      default: return status;
    }
  }
  
  // Invoices (Fallback wenn keine Übersetzung)
  if (processType === 'invoice') {
    switch(status) {
      case 'DRAFT': return 'Entwurf';
      case 'SENT': return 'Gesendet';
      case 'PAID': return 'Bezahlt';
      case 'OVERDUE': return 'Überfällig';
      case 'CANCELLED': return 'Storniert';
      default: return status;
    }
  }
  
  // Default: Return capitalized status
  return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
};

/**
 * React-Komponente für Status-Badge
 * @param status - Der Status-String
 * @param processType - Optional: 'task', 'request' oder 'invoice' für spezifische Status
 * @param t - Optional: Übersetzungsfunktion (z.B. von react-i18next)
 * @returns JSX-Element für Status-Badge
 */
export const StatusBadge: React.FC<{ 
  status: string, 
  processType?: 'task' | 'request' | 'invoice',
  t?: TranslationFunction 
}> = ({ status, processType, t }) => {
  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(status, processType)} status-col`}>
      {getStatusText(status, processType, t)}
    </span>
  );
};


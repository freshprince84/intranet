import { useState, useEffect, useCallback } from 'react';
import { tableSettingsApi, TableSettings } from '../api/tableSettingsApi.ts';

interface UseTableSettingsOptions {
  defaultColumnOrder?: string[];
  defaultHiddenColumns?: string[];
}

/**
 * Hook zum Verwalten von benutzerdefinierten Tabelleneinstellungen
 * @param tableId Eindeutige ID der Tabelle
 * @param options Optionale Standardwerte
 */
export const useTableSettings = (tableId: string, options?: UseTableSettingsOptions) => {
  const [settings, setSettings] = useState<TableSettings>({
    tableId,
    columnOrder: options?.defaultColumnOrder || [],
    hiddenColumns: options?.defaultHiddenColumns || []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Tabelleneinstellungen laden
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const loadedSettings = await tableSettingsApi.getTableSettings(tableId);
        
        // Wenn leere Einstellungen zurückgegeben werden, verwende die Standardwerte
        if (loadedSettings.columnOrder.length === 0 && options?.defaultColumnOrder) {
          loadedSettings.columnOrder = options.defaultColumnOrder;
        }
        
        setSettings(loadedSettings);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Fehler beim Laden der Einstellungen'));
        console.error('Fehler beim Laden der Tabelleneinstellungen:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [tableId, options?.defaultColumnOrder]);

  // Spaltenreihenfolge aktualisieren
  const updateColumnOrder = useCallback(async (newColumnOrder: string[]) => {
    try {
      const updatedSettings = { ...settings, columnOrder: newColumnOrder };
      setSettings(updatedSettings);
      await tableSettingsApi.saveTableSettings(updatedSettings);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Speichern der Spaltenreihenfolge'));
      console.error('Fehler beim Speichern der Spaltenreihenfolge:', err);
    }
  }, [settings]);

  // Versteckte Spalten aktualisieren
  const updateHiddenColumns = useCallback(async (newHiddenColumns: string[]) => {
    try {
      const updatedSettings = { ...settings, hiddenColumns: newHiddenColumns };
      setSettings(updatedSettings);
      await tableSettingsApi.saveTableSettings(updatedSettings);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Speichern der versteckten Spalten'));
      console.error('Fehler beim Speichern der versteckten Spalten:', err);
    }
  }, [settings]);

  // Eine einzelne Spalte ein- oder ausblenden
  const toggleColumnVisibility = useCallback(async (columnId: string) => {
    try {
      let newHiddenColumns: string[];
      
      if (settings.hiddenColumns.includes(columnId)) {
        // Spalte einblenden (aus hiddenColumns entfernen)
        newHiddenColumns = settings.hiddenColumns.filter(id => id !== columnId);
      } else {
        // Spalte ausblenden (zu hiddenColumns hinzufügen)
        newHiddenColumns = [...settings.hiddenColumns, columnId];
      }
      
      const updatedSettings = { ...settings, hiddenColumns: newHiddenColumns };
      setSettings(updatedSettings);
      await tableSettingsApi.saveTableSettings(updatedSettings);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Ändern der Spaltenansicht'));
      console.error('Fehler beim Ändern der Spaltenansicht:', err);
    }
  }, [settings]);

  return {
    settings,
    isLoading,
    error,
    updateColumnOrder,
    updateHiddenColumns,
    toggleColumnVisibility,
    isColumnVisible: (columnId: string) => !settings.hiddenColumns.includes(columnId)
  };
}; 
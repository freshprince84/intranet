import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, TrashIcon, CheckIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { format, parse } from 'date-fns';

// Hilfsfunktion für lokale Datumsberechnungen
import { createLocalDate } from '../../utils/dateUtils.ts';
import { useSidepane } from '../../contexts/SidepaneContext.tsx';

interface WorktimeEntry {
  id: number;
  startTime: string;
  endTime: string | null;
  userId: number;
  branch: {
    id: number;
    name: string;
  };
}

interface EditableEntry extends WorktimeEntry {
  date: string;
  startTimeTime: string;
  endTimeTime: string | null;
  startDateTime: string; // datetime-local format: YYYY-MM-DDTHH:mm
  endDateTime: string | null; // datetime-local format: YYYY-MM-DDTHH:mm
  isDeleted?: boolean;
  isModified?: boolean;
}

interface EditWorktimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entries: EditableEntry[]) => Promise<void>;
  userName: string;
  entries: WorktimeEntry[];
  selectedDate: string;
}

const EditWorktimeModal: React.FC<EditWorktimeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  userName,
  entries,
  selectedDate
}) => {
  const { t } = useTranslation();
  const { openSidepane, closeSidepane } = useSidepane();
  const [editedEntries, setEditedEntries] = useState<EditableEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth > 1070);
  
  // Responsive Erkennung
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
      setIsLargeScreen(window.innerWidth > 1070);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Sidepane-Status verwalten
  useEffect(() => {
    if (isOpen) {
      openSidepane();
    } else {
      closeSidepane();
    }
    
    return () => {
      closeSidepane();
    };
  }, [isOpen, openSidepane, closeSidepane]);

  // Initialisiere die bearbeitbaren Einträge, wenn sich die Props ändern
  useEffect(() => {
    if (entries && entries.length > 0) {
      // Konvertiere Einträge in das bearbeitbare Format
      const formattedEntries = entries.map(entry => {
        // Extrahiere direkt die Datums- und Zeitteile aus den ISO-Strings ohne Date-Objekte zu erstellen
        const datePart = entry.startTime.split('T')[0]; // YYYY-MM-DD
        const startTimePart = entry.startTime.split('T')[1].substring(0, 8); // HH:MM:SS
        const endTimePart = entry.endTime ? entry.endTime.split('T')[1].substring(0, 8) : null; // HH:MM:SS oder null
        
        // Erstelle datetime-local Format (YYYY-MM-DDTHH:mm)
        const startDateTime = `${datePart}T${startTimePart.substring(0, 5)}`; // YYYY-MM-DDTHH:mm
        const endDateTime = endTimePart ? `${entry.endTime.split('T')[0]}T${endTimePart.substring(0, 5)}` : null;
        
        return {
          ...entry,
          date: datePart,
          startTimeTime: startTimePart,
          endTimeTime: endTimePart,
          startDateTime: startDateTime,
          endDateTime: endDateTime,
          isDeleted: false,
          isModified: false
        };
      });
      
      setEditedEntries(formattedEntries);
    } else {
      setEditedEntries([]);
    }
  }, [entries]);
  
  // Handler für Änderungen an der Startzeit (datetime-local)
  const handleStartDateTimeChange = (index: number, value: string) => {
    const newEntries = [...editedEntries];
    if (newEntries[index].startDateTime !== value) {
      // Extrahiere Datum und Zeit aus datetime-local Format
      const [datePart, timePart] = value.split('T');
      const timeWithSeconds = timePart ? `${timePart}:00` : '00:00:00';
      
      newEntries[index].date = datePart;
      newEntries[index].startDateTime = value;
      newEntries[index].startTimeTime = timeWithSeconds;
      newEntries[index].isModified = true;
      setEditedEntries(newEntries);
      validateEntries(newEntries);
    }
  };
  
  // Handler für Änderungen an der Endzeit (datetime-local)
  const handleEndDateTimeChange = (index: number, value: string | null) => {
    const newEntries = [...editedEntries];
    if (newEntries[index].endDateTime !== value) {
      if (value) {
        // Extrahiere Datum und Zeit aus datetime-local Format
        const [datePart, timePart] = value.split('T');
        const timeWithSeconds = timePart ? `${timePart}:00` : '00:00:00';
        
        newEntries[index].endDateTime = value;
        newEntries[index].endTimeTime = timeWithSeconds;
      } else {
        newEntries[index].endDateTime = null;
        newEntries[index].endTimeTime = null;
      }
      newEntries[index].isModified = true;
      setEditedEntries(newEntries);
      validateEntries(newEntries);
    }
  };

  // Handler für das Markieren eines Eintrags zum Löschen
  const handleToggleDelete = (index: number) => {
    const newEntries = [...editedEntries];
    newEntries[index].isDeleted = !newEntries[index].isDeleted;
    newEntries[index].isModified = true;
    setEditedEntries(newEntries);
  };
  
  // Validierung der Einträge
  const validateEntries = (entriesToValidate: EditableEntry[]) => {
    // Filtere alle Einträge, die nicht zum Löschen markiert sind
    const activeEntries = entriesToValidate.filter(entry => !entry.isDeleted);
    
    // Prüfe, ob es überlappende Zeiträume gibt
    for (let i = 0; i < activeEntries.length; i++) {
      const entry1 = activeEntries[i];
      
      // Verwende datetime-local Format für Vergleich (YYYY-MM-DDTHH:mm)
      const start1 = entry1.startDateTime;
      const end1 = entry1.endDateTime;
      
      // Prüfe, ob Endzeit nach Startzeit liegt
      if (end1 && start1 >= end1) {
        setError(`Eintrag ${i+1}: Die Endzeit muss nach der Startzeit liegen.`);
        return false;
      }
      
      // Prüfe auf Überlappungen mit anderen Einträgen
      for (let j = i + 1; j < activeEntries.length; j++) {
        const entry2 = activeEntries[j];
        
        const start2 = entry2.startDateTime;
        const end2 = entry2.endDateTime;
        
        // Überlappung prüfen: Vergleiche datetime-local Strings
        if (
          (end1 && end2 && start1 < end2 && end1 > start2) ||
          (end1 && !end2 && end1 > start2) ||
          (end2 && !end1 && end2 > start1)
        ) {
          setError(`Es gibt eine Überlappung zwischen Eintrag ${i+1} und Eintrag ${j+1}.`);
          return false;
        }
      }
    }
    
    setError(null);
    return true;
  };
  
  // Speichern der Änderungen
  const handleSave = async () => {
    // Validiere noch einmal vor dem Speichern
    if (!validateEntries(editedEntries)) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Filtere nur die tatsächlich geänderten oder gelöschten Einträge
      const modifiedEntries = editedEntries.filter(entry => entry.isModified || entry.isDeleted);
      
      // Konvertiere bearbeitete Einträge zurück in das API-Format
      // Achtung: Da im Backend new Date() verwendet wird, was zu einer Zeitzonenkonvertierung führt,
      // sollten wir hier mit den lokalen ISO-Strings ohne Zeitzone arbeiten
      const updatedEntries = modifiedEntries.map(entry => {
        // Erstelle direkte ISO-Strings ohne Zeitzone aus datetime-local Format
        const startTimeStr = entry.startDateTime ? `${entry.startDateTime}:00` : `${entry.date}T${entry.startTimeTime}`;
        const endTimeStr = entry.endDateTime ? `${entry.endDateTime}:00` : (entry.endTimeTime ? `${entry.date}T${entry.endTimeTime}` : null);
        
        return {
          ...entry,
          startTime: startTimeStr,
          endTime: endTimeStr
        };
      });
      
      // Nur wenn es Änderungen gibt, senden wir diese an das Backend
      if (updatedEntries.length > 0) {
        await onSave(updatedEntries);
      }
      
      onClose();
    } catch (error) {
      console.error('Fehler beim Speichern der Zeiterfassungen:', error);
      setError(t('teamWorktime.modal.editWorktimes.saveError'));
    } finally {
      setLoading(false);
    }
  };
  
  // Render-Funktion für den Formularinhalt
  const renderForm = () => (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('teamWorktime.modal.editWorktimes.description', { 
            userName, 
            date: selectedDate.split('-').reverse().join('.') 
          })}
        </p>
      </div>

      {error && (
        <div className="p-2 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 rounded">
          {error}
        </div>
      )}

      <div>
        <div className="overflow-hidden border dark:border-gray-700 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('teamWorktime.modal.editWorktimes.columns.number')}</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('teamWorktime.modal.editWorktimes.columns.startTime')}</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('teamWorktime.modal.editWorktimes.columns.endTime')}</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {editedEntries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    {t('teamWorktime.modal.editWorktimes.noEntries')}
                  </td>
                </tr>
              ) : (
                editedEntries.map((entry, index) => (
                  <tr key={entry.id} className={entry.isDeleted ? 'bg-red-50 dark:bg-red-900' : ''}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="datetime-local"
                        className={`w-full px-3 py-2 border ${entry.isDeleted ? 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                        value={entry.startDateTime}
                        onChange={(e) => handleStartDateTimeChange(index, e.target.value)}
                        disabled={entry.isDeleted}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="datetime-local"
                        className={`w-full px-3 py-2 border ${entry.isDeleted ? 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                        value={entry.endDateTime || ''}
                        onChange={(e) => handleEndDateTimeChange(index, e.target.value || null)}
                        disabled={entry.isDeleted}
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        type="button"
                        onClick={() => handleToggleDelete(index)}
                        className={`p-1 rounded ${entry.isDeleted ? 'text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300' : 'text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300'}`}
                        title={entry.isDeleted ? t('teamWorktime.modal.editWorktimes.restore') : t('teamWorktime.modal.editWorktimes.markForDelete')}
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t dark:border-gray-700">
        <button
          type="button"
          className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={onClose}
          disabled={loading}
          title={t('common.cancel')}
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
        <button
          type="button"
          className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleSave}
          disabled={loading || Boolean(error)}
          title={loading ? t('common.saving') : t('common.save')}
        >
          {loading ? (
            <ArrowPathIcon className="h-5 w-5 animate-spin" />
          ) : (
            <CheckIcon className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );

  // Für Mobile (unter 640px) - klassisches Modal
  if (isMobile) {
    return (
      <Dialog open={isOpen} onClose={onClose} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <Dialog.Title className="text-lg font-semibold dark:text-white">
                {t('teamWorktime.modal.editWorktimes.title')}
              </Dialog.Title>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-4">
              {renderForm()}
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    );
  }

  // Für Desktop (ab 640px) - Sidepane
  // WICHTIG: Sidepane muss IMMER gerendert bleiben für Transition
  return (
    <>
      {/* Backdrop - nur wenn offen und <= 1070px */}
      {isOpen && !isLargeScreen && (
        <div 
          className="fixed inset-0 bg-black/10 transition-opacity sidepane-overlay sidepane-backdrop z-40" 
          aria-hidden="true" 
          onClick={onClose}
          style={{
            opacity: isOpen ? 1 : 0,
            transition: 'opacity 300ms ease-out'
          }}
        />
      )}
      
      {/* Sidepane - IMMER gerendert, Position wird via Transform geändert */}
      <div 
        className={`fixed top-16 bottom-0 right-0 max-w-sm w-full bg-white dark:bg-gray-800 shadow-xl sidepane-panel sidepane-panel-container transform z-50 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{
          transition: 'transform 350ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          pointerEvents: isOpen ? 'auto' : 'none'
        }}
        aria-hidden={!isOpen}
        role="dialog"
        aria-modal={isOpen}
      >
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 flex-shrink-0">
          <h2 className="text-lg font-semibold dark:text-white">
            {t('teamWorktime.modal.editWorktimes.title')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 min-h-0">
          {renderForm()}
        </div>
      </div>
    </>
  );
};

export default EditWorktimeModal; 
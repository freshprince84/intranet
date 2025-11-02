import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { XMarkIcon, TrashIcon, CheckIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { format, parse } from 'date-fns';

// Hilfsfunktion für lokale Datumsberechnungen
import { createLocalDate } from '../../utils/dateUtils.ts';

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
  const [editedEntries, setEditedEntries] = useState<EditableEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Initialisiere die bearbeitbaren Einträge, wenn sich die Props ändern
  useEffect(() => {
    if (entries && entries.length > 0) {
      // Konvertiere Einträge in das bearbeitbare Format
      const formattedEntries = entries.map(entry => {
        // Extrahiere direkt die Datums- und Zeitteile aus den ISO-Strings ohne Date-Objekte zu erstellen
        const datePart = entry.startTime.split('T')[0]; // YYYY-MM-DD
        const startTimePart = entry.startTime.split('T')[1].substring(0, 8); // HH:MM:SS
        const endTimePart = entry.endTime ? entry.endTime.split('T')[1].substring(0, 8) : null; // HH:MM:SS oder null
        
        return {
          ...entry,
          date: datePart,
          startTimeTime: startTimePart,
          endTimeTime: endTimePart,
          isDeleted: false,
          isModified: false
        };
      });
      
      setEditedEntries(formattedEntries);
    } else {
      setEditedEntries([]);
    }
  }, [entries]);
  
  // Handler für Änderungen an der Startzeit
  const handleStartTimeChange = (index: number, value: string) => {
    const newEntries = [...editedEntries];
    if (newEntries[index].startTimeTime !== value) {
      newEntries[index].startTimeTime = value;
      newEntries[index].isModified = true;
      setEditedEntries(newEntries);
      validateEntries(newEntries);
    }
  };
  
  // Handler für Änderungen an der Endzeit
  const handleEndTimeChange = (index: number, value: string | null) => {
    const newEntries = [...editedEntries];
    if (newEntries[index].endTimeTime !== value) {
      newEntries[index].endTimeTime = value;
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
      
      // Bei Zeitstrings können wir direkt vergleichen, da das Format immer gleich ist (HH:MM:SS)
      const start1 = entry1.startTimeTime;
      const end1 = entry1.endTimeTime;
      
      // Prüfe, ob Endzeit nach Startzeit liegt
      if (end1 && start1 >= end1) {
        setError(`Eintrag ${i+1}: Die Endzeit muss nach der Startzeit liegen.`);
        return false;
      }
      
      // Prüfe auf Überlappungen mit anderen Einträgen
      for (let j = i + 1; j < activeEntries.length; j++) {
        const entry2 = activeEntries[j];
        
        const start2 = entry2.startTimeTime;
        const end2 = entry2.endTimeTime;
        
        // Überlappung prüfen: Wir können direkt die Zeitstrings vergleichen
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
        // Erstelle direkte ISO-Strings ohne Zeitzone
        const startTimeStr = `${entry.date}T${entry.startTimeTime}`;
        const endTimeStr = entry.endTimeTime ? `${entry.date}T${entry.endTimeTime}` : null;
        
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
      setError('Beim Speichern der Zeiterfassungen ist ein Fehler aufgetreten.');
    } finally {
      setLoading(false);
    }
  };
  
  // Formatierungshilfe für bessere Lesbarkeit der Zeiten
  const formatTimeForDisplay = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    return `${hours}:${minutes}`;
  };
  
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex justify-between items-start">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 dark:text-white"
                  >
                    Zeiterfassungen bearbeiten
                  </Dialog.Title>
                  <button
                    type="button"
                    className="bg-white dark:bg-gray-800 rounded-md text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onClick={onClose}
                  >
                    <span className="sr-only">Schließen</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                <div className="mt-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Bearbeiten Sie die Zeiterfassungen von <strong className="dark:text-gray-300">{userName}</strong> für den <strong className="dark:text-gray-300">{selectedDate.split('-').reverse().join('.')}</strong>.
                  </p>
                </div>

                {error && (
                  <div className="mt-2 p-2 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 rounded">
                    {error}
                  </div>
                )}

                <div className="mt-4">
                  <div className="overflow-hidden border dark:border-gray-700 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nr.</th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Startzeit</th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Endzeit</th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Aktion</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {editedEntries.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                              Keine Zeiterfassungen für diesen Tag vorhanden.
                            </td>
                          </tr>
                        ) : (
                          editedEntries.map((entry, index) => (
                            <tr key={entry.id} className={entry.isDeleted ? 'bg-red-50 dark:bg-red-900' : ''}>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {index + 1}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap">
                                <input
                                  type="time"
                                  step="1"
                                  className={`rounded-md border ${entry.isDeleted ? 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900' : 'border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white'} shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm`}
                                  value={entry.startTimeTime.substring(0, 5)}
                                  onChange={(e) => handleStartTimeChange(index, e.target.value + ':00')}
                                  disabled={entry.isDeleted}
                                />
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap">
                                <input
                                  type="time"
                                  step="1"
                                  className={`rounded-md border ${entry.isDeleted ? 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900' : 'border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white'} shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm`}
                                  value={entry.endTimeTime ? entry.endTimeTime.substring(0, 5) : ''}
                                  onChange={(e) => {
                                    const value = e.target.value ? e.target.value + ':00' : null;
                                    handleEndTimeChange(index, value);
                                  }}
                                  disabled={entry.isDeleted}
                                />
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                                <button
                                  type="button"
                                  onClick={() => handleToggleDelete(index)}
                                  className={`p-1 rounded ${entry.isDeleted ? 'text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300' : 'text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300'}`}
                                  title={entry.isDeleted ? 'Wiederherstellen' : 'Zum Löschen markieren'}
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

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={onClose}
                    disabled={loading}
                    title="Abbrechen"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleSave}
                    disabled={loading || Boolean(error)}
                    title={loading ? 'Wird gespeichert...' : 'Speichern'}
                  >
                    {loading ? (
                      <ArrowPathIcon className="h-5 w-5 animate-spin" />
                    ) : (
                      <CheckIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default EditWorktimeModal; 
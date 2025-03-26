import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

interface StopWorktimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (endTime: string) => Promise<void>;
  userName: string;
}

const StopWorktimeModal: React.FC<StopWorktimeModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  userName
}) => {
  // Aktuelles Datum und Zeit als Standardwert
  const now = new Date();
  const formattedDate = format(now, 'yyyy-MM-dd');
  const formattedTime = format(now, 'HH:mm:ss');
  
  // State für Datum und Zeit
  const [date, setDate] = useState(formattedDate);
  const [time, setTime] = useState(formattedTime);
  const [loading, setLoading] = useState(false);
  
  // Bestätige das Stoppen der Zeiterfassung
  const handleConfirm = async () => {
    try {
      setLoading(true);
      
      // Kombiniere Datum und Zeit zu einem ISO-String ohne 'Z' am Ende,
      // um zu verhindern, dass JavaScript den Zeitstempel als UTC interpretiert
      const endTime = `${date}T${time}`;
      
      await onConfirm(endTime);
    } catch (error) {
      console.error('Fehler beim Stoppen der Zeiterfassung:', error);
    } finally {
      setLoading(false);
    }
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex justify-between items-start">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 dark:text-white"
                  >
                    Zeiterfassung stoppen
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
                    Sie sind dabei, die Zeiterfassung von <strong className="dark:text-gray-300">{userName}</strong> zu stoppen.
                    Bitte geben Sie die Endzeit an.
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Datum
                    </label>
                    <input
                      type="date"
                      id="date"
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="time" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Zeit
                    </label>
                    <input
                      type="time"
                      id="time"
                      step="1"
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    onClick={onClose}
                    disabled={loading}
                  >
                    Abbrechen
                  </button>
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    onClick={handleConfirm}
                    disabled={loading}
                  >
                    {loading ? 'Wird gestoppt...' : 'Zeiterfassung stoppen'}
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

export default StopWorktimeModal; 
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { API_ENDPOINTS } from '../config/api.ts';
import axiosInstance from '../config/axios.ts';
import { toast } from 'react-toastify';

interface Task {
  id: number;
  title: string;
  status: string;
  responsible?: {
    firstName: string;
    lastName: string;
  };
}

interface LinkTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultationId: number;
  onTaskLinked: () => void;
}

const LinkTaskModal: React.FC<LinkTaskModalProps> = ({
  isOpen,
  onClose,
  consultationId,
  onTaskLinked
}) => {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadTasks();
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = tasks.filter(task => 
        task.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredTasks(filtered);
    } else {
      setFilteredTasks(tasks);
    }
  }, [searchTerm, tasks]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(API_ENDPOINTS.TASKS.BASE);
      // Filtere nur offene und in Bearbeitung befindliche Tasks
      const activeTasks = response.data.filter((task: Task) => 
        task.status === 'open' || task.status === 'in_progress'
      );
      setTasks(activeTasks);
      setFilteredTasks(activeTasks);
    } catch (error) {
      toast.error(t('consultations.linkTask.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleLinkTask = async () => {
    if (!selectedTaskId) {
      toast.error(t('consultations.linkTask.selectTask'));
      return;
    }

    try {
      await axiosInstance.post(
        API_ENDPOINTS.CONSULTATIONS.LINK_TASK(consultationId),
        { taskId: selectedTaskId }
      );
      
      toast.success(t('consultations.linkTask.success'));
      onTaskLinked();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('consultations.linkTask.error'));
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-2xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white">
                {t('consultations.linkTask.title')}
              </Dialog.Title>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Suchfeld */}
            <div className="relative mb-4">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder={t('consultations.linkTask.searchPlaceholder')}
                autoFocus
              />
            </div>

            {/* Task-Liste */}
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  {t('common.loading')}
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  {t('consultations.linkTask.noTasksFound')}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTasks.map((task) => (
                    <label
                      key={task.id}
                      className="flex items-center p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="task"
                        value={task.id}
                        checked={selectedTaskId === task.id}
                        onChange={() => setSelectedTaskId(task.id)}
                        className="mr-3"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {task.title}
                        </p>
                        {task.responsible && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t('tasks.columns.responsible')}: {task.responsible.firstName} {task.responsible.lastName}
                          </p>
                        )}
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        task.status === 'open' 
                          ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                      }`}>
                        {task.status === 'open' ? t('tasks.status.open') : t('tasks.status.in_progress')}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="mt-6 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleLinkTask}
                disabled={!selectedTaskId}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('consultations.linkTask.link')}
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default LinkTaskModal; 
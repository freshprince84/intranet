import React, { useState, useEffect, useMemo } from 'react';
import { 
  PencilIcon, 
  ClockIcon, 
  UserIcon,
  BuildingOfficeIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowsUpDownIcon,
  XMarkIcon,
  LinkIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { API_ENDPOINTS } from '../config/api.ts';
import axiosInstance from '../config/axios.ts';
import { formatTime, calculateDuration } from '../utils/dateUtils.ts';
import { Consultation } from '../types/client.ts';
import { usePermissions } from '../hooks/usePermissions.ts';
import { toast } from 'react-toastify';
import LinkTaskModal from './LinkTaskModal.tsx';

interface SortConfig {
  key: keyof Consultation | 'client.name' | 'duration';
  direction: 'asc' | 'desc';
}

const ConsultationList: React.FC = () => {
  const { hasPermission } = usePermissions();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ 
    key: 'startTime', 
    direction: 'desc' 
  });
  
  // Editing States
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);

  // Task Linking States
  const [isLinkTaskModalOpen, setIsLinkTaskModalOpen] = useState(false);
  const [selectedConsultationId, setSelectedConsultationId] = useState<number | null>(null);

  useEffect(() => {
    loadConsultations();
  }, []);

  const loadConsultations = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(API_ENDPOINTS.CONSULTATIONS.BASE);
      setConsultations(response.data);
      setError(null);
    } catch (error: any) {
      setError('Fehler beim Laden der Beratungen');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key: SortConfig['key']) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleEditNotes = (consultation: Consultation) => {
    setEditingId(consultation.id);
    setEditNotes(consultation.notes || '');
  };

  const handleSaveNotes = async (consultationId: number) => {
    try {
      setSavingId(consultationId);
      await axiosInstance.patch(
        API_ENDPOINTS.CONSULTATIONS.UPDATE_NOTES(consultationId),
        { notes: editNotes }
      );
      
      // Aktualisiere die lokale Liste
      setConsultations(prev => 
        prev.map(c => c.id === consultationId ? { ...c, notes: editNotes } : c)
      );
      
      setEditingId(null);
      toast.success('Notizen gespeichert');
    } catch (error: any) {
      toast.error('Fehler beim Speichern der Notizen');
    } finally {
      setSavingId(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditNotes('');
  };

  const handleOpenLinkTaskModal = (consultationId: number) => {
    setSelectedConsultationId(consultationId);
    setIsLinkTaskModalOpen(true);
  };

  const handleTaskLinked = () => {
    loadConsultations(); // Lade die Liste neu um verknüpfte Tasks zu zeigen
  };

  // Gefilterte und sortierte Beratungen
  const filteredAndSortedConsultations = useMemo(() => {
    let filtered = consultations;

    // Globale Suche
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(consultation => 
        consultation.client?.name.toLowerCase().includes(searchLower) ||
        consultation.branch.name.toLowerCase().includes(searchLower) ||
        (consultation.notes && consultation.notes.toLowerCase().includes(searchLower))
      );
    }

    // Sortierung
    const sorted = [...filtered].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortConfig.key) {
        case 'startTime':
          aValue = new Date(a.startTime).getTime();
          bValue = new Date(b.startTime).getTime();
          break;
        case 'endTime':
          aValue = a.endTime ? new Date(a.endTime).getTime() : 0;
          bValue = b.endTime ? new Date(b.endTime).getTime() : 0;
          break;
        case 'client.name':
          aValue = a.client?.name || '';
          bValue = b.client?.name || '';
          break;
        case 'duration':
          aValue = a.endTime ? new Date(a.endTime).getTime() - new Date(a.startTime).getTime() : 0;
          bValue = b.endTime ? new Date(b.endTime).getTime() - new Date(b.startTime).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [consultations, searchTerm, sortConfig]);

  const renderSortableHeader = (label: string, sortKey?: SortConfig['key']) => (
    <th
      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ${
        sortKey ? 'cursor-pointer select-none hover:bg-gray-50 dark:hover:bg-gray-700' : ''
      }`}
      onClick={() => sortKey && handleSort(sortKey)}
    >
      <div className="flex items-center space-x-1">
        <span>{label}</span>
        {sortKey && sortConfig.key === sortKey && (
          <span className="text-blue-500">
            {sortConfig.direction === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </div>
    </th>
  );

  if (loading && consultations.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Beratungsliste
            </h2>
          </div>

          {/* Suchfeld */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Beratungen durchsuchen..."
            />
          </div>
        </div>

        {/* Tabelle */}
        {error ? (
          <div className="p-6 text-center text-red-600 dark:text-red-400">
            {error}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {renderSortableHeader('Startzeit', 'startTime')}
                  {renderSortableHeader('Endzeit', 'endTime')}
                  {renderSortableHeader('Dauer', 'duration')}
                  {renderSortableHeader('Client', 'client.name')}
                  {renderSortableHeader('Niederlassung')}
                  {renderSortableHeader('Notizen')}
                  {renderSortableHeader('Tasks')}
                  {renderSortableHeader('Aktionen')}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredAndSortedConsultations.map((consultation) => (
                  <tr key={consultation.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                      {formatTime(consultation.startTime)}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                      {consultation.endTime ? formatTime(consultation.endTime) : '-'}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                      {calculateDuration(consultation.startTime, consultation.endTime)}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                      <div className="flex items-center">
                        <UserIcon className="h-4 w-4 mr-2 text-gray-400" />
                        {consultation.client?.name || '-'}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                      <div className="flex items-center">
                        <BuildingOfficeIcon className="h-4 w-4 mr-2 text-gray-400" />
                        {consultation.branch.name}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200">
                      {editingId === consultation.id ? (
                        <div className="flex items-center space-x-2">
                          <textarea
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white text-sm"
                            rows={2}
                          />
                          <button
                            onClick={() => handleSaveNotes(consultation.id)}
                            disabled={savingId === consultation.id}
                            className="p-1 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                          >
                            ✓
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          >
                            ✗
                          </button>
                        </div>
                      ) : (
                        <div 
                          className="max-w-xs truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                          onClick={() => handleEditNotes(consultation)}
                          title={consultation.notes || 'Klicken zum Bearbeiten'}
                        >
                          {consultation.notes || (
                            <span className="text-gray-400 italic">Notizen hinzufügen...</span>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                      {consultation.taskLinks && consultation.taskLinks.length > 0 ? (
                        <div className="flex items-center">
                          <LinkIcon className="h-4 w-4 mr-1 text-gray-400" />
                          <span>{consultation.taskLinks.length}</span>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEditNotes(consultation)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          title="Notizen bearbeiten"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleOpenLinkTaskModal(consultation.id)}
                          className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                          title="Task verknüpfen"
                        >
                          <LinkIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                
                {filteredAndSortedConsultations.length === 0 && !loading && (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                      {searchTerm ? 'Keine Beratungen gefunden' : 'Noch keine Beratungen vorhanden'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Link Task Modal */}
      {isLinkTaskModalOpen && selectedConsultationId && (
        <LinkTaskModal
          isOpen={isLinkTaskModalOpen}
          onClose={() => {
            setIsLinkTaskModalOpen(false);
            setSelectedConsultationId(null);
          }}
          consultationId={selectedConsultationId}
          onTaskLinked={handleTaskLinked}
        />
      )}
    </>
  );
};

export default ConsultationList; 
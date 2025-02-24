import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth.tsx';
import CreateRequestModal from './CreateRequestModal.tsx';
import EditRequestModal from './EditRequestModal.tsx';
import { 
  PlusIcon,
  CheckIcon, 
  XMarkIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  PencilIcon
} from '@heroicons/react/24/outline';

interface Request {
  id: number;
  title: string;
  status: 'approval' | 'approved' | 'to_improve' | 'denied';
  requestedBy: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
  };
  responsible: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
  };
  branch: {
    id: number;
    name: string;
  };
  dueDate: string;
  createTodo: boolean;
}

interface SortConfig {
  key: keyof Request | 'requestedBy.firstName' | 'responsible.firstName' | 'branch.name';
  direction: 'asc' | 'desc';
}

const Requests: React.FC = () => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<Request['status'] | 'all'>('all');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'dueDate', direction: 'asc' });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const { user } = useAuth();

  const fetchRequests = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/requests');
      setRequests(response.data);
      setError(null);
      setLoading(false);
    } catch (err) {
      console.error('Request Error:', err);
      if (axios.isAxiosError(err)) {
        if (err.code === 'ERR_NETWORK') {
          setError('Verbindung zum Server konnte nicht hergestellt werden. Bitte stellen Sie sicher, dass der Server läuft.');
        } else {
          setError(`Fehler beim Laden der Requests: ${err.response?.data?.message || err.message}`);
        }
      } else {
        setError('Ein unerwarteter Fehler ist aufgetreten');
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const getStatusColor = (status: Request['status']) => {
    switch (status) {
      case 'approval':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'to_improve':
        return 'bg-orange-100 text-orange-800';
      case 'denied':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSort = (key: SortConfig['key']) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleStatusChange = async (requestId: number, newStatus: Request['status']) => {
    try {
      const currentRequest = requests.find(r => r.id === requestId);
      if (!currentRequest) {
        setError('Request nicht gefunden');
        return;
      }

      await axios.put(`http://localhost:5000/api/requests/${requestId}`, 
        { 
          status: newStatus,
          create_todo: currentRequest.createTodo
        }
      );

      fetchRequests();
    } catch (err) {
      console.error('Status Update Error:', err);
      if (axios.isAxiosError(err)) {
        setError(`Fehler beim Aktualisieren des Status: ${err.response?.data?.message || err.message}`);
      } else {
        setError('Ein unerwarteter Fehler ist aufgetreten');
      }
    }
  };

  const filteredAndSortedRequests = useMemo(() => {
    return requests
      .filter(request => {
        const matchesSearch = 
          request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          `${request.requestedBy.firstName} ${request.requestedBy.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
          `${request.responsible.firstName} ${request.responsible.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
          request.branch.name.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
        
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof Request];
        let bValue: any = b[sortConfig.key as keyof Request];

        // Handle nested properties
        if (sortConfig.key === 'requestedBy.firstName') {
          aValue = a.requestedBy.firstName;
          bValue = b.requestedBy.firstName;
        } else if (sortConfig.key === 'responsible.firstName') {
          aValue = a.responsible.firstName;
          bValue = b.responsible.firstName;
        } else if (sortConfig.key === 'branch.name') {
          aValue = a.branch.name;
          bValue = b.branch.name;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
  }, [requests, searchTerm, statusFilter, sortConfig]);

  if (loading) return <div className="p-4">Lädt...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  return (
    <>
      <CreateRequestModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onRequestCreated={fetchRequests}
      />
      {selectedRequest && (
        <EditRequestModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedRequest(null);
          }}
          onRequestUpdated={fetchRequests}
          request={selectedRequest}
        />
      )}

      <div className="border rounded-lg">
        <div className="p-4 border-b bg-gray-50">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex flex-1 gap-4">
              <div className="group relative">
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                >
                  <PlusIcon className="h-5 w-5" />
                </button>
                <div className="absolute left-0 top-full mt-2 w-max opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gray-800 text-white text-sm rounded-md py-1 px-2 pointer-events-none z-10">
                  Neuer Request
                </div>
              </div>
              <input
                type="text"
                placeholder="Suchen..."
                className="w-full px-3 py-2 border rounded-md"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex-none">
              <select
                className="px-3 py-2 border rounded-md bg-white"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as Request['status'] | 'all')}
              >
                <option value="all">Alle Status</option>
                <option value="approval">Zur Genehmigung</option>
                <option value="approved">Genehmigt</option>
                <option value="to_improve">Zu verbessern</option>
                <option value="denied">Abgelehnt</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-fixed divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="w-1/6 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('title')}
                >
                  Titel {sortConfig.key === 'title' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="w-1/12 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('status')}
                >
                  Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="w-1/6 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('requestedBy.firstName')}
                >
                  Angefragt von {sortConfig.key === 'requestedBy.firstName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="w-1/6 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('responsible.firstName')}
                >
                  Verantwortlicher {sortConfig.key === 'responsible.firstName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="w-1/6 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('branch.name')}
                >
                  Niederlassung {sortConfig.key === 'branch.name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="w-1/6 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('dueDate')}
                >
                  Fälligkeit {sortConfig.key === 'dueDate' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="w-1/6 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <p>Keine Requests vorhanden</p>
                      <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        <PlusIcon className="h-5 w-5 mr-2" />
                        Neuen Request erstellen
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAndSortedRequests.map(request => (
                  <tr key={request.id}>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{request.title}</div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(request.status)}`}>
                        {request.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {`${request.requestedBy.firstName} ${request.requestedBy.lastName}`}
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {`${request.responsible.firstName} ${request.responsible.lastName}`}
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{request.branch.name}</div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(request.dueDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <div className="group relative">
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setIsEditModalOpen(true);
                            }}
                            className="p-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <div className="absolute left-0 top-full mt-2 w-max opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gray-800 text-white text-sm rounded-md py-1 px-2 pointer-events-none z-10">
                            Bearbeiten
                          </div>
                        </div>
                        {request.status === 'approval' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(request.id, 'approved')}
                              className="p-1 bg-green-600 text-white rounded hover:bg-green-700"
                              title="Genehmigen"
                            >
                              <CheckIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleStatusChange(request.id, 'to_improve')}
                              className="p-1 bg-orange-600 text-white rounded hover:bg-orange-700"
                              title="Verbessern"
                            >
                              <ExclamationTriangleIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleStatusChange(request.id, 'denied')}
                              className="p-1 bg-red-600 text-white rounded hover:bg-red-700"
                              title="Ablehnen"
                            >
                              <XMarkIcon className="h-5 w-5" />
                            </button>
                          </>
                        )}
                        {request.status === 'to_improve' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(request.id, 'approval')}
                              className="p-1 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                              title="Erneut prüfen"
                            >
                              <ArrowPathIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleStatusChange(request.id, 'denied')}
                              className="p-1 bg-red-600 text-white rounded hover:bg-red-700"
                              title="Ablehnen"
                            >
                              <XMarkIcon className="h-5 w-5" />
                            </button>
                          </>
                        )}
                        {(request.status === 'approved' || request.status === 'denied') && (
                          <button
                            onClick={() => handleStatusChange(request.id, 'approval')}
                            className="p-1 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                            title="Erneut prüfen"
                          >
                            <ArrowPathIcon className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default Requests; 
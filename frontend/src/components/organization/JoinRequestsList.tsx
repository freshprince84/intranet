import React, { useState, useEffect } from 'react';
import { organizationService } from '../../services/organizationService.ts';
import { OrganizationJoinRequest } from '../../types/organization.ts';
import { usePermissions } from '../../hooks/usePermissions.ts';

const JoinRequestsList: React.FC = () => {
  const [joinRequests, setJoinRequests] = useState<OrganizationJoinRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { canViewJoinRequests, canManageJoinRequests, loading: permissionsLoading } = usePermissions();

  useEffect(() => {
    // Warte bis Berechtigungen geladen sind
    if (permissionsLoading) {
      return;
    }
    
    const fetchJoinRequests = async () => {
      try {
        const requests = await organizationService.getJoinRequests();
        setJoinRequests(requests);
      } catch (err) {
        setError('Fehler beim Laden der Beitrittsanfragen');
      } finally {
        setLoading(false);
      }
    };

    if (canViewJoinRequests()) {
      fetchJoinRequests();
    } else {
      setError('Keine Berechtigung zum Anzeigen der Beitrittsanfragen');
      setLoading(false);
    }
  }, [canViewJoinRequests, permissionsLoading]);

  const handleProcessRequest = async (requestId: number, action: 'approve' | 'reject') => {
    if (!canManageJoinRequests()) {
      setError('Keine Berechtigung zum Bearbeiten der Beitrittsanfragen');
      return;
    }

    try {
      await organizationService.processJoinRequest(requestId, { 
        action, 
        response: action === 'approve' ? 'Genehmigt' : 'Abgelehnt' 
      });
      // Neulade die Liste
      const requests = await organizationService.getJoinRequests();
      setJoinRequests(requests);
    } catch (err) {
      setError('Fehler beim Bearbeiten der Beitrittsanfrage');
    }
  };

  if (permissionsLoading) {
    return <p>Lade Berechtigungen...</p>;
  }

  if (!canViewJoinRequests()) {
    return (
      <div className="p-4 text-red-600 dark:text-red-400">
        Keine Berechtigung zum Anzeigen der Beitrittsanfragen.
      </div>
    );
  }

  if (loading) return <p>Laden...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <h2>Beitrittsanfragen</h2>
      {joinRequests.length === 0 ? (
        <p>Keine Beitrittsanfragen vorhanden.</p>
      ) : (
        <ul>
          {joinRequests.map(request => (
            <li key={request.id} className="border p-4 mb-2 rounded">
              <p>
                <strong>{request.requester.firstName} {request.requester.lastName}</strong> 
                ({request.requester.email}) möchte der Organisation beitreten.
              </p>
              <p>Status: <span className={
                request.status === 'pending' ? 'text-yellow-600' :
                request.status === 'approved' ? 'text-green-600' :
                'text-red-600'
              }>{request.status}</span></p>
              {request.message && <p>Nachricht: {request.message}</p>}
              {request.status === 'pending' && canManageJoinRequests() && (
                <div className="mt-2">
                  <button 
                    onClick={() => handleProcessRequest(request.id, 'approve')}
                    className="bg-green-500 text-white px-3 py-1 rounded mr-2"
                  >
                    Genehmigen
                  </button>
                  <button 
                    onClick={() => handleProcessRequest(request.id, 'reject')}
                    className="bg-red-500 text-white px-3 py-1 rounded"
                  >
                    Ablehnen
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default JoinRequestsList; 
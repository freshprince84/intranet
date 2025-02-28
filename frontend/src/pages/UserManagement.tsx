import React, { useState } from 'react';
import { usePermissions } from '../hooks/usePermissions.ts';
import { UserGroupIcon, UserIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import UserManagementTab from '../components/UserManagementTab.tsx';
import RoleManagementTab from '../components/RoleManagementTab.tsx';

const UserManagement: React.FC = () => {
  // Tab-Zustand für Navigation zwischen Benutzer- und Rollenverwaltung
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  
  // Gemeinsame States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isAdmin } = usePermissions();

  // Tab-Wechsel Handler - Fehler beim Wechsel zurücksetzen
  const handleTabChange = (tab: 'users' | 'roles') => {
    setActiveTab(tab);
    setError(null);
  };

  // Gemeinsame Fehlerbehandlung
  const handleError = (err: any) => {
    let message = 'Ein Fehler ist aufgetreten';
    if (err.response?.data?.message) {
      message = err.response.data.message;
    } else if (err instanceof Error) {
      message = err.message;
    }
    setError(message);
  };

  if (!isAdmin()) {
    return <div className="p-4 text-red-600">Nur Administratoren haben Zugriff auf diese Seite.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="container mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          {/* Header mit Icon */}
          <div className="flex items-center mb-6">
            <UserGroupIcon className="h-6 w-6 mr-2" />
            <h2 className="text-xl font-semibold">Benutzerverwaltung</h2>
          </div>

          {/* Tabs für Navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                className={`${
                  activeTab === 'users'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                onClick={() => handleTabChange('users')}
              >
                <UserIcon className="h-5 w-5 mr-2" />
                Benutzer
              </button>
              <button
                className={`${
                  activeTab === 'roles'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                onClick={() => handleTabChange('roles')}
              >
                <ShieldCheckIcon className="h-5 w-5 mr-2" />
                Rollen
              </button>
            </nav>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <p className="font-bold">Fehler:</p>
              <p>{error}</p>
            </div>
          )}

          {loading && <div className="p-4">Lädt...</div>}

          {/* Tab Inhalte */}
          <div className="mt-6">
            {activeTab === 'users' ? (
              <UserManagementTab
                onError={handleError}
              />
            ) : (
              <RoleManagementTab
                onError={handleError}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagement; 
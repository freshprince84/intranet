import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Requests from '../components/Requests.tsx';
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    // Hier würden wir normalerweise Benutzerdaten vom Server abrufen
    // Für dieses Beispiel verwenden wir Mock-Daten
    setUser({
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User'
    });
    setLoading(false);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  if (loading) {
    return <div>Laden...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <nav className="bg-white shadow w-full">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold truncate">Intranet Dashboard</h1>
            </div>
            <div className="flex items-center">
              <div className="group relative">
                <button
                  onClick={handleLogout}
                  className="p-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                </button>
                <div className="absolute right-0 top-full mt-2 w-max opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gray-800 text-white text-sm rounded-md py-1 px-2 pointer-events-none z-10">
                  Abmelden
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 px-2 sm:px-4 lg:px-6">
        <div className="py-4">
          <div className="bg-white shadow rounded-lg p-4 sm:p-6">
            <h2 className="text-2xl font-bold mb-4">Willkommen, {user?.first_name}!</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Persönliche Informationen</h3>
                <p><strong>Benutzername:</strong> {user?.username}</p>
                <p><strong>E-Mail:</strong> {user?.email}</p>
                <p><strong>Name:</strong> {user?.first_name} {user?.last_name}</p>
              </div>
              {/* Hier können weitere Dashboard-Widgets hinzugefügt werden */}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-4">Requests</h2>
          <div className="overflow-hidden">
            <Requests />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard; 
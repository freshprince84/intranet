import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Requests from '../components/Requests.tsx';
import WorktimeStats from '../components/WorktimeStats.tsx';
import { DocumentTextIcon } from '@heroicons/react/24/outline';

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
    <div className="min-h-screen">
      <main className="max-w-7xl mx-auto py-6 px-2 sm:px-4 lg:px-6">
        <div className="py-4">
          <WorktimeStats />
        </div>

        <div className="mt-6">
          <div className="bg-white rounded-lg border border-gray-300 dark:border-gray-700 p-6 w-full">
            <div className="flex items-center mb-4">
              <DocumentTextIcon className="h-6 w-6 mr-2" />
              <h2 className="text-xl font-semibold">Requests</h2>
            </div>
            <div>
              <Requests />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard; 
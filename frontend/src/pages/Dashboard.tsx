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
      <div className="max-w-7xl mx-auto py-0 px-2 -mt-6 sm:-mt-3 lg:-mt-3 sm:px-4 lg:px-6">
        <div className="py-1">
          <WorktimeStats />
        </div>

        <div className="mt-2 sm:mt-4 md:mt-6">
          <div className="bg-white rounded-lg border border-gray-300 dark:border-gray-700 p-6 w-full">
            <div>
              <Requests />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 
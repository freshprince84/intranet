import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth.tsx';
import { UserCircleIcon } from '@heroicons/react/24/outline';
import { API_URL } from '../config/api.ts';

interface UserProfile {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  birthday: string | null;
  bankDetails: string | null;
  contract: string | null;
  salary: number | null;
}

const Profile: React.FC = () => {
  const { user: authUser } = useAuth();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<UserProfile>>({});
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  useEffect(() => {
    if (authUser) {
      const initialUserData = {
        id: authUser.id,
        username: authUser.username,
        email: authUser.email,
        firstName: authUser.firstName,
        lastName: authUser.lastName,
        birthday: null,
        bankDetails: null,
        contract: null,
        salary: null
      };
      setUser(initialUserData);
      setFormData(initialUserData);
      fetchUserProfile();
    }
  }, [authUser]);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Kein Token gefunden');
      }

      const response = await axios.get(`${API_URL}/users/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Profile response:', response.data);
      if (response.data) {
        const profileData = {
          ...response.data,
          birthday: response.data.birthday ? new Date(response.data.birthday).toISOString().split('T')[0] : null
        };
        setUser(profileData);
        setFormData(profileData);
      }
    } catch (error) {
      console.error('Error fetching profile:', error.response?.data || error);
      setError('Fehler beim Laden des Profils: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value === '' ? null : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Kein Token gefunden');
      }

      // Validiere die Eingaben
      if (!formData.username?.trim()) {
        throw new Error('Benutzername ist erforderlich');
      }
      if (!formData.email?.trim()) {
        throw new Error('E-Mail ist erforderlich');
      }
      if (!formData.firstName?.trim()) {
        throw new Error('Vorname ist erforderlich');
      }
      if (!formData.lastName?.trim()) {
        throw new Error('Nachname ist erforderlich');
      }

      const dataToSend = {
        ...formData,
        salary: formData.salary ? parseFloat(formData.salary.toString()) : null,
        birthday: formData.birthday || null
      };

      console.log('Sending data to backend:', dataToSend);
      
      const response = await axios.put(`${API_URL}/users/profile`, dataToSend, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Update response:', response.data);
      
      if (response.data) {
        const updatedData = {
          ...response.data,
          birthday: response.data.birthday ? new Date(response.data.birthday).toISOString().split('T')[0] : null
        };
        setUser(updatedData);
        setFormData(updatedData);
        setSuccess('Profil erfolgreich aktualisiert');
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Ein unbekannter Fehler ist aufgetreten');
      }
    }
  };

  if (!user) {
    return <div className="flex justify-center items-center h-screen">Laden...</div>;
  }

  const startEditing = () => {
    setFormData(user); // Setze die Formulardaten auf die aktuellen Benutzerdaten
    setIsEditing(true);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <UserCircleIcon className="h-6 w-6 mr-2 dark:text-white" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Benutzerprofil</h1>
          </div>
          {!isEditing && (
            <button
              onClick={startEditing}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              Bearbeiten
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Benutzername
              </label>
              <input
                type="text"
                name="username"
                value={isEditing ? formData.username || '' : user.username || ''}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                E-Mail
              </label>
              <input
                type="email"
                name="email"
                value={isEditing ? formData.email || '' : user.email || ''}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Vorname
              </label>
              <input
                type="text"
                name="firstName"
                value={isEditing ? formData.firstName || '' : user.firstName || ''}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nachname
              </label>
              <input
                type="text"
                name="lastName"
                value={isEditing ? formData.lastName || '' : user.lastName || ''}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Geburtsdatum
              </label>
              <input
                type="date"
                name="birthday"
                value={isEditing ? formData.birthday || '' : user.birthday || ''}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Bank Details
              </label>
              <input
                type="text"
                name="bankDetails"
                value={isEditing ? formData.bankDetails || '' : user.bankDetails || ''}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Vertrag
              </label>
              <input
                type="text"
                name="contract"
                value={isEditing ? formData.contract || '' : user.contract || ''}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Gehalt
              </label>
              <input
                type="number"
                name="salary"
                value={isEditing ? formData.salary || '' : user.salary || ''}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </div>

          {isEditing && (
            <div className="flex justify-end space-x-4 mt-6">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setFormData(user);
                  setError('');
                  setSuccess('');
                }}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
              >
                Speichern
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default Profile; 
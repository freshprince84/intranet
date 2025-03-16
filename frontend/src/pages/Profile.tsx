import React, { useState, useEffect } from 'react';
import axios from 'axios';
import axiosInstance from '../config/axios.ts';
import { useAuth } from '../hooks/useAuth.tsx';
import { UserCircleIcon, PencilIcon } from '@heroicons/react/24/outline';
import { API_URL } from '../config/api.ts';
import useMessage from '../hooks/useMessage.ts';

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
  normalWorkingHours: number;
  country: string;
  language: string;
}

// Länder für die Auswahl
const COUNTRIES = [
  { code: 'CO', name: 'Kolumbien' },
  { code: 'CH', name: 'Schweiz' },
  { code: 'DE', name: 'Deutschland' },
  { code: 'AT', name: 'Österreich' }
];

// Sprachen für die Auswahl
const LANGUAGES = [
  { code: 'es', name: 'Spanisch' },
  { code: 'de', name: 'Deutsch' },
  { code: 'en', name: 'Englisch' }
];

const Profile: React.FC = () => {
  const { user: authUser } = useAuth();
  const { showMessage } = useMessage();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<UserProfile>>({});

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
        salary: null,
        normalWorkingHours: 7.6,
        country: 'CO',
        language: 'es'
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

      const response = await axiosInstance.get('/users/profile');
      
      console.log('Profile response:', response.data);
      if (response.data) {
        const profileData = {
          ...response.data,
          birthday: response.data.birthday ? new Date(response.data.birthday).toISOString().split('T')[0] : null,
          normalWorkingHours: response.data.normalWorkingHours || 7.6,
          country: response.data.country || 'CO',
          language: response.data.language || 'es'
        };
        setUser(profileData);
        setFormData(profileData);
      }
    } catch (error) {
      console.error('Error fetching profile:', error.response?.data || error);
      const errorMsg = 'Fehler beim Laden des Profils: ' + (error.response?.data?.message || error.message);
      showMessage(errorMsg, 'error');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value === '' ? null : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
      
      const response = await axiosInstance.put('/users/profile', dataToSend);
      
      console.log('Update response:', response.data);
      
      if (response.data) {
        const updatedData = {
          ...response.data,
          birthday: response.data.birthday ? new Date(response.data.birthday).toISOString().split('T')[0] : null
        };
        setUser(updatedData);
        setFormData(updatedData);
        showMessage('Profil erfolgreich aktualisiert', 'success');
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      let errorMsg = 'Ein unbekannter Fehler ist aufgetreten';
      if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      } else if (error instanceof Error) {
        errorMsg = error.message;
      }
      showMessage(errorMsg, 'error');
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
    <div className="container mx-auto py-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center">
            <UserCircleIcon className="h-6 w-6 mr-2 dark:text-white" />
            Benutzerprofil
          </h2>
          {!isEditing && (
            <button
              onClick={startEditing}
              className="text-blue-600 hover:text-blue-900"
            >
              <PencilIcon className="h-5 w-5" />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Normal Working Hours
              </label>
              <input
                type="number"
                name="normalWorkingHours"
                value={isEditing ? formData.normalWorkingHours || '' : user.normalWorkingHours || ''}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Country
              </label>
              <select
                name="country"
                value={isEditing ? formData.country || '' : user.country || ''}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">Select a country</option>
                {COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Language
              </label>
              <select
                name="language"
                value={isEditing ? formData.language || '' : user.language || ''}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">Select a language</option>
                {LANGUAGES.map((language) => (
                  <option key={language.code} value={language.code}>
                    {language.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isEditing && (
            <div className="flex justify-end space-x-4 mt-6">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setFormData(user);
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
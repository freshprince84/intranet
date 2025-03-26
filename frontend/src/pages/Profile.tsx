import React, { useState, useEffect } from 'react';
import axios from 'axios';
import axiosInstance from '../config/axios.ts';
import { useAuth } from '../hooks/useAuth.tsx';
import { UserCircleIcon, PencilIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { API_URL } from '../config/api.ts';
import useMessage from '../hooks/useMessage.ts';
import IdentificationDocumentList from '../components/IdentificationDocumentList.tsx';

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
  // Neue Felder für Identifikationsdokumente
  identificationNumber: string | null;
  identificationType: string | null;
  identificationExpiryDate: string | null;
  identificationIssuingCountry: string | null;
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

// Identifikationstypen
const ID_TYPES = [
  { value: 'passport', label: 'Reisepass' },
  { value: 'national_id', label: 'Personalausweis' },
  { value: 'driving_license', label: 'Führerschein' },
  { value: 'residence_permit', label: 'Aufenthaltserlaubnis' },
  { value: 'work_permit', label: 'Arbeitserlaubnis' },
  { value: 'tax_id', label: 'Steuer-ID' },
  { value: 'social_security', label: 'Sozialversicherungsausweis' },
];

const Profile: React.FC = () => {
  const { user: authUser } = useAuth();
  const { showMessage } = useMessage();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<UserProfile>>({});
  const [activeTab, setActiveTab] = useState<'profile' | 'documents'>('profile');

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
        language: 'es',
        identificationNumber: null,
        identificationType: null,
        identificationExpiryDate: null,
        identificationIssuingCountry: null
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
          language: response.data.language || 'es',
          identificationExpiryDate: response.data.identificationExpiryDate ? new Date(response.data.identificationExpiryDate).toISOString().split('T')[0] : null
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
        normalWorkingHours: formData.normalWorkingHours ? parseFloat(formData.normalWorkingHours.toString()) : 7.6,
        birthday: formData.birthday || null,
        identificationExpiryDate: formData.identificationExpiryDate || null
      };

      console.log('Sending data to backend:', dataToSend);
      
      const response = await axiosInstance.put('/users/profile', dataToSend);
      
      console.log('Update response:', response.data);
      
      if (response.data) {
        const updatedData = {
          ...response.data,
          birthday: response.data.birthday ? new Date(response.data.birthday).toISOString().split('T')[0] : null,
          identificationExpiryDate: response.data.identificationExpiryDate ? new Date(response.data.identificationExpiryDate).toISOString().split('T')[0] : null
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === 'profile'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <UserCircleIcon className="h-5 w-5 inline mr-2" />
              Profil
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === 'documents'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <DocumentTextIcon className="h-5 w-5 inline mr-2" />
              Identifikationsdokumente
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'profile' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center dark:text-white">
              <UserCircleIcon className="h-6 w-6 mr-2 dark:text-white" />
              Benutzerprofil
            </h2>
            {!isEditing && (
              <button
                onClick={startEditing}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select a language</option>
                  {LANGUAGES.map((language) => (
                    <option key={language.code} value={language.code}>
                      {language.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Neue Felder für Identifikationsdokumente */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Identifikationstyp
                </label>
                <select
                  name="identificationType"
                  value={isEditing ? formData.identificationType || '' : user.identificationType || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Bitte auswählen</option>
                  {ID_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Identifikationsnummer
                </label>
                <input
                  type="text"
                  name="identificationNumber"
                  value={isEditing ? formData.identificationNumber || '' : user.identificationNumber || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ausstellendes Land
                </label>
                <select
                  name="identificationIssuingCountry"
                  value={isEditing ? formData.identificationIssuingCountry || '' : user.identificationIssuingCountry || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Bitte auswählen</option>
                  {COUNTRIES.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ablaufdatum
                </label>
                <input
                  type="date"
                  name="identificationExpiryDate"
                  value={isEditing ? formData.identificationExpiryDate || '' : user.identificationExpiryDate || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            {isEditing && (
              <div className="flex mt-6 space-x-3">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  Speichern
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                >
                  Abbrechen
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {activeTab === 'documents' && user && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <IdentificationDocumentList userId={user.id} />
        </div>
      )}
    </div>
  );
};

export default Profile; 
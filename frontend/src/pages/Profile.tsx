import React, { useState, useEffect } from 'react';
import axios from 'axios';
import axiosInstance from '../config/axios.ts';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth.tsx';
import { UserCircleIcon, PencilIcon, DocumentTextIcon, XMarkIcon, CheckIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { API_URL } from '../config/api.ts';
import useMessage from '../hooks/useMessage.ts';
import IdentificationDocumentList from '../components/IdentificationDocumentList.tsx';
import IdentificationDocumentForm from '../components/IdentificationDocumentForm.tsx';
import LifecycleTab from '../components/LifecycleTab.tsx';
import MyDocumentsTab from '../components/MyDocumentsTab.tsx';
import { useOnboarding } from '../contexts/OnboardingContext.tsx';

interface IdentificationDocument {
  id: number;
  documentType: string;
  documentNumber: string;
  issueDate: string | null;
  expiryDate: string | null;
  issuingCountry: string;
  issuingAuthority: string | null;
}

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
  gender: string | null; // "male", "female", "other"
  phoneNumber: string | null; // WhatsApp-Telefonnummer (mit Ländercode)
  identificationNumber: string | null; // Wird automatisch aus Dokument befüllt
  identificationDocuments?: IdentificationDocument[]; // Neuestes Dokument für Anzeige
  roles?: { role: { organization: { id: number } | null } }[]; // Für hasOrganization Check
}

// Länder für die Auswahl - werden dynamisch aus Übersetzungen geladen
// Sprachen für die Auswahl - werden dynamisch aus Übersetzungen geladen

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
  const { user: authUser, fetchCurrentUser } = useAuth();
  const { showMessage } = useMessage();
  const { t } = useTranslation();
  const { completeStep } = useOnboarding();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<UserProfile>>({});
  const [activeTab, setActiveTab] = useState<'profile' | 'documents' | 'lifecycle' | 'myDocuments'>('profile');
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);

  // Länder für die Auswahl (dynamisch aus Übersetzungen)
  const COUNTRIES = [
    { code: 'CO', name: t('countries.CO') },
    { code: 'CH', name: t('countries.CH') },
    { code: 'DE', name: t('countries.DE') },
    { code: 'AT', name: t('countries.AT') }
  ];

  // Sprachen für die Auswahl (dynamisch aus Übersetzungen)
  const LANGUAGES = [
    { code: 'es', name: t('languages.es') },
    { code: 'de', name: t('languages.de') },
    { code: 'en', name: t('languages.en') }
  ];

  useEffect(() => {
    if (authUser) {
      const initialUserData = {
        id: authUser.id,
        username: authUser.username,
        email: authUser.email,
        firstName: authUser.firstName || '',
        lastName: authUser.lastName || '',
        birthday: null,
        bankDetails: null,
        contract: null,
        salary: null,
        normalWorkingHours: 7.6,
        country: 'CO',
        language: 'es',
        gender: null,
        phoneNumber: null,
        identificationNumber: null,
        identificationDocuments: []
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
      
      if (response.data) {
        const profileData = {
          ...response.data,
          birthday: response.data.birthday ? new Date(response.data.birthday).toISOString().split('T')[0] : null,
          normalWorkingHours: response.data.normalWorkingHours || 7.6,
          country: response.data.country || 'CO',
          language: response.data.language || 'es',
          gender: response.data.gender || null,
          phoneNumber: response.data.phoneNumber || null,
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
        gender: formData.gender || null,
      };

      const response = await axiosInstance.put('/users/profile', dataToSend);
      
      if (response.data) {
        const updatedData = {
          ...response.data,
          birthday: response.data.birthday ? new Date(response.data.birthday).toISOString().split('T')[0] : null
        };
        setUser(updatedData);
        setFormData(updatedData);
        showMessage('Profil erfolgreich aktualisiert', 'success');
        setIsEditing(false);
        
        // User-Context aktualisieren, damit profileComplete State in usePermissions aktualisiert wird
        try {
          await fetchCurrentUser();
        } catch (error) {
          console.error('Fehler beim Aktualisieren des User-Contexts:', error);
        }
        
        // Prüfe ob Profil jetzt vollständig ist (username, email, language - country NICHT nötig)
        const isComplete = !!(
          updatedData.username &&
          updatedData.email &&
          updatedData.language
        );
        
        // Wenn Profil vollständig ist, schließe den Profil-Schritt ab
        if (isComplete) {
          try {
            await completeStep('profile_complete', t('onboarding.steps.profile_complete.title') || 'Profil vervollständigen');
          } catch (error) {
            console.error('Fehler beim Abschließen des Profil-Schritts:', error);
          }
        }
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

  // Prüfe ob Profil unvollständig ist (Phase 1: Basis-Profilinfos)
  // username, email, language - country NICHT nötig
  const isProfileIncomplete = () => {
    if (!user) return true;
    return !(
      user.username &&
      user.email &&
      user.language
    );
  };

  return (
    <div className="min-h-screen dark:bg-gray-900" data-onboarding="profile-page">
      <div className="max-w-7xl mx-auto py-0 px-2 -mt-6 sm:-mt-3 lg:-mt-3 sm:px-4 lg:px-6">
      {/* Warnung wenn Profil unvollständig */}
      {isProfileIncomplete() && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                <strong>{t('profile.profileIncomplete')}</strong> {t('profile.completeProfile')}
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 mb-6">
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
              {t('profile.title')}
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
              {t('profile.documents')}
            </button>
            <button
              onClick={() => setActiveTab('lifecycle')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === 'lifecycle'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <BuildingOfficeIcon className="h-5 w-5 inline mr-2" />
              {t('lifecycle.tabTitle')}
            </button>
            <button
              onClick={() => setActiveTab('myDocuments')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === 'myDocuments'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <DocumentTextIcon className="h-5 w-5 inline mr-2" />
              {t('lifecycle.myDocumentsTab')}
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'profile' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center dark:text-white">
              <UserCircleIcon className="h-6 w-6 mr-2 dark:text-white" />
              {t('profile.userProfile')}
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

          {/* Hinweis: Profil ausfüllen um System freizuschalten */}
          {user && (() => {
            const hasOrganization = user.roles?.some(r => r.role.organization !== null) || false;
            // username, email, language - country NICHT nötig
            const isProfileIncomplete = hasOrganization && !(
              user.username &&
              user.email &&
              user.language
            );
            
            if (hasOrganization && isProfileIncomplete) {
              return (
                <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 rounded">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        <strong>{t('profile.completeProfileToUnlock') || 'Fülle dein Profil aus, um das System freizuschalten'}</strong>
                        <br />
                        {t('profile.completeProfileHint') || 'Bitte vervollständigen Sie Ihr Profil mit Username, Email, Land und Sprache, um alle Funktionen nutzen zu können.'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('profile.username')}
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
                  {t('profile.email')}
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
                  {t('profile.country')}
                </label>
                <select
                  name="country"
                  value={isEditing ? formData.country || '' : user.country || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                >
                  <option value="">{t('profile.selectCountry')}</option>
                  {COUNTRIES.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('profile.language')} <span className="text-red-500">*</span>
                </label>
                <select
                  name="language"
                  value={isEditing ? formData.language || '' : user.language || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="">{t('profile.selectLanguage')}</option>
                  {LANGUAGES.map((language) => (
                    <option key={language.code} value={language.code}>
                      {language.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dokumenten-Upload (prominent, nach country/language) */}
              {user && (
                <div className="sm:col-span-2">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
                          {t('profile.identificationDocument') || 'Identifikationsdokument'}
                        </h3>
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          {t('profile.uploadDocumentHint') || 'Bitte laden Sie Ihr Identifikationsdokument (Cédula oder Pasaporte) hoch. Die Felder werden automatisch ausgefüllt.'}
                        </p>
                      </div>
                      {!showDocumentUpload && (
                        <button
                          data-onboarding="upload-document-button"
                          type="button"
                          onClick={() => setShowDocumentUpload(true)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                        >
                          <DocumentTextIcon className="h-5 w-5 inline mr-2" />
                          {t('profile.uploadDocument') || 'Dokument hochladen'}
                        </button>
                      )}
                    </div>
                    {showDocumentUpload && (
                      <div className="mt-4">
                        <IdentificationDocumentForm
                          userId={user.id}
                          onDocumentSaved={async () => {
                            setShowDocumentUpload(false);
                            fetchUserProfile(); // Aktualisiere Profil nach Upload
                            showMessage('Dokument erfolgreich hochgeladen. Felder werden automatisch ausgefüllt.', 'success');
                            
                            // Schließe Onboarding-Schritt ab, wenn aktiv
                            try {
                              await completeStep('upload_identification_document', t('onboarding.steps.upload_identification_document.title') || 'Dokument hochladen');
                            } catch (error) {
                              // Fehler beim Abschließen blockiert nicht den Upload
                              console.error('Fehler beim Abschließen des upload_identification_document Schritts:', error);
                            }
                          }}
                          onCancel={() => setShowDocumentUpload(false)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('profile.phoneNumber')}
                </label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={isEditing ? formData.phoneNumber || '' : user.phoneNumber || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="+573001234567"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t('profile.phoneNumberHint')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('profile.firstName')}
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
                  {t('profile.lastName')}
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
                  {t('profile.birthday')}
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
                  {t('profile.bankDetails')}
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
                  {t('profile.contract')}
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
                  {t('profile.salary')}
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
                  {t('profile.normalWorkingHours')}
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
                  {t('profile.gender')}
                </label>
                <select
                  name="gender"
                  value={isEditing ? formData.gender || '' : user.gender || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                >
                  <option value="">{t('profile.selectGender')}</option>
                  <option value="male">{t('profile.genderMale')}</option>
                  <option value="female">{t('profile.genderFemale')}</option>
                  <option value="other">{t('profile.genderOther')}</option>
                </select>
              </div>

              {/* Identifikationsdokument-Daten (readonly, aus IdentificationDocument) */}
              {user.identificationDocuments && user.identificationDocuments.length > 0 && (
                <>
                  {(() => {
                    const latestDoc = user.identificationDocuments[0];
                    return (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('profile.identificationType')}
                          </label>
                          <input
                            type="text"
                            value={latestDoc.documentType || ''}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white bg-gray-100 dark:bg-gray-800"
                            readOnly
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('profile.identificationNumber')}
                          </label>
                          <input
                            type="text"
                            value={user.identificationNumber || latestDoc.documentNumber || ''}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white bg-gray-100 dark:bg-gray-800"
                            readOnly
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('profile.identificationIssuingCountry')}
                          </label>
                          <input
                            type="text"
                            value={latestDoc.issuingCountry || ''}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white bg-gray-100 dark:bg-gray-800"
                            readOnly
                          />
                        </div>

                        {latestDoc.expiryDate && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              {t('profile.identificationExpiryDate')}
                            </label>
                            <input
                              type="text"
                              value={new Date(latestDoc.expiryDate).toISOString().split('T')[0]}
                              disabled
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white bg-gray-100 dark:bg-gray-800"
                              readOnly
                            />
                          </div>
                        )}
                      </>
                    );
                  })()}
                </>
              )}
            </div>

            {isEditing && (
              <div className="flex mt-6 space-x-3">
                <button
                  type="submit"
                  className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600"
                  title={t('common.save')}
                >
                  <CheckIcon className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                  title={t('common.cancel')}
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {activeTab === 'documents' && user && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
          <IdentificationDocumentList userId={user.id} />
        </div>
      )}

      {activeTab === 'lifecycle' && user && (
        <LifecycleTab userId={user.id} />
      )}

      {activeTab === 'myDocuments' && user && (
        <MyDocumentsTab userId={user.id} />
      )}
    </div>
    </div>
  );
};

export default Profile; 
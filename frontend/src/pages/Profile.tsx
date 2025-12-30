import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import axiosInstance from '../config/axios.ts';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth.tsx';
import { UserCircleIcon, DocumentTextIcon, XMarkIcon, CheckIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { API_URL } from '../config/api.ts';
import useMessage from '../hooks/useMessage.ts';
import IdentificationDocumentList from '../components/IdentificationDocumentList.tsx';
import LifecycleTab from '../components/LifecycleTab.tsx';
import { handleDirectDocumentUpload } from '../utils/documentUploadHandler.ts';
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
  const [isUploading, setIsUploading] = useState(false);
  const documentListRef = useRef<{ loadDocuments: () => void }>(null);

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

  const handleDirectDocumentUploadWrapper = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    if (!user) return;
    
    setIsUploading(true);
    
    const result = await handleDirectDocumentUpload(
      e.target.files[0],
      user.id,
      async () => {
        await fetchUserProfile();
        // Lade Dokumente neu, wenn die Komponente gemountet ist
        if (documentListRef.current) {
          documentListRef.current.loadDocuments();
        }
        
        // Auth-Context-User aktualisieren, damit OnboardingContext die Dokumente sieht
        // Backend lädt identificationDocuments IMMER, daher einfach fetchCurrentUser() aufrufen
        try {
          await fetchCurrentUser();
        } catch (error) {
          console.error('Fehler beim Aktualisieren des Auth-Context-Users:', error);
          // Fehler blockiert nicht den Upload, aber Tour-Assistent wird möglicherweise nicht aktualisiert
        }
        
        showMessage(t('profile.documentUploadSuccess', { defaultValue: 'Dokument erfolgreich hochgeladen. Felder werden automatisch ausgefüllt.' }), 'success');
        
        // Schließe Onboarding-Schritt ab, wenn aktiv
        try {
          await completeStep('upload_identification_document', t('onboarding.steps.upload_identification_document.title') || 'Dokument hochladen');
        } catch (error) {
          // Fehler beim Abschließen blockiert nicht den Upload
          console.error('Fehler beim Abschließen des upload_identification_document Schritts:', error);
        }
      },
      (error) => {
        showMessage(error, 'error');
      }
    );
    
    setIsUploading(false);
    e.target.value = '';
  };

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
          country: response.data.country || null,
          language: response.data.language || 'es',
          gender: response.data.gender || null,
          phoneNumber: response.data.phoneNumber || null,
          identificationDocuments: response.data.identificationDocuments || [], // Explizit setzen
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
    setIsEditing(true); // Automatisch Edit-Modus aktivieren (wie UserManagementTab)
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
      // firstName, lastName, birthday werden nur von KI aus Dokument gesetzt, nicht manuell validiert

      // Nur die benötigten Felder senden (nicht identificationDocuments, roles, etc.)
      // Contract, Salary, Normal Working Hours werden zu Lifecycle verschoben
      // firstName, lastName, birthday werden nur von KI aus Dokument gesetzt, nicht manuell editierbar
      const dataToSend = {
        username: formData.username,
        email: formData.email,
        bankDetails: formData.bankDetails || null,
        gender: formData.gender || null,
        phoneNumber: formData.phoneNumber || null,
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
      
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
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

          <div className="mt-6">
      {activeTab === 'profile' && (
              <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center dark:text-white">
              <UserCircleIcon className="h-6 w-6 mr-2 dark:text-white" />
              {t('profile.userProfile')}
            </h2>
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
              {/* 1. Username, Email (nebeneinander - 2 Spalten) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('profile.username')}
                </label>
                <input
                  type="text"
                  name="username"
                  value={isEditing ? formData.username || '' : user.username || ''}
                  onChange={handleInputChange}
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* 2. Language (allein - 1 Spalte) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('profile.language')} <span className="text-red-500">*</span>
                </label>
                <select
                  name="language"
                  value={isEditing ? formData.language || '' : user.language || ''}
                  onChange={handleInputChange}
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

              {/* 3. Dokumenten-Upload (prominent - volle Breite) */}
              {user && (
                <div className="sm:col-span-2">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
                          {t('profile.identificationDocument', { defaultValue: 'Identifikationsdokument' })}
                        </h3>
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          {t('profile.uploadDocumentHint', { defaultValue: 'Bitte laden Sie Ihr Identifikationsdokument (Cédula oder Pasaporte) hoch. Die Felder werden automatisch ausgefüllt.' })}
                        </p>
                      </div>
                      <input
                        type="file"
                        id="documentUpload"
                        accept="image/*"
                        className="hidden"
                        onChange={handleDirectDocumentUploadWrapper}
                        disabled={isUploading}
                      />
                      <label
                        htmlFor="documentUpload"
                          data-onboarding="upload-document-button"
                        className={`p-2 text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md cursor-pointer ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={t('profile.uploadDocument', { defaultValue: 'Dokument hochladen' })}
                        >
                          <DocumentTextIcon className="h-5 w-5" />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. ID-Dokument-Daten (readonly, alle Felder - korrekte Reihenfolge) */}
              {/* Zeige Felder an, wenn User-Daten vorhanden sind (werden beim Upload extrahiert) */}
              {(user.firstName || user.lastName || user.birthday || user.identificationNumber) && (
                <>
                  {(() => {
                    const latestDoc = user.identificationDocuments && user.identificationDocuments.length > 0 ? user.identificationDocuments[0] : null;
                    return (
                      <>
                        {/* 1. Vorname */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('profile.firstName')}
                          </label>
                          <input
                            type="text"
                            value={user.firstName || ''}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white bg-gray-100 dark:bg-gray-800"
                            readOnly
                          />
                        </div>

                        {/* 2. Nachname */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('profile.lastName')}
                          </label>
                          <input
                            type="text"
                            value={user.lastName || ''}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white bg-gray-100 dark:bg-gray-800"
                            readOnly
                          />
                        </div>

                        {/* 3. Geburtsdatum */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('profile.birthday')}
                          </label>
                          <input
                            type="text"
                            value={user.birthday ? new Date(user.birthday).toISOString().split('T')[0] : ''}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white bg-gray-100 dark:bg-gray-800"
                            readOnly
                          />
                        </div>

                        {/* 4. Land */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('profile.country')}
                          </label>
                          <input
                            type="text"
                            value={user.country ? COUNTRIES.find(c => c.code === user.country)?.name || user.country : ''}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white bg-gray-100 dark:bg-gray-800"
                            readOnly
                          />
                        </div>

                        {/* 5. Geschlecht (editierbar, falls KI nicht richtig erkannt hat) */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('profile.gender')}
                          </label>
                          <select
                            name="gender"
                            value={isEditing ? formData.gender || '' : user.gender || ''}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                          >
                            <option value="">{t('profile.selectGender')}</option>
                            <option value="male">{t('profile.genderMale')}</option>
                            <option value="female">{t('profile.genderFemale')}</option>
                            <option value="other">{t('profile.genderOther')}</option>
                          </select>
                        </div>

                        {/* 6. Dokument-Typ */}
                        {latestDoc && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('profile.identificationType')}
                          </label>
                          <input
                            type="text"
                            value={
                              latestDoc.documentType
                                ? (() => {
                                    const typeMap: Record<string, string> = {
                                      passport: t('identificationDocuments.types.passport'),
                                      national_id: t('identificationDocuments.types.national_id'),
                                      driving_license: t('identificationDocuments.types.driving_license'),
                                      residence_permit: t('identificationDocuments.types.residence_permit'),
                                      work_permit: t('identificationDocuments.types.work_permit'),
                                      tax_id: t('identificationDocuments.types.tax_id'),
                                      social_security: t('identificationDocuments.types.social_security'),
                                    };
                                    return typeMap[latestDoc.documentType] || latestDoc.documentType;
                                  })()
                                : ''
                            }
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white bg-gray-100 dark:bg-gray-800"
                            readOnly
                          />
                        </div>
                        )}

                        {/* 7. Dokument-Nummer */}
                        {(user.identificationNumber || latestDoc?.documentNumber) && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('profile.identificationNumber')}
                          </label>
                          <input
                            type="text"
                              value={user.identificationNumber || latestDoc?.documentNumber || ''}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white bg-gray-100 dark:bg-gray-800"
                            readOnly
                          />
                        </div>
                        )}

                        {/* 8. Ausstellungsdatum */}
                        {latestDoc?.issueDate && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              {t('profile.identificationIssueDate') || 'Ausstellungsdatum'}
                            </label>
                            <input
                              type="text"
                              value={new Date(latestDoc.issueDate).toISOString().split('T')[0]}
                              disabled
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white bg-gray-100 dark:bg-gray-800"
                              readOnly
                            />
                          </div>
                        )}

                        {/* 9. Ablaufdatum */}
                        {latestDoc?.expiryDate && (
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

                        {/* 10. Ausstellungsland */}
                        {latestDoc?.issuingCountry && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              {t('profile.issuingCountry')}
                            </label>
                            <input
                              type="text"
                              value={latestDoc.issuingCountry}
                              disabled
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white bg-gray-100 dark:bg-gray-800"
                              readOnly
                            />
                          </div>
                        )}

                        {/* 11. Ausstellungsbehörde */}
                        {latestDoc?.issuingAuthority && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              {t('profile.issuingAuthority')}
                            </label>
                            <input
                              type="text"
                              value={latestDoc.issuingAuthority}
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

              {/* 5. Phone Number (allein - 1 Spalte, da Geschlecht jetzt in ID-Dokument-Daten) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('profile.phoneNumber')}
                </label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={isEditing ? formData.phoneNumber || '' : user.phoneNumber || ''}
                  onChange={handleInputChange}
                  placeholder="+573001234567"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t('profile.phoneNumberHint')}
                </p>
              </div>

              {/* 6. Finanzdaten (Bank Details - 1 Spalte) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('profile.bankDetails')}
                </label>
                <input
                  type="text"
                  name="bankDetails"
                  value={isEditing ? formData.bankDetails || '' : user.bankDetails || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Contract, Salary, Normal Working Hours ENTFERNEN - werden zu Lifecycle verschoben */}
            </div>

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
          </form>
        </div>
      )}

      {activeTab === 'documents' && user && (
          <IdentificationDocumentList userId={user.id} ref={documentListRef} />
          )}

          {activeTab === 'lifecycle' && user && <LifecycleTab userId={user.id} />}

          {activeTab === 'myDocuments' && user && <MyDocumentsTab userId={user.id} />}
          </div>
        </div>
    </div>
    </div>
  );
};

export default Profile; 
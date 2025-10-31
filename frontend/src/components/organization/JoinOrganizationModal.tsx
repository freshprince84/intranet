import React, { useState, useEffect, useRef } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { organizationService } from '../../services/organizationService.ts';
import { CreateJoinRequestRequest, Organization } from '../../types/organization.ts';
import useMessage from '../../hooks/useMessage.ts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const JoinOrganizationModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<CreateJoinRequestRequest>({
    organizationName: '',
    message: ''
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [searching, setSearching] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { showMessage } = useMessage();

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  // Click outside handler für Dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const searchOrganizations = async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setOrganizations([]);
      setShowDropdown(false);
      return;
    }

    try {
      setSearching(true);
      const results = await organizationService.searchOrganizations(searchTerm);
      setOrganizations(results);
      setShowDropdown(true);
    } catch (err: any) {
      console.error('Fehler bei der Organisationen-Suche:', err);
      setOrganizations([]);
    } finally {
      setSearching(false);
    }
  };

  const handleOrganizationInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, organizationName: value }));
    setSelectedOrganization(null);
    
    // Fehler löschen
    if (errors.organizationName) {
      setErrors(prev => ({ ...prev, organizationName: '' }));
    }

    // Debounce für Suche
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchOrganizations(value);
    }, 300);
  };

  const handleSelectOrganization = (org: Organization) => {
    setSelectedOrganization(org);
    setFormData(prev => ({ ...prev, organizationName: org.name }));
    setShowDropdown(false);
    setOrganizations([]);
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, message: e.target.value }));
    if (errors.message) {
      setErrors(prev => ({ ...prev, message: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.organizationName.trim()) {
      newErrors.organizationName = 'Organisationsname ist erforderlich';
    } else if (!selectedOrganization) {
      newErrors.organizationName = 'Bitte wählen Sie eine Organisation aus der Liste aus';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showMessage('Bitte füllen Sie alle erforderlichen Felder aus', 'error');
      return;
    }
    
    try {
      setLoading(true);
      await organizationService.createJoinRequest(formData);
      setErrors({});
      showMessage('Beitrittsanfrage erfolgreich gesendet', 'success');
      // Formular zurücksetzen
      setFormData({
        organizationName: '',
        message: ''
      });
      setSelectedOrganization(null);
      setOrganizations([]);
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Fehler beim Senden der Beitrittsanfrage';
      showMessage(errorMessage, 'error');
      setErrors({ submit: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Formular zurücksetzen
    setFormData({
      organizationName: '',
      message: ''
    });
    setSelectedOrganization(null);
    setOrganizations([]);
    setErrors({});
    setShowDropdown(false);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    onClose();
  };

  // Für Mobile (unter 640px) - klassisches Modal
  if (isMobile) {
    return (
      <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-lg w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <Dialog.Title className="text-lg font-semibold dark:text-white">
                Organisation beitreten
              </Dialog.Title>
              <button
                onClick={handleClose}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4">
              {errors.submit && (
                <div className="mb-4 p-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">
                  {errors.submit}
                </div>
              )}

              <div className="space-y-4">
                <div className="relative" ref={dropdownRef}>
                  <label 
                    htmlFor="organizationName" 
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Organisation suchen *
                  </label>
                  <input
                    type="text"
                    id="organizationName"
                    name="organizationName"
                    value={formData.organizationName}
                    onChange={handleOrganizationInputChange}
                    placeholder="Organisationsname eingeben..."
                    className={`mt-1 block w-full rounded-md border shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2 ${
                      errors.organizationName 
                        ? 'border-red-300 dark:border-red-600' 
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                  {errors.organizationName && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.organizationName}</p>
                  )}
                  
                  {/* Autocomplete Dropdown */}
                  {showDropdown && (organizations.length > 0 || searching) && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                      {searching ? (
                        <div className="p-3 text-center text-gray-500 dark:text-gray-400">
                          Suche...
                        </div>
                      ) : organizations.length > 0 ? (
                        organizations.map(org => (
                          <button
                            key={org.id}
                            type="button"
                            onClick={() => handleSelectOrganization(org)}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none"
                          >
                            <div className="font-medium text-gray-900 dark:text-white">
                              {org.displayName || org.name}
                            </div>
                            {org.displayName && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {org.name}
                              </div>
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="p-3 text-center text-gray-500 dark:text-gray-400">
                          Keine Organisationen gefunden
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label 
                    htmlFor="message" 
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Nachricht (optional)
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message || ''}
                    onChange={handleMessageChange}
                    rows={3}
                    placeholder="Optional: Fügen Sie eine Nachricht hinzu..."
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sende...
                    </>
                  ) : (
                    'Senden'
                  )}
                </button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>
    );
  }

  // Für Desktop (ab 640px) - Sidepane
  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div 
        className="fixed inset-0 bg-black/10 transition-opacity" 
        aria-hidden="true" 
        onClick={handleClose}
      />
      
      <div 
        className={`fixed inset-y-0 right-0 max-w-sm w-full bg-white dark:bg-gray-800 shadow-xl transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <Dialog.Title className="text-lg font-semibold dark:text-white">
            Organisation beitreten
          </Dialog.Title>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto h-full">
          {errors.submit && (
            <div className="mb-4 p-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">
              {errors.submit}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative" ref={dropdownRef}>
              <label 
                htmlFor="organizationName" 
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Organisation suchen *
              </label>
              <input
                type="text"
                id="organizationName"
                name="organizationName"
                value={formData.organizationName}
                onChange={handleOrganizationInputChange}
                placeholder="Organisationsname eingeben..."
                className={`mt-1 block w-full rounded-md border shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2 ${
                  errors.organizationName 
                    ? 'border-red-300 dark:border-red-600' 
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {errors.organizationName && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.organizationName}</p>
              )}
              
              {/* Autocomplete Dropdown */}
              {showDropdown && (organizations.length > 0 || searching) && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                  {searching ? (
                    <div className="p-3 text-center text-gray-500 dark:text-gray-400">
                      Suche...
                    </div>
                  ) : organizations.length > 0 ? (
                    organizations.map(org => (
                      <button
                        key={org.id}
                        type="button"
                        onClick={() => handleSelectOrganization(org)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none"
                      >
                        <div className="font-medium text-gray-900 dark:text-white">
                          {org.displayName || org.name}
                        </div>
                        {org.displayName && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {org.name}
                          </div>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-center text-gray-500 dark:text-gray-400">
                      Keine Organisationen gefunden
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label 
                htmlFor="message" 
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Nachricht (optional)
              </label>
              <textarea
                id="message"
                name="message"
                value={formData.message || ''}
                onChange={handleMessageChange}
                rows={3}
                placeholder="Optional: Fügen Sie eine Nachricht hinzu..."
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
              />
            </div>

            <div className="flex justify-end pt-4 gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sende...
                  </>
                ) : (
                  'Senden'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Dialog>
  );
};

export default JoinOrganizationModal; 
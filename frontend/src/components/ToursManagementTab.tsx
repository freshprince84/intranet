import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '../hooks/usePermissions.ts';
import { API_ENDPOINTS } from '../config/api.ts';
import axiosInstance from '../config/axios.ts';
import { Tour, TourType } from '../types/tour.ts';
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline';

const ToursManagementTab: React.FC = () => {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTours();
  }, []);

  const loadTours = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(API_ENDPOINTS.TOURS.BASE);
      if (response.data.success) {
        setTours(response.data.data);
      } else {
        setError(t('errors.loadError'));
      }
    } catch (err) {
      console.error('Fehler beim Laden der Touren:', err);
      setError(t('errors.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const canCreate = hasPermission('tour_create', 'button');
  const canEdit = hasPermission('tour_edit', 'button');
  const canDelete = hasPermission('tour_delete', 'button');
  const canView = hasPermission('tour_view', 'button');

  if (loading) {
    return <div className="text-gray-500 dark:text-gray-400">{t('common.loading')}</div>;
  }

  if (error) {
    return <div className="text-red-500 dark:text-red-400">{error}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium dark:text-white">{t('tours.title')}</h3>
        {canCreate && (
          <button
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            onClick={() => {
              // TODO: Modal öffnen
              console.log('Create Tour');
            }}
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            {t('tours.create')}
          </button>
        )}
      </div>

      {tours.length === 0 ? (
        <div className="text-gray-500 dark:text-gray-400 text-center py-8">
          {t('tours.noTours')}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tours.map((tour) => (
            <div
              key={tour.id}
              className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-lg font-semibold dark:text-white">{tour.title}</h4>
                <span className={`px-2 py-1 text-xs rounded ${
                  tour.isActive 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                }`}>
                  {tour.isActive ? t('tours.statusActive') : t('tours.statusInactive')}
                </span>
              </div>
              
              {tour.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                  {tour.description}
                </p>
              )}

              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-medium">{t('tours.type')}:</span>{' '}
                  {tour.type === TourType.OWN ? t('tours.typeOwn') : t('tours.typeExternal')}
                </div>
                {tour.price && (
                  <div className="text-sm font-semibold dark:text-white">
                    {Number(tour.price).toLocaleString()} {tour.currency || 'COP'}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 mt-4">
                {canView && (
                  <button
                    className="flex-1 flex items-center justify-center px-3 py-2 text-sm bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-gray-500"
                    onClick={() => {
                      // TODO: Details anzeigen
                      console.log('View Tour', tour.id);
                    }}
                  >
                    <EyeIcon className="h-4 w-4 mr-1" />
                    {t('common.view')}
                  </button>
                )}
                {canEdit && (
                  <button
                    className="flex-1 flex items-center justify-center px-3 py-2 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 rounded hover:bg-blue-200 dark:hover:bg-blue-800"
                    onClick={() => {
                      // TODO: Edit Modal öffnen
                      console.log('Edit Tour', tour.id);
                    }}
                  >
                    <PencilIcon className="h-4 w-4 mr-1" />
                    {t('common.edit')}
                  </button>
                )}
                {canDelete && (
                  <button
                    className="flex-1 flex items-center justify-center px-3 py-2 text-sm bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded hover:bg-red-200 dark:hover:bg-red-800"
                    onClick={async () => {
                      if (window.confirm(t('tours.deleteConfirm'))) {
                        try {
                          await axiosInstance.put(API_ENDPOINTS.TOURS.TOGGLE_ACTIVE(tour.id), {
                            isActive: false
                          });
                          await loadTours();
                        } catch (err) {
                          console.error('Fehler beim Löschen:', err);
                        }
                      }
                    }}
                  >
                    <TrashIcon className="h-4 w-4 mr-1" />
                    {t('tours.delete')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ToursManagementTab;



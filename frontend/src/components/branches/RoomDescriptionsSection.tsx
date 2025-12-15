import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { API_ENDPOINTS } from '../../config/api.ts';
import axiosInstance from '../../config/axios.ts';

interface RoomDescription {
  text?: string;
  imageUrl?: string;
  videoUrl?: string;
}

interface RoomDescriptionsSectionProps {
  branchId: number;
}

const RoomDescriptionsSection: React.FC<RoomDescriptionsSectionProps> = ({ branchId }) => {
  const { t } = useTranslation();
  const [roomDescriptions, setRoomDescriptions] = useState<Record<number, RoomDescription>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<RoomDescription>({ text: '', imageUrl: '', videoUrl: '' });
  const [rooms, setRooms] = useState<Array<{ categoryId: number; roomName: string; roomType: 'compartida' | 'privada' }>>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  // Lade Zimmer-Beschreibungen
  const loadRoomDescriptions = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(API_ENDPOINTS.BRANCHES.ROOM_DESCRIPTIONS(branchId));
      setRoomDescriptions(response.data || {});
    } catch (error: any) {
      console.error('Fehler beim Laden der Zimmer-Beschreibungen:', error);
    } finally {
      setLoading(false);
    }
  };

  // Lade Zimmer-Liste aus Reservierungen
  const loadRooms = async () => {
    try {
      setLoadingRooms(true);
      // Lade Reservierungen mit categoryId
      const response = await axiosInstance.get(API_ENDPOINTS.RESERVATION.BASE, {
        params: {
          branchId: branchId,
          limit: 1000 // Lade viele Reservierungen, um alle Zimmer zu finden
        }
      });
      
      // Extrahiere eindeutige categoryIds
      const categoryMap = new Map<number, { roomName: string; roomType: 'compartida' | 'privada' }>();
      
      // Backend gibt data.data zurück (nicht data.reservations)
      const reservations = response.data.data || [];
      
      reservations.forEach((reservation: any) => {
        if (reservation.categoryId && reservation.roomNumber) {
          // Bestimme roomType basierend auf roomNumber (Dorms enthalten "(")
          const isDorm = reservation.roomNumber.includes('(');
          const roomType = isDorm ? 'compartida' : 'privada';
          
          // Extrahiere Zimmername (für Dorms: vor "(")
          const roomName = isDorm 
            ? reservation.roomNumber.split('(')[0].trim()
            : reservation.roomNumber;
          
          if (!categoryMap.has(reservation.categoryId)) {
            categoryMap.set(reservation.categoryId, { roomName, roomType });
          }
        }
      });
      
      // Konvertiere Map zu Array
      const roomsArray = Array.from(categoryMap.entries()).map(([categoryId, data]) => ({
        categoryId,
        ...data
      }));
      
      setRooms(roomsArray.sort((a, b) => a.roomName.localeCompare(b.roomName)));
    } catch (error: any) {
      console.error('Fehler beim Laden der Zimmer:', error);
    } finally {
      setLoadingRooms(false);
    }
  };

  useEffect(() => {
    if (branchId) {
      loadRoomDescriptions();
      loadRooms();
    }
  }, [branchId]);

  // Starte Bearbeitung
  const handleEdit = (categoryId: number) => {
    const description = roomDescriptions[categoryId] || { text: '', imageUrl: '', videoUrl: '' };
    setEditForm(description);
    setEditingCategoryId(categoryId);
  };

  // Speichere Beschreibung
  const handleSave = async () => {
    if (editingCategoryId === null) return;
    
    try {
      setSaving(true);
      const updatedDescriptions = {
        ...roomDescriptions,
        [editingCategoryId]: editForm
      };
      
      await axiosInstance.put(
        API_ENDPOINTS.BRANCHES.ROOM_DESCRIPTIONS(branchId),
        { roomDescriptions: updatedDescriptions }
      );
      
      setRoomDescriptions(updatedDescriptions);
      setEditingCategoryId(null);
      setEditForm({ text: '', imageUrl: '', videoUrl: '' });
    } catch (error: any) {
      console.error('Fehler beim Speichern der Zimmer-Beschreibung:', error);
      alert(t('branches.roomDescriptions.saveError', { defaultValue: 'Fehler beim Speichern der Beschreibung' }));
    } finally {
      setSaving(false);
    }
  };

  // Abbrechen
  const handleCancel = () => {
    setEditingCategoryId(null);
    setEditForm({ text: '', imageUrl: '', videoUrl: '' });
  };

  if (loading || loadingRooms) {
    return (
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('common.loading', { defaultValue: 'Lade...' })}
        </p>
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('branches.roomDescriptions.noRooms', { 
            defaultValue: 'Keine Zimmer gefunden. Importieren Sie zuerst Reservierungen aus LobbyPMS.' 
          })}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
      <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
        {t('branches.roomDescriptions.title', { defaultValue: 'Zimmer-Beschreibungen' })}
      </h5>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        {t('branches.roomDescriptions.description', { 
          defaultValue: 'Beschreibungen, wie man zu den Zimmern kommt. Diese werden in den Check-in-Nachrichten verwendet.' 
        })}
      </p>
      
      <div className="space-y-4">
        {rooms.map((room) => {
          const isEditing = editingCategoryId === room.categoryId;
          const description = roomDescriptions[room.categoryId] || null;
          
          return (
            <div
              key={room.categoryId}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h6 className="text-sm font-medium text-gray-900 dark:text-white">
                    {room.roomName}
                  </h6>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {room.roomType === 'compartida' 
                      ? t('branches.roomDescriptions.dorm', { defaultValue: 'Dorm' })
                      : t('branches.roomDescriptions.private', { defaultValue: 'Privatzimmer' })}
                    {' • '}
                    {t('branches.roomDescriptions.categoryId', { defaultValue: 'Category ID' })}: {room.categoryId}
                  </span>
                </div>
                {!isEditing && (
                  <button
                    onClick={() => handleEdit(room.categoryId)}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1"
                    title={t('common.edit', { defaultValue: 'Bearbeiten' })}
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              {isEditing ? (
                <div className="space-y-3 mt-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('branches.roomDescriptions.text', { defaultValue: 'Text' })}
                    </label>
                    <textarea
                      value={editForm.text || ''}
                      onChange={(e) => setEditForm({ ...editForm, text: e.target.value })}
                      rows={3}
                      placeholder={t('branches.roomDescriptions.textPlaceholder', { 
                        defaultValue: 'Beschreibung, wie man zum Zimmer kommt...' 
                      })}
                      className="w-full text-sm rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white px-3 py-2"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('branches.roomDescriptions.imageUrl', { defaultValue: 'Bild-URL' })}
                    </label>
                    <input
                      type="text"
                      value={editForm.imageUrl || ''}
                      onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                      className="w-full text-sm rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white px-3 py-2"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('branches.roomDescriptions.videoUrl', { defaultValue: 'Video-URL' })}
                    </label>
                    <input
                      type="text"
                      value={editForm.videoUrl || ''}
                      onChange={(e) => setEditForm({ ...editForm, videoUrl: e.target.value })}
                      placeholder="https://example.com/video.mp4"
                      className="w-full text-sm rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white px-3 py-2"
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={handleCancel}
                      disabled={saving}
                      className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md disabled:opacity-50"
                      title={t('common.cancel', { defaultValue: 'Abbrechen' })}
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
                      title={saving ? t('common.saving', { defaultValue: 'Speichere...' }) : t('common.save', { defaultValue: 'Speichern' })}
                    >
                      <CheckIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {description ? (
                    <div className="space-y-1">
                      {description.text && (
                        <p>{description.text}</p>
                      )}
                      {description.imageUrl && (
                        <p>
                          <span className="font-medium">{t('branches.roomDescriptions.image', { defaultValue: 'Bild' })}:</span>{' '}
                          <a href={description.imageUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                            {description.imageUrl}
                          </a>
                        </p>
                      )}
                      {description.videoUrl && (
                        <p>
                          <span className="font-medium">{t('branches.roomDescriptions.video', { defaultValue: 'Video' })}:</span>{' '}
                          <a href={description.videoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                            {description.videoUrl}
                          </a>
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-400 dark:text-gray-500 italic">
                      {t('branches.roomDescriptions.noDescription', { defaultValue: 'Keine Beschreibung vorhanden' })}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RoomDescriptionsSection;


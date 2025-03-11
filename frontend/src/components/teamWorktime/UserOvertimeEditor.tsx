import React, { useState, useEffect } from 'react';

interface UserOvertimeEditorProps {
  user: any;
  onUpdate: (userId: number, approvedOvertimeHours: number) => Promise<void>;
  loading: boolean;
}

const UserOvertimeEditor: React.FC<UserOvertimeEditorProps> = ({
  user,
  onUpdate,
  loading
}) => {
  const [approvedOvertimeHours, setApprovedOvertimeHours] = useState<number>(0);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Aktualisiere den State, wenn sich der Benutzer ändert
  useEffect(() => {
    if (user && user.approvedOvertimeHours !== undefined) {
      setApprovedOvertimeHours(user.approvedOvertimeHours);
    }
  }, [user]);

  // Starte die Bearbeitung
  const handleStartEdit = () => {
    setIsEditing(true);
  };

  // Breche die Bearbeitung ab
  const handleCancelEdit = () => {
    setIsEditing(false);
    setApprovedOvertimeHours(user.approvedOvertimeHours || 0);
  };

  // Speichere die Änderungen
  const handleSaveEdit = async () => {
    try {
      setIsSaving(true);
      
      await onUpdate(user.id, approvedOvertimeHours);
      
      setIsEditing(false);
    } catch (error) {
      console.error('Fehler beim Speichern der bewilligten Überstunden:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-gray-50 p-4 rounded-lg mb-6">
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Bewilligte Überstunden
      </h3>
      
      <div className="flex items-center">
        <div className="flex-1">
          <p className="text-sm text-gray-500 mb-1">
            Benutzer: <span className="font-medium">{user.firstName} {user.lastName}</span>
          </p>
          <p className="text-sm text-gray-500 mb-1">
            Normale Arbeitszeit: <span className="font-medium">{user.normalWorkingHours}h pro Tag</span>
          </p>
          
          <div className="mt-2">
            <label htmlFor="approved-overtime" className="block text-sm font-medium text-gray-700">
              Bewilligte Überstunden
            </label>
            <div className="mt-1 flex rounded-md shadow-sm">
              {isEditing ? (
                <input
                  type="number"
                  id="approved-overtime"
                  className="focus:ring-blue-500 focus:border-blue-500 flex-1 block w-full rounded-md sm:text-sm border-gray-300"
                  value={approvedOvertimeHours}
                  onChange={(e) => setApprovedOvertimeHours(Number(e.target.value))}
                  min="0"
                  step="0.1"
                  disabled={isSaving}
                />
              ) : (
                <div className="py-2 px-3 bg-white border border-gray-300 rounded-md text-sm">
                  {approvedOvertimeHours}h
                </div>
              )}
              <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                Stunden
              </span>
            </div>
          </div>
        </div>
        
        <div className="ml-4">
          {isEditing ? (
            <div className="flex flex-col space-y-2">
              <button
                type="button"
                className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={handleSaveEdit}
                disabled={isSaving || loading}
              >
                {isSaving ? 'Speichern...' : 'Speichern'}
              </button>
              <button
                type="button"
                className="inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={handleCancelEdit}
                disabled={isSaving || loading}
              >
                Abbrechen
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={handleStartEdit}
              disabled={loading}
            >
              Bearbeiten
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserOvertimeEditor; 
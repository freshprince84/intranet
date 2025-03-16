import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  FormControlLabel, 
  Switch, 
  Grid, 
  Snackbar,
  Alert,
  Divider
} from '@mui/material';
import { NotificationSettings, notificationSettingsApi } from '../api/notificationApi.ts';
import { API_URL } from '../config/api.ts';
import useMessage from '../hooks/useMessage.ts';

const defaultSettings = {
  taskCreate: true,
  taskUpdate: true,
  taskDelete: true,
  taskStatusChange: true,
  requestCreate: true,
  requestUpdate: true,
  requestDelete: true,
  requestStatusChange: true,
  userCreate: true,
  userUpdate: true,
  userDelete: true,
  roleCreate: true,
  roleUpdate: true,
  roleDelete: true,
  worktimeStart: true,
  worktimeStop: true
};

const categorySettings = {
  task: ['taskCreate', 'taskUpdate', 'taskDelete', 'taskStatusChange'],
  request: ['requestCreate', 'requestUpdate', 'requestDelete', 'requestStatusChange'],
  user: ['userCreate', 'userUpdate', 'userDelete'],
  role: ['roleCreate', 'roleUpdate', 'roleDelete'],
  worktime: ['worktimeStart', 'worktimeStop'],
} as const;

type CategoryType = keyof typeof categorySettings;

const NotificationSettingsComponent: React.FC = () => {
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showMessage } = useMessage();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      console.log('Starte Abruf der Benachrichtigungseinstellungen...');
      const response = await notificationSettingsApi.getUserSettings();
      console.log('Erhaltene Einstellungen:', response.data);
      
      if (response?.data) {
        const newSettings: NotificationSettings = {...defaultSettings, ...response.data};
        setSettings(newSettings);
        console.log('Einstellungen aktualisiert:', newSettings);
      } else {
        console.warn('Keine Daten vom Server erhalten, verwende Standardeinstellungen');
        setSettings(defaultSettings);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Benachrichtigungseinstellungen:', error);
      setSettings(defaultSettings);
      showMessage('Einstellungen konnten nicht geladen werden. Standardeinstellungen werden verwendet.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target;
    
    const updatedSettings: NotificationSettings = {
      ...settings,
      [name]: checked
    };
    
    setSettings(updatedSettings);
    
    try {
      setSaving(true);
      await notificationSettingsApi.updateUserSettings(updatedSettings);
      showMessage('Einstellungen wurden erfolgreich gespeichert.', 'success');
    } catch (error) {
      console.error('Fehler beim Speichern der Einstellungen:', error);
      showMessage('Einstellungen konnten nicht gespeichert werden', 'error');
      
      setSettings(settings);
    } finally {
      setSaving(false);
    }
  };
  
  const toggleAllInCategory = async (category: string, value: boolean) => {
    const normalizedCategory = category.toLowerCase() as CategoryType;
    if (!categorySettings[normalizedCategory]) return;

    const updatedSettings = { ...settings };
    categorySettings[normalizedCategory].forEach(setting => {
      updatedSettings[setting as keyof NotificationSettings] = value;
    });

    setSettings(updatedSettings);
    
    try {
      setSaving(true);
      await notificationSettingsApi.updateUserSettings(updatedSettings);
      showMessage('Einstellungen wurden erfolgreich gespeichert.', 'success');
    } catch (error) {
      console.error('Fehler beim Speichern der Einstellungen:', error);
      showMessage('Einstellungen konnten nicht gespeichert werden', 'error');
      setSettings(settings);
    } finally {
      setSaving(false);
    }
  };
  
  const toggleAll = async (value: boolean) => {
    const updatedSettings: NotificationSettings = Object.keys(settings).reduce((acc, key) => {
      acc[key as keyof NotificationSettings] = value;
      return acc;
    }, { ...defaultSettings });
    
    setSettings(updatedSettings);
    
    try {
      setSaving(true);
      await notificationSettingsApi.updateUserSettings(updatedSettings);
      showMessage('Einstellungen wurden erfolgreich gespeichert.', 'success');
    } catch (error) {
      console.error('Fehler beim Speichern der Einstellungen:', error);
      showMessage('Einstellungen konnten nicht gespeichert werden', 'error');
      
      setSettings(settings);
    } finally {
      setSaving(false);
    }
  };

  const isAllCheckedInCategory = (category: string): boolean => {
    const normalizedCategory = category.toLowerCase() as CategoryType;
    if (!categorySettings[normalizedCategory]) return false;
    
    return categorySettings[normalizedCategory].every(setting => 
      settings[setting as keyof NotificationSettings] === true
    );
  };
  
  const isAllChecked = (): boolean => {
    if (!settings) return false;
    return Object.values(settings).every(value => value === true);
  };

  const CustomToggle: React.FC<{
    checked: boolean;
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    name: string;
    label: string;
    description?: string;
  }> = ({ checked, onChange, name, label, description }) => (
    <div className="flex items-center justify-between gap-8 group relative">
      <div className="flex-1">
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
      </div>
      <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={onChange}
          name={name}
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
      </label>
      {description && (
        <div className="absolute left-0 bottom-[calc(100%+0.5rem)] px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-normal max-w-xs pointer-events-none z-50">
          {description}
        </div>
      )}
    </div>
  );

  const renderToggleSection = (title: string, toggles: Array<{ name: keyof NotificationSettings, label: string, description: string }>) => (
    <div className="mb-6 mt-2">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium dark:text-white">{title}</h3>
        </div>
        <CustomToggle
          checked={isAllCheckedInCategory(title)}
          onChange={(e) => toggleAllInCategory(title, e.target.checked)}
          name={`${title.toLowerCase()}All`}
          label="Alle"
        />
      </div>
      <div className="space-y-4">
        {toggles.map(({ name, label, description }) => (
          <CustomToggle
            key={name}
            checked={settings[name]}
            onChange={handleChange}
            name={name}
            label={label}
            description={description}
          />
        ))}
      </div>
    </div>
  );

  if (loading) {
    return <Typography>Lade Einstellungen...</Typography>;
  }

  return (
    <Box className="p-4">
      <Typography 
        variant="body2" 
        className="text-gray-600 dark:text-gray-400 mb-6"
      >
        Wählen Sie aus, für welche Ereignisse Sie Benachrichtigungen erhalten möchten.
      </Typography>
      
      <div className="mb-8 mt-2">
        <div className="flex items-center justify-between mb-4">
          <div className="group relative">
            <h3 className="text-lg font-medium dark:text-white">Alle Benachrichtigungen</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Aktivieren oder deaktivieren Sie alle Benachrichtigungen</p>
            <div className="absolute left-0 bottom-[calc(100%+0.5rem)] px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-normal max-w-xs pointer-events-none z-50">
              Aktivieren oder deaktivieren Sie alle Benachrichtigungen
            </div>
          </div>
          <CustomToggle
            checked={isAllChecked()}
            onChange={(e) => toggleAll(e.target.checked)}
            name="allNotifications"
            label=""
          />
        </div>
      </div>
      
      <Divider className="my-8" />
      
      {renderToggleSection('Aufgaben', [
        { name: 'taskCreate', label: 'Neue Aufgaben', description: 'Benachrichtigung wenn eine neue Aufgabe erstellt wird' },
        { name: 'taskUpdate', label: 'Aufgaben-Aktualisierungen', description: 'Benachrichtigung wenn eine Aufgabe aktualisiert wird' },
        { name: 'taskDelete', label: 'Gelöschte Aufgaben', description: 'Benachrichtigung wenn eine Aufgabe gelöscht wird' },
        { name: 'taskStatusChange', label: 'Status-Änderungen', description: 'Benachrichtigung wenn sich der Status einer Aufgabe ändert' }
      ])}
      
      <Divider className="my-8" />
      
      {renderToggleSection('Anfragen', [
        { name: 'requestCreate', label: 'Neue Anfragen', description: 'Benachrichtigung wenn eine neue Anfrage erstellt wird' },
        { name: 'requestUpdate', label: 'Anfragen-Aktualisierungen', description: 'Benachrichtigung wenn eine Anfrage aktualisiert wird' },
        { name: 'requestDelete', label: 'Gelöschte Anfragen', description: 'Benachrichtigung wenn eine Anfrage gelöscht wird' },
        { name: 'requestStatusChange', label: 'Status-Änderungen', description: 'Benachrichtigung wenn sich der Status einer Anfrage ändert' }
      ])}
      
      <Divider className="my-8" />
      
      {renderToggleSection('Benutzer & Rollen', [
        { name: 'userCreate', label: 'Neue Benutzer', description: 'Benachrichtigung wenn ein neuer Benutzer erstellt wird' },
        { name: 'userUpdate', label: 'Benutzer-Aktualisierungen', description: 'Benachrichtigung wenn ein Benutzer aktualisiert wird' },
        { name: 'userDelete', label: 'Gelöschte Benutzer', description: 'Benachrichtigung wenn ein Benutzer gelöscht wird' },
        { name: 'roleCreate', label: 'Neue Rollen', description: 'Benachrichtigung wenn eine neue Rolle erstellt wird' },
        { name: 'roleUpdate', label: 'Rollen-Aktualisierungen', description: 'Benachrichtigung wenn eine Rolle aktualisiert wird' },
        { name: 'roleDelete', label: 'Gelöschte Rollen', description: 'Benachrichtigung wenn eine Rolle gelöscht wird' }
      ])}
      
      <Divider className="my-8" />
      
      {renderToggleSection('Zeiterfassung', [
        { name: 'worktimeStart', label: 'Zeiterfassung Start', description: 'Benachrichtigung wenn eine Zeiterfassung gestartet wird' },
        { name: 'worktimeStop', label: 'Zeiterfassung Stop', description: 'Benachrichtigung wenn eine Zeiterfassung gestoppt wird' }
      ])}
    </Box>
  );
};

export default NotificationSettingsComponent; 
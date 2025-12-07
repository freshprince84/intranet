import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
import { logger } from '../utils/logger.ts';

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
  const { t } = useTranslation();
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
      logger.log('Starte Abruf der Benachrichtigungseinstellungen...');
      const response = await notificationSettingsApi.getUserSettings();
      logger.log('Erhaltene Einstellungen:', response.data);
      
      if (response?.data) {
        const newSettings: NotificationSettings = {...defaultSettings, ...response.data};
        setSettings(newSettings);
        logger.log('Einstellungen aktualisiert:', newSettings);
      } else {
        console.warn('Keine Daten vom Server erhalten, verwende Standardeinstellungen');
        setSettings(defaultSettings);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Benachrichtigungseinstellungen:', error);
      setSettings(defaultSettings);
      showMessage(t('notifications.loadSettingsError'), 'error');
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
      showMessage(t('notifications.saveSuccess'), 'success');
    } catch (error) {
      console.error('Fehler beim Speichern der Einstellungen:', error);
      showMessage(t('notifications.saveError'), 'error');
      
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
      showMessage(t('notifications.saveSuccess'), 'success');
    } catch (error) {
      console.error('Fehler beim Speichern der Einstellungen:', error);
      showMessage(t('notifications.saveError'), 'error');
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
      showMessage(t('notifications.saveSuccess'), 'success');
    } catch (error) {
      console.error('Fehler beim Speichern der Einstellungen:', error);
      showMessage(t('notifications.saveError'), 'error');
      
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
        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
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
          label={t('notifications.all')}
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
    return <Typography>{t('notifications.loading')}</Typography>;
  }

  return (
    <Box className="p-4">
      <Typography 
        variant="body2" 
        className="text-gray-600 dark:text-gray-400 mb-6"
      >
        {t('notifications.description')}
      </Typography>
      
      <div className="mb-8 mt-2">
        <div className="flex items-center justify-between mb-4">
          <div className="group relative">
            <h3 className="text-lg font-medium dark:text-white">{t('notifications.allNotifications')}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('notifications.allNotificationsDescription')}</p>
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
              {t('notifications.allNotificationsDescription')}
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
      
      {renderToggleSection(t('notifications.categories.tasks'), [
        { name: 'taskCreate', label: t('notifications.events.taskCreate'), description: t('notifications.events.taskCreateDescription') },
        { name: 'taskUpdate', label: t('notifications.events.taskUpdate'), description: t('notifications.events.taskUpdateDescription') },
        { name: 'taskDelete', label: t('notifications.events.taskDelete'), description: t('notifications.events.taskDeleteDescription') },
        { name: 'taskStatusChange', label: t('notifications.events.taskStatusChange'), description: t('notifications.events.taskStatusChangeDescription') }
      ])}
      
      <Divider className="my-8" />
      
      {renderToggleSection(t('notifications.categories.requests'), [
        { name: 'requestCreate', label: t('notifications.events.requestCreate'), description: t('notifications.events.requestCreateDescription') },
        { name: 'requestUpdate', label: t('notifications.events.requestUpdate'), description: t('notifications.events.requestUpdateDescription') },
        { name: 'requestDelete', label: t('notifications.events.requestDelete'), description: t('notifications.events.requestDeleteDescription') },
        { name: 'requestStatusChange', label: t('notifications.events.requestStatusChange'), description: t('notifications.events.requestStatusChangeDescription') }
      ])}
      
      <Divider className="my-8" />
      
      {renderToggleSection(t('notifications.categories.usersAndRoles'), [
        { name: 'userCreate', label: t('notifications.events.userCreate'), description: t('notifications.events.userCreateDescription') },
        { name: 'userUpdate', label: t('notifications.events.userUpdate'), description: t('notifications.events.userUpdateDescription') },
        { name: 'userDelete', label: t('notifications.events.userDelete'), description: t('notifications.events.userDeleteDescription') },
        { name: 'roleCreate', label: t('notifications.events.roleCreate'), description: t('notifications.events.roleCreateDescription') },
        { name: 'roleUpdate', label: t('notifications.events.roleUpdate'), description: t('notifications.events.roleUpdateDescription') },
        { name: 'roleDelete', label: t('notifications.events.roleDelete'), description: t('notifications.events.roleDeleteDescription') }
      ])}
      
      <Divider className="my-8" />
      
      {renderToggleSection(t('notifications.categories.worktime'), [
        { name: 'worktimeStart', label: t('notifications.events.worktimeStart'), description: t('notifications.events.worktimeStartDescription') },
        { name: 'worktimeStop', label: t('notifications.events.worktimeStop'), description: t('notifications.events.worktimeStopDescription') }
      ])}
    </Box>
  );
};

export default NotificationSettingsComponent; 
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

const NotificationSettingsComponent: React.FC = () => {
  const [settings, setSettings] = useState<NotificationSettings>({
    taskCreate: false,
    taskUpdate: false,
    taskDelete: false,
    taskStatusChange: false,
    requestCreate: false,
    requestUpdate: false,
    requestDelete: false,
    requestStatusChange: false,
    userCreate: false,
    userUpdate: false,
    userDelete: false,
    roleCreate: false,
    roleUpdate: false,
    roleDelete: false,
    worktimeStart: false,
    worktimeStop: false,
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await notificationSettingsApi.getUserSettings();
      if (response.data) {
        setSettings(response.data);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Benachrichtigungseinstellungen:', error);
      setSnackbar({
        open: true,
        message: 'Einstellungen konnten nicht geladen werden.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target;
    
    // Aktualisierte Einstellungen erstellen
    const updatedSettings = {
      ...settings,
      [name]: checked
    };
    
    // Optimistisch lokal aktualisieren
    setSettings(updatedSettings);
    
    try {
      setSaving(true);
      await notificationSettingsApi.updateUserSettings(updatedSettings);
    } catch (error) {
      console.error('Fehler beim Speichern der Einstellungen:', error);
      setSnackbar({
        open: true,
        message: 'Einstellungen konnten nicht gespeichert werden',
        severity: 'error'
      });
      
      // Bei Fehler Änderung rückgängig machen
      setSettings(settings);
    } finally {
      setSaving(false);
    }
  };
  
  const toggleAllInCategory = async (category: 'task' | 'request' | 'user' | 'role' | 'worktime', value: boolean) => {
    const categorySettings = {
      task: ['taskCreate', 'taskUpdate', 'taskDelete', 'taskStatusChange'],
      request: ['requestCreate', 'requestUpdate', 'requestDelete', 'requestStatusChange'],
      user: ['userCreate', 'userUpdate', 'userDelete'],
      role: ['roleCreate', 'roleUpdate', 'roleDelete'],
      worktime: ['worktimeStart', 'worktimeStop'],
    };
    
    // Neuen Settings-Zustand erstellen
    const updatedSettings = { ...settings };
    categorySettings[category].forEach(setting => {
      updatedSettings[setting as keyof NotificationSettings] = value;
    });
    
    // Optimistisch lokal aktualisieren
    setSettings(updatedSettings);
    
    try {
      setSaving(true);
      await notificationSettingsApi.updateUserSettings(updatedSettings);
    } catch (error) {
      console.error('Fehler beim Speichern der Einstellungen:', error);
      setSnackbar({
        open: true,
        message: 'Einstellungen konnten nicht gespeichert werden',
        severity: 'error'
      });
      
      // Bei Fehler Änderung rückgängig machen
      setSettings(settings);
    } finally {
      setSaving(false);
    }
  };
  
  const toggleAll = async (value: boolean) => {
    // Alle Einstellungen auf den selben Wert setzen
    const updatedSettings = Object.keys(settings).reduce((acc, key) => {
      acc[key as keyof NotificationSettings] = value;
      return acc;
    }, {} as NotificationSettings);
    
    // Optimistisch lokal aktualisieren
    setSettings(updatedSettings);
    
    try {
      setSaving(true);
      await notificationSettingsApi.updateUserSettings(updatedSettings);
    } catch (error) {
      console.error('Fehler beim Speichern der Einstellungen:', error);
      setSnackbar({
        open: true,
        message: 'Einstellungen konnten nicht gespeichert werden',
        severity: 'error'
      });
      
      // Bei Fehler Änderung rückgängig machen
      setSettings(settings);
    } finally {
      setSaving(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Prüfen, ob alle Einstellungen in einer Kategorie aktiviert sind
  const isAllCheckedInCategory = (category: 'task' | 'request' | 'user' | 'role' | 'worktime'): boolean => {
    const categorySettings = {
      task: ['taskCreate', 'taskUpdate', 'taskDelete', 'taskStatusChange'],
      request: ['requestCreate', 'requestUpdate', 'requestDelete', 'requestStatusChange'],
      user: ['userCreate', 'userUpdate', 'userDelete'],
      role: ['roleCreate', 'roleUpdate', 'roleDelete'],
      worktime: ['worktimeStart', 'worktimeStop'],
    };
    
    return categorySettings[category].every(setting => 
      settings[setting as keyof NotificationSettings]
    );
  };
  
  // Prüfen, ob alle Einstellungen aktiviert sind
  const isAllChecked = (): boolean => {
    return Object.values(settings).every(value => value === true);
  };

  if (loading) {
    return <Typography>Lade Einstellungen...</Typography>;
  }

  return (
    <Box sx={{ p: 0, pt: 2 }}>
      <Typography 
        variant="body2" 
        color="textSecondary" 
        sx={{ mb: 3, color: "text.secondary" }}
      >
        Wählen Sie aus, für welche Ereignisse Sie Benachrichtigungen erhalten möchten.
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <FormControlLabel
          control={
            <Switch 
              checked={isAllChecked()}
              onChange={(e) => toggleAll(e.target.checked)}
              disabled={saving}
            />
          }
          label={<Typography sx={{ fontWeight: 'bold' }}>Alle Benachrichtigungen</Typography>}
        />
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography 
              variant="h6" 
              sx={{ fontSize: "1.125rem", fontWeight: 500, mr: 2 }}
            >
              Aufgaben
            </Typography>
            <FormControlLabel
              control={
                <Switch 
                  size="small"
                  checked={isAllCheckedInCategory('task')}
                  onChange={(e) => toggleAllInCategory('task', e.target.checked)}
                  disabled={saving}
                />
              }
              label={<Typography variant="body2">Alle</Typography>}
            />
          </Box>
          <Box sx={{ ml: 2, mb: 2 }}>
            <FormControlLabel
              control={
                <Switch 
                  checked={settings.taskCreate}
                  onChange={handleChange}
                  name="taskCreate"
                  disabled={saving}
                />
              }
              label="Neue Aufgabe erstellt"
            />
            <FormControlLabel
              control={
                <Switch 
                  checked={settings.taskUpdate}
                  onChange={handleChange}
                  name="taskUpdate"
                  disabled={saving}
                />
              }
              label="Aufgabe aktualisiert"
            />
            <FormControlLabel
              control={
                <Switch 
                  checked={settings.taskDelete}
                  onChange={handleChange}
                  name="taskDelete"
                  disabled={saving}
                />
              }
              label="Aufgabe gelöscht"
            />
            <FormControlLabel
              control={
                <Switch 
                  checked={settings.taskStatusChange}
                  onChange={handleChange}
                  name="taskStatusChange"
                  disabled={saving}
                />
              }
              label="Status einer Aufgabe geändert"
            />
          </Box>
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography 
              variant="h6" 
              sx={{ fontSize: "1.125rem", fontWeight: 500, mr: 2 }}
            >
              Anfragen
            </Typography>
            <FormControlLabel
              control={
                <Switch 
                  size="small"
                  checked={isAllCheckedInCategory('request')}
                  onChange={(e) => toggleAllInCategory('request', e.target.checked)}
                  disabled={saving}
                />
              }
              label={<Typography variant="body2">Alle</Typography>}
            />
          </Box>
          <Box sx={{ ml: 2, mb: 2 }}>
            <FormControlLabel
              control={
                <Switch 
                  checked={settings.requestCreate}
                  onChange={handleChange}
                  name="requestCreate"
                  disabled={saving}
                />
              }
              label="Neue Anfrage erstellt"
            />
            <FormControlLabel
              control={
                <Switch 
                  checked={settings.requestUpdate}
                  onChange={handleChange}
                  name="requestUpdate"
                  disabled={saving}
                />
              }
              label="Anfrage aktualisiert"
            />
            <FormControlLabel
              control={
                <Switch 
                  checked={settings.requestDelete}
                  onChange={handleChange}
                  name="requestDelete"
                  disabled={saving}
                />
              }
              label="Anfrage gelöscht"
            />
            <FormControlLabel
              control={
                <Switch 
                  checked={settings.requestStatusChange}
                  onChange={handleChange}
                  name="requestStatusChange"
                  disabled={saving}
                />
              }
              label="Status einer Anfrage geändert"
            />
          </Box>
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography 
              variant="h6" 
              sx={{ fontSize: "1.125rem", fontWeight: 500, mr: 2 }}
            >
              Benutzerverwaltung
            </Typography>
            <FormControlLabel
              control={
                <Switch 
                  size="small"
                  checked={isAllCheckedInCategory('user')}
                  onChange={(e) => toggleAllInCategory('user', e.target.checked)}
                  disabled={saving}
                />
              }
              label={<Typography variant="body2">Alle</Typography>}
            />
          </Box>
          <Box sx={{ ml: 2, mb: 2 }}>
            <FormControlLabel
              control={
                <Switch 
                  checked={settings.userCreate}
                  onChange={handleChange}
                  name="userCreate"
                  disabled={saving}
                />
              }
              label="Neuer Benutzer erstellt"
            />
            <FormControlLabel
              control={
                <Switch 
                  checked={settings.userUpdate}
                  onChange={handleChange}
                  name="userUpdate"
                  disabled={saving}
                />
              }
              label="Benutzer aktualisiert"
            />
            <FormControlLabel
              control={
                <Switch 
                  checked={settings.userDelete}
                  onChange={handleChange}
                  name="userDelete"
                  disabled={saving}
                />
              }
              label="Benutzer gelöscht"
            />
          </Box>
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography 
              variant="h6" 
              sx={{ fontSize: "1.125rem", fontWeight: 500, mr: 2 }}
            >
              Rollen
            </Typography>
            <FormControlLabel
              control={
                <Switch 
                  size="small"
                  checked={isAllCheckedInCategory('role')}
                  onChange={(e) => toggleAllInCategory('role', e.target.checked)}
                  disabled={saving}
                />
              }
              label={<Typography variant="body2">Alle</Typography>}
            />
          </Box>
          <Box sx={{ ml: 2, mb: 2 }}>
            <FormControlLabel
              control={
                <Switch 
                  checked={settings.roleCreate}
                  onChange={handleChange}
                  name="roleCreate"
                  disabled={saving}
                />
              }
              label="Neue Rolle erstellt"
            />
            <FormControlLabel
              control={
                <Switch 
                  checked={settings.roleUpdate}
                  onChange={handleChange}
                  name="roleUpdate"
                  disabled={saving}
                />
              }
              label="Rolle aktualisiert"
            />
            <FormControlLabel
              control={
                <Switch 
                  checked={settings.roleDelete}
                  onChange={handleChange}
                  name="roleDelete"
                  disabled={saving}
                />
              }
              label="Rolle gelöscht"
            />
          </Box>
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography 
              variant="h6" 
              sx={{ fontSize: "1.125rem", fontWeight: 500, mr: 2 }}
            >
              Arbeitszeit
            </Typography>
            <FormControlLabel
              control={
                <Switch 
                  size="small"
                  checked={isAllCheckedInCategory('worktime')}
                  onChange={(e) => toggleAllInCategory('worktime', e.target.checked)}
                  disabled={saving}
                />
              }
              label={<Typography variant="body2">Alle</Typography>}
            />
          </Box>
          <Box sx={{ ml: 2, mb: 2 }}>
            <FormControlLabel
              control={
                <Switch 
                  checked={settings.worktimeStart}
                  onChange={handleChange}
                  name="worktimeStart"
                  disabled={saving}
                />
              }
              label="Zeiterfassung gestartet"
            />
            <FormControlLabel
              control={
                <Switch 
                  checked={settings.worktimeStop}
                  onChange={handleChange}
                  name="worktimeStop"
                  disabled={saving}
                />
              }
              label="Zeiterfassung gestoppt"
            />
          </Box>
        </Grid>
      </Grid>

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default NotificationSettingsComponent; 
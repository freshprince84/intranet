import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  FormControlLabel, 
  Switch, 
  Button, 
  Grid, 
  Divider,
  Snackbar,
  Alert
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

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target;
    setSettings(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    
    try {
      await notificationSettingsApi.updateUserSettings(settings);
      setSnackbar({
        open: true,
        message: 'Einstellungen erfolgreich gespeichert',
        severity: 'success'
      });
    } catch (error) {
      console.error('Fehler beim Speichern der Einstellungen:', error);
      setSnackbar({
        open: true,
        message: 'Einstellungen konnten nicht gespeichert werden',
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  if (loading) {
    return <Typography>Lade Einstellungen...</Typography>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Wählen Sie aus, für welche Ereignisse Sie Benachrichtigungen erhalten möchten.
      </Typography>
      
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Aufgaben
            </Typography>
            <Box sx={{ ml: 2 }}>
              <FormControlLabel
                control={
                  <Switch 
                    checked={settings.taskCreate}
                    onChange={handleChange}
                    name="taskCreate"
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
                  />
                }
                label="Status einer Aufgabe geändert"
              />
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="h6" gutterBottom>
              Anfragen
            </Typography>
            <Box sx={{ ml: 2 }}>
              <FormControlLabel
                control={
                  <Switch 
                    checked={settings.requestCreate}
                    onChange={handleChange}
                    name="requestCreate"
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
                  />
                }
                label="Status einer Anfrage geändert"
              />
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="h6" gutterBottom>
              Benutzerverwaltung
            </Typography>
            <Box sx={{ ml: 2 }}>
              <FormControlLabel
                control={
                  <Switch 
                    checked={settings.userCreate}
                    onChange={handleChange}
                    name="userCreate"
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
                  />
                }
                label="Benutzer gelöscht"
              />
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="h6" gutterBottom>
              Rollenverwaltung
            </Typography>
            <Box sx={{ ml: 2 }}>
              <FormControlLabel
                control={
                  <Switch 
                    checked={settings.roleCreate}
                    onChange={handleChange}
                    name="roleCreate"
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
                  />
                }
                label="Rolle gelöscht"
              />
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="h6" gutterBottom>
              Zeiterfassung
            </Typography>
            <Box sx={{ ml: 2 }}>
              <FormControlLabel
                control={
                  <Switch 
                    checked={settings.worktimeStart}
                    onChange={handleChange}
                    name="worktimeStart"
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
                  />
                }
                label="Zeiterfassung gestoppt"
              />
            </Box>
          </Grid>

          <Grid item xs={12} sx={{ mt: 2 }}>
            <Button 
              type="submit" 
              variant="contained" 
              color="primary"
              disabled={saving}
              sx={{ 
                py: '0.5rem', 
                px: '1rem', 
                bgcolor: 'rgb(37 99 235)', 
                '&:hover': { bgcolor: 'rgb(29 78 216)' } 
              }}
            >
              {saving ? 'Speichern...' : 'Einstellungen speichern'}
            </Button>
          </Grid>
        </Grid>
      </form>

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
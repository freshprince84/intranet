import React, { useState, useEffect } from 'react';
import { organizationService } from '../../services/organizationService.ts';
import { Organization, UpdateOrganizationRequest } from '../../types/organization.ts';
import { usePermissions } from '../../hooks/usePermissions.ts';

const OrganizationSettings: React.FC = () => {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [formData, setFormData] = useState<UpdateOrganizationRequest>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { canViewOrganization, canManageOrganization, loading: permissionsLoading } = usePermissions();

  useEffect(() => {
    // Warte bis Berechtigungen geladen sind
    if (permissionsLoading) {
      return;
    }
    
    const fetchOrganization = async () => {
      try {
        const org = await organizationService.getCurrentOrganization();
        setOrganization(org);
        setFormData({
          displayName: org.displayName || '',
          domain: org.domain || '',
          logo: org.logo || '',
          settings: org.settings
        });
      } catch (err) {
        setError('Fehler beim Laden der Organisation');
      } finally {
        setLoading(false);
      }
    };

    if (canViewOrganization()) {
      fetchOrganization();
    } else {
      setError('Keine Berechtigung zum Anzeigen der Organisation');
      setLoading(false);
    }
  }, [canViewOrganization, permissionsLoading]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canManageOrganization()) {
      setError('Keine Berechtigung zum Bearbeiten der Organisation');
      return;
    }
    
    try {
      setLoading(true);
      await organizationService.updateOrganization(formData);
      setError(null);
      alert('Organisation erfolgreich aktualisiert');
    } catch (err) {
      setError('Fehler beim Aktualisieren der Organisation');
    } finally {
      setLoading(false);
    }
  };

  if (permissionsLoading) {
    return <p>Lade Berechtigungen...</p>;
  }

  if (!canViewOrganization()) {
    return (
      <div className="p-4 text-red-600 dark:text-red-400">
        Keine Berechtigung zum Anzeigen der Organisationseinstellungen.
      </div>
    );
  }

  if (loading) return <p>Laden...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <h2>Organisationseinstellungen</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="displayName">Anzeigename</label>
          <input
            type="text"
            id="displayName"
            name="displayName"
            value={formData.displayName || ''}
            onChange={handleChange}
            disabled={!canManageOrganization()}
          />
        </div>
        <div>
          <label htmlFor="domain">Domain</label>
          <input
            type="text"
            id="domain"
            name="domain"
            value={formData.domain || ''}
            onChange={handleChange}
            disabled={!canManageOrganization()}
          />
        </div>
        <div>
          <label htmlFor="logo">Logo URL</label>
          <input
            type="text"
            id="logo"
            name="logo"
            value={formData.logo || ''}
            onChange={handleChange}
            disabled={!canManageOrganization()}
          />
        </div>
        {canManageOrganization() && (
          <button type="submit">Speichern</button>
        )}
      </form>
    </div>
  );
};

export default OrganizationSettings; 
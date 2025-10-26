import React, { createContext, useContext, useState, useEffect } from 'react';
import { organizationService } from '../services/organizationService.ts';
import { Organization } from '../types/organization.ts';

interface OrganizationContextProps {
  organization: Organization | null;
  loading: boolean;
  error: string | null;
  refreshOrganization: () => void;
}

const OrganizationContext = createContext<OrganizationContextProps | undefined>(undefined);

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrganization = async () => {
    try {
      setLoading(true);
      const org = await organizationService.getCurrentOrganization();
      setOrganization(org);
      setError(null);
    } catch (err) {
      setError('Fehler beim Laden der Organisation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganization();
  }, []);

  return (
    <OrganizationContext.Provider value={{ organization, loading, error, refreshOrganization: fetchOrganization }}>
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization muss innerhalb eines OrganizationProviders verwendet werden');
  }
  return context;
}; 
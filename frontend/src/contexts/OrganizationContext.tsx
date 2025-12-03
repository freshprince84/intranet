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

  const fetchOrganization = async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const org = await organizationService.getCurrentOrganization(signal);
      
      // Prüfe ob Request abgebrochen wurde
      if (signal?.aborted) {
        return;
      }
      
      setOrganization(org);
      setError(null);
    } catch (err: any) {
      // Ignoriere Abort-Errors
      if (err.name === 'AbortError' || err.name === 'CanceledError') {
        return;
      }
      
      // Prüfe ob Request abgebrochen wurde
      if (signal?.aborted) {
        return;
      }
      
      setError('Fehler beim Laden der Organisation');
    } finally {
      // Nur loading setzen wenn nicht abgebrochen
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    // ✅ MEMORY: Verzögertes Laden - nicht sofort beim Mount, sondern nach kurzem Delay
    // Dies reduziert die Anzahl der parallelen API-Calls beim Initial Load
    const abortController = new AbortController();
    
    const timeoutId = setTimeout(() => {
      fetchOrganization(abortController.signal);
    }, 100); // 100ms Delay - gibt anderen kritischen Requests Vorrang
    
    return () => {
      clearTimeout(timeoutId);
      abortController.abort();
    };
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
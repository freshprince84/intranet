import React, { useEffect } from 'react';
import { API_URL } from '../config/api.ts';

const FaviconLoader: React.FC = () => {
  useEffect(() => {
    const loadFavicon = async () => {
      try {
        // Versuche das Logo über die Base64-Route zu laden, da diese meist weniger CORS-Probleme hat
        const response = await fetch(`${API_URL}/settings/logo/base64`, {
          method: 'GET'
        });

        if (response.ok) {
          const data = await response.json();
          
          // Finde das Favicon-Element und setze den href
          const favicon = document.getElementById('favicon') as HTMLLinkElement;
          if (favicon && data.logo) {
            favicon.href = data.logo; // Das ist bereits eine vollständige data-URL
            console.log('Favicon erfolgreich aktualisiert');
          }
        } else {
          console.warn('Favicon konnte nicht geladen werden:', response.status);
        }
      } catch (error) {
        console.error('Fehler beim Laden des Favicons:', error);
      }
    };

    loadFavicon();
  }, []);

  // Diese Komponente rendert nichts sichtbares
  return null;
};

export default FaviconLoader; 
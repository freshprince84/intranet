import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { API_URL } from '../config/api';

interface IconData {
  size: string;
  scale?: string;
  data: string;
}

interface IconsResponse {
  ios: IconData[];
  android: IconData[];
}

const DynamicAppIcon: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAndUpdateAppIcon();
  }, []);

  const loadAndUpdateAppIcon = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Hole Icons vom Backend
      const response = await fetch(`${API_URL}/settings/logo/mobile`);
      if (!response.ok) {
        throw new Error('Fehler beim Laden der Icons');
      }

      const data: IconsResponse = await response.json();
      const icons = Platform.select({
        ios: data.ios,
        android: data.android,
        default: []
      });

      if (!icons || icons.length === 0) {
        throw new Error('Keine Icons für diese Plattform gefunden');
      }

      // Erstelle Verzeichnis für Icons falls nicht vorhanden
      const iconDir = Platform.select({
        ios: `${RNFS.DocumentDirectoryPath}/app_icons`,
        android: `${RNFS.ExternalDirectoryPath}/app_icons`,
        default: ''
      });

      if (iconDir) {
        const exists = await RNFS.exists(iconDir);
        if (!exists) {
          await RNFS.mkdir(iconDir);
        }

        // Speichere Icons
        await Promise.all(
          icons.map(async (icon) => {
            const fileName = `icon_${icon.size}${icon.scale ? `_${icon.scale}` : ''}.png`;
            const filePath = `${iconDir}/${fileName}`;
            
            await RNFS.writeFile(
              filePath,
              icon.data,
              'base64'
            );
          })
        );

        console.log('App Icons erfolgreich aktualisiert');
      }
    } catch (err) {
      console.error('Fehler beim Aktualisieren der App Icons:', err);
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setIsLoading(false);
    }
  };

  // Diese Komponente rendert nichts sichtbares
  return null;
};

export default DynamicAppIcon; 
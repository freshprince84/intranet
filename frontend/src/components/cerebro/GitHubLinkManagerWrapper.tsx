import React from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import GitHubLinkManager from './GitHubLinkManager.tsx';
import { CerebroExternalLink } from '../../api/cerebroApi.ts';

/**
 * Diese Komponente dient als Wrapper für den GitHubLinkManager.
 * Sie liest den slug-Parameter aus der URL und übergibt ihn an den GitHubLinkManager.
 */
const GitHubLinkManagerWrapper: React.FC = () => {
  const { t } = useTranslation();
  // URL-Parameter auslesen
  const { slug } = useParams<{ slug: string }>();
  
  // Callback-Funktionen für Hinzufügen/Entfernen von Links
  const handleLinkAdded = (link: CerebroExternalLink) => {
    console.log('Link hinzugefügt:', link);
  };
  
  const handleLinkRemoved = (id: string) => {
    console.log('Link entfernt:', id);
  };
  
  // Prüfen, ob slug vorhanden ist
  if (!slug) {
    return (
      <div className="w-full p-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h1 className="text-xl font-semibold mb-4 dark:text-white">Fehler</h1>
          <p className="dark:text-gray-300">Kein Artikel-Slug angegeben.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="w-full p-4">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h1 className="text-xl font-semibold mb-4 dark:text-white">{t('githubLink.addTitle')}</h1>
        <GitHubLinkManager 
          articleSlug={slug} 
          onLinkAdded={handleLinkAdded}
          onLinkRemoved={handleLinkRemoved}
        />
      </div>
    </div>
  );
};

export default GitHubLinkManagerWrapper; 
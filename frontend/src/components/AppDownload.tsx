import React from 'react';
import { Link } from 'react-router-dom';
import { DevicePhoneMobileIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

// Konfiguration für die App-Downloads
const APP_CONFIG = {
  // Die URL zum direkten APK-Download
  apkDownloadUrl: 'https://65.109.228.106.nip.io/downloads/intranet-app.apk',
  
  // URLs für die App Stores (aktuell Platzhalter, später durch echte Links ersetzen)
  androidStoreUrl: 'https://play.google.com/store/apps/details?id=com.yourcompany.intranetapp',
  iosStoreUrl: 'https://apps.apple.com/app/intranet-app/id1234567890',
  
  // Landing-Page für die App (mit weiteren Informationen)
  appLandingPageUrl: 'https://65.109.228.106.nip.io/mobile-app',
};

const AppDownload: React.FC = () => {
  return (
    <div className="bg-white rounded-lg border border-gray-300 dark:border-gray-700 p-6 shadow-sm">
      <div className="flex flex-col md:flex-row items-center justify-between">
        <div className="flex items-center mb-4 md:mb-0">
          <div className="bg-blue-100 p-3 rounded-full mr-4">
            <DevicePhoneMobileIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">Intranet Mobile App</h3>
            <p className="text-sm text-gray-500">
              Greife auch unterwegs auf deine Arbeitszeiten und Anfragen zu
            </p>
          </div>
        </div>
        
        <Link 
          to="/mobile-app" 
          className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          App herunterladen
          <ArrowRightIcon className="ml-2 -mr-1 h-4 w-4" />
        </Link>
      </div>
    </div>
  );
};

export default AppDownload; 
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';
import { 
  DevicePhoneMobileIcon, 
  ArrowDownTrayIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  BellAlertIcon, 
  WifiIcon 
} from '@heroicons/react/24/outline';

// Standard-Konfiguration als Fallback
const DEFAULT_APP_CONFIG = {
  android: {
    version: '1.0.0',
    downloadUrl: 'https://65.109.228.106.nip.io/downloads/intranet-app.apk',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.yourcompany.intranetapp'
  },
  ios: {
    version: '1.0.0',
    appStoreUrl: 'https://apps.apple.com/app/intranet-app/id1234567890'
  },
  lastUpdate: '24.03.2023'
};

// Feature-Liste mit Icons
const FEATURES = [
  {
    id: 1,
    title: 'Zeiterfassung',
    description: 'Erfasse deine Arbeitszeit bequem von unterwegs',
    icon: ClockIcon,
  },
  {
    id: 2,
    title: 'Aufgaben & Anfragen',
    description: 'Verwalte und bearbeite Aufgaben und Anfragen',
    icon: CheckCircleIcon,
  },
  {
    id: 3,
    title: 'Benachrichtigungen',
    description: 'Erhalte Push-Benachrichtigungen zu wichtigen Updates',
    icon: BellAlertIcon,
  },
  {
    id: 4,
    title: 'Offline-Modus',
    description: 'Auch ohne Internetverbindung produktiv arbeiten',
    icon: WifiIcon,
  },
];

const MobileAppLanding: React.FC = () => {
  const [appInfo, setAppInfo] = useState(DEFAULT_APP_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAppInfo = async () => {
      try {
        const response = await axios.get('/api/mobile-app/info');
        setAppInfo(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Fehler beim Laden der App-Informationen:', err);
        setError('App-Informationen konnten nicht geladen werden. Standardwerte werden verwendet.');
        setLoading(false);
      }
    };

    fetchAppInfo();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <Link to="/" className="text-blue-600 hover:text-blue-800 mb-8 inline-block">
            ← Zurück zum Dashboard
          </Link>
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
            Intranet Mobile App
          </h1>
          <p className="mt-5 max-w-xl mx-auto text-xl text-gray-500">
            Greife auch unterwegs auf das Intranet zu und bleibe immer produktiv.
          </p>
          
          {error && (
            <div className="mt-4 text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
              {error}
            </div>
          )}
        </div>

        {/* App-Mockup und Download-Links */}
        <div className="flex flex-col lg:flex-row items-center justify-center gap-12 mb-16">
          {/* Phone Mockup (Platzhalter) */}
          <div className="relative w-64 h-[500px] bg-gray-800 rounded-3xl overflow-hidden shadow-xl flex items-center justify-center">
            <div className="absolute inset-1 bg-white rounded-2xl">
              <div className="w-full h-full flex items-center justify-center">
                <DevicePhoneMobileIcon className="h-20 w-20 text-blue-600" />
                <span className="absolute bottom-10 text-center text-sm text-gray-600">
                  Intranet Mobile App
                </span>
              </div>
            </div>
          </div>

          {/* Download-Optionen */}
          <div className="max-w-md">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Jetzt herunterladen
            </h2>

            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-lg text-gray-900">Android</h3>
                <div className="mt-3 space-y-3">
                  <a
                    href={appInfo.android.playStoreUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-full px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                    Google Play Store
                  </a>
                  <a
                    href={appInfo.android.downloadUrl}
                    className="flex items-center justify-center w-full px-4 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                    APK direkt herunterladen
                  </a>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-lg text-gray-900">iOS</h3>
                <div className="mt-3">
                  <a
                    href={appInfo.ios.appStoreUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-full px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                    Apple App Store
                  </a>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Version: {appInfo.android.version}</span>
                  <span>Zuletzt aktualisiert: {appInfo.lastUpdate}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="py-12">
          <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-12">
            Funktionen
          </h2>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <div key={feature.id} className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-100 text-blue-600 mb-4">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">{feature.title}</h3>
                <p className="mt-2 text-base text-gray-500">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* QR-Code-Bereich */}
        <div className="py-12 flex flex-col items-center">
          <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-8">
            Direkt zum Download
          </h2>
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <QRCodeSVG
              value={appInfo.android.downloadUrl}
              size={200}
              includeMargin={true}
              bgColor={'#ffffff'}
              fgColor={'#000000'}
              level={'H'}
            />
          </div>
          <p className="mt-4 text-base text-gray-500">
            Scanne den QR-Code mit deinem Smartphone, um die App direkt herunterzuladen
          </p>
        </div>
      </div>
    </div>
  );
};

export default MobileAppLanding; 
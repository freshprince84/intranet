// Asset-Registrierung für React Navigation
// Diese Datei löst das Problem mit "missing-asset-registry-path"

// Importiere Asset-Registry von React Native
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Image } from 'react-native';

// Registriere die Assets, die von React Navigation verwendet werden
// Diese Importe werden nicht direkt verwendet, aber sie registrieren die Assets
export const backIconMask = require('@react-navigation/elements/lib/commonjs/assets/back-icon-mask.png');

// Exportiere eine leere Funktion, die wir im Hauptmodul aufrufen können,
// um sicherzustellen, dass diese Datei immer geladen wird
export function registerNavigationAssets() {
  // Diese Funktion muss nicht wirklich etwas tun
  // Der Import der Assets oben ist das, was wichtig ist
  return true;
} 
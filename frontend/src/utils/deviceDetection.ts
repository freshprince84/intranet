/**
 * Überprüft, ob das aktuelle Gerät ein mobiles Gerät ist
 * Basierend auf User-Agent und/oder Bildschirmgröße
 */
export const isMobile = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
};

/**
 * Überprüft, ob das Gerät über eine Kamera verfügt
 * Versucht, auf die Kameraeinrichtungen zuzugreifen
 */
export const hasCamera = async (): Promise<boolean> => {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    return false;
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.some(device => device.kind === 'videoinput');
  } catch (error) {
    console.error('Fehler beim Überprüfen der Kameraverfügbarkeit:', error);
    return false;
  }
};

/**
 * Überprüft, ob der User-Agent auf ein Android-Gerät hinweist
 */
export const isAndroid = (): boolean => {
  return /Android/i.test(navigator.userAgent);
};

/**
 * Überprüft, ob der User-Agent auf ein iOS-Gerät hinweist
 */
export const isIOS = (): boolean => {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}; 
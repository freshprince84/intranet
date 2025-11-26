import crypto from 'crypto';

/**
 * Verschlüsselungs-Utility für sensitive Daten (API-Keys, Secrets)
 * 
 * Verwendet AES-256-GCM für sichere Verschlüsselung mit Authentifizierung
 * 
 * WICHTIG: ENCRYPTION_KEY muss in .env gesetzt sein:
 * ENCRYPTION_KEY=<64 hex characters> (32 bytes = 256 bits)
 * 
 * Generierung: node -e "console.log(crypto.randomBytes(32).toString('hex'))"
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 16 bytes für AES
const AUTH_TAG_LENGTH = 16; // 16 bytes für GCM

/**
 * Verschlüsselt einen String
 * 
 * @param text - Der zu verschlüsselnde Text
 * @returns Verschlüsselter String im Format: iv:authTag:encrypted
 * @throws Error wenn ENCRYPTION_KEY nicht gesetzt ist
 */
export const encryptSecret = (text: string): string => {
  if (!text) {
    return text; // Leere Strings nicht verschlüsseln
  }

  const encryptionKey = process.env.ENCRYPTION_KEY;
  
  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }

  // Validiere Key-Länge (64 hex characters = 32 bytes)
  if (encryptionKey.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }

  try {
    const key = Buffer.from(encryptionKey, 'hex');
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Error encrypting secret:', error);
    throw new Error('Failed to encrypt secret');
  }
};

/**
 * Entschlüsselt einen verschlüsselten String
 * 
 * @param encryptedText - Verschlüsselter String im Format: iv:authTag:encrypted
 * @returns Entschlüsselter Text
 * @throws Error wenn ENCRYPTION_KEY nicht gesetzt ist oder Entschlüsselung fehlschlägt
 */
export const decryptSecret = (encryptedText: string): string => {
  if (!encryptedText) {
    return encryptedText; // Leere Strings nicht entschlüsseln
  }

  // Prüfe ob bereits verschlüsselt (Format: iv:authTag:encrypted)
  if (!encryptedText.includes(':')) {
    // Nicht verschlüsselt (für Migration bestehender Daten)
    return encryptedText;
  }

  const encryptionKey = process.env.ENCRYPTION_KEY;
  
  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }

  // Validiere Key-Länge
  if (encryptionKey.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }

  try {
    const parts = encryptedText.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted text format');
    }

    const [ivHex, authTagHex, encrypted] = parts;
    const key = Buffer.from(encryptionKey, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Error decrypting secret:', error);
    throw new Error('Failed to decrypt secret - invalid key or corrupted data');
  }
};

/**
 * Verschlüsselt alle API-Keys in OrganizationSettings
 * 
 * @param settings - OrganizationSettings Objekt
 * @returns Settings mit verschlüsselten API-Keys
 */
export const encryptApiSettings = (settings: any): any => {
  if (!settings || typeof settings !== 'object') {
    return settings;
  }

  const encrypted = { ...settings };

  // LobbyPMS API Key
  if (encrypted.lobbyPms?.apiKey) {
    encrypted.lobbyPms = {
      ...encrypted.lobbyPms,
      apiKey: encryptSecret(encrypted.lobbyPms.apiKey)
    };
  }

  // TTLock Client Secret
  if (encrypted.doorSystem?.clientSecret) {
    encrypted.doorSystem = {
      ...encrypted.doorSystem,
      clientSecret: encryptSecret(encrypted.doorSystem.clientSecret)
    };
  }

  // Bold Payment API Key
  if (encrypted.boldPayment?.apiKey) {
    encrypted.boldPayment = {
      ...encrypted.boldPayment,
      apiKey: encryptSecret(encrypted.boldPayment.apiKey)
    };
  }

  // WhatsApp API Key & Secret
  if (encrypted.whatsapp?.apiKey) {
    encrypted.whatsapp = {
      ...encrypted.whatsapp,
      apiKey: encryptSecret(encrypted.whatsapp.apiKey)
    };
  }
  if (encrypted.whatsapp?.apiSecret) {
    encrypted.whatsapp = {
      ...encrypted.whatsapp,
      apiSecret: encryptSecret(encrypted.whatsapp.apiSecret)
    };
  }

  return encrypted;
};

/**
 * Entschlüsselt alle API-Keys in OrganizationSettings
 * 
 * @param settings - OrganizationSettings Objekt mit verschlüsselten Keys
 * @returns Settings mit entschlüsselten API-Keys
 */
export const decryptApiSettings = (settings: any): any => {
  if (!settings || typeof settings !== 'object') {
    return settings;
  }

  const decrypted = { ...settings };

  // LobbyPMS API Key
  if (decrypted.lobbyPms?.apiKey) {
    try {
      // Prüfe ob Key verschlüsselt ist (Format: iv:authTag:encrypted)
      if (decrypted.lobbyPms.apiKey.includes(':')) {
        // Verschlüsselt - versuche zu entschlüsseln
        decrypted.lobbyPms = {
          ...decrypted.lobbyPms,
          apiKey: decryptSecret(decrypted.lobbyPms.apiKey)
        };
      }
      // Wenn nicht verschlüsselt, bleibt der Key unverändert (für Migration)
    } catch (error) {
      console.error('Error decrypting LobbyPMS API key:', error);
      // Bei Fehler: Key bleibt wie er ist (verschlüsselt oder unverschlüsselt)
    }
  }

  // TTLock Client ID
  if (decrypted.doorSystem?.clientId) {
    try {
      if (decrypted.doorSystem.clientId.includes(':')) {
        decrypted.doorSystem = {
          ...decrypted.doorSystem,
          clientId: decryptSecret(decrypted.doorSystem.clientId)
        };
      }
    } catch (error) {
      console.error('Error decrypting TTLock client ID:', error);
    }
  }

  // TTLock Client Secret
  if (decrypted.doorSystem?.clientSecret) {
    try {
      if (decrypted.doorSystem.clientSecret.includes(':')) {
      decrypted.doorSystem = {
        ...decrypted.doorSystem,
        clientSecret: decryptSecret(decrypted.doorSystem.clientSecret)
      };
      }
    } catch (error) {
      console.error('Error decrypting TTLock client secret:', error);
    }
  }

  // Bold Payment API Key
  if (decrypted.boldPayment?.apiKey) {
    try {
      decrypted.boldPayment = {
        ...decrypted.boldPayment,
        apiKey: decryptSecret(decrypted.boldPayment.apiKey)
      };
    } catch (error) {
      console.error('Error decrypting Bold Payment API key:', error);
    }
  }

  // WhatsApp API Key & Secret
  if (decrypted.whatsapp?.apiKey) {
    try {
      // Versuche immer zu entschlüsseln, wenn der String ein ':' enthält (verschlüsseltes Format)
      if (decrypted.whatsapp.apiKey.includes(':')) {
        const encryptedLength = decrypted.whatsapp.apiKey.length;
        const decryptedKey = decryptSecret(decrypted.whatsapp.apiKey);
        console.log('[WhatsApp Token Debug] Entschlüsselung:', {
          encryptedLength,
          decryptedLength: decryptedKey.length,
          decryptedStart: decryptedKey.substring(0, 30),
          decryptedEnd: decryptedKey.substring(decryptedKey.length - 30),
          containsColon: decryptedKey.includes(':'),
          isValidFormat: /^[A-Za-z0-9]+$/.test(decryptedKey)
        });
        decrypted.whatsapp = {
          ...decrypted.whatsapp,
          apiKey: decryptedKey
        };
      } else {
        console.log('[WhatsApp Token Debug] Token ist bereits unverschlüsselt:', {
          length: decrypted.whatsapp.apiKey.length,
          start: decrypted.whatsapp.apiKey.substring(0, 30)
        });
      }
      // Wenn kein ':' vorhanden ist, ist der Token bereits unverschlüsselt (für Migration)
    } catch (error) {
      console.error('Error decrypting WhatsApp API key:', error);
      // Bei Fehler: Token ist möglicherweise bereits unverschlüsselt
      console.log('Token wird als unverschlüsselt behandelt');
      console.log('[WhatsApp Token Debug] Fehler beim Entschlüsseln - verwende Token wie er ist:', {
        length: decrypted.whatsapp.apiKey.length,
        start: decrypted.whatsapp.apiKey.substring(0, 50)
      });
    }
  }
  if (decrypted.whatsapp?.apiSecret) {
    try {
      if (decrypted.whatsapp.apiSecret.includes(':')) {
        decrypted.whatsapp = {
          ...decrypted.whatsapp,
          apiSecret: decryptSecret(decrypted.whatsapp.apiSecret)
        };
      }
    } catch (error) {
      console.error('Error decrypting WhatsApp API secret:', error);
    }
  }

  return decrypted;
};

/**
 * Verschlüsselt alle API-Keys in BranchSettings
 * 
 * @param settings - BranchSettings Objekt (z.B. boldPaymentSettings, doorSystemSettings, etc.)
 * @returns Settings mit verschlüsselten API-Keys
 */
export const encryptBranchApiSettings = (settings: any): any => {
  if (!settings || typeof settings !== 'object') {
    return settings;
  }

  const encrypted = { ...settings };

  // Bold Payment
  if (encrypted.apiKey && typeof encrypted.apiKey === 'string' && !encrypted.apiKey.includes(':')) {
    encrypted.apiKey = encryptSecret(encrypted.apiKey);
  }
  if (encrypted.merchantId && typeof encrypted.merchantId === 'string' && !encrypted.merchantId.includes(':')) {
    encrypted.merchantId = encryptSecret(encrypted.merchantId);
  }

  // TTLock
  if (encrypted.clientId && typeof encrypted.clientId === 'string' && !encrypted.clientId.includes(':')) {
    encrypted.clientId = encryptSecret(encrypted.clientId);
  }
  if (encrypted.clientSecret && typeof encrypted.clientSecret === 'string' && !encrypted.clientSecret.includes(':')) {
    encrypted.clientSecret = encryptSecret(encrypted.clientSecret);
  }
  if (encrypted.username && typeof encrypted.username === 'string' && !encrypted.username.includes(':')) {
    encrypted.username = encryptSecret(encrypted.username);
  }
  if (encrypted.password && typeof encrypted.password === 'string' && !encrypted.password.includes(':')) {
    encrypted.password = encryptSecret(encrypted.password);
  }

  // SIRE
  if (encrypted.apiKey && typeof encrypted.apiKey === 'string' && !encrypted.apiKey.includes(':')) {
    encrypted.apiKey = encryptSecret(encrypted.apiKey);
  }
  if (encrypted.apiSecret && typeof encrypted.apiSecret === 'string' && !encrypted.apiSecret.includes(':')) {
    encrypted.apiSecret = encryptSecret(encrypted.apiSecret);
  }

  // LobbyPMS
  if (encrypted.apiKey && typeof encrypted.apiKey === 'string' && !encrypted.apiKey.includes(':')) {
    encrypted.apiKey = encryptSecret(encrypted.apiKey);
  }

  // WhatsApp (bereits in Branch.whatsappSettings)
  if (encrypted.apiKey && typeof encrypted.apiKey === 'string' && !encrypted.apiKey.includes(':')) {
    encrypted.apiKey = encryptSecret(encrypted.apiKey);
  }
  if (encrypted.apiSecret && typeof encrypted.apiSecret === 'string' && !encrypted.apiSecret.includes(':')) {
    encrypted.apiSecret = encryptSecret(encrypted.apiSecret);
  }

  // Email SMTP
  if (encrypted.smtpPass && typeof encrypted.smtpPass === 'string' && !encrypted.smtpPass.includes(':')) {
    encrypted.smtpPass = encryptSecret(encrypted.smtpPass);
  }

  // Email IMAP (verschachtelt)
  if (encrypted.imap?.password && typeof encrypted.imap.password === 'string' && !encrypted.imap.password.includes(':')) {
    encrypted.imap = {
      ...encrypted.imap,
      password: encryptSecret(encrypted.imap.password)
    };
  }

  return encrypted;
};

/**
 * Entschlüsselt alle API-Keys in BranchSettings
 * 
 * @param settings - BranchSettings Objekt mit verschlüsselten Keys
 * @returns Settings mit entschlüsselten API-Keys
 */
export const decryptBranchApiSettings = (settings: any): any => {
  if (!settings || typeof settings !== 'object') {
    return settings;
  }

  const decrypted = { ...settings };

  // Versuche alle möglichen verschlüsselten Felder zu entschlüsseln
  const encryptedFields = ['apiKey', 'apiSecret', 'merchantId', 'clientId', 'clientSecret', 'username', 'password', 'smtpPass'];
  
  for (const field of encryptedFields) {
    if (decrypted[field] && typeof decrypted[field] === 'string' && decrypted[field].includes(':')) {
      try {
        decrypted[field] = decryptSecret(decrypted[field]);
      } catch (error) {
        console.error(`Error decrypting ${field}:`, error);
        // Bei Fehler: Feld bleibt wie es ist
      }
    }
  }

  // 2. NEU: Verschachtelte Settings entschlüsseln
  // Bold Payment
  if (decrypted.boldPayment && typeof decrypted.boldPayment === 'object') {
    const boldPaymentUpdates: any = {};
    if (decrypted.boldPayment.apiKey && typeof decrypted.boldPayment.apiKey === 'string' && decrypted.boldPayment.apiKey.includes(':')) {
      try {
        boldPaymentUpdates.apiKey = decryptSecret(decrypted.boldPayment.apiKey);
      } catch (error) {
        console.error('Error decrypting boldPayment.apiKey:', error);
      }
    }
    if (decrypted.boldPayment.merchantId && typeof decrypted.boldPayment.merchantId === 'string' && decrypted.boldPayment.merchantId.includes(':')) {
      try {
        boldPaymentUpdates.merchantId = decryptSecret(decrypted.boldPayment.merchantId);
      } catch (error) {
        console.error('Error decrypting boldPayment.merchantId:', error);
      }
    }
    if (Object.keys(boldPaymentUpdates).length > 0) {
      decrypted.boldPayment = {
        ...decrypted.boldPayment,
        ...boldPaymentUpdates
      };
    }
  }

  // LobbyPMS
  if (decrypted.lobbyPms && typeof decrypted.lobbyPms === 'object') {
    if (decrypted.lobbyPms.apiKey && typeof decrypted.lobbyPms.apiKey === 'string' && decrypted.lobbyPms.apiKey.includes(':')) {
      try {
        decrypted.lobbyPms = {
          ...decrypted.lobbyPms,
          apiKey: decryptSecret(decrypted.lobbyPms.apiKey)
        };
      } catch (error) {
        console.error('Error decrypting lobbyPms.apiKey:', error);
      }
    }
  }

  // TTLock/Door System
  if (decrypted.doorSystem && typeof decrypted.doorSystem === 'object') {
    const doorSystemFields = ['clientId', 'clientSecret', 'username', 'password'];
    for (const field of doorSystemFields) {
      if (decrypted.doorSystem[field] && typeof decrypted.doorSystem[field] === 'string' && decrypted.doorSystem[field].includes(':')) {
        try {
          decrypted.doorSystem = {
            ...decrypted.doorSystem,
            [field]: decryptSecret(decrypted.doorSystem[field])
          };
        } catch (error) {
          console.error(`Error decrypting doorSystem.${field}:`, error);
        }
      }
    }
  }

  // SIRE
  if (decrypted.sire && typeof decrypted.sire === 'object') {
    if (decrypted.sire.apiKey && typeof decrypted.sire.apiKey === 'string' && decrypted.sire.apiKey.includes(':')) {
      try {
        decrypted.sire = {
          ...decrypted.sire,
          apiKey: decryptSecret(decrypted.sire.apiKey)
        };
      } catch (error) {
        console.error('Error decrypting sire.apiKey:', error);
      }
    }
    if (decrypted.sire.apiSecret && typeof decrypted.sire.apiSecret === 'string' && decrypted.sire.apiSecret.includes(':')) {
      try {
        decrypted.sire = {
          ...decrypted.sire,
          apiSecret: decryptSecret(decrypted.sire.apiSecret)
        };
      } catch (error) {
        console.error('Error decrypting sire.apiSecret:', error);
      }
    }
  }

  // Email IMAP Password (verschachtelt)
  if (decrypted.imap?.password && typeof decrypted.imap.password === 'string' && decrypted.imap.password.includes(':')) {
    try {
      decrypted.imap = {
        ...decrypted.imap,
        password: decryptSecret(decrypted.imap.password)
      };
    } catch (error) {
      console.error('Error decrypting imap.password:', error);
    }
  }

  return decrypted;
};


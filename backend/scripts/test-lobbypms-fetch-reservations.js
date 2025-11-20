#!/usr/bin/env node
/**
 * Test-Script: Ruft Reservierungen von LobbyPMS API ab
 * 
 * Ruft die letzten Reservierungen für Manila und Parque Poblado ab
 */

const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const crypto = require('crypto');

const prisma = new PrismaClient();

// Verschlüsselungs-Funktionen (vereinfacht)
function decryptSecret(encryptedText) {
  if (!encryptedText || typeof encryptedText !== 'string' || !encryptedText.includes(':')) {
    return encryptedText; // Nicht verschlüsselt
  }
  
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    return encryptedText; // Kein Key = nicht verschlüsselt
  }
  
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) return encryptedText;
    
    const [ivHex, authTagHex, encrypted] = parts;
    const key = Buffer.from(encryptionKey, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    return encryptedText; // Bei Fehler: unverschlüsselt zurückgeben
  }
}

function decryptBranchApiSettings(settings) {
  if (!settings || typeof settings !== 'object') return settings;
  
  const decrypted = { ...settings };
  const encryptedFields = ['apiKey', 'apiSecret', 'merchantId', 'clientId', 'clientSecret', 'username', 'password', 'smtpPass'];
  
  for (const field of encryptedFields) {
    if (decrypted[field] && typeof decrypted[field] === 'string' && decrypted[field].includes(':')) {
      try {
        decrypted[field] = decryptSecret(decrypted[field]);
      } catch (error) {
        // Bei Fehler: Feld bleibt wie es ist
      }
    }
  }
  
  // IMAP Password (verschachtelt)
  if (decrypted.imap?.password && typeof decrypted.imap.password === 'string' && decrypted.imap.password.includes(':')) {
    try {
      decrypted.imap = {
        ...decrypted.imap,
        password: decryptSecret(decrypted.imap.password)
      };
    } catch (error) {
      // Bei Fehler: Feld bleibt wie es ist
    }
  }
  
  return decrypted;
}

function decryptApiSettings(settings) {
  if (!settings || typeof settings !== 'object') return settings;
  
  const decrypted = { ...settings };
  
  // LobbyPMS
  if (decrypted.lobbyPms?.apiKey && typeof decrypted.lobbyPms.apiKey === 'string' && decrypted.lobbyPms.apiKey.includes(':')) {
    try {
      decrypted.lobbyPms = {
        ...decrypted.lobbyPms,
        apiKey: decryptSecret(decrypted.lobbyPms.apiKey)
      };
    } catch (error) {
      // Bei Fehler: Feld bleibt wie es ist
    }
  }
  
  return decrypted;
}

async function fetchReservationsFromLobbyPMS(apiKey, apiUrl, propertyId, startDate, endDate) {
  const baseUrl = apiUrl || 'https://app.lobbypms.com/api';
  
  const params = {
    start_date: startDate.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0]
  };
  
  if (propertyId) {
    params.property_id = propertyId;
  }
  
  try {
    const response = await axios.get(`${baseUrl}/v1/bookings`, {
      params,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      validateStatus: (status) => status < 500
    });
    
    // Debug: Zeige Response-Struktur
    console.log(`   Response Status: ${response.status}`);
    console.log(`   Response Type: ${typeof response.data}`);
    console.log(`   Response Keys: ${response.data ? Object.keys(response.data).join(', ') : 'null'}`);
    
    // Prüfe ob Response HTML ist (404-Seite)
    if (typeof response.data === 'string' && response.data.includes('<!DOCTYPE')) {
      throw new Error('LobbyPMS API Endpoint nicht gefunden. Bitte prüfe die API-Dokumentation für den korrekten Endpoint.');
    }
    
    // LobbyPMS gibt { data: [...], meta: {...} } zurück
    if (response.data && typeof response.data === 'object' && response.data.data && Array.isArray(response.data.data)) {
      return response.data.data;
    }
    
    // Fallback: Direktes Array
    if (Array.isArray(response.data)) {
      return response.data;
    }
    
    // Fallback: success-Format
    if (response.data && typeof response.data === 'object' && response.data.success && response.data.data) {
      return response.data.data;
    }
    
    // Debug: Zeige vollständige Response
    console.log(`   Vollständige Response (erste 500 Zeichen):`);
    console.log(JSON.stringify(response.data, null, 2).substring(0, 500));
    
    throw new Error('Unerwartete Response-Struktur');
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`LobbyPMS API Fehler: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
    }
    throw error;
  }
}

async function fetchReservationsForBranches() {
  try {
    console.log('🔍 Suche Branches "Manila" und "Parque Poblado"...\n');

    // Finde Branches
    const branches = await prisma.branch.findMany({
      where: {
        name: { in: ['Manila', 'Parque Poblado'] }
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            settings: true
          }
        }
      }
    });

    if (branches.length === 0) {
      console.log('❌ Keine Branches gefunden');
      return;
    }

    console.log(`✅ ${branches.length} Branch(es) gefunden\n`);

    for (const branch of branches) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📋 Branch: ${branch.name} (ID: ${branch.id})`);
      console.log(`${'='.repeat(80)}\n`);

      // Prüfe LobbyPMS Settings
      const branchSettings = branch.lobbyPmsSettings;
      const orgSettings = branch.organization?.settings;
      
      // Entschlüssele Settings
      const decryptedBranchSettings = branchSettings ? decryptBranchApiSettings(branchSettings) : null;
      const decryptedOrgSettings = orgSettings ? decryptApiSettings(orgSettings) : null;
      
      const lobbyPmsSettings = decryptedBranchSettings || decryptedOrgSettings?.lobbyPms;

      if (!lobbyPmsSettings?.apiKey) {
        console.log('⚠️  Kein LobbyPMS API Key konfiguriert');
        console.log('   Branch Settings:', branchSettings ? 'vorhanden' : 'fehlt');
        console.log('   Org Settings:', orgSettings?.lobbyPms ? 'vorhanden' : 'fehlt');
        continue;
      }

      console.log('✅ LobbyPMS API Key gefunden');
      console.log(`   API URL: ${lobbyPmsSettings.apiUrl || 'https://app.lobbypms.com/api'}`);
      console.log(`   Property ID: ${lobbyPmsSettings.propertyId || 'nicht gesetzt'}`);
      console.log(`   Sync Enabled: ${lobbyPmsSettings.syncEnabled !== false ? 'ja' : 'nein'}\n`);

      try {
        // Hole Reservierungen: Letzte 30 Tage bis +30 Tage
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30); // 30 Tage zurück
        
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30); // 30 Tage voraus

        console.log(`📥 Rufe Reservierungen ab (${startDate.toISOString().split('T')[0]} bis ${endDate.toISOString().split('T')[0]})...\n`);

        const reservations = await fetchReservationsFromLobbyPMS(
          lobbyPmsSettings.apiKey,
          lobbyPmsSettings.apiUrl,
          lobbyPmsSettings.propertyId,
          startDate,
          endDate
        );

        console.log(`✅ ${reservations.length} Reservierungen abgerufen\n`);

        // Sortiere nach Check-in-Datum (neueste zuerst) und nimm die letzten 3
        const sortedReservations = reservations
          .sort((a, b) => {
            const dateA = new Date(a.check_in_date || 0).getTime();
            const dateB = new Date(b.check_in_date || 0).getTime();
            return dateB - dateA; // Neueste zuerst
          })
          .slice(0, 3);

        if (sortedReservations.length === 0) {
          console.log('⚠️  Keine Reservierungen gefunden\n');
          continue;
        }

        console.log(`📋 Zeige die letzten ${sortedReservations.length} Reservierungen:\n`);

        sortedReservations.forEach((reservation, index) => {
          console.log(`\n${'-'.repeat(80)}`);
          console.log(`Reservierung ${index + 1}:`);
          console.log(`${'-'.repeat(80)}`);
          console.log(`ID: ${reservation.id || reservation.booking_id || 'N/A'}`);
          console.log(`Gast: ${reservation.guest_name || reservation.guestName || 'Unbekannt'}`);
          console.log(`Email: ${reservation.guest_email || reservation.guestEmail || 'Nicht angegeben'}`);
          console.log(`Telefon: ${reservation.guest_phone || reservation.guestPhone || 'Nicht angegeben'}`);
          console.log(`Check-in: ${reservation.check_in_date || reservation.checkInDate || 'Nicht angegeben'}`);
          console.log(`Check-out: ${reservation.check_out_date || reservation.checkOutDate || 'Nicht angegeben'}`);
          console.log(`Ankunftszeit: ${reservation.arrival_time || reservation.arrivalTime || 'Nicht angegeben'}`);
          console.log(`Zimmer: ${reservation.room_number || reservation.roomNumber || 'Nicht angegeben'}`);
          console.log(`Zimmer-Beschreibung: ${reservation.room_description || reservation.roomDescription || 'Nicht angegeben'}`);
          console.log(`Status: ${reservation.status || 'Nicht angegeben'}`);
          console.log(`Zahlungsstatus: ${reservation.payment_status || reservation.paymentStatus || 'Nicht angegeben'}`);
          console.log(`Property ID: ${reservation.property_id || reservation.propertyId || 'Nicht angegeben'}`);
          
          // Zeige alle weiteren Felder
          const knownFields = ['id', 'booking_id', 'guest_name', 'guestName', 'guest_email', 'guestEmail', 'guest_phone', 'guestPhone', 'check_in_date', 'checkInDate', 'check_out_date', 'checkOutDate', 'arrival_time', 'arrivalTime', 'room_number', 'roomNumber', 'room_description', 'roomDescription', 'status', 'payment_status', 'paymentStatus', 'property_id', 'propertyId'];
          const additionalFields = Object.keys(reservation).filter(key => !knownFields.includes(key));
          if (additionalFields.length > 0) {
            console.log(`\nWeitere Felder:`);
            additionalFields.forEach(field => {
              console.log(`  ${field}: ${JSON.stringify(reservation[field])}`);
            });
          }
        });

      } catch (error) {
        console.error(`❌ Fehler beim Abrufen der Reservierungen:`, error.message || error);
        if (error.stack) {
          console.error(`   Stack: ${error.stack.split('\n').slice(0, 3).join('\n')}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Fehler:', error.message || error);
    if (error.stack) {
      console.error(`   Stack: ${error.stack.split('\n').slice(0, 5).join('\n')}`);
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Führe Script aus
fetchReservationsForBranches()
  .then(() => {
    console.log('\n✅ Script erfolgreich abgeschlossen');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script fehlgeschlagen:', error.message || error);
    process.exit(1);
  });


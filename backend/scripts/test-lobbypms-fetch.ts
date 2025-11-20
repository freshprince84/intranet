#!/usr/bin/env node
/**
 * Test-Script: Ruft die letzten 3 Reservierungen aus LobbyPMS ab
 * für Manila und Parque Poblado
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import axios, { AxiosInstance, AxiosError } from 'axios';
import crypto from 'crypto';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

// Verschlüsselungs-Funktionen (vereinfacht)
function decryptSecret(encryptedText: string): string {
  if (!encryptedText || !encryptedText.includes(':')) {
    return encryptedText;
  }

  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey || encryptionKey.length !== 64) {
    return encryptedText; // Nicht verschlüsselt oder Key fehlt
  }

  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      return encryptedText;
    }

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

function decryptBranchApiSettings(settings: any): any {
  if (!settings || typeof settings !== 'object') {
    return settings;
  }

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

  return decrypted;
}

function decryptApiSettings(settings: any): any {
  if (!settings || typeof settings !== 'object') {
    return settings;
  }

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

// LobbyPMS API Interface
interface LobbyPmsReservation {
  id: string;
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
  check_in_date: string;
  check_out_date: string;
  arrival_time?: string;
  room_number?: string;
  room_description?: string;
  status?: string;
  payment_status?: string;
  property_id?: string;
  [key: string]: any;
}

async function fetchLobbyPmsReservations(apiUrl: string, apiKey: string, propertyId?: string, startDate?: Date, endDate?: Date): Promise<LobbyPmsReservation[]> {
  // LobbyPMS verwendet Bearer Token (laut LobbyPmsService)
  const axiosInstance: AxiosInstance = axios.create({
    baseURL: apiUrl,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    timeout: 30000
  });

  const params: any = {
    start_date: startDate ? startDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    end_date: endDate ? endDate.toISOString().split('T')[0] : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  };

  if (propertyId) {
    params.property_id = propertyId;
  }

  try {
    const response = await axiosInstance.get<any>('/api/v1/bookings', {
      params,
      validateStatus: (status) => status < 500
    });

    console.log(`[Debug] Response Status: ${response.status}`);
    console.log(`[Debug] Response Headers:`, JSON.stringify(response.headers, null, 2));

    const responseData = response.data;

    if (typeof responseData === 'string' && responseData.includes('<!DOCTYPE')) {
      console.error(`[Debug] HTML Response erhalten (wahrscheinlich 404):`);
      console.error(responseData.substring(0, 500));
      throw new Error('LobbyPMS API Endpoint nicht gefunden - HTML Response erhalten');
    }

    if (responseData && typeof responseData === 'object' && responseData.data && Array.isArray(responseData.data)) {
      return responseData.data;
    }

    if (Array.isArray(responseData)) {
      return responseData;
    }

    if (responseData && typeof responseData === 'object' && responseData.success && responseData.data) {
      return responseData.data;
    }

    console.error(`[Debug] Unerwartete Response-Struktur:`, JSON.stringify(responseData, null, 2));
    throw new Error('Unerwartete Response-Struktur');
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<any>;
      console.error(`[Debug] Axios Error Status: ${axiosError.response?.status}`);
      console.error(`[Debug] Axios Error Data:`, JSON.stringify(axiosError.response?.data, null, 2));
      console.error(`[Debug] Axios Error Headers:`, JSON.stringify(axiosError.response?.headers, null, 2));
      throw new Error(
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        `LobbyPMS API Fehler (Status ${axiosError.response?.status}): ${axiosError.message}`
      );
    }
    throw error;
  }
}

async function testLobbyPmsFetch() {
  try {
    console.log('🔍 Lade Branch-Settings für Manila und Parque Poblado...\n');

    const branches = await prisma.branch.findMany({
      where: {
        name: { in: ['Manila', 'Parque Poblado'] }
      },
      include: {
        organization: {
          select: {
            id: true,
            settings: true
          }
        }
      }
    });

    if (branches.length === 0) {
      console.log('❌ Keine Branches gefunden');
      return;
    }

    for (const branch of branches) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📋 Branch: ${branch.name} (ID: ${branch.id})`);
      console.log(`${'='.repeat(60)}\n`);

      // Lade Settings
      const branchSettings = branch.lobbyPmsSettings as any;
      const orgSettings = branch.organization?.settings as any;

      // Entschlüssele Settings
      const decryptedBranchSettings = branchSettings ? decryptBranchApiSettings(branchSettings) : null;
      const decryptedOrgSettings = orgSettings ? decryptApiSettings(orgSettings) : null;

      const lobbyPmsSettings = decryptedBranchSettings || decryptedOrgSettings?.lobbyPms;

      if (!lobbyPmsSettings?.apiKey) {
        console.log('⚠️  Kein LobbyPMS API Key konfiguriert');
        console.log('   Branch Settings:', branchSettings ? 'vorhanden' : 'nicht vorhanden');
        console.log('   Org Settings:', orgSettings?.lobbyPms ? 'vorhanden' : 'nicht vorhanden');
        continue;
      }

      // LobbyPMS API URL: Standard ist https://api.lobbypms.com (ohne /api)
      // Der Endpoint /api/v1/bookings wird dann zu https://api.lobbypms.com/api/v1/bookings
      let apiUrl = lobbyPmsSettings.apiUrl;
      if (!apiUrl) {
        apiUrl = 'https://api.lobbypms.com';
      }
      // Korrigiere app.lobbypms.com zu api.lobbypms.com
      if (apiUrl.includes('app.lobbypms.com')) {
        apiUrl = apiUrl.replace('app.lobbypms.com', 'api.lobbypms.com');
      }
      // Stelle sicher, dass apiUrl NICHT mit /api endet (wird im Endpoint hinzugefügt)
      if (apiUrl.endsWith('/api')) {
        apiUrl = apiUrl.replace(/\/api$/, '');
      }
      const apiKey = lobbyPmsSettings.apiKey;
      const propertyId = lobbyPmsSettings.propertyId;

      console.log('✅ LobbyPMS API Key gefunden');
      console.log(`   API URL: ${apiUrl}`);
      console.log(`   Property ID: ${propertyId || 'nicht gesetzt'}`);
      console.log(`   Sync Enabled: ${lobbyPmsSettings.syncEnabled !== false ? 'ja' : 'nein'}\n`);

      // Berechne Datum-Bereich (letzte 30 Tage bis heute + 7 Tage)
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      console.log(`📅 Zeitraum: ${startDate.toISOString().split('T')[0]} bis ${endDate.toISOString().split('T')[0]}\n`);

      // Hole Reservierungen
      console.log('🔄 Rufe Reservierungen von LobbyPMS ab...\n');
      
      const reservations = await fetchLobbyPmsReservations(apiUrl, apiKey, propertyId, startDate, endDate);

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

      console.log(`📊 Letzte ${sortedReservations.length} Reservierungen:\n`);

      sortedReservations.forEach((reservation, index) => {
        // Mappe LobbyPMS Datenstruktur
        const bookingId = reservation.booking_id || reservation.id;
        const holder = reservation.holder || {};
        const guestName = holder.name && holder.surname 
          ? `${holder.name} ${holder.surname}${holder.second_surname ? ' ' + holder.second_surname : ''}`.trim()
          : (reservation.guest_name || 'N/A');
        const guestEmail = holder.email || reservation.guest_email || 'N/A';
        const guestPhone = holder.phone || reservation.guest_phone || 'N/A';
        const checkInDate = reservation.start_date || reservation.check_in_date || 'N/A';
        const checkOutDate = reservation.end_date || reservation.check_out_date || 'N/A';
        const roomNumber = reservation.assigned_room?.name || reservation.room_number || 'N/A';
        const roomDescription = reservation.assigned_room?.type || reservation.room_description || 'N/A';
        const status = reservation.checked_in ? 'checked_in' : (reservation.checked_out ? 'checked_out' : (reservation.status || 'confirmed'));
        const paymentStatus = reservation.paid_out > 0 ? 'paid' : (reservation.payment_status || 'pending');
        const channel = reservation.channel?.name || reservation.channel || 'N/A';
        const category = reservation.category?.name || 'N/A';
        const totalGuests = reservation.total_guests || 0;
        const totalToPay = reservation.total_to_pay || reservation.total_to_pay_accommodation || 0;
        const paidOut = reservation.paid_out || 0;
        const creationDate = reservation.creation_date || 'N/A';
        const note = reservation.note || '';

        console.log(`\n${'-'.repeat(60)}`);
        console.log(`Reservierung ${index + 1}:`);
        console.log(`${'-'.repeat(60)}`);
        console.log(`Booking ID: ${bookingId}`);
        console.log(`Erstellt am: ${creationDate}`);
        console.log(`Gast: ${guestName}`);
        console.log(`Email: ${guestEmail}`);
        console.log(`Telefon: ${guestPhone}`);
        console.log(`Land: ${holder.country || 'N/A'}`);
        console.log(`Check-in: ${checkInDate}`);
        console.log(`Check-out: ${checkOutDate}`);
        console.log(`Zimmer: ${roomNumber} (${roomDescription})`);
        console.log(`Kategorie: ${category}`);
        console.log(`Kanal: ${channel}`);
        console.log(`Status: ${status}`);
        console.log(`Zahlungsstatus: ${paymentStatus}`);
        console.log(`Anzahl Gäste: ${totalGuests}`);
        console.log(`Gesamtbetrag: ${totalToPay}`);
        console.log(`Bereits bezahlt: ${paidOut}`);
        console.log(`Online Check-in: ${reservation.checkin_online ? 'ja' : 'nein'}`);
        if (note) {
          console.log(`Notiz: ${note}`);
        }
        
        // Zeige Gäste-Liste falls vorhanden
        if (reservation.guests && Array.isArray(reservation.guests) && reservation.guests.length > 0) {
          console.log(`\nGäste-Liste:`);
          reservation.guests.forEach((guest: any, idx: number) => {
            const guestName = guest.name && guest.surname 
              ? `${guest.name} ${guest.surname}${guest.second_surname ? ' ' + guest.second_surname : ''}`.trim()
              : 'Unbekannt';
            console.log(`  ${idx + 1}. ${guestName} (${guest.country || 'N/A'})`);
          });
        }
      });

      console.log(`\n${'='.repeat(60)}\n`);
    }

  } catch (error) {
    console.error('❌ Fehler:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testLobbyPmsFetch()
  .then(() => {
    console.log('\n✅ Script erfolgreich abgeschlossen');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script fehlgeschlagen:', error);
    process.exit(1);
  });

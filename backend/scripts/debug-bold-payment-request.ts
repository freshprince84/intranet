/**
 * Script: Debuggt den tatsächlichen Request der gesendet wird
 */

import { PrismaClient } from '@prisma/client';
import { BoldPaymentService } from '../src/services/boldPaymentService';
import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function debugBoldPaymentRequest() {
  try {
    console.log('🔍 Debug: Tatsächlicher Request...\n');

    // Lade Reservierung
    const reservation = await prisma.reservation.findUnique({
      where: { id: 14086 }
    });

    if (!reservation) {
      throw new Error('Reservierung nicht gefunden!');
    }

    // Erstelle Service
    const service = await BoldPaymentService.createForBranch(3);
    
    // Zugriff auf private Felder
    const merchantId = (service as any).merchantId;
    const apiUrl = (service as any).apiUrl;
    const axiosInstance = (service as any).axiosInstance;

    console.log('📋 Service Konfiguration:');
    console.log(`   Merchant ID: ${merchantId}`);
    console.log(`   API URL: ${apiUrl}`);
    console.log('');

    // Erstelle Payload
    const amount = typeof reservation.amount === 'number' 
      ? reservation.amount 
      : Number(reservation.amount);
    
    const payload = {
      amount_type: 'CLOSE',
      amount: {
        currency: reservation.currency || 'COP',
        total_amount: Math.round(amount * 1.05), // Mit 5% Aufschlag
        subtotal: Math.round(amount * 1.05),
        taxes: [],
        tip_amount: 0
      },
      reference: `RES-${reservation.id}-${Date.now()}`,
      description: `Test-Zahlung für ${reservation.guestName} (inkl. 5% Kartenzahlungsaufschlag)`
    };

    console.log('📋 Payload:');
    console.log(JSON.stringify(payload, null, 2));
    console.log('');

    // Teste mit axiosInstance (wie im Service)
    console.log('🧪 Teste mit Service axiosInstance...');
    try {
      // Intercepte den Request
      const originalRequest = axiosInstance.request;
      let capturedHeaders: any = null;
      
      // Temporärer Interceptor zum Debuggen
      axiosInstance.interceptors.request.use((config: any) => {
        capturedHeaders = { ...config.headers };
        console.log('📤 Request Headers (vom Interceptor):');
        console.log(JSON.stringify(config.headers, null, 2));
        console.log('');
        return config;
      });

      const response = await axiosInstance.post('/online/link/v1', payload);
      console.log('✅ ERFOLG!');
      console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error: any) {
      console.log('❌ FEHLER!');
      if (error.response) {
        console.log('Status:', error.response.status);
        console.log('Status Text:', error.response.statusText);
        console.log('Response Data:', JSON.stringify(error.response.data, null, 2));
        console.log('Request Config:', JSON.stringify({
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers,
          baseURL: error.config?.baseURL
        }, null, 2));
      } else {
        console.log('Error:', error.message);
      }
    }

    console.log('');

    // Vergleich: Direkter Request (funktioniert)
    console.log('🧪 Vergleich: Direkter Request (sollte funktionieren)...');
    try {
      const directResponse = await axios.post(
        `${apiUrl}/online/link/v1`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `x-api-key ${merchantId}`
          },
          timeout: 30000
        }
      );
      console.log('✅ Direkter Request ERFOLG!');
      console.log('Response:', JSON.stringify(directResponse.data, null, 2));
    } catch (error: any) {
      console.log('❌ Direkter Request FEHLER!');
      if (error.response) {
        console.log('Status:', error.response.status);
        console.log('Response Data:', JSON.stringify(error.response.data, null, 2));
      }
    }

  } catch (error) {
    console.error('\n❌ Fehler:', error);
    if (error instanceof Error) {
      console.error('   Fehlermeldung:', error.message);
      if (error.stack) {
        console.error('   Stack:', error.stack.split('\n').slice(0, 10).join('\n'));
      }
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

debugBoldPaymentRequest()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });













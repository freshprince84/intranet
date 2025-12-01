/**
 * Script: Vergleicht direkten axios Request mit Service Request
 */

import { PrismaClient } from '@prisma/client';
import { BoldPaymentService } from '../src/services/boldPaymentService';
import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function debugAxiosHeadersComparison() {
  try {
    console.log('🔍 Vergleich: Direkter Request vs Service Request\n');

    const merchantId = 'CTkrL5f5IxvMpX722zXivqnd1KU5VyoNBOFQFUUnf-E';
    const apiUrl = 'https://integrations.api.bold.co';

    const payload = {
      amount_type: 'CLOSE',
      amount: {
        currency: 'COP',
        total_amount: 10000,
        subtotal: 10000,
        taxes: [],
        tip_amount: 0
      },
      reference: 'COMPARE-' + Date.now(),
      description: 'Vergleichstest'
    };

    // Test 1: Direkter axios Request (funktioniert)
    console.log('='.repeat(80));
    console.log('TEST 1: Direkter axios Request');
    console.log('='.repeat(80));
    try {
      const response1 = await axios.post(
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
      console.log('✅ ERFOLG! Status:', response1.status);
      console.log('Response:', JSON.stringify(response1.data, null, 2));
    } catch (error: any) {
      console.log('❌ FEHLER!');
      if (error.response) {
        console.log('Status:', error.response.status);
        console.log('Response:', JSON.stringify(error.response.data, null, 2));
      }
    }
    console.log('');

    // Test 2: Service Request
    console.log('='.repeat(80));
    console.log('TEST 2: Service Request');
    console.log('='.repeat(80));
    
    const reservation = await prisma.reservation.findUnique({
      where: { id: 14086 }
    });

    if (!reservation) {
      throw new Error('Reservierung nicht gefunden!');
    }

    const service = await BoldPaymentService.createForBranch(3);
    const serviceMerchantId = (service as any).merchantId;
    const serviceApiUrl = (service as any).apiUrl;
    const serviceAxiosInstance = (service as any).axiosInstance;

    console.log(`Service Merchant ID: ${serviceMerchantId}`);
    console.log(`Service API URL: ${serviceApiUrl}`);
    console.log(`Service axiosInstance baseURL: ${serviceAxiosInstance.defaults.baseURL}`);
    console.log('');

    // Intercepte den Request, um die tatsächlichen Headers zu sehen
    let capturedConfig: any = null;
    serviceAxiosInstance.interceptors.request.use((config: any) => {
      capturedConfig = {
        method: config.method,
        url: config.url,
        baseURL: config.baseURL,
        headers: { ...config.headers },
        data: config.data
      };
      console.log('📤 Request Config (vom Interceptor):');
      console.log(JSON.stringify(capturedConfig, null, 2));
      console.log('');
      return config;
    }, undefined, { runWhen: () => true });

    try {
      const amount = typeof reservation.amount === 'number' 
        ? reservation.amount 
        : Number(reservation.amount);
      
      const paymentLink = await service.createPaymentLink(
        reservation,
        amount,
        reservation.currency || 'COP',
        `Vergleichstest für ${reservation.guestName}`
      );
      console.log('✅ ERFOLG! Payment-Link:', paymentLink);
    } catch (error: any) {
      console.log('❌ FEHLER!');
      if (error.response) {
        console.log('Status:', error.response.status);
        console.log('Response:', JSON.stringify(error.response.data, null, 2));
      } else if (error.message) {
        console.log('Error Message:', error.message);
      }
    }
    console.log('');

    // Vergleich
    console.log('='.repeat(80));
    console.log('VERGLEICH:');
    console.log('='.repeat(80));
    console.log(`Merchant ID identisch: ${merchantId === serviceMerchantId}`);
    console.log(`API URL identisch: ${apiUrl === serviceApiUrl}`);
    if (capturedConfig) {
      console.log(`Authorization Header im Service: ${capturedConfig.headers.Authorization || capturedConfig.headers.authorization || 'NICHT GESETZT'}`);
    }
    console.log('');

  } catch (error) {
    console.error('\n❌ Fehler:', error);
    if (error instanceof Error) {
      console.error('   Fehlermeldung:', error.message);
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

debugAxiosHeadersComparison()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });














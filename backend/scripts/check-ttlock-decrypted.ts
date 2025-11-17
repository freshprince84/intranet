import { PrismaClient } from '@prisma/client';
import { decryptApiSettings } from '../src/utils/encryption';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function checkDecrypted() {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: 1 },
      select: { settings: true }
    });

    const settings = decryptApiSettings(org.settings as any);
    const doorSystem = settings?.doorSystem;

    console.log('Client ID:', doorSystem?.clientId);
    console.log('Client Secret:', doorSystem?.clientSecret);
    console.log('Client ID Length:', doorSystem?.clientId?.length);
    console.log('Client Secret Length:', doorSystem?.clientSecret?.length);
    console.log('Username:', doorSystem?.username);
    console.log('Password:', doorSystem?.password);
    console.log('Password Length:', doorSystem?.password?.length);

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkDecrypted();


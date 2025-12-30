#!/usr/bin/env node

import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config = {
  host: '65.109.228.106',
  username: 'root',
  privateKey: fs.readFileSync(path.join(process.env.HOME || process.env.USERPROFILE, '.ssh', 'intranet_rsa')),
  passphrase: 'Intranet123!',
  readyTimeout: 20000,
};

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ SSH-Verbindung hergestellt');
  console.log('🚀 Starte Deployment...\n');
  
  conn.exec('cd /var/www/intranet && bash scripts/utils/deploy_to_server.sh', (err, stream) => {
    if (err) {
      console.error('❌ Fehler:', err);
      conn.end();
      process.exit(1);
    }

    stream.on('close', (code, signal) => {
      console.log(`\n✅ Deployment abgeschlossen (Exit-Code: ${code})`);
      conn.end();
      process.exit(code === 0 ? 0 : 1);
    });

    stream.on('data', (data) => {
      process.stdout.write(data.toString());
    });

    stream.stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });
  });
});

conn.on('error', (err) => {
  console.error('❌ SSH-Verbindungsfehler:', err.message);
  process.exit(1);
});

console.log('🔌 Verbinde mit Server...');
conn.connect(config);


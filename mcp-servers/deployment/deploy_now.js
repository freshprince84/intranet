#!/usr/bin/env node

import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// SSH-Key-Pfade in Reihenfolge versuchen
const sshKeyPaths = [
  path.join(process.env.HOME || process.env.USERPROFILE, '.ssh', 'intranet_rsa'),
  path.join(process.env.HOME || process.env.USERPROFILE, '.ssh', 'id_rsa'),
  '/root/.ssh/intranet_rsa',
  '/root/.ssh/id_rsa',
];

let privateKey;
let keyPath;
for (const keyPathAttempt of sshKeyPaths) {
  try {
    if (fs.existsSync(keyPathAttempt)) {
      privateKey = fs.readFileSync(keyPathAttempt);
      keyPath = keyPathAttempt;
      break;
    }
  } catch (err) {
    // Weiter versuchen
  }
}

if (!privateKey) {
  console.error('❌ SSH-Key nicht gefunden in:', sshKeyPaths.join(', '));
  process.exit(1);
}

const config = {
  host: '65.109.228.106',
  username: 'root',
  privateKey: privateKey,
  passphrase: 'Intranet123!',
  readyTimeout: 20000,
};

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ SSH-Verbindung hergestellt');
  console.log('🚀 Starte Deployment...\n');
  
  conn.exec('cd /var/www/intranet && git fetch origin && git checkout cursor/mobile-design-top-box-dbbc && git pull origin cursor/mobile-design-top-box-dbbc && bash scripts/utils/deploy_to_server.sh', (err, stream) => {
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


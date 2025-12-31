#!/usr/bin/env node
import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Konfiguration - wird von MCP/Cursor bereitgestellt
const SERVER_CONFIG = {
  host: process.env.DEPLOY_SERVER_HOST || '65.109.228.106',
  username: process.env.DEPLOY_SERVER_USER || 'root',
  privateKeyPath: process.env.DEPLOY_SSH_KEY_PATH || path.join(process.env.HOME || '', '.ssh', 'intranet_rsa'),
  passphrase: process.env.DEPLOY_SSH_KEY_PASSPHRASE || 'Intranet123!',
  serverPath: process.env.DEPLOY_SERVER_PATH || '/var/www/intranet',
  deployScript: process.env.DEPLOY_SCRIPT_PATH || '/var/www/intranet/scripts/utils/deploy_to_server.sh',
};

async function deploy() {
  return new Promise((resolve) => {
    const conn = new Client();
    let output = '';
    
    // SSH-Key laden
    let privateKey;
    try {
      privateKey = fs.readFileSync(SERVER_CONFIG.privateKeyPath, 'utf8');
      console.log('✅ SSH-Key geladen:', SERVER_CONFIG.privateKeyPath);
    } catch (err) {
      // Versuche alternativen Pfad oder Umgebungsvariable
      if (process.env.DEPLOY_SSH_KEY) {
        privateKey = process.env.DEPLOY_SSH_KEY;
        console.log('✅ SSH-Key aus Umgebungsvariable geladen');
      } else {
        resolve({ success: false, error: `SSH-Key nicht gefunden: ${SERVER_CONFIG.privateKeyPath}` });
        return;
      }
    }
    
    conn.on('ready', () => {
      console.log('✅ SSH-Verbindung hergestellt');
      console.log('🚀 Starte Deployment...\n');
      
      const command = `cd ${SERVER_CONFIG.serverPath} && git fetch origin && git checkout cursor/mobile-design-top-box-dbbc && git pull origin cursor/mobile-design-top-box-dbbc && bash ${SERVER_CONFIG.deployScript}`;
      
      conn.exec(command, (err, stream) => {
        if (err) {
          conn.end();
          resolve({ success: false, error: err.message });
          return;
        }
        
        const timeout = setTimeout(() => {
          stream.destroy();
          conn.end();
          resolve({ success: false, error: 'Timeout', output });
        }, 600000); // 10 Minuten
        
        stream.on('close', (code) => {
          clearTimeout(timeout);
          conn.end();
          resolve({ success: code === 0, output, error: code !== 0 ? `Exit-Code: ${code}` : undefined });
        });
        
        stream.on('data', (data) => {
          const text = data.toString();
          process.stdout.write(text);
          output += text;
        });
        
        stream.stderr.on('data', (data) => {
          const text = data.toString();
          process.stderr.write(text);
          output += text;
        });
      });
    });
    
    conn.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });
    
    conn.connect({
      host: SERVER_CONFIG.host,
      username: SERVER_CONFIG.username,
      privateKey: privateKey,
      passphrase: SERVER_CONFIG.passphrase,
      readyTimeout: 20000,
    });
  });
}

console.log('🔌 Verbinde mit Server...');
deploy().then(result => {
  if (result.success) {
    console.log('\n✅ Deployment erfolgreich abgeschlossen!');
    process.exit(0);
  } else {
    console.error('\n❌ Deployment fehlgeschlagen:', result.error);
    if (result.output) {
      console.error('\nOutput:', result.output);
    }
    process.exit(1);
  }
});

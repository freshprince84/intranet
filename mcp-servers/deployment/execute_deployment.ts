import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';

// Konfiguration aus mcp.json (wird von Cursor bereitgestellt)
const SERVER_CONFIG = {
  host: process.env.DEPLOY_SERVER_HOST || '65.109.228.106',
  username: process.env.DEPLOY_SERVER_USER || 'root',
  privateKeyPath: process.env.DEPLOY_SSH_KEY_PATH || path.join(process.env.HOME || '', '.ssh', 'intranet_rsa'),
  passphrase: process.env.DEPLOY_SSH_KEY_PASSPHRASE || 'Intranet123!',
  serverPath: '/var/www/intranet',
  deployScript: '/var/www/intranet/scripts/utils/deploy_to_server.sh',
};

async function executeSSHCommand(command: string, timeout: number = 300000): Promise<{ success: boolean; output: string; error?: string }> {
  return new Promise((resolve) => {
    const conn = new Client();
    let output = '';
    
    // SSH-Key laden - versuche verschiedene Quellen
    let privateKey: string;
    try {
      privateKey = fs.readFileSync(SERVER_CONFIG.privateKeyPath, 'utf8');
    } catch (err) {
      // Versuche Umgebungsvariable (von MCP bereitgestellt)
      if (process.env.DEPLOY_SSH_KEY) {
        privateKey = process.env.DEPLOY_SSH_KEY;
      } else {
        resolve({ success: false, output: '', error: `SSH-Key nicht gefunden: ${SERVER_CONFIG.privateKeyPath}` });
        return;
      }
    }
    
    conn.on('ready', () => {
      conn.exec(command, (err, stream) => {
        if (err) {
          conn.end();
          resolve({ success: false, output: '', error: `SSH-Exec-Fehler: ${err.message}` });
          return;
        }
        
        const timeoutId = setTimeout(() => {
          stream.destroy();
          conn.end();
          resolve({ success: false, output, error: 'Timeout' });
        }, timeout);
        
        stream.on('close', (code: number) => {
          clearTimeout(timeoutId);
          conn.end();
          resolve({ success: code === 0, output, error: code !== 0 ? `Exit-Code: ${code}` : undefined });
        });
        
        stream.on('data', (data: Buffer) => {
          output += data.toString();
          process.stdout.write(data.toString());
        });
        
        stream.stderr.on('data', (data: Buffer) => {
          output += data.toString();
          process.stderr.write(data.toString());
        });
      });
    });
    
    conn.on('error', (err) => {
      resolve({ success: false, output: '', error: `SSH-Verbindungsfehler: ${err.message}` });
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

async function deployToProduction() {
  console.log(`🚀 Starte Deployment auf ${SERVER_CONFIG.host}...`);
  
  // Schritt 1: Build-Dateien bereinigen
  console.log('📦 Schritt 1: Bereinige Build-Dateien...');
  const cleanupCommand = `cd ${SERVER_CONFIG.serverPath} && git reset --hard HEAD 2>/dev/null || true && git merge --abort 2>/dev/null || true && rm -rf frontend/build backend/dist 2>/dev/null || true`;
  await executeSSHCommand(cleanupCommand, 30000);
  
  // Schritt 2: Code aktualisieren und Branch wechseln
  console.log('📥 Schritt 2: Aktualisiere Code und wechsle Branch...');
  const updateCommand = `cd ${SERVER_CONFIG.serverPath} && git fetch origin && git checkout cursor/mobile-design-top-box-dbbc && git pull origin cursor/mobile-design-top-box-dbbc`;
  const updateResult = await executeSSHCommand(updateCommand, 30000);
  
  if (!updateResult.success) {
    console.error('❌ Fehler beim Aktualisieren des Codes:', updateResult.error);
    return { success: false, output: updateResult.output, error: updateResult.error };
  }
  
  // Schritt 3: Deployment-Script ausführen
  console.log('🚀 Schritt 3: Führe Deployment-Script aus...');
  const deployCommand = `cd ${SERVER_CONFIG.serverPath} && bash ${SERVER_CONFIG.deployScript}`;
  const result = await executeSSHCommand(deployCommand, 600000);
  
  return result;
}

console.log('🔌 Verbinde mit Server...');
deployToProduction().then(result => {
  if (result.success) {
    console.log('\n✅ Deployment erfolgreich abgeschlossen!');
    process.exit(0);
  } else {
    console.error('\n❌ Deployment fehlgeschlagen:', result.error);
    process.exit(1);
  }
}).catch(err => {
  console.error('❌ Fehler:', err);
  process.exit(1);
});

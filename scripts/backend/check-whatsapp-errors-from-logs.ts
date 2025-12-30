import * as fs from 'fs';
import * as path from 'path';

async function checkWhatsAppErrorsFromLogs() {
  try {
    console.log('\n=== PRÜFE WHATSAPP-FEHLER IN LOGS ===\n');

    const logsDir = path.join(__dirname, '../logs');
    
    if (!fs.existsSync(logsDir)) {
      console.log('❌ Logs-Verzeichnis nicht gefunden:', logsDir);
      console.log('Versuche alternative Pfade...');
      
      // Versuche verschiedene Pfade
      const alternativePaths = [
        path.join(process.cwd(), 'logs'),
        path.join(process.cwd(), 'backend', 'logs'),
        '/var/log/intranet',
        '/var/log/pm2',
      ];
      
      for (const altPath of alternativePaths) {
        if (fs.existsSync(altPath)) {
          console.log(`✅ Alternative gefunden: ${altPath}`);
          checkLogDirectory(altPath);
          return;
        }
      }
      
      console.log('❌ Keine Logs-Verzeichnisse gefunden');
      return;
    }

    checkLogDirectory(logsDir);

  } catch (error) {
    console.error('Fehler beim Prüfen der Logs:', error);
  }
}

function checkLogDirectory(logsDir: string) {
  console.log(`Prüfe Logs-Verzeichnis: ${logsDir}\n`);

  // Prüfe alle .log Dateien
  const files = fs.readdirSync(logsDir).filter(f => f.endsWith('.log'));
  
  if (files.length === 0) {
    console.log('⚠️ Keine .log Dateien gefunden');
    return;
  }

  console.log(`Gefundene Log-Dateien: ${files.length}\n`);

  for (const file of files) {
    const filePath = path.join(logsDir, file);
    console.log(`\n--- ${file} ---`);
    
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      
      // Suche nach WhatsApp-bezogenen Fehlern
      const whatsappLines = lines.filter(line => 
        line.toLowerCase().includes('whatsapp') || 
        line.toLowerCase().includes('reservation') ||
        line.toLowerCase().includes('error') ||
        line.toLowerCase().includes('fehler')
      );

      if (whatsappLines.length > 0) {
        console.log(`\n✅ ${whatsappLines.length} relevante Zeilen gefunden (letzte 20):`);
        whatsappLines.slice(-20).forEach(line => {
          console.log(line);
        });
      } else {
        console.log('⚠️ Keine relevanten Zeilen gefunden');
      }

      // Prüfe letzte 50 Zeilen für Fehler
      const lastLines = lines.slice(-50);
      const errorLines = lastLines.filter(line => 
        line.toLowerCase().includes('error') || 
        line.toLowerCase().includes('fehler') ||
        line.toLowerCase().includes('failed') ||
        line.toLowerCase().includes('❌')
      );

      if (errorLines.length > 0) {
        console.log(`\n⚠️ ${errorLines.length} Fehler-Zeilen in letzten 50 Zeilen:`);
        errorLines.forEach(line => {
          console.log(line);
        });
      }

    } catch (error) {
      console.error(`Fehler beim Lesen von ${file}:`, error);
    }
  }

  // Prüfe auch claude-console.log speziell
  const claudeConsolePath = path.join(logsDir, 'claude-console.log');
  if (fs.existsSync(claudeConsolePath)) {
    console.log('\n\n=== CLAUDE CONSOLE LOG (letzte 100 Zeilen) ===');
    try {
      const content = fs.readFileSync(claudeConsolePath, 'utf-8');
      const lines = content.split('\n');
      const lastLines = lines.slice(-100);
      
      // Filtere nach WhatsApp/Reservation
      const relevantLines = lastLines.filter(line => 
        line.toLowerCase().includes('whatsapp') || 
        line.toLowerCase().includes('reservation') ||
        line.toLowerCase().includes('error') ||
        line.toLowerCase().includes('fehler')
      );

      if (relevantLines.length > 0) {
        relevantLines.forEach(line => console.log(line));
      } else {
        console.log('Keine relevanten Zeilen in letzten 100 Zeilen');
      }
    } catch (error) {
      console.error('Fehler beim Lesen von claude-console.log:', error);
    }
  }
}

checkWhatsAppErrorsFromLogs();


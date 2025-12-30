import Imap from 'imap';
import { simpleParser } from 'mailparser';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const imap = new Imap({
  user: 'contact-manila@lafamilia-hostel.com',
  password: 'Contact-manila123!LaFamilia123!',
  host: 'mail.lafamilia-hostel.com',
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false }
});

imap.once('ready', () => {
  console.log('✅ IMAP-Verbindung erfolgreich\n');
  
  imap.openBox('INBOX', false, (err, box) => {
    if (err) {
      console.error('❌ Fehler beim Öffnen des Posteingangs:', err);
      imap.end();
      return;
    }

    console.log(`📬 Posteingang geöffnet. ${box.messages.total} Nachrichten insgesamt\n`);

    // Suche nach Emails mit Reservation Code 5664182399 (Daniel Oliveira)
    // Suche in ALLEN Emails (auch gelesenen) der letzten 7 Tage
    const searchDate = new Date();
    searchDate.setDate(searchDate.getDate() - 7);
    
    imap.search([['SINCE', searchDate]], (err, results) => {
      if (err) {
        console.error('❌ Fehler bei der Suche:', err);
        imap.end();
        return;
      }

      if (!results || results.length === 0) {
        console.log('⚠️ Keine Emails in den letzten 7 Tagen gefunden');
        imap.end();
        return;
      }

      console.log(`📧 ${results.length} Email(s) in den letzten 7 Tagen gefunden\n`);
      console.log('🔍 Suche nach Email mit Reservation Code 5664182399 (Daniel Oliveira)...\n');

      const fetch = imap.fetch(results, {
        bodies: '',
        struct: true
      });

      let foundEmail = false;
      let processedCount = 0;

      fetch.on('message', (msg, seqno) => {
        const chunks: Buffer[] = [];

        msg.on('body', (stream) => {
          stream.on('data', (chunk: Buffer) => {
            chunks.push(chunk);
          });
        });

        msg.once('end', async () => {
          try {
            const emailBuffer = Buffer.concat(chunks);
            const parsed = await simpleParser(emailBuffer);
            const text = parsed.text || '';
            const html = parsed.html || '';

            // Prüfe ob diese Email den Reservation Code enthält
            if (text.includes('5664182399') || html.includes('5664182399')) {
              foundEmail = true;
              console.log('✅ EMAIL GEFUNDEN!\n');
              console.log('═══════════════════════════════════════════════════════════');
              console.log('📧 Betreff:', parsed.subject || 'Kein Betreff');
              console.log('📅 Datum:', parsed.date || 'Unbekannt');
              console.log('👤 Von:', parsed.from?.text || 'Unbekannt');
              console.log('\n📄 EMAIL-INHALT (Text):');
              console.log('───────────────────────────────────────────────────────────');
              console.log(text);
              console.log('\n📄 EMAIL-INHALT (HTML):');
              console.log('───────────────────────────────────────────────────────────');
              console.log(html);
              console.log('═══════════════════════════════════════════════════════════\n');

              // Suche explizit nach Telefonnummer
              const phonePatterns = [
                /Teléfono:\s*([^\s\n]+)/i,
                /Phone:\s*([^\s\n]+)/i,
                /Tel:\s*([^\s\n]+)/i,
                /(\+?\d{7,15})/g
              ];

              console.log('🔍 Suche nach Telefonnummer...');
              let phoneFound = false;
              for (const pattern of phonePatterns) {
                const matches = text.match(pattern);
                if (matches) {
                  console.log('   ✅ Gefunden:', matches[1] || matches[0]);
                  phoneFound = true;
                }
              }
              if (!phoneFound) {
                console.log('   ❌ Keine Telefonnummer gefunden');
              }
            }

            processedCount++;
            if (processedCount === results.length) {
              if (!foundEmail) {
                console.log('❌ Email mit Reservation Code 5664182399 NICHT gefunden');
                console.log('   Möglicherweise wurde sie verschoben oder gelöscht');
              }
              imap.end();
            }
          } catch (error) {
            console.error(`❌ Fehler beim Parsen der Email ${seqno}:`, error);
            processedCount++;
            if (processedCount === results.length) {
              imap.end();
            }
          }
        });
      });

      fetch.once('error', (err) => {
        console.error('❌ Fehler beim Abrufen:', err);
        imap.end();
      });
    });
  });
});

imap.once('error', (err) => {
  console.error('❌ IMAP-Fehler:', err);
});

imap.connect();


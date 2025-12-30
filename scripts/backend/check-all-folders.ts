import Imap from 'imap';

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
  
  imap.getBoxes((err, boxes) => {
    if (err) {
      console.error('❌ Fehler beim Abrufen der Ordner:', err);
      imap.end();
      return;
    }

    console.log('📁 Verfügbare Ordner:');
    console.log('───────────────────────────────────────────────────────────');
    
    function listBoxes(boxes: any, prefix: string = '') {
      for (const name in boxes) {
        const box = boxes[name];
        console.log(`${prefix}📁 ${name} (${box.attribs.join(', ')})`);
        if (box.children) {
          listBoxes(box.children, prefix + '  ');
        }
      }
    }
    
    listBoxes(boxes);
    console.log('───────────────────────────────────────────────────────────\n');

    // Prüfe alle Ordner nach der Email
    const folders: string[] = [];
    function collectFolders(boxes: any, prefix: string = '') {
      for (const name in boxes) {
        const fullName = prefix ? `${prefix}.${name}` : name;
        folders.push(fullName);
        const box = boxes[name];
        if (box.children) {
          collectFolders(box.children, fullName);
        }
      }
    }
    collectFolders(boxes);

    console.log(`🔍 Prüfe ${folders.length} Ordner nach Email mit Code 5664182399...\n`);

    let checkedFolders = 0;
    let foundInFolder: string | null = null;

    folders.forEach((folderName) => {
      imap.openBox(folderName, false, (err, box) => {
        if (err) {
          // Ordner kann nicht geöffnet werden (z.B. nur lesen)
          checkedFolders++;
          if (checkedFolders === folders.length) {
            if (!foundInFolder) {
              console.log('❌ Email wurde in keinem Ordner gefunden');
              console.log('   Die Email wurde wahrscheinlich gelöscht, als versucht wurde, sie in den nicht existierenden "Processed"-Ordner zu verschieben');
            }
            imap.end();
          }
          return;
        }

        if (box.messages.total === 0) {
          checkedFolders++;
          if (checkedFolders === folders.length) {
            if (!foundInFolder) {
              console.log('❌ Email wurde in keinem Ordner gefunden');
            }
            imap.end();
          }
          return;
        }

        // Suche in diesem Ordner
        imap.search(['ALL'], (err, results) => {
          if (err || !results || results.length === 0) {
            checkedFolders++;
            if (checkedFolders === folders.length) {
              if (!foundInFolder) {
                console.log('❌ Email wurde in keinem Ordner gefunden');
              }
              imap.end();
            }
            return;
          }

          // Prüfe nur die letzten 10 Emails in diesem Ordner
          const recentResults = results.slice(-10);
          const fetch = imap.fetch(recentResults, { bodies: '' });

          let foundInThisFolder = false;
          fetch.on('message', (msg) => {
            const chunks: Buffer[] = [];
            msg.on('body', (stream) => {
              stream.on('data', (chunk: Buffer) => {
                chunks.push(chunk);
              });
            });
            msg.once('end', async () => {
              try {
                const { simpleParser } = await import('mailparser');
                const emailBuffer = Buffer.concat(chunks);
                const parsed = await simpleParser(emailBuffer);
                const text = parsed.text || '';
                if (text.includes('5664182399')) {
                  foundInThisFolder = true;
                  foundInFolder = folderName;
                  console.log(`✅ Email gefunden in Ordner: ${folderName}`);
                }
              } catch (e) {
                // Ignoriere Parsing-Fehler
              }
            });
          });

          fetch.once('end', () => {
            checkedFolders++;
            if (checkedFolders === folders.length) {
              if (!foundInFolder) {
                console.log('❌ Email wurde in keinem Ordner gefunden');
                console.log('   Die Email wurde wahrscheinlich gelöscht, als versucht wurde, sie in den nicht existierenden "Processed"-Ordner zu verschieben');
              }
              imap.end();
            }
          });
        });
      });
    });
  });
});

imap.once('error', (err) => {
  console.error('❌ IMAP-Fehler:', err);
});

imap.connect();


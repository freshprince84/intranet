const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://65.109.228.106.nip.io';
const OUTPUT_DIR = path.join(__dirname, '..', 'frontend', 'public', 'landing-assets');

// Stelle sicher, dass das Ausgabeverzeichnis existiert
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });
  const page = await context.newPage();

  try {
    // 1. Login (für geschützte Module)
    console.log('Login...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    // Versuche verschiedene Login-Feld-Selektoren
    const usernameField = await page.$('input[type="text"], input[name="username"], input[id*="username"], input[placeholder*="username" i], input[placeholder*="benutzer" i]');
    const passwordField = await page.$('input[type="password"], input[name="password"], input[id*="password"], input[placeholder*="password" i], input[placeholder*="passwort" i]');
    
    if (usernameField && passwordField) {
      await usernameField.fill('pat');
      await passwordField.fill('megustalafamilia25');
      
      const submitButton = await page.$('button[type="submit"], button:has-text("Login"), button:has-text("Anmelden"), form button');
      if (submitButton) {
        await submitButton.click();
        // Warte auf Navigation (entweder Dashboard oder bleibt auf Login bei Fehler)
        await page.waitForTimeout(3000);
        const currentUrl = page.url();
        console.log(`Nach Login: ${currentUrl}`);
        
        // Wenn noch auf Login-Seite, versuche es nochmal oder überspringe Login
        if (currentUrl.includes('/login')) {
          console.log('Login fehlgeschlagen, versuche direkten Zugriff auf geschützte Seiten...');
        }
      }
    } else {
      console.log('Login-Felder nicht gefunden, versuche direkten Zugriff...');
    }

    // 3. Worktracker Screenshot (Ausschnitt: Task-Liste mit Filter)
    console.log('Screenshot: Worktracker...');
    try {
      await page.goto(`${BASE_URL}/app/worktracker`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);
      
      // Versuche Task-Liste oder Hauptinhalt zu finden
      const mainContent = await page.$('main, [role="main"], .container, .content, .main-content');
      if (mainContent) {
        const boundingBox = await mainContent.boundingBox();
        if (boundingBox) {
          // Fokus auf Hauptinhalt (ohne Navigation/Header)
          await page.screenshot({ 
            path: path.join(OUTPUT_DIR, 'worktracker.png'),
            clip: {
              x: Math.max(0, boundingBox.x),
              y: Math.max(0, boundingBox.y),
              width: Math.min(boundingBox.width, 1200),
              height: Math.min(boundingBox.height, 600)
            }
          });
          console.log('Worktracker Screenshot erstellt (Ausschnitt)');
        } else {
          // Fallback: Vollbild
          await page.screenshot({ 
            path: path.join(OUTPUT_DIR, 'worktracker.png'),
            fullPage: false,
            clip: { x: 0, y: 0, width: 1600, height: 900 }
          });
          console.log('Worktracker Screenshot erstellt (Vollbild)');
        }
      } else {
        // Fallback: Vollbild
        await page.screenshot({ 
          path: path.join(OUTPUT_DIR, 'worktracker.png'),
          fullPage: false,
          clip: { x: 0, y: 0, width: 1600, height: 900 }
        });
        console.log('Worktracker Screenshot erstellt (Vollbild)');
      }
    } catch (err) {
      console.log(`Worktracker Screenshot fehlgeschlagen: ${err.message}`);
    }

    // 4. Consultations Screenshot (Ausschnitt: Formular/Liste)
    console.log('Screenshot: Consultations...');
    try {
      await page.goto(`${BASE_URL}/app/consultations`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);
      
      const mainContent = await page.$('main, [role="main"], .container, .content, form, table');
      if (mainContent) {
        const boundingBox = await mainContent.boundingBox();
        if (boundingBox) {
          await page.screenshot({ 
            path: path.join(OUTPUT_DIR, 'consultations.png'),
            clip: {
              x: Math.max(0, boundingBox.x),
              y: Math.max(0, boundingBox.y),
              width: Math.min(boundingBox.width, 1200),
              height: Math.min(boundingBox.height, 600)
            }
          });
          console.log('Consultations Screenshot erstellt (Ausschnitt)');
        } else {
          await page.screenshot({ 
            path: path.join(OUTPUT_DIR, 'consultations.png'),
            fullPage: false,
            clip: { x: 0, y: 0, width: 1600, height: 900 }
          });
          console.log('Consultations Screenshot erstellt (Vollbild)');
        }
      } else {
        await page.screenshot({ 
          path: path.join(OUTPUT_DIR, 'consultations.png'),
          fullPage: false,
          clip: { x: 0, y: 0, width: 1600, height: 900 }
        });
        console.log('Consultations Screenshot erstellt (Vollbild)');
      }
    } catch (err) {
      console.log(`Consultations Screenshot fehlgeschlagen: ${err.message}`);
    }

    // 5. Team Worktime Control Screenshot (Ausschnitt: Team-Übersicht)
    console.log('Screenshot: Team Worktime Control...');
    try {
      await page.goto(`${BASE_URL}/app/team-worktime-control`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);
      
      const mainContent = await page.$('main, [role="main"], .container, .content, table');
      if (mainContent) {
        const boundingBox = await mainContent.boundingBox();
        if (boundingBox) {
          await page.screenshot({ 
            path: path.join(OUTPUT_DIR, 'team-worktime.png'),
            clip: {
              x: Math.max(0, boundingBox.x),
              y: Math.max(0, boundingBox.y),
              width: Math.min(boundingBox.width, 1200),
              height: Math.min(boundingBox.height, 600)
            }
          });
          console.log('Team Worktime Screenshot erstellt (Ausschnitt)');
        } else {
          await page.screenshot({ 
            path: path.join(OUTPUT_DIR, 'team-worktime.png'),
            fullPage: false,
            clip: { x: 0, y: 0, width: 1600, height: 900 }
          });
          console.log('Team Worktime Screenshot erstellt (Vollbild)');
        }
      } else {
        await page.screenshot({ 
          path: path.join(OUTPUT_DIR, 'team-worktime.png'),
          fullPage: false,
          clip: { x: 0, y: 0, width: 1600, height: 900 }
        });
        console.log('Team Worktime Screenshot erstellt (Vollbild)');
      }
    } catch (err) {
      console.log(`Team Worktime Screenshot fehlgeschlagen: ${err.message}`);
    }

    // 6. Cerebro Screenshot
    console.log('Screenshot: Cerebro...');
    try {
      await page.goto(`${BASE_URL}/app/cerebro`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);
      await page.screenshot({ 
        path: path.join(OUTPUT_DIR, 'cerebro.png'),
        fullPage: false,
        clip: { x: 0, y: 0, width: 1600, height: 900 }
      });
      console.log('Cerebro Screenshot erstellt');
    } catch (err) {
      console.log(`Cerebro Screenshot fehlgeschlagen: ${err.message}`);
    }

    // 7. Document Recognition (Profile/Documents Tab) - Ausschnitt: Upload-Interface
    console.log('Screenshot: Document Recognition...');
    try {
      await page.goto(`${BASE_URL}/app/profile`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);
      // Versuche, zum Documents-Tab zu navigieren
      const docTab = await page.$('button:has-text("Documents"), button:has-text("Dokumente"), [role="tab"]:has-text("Documents"), [role="tab"]:has-text("Dokumente")');
      if (docTab) {
        await docTab.click();
        await page.waitForTimeout(2000);
      }
      
      const mainContent = await page.$('main, [role="main"], .container, .content, form, .upload');
      if (mainContent) {
        const boundingBox = await mainContent.boundingBox();
        if (boundingBox) {
          await page.screenshot({ 
            path: path.join(OUTPUT_DIR, 'document-recognition.png'),
            clip: {
              x: Math.max(0, boundingBox.x),
              y: Math.max(0, boundingBox.y),
              width: Math.min(boundingBox.width, 1200),
              height: Math.min(boundingBox.height, 600)
            }
          });
          console.log('Document Recognition Screenshot erstellt (Ausschnitt)');
        } else {
          await page.screenshot({ 
            path: path.join(OUTPUT_DIR, 'document-recognition.png'),
            fullPage: false,
            clip: { x: 0, y: 0, width: 1600, height: 900 }
          });
          console.log('Document Recognition Screenshot erstellt (Vollbild)');
        }
      } else {
        await page.screenshot({ 
          path: path.join(OUTPUT_DIR, 'document-recognition.png'),
          fullPage: false,
          clip: { x: 0, y: 0, width: 1600, height: 900 }
        });
        console.log('Document Recognition Screenshot erstellt (Vollbild)');
      }
    } catch (err) {
      console.log(`Document Recognition Screenshot fehlgeschlagen: ${err.message}`);
    }

    // 8. Mobile App (öffentlich)
    console.log('Screenshot: Mobile App...');
    try {
      await page.goto(`${BASE_URL}/mobile-app`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);
      await page.screenshot({ 
        path: path.join(OUTPUT_DIR, 'mobile.png'),
        fullPage: false,
        clip: { x: 0, y: 0, width: 1600, height: 900 }
      });
      console.log('Mobile App Screenshot erstellt');
    } catch (err) {
      console.log(`Mobile App Screenshot fehlgeschlagen: ${err.message}`);
    }

    console.log('Alle Screenshots erstellt!');
  } catch (error) {
    console.error('Fehler beim Erstellen der Screenshots:', error);
  } finally {
    await browser.close();
  }
})();

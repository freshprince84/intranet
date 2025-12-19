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
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    // Warte auf Login-Felder
    await page.waitForSelector('input[name="username"], input[id="username"]', { timeout: 10000 });
    await page.waitForSelector('input[name="password"], input[id="password"]', { timeout: 10000 });
    
    // Fülle Login-Felder aus
    await page.fill('input[name="username"], input[id="username"]', 'pat');
    await page.fill('input[name="password"], input[id="password"]', 'megustalafamilia25');
    
    // Warte kurz, dann klicke Submit
    await page.waitForTimeout(500);
    
    // Klicke Submit-Button und warte auf Navigation
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }),
      page.click('button[type="submit"]')
    ]);
    
    // Prüfe ob Login erfolgreich war
    const currentUrl = page.url();
    console.log(`Nach Login: ${currentUrl}`);
    
    if (currentUrl.includes('/login')) {
      console.error('Login fehlgeschlagen - noch auf Login-Seite!');
      throw new Error('Login fehlgeschlagen');
    }
    
    // Warte zusätzlich, damit die Seite vollständig geladen ist
    await page.waitForTimeout(2000);
    console.log('Login erfolgreich!');

    // Prüfe ob wir eingeloggt sind, bevor wir Screenshots machen
    const isLoggedIn = !page.url().includes('/login');
    if (!isLoggedIn) {
      console.error('FEHLER: Nicht eingeloggt! Bitte Login-Prozess prüfen.');
      throw new Error('Login fehlgeschlagen - kann keine Screenshots erstellen');
    }

    // 3. Worktracker Screenshot (Ausschnitt: Task-Liste mit Filter)
    console.log('Screenshot: Worktracker...');
    try {
      await page.goto(`${BASE_URL}/app/worktracker`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);
      
      // Prüfe ob wir auf Login umgeleitet wurden
      if (page.url().includes('/login')) {
        console.log('Worktracker: Umleitung zu Login erkannt - überspringe Screenshot');
        throw new Error('Nicht authentifiziert');
      }
      
      // Suche spezifisch nach Task-Liste, Tabelle oder Filter-Bereich
      const taskList = await page.$('table, .task-list, [class*="task"], [class*="filter"], tbody, .overflow-x-auto');
      if (taskList) {
        const boundingBox = await taskList.boundingBox();
        if (boundingBox) {
          // Fokus auf Task-Liste mit etwas Kontext (50px mehr)
          await page.screenshot({ 
            path: path.join(OUTPUT_DIR, 'worktracker.png'),
            clip: {
              x: Math.max(0, boundingBox.x - 50),
              y: Math.max(0, boundingBox.y - 50),
              width: Math.min(boundingBox.width + 100, 1200),
              height: Math.min(boundingBox.height + 100, 600)
            }
          });
          console.log('Worktracker Screenshot erstellt (Ausschnitt)');
        } else {
          // Fallback: Hauptinhalt
          const mainContent = await page.$('main, [role="main"]');
          if (mainContent) {
            const mainBox = await mainContent.boundingBox();
            if (mainBox) {
              await page.screenshot({ 
                path: path.join(OUTPUT_DIR, 'worktracker.png'),
                clip: {
                  x: Math.max(0, mainBox.x),
                  y: Math.max(0, mainBox.y),
                  width: Math.min(mainBox.width, 1200),
                  height: Math.min(mainBox.height, 600)
                }
              });
              console.log('Worktracker Screenshot erstellt (Hauptinhalt)');
            } else {
              await page.screenshot({ 
                path: path.join(OUTPUT_DIR, 'worktracker.png'),
                fullPage: false,
                clip: { x: 0, y: 0, width: 1600, height: 900 }
              });
              console.log('Worktracker Screenshot erstellt (Vollbild)');
            }
          } else {
            await page.screenshot({ 
              path: path.join(OUTPUT_DIR, 'worktracker.png'),
              fullPage: false,
              clip: { x: 0, y: 0, width: 1600, height: 900 }
            });
            console.log('Worktracker Screenshot erstellt (Vollbild)');
          }
        }
      } else {
        // Fallback: Hauptinhalt
        const mainContent = await page.$('main, [role="main"]');
        if (mainContent) {
          const mainBox = await mainContent.boundingBox();
          if (mainBox) {
            await page.screenshot({ 
              path: path.join(OUTPUT_DIR, 'worktracker.png'),
              clip: {
                x: Math.max(0, mainBox.x),
                y: Math.max(0, mainBox.y),
                width: Math.min(mainBox.width, 1200),
                height: Math.min(mainBox.height, 600)
              }
            });
            console.log('Worktracker Screenshot erstellt (Hauptinhalt)');
          } else {
            await page.screenshot({ 
              path: path.join(OUTPUT_DIR, 'worktracker.png'),
              fullPage: false,
              clip: { x: 0, y: 0, width: 1600, height: 900 }
            });
            console.log('Worktracker Screenshot erstellt (Vollbild)');
          }
        } else {
          await page.screenshot({ 
            path: path.join(OUTPUT_DIR, 'worktracker.png'),
            fullPage: false,
            clip: { x: 0, y: 0, width: 1600, height: 900 }
          });
          console.log('Worktracker Screenshot erstellt (Vollbild)');
        }
      }
    } catch (err) {
      console.log(`Worktracker Screenshot fehlgeschlagen: ${err.message}`);
    }

    // 4. Consultations Screenshot (Ausschnitt: Formular/Liste)
    console.log('Screenshot: Consultations...');
    try {
      await page.goto(`${BASE_URL}/app/consultations`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);
      
      // Prüfe ob wir auf Login umgeleitet wurden
      if (page.url().includes('/login')) {
        console.log('Consultations: Umleitung zu Login erkannt - überspringe Screenshot');
        throw new Error('Nicht authentifiziert');
      }
      
      // Suche spezifisch nach Consultation-Formular, Liste oder Tabelle
      const consultationForm = await page.$('form, .consultation-form, .consultation-list, table, [class*="consultation"], [class*="client"]');
      if (consultationForm) {
        const boundingBox = await consultationForm.boundingBox();
        if (boundingBox) {
          await page.screenshot({ 
            path: path.join(OUTPUT_DIR, 'consultations.png'),
            clip: {
              x: Math.max(0, boundingBox.x - 50),
              y: Math.max(0, boundingBox.y - 50),
              width: Math.min(boundingBox.width + 100, 1200),
              height: Math.min(boundingBox.height + 100, 600)
            }
          });
          console.log('Consultations Screenshot erstellt (Ausschnitt)');
        } else {
          const mainContent = await page.$('main, [role="main"]');
          if (mainContent) {
            const mainBox = await mainContent.boundingBox();
            if (mainBox) {
              await page.screenshot({ 
                path: path.join(OUTPUT_DIR, 'consultations.png'),
                clip: {
                  x: Math.max(0, mainBox.x),
                  y: Math.max(0, mainBox.y),
                  width: Math.min(mainBox.width, 1200),
                  height: Math.min(mainBox.height, 600)
                }
              });
              console.log('Consultations Screenshot erstellt (Hauptinhalt)');
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
        }
      } else {
        const mainContent = await page.$('main, [role="main"]');
        if (mainContent) {
          const mainBox = await mainContent.boundingBox();
          if (mainBox) {
            await page.screenshot({ 
              path: path.join(OUTPUT_DIR, 'consultations.png'),
              clip: {
                x: Math.max(0, mainBox.x),
                y: Math.max(0, mainBox.y),
                width: Math.min(mainBox.width, 1200),
                height: Math.min(mainBox.height, 600)
              }
            });
            console.log('Consultations Screenshot erstellt (Hauptinhalt)');
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
      }
    } catch (err) {
      console.log(`Consultations Screenshot fehlgeschlagen: ${err.message}`);
    }

    // 5. Team Worktime Control Screenshot (Ausschnitt: Team-Übersicht)
    console.log('Screenshot: Team Worktime Control...');
    try {
      await page.goto(`${BASE_URL}/app/team-worktime-control`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);
      
      // Prüfe ob wir auf Login umgeleitet wurden
      if (page.url().includes('/login')) {
        console.log('Team Worktime: Umleitung zu Login erkannt - überspringe Screenshot');
        throw new Error('Nicht authentifiziert');
      }
      
      // Suche spezifisch nach Team-Tabelle oder Liste
      const teamTable = await page.$('table, .team-list, [class*="team"], [class*="worktime"], tbody, .overflow-x-auto');
      if (teamTable) {
        const boundingBox = await teamTable.boundingBox();
        if (boundingBox) {
          await page.screenshot({ 
            path: path.join(OUTPUT_DIR, 'team-worktime.png'),
            clip: {
              x: Math.max(0, boundingBox.x - 50),
              y: Math.max(0, boundingBox.y - 50),
              width: Math.min(boundingBox.width + 100, 1200),
              height: Math.min(boundingBox.height + 100, 600)
            }
          });
          console.log('Team Worktime Screenshot erstellt (Ausschnitt)');
        } else {
          const mainContent = await page.$('main, [role="main"]');
          if (mainContent) {
            const mainBox = await mainContent.boundingBox();
            if (mainBox) {
              await page.screenshot({ 
                path: path.join(OUTPUT_DIR, 'team-worktime.png'),
                clip: {
                  x: Math.max(0, mainBox.x),
                  y: Math.max(0, mainBox.y),
                  width: Math.min(mainBox.width, 1200),
                  height: Math.min(mainBox.height, 600)
                }
              });
              console.log('Team Worktime Screenshot erstellt (Hauptinhalt)');
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
        }
      } else {
        const mainContent = await page.$('main, [role="main"]');
        if (mainContent) {
          const mainBox = await mainContent.boundingBox();
          if (mainBox) {
            await page.screenshot({ 
              path: path.join(OUTPUT_DIR, 'team-worktime.png'),
              clip: {
                x: Math.max(0, mainBox.x),
                y: Math.max(0, mainBox.y),
                width: Math.min(mainBox.width, 1200),
                height: Math.min(mainBox.height, 600)
              }
            });
            console.log('Team Worktime Screenshot erstellt (Hauptinhalt)');
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
      }
    } catch (err) {
      console.log(`Team Worktime Screenshot fehlgeschlagen: ${err.message}`);
    }

    // 6. Cerebro Screenshot (Ausschnitt: Wiki-Editor)
    console.log('Screenshot: Cerebro...');
    try {
      await page.goto(`${BASE_URL}/app/cerebro`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);
      
      // Prüfe ob wir auf Login umgeleitet wurden
      if (page.url().includes('/login')) {
        console.log('Cerebro: Umleitung zu Login erkannt - überspringe Screenshot');
        throw new Error('Nicht authentifiziert');
      }
      
      // Suche spezifisch nach Editor oder Wiki-Content
      const cerebroEditor = await page.$('.editor, textarea, [contenteditable="true"], [class*="editor"], [class*="wiki"], [class*="markdown"], pre, code');
      if (cerebroEditor) {
        const boundingBox = await cerebroEditor.boundingBox();
        if (boundingBox) {
          await page.screenshot({ 
            path: path.join(OUTPUT_DIR, 'cerebro.png'),
            clip: {
              x: Math.max(0, boundingBox.x - 50),
              y: Math.max(0, boundingBox.y - 50),
              width: Math.min(boundingBox.width + 100, 1200),
              height: Math.min(boundingBox.height + 100, 600)
            }
          });
          console.log('Cerebro Screenshot erstellt (Ausschnitt)');
        } else {
          const mainContent = await page.$('main, [role="main"]');
          if (mainContent) {
            const mainBox = await mainContent.boundingBox();
            if (mainBox) {
              await page.screenshot({ 
                path: path.join(OUTPUT_DIR, 'cerebro.png'),
                clip: {
                  x: Math.max(0, mainBox.x),
                  y: Math.max(0, mainBox.y),
                  width: Math.min(mainBox.width, 1200),
                  height: Math.min(mainBox.height, 600)
                }
              });
              console.log('Cerebro Screenshot erstellt (Hauptinhalt)');
            } else {
              await page.screenshot({ 
                path: path.join(OUTPUT_DIR, 'cerebro.png'),
                fullPage: false,
                clip: { x: 0, y: 0, width: 1600, height: 900 }
              });
              console.log('Cerebro Screenshot erstellt (Vollbild)');
            }
          } else {
            await page.screenshot({ 
              path: path.join(OUTPUT_DIR, 'cerebro.png'),
              fullPage: false,
              clip: { x: 0, y: 0, width: 1600, height: 900 }
            });
            console.log('Cerebro Screenshot erstellt (Vollbild)');
          }
        }
      } else {
        const mainContent = await page.$('main, [role="main"]');
        if (mainContent) {
          const mainBox = await mainContent.boundingBox();
          if (mainBox) {
            await page.screenshot({ 
              path: path.join(OUTPUT_DIR, 'cerebro.png'),
              clip: {
                x: Math.max(0, mainBox.x),
                y: Math.max(0, mainBox.y),
                width: Math.min(mainBox.width, 1200),
                height: Math.min(mainBox.height, 600)
              }
            });
            console.log('Cerebro Screenshot erstellt (Hauptinhalt)');
          } else {
            await page.screenshot({ 
              path: path.join(OUTPUT_DIR, 'cerebro.png'),
              fullPage: false,
              clip: { x: 0, y: 0, width: 1600, height: 900 }
            });
            console.log('Cerebro Screenshot erstellt (Vollbild)');
          }
        } else {
          await page.screenshot({ 
            path: path.join(OUTPUT_DIR, 'cerebro.png'),
            fullPage: false,
            clip: { x: 0, y: 0, width: 1600, height: 900 }
          });
          console.log('Cerebro Screenshot erstellt (Vollbild)');
        }
      }
    } catch (err) {
      console.log(`Cerebro Screenshot fehlgeschlagen: ${err.message}`);
    }

    // 7. Document Recognition (Profile/Documents Tab) - Ausschnitt: Upload-Interface
    console.log('Screenshot: Document Recognition...');
    try {
      await page.goto(`${BASE_URL}/app/profile`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);
      
      // Prüfe ob wir auf Login umgeleitet wurden
      if (page.url().includes('/login')) {
        console.log('Document Recognition: Umleitung zu Login erkannt - überspringe Screenshot');
        throw new Error('Nicht authentifiziert');
      }
      // Versuche, zum Documents-Tab zu navigieren
      const docTab = await page.$('button:has-text("Documents"), button:has-text("Dokumente"), [role="tab"]:has-text("Documents"), [role="tab"]:has-text("Dokumente")');
      if (docTab) {
        await docTab.click();
        await page.waitForTimeout(2000);
      }
      
      // Suche spezifisch nach Upload-Interface oder Dokument-Liste
      const documentUpload = await page.$('.upload, [class*="upload"], [class*="document"], form, input[type="file"], button:has-text("Upload"), button:has-text("Hochladen")');
      if (documentUpload) {
        const boundingBox = await documentUpload.boundingBox();
        if (boundingBox) {
          await page.screenshot({ 
            path: path.join(OUTPUT_DIR, 'document-recognition.png'),
            clip: {
              x: Math.max(0, boundingBox.x - 50),
              y: Math.max(0, boundingBox.y - 50),
              width: Math.min(boundingBox.width + 100, 1200),
              height: Math.min(boundingBox.height + 100, 600)
            }
          });
          console.log('Document Recognition Screenshot erstellt (Ausschnitt)');
        } else {
          const mainContent = await page.$('main, [role="main"]');
          if (mainContent) {
            const mainBox = await mainContent.boundingBox();
            if (mainBox) {
              await page.screenshot({ 
                path: path.join(OUTPUT_DIR, 'document-recognition.png'),
                clip: {
                  x: Math.max(0, mainBox.x),
                  y: Math.max(0, mainBox.y),
                  width: Math.min(mainBox.width, 1200),
                  height: Math.min(mainBox.height, 600)
                }
              });
              console.log('Document Recognition Screenshot erstellt (Hauptinhalt)');
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
        }
      } else {
        const mainContent = await page.$('main, [role="main"]');
        if (mainContent) {
          const mainBox = await mainContent.boundingBox();
          if (mainBox) {
            await page.screenshot({ 
              path: path.join(OUTPUT_DIR, 'document-recognition.png'),
              clip: {
                x: Math.max(0, mainBox.x),
                y: Math.max(0, mainBox.y),
                width: Math.min(mainBox.width, 1200),
                height: Math.min(mainBox.height, 600)
              }
            });
            console.log('Document Recognition Screenshot erstellt (Hauptinhalt)');
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

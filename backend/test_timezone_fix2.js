const { PrismaClient } = require('@prisma/client');
const { toZonedTime } = require('date-fns-tz');
const { format } = require('date-fns');
const prisma = new PrismaClient();

async function testTimezoneFix() {
  try {
    const userId = 3; // Pat
    
    // Hole den aktiven Eintrag
    const activeEntry = await prisma.workTime.findFirst({
      where: {
        userId: userId,
        endTime: null
      }
    });
    
    if (!activeEntry) {
      console.log('Kein aktiver Eintrag gefunden');
      return;
    }
    
    console.log('\n=== Test: Zeitzonen-Korrektur (korrigiert) ===\n');
    console.log('StartTime (DB, UTC):', activeEntry.startTime.toISOString());
    console.log('Timezone:', activeEntry.timezone || 'nicht gespeichert');
    
    const nowUtc = new Date();
    console.log('Now (UTC):', nowUtc.toISOString());
    
    if (activeEntry.timezone) {
      // Neue Berechnung (korrekt)
      const startTimeLocal = toZonedTime(activeEntry.startTime, activeEntry.timezone);
      const nowLocal = toZonedTime(nowUtc, activeEntry.timezone);
      
      console.log('\n--- Lokale Zeiten ---');
      console.log(`StartTime (Local): ${format(startTimeLocal, 'yyyy-MM-dd HH:mm:ss')}`);
      console.log(`Now (Local): ${format(nowLocal, 'yyyy-MM-dd HH:mm:ss')}`);
      
      // Extrahiere die lokalen Zeitkomponenten
      const startLocalMs = Date.UTC(
        startTimeLocal.getFullYear(),
        startTimeLocal.getMonth(),
        startTimeLocal.getDate(),
        startTimeLocal.getHours(),
        startTimeLocal.getMinutes(),
        startTimeLocal.getSeconds(),
        startTimeLocal.getMilliseconds()
      );
      
      const nowLocalMs = Date.UTC(
        nowLocal.getFullYear(),
        nowLocal.getMonth(),
        nowLocal.getDate(),
        nowLocal.getHours(),
        nowLocal.getMinutes(),
        nowLocal.getSeconds(),
        nowLocal.getMilliseconds()
      );
      
      // Berechne die Differenz in der lokalen Zeitzone (in Millisekunden)
      const diffMs = nowLocalMs - startLocalMs;
      const newHours = diffMs / (1000 * 60 * 60);
      
      console.log('\n--- Berechnung ---');
      console.log(`StartLocalMs: ${startLocalMs} (${new Date(startLocalMs).toISOString()})`);
      console.log(`NowLocalMs: ${nowLocalMs} (${new Date(nowLocalMs).toISOString()})`);
      console.log(`Differenz (Local): ${newHours.toFixed(2)}h (${(diffMs / 1000 / 60).toFixed(0)} Minuten)`);
      
      // Vergleich mit alter Berechnung
      const oldDiff = nowUtc.getTime() - activeEntry.startTime.getTime();
      const oldHours = oldDiff / (1000 * 60 * 60);
      
      console.log('\n--- Vergleich ---');
      console.log(`Alte Berechnung (UTC direkt): ${oldHours.toFixed(2)}h`);
      console.log(`Neue Berechnung (lokal): ${newHours.toFixed(2)}h`);
      console.log(`Unterschied: ${(oldHours - newHours).toFixed(2)}h`);
    } else {
      console.log('\n⚠️ Keine Zeitzone gespeichert, kann nicht testen');
    }
    
  } catch (error) {
    console.error('Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testTimezoneFix();



const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugTimezoneIssue() {
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
    
    console.log('\n=== Zeitzonen-Debug ===\n');
    console.log('StartTime (DB, UTC):', activeEntry.startTime.toISOString());
    console.log('StartTime (DB, Local):', activeEntry.startTime.toString());
    console.log('Timezone (gespeichert):', activeEntry.timezone || 'nicht gespeichert');
    
    const now = new Date();
    console.log('\nJetzt (UTC):', now.toISOString());
    console.log('Jetzt (Local):', now.toString());
    console.log('Zeitzone (System):', Intl.DateTimeFormat().resolvedOptions().timeZone);
    console.log('UTC-Offset (Minuten):', now.getTimezoneOffset());
    
    // Berechne Differenz
    const diffMs = now.getTime() - activeEntry.startTime.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = diffMs / (1000 * 60 * 60);
    
    console.log('\n=== Berechnete Differenz ===');
    console.log(`Differenz (Millisekunden): ${diffMs}`);
    console.log(`Differenz (Minuten): ${diffMinutes} Minuten`);
    console.log(`Differenz (Stunden): ${diffHours.toFixed(2)}h`);
    
    // Prüfe, was im Controller berechnet wird
    const periodStartStr = '2025-11-12';
    const periodStartUtc = new Date(`${periodStartStr}T00:00:00.000Z`);
    const periodEndUtc = new Date(`${periodStartStr}T23:59:59.999Z`);
    
    console.log('\n=== Controller-Berechnung (für heute) ===');
    console.log(`PeriodStartUtc: ${periodStartUtc.toISOString()}`);
    console.log(`PeriodEndUtc: ${periodEndUtc.toISOString()}`);
    
    const effectiveEndTime = activeEntry.endTime || now;
    const actualStartTime = activeEntry.startTime < periodStartUtc ? periodStartUtc : activeEntry.startTime;
    const actualEndTime = effectiveEndTime > periodEndUtc ? periodEndUtc : effectiveEndTime;
    
    console.log(`EffectiveEndTime: ${effectiveEndTime.toISOString()}`);
    console.log(`ActualStartTime: ${actualStartTime.toISOString()}`);
    console.log(`ActualEndTime: ${actualEndTime.toISOString()}`);
    
    const workTime = actualEndTime.getTime() - actualStartTime.getTime();
    const hours = workTime / (1000 * 60 * 60);
    
    console.log(`\nBerechnete Stunden: ${hours.toFixed(2)}h`);
    console.log(`\nPROBLEM: Wenn lokal 00:34 ist und Start 00:07:58 war, sollten es nur ~0.4h sein!`);
    console.log(`Aber berechnet werden ${hours.toFixed(2)}h - das ist ${(hours / 0.4).toFixed(1)}x zu viel!`);
    
    // Prüfe, ob StartTime vielleicht in lokaler Zeit gespeichert wurde
    console.log('\n=== Prüfung: StartTime-Format ===');
    const startTimeLocal = new Date(activeEntry.startTime);
    console.log('StartTime UTC-Hours:', startTimeLocal.getUTCHours());
    console.log('StartTime Local-Hours:', startTimeLocal.getHours());
    console.log('Unterschied:', startTimeLocal.getUTCHours() - startTimeLocal.getHours(), 'Stunden');
    
    // Wenn StartTime in lokaler Zeit gespeichert wurde, aber als UTC interpretiert wird
    const possibleIssue = startTimeLocal.getUTCHours() !== startTimeLocal.getHours();
    if (possibleIssue) {
      console.log('\n⚠️ PROBLEM ERKANNT:');
      console.log('StartTime wurde möglicherweise in lokaler Zeit gespeichert,');
      console.log('aber wird als UTC interpretiert!');
      console.log(`Das würde ${Math.abs(startTimeLocal.getUTCHours() - startTimeLocal.getHours())} Stunden Differenz verursachen.`);
    }
    
  } catch (error) {
    console.error('Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugTimezoneIssue();



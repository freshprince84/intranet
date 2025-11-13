const { PrismaClient } = require('@prisma/client');
const { format } = require('date-fns');
const prisma = new PrismaClient();

async function debugStatsCalculation() {
  try {
    const userId = 3; // Pat
    const today = new Date();
    
    // Berechne Montag der aktuellen Woche
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    monday.setHours(0, 0, 0, 0);
    
    const periodStartStr = format(monday, 'yyyy-MM-dd');
    const periodEndStr = format(new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
    
    console.log(`\n=== Debug: Stats-Berechnung für Woche ===`);
    console.log(`Woche: ${periodStartStr} bis ${periodEndStr}\n`);
    
    // UTC-Zeitgrenzen (wie im Controller)
    const periodStartUtc = new Date(`${periodStartStr}T00:00:00.000Z`);
    const periodEndUtc = new Date(`${periodEndStr}T23:59:59.999Z`);
    const now = new Date();
    
    console.log(`Zeitgrenzen:`);
    console.log(`  Start (UTC): ${periodStartUtc.toISOString()}`);
    console.log(`  Ende (UTC): ${periodEndUtc.toISOString()}`);
    console.log(`  Jetzt: ${now.toISOString()}\n`);
    
    // Hole Einträge (wie im Controller)
    const entries = await prisma.workTime.findMany({
      where: {
        userId: userId,
        OR: [
          {
            startTime: {
              gte: periodStartUtc,
              lte: periodEndUtc
            }
          },
          {
            startTime: {
              lt: periodStartUtc
            },
            endTime: null
          }
        ]
      },
      include: {
        user: true,
      },
    });
    
    console.log(`Gefundene Einträge: ${entries.length}\n`);
    
    // Erstelle periodData (wie im Controller für Woche)
    const periodData = [
      { day: "Montag", hours: 0, date: "" },
      { day: "Dienstag", hours: 0, date: "" },
      { day: "Mittwoch", hours: 0, date: "" },
      { day: "Donnerstag", hours: 0, date: "" },
      { day: "Freitag", hours: 0, date: "" },
      { day: "Samstag", hours: 0, date: "" },
      { day: "Sonntag", hours: 0, date: "" }
    ];
    
    // Berechne Datum für jeden Wochentag
    function calculateDateFromWeekStart(weekStartStr, daysToAdd) {
      const parts = weekStartStr.split('-');
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]);
      const day = parseInt(parts[2]);
      
      let newDay = day + daysToAdd;
      let newMonth = month;
      let newYear = year;
      
      const daysInMonth = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      if ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) {
        daysInMonth[2] = 29;
      }
      
      if (newDay > daysInMonth[newMonth]) {
        newDay = newDay - daysInMonth[newMonth];
        newMonth++;
        if (newMonth > 12) {
          newMonth = 1;
          newYear++;
        }
      }
      
      return `${newYear}-${newMonth.toString().padStart(2, '0')}-${newDay.toString().padStart(2, '0')}`;
    }
    
    periodData.forEach((dayData, index) => {
      dayData.date = calculateDateFromWeekStart(periodStartStr, index);
    });
    
    console.log(`PeriodData initialisiert:`);
    periodData.forEach(d => console.log(`  ${d.day}: ${d.date}`));
    console.log('');
    
    let totalHours = 0;
    let daysWorked = 0;
    
    // Berechnung (wie im Controller)
    entries.forEach((entry, entryIndex) => {
      console.log(`\n--- Eintrag ${entryIndex + 1} ---`);
      console.log(`ID: ${entry.id}`);
      console.log(`StartTime (DB): ${entry.startTime.toISOString()}`);
      console.log(`EndTime (DB): ${entry.endTime ? entry.endTime.toISOString() : 'null (aktiv)'}`);
      
      const effectiveEndTime = entry.endTime || now;
      const actualStartTime = entry.startTime < periodStartUtc ? periodStartUtc : entry.startTime;
      const actualEndTime = effectiveEndTime > periodEndUtc ? periodEndUtc : effectiveEndTime;
      
      console.log(`EffectiveEndTime: ${effectiveEndTime.toISOString()}`);
      console.log(`ActualStartTime: ${actualStartTime.toISOString()}`);
      console.log(`ActualEndTime: ${actualEndTime.toISOString()}`);
      
      if (actualStartTime < actualEndTime) {
        const workTime = actualEndTime.getTime() - actualStartTime.getTime();
        const hoursWorked = workTime / (1000 * 60 * 60);
        
        console.log(`HoursWorked (gesamt): ${hoursWorked.toFixed(2)}h`);
        
        const startDate = new Date(actualStartTime);
        const endDate = new Date(actualEndTime);
        
        let currentDate = new Date(startDate);
        currentDate.setUTCHours(0, 0, 0, 0);
        
        console.log(`\n  Tage-Verteilung:`);
        let dayIndex = 0;
        while (currentDate <= endDate && dayIndex < 10) {
          dayIndex++;
          const dayStart = currentDate > startDate ? currentDate : startDate;
          const dayEnd = new Date(currentDate);
          dayEnd.setUTCHours(23, 59, 59, 999);
          const dayEndActual = dayEnd < endDate ? dayEnd : endDate;
          
          const dayWorkTime = dayEndActual.getTime() - dayStart.getTime();
          const dayHours = dayWorkTime / (1000 * 60 * 60);
          
          if (dayHours > 0) {
            const year = currentDate.getUTCFullYear();
            const month = String(currentDate.getUTCMonth() + 1).padStart(2, '0');
            const dayOfMonth = String(currentDate.getUTCDate()).padStart(2, '0');
            const dateString = `${year}-${month}-${dayOfMonth}`;
            
            console.log(`    Tag ${dayIndex}: ${dateString}`);
            console.log(`      DayStart: ${dayStart.toISOString()}`);
            console.log(`      DayEndActual: ${dayEndActual.toISOString()}`);
            console.log(`      DayHours: ${dayHours.toFixed(2)}h`);
            
            const dayEntry = periodData.find(d => d.date === dateString);
            
            if (dayEntry) {
              const oldHours = dayEntry.hours;
              dayEntry.hours += dayHours;
              console.log(`      Gefunden in periodData: ${dayEntry.day}`);
              console.log(`      Alte Stunden: ${oldHours.toFixed(2)}h, Neue Stunden: ${dayEntry.hours.toFixed(2)}h`);
              
              if (dayHours > 0 && oldHours === 0) {
                daysWorked++;
                console.log(`      -> daysWorked erhöht auf: ${daysWorked}`);
              }
            } else {
              console.log(`      WARNUNG: Datum ${dateString} nicht in periodData gefunden!`);
            }
          }
          
          currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        }
        
        totalHours += hoursWorked;
        console.log(`\n  TotalHours nach diesem Eintrag: ${totalHours.toFixed(2)}h`);
      } else {
        console.log(`  Übersprungen: actualStartTime >= actualEndTime`);
      }
    });
    
    // Runden
    periodData.forEach(day => {
      day.hours = Math.round(day.hours * 10) / 10;
    });
    totalHours = Math.round(totalHours * 10) / 10;
    const averageHoursPerDay = daysWorked > 0 ? Math.round((totalHours / daysWorked) * 10) / 10 : 0;
    
    console.log(`\n=== Ergebnis ===`);
    console.log(`TotalHours: ${totalHours}h`);
    console.log(`AverageHoursPerDay: ${averageHoursPerDay}h`);
    console.log(`DaysWorked: ${daysWorked}`);
    console.log(`\nWeeklyData:`);
    periodData.forEach(d => {
      console.log(`  ${d.day} (${d.date}): ${d.hours.toFixed(1)}h`);
    });
    
  } catch (error) {
    console.error('Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugStatsCalculation();



import { Request, Response } from 'express';
import { PrismaClient, Prisma, NotificationType } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { startOfWeek, endOfWeek, format, startOfDay, endOfDay, isAfter, isSameDay, addDays, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { createNotificationIfEnabled } from './notificationController';
import { parse } from 'date-fns';
import { getDataIsolationFilter } from '../middleware/organization';
import { getUserLanguage, getWorktimeNotificationText } from '../utils/translations';

const prisma = new PrismaClient();

export const startWorktime = async (req: Request, res: Response) => {
  try {
    const { branchId, startTime } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    // Prüfe, ob bereits eine aktive Zeiterfassung existiert
    const activeWorktime = await prisma.workTime.findFirst({
      where: {
        userId: Number(userId),
        endTime: null
      }
    });

    if (activeWorktime) {
      return res.status(400).json({ message: 'Es läuft bereits eine Zeiterfassung' });
    }

    // Hole den Benutzer mit seinen Arbeitszeiteinstellungen
    const user = await prisma.user.findUnique({
      where: { id: Number(userId) }
    });

    if (!user) {
      return res.status(404).json({ message: 'Benutzer nicht gefunden' });
    }

    // Prüfe ob bankDetails ausgefüllt ist (erforderlich für Zeiterfassung)
    if (!user.bankDetails || user.bankDetails.trim() === '') {
      return res.status(403).json({ 
        message: 'Bitte geben Sie zuerst Ihre Bankverbindung im Profil ein, bevor Sie die Zeiterfassung nutzen können.' 
      });
    }

    // Verwende direkt das aktuelle Datum oder das übergebene Startdatum
    const now = startTime ? new Date(startTime) : new Date();
    
    // Erstelle das Datum für den Anfang und das Ende des aktuellen Tages (entsprechend getWorktimes)
    const year = now.getFullYear();
    const month = now.getMonth(); // Monate sind 0-basiert in JavaScript
    const day = now.getDate();
    
    // Erstelle lokales Datum für den Anfang des Tages
    const localStartOfDay = new Date(year, month, day, 0, 0, 0);
    const localEndOfDay = new Date(year, month, day, 23, 59, 59, 999);
    
    // Zeitzonenversatz berechnen
    const startOffsetMinutes = localStartOfDay.getTimezoneOffset();
    const endOffsetMinutes = localEndOfDay.getTimezoneOffset();
    
    // Kompensierte Zeiten erstellen für korrekte UTC-Darstellung
    const todayStart = new Date(localStartOfDay.getTime() - startOffsetMinutes * 60000);
    const todayEnd = new Date(localEndOfDay.getTime() - endOffsetMinutes * 60000);
    
    // Protokolliere die berechneten Zeitgrenzen für bessere Nachvollziehbarkeit
    console.log(`Berechneter Tagesbeginn (kompensiert): ${todayStart.toISOString()}`);
    console.log(`Berechnetes Tagesende (kompensiert): ${todayEnd.toISOString()}`);

    // Hole alle Zeiterfassungen für heute
    const todaysWorktimes = await prisma.workTime.findMany({
      where: {
        userId: Number(userId),
        startTime: {
          gte: todayStart,
          lte: todayEnd
        },
        endTime: {
          not: null
        }
      }
    });

    // Berechne die gesamte Arbeitszeit für heute in Millisekunden
    let totalWorkTimeMs = 0;
    
    // Protokolliere jede einzelne Zeiterfassung für bessere Transparenz
    console.log(`Gefundene abgeschlossene Zeiterfassungen für heute: ${todaysWorktimes.length}`);
    for (const workTime of todaysWorktimes) {
      if (workTime.endTime) {
        const workTimeMs = workTime.endTime.getTime() - workTime.startTime.getTime();
        const workTimeHours = workTimeMs / (1000 * 60 * 60);
        console.log(`Zeiterfassung ID ${workTime.id}: ${workTime.startTime.toISOString()} - ${workTime.endTime.toISOString()} = ${workTimeHours.toFixed(2)}h`);
        totalWorkTimeMs += workTimeMs;
      }
    }

    // Konvertiere Millisekunden in Stunden
    const totalWorkTimeHours = totalWorkTimeMs / (1000 * 60 * 60);
    
    // Wenn die gesamte Arbeitszeit die normale Arbeitszeit überschreitet, verhindere den Start
    if (totalWorkTimeHours >= user.normalWorkingHours) {
      console.log(`Schwellenwert erreicht oder überschritten. Verhindere Start der Zeiterfassung.`);
      return res.status(403).json({
        message: `Die tägliche Arbeitszeit von ${user.normalWorkingHours}h wurde bereits erreicht. Die Zeiterfassung kann erst am nächsten Tag wieder gestartet werden.`
      });
    }
    
    // Speichere die aktuelle Zeit direkt
    const worktime = await prisma.workTime.create({
      data: {
        startTime: now,
        userId: Number(userId),
        branchId: Number(branchId),
        // Speichere die Zeitzone des Benutzers, um später die korrekte Anzeige zu ermöglichen
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        organizationId: req.organizationId || null
      },
      include: {
        branch: true
      }
    });

    console.log(`Zeiterfassung ID ${worktime.id} gespeichert mit Startzeit: ${worktime.startTime.toISOString()}`);

    // Erstelle eine Benachrichtigung, wenn eingeschaltet
    const userLang = await getUserLanguage(Number(userId));
    const notificationText = getWorktimeNotificationText(userLang, 'start', worktime.branch.name);
    await createNotificationIfEnabled({
      userId: Number(userId),
      title: notificationText.title,
      message: notificationText.message,
      type: NotificationType.worktime,
      relatedEntityId: worktime.id,
      relatedEntityType: 'start'
    });

    res.status(201).json(worktime);
  } catch (error) {
    console.error('Fehler beim Starten der Zeiterfassung:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

export const stopWorktime = async (req: Request, res: Response) => {
  try {
    const { endTime, force } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    // Finde die aktive Zeiterfassung für den Benutzer
    const activeWorktime = await prisma.workTime.findFirst({
      where: {
        userId: Number(userId),
        endTime: null
      }
    });

    if (!activeWorktime) {
      return res.status(404).json({ message: 'Keine aktive Zeiterfassung gefunden' });
    }

    // VEREINFACHT: Verwende die aktuelle Zeit oder die übergebene endTime direkt
    const now = endTime ? new Date(endTime) : new Date();
    
    console.log(`Stoppe Zeiterfassung mit Endzeit: ${now.toISOString()}`);

    const worktime = await prisma.workTime.update({
      where: { id: activeWorktime.id },
      data: { 
        endTime: now,
        // Wenn bisher keine Zeitzone gespeichert ist, aktualisiere sie
        ...(activeWorktime.timezone ? {} : { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })
      },
      include: {
        branch: true,
        user: true
      }
    });
    
    console.log(`Gespeicherte Endzeit: ${worktime.endTime.toISOString()}`);

    // Erstelle eine Benachrichtigung, wenn eingeschaltet
    const userLang = await getUserLanguage(Number(userId));
    const notificationText = getWorktimeNotificationText(userLang, 'stop', worktime.branch.name);
    await createNotificationIfEnabled({
      userId: Number(userId),
      title: notificationText.title,
      message: notificationText.message,
      type: NotificationType.worktime,
      relatedEntityId: worktime.id,
      relatedEntityType: 'stop'
    });

    res.json(worktime);
  } catch (error) {
    console.error('Fehler beim Stoppen der Zeiterfassung:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

export const getWorktimes = async (req: Request, res: Response) => {
  try {
    const { date } = req.query;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    // Benutzer abrufen, um die Zeitzone zu bestimmen
    const user = await prisma.user.findUnique({
      where: { id: Number(userId) }
    });

    if (!user) {
      return res.status(404).json({ message: 'Benutzer nicht gefunden' });
    }

    let whereClause: Prisma.WorkTimeWhereInput = {
      ...getDataIsolationFilter(req as any, 'worktime')
    };

    if (date) {
      const queryDateStr = date as string;
      
      // Wir erstellen das Datum für den Anfang des Tages
      const dateParts = queryDateStr.split('-');
      if (dateParts.length !== 3) {
        return res.status(400).json({ message: 'Ungültiges Datumsformat' });
      }
      
      const year = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]) - 1; // Monate sind 0-basiert in JavaScript
      const day = parseInt(dateParts[2]);
      
      // Erstelle lokales Datum für den Anfang des Tages
      const localStartOfDay = new Date(year, month, day, 0, 0, 0);
      const localEndOfDay = new Date(year, month, day, 23, 59, 59, 999);
      
      // Zeitzonenversatz berechnen
      const startOffsetMinutes = localStartOfDay.getTimezoneOffset();
      const endOffsetMinutes = localEndOfDay.getTimezoneOffset();
      
      // Kompensierte Zeiten erstellen
      const compensatedStartOfDay = new Date(localStartOfDay.getTime() - startOffsetMinutes * 60000);
      const compensatedEndOfDay = new Date(localEndOfDay.getTime() - endOffsetMinutes * 60000);
      
      console.log(`Filterung für Datum: ${year}-${month+1}-${day}`);
      console.log(`Original Start des Tages: ${localStartOfDay.toISOString()}`);
      console.log(`Kompensierter Start des Tages: ${compensatedStartOfDay.toISOString()}`);
      console.log(`Original Ende des Tages: ${localEndOfDay.toISOString()}`);
      console.log(`Kompensiertes Ende des Tages: ${compensatedEndOfDay.toISOString()}`);
      
      // Setze die Abfragebedingung
      whereClause = {
        ...whereClause,
        startTime: {
          gte: compensatedStartOfDay,
          lte: compensatedEndOfDay
        }
      };
    }

    const worktimes = await prisma.workTime.findMany({
      where: whereClause,
      include: {
        branch: true
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    res.json(worktimes);
  } catch (error) {
    console.error('Fehler beim Abrufen der Zeiterfassungen:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

export const deleteWorktime = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    // Datenisolation: Nur WorkTimes der Organisation
    const worktimeFilter = getDataIsolationFilter(req as any, 'worktime');
    const worktime = await prisma.workTime.findFirst({
      where: {
        ...worktimeFilter,
        id: Number(id)
      }
    });

    if (!worktime) {
      return res.status(404).json({ message: 'Zeiterfassung nicht gefunden' });
    }

    await prisma.workTime.delete({
      where: { id: Number(id) }
    });

    res.json({ message: 'Zeiterfassung erfolgreich gelöscht' });
  } catch (error) {
    console.error('Fehler beim Löschen der Zeiterfassung:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

export const updateWorktime = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { startTime, endTime, branchId } = req.body;
    const userId = req.userId;

    console.log('DEBUG updateWorktime Received:', JSON.stringify({ id, startTime, endTime, branchId, userId }));

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    // Datenisolation: Nur WorkTimes der Organisation
    const worktimeFilter = getDataIsolationFilter(req as any, 'worktime');

    // Prüfe, ob die Zeiterfassung existiert und zur Organisation gehört
    const worktime = await prisma.workTime.findFirst({
      where: {
        ...worktimeFilter,
        id: Number(id)
      }
    });

    if (!worktime) {
      return res.status(404).json({ message: 'Zeiterfassung nicht gefunden' });
    }

    // Daten für das Update vorbereiten
    const updateData: any = {};
    if (branchId) updateData.branchId = Number(branchId);
    
    // Hilfsfunktion zum sicheren Konvertieren von Datumsstrings
    const safeDateParse = (dateString: string | null) => {
      if (!dateString) return null;
      
      try {
        // Bereinige zuerst das Eingabeformat - entferne ein möglicherweise zusätzliches ":00" am Ende
        let cleanDateString = dateString;
        if (dateString.match(/T\d{2}:\d{2}:\d{2}:\d{2}$/)) {
          // Format ist YYYY-MM-DDTHH:MM:SS:00 - entferne das letzte :00
          cleanDateString = dateString.substring(0, dateString.lastIndexOf(':'));
          console.log(`Bereinigter Datumsstring: ${cleanDateString}`);
        }
        
        // Jetzt normale Verarbeitung mit dem bereinigten String
        // Prüfe, ob es ein ISO-String im Format YYYY-MM-DDTHH:MM:SS ist
        if (typeof cleanDateString === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(cleanDateString)) {
          // Manuell Datum erstellen aus den einzelnen Komponenten
          const [datePart, timePart] = cleanDateString.split('T');
          const [year, month, day] = datePart.split('-').map(Number);
          const [hours, minutes, seconds] = timePart.split(':').map(Number);
          
          return new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
        } else {
          // Fallback für andere Formate
          const date = new Date(cleanDateString);
          if (isNaN(date.getTime())) {
            console.error(`Ungültiges Datum: ${cleanDateString}`);
            return null;
          }
          return date;
        }
      } catch (error) {
        console.error(`Fehler beim Parsen des Datums ${dateString}:`, error);
        return null;
      }
    };
    
    // Startzeit aktualisieren (wenn vorhanden)
    if (startTime) {
      const parsedStartTime = safeDateParse(startTime);
      if (parsedStartTime) {
        updateData.startTime = parsedStartTime;
        console.log('Startzeit für Update:', parsedStartTime.toISOString());
      } else {
        return res.status(400).json({ message: 'Ungültiges Startzeit-Format' });
      }
    }
    
    // Endzeit aktualisieren (wenn vorhanden)
    if (endTime !== undefined) {
      // Wenn endTime null ist, setze es explizit auf null
      if (endTime === null) {
        updateData.endTime = null;
        console.log('Endzeit für Update: null');
      } else {
        const parsedEndTime = safeDateParse(endTime);
        if (parsedEndTime) {
          updateData.endTime = parsedEndTime;
          console.log('Endzeit für Update:', parsedEndTime.toISOString());
        } else {
          return res.status(400).json({ message: 'Ungültiges Endzeit-Format' });
        }
      }
    }
    
    console.log('Final updateData:', JSON.stringify(updateData));

    const updatedWorktime = await prisma.workTime.update({
      where: { id: Number(id) },
      data: updateData,
      include: {
        branch: true
      }
    });

    res.json(updatedWorktime);
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Zeiterfassung:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

export const getWorktimeStats = async (req: Request, res: Response) => {
  try {
    const { week, quinzena } = req.query;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }
    
    // Bestimme Periodentyp und Startdatum
    const isQuinzena = !!quinzena;
    let periodStartStr = (quinzena || week) as string;
    
    // Fallback: Aktuelle Woche/Quinzena berechnen
    if (!periodStartStr) {
      const today = new Date();
      if (isQuinzena) {
        // Berechne aktuelle Quinzena
        const day = today.getDate();
        const quinzenaStart = day <= 15 
          ? new Date(today.getFullYear(), today.getMonth(), 1)
          : new Date(today.getFullYear(), today.getMonth(), 16);
        periodStartStr = format(quinzenaStart, 'yyyy-MM-dd');
      } else {
        const monday = startOfWeek(today, { weekStartsOn: 1 });
        periodStartStr = format(monday, 'yyyy-MM-dd');
      }
    }
    
    // Berechne Periodenende und Anzahl der Tage
    let periodEndStr: string;
    let daysInPeriod: number;
    
    if (isQuinzena) {
      // Quinzena: monatsbasiert
      // Parse periodStartStr sicher (YYYY-MM-DD) um Zeitzonenprobleme zu vermeiden
      const [startYear, startMonth, startDay] = periodStartStr.split('-').map(Number);
      const year = startYear;
      const month = startMonth - 1; // 0-11
      const day = startDay;
      
      if (day === 1) {
        // Erste Quinzena: 1.-15.
        const endDate = new Date(year, month, 15);
        periodEndStr = format(endDate, 'yyyy-MM-dd');
        daysInPeriod = 15;
      } else {
        // Zweite Quinzena: 16.-Monatsende
        const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
        const endDate = new Date(year, month, lastDayOfMonth);
        periodEndStr = format(endDate, 'yyyy-MM-dd');
        daysInPeriod = lastDayOfMonth - 15;
      }
    } else {
      // Woche: 7 Tage
      const tempDate = new Date(periodStartStr);
      tempDate.setDate(tempDate.getDate() + 6); // Sonntag
      periodEndStr = format(tempDate, 'yyyy-MM-dd');
      daysInPeriod = 7;
    }
        
    // UTC-Zeitgrenzen für Datenbankabfrage
    const periodStartUtc = new Date(`${periodStartStr}T00:00:00.000Z`);
    const periodEndUtc = new Date(`${periodEndStr}T23:59:59.999Z`);
    
    // Aktuelle Zeit für aktive Zeitmessungen (UTC)
    const nowUtc = new Date();
        
    // Direkte Suche nach den Einträgen mit universellen UTC-Grenzen
    // WICHTIG: Auch aktive Zeitmessungen (endTime: null) holen, die im Zeitraum starten
    // ODER die vor dem Zeitraum starten aber noch aktiv sind (können in den Zeitraum hineinreichen)
    const entries = await prisma.workTime.findMany({
      where: {
        userId: Number(userId),
        OR: [
          // Einträge, die im Zeitraum starten (abgeschlossen oder aktiv)
          {
        startTime: {
          gte: periodStartUtc,
          lte: periodEndUtc
            }
          },
          // Aktive Einträge, die vor dem Zeitraum starten aber noch aktiv sind
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

    console.log(`Gefundene Einträge (${isQuinzena ? 'Quinzena' : 'Woche'}): ${entries.length}`);
    if (entries.length > 0) {
      entries.forEach((entry, index) => {
        console.log(`Eintrag ${index + 1} - startTime: ${entry.startTime.toISOString()}, endTime: ${entry.endTime ? entry.endTime.toISOString() : 'null (aktiv)'}`);
      });
    }
    
    // Erstelle Tagesdaten-Struktur
    let periodData: Array<{ day: string; hours: number; date: string }>;
    
    if (isQuinzena) {
      // Quinzena: Erstelle Array für alle Tage
      periodData = [];
      // Parse periodStartStr sicher (YYYY-MM-DD)
      const [startYear, startMonth, startDay] = periodStartStr.split('-').map(Number);
      
      for (let i = 0; i < daysInPeriod; i++) {
        // Verwende UTC-Datum um Zeitzonenprobleme zu vermeiden
        const currentDate = new Date(Date.UTC(startYear, startMonth - 1, startDay + i, 12, 0, 0));
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        const dayName = format(currentDate, 'EEEE', { locale: de }); // Wochentag
        
        periodData.push({
          day: dayName,
          hours: 0,
          date: dateStr
        });
      }
      
      console.log(`Quinzena periodData erstellt: ${periodData.length} Tage von ${periodStartStr} bis ${periodEndStr}`);
      console.log('PeriodData:', periodData.map(d => `${d.date}: ${d.day}`));
    } else {
      // Woche: Wochentage (bestehend)
      periodData = [
        { day: "Montag", hours: 0, date: "" },
        { day: "Dienstag", hours: 0, date: "" },
        { day: "Mittwoch", hours: 0, date: "" },
        { day: "Donnerstag", hours: 0, date: "" },
        { day: "Freitag", hours: 0, date: "" },
        { day: "Samstag", hours: 0, date: "" },
        { day: "Sonntag", hours: 0, date: "" }
      ];
      
      // Berechne Datum für jeden Wochentag
      periodData.forEach((dayData, index) => {
        dayData.date = calculateDateFromWeekStart(periodStartStr, index);
      });
    }

    // Berechne die Gesamtstunden und verteile sie auf die Tage
    let totalHours = 0;
    let daysWorked = 0;

    // Für jeden Zeiteintrag berechnen wir die Arbeitszeit in Stunden
    entries.forEach(entry => {
      // Bestimme effektive Endzeit: Entweder gespeicherte Endzeit oder aktuelle Zeit (für aktive Zeitmessungen)
      let effectiveEndTime: Date;
      
      if (entry.endTime) {
        // Abgeschlossene Zeitmessung: Verwende gespeicherte Endzeit
        effectiveEndTime = entry.endTime;
      } else {
        // Aktive Zeitmessung: Berechne aktuelle Zeit in der Zeitzone des Eintrags
        // WICHTIG: Wenn entry.timezone gespeichert ist, müssen wir die aktuelle Zeit
        // in dieser Zeitzone berechnen, nicht in UTC, um die korrekte Differenz zu erhalten
        
        // KORREKT: Wie im WorktimeTracker - direkte UTC-Differenz berechnen
        // Die Differenz zwischen zwei UTC-Zeiten ist immer korrekt, unabhängig von der Zeitzone
        // effectiveEndTime ist einfach nowUtc (aktuelle UTC-Zeit)
        effectiveEndTime = nowUtc;
        
        // Für Logging: Berechne Differenz und konvertiere zu lokaler Zeit (falls timezone vorhanden)
        if (entry.timezone) {
          const diffMs = nowUtc.getTime() - entry.startTime.getTime();
          const startTimeLocal = toZonedTime(entry.startTime, entry.timezone);
          const nowLocal = toZonedTime(nowUtc, entry.timezone);
          
          console.log(`Zeitzonen-Korrektur für aktive Zeitmessung (ID: ${entry.id}):`);
          console.log(`  Timezone: ${entry.timezone}`);
          console.log(`  StartTime (UTC): ${entry.startTime.toISOString()}`);
          console.log(`  StartTime (Local): ${format(startTimeLocal, 'yyyy-MM-dd HH:mm:ss')} (${entry.timezone})`);
          console.log(`  Now (UTC): ${nowUtc.toISOString()}`);
          console.log(`  Now (Local): ${format(nowLocal, 'yyyy-MM-dd HH:mm:ss')} (${entry.timezone})`);
          console.log(`  Diff (UTC): ${(diffMs / (1000 * 60 * 60)).toFixed(2)}h`);
          console.log(`  EffectiveEndTime (UTC): ${effectiveEndTime.toISOString()}`);
        }
      }
      
      // Für aktive Zeitmessungen: Berechne Differenz direkt (wie im Modal)
      // Für abgeschlossene Zeitmessungen: Verwende die Periodenbegrenzung
      let actualStartTime: Date;
      let actualEndTime: Date;
      let hoursWorked: number;
      
      if (entry.endTime === null) {
        // Aktive Zeitmessung: DIREKTE DIFFERENZ wie im Modal
        // Entferne 'Z' vom startTime-String und berechne Differenz
        const startTimeISO = entry.startTime.toISOString();
        const startISOString = startTimeISO.endsWith('Z') 
          ? startTimeISO.substring(0, startTimeISO.length - 1)
          : startTimeISO;
        const startTimeDate = new Date(startISOString);
        const diffMs = nowUtc.getTime() - startTimeDate.getTime();
        hoursWorked = diffMs / (1000 * 60 * 60);
        
        // Für Verteilung: Verwende entry.startTime und effectiveEndTime (nicht begrenzt)
        actualStartTime = entry.startTime;
        actualEndTime = effectiveEndTime;
      } else {
        // Abgeschlossene Zeitmessung: Verwende Periodenbegrenzung
        actualStartTime = entry.startTime < periodStartUtc ? periodStartUtc : entry.startTime;
        actualEndTime = effectiveEndTime > periodEndUtc ? periodEndUtc : effectiveEndTime;
        
        // Nur berechnen, wenn tatsächlich Zeit im Zeitraum liegt
        if (actualStartTime < actualEndTime) {
          // Berechnung der Arbeitszeit in Millisekunden
          const workTime = actualEndTime.getTime() - actualStartTime.getTime();
          // Umrechnung in Stunden
          hoursWorked = workTime / (1000 * 60 * 60);
        } else {
          hoursWorked = 0;
        }
      }
      
      // Nur berechnen, wenn tatsächlich Zeit im Zeitraum liegt
      if (hoursWorked > 0 && actualStartTime < actualEndTime) {
        
        // Für die Verteilung auf Tage: Verwende lokale Zeit wenn timezone vorhanden
        if (entry.timezone) {
          // Verwende Intl.DateTimeFormat um lokale Zeitkomponenten zu extrahieren
          const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: entry.timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          });
          
          // Extrahiere lokale Datumskomponenten für Start
          const startParts = formatter.formatToParts(actualStartTime);
          const startYear = parseInt(startParts.find(p => p.type === 'year')?.value || '0');
          const startMonth = parseInt(startParts.find(p => p.type === 'month')?.value || '0') - 1;
          const startDay = parseInt(startParts.find(p => p.type === 'day')?.value || '0');
          
          // WICHTIG: Für aktive Zeitmessungen - immer dem Starttag zuordnen
          // Auch wenn die Zeitmessung über Mitternacht hinausgeht, gehört sie zum Starttag
          if (entry.endTime === null) {
            // Aktive Zeitmessung: Alles dem Starttag zuordnen
            const dateString = `${startYear}-${String(startMonth + 1).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;
            const dayEntry = periodData.find(d => d.date === dateString);
            
            if (dayEntry) {
              const oldHours = dayEntry.hours;
              dayEntry.hours += hoursWorked;
              
              if (hoursWorked > 0 && oldHours === 0) {
                daysWorked++;
              }
            } else {
              console.warn(`Datum ${dateString} liegt nicht in der ${isQuinzena ? 'Quinzena' : 'Woche'} von ${periodStartStr} bis ${periodEndStr}!`);
            }
          } else {
            // Abgeschlossene Zeitmessung: Prüfe ob Start und Ende auf dem gleichen lokalen Tag liegen
            const endParts = formatter.formatToParts(actualEndTime);
            const endYear = parseInt(endParts.find(p => p.type === 'year')?.value || '0');
            const endMonth = parseInt(endParts.find(p => p.type === 'month')?.value || '0') - 1;
            const endDay = parseInt(endParts.find(p => p.type === 'day')?.value || '0');
            
            const sameDay = startYear === endYear && startMonth === endMonth && startDay === endDay;
            
            if (sameDay) {
              // Einfach: Alles diesem Tag zuordnen
              const dateString = `${startYear}-${String(startMonth + 1).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;
              const dayEntry = periodData.find(d => d.date === dateString);
              
              if (dayEntry) {
                const oldHours = dayEntry.hours;
                dayEntry.hours += hoursWorked;
                
                if (hoursWorked > 0 && oldHours === 0) {
                  daysWorked++;
                }
              } else {
                console.warn(`Datum ${dateString} liegt nicht in der ${isQuinzena ? 'Quinzena' : 'Woche'} von ${periodStartStr} bis ${periodEndStr}!`);
              }
            } else {
            // Mehrere Tage: Verteile proportional
            // Iteriere über alle betroffenen lokalen Tage
            let currentYear = startYear;
            let currentMonth = startMonth;
            let currentDay = startDay;
            
            while (currentYear < endYear || 
                   (currentYear === endYear && currentMonth < endMonth) ||
                   (currentYear === endYear && currentMonth === endMonth && currentDay <= endDay)) {
              
              // Erstelle UTC-Date-Objekte für Tagesbeginn und -ende (als UTC interpretiert)
              const dayStartUtcTemp = new Date(Date.UTC(currentYear, currentMonth, currentDay, 0, 0, 0, 0));
              const dayEndUtcTemp = new Date(Date.UTC(currentYear, currentMonth, currentDay, 23, 59, 59, 999));
              
              // Konvertiere zu lokaler Zeit, um die korrekten UTC-Zeitpunkte zu erhalten
              const dayStartLocal = toZonedTime(dayStartUtcTemp, entry.timezone);
              const dayEndLocal = toZonedTime(dayEndUtcTemp, entry.timezone);
              
              // Setze die korrekten Stunden/Minuten/Sekunden für Start und Ende
              if (currentYear === startYear && currentMonth === startMonth && currentDay === startDay) {
                // Verwende die lokalen Komponenten vom Start
                const startPartsFull = new Intl.DateTimeFormat('en-US', {
                  timeZone: entry.timezone,
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false
                }).formatToParts(actualStartTime);
                const startHour = parseInt(startPartsFull.find(p => p.type === 'hour')?.value || '0');
                const startMinute = parseInt(startPartsFull.find(p => p.type === 'minute')?.value || '0');
                const startSecond = parseInt(startPartsFull.find(p => p.type === 'second')?.value || '0');
                dayStartLocal.setHours(startHour, startMinute, startSecond, 0);
              } else {
                dayStartLocal.setHours(0, 0, 0, 0);
              }
              
              if (currentYear === endYear && currentMonth === endMonth && currentDay === endDay) {
                // Verwende die lokalen Komponenten vom Ende
                const endPartsFull = new Intl.DateTimeFormat('en-US', {
                  timeZone: entry.timezone,
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false
                }).formatToParts(actualEndTime);
                const endHour = parseInt(endPartsFull.find(p => p.type === 'hour')?.value || '0');
                const endMinute = parseInt(endPartsFull.find(p => p.type === 'minute')?.value || '0');
                const endSecond = parseInt(endPartsFull.find(p => p.type === 'second')?.value || '0');
                dayEndLocal.setHours(endHour, endMinute, endSecond, 999);
              } else {
                dayEndLocal.setHours(23, 59, 59, 999);
              }
              
              // Konvertiere lokale Zeiten zurück zu UTC für Berechnung
              const dayStartUtc = fromZonedTime(dayStartLocal, entry.timezone);
              const dayEndUtc = fromZonedTime(dayEndLocal, entry.timezone);
              
              // Begrenze auf actualStartTime und actualEndTime
              const dayStartActual = dayStartUtc < actualStartTime ? actualStartTime : dayStartUtc;
              const dayEndActual = dayEndUtc > actualEndTime ? actualEndTime : dayEndUtc;
              
              // Berechne Stunden für diesen Tag
              const dayWorkTime = dayEndActual.getTime() - dayStartActual.getTime();
              const dayHours = dayWorkTime / (1000 * 60 * 60);
              
              if (dayHours > 0) {
                const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
                const dayEntry = periodData.find(d => d.date === dateString);
                
                if (dayEntry) {
                  const oldHours = dayEntry.hours;
                  dayEntry.hours += dayHours;
                  
                  if (dayHours > 0 && oldHours === 0) {
                    daysWorked++;
                  }
                } else {
                  console.warn(`Datum ${dateString} liegt nicht in der ${isQuinzena ? 'Quinzena' : 'Woche'} von ${periodStartStr} bis ${periodEndStr}!`);
                }
              }
              
              // Nächster lokaler Tag
              const nextDate = new Date(currentYear, currentMonth, currentDay + 1);
              currentYear = nextDate.getFullYear();
              currentMonth = nextDate.getMonth();
              currentDay = nextDate.getDate();
            }
            }
          }
        } else {
          // Fallback: UTC-Verteilung wenn keine Zeitzone gespeichert
          const startDate = new Date(actualStartTime);
          const endDate = new Date(actualEndTime);
          
          // Iteriere über alle Tage, die von dieser Zeitmessung betroffen sind
          let currentDate = new Date(startDate);
          currentDate.setUTCHours(0, 0, 0, 0);
          
          while (currentDate <= endDate) {
            // Berechne Start- und Endzeit für diesen Tag
            const dayStart = currentDate > startDate ? currentDate : startDate;
            const dayEnd = new Date(currentDate);
            dayEnd.setUTCHours(23, 59, 59, 999);
            const dayEndActual = dayEnd < endDate ? dayEnd : endDate;
            
            // Berechne Stunden für diesen Tag
            const dayWorkTime = dayEndActual.getTime() - dayStart.getTime();
            const dayHours = dayWorkTime / (1000 * 60 * 60);
            
            if (dayHours > 0) {
              // Extrahiere das Datum im UTC-Format
              const year = currentDate.getUTCFullYear();
              const month = String(currentDate.getUTCMonth() + 1).padStart(2, '0');
              const dayOfMonth = String(currentDate.getUTCDate()).padStart(2, '0');
              const dateString = `${year}-${month}-${dayOfMonth}`;
              
              // Finde entsprechenden Tag in periodData
              const dayEntry = periodData.find(d => d.date === dateString);
              
              if (dayEntry) {
                const oldHours = dayEntry.hours;
                dayEntry.hours += dayHours;
                
                // Tage mit Arbeit zählen (nur wenn vorher 0 Stunden waren)
                if (dayHours > 0 && oldHours === 0) {
                  daysWorked++;
                }
              } else {
                console.warn(`Datum ${dateString} liegt nicht in der ${isQuinzena ? 'Quinzena' : 'Woche'} von ${periodStartStr} bis ${periodEndStr}!`);
              }
            }
            
            // Nächster Tag
            currentDate.setUTCDate(currentDate.getUTCDate() + 1);
          }
        }
        
        // Addiere die Gesamtstunden (nur für den Zeitraum)
        totalHours += hoursWorked;
        
        if (entry.endTime === null) {
          console.log(`Aktive Zeitmessung berücksichtigt: ${entry.startTime.toISOString()} - jetzt = ${hoursWorked.toFixed(2)}h (im Zeitraum)`);
        }
      }
    });

    // Runden und Formatieren
    periodData.forEach(day => {
      day.hours = Math.round(day.hours * 10) / 10;
    });
    
    // Für Frontend-Kompatibilität: weeklyData verwenden
    const weeklyData = periodData;

    console.log("Berechnete weeklyData:", weeklyData);

    // Berechne den Durchschnitt der Arbeitsstunden pro Tag
    const averageHoursPerDay = daysWorked > 0 ? Math.round((totalHours / daysWorked) * 10) / 10 : 0;

    // Runde die Gesamtstunden auf eine Dezimalstelle
    totalHours = Math.round(totalHours * 10) / 10;

    console.log(`Gesamtstunden: ${totalHours}, Durchschnitt: ${averageHoursPerDay}, Arbeitstage: ${daysWorked}`);

    // Sende die Statistikdaten an das Frontend
    res.json({
      totalHours,
      averageHoursPerDay,
      daysWorked,
      weeklyData
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Worktime-Statistik:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Hilfsfunktion zur Berechnung des Datums ohne Date-Objekte
// Das verhindert Zeitzonenprobleme vollständig
function calculateDateFromWeekStart(weekStartStr: string, daysToAdd: number): string {
  // Parse year, month, day from weekStartStr (format: "YYYY-MM-DD")
  const parts = weekStartStr.split('-');
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]);
  const day = parseInt(parts[2]);
  
  // Einfache Berechnung des neuen Datums durch Erhöhung des Tages
  // Diese Methode ignoriert Monats- und Jahresübergänge, aber für unseren Anwendungsfall
  // (max. 6 Tage addieren) ist das ausreichend, da wir keinen Monatsübergang haben werden
  let newDay = day + daysToAdd;
  let newMonth = month;
  let newYear = year;
  
  // Rudimentäre Behandlung von Monatsenden
  const daysInMonth = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  
  // Schaltjahr prüfen
  if ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) {
    daysInMonth[2] = 29;
  }
  
  // Wenn der neue Tag über die Tage im Monat hinausgeht
  if (newDay > daysInMonth[newMonth]) {
    newDay = newDay - daysInMonth[newMonth];
    newMonth++;
    
    // Wenn der neue Monat über Dezember hinausgeht
    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    }
  }
  
  // Formatiere das Datum zurück als "YYYY-MM-DD"
  return `${newYear}-${newMonth.toString().padStart(2, '0')}-${newDay.toString().padStart(2, '0')}`;
}

export const exportWorktimes = async (req: Request, res: Response) => {
  try {
    const { week } = req.query;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    // Verwende das empfangene Datum direkt
    // Das Frontend sendet bereits den korrekten Montag der Woche
    let weekDateString = week as string;
    if (!weekDateString) {
      // Nur im Fallback-Fall: Aktuelles Datum verwenden und Montag der Woche berechnen
      const today = new Date();
      const monday = startOfWeek(today, { weekStartsOn: 1 });
      weekDateString = format(monday, 'yyyy-MM-dd');
    }
    
    console.log(`Export - Verwende direkt das Datum: ${weekDateString} als Beginn der Woche`);
    
    // Berechne das Ende der Woche (7 Tage später)
    // Der Datumstring für den Wochenanfang
    const weekStartStr = weekDateString;
    // Konvertiere zum Date-Objekt für die Berechnung des Wochenendes
    const tempDate = new Date(weekDateString);
    tempDate.setDate(tempDate.getDate() + 6); // Ende der Woche ist 6 Tage später (Sonntag)
    const weekEndStr = format(tempDate, 'yyyy-MM-dd');
    
    console.log(`Export - Wochenbereich String: ${weekStartStr} bis ${weekEndStr}`);
    
    // DIE UNIVERSELLE LÖSUNG: Wir arbeiten mit UTC-Zeitgrenzen als Referenzpunkte
    // Für "Montag 00:00" bis "Sonntag 23:59:59" der ausgewählten Woche, WELTWEIT KONSISTENT
    
    // Setze Uhrzeiten auf 00:00:00 und 23:59:59 für Anfang und Ende der Woche
    // Explizit im UTC-Format, damit es überall identisch interpretiert wird
    const weekStartUtc = new Date(`${weekStartStr}T00:00:00.000Z`); // Z = UTC!
    const weekEndUtc = new Date(`${weekEndStr}T23:59:59.999Z`);     // Z = UTC!
    
    console.log(`Universeller UTC-Bereich (weltweit konsistent): ${weekStartUtc.toISOString()} bis ${weekEndUtc.toISOString()}`);
    
    // Direkte Suche nach den Einträgen mit universellen UTC-Grenzen
    const entries = await prisma.workTime.findMany({
      where: {
        userId: Number(userId),
        startTime: {
          gte: weekStartUtc,
          lte: weekEndUtc
        },
        endTime: {
          not: null
        }
      },
      include: {
        user: true,
      },
    });

    console.log(`Gefundene Einträge mit universellen UTC-Grenzen: ${entries.length}`);
    if (entries.length > 0) {
      console.log(`Erster Eintrag - startTime: ${entries[0].startTime.toISOString()}, endTime: ${entries[0].endTime.toISOString()}`);
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Arbeitszeiten');

    // Hole zusätzlich die Branch-Informationen
    const worktimesWithBranch = await prisma.workTime.findMany({
      where: {
        userId: Number(userId),
        startTime: {
          gte: weekStartUtc,
          lte: weekEndUtc
        }
      },
      include: {
        branch: true
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    // Spaltenüberschriften
    worksheet.columns = [
      { header: 'Datum', key: 'date', width: 12 },
      { header: 'Start', key: 'start', width: 10 },
      { header: 'Ende', key: 'end', width: 10 },
      { header: 'Stunden', key: 'hours', width: 10 },
      { header: 'Niederlassung', key: 'branch', width: 15 }
    ];

    // Für jeden Eintrag eine Zeile hinzufügen
    worktimesWithBranch.forEach(worktime => {
      const hours = worktime.endTime
        ? (worktime.endTime.getTime() - worktime.startTime.getTime()) / (1000 * 60 * 60)
        : 0;
      
      // Direktes Formatieren ohne Umrechnung
      const startDate = worktime.startTime;
      const endDate = worktime.endTime;
      
      worksheet.addRow({
        date: `${String(startDate.getUTCDate()).padStart(2, '0')}.${String(startDate.getUTCMonth() + 1).padStart(2, '0')}.${startDate.getUTCFullYear()}`,
        start: `${String(startDate.getUTCHours()).padStart(2, '0')}:${String(startDate.getUTCMinutes()).padStart(2, '0')}`,
        end: endDate ? `${String(endDate.getUTCHours()).padStart(2, '0')}:${String(endDate.getUTCMinutes()).padStart(2, '0')}` : '-',
        hours: Math.round(hours * 100) / 100,
        branch: worktime.branch.name
      });
    });

    // Dateinamen im UTC-Format erzeugen, um konsistent zu sein
    const startStr = `${weekStartUtc.getUTCFullYear()}-${String(weekStartUtc.getUTCMonth() + 1).padStart(2, '0')}-${String(weekStartUtc.getUTCDate()).padStart(2, '0')}`;
    const endStr = `${weekEndUtc.getUTCFullYear()}-${String(weekEndUtc.getUTCMonth() + 1).padStart(2, '0')}-${String(weekEndUtc.getUTCDate()).padStart(2, '0')}`;
    const fileName = `arbeitszeiten_${startStr}_${endStr}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Fehler beim Exportieren der Zeiterfassungen:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

export const getActiveWorktime = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    const activeWorktime = await prisma.workTime.findFirst({
      where: {
        userId: Number(userId),
        endTime: null
      },
      include: {
        branch: true
      }
    });

    if (!activeWorktime) {
      return res.status(200).json({ 
        active: false,
        message: 'Keine aktive Zeiterfassung gefunden' 
      });
    }

    res.json({
      ...activeWorktime,
      active: true,
      // organizationId explizit zurückgeben für Frontend-Vergleich
      organizationId: activeWorktime.organizationId
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der aktiven Zeiterfassung:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Funktion zum Überprüfen und automatischen Stoppen von Zeiterfassungen,
// die die normale Arbeitszeit überschreiten
export const checkAndStopExceededWorktimes = async () => {
  try {
    // Finde alle aktiven Worktime-Einträge
    const activeWorktimes = await prisma.workTime.findMany({
      where: {
        endTime: null
      },
      include: {
        user: true,
        branch: true
      }
    });

    for (const worktime of activeWorktimes) {
      // Aktuelle Zeit
      const now = new Date();
      
      // Erstelle das Datum für den Anfang und das Ende des aktuellen Tages (entsprechend getWorktimeStats)
      const year = now.getFullYear();
      const month = now.getMonth(); // Monate sind 0-basiert in JavaScript
      const day = now.getDate();
      
      // Erstelle lokales Datum für den Anfang des Tages
      const localStartOfDay = new Date(year, month, day, 0, 0, 0);
      const localEndOfDay = new Date(year, month, day, 23, 59, 59, 999);
      
      // Zeitzonenversatz berechnen
      const startOffsetMinutes = localStartOfDay.getTimezoneOffset();
      const endOffsetMinutes = localEndOfDay.getTimezoneOffset();
      
      // Kompensierte Zeiten erstellen für korrekte UTC-Darstellung
      const todayStart = new Date(localStartOfDay.getTime() - startOffsetMinutes * 60000);
      const todayEnd = new Date(localEndOfDay.getTime() - endOffsetMinutes * 60000);
      
      // Protokolliere lokale und UTC-Zeit für Vergleichszwecke
      console.log(`Prüfung auf überschrittene Arbeitszeit für Datum: ${format(now, 'yyyy-MM-dd')}`);
      console.log(`Aktuelle Zeit (UTC): ${now.toISOString()}`);
      console.log(`Aktuelle Zeit (lokal): ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`);
      console.log(`Tagesbeginn (kompensiert): ${todayStart.toISOString()}`);
      console.log(`Tagesende (kompensiert): ${todayEnd.toISOString()}`);

      // Hole alle beendeten Zeiterfassungen für heute
      const todaysWorktimes = await prisma.workTime.findMany({
        where: {
          userId: worktime.userId,
          startTime: {
            gte: todayStart,
            lte: todayEnd
          },
          endTime: {
            not: null
          }
        }
      });

      // Berechne die gesamte Arbeitszeit für heute in Millisekunden
      let totalWorkTimeMs = 0;
      
      // Protokolliere jede einzelne Zeiterfassung für bessere Transparenz
      console.log(`Gefundene abgeschlossene Zeiterfassungen für heute: ${todaysWorktimes.length}`);
      for (const wt of todaysWorktimes) {
        if (wt.endTime) {
          const workTimeMs = wt.endTime.getTime() - wt.startTime.getTime();
          const workTimeHours = workTimeMs / (1000 * 60 * 60);
          console.log(`Zeiterfassung ID ${wt.id}: ${wt.startTime.toISOString()} - ${wt.endTime.toISOString()} = ${workTimeHours.toFixed(2)}h`);
          totalWorkTimeMs += workTimeMs;
        }
      }

      // Füge die aktuelle laufende Sitzung hinzu
      // Konvertiere now nach UTC für konsistenten Vergleich mit worktime.startTime (aus DB)
      // getTimezoneOffset() gibt negative Werte für östliche Zeitzonen zurück, daher subtrahieren
      const nowUTC = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
      const currentSessionMs = nowUTC.getTime() - worktime.startTime.getTime();
      const currentSessionHours = currentSessionMs / (1000 * 60 * 60);
      
      // Formatiere lokale Zeit für bessere Lesbarkeit
      const localNowString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      
      console.log(`Aktuelle laufende Sitzung: ${worktime.startTime.toISOString()} - jetzt (${localNowString}) = ${currentSessionHours.toFixed(2)}h`);
      
      totalWorkTimeMs += currentSessionMs;

      // Konvertiere Millisekunden in Stunden
      const totalWorkTimeHours = totalWorkTimeMs / (1000 * 60 * 60);
      
      // Anzeige der normalen Arbeitszeit des Benutzers und der aktuellen Gesamtarbeitszeit
      console.log(`Normale Arbeitszeit des Benutzers: ${worktime.user.normalWorkingHours}h`);
      console.log(`Gesamtarbeitszeit heute: ${totalWorkTimeHours.toFixed(2)}h`);

      // Wenn die gesamte Arbeitszeit die normale Arbeitszeit überschreitet, stoppe die Zeiterfassung
      if (totalWorkTimeHours >= worktime.user.normalWorkingHours) {
        console.log(`Schwellenwert erreicht oder überschritten. Stoppe Zeiterfassung automatisch.`);
        
        // Zeiterfassung beenden - speichere die LOKALE Zeit, nicht UTC
        // WICHTIG: Wir verwenden hier ein neues Date-Objekt, um sicherzustellen, dass
        // die Zeit korrekt gespeichert wird, ohne Zeitzonenumrechnung
        // Erstelle ein frisches Date-Objekt, genau wie in stopWorktime
        const endTimeNow = new Date();
        // Manuelle Korrektur für UTC-Speicherung - kompensiert den Zeitzonenversatz
        const utcCorrectedTime = new Date(endTimeNow.getTime() - endTimeNow.getTimezoneOffset() * 60000);
        
        const stoppedWorktime = await prisma.workTime.update({
          where: { id: worktime.id },
          data: { 
            endTime: utcCorrectedTime,
            // Wenn bisher keine Zeitzone gespeichert ist, aktualisiere sie (wie in stopWorktime)
            ...(worktime.timezone ? {} : { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })
          }
        });

        console.log(`Zeiterfassung ID ${stoppedWorktime.id} wurde beendet um: ${stoppedWorktime.endTime.toISOString()}`);
        console.log(`Lokale Endzeit: ${stoppedWorktime.endTime.getFullYear()}-${String(stoppedWorktime.endTime.getMonth() + 1).padStart(2, '0')}-${String(stoppedWorktime.endTime.getDate()).padStart(2, '0')} ${String(stoppedWorktime.endTime.getHours()).padStart(2, '0')}:${String(stoppedWorktime.endTime.getMinutes()).padStart(2, '0')}:${String(stoppedWorktime.endTime.getSeconds()).padStart(2, '0')}`);

        // Benachrichtigung erstellen
        const userLang = await getUserLanguage(worktime.userId);
        const notificationText = getWorktimeNotificationText(userLang, 'auto_stop', undefined, worktime.user.normalWorkingHours);
        await createNotificationIfEnabled({
          userId: worktime.userId,
          title: notificationText.title,
          message: notificationText.message,
          type: NotificationType.worktime,
          relatedEntityId: worktime.id,
          relatedEntityType: 'auto_stop'
        });

        console.log(`Zeiterfassung für Benutzer ${worktime.userId} automatisch beendet.`);
      }
    }

    console.log('Prüfung auf überschrittene Arbeitszeiten abgeschlossen.');
  } catch (error) {
    console.error('Fehler bei der Prüfung auf überschrittene Arbeitszeiten:', error);
  }
};

// Hilfsfunktion zur Berechnung des Tagesindex in einer Woche
function calculateDayIndex(weekStartStr: string, dateStr: string): number {
  // Parse Datum-Strings
  const [startYear, startMonth, startDay] = weekStartStr.split('-').map(Number);
  const [dateYear, dateMonth, dateDay] = dateStr.split('-').map(Number);
  
  // Erstelle Date-Objekte (verwende den gleichen Zeitpunkt um Zeitzonenprobleme zu vermeiden)
  const weekStart = new Date(Date.UTC(startYear, startMonth - 1, startDay, 12, 0, 0));
  const dateObj = new Date(Date.UTC(dateYear, dateMonth - 1, dateDay, 12, 0, 0));
  
  // Berechne Differenz in Millisekunden und konvertiere zu Tagen
  const diffTime = dateObj.getTime() - weekStart.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
} 
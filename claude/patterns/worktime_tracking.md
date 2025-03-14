# Arbeitszeiterfassungsmuster

Dieses Dokument beschreibt das Muster für die Implementierung der Arbeitszeiterfassung im Intranet-Projekt, mit besonderem Fokus auf die korrekte Handhabung von Zeitzonen und die Benutzerinteraktion.

## Musterbeschreibung

Das Muster definiert einen konsistenten Ansatz für:
- Start und Stopp von Arbeitszeiterfassungssitzungen
- Korrekte Handhabung von Zeitzonen
- Persistenz von Arbeitszeitdaten
- Benutzerrückmeldung während des Prozesses

## Implementierungsbeispiel

### 1. Datenmodell für Arbeitszeiterfassung

```typescript
// frontend/src/types/worktime.ts

export interface WorktimeSession {
  id: string;
  userId: string;
  startTime: string; // ISO-String (UTC)
  endTime: string | null; // ISO-String (UTC) oder null, wenn aktiv
  startComment: string | null;
  endComment: string | null;
  isActive: boolean;
}

export interface TeamWorktimeData {
  userId: string;
  userName: string;
  totalHours: number;
  sessions: WorktimeSession[];
}
```

### 2. Kontext für die Arbeitszeitverwaltung

```typescript
// frontend/src/contexts/WorktimeContext.tsx

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as worktimeApi from '../api/worktimeApi';
import { useAuth } from '../hooks/useAuth';
import { WorktimeSession } from '../types/worktime';

interface WorktimeContextType {
  currentSession: WorktimeSession | null;
  sessions: WorktimeSession[];
  isTracking: boolean;
  loading: boolean;
  error: string | null;
  startTracking: (comment?: string) => Promise<void>;
  stopTracking: (comment?: string) => Promise<void>;
  fetchSessions: (startDate: Date, endDate: Date) => Promise<void>;
}

const WorktimeContext = createContext<WorktimeContextType | undefined>(undefined);

export const WorktimeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentSession, setCurrentSession] = useState<WorktimeSession | null>(null);
  const [sessions, setSessions] = useState<WorktimeSession[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Beim Laden der Komponente prüfen, ob eine aktive Sitzung existiert
  useEffect(() => {
    if (user) {
      checkActiveSession();
    }
  }, [user]);

  const checkActiveSession = async () => {
    try {
      setLoading(true);
      const activeSession = await worktimeApi.getActiveSession(user!.id);
      
      if (activeSession) {
        setCurrentSession(activeSession);
        setIsTracking(true);
      }
      
      setLoading(false);
    } catch (error) {
      setError("Fehler beim Abrufen der aktiven Sitzung");
      setLoading(false);
    }
  };

  const startTracking = async (comment?: string) => {
    try {
      setLoading(true);
      
      // Wichtig: Wir überlassen die Zeitstempelerstellung dem Server (UTC)
      const session = await worktimeApi.startWorktime(user!.id, comment);
      
      setCurrentSession(session);
      setIsTracking(true);
      setSessions(prev => [session, ...prev]);
      setLoading(false);
    } catch (error) {
      setError("Fehler beim Starten der Arbeitszeiterfassung");
      setLoading(false);
      throw error;
    }
  };

  const stopTracking = async (comment?: string) => {
    if (!currentSession) {
      setError("Keine aktive Arbeitszeiterfassung gefunden");
      return;
    }

    try {
      setLoading(true);
      
      // Wichtig: Wir überlassen die Zeitstempelerstellung dem Server (UTC)
      const updatedSession = await worktimeApi.stopWorktime(currentSession.id, comment);
      
      setCurrentSession(null);
      setIsTracking(false);
      
      // Aktualisiere die Sitzung in der Liste
      setSessions(prev => 
        prev.map(session => 
          session.id === updatedSession.id ? updatedSession : session
        )
      );
      
      setLoading(false);
    } catch (error) {
      setError("Fehler beim Stoppen der Arbeitszeiterfassung");
      setLoading(false);
      throw error;
    }
  };

  const fetchSessions = async (startDate: Date, endDate: Date) => {
    try {
      setLoading(true);
      
      // Datumskonvertierung sicherstellen
      const startDateUTC = new Date(startDate);
      startDateUTC.setHours(0, 0, 0, 0);
      
      const endDateUTC = new Date(endDate);
      endDateUTC.setHours(23, 59, 59, 999);
      
      const fetchedSessions = await worktimeApi.getWorktimeSessions(
        user!.id, 
        startDateUTC.toISOString(), 
        endDateUTC.toISOString()
      );
      
      setSessions(fetchedSessions);
      setLoading(false);
    } catch (error) {
      setError("Fehler beim Abrufen der Arbeitszeiterfassungssitzungen");
      setLoading(false);
      throw error;
    }
  };

  const value = {
    currentSession,
    sessions,
    isTracking,
    loading,
    error,
    startTracking,
    stopTracking,
    fetchSessions
  };

  return (
    <WorktimeContext.Provider value={value}>
      {children}
    </WorktimeContext.Provider>
  );
};

export const useWorktime = (): WorktimeContextType => {
  const context = useContext(WorktimeContext);
  
  if (context === undefined) {
    throw new Error('useWorktime must be used within a WorktimeProvider');
  }
  
  return context;
};
```

### 3. API-Funktionen für die Arbeitszeiterfassung

```typescript
// frontend/src/api/worktimeApi.ts

import apiClient from './apiClient';
import { handleApiError } from './errorHandler';
import { WorktimeSession, TeamWorktimeData } from '../types/worktime';

export const startWorktime = async (userId: string, comment?: string): Promise<WorktimeSession> => {
  try {
    const response = await apiClient.post('/worktime/start', {
      userId,
      comment
      // Kein Zeitstempel - wird vom Server generiert (UTC)
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

export const stopWorktime = async (sessionId: string, comment?: string): Promise<WorktimeSession> => {
  try {
    const response = await apiClient.post(`/worktime/stop/${sessionId}`, {
      comment
      // Kein Zeitstempel - wird vom Server generiert (UTC)
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

export const getActiveSession = async (userId: string): Promise<WorktimeSession | null> => {
  try {
    const response = await apiClient.get(`/worktime/active/${userId}`);
    return response.data;
  } catch (error) {
    // 404 bedeutet keine aktive Sitzung - kein Fehler
    if (error.response && error.response.status === 404) {
      return null;
    }
    handleApiError(error);
    throw error;
  }
};

export const getWorktimeSessions = async (
  userId: string, 
  startDate: string, 
  endDate: string
): Promise<WorktimeSession[]> => {
  try {
    const response = await apiClient.get('/worktime/sessions', {
      params: { userId, startDate, endDate }
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

export const getTeamWorktimes = async (
  teamId: string, 
  startDate: string, 
  endDate: string
): Promise<TeamWorktimeData[]> => {
  try {
    const response = await apiClient.get('/worktime/team', {
      params: { teamId, startDate, endDate }
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};
```

### 4. Komponente für die Arbeitszeiterfassung

```typescript
// frontend/src/pages/Worktracker.tsx

import React, { useState, useEffect } from 'react';
import { useWorktime } from '../contexts/WorktimeContext';
import { useAuth } from '../hooks/useAuth';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'react-toastify';

const Worktracker: React.FC = () => {
  const [comment, setComment] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { user } = useAuth();
  const { 
    currentSession, 
    sessions, 
    isTracking, 
    loading, 
    startTracking, 
    stopTracking, 
    fetchSessions 
  } = useWorktime();

  useEffect(() => {
    if (user) {
      // Datum für den aktuellen Tag (lokale Zeit)
      const today = new Date();
      setSelectedDate(today);
      
      // Hole Sitzungen für heute
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);
      
      fetchSessions(startOfDay, endOfDay);
    }
  }, [user, fetchSessions]);

  const handleStartWorktime = async () => {
    try {
      await startTracking(comment || undefined);
      setComment('');
      toast.success('Arbeitszeiterfassung gestartet');
    } catch (error) {
      // Fehler wird bereits im Kontext behandelt
    }
  };

  const handleStopWorktime = async () => {
    try {
      await stopTracking(comment || undefined);
      setComment('');
      toast.success('Arbeitszeiterfassung gestoppt');
    } catch (error) {
      // Fehler wird bereits im Kontext behandelt
    }
  };

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    fetchSessions(startOfDay, endOfDay);
  };

  // Hilfsfunktion zum Formatieren von UTC-Zeitstempeln in lokale Zeit
  const formatLocalTime = (utcTimeString: string) => {
    const date = new Date(utcTimeString);
    return format(date, 'HH:mm:ss', { locale: de });
  };

  // Berechnen der Dauer für eine Sitzung
  const calculateDuration = (session: WorktimeSession) => {
    const start = new Date(session.startTime);
    const end = session.endTime ? new Date(session.endTime) : new Date();
    
    const durationMs = end.getTime() - start.getTime();
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Arbeitszeiterfassung</h1>
      
      <div className="mb-8 p-4 border rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold mb-2">
          {isTracking ? 'Aktive Zeiterfassung' : 'Neue Zeiterfassung starten'}
        </h2>
        
        <div className="mb-4">
          <textarea
            className="w-full p-2 border rounded"
            rows={2}
            placeholder="Kommentar (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>
        
        {isTracking ? (
          <div>
            <p className="mb-2">
              Gestartet um: {currentSession ? formatLocalTime(currentSession.startTime) : ''}
            </p>
            <button
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
              onClick={handleStopWorktime}
              disabled={loading}
            >
              {loading ? 'Wird gestoppt...' : 'Zeiterfassung stoppen'}
            </button>
          </div>
        ) : (
          <button
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
            onClick={handleStartWorktime}
            disabled={loading}
          >
            {loading ? 'Wird gestartet...' : 'Zeiterfassung starten'}
          </button>
        )}
      </div>
      
      <div>
        <h2 className="text-xl font-semibold mb-2">Heutige Einträge</h2>
        
        <div className="mb-4">
          <input
            type="date"
            className="p-2 border rounded"
            value={format(selectedDate, 'yyyy-MM-dd')}
            onChange={(e) => handleDateChange(new Date(e.target.value))}
          />
        </div>
        
        {loading ? (
          <p>Daten werden geladen...</p>
        ) : sessions.length === 0 ? (
          <p>Keine Einträge für diesen Tag gefunden.</p>
        ) : (
          <div className="space-y-2">
            {sessions.map(session => (
              <div key={session.id} className="p-3 border rounded-lg">
                <p>
                  <span className="font-semibold">Start:</span> {formatLocalTime(session.startTime)}
                  {session.startComment && ` - ${session.startComment}`}
                </p>
                <p>
                  <span className="font-semibold">Ende:</span> {
                    session.endTime 
                      ? `${formatLocalTime(session.endTime)}${session.endComment ? ` - ${session.endComment}` : ''}`
                      : 'Aktiv'
                  }
                </p>
                <p>
                  <span className="font-semibold">Dauer:</span> {calculateDuration(session)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Worktracker;
```

### 5. Backend-Controller für die Arbeitszeiterfassung

```typescript
// backend/src/controllers/worktimeController.ts

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const startWorktime = async (req: Request, res: Response) => {
  try {
    const { userId, comment } = req.body;
    
    // Prüfen, ob bereits eine aktive Sitzung existiert
    const activeSession = await prisma.worktimeSession.findFirst({
      where: {
        userId,
        isActive: true
      }
    });
    
    if (activeSession) {
      return res.status(400).json({ 
        error: {
          message: "Es existiert bereits eine aktive Arbeitszeiterfassung",
          code: "ACTIVE_SESSION_EXISTS"
        }
      });
    }
    
    // Neue Sitzung erstellen mit UTC-Zeitstempel
    const startTime = new Date();
    
    const worktimeSession = await prisma.worktimeSession.create({
      data: {
        userId,
        startTime,
        startComment: comment || null,
        isActive: true
      }
    });
    
    res.status(201).json(worktimeSession);
  } catch (error) {
    console.error("Start worktime error:", error);
    res.status(500).json({ 
      error: {
        message: "Fehler beim Starten der Arbeitszeiterfassung",
        code: "SERVER_ERROR"
      }
    });
  }
};

export const stopWorktime = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { comment } = req.body;
    
    // Sitzung abrufen
    const session = await prisma.worktimeSession.findUnique({
      where: { id: sessionId }
    });
    
    if (!session) {
      return res.status(404).json({ 
        error: {
          message: "Arbeitszeiterfassungssitzung nicht gefunden",
          code: "SESSION_NOT_FOUND"
        }
      });
    }
    
    if (!session.isActive) {
      return res.status(400).json({ 
        error: {
          message: "Die Sitzung ist bereits beendet",
          code: "SESSION_ALREADY_INACTIVE"
        }
      });
    }
    
    // Sitzung mit UTC-Zeitstempel beenden
    const endTime = new Date();
    
    const updatedSession = await prisma.worktimeSession.update({
      where: { id: sessionId },
      data: {
        endTime,
        endComment: comment || null,
        isActive: false
      }
    });
    
    res.status(200).json(updatedSession);
  } catch (error) {
    console.error("Stop worktime error:", error);
    res.status(500).json({ 
      error: {
        message: "Fehler beim Beenden der Arbeitszeiterfassung",
        code: "SERVER_ERROR"
      }
    });
  }
};

export const getActiveSession = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    const activeSession = await prisma.worktimeSession.findFirst({
      where: {
        userId,
        isActive: true
      }
    });
    
    if (!activeSession) {
      return res.status(404).json({ 
        error: {
          message: "Keine aktive Arbeitszeiterfassungssitzung gefunden",
          code: "NO_ACTIVE_SESSION"
        }
      });
    }
    
    res.status(200).json(activeSession);
  } catch (error) {
    console.error("Get active session error:", error);
    res.status(500).json({ 
      error: {
        message: "Fehler beim Abrufen der aktiven Arbeitszeiterfassungssitzung",
        code: "SERVER_ERROR"
      }
    });
  }
};

export const getWorktimeSessions = async (req: Request, res: Response) => {
  try {
    const { userId, startDate, endDate } = req.query;
    
    const sessions = await prisma.worktimeSession.findMany({
      where: {
        userId: userId as string,
        startTime: {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string)
        }
      },
      orderBy: {
        startTime: 'desc'
      }
    });
    
    res.status(200).json(sessions);
  } catch (error) {
    console.error("Get worktime sessions error:", error);
    res.status(500).json({ 
      error: {
        message: "Fehler beim Abrufen der Arbeitszeiterfassungssitzungen",
        code: "SERVER_ERROR"
      }
    });
  }
};
```

## Verwendungsrichtlinien

1. **Serverseitige Zeitstempel**: Alle Zeitstempel sollten vom Server in UTC generiert werden.
2. **Lokale Anzeige**: Die Konvertierung in lokale Zeiten sollte nur für die Anzeige erfolgen.
3. **Zeitdifferenzberechnungen**: Berechnungen sollten immer mit den Rohzeitstempeln durchgeführt werden, nicht mit formatierten Strings.
4. **Fehlerbehandlung**: Alle API-Aufrufe sollten Fehler ordnungsgemäß behandeln.
5. **Benutzerrückmeldung**: Klare Rückmeldungen über den Status der Arbeitszeiterfassung geben.

## Vorteile

- **Zeitzonenkonsistenz**: Verhindert Probleme mit unterschiedlichen Zeitzonen.
- **Klare Verantwortlichkeiten**: Server ist für Zeitstempel verantwortlich, Frontend für die Anzeige.
- **Benutzerfreundlichkeit**: Einfache und intuitive Schnittstelle zur Zeiterfassung.
- **Fehlerbehandlung**: Robuste Behandlung von Edge-Cases wie bereits aktive Sitzungen.

## Bekannte Einschränkungen

- Bei Serverzeitunterschieden könnte es zu kleinen Diskrepanzen kommen.
- Lange Offline-Phasen erfordern spezielle Behandlung (nicht Teil dieses Musters).

## Verbindung zu anderen Mustern

- **API-Fehlerbehandlungsmuster**: Für die konsistente Behandlung von API-Fehlern.
- **Ladezustandsmuster**: Für die Anzeige von Ladezuständen während API-Anfragen.
- **Datumsformatierungsmuster**: Für die konsistente Formatierung von Datums- und Uhrzeitangaben. 
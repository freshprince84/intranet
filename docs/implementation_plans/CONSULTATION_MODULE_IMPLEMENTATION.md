# Implementierungsplan: Consultation-Modul für Intranet

## Übersicht
Dieses Dokument enthält den detaillierten Schritt-für-Schritt Plan zur Implementierung des Consultation-Moduls. Jeder Schritt hat eine Checkbox zum Abhaken nach Fertigstellung.

**WICHTIG**: Nach JEDEM erledigten Schritt:
1. Checkbox abhaken (☑️)
2. Commit erstellen mit aussagekräftiger Message
3. Zum nächsten Schritt gehen

## Phase 1: Datenbank-Schema (Backend)

### Schritt 1.1: Prisma Schema erweitern
- [x] Öffne `backend/prisma/schema.prisma`
- [x] Füge folgende neue Models am Ende der Datei hinzu (vor den Enums):

```prisma
model Client {
  id          Int        @id @default(autoincrement())
  name        String
  company     String?
  email       String?
  phone       String?
  address     String?
  notes       String?    @db.Text
  isActive    Boolean    @default(true)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  workTimes   WorkTime[]
}

model WorkTimeTask {
  id          Int       @id @default(autoincrement())
  workTimeId  Int
  taskId      Int
  createdAt   DateTime  @default(now())
  workTime    WorkTime  @relation(fields: [workTimeId], references: [id])
  task        Task      @relation(fields: [taskId], references: [id])
  
  @@unique([workTimeId, taskId])
}
```

- [x] Erweitere das bestehende `WorkTime` Model (füge diese Zeilen nach `updatedAt` hinzu):
```prisma
  clientId    Int?
  client      Client?   @relation(fields: [clientId], references: [id])
  notes       String?   @db.Text
  taskLinks   WorkTimeTask[]
```

- [x] Erweitere das bestehende `Task` Model (füge diese Zeile nach `attachments` hinzu):
```prisma
  workTimeLinks WorkTimeTask[]
```

### Schritt 1.2: Migration erstellen und ausführen
- [x] Terminal öffnen im `backend` Verzeichnis
- [x] Führe aus: `npx prisma migrate dev --name add_consultation_features`
- [x] Warte bis Migration erfolgreich durchgelaufen ist
- [x] **WICHTIG**: Bitte den Nutzer, den Server neu zu starten

## Phase 2: Backend API - Client Management

### Schritt 2.1: Client Controller erstellen
- [x] Erstelle neue Datei: `backend/src/controllers/clientController.ts`
- [x] Kopiere folgenden Code (basierend auf userController.ts als Vorlage):

```typescript
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Alle Clients abrufen
export const getClients = async (req: Request, res: Response) => {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(clients);
  } catch (error) {
    console.error('Fehler beim Abrufen der Clients:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Einzelnen Client abrufen
export const getClientById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const client = await prisma.client.findUnique({
      where: { id: Number(id) },
      include: {
        workTimes: {
          include: {
            user: true,
            branch: true
          },
          orderBy: { startTime: 'desc' },
          take: 10
        }
      }
    });
    
    if (!client) {
      return res.status(404).json({ message: 'Client nicht gefunden' });
    }
    
    res.json(client);
  } catch (error) {
    console.error('Fehler beim Abrufen des Clients:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Neuen Client erstellen
export const createClient = async (req: Request, res: Response) => {
  try {
    const { name, company, email, phone, address, notes } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Name ist erforderlich' });
    }
    
    const client = await prisma.client.create({
      data: {
        name,
        company,
        email,
        phone,
        address,
        notes
      }
    });
    
    res.status(201).json(client);
  } catch (error) {
    console.error('Fehler beim Erstellen des Clients:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Client aktualisieren
export const updateClient = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, company, email, phone, address, notes, isActive } = req.body;
    
    const client = await prisma.client.update({
      where: { id: Number(id) },
      data: {
        name,
        company,
        email,
        phone,
        address,
        notes,
        isActive
      }
    });
    
    res.json(client);
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Clients:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Client löschen
export const deleteClient = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await prisma.client.delete({
      where: { id: Number(id) }
    });
    
    res.json({ message: 'Client erfolgreich gelöscht' });
  } catch (error) {
    console.error('Fehler beim Löschen des Clients:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Zuletzt beratene Clients abrufen
export const getRecentClients = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }
    
    // Hole die letzten 10 unterschiedlichen Clients, die der User beraten hat
    const recentConsultations = await prisma.workTime.findMany({
      where: {
        userId: Number(userId),
        clientId: { not: null }
      },
      select: {
        clientId: true,
        client: true,
        startTime: true
      },
      orderBy: { startTime: 'desc' },
      distinct: ['clientId'],
      take: 10
    });
    
    const recentClients = recentConsultations
      .filter(c => c.client !== null)
      .map(c => c.client);
    
    res.json(recentClients);
  } catch (error) {
    console.error('Fehler beim Abrufen der zuletzt beratenen Clients:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};
```

### Schritt 2.2: Client Routes erstellen
- [x] Erstelle neue Datei: `backend/src/routes/clients.ts`
- [x] Füge folgenden Code ein:

```typescript
import express from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  getRecentClients
} from '../controllers/clientController';

const router = express.Router();

// Alle Routen erfordern Authentifizierung
router.use(authMiddleware);

// Client-Routen
router.get('/', getClients);
router.get('/recent', getRecentClients);
router.get('/:id', getClientById);
router.post('/', createClient);
router.put('/:id', updateClient);
router.delete('/:id', deleteClient);

export default router;
```

### Schritt 2.3: Routes in server.ts einbinden
- [x] Öffne `backend/src/server.ts`
- [x] Füge nach den anderen imports hinzu:
```typescript
import clientRoutes from './routes/clients';
```
- [x] Füge nach den anderen Route-Definitionen hinzu (z.B. nach `app.use('/api/worktime', worktimeRoutes);`):
```typescript
app.use('/api/clients', clientRoutes);
```

## Phase 3: Backend API - Consultation Management

### Schritt 3.1: Consultation Controller erstellen
- [x] Erstelle neue Datei: `backend/src/controllers/consultationController.ts`
- [x] Füge folgenden Code ein:

```typescript
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Beratung starten (erweiterte Version von worktime/start)
export const startConsultation = async (req: Request, res: Response) => {
  try {
    const { branchId, clientId, startTime, notes } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    if (!clientId) {
      return res.status(400).json({ message: 'Client ist erforderlich' });
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

    const now = startTime ? new Date(startTime) : new Date();
    
    const consultation = await prisma.workTime.create({
      data: {
        startTime: now,
        userId: Number(userId),
        branchId: Number(branchId),
        clientId: Number(clientId),
        notes: notes || null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      include: {
        branch: true,
        client: true
      }
    });

    res.status(201).json(consultation);
  } catch (error) {
    console.error('Fehler beim Starten der Beratung:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Beratung beenden
export const stopConsultation = async (req: Request, res: Response) => {
  try {
    const { endTime, notes } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    // Finde die aktive Beratung für den Benutzer
    const activeConsultation = await prisma.workTime.findFirst({
      where: {
        userId: Number(userId),
        endTime: null,
        clientId: { not: null }
      }
    });

    if (!activeConsultation) {
      return res.status(404).json({ message: 'Keine aktive Beratung gefunden' });
    }

    const now = endTime ? new Date(endTime) : new Date();
    
    const consultation = await prisma.workTime.update({
      where: { id: activeConsultation.id },
      data: { 
        endTime: now,
        notes: notes || activeConsultation.notes
      },
      include: {
        branch: true,
        client: true,
        user: true
      }
    });

    res.json(consultation);
  } catch (error) {
    console.error('Fehler beim Beenden der Beratung:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Alle Beratungen abrufen
export const getConsultations = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { clientId, from, to } = req.query;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    let whereClause: any = {
      userId: Number(userId),
      clientId: { not: null }
    };

    if (clientId) {
      whereClause.clientId = Number(clientId);
    }

    if (from || to) {
      whereClause.startTime = {};
      if (from) whereClause.startTime.gte = new Date(from as string);
      if (to) whereClause.startTime.lte = new Date(to as string);
    }

    const consultations = await prisma.workTime.findMany({
      where: whereClause,
      include: {
        branch: true,
        client: true,
        taskLinks: {
          include: {
            task: true
          }
        }
      },
      orderBy: {
        startTime: 'desc'
      }
    });

    res.json(consultations);
  } catch (error) {
    console.error('Fehler beim Abrufen der Beratungen:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Task mit Beratung verknüpfen
export const linkTaskToConsultation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { taskId } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    // Prüfe ob die Beratung dem User gehört
    const consultation = await prisma.workTime.findFirst({
      where: {
        id: Number(id),
        userId: Number(userId)
      }
    });

    if (!consultation) {
      return res.status(404).json({ message: 'Beratung nicht gefunden' });
    }

    const link = await prisma.workTimeTask.create({
      data: {
        workTimeId: Number(id),
        taskId: Number(taskId)
      },
      include: {
        task: true,
        workTime: {
          include: {
            client: true
          }
        }
      }
    });

    res.status(201).json(link);
  } catch (error) {
    console.error('Fehler beim Verknüpfen von Task mit Beratung:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Neuen Task für Beratung erstellen
export const createTaskForConsultation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, dueDate, branchId, qualityControlId } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    // Prüfe ob die Beratung dem User gehört
    const consultation = await prisma.workTime.findFirst({
      where: {
        id: Number(id),
        userId: Number(userId)
      },
      include: {
        client: true
      }
    });

    if (!consultation) {
      return res.status(404).json({ message: 'Beratung nicht gefunden' });
    }

    // Erstelle Task und verknüpfe ihn direkt
    const result = await prisma.$transaction(async (tx) => {
      // Task erstellen
      const task = await tx.task.create({
        data: {
          title: title || `Notizen zu Beratung mit ${consultation.client?.name || 'Unbekannt'}`,
          description,
          responsibleId: Number(userId),
          qualityControlId: Number(qualityControlId || userId),
          branchId: Number(branchId || consultation.branchId),
          dueDate: dueDate ? new Date(dueDate) : null,
          status: 'open'
        }
      });

      // Verknüpfung erstellen
      const link = await tx.workTimeTask.create({
        data: {
          workTimeId: Number(id),
          taskId: task.id
        }
      });

      return { task, link };
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Fehler beim Erstellen von Task für Beratung:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Notizen einer Beratung aktualisieren
export const updateConsultationNotes = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    const consultation = await prisma.workTime.update({
      where: { 
        id: Number(id),
        userId: Number(userId)
      },
      data: { notes },
      include: {
        client: true,
        branch: true
      }
    });

    res.json(consultation);
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Notizen:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};
```

### Schritt 3.2: Consultation Routes erstellen
- [x] Erstelle neue Datei: `backend/src/routes/consultations.ts`
- [x] Füge folgenden Code ein:

```typescript
import express from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  startConsultation,
  stopConsultation,
  getConsultations,
  linkTaskToConsultation,
  createTaskForConsultation,
  updateConsultationNotes
} from '../controllers/consultationController';

const router = express.Router();

// Alle Routen erfordern Authentifizierung
router.use(authMiddleware);

// Consultation-Routen
router.post('/start', startConsultation);
router.post('/stop', stopConsultation);
router.get('/', getConsultations);
router.post('/:id/link-task', linkTaskToConsultation);
router.post('/:id/create-task', createTaskForConsultation);
router.patch('/:id/notes', updateConsultationNotes);

export default router;
```

### Schritt 3.3: Routes in server.ts einbinden
- [x] Öffne `backend/src/server.ts`
- [x] Füge nach dem client routes import hinzu:
```typescript
import consultationRoutes from './routes/consultations';
```
- [x] Füge nach der client route Definition hinzu:
```typescript
app.use('/api/consultations', consultationRoutes);
```

### Schritt 3.4: API Config im Frontend erweitern
- [x] Öffne `frontend/src/config/api.ts`
- [x] Füge folgende Endpoints hinzu (nach WORKTIME):

```typescript
  CLIENTS: {
    BASE: '/api/clients',
    BY_ID: (id: number) => `/api/clients/${id}`,
    RECENT: '/api/clients/recent'
  },
  CONSULTATIONS: {
    BASE: '/api/consultations',
    START: '/api/consultations/start',
    STOP: '/api/consultations/stop',
    BY_ID: (id: number) => `/api/consultations/${id}`,
    LINK_TASK: (id: number) => `/api/consultations/${id}/link-task`,
    CREATE_TASK: (id: number) => `/api/consultations/${id}/create-task`,
    UPDATE_NOTES: (id: number) => `/api/consultations/${id}/notes`
  },
```

## Phase 4: Frontend - Komponenten

### Schritt 4.1: Client Interface definieren
- [x] Erstelle neue Datei: `frontend/src/types/client.ts`
- [x] Füge folgenden Code ein:

```typescript
export interface Client {
  id: number;
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Consultation {
  id: number;
  startTime: string;
  endTime: string | null;
  branchId: number;
  userId: number;
  clientId: number | null;
  notes: string | null;
  branch: {
    id: number;
    name: string;
  };
  client: Client | null;
  user?: {
    id: number;
    firstName: string;
    lastName: string;
  };
  taskLinks?: {
    id: number;
    task: {
      id: number;
      title: string;
      status: string;
    };
  }[];
}
```

### Schritt 4.2: ConsultationTracker Komponente erstellen
- [x] Erstelle neue Datei: `frontend/src/components/ConsultationTracker.tsx`
- [x] Verwende `WorktimeTracker.tsx` als Vorlage
- [x] Füge folgenden angepassten Code ein:

```typescript
import React, { useState, useEffect } from 'react';
import { PlayIcon, StopIcon, PlusIcon, ClockIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { API_ENDPOINTS } from '../config/api.ts';
import axiosInstance from '../config/axios.ts';
import { formatTime, calculateDuration } from '../utils/dateUtils.ts';
import { useAuth } from '../hooks/useAuth.tsx';
import { toast } from 'react-toastify';
import ClientSelectModal from './ClientSelectModal.tsx';
import CreateClientModal from './CreateClientModal.tsx';
import { Client, Consultation } from '../types/client.ts';

interface Branch {
  id: number;
  name: string;
}

const ConsultationTracker: React.FC = () => {
  const { user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [activeConsultation, setActiveConsultation] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [isClientSelectModalOpen, setIsClientSelectModalOpen] = useState(false);
  const [isCreateClientModalOpen, setIsCreateClientModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [recentClients, setRecentClients] = useState<Client[]>([]);
  const [notes, setNotes] = useState('');

  // Manuelle Erfassung States
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [manualStartTime, setManualStartTime] = useState('');
  const [manualEndTime, setManualEndTime] = useState('');

  useEffect(() => {
    loadBranches();
    checkActiveConsultation();
    loadRecentClients();
  }, []);

  const loadBranches = async () => {
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.BRANCHES.BASE);
      setBranches(response.data);
      if (response.data.length > 0 && !selectedBranchId) {
        setSelectedBranchId(response.data[0].id);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Niederlassungen:', error);
    }
  };

  const checkActiveConsultation = async () => {
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.WORKTIME.ACTIVE);
      if (response.data && response.data.clientId) {
        setActiveConsultation(response.data);
        setNotes(response.data.notes || '');
      }
    } catch (error) {
      console.error('Fehler beim Prüfen aktiver Beratung:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentClients = async () => {
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.CLIENTS.RECENT);
      setRecentClients(response.data || []);
    } catch (error) {
      console.error('Fehler beim Laden der zuletzt beratenen Clients:', error);
    }
  };

  const startConsultation = async (client: Client) => {
    if (!selectedBranchId) {
      toast.error('Bitte wählen Sie eine Niederlassung aus');
      return;
    }

    try {
      const data: any = {
        branchId: selectedBranchId,
        clientId: client.id,
        notes: notes || null
      };

      if (isManualEntry) {
        if (!manualStartTime || !manualEndTime) {
          toast.error('Bitte geben Sie Start- und Endzeit an');
          return;
        }
        data.startTime = new Date(manualStartTime).toISOString();
        
        // Erstelle die Beratung
        await axiosInstance.post(API_ENDPOINTS.CONSULTATIONS.START, data);
        
        // Beende sie sofort mit der Endzeit
        await axiosInstance.post(API_ENDPOINTS.CONSULTATIONS.STOP, {
          endTime: new Date(manualEndTime).toISOString(),
          notes: notes || null
        });
        
        toast.success('Beratung erfolgreich erfasst');
        setIsManualEntry(false);
        setManualStartTime('');
        setManualEndTime('');
        setNotes('');
      } else {
        const response = await axiosInstance.post(API_ENDPOINTS.CONSULTATIONS.START, data);
        setActiveConsultation(response.data);
        toast.success('Beratung gestartet');
      }
      
      setSelectedClient(null);
      loadRecentClients();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Fehler beim Starten der Beratung');
    }
  };

  const stopConsultation = async () => {
    try {
      await axiosInstance.post(API_ENDPOINTS.CONSULTATIONS.STOP, {
        notes: notes || null
      });
      setActiveConsultation(null);
      setNotes('');
      toast.success('Beratung beendet');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Fehler beim Beenden der Beratung');
    }
  };

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    setIsClientSelectModalOpen(false);
    startConsultation(client);
  };

  const handleCreateClient = () => {
    setIsClientSelectModalOpen(false);
    setIsCreateClientModalOpen(true);
  };

  const handleClientCreated = (client: Client) => {
    setIsCreateClientModalOpen(false);
    setSelectedClient(client);
    startConsultation(client);
  };

  const updateNotes = async () => {
    if (!activeConsultation) return;
    
    try {
      await axiosInstance.patch(
        API_ENDPOINTS.CONSULTATIONS.UPDATE_NOTES(activeConsultation.id),
        { notes }
      );
    } catch (error) {
      console.error('Fehler beim Speichern der Notizen:', error);
    }
  };

  // Auto-save Notizen alle 30 Sekunden
  useEffect(() => {
    if (!activeConsultation || !notes) return;
    
    const timeout = setTimeout(() => {
      updateNotes();
    }, 30000);
    
    return () => clearTimeout(timeout);
  }, [notes, activeConsultation]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <UserGroupIcon className="h-8 w-8 mr-2" />
            Beratungs-Tracker
          </h2>
          {activeConsultation && (
            <div className="flex items-center text-green-600 dark:text-green-400">
              <ClockIcon className="h-5 w-5 mr-2 animate-pulse" />
              <span className="font-medium">
                {calculateDuration(activeConsultation.startTime, null)} - {activeConsultation.client?.name}
              </span>
            </div>
          )}
        </div>

        {/* Niederlassungsauswahl */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Niederlassung
          </label>
          <select
            value={selectedBranchId || ''}
            onChange={(e) => setSelectedBranchId(Number(e.target.value))}
            className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            disabled={!!activeConsultation}
          >
            <option value="">Bitte wählen...</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>

        {/* Aktive Beratung oder Start-Buttons */}
        {activeConsultation ? (
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Aktive Beratung mit</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {activeConsultation.client?.name}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Gestartet: {formatTime(activeConsultation.startTime)}
              </p>
            </div>

            {/* Notizen-Bereich */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notizen zur Beratung
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={updateNotes}
                className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                rows={3}
                placeholder="Notizen hier eingeben..."
              />
            </div>

            <button
              onClick={stopConsultation}
              className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <StopIcon className="h-5 w-5 mr-2" />
              Beratung beenden
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Zuletzt beratene Clients als Tags */}
            {recentClients.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Zuletzt beraten:
                </p>
                <div className="flex flex-wrap gap-2">
                  {recentClients.map((client) => (
                    <button
                      key={client.id}
                      onClick={() => startConsultation(client)}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      {client.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Start-Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => setIsClientSelectModalOpen(true)}
                className="flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlayIcon className="h-5 w-5 mr-2" />
                Beratung starten
              </button>

              <button
                onClick={() => setIsCreateClientModalOpen(true)}
                className="flex items-center justify-center px-4 py-3 border border-gray-300 dark:border-gray-600 text-base font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Neuer Client
              </button>

              <button
                onClick={() => setIsManualEntry(!isManualEntry)}
                className={`flex items-center justify-center px-4 py-3 border text-base font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  isManualEntry
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                <ClockIcon className="h-5 w-5 mr-2" />
                Manuell erfassen
              </button>
            </div>

            {/* Manuelle Erfassung */}
            {isManualEntry && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Start
                    </label>
                    <input
                      type="datetime-local"
                      value={manualStartTime}
                      onChange={(e) => setManualStartTime(e.target.value)}
                      className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Ende
                    </label>
                    <input
                      type="datetime-local"
                      value={manualEndTime}
                      onChange={(e) => setManualEndTime(e.target.value)}
                      className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Notizen
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    rows={2}
                    placeholder="Optionale Notizen..."
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <ClientSelectModal
        isOpen={isClientSelectModalOpen}
        onClose={() => setIsClientSelectModalOpen(false)}
        onSelect={handleClientSelect}
        onCreateNew={handleCreateClient}
      />

      <CreateClientModal
        isOpen={isCreateClientModalOpen}
        onClose={() => setIsCreateClientModalOpen(false)}
        onSave={handleClientCreated}
      />
    </>
  );
};

export default ConsultationTracker;
```

### Schritt 4.3: ClientSelectModal Komponente erstellen
- [x] Erstelle neue Datei: `frontend/src/components/ClientSelectModal.tsx`
- [x] Füge folgenden Code ein:

```typescript
import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { MagnifyingGlassIcon, XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';
import { API_ENDPOINTS } from '../config/api.ts';
import axiosInstance from '../config/axios.ts';
import { Client } from '../types/client.ts';

interface ClientSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (client: Client) => void;
  onCreateNew: () => void;
}

const ClientSelectModal: React.FC<ClientSelectModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  onCreateNew
}) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadClients();
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = clients.filter(client => 
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.company && client.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredClients(filtered);
    } else {
      setFilteredClients(clients);
    }
  }, [searchTerm, clients]);

  const loadClients = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(API_ENDPOINTS.CLIENTS.BASE);
      setClients(response.data);
      setFilteredClients(response.data);
    } catch (error) {
      console.error('Fehler beim Laden der Clients:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-2xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white">
                Client auswählen
              </Dialog.Title>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Suchfeld */}
            <div className="relative mb-4">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Client suchen..."
                autoFocus
              />
            </div>

            {/* Client-Liste */}
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  Lade Clients...
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    {searchTerm ? 'Keine Clients gefunden' : 'Noch keine Clients vorhanden'}
                  </p>
                  <button
                    onClick={onCreateNew}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Neuen Client anlegen
                  </button>
                </div>
              ) : (
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredClients.map((client) => (
                    <li key={client.id}>
                      <button
                        onClick={() => onSelect(client)}
                        className="w-full px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-left transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {client.name}
                            </p>
                            {client.company && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {client.company}
                              </p>
                            )}
                          </div>
                          {client.email && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {client.email}
                            </p>
                          )}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer mit "Neuer Client" Button */}
            {filteredClients.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={onCreateNew}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Neuen Client anlegen
                </button>
              </div>
            )}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default ClientSelectModal;
```

### Schritt 4.4: CreateClientModal Komponente erstellen
- [x] Erstelle neue Datei: `frontend/src/components/CreateClientModal.tsx`
- [x] Füge folgenden Code ein:

```typescript
import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { API_ENDPOINTS } from '../config/api.ts';
import axiosInstance from '../config/axios.ts';
import { Client } from '../types/client.ts';
import { toast } from 'react-toastify';

interface CreateClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (client: Client) => void;
}

const CreateClientModal: React.FC<CreateClientModalProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    address: '',
    notes: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name ist erforderlich';
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Ungültige E-Mail-Adresse';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      const response = await axiosInstance.post(API_ENDPOINTS.CLIENTS.BASE, {
        ...formData,
        company: formData.company || null,
        email: formData.email || null,
        phone: formData.phone || null,
        address: formData.address || null,
        notes: formData.notes || null
      });
      
      toast.success('Client erfolgreich angelegt');
      onSave(response.data);
      
      // Form zurücksetzen
      setFormData({
        name: '',
        company: '',
        email: '',
        phone: '',
        address: '',
        notes: ''
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Fehler beim Anlegen des Clients');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Fehler für dieses Feld löschen
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-lg w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl">
          <form onSubmit={handleSubmit} className="p-6">
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white">
                Neuen Client anlegen
              </Dialog.Title>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white ${
                    errors.name 
                      ? 'border-red-300 dark:border-red-600' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                )}
              </div>

              {/* Firma */}
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Firma
                </label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* E-Mail */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  E-Mail
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white ${
                    errors.email 
                      ? 'border-red-300 dark:border-red-600' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
                )}
              </div>

              {/* Telefon */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Telefon
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Adresse */}
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Adresse
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Notizen */}
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Notizen
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  value={formData.notes}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="mt-6 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Speichere...' : 'Speichern'}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default CreateClientModal;
```

### Schritt 4.5: ConsultationList Komponente erstellen
- [x] Erstelle neue Datei: `frontend/src/components/ConsultationList.tsx`
- [x] Verwende `WorktimeList.tsx` als Vorlage
- [x] Code wird in Teil 2 des Plans bereitgestellt

## Phase 5: Frontend - Hauptseite

### Schritt 5.1: Consultations Seite erstellen
- [x] Erstelle neue Datei: `frontend/src/pages/Consultations.tsx`
- [x] Code wird in Teil 2 des Plans bereitgestellt

### Schritt 5.2: Navigation erweitern
- [x] Öffne `frontend/src/App.tsx`
- [x] Importiere die neue Seite nach den anderen Imports:
```typescript
import Consultations from './pages/Consultations.tsx';
```
- [x] Füge die Route hinzu (nach der Worktracker-Route):
```typescript
<Route path="/consultations" element={<ProtectedRoute><Consultations /></ProtectedRoute>} />
```

### Schritt 5.3: Menü erweitern
- [x] Finde die Datei, die das Hauptmenü definiert (vermutlich in `App.tsx` oder einer separaten Navigation-Komponente)
- [x] Füge neuen Menüpunkt hinzu:
```typescript
{
  name: 'Beratungen',
  path: '/consultations',
  icon: ClipboardDocumentListIcon,
  permission: 'consultations_view'
}
```

## Phase 6: Berechtigungen

### Schritt 6.1: Neue Berechtigungen in Seed-Datei hinzufügen
- [x] Öffne `backend/prisma/seed.ts` oder die entsprechende Datei
- [x] Füge neue Berechtigungen für die Admin-Rolle hinzu:
```typescript
// Consultations Berechtigungen
{ entity: 'consultations', accessLevel: 'both', entityType: 'page' },
{ entity: 'clients', accessLevel: 'both', entityType: 'table' },
```

### Schritt 6.2: Datenbank-Seed ausführen
- [x] Terminal im backend-Verzeichnis öffnen
- [x] Ausführen: `npx prisma db seed`

## Phase 7: Testing & Dokumentation

### Schritt 7.1: Modul-Dokumentation erstellen
- [x] Erstelle neue Datei: `docs/modules/MODUL_CONSULTATIONS.md`
- [x] Dokumentiere das neue Modul (Vorlage: MODUL_WORKTRACKER.md)

### Schritt 7.2: API-Dokumentation aktualisieren
- [x] Öffne `docs/technical/API_REFERENZ.md`
- [x] Füge neue Endpoints hinzu

### Schritt 7.3: Datenbankschema-Dokumentation aktualisieren
- [x] Öffne `docs/technical/DATENBANKSCHEMA.md`
- [x] Füge neue Tabellen hinzu

## Abschluss-Checkliste

- [x] Alle Dateien gespeichert
- [x] Server neu gestartet (vom Nutzer durchführen lassen)
- [x] Frontend neu geladen
- [x] Grundfunktionalität getestet:
  - [x] Client anlegen
  - [x] Beratung starten
  - [x] Beratung beenden
  - [x] Beratungsliste anzeigen
- [x] Dokumentation aktualisiert

## Hinweise für die Implementierung

1. **IMMER** nach jedem Schritt testen
2. **NIE** den Server selbst neustarten - immer den Nutzer fragen
3. Bei Fehlern: Genau prüfen, ob alle Imports korrekt sind
4. TypeScript-Fehler sofort beheben
5. Console.logs nach dem Testen entfernen

## Teil 2 des Plans (weitere Komponenten)

Dieser Plan wird fortgesetzt mit:
- ConsultationList Komponente (vollständiger Code)
- Consultations Hauptseite (vollständiger Code)
- Erweiterte Features (Task-Verknüpfung, Filter) 
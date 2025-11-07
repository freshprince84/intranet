# Performance-Optimierung: Attachment-Laden für Requests und Tasks

## Übersicht

Dieser Plan beschreibt die Optimierung des Attachment-Ladens für Requests (Dashboard) und Tasks (Worktracker), um das N+1 Query Problem zu lösen und die Ladezeiten drastisch zu reduzieren.

## Problem-Analyse

### Aktuelles Verhalten
- **Requests**: 1 Request für alle Requests + N Requests für Attachments (jeder Request einzeln)
- **Tasks**: 1 Request für alle Tasks + N Requests für Attachments (jeder Task einzeln)
- **Performance-Impact**: Bei 50 Requests = 51 HTTP-Requests, bei 100 Tasks = 101 HTTP-Requests

### Root Cause
- Backend lädt Attachments nicht mit (`getAllRequests`, `getAllTasks`)
- Frontend macht separate Requests für jeden Request/Task
- Keine Datenbankoptimierung durch Prisma `include`

## Lösung: Backend-Optimierung mit Frontend-Anpassung

### Strategie
1. **Backend**: Attachments direkt mit Requests/Tasks laden via Prisma `include`
2. **Backend**: Attachments im Response-Format mappen
3. **Frontend**: Separate Attachment-Requests entfernen
4. **Frontend**: Attachments aus Response verwenden

### Erwartete Verbesserung
- **HTTP-Requests**: Von N+1 auf 1 reduziert (80-95% weniger Requests)
- **Ladezeit**: 80-95% schneller (von ~5-10 Sekunden auf ~0.5-1 Sekunde)
- **Datenbankabfragen**: 1 optimierte Query statt N+1 Queries

## Implementierungsplan

### Phase 1: Backend - Request Controller

#### 1.1 `getAllRequests` erweitern

**Datei**: `backend/src/controllers/requestController.ts`

**Änderungen**:
1. `attachments` zu Prisma `include` hinzufügen
2. Attachments im `formattedRequests` mappen
3. Format: `{ id, fileName, fileType, fileSize, filePath, uploadedAt }`

**Code-Änderung**:
```typescript
// Zeile 59-75: Prisma Query erweitern
const requests = await prisma.request.findMany({
    where: isolationFilter,
    include: {
        requester: {
            select: userSelect
        },
        responsible: {
            select: userSelect
        },
        branch: {
            select: branchSelect
        },
        attachments: {
            orderBy: {
                uploadedAt: 'desc'
            }
        }
    },
    orderBy: {
        createdAt: 'desc'
    }
});

// Zeile 78-90: formattedRequests erweitern
const formattedRequests = requests.map(request => ({
    id: request.id,
    title: request.title,
    description: request.description,
    status: request.status,
    dueDate: request.dueDate,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    requestedBy: request.requester,
    responsible: request.responsible,
    branch: request.branch,
    createTodo: request.createTodo,
    attachments: request.attachments.map(att => ({
        id: att.id,
        fileName: att.fileName,
        fileType: att.fileType,
        fileSize: att.fileSize,
        filePath: att.filePath,
        uploadedAt: att.uploadedAt
    }))
}));
```

**Wichtig**:
- Attachments werden nach `uploadedAt` sortiert (neueste zuerst)
- Alle Attachment-Felder werden mitgeliefert
- Format ist identisch mit dem aktuellen Attachment-Endpoint

#### 1.2 `getRequestById` erweitern (optional, für Konsistenz)

**Datei**: `backend/src/controllers/requestController.ts`

**Änderungen**:
- `attachments` zu Prisma `include` hinzufügen
- Attachments im `formattedRequest` mappen

**Code-Änderung**:
```typescript
// Zeile 107-123: Prisma Query erweitern
const request = await prisma.request.findFirst({
    where: {
        id: parseInt(id),
        ...isolationFilter
    },
    include: {
        requester: {
            select: userSelect
        },
        responsible: {
            select: userSelect
        },
        branch: {
            select: branchSelect
        },
        attachments: {
            orderBy: {
                uploadedAt: 'desc'
            }
        }
    }
});

// Zeile 130-142: formattedRequest erweitern
const formattedRequest = {
    id: request.id,
    title: request.title,
    description: request.description,
    status: request.status,
    dueDate: request.dueDate,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    requestedBy: request.requester,
    responsible: request.responsible,
    branch: request.branch,
    createTodo: request.createTodo,
    attachments: request.attachments.map(att => ({
        id: att.id,
        fileName: att.fileName,
        fileType: att.fileType,
        fileSize: att.fileSize,
        filePath: att.filePath,
        uploadedAt: att.uploadedAt
    }))
};
```

### Phase 2: Backend - Task Controller

#### 2.1 `getAllTasks` erweitern

**Datei**: `backend/src/controllers/taskController.ts`

**Änderungen**:
1. `attachments` zu Prisma `include` hinzufügen
2. Attachments direkt im Response zurückgeben (kein Mapping nötig, da Tasks direkt zurückgegeben werden)

**Code-Änderung**:
```typescript
// Zeile 39-55: Prisma Query erweitern
const tasks = await prisma.task.findMany({
    where: isolationFilter,
    include: {
        responsible: {
            select: userSelect
        },
        role: {
            select: roleSelect
        },
        qualityControl: {
            select: userSelect
        },
        branch: {
            select: branchSelect
        },
        attachments: {
            orderBy: {
                uploadedAt: 'desc'
            }
        }
    }
});
```

**Wichtig**:
- Tasks werden direkt zurückgegeben (kein Mapping wie bei Requests)
- Prisma liefert `attachments` automatisch im korrekten Format
- Attachments werden nach `uploadedAt` sortiert

#### 2.2 `getTaskById` erweitern (optional, für Konsistenz)

**Datei**: `backend/src/controllers/taskController.ts`

**Änderungen**:
- `attachments` zu Prisma `include` hinzufügen

**Code-Änderung**:
```typescript
// Zeile 77-96: Prisma Query erweitern
const task = await prisma.task.findFirst({
    where: {
        id: taskId,
        ...isolationFilter
    },
    include: {
        responsible: {
            select: userSelect
        },
        role: {
            select: roleSelect
        },
        qualityControl: {
            select: userSelect
        },
        branch: {
            select: branchSelect
        },
        attachments: {
            orderBy: {
                uploadedAt: 'desc'
            }
        }
    }
});
```

### Phase 3: Frontend - Requests Component

#### 3.1 `fetchRequests` vereinfachen

**Datei**: `frontend/src/components/Requests.tsx`

**Änderungen**:
1. Separate Attachment-Requests entfernen
2. Attachments direkt aus Response verwenden
3. URL-Generierung für Attachments beibehalten

**Code-Änderung**:
```typescript
// Zeile 241-288: fetchRequests vereinfachen
const fetchRequests = async () => {
  try {
    setLoading(true);
    const response = await axiosInstance.get('/requests');
    const requestsData = response.data;
    
    // Attachments sind bereits in der Response enthalten
    // URL-Generierung für Attachments hinzufügen
    const requestsWithAttachments = requestsData.map((request: Request) => {
      const attachments = (request.attachments || []).map((att: any) => ({
        id: att.id,
        fileName: att.fileName,
        fileType: att.fileType,
        fileSize: att.fileSize,
        filePath: att.filePath,
        uploadedAt: att.uploadedAt,
        url: getRequestAttachmentUrl(request.id, att.id)
      }));
      
      return {
        ...request,
        attachments: attachments
      };
    });
    
    setRequests(requestsWithAttachments);
    setError(null);
  } catch (err) {
    console.error('Request Error:', err);
    const axiosError = err as any;
    if (axiosError.code === 'ERR_NETWORK') {
      setError('Verbindung zum Server konnte nicht hergestellt werden. Bitte stellen Sie sicher, dass der Server läuft.');
    } else {
      setError(`Fehler beim Laden der Requests: ${axiosError.response?.data?.message || axiosError.message}`);
    }
  } finally {
    setLoading(false);
  }
};
```

**Wichtig**:
- `Promise.all` und separate Requests werden entfernt
- URL-Generierung bleibt erhalten (für MarkdownPreview)
- Fallback auf leeres Array wenn `attachments` fehlt (Rückwärtskompatibilität)
- Alle Attachment-Felder werden übernommen

### Phase 4: Frontend - Worktracker Component

#### 4.1 `loadTasks` vereinfachen

**Datei**: `frontend/src/pages/Worktracker.tsx`

**Änderungen**:
1. Separate Attachment-Requests entfernen
2. Attachments direkt aus Response verwenden
3. URL-Generierung für Attachments beibehalten

**Code-Änderung**:
```typescript
// Zeile 243-285: loadTasks vereinfachen
const loadTasks = async () => {
    try {
        setLoading(true);
        const response = await axiosInstance.get(API_ENDPOINTS.TASKS.BASE);
        const tasksData = response.data;
        
        // Attachments sind bereits in der Response enthalten
        // URL-Generierung für Attachments hinzufügen
        const tasksWithAttachments = tasksData.map((task: Task) => {
            const attachments = (task.attachments || []).map((att: any) => ({
                id: att.id,
                fileName: att.fileName,
                fileType: att.fileType,
                fileSize: att.fileSize,
                filePath: att.filePath,
                uploadedAt: att.uploadedAt,
                url: getTaskAttachmentUrl(task.id, att.id)
            }));
            
            return {
                ...task,
                attachments: attachments
            };
        });
        
        console.log('📋 Tasks geladen:', tasksWithAttachments.length, 'Tasks');
        setTasks(tasksWithAttachments);
        setError(null);
    } catch (error) {
        console.error('Fehler beim Laden der Tasks:', error);
        setError(t('worktime.messages.tasksLoadError'));
    } finally {
        setLoading(false);
    }
};
```

**Wichtig**:
- `Promise.all` und separate Requests werden entfernt
- URL-Generierung bleibt erhalten (für MarkdownPreview)
- Fallback auf leeres Array wenn `attachments` fehlt (Rückwärtskompatibilität)
- Alle Attachment-Felder werden übernommen

## Rückwärtskompatibilität

### Sicherheitsmaßnahmen

1. **Frontend Fallback**:
   - Prüfung auf `attachments` im Response
   - Fallback auf leeres Array wenn nicht vorhanden
   - URL-Generierung funktioniert weiterhin

2. **Backend Kompatibilität**:
   - Separate Attachment-Endpoints bleiben erhalten
   - Edit-Modals können weiterhin separate Requests machen (falls nötig)
   - Keine Breaking Changes für andere Komponenten

3. **Datenformat**:
   - Attachment-Format bleibt identisch
   - Alle Felder werden mitgeliefert
   - URL-Generierung funktioniert weiterhin

## Testing-Strategie

### 1. Unit Tests (Backend)
- [ ] `getAllRequests` liefert Attachments
- [ ] `getAllTasks` liefert Attachments
- [ ] Attachment-Format ist korrekt
- [ ] Sortierung nach `uploadedAt` funktioniert

### 2. Integration Tests (Frontend)
- [ ] Requests werden mit Attachments geladen
- [ ] Tasks werden mit Attachments geladen
- [ ] URL-Generierung funktioniert
- [ ] MarkdownPreview zeigt Attachments korrekt an

### 3. Performance Tests
- [ ] Ladezeit vorher/nachher messen
- [ ] Anzahl HTTP-Requests prüfen
- [ ] Netzwerk-Tab im Browser prüfen

### 4. Manuelle Tests
- [ ] Dashboard: Requests mit Attachments anzeigen
- [ ] Worktracker: Tasks mit Attachments anzeigen
- [ ] Edit-Modals: Attachments funktionieren weiterhin
- [ ] MarkdownPreview: Attachments werden korrekt angezeigt
- [ ] Edge Cases: Requests/Tasks ohne Attachments

## Edge Cases

### 1. Requests/Tasks ohne Attachments
- **Lösung**: Backend liefert leeres Array `[]`
- **Frontend**: Fallback auf leeres Array wenn `attachments` fehlt

### 2. Fehler beim Laden
- **Lösung**: Try-Catch bleibt erhalten
- **Fallback**: Leeres Array für Attachments bei Fehler

### 3. Alte Clients (falls vorhanden)
- **Lösung**: Frontend prüft auf `attachments` im Response
- **Fallback**: Separate Requests wenn `attachments` fehlt (nicht nötig, da Backend immer liefert)

### 4. Edit-Modals
- **Status**: Edit-Modals laden Attachments separat (bleibt unverändert)
- **Grund**: Modals werden nur bei Bedarf geöffnet, Performance-Impact minimal

## Rollback-Plan

Falls Probleme auftreten:

1. **Backend**: `attachments` aus `include` entfernen
2. **Frontend**: Separate Attachment-Requests wieder aktivieren
3. **Keine Datenbankänderungen**: Rollback ist vollständig möglich

## Implementierungsreihenfolge

1. ✅ **Phase 1**: Backend Request Controller
2. ✅ **Phase 2**: Backend Task Controller
3. ✅ **Phase 3**: Frontend Requests Component
4. ✅ **Phase 4**: Frontend Worktracker Component

**Wichtig**: Nach Backend-Änderungen Server-Neustart erforderlich (User muss machen!)

## Erfolgsmessung

### Metriken
- **HTTP-Requests**: Von N+1 auf 1 reduziert
- **Ladezeit**: 80-95% schneller
- **Datenbankabfragen**: 1 optimierte Query statt N+1

### Messung
- Browser DevTools: Network-Tab
- Console-Logs: Anzahl geladener Requests/Tasks
- Performance-Timing: Vorher/Nachher vergleichen

## Risiken und Mitigation

### Risiko 1: Breaking Changes
- **Wahrscheinlichkeit**: Niedrig
- **Mitigation**: Rückwärtskompatibilität durch Fallbacks
- **Rollback**: Möglich durch Code-Revert

### Risiko 2: Performance-Impact bei vielen Attachments
- **Wahrscheinlichkeit**: Niedrig
- **Mitigation**: Prisma optimiert automatisch, `orderBy` ist effizient
- **Monitoring**: Performance nach Deployment prüfen

### Risiko 3: Edit-Modals funktionieren nicht mehr
- **Wahrscheinlichkeit**: Sehr niedrig
- **Mitigation**: Edit-Modals laden separat (unverändert)
- **Testing**: Manuelle Tests durchführen

## Dokumentation

### Nach Implementierung
- [ ] Code-Kommentare aktualisieren
- [ ] API-Dokumentation aktualisieren (falls nötig)
- [ ] Changelog aktualisieren

## Zusammenfassung

Diese Optimierung reduziert die Anzahl der HTTP-Requests drastisch und verbessert die Ladezeiten erheblich, ohne die Funktionalität zu beeinträchtigen. Die Implementierung ist rückwärtskompatibel und kann bei Bedarf einfach zurückgerollt werden.


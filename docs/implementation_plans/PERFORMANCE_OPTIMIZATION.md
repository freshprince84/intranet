# Performance-Optimierung: Reduzierung unnötiger Reloads

## Analyse-Zusammenfassung

Bei der Analyse wurden mehrere Stellen identifiziert, an denen komplette Datenlisten neu geladen werden, obwohl nur einzelne Einträge geändert wurden. Dies führt zu:
- Unnötigen API-Aufrufen
- Verschwendeter Bandbreite
- Schlechterer Benutzererfahrung durch Ladezeiten
- Unnötigen Re-Renders

## Gefundene Problemstellen

### 1. Worktracker.tsx - Tasks-Liste
**Probleme:**
- `loadTasks()` wird vollständig neu geladen bei:
  - Status-Änderung (`handleStatusChange`, Zeile 249)
  - Task kopieren (`handleCopyTask`, Zeile 722)
  - Task löschen (`handleDeleteTask`, Zeile 742)
  - Task speichern (`handleSaveTask`, Zeile 754)
  - Task erstellt (via `onTaskCreated`, Zeile 1318)
  - Task aktualisiert (via `onTaskUpdated`, Zeile 1328)

**Aktuelle Implementierung:**
```typescript
const loadTasks = async () => {
    try {
        setLoading(true);
        const response = await axiosInstance.get(API_ENDPOINTS.TASKS.BASE);
        setTasks(response.data);
        setError(null);
    } catch (error) {
        console.error('Fehler beim Laden der Tasks:', error);
        setError('Fehler beim Laden der Tasks');
    } finally {
        setLoading(false);
    }
};
```

### 2. Requests.tsx - Requests-Liste
**Probleme:**
- `fetchRequests()` wird vollständig neu geladen bei:
  - Status-Änderung (`handleStatusChange`, Zeile 254)
  - Request kopieren (`handleCopyRequest`, Zeile 473)
  - Request erstellt (via `onRequestCreated`, Zeile 498)
  - Request aktualisiert (via `onRequestUpdated`, Zeile 507)

**Aktuelle Implementierung:**
```typescript
const fetchRequests = async () => {
    try {
        setLoading(true);
        const response = await axiosInstance.get('/requests');
        setRequests(response.data);
        setError(null);
    } catch (err) {
        // Fehlerbehandlung
    } finally {
        setLoading(false);
    }
};
```

### 3. EditTaskModal.tsx & EditRequestModal.tsx
**Probleme:**
- Rufen `onTaskUpdated()` / `onRequestUpdated()` ohne Parameter auf
- Parent-Komponente muss dann komplette Liste neu laden
- Backend liefert bereits die aktualisierten Daten

### 4. CreateTaskModal.tsx & CreateRequestModal.tsx
**Probleme:**
- Rufen `onTaskCreated()` / `onRequestCreated()` ohne Parameter auf
- Parent-Komponente muss dann komplette Liste neu laden
- Backend liefert bereits den neuen Datensatz

### 5. Layout.tsx & Routing
**Probleme:**
- Jede Page-Komponente lädt beim Mount alle Daten neu
- Layout nutzt `<Outlet />`, sollte nicht komplett neu rendern
- Kein Caching zwischen Seitenwechseln

## Lösungsstrategien

### Strategie 1: Optimistisches Update (Optimistic Updates)
Statt komplette Liste neu zu laden, wird der lokale State direkt aktualisiert.

**Vorteile:**
- Sofortiges Feedback für den Benutzer
- Weniger API-Aufrufe
- Bessere Performance

**Nachteile:**
- Mögliche Inkonsistenzen bei Fehlern (kann durch Rollback behoben werden)

### Strategie 2: Callback-Parameter
Callbacks erhalten die geänderten Daten als Parameter, statt dass der Parent alles neu lädt.

**Vorteile:**
- Präzise Updates
- Weniger API-Aufrufe
- Einfache Implementierung

**Nachteile:**
- Keine, ist die beste Lösung für Create/Update-Operationen

### Strategie 3: Selektive Updates
Nur geänderte Einträge im State aktualisieren, nicht die gesamte Liste neu laden.

**Vorteile:**
- Minimaler Overhead
- Behält Sortierung/Filterung bei
- Schnell

### Strategie 4: React Query / SWR (Optional, später)
Für komplexeres Caching und Background-Refetching.

**Vorteile:**
- Automatisches Caching
- Background-Updates
- Optimistische Updates built-in

**Nachteile:**
- Zusätzliche Dependency
- Größere Refaktorierung nötig

## Umsetzungsplan

### Phase 1: Worktracker.tsx optimieren

#### 1.1 Status-Änderung optimieren
**Datei:** `frontend/src/pages/Worktracker.tsx`

**Änderung:**
```typescript
const handleStatusChange = async (taskId: number, newStatus: Task['status']) => {
    try {
        // Optimistisches Update
        setTasks(prevTasks => 
            prevTasks.map(task => 
                task.id === taskId ? { ...task, status: newStatus } : task
            )
        );

        await axiosInstance.patch(API_ENDPOINTS.TASKS.BY_ID(taskId), { status: newStatus });
        toast.success('Status erfolgreich aktualisiert');
    } catch (error) {
        console.error('Fehler beim Aktualisieren des Status:', error);
        // Rollback bei Fehler
        loadTasks();
        toast.error('Fehler beim Aktualisieren des Status');
    }
};
```

#### 1.2 Task-Erstellung optimieren
**Dateien:**
- `frontend/src/components/CreateTaskModal.tsx`
- `frontend/src/pages/Worktracker.tsx`

**Änderung CreateTaskModal:**
```typescript
// Statt:
onTaskCreated();

// Verwende:
onTaskCreated(response.data);
```

**Änderung Worktracker:**
```typescript
// Statt:
onTaskCreated={loadTasks}

// Verwende:
onTaskCreated={(newTask) => {
    setTasks(prevTasks => [newTask, ...prevTasks]);
    setIsEditModalOpen(true);
    setSelectedTask(newTask);
}}
```

#### 1.3 Task-Update optimieren
**Dateien:**
- `frontend/src/components/EditTaskModal.tsx`
- `frontend/src/pages/Worktracker.tsx`

**Änderung EditTaskModal:**
```typescript
// Statt:
onTaskUpdated();

// Verwende:
onTaskUpdated(response.data);
```

**Änderung Worktracker:**
```typescript
// Statt:
onTaskUpdated={loadTasks}

// Verwende:
onTaskUpdated={(updatedTask) => {
    setTasks(prevTasks => 
        prevTasks.map(task => 
            task.id === updatedTask.id ? updatedTask : task
        )
    );
    setIsEditModalOpen(false);
    setSelectedTask(null);
    toast.success('Aufgabe erfolgreich aktualisiert');
}}
```

#### 1.4 Task-Löschung optimieren
**Datei:** `frontend/src/pages/Worktracker.tsx`

**Änderung:**
```typescript
const handleDeleteTask = async (taskId: number) => {
    if (window.confirm('Sind Sie sicher, dass Sie diese Aufgabe löschen möchten?')) {
        // Optimistisches Update
        setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));

        try {
            await axiosInstance.delete(API_ENDPOINTS.TASKS.BY_ID(taskId));
            toast.success('Aufgabe erfolgreich gelöscht');
        } catch (error) {
            // Rollback bei Fehler
            loadTasks();
            console.error('Fehler beim Löschen der Aufgabe:', error);
            toast.error('Fehler beim Löschen der Aufgabe');
        }
    }
};
```

#### 1.5 Task-Kopieren optimieren
**Datei:** `frontend/src/pages/Worktracker.tsx`

**Änderung:**
```typescript
const handleCopyTask = async (task: Task) => {
    try {
        const copiedTaskData = {
            title: `${task.title}-Kopie`,
            description: task.description,
            status: 'open',
            responsibleId: task.responsible ? task.responsible.id : null,
            roleId: task.role ? task.role.id : null,
            qualityControlId: task.qualityControl?.id || null,
            branchId: task.branch.id,
            dueDate: task.dueDate
        };

        const response = await axiosInstance.post(
            API_ENDPOINTS.TASKS.BASE,
            copiedTaskData
        );

        // Optimistisches Update statt vollständigem Reload
        setTasks(prevTasks => [response.data, ...prevTasks]);
        
        // Bearbeitungsmodal für den kopierten Task öffnen
        setSelectedTask(response.data);
        setIsEditModalOpen(true);
    } catch (err) {
        console.error('Fehler beim Kopieren des Tasks:', err);
        const axiosError = err as any;
        setError(axiosError.response?.data?.message || axiosError.message || 'Ein unerwarteter Fehler ist aufgetreten');
    }
};
```

### Phase 2: Requests.tsx optimieren

#### 2.1 Status-Änderung optimieren
**Datei:** `frontend/src/components/Requests.tsx`

**Änderung:**
```typescript
const handleStatusChange = async (requestId: number, newStatus: Request['status']) => {
    try {
        const currentRequest = requests.find(r => r.id === requestId);
        if (!currentRequest) {
            setError('Request nicht gefunden');
            return;
        }

        // Optimistisches Update
        setRequests(prevRequests => 
            prevRequests.map(request => 
                request.id === requestId ? { ...request, status: newStatus } : request
            )
        );

        await axiosInstance.put(`/requests/${requestId}`, { 
            status: newStatus,
            create_todo: currentRequest.createTodo
        });
    } catch (err) {
        // Rollback bei Fehler
        fetchRequests();
        console.error('Status Update Error:', err);
        const axiosError = err as any;
        setError(`Fehler beim Aktualisieren des Status: ${axiosError.response?.data?.message || axiosError.message || 'Ein unerwarteter Fehler ist aufgetreten'}`);
    }
};
```

#### 2.2 Request-Erstellung optimieren
**Dateien:**
- `frontend/src/components/CreateRequestModal.tsx`
- `frontend/src/components/Requests.tsx`

**Änderung CreateRequestModal:**
```typescript
// Statt:
onRequestCreated();

// Verwende:
onRequestCreated(response.data);
```

**Änderung Requests:**
```typescript
// Statt:
onRequestCreated={fetchRequests}

// Verwende:
onRequestCreated={(newRequest) => {
    setRequests(prevRequests => [newRequest, ...prevRequests]);
    setIsEditModalOpen(true);
    setSelectedRequest(newRequest);
}}
```

#### 2.3 Request-Update optimieren
**Dateien:**
- `frontend/src/components/EditRequestModal.tsx`
- `frontend/src/components/Requests.tsx`

**Änderung EditRequestModal:**
```typescript
// Statt:
if (onRequestUpdated) {
    onRequestUpdated();
}

// Verwende:
if (onRequestUpdated) {
    // Backend liefert aktualisierten Request
    const updatedResponse = await axiosInstance.get(API_ENDPOINTS.REQUESTS.BY_ID(request.id));
    onRequestUpdated(updatedResponse.data);
}
```

**Änderung Requests:**
```typescript
// Statt:
onRequestUpdated={fetchRequests}

// Verwende:
onRequestUpdated={(updatedRequest) => {
    setRequests(prevRequests => 
        prevRequests.map(request => 
            request.id === updatedRequest.id ? updatedRequest : request
        )
    );
    setIsEditModalOpen(false);
    setSelectedRequest(null);
}}
```

#### 2.4 Request-Kopieren optimieren
**Datei:** `frontend/src/components/Requests.tsx`

**Änderung:**
```typescript
const handleCopyRequest = async (request) => {
    try {
        if (!user) {
            setError('Benutzer nicht authentifiziert');
            return;
        }
        
        const copiedRequestData = {
            title: `${request.title}-Kopie`,
            responsible_id: request.responsible.id,
            branch_id: request.branch.id,
            due_date: request.dueDate ? request.dueDate.split('T')[0] : '',
            create_todo: request.createTodo,
            requested_by_id: user.id
        };

        const response = await axiosInstance.post(
            API_ENDPOINTS.REQUESTS.BASE,
            copiedRequestData
        );

        // Optimistisches Update statt vollständigem Reload
        setRequests(prevRequests => [response.data, ...prevRequests]);
        
        // Bearbeitungsmodal für den kopierten Request öffnen
        setSelectedRequest(response.data);
        setIsEditModalOpen(true);
    } catch (err) {
        console.error('Fehler beim Kopieren des Requests:', err);
        const axiosError = err as any;
        setError(axiosError.response?.data?.message || axiosError.message || 'Ein unerwarteter Fehler ist aufgetreten');
    }
};
```

### Phase 3: Weitere Optimierungen

#### 3.1 ConsultationList.tsx
**Datei:** `frontend/src/components/ConsultationList.tsx`

**Problem:** 
- `loadConsultations()` wird bei Consultation-Änderungen vollständig neu geladen

**Lösung:**
- Analog zu Worktracker/Requests implementieren
- Optimistisches Update bei Start/Stop von Consultations
- Callback-Parameter für Create/Update-Operationen

#### 3.2 UserManagementTab.tsx
**Datei:** `frontend/src/components/UserManagementTab.tsx`

**Problem:**
- Vermutlich ähnliche Probleme bei User-Create/Update/Delete

**Lösung:**
- Prüfen und analog optimieren

#### 3.3 Routing & Seitenwechsel
**Problem:**
- Jede Seite lädt beim Mount alle Daten neu
- Kein Caching zwischen Seitenwechseln

**Lösung (optional, später):**
- React Query oder SWR einführen
- Oder: Prüfen ob Daten bereits im Context vorhanden

## Implementierungsreihenfolge

1. **Worktracker.tsx** (höchste Priorität - häufig genutzt)
   - Status-Änderung
   - Task-Erstellung
   - Task-Update
   - Task-Löschung
   - Task-Kopieren

2. **Requests.tsx** (hohe Priorität - häufig genutzt)
   - Status-Änderung
   - Request-Erstellung
   - Request-Update
   - Request-Kopieren

3. **ConsultationList.tsx** (mittlere Priorität)
   - Consultation-Operationen

4. **Weitere Komponenten** (niedrigere Priorität)
   - UserManagementTab
   - Andere Listen-Komponenten

## Risiken & Mitigation

### Risiko 1: Inkonsistente Daten
**Mitigation:**
- Bei Fehlern Rollback zum vollständigen Reload
- API-Antworten validieren
- Error-Handling verbessern

### Risiko 2: Komplexere State-Verwaltung
**Mitigation:**
- Gut dokumentierte Helper-Funktionen
- Tests für State-Updates

### Risiko 3: Abhängigkeiten zwischen Komponenten
**Mitigation:**
- Callback-Interfaces klar definieren
- TypeScript-Typen für alle Callbacks

## Erfolgskriterien

- [ ] Keine vollständigen Reloads bei Status-Änderungen
- [ ] Keine vollständigen Reloads bei Create/Update-Operationen
- [ ] Sofortiges UI-Feedback bei allen Aktionen
- [ ] Reduzierte API-Aufrufe um ~60-80%
- [ ] Keine Funktionalitätsänderungen
- [ ] Bessere Benutzererfahrung durch schnellere Reaktionen

## Test-Plan

1. **Unit-Tests:**
   - State-Update-Funktionen testen
   - Callback-Parameter validieren

2. **Integration-Tests:**
   - Create/Update/Delete-Flows testen
   - Fehlerbehandlung testen

3. **Manuelle Tests:**
   - Alle Aktionen in Worktracker testen
   - Alle Aktionen in Requests testen
   - Browser DevTools für API-Calls prüfen

## Wichtige Hinweise

- **Keine Funktionalitätsänderungen:** Alle Änderungen sind rein Performance-Optimierungen
- **Backward Compatible:** Bestehende Funktionalität bleibt erhalten
- **Fehlerbehandlung:** Bei Fehlern wird auf vollständiges Reload zurückgegriffen
- **TypeScript:** Alle neuen Callback-Signaturen müssen typisiert sein

## Nächste Schritte

1. Implementierung Phase 1 (Worktracker.tsx)
2. Testen der Änderungen
3. Implementierung Phase 2 (Requests.tsx)
4. Testen der Änderungen
5. Weitere Optimierungen nach Bedarf


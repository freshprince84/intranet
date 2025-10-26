# Implementierungsplan: Client-Edit und Lösch-Funktionalität

## Übersicht
Implementierung der Funktionalität zum Bearbeiten und Löschen von Clients im Frontend. Die Backend-APIs existieren bereits, es fehlt nur die UI.

## Aktueller Stand

### ✅ Bereits vorhanden:
1. **Backend APIs** (`backend/src/controllers/clientController.ts`):
   - `updateClient()` - Client aktualisieren
   - `deleteClient()` - Client löschen

2. **Frontend API** (`frontend/src/api/clientApi.ts`):
   - `updateClient(clientId, data)` - Frontend-API-Funktion
   - `deleteClient(clientId)` - Frontend-API-Funktion

3. **Interface** (`frontend/src/types/client.ts`):
   - `Client` Interface vollständig definiert
   - `UpdateClientData` Interface definiert

### ❌ Fehlt noch:
1. **EditClientModal** Komponente
2. **UI für Edit/Delete** in ClientSelectModal
3. **Berechtigungen** für Client-Management

## Implementierungsoptionen

### Option 1: Edit/Delete im ClientSelectModal (Empfohlen)
**Vorteile:**
- Schnelle Integration in bestehende UI
- Minimal invasiv
- Gut für schnelle Bearbeitungen

**Vorgehen:**
- Edit/Delete-Buttons zu jedem Client-Eintrag im ClientSelectModal hinzufügen
- Event-Propagation stoppen bei Button-Klicks
- EditClientModal öffnen oder Bestätigungsdialog für Delete

### Option 2: Separate Client-Management-Seite
**Vorteile:**
- Übersichtliche Verwaltung aller Clients
- Professionelleres UI
- Mehr Raum für Details

**Vorgehen:**
- Neue Seite im Consultations-Modul oder Settings
- Vollständiges CRUD-Interface
- Erweiterte Funktionen möglich

## Empfohlene Lösung: Hybrid-Ansatz

Kombination aus beiden Optionen:
1. **EditClientModal** als wiederverwendbare Komponente erstellen
2. **Edit/Delete-Buttons** im ClientSelectModal hinzufügen
3. Optional: Separate Client-Management-Seite für erweiterte Verwaltung

## Implementierungsdetails

### Phase 1: EditClientModal Komponente erstellen

**Datei:** `frontend/src/components/EditClientModal.tsx`

**Funktionalität:**
- Modal zum Bearbeiten eines bestehenden Clients
- Formular ähnlich wie CreateClientModal
- Alle Felder editierbar
- Validierung
- API-Call zu `updateClient()`

**Props:**
```typescript
interface EditClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (client: Client) => void;
  client: Client;
}
```

**Implementierung:**
- Verwende `CreateClientModal.tsx` als Vorlage
- State mit vorausgefüllten Client-Daten
- Submit-Call zu `updateClient(clientId, data)` statt `createClient(data)`
- Erfolgs-Toast + Refresh der Liste

### Phase 2: Delete-Funktionalität

**Optionen:**
1. **Bestätigungsdialog** vor Löschen
2. **Entfernen aus Liste** nach erfolgreicher Löschung
3. **Toast-Benachrichtigung**

**Implementierung:**
```typescript
const handleDelete = async (client: Client) => {
  if (!confirm(`Möchten Sie den Client "${client.name}" wirklich löschen?`)) {
    return;
  }

  try {
    await deleteClient(client.id);
    toast.success('Client gelöscht');
    // Entferne aus lokaler Liste
    setClients(prev => prev.filter(c => c.id !== client.id));
    // Oder: Neu laden
    await loadClients();
  } catch (error) {
    toast.error('Fehler beim Löschen des Clients');
  }
};
```

### Phase 3: ClientSelectModal erweitern

**Änderungen:**
1. **Edit/Delete Icons** zu jedem Client-Eintrag hinzufügen
2. **Event-Propagation stoppen** bei Button-Klicks
3. **EditClientModal** State hinzufügen
4. **handleEdit** und **handleDelete** Funktionen

**Layout:**
```typescript
<li key={client.id} className="group relative">
  <div className="flex items-center">
    {/* Client-Daten (bestehender Button) */}
    <button onClick={() => onSelect(client)} className="flex-1 ...">
      {/* Client-Info */}
    </button>
    
    {/* Action Buttons (nur bei Hover sichtbar) */}
    <div className="flex items-center space-x-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <button onClick={(e) => {
        e.stopPropagation();
        setIsEditingClient(client);
        setIsEditModalOpen(true);
      }} title="Bearbeiten">
        <PencilIcon className="h-4 w-4" />
      </button>
      <button onClick={(e) => {
        e.stopPropagation();
        handleDelete(client);
      }} title="Löschen">
        <TrashIcon className="h-4 w-4" />
      </button>
    </div>
  </div>
</li>
```

### Phase 4: Backend - Verwandte Daten prüfen

**Backend erweitern:**
Vor dem Löschen prüfen, ob der Client verknüpfte Beratungen/Rechnungen hat.

```typescript
export const deleteClient = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Prüfe Verknüpfungen
    const consultationsCount = await prisma.workTime.count({
      where: { clientId: Number(id) }
    });
    
    if (consultationsCount > 0) {
      return res.status(400).json({ 
        message: `Client kann nicht gelöscht werden. Es existieren ${consultationsCount} verknüpfte Beratungen.`
      });
    }
    
    await prisma.client.delete({
      where: { id: Number(id) }
    });
    
    res.json({ message: 'Client erfolgreich gelöscht' });
  } catch (error) {
    console.error('Fehler beim Löschen des Clients:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};
```

### Phase 5: Berechtigungen

**Neue Berechtigungen hinzufügen:**
- `clients_edit` - Clients bearbeiten
- `clients_delete` - Clients löschen

**Seed-Integration:**
```typescript
// In backend/prisma/seed.ts - Admin-Rolle erhält beide Rechte
await prisma.permission.create({
  data: {
    roleId: adminRole.id,
    entity: 'clients',
    accessLevel: 'write',
    entityType: 'button'
  }
});
```

### Phase 6: Optional - Separate Client-Management-Seite

**Datei:** `frontend/src/components/ClientManagementTab.tsx`

**Features:**
- Vollständige Tabelle aller Clients
- Suche und Filter
- Bulk-Aktionen
- Import/Export (optional)

**Integration:**
- Als neuer Tab in Settings
- Oder als eigener Menüpunkt

## Implementierungsschritte (Detailliert)

### Schritt 1: EditClientModal erstellen
- [ ] Erstelle `frontend/src/components/EditClientModal.tsx`
- [ ] Kopiere Formular-Logik von CreateClientModal
- [ ] Passe auf Edit-Modus an
- [ ] Verwende `updateClient()` API-Funktion
- [ ] Teste Funktionalität

### Schritt 2: ClientSelectModal erweitern
- [ ] Importiere PencilIcon und TrashIcon
- [ ] Füge `isEditModalOpen` State hinzu
- [ ] Füge `editingClient` State hinzu
- [ ] Füge Edit-Button zu jedem Client hinzu
- [ ] Füge Delete-Button zu jedem Client hinzu
- [ ] Implementiere `handleEdit`
- ]
]: Implementiere `handleDelete` mit Bestätigung
- ] Füge EditClientModal am Ende hinzu
- ] Teste Funktionalität

### Schritt 3: Backend erweitern
- [ ] Erweitere `deleteClient` um Verknüpfungsprüfung
- ] Füge detaillierte Fehlermeldungen hinzu
- ] Teste Löschung mit verknüpften Beratungen
- ] Dokumentiere Verhalten

### Schritt 4: Berechtigungen hinzufügen
- ] Füge Berechtigungen in seed.ts hinzu
- ] Mappe Berechtigungen in RoleManagementTab
- ] Implementiere Berechtigungsprüfungen in der UI
- ] Teste mit unterschiedlichen Rollen

### Schritt 5: Testing
- ] Teste Edit-Funktionalität
- ] Teste Delete-Funktionalität
- ] Teste mit verknüpften Beratungen
- ] Teste Berechtigungen
- ] Teste auf Mobile

## Komponenten-Struktur

```
frontend/src/components/
├── EditClientModal.tsx           [NEU]
├── ClientSelectModal.tsx         [ERWEITERT]
└── CreateClientModal.tsx         [BESTEHEND]
```

## API-Integration

### EditClientModal
```typescript
import { updateClient } from '../api/clientApi';

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    const updated = await updateClient(client.id, formData);
    toast.success('Client erfolgreich aktualisiert');
    onUpdated(updated);
    onClose();
  } catch (error) {
    toast.error('Fehler beim Aktualisieren');
  }
};
```

### ClientSelectModal
```typescript
import { deleteClient } from '../api/clientApi';
import EditClientModal from './EditClientModal';

const handleDelete = async (client: Client) => {
  if (!window.confirm(`Möchten Sie "${client.name}" löschen?`)) return;
  
  try {
    await deleteClient(client.id);
    toast.success('Client gelöscht');
    loadClients();
  } catch (error) {
    toast.error('Fehler beim Löschen');
  }
};
```

## UI/UX Überlegungen

### Edit/Delete Buttons
- **Platzierung:** Rechts neben jedem Client-Eintrag
- **Sichtbarkeit:** Nur bei Hover (opacity-0 → opacity-100)
- **Icons:** PencilIcon (Edit), TrashIcon (Delete)
- **Colors:** Blue (Edit), Red (Delete)

### Bestätigungsdialog
- **Native confirm()** für Delete
- **Alternative:** Custom Modal mit besserem Design

### Toasts
- Erfolgs-Meldungen grün
- Fehler-Meldungen rot
- Auto-Dismiss nach 3 Sekunden

## Fehlerbehandlung

### Client kann nicht gelöscht werden
**Szenario:** Client hat verknüpfte Beratungen

**Frontend-Reaktion:**
- Error-Toast mit detaillierter Meldung
- Anzeige der Anzahl verknüpfter Beratungen
- Option: Client deaktivieren statt löschen

**Backend-Reaktion:**
- HTTP 400 mit Fehlermeldung
- Detaillierte Information über Verknüpfungen

### Validierungsfehler
**Szenario:** Ungültige Daten beim Update

**Reaktion:**
- Feld-spezifische Fehler anzeigen
- Formular nicht schließen
- Fehlerliste unterhalb des Formulars

## Berechtigungssystem

### Berechtigungen definieren
```typescript
// clients_edit | button
// clients_delete | button
```

### Access Control
```typescript
const canEdit = hasPermission('clients_edit', 'write');
const canDelete = hasPermission('clients_delete', 'write');

// Buttons nur anzeigen wenn Berechtigung vorhanden
{canEdit && <EditButton />}
{canDelete && <DeleteButton />}
```

## Testing-Checkliste

- [ ] Client bearbeiten funktioniert
- [ ] Änderungen werden gespeichert
- [ ] Client löschen funktioniert
- [ ] Verknüpfte Beratungen verhindern Löschung
- [ ] Bestätigungsdialog erscheint
- [ ] Toasts werden angezeigt
- [ ] Berechtigungen werden korrekt geprüft
- [ ] UI ist responsive
- [ ] Dark Mode funktioniert

## Migration & Deployment

### Backend-Änderungen
- Keine Datenbank-Migration nötig
- Berechtigungen via Seed hinzufügen

### Frontend-Änderungen
- Neue Komponente: EditClientModal.tsx
- Erweiterte Komponente: ClientSelectModal.tsx
- Keine Breaking Changes

### Rollout
1. Code review
2. Lokale Tests
3. Commit & Push
4. Server-Neustart (für Permissions-Seed)
5. Frontend-Build

## Dokumentation

### Benutzerhandbuch
- Client bearbeiten: Bearbeiten-Button neben Client
- Client löschen: Löschen-Button neben Client
- Einschränkungen: Client mit Beratungen kann nicht gelöscht werden

### Entwicklerhandbuch
- API-Endpunkte dokumentieren
- Komponenten-Props dokumentieren
- Berechtigungssystem erklären

## Zukünftige Erweiterungen

### Möglichkeit 1: Bulk-Operationen
- Mehrere Clients gleichzeitig löschen
- Batch-Update von Clients

### Möglichkeit 2: Client-Merging
- Zwei Clients zusammenführen
- Verknüpfungen umleiten

### Möglichkeit 3: Import/Export
- CSV-Import von Clients
- Export der Client-Liste

### Möglichkeit 4: Client-Archivierung
- Client deaktivieren statt löschen
- Archivierte Clients separat anzeigen

## Zusammenfassung

**Aufwand:** ~4 Stunden
1. EditClientModal erstellen: 1.5h
2. ClientSelectModal erweitern: 1h
3. Backend erweitern: 0.5h
4. Berechtigungen: 0.5h
5. Testing: 0.5h

**Priorität:** Hoch (Kritische Funktionalität)

**Risiko:** Niedrig (Keine Breaking Changes)


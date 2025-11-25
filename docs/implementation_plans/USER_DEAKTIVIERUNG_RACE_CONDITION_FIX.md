# Fix-Plan: Race Condition bei User-Deaktivierung

## Problem
Beim schnellen Deaktivieren mehrerer User hintereinander werden nur die letzten Änderungen gespeichert. Nach Neuladen ist nur der zuletzt deaktivierte User wirklich inaktiv.

## Ursache
Race Condition im Frontend-State-Management in `UserManagementTab.tsx`:

1. **Asynchrones State-Update**: `setAllUsers` in Zeile 534 ist asynchron, aber in Zeile 541 wird der alte `allUsers`-Wert verwendet
2. **Konkurrierende API-Calls**: `fetchAllUsers()` in Zeile 546 lädt die gesamte Liste neu und überschreibt optimistische Updates
3. **Fehlende Synchronisation**: Bei mehreren schnellen Updates überschreiben sich die `fetchAllUsers()`-Aufrufe gegenseitig

## Lösung

### Schritt 1: State-Update korrigieren
**Datei**: `frontend/src/components/UserManagementTab.tsx`

**Problem in Zeile 541**:
```typescript
filterUsersByActiveStatus(userFilterTab, allUsers.map(user => 
  user.id === updatedData.id ? updatedData : user
));
```
Verwendet den alten `allUsers`-Wert, weil `setAllUsers` asynchron ist.

**Fix**: Den aktualisierten Array direkt berechnen und verwenden:
```typescript
// Berechne den aktualisierten Array direkt
const updatedAllUsers = allUsers.map(user => 
  user.id === updatedData.id ? updatedData : user
);

// Update State
setAllUsers(updatedAllUsers);

// Filtere mit dem aktualisierten Array
filterUsersByActiveStatus(userFilterTab, updatedAllUsers);
```

### Schritt 2: Race Condition bei fetchAllUsers() vermeiden
**Problem in Zeile 546**:
```typescript
await fetchAllUsers();
```
Lädt die gesamte Liste neu und kann optimistische Updates überschreiben.

**Option A (Empfohlen)**: `fetchAllUsers()` entfernen, da das optimistische Update ausreicht
- Backend speichert korrekt
- Optimistisches Update ist bereits vorhanden
- Nur bei Fehler neu laden

**Option B**: `fetchAllUsers()` mit Lock/Queue versehen
- Komplexer, aber sicherer bei Netzwerkfehlern
- Verhindert konkurrierende Calls

**Empfehlung**: Option A, da Backend korrekt speichert und optimistisches Update vorhanden ist.

### Schritt 3: Fehlerbehandlung verbessern
**In Zeile 559**: Bei Fehler `fetchAllUsers()` aufrufen ist korrekt, sollte aber bleiben.

## Implementierungsplan

### Änderungen in `frontend/src/components/UserManagementTab.tsx`

**Zeile 533-546 ersetzen durch**:

```typescript
// Berechne den aktualisierten Array direkt (vor State-Update)
const updatedAllUsers = allUsers.map(user => 
  user.id === updatedData.id ? updatedData : user
);

// Update State mit dem berechneten Array
setAllUsers(updatedAllUsers);

// Filtere mit dem aktualisierten Array (nicht mit allUsers!)
filterUsersByActiveStatus(userFilterTab, updatedAllUsers);

// fetchAllUsers() entfernen - optimistisches Update reicht aus
// Backend speichert korrekt, State ist bereits aktualisiert
// Nur bei Fehler wird fetchAllUsers() aufgerufen (Zeile 559)
```

## Test-Szenario

1. **Test 1: Einzelne Deaktivierung**
   - User A deaktivieren
   - Prüfen: User A ist inaktiv
   - Seite neu laden
   - Prüfen: User A bleibt inaktiv

2. **Test 2: Mehrere schnelle Deaktivierungen**
   - User A deaktivieren
   - Sofort User B deaktivieren (ohne Neuladen)
   - Sofort User C deaktivieren (ohne Neuladen)
   - Prüfen: Alle drei User sind inaktiv
   - Seite neu laden
   - Prüfen: Alle drei User bleiben inaktiv

3. **Test 3: Aktivierung nach Deaktivierung**
   - User A deaktivieren
   - User A wieder aktivieren
   - Prüfen: User A ist aktiv
   - Seite neu laden
   - Prüfen: User A bleibt aktiv

## Risiken

- **Niedrig**: Optimistisches Update ohne `fetchAllUsers()` könnte bei Netzwerkfehlern zu Inkonsistenzen führen
  - **Mitigation**: Bei Fehler wird `fetchAllUsers()` aufgerufen (bereits vorhanden in Zeile 559)
  - **Mitigation**: Backend speichert korrekt, daher ist State-Update ausreichend

## Abhängigkeiten

- Keine neuen Abhängigkeiten erforderlich
- Keine Backend-Änderungen erforderlich
- Nur Frontend-State-Management-Fix

## Status

- [ ] Implementierung
- [ ] Testing
- [ ] Code-Review


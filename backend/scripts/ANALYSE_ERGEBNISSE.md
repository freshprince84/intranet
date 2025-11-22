# ANALYSE-ERGEBNISSE: Reservation Import Problem

## 1. Rik Pols vs Hendrik Gebhardt
- **Rik Pols (exakt)**: 0 Reservierungen - **EXISTIERT NICHT**
- **Hendrik Gebhardt (exakt)**: 1 Reservierung (ID 66, LobbyID 5102405602, Branch 4)
- **Fazit**: 2 verschiedene Gäste. Rik Pols ist nicht in der DB.

## 2. Reservation IDs aus Screenshots
- **18139169**: NICHT VORHANDEN
- **18135093**: NICHT VORHANDEN  
- **18137083**: NICHT VORHANDEN
- **Fazit**: Neue Reservierungen werden NICHT importiert

## 3. KRITISCHER FEHLER: Import schlägt fehl

### Fehlermeldung:
```
Invalid `prisma.reservation.upsert()` invocation
Argument `organization` is missing.
organizationId: undefined
```

### Ursache:
- `LobbyPmsService.createForBranch(branchId)` erstellt Service mit `organizationId = undefined`
- In `syncReservation()` wird `organizationId: this.organizationId!` verwendet
- `this.organizationId` ist `undefined` → Prisma-Fehler

### Code-Stelle:
```typescript
// lobbyPmsService.ts Zeile 171-174
static async createForBranch(branchId: number): Promise<LobbyPmsService> {
  const service = new LobbyPmsService(undefined, branchId); // ❌ organizationId = undefined
  await service.loadSettings();
  return service;
}

// lobbyPmsService.ts Zeile 494
organizationId: this.organizationId!, // ❌ undefined!
```

## 4. Manila syncEnabled
- **Status**: `syncEnabled: undefined` (sollte `true` sein)
- **Problem**: Muss auf `true` gesetzt werden

## 5. Scheduler
- **Status**: Läuft (wird in app.ts gestartet)
- **Intervall**: Alle 10 Minuten
- **Problem**: Alle Syncs schlagen fehl wegen `organizationId: undefined`

## 6. Neueste Reservierungen
- **Letzte Importe**: 20.11.2025, 19:36 Uhr
- **Seitdem**: Keine neuen Reservierungen (Import schlägt fehl)

## LÖSUNG

### Problem 1: organizationId ist undefined
**Datei**: `backend/src/services/lobbyPmsService.ts`

**Zeile 171-174**: `createForBranch` muss `organizationId` aus Branch holen:
```typescript
static async createForBranch(branchId: number): Promise<LobbyPmsService> {
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: { organizationId: true }
  });
  if (!branch?.organizationId) {
    throw new Error(`Branch ${branchId} hat keine organizationId`);
  }
  const service = new LobbyPmsService(branch.organizationId, branchId); // ✅ organizationId setzen
  await service.loadSettings();
  return service;
}
```

**Zeile 482-490**: Fallback für organizationId wenn undefined:
```typescript
// Hole organizationId aus Branch wenn nicht gesetzt
if (!this.organizationId && this.branchId) {
  const branch = await prisma.branch.findUnique({
    where: { id: this.branchId },
    select: { organizationId: true }
  });
  this.organizationId = branch?.organizationId || undefined;
}
```

### Problem 2: Manila syncEnabled
**Datei**: Branch Settings in DB
- Manila (ID 3): `syncEnabled` auf `true` setzen


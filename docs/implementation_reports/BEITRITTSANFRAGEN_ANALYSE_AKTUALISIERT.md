# Analyse: Beitrittsanfragen werden nicht angezeigt - Aktualisiert

## Zusammenfassung

**Problem:** Beitrittsanfragen werden in der `JoinRequestsList` Komponente nicht angezeigt.

**Ursache:** Die Funktion `getJoinRequests` in `organizationController.ts` verwendet nicht `req.organizationId` aus der Middleware und prüft nicht auf NULL. Bei Usern mit Hamburger-Rolle (ohne Organisation) ist `organizationId` NULL, was zu leeren Ergebnissen führt.

---

## Detaillierte Analyse

### 1. Vergleich mit anderen Funktionen

#### ✅ `getOrganizationStats` - Korrekt implementiert
**Datei:** `backend/src/controllers/organizationController.ts` (Zeile 631-685)

```typescript
export const getOrganizationStats = async (req: Request, res: Response) => {
  // ✅ Verwendet req.organizationId aus Middleware
  const organizationId = req.organizationId || (req.params.id ? parseInt(req.params.id) : null);

  // ✅ Prüft auf NULL
  if (!organizationId || isNaN(organizationId)) {
    return res.status(400).json({ message: 'Ungültige Organisations-ID' });
  }

  // ✅ Verwendet organizationId direkt
  const stats = await prisma.organization.findUnique({
    where: { id: organizationId },
    // ...
  });
}
```

**Warum funktioniert das:**
- Nutzt `req.organizationId` aus Middleware
- Prüft explizit auf NULL/ungültige Werte
- Gibt klare Fehlermeldung zurück

#### ❌ `getJoinRequests` - Falsch implementiert
**Datei:** `backend/src/controllers/organizationController.ts` (Zeile 793-847)

```typescript
export const getJoinRequests = async (req: Request, res: Response) => {
  // ...
  // ❌ Ignoriert req.organizationId aus Middleware
  // ❌ Holt Organisation erneut aus DB (ineffizient)
  const userRole = await prisma.userRole.findFirst({
    where: { 
      userId: Number(userId),
      lastUsed: true 
    },
    include: {
      role: {
        include: {
          organization: true
        }
      }
    }
  });

  if (!userRole) {
    return res.status(404).json({ message: 'Keine aktive Rolle gefunden' });
  }

  // ❌ Prüft NICHT auf NULL
  // ❌ Wenn organizationId NULL ist, gibt Query leere Liste zurück
  const joinRequests = await prisma.organizationJoinRequest.findMany({
    where: { organizationId: userRole.role.organizationId }, // ⚠️ Kann NULL sein!
    // ...
  });
}
```

**Warum funktioniert das nicht:**
- Ignoriert `req.organizationId` aus Middleware
- Holt Organisation erneut aus DB (doppelte Arbeit)
- Prüft nicht auf NULL
- Wenn `organizationId` NULL ist, gibt `findMany({ where: { organizationId: null } })` leere Liste zurück
- Frontend zeigt "Keine Beitrittsanfragen vorhanden" an

### 2. Middleware-Logik

**Datei:** `backend/src/middleware/organization.ts` (Zeile 16-54)

```typescript
export const organizationMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // ...
  // WICHTIG: Kann NULL sein für standalone User (Hamburger-Rolle)
  req.organizationId = userRole.role.organizationId;
  req.userRole = userRole;
  next();
}
```

**Wichtig:** Die Middleware setzt `req.organizationId` auf NULL, wenn User keine Organisation hat, aber die Controller-Funktion sollte das prüfen!

### 3. Route-Struktur

**Datei:** `backend/src/routes/organizations.ts`

```typescript
// Zeile 43: Middleware wird angewendet
router.use(organizationMiddleware);

// Zeile 53: Route für Beitrittsanfragen
router.get('/join-requests', getJoinRequests);
```

**Problem:**
- Route verwendet `organizationMiddleware` ✅
- Middleware setzt `req.organizationId` ✅
- Controller-Funktion ignoriert `req.organizationId` ❌
- Controller-Funktion holt Organisation erneut ❌
- Controller-Funktion prüft nicht auf NULL ❌

---

## Root Cause

**Das Problem:** Die Funktion `getJoinRequests` in `organizationController.ts`:

1. **Ignoriert `req.organizationId`**: Die Middleware setzt bereits `req.organizationId`, aber die Funktion holt die Organisation erneut aus der DB (ineffizient).

2. **Prüft nicht auf NULL**: Wenn ein User eine Hamburger-Rolle hat (ohne Organisation), dann ist `organizationId` NULL.

3. **Query mit NULL**: `findMany({ where: { organizationId: null } })` gibt eine leere Liste zurück, auch wenn Beitrittsanfragen existieren könnten.

4. **Keine Fehlermeldung**: Die Funktion gibt keine Fehlermeldung zurück, wenn der User keine Organisation hat. Sie gibt einfach eine leere Liste zurück.

5. **Inkonsistent mit anderen Funktionen**: `getOrganizationStats` verwendet `req.organizationId` korrekt, aber `getJoinRequests` tut es nicht.

---

## Lösung

### Korrektur: `getJoinRequests` auf `req.organizationId` umstellen

**Änderung in `organizationController.getJoinRequests`:**

```typescript
export const getJoinRequests = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    // ✅ Verwende req.organizationId aus Middleware (wie getOrganizationStats)
    if (!req.organizationId) {
      return res.status(400).json({ 
        message: 'Diese Funktion ist nur für Benutzer mit Organisation verfügbar' 
      });
    }

    // ✅ Verwende req.organizationId direkt (keine erneute DB-Query)
    const joinRequests = await prisma.organizationJoinRequest.findMany({
      where: { organizationId: req.organizationId },
      include: {
        requester: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        processor: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(joinRequests);
  } catch (error) {
    console.error('Fehler beim Abrufen der Beitrittsanfragen:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};
```

**Vorteile:**
- ✅ Nutzt bereits vorhandene Middleware-Logik
- ✅ Weniger Datenbank-Queries (1 statt 2)
- ✅ Konsistent mit `getOrganizationStats`
- ✅ Bessere Performance
- ✅ Klare Fehlermeldung bei NULL

---

## Zusätzliche Erkenntnisse

### 1. Inkonsistenz zwischen Funktionen

- ✅ `getOrganizationStats` verwendet `req.organizationId` korrekt
- ❌ `getJoinRequests` ignoriert `req.organizationId`
- ❌ `processJoinRequest` prüft nicht, ob JoinRequest zur Organisation gehört

**Empfehlung:** Alle Funktionen sollten `req.organizationId` verwenden und konsistent prüfen.

### 2. Berechtigungsprüfung fehlt

Die Funktion prüft nicht, ob der User die Berechtigung `organization_join_requests` hat. Das Frontend prüft dies bereits, aber Backend sollte auch prüfen.

### 3. Zwei ähnliche Funktionen

Es gibt zwei fast identische Funktionen:
- `organizationController.getJoinRequests` (wird verwendet)
- `joinRequestController.getJoinRequestsForOrganization` (wird NICHT verwendet)

**Empfehlung:** Eine Funktion entfernen oder konsolidieren.

### 4. Frontend zeigt keine Fehlermeldung

Wenn `organizationId` NULL ist, gibt Backend eine leere Liste zurück. Frontend zeigt dann "Keine Beitrittsanfragen vorhanden" an, was verwirrend ist.

**Besser:** Backend sollte 400-Fehler zurückgeben, Frontend sollte entsprechende Meldung anzeigen.

---

## Empfohlene Lösung

**Die Funktion `getJoinRequests` sollte:**

1. ✅ `req.organizationId` verwenden statt erneut aus DB zu holen
2. ✅ Prüfung auf NULL hinzufügen (wie `getOrganizationStats`)
3. ✅ Bessere Fehlermeldung zurückgeben
4. ✅ Konsistent mit anderen Funktionen sein

**Datei:** `backend/src/controllers/organizationController.ts` (Zeile 793-847)

---

## Test-Szenarien

Nach der Korrektur sollten folgende Szenarien funktionieren:

1. ✅ User mit Organisation kann Beitrittsanfragen sehen
2. ✅ User ohne Organisation (Hamburger-Rolle) erhält Fehlermeldung 400
3. ✅ User ohne aktive Rolle erhält Fehlermeldung 404 (von Middleware)
4. ✅ Frontend zeigt korrekte Fehlermeldung an

---

## Code-Vergleich

### Vorher (Falsch):
```typescript
// ❌ Ignoriert req.organizationId
const userRole = await prisma.userRole.findFirst({...});
if (!userRole) return res.status(404).json(...);
const joinRequests = await prisma.organizationJoinRequest.findMany({
  where: { organizationId: userRole.role.organizationId }, // Kann NULL sein!
});
```

### Nachher (Richtig):
```typescript
// ✅ Verwendet req.organizationId aus Middleware
if (!req.organizationId) {
  return res.status(400).json({ message: '...' });
}
const joinRequests = await prisma.organizationJoinRequest.findMany({
  where: { organizationId: req.organizationId }, // Sicher nicht NULL!
});
```



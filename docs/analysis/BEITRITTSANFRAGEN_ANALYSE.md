# Analyse: Beitrittsanfragen werden nicht angezeigt

## Zusammenfassung

**Problem:** Beitrittsanfragen werden in der `JoinRequestsList` Komponente nicht angezeigt.

**Ursache gefunden:** Die Funktion `getJoinRequests` in `organizationController.ts` prüft nicht, ob der User eine Organisation hat. Bei Usern mit Hamburger-Rolle (ohne Organisation) ist `organizationId` NULL, was zu leeren Ergebnissen führt.

---

## Detaillierte Analyse

### 1. Datenfluss

**Frontend → Backend:**
```
JoinRequestsList.tsx (Zeile 97)
  ↓
organizationService.getJoinRequests() (organizationService.ts Zeile 60-63)
  ↓
GET /api/organizations/join-requests (api.ts Zeile 196)
  ↓
organizations.ts Route (Zeile 53)
  ↓
organizationMiddleware (Zeile 43) - setzt req.organizationId
  ↓
organizationController.getJoinRequests() (Zeile 793-847)
```

### 2. Code-Vergleich

#### Implementierung 1: `organizationController.getJoinRequests`
**Datei:** `backend/src/controllers/organizationController.ts` (Zeile 793-847)

**Aktueller Code:**
```typescript
export const getJoinRequests = async (req: Request, res: Response) => {
  // ...
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

  const joinRequests = await prisma.organizationJoinRequest.findMany({
    where: { organizationId: userRole.role.organizationId }, // ⚠️ PROBLEM: kann NULL sein!
    // ...
  });
}
```

**Problem:**
1. ✅ Prüft, ob `userRole` existiert
2. ❌ Prüft NICHT, ob `userRole.role.organizationId` NULL ist
3. ❌ Wenn User Hamburger-Rolle hat (ohne Organisation), dann ist `organizationId` NULL
4. ❌ Query `findMany({ where: { organizationId: null } })` gibt leere Liste zurück
5. ❌ Frontend zeigt "Keine Beitrittsanfragen vorhanden" an

#### Implementierung 2: `joinRequestController.getJoinRequestsForOrganization`
**Datei:** `backend/src/controllers/joinRequestController.ts` (Zeile 114-173)

**Code:**
```typescript
export const getJoinRequestsForOrganization = async (req: Request, res: Response) => {
  // ... identischer Code wie oben ...
  // Gleiches Problem!
}
```

**Ergebnis:** Beide Implementierungen haben das gleiche Problem!

### 3. Middleware-Analyse

**Datei:** `backend/src/middleware/organization.ts` (Zeile 16-54)

**Wichtig:**
```typescript
// Zeile 45-46: WICHTIG: Kann NULL sein für standalone User (Hamburger-Rolle)
req.organizationId = userRole.role.organizationId;
```

**Problem:** Die Middleware setzt `req.organizationId` auf NULL, wenn User keine Organisation hat, aber die Controller-Funktion nutzt `req.organizationId` nicht!

**Stattdessen:** Die Controller-Funktion holt die Organisation erneut aus der Datenbank, ignoriert aber `req.organizationId`.

### 4. Route-Struktur

**Datei:** `backend/src/routes/organizations.ts`

**Route-Registrierung:**
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

1. **Ignoriert `req.organizationId`**: Die Middleware setzt bereits `req.organizationId`, aber die Funktion holt die Organisation erneut aus der DB.

2. **Prüft nicht auf NULL**: Wenn ein User eine Hamburger-Rolle hat (ohne Organisation), dann ist `organizationId` NULL.

3. **Query mit NULL**: `findMany({ where: { organizationId: null } })` gibt eine leere Liste zurück, auch wenn Beitrittsanfragen existieren könnten.

4. **Keine Fehlermeldung**: Die Funktion gibt keine Fehlermeldung zurück, wenn der User keine Organisation hat. Sie gibt einfach eine leere Liste zurück.

---

## Lösung

### Option 1: Prüfung auf NULL hinzufügen (Empfohlen)

**Änderung in `organizationController.getJoinRequests`:**

```typescript
export const getJoinRequests = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    // Hole aktuelle Organisation
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

    // ✅ NEU: Prüfe ob User eine Organisation hat
    if (!userRole.role.organizationId) {
      return res.status(400).json({ 
        message: 'Diese Funktion ist nur für Benutzer mit Organisation verfügbar' 
      });
    }

    const joinRequests = await prisma.organizationJoinRequest.findMany({
      where: { organizationId: userRole.role.organizationId },
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

### Option 2: `req.organizationId` verwenden (Besser)

**Änderung:** Verwende `req.organizationId` statt erneut aus DB zu holen.

```typescript
export const getJoinRequests = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    // ✅ Verwende req.organizationId aus Middleware
    if (!req.organizationId) {
      return res.status(400).json({ 
        message: 'Diese Funktion ist nur für Benutzer mit Organisation verfügbar' 
      });
    }

    const joinRequests = await prisma.organizationJoinRequest.findMany({
      where: { organizationId: req.organizationId }, // ✅ Verwende req.organizationId
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

**Vorteil Option 2:**
- Nutzt bereits vorhandene Middleware-Logik
- Weniger Datenbank-Queries
- Konsistenter mit anderen Funktionen
- Bessere Performance

---

## Zusätzliche Erkenntnisse

### 1. Berechtigungsprüfung fehlt

Die Funktion prüft nicht, ob der User die Berechtigung `organization_join_requests` hat. Das Frontend prüft dies bereits, aber Backend sollte auch prüfen.

### 2. Zwei ähnliche Funktionen

Es gibt zwei fast identische Funktionen:
- `organizationController.getJoinRequests` (wird verwendet)
- `joinRequestController.getJoinRequestsForOrganization` (wird NICHT verwendet)

**Empfehlung:** Eine Funktion entfernen oder konsolidieren.

### 3. Frontend zeigt keine Fehlermeldung

Wenn `organizationId` NULL ist, gibt Backend eine leere Liste zurück. Frontend zeigt dann "Keine Beitrittsanfragen vorhanden" an, was verwirrend ist.

**Besser:** Backend sollte 400-Fehler zurückgeben, Frontend sollte entsprechende Meldung anzeigen.

---

## Empfohlene Lösung

**Option 2 implementieren** mit folgenden Änderungen:

1. ✅ `req.organizationId` verwenden statt erneut aus DB zu holen
2. ✅ Prüfung auf NULL hinzufügen
3. ✅ Bessere Fehlermeldung zurückgeben
4. ✅ Berechtigungsprüfung hinzufügen (optional, aber empfohlen)

**Datei:** `backend/src/controllers/organizationController.ts` (Zeile 793-847)

---

## Test-Szenarien

Nach der Korrektur sollten folgende Szenarien funktionieren:

1. ✅ User mit Organisation kann Beitrittsanfragen sehen
2. ✅ User ohne Organisation (Hamburger-Rolle) erhält Fehlermeldung
3. ✅ User ohne aktive Rolle erhält Fehlermeldung
4. ✅ Frontend zeigt korrekte Fehlermeldung an



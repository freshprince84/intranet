# Plan: Beitrittsanfragen-Lade-Problem beheben

## Problem-Analyse

**Symptom:** Beitrittsanfragen werden weiterhin nicht angezeigt, obwohl Code korrigiert wurde.

**Mögliche Ursachen:**
1. ❓ Middleware gibt Fehler zurück (404 oder 500)
2. ❓ `req.organizationId` ist NULL und Funktion gibt 400-Fehler zurück
3. ❓ Es gibt keine Beitrittsanfragen in der Datenbank für diese Organisation
4. ❓ Frontend zeigt Fehler nicht an
5. ❓ Route wird nicht korrekt aufgerufen
6. ❓ Berechtigungsprüfung blockiert den Zugriff

## Debug-Strategie

### Schritt 1: Backend-Debug-Logs hinzufügen

**Ziel:** Herausfinden, ob die Funktion aufgerufen wird und welche Werte sie erhält.

**Änderungen:**

#### 1.1: `getJoinRequests` - Debug-Logs hinzufügen

**Datei:** `backend/src/controllers/organizationController.ts` (Zeile 793-835)

**Hinzufügen:**
```typescript
export const getJoinRequests = async (req: Request, res: Response) => {
  try {
    console.log('=== getJoinRequests CALLED ===');
    const userId = req.userId;
    console.log('userId:', userId);
    console.log('req.organizationId:', req.organizationId);

    if (!userId) {
      console.log('❌ No userId, returning 401');
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    // Verwende req.organizationId aus Middleware (wie getOrganizationStats)
    if (!req.organizationId) {
      console.log('❌ No organizationId, returning 400');
      return res.status(400).json({ 
        message: 'Diese Funktion ist nur für Benutzer mit Organisation verfügbar' 
      });
    }

    console.log('✅ Fetching join requests for organizationId:', req.organizationId);
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

    console.log('✅ Found join requests:', joinRequests.length);
    console.log('✅ Returning join requests to frontend');
    res.json(joinRequests);
  } catch (error) {
    console.error('❌ Error in getJoinRequests:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};
```

#### 1.2: Middleware-Debug-Logs hinzufügen

**Datei:** `backend/src/middleware/organization.ts` (Zeile 16-54)

**Hinzufügen:**
```typescript
export const organizationMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('=== organizationMiddleware CALLED ===');
    const userId = req.userId;
    console.log('userId:', userId);
    
    if (!userId) {
      console.log('❌ No userId in middleware, returning 401');
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    // Hole aktuelle Rolle und Organisation des Users
    const userRole = await prisma.userRole.findFirst({
      where: { 
        userId: Number(userId),
        lastUsed: true 
      },
      include: {
        role: {
          include: {
            organization: true,
            permissions: true
          }
        }
      }
    });

    if (!userRole) {
      console.log('❌ No userRole found, returning 404');
      return res.status(404).json({ message: 'Keine aktive Rolle gefunden' });
    }

    console.log('✅ userRole found:', userRole.id);
    console.log('✅ role.organizationId:', userRole.role.organizationId);

    // Füge Organisations-Kontext zum Request hinzu
    // WICHTIG: Kann NULL sein für standalone User (Hamburger-Rolle)
    req.organizationId = userRole.role.organizationId;
    req.userRole = userRole;

    console.log('✅ Setting req.organizationId to:', req.organizationId);
    console.log('✅ Calling next()');
    next();
  } catch (error) {
    console.error('❌ Error in Organization Middleware:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};
```

### Schritt 2: Frontend-Debug-Logs hinzufügen

**Ziel:** Herausfinden, welche Fehlermeldung das Frontend erhält.

**Datei:** `frontend/src/components/organization/JoinRequestsList.tsx` (Zeile 91-117)

**Hinzufügen:**
```typescript
const fetchJoinRequests = async () => {
  if (!mountedRef.current) return;
  
  try {
    console.log('=== Frontend: Fetching join requests ===');
    setLoading(true);
    setError(null);
    const requests = await organizationService.getJoinRequests();
    console.log('✅ Frontend: Received join requests:', requests);
    console.log('✅ Frontend: Count:', requests.length);
    
    if (!mountedRef.current) return;
    
    setJoinRequests(requests);
  } catch (err: any) {
    console.error('❌ Frontend: Error fetching join requests:', err);
    console.error('❌ Frontend: Error response:', err.response);
    console.error('❌ Frontend: Error status:', err.response?.status);
    console.error('❌ Frontend: Error data:', err.response?.data);
    
    if (!mountedRef.current) return;
    
    const errorMessage = err.response?.data?.message || t('joinRequestsList.loadError');
    console.error('❌ Frontend: Error message:', errorMessage);
    setError(errorMessage);
    setTimeout(() => {
      showMessage(errorMessage, 'error');
    }, 0);
  } finally {
    if (mountedRef.current) {
      setLoading(false);
    }
  }
};
```

### Schritt 3: Route-Überprüfung

**Ziel:** Sicherstellen, dass die Route korrekt registriert ist.

**Prüfen:**
- ✅ Route ist registriert: `router.get('/join-requests', getJoinRequests);`
- ✅ Route verwendet `organizationMiddleware`
- ✅ Route ist nach `organizationMiddleware` definiert

**Mögliches Problem:** Route könnte vor Middleware sein oder falsch importiert sein.

### Schritt 4: Datenbank-Check

**Ziel:** Prüfen, ob Beitrittsanfragen in der Datenbank existieren.

**SQL-Query:**
```sql
-- Prüfe alle Beitrittsanfragen
SELECT * FROM "OrganizationJoinRequest" ORDER BY "createdAt" DESC;

-- Prüfe Beitrittsanfragen für eine spezifische Organisation
SELECT oj.*, o."displayName" as organization_name
FROM "OrganizationJoinRequest" oj
JOIN "Organization" o ON oj."organizationId" = o.id
WHERE oj."organizationId" = <ORGANIZATION_ID>
ORDER BY oj."createdAt" DESC;

-- Prüfe welche Organisation der User hat
SELECT ur.*, r."organizationId", o."displayName" as organization_name
FROM "UserRole" ur
JOIN "Role" r ON ur."roleId" = r.id
LEFT JOIN "Organization" o ON r."organizationId" = o.id
WHERE ur."userId" = <USER_ID> AND ur."lastUsed" = true;
```

## Mögliche Probleme und Lösungen

### Problem 1: Middleware gibt Fehler zurück

**Symptom:** Backend-Logs zeigen "No userRole found" oder "No userId"

**Lösung:**
- Prüfe ob User eine aktive Rolle hat
- Prüfe ob `lastUsed = true` gesetzt ist
- Prüfe ob Rolle eine Organisation hat

### Problem 2: `req.organizationId` ist NULL

**Symptom:** Backend-Logs zeigen "No organizationId, returning 400"

**Ursache:** User hat Hamburger-Rolle ohne Organisation

**Lösung:**
- Prüfe ob User tatsächlich eine Organisation haben sollte
- Prüfe ob `role.organizationId` NULL ist in der Datenbank

### Problem 3: Keine Beitrittsanfragen in DB

**Symptom:** Backend-Logs zeigen "Found join requests: 0"

**Lösung:**
- Prüfe Datenbank
- Erstelle Test-Beitrittsanfrage

### Problem 4: Frontend zeigt Fehler nicht an

**Symptom:** Backend gibt Fehler zurück, aber Frontend zeigt nichts

**Lösung:**
- Prüfe Browser-Konsole
- Prüfe Network-Tab im Browser
- Prüfe ob `setError` korrekt funktioniert

### Problem 5: Route wird nicht aufgerufen

**Symptom:** Keine Backend-Logs

**Lösung:**
- Prüfe ob Route korrekt registriert ist
- Prüfe ob Frontend korrekten Endpoint aufruft
- Prüfe Browser-Network-Tab

## Implementierungsreihenfolge

1. **Schritt 1.1:** Debug-Logs zu `getJoinRequests` hinzufügen
2. **Schritt 1.2:** Debug-Logs zu Middleware hinzufügen
3. **Schritt 2:** Debug-Logs zu Frontend hinzufügen
4. **Test:** Server neu starten und Seite öffnen
5. **Analyse:** Logs prüfen und Problem identifizieren
6. **Korrektur:** Problem beheben basierend auf Logs

## Erwartete Logs bei Erfolg

**Backend:**
```
=== organizationMiddleware CALLED ===
userId: 123
✅ userRole found: 456
✅ role.organizationId: 1
✅ Setting req.organizationId to: 1
✅ Calling next()
=== getJoinRequests CALLED ===
userId: 123
req.organizationId: 1
✅ Fetching join requests for organizationId: 1
✅ Found join requests: 5
✅ Returning join requests to frontend
```

**Frontend:**
```
=== Frontend: Fetching join requests ===
✅ Frontend: Received join requests: [...]
✅ Frontend: Count: 5
```

## Erwartete Logs bei Fehler

**Backend (keine Organisation):**
```
=== organizationMiddleware CALLED ===
userId: 123
✅ userRole found: 456
✅ role.organizationId: null
✅ Setting req.organizationId to: null
✅ Calling next()
=== getJoinRequests CALLED ===
userId: 123
req.organizationId: null
❌ No organizationId, returning 400
```

**Frontend:**
```
=== Frontend: Fetching join requests ===
❌ Frontend: Error status: 400
❌ Frontend: Error data: { message: 'Diese Funktion ist nur für Benutzer mit Organisation verfügbar' }
❌ Frontend: Error message: Diese Funktion ist nur für Benutzer mit Organisation verfügbar
```

## Nächste Schritte

1. Debug-Logs implementieren
2. Server neu starten
3. Seite öffnen und Logs prüfen
4. Problem basierend auf Logs identifizieren
5. Korrektur implementieren
6. Debug-Logs entfernen (optional)



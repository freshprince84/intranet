# Performance-Analyse: Detaillierte aktuelle Analyse (Stand: 2025-11-22 05:00 UTC)

## 🔴 AKTUELLE SITUATION

**Problem:** Alles, was mit der DB zu tun hat, ist extrem langsam (10 Sekunden statt 1 Sekunde wie noch vor ein paar Tagen).

**Status:** System ist relativ unbrauchbar langsam trotz implementierter Optimierungen.

## 📊 IDENTIFIZIERTE PROBLEME

### 1. ❌ `executeWithRetry` wird NIRGENDWO verwendet

**Problem:**
- `executeWithRetry` wurde in `backend/src/utils/prisma.ts` erstellt
- **Wird aber nirgendwo im Code verwendet!**
- Alle Prisma-Queries werden direkt ausgeführt ohne Retry-Logik

**Betroffene Stellen (ohne Retry-Logik):**
- `backend/src/middleware/auth.ts:54` - Auth-Middleware (komplexe Query: User → roles → role → permissions)
- `backend/src/middleware/organization.ts:24` - Organization-Middleware (komplexe Query: userRole → role → organization)
- `backend/src/utils/translations.ts:21` - getUserLanguage (wurde optimiert, aber keine Retry-Logik)
- `backend/src/controllers/worktimeController.ts:1074` - getActiveWorktime (wird sehr häufig aufgerufen!)
- `backend/src/controllers/notificationController.ts` - Notification-Erstellung
- **Alle anderen Controller und Services** - Hunderte von Prisma-Queries ohne Retry-Logik

**Impact:**
- Bei DB-Verbindungsfehlern (P1001, P1008) gibt es keine automatische Wiederholung
- Fehler werden direkt an den Client weitergegeben
- System wird bei DB-Verbindungsproblemen sofort unbrauchbar

### 2. 🔴 Prisma-Fehler in den Logs

**Gefundene Fehler:**
```
Fehler beim Erstellen der Notification: PrismaClientKnownRequestError
Fehler beim Abrufen der aktiven Zeiterfassung: PrismaClientKnownRequestError
```

**Ursache:**
- DB-Verbindungsfehler (P1001, P1008) treten auf
- Keine Retry-Logik → Fehler werden direkt weitergegeben
- System wird bei jedem DB-Verbindungsproblem blockiert

### 3. 🔴 `/api/worktime/active` wird sehr häufig aufgerufen

**Aktuelle Implementierung:**
```typescript
export const getActiveWorktime = async (req: Request, res: Response) => {
  const activeWorktime = await prisma.workTime.findFirst({
    where: {
      userId: Number(userId),
      endTime: null
    },
    include: {
      branch: true
    }
  });
  // ...
};
```

**Probleme:**
1. **Keine Retry-Logik** - Bei DB-Fehler sofortiger Fehler
2. **Wird sehr häufig aufgerufen** - Frontend pollt alle 30 Sekunden (laut Nginx-Logs)
3. **Lädt Branch-Daten** - `include: { branch: true }` könnte Branch-Settings-Entschlüsselung auslösen
4. **Kein Caching** - Jeder Request geht zur Datenbank

**Nginx-Logs zeigen:**
- `/api/worktime/active`: Sehr häufige Requests (alle 30 Sekunden pro User)
- Bei mehreren Usern = viele gleichzeitige DB-Queries

### 4. 🔴 Middleware machen komplexe Queries ohne Retry-Logik

**Auth-Middleware (`backend/src/middleware/auth.ts:54`):**
```typescript
const user = await prisma.user.findUnique({
  where: { id: decoded.userId },
  include: {
    roles: {
      include: {
        role: {
          include: {
            permissions: true
          }
        }
      }
    },
    settings: true
  }
});
```

**Probleme:**
- **Komplexe Query** mit mehreren Joins (User → roles → role → permissions)
- **Wird bei JEDEM Request ausgeführt** (jeder API-Request geht durch Auth-Middleware)
- **Keine Retry-Logik** - Bei DB-Fehler sofortiger Fehler
- **Lädt alle User-Daten** - Inklusive settings, roles, permissions

**Organization-Middleware (`backend/src/middleware/organization.ts:24`):**
```typescript
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
```

**Probleme:**
- **Komplexe Query** mit Joins (userRole → role → organization + permissions)
- **Wird bei vielen Requests ausgeführt** (nach Auth-Middleware)
- **Keine Retry-Logik** - Bei DB-Fehler sofortiger Fehler
- **Lädt komplette Organization** - Inklusive aller Felder (könnte Settings enthalten)

### 5. ⚠️ Implementierte Optimierungen helfen nicht genug

**Was wurde implementiert:**
1. ✅ `getUserLanguage` optimiert (Cache + einfache Query zuerst)
2. ✅ `/api/organizations/current` lädt Settings nicht automatisch
3. ✅ `executeWithRetry` Helper-Funktion erstellt

**Warum es nicht hilft:**
1. ❌ `executeWithRetry` wird **nirgendwo verwendet**
2. ❌ Middleware-Queries sind **immer noch komplex** und **ohne Retry-Logik**
3. ❌ `/api/worktime/active` wird **sehr häufig aufgerufen** ohne Caching
4. ❌ **Viele andere Endpoints** machen komplexe Queries ohne Optimierung

## 🔍 ROOT CAUSE ANALYSE

### Hauptursache 1: Fehlende Retry-Logik bei DB-Verbindungsfehlern

**Problem:**
- PostgreSQL schließt idle Verbindungen nach Timeout
- Prisma nutzt geschlossene Verbindungen → Fehler (P1001, P1008)
- **Keine automatische Wiederholung** → System wird sofort unbrauchbar

**Impact:**
- Jeder DB-Verbindungsfehler führt zu sofortigem Request-Fehler
- Keine automatische Wiederherstellung
- System wird bei DB-Verbindungsproblemen blockiert

### Hauptursache 2: Komplexe Middleware-Queries ohne Optimierung

**Problem:**
- Auth-Middleware lädt **alle User-Daten** bei jedem Request
- Organization-Middleware lädt **komplette Organization** bei vielen Requests
- **Keine Retry-Logik** bei DB-Fehlern
- **Keine Optimierung** der Queries (lädt mehr Daten als nötig)

**Impact:**
- Jeder API-Request macht 2 komplexe DB-Queries (Auth + Organization)
- Bei DB-Verbindungsfehlern → sofortiger Fehler
- Hohe DB-Last durch komplexe Queries

### Hauptursache 3: Häufige API-Requests ohne Caching

**Problem:**
- `/api/worktime/active` wird alle 30 Sekunden aufgerufen
- `/api/notifications/unread/count` wird sehr häufig aufgerufen
- **Kein Caching** → Jeder Request geht zur Datenbank
- **Keine Retry-Logik** → Bei DB-Fehler sofortiger Fehler

**Impact:**
- Viele gleichzeitige DB-Queries
- Bei DB-Verbindungsfehlern → viele fehlgeschlagene Requests
- Hohe DB-Last

## 💡 LÖSUNGSVORSCHLÄGE

### Lösung 1: `executeWithRetry` in kritischen Stellen verwenden (PRIORITÄT 1) ⭐

**Was:**
- `executeWithRetry` in Middleware verwenden (auth.ts, organization.ts)
- `executeWithRetry` in häufig aufgerufenen Endpoints verwenden (getActiveWorktime, getUserLanguage)
- `executeWithRetry` in Notification-Erstellung verwenden

**Code-Änderung (Beispiel: auth.ts):**
```typescript
import { executeWithRetry } from '../utils/prisma';

export const authMiddleware = async (req, res, next) => {
  try {
    // ...
    const user = await executeWithRetry(() => 
      prisma.user.findUnique({
        where: { id: decoded.userId },
        include: {
          roles: {
            include: {
              role: {
                include: {
                  permissions: true
                }
              }
            }
          },
          settings: true
        }
      })
    );
    // ...
  } catch (error) {
    // ...
  }
};
```

**Erwartete Verbesserung:**
- Automatische Wiederholung bei DB-Verbindungsfehlern
- System wird robuster gegen DB-Verbindungsprobleme
- Weniger fehlgeschlagene Requests

### Lösung 2: Middleware-Queries optimieren (PRIORITÄT 2) ⭐

**Was:**
- Auth-Middleware: Nur benötigte Felder laden (nicht alle User-Daten)
- Organization-Middleware: Nur benötigte Felder laden (nicht komplette Organization)

**Code-Änderung (Beispiel: auth.ts):**
```typescript
const user = await executeWithRetry(() => 
  prisma.user.findUnique({
    where: { id: decoded.userId },
    select: {
      id: true,
      username: true,
      email: true,
      roles: {
        where: { lastUsed: true },
        include: {
          role: {
            select: {
              id: true,
              name: true,
              permissions: {
                select: {
                  entity: true,
                  accessLevel: true
                }
              }
            }
          }
        },
        take: 1
      }
    }
  })
);
```

**Erwartete Verbesserung:**
- Weniger Daten werden geladen → schnellere Queries
- Weniger DB-Last
- Schnellere Response-Zeiten

### Lösung 3: `/api/worktime/active` optimieren (PRIORITÄT 3)

**Was:**
- `executeWithRetry` verwenden
- Optional: Caching (aber User hat explizit gesagt: KEIN Caching für `/api/worktime/active`)

**Code-Änderung:**
```typescript
export const getActiveWorktime = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    const activeWorktime = await executeWithRetry(() =>
      prisma.workTime.findFirst({
        where: {
          userId: Number(userId),
          endTime: null
        },
        include: {
          branch: {
            select: {
              id: true,
              name: true
              // Nur benötigte Felder, keine Settings-Entschlüsselung
            }
          }
        }
      })
    );
    // ...
  } catch (error) {
    // ...
  }
};
```

**Erwartete Verbesserung:**
- Automatische Wiederholung bei DB-Verbindungsfehlern
- Weniger Daten werden geladen (nur benötigte Branch-Felder)
- Schnellere Response-Zeiten

## 📋 EMPFEHLUNG

**Empfohlene Reihenfolge:**

1. **Lösung 1: `executeWithRetry` in kritischen Stellen verwenden** (SOFORT)
   - Einfach zu implementieren
   - Sofort wirksam gegen DB-Verbindungsfehler
   - Erwartete Verbesserung: System wird robuster, weniger fehlgeschlagene Requests
   - Risiko: Niedrig

2. **Lösung 2: Middleware-Queries optimieren** (NACH Lösung 1)
   - Reduziert DB-Last
   - Schnellere Response-Zeiten
   - Risiko: Mittel (könnte Logik ändern)

3. **Lösung 3: `/api/worktime/active` optimieren** (NACH Lösung 1+2)
   - Reduziert DB-Last bei häufigem Endpoint
   - Schnellere Response-Zeiten
   - Risiko: Niedrig

## ⚠️ WICHTIG

**NICHT das Problem:**
- ❌ `getUserLanguage` Optimierung (wurde bereits implementiert und hilft)
- ❌ `/api/organizations/current` Settings-Optimierung (wurde bereits implementiert und hilft)

**DAS Problem:**
- ✅ `executeWithRetry` wird **nirgendwo verwendet**
- ✅ Middleware-Queries sind **komplex und ohne Retry-Logik**
- ✅ `/api/worktime/active` wird **sehr häufig aufgerufen ohne Retry-Logik**
- ✅ **Viele andere Endpoints** machen Queries ohne Retry-Logik

---

**Erstellt**: 2025-11-22 05:00 UTC  
**Status**: 🔴 Analyse abgeschlossen, Lösungsvorschläge erstellt  
**Nächster Schritt**: Lösungsvorschläge mit User besprechen, dann implementieren





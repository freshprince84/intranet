# Prisma-Fehler und Response-Zeiten Analyse

**Datum**: 2025-11-22  
**Status**: 🔴 KRITISCH

## 🔴 Prisma-Fehler

### Fehlertypen

1. **"Can't reach database server at `localhost:5432`"**
   - Tritt auf bei: `getUserLanguage`, Auth-Middleware, Organization-Middleware
   - **Ursache**: DB-Verbindung wird geschlossen oder ist nicht erreichbar

2. **"Server has closed the connection"**
   - Tritt auf bei: `getUserLanguage`
   - **Ursache**: PostgreSQL schließt Verbindungen (möglicherweise Timeout)

3. **PrismaClientKnownRequestError**
   - Tritt auf bei: Notification-Erstellung, Auth-Middleware
   - **Ursache**: Connection Pool Timeout oder DB-Verbindungsprobleme

### Betroffene Stellen

- `backend/src/utils/translations.ts:9` - getUserLanguage
- `backend/src/middleware/auth.ts:54` - Auth-Middleware
- `backend/src/middleware/organization.ts:24` - Organization-Middleware
- `backend/src/controllers/notificationController.ts:145` - Notification-Erstellung

### Häufigkeit

- **7 DB-Verbindungsfehler** in den letzten 10000 Log-Zeilen
- Tritt sporadisch auf, nicht kontinuierlich

## ⏱️ Response-Zeiten (langsamste Requests)

**Sehr langsam (>10 Sekunden):**
- `/api/users/profile`: **11.5 Sekunden** (3x zur gleichen Zeit: 03:48:37, 03:44:00, 02:41:32)
- `/api/auth/login`: **11.5 Sekunden** (03:35:19)
- `/api/organizations/current`: **10.9 Sekunden** (3x zur gleichen Zeit: 03:48:41, 03:44:06, 02:41:44)

**Extrem langsam:**
- `/api/settings/logo/base64`: **17.4 Minuten** (1047554ms) - vermutlich großer Upload
- `/api/requests`: **264 Sekunden** (4.4 Minuten)

**Langsam (1-10 Sekunden):**
- `/api/tasks`: **94 Sekunden**
- `/api/reservations`: **80 Sekunden**
- `/api/requests?filterId=204`: **61 Sekunden**

**Moderat langsam (1-5 Sekunden):**
- `/api/saved-filters/requests-table`: **14 Sekunden** (2x)
- `/api/saved-filters/worktracker-todos`: **12 Sekunden** (3x)

**Normal (<1 Sekunde):**
- `/api/worktime/active`: **1.1 Sekunden** (3x)

## 🔍 Connection Pool Status

**Aktuell:**
- **Active Connections**: 1
- **Idle Connections**: 7
- **Total**: 8 Verbindungen
- **PostgreSQL max_connections**: 100

**Connection Pool Konfiguration:**
- ✅ `connection_limit=20` in DATABASE_URL
- ✅ `pool_timeout=20` in DATABASE_URL

## 📊 Langsame Endpoints - Query-Analyse

### `/api/users/profile` (getCurrentUser)

**Query:**
```typescript
prisma.user.findUnique({
  where: { id: userId },
  select: {
    // ... viele Felder ...
    roles: {
      include: {
        role: {
          include: {
            permissions: true,
            organization: {
              select: { id, name, displayName, logo }
            }
          }
        }
      }
    }
  }
});
```

**Problem**: Komplexe Query mit mehreren Joins (User → roles → role → permissions + organization)

### `/api/organizations/current` (getCurrentOrganization)

**Query:**
```typescript
prisma.userRole.findFirst({
  where: { userId, lastUsed: true },
  include: {
    role: {
      include: {
        organization: true  // Lädt ALLE Organization-Felder
      }
    }
  }
});
```

**Zusätzlich**: `decryptApiSettings()` wird aufgerufen - CPU-intensiv!

**Problem**: 
- Komplexe Query mit Joins
- Settings-Entschlüsselung (CPU-intensiv)

## 💡 Mögliche Ursachen

### 1. DB-Verbindung wird geschlossen
- PostgreSQL schließt idle Verbindungen nach Timeout
- Prisma versucht geschlossene Verbindung zu nutzen
- **Lösung**: Prisma reconnect-Logik prüfen, Connection Pool Timeout erhöhen

### 2. Langsame Queries mit vielen Joins
- `/api/users/profile`: User → roles → role → permissions + organization
- `/api/organizations/current`: userRole → role → organization + Settings-Entschlüsselung
- **Lösung**: Queries optimieren, nur benötigte Felder laden

### 3. Settings-Entschlüsselung ist CPU-intensiv
- `decryptApiSettings()` wird bei jedem `/api/organizations/current` Request aufgerufen
- **Lösung**: Settings-Entschlüsselung cachen (aber nur wenn erlaubt!)

### 4. Viele gleichzeitige Requests
- Frontend pollt sehr häufig
- Viele Requests gleichzeitig = DB-Last
- **Lösung**: Frontend-Polling optimieren

## 📋 Empfohlene Maßnahmen

### ✅ Priorität 1: Prisma reconnect-Logik (IMPLEMENTIERT)
- ✅ Prisma Client reconnect bei geschlossenen Verbindungen
- ✅ `executeWithRetry` Helper-Funktion erstellt
- ✅ Retry-Logik bei DB-Verbindungsfehlern (P1001, P1008)

### ✅ Priorität 2: Langsame Queries optimieren (IMPLEMENTIERT)
- ✅ `/api/organizations/current`: Settings werden NICHT automatisch geladen (19.8 MB!)
- ✅ Settings nur laden wenn `?includeSettings=true` Query-Parameter gesetzt
- ✅ Frontend angepasst: `OrganizationSettings` lädt Settings explizit, `OrganizationContext` nicht

### Priorität 3: Error Handling verbessern
- Bessere Fehlerbehandlung in Middleware
- Logging verbessern

## ✅ Implementierte Optimierungen

### 1. `/api/organizations/current` - Settings nicht automatisch laden

**Problem:**
- Organization.settings ist 19.8 MB groß
- Wurde bei jedem Request geladen und entschlüsselt (CPU-intensiv)

**Lösung:**
- Settings werden nur geladen wenn `?includeSettings=true` Query-Parameter gesetzt
- Frontend: `OrganizationContext` lädt ohne Settings (schnell)
- Frontend: `OrganizationSettings` lädt mit Settings (wenn benötigt)

**Code-Änderungen:**
- `backend/src/controllers/organizationController.ts`: `getCurrentOrganization` verwendet `select` statt `include` für Organization
- `frontend/src/services/organizationService.ts`: `getCurrentOrganization` akzeptiert `includeSettings` Parameter
- `frontend/src/components/organization/OrganizationSettings.tsx`: Lädt Settings explizit

### 2. Prisma Connection Pool - Reconnect-Logik

**Problem:**
- PostgreSQL schließt idle Verbindungen
- Prisma nutzt geschlossene Verbindungen → Fehler (P1001, P1008)

**Lösung:**
- `executeWithRetry` Helper-Funktion erstellt
- Automatischer Reconnect bei DB-Verbindungsfehlern
- Max 3 Retries mit exponential backoff

**Code-Änderungen:**
- `backend/src/utils/prisma.ts`: `executeWithRetry` Funktion hinzugefügt
- Kann in kritischen Stellen verwendet werden (z.B. `getUserLanguage`, Auth-Middleware)

---

**Erstellt**: 2025-11-22  
**Status**: ✅ Optimierungen 1 & 3 implementiert

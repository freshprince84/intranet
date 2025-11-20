# Schichtplaner - Detaillierter Implementierungsplan

## 📋 Übersicht

Dieser Plan beschreibt die detaillierte Implementierung von 4 Verbesserungen:
1. Berechtigungssystem - Permission-basiert statt hardcodiert
2. Automatische Generierung - Fallback auf alle User
3. Schichtverteilung - Vertragstyp berücksichtigen
4. Kalender-Anzeige - Farben nach Standort/Rolle

**Datum:** 2025-01-XX  
**Status:** Plan erstellt, noch nicht implementiert

---

## 🎯 Prioritäten

1. **Hoch:** Berechtigungssystem (Sicherheit)
2. **Hoch:** Automatische Generierung (Funktionalität)
3. **Mittel:** Kalender-Anzeige (UX)
4. **Niedrig:** Schichtverteilung (Optimierung)

---

## 1. Berechtigungssystem - Permission-basiert statt hardcodiert

### 📋 Übersicht

**Problem:** Admin-Berechtigung ist hardcodiert (`r.name === 'admin'`)  
**Lösung:** Permission-basiert über `availability_management` Entity

### 🔧 Schritt 1: Permission-Entity erstellen (Datenbank)

**Datei:** `backend/scripts/add_availability_management_permission.ts` (NEU ERSTELLEN)

**Inhalt:**
```typescript
import { PrismaClient, AccessLevel } from '@prisma/client';

const prisma = new PrismaClient();

async function ensurePermission(roleId: number, entity: string, entityType: string, accessLevel: AccessLevel) {
  const existing = await prisma.permission.findFirst({
    where: {
      roleId,
      entity,
      entityType
    }
  });

  if (existing) {
    if (existing.accessLevel !== accessLevel) {
      await prisma.permission.update({
        where: { id: existing.id },
        data: { accessLevel }
      });
      console.log(`   ✓ Aktualisiert: ${entityType}_${entity} = ${accessLevel} für Rolle ${roleId}`);
    } else {
      console.log(`   - Bereits vorhanden: ${entityType}_${entity} = ${accessLevel} für Rolle ${roleId}`);
    }
  } else {
    await prisma.permission.create({
      data: {
        roleId,
        entity,
        entityType,
        accessLevel
      }
    });
    console.log(`   + Erstellt: ${entityType}_${entity} = ${accessLevel} für Rolle ${roleId}`);
  }
}

async function main() {
  console.log('🔑 Füge availability_management Permission hinzu...\n');

  // Finde alle Admin-Rollen (name = 'admin' oder name enthält 'admin')
  const adminRoles = await prisma.role.findMany({
    where: {
      OR: [
        { name: { equals: 'admin', mode: 'insensitive' } },
        { name: { contains: 'admin', mode: 'insensitive' } }
      ]
    }
  });

  if (adminRoles.length === 0) {
    console.log('⚠️  Keine Admin-Rollen gefunden!');
    return;
  }

  console.log(`📋 Gefundene Admin-Rollen: ${adminRoles.length}`);
  adminRoles.forEach(role => {
    console.log(`   - ${role.name} (ID: ${role.id}, Org: ${role.organizationId || 'global'})`);
  });

  // Füge Permission für alle Admin-Rollen hinzu
  for (const role of adminRoles) {
    await ensurePermission(role.id, 'availability_management', 'page', 'both');
    await ensurePermission(role.id, 'availability_management', 'table', 'both');
  }

  console.log('\n✅ Fertig!');
}

main()
  .catch((e) => {
    console.error('❌ Fehler:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Ausführen:**
```bash
cd backend
npx ts-node scripts/add_availability_management_permission.ts
```

### 🔧 Schritt 2: Backend - Controller anpassen

**Datei:** `backend/src/controllers/userAvailabilityController.ts`

**Änderung 1: Import hinzufügen (Zeile 1-5)**
```typescript
import { Request, Response } from 'express';
import { PrismaClient, AvailabilityType } from '@prisma/client';
import { checkUserPermission } from '../middleware/permissionMiddleware'; // NEU
```

**Änderung 2: createAvailability - Zeile 190-197 ersetzen**
```typescript
// ALT:
// Prüfe, ob User Zugriff hat (nur eigene Verfügbarkeiten oder Admin)
const currentUserId = req.user?.id as number | undefined;
if (finalUserId !== currentUserId && !req.user?.roles?.some((r: any) => r.name === 'admin')) {
  return res.status(403).json({
    success: false,
    message: 'Keine Berechtigung, Verfügbarkeiten für andere User zu erstellen'
  });
}

// NEU:
// Prüfe, ob User Zugriff hat (nur eigene Verfügbarkeiten oder Permission)
const currentUserId = req.user?.id as number | undefined;
const currentRoleId = req.roleId ? parseInt(req.roleId, 10) : null;

if (finalUserId !== currentUserId) {
  // User versucht Verfügbarkeit für anderen User zu erstellen
  if (!currentRoleId) {
    return res.status(401).json({
      success: false,
      message: 'Nicht authentifiziert'
    });
  }

  // Prüfe Permission
  const hasPermission = await checkUserPermission(
    currentUserId,
    currentRoleId,
    'availability_management',
    'write',
    'page'
  );

  if (!hasPermission) {
    return res.status(403).json({
      success: false,
      message: 'Keine Berechtigung, Verfügbarkeiten für andere User zu erstellen'
    });
  }
}
```

**Änderung 3: getAvailabilityById - Zeile 137-144 ersetzen**
```typescript
// ALT:
// Prüfe, ob User Zugriff hat (nur eigene Verfügbarkeiten oder Admin)
const currentUserId = req.user?.id as number | undefined;
if (availability.userId !== currentUserId && !req.user?.roles?.some((r: any) => r.name === 'admin')) {
  return res.status(403).json({
    success: false,
    message: 'Keine Berechtigung'
  });
}

// NEU:
// Prüfe, ob User Zugriff hat (nur eigene Verfügbarkeiten oder Permission)
const currentUserId = req.user?.id as number | undefined;
const currentRoleId = req.roleId ? parseInt(req.roleId, 10) : null;

if (availability.userId !== currentUserId) {
  if (!currentRoleId) {
    return res.status(401).json({
      success: false,
      message: 'Nicht authentifiziert'
    });
  }

  const hasPermission = await checkUserPermission(
    currentUserId,
    currentRoleId,
    'availability_management',
    'read',
    'page'
  );

  if (!hasPermission) {
    return res.status(403).json({
      success: false,
      message: 'Keine Berechtigung'
    });
  }
}
```

**Änderung 4: updateAvailability - Zeile 375-382 ersetzen**
```typescript
// ALT:
// Prüfe, ob User Zugriff hat
const currentUserId = req.user?.id as number | undefined;
if (existing.userId !== currentUserId && !req.user?.roles?.some((r: any) => r.name === 'admin')) {
  return res.status(403).json({
    success: false,
    message: 'Keine Berechtigung'
  });
}

// NEU:
// Prüfe, ob User Zugriff hat (nur eigene Verfügbarkeiten oder Permission)
const currentUserId = req.user?.id as number | undefined;
const currentRoleId = req.roleId ? parseInt(req.roleId, 10) : null;

if (existing.userId !== currentUserId) {
  if (!currentRoleId) {
    return res.status(401).json({
      success: false,
      message: 'Nicht authentifiziert'
    });
  }

  const hasPermission = await checkUserPermission(
    currentUserId,
    currentRoleId,
    'availability_management',
    'write',
    'page'
  );

  if (!hasPermission) {
    return res.status(403).json({
      success: false,
      message: 'Keine Berechtigung'
    });
  }
}
```

**Änderung 5: deleteAvailability - Zeile 567-574 ersetzen**
```typescript
// ALT:
// Prüfe, ob User Zugriff hat
const currentUserId = req.user?.id as number | undefined;
if (existing.userId !== currentUserId && !req.user?.roles?.some((r: any) => r.name === 'admin')) {
  return res.status(403).json({
    success: false,
    message: 'Keine Berechtigung'
  });
}

// NEU:
// Prüfe, ob User Zugriff hat (nur eigene Verfügbarkeiten oder Permission)
const currentUserId = req.user?.id as number | undefined;
const currentRoleId = req.roleId ? parseInt(req.roleId, 10) : null;

if (existing.userId !== currentUserId) {
  if (!currentRoleId) {
    return res.status(401).json({
      success: false,
      message: 'Nicht authentifiziert'
    });
  }

  const hasPermission = await checkUserPermission(
    currentUserId,
    currentRoleId,
    'availability_management',
    'write',
    'page'
  );

  if (!hasPermission) {
    return res.status(403).json({
      success: false,
      message: 'Keine Berechtigung'
    });
  }
}
```

**Änderung 6: getAllAvailabilities - Zeile 10-85 erweitern**

**NEU: Admin kann alle Verfügbarkeiten sehen**
```typescript
export const getAllAvailabilities = async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId as string, 10) : null;
    const branchId = req.query.branchId ? parseInt(req.query.branchId as string, 10) : null;
    const roleId = req.query.roleId ? parseInt(req.query.roleId as string, 10) : null;

    // Wenn kein userId angegeben, verwende den eingeloggten User
    const finalUserId = userId || (req.user?.id as number | undefined);

    if (!finalUserId) {
      return res.status(401).json({
        success: false,
        message: 'Nicht authentifiziert'
      });
    }

    const currentUserId = req.user?.id as number | undefined;
    const currentRoleId = req.roleId ? parseInt(req.roleId, 10) : null;

    // Prüfe, ob User alle Verfügbarkeiten sehen darf (Permission)
    let canViewAll = false;
    if (currentRoleId) {
      canViewAll = await checkUserPermission(
        currentUserId!,
        currentRoleId,
        'availability_management',
        'read',
        'page'
      );
    }

    const where: any = {};

    // Wenn User Permission hat und kein userId angegeben → zeige alle
    if (canViewAll && !userId) {
      // Kein Filter auf userId
    } else {
      // Normaler User: nur eigene Verfügbarkeiten
      where.userId = finalUserId;
    }

    if (branchId && !isNaN(branchId)) {
      where.branchId = branchId;
    }

    if (roleId && !isNaN(roleId)) {
      where.roleId = roleId;
    }

    // Nur aktive Verfügbarkeiten, wenn nicht anders angegeben
    if (req.query.includeInactive !== 'true') {
      where.isActive = true;
    }

    // ... Rest bleibt gleich
  } catch (error) {
    // ... Fehlerbehandlung bleibt gleich
  }
};
```

### 🔧 Schritt 3: Frontend - Admin-Check anpassen

**Datei:** `frontend/src/components/teamWorktime/AvailabilityManagement.tsx`

**Änderung 1: Import hinzufügen (Zeile 1-9)**
```typescript
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../config/axios.ts';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, PencilIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import { API_ENDPOINTS } from '../../config/api.ts';
import { useAuth } from '../../hooks/useAuth.tsx';
import { usePermissions } from '../../hooks/usePermissions.tsx'; // NEU
import { useSidepane } from '../../contexts/SidepaneContext.tsx';
import { format } from 'date-fns';
```

**Änderung 2: usePermissions Hook verwenden (Zeile 55-60)**
```typescript
const AvailabilityManagement = ({ isOpen, onClose }: AvailabilityManagementProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { hasPermission } = usePermissions(); // NEU
  const { openSidepane, closeSidepane } = useSidepane();
  // ...
  
  // Prüfe, ob User Verfügbarkeiten für andere User verwalten darf
  const canManageAllAvailabilities = hasPermission('availability_management', 'write', 'page');
```

**Änderung 3: User-Auswahl hinzufügen (NEU)**

**State hinzufügen (nach Zeile 67):**
```typescript
const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
const [allUsers, setAllUsers] = useState<Array<{ id: number; firstName: string; lastName: string }>>([]);
```

**fetchData erweitern (Zeile 126-148):**
```typescript
const fetchData = async () => {
  setLoadingData(true);
  setError(null);
  
  try {
    // Lade User (wenn Permission vorhanden)
    if (canManageAllAvailabilities) {
      try {
        const usersRes = await axiosInstance.get(API_ENDPOINTS.USERS.DROPDOWN);
        setAllUsers(usersRes.data || []);
      } catch (err) {
        console.error('Fehler beim Laden der User:', err);
      }
    }

    const [availabilitiesRes, rolesRes, branchesRes] = await Promise.all([
      axiosInstance.get(API_ENDPOINTS.SHIFTS.AVAILABILITIES.BASE, {
        params: {
          userId: selectedUserId || (user?.id ? { userId: user.id, includeInactive: true } : { includeInactive: true }),
          includeInactive: true
        }
      }),
      axiosInstance.get(API_ENDPOINTS.ROLES.BASE),
      axiosInstance.get(API_ENDPOINTS.BRANCHES.BASE)
    ]);
    
    setAvailabilities(availabilitiesRes.data?.data || availabilitiesRes.data || []);
    setRoles(rolesRes.data || []);
    setBranches(branchesRes.data || []);
  } catch (err: any) {
    // ... Fehlerbehandlung
  } finally {
    setLoadingData(false);
  }
};
```

**User-Filter-Dropdown hinzufügen (vor Zeile 513, im renderContent):**
```typescript
{canManageAllAvailabilities && (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
      {t('teamWorktime.shifts.availabilities.filter.user')}
    </label>
    <select
      value={selectedUserId || ''}
      onChange={(e) => {
        const userId = e.target.value ? parseInt(e.target.value, 10) : null;
        setSelectedUserId(userId);
      }}
      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value="">{t('teamWorktime.shifts.availabilities.filter.allUsers')}</option>
      {allUsers.map((u) => (
        <option key={u.id} value={u.id}>
          {u.firstName} {u.lastName}
        </option>
      ))}
    </select>
  </div>
)}
```

**User-Auswahl im Formular hinzufügen (nach Zeile 300, im renderForm):**
```typescript
{canManageAllAvailabilities && (
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      {t('teamWorktime.shifts.availabilities.form.user')}
    </label>
    <select
      value={formData.userId || ''}
      onChange={(e) => setFormData({ ...formData, userId: e.target.value ? Number(e.target.value) : null })}
      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      disabled={!!editingAvailability} // Read-only beim Bearbeiten
    >
      <option value="">{t('teamWorktime.shifts.availabilities.form.selectUser')}</option>
      {allUsers.map((u) => (
        <option key={u.id} value={u.id}>
          {u.firstName} {u.lastName}
        </option>
      ))}
    </select>
    {editingAvailability && (
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {t('teamWorktime.shifts.availabilities.form.userReadOnly')}
      </p>
    )}
  </div>
)}
```

**formData erweitern (Zeile 71-83):**
```typescript
const [formData, setFormData] = useState({
  userId: null as number | null, // NEU
  branchId: '' as number | '',
  roleId: '' as number | '',
  // ... Rest bleibt gleich
});
```

**handleSubmit anpassen (Zeile 204-239):**
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError(null);
  setLoading(true);

  try {
    const availabilityData: any = {
      userId: canManageAllAvailabilities && formData.userId ? formData.userId : undefined, // Nur senden wenn Permission vorhanden
      branchId: formData.branchId ? Number(formData.branchId) : null,
      // ... Rest bleibt gleich
    };

    // ... Rest bleibt gleich
  } catch (err: any) {
    // ... Fehlerbehandlung
  } finally {
    setLoading(false);
  }
};
```

**User-Name in Liste anzeigen (Zeile 558, nach availability.branch):**
```typescript
{availability.user && canManageAllAvailabilities && (
  <div>
    <span className="font-medium">{t('teamWorktime.shifts.availabilities.userLabel')}:</span> {availability.user.firstName} {availability.user.lastName}
  </div>
)}
```

### 🔧 Schritt 4: Translations hinzufügen

**Dateien:**
- `frontend/src/i18n/locales/de.json`
- `frontend/src/i18n/locales/en.json`
- `frontend/src/i18n/locales/es.json`

**Unter `teamWorktime.shifts.availabilities` hinzufügen:**
```json
{
  "filter": {
    "user": "Benutzer",
    "allUsers": "Alle Benutzer"
  },
  "form": {
    "user": "Benutzer",
    "selectUser": "Benutzer auswählen",
    "userReadOnly": "Benutzer kann beim Bearbeiten nicht geändert werden"
  },
  "userLabel": "Verfügbarkeit für"
}
```

### ✅ Test-Hinweise

1. **Permission-Script ausführen:**
   - Admin-Rolle sollte `availability_management` Permission haben
   - Andere Rollen sollten keine Permission haben

2. **Backend testen:**
   - Admin kann Verfügbarkeiten für alle User erstellen/bearbeiten/löschen
   - Normaler User kann nur eigene Verfügbarkeiten verwalten
   - Admin kann alle Verfügbarkeiten sehen (ohne userId Filter)

3. **Frontend testen:**
   - Admin sieht User-Dropdown im Filter
   - Admin sieht User-Auswahl im Formular
   - Normaler User sieht keine User-Auswahl
   - User-Name wird in Liste angezeigt (nur für Admin)

---

## 2. Automatische Generierung - Fallback auf alle User

### 📋 Übersicht

**Problem:** User ohne Verfügbarkeiten bekommen keine Schichten  
**Lösung:** Fallback auf alle User mit passender Rolle/Branch

### 🔧 Schritt 1: findAvailableUsers erweitern

**Datei:** `backend/src/controllers/shiftController.ts`

**Änderung: findAvailableUsers erweitern (Zeile 34-118)**

**NEU: Fallback-Parameter hinzufügen**
```typescript
async function findAvailableUsers(params: {
  branchId: number;
  roleId: number;
  date: Date;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  fallbackToAllUsers?: boolean; // NEU: Fallback auf alle User
}): Promise<Array<{ user: any; priority: number }>> {
  const { branchId, roleId, date, dayOfWeek, startTime, endTime, fallbackToAllUsers = true } = params;

  // ... Bestehende Logik für Verfügbarkeiten (Zeile 44-117) bleibt gleich ...

  // NEU: Wenn keine Verfügbarkeiten gefunden und Fallback aktiviert
  if (userMap.size === 0 && fallbackToAllUsers) {
    // Hole alle User mit passender Rolle und Branch
    const usersWithRole = await prisma.user.findMany({
      where: {
        active: true,
        roles: {
          some: {
            roleId: roleId
          }
        },
        branches: {
          some: {
            branchId: branchId
          }
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        contractType: true // Für spätere Verwendung (Punkt 3)
      }
    });

    // Konvertiere zu verfügbaren Usern mit niedriger Priorität
    for (const user of usersWithRole) {
      userMap.set(user.id, {
        user: user,
        priority: 1 // Niedrige Priorität für User ohne Verfügbarkeiten
      });
    }
  }

  return Array.from(userMap.values());
}
```

### 🔧 Schritt 2: generateShiftPlan anpassen

**Datei:** `backend/src/controllers/shiftController.ts`

**Änderung: generateShiftPlan - Zeile 882-889**

**NEU: Fallback-Parameter übergeben**
```typescript
// Zeile 882-889: findAvailableUsers wird aufgerufen
const availableUsers = await findAvailableUsers({
  branchId,
  roleId: role.id,
  date,
  dayOfWeek,
  startTime: template.startTime,
  endTime: template.endTime,
  fallbackToAllUsers: true // NEU: Fallback aktivieren
});
```

**Rest bleibt gleich** - Die Logik funktioniert bereits, wenn `availableUsers` User enthält.

### ✅ Test-Hinweise

1. **Szenario 1: User mit Verfügbarkeiten**
   - Verfügbarkeiten werden gefunden
   - User werden basierend auf Verfügbarkeiten zugewiesen
   - Priorität wird berücksichtigt

2. **Szenario 2: User ohne Verfügbarkeiten**
   - Keine Verfügbarkeiten gefunden
   - Fallback: Alle User mit passender Rolle/Branch werden geladen
   - User werden mit niedriger Priorität (1) zugewiesen

3. **Szenario 3: Gemischt**
   - Einige User haben Verfügbarkeiten, andere nicht
   - User mit Verfügbarkeiten bekommen höhere Priorität
   - User ohne Verfügbarkeiten werden als Fallback verwendet

---

## 3. Schichtverteilung - Vertragstyp berücksichtigen

### 📋 Übersicht

**Problem:** Schichtverteilung basiert nur auf Anzahl, nicht auf Stunden  
**Lösung:** Stunden-basierte Verteilung mit Ziel-Stunden pro Vertragstyp

### 🔧 Schritt 1: Hilfsfunktionen hinzufügen

**Datei:** `backend/src/controllers/shiftController.ts`

**NEU: Nach Zeile 30 (vor findAvailableUsers)**
```typescript
/**
 * Berechnet Ziel-Stunden pro Woche basierend auf Vertragstyp
 */
function getTargetWeeklyHours(contractType: string | null): number {
  if (!contractType) {
    return 45; // Standard: tiempo_completo
  }

  switch (contractType) {
    case 'tiempo_completo':
      return 45; // 9h/Tag × 5 Tage
    case 'tiempo_parcial_7':
      return 10.5; // 1.5h/Tag × 7 Tage
    case 'tiempo_parcial_14':
      return 21; // 1.5h/Tag × 14 Tage
    case 'tiempo_parcial_21':
      return 31.5; // 1.5h/Tag × 21 Tage
    case 'servicios_externos':
      return 0; // Stundenbasiert, kein Ziel
    default:
      return 45; // Standard
  }
}

/**
 * Berechnet Stunden zwischen zwei DateTime-Objekten
 */
function getHoursBetween(start: Date, end: Date): number {
  const diffMs = end.getTime() - start.getTime();
  return diffMs / (1000 * 60 * 60); // Millisekunden zu Stunden
}
```

### 🔧 Schritt 2: userWorkload erweitern

**Datei:** `backend/src/controllers/shiftController.ts`

**Änderung: generateShiftPlan - Zeile 862**

**ALT:**
```typescript
const userWorkload: Map<number, number> = new Map();
```

**NEU:**
```typescript
interface UserWorkload {
  count: number; // Anzahl Schichten
  hours: number; // Stunden
  targetHours: number; // Ziel-Stunden pro Woche
}

const userWorkload: Map<number, UserWorkload> = new Map();
```

### 🔧 Schritt 3: User-Daten mit Vertragstyp laden

**Datei:** `backend/src/controllers/shiftController.ts`

**Änderung: findAvailableUsers - Zeile 81-90**

**NEU: contractType in Select hinzufügen**
```typescript
include: {
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      contractType: true // NEU
    }
  }
}
```

**Änderung: Fallback-User (Zeile nach userMap.size === 0)**
```typescript
// contractType ist bereits in Select enthalten (siehe oben)
```

### 🔧 Schritt 4: userWorkload initialisieren

**Datei:** `backend/src/controllers/shiftController.ts`

**Änderung: generateShiftPlan - Nach Zeile 862**

**NEU: userWorkload initialisieren mit Ziel-Stunden**
```typescript
// Initialisiere userWorkload für alle verfügbaren User
// (wird später in der Schleife aktualisiert)
const allAvailableUsers = await findAvailableUsers({
  branchId,
  roleId: roles[0].id, // Erste Rolle als Beispiel
  date: start,
  dayOfWeek: start.getDay(),
  startTime: '00:00',
  endTime: '23:59',
  fallbackToAllUsers: true
});

// Lade User-Daten mit Vertragstyp
const userIds = [...new Set(allAvailableUsers.map(u => u.user.id))];
const usersWithContract = await prisma.user.findMany({
  where: {
    id: { in: userIds }
  },
  select: {
    id: true,
    contractType: true
  }
});

// Initialisiere userWorkload
for (const user of usersWithContract) {
  userWorkload.set(user.id, {
    count: 0,
    hours: 0,
    targetHours: getTargetWeeklyHours(user.contractType)
  });
}
```

**BESSER: Initialisierung in der Schleife (siehe Schritt 5)**

### 🔧 Schritt 5: Sortierung anpassen

**Datei:** `backend/src/controllers/shiftController.ts`

**Änderung: generateShiftPlan - Zeile 927-941**

**ALT:**
```typescript
// Sortiere nach Priorität und Arbeitslast
const sortedUsers = availableUsers
  .map(av => ({
    user: av.user,
    priority: av.priority,
    workload: userWorkload.get(av.user.id) || 0
  }))
  .sort((a, b) => {
    // Erst nach Priorität (höher = besser)
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    // Dann nach Arbeitslast (niedriger = besser)
    return a.workload - b.workload;
  });
```

**NEU:**
```typescript
// Sortiere nach Priorität und Stunden-Defizit
const sortedUsers = availableUsers
  .map(av => {
    const workload = userWorkload.get(av.user.id) || { count: 0, hours: 0, targetHours: 45 };
    const deficit = workload.targetHours - workload.hours; // Defizit = Ziel - Aktuell
    
    return {
      user: av.user,
      priority: av.priority,
      workload: workload,
      deficit: deficit // NEU: Stunden-Defizit
    };
  })
  .sort((a, b) => {
    // Erst nach Priorität (höher = besser)
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    // Dann nach Stunden-Defizit (größer = besser) - User mit größtem Defizit bekommen Vorrang
    return b.deficit - a.deficit;
  });
```

### 🔧 Schritt 6: userWorkload aktualisieren

**Datei:** `backend/src/controllers/shiftController.ts`

**Änderung: generateShiftPlan - Zeile 967-988**

**ALT:**
```typescript
if (!hasOverlap) {
  // User zuweisen
  shifts.push({
    // ...
  });

  userWorkload.set(
    candidate.user.id,
    (userWorkload.get(candidate.user.id) || 0) + 1
  );

  assigned = true;
  break;
}
```

**NEU:**
```typescript
if (!hasOverlap) {
  // Berechne Schicht-Dauer in Stunden
  const shiftHours = getHoursBetween(startDateTime, endDateTime);
  
  // Hole aktuelles Workload
  const currentWorkload = userWorkload.get(candidate.user.id) || {
    count: 0,
    hours: 0,
    targetHours: getTargetWeeklyHours(candidate.user.contractType)
  };

  // Prüfe, ob User bereits Ziel-Stunden erreicht hat (nur für tiempo_completo und tiempo_parcial)
  if (currentWorkload.targetHours > 0 && currentWorkload.hours >= currentWorkload.targetHours) {
    // User hat bereits Ziel-Stunden erreicht, überspringe
    continue;
  }

  // User zuweisen
  shifts.push({
    // ...
  });

  // Aktualisiere userWorkload
  userWorkload.set(candidate.user.id, {
    count: currentWorkload.count + 1,
    hours: currentWorkload.hours + shiftHours,
    targetHours: currentWorkload.targetHours
  });

  assigned = true;
  break;
}
```

### 🔧 Schritt 7: Initialisierung optimieren

**Datei:** `backend/src/controllers/shiftController.ts`

**Änderung: generateShiftPlan - Vor der Hauptschleife (nach Zeile 861)**

**NEU: userWorkload initialisieren beim ersten Auftreten**
```typescript
// userWorkload wird dynamisch initialisiert, wenn User zum ersten Mal auftaucht
// Keine Vorinitialisierung nötig
```

**Anpassung in der Schleife:**
```typescript
// In der Schleife (Zeile 966): Beim ersten Auftreten initialisieren
if (!userWorkload.has(candidate.user.id)) {
  userWorkload.set(candidate.user.id, {
    count: 0,
    hours: 0,
    targetHours: getTargetWeeklyHours(candidate.user.contractType)
  });
}
```

### ✅ Test-Hinweise

1. **Szenario 1: tiempo_completo (45h/Woche)**
   - User sollte ~45h pro Woche bekommen
   - Nicht mehr als 45h (außer explizit gewünscht)
   - Nicht viel weniger als 45h

2. **Szenario 2: tiempo_parcial_7 (10.5h/Woche)**
   - User sollte ~10.5h pro Woche bekommen
   - Entsprechend weniger Schichten

3. **Szenario 3: servicios_externos (0h Ziel)**
   - Kein Ziel, kann beliebig viele Stunden bekommen
   - Wird nur zugewiesen, wenn keine anderen User verfügbar sind

4. **Szenario 4: Gemischt**
   - User mit größtem Defizit bekommen Vorrang
   - Priorität wird weiterhin berücksichtigt

---

## 4. Kalender-Anzeige - Farben nach Standort/Rolle

### 📋 Übersicht

**Problem:** Alle Schichten haben die gleiche Farbe (nur Status-basiert)  
**Lösung:** Farbcodierung nach Standort (Hintergrund) und Status (Rand)

### 🔧 Schritt 1: Farb-Paletten erstellen

**Datei:** `frontend/src/utils/colorPalette.ts` (NEU ERSTELLEN)

```typescript
/**
 * Farb-Palette für Standorte (Branch)
 * 15 verschiedene Farben für gute Unterscheidung
 */
export const BRANCH_COLORS = [
  '#3b82f6', // Blau
  '#10b981', // Grün
  '#f59e0b', // Orange
  '#ef4444', // Rot
  '#8b5cf6', // Lila
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#84cc16', // Limette
  '#f97316', // Orange-Rot
  '#6366f1', // Indigo
  '#14b8a6', // Türkis
  '#a855f7', // Violett
  '#eab308', // Gelb
  '#22c55e', // Grün-Hell
  '#64748b'  // Grau
];

/**
 * Farb-Palette für Rollen
 * 15 verschiedene Farben (etwas heller als Branch-Farben)
 */
export const ROLE_COLORS = [
  '#60a5fa', // Blau-Hell
  '#34d399', // Grün-Hell
  '#fbbf24', // Orange-Hell
  '#f87171', // Rot-Hell
  '#a78bfa', // Lila-Hell
  '#f472b6', // Pink-Hell
  '#22d3ee', // Cyan-Hell
  '#a3e635', // Limette-Hell
  '#fb923c', // Orange-Rot-Hell
  '#818cf8', // Indigo-Hell
  '#2dd4bf', // Türkis-Hell
  '#c084fc', // Violett-Hell
  '#fde047', // Gelb-Hell
  '#4ade80', // Grün-Hell-2
  '#94a3b8'  // Grau-Hell
];

/**
 * Status-Farben (für Rand)
 */
export const STATUS_COLORS = {
  scheduled: '#3b82f6', // Blau
  confirmed: '#10b981', // Grün
  cancelled: '#ef4444', // Rot
  swapped: '#f59e0b'    // Orange
};

/**
 * Gibt eine Farbe für einen Standort zurück (basierend auf ID)
 */
export function getBranchColor(branchId: number | null | undefined): string {
  if (!branchId) {
    return '#64748b'; // Grau für keine Branch
  }
  return BRANCH_COLORS[branchId % BRANCH_COLORS.length];
}

/**
 * Gibt eine Farbe für eine Rolle zurück (basierend auf ID)
 */
export function getRoleColor(roleId: number | null | undefined): string {
  if (!roleId) {
    return '#94a3b8'; // Grau-Hell für keine Rolle
  }
  return ROLE_COLORS[roleId % ROLE_COLORS.length];
}

/**
 * Gibt eine Farbe für einen Status zurück
 */
export function getStatusColor(status: string): string {
  return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || '#64748b';
}
```

### 🔧 Schritt 2: ShiftPlannerTab anpassen

**Datei:** `frontend/src/components/teamWorktime/ShiftPlannerTab.tsx`

**Änderung 1: Import hinzufügen (Zeile 1-18)**
```typescript
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarIcon, PlusIcon, ArrowPathIcon, ChevronLeftIcon, ChevronRightIcon, Squares2X2Icon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';
import axiosInstance from '../../config/axios.ts';
import { API_ENDPOINTS } from '../../config/api.ts';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, parse } from 'date-fns';
import { useAuth } from '../../hooks/useAuth.tsx';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EventInput } from '@fullcalendar/core';
import CreateShiftModal from './CreateShiftModal.tsx';
import EditShiftModal from './EditShiftModal.tsx';
import GenerateShiftPlanModal from './GenerateShiftPlanModal.tsx';
import SwapRequestList from './SwapRequestList.tsx';
import ShiftTemplateManagement from './ShiftTemplateManagement.tsx';
import AvailabilityManagement from './AvailabilityManagement.tsx';
import { getBranchColor, getStatusColor } from '../../utils/colorPalette.ts'; // NEU
```

**Änderung 2: calendarEvents anpassen (Zeile 238-268)**

**ALT:**
```typescript
const calendarEvents = useMemo<EventInput[]>(() => {
  return shifts.map((shift) => {
    const startDateTime = new Date(shift.startTime);
    const endDateTime = new Date(shift.endTime);
    
    // Bestimme Farbe basierend auf Status
    let backgroundColor = '#3b82f6'; // Blau (scheduled)
    if (shift.status === 'confirmed') {
      backgroundColor = '#10b981'; // Grün
    } else if (shift.status === 'cancelled') {
      backgroundColor = '#ef4444'; // Rot
    } else if (shift.status === 'swapped') {
      backgroundColor = '#f59e0b'; // Orange
    }
    
    return {
      id: shift.id.toString(),
      title: shift.user 
        ? `${shift.shiftTemplate?.name || 'Schicht'} - ${shift.user.firstName} ${shift.user.lastName}`
        : `${shift.shiftTemplate?.name || 'Schicht'} - Nicht zugewiesen`,
      start: startDateTime.toISOString(),
      end: endDateTime.toISOString(),
      backgroundColor,
      borderColor: backgroundColor,
      extendedProps: {
        shift,
      },
    };
  });
}, [shifts]);
```

**NEU:**
```typescript
const calendarEvents = useMemo<EventInput[]>(() => {
  return shifts.map((shift) => {
    const startDateTime = new Date(shift.startTime);
    const endDateTime = new Date(shift.endTime);
    
    // Farben: Hintergrund = Standort, Rand = Status
    const branchColor = getBranchColor(shift.branchId);
    const statusColor = getStatusColor(shift.status);
    
    // Text-Farbe für besseren Kontrast (heller Text auf dunklem Hintergrund)
    const textColor = '#ffffff'; // Weiß für guten Kontrast
    
    return {
      id: shift.id.toString(),
      title: shift.user 
        ? `${shift.shiftTemplate?.name || 'Schicht'} - ${shift.user.firstName} ${shift.user.lastName}`
        : `${shift.shiftTemplate?.name || 'Schicht'} - Nicht zugewiesen`,
      start: startDateTime.toISOString(),
      end: endDateTime.toISOString(),
      backgroundColor: branchColor, // Hauptfarbe = Standort
      borderColor: statusColor, // Rand = Status
      borderWidth: 3, // Dicker Rand für bessere Sichtbarkeit
      textColor: textColor, // Text-Farbe
      extendedProps: {
        shift,
      },
    };
  });
}, [shifts]);
```

### 🔧 Schritt 3: Legende hinzufügen

**Datei:** `frontend/src/components/teamWorktime/ShiftPlannerTab.tsx`

**NEU: Legende-Komponente (vor return Statement, nach calendarEvents)**

```typescript
// Erstelle Legende-Daten
const legendData = useMemo(() => {
  const branchMap = new Map<number, { id: number; name: string; color: string }>();
  const statusMap = new Map<string, { status: string; label: string; color: string }>();

  // Sammle alle eindeutigen Branches und Status
  shifts.forEach(shift => {
    if (shift.branch && !branchMap.has(shift.branch.id)) {
      branchMap.set(shift.branch.id, {
        id: shift.branch.id,
        name: shift.branch.name,
        color: getBranchColor(shift.branch.id)
      });
    }
    
    if (!statusMap.has(shift.status)) {
      const statusLabels: Record<string, string> = {
        scheduled: t('teamWorktime.shifts.status.scheduled'),
        confirmed: t('teamWorktime.shifts.status.confirmed'),
        cancelled: t('teamWorktime.shifts.status.cancelled'),
        swapped: t('teamWorktime.shifts.status.swapped')
      };
      
      statusMap.set(shift.status, {
        status: shift.status,
        label: statusLabels[shift.status] || shift.status,
        color: getStatusColor(shift.status)
      });
    }
  });

  return {
    branches: Array.from(branchMap.values()),
    statuses: Array.from(statusMap.values())
  };
}, [shifts, t]);
```

**NEU: Legende-UI (im return Statement, nach Header, vor Kalender)**

```typescript
{/* Legende */}
{(legendData.branches.length > 0 || legendData.statuses.length > 0) && (
  <div className="mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
    <div className="flex flex-wrap gap-6">
      {/* Standort-Legende */}
      {legendData.branches.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {t('teamWorktime.shifts.legend.branches')}
          </h3>
          <div className="flex flex-wrap gap-2">
            {legendData.branches.map(branch => (
              <div key={branch.id} className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: branch.color }}
                />
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {branch.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status-Legende */}
      {legendData.statuses.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {t('teamWorktime.shifts.legend.statuses')}
          </h3>
          <div className="flex flex-wrap gap-2">
            {legendData.statuses.map(status => (
              <div key={status.status} className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded border-2"
                  style={{ 
                    backgroundColor: 'transparent',
                    borderColor: status.color
                  }}
                />
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {status.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  </div>
)}
```

### 🔧 Schritt 4: Translations hinzufügen

**Dateien:**
- `frontend/src/i18n/locales/de.json`
- `frontend/src/i18n/locales/en.json`
- `frontend/src/i18n/locales/es.json`

**Unter `teamWorktime.shifts` hinzufügen:**
```json
{
  "legend": {
    "branches": "Standorte",
    "statuses": "Status"
  },
  "status": {
    "scheduled": "Geplant",
    "confirmed": "Bestätigt",
    "cancelled": "Abgesagt",
    "swapped": "Getauscht"
  }
}
```

### ✅ Test-Hinweise

1. **Visuelle Prüfung:**
   - Verschiedene Standorte haben verschiedene Hintergrundfarben
   - Verschiedene Status haben verschiedene Randfarben
   - Legende zeigt alle verwendeten Farben

2. **Filter testen:**
   - Filter nach Standort funktioniert weiterhin
   - Filter nach Status funktioniert weiterhin
   - Farben bleiben konsistent

3. **Responsive:**
   - Legende ist auf Mobile lesbar
   - Farben sind auf verschiedenen Bildschirmgrößen erkennbar

---

## 📊 Implementierungsreihenfolge

1. **Berechtigungssystem** (Hoch)
   - Script erstellen und ausführen
   - Backend anpassen
   - Frontend anpassen
   - Testen

2. **Automatische Generierung** (Hoch)
   - findAvailableUsers erweitern
   - generateShiftPlan anpassen
   - Testen

3. **Kalender-Anzeige** (Mittel)
   - Farb-Paletten erstellen
   - ShiftPlannerTab anpassen
   - Legende hinzufügen
   - Testen

4. **Schichtverteilung** (Niedrig)
   - Hilfsfunktionen hinzufügen
   - userWorkload erweitern
   - Sortierung anpassen
   - Testen

---

## 🧪 Gesamt-Test-Plan

### Test 1: Berechtigungssystem
- [ ] Admin kann Verfügbarkeiten für alle User verwalten
- [ ] Normaler User kann nur eigene Verfügbarkeiten verwalten
- [ ] Admin sieht User-Dropdown im Filter
- [ ] Admin sieht User-Auswahl im Formular
- [ ] User-Name wird in Liste angezeigt (nur für Admin)

### Test 2: Automatische Generierung
- [ ] User mit Verfügbarkeiten bekommen Schichten
- [ ] User ohne Verfügbarkeiten bekommen auch Schichten (Fallback)
- [ ] Priorität wird berücksichtigt
- [ ] Überschneidungen werden vermieden

### Test 3: Schichtverteilung
- [ ] tiempo_completo bekommt ~45h/Woche
- [ ] tiempo_parcial_7 bekommt ~10.5h/Woche
- [ ] tiempo_parcial_14 bekommt ~21h/Woche
- [ ] tiempo_parcial_21 bekommt ~31.5h/Woche
- [ ] User mit größtem Defizit bekommen Vorrang

### Test 4: Kalender-Anzeige
- [ ] Verschiedene Standorte haben verschiedene Farben
- [ ] Verschiedene Status haben verschiedene Randfarben
- [ ] Legende zeigt alle verwendeten Farben
- [ ] Filter funktionieren weiterhin

---

## 📝 Notizen

- **Berechtigungssystem:** Permission-Entity `availability_management` wird erstellt
- **Automatische Generierung:** Fallback ist optional (kann deaktiviert werden)
- **Schichtverteilung:** Stunden-basierte Verteilung ist komplex, sollte gründlich getestet werden
- **Kalender-Anzeige:** Farben können in `colorPalette.ts` angepasst werden

---

## 🔄 Nächste Schritte nach Implementierung

1. **Dokumentation aktualisieren:**
   - `SCHICHTPLANER_PHASE_5_DOKUMENTATION.md` aktualisieren (Admin-Funktionalität)
   - `SCHICHTPLANER_WORKFLOW.md` aktualisieren (neue Features)

2. **User-Tests:**
   - Admin testet Verfügbarkeiten-Verwaltung für alle User
   - Schichtplaner testet automatische Generierung
   - Alle User testen Kalender-Anzeige

3. **Optimierungen:**
   - Schichtverteilung weiter optimieren (falls nötig)
   - Farb-Paletten anpassen (falls nötig)
   - Performance-Optimierungen (falls nötig)


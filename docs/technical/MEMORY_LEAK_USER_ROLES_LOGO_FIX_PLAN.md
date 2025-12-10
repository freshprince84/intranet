# Memory Leak Fix: User Roles & Logo - Korrekturplan

**Datum:** 2025-01-31  
**Status:** 🔴 KRITISCH - SOFORT BEHEBEN  
**Priorität:** 🔴🔴🔴 HÖCHSTE PRIORITÄT  
**Problem:** 600MB+ RAM durch unnötiges Laden aller Roles + Logos

---

## 📊 BEWEISE: Identifizierte Probleme

### Problem 1: Zwei Methoden zum User laden (Standard nicht eingehalten)

**Beweis 1.1: `getUserById` in userController.ts**
```182:197:backend/src/controllers/userController.ts
                roles: {
                    include: {
                        role: {
                            include: {
                                permissions: true,
                                organization: {
                                    select: {
                                        id: true,
                                        name: true,
                                        displayName: true,
                                        logo: true
                                    }
                                }
                            }
                        }
                    }
                },
```

**Beweis 1.2: `getCurrentUser` in authController.ts**
```414:432:backend/src/controllers/authController.ts
                include: {
                    roles: {
                        include: {
                            role: {
                                include: {
                                    permissions: true,
                                    organization: {
                                        select: {
                                            id: true,
                                            name: true,
                                            displayName: true,
                                            logo: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
```

**Beweis 1.3: Kommentar sagt "STANDARD: Eine Methode für alles"**
```162:162:backend/src/controllers/userController.ts
// ✅ STANDARD: Eine Methode für alle User-Abfragen (Profile und UserManagement)
```

**Beweis 1.4: Route leitet auf getUserById um**
```55:59:backend/src/routes/users.ts
// ✅ STANDARD: /users/profile leitet auf getUserById um (eine Methode für alles)
router.get('/profile', (req: AuthenticatedRequest, res: Response) => {
    req.params.id = req.userId;
    return getUserById(req as any, res);
});
```

**Beweis 1.5: Aber es gibt auch `/auth/user` Route**
```10:10:backend/src/routes/auth.ts
router.get('/user', authMiddleware, getCurrentUser);
```

**Beweis 1.6: Frontend verwendet nur `/users/profile`**
```76:76:frontend/src/hooks/useAuth.tsx
            const response = await axiosInstance.get('/users/profile', {
```

**Fazit:** `getCurrentUser` wird NICHT verwendet, sollte entfernt werden.

---

### Problem 2: ALLE Roles werden geladen, obwohl nur aktive benötigt wird

**Beweis 2.1: getUserById lädt ALLE Roles**
```182:197:backend/src/controllers/userController.ts
                roles: {
                    include: {
                        role: {
                            include: {
                                permissions: true,
                                organization: {
                                    select: {
                                        id: true,
                                        name: true,
                                        displayName: true,
                                        logo: true
                                    }
                                }
                            }
                        }
                    }
                },
```

**Beweis 2.2: Frontend verwendet nur aktive Rolle**
```125:125:frontend/src/hooks/usePermissions.ts
            const activeRole = user.roles.find(userRole => userRole.lastUsed);
```

**Beweis 2.3: organizationCache lädt NUR aktive Rolle (KORREKT!)**
```31:35:backend/src/utils/organizationCache.ts
      const userRole = await prisma.userRole.findFirst({
        where: { 
          userId: Number(userId),
          lastUsed: true 
        },
```

**Fazit:** `getUserById` sollte NUR die aktive Rolle laden (wie `organizationCache`).

---

### Problem 3: Logo wird für ALLE Roles geladen

**Beweis 3.1: Logo wird für jede Role geladen**
```187:193:backend/src/controllers/userController.ts
                                organization: {
                                    select: {
                                        id: true,
                                        name: true,
                                        displayName: true,
                                        logo: true
                                    }
                                }
```

**Beweis 3.2: User hat mehrere Roles, aber nur 1 aktive**
- Wenn User 5 Roles hat = 5 Logos geladen
- Jedes Logo = 1-5 MB (base64)
- = 5-25 MB nur für Logos pro User

**Beweis 3.3: organizationCache lädt Logo NUR für aktive Rolle**
```39:47:backend/src/utils/organizationCache.ts
              organization: {
                // ✅ PERFORMANCE: Settings NICHT laden (19.8 MB!)
                // Settings werden nur geladen wenn explizit angefragt (in getCurrentOrganization)
                select: {
                  id: true,
                  name: true,
                  displayName: true,
                  domain: true,
                  logo: true,
```

**Fazit:** Logo sollte NUR für aktive Rolle geladen werden.

---

### Problem 4: ❌ ENTFERNT - Tasks haben nichts mit Logo zu tun

**KORREKTUR:** Tasks laden User nur minimal (id, firstName, lastName) - **KEINE Roles, KEINE Organization, KEIN Logo!**

**Beweis:**
```165:167:backend/src/controllers/taskController.ts
                responsible: {
                    select: userSelect  // Nur id, firstName, lastName
                },
```

**Fazit:** Tasks haben **NICHTS** mit dem Logo-Problem zu tun. Das Problem liegt **NUR** beim Laden des aktuellen Users (`/users/profile`).

---

### Problem 5: ❌ ENTFERNT - Tasks haben nichts mit Logo zu tun

**KORREKTUR:** Tasks laden `role` nur mit `id, name` - **KEINE Organization, KEIN Logo!**

**Fazit:** Tasks haben **NICHTS** mit dem Logo-Problem zu tun. Das Problem liegt **NUR** beim Laden des aktuellen Users (`/users/profile`).

---

## ✅ KORREKTURPLAN

### ⚠️ WICHTIG: Code-Analyse zeigt - ALLE Roles werden benötigt!

**Gefundene Stellen, die ALLE Roles benötigen:**
1. **Header.tsx Role-Switching** (Zeile 214, 225) - User muss zwischen Roles wechseln
2. **OnboardingContext.tsx** (Zeile 91, 126) - Prüft inaktive Roles und alle Roles auf Organisation
3. **ProtectedRoute.tsx** (Zeile 46) - Prüft ob User Mitglied einer Organisation ist
4. **UserManagementTab.tsx** (Zeile 265) - Zeigt alle Roles eines Users an

**Stellen, die NUR aktive Role benötigen:**
1. **Header.tsx Logo** (Zeile 146) - Logo wird nur von aktiver Role verwendet
2. **usePermissions.ts** (Zeile 125) - Permissions werden nur von aktiver Role verwendet

**Fazit:** Roles müssen geladen werden, ABER Logo wird nur für aktive Role benötigt!

---

### Phase 1: getCurrentUser entfernen (Standard durchsetzen)

**Datei:** `backend/src/controllers/authController.ts`

**Status:** ✅ **BEREITS ENTFERNT** - Funktion wurde entfernt, Route `/auth/user` wurde entfernt

**Begründung:**
- Frontend verwendet nur `/users/profile`
- Standard sagt "eine Methode für alles"
- `getCurrentUser` wird nicht verwendet

---

### Phase 2: Logo nur für aktive Role laden (NEUE LÖSUNG)

**Problem:** Alle Roles werden geladen mit Logo, aber Logo wird nur für aktive Role benötigt.

**Lösung:** Logo in Response auf `null` setzen für inaktive Roles.

**Datei:** `backend/src/controllers/userController.ts`

**Aktueller Code (Zeile 242-256):**
```typescript
const userWithLogo = {
    ...user,
    roles: user.roles.map(roleEntry => ({
        ...roleEntry,
        role: {
            ...roleEntry.role,
            organization: roleEntry.role.organization ? {
                ...roleEntry.role.organization,
                logo: roleEntry.role.organization.logo === 'null' || roleEntry.role.organization.logo === null || roleEntry.role.organization.logo === '' ? null : roleEntry.role.organization.logo
            } : null
        }
    }))
};
```

**Neuer Code:**
```typescript
const userWithLogo = {
    ...user,
    roles: user.roles.map(roleEntry => ({
        ...roleEntry,
        role: {
            ...roleEntry.role,
            organization: roleEntry.role.organization ? {
                ...roleEntry.role.organization,
                // ✅ MEMORY FIX: Logo nur für aktive Role behalten, für inaktive auf null setzen
                logo: roleEntry.lastUsed 
                    ? (roleEntry.role.organization.logo === 'null' || roleEntry.role.organization.logo === null || roleEntry.role.organization.logo === '' ? null : roleEntry.role.organization.logo)
                    : null  // ✅ Inaktive Roles: Logo = null (spart Memory)
            } : null
        }
    }))
};
```

**Gleiche Änderung für Zeile 223-237 (wenn authenticatedUserId === userId):**

**Begründung:**
- Alle Roles werden weiterhin geladen (für Role-Switching, Onboarding, etc.)
- ABER: Logo wird nur für aktive Role in Response gesetzt
- Inaktive Roles haben `logo: null` → spart Memory (keine Base64-Strings für inaktive Roles)
- Frontend verwendet Logo nur von aktiver Role (Header.tsx:146)

---

### Phase 3: Frontend prüfen - Logo-Verwendung

**Status:** ✅ **GEPRÜFT**

**Header.tsx (Zeile 146):**
- Verwendet nur aktive Role: `user?.roles.find(r => r.role && r.lastUsed === true)`
- Logo wird nur von aktiver Role verwendet
- **Keine Änderung nötig** - funktioniert mit neuer Backend-Lösung

**Andere Stellen:**
- Verwenden Roles für andere Zwecke (Role-Switching, Onboarding, etc.)
- Verwenden Logo NICHT
- **Keine Änderung nötig**

---

### Phase 4: ❌ ENTFERNT - Tasks haben nichts mit Logo zu tun

**Status:** ✅ **KORREKT** - Tasks/Requests laden User nur mit `id, firstName, lastName` - **KEINE Roles, KEINE Logos**

**Keine Änderung nötig** - Tasks sind nicht relevant für das Logo-Problem.

---

## 📊 ERWARTETE VERBESSERUNG

### Vorher:
- **User mit 5 Roles:** 5 Logos geladen (alle in Response) = 5-25 MB
- **Gesamt:** 5-25 MB pro User (alle Logos im Memory)

### Nachher:
- **User mit 5 Roles:** 1 Logo geladen (nur aktive in Response) = 1-5 MB
- **Inaktive Roles:** Logo = null (kein Base64-String im Memory)
- **Gesamt:** 1-5 MB pro User

**Reduktion:** ~80% weniger RAM für Logos beim Laden des aktuellen Users

**WICHTIG:** 
- Tasks haben **NICHTS** damit zu tun - laden User nur minimal ohne Roles/Logos!
- **Alle Roles werden weiterhin geladen** (für Role-Switching, Onboarding, etc.)
- **NUR Logo wird optimiert** (nur für aktive Role in Response)

---

## 🎯 IMPLEMENTIERUNGSREIHENFOLGE

### Priorität 1: Sofort beheben (kritisch)
1. ✅ **getCurrentUser entfernen** (BEREITS ENTFERNT)
2. ⏳ **Logo nur für aktive Role in Response setzen** (Phase 2)

### Priorität 2: Validierung
3. ⏳ **Memory Profiling nach Fix** - prüfen ob Verbesserung erreicht wurde
4. ⏳ **Funktionalität testen** - Role-Switching, Onboarding, ProtectedRoute müssen weiterhin funktionieren

---

## ✅ VALIDIERUNG

### Test 1: Memory Profiling
1. **Vor Fix:** Heap Snapshot aufnehmen
2. **Nach Fix:** Heap Snapshot aufnehmen
3. **Vergleich:** Logo-Strings sollten deutlich weniger sein

### Test 2: Funktionalität
1. **Dashboard öffnen** → User wird geladen
2. **Worktracker öffnen** → Tasks werden geladen
3. **Zurück zu Dashboard** → Memory sollte nicht wachsen

### Test 3: User-Management
1. **User-Management öffnen** → Alle User werden geladen
2. **Prüfen:** Werden alle Roles benötigt? (dann `includeAllRoles=true`)

---

**Erstellt:** 2025-01-31  
**Status:** 📋 KORREKTURPLAN  
**Nächster Schritt:** Implementierung nach Bestätigung


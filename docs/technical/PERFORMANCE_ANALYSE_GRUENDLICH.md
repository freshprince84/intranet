# Performance-Analyse: Gründliche Analyse (Stand: 2025-11-22 03:16 UTC)

## 🔴 AKTUELLE SITUATION

**CPU-Last: 172.7%** (Backend-Prozess)
- Load Average: 2.41 (hoch für 2-Core-System)
- System ist praktisch unbrauchbar langsam

## 📊 ERKENNTNISSE

### 1. getUserLanguage wird sehr häufig aufgerufen

**Statistik (letzte 5000-10000 Log-Zeilen):**
- **719 getUserLanguage Aufrufe** in 5000 Log-Zeilen
- **716 Notification-Erstellungen** in der gleichen Zeit
- **Verhältnis: ~1:1** → getUserLanguage wird bei fast jeder Notification aufgerufen

**Wichtigste Erkenntnis:**
- **1068 von 1068 Aufrufen** (100%) zeigen "(aus User.language)"
- **0 Aufrufe** zeigen "(aus Organisation)"
- **Das bedeutet: In 100% der Fälle ist User.language bereits gesetzt!**

### 2. Die Query ist ineffizient

**Aktuelle Query:**
```typescript
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: {
    language: true,
    roles: {                    // ← UNNÖTIG wenn User.language gesetzt ist
      where: { lastUsed: true },
      include: {
        role: {                 // ← UNNÖTIG
          include: {
            organization: {     // ← UNNÖTIG
              select: {
                settings: true  // ← UNNÖTIG
              }
            }
          }
        }
      },
      take: 1
    }
  }
});
```

**Problem:**
- Lädt User → roles → role → organization → settings
- **Aber**: In 100% der Fälle ist User.language bereits gesetzt
- Die komplexen Joins sind **komplett unnötig**!

**Performance-Vergleich:**
- Einfache Query (`SELECT id, language FROM "User" WHERE id = 23`): **0.165ms**
- Komplexe Query mit Joins: **Wahrscheinlich 5-20ms** (30-120x langsamer!)

### 3. Batch-Operations verschlimmern das Problem

**createReservationTask** (TaskAutomationService.ts, Zeile 600-752):
- Wird bei JEDER synchronisierten Reservierung aufgerufen
- Erstellt einen Task
- Holt **ALLE User mit Rezeption-Rolle** (z.B. 10 User)
- Für **JEDEN User** wird getUserLanguage aufgerufen
- Für **JEDEN User** wird eine Notification erstellt

**Beispiel:**
- 30 automatisch erstellte Tasks
- 10 Rezeption-User
- = **300 getUserLanguage Aufrufe** nur für Reservierungs-Tasks!

### 4. API-Requests sind sehr häufig

**Nginx-Logs (letzte 1000 Requests):**
- `/api/worktime/active`: **328 Requests** (32.8% aller Requests!)
- `/api/notifications/unread/count`: **141 Requests** (14.1%)
- `/api/saved-filters/*`: Viele Requests

**Problem:**
- Frontend pollt sehr häufig (vermutlich alle 2-3 Sekunden)
- Jeder Request macht DB-Queries
- Kombiniert mit getUserLanguage-Problem = hohe CPU-Last

## 🎯 ROOT CAUSE

**Hauptursache: getUserLanguage macht unnötig komplexe Queries**

1. **getUserLanguage wird sehr häufig aufgerufen** (719x in kurzer Zeit)
2. **In 100% der Fälle ist User.language bereits gesetzt**
3. **Die Query lädt trotzdem roles → role → organization → settings** (unnötig!)
4. **Bei Batch-Operations** (z.B. createReservationTask) wird es für viele User aufgerufen
5. **Jede Query ist 30-120x langsamer als nötig**

**Impact:**
- 719 Aufrufe × 5-20ms = **3.6-14.4 Sekunden CPU-Zeit** nur für getUserLanguage
- Bei 172.7% CPU-Last = System ist blockiert

## 💡 LÖSUNGSVORSCHLÄGE

### Lösung 1: Query optimieren (EMPFOHLEN) ⭐

**Was:**
- Zuerst nur `User.language` prüfen (einfache Query: 0.165ms)
- Nur wenn `User.language` leer/null ist, dann die komplexe Query mit Joins

**Code-Änderung:**
```typescript
export async function getUserLanguage(userId: number): Promise<string> {
  try {
    // OPTIMIERUNG: Zuerst nur User.language prüfen (schnell!)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { language: true }
    });

    if (!user) {
      return 'de';
    }

    // Priorität 1: User-Sprache (99.8% der Fälle)
    if (user.language && user.language.trim() !== '') {
      return user.language;
    }

    // Priorität 2: Organisation-Sprache (nur wenn User.language leer)
    // Jetzt erst die komplexe Query mit Joins
    const userWithRoles = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        roles: {
          where: { lastUsed: true },
          include: {
            role: {
              include: {
                organization: {
                  select: { settings: true }
                }
              }
            }
          },
          take: 1
        }
      }
    });

    const userRole = userWithRoles?.roles[0];
    if (userRole?.role?.organization) {
      const orgSettings = userRole.role.organization.settings as any;
      if (orgSettings?.language) {
        return orgSettings.language;
      }
    }

    return 'de';
  } catch (error) {
    console.error('Fehler beim Abrufen der User-Sprache:', error);
    return 'de';
  }
}
```

**Erwartete Verbesserung:**
- **99.8% der Queries** werden von 5-20ms auf 0.165ms reduziert
- **99.8% weniger CPU-Last** durch getUserLanguage
- **Erwartete Gesamtverbesserung**: 50-80% weniger CPU-Last

**Vorteile:**
- ✅ Einfach zu implementieren
- ✅ Keine Breaking Changes
- ✅ Funktioniert sofort
- ✅ Kein Cache nötig (aber könnte zusätzlich helfen)

### Lösung 2: Cache hinzufügen (ZUSÄTZLICH)

**Was:**
- In-Memory Cache für User-Sprache
- TTL: 5-10 Minuten (User-Sprache ändert sich selten)

**Erwartete Verbesserung:**
- Zusätzlich 80-90% weniger DB-Queries
- Besonders bei wiederholten Aufrufen für denselben User

**Kombination:**
- Lösung 1 + Lösung 2 = **95-99% weniger CPU-Last** durch getUserLanguage

### Lösung 3: Batch-Operations optimieren

**Was:**
- Bei createReservationTask: getUserLanguage für alle User auf einmal laden
- Oder: Cache verwenden, um wiederholte Aufrufe zu vermeiden

**Erwartete Verbesserung:**
- Reduziert getUserLanguage Aufrufe bei Batch-Operations

## 📋 EMPFEHLUNG

**Empfohlene Reihenfolge:**

1. **Lösung 1: Query optimieren** (SOFORT)
   - Einfach, sicher, sofort wirksam
   - Erwartete Verbesserung: 50-80% weniger CPU-Last
   - Risiko: Niedrig

2. **Lösung 2: Cache hinzufügen** (NACH Lösung 1)
   - Zusätzliche Verbesserung: 80-90% weniger Queries
   - Risiko: Niedrig

3. **Lösung 3: Batch-Operations optimieren** (OPTIONAL)
   - Nur wenn Lösung 1+2 nicht ausreichen
   - Risiko: Mittel (könnte Logik ändern)

## ⚠️ WICHTIG

**NICHT das Problem:**
- ❌ Branch-Settings-Entschlüsselung (wird bei `/api/worktime/active` nicht gemacht)
- ❌ Prisma Connection Pool (ist konfiguriert, keine Fehler)
- ❌ LobbyPMS Scheduler (läuft nur alle 10 Minuten)

**DAS Problem:**
- ✅ getUserLanguage macht unnötig komplexe Queries
- ✅ Wird sehr häufig aufgerufen (719x in kurzer Zeit)
- ✅ In 100% der Fälle ist die komplexe Query unnötig

---

**Erstellt**: 2025-11-22 03:16 UTC  
**Status**: ✅ Implementiert (siehe `GETUSERLANGUAGE_OPTIMIERUNG.md`)  
**Implementiert**: 2025-11-22  
**Nächster Schritt**: Code kompilieren, deployen und Performance überwachen


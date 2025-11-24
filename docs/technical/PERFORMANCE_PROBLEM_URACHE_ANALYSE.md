# Performance-Problem: Ursache-Analyse (Stand: 2025-11-22 05:15 UTC)

## 🔴 IDENTIFIZIERTE URSACHE

**Commit:** `af104a8` - "Performance: Optimiere /api/organizations/current und Prisma reconnect-Logik"  
**Datum:** 2025-11-21 23:26:39 (vor ~1 Tag)

## 📊 ÄNDERUNGEN IN `af104a8`

### 1. `backend/src/utils/prisma.ts` - Prisma Client Änderung

**Vorher:**
```typescript
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
```

**Nachher:**
```typescript
const createPrismaClient = () => {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  // ✅ Reconnect-Logik: Bei DB-Verbindungsfehlern reconnect versuchen
  const originalQuery = (client as any).$connect;
  
  // Prisma reconnect bei geschlossenen Verbindungen
  client.$connect().catch((error) => {
    console.error('[Prisma] Initial connection error:', error);
  });

  return client;
};

export const prisma =
  globalForPrisma.prisma ??
  createPrismaClient();
```

**Problem:**
- `client.$connect()` wird **asynchron** aufgerufen mit `.catch()`
- Die Prisma-Instanz wird erstellt, aber die Verbindung wird möglicherweise **nicht vollständig hergestellt**, bevor sie verwendet wird
- **`originalQuery` wird definiert, aber nie verwendet** (Code-Smell, aber nicht kritisch)

### 2. `backend/src/controllers/organizationController.ts` - Query-Struktur geändert

**Vorher:**
```typescript
include: {
  role: {
    include: {
      organization: true  // Lädt ALLE Felder inklusive settings
    }
  }
}
```

**Nachher:**
```typescript
include: {
  role: {
    include: {
      organization: {
        // ✅ PERFORMANCE: Settings nur laden wenn explizit angefragt
        select: includeSettings ? undefined : {
          id: true,
          name: true,
          displayName: true,
          // ... nur bestimmte Felder, KEIN settings
        }
      }
    }
  }
}
```

**Problem:**
- Wenn `includeSettings` **true** ist, wird `undefined` verwendet → Prisma interpretiert das als "lade alle Felder" (wie vorher)
- Wenn `includeSettings` **false** ist, wird `select` verwendet → nur bestimmte Felder werden geladen
- **Query-Struktur wurde geändert**: Von `include: { organization: true }` zu `include: { organization: { select: ... } }`
- Diese Änderung der Query-Struktur könnte **Performance-Probleme verursachen**, besonders wenn Prisma die Query anders optimiert

## 🎯 ROOT CAUSE

**Hauptursache:** Die Änderung der Prisma-Query-Struktur in `getCurrentOrganization` könnte dazu führen, dass Prisma die Query **anders optimiert** oder **langsamer ausführt**.

**Mögliche Probleme:**
1. **Query-Optimierung:** Prisma optimiert `include: { organization: true }` anders als `include: { organization: { select: ... } }`
2. **Query-Plan:** Der Datenbank-Query-Plan könnte sich geändert haben, was zu langsameren Queries führt
3. **Prisma Client Initialisierung:** Die asynchrone `$connect()` Aufruf könnte zu Timing-Problemen führen

## 💡 LÖSUNGSVORSCHLAG

### Lösung 1: Query-Struktur korrigieren (PRIORITÄT 1) ⭐

**Problem:** Wenn `includeSettings` true ist, wird `undefined` verwendet, was zu `include: { organization: true }` führt.

**Lösung:** Explizit `include` verwenden, wenn Settings geladen werden sollen:

```typescript
include: {
  role: {
    include: {
      organization: includeSettings 
        ? true  // Explizit alle Felder laden
        : {
            select: {
              id: true,
              name: true,
              displayName: true,
              // ... nur bestimmte Felder
            }
          }
    }
  }
}
```

### Lösung 2: Prisma Client Initialisierung korrigieren (PRIORITÄT 2)

**Problem:** `client.$connect()` wird asynchron aufgerufen, aber die Prisma-Instanz wird sofort zurückgegeben.

**Lösung:** Entweder:
- `$connect()` entfernen (Prisma verbindet sich lazy beim ersten Query)
- Oder: `await client.$connect()` verwenden (aber das könnte zu Blocking führen)

**Empfehlung:** `$connect()` entfernen, da Prisma lazy connections verwendet.

## 📋 EMPFEHLUNG

**Sofortige Maßnahme:**
1. **Query-Struktur korrigieren** - Explizit `include` oder `select` verwenden, nicht `undefined`
2. **Prisma Client Initialisierung vereinfachen** - `$connect()` entfernen (Prisma verbindet sich lazy)

**Erwartete Verbesserung:**
- Query-Performance sollte wieder auf vorheriges Niveau zurückkehren
- Weniger Timing-Probleme bei Prisma Client Initialisierung

---

**Erstellt**: 2025-11-22 05:15 UTC  
**Status**: 🔴 Ursache identifiziert  
**Nächster Schritt**: Lösungen implementieren




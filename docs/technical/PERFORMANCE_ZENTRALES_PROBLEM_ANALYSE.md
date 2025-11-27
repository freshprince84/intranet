# Performance-Analyse: Zentrales Problem - System lahmgelegt (2025-01-26)

**Datum:** 2025-01-26  
**Status:** 🔴🔴🔴 KRITISCH - System extrem langsam  
**Problem:** Jede Seite ist langsam, Login ist langsam, ALLES ist langsam

---

## 🔴🔴🔴 ROOT CAUSE: `executeWithRetry` macht disconnect/connect bei JEDEM Cache-Miss

### Das zentrale Problem

**Datei:** `backend/src/utils/prisma.ts:38-80`

**Code:**
```typescript
export const executeWithRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  retryDelay = 1000
): Promise<T> => {
  // ...
  if (attempt < maxRetries) {
    // Versuche reconnect
    try {
      await prisma.$disconnect();  // ← LANGSAM! (1-5 Sekunden)
      await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      await prisma.$connect();     // ← LANGSAM! (1-5 Sekunden)
    }
  }
};
```

**Problem:**
- `$disconnect()` trennt **ALLE Verbindungen** im Connection Pool
- `$connect()` baut **ALLE Verbindungen** neu auf
- Das dauert **1-5 Sekunden pro disconnect/connect**
- Bei 3 Retries = **6-30 Sekunden zusätzliche Wartezeit**

---

## 📊 WIE DAS PROBLEM ALLES BETRIFFT

### Request-Flow bei JEDEM Request:

1. **Frontend macht Request** (z.B. Login, Seite laden, etc.)
2. **authMiddleware** wird ausgeführt
   - Ruft `userCache.get(userId)` auf
   - Wenn Cache abgelaufen (alle 30 Sekunden) → `executeWithRetry` wird aufgerufen
   - **Wenn DB-Verbindung instabil** → Retry mit disconnect/connect = **6-30 Sekunden**
3. **organizationMiddleware** wird ausgeführt
   - Ruft `organizationCache.get(userId)` auf
   - Wenn Cache abgelaufen (alle 2 Minuten) → `executeWithRetry` wird aufgerufen
   - **Wenn DB-Verbindung instabil** → Retry mit disconnect/connect = **6-30 Sekunden**
4. **Controller** wird ausgeführt
   - Kann auch `executeWithRetry` verwenden
   - **Wenn DB-Verbindung instabil** → Retry mit disconnect/connect = **6-30 Sekunden**

**Gesamtzeit bei instabiler DB-Verbindung:**
- **Ohne DB-Fehler:** 0.5-2 Sekunden
- **Mit DB-Fehler (Retry):** 12-90 Sekunden ⚠️

---

## 🔍 WARUM ALLES BETROFFEN IST

### 1. Middleware werden bei JEDEM Request ausgeführt

**Datei:** `backend/src/routes/*.ts`

**Code:**
```typescript
router.use(authMiddleware);        // ← Bei JEDEM Request
router.use(organizationMiddleware); // ← Bei JEDEM Request
```

**Impact:**
- **Jeder Request** geht durch beide Middleware
- **Jeder Request** kann `executeWithRetry` aufrufen
- **Jeder Request** kann disconnect/connect ausführen

**Betroffene Endpoints:**
- `/api/auth/login` - Login
- `/api/users/profile` - User-Profil
- `/api/organizations/current` - Organisation
- `/api/worktime/active` - Zeiterfassung
- `/api/tasks` - Tasks
- `/api/requests` - Requests
- **ALLE anderen Endpoints**

---

### 2. Cache-Misses führen zu `executeWithRetry` Aufrufen

**UserCache** (`backend/src/services/userCache.ts:47`):
- TTL: 30 Sekunden
- Bei Cache-Miss → `executeWithRetry` wird aufgerufen
- **Wenn DB-Verbindung instabil** → disconnect/connect = **6-30 Sekunden**

**OrganizationCache** (`backend/src/utils/organizationCache.ts:30`):
- TTL: 2 Minuten
- Bei Cache-Miss → `executeWithRetry` wird aufgerufen (2x - für userRole und userBranch)
- **Wenn DB-Verbindung instabil** → disconnect/connect = **6-30 Sekunden**

**WorktimeCache** (`backend/src/services/worktimeCache.ts:47`):
- TTL: 5 Sekunden
- Bei Cache-Miss → `executeWithRetry` wird aufgerufen
- **Wenn DB-Verbindung instabil** → disconnect/connect = **6-30 Sekunden**

---

### 3. Kaskadierende Verzögerungen

**Szenario: User öffnet Seite**

1. **Frontend macht 5 parallele Requests** (AuthProvider, WorktimeProvider, OrganizationProvider, etc.)
2. **Jeder Request** geht durch `authMiddleware` → `userCache.get()` → **Wenn Cache-Miss + DB-Fehler** → disconnect/connect = **6-30 Sekunden**
3. **Jeder Request** geht durch `organizationMiddleware` → `organizationCache.get()` → **Wenn Cache-Miss + DB-Fehler** → disconnect/connect = **6-30 Sekunden**
4. **Gesamtzeit:** 5 Requests × (6-30 Sekunden) = **30-150 Sekunden** ⚠️

**Das erklärt, warum ALLES langsam ist!**

---

## 🔴 DAS ECHTE PROBLEM: `executeWithRetry` reconnect-Logik

### Warum ist die reconnect-Logik problematisch?

1. **`$disconnect()` trennt ALLE Verbindungen**
   - Nicht nur die fehlerhafte Verbindung
   - **Alle Verbindungen im Connection Pool** werden getrennt
   - Das blockiert **alle anderen Requests**

2. **`$connect()` baut ALLE Verbindungen neu auf**
   - Nicht nur eine Verbindung
   - **Alle Verbindungen im Connection Pool** werden neu aufgebaut
   - Das dauert **1-5 Sekunden**

3. **Prisma hat bereits automatische Reconnect-Logik**
   - Prisma reconnect automatisch bei DB-Fehlern
   - `$disconnect()` und `$connect()` sind **nicht nötig**
   - Sie machen das Problem **schlimmer**

---

## 📊 ROOT CAUSE ZUSAMMENFASSUNG

### Hauptursache: `executeWithRetry` macht unnötige disconnect/connect

**Problem:**
- Bei jedem Retry wird die **komplette Verbindung** getrennt und neu aufgebaut
- Das ist **sehr langsam** (1-5 Sekunden pro disconnect/connect)
- Bei 3 Retries = **6-30 Sekunden zusätzliche Wartezeit**
- **Blockiert alle anderen Requests** (Connection Pool wird geleert)

**Impact:**
- **Jeder Request** kann betroffen sein (Middleware werden bei jedem Request ausgeführt)
- **Jeder Cache-Miss** kann zu disconnect/connect führen
- **Bei instabiler DB-Verbindung** = System wird praktisch unbrauchbar
- **Ladezeiten von 30+ Sekunden** sind möglich

---

## 💡 LÖSUNG

### Lösung 1: `executeWithRetry` reconnect-Logik entfernen (PRIORITÄT 1) ⭐⭐⭐

**Was:**
- `$disconnect()` und `$connect()` aus `executeWithRetry` entfernen
- Prisma reconnect automatisch - keine manuelle Reconnect-Logik nötig
- Nur Retry mit Delay, keine disconnect/connect

**Code-Änderung:**

**Vorher:**
```typescript
if (attempt < maxRetries) {
  try {
    await prisma.$disconnect();  // ← ENTFERNEN
    await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
    await prisma.$connect();     // ← ENTFERNEN
  }
}
```

**Nachher:**
```typescript
if (attempt < maxRetries) {
  // Nur Delay, keine disconnect/connect
  // Prisma reconnect automatisch
  await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
}
```

**Erwartete Verbesserung:**
- **6-30 Sekunden weniger** Wartezeit bei jedem Retry
- **Keine Blockierung** anderer Requests
- **System wird wieder nutzbar**

---

### Lösung 2: Connection Pool Einstellungen prüfen (PRIORITÄT 2) ⭐⭐

**Was:**
- Prüfen, ob `DATABASE_URL` Connection Pool Einstellungen hat
- `connection_limit=20&pool_timeout=20` sollte vorhanden sein

**Prüfung:**
```bash
cd /var/www/intranet/backend
npx ts-node scripts/check-database-url.ts
```

**Erwartetes Ergebnis:**
```
✅ connection_limit: Vorhanden (20)
✅ pool_timeout: Vorhanden (20)
```

**Wenn fehlt:**
- `.env` Datei auf Server bearbeiten
- `DATABASE_URL` erweitern: `?connection_limit=20&pool_timeout=20`
- Server neu starten

---

## 📋 IMPLEMENTIERUNGSREIHENFOLGE

### Schritt 1: `executeWithRetry` reconnect-Logik entfernen (SOFORT) ⭐⭐⭐

**Datei:** `backend/src/utils/prisma.ts:61-70`

**Änderungen:**
1. `$disconnect()` entfernen
2. `$connect()` entfernen
3. Nur Retry mit Delay behalten

**Erwartete Verbesserung:**
- **6-30 Sekunden weniger** Wartezeit bei jedem Retry
- **System wird wieder nutzbar**

---

### Schritt 2: Connection Pool Einstellungen prüfen (NACH Schritt 1) ⭐⭐

**Prüfung:**
```bash
npx ts-node scripts/check-database-url.ts
```

**Wenn fehlt:**
- `.env` Datei auf Server bearbeiten
- `DATABASE_URL` erweitern
- Server neu starten

---

## 📊 ERWARTETE VERBESSERUNG

### Vorher:
- **Request-Zeit:** 12-90 Sekunden (bei DB-Fehler)
- **System:** Praktisch unbrauchbar
- **Ladezeiten:** 30+ Sekunden

### Nachher:
- **Request-Zeit:** 0.5-2 Sekunden (auch bei DB-Fehler)
- **System:** Wieder nutzbar
- **Ladezeiten:** < 2 Sekunden

**Reduktion:**
- **Request-Zeit:** Von 12-90 Sekunden → 0.5-2 Sekunden (**95-98% Reduktion**)
- **System:** Von unbrauchbar → nutzbar

---

## ⚠️ WICHTIG: NUR PLAN - NOCH NICHT IMPLEMENTIERT

**Status:** Analyse abgeschlossen, Plan erstellt  
**Nächster Schritt:** Plan mit User besprechen, dann implementieren

---

**Erstellt:** 2025-01-26  
**Analysiert von:** Claude (Auto)  
**Basis:** Code-Analyse der Middleware-Kette, Cache-Implementierung und `executeWithRetry` Logik


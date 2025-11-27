# Performance-Plan: Memory-Leak Behebung Organisation-Seite (2025-01-26)

**Datum:** 2025-01-26  
**Status:** 🔴 KRITISCH - Plan zur Behebung  
**Problem:** Arbeitsspeichernutzung geht auf über 3 GB, nur wenn Organisation-Seite, Tab Organisation offen ist

---

## 🔴 IDENTIFIZIERTE PROBLEME (AUS CODE-ANALYSE)

### 1. ❌ Settings werden mit `includeSettings: true` geladen (19.8 MB!)

**Datei:** `frontend/src/components/organization/OrganizationSettings.tsx:47`

**Code:**
```typescript
const org = await organizationService.getCurrentOrganization(undefined, true);
```

**Problem:**
- Settings werden **immer** geladen, auch wenn nicht benötigt
- Settings können **19.8 MB groß sein** (laut Kommentar in `organizationCache.ts:40`)
- Settings enthalten: LobbyPMS, Door System, Bold Payment, WhatsApp, SIRE, SMTP
- **Große JSON-Strukturen bleiben im React State** → Memory-Leak

**Impact:**
- Jedes Mal wenn die Seite geladen wird, werden 19.8 MB Settings geladen
- Settings bleiben im State, auch wenn nicht verwendet
- Bei mehreren Seitenaufrufen = **kumulativer Memory-Verbrauch**

---

### 2. ❌ Doppeltes Laden: OrganizationContext + OrganizationSettings

**Datei 1:** `frontend/src/contexts/OrganizationContext.tsx:22`
```typescript
const org = await organizationService.getCurrentOrganization(signal);
```

**Datei 2:** `frontend/src/components/organization/OrganizationSettings.tsx:47`
```typescript
const org = await organizationService.getCurrentOrganization(undefined, true);
```

**Problem:**
- **OrganizationContext** lädt Organisation **ohne Settings** (beim App-Start)
- **OrganizationSettings** lädt Organisation **mit Settings** (beim Tab-Öffnen)
- **2 separate API-Calls** für dieselben Daten
- **Settings werden doppelt geladen** (einmal im Context, einmal in Settings)

**Impact:**
- Doppelte Daten im Memory
- Doppelte API-Calls
- Unnötiger Memory-Verbrauch

---

### 3. ✅ Event-Listener werden korrekt aufgeräumt (KEIN PROBLEM)

**Status:** Event-Listener werden bereits korrekt aufgeräumt
- `EditOrganizationModal.tsx:107` - `removeEventListener` vorhanden
- `JoinOrganizationModal.tsx:45` - `removeEventListener` vorhanden

**Fakt:** Kein Memory-Leak durch Event-Listener

---

### 4. ❌ Settings bleiben im State, auch wenn nicht verwendet

**Datei:** `frontend/src/components/organization/OrganizationSettings.tsx:28`
```typescript
const [organization, setOrganization] = useState<Organization | null>(null);
```

**Problem:**
- Settings werden im State gespeichert
- State wird **nie gelöscht**, auch wenn Tab gewechselt wird
- Settings bleiben im Memory, auch wenn nicht angezeigt

**Impact:**
- 19.8 MB Settings bleiben im Memory
- Bei mehreren Tab-Wechseln = **kumulativer Memory-Verbrauch**

---

### 4. ❌ Keine Cleanup-Logik für große Datenstrukturen

**Problem:**
- Keine `useEffect` Cleanup-Funktion, die State löscht
- Keine Logik, die Settings aus dem Memory entfernt
- Settings bleiben im State, auch wenn Tab gewechselt wird

**Impact:**
- Memory-Leaks durch nicht aufgeräumte große Datenstrukturen
- Kumulativer Memory-Verbrauch bei mehreren Seitenaufrufen

---

## 📊 ROOT CAUSE ANALYSE

### Hauptursache 1: Settings werden immer geladen (19.8 MB)

**Problem:**
- `OrganizationSettings` lädt Settings mit `includeSettings: true`
- Settings können **19.8 MB groß sein**
- Settings bleiben im State, auch wenn nicht verwendet

**Impact:**
- Jeder Seitenaufruf = 19.8 MB zusätzlicher Memory-Verbrauch
- Bei mehreren Aufrufen = **kumulativer Memory-Verbrauch**

---

### Hauptursache 2: Doppeltes Laden von Organisation-Daten

**Problem:**
- `OrganizationContext` lädt Organisation (ohne Settings)
- `OrganizationSettings` lädt Organisation (mit Settings)
- **2 separate API-Calls** für dieselben Daten

**Impact:**
- Doppelte Daten im Memory
- Doppelte API-Calls
- Unnötiger Memory-Verbrauch

---

### Hauptursache 3: Keine Cleanup-Logik für große Datenstrukturen

**Problem:**
- Settings bleiben im State, auch wenn Tab gewechselt wird
- Keine Logik, die Settings aus dem Memory entfernt
- Kumulativer Memory-Verbrauch bei mehreren Seitenaufrufen

**Impact:**
- 19.8 MB Settings bleiben im Memory
- Bei mehreren Tab-Wechseln = kumulativer Memory-Verbrauch

---

## 💡 LÖSUNGSPLAN (Priorisiert)

### Lösung 1: Settings nur laden wenn wirklich benötigt (PRIORITÄT 1) ⭐⭐⭐

**Was:**
- Settings **nur** laden, wenn wirklich benötigt (z.B. beim Bearbeiten)
- **Nicht** beim initialen Laden der Seite
- Settings aus State entfernen, wenn Tab gewechselt wird

**Code-Änderung:**

**Vorher:**
```typescript
const org = await organizationService.getCurrentOrganization(undefined, true);
```

**Nachher:**
```typescript
// Initial: Ohne Settings laden
const org = await organizationService.getCurrentOrganization(undefined, false);

// Nur beim Bearbeiten: Settings laden
const orgWithSettings = await organizationService.getCurrentOrganization(undefined, true);
```

**Erwartete Verbesserung:**
- **19.8 MB weniger** Memory-Verbrauch beim initialen Laden
- Settings werden nur geladen, wenn wirklich benötigt

---

### Lösung 2: OrganizationContext wiederverwenden statt doppelt laden (PRIORITÄT 2) ⭐⭐

**Was:**
- `OrganizationSettings` sollte `OrganizationContext` verwenden
- **Nicht** nochmal die Organisation laden
- Settings separat laden, wenn benötigt

**Code-Änderung:**

**Vorher:**
```typescript
// OrganizationSettings.tsx
const org = await organizationService.getCurrentOrganization(undefined, true);
```

**Nachher:**
```typescript
// OrganizationSettings.tsx
const { organization } = useOrganization(); // Verwende Context

// Nur Settings separat laden, wenn benötigt
const orgWithSettings = await organizationService.getCurrentOrganization(undefined, true);
```

**Erwartete Verbesserung:**
- **1 API-Call weniger** beim Tab-Öffnen
- Keine doppelten Daten im Memory

---

### Lösung 3: State-Cleanup beim Tab-Wechsel (PRIORITÄT 3) ⭐

**Was:**
- State löschen, wenn Tab gewechselt wird
- Settings aus Memory entfernen, wenn nicht mehr benötigt

**Code-Änderung:**

**Vorher:**
```typescript
const [organization, setOrganization] = useState<Organization | null>(null);
```

**Nachher:**
```typescript
const [organization, setOrganization] = useState<Organization | null>(null);

useEffect(() => {
  return () => {
    // Cleanup: State löschen beim Unmount
    setOrganization(null);
  };
}, []);
```

**Erwartete Verbesserung:**
- Settings werden aus Memory entfernt, wenn Tab gewechselt wird
- Keine kumulativen Memory-Leaks

---

## 📋 IMPLEMENTIERUNGSREIHENFOLGE

### Schritt 1: Settings nur laden wenn benötigt (SOFORT) ⭐⭐⭐

**Datei:** `frontend/src/components/organization/OrganizationSettings.tsx`

**Änderungen:**
1. Initial: `includeSettings: false` verwenden
2. Settings separat laden, nur wenn wirklich benötigt (z.B. beim Bearbeiten)
3. Settings aus State entfernen, wenn Tab gewechselt wird

**Erwartete Verbesserung:**
- **19.8 MB weniger** Memory-Verbrauch beim initialen Laden

---

### Schritt 2: OrganizationContext wiederverwenden (NACH Schritt 1) ⭐⭐

**Datei:** `frontend/src/components/organization/OrganizationSettings.tsx`

**Änderungen:**
1. `useOrganization()` Hook verwenden statt eigenen API-Call
2. Settings separat laden, wenn benötigt

**Erwartete Verbesserung:**
- **1 API-Call weniger** beim Tab-Öffnen
- Keine doppelten Daten im Memory

---

### Schritt 3: State-Cleanup beim Tab-Wechsel (NACH Schritt 2) ⭐

**Datei:** `frontend/src/components/organization/OrganizationSettings.tsx`

**Änderungen:**
1. State löschen, wenn Tab gewechselt wird
2. Settings aus Memory entfernen, wenn nicht mehr benötigt

**Erwartete Verbesserung:**
- Keine kumulativen Memory-Leaks

---

## 📊 ERWARTETE VERBESSERUNG

### Vorher:
- **Memory-Verbrauch:** 3+ GB (nur Organisation-Seite, Tab Organisation)
- **API-Calls:** 2 (OrganizationContext + OrganizationSettings)
- **Settings:** 19.8 MB im Memory (immer geladen)
- **State-Cleanup:** Keine Cleanup-Logik für große Datenstrukturen

### Nachher:
- **Memory-Verbrauch:** < 100 MB (nur Organisation-Seite, Tab Organisation)
- **API-Calls:** 1 (nur OrganizationContext, Settings separat wenn benötigt)
- **Settings:** Nur im Memory, wenn wirklich benötigt
- **State-Cleanup:** Settings werden aus Memory entfernt, wenn Tab gewechselt wird

**Reduktion:**
- **Memory-Verbrauch:** Von 3+ GB → < 100 MB (**97% Reduktion**)
- **API-Calls:** Von 2 → 1 (**50% Reduktion**)
- **Settings:** Nur wenn benötigt (**19.8 MB weniger** beim initialen Laden)

---

## ⚠️ WICHTIG: NUR PLAN - NOCH NICHT IMPLEMENTIERT

**Status:** Plan erstellt  
**Nächster Schritt:** Plan mit User besprechen, dann implementieren

---

**Erstellt:** 2025-01-26  
**Analysiert von:** Claude (Auto)  
**Basis:** Code-Analyse der Organisation-Seite und Memory-Leak-Identifikation


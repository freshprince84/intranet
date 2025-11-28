# Memory Leak: Bessere Lösung (2025-01-26)

**Datum:** 2025-01-26  
**Status:** 🔄 BESSERE LÖSUNG  
**Problem:** 5-Minuten-Timeout ist nicht Best Practice

---

## ❌ PROBLEM MIT AKTUELLER LÖSUNG

### Warum 5-Minuten-Timeout NICHT Best Practice ist:

1. **Willkürlich:** 5 Minuten ist eine willkürliche Zahl
2. **User könnte gerade filtern:** Daten werden gelöscht, während User filtert
3. **Nicht kontextbezogen:** Löscht auch wenn Daten noch benötigt werden
4. **Schlechte UX:** User könnte Daten verlieren, die er gerade verwendet

---

## ✅ BESSERE LÖSUNG: Intelligentes Cleanup

### Wann wird `allTasks` tatsächlich benötigt?

**Code-Analyse:**
```typescript
// allTasks wird nur verwendet wenn:
const tasksToFilter = (allTasks.length > 0 && !selectedFilterId) ? allTasks : tasks;
```

**Bedingungen:**
- ✅ `allTasks.length > 0` → allTasks muss vorhanden sein
- ✅ `!selectedFilterId` → Kein Standardfilter aktiv (dann client-seitiges Filtering)

**Fazit:** `allTasks` wird nur benötigt für **client-seitiges Filtering ohne Standardfilter**.

---

## 🎯 BESSERE LÖSUNG: Cleanup bei Bedarf

### Strategie 1: Cleanup wenn nicht mehr benötigt ✅

**Löschen wenn:**
1. ✅ `selectedFilterId` wird gesetzt → allTasks nicht mehr benötigt
2. ✅ Tab wird gewechselt → allTasks nicht mehr benötigt
3. ✅ Component wird unmounted → allTasks nicht mehr benötigt (bereits implementiert)

**NICHT löschen:**
- ❌ Einfach nach 5 Minuten (zu willkürlich)
- ❌ Wenn User gerade filtert (schlechte UX)

---

### Strategie 2: Cleanup bei Tab-Wechsel ✅

**Löschen wenn:**
- ✅ User wechselt zu anderem Tab (todos → reservations)
- ✅ allTasks wird nicht mehr benötigt

---

### Strategie 3: Cleanup wenn Filter aktiviert wird ✅

**Löschen wenn:**
- ✅ `selectedFilterId` wird gesetzt (Standardfilter aktiviert)
- ✅ allTasks wird nicht mehr benötigt (server-seitiges Filtering)

---

## 📋 IMPLEMENTIERUNG DER BESSEREN LÖSUNG

### Lösung 1: Cleanup wenn Filter aktiviert wird

```typescript
// ✅ MEMORY: allTasks löschen wenn Standardfilter aktiviert wird (nicht mehr benötigt)
useEffect(() => {
  if (selectedFilterId && allTasks.length > 0) {
    if (process.env.NODE_ENV === 'development') {
      console.log('🧹 allTasks gelöscht (Standardfilter aktiviert)');
    }
    setAllTasks([]);
  }
}, [selectedFilterId]);
```

**Vorteile:**
- ✅ Löscht nur wenn wirklich nicht mehr benötigt
- ✅ Keine willkürliche Zeit
- ✅ Bessere UX (keine Datenverluste während Filterung)

---

### Lösung 2: Cleanup bei Tab-Wechsel

```typescript
// ✅ MEMORY: allTasks löschen wenn Tab gewechselt wird (nicht mehr benötigt)
useEffect(() => {
  if (activeTab !== 'todos' && allTasks.length > 0) {
    if (process.env.NODE_ENV === 'development') {
      console.log('🧹 allTasks gelöscht (Tab gewechselt)');
    }
    setAllTasks([]);
  }
}, [activeTab]);
```

**Vorteile:**
- ✅ Löscht nur wenn Tab nicht mehr aktiv
- ✅ Keine willkürliche Zeit
- ✅ Bessere UX

---

### Lösung 3: Kombination (BESTE LÖSUNG)

```typescript
// ✅ MEMORY: allTasks intelligent löschen (nur wenn nicht mehr benötigt)
useEffect(() => {
  // Löschen wenn Standardfilter aktiviert wird
  if (selectedFilterId && allTasks.length > 0) {
    if (process.env.NODE_ENV === 'development') {
      console.log('🧹 allTasks gelöscht (Standardfilter aktiviert)');
    }
    setAllTasks([]);
    return;
  }
  
  // Löschen wenn Tab gewechselt wird
  if (activeTab !== 'todos' && allTasks.length > 0) {
    if (process.env.NODE_ENV === 'development') {
      console.log('🧹 allTasks gelöscht (Tab gewechselt)');
    }
    setAllTasks([]);
  }
}, [selectedFilterId, activeTab, allTasks.length]);
```

**Vorteile:**
- ✅ Löscht nur wenn wirklich nicht mehr benötigt
- ✅ Keine willkürliche Zeit
- ✅ Bessere UX
- ✅ Kontextbezogen

---

## 📊 VERGLEICH

### Aktuelle Lösung (5-Minuten-Timeout):
- ❌ Willkürlich (5 Minuten)
- ❌ Löscht auch wenn Daten noch benötigt werden
- ❌ Schlechte UX (könnte Daten während Filterung verlieren)
- ⚠️ Nicht Best Practice

### Bessere Lösung (Intelligentes Cleanup):
- ✅ Kontextbezogen (löscht nur wenn nicht mehr benötigt)
- ✅ Keine willkürliche Zeit
- ✅ Bessere UX (keine Datenverluste)
- ✅ Best Practice

---

## ✅ EMPFEHLUNG

**5-Minuten-Timeout entfernen** und durch **intelligentes Cleanup** ersetzen:

1. ✅ Cleanup wenn `selectedFilterId` gesetzt wird
2. ✅ Cleanup wenn Tab gewechselt wird
3. ✅ Cleanup beim Unmount (bereits implementiert)

**Das ist Best Practice!**

---

**Erstellt:** 2025-01-26  
**Status:** 📋 BESSERE LÖSUNG  
**Nächster Schritt:** Implementierung der besseren Lösung



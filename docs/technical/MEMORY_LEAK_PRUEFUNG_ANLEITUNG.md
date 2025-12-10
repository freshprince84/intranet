# Memory Leak Prüfung - Schritt-für-Schritt Anleitung

**Datum:** 2025-01-31  
**Zweck:** Beweise sammeln, ob Komponenten unmounted werden und States im Memory bleiben

---

## 🔍 PRÜFUNG 1: Werden Komponenten wirklich unmounted?

### Schritt 1: React DevTools installieren

1. Chrome Extension installieren: [React Developer Tools](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)
2. Browser neu laden

### Schritt 2: Komponenten-Mount/Unmount prüfen

1. **Chrome DevTools öffnen** (F12)
2. **React DevTools Tab** öffnen
3. **Components** Tab wählen
4. **Filter:** "Dashboard" oder "Worktracker" eingeben

**Prüfung:**
- Öffne Dashboard → Suche nach `<Dashboard>` Komponente
- Wechsle zu Worktracker → Prüfe: **Verschwindet `<Dashboard>` aus dem Component Tree?**
- Wechsle zurück zu Dashboard → Prüfe: **Wird `<Dashboard>` neu gemountet?**

**Erwartetes Ergebnis:**
- ✅ Komponente verschwindet beim Route-Wechsel → **Wird unmounted**
- ❌ Komponente bleibt im Tree → **Wird NICHT unmounted** (Problem!)

---

## 🔍 PRÜFUNG 2: Bleiben States im Memory?

### Schritt 1: Memory Profiling vorbereiten

1. **Chrome DevTools öffnen** (F12)
2. **Memory Tab** öffnen
3. **Heap Snapshot** wählen

### Schritt 2: Baseline-Snapshot erstellen

1. **Dashboard öffnen** (warten bis geladen)
2. **Heap Snapshot aufnehmen** (Button "Take snapshot")
3. **Snapshot benennen:** "01_Baseline_Dashboard"

### Schritt 3: Worktracker öffnen

1. **Zu Worktracker wechseln** (warten bis geladen)
2. **Heap Snapshot aufnehmen**
3. **Snapshot benennen:** "02_After_Worktracker"

### Schritt 4: Zurück zu Dashboard

1. **Zurück zu Dashboard wechseln** (warten bis geladen)
2. **Heap Snapshot aufnehmen**
3. **Snapshot benennen:** "03_Back_To_Dashboard"

### Schritt 5: Vergleich

1. **Snapshot 02 mit 01 vergleichen:**
   - Dropdown: "02_After_Worktracker" → "Comparison" → "01_Baseline_Dashboard"
   - **Suche nach:** `Request` oder `Task` Objekten
   - **Prüfe:** Werden Requests aus Snapshot 01 noch gefunden?

2. **Snapshot 03 mit 01 vergleichen:**
   - Dropdown: "03_Back_To_Dashboard" → "Comparison" → "01_Baseline_Dashboard"
   - **Prüfe:** Werden Requests aus Snapshot 01 noch gefunden?
   - **Prüfe:** Werden Tasks aus Snapshot 02 noch gefunden?

**Erwartetes Ergebnis:**
- ✅ Requests/Tasks verschwinden → **States werden gelöscht** (gut!)
- ❌ Requests/Tasks bleiben → **States bleiben im Memory** (Memory Leak!)

---

## 🔍 PRÜFUNG 3: Was verbraucht tatsächlich Memory?

### Schritt 1: Memory Snapshot analysieren

1. **Heap Snapshot öffnen** (z.B. "03_Back_To_Dashboard")
2. **Filter:** "Request" oder "Task" eingeben
3. **Constructor Spalte** prüfen

**Was suchen:**
- `(array)` - Arrays mit Requests/Tasks
- `(object)` - Request/Task Objekte
- `(string)` - base64 Bild-Strings

### Schritt 2: Retained Size prüfen

1. **Sortiere nach "Retained Size"** (größte zuerst)
2. **Klicke auf größte Einträge**
3. **"Retainers" Tab** öffnen
4. **Prüfe:** Was hält diese Objekte im Memory?

**Mögliche Retainers:**
- `React Fiber` → Komponente ist noch gemountet
- `Context` → Context hält Daten
- `Closure` → Event Listener oder Callback
- `Array` → Array hält Referenzen

---

## 🔍 PRÜFUNG 4: Console-Logs für Mount/Unmount

### Schritt 1: Code temporär anpassen

**Datei:** `frontend/src/pages/Dashboard.tsx`

```typescript
const Dashboard: React.FC = () => {
  // ... existing code ...
  
  useEffect(() => {
    console.log('🔵 Dashboard MOUNTED');
    return () => {
      console.log('🔴 Dashboard UNMOUNTED');
    };
  }, []);
  
  // ... rest of code ...
};
```

**Datei:** `frontend/src/components/Requests.tsx`

```typescript
const Requests: React.FC = () => {
  // ... existing code ...
  
  useEffect(() => {
    console.log('🔵 Requests MOUNTED');
    return () => {
      console.log('🔴 Requests UNMOUNTED');
      console.log('🔴 Requests State:', requests.length, 'items');
    };
  }, [requests.length]);
  
  // ... rest of code ...
};
```

**Datei:** `frontend/src/pages/Worktracker.tsx`

```typescript
const Worktracker: React.FC = () => {
  // ... existing code ...
  
  useEffect(() => {
    console.log('🔵 Worktracker MOUNTED');
    return () => {
      console.log('🔴 Worktracker UNMOUNTED');
      console.log('🔴 Tasks State:', tasks.length, 'items');
      console.log('🔴 Reservations State:', reservations.length, 'items');
    };
  }, [tasks.length, reservations.length]);
  
  // ... rest of code ...
};
```

### Schritt 2: Console beobachten

1. **Console öffnen** (F12 → Console Tab)
2. **Dashboard öffnen** → Prüfe: `🔵 Dashboard MOUNTED` und `🔵 Requests MOUNTED`
3. **Zu Worktracker wechseln** → Prüfe: 
   - `🔴 Dashboard UNMOUNTED`?
   - `🔴 Requests UNMOUNTED`?
   - `🔵 Worktracker MOUNTED`?
4. **Zurück zu Dashboard** → Prüfe:
   - `🔴 Worktracker UNMOUNTED`?
   - `🔵 Dashboard MOUNTED` (neu)?

**Erwartetes Ergebnis:**
- ✅ UNMOUNTED Logs erscheinen → **Komponenten werden unmounted**
- ❌ Keine UNMOUNTED Logs → **Komponenten werden NICHT unmounted** (Problem!)

---

## 🔍 PRÜFUNG 5: React Profiler für Re-Renders

### Schritt 1: React Profiler aktivieren

1. **React DevTools** → **Profiler Tab**
2. **Record Button** klicken (roter Kreis)

### Schritt 2: Aktionen durchführen

1. **Dashboard öffnen** (warten)
2. **Zu Worktracker wechseln** (warten)
3. **Zurück zu Dashboard** (warten)
4. **Record stoppen**

### Schritt 3: Analyse

1. **Timeline** durchgehen
2. **Prüfe:** Werden Dashboard/Worktracker bei jedem Wechsel neu gemountet?
3. **Prüfe:** Werden sie nur re-rendered oder komplett neu gemountet?

**Erwartetes Ergebnis:**
- ✅ Komponente wird bei Route-Wechsel **neu gemountet** (Mount-Symbol)
- ❌ Komponente wird nur **re-rendered** (Update-Symbol) → **Wird nicht unmounted!**

---

## 📊 ZUSAMMENFASSUNG DER PRÜFUNGEN

### Checkliste:

- [ ] **Prüfung 1:** React DevTools zeigt Mount/Unmount
- [ ] **Prüfung 2:** Heap Snapshots zeigen, ob States gelöscht werden
- [ ] **Prüfung 3:** Retained Size zeigt, was Memory hält
- [ ] **Prüfung 4:** Console-Logs zeigen Mount/Unmount
- [ ] **Prüfung 5:** React Profiler zeigt Re-Renders vs. Mounts

### Erwartete Ergebnisse:

**Wenn alles funktioniert:**
- ✅ Komponenten werden beim Route-Wechsel unmounted
- ✅ States werden automatisch gelöscht (React Cleanup)
- ✅ Memory sollte nicht wachsen

**Wenn Memory Leak vorhanden:**
- ❌ Komponenten werden nicht unmounted
- ❌ States bleiben im Memory
- ❌ Memory wächst kontinuierlich

---

## 🎯 NÄCHSTE SCHRITTE

Nach der Prüfung:
1. **Ergebnisse dokumentieren** (Screenshots, Logs)
2. **Ursache identifizieren** (wenn Memory Leak gefunden)
3. **Fix implementieren** (basierend auf Ergebnissen)

---

**Erstellt:** 2025-01-31  
**Status:** 📋 PRÜFUNGSANLEITUNG  
**Nächster Schritt:** Prüfungen durchführen und Ergebnisse dokumentieren


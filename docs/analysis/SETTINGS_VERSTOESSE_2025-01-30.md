# Design-Standards-Verstöße auf der Settings-Seite

**Datei:** `frontend/src/pages/Settings.tsx`  
**Datum:** 2025-01-30  
**Zweck:** Vollständige Auflistung ALLER Design-Standards-Verstöße auf der Settings-Seite

---

## Zusammenfassung

**Gesamt-Verstöße gefunden:** 2 Buttons mit sichtbarem Text

---

## 1. Buttons mit sichtbarem Text (statt Icon-only)

**Regel:** Alle Buttons müssen Icon-only sein, Text nur im `title` Attribut für Tooltips.

### Verstoß 1: "Onboarding-Tour neu starten" Button

**Zeile:** 402-421

**Aktueller Code:**
```tsx
<button
    onClick={async () => {
        // ... Handler-Code ...
    }}
    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors dark:bg-blue-700 dark:hover:bg-blue-800"
>
    {t('onboarding.navigation.restart')}
</button>
```

**Probleme:**
- ❌ Button hat sichtbaren Text: `{t('onboarding.navigation.restart')}`
- ❌ Button hat blauen Hintergrund (`bg-blue-600`) - sollte transparent sein (außer Speichern-Button)
- ❌ Button hat `px-4 py-2` statt Icon-only Größe
- ❌ Button hat `rounded-lg` statt `rounded-md` oder `rounded-full`

**Status:** ❌ **NICHT BEHOBEN**

**Korrektur erforderlich:**
- Text entfernen
- Icon hinzufügen (z.B. `AcademicCapIcon` oder `ArrowPathIcon`)
- Hintergrund transparent machen
- Größe auf Icon-only anpassen
- `title` Attribut für Tooltip hinzufügen

---

### Verstoß 2: "Vollständigen Sync starten" Button

**Zeile:** 573-604

**Aktueller Code:**
```tsx
<button
    onClick={async () => {
        // ... Handler-Code ...
    }}
    disabled={isSaving}
    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors dark:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
>
    {isSaving ? (
        <>
            <ArrowPathIcon className="h-5 w-5 animate-spin" />
            <span>Sync läuft...</span>
        </>
    ) : (
        <>
            <ArrowPathIcon className="h-5 w-5" />
            <span>Vollständigen Sync starten</span>
        </>
    )}
</button>
```

**Probleme:**
- ❌ Button hat sichtbaren Text: "Sync läuft..." / "Vollständigen Sync starten"
- ❌ Button hat blauen Hintergrund (`bg-blue-600`) - sollte transparent sein (außer Speichern-Button)
- ❌ Button hat `px-4 py-2` statt Icon-only Größe
- ❌ Button hat `rounded-lg` statt `rounded-md` oder `rounded-full`
- ✅ Button hat bereits Icon (`ArrowPathIcon`), aber zusätzlich Text

**Status:** ❌ **NICHT BEHOBEN**

**Korrektur erforderlich:**
- Text entfernen (nur Icon behalten)
- Hintergrund transparent machen
- Größe auf Icon-only anpassen
- `title` Attribut für Tooltip hinzufügen

---

## 2. Buttons mit blauem Hintergrund (außer Speichern-Buttons)

**Regel:** Buttons (außer Speichern-Button in Sidepanes) haben KEINEN blauen Hintergrund, sondern transparent mit Hover-Effekt.

### Verstoß 1: "Onboarding-Tour neu starten" Button

**Zeile:** 418

**Probleme:**
- ❌ Button hat `bg-blue-600` - sollte transparent sein

**Status:** ❌ **NICHT BEHOBEN** (siehe Verstoß 1.1)

---

### Verstoß 2: "Vollständigen Sync starten" Button

**Zeile:** 591

**Probleme:**
- ❌ Button hat `bg-blue-600` - sollte transparent sein

**Status:** ❌ **NICHT BEHOBEN** (siehe Verstoß 1.2)

---

### ✅ OK: Logo-Upload Button

**Zeile:** 451-463

**Status:** ✅ **OK** - Button ist Icon-only (`DocumentArrowUpIcon` / `ArrowPathIcon`), hat zwar blauen Hintergrund, aber das ist für Upload-Aktionen akzeptabel

---

### ✅ OK: Speichern-Verzeichnisse Button

**Zeile:** 521-549

**Status:** ✅ **OK** - Button ist Icon-only (`CheckIcon` / `ArrowPathIcon`), hat zwar blauen Hintergrund, aber das ist für Speichern-Aktionen akzeptabel

---

## 3. Buttons mit falscher Größe/Form

**Regel:** Buttons müssen Standard-Größen verwenden, Create-Buttons müssen rund sein.

### Verstoß 1: "Onboarding-Tour neu starten" Button

**Zeile:** 418

**Probleme:**
- ❌ Button hat `px-4 py-2` statt Icon-only Größe (`p-2`)
- ❌ Button hat `rounded-lg` statt `rounded-md`

**Status:** ❌ **NICHT BEHOBEN** (siehe Verstoß 1.1)

---

### Verstoß 2: "Vollständigen Sync starten" Button

**Zeile:** 591

**Probleme:**
- ❌ Button hat `px-4 py-2` statt Icon-only Größe (`p-2`)
- ❌ Button hat `rounded-lg` statt `rounded-md`

**Status:** ❌ **NICHT BEHOBEN** (siehe Verstoß 1.2)

---

## 4. Tab-Buttons

**Zeilen:** 249-293

**Status:** ✅ **OK** - Tab-Buttons haben Text, aber das ist bei Tabs erlaubt und Standard

---

## 5. Toggle-Switches

**Zeilen:** 353, 383

**Status:** ✅ **OK** - Toggle-Switches sind keine Buttons, daher keine Verstöße

---

## Zusammenfassung der Verstöße

### Kritische Verstöße (müssen behoben werden):

1. **"Onboarding-Tour neu starten" Button** (Zeile 402-421)
   - Text entfernen → Icon-only
   - Hintergrund transparent machen
   - Größe anpassen (`p-2` statt `px-4 py-2`)
   - `rounded-md` statt `rounded-lg`
   - `title` Attribut für Tooltip hinzufügen

2. **"Vollständigen Sync starten" Button** (Zeile 573-604)
   - Text entfernen → Icon-only (Icon bereits vorhanden)
   - Hintergrund transparent machen
   - Größe anpassen (`p-2` statt `px-4 py-2`)
   - `rounded-md` statt `rounded-lg`
   - `title` Attribut für Tooltip hinzufügen

### OK (keine Verstöße):

- Tab-Buttons (haben Text, aber das ist bei Tabs erlaubt)
- Toggle-Switches (sind keine Buttons)
- Logo-Upload Button (Icon-only, OK)
- Speichern-Verzeichnisse Button (Icon-only, OK)

---

**Gesamt:** 2 kritische Verstöße, die behoben werden müssen.


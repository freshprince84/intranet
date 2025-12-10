# Design-Standards-Verstöße auf Profil- und Organisation-Seite

**Datum:** 2025-01-30  
**Dateien:** 
- `frontend/src/pages/Profile.tsx`
- `frontend/src/pages/Organisation.tsx`

**Zweck:** Vollständige Auflistung ALLER Design-Standards-Verstöße auf beiden Seiten

---

## Zusammenfassung

**Profil-Seite:** 1 kritischer Verstoß  
**Organisation-Seite:** 2 kritische Verstöße  
**Gesamt:** 3 kritische Verstöße

---

## Profil-Seite (Profile.tsx)

### Verstoß 1: "Dokument hochladen" Button mit sichtbarem Text

**Zeile:** 433-441

**Aktueller Code:**
```tsx
<button
    data-onboarding="upload-document-button"
    type="button"
    onClick={() => setShowDocumentUpload(true)}
    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
>
    <DocumentTextIcon className="h-5 w-5 inline mr-2" />
    {t('profile.uploadDocument') || 'Dokument hochladen'}
</button>
```

**Probleme:**
- ❌ Button hat sichtbaren Text: `{t('profile.uploadDocument') || 'Dokument hochladen'}`
- ❌ Blauer Hintergrund (`bg-blue-600`) statt transparent
- ❌ Falsche Größe: `px-4 py-2` statt Icon-only (`p-2`)
- ❌ Falsche Form: `rounded-md` statt `rounded-md` (OK, aber sollte Icon-only sein)
- ❌ Icon und Text nebeneinander statt nur Icon

**Korrektur:**
- Text entfernen
- Nur Icon anzeigen (`DocumentTextIcon`)
- Hintergrund transparent machen (`bg-transparent` oder entfernen)
- Größe auf `p-2` ändern
- `title` Attribut für Tooltip hinzufügen: `title={t('profile.uploadDocument') || 'Dokument hochladen'}`

**Korrigierter Code:**
```tsx
<button
    data-onboarding="upload-document-button"
    type="button"
    onClick={() => setShowDocumentUpload(true)}
    className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
    title={t('profile.uploadDocument') || 'Dokument hochladen'}
>
    <DocumentTextIcon className="h-5 w-5" />
</button>
```

**Status:** ❌ **NICHT BEHOBEN**

---

### ✅ Korrekte Buttons (keine Verstöße)

**Zeile 670-676:** Speichern-Button
- ✅ Icon-only (`CheckIcon`)
- ✅ Blauer Hintergrund ist OK für Speichern-Buttons in Formularen
- ✅ `title` Attribut vorhanden

**Zeile 677-684:** Abbrechen-Button
- ✅ Icon-only (`XMarkIcon`)
- ✅ Transparenter Hintergrund
- ✅ `title` Attribut vorhanden

---

## Organisation-Seite (Organisation.tsx)

### Verstoß 1: "Touren" Button mit sichtbarem Text

**Zeile:** 267-277

**Aktueller Code:**
```tsx
<button
    type="button"
    onClick={() => setProvidersViewMode('tours')}
    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
        providersViewMode === 'tours'
            ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
    }`}
>
    {t('tours.title', 'Touren')}
</button>
```

**Probleme:**
- ❌ Button hat sichtbaren Text: `{t('tours.title', 'Touren')}`
- ❌ Falsche Größe: `px-3 py-1.5` statt Icon-only (`p-2`)
- ❌ Kein Icon vorhanden
- ❌ Falsche Form: `rounded-full` (OK für Toggle-Buttons, aber sollte Icon-only sein)

**Korrektur:**
- Text entfernen
- Icon hinzufügen (z.B. `MapIcon` oder `CalendarIcon`)
- Größe auf `p-2` ändern
- `title` Attribut für Tooltip hinzufügen

**Status:** ❌ **NICHT BEHOBEN**

---

### Verstoß 2: "Proveedores" Button mit sichtbarem Text

**Zeile:** 278-288

**Aktueller Code:**
```tsx
<button
    type="button"
    onClick={() => setProvidersViewMode('providers')}
    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
        providersViewMode === 'providers'
            ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
    }`}
>
    {t('organisation.tabs.providers', { defaultValue: 'Proveedores' })}
</button>
```

**Probleme:**
- ❌ Button hat sichtbaren Text: `{t('organisation.tabs.providers', { defaultValue: 'Proveedores' })}`
- ❌ Falsche Größe: `px-3 py-1.5` statt Icon-only (`p-2`)
- ❌ Kein Icon vorhanden
- ❌ Falsche Form: `rounded-full` (OK für Toggle-Buttons, aber sollte Icon-only sein)

**Korrektur:**
- Text entfernen
- Icon hinzufügen (z.B. `TruckIcon` - wird bereits importiert)
- Größe auf `p-2` ändern
- `title` Attribut für Tooltip hinzufügen

**Status:** ❌ **NICHT BEHOBEN**

---

### ✅ Korrekte Elemente (keine Verstöße)

**Zeilen 106-202:** Tab-Buttons
- ✅ Tab-Buttons mit Text sind OK (Tab-Navigation ist eine Ausnahme)
- ✅ Icons vorhanden
- ✅ Korrekte Positionierung und Styling

---

## Zusammenfassung der Verstöße

### Profil-Seite:
1. **"Dokument hochladen" Button** (Zeile 433-441)
   - Text sichtbar
   - Blauer Hintergrund statt transparent
   - Falsche Größe

### Organisation-Seite:
1. **"Touren" Button** (Zeile 267-277)
   - Text sichtbar
   - Kein Icon
   - Falsche Größe

2. **"Proveedores" Button** (Zeile 278-288)
   - Text sichtbar
   - Kein Icon
   - Falsche Größe

---

## Nächste Schritte

1. Alle 3 Buttons auf Icon-only umstellen
2. Text in `title` Attribut verschieben
3. Korrekte Größe (`p-2`) verwenden
4. Transparente Hintergründe für alle Buttons (außer Speichern-Buttons in Formularen)
5. Icons hinzufügen wo fehlend

---

**Status:** ❌ **ALLE VERSTÖSSE NOCH NICHT BEHOBEN**


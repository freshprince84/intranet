# Formularfeld-Design-Standardisierung Plan

**Datum:** 2025-01-26  
**Ziel:** Das Design der Formularfelder aus "Crear Nueva Reserva" (Tours) als neues Standard-Design etablieren

## Analyse: Aktuelles Design vs. Neues Standard-Design

### Neues Standard-Design (aus CreateTourBookingModal)

**Tailwind-Klassen:**
```
w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent
```

**Eigenschaften:**
- `rounded-lg` (statt `rounded-md`) - größere Rundung
- `focus:ring-2 focus:ring-blue-500 focus:border-transparent` - explizite Ring-Breite, Border wird transparent beim Focus
- Kein `shadow-sm` (kein Schatten)

### Altes Standard-Design (aktuell in vielen Komponenten)

**Tailwind-Klassen:**
```
w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white
```

**Eigenschaften:**
- `rounded-md` - kleinere Rundung
- `focus:border-blue-500 focus:ring-blue-500` - Border wird blau beim Focus
- `shadow-sm` - leichter Schatten

## Betroffene Komponenten

### 1. Formularfelder in Modals/Sidepanes
- [ ] `CreateTaskModal.tsx`
- [ ] `EditTaskModal.tsx`
- [ ] `CreateRequestModal.tsx`
- [ ] `EditRequestModal.tsx`
- [ ] `CreateClientModal.tsx`
- [ ] `EditClientModal.tsx`
- [ ] `CreateTourModal.tsx`
- [ ] `EditTourModal.tsx`
- [ ] `CreateTourProviderModal.tsx`
- [ ] `EditTourProviderModal.tsx`
- [ ] `CreateReservationModal.tsx`
- [ ] `EditReservationModal.tsx`
- [ ] `CreateOrganizationModal.tsx`
- [ ] `EditOrganizationModal.tsx`
- [ ] `UserManagementTab.tsx` (Formularfelder)
- [ ] `RoleManagementTab.tsx` (Formularfelder)
- [ ] `PasswordEntrySidepane.tsx`
- [ ] `IdentificationDocumentForm.tsx`

### 2. Formularfelder auf Seiten
- [ ] `Profile.tsx` (Profil-Formularfelder)
- [ ] `Settings.tsx` (Einstellungs-Formularfelder)
- [ ] Alle anderen Seiten mit Formularfeldern

### 3. Suchfelder
- [ ] Suchfelder in Tabellen-Header (Worktracker, Requests, etc.)
- [ ] Suchfelder in Filterpanes
- [ ] Suchfelder in anderen Komponenten

### 4. Filterfelder
- [ ] `FilterPane.tsx` (Filter-Eingabefelder)
- [ ] `FilterRow.tsx` (Filter-Eingabefelder)
- [ ] Alle anderen Filter-Komponenten

## Implementierungsplan

### Phase 1: Dokumentation aktualisieren

1. **DESIGN_STANDARDS.md aktualisieren**
   - Abschnitt "Formulare und Eingabefelder" aktualisieren
   - Neues Standard-Design dokumentieren
   - Altes Design als deprecated markieren
   - Beispiele mit neuem Design aktualisieren

### Phase 2: Wiederverwendbare Komponente erstellen (Optional, aber empfohlen)

**Vorteile:**
- Konsistenz überall
- Einfache Wartung
- Zentrale Anpassungen möglich

**Komponente:** `frontend/src/components/shared/InputField.tsx`

```tsx
interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  // ... weitere Props
}

export const InputField = ({ label, error, className, ...props }: InputFieldProps) => {
  const baseClasses = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}
      <input
        className={`${baseClasses} ${error ? 'border-red-300 dark:border-red-600' : ''} ${className || ''}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
};
```

**Ähnliche Komponenten:**
- `TextareaField.tsx`
- `SelectField.tsx`
- `SearchField.tsx` (für Suchfelder)

### Phase 3: Systematische Anpassung aller Formularfelder

**Vorgehen:**
1. Alle Dateien mit Formularfeldern finden
2. Schritt für Schritt anpassen:
   - `rounded-md` → `rounded-lg`
   - `focus:border-blue-500 focus:ring-blue-500` → `focus:ring-2 focus:ring-blue-500 focus:border-transparent`
   - `shadow-sm` entfernen (falls vorhanden)
3. Testen nach jeder Anpassung

**Priorisierung:**
1. **Hoch:** Modals/Sidepanes (Create/Edit-Komponenten)
2. **Mittel:** Seiten-Formulare (Profile, Settings)
3. **Niedrig:** Suchfelder (können optional bleiben, da sie spezielles Design haben)

### Phase 4: Testing

1. **Visuelles Testing:**
   - Alle Formulare öffnen und prüfen
   - Focus-States testen
   - Dark Mode testen
   - Mobile-Ansicht testen

2. **Funktionales Testing:**
   - Alle Formulare funktionieren noch
   - Validierung funktioniert
   - Submit funktioniert

## Detaillierte Änderungen

### Standard-Input-Feld

**Alt:**
```tsx
<input
  type="text"
  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
/>
```

**Neu:**
```tsx
<input
  type="text"
  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
/>
```

### Standard-Textarea

**Alt:**
```tsx
<textarea
  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
/>
```

**Neu:**
```tsx
<textarea
  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
/>
```

### Standard-Select

**Alt:**
```tsx
<select
  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
/>
```

**Neu:**
```tsx
<select
  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
/>
```

## Suchfelder - Spezielle Behandlung

**Hinweis:** Suchfelder haben ein spezielles Design mit fester Breite (200px Desktop, 120px Mobile) und `shadow-sm`. 

**Option 1:** Suchfelder behalten ihr aktuelles Design (mit `shadow-sm` und `rounded-md`)
**Option 2:** Suchfelder auch auf neues Design umstellen (ohne `shadow-sm`, mit `rounded-lg`)

**Empfehlung:** Option 2 - Konsistenz überall, aber `shadow-sm` kann optional bleiben für Suchfelder, da sie in Header-Bereichen sind.

## Risiken und Überlegungen

1. **Breaking Changes:** Keine - nur visuelle Änderungen
2. **Testing-Aufwand:** Hoch - viele Komponenten betroffen
3. **Konsistenz:** Wichtig - alle Felder müssen gleich aussehen
4. **Mobile-Ansicht:** Prüfen, ob `rounded-lg` auf Mobile gut aussieht

## Nächste Schritte

1. ✅ Plan erstellt
2. ⏳ User-Bestätigung abwarten
3. ⏳ DESIGN_STANDARDS.md aktualisieren
4. ⏳ Wiederverwendbare Komponenten erstellen (optional)
5. ⏳ Systematische Anpassung aller Formularfelder
6. ⏳ Testing durchführen


# Responsive Testing Checkliste

## ⚠️ KRITISCH: Diese Checkliste ist VERBINDLICH

**JEDE neue Feature-Implementierung MUSS bei Mobile UND Desktop getestet werden!**

## Mobile Testing (<640px)

### Layout & Sichtbarkeit

- [ ] **Alle Buttons sind sichtbar**
  - Keine Buttons werden ausgeblendet (außer explizit gewünscht)
  - Buttons sind nicht durch Overflow versteckt
  - Buttons haben ausreichende Größe (mindestens 44x44px für Touch)

- [ ] **Alle Eingabefelder sind sichtbar**
  - Suchfeld ist sichtbar und nutzbar
  - Filter-Felder sind sichtbar
  - Formular-Felder sind sichtbar

- [ ] **Keine Überlappungen**
  - Elemente überlappen sich nicht
  - Text wird nicht abgeschnitten
  - Buttons sind vollständig sichtbar

- [ ] **Responsive Klassen verwendet**
  - ❌ FALSCH: `w-[200px]` (feste Breite)
  - ✅ RICHTIG: `w-full sm:w-[200px]` (responsive)
  - ❌ FALSCH: `text-sm` (feste Schriftgröße)
  - ✅ RICHTIG: `text-xs sm:text-sm` (responsive)

### Funktionalität

- [ ] **Suche funktioniert**
  - Suchfeld ist sichtbar
  - Suchfeld ist nutzbar
  - Suche filtert korrekt

- [ ] **Filter funktioniert**
  - Filter-Button ist sichtbar
  - FilterPane öffnet sich
  - Filter können angewendet werden
  - Filter werden korrekt angezeigt

- [ ] **View-Mode Toggle funktioniert**
  - Toggle-Button ist sichtbar
  - Toggle funktioniert
  - Tabelle-Ansicht wird korrekt angezeigt
  - Cards-Ansicht wird korrekt angezeigt

- [ ] **Spalten-Konfiguration funktioniert**
  - Config-Button ist sichtbar
  - Modal öffnet sich
  - Sichtbarkeit kann geändert werden
  - Änderungen werden gespeichert

- [ ] **Create-Button funktioniert**
  - Button ist sichtbar
  - Button öffnet Modal/Sidepane
  - Formular ist nutzbar

- [ ] **Sync-Button funktioniert (falls vorhanden)**
  - Button ist sichtbar
  - Button funktioniert
  - Loading-State wird angezeigt

### Tab-Navigation (falls vorhanden)

- [ ] **Tabs sind sichtbar**
  - Alle Tabs sind sichtbar
  - Tabs sind scrollbar (falls notwendig)

- [ ] **Tab-Wechsel funktioniert**
  - Tabs können geklickt werden
  - Tab-Wechsel lädt korrekte Daten
  - Tab-Wechsel funktioniert bei Mobile UND Desktop

- [ ] **Tab-Beschriftungen konsistent**
  - Gleiche Schriftgrößen für alle Tabs
  - Gleiche responsive Klassen: `text-xs sm:text-sm`
  - Gleiche `flex-shrink-0` Klasse

### Cards/Tabellen

- [ ] **Cards werden korrekt angezeigt**
  - Metadaten sind sichtbar
  - Layout ist korrekt
  - Keine Überlappungen

- [ ] **Tabellen werden korrekt angezeigt**
  - Spalten sind sichtbar
  - Horizontal scrollbar (falls notwendig)
  - Layout ist korrekt

## Desktop Testing (>1024px)

### Layout & Sichtbarkeit

- [ ] **Alle Funktionen verfügbar**
  - Alle Buttons sind sichtbar
  - Alle Eingabefelder sind sichtbar
  - Layout ist korrekt

### Funktionalität

- [ ] **Alle Funktionen funktionieren**
  - Suche funktioniert
  - Filter funktioniert
  - View-Mode Toggle funktioniert
  - Spalten-Konfiguration funktioniert
  - Create-Button funktioniert
  - Sync-Button funktioniert (falls vorhanden)

### Tab-Navigation (falls vorhanden)

- [ ] **Tabs funktionieren**
  - Alle Tabs sind sichtbar
  - Tab-Wechsel funktioniert
  - Tab-Beschriftungen konsistent

## Responsive Breakpoints

### Tailwind CSS Breakpoints

- **sm**: 640px (Tablet)
- **md**: 768px (Tablet Landscape)
- **lg**: 1024px (Desktop)
- **xl**: 1280px (Large Desktop)
- **2xl**: 1536px (Extra Large Desktop)

### Standard-Patterns

```tsx
// Responsive Breite
className="w-full sm:w-[200px]"

// Responsive Schriftgröße
className="text-xs sm:text-sm"

// Responsive Padding
className="px-3 sm:px-4 md:px-6"

// Responsive Display
className="hidden sm:block" // Nur bei Desktop sichtbar
className="block sm:hidden" // Nur bei Mobile sichtbar
```

## Häufige Fehler

### ❌ FALSCH: Feste Breite

```tsx
<input className="w-[200px] ..." />
```

### ✅ RICHTIG: Responsive Breite

```tsx
<input className="w-full sm:w-[200px] ..." />
```

### ❌ FALSCH: Button bei Mobile ausgeblendet

```tsx
<button className="hidden sm:block ...">
  Sync
</button>
```

### ✅ RICHTIG: Button immer sichtbar

```tsx
<button className="p-2 ...">
  <ArrowPathIcon className="h-5 w-5" />
</button>
```

### ❌ FALSCH: Inkonsistente Tab-Beschriftungen

```tsx
<button className="text-xs sm:text-sm ...">Tab 1</button>
<button className="text-sm ...">Tab 2</button>
```

### ✅ RICHTIG: Konsistente Tab-Beschriftungen

```tsx
<button className="text-xs sm:text-sm flex-shrink-0 ...">Tab 1</button>
<button className="text-xs sm:text-sm flex-shrink-0 ...">Tab 2</button>
```

## Test-Tools

### Browser DevTools

1. **Chrome DevTools**
   - F12 → Toggle Device Toolbar (Ctrl+Shift+M)
   - Verschiedene Geräte auswählen
   - Responsive-Modus aktivieren

2. **Firefox DevTools**
   - F12 → Responsive Design Mode (Ctrl+Shift+M)
   - Verschiedene Geräte auswählen

### Test-Geräte

- **Mobile**: 375px (iPhone SE), 390px (iPhone 12/13), 428px (iPhone 14 Pro Max)
- **Tablet**: 768px (iPad), 1024px (iPad Pro)
- **Desktop**: 1280px, 1920px

## Weitere Ressourcen

- [DESIGN_STANDARDS.md](DESIGN_STANDARDS.md) - Abschnitt "Responsive Design"
- [TAB_BASED_FEATURES.md](TAB_BASED_FEATURES.md) - Tab-basierte Features Richtlinien
- [IMPLEMENTATION_CHECKLIST.md](IMPLEMENTATION_CHECKLIST.md) - Vollständige Implementierungs-Checkliste

---

**WICHTIG:** Diese Checkliste ist VERBINDLICH. Features ohne vollständige Mobile- und Desktop-Tests werden NICHT akzeptiert!


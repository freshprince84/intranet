# Sidepane Top-Menü Ausrichtung - Implementierungsplan

## Problem-Analyse

### Aktueller Zustand
1. **Alle Sidepanes verwenden `top-16` (64px)** in ihrem HTML-Code
2. **CSS-Regel überschreibt IMMER auf `top: 5.25rem` (84px)** - auch wenn keine Zeiterfassung aktiv ist
3. **Grüne Schattierung** wird nur angezeigt, wenn `isTracking === true` in `Layout.tsx`
4. **Ergebnis**: Sidepanes haben IMMER einen 20px Abstand zum Top-Menü, auch wenn keine Zeiterfassung aktiv ist

### Betroffene Komponenten
Alle Sidepanes mit `top-16` und Klasse `sidepane-panel-container` sind betroffen:

**Gefundene betroffene Komponenten (ca. 40+):**
- `CreateReservationModal.tsx`
- `CreateRequestModal.tsx`
- `EditRequestModal.tsx`
- `CreateTaskModal.tsx`
- `EditTaskModal.tsx`
- `CreateOrganizationModal.tsx`
- `EditOrganizationModal.tsx`
- `JoinOrganizationModal.tsx`
- `ProcessJoinRequestModal.tsx`
- `CreateClientModal.tsx`
- `EditClientModal.tsx`
- `SendInvitationSidepane.tsx`
- `SendPasscodeSidepane.tsx`
- `PasswordEntrySidepane.tsx`
- `CreateTourModal.tsx`
- `EditTourModal.tsx`
- `CreateTourProviderModal.tsx`
- `EditTourProviderModal.tsx`
- `UserManagementTab.tsx`
- `RoleManagementTab.tsx`
- `BranchManagementTab.tsx`
- `EditWorktimeModal.tsx`
- `CreateShiftModal.tsx`
- `EditShiftModal.tsx`
- `GenerateShiftPlanModal.tsx`
- `SwapRequestModal.tsx`
- `SwapRequestList.tsx`
- `AvailabilityManagement.tsx`
- `ShiftTemplateManagement.tsx`
- `OffboardingStartModal.tsx`
- `OffboardingCompleteModal.tsx`
- `MonthlyReportsTab.tsx`
- `InvoiceManagementTab.tsx`
- `PriceRecommendationsTab.tsx`
- `PricingRulesTab.tsx`
- Und weitere...

### Technische Details

**CSS-Regel (aktuell - FALSCH):**
```css
/* index.css Zeile 1648-1652 */
.sidepane-panel-container[class*="top-16"],
.sidepane-panel-container.fixed.top-16,
div.fixed.top-16.bottom-0.right-0.sidepane-panel-container {
  top: 5.25rem !important; /* 84px - IMMER, auch ohne Zeiterfassung */
}
```

**Grüne Schattierung (Layout.tsx Zeile 51-54):**
```tsx
className={`flex ${
  isMobile ? 'h-[calc(100vh-4rem)] pb-16' : 'h-[calc(100vh-4rem)]'
} ${
  isTracking 
    ? 'shadow-[0_0_15px_5px_rgba(34,197,94,0.2)]' 
    : ''
} transition-shadow duration-300`}
```

**Schatten-Ausdehnung:**
- Blur: 15px
- Spread: 5px
- Max. Ausdehnung: 20px nach unten
- Header: 64px (4rem)
- Benötigter Platz bei aktiver Zeiterfassung: 64px + 20px = 84px (5.25rem)

## Ziel

1. **Sidepanes bündig mit Top-Menü** (64px) wenn **KEINE** Zeiterfassung aktiv ist
2. **Sidepanes mit 20px Abstand** (84px) wenn **Zeiterfassung aktiv** ist (für grünen Schatten)
3. **Code vereinfachen** - keine Duplikation, zentrale Lösung

## Lösung

### Schritt 1: CSS-Klasse auf `body` setzen
**Datei:** `frontend/src/components/Layout.tsx`

**Änderung:**
- `useEffect` hinzufügen, der `body` Klasse `worktime-tracking-active` hinzufügt/entfernt basierend auf `isTracking`
- Analog zu `body.sidepane-open` Pattern (bereits vorhanden in `index.css`)

**Code:**
```tsx
useEffect(() => {
  if (isTracking) {
    document.body.classList.add('worktime-tracking-active');
  } else {
    document.body.classList.remove('worktime-tracking-active');
  }
  
  return () => {
    document.body.classList.remove('worktime-tracking-active');
  };
}, [isTracking]);
```

### Schritt 2: CSS-Regel konditional machen
**Datei:** `frontend/src/index.css`

**Aktuelle Regel (Zeile 1648-1652) - ENTFERNEN:**
```css
.sidepane-panel-container[class*="top-16"],
.sidepane-panel-container.fixed.top-16,
div.fixed.top-16.bottom-0.right-0.sidepane-panel-container {
  top: 5.25rem !important; /* 84px - IMMER */
}
```

**Neue Regel - ERSETZEN:**
```css
/* Standard: Sidepanes bündig mit Top-Menü (64px) */
.sidepane-panel-container[class*="top-16"],
.sidepane-panel-container.fixed.top-16,
div.fixed.top-16.bottom-0.right-0.sidepane-panel-container {
  top: 4rem !important; /* 64px - Standard, bündig mit Top-Menü */
  transition: top 300ms ease-out !important; /* Smooth Transition für top-Änderung */
}

/* Bei aktiver Zeiterfassung: 20px Abstand für grünen Schatten (84px) */
body.worktime-tracking-active .sidepane-panel-container[class*="top-16"],
body.worktime-tracking-active .sidepane-panel-container.fixed.top-16,
body.worktime-tracking-active div.fixed.top-16.bottom-0.right-0.sidepane-panel-container {
  top: 5.25rem !important; /* 84px - Header (64px) + Schatten-Ausdehnung (20px) */
}
```

**WICHTIG: Transition für `top` hinzufügen**
- Sidepanes haben bereits `transition: transform` für Ein-/Ausfahren (Zeile 1608, 1629)
- `top`-Änderung benötigt ebenfalls Transition für smooth Animation
- Transition-Dauer: 300ms (entspricht grüner Schatten-Transition in Layout.tsx Zeile 54)

### Schritt 3: Code-Vereinfachung
**Keine Änderungen in einzelnen Sidepane-Komponenten nötig!**
- Alle Sidepanes verwenden bereits `top-16` und `sidepane-panel-container`
- CSS-Regel greift automatisch für alle
- Zentrale Lösung, keine Duplikation

## Implementierungsschritte

1. ✅ **Layout.tsx**: `useEffect` für `body` Klasse hinzufügen (Zeile 43-54)
2. ✅ **index.css**: CSS-Regel konditional machen (Standard 64px, mit Klasse 84px)
   - Standard-Regel: `top: 4rem` mit `transition: top 300ms ease-out`
   - Konditionale Regel: `top: 5.25rem` bei `body.worktime-tracking-active`
3. ✅ **Testen**: 
   - Sidepane öffnen ohne aktive Zeiterfassung → sollte bündig sein (64px)
   - Zeiterfassung starten → Sidepane sollte smooth 20px nach unten rutschen (84px)
   - Zeiterfassung stoppen → Sidepane sollte smooth wieder bündig sein (64px)
   - Transition sollte smooth sein (300ms)

## Vorteile

1. **Zentrale Lösung**: Eine CSS-Regel für alle Sidepanes
2. **Keine Duplikation**: Keine Änderungen in 40+ Komponenten nötig
3. **Automatisch**: Funktioniert für alle bestehenden und zukünftigen Sidepanes
4. **Performance**: CSS-basiert, keine JavaScript-Logik in jeder Komponente
5. **Wartbar**: Änderungen nur an einer Stelle (CSS)

## Risiken

**Niedrig:**
- CSS-Selektor-Spezifität: Höhere Spezifität durch `body.worktime-tracking-active` ist gewollt und korrekt
- `body` Klasse: Eindeutiger Name `worktime-tracking-active`, keine Kollisionen mit anderen Features
- Transition: `top`-Änderung benötigt Transition für smooth Animation (siehe Lösung)

## Performance-Impact

**Kein negativer Impact:**
- `document.body.classList.add/remove` ist native DOM-Operation, sehr performant (< 1ms)
- Keine Re-Renders, da nur DOM-Manipulation (nicht React State)
- CSS-basierte Lösung, keine JavaScript-Logik in jeder Komponente
- Transition wird von Browser optimiert (GPU-beschleunigt)

## Memory Leaks

**Keine Memory Leaks:**
- `useEffect` hat Cleanup-Funktion, die Klasse wird beim Unmount entfernt
- Pattern identisch zu `body.sidepane-open` in `SidepaneContext.tsx` (Zeile 41-61)
- Keine Event-Listener, keine Subscriptions, keine Intervals
- Cleanup entfernt Klasse auch wenn Layout während aktiver Zeiterfassung unmounted wird

## Übersetzungen, Notifications, Berechtigungen

**Nicht relevant:**
- Keine Übersetzungen nötig (nur CSS-Klasse, kein UI-Text)
- Keine Notifications nötig (visuelle Anpassung, keine Benachrichtigung)
- Keine Berechtigungen nötig (Layout-Anpassung, keine Funktionalität)

## Mobile-Verhalten

**Nicht betroffen:**
- Mobile Sidepanes (< 640px) werden als Modals dargestellt, nicht als Sidepanes
- CSS-Regel greift nur für Desktop (≥ 640px) mit `top-16` Klasse
- Mobile Modals verwenden `Dialog` Komponente, haben kein `top-16`
- Keine Änderungen für Mobile nötig

## Testing-Checkliste

- [ ] Sidepane öffnen ohne aktive Zeiterfassung → bündig mit Top-Menü (64px)
- [ ] Zeiterfassung starten → Sidepane hat 20px Abstand (84px) mit smooth Transition (300ms)
- [ ] Zeiterfassung stoppen → Sidepane wieder bündig (64px) mit smooth Transition (300ms)
- [ ] Mehrere Sidepanes testen (CreateTaskModal, CreateRequestModal, EditTaskModal, etc.)
- [ ] Desktop (≥ 640px): Sidepane-Verhalten prüfen
- [ ] Mobile (< 640px): Modals nicht betroffen, Verhalten unverändert
- [ ] Dark Mode prüfen (keine Auswirkungen erwartet)
- [ ] Übergangsanimation prüfen (sollte smooth sein, 300ms)
- [ ] Layout unmount während aktiver Zeiterfassung → Klasse wird entfernt (Cleanup)
- [ ] Browser-DevTools: `body.worktime-tracking-active` Klasse erscheint/verschwindet korrekt

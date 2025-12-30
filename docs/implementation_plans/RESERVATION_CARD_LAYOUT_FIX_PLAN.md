# Reservation Card Layout Fix - Implementierungsplan

## Problem-Analyse

### Desktop-Ansicht Probleme:

1. **`header-right` Items (Zimmer, Check-in/Check-out) werden falsch positioniert**
   - Aktuell: Werden in separatem Bereich ÜBER dem Titel angezeigt (rotes Quadrat)
   - Sollte: Rechts oben sein, wo Status-Informationen sind (grünes Quadrat)
   - Code: `DataCard.tsx` Zeile 524-536

2. **Rechte Metadaten (Status, Betrag, etc.) sind nicht vertikal bündig**
   - Aktuell: Grid-Layout mit `grid-cols-[auto_auto]` richtet nicht vertikal bündig aus
   - Sollte: Labels rechtsbündig untereinander, Werte rechtsbündig untereinander
   - Code: `DataCard.tsx` Zeile 699-710

3. **`header-right` Items sollten in rechter Spalte sein**
   - Aktuell: Werden als separate Section behandelt
   - Sollte: Teil der rechten Spalte sein (zusammen mit Status, Betrag, etc.)
   - Code: `Worktracker.tsx` Zeile 3058-3072

### Mobile-Ansicht Probleme:

1. **`header-right` Items werden chaotisch angezeigt**
   - Aktuell: Werden in Zeile 1 rechts angezeigt, ohne Labels
   - Sollte: Gleiche Struktur wie Desktop, nur kompakter
   - Code: `DataCard.tsx` Zeile 476-485

2. **Rechte Metadaten sind nicht vertikal bündig**
   - Aktuell: Flexbox-Layout, Labels und Werte nicht vertikal bündig
   - Sollte: Gleiche Grid-Struktur wie Desktop
   - Code: `DataCard.tsx` Zeile 501-518

3. **Inkonsistente Struktur zwischen Mobile und Desktop**
   - Problem: Verschiedene Layouts führen zu Verschiebungen
   - Sollte: Konsistente Struktur für alle Bildschirmgrößen

## Ziel-Layout

### Desktop-Ansicht:
```
┌─────────────────────────────────────────────────────────────┐
│ [Name links]                    [Zimmer] [Check-in/Check-out]│
│ [ID]                            [Status: Badge]              │
│                                 [Payment: Badge]              │
│                                 [Betrag: Wert]                │
│                                 [TTLock: Wert]               │
│                                 [Buttons unten]               │
│ [Email]                                                      │
│ [Phone]                                                      │
│ [Branch]                                                     │
│                                 [Payment Link]                │
│                                 [Check-in Link]               │
└─────────────────────────────────────────────────────────────┘
```

### Mobile-Ansicht:
```
┌─────────────────────────────────────┐
│ [Zimmer] [Check-in/Check-out]       │
│ [Name]                    [Status]  │
│ [ID]                                │
│ [Email]                             │
│ [Phone]                             │
│ [Branch]                            │
│                    [Payment: Badge] │
│                    [Betrag: Wert]   │
│                    [TTLock: Wert]   │
│                    [Buttons]        │
│                    [Payment Link]   │
│                    [Check-in Link]   │
└─────────────────────────────────────┘
```

## Implementierungsplan

### Schritt 1: `header-right` Section entfernen und in rechte Spalte integrieren

**Datei:** `frontend/src/components/shared/DataCard.tsx`

1. **Entfernen:** Zeile 524-536 (separate `header-right` Section)
2. **Ändern:** Rechte Spalte im 3-Spalten-Layout erweitern, um `header-right` Items oben anzuzeigen

### Schritt 2: Grid-Layout für rechte Metadaten korrigieren

**Datei:** `frontend/src/components/shared/DataCard.tsx`

1. **Ändern:** Zeile 699-710
   - Grid-Layout so anpassen, dass Labels und Werte in separaten Spalten sind
   - Labels rechtsbündig, Werte rechtsbündig
   - Vertikal bündig untereinander

**Neue Struktur:**
```tsx
<div className="flex flex-col items-end gap-2">
  {/* header-right Items oben */}
  {metadata.filter(item => item.section === 'header-right').map(...)}
  
  {/* Status, Betrag, etc. in Grid */}
  <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 items-center">
    {metadata.filter(item => item.section === 'right').map((item, index) => (
      <>
        <div className="text-right">{item.label}</div>
        <div className="text-right">{item.value}</div>
      </>
    ))}
  </div>
  
  {/* Action Buttons unten */}
  {actions && <div>{actions}</div>}
</div>
```

### Schritt 3: Mobile-Ansicht auf Grid-Struktur umstellen

**Datei:** `frontend/src/components/shared/DataCard.tsx`

1. **Ändern:** Zeile 476-485
   - `header-right` Items oben rechts anzeigen (mit Labels)
   
2. **Ändern:** Zeile 501-518
   - Flexbox durch Grid-Layout ersetzen
   - Gleiche Struktur wie Desktop

### Schritt 4: Worktracker.tsx - Section-Zuordnung korrigieren

**Datei:** `frontend/src/pages/Worktracker.tsx`

1. **Prüfen:** Zeile 3058-3072
   - `header-right` Section beibehalten (wird jetzt in rechter Spalte gerendert)
   - Oder: In `right` Section umwandeln mit speziellem Flag für "oben"

### Schritt 5: Action Buttons Position korrigieren

**Datei:** `frontend/src/components/shared/DataCard.tsx`

1. **Prüfen:** Zeile 770-777
   - Action Buttons sollten in rechter Spalte unten sein (nicht außerhalb)
   - Nur wenn 3-Spalten-Layout aktiv ist

## Technische Details

### Grid-Layout für vertikale Bündigkeit:

```tsx
<div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 items-center">
  {/* Label Spalte */}
  <div className="text-right">Estado:</div>
  <div className="text-right">Estado de Pago:</div>
  <div className="text-right">Betrag:</div>
  
  {/* Wert Spalte */}
  <div className="text-right">Badge/Wert</div>
  <div className="text-right">Badge/Wert</div>
  <div className="text-right">Wert</div>
</div>
```

### Responsive Verhalten:

- **Desktop (sm+):** 3-Spalten-Layout mit Grid für rechte Spalte
- **Mobile (<sm):** Gleiche Struktur, nur kompakter (kleinere Abstände, kleinere Schrift)

## Test-Checkliste

- [ ] Desktop: Zimmer und Check-in/Check-out rechts oben (wo Status ist)
- [ ] Desktop: Status, Betrag, etc. vertikal bündig ausgerichtet
- [ ] Desktop: Action Buttons unten in rechter Spalte
- [ ] Mobile: Gleiche Struktur wie Desktop
- [ ] Mobile: Alles bleibt an Position, nichts verschiebt sich
- [ ] Alle Bildschirmgrößen: Konsistente Ausrichtung


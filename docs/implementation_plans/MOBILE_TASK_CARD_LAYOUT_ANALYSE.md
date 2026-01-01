# Mobile Task Card Layout - Analyse und Planung

## Problemstellung

Auf Mobile-Bildschirmen geraten bei der Card-Ansicht für **Requests & To Do's** Titel und alle weiteren Informationen auf einer Zeile ineinander. Das Layout muss auf 2 Zeilen aufgeteilt werden, ähnlich wie bei den Reservations Cards.

## Aktuelle Implementierung (Tasks/To Do's)

### Card-Metadaten-Struktur (Worktracker.tsx, Zeilen 2869-2933)

**Aktuell verwendete Sections:**
1. **`section: 'left'`** - Niederlassung (Branch)
2. **`section: 'main'`** - Verantwortlicher (Responsible) & Qualitätskontrolle (Quality Control)
3. **`section: 'right-inline'`** - Fälligkeitsdatum (Due Date)
4. **`section: 'full'`** - Beschreibung (Description)

**Zusätzliche Elemente:**
- **`title`** - Task-ID und Titel (z.B. "278: Revisar inventario...")
- **`status`** - Status-Badge (z.B. "Abierto")
- **`actions`** - Action-Buttons (Status-Buttons, Edit, Copy)

### Aktuelles Mobile-Layout (DataCard.tsx, Zeilen 465-498)

**Zeile 1 (aktuelle Implementierung):**
- **Links:** Resp/QC nebeneinander
- **Rechts:** Titel + Datum + Status

**Problem:** Alles gerät auf einer Zeile ineinander, da zu viele Elemente auf einmal angezeigt werden.

## Vergleich: Reservations Cards (funktioniert gut)

### Reservations Card-Metadaten-Struktur (Worktracker.tsx, Zeilen 3052-3197)

**Verwendete Sections:**
1. **`section: 'header-right'`** - Zimmer & Check-in/Check-out (oben, über dem Titel)
2. **`section: 'left'`** - Telefon/Email/Branch (links, unter Titel)
3. **`section: 'center'`** - Zahlungslink/Check-in Link (mitte)
4. **`section: 'right'`** - Status Badges (rechts)

**Mobile-Layout für Reservations (DataCard.tsx, Zeilen 649-663):**
- **Zeile 1:** Titel + Datum (header-right)
- **Zeile 2:** 3-Spalten-Layout (left, center, right)

## Analyse: Alle Card-Infos für Tasks/To Do's

### Elemente, die NICHT verändert werden:

1. **Beschreibung (`section: 'full'`)** - Bleibt wie gehabt, ganz unten in der Card
2. **Action-Buttons (`actions`)** - Bleiben wie gehabt, ganz unten rechts
3. **Niederlassung (`section: 'left'`)** - Bleibt wie gehabt, wird aktuell nicht auf Mobile angezeigt (nur Desktop)

### Elemente, die auf Mobile angezeigt werden (aktuell):

1. **Verantwortlicher (`section: 'main'`)** - Aktuell links in Zeile 1
2. **Qualitätskontrolle (`section: 'main'`)** - Aktuell links in Zeile 1, direkt nach Verantwortlicher
3. **Titel (`title`)** - Aktuell rechts in Zeile 1
4. **Fälligkeitsdatum (`section: 'right-inline'`)** - Aktuell rechts in Zeile 1, neben Titel
5. **Status (`status`)** - Aktuell rechts in Zeile 1, neben Datum

## Planung: 2-Zeilen-Layout für Tasks/To Do's

### Zeile 1 (Obere Zeile):

**Links:**
- Verantwortlicher (Responsible)
- Qualitätskontrolle (Quality Control)

**Rechts:**
- Status-Badge

### Zeile 2 (Untere Zeile):

**Links:**
- Titel (Task-ID + Titel-Text)

**Rechts:**
- Fälligkeitsdatum (Due Date)

## Begründung der Aufteilung

**Zeile 1 (Oben):**
- **Verantwortlicher & Qualitätskontrolle** - Wichtige Zuordnungsinformationen, kompakt nebeneinander
- **Status** - Wichtige visuelle Information, rechts ausgerichtet für schnelle Erkennung

**Zeile 2 (Unten):**
- **Titel** - Kann lang sein, benötigt mehr Platz, links ausgerichtet für Lesbarkeit
- **Fälligkeitsdatum** - Wichtige zeitliche Information, rechts ausgerichtet

## Technische Umsetzung

### Änderungen in DataCard.tsx

**Mobile-Layout für Tasks/To Do's (wenn `hasCenterSection === false`):**

**Zeile 1:**
- Links: `section: 'main'` (Verantwortlicher & Qualitätskontrolle)
- Rechts: `status` (Status-Badge)

**Zeile 2:**
- Links: `title` (Titel)
- Rechts: `section: 'right-inline'` (Fälligkeitsdatum)

### Code-Struktur (zu implementieren)

```tsx
{/* Mobile Layout für Tasks/To Do's - 2 Zeilen */}
<div className="block sm:hidden">
  {/* Zeile 1: Resp/QC links, Status rechts */}
  <div className="flex items-center justify-between gap-2 mb-2">
    {/* Links: Resp und QC nebeneinander */}
    <div className="flex items-center gap-2 flex-1 min-w-0">
      {metadata.filter(item => item.section === 'main').map((item, index) => 
        renderMetadataItem(item, index, 'mobile')
      )}
    </div>
    {/* Rechts: Status */}
    {renderStatus(status, 'mobile', t)}
  </div>
  
  {/* Zeile 2: Titel links, Datum rechts */}
  <div className="flex items-center justify-between gap-2 mb-2">
    {/* Links: Titel */}
    <div className="flex-1 min-w-0">
      {renderTitle(title, subtitle, 'mobile')}
    </div>
    {/* Rechts: Datum */}
    <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap flex-shrink-0">
      {metadata.filter(item => item.section === 'right-inline').map((item, index) => (
        <div key={index} className="flex items-center gap-1">
          {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
          <span className={item.className || 'text-gray-900 dark:text-white'}>
            {typeof item.value === 'string' ? item.value : item.value}
          </span>
        </div>
      ))}
    </div>
  </div>
</div>
```

## Zusammenfassung

**Nicht verändert:**
- Beschreibung (`section: 'full'`)
- Action-Buttons (`actions`)
- Niederlassung (`section: 'left'`) - bleibt Desktop-only

**Zeile 1 (Oben):**
- Links: Verantwortlicher + Qualitätskontrolle
- Rechts: Status

**Zeile 2 (Unten):**
- Links: Titel
- Rechts: Fälligkeitsdatum


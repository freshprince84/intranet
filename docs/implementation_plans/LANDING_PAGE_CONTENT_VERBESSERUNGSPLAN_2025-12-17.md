# Landing Page Content-Verbesserungsplan - Schritt für Schritt
**Datum:** 2025-12-17  
**Status:** Plan erstellt, bereit für Umsetzung

## Übersicht

Dieser Plan beschreibt die schrittweise Content-Optimierung und Screenshot-Verbesserung der Landing Page. Fokus liegt auf Benefit-fokussiertem Content und optimierten Screenshot-Ausschnitten.

## Phase 1: Content-Optimierung (Priorität: 🔴 HOCH)

### Schritt 1.1: Hero Subline optimieren

**Problem:** Subline zu lang (78 Wörter), Feature-fokussiert statt Benefit-fokussiert

**Aktuell:**
```
"Zeiterfassung, Aufgaben, Wissen, Abrechnung und KI-gestützte Automatisierung in einer Oberfläche – mobil und im Haus einsetzbar."
```

**Verbessert (Option A - Benefit-fokussiert):**
```
"Mehr Produktivität, weniger Chaos. Alles in einer Oberfläche – für Teams, die effizienter arbeiten wollen."
```

**Verbessert (Option B - Problem-Lösung):**
```
"Schluss mit verstreuten Tools. Ein System für Zeiten, Aufgaben, Wissen und Abrechnung – mobil und im Haus."
```

**Empfehlung:** Option A (Benefit-fokussiert, kürzer, klarer)

**Code-Änderungen:**
```json
// de.json
"subline": "Mehr Produktivität, weniger Chaos. Alles in einer Oberfläche – für Teams, die effizienter arbeiten wollen."

// en.json
"subline": "More productivity, less chaos. Everything in one interface – for teams who want to work more efficiently."

// es.json
"subline": "Más productividad, menos caos. Todo en una interfaz – para equipos que quieren trabajar de manera más eficiente."
```

### Schritt 1.2: Feature-Beschreibungen: Benefit statt Feature

**Problem:** Feature-Liste statt Benefit-Fokus

**Aktuell:**
- "Tasks mit Statuslauf, Verantwortlichen, QC, gespeicherten Filtern und Notifications."
- "Arbeitszeiten live starten/stoppen, Zeitzonen-sicher, Statistiken pro Branch."

**Verbessert:**
- "Aufgaben im Blick behalten – nie wieder etwas vergessen. Mit klaren Verantwortlichkeiten und automatischen Benachrichtigungen."
- "Arbeitszeiten automatisch erfassen – präzise, zeitzonen-sicher, mit klaren Statistiken."

**Code-Änderungen:**
```json
// de.json
"worktracker": "Aufgaben im Blick behalten – nie wieder etwas vergessen. Mit klaren Verantwortlichkeiten und automatischen Benachrichtigungen.",
"worktime": "Arbeitszeiten automatisch erfassen – präzise, zeitzonen-sicher, mit klaren Statistiken.",
"teamControl": "Team-Performance im Überblick – Arbeitszeiten steuern, Auswertungen exportieren, Fehler vermeiden.",
"cerebro": "Wissen zentral sichern – Markdown-Wiki mit Struktur, Medien und Verlinkung zu Tasks.",
"workflow": "Prozesse automatisieren – klare Workflows entlang von Rollen und Status.",
"consultations": "Beratungszeiten präzise erfassen – revisionssicher, ohne Nacharbeit.",
"invoices": "Rechnungen automatisch erstellen – Swiss-QR-Rechnungen, Monatsberichte, Anti-Doppel-Billing.",
"documentRecognition": "Dokumente automatisch verarbeiten – KI-Extraktion, Validierung, Profil-Verknüpfung.",
"filters": "Daten schnell finden – gespeicherte Filter mit UND/ODER-Logik.",
"lobbypms": "Check-in/Check-out automatisieren – LobbyPMS/TTLock-Integration.",
"mobile": "Unterwegs produktiv bleiben – Mobile App für Zeiten, Tasks und Benachrichtigungen."
```

### Schritt 1.3: Audience Bullet Points: Benefit-fokussiert

**Problem:** Feature-fokussiert, nicht Benefit-fokussiert

**Aktuell:**
- "Schicht- und Arbeitszeiten live steuern (Zeiterfassung, Teamkontrolle)."
- "Beratungen tracken (Start/Stop oder manuell) mit Clients und Notizen."

**Verbessert:**
- "Schichten im Griff: Arbeitszeiten live steuern, Fehler reduzieren, Transparenz schaffen."
- "Beratungszeiten präzise erfassen – revisionssicher, ohne Nacharbeit."

**Code-Änderungen:**
```json
// de.json
"hospitality": {
  "point1": "Schichten im Griff: Arbeitszeiten live steuern, Fehler reduzieren, Transparenz schaffen.",
  "point2": "Housekeeping optimieren: Tasks mit Statuslauf, automatischen Benachrichtigungen und klaren Verantwortlichkeiten.",
  "point3": "Check-in/Check-out automatisieren: LobbyPMS/TTLock-Integration für reibungslose Abläufe."
},
"consulting": {
  "point1": "Beratungszeiten präzise erfassen – revisionssicher, ohne Nacharbeit.",
  "point2": "Rechnungen automatisch erstellen: Swiss-QR-Rechnungen und Monatsberichte ohne Doppel-Billing.",
  "point3": "Wissen zentral sichern: Cerebro-Wiki und Tasks für Deliverables."
}
```

## Phase 2: Screenshot-Optimierung (Priorität: 🔴 HOCH)

### Schritt 2.1: Playwright-Script für optimierte Ausschnitte

**Problem:** Screenshots zeigen Vollbilder, nicht Ausschnitte

**Lösung:** Playwright-Script erweitern für präzise Ausschnitte

**Code-Änderungen:**
```javascript
// scripts/capture-landing-screenshots.js

// Worktracker: Task-Liste ohne Navigation/Header
const worktrackerMain = await page.$('main, [role="main"], .container');
if (worktrackerMain) {
  // Suche Task-Liste oder Filter-Bereich
  const taskList = await page.$('.task-list, table, [class*="task"], [class*="filter"]');
  if (taskList) {
    const boundingBox = await taskList.boundingBox();
    if (boundingBox) {
      // Fokus auf Task-Liste (ohne Navigation)
      await page.screenshot({
        path: path.join(OUTPUT_DIR, 'worktracker.png'),
        clip: {
          x: Math.max(0, boundingBox.x - 50), // Etwas mehr Kontext
          y: Math.max(0, boundingBox.y),
          width: Math.min(boundingBox.width + 100, 1200),
          height: Math.min(boundingBox.height, 600)
        }
      });
    }
  }
}

// Consultations: Formular oder Liste
const consultationsForm = await page.$('form, .consultation-form, .consultation-list');
if (consultationsForm) {
  const boundingBox = await consultationsForm.boundingBox();
  if (boundingBox) {
    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'consultations.png'),
      clip: {
        x: Math.max(0, boundingBox.x - 50),
        y: Math.max(0, boundingBox.y),
        width: Math.min(boundingBox.width + 100, 1200),
        height: Math.min(boundingBox.height, 600)
      }
    });
  }
}

// Document Recognition: Upload-Interface
const documentUpload = await page.$('.upload, [class*="upload"], [class*="document"], form');
if (documentUpload) {
  const boundingBox = await documentUpload.boundingBox();
  if (boundingBox) {
    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'document-recognition.png'),
      clip: {
        x: Math.max(0, boundingBox.x - 50),
        y: Math.max(0, boundingBox.y),
        width: Math.min(boundingBox.width + 100, 1200),
        height: Math.min(boundingBox.height, 600)
      }
    });
  }
}

// Team Worktime: Team-Übersicht
const teamTable = await page.$('table, .team-list, [class*="team"], [class*="worktime"]');
if (teamTable) {
  const boundingBox = await teamTable.boundingBox();
  if (boundingBox) {
    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'team-worktime.png'),
      clip: {
        x: Math.max(0, boundingBox.x - 50),
        y: Math.max(0, boundingBox.y),
        width: Math.min(boundingBox.width + 100, 1200),
        height: Math.min(boundingBox.height, 600)
      }
    });
  }
}

// Cerebro: Wiki-Editor
const cerebroEditor = await page.$('.editor, textarea, [class*="editor"], [class*="wiki"], [contenteditable="true"]');
if (cerebroEditor) {
  const boundingBox = await cerebroEditor.boundingBox();
  if (boundingBox) {
    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'cerebro.png'),
      clip: {
        x: Math.max(0, boundingBox.x - 50),
        y: Math.max(0, boundingBox.y),
        width: Math.min(boundingBox.width + 100, 1200),
        height: Math.min(boundingBox.height, 600)
      }
    });
  }
}
```

### Schritt 2.2: Screenshots neu erstellen

**Vorgehen:**
1. Playwright-Script ausführen: `node scripts/capture-landing-screenshots.js`
2. Screenshots werden als Ausschnitte erstellt
3. Optimierte Dimensionen (1200x600px)

**Ergebnis:** Screenshots zeigen nur wichtige Bereiche, nicht komplette Module

### Schritt 2.3: Screenshot-Beschreibungen verbessern

**Problem:** Beschreibungstexte zu klein/unauffällig

**Lösung:** Größere, klarere Beschreibungen

**Code-Änderungen:**
```tsx
// Vorher
<p className="text-sm text-gray-600 dark:text-gray-400 text-center">{t('landing.features.screenshots.teamControl')}</p>

// Nachher
<div className="mt-4 text-center">
  <p className="text-base font-medium text-gray-900 dark:text-gray-100">{t('landing.features.screenshots.teamControl')}</p>
  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('landing.features.screenshots.teamControlDesc')}</p>
</div>
```

**Neue Übersetzungen:**
```json
// de.json
"screenshots": {
  "teamControl": "Team-Übersicht",
  "teamControlDesc": "Arbeitszeiten im Überblick, Laufzeiten stoppen, Auswertungen exportieren.",
  "cerebro": "Wiki-Editor",
  "cerebroDesc": "Markdown-Wiki mit Struktur, Medien und Verlinkung zu Tasks.",
  "mobile": "Mobile-Interface",
  "mobileDesc": "Unterwegs produktiv bleiben – Zeiten, Tasks und Benachrichtigungen."
}
```

## Phase 3: Content-Struktur Verbesserungen (Priorität: 🟡 MITTEL)

### Schritt 3.1: Social Proof verbessern

**Problem:** Zu generisch, keine echten Namen

**Lösung:** Konkretere Reviews, echte Namen (optional)

**Code-Änderungen:**
```json
// de.json
"proof": {
  "review1": "Seit wir das Intranet nutzen, laufen Schichtwechsel sauberer. Housekeeping ist immer aktuell, und die Check-in-Automation spart uns täglich Stunden am Frontdesk.",
  "review2": "Beratungsstunden sind jetzt revisionssicher erfasst. QR-Rechnungen und Monatsberichte gehen ohne Nacharbeit raus – das spart uns enorm Zeit."
}
```

### Schritt 3.2: FAQ verbessern

**Problem:** Antworten zu technisch

**Lösung:** Benefit-orientierte Antworten

**Code-Änderungen:**
```json
// de.json
"faq": {
  "integration": {
    "a": "LobbyPMS/TTLock ist bereits vorbereitet. Weitere Integrationen klären wir im Onboarding – meist geht es schnell."
  },
  "support": {
    "a": "Support direkt über das Intranet, klar priorisiert. Wissen liegt im Cerebro-Wiki – alles an einem Ort."
  },
  "security": {
    "a": "Sicherheit steht an erster Stelle: Rollen/Berechtigungen, Audits, Validierung bei KI-Uploads, HTTPS-only."
  },
  "onboarding": {
    "a": "Onboarding geht schnell: In der Regel wenige Stunden für Branches, Rollen und Standardfilter – dann kann es losgehen."
  }
}
```

## Implementierungs-Reihenfolge

1. ✅ **Phase 1.1**: Hero Subline optimieren
2. ✅ **Phase 1.2**: Feature-Beschreibungen (Benefit statt Feature)
3. ✅ **Phase 1.3**: Audience Bullet Points (Benefit-fokussiert)
4. ✅ **Phase 2.1**: Playwright-Script für Ausschnitte erweitern
5. ✅ **Phase 2.2**: Screenshots neu erstellen
6. ✅ **Phase 2.3**: Screenshot-Beschreibungen verbessern
7. ✅ **Phase 3.1**: Social Proof verbessern
8. ✅ **Phase 3.2**: FAQ verbessern

## Erfolgs-Kriterien

### Content
- ✅ Value Proposition klar (max. 20 Wörter)
- ✅ Benefits statt Features
- ✅ Einfache Sprache (kein Jargon)
- ✅ Klare CTAs

### Screenshots
- ✅ Ausschnitte statt Vollbilder
- ✅ Lesbar auf Mobile
- ✅ Features hervorgehoben
- ✅ Klare Beschreibungen

## Testing-Checkliste

- [ ] Content auf Deutsch/Englisch/Spanisch prüfen
- [ ] Screenshots auf Mobile lesbar
- [ ] Screenshots zeigen wichtige Features
- [ ] Beschreibungstexte klar und verständlich
- [ ] Value Proposition klar kommuniziert

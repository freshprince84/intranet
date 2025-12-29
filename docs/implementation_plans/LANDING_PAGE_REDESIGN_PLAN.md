# Landing Page Redesign - Implementierungsplan

## 1. Analyse & Zielsetzung

**Aktueller Status:**
- Die Landing Page ist funktional, aber visuell überladen.
- Zu viele kleinteilige Informationen (Icons, Listen, kleine Texte).
- "Busy" Layout mit Slidern, Formularen und vielen Sektionen.
- Wirkt eher wie eine klassische SaaS-Marketing-Seite (Feature-Listen), weniger wie ein modernes Produkt-Showcase (Apple-Style).

**Ziel ("Apple-Like"):**
- **Radikale Reduktion:** Fokus auf das Wesentliche. Weniger ist mehr.
- **Visuelle Hierarchie:** Große Typografie, riesige Produktbilder, viel Weißraum (Whitespace).
- **Stimmung:** Hochwertig, ruhig, aufgeräumt.
- **Struktur:**
  - Hero mit starkem Statement und einem zentralen Visual.
  - Bento-Grid für Features (visuelle Karten statt Listen).
  - Scroll-basiertes Storytelling.

## 2. Design-Konzept

### 2.1 Visuelle Sprache
- **Typografie:** System Fonts (San Francisco), `tracking-tight` für Headlines, `text-balance` für Fließtext. Extreme Größenunterschiede (Headline sehr groß, Label sehr klein/dezent).
- **Farben:** Viel Weiß/Grau (`bg-white`, `bg-gray-50`), subtile Ränder (`border-gray-100`), starke Schatten nur für "schwebende" Elemente. Akzentfarbe (Blau) nur gezielt für CTAs.
- **Komponenten:**
  - **Glassmorphismus:** Header und schwebende Panels mit `backdrop-blur-xl bg-white/70`.
  - **Bento Grids:** Feature-Cluster in abgerundeten Karten (`rounded-3xl`), die den Bildschirm füllen.
  - **Device Frames:** Die vorhandenen `DeviceFrame` Komponenten werden zentrales Element.

### 2.2 Struktur-Änderungen
- **ENTFERNEN:**
  - Stats-Grid (zu technisch/langweilig).
  - Swiper/Slider im Hero (ablenkend, statisches Hero-Image ist stärker).
  - Audience-Listen (implizit durch Features erklären).
  - FAQ-Accordion (auf separate Seite oder ganz weg für Landing).
  - Direktes Kontaktformular (ersetzen durch CTA zu separater Seite/Modal).
- **HINZUFÜGEN:**
  - **Hero:** Zentrierte, massive Headline + Subline + 2 CTAs. Darunter ein riesiges, angeschnittenes Browser-Fenster, das "aus dem Screen kommt".
  - **Bento Grid:** 2-3 Reihen von Grid-Layouts für die Features.

## 3. Schritt-für-Schritt Implementierung

### Phase 1: Bereinigung & Vorbereitung
1.  **Cleanup:** Entfernen der Komponenten `Stats`, `Audiences`, `FAQ`, `Form` aus dem Main-Flow.
2.  **Asset-Check:** Sicherstellen, dass die Bilder (`IMG_WORKTRACKER` etc.) hochauflösend genug für große Darstellungen sind.

### Phase 2: Neuer Hero-Bereich
1.  **Layout:** Zentriertes Layout mit maximaler Breite.
2.  **Typo:** Headline `text-6xl sm:text-7xl font-semibold tracking-tight`. Subline `text-xl text-gray-500 max-w-2xl mx-auto`.
3.  **Visual:** `DeviceFrame` (Browser) mit dem Haupt-Dashboard-Screenshot (`IMG_WORKTRACKER` oder `IMG_TEAM`).
4.  **Animation:** Initiales Einblenden (`opacity: 0, y: 20` -> `opacity: 1, y: 0`) mit `framer-motion`.

### Phase 3: Bento Grid "Operations & Management"
1.  **Container:** `grid grid-cols-1 md:grid-cols-3 gap-6`.
2.  **Karte 1 (Groß, 2 Spalten):** "Team Control" – Bild im Fokus, Text overlay oder darunter.
3.  **Karte 2 (Hochkant, 1 Spalte):** "Mobile App" – `DeviceFrame` (Phone), Hintergrund leicht grau (`bg-gray-50`).
4.  **Karte 3 (1 Spalte):** "Worktracker" – Fokus auf Zeiterfassung.

### Phase 4: Bento Grid "Intelligence & Finance"
1.  **Karte 1 (1 Spalte):** "AI Document Recognition" – Icon + Abstract Visual.
2.  **Karte 2 (Groß, 2 Spalten):** "Consultations & Billing" – Browser-Frame mit Rechnungsansicht.
3.  **Karte 3 (1 Spalte):** "Cerebro" – Wiki/Wissen.

### Phase 5: Footer & CTA
1.  **Pre-Footer:** Großer, zentrierter CTA-Bereich ("Ready to start?"). Keine Formularfelder, nur "Get Started" Button.
2.  **Footer:** Minimalistisch, Links grau, Copyright.

## 4. Technische Details

- **Spacing:** Nutzung von `space-y-32` für großen vertikalen Abstand zwischen Sektionen.
- **Radius:** `rounded-3xl` für alle Karten.
- **Shadows:** `shadow-xl` für schwebende Elemente, `shadow-sm` für Karten.
- **Übersetzungen:** Alle Texte müssen weiterhin über `t()` geladen werden. Vorhandene Keys wiederverwenden oder generische neue Keys in `de.json` anlegen (wir machen hier aber primär Layout-Umbau, Text-Anpassungen folgen dem Bestand wo möglich).

## 5. Durchführung

**Schritt 1:** Backup der aktuellen `LandingPage.tsx` (oder einfach git checkout möglich, aber wir arbeiten direkt).
**Schritt 2:** Leeren des `main` Bereichs und Aufbau der neuen Struktur Section für Section.
**Schritt 3:** Styling-Anpassungen (Apple-Look).


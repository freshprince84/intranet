# Landing Page Verbesserungsplan
**Datum:** 2025-12-17  
**Status:** Plan erstellt, bereit für Umsetzung

## Übersicht

Dieser Plan beschreibt die schrittweise Verbesserung der Landing Page basierend auf der Design-Analyse. Fokus liegt auf Screenshot-Optimierung, Design-Verbesserungen und Content-Optimierung.

## Phase 1: Screenshot-Optimierung (Priorität: HOCH)

### Schritt 1.1: Playwright-Script für Ausschnitte erweitern

**Ziel:** Screenshots mit Fokus auf wichtige Features statt Vollbilder

**Vorgehen:**
1. Playwright-Script erweitern (`scripts/capture-landing-screenshots.js`)
2. Für jedes Modul spezifische Bereiche definieren:
   - **Worktracker**: Task-Liste mit Filter (ohne Navigation/Header)
   - **Consultations**: Consultation-Formular (ohne Navigation)
   - **Document Recognition**: Upload-Interface mit Erkennung
   - **Team Worktime**: Team-Übersicht mit Statistiken
   - **Cerebro**: Wiki-Editor mit Content
   - **Mobile**: Mobile-Interface (falls vorhanden)

**Code-Änderungen:**
```javascript
// Beispiel für Worktracker-Ausschnitt
await page.goto(`${BASE_URL}/app/worktracker`, { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);

// Element finden (Task-Liste)
const taskList = await page.$('[data-testid="task-list"], .task-list, main > div');
if (taskList) {
  const boundingBox = await taskList.boundingBox();
  if (boundingBox) {
    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'worktracker.png'),
      clip: {
        x: boundingBox.x,
        y: boundingBox.y,
        width: Math.min(boundingBox.width, 1200),
        height: Math.min(boundingBox.height, 600)
      }
    });
  }
}
```

**Ergebnis:** 6 optimierte Screenshots mit Fokus auf Features

### Schritt 1.2: Screenshot-Dimensionen erhöhen

**Ziel:** Größere Screenshots für bessere Lesbarkeit

**Code-Änderungen in `LandingPage.tsx`:**
```tsx
// Hero Section: h-64 → h-96
<div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-800">
  <img
    src={IMG_WORKTRACKER}
    alt={t('landing.assets.placeholderWorktracker')}
    loading="lazy"
    className="w-full h-96 object-contain" // object-cover → object-contain für bessere Lesbarkeit
  />
</div>

// Features Section: h-48 → h-64
<img
  src={IMG_TEAM}
  alt={t('landing.features.labels.teamControl')}
  loading="lazy"
  className="w-full h-64 object-contain rounded-xl border border-gray-200 dark:border-gray-800"
/>
```

**Ergebnis:** Screenshots sind größer und lesbarer

### Schritt 1.3: Hover-Effekte implementieren

**Ziel:** Interaktivität durch Hover-Effekte

**Code-Änderungen in `LandingPage.tsx`:**
```tsx
// Hero Section mit Hover-Effekt
<div className="group relative rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-800">
  <img
    src={IMG_WORKTRACKER}
    alt={t('landing.assets.placeholderWorktracker')}
    loading="lazy"
    className="w-full h-96 object-contain transition-transform duration-300 group-hover:scale-105"
  />
  <div className="absolute inset-0 bg-blue-600/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
    <p className="text-white font-semibold text-xl">{t('landing.features.labels.worktracker')}</p>
  </div>
</div>
```

**Ergebnis:** Hover-Effekte zeigen Feature-Namen

## Phase 2: Design-Verbesserungen (Priorität: MITTEL)

### Schritt 2.1: Hero Section umbauen

**Ziel:** 1 großes Hero-Bild statt 3 kleine, 1 klarer CTA

**Aktueller Code (Zeile 228-283):**
- 3 Screenshots nebeneinander
- 3 CTAs nebeneinander

**Neuer Code:**
```tsx
<section className="grid md:grid-cols-2 gap-10 items-center">
  <div className="space-y-6">
    {/* Headline, Subline, Stats bleiben gleich */}
    {/* CTAs reduzieren auf 1 Haupt-CTA */}
    <div className="flex items-center gap-3">
      <Link
        to="/register"
        className="inline-flex items-center justify-center rounded-lg bg-blue-600 text-white px-6 py-3 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors font-semibold"
      >
        {t('landing.hero.ctaRegister')}
        <ArrowRightIcon className="h-5 w-5 ml-2" />
      </Link>
      <Link
        to="/login"
        className="inline-flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-6 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
      >
        {t('landing.hero.ctaLogin')}
      </Link>
    </div>
  </div>
  {/* 1 großes Hero-Bild statt 3 kleine */}
  <div className="group relative rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-800">
    <img
      src={IMG_WORKTRACKER}
      alt={t('landing.assets.placeholderWorktracker')}
      loading="lazy"
      className="w-full h-[500px] object-contain transition-transform duration-300 group-hover:scale-105"
    />
    <div className="absolute inset-0 bg-blue-600/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
      <p className="text-white font-semibold text-2xl">{t('landing.features.labels.worktracker')}</p>
    </div>
  </div>
</section>
```

**Ergebnis:** Klarerer Fokus, weniger Ablenkung

### Schritt 2.2: Stats mit Kontext

**Ziel:** Stats erklären statt nur Zahlen zeigen

**Aktueller Code (Zeile 242-255):**
```tsx
<div className="grid sm:grid-cols-3 gap-4">
  <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800">
    <p className="text-2xl font-bold">24/7</p>
    <p className="text-sm text-gray-500">{t('landing.stats.uptime')}</p>
  </div>
  // ...
</div>
```

**Neuer Code:**
```tsx
<div className="grid sm:grid-cols-3 gap-4">
  <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800">
    <p className="text-2xl font-bold text-blue-600">24/7</p>
    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('landing.stats.uptime')}</p>
    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('landing.stats.uptimeDesc')}</p>
  </div>
  // ...
</div>
```

**Übersetzungen hinzufügen:**
- `landing.stats.uptimeDesc`: "Verfügbarkeit"
- `landing.stats.automationDesc`: "Automatisierungen"
- `landing.stats.languagesDesc`: "Sprachen"

**Ergebnis:** Stats sind verständlicher

### Schritt 2.3: Feature Showcase mit Animationen

**Ziel:** Fade-in Animationen beim Scrollen

**Code-Änderungen:**
```tsx
// CSS in index.css oder Tailwind-Konfiguration
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in-up {
  animation: fadeInUp 0.6s ease-out;
}

// In LandingPage.tsx
<div className="grid gap-4 md:grid-cols-3 animate-fade-in-up">
  {/* Screenshots */}
</div>
```

**Ergebnis:** Dynamischere Darstellung

## Phase 3: Content-Verbesserungen (Priorität: NIEDRIG)

### Schritt 3.1: Feature-Beschreibungen bei Screenshots

**Ziel:** Kurze Texte erklären, was gezeigt wird

**Code-Änderungen:**
```tsx
<div className="space-y-2">
  <img
    src={IMG_TEAM}
    alt={t('landing.features.labels.teamControl')}
    loading="lazy"
    className="w-full h-64 object-contain rounded-xl border border-gray-200 dark:border-gray-800"
  />
  <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
    {t('landing.features.screenshots.teamControl')}
  </p>
</div>
```

**Übersetzungen hinzufügen:**
- `landing.features.screenshots.teamControl`: "Team-Übersicht mit Arbeitszeiten"
- `landing.features.screenshots.cerebro`: "Wiki-Editor mit Media-Support"
- `landing.features.screenshots.mobile`: "Mobile-Interface für unterwegs"

**Ergebnis:** Screenshots sind selbsterklärend

### Schritt 3.2: Mobile-Optimierung

**Ziel:** Größere Screenshots auf Mobile

**Code-Änderungen:**
```tsx
// Hero Section: Mobile größer
<div className="group relative rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-800">
  <img
    src={IMG_WORKTRACKER}
    alt={t('landing.assets.placeholderWorktracker')}
    loading="lazy"
    className="w-full h-64 sm:h-96 md:h-[500px] object-contain transition-transform duration-300 group-hover:scale-105"
  />
</div>
```

**Ergebnis:** Mobile-optimierte Darstellung

## Implementierungs-Reihenfolge

1. ✅ **Phase 1.1**: Screenshot-Ausschnitte erstellen (Playwright-Script)
2. ✅ **Phase 1.2**: Screenshot-Dimensionen erhöhen
3. ✅ **Phase 1.3**: Hover-Effekte implementieren
4. ✅ **Phase 2.1**: Hero Section umbauen
5. ✅ **Phase 2.2**: Stats mit Kontext
6. ✅ **Phase 2.3**: Animationen hinzufügen
7. ✅ **Phase 3.1**: Feature-Beschreibungen
8. ✅ **Phase 3.2**: Mobile-Optimierung

## Erfolgs-Kriterien

- ✅ Screenshots sind auf Mobile lesbar
- ✅ Hover-Effekte funktionieren
- ✅ 1 klarer CTA im Hero
- ✅ Stats sind verständlich
- ✅ Animationen sind smooth
- ✅ Performance bleibt gut (Lazy Loading, optimierte Bilder)

## Technische Details

### Screenshot-Optimierung
- **Format**: PNG (später WebP für Performance)
- **Dimensionen**: 1200x600px (Ausschnitte)
- **Komprimierung**: Optimiert für Web

### Performance
- **Lazy Loading**: Alle Screenshots mit `loading="lazy"`
- **Responsive Images**: `srcset` für verschiedene Auflösungen (optional)
- **WebP**: Später WebP-Format für bessere Performance

### Accessibility
- **Alt-Texte**: Alle Screenshots haben beschreibende Alt-Texte
- **Focus States**: Hover-Effekte haben auch Focus-States
- **Screen Reader**: Feature-Beschreibungen für Screen Reader

## Offene Fragen

1. **Device Frames**: Sollen Screenshots in Browser/Device-Frames?
2. **Video**: Soll ein Demo-Video statt Screenshots verwendet werden?
3. **Interaktive Demos**: Sollen interaktive Demos eingebunden werden?

## Nächste Schritte

1. User-Feedback zu Analyse einholen
2. Verbesserungsplan bestätigen
3. Phase 1 umsetzen (Screenshot-Optimierung)
4. Testing auf verschiedenen Geräten
5. Performance-Optimierung

# Cerebro-Artikel: Problem-Analyse und Standard

## 🔴 Aktuelles Problem

### Auf Hetzner-Server:
- **Totales Chaos** - Artikel sind unorganisiert, fehlen oder sind falsch strukturiert
- Git-Dokumente fehlen komplett
- Module wie Schichtplaner sind nicht als Cerebro-Artikel verfügbar

### Lokal:
- Struktur sieht normal aus
- **ABER:** Git-Dokumente fehlen ebenfalls
- Module sind nicht als Cerebro-Artikel verfügbar

---

## ✅ Standard (wie einmal beschrieben)

### Struktur:

```
Cerebro
├── Standalone-Artikel (Root-Level, parentId = null)
│   ├── Test
│   ├── Online Check-in
│   ├── Online Check-out
│   └── ... (alle Artikel OHNE githubPath)
│
└── Intranet - Überblick (Überordner, parentId = null)
    ├── README.md (githubPath: "README.md")
    ├── core/
    │   ├── CHANGELOG.md (githubPath: "docs/core/CHANGELOG.md")
    │   └── ...
    ├── modules/
    │   ├── MODUL_CEREBRO.md (githubPath: "docs/modules/MODUL_CEREBRO.md")
    │   ├── MODUL_ZEITERFASSUNG.md
    │   └── MODUL_SCHICHTPLANER.md (githubPath: "docs/modules/MODUL_SCHICHTPLANER.md")
    ├── user/
    │   └── BENUTZERHANDBUCH.md
    └── technical/
        └── ...
```

### Regeln:

1. **Standalone-Artikel:**
   - `parentId = null` (Root-Level)
   - `githubPath = null` (kein GitHub-Link)
   - Beispiele: "Test", "Online Check-in", etc.

2. **Git-Dokumente:**
   - `parentId = ID von "Intranet - Überblick"`
   - `githubPath = "docs/..."` oder `"README.md"` (relativer Pfad vom Repo-Root)
   - Alle Artikel aus `docs/` und Root-README

3. **Module müssen IMMER verfügbar sein:**
   - Jedes Modul (Schichtplaner, Zeiterfassung, etc.) **MUSS** als Cerebro-Artikel existieren
   - **Pfad:** `docs/modules/MODUL_[NAME].md`
   - **Parent:** "Intranet - Überblick" → "modules"
   - **Beispiel:** Schichtplaner → `docs/modules/MODUL_SCHICHTPLANER.md`

4. **Benutzerhandbücher:**
   - Benutzerhandbücher (z.B. spanische Guía) können auf oberster Ebene sein
   - **ODER** unter "Intranet - Überblick" → "user"
   - **Empfehlung:** Auf oberster Ebene für bessere Sichtbarkeit

---

## 📋 Was fehlt / was ist falsch?

### 1. Git-Dokumente fehlen komplett
- **Problem:** `importAllDocsToCerebro.ts` wurde nicht ausgeführt
- **Lösung:** Script auf Server ausführen

### 2. Module fehlen als Cerebro-Artikel
- **Problem:** Module wie Schichtplaner haben keine `MODUL_*.md` Datei
- **Lösung:** 
  - Entweder: `MODUL_SCHICHTPLANER.md` erstellen
  - Oder: Benutzerhandbuch direkt als Cerebro-Artikel erstellen

### 3. Struktur ist durcheinander
- **Problem:** Artikel sind falsch verschachtelt oder haben falsche `parentId`
- **Lösung:** `fixCerebroStructure.ts` ausführen

---

## 🔧 Lösungsansätze

### Kurzfristig (JETZT):
1. **Spanische Guía direkt erstellen:**
   - Script: `createSchichtplanerGuia.ts`
   - Erstellt Artikel auf oberster Ebene (parentId = null)
   - Titel: "Guía Completa del Usuario - Planificador de Turnos"
   - Slug: `guia-completa-del-usuario-planificador-de-turnos`

### Mittelfristig:
1. **Alle Git-Dokumente importieren:**
   - `importAllDocsToCerebro.ts` auf Server ausführen
   - Struktur korrigieren mit `fixCerebroStructure.ts`

### Langfristig:
1. **Automatisierung:**
   - CI/CD Pipeline, die bei jedem Push automatisch Cerebro-Artikel aktualisiert
   - Oder: Cron-Job auf Server, der regelmäßig synchronisiert

---

## 📝 Scripts

### 1. `createSchichtplanerGuia.ts`
- Erstellt spanische Guía direkt als Cerebro-Artikel
- Auf oberster Ebene (parentId = null)
- Für sofortige Verfügbarkeit

### 2. `importAllDocsToCerebro.ts`
- Importiert alle Markdown-Dateien aus `docs/`
- Organisiert sie unter "Intranet - Überblick"
- Erstellt Unterordner basierend auf Verzeichnisstruktur

### 3. `fixCerebroStructure.ts`
- Korrigiert falsche Struktur
- Verschiebt Artikel mit `githubPath` in "Intranet - Überblick"
- Verschiebt Artikel ohne `githubPath` auf Root-Level

---

## ⚠️ WICHTIG

**Module wie Schichtplaner müssen IMMER als Cerebro-Artikel verfügbar sein!**

- Entweder als `MODUL_*.md` unter "Intranet - Überblick" → "modules"
- Oder als Benutzerhandbuch auf oberster Ebene (für bessere Sichtbarkeit)

**Empfehlung:** Benutzerhandbücher auf oberster Ebene, technische Module unter "Intranet - Überblick" → "modules"


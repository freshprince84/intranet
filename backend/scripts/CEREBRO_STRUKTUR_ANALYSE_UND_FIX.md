# Cerebro-Struktur Analyse und Fix-Anleitung

## Problemstellung

Die Cerebro-Einträge sind auf dem Server durcheinander. Die gewünschte Struktur ist:

```
- Standalone-Artikel (gleiche Ebene)
  - Test
  - Online Check-in
  - etc.
- Intranet - Überblick (Überordner für alle Git/Docs-Artikel)
  └─ Alle Artikel aus docs/ und Git
```

## Analyse-Scripts

### 1. Lokale Analyse

**Script**: `backend/scripts/analyzeCerebroStructure.ts`

**Ausführung lokal**:
```bash
cd backend
npx tsc scripts/analyzeCerebroStructure.ts --outDir dist/scripts --esModuleInterop --resolveJsonModule --skipLibCheck
node dist/scripts/analyzeCerebroStructure.js
```

**Was es macht**:
- Analysiert alle Cerebro-Artikel
- Zeigt aktuelle Struktur
- Findet fehlende Dateien
- Findet lokale Dateien, die nicht in Cerebro sind
- Gibt Empfehlungen zur Verbesserung

### 2. Server-Analyse

**Script**: `backend/scripts/analyzeCerebroStructure.ts` (gleiches Script)

**Ausführung auf Server**:
```bash
# SSH zum Server
ssh root@65.109.228.106

# Auf Server
cd /var/www/intranet/backend
npx ts-node scripts/analyzeCerebroStructure.ts
```

## Fix-Scripts

### 1. Struktur korrigieren

**Script**: `backend/scripts/fixCerebroStructure.ts`

**Was es macht**:
- Erstellt "Intranet - Überblick" Ordner (falls nicht vorhanden)
- Verschiebt alle Artikel mit `githubPath` in den Markdown-Ordner
- Verschiebt alle Artikel ohne `githubPath` auf Root-Level (Standalone)

**Ausführung lokal**:
```bash
cd backend
npx tsc scripts/fixCerebroStructure.ts --outDir dist/scripts --esModuleInterop --resolveJsonModule --skipLibCheck
node dist/scripts/fixCerebroStructure.js
```

**Ausführung auf Server**:
```bash
# SSH zum Server
ssh root@65.109.228.106

# Auf Server
cd /var/www/intranet/backend
npx ts-node scripts/fixCerebroStructure.ts
```

### 2. Alle Dokumentation importieren

**Script**: `backend/scripts/importAllDocsToCerebro.ts`

**Was es macht**:
- Findet alle Markdown-Dateien in `docs/` und Root
- Importiert sie als Cerebro-Artikel
- Organisiert sie unter "Intranet - Überblick"
- Erstellt Unterordner basierend auf Verzeichnisstruktur

**Ausführung lokal**:
```bash
cd backend
npx tsc scripts/importAllDocsToCerebro.ts --outDir dist/scripts --esModuleInterop --resolveJsonModule --skipLibCheck
node dist/scripts/importAllDocsToCerebro.js
```

**Ausführung auf Server**:
```bash
# SSH zum Server
ssh root@65.109.228.106

# Auf Server
cd /var/www/intranet/backend
npx ts-node scripts/importAllDocsToCerebro.ts
```

## Empfohlene Vorgehensweise

### Schritt 1: Lokale Analyse
```bash
cd backend
node dist/scripts/analyzeCerebroStructure.js
```

### Schritt 2: Lokale Struktur korrigieren
```bash
cd backend
node dist/scripts/fixCerebroStructure.js
```

### Schritt 3: Lokale Dokumentation importieren
```bash
cd backend
node dist/scripts/importAllDocsToCerebro.js
```

### Schritt 4: Auf Server analysieren
```bash
ssh root@65.109.228.106
cd /var/www/intranet/backend
npx ts-node scripts/analyzeCerebroStructure.ts
```

### Schritt 5: Auf Server korrigieren
```bash
# Auf Server
cd /var/www/intranet/backend
npx ts-node scripts/fixCerebroStructure.ts
```

### Schritt 6: Auf Server importieren
```bash
# Auf Server
cd /var/www/intranet/backend
npx ts-node scripts/importAllDocsToCerebro.ts
```

## Ausgeschlossene Verzeichnisse

Folgende Verzeichnisse werden beim Import **NICHT** berücksichtigt:
- `claude/` - Claude-spezifische Dokumente
- `implementation_plans/` - Implementierungspläne
- `implementation_reports/` - Implementierungsberichte
- `analysis/` - Analysen
- `systemDocTemplates/` - Templates

Diese sind für Entwickler/Admins und sollten nicht in der allgemeinen Cerebro-Struktur erscheinen.

## Erwartete Struktur nach Fix

```
Cerebro
├── Standalone-Artikel (Root-Level)
│   ├── Test
│   ├── Online Check-in
│   ├── Online Check-out
│   └── ...
│
└── Intranet - Überblick (Überordner)
    ├── README.md
    ├── core/
    │   ├── CHANGELOG.md
    │   ├── DOKUMENTATIONSSTANDARDS.md
    │   └── ...
    ├── modules/
    │   ├── MODUL_CEREBRO.md
    │   ├── MODUL_ZEITERFASSUNG.md
    │   └── ...
    ├── user/
    │   ├── BENUTZERHANDBUCH.md
    │   └── ...
    └── technical/
        ├── API_REFERENZ.md
        └── ...
```





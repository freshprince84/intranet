# Cerebro-Struktur Analyse auf dem Server

## Schritt 1: Script auf Server kopieren

Das Script `analyzeCerebroStructure.ts` ist bereits im Repository. Nach `git pull` auf dem Server sollte es verfügbar sein.

## Schritt 2: Auf Server verbinden

```bash
ssh root@65.109.228.106
```

## Schritt 3: Zum Backend-Verzeichnis wechseln

```bash
cd /var/www/intranet/backend
```

## Schritt 4: Analyse ausführen

```bash
npx ts-node scripts/analyzeCerebroStructure.ts
```

## Schritt 5: Ergebnisse vergleichen

Die Ausgabe zeigt:
- Anzahl der Artikel
- Welche Artikel `githubPath` haben
- Ob ein Markdown-Ordner existiert
- Standalone-Artikel
- Fehlende Dateien
- Lokale Dateien, die nicht in Cerebro sind

## Alternative: Script kompilieren und ausführen

Falls `ts-node` nicht funktioniert:

```bash
# Kompilieren
npx tsc scripts/analyzeCerebroStructure.ts --outDir dist/scripts --esModuleInterop --resolveJsonModule --skipLibCheck

# Ausführen
node dist/scripts/analyzeCerebroStructure.js
```


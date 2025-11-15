# Fix: Frontend Build Fehler - i18next nicht gefunden

## Problem
Frontend-Build schlägt fehl mit: `Module not found: Error: Can't resolve 'i18next'`

## Lösung: Frontend Dependencies installieren

```bash
cd /var/www/intranet/frontend

# Dependencies installieren
npm install

# Dann nochmal bauen
npm run build
```

## Komplette Befehlssequenz

```bash
cd /var/www/intranet/frontend

# 1. Dependencies installieren
npm install

# 2. Build versuchen
npm run build
```

Falls weitere Module fehlen, installiert `npm install` sie automatisch aus der `package.json`.


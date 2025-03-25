# Server-Update-Anleitung

Diese Anleitung beschreibt die Schritte, die zur Aktualisierung des Servers nach dem Pull der neuesten Änderungen von GitHub erforderlich sind.

## Schritt 1: Git Pull

Zuerst müssen die neuesten Änderungen von GitHub gezogen werden:

ssh -i ~/.ssh/intranet_rsa root@65.109.228.106

sudo apt update -y && sudo apt upgrade -y && sudo apt autoremove -y && sudo apt autoclean -y
sudo apt-get update -y && sudo apt-get upgrade -y && sudo apt-get autoremove -y && sudo apt-get autoclean -y


```bash
cd /var/www/intranet
git stash  # Falls lokale Änderungen vorhanden sind
git pull
git stash pop  # Falls lokale Änderungen gestashed wurden
```

## Schritt 2: Datenbank-Migration anwenden

Als Nächstes müssen die Datenbank-Migrationen angewendet werden:

```bash
cd /var/www/intranet/backend
npx prisma migrate deploy
```

Dieser Befehl wendet alle ausstehenden Migrationen an, einschließlich der neuen Migration für das `githubPath`-Feld.

## Schritt 3: Prisma-Client aktualisieren

Der Prisma-Client muss mit den neuen Typendefinitionen aktualisiert werden:

```bash
cd /var/www/intranet/backend
npx prisma generate
```

## Schritt 4: Datenbank-Seed ausführen

Der Seed aktualisiert automatisch alle erforderlichen Daten, einschließlich der `githubPath`-Werte für die Dokumentation:

```bash
cd /var/www/intranet/backend
npx prisma db seed
```

## Schritt 5: Frontend neu bauen

Das Frontend muss neu gebaut werden, um die Änderungen zu übernehmen:

```bash
cd /var/www/intranet/frontend
npm run build


Creating an optimized production build...
Failed to compile.

Module not found: Error: Can't resolve 'qrcode.react' in '/var/www/intranet/frontend/src/pages'


root@ubuntu-4gb-hel1-2:/var/www/intranet/frontend# npm install qrcode.react

added 21 packages, removed 14 packages, changed 1 package, and audited 1568 packages in 8s

384 packages are looking for funding
  run `npm fund` for details

10 vulnerabilities (4 moderate, 6 high)

To address issues that do not require attention, run:
  npm audit fix

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.
root@ubuntu-4gb-hel1-2:/var/www/intranet/frontend# npm run build   

> intranet-frontend@0.1.0 build
> react-scripts build

Creating an optimized production build...
Failed to compile.

Module not found: Error: Can't resolve 'react-icons/fa' in '/var/www/intranet/frontend/src/components/cerebro'


root@ubuntu-4gb-hel1-2:/var/www/intranet/frontend# npm install react-icons

added 1 package, and audited 1569 packages in 7s

384 packages are looking for funding
  run `npm fund` for details

10 vulnerabilities (4 moderate, 6 high)

To address issues that do not require attention, run:
  npm audit fix

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.
root@ubuntu-4gb-hel1-2:/var/www/intranet/frontend# npm run build

> intranet-frontend@0.1.0 build
> react-scripts build

Creating an optimized production build...
Failed to compile.

Module not found: Error: Can't resolve 'github-markdown-css/github-markdown.css' in '/var/www/intranet/frontend/src/components/cerebro'


root@ubuntu-4gb-hel1-2:/var/www/intranet/frontend# npm install github-markdown-css

added 1 package, and audited 1570 packages in 6s

385 packages are looking for funding
  run `npm fund` for details

10 vulnerabilities (4 moderate, 6 high)

To address issues that do not require attention, run:
  npm audit fix

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.
root@ubuntu-4gb-hel1-2:/var/www/intranet/frontend# npm run build

> intranet-frontend@0.1.0 build
> react-scripts build

Creating an optimized production build...
Failed to compile.

Module not found: Error: Can't resolve 'react-quill' in '/var/www/intranet/frontend/src/components/cerebro'


root@ubuntu-4gb-hel1-2:/var/www/intranet/frontend# rm -rf node_modules package-lock.json
npm install
npm run build
npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.
npm warn deprecated stable@0.1.8: Modern JS already guarantees Array#sort() is a stable sort, so this library is deprecated. See the compatibility table on MDN: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort#browser_compatibility
npm warn deprecated @babel/plugin-proposal-private-methods@7.18.6: This proposal has been merged to the ECMAScript standard and thus this plugin is no longer maintained. Please use @babel/plugin-transform-private-methods instead.
npm warn deprecated @babel/plugin-proposal-class-properties@7.18.6: This proposal has been merged to the ECMAScript standard and thus this plugin is no longer maintained. Please use @babel/plugin-transform-class-properties instead.
npm warn deprecated @babel/plugin-proposal-nullish-coalescing-operator@7.18.6: This proposal has been merged to the ECMAScript standard and thus this plugin is no longer maintained. Please use @babel/plugin-transform-nullish-coalescing-operator instead.
npm warn deprecated @babel/plugin-proposal-numeric-separator@7.18.6: This proposal has been merged to the ECMAScript standard and thus this plugin is no longer maintained. Please use @babel/plugin-transform-numeric-separator instead.
npm warn deprecated rollup-plugin-terser@7.0.2: This package has been deprecated and is no longer maintained. Please use @rollup/plugin-terser
npm warn deprecated @humanwhocodes/config-array@0.13.0: Use @eslint/config-array instead
npm warn deprecated abab@2.0.6: Use your platform's native atob() and btoa() methods instead
npm warn deprecated rimraf@3.0.2: Rimraf versions prior to v4 are no longer supported
npm warn deprecated @babel/plugin-proposal-optional-chaining@7.21.0: This proposal has been merged to the ECMAScript standard and thus this plugin is no longer maintained. Please use @babel/plugin-transform-optional-chaining instead.
npm warn deprecated @babel/plugin-proposal-private-property-in-object@7.21.11: This proposal has been merged to the ECMAScript standard and thus this plugin is no longer maintained. Please use @babel/plugin-transform-private-property-in-object instead.
npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported
npm warn deprecated @humanwhocodes/object-schema@2.0.3: Use @eslint/object-schema instead
npm warn deprecated domexception@2.0.1: Use your platform's native DOMException instead
npm warn deprecated w3c-hr-time@1.0.2: Use your platform's native performance.now() and performance.timeOrigin.
npm warn deprecated q@1.5.1: You or someone you depend on is using Q, the JavaScript Promise library that gave JavaScript developers strong feelings about promises. They can almost certainly migrate to the native JavaScript promise now. Thank you literally everyone for joining me in this bet against the odds. Be excellent to each other.
npm warn deprecated
npm warn deprecated (For a CapTP with native promises, see @endo/eventual-send and @endo/captp)
npm warn deprecated sourcemap-codec@1.4.8: Please use @jridgewell/sourcemap-codec instead
npm warn deprecated workbox-cacheable-response@6.6.0: workbox-background-sync@6.6.0
npm warn deprecated workbox-google-analytics@6.6.0: It is not compatible with newer versions of GA starting with v4, as long as you are using GAv3 it should be ok, but the package is not longer being maintained
npm warn deprecated svgo@1.3.2: This SVGO version is no longer supported. Upgrade to v2.x.x.
npm warn deprecated eslint@8.57.1: This version is no longer supported. Please see https://eslint.org/version-support for other options.

added 1566 packages, and audited 1567 packages in 2m

384 packages are looking for funding
  run `npm fund` for details

8 vulnerabilities (2 moderate, 6 high)

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.

> intranet-frontend@0.1.0 build
> react-scripts build

Creating an optimized production build...
Failed to compile.

Module not found: Error: Can't resolve 'react-quill' in '/var/www/intranet/frontend/src/components/cerebro'


root@ubuntu-4gb-hel1-2:/var/www/intranet/frontend# cd /var/www/intranet/backend
npm run build^C
root@ubuntu-4gb-hel1-2:/var/www/intranet/frontend# npm install react-quill

added 12 packages, and audited 1579 packages in 7s

386 packages are looking for funding
  run `npm fund` for details

10 vulnerabilities (4 moderate, 6 high)

To address issues that do not require attention, run:
  npm audit fix

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.
root@ubuntu-4gb-hel1-2:/var/www/intranet/frontend# npm run build

> intranet-frontend@0.1.0 build
> react-scripts build

Creating an optimized production build...
Failed to compile.

Module not found: Error: Can't resolve 'rehype-sanitize' in '/var/www/intranet/frontend/src/components/cerebro'

- react-quill

 create mode 100644 frontend/src/pages/MobileAppLanding.tsx
root@ubuntu-4gb-hel1-2:/var/www/intranet# cd /var/www/intranet/frontend
npm run buildintranet-frontend@0.1.0 (mailto:intranet-frontend@0.1.0) build
react-scripts build
Creating an optimized production build...
Failed to compile.Module not found: Error: Can't resolve 'qrcode.react' in '/var/www/intranet/frontend/src/pages'root@ubuntu-4gb-hel1-2:/var/www/intranet/frontend#


Creating an optimized production build...
Failed to compile.Module not found: Error: Can't resolve 'react-icons/fa' in '/var/www/intranet/frontend/src/components/cerebro'




cd /var/www/intranet/backend
npm run build

```

## Schritt 6: Server neu starten

Je nach Konfiguration des Servers müssen verschiedene Dienste neu gestartet werden:

```bash
# Backend-Dienst über PM2 neu starten
pm2 restart intranet-backend

# Frontend-Anwendung wird über einen Webserver bereitgestellt
# Nginx neu starten (falls verwendet)
sudo systemctl restart nginx


## Wichtige Hinweise

- Führe die Schritte **genau in dieser Reihenfolge** aus
- Die Migration des `githubPath`-Feldes ist eine einmalige Operation
- Der Seed-Prozess ist robust und funktioniert sowohl vor als auch nach der Migration
- Bei Problemen überprüfe die Logs: 
  ```bash
  cd /var/www/intranet/backend
  tail -f logs/app.log
  ```
- Wie im README.md erwähnt: "Server-Neustart nur nach Absprache" 
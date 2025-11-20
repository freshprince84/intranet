# Script auf Hetzner-Server ausführen

## Spanische Schichtplaner-Guía erstellen

### Option 1: Mit ts-node (empfohlen)

```bash
# SSH zum Server
ssh root@65.109.228.106

# Auf Server
cd /var/www/intranet/backend
npx ts-node scripts/createSchichtplanerGuia.ts
```

### Option 2: Kompilieren und ausführen

```bash
# SSH zum Server
ssh root@65.109.228.106

# Auf Server
cd /var/www/intranet/backend

# Kompilieren
npx tsc scripts/createSchichtplanerGuia.ts --outDir dist/scripts --esModuleInterop --resolveJsonModule --skipLibCheck --module commonjs --target es2020

# Ausführen
node dist/scripts/createSchichtplanerGuia.js
```

## Erwartete Ausgabe

```
📚 Erstelle spanische Schichtplaner-Guía als Cerebro-Artikel...

👤 Verwende Admin-User: admin (ID: 1)

📄 Titel: Guía Completa del Usuario - Planificador de Turnos
🔗 Slug: guia-completa-del-usuario-planificador-de-turnos

➕ Neuer Artikel erstellt: Guía Completa del Usuario - Planificador de Turnos
   ID: [ID]
   URL: /cerebro/guia-completa-del-usuario-planificador-de-turnos

====================================================================================================

✅ Spanische Schichtplaner-Guía erfolgreich erstellt/aktualisiert!

   📍 Position: Oberste Ebene (Root-Level)
   🔗 Zugriff: /cerebro/guia-completa-del-usuario-planificador-de-turnos

====================================================================================================
```

## Nach der Ausführung

Der Artikel ist dann verfügbar unter:
- **URL:** `/cerebro/guia-completa-del-usuario-planificador-de-turnos`
- **Position:** Oberste Ebene (Root-Level) in Cerebro


# Anleitung: Datenbank-Änderungen auf dem Server anwenden

Nach `git pull` müssen die Datenbank-Änderungen in dieser **exakten Reihenfolge** angewendet werden:

## Schritt 1: Migrationen anwenden (Schema-Änderungen)

Dieser Schritt wendet alle neuen Datenbankschema-Änderungen an (z.B. neue Tabellen, neue Spalten).

```bash
cd /var/www/intranet/backend
npx prisma migrate deploy
```

**Was passiert hier?**
- Prisma liest alle Migrationen aus dem `prisma/migrations/` Ordner
- Prüft, welche Migrationen noch nicht auf der Datenbank angewendet wurden
- Wendet die fehlenden Migrationen automatisch an
- In deinem Fall: Migration `20251101155554_add_task_status_history` wird angewendet

**Was du siehst:**
```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
X migrations already applied.
Applying migration `20251101155554_add_task_status_history`
```

**Wichtig:** Dieser Befehl ist **idempotent** - du kannst ihn mehrfach ausführen, ohne dass etwas kaputt geht.

---

## Schritt 2: Prisma Client generieren (TypeScript-Typen aktualisieren)

Nach Schema-Änderungen muss der Prisma Client neu generiert werden, damit TypeScript die neuen Typen kennt.

```bash
cd /var/www/intranet/backend
npx prisma generate
```

**Was passiert hier?**
- Prisma liest das aktuelle Schema (`schema.prisma`)
- Generiert TypeScript-Typen und Client-Code
- Speichert alles in `node_modules/.prisma/client`

**Was du siehst:**
```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
✔ Generated Prisma Client (version X.X.X) to ./node_modules/.prisma/client
```

**Warum nötig?**
- Der Backend-Code verwendet Prisma-Typen (z.B. `User`, `Organization`)
- Ohne `generate` kennt TypeScript die neuen Felder/Modelle nicht
- Das Backend würde beim Build oder Laufzeit Fehler werfen

---

## Schritt 3: Seed ausführen (Initialdaten/Berechtigungen aktualisieren)

Der Seed fügt fehlende Daten hinzu oder aktualisiert bestehende Daten (z.B. Berechtigungen).

```bash
cd /var/www/intranet/backend
npx prisma db seed
```

**Was passiert hier?**
- Das Script `prisma/seed.ts` wird ausgeführt
- Erstellt/aktualisiert Rollen (Admin, User, Hamburger)
- Fügt **alle** Berechtigungen hinzu, inklusive der neuen:
  - `organization_management` (page)
  - `organization_join_requests` (table)  
  - `organization_users` (table)
- Erstellt/aktualisiert den Admin-User mit allen Berechtigungen

**Was du siehst:**
```
🚀 Starte Seeding...
📋 Erstelle/Aktualisiere Rollen...
✅ Admin-Rolle: Admin (ID: 1)
...
🔑 Erstelle Admin-Berechtigungen (alle = both)...
   📊 Rolle 1: 3 erstellt, 0 aktualisiert, X übersprungen
...
🎉 Seeding erfolgreich abgeschlossen!
```

**Warum nötig?**
- Die neuen Berechtigungen müssen in der Datenbank vorhanden sein
- Der Admin-User muss diese Berechtigungen haben
- Der Seed ist **idempotent** - er fügt nur hinzu, was fehlt

---

## Komplette Befehlssequenz (zum Kopieren)

```bash
# 1. Ins Backend-Verzeichnis wechseln
cd /var/www/intranet/backend

# 2. Migrationen anwenden
npx prisma migrate deploy

# 3. Prisma Client generieren
npx prisma generate

# 4. Seed ausführen
npx prisma db seed
```

---

## Verifikation (Optional)

Du kannst prüfen, ob alles funktioniert hat:

### Migration-Status prüfen:
```bash
cd /var/www/intranet/backend
npx prisma migrate status
```

Sollte zeigen: `X migrations found, X applied, X pending` (pending sollte 0 sein)

### Prisma Client prüfen:
```bash
cd /var/www/intranet/backend
npx prisma generate
```

Sollte keine Fehler zeigen und "Generated Prisma Client" ausgeben.

### Seed prüfen:
Prüfe in der Datenbank, ob die neuen Berechtigungen existieren:
```bash
# Via Prisma Studio (wenn installiert)
npx prisma studio
# Dann zu Permissions navigieren und nach "organization_management" suchen
```

---

## Häufige Fehler und Lösungen

### Fehler: "Migration X failed"
- **Ursache:** Migration konnte nicht angewendet werden
- **Lösung:** Prüfe die Logs, oft sind Spalten bereits vorhanden oder Constraints verletzt

### Fehler: "Cannot find module '@prisma/client'"
- **Ursache:** Prisma Client wurde nicht generiert oder node_modules fehlt
- **Lösung:** 
  ```bash
  npm install
  npx prisma generate
  ```

### Fehler: "Seed script failed"
- **Ursache:** Fehler im seed.ts Script oder Datenbank-Verbindungsproblem
- **Lösung:** Prüfe die Fehlermeldung, oft hilft ein erneuter Versuch

---

## Wichtig: Reihenfolge beachten!

❌ **FALSCH:**
```bash
npx prisma db seed        # FALSCH - Seed vor Migration!
npx prisma migrate deploy
```

✅ **RICHTIG:**
```bash
npx prisma migrate deploy  # Zuerst Schema anwenden
npx prisma generate        # Dann Typen generieren
npx prisma db seed         # Dann Daten einfügen
```

---

## Zusammenfassung

| Schritt | Befehl | Was passiert | Warum nötig? |
|---------|--------|--------------|--------------|
| 1. Migration | `npx prisma migrate deploy` | Schema-Änderungen anwenden | Neue Tabellen/Spalten in DB |
| 2. Generate | `npx prisma generate` | TypeScript-Typen erstellen | Backend-Code kennt neue Typen |
| 3. Seed | `npx prisma db seed` | Berechtigungen/Daten hinzufügen | Admin hat alle Berechtigungen |


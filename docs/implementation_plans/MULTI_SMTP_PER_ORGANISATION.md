# Multi-SMTP pro Organisation - Implementierungsplan

## Überblick

Jede Organisation soll ihre eigenen SMTP-Server-Einstellungen konfigurieren können. Dies ermöglicht es, dass verschiedene Organisationen verschiedene E-Mail-Provider nutzen (z.B. Gmail, Outlook, eigene SMTP-Server).

## Aktueller Stand

✅ **Bereits implementiert:**
- Basis-Infrastruktur: `Organization.settings` JSON-Feld vorhanden
- `emailService.ts` unterstützt bereits `organizationId` Parameter
- Code lädt bereits Organisation-spezifische SMTP-Einstellungen (falls vorhanden)

## Datenbankschema

Das `Organization`-Model hat bereits ein `settings` JSON-Feld:
```prisma
model Organization {
  settings Json? // Organisation-spezifische Einstellungen
}
```

**SMTP-Einstellungen werden im JSON gespeichert:**
```json
{
  "smtp": {
    "host": "smtp.gmail.com",
    "port": 587,
    "user": "noreply@organisation.com",
    "pass": "app-password",
    "from": "Organisation Name <noreply@organisation.com>"
  }
}
```

## Backend-Implementierung

### 1. Controller-Erweiterung (organizationController.ts)

**Neue Endpoints:**

```typescript
// SMTP-Einstellungen für Organisation abrufen
GET /api/organizations/:id/smtp-settings

// SMTP-Einstellungen für Organisation aktualisieren
PUT /api/organizations/:id/smtp-settings
```

**Validierung-Schema:**
```typescript
const smtpSettingsSchema = z.object({
  smtp: z.object({
    host: z.string().min(1),
    port: z.number().min(1).max(65535),
    user: z.string().email(),
    pass: z.string().min(1),
    from: z.string().optional()
  })
});
```

### 2. Frontend-Implementierung

**Neue Komponente:**
- `OrganizationSmtpSettings.tsx` - Formular für SMTP-Konfiguration

**Features:**
- SMTP-Server konfigurieren (Host, Port, User, Pass)
- Test-E-Mail versenden
- Von-Adresse konfigurieren
- Validierung der SMTP-Verbindung

**UI-Integration:**
- In `OrganizationSettings.tsx` als Tab oder Sektion hinzufügen
- Nur für Organisation-Admin sichtbar

### 3. E-Mail-Service-Verwendung

Der `emailService.ts` nutzt bereits automatisch Organisation-SMTP wenn `organizationId` übergeben wird:

```typescript
// Bei Registrierung (noch keine Organisation)
await sendRegistrationEmail(email, username, password);

// Später: Organisation-spezifische E-Mails
await sendRegistrationEmail(email, username, password, organizationId);
```

## Verwendung

### Organisation-SMTP konfigurieren:

1. Organisation-Admin geht zu: Organisationseinstellungen → SMTP-Einstellungen
2. Gibt SMTP-Daten ein:
   - Host (z.B. `smtp.gmail.com`)
   - Port (z.B. `587`)
   - Benutzername/E-Mail
   - Passwort (App-Passwort bei Gmail)
   - Von-Adresse (optional)
3. Klickt auf "Test-E-Mail versenden"
4. Speichert die Einstellungen

### E-Mail-Versand:

Wenn eine Organisation SMTP-Einstellungen hat, werden alle E-Mails über diesen Server versendet:
- Registrierungs-E-Mails (wenn User zur Organisation gehört)
- Benachrichtigungs-E-Mails
- Sonstige system-E-Mails

**Fallback:**
- Falls keine Organisation-SMTP konfiguriert: Nutze globale SMTP-Einstellungen
- Falls keine globalen SMTP-Einstellungen: Nutze Mailtrap Sandbox (nur Tests)

## Sicherheit

- **Passwort-Verschlüsselung:** SMTP-Passwörter sollten verschlüsselt im JSON gespeichert werden
- **Berechtigung:** Nur Organisation-Admins können SMTP-Einstellungen ändern
- **Validierung:** SMTP-Verbindung wird beim Speichern getestet

## Migration

- Bestehende Organisationen nutzen weiterhin globale SMTP-Einstellungen
- Organisationen können optional ihre eigenen SMTP-Einstellungen konfigurieren

## Offene Punkte

- [ ] Passwort-Verschlüsselung für SMTP-Passwörter
- [ ] Test-E-Mail-Funktion implementieren
- [ ] UI für SMTP-Einstellungen erstellen
- [ ] Validierung der SMTP-Verbindung
- [ ] Logging: Welche SMTP-Konfiguration wurde verwendet?


# Passwort-Reset-Implementierung

## Überblick

Dieses Dokument beschreibt die vollständige Implementierung einer Passwort-Reset-Funktionalität für das Intranet-System. Benutzer können ihr Passwort zurücksetzen, wenn sie es vergessen haben.

## Aktueller Stand

### Vorhanden
- ✅ Email-Service mit SMTP und Mailtrap-Unterstützung (`backend/src/services/emailService.ts`)
- ✅ Login-Funktionalität (`backend/src/controllers/authController.ts`)
- ✅ Registrierungs-E-Mail-Versand
- ✅ Mobile App hat bereits `requestPasswordReset` Methode im API Client (nicht implementiert)

### Fehlt
- ❌ Passwort-Reset-Token-Modell im Prisma-Schema
- ❌ Backend-Routen für Passwort-Reset
- ❌ Backend-Controller-Funktionen für Passwort-Reset
- ❌ Email-Service-Funktion für Passwort-Reset-E-Mails
- ❌ Frontend-Seite für Passwort-Reset-Anfrage
- ❌ Frontend-Seite für Passwort-Reset mit Token
- ❌ Integration in Login-Seite

## Implementierungsplan

### Phase 1: Datenbank-Schema

#### 1.1 Prisma-Schema erweitern
- Neues Modell `PasswordResetToken` hinzufügen
- Felder:
  - `id`: Int (Primary Key)
  - `userId`: Int (Foreign Key zu User)
  - `token`: String (unique, für Reset-Link)
  - `expiresAt`: DateTime (Ablaufzeit, z.B. 1 Stunde)
  - `used`: Boolean (default: false, ob Token bereits verwendet wurde)
  - `createdAt`: DateTime
  - `updatedAt`: DateTime
- Relation zu User-Modell
- Index auf `token` und `userId`
- Migration erstellen und ausführen

### Phase 2: Backend-Implementierung

#### 2.1 Email-Service erweitern
- Neue Funktion `sendPasswordResetEmail` in `backend/src/services/emailService.ts`
- Parameter: `email`, `username`, `resetLink`
- HTML- und Text-Template für Passwort-Reset-E-Mail
- Verwendung des bestehenden Email-Service-Systems (SMTP/Mailtrap)

#### 2.2 Auth-Controller erweitern
- Neue Funktion `requestPasswordReset` in `backend/src/controllers/authController.ts`
  - E-Mail-Adresse validieren
  - Benutzer anhand E-Mail finden
  - Passwort-Reset-Token generieren (crypto.randomBytes)
  - Token in Datenbank speichern (Ablaufzeit: 1 Stunde)
  - Reset-Link generieren (Frontend-URL + Token)
  - E-Mail versenden
  - Sicherheitshinweis: Immer Erfolgsmeldung zurückgeben (auch wenn User nicht existiert)
  
- Neue Funktion `resetPassword` in `backend/src/controllers/authController.ts`
  - Token validieren (existiert, nicht abgelaufen, nicht verwendet)
  - Neues Passwort validieren (Mindestlänge, etc.)
  - Passwort hashen (bcrypt)
  - Passwort in Datenbank aktualisieren
  - Token als verwendet markieren
  - Erfolgsmeldung zurückgeben

#### 2.3 Auth-Routen erweitern
- Neue Route `POST /auth/reset-password-request` in `backend/src/routes/auth.ts`
  - Ruft `requestPasswordReset` auf
  - Öffentlich zugänglich (kein Auth-Middleware)
  
- Neue Route `POST /auth/reset-password` in `backend/src/routes/auth.ts`
  - Ruft `resetPassword` auf
  - Öffentlich zugänglich (kein Auth-Middleware)

### Phase 3: Frontend-Implementierung

#### 3.1 Passwort-Reset-Anfrage-Seite
- Neue Seite `frontend/src/pages/ForgotPassword.tsx`
- Formular mit E-Mail-Eingabefeld
- Validierung der E-Mail-Adresse
- API-Aufruf an `/auth/reset-password-request`
- Erfolgsmeldung anzeigen
- Link zurück zur Login-Seite

#### 3.2 Passwort-Reset-Seite (mit Token)
- Neue Seite `frontend/src/pages/ResetPassword.tsx`
- Token aus URL-Parameter extrahieren
- Formular mit:
  - Neues Passwort (mit Bestätigung)
  - Passwort-Validierung (Mindestlänge, etc.)
- API-Aufruf an `/auth/reset-password`
- Erfolgsmeldung anzeigen
- Automatische Weiterleitung zur Login-Seite nach erfolgreichem Reset

#### 3.3 Login-Seite erweitern
- Link "Passwort vergessen?" hinzufügen
- Link führt zu `/forgot-password`

#### 3.4 Routing erweitern
- Route `/forgot-password` in `frontend/src/App.tsx` oder Router-Konfiguration
- Route `/reset-password/:token` in Router-Konfiguration

#### 3.5 Übersetzungen hinzufügen
- Übersetzungen für alle neuen Texte in:
  - `frontend/src/i18n/locales/de.json`
  - `frontend/src/i18n/locales/es.json`
  - `frontend/src/i18n/locales/en.json`

### Phase 4: Mobile App (Optional)

#### 4.1 Mobile App Passwort-Reset
- Die Mobile App hat bereits `requestPasswordReset` im API Client
- Implementierung der UI-Komponenten für Passwort-Reset
- Integration in Login-Screen

## Technische Details

### Token-Generierung
- Verwendung von `crypto.randomBytes(32)` für sichere Token
- Base64-Encoding für URL-sichere Darstellung
- Token-Länge: 32 Bytes = 44 Zeichen (Base64)

### Sicherheitsaspekte
- Token-Ablaufzeit: 1 Stunde
- Token kann nur einmal verwendet werden
- Keine Informationen über existierende Benutzer preisgeben (immer Erfolgsmeldung)
- Rate Limiting auf Reset-Anfragen (optional, zukünftig)
- Passwort-Validierung: Mindestlänge 8 Zeichen

### E-Mail-Template
- Professionelles HTML-Template
- Reset-Link mit Token
- Ablaufzeit-Hinweis
- Sicherheitshinweise
- Text-Version für E-Mail-Clients ohne HTML

### Frontend-URL-Struktur
- Reset-Link Format: `https://domain.com/reset-password?token=TOKEN`
- Alternative: `https://domain.com/reset-password/TOKEN` (wenn Route-Parameter verwendet)

## API-Spezifikation

### POST /auth/reset-password-request
**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200 OK):**
```json
{
  "message": "Falls ein Konto mit dieser E-Mail-Adresse existiert, wurde eine E-Mail mit Anweisungen zum Zurücksetzen des Passworts gesendet."
}
```

### POST /auth/reset-password
**Request Body:**
```json
{
  "token": "reset-token-here",
  "password": "newPassword123"
}
```

**Response (200 OK):**
```json
{
  "message": "Passwort wurde erfolgreich zurückgesetzt."
}
```

**Response (400 Bad Request):**
```json
{
  "message": "Ungültiger oder abgelaufener Token."
}
```

## Dateien, die erstellt/geändert werden

### Neu zu erstellen
- `frontend/src/pages/ForgotPassword.tsx`
- `frontend/src/pages/ResetPassword.tsx`

### Zu ändern
- `backend/prisma/schema.prisma` (PasswordResetToken-Modell hinzufügen)
- `backend/src/services/emailService.ts` (sendPasswordResetEmail Funktion)
- `backend/src/controllers/authController.ts` (requestPasswordReset, resetPassword)
- `backend/src/routes/auth.ts` (neue Routen)
- `frontend/src/pages/Login.tsx` (Link hinzufügen)
- Router-Konfiguration (neue Routen)
- Übersetzungsdateien (de.json, es.json, en.json)

## Test-Szenarien

1. **Passwort-Reset-Anfrage**
   - Mit existierender E-Mail-Adresse
   - Mit nicht-existierender E-Mail-Adresse (sollte gleiche Antwort geben)
   - Mit ungültiger E-Mail-Adresse

2. **Passwort-Reset mit Token**
   - Mit gültigem Token
   - Mit abgelaufenem Token
   - Mit bereits verwendetem Token
   - Mit ungültigem Token
   - Mit zu kurzem Passwort

3. **E-Mail-Versand**
   - E-Mail wird korrekt versendet
   - Reset-Link funktioniert
   - E-Mail-Template wird korrekt gerendert

## Abhängigkeiten

- Keine neuen npm-Pakete erforderlich
- Bestehende Abhängigkeiten: bcrypt, crypto, nodemailer, prisma

## Migration

Nach Schema-Änderung:
1. `cd backend`
2. `npx prisma migrate dev --name add_password_reset_token`
3. `npx prisma generate`

## Sicherheitshinweise

- Token sollten niemals in Logs ausgegeben werden
- E-Mails sollten über HTTPS versendet werden
- Rate Limiting sollte in Produktion implementiert werden
- Token sollten nach Verwendung sofort als "used" markiert werden
- Abgelaufene Token sollten regelmäßig bereinigt werden (optional: Cron-Job)


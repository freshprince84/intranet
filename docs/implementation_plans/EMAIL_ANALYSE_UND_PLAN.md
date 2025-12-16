# E-Mail-Analyse und Verbesserungsplan

**Datum**: 2025-01-30  
**Status**: 📋 Analyse abgeschlossen - Planung für Logo-Integration

## Übersicht

Das System versendet aktuell **5 verschiedene E-Mail-Typen**. Alle E-Mails verwenden einfache HTML-Formatierung ohne Organisationslogo. Die Formatierung ist funktional, aber formlos und farblos.

## Gefundene E-Mails im System

### 1. Registrierungs-E-Mail (`sendRegistrationEmail`)

**Datei**: `backend/src/services/emailService.ts` (Zeilen 334-497)

**Verwendung**: 
- Wird bei Benutzerregistrierung versendet
- Aufgerufen in: `backend/src/controllers/authController.ts` (Zeile 173)

**Betreff**: `Willkommen im Intranet - Ihre Anmeldeinformationen`

**HTML-Inhalt**:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #2563eb;
      color: white;
      padding: 20px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .content {
      background-color: #f9fafb;
      padding: 30px;
      border: 1px solid #e5e7eb;
      border-top: none;
      border-radius: 0 0 8px 8px;
    }
    .credentials {
      background-color: white;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      border-left: 4px solid #2563eb;
    }
    .credential-item {
      margin: 10px 0;
      padding: 10px;
      background-color: #f3f4f6;
      border-radius: 4px;
    }
    .credential-label {
      font-weight: bold;
      color: #374151;
    }
    .credential-value {
      font-family: monospace;
      color: #1f2937;
      margin-left: 10px;
    }
    .warning {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      color: #6b7280;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Willkommen im Intranet!</h1>
  </div>
  <div class="content">
    <p>Hallo,</p>
    <p>Ihr Benutzerkonto wurde erfolgreich erstellt. Hier sind Ihre Anmeldeinformationen:</p>
    
    <div class="credentials">
      <div class="credential-item">
        <span class="credential-label">Benutzername:</span>
        <span class="credential-value">${username}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">E-Mail:</span>
        <span class="credential-value">${email}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Passwort:</span>
        <span class="credential-value">${password}</span>
      </div>
    </div>

    <div class="warning">
      <strong>⚠️ Wichtig:</strong> Bitte ändern Sie Ihr Passwort nach dem ersten Login aus Sicherheitsgründen.
    </div>

    <p>Sie können sich jetzt mit diesen Anmeldeinformationen anmelden.</p>
    
    <p>Nach der Anmeldung können Sie:</p>
    <ul>
      <li>Einer bestehenden Organisation beitreten</li>
      <li>Eine eigene Organisation erstellen</li>
    </ul>

    <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
  </div>
  <div class="footer">
    <p>Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht auf diese E-Mail.</p>
  </div>
</body>
</html>
```

**Text-Version**:
```
Willkommen im Intranet!

Ihr Benutzerkonto wurde erfolgreich erstellt. Hier sind Ihre Anmeldeinformationen:

Benutzername: ${username}
E-Mail: ${email}
Passwort: ${password}

WICHTIG: Bitte ändern Sie Ihr Passwort nach dem ersten Login aus Sicherheitsgründen.

Sie können sich jetzt mit diesen Anmeldeinformationen anmelden.

Nach der Anmeldung können Sie:
- Einer bestehenden Organisation beitreten
- Eine eigene Organisation erstellen

Bei Fragen stehen wir Ihnen gerne zur Verfügung.

Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht auf diese E-Mail.
```

**Formatierungs-Analyse**:
- ✅ Hat Header mit blauem Hintergrund (#2563eb)
- ✅ Strukturierte Darstellung der Credentials
- ❌ Kein Organisationslogo
- ❌ Generischer "Intranet"-Header ohne Branding
- ⚠️ Farbe ist hardcodiert (#2563eb), nicht organisationsspezifisch

---

### 2. Passwort-Reset-E-Mail (`sendPasswordResetEmail`)

**Datei**: `backend/src/services/emailService.ts` (Zeilen 618-826)

**Verwendung**: 
- Wird bei Passwort-Reset-Anfrage versendet
- Aufgerufen in: `backend/src/controllers/authController.ts` (Zeile 501)

**Betreff**: `Passwort zurücksetzen - Intranet`

**HTML-Inhalt**:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #2563eb;
      color: white;
      padding: 20px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .content {
      background-color: #f9fafb;
      padding: 30px;
      border: 1px solid #e5e7eb;
      border-top: none;
      border-radius: 0 0 8px 8px;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #2563eb;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
    }
    .button:hover {
      background-color: #1d4ed8;
    }
    .warning {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      color: #6b7280;
      font-size: 12px;
    }
    .link-fallback {
      word-break: break-all;
      color: #2563eb;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Passwort zurücksetzen</h1>
  </div>
  <div class="content">
    <p>Hallo ${username},</p>
    <p>Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt.</p>
    
    <p>Klicken Sie auf den folgenden Button, um ein neues Passwort festzulegen:</p>
    
    <div style="text-align: center;">
      <a href="${resetLink}" class="button">Passwort zurücksetzen</a>
    </div>
    
    <p>Falls der Button nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:</p>
    <p class="link-fallback">${resetLink}</p>

    <div class="warning">
      <strong>⚠️ Wichtig:</strong>
      <ul>
        <li>Dieser Link ist nur 1 Stunde gültig</li>
        <li>Der Link kann nur einmal verwendet werden</li>
        <li>Falls Sie diese Anfrage nicht gestellt haben, ignorieren Sie diese E-Mail</li>
      </ul>
    </div>

    <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
  </div>
  <div class="footer">
    <p>Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht auf diese E-Mail.</p>
  </div>
</body>
</html>
```

**Text-Version**:
```
Passwort zurücksetzen - Intranet

Hallo ${username},

Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt.

Klicken Sie auf den folgenden Link, um ein neues Passwort festzulegen:

${resetLink}

WICHTIG:
- Dieser Link ist nur 1 Stunde gültig
- Der Link kann nur einmal verwendet werden
- Falls Sie diese Anfrage nicht gestellt haben, ignorieren Sie diese E-Mail

Bei Fragen stehen wir Ihnen gerne zur Verfügung.

Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht auf diese E-Mail.
```

**Formatierungs-Analyse**:
- ✅ Hat Header mit blauem Hintergrund (#2563eb)
- ✅ Button für Reset-Link
- ✅ Warning-Box für wichtige Hinweise
- ❌ Kein Organisationslogo
- ❌ Generischer "Intranet"-Header ohne Branding
- ⚠️ Farbe ist hardcodiert (#2563eb), nicht organisationsspezifisch

---

### 3. Check-in-Einladung (Reservierung) - Methode 1 (`sendCheckInInvitationEmail`)

**Datei**: `backend/src/services/reservationNotificationService.ts` (Zeilen 2161-2330)

**Verwendung**: 
- Wird bei Reservierungs-Check-in-Einladung versendet
- Aufgerufen in: `backend/src/services/reservationNotificationService.ts` (Zeile 431)

**Betreff**: 
- Englisch: `Welcome to La Familia Hostel - Online Check-in`
- Spanisch: `Willkommen bei La Familia Hostel - Online Check-in` (Fehler: sollte spanisch sein)

**HTML-Inhalt (Englisch)**:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #007bff;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      margin: 10px 5px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Hello ${reservation.guestName},</h1>
    <p>We are pleased to welcome you to La Familia Hostel! 🎊</p>
    <p>In case that you arrive after 18:00 or before 09:00, our recepcion 🛎️ will be closed.</p>
    <p>We would then kindly ask you to complete check-in & payment online in advance:</p>
    <p><strong>Check-In:</strong></p>
    <p><a href="${checkInLink}" class="button">Online Check-in</a></p>
    <p><strong>Please make the payment in advance:</strong></p>
    <p><a href="${paymentLink}" class="button">Make Payment</a></p>
    <p>Please write us briefly once you have completed both the check-in and the payment, so we can send you your pin code 🔑 for the entrance door.</p>
    <p>Thank you!</p>
    <p>We look forward to seeing you soon!</p>
  </div>
</body>
</html>
```

**HTML-Inhalt (Spanisch)**:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #007bff;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      margin: 10px 5px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Hola ${reservation.guestName},</h1>
    <p>¡Nos complace darte la bienvenida a La Familia Hostel! 🎊</p>
    <p>En caso de que llegues después de las 18:00 o antes de las 09:00, nuestra recepción 🛎️ estará cerrada.</p>
    <p>Te pedimos amablemente que completes el check-in y el pago en línea con anticipación:</p>
    <p><strong>Check-In:</strong></p>
    <p><a href="${checkInLink}" class="button">Online Check-in</a></p>
    <p><strong>Por favor, realiza el pago por adelantado:</strong></p>
    <p><a href="${paymentLink}" class="button">Zahlung durchführen</a></p>
    <p>Por favor, escríbenos brevemente una vez que hayas completado tanto el check-in como el pago, para que podamos enviarte tu código PIN 🔑 para la puerta de entrada.</p>
    <p>¡Gracias!</p>
    <p>¡Esperamos verte pronto!</p>
  </div>
</body>
</html>
```

**Formatierungs-Analyse**:
- ❌ Sehr einfaches Layout ohne Header
- ❌ Kein Container-Hintergrund
- ❌ Kein Footer
- ❌ Kein Organisationslogo
- ❌ Sehr formlos und farblos
- ⚠️ Button-Farbe ist hardcodiert (#007bff), nicht organisationsspezifisch
- ⚠️ Fehler: Spanische Version hat deutschen Button-Text "Zahlung durchführen"

---

### 4. Check-in-Einladung (Reservierung) - Methode 2 (Template-basiert)

**Datei**: `backend/src/services/reservationNotificationService.ts` (Zeilen 814-981)

**Verwendung**: 
- Wird bei Reservierungs-Check-in-Einladung versendet (Template-basierte Version)
- Aufgerufen in: `backend/src/services/reservationNotificationService.ts` (Zeile 814)

**Betreff**: Wird aus Branch Settings geladen (Fallback: `Tu reserva ha sido confirmada - La Familia Hostel`)

**HTML-Inhalt**:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background-color: #f9fafb;
      padding: 30px;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #007bff;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      margin: 10px 5px;
    }
    .button:hover {
      background-color: #0056b3;
    }
    .button-container {
      text-align: center;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      color: #6b7280;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    ${emailHtmlContent}
    <div class="button-container">
      <a href="${checkInLink}" class="button">Online Check-in</a>
      <a href="${paymentLink}" class="button">Zahlung durchführen</a>
    </div>
  </div>
  <div class="footer">
    <p>Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht auf diese E-Mail.</p>
  </div>
</body>
</html>
```

**Formatierungs-Analyse**:
- ✅ Hat Container mit Hintergrund (#f9fafb)
- ✅ Hat Footer
- ✅ Button-Container für Links
- ❌ Kein Header
- ❌ Kein Organisationslogo
- ⚠️ Button-Farbe ist hardcodiert (#007bff), nicht organisationsspezifisch
- ⚠️ Footer-Text ist hardcodiert auf Deutsch, sollte übersetzt werden

---

### 5. Check-in-Bestätigung (Reservierung) (`sendCheckInConfirmationEmail`)

**Datei**: `backend/src/services/reservationNotificationService.ts` (Zeilen 2335-2474)

**Verwendung**: 
- Wird nach erfolgreichem Check-in versendet
- Aufgerufen in: `backend/src/services/reservationNotificationService.ts` (Zeilen 1272, 1697, 2110)

**Betreff**: Wird aus Branch Settings geladen (Fallback: `Ihr Check-in ist abgeschlossen - Zimmerinformationen`)

**HTML-Inhalt**:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .info-box {
      background-color: #f5f5f5;
      padding: 15px;
      border-radius: 4px;
      margin: 15px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    ${emailHtmlContent}
  </div>
</body>
</html>
```

**Formatierungs-Analyse**:
- ❌ Sehr einfaches Layout ohne Header
- ❌ Kein Container-Hintergrund
- ❌ Kein Footer
- ❌ Kein Organisationslogo
- ❌ Sehr formlos und farblos
- ⚠️ Minimales Styling

---

## Analyse der Formatierung

### Aktuelle Probleme

1. **Kein Organisationslogo**: Keine der E-Mails enthält ein Organisationslogo
2. **Hardcodierte Farben**: Alle E-Mails verwenden hardcodierte Farben (#2563eb, #007bff), nicht organisationsspezifisch
3. **Formloses Design**: Viele E-Mails haben kein Header/Footer, sehr einfaches Layout
4. **Inkonsistente Formatierung**: Unterschiedliche Stile zwischen den E-Mails
5. **Fehlende Branding-Elemente**: Keine organisationsspezifischen Farben, Logos oder Branding

### Positive Aspekte

1. **Responsive Design**: Max-width: 600px für gute Darstellung auf allen Geräten
2. **Strukturierte Inhalte**: Credentials, Buttons, Warnings sind strukturiert
3. **Text-Versionen**: Alle E-Mails haben Text-Versionen für E-Mail-Client-Kompatibilität

---

## Logo-Integration Plan

### Technische Grundlagen

**Logo-Speicherung**:
- Logos werden in der Datenbank als Base64-Data-URL gespeichert (`organization.logo`)
- Format: `data:image/png;base64,...` oder `data:image/jpeg;base64,...`
- Route zum Abrufen: `GET /api/settings/logo` oder `GET /api/settings/logo/base64`

**Organisationskontext**:
- Alle E-Mail-Funktionen haben bereits `organizationId` und optional `branchId` als Parameter
- `sendEmail()` lädt bereits Organisation-Daten für From-Einstellungen

**Wiederverwendung bestehender Services**:
- ✅ **`OrganizationBrandingService`** existiert bereits (`backend/src/services/organizationBrandingService.ts`)
- ✅ Extrahiert Corporate Identity aus Logos (Farben, Schriftarten, Stil)
- ✅ Verwendet Gemini Vision API + Fallback auf sharp-Farb-Extraktion
- ✅ Wird bereits für Touren-Bildgenerierung verwendet
- ✅ Gibt `BrandingInfo` zurück mit `colors.primary`, `colors.secondary`, `colors.accent`, `colors.palette`

### Implementierungsplan

#### Schritt 1: Logo- und Branding-Lade-Funktion erstellen

**Datei**: `backend/src/services/emailService.ts`

**Neue Funktion**: `getOrganizationBranding(organizationId?: number, branchId?: number): Promise<{ logo: string | null; branding: BrandingInfo | null }>`

**Funktionalität**:
- Lade Organisation aus Datenbank
- Prüfe ob `organization.logo` vorhanden ist
- Falls Logo vorhanden:
  - Lade Logo als Base64-Data-URL
  - Extrahiere Branding via `OrganizationBrandingService.extractBrandingFromLogo()`
- Falls nicht vorhanden, gebe `{ logo: null, branding: null }` zurück

**Vorteil**: Nutzt bestehenden Service, keine Code-Duplikation

#### Schritt 2: E-Mail-Template-Helper erstellen

**Datei**: `backend/src/services/emailService.ts`

**Neue Funktion**: `generateEmailTemplate(options: EmailTemplateOptions): string`

**Optionen**:
```typescript
interface EmailTemplateOptions {
  logo?: string | null; // Base64-Data-URL des Logos
  branding?: BrandingInfo | null; // Branding-Informationen (Farben, Schriftarten, Stil)
  headerTitle?: string; // Titel im Header
  content: string; // HTML-Inhalt
  footer?: string; // Footer-Text (optional)
  language?: 'de' | 'en' | 'es';
}
```

**Funktionalität**:
- Generiere einheitliches E-Mail-Template mit Header, Content, Footer
- Integriere Logo im Header (falls vorhanden)
- Verwende `branding.colors.primary` für Header-Farbe (falls vorhanden)
- Fallback auf Standard-Farbe (#2563eb), falls keine Branding-Farbe vorhanden
- Optional: Verwende `branding.fonts.primary` für Schriftart (falls vorhanden)

#### Schritt 3: E-Mail-Funktionen aktualisieren

**Zu aktualisierende Funktionen**:

1. **`sendRegistrationEmail`**:
   - Lade Logo + Branding via `getOrganizationBranding(organizationId)`
   - Verwende `generateEmailTemplate()` mit Logo und Branding
   - Integriere Logo im Header
   - Verwende `branding.colors.primary` für Header-Farbe

2. **`sendPasswordResetEmail`**:
   - Lade Logo + Branding via `getOrganizationBranding(organizationId)`
   - Verwende `generateEmailTemplate()` mit Logo und Branding
   - Integriere Logo im Header
   - Verwende `branding.colors.primary` für Header- und Button-Farbe

3. **`sendCheckInInvitationEmail`** (ReservationNotificationService):
   - Lade Logo + Branding via `getOrganizationBranding(reservation.organizationId, reservation.branchId)`
   - Verwende `generateEmailTemplate()` mit Logo und Branding
   - Integriere Logo im Header
   - Verwende `branding.colors.primary` für Header- und Button-Farbe

4. **Check-in-Einladung Template-basiert** (ReservationNotificationService):
   - Lade Logo + Branding via `getOrganizationBranding(reservation.organizationId, reservation.branchId)`
   - Verwende `generateEmailTemplate()` mit Logo und Branding
   - Integriere Logo im Header
   - Verwende `branding.colors.primary` für Header- und Button-Farbe

5. **`sendCheckInConfirmationEmail`** (ReservationNotificationService):
   - Lade Logo + Branding via `getOrganizationBranding(reservation.organizationId, reservation.branchId)`
   - Verwende `generateEmailTemplate()` mit Logo und Branding
   - Integriere Logo im Header
   - Verwende `branding.colors.primary` für Header-Farbe

**Vorteil**: Nutzt bestehenden `OrganizationBrandingService`, keine Code-Duplikation, konsistente Corporate Identity

---

## Detaillierte Implementierungsschritte

### Phase 1: Logo- und Branding-Lade-Funktion (für E-Mail-Versand)

**Datei**: `backend/src/services/emailService.ts`

**Funktion**: Lädt Logo und gespeichertes Branding aus Datenbank (keine API-Calls!)

```typescript
// backend/src/services/emailService.ts
import { BrandingInfo } from './organizationBrandingService';

/**
 * Lädt Organisationslogo und gespeichertes Branding aus Datenbank
 * WICHTIG: Keine Branding-Extraktion hier - nur Laden aus Datenbank!
 * @param organizationId - ID der Organisation
 * @param branchId - Optional: ID des Branches (für Branch-spezifische Logos)
 * @returns Logo (Base64-Data-URL) und gespeicherte Branding-Informationen
 */
async function getOrganizationBranding(
  organizationId?: number,
  branchId?: number
): Promise<{ logo: string | null; branding: BrandingInfo | null }> {
  if (!organizationId) {
    return { logo: null, branding: null };
  }

  try {
    let logo: string | null = null;
    let branding: BrandingInfo | null = null;

    // Prüfe zuerst Branch (falls vorhanden)
    if (branchId) {
      const branch = await prisma.branch.findUnique({
        where: { id: branchId },
        select: {
          organizationId: true,
          organization: {
            select: { 
              logo: true,
              settings: true
            }
          }
        }
      });

      if (branch?.organization) {
        logo = branch.organization.logo && branch.organization.logo.trim() !== '' 
          ? branch.organization.logo 
          : null;
        
        // Lade Branding aus Settings
        if (branch.organization.settings && typeof branch.organization.settings === 'object') {
          const settings = branch.organization.settings as any;
          branding = settings.branding || null;
        }
      }
    }

    // Fallback: Lade Organisation direkt
    if (!logo || !branding) {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { 
          logo: true,
          settings: true
        }
      });

      if (organization) {
        logo = organization.logo && organization.logo.trim() !== '' 
          ? organization.logo 
          : null;
        
        // Lade Branding aus Settings
        if (organization.settings && typeof organization.settings === 'object') {
          const settings = organization.settings as any;
          branding = settings.branding || null;
        }
      }
    }

    return { logo, branding };
  } catch (error) {
    logger.warn('⚠️ Fehler beim Laden des Organisationslogos/Brandings:', error);
    return { logo: null, branding: null };
  }
}
```

**Vorteil**: Keine API-Calls bei E-Mail-Versand, nur schnelles Laden aus Datenbank

### Phase 2: Manuelle Branding-Extraktion + E-Mail-Template-Generierung (Button)

**WICHTIG**: Branding-Extraktion passiert NUR manuell per Button, NICHT automatisch beim Logo-Upload!

**Datei**: `backend/src/routes/settings.ts` oder `backend/src/controllers/organizationController.ts`

**Neue Route**: `POST /api/settings/branding/extract-and-generate-template`

**Funktionalität** (alles in einem Schritt beim Button-Klick):
1. **Branding-Extraktion**:
   - Lädt aktuelles Logo aus Datenbank
   - Extrahiert Branding via `OrganizationBrandingService.extractBrandingFromLogo()`
   - Speichert Branding in `organization.settings.branding`

2. **E-Mail-Template-Generierung** (Test):
   - Generiert Test-E-Mail-Template mit Logo und Branding
   - Sendet Test-E-Mail an aktuellen Benutzer
   - Zeigt Vorschau des E-Mail-Designs

**Frontend**: Button in E-Mail-Einstellungen "Corporate Identity extrahieren & E-Mail-Template testen"

**Implementierung**:

```typescript
// backend/src/routes/settings.ts oder backend/src/controllers/organizationController.ts
import { OrganizationBrandingService, BrandingInfo } from '../services/organizationBrandingService';
import { generateEmailTemplate } from '../services/emailService';
import { sendEmail } from '../services/emailService';

// POST /api/settings/branding/extract-and-generate-template
router.post('/branding/extract-and-generate-template', authenticateToken, async (req, res) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    // Lade Organisation des Users
    const userRole = await prisma.userRole.findFirst({
      where: { 
        userId: userId,
        lastUsed: true 
      },
      include: {
        role: {
          include: {
            organization: true
          }
        },
        user: {
          select: { email: true }
        }
      }
    });

    if (!userRole?.role.organization) {
      return res.status(404).json({ message: 'Keine Organisation gefunden' });
    }

    const organization = userRole.role.organization;
    const userEmail = userRole.user.email;

    if (!organization.logo || organization.logo.trim() === '') {
      return res.status(400).json({ message: 'Kein Logo vorhanden. Bitte laden Sie zuerst ein Logo hoch.' });
    }

    // Schritt 1: Branding-Extraktion
    logger.log('[Settings] Starte Branding-Extraktion für Organisation:', organization.id);
    const branding = await OrganizationBrandingService.extractBrandingFromLogo(organization.logo);
    
    // Lade aktuelle Settings
    const currentSettings = (organization.settings && typeof organization.settings === 'object') 
      ? organization.settings as any 
      : {};
    
    // Speichere Branding in Settings
    await prisma.organization.update({
      where: { id: organization.id },
      data: {
        settings: {
          ...currentSettings,
          branding: branding
        }
      }
    });
    
    logger.log('[Settings] Branding erfolgreich extrahiert und gespeichert:', {
      hasPrimaryColor: !!branding.colors.primary,
      hasSecondaryColor: !!branding.colors.secondary,
      hasAccentColor: !!branding.colors.accent
    });

    // Schritt 2: E-Mail-Template-Generierung (Test)
    logger.log('[Settings] Generiere Test-E-Mail-Template');
    
    const testContent = `
      <p>Hallo,</p>
      <p>Dies ist eine Test-E-Mail zur Überprüfung Ihrer Corporate Identity.</p>
      <p>Die folgenden Informationen wurden aus Ihrem Logo extrahiert:</p>
      <ul>
        ${branding.colors.primary ? `<li><strong>Hauptfarbe:</strong> <span style="color: ${branding.colors.primary};">${branding.colors.primary}</span></li>` : ''}
        ${branding.colors.secondary ? `<li><strong>Sekundärfarbe:</strong> <span style="color: ${branding.colors.secondary};">${branding.colors.secondary}</span></li>` : ''}
        ${branding.colors.accent ? `<li><strong>Akzentfarbe:</strong> <span style="color: ${branding.colors.accent};">${branding.colors.accent}</span></li>` : ''}
      </ul>
      <p>Diese Farben werden nun in allen E-Mails Ihrer Organisation verwendet.</p>
      <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
    `;

    const testHtml = generateEmailTemplate({
      logo: organization.logo,
      branding: branding,
      headerTitle: organization.displayName || organization.name,
      content: testContent,
      language: 'de'
    });

    // Sende Test-E-Mail
    const emailSent = await sendEmail(
      userEmail,
      'Test: Corporate Identity für E-Mails',
      testHtml,
      'Dies ist eine Test-E-Mail zur Überprüfung Ihrer Corporate Identity.',
      organization.id
    );

    if (!emailSent) {
      logger.warn('[Settings] Test-E-Mail konnte nicht versendet werden');
    }

    res.status(200).json({ 
      message: 'Branding erfolgreich extrahiert und Test-E-Mail versendet',
      branding: {
        hasPrimaryColor: !!branding.colors.primary,
        hasSecondaryColor: !!branding.colors.secondary,
        hasAccentColor: !!branding.colors.accent,
        primaryColor: branding.colors.primary || null
      },
      testEmailSent: emailSent
    });
  } catch (error) {
    logger.error('[Settings] Fehler bei Branding-Extraktion und Template-Generierung:', error);
    res.status(500).json({ 
      message: 'Fehler bei Branding-Extraktion',
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    });
  }
});
```

**Vorteil**: 
- Benutzer sieht sofort, wie E-Mails mit Corporate Identity aussehen
- Branding wird nur bei Bedarf extrahiert (manuell)
- Keine automatische Extraktion beim Logo-Upload

### Phase 3: E-Mail-Template-Generator

```typescript
// backend/src/services/emailService.ts
import { BrandingInfo } from './organizationBrandingService';

interface EmailTemplateOptions {
  logo?: string | null;
  branding?: BrandingInfo | null; // Branding-Informationen (Farben, Schriftarten, Stil)
  headerTitle?: string;
  content: string;
  footer?: string;
  language?: 'de' | 'en' | 'es';
}

/**
 * Generiert einheitliches E-Mail-Template mit Logo und Corporate Identity
 * Nutzt Branding-Informationen für organisationsspezifische Farben
 */
function generateEmailTemplate(options: EmailTemplateOptions): string {
  const {
    logo,
    branding,
    headerTitle = 'Intranet',
    content,
    footer,
    language = 'de'
  } = options;

  const defaultFooter = {
    de: 'Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht auf diese E-Mail.',
    en: 'This email was automatically generated. Please do not reply to this email.',
    es: 'Este correo electrónico fue generado automáticamente. Por favor, no responda a este correo electrónico.'
  };

  const footerText = footer || defaultFooter[language];

  // Verwende Branding-Farbe oder Fallback
  const headerColor = branding?.colors?.primary || '#2563eb';
  const buttonColor = branding?.colors?.primary || '#007bff';
  const secondaryColor = branding?.colors?.secondary || branding?.colors?.accent;

  // Verwende Branding-Schriftart oder Fallback
  const fontFamily = branding?.fonts?.primary 
    ? `${branding.fonts.primary}, Arial, sans-serif`
    : 'Arial, sans-serif';

  // Logo-HTML (falls vorhanden)
  const logoHtml = logo
    ? `<img src="${logo}" alt="${headerTitle}" style="max-height: 60px; max-width: 200px; margin-bottom: 20px;" />`
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: ${fontFamily};
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .email-wrapper {
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      background-color: ${headerColor};
      color: white;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .logo-container {
      margin-bottom: 15px;
    }
    .content {
      padding: 30px;
      background-color: #ffffff;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: ${buttonColor};
      color: white;
      text-decoration: none;
      border-radius: 6px;
      margin: 10px 5px;
    }
    .button:hover {
      opacity: 0.9;
    }
    .footer {
      text-align: center;
      padding: 20px;
      background-color: #f9fafb;
      color: #6b7280;
      font-size: 12px;
      border-top: 1px solid #e5e7eb;
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="header">
      ${logoHtml ? `<div class="logo-container">${logoHtml}</div>` : ''}
      ${headerTitle ? `<h1>${headerTitle}</h1>` : ''}
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>${footerText}</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
```

**Vorteil**: Nutzt Branding-Informationen für organisationsspezifische Farben und Schriftarten

### Phase 4: E-Mail-Funktionen aktualisieren

**Beispiel: `sendRegistrationEmail`**

```typescript
export const sendRegistrationEmail = async (
  email: string,
  username: string,
  password: string,
  organizationId?: number
): Promise<boolean> => {
  // ... bestehender Code für Mailtrap API ...

  // Fallback zu SMTP
  try {
    const transporter = await createTransporter(organizationId);
    
    if (!transporter) {
      logger.warn('⚠️ E-Mail-Transporter nicht verfügbar. E-Mail wurde nicht versendet.');
      return false;
    }

    // NEU: Lade Logo + Branding (nutzt bestehenden OrganizationBrandingService)
    const { logo, branding } = await getOrganizationBranding(organizationId);

    // NEU: Lade Organisationsname für Header
    let organizationName = 'Intranet';
    if (organizationId) {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { displayName: true }
      });
      if (organization?.displayName) {
        organizationName = organization.displayName;
      }
    }

    // NEU: Generiere Content mit Template (inkl. Logo und Branding)
    const content = `
      <p>Hallo,</p>
      <p>Ihr Benutzerkonto wurde erfolgreich erstellt. Hier sind Ihre Anmeldeinformationen:</p>
      
      <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
        <div style="margin: 10px 0; padding: 10px; background-color: #f3f4f6; border-radius: 4px;">
          <span style="font-weight: bold; color: #374151;">Benutzername:</span>
          <span style="font-family: monospace; color: #1f2937; margin-left: 10px;">${username}</span>
        </div>
        <div style="margin: 10px 0; padding: 10px; background-color: #f3f4f6; border-radius: 4px;">
          <span style="font-weight: bold; color: #374151;">E-Mail:</span>
          <span style="font-family: monospace; color: #1f2937; margin-left: 10px;">${email}</span>
        </div>
        <div style="margin: 10px 0; padding: 10px; background-color: #f3f4f6; border-radius: 4px;">
          <span style="font-weight: bold; color: #374151;">Passwort:</span>
          <span style="font-family: monospace; color: #1f2937; margin-left: 10px;">${password}</span>
        </div>
      </div>

      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <strong>⚠️ Wichtig:</strong> Bitte ändern Sie Ihr Passwort nach dem ersten Login aus Sicherheitsgründen.
      </div>

      <p>Sie können sich jetzt mit diesen Anmeldeinformationen anmelden.</p>
      
      <p>Nach der Anmeldung können Sie:</p>
      <ul>
        <li>Einer bestehenden Organisation beitreten</li>
        <li>Eine eigene Organisation erstellen</li>
      </ul>

      <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
    `;

    const html = generateEmailTemplate({
      logo,
      branding, // Nutzt Branding für organisationsspezifische Farben
      headerTitle: organizationName,
      content,
      language: 'de'
    });

    const mailOptions = {
      from: process.env.SMTP_USER || 'noreply@intranet.local',
      to: email,
      subject: 'Willkommen im Intranet - Ihre Anmeldeinformationen',
      html: html,
      text: `...` // Text-Version bleibt gleich
    };

    const info = await transporter.sendMail(mailOptions);
    logger.log('✅ Registrierungs-E-Mail versendet:', info.messageId);
    return true;
  } catch (error) {
    logger.error('❌ Fehler beim Versenden der Registrierungs-E-Mail:', error);
    return false;
  }
};
```

---

## Zusammenfassung

### Gefundene E-Mails

1. ✅ **Registrierungs-E-Mail** - Hat Header, aber kein Logo
2. ✅ **Passwort-Reset-E-Mail** - Hat Header, aber kein Logo
3. ✅ **Check-in-Einladung (Methode 1)** - Sehr formlos, kein Logo
4. ✅ **Check-in-Einladung (Methode 2)** - Hat Container, aber kein Logo
5. ✅ **Check-in-Bestätigung** - Sehr formlos, kein Logo

### Geplante Verbesserungen

1. ✅ **Logo-Integration**: Alle E-Mails erhalten Organisationslogo im Header
2. ✅ **Einheitliches Template**: Alle E-Mails verwenden einheitliches Template
3. ✅ **Corporate Identity-Integration**: Nutzt bestehenden `OrganizationBrandingService` für:
   - Organisationsspezifische Farben (primary, secondary, accent)
   - Schriftarten (falls im Logo erkennbar)
   - Stil-Informationen (mood, layout)
4. ✅ **Verbesserte Formatierung**: Professionelleres Design mit Header, Content, Footer
5. ✅ **Wiederverwendbare Komponenten**: Nutzt bestehende Services, keine Code-Duplikation

### Nächste Schritte

1. **Lade-Funktion**: `getOrganizationBranding()` implementieren (nur Datenbank-Laden, keine API-Calls)
2. **Template-Generator**: `generateEmailTemplate()` implementieren (nutzt gespeichertes Branding)
3. **Button-Route**: `POST /api/settings/branding/extract-and-generate-template` implementieren
   - Branding-Extraktion + E-Mail-Template-Generierung in einem Schritt
4. **Frontend-Button**: Button in E-Mail-Einstellungen hinzufügen
5. **E-Mail-Funktionen**: Alle 5 E-Mail-Funktionen aktualisieren (nutzen gespeichertes Branding)
6. **Testen**: Logo-Anzeige, Corporate Identity, Fallback-Verhalten, Test-E-Mail

### Wichtige Hinweise

- ⚠️ **KEINE automatische Branding-Extraktion**: Nur manuell per Button, nicht beim Logo-Upload
- ⚠️ **Button macht beides**: Branding-Extraktion + E-Mail-Template-Generierung in einem Schritt
- ⚠️ **Performance**: Keine Gemini Vision API-Calls bei E-Mail-Versand, nur schnelles Datenbank-Laden
- ⚠️ **Caching**: Branding wird in `organization.settings.branding` gecacht
- ⚠️ **Fallback**: Wenn kein Branding vorhanden, verwende Standard-Farben (#2563eb)
- ⚠️ **Test-E-Mail**: Button sendet Test-E-Mail an aktuellen Benutzer zur Vorschau

### Vorteile der Wiederverwendung

- ✅ **Keine Code-Duplikation**: Nutzt bestehenden `OrganizationBrandingService`
- ✅ **Konsistente Corporate Identity**: Gleiche Farben wie bei Touren-Bildgenerierung
- ✅ **Automatische Farb-Extraktion**: Gemini Vision API + sharp Fallback
- ✅ **Wartbarkeit**: Änderungen am Branding-Service profitieren alle Features
- ✅ **Performance**: Branding kann gecacht werden (falls implementiert)


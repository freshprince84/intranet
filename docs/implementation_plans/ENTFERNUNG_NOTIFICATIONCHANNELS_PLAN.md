# Plan: Entfernung von notificationChannels-Prüfung

**Datum**: 2025-01-XX  
**Status**: 📋 Planung (NICHT umsetzen)

---

## Analyse: Woher kommt der Wert?

### 1. Wie wird der Wert in die DB geschrieben?

**Über API-Endpoint `updateCurrentOrganization` (PUT /api/organizations/current):**

```1126:1189:backend/src/controllers/organizationController.ts
    if (validatedData.settings !== undefined) {
      const currentSettings = (organization.settings as any) || {};
        const newSettings = { ...currentSettings, ...validatedData.settings };
        
        // ✅ LobbyPMS: Setze feste URL wenn nicht vorhanden
        if (newSettings.lobbyPms && !newSettings.lobbyPms.apiUrl) {
          newSettings.lobbyPms.apiUrl = 'https://api.lobbypms.com';
        }

      // ✅ VALIDIERUNG: Validiere API-Settings-Struktur
      try {
        validateApiSettings(newSettings);
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          return res.status(400).json({ 
            message: 'Validierungsfehler bei API-Einstellungen', 
            errors: validationError.errors 
          });
        }
        throw validationError;
      }

      // ✅ URL-VALIDIERUNG: Prüfe alle API-URLs gegen Whitelist
      const urlErrors = validateAllApiUrls(newSettings);
      if (urlErrors.length > 0) {
        return res.status(400).json({ 
          message: 'Ungültige API-URLs', 
          errors: urlErrors 
        });
      }

      // ✅ TTLOCK PASSWORD: MD5-Hash für TTLock Password erstellen (falls vorhanden)
      if (newSettings.doorSystem?.password && !newSettings.doorSystem.password.match(/^[a-f0-9]{32}$/i)) {
        // Password ist noch nicht gehasht (32-stelliger MD5-Hash)
        const crypto = require('crypto');
        newSettings.doorSystem.password = crypto.createHash('md5').update(newSettings.doorSystem.password).digest('hex');
        logger.log('[TTLock] Password wurde MD5-gehasht');
      }

      // ✅ VERSCHLÜSSELUNG: Verschlüssele alle API-Keys vor dem Speichern
      // ✅ PERFORMANCE: encryptApiSettings prüft jetzt ob bereits verschlüsselt (verhindert mehrfache Verschlüsselung)
      try {
        const encryptedSettings = encryptApiSettings(newSettings);
        
        // ✅ PERFORMANCE: Validiere Settings-Größe (Warnung bei > 1 MB)
        const settingsSize = JSON.stringify(encryptedSettings).length;
        if (settingsSize > 1024 * 1024) { // > 1 MB
          logger.warn(`[updateCurrentOrganization] ⚠️ Settings sind sehr groß: ${(settingsSize / 1024 / 1024).toFixed(2)} MB`);
          logger.warn(`[updateCurrentOrganization] ⚠️ Möglicherweise mehrfach verschlüsselte API-Keys vorhanden!`);
        }
        
        updateData.settings = encryptedSettings;
      } catch (encryptionError) {
        logger.error('Error encrypting API settings:', encryptionError);
        // Wenn ENCRYPTION_KEY nicht gesetzt ist, speichere unverschlüsselt (für Migration)
        // TODO: Später sollte dies ein Fehler sein
        if (encryptionError instanceof Error && encryptionError.message.includes('ENCRYPTION_KEY')) {
          logger.warn('⚠️ ENCRYPTION_KEY nicht gesetzt - speichere unverschlüsselt (nur für Migration!)');
          updateData.settings = newSettings;
        } else {
          throw encryptionError;
        }
      }
```

**Wann wird es gesetzt?**
- Wenn User Organization Settings bearbeitet und speichert
- Frontend sendet `settings` im Request-Body
- Backend merged `currentSettings` mit `validatedData.settings`
- **ABER**: Frontend sendet `notificationChannels` NICHT mit (weil kein UI-Feld vorhanden)

### 2. Woher kommt der Wert in die DB?

**Optionen:**
1. **Script** (`add-whatsapp-to-notification-channels.ts`):
   - Einmalig ausgeführt für Organization 1
   - Fügt WhatsApp zu `notificationChannels` hinzu
   - **Absolut unnötig** - war nur ein einmaliger Fix

2. **Direkt in DB**:
   - Manuell geschrieben
   - **Niemand macht das normalerweise**

3. **Über API**:
   - Wenn jemand `settings.lobbyPms.notificationChannels` explizit im Request-Body setzt
   - **Niemand macht das** - Frontend hat kein Feld dafür

4. **Seed-Script**:
   - **NICHT vorhanden** - `seed.ts` setzt `notificationChannels` nicht

### 3. Was macht das Script?

```10:83:backend/scripts/add-whatsapp-to-notification-channels.ts
async function addWhatsAppToNotificationChannels() {
  try {
    console.log('🔧 Füge WhatsApp zu Notification Channels hinzu...\n');

    const organization = await prisma.organization.findUnique({
      where: { id: 1 },
      select: {
        id: true,
        name: true,
        displayName: true,
        settings: true
      }
    });

    if (!organization) {
      throw new Error('Organisation 1 nicht gefunden!');
    }

    console.log(`✅ Organisation: ${organization.displayName}\n`);

    const currentSettings = (organization.settings || {}) as any;
    
    // Aktualisiere Notification Channels
    const currentChannels = currentSettings.lobbyPms?.notificationChannels || ['email'];
    
    if (!currentChannels.includes('whatsapp')) {
      currentChannels.push('whatsapp');
      console.log('📝 Aktualisiere Notification Channels:');
      console.log(`   Vorher: ${JSON.stringify(currentSettings.lobbyPms?.notificationChannels || ['email'])}`);
      console.log(`   Nachher: ${JSON.stringify(currentChannels)}`);
    } else {
      console.log('✅ WhatsApp ist bereits in Notification Channels');
      console.log(`   Aktuelle Channels: ${JSON.stringify(currentChannels)}`);
    }

    const newSettings = {
      ...currentSettings,
      lobbyPms: {
        ...currentSettings.lobbyPms,
        notificationChannels: currentChannels
      }
    };

    // Verschlüssele Settings
    let encryptedSettings;
    try {
      encryptedSettings = encryptApiSettings(newSettings);
      console.log('\n✅ Settings verschlüsselt');
    } catch (encryptionError) {
      console.warn('⚠️  ENCRYPTION_KEY nicht gesetzt - speichere unverschlüsselt');
      encryptedSettings = newSettings;
    }

    // Speichere in DB
    await prisma.organization.update({
      where: { id: 1 },
      data: {
        settings: encryptedSettings
      }
    });

    console.log('\n✅ Notification Channels erfolgreich aktualisiert!');
    console.log(`   Channels: ${JSON.stringify(currentChannels)}`);

  } catch (error) {
    console.error('\n❌ Fehler:', error);
    if (error instanceof Error) {
      console.error('   Fehlermeldung:', error.message);
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
```

**Fazit:**
- **Einmalig ausgeführt** für Organization 1
- **Absolut unnötig** - war nur ein einmaliger Fix
- **Kein Teil des Systems** - nur ein Hilfsscript

### 4. Was wird über den API-Endpoint gesetzt?

**Frontend (`ApiConfigurationTab.tsx`):**
- **KEIN Feld für `notificationChannels`** vorhanden
- User kann es **NICHT** im Frontend ändern
- Frontend sendet `notificationChannels` **NICHT** mit

**Backend (`updateCurrentOrganization`):**
- Wenn `validatedData.settings` gesetzt ist, werden Settings aktualisiert
- Settings werden **gemerged** mit bestehenden Settings
- **ABER**: Da Frontend `notificationChannels` nicht sendet, bleibt der alte Wert erhalten (oder wird auf `undefined` gesetzt, wenn Settings komplett überschrieben werden)

**Fazit:**
- `notificationChannels` wird **NICHT** über den API-Endpoint gesetzt (außer manuell im Request-Body)
- Frontend hat **KEIN** UI-Feld dafür
- User kann es **NICHT** ändern

---

## Plan: Entfernung von notificationChannels-Prüfung

### Schritt 1: Backend - Entfernung der Prüfung

**Datei: `backend/src/services/reservationNotificationService.ts`**

#### 1.1 `sendLateCheckInInvitations` (Zeile 428-558)

**Entfernen:**
- Zeile 452: `const notificationChannels = lobbyPmsSettings.notificationChannels || ['email'];`
- Zeile 508: `if (notificationChannels.includes('email') && reservation.guestEmail) {` → `if (reservation.guestEmail) {`
- Zeile 516: `if (notificationChannels.includes('whatsapp') && reservation.guestPhone) {` → `if (reservation.guestPhone) {`

**Ergebnis:**
- Email wird versendet, wenn `guestEmail` vorhanden
- WhatsApp wird versendet, wenn `guestPhone` vorhanden
- Beides wird versendet, wenn beide vorhanden

#### 1.2 `sendPasscodeNotification` (Zeile 1128-1720)

**Entfernen:**
- Zeile 1390-1408: Settings-Laden und `notificationChannels`-Definition
- Zeile 1500: `if (notificationChannels.includes('email') && reservation.guestEmail) {` → `if (reservation.guestEmail) {`
- Zeile 1549: `if (notificationChannels.includes('whatsapp') && reservation.guestPhone) {` → `if (reservation.guestPhone) {`
- Zeile 1711-1713: Logging für `notificationChannels`

**Ergebnis:**
- Email wird versendet, wenn `guestEmail` vorhanden
- WhatsApp wird versendet, wenn `guestPhone` vorhanden
- Beides wird versendet, wenn beide vorhanden

#### 1.3 `sendCheckInConfirmation` (Zeile 1722-2360)

**Entfernen:**
- Zeile 1783-1801: Settings-Laden und `notificationChannels`-Definition
- Zeile 1988: `if (notificationChannels.includes('email') && finalGuestEmail) {` → `if (finalGuestEmail) {`
- Zeile 2045: `if (notificationChannels.includes('whatsapp') && finalGuestPhone) {` → `if (finalGuestPhone) {`
- Zeile 2295-2297: Logging für `notificationChannels`

**Ergebnis:**
- Email wird versendet, wenn `guestEmail` vorhanden
- WhatsApp wird versendet, wenn `guestPhone` vorhanden
- Beides wird versendet, wenn beide vorhanden

#### 1.4 `sendReservationInvitation` (Zeile 567-1361)

**Hinzufügen:**
- Nichts - bereits korrekt (versendet ohne Prüfung)

**Ergebnis:**
- Bleibt unverändert (versendet bereits ohne `notificationChannels`-Prüfung)

#### 1.5 `generatePinAndSendNotification` (deprecated, delegiert an `sendPasscodeNotification`)

**Entfernen:**
- Zeile 2377-2391: Settings-Laden und `notificationChannels`-Definition (falls noch vorhanden)

**Ergebnis:**
- Delegiert bereits an `sendPasscodeNotification` (wird automatisch korrigiert)

### Schritt 2: Backend - Entfernung aus Validierung

**Datei: `backend/src/validation/organizationSettingsSchema.ts`**

**Entfernen:**
- Zeile 19: `notificationChannels: z.array(z.enum(['email', 'whatsapp'])).optional(),`

**Ergebnis:**
- `notificationChannels` wird nicht mehr validiert
- Bestehende Werte in DB bleiben erhalten (werden ignoriert)

**Datei: `backend/src/validation/branchSettingsSchema.ts`**

**Entfernen:**
- Zeile 14: `notificationChannels: z.array(z.enum(['email', 'whatsapp'])).default(['email']),`

**Ergebnis:**
- `notificationChannels` wird nicht mehr validiert
- Bestehende Werte in DB bleiben erhalten (werden ignoriert)

### Schritt 3: Frontend - Entfernung aus Types

**Datei: `frontend/src/types/organization.ts`**

**Entfernen:**
- Zeile 71: `notificationChannels?: ('email' | 'whatsapp')[];`

**Ergebnis:**
- TypeScript-Typ wird entfernt
- Frontend-Code, der `notificationChannels` verwendet, wird Fehler werfen (muss auch entfernt werden)

### Schritt 4: Frontend - Entfernung aus BranchManagementTab

**Datei: `frontend/src/components/BranchManagementTab.tsx`**

**Entfernen:**
- Zeile 188: `notificationChannels: ['email'] as string[],` (in Default-Werten)
- Zeile 367: `notificationChannels: ['email'] as string[],` (in Default-Werten)
- Zeile 516: `notificationChannels: existingLobbyPms.notificationChannels || ['email'],` (beim Laden)

**Ergebnis:**
- `notificationChannels` wird nicht mehr im Frontend verwendet
- Branch-Settings werden ohne `notificationChannels` gespeichert

### Schritt 5: Backend - Entfernung des Scripts (optional)

**Datei: `backend/scripts/add-whatsapp-to-notification-channels.ts`**

**Entfernen:**
- Komplette Datei löschen

**Ergebnis:**
- Script wird nicht mehr benötigt
- **Optional**: Kann auch bleiben (wird nicht mehr verwendet)

---

## Zusammenfassung

### Was wird entfernt:

1. **Backend:**
   - `notificationChannels`-Prüfung in `sendLateCheckInInvitations`
   - `notificationChannels`-Prüfung in `sendPasscodeNotification`
   - `notificationChannels`-Prüfung in `sendCheckInConfirmation`
   - `notificationChannels`-Validierung in `organizationSettingsSchema.ts`
   - `notificationChannels`-Validierung in `branchSettingsSchema.ts`

2. **Frontend:**
   - `notificationChannels`-Type in `organization.ts`
   - `notificationChannels`-Verwendung in `BranchManagementTab.tsx`

3. **Optional:**
   - Script `add-whatsapp-to-notification-channels.ts` löschen

### Was bleibt:

- Bestehende `notificationChannels`-Werte in der Datenbank bleiben erhalten (werden ignoriert)
- Keine Migration nötig (Werte werden einfach nicht mehr verwendet)

### Ergebnis:

- **Email wird versendet**, wenn `guestEmail` vorhanden ist
- **WhatsApp wird versendet**, wenn `guestPhone` vorhanden ist
- **Beides wird versendet**, wenn beide vorhanden sind
- **Keine Prüfung** auf `notificationChannels` mehr
- **Einfacher, klarer Code** ohne unnötige Konfigurationsebene

---

## WICHTIG: Regeln beachten

- **NICHT ändern**: Bestehende Funktionalität
- **NUR entfernen**: `notificationChannels`-Prüfung
- **NUR vereinfachen**: Code ohne unnötige Konfigurationsebene
- **NUR testen**: Nach Änderungen alle Notification-Methoden testen



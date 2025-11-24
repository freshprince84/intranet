# Implementierungsplan: Land-basierte WhatsApp-Sprache für Reservierungen

**Datum**: 2025-01-22  
**Status**: 📋 Planung (noch nicht implementiert)  
**Ziel**: Land beim Reservation-Import extrahieren und WhatsApp-Sprache basierend auf Gast-Land anpassen

---

## 🎯 Zielsetzung

1. **Land beim Import extrahieren**: Beim LobbyPMS- und Email-Import das Land des Gastes extrahieren und als `guestNationality` speichern
2. **Sprache basierend auf Land bestimmen**: Automatisch die passende Sprache für WhatsApp-Nachrichten basierend auf dem Gast-Land auswählen
3. **Branch-spezifische Templates**: Jeder Branch kann unterschiedliche Templates/Sprachen haben
4. **Rückwärtskompatibilität**: Bestehende Reservierungen ohne Land funktionieren weiterhin (Fallback auf Standard-Sprache)

---

## 📊 Aktueller Stand

### ✅ Bereits vorhanden

1. **Datenbank-Feld**: `guestNationality` existiert bereits im Schema (`backend/prisma/schema.prisma`, Zeile 1120)
2. **WhatsApp Branch-Support**: `WhatsAppService` unterstützt bereits Branch-basierte Konfiguration
3. **Template-Sprache-Anpassung**: `getTemplateNameForLanguage()` passt Template-Namen basierend auf Sprache an
4. **Language Detection Service**: `LanguageDetectionService` existiert für Telefonnummern-basierte Spracherkennung
5. **Email-Parser**: Extrahiert bereits `nationality` aus Emails, speichert es aber nicht

### ❌ Fehlend

1. **Land-Extraktion beim LobbyPMS Import**: `holder.pais` wird nicht extrahiert
2. **Land-Speicherung beim Email Import**: `nationality` wird extrahiert, aber nicht als `guestNationality` gespeichert
3. **Land-zu-Sprache-Mapping**: Keine Mapping-Funktion von Ländern zu Sprachen
4. **Sprache-basierte Template-Auswahl**: Sprache wird aktuell nur aus Environment-Variable gelesen, nicht basierend auf Gast-Land

---

## 🔧 Implementierungsplan

### Phase 1: Land-Extraktion und Speicherung

#### 1.1 LobbyPMS Import: Land extrahieren

**Datei**: `backend/src/services/lobbyPmsService.ts`  
**Methode**: `syncReservation()`  
**Zeile**: ~568-574

**Änderung**:
- `holder.pais` aus der LobbyPMS API Response extrahieren
- Als `guestNationality` in `reservationData` speichern

**Code-Änderung**:
```typescript
// Aktuell (Zeile 568-574):
const holder = lobbyReservation.holder || {};
const guestName = (holder.name && holder.surname) 
  ? `${holder.name} ${holder.surname}${holder.second_surname ? ' ' + holder.second_surname : ''}`.trim()
  : (lobbyReservation.guest_name || 'Unbekannt');
const guestEmail = holder.email || lobbyReservation.guest_email || null;
const guestPhone = holder.phone || lobbyReservation.guest_phone || null;

// NEU: Land extrahieren
const guestNationality = holder.pais || null;

// In reservationData hinzufügen (Zeile ~628):
const reservationData = {
  // ... bestehende Felder ...
  guestNationality: guestNationality, // NEU
};
```

**Hinweis**: 
- `holder.pais` kommt als String (z.B. "Francia", "Colombia", "Germany")
- Wird direkt als `guestNationality` gespeichert (keine Konvertierung nötig)

---

#### 1.2 Email Import: Nationalität speichern

**Datei**: `backend/src/services/emailReservationService.ts`  
**Methode**: `createReservationFromEmail()`  
**Zeile**: ~45-64

**Änderung**:
- `parsedEmail.nationality` als `guestNationality` in `reservationData` speichern

**Code-Änderung**:
```typescript
// Aktuell (Zeile 45-64):
const reservationData: any = {
  lobbyReservationId: parsedEmail.reservationCode,
  guestName: parsedEmail.guestName.trim(),
  checkInDate: parsedEmail.checkInDate,
  checkOutDate: parsedEmail.checkOutDate,
  status: ReservationStatus.confirmed,
  paymentStatus: PaymentStatus.pending,
  amount: parsedEmail.amount,
  currency: parsedEmail.currency || 'COP',
  organizationId: organizationId,
  branchId: branch?.id || null
};

// Setze Kontaktinformationen
if (parsedEmail.guestEmail) {
  reservationData.guestEmail = parsedEmail.guestEmail.trim();
}
if (parsedEmail.guestPhone) {
  reservationData.guestPhone = parsedEmail.guestPhone.trim();
}

// NEU: Nationalität speichern
if (parsedEmail.nationality) {
  reservationData.guestNationality = parsedEmail.nationality.trim();
}
```

**Hinweis**:
- `parsedEmail.nationality` wird bereits vom `EmailReservationParser` extrahiert (z.B. "Bielorrusia", "Colombia")
- Wird direkt als `guestNationality` gespeichert

---

### Phase 2: Land-zu-Sprache-Mapping

#### 2.1 Neuer Service: CountryLanguageService

**Neue Datei**: `backend/src/services/countryLanguageService.ts`

**Zweck**: 
- Mapping von Ländern (als String, z.B. "Francia", "Colombia") zu Sprachcodes (z.B. "es", "en", "de")
- Unterstützt verschiedene Schreibweisen (Spanisch, Englisch, Deutsch)

**Implementierung**:
```typescript
/**
 * Country Language Service
 * 
 * Mappt Länder zu Sprachen für WhatsApp-Template-Auswahl
 */
export class CountryLanguageService {
  /**
   * Mapping: Land-Name (verschiedene Schreibweisen) -> Sprachcode
   * 
   * Unterstützt:
   * - Spanische Namen (z.B. "Francia", "Colombia")
   * - Englische Namen (z.B. "France", "Colombia")
   * - Deutsche Namen (z.B. "Frankreich", "Kolumbien")
   */
  private static readonly COUNTRY_LANGUAGE_MAP: Record<string, string> = {
    // Spanisch-sprachige Länder
    'colombia': 'es',
    'colombie': 'es',
    'mexico': 'es',
    'méxico': 'es',
    'argentina': 'es',
    'spain': 'es',
    'españa': 'es',
    'espana': 'es',
    'chile': 'es',
    'peru': 'es',
    'perú': 'es',
    'venezuela': 'es',
    'ecuador': 'es',
    'bolivia': 'es',
    'paraguay': 'es',
    'uruguay': 'es',
    'costa rica': 'es',
    'panama': 'es',
    'panamá': 'es',
    'nicaragua': 'es',
    'honduras': 'es',
    'guatemala': 'es',
    'el salvador': 'es',
    'republica dominicana': 'es',
    'república dominicana': 'es',
    'cuba': 'es',
    'puerto rico': 'es',
    
    // Englisch-sprachige Länder
    'united states': 'en',
    'usa': 'en',
    'united kingdom': 'en',
    'uk': 'en',
    'canada': 'en',
    'australia': 'en',
    'new zealand': 'en',
    'south africa': 'en',
    'ireland': 'en',
    'singapore': 'en',
    'philippines': 'en',
    'filipinas': 'en',
    
    // Deutsch-sprachige Länder
    'germany': 'de',
    'alemania': 'de',
    'deutschland': 'de',
    'switzerland': 'de',
    'suiza': 'es', // Schweiz: Spanisch als Fallback (da hauptsächlich spanisch-sprachige Gäste)
    'schweiz': 'de',
    'austria': 'de',
    'austria': 'de',
    'österreich': 'de',
    
    // Französisch-sprachige Länder
    'france': 'en', // Frankreich: Englisch als Fallback (keine französischen Templates)
    'francia': 'en',
    'frankreich': 'en',
    'belgium': 'en',
    'bélgica': 'en',
    'belgien': 'en',
    'belgique': 'en',
    
    // Italienisch-sprachige Länder
    'italy': 'en', // Italien: Englisch als Fallback
    'italia': 'en',
    'italien': 'en',
    
    // Portugiesisch-sprachige Länder
    'brazil': 'en', // Brasilien: Englisch als Fallback (keine portugiesischen Templates)
    'brasil': 'en',
    'brasilien': 'en',
    'portugal': 'en',
    
    // Weitere Länder (Fallback auf Englisch)
    'netherlands': 'en',
    'holanda': 'en',
    'niederlande': 'en',
    'poland': 'en',
    'polonia': 'en',
    'polen': 'en',
    'russia': 'en',
    'rusia': 'en',
    'russland': 'en',
    'china': 'en',
    'japan': 'en',
    'japón': 'en',
    'japan': 'en',
    'korea': 'en',
    'corea': 'en',
    'india': 'en',
    'turkey': 'en',
    'turquía': 'en',
    'türkei': 'en',
    'egypt': 'en',
    'egipto': 'en',
    'ägypten': 'en',
    'bielorrusia': 'en', // Belarus: Englisch als Fallback
    'belarus': 'en',
    'belarus': 'en',
  };

  /**
   * Bestimmt Sprachcode basierend auf Land-Name
   * 
   * @param countryName - Land-Name (z.B. "Francia", "Colombia", "Germany")
   * @returns Sprachcode ('es', 'en', 'de') oder 'es' als Fallback
   */
  static getLanguageForCountry(countryName: string | null | undefined): string {
    if (!countryName) {
      return 'es'; // Fallback: Spanisch (Standard für Kolumbien)
    }

    // Normalisiere: Kleinschreibung, entferne Leerzeichen
    const normalized = countryName
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');

    // Direktes Mapping
    if (this.COUNTRY_LANGUAGE_MAP[normalized]) {
      return this.COUNTRY_LANGUAGE_MAP[normalized];
    }

    // Fallback: Prüfe ob Teilstring matcht (z.B. "United States" -> "united states")
    for (const [country, language] of Object.entries(this.COUNTRY_LANGUAGE_MAP)) {
      if (normalized.includes(country) || country.includes(normalized)) {
        return language;
      }
    }

    // Fallback: Spanisch (Standard für Kolumbien)
    return 'es';
  }

  /**
   * Bestimmt Sprachcode für Reservation
   * 
   * Priorität:
   * 1. reservation.guestNationality (wenn vorhanden)
   * 2. reservation.guestPhone (Telefonnummer-basierte Erkennung)
   * 3. Fallback: 'es' (Spanisch)
   * 
   * @param reservation - Reservation mit guestNationality und/oder guestPhone
   * @returns Sprachcode ('es', 'en', 'de')
   */
  static getLanguageForReservation(reservation: {
    guestNationality?: string | null;
    guestPhone?: string | null;
  }): string {
    // Priorität 1: Land-basierte Erkennung
    if (reservation.guestNationality) {
      const language = this.getLanguageForCountry(reservation.guestNationality);
      console.log(`[CountryLanguageService] Sprache basierend auf Land "${reservation.guestNationality}": ${language}`);
      return language;
    }

    // Priorität 2: Telefonnummer-basierte Erkennung (Fallback)
    if (reservation.guestPhone) {
      const { LanguageDetectionService } = require('./languageDetectionService');
      const language = LanguageDetectionService.detectLanguageFromPhoneNumber(reservation.guestPhone);
      console.log(`[CountryLanguageService] Sprache basierend auf Telefonnummer "${reservation.guestPhone}": ${language}`);
      return language;
    }

    // Fallback: Spanisch
    console.log(`[CountryLanguageService] Keine Sprache-Information gefunden, Fallback: es`);
    return 'es';
  }
}
```

**Hinweise**:
- Mapping unterstützt verschiedene Schreibweisen (Spanisch, Englisch, Deutsch)
- Fallback auf 'es' (Spanisch) für unbekannte Länder
- Priorität: Land > Telefonnummer > Fallback

---

### Phase 3: Sprache-basierte Template-Auswahl

#### 3.1 WhatsAppService: Sprache aus Reservation bestimmen

**Datei**: `backend/src/services/whatsappService.ts`  
**Methode**: `sendTemplateMessageDirectly()`  
**Zeile**: ~567-606

**Änderung**:
- Sprache nicht mehr nur aus Environment-Variable lesen
- Sprache basierend auf Reservation bestimmen (wenn Reservation vorhanden)

**Code-Änderung**:
```typescript
// Aktuell (Zeile 567-606):
async sendTemplateMessageDirectly(
  to: string,
  templateName: string,
  templateParams: string[],
  message?: string
): Promise<boolean> {
  // ...
  // Template-Sprache
  const languageCode = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'es';
  // ...
}

// NEU: Reservation-Parameter hinzufügen
async sendTemplateMessageDirectly(
  to: string,
  templateName: string,
  templateParams: string[],
  message?: string,
  reservation?: { guestNationality?: string | null; guestPhone?: string | null } // NEU
): Promise<boolean> {
  // ...
  // Template-Sprache: Reservation > Environment-Variable > Fallback
  let languageCode: string;
  if (reservation) {
    const { CountryLanguageService } = require('./countryLanguageService');
    languageCode = CountryLanguageService.getLanguageForReservation(reservation);
  } else {
    languageCode = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'es';
  }
  console.log(`[WhatsApp Service] Template-Sprache: ${languageCode} (${reservation ? 'basierend auf Reservation' : 'aus Environment-Variable'})`);
  // ...
}
```

**Hinweis**:
- Reservation-Parameter ist optional (Rückwärtskompatibilität)
- Wenn Reservation vorhanden: Land-basierte Sprache
- Wenn Reservation fehlt: Environment-Variable (wie bisher)

---

#### 3.2 ReservationNotificationService: Reservation übergeben

**Datei**: `backend/src/services/reservationNotificationService.ts`  
**Methode**: `sendReservationInvitation()`  
**Zeile**: ~382-387

**Änderung**:
- Reservation-Daten an `sendTemplateMessageDirectly()` übergeben

**Code-Änderung**:
```typescript
// Aktuell (Zeile 382-387):
const templateResult = await whatsappService.sendTemplateMessageDirectly(
  guestPhone,
  baseTemplateName,
  templateParams,
  sentMessage
);

// NEU: Reservation-Daten übergeben
const templateResult = await whatsappService.sendTemplateMessageDirectly(
  guestPhone,
  baseTemplateName,
  templateParams,
  sentMessage,
  {
    guestNationality: reservation.guestNationality,
    guestPhone: reservation.guestPhone
  }
);
```

**Hinweis**:
- Reservation ist bereits verfügbar (wird aus DB geladen)
- Übergabe von `guestNationality` und `guestPhone` für Sprache-Erkennung

---

#### 3.3 Weitere Stellen: Reservation-Daten übergeben

**Zu aktualisierende Stellen**:

1. **`backend/src/controllers/reservationController.ts`**
   - Methode: `updateGuestContact()` (Zeile ~241)
   - Änderung: Reservation-Daten an `sendMessageWithFallback()` übergeben

2. **`backend/src/queues/workers/updateGuestContactWorker.ts`**
   - Methode: Worker-Funktion (Zeile ~172-178)
   - Änderung: Reservation-Daten an `sendMessageWithFallback()` übergeben

3. **`backend/src/services/boldPaymentService.ts`**
   - Methode: `createPaymentLink()` (Zeile ~736)
   - Änderung: Reservation-Daten an WhatsApp-Service übergeben (falls verwendet)

**Hinweis**: 
- `sendMessageWithFallback()` muss ebenfalls Reservation-Parameter erhalten
- Siehe Phase 3.4

---

#### 3.4 WhatsAppService: sendMessageWithFallback erweitern

**Datei**: `backend/src/services/whatsappService.ts`  
**Methode**: `sendMessageWithFallback()`  
**Zeile**: ~427-519

**Änderung**:
- Reservation-Parameter hinzufügen
- Sprache basierend auf Reservation bestimmen

**Code-Änderung**:
```typescript
// Aktuell (Zeile 427-432):
async sendMessageWithFallback(
  to: string,
  message: string,
  templateName?: string,
  templateParams?: string[]
): Promise<boolean> {
  // ...
}

// NEU: Reservation-Parameter hinzufügen
async sendMessageWithFallback(
  to: string,
  message: string,
  templateName?: string,
  templateParams?: string[],
  reservation?: { guestNationality?: string | null; guestPhone?: string | null } // NEU
): Promise<boolean> {
  // ...
  // Template-Sprache: Reservation > Environment-Variable > Fallback
  let languageCode: string;
  if (reservation) {
    const { CountryLanguageService } = require('./countryLanguageService');
    languageCode = CountryLanguageService.getLanguageForReservation(reservation);
  } else {
    languageCode = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'es';
  }
  console.log(`[WhatsApp Service] Template-Sprache: ${languageCode} (${reservation ? 'basierend auf Reservation' : 'aus Environment-Variable'})`);
  // ...
}
```

**Hinweis**:
- Reservation-Parameter ist optional (Rückwärtskompatibilität)
- Alle bestehenden Aufrufe funktionieren weiterhin

---

### Phase 4: Branch-spezifische Templates (Optional)

#### 4.1 Branch Settings: Template-Namen pro Sprache

**Zweck**: 
- Jeder Branch kann unterschiedliche Template-Namen pro Sprache haben
- Beispiel: Branch "Manila" verwendet `reservation_checkin_invitation_manila_es` für Spanisch

**Datenbank-Schema**: 
- Keine Änderung nötig (verwendet `Branch.whatsappSettings` JSON-Feld)

**Implementierung** (Optional, für später):
```typescript
// In WhatsAppService.loadSettings():
// Lade Branch-spezifische Template-Namen (falls vorhanden)
const branchTemplateNames = whatsappSettings?.templateNames;
if (branchTemplateNames) {
  this.templateNames = branchTemplateNames; // z.B. { es: 'reservation_checkin_invitation', en: 'reservation_checkin_invitation_en' }
}

// In getTemplateNameForLanguage():
// Verwende Branch-spezifischen Template-Namen (falls vorhanden)
if (this.templateNames && this.templateNames[languageCode]) {
  return this.templateNames[languageCode];
}
// Fallback: Standard-Logik (Unterstrich für Englisch)
```

**Hinweis**: 
- Diese Phase ist optional
- Kann später implementiert werden, wenn Branch-spezifische Templates benötigt werden
- Aktuell: Templates haben gleichen Namen, unterschiedliche Sprachen (von WhatsApp verwaltet)

---

## 🔄 Rückwärtskompatibilität

### Sichergestellt durch:

1. **Optionale Parameter**: 
   - Reservation-Parameter ist optional in allen Methoden
   - Bestehende Aufrufe funktionieren weiterhin

2. **Fallback-Mechanismen**:
   - Wenn `guestNationality` fehlt: Telefonnummer-basierte Erkennung
   - Wenn Telefonnummer fehlt: Environment-Variable
   - Wenn Environment-Variable fehlt: 'es' (Spanisch)

3. **Bestehende Reservierungen**:
   - Reservierungen ohne `guestNationality` funktionieren weiterhin
   - Fallback auf Telefonnummer oder Environment-Variable

---

## 📋 Implementierungs-Checkliste

### Phase 1: Land-Extraktion und Speicherung
- [ ] **1.1** LobbyPMS Import: `holder.pais` extrahieren und als `guestNationality` speichern
- [ ] **1.2** Email Import: `parsedEmail.nationality` als `guestNationality` speichern
- [ ] **1.3** Test: LobbyPMS Import mit `holder.pais` testen
- [ ] **1.4** Test: Email Import mit `nationality` testen

### Phase 2: Land-zu-Sprache-Mapping
- [ ] **2.1** Neuer Service: `CountryLanguageService` erstellen
- [ ] **2.2** Mapping: Länder zu Sprachen definieren
- [ ] **2.3** Test: Verschiedene Länder testen (Colombia → es, France → en, Germany → de)
- [ ] **2.4** Test: Unbekannte Länder (Fallback auf 'es')

### Phase 3: Sprache-basierte Template-Auswahl
- [ ] **3.1** WhatsAppService: `sendTemplateMessageDirectly()` erweitern (Reservation-Parameter)
- [ ] **3.2** WhatsAppService: `sendMessageWithFallback()` erweitern (Reservation-Parameter)
- [ ] **3.3** ReservationNotificationService: Reservation-Daten übergeben
- [ ] **3.4** reservationController: Reservation-Daten übergeben
- [ ] **3.5** updateGuestContactWorker: Reservation-Daten übergeben
- [ ] **3.6** Test: WhatsApp-Versand mit verschiedenen Ländern testen

### Phase 4: Dokumentation
- [ ] **4.1** Code-Kommentare aktualisieren
- [ ] **4.2** README/Dokumentation aktualisieren (falls nötig)

---

## 🧪 Test-Szenarien

### Test 1: LobbyPMS Import mit Land
**Input**: LobbyPMS API Response mit `holder.pais = "Francia"`  
**Erwartet**: 
- `reservation.guestNationality = "Francia"`
- WhatsApp-Sprache: 'en' (Frankreich → Englisch)

### Test 2: Email Import mit Nationalität
**Input**: Email mit "Titular: Juan Pérez Colombia"  
**Erwartet**:
- `reservation.guestNationality = "Colombia"`
- WhatsApp-Sprache: 'es' (Kolumbien → Spanisch)

### Test 3: Reservation ohne Land
**Input**: Reservation ohne `guestNationality`, aber mit `guestPhone = "+573001234567"`  
**Erwartet**:
- WhatsApp-Sprache: 'es' (Telefonnummer +57 → Kolumbien → Spanisch)

### Test 4: Reservation ohne Land und Telefonnummer
**Input**: Reservation ohne `guestNationality` und ohne `guestPhone`  
**Erwartet**:
- WhatsApp-Sprache: 'es' (Fallback auf Spanisch)

### Test 5: Unbekanntes Land
**Input**: `guestNationality = "Wakanda"`  
**Erwartet**:
- WhatsApp-Sprache: 'es' (Fallback auf Spanisch)

### Test 6: Branch-spezifische Konfiguration
**Input**: Reservation mit `branchId = 1`, Branch hat eigene WhatsApp Settings  
**Erwartet**:
- Branch WhatsApp Settings werden verwendet
- Sprache basierend auf Reservation-Land bestimmt

---

## ⚠️ Wichtige Hinweise

1. **Template-Namen**: 
   - WhatsApp erlaubt Templates mit gleichem Namen in verschiedenen Sprachen
   - Aktuell: `reservation_checkin_invitation` mit Language `Spanish (es)` und `English (en)`
   - Code verwendet `language` Parameter im Template-Request, nicht Template-Name-Anpassung

2. **Template-Name-Anpassung**:
   - Aktuell: `getTemplateNameForLanguage()` fügt für Englisch einen Unterstrich hinzu
   - **PROBLEM**: Wenn Templates mit gleichem Namen in verschiedenen Sprachen existieren, ist Unterstrich nicht nötig
   - **LÖSUNG**: `getTemplateNameForLanguage()` sollte nur Template-Name zurückgeben, Sprache wird über `language` Parameter gesteuert
   - **ODER**: Templates mit unterschiedlichen Namen erstellen (z.B. `reservation_checkin_invitation_es` und `reservation_checkin_invitation_en`)

3. **Branch-spezifische Templates**:
   - Aktuell: Alle Branches verwenden gleiche Template-Namen
   - Optional: Branch-spezifische Template-Namen können später in `Branch.whatsappSettings` gespeichert werden

4. **Migration bestehender Reservierungen**:
   - Bestehende Reservierungen ohne `guestNationality` funktionieren weiterhin
   - Keine Migration nötig (Fallback-Mechanismen)

---

## 📝 Code-Beispiele

### Beispiel 1: LobbyPMS Import mit Land
```typescript
// In lobbyPmsService.ts, syncReservation():
const holder = lobbyReservation.holder || {};
const guestNationality = holder.pais || null; // NEU

const reservationData = {
  // ... bestehende Felder ...
  guestNationality: guestNationality, // NEU
};
```

### Beispiel 2: Email Import mit Nationalität
```typescript
// In emailReservationService.ts, createReservationFromEmail():
if (parsedEmail.nationality) {
  reservationData.guestNationality = parsedEmail.nationality.trim(); // NEU
}
```

### Beispiel 3: Sprache basierend auf Reservation
```typescript
// In whatsappService.ts, sendTemplateMessageDirectly():
let languageCode: string;
if (reservation) {
  const { CountryLanguageService } = require('./countryLanguageService');
  languageCode = CountryLanguageService.getLanguageForReservation(reservation);
} else {
  languageCode = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'es';
}
```

### Beispiel 4: Reservation-Daten übergeben
```typescript
// In reservationNotificationService.ts, sendReservationInvitation():
const templateResult = await whatsappService.sendTemplateMessageDirectly(
  guestPhone,
  baseTemplateName,
  templateParams,
  sentMessage,
  {
    guestNationality: reservation.guestNationality,
    guestPhone: reservation.guestPhone
  }
);
```

---

## 🎯 Zusammenfassung

**Ziel**: Land beim Reservation-Import extrahieren und WhatsApp-Sprache basierend auf Gast-Land anpassen

**Schritte**:
1. Land beim LobbyPMS- und Email-Import extrahieren und speichern
2. Land-zu-Sprache-Mapping erstellen
3. Sprache basierend auf Reservation bestimmen
4. Template-Auswahl basierend auf Sprache anpassen

**Rückwärtskompatibilität**: 
- Optionale Parameter
- Fallback-Mechanismen
- Bestehende Reservierungen funktionieren weiterhin

**Branch-Support**: 
- Bereits vorhanden (WhatsAppService unterstützt Branch-basierte Konfiguration)
- Optional: Branch-spezifische Template-Namen können später hinzugefügt werden

---

**Erstellt**: 2025-01-22  
**Version**: 1.0  
**Status**: 📋 Planung (noch nicht implementiert)


# Analyse: Reservation-Sprachauswahl - Vollständige Prüfung

**Datum**: 2025-01-30  
**Status**: 🔍 Analyse abgeschlossen  
**Ziel**: Prüfung aller Dokumente und Code-Stellen zur Reservation-Sprachauswahl

---

## 📚 Geprüfte Dokumente

### 1. Hauptdokumentation
- ✅ **`docs/implementation_plans/RESERVATION_LAND_SPRACHE_IMPLEMENTATION.md`**
  - **Status**: Planung (2025-01-22)
  - **Inhalt**: Vollständiger Implementierungsplan für land-basierte WhatsApp-Sprache
  - **Phasen**: 4 Phasen (Land-Extraktion, Mapping, Template-Auswahl, Branch-spezifisch)
  - **Wichtig**: Dokument beschreibt Planung, nicht aktuellen Stand

### 2. Weitere relevante Dokumente
- ✅ **`docs/implementation_plans/LOBBYPMS_INTEGRATION.md`**
  - **Status**: Implementierungsplan
  - **Relevanz**: Enthält allgemeine Infos zu Reservation-Import, aber keine Details zur Sprachauswahl
  - **Hinweis**: `guestNationality` wird im Schema erwähnt (Zeile 108)

- ✅ **`docs/modules/WHATSAPP_TEMPLATES_VOLLSTÄNDIGE_LISTE.md`**
  - **Status**: Dokumentation
  - **Relevanz**: Zeigt, dass Templates für ES und EN existieren sollten
  - **Wichtig**: Template-Namen können gleich sein, Sprache wird über `language` Parameter gesteuert

- ✅ **`docs/implementation_plans/RESERVATION_MANUAL_CREATION_PROCESS.md`**
  - **Status**: Implementiert (2025-01-20)
  - **Relevanz**: Beschreibt manuelle Reservierungserstellung, aber keine Sprachauswahl
  - **Hinweis**: Alle Texte sind hardcodiert auf Spanisch

---

## ✅ Was wurde bereits implementiert

### Phase 1: Land-Extraktion und Speicherung ✅

#### 1.1 LobbyPMS Import: Land extrahieren ✅
- **Datei**: `backend/src/services/lobbyPmsService.ts`
- **Zeile**: 845, 931
- **Status**: ✅ **IMPLEMENTIERT**
- **Code**:
  ```typescript
  const guestNationality = holder.pais || null;
  // ...
  guestNationality: guestNationality, // Land für Sprache-basierte WhatsApp-Nachrichten
  ```

#### 1.2 Email Import: Nationalität speichern ✅
- **Datei**: `backend/src/services/emailReservationService.ts`
- **Zeile**: 66-68
- **Status**: ✅ **IMPLEMENTIERT**
- **Code**:
  ```typescript
  // Setze Nationalität (für Sprache-basierte WhatsApp-Nachrichten)
  if (parsedEmail.nationality) {
    reservationData.guestNationality = parsedEmail.nationality.trim();
  }
  ```

### Phase 2: Land-zu-Sprache-Mapping ✅

#### 2.1 CountryLanguageService ✅
- **Datei**: `backend/src/services/countryLanguageService.ts`
- **Status**: ✅ **VOLLSTÄNDIG IMPLEMENTIERT**
- **Funktionen**:
  - `getLanguageForCountry()` - Mapping von Land-Name zu Sprachcode
  - `getLanguageForReservation()` - Bestimmt Sprache basierend auf Reservation
- **Mapping**: Unterstützt spanischsprachige Länder → 'es', alle anderen → 'en'
- **Priorität**: 1. guestNationality, 2. guestPhone, 3. Fallback 'es'

### Phase 3: Sprache-basierte Template-Auswahl ✅ (teilweise)

#### 3.1 WhatsAppService: Sprache aus Reservation bestimmen ✅
- **Datei**: `backend/src/services/whatsappService.ts`
- **Zeile**: 714-715, 801-802, 919-920, 1027-1028
- **Status**: ✅ **IMPLEMENTIERT**
- **Code**: Verwendet `CountryLanguageService.getLanguageForReservation()` für Template-Sprache
- **Hinweis**: Template-Namen werden basierend auf Sprache angepasst

#### 3.2 ReservationNotificationService: Reservation übergeben ✅
- **Datei**: `backend/src/services/reservationNotificationService.ts`
- **Zeile**: 386-388, 927, 1256-1261, 1292, 1306
- **Status**: ✅ **IMPLEMENTIERT**
- **Code**: Reservation-Daten werden an `sendMessageWithFallback()` übergeben

#### 3.3 reservationController: Reservation-Daten übergeben ✅
- **Datei**: `backend/src/controllers/reservationController.ts`
- **Zeile**: 250-252
- **Status**: ✅ **IMPLEMENTIERT**
- **Code**: Reservation-Daten werden übergeben

#### 3.4 updateGuestContactWorker: Reservation-Daten übergeben ✅
- **Datei**: `backend/src/queues/workers/updateGuestContactWorker.ts`
- **Zeile**: 221
- **Status**: ✅ **IMPLEMENTIERT**
- **Code**: Reservation-Daten werden übergeben

#### 3.5 E-Mail-Service: Sprachauswahl ✅ (teilweise)
- **Datei**: `backend/src/services/reservationNotificationService.ts`
- **Zeile**: 1543-1544
- **Status**: ⚠️ **TEILWEISE IMPLEMENTIERT**
- **Problem**: Verwendet hardcodierte Länder-Codes statt `CountryLanguageService`
- **Code**: 
  ```typescript
  const isEnglish = reservation.guestNationality && 
    ['US', 'GB', 'UK', 'CA', 'AU', 'NZ', 'IE', 'ZA'].includes(reservation.guestNationality.toUpperCase());
  ```

---

## ❌ Was fehlt / wurde übersehen

### Problem 1: Hardcodierte spanische Texte in Mitteilungen ❌

#### 1.1 Erste Nachricht mit Zahlungslink (reservationController.ts) ❌
- **Datei**: `backend/src/controllers/reservationController.ts`
- **Zeile**: 206-223
- **Problem**: Text ist hardcodiert auf Spanisch
- **Code**:
  ```typescript
  const checkInDateStr = updatedReservation.checkInDate.toLocaleDateString('es-ES');
  const checkOutDateStr = updatedReservation.checkOutDate.toLocaleDateString('es-ES');
  
  sentMessage = `Hola ${updatedReservation.guestName},
  
  ¡Bienvenido a La Familia Hostel!
  
  Tu reserva ha sido confirmada:
  - Entrada: ${checkInDateStr}
  - Salida: ${checkOutDateStr}
  
  Por favor, realiza el pago:
  ${paymentLink}
  
  ${ttlockCode ? `Tu código de acceso TTLock:
  ${ttlockCode}
  
  ` : ''}¡Te esperamos!`;
  ```
- **Fehlt**: Sprachauswahl und englische Version

#### 1.2 Erste Nachricht mit Zahlungslink (updateGuestContactWorker.ts) ❌
- **Datei**: `backend/src/queues/workers/updateGuestContactWorker.ts`
- **Zeile**: 153-170
- **Problem**: Text ist hardcodiert auf Spanisch
- **Code**: Identisch zu 1.1
- **Fehlt**: Sprachauswahl und englische Version

#### 1.3 Erste Nachricht mit Zahlungslink (reservationNotificationService.ts - WhatsApp) ❌
- **Datei**: `backend/src/services/reservationNotificationService.ts`
- **Zeile**: 345-357
- **Problem**: Text ist hardcodiert auf Spanisch
- **Code**:
  ```typescript
  sentMessage = `Hola ${reservation.guestName},
  
  ¡Nos complace darte la bienvenida a La Familia Hostel!
  
  Como llegarás después de las 22:00, puedes realizar el check-in en línea ahora:
  ${checkInLink}
  
  Por favor, realiza el pago por adelantado:
  ${paymentLink}
  
  Por favor, escríbenos brevemente una vez que hayas completado tanto el check-in como el pago. ¡Gracias!
  
  ¡Te esperamos mañana!`;
  ```
- **Fehlt**: Sprachauswahl und englische Version

#### 1.4 Erste Nachricht mit Zahlungslink (reservationNotificationService.ts - E-Mail) ❌
- **Datei**: `backend/src/services/reservationNotificationService.ts`
- **Zeile**: 479-491
- **Problem**: Text ist hardcodiert auf Spanisch
- **Code**: Identisch zu 1.3
- **Fehlt**: Sprachauswahl und englische Version

#### 1.5 Zweite Nachricht mit TTLock Passcode (reservationNotificationService.ts) ⚠️
- **Datei**: `backend/src/services/reservationNotificationService.ts`
- **Zeile**: 1162-1173 (hardcodiert), 1256-1278 (mit Sprachauswahl)
- **Status**: ⚠️ **TEILWEISE IMPLEMENTIERT**
- **Problem**: 
  - Hardcodierter spanischer Text in Zeile 1162-1173 (wird verwendet, wenn keine `customMessage`)
  - Sprachauswahl existiert bereits in Zeile 1256-1278, aber nur für Template-Parameter
- **Code (hardcodiert)**:
  ```typescript
  const greeting = `Hola ${reservation.guestName},`;
  const contentText = `¡Tu check-in se ha completado exitosamente! Información de tu habitación: - Habitación: ${roomNumber} - Descripción: ${roomDescription} Acceso: - PIN de la puerta: ${doorPin || 'N/A'} - App: ${doorAppName || 'TTLock'}`;
  
  messageText = `Bienvenido,
  
  ${greeting}
  
  ${contentText}
  
  ¡Te deseamos una estancia agradable!`;
  ```
- **Code (mit Sprachauswahl - nur für Template)**:
  ```typescript
  const greeting = languageCode === 'en' 
    ? `Hello ${reservation.guestName},`
    : `Hola ${reservation.guestName},`;
  
  let contentText: string;
  if (languageCode === 'en') {
    contentText = `Your check-in has been completed successfully! Your room information: - Room: ${roomNumber} - Description: ${roomDescription} Access: - Door PIN: ${doorPin} - App: ${doorAppName || 'TTLock'}`;
  } else {
    contentText = `¡Tu check-in se ha completado exitosamente! Información de tu habitación: - Habitación: ${roomNumber} - Descripción: ${roomDescription} Acceso: - PIN de la puerta: ${doorPin} - App: ${doorAppName || 'TTLock'}`;
  }
  ```
- **Fehlt**: Hardcodierter Text muss auch Sprachauswahl verwenden

### Problem 2: Datum-Formatierung immer auf Spanisch ❌
- **Datei**: `backend/src/controllers/reservationController.ts`, `backend/src/queues/workers/updateGuestContactWorker.ts`
- **Zeile**: 206-207, 153-154
- **Problem**: `toLocaleDateString('es-ES')` ist hardcodiert
- **Fehlt**: Datum-Formatierung basierend auf Sprache

### Problem 3: E-Mail-Service verwendet nicht CountryLanguageService ❌
- **Datei**: `backend/src/services/reservationNotificationService.ts`
- **Zeile**: 1543-1544
- **Problem**: Verwendet hardcodierte Länder-Codes statt `CountryLanguageService`
- **Fehlt**: Sollte `CountryLanguageService.getLanguageForReservation()` verwenden

---

## 📊 Vergleich: Plan vs. Realität

### Phase 1: Land-Extraktion ✅
| Aufgabe | Geplant | Realität | Status |
|---------|---------|----------|--------|
| LobbyPMS Import: Land extrahieren | ✅ | ✅ | ✅ Implementiert |
| Email Import: Nationalität speichern | ✅ | ✅ | ✅ Implementiert |

### Phase 2: Land-zu-Sprache-Mapping ✅
| Aufgabe | Geplant | Realität | Status |
|---------|---------|----------|--------|
| CountryLanguageService erstellen | ✅ | ✅ | ✅ Implementiert |
| Mapping: Länder zu Sprachen | ✅ | ✅ | ✅ Implementiert |

### Phase 3: Sprache-basierte Template-Auswahl ⚠️
| Aufgabe | Geplant | Realität | Status |
|---------|---------|----------|--------|
| WhatsAppService: Sprache aus Reservation | ✅ | ✅ | ✅ Implementiert |
| ReservationNotificationService: Reservation übergeben | ✅ | ✅ | ✅ Implementiert |
| reservationController: Reservation-Daten übergeben | ✅ | ✅ | ✅ Implementiert |
| updateGuestContactWorker: Reservation-Daten übergeben | ✅ | ✅ | ✅ Implementiert |
| **Mitteilungstexte basierend auf Sprache generieren** | ❌ | ❌ | ❌ **FEHLT** |

### Phase 4: Branch-spezifische Templates ⏳
| Aufgabe | Geplant | Realität | Status |
|---------|---------|----------|--------|
| Branch Settings: Template-Namen pro Sprache | Optional | - | ⏳ Nicht implementiert (optional) |

---

## 🔍 Was wurde geändert / angepasst

### Änderungen gegenüber Plan

1. **Template-Sprache-Auswahl**:
   - **Plan**: Sprache sollte über Template-Namen gesteuert werden (Unterstrich für Englisch)
   - **Realität**: Sprache wird über `language` Parameter im Template-Request gesteuert
   - **Grund**: WhatsApp erlaubt Templates mit gleichem Namen in verschiedenen Sprachen

2. **E-Mail-Service**:
   - **Plan**: Sollte `CountryLanguageService` verwenden
   - **Realität**: Verwendet hardcodierte Länder-Codes
   - **Grund**: Wurde wahrscheinlich vor `CountryLanguageService` implementiert

3. **Mitteilungstexte**:
   - **Plan**: Keine explizite Erwähnung, dass Texte basierend auf Sprache generiert werden müssen
   - **Realität**: Texte sind hardcodiert auf Spanisch
   - **Grund**: Plan fokussierte sich auf Template-Auswahl, nicht auf Text-Generierung

---

## 🎯 Zusammenfassung

### ✅ Was funktioniert
1. Land-Extraktion beim Import (LobbyPMS + Email) ✅
2. Land-zu-Sprache-Mapping (CountryLanguageService) ✅
3. Template-Sprache-Auswahl (WhatsAppService) ✅
4. Reservation-Daten werden übergeben ✅

### ❌ Was fehlt
1. **Mitteilungstexte basierend auf Sprache generieren** ❌
   - 4 Stellen mit hardcodierten spanischen Texten
   - 1 Stelle mit teilweiser Sprachauswahl (nur für Template-Parameter)
2. **Datum-Formatierung basierend auf Sprache** ❌
   - 2 Stellen mit hardcodiertem 'es-ES'
3. **E-Mail-Service verwendet nicht CountryLanguageService** ❌
   - 1 Stelle mit hardcodierten Länder-Codes

### ⚠️ Was verbessert werden sollte
1. E-Mail-Service sollte `CountryLanguageService` verwenden
2. Konsistente Sprachauswahl in allen Services

---

## 📋 Erneuerter Implementierungsplan

### Phase 1: Mitteilungstexte basierend auf Sprache generieren

#### 1.1 reservationController.ts: Erste Nachricht mit Zahlungslink
- **Datei**: `backend/src/controllers/reservationController.ts`
- **Zeile**: 206-223
- **Änderung**: 
  - Sprache basierend auf Reservation bestimmen
  - Spanische und englische Versionen der Nachricht erstellen
  - Datum-Formatierung basierend auf Sprache

#### 1.2 updateGuestContactWorker.ts: Erste Nachricht mit Zahlungslink
- **Datei**: `backend/src/queues/workers/updateGuestContactWorker.ts`
- **Zeile**: 153-170
- **Änderung**: Identisch zu 1.1

#### 1.3 reservationNotificationService.ts: Erste Nachricht (WhatsApp)
- **Datei**: `backend/src/services/reservationNotificationService.ts`
- **Zeile**: 345-357
- **Änderung**: 
  - Sprache basierend auf Reservation bestimmen
  - Spanische und englische Versionen der Nachricht erstellen

#### 1.4 reservationNotificationService.ts: Erste Nachricht (E-Mail)
- **Datei**: `backend/src/services/reservationNotificationService.ts`
- **Zeile**: 479-491
- **Änderung**: Identisch zu 1.3

#### 1.5 reservationNotificationService.ts: Zweite Nachricht mit TTLock Passcode
- **Datei**: `backend/src/services/reservationNotificationService.ts`
- **Zeile**: 1162-1173
- **Änderung**: 
  - Hardcodierter Text muss auch Sprachauswahl verwenden
  - Bereits vorhandene Logik in Zeile 1256-1278 für Template-Parameter verwenden

### Phase 2: Datum-Formatierung basierend auf Sprache

#### 2.1 Datum-Formatierung in reservationController.ts
- **Datei**: `backend/src/controllers/reservationController.ts`
- **Zeile**: 206-207
- **Änderung**: `toLocaleDateString()` basierend auf Sprache

#### 2.2 Datum-Formatierung in updateGuestContactWorker.ts
- **Datei**: `backend/src/queues/workers/updateGuestContactWorker.ts`
- **Zeile**: 153-154
- **Änderung**: Identisch zu 2.1

### Phase 3: E-Mail-Service auf CountryLanguageService umstellen

#### 3.1 E-Mail-Service: CountryLanguageService verwenden
- **Datei**: `backend/src/services/reservationNotificationService.ts`
- **Zeile**: 1543-1544
- **Änderung**: 
  - Statt hardcodierte Länder-Codes: `CountryLanguageService.getLanguageForReservation()` verwenden

---

## 🧪 Test-Szenarien

### Test 1: Reservation mit spanischsprachigem Land
- **Input**: `guestNationality = "Colombia"`
- **Erwartet**: 
  - Spanische Mitteilungstexte
  - Datum-Formatierung: 'es-ES'
  - Template-Sprache: 'es'

### Test 2: Reservation mit englischsprachigem Land
- **Input**: `guestNationality = "United States"`
- **Erwartet**: 
  - Englische Mitteilungstexte
  - Datum-Formatierung: 'en-US'
  - Template-Sprache: 'en'

### Test 3: Reservation ohne Land, aber mit Telefonnummer
- **Input**: `guestNationality = null`, `guestPhone = "+573001234567"`
- **Erwartet**: 
  - Sprache basierend auf Telefonnummer (Kolumbien → Spanisch)
  - Spanische Mitteilungstexte

### Test 4: Reservation ohne Land und Telefonnummer
- **Input**: `guestNationality = null`, `guestPhone = null`
- **Erwartet**: 
  - Fallback auf Spanisch
  - Spanische Mitteilungstexte

---

## 📝 Wichtige Hinweise

1. **Template-Sprache**: 
   - Templates können gleichen Namen haben, Sprache wird über `language` Parameter gesteuert
   - Code verwendet bereits `getTemplateNameForLanguage()`, was korrekt ist

2. **Rückwärtskompatibilität**:
   - Alle Änderungen müssen optional sein (Fallback auf Spanisch)
   - Bestehende Reservierungen ohne `guestNationality` funktionieren weiterhin

3. **Konsistenz**:
   - Alle Services sollten `CountryLanguageService` verwenden
   - Keine hardcodierten Länder-Codes mehr

---

**Erstellt**: 2025-01-30  
**Version**: 1.0  
**Status**: ✅ Analyse abgeschlossen


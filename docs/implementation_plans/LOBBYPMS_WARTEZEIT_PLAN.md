# LobbyPMS Integration - Plan für Wartezeit

## Situation

Die LobbyPMS API-Dokumentation wurde angefragt, aber die Antwort wird noch dauern. Währenddessen können wir die Integration vorantreiben, indem wir die Teile implementieren, die **nicht** von der LobbyPMS API abhängen.

## ✅ Bereits implementiert

### Backend Services
- ✅ **WhatsAppService** - Vollständig implementiert (Twilio & WhatsApp Business API)
- ✅ **BoldPaymentService** - Vollständig implementiert (Payment Links, Webhooks)
- ✅ **SireService** - Vollständig implementiert (Registrierung, Update, Status)
- ✅ **TTLockService** - Vollständig implementiert (OAuth, Passcodes, Locks)
- ✅ **LobbyPmsService** - Grundstruktur vorhanden (benötigt korrekten Endpoint)
- ✅ **ReservationNotificationService** - Muss geprüft werden
- ✅ **ReservationScheduler** - Muss geprüft werden

### Datenbank
- ✅ **Reservation Model** - Vollständig implementiert
- ✅ **Task Model Extension** - Vollständig implementiert
- ✅ **Organization Settings** - API-Konfiguration implementiert

### Frontend
- ✅ **API Configuration Tab** - Vollständig implementiert
- ❌ **Reservierungs-UI** - Noch nicht implementiert

## 📋 Was wir während der Wartezeit machen können

### 1. Frontend-Komponenten für Reservierungen (Priorität: HOCH)

**Was fehlt:**
- Reservierungsliste (Übersicht aller Reservierungen)
- Reservierungsdetails (Einzelansicht)
- Check-in-Formular (für manuellen Check-in)
- Reservierungsfilter (nach Status, Datum, etc.)

**Vorteil:**
- Unabhängig von LobbyPMS API
- Kann mit Mock-Daten getestet werden
- UI/UX kann bereits definiert werden

**Schritte:**
1. `frontend/src/pages/ReservationsPage.tsx` erstellen
2. `frontend/src/components/reservations/ReservationList.tsx` erstellen
3. `frontend/src/components/reservations/ReservationCard.tsx` erstellen
4. `frontend/src/components/reservations/ReservationDetails.tsx` erstellen
5. `frontend/src/components/reservations/CheckInForm.tsx` erstellen

### 2. ReservationNotificationService & ReservationScheduler vervollständigen (Priorität: HOCH)

**Was zu prüfen:**
- Sind beide Services vollständig implementiert?
- Fehlen noch Funktionen?
- Gibt es Fehler oder Verbesserungen?

**Schritte:**
1. Beide Services durchlesen
2. Fehlende Funktionen identifizieren
3. Implementieren
4. Unit-Tests schreiben

### 3. Mock-Daten für Tests (Priorität: MITTEL)

**Zweck:**
- Frontend kann ohne echte LobbyPMS API getestet werden
- Services können isoliert getestet werden
- Entwicklung kann parallel weitergehen

**Schritte:**
1. Mock-Daten-Service erstellen (`backend/src/services/mockLobbyPmsService.ts`)
2. Test-Reservierungen in Datenbank einfügen
3. Frontend mit Mock-Daten testen

### 4. Frontend-Routen hinzufügen (Priorität: HOCH)

**Was fehlt:**
- Route für Reservierungsliste: `/reservations`
- Route für Reservierungsdetails: `/reservations/:id`
- Route für Check-in: `/reservations/:id/check-in`

**Schritte:**
1. Routen in `frontend/src/App.tsx` oder Router-Konfiguration hinzufügen
2. Navigation-Links hinzufügen
3. Permissions prüfen

### 5. i18n-Übersetzungen (Priorität: MITTEL)

**Was fehlt:**
- Übersetzungen für Reservierungs-UI
- Übersetzungen für Check-in-Formular
- Übersetzungen für Status-Meldungen

**Schritte:**
1. Neue Keys in `de.json`, `es.json`, `en.json` hinzufügen
2. Alle UI-Texte übersetzen

### 6. Unit-Tests (Priorität: NIEDRIG)

**Was zu testen:**
- WhatsAppService
- BoldPaymentService
- SireService
- TTLockService
- ReservationNotificationService

**Schritte:**
1. Test-Framework einrichten (falls nicht vorhanden)
2. Tests für jeden Service schreiben
3. Mock-Implementierungen für externe APIs

### 7. Dokumentation aktualisieren (Priorität: NIEDRIG)

**Was zu dokumentieren:**
- Aktueller Stand der Integration
- Was funktioniert, was noch fehlt
- Nächste Schritte nach API-Dokumentation

## 🎯 Empfohlene Reihenfolge

1. **ReservationNotificationService & ReservationScheduler prüfen** (30 Min)
   - Schnell durchlesen, Fehler identifizieren
   - Fehlende Teile ergänzen

2. **Frontend-Komponenten erstellen** (2-3 Stunden)
   - Reservierungsliste
   - Reservierungsdetails
   - Check-in-Formular

3. **Frontend-Routen hinzufügen** (30 Min)
   - Routen konfigurieren
   - Navigation-Links

4. **i18n-Übersetzungen** (30 Min)
   - Alle neuen UI-Texte übersetzen

5. **Mock-Daten für Tests** (1 Stunde)
   - Mock-Service erstellen
   - Test-Daten einfügen

6. **Unit-Tests** (optional, kann später gemacht werden)

## 📝 Nächste Schritte nach API-Dokumentation

Sobald die LobbyPMS API-Dokumentation verfügbar ist:
1. LobbyPmsService mit korrekten Endpoints aktualisieren
2. Integration testen
3. Reservierungen synchronisieren
4. Automatische Prozesse aktivieren

## ⚠️ Wichtige Hinweise

- **Nichts von LobbyPMS API abhängig machen**: Alle neuen Komponenten sollten auch ohne LobbyPMS API funktionieren
- **Mock-Daten verwenden**: Für Frontend-Tests Mock-Daten verwenden
- **Dokumentation aktuell halten**: Alle Änderungen dokumentieren


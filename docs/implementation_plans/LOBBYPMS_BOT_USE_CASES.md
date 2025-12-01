# LobbyPMS Bot - Use Cases & Beispiel-Konversationen

**Datum:** 2025-01-29  
**Status:** Implementiert & dokumentiert

---

## 🎯 Haupt-Use Cases

### Use Case 1: Verfügbarkeitsprüfung

**Ziel:** Gast fragt nach verfügbaren Zimmern für bestimmte Daten

**Beispiel-Konversationen:**

#### Deutsch:
```
Gast: Haben wir Zimmer frei für heute?
Bot: Ja, wir haben folgende Zimmer verfügbar:
     - El primo aventurero (Dorm): 7 Betten verfügbar, 60.000 COP/Nacht
     - La tia artista (Dorm): 3 Betten verfügbar, 50.000 COP/Nacht
     - El abuelo viajero (Dorm): 6 Betten verfügbar, 65.000 COP/Nacht
     - Doble básica (Privat): 1 Zimmer verfügbar, 100.000 COP/Nacht
```

#### Spanisch:
```
Gast: ¿Tenemos habitaciones disponibles para hoy?
Bot: Sí, tenemos las siguientes habitaciones disponibles:
     - El primo aventurero (Dorm): 7 camas disponibles, 60.000 COP/noche
     - La tia artista (Dorm): 3 camas disponibles, 50.000 COP/noche
     - El abuelo viajero (Dorm): 6 camas disponibles, 65.000 COP/noche
     - Doble básica (Privada): 1 habitación disponible, 100.000 COP/noche
```

#### Englisch:
```
Guest: Do we have rooms available for today?
Bot: Yes, we have the following rooms available:
     - El primo aventurero (Dorm): 7 beds available, 60.000 COP/night
     - La tia artista (Dorm): 3 beds available, 50.000 COP/night
     - El abuelo viajero (Dorm): 6 beds available, 65.000 COP/night
     - Doble básica (Private): 1 room available, 100.000 COP/night
```

**Technische Details:**
- Function: `check_room_availability`
- API: `GET /api/v2/available-rooms`
- Branch-spezifisch: ✅ Ja
- Sprache: DE/ES/EN unterstützt

---

### Use Case 2: Direkte Buchung

**Ziel:** Gast bucht direkt ein Zimmer über WhatsApp

**Beispiel-Konversationen:**

#### Variante 1: Mit Verfügbarkeitsprüfung
```
Gast: Haben wir Zimmer frei für heute?
Bot: [Zeigt Verfügbarkeit]

Gast: Ich möchte Zimmer 2 buchen
Bot: ✅ Reservierung erstellt!
     - Zimmer: La tia artista
     - Check-in: 2025-01-29
     - Check-out: 2025-01-30
     - Gast: Max Mustermann
     
     Zahlungslink und Check-in-Link wurden per WhatsApp gesendet.
     Bitte zahlen Sie innerhalb von 1 Stunde, sonst wird die Reservierung automatisch storniert.
```

#### Variante 2: Direkte Buchung
```
Gast: Ich möchte ein privates Zimmer reservieren für heute bis morgen
Bot: ✅ Reservierung erstellt!
     - Zimmer: Doble básica
     - Check-in: 2025-01-29
     - Check-out: 2025-01-30
     - Gast: Max Mustermann
     
     Zahlungslink und Check-in-Link wurden per WhatsApp gesendet.
     Bitte zahlen Sie innerhalb von 1 Stunde, sonst wird die Reservierung automatisch storniert.
```

#### Variante 3: Spanisch
```
Gast: Reservame 1 cama en el primo aventurero para hoy
Bot: ✅ ¡Reservación creada!
     - Habitación: El primo aventurero
     - Check-in: 2025-01-29
     - Check-out: 2025-01-30
     - Huésped: Juan Pérez
     
     Se han enviado los enlaces de pago y check-in por WhatsApp.
     Por favor, pague dentro de 1 hora, de lo contrario la reservación será cancelada automáticamente.
```

**Technische Details:**
- Function: `create_room_reservation`
- API: `POST /api/v1/bookings` (LobbyPMS)
- Lokale DB: Reservierung wird erstellt
- Links: Payment Link + Check-in Link automatisch generiert
- Versand: Per WhatsApp (wenn Telefonnummer vorhanden)
- Branch-spezifisch: ✅ Ja

**Erforderliche Informationen:**
- Check-in Datum
- Check-out Datum
- Gästename
- Zimmerart (compartida/privada) oder categoryId
- Telefonnummer (optional, für Links-Versand)

---

### Use Case 3: Automatische Stornierung (Geplant)

**Ziel:** Reservierungen werden automatisch storniert, wenn Zahlung nicht innerhalb von 1 Stunde erfolgt

**Prozess:**
1. Scheduler prüft alle 5 Minuten Reservierungen
2. Findet Reservierungen mit:
   - Status: `confirmed`
   - Payment Status: `pending`
   - Payment Deadline: überschritten
   - Auto Cancel: aktiviert
3. Storniert in LobbyPMS (via API)
4. Aktualisiert lokale Reservierung (Status: `cancelled`)

**Status:** ❌ **NOCH NICHT IMPLEMENTIERT**

**Benötigt:**
- Migration: `paymentDeadline`, `autoCancelEnabled` Felder
- Scheduler: `ReservationAutoCancelScheduler`
- Integration: In Server starten

---

## 🔄 Komplette Beispiel-Konversationen

### Beispiel 1: Verfügbarkeit → Buchung

```
Gast: Haben wir Zimmer frei für heute?
Bot: Ja, wir haben folgende Zimmer verfügbar:
     - El primo aventurero (Dorm): 7 Betten verfügbar, 60.000 COP/Nacht
     - La tia artista (Dorm): 3 Betten verfügbar, 50.000 COP/Nacht
     - El abuelo viajero (Dorm): 6 Betten verfügbar, 65.000 COP/Nacht

Gast: Ich möchte Zimmer 2 buchen
Bot: ✅ Reservierung erstellt!
     - Zimmer: La tia artista
     - Check-in: 2025-01-29
     - Check-out: 2025-01-30
     - Gast: Max Mustermann
     
     Zahlungslink und Check-in-Link wurden per WhatsApp gesendet.
     Bitte zahlen Sie innerhalb von 1 Stunde, sonst wird die Reservierung automatisch storniert.
```

### Beispiel 2: Direkte Buchung (Spanisch)

```
Gast: Reservame 1 cama en el primo aventurero para hoy hasta mañana
Bot: ✅ ¡Reservación creada!
     - Habitación: El primo aventurero
     - Check-in: 2025-01-29
     - Check-out: 2025-01-30
     - Huésped: Juan Pérez
     
     Se han enviado los enlaces de pago y check-in por WhatsApp.
     Por favor, pague dentro de 1 hora, de lo contrario la reservación será cancelada automáticamente.
```

### Beispiel 3: Fehlerfall - Keine Verfügbarkeit

```
Gast: Haben wir Zimmer frei für heute?
Bot: Entschuldigung, es sind keine Zimmer für heute verfügbar.
     Bitte versuchen Sie es mit anderen Daten.
```

### Beispiel 4: Fehlerfall - categoryId fehlt

```
Gast: Ich möchte ein Zimmer reservieren
Bot: Bitte wählen Sie zuerst ein Zimmer aus der Verfügbarkeitsliste aus.
     Oder sagen Sie mir, welches Zimmer Sie buchen möchten.
```

---

## 🎯 Technische Implementierung

### Verfügbarkeitsprüfung
- **Function:** `check_room_availability`
- **Handler:** `WhatsAppFunctionHandlers.check_room_availability()`
- **Service:** `LobbyPmsService.checkAvailability()`
- **API:** `GET /api/v2/available-rooms`

### Reservierungserstellung
- **Function:** `create_room_reservation`
- **Handler:** `WhatsAppFunctionHandlers.create_room_reservation()`
- **Service:** `LobbyPmsService.createBooking()`
- **API:** `POST /api/v1/bookings`
- **DB:** `prisma.reservation.create()`
- **Links:** `BoldPaymentService.createPaymentLink()`, `generateLobbyPmsCheckInLink()`
- **Versand:** `ReservationNotificationService.sendReservationInvitation()`

---

**Erstellt:** 2025-01-29  
**Status:** ✅ Use Cases dokumentiert


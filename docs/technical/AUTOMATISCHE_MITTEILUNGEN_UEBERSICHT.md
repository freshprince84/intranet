# Automatisch versendete Mitteilungen

**Datum**: 2025-01-31

## Email-Mitteilungen

1. **Späte Check-in-Einladungen**  
   Trigger: Täglich um 20:00 Uhr automatisch

2. **Check-in-Bestätigung mit PIN**  
   Trigger: Nach erfolgreichem Check-in (Status `checked_in`)

3. **Passcode-Benachrichtigung**  
   Trigger: Manuell auslösbar via API

## WhatsApp-Mitteilungen

1. **Reservation-Einladung (bei manueller Erstellung)**  
   Trigger: Bei manueller Erstellung einer Reservation über das Frontend mit `autoSend=true` und `contactType === 'phone'`

2. **Reservation-Einladung (bei Erstellung aus Email)**  
   Trigger: Wenn eine Reservation automatisch aus einer Email erstellt wird (wenn `EMAIL_RESERVATION_WHATSAPP_ENABLED=true`)

3. **Späte Check-in-Einladungen**  
   Trigger: Täglich um 20:00 Uhr automatisch

4. **Check-in-Bestätigung mit PIN**  
   Trigger: Nach erfolgreichem Check-in (Status `checked_in`) - aktuell deaktiviert

5. **Passcode-Benachrichtigung**  
   Trigger: Manuell auslösbar via API

6. **Zahlungsbestätigung**  
   Trigger: Bold Payment Webhook (`payment.paid` oder `payment.completed`)

7. **Tour-Buchungsbestätigung (bei Buchungserstellung)**  
   Trigger: Bei Erstellung einer Tour-Buchung mit Payment-Link

8. **Tour-Buchungsbestätigung nach Zahlung**  
   Trigger: Bold Payment Webhook (`payment.paid` oder `payment.completed`) für Tour-Booking

9. **Tour-Stornierung**  
   Trigger: Automatisch alle 5 Minuten (prüft abgelaufene Buchungen mit `autoCancelEnabled=true`)

10. **Tour-Buchungsanfrage an externen Anbieter**  
    Trigger: Bei Erstellung einer externen Tour-Buchung

11. **Tour-Anbieter-Antwort-Verarbeitung (Bestätigung/Absage)**  
    Trigger: Bei eingehender WhatsApp-Nachricht vom Tour-Anbieter




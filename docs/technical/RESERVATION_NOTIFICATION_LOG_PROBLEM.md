# Problem: Reservation Notification Logs werden nicht erstellt

## Problembeschreibung

Wenn eine Reservation manuell erstellt wird und dann eine Mitteilung per Button versendet wird, kommt nichts an und die Mitteilung wird gar nicht erst erstellt (fehlt in der Card).

## Ursachenanalyse

### Hauptproblem: Fehler beim Payment-Link führt zu Abbruch ohne Log

**Datei**: `backend/src/services/reservationNotificationService.ts`

**Problemstelle**: Zeile 253-258

```typescript
} catch (error) {
  console.error(`[ReservationNotification] ❌ Fehler beim Erstellen des Payment-Links:`, error);
  errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler beim Erstellen des Payment-Links';
  // Payment-Link-Fehler ist kritisch - wir können ohne Payment-Link nicht weitermachen
  throw new Error(`Payment-Link konnte nicht erstellt werden: ${errorMessage}`);
}
```

**Problem**: Wenn der Payment-Link nicht erstellt werden kann, wird ein Error geworfen, der die gesamte Funktion `sendReservationInvitation` abbricht. Dadurch wird:
- ❌ Kein Log-Eintrag erstellt
- ❌ Die Reservation nicht aktualisiert
- ❌ Der Benutzer sieht nichts in der Card (keine Notification-Logs)

### Zweites Problem: Kein Log wenn keine Telefonnummer vorhanden

**Problemstelle**: Zeile 280

```typescript
if (guestPhone && paymentLink) {
  // WhatsApp-Versand und Log-Erstellung
}
```

**Problem**: Wenn `guestPhone` fehlt, wird kein WhatsApp-Versand durchgeführt und **kein Log erstellt**. Auch wenn eine E-Mail-Adresse vorhanden ist, wird kein Log erstellt.

### Drittes Problem: Kein Log wenn Payment-Link fehlt

**Problem**: Wenn `paymentLink` fehlt (z.B. weil die Erstellung fehlgeschlagen ist), wird kein WhatsApp-Versand durchgeführt und **kein Log erstellt**.

## Erwartetes Verhalten

1. **Immer ein Log erstellen**: Auch bei Fehlern sollte ein Log-Eintrag erstellt werden, damit der Benutzer sehen kann, was passiert ist.
2. **Fehlerbehandlung verbessern**: Wenn der Payment-Link nicht erstellt werden kann, sollte trotzdem ein Log erstellt werden (mit Fehlermeldung).
3. **E-Mail-Versand berücksichtigen**: Wenn keine Telefonnummer vorhanden ist, aber eine E-Mail-Adresse, sollte trotzdem ein Log erstellt werden.

## Lösung (IMPLEMENTIERT)

### Änderungen in `backend/src/services/reservationNotificationService.ts`

1. **Log auch bei Payment-Link-Fehlern erstellen**:
   - Wenn der Payment-Link nicht erstellt werden kann, wird jetzt trotzdem ein Log erstellt (mit Fehlermeldung)
   - Die Funktion bricht nicht mehr ab, wenn eine E-Mail-Adresse vorhanden ist (für zukünftige E-Mail-Implementierung)

2. **Log auch ohne WhatsApp**:
   - Wenn keine Telefonnummer vorhanden ist, aber eine E-Mail-Adresse, wird jetzt ein Log erstellt
   - Wenn Telefonnummer vorhanden ist, aber Payment-Link fehlt, wird jetzt ein Log erstellt

3. **Verbesserte Fehlerbehandlung**:
   - Alle Log-Erstellungen sind jetzt in try-catch-Blöcken, damit Fehler beim Loggen die Hauptfunktionalität nicht beeinträchtigen
   - Reservation-Update-Fehler führen nicht mehr zum Abbruch, sondern werden im Log dokumentiert

4. **Zusätzliche Log-Szenarien**:
   - Log wird erstellt, wenn Payment-Link fehlt (aber Telefonnummer vorhanden)
   - Log wird erstellt, wenn nur E-Mail vorhanden ist (für zukünftige Implementierung)
   - Log wird erstellt, wenn Reservation-Update fehlschlägt

## Betroffene Dateien

- `backend/src/services/reservationNotificationService.ts` - `sendReservationInvitation` Methode (Zeile 178-411)

## Server-Logs prüfen

Um das Problem auf dem Server zu verifizieren, sollten folgende Logs geprüft werden:

```bash
# Auf dem Hetzner-Server
cd /var/www/intranet/backend
tail -n 200 logs/app.log | grep -i 'reservation\|invitation\|notification\|payment.*link'
```

Zu suchende Log-Meldungen:
- `[ReservationNotification] ❌ Fehler beim Erstellen des Payment-Links`
- `[ReservationNotification] ✅ Log-Eintrag erstellt`
- `[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags`


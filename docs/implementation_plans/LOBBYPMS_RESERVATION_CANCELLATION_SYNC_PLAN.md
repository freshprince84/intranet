# LobbyPMS Reservation Cancellation Sync - Implementierungsplan

**Datum**: 2025-01-26  
**Status**: 📋 Planung (noch nichts ändern)

---

## Problem

Wenn eine Reservation in LobbyPMS gecancelt wird, wird der Status hier nicht synchronisiert. Die Reservation behält ihren alten Status (z.B. `confirmed`) in der lokalen Datenbank, obwohl sie in LobbyPMS den Status `cancelled` hat.

**Siehe auch**: `docs/analysis/LOBBYPMS_RESERVATION_CANCELLATION_SYNC_PROBLEM_ANALYSE.md`

---

## Lösung

### Lösung 1: Webhook-Handler erweitern (Hauptlösung)

**Problem**: Webhook-Handler behandelt `reservation.cancelled` nicht und `reservation.status_changed` nur für `checked_in`.

**Lösung**: Webhook-Handler erweitern, um:
1. `reservation.cancelled` Event zu behandeln
2. `reservation.status_changed` Event auch für `cancelled` Status zu behandeln

**Datei**: `backend/src/controllers/lobbyPmsController.ts`

---

## Implementierung

### Schritt 1: Webhook-Handler erweitern

**Datei**: `backend/src/controllers/lobbyPmsController.ts`

**Methode**: `handleWebhook()` (Zeile 308-416)

**Aktueller Code** (Zeile 374-401):
```typescript
switch (event) {
  case 'reservation.created':
  case 'reservation.updated':
    if (data?.id) {
      await service.syncReservation(data);
    }
    break;

  case 'reservation.status_changed':
  case 'reservation.checked_in':
    if (data?.id) {
      await service.updateReservationStatus(data.id, data.status || 'checked_in');
      // Aktualisiere lokale Reservierung
      const localReservation = await prisma.reservation.findUnique({
        where: { lobbyReservationId: data.id }
      });
      if (localReservation) {
        await prisma.reservation.update({
          where: { id: localReservation.id },
          data: {
            status: data.status === 'checked_in' ? 'checked_in' : localReservation.status,
            onlineCheckInCompleted: data.status === 'checked_in',
            onlineCheckInCompletedAt: data.status === 'checked_in' ? new Date() : null
          }
        });
      }
    }
    break;

  default:
    logger.log(`[LobbyPMS Webhook] Unbekanntes Event: ${event}`);
}
```

**Neuer Code**:
```typescript
switch (event) {
  case 'reservation.created':
  case 'reservation.updated':
    if (data?.id) {
      await service.syncReservation(data);
    }
    break;

  case 'reservation.cancelled':
    // NEU: Behandle cancellation Event
    if (data?.id) {
      await service.syncReservation(data);
    }
    break;

  case 'reservation.status_changed':
  case 'reservation.checked_in':
    if (data?.id) {
      // NEU: Wenn Status cancelled ist, syncReservation aufrufen (für vollständige Synchronisation)
      if (data.status === 'cancelled' || data.status === 'cancelado') {
        await service.syncReservation(data);
      } else {
        // Bestehende Logik für checked_in und andere Status
        await service.updateReservationStatus(data.id, data.status || 'checked_in');
        // Aktualisiere lokale Reservierung
        const localReservation = await prisma.reservation.findUnique({
          where: { lobbyReservationId: data.id }
        });
        if (localReservation) {
          await prisma.reservation.update({
            where: { id: localReservation.id },
            data: {
              status: data.status === 'checked_in' ? 'checked_in' : localReservation.status,
              onlineCheckInCompleted: data.status === 'checked_in',
              onlineCheckInCompletedAt: data.status === 'checked_in' ? new Date() : null
            }
          });
        }
      }
    }
    break;

  default:
    logger.log(`[LobbyPMS Webhook] Unbekanntes Event: ${event}`);
}
```

**Änderungen**:
1. **Neuer Case**: `reservation.cancelled` → ruft `syncReservation()` auf
2. **Erweiterter Case**: `reservation.status_changed` → prüft ob Status `cancelled` ist, dann `syncReservation()` aufrufen

**Warum `syncReservation()` statt `updateReservationStatus()`?**
- `syncReservation()` synchronisiert ALLE Felder (Status, Payment-Status, etc.)
- `updateReservationStatus()` aktualisiert nur den Status in LobbyPMS (nicht in lokaler DB)
- Für Cancellation wollen wir vollständige Synchronisation

---

## Testing

### Test-Szenario 1: Webhook `reservation.cancelled`

**Schritte**:
1. Reservation in LobbyPMS manuell canceln
2. Webhook sollte empfangen werden
3. Status sollte auf `cancelled` aktualisiert werden

**Erwartetes Ergebnis**:
- Webhook wird empfangen
- `reservation.cancelled` Case wird ausgeführt
- `syncReservation()` wird aufgerufen
- Status wird auf `cancelled` aktualisiert

### Test-Szenario 2: Webhook `reservation.status_changed` mit Status `cancelled`

**Schritte**:
1. Reservation in LobbyPMS Status auf `cancelled` ändern
2. Webhook sollte empfangen werden
3. Status sollte auf `cancelled` aktualisiert werden

**Erwartetes Ergebnis**:
- Webhook wird empfangen
- `reservation.status_changed` Case wird ausgeführt
- Status-Prüfung erkennt `cancelled`
- `syncReservation()` wird aufgerufen
- Status wird auf `cancelled` aktualisiert

### Test-Szenario 3: Automatischer Sync (für Reservationen der letzten 24 Stunden)

**Schritte**:
1. Reservation in LobbyPMS canceln (innerhalb der letzten 24 Stunden erstellt)
2. Warte auf automatischen Sync (alle 10 Minuten)
3. Status sollte aktualisiert werden

**Erwartetes Ergebnis**:
- Automatischer Sync findet Reservation (letzte 24 Stunden)
- `syncReservation()` wird aufgerufen
- Status wird auf `cancelled` aktualisiert

### Test-Szenario 4: Automatischer Sync (für ältere Reservationen)

**Schritte**:
1. Reservation älter als 24 Stunden in LobbyPMS canceln
2. Warte auf automatischen Sync
3. Status sollte NICHT aktualisiert werden (erwartetes Verhalten)

**Erwartetes Ergebnis**:
- Automatischer Sync findet Reservation NICHT (älter als 24 Stunden)
- Status bleibt unverändert
- **ABER**: Webhook sollte Status aktualisieren (Lösung 1)

---

## Edge Cases

### Edge Case 1: Reservation existiert nicht in lokaler DB

**Szenario**: Webhook `reservation.cancelled` für Reservation, die nicht in lokaler DB existiert

**Verhalten**:
- `syncReservation()` wird aufgerufen
- `upsert` erstellt neue Reservation mit Status `cancelled`
- **Erwartetes Verhalten**: Reservation wird erstellt (auch wenn gecancelt)

### Edge Case 2: Reservation wurde bereits gecancelt

**Szenario**: Webhook `reservation.cancelled` für Reservation, die bereits Status `cancelled` hat

**Verhalten**:
- `syncReservation()` wird aufgerufen
- `upsert` aktualisiert Reservation (Status bleibt `cancelled`)
- **Erwartetes Verhalten**: Keine Änderung, aber Synchronisation bestätigt

### Edge Case 3: Webhook mit fehlender `data.id`

**Szenario**: Webhook `reservation.cancelled` ohne `data.id`

**Verhalten**:
- `if (data?.id)` Prüfung schlägt fehl
- Webhook wird ignoriert
- **Erwartetes Verhalten**: Fehler wird geloggt, aber nicht weitergeworfen

### Edge Case 4: `syncReservation()` schlägt fehl

**Szenario**: Webhook `reservation.cancelled`, aber `syncReservation()` wirft Fehler

**Verhalten**:
- Fehler wird in `catch` Block gefangen (Zeile 409-415)
- Webhook wird mit Fehler beantwortet
- **Erwartetes Verhalten**: Fehler wird geloggt, Webhook wird mit 500 beantwortet

---

## Performance-Überlegungen

### Webhook-Handler

**Aktuell**:
- Webhook-Handler ist bereits vorhanden
- `syncReservation()` wird bereits für `reservation.created` und `reservation.updated` aufgerufen
- **Keine Performance-Änderung**: Gleiche Logik, nur zusätzlicher Case

### Automatischer Sync

**Aktuell**:
- Automatischer Sync findet nur Reservationen der letzten 24 Stunden
- **Keine Änderung**: Automatischer Sync bleibt unverändert
- Webhook-Handler übernimmt Synchronisation für Cancellation

---

## Migration / Rollout

### Schrittweise Einführung

1. **Phase 1**: Code implementieren
   - Webhook-Handler erweitern
   - Code testen

2. **Phase 2**: Testing
   - Test-Szenarien durchführen
   - Logs prüfen

3. **Phase 3**: Deployment
   - Code deployen
   - Monitoring der ersten Webhooks

### Rollback-Plan

- Code kann einfach zurückgesetzt werden (Webhook-Handler auf vorherigen Stand)
- Keine Datenbank-Änderungen
- Keine Breaking Changes

---

## Dokumentation

### Code-Kommentare

**Datei**: `backend/src/controllers/lobbyPmsController.ts`

**Kommentar hinzufügen**:
```typescript
/**
 * Empfängt Webhooks von LobbyPMS
 * 
 * Webhook-Events können sein:
 * - reservation.created
 * - reservation.updated
 * - reservation.status_changed
 * - reservation.cancelled
 * 
 * WICHTIG: reservation.cancelled und reservation.status_changed mit Status cancelled
 * werden durch syncReservation() synchronisiert, um vollständige Synchronisation
 * zu gewährleisten (Status, Payment-Status, etc.).
 */
```

### Changelog

**Datei**: `docs/core/CHANGELOG.md`

**Eintrag hinzufügen**:
```markdown
## [Unreleased]

### Fixed
- LobbyPMS Webhook-Handler behandelt jetzt `reservation.cancelled` Events
- LobbyPMS Webhook-Handler behandelt jetzt `reservation.status_changed` Events mit Status `cancelled`
- Reservationen, die in LobbyPMS gecancelt werden, werden jetzt korrekt synchronisiert
```

---

## Zusammenfassung

### Betroffene Dateien
1. `backend/src/controllers/lobbyPmsController.ts` - Webhook-Handler erweitern

### Neue Features
- Webhook `reservation.cancelled` wird behandelt
- Webhook `reservation.status_changed` mit Status `cancelled` wird behandelt
- Vollständige Synchronisation bei Cancellation (Status, Payment-Status, etc.)

### Risiken
- **Niedrig**: Nur Webhook-Handler wird erweitert
- `syncReservation()` funktioniert bereits korrekt (Status-Mapping vorhanden)
- Keine Breaking Changes
- Keine Datenbank-Änderungen

### Offene Fragen
1. **Welche Events sendet LobbyPMS bei Cancellation?**
   - Muss getestet werden
   - Vermutlich: `reservation.cancelled` oder `reservation.status_changed` mit Status `cancelled`

2. **Soll automatischer Sync erweitert werden?**
   - Aktuell: Nur letzte 24 Stunden
   - Option: Auch Reservationen mit `check_out_date >= heute`
   - **Empfehlung**: Erst Lösung 1 implementieren, dann optional Lösung 2 (siehe Analyse-Dokument)

---

## Code-Referenzen

### Webhook-Handler
- **Datei**: `backend/src/controllers/lobbyPmsController.ts`
- **Methode**: `handleWebhook()` (Zeile 308-416)
- **Switch-Statement**: Zeile 374-401

### Status-Synchronisation
- **Datei**: `backend/src/services/lobbyPmsService.ts`
- **Methode**: `syncReservation()` (Zeile 946-1205)
- **Status-Mapping**: Zeile 949-977
- **Upsert**: Zeile 1159-1165

### Analyse-Dokument
- **Datei**: `docs/analysis/LOBBYPMS_RESERVATION_CANCELLATION_SYNC_PROBLEM_ANALYSE.md`




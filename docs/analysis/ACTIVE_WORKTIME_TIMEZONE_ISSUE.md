# Problem: Falsche Berechnung aktiver Zeitmessungen durch Zeitzonen-Unterschied

## Problem-Beschreibung

Wenn eine aktive Zeitmessung läuft (ohne `endTime`), wird die aktuelle Zeit falsch berechnet, weil:
- `now` wird im Backend als UTC berechnet (`new Date()` = UTC)
- `startTime` ist in UTC gespeichert
- Die Berechnung verwendet UTC direkt, aber der Benutzer sieht lokale Zeit

**Beispiel:**
- StartTime (DB, UTC): `2025-11-12T00:07:58.771Z`
- Lokal (UTC-5, Kolumbien): 19:07:58 am 11. November
- Jetzt (UTC): `2025-11-12T05:36:05.825Z`
- Lokal (UTC-5): 00:36:05 am 12. November

**Berechnung:**
- UTC-Differenz: 5.47h (falsch!)
- Lokale Differenz: ~26 Minuten (korrekt!)

## Root Cause

In `getWorktimeStats` (Zeile 489):
```typescript
const now = new Date(); // UTC-Zeit
```

Und dann (Zeile 575):
```typescript
const effectiveEndTime = entry.endTime || now; // Verwendet UTC direkt
```

Das Problem: Wenn `entry.timezone` gespeichert ist (z.B. "America/Bogota"), sollte die aktuelle Zeit in dieser Zeitzone berechnet werden, nicht in UTC.

## Lösung

Für aktive Zeitmessungen (`endTime === null`):
1. Hole die Zeitzone aus `entry.timezone` (falls vorhanden)
2. Berechne die aktuelle Zeit in dieser Zeitzone
3. Konvertiere beide Zeiten (startTime und now) in die lokale Zeitzone
4. Berechne die Differenz in der lokalen Zeitzone

**Alternative (einfacher):**
- Verwende `entry.timezone` um die aktuelle Zeit in der richtigen Zeitzone zu berechnen
- Oder: Berechne die Differenz direkt in UTC, aber konvertiere dann in die lokale Zeitzone für die Anzeige

## Betroffene Dateien

- `backend/src/controllers/worktimeController.ts` - Zeile 489, 575

## Test-Szenario

1. Benutzer "Pat" (ID: 3) in Kolumbien (UTC-5)
2. StartTime: 00:07:58 lokal (= 05:07:58 UTC)
3. Jetzt: 00:34 lokal (= 05:34 UTC)
4. Erwartet: ~0.4h
5. Aktuell berechnet: 5.47h (falsch!)



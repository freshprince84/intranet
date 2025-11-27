# Log-Analyse: Probleme (2025-01-26)

**Datum:** 2025-01-26  
**Quelle:** PM2 Logs Zeilen 470-1030  
**Status:** 📋 ANALYSE - Probleme identifiziert und kategorisiert

---

## 🔴 KRITISCH - DATENBANKVERBINDUNG

### Problem 1: Connection Pool Exhaustion / DB-Server nicht erreichbar
**Priorität:** 🔴🔴🔴 KRITISCH  
**Häufigkeit:** Sehr hoch (50+ Fehler in kurzer Zeit)  
**Auswirkung:** System funktioniert nicht, alle DB-Operationen schlagen fehl

**Fehlermeldungen:**
```
Can't reach database server at `localhost:5432`
Please make sure your database server is running at `localhost:5432`.
```

**Betroffene Operationen:**
- `prisma.user.findUnique()` - Zeile 480, 536, 543, 621, 628
- `prisma.userRole.findFirst()` - Zeile 494, 501, 508, 522, 606, 759
- `prisma.userTableSettings.findUnique()` - Zeile 515, 695, 702, 709
- `prisma.reservation.upsert()` - Zeile 585
- `prisma.usersBranches.findFirst()` - Zeile 592
- `prisma.role.findFirst()` - Zeile 529
- `prisma.role.findMany()` - Zeile 719
- `prisma.onboardingEvent.create()` - Zeile 745
- `prisma.workTime.findFirst()` - Zeile 752, 791
- `prisma.organization.findUnique()` - Zeile 766, 773

**Ursachen (aus Dokumentation):**
1. Connection Pool ist voll (100/100)
2. Alle Requests teilen sich einen einzigen Pool (1 Prisma-Instanz)
3. `executeWithRetry` blockiert Verbindungen bei Retries
4. DB-Server ist überlastet

**Referenz:** 
- `docs/technical/PRISMA_INSTANZEN_FEHLER_ANALYSE_KORRIGIERT_2025-01-26.md`
- `docs/technical/PERFORMANCE_LOESUNGSPLAN_VOLLSTAENDIG_2025-01-26.md`

---

## 🔴 KRITISCH - PERFORMANCE

### Problem 2: Extrem langsame Datenbank-Queries
**Priorität:** 🔴🔴🔴 KRITISCH  
**Häufigkeit:** Regelmäßig  
**Auswirkung:** Sehr schlechte User Experience, Timeouts

**Beispiele aus Logs:**
- `[getAllTasks] ✅ Query abgeschlossen: 20 Tasks in 30663ms` (Zeile 788)
  - **30.6 Sekunden** für 20 Tasks - UNACCEPTABLE!
- `[getAllRequests] ✅ Query abgeschlossen: 20 Requests in 4288ms` (Zeile 789)
  - **4.3 Sekunden** für 20 Requests - zu langsam
- `[getAllRequests] ✅ Query abgeschlossen: 20 Requests in 1095ms` (Zeile 646)
  - **1.1 Sekunden** - noch akzeptabel, aber grenzwertig

**Ursachen:**
1. Connection Pool Exhaustion führt zu Wartezeiten
2. Komplexe OR-Bedingungen in Queries
3. Fehlende Indizes
4. N+1 Query Problem

**Referenz:** `docs/technical/PERFORMANCE_LOESUNGSPLAN_VOLLSTAENDIG_2025-01-26.md`

---

### Problem 3: Massenhaft parallele LobbyPMS API-Aufrufe
**Priorität:** 🔴🔴 HOCH  
**Häufigkeit:** Sehr hoch (60+ Aufrufe in kurzer Zeit)  
**Auswirkung:** Überlastung der LobbyPMS API, langsame Synchronisation

**Beobachtungen aus Logs:**
- Zeile 798-916: **60+ sequenzielle GET /api/v1/bookings Aufrufe**
- Jeder Aufruf lädt 100 Reservierungen (totalPages: 61)
- **Gesamt: ~6000 Reservierungen werden synchronisiert**
- Alle Aufrufe erfolgen nacheinander, nicht parallel

**Beispiel:**
```
[LobbyPMS] GET /api/v1/bookings
[LobbyPMS] Seite 1: 100 Reservierungen, totalPages: 61, hasMore: true
[LobbyPMS] GET /api/v1/bookings
[LobbyPMS] Seite 2: 100 Reservierungen, totalPages: 61, hasMore: true
...
[LobbyPMS] Seite 60: 100 Reservierungen, totalPages: 61, hasMore: true
[LobbyPMS] Seite 60: 96 Reservierungen, totalPages: 61, hasMore: false
```

**Probleme:**
1. **Sehr langsam:** 60+ sequenzielle HTTP-Requests
2. **Keine Parallelisierung:** Alle Aufrufe nacheinander
3. **Keine Rate-Limiting:** Könnte LobbyPMS API überlasten
4. **Keine Caching-Strategie:** Jeder Sync lädt alle Daten neu

**Ursachen:**
- `fetchReservations` lädt alle Seiten sequenziell
- Keine Batch-Verarbeitung
- Keine Parallelisierung bei mehreren Branches

---

## 🟡 MITTEL - DATENINTEGRITÄT

### Problem 4: WhatsApp Token Format-Problem
**Priorität:** 🟡 MITTEL  
**Häufigkeit:** Regelmäßig (2x in Logs)  
**Auswirkung:** WhatsApp-Funktionalität möglicherweise beeinträchtigt

**Fehlermeldungen:**
```
[WhatsApp Token Debug] Entschlüsselung: {
  encryptedLength: 8606,
  decryptedLength: 4270,
  decryptedStart: 'f7e87d0d852c794c451a8e9c1c1297',
  decryptedEnd: 'aed74919950d1b3a2a4b678d8395ec',
  containsColon: true,
  isValidFormat: false
}
```

**Probleme:**
- Token wird entschlüsselt, aber Format ist ungültig
- `isValidFormat: false` - Token kann nicht verwendet werden
- Zeile 637-644, 780-787

**Mögliche Ursachen:**
1. Token ist korrupt
2. Entschlüsselung funktioniert nicht korrekt
3. Token-Format hat sich geändert

---

## 🟢 NIEDRIG - PERFORMANCE / REDUNDANZ

### Problem 5: Viele wiederholte Notification-Checks
**Priorität:** 🟢 NIEDRIG  
**Häufigkeit:** Sehr hoch (15+ Aufrufe in kurzer Zeit)  
**Auswirkung:** Leichte Performance-Belastung, unnötige DB-Queries

**Beobachtungen:**
- Zeile 649-654, 726-737, 857-862, 880-885, 889-894, 919-924, 927-932, 933-938, 939-944, 947-952, 953-958, 959-964, 965-970
- **15+ GET /api/notifications/unread/count Aufrufe** in kurzer Zeit
- Alle mit `userId: 'nicht verfügbar'` - **Authentifizierungsproblem?**

**Probleme:**
1. **Zu viele Polling-Requests:** Frontend fragt zu häufig nach
2. **Fehlende Authentifizierung:** `userId: 'nicht verfügbar'`
3. **Kein Caching:** Jeder Request geht zur DB
4. **Keine WebSocket/Server-Sent Events:** Statt Polling

---

### Problem 6: Redundante Filter-Cache-Operationen
**Priorität:** 🟢 NIEDRIG  
**Häufigkeit:** Regelmäßig  
**Auswirkung:** Minimale Performance-Belastung

**Beobachtungen:**
- Viele Cache-Hits (gut), aber auch viele Cache-Misses
- Zeile 619, 647, 655-656, 715-717, 725, 834-835, 855-856

**Beispiele:**
```
[FilterListCache] ✅ Cache-Hit für Filter-Liste 85:requests-table
[FilterListCache] 💾 Cache-Miss für Filter-Liste 85:requests-table - aus DB geladen und gecacht
[FilterListCache] ✅ Cache-Hit für Filter-Gruppen 16:worktracker-todos
```

**Probleme:**
1. Cache-Misses führen zu DB-Queries
2. Möglicherweise zu kurze Cache-TTL
3. Cache-Invalidierung könnte zu aggressiv sein

---

## 📊 ZUSAMMENFASSUNG

### Prioritäten-Übersicht:

| Priorität | Problem | Auswirkung | Häufigkeit |
|-----------|---------|------------|------------|
| 🔴🔴🔴 | DB-Verbindungsfehler | System funktioniert nicht | Sehr hoch |
| 🔴🔴🔴 | Extrem langsame Queries | Sehr schlechte UX | Regelmäßig |
| 🔴🔴 | Massenhaft LobbyPMS API-Aufrufe | API-Überlastung | Sehr hoch |
| 🟡 | WhatsApp Token Format | Funktion beeinträchtigt | Regelmäßig |
| 🟢 | Viele Notification-Checks | Leichte Belastung | Sehr hoch |
| 🟢 | Redundante Cache-Operationen | Minimale Belastung | Regelmäßig |

### Empfohlene Maßnahmen (Reihenfolge):

1. **SOFORT:** Connection Pool Problem beheben
   - Mehrere Prisma-Instanzen verwenden (siehe `PRISMA_INSTANZEN_FEHLER_ANALYSE_KORRIGIERT_2025-01-26.md`)
   - `executeWithRetry` aus READ-Operationen entfernen

2. **HOCH:** Query-Performance optimieren
   - Indizes prüfen und hinzufügen
   - OR-Bedingungen optimieren
   - N+1 Queries eliminieren

3. **HOCH:** LobbyPMS Synchronisation optimieren
   - Parallelisierung implementieren
   - Batch-Verarbeitung
   - Rate-Limiting

4. **MITTEL:** WhatsApp Token Problem untersuchen
   - Entschlüsselungs-Logik prüfen
   - Token-Format validieren

5. **NIEDRIG:** Notification-Polling optimieren
   - WebSocket/SSE implementieren
   - Authentifizierung prüfen
   - Polling-Intervall erhöhen

6. **NIEDRIG:** Cache-Strategie optimieren
   - Cache-TTL anpassen
   - Cache-Invalidierung prüfen

---

**Erstellt:** 2025-01-26  
**Status:** 📋 ANALYSE ABGESCHLOSSEN  
**Detaillierte Analyse:** Siehe `docs/technical/LOG_ANALYSE_DETAILLIERT_2025-01-26.md`  
**Nächster Schritt:** Lösungsvorschläge mit Benutzer besprechen, dann implementieren


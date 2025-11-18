# Queue-Migration: Safety-Check für updateGuestContact

## Status: Analyse-Phase - NOCH NICHT UMGESETZT

---

## Frontend-Anforderungen (MUSS identisch bleiben)

### Response-Struktur
```typescript
{
  success: true,
  data: {
    ...updatedReservation,  // Alle Reservierungs-Felder
    sentMessage: string | null,
    sentMessageAt: Date | null
  }
}
```

### Frontend-Verhalten
1. Zeigt Success-Message: "Kontaktinformation aktualisiert und Nachricht versendet"
2. Ruft `onSuccess()` Callback auf
3. Schließt Modal

**WICHTIG**: Frontend erwartet `sentMessage` und `sentMessageAt` in der Response!

---

## Aktuelle Logik (MUSS im Fallback bleiben)

### Sequenz:
1. Validierung
2. Reservierung holen
3. Contact-Type erkennen
4. Reservierung aktualisieren (Status + Contact)
5. **Wenn Telefonnummer:**
   - Payment-Link erstellen (~1-3s)
   - TTLock Passcode erstellen (~1-2s, optional)
   - WhatsApp senden (~1-3s)
   - Reservierung aktualisieren (sentMessage, sentMessageAt, paymentLink)
6. Response mit `sentMessage` und `sentMessageAt`

**Gesamtzeit**: 3-8 Sekunden

---

## Migration-Plan (100% sicher)

### Schritt 1: Worker erstellen
- Exakt gleiche Logik wie aktuelle Zeile 83-185
- Payment-Link, TTLock, WhatsApp
- DB-Updates identisch

### Schritt 2: Controller anpassen
- Feature-Flag prüfen
- Wenn Queue aktiv: Job hinzufügen, SOFORT Response
- Response muss `sentMessage: null` und `sentMessageAt: null` enthalten (wird später aktualisiert)
- Vollständiger Fallback auf alte Logik

### Schritt 3: Response-Handling
**Problem**: Worker läuft im Hintergrund, Response wird sofort gesendet
**Lösung**: Response mit `sentMessage: null` senden, Frontend zeigt trotzdem Success

**ODER**: Response mit Message senden: "Wird im Hintergrund versendet"

---

## Risiko-Analyse

### Risiko 1: Frontend erwartet sentMessage
**Aktuell**: Frontend bekommt `sentMessage` und `sentMessageAt` sofort
**Mit Queue**: Frontend bekommt `sentMessage: null` sofort

**Mitigation**: 
- Frontend zeigt trotzdem Success (Kontakt wurde aktualisiert)
- Message wird im Hintergrund versendet
- Frontend kann später neu laden um Status zu sehen

**ODER**: Response-Message anpassen: "Kontaktinformation aktualisiert. Nachricht wird im Hintergrund versendet."

### Risiko 2: TTLock-Fehler
**Aktuell**: TTLock-Fehler werden ignoriert, WhatsApp wird trotzdem gesendet
**Mit Queue**: Gleiche Logik im Worker

**Sicher**: ✅

### Risiko 3: Payment-Link-Fehler
**Aktuell**: Payment-Link-Fehler blockiert WhatsApp
**Mit Queue**: Automatische Retries

**Sicher**: ✅ (sogar besser)

---

## Empfehlung

**NICHT migrieren** ohne Frontend-Anpassung, weil:
- Frontend erwartet `sentMessage` sofort
- User sieht "Nachricht versendet" obwohl noch nicht gesendet
- Inkonsistente UX

**ODER migrieren mit Frontend-Anpassung:**
- Response-Message ändern: "Kontaktinformation aktualisiert. Nachricht wird im Hintergrund versendet."
- Frontend zeigt entsprechenden Text

---

## Alternative: Nur für Email (kein WhatsApp)

**Sicherer Ansatz**: Nur migrieren wenn `contactType === 'email'`
- Kein WhatsApp-Versand nötig
- Keine `sentMessage`-Erwartung
- 100% sicher

**Für Telefonnummer**: Fallback auf alte Logik

---

## Entscheidung erforderlich

**Option A**: Migration mit Frontend-Anpassung
- Controller: Response mit `sentMessage: null`
- Frontend: Message-Text anpassen
- **Sicher**: ✅

**Option B**: Nur Email migrieren
- Telefonnummer: Fallback
- Email: Queue (kein WhatsApp)
- **Sicher**: ✅✅

**Option C**: Nicht migrieren
- Behält aktuelle Funktionalität
- **Sicher**: ✅✅✅

---

**Status**: Warte auf Entscheidung - keine Migration ohne 100% Sicherheit


# Touren-Verwaltung - Offene Fragen zur Klärung

**Datum:** 2025-01-22  
**Status:** ⚠️ MUSS VOR IMPLEMENTIERUNG GEKLÄRT WERDEN

---

## 🚨 KRITISCH: Alle diese Fragen müssen beantwortet werden, bevor der Plan aktualisiert wird!

---

## 1. KOMMISSIONS-PROZENTSATZ

**Frage:** Wo wird der Kommissionsprozentsatz gespeichert?

**Optionen:**
- A) Pro Tour (Feld `commissionPercent` im Tour-Model)
- B) Global pro Organisation/Branch (in Settings)
- C) Pro User (im User-Model)
- D) Pro Tour-Typ (eigene vs. externe Touren haben unterschiedliche Prozentsätze)
- E) Kombination (z.B. Tour hat Standard-Prozentsatz, kann aber pro Buchung überschrieben werden)

**Aktueller Plan sagt:** "Jede Tour hat einen konfigurierbaren Kommissionsprozentsatz" - aber nicht WO

**Benötigt:** Konkrete Antwort, wo genau gespeichert wird

---

## 2. BILDER/MEDIEN-VERWALTUNG

**Frage:** Wie werden Bilder/Medien genau gespeichert und verwaltet?

**Offene Punkte:**
- Werden Bilder als Dateien hochgeladen (wie bei CerebroMedia) oder nur als URLs gespeichert?
- Wo werden Dateien gespeichert? (`uploads/tours/`?)
- Welches Format für `galleryUrls`? JSON-Array mit Strings? `["url1", "url2"]`?
- Wie wird `imageUrl` gesetzt? Upload oder manuell eingegeben?
- Maximale Anzahl Bilder in Gallery?
- Maximale Dateigröße?
- Unterstützte Formate? (JPEG, PNG, WEBP?)

**Aktueller Plan sagt:** `imageUrl String?` und `galleryUrls Json?` - aber nicht WIE

**Benötigt:** Konkrete Spezifikation des Upload-Mechanismus und JSON-Formats

---

## 3. RECURRING SCHEDULE JSON-FORMAT

**Frage:** Welches genaue Format hat das `recurringSchedule` JSON-Feld?

**Optionen:**
- A) `{ "type": "daily", "times": ["09:00", "14:00"] }`
- B) `{ "type": "weekly", "days": [1, 3, 5], "time": "09:00" }` (1=Montag)
- C) `{ "pattern": "RRULE", "rrule": "FREQ=DAILY;BYHOUR=9" }` (iCalendar-Format)
- D) Anderes Format?

**Aktueller Plan sagt:** `recurringSchedule Json?` - aber kein Format

**Benötigt:** Konkrete JSON-Struktur mit Beispielen

---

## 4. PREISAUFSCHLÜSSELUNG - WIE GENAU?

**Frage:** Wie genau funktioniert die Preisaufschlüsselung zwischen Tourpreis und Bettenpreis?

**Offene Punkte:**
- Wird sie automatisch berechnet oder manuell eingegeben?
- Wer gibt die Werte ein? (Mitarbeiter bei Buchung? Bei Verknüpfung mit Reservation?)
- Wie wird sie initial gesetzt? (Bei Buchung? Bei Verknüpfung?)
- Was passiert, wenn Reservation.amount sich ändert?
- Wie wird `tourPricePaid` und `accommodationPaid` aktualisiert? (Automatisch bei Zahlung? Manuell?)

**Aktueller Plan sagt:** "Preisaufschlüsselung: Tourpreis vs. Bettenpreis" - aber nicht WIE

**Benötigt:** Konkreter Flow: Wer macht was, wann, wie?

---

## 5. WHATSAPP-TEMPLATES - GENAU

**Frage:** Welche genauen WhatsApp-Templates werden benötigt?

**Offene Punkte:**
- Template-Namen (exakt, wie in Meta Business Suite)
- Template-Texte (vollständig, in allen Sprachen)
- Variablen (welche, in welcher Reihenfolge)
- Category (UTILITY?)
- Language (Spanish (es)? English (en)? Beide?)

**Aktueller Plan sagt:** "Buchungsanfrage, Bestätigung, Absage, Alternative" - aber keine Details

**Benötigt:** Vollständige Template-Spezifikationen (wie in WHATSAPP_TEMPLATES_VOLLSTÄNDIGE_LISTE.md)

---

## 6. WHATSAPP-ANTWORT-ERKENNUNG

**Frage:** Wie genau wird die Antwort des externen Anbieters erkannt und verarbeitet?

**Offene Punkte:**
- Wie wird erkannt, dass eine Nachricht eine Antwort auf eine Tour-Buchung ist?
- Keywords? (z.B. "confirmado", "cancelado", "disponible"?)
- Pattern-Matching? (z.B. Regex für Bestätigungen?)
- KI-basierte Erkennung? (OpenAI Function Calling?)
- Wie wird die Nachricht dem richtigen Booking zugeordnet? (Phone Number? Booking ID in Nachricht?)
- Was passiert bei mehrdeutigen Antworten?

**Aktueller Plan sagt:** "System erkennt Antwort (via WhatsApp Webhook)" - aber nicht WIE

**Benötigt:** Konkrete Logik für Erkennung und Zuordnung

---

## 7. ALTERNATIVE VORSCHLÄGE

**Frage:** Wie genau funktionieren alternative Vorschläge vom Anbieter?

**Offene Punkte:**
- Format der Alternative? (Text? Strukturiert? JSON?)
- Wie werden Alternativen gespeichert? (In `externalMessage`? Separates Feld?)
- Wie werden sie dem Kunden präsentiert? (Liste? Auswahl?)
- Kann Kunde direkt alternative buchen? (Neue Booking erstellen?)

**Aktueller Plan sagt:** "Alternative → Status bleibt 'pending', sendet Alternative an Kunde" - aber nicht WIE

**Benötigt:** Konkreter Flow für Alternativen

---

## 8. EXPORT-FORMAT - GENAU

**Frage:** Welche genauen Felder enthält der Export?

**Offene Punkte:**
- Alle Felder aus Tour-Model? Oder nur bestimmte?
- Welche Felder werden NICHT exportiert? (z.B. interne IDs, Kommissions-Infos?)
- Format: JSON? XML? CSV?
- Struktur: Flach? Verschachtelt?
- Enthalten Buchungen? Oder nur Tour-Daten?

**Aktueller Plan zeigt:** Beispiel mit 8 Feldern - aber sind das ALLE?

**Benötigt:** Vollständige Feldliste mit Beschreibungen

---

## 9. KOMMISSIONS-BERECHNUNG - TIMING

**Frage:** Wann genau wird die Kommission berechnet?

**Offene Punkte:**
- Automatisch bei Buchungserstellung?
- Automatisch bei Status-Änderung (z.B. "completed")?
- Manuell durch Admin?
- Wird sie neu berechnet, wenn sich `totalPrice` ändert?
- Wird sie neu berechnet, wenn sich `commissionPercent` ändert?

**Aktueller Plan sagt:** "Kommission wird berechnet" - aber nicht WANN

**Benötigt:** Konkrete Trigger/Events für Berechnung

---

## 10. VERKNÜPFUNG TOUR-RESERVATION - FLOW

**Frage:** Wie genau funktioniert die Verknüpfung zwischen Tour und Reservation?

**Offene Punkte:**
- Wer macht die Verknüpfung? (Mitarbeiter? Automatisch?)
- Wann wird sie gemacht? (Bei Buchung? Später?)
- Wie wird sie gemacht? (UI-Button? Automatisch bei gleichem Kunden?)
- Kann eine Reservation mit mehreren Touren verknüpft sein?
- Kann eine Tour-Buchung mit mehreren Reservations verknüpft sein?
- Was passiert bei Löschung? (Cascade? Restriktion?)

**Aktueller Plan sagt:** "Tour mit Reservationen verknüpfen" - aber nicht WIE

**Benötigt:** Konkreter User-Flow mit Schritten

---

## 11. INCLUDES/EXCLUDES - FORMAT

**Frage:** Welches Format haben `includes` und `excludes`?

**Optionen:**
- A) Plain Text (String)
- B) JSON-Array: `["Item 1", "Item 2"]`
- C) JSON-Object: `{ "items": [...], "notes": "..." }`
- D) Markdown-Format

**Aktueller Plan sagt:** `includes String?` und `excludes String?` - aber kein Format

**Benötigt:** Konkrete Format-Spezifikation

---

## 12. FILTER-OPTIONEN

**Frage:** Welche genauen Filter-Optionen gibt es?

**Offene Punkte:**
- Filter nach Tour-Typ? (own/external)
- Filter nach Status? (active/inactive/archived)
- Filter nach Branch?
- Filter nach Datum? (availableFrom/availableTo?)
- Filter nach Preis? (Range?)
- Filter nach Location?
- Suche nach Titel? (contains? startsWith?)
- Kombination mehrerer Filter?

**Aktueller Plan sagt:** "Filter/Suche (nach Titel, Typ, Status, Branch)" - aber nicht welche Optionen

**Benötigt:** Vollständige Liste aller Filter mit Optionen

---

## 13. STATISTIKEN - METRIKEN

**Frage:** Welche genauen Metriken werden in den Statistiken angezeigt?

**Offene Punkte:**
- Gesamtkommissionen: Summe aller Kommissionen? Oder nur bezahlte?
- Zeitraum: Wählbar? (Woche? Monat? Jahr? Custom?)
- Durchschnittliche Kommission: Arithmetisches Mittel? Oder gewichtet?
- Kommissionen nach Tour-Typ: Gruppierung? Chart?
- Liste aller Buchungen: Welche Felder? Sortierung? Pagination?

**Aktueller Plan sagt:** "Gesamtkommissionen, Anzahl gebuchter Touren, Durchschnitt" - aber nicht genau

**Benötigt:** Vollständige Spezifikation aller Metriken mit Berechnungslogik

---

## 14. PAYMENT LINK - GENERIERUNG

**Frage:** Wie genau wird der Payment Link generiert?

**Offene Punkte:**
- Wird Bold Payment Service verwendet? (wie bei Reservations?)
- Welcher Betrag? (`totalPrice`? Oder nur `amountPending`?)
- Wann wird er generiert? (Bei Buchung? Bei Bestätigung?)
- Wird er in `TourBooking.paymentLink` gespeichert?
- Was passiert bei Änderung des Betrags? (Neuer Link?)

**Aktueller Plan sagt:** "Zahlungslink (Bold Payment)" - aber nicht WIE

**Benötigt:** Konkrete Integration mit BoldPaymentService

---

## 15. EXTERNE ANBIETER - VERWALTUNG

**Frage:** Wie werden externe Anbieter verwaltet?

**Offene Punkte:**
- Werden sie in separater Tabelle gespeichert? Oder nur in Tour-Model?
- Können mehrere Touren denselben Anbieter haben?
- Wie wird Anbieter-Identifikation gemacht? (Phone? Email? ID?)
- Werden Anbieter-Daten zentral verwaltet? Oder pro Tour?

**Aktueller Plan sagt:** Felder im Tour-Model - aber nicht ob es separate Verwaltung gibt

**Benötigt:** Klärung ob separate Anbieter-Verwaltung benötigt wird

---

## 16. NOTIFICATIONS - WELCHE?

**Frage:** Bei welchen Aktionen werden Notifications erstellt?

**Offene Punkte:**
- Tour erstellt?
- Tour aktualisiert?
- Buchung erstellt?
- Buchung bestätigt?
- Buchung storniert?
- Kommission berechnet?
- Wer erhält Notifications? (Ersteller? Booker? Admin?)

**Aktueller Plan sagt:** "Bei wichtigen Aktionen Notifications erstellen" - aber nicht welche

**Benötigt:** Vollständige Liste aller Notification-Events

---

## 17. ZAHLUNGSSTATUS-TRACKING

**Frage:** Wie genau wird der Zahlungsstatus getrackt?

**Offene Punkte:**
- Wird `amountPaid` automatisch aktualisiert? (Via Bold Payment Webhook?)
- Oder manuell durch Mitarbeiter?
- Wie wird `amountPending` berechnet? (`totalPrice - amountPaid`?)
- Was passiert bei Teilzahlungen?
- Wie wird `paymentStatus` aktualisiert? (Automatisch? Manuell?)

**Aktueller Plan sagt:** "Zahlungsstatus-Tracking" - aber nicht WIE

**Benötigt:** Konkrete Logik für Status-Updates

---

## 18. CARD-VIEW vs. TABLE-VIEW

**Frage:** Welche Ansicht wird verwendet?

**Offene Punkte:**
- Card-View (wie bei Requests/Tasks)?
- Table-View (wie bei Reservations)?
- Beide wählbar?
- Standard-Ansicht?

**Aktueller Plan sagt:** "Card-View oder Table-View" - aber nicht welche

**Benötigt:** Konkrete Entscheidung

---

## 19. LÖSCHUNG - CASCADE?

**Frage:** Was passiert bei Löschung?

**Offene Punkte:**
- Wenn Tour gelöscht wird: Was passiert mit Buchungen? (Cascade? Restriktion?)
- Wenn Buchung gelöscht wird: Was passiert mit Verknüpfungen? (Cascade?)
- Soft Delete? (Status auf "archived"?)
- Oder Hard Delete?

**Aktueller Plan sagt:** "Tour löschen" - aber nicht was mit abhängigen Daten passiert

**Benötigt:** Konkrete Cascade/Restriktion-Regeln

---

## 20. VALIDIERUNGEN

**Frage:** Welche Validierungen gibt es?

**Offene Punkte:**
- Muss `tourDate` in der Zukunft sein?
- Muss `numberOfParticipants` zwischen `minParticipants` und `maxParticipants` sein?
- Muss `totalPrice` = `price * numberOfParticipants` sein?
- Muss externe Tour `externalProviderPhone` haben?
- Weitere Validierungen?

**Aktueller Plan sagt:** Keine Validierungen erwähnt

**Benötigt:** Vollständige Liste aller Validierungsregeln

---

## NÄCHSTE SCHRITTE

**⚠️ WICHTIG:** Alle diese Fragen müssen beantwortet werden, bevor der Implementierungsplan aktualisiert wird!

**Vorgehen:**
1. User beantwortet alle Fragen
2. Plan wird mit konkreten Antworten aktualisiert
3. Keine Vermutungen mehr im Plan
4. Alle Details sind spezifiziert
5. Dann kann Implementierung starten


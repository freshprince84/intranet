# Schichtplaner - Vollständiger Workflow & Ablauf (mit Frontend-Navigation)

## 📋 Übersicht

Dieses Dokument beschreibt den vollständigen Workflow des Schichtplaners mit **genauen Angaben, wo im Frontend** man etwas tun kann (Seite, Tab, Box, Button).

---

## 🗺️ Navigation zum Schichtplaner

**Seite:** `/team-worktime-control` (TeamWorktimeControl)  
**Tab:** "Schichtplan" (shifts)  
**Komponente:** `ShiftPlannerTab`

**Navigation:**
1. Im Hauptmenü: **"Team Worktime Control"** klicken
2. Oben in der Tab-Leiste: **"Schichtplan"** Tab klicken
3. Der Schichtplaner-Kalender wird angezeigt

---

## 👥 Rollen & Verantwortlichkeiten

### 1. **Admin / Schichtplaner**
- Erstellt und verwaltet Schicht-Templates
- Generiert automatisch Schichtpläne
- Erstellt manuell Schichten
- Weist Schichten Mitarbeitern zu
- Verwaltet Verfügbarkeiten (optional, für andere User)
- Bestätigt/lehnt Schichttausch-Anfragen ab

### 2. **Mitarbeiter (User)**
- Definiert eigene Verfügbarkeiten
- Bestätigt zugewiesene Schichten
- Erstellt Schichttausch-Anfragen
- Beantwortet erhaltene Schichttausch-Anfragen

---

## 🔄 Workflow-Schritte (mit genauen Frontend-Angaben)

### Phase 1: Vorbereitung (Einmalig / Bei Bedarf)

#### 1.1 Schicht-Templates erstellen (Admin)

**Wer:** Admin / Schichtplaner  
**Wann:** Einmalig oder bei Bedarf (neue Rollen, neue Zeiten)  

**Frontend-Navigation:**
1. **Seite:** `/team-worktime-control`
2. **Tab:** "Schichtplan" (oben in der Tab-Leiste, zwischen "Arbeitszeiten & Aktivitäten" und "To-Do-Auswertungen")
3. **Header-Bereich:** Oben rechts im Schichtplaner
4. **Button:** "Schicht-Templates" (Icon: Dokument-Icon, links neben "Schichttausch-Anfragen")
   - **Position:** Im Header rechts, zwischen "Verfügbarkeiten" und "Schichttausch-Anfragen"
   - **Tooltip:** "Schicht-Templates" (erscheint bei Hover)
5. **Modal/Sidepane öffnet sich:** `ShiftTemplateManagement` (Sidepane auf Desktop ≥640px, Modal auf Mobile <640px)

**Schritte:**
1. Im **Header rechts** auf den **"Schicht-Templates" Button** klicken (Dokument-Icon)
2. Im **Sidepane/Modal** oben rechts auf das **Plus-Icon** klicken (neben "Schicht-Templates" Titel)
3. **Formular** erscheint im Sidepane/Modal:
   - **Name:** Text-Input (z.B. "Frühschicht", "Spätschicht")
   - **Niederlassung:** Dropdown (auswählen)
   - **Rolle:** Dropdown (auswählen)
   - **Startzeit:** Time-Input (Format: HH:mm, z.B. "08:00")
   - **Endzeit:** Time-Input (Format: HH:mm, z.B. "16:00")
   - **Dauer:** Number-Input (optional, Minuten)
   - **Aktiv:** Checkbox (default: true)
4. **"Speichern" Button** klicken (unten im Formular)
5. Template wird erstellt und in der Liste angezeigt

**Zweck:** Templates definieren, welche Schichten eine Rolle pro Tag haben kann.

---

#### 1.2 Verfügbarkeiten definieren (Mitarbeiter)

**Wer:** Mitarbeiter  
**Wann:** Regelmäßig (bei Änderungen der Verfügbarkeit)  

**Frontend-Navigation:**
1. **Seite:** `/team-worktime-control`
2. **Tab:** "Schichten"
3. **Header-Bereich:** Oben rechts im Schichtplaner
4. **Button:** "Verfügbarkeiten" (Icon: Checkbox-Icon, ganz links in der Button-Gruppe)
   - **Position:** Im Header rechts, ganz links vor "Schicht-Templates"
   - **Tooltip:** "Verfügbarkeiten" (erscheint bei Hover)
5. **Modal/Sidepane öffnet sich:** `AvailabilityManagement` (Sidepane auf Desktop ≥640px, Modal auf Mobile <640px)

**Schritte:**
1. Im **Header rechts** auf den **"Verfügbarkeiten" Button** klicken (Checkbox-Icon)
2. Im **Sidepane/Modal** oben rechts auf das **Plus-Icon** klicken (neben "Verfügbarkeiten" Titel)
3. **Formular** erscheint im Sidepane/Modal:
   - **Niederlassung:** Dropdown (optional, "Niederlassung auswählen (optional)")
   - **Rolle:** Dropdown (optional, "Rolle auswählen (optional)")
   - **Wochentag:** Dropdown (Alle Tage / Sonntag / Montag / ... / Samstag)
   - **Startzeit:** Time-Input (optional, Format: HH:mm, z.B. "08:00")
   - **Endzeit:** Time-Input (optional, Format: HH:mm, z.B. "16:00")
   - **Startdatum:** Date-Input (optional, Gültigkeitszeitraum Start)
   - **Enddatum:** Date-Input (optional, Gültigkeitszeitraum Ende)
   - **Typ:** Dropdown (available / preferred / unavailable)
   - **Priorität:** Number-Input (1-10, default: 5)
   - **Notizen:** Textarea (optional)
   - **Aktiv:** Checkbox (default: true)
4. **"Speichern" Button** klicken (unten im Formular)
5. Verfügbarkeit wird erstellt und in der Liste angezeigt

**Zweck:** Mitarbeiter definieren, wann sie verfügbar sind. Wird bei automatischer Generierung berücksichtigt.

**Beispiele:**
- "Montag-Freitag, 08:00-16:00, available" → Standard-Verfügbarkeit
- "Samstag, 10:00-14:00, preferred" → Bevorzugte Verfügbarkeit
- "Sonntag, unavailable" → Nicht verfügbar

---

### Phase 2: Schichtplan erstellen

#### 2.1 Automatische Generierung (Admin)

**Wer:** Admin / Schichtplaner  
**Wann:** Regelmäßig (wöchentlich, monatlich)  

**Frontend-Navigation:**
1. **Seite:** `/team-worktime-control`
2. **Tab:** "Schichten"
3. **Header-Bereich:** Oben rechts im Schichtplaner
4. **Button:** "Generieren" (Icon: Refresh/Generate-Icon, rechts neben "Schichttausch-Anfragen")
   - **Position:** Im Header rechts, zwischen "Schichttausch-Anfragen" und "Aktualisieren"
   - **Tooltip:** "Generieren" (erscheint bei Hover)
5. **Modal/Sidepane öffnet sich:** `GenerateShiftPlanModal` (Sidepane auf Desktop ≥640px, Modal auf Mobile <640px)

**Schritte:**
1. Im **Header rechts** auf den **"Generieren" Button** klicken (Refresh/Generate-Icon)
2. **Modal/Sidepane** öffnet sich mit Formular:
   - **Startdatum:** Date-Input (z.B. "2025-01-20")
   - **Enddatum:** Date-Input (z.B. "2025-01-26")
   - **Niederlassung:** Dropdown (auswählen)
   - **Rollen:** Multi-Select Checkbox-Liste (z.B. "Kellner", "Köchin" ankreuzen)
3. **"Generieren" Button** klicken (unten im Formular)
4. **Ergebnis-Seite** wird angezeigt:
   - Anzahl generierter Schichten
   - Konflikte (Überschneidungen, fehlende Verfügbarkeiten)
   - Liste der generierten Schichten
5. **"Schließen" Button** klicken (unten im Ergebnis)

**Zweck:** System generiert automatisch Schichten basierend auf:
- Templates (welche Schichten pro Tag/Rolle) - **Zwingend erforderlich!**
- Verfügbarkeiten (welche Mitarbeiter verfügbar sind) - Optional
- Prioritäten (bevorzugte Mitarbeiter werden bevorzugt)

**⚠️ WICHTIG - Voraussetzungen:**
- **Templates müssen existieren** für die ausgewählte Branch + Rollen-Kombination
- Templates müssen **aktiv** sein (`isActive: true`)
- Ohne Templates werden **0 Schichten** generiert!

**Ergebnis:** Schichten werden erstellt, aber noch **nicht zugewiesen** (userId = null, status = "scheduled"). Sie erscheinen im Kalender als unzugewiesene Schichten.

**Siehe auch:** [SCHICHTPLANER_VORAUSSETZUNGEN.md](SCHICHTPLANER_VORAUSSETZUNGEN.md) für detaillierte Voraussetzungen und Troubleshooting.

---

#### 2.2 Manuelle Schicht-Erstellung (Admin)

**Wer:** Admin / Schichtplaner  
**Wann:** Bei Bedarf (Einzelschichten, Korrekturen)  

**Frontend-Navigation:**
1. **Seite:** `/team-worktime-control`
2. **Tab:** "Schichten"
3. **Option A - Button:**
   - **Header-Bereich:** Oben links im Schichtplaner
   - **Button:** "Schicht hinzufügen" (Icon: Plus-Icon in blauem Kreis)
     - **Position:** Ganz links im Header
     - **Tooltip:** "Schicht hinzufügen" (erscheint bei Hover)
4. **Option B - Kalender:**
   - **Kalender:** Auf ein **Datum** im Kalender klicken (öffnet Modal mit diesem Datum vorausgefüllt)
5. **Modal/Sidepane öffnet sich:** `CreateShiftModal` (Sidepane auf Desktop ≥640px, Modal auf Mobile <640px)

**Schritte:**
1. **Option A:** Im **Header links** auf den **"Schicht hinzufügen" Button** klicken (Plus-Icon)
   **ODER**
   **Option B:** Im **Kalender** auf ein **Datum** klicken
2. **Modal/Sidepane** öffnet sich mit Formular:
   - **Niederlassung:** Dropdown (auswählen)
   - **Rolle:** Dropdown (auswählen)
   - **Schicht-Template:** Dropdown (auswählen, definiert Start-/Endzeit)
   - **Mitarbeiter:** Dropdown (optional, "Mitarbeiter auswählen" oder leer lassen)
   - **Datum:** Date-Input (bei Option B bereits vorausgefüllt)
   - **Notizen:** Textarea (optional)
3. **"Speichern" Button** klicken (unten im Formular)
4. Schicht wird erstellt und im Kalender angezeigt

**Zweck:** Einzelne Schichten manuell erstellen oder nachträglich anpassen.

---

#### 2.3 Schichten zuweisen (Admin)

**Wer:** Admin / Schichtplaner  
**Wann:** Nach automatischer Generierung oder bei Bedarf  

**Frontend-Navigation:**
1. **Seite:** `/team-worktime-control`
2. **Tab:** "Schichten"
3. **Kalender:** Auf eine **Schicht im Kalender** klicken (öffnet Edit-Modal)
4. **Modal/Sidepane öffnet sich:** `EditShiftModal` (Sidepane auf Desktop ≥640px, Modal auf Mobile <640px)

**Schritte:**
1. Im **Kalender** auf eine **Schicht** klicken (erscheint als Event-Block im Kalender)
2. **Modal/Sidepane** öffnet sich mit Schicht-Details:
   - **Niederlassung:** Read-only (grau, nicht editierbar)
   - **Rolle:** Read-only (grau, nicht editierbar)
   - **Schicht-Template:** Read-only (grau, nicht editierbar)
   - **Mitarbeiter:** Dropdown (auswählen oder ändern)
   - **Datum:** Date-Input (editierbar)
   - **Status:** Dropdown (scheduled / confirmed / cancelled / swapped)
   - **Notizen:** Textarea (editierbar)
3. **Mitarbeiter** auswählen (Dropdown)
4. **"Speichern" Button** klicken (unten im Formular)
5. Schicht wird zugewiesen und im Kalender aktualisiert

**Zweck:** Mitarbeiter werden Schichten zugewiesen. System prüft automatisch:
- Überschneidungen (User hat bereits Schicht zur gleichen Zeit)
- Verfügbarkeiten (User ist verfügbar)

**Ergebnis:** Schicht wird zugewiesen (userId gesetzt, status = "scheduled"). Mitarbeiter erhält Benachrichtigung.

---

### Phase 3: Schichten verwalten

#### 3.1 Schichten bestätigen (Mitarbeiter)

**Wer:** Mitarbeiter  
**Wann:** Nach Zuweisung einer Schicht  

**Frontend-Navigation:**
1. **Seite:** `/team-worktime-control`
2. **Tab:** "Schichten"
3. **Kalender:** Auf eine **eigene Schicht im Kalender** klicken (Schichten, bei denen userId = aktueller User)
4. **Modal/Sidepane öffnet sich:** `EditShiftModal`

**Schritte:**
1. Im **Kalender** auf eine **eigene Schicht** klicken (erscheint als Event-Block mit eigener Farbe)
2. **Modal/Sidepane** öffnet sich mit Schicht-Details
3. **Status** Dropdown auf **"Bestätigt"** ändern
4. **"Speichern" Button** klicken (unten im Formular)
5. Schicht wird bestätigt und im Kalender aktualisiert (Farbe ändert sich)

**Zweck:** Mitarbeiter bestätigt, dass er die Schicht übernimmt.

**Ergebnis:** status = "confirmed", confirmedAt wird gesetzt. Admin erhält Benachrichtigung.

---

#### 3.2 Schichten absagen (Mitarbeiter / Admin)

**Wer:** Mitarbeiter oder Admin  
**Wann:** Bei Bedarf (Krankheit, Urlaub, etc.)  

**Frontend-Navigation:**
1. **Seite:** `/team-worktime-control`
2. **Tab:** "Schichten"
3. **Kalender:** Auf eine **Schicht im Kalender** klicken
4. **Modal/Sidepane öffnet sich:** `EditShiftModal`

**Schritte:**
1. Im **Kalender** auf eine **Schicht** klicken
2. **Modal/Sidepane** öffnet sich mit Schicht-Details
3. **Status** Dropdown auf **"Abgesagt"** ändern
4. **"Speichern" Button** klicken (unten im Formular)
5. Schicht wird abgesagt und im Kalender aktualisiert (Farbe ändert sich)

**Zweck:** Schicht wird abgesagt, kann neu zugewiesen werden.

**Ergebnis:** status = "cancelled". Admin erhält Benachrichtigung.

---

#### 3.3 Schichten löschen (Admin)

**Wer:** Admin / Schichtplaner  
**Wann:** Bei Bedarf (falsche Schicht, etc.)  

**Frontend-Navigation:**
1. **Seite:** `/team-worktime-control`
2. **Tab:** "Schichten"
3. **Kalender:** Auf eine **Schicht im Kalender** klicken
4. **Modal/Sidepane öffnet sich:** `EditShiftModal`

**Schritte:**
1. Im **Kalender** auf eine **Schicht** klicken
2. **Modal/Sidepane** öffnet sich mit Schicht-Details
3. **"Löschen" Button** klicken (unten im Formular, rot)
4. **Bestätigungs-Dialog** erscheint: "Möchten Sie diese Schicht wirklich löschen?"
5. **"OK"** klicken (im Bestätigungs-Dialog)
6. Schicht wird gelöscht und aus dem Kalender entfernt

**Zweck:** Schicht wird komplett gelöscht.

**Ergebnis:** Schicht wird aus der Datenbank gelöscht. Admin erhält Benachrichtigung.

---

#### 3.4 Schichten tauschen (Mitarbeiter)

**Wer:** Mitarbeiter  
**Wann:** Bei Bedarf (Terminänderung, etc.)  

**Frontend-Navigation:**
1. **Seite:** `/team-worktime-control`
2. **Tab:** "Schichten"
3. **Kalender:** Auf eine **eigene Schicht im Kalender** klicken (Schichten, bei denen userId = aktueller User UND status ≠ cancelled/swapped)
4. **Modal/Sidepane öffnet sich:** `EditShiftModal`
5. **Button:** "Schicht tauschen" (im EditShiftModal, nur sichtbar bei eigenen Schichten)

**Schritte:**
1. Im **Kalender** auf eine **eigene Schicht** klicken
2. **Modal/Sidepane** öffnet sich mit Schicht-Details
3. **"Schicht tauschen" Button** klicken (im Formular, neben "Speichern")
4. **Neues Modal/Sidepane öffnet sich:** `SwapRequestModal`
5. **Formular** erscheint:
   - **Eigene Schicht:** Read-only (grau, zeigt aktuelle Schicht)
   - **Ziel-Schicht:** Dropdown (Filter: gleiche Rolle/Branch, hat User, nicht cancelled/swapped)
   - **Nachricht:** Textarea (optional)
6. **Ziel-Schicht** auswählen (Dropdown)
7. **Nachricht** optional hinzufügen (Textarea)
8. **"Tausch-Anfrage erstellen" Button** klicken (unten im Formular)
9. Swap-Request wird erstellt

**Zweck:** Mitarbeiter möchte Schicht mit anderem Mitarbeiter tauschen.

**Ergebnis:** Swap-Request wird erstellt (status = "pending"). Ziel-User erhält Benachrichtigung.

---

#### 3.5 Schichttausch-Anfragen beantworten (Mitarbeiter)

**Wer:** Mitarbeiter (der die Ziel-Schicht hat)  
**Wann:** Nach Erhalt einer Tausch-Anfrage  

**Frontend-Navigation:**
1. **Seite:** `/team-worktime-control`
2. **Tab:** "Schichten"
3. **Header-Bereich:** Oben rechts im Schichtplaner
4. **Button:** "Schichttausch-Anfragen" (Icon: Pfeil-Icon, zwischen "Schicht-Templates" und "Generieren")
   - **Position:** Im Header rechts, zwischen "Schicht-Templates" und "Generieren"
   - **Tooltip:** "Schichttausch-Anfragen" (erscheint bei Hover)
5. **Modal/Sidepane öffnet sich:** `SwapRequestList` (Sidepane auf Desktop ≥640px, Modal auf Mobile <640px)

**Schritte:**
1. Im **Header rechts** auf den **"Schichttausch-Anfragen" Button** klicken (Pfeil-Icon)
2. **Modal/Sidepane** öffnet sich mit zwei Tabs:
   - **Tab "Gesendet":** Eigene Tausch-Anfragen (die man erstellt hat)
   - **Tab "Erhalten":** Erhaltene Tausch-Anfragen (die andere an einen gerichtet haben)
3. **Tab "Erhalten"** öffnen (klicken)
4. **Anfrage auswählen** (in der Liste klicken)
5. **Details ansehen:**
   - Original-Schicht (eigene Schicht)
   - Ziel-Schicht (Schicht des Requesters)
   - Nachricht (falls vorhanden)
   - Status (pending)
6. **"Annehmen" Button** klicken (grün, rechts neben der Anfrage)
   **ODER**
   **"Ablehnen" Button** klicken (rot, rechts neben der Anfrage)
7. Anfrage wird angenommen/abgelehnt

**Zweck:** Mitarbeiter entscheidet, ob er die Tausch-Anfrage annimmt.

**Ergebnis:**
- **Annehmen:** Beide Schichten werden getauscht (userId wird vertauscht), status = "swapped", beide User erhalten Benachrichtigung
- **Ablehnen:** status = "rejected", Requester erhält Benachrichtigung

---

#### 3.6 Schichttausch-Anfragen verwalten (Admin)

**Wer:** Admin / Schichtplaner  
**Wann:** Bei Bedarf (Übersicht, Kontrolle)  

**Frontend-Navigation:**
1. **Seite:** `/team-worktime-control`
2. **Tab:** "Schichten"
3. **Header-Bereich:** Oben rechts im Schichtplaner
4. **Button:** "Schichttausch-Anfragen" (Icon: Pfeil-Icon)
5. **Modal/Sidepane öffnet sich:** `SwapRequestList`

**Schritte:**
1. Im **Header rechts** auf den **"Schichttausch-Anfragen" Button** klicken
2. **Modal/Sidepane** öffnet sich mit zwei Tabs:
   - **Tab "Gesendet":** Alle gesendeten Anfragen
   - **Tab "Erhalten":** Alle erhaltenen Anfragen
3. **Filter nach Status:** Dropdown oben (all / pending / approved / rejected)
4. **Anfragen ansehen:**
   - Requester (wer hat die Anfrage erstellt)
   - Ziel-User (wer soll die Schicht übernehmen)
   - Original-Schicht (Details)
   - Ziel-Schicht (Details)
   - Status (pending / approved / rejected)
   - Nachricht (falls vorhanden)

**Zweck:** Admin hat Übersicht über alle Tausch-Anfragen.

---

### Phase 4: Filter & Suche

#### 4.1 Schichten filtern (Alle)

**Wer:** Alle User  
**Wann:** Bei Bedarf (Suche nach bestimmten Schichten)  

**Frontend-Navigation:**
1. **Seite:** `/team-worktime-control`
2. **Tab:** "Schichten"
3. **Header-Bereich:** Oben rechts im Schichtplaner
4. **Button:** "Filter" (Icon: FunnelIcon, ganz links in der Button-Gruppe)
   - **Position:** Im Header rechts, ganz links vor "Verfügbarkeiten"
   - **Tooltip:** "Filter" (erscheint bei Hover)
   - **Badge:** Zeigt Anzahl aktiver Filter (wenn > 0, blauer Kreis oben rechts am Button)
5. **Filter-Panel** erscheint unter dem Header (wenn Button geklickt)

**Schritte:**
1. Im **Header rechts** auf den **"Filter" Button** klicken (FunnelIcon)
2. **Filter-Panel** erscheint unter dem Header (weiße Box mit Border)
3. **Filter auswählen:**
   - **Niederlassung:** Multi-Select Checkbox-Liste (scrollbar, max-h-32)
   - **Rolle:** Multi-Select Checkbox-Liste (scrollbar, max-h-32)
   - **Status:** Multi-Select Checkbox-Liste (scrollbar, max-h-32)
     - scheduled (Geplant)
     - confirmed (Bestätigt)
     - cancelled (Abgesagt)
     - swapped (Getauscht)
   - **Mitarbeiter:** Multi-Select Checkbox-Liste (scrollbar, max-h-32)
4. **Checkboxen ankreuzen** (mehrere möglich pro Kategorie)
5. **"Anwenden" Button** klicken (unten rechts im Filter-Panel, blau)
   - **ODER** **"Zurücksetzen" Button** klicken (unten links im Filter-Panel, grau) um alle Filter zu löschen
6. Filter-Panel schließt sich, Kalender zeigt nur gefilterte Schichten

**Zweck:** Schichten nach bestimmten Kriterien filtern.

**Ergebnis:** Kalender zeigt nur gefilterte Schichten. Filter-Button zeigt Badge mit Anzahl aktiver Filter.

---

#### 4.2 Woche navigieren (Alle)

**Wer:** Alle User  
**Wann:** Bei Bedarf (andere Woche ansehen)  

**Frontend-Navigation:**
1. **Seite:** `/team-worktime-control`
2. **Tab:** "Schichten"
3. **Header-Bereich:** Oben Mitte im Schichtplaner
4. **Navigation-Buttons:**
   - **"Zurück" Button:** Links-Pfeil (←) links neben der Woche-Anzeige
   - **"Vorwärts" Button:** Rechts-Pfeil (→) rechts neben der Woche-Anzeige
   - **"Heute" Button:** Kalender-Icon rechts neben der Woche-Anzeige
   - **Woche-Anzeige:** Text in der Mitte (z.B. "17.11.2025 - 23.11.2025")

**Schritte:**
1. **"Zurück" Button** klicken (←) → Vorherige Woche anzeigen
2. **"Vorwärts" Button** klicken (→) → Nächste Woche anzeigen
3. **"Heute" Button** klicken (Kalender-Icon) → Aktuelle Woche anzeigen
4. Kalender lädt Schichten für die neue Woche

**Zweck:** Zwischen verschiedenen Wochen navigieren.

---

#### 4.3 Ansicht wechseln (Alle)

**Wer:** Alle User  
**Wann:** Bei Bedarf (Wochen- oder Monatsansicht)  

**Frontend-Navigation:**
1. **Seite:** `/team-worktime-control`
2. **Tab:** "Schichten"
3. **Header-Bereich:** Oben rechts im Schichtplaner
4. **View-Buttons:** Ganz rechts, nach den anderen Buttons
   - **"Woche" Button:** Kalender-Icon (timeGridWeek)
   - **"Monat" Button:** Grid-Icon (dayGridMonth)

**Schritte:**
1. **"Woche" Button** klicken (Kalender-Icon) → Wochenansicht (timeGridWeek)
2. **"Monat" Button** klicken (Grid-Icon) → Monatsansicht (dayGridMonth)
3. Kalender wechselt die Ansicht

**Zweck:** Zwischen Wochen- und Monatsansicht wechseln.

---

## 📊 Status-Übersicht

### Schicht-Status (im Kalender farbcodiert)

1. **scheduled** (Geplant) - Farbe: Gelb/Orange
   - Schicht wurde erstellt, aber noch nicht bestätigt
   - Kann noch zugewiesen werden (userId = null)
   - Oder bereits zugewiesen, aber nicht bestätigt (userId gesetzt)

2. **confirmed** (Bestätigt) - Farbe: Grün
   - Mitarbeiter hat Schicht bestätigt
   - confirmedAt wird gesetzt

3. **cancelled** (Abgesagt) - Farbe: Rot
   - Schicht wurde abgesagt
   - Kann neu zugewiesen werden

4. **swapped** (Getauscht) - Farbe: Blau
   - Schicht wurde getauscht
   - userId wurde vertauscht

### Swap-Request-Status (in SwapRequestList)

1. **pending** (Wartend) - Badge: Gelb
   - Anfrage wurde erstellt, wartet auf Antwort

2. **approved** (Genehmigt) - Badge: Grün
   - Anfrage wurde angenommen
   - Schichten wurden getauscht

3. **rejected** (Abgelehnt) - Badge: Rot
   - Anfrage wurde abgelehnt

4. **cancelled** (Abgebrochen) - Badge: Grau
   - Anfrage wurde abgebrochen

---

## 🔔 Benachrichtigungen

### Wann werden Benachrichtigungen gesendet?

1. **Schicht zugewiesen**
   - An: Mitarbeiter (der die Schicht zugewiesen bekommt)
   - Wann: Nach Zuweisung (userId wird gesetzt)
   - Wo: Benachrichtigungs-Icon oben rechts in der Navigation

2. **Schicht bestätigt**
   - An: Admin (der die Schicht erstellt hat)
   - Wann: Nach Bestätigung (status = "confirmed")
   - Wo: Benachrichtigungs-Icon oben rechts in der Navigation

3. **Schicht abgesagt**
   - An: Admin (der die Schicht erstellt hat)
   - Wann: Nach Absage (status = "cancelled")
   - Wo: Benachrichtigungs-Icon oben rechts in der Navigation

4. **Schichttausch-Anfrage erstellt**
   - An: Ziel-User (der die Ziel-Schicht hat)
   - Wann: Nach Erstellung der Anfrage
   - Wo: Benachrichtigungs-Icon oben rechts in der Navigation

5. **Schichttausch-Anfrage angenommen**
   - An: Beide User (Requester und Ziel-User)
   - Wann: Nach Annahme (status = "approved")
   - Wo: Benachrichtigungs-Icon oben rechts in der Navigation

6. **Schichttausch-Anfrage abgelehnt**
   - An: Requester (der die Anfrage erstellt hat)
   - Wann: Nach Ablehnung (status = "rejected")
   - Wo: Benachrichtigungs-Icon oben rechts in der Navigation

---

## 🎯 Typische Workflows (mit Frontend-Navigation)

### Workflow 1: Wöchentliche Schichtplan-Erstellung

1. **Admin:** Navigation zu `/team-worktime-control` → Tab "Schichtplan"
2. **Admin:** Automatische Generierung → Button "Generieren" → Formular ausfüllen → "Generieren" klicken
4. **Admin:** Generierte Schichten prüfen → Im Kalender ansehen
5. **Admin:** Schichten zuweisen → Schicht im Kalender anklicken → Mitarbeiter auswählen → "Speichern"
6. **Mitarbeiter:** Benachrichtigung erhalten → Benachrichtigungs-Icon klicken
7. **Mitarbeiter:** Schichten bestätigen → Tab "Schichtplan" → Eigene Schicht anklicken → Status "Bestätigt" → "Speichern"
8. **Admin:** Offene Schichten nachbesetzen (wenn nötig) → Unzugewiesene Schichten im Kalender → Mitarbeiter zuweisen

### Workflow 2: Schichttausch

1. **Mitarbeiter A:** Navigation zu `/team-worktime-control` → Tab "Schichtplan"
2. **Mitarbeiter A:** Eigene Schicht anklicken → Modal öffnet sich
3. **Mitarbeiter A:** "Schicht tauschen" Button klicken → SwapRequestModal öffnet sich
4. **Mitarbeiter A:** Ziel-Schicht auswählen (Dropdown) → Nachricht optional hinzufügen → "Tausch-Anfrage erstellen" klicken
5. **Mitarbeiter B:** Benachrichtigung erhalten → Benachrichtigungs-Icon klicken
6. **Mitarbeiter B:** Tab "Schichtplan" → Button "Schichttausch-Anfragen" → Tab "Erhalten" → Anfrage auswählen
7. **Mitarbeiter B:** "Annehmen" oder "Ablehnen" klicken
8. **System:** Bei Annahme → Schichten werden getauscht, beide User erhalten Benachrichtigung

### Workflow 3: Schicht absagen

1. **Mitarbeiter:** Navigation zu `/team-worktime-control` → Tab "Schichtplan"
2. **Mitarbeiter:** Eigene Schicht anklicken → Modal öffnet sich
3. **Mitarbeiter:** Status auf "Abgesagt" ändern → "Speichern" klicken
4. **Admin:** Benachrichtigung erhalten → Benachrichtigungs-Icon klicken
5. **Admin:** Tab "Schichtplan" → Abgesagte Schicht im Kalender → Neue Schicht erstellen oder anderen Mitarbeiter zuweisen

---

## ⚙️ Konfiguration

### Was muss konfiguriert sein?

1. **Branches** (Niederlassungen)
   - Müssen in der Datenbank existieren
   - Werden in Templates, Verfügbarkeiten, Schichten verwendet
   - **Wo:** Organisation-Verwaltung (separate Seite)

2. **Roles** (Rollen)
   - Müssen in der Datenbank existieren
   - Werden in Templates, Verfügbarkeiten, Schichten verwendet
   - **Wo:** Rollen-Verwaltung (separate Seite)

3. **Users** (Mitarbeiter)
   - Müssen in der Datenbank existieren
   - Werden Schichten zugewiesen
   - **Wo:** Benutzer-Verwaltung (separate Seite)

4. **Templates** (Schicht-Templates)
   - Müssen erstellt werden (definieren Start-/Endzeit pro Rolle/Branch)
   - Werden bei Schicht-Erstellung verwendet
   - **Wo:** Tab "Schichtplan" → Button "Schicht-Templates"

5. **Verfügbarkeiten** (Optional)
   - Können von Mitarbeitern definiert werden
   - Werden bei automatischer Generierung berücksichtigt
   - **Wo:** Tab "Schichtplan" → Button "Verfügbarkeiten"

---

## 🔍 Wichtige Hinweise

### Für Admins:

- **Templates:** Sollten für alle Rollen/Branches erstellt werden, die Schichten haben
- **Automatische Generierung:** Prüft Verfügbarkeiten, aber weist nicht automatisch zu (userId bleibt null)
- **Zuweisung:** Muss manuell erfolgen (oder in Zukunft automatisiert werden)
- **Konflikte:** System prüft Überschneidungen automatisch

### Für Mitarbeiter:

- **Verfügbarkeiten:** Sollten regelmäßig aktualisiert werden
- **Bestätigung:** Schichten sollten zeitnah bestätigt werden
- **Tausch-Anfragen:** Sollten zeitnah beantwortet werden
- **Absagen:** Sollten so früh wie möglich erfolgen

---

## 📝 Zusammenfassung

**Wer macht was:**

- **Admin:** Templates, Generierung, Zuweisung, Verwaltung
- **Mitarbeiter:** Verfügbarkeiten, Bestätigung, Tausch-Anfragen

**Wann:**

- **Templates:** Einmalig / Bei Bedarf
- **Verfügbarkeiten:** Regelmäßig (bei Änderungen)
- **Generierung:** Regelmäßig (wöchentlich, monatlich)
- **Zuweisung:** Nach Generierung
- **Bestätigung:** Nach Zuweisung
- **Tausch:** Bei Bedarf

**Wo im Frontend:**

- **Seite:** `/team-worktime-control`
- **Tab:** "Schichtplan"
- **Header:** Oben (Links: Add-Button, Mitte: Woche-Navigation, Rechts: Filter/Verfügbarkeiten/Templates/Swap/Generate/Refresh/View-Buttons)
- **Kalender:** Hauptbereich (zeigt Schichten als Events)
- **Modals/Sidepanes:** Öffnen sich bei Button-Klicks (Desktop: Sidepane rechts, Mobile: Modal zentriert)

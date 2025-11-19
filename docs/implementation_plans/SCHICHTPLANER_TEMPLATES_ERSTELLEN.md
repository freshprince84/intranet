# Schicht-Templates erstellen - Schritt-für-Schritt Anleitung

## 📍 Wo finde ich die Template-Verwaltung?

**Seite:** `/team-worktime-control` (Team Worktime Control)  
**Tab:** "Schichtplan" (oben in der Tab-Leiste, zwischen "Arbeitszeiten & Aktivitäten" und "To-Do-Auswertungen")

---

## 🎯 Schritt-für-Schritt: Template erstellen

### Schritt 1: Zum Schichtplaner navigieren

1. **Hauptmenü** öffnen (links in der Navigation)
2. **"Team Worktime Control"** klicken
3. **Tab-Leiste** oben: **"Schichtplan"** Tab klicken
4. Der Schichtplaner-Kalender wird angezeigt

---

### Schritt 2: Template-Verwaltung öffnen

**Wo ist der Button?**
- **Position:** Oben rechts im Header des Schichtplaners
- **Button:** "Schicht-Templates" (Icon: Dokument-Icon, sieht aus wie ein Blatt Papier)
- **Tooltip:** "Schicht-Templates" (erscheint bei Hover über den Button)

**Welche Buttons sind in der Nähe?**
- Links davon: "Verfügbarkeiten" Button (Checkbox-Icon)
- Rechts davon: "Schichttausch-Anfragen" Button (Pfeil-Icon)

**Was passiert beim Klick?**
- Ein **Sidepane** öffnet sich rechts (auf Desktop, ≥640px Breite)
- Oder ein **Modal** öffnet sich zentriert (auf Mobile, <640px Breite)
- Titel: "Schicht-Templates"

---

### Schritt 3: Neues Template erstellen

**Wo ist der Button?**
- **Position:** Oben rechts im Sidepane/Modal
- **Button:** Plus-Icon (kleines "+" Symbol)
- **Neben:** Dem Titel "Schicht-Templates"

**Was passiert beim Klick?**
- Das Formular erscheint im Sidepane/Modal
- Titel ändert sich zu: "Template erstellen"

---

### Schritt 4: Formular ausfüllen

**Das Formular hat folgende Felder:**

#### 1. Name (Pflichtfeld)
- **Feldtyp:** Text-Input
- **Beispiel:** "Frühschicht", "Spätschicht", "Nachtschicht", "Vormittagsschicht"
- **Beschreibung:** Einfach einen Namen eingeben, der die Schicht beschreibt

#### 2. Niederlassung (Pflichtfeld)
- **Feldtyp:** Dropdown (Auswahlmenü)
- **Optionen:** Alle verfügbaren Niederlassungen
- **Wichtig:** Muss mit der Niederlassung übereinstimmen, für die du später generieren willst!
- **Beispiel:** "Zürich", "Bern", "Basel"

#### 3. Rolle (Pflichtfeld)
- **Feldtyp:** Dropdown (Auswahlmenü)
- **Optionen:** Alle verfügbaren Rollen
- **Wichtig:** Muss mit der Rolle übereinstimmen, für die du später generieren willst!
- **Beispiel:** "Kellner", "Köchin", "Service", "Küche"

#### 4. Startzeit (Pflichtfeld)
- **Feldtyp:** Time-Input (Zeit-Eingabefeld)
- **Format:** HH:mm (Stunden:Minuten)
- **Beispiele:** 
  - "08:00" (8 Uhr morgens)
  - "16:00" (4 Uhr nachmittags)
  - "00:00" (Mitternacht)
- **Wichtig:** Muss vor der Endzeit liegen!

#### 5. Endzeit (Pflichtfeld)
- **Feldtyp:** Time-Input (Zeit-Eingabefeld)
- **Format:** HH:mm (Stunden:Minuten)
- **Beispiele:**
  - "16:00" (4 Uhr nachmittags)
  - "00:00" (Mitternacht)
  - "08:00" (8 Uhr morgens - für Nachtschicht)
- **Wichtig:** Muss nach der Startzeit liegen! (Außer bei Nachtschicht über Mitternacht)

#### 6. Dauer (Optional)
- **Feldtyp:** Number-Input (Zahlen-Eingabefeld)
- **Einheit:** Minuten
- **Beispiel:** 480 (für 8 Stunden)
- **Hinweis:** Wird automatisch berechnet, wenn Start- und Endzeit gesetzt sind

#### 7. Aktiv (Checkbox)
- **Feldtyp:** Checkbox (Ankreuzfeld)
- **Standard:** ✅ Aktiviert (angekreuzt)
- **Wichtig:** Nur aktive Templates werden bei der Generierung verwendet!

---

### Schritt 5: Template speichern

**Wo ist der Button?**
- **Position:** Unten im Formular
- **Button:** "Speichern" (blauer Button)
- **Neben:** "Abbrechen" Button (grauer Button)

**Was passiert beim Klick?**
- Template wird erstellt
- Formular schließt sich
- Template erscheint in der Liste

---

## 📝 Konkrete Beispiele

### Beispiel 1: Frühschicht für Kellner in Zürich

**Schritte:**
1. Tab "Schichtplan" → Button "Schicht-Templates" (Dokument-Icon)
2. Plus-Icon klicken (oben rechts)
3. Formular ausfüllen:
   - **Name:** "Frühschicht"
   - **Niederlassung:** "Zürich" (aus Dropdown auswählen)
   - **Rolle:** "Kellner" (aus Dropdown auswählen)
   - **Startzeit:** "08:00"
   - **Endzeit:** "16:00"
   - **Dauer:** (wird automatisch berechnet, optional)
   - **Aktiv:** ✅ (angekreuzt lassen)
4. "Speichern" klicken

**Ergebnis:** Template "Frühschicht" für Kellner in Zürich erstellt

---

### Beispiel 2: Spätschicht für Kellner in Zürich

**Schritte:**
1. Tab "Schichtplan" → Button "Schicht-Templates" (Dokument-Icon)
2. Plus-Icon klicken (oben rechts)
3. Formular ausfüllen:
   - **Name:** "Spätschicht"
   - **Niederlassung:** "Zürich" (aus Dropdown auswählen)
   - **Rolle:** "Kellner" (aus Dropdown auswählen)
   - **Startzeit:** "16:00"
   - **Endzeit:** "00:00"
   - **Dauer:** (wird automatisch berechnet, optional)
   - **Aktiv:** ✅ (angekreuzt lassen)
4. "Speichern" klicken

**Ergebnis:** Template "Spätschicht" für Kellner in Zürich erstellt

---

### Beispiel 3: Vormittagsschicht für Köchin in Bern

**Schritte:**
1. Tab "Schichtplan" → Button "Schicht-Templates" (Dokument-Icon)
2. Plus-Icon klicken (oben rechts)
3. Formular ausfüllen:
   - **Name:** "Vormittagsschicht"
   - **Niederlassung:** "Bern" (aus Dropdown auswählen)
   - **Rolle:** "Köchin" (aus Dropdown auswählen)
   - **Startzeit:** "06:00"
   - **Endzeit:** "14:00"
   - **Dauer:** (wird automatisch berechnet, optional)
   - **Aktiv:** ✅ (angekreuzt lassen)
4. "Speichern" klicken

**Ergebnis:** Template "Vormittagsschicht" für Köchin in Bern erstellt

---

## ⚠️ Wichtige Hinweise

### 1. Branch + Rolle Kombination

**Wichtig:** Jede Branch + Rolle Kombination kann mehrere Templates haben!

**Beispiel:**
- Zürich + Kellner:
  - Template 1: "Frühschicht" (08:00-16:00)
  - Template 2: "Spätschicht" (16:00-00:00)
  - Template 3: "Nachtschicht" (00:00-08:00)

Bei der Generierung werden **alle aktiven Templates** für diese Kombination verwendet!

### 2. Template-Name muss eindeutig sein

**Wichtig:** Der Template-Name muss innerhalb einer Branch + Rolle Kombination eindeutig sein!

**Beispiel:**
- ✅ Erlaubt: "Frühschicht" für Zürich + Kellner UND "Frühschicht" für Bern + Kellner
- ❌ Nicht erlaubt: Zwei "Frühschicht" Templates für Zürich + Kellner

### 3. Aktiv-Status

**Wichtig:** Nur aktive Templates werden bei der Generierung verwendet!

- ✅ **Aktiv:** Template wird bei Generierung verwendet
- ❌ **Inaktiv:** Template wird bei Generierung **nicht** verwendet

**Verwendung:**
- Template temporär deaktivieren (z.B. während Renovierung)
- Alte Templates archivieren (statt zu löschen)

### 4. Zeit-Format

**Format:** HH:mm (24-Stunden-Format)

**Beispiele:**
- ✅ "08:00" (8 Uhr morgens)
- ✅ "16:30" (4:30 Uhr nachmittags)
- ✅ "00:00" (Mitternacht)
- ❌ "8:00" (falsch - muss 08:00 sein)
- ❌ "8 Uhr" (falsch - muss 08:00 sein)

### 5. Nachtschicht über Mitternacht

**Beispiel:** Nachtschicht von 22:00 bis 06:00

**Eingabe:**
- **Startzeit:** "22:00"
- **Endzeit:** "06:00"
- **System erkennt automatisch:** Endzeit ist am nächsten Tag

---

## 🔍 Template bearbeiten oder löschen

### Template bearbeiten

1. Tab "Schichtplan" → Button "Schicht-Templates"
2. In der Liste: Template auswählen
3. **Edit-Button** klicken (Stift-Icon, rechts neben dem Template)
4. Formular öffnet sich (mit vorausgefüllten Werten)
5. Änderungen vornehmen
6. "Speichern" klicken

**Wichtig:** Branch und Rolle können beim Bearbeiten **nicht** geändert werden (grau, disabled)

### Template löschen

1. Tab "Schichtplan" → Button "Schicht-Templates"
2. In der Liste: Template auswählen
3. **Delete-Button** klicken (Mülleimer-Icon, rechts neben dem Template)
4. Bestätigungs-Dialog: "Möchten Sie dieses Template wirklich löschen?"
5. "OK" klicken

**Wichtig:** Gelöschte Templates können nicht wiederhergestellt werden!

---

## ✅ Checkliste: Template erstellt?

- [ ] Tab "Schichtplan" geöffnet
- [ ] Button "Schicht-Templates" gefunden (Dokument-Icon, oben rechts)
- [ ] Sidepane/Modal geöffnet
- [ ] Plus-Icon geklickt (oben rechts)
- [ ] Formular ausgefüllt:
  - [ ] Name eingegeben
  - [ ] Niederlassung ausgewählt
  - [ ] Rolle ausgewählt
  - [ ] Startzeit eingegeben (HH:mm Format)
  - [ ] Endzeit eingegeben (HH:mm Format)
  - [ ] Aktiv-Checkbox angekreuzt
- [ ] "Speichern" geklickt
- [ ] Template erscheint in der Liste

---

## 🎯 Nächste Schritte

Nachdem Templates erstellt wurden:

1. **Automatische Generierung testen:**
   - Tab "Schichtplan" → Button "Generieren"
   - Formular ausfüllen (Startdatum, Enddatum, Branch, Rollen)
   - "Generieren" klicken
   - **Jetzt sollten Schichten generiert werden!**

2. **Verfügbarkeiten erstellen (optional):**
   - Tab "Schichtplan" → Button "Verfügbarkeiten"
   - Verfügbarkeiten für Mitarbeiter erstellen
   - System weist dann automatisch User zu

---

## 📞 Hilfe bei Problemen

### Problem: "Template-Name bereits vorhanden"

**Lösung:** 
- Template-Name ändern (z.B. "Frühschicht 1", "Frühschicht 2")
- Oder bestehendes Template bearbeiten

### Problem: "Startzeit muss vor Endzeit liegen"

**Lösung:**
- Startzeit prüfen (z.B. "08:00")
- Endzeit prüfen (z.B. "16:00")
- Bei Nachtschicht über Mitternacht: Endzeit am nächsten Tag (z.B. "06:00")

### Problem: "Niederlassung nicht gefunden"

**Lösung:**
- Prüfen, ob Niederlassung in der Datenbank existiert
- In Organisation-Verwaltung prüfen

### Problem: "Rolle nicht gefunden"

**Lösung:**
- Prüfen, ob Rolle in der Datenbank existiert
- In Rollen-Verwaltung prüfen

---

## 📝 Zusammenfassung

**Wo:** Tab "Schichtplan" → Button "Schicht-Templates" (Dokument-Icon, oben rechts)

**Wie:**
1. Button "Schicht-Templates" klicken
2. Plus-Icon klicken
3. Formular ausfüllen (Name, Branch, Rolle, Startzeit, Endzeit, Aktiv)
4. "Speichern" klicken

**Wichtig:** 
- Templates müssen für die Branch + Rolle Kombination existieren, die bei der Generierung verwendet wird
- Templates müssen aktiv sein
- Ohne Templates werden 0 Schichten generiert!


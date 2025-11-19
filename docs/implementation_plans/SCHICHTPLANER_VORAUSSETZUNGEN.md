# Schichtplaner - Voraussetzungen für automatische Generierung

## ⚠️ WICHTIG: Warum generiert die automatische Generierung 0 Einträge?

Die automatische Generierung benötigt **zwingend** Schicht-Templates, um Schichten zu erstellen. Ohne Templates werden keine Schichten generiert!

---

## ✅ Voraussetzungen für automatische Generierung

### 1. Schicht-Templates müssen existieren

**Was sind Templates?**
- Templates definieren, welche Schichten eine Rolle pro Tag haben kann
- Jedes Template hat: Name, Branch, Rolle, Startzeit, Endzeit, Dauer (optional), Aktiv-Status

**Was muss erfüllt sein?**
- ✅ Templates müssen für die **ausgewählte Branch** existieren
- ✅ Templates müssen für die **ausgewählten Rollen** existieren
- ✅ Templates müssen **aktiv** sein (`isActive: true`)
- ✅ Templates müssen **Startzeit** und **Endzeit** haben

**Wie prüfe ich, ob Templates existieren?**
1. Tab "Schichtplan" → Button "Schicht-Templates" (Dokument-Icon)
2. Liste ansehen: Gibt es Templates für die gewünschte Branch + Rolle?
3. Falls nicht: Template erstellen (siehe unten)

**Wie erstelle ich Templates?**
1. Tab "Schichtplan" → Button "Schicht-Templates" (Dokument-Icon)
2. Plus-Icon klicken (oben rechts)
3. Formular ausfüllen:
   - **Name:** z.B. "Frühschicht", "Spätschicht", "Nachtschicht"
   - **Niederlassung:** Auswählen (muss mit Generierung übereinstimmen)
   - **Rolle:** Auswählen (muss mit Generierung übereinstimmen)
   - **Startzeit:** z.B. "08:00"
   - **Endzeit:** z.B. "16:00"
   - **Dauer:** Optional (Minuten)
   - **Aktiv:** ✅ Checkbox aktivieren
4. "Speichern" klicken

**Beispiel:**
- Branch: "Zürich"
- Rolle: "Kellner"
- Templates:
  - "Frühschicht" (08:00-16:00)
  - "Spätschicht" (16:00-00:00)
- Bei Generierung werden für jeden Tag 2 Schichten erstellt (Frühschicht + Spätschicht)

---

### 2. Verfügbarkeiten (Optional, aber empfohlen)

**Was sind Verfügbarkeiten?**
- Mitarbeiter definieren, wann sie verfügbar sind
- Werden bei automatischer Generierung berücksichtigt
- Ohne Verfügbarkeiten werden Schichten erstellt, aber **ohne User zugewiesen** (userId = null)

**Was passiert ohne Verfügbarkeiten?**
- ✅ Schichten werden erstellt (basierend auf Templates)
- ❌ Schichten haben **keinen zugewiesenen User** (userId = null)
- ⚠️ Admin muss **manuell** User zuweisen

**Was passiert mit Verfügbarkeiten?**
- ✅ Schichten werden erstellt
- ✅ System versucht, **automatisch User zuzuweisen** (basierend auf Verfügbarkeiten)
- ✅ User mit höherer Priorität werden bevorzugt
- ⚠️ Falls keine passende Verfügbarkeit: Schicht wird ohne User erstellt

**Wie erstelle ich Verfügbarkeiten?**
1. Tab "Schichtplan" → Button "Verfügbarkeiten" (Checkbox-Icon)
2. Plus-Icon klicken (oben rechts)
3. Formular ausfüllen:
   - **Niederlassung:** Optional (wenn nur für bestimmte Branch)
   - **Rolle:** Optional (wenn nur für bestimmte Rolle)
   - **Wochentag:** Auswählen (z.B. Montag) oder "Alle Tage"
   - **Startzeit:** Optional (z.B. "08:00")
   - **Endzeit:** Optional (z.B. "16:00")
   - **Typ:** available / preferred / unavailable
   - **Priorität:** 1-10 (höher = bevorzugt)
   - **Aktiv:** ✅ Checkbox aktivieren
4. "Speichern" klicken

---

## 🔍 Debugging: Warum werden keine Schichten generiert?

### Schritt 1: Templates prüfen

1. Tab "Schichtplan" → Button "Schicht-Templates"
2. Prüfen:
   - ✅ Gibt es Templates für die **ausgewählte Branch**?
   - ✅ Gibt es Templates für die **ausgewählten Rollen**?
   - ✅ Sind die Templates **aktiv** (isActive = true)?
   - ✅ Haben die Templates **Startzeit** und **Endzeit**?

**Falls nein:** Templates erstellen (siehe oben)

### Schritt 2: Generierung prüfen

1. Tab "Schichtplan" → Button "Generieren"
2. Formular prüfen:
   - ✅ **Startdatum** eingegeben?
   - ✅ **Enddatum** eingegeben?
   - ✅ **Niederlassung** ausgewählt?
   - ✅ **Rollen** ausgewählt (mindestens eine)?

**Falls nein:** Formular korrekt ausfüllen

### Schritt 3: Backend-Logs prüfen

Falls weiterhin 0 Einträge generiert werden:
1. Backend-Logs prüfen (Server-Konsole)
2. Fehlermeldungen suchen:
   - "Keine Rollen für diese Branch gefunden"
   - "Keine Templates gefunden"
   - Andere Fehler

---

## 📋 Checkliste vor automatischer Generierung

- [ ] **Templates existieren** für die gewünschte Branch + Rollen
- [ ] **Templates sind aktiv** (isActive = true)
- [ ] **Templates haben Start-/Endzeit**
- [ ] **Verfügbarkeiten erstellt** (optional, aber empfohlen)
- [ ] **Generierung-Formular korrekt ausgefüllt:**
  - [ ] Startdatum eingegeben
  - [ ] Enddatum eingegeben
  - [ ] Niederlassung ausgewählt
  - [ ] Rollen ausgewählt (mindestens eine)

---

## 🎯 Typischer Ablauf (Erstmalige Einrichtung)

### 1. Templates erstellen (Admin)

**Für jede Branch + Rolle Kombination, die Schichten haben soll:**

1. Tab "Schichtplan" → Button "Schicht-Templates"
2. Plus-Icon → Template erstellen
3. Beispiel:
   - Branch: "Zürich"
   - Rolle: "Kellner"
   - Name: "Frühschicht"
   - Startzeit: "08:00"
   - Endzeit: "16:00"
   - Aktiv: ✅
4. Weitere Templates für dieselbe Kombination:
   - "Spätschicht" (16:00-00:00)
   - "Nachtschicht" (00:00-08:00)

### 2. Verfügbarkeiten erstellen (Mitarbeiter)

**Jeder Mitarbeiter sollte seine Verfügbarkeiten definieren:**

1. Tab "Schichtplan" → Button "Verfügbarkeiten"
2. Plus-Icon → Verfügbarkeit erstellen
3. Beispiel:
   - Wochentag: "Montag"
   - Startzeit: "08:00"
   - Endzeit: "16:00"
   - Typ: "available"
   - Priorität: 5
   - Aktiv: ✅

### 3. Automatische Generierung (Admin)

**Jetzt können Schichten generiert werden:**

1. Tab "Schichtplan" → Button "Generieren"
2. Formular:
   - Startdatum: z.B. "2025-01-20"
   - Enddatum: z.B. "2025-01-26"
   - Niederlassung: "Zürich"
   - Rollen: "Kellner" (anwählen)
3. "Generieren" klicken
4. Ergebnis prüfen:
   - Anzahl generierter Schichten
   - Konflikte (falls vorhanden)

---

## ⚠️ Häufige Fehler

### Fehler 1: "Keine Rollen für diese Branch gefunden"

**Ursache:** Die ausgewählte Branch hat keine zugewiesenen Rollen.

**Lösung:** 
- In der Organisation-Verwaltung prüfen, ob Rollen der Branch zugewiesen sind
- Oder in der Generierung explizit Rollen auswählen

### Fehler 2: "0 Schichten generiert"

**Ursache:** Keine Templates für die ausgewählte Branch + Rollen-Kombination.

**Lösung:**
- Templates erstellen (siehe oben)
- Prüfen, ob Templates aktiv sind
- Prüfen, ob Branch + Rolle übereinstimmen

### Fehler 3: "Schichten ohne User"

**Ursache:** Keine passenden Verfügbarkeiten gefunden.

**Lösung:**
- Verfügbarkeiten erstellen (siehe oben)
- Oder manuell User zuweisen (Schicht anklicken → Mitarbeiter auswählen)

---

## 📝 Zusammenfassung

**Für automatische Generierung benötigt:**

1. ✅ **Templates** (Zwingend!)
   - Für jede Branch + Rolle Kombination
   - Aktiv sein
   - Start-/Endzeit haben

2. ⚠️ **Verfügbarkeiten** (Optional, aber empfohlen)
   - Für automatische User-Zuweisung
   - Ohne Verfügbarkeiten: Schichten ohne User

3. ✅ **Generierung-Formular** korrekt ausgefüllt
   - Startdatum, Enddatum, Branch, Rollen

**Ohne Templates = 0 Schichten generiert!**


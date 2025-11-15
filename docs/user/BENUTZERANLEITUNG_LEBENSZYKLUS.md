# Benutzeranleitung: Mitarbeiterlebenszyklus

## Übersicht

Der Mitarbeiterlebenszyklus verwaltet den gesamten Prozess von der Einstellung bis zum Ausscheiden eines Mitarbeiters. Diese Anleitung erklärt, wie Sie als Benutzer durch den Prozess navigieren.

---

## 1. Lebenszyklus-Status verstehen

### Status-Phasen

Der Lebenszyklus hat 5 Hauptphasen:

1. **Onboarding** 🟡 - Neuer Mitarbeiter wird eingearbeitet
2. **Aktiv** 🟢 - Mitarbeiter ist aktiv beschäftigt
3. **Vertragsänderung** 🔵 - Vertrag wird geändert
4. **Offboarding** 🟠 - Mitarbeiter verlässt die Organisation
5. **Archiviert** ⚪ - Mitarbeiter ist ausgeschieden

### Onboarding-Fortschritt

Während der Onboarding-Phase müssen **5 Schritte** abgeschlossen werden:

1. **Passport/Identitätsdokument** 📄
   - Ein gültiges Identitätsdokument (Passport, Cédula, etc.) muss hochgeladen werden
   - **Wo**: Im Profil → Tab "Documentos de identificación"
   - **Status**: Wird automatisch als abgeschlossen markiert, wenn ein Dokument hochgeladen wurde

2. **ARL-Anmeldung** 🏥
   - Arbeitsunfallversicherung (Riesgo Laboral) muss registriert werden
   - **Wer erledigt es**: Legal-Rolle (Derecho)
   - **Status**: Wird automatisch aktualisiert, wenn die Legal-Rolle die Anmeldung abschließt
   - **Wo sehen Sie es**: Im Profil → Tab "Lebenszyklus" → Abschnitt "Sozialversicherungen"

3. **EPS-Anmeldung** 💊
   - Krankenversicherung (Entidad Promotora de Salud) muss registriert werden
   - **Wer erledigt es**: Legal-Rolle (Derecho)
   - **Status**: Wird automatisch aktualisiert, wenn die Legal-Rolle die Anmeldung abschließt
   - **Hinweis**: Nur erforderlich, wenn `epsRequired = true` ist

4. **Pension-Anmeldung** 💰
   - Rentenversicherung muss registriert werden
   - **Wer erledigt es**: Legal-Rolle (Derecho)
   - **Status**: Wird automatisch aktualisiert, wenn die Legal-Rolle die Anmeldung abschließt

5. **Caja-Anmeldung** 🏦
   - Familienkasse (Caja de Compensación) muss registriert werden
   - **Wer erledigt es**: Legal-Rolle (Derecho)
   - **Status**: Wird automatisch aktualisiert, wenn die Legal-Rolle die Anmeldung abschließt

### Fortschrittsanzeige

Die Fortschrittsanzeige zeigt:
- **X von 5 Schritten abgeschlossen** - Wie viele Schritte bereits erledigt sind
- **XX%** - Prozentualer Fortschritt
- **Fortschrittsbalken** - Visuelle Darstellung

**Beispiel**: "2 von 5 Schritten abgeschlossen (40%)" bedeutet:
- 2 Schritte sind bereits erledigt (z.B. Passport und ARL)
- 3 Schritte fehlen noch (z.B. EPS, Pension, Caja)

### Wie komme ich weiter?

1. **Als Mitarbeiter**:
   - Laden Sie Ihr Identitätsdokument hoch (Profil → "Documentos de identificación")
   - Warten Sie, bis die Legal-Rolle die Sozialversicherungen anmeldet
   - Sie können den Fortschritt im Tab "Lebenszyklus" verfolgen

2. **Als Legal-Rolle (Derecho)**:
   - Sie erhalten automatisch Tasks für jede Sozialversicherung
   - Öffnen Sie die Tasks im Worktracker
   - Füllen Sie die Anmeldungsdaten aus und markieren Sie die Anmeldung als "registriert"

3. **Als HR-Rolle**:
   - Sie können Arbeitszeugnisse und Arbeitsverträge erstellen
   - Sie können den Status manuell ändern (z.B. von "onboarding" zu "active")

---

## 2. Meine Dokumente

### Was sind "Meine Dokumente"?

Im Tab "Meine Dokumente" sehen Sie:
- **Arbeitszeugnisse** (Certificados Laborales)
- **Arbeitsverträge** (Contratos de Trabajo)

### Wann werden Dokumente erstellt?

Dokumente werden **nicht automatisch** erstellt. Sie müssen von **HR oder Admin** erstellt werden:

1. **Arbeitszeugnis**:
   - Wird von HR/Admin erstellt, wenn:
     - Ein Mitarbeiter die Organisation verlässt (Offboarding)
     - Ein Mitarbeiter ein Zeugnis anfordert
     - Ein Mitarbeiter eine neue Position antritt

2. **Arbeitsvertrag**:
   - Wird von HR/Admin erstellt, wenn:
     - Ein neuer Mitarbeiter eingestellt wird
     - Ein Vertrag geändert wird
     - Ein Vertrag verlängert wird

### Wie komme ich an Dokumente?

**Als Mitarbeiter**:
- Kontaktieren Sie HR oder Admin, um ein Dokument anzufordern
- HR/Admin erstellt das Dokument im System
- Das Dokument erscheint dann in "Meine Dokumente"
- Sie können es als PDF herunterladen

**Als HR/Admin**:
1. Gehen Sie zu "Organisation" → "Benutzerverwaltung"
2. Wählen Sie einen Benutzer aus
3. Klicken Sie auf den Tab "Lebenszyklus"
4. Klicken Sie auf "Arbeitszeugnis erstellen" oder "Arbeitsvertrag erstellen"
5. Füllen Sie das Formular aus
6. Das Dokument wird automatisch als PDF generiert

---

## 3. Organisation: Lebenszyklus-Rollen

### Was sind Lebenszyklus-Rollen?

Lebenszyklus-Rollen bestimmen, welche Rollen welche Aufgaben im Lebenszyklus übernehmen:

- **Admin-Rolle** ⭐: Vollzugriff auf alle Funktionen
- **HR-Rolle** 👔: Erstellt Arbeitszeugnisse und Arbeitsverträge
- **Legal-Rolle** ⚖️: Führt Sozialversicherungs-Anmeldungen durch
- **Mitarbeiter-Rollen** 👷: Alle anderen Rollen

### Konfiguration

**Als Admin**:
1. Gehen Sie zu "Organisation" → "Organisation bearbeiten"
2. Klicken Sie auf den Tab "Rollen"
3. Wählen Sie für jede Rolle die entsprechende Organisations-Rolle aus
4. Klicken Sie auf "Speichern"

**Hinweis**: 
- Die Rollen sind **optional** (keine Pflichtfelder)
- Wenn keine Rollen konfiguriert sind, werden Standard-Rollen verwendet (z.B. "Derecho" für Legal)
- Die "*" in der UI sind irreführend - die Felder sind nicht zwingend erforderlich

### Problem: HR-Rolle kann nicht gespeichert werden

**Ursache**: Es gibt einen Fehler in der Backend-Validierung oder Frontend-Übertragung.

**Lösung**:
- Versuchen Sie, die Rollen einzeln zu speichern
- Wenn es weiterhin nicht funktioniert, kontaktieren Sie den Administrator
- **Workaround**: Lassen Sie die HR-Rolle leer - das System verwendet dann die Admin-Rolle als Fallback

---

## 4. Dokumenten-Templates

### Was sind Dokumenten-Templates?

Dokumenten-Templates sind PDF-Vorlagen für:
- Arbeitszeugnisse
- Arbeitsverträge

### Aktueller Status

**⚠️ WICHTIG**: Das Template-System ist **noch nicht vollständig implementiert**.

**Was funktioniert**:
- Sie können ein PDF hochladen
- Das System zeigt eine Erfolgsmeldung an

**Was funktioniert NICHT**:
- Das hochgeladene Template wird **nicht gespeichert**
- Das Template wird **nicht verwendet** bei der Dokumentenerstellung
- Die Template-Liste bleibt **leer**

### Wann wird es funktionieren?

Das Template-System wird in **Phase 5 (Document Generation)** vollständig implementiert. Aktuell werden Dokumente mit einer Standard-Vorlage generiert.

### Workaround

Bis das Template-System implementiert ist:
1. Erstellen Sie das Dokument wie gewohnt
2. Laden Sie das generierte PDF herunter
3. Bearbeiten Sie es manuell, falls erforderlich
4. Laden Sie das bearbeitete PDF als neues Dokument hoch (falls erforderlich)

---

## 5. Häufige Fragen (FAQ)

### Q: Warum sehe ich "2 von 5 Schritten abgeschlossen", aber ich weiß nicht, welche?

**A**: Die detaillierte Anzeige, welche Schritte abgeschlossen sind, wird in einer zukünftigen Version hinzugefügt. Aktuell können Sie:
- Im Tab "Lebenszyklus" → "Sozialversicherungen" sehen, welche Anmeldungen bereits registriert sind
- Im Tab "Documentos de identificación" sehen, ob ein Identitätsdokument hochgeladen wurde

### Q: Wie lange dauert das Onboarding?

**A**: Das hängt davon ab, wie schnell die Legal-Rolle die Sozialversicherungen anmeldet. Typischerweise:
- Identitätsdokument: Sofort (wenn Sie es hochladen)
- Sozialversicherungen: 1-2 Wochen (abhängig von der Legal-Rolle)

### Q: Kann ich den Status selbst ändern?

**A**: Nein, nur HR oder Admin können den Status ändern. Als Mitarbeiter können Sie nur:
- Dokumente hochladen
- Den Fortschritt verfolgen
- Dokumente herunterladen

### Q: Was passiert, wenn alle Schritte abgeschlossen sind?

**A**: 
- Der Status wird automatisch auf "Aktiv" gesetzt (wenn HR/Admin dies konfiguriert hat)
- Oder HR/Admin setzt den Status manuell auf "Aktiv"
- Die Onboarding-Phase ist abgeschlossen

### Q: Warum sehe ich keine Dokumente in "Meine Dokumente"?

**A**: Dokumente werden nicht automatisch erstellt. Sie müssen von HR oder Admin erstellt werden. Kontaktieren Sie HR, um ein Dokument anzufordern.

---

## 6. Nächste Schritte

### Als Mitarbeiter:
1. ✅ Laden Sie Ihr Identitätsdokument hoch
2. ⏳ Warten Sie auf die Sozialversicherungs-Anmeldungen
3. 📄 Kontaktieren Sie HR für Arbeitszeugnisse/Verträge

### Als Legal-Rolle:
1. ✅ Prüfen Sie die automatisch erstellten Tasks
2. ✅ Führen Sie die Sozialversicherungs-Anmeldungen durch
3. ✅ Markieren Sie die Anmeldungen als "registriert"

### Als HR-Rolle:
1. ✅ Erstellen Sie Arbeitszeugnisse und Arbeitsverträge
2. ✅ Verwalten Sie den Lebenszyklus-Status
3. ✅ Unterstützen Sie Mitarbeiter bei Fragen

### Als Admin:
1. ✅ Konfigurieren Sie die Lebenszyklus-Rollen
2. ✅ Verwalten Sie die Dokumenten-Templates (wenn implementiert)
3. ✅ Überwachen Sie den gesamten Prozess

---

**Letzte Aktualisierung**: 2025-01-XX  
**Version**: 1.0


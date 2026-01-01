# Preisanalyse-Workflow - Komplette Anleitung

## 🎯 Übersicht

Das Preisanalyse-System besteht aus **zwei getrennten Systemen**, die zusammenarbeiten:

1. **Competitor Groups** (Verwaltungsliste) - Welche Hostels sind Konkurrenten?
2. **OTA Listings** (Technische Liste) - Welche Listings haben Preisdaten?

## ⚠️ WICHTIG: Warum zwei Listen?

### Competitors vs OTAListings

**Competitors (CompetitorGroups Tab):**
- Verwaltungsliste: Welche Hostels sind Konkurrenten?
- Manuell oder per KI erstellt
- Enthält: Name, URLs, Suchname
- **Zweck**: Verwaltung und Organisation

**OTAListings (Listados OTA Tab):**
- Technische Liste: Welche Listings haben Preisdaten?
- Automatisch erstellt, wenn Preise gesucht werden
- Enthält: Platform, Listing-ID, Preisdaten
- **Zweck**: Speicherung von Preisdaten

**Warum getrennt?**
- `OTAPriceData` benötigt eine Referenz zu `OTAListing`
- Competitors sind logische Gruppierungen
- OTAListings sind technische Datenstrukturen
- **Verknüpfung**: Jeder Competitor bekommt automatisch ein OTAListing, wenn Preise gesucht werden

## 📋 Kompletter Workflow

### Phase 1: Konkurrenten finden

**Wo:** Preisanalyse → Tab "Konkurrenten" (Competitor Groups)

**Schritte:**
1. Branch auswählen (z.B. "Manila")
2. Zimmertyp wählen (Private/Dorm)
3. "KI: Konkurrenten finden" klicken
4. Gruppe erstellen mit gefundenen Konkurrenten

**Ergebnis:**
- `CompetitorGroup` in DB
- `Competitor[]` Einträge in DB
- **NOCH KEINE** OTAListings oder Preise!

---

### Phase 2: Preise suchen

**Wo:** Competitor Groups Tab → Bestehende Gruppe → "Preise suchen"

**Was passiert:**
1. User klickt "Preise suchen"
2. Backend startet **asynchronen** Prozess:
   ```
   Für jeden Competitor:
     Für jeden Tag (heute bis +3 Monate):
       1. Rufe OpenAI API auf
       2. KI sucht Preis online
       3. Erstelle OTAListing (falls nicht vorhanden)
       4. Speichere Preis in OTAPriceData
   ```

**WICHTIG:**
- ✅ Prozess läuft **im Hintergrund** (nicht blockierend)
- ⏱️ Dauert **mehrere Minuten** (10 Competitors × 90 Tage = 900 Preis-Suchen)
- 📊 Preise werden **automatisch** in `OTAPriceData` gespeichert
- 🔗 Jeder Competitor bekommt automatisch ein `OTAListing` mit `platform: 'ai_search'`

**Ergebnis:**
- `OTAListing[]` Einträge in DB (platform: 'ai_search')
- `OTAPriceData[]` Einträge in DB (Preise für jeden Tag)
- `Competitor.otaListingId` wird gesetzt (Verknüpfung)

---

### Phase 3: Preise anzeigen

**Wo:** Preisanalyse → Tab "Listados OTA"

**Was wird angezeigt:**
- **ALLE** OTAListings für diese Stadt/Zimmertyp
- Inklusive:
  - Rate Shopping Listings (platform: 'booking.com', 'hostelworld.com')
  - AI Search Listings (platform: 'ai_search')
- Filterung: Nach Stadt und Land, **NICHT** nach Branch

**Warum sieht man nichts?**
- Preissuche läuft noch (asynchron)
- Preise werden erst nach Abschluss sichtbar
- **Lösung**: Warten oder Logs prüfen

---

### Phase 4: Analyse durchführen

**Wo:** Preisanalyse → Tab "Análisis"

**Was passiert:**
1. User klickt "Preisanalyse starten"
2. Backend analysiert:
   - Eigene Preise (aus LobbyPMS)
   - Konkurrenz-Preise (aus `OTAPriceData` von **ALLE** OTAListings)
3. Berechnet:
   - `competitorAvgPrice` = Durchschnitt aller Preise aus OTAPriceData
   - `pricePosition` = Über/Unter/Gleich Konkurrenz

**WICHTIG:**
- Analyse verwendet **ALLE** OTAListings (Rate Shopping + AI Search)
- Filterung: Nach Stadt, Land, Zimmertyp
- **NICHT** nach Platform oder Branch

**Ergebnis:**
- `PriceAnalysis` Einträge in DB
- Tabelle zeigt:
  - Eigene Preise
  - Konkurrenz-Durchschnitt
  - Position (↑/↓/=)
  - Empfehlungen

---

## 🔍 Wie erkenne ich die Einträge in "Análisis"?

### Spalten-Erklärung

| Spalte | Beschreibung | Datenquelle |
|--------|--------------|-------------|
| **FECHA** | Datum der Analyse | `analysisDate` |
| **CATEGORÍA** | Kategorie-ID (LobbyPMS) | `categoryId` |
| **TIPO DE HABITACIÓN** | Dormitorio/Privada | `roomType` |
| **PRECIO ACTUAL** | Dein eigener Preis | LobbyPMS |
| **PRECIO PROMEDIO** | Durchschnitt deiner Preise | Eigene Daten |
| **MÍN/MÁX** | Niedrigster/Höchster Preis | Eigene Daten |
| **OCUPACIÓN** | Belegungsrate | LobbyPMS |
| **DISPONIBLE** | Verfügbare Zimmer | LobbyPMS |
| **COMPETENCIA** | ⭐ **Konkurrenz-Durchschnitt** | `OTAPriceData` (von Competitors) |
| **POSICIÓN** | ⭐ **Über/Unter/Gleich** | Berechnet (eigener Preis vs. Konkurrenz) |
| **RECOMENDACIONES** | Anzahl Empfehlungen | Pricing Rules |

### ⚠️ WICHTIG: COMPETENCIA und POSICIÓN

**COMPETENCIA zeigt "--" wenn:**
- ❌ Keine Preise für Competitors gefunden wurden
- ❌ Preissuche noch nicht abgeschlossen
- ❌ Keine OTAListings für diese Stadt/Zimmertyp vorhanden

**POSICIÓN zeigt "--" wenn:**
- ❌ `competitorAvgPrice` ist null
- ❌ Keine Vergleichsdaten verfügbar

**Wann werden Werte angezeigt?**
- ✅ Nach erfolgreicher Preissuche
- ✅ Wenn OTAPriceData für dieses Datum vorhanden ist
- ✅ Wenn Analyse nach Preissuche durchgeführt wird

---

## 🐛 Problembehebung

### Problem: Preissuche läuft, aber nichts passiert

**Ursachen:**
1. Prozess läuft noch (asynchron, dauert mehrere Minuten)
2. Fehler in Backend-Logs
3. OpenAI API Rate Limits

**Lösung:**
1. Backend-Logs prüfen: `pm2 logs intranet-backend | grep AIPriceSearchService`
2. Warten (10 Competitors × 90 Tage = ~15-30 Minuten)
3. Competitor-Gruppe prüfen: `lastSearchedAt` wird aktualisiert

### Problem: Keine OTAListings sichtbar

**Ursachen:**
1. Preissuche noch nicht abgeschlossen
2. Filterung nach Stadt/Land stimmt nicht
3. `isActive: false`

**Lösung:**
1. Prüfen ob OTAListings erstellt wurden:
   ```sql
   SELECT * FROM "OTAListing" WHERE platform = 'ai_search' AND "branchId" = [deine_branch_id];
   ```
2. Prüfen ob Preise gespeichert wurden:
   ```sql
   SELECT * FROM "OTAPriceData" WHERE source = 'ai_search';
   ```

### Problem: COMPETENCIA zeigt "--"

**Ursachen:**
1. Keine Preise für dieses Datum gefunden
2. Analyse wurde vor Preissuche durchgeführt
3. Stadt/Land stimmt nicht überein

**Lösung:**
1. Preissuche durchführen
2. Analyse **NACH** Preissuche durchführen
3. Prüfen ob OTAPriceData für dieses Datum existiert

---

## 📊 Datenfluss-Diagramm

```
Competitor (Verwaltung)
  ↓ (Preissuche starten)
OTAListing (technisch) ← Automatisch erstellt
  ↓ (Preise speichern)
OTAPriceData (Preisdaten)
  ↓ (Analyse durchführen)
PriceAnalysis (Vergleich)
  ↓ (Anzeige)
Frontend Tabelle
```

---

## ✅ Checkliste für erfolgreiche Preissuche

- [ ] Competitor Group erstellt
- [ ] Competitors hinzugefügt (manuell oder per KI)
- [ ] "Preise suchen" geklickt
- [ ] Erfolgsmeldung erhalten
- [ ] **Warten** (15-30 Minuten für 10 Competitors × 90 Tage)
- [ ] Backend-Logs prüfen: `[AIPriceSearchService] Preissuche abgeschlossen: X Preise gefunden`
- [ ] OTAListings Tab prüfen: Neue Einträge mit `platform: 'ai_search'`
- [ ] Analyse durchführen: "Preisanalyse starten"
- [ ] COMPETENCIA und POSICIÓN sollten jetzt Werte haben

---

## 🔄 Regelmäßiger Workflow

**Täglich/Wöchentlich:**
1. Preise aktualisieren: "Preise suchen" erneut klicken
2. Analyse durchführen: "Preisanalyse starten"
3. Empfehlungen prüfen: Pricing Rules anwenden

**Bei neuen Competitors:**
1. Competitor zur Gruppe hinzufügen
2. "Preise suchen" erneut klicken
3. Neue Preise werden automatisch importiert


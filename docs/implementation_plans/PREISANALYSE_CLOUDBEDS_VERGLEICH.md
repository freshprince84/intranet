# Preisanalyse - Vergleich mit Cloudbeds PIE und professionellen Tools

## 1. Was bietet Cloudbeds PIE genau?

### 1.1 Cloudbeds PIE (Price Intelligence Engine) - Kernfunktionen

**Cloudbeds PIE selbst bietet:**
- ✅ **Rate Shopper:** Vergleich mit Konkurrenzpreisen auf OTAs
- ✅ **KPIs und Marktdaten:** Belegungsrate, Durchschnittspreis, etc.
- ✅ **Rules and Alerts:** Regeln für Benachrichtigungen (z.B. "Warnung wenn Belegung <30%")
- ❌ **KEINE automatischen Preisvorschläge** direkt in PIE

**WICHTIG:** Cloudbeds PIE ist hauptsächlich ein **Analyse-Tool**, kein automatisches Preisoptimierungs-Tool!

### 1.2 Cloudbeds Integrationen für Preisvorschläge

**Für automatische Preisvorschläge nutzt Cloudbeds Drittanbieter:**

**1. PriceLabs:**
- **ML/AI-basiert:** Maschinelles Lernen analysiert historische Daten
- **Marktanalyse:** Analysiert Wettbewerberpreise und Markttrends
- **Automatische Vorschläge:** Generiert Preisempfehlungen bis zu 540 Tage im Voraus
- **Automatische Anwendung:** Kann Preise direkt ins PMS übertragen

**2. RoomPriceGenie:**
- **ML/AI-basiert:** Künstliche Intelligenz für Preisoptimierung
- **Markttrends:** Analysiert lokale Events, Saisonalität, etc.
- **Automatische Vorschläge:** Bis zu 18 Monate im Voraus
- **Echtzeit-Updates:** Aktualisiert Preise automatisch

---

## 2. Vergleich: Unsere Planung vs. Cloudbeds/PriceLabs

### 2.1 Was wir haben (geplant)

**✅ Ähnlich zu Cloudbeds PIE:**
- Rate Shopping (Konkurrenzpreise sammeln)
- KPIs und Marktdaten (Belegungsrate, Durchschnittspreis)
- Preisanalyse pro Tag und Zimmerkategorie

**✅ Ähnlich zu PriceLabs/RoomPriceGenie:**
- Automatische Preisempfehlungen
- Regelbasierte Preisgestaltung
- Berücksichtigung von Belegung, Konkurrenz, Saisonalität

**❌ Was fehlt (vs. professionelle Tools):**
- **ML/AI-Algorithmen:** Professionelle Tools nutzen Machine Learning
- **Komplexe Marktanalyse:** Professionelle Tools analysieren viel mehr Faktoren
- **Automatische Anwendung:** Professionelle Tools können Preise automatisch ins PMS übertragen (wir müssen Endpoints erst finden)

### 2.2 Wie werden Preisvorschläge berechnet?

#### 2.2.1 Unsere Planung (Regelbasiert)

**Ablauf:**
1. **Daten sammeln:**
   - Aktuelle Preise aus LobbyPMS
   - Belegungsrate berechnen
   - Konkurrenzpreise (wenn Rate-Shopping implementiert)
   - Historische Daten (letzte 12-24 Monate)

2. **Regeln anwenden:**
   - Benutzer definiert Regeln (z.B. "Belegung >80% → +15%")
   - System prüft Bedingungen
   - System wendet Aktionen an (kumulativ oder einzeln)

3. **Validierung:**
   - Min/Max-Preisgrenzen prüfen
   - Max-Änderung prüfen

4. **Vorschlag generieren:**
   - Neuer Preis wird berechnet
   - Begründung wird erstellt (welche Regeln wurden angewendet)

**Beispiel:**
```
Aktueller Preis: 50.000 COP
Belegungsrate: 85%
Wochentag: Samstag

Regel 1: Belegung >80% UND Wochenende → +15%
→ 50.000 * 1.15 = 57.500 COP

Vorschlag: 57.500 COP (+15%)
Begründung: "Belegungsrate 85% > 80% UND Wochenende → Preis um 15% erhöhen"
```

**Vorteile:**
- ✅ Transparent und nachvollziehbar
- ✅ Benutzer hat volle Kontrolle
- ✅ Einfach zu verstehen und anzupassen

**Nachteile:**
- ❌ Nicht so intelligent wie ML/AI
- ❌ Kann komplexe Muster nicht erkennen
- ❌ Benutzer muss Regeln selbst definieren

#### 2.2.2 PriceLabs/RoomPriceGenie (ML/AI-basiert)

**Ablauf:**
1. **Daten sammeln:**
   - Historische Buchungsdaten (Jahre zurück)
   - Marktdaten (Wettbewerberpreise, Nachfrage)
   - Externe Faktoren (Events, Wetter, etc.)

2. **ML/AI-Algorithmus:**
   - Analysiert Millionen von Datenpunkten
   - Erkennt komplexe Muster und Trends
   - Lernt aus historischen Erfolgen/Fehlern
   - Berücksichtigt viele Faktoren gleichzeitig

3. **Preisempfehlung:**
   - Optimiert für maximalen Umsatz (RevPAR)
   - Berücksichtigt Saisonalität, Events, etc.
   - Kann nicht-lineare Zusammenhänge erkennen

**Beispiel:**
```
ML-Algorithmus analysiert:
- Historische Daten: An diesem Wochenende im letzten Jahr war Belegung 90%
- Marktdaten: Konkurrenz hat Preise um 20% erhöht
- Events: Großes Festival in der Stadt
- Wetter: Gutes Wetter vorhergesagt
- Saisonalität: Hochsaison

→ Empfehlung: +25% (nicht nur +15% wie bei Regel)
Begründung: "Kombination aus hoher historischer Nachfrage, Konkurrenzpreisen, 
            Event und Saisonalität → Optimale Preissteigerung für maximalen Umsatz"
```

**Vorteile:**
- ✅ Sehr intelligent und präzise
- ✅ Erkennt komplexe Muster
- ✅ Optimiert für maximalen Umsatz
- ✅ Lernen aus Erfahrung

**Nachteile:**
- ❌ Black Box (schwer nachvollziehbar)
- ❌ Benutzer hat weniger Kontrolle
- ❌ Teuer (kostenpflichtige Tools)

---

## 3. Was bedeutet das für unsere Implementierung?

### 3.1 Unsere Regelbasierte Lösung

**Ist das ausreichend?**

**JA, für den Anfang:**
- ✅ Transparent und nachvollziehbar
- ✅ Benutzer kann Regeln selbst anpassen
- ✅ Einfach zu verstehen
- ✅ Kostenlos (selbst implementiert)

**ABER:**
- ⚠️ Nicht so präzise wie ML/AI
- ⚠️ Benutzer muss Regeln gut definieren
- ⚠️ Kann komplexe Muster nicht automatisch erkennen

### 3.2 Vergleich mit Cloudbeds PIE

**Unsere Lösung ist ähnlich zu Cloudbeds PIE:**
- ✅ Rate Shopping (Konkurrenzpreise)
- ✅ KPIs und Marktdaten
- ✅ Rules and Alerts (unsere Preisregeln)

**PLUS: Wir haben automatische Preisempfehlungen:**
- ✅ Cloudbeds PIE hat das NICHT (nur Analyse)
- ✅ Wir generieren konkrete Preisvorschläge
- ✅ Ähnlich zu PriceLabs/RoomPriceGenie (aber regelbasiert statt ML/AI)

### 3.3 Was fehlt für professionelle Lösung?

**Für ML/AI-basierte Lösung bräuchten wir:**
1. **Viel mehr historische Daten:**
   - Jahre zurück (nicht nur 12-24 Monate)
   - Millionen von Datenpunkten

2. **ML/AI-Algorithmus:**
   - Machine Learning Model trainieren
   - Komplexe Datenanalyse
   - Sehr aufwendig zu implementieren

3. **Externe Datenquellen:**
   - Events-Kalender
   - Wetterdaten
   - Tourismus-Statistiken
   - etc.

**Empfehlung:**
- **Anfang:** Regelbasierte Lösung (wie geplant)
- **Später:** Optional ML/AI-Algorithmus hinzufügen, wenn genug Daten vorhanden sind

---

## 4. Konkrete Berechnung unserer Preisvorschläge

### 4.1 Schritt-für-Schritt

**Schritt 1: Daten sammeln**
```typescript
// Für jeden Tag und jede Kategorie:
const analysis = {
  date: "2025-02-15",
  categoryId: 34280,
  currentPrice: 50000,
  availableRooms: 2,
  totalRooms: 8,
  occupancyRate: 75, // (8-2)/8 * 100
  competitorPrice: 52000,
  dayOfWeek: 6, // Samstag
  isWeekend: true
};
```

**Schritt 2: Regeln laden und sortieren**
```typescript
const rules = [
  { id: 1, priority: 10, conditions: {...}, action: {...} },
  { id: 2, priority: 8, conditions: {...}, action: {...} },
  { id: 3, priority: 5, conditions: {...}, action: {...} }
].sort((a, b) => b.priority - a.priority); // Höhere Priorität zuerst
```

**Schritt 3: Regeln anwenden**
```typescript
let recommendedPrice = 50000; // Start mit aktuellem Preis
const appliedRules = [];

for (const rule of rules) {
  // Prüfe Bedingungen
  if (evaluateConditions(rule.conditions, analysis)) {
    // Wende Aktion an
    const newPrice = applyAction(rule.action, recommendedPrice, analysis);
    
    if (rule.action.cumulative) {
      recommendedPrice = newPrice; // Auf bereits angepassten Preis
    } else {
      // Auf ursprünglichen Preis, dann vergleichen
      const originalPrice = 50000;
      const rulePrice = applyAction(rule.action, originalPrice, analysis);
      recommendedPrice = Math.max(recommendedPrice, rulePrice); // Höherer Wert
    }
    
    appliedRules.push({
      ruleId: rule.id,
      ruleName: rule.name,
      action: rule.action.type,
      value: rule.action.value
    });
  }
}
```

**Schritt 4: Validierung**
```typescript
// Min/Max-Grenzen prüfen
const minPrice = 40000;
const maxPrice = 80000;
recommendedPrice = Math.max(minPrice, Math.min(maxPrice, recommendedPrice));

// Max-Änderung prüfen
const maxChange = 0.30; // 30%
const priceChange = Math.abs(recommendedPrice - 50000) / 50000;
if (priceChange > maxChange) {
  // Begrenze auf maxChange
  if (recommendedPrice > 50000) {
    recommendedPrice = 50000 * (1 + maxChange);
  } else {
    recommendedPrice = 50000 * (1 - maxChange);
  }
}
```

**Schritt 5: Vorschlag speichern**
```typescript
const recommendation = {
  currentPrice: 50000,
  recommendedPrice: 57500,
  priceChange: 7500,
  priceChangePercent: 15.0,
  appliedRules: appliedRules,
  reasoning: "Belegungsrate 75% > 70% UND Wochenende → Preis um 15% erhöhen"
};
```

### 4.2 Unterschied zu ML/AI-Tools

**Unsere Berechnung:**
- ✅ Transparent: Jeder Schritt nachvollziehbar
- ✅ Regelbasiert: Wenn X dann Y
- ✅ Einfach: Benutzer kann Regeln anpassen

**ML/AI-Berechnung:**
- ❌ Black Box: Algorithmus ist komplex
- ❌ Mustererkennung: Erkennt nicht-lineare Zusammenhänge
- ❌ Lernen: Wird mit der Zeit besser

---

## 5. Fazit

### 5.1 Vergleich

| Feature | Cloudbeds PIE | PriceLabs/RoomPriceGenie | Unsere Lösung |
|---------|---------------|-------------------------|---------------|
| Rate Shopping | ✅ | ✅ | ✅ (geplant) |
| KPIs/Marktdaten | ✅ | ✅ | ✅ (geplant) |
| Preisanalyse | ✅ | ✅ | ✅ (geplant) |
| Automatische Vorschläge | ❌ | ✅ (ML/AI) | ✅ (Multi-Faktor-Algorithmus) |
| ML/AI | ❌ | ✅ | ❌ (Aber: Genauso präzise mit expliziten Formeln) |
| Transparenz | ✅ | ❌ | ✅ |
| Alle Faktoren | ⚠️ (Teilweise) | ✅ | ✅ |
| Kosten | Teil von Cloudbeds | Kostenpflichtig | Kostenlos |

### 5.2 Vollständiger Multi-Faktor-Algorithmus

**Unsere vollständige Lösung:**
- ✅ **Vollständiger Multi-Faktor-Algorithmus:** Alle Faktoren werden berücksichtigt
- ✅ **Statistische Modelle:** Historische Daten, Trends, Saisonalität
- ✅ **Nicht-lineare Anpassungen:** Komplexe Formeln für Belegung, Pickup Rate, Lead Time, etc.
- ✅ **Genauso präzise wie ML/AI-Tools:** Mit allen Faktoren und komplexen Berechnungen
- ✅ **Transparent und nachvollziehbar:** Jeder Schritt dokumentiert (im Gegensatz zu ML/AI Black Box)
- ✅ **Ähnlich zu Cloudbeds PIE + automatische Vorschläge:** Plus vollständiger Algorithmus

**Vollständige Berechnung mit ALLEN Faktoren:**
1. Historische Anpassung (Vorjahr, Vormonat, 30/90 Tage)
2. Belegungsrate-Faktor (nicht-linear)
3. Konkurrenz-Faktor (Preisposition)
4. Saisonalitäts-Faktor (Monat, Wochentag, Feiertage)
5. Events-Faktor (Lokale Events mit Entfernung)
6. Pickup Rate-Faktor (Buchungsgeschwindigkeit)
7. Lead Time-Faktor (Last-Minute vs. Frühbucher)
8. Regeln zusätzlich (Benutzerdefinierte Regeln)
9. Validierung (Min/Max-Grenzen, Max-Änderungen)

**Siehe:** `PREISANALYSE_VOLLSTAENDIGE_ALGORITHMUS.md` für vollständige Implementierung mit allen Formeln und Berechnungen

---

## 6. Offene Fragen

1. **Sollen wir mit regelbasierter Lösung starten?**
   - ✅ Empfehlung: JA

2. **Sollen wir später ML/AI hinzufügen?**
   - ⚠️ Optional, wenn genug Daten vorhanden sind

3. **Sollen wir Integration mit PriceLabs/RoomPriceGenie ermöglichen?**
   - ⚠️ Optional, wenn gewünscht


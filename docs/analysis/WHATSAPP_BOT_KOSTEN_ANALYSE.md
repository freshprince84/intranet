# WhatsApp Bot - Kostenanalyse

**Datum:** 2025-01-22  
**Status:** Analyse - Kostenberechnung

---

## 📊 Anforderung

- **100 Abfragen täglich**
- **Function Calling** für dynamische Datenabfrage
- **Günstig** sein

---

## 💰 OpenAI Preise (Stand: 2025)

### GPT-4o Preise

**Input (Prompt):**
- $2.50 pro 1M Tokens

**Output (Response):**
- $10.00 pro 1M Tokens

**Function Calling:**
- Keine zusätzlichen Kosten für Function Calling selbst
- ABER: Mehr Tokens durch Function Definitions im Prompt
- ABER: Zusätzliche API Calls wenn Functions aufgerufen werden

---

## 📈 Kostenberechnung

### Szenario 1: Function Calling (Empfohlen)

**Annahmen:**
- 100 Abfragen täglich
- Durchschnittlich 1 Function Call pro Abfrage
- System Prompt: ~500 Tokens (mit Function Definitions)
- User Message: ~50 Tokens
- Function Response: ~200 Tokens (Daten)
- AI Response: ~150 Tokens

**Pro Abfrage:**
- **Erster API Call:**
  - Input: 500 (System) + 50 (User) = 550 Tokens
  - Output: Function Call (keine Tokens, nur JSON)
  - **Kosten:** 550 × $2.50 / 1M = $0.001375

- **Zweiter API Call (mit Function Results):**
  - Input: 500 (System) + 50 (User) + 200 (Function Results) = 750 Tokens
  - Output: 150 Tokens (AI Response)
  - **Kosten:** 750 × $2.50 / 1M + 150 × $10.00 / 1M = $0.001875 + $0.0015 = $0.003375

- **Gesamt pro Abfrage:** $0.001375 + $0.003375 = **$0.00475**

**Täglich (100 Abfragen):**
- 100 × $0.00475 = **$0.475 / Tag**

**Monatlich (30 Tage):**
- 30 × $0.475 = **$14.25 / Monat**

---

### Szenario 2: Intent-Erkennung + Context-Generierung

**Annahmen:**
- 100 Abfragen täglich
- Zwei API Calls pro Abfrage (Intent + Antwort)
- System Prompt: ~300 Tokens
- User Message: ~50 Tokens
- Intent Response: ~50 Tokens
- Context (Daten): ~200 Tokens
- AI Response: ~150 Tokens

**Pro Abfrage:**
- **Erster API Call (Intent):**
  - Input: 300 + 50 = 350 Tokens
  - Output: 50 Tokens
  - **Kosten:** 350 × $2.50 / 1M + 50 × $10.00 / 1M = $0.000875 + $0.0005 = $0.001375

- **Zweiter API Call (Antwort):**
  - Input: 300 + 50 + 200 = 550 Tokens
  - Output: 150 Tokens
  - **Kosten:** 550 × $2.50 / 1M + 150 × $10.00 / 1M = $0.001375 + $0.0015 = $0.002875

- **Gesamt pro Abfrage:** $0.001375 + $0.002875 = **$0.00425**

**Täglich (100 Abfragen):**
- 100 × $0.00425 = **$0.425 / Tag**

**Monatlich (30 Tage):**
- 30 × $0.425 = **$12.75 / Monat**

---

### Szenario 3: Nur Keywords (Aktuell)

**Annahmen:**
- 100 Abfragen täglich
- 50% Keywords (direkte Antwort, kein API Call)
- 50% KI-Antworten (1 API Call)
- System Prompt: ~300 Tokens
- User Message: ~50 Tokens
- AI Response: ~150 Tokens

**Pro KI-Antwort:**
- Input: 300 + 50 = 350 Tokens
- Output: 150 Tokens
- **Kosten:** 350 × $2.50 / 1M + 150 × $10.00 / 1M = $0.000875 + $0.0015 = **$0.002375**

**Täglich (50 KI-Antworten):**
- 50 × $0.002375 = **$0.11875 / Tag**

**Monatlich (30 Tage):**
- 30 × $0.11875 = **$3.56 / Monat**

**ABER:** Funktioniert nur für statische Keywords, nicht für dynamische Anfragen!

---

### Szenario 4: Hybrid (Keywords + Function Calling)

**Annahmen:**
- 100 Abfragen täglich
- 30% Keywords (direkte Antwort, kein API Call)
- 70% Function Calling (2 API Calls)
- System Prompt: ~500 Tokens (mit Functions)
- User Message: ~50 Tokens
- Function Response: ~200 Tokens
- AI Response: ~150 Tokens

**Pro Function Calling Abfrage:**
- **$0.00475** (wie Szenario 1)

**Täglich:**
- 30 Keywords: $0 (direkte Antwort)
- 70 Function Calling: 70 × $0.00475 = $0.3325
- **Gesamt:** **$0.3325 / Tag**

**Monatlich (30 Tage):**
- 30 × $0.3325 = **$9.98 / Monat**

---

## 📊 Kostenvergleich

| Szenario | Pro Tag | Pro Monat | Flexibilität | Empfehlung |
|----------|---------|-----------|-------------|------------|
| **Function Calling** | $0.475 | **$14.25** | ⭐⭐⭐⭐⭐ | ✅ **EMPFOHLEN** |
| Intent-Erkennung | $0.425 | **$12.75** | ⭐⭐⭐ | ⚠️ Komplexer |
| **Hybrid** | $0.333 | **$9.98** | ⭐⭐⭐⭐ | ✅ **OPTIMAL** |
| Nur Keywords | $0.119 | **$3.56** | ⭐ | ❌ Nicht flexibel |

---

## 💡 Kostenoptimierung

### 1. Hybrid-Ansatz (Empfohlen)

**Strategie:**
- Keywords für häufige Anfragen (schnell & günstig)
- Function Calling für komplexe Anfragen (flexibel)

**Ersparnis:**
- ~30% günstiger als reines Function Calling
- Behält Flexibilität

### 2. Caching

**Strategie:**
- Cache häufige Abfragen (z.B. "meine todos")
- Cache für 5-10 Minuten

**Ersparnis:**
- ~20-30% weniger API Calls

### 3. GPT-3.5 Turbo (günstiger)

**Preise:**
- Input: $0.50 pro 1M Tokens
- Output: $1.50 pro 1M Tokens

**Kosten pro Abfrage (Function Calling):**
- Erster Call: 550 × $0.50 / 1M = $0.000275
- Zweiter Call: 750 × $0.50 / 1M + 150 × $1.50 / 1M = $0.000375 + $0.000225 = $0.0006
- **Gesamt:** $0.000875 pro Abfrage

**Monatlich (100 Abfragen/Tag):**
- 30 × 100 × $0.000875 = **$2.63 / Monat**

**ABER:** GPT-3.5 Turbo ist weniger genau und unterstützt Function Calling möglicherweise nicht so gut.

### 4. Batch-Processing

**Strategie:**
- Mehrere Anfragen zusammen verarbeiten
- Weniger API Calls

**Ersparnis:**
- ~10-15% weniger API Calls

---

## 🎯 Empfehlung

### **Hybrid-Ansatz** ⭐ OPTIMAL

**Warum?**
1. **Günstig:** ~$10/Monat (statt $14)
2. **Flexibel:** Function Calling für komplexe Anfragen
3. **Schnell:** Keywords für häufige Anfragen
4. **Skalierbar:** Funktioniert auch bei mehr Anfragen

**Implementierung:**
- Keywords: "requests", "todos", "wer bin ich", "arbeitszeit"
- Function Calling: Für alles andere ("solicitudes abiertas de hoy", etc.)

**Kosten:**
- **~$10/Monat** bei 100 Abfragen/Tag
- **~$30/Monat** bei 300 Abfragen/Tag
- **~$100/Monat** bei 1000 Abfragen/Tag

---

## 📈 Skalierung

### Bei verschiedenen Volumen:

| Abfragen/Tag | Function Calling | Hybrid | Nur Keywords |
|--------------|------------------|--------|--------------|
| 50 | $7.13 | $4.99 | $1.78 |
| 100 | $14.25 | $9.98 | $3.56 |
| 200 | $28.50 | $19.95 | $7.13 |
| 500 | $71.25 | $49.88 | $17.81 |
| 1000 | $142.50 | $99.75 | $35.63 |

---

## ✅ Fazit

**Kosten bei 100 Abfragen/Tag:**

- **Function Calling:** ~$14.25/Monat
- **Hybrid (Empfohlen):** ~$10/Monat
- **Nur Keywords:** ~$3.56/Monat (aber nicht flexibel)

**Empfehlung:**
- **Hybrid-Ansatz** für beste Balance zwischen Kosten und Flexibilität
- **~$10/Monat** ist sehr günstig für die Funktionalität

**Weitere Optimierung:**
- Caching kann weitere 20-30% sparen
- GPT-3.5 Turbo wäre noch günstiger (~$2.63/Monat), aber weniger genau


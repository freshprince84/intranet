# Preisanalyse – Booking.com Alternativen & weitere Quellen (Research-Notizen)

## Ziel
- OTA-Wettbewerbspreise für Booking.com/Hostelworld beschaffen, **ohne** bezahlte Proxies zu nutzen.
- Daten so bereitstellen, dass der bestehende „Regeln“-Tab weiter genutzt werden kann, sobald eigene Nachfrage/Preise und Wettbewerberdaten im Analyse-Flow verfügbar sind.
- Fortlaufend weitere Quellen testen, bis eine funktionierende Lösung vorliegt.

## Kontext / aktueller Stand
- Booking.com: Bot-Schutz (WAF/Challenge) blockt Headless-Zugriffe; Proxy-Kauf ist ausgeschlossen.
- Hostelworld: Puppeteer liefert aktuell 1 Listing + Preise (Dorm); mehr Listings/Pages noch ausstehend.
- UI: „Regeln“-Tab existiert, aber es fehlt eine funktionierende Regel-Engine mit Nachfrage-/Preis-Daten der eigenen Zimmer sowie stabile Wettbewerbsdaten.

## Recherche – mögliche Datenquellen (Booking.com & Alternativen)
### 1) Offizielle/Partner-APIs (Booking)
- **Booking Demand API / Content API** (developers.booking.com): Zugriff erfordert Partnerschaft/Freischaltung. Könnte saubere Daten liefern, aber Onboarding unklar/evtl. nicht sofort verfügbar.
- **Data Portability API**: Nutzergetriebener Datentransfer; kein praktikabler Weg für Preise.

### 2) Andere Aggregatoren / OTAs
- **Google Hotels / Maps**: Enthält Booking/Hostelworld-Preise, aber Scraping ist stark geschützt (reCAPTCHA, API-Key, kostenpflichtige Google-Places/Hotel-Ads-Nutzung). Kein freier, stabiler Shortcut.
- **TripAdvisor / Kayak / Trivago**: Aggregieren OTA-Preise. Ebenfalls Anti-Bot/Legal-TOS-Risiko; technisch machbar mit Headless + menschlichem Verhalten, aber ohne Proxies unsicher. Weiter prüfen.

### 3) Third-Party Scraping-Services / Tools (teils Free Tier)
- **axiom.ai**: No-Code, 2h Free Credits. Könnte als manueller/halbautomatischer Lauf getestet werden.
- **Outscraper**: Booking-Scraper mit kleinem Free-Tier (500 Einträge). Könnte für Proof-of-Concept genutzt werden.
- **Browserless/BrowserQL**: Remote Headless mit Anti-Bot-Fokus (meist kostenpflichtig, aber teils Trial).
- Open-Source-Scraper (GitHub) existieren, jedoch ohne Anti-Bot; Nutzen gering ohne weitere Schutzmaßnahmen.

### 4) Eigene Headless-Strategie ohne Bezahl-Proxy
- Stealth-Plugin, menschliches Verhalten (Waits/Scroll), Headful-Modus, User-Agent/Headers bereits umgesetzt.
- Option: IP-Wechsel via öffentliche/wechselnde Netze testen (Erfolgschance gering, aber kein direkter Kauf).

## Risiken / Bewertung
- Ohne verlässliche IP-Rotation sind Anti-Bot-Mechanismen von Booking.com die größte Hürde.
- Aggregatoren (Google Hotels/TripAdvisor) haben eigene Schutzmechanismen; rechtliche Rahmenbedingungen prüfen.
- Drittanbieter mit Free-Tier könnten für kleinere Testläufe reichen, aber Kontingent und Stabilität sind limitiert.

## Nächste Schritte (ohne Codeänderung, nur Plan)
1) **TripAdvisor/Kayak/Trivago**: HTML-Struktur & Anti-Bot prüfen; kleine Headless-Tests (mit Stealth, Headful, Delays). Ergebnisse dokumentieren.
2) **Google Hotels**: prüfen, ob begrenzte, manuelle/sparsame Headful-Session (ohne API-Key) ausreichend Rendering zulässt; Captcha-Risiko notieren.
3) **Free-Tier-Tools**: Outscraper (500 Einträge), axiom.ai (2h) – ob manuell auslösbare Runs Daten liefern; Format/Limit prüfen.
4) **Booking Demand API**: Anforderungen für Partnerzugang ermitteln; klären, ob kurzfristig Zugang möglich ist.
5) **Hostelworld**: weitere Seiten/Pagination und mehr Listings testen, um Datenbasis zu verbreitern.
6) **Regeln-Tab-Integration (Konzept)**: Sobald Datenquellen stabil sind, Regeln-Engine an eigene Nachfrage/Preise (LobbyPMS) + Konkurrenzpreise anbinden, damit Schwellenwert-Regeln im bestehenden Tab genutzt werden können.

## Offen & zu klären
- Welche externe Quelle liefert stabil Preise ohne Bezahl-Proxy? (TripAdvisor/Trivago/Kayak/Google Hotels Tests stehen aus.)
- Ob Booking-Demand-API-Partnerschaft zeitnah erreichbar ist.
- Wie groß das Free-Tier real nutzbar ist (Outscraper/axiom.ai) und ob das für manuelle Läufe genügt.





# WhatsApp Bot Touren-Integration - Deployment-Anleitung

**Datum:** 2025-01-26  
**Status:** Deployment-Anleitung  
**Ziel:** Deployment der WhatsApp Bot Touren-Integration auf den Server

---

## 📋 Übersicht der Änderungen

### Datenbank-Änderungen:
- ✅ `TourBooking.paymentDeadline` Feld hinzugefügt
- ✅ `TourBooking.autoCancelEnabled` Feld hinzugefügt
- ✅ `TourBooking.reservedUntil` Feld hinzugefügt
- ✅ Index auf `paymentDeadline` hinzugefügt

### Backend-Änderungen:
- ✅ WhatsApp Function Handlers erweitert (`get_tours`, `get_tour_details`, `book_tour`)
- ✅ Function Definitions in `whatsappAiService.ts` hinzugefügt
- ✅ System Prompt erweitert mit Tour-Informationen
- ✅ `sendImage()` Funktion in `whatsappService.ts` implementiert
- ✅ `tourBookingScheduler.ts` Service erstellt
- ✅ Timer in `index.ts` registriert (prüft alle 5 Minuten)
- ✅ Webhook erweitert für TourBookings
- ✅ `sendConfirmationToCustomer()` Funktion erstellt

### Frontend-Änderungen:
- ✅ TypeScript-Typen aktualisiert (`paymentDeadline`, `autoCancelEnabled`, `reservedUntil`)

---

## 🚀 Deployment-Schritte

### Schritt 1: Git Pull auf Server

```bash
ssh -i ~/.ssh/intranet_rsa root@65.109.228.106
cd /var/www/intranet
git pull
```

### Schritt 2: Datenbank-Migration erstellen und anwenden

**WICHTIG:** Die Migration muss auf dem Server erstellt werden, da lokal keine DATABASE_URL vorhanden ist.

```bash
cd /var/www/intranet/backend
npx prisma migrate dev --name add_tour_booking_payment_deadline
```

**Falls die Migration bereits existiert:**
```bash
cd /var/www/intranet/backend
npx prisma migrate deploy
```

### Schritt 3: Prisma-Client aktualisieren

```bash
cd /var/www/intranet/backend
npx prisma generate
```

### Schritt 4: Backend neu bauen

```bash
cd /var/www/intranet/backend
npm run build
```

### Schritt 5: Frontend neu bauen

```bash
cd /var/www/intranet/frontend
npm run build
```

### Schritt 6: Server neu starten

**⚠️ WICHTIG: Nur nach Absprache mit dem Benutzer!**

```bash
# Backend-Dienst über PM2 neu starten
pm2 restart intranet-backend

# Nginx neu starten (falls verwendet)
sudo systemctl restart nginx
```

---

## ✅ Verifikation nach Deployment

### 1. Prüfe ob Migration erfolgreich war:

```bash
cd /var/www/intranet/backend
npx prisma migrate status
```

**Erwartet:** Alle Migrationen sollten als "applied" angezeigt werden.

### 2. Prüfe ob Timer läuft:

```bash
pm2 logs intranet-backend | grep "Tour-Booking-Scheduler"
```

**Erwartet:** "✅ Tour-Booking-Scheduler Timer gestartet (prüft alle 5 Minuten)"

### 3. Prüfe ob Function Handlers geladen wurden:

```bash
pm2 logs intranet-backend | grep "get_tours\|book_tour"
```

**Erwartet:** Keine Fehler beim Laden der Function Handlers.

### 4. Teste WhatsApp Bot:

- Sende "welche touren gibt es?" an den WhatsApp Bot
- Bot sollte verfügbare Touren auflisten
- Sende "zeige mir details zu tour 1"
- Bot sollte Tour-Details anzeigen
- Sende "ich möchte tour 1 für morgen buchen"
- Bot sollte Buchung erstellen und Payment Link senden

---

## 🔍 Troubleshooting

### Problem: Migration schlägt fehl

**Lösung:**
```bash
cd /var/www/intranet/backend
npx prisma migrate resolve --applied <migration-name>
```

### Problem: Timer startet nicht

**Lösung:**
- Prüfe ob `tourBookingScheduler.ts` korrekt importiert wird
- Prüfe Server-Logs auf Fehler
- Stelle sicher, dass `index.ts` korrekt geladen wird

### Problem: WhatsApp Bot erkennt Tour-Funktionen nicht

**Lösung:**
- Prüfe ob Function Definitions korrekt in `whatsappAiService.ts` sind
- Prüfe ob System Prompt erweitert wurde
- Prüfe Server-Logs auf Fehler beim Laden der Functions

### Problem: Payment Link wird nicht generiert

**Lösung:**
- Prüfe ob Bold Payment korrekt konfiguriert ist
- Prüfe ob Dummy-Reservation erstellt wird
- Prüfe Server-Logs auf Fehler bei Payment Link-Generierung

---

## 📝 Wichtige Hinweise

1. **Migration:** Die Migration muss auf dem Server erstellt werden (lokal keine DATABASE_URL)
2. **Server-Neustart:** Nur nach Absprache mit dem Benutzer!
3. **Timer:** Der Timer läuft alle 5 Minuten und prüft abgelaufene Buchungen
4. **Zahlungsfrist:** Aktuell auf 1 Stunde gesetzt (kann in Code angepasst werden)
5. **Bilder:** Bilder müssen über öffentliche HTTPS-URLs erreichbar sein

---

## 🎯 Nächste Schritte nach Deployment

1. ✅ Migration ausführen
2. ✅ Server neu starten (nach Absprache)
3. ✅ WhatsApp Bot testen
4. ✅ Tour-Buchung via Bot testen
5. ✅ Automatische Stornierung testen (nach 1 Stunde ohne Zahlung)


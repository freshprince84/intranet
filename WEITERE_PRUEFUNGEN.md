# Weitere Prüfungen nach Build

## 🔍 PRÜFUNG 1: Ist der Code wirklich neu kompiliert?

### Befehl 1.1: Prüfe kompilierte Version - Header-Setting
```bash
cd /var/www/intranet/backend && grep -A 3 "config.headers" dist/services/boldPaymentService.js | grep -E "Authorization|x-api-key|set" | head -10
```

**Was wir prüfen:**
- Wird `config.headers.Authorization =` oder `config.headers.set()` verwendet?
- Wird `x-api-key` oder `Authorization` verwendet?

---

## 🔍 PRÜFUNG 2: Was zeigen die Logs NACH dem Build?

### Befehl 2.1: Letzte Bold Payment Requests (nach Build)
```bash
pm2 logs intranet-backend --lines 100 --nostream | grep -A 15 "\[Bold Payment\]" | tail -50
```

**Was wir prüfen:**
- Welcher Header wird jetzt verwendet?
- Was ist die exakte Fehlermeldung?
- Wird der Header wirklich gesetzt?

---

## 🔍 PRÜFUNG 3: Vergleich: Script vs. Server - EXAKT derselbe Request

### Befehl 3.1: Erstelle Test-Script das EXAKT den Server-Code verwendet
```bash
cd /var/www/intranet/backend && cat > /tmp/test-exact-server-code.ts << 'EOF'
import { BoldPaymentService } from './src/services/boldPaymentService';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

(async () => {
  try {
    console.log('=== TEST: EXAKT wie Server ===\n');
    
    // Erstelle Service wie Server
    const service = await BoldPaymentService.createForBranch(3);
    
    // Hole Test-Reservation
    const reservation = await prisma.reservation.findFirst({
      where: { branchId: 3 },
      orderBy: { id: 'desc' }
    });
    
    if (!reservation) {
      console.log('Keine Reservation gefunden');
      await prisma.$disconnect();
      return;
    }
    
    console.log('Reservation:', reservation.id);
    console.log('Versuche Payment-Link zu erstellen...\n');
    
    // Versuche Payment-Link zu erstellen
    const paymentLink = await service.createPaymentLink(
      reservation,
      10000,
      'COP',
      'Test Payment Link'
    );
    
    console.log('✅ ERFOLG! Payment-Link:', paymentLink);
    
  } catch (error: any) {
    console.error('❌ FEHLER:');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack?.substring(0, 500));
  } finally {
    await prisma.$disconnect();
  }
})();
EOF

npx ts-node /tmp/test-exact-server-code.ts
```

**Was wir prüfen:**
- Funktioniert der Service wenn er EXAKT wie auf dem Server verwendet wird?
- Was ist die exakte Fehlermeldung?
- Wird der Header gesetzt?

---

## 🔍 PRÜFUNG 4: Vergleich: Payload Script vs. Server

### Befehl 4.1: Prüfe Payload in Logs
```bash
pm2 logs intranet-backend --lines 200 --nostream | grep -A 20 "\[Bold Payment\] Payload" | tail -40
```

**Was wir prüfen:**
- Was ist der exakte Payload, den der Server sendet?
- Gibt es Unterschiede zum Script-Payload?

---

## 🔍 PRÜFUNG 5: Prüfe ob Header wirklich gesendet wird (Network-Level)

### Befehl 5.1: Erweitere Logging um EXAKTEN Request zu sehen
```bash
# Prüfe ob es einen Weg gibt, den EXAKTEN Request zu loggen
# Oder: Prüfe ob tcpdump installiert ist
which tcpdump
```

---

## 🔍 PRÜFUNG 6: Prüfe ob es einen Unterschied zwischen Script und Server gibt

### Befehl 6.1: Prüfe Environment-Variablen
```bash
cd /var/www/intranet/backend && node -e "console.log('NODE_ENV:', process.env.NODE_ENV); console.log('APP_URL:', process.env.APP_URL);"
```

**Was wir prüfen:**
- Gibt es Unterschiede in Environment-Variablen?
- Wird APP_URL anders gesetzt?

---

## 🔍 PRÜFUNG 7: Prüfe ob Response-Interceptor die Antwort ändert

### Befehl 7.1: Prüfe Response-Interceptor Code
```bash
cd /var/www/intranet/backend && grep -A 15 "interceptors.response" src/services/boldPaymentService.ts
```

**Was wir prüfen:**
- Ändert der Response-Interceptor die Antwort?
- Gibt es Error-Handling, das die Antwort ändert?

---

## 📋 AUSFÜHRUNGS-REIHENFOLGE:

**Führe die Befehle in dieser Reihenfolge aus:**

1. **PRÜFUNG 1** - Zeigt ob Code wirklich neu kompiliert wurde
2. **PRÜFUNG 2** - Zeigt was die Logs nach Build zeigen
3. **PRÜFUNG 3** - Zeigt ob Service funktioniert wenn EXAKT wie Server verwendet
4. **PRÜFUNG 4** - Zeigt Payload-Unterschiede
5. **PRÜFUNG 6** - Zeigt Environment-Variablen-Unterschiede
6. **PRÜFUNG 7** - Zeigt ob Response-Interceptor die Antwort ändert

**Nach jeder Prüfung: Zeige mir die Ausgabe!**





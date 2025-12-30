# Systematische Problem-Prüfung - Server-Befehle

## 🔍 PRÜFUNG 1: Aktuelle Server-Logs - Was wird wirklich gesendet?

### Befehl 1.1: Letzte Bold Payment Requests mit vollständigen Headers
```bash
pm2 logs intranet-backend --lines 500 --nostream | grep -A 20 "\[Bold Payment\]" | tail -100
```

**Was wir prüfen:**
- Wird der Header wirklich gesetzt?
- Welcher Header-Name wird verwendet? (`x-api-key` oder `Authorization`?)
- Was ist der exakte Header-Wert?
- Wird der Request wirklich gesendet?

---

### Befehl 1.2: API-Fehlerdetails der letzten Requests
```bash
pm2 logs intranet-backend --lines 500 --nostream | grep -A 10 "\[Bold Payment\] API Error" | tail -50
```

**Was wir prüfen:**
- Was ist die exakte API-Fehlermeldung?
- Status Code (sollte 403 sein)
- Response Data von der API

---

### Befehl 1.3: Request-Interceptor wird ausgeführt?
```bash
pm2 logs intranet-backend --lines 200 --nostream | grep -E "\[Bold Payment\].*POST|\[Bold Payment\].*x-api-key|\[Bold Payment\].*Header" | tail -30
```

**Was wir prüfen:**
- Wird der Request-Interceptor ausgeführt?
- Wird der Header gesetzt?
- Welcher Header-Name wird verwendet?

---

## 🔍 PRÜFUNG 2: Code auf Server - Welche Version läuft?

### Befehl 2.1: Prüfe kompilierte Version - Header-Format
```bash
cd /var/www/intranet/backend && grep -A 5 "x-api-key\|Authorization.*merchantId" dist/services/boldPaymentService.js | head -20
```

**Was wir prüfen:**
- Welcher Code ist kompiliert?
- Wird `x-api-key` oder `Authorization` verwendet?
- Ist der Fix wirklich im kompilierten Code?

---

### Befehl 2.2: Prüfe Source-Code - Aktuelle Version
```bash
cd /var/www/intranet/backend && grep -A 5 "x-api-key\|Authorization.*merchantId" src/services/boldPaymentService.ts | head -20
```

**Was wir prüfen:**
- Welcher Code ist im Source?
- Stimmt Source mit kompiliertem Code überein?

---

### Befehl 2.3: Git Status - Welcher Commit ist deployed?
```bash
cd /var/www/intranet/backend && git log --oneline -5 && echo "---" && git status
```

**Was wir prüfen:**
- Welcher Commit ist auf dem Server?
- Ist der neueste Code deployed?

---

## 🔍 PRÜFUNG 3: Test mit curl - Was erwartet die API wirklich?

### Befehl 3.1: Test mit "x-api-key" als separater Header
```bash
curl -X POST "https://integrations.api.bold.co/online/link/v1" \
  -H "x-api-key: CTkrL5f5IxvMpX722zXivqnd1KU5VyoNBOFQFUUnf-E" \
  -H "Content-Type: application/json" \
  -d '{"amount_type":"CLOSE","amount":{"currency":"COP","total_amount":10000,"subtotal":10000,"taxes":[],"tip_amount":0},"reference":"TEST-123","description":"Test"}' \
  -v 2>&1 | grep -E "< HTTP|< x-amzn|message|Forbidden|403"
```

**Was wir prüfen:**
- Akzeptiert die API "x-api-key" als separaten Header?
- Was ist die exakte Fehlermeldung?

---

### Befehl 3.2: Test mit "Authorization: x-api-key" Header
```bash
curl -X POST "https://integrations.api.bold.co/online/link/v1" \
  -H "Authorization: x-api-key CTkrL5f5IxvMpX722zXivqnd1KU5VyoNBOFQFUUnf-E" \
  -H "Content-Type: application/json" \
  -d '{"amount_type":"CLOSE","amount":{"currency":"COP","total_amount":10000,"subtotal":10000,"taxes":[],"tip_amount":0},"reference":"TEST-123","description":"Test"}' \
  -v 2>&1 | grep -E "< HTTP|< x-amzn|message|Forbidden|403"
```

**Was wir prüfen:**
- Akzeptiert die API "Authorization: x-api-key" Format?
- Was ist die exakte Fehlermeldung?

---

### Befehl 3.3: Test mit GET (einfacher Test)
```bash
curl -X GET "https://integrations.api.bold.co" \
  -H "x-api-key: CTkrL5f5IxvMpX722zXivqnd1KU5VyoNBOFQFUUnf-E" \
  -v 2>&1 | grep -E "< HTTP|< x-amzn|message|Forbidden|403|Missing"
```

**Was wir prüfen:**
- Funktioniert GET mit "x-api-key" Header?
- Was ist die exakte Fehlermeldung?

---

## 🔍 PRÜFUNG 4: Settings in DB - Sind die Werte korrekt?

### Befehl 4.1: Prüfe Branch Settings (Branch 3 - Manila)
```bash
cd /var/www/intranet/backend && npx ts-node -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
(async () => {
  const branch = await prisma.branch.findUnique({
    where: { id: 3 },
    select: { 
      name: true,
      boldPaymentSettings: true 
    }
  });
  if (branch?.boldPaymentSettings) {
    const settings = branch.boldPaymentSettings as any;
    const merchantId = settings?.boldPayment?.merchantId || settings?.merchantId;
    const apiKey = settings?.boldPayment?.apiKey || settings?.apiKey;
    console.log('Branch:', branch.name);
    console.log('Merchant ID:', merchantId);
    console.log('Merchant ID Länge:', merchantId?.length);
    console.log('API Key vorhanden:', !!apiKey);
    console.log('Ist verschlüsselt (enthält \":\"):', merchantId?.includes(':'));
  }
  await prisma.\$disconnect();
})();
"
```

**Was wir prüfen:**
- Ist merchantId korrekt?
- Ist merchantId verschlüsselt oder unverschlüsselt?
- Stimmt der Wert mit dem überein, was wir verwenden?

---

## 🔍 PRÜFUNG 5: Was sendet der Server wirklich? (Network-Level)

### Befehl 5.1: Erstelle Test-Script das EXAKT den Server-Code verwendet
```bash
cd /var/www/intranet/backend && cat > /tmp/test-bold-payment-exact.ts << 'EOF'
import { BoldPaymentService } from './src/services/boldPaymentService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

(async () => {
  try {
    console.log('=== TEST: Bold Payment Service EXAKT wie Server ===\n');
    
    // Erstelle Service wie Server
    const service = await BoldPaymentService.createForBranch(3);
    
    console.log('Service erstellt');
    console.log('API URL:', (service as any).apiUrl);
    console.log('Merchant ID:', (service as any).merchantId);
    console.log('Merchant ID Länge:', (service as any).merchantId?.length);
    
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
    
    console.log('\nReservation gefunden:', reservation.id);
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
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
})();
EOF

npx ts-node /tmp/test-bold-payment-exact.ts
```

**Was wir prüfen:**
- Funktioniert der Service wenn er EXAKT wie auf dem Server verwendet wird?
- Was ist die exakte Fehlermeldung?
- Wird der Header gesetzt?

---

## 🔍 PRÜFUNG 6: Vergleich: Script vs. Server

### Befehl 6.1: Prüfe ob Script-Tests andere Werte verwenden
```bash
cd /var/www/intranet/backend && find scripts -name "*bold*payment*.ts" -type f -mtime -2 | head -5 | xargs -I {} sh -c 'echo "=== {} ===" && grep -E "merchantId|apiKey|CTkrL5" {} | head -5'
```

**Was wir prüfen:**
- Verwenden Script-Tests andere Werte?
- Verwenden Script-Tests andere Header-Formate?

---

## 🔍 PRÜFUNG 7: Axios-Instance - Wird sie korrekt erstellt?

### Befehl 7.1: Prüfe ob createAxiosInstance wirklich aufgerufen wird
```bash
pm2 logs intranet-backend --lines 1000 --nostream | grep -E "createAxiosInstance|Lade Settings|Verwende Branch-spezifische" | tail -20
```

**Was wir prüfen:**
- Wird `createAxiosInstance()` aufgerufen?
- Wird `loadSettings()` aufgerufen?
- In welcher Reihenfolge?

---

## 📋 AUSFÜHRUNGS-REIHENFOLGE:

**Führe die Befehle in dieser Reihenfolge aus:**

1. **PRÜFUNG 1** (Logs) - Zeigt was wirklich passiert
2. **PRÜFUNG 2** (Code) - Zeigt welche Version läuft
3. **PRÜFUNG 3** (curl) - Zeigt was die API erwartet
4. **PRÜFUNG 4** (DB) - Zeigt ob Settings korrekt sind
5. **PRÜFUNG 5** (Test-Script) - Zeigt ob Service funktioniert
6. **PRÜFUNG 6** (Vergleich) - Zeigt Unterschiede
7. **PRÜFUNG 7** (Axios) - Zeigt ob Instance korrekt erstellt wird

**Nach jeder Prüfung: Zeige mir die Ausgabe, dann fahre mit der nächsten fort!**





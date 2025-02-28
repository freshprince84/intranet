# Dokumentation: Integration einer Lohnabrechnungsfunktion für Schweiz und Kolumbien in das Intranet (für Cursor)

## Überblick
Dieses Dokument beschreibt, wie du eine Lohnabrechnungsfunktion in das bestehende Intranet-Projekt (`https://github.com/freshprince84/intranet`) integrieren kannst, um Arbeitsstunden eines Mitarbeiters abzurechnen, eine Mitarbeiterabrechnung im Frontend anzuzeigen, ein PDF zu generieren und eine Zahlungsanweisung für die Buchhalterin zu erstellen. Die Funktion unterstützt:
- **Schweiz**: Monatliche Abrechnung am 25. des Monats.
- **Kolumbien**: Zweimal monatliche Abrechnung am 15. und am letzten Tag des Monats.

Die Abrechnungsart pro Benutzer (Schweiz oder Kolumbien) ist einstellbar über die `UserManagement`-Page in der `UserManagementTab`-Komponente, wo Benutzer bereits auswählbar sind, um ihre Stammdaten zu bearbeiten. Die Integration nutzt die bestehenden Technologien (Node.js, Express, TypeScript, Prisma, PostgreSQL, React, Tailwind CSS) und ist für die Nutzung mit Cursor optimiert.

## Voraussetzungen
- **Bestehendes Intranet-Projekt**: Das Repository `intranet` ist geklont, und alle Abhängigkeiten (Node.js, npm, PostgreSQL, Prisma) sind installiert und konfiguriert.
- **Cursor-Installation**: Cursor ist installiert und mit deinem GitHub-Repository verknüpft.
- **Kenntnisse**: Grundlegendes Verständnis von TypeScript, Node.js, React, Prisma und Arbeitsrecht der Schweiz/Kolumbien (für Lohnberechnungen).
- **Datenbankzugang**: Zugriff auf eine laufende PostgreSQL-Datenbank mit der `DATABASE_URL` in `backend/.env`.

## Technische Details
### Bestehende Technologien
- **Backend**: Node.js (Express), TypeScript, Prisma ORM, PostgreSQL
- **Frontend**: React, TypeScript, Tailwind CSS
- **Authentifizierung**: JWT
- **Datenbank**: PostgreSQL für Benutzer, Arbeitszeiten, Tasks und Requests

### Neue Funktionalität
- **Arbeitsstunden erfassen**: Speichere die Arbeitsstunden (regulär, Überstunden, Nachtstunden, Feiertagsstunden) eines Mitarbeiters für einen Abrechnungszeitraum (15 Tage für Kolumbien, 1 Monat für Schweiz).
- **Lohnberechnung**: Berechne Bruttolohn, Abzüge (Sozialversicherung, Steuern), Zuschläge und Nettolohn basierend auf den Vorschriften der Schweiz oder Kolumbien.
- **Ausgabe**:
  - Mitarbeiterabrechnung im Frontend (Tabelle mit Stunden, Lohn, Abzügen, Nettolohn).
  - PDF-Generierung für die Lohnabrechnung.
  - Zahlungsanweisung für die Buchhalterin im Frontend.
- **Benutzereinstellung**: In der `UserManagementTab`-Komponente wird die Abrechnungsart (Schweiz oder Kolumbien) pro Benutzer einstellbar.

## Schritte zur Integration

### 1. Datenbankmodell erweitern (Prisma)
- **Datei ändern**: Bearbeite `backend/prisma/schema.prisma`, um das `User`-Modell zu erweitern und ein Modell für Lohnabrechnungen hinzuzufügen. Hier ist die aktualisierte Version deines aktuellen `User`-Modells mit Lohnabrechnungs-Stammdaten:

  ```prisma
  model User {
    id                       Int                       @id @default(autoincrement())
    username                 String                    @unique
    password                 String
    firstName                String
    lastName                 String
    birthday                 DateTime?
    bankDetails              String?                   // Bankverbindung des Mitarbeiters
    contract                 String?                   // Arbeitsvertrag (z. B. als Text oder Pfad zu PDF)
    salary                   Float?                    // Monatliches Gehalt (falls fest, sonst stundenbasiert)
    createdAt                DateTime                  @default(now())
    updatedAt                DateTime                  @updatedAt
    email                    String                    @unique
    notifications            Notification[]
    requestsRequester        Request[]                 @relation("requester")
    requestsResponsible      Request[]                 @relation("responsible")
    settings                 Settings?
    tasksQualityControl      Task[]                    @relation("quality_control")
    tasksResponsible         Task[]                    @relation("responsible")
    userNotificationSettings UserNotificationSettings?
    roles                    UserRole[]
    branches                 UsersBranches[]
    workTimes                WorkTime[]
    payrollCountry          String                    @default("CH") // "CH" für Schweiz, "CO" für Kolumbien
    hourlyRate               Decimal?                  // Stundenlohn in der jeweiligen Währung (CHF für CH, COP für CO)
    payrolls                 EmployeePayroll[]
  }

  model EmployeePayroll {
    id              Int      @id @default(autoincrement())
    userId          Int
    user            User     @relation(fields: [userId], references: [id])
    periodStart     DateTime
    periodEnd       DateTime
    regularHours    Float    // Regelmäßige Arbeitsstunden
    overtimeHours   Float    // Überstunden
    nightHours      Float    // Nachtstunden
    holidayHours    Float    // Feiertagsstunden
    hourlyRate      Decimal  // Stundenlohn in der jeweiligen Währung (CHF oder COP)
    grossPay        Decimal  // Bruttolohn
    socialSecurity  Decimal  // Sozialversicherungsbeiträge
    taxes           Decimal  // Steuern
    netPay          Decimal  // Nettolohn
    createdAt       DateTime @default(now())
    updatedAt       DateTime @updatedAt
  }



Cursor-Anweisung: „Aktualisiere backend/prisma/schema.prisma, um das User-Modell mit payrollCountry, hourlyRate und payrolls sowie das neue EmployeePayroll-Modell hinzuzufügen, und generiere die Migration sowie den Prisma Client.“



npx prisma migrate dev --name add_payroll_models
npx prisma generate



Cursor-Anweisung: „Führe npx prisma migrate dev --name add_payroll_models und npx prisma generate aus, um die Datenbank und den Prisma Client zu aktualisieren.“


### 2. Backend-API-Endpunkte erstellen (Node.js, Express, TypeScript)
Neue Datei erstellen: Erstelle backend/src/controllers/payrollController.ts mit folgenden Inhalten, die sowohl für Schweiz als auch Kolumbien funktionieren:

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const saveWorkHours = async (req: Request, res: Response) => {
  const { userId, hours } = req.body; // hours: { regular, overtime, night, holiday }
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) return res.status(404).json({ error: 'User not found' });

  const payroll = await prisma.employeePayroll.create({
    data: {
      userId,
      periodStart: new Date(),
      periodEnd: getPayrollEndDate(user.payrollCountry),
      regularHours: hours.regular || 0,
      overtimeHours: hours.overtime || 0,
      nightHours: hours.night || 0,
      holidayHours: hours.holiday || 0,
      hourlyRate: user.hourlyRate || (user.payrollCountry === 'CH' ? 50 : 50000), // Standard-Stundensatz (CHF für CH, COP für CO)
    },
  });
  res.json(payroll);
};

export const calculatePayroll = async (req: Request, res: Response) => {
  const { userId, periodStart, periodEnd } = req.query;
  const user = await prisma.user.findUnique({ where: { id: Number(userId) } });

  if (!user) return res.status(404).json({ error: 'User not found' });

  const payroll = await prisma.employeePayroll.findFirst({
    where: { userId: Number(userId), periodStart: new Date(periodStart as string), periodEnd: new Date(periodEnd as string) },
  });

  if (!payroll) return res.status(404).json({ error: 'Payroll not found' });

  const grossPay = calculateGrossPay(payroll, user.payrollCountry);
  const deductions = calculateDeductions(grossPay, user.payrollCountry);
  const netPay = grossPay - deductions;

  const payrollData = { ...payroll, grossPay, deductions, netPay };
  await prisma.employeePayroll.update({ where: { id: payroll.id }, data: payrollData });

  res.json(payrollData);
};

export const generatePayrollPDF = async (req: Request, res: Response) => {
  const { userId, periodStart, periodEnd } = req.query;
  const payroll = await prisma.employeePayroll.findFirst({
    where: { userId: Number(userId), periodStart: new Date(periodStart as string), periodEnd: new Date(periodEnd as string) },
    include: { user: true },
  });

  if (!payroll) return res.status(404).json({ error: 'Payroll not found' });

  const PDFKit = require('pdfkit');
  const fs = require('fs');
  const doc = new PDFKit();
  const filePath = `/tmp/payroll_${userId}_${Date.now()}.pdf`;
  doc.pipe(fs.createWriteStream(filePath));
  doc.fontSize(12).text(`Lohnabrechnung - Mitarbeiter ID: ${payroll.userId}`, { align: 'center' });
  doc.text(`Name: ${payroll.user.firstName} ${payroll.user.lastName}`);
  doc.text(`Zeitraum: ${payroll.periodStart} bis ${payroll.periodEnd}`);
  doc.text(`Reguläre Stunden: ${payroll.regularHours}`);
  doc.text(`Überstunden: ${payroll.overtimeHours}`);
  doc.text(`Nachtstunden: ${payroll.nightHours}`);
  doc.text(`Feiertagsstunden: ${payroll.holidayHours}`);
  doc.text(`Stundensatz: ${payroll.hourlyRate} ${payroll.user.payrollCountry === 'CH' ? 'CHF' : 'COP'}`);
  doc.text(`Bruttolohn: ${payroll.grossPay} ${payroll.user.payrollCountry === 'CH' ? 'CHF' : 'COP'}`);
  doc.text(`Abzüge: ${payroll.deductions} ${payroll.user.payrollCountry === 'CH' ? 'CHF' : 'COP'}`);
  doc.text(`Nettolohn: ${payroll.netPay} ${payroll.user.payrollCountry === 'CH' ? 'CHF' : 'COP'}`);
  doc.end();

  res.download(filePath, `payroll_${userId}.pdf`, () => {
    fs.unlinkSync(filePath); // Datei nach Download löschen
  });
};

function getPayrollEndDate(payrollCountry: string): Date {
  if (payrollCountry === 'CH') {
    // Schweiz: Monatlich am 25. des Monats
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 25);
  } else {
    // Kolumbien: Zweimal monatlich (15. und letzter Tag des Monats)
    const now = new Date();
    if (now.getDate() <= 15) {
      return new Date(now.getFullYear(), now.getMonth(), 15);
    } else {
      return new Date(now.getFullYear(), now.getMonth() + 1, 0); // Letzter Tag des Monats
    }
  }
}

function calculateGrossPay(payroll: any, payrollCountry: string) {
  const regularPay = payroll.regularHours * payroll.hourlyRate;
  let overtimePay = 0, nightPay = 0, holidayPay = 0;

  if (payrollCountry === 'CH') {
    // Schweiz: 125% Überstunden, 125% Nachtstunden, 200% Feiertage (vereinfacht, kantonabhängig)
    overtimePay = payroll.overtimeHours * (payroll.hourlyRate * 1.25);
    nightPay = payroll.nightHours * (payroll.hourlyRate * 1.25);
    holidayPay = payroll.holidayHours * (payroll.hourlyRate * 2.0);
  } else {
    // Kolumbien: 125% Überstunden, 175% Nachtstunden, 200% Feiertage
    overtimePay = payroll.overtimeHours * (payroll.hourlyRate * 1.25);
    nightPay = payroll.nightHours * (payroll.hourlyRate * 1.75);
    holidayPay = payroll.holidayHours * (payroll.hourlyRate * 2.0);
  }

  return regularPay + overtimePay + nightPay + holidayPay;
}

function calculateDeductions(grossPay: number, payrollCountry: string) {
  if (payrollCountry === 'CH') {
    // Schweiz: 10.6% Sozialversicherung (5.3% AHV/IV/EO Arbeitnehmer, 2.2% ALV gesamt), 15% Quellensteuer (vereinfacht, kantonabhängig)
    const socialSecurity = grossPay * 0.106;
    const taxes = grossPay * 0.15;
    return socialSecurity + taxes;
  } else {
    // Kolumbien: 16% Sozialversicherung (Renten-, Kranken-, Arbeitslosenversicherung), 10% Einkommensteuer (vereinfacht)
    const socialSecurity = grossPay * 0.16;
    const taxes = grossPay * 0.1;
    return socialSecurity + taxes;
  }
}

Cursor-Anweisung: „Erstelle backend/src/controllers/payrollController.ts mit diesem Code und integriere es in das bestehende Backend.“

Routen hinzufügen: Bearbeite backend/src/routes/payrollRoutes.ts (siehe vorherige Dokumentation, Code bleibt ähnlich, nur mit der neuen Controller-Logik).

App.ts/Index.ts anpassen: Füge die neue Route in backend/src/app.ts oder backend/src/index.ts hinzu (siehe vorherige Dokumentation).

Cursor-Anweisung: „Aktualisiere backend/src/app.ts oder backend/src/index.ts, um die payrollRoutes zu integrieren.“

3. Frontend-Komponente und User-Management erweitern (React, TypeScript)
Neue Datei erstellen: Erstelle frontend/src/components/Payroll.tsx (siehe vorherige Dokumentation, Code bleibt ähnlich, nur mit Land-Logik).

User-Management erweitern: Bearbeite frontend/src/components/UserManagementTab.tsx, um die Abrechnungsart (Schweiz oder Kolumbien) einstellbar zu machen (siehe vorherige Dokumentation, Code bleibt gleich, nur mit den aktualisierten Feldern).

Cursor-Anweisung: „Erstelle oder aktualisiere frontend/src/components/UserManagementTab.tsx mit diesem Code und passe die bestehenden Routen an, um die Komponente unter /usermanagement zu integrieren.“

Backend-Endpunkt hinzufügen: Erweitere backend/src/controllers/userController.ts, um die payrollCountry und hourlyRate zu aktualisieren (siehe vorherige Dokumentation, Code bleibt ähnlich).

Cursor-Anweisung: „Aktualisiere backend/src/controllers/userController.ts, um den updateUserProfile-Endpunkt mit payrollCountry und hourlyRate zu integrieren, und passe backend/src/routes/userRoutes.ts entsprechend an.“


### 4. Abhängigkeiten hinzufügen
PDFKit im Backend:

cd backend
npm install pdfkit

Cursor-Anweisung: „Füge pdfkit im backend/package.json Abhängigkeiten hinzu und installiere sie mit npm install.“


### 5. Testen und Bereitstellen
Lokales Testen:

Macht der USER!!!!! NICHT SELBER MACHEN, NACHFRAGEN UND BESTäTIGEN LASSEN!!!!!!!!!
cd backend
npm run dev
cd ../frontend
npm run dev

Besuche http://localhost:3000/payroll und http://localhost:3000/usermanagement, um die Lohnabrechnung und Benutzerverwaltung zu testen.

Produktionsbereitstellung: Folge DEPLOYMENT.md (oder erstelle es, siehe meine vorherigen Vorschläge), um das Backend und Frontend in Produktion zu bringen, z. B. mit pm2 und Nginx.


### 6. Rechtliche Anpassungen
Schweiz: Passe die Berechnungslogik in calculateGrossPay und calculateDeductions an, um genaue schweizerische Regelungen zu berücksichtigen (z. B. AHV/IV/EO: 5.3% Arbeitnehmeranteil, ALV: 1.1%, Quellensteuer abhängig vom Kanton und Einkommen). Konsultiere einen Steuerberater oder Rechtsberater, um die Berechnungen zu validieren, da die Steuersätze kantonabhängig variieren und komplex sind.

Kolumbien: Passe die Berechnungslogik an, um genaue kolumbianische Regelungen zu berücksichtigen (z. B. 16% Sozialversicherung, 10% Einkommensteuer, basierend auf TVU). Konsultiere einen Steuerberater oder Rechtsberater, um die Berechnungen zu validieren.

Cursor-Anweisung: „Passe die Funktionen calculateGrossPay und calculateDeductions in backend/src/controllers/payrollController.ts an, um schweizerische und kolumbianische Lohnregelungen zu berücksichtigen (z. B. Schweiz: 5.3% AHV/IV/EO, 1.1% ALV; Kolumbien: 16% Sozialversicherung, 10% Steuer).“


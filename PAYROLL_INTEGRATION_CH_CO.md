# Vollständige Dokumentation: Integration einer Lohnabrechnungsfunktion für Schweiz und Kolumbien in das Intranet

## Überblick
Dieses Dokument enthält alle Schritte, um eine Lohnabrechnungsfunktion in das bestehende Intranet-Projekt (`https://github.com/freshprince84/intranet`) zu integrieren, die Arbeitsstunden eines Mitarbeiters abzurechnet, eine Mitarbeiterabrechnung im Frontend anzeigt, ein PDF generiert und eine Zahlungsanweisung für die Buchhalterin erstellt. Die Funktion unterstützt:
- **Schweiz**: Monatliche Abrechnung am 25. des Monats.
- **Kolumbien**: Zweimal monatliche Abrechnung am 15. und am letzten Tag des Monats, mit unterschiedlichen Vertragsarten:
  - `tiempo completo`: >21 Tage/Monat
  - `tiempo parcial`: ≤7 Tage/Monat, ≤14 Tage/Monat, ≤21 Tage/Monat
  - `servicios externos`: Nach Stunden

Die Abrechnungsart pro Benutzer (Schweiz oder Kolumbien) und die Vertragsart für Kolumbien sind einstellbar über die `UserManagement`-Page in der `UserManagementTab`-Komponente, wo Benutzer bereits auswählbar sind, um ihre Stammdaten zu bearbeiten. Für Kolumbien wird der Monatslohn bei `tiempo parcial` linear heruntergerechnet, und die Lohnabrechnung berücksichtigt reguläre Stunden, Nachtstunden, Sonntags-/Feiertagsstunden, Überstunden (inkl. Nacht-, Sonntags- und Feiertagsüberstunden). Die Integration nutzt die bestehenden Technologien (Node.js, Express, TypeScript, Prisma, PostgreSQL, React, Tailwind CSS). Cursor kann diese Datei schrittweise durchgehen, Fortschritte mit Checkboxes markieren und sicherstellen, dass alles funktioniert.

## Voraussetzungen
- [ ] Das Repository `intranet` ist geklont, und alle Abhängigkeiten (Node.js v18+, npm, PostgreSQL v16+, Prisma) sind installiert und konfiguriert.
- [ ] Cursor ist installiert und mit dem GitHub-Repository verknüpft.
- [ ] Grundlegendes Verständnis von TypeScript, Node.js, React, Prisma und Arbeitsrecht der Schweiz/Kolumbien (für Lohnberechnungen).
- [ ] Zugriff auf eine laufende PostgreSQL-Datenbank mit der `DATABASE_URL` in `backend/.env`.

## Technische Details
### Bestehende Technologien
- **Backend**: Node.js (Express), TypeScript, Prisma ORM, PostgreSQL
- **Frontend**: React, TypeScript, Tailwind CSS
- **Authentifizierung**: JWT
- **Datenbank**: PostgreSQL für Benutzer, Arbeitszeiten, Tasks und Requests

### Neue Funktionalität
- **Arbeitsstunden erfassen**: Speichere die Arbeitsstunden (regulär, Nachtstunden, Sonntags-/Feiertagsstunden, Überstunden, Nacht-/Sonntags-/Feiertagsüberstunden) für einen Abrechnungszeitraum.
- **Lohnberechnung**: Berechne Bruttolohn, Abzüge, Zuschläge und Nettolohn basierend auf den Vorschriften der Schweiz oder Kolumbien, mit Berücksichtigung der Vertragsarten für Kolumbien.
- **Ausgabe**:
  - Mitarbeiterabrechnung im Frontend.
  - PDF-Generierung für die Lohnabrechnung.
  - Zahlungsanweisung für die Buchhalterin im Frontend.
- **Benutzereinstellung**: In `UserManagementTab` ist die Abrechnungsart (Schweiz oder Kolumbien) und für Kolumbien die Vertragsart einstellbar.

## Schritte zur Integration

### 1. Datenbankmodell erweitern (Prisma)
- [ ] **Datei ändern**: Bearbeite `backend/prisma/schema.prisma`, um das `User`-Modell zu erweitern und ein Modell für Lohnabrechnungen hinzuzufügen. Hier ist die aktualisierte Version:

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
    contractType            String?                    // Für Kolumbien: "tiempo_completo", "tiempo_parcial_7", "tiempo_parcial_14", "tiempo_parcial_21", "servicios_externos"
    hourlyRate               Decimal?                  // Stundenlohn in der jeweiligen Währung (CHF für CH, COP für CO)
    monthlySalary            Float?                    // Monatliches Gehalt für tiempo completo/tiempo parcial
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
    sundayHolidayHours Float // Sonntags-/Feiertagsstunden
    overtimeNightHours Float // Überstunden in der Nacht
    overtimeSundayHolidayHours Float // Überstunden am Sonntag/Feiertag
    overtimeNightSundayHolidayHours Float // Überstunden in der Nacht am Sonntag/Feiertag
    hourlyRate      Decimal  // Stundenlohn in der jeweiligen Währung (CHF oder COP)
    grossPay        Decimal  // Bruttolohn
    socialSecurity  Decimal  // Sozialversicherungsbeiträge
    taxes           Decimal  // Steuern
    netPay          Decimal  // Nettolohn
    createdAt       DateTime @default(now())
    updatedAt       DateTime @updatedAt
  }


-Migration und Regeneration durchführen:
cd backend
npx prisma migrate dev --name add_payroll_models_colombia_contracts
npx prisma generate


-Teste, ob die Migration erfolgreich ist, indem du die Datenbankverbindung überprüfst:

psql -U postgres -d intranet -h localhost

Gib Postgres123! als Passwort ein, wenn gefragt.



# 2. Backend-API-Endpunkte erstellen (Node.js, Express, TypeScript)
Neue Datei erstellen: Erstelle backend/src/controllers/payrollController.ts mit folgendem Inhalt, das sowohl für Schweiz als auch Kolumbien (mit Vertragsarten) funktioniert:

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const saveWorkHours = async (req: Request, res: Response) => {
  const { userId, hours } = req.body; // hours: { regular, overtime, night, sundayHoliday, overtimeNight, overtimeSundayHoliday, overtimeNightSundayHoliday }
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) return res.status(404).json({ error: 'User not found' });

  const effectiveHourlyRate = calculateEffectiveHourlyRate(user);
  const payroll = await prisma.employeePayroll.create({
    data: {
      userId,
      periodStart: new Date(),
      periodEnd: getPayrollEndDate(user.payrollCountry),
      regularHours: hours.regular || 0,
      overtimeHours: hours.overtime || 0,
      nightHours: hours.night || 0,
      sundayHolidayHours: hours.sundayHoliday || 0,
      overtimeNightHours: hours.overtimeNight || 0,
      overtimeSundayHolidayHours: hours.overtimeSundayHoliday || 0,
      overtimeNightSundayHolidayHours: hours.overtimeNightSundayHoliday || 0,
      hourlyRate: effectiveHourlyRate,
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

  const grossPay = calculateGrossPay(payroll, user.payrollCountry, user.contractType);
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
  doc.text(`Sonntags-/Feiertagsstunden: ${payroll.sundayHolidayHours}`);
  doc.text(`Nachtüberstunden: ${payroll.overtimeNightHours}`);
  doc.text(`Sonntags-/Feiertagsüberstunden: ${payroll.overtimeSundayHolidayHours}`);
  doc.text(`Nacht-Sonntags-/Feiertagsüberstunden: ${payroll.overtimeNightSundayHolidayHours}`);
  doc.text(`Stundensatz: ${payroll.hourlyRate} ${payroll.user.payrollCountry === 'CH' ? 'CHF' : 'COP'}`);
  doc.text(`Bruttolohn: ${payroll.grossPay} ${payroll.user.payrollCountry === 'CH' ? 'CHF' : 'COP'}`);
  doc.text(`Abzüge: ${payroll.deductions} ${payroll.user.payrollCountry === 'CH' ? 'CHF' : 'COP'}`);
  doc.text(`Nettolohn: ${payroll.netPay} ${payroll.user.payrollCountry === 'CH' ? 'CHF' : 'COP'}`);
  doc.end();

  res.download(filePath, `payroll_${userId}.pdf`, () => {
    fs.unlinkSync(filePath); // Datei nach Download löschen
  });
};

function calculateEffectiveHourlyRate(user: any): number {
  if (user.payrollCountry === 'CH') {
    return user.hourlyRate || 50; // Standard-Stundensatz in CHF
  } else {
    if (!user.contractType || !user.monthlySalary) return user.hourlyRate || 50000; // Standard in COP für servicios externos
    // Linear heruntergerechnet für tiempo parcial
    const daysPerMonth = getDaysForContractType(user.contractType);
    const hoursPerDay = 8; // Standard-Arbeitsstunden pro Tag
    const totalHours = daysPerMonth * hoursPerDay;
    return user.monthlySalary / totalHours; // Stundenlohn = Monatslohn / Gesamtarbeitsstunden
  }
}

function getDaysForContractType(contractType: string): number {
  switch (contractType) {
    case 'tiempo_completo': return 22; // >21 Tage/Monat
    case 'tiempo_parcial_7': return 7; // ≤7 Tage/Monat
    case 'tiempo_parcial_14': return 14; // ≤14 Tage/Monat
    case 'tiempo_parcial_21': return 21; // ≤21 Tage/Monat
    case 'servicios_externos': return 0; // Stundenbasiert, kein fester Tag
    default: return 22; // Standard: tiempo completo
  }
}

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

function calculateGrossPay(payroll: any, payrollCountry: string, contractType: string | null) {
  const regularPay = payroll.regularHours * payroll.hourlyRate;
  let overtimePay = 0, nightPay = 0, sundayHolidayPay = 0, overtimeNightPay = 0, overtimeSundayHolidayPay = 0, overtimeNightSundayHolidayPay = 0;

  if (payrollCountry === 'CH') {
    // Schweiz: 125% Überstunden, 125% Nachtstunden, 200% Feiertage (vereinfacht, kantonabhängig)
    overtimePay = payroll.overtimeHours * (payroll.hourlyRate * 1.25);
    nightPay = payroll.nightHours * (payroll.hourlyRate * 1.25);
    sundayHolidayPay = payroll.sundayHolidayHours * (payroll.hourlyRate * 2.0);
  } else {
    // Kolumbien: 125% Überstunden, 175% Nachtstunden, 200% Sonntags-/Feiertagsstunden, jeweils mit Überstunden-Zuschlägen
    overtimePay = payroll.overtimeHours * (payroll.hourlyRate * 1.25);
    nightPay = payroll.nightHours * (payroll.hourlyRate * 1.75);
    sundayHolidayPay = payroll.sundayHolidayHours * (payroll.hourlyRate * 2.0);
    overtimeNightPay = payroll.overtimeNightHours * (payroll.hourlyRate * 2.1875); // 125% * 175% = 218.75%
    overtimeSundayHolidayPay = payroll.overtimeSundayHolidayHours * (payroll.hourlyRate * 2.5); // 125% * 200% = 250%
    overtimeNightSundayHolidayPay = payroll.overtimeNightSundayHolidayHours * (payroll.hourlyRate * 3.5); // 125% * 175% * 200% = 437.5%
  }

  return regularPay + overtimePay + nightPay + sundayHolidayPay + overtimeNightPay + overtimeSundayHolidayPay + overtimeNightSundayHolidayPay;
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

-Routen hinzufügen: Bearbeite backend/src/routes/payrollRoutes.ts und füge Folgendes hinzu (siehe vorherige Schritte, Code bleibt ähnlich, nur mit der neuen Controller-Logik).

-App.ts/Index.ts anpassen: Füge die neue Route in backend/src/app.ts oder backend/src/index.ts hinzu (siehe vorherige Schritte, Code bleibt ähnlich).

-User-Management-Endpunkt erweitern: Bearbeite backend/src/controllers/userController.ts, um payrollCountry, contractType, hourlyRate und monthlySalary zu aktualisieren:

// In backend/src/controllers/userController.ts
export const updateUserProfile = async (req: Request, res: Response) => {
  const { userId, payrollCountry, contractType, hourlyRate, monthlySalary } = req.body;
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      payrollCountry: payrollCountry || 'CH',
      contractType: contractType || null, // "tiempo_completo", "tiempo_parcial_7", "tiempo_parcial_14", "tiempo_parcial_21", "servicios_externos"
      hourlyRate: hourlyRate || null,
      monthlySalary: monthlySalary || null,
    },
  });
  res.json(user);
};


Teste, ob die Backend-Endpunkte funktionieren, indem du sie mit curl oder Postman testest:

curl -X POST http://localhost:5000/api/payroll/hours -H "Content-Type: application/json" -d '{"userId": 1, "hours": {"regular": 40, "overtime": 5, "night": 0, "sundayHoliday": 0, "overtimeNight": 0, "overtimeSundayHoliday": 0, "overtimeNightSundayHoliday": 0}}'
curl -X GET http://localhost:5000/api/payroll/calculate?userId=1&periodStart=2025-02-01&periodEnd=2025-02-15


# 3. Frontend-Komponente und User-Management erweitern (React, TypeScript)
Neue Datei erstellen: Erstelle frontend/src/components/Payroll.tsx mit folgendem Inhalt:

import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Hours {
  regular: number;
  overtime: number;
  night: number;
  sundayHoliday: number;
  overtimeNight: number;
  overtimeSundayHoliday: number;
  overtimeNightSundayHoliday: number;
}

interface Payroll {
  id: number;
  userId: number;
  periodStart: string;
  periodEnd: string;
  regularHours: number;
  overtimeHours: number;
  nightHours: number;
  sundayHolidayHours: number;
  overtimeNightHours: number;
  overtimeSundayHolidayHours: number;
  overtimeNightSundayHolidayHours: number;
  hourlyRate: number;
  grossPay: number;
  deductions: number;
  netPay: number;
}

const Payroll: React.FC = () => {
  const [hours, setHours] = useState<Hours>({ regular: 0, overtime: 0, night: 0, sundayHoliday: 0, overtimeNight: 0, overtimeSundayHoliday: 0, overtimeNightSundayHoliday: 0 });
  const [payroll, setPayroll] = useState<Payroll | null>(null);
  const [userId] = useState(1); // Beispiel: Mitarbeiter-ID

  const saveHours = async () => {
    try {
      const response = await axios.post('http://localhost:5000/api/payroll/hours', {
        userId,
        hours,
      });
      setPayroll(response.data);
    } catch (error) {
      console.error('Fehler beim Speichern der Stunden:', error);
    }
  };

  const calculatePayroll = async () => {
    try {
      const user = await axios.get(`http://localhost:5000/api/users/profile?userId=${userId}`);
      const payrollCountry = user.data.payrollCountry;
      const periodEnd = getPayrollEndDate(payrollCountry);
      const response = await axios.get(`http://localhost:5000/api/payroll/calculate?userId=${userId}&periodStart=${new Date().toISOString().split('T')[0]}&periodEnd=${periodEnd.toISOString().split('T')[0]}`);
      setPayroll(response.data);
    } catch (error) {
      console.error('Fehler bei der Lohnberechnung:', error);
    }
  };

  const generatePDF = async () => {
    try {
      const user = await axios.get(`http://localhost:5000/api/users/profile?userId=${userId}`);
      const payrollCountry = user.data.payrollCountry;
      const periodEnd = getPayrollEndDate(payrollCountry);
      const response = await axios.get(`http://localhost:5000/api/payroll/pdf?userId=${userId}&periodStart=${new Date().toISOString().split('T')[0]}&periodEnd=${periodEnd.toISOString().split('T')[0]}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `payroll_${userId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Fehler beim Generieren des PDFs:', error);
    }
  };

  const sendPaymentInstruction = () => {
    if (payroll) {
      const currency = payroll.user.payrollCountry === 'CH' ? 'CHF' : 'COP';
      return (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h3 className="text-lg font-bold">Zahlungsanweisung für Buchhalterin</h3>
          <p>Mitarbeiter-ID: {payroll.userId}</p>
          <p>Nettolohn: {payroll.netPay} {currency}</p>
          <p>Bankkonto: [Hier Bankdetails des Mitarbeiters einfügen, z. B. aus DB]</p>
          <p>Zahlungsdatum: {new Date().toLocaleDateString()}</p>
        </div>
      );
    }
    return null;
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

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Lohnabrechnung</h2>
      <div className="grid grid-cols-2 gap-4">
        <input type="number" placeholder="Reguläre Stunden" value={hours.regular} onChange={(e) => setHours({ ...hours, regular: Number(e.target.value) })} className="border p-2 rounded" />
        <input type="number" placeholder="Überstunden" value={hours.overtime} onChange={(e) => setHours({ ...hours, overtime: Number(e.target.value) })} className="border p-2 rounded" />
        <input type="number" placeholder="Nachtstunden" value={hours.night} onChange={(e) => setHours({ ...hours, night: Number(e.target.value) })} className="border p-2 rounded" />
        <input type="number" placeholder="Sonntags-/Feiertagsstunden" value={hours.sundayHoliday} onChange={(e) => setHours({ ...hours, sundayHoliday: Number(e.target.value) })} className="border p-2 rounded" />
        <input type="number" placeholder="Nachtüberstunden" value={hours.overtimeNight} onChange={(e) => setHours({ ...hours, overtimeNight: Number(e.target.value) })} className="border p-2 rounded" />
        <input type="number" placeholder="Sonntags-/Feiertagsüberstunden" value={hours.overtimeSundayHoliday} onChange={(e) => setHours({ ...hours, overtimeSundayHoliday: Number(e.target.value) })} className="border p-2 rounded" />
        <input type="number" placeholder="Nacht-Sonntags-/Feiertagsüberstunden" value={hours.overtimeNightSundayHoliday} onChange={(e) => setHours({ ...hours, overtimeNightSundayHoliday: Number(e.target.value) })} className="border p-2 rounded" />
      </div>
      <div className="mt-4">
        <button onClick={saveHours} className="bg-blue-500 text-white p-2 rounded mr-2">Stunden speichern</button>
        <button onClick={calculatePayroll} className="bg-green-500 text-white p-2 rounded mr-2">Lohn berechnen</button>
        <button onClick={generatePDF} className="bg-yellow-500 text-white p-2 rounded">PDF generieren</button>
      </div>
      {payroll && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h3 className="text-lg font-bold">Abrechnung</h3>
          <p>Bruttolohn: {payroll.grossPay} {payroll.user.payrollCountry === 'CH' ? 'CHF' : 'COP'}</p>
          <p>Abzüge: {payroll.deductions} {payroll.user.payrollCountry === 'CH' ? 'CHF' : 'COP'}</p>
          <p>Nettolohn: {payroll.netPay} {payroll.user.payrollCountry === 'CH' ? 'CHF' : 'COP'}</p>
          {sendPaymentInstruction()}
        </div>
      )}
    </div>
  );
};

export default Payroll;



User-Management erweitern: Bearbeite frontend/src/components/UserManagementTab.tsx mit folgendem Inhalt:

import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  payrollCountry: string; // "CH" oder "CO"
  contractType: string | null; // "tiempo_completo", "tiempo_parcial_7", "tiempo_parcial_14", "tiempo_parcial_21", "servicios_externos"
  hourlyRate: number | null;
  monthlySalary: number | null;
}

const UserManagementTab: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [payrollCountry, setPayrollCountry] = useState<string>('CH'); // Standard: Schweiz
  const [contractType, setContractType] = useState<string | null>(null);
  const [hourlyRate, setHourlyRate] = useState<number | null>(null);
  const [monthlySalary, setMonthlySalary] = useState<number | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Fehler beim Laden der Benutzer:', error);
    }
  };

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setPayrollCountry(user.payrollCountry || 'CH');
    setContractType(user.contractType || null);
    setHourlyRate(user.hourlyRate || null);
    setMonthlySalary(user.monthlySalary || null);
  };

  const updatePayrollSettings = async () => {
    if (selectedUser) {
      try {
        await axios.put(`http://localhost:5000/api/users/profile`, {
          userId: selectedUser.id,
          payrollCountry,
          contractType,
          hourlyRate: hourlyRate || null,
          monthlySalary: monthlySalary || null,
        });
        fetchUsers(); // Aktualisiere die Benutzerliste
        alert('Einstellungen aktualisiert!');
      } catch (error) {
        console.error('Fehler beim Aktualisieren der Einstellungen:', error);
      }
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Benutzerverwaltung</h2>
      <select onChange={(e) => handleUserSelect(users.find(u => u.id === Number(e.target.value)) || null)} className="border p-2 rounded mb-4">
        <option value="">Benutzer auswählen</option>
        {users.map((user) => (
          <option key={user.id} value={user.id}>{user.firstName} {user.lastName} ({user.username})</option>
        ))}
      </select>
      {selectedUser && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h3 className="text-lg font-bold">Benutzerdetails</h3>
          <p>Name: {selectedUser.firstName} {selectedUser.lastName}</p>
          <p>Benutzername: {selectedUser.username}</p>
          <div className="mt-2">
            <label className="block mb-1">Abrechnungsland:</label>
            <select value={payrollCountry} onChange={(e) => setPayrollCountry(e.target.value)} className="border p-2 rounded">
              <option value="CH">Schweiz</option>
              <option value="CO">Kolumbien</option>
            </select>
          </div>
          {payrollCountry === 'CO' && (
            <div className="mt-2">
              <label className="block mb-1">Vertragsart:</label>
              <select value={contractType || ''} onChange={(e) => setContractType(e.target.value || null)} className="border p-2 rounded">
                <option value="">Keine Auswahl</option>
                <option value="tiempo_completo">Tiempo Completo (>21 Tage/Monat)</option>
                <option value="tiempo_parcial_7">Tiempo Parcial (≤7 Tage/Monat)</option>
                <option value="tiempo_parcial_14">Tiempo Parcial (≤14 Tage/Monat)</option>
                <option value="tiempo_parcial_21">Tiempo Parcial (≤21 Tage/Monat)</option>
                <option value="servicios_externos">Servicios Externos (Stundenbasiert)</option>
              </select>
            </div>
          )}
          <div className="mt-2">
            <label className="block mb-1">Stundensatz:</label>
            <input type="number" value={hourlyRate || ''} onChange={(e) => setHourlyRate(Number(e.target.value) || null)} className="border p-2 rounded" placeholder="Stundensatz eingeben (CHF oder COP)" />
          </div>
          {payrollCountry === 'CO' && contractType && contractType !== 'servicios_externos' && (
            <div className="mt-2">
              <label className="block mb-1">Monatliches Gehalt:</label>
              <input type="number" value={monthlySalary || ''} onChange={(e) => setMonthlySalary(Number(e.target.value) || null)} className="border p-2 rounded" placeholder="Monatliches Gehalt in COP" />
            </div>
          )}
          <button onClick={updatePayrollSettings} className="bg-blue-500 text-white p-2 rounded mt-4">Einstellungen speichern</button>
        </div>
      )}
    </div>
  );
};

export default UserManagementTab;


- Routing anpassen: Bearbeite frontend/src/Routes.js oder frontend/src/pages/Dashboard.tsx, um die neuen Komponenten zu integrieren (siehe vorherige Schritte, Code bleibt ähnlich).

- Teste die Frontend-Komponenten lokal, indem du npm run dev im frontend-Verzeichnis ausführst und die URLs http://localhost:3000/payroll und http://localhost:3000/usermanagement aufrufst.


# 4. Abhängigkeiten hinzufügen
PDFKit im Backend installieren:

cd backend
npm install pdfkit

Überprüfe, ob die Abhängigkeiten korrekt installiert sind, mit:
npm list --depth=0


# 5. Testen und Bereitstellen

- Lokales Testen:

cd backend
npm run dev
cd ../frontend
npm run dev

- Besuche http://localhost:3000/payroll und http://localhost:3000/usermanagement, um die Lohnabrechnung und Benutzerverwaltung zu testen. Stelle sicher, dass:
Arbeitsstunden gespeichert und berechnet werden (inkl. aller Stundenarten für Kolumbien).

PDFs korrekt generiert und heruntergeladen werden.

Die Abrechnungsart und Vertragsart pro Benutzer korrekt eingestellt und angewendet werden.

- Produktionsbereitstellung:
Erstelle oder aktualisiere DEPLOYMENT.md, um das Backend und Frontend mit pm2 und Nginx in Produktion zu bringen (siehe vorherige Schritte, Code bleibt ähnlich).


# 6. Rechtliche Anpassungen
Schweiz:
Lohnabrechnung monatlich am 25. des Monats.

Arbeitszeiten: Maximal 50 Stunden/Woche (inkl. Überstunden), 45 Stunden/Woche für >5 Tage/Woche, 8 Stunden/Tag (max. 9 Stunden mit Pausen).

Überstunden: 125% Zuschlag, Nachtstunden (22:00–06:00) und Sonntagsarbeit kantonabhängig (meist 125–150%), Feiertage 200%.

Sozialversicherungen: AHV/IV/EO (5.3% Arbeitnehmer), ALV (1.1% Arbeitnehmer), BVG (berufl. Vorsorge, Arbeitgeberanteil meist höher, kann variieren).

Steuern: Quellensteuer, kantonabhängig (z. B. Zürich: 10–20%, je nach Einkommen).

Passe die Berechnungslogik in calculateGrossPay und calculateDeductions an, um genaue schweizerische Regelungen zu berücksichtigen. Konsultiere einen Steuerberater oder Rechtsberater, um die Berechnungen zu validieren.

Kolumbien:
Lohnabrechnung zweimal monatlich (15. und letzter Tag des Monats).

Arbeitszeiten: 48 Stunden/Woche (8 Stunden/Tag, 6 Tage), Überstunden 125%, Nachtstunden (22:00–06:00) 175%, Sonntags-/Feiertagsstunden 200%, mit entsprechenden Zuschlägen für Überstunden (siehe calculateGrossPay).

Vertragsarten:
tiempo completo: >21 Tage/Monat, fester Monatslohn.

tiempo parcial: ≤7, ≤14, ≤21 Tage/Monat, Monatslohn linear heruntergerechnet.

servicios externos: Stundenbasiert, Stundenlohn direkt angewendet.

Sozialversicherungen: 16% (Renten-, Kranken-, Arbeitslosenversicherung), Arbeitgeber und Arbeitnehmer teilen sich die Kosten.

Steuern: 10% Einkommensteuer (vereinfacht, basierend auf TVU und Einkommen).

Passe die Berechnungslogik an, um genaue kolumbianische Regelungen zu berücksichtigen. Konsultiere einen Steuerberater oder Rechtsberater, um die Berechnungen zu validieren.

Fehlerbehebung
Datenbankfehler: Stelle sicher, dass PostgreSQL läuft und die DATABASE_URL korrekt ist (z. B. postgresql://postgres:Postgres123!@localhost:5432/intranet?schema=public in backend/.env).

API-Fehler: Überprüfe die JWT-Authentifizierung und die API-Endpunkte mit Postman oder cURL.

Frontend-Fehler: Stelle sicher, dass axios korrekt konfiguriert ist und die API-URL (z. B. http://localhost:5000/api) passt.



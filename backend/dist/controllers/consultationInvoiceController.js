"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelInvoice = exports.markAsPaid = exports.generateInvoicePDFEndpoint = exports.updateInvoiceStatus = exports.getInvoiceById = exports.getInvoices = exports.createInvoiceFromConsultations = void 0;
const client_1 = require("@prisma/client");
const invoicePdfGenerator_1 = require("../services/invoicePdfGenerator");
const organization_1 = require("../middleware/organization");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const prisma = new client_1.PrismaClient();
// Rechnung aus gefilterten Beratungen erstellen
const createInvoiceFromConsultations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { consultationIds, clientId, issueDate, dueDate, hourlyRate, vatRate, notes } = req.body;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        // Validierung
        if (!consultationIds || consultationIds.length === 0) {
            return res.status(400).json({ message: 'Keine Beratungen ausgewählt' });
        }
        if (!clientId || !hourlyRate) {
            return res.status(400).json({ message: 'Client und Stundensatz sind erforderlich' });
        }
        // Prüfe, ob alle Beratungen dem User gehören und abgeschlossen sind
        const consultations = yield prisma.workTime.findMany({
            where: {
                id: { in: consultationIds.map((id) => Number(id)) },
                userId: Number(userId),
                clientId: Number(clientId),
                endTime: { not: null }
            },
            include: {
                client: true,
                branch: true,
                invoiceItems: true
            }
        });
        if (consultations.length !== consultationIds.length) {
            return res.status(400).json({ message: 'Einige Beratungen sind ungültig oder nicht abgeschlossen' });
        }
        // Prüfe auf bereits abgerechnete Beratungen
        const alreadyInvoiced = consultations.filter(c => c.invoiceItems.length > 0);
        if (alreadyInvoiced.length > 0) {
            return res.status(400).json({
                message: `Einige Beratungen wurden bereits abgerechnet: ${alreadyInvoiced.map(c => { var _a; return `${new Date(c.startTime).toLocaleDateString()} - ${(_a = c.client) === null || _a === void 0 ? void 0 : _a.name}`; }).join(', ')}`
            });
        }
        // Hole Invoice Settings für Rechnungsnummer
        let invoiceSettings = yield prisma.invoiceSettings.findUnique({
            where: { userId: Number(userId) }
        });
        if (!invoiceSettings) {
            // Erstelle Default-Settings wenn noch keine vorhanden
            invoiceSettings = yield prisma.invoiceSettings.create({
                data: {
                    userId: Number(userId),
                    companyName: 'Meine Firma',
                    companyAddress: 'Musterstraße 1',
                    companyZip: '8000',
                    companyCity: 'Zürich',
                    companyCountry: 'CH',
                    iban: 'CH0000000000000000000',
                    defaultHourlyRate: 120.00,
                    defaultVatRate: 7.7,
                    invoicePrefix: 'INV',
                    nextInvoiceNumber: 1
                }
            });
        }
        // Generiere Rechnungsnummer
        const nextNumber = invoiceSettings.nextInvoiceNumber;
        const invoiceNumber = `${invoiceSettings.invoicePrefix}${nextNumber.toString().padStart(4, '0')}`;
        // Berechne Totale
        let subtotal = 0;
        const invoiceItems = consultations.map(consultation => {
            const startTime = new Date(consultation.startTime);
            const endTime = new Date(consultation.endTime);
            const durationMs = endTime.getTime() - startTime.getTime();
            const hours = Math.round((durationMs / (1000 * 60 * 60)) * 100) / 100; // Runde auf 2 Dezimalstellen
            const amount = hours * parseFloat(hourlyRate);
            subtotal += amount;
            return {
                workTimeId: consultation.id,
                description: `Beratung vom ${startTime.toLocaleDateString('de-CH')} (${startTime.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })})`,
                quantity: hours,
                unitPrice: parseFloat(hourlyRate),
                amount
            };
        });
        const vatAmount = vatRate ? (subtotal * parseFloat(vatRate)) / 100 : 0;
        const total = subtotal + vatAmount;
        // Erstelle QR-Referenz (vereinfacht)
        const qrReference = `${invoiceNumber}${Date.now()}`.replace(/[^0-9]/g, '').substring(0, 27);
        // Erstelle Rechnung in Transaktion
        const invoice = yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Erstelle Rechnung
            const newInvoice = yield tx.consultationInvoice.create({
                data: {
                    invoiceNumber,
                    clientId: Number(clientId),
                    userId: Number(userId),
                    issueDate: new Date(issueDate || Date.now()),
                    dueDate: new Date(dueDate || Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 Tage Standard
                    subtotal,
                    vatRate: vatRate ? parseFloat(vatRate) : null,
                    vatAmount: vatAmount || null,
                    total,
                    qrReference,
                    notes: notes || null,
                    organizationId: req.organizationId || null
                },
                include: {
                    client: true,
                    user: true
                }
            });
            // Erstelle Invoice Items
            yield tx.consultationInvoiceItem.createMany({
                data: invoiceItems.map(item => (Object.assign({ invoiceId: newInvoice.id }, item)))
            });
            // Inkrementiere Rechnungsnummer
            yield tx.invoiceSettings.update({
                where: { userId: Number(userId) },
                data: { nextInvoiceNumber: nextNumber + 1 }
            });
            return newInvoice;
        }));
        // Lade vollständige Rechnung mit Items
        const fullInvoice = yield prisma.consultationInvoice.findUnique({
            where: { id: invoice.id },
            include: {
                client: true,
                user: true,
                items: {
                    include: {
                        workTime: {
                            include: {
                                branch: true
                            }
                        }
                    }
                }
            }
        });
        res.status(201).json(fullInvoice);
    }
    catch (error) {
        console.error('Fehler beim Erstellen der Rechnung:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.createInvoiceFromConsultations = createInvoiceFromConsultations;
// Alle Rechnungen abrufen
const getInvoices = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { status, clientId, from, to } = req.query;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        // NEU: Verwende getDataIsolationFilter für organisations-spezifische Filterung
        const invoiceFilter = (0, organization_1.getDataIsolationFilter)(req, 'invoice');
        let whereClause = Object.assign({}, invoiceFilter);
        if (status) {
            whereClause.status = status;
        }
        if (clientId) {
            whereClause.clientId = Number(clientId);
        }
        if (from || to) {
            whereClause.issueDate = {};
            if (from)
                whereClause.issueDate.gte = new Date(from);
            if (to)
                whereClause.issueDate.lte = new Date(to);
        }
        const invoices = yield prisma.consultationInvoice.findMany({
            where: whereClause,
            include: {
                client: true,
                user: true,
                items: true,
                payments: true
            },
            orderBy: {
                issueDate: 'desc'
            }
        });
        res.json(invoices);
    }
    catch (error) {
        console.error('Fehler beim Abrufen der Rechnungen:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.getInvoices = getInvoices;
// Einzelne Rechnung abrufen
const getInvoiceById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        const invoice = yield prisma.consultationInvoice.findFirst({
            where: {
                id: Number(id),
                userId: Number(userId)
            },
            include: {
                client: true,
                user: true,
                items: {
                    include: {
                        workTime: {
                            include: {
                                branch: true
                            }
                        }
                    }
                },
                payments: true
            }
        });
        if (!invoice) {
            return res.status(404).json({ message: 'Rechnung nicht gefunden' });
        }
        res.json(invoice);
    }
    catch (error) {
        console.error('Fehler beim Abrufen der Rechnung:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.getInvoiceById = getInvoiceById;
// Rechnungsstatus aktualisieren
const updateInvoiceStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        if (!['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'].includes(status)) {
            return res.status(400).json({ message: 'Ungültiger Status' });
        }
        const invoice = yield prisma.consultationInvoice.update({
            where: {
                id: Number(id),
                userId: Number(userId)
            },
            data: { status },
            include: {
                client: true,
                user: true
            }
        });
        res.json(invoice);
    }
    catch (error) {
        console.error('Fehler beim Aktualisieren des Status:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.updateInvoiceStatus = updateInvoiceStatus;
// PDF generieren
const generateInvoicePDFEndpoint = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        // Lade vollständige Rechnung
        const invoice = yield prisma.consultationInvoice.findFirst({
            where: {
                id: Number(id),
                userId: Number(userId)
            },
            include: {
                client: true,
                user: true,
                items: {
                    include: {
                        workTime: {
                            include: {
                                branch: true
                            }
                        }
                    }
                }
            }
        });
        if (!invoice) {
            return res.status(404).json({ message: 'Rechnung nicht gefunden' });
        }
        // Lade Invoice Settings
        const settings = yield prisma.invoiceSettings.findUnique({
            where: { userId: Number(userId) }
        });
        if (!settings) {
            return res.status(400).json({ message: 'Invoice Settings nicht konfiguriert' });
        }
        // Generiere PDF
        const pdfBuffer = yield (0, invoicePdfGenerator_1.generateInvoicePDF)(invoice, settings);
        // Speichere PDF-Pfad
        const pdfFileName = `invoice_${invoice.invoiceNumber}.pdf`;
        const pdfPath = path_1.default.join('uploads', 'invoices', pdfFileName);
        const fullPdfPath = path_1.default.join(process.cwd(), 'public', pdfPath);
        // Erstelle Verzeichnis falls nicht vorhanden
        const pdfDir = path_1.default.dirname(fullPdfPath);
        if (!fs_1.default.existsSync(pdfDir)) {
            fs_1.default.mkdirSync(pdfDir, { recursive: true });
        }
        // Speichere PDF
        fs_1.default.writeFileSync(fullPdfPath, pdfBuffer);
        // Aktualisiere PDF-Pfad in Datenbank
        yield prisma.consultationInvoice.update({
            where: { id: Number(id) },
            data: { pdfPath }
        });
        // Sende PDF als Download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${pdfFileName}"`);
        res.send(pdfBuffer);
    }
    catch (error) {
        console.error('Fehler beim Generieren des PDFs:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.generateInvoicePDFEndpoint = generateInvoicePDFEndpoint;
// Zahlung erfassen
const markAsPaid = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { amount, paymentDate, paymentMethod, reference, notes } = req.body;
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        if (!amount || !paymentMethod) {
            return res.status(400).json({ message: 'Betrag und Zahlungsmethode sind erforderlich' });
        }
        // Prüfe ob Rechnung existiert
        const invoice = yield prisma.consultationInvoice.findFirst({
            where: {
                id: Number(id),
                userId: Number(userId)
            },
            include: {
                payments: true
            }
        });
        if (!invoice) {
            return res.status(404).json({ message: 'Rechnung nicht gefunden' });
        }
        // Berechne bereits bezahlten Betrag
        const paidAmount = invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
        const newTotalPaid = paidAmount + parseFloat(amount);
        yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Erfasse Zahlung
            yield tx.invoicePayment.create({
                data: {
                    invoiceId: Number(id),
                    amount: parseFloat(amount),
                    paymentDate: new Date(paymentDate || Date.now()),
                    paymentMethod,
                    reference,
                    notes
                }
            });
            // Aktualisiere Status falls vollständig bezahlt
            const newStatus = newTotalPaid >= Number(invoice.total) ? 'PAID' : 'SENT';
            yield tx.consultationInvoice.update({
                where: { id: Number(id) },
                data: { status: newStatus }
            });
        }));
        // Lade aktualisierte Rechnung
        const updatedInvoice = yield prisma.consultationInvoice.findUnique({
            where: { id: Number(id) },
            include: {
                client: true,
                payments: true
            }
        });
        res.json(updatedInvoice);
    }
    catch (error) {
        console.error('Fehler beim Erfassen der Zahlung:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.markAsPaid = markAsPaid;
// Rechnung stornieren
const cancelInvoice = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        const invoice = yield prisma.consultationInvoice.findFirst({
            where: {
                id: Number(id),
                userId: Number(userId)
            },
            include: {
                payments: true
            }
        });
        if (!invoice) {
            return res.status(404).json({ message: 'Rechnung nicht gefunden' });
        }
        if (invoice.payments.length > 0) {
            return res.status(400).json({ message: 'Rechnung kann nicht storniert werden - bereits Zahlungen erhalten' });
        }
        const cancelledInvoice = yield prisma.consultationInvoice.update({
            where: { id: Number(id) },
            data: { status: 'CANCELLED' },
            include: {
                client: true
            }
        });
        res.json(cancelledInvoice);
    }
    catch (error) {
        console.error('Fehler beim Stornieren der Rechnung:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.cancelInvoice = cancelInvoice;
//# sourceMappingURL=consultationInvoiceController.js.map
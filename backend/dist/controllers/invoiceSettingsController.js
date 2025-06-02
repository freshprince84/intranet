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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNextInvoiceNumber = exports.createOrUpdateInvoiceSettings = exports.getInvoiceSettings = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Invoice Settings abrufen
const getInvoiceSettings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        const settings = yield prisma.invoiceSettings.findUnique({
            where: { userId: Number(userId) }
        });
        if (!settings) {
            // Erstelle Default-Settings wenn noch keine vorhanden
            const defaultSettings = yield prisma.invoiceSettings.create({
                data: {
                    userId: Number(userId),
                    companyName: '',
                    companyAddress: '',
                    companyZip: '',
                    companyCity: '',
                    companyCountry: 'CH',
                    iban: '',
                    defaultHourlyRate: 120.00,
                    defaultVatRate: 7.7,
                    invoicePrefix: 'INV',
                    nextInvoiceNumber: 1
                }
            });
            return res.json(defaultSettings);
        }
        res.json(settings);
    }
    catch (error) {
        console.error('Fehler beim Abrufen der Invoice Settings:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.getInvoiceSettings = getInvoiceSettings;
// Invoice Settings erstellen oder aktualisieren
const createOrUpdateInvoiceSettings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { companyName, companyAddress, companyZip, companyCity, companyCountry, companyPhone, companyEmail, companyWebsite, vatNumber, iban, bankName, defaultHourlyRate, defaultVatRate, invoicePrefix, footerText } = req.body;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        // Validierung der Pflichtfelder
        if (!companyName || !companyAddress || !companyZip || !companyCity || !iban) {
            return res.status(400).json({ message: 'Firmenname, Adresse, PLZ, Stadt und IBAN sind Pflichtfelder' });
        }
        // IBAN-Validierung (grob)
        if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}$/.test(iban.replace(/\s/g, ''))) {
            return res.status(400).json({ message: 'Ungültige IBAN' });
        }
        const settings = yield prisma.invoiceSettings.upsert({
            where: { userId: Number(userId) },
            update: {
                companyName,
                companyAddress,
                companyZip,
                companyCity,
                companyCountry: companyCountry || 'CH',
                companyPhone,
                companyEmail,
                companyWebsite,
                vatNumber,
                iban: iban.replace(/\s/g, ''), // Leerzeichen entfernen
                bankName,
                defaultHourlyRate: parseFloat(defaultHourlyRate),
                defaultVatRate: defaultVatRate ? parseFloat(defaultVatRate) : null,
                invoicePrefix: invoicePrefix || 'INV',
                footerText
            },
            create: {
                userId: Number(userId),
                companyName,
                companyAddress,
                companyZip,
                companyCity,
                companyCountry: companyCountry || 'CH',
                companyPhone,
                companyEmail,
                companyWebsite,
                vatNumber,
                iban: iban.replace(/\s/g, ''),
                bankName,
                defaultHourlyRate: parseFloat(defaultHourlyRate),
                defaultVatRate: defaultVatRate ? parseFloat(defaultVatRate) : null,
                invoicePrefix: invoicePrefix || 'INV',
                nextInvoiceNumber: 1,
                footerText
            }
        });
        res.json(settings);
    }
    catch (error) {
        console.error('Fehler beim Speichern der Invoice Settings:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.createOrUpdateInvoiceSettings = createOrUpdateInvoiceSettings;
// Nächste Rechnungsnummer abrufen und inkrementieren
const getNextInvoiceNumber = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        const settings = yield prisma.invoiceSettings.findUnique({
            where: { userId: Number(userId) }
        });
        if (!settings) {
            return res.status(404).json({ message: 'Invoice Settings nicht gefunden' });
        }
        const nextNumber = settings.nextInvoiceNumber;
        const invoiceNumber = `${settings.invoicePrefix}${nextNumber.toString().padStart(4, '0')}`;
        // Inkrementiere die nächste Nummer
        yield prisma.invoiceSettings.update({
            where: { userId: Number(userId) },
            data: { nextInvoiceNumber: nextNumber + 1 }
        });
        res.json({ invoiceNumber, nextNumber });
    }
    catch (error) {
        console.error('Fehler beim Generieren der Rechnungsnummer:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.getNextInvoiceNumber = getNextInvoiceNumber;
//# sourceMappingURL=invoiceSettingsController.js.map
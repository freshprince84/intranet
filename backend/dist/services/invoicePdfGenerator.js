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
exports.generateInvoicePDF = generateInvoicePDF;
const pdfkit_1 = __importDefault(require("pdfkit"));
const qrcode_1 = __importDefault(require("qrcode"));
// Schweizer QR-Code Datenstruktur
function generateSwissQRCodeData(invoice, settings) {
    const data = [
        // Header
        'SPC', // QRType
        '0200', // Version
        '1', // Coding (UTF-8)
        // Creditor Information
        settings.iban.replace(/\s/g, ''), // IBAN ohne Leerzeichen
        'S', // Address Type (Structured)
        settings.companyName.substring(0, 70),
        settings.companyAddress.substring(0, 70),
        '', // Building number (leer bei combined address)
        settings.companyZip.substring(0, 16),
        settings.companyCity.substring(0, 35),
        settings.companyCountry.substring(0, 2),
        // Ultimate Creditor (leer für Future Use)
        '', '', '', '', '', '', '',
        // Payment Amount Information
        Number(invoice.total).toFixed(2),
        invoice.currency,
        // Ultimate Debtor (Zahlungspflichtiger)
        'S', // Address Type
        invoice.client.name.substring(0, 70),
        parseAddressLine(invoice.client.address || '').street.substring(0, 70),
        parseAddressLine(invoice.client.address || '').building,
        parseAddressLine(invoice.client.address || '').zip.substring(0, 16),
        parseAddressLine(invoice.client.address || '').city.substring(0, 35),
        'CH', // Land
        // Payment Reference
        invoice.qrReference ? 'QRR' : 'NON', // Reference Type
        invoice.qrReference || '', // Reference
        // Additional Information
        `Rechnung ${invoice.invoiceNumber}`.substring(0, 140),
        'EPD', // Trailer (End Payment Data)
        '' // Billing Information (z.B. Swico S1)
    ];
    return data.join('\r\n');
}
// Hilfsfunktion zum Parsen von Adresszeilen
function parseAddressLine(address) {
    if (!address) {
        return { street: '', building: '', zip: '', city: '' };
    }
    // Einfache Heuristik für Schweizer Adressen
    const lines = address.split('\n').map(line => line.trim());
    if (lines.length >= 2) {
        const streetLine = lines[0];
        const cityLine = lines[lines.length - 1];
        // Extrahiere PLZ und Stadt aus letzter Zeile
        const cityMatch = cityLine.match(/^(\d{4})\s+(.+)$/);
        const zip = cityMatch ? cityMatch[1] : '';
        const city = cityMatch ? cityMatch[2] : cityLine;
        // Trenne Straße und Hausnummer (optional)
        const streetMatch = streetLine.match(/^(.+?)\s+(\d+.*)$/);
        const street = streetMatch ? streetMatch[1] : streetLine;
        const building = streetMatch ? streetMatch[2] : '';
        return { street, building, zip, city };
    }
    return { street: address, building: '', zip: '', city: '' };
}
// Hauptfunktion zur PDF-Generierung
function generateInvoicePDF(invoice, settings) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            try {
                const doc = new pdfkit_1.default({
                    size: 'A4',
                    margin: 40,
                    info: {
                        Title: `Rechnung ${invoice.invoiceNumber}`,
                        Author: settings.companyName,
                        Subject: `Beratungsrechnung für ${invoice.client.name}`,
                        Keywords: 'Rechnung, Beratung, QR-Bill'
                    }
                });
                const buffers = [];
                doc.on('data', buffers.push.bind(buffers));
                doc.on('end', () => {
                    const pdfBuffer = Buffer.concat(buffers);
                    resolve(pdfBuffer);
                });
                // Generiere QR-Code
                const qrData = generateSwissQRCodeData(invoice, settings);
                const qrCodeBuffer = yield qrcode_1.default.toBuffer(qrData, {
                    errorCorrectionLevel: 'M',
                    type: 'png',
                    margin: 1,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                    },
                    width: 166 // 46mm bei 92 DPI
                });
                // PDF-Inhalte generieren
                generateInvoiceContent(doc, invoice, settings, qrCodeBuffer);
                doc.end();
            }
            catch (error) {
                reject(error);
            }
        }));
    });
}
function generateInvoiceContent(doc, invoice, settings, qrCodeBuffer) {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 40;
    // === RECHNUNGSTEIL (Oberer Bereich) ===
    // Firmen-Header
    doc.fontSize(16)
        .fillColor('#000')
        .text(settings.companyName, margin, 60, { align: 'left' });
    doc.fontSize(10)
        .text(settings.companyAddress, margin, 85)
        .text(`${settings.companyZip} ${settings.companyCity}`, margin, 100);
    if (settings.companyPhone) {
        doc.text(`Tel: ${settings.companyPhone}`, margin, 120);
    }
    if (settings.companyEmail) {
        doc.text(`E-Mail: ${settings.companyEmail}`, margin, settings.companyPhone ? 135 : 120);
    }
    if (settings.vatNumber) {
        doc.text(`MwSt-Nr: ${settings.vatNumber}`, margin, (settings.companyPhone && settings.companyEmail) ? 150 : 135);
    }
    // Rechnungsdetails (rechts)
    const rightX = pageWidth - 200;
    doc.fontSize(20)
        .fillColor('#000')
        .text('RECHNUNG', rightX, 60, { align: 'right', width: 160 });
    doc.fontSize(10)
        .text(`Rechnungsnummer: ${invoice.invoiceNumber}`, rightX, 90, { align: 'right', width: 160 })
        .text(`Rechnungsdatum: ${invoice.issueDate.toLocaleDateString('de-CH')}`, rightX, 105, { align: 'right', width: 160 })
        .text(`Fällig am: ${invoice.dueDate.toLocaleDateString('de-CH')}`, rightX, 120, { align: 'right', width: 160 })
        .text(`Zahlungsbedingungen: ${invoice.paymentTerms}`, rightX, 135, { align: 'right', width: 160 });
    // Kunde (Empfänger)
    doc.fontSize(12)
        .fillColor('#000')
        .text('Rechnung an:', margin, 200);
    doc.fontSize(10)
        .text(invoice.client.name, margin, 220);
    if (invoice.client.company) {
        doc.text(invoice.client.company, margin, 235);
    }
    if (invoice.client.address) {
        const addressLines = invoice.client.address.split('\n');
        let yPos = invoice.client.company ? 250 : 235;
        addressLines.forEach(line => {
            doc.text(line.trim(), margin, yPos);
            yPos += 15;
        });
    }
    // Rechnungspositionen
    const tableTop = 320;
    const tableLeft = margin;
    const tableWidth = pageWidth - 2 * margin;
    // Tabellenkopf
    doc.fontSize(10)
        .fillColor('#333')
        .text('Beschreibung', tableLeft, tableTop, { width: 300 })
        .text('Stunden', tableLeft + 300, tableTop, { width: 60, align: 'right' })
        .text('Stundensatz', tableLeft + 370, tableTop, { width: 80, align: 'right' })
        .text('Betrag', tableLeft + 460, tableTop, { width: 80, align: 'right' });
    // Linie unter Kopf
    doc.moveTo(tableLeft, tableTop + 20)
        .lineTo(tableLeft + tableWidth, tableTop + 20)
        .stroke();
    // Rechnungspositionen
    let currentY = tableTop + 35;
    const lineHeight = 25;
    invoice.items.forEach((item, index) => {
        if (currentY > pageHeight - 200) { // Platz für QR-Rechnung lassen
            doc.addPage();
            currentY = 60;
        }
        doc.fontSize(9)
            .fillColor('#000')
            .text(item.description, tableLeft, currentY, { width: 300 })
            .text(Number(item.quantity).toFixed(2), tableLeft + 300, currentY, { width: 60, align: 'right' })
            .text(`${Number(item.unitPrice).toFixed(2)} ${invoice.currency}`, tableLeft + 370, currentY, { width: 80, align: 'right' })
            .text(`${Number(item.amount).toFixed(2)} ${invoice.currency}`, tableLeft + 460, currentY, { width: 80, align: 'right' });
        currentY += lineHeight;
    });
    // Zwischensumme und Total
    currentY += 20;
    // Linie vor Totalen
    doc.moveTo(tableLeft + 300, currentY)
        .lineTo(tableLeft + tableWidth, currentY)
        .stroke();
    currentY += 15;
    // Zwischensumme
    doc.fontSize(10)
        .text('Zwischensumme:', tableLeft + 370, currentY, { width: 80, align: 'right' })
        .text(`${Number(invoice.subtotal).toFixed(2)} ${invoice.currency}`, tableLeft + 460, currentY, { width: 80, align: 'right' });
    currentY += 20;
    // MwSt falls vorhanden
    if (invoice.vatRate && invoice.vatAmount) {
        doc.text(`MwSt ${Number(invoice.vatRate).toFixed(1)}%:`, tableLeft + 370, currentY, { width: 80, align: 'right' })
            .text(`${Number(invoice.vatAmount).toFixed(2)} ${invoice.currency}`, tableLeft + 460, currentY, { width: 80, align: 'right' });
        currentY += 20;
    }
    // Gesamtsumme
    doc.fontSize(12)
        .fillColor('#000')
        .text('Total:', tableLeft + 370, currentY, { width: 80, align: 'right' })
        .text(`${Number(invoice.total).toFixed(2)} ${invoice.currency}`, tableLeft + 460, currentY, { width: 80, align: 'right' });
    // Notizen falls vorhanden
    if (invoice.notes) {
        currentY += 40;
        doc.fontSize(10)
            .text('Bemerkungen:', tableLeft, currentY)
            .text(invoice.notes, tableLeft, currentY + 15, { width: tableWidth });
    }
    // === SCHWEIZER QR-RECHNUNG (Unterer Bereich) ===
    const qrTop = pageHeight - 298; // 105mm von unten (QR-Rechnung Höhe)
    // Perforation (gestrichelte Linie)
    doc.save()
        .dash(3, { space: 3 })
        .moveTo(margin, qrTop - 10)
        .lineTo(pageWidth - margin, qrTop - 10)
        .stroke()
        .restore();
    // EMPFANGSSCHEIN (links) - 62mm breit
    const receiptWidth = 176; // 62mm bei 72 DPI
    const receiptLeft = margin;
    doc.fontSize(11)
        .fillColor('#000')
        .text('Empfangsschein', receiptLeft, qrTop, { width: receiptWidth });
    doc.fontSize(6)
        .text('Konto / Zahlbar an', receiptLeft, qrTop + 20, { width: receiptWidth });
    doc.fontSize(8)
        .text(settings.iban, receiptLeft, qrTop + 30, { width: receiptWidth })
        .text(settings.companyName, receiptLeft, qrTop + 45, { width: receiptWidth })
        .text(settings.companyAddress, receiptLeft, qrTop + 57, { width: receiptWidth })
        .text(`${settings.companyZip} ${settings.companyCity}`, receiptLeft, qrTop + 69, { width: receiptWidth });
    doc.fontSize(6)
        .text('Referenz', receiptLeft, qrTop + 90, { width: receiptWidth });
    if (invoice.qrReference) {
        doc.fontSize(8)
            .text(invoice.qrReference, receiptLeft, qrTop + 100, { width: receiptWidth });
    }
    doc.fontSize(6)
        .text('Zahlbar durch', receiptLeft, qrTop + 120, { width: receiptWidth });
    doc.fontSize(8)
        .text(invoice.client.name, receiptLeft, qrTop + 130, { width: receiptWidth });
    if (invoice.client.address) {
        const addressParts = parseAddressLine(invoice.client.address);
        if (addressParts.street) {
            doc.text(addressParts.street + (addressParts.building ? ' ' + addressParts.building : ''), receiptLeft, qrTop + 142, { width: receiptWidth });
        }
        if (addressParts.zip && addressParts.city) {
            doc.text(`${addressParts.zip} ${addressParts.city}`, receiptLeft, qrTop + 154, { width: receiptWidth });
        }
    }
    doc.fontSize(6)
        .text('Währung', receiptLeft, qrTop + 180, { width: 40 })
        .text('Betrag', receiptLeft + 50, qrTop + 180, { width: receiptWidth - 50 });
    doc.fontSize(8)
        .text(invoice.currency, receiptLeft, qrTop + 190, { width: 40 })
        .text(Number(invoice.total).toFixed(2), receiptLeft + 50, qrTop + 190, { width: receiptWidth - 50 });
    doc.fontSize(6)
        .text('Annahmestelle', receiptLeft, qrTop + 220, { width: receiptWidth });
    // ZAHLTEIL (rechts) - 148mm breit
    const paymentLeft = receiptLeft + receiptWidth + 20;
    const paymentWidth = pageWidth - paymentLeft - margin;
    doc.fontSize(11)
        .fillColor('#000')
        .text('Zahlteil', paymentLeft, qrTop, { width: paymentWidth });
    // QR-Code einfügen
    const qrSize = 166; // 46mm bei etwa 92 DPI
    const qrX = paymentLeft;
    const qrY = qrTop + 25;
    doc.image(qrCodeBuffer, qrX, qrY, {
        width: qrSize,
        height: qrSize
    });
    // Schweizerkreuz über QR-Code (vereinfacht als weißes Rechteck mit schwarzem Kreuz)
    const crossSize = 25;
    const crossX = qrX + (qrSize - crossSize) / 2;
    const crossY = qrY + (qrSize - crossSize) / 2;
    doc.rect(crossX, crossY, crossSize, crossSize)
        .fillAndStroke('#FFFFFF', '#000000')
        .lineWidth(1);
    // Kleines Kreuz zeichnen
    const crossLineLength = 12;
    const crossCenterX = crossX + crossSize / 2;
    const crossCenterY = crossY + crossSize / 2;
    doc.moveTo(crossCenterX - crossLineLength / 2, crossCenterY)
        .lineTo(crossCenterX + crossLineLength / 2, crossCenterY)
        .moveTo(crossCenterX, crossCenterY - crossLineLength / 2)
        .lineTo(crossCenterX, crossCenterY + crossLineLength / 2)
        .stroke();
    // Konto / Zahlbar an (rechts vom QR-Code)
    const rightInfoX = qrX + qrSize + 20;
    doc.fontSize(6)
        .fillColor('#000')
        .text('Konto / Zahlbar an', rightInfoX, qrY, { width: paymentWidth - qrSize - 20 });
    doc.fontSize(10)
        .text(settings.iban, rightInfoX, qrY + 12, { width: paymentWidth - qrSize - 20 })
        .text(settings.companyName, rightInfoX, qrY + 27, { width: paymentWidth - qrSize - 20 })
        .text(settings.companyAddress, rightInfoX, qrY + 42, { width: paymentWidth - qrSize - 20 })
        .text(`${settings.companyZip} ${settings.companyCity}`, rightInfoX, qrY + 57, { width: paymentWidth - qrSize - 20 });
    // Referenz
    if (invoice.qrReference) {
        doc.fontSize(6)
            .text('Referenz', rightInfoX, qrY + 80, { width: paymentWidth - qrSize - 20 });
        doc.fontSize(10)
            .text(invoice.qrReference, rightInfoX, qrY + 92, { width: paymentWidth - qrSize - 20 });
    }
    // Zusätzliche Informationen
    doc.fontSize(6)
        .text('Zusätzliche Informationen', rightInfoX, qrY + 115, { width: paymentWidth - qrSize - 20 });
    doc.fontSize(10)
        .text(`Rechnung ${invoice.invoiceNumber}`, rightInfoX, qrY + 127, { width: paymentWidth - qrSize - 20 });
    // Zahlbar durch (unter QR-Code)
    doc.fontSize(6)
        .text('Zahlbar durch', qrX, qrY + qrSize + 15, { width: qrSize + 100 });
    doc.fontSize(10)
        .text(invoice.client.name, qrX, qrY + qrSize + 27, { width: qrSize + 100 });
    if (invoice.client.address) {
        const addressParts = parseAddressLine(invoice.client.address);
        let yOffset = 42;
        if (addressParts.street) {
            doc.text(addressParts.street + (addressParts.building ? ' ' + addressParts.building : ''), qrX, qrY + qrSize + yOffset, { width: qrSize + 100 });
            yOffset += 15;
        }
        if (addressParts.zip && addressParts.city) {
            doc.text(`${addressParts.zip} ${addressParts.city}`, qrX, qrY + qrSize + yOffset, { width: qrSize + 100 });
        }
    }
    // Währung und Betrag (rechts unten)
    const currencyX = rightInfoX;
    const currencyY = qrY + qrSize + 15;
    doc.fontSize(6)
        .text('Währung', currencyX, currencyY, { width: 60 })
        .text('Betrag', currencyX + 70, currencyY, { width: 80 });
    doc.fontSize(10)
        .text(invoice.currency, currencyX, currencyY + 12, { width: 60 })
        .text(Number(invoice.total).toFixed(2), currencyX + 70, currencyY + 12, { width: 80 });
    // Footer falls vorhanden
    if (settings.footerText) {
        doc.fontSize(8)
            .fillColor('#666')
            .text(settings.footerText, margin, qrTop - 40, {
            width: pageWidth - 2 * margin,
            align: 'center'
        });
    }
}
//# sourceMappingURL=invoicePdfGenerator.js.map
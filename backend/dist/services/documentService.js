"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.DocumentService = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const client_1 = require("@prisma/client");
const date_fns_1 = require("date-fns");
const locale_1 = require("date-fns/locale");
const pdf_lib_1 = require("pdf-lib");
const prisma = new client_1.PrismaClient();
// Upload-Verzeichnisse
const CERTIFICATES_DIR = path.join(__dirname, '../../uploads/certificates');
const CONTRACTS_DIR = path.join(__dirname, '../../uploads/contracts');
const TEMPLATES_DIR = path.join(__dirname, '../../uploads/document-templates');
const SIGNATURES_DIR = path.join(__dirname, '../../uploads/document-signatures');
// Stelle sicher, dass die Verzeichnisse existieren
[CERTIFICATES_DIR, CONTRACTS_DIR, TEMPLATES_DIR, SIGNATURES_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});
/**
 * Service für PDF-Dokumenten-Generierung (Arbeitszeugnisse und Arbeitsverträge)
 */
class DocumentService {
    /**
     * Generiert ein Arbeitszeugnis-PDF
     */
    static generateCertificate(data, generatedBy) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Hole User-Daten
                const user = yield prisma.user.findUnique({
                    where: { id: data.userId },
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        birthday: true,
                        identificationNumber: true
                    }
                });
                if (!user) {
                    throw new Error('User nicht gefunden');
                }
                // Hole Organization-Daten
                const lifecycle = yield prisma.employeeLifecycle.findUnique({
                    where: { userId: data.userId },
                    include: {
                        organization: {
                            select: {
                                id: true,
                                name: true,
                                displayName: true,
                                settings: true
                            }
                        }
                    }
                });
                if (!lifecycle) {
                    throw new Error('Lebenszyklus nicht gefunden');
                }
                const organization = lifecycle.organization;
                // Prüfe ob Template verwendet werden soll
                if (data.templateUsed && data.templateVersion) {
                    const templateBuffer = yield this.loadTemplatePDF(organization, 'employmentCertificate', data.templateVersion);
                    if (templateBuffer) {
                        console.log(`✅ Template gefunden für Certificate: ${data.templateUsed} v${data.templateVersion}`);
                        // Verwende Template-basierte Generierung
                        const pdfBuffer = yield this.fillTemplatePDF(templateBuffer, user, organization, lifecycle, data, 'certificate');
                        // Speichere PDF
                        const fileName = `certificate-${data.userId}-${Date.now()}.pdf`;
                        const filePath = path.join(CERTIFICATES_DIR, fileName);
                        fs.writeFileSync(filePath, pdfBuffer);
                        return fileName;
                    }
                    else {
                        console.warn(`⚠️ Template nicht gefunden: ${data.templateUsed} v${data.templateVersion}, verwende Standard-Generierung`);
                    }
                }
                // Fallback: Standard-PDF-Generierung
                const pdfBuffer = yield this.createCertificatePDF(user, organization, lifecycle, data, generatedBy);
                // Speichere PDF
                const fileName = `certificate-${data.userId}-${Date.now()}.pdf`;
                const filePath = path.join(CERTIFICATES_DIR, fileName);
                fs.writeFileSync(filePath, pdfBuffer);
                return fileName; // Relativer Pfad für Datenbank
            }
            catch (error) {
                console.error('Error in generateCertificate:', error);
                throw error;
            }
        });
    }
    /**
     * Generiert einen Arbeitsvertrag-PDF
     */
    static generateContract(data, generatedBy) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Hole User-Daten
                const user = yield prisma.user.findUnique({
                    where: { id: data.userId },
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        birthday: true,
                        identificationNumber: true
                    }
                });
                if (!user) {
                    throw new Error('User nicht gefunden');
                }
                // Hole Organization-Daten
                const lifecycle = yield prisma.employeeLifecycle.findUnique({
                    where: { userId: data.userId },
                    include: {
                        organization: {
                            select: {
                                id: true,
                                name: true,
                                displayName: true,
                                settings: true
                            }
                        }
                    }
                });
                if (!lifecycle) {
                    throw new Error('Lebenszyklus nicht gefunden');
                }
                const organization = lifecycle.organization;
                // Prüfe ob Template verwendet werden soll
                if (data.templateUsed && data.templateVersion) {
                    const templateBuffer = yield this.loadTemplatePDF(organization, 'employmentContract', data.templateVersion);
                    if (templateBuffer) {
                        // Verwende Template-basierte Generierung
                        const pdfBuffer = yield this.fillTemplatePDF(templateBuffer, user, organization, lifecycle, data, 'contract');
                        // Speichere PDF
                        const fileName = `contract-${data.userId}-${Date.now()}.pdf`;
                        const filePath = path.join(CONTRACTS_DIR, fileName);
                        fs.writeFileSync(filePath, pdfBuffer);
                        return fileName;
                    }
                }
                // Fallback: Standard-PDF-Generierung
                const pdfBuffer = yield this.createContractPDF(user, organization, lifecycle, data, generatedBy);
                // Speichere PDF
                const fileName = `contract-${data.userId}-${Date.now()}.pdf`;
                const filePath = path.join(CONTRACTS_DIR, fileName);
                fs.writeFileSync(filePath, pdfBuffer);
                return fileName; // Relativer Pfad für Datenbank
            }
            catch (error) {
                console.error('Error in generateContract:', error);
                throw error;
            }
        });
    }
    /**
     * Erstellt das PDF-Buffer für ein Arbeitszeugnis
     */
    static createCertificatePDF(user, organization, lifecycle, data, generatedBy) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                try {
                    const doc = new pdfkit_1.default({
                        size: 'A4',
                        margin: 50,
                        info: {
                            Title: `Certificado Laboral ${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
                            Author: organization.displayName || organization.name,
                            Subject: 'Certificado Laboral',
                            Keywords: 'Certificado Laboral, Certificado, Employment Certificate'
                        }
                    });
                    const buffers = [];
                    doc.on('data', buffers.push.bind(buffers));
                    doc.on('end', () => {
                        const pdfBuffer = Buffer.concat(buffers);
                        resolve(pdfBuffer);
                    });
                    // PDF-Inhalt generieren
                    this.generateCertificateContent(doc, user, organization, lifecycle, data, generatedBy);
                    doc.end();
                }
                catch (error) {
                    reject(error);
                }
            });
        });
    }
    /**
     * Erstellt das PDF-Buffer für einen Arbeitsvertrag
     */
    static createContractPDF(user, organization, lifecycle, data, generatedBy) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                try {
                    const doc = new pdfkit_1.default({
                        size: 'A4',
                        margin: 50,
                        info: {
                            Title: `Contrato de Trabajo ${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
                            Author: organization.displayName || organization.name,
                            Subject: 'Contrato de Trabajo',
                            Keywords: 'Contrato de Trabajo, Contrato, Employment Contract'
                        }
                    });
                    const buffers = [];
                    doc.on('data', buffers.push.bind(buffers));
                    doc.on('end', () => {
                        const pdfBuffer = Buffer.concat(buffers);
                        resolve(pdfBuffer);
                    });
                    // PDF-Inhalt generieren
                    this.generateContractContent(doc, user, organization, lifecycle, data, generatedBy);
                    doc.end();
                }
                catch (error) {
                    reject(error);
                }
            });
        });
    }
    /**
     * Generiert den Inhalt für ein Arbeitszeugnis
     */
    static generateCertificateContent(doc, user, organization, lifecycle, data, generatedBy) {
        var _a, _b;
        const pageWidth = doc.page.width;
        const margin = 50;
        let yPos = 50;
        // Header: Firmenname
        doc.fontSize(16)
            .fillColor('#000')
            .text(organization.displayName || organization.name, margin, yPos, { align: 'center' });
        yPos += 30;
        // Titel
        doc.fontSize(20)
            .text('CERTIFICADO LABORAL', margin, yPos, { align: 'center' });
        yPos += 40;
        // Einleitung
        const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
        doc.fontSize(11)
            .fillColor('#000')
            .text(`Hiermit bestätigen wir, dass ${userName} vom ${lifecycle.contractStartDate ? (0, date_fns_1.format)(new Date(lifecycle.contractStartDate), 'dd.MM.yyyy', { locale: locale_1.de }) : '[Datum]'} bis ${lifecycle.contractEndDate ? (0, date_fns_1.format)(new Date(lifecycle.contractEndDate), 'dd.MM.yyyy', { locale: locale_1.de }) : '[Datum]'} in unserem Unternehmen beschäftigt war.`, margin, yPos, { width: pageWidth - 2 * margin, align: 'justify' });
        yPos += 60;
        // Position und Aufgaben
        if (lifecycle.contractType) {
            doc.fontSize(12)
                .text('Position:', margin, yPos);
            yPos += 20;
            doc.fontSize(11)
                .text(`Der/Die Mitarbeiter/in war als ${lifecycle.contractType} tätig.`, margin, yPos, { width: pageWidth - 2 * margin, align: 'justify' });
            yPos += 40;
        }
        // Leistung und Verhalten
        doc.fontSize(12)
            .text('Leistung und Verhalten:', margin, yPos);
        yPos += 20;
        // Verwende customText falls vorhanden, sonst Standard-Text
        const certificateText = data.customText ||
            `${userName} erfüllte die ihm/ihr übertragenen Aufgaben stets zu unserer vollsten Zufriedenheit. Er/Sie zeigte großes Engagement, Zuverlässigkeit und Teamfähigkeit.`;
        doc.fontSize(11)
            .text(certificateText, margin, yPos, { width: pageWidth - 2 * margin, align: 'justify' });
        yPos += 80;
        // Abschluss
        doc.fontSize(11)
            .text('Wir bedanken uns für die gute Zusammenarbeit und wünschen für die Zukunft alles Gute.', margin, yPos, { width: pageWidth - 2 * margin, align: 'justify' });
        yPos += 60;
        // Ort und Datum
        const currentDate = (0, date_fns_1.format)(new Date(), 'dd.MM.yyyy', { locale: locale_1.de });
        doc.fontSize(11)
            .text(`[Ort], ${currentDate}`, margin, yPos, { align: 'right', width: pageWidth - 2 * margin });
        yPos += 40;
        // Unterschrift - versuche Signatur aus Settings zu laden
        const signature = this.loadSignatureFromSettings(organization, 'employmentCertificate');
        if (signature && signature.path) {
            try {
                const signaturePath = path.join(SIGNATURES_DIR, path.basename(signature.path));
                if (fs.existsSync(signaturePath)) {
                    const signatureX = ((_a = signature.position) === null || _a === void 0 ? void 0 : _a.x) || (pageWidth - margin - 100);
                    const signatureY = ((_b = signature.position) === null || _b === void 0 ? void 0 : _b.y) || yPos;
                    const signatureWidth = 80;
                    const signatureHeight = 40;
                    doc.image(signaturePath, signatureX, signatureY, {
                        width: signatureWidth,
                        height: signatureHeight,
                        align: 'right'
                    });
                    yPos += signatureHeight + 10;
                    // Signatur-Name und Position
                    if (signature.signerName) {
                        doc.fontSize(10)
                            .fillColor('#000')
                            .text(signature.signerName, margin, yPos, { align: 'right', width: pageWidth - 2 * margin });
                        if (signature.signerPosition) {
                            yPos += 15;
                            doc.fontSize(9)
                                .fillColor('#666')
                                .text(signature.signerPosition, margin, yPos, { align: 'right', width: pageWidth - 2 * margin });
                        }
                    }
                }
                else {
                    // Fallback: Text-Unterschrift
                    this.drawTextSignature(doc, margin, yPos, pageWidth);
                }
            }
            catch (error) {
                console.error('Fehler beim Laden der Signatur:', error);
                // Fallback: Text-Unterschrift
                this.drawTextSignature(doc, margin, yPos, pageWidth);
            }
        }
        else {
            // Fallback: Text-Unterschrift
            this.drawTextSignature(doc, margin, yPos, pageWidth);
        }
    }
    /**
     * Zeichnet eine Text-Unterschrift (Fallback)
     */
    static drawTextSignature(doc, margin, yPos, pageWidth) {
        doc.fontSize(11)
            .text('_________________________', margin, yPos, { align: 'right', width: pageWidth - 2 * margin });
        yPos += 20;
        doc.fontSize(10)
            .fillColor('#666')
            .text('Unterschrift', margin, yPos, { align: 'right', width: pageWidth - 2 * margin });
    }
    /**
     * Lädt Signatur-Informationen aus Organization-Settings
     */
    static loadSignatureFromSettings(organization, type) {
        try {
            const settings = organization.settings;
            if (!settings || !settings.documentSignatures) {
                return null;
            }
            return settings.documentSignatures[type] || null;
        }
        catch (error) {
            console.error('Fehler beim Laden der Signatur-Einstellungen:', error);
            return null;
        }
    }
    /**
     * Generiert den Inhalt für einen Arbeitsvertrag
     */
    static generateContractContent(doc, user, organization, lifecycle, data, generatedBy) {
        const pageWidth = doc.page.width;
        const margin = 50;
        let yPos = 50;
        // Header: Firmenname
        doc.fontSize(16)
            .fillColor('#000')
            .text(organization.displayName || organization.name, margin, yPos, { align: 'center' });
        yPos += 30;
        // Titel
        doc.fontSize(20)
            .text('CONTRATO DE TRABAJO', margin, yPos, { align: 'center' });
        yPos += 40;
        // Vertragsparteien
        doc.fontSize(12)
            .fillColor('#000')
            .text('Entre', margin, yPos);
        yPos += 20;
        const contractUserName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
        doc.fontSize(11)
            .text(`${organization.displayName || organization.name}`, margin + 20, yPos);
        yPos += 30;
        doc.fontSize(12)
            .text('y', margin, yPos);
        yPos += 20;
        doc.fontSize(11)
            .text(contractUserName, margin + 20, yPos)
            .text(user.email, margin + 20, yPos + 15);
        yPos += 50;
        // Vertragsbedingungen
        doc.fontSize(12)
            .text('se celebra el siguiente contrato de trabajo:', margin, yPos);
        yPos += 30;
        // Vertragsart
        doc.fontSize(11)
            .text(`1. Art des Arbeitsverhältnisses:`, margin, yPos);
        yPos += 20;
        const contractTypeText = this.getContractTypeText(data.contractType);
        doc.fontSize(11)
            .text(contractTypeText, margin + 20, yPos, { width: pageWidth - 2 * margin - 20 });
        yPos += 40;
        // Position
        if (data.position) {
            doc.fontSize(11)
                .text(`2. Position: ${data.position}`, margin, yPos);
            yPos += 30;
        }
        // Arbeitsbeginn
        doc.fontSize(11)
            .text(`3. Arbeitsbeginn: ${(0, date_fns_1.format)(data.startDate, 'dd.MM.yyyy', { locale: locale_1.de })}`, margin, yPos);
        yPos += 30;
        // Arbeitsende (falls befristet)
        if (data.endDate) {
            doc.fontSize(11)
                .text(`4. Arbeitsende: ${(0, date_fns_1.format)(data.endDate, 'dd.MM.yyyy', { locale: locale_1.de })}`, margin, yPos);
            yPos += 30;
        }
        // Arbeitszeit
        if (data.workingHours) {
            doc.fontSize(11)
                .text(`5. Arbeitszeit: ${data.workingHours} Stunden pro Woche`, margin, yPos);
            yPos += 30;
        }
        // Gehalt
        if (data.salary) {
            doc.fontSize(11)
                .text(`6. Gehalt: ${data.salary.toLocaleString('de-CH')} [Währung]`, margin, yPos);
            yPos += 30;
        }
        // Verwende customText falls vorhanden
        if (data.customText) {
            yPos += 20;
            doc.fontSize(11)
                .text(data.customText, margin, yPos, { width: pageWidth - 2 * margin, align: 'justify' });
            yPos += 60;
        }
        yPos += 40;
        // Ort und Datum
        const currentDate = (0, date_fns_1.format)(new Date(), 'dd.MM.yyyy', { locale: locale_1.de });
        doc.fontSize(11)
            .text(`[Ort], ${currentDate}`, margin, yPos, { align: 'right', width: pageWidth - 2 * margin });
        yPos += 60;
        // Unterschriften - versuche Signatur aus Settings zu laden
        const signature = this.loadSignatureFromSettings(organization, 'employmentContract');
        if (signature && signature.path) {
            try {
                const signaturePath = path.join(SIGNATURES_DIR, path.basename(signature.path));
                if (fs.existsSync(signaturePath)) {
                    // Arbeitgeber-Signatur
                    const signatureX = margin;
                    const signatureY = yPos + 20;
                    const signatureWidth = 80;
                    const signatureHeight = 40;
                    doc.fontSize(11)
                        .text('Arbeitgeber:', margin, yPos);
                    doc.image(signaturePath, signatureX, signatureY, {
                        width: signatureWidth,
                        height: signatureHeight
                    });
                    if (signature.signerName) {
                        doc.fontSize(10)
                            .fillColor('#000')
                            .text(signature.signerName, margin, signatureY + signatureHeight + 5);
                        if (signature.signerPosition) {
                            doc.fontSize(9)
                                .fillColor('#666')
                                .text(signature.signerPosition, margin, signatureY + signatureHeight + 20);
                        }
                    }
                }
                else {
                    // Fallback: Text-Unterschriften
                    this.drawContractTextSignatures(doc, margin, yPos, pageWidth);
                }
            }
            catch (error) {
                console.error('Fehler beim Laden der Signatur:', error);
                // Fallback: Text-Unterschriften
                this.drawContractTextSignatures(doc, margin, yPos, pageWidth);
            }
        }
        else {
            // Fallback: Text-Unterschriften
            this.drawContractTextSignatures(doc, margin, yPos, pageWidth);
        }
    }
    /**
     * Zeichnet Text-Unterschriften für Vertrag (Fallback)
     */
    static drawContractTextSignatures(doc, margin, yPos, pageWidth) {
        doc.fontSize(11)
            .text('Arbeitgeber:', margin, yPos)
            .text('_________________________', margin, yPos + 20);
        doc.fontSize(11)
            .text('Arbeitnehmer/in:', pageWidth - margin - 200, yPos)
            .text('_________________________', pageWidth - margin - 200, yPos + 20);
    }
    /**
     * Hilfsfunktion: Übersetzt Vertragstyp in Text
     */
    static getContractTypeText(contractType) {
        const types = {
            'indefinite': 'Unbefristetes Arbeitsverhältnis',
            'fixed_term': 'Befristetes Arbeitsverhältnis',
            'temporary': 'Zeitarbeitsverhältnis',
            'part_time': 'Teilzeitarbeitsverhältnis',
            'full_time': 'Vollzeitarbeitsverhältnis'
        };
        return types[contractType] || contractType;
    }
    /**
     * Lädt ein Template-PDF aus Organization-Settings
     */
    static loadTemplatePDF(organization, templateType, templateVersion) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const settings = organization.settings;
                if (!settings || !settings.documentTemplates) {
                    return null;
                }
                const template = settings.documentTemplates[templateType];
                if (!template || !template.path) {
                    return null;
                }
                // Wenn Version angegeben ist, prüfe ob sie übereinstimmt
                if (templateVersion && template.version !== templateVersion) {
                    console.warn(`Template-Version mismatch: requested ${templateVersion}, found ${template.version}`);
                }
                // Lade Template-PDF
                const templatePath = path.join(__dirname, '../../uploads', template.path);
                if (fs.existsSync(templatePath)) {
                    return fs.readFileSync(templatePath);
                }
                return null;
            }
            catch (error) {
                console.error('Error loading template PDF:', error);
                return null;
            }
        });
    }
    /**
     * Gibt Standard-Positionen für Felder zurück
     * Koordinaten sind in PDF-Punkten (1 Punkt = 1/72 Zoll)
     * A4: 595.28 x 841.89 Punkte
     */
    static getDefaultFieldPositions(type, pageWidth, pageHeight) {
        // Standard-Positionen für A4 (595.28 x 841.89)
        // Y-Koordinate: 0 ist unten, pageHeight ist oben (PDF-Koordinatensystem)
        const margin = 50;
        const lineHeight = 20;
        let currentY = pageHeight - margin - 30; // Start oben links
        const basePositions = {
            userName: { x: margin, y: currentY, fontSize: 14 },
            organizationName: { x: margin, y: currentY - lineHeight, fontSize: 12 },
            currentDate: { x: margin, y: currentY - lineHeight * 2, fontSize: 12 },
            identificationNumber: { x: margin, y: currentY - lineHeight * 3, fontSize: 12 },
            startDate: { x: margin, y: currentY - lineHeight * 4, fontSize: 12 },
            endDate: { x: margin, y: currentY - lineHeight * 5, fontSize: 12 }
        };
        if (type === 'contract') {
            basePositions.position = { x: margin, y: currentY - lineHeight * 6, fontSize: 12 };
            basePositions.salary = { x: margin, y: currentY - lineHeight * 7, fontSize: 12 };
            basePositions.workingHours = { x: margin, y: currentY - lineHeight * 8, fontSize: 12 };
        }
        // Skaliere Positionen wenn Seite nicht A4 ist
        const scaleX = pageWidth / 595.28;
        const scaleY = pageHeight / 841.89;
        const scaledPositions = {};
        for (const [key, pos] of Object.entries(basePositions)) {
            scaledPositions[key] = {
                x: pos.x * scaleX,
                y: pos.y * scaleY,
                fontSize: pos.fontSize
            };
        }
        return scaledPositions;
    }
    /**
     * Zeichnet Text an einer bestimmten Position auf einer PDF-Seite
     */
    static drawTextAtPosition(page, position, text, pageWidth, pageHeight) {
        if (!position || !text) {
            if (!position) {
                console.warn(`⚠️ Position fehlt für Text "${text}"`);
            }
            return;
        }
        try {
            const fontSize = position.fontSize || 12;
            // pdf-lib verwendet Y-Koordinate von unten (0 ist unten, pageHeight ist oben)
            // Unsere Positionen verwenden Y von oben (0 ist oben, pageHeight ist unten)
            // Daher müssen wir umrechnen: pdfLibY = pageHeight - y
            const pdfLibY = pageHeight - position.y;
            // Prüfe ob Position innerhalb der Seite liegt
            if (position.x < 0 || position.x > pageWidth || pdfLibY < 0 || pdfLibY > pageHeight) {
                console.warn(`⚠️ Position außerhalb der Seite für Text "${text}": (${position.x}, ${position.y}) -> (${position.x}, ${pdfLibY})`);
            }
            // pdf-lib verwendet Standard-Font (Helvetica)
            page.drawText(text, {
                x: position.x,
                y: pdfLibY,
                size: fontSize,
                // Optionale Formatierung
                color: { r: 0, g: 0, b: 0 } // Schwarz
            });
            console.log(`✅ Text "${text}" erfolgreich an Position (${position.x}, ${position.y}) -> (${position.x}, ${pdfLibY}) gezeichnet`);
        }
        catch (error) {
            console.error(`❌ Fehler beim Zeichnen von Text "${text}" an Position (${position.x}, ${position.y}):`, error);
            // Fehler wird ignoriert, damit andere Felder weiterhin eingefügt werden können
        }
    }
    /**
     * Füllt ein Template-PDF mit Daten
     * Verwendet PDF-Lib um das Template-PDF zu laden und Text an definierten Positionen einzufügen
     */
    static fillTemplatePDF(templateBuffer, user, organization, lifecycle, data, type) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                // Lade Template-PDF mit PDF-Lib
                const pdfDoc = yield pdf_lib_1.PDFDocument.load(templateBuffer);
                const pages = pdfDoc.getPages();
                const firstPage = pages[0];
                const { width, height } = firstPage.getSize();
                console.log(`📄 Template-PDF geladen: ${width}x${height} Punkte`);
                // Erstelle Variablen-Map
                const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
                const currentDate = (0, date_fns_1.format)(new Date(), 'dd.MM.yyyy', { locale: locale_1.de });
                const organizationName = organization.displayName || organization.name;
                const identificationNumber = user.identificationNumber || '';
                console.log(`📝 Variablen: userName=${userName}, organizationName=${organizationName}, currentDate=${currentDate}`);
                // Lade Positionen aus Settings oder verwende Standard-Positionen
                const settings = organization.settings;
                const templateSettings = (_a = settings === null || settings === void 0 ? void 0 : settings.documentTemplates) === null || _a === void 0 ? void 0 : _a[type === 'certificate' ? 'employmentCertificate' : 'employmentContract'];
                const fieldPositions = (templateSettings === null || templateSettings === void 0 ? void 0 : templateSettings.fields) || null;
                // Standard-Positionen (Fallback)
                const defaultPositions = this.getDefaultFieldPositions(type, width, height);
                const positions = fieldPositions || defaultPositions;
                console.log(`📍 Verwendete Positionen:`, JSON.stringify(positions, null, 2));
                // Variablen für Certificate
                if (type === 'certificate') {
                    const certData = data;
                    const startDate = lifecycle.contractStartDate
                        ? (0, date_fns_1.format)(new Date(lifecycle.contractStartDate), 'dd.MM.yyyy', { locale: locale_1.de })
                        : '[Datum]';
                    const endDate = lifecycle.contractEndDate
                        ? (0, date_fns_1.format)(new Date(lifecycle.contractEndDate), 'dd.MM.yyyy', { locale: locale_1.de })
                        : '[Datum]';
                    console.log(`📅 Certificate-Daten: startDate=${startDate}, endDate=${endDate}`);
                    // Füge Text an Positionen ein
                    if (positions.userName) {
                        console.log(`✏️ Zeichne userName "${userName}" an Position (${positions.userName.x}, ${positions.userName.y})`);
                        this.drawTextAtPosition(firstPage, positions.userName, userName, width, height);
                    }
                    if (positions.organizationName) {
                        this.drawTextAtPosition(firstPage, positions.organizationName, organizationName, width, height);
                    }
                    if (positions.currentDate) {
                        this.drawTextAtPosition(firstPage, positions.currentDate, currentDate, width, height);
                    }
                    if (positions.identificationNumber) {
                        this.drawTextAtPosition(firstPage, positions.identificationNumber, identificationNumber, width, height);
                    }
                    if (positions.startDate) {
                        this.drawTextAtPosition(firstPage, positions.startDate, startDate, width, height);
                    }
                    if (positions.endDate) {
                        this.drawTextAtPosition(firstPage, positions.endDate, endDate, width, height);
                    }
                }
                // Variablen für Contract
                if (type === 'contract') {
                    const contractData = data;
                    const startDate = (0, date_fns_1.format)(contractData.startDate, 'dd.MM.yyyy', { locale: locale_1.de });
                    const endDate = contractData.endDate
                        ? (0, date_fns_1.format)(contractData.endDate, 'dd.MM.yyyy', { locale: locale_1.de })
                        : '';
                    const salary = contractData.salary
                        ? contractData.salary.toLocaleString('de-CH', { style: 'currency', currency: 'CHF' })
                        : '';
                    const workingHours = ((_b = contractData.workingHours) === null || _b === void 0 ? void 0 : _b.toString()) || '';
                    const position = contractData.position || '';
                    // Füge Text an Positionen ein
                    this.drawTextAtPosition(firstPage, positions.userName, userName, width, height);
                    this.drawTextAtPosition(firstPage, positions.organizationName, organizationName, width, height);
                    this.drawTextAtPosition(firstPage, positions.currentDate, currentDate, width, height);
                    this.drawTextAtPosition(firstPage, positions.identificationNumber, identificationNumber, width, height);
                    this.drawTextAtPosition(firstPage, positions.startDate, startDate, width, height);
                    this.drawTextAtPosition(firstPage, positions.endDate, endDate, width, height);
                    this.drawTextAtPosition(firstPage, positions.position, position, width, height);
                    this.drawTextAtPosition(firstPage, positions.salary, salary, width, height);
                    this.drawTextAtPosition(firstPage, positions.workingHours, workingHours, width, height);
                }
                // Speichere das gefüllte PDF
                const pdfBytes = yield pdfDoc.save();
                return Buffer.from(pdfBytes);
            }
            catch (error) {
                console.error('Error filling template PDF:', error);
                // Fallback: Verwende Standard-Generierung
                return new Promise((resolve, reject) => {
                    try {
                        const doc = new pdfkit_1.default({
                            size: 'A4',
                            margin: 50
                        });
                        const buffers = [];
                        doc.on('data', buffers.push.bind(buffers));
                        doc.on('end', () => {
                            const pdfBuffer = Buffer.concat(buffers);
                            resolve(pdfBuffer);
                        });
                        if (type === 'certificate') {
                            this.generateCertificateContent(doc, user, organization, lifecycle, data, 0);
                        }
                        else {
                            this.generateContractContent(doc, user, organization, lifecycle, data, 0);
                        }
                        doc.end();
                    }
                    catch (err) {
                        reject(err);
                    }
                });
            }
        });
    }
    /**
     * Lädt ein Template (Legacy-Methode, für Kompatibilität)
     */
    static loadTemplate(templateName, templateVersion) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const templatePath = path.join(TEMPLATES_DIR, templateVersion ? `${templateName}-${templateVersion}.pdf` : `${templateName}.pdf`);
                if (fs.existsSync(templatePath)) {
                    return fs.readFileSync(templatePath);
                }
                return null;
            }
            catch (error) {
                console.error('Error loading template:', error);
                return null;
            }
        });
    }
    /**
     * Speichert ein Template (für zukünftige Erweiterung)
     */
    static saveTemplate(templateName, templateBuffer, version) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const fileName = version ? `${templateName}-${version}.pdf` : `${templateName}.pdf`;
                const filePath = path.join(TEMPLATES_DIR, fileName);
                fs.writeFileSync(filePath, templateBuffer);
                return fileName;
            }
            catch (error) {
                console.error('Error saving template:', error);
                throw error;
            }
        });
    }
}
exports.DocumentService = DocumentService;
//# sourceMappingURL=documentService.js.map
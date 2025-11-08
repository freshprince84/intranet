import PDFDocument from 'pdfkit';
import * as path from 'path';
import * as fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const prisma = new PrismaClient();

// Upload-Verzeichnisse
const CERTIFICATES_DIR = path.join(__dirname, '../../uploads/certificates');
const CONTRACTS_DIR = path.join(__dirname, '../../uploads/contracts');
const TEMPLATES_DIR = path.join(__dirname, '../../uploads/document-templates');

// Stelle sicher, dass die Verzeichnisse existieren
[CERTIFICATES_DIR, CONTRACTS_DIR, TEMPLATES_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

interface CertificateData {
  userId: number;
  certificateType?: string;
  templateUsed?: string;
  templateVersion?: string;
  customText?: string; // Optional: Vom HR bearbeiteter Text
}

interface ContractData {
  userId: number;
  contractType: string;
  startDate: Date;
  endDate?: Date | null;
  salary?: number | null;
  workingHours?: number | null;
  position?: string | null;
  templateUsed?: string;
  templateVersion?: string;
  customText?: string; // Optional: Vom HR bearbeiteter Text
}

interface UserData {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
  birthday?: Date | null;
  identificationNumber?: string | null;
}

interface OrganizationData {
  id: number;
  name: string;
  displayName: string;
  settings?: any;
}

/**
 * Service für PDF-Dokumenten-Generierung (Arbeitszeugnisse und Arbeitsverträge)
 */
export class DocumentService {
  /**
   * Generiert ein Arbeitszeugnis-PDF
   */
  static async generateCertificate(
    data: CertificateData,
    generatedBy: number
  ): Promise<string> {
    try {
      // Hole User-Daten
      const user = await prisma.user.findUnique({
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
      const lifecycle = await prisma.employeeLifecycle.findUnique({
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

      // Generiere PDF
      const pdfBuffer = await this.createCertificatePDF(
        user,
        organization,
        lifecycle,
        data,
        generatedBy
      );

      // Speichere PDF
      const fileName = `certificate-${data.userId}-${Date.now()}.pdf`;
      const filePath = path.join(CERTIFICATES_DIR, fileName);

      fs.writeFileSync(filePath, pdfBuffer);

      return fileName; // Relativer Pfad für Datenbank
    } catch (error) {
      console.error('Error in generateCertificate:', error);
      throw error;
    }
  }

  /**
   * Generiert einen Arbeitsvertrag-PDF
   */
  static async generateContract(
    data: ContractData,
    generatedBy: number
  ): Promise<string> {
    try {
      // Hole User-Daten
      const user = await prisma.user.findUnique({
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
      const lifecycle = await prisma.employeeLifecycle.findUnique({
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

      // Generiere PDF
      const pdfBuffer = await this.createContractPDF(
        user,
        organization,
        lifecycle,
        data,
        generatedBy
      );

      // Speichere PDF
      const fileName = `contract-${data.userId}-${Date.now()}.pdf`;
      const filePath = path.join(CONTRACTS_DIR, fileName);

      fs.writeFileSync(filePath, pdfBuffer);

      return fileName; // Relativer Pfad für Datenbank
    } catch (error) {
      console.error('Error in generateContract:', error);
      throw error;
    }
  }

  /**
   * Erstellt das PDF-Buffer für ein Arbeitszeugnis
   */
  private static async createCertificatePDF(
    user: UserData,
    organization: OrganizationData,
    lifecycle: any,
    data: CertificateData,
    generatedBy: number
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: `Arbeitszeugnis ${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
            Author: organization.displayName || organization.name,
            Subject: 'Arbeitszeugnis',
            Keywords: 'Arbeitszeugnis, Zeugnis, Employment Certificate'
          }
        });

        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });

        // PDF-Inhalt generieren
        this.generateCertificateContent(doc, user, organization, lifecycle, data, generatedBy);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Erstellt das PDF-Buffer für einen Arbeitsvertrag
   */
  private static async createContractPDF(
    user: UserData,
    organization: OrganizationData,
    lifecycle: any,
    data: ContractData,
    generatedBy: number
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: `Arbeitsvertrag ${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
            Author: organization.displayName || organization.name,
            Subject: 'Arbeitsvertrag',
            Keywords: 'Arbeitsvertrag, Contract, Employment Contract'
          }
        });

        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });

        // PDF-Inhalt generieren
        this.generateContractContent(doc, user, organization, lifecycle, data, generatedBy);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generiert den Inhalt für ein Arbeitszeugnis
   */
  private static generateCertificateContent(
    doc: PDFKit.PDFDocument,
    user: UserData,
    organization: OrganizationData,
    lifecycle: any,
    data: CertificateData,
    generatedBy: number
  ) {
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
       .text('ARBEITSZEUGNIS', margin, yPos, { align: 'center' });
    
    yPos += 40;

    // Einleitung
    const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
    doc.fontSize(11)
       .fillColor('#000')
       .text(
         `Hiermit bestätigen wir, dass ${userName} vom ${lifecycle.contractStartDate ? format(new Date(lifecycle.contractStartDate), 'dd.MM.yyyy', { locale: de }) : '[Datum]'} bis ${lifecycle.contractEndDate ? format(new Date(lifecycle.contractEndDate), 'dd.MM.yyyy', { locale: de }) : '[Datum]'} in unserem Unternehmen beschäftigt war.`,
         margin,
         yPos,
         { width: pageWidth - 2 * margin, align: 'justify' }
       );

    yPos += 60;

    // Position und Aufgaben
    if (lifecycle.contractType) {
      doc.fontSize(12)
         .text('Position:', margin, yPos);
      
      yPos += 20;
      
      doc.fontSize(11)
         .text(
           `Der/Die Mitarbeiter/in war als ${lifecycle.contractType} tätig.`,
           margin,
           yPos,
           { width: pageWidth - 2 * margin, align: 'justify' }
         );
      
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
       .text(
         certificateText,
         margin,
         yPos,
         { width: pageWidth - 2 * margin, align: 'justify' }
       );

    yPos += 80;

    // Abschluss
    doc.fontSize(11)
       .text(
         'Wir bedanken uns für die gute Zusammenarbeit und wünschen für die Zukunft alles Gute.',
         margin,
         yPos,
         { width: pageWidth - 2 * margin, align: 'justify' }
       );

    yPos += 60;

    // Ort und Datum
    const currentDate = format(new Date(), 'dd.MM.yyyy', { locale: de });
    doc.fontSize(11)
       .text(`[Ort], ${currentDate}`, margin, yPos, { align: 'right', width: pageWidth - 2 * margin });

    yPos += 40;

    // Unterschrift
    doc.fontSize(11)
       .text('_________________________', margin, yPos, { align: 'right', width: pageWidth - 2 * margin });
    
    yPos += 20;
    
    doc.fontSize(10)
       .fillColor('#666')
       .text('Unterschrift', margin, yPos, { align: 'right', width: pageWidth - 2 * margin });
  }

  /**
   * Generiert den Inhalt für einen Arbeitsvertrag
   */
  private static generateContractContent(
    doc: PDFKit.PDFDocument,
    user: UserData,
    organization: OrganizationData,
    lifecycle: any,
    data: ContractData,
    generatedBy: number
  ) {
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
       .text('ARBEITSVERTRAG', margin, yPos, { align: 'center' });
    
    yPos += 40;

    // Vertragsparteien
    doc.fontSize(12)
       .fillColor('#000')
       .text('Zwischen', margin, yPos);
    
    yPos += 20;
    
    const contractUserName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
    doc.fontSize(11)
       .text(`${organization.displayName || organization.name}`, margin + 20, yPos);
    
    yPos += 30;
    
    doc.fontSize(12)
       .text('und', margin, yPos);
    
    yPos += 20;
    
    doc.fontSize(11)
       .text(contractUserName, margin + 20, yPos)
       .text(user.email, margin + 20, yPos + 15);
    
    yPos += 50;

    // Vertragsbedingungen
    doc.fontSize(12)
       .text('wird folgender Arbeitsvertrag geschlossen:', margin, yPos);
    
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
       .text(
         `3. Arbeitsbeginn: ${format(data.startDate, 'dd.MM.yyyy', { locale: de })}`,
         margin,
         yPos
       );
    
    yPos += 30;

    // Arbeitsende (falls befristet)
    if (data.endDate) {
      doc.fontSize(11)
         .text(
           `4. Arbeitsende: ${format(data.endDate, 'dd.MM.yyyy', { locale: de })}`,
           margin,
           yPos
         );
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
    const currentDate = format(new Date(), 'dd.MM.yyyy', { locale: de });
    doc.fontSize(11)
       .text(`[Ort], ${currentDate}`, margin, yPos, { align: 'right', width: pageWidth - 2 * margin });

    yPos += 60;

    // Unterschriften
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
  private static getContractTypeText(contractType: string): string {
    const types: Record<string, string> = {
      'indefinite': 'Unbefristetes Arbeitsverhältnis',
      'fixed_term': 'Befristetes Arbeitsverhältnis',
      'temporary': 'Zeitarbeitsverhältnis',
      'part_time': 'Teilzeitarbeitsverhältnis',
      'full_time': 'Vollzeitarbeitsverhältnis'
    };

    return types[contractType] || contractType;
  }

  /**
   * Lädt ein Template (für zukünftige Erweiterung)
   */
  static async loadTemplate(templateName: string, templateVersion?: string): Promise<Buffer | null> {
    try {
      const templatePath = path.join(
        TEMPLATES_DIR,
        templateVersion ? `${templateName}-${templateVersion}.pdf` : `${templateName}.pdf`
      );

      if (fs.existsSync(templatePath)) {
        return fs.readFileSync(templatePath);
      }

      return null;
    } catch (error) {
      console.error('Error loading template:', error);
      return null;
    }
  }

  /**
   * Speichert ein Template (für zukünftige Erweiterung)
   */
  static async saveTemplate(templateName: string, templateBuffer: Buffer, version?: string): Promise<string> {
    try {
      const fileName = version ? `${templateName}-${version}.pdf` : `${templateName}.pdf`;
      const filePath = path.join(TEMPLATES_DIR, fileName);

      fs.writeFileSync(filePath, templateBuffer);

      return fileName;
    } catch (error) {
      console.error('Error saving template:', error);
      throw error;
    }
  }
}


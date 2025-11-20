import PDFDocument from 'pdfkit';
import * as path from 'path';
import * as fs from 'fs';
import { format } from 'date-fns';
import { de, es } from 'date-fns/locale';
import { PDFDocument as PDFLibDocument } from 'pdf-lib';
import { prisma } from '../utils/prisma';

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
  gender?: string | null; // "male", "female", "other"
}

interface OrganizationData {
  id: number;
  name: string;
  displayName: string;
  settings?: any;
  country?: string | null;
  nit?: string | null;
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

      // Prüfe ob Template verwendet werden soll
      console.log(`🔍 Prüfe Template-Verwendung: templateUsed=${data.templateUsed}, templateVersion=${data.templateVersion}`);
      
      if (data.templateUsed && data.templateVersion) {
        const templateBuffer = await this.loadTemplatePDF(organization, 'employmentCertificate', data.templateVersion);
        if (templateBuffer) {
          console.log(`✅ Template gefunden für Certificate: ${data.templateUsed} v${data.templateVersion}, starte fillTemplatePDF`);
          // Verwende Template-basierte Generierung
          const pdfBuffer = await this.fillTemplatePDF(
            templateBuffer,
            user,
            organization,
            lifecycle,
            data,
            'certificate'
          );
          
          console.log(`✅ Neues PDF generiert: ${pdfBuffer.length} Bytes`);
          
          // Speichere PDF
          const fileName = `certificate-${data.userId}-${Date.now()}.pdf`;
          const filePath = path.join(CERTIFICATES_DIR, fileName);
          fs.writeFileSync(filePath, pdfBuffer);
          
          return fileName;
        } else {
          console.warn(`⚠️ Template nicht gefunden: ${data.templateUsed} v${data.templateVersion}, verwende Standard-Generierung`);
        }
      } else {
        console.warn(`⚠️ Keine Template-Parameter: templateUsed=${data.templateUsed}, templateVersion=${data.templateVersion}, verwende Standard-Generierung`);
      }

      // Fallback: Standard-PDF-Generierung
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

      // Prüfe ob Template verwendet werden soll
      if (data.templateUsed && data.templateVersion) {
        const templateBuffer = await this.loadTemplatePDF(organization, 'employmentContract', data.templateVersion);
        if (templateBuffer) {
          // Verwende Template-basierte Generierung
          const pdfBuffer = await this.fillTemplatePDF(
            templateBuffer,
            user,
            organization,
            lifecycle,
            data,
            'contract'
          );
          
          // Speichere PDF
          const fileName = `contract-${data.userId}-${Date.now()}.pdf`;
          const filePath = path.join(CONTRACTS_DIR, fileName);
          fs.writeFileSync(filePath, pdfBuffer);
          
          return fileName;
        }
      }

      // Fallback: Standard-PDF-Generierung
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
            Title: `Certificado Laboral ${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
            Author: organization.displayName || organization.name,
            Subject: 'Certificado Laboral',
            Keywords: 'Certificado Laboral, Certificado, Employment Certificate'
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
            Title: `Contrato de Trabajo ${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
            Author: organization.displayName || organization.name,
            Subject: 'Contrato de Trabajo',
            Keywords: 'Contrato de Trabajo, Contrato, Employment Contract'
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

    // Datum und Ort (oben links) - VORLAGE-FORMAT: "20 de noviembre 2024" (ohne "de" zwischen Monat und Jahr)
    const currentDate = format(new Date(), "d 'de' MMMM yyyy", { locale: es });
    doc.fontSize(11)
       .fillColor('#000')
       .text(`Medellín, ${currentDate}`, margin, yPos);
    
    yPos += 30;

    // Empfänger (linksbündig) - VORLAGE-FORMAT
    doc.fontSize(11)
       .text('Señores:', margin, yPos);
    
    yPos += 20;
    
    doc.fontSize(11)
       .font('Helvetica-Bold')
       .text('A QUIEN PUEDA INTERESAR', margin, yPos);
    
    yPos += 20;
    
    doc.fontSize(11)
       .text('Ciudad', margin, yPos);
    
    yPos += 40;

    // Firmenname mit NIT (zentriert, groß, fett) - VORLAGE-FORMAT
    const orgName = (organization.displayName || organization.name).toUpperCase();
    // NIT direkt aus Organization lesen (statt aus Settings)
    const orgNIT = organization.nit || '';
    const orgNameWithNIT = orgNIT ? `${orgName} NIT: ${orgNIT}` : orgName;
    
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fillColor('#000')
       .text(orgNameWithNIT, margin, yPos, { align: 'center', width: pageWidth - 2 * margin });
    
    yPos += 30;

    // Überschrift (zentriert, fett) - VORLAGE-FORMAT
    doc.fontSize(18)
       .font('Helvetica-Bold')
       .text('CERTIFICA QUE:', margin, yPos, { align: 'center', width: pageWidth - 2 * margin });
    
    yPos += 40;

    // Einleitung (SPANISCH für Kolumbien!) - VORLAGE-FORMAT
    const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
    const userNameUpper = userName.toUpperCase();
    
    // Bestimme Anrede (Señor/Señora basierend auf Geschlecht oder Standard)
    let salutation = 'La señora'; // Standard: weiblich
    if (user.gender === 'male') {
      salutation = 'El señor';
    } else if (user.gender === 'female') {
      salutation = 'La señora';
    } else if (user.gender === 'other') {
      salutation = 'La señora'; // Standard für "other"
    }
    
    const startDate = lifecycle.contractStartDate 
      ? format(new Date(lifecycle.contractStartDate), "d 'de' MMMM 'de' yyyy", { locale: es })
      : '[Fecha]';
    
    // Vertragsart bestimmen
    const contractTypeText = lifecycle.contractType === 'indefinite' || !lifecycle.contractEndDate
      ? 'a término indefinido'
      : lifecycle.contractType === 'fixed_term'
      ? 'a término fijo'
      : lifecycle.contractType === 'temporary'
      ? 'temporal'
      : 'a término indefinido';
    
    // Wenn kein endDate, "hasta hoy" verwenden, sonst endDate
    const dateText = lifecycle.contractEndDate
      ? `desde el ${startDate} hasta el ${format(new Date(lifecycle.contractEndDate), "d 'de' MMMM 'de' yyyy", { locale: es })}`
      : `desde el ${startDate}`;
    
    // VORLAGE-FORMAT: "La señora [NAME], identificada con la C.C [NUM], labora en nuestra empresa con un contrato de trabajo a término indefinido desde el [DATE]."
    doc.fontSize(11)
       .font('Helvetica')
       .fillColor('#000')
       .text(
         `${salutation} `,
         margin,
         yPos,
         { width: pageWidth - 2 * margin, align: 'left', continued: true }
       )
       .font('Helvetica-Bold')
       .text(
         `${userNameUpper}`,
         { continued: true }
       )
       .font('Helvetica')
       .text(
         `, identificada con la C.C ${user.identificationNumber || '[Número]'}, labora en nuestra empresa con un contrato de trabajo ${contractTypeText} ${dateText}.`,
         { width: pageWidth - 2 * margin, align: 'left' }
       );

    yPos += 50;

    // Position (SPANISCH!) - VORLAGE-FORMAT
    if (lifecycle.contractType) {
      doc.fontSize(11)
         .font('Helvetica')
         .text(
           'Se desempeña como: ',
           margin,
           yPos,
           { width: pageWidth - 2 * margin, align: 'left', continued: true }
         )
         .font('Helvetica-Bold')
         .text(
           `${lifecycle.contractType.toUpperCase()}.`,
           { width: pageWidth - 2 * margin, align: 'left' }
         );
      
      yPos += 40;
    }

    // Abschlussbemerkung (SPANISCH!) - VORLAGE-FORMAT
    doc.fontSize(11)
       .font('Helvetica')
       .text(
         `Esta certificación se expide a solicitud del Sr. ${userName}.`,
         margin,
         yPos,
         { width: pageWidth - 2 * margin, align: 'left' }
       );

    yPos += 80;

    // Signatur-Block (unten links) - VORLAGE-FORMAT
    const signature = this.loadSignatureFromSettings(organization, 'employmentCertificate');
    if (signature && signature.path) {
      try {
        const signaturePath = path.join(SIGNATURES_DIR, path.basename(signature.path));
        if (fs.existsSync(signaturePath)) {
          const signatureX = margin;
          const signatureY = yPos;
          const signatureWidth = 80;
          const signatureHeight = 40;
          
          doc.image(signaturePath, signatureX, signatureY, {
            width: signatureWidth,
            height: signatureHeight
          });
          
          yPos = signatureY + signatureHeight + 15;
          
          // Signatur-Name, C.E., Position, NIT - VORLAGE-FORMAT
          if (signature.signerName) {
            doc.fontSize(10)
               .font('Helvetica-Bold')
               .fillColor('#000')
               .text(signature.signerName.toUpperCase(), margin, yPos);
            
            // C.E. (Cédula de Extranjería) - aus Settings oder Signatur-Daten
            const signerCE = (signature as any).signerCE || '';
            if (signerCE) {
              yPos += 15;
              doc.fontSize(9)
                 .font('Helvetica')
                 .text(`C.E ${signerCE}`, margin, yPos);
            }
            
            if (signature.signerPosition) {
              yPos += 15;
              doc.fontSize(9)
                 .font('Helvetica')
                 .fillColor('#000')
                 .text(signature.signerPosition, margin, yPos);
            }
            
            // Firmenname und NIT unter Signatur
            yPos += 15;
            doc.fontSize(9)
               .font('Helvetica')
               .text(orgName, margin, yPos);
            
            if (orgNIT) {
              yPos += 15;
              doc.fontSize(9)
                 .font('Helvetica')
                 .text(`NIT: ${orgNIT}`, margin, yPos);
            }
          }
        } else {
          // Fallback: Text-Unterschrift mit vollständiger Info
          this.drawTextSignatureWithInfo(doc, margin, yPos, pageWidth, signature, orgName, orgNIT);
        }
      } catch (error) {
        console.error('Fehler beim Laden der Signatur:', error);
        // Fallback: Text-Unterschrift mit vollständiger Info
        this.drawTextSignatureWithInfo(doc, margin, yPos, pageWidth, signature, orgName, orgNIT);
      }
    } else {
      // Fallback: Text-Unterschrift
      this.drawTextSignature(doc, margin, yPos, pageWidth);
    }
  }

  /**
   * Zeichnet eine Text-Unterschrift (Fallback) - SPANISCH!
   */
  private static drawTextSignature(
    doc: PDFKit.PDFDocument,
    margin: number,
    yPos: number,
    pageWidth: number
  ) {
    doc.fontSize(11)
       .text('_________________________', margin, yPos, { align: 'left', width: pageWidth - 2 * margin });
    
    yPos += 20;
    
    doc.fontSize(10)
       .fillColor('#666')
       .text('Firma', margin, yPos, { align: 'left', width: pageWidth - 2 * margin });
  }

  /**
   * Zeichnet eine Text-Unterschrift mit vollständiger Info (Name, C.E., Position, NIT) - VORLAGE-FORMAT
   */
  private static drawTextSignatureWithInfo(
    doc: PDFKit.PDFDocument,
    margin: number,
    yPos: number,
    pageWidth: number,
    signature: any,
    orgName: string,
    orgNIT: string
  ) {
    // Signatur-Linie
    doc.fontSize(11)
       .text('_________________________', margin, yPos, { align: 'left', width: pageWidth - 2 * margin });
    
    yPos += 20;
    
    // Signatur-Name
    if (signature?.signerName) {
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor('#000')
         .text(signature.signerName.toUpperCase(), margin, yPos);
      
      // C.E. (Cédula de Extranjería)
      const signerCE = signature.signerCE || '';
      if (signerCE) {
        yPos += 15;
        doc.fontSize(9)
           .font('Helvetica')
           .text(`C.E ${signerCE}`, margin, yPos);
      }
      
      // Position
      if (signature.signerPosition) {
        yPos += 15;
        doc.fontSize(9)
           .font('Helvetica')
           .fillColor('#000')
           .text(signature.signerPosition, margin, yPos);
      }
      
      // Firmenname und NIT
      yPos += 15;
      doc.fontSize(9)
         .font('Helvetica')
         .text(orgName, margin, yPos);
      
      if (orgNIT) {
        yPos += 15;
        doc.fontSize(9)
           .font('Helvetica')
           .text(`NIT: ${orgNIT}`, margin, yPos);
      }
    } else {
      // Fallback: Nur Signatur-Linie
      doc.fontSize(10)
         .fillColor('#666')
         .text('Firma', margin, yPos, { align: 'left', width: pageWidth - 2 * margin });
    }
  }

  /**
   * Lädt Signatur-Informationen aus Organization-Settings
   */
  private static loadSignatureFromSettings(
    organization: OrganizationData,
    type: 'employmentCertificate' | 'employmentContract'
  ): { path: string; signerName: string; signerPosition?: string; position?: { x: number; y: number; page: number } } | null {
    try {
      const settings = organization.settings as any;
      if (!settings || !settings.documentSignatures) {
        return null;
      }
      
      return settings.documentSignatures[type] || null;
    } catch (error) {
      console.error('Fehler beim Laden der Signatur-Einstellungen:', error);
      return null;
    }
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

    // Vertragsart (SPANISCH für Kolumbien!)
    doc.fontSize(11)
       .text(`1. Tipo de Contrato:`, margin, yPos);
    
    yPos += 20;
    
    const contractTypeText = this.getContractTypeText(data.contractType);
    doc.fontSize(11)
       .text(contractTypeText, margin + 20, yPos, { width: pageWidth - 2 * margin - 20 });
    
    yPos += 40;

    // Position (SPANISCH!)
    if (data.position) {
      doc.fontSize(11)
         .text(`2. Posición: ${data.position}`, margin, yPos);
      yPos += 30;
    }

    // Arbeitsbeginn (SPANISCH!)
    const startDateFormatted = format(data.startDate, "d 'de' MMMM 'de' yyyy", { locale: es });
    doc.fontSize(11)
       .text(
         `3. Fecha de Inicio: ${startDateFormatted}`,
         margin,
         yPos
       );
    
    yPos += 30;

    // Arbeitsende (falls befristet) (SPANISCH!)
    if (data.endDate) {
      const endDateFormatted = format(data.endDate, "d 'de' MMMM 'de' yyyy", { locale: es });
      doc.fontSize(11)
         .text(
           `4. Fecha de Finalización: ${endDateFormatted}`,
           margin,
           yPos
         );
      yPos += 30;
    }

    // Arbeitszeit (SPANISCH!)
    if (data.workingHours) {
      doc.fontSize(11)
         .text(`5. Horas de Trabajo: ${data.workingHours} horas por semana`, margin, yPos);
      yPos += 30;
    }

    // Gehalt (SPANISCH!)
    if (data.salary) {
      const salaryFormatted = data.salary.toLocaleString('es-CO', { style: 'currency', currency: 'COP' });
      doc.fontSize(11)
         .text(`6. Salario: ${salaryFormatted}`, margin, yPos);
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

    // Ort und Datum (SPANISCH!)
    const currentDate = format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es });
    doc.fontSize(11)
       .text(`Medellín, ${currentDate}`, margin, yPos, { align: 'right', width: pageWidth - 2 * margin });

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
        } else {
          // Fallback: Text-Unterschriften
          this.drawContractTextSignatures(doc, margin, yPos, pageWidth);
        }
      } catch (error) {
        console.error('Fehler beim Laden der Signatur:', error);
        // Fallback: Text-Unterschriften
        this.drawContractTextSignatures(doc, margin, yPos, pageWidth);
      }
    } else {
      // Fallback: Text-Unterschriften
      this.drawContractTextSignatures(doc, margin, yPos, pageWidth);
    }
  }

  /**
   * Zeichnet Text-Unterschriften für Vertrag (Fallback) - SPANISCH!
   */
  private static drawContractTextSignatures(
    doc: PDFKit.PDFDocument,
    margin: number,
    yPos: number,
    pageWidth: number
  ) {
    doc.fontSize(11)
       .text('Empleador:', margin, yPos)
       .text('_________________________', margin, yPos + 20);
    
    doc.fontSize(11)
       .text('Empleado:', pageWidth - margin - 200, yPos)
       .text('_________________________', pageWidth - margin - 200, yPos + 20);
  }

  /**
   * Hilfsfunktion: Übersetzt Vertragstyp in Text - SPANISCH für Kolumbien!
   */
  private static getContractTypeText(contractType: string): string {
    const types: Record<string, string> = {
      'indefinite': 'Contrato de trabajo a término indefinido',
      'fixed_term': 'Contrato de trabajo a término fijo',
      'temporary': 'Contrato de trabajo temporal',
      'part_time': 'Contrato de trabajo a tiempo parcial',
      'full_time': 'Contrato de trabajo a tiempo completo'
    };

    return types[contractType] || contractType;
  }

  /**
   * Lädt ein Template-PDF aus Organization-Settings
   */
  private static async loadTemplatePDF(
    organization: OrganizationData,
    templateType: 'employmentCertificate' | 'employmentContract',
    templateVersion?: string
  ): Promise<Buffer | null> {
    try {
      const settings = organization.settings as any;
      if (!settings || !settings.documentTemplates) {
        console.warn(`⚠️ Keine documentTemplates in Settings gefunden für ${templateType}`);
        return null;
      }

      const template = settings.documentTemplates[templateType];
      if (!template || !template.path) {
        console.warn(`⚠️ Kein Template gefunden für ${templateType} in Settings`);
        return null;
      }

      console.log(`📋 Template gefunden: ${templateType}, Version: ${template.version}, Pfad: ${template.path}`);

      // Wenn Version angegeben ist, prüfe ob sie übereinstimmt (aber lade trotzdem)
      if (templateVersion && template.version !== templateVersion) {
        console.warn(`⚠️ Template-Version mismatch: requested ${templateVersion}, found ${template.version} - verwende gefundene Version`);
      }

      // Lade Template-PDF
      const templatePath = path.join(__dirname, '../../uploads', template.path);
      console.log(`📂 Versuche Template zu laden von: ${templatePath}`);
      
      if (fs.existsSync(templatePath)) {
        const templateBuffer = fs.readFileSync(templatePath);
        console.log(`✅ Template erfolgreich geladen: ${templateBuffer.length} Bytes`);
        return templateBuffer;
      } else {
        console.error(`❌ Template-Pfad existiert nicht: ${templatePath}`);
        return null;
      }
    } catch (error) {
      console.error('❌ Error loading template PDF:', error);
      return null;
    }
  }

  /**
   * Gibt Standard-Positionen für Felder zurück
   * Koordinaten sind in PDF-Punkten (1 Punkt = 1/72 Zoll)
   * A4: 595.28 x 841.89 Punkte
   */
  private static getDefaultFieldPositions(
    type: 'certificate' | 'contract',
    pageWidth: number,
    pageHeight: number
  ): Record<string, { x: number; y: number; fontSize?: number }> {
    // Standard-Positionen für A4 (595.28 x 841.89)
    // Y-Koordinate: 0 ist unten, pageHeight ist oben (PDF-Koordinatensystem)
    const margin = 50;
    const lineHeight = 20;
    let currentY = pageHeight - margin - 30; // Start oben links
    
    const basePositions: Record<string, { x: number; y: number; fontSize?: number }> = {
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
    
    const scaledPositions: Record<string, { x: number; y: number; fontSize?: number }> = {};
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
  private static drawTextAtPosition(
    page: any,
    position: { x: number; y: number; fontSize?: number } | null | undefined,
    text: string,
    pageWidth: number,
    pageHeight: number
  ): void {
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
      
      // Schätze Textbreite (ca. 0.6 * fontSize pro Zeichen für Helvetica)
      const estimatedTextWidth = text.length * fontSize * 0.6;
      const textHeight = fontSize * 1.2; // Etwas mehr Platz für Zeilenabstand
      
      // Zeichne weißen Hintergrund über den alten Text (um ihn zu überdecken)
      // Verwende etwas mehr Platz, um sicherzustellen, dass der alte Text vollständig überdeckt wird
      page.drawRectangle({
        x: position.x - 5,
        y: pdfLibY - textHeight - 2,
        width: estimatedTextWidth + 10,
        height: textHeight + 4,
        color: { r: 1, g: 1, b: 1 }, // Weiß
        borderColor: undefined,
        borderWidth: 0
      });
      
      // pdf-lib verwendet Standard-Font (Helvetica)
      page.drawText(text, {
        x: position.x,
        y: pdfLibY,
        size: fontSize,
        // Optionale Formatierung
        color: { r: 0, g: 0, b: 0 } // Schwarz
      });
      
      console.log(`✅ Text "${text}" erfolgreich an Position (${position.x}, ${position.y}) -> (${position.x}, ${pdfLibY}) gezeichnet`);
    } catch (error) {
      console.error(`❌ Fehler beim Zeichnen von Text "${text}" an Position (${position.x}, ${position.y}):`, error);
      // Fehler wird ignoriert, damit andere Felder weiterhin eingefügt werden können
    }
  }

  /**
   * Füllt ein Template-PDF mit Daten
   * Extrahiert Text aus dem Template, ersetzt Variablen und generiert ein NEUES, FRISCHES PDF
   */
  private static async fillTemplatePDF(
    templateBuffer: Buffer,
    user: UserData,
    organization: OrganizationData,
    lifecycle: any,
    data: CertificateData | ContractData,
    type: 'certificate' | 'contract'
  ): Promise<Buffer> {
    try {
      // Extrahiere Text aus dem Template-PDF mit pdfjs-dist
      let templateText = '';
      
      try {
        // Verwende pdfjs-dist für Text-Extraktion (funktioniert besser in Node.js)
        const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
        
        // Lade PDF-Dokument
        const loadingTask = pdfjs.getDocument({ data: templateBuffer });
        const pdfDocument = await loadingTask.promise;
        
        // Extrahiere Text von allen Seiten
        const textParts: string[] = [];
        for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
          const page = await pdfDocument.getPage(pageNum);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
          textParts.push(pageText);
        }
        
        templateText = textParts.join('\n');
        console.log(`📄 Template-Text extrahiert: ${templateText.length} Zeichen`);
      } catch (parseError: any) {
        console.error('❌ Fehler bei Text-Extraktion:', parseError.message);
        // Fallback: Verwende Standard-Generierung auf Spanisch
        throw new Error('Text-Extraktion nicht möglich - verwende Standard-Generierung');
      }

      // Erstelle Variablen-Map (SPANISCHES Format!)
      const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
      const firstName = user.firstName || '';
      const lastName = user.lastName || '';
      // Spanisches Datum-Format: "20 de noviembre de 2024"
      const currentDate = format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es });
      const organizationName = organization.displayName || organization.name;
      const identificationNumber = user.identificationNumber || '';
      
      // Variablen für Certificate
      let startDate = '';
      let endDate = '';
      let position = '';
      let salary = '';
      let workingHours = '';
      
      if (type === 'certificate') {
        startDate = lifecycle.contractStartDate 
          ? format(new Date(lifecycle.contractStartDate), "d 'de' MMMM 'de' yyyy", { locale: es })
          : '';
        // Wenn kein endDate, verwende "hasta hoy" statt leer
        endDate = lifecycle.contractEndDate
          ? format(new Date(lifecycle.contractEndDate), "d 'de' MMMM 'de' yyyy", { locale: es })
          : 'hasta hoy';
        position = lifecycle.contractType || '';
      }
      
      if (type === 'contract') {
        const contractData = data as ContractData;
        startDate = format(contractData.startDate, "d 'de' MMMM 'de' yyyy", { locale: es });
        endDate = contractData.endDate 
          ? format(contractData.endDate, "d 'de' MMMM 'de' yyyy", { locale: es })
          : '';
        position = contractData.position || '';
        salary = contractData.salary 
          ? contractData.salary.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })
          : '';
        workingHours = contractData.workingHours?.toString() || '';
      }
      
      // Bestimme Anrede basierend auf Geschlecht
      let salutation = 'La señora'; // Standard: weiblich
      if (user.gender === 'male') {
        salutation = 'El señor';
      } else if (user.gender === 'female') {
        salutation = 'La señora';
      } else if (user.gender === 'other') {
        salutation = 'La señora'; // Standard für "other"
      }
      
      // Ersetze Variablen im Text
      templateText = templateText
        .replace(/\{\{userName\}\}/g, userName)
        .replace(/\{\{firstName\}\}/g, firstName)
        .replace(/\{\{lastName\}\}/g, lastName)
        .replace(/\{\{currentDate\}\}/g, currentDate)
        .replace(/\{\{issueDate\}\}/g, currentDate)
        .replace(/\{\{organizationName\}\}/g, organizationName)
        .replace(/\{\{identificationNumber\}\}/g, identificationNumber)
        .replace(/\{\{startDate\}\}/g, startDate)
        .replace(/\{\{endDate\}\}/g, endDate)
        .replace(/\{\{position\}\}/g, position)
        .replace(/\{\{salary\}\}/g, salary)
        .replace(/\{\{workingHours\}\}/g, workingHours)
        .replace(/\{\{salutation\}\}/g, salutation);
      
      // Ersetze auch Anrede-Muster im Template-Text (für Kompatibilität)
      if (user.gender === 'male') {
        templateText = templateText
          .replace(/La señora/gi, 'El señor')
          .replace(/la señora/gi, 'el señor');
      }
      
      // Spezielle Behandlung für endDate: Wenn leer oder "hasta hoy", ersetze auch Muster im Text
      if (!lifecycle.contractEndDate && type === 'certificate') {
        // Ersetze Muster wie "hasta el [endDate]" oder "hasta [endDate]" mit "hasta hoy"
        templateText = templateText
          .replace(/hasta el\s*\{\{endDate\}\}/gi, 'hasta hoy')
          .replace(/hasta\s*\{\{endDate\}\}/gi, 'hasta hoy')
          .replace(/hasta el\s*\[Fecha\]/gi, 'hasta hoy')
          .replace(/hasta\s*\[Fecha\]/gi, 'hasta hoy')
          .replace(/hasta el\s*\[endDate\]/gi, 'hasta hoy')
          .replace(/hasta\s*\[endDate\]/gi, 'hasta hoy');
      }
      
      // Ersetze auch konkrete Werte aus dem Template (für Kompatibilität)
      templateText = templateText
        .replace(/JUSTIN LONDOÑO CÁRDENAS/gi, userName.toUpperCase())
        .replace(/1020416721/gi, identificationNumber)
        .replace(/RECEPCIONISTA/gi, position.toUpperCase())
        .replace(/20 de noviembre 2024/gi, currentDate)
        .replace(/22 de octubre de 2024/gi, startDate);
      
      // Ersetze NIT aus Organization (statt aus Settings)
      const orgNIT = organization.nit || '';
      if (orgNIT) {
        templateText = templateText
          .replace(/\{\{nit\}\}/g, orgNIT)
          .replace(/\{\{organizationNIT\}\}/g, orgNIT);
      }
      
      // Wenn kein endDate, ersetze auch konkrete Datumsmuster mit "hasta hoy"
      if (!lifecycle.contractEndDate && type === 'certificate') {
        // Ersetze Muster wie "hasta el [Datum]" oder "hasta [Datum]" mit "hasta hoy"
        templateText = templateText
          .replace(/hasta el\s+\d{1,2}\s+de\s+\w+\s+\d{4}/gi, 'hasta hoy')
          .replace(/hasta\s+\d{1,2}\s+de\s+\w+\s+\d{4}/gi, 'hasta hoy');
      }
      
      console.log(`✅ Variablen ersetzt. Neuer Text: ${templateText.substring(0, 200)}...`);

      // Generiere NEUES, FRISCHES PDF mit dem ersetzten Text
      return new Promise((resolve, reject) => {
        try {
          const doc = new PDFDocument({
            size: 'A4',
            margin: 50,
            info: {
              Title: type === 'certificate' 
                ? `Certificado Laboral ${userName}`.trim() || user.email
                : `Contrato de Trabajo ${userName}`.trim() || user.email,
              Author: organizationName,
              Subject: type === 'certificate' ? 'Certificado Laboral' : 'Contrato de Trabajo'
            }
          });

          const buffers: Buffer[] = [];
          doc.on('data', buffers.push.bind(buffers));
          doc.on('end', () => {
            const pdfBuffer = Buffer.concat(buffers);
            resolve(pdfBuffer);
          });

          // Teile Text in Zeilen und füge sie zum PDF hinzu
          const lines = templateText.split('\n');
          let yPos = 50;
          const pageWidth = doc.page.width;
          const margin = 50;
          const lineHeight = 15;
          const maxY = doc.page.height - margin;

          lines.forEach((line) => {
            // Prüfe ob neue Seite benötigt wird
            if (yPos > maxY) {
              doc.addPage();
              yPos = 50;
            }

            // Überspringe leere Zeilen
            if (line.trim()) {
              doc.fontSize(11)
                 .fillColor('#000')
                 .text(line.trim(), margin, yPos, {
                   width: pageWidth - 2 * margin,
                   align: 'left'
                 });
              yPos += lineHeight;
            } else {
              yPos += lineHeight / 2; // Kleinere Lücke bei leeren Zeilen
            }
          });

          // Füge Signatur hinzu (falls konfiguriert)
          const signature = this.loadSignatureFromSettings(organization, type === 'certificate' ? 'employmentCertificate' : 'employmentContract');
          if (signature && signature.path) {
            try {
              const signaturePath = path.join(SIGNATURES_DIR, path.basename(signature.path));
              if (fs.existsSync(signaturePath)) {
                yPos += 40; // Abstand vor Signatur
                const signatureWidth = 80;
                const signatureHeight = 40;
                const signatureX = signature.position?.x || (pageWidth - margin - signatureWidth);
                const signatureY = signature.position?.y || yPos;
                
                doc.image(signaturePath, signatureX, signatureY, {
                  width: signatureWidth,
                  height: signatureHeight
                });
                
                yPos = signatureY + signatureHeight + 10;
                
                // Signatur-Name und Position
                if (signature.signerName) {
                  doc.fontSize(10)
                     .fillColor('#000')
                     .text(signature.signerName, signatureX, yPos);
                  
                  if (signature.signerPosition) {
                    yPos += 15;
                    doc.fontSize(9)
                       .fillColor('#666')
                       .text(signature.signerPosition, signatureX, yPos);
                  }
                }
              }
            } catch (error) {
              console.error('Fehler beim Laden der Signatur:', error);
            }
          }

          doc.end();
        } catch (err) {
          console.error('Error generating PDF from template text:', err);
          reject(err);
        }
      });
    } catch (error) {
      console.error('Error filling template PDF:', error);
      // Fallback: Verwende Standard-Generierung
      return new Promise((resolve, reject) => {
        try {
          const doc = new PDFDocument({
            size: 'A4',
            margin: 50
          });

          const buffers: Buffer[] = [];
          doc.on('data', buffers.push.bind(buffers));
          doc.on('end', () => {
            const pdfBuffer = Buffer.concat(buffers);
            resolve(pdfBuffer);
          });

          if (type === 'certificate') {
            this.generateCertificateContent(doc, user, organization, lifecycle, data as CertificateData, 0);
          } else {
            this.generateContractContent(doc, user, organization, lifecycle, data as ContractData, 0);
          }

          doc.end();
        } catch (err) {
          reject(err);
        }
      });
    }
  }

  /**
   * Lädt ein Template (Legacy-Methode, für Kompatibilität)
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


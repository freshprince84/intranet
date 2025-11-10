import { Request, Response } from 'express';
import { LifecycleService } from '../services/lifecycleService';
import { isHROrAdmin, isLegalOrAdmin } from '../utils/lifecycleRoles';
import { PrismaClient } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';

const prisma = new PrismaClient();

// Upload-Verzeichnis für Certificates/Contracts
const CERTIFICATES_DIR = path.join(__dirname, '../../uploads/certificates');
const CONTRACTS_DIR = path.join(__dirname, '../../uploads/contracts');

// Stelle sicher, dass die Upload-Verzeichnisse existieren
if (!fs.existsSync(CERTIFICATES_DIR)) {
  fs.mkdirSync(CERTIFICATES_DIR, { recursive: true });
}
if (!fs.existsSync(CONTRACTS_DIR)) {
  fs.mkdirSync(CONTRACTS_DIR, { recursive: true });
}

/**
 * Ruft den Lebenszyklus-Status eines Users ab
 * GET /api/users/:id/lifecycle
 */
export const getLifecycle = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const currentUserId = parseInt(req.userId || '0');

    // Prüfe Berechtigung: User selbst oder HR/Admin
    if (userId !== currentUserId) {
      const hasAccess = await isHROrAdmin(req);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Keine Berechtigung' });
      }
    }

    let result = await LifecycleService.getLifecycle(userId);

    // Falls kein Lifecycle existiert, erstelle einen automatisch
    if (!result) {
      try {
        // Hole organizationId vom User
        const user = await prisma.user.findUnique({
          where: { id: userId },
          include: {
            roles: {
              where: { lastUsed: true },
              take: 1,
              include: {
                role: {
                  include: {
                    organization: {
                      select: { id: true }
                    }
                  }
                }
              }
            }
          }
        });

        if (user && user.roles.length > 0) {
          const organizationId = user.roles[0].role.organization?.id;
          if (organizationId) {
            await LifecycleService.createLifecycle(userId, organizationId);
            result = await LifecycleService.getLifecycle(userId);
          }
        }
      } catch (createError) {
        console.error('Error creating lifecycle:', createError);
        // Fall through to return 404
      }
    }

    if (!result) {
      return res.status(404).json({ message: 'Lebenszyklus nicht gefunden. Bitte kontaktieren Sie HR.' });
    }

    res.json(result);
  } catch (error) {
    console.error('Error in getLifecycle:', error);
    res.status(500).json({
      message: 'Fehler beim Abrufen des Lebenszyklus',
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    });
  }
};

/**
 * Aktualisiert den Lebenszyklus-Status eines Users
 * PUT /api/users/:id/lifecycle/status
 */
export const updateStatus = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const currentUserId = parseInt(req.userId || '0');

    // Prüfe Berechtigung: Nur HR oder Admin
    const hasAccess = await isHROrAdmin(req);
    if (!hasAccess) {
      return res.status(403).json({ message: 'Keine Berechtigung - nur HR oder Admin' });
    }

    const { status, contractStartDate, contractEndDate, contractType, exitDate, exitReason } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status ist erforderlich' });
    }

    const updated = await LifecycleService.updateStatus(
      userId, 
      status, 
      {
      contractStartDate: contractStartDate ? new Date(contractStartDate) : undefined,
      contractEndDate: contractEndDate ? new Date(contractEndDate) : undefined,
      contractType,
      exitDate: exitDate ? new Date(exitDate) : undefined,
      exitReason
      },
      currentUserId // Übergebe currentUserId für automatische Zertifikats-Generierung
    );

    res.json(updated);
  } catch (error) {
    console.error('Error in updateStatus:', error);
    res.status(500).json({
      message: 'Fehler beim Aktualisieren des Status',
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    });
  }
};

/**
 * Ruft den Status einer Sozialversicherung ab
 * GET /api/users/:id/lifecycle/social-security/:type
 */
export const getSocialSecurity = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const type = req.params.type as 'arl' | 'eps' | 'pension' | 'caja';
    const currentUserId = parseInt(req.userId || '0');

    // Validierung
    if (!['arl', 'eps', 'pension', 'caja'].includes(type)) {
      return res.status(400).json({ message: 'Ungültiger Typ' });
    }

    // Prüfe Berechtigung: User selbst, HR, Legal oder Admin
    if (userId !== currentUserId) {
      const isHR = await isHROrAdmin(req);
      const isLegal = await isLegalOrAdmin(req);
      if (!isHR && !isLegal) {
        return res.status(403).json({ message: 'Keine Berechtigung' });
      }
    }

    const status = await LifecycleService.getSocialSecurityStatus(userId, type);

    if (!status) {
      return res.status(404).json({ message: 'Lebenszyklus nicht gefunden' });
    }

    res.json(status);
  } catch (error) {
    console.error('Error in getSocialSecurity:', error);
    res.status(500).json({
      message: 'Fehler beim Abrufen des Sozialversicherungs-Status',
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    });
  }
};

/**
 * Aktualisiert den Status einer Sozialversicherung
 * PUT /api/users/:id/lifecycle/social-security/:type
 */
export const updateSocialSecurity = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const type = req.params.type as 'arl' | 'eps' | 'pension' | 'caja';
    const currentUserId = parseInt(req.userId || '0');

    // Validierung
    if (!['arl', 'eps', 'pension', 'caja'].includes(type)) {
      return res.status(400).json({ message: 'Ungültiger Typ' });
    }

    // Prüfe Berechtigung: Nur Legal oder Admin
    const hasAccess = await isLegalOrAdmin(req);
    if (!hasAccess) {
      return res.status(403).json({ message: 'Keine Berechtigung - nur Legal oder Admin' });
    }

    const { status, number, provider, registrationDate, notes } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status ist erforderlich' });
    }

    const updated = await LifecycleService.updateSocialSecurityStatus(
      userId,
      type,
      {
        status,
        number,
        provider,
        registrationDate: registrationDate ? new Date(registrationDate) : undefined,
        notes
      },
      currentUserId
    );

    res.json(updated);
  } catch (error) {
    console.error('Error in updateSocialSecurity:', error);
    res.status(500).json({
      message: 'Fehler beim Aktualisieren des Sozialversicherungs-Status',
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    });
  }
};

/**
 * Ruft alle Arbeitszeugnisse eines Users ab
 * GET /api/users/:id/lifecycle/certificates
 */
export const getCertificates = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const currentUserId = parseInt(req.userId || '0');

    // Prüfe Berechtigung: User selbst oder HR/Admin
    if (userId !== currentUserId) {
      const hasAccess = await isHROrAdmin(req);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Keine Berechtigung' });
      }
    }

    let certificates = await LifecycleService.getCertificates(userId);

    // Falls kein Lifecycle existiert, erstelle einen automatisch
    if (certificates === null) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          include: {
            roles: {
              where: { lastUsed: true },
              take: 1,
              include: {
                role: {
                  include: {
                    organization: {
                      select: { id: true }
                    }
                  }
                }
              }
            }
          }
        });

        if (user && user.roles.length > 0) {
          const organizationId = user.roles[0].role.organization?.id;
          if (organizationId) {
            await LifecycleService.createLifecycle(userId, organizationId);
            certificates = await LifecycleService.getCertificates(userId);
          }
        }
      } catch (createError) {
        console.error('Error creating lifecycle:', createError);
      }
    }

    if (certificates === null) {
      return res.status(404).json({ message: 'Lebenszyklus nicht gefunden. Bitte kontaktieren Sie HR.' });
    }

    res.json({ certificates });
  } catch (error) {
    console.error('Error in getCertificates:', error);
    res.status(500).json({
      message: 'Fehler beim Abrufen der Arbeitszeugnisse',
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    });
  }
};

/**
 * Ruft ein einzelnes Arbeitszeugnis ab
 * GET /api/users/:id/lifecycle/certificates/:certId
 */
export const getCertificate = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const certificateId = parseInt(req.params.certId);
    const currentUserId = parseInt(req.userId || '0');

    // Prüfe Berechtigung: User selbst oder HR/Admin
    if (userId !== currentUserId) {
      const hasAccess = await isHROrAdmin(req);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Keine Berechtigung' });
      }
    }

    const certificate = await LifecycleService.getCertificate(userId, certificateId);

    if (!certificate) {
      return res.status(404).json({ message: 'Arbeitszeugnis nicht gefunden' });
    }

    res.json(certificate);
  } catch (error) {
    console.error('Error in getCertificate:', error);
    res.status(500).json({
      message: 'Fehler beim Abrufen des Arbeitszeugnisses',
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    });
  }
};

/**
 * Erstellt ein neues Arbeitszeugnis
 * POST /api/users/:id/lifecycle/certificates
 */
export const createCertificate = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const currentUserId = parseInt(req.userId || '0');

    // Prüfe Berechtigung: Nur HR oder Admin
    const hasAccess = await isHROrAdmin(req);
    if (!hasAccess) {
      return res.status(403).json({ message: 'Keine Berechtigung - nur HR oder Admin' });
    }

    const { certificateType, templateUsed, templateVersion, pdfPath, customText } = req.body;

    // pdfPath ist jetzt optional - wird automatisch generiert falls nicht angegeben
    const certificate = await LifecycleService.createCertificate(
      userId,
      {
        certificateType,
        templateUsed,
        templateVersion,
        pdfPath, // Optional: Falls angegeben, wird dieses verwendet
        customText // Optional: Vom HR bearbeiteter Text
      },
      currentUserId
    );

    res.status(201).json(certificate);
  } catch (error) {
    console.error('Error in createCertificate:', error);
    res.status(500).json({
      message: 'Fehler beim Erstellen des Arbeitszeugnisses',
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    });
  }
};

/**
 * Aktualisiert ein Arbeitszeugnis
 * PUT /api/users/:id/lifecycle/certificates/:certId
 */
export const updateCertificate = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const certificateId = parseInt(req.params.certId);
    const currentUserId = parseInt(req.userId || '0');

    // Prüfe Berechtigung: Nur HR oder Admin
    const hasAccess = await isHROrAdmin(req);
    if (!hasAccess) {
      return res.status(403).json({ message: 'Keine Berechtigung - nur HR oder Admin' });
    }

    const { pdfPath, templateVersion } = req.body;

    const updated = await LifecycleService.updateCertificate(
      userId,
      certificateId,
      {
        pdfPath,
        templateVersion
      },
      currentUserId
    );

    res.json(updated);
  } catch (error) {
    console.error('Error in updateCertificate:', error);
    res.status(500).json({
      message: 'Fehler beim Aktualisieren des Arbeitszeugnisses',
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    });
  }
};

/**
 * Lädt ein Arbeitszeugnis herunter
 * GET /api/users/:id/lifecycle/certificates/:certId/download
 */
export const downloadCertificate = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const certificateId = parseInt(req.params.certId);
    const currentUserId = parseInt(req.userId || '0');

    // Prüfe Berechtigung: User selbst oder HR/Admin
    if (userId !== currentUserId) {
      const hasAccess = await isHROrAdmin(req);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Keine Berechtigung' });
      }
    }

    const certificate = await LifecycleService.getCertificate(userId, certificateId);

    if (!certificate) {
      return res.status(404).json({ message: 'Arbeitszeugnis nicht gefunden' });
    }

    const filePath = path.join(CERTIFICATES_DIR, certificate.pdfPath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'PDF-Datei nicht gefunden' });
    }

    // PDF bereitstellen - inline für Vorschau, attachment für Download
    const isPreview = req.query.preview === 'true';
    res.setHeader('Content-Type', 'application/pdf');
    if (isPreview) {
      res.setHeader('Content-Disposition', `inline; filename="certificado-laboral-${certificateId}.pdf"`);
    } else {
      res.setHeader('Content-Disposition', `attachment; filename="certificado-laboral-${certificateId}.pdf"`);
    }
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error('Error in downloadCertificate:', error);
    res.status(500).json({
      message: 'Fehler beim Herunterladen des Arbeitszeugnisses',
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    });
  }
};

/**
 * Ruft alle Arbeitsverträge eines Users ab
 * GET /api/users/:id/lifecycle/contracts
 */
export const getContracts = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const currentUserId = parseInt(req.userId || '0');

    // Prüfe Berechtigung: User selbst oder HR/Admin
    if (userId !== currentUserId) {
      const hasAccess = await isHROrAdmin(req);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Keine Berechtigung' });
      }
    }

    let contracts = await LifecycleService.getContracts(userId);

    // Falls kein Lifecycle existiert, erstelle einen automatisch
    if (contracts === null) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          include: {
            roles: {
              where: { lastUsed: true },
              take: 1,
              include: {
                role: {
                  include: {
                    organization: {
                      select: { id: true }
                    }
                  }
                }
              }
            }
          }
        });

        if (user && user.roles.length > 0) {
          const organizationId = user.roles[0].role.organization?.id;
          if (organizationId) {
            await LifecycleService.createLifecycle(userId, organizationId);
            contracts = await LifecycleService.getContracts(userId);
          }
        }
      } catch (createError) {
        console.error('Error creating lifecycle:', createError);
      }
    }

    if (contracts === null) {
      return res.status(404).json({ message: 'Lebenszyklus nicht gefunden. Bitte kontaktieren Sie HR.' });
    }

    res.json({ contracts });
  } catch (error) {
    console.error('Error in getContracts:', error);
    res.status(500).json({
      message: 'Fehler beim Abrufen der Arbeitsverträge',
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    });
  }
};

/**
 * Ruft einen einzelnen Arbeitsvertrag ab
 * GET /api/users/:id/lifecycle/contracts/:contractId
 */
export const getContract = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const contractId = parseInt(req.params.contractId);
    const currentUserId = parseInt(req.userId || '0');

    // Prüfe Berechtigung: User selbst oder HR/Admin
    if (userId !== currentUserId) {
      const hasAccess = await isHROrAdmin(req);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Keine Berechtigung' });
      }
    }

    const contract = await LifecycleService.getContract(userId, contractId);

    if (!contract) {
      return res.status(404).json({ message: 'Arbeitsvertrag nicht gefunden' });
    }

    res.json(contract);
  } catch (error) {
    console.error('Error in getContract:', error);
    res.status(500).json({
      message: 'Fehler beim Abrufen des Arbeitsvertrags',
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    });
  }
};

/**
 * Erstellt einen neuen Arbeitsvertrag
 * POST /api/users/:id/lifecycle/contracts
 */
export const createContract = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const currentUserId = parseInt(req.userId || '0');

    // Prüfe Berechtigung: Nur HR oder Admin
    const hasAccess = await isHROrAdmin(req);
    if (!hasAccess) {
      return res.status(403).json({ message: 'Keine Berechtigung - nur HR oder Admin' });
    }

    const {
      contractType,
      startDate,
      endDate,
      salary,
      workingHours,
      position,
      templateUsed,
      templateVersion,
      pdfPath,
      customText
    } = req.body;

    if (!startDate) {
      return res.status(400).json({ message: 'Startdatum ist erforderlich' });
    }

    // pdfPath ist jetzt optional - wird automatisch generiert falls nicht angegeben
    const contract = await LifecycleService.createContract(
      userId,
      {
        contractType,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : undefined,
        salary,
        workingHours,
        position,
        templateUsed,
        templateVersion,
        pdfPath, // Optional: Falls angegeben, wird dieses verwendet
        customText // Optional: Vom HR bearbeiteter Text
      },
      currentUserId
    );

    res.status(201).json(contract);
  } catch (error) {
    console.error('Error in createContract:', error);
    res.status(500).json({
      message: 'Fehler beim Erstellen des Arbeitsvertrags',
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    });
  }
};

/**
 * Aktualisiert einen Arbeitsvertrag
 * PUT /api/users/:id/lifecycle/contracts/:contractId
 */
export const updateContract = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const contractId = parseInt(req.params.contractId);
    const currentUserId = parseInt(req.userId || '0');

    // Prüfe Berechtigung: Nur HR oder Admin
    const hasAccess = await isHROrAdmin(req);
    if (!hasAccess) {
      return res.status(403).json({ message: 'Keine Berechtigung - nur HR oder Admin' });
    }

    const {
      startDate,
      endDate,
      salary,
      workingHours,
      position,
      pdfPath,
      templateVersion
    } = req.body;

    const updated = await LifecycleService.updateContract(
      userId,
      contractId,
      {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : undefined,
        salary,
        workingHours,
        position,
        pdfPath,
        templateVersion
      },
      currentUserId
    );

    res.json(updated);
  } catch (error) {
    console.error('Error in updateContract:', error);
    res.status(500).json({
      message: 'Fehler beim Aktualisieren des Arbeitsvertrags',
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    });
  }
};

/**
 * Lädt einen Arbeitsvertrag herunter
 * GET /api/users/:id/lifecycle/contracts/:contractId/download
 */
export const downloadContract = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const contractId = parseInt(req.params.contractId);
    const currentUserId = parseInt(req.userId || '0');

    // Prüfe Berechtigung: User selbst oder HR/Admin
    if (userId !== currentUserId) {
      const hasAccess = await isHROrAdmin(req);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Keine Berechtigung' });
      }
    }

    const contract = await LifecycleService.getContract(userId, contractId);

    if (!contract) {
      return res.status(404).json({ message: 'Arbeitsvertrag nicht gefunden' });
    }

    const filePath = path.join(CONTRACTS_DIR, contract.pdfPath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'PDF-Datei nicht gefunden' });
    }

    // PDF bereitstellen - inline für Vorschau, attachment für Download
    const isPreview = req.query.preview === 'true';
    res.setHeader('Content-Type', 'application/pdf');
    if (isPreview) {
      res.setHeader('Content-Disposition', `inline; filename="contrato-trabajo-${contractId}.pdf"`);
    } else {
      res.setHeader('Content-Disposition', `attachment; filename="contrato-trabajo-${contractId}.pdf"`);
    }
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error('Error in downloadContract:', error);
    res.status(500).json({
      message: 'Fehler beim Herunterladen des Arbeitsvertrags',
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    });
  }
};


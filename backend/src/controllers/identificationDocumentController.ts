import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

// Konfiguration für Datei-Upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../../uploads/documents');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `document-${req.params.userId}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ 
  storage, 
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB Limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Ungültiger Dateityp. Nur PDF, JPEG und PNG sind erlaubt.') as any);
    }
  }
});

// Dokument hinzufügen
export const addDocument = async (req: Request, res: Response) => {
  try {
    upload.single('documentFile')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      const userId = parseInt(req.params.userId);
      const { documentType, documentNumber, issueDate, expiryDate, issuingCountry, issuingAuthority, imageData } = req.body;
      
      // Validierung
      if (!documentType || !documentNumber || !issuingCountry) {
        return res.status(400).json({ error: 'Dokumenttyp, Dokumentnummer und ausstellendes Land sind erforderlich' });
      }

      // Prüfen, ob bereits ein Dokument dieses Typs für den Benutzer existiert
      const existingDoc = await prisma.identificationDocument.findFirst({
        where: {
          userId,
          documentType
        }
      });

      if (existingDoc) {
        return res.status(400).json({ error: `Der Benutzer hat bereits ein Dokument vom Typ ${documentType}` });
      }

      let documentFilePath = null;

      // Datei von Upload
      if (req.file) {
        documentFilePath = req.file.path.replace(/\\/g, '/');
      } 
      // Bild von Kamera (base64)
      else if (imageData) {
        try {
          const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');
          
          const fileName = `document-${userId}-${Date.now()}.jpg`;
          const filePath = path.join(__dirname, '../../../uploads/documents', fileName);
          
          fs.writeFileSync(filePath, buffer);
          documentFilePath = filePath.replace(/\\/g, '/');
        } catch (error) {
          console.error('Fehler beim Speichern des Kamerabilds:', error);
          return res.status(500).json({ error: 'Fehler beim Speichern des Bildes' });
        }
      }

      const documentData = {
        userId,
        documentType,
        documentNumber,
        issueDate: issueDate ? new Date(issueDate) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        issuingCountry,
        issuingAuthority,
        documentFile: documentFilePath,
        isVerified: false
      };

      const document = await prisma.identificationDocument.create({
        data: documentData
      });

      res.status(201).json(document);
    });
  } catch (error) {
    console.error('Fehler beim Hinzufügen eines Dokuments:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// Alle Dokumente eines Benutzers abrufen
export const getUserDocuments = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    
    const documents = await prisma.identificationDocument.findMany({
      where: { userId }
    });
    
    res.json(documents);
  } catch (error) {
    console.error('Fehler beim Abrufen der Dokumente:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// Dokument aktualisieren
export const updateDocument = async (req: Request, res: Response) => {
  try {
    upload.single('documentFile')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      const docId = parseInt(req.params.docId);
      const { documentNumber, issueDate, expiryDate, issuingCountry, issuingAuthority, imageData } = req.body;
      
      const existingDoc = await prisma.identificationDocument.findUnique({
        where: { id: docId }
      });
      
      if (!existingDoc) {
        return res.status(404).json({ error: 'Dokument nicht gefunden' });
      }
      
      const updateData: any = {};
      
      if (documentNumber) updateData.documentNumber = documentNumber;
      if (issueDate) updateData.issueDate = new Date(issueDate);
      if (expiryDate) updateData.expiryDate = new Date(expiryDate);
      if (issuingCountry) updateData.issuingCountry = issuingCountry;
      if (issuingAuthority) updateData.issuingAuthority = issuingAuthority;
      
      // Neue Datei von Upload
      if (req.file) {
        updateData.documentFile = req.file.path.replace(/\\/g, '/');
      } 
      // Neues Bild von Kamera (base64)
      else if (imageData) {
        try {
          const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');
          
          const fileName = `document-${existingDoc.userId}-${Date.now()}.jpg`;
          const filePath = path.join(__dirname, '../../../uploads/documents', fileName);
          
          fs.writeFileSync(filePath, buffer);
          updateData.documentFile = filePath.replace(/\\/g, '/');
        } catch (error) {
          console.error('Fehler beim Speichern des Kamerabilds:', error);
          return res.status(500).json({ error: 'Fehler beim Speichern des Bildes' });
        }
      }
      
      // Setze Verifizierungsstatus zurück, wenn relevante Daten geändert wurden
      if (documentNumber || issueDate || expiryDate || req.file || imageData) {
        updateData.isVerified = false;
        updateData.verificationDate = null;
        updateData.verifiedBy = null;
      }
      
      const document = await prisma.identificationDocument.update({
        where: { id: docId },
        data: updateData
      });
      
      res.json(document);
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Dokuments:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// Dokument löschen
export const deleteDocument = async (req: Request, res: Response) => {
  try {
    const docId = parseInt(req.params.docId);
    
    const document = await prisma.identificationDocument.findUnique({
      where: { id: docId }
    });
    
    if (!document) {
      return res.status(404).json({ error: 'Dokument nicht gefunden' });
    }
    
    // Wenn eine Datei existiert, lösche sie
    if (document.documentFile) {
      const filePath = document.documentFile;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    await prisma.identificationDocument.delete({
      where: { id: docId }
    });
    
    res.json({ message: 'Dokument erfolgreich gelöscht' });
  } catch (error) {
    console.error('Fehler beim Löschen des Dokuments:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// Dokument verifizieren (nur für Administratoren)
export const verifyDocument = async (req: Request, res: Response) => {
  try {
    const docId = parseInt(req.params.docId);
    const adminId = parseInt(req.body.adminId);
    
    const document = await prisma.identificationDocument.findUnique({
      where: { id: docId }
    });
    
    if (!document) {
      return res.status(404).json({ error: 'Dokument nicht gefunden' });
    }
    
    await prisma.identificationDocument.update({
      where: { id: docId },
      data: {
        isVerified: true,
        verificationDate: new Date(),
        verifiedBy: adminId
      }
    });
    
    res.json({ message: 'Dokument erfolgreich verifiziert' });
  } catch (error) {
    console.error('Fehler bei der Dokumentenverifizierung:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// Dokument-Datei herunterladen
export const downloadDocument = async (req: Request, res: Response) => {
  try {
    const docId = parseInt(req.params.docId);
    
    const document = await prisma.identificationDocument.findUnique({
      where: { id: docId }
    });
    
    if (!document || !document.documentFile) {
      return res.status(404).json({ error: 'Dokument oder Datei nicht gefunden' });
    }
    
    const filePath = document.documentFile;
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Datei nicht gefunden' });
    }
    
    res.download(filePath);
  } catch (error) {
    console.error('Fehler beim Herunterladen des Dokuments:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
}; 
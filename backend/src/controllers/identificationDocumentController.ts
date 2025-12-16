import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { TaskAutomationService } from '../services/taskAutomationService';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { createNotificationIfEnabled } from './notificationController';
import { NotificationType } from '@prisma/client';
import { getUserNotificationText, getUserLanguage } from '../utils/translations';

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
      const { documentType, documentNumber, issueDate, expiryDate, issuingCountry, issuingAuthority, imageData, firstName, lastName, birthday, gender, country } = req.body;
      
      // #region agent log
      logger.log('[DEBUG] Request body received', { hasFirstName: !!firstName, hasLastName: !!lastName, hasBirthday: !!birthday, hasGender: !!gender, hasCountry: !!country, isFormData: req.headers['content-type']?.includes('multipart/form-data') || false });
      // #endregion
      
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
          logger.error('Fehler beim Speichern des Kamerabilds:', error);
          return res.status(500).json({ error: 'Fehler beim Speichern des Bildes' });
        }
      }

      // User-Daten aus Request übernehmen (auch ohne Bild, VOR AI-Erkennung)
      const userUpdateDataFromRequest: any = {};
      if (firstName) userUpdateDataFromRequest.firstName = firstName;
      if (lastName) userUpdateDataFromRequest.lastName = lastName;
      if (birthday) userUpdateDataFromRequest.birthday = new Date(birthday);
      if (gender && ['male', 'female', 'other'].includes(gender)) {
        userUpdateDataFromRequest.gender = gender;
      }
      if (country) {
        // Validiere Country-Code
        if (['CO', 'CH', 'DE', 'AT'].includes(country)) {
          userUpdateDataFromRequest.country = country;
        }
      }

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4b31729e-838f-41ed-a421-2153ac4e6c3c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'identificationDocumentController.ts:106',message:'User update data prepared',data:{updateDataKeys:Object.keys(userUpdateDataFromRequest),updateDataCount:Object.keys(userUpdateDataFromRequest).length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

      // Update User, falls Daten vorhanden (VOR AI-Erkennung)
      if (Object.keys(userUpdateDataFromRequest).length > 0) {
        await prisma.user.update({
          where: { id: userId },
          data: userUpdateDataFromRequest
        });
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4b31729e-838f-41ed-a421-2153ac4e6c3c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'identificationDocumentController.ts:113',message:'User updated with request data',data:{userId,updatedFields:Object.keys(userUpdateDataFromRequest)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        logger.log(`[addDocument] User ${userId} aktualisiert mit User-Daten aus Request:`, userUpdateDataFromRequest);
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
      
      // #region agent log
      logger.log('[DEBUG] Document created in DB', { documentId: document.id, userId, documentType: document.documentType });
      // #endregion

      // Automatische Extraktion und User-Update (nur wenn imageData vorhanden)
      if (imageData || req.file) {
        try {
          // Konvertiere Datei zu base64, falls nötig
          let imageBase64: string | null = null;
          if (imageData) {
            imageBase64 = imageData;
          } else if (req.file) {
            const fileBuffer = fs.readFileSync(req.file.path);
            const mimeType = req.file.mimetype;
            imageBase64 = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
          }

          if (imageBase64) {
            // Rufe Dokumentenerkennung auf
            const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
            if (OPENAI_API_KEY) {
              try {
                const recognitionResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
                  model: "gpt-4o",
                  messages: [
                    {
                      role: "system",
                      content: "Du bist ein Experte für Dokumentenerkennung. Extrahiere alle relevanten Informationen aus dem Ausweisdokument und gib die Daten in einem strukturierten JSON-Format zurück. Beachte folgende Felder: documentType (mögliche Werte: passport für Reisepass, national_id für Personalausweis/ID-Karte - erkenne automatisch ob es ein Reisepass oder Personalausweis ist), documentNumber, issueDate (ISO-Format YYYY-MM-DD), expiryDate (ISO-Format YYYY-MM-DD), issuingCountry, issuingAuthority, firstName, lastName, birthday (ISO-Format YYYY-MM-DD - WICHTIG: Extrahiere das Geburtsdatum genau und vollständig, z.B. 1990-05-15), gender (mögliche Werte: male, female, other oder null falls nicht erkennbar). Für kolumbianische Dokumente (Cédula): Extrahiere auch firstName, lastName, birthday und gender falls möglich."
                    },
                    {
                      role: "user",
                      content: [
                        {
                          type: "text",
                          text: `Analysiere dieses Ausweisdokument und extrahiere alle relevanten Daten in ein strukturiertes JSON-Format. Es handelt sich um ein Dokument vom Typ: ${documentType}.`
                        },
                        {
                          type: "image_url",
                          image_url: { url: imageBase64 }
                        }
                      ]
                    }
                  ],
                  max_tokens: 1000
                }, {
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`
                  }
                });

                const aiResponse = recognitionResponse.data.choices[0].message.content;
                let recognizedData: any = {};
                
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/4b31729e-838f-41ed-a421-2153ac4e6c3c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'identificationDocumentController.ts:191',message:'Backend AI response received',data:{responseLength:aiResponse?.length||0,responseStart:aiResponse?.substring(0,200)||'null',startsWithBrace:aiResponse?.trim().startsWith('{')||false},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                // #endregion
                
                try {
                  if (aiResponse.trim().startsWith('{')) {
                    recognizedData = JSON.parse(aiResponse);
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/4b31729e-838f-41ed-a421-2153ac4e6c3c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'identificationDocumentController.ts:196',message:'Backend JSON parsed directly',data:{hasFirstName:!!recognizedData.firstName,hasLastName:!!recognizedData.lastName,hasBirthday:!!recognizedData.birthday},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                    // #endregion
                  } else {
                    const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/) || 
                                      aiResponse.match(/```\n([\s\S]*?)\n```/) ||
                                      aiResponse.match(/\{[\s\S]*\}/);
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/4b31729e-838f-41ed-a421-2153ac4e6c3c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'identificationDocumentController.ts:198',message:'Backend JSON match attempt',data:{hasMatch:!!jsonMatch},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                    // #endregion
                    if (jsonMatch) {
                      recognizedData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
                      // #region agent log
                      fetch('http://127.0.0.1:7242/ingest/4b31729e-838f-41ed-a421-2153ac4e6c3c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'identificationDocumentController.ts:201',message:'Backend JSON parsed from match',data:{hasFirstName:!!recognizedData.firstName,hasLastName:!!recognizedData.lastName,hasBirthday:!!recognizedData.birthday},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                      // #endregion
                    }
                  }
                } catch (parseError) {
                  // #region agent log
                  fetch('http://127.0.0.1:7242/ingest/4b31729e-838f-41ed-a421-2153ac4e6c3c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'identificationDocumentController.ts:204',message:'Backend JSON parse error',data:{error:parseError instanceof Error?parseError.message:'unknown'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                  // #endregion
                  logger.error('Fehler beim Parsen der KI-Antwort:', parseError);
                }

                // Update User-Felder mit erkannten Daten
                const userUpdateData: any = {};
                if (recognizedData.firstName) userUpdateData.firstName = recognizedData.firstName;
                if (recognizedData.lastName) userUpdateData.lastName = recognizedData.lastName;
                if (recognizedData.birthday) userUpdateData.birthday = new Date(recognizedData.birthday);
                if (recognizedData.gender && ['male', 'female', 'other'].includes(recognizedData.gender)) {
                  userUpdateData.gender = recognizedData.gender;
                }
                if (recognizedData.documentNumber) userUpdateData.identificationNumber = recognizedData.documentNumber;
                
                // Setze country aus issuingCountry (falls vorhanden)
                // issuingCountry kann direkt im recognizedData sein oder aus dem manuell eingegebenen Dokument
                const countryToMap = recognizedData.issuingCountry || issuingCountry;
                if (countryToMap) {
                  // Mappe issuingCountry zu country-Code (z.B. "Colombia" -> "CO", "Switzerland" -> "CH")
                  const countryMapping: Record<string, string> = {
                    'Colombia': 'CO',
                    'CO': 'CO',
                    'Switzerland': 'CH',
                    'CH': 'CH',
                    'Swiss': 'CH',
                    'Germany': 'DE',
                    'DE': 'DE',
                    'Deutschland': 'DE',
                    'Austria': 'AT',
                    'AT': 'AT',
                    'Österreich': 'AT'
                  };
                  
                  const issuingCountryStr = countryToMap.toString().trim();
                  const mappedCountry = countryMapping[issuingCountryStr] || issuingCountryStr.toUpperCase();
                  
                  // Validiere, dass es ein gültiger Country-Code ist
                  if (['CO', 'CH', 'DE', 'AT'].includes(mappedCountry)) {
                    userUpdateData.country = mappedCountry;
                    logger.log(`[addDocument] Country aus issuingCountry erkannt: ${issuingCountryStr} -> ${mappedCountry}`);
                  }
                }

                // Update User, falls Daten erkannt wurden
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/4b31729e-838f-41ed-a421-2153ac4e6c3c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'identificationDocumentController.ts:238',message:'Backend user update data prepared from AI',data:{updateDataKeys:Object.keys(userUpdateData),updateDataCount:Object.keys(userUpdateData).length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                // #endregion
                if (Object.keys(userUpdateData).length > 0) {
                  await prisma.user.update({
                    where: { id: userId },
                    data: userUpdateData
                  });
                  // #region agent log
                  fetch('http://127.0.0.1:7242/ingest/4b31729e-838f-41ed-a421-2153ac4e6c3c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'identificationDocumentController.ts:241',message:'Backend user updated with AI data',data:{userId,updatedFields:Object.keys(userUpdateData)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                  // #endregion
                  logger.log(`[addDocument] User ${userId} aktualisiert mit erkannten Daten:`, userUpdateData);
                }

                // Prüfe Organisation und erstelle Admin-Task für Kolumbien
                const user = await prisma.user.findUnique({
                  where: { id: userId },
                  include: {
                    roles: {
                      include: {
                        role: {
                          include: {
                            organization: {
                              select: { id: true, country: true }
                            }
                          }
                        }
                      }
                    }
                  }
                });

                // Finde Organisation des Users (erste Rolle mit Organisation)
                const userOrganization = user?.roles.find(r => r.role.organization)?.role.organization;
                if (userOrganization && userOrganization.country === 'CO') {
                  // Erstelle Admin-Onboarding-Task
                  await TaskAutomationService.createAdminOnboardingTask(userId, userOrganization.id);
                  
                  // Markiere Identitätsdokument-To-Do als erledigt, falls vorhanden
                  try {
                    const identificationDocumentTask = await prisma.task.findFirst({
                      where: {
                        organizationId: userOrganization.id,
                        responsibleId: userId,
                        OR: [
                          { title: { contains: 'Subir documento de identidad' } },
                          { title: { contains: 'Identitätsdokument hochladen' } }
                        ],
                        status: { not: 'done' }
                      }
                    });
                    
                    if (identificationDocumentTask) {
                      await prisma.task.update({
                        where: { id: identificationDocumentTask.id },
                        data: { status: 'done' }
                      });
                      logger.log(`[addDocument] Identitätsdokument-To-Do als erledigt markiert: Task ID ${identificationDocumentTask.id} für User ${userId}`);
                    }
                  } catch (taskUpdateError) {
                    logger.error('[addDocument] Fehler beim Markieren des Identitätsdokument-To-Dos als erledigt:', taskUpdateError);
                    // Fehler blockiert nicht die Dokumentenerstellung
                  }
                }
              } catch (recognitionError) {
                logger.error('[addDocument] Fehler bei automatischer Dokumentenerkennung:', recognitionError);
                // Fehler blockiert nicht die Dokumentenerstellung
              }
            }
          }
        } catch (error) {
          logger.error('[addDocument] Fehler bei automatischer Verarbeitung:', error);
          // Fehler blockiert nicht die Dokumentenerstellung
        }
      }

      // Notification für User-Update erstellen
      try {
        const language = await getUserLanguage(userId);
        const notificationText = getUserNotificationText(language, 'updated', true);
        
        await createNotificationIfEnabled({
          userId: userId,
          title: notificationText.title,
          message: notificationText.message,
          type: NotificationType.user,
          relatedEntityId: userId,
          relatedEntityType: 'update'
        });
      } catch (notificationError) {
        logger.error('[addDocument] Fehler beim Erstellen der Notification:', notificationError);
        // Fehler blockiert nicht die Dokumentenerstellung
      }

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4b31729e-838f-41ed-a421-2153ac4e6c3c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'identificationDocumentController.ts:359',message:'Sending document response',data:{documentId:document.id,userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
      // #endregion
      
      res.status(201).json(document);
    });
  } catch (error) {
    logger.error('Fehler beim Hinzufügen eines Dokuments:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// Alle Dokumente eines Benutzers abrufen
export const getUserDocuments = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    
    // #region agent log
    logger.log('[DEBUG] getUserDocuments called', { userId });
    // #endregion
    
    const documents = await prisma.identificationDocument.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    
    // #region agent log
    logger.log('[DEBUG] getUserDocuments result', { userId, docCount: documents.length, docIds: documents.map(d => d.id) });
    // #endregion
    
    res.json(documents);
  } catch (error) {
    logger.error('Fehler beim Abrufen der Dokumente:', error);
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
          logger.error('Fehler beim Speichern des Kamerabilds:', error);
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
    logger.error('Fehler beim Aktualisieren des Dokuments:', error);
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
    logger.error('Fehler beim Löschen des Dokuments:', error);
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
    logger.error('Fehler bei der Dokumentenverifizierung:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// Dokument-Datei herunterladen oder anzeigen
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
    
    // Dateiname aus Pfad extrahieren
    const fileName = path.basename(filePath);
    
    // MIME-Typ basierend auf Dateiendung bestimmen
    const ext = path.extname(filePath).toLowerCase();
    let mimeType = 'application/octet-stream';
    if (ext === '.pdf') {
      mimeType = 'application/pdf';
    } else if (['.jpg', '.jpeg'].includes(ext)) {
      mimeType = 'image/jpeg';
    } else if (ext === '.png') {
      mimeType = 'image/png';
    } else if (ext === '.gif') {
      mimeType = 'image/gif';
    }
    
    // Prüfe ob Preview-Modus (inline) oder Download-Modus
    const isPreview = req.query.preview === 'true';
    
    if (isPreview || mimeType.startsWith('image/') || mimeType === 'application/pdf') {
      // Datei inline anzeigen (für iframe-Vorschau)
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
      res.setHeader('Cache-Control', 'max-age=31536000'); // 1 Jahr cachen
      fs.createReadStream(filePath).pipe(res);
    } else {
      // Andere Dateien als Download anbieten
      res.download(filePath, fileName);
    }
  } catch (error) {
    logger.error('Fehler beim Herunterladen des Dokuments:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
}; 
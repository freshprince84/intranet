import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

// Upload-Verzeichnis für Attachments
const UPLOAD_DIR = path.join(__dirname, '../../uploads/task-attachments');

// Stelle sicher, dass das Upload-Verzeichnis existiert
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Attachment zu einem Task hinzufügen
export const addAttachment = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'Keine Datei hochgeladen' });
    }

    // Generiere einen eindeutigen Dateinamen
    const uniqueFileName = `${uuidv4()}${path.extname(file.originalname)}`;
    const filePath = path.join(UPLOAD_DIR, uniqueFileName);

    // Speichere die Datei
    fs.writeFileSync(filePath, file.buffer);

    // Erstelle den Attachment-Eintrag in der Datenbank
    const attachment = await prisma.taskAttachment.create({
      data: {
        taskId: parseInt(taskId),
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        filePath: uniqueFileName,
      },
    });

    res.status(201).json(attachment);
  } catch (error) {
    console.error('Fehler beim Hochladen der Datei:', error);
    res.status(500).json({ message: 'Fehler beim Hochladen der Datei' });
  }
};

// Alle Attachments eines Tasks abrufen
export const getTaskAttachments = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const attachments = await prisma.taskAttachment.findMany({
      where: {
        taskId: parseInt(taskId),
      },
      orderBy: {
        uploadedAt: 'desc',
      },
    });
    res.json(attachments);
  } catch (error) {
    console.error('Fehler beim Abrufen der Attachments:', error);
    res.status(500).json({ message: 'Fehler beim Abrufen der Attachments' });
  }
};

// Einzelnes Attachment abrufen
export const getAttachment = async (req: Request, res: Response) => {
  try {
    // Für Anhänge verzichten wir auf Authentifizierung, damit Bilder auch in der Vorschau angezeigt werden können
    // Diese Route sollte öffentlich sein, da die Anhang-ID und Task-ID als ausreichender Schutz dienen
    
    const { taskId, attachmentId } = req.params;
    const attachment = await prisma.taskAttachment.findFirst({
      where: {
        id: parseInt(attachmentId),
        taskId: parseInt(taskId),
      },
    });

    if (!attachment) {
      return res.status(404).json({ message: 'Attachment nicht gefunden' });
    }

    const filePath = path.join(UPLOAD_DIR, attachment.filePath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Datei nicht gefunden' });
    }

    // Entscheide basierend auf dem MIME-Typ, wie die Datei bereitgestellt wird
    if (attachment.fileType.startsWith('image/')) {
      // Bilder direkt anzeigen mit Cache-Kontrolle
      res.setHeader('Content-Type', attachment.fileType);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(attachment.fileName)}"`);
      res.setHeader('Cache-Control', 'max-age=31536000'); // 1 Jahr cachen
      fs.createReadStream(filePath).pipe(res);
    } else {
      // Andere Dateien als Download anbieten
      res.download(filePath, attachment.fileName);
    }
  } catch (error) {
    console.error('Fehler beim Abrufen des Attachments:', error);
    res.status(500).json({ message: 'Fehler beim Abrufen des Attachments' });
  }
};

// Attachment löschen
export const deleteAttachment = async (req: Request, res: Response) => {
  try {
    const { taskId, attachmentId } = req.params;
    const attachment = await prisma.taskAttachment.findFirst({
      where: {
        id: parseInt(attachmentId),
        taskId: parseInt(taskId),
      },
    });

    if (!attachment) {
      return res.status(404).json({ message: 'Attachment nicht gefunden' });
    }

    // Lösche die physische Datei
    const filePath = path.join(UPLOAD_DIR, attachment.filePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Lösche den Datenbankeintrag
    await prisma.taskAttachment.delete({
      where: {
        id: parseInt(attachmentId),
      },
    });

    res.json({ message: 'Attachment erfolgreich gelöscht' });
  } catch (error) {
    console.error('Fehler beim Löschen des Attachments:', error);
    res.status(500).json({ message: 'Fehler beim Löschen des Attachments' });
  }
}; 
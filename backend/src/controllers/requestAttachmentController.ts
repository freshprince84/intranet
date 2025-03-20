import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

// Upload-Verzeichnis für Anhänge
const UPLOAD_DIR = path.join(__dirname, '../../uploads/request-attachments');

// Stelle sicher, dass das Upload-Verzeichnis existiert
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Anhang zu einem Request hinzufügen
export const addAttachment = async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'Keine Datei hochgeladen' });
    }
    
    // Überprüfe, ob der Request existiert
    const requestExists = await prisma.request.findUnique({
      where: {
        id: parseInt(requestId)
      }
    });
    
    if (!requestExists) {
      return res.status(404).json({ message: 'Request nicht gefunden' });
    }

    // Generiere einen eindeutigen Dateinamen
    const uniqueFileName = `${uuidv4()}${path.extname(file.originalname)}`;
    const filePath = path.join(UPLOAD_DIR, uniqueFileName);

    // Speichere die Datei
    fs.writeFileSync(filePath, file.buffer);

    // Erstelle den Anhang-Eintrag in der Datenbank
    const attachment = await prisma.requestAttachment.create({
      data: {
        requestId: parseInt(requestId),
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

// Alle Anhänge eines Requests abrufen
export const getRequestAttachments = async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    
    // Überprüfe, ob der Request existiert
    const requestExists = await prisma.request.findUnique({
      where: {
        id: parseInt(requestId)
      }
    });
    
    if (!requestExists) {
      return res.status(404).json({ message: 'Request nicht gefunden' });
    }
    
    const attachments = await prisma.requestAttachment.findMany({
      where: {
        requestId: parseInt(requestId),
      },
      orderBy: {
        uploadedAt: 'desc',
      },
    });
    res.json(attachments);
  } catch (error) {
    console.error('Fehler beim Abrufen der Anhänge:', error);
    res.status(500).json({ message: 'Fehler beim Abrufen der Anhänge' });
  }
};

// Einzelnen Anhang abrufen
export const getAttachment = async (req: Request, res: Response) => {
  try {
    const { requestId, attachmentId } = req.params;
    const attachment = await prisma.requestAttachment.findFirst({
      where: {
        id: parseInt(attachmentId),
        requestId: parseInt(requestId),
      },
    });

    if (!attachment) {
      return res.status(404).json({ message: 'Anhang nicht gefunden' });
    }

    const filePath = path.join(UPLOAD_DIR, attachment.filePath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Datei nicht gefunden' });
    }

    res.download(filePath, attachment.fileName);
  } catch (error) {
    console.error('Fehler beim Abrufen des Anhangs:', error);
    res.status(500).json({ message: 'Fehler beim Abrufen des Anhangs' });
  }
};

// Anhang löschen
export const deleteAttachment = async (req: Request, res: Response) => {
  try {
    const { requestId, attachmentId } = req.params;
    const attachment = await prisma.requestAttachment.findFirst({
      where: {
        id: parseInt(attachmentId),
        requestId: parseInt(requestId),
      },
    });

    if (!attachment) {
      return res.status(404).json({ message: 'Anhang nicht gefunden' });
    }

    // Lösche die physische Datei
    const filePath = path.join(UPLOAD_DIR, attachment.filePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Lösche den Datenbankeintrag
    await prisma.requestAttachment.delete({
      where: {
        id: parseInt(attachmentId),
      },
    });

    res.json({ message: 'Anhang erfolgreich gelöscht' });
  } catch (error) {
    console.error('Fehler beim Löschen des Anhangs:', error);
    res.status(500).json({ message: 'Fehler beim Löschen des Anhangs' });
  }
}; 
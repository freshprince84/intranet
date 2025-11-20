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
exports.deleteAttachment = exports.getAttachment = exports.getTaskAttachments = exports.addAttachment = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const prisma_1 = require("../utils/prisma");
// Upload-Verzeichnis für Attachments
const UPLOAD_DIR = path_1.default.join(__dirname, '../../uploads/task-attachments');
// Stelle sicher, dass das Upload-Verzeichnis existiert
if (!fs_1.default.existsSync(UPLOAD_DIR)) {
    fs_1.default.mkdirSync(UPLOAD_DIR, { recursive: true });
}
// Attachment zu einem Task hinzufügen
const addAttachment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { taskId } = req.params;
        const file = req.file;
        if (!file) {
            return res.status(400).json({ message: 'Keine Datei hochgeladen' });
        }
        // Generiere einen eindeutigen Dateinamen
        const uniqueFileName = `${(0, uuid_1.v4)()}${path_1.default.extname(file.originalname)}`;
        const filePath = path_1.default.join(UPLOAD_DIR, uniqueFileName);
        // Speichere die Datei
        fs_1.default.writeFileSync(filePath, file.buffer);
        // Erstelle den Attachment-Eintrag in der Datenbank
        const attachment = yield prisma_1.prisma.taskAttachment.create({
            data: {
                taskId: parseInt(taskId),
                fileName: file.originalname,
                fileType: file.mimetype,
                fileSize: file.size,
                filePath: uniqueFileName,
            },
        });
        res.status(201).json(attachment);
    }
    catch (error) {
        console.error('Fehler beim Hochladen der Datei:', error);
        res.status(500).json({ message: 'Fehler beim Hochladen der Datei' });
    }
});
exports.addAttachment = addAttachment;
// Alle Attachments eines Tasks abrufen
const getTaskAttachments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { taskId } = req.params;
        const attachments = yield prisma_1.prisma.taskAttachment.findMany({
            where: {
                taskId: parseInt(taskId),
            },
            orderBy: {
                uploadedAt: 'desc',
            },
        });
        res.json(attachments);
    }
    catch (error) {
        console.error('Fehler beim Abrufen der Attachments:', error);
        res.status(500).json({ message: 'Fehler beim Abrufen der Attachments' });
    }
});
exports.getTaskAttachments = getTaskAttachments;
// Einzelnes Attachment abrufen
const getAttachment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Für Anhänge verzichten wir auf Authentifizierung, damit Bilder auch in der Vorschau angezeigt werden können
        // Diese Route sollte öffentlich sein, da die Anhang-ID und Task-ID als ausreichender Schutz dienen
        const { taskId, attachmentId } = req.params;
        const attachment = yield prisma_1.prisma.taskAttachment.findFirst({
            where: {
                id: parseInt(attachmentId),
                taskId: parseInt(taskId),
            },
        });
        if (!attachment) {
            return res.status(404).json({ message: 'Attachment nicht gefunden' });
        }
        const filePath = path_1.default.join(UPLOAD_DIR, attachment.filePath);
        if (!fs_1.default.existsSync(filePath)) {
            return res.status(404).json({ message: 'Datei nicht gefunden' });
        }
        // Entscheide basierend auf dem MIME-Typ, wie die Datei bereitgestellt wird
        if (attachment.fileType.startsWith('image/')) {
            // Bilder direkt anzeigen mit Cache-Kontrolle
            res.setHeader('Content-Type', attachment.fileType);
            res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(attachment.fileName)}"`);
            res.setHeader('Cache-Control', 'max-age=31536000'); // 1 Jahr cachen
            fs_1.default.createReadStream(filePath).pipe(res);
        }
        else if (attachment.fileType === 'application/pdf') {
            // PDFs direkt anzeigen (für iframe-Vorschau)
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(attachment.fileName)}"`);
            res.setHeader('Cache-Control', 'max-age=31536000'); // 1 Jahr cachen
            fs_1.default.createReadStream(filePath).pipe(res);
        }
        else {
            // Andere Dateien als Download anbieten
            res.download(filePath, attachment.fileName);
        }
    }
    catch (error) {
        console.error('Fehler beim Abrufen des Attachments:', error);
        res.status(500).json({ message: 'Fehler beim Abrufen des Attachments' });
    }
});
exports.getAttachment = getAttachment;
// Attachment löschen
const deleteAttachment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { taskId, attachmentId } = req.params;
        const attachment = yield prisma_1.prisma.taskAttachment.findFirst({
            where: {
                id: parseInt(attachmentId),
                taskId: parseInt(taskId),
            },
        });
        if (!attachment) {
            return res.status(404).json({ message: 'Attachment nicht gefunden' });
        }
        // Lösche die physische Datei
        const filePath = path_1.default.join(UPLOAD_DIR, attachment.filePath);
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
        }
        // Lösche den Datenbankeintrag
        yield prisma_1.prisma.taskAttachment.delete({
            where: {
                id: parseInt(attachmentId),
            },
        });
        res.json({ message: 'Attachment erfolgreich gelöscht' });
    }
    catch (error) {
        console.error('Fehler beim Löschen des Attachments:', error);
        res.status(500).json({ message: 'Fehler beim Löschen des Attachments' });
    }
});
exports.deleteAttachment = deleteAttachment;
//# sourceMappingURL=taskAttachmentController.js.map
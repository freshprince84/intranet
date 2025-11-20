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
exports.deleteAttachment = exports.getAttachment = exports.getRequestAttachments = exports.addAttachment = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const prisma_1 = require("../utils/prisma");
// Upload-Verzeichnis für Anhänge
const UPLOAD_DIR = path_1.default.join(__dirname, '../../uploads/request-attachments');
// Stelle sicher, dass das Upload-Verzeichnis existiert
if (!fs_1.default.existsSync(UPLOAD_DIR)) {
    fs_1.default.mkdirSync(UPLOAD_DIR, { recursive: true });
}
// Anhang zu einem Request hinzufügen
const addAttachment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { requestId } = req.params;
        const file = req.file;
        if (!file) {
            return res.status(400).json({ message: 'Keine Datei hochgeladen' });
        }
        // Überprüfe, ob der Request existiert
        const requestExists = yield prisma_1.prisma.request.findUnique({
            where: {
                id: parseInt(requestId)
            }
        });
        if (!requestExists) {
            return res.status(404).json({ message: 'Request nicht gefunden' });
        }
        // Generiere einen eindeutigen Dateinamen
        const uniqueFileName = `${(0, uuid_1.v4)()}${path_1.default.extname(file.originalname)}`;
        const filePath = path_1.default.join(UPLOAD_DIR, uniqueFileName);
        // Speichere die Datei
        fs_1.default.writeFileSync(filePath, file.buffer);
        // Erstelle den Anhang-Eintrag in der Datenbank
        const attachment = yield prisma_1.prisma.requestAttachment.create({
            data: {
                requestId: parseInt(requestId),
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
// Alle Anhänge eines Requests abrufen
const getRequestAttachments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { requestId } = req.params;
        // Überprüfe, ob der Request existiert
        const requestExists = yield prisma_1.prisma.request.findUnique({
            where: {
                id: parseInt(requestId)
            }
        });
        if (!requestExists) {
            return res.status(404).json({ message: 'Request nicht gefunden' });
        }
        const attachments = yield prisma_1.prisma.requestAttachment.findMany({
            where: {
                requestId: parseInt(requestId),
            },
            orderBy: {
                uploadedAt: 'desc',
            },
        });
        res.json(attachments);
    }
    catch (error) {
        console.error('Fehler beim Abrufen der Anhänge:', error);
        res.status(500).json({ message: 'Fehler beim Abrufen der Anhänge' });
    }
});
exports.getRequestAttachments = getRequestAttachments;
// Einzelnen Anhang abrufen
const getAttachment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Für Anhänge verzichten wir auf Authentifizierung, damit Bilder auch in der Vorschau angezeigt werden können
        // Diese Route sollte öffentlich sein, da die Anhang-ID und Request-ID als ausreichender Schutz dienen
        const { requestId, attachmentId } = req.params;
        const attachment = yield prisma_1.prisma.requestAttachment.findFirst({
            where: {
                id: parseInt(attachmentId),
                requestId: parseInt(requestId),
            },
        });
        if (!attachment) {
            return res.status(404).json({ message: 'Anhang nicht gefunden' });
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
        console.error('Fehler beim Abrufen des Anhangs:', error);
        res.status(500).json({ message: 'Fehler beim Abrufen des Anhangs' });
    }
});
exports.getAttachment = getAttachment;
// Anhang löschen
const deleteAttachment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { requestId, attachmentId } = req.params;
        const attachment = yield prisma_1.prisma.requestAttachment.findFirst({
            where: {
                id: parseInt(attachmentId),
                requestId: parseInt(requestId),
            },
        });
        if (!attachment) {
            return res.status(404).json({ message: 'Anhang nicht gefunden' });
        }
        // Lösche die physische Datei
        const filePath = path_1.default.join(UPLOAD_DIR, attachment.filePath);
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
        }
        // Lösche den Datenbankeintrag
        yield prisma_1.prisma.requestAttachment.delete({
            where: {
                id: parseInt(attachmentId),
            },
        });
        res.json({ message: 'Anhang erfolgreich gelöscht' });
    }
    catch (error) {
        console.error('Fehler beim Löschen des Anhangs:', error);
        res.status(500).json({ message: 'Fehler beim Löschen des Anhangs' });
    }
});
exports.deleteAttachment = deleteAttachment;
//# sourceMappingURL=requestAttachmentController.js.map
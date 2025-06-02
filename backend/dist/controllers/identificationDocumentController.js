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
exports.downloadDocument = exports.verifyDocument = exports.deleteDocument = exports.updateDocument = exports.getUserDocuments = exports.addDocument = void 0;
const client_1 = require("@prisma/client");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const prisma = new client_1.PrismaClient();
// Konfiguration für Datei-Upload
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path_1.default.join(__dirname, '../../../uploads/documents');
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, `document-${req.params.userId}-${uniqueSuffix}${ext}`);
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB Limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Ungültiger Dateityp. Nur PDF, JPEG und PNG sind erlaubt.'));
        }
    }
});
// Dokument hinzufügen
const addDocument = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        upload.single('documentFile')(req, res, (err) => __awaiter(void 0, void 0, void 0, function* () {
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
            const existingDoc = yield prisma.identificationDocument.findFirst({
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
                    const filePath = path_1.default.join(__dirname, '../../../uploads/documents', fileName);
                    fs_1.default.writeFileSync(filePath, buffer);
                    documentFilePath = filePath.replace(/\\/g, '/');
                }
                catch (error) {
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
            const document = yield prisma.identificationDocument.create({
                data: documentData
            });
            res.status(201).json(document);
        }));
    }
    catch (error) {
        console.error('Fehler beim Hinzufügen eines Dokuments:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});
exports.addDocument = addDocument;
// Alle Dokumente eines Benutzers abrufen
const getUserDocuments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.params.userId);
        const documents = yield prisma.identificationDocument.findMany({
            where: { userId }
        });
        res.json(documents);
    }
    catch (error) {
        console.error('Fehler beim Abrufen der Dokumente:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});
exports.getUserDocuments = getUserDocuments;
// Dokument aktualisieren
const updateDocument = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        upload.single('documentFile')(req, res, (err) => __awaiter(void 0, void 0, void 0, function* () {
            if (err) {
                return res.status(400).json({ error: err.message });
            }
            const docId = parseInt(req.params.docId);
            const { documentNumber, issueDate, expiryDate, issuingCountry, issuingAuthority, imageData } = req.body;
            const existingDoc = yield prisma.identificationDocument.findUnique({
                where: { id: docId }
            });
            if (!existingDoc) {
                return res.status(404).json({ error: 'Dokument nicht gefunden' });
            }
            const updateData = {};
            if (documentNumber)
                updateData.documentNumber = documentNumber;
            if (issueDate)
                updateData.issueDate = new Date(issueDate);
            if (expiryDate)
                updateData.expiryDate = new Date(expiryDate);
            if (issuingCountry)
                updateData.issuingCountry = issuingCountry;
            if (issuingAuthority)
                updateData.issuingAuthority = issuingAuthority;
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
                    const filePath = path_1.default.join(__dirname, '../../../uploads/documents', fileName);
                    fs_1.default.writeFileSync(filePath, buffer);
                    updateData.documentFile = filePath.replace(/\\/g, '/');
                }
                catch (error) {
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
            const document = yield prisma.identificationDocument.update({
                where: { id: docId },
                data: updateData
            });
            res.json(document);
        }));
    }
    catch (error) {
        console.error('Fehler beim Aktualisieren des Dokuments:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});
exports.updateDocument = updateDocument;
// Dokument löschen
const deleteDocument = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const docId = parseInt(req.params.docId);
        const document = yield prisma.identificationDocument.findUnique({
            where: { id: docId }
        });
        if (!document) {
            return res.status(404).json({ error: 'Dokument nicht gefunden' });
        }
        // Wenn eine Datei existiert, lösche sie
        if (document.documentFile) {
            const filePath = document.documentFile;
            if (fs_1.default.existsSync(filePath)) {
                fs_1.default.unlinkSync(filePath);
            }
        }
        yield prisma.identificationDocument.delete({
            where: { id: docId }
        });
        res.json({ message: 'Dokument erfolgreich gelöscht' });
    }
    catch (error) {
        console.error('Fehler beim Löschen des Dokuments:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});
exports.deleteDocument = deleteDocument;
// Dokument verifizieren (nur für Administratoren)
const verifyDocument = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const docId = parseInt(req.params.docId);
        const adminId = parseInt(req.body.adminId);
        const document = yield prisma.identificationDocument.findUnique({
            where: { id: docId }
        });
        if (!document) {
            return res.status(404).json({ error: 'Dokument nicht gefunden' });
        }
        yield prisma.identificationDocument.update({
            where: { id: docId },
            data: {
                isVerified: true,
                verificationDate: new Date(),
                verifiedBy: adminId
            }
        });
        res.json({ message: 'Dokument erfolgreich verifiziert' });
    }
    catch (error) {
        console.error('Fehler bei der Dokumentenverifizierung:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});
exports.verifyDocument = verifyDocument;
// Dokument-Datei herunterladen
const downloadDocument = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const docId = parseInt(req.params.docId);
        const document = yield prisma.identificationDocument.findUnique({
            where: { id: docId }
        });
        if (!document || !document.documentFile) {
            return res.status(404).json({ error: 'Dokument oder Datei nicht gefunden' });
        }
        const filePath = document.documentFile;
        if (!fs_1.default.existsSync(filePath)) {
            return res.status(404).json({ error: 'Datei nicht gefunden' });
        }
        res.download(filePath);
    }
    catch (error) {
        console.error('Fehler beim Herunterladen des Dokuments:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});
exports.downloadDocument = downloadDocument;
//# sourceMappingURL=identificationDocumentController.js.map
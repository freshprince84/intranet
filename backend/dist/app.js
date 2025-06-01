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
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const requests_1 = __importDefault(require("./routes/requests"));
const tasks_1 = __importDefault(require("./routes/tasks"));
const roles_1 = __importDefault(require("./routes/roles"));
const branches_1 = __importDefault(require("./routes/branches"));
const worktime_1 = __importDefault(require("./routes/worktime"));
const settings_1 = __importDefault(require("./routes/settings"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const tableSettings_1 = __importDefault(require("./routes/tableSettings"));
const cerebro_1 = __importDefault(require("./routes/cerebro"));
const teamWorktimeRoutes_1 = __importDefault(require("./routes/teamWorktimeRoutes"));
const payroll_1 = __importDefault(require("./routes/payroll"));
const identificationDocuments_1 = __importDefault(require("./routes/identificationDocuments"));
const documentRecognition_1 = __importDefault(require("./routes/documentRecognition"));
const savedFilters_1 = __importDefault(require("./routes/savedFilters"));
const urlMetadata_1 = __importDefault(require("./routes/urlMetadata"));
const clients_1 = __importDefault(require("./routes/clients"));
const consultations_1 = __importDefault(require("./routes/consultations"));
const invoiceSettings_1 = __importDefault(require("./routes/invoiceSettings"));
const consultationInvoices_1 = __importDefault(require("./routes/consultationInvoices"));
const worktimeController_1 = require("./controllers/worktimeController");
const app = (0, express_1.default)();
// Middleware
app.use(express_1.default.json({ limit: '50mb' })); // Größere JSON-Payload für Bilder erlauben
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        // Erlaube Anfragen ohne Origin-Header (z.B. von Postman oder direkten Zugriffen)
        if (!origin)
            return callback(null, true);
        // Liste erlaubter Origins
        const allowedOrigins = [
            'http://localhost:3000', // Web-Frontend in Entwicklung
            'exp://', // Expo-Client während der Entwicklung
            'https://65.109.228.106.nip.io', // Produktionsumgebung
            'app://' // React Native App (production)
        ];
        // IP-basierte Entwicklungsumgebungen für Mobile
        // Erlaubt alle lokalen IP-Adressen für Emulator/Gerätetests
        if (origin.match(/^http:\/\/192\.168\.\d+\.\d+:\d+$/) ||
            origin.match(/^http:\/\/10\.\d+\.\d+\.\d+:\d+$/) ||
            origin.match(/^http:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+:\d+$/)) {
            return callback(null, true);
        }
        if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
            callback(null, true);
        }
        else {
            console.warn(`Origin ${origin} ist nicht erlaubt durch CORS`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
// Uploads-Verzeichnis
const uploadsPath = path_1.default.join(__dirname, '../uploads');
app.use('/uploads', express_1.default.static(uploadsPath));
// Downloads-Verzeichnis für Mobile App
const downloadsPath = path_1.default.join(__dirname, '../public/downloads');
app.use('/downloads', express_1.default.static(downloadsPath));
// Sicherstellen, dass die Uploads-Verzeichnisse existieren
const fs_1 = __importDefault(require("fs"));
const cerebroUploadsPath = path_1.default.join(uploadsPath, 'cerebro');
const taskAttachmentsPath = path_1.default.join(uploadsPath, 'task-attachments');
const requestAttachmentsPath = path_1.default.join(uploadsPath, 'request-attachments');
const invoicesPath = path_1.default.join(uploadsPath, 'invoices');
if (!fs_1.default.existsSync(cerebroUploadsPath)) {
    fs_1.default.mkdirSync(cerebroUploadsPath, { recursive: true });
}
if (!fs_1.default.existsSync(taskAttachmentsPath)) {
    fs_1.default.mkdirSync(taskAttachmentsPath, { recursive: true });
}
if (!fs_1.default.existsSync(requestAttachmentsPath)) {
    fs_1.default.mkdirSync(requestAttachmentsPath, { recursive: true });
}
if (!fs_1.default.existsSync(invoicesPath)) {
    fs_1.default.mkdirSync(invoicesPath, { recursive: true });
}
// Sicherstellen, dass das Downloads-Verzeichnis existiert
if (!fs_1.default.existsSync(downloadsPath)) {
    fs_1.default.mkdirSync(downloadsPath, { recursive: true });
}
// Timer für die regelmäßige Überprüfung der Arbeitszeiten (alle 5 Minuten)
const CHECK_INTERVAL_MS = 2 * 60 * 1000; // 5 Minuten
setInterval(() => __awaiter(void 0, void 0, void 0, function* () {
    console.log('Starte automatische Überprüfung der Arbeitszeiten...');
    yield (0, worktimeController_1.checkAndStopExceededWorktimes)();
}), CHECK_INTERVAL_MS);
// Eine direkte Test-Route für die Diagnose
app.get('/api/test-route', (req, res) => {
    res.json({
        message: 'Test-Route ist erreichbar',
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV
    });
});
// Mobile App Download-Links-Route
app.get('/api/mobile-app/info', (req, res) => {
    res.json({
        android: {
            version: '1.0.0',
            downloadUrl: 'https://65.109.228.106.nip.io/downloads/intranet-app.apk',
            playStoreUrl: 'https://play.google.com/store/apps/details?id=com.yourcompany.intranetapp'
        },
        ios: {
            version: '1.0.0',
            appStoreUrl: 'https://apps.apple.com/app/intranet-app/id1234567890'
        },
        lastUpdate: '24.03.2023'
    });
});
// Routen
app.use('/api/auth', auth_1.default);
app.use('/api/users', users_1.default);
app.use('/api/requests', requests_1.default);
app.use('/api/tasks', tasks_1.default);
app.use('/api/roles', roles_1.default);
app.use('/api/branches', branches_1.default);
app.use('/api/worktime', worktime_1.default);
app.use('/api/settings', settings_1.default);
app.use('/api/notifications', notifications_1.default);
app.use('/api/table-settings', tableSettings_1.default);
app.use('/api/cerebro', cerebro_1.default);
app.use('/api/team-worktime', teamWorktimeRoutes_1.default);
app.use('/api/payroll', payroll_1.default);
app.use('/api/identification-documents', identificationDocuments_1.default);
app.use('/api/document-recognition', documentRecognition_1.default);
app.use('/api/saved-filters', savedFilters_1.default);
app.use('/api/url-metadata', urlMetadata_1.default);
app.use('/api/clients', clients_1.default);
app.use('/api/consultations', consultations_1.default);
app.use('/api/invoice-settings', invoiceSettings_1.default);
app.use('/api/consultation-invoices', consultationInvoices_1.default);
// 404 Handler
app.use((req, res) => {
    res.status(404).json({ message: 'Route nicht gefunden' });
});
// Error Handler
app.use((err, req, res, next) => {
    res.status(500).json({ message: 'Ein interner Serverfehler ist aufgetreten' });
});
exports.default = app;
//# sourceMappingURL=app.js.map
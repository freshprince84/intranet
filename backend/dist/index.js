"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const client_1 = require("@prisma/client");
const auth_1 = __importDefault(require("./routes/auth"));
const requests_1 = __importDefault(require("./routes/requests"));
const tasks_1 = __importDefault(require("./routes/tasks"));
const roles_1 = __importDefault(require("./routes/roles"));
const settings_1 = __importDefault(require("./routes/settings"));
const worktime_1 = __importDefault(require("./routes/worktime"));
const branches_1 = __importDefault(require("./routes/branches"));
const users_1 = __importDefault(require("./routes/users"));
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
// CORS-Konfiguration
app.use((0, cors_1.default)({
    origin: 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
// Body Parser Middleware
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Debug-Middleware
app.use((req, res, next) => {
    console.log('Eingehende Anfrage:', {
        method: req.method,
        path: req.path,
        headers: req.headers,
        body: req.body
    });
    next();
});
// Basis-Test-Route
app.get('/api/test', (req, res) => {
    res.json({ message: 'API ist erreichbar' });
});
// Statische Dateien für Uploads
const uploadsPath = path_1.default.join(process.cwd(), 'uploads');
console.log('Uploads Verzeichnis:', uploadsPath);
app.use('/uploads', express_1.default.static(uploadsPath));
// API-Routen
app.use('/api/settings', settings_1.default);
app.use('/api/auth', auth_1.default);
app.use('/api/requests', requests_1.default);
app.use('/api/tasks', tasks_1.default);
app.use('/api/worktime', worktime_1.default);
app.use('/api/branches', branches_1.default);
app.use('/api/users', users_1.default);
app.use('/api', roles_1.default);
// Error Handler
app.use((err, req, res, next) => {
    console.error('Fehler:', err);
    res.status(500).json({ message: 'Interner Server-Fehler', error: err.message });
});
// 404 Handler
app.use((req, res) => {
    console.log('404 - Route nicht gefunden:', req.path);
    res.status(404).json({ message: 'Route nicht gefunden' });
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
    console.log('Verfügbare Routen:', app._router.stack
        .filter((r) => r.route || r.handle.stack)
        .map((r) => r.route ? r.route.path : r.regexp));
});
//# sourceMappingURL=index.js.map
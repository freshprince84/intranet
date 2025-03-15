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
const worktimeController_1 = require("./controllers/worktimeController");
const app = (0, express_1.default)();
// Middleware
app.use(express_1.default.json());
app.use((0, cors_1.default)({
    origin: true, // Erlaubt alle Origins
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
// Uploads-Verzeichnis
const uploadsPath = path_1.default.join(__dirname, '../uploads');
app.use('/uploads', express_1.default.static(uploadsPath));
// Sicherstellen, dass das Cerebro-Uploads-Verzeichnis existiert
const cerebroUploadsPath = path_1.default.join(uploadsPath, 'cerebro');
const fs_1 = __importDefault(require("fs"));
if (!fs_1.default.existsSync(cerebroUploadsPath)) {
    fs_1.default.mkdirSync(cerebroUploadsPath, { recursive: true });
}
// Timer für die regelmäßige Überprüfung der Arbeitszeiten (alle 5 Minuten)
const CHECK_INTERVAL_MS = 2 * 60 * 1000; // 5 Minuten
setInterval(() => __awaiter(void 0, void 0, void 0, function* () {
    console.log('Starte automatische Überprüfung der Arbeitszeiten...');
    yield (0, worktimeController_1.checkAndStopExceededWorktimes)();
}), CHECK_INTERVAL_MS);
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
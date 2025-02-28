"use strict";
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
const app = (0, express_1.default)();
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Uploads-Verzeichnis
const uploadsPath = path_1.default.join(__dirname, '../uploads');
app.use('/uploads', express_1.default.static(uploadsPath));
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
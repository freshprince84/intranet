"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const isTeamManager_1 = require("../middleware/isTeamManager");
const organization_1 = require("../middleware/organization");
const permissionMiddleware_1 = require("../middleware/permissionMiddleware");
const teamWorktimeController_1 = require("../controllers/teamWorktimeController");
const analyticsController_1 = require("../controllers/analyticsController");
const router = express_1.default.Router();
// Alle Routen erfordern Authentifizierung, Organisation-Kontext und Team-Manager-Berechtigung
router.use(auth_1.authenticateToken);
router.use(organization_1.organizationMiddleware);
router.use(isTeamManager_1.isTeamManager);
// Arbeitszeiten-Tab Routen mit Permission-Checks
router.get('/active', (0, permissionMiddleware_1.checkPermission)('working_times', 'read', 'tab'), teamWorktimeController_1.getActiveTeamWorktimes);
router.post('/stop-user', (0, permissionMiddleware_1.checkPermission)('working_time_edit', 'write', 'button'), teamWorktimeController_1.stopUserWorktime);
router.get('/user-day', (0, permissionMiddleware_1.checkPermission)('working_times', 'read', 'tab'), teamWorktimeController_1.getUserWorktimesByDay);
router.put('/update', (0, permissionMiddleware_1.checkPermission)('working_time_edit', 'write', 'button'), teamWorktimeController_1.updateUserWorktime);
router.put('/overtime', (0, permissionMiddleware_1.checkPermission)('working_time_edit', 'write', 'button'), teamWorktimeController_1.updateApprovedOvertimeHours);
// Analytics-Endpunkte mit Permission-Checks
// Task Analytics Tab
router.get('/analytics/todos-by-user', (0, permissionMiddleware_1.checkPermission)('task_analytics', 'read', 'tab'), analyticsController_1.getTodosByUserForDate);
router.get('/analytics/todos-chronological', (0, permissionMiddleware_1.checkPermission)('task_analytics', 'read', 'tab'), analyticsController_1.getTodosChronological);
router.get('/analytics/todos-frequency', (0, permissionMiddleware_1.checkPermission)('task_analytics', 'read', 'tab'), analyticsController_1.getTodosFrequencyAnalysis);
router.get('/analytics/todos-shifts', (0, permissionMiddleware_1.checkPermission)('task_analytics', 'read', 'tab'), analyticsController_1.getTodosShiftAnalysis);
router.get('/analytics/user-tasks-activity', (0, permissionMiddleware_1.checkPermission)('task_analytics', 'read', 'tab'), analyticsController_1.getUserTasksActivity);
router.get('/analytics/tasks-activity', (0, permissionMiddleware_1.checkPermission)('task_analytics', 'read', 'tab'), analyticsController_1.getTasksActivity);
// Request Analytics Tab
router.get('/analytics/requests-by-user', (0, permissionMiddleware_1.checkPermission)('request_analytics', 'read', 'tab'), analyticsController_1.getRequestsByUserForDate);
router.get('/analytics/requests-chronological', (0, permissionMiddleware_1.checkPermission)('request_analytics', 'read', 'tab'), analyticsController_1.getRequestsChronological);
router.get('/analytics/user-requests-activity', (0, permissionMiddleware_1.checkPermission)('request_analytics', 'read', 'tab'), analyticsController_1.getUserRequestsActivity);
router.get('/analytics/requests-activity', (0, permissionMiddleware_1.checkPermission)('request_analytics', 'read', 'tab'), analyticsController_1.getRequestsActivity);
exports.default = router;
//# sourceMappingURL=teamWorktimeRoutes.js.map
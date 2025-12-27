import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { isTeamManager } from '../middleware/isTeamManager';
import { organizationMiddleware } from '../middleware/organization';
import { checkPermission } from '../middleware/permissionMiddleware';
import {
  getActiveTeamWorktimes,
  stopUserWorktime,
  getUserWorktimesByDay,
  updateUserWorktime,
  updateApprovedOvertimeHours
} from '../controllers/teamWorktimeController';
import {
  getTodosByUserForDate,
  getRequestsByUserForDate,
  getTodosChronological,
  getRequestsChronological,
  getTodosFrequencyAnalysis,
  getTodosShiftAnalysis,
  getUserTasksActivity,
  getUserRequestsActivity,
  getTasksActivity,
  getRequestsActivity
} from '../controllers/analyticsController';

const router = express.Router();

// Alle Routen erfordern Authentifizierung, Organisation-Kontext und Team-Manager-Berechtigung
router.use(authenticateToken);
router.use(organizationMiddleware);
router.use(isTeamManager);

// Arbeitszeiten-Tab Routen mit Permission-Checks
router.get('/active', checkPermission('working_times', 'read', 'tab'), getActiveTeamWorktimes);
router.post('/stop-user', checkPermission('working_time_edit', 'write', 'button'), stopUserWorktime);
router.get('/user-day', checkPermission('working_times', 'read', 'tab'), getUserWorktimesByDay);
router.put('/update', checkPermission('working_time_edit', 'write', 'button'), updateUserWorktime);
router.put('/overtime', checkPermission('working_time_edit', 'write', 'button'), updateApprovedOvertimeHours);

// Analytics-Endpunkte mit Permission-Checks
// Task Analytics Tab
router.get('/analytics/todos-by-user', checkPermission('task_analytics', 'read', 'tab'), getTodosByUserForDate);
router.get('/analytics/todos-chronological', checkPermission('task_analytics', 'read', 'tab'), getTodosChronological);
router.get('/analytics/todos-frequency', checkPermission('task_analytics', 'read', 'tab'), getTodosFrequencyAnalysis);
router.get('/analytics/todos-shifts', checkPermission('task_analytics', 'read', 'tab'), getTodosShiftAnalysis);
router.get('/analytics/user-tasks-activity', checkPermission('task_analytics', 'read', 'tab'), getUserTasksActivity);
router.get('/analytics/tasks-activity', checkPermission('task_analytics', 'read', 'tab'), getTasksActivity);

// Request Analytics Tab
router.get('/analytics/requests-by-user', checkPermission('request_analytics', 'read', 'tab'), getRequestsByUserForDate);
router.get('/analytics/requests-chronological', checkPermission('request_analytics', 'read', 'tab'), getRequestsChronological);
router.get('/analytics/user-requests-activity', checkPermission('request_analytics', 'read', 'tab'), getUserRequestsActivity);
router.get('/analytics/requests-activity', checkPermission('request_analytics', 'read', 'tab'), getRequestsActivity);

export default router; 
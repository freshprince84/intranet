import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { isTeamManager } from '../middleware/isTeamManager';
import { organizationMiddleware } from '../middleware/organization';
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

// Aktive Zeiterfassungen im Team abrufen
router.get('/active', getActiveTeamWorktimes);

// Zeiterfassung eines Benutzers stoppen
router.post('/stop-user', stopUserWorktime);

// Zeiterfassungen eines Benutzers für einen Tag abrufen
router.get('/user-day', getUserWorktimesByDay);

// Zeiterfassung aktualisieren
router.put('/update', updateUserWorktime);

// Bewilligte Überstunden aktualisieren
router.put('/overtime', updateApprovedOvertimeHours);

// Analytics-Endpunkte
// To-Dos pro User für ein Datum (Tab 1)
router.get('/analytics/todos-by-user', getTodosByUserForDate);

// Requests pro User für ein Datum (Tab 1)
router.get('/analytics/requests-by-user', getRequestsByUserForDate);

// Alle To-Dos chronologisch für ein Datum (Tab 2)
router.get('/analytics/todos-chronological', getTodosChronological);

// Alle Requests chronologisch für ein Datum (Tab 3)
router.get('/analytics/requests-chronological', getRequestsChronological);

// Häufigkeitsanalyse für To-Dos (Tab 2)
router.get('/analytics/todos-frequency', getTodosFrequencyAnalysis);

// Schicht-basierte Analysen für To-Dos (Tab 2)
router.get('/analytics/todos-shifts', getTodosShiftAnalysis);

// User-zentrierte Aktivitäts-Analysen (NEU)
router.get('/analytics/user-tasks-activity', getUserTasksActivity);
router.get('/analytics/user-requests-activity', getUserRequestsActivity);

// Task/Request-zentrierte Aktivitäts-Analysen (NEU)
router.get('/analytics/tasks-activity', getTasksActivity);
router.get('/analytics/requests-activity', getRequestsActivity);

export default router; 
import { Router } from 'express';
import { getAllRoles, getRoleById, createRole, updateRole, deleteRole, getRolePermissions } from '../controllers/roleController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Detaillierte Debug-Middleware für alle Roles-Routen
router.use((req, res, next) => {
  console.log('Roles-Route aufgerufen:', {
    method: req.method,
    url: req.url,
    path: req.path,
    params: req.params,
    query: req.query,
    body: req.method === 'POST' || req.method === 'PUT' ? req.body : undefined,
    headers: {
      authorization: req.headers.authorization ? 'Vorhanden' : 'Nicht vorhanden',
      'content-type': req.headers['content-type']
    }
  });
  next();
});

// Erweiterte Authentifizierungs-Middleware für Rollen-Routen
const roleAuthMiddleware = (req, res, next) => {
  console.log('Authentifizierungs-Middleware für Rollen-Route wird ausgeführt');
  
  // Authorization-Header checken
  if (!req.headers.authorization) {
    console.warn('Authorization-Header fehlt in der Anfrage');
  }
  
  // Standard-Authentifizierung durchführen
  authMiddleware(req, res, (err) => {
    if (err) {
      console.error('Authentifizierungsfehler:', err);
      return res.status(401).json({ message: 'Authentifizierungsfehler', error: err.message });
    }
    console.log('Benutzer erfolgreich authentifiziert');
    next();
  });
};

// Alle Rollen abrufen
router.get('/', roleAuthMiddleware, getAllRoles);

// Eine spezifische Rolle abrufen
router.get('/:id', roleAuthMiddleware, getRoleById);

// Neue Rolle erstellen
router.post('/', roleAuthMiddleware, createRole);

// Rolle aktualisieren
router.put('/:id', roleAuthMiddleware, updateRole);

// Rolle löschen
router.delete('/:id', roleAuthMiddleware, deleteRole);

// Berechtigungen einer Rolle abrufen
router.get('/:id/permissions', roleAuthMiddleware, getRolePermissions);

export default router; 
import { Request, Response } from 'express';
import { TTLockService } from '../services/ttlockService';
import { prisma } from '../utils/prisma';

interface AuthenticatedRequest extends Request {
  userId: string;
  organizationId: number;
}

/**
 * GET /api/ttlock/locks
 * Ruft alle verfügbaren TTLock Locks ab
 */
export const getLocks = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.organizationId;
    const ttlockService = new TTLockService(organizationId);
    
    const locks = await ttlockService.getLocks();
    
    res.json({
      success: true,
      locks: locks.map(lockId => ({ lockId, name: lockId })) // lockId ist bereits ein String
    });
  } catch (error) {
    console.error('Error getting TTLock locks:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Fehler beim Abrufen der Locks'
    });
  }
};

/**
 * GET /api/ttlock/locks/:lockId/info
 * Ruft Informationen zu einem Lock ab
 */
export const getLockInfo = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { lockId } = req.params;
    const organizationId = req.organizationId;
    
    // TODO: Implementiere getLockInfo in TTLockService wenn benötigt
    // Für jetzt: Basis-Informationen
    res.json({
      success: true,
      lockId,
      message: 'Lock-Info-Endpoint noch nicht implementiert'
    });
  } catch (error) {
    console.error('Error getting lock info:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Fehler beim Abrufen der Lock-Informationen'
    });
  }
};

/**
 * POST /api/ttlock/passcodes
 * Erstellt einen temporären Passcode
 */
export const createPasscode = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { lockId, startDate, endDate, passcodeName } = req.body;
    const organizationId = req.organizationId;

    if (!lockId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'lockId, startDate und endDate sind erforderlich'
      });
    }

    const ttlockService = new TTLockService(organizationId);
    const passcode = await ttlockService.createTemporaryPasscode(
      lockId,
      new Date(startDate),
      new Date(endDate),
      passcodeName
    );

    res.json({
      success: true,
      passcode,
      message: 'Passcode erfolgreich erstellt'
    });
  } catch (error) {
    console.error('Error creating passcode:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Fehler beim Erstellen des Passcodes'
    });
  }
};

/**
 * DELETE /api/ttlock/passcodes/:passcodeId
 * Löscht einen Passcode
 */
export const deletePasscode = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { passcodeId } = req.params;
    const { lockId } = req.body;
    const organizationId = req.organizationId;

    if (!lockId) {
      return res.status(400).json({
        success: false,
        message: 'lockId ist erforderlich'
      });
    }

    const ttlockService = new TTLockService(organizationId);
    await ttlockService.deleteTemporaryPasscode(lockId, passcodeId);

    res.json({
      success: true,
      message: 'Passcode erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Error deleting passcode:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Fehler beim Löschen des Passcodes'
    });
  }
};


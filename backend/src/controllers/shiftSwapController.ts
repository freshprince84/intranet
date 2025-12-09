import { Request, Response } from 'express';
import { SwapStatus, ShiftStatus } from '@prisma/client';
import { createNotificationIfEnabled } from './notificationController';
import { format } from 'date-fns';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

/**
 * GET /api/shifts/swaps
 * Holt alle Schichttausch-Anfragen
 */
export const getAllSwapRequests = async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId as string, 10) : null;
    const status = req.query.status as SwapStatus | undefined;

    const where: any = {};

    // Wenn userId angegeben, zeige nur Anfragen, die von oder an diesen User gerichtet sind
    if (userId && !isNaN(userId)) {
      where.OR = [
        { requestedBy: userId },
        { requestedFrom: userId }
      ];
    }

    if (status) {
      where.status = status;
    }

    const swapRequests = await prisma.shiftSwapRequest.findMany({
      where,
      include: {
        originalShift: {
          include: {
            shiftTemplate: {
              select: {
                id: true,
                name: true,
                startTime: true,
                endTime: true
              }
            },
            branch: {
              select: {
                id: true,
                name: true
              }
            },
            role: {
              select: {
                id: true,
                name: true
              }
            },
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        },
        targetShift: {
          include: {
            shiftTemplate: {
              select: {
                id: true,
                name: true,
                startTime: true,
                endTime: true
              }
            },
            branch: {
              select: {
                id: true,
                name: true
              }
            },
            role: {
              select: {
                id: true,
                name: true
              }
            },
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        },
        requester: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        requestee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: swapRequests
    });
  } catch (error) {
    logger.error('[ShiftSwap] Fehler beim Abrufen der Tausch-Anfragen:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Fehler beim Abrufen der Tausch-Anfragen'
    });
  }
};

/**
 * GET /api/shifts/swaps/:id
 * Holt eine Tausch-Anfrage nach ID
 */
export const getSwapRequestById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const swapId = parseInt(id, 10);

    if (isNaN(swapId)) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige Tausch-Anfrage-ID'
      });
    }

    const swapRequest = await prisma.shiftSwapRequest.findUnique({
      where: { id: swapId },
      include: {
        originalShift: {
          include: {
            shiftTemplate: true,
            branch: true,
            role: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        },
        targetShift: {
          include: {
            shiftTemplate: true,
            branch: true,
            role: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        },
        requester: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        requestee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    if (!swapRequest) {
      return res.status(404).json({
        success: false,
        message: 'Tausch-Anfrage nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: swapRequest
    });
  } catch (error) {
    logger.error('[ShiftSwap] Fehler beim Abrufen der Tausch-Anfrage:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Fehler beim Abrufen der Tausch-Anfrage'
    });
  }
};

/**
 * POST /api/shifts/swaps
 * Erstellt eine neue Tausch-Anfrage
 */
export const createSwapRequest = async (req: Request, res: Response) => {
  try {
    const { originalShiftId, targetShiftId, message } = req.body;

    // Validierung
    if (!originalShiftId || typeof originalShiftId !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'originalShiftId ist erforderlich'
      });
    }

    if (!targetShiftId || typeof targetShiftId !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'targetShiftId ist erforderlich'
      });
    }

    const currentUserId = req.user?.id as number | undefined;
    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: 'Nicht authentifiziert'
      });
    }

    // Hole Schichten
    const originalShift = await prisma.shift.findUnique({
      where: { id: originalShiftId },
      include: {
        user: true
      }
    });

    const targetShift = await prisma.shift.findUnique({
      where: { id: targetShiftId },
      include: {
        user: true
      }
    });

    if (!originalShift) {
      return res.status(404).json({
        success: false,
        message: 'Original-Schicht nicht gefunden'
      });
    }

    if (!targetShift) {
      return res.status(404).json({
        success: false,
        message: 'Ziel-Schicht nicht gefunden'
      });
    }

    // Prüfe, ob User die Original-Schicht hat
    if (originalShift.userId !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'Sie können nur Ihre eigenen Schichten tauschen'
      });
    }

    // Prüfe, ob Ziel-Schicht einen User hat
    if (!targetShift.userId) {
      return res.status(400).json({
        success: false,
        message: 'Ziel-Schicht hat keinen zugewiesenen User'
      });
    }

    // Prüfe, ob User nicht mit sich selbst tauscht
    if (originalShift.userId === targetShift.userId) {
      return res.status(400).json({
        success: false,
        message: 'Sie können nicht mit sich selbst tauschen'
      });
    }

    // Prüfe, ob bereits eine offene Anfrage existiert
    const existingRequest = await prisma.shiftSwapRequest.findFirst({
      where: {
        originalShiftId,
        targetShiftId,
        status: 'pending'
      }
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'Es existiert bereits eine offene Tausch-Anfrage für diese Schichten'
      });
    }

    // Erstelle Tausch-Anfrage
    const swapRequest = await prisma.shiftSwapRequest.create({
      data: {
        originalShiftId,
        targetShiftId,
        requestedBy: currentUserId,
        requestedFrom: targetShift.userId,
        status: SwapStatus.pending,
        message: message || null
      },
      include: {
        originalShift: {
          include: {
            shiftTemplate: true,
            branch: true,
            role: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        },
        targetShift: {
          include: {
            shiftTemplate: true,
            branch: true,
            role: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        },
        requester: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        requestee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // Benachrichtigung an Ziel-User senden
    const requesterName = swapRequest.requester 
      ? `${swapRequest.requester.firstName} ${swapRequest.requester.lastName}`.trim()
      : 'Ein User';
    await createNotificationIfEnabled({
      userId: targetShift.userId,
      title: 'Schichttausch-Anfrage',
      message: `${requesterName} möchte mit Ihnen eine Schicht tauschen`,
      type: 'shift_swap',
      relatedEntityId: swapRequest.id,
      relatedEntityType: 'request_received'
    });

    res.status(201).json({
      success: true,
      data: swapRequest
    });
  } catch (error) {
    logger.error('[ShiftSwap] Fehler beim Erstellen der Tausch-Anfrage:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Fehler beim Erstellen der Tausch-Anfrage'
    });
  }
};

/**
 * PUT /api/shifts/swaps/:id/approve
 * Genehmigt eine Tausch-Anfrage
 */
export const approveSwapRequest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const swapId = parseInt(id, 10);
    const { responseMessage } = req.body;

    if (isNaN(swapId)) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige Tausch-Anfrage-ID'
      });
    }

    const currentUserId = req.user?.id as number | undefined;
    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: 'Nicht authentifiziert'
      });
    }

    // Hole Tausch-Anfrage
    const swapRequest = await prisma.shiftSwapRequest.findUnique({
      where: { id: swapId },
      include: {
        originalShift: true,
        targetShift: true
      }
    });

    if (!swapRequest) {
      return res.status(404).json({
        success: false,
        message: 'Tausch-Anfrage nicht gefunden'
      });
    }

    // Prüfe, ob User berechtigt ist (muss der requestee sein)
    if (swapRequest.requestedFrom !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'Sie können nur Ihre eigenen Tausch-Anfragen genehmigen'
      });
    }

    // Prüfe, ob Anfrage noch pending ist
    if (swapRequest.status !== SwapStatus.pending) {
      return res.status(400).json({
        success: false,
        message: 'Tausch-Anfrage wurde bereits bearbeitet'
      });
    }

    // Führe Tausch durch: Tausche User der beiden Schichten
    await prisma.$transaction(async (tx) => {
      // Aktualisiere Original-Schicht (User bekommt Ziel-Schicht)
      await tx.shift.update({
        where: { id: swapRequest.originalShiftId },
        data: {
          userId: swapRequest.targetShift.userId,
          status: ShiftStatus.swapped
        }
      });

      // Aktualisiere Ziel-Schicht (User bekommt Original-Schicht)
      await tx.shift.update({
        where: { id: swapRequest.targetShiftId },
        data: {
          userId: swapRequest.originalShift.userId,
          status: ShiftStatus.swapped
        }
      });

      // Aktualisiere Tausch-Anfrage
      await tx.shiftSwapRequest.update({
        where: { id: swapId },
        data: {
          status: SwapStatus.approved,
          responseMessage: responseMessage || null,
          respondedAt: new Date()
        }
      });
    });

    // Hole aktualisierte Tausch-Anfrage
    const updatedSwapRequest = await prisma.shiftSwapRequest.findUnique({
      where: { id: swapId },
      include: {
        originalShift: {
          include: {
            shiftTemplate: true,
            branch: true,
            role: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        },
        targetShift: {
          include: {
            shiftTemplate: true,
            branch: true,
            role: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        },
        requester: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        requestee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // Benachrichtigungen senden
    await createNotificationIfEnabled({
      userId: swapRequest.requestedBy,
      title: 'Schichttausch genehmigt',
      message: `Ihre Tausch-Anfrage wurde genehmigt`,
      type: 'shift_swap',
      relatedEntityId: swapId,
      relatedEntityType: 'approved'
    });

    res.json({
      success: true,
      data: updatedSwapRequest
    });
  } catch (error) {
    logger.error('[ShiftSwap] Fehler beim Genehmigen der Tausch-Anfrage:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Fehler beim Genehmigen der Tausch-Anfrage'
    });
  }
};

/**
 * PUT /api/shifts/swaps/:id/reject
 * Lehnt eine Tausch-Anfrage ab
 */
export const rejectSwapRequest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const swapId = parseInt(id, 10);
    const { responseMessage } = req.body;

    if (isNaN(swapId)) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige Tausch-Anfrage-ID'
      });
    }

    const currentUserId = req.user?.id as number | undefined;
    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: 'Nicht authentifiziert'
      });
    }

    // Hole Tausch-Anfrage
    const swapRequest = await prisma.shiftSwapRequest.findUnique({
      where: { id: swapId }
    });

    if (!swapRequest) {
      return res.status(404).json({
        success: false,
        message: 'Tausch-Anfrage nicht gefunden'
      });
    }

    // Prüfe, ob User berechtigt ist (muss der requestee sein)
    if (swapRequest.requestedFrom !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'Sie können nur Ihre eigenen Tausch-Anfragen ablehnen'
      });
    }

    // Prüfe, ob Anfrage noch pending ist
    if (swapRequest.status !== SwapStatus.pending) {
      return res.status(400).json({
        success: false,
        message: 'Tausch-Anfrage wurde bereits bearbeitet'
      });
    }

    // Aktualisiere Tausch-Anfrage
    const updatedSwapRequest = await prisma.shiftSwapRequest.update({
      where: { id: swapId },
      data: {
        status: SwapStatus.rejected,
        responseMessage: responseMessage || null,
        respondedAt: new Date()
      },
      include: {
        originalShift: {
          include: {
            shiftTemplate: true,
            branch: true,
            role: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        },
        targetShift: {
          include: {
            shiftTemplate: true,
            branch: true,
            role: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        },
        requester: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        requestee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // Benachrichtigung senden
    await createNotificationIfEnabled({
      userId: swapRequest.requestedBy,
      title: 'Schichttausch abgelehnt',
      message: `Ihre Tausch-Anfrage wurde abgelehnt`,
      type: 'shift_swap',
      relatedEntityId: swapId,
      relatedEntityType: 'rejected'
    });

    res.json({
      success: true,
      data: updatedSwapRequest
    });
  } catch (error) {
    logger.error('[ShiftSwap] Fehler beim Ablehnen der Tausch-Anfrage:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Fehler beim Ablehnen der Tausch-Anfrage'
    });
  }
};


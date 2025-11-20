import { Request, Response } from 'express';
import { BoldPaymentService } from '../services/boldPaymentService';

/**
 * POST /api/bold-payment/webhook
 * Empfängt Webhooks von Bold Payment
 * 
 * Webhook-Events können sein:
 * - payment.paid
 * - payment.completed
 * - payment.partially_paid
 * - payment.refunded
 * - payment.failed
 * - payment.cancelled
 */
export const handleWebhook = async (req: Request, res: Response) => {
  try {
    const payload = req.body;

    // Validiere Webhook-Secret (falls konfiguriert)
    // TODO: Implementiere Webhook-Secret-Validierung
    // const webhookSecret = req.headers['x-bold-webhook-secret'];
    // if (webhookSecret !== process.env.BOLD_PAYMENT_WEBHOOK_SECRET) {
    //   return res.status(401).json({ success: false, message: 'Ungültiges Webhook-Secret' });
    // }

    console.log('[Bold Payment Webhook] Empfangen:', payload);

    // Extrahiere Organisation aus Webhook-Daten
    // Bold Payment sollte organization_id oder reservation_id im Metadata haben
    const organizationId = payload.metadata?.organization_id || 
                          payload.data?.metadata?.organization_id;

    if (!organizationId) {
      console.warn('[Bold Payment Webhook] Organisation-ID nicht gefunden im Webhook');
      // Versuche über Reservation-ID zu finden
      const reservationId = payload.metadata?.reservation_id || 
                          payload.data?.metadata?.reservation_id ||
                          (payload.reference ? parseInt(payload.reference.replace('RES-', '')) : null);

      if (reservationId) {
        // Finde Organisation über Reservierung
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();
        
        const reservation = await prisma.reservation.findUnique({
          where: { id: reservationId },
          select: { organizationId: true, branchId: true }
        });

        if (reservation) {
          const boldPaymentService = reservation.branchId
            ? await BoldPaymentService.createForBranch(reservation.branchId)
            : new BoldPaymentService(reservation.organizationId);
          await boldPaymentService.handleWebhook(payload);
          await prisma.$disconnect();
          
          return res.json({ success: true, message: 'Webhook verarbeitet' });
        }
        
        await prisma.$disconnect();
      }

      return res.status(400).json({
        success: false,
        message: 'Organisation-ID oder Reservierungs-ID fehlt im Webhook'
      });
    }

    // Verarbeite Webhook
    const boldPaymentService = new BoldPaymentService(parseInt(organizationId));
    await boldPaymentService.handleWebhook(payload);

    // Bestätige Webhook-Empfang
    res.json({ success: true, message: 'Webhook verarbeitet' });
  } catch (error) {
    console.error('[Bold Payment Webhook] Fehler beim Verarbeiten:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Fehler beim Verarbeiten des Webhooks'
    });
  }
};


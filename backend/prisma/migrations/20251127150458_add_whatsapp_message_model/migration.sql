-- CreateTable
CREATE TABLE IF NOT EXISTS "WhatsAppMessage" (
    "id" SERIAL NOT NULL,
    "reservationId" INTEGER,
    "branchId" INTEGER NOT NULL,
    "conversationId" INTEGER,
    "direction" "MessageDirection" NOT NULL DEFAULT 'outgoing',
    "phoneNumber" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "messageId" TEXT,
    "status" "MessageStatus",
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WhatsAppMessage_reservationId_idx" ON "WhatsAppMessage"("reservationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WhatsAppMessage_branchId_idx" ON "WhatsAppMessage"("branchId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WhatsAppMessage_phoneNumber_idx" ON "WhatsAppMessage"("phoneNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WhatsAppMessage_sentAt_idx" ON "WhatsAppMessage"("sentAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WhatsAppMessage_direction_idx" ON "WhatsAppMessage"("direction");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WhatsAppMessage_status_idx" ON "WhatsAppMessage"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WhatsAppMessage_conversationId_idx" ON "WhatsAppMessage"("conversationId");

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "WhatsAppConversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- CreateTable
CREATE TABLE "ReservationNotificationLog" (
    "id" SERIAL NOT NULL,
    "reservationId" INTEGER NOT NULL,
    "notificationType" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentTo" TEXT,
    "message" TEXT,
    "paymentLink" TEXT,
    "checkInLink" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReservationNotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReservationNotificationLog_reservationId_idx" ON "ReservationNotificationLog"("reservationId");

-- CreateIndex
CREATE INDEX "ReservationNotificationLog_sentAt_idx" ON "ReservationNotificationLog"("sentAt");

-- CreateIndex
CREATE INDEX "ReservationNotificationLog_notificationType_idx" ON "ReservationNotificationLog"("notificationType");

-- CreateIndex
CREATE INDEX "ReservationNotificationLog_success_idx" ON "ReservationNotificationLog"("success");

-- AddForeignKey
ALTER TABLE "ReservationNotificationLog" ADD CONSTRAINT "ReservationNotificationLog_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;


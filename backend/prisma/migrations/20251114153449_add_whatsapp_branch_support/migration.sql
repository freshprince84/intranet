-- AlterTable
ALTER TABLE "Branch" ADD COLUMN "whatsappSettings" JSONB;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "phoneNumber" TEXT;

-- CreateTable
CREATE TABLE "WhatsAppPhoneNumberMapping" (
    "id" SERIAL NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "branchId" INTEGER NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppPhoneNumberMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppConversation" (
    "id" SERIAL NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "userId" INTEGER,
    "branchId" INTEGER NOT NULL,
    "state" TEXT NOT NULL,
    "context" JSONB,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppConversation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppPhoneNumberMapping_phoneNumberId_branchId_key" ON "WhatsAppPhoneNumberMapping"("phoneNumberId", "branchId");

-- CreateIndex
CREATE INDEX "WhatsAppPhoneNumberMapping_phoneNumberId_idx" ON "WhatsAppPhoneNumberMapping"("phoneNumberId");

-- CreateIndex
CREATE INDEX "WhatsAppPhoneNumberMapping_branchId_idx" ON "WhatsAppPhoneNumberMapping"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppConversation_phoneNumber_branchId_key" ON "WhatsAppConversation"("phoneNumber", "branchId");

-- CreateIndex
CREATE INDEX "WhatsAppConversation_phoneNumber_idx" ON "WhatsAppConversation"("phoneNumber");

-- CreateIndex
CREATE INDEX "WhatsAppConversation_branchId_idx" ON "WhatsAppConversation"("branchId");

-- CreateIndex
CREATE INDEX "WhatsAppConversation_userId_idx" ON "WhatsAppConversation"("userId");

-- AddForeignKey
ALTER TABLE "WhatsAppPhoneNumberMapping" ADD CONSTRAINT "WhatsAppPhoneNumberMapping_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppConversation" ADD CONSTRAINT "WhatsAppConversation_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppConversation" ADD CONSTRAINT "WhatsAppConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


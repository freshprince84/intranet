-- AlterTable
ALTER TABLE "User" ADD COLUMN     "employeeNumber" TEXT,
ADD COLUMN     "identificationNumber" TEXT,
ADD COLUMN     "taxIdentificationNumber" TEXT;

-- CreateTable
CREATE TABLE "IdentificationDocument" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "documentType" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "issuingCountry" TEXT NOT NULL,
    "issuingAuthority" TEXT,
    "documentFile" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationDate" TIMESTAMP(3),
    "verifiedBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdentificationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IdentificationDocument_userId_documentType_key" ON "IdentificationDocument"("userId", "documentType");

-- AddForeignKey
ALTER TABLE "IdentificationDocument" ADD CONSTRAINT "IdentificationDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

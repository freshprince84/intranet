-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('onboarding', 'active', 'contract_change', 'offboarding', 'archived');

-- CreateEnum
CREATE TYPE "SocialSecurityStatus" AS ENUM ('not_required', 'pending', 'registered', 'failed', 'deregistered');

-- CreateTable
CREATE TABLE "EmployeeLifecycle" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'onboarding',
    "onboardingStartedAt" TIMESTAMP(3),
    "onboardingCompletedAt" TIMESTAMP(3),
    "contractStartDate" TIMESTAMP(3),
    "contractEndDate" TIMESTAMP(3),
    "contractType" TEXT,
    "arlStatus" "SocialSecurityStatus" NOT NULL DEFAULT 'pending',
    "arlRegisteredAt" TIMESTAMP(3),
    "arlNumber" TEXT,
    "arlProvider" TEXT,
    "epsStatus" "SocialSecurityStatus" NOT NULL DEFAULT 'not_required',
    "epsRequired" BOOLEAN NOT NULL DEFAULT false,
    "epsRegisteredAt" TIMESTAMP(3),
    "epsNumber" TEXT,
    "epsProvider" TEXT,
    "pensionStatus" "SocialSecurityStatus" NOT NULL DEFAULT 'pending',
    "pensionRegisteredAt" TIMESTAMP(3),
    "pensionNumber" TEXT,
    "pensionProvider" TEXT,
    "cajaStatus" "SocialSecurityStatus" NOT NULL DEFAULT 'pending',
    "cajaRegisteredAt" TIMESTAMP(3),
    "cajaNumber" TEXT,
    "cajaProvider" TEXT,
    "exitDate" TIMESTAMP(3),
    "exitReason" TEXT,
    "offboardingStartedAt" TIMESTAMP(3),
    "offboardingCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeLifecycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LifecycleEvent" (
    "id" SERIAL NOT NULL,
    "lifecycleId" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventData" JSONB,
    "triggeredBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LifecycleEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmploymentCertificate" (
    "id" SERIAL NOT NULL,
    "lifecycleId" INTEGER NOT NULL,
    "certificateType" TEXT NOT NULL DEFAULT 'employment',
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pdfPath" TEXT NOT NULL,
    "templateUsed" TEXT,
    "templateVersion" TEXT,
    "generatedBy" INTEGER,
    "isLatest" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmploymentCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmploymentContract" (
    "id" SERIAL NOT NULL,
    "lifecycleId" INTEGER NOT NULL,
    "contractType" TEXT NOT NULL DEFAULT 'employment',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "salary" DOUBLE PRECISION,
    "workingHours" DOUBLE PRECISION,
    "position" TEXT,
    "pdfPath" TEXT NOT NULL,
    "templateUsed" TEXT,
    "templateVersion" TEXT,
    "generatedBy" INTEGER,
    "isLatest" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmploymentContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractDocument" (
    "id" SERIAL NOT NULL,
    "contractId" INTEGER NOT NULL,
    "documentType" TEXT NOT NULL,
    "pdfPath" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialSecurityRegistration" (
    "id" SERIAL NOT NULL,
    "lifecycleId" INTEGER NOT NULL,
    "registrationType" TEXT NOT NULL,
    "registrationNumber" TEXT,
    "provider" TEXT,
    "registrationDate" TIMESTAMP(3),
    "status" "SocialSecurityStatus" NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "completedBy" INTEGER,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialSecurityRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeLifecycle_userId_key" ON "EmployeeLifecycle"("userId");

-- CreateIndex
CREATE INDEX "EmployeeLifecycle_organizationId_idx" ON "EmployeeLifecycle"("organizationId");

-- CreateIndex
CREATE INDEX "EmployeeLifecycle_status_idx" ON "EmployeeLifecycle"("status");

-- CreateIndex
CREATE INDEX "LifecycleEvent_lifecycleId_idx" ON "LifecycleEvent"("lifecycleId");

-- CreateIndex
CREATE INDEX "LifecycleEvent_eventType_idx" ON "LifecycleEvent"("eventType");

-- CreateIndex
CREATE INDEX "EmploymentCertificate_lifecycleId_idx" ON "EmploymentCertificate"("lifecycleId");

-- CreateIndex
CREATE INDEX "EmploymentCertificate_isLatest_idx" ON "EmploymentCertificate"("isLatest");

-- CreateIndex
CREATE INDEX "EmploymentContract_lifecycleId_idx" ON "EmploymentContract"("lifecycleId");

-- CreateIndex
CREATE INDEX "EmploymentContract_isLatest_idx" ON "EmploymentContract"("isLatest");

-- CreateIndex
CREATE INDEX "ContractDocument_contractId_idx" ON "ContractDocument"("contractId");

-- CreateIndex
CREATE INDEX "SocialSecurityRegistration_lifecycleId_idx" ON "SocialSecurityRegistration"("lifecycleId");

-- CreateIndex
CREATE INDEX "SocialSecurityRegistration_registrationType_idx" ON "SocialSecurityRegistration"("registrationType");

-- CreateIndex
CREATE UNIQUE INDEX "SocialSecurityRegistration_lifecycleId_registrationType_key" ON "SocialSecurityRegistration"("lifecycleId", "registrationType");

-- AddForeignKey
ALTER TABLE "EmployeeLifecycle" ADD CONSTRAINT "EmployeeLifecycle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeLifecycle" ADD CONSTRAINT "EmployeeLifecycle_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LifecycleEvent" ADD CONSTRAINT "LifecycleEvent_lifecycleId_fkey" FOREIGN KEY ("lifecycleId") REFERENCES "EmployeeLifecycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LifecycleEvent" ADD CONSTRAINT "LifecycleEvent_triggeredBy_fkey" FOREIGN KEY ("triggeredBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentCertificate" ADD CONSTRAINT "EmploymentCertificate_lifecycleId_fkey" FOREIGN KEY ("lifecycleId") REFERENCES "EmployeeLifecycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentCertificate" ADD CONSTRAINT "EmploymentCertificate_generatedBy_fkey" FOREIGN KEY ("generatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentContract" ADD CONSTRAINT "EmploymentContract_lifecycleId_fkey" FOREIGN KEY ("lifecycleId") REFERENCES "EmployeeLifecycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentContract" ADD CONSTRAINT "EmploymentContract_generatedBy_fkey" FOREIGN KEY ("generatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractDocument" ADD CONSTRAINT "ContractDocument_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "EmploymentContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialSecurityRegistration" ADD CONSTRAINT "SocialSecurityRegistration_lifecycleId_fkey" FOREIGN KEY ("lifecycleId") REFERENCES "EmployeeLifecycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;


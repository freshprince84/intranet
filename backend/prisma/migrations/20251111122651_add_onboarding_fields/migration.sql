-- AlterTable
ALTER TABLE "User" ADD COLUMN "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "onboardingProgress" JSONB;
ALTER TABLE "User" ADD COLUMN "onboardingStartedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "OnboardingEvent" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "stepId" TEXT NOT NULL,
    "stepTitle" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnboardingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OnboardingEvent_userId_idx" ON "OnboardingEvent"("userId");

-- CreateIndex
CREATE INDEX "OnboardingEvent_stepId_idx" ON "OnboardingEvent"("stepId");

-- CreateIndex
CREATE INDEX "OnboardingEvent_createdAt_idx" ON "OnboardingEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "OnboardingEvent" ADD CONSTRAINT "OnboardingEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AlterTable
ALTER TABLE "WorkTime" ADD COLUMN     "clientId" INTEGER,
ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "_CerebroCarticleToCerebroTag" ADD CONSTRAINT "_CerebroCarticleToCerebroTag_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_CerebroCarticleToCerebroTag_AB_unique";

-- CreateTable
CREATE TABLE "RequestAttachment" (
    "id" SERIAL NOT NULL,
    "requestId" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "filePath" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkTimeTask" (
    "id" SERIAL NOT NULL,
    "workTimeId" INTEGER NOT NULL,
    "taskId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkTimeTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkTimeTask_workTimeId_taskId_key" ON "WorkTimeTask"("workTimeId", "taskId");

-- AddForeignKey
ALTER TABLE "WorkTime" ADD CONSTRAINT "WorkTime_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestAttachment" ADD CONSTRAINT "RequestAttachment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkTimeTask" ADD CONSTRAINT "WorkTimeTask_workTimeId_fkey" FOREIGN KEY ("workTimeId") REFERENCES "WorkTime"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkTimeTask" ADD CONSTRAINT "WorkTimeTask_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "FilterGroup" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tableId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FilterGroup_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "SavedFilter" ADD COLUMN "groupId" INTEGER,
ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "FilterGroup_userId_tableId_name_key" ON "FilterGroup"("userId", "tableId", "name");

-- AddForeignKey
ALTER TABLE "FilterGroup" ADD CONSTRAINT "FilterGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedFilter" ADD CONSTRAINT "SavedFilter_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "FilterGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;


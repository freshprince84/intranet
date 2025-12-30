-- CreateTable
CREATE TABLE "CompetitorGroup" (
    "id" SERIAL NOT NULL,
    "branchId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "city" TEXT NOT NULL,
    "country" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitorGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competitor" (
    "id" SERIAL NOT NULL,
    "competitorGroupId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "searchName" TEXT,
    "bookingComUrl" TEXT,
    "hostelworldUrl" TEXT,
    "otherUrls" JSONB,
    "otaListingId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSearchedAt" TIMESTAMP(3),
    "lastPriceFoundAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Competitor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompetitorGroup_branchId_idx" ON "CompetitorGroup"("branchId");

-- CreateIndex
CREATE INDEX "CompetitorGroup_city_idx" ON "CompetitorGroup"("city");

-- CreateIndex
CREATE INDEX "CompetitorGroup_isActive_idx" ON "CompetitorGroup"("isActive");

-- CreateIndex
CREATE INDEX "Competitor_competitorGroupId_idx" ON "Competitor"("competitorGroupId");

-- CreateIndex
CREATE INDEX "Competitor_isActive_idx" ON "Competitor"("isActive");

-- CreateIndex
CREATE INDEX "Competitor_otaListingId_idx" ON "Competitor"("otaListingId");

-- AddForeignKey
ALTER TABLE "CompetitorGroup" ADD CONSTRAINT "CompetitorGroup_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competitor" ADD CONSTRAINT "Competitor_competitorGroupId_fkey" FOREIGN KEY ("competitorGroupId") REFERENCES "CompetitorGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey (only if OTAListing table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'OTAListing') THEN
        ALTER TABLE "Competitor" ADD CONSTRAINT "Competitor_otaListingId_fkey" FOREIGN KEY ("otaListingId") REFERENCES "OTAListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;


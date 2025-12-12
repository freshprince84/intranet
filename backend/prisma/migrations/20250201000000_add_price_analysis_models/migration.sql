-- CreateTable
CREATE TABLE "OTAListing" (
    "id" SERIAL NOT NULL,
    "branchId" INTEGER NOT NULL,
    "platform" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "listingUrl" TEXT,
    "categoryId" INTEGER,
    "roomType" TEXT NOT NULL,
    "roomName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OTAListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OTAPriceData" (
    "id" SERIAL NOT NULL,
    "listingId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'COP',
    "available" BOOLEAN NOT NULL DEFAULT true,
    "availableRooms" INTEGER,
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT,

    CONSTRAINT "OTAPriceData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceAnalysis" (
    "id" SERIAL NOT NULL,
    "branchId" INTEGER NOT NULL,
    "analysisDate" DATE NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "categoryId" INTEGER,
    "roomType" TEXT NOT NULL,
    "currentPrice" DECIMAL(10,2),
    "averagePrice" DECIMAL(10,2),
    "minPrice" DECIMAL(10,2),
    "maxPrice" DECIMAL(10,2),
    "occupancyRate" DECIMAL(5,2),
    "availableRooms" INTEGER,
    "competitorAvgPrice" DECIMAL(10,2),
    "pricePosition" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceRecommendation" (
    "id" SERIAL NOT NULL,
    "analysisId" INTEGER,
    "branchId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "categoryId" INTEGER,
    "roomType" TEXT NOT NULL,
    "recommendedPrice" DECIMAL(10,2) NOT NULL,
    "currentPrice" DECIMAL(10,2),
    "priceChange" DECIMAL(10,2),
    "priceChangePercent" DECIMAL(5,2),
    "appliedRules" JSONB,
    "reasoning" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "appliedAt" TIMESTAMP(3),
    "appliedBy" INTEGER,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingRule" (
    "id" SERIAL NOT NULL,
    "branchId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "conditions" JSONB NOT NULL,
    "action" JSONB NOT NULL,
    "roomTypes" JSONB,
    "categoryIds" JSONB,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" INTEGER,

    CONSTRAINT "PricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateShoppingJob" (
    "id" SERIAL NOT NULL,
    "branchId" INTEGER NOT NULL,
    "platform" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "listingsFound" INTEGER NOT NULL DEFAULT 0,
    "pricesCollected" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateShoppingJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OTAListing_branchId_platform_listingId_key" ON "OTAListing"("branchId", "platform", "listingId");

-- CreateIndex
CREATE INDEX "OTAListing_branchId_idx" ON "OTAListing"("branchId");

-- CreateIndex
CREATE INDEX "OTAListing_platform_idx" ON "OTAListing"("platform");

-- CreateIndex
CREATE INDEX "OTAListing_categoryId_idx" ON "OTAListing"("categoryId");

-- CreateIndex
CREATE INDEX "OTAListing_roomType_idx" ON "OTAListing"("roomType");

-- CreateIndex
CREATE UNIQUE INDEX "OTAPriceData_listingId_date_key" ON "OTAPriceData"("listingId", "date");

-- CreateIndex
CREATE INDEX "OTAPriceData_listingId_idx" ON "OTAPriceData"("listingId");

-- CreateIndex
CREATE INDEX "OTAPriceData_date_idx" ON "OTAPriceData"("date");

-- CreateIndex
CREATE INDEX "OTAPriceData_scrapedAt_idx" ON "OTAPriceData"("scrapedAt");

-- CreateIndex
CREATE INDEX "OTAPriceData_listingId_date_idx" ON "OTAPriceData"("listingId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "PriceAnalysis_branchId_analysisDate_categoryId_roomType_key" ON "PriceAnalysis"("branchId", "analysisDate", "categoryId", "roomType");

-- CreateIndex
CREATE INDEX "PriceAnalysis_branchId_idx" ON "PriceAnalysis"("branchId");

-- CreateIndex
CREATE INDEX "PriceAnalysis_analysisDate_idx" ON "PriceAnalysis"("analysisDate");

-- CreateIndex
CREATE INDEX "PriceAnalysis_categoryId_idx" ON "PriceAnalysis"("categoryId");

-- CreateIndex
CREATE INDEX "PriceAnalysis_roomType_idx" ON "PriceAnalysis"("roomType");

-- CreateIndex
CREATE INDEX "PriceAnalysis_branchId_analysisDate_idx" ON "PriceAnalysis"("branchId", "analysisDate");

-- CreateIndex
CREATE INDEX "PriceAnalysis_categoryId_analysisDate_idx" ON "PriceAnalysis"("categoryId", "analysisDate");

-- CreateIndex
CREATE INDEX "PriceAnalysis_roomType_analysisDate_idx" ON "PriceAnalysis"("roomType", "analysisDate");

-- CreateIndex
CREATE UNIQUE INDEX "PriceRecommendation_branchId_date_categoryId_roomType_key" ON "PriceRecommendation"("branchId", "date", "categoryId", "roomType");

-- CreateIndex
CREATE INDEX "PriceRecommendation_branchId_idx" ON "PriceRecommendation"("branchId");

-- CreateIndex
CREATE INDEX "PriceRecommendation_date_idx" ON "PriceRecommendation"("date");

-- CreateIndex
CREATE INDEX "PriceRecommendation_categoryId_idx" ON "PriceRecommendation"("categoryId");

-- CreateIndex
CREATE INDEX "PriceRecommendation_roomType_idx" ON "PriceRecommendation"("roomType");

-- CreateIndex
CREATE INDEX "PriceRecommendation_status_idx" ON "PriceRecommendation"("status");

-- CreateIndex
CREATE INDEX "PriceRecommendation_branchId_date_status_idx" ON "PriceRecommendation"("branchId", "date", "status");

-- CreateIndex
CREATE INDEX "PriceRecommendation_categoryId_date_idx" ON "PriceRecommendation"("categoryId", "date");

-- CreateIndex
CREATE INDEX "PriceRecommendation_status_date_idx" ON "PriceRecommendation"("status", "date");

-- CreateIndex
CREATE INDEX "PricingRule_branchId_idx" ON "PricingRule"("branchId");

-- CreateIndex
CREATE INDEX "PricingRule_isActive_idx" ON "PricingRule"("isActive");

-- CreateIndex
CREATE INDEX "PricingRule_priority_idx" ON "PricingRule"("priority");

-- CreateIndex
CREATE INDEX "RateShoppingJob_branchId_idx" ON "RateShoppingJob"("branchId");

-- CreateIndex
CREATE INDEX "RateShoppingJob_status_idx" ON "RateShoppingJob"("status");

-- CreateIndex
CREATE INDEX "RateShoppingJob_platform_idx" ON "RateShoppingJob"("platform");

-- AddForeignKey
ALTER TABLE "OTAListing" ADD CONSTRAINT "OTAListing_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OTAPriceData" ADD CONSTRAINT "OTAPriceData_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "OTAListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceAnalysis" ADD CONSTRAINT "PriceAnalysis_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceRecommendation" ADD CONSTRAINT "PriceRecommendation_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "PriceAnalysis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceRecommendation" ADD CONSTRAINT "PriceRecommendation_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateShoppingJob" ADD CONSTRAINT "RateShoppingJob_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


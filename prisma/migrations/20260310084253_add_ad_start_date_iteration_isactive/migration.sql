-- CreateTable
CREATE TABLE "AdRecord" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "foreplayUrl" TEXT NOT NULL,
    "landingPageUrl" TEXT NOT NULL,
    "hook" TEXT NOT NULL,
    "concept" TEXT NOT NULL,
    "scriptBreakdown" TEXT NOT NULL,
    "visual" TEXT NOT NULL,
    "psychology" TEXT NOT NULL,
    "cta" TEXT NOT NULL,
    "keyTakeaways" TEXT NOT NULL,
    "productionFormula" TEXT NOT NULL,
    "adScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "longevityDays" INTEGER NOT NULL DEFAULT 0,
    "hookType" TEXT NOT NULL DEFAULT '',
    "primaryAngle" TEXT NOT NULL DEFAULT '',
    "frameworkName" TEXT NOT NULL DEFAULT '',
    "adLibraryId" TEXT NOT NULL,
    "adLibraryUrl" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "crawledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "videoUrl" TEXT,
    "thumbnailUrl" TEXT,
    "durationSeconds" DOUBLE PRECISION,
    "videoFormat" TEXT,
    "adStartDate" TEXT,
    "adIterationCount" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "impressionsLower" TEXT,
    "impressionsUpper" TEXT,
    "spendLower" TEXT,
    "spendUpper" TEXT,
    "spendCurrency" TEXT,
    "pageId" TEXT,
    "pageName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitorScore" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "adCountScore" INTEGER NOT NULL,
    "longevityScore" INTEGER NOT NULL,
    "omnichannelScore" INTEGER NOT NULL,
    "marketFitScore" INTEGER NOT NULL,
    "compositeScore" DOUBLE PRECISION NOT NULL,
    "activeAdCount" INTEGER NOT NULL,
    "oldestAdDays" INTEGER NOT NULL,
    "platforms" TEXT[],
    "marketsServed" TEXT[],
    "pageId" TEXT,
    "crawlJobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompetitorScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrawlJob" (
    "id" TEXT NOT NULL,
    "markets" TEXT[],
    "keyword" TEXT NOT NULL,
    "yourBrand" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "adsProcessed" INTEGER NOT NULL DEFAULT 0,
    "adsTotal" INTEGER NOT NULL DEFAULT 0,
    "currentBrand" TEXT,
    "currentRegion" TEXT,
    "excelPath" TEXT,
    "sheetUrl" TEXT,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "CrawlJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdRecord_adLibraryId_key" ON "AdRecord"("adLibraryId");

-- CreateIndex
CREATE INDEX "AdRecord_region_idx" ON "AdRecord"("region");

-- CreateIndex
CREATE INDEX "AdRecord_brand_idx" ON "AdRecord"("brand");

-- CreateIndex
CREATE INDEX "AdRecord_adScore_idx" ON "AdRecord"("adScore");

-- CreateIndex
CREATE INDEX "AdRecord_status_idx" ON "AdRecord"("status");

-- CreateIndex
CREATE INDEX "CompetitorScore_compositeScore_idx" ON "CompetitorScore"("compositeScore");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitorScore_brand_region_key" ON "CompetitorScore"("brand", "region");

-- CreateIndex
CREATE INDEX "CrawlJob_status_idx" ON "CrawlJob"("status");

-- AddForeignKey
ALTER TABLE "CompetitorScore" ADD CONSTRAINT "CompetitorScore_crawlJobId_fkey" FOREIGN KEY ("crawlJobId") REFERENCES "CrawlJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

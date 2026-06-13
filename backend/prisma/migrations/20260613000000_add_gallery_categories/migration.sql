-- CreateTable: GalleryCategory
CREATE TABLE "GalleryCategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GalleryCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GalleryCategory_name_key" ON "GalleryCategory"("name");

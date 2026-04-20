-- AlterTable
ALTER TABLE "shipment_parties" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "zones" ADD COLUMN     "boundary" geography(Polygon, 4326);

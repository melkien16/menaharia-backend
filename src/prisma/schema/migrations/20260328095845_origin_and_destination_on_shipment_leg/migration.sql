-- AlterTable
ALTER TABLE "shipment_legs" ADD COLUMN     "destination" geography(Point, 4326),
ADD COLUMN     "origin" geography(Point, 4326);

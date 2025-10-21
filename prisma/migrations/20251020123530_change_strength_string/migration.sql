/*
  Warnings:

  - The `status` column on the `appointment` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `amount` on the `payment` table. All the data in the column will be lost.
  - The `status` column on the `payment` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `method` column on the `payment` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `medication` on the `prescription` table. All the data in the column will be lost.
  - You are about to drop the column `prescription_id` on the `tracking` table. All the data in the column will be lost.
  - The `status` column on the `tracking` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[prescription_id]` on the table `payment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[payment_id]` on the table `tracking` will be added. If there are existing duplicate values, this will fail.
  - Made the column `prescription_id` on table `payment` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "public"."AppointmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETE', 'CANCEL');

-- CreateEnum
CREATE TYPE "public"."PaymentMethod" AS ENUM ('CREDIT', 'PROMPTPAY', 'BANK', 'CASH');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('PENDING', 'CANCEL', 'SUCCESS');

-- CreateEnum
CREATE TYPE "public"."TrackingStatus" AS ENUM ('PREPARE', 'SENDING', 'SUCCESS');

-- CreateEnum
CREATE TYPE "public"."UnitMethod" AS ENUM ('TABLET', 'CAPSULE', 'SYRUP');

-- DropForeignKey
ALTER TABLE "public"."tracking" DROP CONSTRAINT "tracking_prescription_id_fkey";

-- AlterTable
ALTER TABLE "public"."appointment" ADD COLUMN     "detail" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "public"."AppointmentStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "public"."doctor" ADD COLUMN     "detail" TEXT;

-- AlterTable
ALTER TABLE "public"."medication" ADD COLUMN     "strength" TEXT,
ADD COLUMN     "unit" "public"."UnitMethod";

-- AlterTable
ALTER TABLE "public"."patient" ADD COLUMN     "blood_drawn_at" TIMESTAMP(3),
ADD COLUMN     "missed_arv_days" INTEGER,
ADD COLUMN     "symptom_note" TEXT;

-- AlterTable
ALTER TABLE "public"."payment" DROP COLUMN "amount",
ADD COLUMN     "cost" DOUBLE PRECISION,
ALTER COLUMN "prescription_id" SET NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "public"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
DROP COLUMN "method",
ADD COLUMN     "method" "public"."PaymentMethod";

-- AlterTable
ALTER TABLE "public"."prescription" DROP COLUMN "medication";

-- AlterTable
ALTER TABLE "public"."tracking" DROP COLUMN "prescription_id",
ADD COLUMN     "location" TEXT,
ADD COLUMN     "payment_id" UUID,
DROP COLUMN "status",
ADD COLUMN     "status" "public"."TrackingStatus";

-- CreateIndex
CREATE UNIQUE INDEX "payment_prescription_id_key" ON "public"."payment"("prescription_id");

-- CreateIndex
CREATE UNIQUE INDEX "tracking_payment_id_key" ON "public"."tracking"("payment_id");

-- AddForeignKey
ALTER TABLE "public"."tracking" ADD CONSTRAINT "tracking_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payment"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

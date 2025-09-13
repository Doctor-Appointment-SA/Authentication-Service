/*
  Warnings:

  - The `health_benefits` column on the `user` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "public"."user" DROP COLUMN "health_benefits",
ADD COLUMN     "health_benefits" TEXT[];

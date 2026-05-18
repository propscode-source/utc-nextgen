/*
  Warnings:

  - You are about to drop the column `notes` on the `MerchRedemption` table. All the data in the column will be lost.
  - The `status` column on the `MerchRedemption` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[pickupCode]` on the table `MerchRedemption` will be added. If there are existing duplicate values, this will fail.
  - The required column `pickupCode` was added to the `MerchRedemption` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- CreateEnum
CREATE TYPE "LabMemberRole" AS ENUM ('MEMBER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "MerchKind" AS ENUM ('PHYSICAL', 'VOUCHER');

-- CreateEnum
CREATE TYPE "DeliveryMethod" AS ENUM ('PICKUP', 'SHIPPED');

-- CreateEnum
CREATE TYPE "RedemptionStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY_FOR_PICKUP', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- AlterTable
ALTER TABLE "LabMember" ADD COLUMN     "role" "LabMemberRole" NOT NULL DEFAULT 'MEMBER';

-- AlterTable
ALTER TABLE "MerchItem" ADD COLUMN     "kind" "MerchKind" NOT NULL DEFAULT 'PHYSICAL';

-- AlterTable
ALTER TABLE "MerchRedemption" DROP COLUMN "notes",
ADD COLUMN     "adminNotes" TEXT,
ADD COLUMN     "deliveryAddress" TEXT,
ADD COLUMN     "deliveryMethod" "DeliveryMethod" NOT NULL DEFAULT 'PICKUP',
ADD COLUMN     "deliveryNotes" TEXT,
ADD COLUMN     "pickupCode" TEXT NOT NULL,
ADD COLUMN     "trackingNumber" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "voucherCode" TEXT,
ADD COLUMN     "voucherSentAt" TIMESTAMP(3),
DROP COLUMN "status",
ADD COLUMN     "status" "RedemptionStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN     "maxViolations" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "webcamEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "webcamIntervalSec" INTEGER NOT NULL DEFAULT 60;

-- CreateIndex
CREATE INDEX "LabMember_labId_role_idx" ON "LabMember"("labId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "MerchRedemption_pickupCode_key" ON "MerchRedemption"("pickupCode");

-- CreateIndex
CREATE INDEX "MerchRedemption_status_redeemedAt_idx" ON "MerchRedemption"("status", "redeemedAt");

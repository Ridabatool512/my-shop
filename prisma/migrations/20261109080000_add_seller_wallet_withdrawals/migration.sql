CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'COMPLETE');

ALTER TABLE "User"
ADD COLUMN "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "bankName" TEXT,
ADD COLUMN "accountNumber" TEXT,
ADD COLUMN "accountTitle" TEXT;

CREATE TABLE "WithdrawalRequest" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountTitle" TEXT NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WithdrawalRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WithdrawalRequest_status_createdAt_idx"
ON "WithdrawalRequest"("status", "createdAt");

CREATE INDEX "WithdrawalRequest_sellerId_createdAt_idx"
ON "WithdrawalRequest"("sellerId", "createdAt");

ALTER TABLE "WithdrawalRequest"
ADD CONSTRAINT "WithdrawalRequest_sellerId_fkey"
FOREIGN KEY ("sellerId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

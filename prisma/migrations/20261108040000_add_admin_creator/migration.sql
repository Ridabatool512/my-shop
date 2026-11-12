ALTER TABLE "User"
ADD COLUMN "createdById" TEXT;

CREATE INDEX "User_createdById_idx" ON "User"("createdById");

ALTER TABLE "User"
ADD CONSTRAINT "User_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

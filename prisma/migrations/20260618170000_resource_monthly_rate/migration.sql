-- Add monthlyRate to Resource for hot desks, dedicated desks, and private offices.
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "monthlyRate" DECIMAL(10,2);

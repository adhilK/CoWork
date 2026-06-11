-- GCC Edition pivot: default member-facing currency becomes AED.
-- Existing rows are unaffected (this only changes the column DEFAULT).
ALTER TABLE "Organization" ALTER COLUMN "currency" SET DEFAULT 'AED';
ALTER TABLE "Invoice" ALTER COLUMN "currency" SET DEFAULT 'AED';

-- CreateTable: in-app notifications (bell icon)
CREATE TABLE "Notification" (
    "id"             TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type"           TEXT NOT NULL,
    "title"          TEXT NOT NULL,
    "body"           TEXT NOT NULL,
    "readAt"         TIMESTAMP(3),
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_organizationId_readAt_idx" ON "Notification"("organizationId", "readAt");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

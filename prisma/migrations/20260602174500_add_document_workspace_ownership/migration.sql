ALTER TABLE "UserDocument" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "UserDocumentChunk" ADD COLUMN "workspaceId" TEXT;

CREATE INDEX "UserDocument_workspaceId_idx" ON "UserDocument"("workspaceId");
CREATE INDEX "UserDocumentChunk_workspaceId_idx" ON "UserDocumentChunk"("workspaceId");

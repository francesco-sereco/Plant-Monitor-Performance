import { prisma } from "../../lib/prisma.js";

export async function writeAuditLog(params: {
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeJson?: unknown;
  afterJson?: unknown;
  ipAddress?: string;
  userAgent?: string;
}) {
  await prisma.auditLog.create({
    data: {
      actorUserId: params.actorUserId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      beforeJson: params.beforeJson as object | undefined,
      afterJson: params.afterJson as object | undefined,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    },
  });
}

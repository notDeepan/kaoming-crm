import "server-only";
import { headers } from "next/headers";
import { prisma } from "./prisma";

type AuditAction =
  | "login"
  | "logout"
  | "login_failed"
  | "create"
  | "update"
  | "delete"
  | "document_view"
  | "document_download"
  | "permission_change"
  | "export"
  | "quotation_issue"
  | "quotation_revise";

interface AuditInput {
  userId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  summary?: string;
}

export async function clientIp(): Promise<string | null> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return h.get("x-real-ip");
}

/**
 * Append a row to the immutable audit log (SE-09/10). Never throws into the caller — an audit
 * failure must not block the action it records, but it is logged to the server console.
 */
export async function writeAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        beforeJson: input.before === undefined ? undefined : (input.before as object),
        afterJson: input.after === undefined ? undefined : (input.after as object),
        summary: input.summary,
        ipAddress: await clientIp(),
      },
    });
  } catch (err) {
    console.error("audit write failed", err);
  }
}

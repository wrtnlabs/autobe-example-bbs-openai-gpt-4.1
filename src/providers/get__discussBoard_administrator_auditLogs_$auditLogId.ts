import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardGlobalAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardGlobalAuditLog";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Retrieve a specific global audit log (discuss_board_global_audit_logs) by ID.
 *
 * Fetches and returns the full detail for a single audit log entry, including
 * all metadata, actor, action, target, payload, and timestamps. Restricted to
 * administrators only for compliance, audit, and investigation purposes. Throws
 * if not found.
 *
 * @param props - Object containing administrator authentication and unique
 *   audit log ID
 * @param props.administrator - Authenticated administrator payload
 *   (authorization handled externally)
 * @param props.auditLogId - Unique ID (UUID) for the audit log entry to
 *   retrieve
 * @returns Full details of the audit log as IDiscussBoardGlobalAuditLog
 * @throws {Error} If record does not exist, or administrator authorization
 *   invalid
 */
export async function get__discussBoard_administrator_auditLogs_$auditLogId(props: {
  administrator: AdministratorPayload;
  auditLogId: string & tags.Format<"uuid">;
}): Promise<IDiscussBoardGlobalAuditLog> {
  const { auditLogId } = props;
  const record =
    await MyGlobal.prisma.discuss_board_global_audit_logs.findUniqueOrThrow({
      where: { id: auditLogId },
    });
  return {
    id: record.id,
    actor_id: record.actor_id ?? undefined,
    actor_type: record.actor_type,
    action_category: record.action_category,
    target_table: record.target_table,
    target_id: record.target_id ?? undefined,
    event_payload: record.event_payload ?? undefined,
    event_description: record.event_description,
    created_at: toISOStringSafe(record.created_at),
    deleted_at:
      record.deleted_at != null
        ? toISOStringSafe(record.deleted_at)
        : undefined,
  };
}

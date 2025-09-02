import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get a single audit log entry by ID (admin-only).
 *
 * Retrieve a detailed audit log record by its unique identifier, exposing all
 * major fields such as actor details, action type, target object, description,
 * and timestamps. Typical use cases include compliance audit, review of
 * administrative actions, and root-cause analysis during incident review.
 *
 * Only administrators may access this endpoint, ensuring it is used strictly
 * for legal, operational, or high-stake support purposes. The returned
 * structure maps directly to the audit log schema and includes all available
 * contextual and relationship data. Associated action logs (lower-level traces)
 * can be separately queried using the actionLogs endpoints for advanced
 * investigations.
 *
 * Appropriate error messages will be returned if the entry does not exist or if
 * the requesting user's role is insufficient to view the information.
 *
 * @param props - Request properties
 * @param props.admin - Payload of the authenticated admin user performing the
 *   request
 * @param props.auditLogId - Unique identifier for the target audit log entry
 * @returns The matching audit log record with all metadata and actor/action
 *   context
 * @throws {Error} When the audit log entry does not exist
 */
export async function get__discussionBoard_admin_auditLogs_$auditLogId(props: {
  admin: AdminPayload;
  auditLogId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAuditLog> {
  const { auditLogId } = props;
  const log = await MyGlobal.prisma.discussion_board_audit_logs.findUnique({
    where: { id: auditLogId },
    select: {
      id: true,
      actor_id: true,
      actor_role: true,
      action_type: true,
      target_object: true,
      description: true,
      created_at: true,
    },
  });
  if (!log) throw new Error("Audit log not found");
  return {
    id: log.id,
    actor_id: log.actor_id ?? null,
    actor_role: log.actor_role,
    action_type: log.action_type,
    target_object: log.target_object ?? null,
    description: log.description ?? null,
    created_at: toISOStringSafe(log.created_at),
  };
}

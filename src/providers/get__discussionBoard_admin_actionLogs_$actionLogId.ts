import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardActionLog";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get a specific action log by ID (admin-only).
 *
 * Fetch a single action log record by its unique ID, including embedded status,
 * metadata, and timestamp. Useful for compliance audit, root-cause analysis,
 * and advanced troubleshooting tasks. The endpoint cross-references parent
 * audit log data for investigative context and is primarily intended for admin
 * and compliance workflows.
 *
 * Access is strictly limited to admin role to safeguard sensitive traces of
 * platform logic or user actions. If the action log does not exist, a not-found
 * error is returned. Each record maps directly to the
 * discussion_board_action_logs Prisma schema and relates upward to an audit log
 * for full event history.
 *
 * @param props - The request parameters
 * @param props.admin - Authenticated admin user making the request
 *   (authorization already enforced)
 * @param props.actionLogId - The unique identifier of the action log record
 *   (UUID)
 * @returns The action log record with status, metadata, and creation timestamp
 * @throws {Error} If the action log record does not exist
 */
export async function get__discussionBoard_admin_actionLogs_$actionLogId(props: {
  admin: AdminPayload;
  actionLogId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardActionLog> {
  const { actionLogId } = props;

  const log = await MyGlobal.prisma.discussion_board_action_logs.findUnique({
    where: {
      id: actionLogId,
    },
    select: {
      id: true,
      discussion_board_audit_log_id: true,
      status: true,
      metadata: true,
      created_at: true,
    },
  });
  if (!log) {
    throw new Error("Not found");
  }
  return {
    id: log.id,
    discussion_board_audit_log_id: log.discussion_board_audit_log_id,
    status: log.status,
    metadata: log.metadata,
    created_at: toISOStringSafe(log.created_at),
  };
}

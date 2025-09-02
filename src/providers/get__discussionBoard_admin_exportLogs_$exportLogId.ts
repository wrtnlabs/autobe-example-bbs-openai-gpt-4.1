import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardExportLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardExportLog";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve audit details for a specific export log record by ID.
 *
 * This operation retrieves detailed audit information for a specific export log
 * entry, identified by its unique exportLogId. It operates on the
 * discussion_board_export_logs table in the Prisma schema, returning all
 * available details such as requester, file URI, status, export date, file
 * type, and audit metadata. This is a read-only operation providing the full
 * context needed by administrators or compliance staff to review individual
 * export events, their status, and relevant audit details.
 *
 * The endpoint ensures only authorized admins can access potentially sensitive
 * export histories. It supports compliance and audit by providing all relevant
 * context for a given export event logged in the system.
 *
 * If the exportLogId does not correspond to an existing record, the operation
 * throws an error indicating not found or unauthorized access, as relevant.
 *
 * @param props - The request context and input data.
 * @param props.admin - Authenticated AdminPayload object for authorization
 *   (must be a valid, active admin user)
 * @param props.exportLogId - Unique identifier of the export log record to
 *   retrieve (UUID v4 string)
 * @returns The detailed export log record for audit or compliance review.
 * @throws {Error} If the export log record is not found, soft-deleted, or admin
 *   is not authorized.
 */
export async function get__discussionBoard_admin_exportLogs_$exportLogId(props: {
  admin: { id: string & tags.Format<"uuid">; type: "admin" };
  exportLogId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardExportLog> {
  const { admin, exportLogId } = props;

  // The AdminAuth decorator/guard enforces admin authentication and role, so just require the presence of admin prop.

  const row = await MyGlobal.prisma.discussion_board_export_logs.findFirst({
    where: {
      id: exportLogId,
      deleted_at: null,
    },
    select: {
      id: true,
      requested_by_user_id: true,
      target_type: true,
      file_uri: true,
      file_type: true,
      exported_at: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!row) {
    throw new Error("Export log not found or already deleted");
  }
  return {
    id: row.id,
    requested_by_user_id: row.requested_by_user_id ?? null,
    target_type: row.target_type,
    file_uri: row.file_uri,
    file_type: row.file_type,
    exported_at: toISOStringSafe(row.exported_at),
    status: row.status,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
  };
}

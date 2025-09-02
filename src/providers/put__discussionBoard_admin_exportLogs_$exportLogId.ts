import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardExportLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardExportLog";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an existing export log record's audit data by ID.
 *
 * Updates the details of a discussion board export log record by its
 * exportLogId. Only administrators may update export log fields such as status,
 * file_uri, exported_at, and file_type. The operation enforces uniqueness for
 * file_uri, advances updated_at, and returns the updated log with all required
 * audit fields and correct type branding for date values. Throws an error if
 * the export log does not exist or file_uri is not unique.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin performing this action
 * @param props.exportLogId - Unique identifier of the export log record to
 *   update
 * @param props.body - Update fields for the export log record (all optional;
 *   only specified fields are updated)
 * @returns The updated export log record with audit and business fields
 * @throws {Error} If the export log does not exist or file_uri is duplicated
 */
export async function put__discussionBoard_admin_exportLogs_$exportLogId(props: {
  admin: AdminPayload;
  exportLogId: string & tags.Format<"uuid">;
  body: IDiscussionBoardExportLog.IUpdate;
}): Promise<IDiscussionBoardExportLog> {
  const { admin, exportLogId, body } = props;
  // 1. Authorization -- existence and activeness is handled by AdminPayload/provider

  // 2. Find export log by id, must not be soft deleted.
  const exportLog =
    await MyGlobal.prisma.discussion_board_export_logs.findFirst({
      where: {
        id: exportLogId,
        deleted_at: null,
      },
    });
  if (!exportLog) throw new Error("Export log not found");

  // 3. If file_uri is being changed, ensure uniqueness (ignore current record)
  if (body.file_uri !== undefined) {
    const duplicate =
      await MyGlobal.prisma.discussion_board_export_logs.findFirst({
        where: {
          file_uri: body.file_uri,
          id: { not: exportLogId },
        },
      });
    if (duplicate)
      throw new Error("file_uri must be unique among all export logs");
  }
  // 4. Update log with specified fields only and advance updated_at
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.discussion_board_export_logs.update({
    where: { id: exportLogId },
    data: {
      status: body.status ?? undefined,
      file_uri: body.file_uri ?? undefined,
      exported_at: body.exported_at ?? undefined,
      file_type: body.file_type ?? undefined,
      updated_at: now,
    },
  });
  // 5. Return with proper type branding for all date values
  return {
    id: updated.id,
    requested_by_user_id: updated.requested_by_user_id ?? null,
    target_type: updated.target_type,
    file_uri: updated.file_uri,
    file_type: updated.file_type,
    exported_at: toISOStringSafe(updated.exported_at),
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}

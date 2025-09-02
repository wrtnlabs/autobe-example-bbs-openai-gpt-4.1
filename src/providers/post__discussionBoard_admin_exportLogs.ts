import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardExportLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardExportLog";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Creates a new export log record to track the generation or delivery of
 * compliance, audit, or privacy data files in the platform.
 *
 * Administrators can record the outcome of export requests, including
 * requester, type, file URI, file type, export date, and initial status. This
 * endpoint enforces uniqueness of file_uri and full compliance with business
 * traceability requirements. Only accessible to authenticated admins.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin creating the export log record
 * @param props.body - The export log entry details (target_type, file_uri,
 *   file_type, exported_at, status, and optional requested_by_user_id)
 * @returns The newly created export log record with all system-generated
 *   metadata
 * @throws {Error} If not an admin
 * @throws {Error} If file_uri is not unique or input is invalid
 */
export async function post__discussionBoard_admin_exportLogs(props: {
  admin: AdminPayload;
  body: IDiscussionBoardExportLog.ICreate;
}): Promise<IDiscussionBoardExportLog> {
  const { admin, body } = props;

  // Enforce admin authorization (defensive - should be handled by decorator, but required by system rules)
  if (!admin || admin.type !== "admin") {
    throw new Error("Unauthorized: Only an admin can create export logs.");
  }

  // Prepare timestamps and ID
  const now = toISOStringSafe(new Date());
  const exportLogId = v4() as string & tags.Format<"uuid">;

  try {
    // Create new export log record
    const created = await MyGlobal.prisma.discussion_board_export_logs.create({
      data: {
        id: exportLogId,
        target_type: body.target_type,
        file_uri: body.file_uri,
        file_type: body.file_type,
        exported_at: toISOStringSafe(body.exported_at),
        status: body.status,
        requested_by_user_id: body.requested_by_user_id ?? null,
        created_at: now,
        updated_at: now,
      },
    });

    // Return all fields, properly normalized
    return {
      id: created.id,
      requested_by_user_id:
        created.requested_by_user_id === undefined
          ? null
          : created.requested_by_user_id,
      target_type: created.target_type,
      file_uri: created.file_uri,
      file_type: created.file_type,
      exported_at: toISOStringSafe(created.exported_at),
      status: created.status,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at: created.deleted_at
        ? toISOStringSafe(created.deleted_at)
        : null,
    };
  } catch (err) {
    // Prisma unique constraint violation for file_uri or other database errors
    throw new Error(
      "Failed to create export log. The file_uri must be unique and all input fields must be valid.",
    );
  }
}

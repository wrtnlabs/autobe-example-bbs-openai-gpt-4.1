import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardExportLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardExportLog";
import { IPageIDiscussionBoardExportLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardExportLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve a filtered, paginated list of export log records used for tracking
 * downloads and exports of compliance, audit, or privacy data.
 *
 * This operation enables administrators and compliance teams to monitor the
 * lifecycle of export files, audit export activity, and investigate export
 * history for regulatory and business needs.
 *
 * The endpoint supports advanced searching, filtering (by target type, status,
 * file type), and configurable sorting mechanisms. Administrators can use this
 * API to review which users or staff requested particular exports, when files
 * were made available, and the current status of each logged event.
 *
 * Data returned does not include personal PII outside of user identifiers for
 * audit. The endpoint only exposes information to authorized admin users. Use
 * this operation together with detailed retrieval and update endpoints to audit
 * or manage export log records.
 *
 * @param props - Request props
 * @param props.admin - Authenticated admin session payload (authorization
 *   required)
 * @param props.body - Advanced search, filtering, and pagination request for
 *   export log records
 * @returns Paginated list of export log summary records matching search
 *   criteria
 * @throws {Error} When called by non-admin users or unauthorized
 */
export async function patch__discussionBoard_admin_exportLogs(props: {
  admin: AdminPayload;
  body: IDiscussionBoardExportLog.IRequest;
}): Promise<IPageIDiscussionBoardExportLog.ISummary> {
  const { admin, body } = props;
  // Authorization contract: only admin may call

  // Pagination and input normalization
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (Number(page) - 1) * Number(limit);

  // Inline where: all values are only included when defined
  const where = {
    deleted_at: null,
    ...(body.target_type !== undefined &&
      body.target_type !== null && { target_type: body.target_type }),
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.file_type !== undefined &&
      body.file_type !== null && { file_type: body.file_type }),
    ...(body.requested_by_user_id !== undefined &&
      body.requested_by_user_id !== null && {
        requested_by_user_id: body.requested_by_user_id,
      }),
    ...((body.exported_at_from !== undefined &&
      body.exported_at_from !== null) ||
    (body.exported_at_to !== undefined && body.exported_at_to !== null)
      ? {
          exported_at: {
            ...(body.exported_at_from !== undefined &&
              body.exported_at_from !== null && {
                gte: body.exported_at_from,
              }),
            ...(body.exported_at_to !== undefined &&
              body.exported_at_to !== null && {
                lte: body.exported_at_to,
              }),
          },
        }
      : {}),
  };

  // Execute main query and count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_export_logs.findMany({
      where,
      orderBy: { exported_at: "desc" },
      skip,
      take: Number(limit),
      select: {
        id: true,
        target_type: true,
        file_uri: true,
        file_type: true,
        exported_at: true,
        status: true,
        requested_by_user_id: true,
      },
    }),
    MyGlobal.prisma.discussion_board_export_logs.count({ where }),
  ]);

  // Map summary records to required output with ISO string conversion
  const data = rows.map((row) => ({
    id: row.id,
    target_type: row.target_type,
    file_uri: row.file_uri,
    file_type: row.file_type,
    exported_at: toISOStringSafe(row.exported_at),
    status: row.status,
    requested_by_user_id: row.requested_by_user_id ?? null,
  }));

  const pages = Math.max(1, Math.ceil(Number(total) / Number(limit)));
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages,
    },
    data,
  };
}

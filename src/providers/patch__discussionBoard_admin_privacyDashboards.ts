import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardPrivacyDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPrivacyDashboard";
import { IPageIDiscussionBoardPrivacyDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPrivacyDashboard";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and list privacy dashboards for compliance export/audit.
 *
 * This operation provides compliance and admin users with a
 * paginated/searchable collection of privacy dashboards. Each dashboard entry
 * summarizes a user's data access/export history, including generated privacy
 * reports, data portability files, and export URIs. Complex filtering by user,
 * request time, or completion status is supported to facilitate regulatory
 * review and incident-response investigations.
 *
 * Privacy dashboard entries are generated when a user requests data
 * access/export; this API allows staff to efficiently locate, examine, and
 * verify fulfillment of such requests. Use-case examples include regular audit
 * reviews, responding to regulatory inquiries, and supporting data subject
 * rights fulfillment.
 *
 * Sensitive fields in dashboard_payload and export_file_uri are redacted or
 * filtered per role. Best practices are to allow only authorized admins access,
 * and to trace all access for compliance.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin making the request
 * @param props.body - Filtering, searching, and paging criteria for privacy
 *   dashboard listing
 * @returns Paginated set of privacy dashboards conforming to query and filter
 *   parameters
 * @throws {Error} When database query fails or results do not conform to API
 *   contract
 */
export async function patch__discussionBoard_admin_privacyDashboards(props: {
  admin: AdminPayload;
  body: IDiscussionBoardPrivacyDashboard.IRequest;
}): Promise<IPageIDiscussionBoardPrivacyDashboard> {
  const { admin, body } = props;

  // Extract pagination options with fallback defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 50;

  // Build filtering conditions inline per schema and API contract
  const whereClause = {
    deleted_at: null,
    ...(body.user_id !== undefined && {
      discussion_board_user_id: body.user_id,
    }),
    ...(body.access_requested_at_from !== undefined ||
    body.access_requested_at_to !== undefined
      ? {
          access_requested_at: {
            ...(body.access_requested_at_from !== undefined && {
              gte: body.access_requested_at_from,
            }),
            ...(body.access_requested_at_to !== undefined && {
              lte: body.access_requested_at_to,
            }),
          },
        }
      : {}),
    ...(body.access_fulfilled !== undefined &&
      (body.access_fulfilled
        ? { export_file_uri: { not: null } }
        : { export_file_uri: null })),
  };

  // Paginated query to fetch records and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_privacy_dashboards.findMany({
      where: whereClause,
      orderBy: { access_requested_at: "desc" as const },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_privacy_dashboards.count({
      where: whereClause,
    }),
  ]);

  // Map Prisma results to API type, converting dates with toISOStringSafe
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      discussion_board_user_id: row.discussion_board_user_id,
      access_requested_at: toISOStringSafe(row.access_requested_at),
      access_fulfilled_at:
        row.access_fulfilled_at !== undefined &&
        row.access_fulfilled_at !== null
          ? toISOStringSafe(row.access_fulfilled_at)
          : null,
      dashboard_payload: row.dashboard_payload,
      export_file_uri: row.export_file_uri ?? null,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at:
        row.deleted_at !== undefined && row.deleted_at !== null
          ? toISOStringSafe(row.deleted_at)
          : null,
    })),
  };
}

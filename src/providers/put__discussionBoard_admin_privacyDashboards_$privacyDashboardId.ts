import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardPrivacyDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPrivacyDashboard";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update a compliance privacy dashboard entry for user data export/access.
 *
 * Updates an existing privacy dashboard entry, used for adjusting fields such
 * as fulfillment status, export file URI, or dashboard summary content for a
 * user data access/export request. This supports compliance investigations,
 * corrections based on regulatory queries, and repair of potentially incomplete
 * or previously errored exports.
 *
 * Only compliance, regulatory, or admin staff are permitted to invoke this
 * operation, which enforces schema-level field constraints and uniqueness where
 * applicable. All modifications must be logged and auditable for compliance
 * review. The privacy dashboard updated by this endpoint is identified by its
 * unique ID in the path.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin payload; must be system
 *   administrator
 * @param props.privacyDashboardId - UUID of the privacy dashboard to update
 * @param props.body - Update fields for the dashboard: fulfillment time,
 *   summary, or export file URI
 * @returns The updated privacy dashboard record, including all current
 *   compliant metadata
 * @throws {Error} If the privacy dashboard is not found, deleted, or access is
 *   not authorized
 */
export async function put__discussionBoard_admin_privacyDashboards_$privacyDashboardId(props: {
  admin: AdminPayload;
  privacyDashboardId: string & tags.Format<"uuid">;
  body: IDiscussionBoardPrivacyDashboard.IUpdate;
}): Promise<IDiscussionBoardPrivacyDashboard> {
  const { admin, privacyDashboardId, body } = props;
  // Enforce admin authentication
  if (!admin || admin.type !== "admin")
    throw new Error("Unauthorized: Admin role required.");

  // Find existing dashboard record (must not be soft-deleted)
  const dashboard =
    await MyGlobal.prisma.discussion_board_privacy_dashboards.findFirst({
      where: { id: privacyDashboardId, deleted_at: null },
    });
  if (dashboard === null) {
    throw new Error("Privacy dashboard not found or already deleted");
  }

  // Prepare the updated_at timestamp
  const now = toISOStringSafe(new Date());

  const updated =
    await MyGlobal.prisma.discussion_board_privacy_dashboards.update({
      where: { id: privacyDashboardId },
      data: {
        ...(body.access_fulfilled_at !== undefined && {
          access_fulfilled_at:
            body.access_fulfilled_at === null
              ? null
              : toISOStringSafe(body.access_fulfilled_at),
        }),
        ...(body.dashboard_payload !== undefined && {
          dashboard_payload: body.dashboard_payload,
        }),
        ...(body.export_file_uri !== undefined && {
          export_file_uri: body.export_file_uri,
        }),
        updated_at: now,
      },
    });

  return {
    id: updated.id,
    discussion_board_user_id: updated.discussion_board_user_id,
    access_requested_at: toISOStringSafe(updated.access_requested_at),
    access_fulfilled_at:
      updated.access_fulfilled_at !== null &&
      updated.access_fulfilled_at !== undefined
        ? toISOStringSafe(updated.access_fulfilled_at)
        : null,
    dashboard_payload: updated.dashboard_payload,
    export_file_uri: updated.export_file_uri ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : null,
  };
}

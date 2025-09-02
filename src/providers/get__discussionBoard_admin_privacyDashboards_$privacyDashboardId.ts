import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardPrivacyDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPrivacyDashboard";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve details of a compliance privacy dashboard entry
 *
 * Retrieves the full detail of a privacy dashboard export, including the time
 * of user access request, fulfillment status, and links to any generated export
 * files. This endpoint is intended for compliance audits or in response to
 * user-initiated access/portability requests, so only admins or compliance
 * officers may access it.
 *
 * All details relating to fulfilled data portability, JSON dashboards, and
 * associated files are exposed to admins. For privacy reasons, user ownership
 * of the record must be validated. The operation should be fully auditable,
 * tracking all accesses for compliance.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin user performing the request
 * @param props.privacyDashboardId - Unique ID of the privacy dashboard to
 *   retrieve
 * @returns The detailed privacy dashboard record for compliance/audit review
 * @throws {Error} When the specified privacy dashboard entry is not found or
 *   has been deleted
 */
export async function get__discussionBoard_admin_privacyDashboards_$privacyDashboardId(props: {
  admin: AdminPayload;
  privacyDashboardId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardPrivacyDashboard> {
  const { privacyDashboardId } = props;
  const dashboard =
    await MyGlobal.prisma.discussion_board_privacy_dashboards.findFirst({
      where: {
        id: privacyDashboardId,
        deleted_at: null,
      },
    });
  if (!dashboard) {
    throw new Error("Privacy dashboard entry not found");
  }

  return {
    id: dashboard.id,
    discussion_board_user_id: dashboard.discussion_board_user_id,
    access_requested_at: toISOStringSafe(dashboard.access_requested_at),
    access_fulfilled_at:
      dashboard.access_fulfilled_at != null
        ? toISOStringSafe(dashboard.access_fulfilled_at)
        : null,
    dashboard_payload: dashboard.dashboard_payload,
    export_file_uri:
      dashboard.export_file_uri !== undefined &&
      dashboard.export_file_uri !== null
        ? dashboard.export_file_uri
        : null,
    created_at: toISOStringSafe(dashboard.created_at),
    updated_at: toISOStringSafe(dashboard.updated_at),
    deleted_at:
      dashboard.deleted_at != null
        ? toISOStringSafe(dashboard.deleted_at)
        : null,
  };
}

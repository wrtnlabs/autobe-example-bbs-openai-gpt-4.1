import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Permanently (soft) delete a compliance privacy dashboard record by ID.
 *
 * Deletes a privacy dashboard record from the compliance management tables,
 * reflecting removal of a data subject access/export event record. This
 * operation supports soft deletion by populating the deleted_at timestamp. All
 * deletion operations must be logged for compliance, and records should remain
 * available for audit review until regulatory retention windows expire.
 *
 * Access to this operation is strictly limited to compliance staff and system
 * admins. The endpoint accepts the privacy dashboard ID in the path, and does
 * not require a request body. Deletion is performed on the record, not on
 * exported/user data itself.
 *
 * @param props - The request object
 * @param props.admin - Authenticated admin payload; proves admin privilege
 *   (authorization is enforced by decorator)
 * @param props.privacyDashboardId - Unique ID of the privacy dashboard entry to
 *   delete
 * @returns Void
 * @throws {Error} If the privacy dashboard record does not exist or was already
 *   soft-deleted
 */
export async function delete__discussionBoard_admin_privacyDashboards_$privacyDashboardId(props: {
  admin: AdminPayload;
  privacyDashboardId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, privacyDashboardId } = props;

  const dashboard =
    await MyGlobal.prisma.discussion_board_privacy_dashboards.findFirst({
      where: {
        id: privacyDashboardId,
        deleted_at: null,
      },
    });

  if (!dashboard) {
    throw new Error("Privacy dashboard not found or already deleted");
  }

  await MyGlobal.prisma.discussion_board_privacy_dashboards.update({
    where: { id: privacyDashboardId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}

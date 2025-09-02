import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Permanently remove a data erasure request for compliance/audit management.
 *
 * This operation sets the `deleted_at` field on the targeted data erasure
 * request in compliance records, performing a soft delete (not a hard delete)
 * in accordance with platform data retention and audit requirements. Only
 * system administrators may perform this operation; compliance is enforced by
 * the presence of the `admin` parameter.
 *
 * If the specified request has already been deleted or does not exist, an error
 * is thrown. No actual user data is deleted—only the request record is marked
 * as deleted for audit traceability.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin user performing the deletion
 * @param props.dataErasureRequestId - The UUID of the data erasure request to
 *   be deleted
 * @returns Void
 * @throws {Error} If the data erasure request does not exist or is already
 *   deleted
 */
export async function delete__discussionBoard_admin_dataErasureRequests_$dataErasureRequestId(props: {
  admin: AdminPayload;
  dataErasureRequestId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { dataErasureRequestId } = props;

  // Step 1: Confirm the data erasure request exists and is not already deleted
  const record =
    await MyGlobal.prisma.discussion_board_data_erasure_requests.findFirst({
      where: {
        id: dataErasureRequestId,
        deleted_at: null,
      },
    });
  if (!record) {
    throw new Error("Data erasure request not found or already deleted");
  }

  // Step 2: Set deleted_at to current timestamp for soft deletion (audit-compliant)
  await MyGlobal.prisma.discussion_board_data_erasure_requests.update({
    where: { id: dataErasureRequestId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}

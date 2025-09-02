import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft delete a refresh token to disable a session (logout from device).
 *
 * Deletes a refresh token entry by its unique identifier by performing a soft
 * delete (sets the deleted_at timestamp) for regulatory compliance and audit
 * retention. This enables users or administrators to invalidate active sessions
 * safely without irreversibly losing the audit trail. The endpoint applies
 * strict authorization: only the owner user of the token or an admin may
 * delete. Error conditions include access denied, resource not found, or token
 * already invalidated. Associated operations include logout from all devices
 * (mass-revocation), listing all tokens for a user, and session/token
 * restoration under defined business flows.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing the request
 * @param props.refreshTokenId - The unique identifier (UUID) of the refresh
 *   token to remove
 * @returns Void
 * @throws {Error} When the token does not exist, is already deleted, or another
 *   error occurs
 */
export async function delete__discussionBoard_admin_refreshTokens_$refreshTokenId(props: {
  admin: AdminPayload;
  refreshTokenId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { refreshTokenId } = props;

  // Step 1: Find the refresh token not already deleted
  const token = await MyGlobal.prisma.discussion_board_refresh_tokens.findFirst(
    {
      where: {
        id: refreshTokenId,
        deleted_at: null,
      },
    },
  );
  if (!token) {
    throw new Error("Refresh token not found or already deleted");
  }

  // Step 2: Soft-delete by setting deleted_at to the current time (ISO string)
  await MyGlobal.prisma.discussion_board_refresh_tokens.update({
    where: { id: refreshTokenId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}

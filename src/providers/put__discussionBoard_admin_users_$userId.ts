import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Admin/moderator update to user account by userId.
 *
 * Updates permitted user profile fields (display_name, username, is_verified,
 * is_suspended, suspended_until) for the specified user. Only admins or
 * moderators may update user accounts. Password resets and other security
 * updates must be performed via dedicated endpoints for compliance. The user's
 * email and password are NOT modifiable by this endpoint. Operation does not
 * affect soft-deletion state (deleted_at).
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin user performing the update
 * @param props.userId - Unique identifier of the user to update
 * @param props.body - Payload of updatable user fields
 * @returns The updated IDiscussionBoardUser reflecting the allowed changes
 * @throws {Error} If the user does not exist, is already soft-deleted, or if
 *   updating results in a constraint error
 */
export async function put__discussionBoard_admin_users_$userId(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
  body: IDiscussionBoardUser.IUpdate;
}): Promise<IDiscussionBoardUser> {
  const { admin, userId, body } = props;

  // Authorization: Upstream decorator guarantees admin.
  // Step 1: Ensure target user exists and is not soft-deleted.
  const user = await MyGlobal.prisma.discussion_board_users.findFirst({
    where: {
      id: userId,
      deleted_at: null,
    },
  });
  if (!user) {
    throw new Error("User not found or has been deleted");
  }

  // Step 2: Prepare update - only permitted fields + updated_at.
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.discussion_board_users.update({
    where: { id: userId },
    data: {
      display_name: body.display_name ?? undefined,
      username: body.username ?? undefined,
      is_verified: body.is_verified ?? undefined,
      is_suspended: body.is_suspended ?? undefined,
      suspended_until: body.suspended_until ?? undefined,
      updated_at: now,
    },
  });

  // Step 3: Return all fields required by IDiscussionBoardUser.
  return {
    id: updated.id,
    email: updated.email,
    username: updated.username,
    display_name: updated.display_name ?? null,
    is_verified: updated.is_verified,
    is_suspended: updated.is_suspended,
    suspended_until: updated.suspended_until
      ? toISOStringSafe(updated.suspended_until)
      : null,
    last_login_at: updated.last_login_at
      ? toISOStringSafe(updated.last_login_at)
      : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}

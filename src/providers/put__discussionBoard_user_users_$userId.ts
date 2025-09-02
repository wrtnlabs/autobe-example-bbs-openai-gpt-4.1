import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Update mutable fields of a user profile by userId.
 *
 * Update the mutable, non-sensitive fields of an existing user account
 * identified by userId. Only the account owner may perform updates. Username
 * uniqueness is enforced and only display_name and username may be updated.
 * Critical fields (email, password, suspension, deletion) are not mutable via
 * this endpoint. The update timestamp is refreshed to now.
 *
 * @param props - Contains authentication payload, userId of target user, and
 *   update body
 * @param props.user - Authenticated user making the update
 * @param props.userId - Target user profile to update (must match auth user)
 * @param props.body - Update data (display_name, username)
 * @returns The updated user profile corresponding to IDiscussionBoardUser
 * @throws {Error} When user is not authorized or not found, or username is
 *   taken
 */
export async function put__discussionBoard_user_users_$userId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: IDiscussionBoardUser.IUpdate;
}): Promise<IDiscussionBoardUser> {
  const { user, userId, body } = props;

  // Authorization: Only allow users to update their own profile
  if (user.id !== userId) {
    throw new Error("Unauthorized: Users can only update their own profile");
  }

  // Fetch current user. Must exist and not be soft-deleted
  const existing = await MyGlobal.prisma.discussion_board_users.findFirst({
    where: {
      id: userId,
      deleted_at: null,
    },
  });
  if (!existing) throw new Error("User not found or deleted");

  // Enforce username uniqueness if updating username (excluding self)
  if (
    body.username !== undefined &&
    body.username !== null &&
    body.username !== existing.username
  ) {
    const taken = await MyGlobal.prisma.discussion_board_users.findFirst({
      where: {
        username: body.username,
        id: { not: userId },
        deleted_at: null,
      },
    });
    if (taken) throw new Error("Username already in use");
  }

  // Build update object, only allowed mutable fields
  const updates: IDiscussionBoardUser.IUpdate = {};
  if (body.display_name !== undefined) updates.display_name = body.display_name;
  if (body.username !== undefined) updates.username = body.username;

  const now = toISOStringSafe(new Date());

  // Update user record
  const updated = await MyGlobal.prisma.discussion_board_users.update({
    where: { id: userId },
    data: {
      ...updates,
      updated_at: now,
    },
  });

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

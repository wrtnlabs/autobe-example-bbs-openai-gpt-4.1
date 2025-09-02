import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Admin/moderator update to user account by userId.
 *
 * Update the profile and status of a user account using their userId. Only
 * moderator or admin (permission enforced by decorator) can use this operation.
 * Permitted changes include display name, username, verification, suspension
 * flags, and scheduled suspension. Password/soft-delete actions not allowed via
 * this endpoint.
 *
 * All date values are safely converted to branded ISO strings for DTO
 * compatibility.
 *
 * @param props - Request properties
 * @param props.moderator - Authenticated moderator payload
 * @param props.userId - The UUID of the user being updated
 * @param props.body - Partial user fields to update (allowed: display_name,
 *   username, is_verified, is_suspended, suspended_until)
 * @returns Updated user object with all user profile fields (all date fields as
 *   branded date-time ISO strings)
 * @throws {Error} If user not found or already deleted
 */
export async function put__discussionBoard_moderator_users_$userId(props: {
  moderator: ModeratorPayload;
  userId: string & tags.Format<"uuid">;
  body: IDiscussionBoardUser.IUpdate;
}): Promise<IDiscussionBoardUser> {
  const { userId, body } = props;

  // Step 1: Find (active) user to update (must not be deleted)
  const existing = await MyGlobal.prisma.discussion_board_users.findFirst({
    where: { id: userId, deleted_at: null },
  });
  if (!existing) throw new Error("User not found or deleted");

  // Step 2: Apply permitted updates (only provided fields)
  const updated = await MyGlobal.prisma.discussion_board_users.update({
    where: { id: userId },
    data: {
      display_name: body.display_name ?? undefined,
      username: body.username ?? undefined,
      is_verified: body.is_verified ?? undefined,
      is_suspended: body.is_suspended ?? undefined,
      suspended_until:
        body.suspended_until === undefined ? undefined : body.suspended_until,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Step 3: Return updated profile with all date values converted
  return {
    id: updated.id as string & tags.Format<"uuid">,
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

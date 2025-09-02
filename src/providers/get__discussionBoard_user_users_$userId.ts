import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Retrieve detailed user account information by userId from
 * discussion_board_users.
 *
 * Retrieves all non-sensitive profile details for a given userId, enforcing
 * that only the authenticated user may access their own account details. No
 * password hashes or confidential attributes are ever disclosed.
 *
 * @param props - Properties for user profile retrieval
 * @param props.user - Authenticated user payload (must match target userId)
 * @param props.userId - Target user identifier (UUID)
 * @returns IDiscussionBoardUser containing all profile details for that user
 * @throws {Error} When requesting user does not match userId (403 Forbidden)
 * @throws {Error} When user record does not exist or is soft-deleted (404 Not
 *   Found)
 */
export async function get__discussionBoard_user_users_$userId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardUser> {
  const { user, userId } = props;

  // Only allow self-access: user can only fetch own profile
  if (user.id !== userId) {
    throw new Error("Forbidden: can only access your own profile");
  }

  const userRecord = await MyGlobal.prisma.discussion_board_users.findFirst({
    where: {
      id: userId,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      username: true,
      display_name: true,
      is_verified: true,
      is_suspended: true,
      suspended_until: true,
      last_login_at: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  if (userRecord == null) {
    throw new Error("User not found");
  }

  return {
    id: userRecord.id,
    email: userRecord.email,
    username: userRecord.username,
    display_name: userRecord.display_name ?? null,
    is_verified: userRecord.is_verified,
    is_suspended: userRecord.is_suspended,
    suspended_until:
      userRecord.suspended_until !== null &&
      userRecord.suspended_until !== undefined
        ? toISOStringSafe(userRecord.suspended_until)
        : null,
    last_login_at:
      userRecord.last_login_at !== null &&
      userRecord.last_login_at !== undefined
        ? toISOStringSafe(userRecord.last_login_at)
        : null,
    created_at: toISOStringSafe(userRecord.created_at),
    updated_at: toISOStringSafe(userRecord.updated_at),
    deleted_at:
      userRecord.deleted_at !== null && userRecord.deleted_at !== undefined
        ? toISOStringSafe(userRecord.deleted_at)
        : null,
  };
}

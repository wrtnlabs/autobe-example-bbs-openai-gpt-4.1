import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get a user's detailed profile/info by userId.
 *
 * Retrieves individual account and profile details for a specific user
 * identified by userId. Returns all auditing-compliant, admin-viewable profile
 * attributes in strict accordance with the schema. Excludes sensitive fields
 * such as password_hash.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin (from AdminAuth decorator)
 * @param props.userId - Unique identifier (UUID) of the user to retrieve
 * @returns The full account details for the requested user (fields per role
 *   visibility)
 * @throws {Error} If no such user exists or user is soft-deleted
 */
export async function get__discussionBoard_admin_users_$userId(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardUser> {
  const { userId } = props;
  const user = await MyGlobal.prisma.discussion_board_users.findFirst({
    where: {
      id: userId,
      deleted_at: null,
    },
  });
  if (!user) throw new Error("User not found");
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    display_name: user.display_name ?? null,
    is_verified: user.is_verified,
    is_suspended: user.is_suspended,
    suspended_until: user.suspended_until
      ? toISOStringSafe(user.suspended_until)
      : null,
    last_login_at: user.last_login_at
      ? toISOStringSafe(user.last_login_at)
      : null,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : null,
  };
}
